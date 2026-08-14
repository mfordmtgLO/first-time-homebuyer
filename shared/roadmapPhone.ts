/** Formats up to ten digits as a U.S. phone number while a visitor types. */
export function formatUsRoadmapPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Valid Roadmap phone values exclude common test placeholders and repeated digits. */
export function hasUsableRoadmapPhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return /^\d{10}$/.test(digits) && digits !== "5555555555" && !/^(\d)\1{9}$/.test(digits);
}
