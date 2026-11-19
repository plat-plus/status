/**
 * Announces a scheduled restart of plat.plus's main server as planned
 * maintenance (an Upptime maintenance issue), or calls it off. The server
 * dispatches .github/workflows/maintenance.yml as soon as a restart is
 * scheduled or cancelled (scripts/ops/server/status-maintenance in the
 * monorepo). The server only names a time; what is announced, and for how
 * long, is decided here.
 *
 *   ACTION=announce START=2026-11-21T03:30:00Z node page/restart.mjs
 *   ACTION=cancel node page/restart.mjs
 *   (needs GITHUB_TOKEN with issues: write, GITHUB_REPOSITORY)
 */
import { parseMaintenance } from "./parse.mjs";

const MINUTE = 60 * 1000;
/** The window covers the restart and the next check after it. */
export const WINDOW = 15 * MINUTE;
/** What runs on the main server. Custom Blocks run elsewhere. */
export const ON_MAIN_SERVER = ["website", "meetings"];
/** Marks the issues this workflow opened, so it only ever closes its own. */
export const LABEL = "server-restart";

/**
 * What to do, given the request and the open issues this workflow opened
 * earlier ({ number, start }). Returns { create: start | null, close: [number] }.
 */
export function plan(action, startText, now, open) {
	const future = open.filter((i) => i.start > now);
	if (action === "cancel") return { create: null, close: future.map((i) => i.number) };
	if (action !== "announce") throw new Error(`unknown action: ${action}`);
	const start = new Date(startText);
	if (Number.isNaN(start.getTime())) throw new Error(`not a time: ${startText}`);
	// A restart scheduled for later than a week, or long past, is no restart
	// we announce; refuse rather than put an odd date on the page.
	if (start < now - 5 * MINUTE || start > +now + 7 * 24 * 60 * MINUTE)
		throw new Error(`start out of range: ${start.toISOString()}`);
	const same = open.some((i) => i.start.getTime() === start.getTime());
	return {
		create: same ? null : start,
		// A restart moved to another time: the old announcement goes.
		close: future.filter((i) => i.start.getTime() !== start.getTime()).map((i) => i.number),
	};
}

export function issueBody(start) {
	const end = new Date(start.getTime() + WINDOW);
	return `<!--
start: ${start.toISOString()}
end: ${end.toISOString()}
expectedDown: ${ON_MAIN_SERVER.join(", ")}
-->
The server restarts to finish a security update. The website, the courses and Meetings may be unreachable for a few minutes.

Announced automatically when the restart was scheduled.`;
}

async function api(path, init = {}) {
	const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
			Accept: "application/vnd.github+json",
			"Content-Type": "application/json",
		},
	});
	if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
	return response.json();
}

// Run as a script, not when the tests import it.
if (process.argv[1]?.endsWith("restart.mjs")) {
	const now = new Date();
	const issues = await api(`issues?labels=${LABEL}&state=open&per_page=100`);
	const open = issues.flatMap((issue) => {
		const m = parseMaintenance(issue.body);
		return m ? [{ number: issue.number, start: m.start }] : [];
	});
	const { create, close } = plan(process.env.ACTION, process.env.START, now, open);
	for (const number of close) {
		await api(`issues/${number}`, {
			method: "PATCH",
			body: JSON.stringify({ state: "closed", state_reason: "not_planned" }),
		});
		console.log(`Called off #${number}.`);
	}
	if (create) {
		const issue = await api("issues", {
			method: "POST",
			body: JSON.stringify({
				title: "Planned maintenance: server restart for a security update",
				body: issueBody(create),
				labels: ["maintenance", LABEL],
			}),
		});
		console.log(`Announced #${issue.number} for ${create.toISOString()}.`);
	}
	if (!create && !close.length) console.log("Nothing to change.");
}
