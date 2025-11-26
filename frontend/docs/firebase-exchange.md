# Firebase -> Backend token exchange (example)

This document shows a minimal flow for using Firebase client-side authentication and exchanging the Firebase ID token for the backend's access + refresh tokens via `POST /auth/firebase/exchange`.

Why use this: keep user authentication in Firebase (email/password, SSO), but let the backend issue short-lived access tokens and refresh tokens for session management and device/revocation control.

Client-side example (vanilla JS / React pseudocode):

1. Sign-in with Firebase (web) using the Firebase client SDK (email/password shown):

```js
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

async function signInAndExchange(email, password) {
  const auth = getAuth();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await userCredential.user.getIdToken();

  // Call backend exchange endpoint
  const resp = await fetch('/auth/firebase/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });

  if (!resp.ok) throw new Error('Exchange failed: ' + (await resp.text()));
  const json = await resp.json();

  // json = { accessToken, refreshToken }
  // Store tokens in memory or secure storage. Consider using httpOnly cookie for refresh tokens in production.
  localStorage.setItem('accessToken', json.accessToken);
  localStorage.setItem('refreshToken', json.refreshToken);
  return json;
}
```

Notes and best practices:
- Prefer the Firebase client SDK for authentication flows (sign-in, social providers, MFA).
- Use the exchange endpoint immediately after sign-in to obtain backend tokens for authorization when calling backend APIs.
- In production, consider setting the refresh token as an HttpOnly, Secure cookie to reduce XSS risk (backend supports that via `USE_COOKIE_REFRESH=1`).
- The backend will provision a local `User` record (if missing) and will copy the `role` claim from Firebase custom claims into the local user record during exchange.

Advanced: get role from custom claims
- If you set custom claims for a Firebase user (for example `admin`), the exchange endpoint copies that claim to the local DB. You can then call backend APIs using the issued `accessToken` which contains the `role` claim.

Security reminders:
- Keep your Firebase service account secret safe. For local demos `serviceAccountKey.json` may be present but must not be committed to source control.
- Revoke refresh tokens for compromised devices using backend device / refresh token revocation endpoints.

That's it — use this pattern to keep auth UX in Firebase while keeping session control in your backend.
