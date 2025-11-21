import { useEffect, useMemo, useState } from "react";
import type { Page } from "@/types/clientWebsite";
import Layout from "@/components/system/Layout.tsx";
import DynamicIsland from "@/components/system/DynamicIsland";
import { flattenProps } from "@/utils/flattenProps";
import "@/styles/admin/page.scss";

type Props = { initialPages: Page[]; canChange: boolean };

export default function PageEditor({ initialPages, canChange }: Props) {
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [selectedSlug, setSelectedSlug] = useState<string>(() => (initialPages[0]?.slug || "/"));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [buildStatus, setBuildStatus] = useState<string>("");

  const currentPage = useMemo(() => pages.find((p) => p.slug === selectedSlug) || pages[0], [pages, selectedSlug]);

  useEffect(() => {
    let timer: any = null;
    if (saving) {
      timer = setInterval(async () => {
        try {
          const res = await fetch("/api/admin/pages/build-status");
          if (res.ok) {
            const data = await res.json();
            const st = String(data?.status || "");
            setBuildStatus(st);
            if (["SUCCESS", "FAILURE"].includes(st)) {
              setSaving(false);
              clearInterval(timer);
            }
          }
        } catch {}
      }, 2000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [saving]);

  const onEditSeo = (key: string, value: string) => {
    const next = pages.map((p) => {
      if (p.slug !== currentPage.slug) return p as Page;
      const copy = { ...p } as Page;
      if (key === "title") (copy as any).title = value;
      if (key === "meta_title") (copy as any).meta_title = value;
      if (key === "meta_description") (copy as any).meta_description = value;
      if (key === "canonical") (copy as any).canonical = value;
      if (key === "robots_extra") (copy as any).robots_extra = value;
      if (key === "og_title") {
        const og = { ...(copy.open_graph || {}) } as any;
        og.og_title = value;
        copy.open_graph = og as any;
      }
      if (key === "og_description") {
        const og = { ...(copy.open_graph || {}) } as any;
        og.og_description = value;
        copy.open_graph = og as any;
      }
      return copy;
    });
    setPages(next);
  };

  const textAttrs = useMemo(() => {
    const idx = selectedIndex ?? -1;
    const comps = Array.isArray(currentPage?.components) ? currentPage.components : [];
    const comp = comps[idx] || null;
    const attrs = (comp?.custom_attrs || {}) as Record<string, any>;
    const entries = Object.entries(attrs).filter(([_, v]) => v && typeof v === "object" && (v.type === "string" || v.type === "text"));
    return { compIndex: idx, entries } as { compIndex: number; entries: [string, any][] };
  }, [currentPage, selectedIndex]);

  const onEditAttr = (name: string, value: string) => {
    const next = pages.map((p) => {
      if (p.slug !== currentPage.slug) return p as Page;
      const copy = { ...p } as Page;
      const comps = Array.isArray(copy.components) ? [...copy.components] : [] as any[];
      const i = textAttrs.compIndex;
      if (i >= 0 && comps[i]) {
        const ca = { ...(comps[i].custom_attrs || {}) } as any;
        const ov = ca[name] || { type: "string", value: "" };
        ca[name] = { ...ov, value };
        comps[i] = { ...comps[i], custom_attrs: ca };
        copy.components = comps as any;
      }
      return copy;
    });
    setPages(next);
  };

  const onSave = async () => {
    if (!canChange) return;
    try {
      setSaving(true);
      setBuildStatus("QUEUED");
      const res = await fetch("/api/admin/pages/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pages }) });
      if (!res.ok) {
        setSaving(false);
        return;
      }
      const data = await res.json();
      if (!data?.build?.ok) {
        setBuildStatus("NOT_CONFIGURED");
        setSaving(false);
      }
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="editor-wrap">
      <header className="editor-header">
        <div className="left">
          <h1>Editor de Páginas</h1>
        </div>
        <div className="right">
          <button className="primary" onClick={onSave} disabled={!canChange || saving}>Guardar</button>
          <span className="status">{saving ? (buildStatus || "Rebuild…") : ""}</span>
        </div>
      </header>
      <div className="editor-main">
        <aside className="sidebar left">
          <div className="pages-list">
            {pages.map((p) => (
              <button key={p.slug} className={p.slug === selectedSlug ? "item active" : "item"} onClick={() => { setSelectedSlug(p.slug); setSelectedIndex(null); }}>{p.title || p.slug}</button>
            ))}
          </div>
        </aside>
        <section className="preview">
          {currentPage && (
            <Layout page={currentPage}>
              <>
                {(currentPage.components || []).map((component, i) => {
                  const dir = String(component.atomic_hierarchy).endsWith("s") ? String(component.atomic_hierarchy) : `${component.atomic_hierarchy}s`;
                  const componentPath = `${dir}/${component.name}`;
                  const props = flattenProps(component.custom_attrs || {});
                  const active = selectedIndex === i;
                  return (
                    <div key={`${component.name}-${i}`} className={active ? "comp-wrap active" : "comp-wrap"} onClick={() => setSelectedIndex(i)}>
                      <DynamicIsland client:load componentPath={componentPath} props={props} />
                    </div>
                  );
                })}
              </>
            </Layout>
          )}
        </section>
        <aside className="sidebar right">
          <div className="panel">
            <h3>SEO</h3>
            <label>Título<input value={currentPage?.title || ""} onChange={(e) => onEditSeo("title", e.target.value)} /></label>
            <label>Meta Title<input value={currentPage?.meta_title || ""} onChange={(e) => onEditSeo("meta_title", e.target.value)} /></label>
            <label>Meta Description<textarea value={currentPage?.meta_description || ""} onChange={(e) => onEditSeo("meta_description", e.target.value)} /></label>
            <label>Canonical<input value={currentPage?.canonical || ""} onChange={(e) => onEditSeo("canonical", e.target.value)} /></label>
            <label>Robots extra<input value={currentPage?.robots_extra || ""} onChange={(e) => onEditSeo("robots_extra", e.target.value)} /></label>
            <div className="note">Slug: {currentPage?.slug}</div>
          </div>
          <div className="panel">
            <h3>Propiedades del componente</h3>
            {selectedIndex === null && <div className="muted">Selecciona un componente en el preview</div>}
            {selectedIndex !== null && textAttrs.entries.length === 0 && <div className="muted">Sin variables de texto en este componente</div>}
            {selectedIndex !== null && textAttrs.entries.map(([k, v]) => (
              <label key={k}>{k}<input value={String(v?.value || "")} onChange={(e) => onEditAttr(k, e.target.value)} /></label>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}