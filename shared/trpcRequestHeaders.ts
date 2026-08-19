import { COOKIE_NAME } from "./const";

/** Build explicit API headers for tRPC calls, including the preview-session fallback. */
export function buildTrpcRequestHeaders(rawSessionCookie: string | null | undefined): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (!rawSessionCookie) return headers;

  const prefix = `${COOKIE_NAME}=`;
  const pair = rawSessionCookie.split(";").find((value) => value.trim().startsWith(prefix));
  const token = pair?.trim().slice(prefix.length);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
