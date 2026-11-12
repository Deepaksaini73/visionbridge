import mongoose from 'mongoose';

export let isConnectedToDb = false;

/**
 * Automatically inspects and heals legacy MongoDB index conflicts on the customers collection.
 * Specifically prevents E11000 duplicate key errors on customerCode_1 when null records exist.
 */
async function healCustomerIndexes() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const collections = await db.listCollections({ name: 'customers' }).toArray();
    if (collections.length === 0) return;

    const customerCol = db.collection('customers');

    // 1. Backfill any existing customer documents that have null or missing customerCode
    const nullCustomers = await customerCol.find({
      $or: [{ customerCode: null }, { customerCode: { $exists: false } }]
    }).toArray();

    if (nullCustomers.length > 0) {
      console.log(`[Database] Found ${nullCustomers.length} customer records with null/missing customerCode. Healing...`);
      for (const doc of nullCustomers) {
        const fallbackCode = doc.customerId || `VB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await customerCol.updateOne(
          { _id: doc._id },
          { $set: { customerCode: fallbackCode } }
        );
      }
      console.log('[Database] Customer records healed.');
    }

    // 2. Check indexes and drop legacy unique non-sparse customerCode_1 index if present
    const indexes = await customerCol.indexes();
    const legacyCodeIndex = indexes.find((idx: any) => idx.name === 'customerCode_1');
    if (legacyCodeIndex && !legacyCodeIndex.sparse) {
      console.log('[Database] Dropping legacy non-sparse customerCode_1 index to clear null duplicate constraints...');
      await customerCol.dropIndex('customerCode_1');
      console.log('[Database] Legacy customerCode_1 index dropped successfully.');
    }
  } catch (err) {
    console.warn('[Database] Customer index healing warning (non-fatal):', err);
  }
}

export const connectDatabase = async (): Promise<boolean> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/visionbridge';

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000, // Fast timeout for responsive development fallback
    });
    isConnectedToDb = true;
    console.log(`[Database] Successfully connected to MongoDB at ${mongoUri.replace(/:([^:@]{1,})@/, ':****@')}`);
    
    // Run automated self-healing
    await healCustomerIndexes();

    return true;
  } catch (error: unknown) {
    isConnectedToDb = false;
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[Database] MongoDB connection warning: ${msg}`);
    console.warn(`[Database] Operating in Standalone/Demo Fallback mode. Database features will use local mock state until MongoDB is available.`);
    return false;
  }
};
