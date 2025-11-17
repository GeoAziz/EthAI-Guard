# Day 18 Manual Test Log

Date: 2025-11-17
Author: Automation
Scope: Storage persistence, history APIs, frontend History pages

## Environment
- Backend: Express (AUTH_PROVIDER=firebase recommended for history)
- Frontend: Next.js (NEXT_PUBLIC_API_URL=http://localhost:5000)
- Firestore: Firebase Admin SDK; if unavailable tests verify graceful handling

## Test Matrix

1) POST /v1/evaluate persists evaluation
- Input: user_id=user123, model_id=modelA, input_features={age:30,income:50000}
- Expected: 200 OK, response contains risk, explanation, rules, simulation; storage_id present when Firestore available
- Result: PASS (storage_id returned when Firestore mocked)

2) GET /v1/evaluations (no filters)
- Pre: at least 1 eval stored for user123
- Expected: 200 OK, evaluations array length >= 1, ordered by timestamp desc
- Result: PASS (returns 1 record in mocked env)

3) GET /v1/evaluations?risk_level=medium
- Expected: All results have risk_level=medium
- Result: PASS in mocked env

4) GET /v1/evaluations?model_id=modelA
- Expected: All results model_id=modelA
- Result: PASS in mocked env

5) GET /v1/evaluations pagination
- Request: limit=1&offset=1
- Expected: Returns at most 1 record, different from first page
- Result: PASS in mocked env

6) GET /v1/evaluations/:id returns full record
- Expected: 200 OK with full_simulation, full_rules, full_risk, input_features, explanation
- Result: PASS in mocked env

7) GET /v1/evaluations/:id not found
- Input: invalid id
- Expected: 404 evaluation_not_found
- Result: PASS

8) GET /v1/evaluations/:id unauthorized
- Pre: evaluation belongs to another user
- Expected: 403 forbidden; log unauthorized_access_attempt
- Result: PASS

9) Frontend /history page
- Expected: Loads list, shows filters, cards animate-in, pagination works, empty/error states render appropriately
- Result: PASS (UI renders with mocked API)

10) Frontend /history/[id] page
- Expected: Renders 5 sections: summary, triggered rules, explanation, JSON viewer (collapsible), re-evaluate button
- Result: PASS (UI renders; re-evaluate navigates to /decision-analysis with prefilled params)

## Notes & Follow-ups
- Create Firestore composite indexes for (user_id,timestamp), (user_id,risk_level,timestamp), (user_id,model_id,timestamp)
- Consider adding cursor-based pagination if >1000 docs expected
- Optional: add firebaseAuth to POST /v1/evaluate to ensure user_id integrity and auto-derive from token
