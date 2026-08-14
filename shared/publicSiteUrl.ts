/** Canonical public address used for shareable LO, co-branded, and lead-resource links. */
export const PUBLIC_SITE_ORIGIN = "https://firsttimehomebuyer.manus.space";

export function publicSiteUrl(pathname = "/") {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${PUBLIC_SITE_ORIGIN}${normalizedPath}`;
}
