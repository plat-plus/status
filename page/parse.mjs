/** Readers for Upptime's files and issue bodies. */

/** Upptime's history/<slug>.yml holds flat "key: value" lines. */
export function parseFlatYaml(text) {
	const result = {};
	for (const line of text.split("\n")) {
		const match = line.match(/^(\w+):\s*(.*)$/);
		if (match) result[match[1]] = match[2].trim();
	}
	return result;
}

/** Upptime's maintenance issue body: an HTML comment with start, end, expectedDown. */
export function parseMaintenance(body) {
	const comment = body?.match(/<!--([\s\S]*?)-->/)?.[1];
	if (!comment) return undefined;
	const fields = parseFlatYaml(comment);
	const start = new Date(fields.start);
	const end = new Date(fields.end);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
	const expectedDown = (fields.expectedDown ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	return { start, end, expectedDown };
}
