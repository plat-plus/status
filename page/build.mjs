/**
 * Builds the status page into _site/: reads Upptime's results from the
 * repo (history/) and its outage and maintenance issues from the GitHub
 * API, then writes plain HTML. Visitors only load these finished files.
 *
 *   node page/build.mjs            in the workflow (needs GITHUB_TOKEN, GITHUB_REPOSITORY)
 *   node page/build.mjs --fixture  sample data, no network, for a local look
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sampleData } from "./fixture.mjs";
import { parseFlatYaml, parseMaintenance } from "./parse.mjs";
import { renderPage } from "./render.mjs";
import { services as serviceTexts, texts } from "./texts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(root, "_site");

async function github(path) {
	const repo = process.env.GITHUB_REPOSITORY;
	const items = [];
	let url = `https://api.github.com/repos/${repo}/${path}`;
	while (url) {
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
				Accept: "application/vnd.github+json",
			},
		});
		if (!response.ok) throw new Error(`${path}: ${response.status}`);
		const body = await response.json();
		if (!Array.isArray(body)) return body;
		items.push(...body);
		url = response.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
	}
	return items;
}

async function liveData() {
	const now = new Date();
	const summaryPath = join(root, "history", "summary.json");
	const summary = existsSync(summaryPath)
		? JSON.parse(await readFile(summaryPath, "utf8"))
		: [];
	const services = [];
	for (const slug of Object.keys(serviceTexts)) {
		const file = join(root, "history", `${slug}.yml`);
		if (!existsSync(file)) continue; // not checked yet
		const history = parseFlatYaml(await readFile(file, "utf8"));
		services.push({
			slug,
			status: history.status,
			startTime: new Date(history.startTime),
			dailyMinutesDown:
				summary.find((s) => s.slug === slug)?.dailyMinutesDown ?? {},
		});
	}

	const since = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000).toISOString();
	const statusIssues = await github(
		`issues?labels=status&state=all&since=${since}&per_page=100`,
	);
	const incidents = statusIssues.flatMap((issue) => {
		const slug = issue.labels
			.map((l) => l.name)
			.find((name) => serviceTexts[name]);
		if (!slug) return [];
		return [
			{
				slug,
				kind: issue.title.includes("degraded") ? "degraded" : "down",
				start: new Date(issue.created_at),
				end: issue.closed_at ? new Date(issue.closed_at) : null,
			},
		];
	});

	const maintenanceIssues = await github(
		"issues?labels=maintenance&state=open&per_page=100",
	);
	const maintenance = maintenanceIssues
		.map((issue) => parseMaintenance(issue.body))
		.filter(Boolean);

	const runs = await github(
		"actions/workflows/uptime.yml/runs?status=success&per_page=1",
	);
	const lastRun = runs.workflow_runs?.[0];
	const checkedAt = lastRun ? new Date(lastRun.updated_at) : null;

	return { now, checkedAt, services, incidents, maintenance };
}

const data = process.argv.includes("--fixture")
	? sampleData(new Date())
	: await liveData();

await mkdir(join(out, "en"), { recursive: true });
for (const lang of Object.keys(texts))
	await writeFile(join(out, texts[lang].path, "index.html"), renderPage(data, lang));
for (const file of ["style.css"])
	await copyFile(join(here, file), join(out, file));
for (const file of ["favicon.svg", "nunito.woff2"])
	await copyFile(join(here, "assets", file), join(out, file));
// Hetzner's web server (Apache) reads its rules from .htaccess.
await copyFile(join(here, "htaccess"), join(out, ".htaccess"));
console.log(
	`Built _site: ${data.services.length} services, ${data.incidents.length} incidents, ${data.maintenance.length} maintenance.`,
);
