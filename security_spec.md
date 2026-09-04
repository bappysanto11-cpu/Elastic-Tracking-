# Security Specification: Garment Elastic & Trim Packing Calculator

## 1. System Overview & Core Invariants
The Garment Elastic & Trim Packing Calculator is a mission-critical textile manufacturing application managing order packing lists, carton tare/net weight calculations, barcode sticker generation, factory daily production schedules, delivery challans, and truck dispatch logs.

### Fundamental Security Invariants:
1. **Zero Anonymous Unauthenticated DB Writes**: All write operations across private and operational collections require authenticated requests (`request.auth != null`), authenticated via Firebase Auth (Email/Google/GitHub/Anonymous).
2. **Strict Document Ownership (Isolation)**: No user may read, write, update, or delete any data within `/users/{userId}/**` unless `request.auth.uid == userId`.
3. **No Blanket List Queries**: No collection can be queried globally without field-based query restrictions or authentication verification (`allow list: if request.auth != null`).
4. **Denial-of-Wallet & Storage Poisoning Guard**: String lengths, IDs, arrays, and map sizes MUST have strict bounds (`size() <= MAX`).
5. **ID Poisoning Guard**: All document ID variables (`userId`, `sheetId`, `itemId`, etc.) are validated via `isValidId(id)` (`matches('^[a-zA-Z0-9_\\-]+$') && id.size() <= 128`).
6. **Immutable Shared Sheets**: Publicly shared sheets (`/sharedSheets/{shareId}`) can be viewed only by direct `get` if the exact ID is known. Listing is forbidden (`allow list: if false;`). Updates and deletions are forbidden (`allow update, delete: if false;`).
7. **Production Integrity**: Daily schedule items, challans, and truck dispatch logs cannot be tampered with by arbitrary field injections; updates are strictly constrained via `affectedKeys().hasOnly(...)`.
8. **Admin Privilege Escalation Guard**: No user can set their own role as admin or tamper with admin privilege records. The admin email `bappysanto11@gmail.com` is verified with `request.auth.token.email_verified == true`.

---

## 2. The "Dirty Dozen" Adversarial Attack Payloads

### Payload 1: ID Poisoning Attack (Oversized & Malicious Path Variable)
- **Target**: `/users/exploit_path_../../admin_root_with_1000_chars_junk/sheets/malicious_sheet`
- **Intent**: Break path traversal or exhaust Firestore evaluation memory.
- **Expected Result**: `PERMISSION_DENIED` (`isValidId` rejects invalid characters and size > 128).

### Payload 2: Cross-Tenant User Profile Hijack
- **Target**: Write to `/users/victim_user_123` with `request.auth.uid = attacker_456`
- **Intent**: Overwrite victim user profile or gain unauthorized data access.
- **Expected Result**: `PERMISSION_DENIED` (`request.auth.uid != userId`).

### Payload 3: Shadow Field Injection in User Profile (Privilege Escalation)
- **Target**: `setDoc(/users/attacker_uid, { uid: attacker_uid, role: 'super_admin', isAdmin: true })`
- **Intent**: Inject unverified administrative claims into user profile.
- **Expected Result**: `PERMISSION_DENIED` (Strict schema and allowed keys enforcement).

### Payload 4: Cross-Tenant Packing Sheet Injection
- **Target**: Write to `/users/victim_uid/sheets/sheet_999` with `userId: 'victim_uid'` while logged in as attacker.
- **Intent**: Inject fake carton weights or corrupted packing orders into another user's cloud account.
- **Expected Result**: `PERMISSION_DENIED` (Master gate check `request.auth.uid == userId`).

### Payload 5: Denial-of-Wallet Giant Payload Attack
- **Target**: Create `/scheduleItems/test_item` with `buyer` containing a 10MB string.
- **Intent**: Exhaust project database bandwidth and storage costs.
- **Expected Result**: `PERMISSION_DENIED` (String length bounded to `<= 200` chars).

### Payload 6: Unauthenticated Operation Hijack
- **Target**: Unauthenticated `POST`/`setDoc` to `/scheduleItems/sched_1` with `request.auth = null`.
- **Intent**: Tamper with factory schedule without logging in.
- **Expected Result**: `PERMISSION_DENIED` (`request.auth != null` required).

### Payload 7: Schedule Status Terminal Transition Violation
- **Target**: Update `/scheduleItems/sched_1` changing status from `completed` backwards to `pending` or modifying non-modifiable fields.
- **Intent**: Alter historical completed factory records.
- **Expected Result**: `PERMISSION_DENIED` (`affectedKeys().hasOnly(...)` guards).

### Payload 8: Shared Sheet Enumeration / Scraper Attack
- **Target**: `getDocs(collection(db, 'sharedSheets'))`
- **Intent**: Enumerate and scrape all factory packing sheets generated across all customers.
- **Expected Result**: `PERMISSION_DENIED` (`allow list: if false;`).

### Payload 9: Shared Sheet Tampering / Overwrite Attack
- **Target**: `updateDoc(doc(db, 'sharedSheets', 'active_share_id'), { data: fakeSheet })`
- **Intent**: Modify carton weights on a shared delivery link to commit fraud.
- **Expected Result**: `PERMISSION_DENIED` (`allow update, delete: if false;`).

### Payload 10: Challan Record Deletion
- **Target**: `deleteDoc(doc(db, 'challanDetails', 'challan_123'))`
- **Intent**: Destroy shipping and delivery paper trail.
- **Expected Result**: `PERMISSION_DENIED` (`allow delete: if isAdmin();`).

### Payload 11: Truck Dispatch Driver Spoofing with Invalid Types
- **Target**: Update `/truckDispatch/truck_1` with `{ capacity: "huge", assignedCartons: -500 }`
- **Intent**: Cause integer overflows or crash driver mobile/web views with malformed types.
- **Expected Result**: `PERMISSION_DENIED` (Type checking and boundary checks).

### Payload 12: Progress Log Timestamp Spoofing
- **Target**: `addDoc(collection(db, 'progressLogs'), { cartonsCompleted: 50, timestamp: "1999-01-01" })`
- **Intent**: Backdate progress logs to falsify worker productivity reports.
- **Expected Result**: `PERMISSION_DENIED` (Mandates `request.time` server timestamp check or timestamp validation).
