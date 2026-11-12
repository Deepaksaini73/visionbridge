import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Store } from '../models/Store.js';
import { Customer } from '../models/Customer.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/visionbridge';

export async function runSeed() {
  console.log('[Seed] Initializing VisionBridge development seed data...');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('[Seed] Connected to MongoDB for seeding.');

    // 1. Clear existing collections
    await User.deleteMany({});
    await Store.deleteMany({});
    await Customer.deleteMany({});

    // 2. Create Stores
    const chittoorStore = await Store.create({
      code: 'ST-AP-CHITTOOR-01',
      name: 'VisionPoint Chittoor Center',
      location: {
        address: 'Shop 14, Main Bazaar, Near Old Bus Stand',
        city: 'Chittoor',
        state: 'Andhra Pradesh',
        pincode: '517001',
      },
      contactNumber: '+91 98765 43210',
      email: 'chittoor@visionpoint.org',
      isActive: true,
    });

    const madanapalleStore = await Store.create({
      code: 'ST-AP-MADANAPALLE-02',
      name: 'VisionPoint Madanapalle Center',
      location: {
        address: '22 Market Road, Opp. Municipal Hospital',
        city: 'Madanapalle',
        state: 'Andhra Pradesh',
        pincode: '517325',
      },
      contactNumber: '+91 98765 99887',
      email: 'madanapalle@visionpoint.org',
      isActive: true,
    });

    console.log('[Seed] Stores created: Chittoor & Madanapalle.');

    // 3. Create Users
    const passwordAdmin = await bcrypt.hash('VisionBridgeAdmin2026!', 10);
    const passwordOperator = await bcrypt.hash('OperatorPass123!', 10);
    const passwordOptometrist = await bcrypt.hash('OptometristPass123!', 10);

    const admin = await User.create({
      name: 'Dr. Vikram Malhotra',
      email: 'admin@visionbridge.org',
      passwordHash: passwordAdmin,
      role: 'ADMIN',
      phone: '+91 90000 00000',
      isActive: true,
    });

    const operator1 = await User.create({
      name: 'Ramesh Patel',
      email: 'operator@visionbridge.org',
      passwordHash: passwordOperator,
      role: 'STORE_OPERATOR',
      storeId: chittoorStore.code,
      storeName: chittoorStore.name,
      phone: '+91 98765 43210',
      isActive: true,
    });

    const operator2 = await User.create({
      name: 'Kavita Sundaram',
      email: 'operator2@visionbridge.org',
      passwordHash: passwordOperator,
      role: 'STORE_OPERATOR',
      storeId: madanapalleStore.code,
      storeName: madanapalleStore.name,
      phone: '+91 98765 99887',
      isActive: true,
    });

    const optometrist = await User.create({
      name: 'Dr. Ananya Sharma, M.Optom',
      email: 'dr.ananya@visionbridge.org',
      passwordHash: passwordOptometrist,
      role: 'OPTOMETRIST',
      licenseNumber: 'OPT-IN-2024-8841',
      phone: '+91 94455 66778',
      isActive: true,
    });

    console.log('[Seed] Users created: Admin, 2 Store Operators, and Optometrist.');

    // 4. Create Fictional Customers
    await Customer.create([
      {
        customerId: 'VB-2026-0101',
        clientUuid: '1001-fictional-uuid-01',
        name: 'Lakshmi Narayanan',
        fullName: 'Lakshmi Narayanan',
        age: 52,
        gender: 'FEMALE',
        contactNumber: '+91 98450 11223',
        phone: '+91 98450 11223',
        preferredLanguage: 'hi',
        storeId: chittoorStore.code,
        consentStatus: true,
        consentTimestamp: new Date(Date.now() - 3600000 * 2),
        workflowStatus: 'PENDING_REVIEW',
        notes: 'Reports difficulty threading needles and reading newspaper in low light',
        createdBy: operator1._id.toString(),
      },
      {
        customerId: 'VB-2026-0102',
        clientUuid: '1002-fictional-uuid-02',
        name: 'Mohammad Tariq',
        fullName: 'Mohammad Tariq',
        age: 61,
        gender: 'MALE',
        contactNumber: '+91 97412 88990',
        phone: '+91 97412 88990',
        preferredLanguage: 'en',
        storeId: chittoorStore.code,
        consentStatus: true,
        consentTimestamp: new Date(Date.now() - 3600000 * 5),
        workflowStatus: 'REFERRAL_REQUIRED',
        notes: 'Reported central wavy lines when looking at tile grid in workshop',
        createdBy: operator1._id.toString(),
      },
      {
        customerId: 'VB-2026-0103',
        clientUuid: '1003-fictional-uuid-03',
        name: 'Pooja Verma',
        fullName: 'Pooja Verma',
        age: 24,
        gender: 'FEMALE',
        contactNumber: '+91 91234 55667',
        phone: '+91 91234 55667',
        preferredLanguage: 'hi',
        storeId: chittoorStore.code,
        consentStatus: true,
        consentTimestamp: new Date(Date.now() - 3600000 * 8),
        workflowStatus: 'REVIEWED',
        notes: 'College student experiencing evening eye fatigue following screen work',
        createdBy: operator1._id.toString(),
      },
      {
        customerId: 'VB-2026-0201',
        clientUuid: '2001-fictional-uuid-01',
        name: 'Venkatesh Rao',
        fullName: 'Venkatesh Rao',
        age: 49,
        gender: 'MALE',
        contactNumber: '+91 98888 77777',
        phone: '+91 98888 77777',
        preferredLanguage: 'hi',
        storeId: madanapalleStore.code,
        consentStatus: true,
        consentTimestamp: new Date(Date.now() - 3600000 * 12),
        workflowStatus: 'REGISTERED',
        notes: 'Agricultural farmer registered at Madanapalle store',
        createdBy: operator2._id.toString(),
      },
    ]);

    console.log('[Seed] Fictional customers created across stores.');
    console.log('[Seed] Complete! Demo credentials:');
    console.log('  - Admin: admin@visionbridge.org / VisionBridgeAdmin2026!');
    console.log('  - Store 1: operator@visionbridge.org / OperatorPass123! (Store: ST-AP-CHITTOOR-01)');
    console.log('  - Store 2: operator2@visionbridge.org / OperatorPass123! (Store: ST-AP-MADANAPALLE-02)');
    console.log('  - Optometrist: dr.ananya@visionbridge.org / OptometristPass123!');

    await mongoose.disconnect();
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
}

// Direct CLI execution
runSeed();
