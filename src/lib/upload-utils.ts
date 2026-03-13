import imageCompression from "browser-image-compression";

// Route configuration matching server-side UploadThing routes
const UPLOAD_ROUTE_CONFIG = {
  imageUploader: {
    maxSizeMB: 25,
    maxCount: 10,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    typeLabel: "Only JPG, PNG, WebP, and GIF images are allowed",
  },
  photoID: {
    maxSizeMB: 25,
    maxCount: 1,
    acceptedTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    typeLabel: "Only JPG, PNG, WebP, GIF images, and PDF files are allowed",
  },
  documents: {
    maxSizeMB: 25,
    maxCount: 1,
    acceptedTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    typeLabel: "Only JPG, PNG, WebP, GIF images, and PDF files are allowed",
  },
  messageAttachment: {
    maxSizeMB: 8,
    maxCount: 3,
    acceptedTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    typeLabel: "Only JPG, PNG, WebP, GIF images, and PDF files are allowed",
  },
  unitDocument: {
    maxSizeMB: 25,
    maxCount: 5,
    acceptedTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    typeLabel: "Only JPG, PNG, WebP, GIF images, and PDF files are allowed",
  },
} as const;

export type UploadRoute = keyof typeof UPLOAD_ROUTE_CONFIG;

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)}MB`;
}

/**
 * Validates files against route config (type, count, and rejects absurdly large files >50MB).
 */
function validateFiles(
  files: File[],
  route: UploadRoute,
): { error?: string } {
  const config = UPLOAD_ROUTE_CONFIG[route];

  if (files.length > config.maxCount) {
    return {
      error: `Maximum ${config.maxCount} file${config.maxCount === 1 ? "" : "s"} allowed`,
    };
  }

  for (const file of files) {
    if (!config.acceptedTypes.includes(file.type as (typeof config.acceptedTypes)[number])) {
      return { error: config.typeLabel };
    }

    // Reject absurdly large files immediately (>50MB)
    if (file.size > 50 * 1024 * 1024) {
      return {
        error: `File "${file.name}" is ${formatFileSize(file.size)}. Files over 50MB cannot be uploaded.`,
      };
    }
  }

  return {};
}

/**
 * Compresses an image file if it's over 2MB. Skips PDFs and small images.
 * Falls back to original file on compression failure.
 */
async function compressImageFile(file: File): Promise<File> {
  if (!isImageFile(file) || file.size <= 2 * 1024 * 1024) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
    });
    return new File([compressed], file.name, { type: file.type });
  } catch {
    // Fall back to original file if compression fails
    return file;
  }
}

/**
 * Validates, compresses, and does post-compression size check.
 * Returns processed files and optional error message.
 */
export async function prepareFilesForUpload(
  files: File[],
  route: UploadRoute,
): Promise<{ files: File[]; error?: string }> {
  const validation = validateFiles(files, route);
  if (validation.error) {
    return { files: [], error: validation.error };
  }

  const config = UPLOAD_ROUTE_CONFIG[route];
  const maxBytes = config.maxSizeMB * 1024 * 1024;

  const compressed = await Promise.all(files.map(compressImageFile));

  // Post-compression size check
  for (const file of compressed) {
    if (file.size > maxBytes) {
      return {
        files: [],
        error: `File "${file.name}" is still ${formatFileSize(file.size)} after compression. Maximum is ${config.maxSizeMB}MB.`,
      };
    }
  }

  return { files: compressed };
}

/**
 * Parses UploadThing errors into user-friendly messages.
 */
export function formatUploadError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("unauthorized") || message.includes("unauthenticated")) {
      return "Please sign in to upload files";
    }
    if (message.includes("file size") || message.includes("too large") || message.includes("filesize")) {
      return "File is too large. Please try a smaller file.";
    }
    if (message.includes("file type") || message.includes("invalid file") || message.includes("filetype")) {
      return "Invalid file type. Please check the accepted formats.";
    }

    return `Upload failed: ${error.message}. Please try again.`;
  }

  return "Upload failed. Please try again.";
}
