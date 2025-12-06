import type { APIRoute } from "astro";
import { kvHelper } from "@/lib/kvHelper";

export const prerender = false;

export const GET: APIRoute = async ({ locals, cookies }) => {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");
  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const r2PublicUrl = (import.meta.env.R2_PUBLIC_URL as string) || "";
  // Only use R2_PUBLIC_URL if it's a true public domain (not the private .r2.cloudflarestorage.com)
  const usePublicUrl = r2PublicUrl && !r2PublicUrl.includes('.r2.cloudflarestorage.com');
  
  const list = await kvHelper.list(locals as any, { prefix: "media:" });
  const items: any[] = [];
  for (const k of list.keys || []) {
    const kvKey = k.name; // This has the format "media:actual-file-key"
    const actualKey = kvKey.replace(/^media:/, ''); // Extract the actual key
    const value = await kvHelper.get<any>(locals as any, kvKey, { type: 'json' });
    
    let item: any;
    if (value && typeof value === 'object') {
      // Use stored metadata if it exists
      item = { ...value };
      if (!item.key) item.key = actualKey;
    } else {
      // Create minimal item structure if no metadata found
      item = { key: actualKey };
    }
    
    // Construct URL - only use public URL if it's truly public, otherwise use API proxy
    if (usePublicUrl) {
      item.url = `${r2PublicUrl}/${actualKey}`;
    } else {
      // Use API proxy for authenticated access
      item.url = `/api/admin/media/file?key=${encodeURIComponent(actualKey)}`;
    }
    
    items.push(item);
  }
  return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { "Content-Type": "application/json" } });
};
