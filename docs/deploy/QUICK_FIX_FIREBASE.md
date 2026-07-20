# 🔥 Quick Fix: Firebase Authentication

## The Issue

Backend returning `{"error":"Invalid token"}` when testing with Firebase tokens.

## Root Cause

Backend missing Firebase Admin SDK credentials to verify tokens.

## The Fix (2 minutes)

### 1. Go to Render Dashboard
https://dashboard.render.com → Select `ethai-guard` backend → Environment

### 2. Add Two Variables

**Variable 1:**
```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@studio-8429244671-dd548.iam.gserviceaccount.com
```

**Variable 2:**
```
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCnqOylpuftpc0W
ZwSzq5yLB3Kh234qiMb8x+ru11TRJnSH8/qZaiymUzkFR5906ykkaYl4A84wh6oC
ZOUI0ygxFjZ+c4/UoHAoM0Em8T0/rWIk9SOhSKOdj58CHNu6wJc84ZH0djGf7Ng2
7+6v/tajd7I2kMXhxxSxSBgQkwiD53W+PcjkhkbVjHUSS8jPEPhZOX/FVhFmqzA9
xd8cQ1JdbDOehtRybYeAgsE1Px0va4Sy1LMamAhaWOxBR3cqa92XWD6GIb8dXVWy
nIt5VerBHaBdUlaphVn46eo3M04ChxuHiv7mlHpdmvFZPmjcwaVRj4PIV01dgCRc
UfiMRbzvAgMBAAECggEARUenahgbFHeD1LMDHV9Xk5ejRcDWVKsqVsAhk0pFkRtr
4dXugsB97MjM8iKTgJO/73zwwjgIVsNofA7HGatvm0ELiZslHv6g+eucC4R6A7sY
qB7n9zh166CyWwQjw/rbQ9wOHM9OWEBdY+4nWnBarzfB24xdSJukMFGTKB4p0Z8C
KuPNRj867SQH5c7TcC8QqoN8MwJ2P0V7XkYSnGk48TngCkepXN6Ha0ibQBmYGGaM
+EcabvKAQDxBRI4Ljx5xhDW2jxH8H4fCfZY5RqtsxiHLSI6ACM81lAVu3/6+7Fof
VH0PT03oRhlifOeeJ7oco9/Pek75cTYz86tle4bXsQKBgQDnCgAiHor5OHzBCsFp
+Oo9xiR235XER3L1CSxuqhJKLE5l5vaxQLGU5g+DN1M1E6NwrCqbRdxJwnHztqwp
gfY5o6toz8DJ+0Eafc+GXsAMq4PtkQ+caOO8kZ0RFc4+KiR1B/havfKFeeCIfsSw
tLObR2izH3daE0efnBOyrfIzyQKBgQC5xgDndesbvD9iaag2LbX2xDyqOq5lBZ+H
aM4HLlRCrJEEBhVfh04K/oBz28mqZgoHduaRQ+vvRR3QKNR+YL0Zm9M546KZI9nL
ZqGHBOSxYn8EjfxL097vAC0MgQ3zv+kpb+yZXBy/R+WMTzExxu5SDb1TCTd9FhmA
VmmJ1k6W9wKBgQCbexdr3rIX1fPe1aYj8udwew+/D+hyFsM+M9Y7Aykb0YVQ/oW1
85uOYOS/oVPVvEmZYcOqivEckkathJmHtXZGg+auumE7jGLbuR8XhlwoKqS2E5E1
6UCZfkT9YndRTnsKZzqzlnDHcqWwNd+YK4NTVFMZeGuRqrfgqeB3tqfwQQKBgFxm
jMqTjzZDYq97aAxSniA4KQhumZFrw5ZhXaCavZRQKuz6baUPMpUrUw7NcjgL+s8N
p873HqHrGdIQjOizCztykxRHEffjqg+OY6c5mtpT6GOGj8fTgR4VU1LV2e+0M6/F
mMQK2c2WYClytkBQ9vbfGJz1h6Dy3gpEcMf7TSmvAoGBAM4jHbXvDHA4gcBfdtXI
L300rUbrM/gtCF0vWD4H5b9dPo0iKkbOVQUvDyaK87d1ZDR9bvQ0bpIrmw2sIg9p
zdt0icsKONubB1l4J2MbYEdWAmbXhiGBM2fe557t2Ric5yZyJyWfcWfiDzxarGel
8aKZjwqVdlwbnzzHL3RNZhrN
-----END PRIVATE KEY-----
```

### 3. Save & Wait
- Click "Save Changes"
- Wait 2-3 minutes for automatic redeploy

### 4. Test It
```bash
cd /mnt/devmandrive/EthAI
echo "1" | ./test-firebase-auth.sh
```

Should now see:
```
✓ User created successfully!
✓ PASS (HTTP 200)
✓ Backend Firebase authentication working
```

## That's It!

After this, your full authentication flow will work:
- ✅ Frontend can authenticate users
- ✅ Backend can verify Firebase tokens
- ✅ Full analysis workflow ready to test

See `FIREBASE_BACKEND_SETUP.md` for detailed explanation.
