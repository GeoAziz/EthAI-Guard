# Login Fix Verification - Phase 4

## Problem Summary

The login page was broken after Phase 1-3 refactoring. Users could submit credentials, but would get no response or redirect.

### Root Cause
The `/v1/users/me` endpoint was returning `u.role` from MongoDB User model, but after Phase 3 refactoring, roles are no longer stored in MongoDB. Roles are now exclusively stored in Firebase custom claims.

## Solution Implemented

### Issue
- Frontend calls `api.get('/v1/users/me')` after Firebase sign-in
- Backend endpoint queries MongoDB for role: `role: u.role`
- MongoDB User records no longer have `role` field populated
- Endpoint returns `role: undefined`
- Frontend redirect logic fails because `me?.data?.role` is null

### Fix
Updated `backend/src/routes/accessRequests.js` GET `/v1/users/me` endpoint to:
1. Extract role from `req.role` (set by firebaseAuth middleware from Firebase custom claims)
2. Never query MongoDB for role anymore
3. Handle cases where user might not be in MongoDB yet (gracefully return Firebase UID and role)
4. Always return role from Firebase, never from MongoDB

## Changed Files

### backend/src/routes/accessRequests.js (GET /v1/users/me endpoint)

**Before:**
```javascript
return res.json({ id: u._id || u.id, email: u.email, name: u.name, role: u.role });
```

**After:**
```javascript
return res.json({ 
  id: u._id || firebaseUid, 
  email: u.email, 
  name: u.name, 
  role: req.role || 'user'  // ALWAYS use Firebase role, never MongoDB
});
```

## Authentication Flow (After Fix)

```
1. User enters email/password in login form
   ↓
2. Frontend calls Firebase signInWithEmailAndPassword()
   ↓
3. Firebase validates credentials, returns ID token with custom claims
   ↓
4. Frontend stores token in localStorage, redirects to /
   ↓
5. Frontend/App component loads
   ↓
6. Frontend calls api.get('/v1/users/me') to get user info
   ↓
7. API client sends Authorization header with Firebase ID token
   ↓
8. Backend firebaseAuth middleware:
   - Verifies Firebase token signature
   - Checks email is verified
   - Extracts role from token custom claims
   - Sets req.role = 'admin' (or other role)
   - Auto-provisions minimal MongoDB User record
   - Calls next()
   ↓
9. Backend GET /v1/users/me handler:
   - Receives req.role already populated by middleware
   - Looks up user in MongoDB for extended info (name, etc)
   - Returns: { email, name, role: req.role }  ← role from Firebase!
   ↓
10. Frontend receives response with role
    ↓
11. Frontend redirects based on role:
    - admin → /admin (admin dashboard)
    - analyst → /dashboard (analyst view)
    - reviewer → /dashboard (reviewer view)
    - user → /dashboard (user view)
    - guest → /guest or read-only mode
```

## Test Cases

### TC1: Login with Admin User
- Input: email=promote-test@example.com, password=PromotePass123!
- Expected: Redirect to /admin dashboard
- Verify: Role shown as "admin" in UI

### TC2: Login with Analyst User
- Input: email=analyst-test@example.com, password=AnalystPass123!
- Expected: Redirect to /dashboard with analyst view
- Verify: Role shown as "analyst" in UI

### TC3: Login with Reviewer User
- Input: email=reviewer-test@example.com, password=ReviewerPass123!
- Expected: Redirect to /dashboard with reviewer view
- Verify: Role shown as "reviewer" in UI

### TC4: Login with Regular User
- Input: email=user-test@example.com, password=UserPass123!
- Expected: Redirect to /dashboard with user view
- Verify: Role shown as "user" in UI

### TC5: Login with Guest User
- Input: email=guest-test@example.com, password=GuestPass123!
- Expected: Redirect to /guest or read-only dashboard
- Verify: Role shown as "guest" in UI

## Verification Checklist

- [ ] Backend server starts without errors
- [ ] Firebase credentials are properly loaded
- [ ] All 5 test users exist in Firebase (verify in Firebase Console)
- [ ] Each test user has correct custom claim: `{ role: 'xxx' }`
- [ ] TC1: Admin user login works, redirects to /admin
- [ ] TC2: Analyst user login works, redirects to /dashboard
- [ ] TC3: Reviewer user login works, redirects to /dashboard
- [ ] TC4: Regular user login works, redirects to /dashboard
- [ ] TC5: Guest user login works, redirects appropriately
- [ ] All role-based UI elements display correctly for each role
- [ ] No error messages in browser console
- [ ] Network tab shows 200 responses for all requests

## Architecture Notes

After this fix, the authentication flow is fully firebaseAuth-based:
- **Truth Source**: Firebase Authentication + Custom Claims
- **ID Token**: Contains role in custom claims
- **Middleware**: Extracts role during every request
- **MongoDB**: Stores user metadata only (name, email, datasets, audit trails)
- **No Backend Auth**: No separate JWT token generation needed
- **No Token Exchange**: No /auth/firebase/exchange endpoint needed

## Known Limitations

These legacy endpoints still exist but should be removed in cleanup phase:
- `PATCH /v1/users/:id/role` - Updates MongoDB role (legacy, should use Firebase only)
- `POST /v1/users/promote` - Creates user and sets both MongoDB and Firebase role  
- `POST /v1/users/:id/sync-claims` - Syncs MongoDB role to Firebase

These can be refactored in a future cleanup phase to be Firebase-only.

## Next Steps

1. Verify all test cases pass
2. Test role escalation via access requests (Firebase setCustomUserClaims flow)
3. Test API calls from dashboard (role-based access control)
4. Test logout and re-login
5. Clean up legacy role update endpoints (Phase 4 cleanup)
