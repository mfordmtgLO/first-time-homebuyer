export type CaptureDevice = "mobile" | "desktop";

/**
 * Analytics-only browser surface classification captured at submission time.
 * This is intentionally not used for authentication, eligibility, underwriting,
 * or consent decisions. Desktop is the safe fallback for SSR and legacy callers.
 */
export function getCaptureDevice(): CaptureDevice {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

export function captureDeviceLabel(value: CaptureDevice | null | undefined): string {
  return value === "mobile" ? "Mobile Browser" : "Desktop Browser";
}
