# Firestore Rules and Indexes Deployment

This guide shows how to deploy Firestore security rules and composite indexes for the ethical evaluations audit trail.

## Prerequisites

- Firebase project ID (example: `studio-8429244671-dd548`)
- Access to the Firebase project (Owner/Editor)
- Node.js installed (for `npx`)

Files in this repo:
- `firebase.json` — wiring for Firestore rules and indexes
- `firestore.rules` — security rules (per-user access + immutability)
- `firestore.indexes.json` — composite indexes used by our queries

## Option A — Local CLI (interactive)

1. Login to Firebase:
   ```sh
   make firebase-login
   ```

2. Deploy rules + indexes (replace with your project ID):
   ```sh
   make deploy-firestore-all FIREBASE_PROJECT_ID=your-project-id
   ```

3. Verify:
   - Rules: Firebase Console → Firestore → Rules → should match `firestore.rules`
   - Indexes: Firebase Console → Firestore → Indexes → monitor build until “Ready”

## Option B — CI/CD with token

1. Create a CI token:
   ```sh
   npx --yes firebase-tools login:ci
   ```
   Save the output token as a secret in your CI system (e.g., `FIREBASE_TOKEN`).

2. Run deployments non-interactively (example):
   ```sh
   FIREBASE_TOKEN=*** npx --yes firebase-tools deploy \
     --project your-project-id \
     --only firestore
   ```

3. Or via Makefile targets:
   ```sh
   FIREBASE_TOKEN=*** make deploy-firestore-all FIREBASE_PROJECT_ID=your-project-id
   ```

## Security Rules (what we enforce)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ethical_evaluations/{evaluation_id} {
      allow read: if request.auth != null &&
                   resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null &&
                     request.resource.data.user_id == request.auth.uid;
      allow update, delete: if false; // immutable
    }
  }
}
```

- Per-user access: users can only read/create their own evaluations
- Immutability: updates/deletes are disallowed (audit trail integrity)

## Notes

- Index builds can take several minutes. Queries depending on new indexes will fail with an index error until the build completes.
- For production, keep your rules small and explicit. Extend rules for any new collections using the least-privilege approach.
- If you change rules or indexes, re-run the deployment commands.

## Troubleshooting

- Auth errors: Ensure you’re logged in (`make firebase-login`) and targeting the right project (`--project your-project-id`).
- Permission denied: Your account must have Editor or Owner role on the Firebase project.
- Index errors: Check the Firestore “Indexes” tab; wait for status to become Ready, or review error messages.
