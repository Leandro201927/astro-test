type BuildTriggerResult = { ok: boolean; deploymentId?: string; url?: string; reason?: string };
type BuildStatus = { ok: boolean; status: string; url?: string; id?: string };

async function cfFetch(path: string, init: RequestInit = {}) {
  const accountId = import.meta.env.CLOUDFLARE_ACCOUNT_ID as string;
  const token = import.meta.env.CLOUDFLARE_API_TOKEN as string;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`;
  const res = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  return res;
}

export async function triggerPagesBuild(): Promise<BuildTriggerResult> {
  const hook = import.meta.env.CLOUDFLARE_PAGES_BUILD_HOOK_URL as string | undefined;
  if (hook && hook.length > 0) {
    const res = await fetch(hook, { method: "POST" });
    if (!res.ok) return { ok: false, reason: "hook_failed" };
    try {
      const data = await res.json();
      return { ok: true, deploymentId: data?.id, url: data?.url };
    } catch {
      return { ok: true };
    }
  }
  const project = import.meta.env.CLOUDFLARE_PAGES_PROJECT as string;
  if (!project) return { ok: false, reason: "not_configured" };
  const res = await cfFetch(`/pages/projects/${project}/deployments`, { method: "POST", body: JSON.stringify({}) });
  if (!res.ok) return { ok: false, reason: "api_failed" };
  try {
    const data = await res.json();
    const dep = data?.result;
    return { ok: true, deploymentId: dep?.id, url: dep?.url };
  } catch {
    return { ok: true };
  }
}

export async function getLatestBuildStatus(): Promise<BuildStatus> {
  const project = import.meta.env.CLOUDFLARE_PAGES_PROJECT as string;
  if (!project) return { ok: false, status: "NOT_CONFIGURED" };
  const res = await cfFetch(`/pages/projects/${project}/deployments`, { method: "GET" });
  if (!res.ok) return { ok: false, status: "UNKNOWN" };
  const data = await res.json();
  const items = data?.result || [];
  const latest = items[0] || null;
  if (!latest) return { ok: true, status: "UNKNOWN" };
  const stages = latest?.stages || latest?.latest_stage || {};
  const status = stages?.status || latest?.status || "unknown";
  return { ok: true, status: String(status).toUpperCase(), url: latest?.url, id: latest?.id };
}