import type { Page } from "@/types/clientWebsite";

export async function listPages(locals: App.Locals): Promise<string[]> {
  const { KV_ASTRO } = locals.runtime.env as any;
  const res = await (KV_ASTRO as KVNamespace).list({ prefix: "page:" });
  return (res.keys || []).map((k: any) => String(k.name).replace(/^page:/, ""));
}

export async function getPageByPath(locals: App.Locals, path: string): Promise<Page | null> {
  const { KV_ASTRO } = locals.runtime.env as any;
  const value = await (KV_ASTRO as KVNamespace).get(`page:${path}`, "json");
  return (value || null) as Page | null;
}

export async function putPage(locals: App.Locals, page: Page): Promise<void> {
  const { KV_ASTRO } = locals.runtime.env as any;
  const key = `page:${page.slug === "/" ? "index" : String(page.slug).replace(/^\//, "")}`;
  await (KV_ASTRO as KVNamespace).put(key, JSON.stringify(page));
}

export async function putPages(locals: App.Locals, pages: Page[]): Promise<void> {
  for (const p of pages) {
    await putPage(locals, p);
  }
}