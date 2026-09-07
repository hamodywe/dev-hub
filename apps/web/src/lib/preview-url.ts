/** Seed placeholders describe no real preview and must never become a public CTA. */
export function previewUrl(value: string | null | undefined): string {
  const url = value?.trim();
  if (!url) return "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return "";
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
    if (/^(?:.+\.)?example\.(?:com|net|org)$/.test(hostname)) return "";
    if (hostname === "localhost" || hostname === "127.0.0.1" || /\.(?:test|invalid|localhost)$/.test(hostname)) return "";
    return url;
  } catch {
    return "";
  }
}
