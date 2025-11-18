import type { Page } from "../types/clientWebsite";

// Este código se ejecuta SOLO en build time
export async function getPageContent({ locals, params }: { locals: App.Locals; params: { path: string } }): Promise<Page> {
  const { KV_ASTRO } = locals.runtime.env;
  const value = await (KV_ASTRO as KVNamespace).get(`page:${params.path}`, 'json');
  return value as Page;
}