/**
 * Hybrid Cloudflare KV Access Helper
 * 
 * This module provides a unified interface for accessing Cloudflare KV storage
 * that works in both development and production environments:
 * 
 * - Production (Cloudflare Pages/Workers): Uses Workers Bindings (fast & secure)
 * - Development (local): Falls back to REST API (requires credentials in .env)
 */

interface KVGetOptions {
  type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
}

interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

interface KVListResult {
  keys: Array<{ name: string; expiration?: number; metadata?: unknown }>;
  list_complete: boolean;
  cursor?: string;
}

/**
 * Gets the KV namespace ID from wrangler.jsonc or environment
 */
function getKVNamespaceId(): string {
  // Try to get from environment first
  const envNamespaceId = import.meta.env.CLOUDFLARE_KV_NAMESPACE_ID;
  if (envNamespaceId) {
    return envNamespaceId;
  }

  // If not in env, this will be used in development mode
  // The backend export writes this to .env automatically
  throw new Error('CLOUDFLARE_KV_NAMESPACE_ID not found in environment variables');
}

/**
 * Checks if Workers Binding is available and functional (production mode)
 * 
 * In development mode, platformProxy provides a KV_ASTRO binding but it doesn't work
 * properly. We need to check if we're actually in production/preview mode.
 */
function hasWorkerBinding(locals: App.Locals): boolean {
  // Check if binding exists
  if (!locals?.runtime?.env?.KV_ASTRO) {
    return false;
  }
  
  // In development mode (astro dev), the platformProxy provides a mock binding
  // that doesn't actually work. We can detect this by checking if we're in
  // Cloudflare's production environment or wrangler dev (preview mode).
  // 
  // If import.meta.env.DEV is true, we're in Astro dev mode, not production.
  // Force REST API fallback in this case.
  if (import.meta.env.DEV) {
    console.log('[kvHelper] Dev mode detected, forcing REST API fallback');
    return false;
  }
  
  return true;
}


/**
 * Gets a value from KV using REST API (development fallback)
 */
async function getViaRestAPI(
  key: string,
  options?: KVGetOptions
): Promise<any> {
  const accountId = import.meta.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = import.meta.env.CLOUDFLARE_API_TOKEN;
  const namespaceId = getKVNamespaceId();

  if (!accountId || !apiToken || !namespaceId) {
    throw new Error(
      'Missing Cloudflare credentials. Ensure CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_KV_NAMESPACE_ID are set in .env'
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;

  console.log('[kvHelper] Fetching from REST API:', { key, namespace: namespaceId });

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`KV REST API error ${response.status}: ${errorText}`);
  }

  const type = options?.type || 'json';
  
  switch (type) {
    case 'json':
      return await response.json();
    case 'arrayBuffer':
      return await response.arrayBuffer();
    case 'stream':
      return response.body;
    case 'text':
    default:
      return await response.text();
  }
}

/**
 * Puts a value to KV using REST API (development fallback)
 */
async function putViaRestAPI(
  key: string,
  value: string | ArrayBuffer | ReadableStream
): Promise<void> {
  const accountId = import.meta.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = import.meta.env.CLOUDFLARE_API_TOKEN;
  const namespaceId = getKVNamespaceId();

  if (!accountId || !apiToken || !namespaceId) {
    throw new Error(
      'Missing Cloudflare credentials. Ensure CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_KV_NAMESPACE_ID are set in .env'
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;

  console.log('[kvHelper] Putting to REST API:', { key, namespace: namespaceId });

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': typeof value === 'string' ? 'application/json' : 'application/octet-stream',
    },
    body: value,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`KV REST API error ${response.status}: ${errorText}`);
  }
}

/**
 * Lists keys in KV using REST API (development fallback)
 */
async function listViaRestAPI(options?: KVListOptions): Promise<KVListResult> {
  const accountId = import.meta.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = import.meta.env.CLOUDFLARE_API_TOKEN;
  const namespaceId = getKVNamespaceId();

  if (!accountId || !apiToken || !namespaceId) {
    throw new Error(
      'Missing Cloudflare credentials. Ensure CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_KV_NAMESPACE_ID are set in .env'
    );
  }

  const params = new URLSearchParams();
  if (options?.prefix) params.append('prefix', options.prefix);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.cursor) params.append('cursor', options.cursor);

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys?${params}`;

  console.log('[kvHelper] Listing from REST API:', { namespace: namespaceId, options });

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`KV REST API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  console.log('[kvHelper] List result:', data.result);
  
  // REST API returns the array directly in data.result
  // Workers Binding returns { keys: [...], list_complete: boolean }
  // We need to normalize the format
  return {
    keys: data.result || [],
    list_complete: true,
  };
}

/**
 * Hybrid KV Helper
 * Automatically uses Workers Bindings in production or REST API in development
 */
export const kvHelper = {
  /**
   * Get a value from KV
   */
  async get<T = any>(
    locals: App.Locals,
    key: string,
    options?: KVGetOptions
  ): Promise<T | null> {
    if (hasWorkerBinding(locals)) {
      // Production: Use Workers Binding
      console.log('[kvHelper] Using Workers Binding:', { key });
      const kv = locals.runtime.env.KV_ASTRO as KVNamespace;
      const type = options?.type || 'json';
      return await kv.get(key, type as any) as T | null;
    } else {
      // Development: Use REST API fallback
      return await getViaRestAPI(key, options) as T | null;
    }
  },

  /**
   * Put a value to KV
   */
  async put(
    locals: App.Locals,
    key: string,
    value: string | ArrayBuffer | ReadableStream
  ): Promise<void> {
    if (hasWorkerBinding(locals)) {
      // Production: Use Workers Binding
      console.log('[kvHelper] Using Workers Binding for PUT:', { key });
      const kv = locals.runtime.env.KV_ASTRO as KVNamespace;
      await kv.put(key, value as any);
    } else {
      // Development: Use REST API fallback
      await putViaRestAPI(key, value);
    }
  },

  /**
   * List keys in KV
   */
  async list(
    locals: App.Locals,
    options?: KVListOptions
  ): Promise<KVListResult> {
    if (hasWorkerBinding(locals)) {
      // Production: Use Workers Binding
      console.log('[kvHelper] Using Workers Binding for LIST:', { options });
      const kv = locals.runtime.env.KV_ASTRO as KVNamespace;
      return await kv.list(options as any);
    } else {
      // Development: Use REST API fallback
      return await listViaRestAPI(options);
    }
  },
};
