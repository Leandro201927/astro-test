import type { JSX } from "astro/jsx-runtime";

export async function getComponentsByPath(
  componentPath: string,
  props: Record<string, any> = {}
): Promise<JSX.Element | null> {
  try {
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
          } else {
            out[k] = value;
          }
        } else {    
          out[k] = v;
        }
      });
      return out;
    };

    const module = await import(`@/components/${componentPath}.tsx`);
    const Component = module.default;

    if (!Component) return null;
    const flattened = flattenProps(props);
    return <Component key={props?.id || componentPath} {...flattened} />;
  } catch (error) {
    console.error(`Error al importar componente: ${componentPath}`, error);
    return null;
  }
}
