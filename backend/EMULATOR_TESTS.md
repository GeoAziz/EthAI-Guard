Running Firebase Auth emulator tests

This document explains how to run the Firebase Auth emulator and the integration tests that exercise it.

Purpose
- Run integration tests that exercise /auth/firebase/exchange, claims sync, access request flows and other auth-dependent routes against the Firebase Auth emulator.

Local quickstart
1. Install the Firebase CLI (recommended) or rely on npx:
   - npm i -g firebase-tools
   - or use npx in the helper script

2. From the repo root run the convenience helper (it will start the Auth emulator and run tests):

```bash
cd backend
./scripts/run_emulator_and_tests.sh
```

What the helper does
- sets FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 and FIREBASE_PROJECT=demo-project
- starts the Firebase Auth emulator only (faster than starting all emulators)
- waits for the emulator to be ready
- runs `npm test` inside `backend`
- stops the emulator on completion

CI (existing workflow)
- A GitHub Actions workflow exists at `.github/workflows/backend-emulator-tests.yml`.
- The workflow installs `firebase-tools` and runs `backend/scripts/ci_run_emulator_and_tests.sh`, which starts the Auth emulator and executes the Jest test suite.

Notes
- The Jest tests are written to skip emulator integration tests when `FIREBASE_AUTH_EMULATOR_HOST` is not set. That avoids false failures on machines where the emulator is not available.
- If you want to iterate faster, you may start the emulator in a separate terminal with `npx firebase emulators:start --only auth --project demo-project` and then run `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 npm test` in `backend`.

Troubleshooting
- If the helper fails to start the emulator, inspect `backend/firebase-emulator.log` for details.
- Ensure `firebase-tools` is available (global install or via npx).
- If ports conflict, update `AUTH_PORT` (9099) in the helper script and the workflow accordingly.
