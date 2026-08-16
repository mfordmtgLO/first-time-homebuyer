export type CampaignAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPath?: string;
  referrerHost?: string;
};

export type FunnelConversionEvent =
  | "roadmap_request_submit"
  | "chat_intake_complete"
  | "buyer_agent_connection_request"
  | "homes_list_request";

const STORAGE_KEY = "fthb-campaign-attribution-v1";
const MAX_VALUE_LENGTH = 160;

function sanitize(value: string | null, limit = MAX_VALUE_LENGTH) {
  const normalized = value?.trim().replace(/[\u0000-\u001f]/g, "") ?? "";
  return normalized ? normalized.slice(0, limit) : undefined;
}

function currentAttribution(): CampaignAttribution {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  let referrerHost: string | undefined;
  try {
    referrerHost = document.referrer ? sanitize(new URL(document.referrer).hostname, 320) : undefined;
  } catch {
    referrerHost = undefined;
  }
  return {
    utmSource: sanitize(params.get("utm_source"), 120),
    utmMedium: sanitize(params.get("utm_medium"), 120),
    utmCampaign: sanitize(params.get("utm_campaign")),
    utmContent: sanitize(params.get("utm_content")),
    utmTerm: sanitize(params.get("utm_term")),
    landingPath: sanitize(window.location.pathname, 500),
    referrerHost,
  };
}

export function getCampaignAttribution(): CampaignAttribution {
  if (typeof window === "undefined") return {};
  const current = currentAttribution();
  const hasCampaign = Boolean(current.utmSource || current.utmMedium || current.utmCampaign || current.utmContent || current.utmTerm);
  if (hasCampaign) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Attribution gracefully falls back to the current URL when storage is unavailable.
    }
    return current;
  }
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as CampaignAttribution;
  } catch {
    // A malformed or unavailable session record should never block lead capture.
  }
  return current;
}

/**
 * Dispatches a no-PII browser event for a future, compliance-approved tag setup.
 * No third-party ad pixel or network request is installed by this helper.
 */
export function emitFunnelConversion(event: FunnelConversionEvent, attribution = getCampaignAttribution()) {
  if (typeof window === "undefined") return;
  const detail = { event, attribution };
  window.dispatchEvent(new CustomEvent("fthb:conversion", { detail }));
  const dataLayer = (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push({
      event,
      campaign_source: attribution.utmSource,
      campaign_medium: attribution.utmMedium,
      campaign_name: attribution.utmCampaign,
      campaign_content: attribution.utmContent,
      campaign_term: attribution.utmTerm,
    });
  }
}
