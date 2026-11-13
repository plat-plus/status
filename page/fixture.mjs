/** Invented sample data for a local look at the page (build.mjs --fixture). */
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const dayKey = (now, daysAgo) =>
	new Date(now.getTime() - daysAgo * DAY).toISOString().slice(0, 10);

export function sampleData(now) {
	const ago = (ms) => new Date(now.getTime() - ms);
	return {
		now,
		checkedAt: ago(3 * MINUTE),
		services: [
			{
				slug: "website",
				status: "up",
				startTime: ago(120 * DAY),
				dailyMinutesDown: { [dayKey(now, 0)]: 23, [dayKey(now, 40)]: 95 },
			},
			{
				slug: "meetings",
				status: "down",
				startTime: ago(120 * DAY),
				dailyMinutesDown: { [dayKey(now, 0)]: 12, [dayKey(now, 12)]: 8 },
			},
			{
				slug: "blocks",
				status: "up",
				startTime: ago(30 * DAY),
				dailyMinutesDown: {},
			},
		],
		incidents: [
			{ slug: "meetings", kind: "down", start: ago(12 * MINUTE), end: null },
			{ slug: "website", kind: "down", start: ago(5 * 60 * MINUTE), end: ago(5 * 60 * MINUTE - 23 * MINUTE) },
			{ slug: "meetings", kind: "degraded", start: ago(12 * DAY), end: ago(12 * DAY - 8 * MINUTE) },
			{ slug: "website", kind: "down", start: ago(40 * DAY), end: ago(40 * DAY - 95 * MINUTE) },
		],
		maintenance: [
			{
				start: new Date(now.getTime() + 2 * DAY),
				end: new Date(now.getTime() + 2 * DAY + 60 * MINUTE),
				expectedDown: ["meetings"],
			},
		],
	};
}
