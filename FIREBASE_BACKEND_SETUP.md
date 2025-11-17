# Firebase Backend Authentication Setup

## Issue Found

Your backend is configured with `AUTH_PROVIDER=firebase` but missing the Firebase Admin SDK credentials needed to verify Firebase tokens.

## Current Status

✅ **Working:**
- Backend deployed and healthy
- AI Core deployed and healthy
- Frontend deployed with Firebase auth
- Firebase user creation via REST API

❌ **Not Working:**
- Backend cannot verify Firebase tokens
- Gets error: `{"error":"Invalid token"}`

## Root Cause

The backend's Firebase middleware (`backend/src/middleware/firebaseAuth.js`) requires Firebase Admin SDK credentials to verify tokens. Currently missing:
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Solution: Add Firebase Admin Credentials to Render

### Step 1: Get Credentials

Download your Firebase service account JSON from Firebase Console:
- Go to Firebase Console → Project Settings → Service Accounts
- Click "Generate New Private Key" and save securely
- Extract `client_email` and `private_key` fields

**Example format (DO NOT use these redacted values):**

```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

```
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
<YOUR_ACTUAL_PRIVATE_KEY_HERE>
-----END PRIVATE KEY-----
```

### Step 2: Add to Render Environment Variables

1. **Go to Render Dashboard:**
   - URL: https://dashboard.render.com
   - Select your backend service: `ethai-guard`

2. **Navigate to Environment:**
   - Click "Environment" in the left sidebar

3. **Add Firebase Admin Credentials:**

   **Variable 1: FIREBASE_CLIENT_EMAIL**
   ```
   Key: FIREBASE_CLIENT_EMAIL
   Value: <your-firebase-service-account-email>
   ```

   **Variable 2: FIREBASE_PRIVATE_KEY**
   ```
   Key: FIREBASE_PRIVATE_KEY
   Value: <paste-your-entire-private-key-including-BEGIN-END-lines>
   ```

   ⚠️ **Important for Private Key:**
   - Copy the ENTIRE key from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----`
   - Include all newlines - Render will handle them correctly
   - Alternatively, you can paste it as a single line and let the backend handle `\\n` escaping

4. **Save and Deploy:**
   - Click "Save Changes"
   - Render will automatically redeploy the backend
   - Wait 2-3 minutes for deployment to complete

### Step 3: Verify Firebase Auth Working

After deployment completes, run the test script:

```bash
cd /mnt/devmandrive/EthAI
echo "1" | ./test-firebase-auth.sh
```

**Expected Output:**
```
✓ User created successfully!
✓ PASS (HTTP 200) - Testing GET /auth/devices
✓ Backend Firebase authentication working
```

### Step 4: Check Backend Logs

In Render Dashboard → Logs, you should now see:
```
firebase_admin_initialized
```

Instead of:
```
firebase_admin_missing_config
```

## Verification Checklist

After adding the credentials:

- [ ] Added `FIREBASE_CLIENT_EMAIL` to Render
- [ ] Added `FIREBASE_PRIVATE_KEY` to Render (entire key with BEGIN/END lines)
- [ ] Saved changes and triggered redeploy
- [ ] Waited for deployment to complete (check "Logs" tab)
- [ ] Ran `test-firebase-auth.sh` automated test
- [ ] Confirmed test passes with HTTP 200
- [ ] Checked logs show `firebase_admin_initialized`

## Next Steps After Firebase Auth Works

1. **Test Full Analysis Flow:**
   ```bash
   # Login to frontend: https://eth-ai-guard.vercel.app
   # Upload transaction CSV
   # Run analysis
   # View SHAP explanations
   ```

2. **Optional: Setup Monitoring:**
   - UptimeRobot for health checks
   - Keep services warm (avoid cold starts)

## Troubleshooting

**If still getting "Invalid token" error:**

1. **Check Logs:**
   - Render Dashboard → ethai-guard → Logs
   - Look for `firebase_admin_missing_config` or errors

2. **Verify Environment Variables:**
   - In Render, check both variables are set
   - Private key should be multi-line (or properly escaped)

3. **Check Firebase Project ID Match:**
   ```bash
   # Backend should have:
   FIREBASE_PROJECT_ID=<your-firebase-project-id>
   
   # Frontend should have:
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-firebase-project-id>
   ```

4. **Test Manually:**
   ```bash
   # Get fresh token (replace with your Firebase Web API Key)
   curl -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=YOUR_FIREBASE_WEB_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123456!","returnSecureToken":true}'
   
   # Copy idToken and test
   curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     "https://your-backend-url.com/auth/devices"
   ```

## Alternative: Use Secret Files

If you prefer to use a secret file instead of environment variables:

1. **In Render Dashboard:**
   - Go to "Secret Files"
   - Add file: `/etc/secrets/serviceAccountKey.json`
   - Paste entire `serviceAccountKey.json` content

2. **Update Backend Code** (optional, already supported):
   - Backend automatically looks for service account at `/etc/secrets/serviceAccountKey.json`
   - Or set `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/serviceAccountKey.json`

But using environment variables (`FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`) is simpler and already supported by the current code.

## Summary

You were **almost there!** All services are deployed and Firebase user creation works. You just need to add the Firebase Admin credentials to Render so the backend can verify Firebase tokens. This is a 2-minute fix:

1. Add `FIREBASE_CLIENT_EMAIL` to Render
2. Add `FIREBASE_PRIVATE_KEY` to Render  
3. Wait for redeploy
4. Test with `./test-firebase-auth.sh`

Then you'll have **full end-to-end authentication working!** 🎉
