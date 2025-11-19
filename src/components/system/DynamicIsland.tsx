import { useEffect, useState } from "react";

export default function DynamicIsland({ componentPath, props }: { componentPath: string; props: Record<string, any> }) {
  const [Comp, setComp] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const modulesTsx = import.meta.glob('/src/components/**/index.tsx');
    const modulesTs  = import.meta.glob('/src/components/**/index.ts');
    const pTsx = `/src/components/${componentPath}/index.tsx`;
    const pTs  = `/src/components/${componentPath}/index.ts`;
    const loader = (modulesTsx as Record<string, () => Promise<any>>)[pTsx] || (modulesTs as Record<string, () => Promise<any>>)[pTs];
    if (!loader) {
      setComp(null);
      return () => { active = false; };
    }
    loader().then((mod) => {
      if (!active) return;
      setComp(() => mod.default);
    });
    return () => { active = false; };
  }, [componentPath]);

  if (!Comp) return null;
  return <Comp {...props} />;
}