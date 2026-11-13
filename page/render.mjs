/**
 * Turns the check results into the page's HTML, one language at a time.
 * Pure: everything it needs comes in `data` (build.mjs reads it), so the
 * tests can feed it any situation.
 *
 * data = {
 *   now, checkedAt,                       Date, Date | null
 *   services: [{ slug, status, startTime, dailyMinutesDown }],
 *   incidents: [{ slug, kind: "down" | "degraded", start, end | null }],
 *   maintenance: [{ start, end, expectedDown: [slug] }],
 * }
 */
import { languages, services as serviceTexts, texts } from "./texts.mjs";

export const DAYS = 90;
const DAY = 24 * 60 * 60 * 1000;
const ZONE = "Europe/Berlin";

const escape = (s) =>
	String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The last `DAYS` days as UTC dates ("2026-11-13"), oldest first, as Upptime counts them. */
export function dayKeys(now) {
	const keys = [];
	for (let i = DAYS - 1; i >= 0; i--)
		keys.push(new Date(now.getTime() - i * DAY).toISOString().slice(0, 10));
	return keys;
}

/** Share of the last 90 days (or since checks began) the service was reachable, 0..1. */
export function uptimeShare(service, now) {
	const windowStart = Math.max(
		service.startTime.getTime(),
		now.getTime() - DAYS * DAY,
	);
	const minutes = (now.getTime() - windowStart) / 60000;
	if (minutes <= 0) return 1;
	const firstDay = new Date(windowStart).toISOString().slice(0, 10);
	let down = 0;
	for (const [day, value] of Object.entries(service.dailyMinutesDown ?? {}))
		if (day >= firstDay) down += value;
	return Math.max(0, 1 - down / minutes);
}

/** "99,98 %": cut, never rounded up, so any outage shows below 100. */
export function formatShare(share, t) {
	if (share >= 1) return `100${t.percent}`;
	const cut = Math.floor(share * 10000) / 100;
	return `${cut.toLocaleString(t.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${t.percent}`;
}

/** "23 Minuten", "2 Stunden und 5 Minuten". */
export function formatDuration(ms, t) {
	const total = Math.max(1, Math.round(ms / 60000));
	const hours = Math.floor(total / 60);
	const minutes = total % 60;
	if (!hours) return t.minutes(minutes);
	if (!minutes) return t.hours(hours);
	return `${t.hours(hours)} ${t.and} ${t.minutes(minutes)}`;
}

const formatDay = (date, t) =>
	new Intl.DateTimeFormat(t.locale, {
		timeZone: ZONE,
		weekday: "short",
		day: "numeric",
		month: "short",
	}).format(date);

/** "10:15" in German time; English adds the zone ("10:15 AM GMT+1"). */
const formatClock = (date, t, zone = !t.oClock) =>
	new Intl.DateTimeFormat(t.locale, {
		timeZone: ZONE,
		hour: t.oClock ? "2-digit" : "numeric",
		minute: "2-digit",
		...(zone ? { timeZoneName: "short" } : {}),
	}).format(date);

const sameDay = (a, b) =>
	a.toLocaleDateString("de-DE", { timeZone: ZONE }) ===
	b.toLocaleDateString("de-DE", { timeZone: ZONE });

/** "Fr., 13. Nov., 10:15 Uhr". */
export function formatWhen(date, t) {
	return `${formatDay(date, t)}, ${formatClock(date, t)}${t.oClock}`;
}

/** Only the time ("10:15 Uhr") when `date` is on the day of `now`, else the full date. */
function formatMoment(date, now, t) {
	if (!sameDay(date, now)) return formatWhen(date, t);
	return `${formatClock(date, t)}${t.oClock}`;
}

/** "So., 15. Nov., 10:00–11:00 Uhr", the end with its own date if on another day. */
export function formatRange(start, end, t) {
	if (!sameDay(start, end))
		return `${formatWhen(start, t)} – ${formatWhen(end, t)}`;
	return `${formatDay(start, t)}, ${formatClock(start, t, false)}–${formatClock(end, t)}${t.oClock}`;
}

const list = (names, t) =>
	names.length < 2
		? names.join("")
		: `${names.slice(0, -1).join(", ")} ${t.and} ${names.at(-1)}`;

/** Each service's state right now, with planned maintenance taken into account. */
export function currentStates(data) {
	const ongoing = data.maintenance.filter(
		(m) => m.start <= data.now && data.now < m.end,
	);
	return data.services.map((s) => {
		const planned = ongoing.some((m) => m.expectedDown.includes(s.slug));
		const state = s.status !== "up" && planned ? "maintenance" : s.status;
		return { ...s, state };
	});
}

function banner(states, data, t, lang) {
	const ongoing = data.maintenance.filter(
		(m) => m.start <= data.now && data.now < m.end,
	);
	const lines = [];
	let tone = "up";
	for (const s of states) {
		if (s.state !== "down" && s.state !== "degraded") continue;
		const open = data.incidents.find((i) => i.slug === s.slug && !i.end);
		const since = open && formatMoment(open.start, data.now, t);
		const subject = serviceTexts[s.slug][lang].subject;
		if (s.state === "down") {
			lines.push(t.down(subject, since));
			tone = "down";
		} else {
			lines.push(t.slow(subject, since));
			if (tone === "up") tone = "degraded";
		}
	}
	if (lines.length) lines.push(t.onIt);
	else if (ongoing.length) {
		const end = new Date(Math.max(...ongoing.map((m) => m.end.getTime())));
		lines.push(t.maintenanceNow(formatMoment(end, data.now, t)));
		tone = "maintenance";
	} else lines.push(t.allUp);
	return `<section class="banner tone-${tone}" aria-live="polite">
		<span class="dot" aria-hidden="true"></span>
		<p>${lines.map(escape).join(" ")}</p>
	</section>`;
}

function dayClass(minutes, day, startDay) {
	if (day < startDay) return "none";
	if (!minutes) return "ok";
	return minutes < 60 ? "some" : "much";
}

/** A bar's tooltip: "Fr., 13. Nov." and what happened that day. */
export function dayTip(minutes, day, startDay, t) {
	// Upptime counts by UTC day, so the date is read in UTC too.
	const date = new Intl.DateTimeFormat(t.locale, {
		timeZone: "UTC",
		weekday: "short",
		day: "numeric",
		month: "short",
	}).format(new Date(`${day}T12:00:00Z`));
	if (day < startDay) return `${date}\n${t.dayNone}`;
	if (!minutes) return `${date}\n${t.dayOk}`;
	return `${date}\n${t.dayDown(formatDuration(minutes * 60000, t))}`;
}

function serviceRow(s, data, t, lang) {
	const keys = dayKeys(data.now);
	const startDay = s.startTime.toISOString().slice(0, 10);
	// tabindex="-1": a tap focuses the bar and shows its tooltip, without
	// 90 extra Tab stops. Screen readers get the same facts from the list below.
	const bars = keys
		.map((day) => {
			const minutes = s.dailyMinutesDown?.[day];
			const tip = escape(dayTip(minutes, day, startDay, t)).replace(/\n/g, "&#10;");
			return `<i class="${dayClass(minutes, day, startDay)}" data-tip="${tip}" tabindex="-1"></i>`;
		})
		.join("");
	const share = formatShare(uptimeShare(s, data.now), t);
	return `<li class="service">
		<div class="service-head">
			<h3>${escape(serviceTexts[s.slug][lang].name)}</h3>
			<span class="state state-${s.state}"><span class="dot" aria-hidden="true"></span>${escape(t.state[s.state])}</span>
		</div>
		<div class="bars" aria-hidden="true">${bars}</div>
		<div class="bars-legend" aria-hidden="true"><span>${escape(t.daysAgo)}</span><span>${escape(t.today)}</span></div>
		<p class="muted">${escape(t.uptime(share))}</p>
	</li>`;
}

function maintenanceSection(data, t, lang) {
	const coming = data.maintenance
		.filter((m) => data.now < m.end)
		.sort((a, b) => a.start - b.start);
	if (!coming.length) return "";
	const items = coming.map((m) => {
		const names = m.expectedDown
			.filter((slug) => serviceTexts[slug])
			.map((slug) => serviceTexts[slug][lang].name);
		const what = names.length ? t.maintenanceDown(list(names, t)) : t.maintenanceAll;
		return `<li>
			<p class="muted">${escape(formatRange(m.start, m.end, t))}</p>
			<p>${escape(what)}</p>
		</li>`;
	});
	return `<section>
		<h2>${escape(t.maintenance)}</h2>
		<ul class="events">${items.join("")}</ul>
	</section>`;
}

function incidentSection(data, t, lang) {
	// Ongoing ones stand in the banner at the top; this list holds the past.
	const since = data.now.getTime() - DAYS * DAY;
	const shown = data.incidents
		.filter((i) => serviceTexts[i.slug] && i.end && i.end.getTime() >= since)
		.sort((a, b) => b.start - a.start);
	const items = shown.map((i) => {
		const subject = serviceTexts[i.slug][lang].subject;
		const duration = formatDuration(i.end - i.start, t);
		return `<li>
			<p class="muted">${escape(formatWhen(i.start, t))}</p>
			<p>${escape(i.kind === "degraded" ? t.wasSlow(subject, duration) : t.wasDown(subject, duration))}</p>
		</li>`;
	});
	return `<section>
		<h2>${escape(t.incidents)}</h2>
		${items.length ? `<ul class="events">${items.join("")}</ul>` : `<p class="muted">${escape(t.noIncidents)}</p>`}
	</section>`;
}

const globe = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;

function languageSwitch(lang, t) {
	const links = Object.entries(languages)
		.map(
			([code, name]) =>
				`<a href="${texts[code].path}" hreflang="${code}" lang="${code}"${code === lang ? ' aria-current="true"' : ""}>${escape(name)}</a>`,
		)
		.join("");
	return `<details class="language">
		<summary aria-label="${escape(t.language)}" title="${escape(t.language)}">${globe}</summary>
		<div class="menu">${links}</div>
	</details>`;
}

export function renderPage(data, lang) {
	const t = texts[lang];
	const states = currentStates(data);
	const alternates = Object.keys(languages)
		.map(
			(code) =>
				`<link rel="alternate" hreflang="${code}" href="https://status.plat.plus${texts[code].path}">`,
		)
		.join("\n\t");
	const checked = data.checkedAt ? formatWhen(data.checkedAt, t) : "–";
	return `<!doctype html>
<html lang="${lang}">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${escape(t.title)} – plat.plus</title>
	<meta name="description" content="${escape(t.description)}">
	<meta name="color-scheme" content="light dark">
	<link rel="icon" href="/favicon.svg" type="image/svg+xml">
	<link rel="preload" href="/nunito.woff2" as="font" type="font/woff2" crossorigin>
	<link rel="stylesheet" href="/style.css">
	<link rel="canonical" href="https://status.plat.plus${t.path}">
	${alternates}
	<link rel="alternate" hreflang="x-default" href="https://status.plat.plus/">
</head>
<body>
	<header class="site">
		<a class="wordmark" href="https://plat.plus${lang === "de" ? "/" : "/en"}">plat<span class="dot-mark">.</span>plus</a>
		${languageSwitch(lang, t)}
	</header>
	<main>
		<h1>${escape(t.title)}</h1>
		${banner(states, data, t, lang)}
		<section>
			<ul class="services">${states.map((s) => serviceRow(s, data, t, lang)).join("")}</ul>
		</section>
		${maintenanceSection(data, t, lang)}
		${incidentSection(data, t, lang)}
	</main>
	<footer>
		<p>${escape(t.checked(checked))}</p>
		<nav><a href="https://plat.plus${lang === "de" ? "/" : "/en"}">${escape(t.toApp)}</a><a href="${t.imprintUrl}">${escape(t.imprint)}</a><a href="${t.privacyUrl}">${escape(t.privacy)}</a></nav>
	</footer>
</body>
</html>
`;
}
