import { Request, Response } from 'express';

export const syncBatchRecords = (req: Request, res: Response) => {
  const { storeId, records } = req.body;

  if (!Array.isArray(records)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PAYLOAD', message: 'records must be an array' }
    });
  }

  const syncedIds: string[] = [];
  const errors: Array<{ id: string; reason: string }> = [];

  for (const item of records) {
    if (!item.clientUuid) {
      errors.push({ id: item.id || 'unknown', reason: 'Missing clientUuid' });
      continue;
    }
    syncedIds.push(item.clientUuid);
  }

  return res.status(200).json({
    success: true,
    data: {
      storeId: storeId || 'unknown_store',
      processedCount: records.length,
      syncedCount: syncedIds.length,
      syncedIds,
      errors,
      syncedAt: new Date().toISOString()
    },
    message: `Successfully synchronized ${syncedIds.length} offline record(s)`
  });
};

