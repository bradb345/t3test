# Encryption Guide for Sensitive Data

This document explains how sensitive data (SSN, etc.) is encrypted and stored in the application.

## Overview

The application uses **AES-256-GCM** (Galois/Counter Mode) for encrypting sensitive personally identifiable information (PII) such as Social Security Numbers. This provides:

- **Confidentiality**: Data is encrypted and cannot be read without the key
- **Integrity**: Authenticated encryption ensures data hasn't been tampered with
- **Security**: Industry-standard 256-bit AES encryption

## Architecture

### Encryption Method
- **Algorithm**: AES-256-GCM
- **Key Length**: 256 bits (32 bytes)
- **IV Length**: 128 bits (16 bytes, randomly generated per encryption)
- **Auth Tag Length**: 128 bits (16 bytes)

### Storage Format
Encrypted data is stored in TEXT fields in the following format:
```
base64(iv):base64(authTag):base64(ciphertext)
```

### Database Schema
The `tenant_profile` table stores SSN data in two fields:
- `ssn_encrypted` (TEXT): Full encrypted SSN
- `ssn_last4` (VARCHAR(4)): Last 4 digits only, for display purposes

## Setup

### 1. Generate Encryption Key

Generate a secure 256-bit encryption key:

```bash
openssl rand -hex 32
```

This will output a 64-character hexadecimal string.

### 2. Configure Environment Variable

Add the encryption key to your `.env` file:

```env
ENCRYPTION_KEY=your-64-character-hex-key-here
```

**IMPORTANT**: 
- Never commit the `.env` file to version control
- Use different keys for development, staging, and production
- In production, use a Key Management Service (KMS)

### 3. Production Key Management

For production environments, use a Key Management Service:

#### AWS KMS
```typescript
import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";

async function getEncryptionKey() {
  const client = new KMSClient({ region: "us-east-1" });
  const command = new DecryptCommand({
    CiphertextBlob: Buffer.from(process.env.ENCRYPTED_KEY!, "base64"),
  });
  const response = await client.send(command);
  return response.Plaintext;
}
```

#### Google Cloud KMS
```typescript
import { KeyManagementServiceClient } from "@google-cloud/kms";

async function getEncryptionKey() {
  const client = new KeyManagementServiceClient();
  const [result] = await client.decrypt({
    name: process.env.KMS_KEY_NAME,
    ciphertext: Buffer.from(process.env.ENCRYPTED_KEY!, "base64"),
  });
  return result.plaintext;
}
```

## Usage

### Encrypting SSN

```typescript
import { encryptSSN } from "~/lib/encryption";

// User input (may include dashes or spaces)
const userSSN = "123-45-6789";

// Encrypt for storage
const encryptedSSN = encryptSSN(userSSN); // Returns: "base64iv:base64tag:base64cipher"
```

### Decrypting SSN

```typescript
import { decryptSSN } from "~/lib/encryption";

// Encrypted value from database
const encryptedSSN = "..."; // from database

// Decrypt when needed (e.g., for verification)
const plainSSN = decryptSSN(encryptedSSN); // Returns: "123456789"
```

### Displaying Masked SSN

```typescript
import { getMaskedSSN } from "~/lib/encryption";

// Get masked version for display
const masked = getMaskedSSN(encryptedSSN); // Returns: "***-**-6789"
```

### Storing in Database

When saving tenant profile data:

```typescript
import { encryptSSN } from "~/lib/encryption";
import { db } from "~/server/db";
import { tenantProfiles } from "~/server/db/schema";

// Encrypt SSN before storage
const ssn = "123-45-6789";
const ssnEncrypted = encryptSSN(ssn);
const ssnLast4 = ssn.slice(-4); // "6789"

await db.insert(tenantProfiles).values({
  userId: userId,
  ssnEncrypted: ssnEncrypted,
  ssnLast4: ssnLast4,
  // ... other fields
});
```

### Reading from Database

When retrieving tenant profile data:

```typescript
import { decryptSSN, getMaskedSSN } from "~/lib/encryption";

// Get profile from database
const profile = await db.select().from(tenantProfiles).where(...);

// Option 1: Get masked version for UI display
const maskedSSN = getMaskedSSN(profile.ssnEncrypted);
// Returns: "***-**-6789"

// Option 2: Decrypt full value (only when absolutely necessary)
const fullSSN = decryptSSN(profile.ssnEncrypted);
// Returns: "123456789"
```

## Security Best Practices

### 1. Minimize Decryption
- Only decrypt SSN when absolutely necessary (e.g., for verification, legal requirements)
- Use masked version (`ssnLast4` or `getMaskedSSN()`) for display
- Never log decrypted SSN values

### 2. Access Control
- Restrict database access to encrypted fields
- Implement role-based access control for SSN decryption
- Audit all access to decrypted SSN data

### 3. Key Rotation
Periodically rotate encryption keys:

```typescript
// 1. Generate new key
const newKey = crypto.randomBytes(32).toString("hex");

// 2. Re-encrypt all existing data with new key
// (This requires a maintenance script)

// 3. Update environment variable
```

### 4. Backup Security
- Ensure database backups are encrypted at rest
- Store backup encryption keys separately from primary keys
- Test backup restoration in a secure environment

### 5. Compliance
- GDPR: Encryption helps protect PII
- PCI DSS: While SSN isn't a payment card, similar security standards apply
- State Laws: Many states require encryption of SSN data

## API Integration

The onboarding API automatically handles SSN encryption:

```typescript
// In /api/onboarding route
import { encryptSSN } from "~/lib/encryption";

// Extract SSN from request
const { ssn } = body.stepData.personal;

// Encrypt before storing
const encryptedSSN = encryptSSN(ssn);
const last4 = ssn.slice(-4);

// Store encrypted data
await db.insert(tenantProfiles).values({
  ssnEncrypted: encryptedSSN,
  ssnLast4: last4,
  // ...
});
```

## Migration Guide

### For New Installations
1. Generate encryption key: `openssl rand -hex 32`
2. Add to `.env` file
3. Run migrations: `npm run db:migrate`

### For Existing Data
If you have existing plaintext SSN data:

1. Create a migration script to:
   - Read each plaintext SSN
   - Encrypt using `encryptSSN()`
   - Store in `ssn_encrypted` and `ssn_last4`
   - Drop the old `ssn` column

2. Example migration script:
```typescript
import { db } from "~/server/db";
import { tenantProfiles } from "~/server/db/schema";
import { encryptSSN } from "~/lib/encryption";

async function migrateSSNData() {
  const profiles = await db.select().from(tenantProfiles);
  
  for (const profile of profiles) {
    if (profile.ssn && !profile.ssnEncrypted) {
      const encrypted = encryptSSN(profile.ssn);
      const last4 = profile.ssn.slice(-4);
      
      await db.update(tenantProfiles)
        .set({
          ssnEncrypted: encrypted,
          ssnLast4: last4,
        })
        .where(eq(tenantProfiles.id, profile.id));
    }
  }
}
```

## Troubleshooting

### "ENCRYPTION_KEY environment variable is not set"
- Ensure `.env` file exists and contains `ENCRYPTION_KEY`
- Verify the key is 64 hexadecimal characters (32 bytes)

### "Invalid encrypted data format"
- Encrypted data should be in format: `iv:authTag:ciphertext`
- Data may be corrupted or not properly encrypted

### "Failed to decrypt data"
- Wrong encryption key being used
- Data corruption
- Key rotation without re-encrypting data

## Testing

Test encryption functionality:

```typescript
import { encryptSSN, decryptSSN, maskSSN } from "~/lib/encryption";

// Test encryption/decryption
const original = "123456789";
const encrypted = encryptSSN(original);
const decrypted = decryptSSN(encrypted);
console.assert(original === decrypted, "Encryption failed");

// Test masking
const masked = maskSSN("123456789");
console.assert(masked === "***-**-6789", "Masking failed");
```

## Additional Resources

- [NIST Encryption Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
