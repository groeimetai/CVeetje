import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Minimum recommended key length for security
const MIN_KEY_LENGTH = 32;

// Weak key patterns to reject
const WEAK_KEY_PATTERNS = [
  /^(.)\1+$/, // All same character (aaaaaa...)
  /^0+$/,     // All zeros
  /^1234567890+$/, // Sequential numbers
  /^password/i,
  /^secret/i,
  /^key/i,
  /^test/i,
  /^dev/i,
  /^abcdef/i,
];

/**
 * Validate that the encryption key meets security requirements
 * Called at startup to fail fast if misconfigured
 */
export function validateEncryptionKey(): void {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate a secure key with: openssl rand -base64 32'
    );
  }

  if (encryptionKey.length < MIN_KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY is too short (${encryptionKey.length} chars). ` +
      `Minimum length is ${MIN_KEY_LENGTH} characters. ` +
      'Generate a secure key with: openssl rand -base64 32'
    );
  }

  // Check for weak patterns
  for (const pattern of WEAK_KEY_PATTERNS) {
    if (pattern.test(encryptionKey)) {
      throw new Error(
        'ENCRYPTION_KEY appears to be a weak or test key. ' +
        'Use a cryptographically secure random key in production. ' +
        'Generate one with: openssl rand -base64 32'
      );
    }
  }

  // Check entropy (basic check - should have reasonable variety)
  const uniqueChars = new Set(encryptionKey).size;
  if (uniqueChars < 10) {
    console.warn(
      'Warning: ENCRYPTION_KEY has low character variety. ' +
      'Consider using a more random key for better security.'
    );
  }
}

/**
 * Get derived key from encryption key and salt
 */
function getKey(salt: Buffer): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  return scryptSync(encryptionKey, salt, KEY_LENGTH);
}

/**
 * Encrypt a string using AES-256-GCM
 * @param text - The plaintext to encrypt
 * @returns Base64 encoded encrypted data (salt + iv + authTag + ciphertext)
 */
export function encrypt(text: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = getKey(salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine salt + iv + authTag + encrypted data
  const result = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ]);

  return result.toString('base64');
}

/**
 * Decrypt a string encrypted with the encrypt() function
 * @param encryptedData - Base64 encoded encrypted data
 * @returns The decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  const data = Buffer.from(encryptedData, 'base64');

  // Validate minimum length (salt + iv + authTag + at least 1 byte of data)
  const minLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
  if (data.length < minLength) {
    throw new Error('Invalid encrypted data: too short');
  }

  // Extract parts
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = getKey(salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Test that encryption/decryption works correctly
 * Can be called during startup to verify configuration
 */
export function testEncryption(): boolean {
  try {
    const testString = 'encryption-test-' + Date.now();
    const encrypted = encrypt(testString);
    const decrypted = decrypt(encrypted);
    return decrypted === testString;
  } catch {
    return false;
  }
}
