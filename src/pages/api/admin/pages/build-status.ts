import type { APIRoute } from "astro";
import { getLatestBuildStatus } from "@/lib/cloudflarePages";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");
  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const status = await getLatestBuildStatus();
  return new Response(JSON.stringify(status), { status: 200, headers: { "Content-Type": "application/json" } });
};