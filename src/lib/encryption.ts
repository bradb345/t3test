/**
 * Encryption utilities for sensitive data (SSN, etc.)
 * Uses AES-256-GCM for authenticated encryption
 * 
 * Requirements:
 * - Set ENCRYPTION_KEY environment variable with a 32-byte (64 hex chars) key
 * - Generate key with: openssl rand -hex 32
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment variable
 * In production, this should be retrieved from a KMS (AWS KMS, Google Cloud KMS, etc.)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
      "Generate one with: openssl rand -hex 32"
    );
  }

  // Convert hex string to buffer
  const keyBuffer = Buffer.from(key, "hex");
  
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes). ` +
      `Current length: ${keyBuffer.length} bytes`
    );
  }
  
  return keyBuffer;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns base64-encoded string in format: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return "";
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let ciphertext = cipher.update(plaintext, "utf8", "base64");
    ciphertext += cipher.final("base64");
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv, authTag, and ciphertext
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt data that was encrypted with encrypt()
 * Expects base64-encoded string in format: iv:authTag:ciphertext
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return "";
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(":");
    
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }
    
    const iv = Buffer.from(parts[0]!, "base64");
    const authTag = Buffer.from(parts[1]!, "base64");
    const ciphertext = parts[2]!;
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(ciphertext, "base64", "utf8");
    plaintext += decipher.final("utf8");
    
    return plaintext;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Mask SSN to show only last 4 digits
 * Example: "123-45-6789" -> "***-**-6789"
 */
export function maskSSN(ssn: string): string {
  if (!ssn || ssn.length < 4) {
    return "***-**-****";
  }
  
  const last4 = ssn.slice(-4);
  return `***-**-${last4}`;
}

/**
 * Encrypt SSN for storage
 */
export function encryptSSN(ssn: string): string {
  // Remove any formatting (dashes, spaces) before encryption
  const cleanSSN = ssn.replace(/[^0-9]/g, "");
  return encrypt(cleanSSN);
}

/**
 * Decrypt SSN from storage
 */
export function decryptSSN(encryptedSSN: string): string {
  return decrypt(encryptedSSN);
}

/**
 * Get masked version of encrypted SSN without fully decrypting
 * This is useful when you need to display partial SSN without exposing full value
 */
export function getMaskedSSN(encryptedSSN: string): string {
  if (!encryptedSSN) {
    return "***-**-****";
  }
  
  try {
    const decrypted = decryptSSN(encryptedSSN);
    return maskSSN(decrypted);
  } catch {
    return "***-**-****";
  }
}
