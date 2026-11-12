import Dexie, { type EntityTable } from 'dexie';

export interface LocalCustomer {
  id?: number;
  clientUuid: string;
  customerCode: string;
  fullName: string;
  age: number;
  gender: string;
  phone?: string;
  preferredLanguage: string;
  consentGiven: boolean;
  notes?: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  createdAt: string;
}

export interface LocalInterviewResponse {
  id?: number;
  customerId: string;
  questionId: string;
  questionText: string;
  voiceTranscript?: string;
  selectedOption: string;
  isRedFlag: boolean;
  syncStatus: 'PENDING' | 'SYNCED';
  answeredAt: string;
}

export interface LocalScreeningRecord {
  id?: number;
  customerId: string;
  clientUuid: string;
  rightEyeAcuity: string;
  leftEyeAcuity: string;
  amslerDistorted: boolean;
  warningFlags: string[];
  syncStatus: 'PENDING' | 'SYNCED';
  completedAt: string;
}

export interface LocalSyncQueueItem {
  id?: number;
  clientUuid: string;
  entityType: 'CUSTOMER' | 'INTERVIEW' | 'SCREENING';
  payload: unknown;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  createdAt: string;
}

// Instantiate typed Dexie Database
class VisionBridgeDatabase extends Dexie {
  customers!: EntityTable<LocalCustomer, 'id'>;
  interviews!: EntityTable<LocalInterviewResponse, 'id'>;
  screenings!: EntityTable<LocalScreeningRecord, 'id'>;
  syncQueue!: EntityTable<LocalSyncQueueItem, 'id'>;

  constructor() {
    super('VisionBridgeLocalDB');
    this.version(1).stores({
      customers: '++id, clientUuid, customerCode, syncStatus, createdAt',
      interviews: '++id, customerId, questionId, syncStatus',
      screenings: '++id, customerId, clientUuid, syncStatus',
      syncQueue: '++id, clientUuid, entityType, status, createdAt',
    });
  }
}

export const offlineDb = new VisionBridgeDatabase();

