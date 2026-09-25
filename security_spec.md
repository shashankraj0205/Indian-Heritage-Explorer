# Security Specification & Threat Model

## Application: India Heritage Explorer
## Target: Firebase Firestore ABAC & Zero-Trust Access Control

---

### 1. Data Invariants

1. **User Identity Boundary**: A user can only create, read, update, or delete their own profile (`/users/{userId}` where `userId == request.auth.uid`). Users can never list the entire users collection (PII isolation).
2. **Visit Log Ownership**: A `HeritageVisit` record in `/heritageVisits/{visitId}` must have `userId == request.auth.uid`. An authenticated user cannot forge the `userId` of another person or read/list other users' private visits.
3. **Rating Boundaries**: Ratings must be numbers between 1 and 5.
4. **Bookmark Ownership**: A `HeritageBookmark` in `/bookmarks/{bookmarkId}` must belong strictly to the authenticated creator (`userId == request.auth.uid`).
5. **No Orphaned or Spoofed Writes**: Path variables `{userId}`, `{visitId}`, `{bookmarkId}` must conform to strict alpha-numeric identifier regex constraints (`^[a-zA-Z0-9_\-]+$`) with a maximum length of 128 characters.
6. **Strict Update Field Allowlisting**: During update of a `HeritageVisit`, only mutable fields (`visitDate`, `rating`, `notes`) can be modified. Immutable fields (`id`, `userId`, `monumentId`, `monumentName`, `createdAt`) cannot be altered.
7. **Default Deny Catch-all**: Any unmatched paths are forbidden by default.

---

### 2. The "Dirty Dozen" Payloads (Adversarial Tests)

1. **Payload 1 (Identity Spoofing - Profile Create)**:
   - Target: `POST /users/victim-uid-456`
   - Data: `{ "id": "victim-uid-456", "email": "victim@domain.com", "displayName": "Victim User", "createdAt": "2026-09-24T12:00:00Z" }`
   - Attacker Auth: `attacker-uid-123`
   - Expected: `PERMISSION_DENIED` (auth UID does not match document ID path).

2. **Payload 2 (Ghost Field Attack - Profile)**:
   - Target: `POST /users/attacker-uid-123`
   - Data: `{ "id": "attacker-uid-123", "email": "attacker@domain.com", "displayName": "Attacker", "role": "admin", "isSuperUser": true, "createdAt": "2026-09-24T12:00:00Z" }`
   - Attacker Auth: `attacker-uid-123`
   - Expected: `PERMISSION_DENIED` (Strict keys violation; unrecognized keys `isSuperUser`).

3. **Payload 3 (PII Blanket Scraping - Users Collection)**:
   - Target: `GET /users` (list query)
   - Attacker Auth: `attacker-uid-123`
   - Expected: `PERMISSION_DENIED` (`allow list: if false;` protects emails from being scraped).

4. **Payload 4 (Foreign Visit Impersonation)**:
   - Target: `POST /heritageVisits/visit-abc-999`
   - Data: `{ "id": "visit-abc-999", "userId": "target-user-888", "monumentId": "taj-mahal", "monumentName": "Taj Mahal", "visitDate": "2026-01-01", "rating": 5, "createdAt": "2026-09-24T12:00:00Z" }`
   - Attacker Auth: `attacker-uid-123`
   - Expected: `PERMISSION_DENIED` (`incoming().userId != request.auth.uid`).

5. **Payload 5 (Denial-of-Wallet Payload Overflow)**:
   - Target: `POST /heritageVisits/visit-bomb`
   - Data: `{ "id": "visit-bomb", "userId": "attacker-uid-123", "monumentId": "taj-mahal", "monumentName": "Taj Mahal", "visitDate": "2026-01-01", "rating": 5, "notes": "<1MB repeated string>", "createdAt": "2026-09-24T12:00:00Z" }`
   - Attacker Auth: `attacker-uid-123`
   - Expected: `PERMISSION_DENIED` (`notes.size() <= 2000`).

6. **Payload 6 (Path ID Poisoning Attack)**:
   - Target: `POST /heritageVisits/../../../root-dir-exploit`
   - Attacker Auth: `attacker-uid-123`
   - Expected: `PERMISSION_DENIED` (`isValidId` rejects non-alphanumeric ID path).

7. **Payload 7 (Invalid Rating State Attack)**:
   - Target: `POST /heritageVisits/visit-bad-rating`
   - Data: `{ "id": "visit-bad-rating", "userId": "attacker-uid-123", "monumentId": "hampi", "monumentName": "Hampi", "visitDate": "2026-01-01", "rating": 9999, "createdAt": "2026-09-24T12:00:00Z" }`
   - Attacker Auth: `attacker-uid-123`
   - Expected: `PERMISSION_DENIED` (`rating >= 1 && rating <= 5`).

8. **Payload 8 (State Transition / Immutable ID Tamper Update)**:
   - Target: `UPDATE /heritageVisits/visit-123`
   - Existing: `{ "id": "visit-123", "userId": "attacker-uid-123", "monumentId": "taj-mahal", ... }`
   - Data: `{ "id": "visit-123", "userId": "victim-uid-456", "monumentId": "hampi", ... }`
   - Attacker Auth: `attacker-uid-123`
   - Expected: `PERMISSION_DENIED` (`affectedKeys().hasOnly(['visitDate', 'rating', 'notes'])`).

9. **Payload 9 (Unauthorized Delete of Foreign Visit)**:
   - Target: `DELETE /heritageVisits/victim-visit-777`
   - Existing: `{ "id": "victim-visit-777", "userId": "victim-uid-456" }`
   - Attacker Auth: `attacker-uid-123`
   - Expected: `PERMISSION_DENIED` (`existing().userId == request.auth.uid` fails).

10. **Payload 10 (Bookmark Forgery)**:
    - Target: `POST /bookmarks/bm-foreign`
    - Data: `{ "id": "bm-foreign", "userId": "victim-uid-456", "monumentId": "konark-sun-temple", "monumentName": "Konark Sun Temple", "createdAt": "2026-09-24T12:00:00Z" }`
    - Attacker Auth: `attacker-uid-123`
    - Expected: `PERMISSION_DENIED` (`incoming().userId != request.auth.uid`).

11. **Payload 11 (Unauthenticated Write Probe)**:
    - Target: `POST /heritageVisits/anon-visit-1`
    - Data: `{ "id": "anon-visit-1", "userId": "nobody", "monumentId": "ajanta", "monumentName": "Ajanta Caves", "visitDate": "2026-01-01", "rating": 5, "createdAt": "2026-09-24T12:00:00Z" }`
    - Attacker Auth: `null` (Anonymous / Unauthenticated)
    - Expected: `PERMISSION_DENIED` (`request.auth != null` fails).

12. **Payload 12 (Arbitrary Collection Injection)**:
    - Target: `POST /adminConfig/secrets`
    - Data: `{ "masterKey": "compromised" }`
    - Attacker Auth: `attacker-uid-123`
    - Expected: `PERMISSION_DENIED` (Matched by global deny rule `/{document=**}`).

---

### 3. Verification Plan
- Deploy rules using `deploy_firebase`.
- Run validation queries and ensure proper `handleFirestoreError` wraps every Firestore API call.
