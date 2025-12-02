import { useEffect, useMemo, useState } from "react";
import type { Page } from "@/types/clientWebsite";
import Layout from "@/components/system/Layout.tsx";
import DynamicIsland from "@/components/system/DynamicIsland";
import { flattenProps } from "@/utils/flattenProps";
import "@/styles/admin/page.scss";

type Props = { initialPages: Page[]; canChange: boolean; userEmail?: string };

export default function PageEditor({ initialPages, canChange, userEmail }: Props) {
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [selectedSlug, setSelectedSlug] = useState<string>(() => (initialPages[0]?.slug || "/"));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSlotEl, setSelectedSlotEl] = useState<HTMLElement | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [buildStatus, setBuildStatus] = useState<string>("");
  const [showExitModal, setShowExitModal] = useState(false);

  // View controls
  const [previewMode, setPreviewMode] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Accordion states
  const [seoOpen, setSeoOpen] = useState(true);
  const [compOpen, setCompOpen] = useState(true);

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
    let attrs: Record<string, any> = {};
    if (comp) {
      if (selectedSlot) {
        const slotObj = ((comp.custom_attrs || {}) as Record<string, any>)[selectedSlot] || null;
        const nestedComp = slotObj && typeof slotObj === "object" ? (slotObj.value as any) : null;
        attrs = (nestedComp?.custom_attrs || {}) as Record<string, any>;
      } else {
        attrs = (comp?.custom_attrs || {}) as Record<string, any>;
      }
    }
    const entries = Object.entries(attrs).filter(([_, v]) => v && typeof v === "object" && (v.type === "string" || v.type === "text"));
    return { compIndex: idx, entries } as { compIndex: number; entries: [string, any][] };
  }, [currentPage, selectedIndex, selectedSlot]);

  const onEditAttr = (name: string, value: string) => {
    const next = pages.map((p) => {
      if (p.slug !== currentPage.slug) return p as Page;
      const copy = { ...p } as Page;
      const comps = Array.isArray(copy.components) ? [...copy.components] : [] as any[];
      const i = textAttrs.compIndex;
      if (i >= 0 && comps[i]) {
        const ca = { ...(comps[i].custom_attrs || {}) } as any;
        if (selectedSlot) {
          const slotEntry = ca[selectedSlot] || { type: "component", value: null };
          const nestedComp = { ...(slotEntry.value || {}) } as any;
          const nestedAttrs = { ...(nestedComp.custom_attrs || {}) } as any;
          const ov = nestedAttrs[name] || { type: "string", value: "" };
          nestedAttrs[name] = { ...ov, value };
          nestedComp.custom_attrs = nestedAttrs;
          ca[selectedSlot] = { ...slotEntry, value: nestedComp };
          comps[i] = { ...comps[i], custom_attrs: ca };
          copy.components = comps as any;
        } else {
          const ov = ca[name] || { type: "string", value: "" };
          ca[name] = { ...ov, value };
          comps[i] = { ...comps[i], custom_attrs: ca };
          copy.components = comps as any;
        }
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

  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = (save: boolean) => {
    if (save) {
      onSave().then(() => {
        window.location.href = '/admin';
      });
    } else {
      window.location.href = '/admin';
    }
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="header-left">
          <div className="brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Editor
          </div>
        </div>

        <div className="header-right">
          <div className="view-controls">
            <button 
              className={`icon-btn ${previewMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setPreviewMode('mobile')}
              title="Mobile View"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            </button>
            <button 
              className={`icon-btn ${previewMode === 'tablet' ? 'active' : ''}`}
              onClick={() => setPreviewMode('tablet')}
              title="Tablet View"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            </button>
            <button 
              className={`icon-btn ${previewMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setPreviewMode('desktop')}
              title="Desktop View"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </button>
          </div>
          
          <div className="panel-toggles">
            <button 
              className={`icon-btn ${showLeftPanel ? 'active' : ''}`}
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              title="Toggle Pages Panel"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            </button>
            <button 
              className={`icon-btn ${showRightPanel ? 'active' : ''}`}
              onClick={() => setShowRightPanel(!showRightPanel)}
              title="Toggle Properties Panel"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>
            </button>
          </div>
          
          <div className="divider"></div>
          
          <button className="save-btn" onClick={onSave} disabled={!canChange || saving}>
            {saving ? (buildStatus || "Saving...") : "Guardar"}
          </button>
          
          <button className="logout-btn" onClick={handleExit}>Salir</button>
        </div>
      </header>

      <div className="admin-body">
        {/* Left Sidebar: Pages */}
        <aside className={`admin-sidebar left ${showLeftPanel ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3>Páginas</h3>
          </div>
          <div className="sidebar-content">
            <div className="pages-list">
              {pages.map((p) => (
                <button 
                  key={p.slug} 
                  className={`page-item ${p.slug === selectedSlug ? "active" : ""}`} 
                  onClick={() => { setSelectedSlug(p.slug); setSelectedIndex(null); }}
                >
                  <span className="page-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </span>
                  <div className="page-info">
                    <span className="page-title">{p.title || p.slug}</span>
                    <span className="page-slug">{p.slug}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center: Preview */}
        <main className="admin-preview-area">
          <div className={`preview-wrapper ${previewMode}`}>
            {currentPage && (
              <div
                className="preview-content"
                onClick={(e) => {
                  const t = e.target as HTMLElement;
                  const wrap = t.closest('.comp-wrap') as HTMLElement | null;
                  if (!wrap) return;
                  const idxStr = wrap.getAttribute('data-top-index');
                  const idx = idxStr ? Number(idxStr) : NaN;
                  if (!Number.isNaN(idx)) setSelectedIndex(idx);
                  const slotEl = t.closest('[data-component-path]') as HTMLElement | null;
                  if (slotEl) {
                    const slot = slotEl.getAttribute('data-component-slot');
                    setSelectedSlot(slot || null);
                    if (selectedSlotEl && selectedSlotEl !== slotEl) {
                      selectedSlotEl.classList.remove('selected-sub');
                    }
                    slotEl.classList.add('selected-sub');
                    setSelectedSlotEl(slotEl);
                  } else {
                    setSelectedSlot(null);
                    if (selectedSlotEl) {
                      selectedSlotEl.classList.remove('selected-sub');
                      setSelectedSlotEl(null);
                    }
                  }
                }}
              >
                <Layout page={currentPage}>
                  <>
                    {(currentPage.components || []).map((component, i) => {
                      const dir = String(component.atomic_hierarchy).endsWith("s") ? String(component.atomic_hierarchy) : `${component.atomic_hierarchy}s`;
                      const componentPath = `${dir}/${component.name}`;
                      const props = flattenProps(component.custom_attrs || {});
                      const active = selectedIndex === i && !selectedSlot;
                      return (
                        <div 
                          key={`${component.name}-${i}`} 
                          className={`comp-wrap ${active ? "active" : ""}`} 
                          data-top-index={i}
                        >
                          <DynamicIsland client:load componentPath={componentPath} props={props} />
                          <div className="comp-label">{component.name}</div>
                        </div>
                      );
                    })}
                  </>
                </Layout>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Properties */}
        <aside className={`admin-sidebar right ${showRightPanel ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3>Propiedades</h3>
          </div>
          <div className="sidebar-content">
            <div className="properties-section">
              <button className="accordion-header" onClick={() => setSeoOpen(!seoOpen)}>
                <h4>SEO & Metadata</h4>
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`chevron ${seoOpen ? 'open' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {seoOpen && (
                <div className="accordion-content">
                  <div className="form-group">
                    <label>Título</label>
                    <input value={currentPage?.title || ""} onChange={(e) => onEditSeo("title", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Meta Title</label>
                    <input value={currentPage?.meta_title || ""} onChange={(e) => onEditSeo("meta_title", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Meta Description</label>
                    <textarea rows={3} value={currentPage?.meta_description || ""} onChange={(e) => onEditSeo("meta_description", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Canonical</label>
                    <input value={currentPage?.canonical || ""} onChange={(e) => onEditSeo("canonical", e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="properties-section">
              <button className="accordion-header" onClick={() => setCompOpen(!compOpen)}>
                <h4>Componente</h4>
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`chevron ${compOpen ? 'open' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {compOpen && (
                <div className="accordion-content">
                  {selectedIndex === null ? (
                    <div className="empty-state">Selecciona un componente en el preview para editar sus propiedades.</div>
                  ) : (
                    <>
                      <div className="selected-comp-name">
                        {selectedSlot
                          ? String(((currentPage?.components?.[selectedIndex || 0]?.custom_attrs || {}) as any)[selectedSlot]?.value?.name || currentPage?.components?.[selectedIndex || 0]?.name)
                          : currentPage?.components?.[selectedIndex || 0]?.name}
                      </div>
                      {textAttrs.entries.length === 0 && <div className="empty-state">Este componente no tiene campos de texto editables.</div>}
                      {textAttrs.entries.map(([k, v]) => (
                        <div key={k} className="form-group">
                          <label>{k}</label>
                          <input value={String(v?.value || "")} onChange={(e) => onEditAttr(k, e.target.value)} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {showExitModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>¿Guardar cambios?</h3>
            <p>Tienes cambios sin guardar. ¿Qué deseas hacer?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowExitModal(false)}>Cancelar</button>
              <button className="btn-danger" onClick={() => confirmExit(false)}>Descartar</button>
              <button className="btn-primary" onClick={() => confirmExit(true)}>Guardar y Salir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
