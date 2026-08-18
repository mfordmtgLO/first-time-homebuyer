/** Removes an entered U.S. country code and retains the local ten-digit number. */
export function getUsLocalRoadmapPhoneDigits(value: string | null | undefined) {
  const rawDigits = (value ?? "").replace(/\D/g, "");
  return (rawDigits.startsWith("1") ? rawDigits.slice(1) : rawDigits).slice(0, 10);
}

/** Formats up to ten local digits as a U.S. phone number while a visitor types. */
export function formatUsRoadmapPhone(value: string) {
  const digits = getUsLocalRoadmapPhoneDigits(value);
  if (digits.length <= 3) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Valid Roadmap phone values exclude common test placeholders and repeated digits. */
export function hasUsableRoadmapPhone(phone: string | null | undefined) {
  const digits = getUsLocalRoadmapPhoneDigits(phone);
  return /^\d{10}$/.test(digits) && digits !== "5555555555" && !/^(\d)\1{9}$/.test(digits);
}
