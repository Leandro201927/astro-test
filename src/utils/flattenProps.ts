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
				const candidates = ['src', 'url', 'href', 'path'];
				for (const c of candidates) {
					const s = (val as any)[c];
					if (typeof s === 'string') { out[k] = s; return; }
				}
				if (type === 'string' || type === 'text' || type === 'url') {
					out[k] = '';
				} else {
					out[k] = val;
				}
			} else {
				const base = typeof val === 'string' ? val : String(val ?? '');
				out[k] = (type === 'color') ? toVarOrHex(base) : base;
			}
		} else {
			out[k] = v;
		}
	});
	return out;
};
