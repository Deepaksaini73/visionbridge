import fs from 'fs';
import path from 'path';

const STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'uploads');
const METADATA_FILE = path.join(STORAGE_ROOT, 'metadata.json');

export interface PersistedRegistry {
  customers: Record<string, any>; // customerId -> custom customer patches (e.g. profilePhoto)
  eyeImages: any[]; // list of uploaded eye images
  lastUpdated: string;
}

/**
 * Ensures storage root exists
 */
function ensureStorageRoot(): void {
  try {
    if (!fs.existsSync(STORAGE_ROOT)) {
      fs.mkdirSync(STORAGE_ROOT, { recursive: true });
    }
  } catch (err) {
    console.error('[MetadataPersistence] Failed to create storage root:', err);
  }
}

/**
 * Loads persisted metadata from disk
 */
export function loadPersistedRegistry(): PersistedRegistry {
  ensureStorageRoot();
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const content = fs.readFileSync(METADATA_FILE, 'utf-8');
      const data = JSON.parse(content);
      return {
        customers: data.customers || {},
        eyeImages: Array.isArray(data.eyeImages) ? data.eyeImages : [],
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('[MetadataPersistence] Could not read metadata.json, initializing fresh registry:', err);
  }

  return {
    customers: {},
    eyeImages: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Saves registry to disk atomically
 */
export function savePersistedRegistry(registry: PersistedRegistry): void {
  ensureStorageRoot();
  try {
    registry.lastUpdated = new Date().toISOString();
    const tempFile = `${METADATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(registry, null, 2), 'utf-8');
    fs.renameSync(tempFile, METADATA_FILE);
  } catch (err) {
    console.error('[MetadataPersistence] Failed to save metadata.json:', err);
  }
}

/**
 * Persists or updates a customer record in metadata
 */
export function persistCustomerPatch(customerId: string, patch: Record<string, any>): void {
  const reg = loadPersistedRegistry();
  reg.customers[customerId] = {
    ...(reg.customers[customerId] || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  savePersistedRegistry(reg);
}

/**
 * Removes customer profile photo from metadata
 */
export function removeCustomerPhotoPatch(customerId: string): void {
  const reg = loadPersistedRegistry();
  if (reg.customers[customerId]) {
    delete reg.customers[customerId].profilePhoto;
    delete reg.customers[customerId].profilePhotoUrl;
    reg.customers[customerId].updatedAt = new Date().toISOString();
    savePersistedRegistry(reg);
  }
}

/**
 * Upserts an eye image record in metadata
 */
export function persistEyeImageRecord(imageRecord: any): void {
  const reg = loadPersistedRegistry();
  const plain = imageRecord.toObject ? imageRecord.toObject() : { ...imageRecord };
  const existingIdx = reg.eyeImages.findIndex(
    (i) => i.imageId === plain.imageId || i.id === plain.id
  );

  if (existingIdx !== -1) {
    reg.eyeImages[existingIdx] = plain;
  } else {
    reg.eyeImages.unshift(plain);
  }

  savePersistedRegistry(reg);
}

/**
 * Archives or removes an eye image from metadata
 */
export function removeEyeImageRecord(imageId: string): void {
  const reg = loadPersistedRegistry();
  const idx = reg.eyeImages.findIndex((i) => i.imageId === imageId || i.id === imageId);
  if (idx !== -1) {
    reg.eyeImages[idx].isArchived = true;
    reg.eyeImages[idx].updatedAt = new Date().toISOString();
    savePersistedRegistry(reg);
  }
}

