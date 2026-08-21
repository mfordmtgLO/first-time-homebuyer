export type PlatformLeadWebhookConfig = {
  meta: {
    verifyToken: string;
    appSecret: string;
    pageAccessToken: string;
    enabled: boolean;
  };
  google: {
    webhookKey: string;
    enabled: boolean;
  };
};

type Environment = Record<string, string | undefined>;

/** Server-only configuration; none of these values are exposed to client code. */
export function getPlatformLeadWebhookConfig(env: Environment = process.env): PlatformLeadWebhookConfig {
  const meta = {
    verifyToken: env.META_LEAD_WEBHOOK_VERIFY_TOKEN?.trim() ?? "",
    appSecret: env.META_APP_SECRET?.trim() ?? "",
    pageAccessToken: env.META_PAGE_ACCESS_TOKEN?.trim() ?? "",
    enabled: false,
  };
  meta.enabled = Boolean(meta.verifyToken && meta.appSecret && meta.pageAccessToken);
  const google = {
    webhookKey: env.GOOGLE_LEAD_WEBHOOK_KEY?.trim() ?? "",
    enabled: false,
  };
  google.enabled = Boolean(google.webhookKey);
  return { meta, google };
}
