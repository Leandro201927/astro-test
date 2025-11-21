import type { APIRoute } from "astro";
import type { Page } from "@/types/clientWebsite";
import { putPages } from "@/lib/kvPages";
import { triggerPagesBuild } from "@/lib/cloudflarePages";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");
  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  let payload: any = null;
  try {
    payload = await request.json();
  } catch {}
  const pages: Page[] = Array.isArray(payload?.pages) ? payload.pages : [];
  if (!pages.length) {
    return new Response(JSON.stringify({ error: "No pages" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  await putPages(locals as App.Locals, pages);
  const build = await triggerPagesBuild();
  return new Response(JSON.stringify({ ok: true, build }), { status: 200, headers: { "Content-Type": "application/json" } });
};