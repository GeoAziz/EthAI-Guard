# Firebase Secret File Setup for Render

## The Issue

Your `FIREBASE_PRIVATE_KEY` environment variable has extra quotes that break Firebase Admin SDK initialization. The secret file approach is more reliable.

## Solution: Upload serviceAccountKey.json as Secret File

### Step 1: Go to Render Dashboard

1. Open: https://dashboard.render.com
2. Select: **ethai-guard** (backend service)
3. Click: **"Secret Files"** tab (in the left sidebar)

### Step 2: Add Secret File

1. Click **"Add Secret File"** button
2. Fill in the form:
   - **Filename:** `/etc/secrets/serviceAccountKey.json`
   - **Contents:** Download your Firebase service account JSON from Firebase Console → Project Settings → Service Accounts → Generate New Private Key. **DO NOT commit real credentials to git!** Example structure:

```json
{
  "type": "service_account",
  "project_id": "YOUR_PROJECT_ID",
  "private_key_id": "REDACTED",
  "private_key": "-----BEGIN PRIVATE KEY-----\n<YOUR_PRIVATE_KEY>\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@YOUR_PROJECT_ID.iam.gserviceaccount.com",
  "client_id": "REDACTED",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40YOUR_PROJECT_ID.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

3. Click **"Save"**

### Step 3: Update Environment Variables

Now go to the **"Environment"** tab and:

1. **DELETE these 3 variables:**
   - `FIREBASE_PRIVATE_KEY` ❌ (delete this - has formatting issues)
   - `FIREBASE_CLIENT_EMAIL` ❌ (delete this - will come from file)
   - `FIREBASE_PRIVATE_KEY_FILE` ❌ (delete this if it exists)

2. **ADD this new variable:**
   - Key: `GOOGLE_APPLICATION_CREDENTIALS`
   - Value: `/etc/secrets/serviceAccountKey.json`

3. Click **"Save Changes"**

### Step 4: Wait for Redeploy

The backend will automatically redeploy (takes 2-3 minutes).

### Step 5: Verify in Logs

After redeploy, check the Logs tab. You should now see:

```
{"level":"info","msg":"firebase_admin_initialized"}
```

### Step 6: Test Authentication

Run the test script:

```bash
bash /tmp/run_firebase_check.sh
```

Expected output:
```
Testing backend authentication...
Backend response:
{"devices":[]}

✅ SUCCESS! Firebase authentication is working!
```

## Why This Works Better

1. **No quote escaping issues** - JSON file is parsed correctly
2. **More standard approach** - Using `GOOGLE_APPLICATION_CREDENTIALS` is the official way
3. **All credentials in one place** - No need to split client_email and private_key
4. **Easier to update** - Just edit the secret file, no environment variable formatting

## Troubleshooting

If it still doesn't work:

1. **Check secret file path:** Make sure it's exactly `/etc/secrets/serviceAccountKey.json`
2. **Check JSON format:** Make sure you copied the ENTIRE JSON (all curly braces)
3. **Check logs:** Look for any Firebase-related error messages
4. **Verify GOOGLE_APPLICATION_CREDENTIALS:** Should be set to `/etc/secrets/serviceAccountKey.json`

## Alternative: Fix the Environment Variable

If you prefer to stick with environment variables, you need to remove the outer quotes:

**Current (WRONG):**
```
FIREBASE_PRIVATE_KEY='"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"'
```

**Should be (CORRECT):**
```
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvgIB...\n-----END PRIVATE KEY-----\n
```

But the secret file approach is more reliable and recommended!
