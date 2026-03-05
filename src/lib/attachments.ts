const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const ALLOWED_URL_PATTERNS = [
  /^https:\/\/[\w-]+\.ufs\.sh\//,
  /^https:\/\/[\w-]+\.uploadthing\.com\//,
  /^https:\/\/utfs\.io\//,
];

interface AttachmentInput {
  name: string;
  url: string;
  type: string;
  size: number;
}

export function validateAttachments(attachments: AttachmentInput[]): string | null {
  if (attachments.length > MAX_ATTACHMENTS) {
    return `Maximum ${MAX_ATTACHMENTS} attachments allowed`;
  }

  for (const attachment of attachments) {
    if (!ALLOWED_TYPES.includes(attachment.type)) {
      return `File type "${attachment.type}" is not allowed`;
    }

    if (attachment.size > MAX_ATTACHMENT_SIZE) {
      return "Attachments must be under 8MB";
    }

    const isAllowedUrl = ALLOWED_URL_PATTERNS.some((pattern) => pattern.test(attachment.url));
    if (!isAllowedUrl) {
      return "Invalid attachment URL";
    }
  }

  return null;
}

export function safeParseAttachments(json: string | null): AttachmentInput[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (Array.isArray(parsed)) return parsed as AttachmentInput[];
    return null;
  } catch {
    return null;
  }
}
