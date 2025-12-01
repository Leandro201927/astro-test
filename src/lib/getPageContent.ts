import type { Page } from "../types/clientWebsite";
import { kvHelper } from "./kvHelper";

// Este código se ejecuta en build time (SSG) o runtime (SSR)
export async function getPageContent({ locals, params }: { locals: App.Locals; params: { path: string } }): Promise<Page> {
  const value = await kvHelper.get<Page>(locals, `page:${params.path}`);
  return value as Page;
}