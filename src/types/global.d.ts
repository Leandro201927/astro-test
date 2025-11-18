declare global {
  interface ImportMetaEnv {
    readonly KV_NAMESPACE_ID: string;
    readonly CLOUDFLARE_API_TOKEN: string;
    readonly CLOUDFLARE_ACCOUNT_ID: string;
    readonly CF_ACCESS_TEAM_DOMAIN: string;
    readonly CF_ACCESS_POLICY_AUD: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
export {};