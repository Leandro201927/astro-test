import type { APIRoute } from "astro";

export const prerender = false;

function kebabCase(name: string) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");
  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const backendBase = (import.meta.env.LEAUTO_BACKEND_URL as string) || "http://localhost:4000";
  const clientWebsiteId = (import.meta.env.CLIENT_WEBSITE_ID as string) || (import.meta.env.LEAUTO_CLIENT_WEBSITE_ID as string);
  if (!clientWebsiteId) {
    return new Response(JSON.stringify({ error: "Missing CLIENT_WEBSITE_ID env" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  let file: File | null = null;
  let key: string | null = null;
  try {
    const form = await request.formData();
    file = (form.get("file") as File) || null;
    key = (form.get("key") as string) || null;
  } catch {}

  if (!file) {
    return new Response(JSON.stringify({ error: "Missing file" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const name = (file as any)?.name || "archivo";
  const safeName = kebabCase(name);
  const finalKey = key || `uploads/${Date.now()}-${safeName}`;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("key", finalKey);

  const url = `${backendBase}/api/cloudflare/r2/upload/${encodeURIComponent(clientWebsiteId)}`;
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return new Response(JSON.stringify({ error: text || `Upload failed ${res.status}` }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
};

