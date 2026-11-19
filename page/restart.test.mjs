import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMaintenance } from "./parse.mjs";
import { issueBody, plan } from "./restart.mjs";

const now = new Date("2026-11-20T08:00:00Z");
const at = (iso) => new Date(iso);

test("a scheduled restart is announced once", () => {
	assert.deepEqual(plan("announce", "2026-11-21T03:30:00Z", now, []), {
		create: at("2026-11-21T03:30:00Z"),
		close: [],
	});
	const open = [{ number: 7, start: at("2026-11-21T03:30:00Z") }];
	assert.deepEqual(plan("announce", "2026-11-21T03:30:00Z", now, open), { create: null, close: [] });
});

test("a moved restart replaces the old announcement", () => {
	const open = [{ number: 7, start: at("2026-11-21T03:30:00Z") }];
	assert.deepEqual(plan("announce", "2026-11-22T03:30:00Z", now, open), {
		create: at("2026-11-22T03:30:00Z"),
		close: [7],
	});
});

test("cancel closes only what is still to come", () => {
	const open = [
		{ number: 6, start: at("2026-11-20T03:30:00Z") },
		{ number: 7, start: at("2026-11-21T03:30:00Z") },
	];
	assert.deepEqual(plan("cancel", "none", now, open), { create: null, close: [7] });
});

test("odd times are refused", () => {
	assert.throws(() => plan("announce", "none", now, []), /not a time/);
	assert.throws(() => plan("announce", "2026-11-19T03:30:00Z", now, []), /out of range/);
	assert.throws(() => plan("announce", "2027-01-01T03:30:00Z", now, []), /out of range/);
	assert.throws(() => plan("reboot", "2026-11-21T03:30:00Z", now, []), /unknown action/);
});

test("the body is an Upptime maintenance window for the main server", () => {
	const m = parseMaintenance(issueBody(at("2026-11-21T03:30:00Z")));
	assert.equal(m.end.toISOString(), "2026-11-21T03:45:00.000Z");
	assert.deepEqual(m.expectedDown, ["website", "meetings"]);
});
