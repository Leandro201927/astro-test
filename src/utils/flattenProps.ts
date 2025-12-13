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
  const autoResolve = (s: string): string => {
    const clean = String(s).trim().replace(/^`+|`+$/g, '').replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
    if (/^https?:\/\//i.test(clean) || clean.startsWith('/api/admin/media/file') || /^data:image\//i.test(clean)) return clean;
    if (clean.startsWith('//')) return `https:${clean}`;
    const keyCandidate = clean.replace(/^\/+/, '');
    if (/^userupload\//.test(keyCandidate)) return `https://cdn.dribbble.com/${keyCandidate}`;
    return `/api/admin/media/file?key=${encodeURIComponent(keyCandidate)}`;
  };
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
						const resolved = (type === 'img' || type === 'file') ? ((resolveMedia || autoResolve)(s)) : s;
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
				const resolved = (type === 'img' || type === 'file') ? ((resolveMedia || autoResolve)(base)) : base;
				out[k] = (type === 'color') ? toVarOrHex(resolved) : resolved;
			}
		} else {
			out[k] = v;
		}
	});
	return out;
};
