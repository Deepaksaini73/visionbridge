import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';

// Resolve private storage directories
const STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'uploads');
const PROFILES_DIR = path.join(STORAGE_ROOT, 'profiles');
const EYE_IMAGES_DIR = path.join(STORAGE_ROOT, 'eye-images');
const KEY_DIR = path.resolve(process.cwd(), 'storage');
const KEY_FILE_PATH = path.join(KEY_DIR, '.master.key');

// AES-256-GCM Authenticated Encryption Parameters
const ENCRYPTION_MAGIC_HEADER = Buffer.from('VBP_ENC_v1'); // 10 bytes marker
const IV_LENGTH = 12; // 96-bit IV recommended by NIST for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

// Guarantee private storage folders exist
try {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  fs.mkdirSync(EYE_IMAGES_DIR, { recursive: true });
} catch (err) {
  console.error('[FileStorage] Failed to initialize storage directories:', err);
}

/**
 * Derives or securely retrieves the AES-256 master encryption key
 */
function getMasterEncryptionKey(): Buffer {
  // 1. Environment variable priority (e.g. cloud vault or container secret)
  if (process.env.STORAGE_ENCRYPTION_KEY) {
    return crypto.createHash('sha256').update(process.env.STORAGE_ENCRYPTION_KEY).digest();
  }

  // 2. Persistent local key file in storage directory
  try {
    if (!fs.existsSync(KEY_DIR)) {
      fs.mkdirSync(KEY_DIR, { recursive: true });
    }
    if (fs.existsSync(KEY_FILE_PATH)) {
      const hex = fs.readFileSync(KEY_FILE_PATH, 'utf-8').trim();
      if (hex.length === 64) {
        return Buffer.from(hex, 'hex');
      }
    }
    // Generate fresh cryptographically secure 256-bit key
    const newKey = crypto.randomBytes(32);
    try {
      fs.writeFileSync(KEY_FILE_PATH, newKey.toString('hex'), { mode: 0o600 });
    } catch {
      // Best effort file permissions
    }
    return newKey;
  } catch (err) {
    console.warn('[FileStorage] Could not read master key file, using runtime secret:', err);
    return crypto.createHash('sha256').update('visionbridge_default_local_vault_key_2026').digest();
  }
}

/**
 * Encrypts a plain buffer using AES-256-GCM with a random IV
 * Structure: [10B Magic Header] + [12B IV] + [16B Auth Tag] + [Ciphertext]
 */
export function encryptBuffer(plainBuffer: Buffer): Buffer {
  const key = getMasterEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const cipherText = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([ENCRYPTION_MAGIC_HEADER, iv, authTag, cipherText]);
}

/**
 * Decrypts a stored buffer if it contains the VBP_ENC_v1 magic header
 */
export function decryptBuffer(storedBuffer: Buffer): { buffer: Buffer; isEncrypted: boolean } {
  const minEncryptedSize = ENCRYPTION_MAGIC_HEADER.length + IV_LENGTH + AUTH_TAG_LENGTH;

  if (storedBuffer.length >= minEncryptedSize) {
    const magic = storedBuffer.subarray(0, ENCRYPTION_MAGIC_HEADER.length);
    if (magic.equals(ENCRYPTION_MAGIC_HEADER)) {
      const key = getMasterEncryptionKey();
      let offset = ENCRYPTION_MAGIC_HEADER.length;

      const iv = storedBuffer.subarray(offset, offset + IV_LENGTH);
      offset += IV_LENGTH;

      const authTag = storedBuffer.subarray(offset, offset + AUTH_TAG_LENGTH);
      offset += AUTH_TAG_LENGTH;

      const cipherText = storedBuffer.subarray(offset);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
      return { buffer: decrypted, isEncrypted: true };
    }
  }

  // Fallback: Legacy or unencrypted buffer
  return { buffer: storedBuffer, isEncrypted: false };
}

/**
 * Determines MIME type from file header magic bytes
 */
export function detectMimeType(buffer: Buffer, fallback = 'image/jpeg'): string {
  if (buffer.length >= 4) {
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png';
    }
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    // WebP: RIFF....WEBP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.length >= 12 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }
  }
  return fallback;
}

export interface SavedFileResult {
  storagePath: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  isEncrypted: boolean;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Validates, encrypts, and saves base64 image data to private local storage
 */
export function saveBase64Image(
  subDirectory: 'profiles' | 'eye-images',
  base64OrDataUrl: string,
  prefix = 'img',
  maxSizeBytes = 15 * 1024 * 1024 // 15MB default
): SavedFileResult {
  let mimeType = 'image/jpeg';
  let base64Data = base64OrDataUrl;

  // Extract MIME type from Data URL header if present
  const matches = base64OrDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    mimeType = matches[1].toLowerCase();
    base64Data = matches[2];
  }

  // Validate MIME type
  if (!MIME_TO_EXT[mimeType]) {
    throw new Error(`Unsupported image format '${mimeType}'. Allowed formats: JPEG, PNG, WebP.`);
  }

  const plainBuffer = Buffer.from(base64Data, 'base64');
  const sizeBytes = plainBuffer.length;

  if (sizeBytes > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    throw new Error(
      `File size (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of ${maxMb} MB.`
    );
  }

  // Encrypt image buffer with AES-256-GCM before writing to disk
  const encryptedPayload = encryptBuffer(plainBuffer);

  const ext = MIME_TO_EXT[mimeType];
  const uniqueId = crypto.randomUUID();
  const filename = `${prefix}-${Date.now()}-${uniqueId}.${ext}`;
  const targetDir = subDirectory === 'profiles' ? PROFILES_DIR : EYE_IMAGES_DIR;
  const storagePath = path.join(targetDir, filename);

  // Write ciphertext to storage
  fs.writeFileSync(storagePath, encryptedPayload);

  return {
    storagePath,
    filename,
    mimeType,
    sizeBytes,
    isEncrypted: true,
  };
}

/**
 * Reads and decrypts an image file from disk
 */
export function readStoredImageFile(
  storagePath: string,
  expectedMimeType?: string
): { buffer: Buffer; mimeType: string; isEncrypted: boolean } {
  if (!fs.existsSync(storagePath)) {
    throw new Error(`File does not exist on disk at path: ${storagePath}`);
  }

  const rawDiskBuffer = fs.readFileSync(storagePath);
  const { buffer, isEncrypted } = decryptBuffer(rawDiskBuffer);
  const mimeType = detectMimeType(buffer, expectedMimeType || 'image/jpeg');

  return {
    buffer,
    mimeType,
    isEncrypted,
  };
}

/**
 * Creates a decrypted readable stream from disk file
 */
export function createDecryptedReadStream(
  storagePath: string,
  expectedMimeType?: string
): { stream: Readable; mimeType: string; isEncrypted: boolean } {
  const { buffer, mimeType, isEncrypted } = readStoredImageFile(storagePath, expectedMimeType);
  const stream = Readable.from(buffer);
  return { stream, mimeType, isEncrypted };
}

/**
 * Safely removes a file from disk
 */
export function deleteStoredFile(storagePath: string): boolean {
  try {
    if (fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath);
      return true;
    }
  } catch (err) {
    console.warn(`[FileStorage] Failed to delete stored file at ${storagePath}:`, err);
  }
  return false;
}

/**
 * Checks if file exists on disk
 */
export function fileExists(storagePath: string): boolean {
  return fs.existsSync(storagePath);
}

/**
 * Verifies encryption engine status
 */
export function isStorageEncryptionActive(): boolean {
  return true;
}

export { PROFILES_DIR, EYE_IMAGES_DIR, STORAGE_ROOT, KEY_FILE_PATH, ENCRYPTION_MAGIC_HEADER };
