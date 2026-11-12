# VisionBridge REST API Specification

> **Base URL**: `/api`  
> **Protocol**: HTTPS / JSON  
> **Authentication**: Bearer JWT (`Authorization: Bearer <token>`)

---

## 1. Authentication & User Management

### `POST /api/auth/register`
Creates a new Store Operator or Reviewer account (subject to admin approval).
- **Request Body**:
```json
{
  "name": "Rajesh Kumar",
  "email": "rajesh@ruralvision.org",
  "password": "SecurePassword123!",
  "role": "STORE_OPERATOR",
  "storeName": "VisionPoint Chittoor",
  "phone": "+919876543210"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_6f8a...",
      "name": "Rajesh Kumar",
      "email": "rajesh@ruralvision.org",
      "role": "STORE_OPERATOR",
      "storeName": "VisionPoint Chittoor"
    },
    "token": "eyJhbGciOi..."
  }
}
```

### `POST /api/auth/login`
Authenticates a user and returns a signed JWT with role claim.
- **Request Body**: `{ "email": "...", "password": "..." }`
- **Response `200 OK`**: `{ "success": true, "data": { "user": {...}, "token": "..." } }`

### `GET /api/auth/me`
Retrieves current authenticated user session and role capabilities.

---

## 2. Customer Management

### `POST /api/customers`
Registers a new customer record.
- **Request Body**:
```json
{
  "clientUuid": "c7a8b8c2-4a0e-436f-b258-3d1f114c0001",
  "fullName": "Sunita Devi",
  "age": 48,
  "gender": "FEMALE",
  "phone": "+919123456789",
  "preferredLanguage": "hi",
  "consentGiven": true,
  "consentTimestamp": "2026-11-06T08:00:00.000Z",
  "notes": "Complains of difficulty reading labels in sewing shop"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "id": "cust_991823",
    "customerCode": "VB-2026-0819",
    "fullName": "Sunita Devi",
    "age": 48,
    "status": "REGISTERED"
  }
}
```

### `GET /api/customers`
Returns paginated list of customers for the store operator or optometrist.
- **Query Params**: `page=1&limit=20&search=sunita&status=PENDING_REVIEW`

### `GET /api/customers/:id`
Retrieves complete customer profile including interview answers, screening scores, and review history.

---

## 3. Voice Interview Management

### `POST /api/interviews`
Submits structured responses from the voice-first interview engine.
- **Request Body**:
```json
{
  "customerId": "cust_991823",
  "language": "hi",
  "responses": [
    {
      "questionId": "q_chief_complaint",
      "questionText": "What is your main vision problem?",
      "voiceInputTranscript": "Aankhon me paas ka dhundhla dikhta hai",
      "selectedOption": "NEAR_BLUR",
      "durationSeconds": 14
    },
    {
      "questionId": "q_red_flag_pain",
      "questionText": "Are you experiencing severe eye pain or sudden vision loss?",
      "voiceInputTranscript": "Nahi, dard nahi hai",
      "selectedOption": "NONE",
      "isRedFlag": false
    }
  ],
  "completedAt": "2026-11-06T08:15:00.000Z"
}
```

---

## 4. Preliminary Vision Screening

### `POST /api/screenings`
Stores preliminary visual acuity (Tumbling-E), Amsler grid observations, and test telemetry.
- **Request Body**:
```json
{
  "customerId": "cust_991823",
  "deviceInfo": {
    "screenWidth": 390,
    "screenHeight": 844,
    "calibrationDistanceCm": 40
  },
  "visualAcuity": {
    "rightEyeScore": "6/9",
    "leftEyeScore": "6/18",
    "details": [
      { "eye": "RIGHT", "size": "6/18", "direction": "UP", "userAnswer": "UP", "correct": true },
      { "eye": "RIGHT", "size": "6/12", "direction": "LEFT", "userAnswer": "LEFT", "correct": true },
      { "eye": "RIGHT", "size": "6/9", "direction": "RIGHT", "userAnswer": "RIGHT", "correct": true },
      { "eye": "LEFT", "size": "6/18", "direction": "DOWN", "userAnswer": "DOWN", "correct": true },
      { "eye": "LEFT", "size": "6/12", "direction": "UP", "userAnswer": "LEFT", "correct": false }
    ]
  },
  "amslerGrid": {
    "rightEyeDistorted": false,
    "leftEyeDistorted": true,
    "leftEyeNotes": "Wavy lines near center fixation point"
  },
  "preliminaryFlags": ["UNILATERAL_DEFICIT", "AMSLER_METAMORPHOPSIA"]
}
```

---

## 5. Professional Review & Case Management

### `GET /api/reviews/queue`
Retrieves prioritized cases requiring optometrist evaluation.
- Supports sorting by urgency (Red Flagged > Abnormal Screening > Routine).

### `POST /api/reviews/:id/decision`
Submits optometrist sign-off, clinical notes, and guidance/referral.
- **Request Body**:
```json
{
  "reviewerNotes": "Customer exhibits left-eye acuity reduction and reported central metamorphopsia on Amsler check. Recommend priority dilated macular evaluation by an ophthalmologist.",
  "status": "REFERRAL_RECOMMENDED",
  "referralFacility": "District Eye Hospital, Chittoor",
  "urgencyLevel": "HIGH",
  "retestRequested": false
}
```

---

## 6. Offline Synchronization (Batch API)

### `POST /api/sync/batch`
Ingests offline-stored records from IndexedDB.
- **Request Body**:
```json
{
  "storeId": "store_102",
  "records": [
    {
      "entityType": "CUSTOMER",
      "clientUuid": "c7a8b8c2-4a0e-436f-b258-3d1f114c0001",
      "timestamp": "2026-11-06T08:00:00.000Z",
      "payload": { ... }
    },
    {
      "entityType": "SCREENING",
      "clientUuid": "scr_991823_v1",
      "timestamp": "2026-11-06T08:20:00.000Z",
      "payload": { ... }
    }
  ]
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "processed": 2,
  "syncedIds": ["c7a8b8c2-4a0e-436f-b258-3d1f114c0001", "scr_991823_v1"],
  "conflicts": []
}
```

---

## 7. System Health Check

### `GET /api/health`
Returns system telemetry, database status, and uptime.
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "service": "VisionBridge API",
  "version": "1.0.0",
  "timestamp": "2026-11-06T08:24:00.000Z",
  "database": "connected",
  "environment": "development"
}
```

