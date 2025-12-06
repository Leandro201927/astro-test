export const flattenProps = (input = {}) => {
	const out = {} as Record<string, any>;
	Object.entries(input as Record<string, any>).forEach(([k, v]) => {
		if (v && typeof v === "object" && "type" in v && "value" in v) {
			const type = (v as any).type;
			const val = (v as any).value;
			if (type === 'component') {
				out[k] = val;
				return;
			}
			if (val && typeof val === 'object') {
				// For string/text/url-like types, extract a usable string if present
				const candidates = ['src', 'url', 'href', 'path'];
				for (const c of candidates) {
					const s = (val as any)[c];
					if (typeof s === 'string') { out[k] = s; return; }
				}
				// Fallback: empty string for string-like types to avoid "[object Object]"
				if (type === 'string' || type === 'text' || type === 'url') {
					out[k] = '';
				} else {
					out[k] = val;
				}
			} else {
				out[k] = typeof val === 'string' ? val : String(val ?? '');
			}
		} else {
			out[k] = v;
		}
	});
	return out;
};
