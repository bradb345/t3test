import { UTApi } from "uploadthing/server";

// Initialize the UploadThing API
export const utapi = new UTApi();

/**
 * Extract file key from UploadThing URL
 * URLs can be in formats like:
 * - https://utfs.io/f/{fileKey}
 * - https://{appId}.ufs.sh/f/{fileKey}
 * - https://uploadthing.com/f/{fileKey}
 */
export function extractFileKey(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // The file key is typically the last part after /f/
    const fIndex = pathParts.indexOf('f');
    if (fIndex !== -1 && fIndex < pathParts.length - 1) {
      return pathParts[fIndex + 1] ?? null;
    }
    // Fallback: return the last part of the path
    return pathParts[pathParts.length - 1] ?? null;
  } catch {
    // If URL parsing fails, try simple split
    return url.split('/').pop() ?? null;
  }
}

/**
 * Extract file keys from an array of URLs
 */
export function extractFileKeys(urls: string[]): string[] {
  return urls
    .map(url => extractFileKey(url))
    .filter((key): key is string => key !== null && key.length > 0);
}

/**
 * Delete files from UploadThing given an array of URLs
 */
export async function deleteFilesFromUploadThing(urls: string[], context: string): Promise<void> {
  const fileKeys = extractFileKeys(urls);
  
  if (fileKeys.length > 0) {
    console.log(`Deleting ${fileKeys.length} files from UploadThing (${context}):`, fileKeys);
    await utapi.deleteFiles(fileKeys);
    console.log(`Successfully deleted files from UploadThing (${context})`);
  }
}
