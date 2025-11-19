export const flattenProps = (input = {}) => {
	const out = {} as Record<string, any>;
	Object.entries(input as Record<string, any>).forEach(([k, v]) => {
		if (v && typeof v === "object" && "type" in v && "value" in v) {
			const val = (v as any).value;
			out[k] = val;
		} else {
			out[k] = v;
		}
	});
	return out;
};