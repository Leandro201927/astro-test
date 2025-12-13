import type { JSX } from "astro/jsx-runtime";

export async function getComponentByPath(
  componentPath: string,
  props: Record<string, any> = {}
): Promise<JSX.Element | null> {
  try {
    // Helper: flatten structured custom_attrs ({ type, value }) to raw values
    const resolveMedia = (s: string): string => {
      if (!s) return '';
      const clean = String(s).trim().replace(/^`+|`+$/g, '').replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
      if (/^https?:\/\//i.test(clean) || clean.startsWith('/api/admin/media/file') || /^data:image\//i.test(clean)) return clean;
      if (clean.startsWith('//')) return `https:${clean}`;
      const keyCandidate = clean.replace(/^\/+/, '');
      if (/^userupload\//.test(keyCandidate)) return `https://cdn.dribbble.com/${keyCandidate}`;
      return `/api/admin/media/file?key=${encodeURIComponent(keyCandidate)}`;
    };
    const toVarOrHex = (val: unknown): unknown => {
      if (typeof val === 'string') {
        if (val.startsWith('var:')) return `var(--${val.slice(4)})`;
        if (val.startsWith('var(--')) {
          const token = val.replace(/^var\(--|\)$/g, '').replace(/\)$/,'');
          return `var(--${token})`;
        }
      }
      return val;
    };
    const flattenProps = (input: Record<string, any> = {}) => {
      const out: Record<string, any> = {};
      Object.entries(input).forEach(([k, v]) => {
        if (v && typeof v === "object" && "type" in v && "value" in v) {
          const t = (v as any).type;
          const value = (v as any).value;
          if (t === "component") {
            out[k] = value;
          } else if (t === 'color') {
            out[k] = toVarOrHex(value);
          } else if (t === 'img' || t === 'file') {
            if (typeof value === 'string') {
              out[k] = resolveMedia(value);
            } else if (value && typeof value === 'object') {
              const copy: any = { ...(value as any) };
              if (typeof copy.src === 'string') copy.src = resolveMedia(copy.src);
              if (typeof copy.url === 'string') copy.url = resolveMedia(copy.url);
              out[k] = copy;
            } else {
              out[k] = value;
            }
          } else {
            out[k] = value;
          }
        } else {
          out[k] = v;
        }
      });
      return out;
    };

    // Import dinámico usando import.meta.glob (Vite) en lugar de alias en runtime
    const modulesTsx = import.meta.glob('/src/components/**/index.tsx');
    const modulesTs = import.meta.glob('/src/components/**/index.ts');

    const keyTsx = `/src/components/${componentPath}/index.tsx`;
    const keyTs = `/src/components/${componentPath}/index.ts`;
    const loader = (modulesTsx as Record<string, () => Promise<any>>)[keyTsx] || (modulesTs as Record<string, () => Promise<any>>)[keyTs];

    if (!loader) {
      console.warn(`⚠️ No se encontró el módulo para ${componentPath}`);
      return null;
    }

    const module = await loader();

    // Obtenemos el componente (default export)
    const Component = module.default;

    if (!Component) {
      console.warn(`⚠️ No se encontró un default export en ${componentPath}`);
      return null;
    }

    // Ensure we pass flattened values to avoid rendering objects as React children
    const flattened = flattenProps(props);
    return <Component {...flattened} />;
  } catch (error) {
    console.error(`❌ Error al cargar el componente: ${componentPath}`, error);
    return null;
  }
}
