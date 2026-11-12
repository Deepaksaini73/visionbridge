import { Request, Response } from 'express';
import { isConnectedToDb } from '../config/db.js';

export const getHealthStatus = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'VisionBridge API Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: isConnectedToDb ? 'connected' : 'standalone_fallback_mode',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    capabilities: [
      'Voice-First Interview Engine',
      'Tumbling-E Visual Acuity Screening',
      'Amsler Grid Macular Distortion Assessment',
      'Offline-First Synchronization (Dexie Sync)',
      'Remote Optometrist Review & Triage'
    ]
  });
};

