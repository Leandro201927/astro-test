import type { Page } from "@/types/clientWebsite";
import { kvHelper } from "@/lib/kvHelper";

export async function listPages(locals: App.Locals): Promise<string[]> {
  const res = await kvHelper.list(locals, { prefix: "page:" });
  return (res.keys || []).map((k: any) => String(k.name).replace(/^page:/, ""));
}

export async function getPageByPath(locals: App.Locals, path: string): Promise<Page | null> {
  const value = await kvHelper.get<Page>(locals, `page:${path}`);
  return value || null;
}

export async function putPage(locals: App.Locals, page: Page): Promise<void> {
  const key = `page:${page.slug === "/" ? "index" : String(page.slug).replace(/^\//, "")}`;
  await kvHelper.put(locals, key, JSON.stringify(page));
}

export async function putPages(locals: App.Locals, pages: Page[]): Promise<void> {
  for (const p of pages) {
    await putPage(locals, p);
  }
}