export function richEmailTemplateToText(value: string) {
  const linked = value.replace(/<a\b[^>]*href=["'](https?:\/\/[^"']+|mailto:[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, label) => `${label.replace(/<[^>]+>/g, "")} (${href})`);
  return linked
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
