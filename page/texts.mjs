/**
 * Every text on the page, per language. German is the base language at "/",
 * English lives at "/en/", as on plat.plus. Wording follows plat.plus's rules:
 * "Sie", plain full sentences, no exclamation marks.
 */

/** The checked services, by the slug in .upptimerc.yml, in page order. Every
 *  subject is plural, so the sentences in `texts` fit them all. */
export const services = {
	website: {
		de: { name: "Website und Kurse", subject: "Die Website und die Kurse" },
		en: { name: "Website and courses", subject: "The website and courses" },
	},
	meetings: {
		de: { name: "Meetings", subject: "Meetings" },
		en: { name: "Meetings", subject: "Meetings" },
	},
	blocks: {
		de: { name: "Eigene Blöcke", subject: "Eigene Blöcke" },
		en: { name: "Custom Blocks", subject: "Custom Blocks" },
	},
};

export const texts = {
	de: {
		locale: "de-DE",
		path: "/",
		title: "Status",
		description: "Ob plat.plus gerade läuft, und die Störungen der letzten 90 Tage.",
		allUp: "Alle Dienste laufen.",
		down: (s, since) =>
			since ? `${s} sind seit ${since} nicht erreichbar.` : `${s} sind gerade nicht erreichbar.`,
		slow: (s, since) =>
			since ? `${s} reagieren seit ${since} langsam.` : `${s} reagieren gerade langsam.`,
		wasDown: (s, d) => `${s} waren ${d} nicht erreichbar.`,
		wasSlow: (s, d) => `${s} reagierten ${d} lang langsam.`,
		onIt: "Wir kümmern uns darum.",
		maintenanceNow: (end) => `Gerade läuft eine geplante Wartung, bis ${end}.`,
		state: { up: "Läuft", down: "Gestört", degraded: "Langsam", maintenance: "Wartung" },
		uptime: (p) => `${p} erreichbar in den letzten 90 Tagen`,
		dayOk: "Keine Störung",
		dayDown: (d) => `${d} nicht erreichbar`,
		dayNone: "Noch nicht geprüft",
		daysAgo: "vor 90 Tagen",
		today: "heute",
		maintenance: "Geplante Wartung",
		maintenanceAll: "plat.plus kann in dieser Zeit kurz nicht erreichbar sein.",
		maintenanceDown: (names) => `In dieser Zeit sind nicht erreichbar: ${names}.`,
		incidents: "Störungen der letzten 90 Tage",
		noIncidents: "In den letzten 90 Tagen gab es keine Störung.",
		checked: (when) =>
			`Wir prüfen etwa alle fünf Minuten von außerhalb unseres Servers, ob plat.plus erreichbar ist. Zuletzt geprüft: ${when}.`,
		toApp: "Zu plat.plus",
		imprint: "Impressum",
		privacy: "Datenschutz",
		imprintUrl: "https://plat.plus/impressum",
		privacyUrl: "https://plat.plus/datenschutz",
		language: "Sprache",
		and: "und",
		minutes: (n) => (n === 1 ? "1 Minute" : `${n} Minuten`),
		hours: (n) => (n === 1 ? "1 Stunde" : `${n} Stunden`),
		percent: " %",
		oClock: " Uhr",
	},
	en: {
		locale: "en-US",
		path: "/en/",
		title: "Status",
		description: "Whether plat.plus is running right now, and the outages of the last 90 days.",
		allUp: "All services are running.",
		down: (s, since) =>
			since ? `${s} have been unreachable since ${since}.` : `${s} can't be reached right now.`,
		slow: (s, since) =>
			since ? `${s} have been responding slowly since ${since}.` : `${s} are responding slowly right now.`,
		wasDown: (s, d) => `${s} couldn't be reached for ${d}.`,
		wasSlow: (s, d) => `${s} responded slowly for ${d}.`,
		onIt: "We're working on it.",
		maintenanceNow: (end) => `Planned maintenance is underway until ${end}.`,
		state: { up: "Running", down: "Down", degraded: "Slow", maintenance: "Maintenance" },
		uptime: (p) => `${p} available in the last 90 days`,
		dayOk: "No outage",
		dayDown: (d) => `Unreachable for ${d}`,
		dayNone: "Not checked yet",
		daysAgo: "90 days ago",
		today: "today",
		maintenance: "Planned maintenance",
		maintenanceAll: "plat.plus may be unavailable for a short while during this time.",
		maintenanceDown: (names) => `Not available during this time: ${names}.`,
		incidents: "Outages in the last 90 days",
		noIncidents: "There were no outages in the last 90 days.",
		checked: (when) =>
			`We check about every five minutes, from outside our server, whether plat.plus can be reached. Last checked: ${when}.`,
		toApp: "Go to plat.plus",
		imprint: "Imprint",
		privacy: "Privacy",
		imprintUrl: "https://plat.plus/en/impressum",
		privacyUrl: "https://plat.plus/en/datenschutz",
		language: "Language",
		and: "and",
		minutes: (n) => (n === 1 ? "1 minute" : `${n} minutes`),
		hours: (n) => (n === 1 ? "1 hour" : `${n} hours`),
		percent: "%",
		oClock: "",
	},
};

export const languages = { de: "Deutsch", en: "English" };
