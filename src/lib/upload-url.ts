const ALLOWED_UPLOAD_HOSTNAMES = [
  "utfs.io",
  "uploadthing.com",
] as const;

const ALLOWED_UPLOAD_HOSTNAME_SUFFIXES = [
  ".ufs.sh",
  ".uploadthing.com",
] as const;

/**
 * Check if a URL is a safe UploadThing URL (HTTPS from a known host)
 */
export function isSafeUploadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname;
    return (
      (ALLOWED_UPLOAD_HOSTNAMES as readonly string[]).includes(hostname) ||
      ALLOWED_UPLOAD_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
    );
  } catch {
    return false;
  }
}
