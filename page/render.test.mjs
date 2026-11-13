import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMaintenance } from "./parse.mjs";
import { sampleData } from "./fixture.mjs";
import {
	currentStates,
	dayKeys,
	dayTip,
	formatDuration,
	formatRange,
	formatShare,
	renderPage,
	uptimeShare,
} from "./render.mjs";
import { texts } from "./texts.mjs";

const now = new Date("2026-11-13T09:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

test("90 days, oldest first, ending today", () => {
	const keys = dayKeys(now);
	assert.equal(keys.length, 90);
	assert.equal(keys.at(-1), "2026-11-13");
	assert.equal(keys[0], "2026-08-16");
});

test("any outage shows below 100 %", () => {
	const share = uptimeShare(
		{ startTime: new Date(now - 200 * DAY), dailyMinutesDown: { "2026-11-01": 1 } },
		now,
	);
	assert.ok(share < 1);
	// German puts a narrow space before "%" (skill ux, typography.md).
	assert.equal(formatShare(share, texts.de), "99,99 %");
	assert.equal(formatShare(share, texts.en), "99.99%");
	assert.equal(formatShare(1, texts.de), "100 %");
});

test("only the time since checks began counts", () => {
	const share = uptimeShare(
		{ startTime: new Date(now - DAY), dailyMinutesDown: { "2026-11-13": 144 } },
		now,
	);
	assert.equal(formatShare(share, texts.de), "90,00 %");
});

test("durations read as speech", () => {
	assert.equal(formatDuration(23 * 60000, texts.de), "23 Minuten");
	assert.equal(formatDuration(20 * 1000, texts.de), "1 Minute");
	assert.equal(formatDuration(125 * 60000, texts.de), "2 Stunden und 5 Minuten");
	assert.equal(formatDuration(60 * 60000, texts.en), "1 hour");
});

test("a planned outage shows as maintenance, not as down", () => {
	const data = sampleData(now);
	data.maintenance = [
		{ start: new Date(now - 60000), end: new Date(+now + 3600000), expectedDown: ["meetings"] },
	];
	const meetings = currentStates(data).find((s) => s.slug === "meetings");
	assert.equal(meetings.state, "maintenance");
	assert.match(renderPage(data, "de"), /geplante Wartung, bis 11:00 Uhr/);
});

test("a range on one day names the day once", () => {
	const start = new Date("2026-11-15T09:00:00Z");
	assert.equal(
		formatRange(start, new Date("2026-11-15T10:00:00Z"), texts.de),
		"So., 15. Nov., 10:00–11:00 Uhr",
	);
	assert.match(
		formatRange(start, new Date("2026-11-16T10:00:00Z"), texts.de),
		/^So\., 15\. Nov\., 10:00 Uhr – Mo\., 16\. Nov\., 11:00 Uhr$/,
	);
});

test("an ongoing outage stands in the banner, not in the list", () => {
	const de = renderPage(sampleData(now), "de");
	assert.doesNotMatch(de, /Meetings waren/);
});

test("the banner names what is down", () => {
	const de = renderPage(sampleData(now), "de");
	assert.match(de, /Meetings sind seit 09:48 Uhr nicht erreichbar\. Wir kümmern uns darum\./);
	assert.match(de, /<html lang="de">/);
	const en = renderPage(sampleData(now), "en");
	assert.match(en, /Meetings have been unreachable since 9:48 AM GMT\+1\./);
});

test("each day bar tells its day", () => {
	assert.equal(dayTip(23, "2026-11-13", "2026-01-01", texts.de), "Fr., 13. Nov.\n23 Minuten nicht erreichbar");
	assert.equal(dayTip(undefined, "2026-11-13", "2026-01-01", texts.en), "Fri, Nov 13\nNo outage");
	assert.equal(dayTip(undefined, "2026-11-13", "2026-11-14", texts.de), "Fr., 13. Nov.\nNoch nicht geprüft");
});

test("all up", () => {
	const data = sampleData(now);
	for (const s of data.services) s.status = "up";
	assert.match(renderPage(data, "de"), /Alle Dienste laufen\./);
});

test("Upptime's maintenance comment", () => {
	const m = parseMaintenance(
		"Server update\n<!--\nstart: 2026-11-20T09:00:00Z\nend: 2026-11-20T10:00:00Z\nexpectedDown: meetings, blocks\n-->",
	);
	assert.deepEqual(m.expectedDown, ["meetings", "blocks"]);
	assert.equal(m.end.toISOString(), "2026-11-20T10:00:00.000Z");
	assert.equal(parseMaintenance("no comment"), undefined);
});
