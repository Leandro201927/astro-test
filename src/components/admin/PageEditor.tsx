import { useEffect, useMemo, useRef, useState } from "react";
import infoIcon from "@/assets/info.svg";
import type { Page } from "@/types/clientWebsite";
import Layout from "@/components/system/Layout.tsx";
import DynamicIsland from "@/components/system/DynamicIsland";
import { flattenProps } from "@/utils/flattenProps";
import "@/styles/admin/page.scss";
interface Props {
  initialPages: Page[];
  initialUser: any;
  globalComponents?: any;
  initialMedia?: any[];
  canChange?: boolean;
  userEmail?: string;
}

export default function PageEditor({ initialPages, initialUser, globalComponents, initialMedia, canChange = true, userEmail }: Props) {
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const currentPage = pages[currentPageIndex] || pages[0];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSlotEl, setSelectedSlotEl] = useState<HTMLElement | null>(null);
  
  const [globalComps, setGlobalComps] = useState(globalComponents || { header: null, footer: null });
  const [selectedGlobal, setSelectedGlobal] = useState<'header' | 'footer' | null>(null);

  const [saving, setSaving] = useState(false);
  const [buildStatus, setBuildStatus] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  const [previewMode, setPreviewMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [seoOpen, setSeoOpen] = useState(false);
  const [seoSearchOpen, setSeoSearchOpen] = useState(false);
  const [seoOgOpen, setSeoOgOpen] = useState(false);
  const [seoTwitterOpen, setSeoTwitterOpen] = useState(false);
  const [compOpen, setCompOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Initial media loading
  const [galleryItems, setGalleryItems] = useState<any[]>(initialMedia || []);
  const mediaMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of galleryItems) {
      if (item.key && item.url) {
        map.set(item.key, item.url);
        map.set(`/${item.key}`, item.url);
        // Also map just the filename part if key is a path
        const filename = item.key.split('/').pop();
        if (filename) map.set(filename, item.url);
      }
    }
    return map;
  }, [galleryItems]);

  const resolveMediaUrl = (val: string) => {
    if (!val) return '';
    // Pass through absolute URLs and API proxy URLs
    if (val.startsWith('http') || val.startsWith('/api/admin/media/file')) return val;
    // Normalize keys that may start with '/'
    const keyCandidate = val.replace(/^\/+/, '');
    // Try to resolve from media map (original and normalized)
    const resolved = mediaMap.get(val) || mediaMap.get(keyCandidate);
    if (resolved) return resolved;
    // If not in map, construct API proxy URL assuming val is a key
    return `/api/admin/media/file?key=${encodeURIComponent(keyCandidate)}`;
  };

  // Media se carga bajo demanda (ej. al abrir la galería)

  const mediaAttrs = useMemo(() => {
    const idx = selectedIndex ?? -1;
    const comps = Array.isArray(currentPage?.components) ? currentPage.components : [];
    const comp = comps[idx] || null;
    let attrs: Record<string, any> = {};
    if (comp) {
      if (selectedSlot) {
        const slotObj = ((comp.custom_attrs || {}) as Record<string, any>)[selectedSlot] || null;
        const nestedComp = slotObj && typeof slotObj === 'object' ? (slotObj.value as any) : null;
        attrs = (nestedComp?.custom_attrs || {}) as Record<string, any>;
      } else {
        attrs = (comp?.custom_attrs || {}) as Record<string, any>;
      }
    } else if (selectedGlobal && globalComps[selectedGlobal]) {
      const g = globalComps[selectedGlobal];
      attrs = (g?.custom_attrs || {}) as Record<string, any>;
    }
    const entries = Object.entries(attrs).filter(([_, v]) => v && typeof v === 'object' && (v.type === 'img' || v.type === 'file'));
    return { compIndex: idx, entries } as { compIndex: number; entries: [string, any][] };
  }, [currentPage, selectedIndex, selectedSlot, selectedGlobal, globalComps]);
// ...


  // Helper values
  const hostText = typeof window !== 'undefined' ? window.location.host : 'localhost';
  const og = currentPage?.open_graph || {};
  const metaTitle = currentPage?.open_graph?.og_title || currentPage?.title || '';
  const metaDescription = currentPage?.open_graph?.og_description || currentPage?.content_text_summary || '';
  const ogImageSrc = resolveMediaUrl(currentPage?.open_graph?.og_image?.src || '');
  const ogImage = currentPage?.open_graph?.og_image || {};
  const twitterImageSrc = resolveMediaUrl(currentPage?.open_graph?.twitter_image || '');
  const twitterCard = currentPage?.open_graph?.twitter_card || 'summary_large_image';

  // Helper functions
  const InfoTip = ({ text }: { text: string }) => (
    <div className="info-tip" title={text} style={{ display: 'inline-block', marginLeft: 4 }}>
      <img src={typeof infoIcon === 'string' ? infoIcon : (infoIcon as any).src} alt="Info" style={{ width: 12, height: 12, opacity: 0.5, verticalAlign: 'middle' }} />
    </div>
  );

  const onEditSeo = (field: string, value: string) => {
       const next = pages.map((p) => {
          if (p.slug !== currentPage.slug) return p;
          const copy = { ...p };
          if (field === 'keyword_focus') {
             copy.keyword_focus = value.split(',').map(s => s.trim());
          } else {
             (copy as any)[field] = value;
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
    } else if (selectedGlobal && globalComps[selectedGlobal]) {
      const g = globalComps[selectedGlobal];
      attrs = (g?.custom_attrs || {}) as Record<string, any>;
    }
    const entries = Object.entries(attrs).filter(([_, v]) => v && typeof v === "object" && (v.type === "string" || v.type === "text"));
    return { compIndex: idx, entries } as { compIndex: number; entries: [string, any][] };
  }, [currentPage, selectedIndex, selectedSlot]);

  const arrayAttrs = useMemo(() => {
    const idx = selectedIndex ?? -1;
    const comps = Array.isArray(currentPage?.components) ? currentPage.components : [];
    const comp = comps[idx] || null;
    let attrs: Record<string, any> = {};
    if (comp) {
      if (selectedSlot) {
        const slotObj = ((comp.custom_attrs || {}) as Record<string, any>)[selectedSlot] || null;
        const nestedComp = slotObj && typeof slotObj === 'object' ? (slotObj.value as any) : null;
        attrs = (nestedComp?.custom_attrs || {}) as Record<string, any>;
      } else {
        attrs = (comp?.custom_attrs || {}) as Record<string, any>;
      }
    } else if (selectedGlobal && globalComps[selectedGlobal]) {
      const g = globalComps[selectedGlobal];
      attrs = (g?.custom_attrs || {}) as Record<string, any>;
    }
    const entries = Object.entries(attrs).filter(([_, v]) => v && typeof v === 'object' && v.type === 'array' && Array.isArray(v.value));
    return { compIndex: idx, entries } as { compIndex: number; entries: [string, any][] };
  }, [currentPage, selectedIndex, selectedSlot, selectedGlobal, globalComps]);

  const objectAttrs = useMemo(() => {
    const idx = selectedIndex ?? -1;
    const comps = Array.isArray(currentPage?.components) ? currentPage.components : [];
    const comp = comps[idx] || null;
    let attrs: Record<string, any> = {};
    if (comp) {
      if (selectedSlot) {
        const slotObj = ((comp.custom_attrs || {}) as Record<string, any>)[selectedSlot] || null;
        const nestedComp = slotObj && typeof slotObj === 'object' ? (slotObj.value as any) : null;
        attrs = (nestedComp?.custom_attrs || {}) as Record<string, any>;
      } else {
        attrs = (comp?.custom_attrs || {}) as Record<string, any>;
      }
    } else if (selectedGlobal && globalComps[selectedGlobal]) {
      const g = globalComps[selectedGlobal];
      attrs = (g?.custom_attrs || {}) as Record<string, any>;
    }
    const entries = Object.entries(attrs).filter(([_, v]) => v && typeof v === 'object' && v.type === 'object' && v.value && typeof v.value === 'object');
    return { compIndex: idx, entries } as { compIndex: number; entries: [string, any][] };
  }, [currentPage, selectedIndex, selectedSlot, selectedGlobal, globalComps]);



  const onEditAttr = (name: string, value: string) => {
    if (selectedGlobal) {
      const g = globalComps[selectedGlobal];
      if (!g) return;
      const ca = { ...(g.custom_attrs || {}) } as any;
      const ov = ca[name] || { type: "string", value: "" };
      const prev = String((ov as any).value || '');
      const prevBase = prev.split('?')[0].split('#')[0];
      const nextBase = String(value || '').split('?')[0].split('#')[0];
      const v = prevBase && nextBase && prevBase === nextBase ? `${value}${value.includes('?') ? '&' : '?'}v=${Date.now()}` : value;
      ca[name] = { ...ov, value: v };
      const nextG = { ...g, custom_attrs: ca };
      setGlobalComps({ ...globalComps, [selectedGlobal]: nextG });
      return;
    }

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
          const prev = String((ov as any).value || '');
          const prevBase = prev.split('?')[0].split('#')[0];
          const nextBase = String(value || '').split('?')[0].split('#')[0];
          const v = prevBase && nextBase && prevBase === nextBase ? `${value}${value.includes('?') ? '&' : '?'}v=${Date.now()}` : value;
          nestedAttrs[name] = { ...ov, value: v };
          nestedComp.custom_attrs = nestedAttrs;
          ca[selectedSlot] = { ...slotEntry, value: nestedComp };
          comps[i] = { ...comps[i], custom_attrs: ca };
          copy.components = comps as any;
        } else {
          const ov = ca[name] || { type: "string", value: "" };
          const prev = String((ov as any).value || '');
          const prevBase = prev.split('?')[0].split('#')[0];
          const nextBase = String(value || '').split('?')[0].split('#')[0];
          const v = prevBase && nextBase && prevBase === nextBase ? `${value}${value.includes('?') ? '&' : '?'}v=${Date.now()}` : value;
          ca[name] = { ...ov, value: v };
          comps[i] = { ...comps[i], custom_attrs: ca };
          copy.components = comps as any;
        }
      }
      return copy;
    });
    setPages(next);
  };

  const onPatchAttr = (name: string, nextValue: any) => {
    if (selectedGlobal) {
      const g = globalComps[selectedGlobal];
      if (!g) return;
      const ca = { ...(g.custom_attrs || {}) } as any;
      const ov = ca[name] || { type: "string", value: "" };
      ca[name] = { ...ov, value: nextValue };
      const nextG = { ...g, custom_attrs: ca };
      setGlobalComps({ ...globalComps, [selectedGlobal]: nextG });
      return;
    }

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
          nestedAttrs[name] = { ...ov, value: nextValue };
          nestedComp.custom_attrs = nestedAttrs;
          ca[selectedSlot] = { ...slotEntry, value: nestedComp };
          comps[i] = { ...comps[i], custom_attrs: ca };
          copy.components = comps as any;
        } else {
          const ov = ca[name] || { type: "string", value: "" };
          ca[name] = { ...ov, value: nextValue };
          comps[i] = { ...comps[i], custom_attrs: ca };
          copy.components = comps as any;
        }
      }
      return copy;
    });
    setPages(next);
  };

  const [showGallery, setShowGallery] = useState(false);

  const [activeMediaAttr, setActiveMediaAttr] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const galleryCacheRef = useRef<{ items: any[]; ts: number } | null>(null);
  const galleryInFlightRef = useRef<Promise<void> | null>(null);
  const MEDIA_TTL_MS = 30000;

  // Helper to safely construct media URL
  const getMediaUrl = (item: any): string => {
    if (!item) return '';
    // Prefer direct URL if available (from R2 public URL)
    if (typeof item.url === 'string' && item.url) {
      return item.url;
    }
    // Fallback to API proxy if key is available
    if (typeof item.key === 'string' && item.key) {
      return `/api/admin/media/file?key=${encodeURIComponent(item.key)}`;
    }
    // Handle items from KV list that only have 'name' property (format: "media:actual-key")
    if (typeof item.name === 'string' && item.name) {
      const key = item.name.replace(/^media:/, '');
      return `/api/admin/media/file?key=${encodeURIComponent(key)}`;
    }
    return '';
  };

  const baseFromUrl = (u: string): string => {
    try { return u.split('?')[0]; } catch { return u; }
  };
  const isImageUrl = (u: string): boolean => {
    const b = baseFromUrl(u);
    return /^data:image\//.test(u) || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(b);
  };
  const buildSrcSet = (u: string, widths: number[]): string => {
    const base = u.split('#')[0];
    return widths.map((w) => `${base}${base.includes('?') ? '&' : '?'}w=${w} ${w}w`).join(', ');
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'complete') return;
    const sandbox = document.querySelector('.preview-sandbox');
    if (!sandbox) return;
    const ph = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    const imgs = Array.from(sandbox.querySelectorAll('img'));
    imgs.forEach((img) => {
      if (img.dataset.deferred === 'true') return;
      const src = img.getAttribute('src');
      const srcset = img.getAttribute('srcset');
      if (src) {
        img.dataset.deferSrc = src;
        img.setAttribute('src', ph);
      }
      if (srcset) {
        img.dataset.deferSrcset = srcset;
        img.removeAttribute('srcset');
      }
      img.dataset.deferred = 'true';
    });
    const restore = () => {
      const els = Array.from(sandbox.querySelectorAll('img[data-deferred="true"]'));
      els.forEach((el) => {
        const ds = el.dataset.deferSrc;
        const dss = el.dataset.deferSrcset;
        if (ds) el.setAttribute('src', ds);
        if (dss) el.setAttribute('srcset', dss);
        delete el.dataset.deferSrc;
        delete el.dataset.deferSrcset;
        delete el.dataset.deferred;
      });
    };
    window.addEventListener('load', restore, { once: true });
    return () => {
      window.removeEventListener('load', restore);
    };
  }, [currentPage, previewMode, selectedIndex, selectedGlobal, selectedSlot]);

  const computePropsKey = (p: Record<string, any>): string => {
    const vals = Object.values(p).map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
    const s = vals.join('|');
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return String(h);
  };

  const loadMediaOnce = async (force?: boolean) => {
    const now = Date.now();
    if (!force && galleryCacheRef.current && (now - galleryCacheRef.current.ts) < MEDIA_TTL_MS) {
      setGalleryItems(galleryCacheRef.current.items);
      return;
    }
    if (galleryInFlightRef.current) {
      await galleryInFlightRef.current;
      setGalleryItems(galleryCacheRef.current?.items || []);
      return;
    }
    const p = (async () => {
      try {
        const res = await fetch('/api/admin/media/list');
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data.items) ? data.items : [];
          galleryCacheRef.current = { items, ts: Date.now() };
          setGalleryItems(items);
        }
      } catch {}
    })();
    galleryInFlightRef.current = p;
    try { await p; } finally { galleryInFlightRef.current = null; }
  };

  useEffect(() => {
    if (!showGallery) return;
    loadMediaOnce(false);
  }, [showGallery]);

  useEffect(() => {
    const run = () => { loadMediaOnce(false); };
    if (typeof window === 'undefined') return;
    if (document.readyState === 'complete') {
      setTimeout(run, 0);
    } else {
      window.addEventListener('load', run, { once: true });
      return () => { window.removeEventListener('load', run); };
    }
  }, []);

  const onUploadSubmit = async () => {
    if (!uploadFile) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', uploadFile);
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        setUploading(false);
        return;
      }
      await res.json().catch(() => ({}));
      setShowUpload(false);
      setUploadFile(null);
      await loadMediaOnce(true);
    } catch {
      setUploading(false);
    } finally {
      setUploading(false);
    }
  };

  const sanitizeUrl = (u: string): string => {
    try {
      const [base, hash] = u.split('#');
      const urlObj = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      urlObj.searchParams.delete('v');
      return `${urlObj.pathname}${urlObj.search}${hash ? `#${hash}` : ''}`;
    } catch { return u; }
  };
  const sanitizeAttrs = (attrs: Record<string, any>) => {
    const out: Record<string, any> = {};
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v && typeof v === 'object' && 'type' in v) {
        const t = (v as any).type;
        const val = (v as any).value;
        if (t === 'img' || t === 'file' || t === 'url' || t === 'string') {
          if (typeof val === 'string') {
            out[k] = { ...v, value: sanitizeUrl(val) };
          } else if (val && typeof val === 'object') {
            const copy = { ...(val as any) } as any;
            if (typeof copy.src === 'string') copy.src = sanitizeUrl(copy.src);
            if (typeof copy.url === 'string') copy.url = sanitizeUrl(copy.url);
            out[k] = { ...v, value: copy };
          } else {
            out[k] = v;
          }
        } else {
          out[k] = v;
        }
      } else {
        out[k] = v;
      }
    });
    return out;
  };
  const sanitizePages = (ps: Page[]) => {
    return ps.map((p) => {
      const cp: Page = { ...(p as any) };
      const comps = Array.isArray(cp.components) ? cp.components.map((c: any) => {
        const cc = { ...(c as any) };
        cc.custom_attrs = sanitizeAttrs(cc.custom_attrs || {});
        return cc;
      }) : [] as any[];
      cp.components = comps as any;
      cp.open_graph = { ...(cp.open_graph || {}) } as any;
      const ogImg = (cp.open_graph as any).og_image || {};
      if (typeof ogImg.src === 'string') ogImg.src = sanitizeUrl(ogImg.src);
      (cp.open_graph as any).og_image = ogImg;
      if (typeof (cp.open_graph as any).twitter_image === 'string') {
        (cp.open_graph as any).twitter_image = sanitizeUrl((cp.open_graph as any).twitter_image);
      }
      return cp;
    });
  };
  const sanitizeGlobal = (g: any) => {
    if (!g) return g;
    const out = { ...g };
    out.custom_attrs = sanitizeAttrs(out.custom_attrs || {});
    return out;
  };
  const onSave = async () => {
    if (!canChange) return;
    try {
      setSaving(true);
      setBuildStatus("QUEUED");
      const payloadPages = sanitizePages(pages);
      const payloadGlobals = { header: sanitizeGlobal(globalComps.header), footer: sanitizeGlobal(globalComps.footer) };
      const res = await fetch("/api/admin/pages/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pages: payloadPages, global_components: payloadGlobals }) });
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
                  className={`page-item ${p.slug === currentPage.slug ? "active" : ""}`} 
                  onClick={() => { 
                    const idx = pages.findIndex(x => x.slug === p.slug);
                    setCurrentPageIndex(idx === -1 ? 0 : idx); 
                    setSelectedIndex(null); 
                    setSelectedGlobal(null);
                  }}
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

            <div className="sidebar-header" style={{ marginTop: 24, paddingLeft: 0 }}>
              <h3>Globales</h3>
            </div>
            <div className="pages-list">
              <button 
                className={`page-item ${selectedGlobal === 'header' ? "active" : ""}`}
                onClick={() => { setSelectedGlobal('header'); setSelectedIndex(null); }}
              >
                 <span className="page-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                  </span>
                  <div className="page-info">
                    <span className="page-title">Header</span>
                    <span className="page-slug">{globalComps.header?.name || "Sin componente"}</span>
                  </div>
              </button>
              <button 
                className={`page-item ${selectedGlobal === 'footer' ? "active" : ""}`}
                onClick={() => { setSelectedGlobal('footer'); setSelectedIndex(null); }}
              >
                 <span className="page-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                  </span>
                  <div className="page-info">
                    <span className="page-title">Footer</span>
                    <span className="page-slug">{globalComps.footer?.name || "Sin componente"}</span>
                  </div>
              </button>
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
                  
                  if (idxStr === 'global_header') {
                    setSelectedGlobal('header');
                    setSelectedIndex(null);
                  } else if (idxStr === 'global_footer') {
                    setSelectedGlobal('footer');
                    setSelectedIndex(null);
                  } else {
                    const idx = idxStr ? Number(idxStr) : NaN;
                    if (!Number.isNaN(idx)) {
                       setSelectedIndex(idx);
                       setSelectedGlobal(null);
                    }
                  }

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
                <div className="preview-sandbox">
                  <Layout page={currentPage}>
                    <>
                      {/* Global Header */}
                      {globalComps?.header && (
                         <div 
                           className={`comp-wrap sticky-top ${selectedGlobal === 'header' ? "active" : ""}`} 
                           data-top-index="global_header"
                           style={{ marginBottom: '1rem' }}
                         >
                          <DynamicIsland key={computePropsKey(flattenProps(globalComps.header.custom_attrs || {}, resolveMediaUrl))} componentPath={`${globalComps.header.atomic_hierarchy}s/${globalComps.header.name}`} props={flattenProps(globalComps.header.custom_attrs || {}, resolveMediaUrl)} />
                         </div>
                      )}

                      <div className="page-content-wrapper" style={{ minHeight: '50vh' }}>
                        {Array.isArray(currentPage.components) && currentPage.components.map((component, i) => {
                          const dir = String(component.atomic_hierarchy).endsWith("s") ? String(component.atomic_hierarchy) : `${component.atomic_hierarchy}s`;
                          const componentPath = `${dir}/${component.name}`;
                          const props = flattenProps(component.custom_attrs || {}, resolveMediaUrl);
                          const active = selectedIndex === i && !selectedSlot;
                          return (
                            <div 
                              key={`${component.name}-${i}`} 
                              className={`comp-wrap ${active ? "active" : ""}`} 
                              data-top-index={i}
                            >
                              <DynamicIsland key={computePropsKey(props)} componentPath={componentPath} props={props} />
                              <div className="comp-label">{component.name}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Global Footer */}
                      {globalComps?.footer && (
                         <div 
                           className={`comp-wrap ${selectedGlobal === 'footer' ? "active" : ""}`} 
                           data-top-index="global_footer"
                           style={{ marginTop: '1rem' }}
                         >
                          <DynamicIsland key={computePropsKey(flattenProps(globalComps.footer.custom_attrs || {}, resolveMediaUrl))} componentPath={`${globalComps.footer.atomic_hierarchy}s/${globalComps.footer.name}`} props={flattenProps(globalComps.footer.custom_attrs || {}, resolveMediaUrl)} />
                         </div>
                      )}
                    </>
                  </Layout>
                </div>
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
                <div className="accordion-content" style={{ display: 'grid', gap: 16, width: '100%' }}>
                  <div className="properties-subsection" style={{ marginTop: 20 }}>
                    <button className="accordion-header" onClick={() => setSeoSearchOpen(!seoSearchOpen)}>
                      <h4 style={{ textAlign: 'left' }}>Apariencia en resultados de búsqueda</h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`chevron ${seoSearchOpen ? 'open' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    {seoSearchOpen && (
                      <div className="accordion-content" style={{ display: 'grid', gap: 8, width: '100%' }}>
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', width: 640, minWidth: 640 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151', fontSize: 12, marginBottom: 8, overflowWrap: 'anywhere' }}>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#e5e7eb' }}></div>
                            <div style={{ fontWeight: 600 }}>{og?.og_site_name || hostText || 'Sitio'}</div>
                            <span style={{ color: '#6b7280' }}>·</span>
                            <div style={{ color: '#6b7280' }}>{hostText}</div>
                            <span style={{ color: '#6b7280' }}>›</span>
                            <div style={{ color: '#6b7280' }}>{'homepage'}</div>
                          </div>
                          <div style={{ color: '#1a0dab', fontSize: 20, lineHeight: '24px', marginBottom: 6, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{metaTitle || '(Sin título)'}</div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#6b7280', fontSize: 12, marginBottom: 4, overflowWrap: 'anywhere' }}>
                            {(currentPage?.published_at) && <div>{new Date(currentPage.published_at).toLocaleDateString(currentPage.language || 'es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}</div>}
                            <span>–</span>
                            <div style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{metaDescription || '(Sin descripción)'}</div>
                          </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{"<< Desliza para ver la previsualización >>"}</div>
                        <div className="form-group"><label>Descripción general<InfoTip text="Resumen que aparece debajo del título en resultados" /></label><textarea rows={3} value={currentPage?.meta_description || ''} onChange={(e) => onEditSeo('meta_description', e.target.value)} /></div>
                        <div className="form-group"><label>Título<InfoTip text="Título principal de la página" /></label><input value={currentPage?.title || ''} onChange={(e) => onEditSeo('title', e.target.value)} /></div>
                        <div className="form-group"><label>Meta Title<InfoTip text="Título que aparece en los resultados de búsqueda" /></label><input value={currentPage?.meta_title || ''} onChange={(e) => onEditSeo('meta_title', e.target.value)} /></div>
                        <div className="form-group"><label>Canonical<InfoTip text="URL preferida para evitar contenido duplicado" /></label><input value={currentPage?.canonical || ''} onChange={(e) => onEditSeo('canonical', e.target.value)} /></div>
                        <div className="form-group"><label>Robots Extra<InfoTip text="Directivas adicionales para robots (ej. noarchive)" /></label><input value={currentPage?.robots_extra || ''} onChange={(e) => onEditSeo('robots_extra', e.target.value)} /></div>
                        <div className="form-group"><label>Keywords<InfoTip text="Lista de palabras clave separadas por comas" /></label><input value={(currentPage?.keyword_focus || []).join(', ')} onChange={(e) => onEditSeo('keyword_focus', e.target.value)} /></div>
                      </div>
                    )}
                  </div>

                  <div className="properties-subsection" style={{ width: '100%' }}>
                    <button className="accordion-header" onClick={() => setSeoOgOpen(!seoOgOpen)}>
                      <h4 style={{ textAlign: 'left' }}>Apariencia en redes sociales (social, general)</h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`chevron ${seoOgOpen ? 'open' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    {seoOgOpen && (
                      <div className="accordion-content" style={{ display: 'grid', gap: 8, width: '100%' }}>
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, width: 640, minWidth: 640 }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            {ogImageSrc ? (
                              <img src={ogImageSrc} alt={ogImage.alt || ''} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 4 }} />
                            ) : (
                              <div style={{ width: 120, height: 120, background: '#f3f4f6', borderRadius: 4 }}></div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4, overflowWrap: 'anywhere' }}>{og?.og_site_name || '(Sin sitio)'}</div>
                              <div style={{ color: '#111827', fontSize: 16, fontWeight: 600, marginBottom: 4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{og?.og_title || metaTitle || '(Sin título)'}</div>
                              <div style={{ color: '#4b5563', fontSize: 13, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{og?.og_description || metaDescription || '(Sin descripción)'}</div>
                            </div>
                          </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{"<< Desliza para ver la previsualización >>"}</div>
                        <div className="form-group"><label>Título para redes<InfoTip text="Título mostrado al compartir en redes" /></label><input value={currentPage?.open_graph?.og_title || ''} onChange={(e) => onEditSeo('og_title', e.target.value)} /></div>
                        <div className="form-group"><label>Descripción para redes<InfoTip text="Texto que acompaña al título al compartir" /></label><textarea rows={3} value={currentPage?.open_graph?.og_description || ''} onChange={(e) => onEditSeo('og_description', e.target.value)} /></div>
                        <div className="form-group"><label>Tipo de contenido<InfoTip text="Categoría del contenido para redes" /></label><select value={currentPage?.open_graph?.og_type || 'website'} onChange={(e) => onEditSeo('og_type', e.target.value)} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' }}><option value="article">article</option><option value="website">website</option><option value="product">product</option></select></div>
                        <div className="form-group"><label>Nombre del sitio<InfoTip text="Nombre de tu marca o sitio" /></label><input value={currentPage?.open_graph?.og_site_name || ''} onChange={(e) => onEditSeo('og_site_name', e.target.value)} /></div>
                        <div className="form-group"><label>URL del recurso<InfoTip text="URL que se compartirá en redes" /></label><input value={currentPage?.open_graph?.og_url || currentPage?.canonical || ''} onChange={(e) => onEditSeo('og_url', e.target.value)} /></div>
                        <div className="form-group"><label>Idioma/región<InfoTip text="Formato es_ES, en_US" /></label><input value={currentPage?.open_graph?.og_locale || ''} onChange={(e) => onEditSeo('og_locale', e.target.value)} /></div>
                        <div className="form-group"><label>Imagen<InfoTip text="URL absoluta de la imagen" /></label><input value={currentPage?.open_graph?.og_image?.src || ''} onChange={(e) => onEditSeo('og_image.src', e.target.value)} /></div>
                        <div className="form-group"><label>Alt de la imagen<InfoTip text="Texto alternativo descriptivo" /></label><input value={currentPage?.open_graph?.og_image?.alt || ''} onChange={(e) => onEditSeo('og_image.alt', e.target.value)} /></div>
                        <div className="form-group"><label>Ancho imagen<InfoTip text="En píxeles, ej. 1200" /></label><input type="number" value={Number(currentPage?.open_graph?.og_image?.width || 0)} onChange={(e) => onEditSeo('og_image.width', e.target.value)} /></div>
                        <div className="form-group"><label>Alto imagen<InfoTip text="En píxeles, ej. 630" /></label><input type="number" value={Number(currentPage?.open_graph?.og_image?.height || 0)} onChange={(e) => onEditSeo('og_image.height', e.target.value)} /></div>
                      </div>
                    )}
                  </div>

                  <div className="properties-subsection" style={{ width: '100%' }}>
                    <button className="accordion-header" onClick={() => setSeoTwitterOpen(!seoTwitterOpen)}>
                      <h4 style={{ textAlign: 'left' }}>Apariencia en redes sociales (twitter)</h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`chevron ${seoTwitterOpen ? 'open' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    {seoTwitterOpen && (
                      <div className="accordion-content" style={{ display: 'grid', gap: 8, width: '100%' }}>
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, width: 640, minWidth: 640 }}>
                          {twitterCard === 'summary_large_image' ? (
                            <div>
                              {(twitterImageSrc || ogImageSrc) ? (
                                <img src={twitterImageSrc || ogImageSrc} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 4, marginBottom: 8, maxWidth: '100%' }} />
                              ) : (
                                <div style={{ width: '100%', height: 160, background: '#f3f4f6', borderRadius: 4, marginBottom: 8 }}></div>
                              )}
                              <div style={{ color: '#111827', fontSize: 16, fontWeight: 600, marginBottom: 4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{og?.twitter_title || og?.og_title || metaTitle || '(Sin título)'}</div>
                              <div style={{ color: '#4b5563', fontSize: 13, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{og?.twitter_description || og?.og_description || metaDescription || '(Sin descripción)'}</div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 12 }}>
                              {(twitterImageSrc || ogImageSrc) ? (
                                <img src={twitterImageSrc || ogImageSrc} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
                              ) : (
                                <div style={{ width: 80, height: 80, background: '#f3f4f6', borderRadius: 4 }}></div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: '#111827', fontSize: 15, fontWeight: 600, marginBottom: 4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{og?.twitter_title || og?.og_title || metaTitle || '(Sin título)'}</div>
                                <div style={{ color: '#4b5563', fontSize: 13, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{og?.twitter_description || og?.og_description || metaDescription || '(Sin descripción)'}</div>
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{"<< Desliza para ver la previsualización >>"}</div>
                        <div className="form-group"><label>Formato de tarjeta<InfoTip text="Elige resumen o imagen grande" /></label><select value={currentPage?.open_graph?.twitter_card || 'summary'} onChange={(e) => onEditSeo('twitter_card', e.target.value)} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' }}><option value='summary'>summary</option><option value='summary_large_image'>summary_large_image</option></select></div>
                        <div className="form-group"><label>Título en Twitter<InfoTip text="Título que mostrará Twitter" /></label><input value={currentPage?.open_graph?.twitter_title || ''} onChange={(e) => onEditSeo('twitter_title', e.target.value)} /></div>
                        <div className="form-group"><label>Descripción en Twitter<InfoTip text="Texto que acompaña al título" /></label><textarea rows={3} value={currentPage?.open_graph?.twitter_description || ''} onChange={(e) => onEditSeo('twitter_description', e.target.value)} /></div>
                        <div className="form-group"><label>Imagen en Twitter<InfoTip text="URL de la imagen de la tarjeta" /></label><input value={currentPage?.open_graph?.twitter_image || ''} onChange={(e) => onEditSeo('twitter_image', e.target.value)} /></div>
                      </div>
                    )}
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
                  {selectedIndex === null && selectedGlobal === null ? (
                    <div className="empty-state">Selecciona un componente en el preview para editar sus propiedades.</div>
                  ) : (
                    <>
                      <div className="selected-comp-name">
                        {selectedGlobal 
                            ? (globalComps[selectedGlobal]?.name + " (Global)")
                            : (selectedSlot
                                ? String(((currentPage?.components?.[selectedIndex || 0]?.custom_attrs || {}) as any)[selectedSlot]?.value?.name || currentPage?.components?.[selectedIndex || 0]?.name)
                                : currentPage?.components?.[selectedIndex || 0]?.name)
                        }
                      </div>
                      {textAttrs.entries.length === 0 && mediaAttrs.entries.length === 0 && objectAttrs.entries.length === 0 && arrayAttrs.entries.length === 0 && <div className="empty-state">Este componente no tiene propiedades editables.</div>}
                      {textAttrs.entries.map(([k, v]) => (
                        <div key={k} className="form-group">
                          <label>{k}</label>
                          <input value={String(v?.value || "")} onChange={(e) => onEditAttr(k, e.target.value)} />
                        </div>
                      ))}
                      {mediaAttrs.entries.length > 0 && (
                        <div className="form-group">
                          <label>Medios</label>
                          {mediaAttrs.entries.map(([k, v]) => {
                            const val = (v?.value as any);
                            const raw = typeof val === 'string' ? val : (val && typeof val === 'object' ? (val.src || val.url || '') : '');
                            const url = resolveMediaUrl(raw);
                            let name = '';
                            let isImage = false;
                            try {
                              if (url) {
                                const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
                                const keyParam = u.searchParams.get('key');
                                const candidate = (keyParam || u.pathname.split('/').pop() || '').split('#')[0];
                                name = candidate || url;
                                isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(candidate);
                              }
                            } catch {
                              const base = url.split('?')[0];
                              name = base.split('/').pop() || base;
                              isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);
                            }
                            const ext = name?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
                            return (
                              <div key={k} style={{ display: 'grid', gridTemplateColumns: '180px auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ width: 160, height: 100, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {url ? (
                                    isImage ? (
                                      <img 
                                        key={url}
                                        src={url} 
                                        alt={name} 
                                        loading="lazy" 
                                        decoding="async" 
                                        fetchPriority="low"
                                        srcSet={buildSrcSet(url, [160, 320, 640])}
                                        sizes="(max-width: 480px) 160px, 320px"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', fontSize: 12 }}>
                                        <span style={{ display: 'inline-block', width: 16, height: 16, background: '#e5e7eb', borderRadius: 4 }}></span>
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={name}>{name}</span>
                                        {ext && (<span style={{ fontSize: 10, background: '#f3f4f6', color: '#6b7280', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{ext}</span>)}
                                      </div>
                                    )
                                  ) : (
                                    <span style={{ fontSize: 10, color: '#9ca3af' }}>Sin archivo</span>
                                  )}
                                </div>
                                <button className="btn-secondary" onClick={() => { setActiveMediaAttr(k); setShowGallery(true); }}>Galería</button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {objectAttrs.entries.length > 0 && (
                        <div className="form-group">
                          <label>Objetos</label>
                          {objectAttrs.entries.map(([k, v]) => {
                            const obj = (v?.value || {}) as Record<string, any>;
                            const keys = Object.keys(obj || {});
                            if (keys.length === 2) {
                              const [keyA, keyB] = keys;
                              return (
                                <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                  <div className="form-group">
                                    <label>{keyA}</label>
                                    <input value={String(obj[keyA] ?? '')} onChange={(e) => onPatchAttr(k, { ...obj, [keyA]: e.target.value })} />
                                  </div>
                                  <div className="form-group">
                                    <label>{keyB}</label>
                                    <input value={String(obj[keyB] ?? '')} onChange={(e) => onPatchAttr(k, { ...obj, [keyB]: e.target.value })} />
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div key={k} className="form-group">
                                <label>{k} (JSON)</label>
                                <textarea rows={3} value={JSON.stringify(obj, null, 2)} onChange={(e) => { try { onPatchAttr(k, JSON.parse(e.target.value)); } catch {} }} />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {arrayAttrs.entries.length > 0 && (
                        <div className="form-group">
                          <label>Arrays</label>
                          {arrayAttrs.entries.map(([k, v]) => {
                            const arr = Array.isArray(v?.value) ? (v.value as any[]) : [];
                            const complex = arr.length > 0 && arr.every((it) => it && typeof it === 'object' && it.type === 'object' && it.value && typeof it.value === 'object');
                            if (complex) {
                              const keys = Object.keys(arr[0].value || {});
                              const keyA = keys[0];
                              const keyB = keys[1];
                              return (
                                <div key={k} style={{ marginBottom: 8 }}>
                                  <div style={{ display: 'grid', gap: 8 }}>
                                    {arr.map((item: any, idx: number) => (
                                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                          <label>{keyA}</label>
                                          <input value={String(item.value?.[keyA] ?? '')} onChange={(e) => {
                                            const next = arr.slice();
                                            next[idx] = { type: 'object', value: { ...item.value, [keyA]: e.target.value } };
                                            onPatchAttr(k, next);
                                          }} />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                          <label>{keyB}</label>
                                          <input value={String(item.value?.[keyB] ?? '')} onChange={(e) => {
                                            const next = arr.slice();
                                            next[idx] = { type: 'object', value: { ...item.value, [keyB]: e.target.value } };
                                            onPatchAttr(k, next);
                                          }} />
                                        </div>
                                        <button 
                                          aria-label="Eliminar"
                                          title="Eliminar"
                                          onClick={() => {
                                            const next = arr.filter((_, i) => i !== idx);
                                            onPatchAttr(k, next);
                                          }}
                                          style={{ 
                                            width: 24, height: 24, 
                                            border: '1px solid #e5e7eb', 
                                            borderRadius: 4, 
                                            background: '#fff', 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center'
                                          }}
                                        >
                                          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2">
                                            <line x1="6" y1="6" x2="18" y2="18"/>
                                            <line x1="6" y1="18" x2="18" y2="6"/>
                                          </svg>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ marginTop: 8 }}>
                                    <button className="btn-secondary" onClick={() => {
                                      const empty = { type: 'object', value: { [keyA]: '', [keyB]: '' } };
                                      onPatchAttr(k, [...arr, empty]);
                                    }}>Añadir ítem</button>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div key={k} className="form-group">
                                <label>{k} (JSON)</label>
                                <textarea rows={2} value={JSON.stringify(arr)} onChange={(e) => { try { onPatchAttr(k, JSON.parse(e.target.value)); } catch {} }} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="properties-section">
              <button className="accordion-header" onClick={() => setLibraryOpen(!libraryOpen)}>
                <h4>Biblioteca</h4>
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`chevron ${libraryOpen ? 'open' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {libraryOpen && (
                <div className="accordion-content" style={{ display: 'grid', gap: 16, width: '100%' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={() => loadMediaOnce(true)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d=" M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                      </svg>
                      Refrescar
                    </button>
                    <button className="btn-primary" onClick={() => setShowUpload(true)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                      Subir archivo
                    </button>
                  </div>
                  
                  {galleryItems.length === 0 ? (
                    <div style={{ 
                      padding: '48px 24px', 
                      textAlign: 'center', 
                      background: '#f9fafb', 
                      borderRadius: 12,
                      border: '2px dashed #e5e7eb'
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ 
                        width: 48, 
                        height: 48, 
                        margin: '0 auto 16px',
                        color: '#9ca3af'
                      }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>No hay archivos en la biblioteca</p>
                      <p style={{ color: '#9ca3af', fontSize: 12, margin: '4px 0 0' }}>Sube tu primer archivo para comenzar</p>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                      gap: 16 
                    }}>
                      {galleryItems.map((it, idx) => {
                        const fullKey = it?.key || (it?.name ? it.name.replace(/^media:/, '') : it?.url || '');
                        const name = fullKey.split('/').pop() || fullKey;
                        const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fullKey);
                        const ext = name?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
                        const fileSize = it?.size ? `${(it.size / 1024).toFixed(1)} KB` : null;
                        
                        return (
                          <button 
                            key={idx} 
                            className="media-item"
                            onClick={() => { if (activeMediaAttr) onEditAttr(activeMediaAttr, getMediaUrl(it)); }}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e5e7eb',
                              borderRadius: 12,
                              padding: 0,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              overflow: 'hidden',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)';
                              e.currentTarget.style.borderColor = '#3b82f6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                          >
                            {/* Thumbnail */}
                            <div style={{ 
                              width: '100%', 
                              height: 140, 
                              background: '#f3f4f6',
                              position: 'relative',
                              overflow: 'hidden'
                            }}>
                              {isImage ? (
                                  <img 
                                  key={getMediaUrl(it)}
                                  src={getMediaUrl(it)}
                                  alt={name}
                                  loading="lazy"
                                  decoding="async"
                                  fetchPriority="low"
                                  srcSet={buildSrcSet(getMediaUrl(it), [320, 640, 960])}
                                  sizes="(max-width: 480px) 320px, (max-width: 768px) 640px, 960px"
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    transition: 'transform 0.3s ease'
                                  }}
                                />
                              ) : (
                                <div style={{ 
                                  width: '100%', 
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 8
                                }}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ 
                                    width: 40, 
                                    height: 40,
                                    color: '#9ca3af'
                                  }}>
                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                    <polyline points="13 2 13 9 20 9"/>
                                  </svg>
                                  {ext && (
                                    <span style={{ 
                                      fontSize: 11, 
                                      fontWeight: 600,
                                      background: '#e5e7eb', 
                                      color: '#374151', 
                                      borderRadius: 6, 
                                      padding: '4px 8px',
                                      textTransform: 'uppercase'
                                    }}>
                                      {ext}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* File Info */}
                            <div style={{ 
                              padding: 12,
                              textAlign: 'left'
                            }}>
                              <p style={{ 
                                fontSize: 13, 
                                fontWeight: 600,
                                color: '#111827',
                                margin: '0 0 4px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.4
                              }}>
                                {name.length > 20 ? name.substring(0, 20) + '...' : name}
                              </p>
                              
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 6,
                                flexWrap: 'wrap'
                              }}>
                                {ext && (
                                  <span style={{ 
                                    fontSize: 10, 
                                    fontWeight: 500,
                                    background: '#f3f4f6', 
                                    color: '#6b7280', 
                                    borderRadius: 4, 
                                    padding: '2px 6px',
                                    textTransform: 'uppercase'
                                  }}>
                                    {ext}
                                  </span>
                                )}
                                {fileSize && (
                                  <span style={{ 
                                    fontSize: 10, 
                                    color: '#9ca3af',
                                    fontWeight: 500
                                  }}>
                                    {fileSize}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
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
      {showGallery && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 800 }}>
            <h3>Biblioteca de medios</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, margin: '12px 0' }}>
              {galleryItems.map((it, idx) => {
                const fullKey = it?.key || (it?.name ? it.name.replace(/^media:/, '') : it?.url || '');
                const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fullKey);
                return (
                  <button key={idx} className="media-item" onClick={() => { if (activeMediaAttr) onEditAttr(activeMediaAttr, getMediaUrl(it)); setShowGallery(false); }}>
                    <div className="media-thumb">
                      {isImage ? (
                        <img src={getMediaUrl(it)}
                             key={getMediaUrl(it)}
                             alt={it.key || fullKey}
                             style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6 }} />
                      ) : (
                        <div style={{ width: '100%', height: 120, background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Archivo</div>
                      )}
                    </div>
                    <div className="media-label" style={{ fontSize: 12, marginTop: 6, overflowWrap: 'anywhere' }}>{it.key || fullKey}</div>
                  </button>
                );
              })}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowGallery(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {showUpload && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 520 }}>
            <h3>Subir archivo</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { if (!uploading) setShowUpload(false); }}>Cancelar</button>
              <button className="btn-primary" disabled={uploading || !uploadFile} onClick={onUploadSubmit}>{uploading ? 'Subiendo...' : 'Subir'}</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
