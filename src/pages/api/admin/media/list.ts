import type { APIRoute } from "astro";
import { kvHelper } from "@/lib/kvHelper";
import { getAllMedia } from "@/lib/media";

export const prerender = false;

export const GET: APIRoute = async ({ locals, cookies }) => {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");
  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const items = await getAllMedia(locals);
  return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { "Content-Type": "application/json" } });
};
