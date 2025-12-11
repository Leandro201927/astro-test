import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");
  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const backendBase = (import.meta.env.LEAUTO_BACKEND_URL as string) || "http://localhost:4000";
  const clientWebsiteId = (import.meta.env.CLIENT_WEBSITE_ID as string) || (import.meta.env.LEAUTO_CLIENT_WEBSITE_ID as string);
  const r2PublicUrl = (import.meta.env.R2_PUBLIC_URL as string) || "";
  const key = url.searchParams.get("key");
  const directUrl = url.searchParams.get("url");
  const extra = new URLSearchParams(url.searchParams);
  extra.delete("url");
  const extraQuery = extra.toString();

  console.log('[media/file] Request:', { key, clientWebsiteId: !!clientWebsiteId, r2PublicUrl: !!r2PublicUrl, backendBase });

  let res: Response | null = null;

  // Strategy 1: Try direct R2 public URL if key provided and R2_PUBLIC_URL is configured
  // Skip if R2_PUBLIC_URL is the private .r2.cloudflarestorage.com domain
  if (key && r2PublicUrl && !r2PublicUrl.includes('.r2.cloudflarestorage.com')) {
    const publicUrl = `${r2PublicUrl}/${key}${extraQuery ? `?${extraQuery}` : ''}`;
    console.log('[media/file] Trying public URL:', publicUrl);
    res = await fetch(publicUrl, { method: "GET" }).catch(() => null);
    if (res && res.ok) {
      const headers = new Headers(res.headers);
      headers.set("Cache-Control", "public, max-age=31536000");
      headers.set("Cross-Origin-Resource-Policy", "cross-origin");
      const blob = await res.blob();
      return new Response(blob, { status: 200, headers });
    }
  }

  // Strategy 2: Try backend proxy if key provided
  if (key && clientWebsiteId) {
    const target = `${backendBase}/api/cloudflare/r2/file/${encodeURIComponent(clientWebsiteId)}?key=${encodeURIComponent(key)}${extraQuery ? `&${extraQuery}` : ''}`;
    console.log('[media/file] Trying backend proxy:', target);
    res = await fetch(target, { method: "GET" }).catch(() => null);
    if (res) {
      console.log('[media/file] Backend response:', res.status, res.statusText);
    }
  }

  // Strategy 3: Try direct URL if provided
  if ((!res || !res.ok) && directUrl) {
    const du = `${directUrl}${extraQuery ? (directUrl.includes('?') ? '&' : '?') + extraQuery : ''}`;
    console.log('[media/file] Trying direct URL:', du);
    res = await fetch(du, { method: "GET" }).catch(() => null);
  }

  // No successful response
  if (!res || !res.ok) {
    console.log('[media/file] All strategies failed. Final status:', res?.status);
    return new Response(JSON.stringify({ error: "Failed to fetch media file" }), { 
      status: res?.status || 404, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  const headers = new Headers(res.headers);
  headers.set("Cache-Control", headers.get("Cache-Control") || "public, max-age=600");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  
  const blob = await res.blob();
  return new Response(blob, { status: 200, headers });
};
