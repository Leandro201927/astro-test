const toVarOrHex = (v: unknown): unknown => {
  if (typeof v === 'string') {
    if (v.startsWith('var:')) {
      const token = v.slice(4);
      return `var(--${token})`;
    }
    if (v.startsWith('var(--')) {
      const token = v.replace(/^var\(--|\)$/g, '').replace(/\)$/,'');
      return `var(--${token})`;
    }
  }
  return v;
};

export const flattenProps = (input = {}, resolveMedia?: (url: string) => string) => {
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
				const candidates = ['src', 'url', 'href', 'path'];
				for (const c of candidates) {
					const s = (val as any)[c];
					if (typeof s === 'string') {
						// Apply media resolver if provided and this looks like a media attribute
						const resolved = resolveMedia && (type === 'img' || type === 'file') ? resolveMedia(s) : s;
						out[k] = resolved;
						return;
					}
				}
				if (type === 'string' || type === 'text' || type === 'url') {
					out[k] = '';
				} else {
					out[k] = val;
				}
			} else {
				const base = typeof val === 'string' ? val : String(val ?? '');
				// Apply media resolver if provided and this looks like a media attribute
				const resolved = resolveMedia && (type === 'img' || type === 'file') ? resolveMedia(base) : base;
				out[k] = (type === 'color') ? toVarOrHex(resolved) : resolved;
			}
		} else {
			out[k] = v;
		}
	});
	return out;
};
