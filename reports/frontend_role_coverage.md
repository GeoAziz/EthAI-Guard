# Frontend Role Coverage Report

Generated: 2025-11-29T16:00:04.682Z

Total scanned pages: 67

## Role -> Pages (heuristic)

### admin (32)

- /dashboard/admin/access-requests
- /dashboard/admin/audit
- /dashboard/admin/billing
- /dashboard/admin/datasets
- /dashboard/admin/fairness
- /dashboard/admin/models
- /dashboard/admin
- /dashboard/admin/reports
- /dashboard/admin/settings
- /dashboard/admin/users
- /dashboard/analyst/reports/[id]
- /dashboard/analyst/reports
- /dashboard/analyst/run
- /dashboard/compliance
- /dashboard/request-access
- /dashboard/reviewer/audit
- /dashboard/reviewer/fairness
- /dashboard/reviewer/profile
- /dashboard/reviewer/review/[id]
- /dashboard/reviewer/thresholds
- /dashboard/user/profile
- /dashboard/user/reports
- /dashboard/user/run
- /datasets
- /explainability
- /fairness
- /guest
- /login
- /models/[id]/promote
- /models/[id]/retrain
- /models
- /monitor/drift

### analyst (9)

- /dashboard/analyst
- /dashboard/analyst/reports/[id]
- /dashboard/analyst/reports
- /dashboard/analyst/run
- /datasets
- /explainability
- /fairness
- /guest
- /models

### reviewer (8)

- /dashboard/compliance
- /dashboard/reviewer/audit
- /dashboard/reviewer/fairness
- /dashboard/reviewer
- /dashboard/reviewer/profile
- /dashboard/reviewer/review/[id]
- /dashboard/reviewer/thresholds
- /guest

### user (5)

- /dashboard/user
- /dashboard/user/profile
- /dashboard/user/reports
- /dashboard/user/run
- /guest

### guest (1)

- /guest

### unknown (32)

- /about
- /api-reference
- /blog
- /careers
- /community/discord
- /dashboard/explainboard
- /dashboard/fairlens
- /dashboard
- /dashboard/settings
- /decision-analysis
- /demo/firebase-exchange
- /docs/authentication
- /docs/compliance
- /docs/contributing
- /docs/data-format
- /docs/explainability
- /docs/fairness-metrics
- /docs/installation
- /docs
- /docs/quick-start
- /firebase-exchange-demo
- /history/[id]
- /history
- /
- /post-login
- /register
- /report/[id]
- /report
- /status
- /unauthorized
- /validation/[id]
- /validation

## Per-page details

| Route | File | RoleProtected | requiredRole | hasRoleChecks | backendCalls |
|---|---|---:|---|---:|---|
| /about | frontend/src/app/about/page.tsx | no |  | no |  |
| /api-reference | frontend/src/app/api-reference/page.tsx | no |  | no |  |
| /blog | frontend/src/app/blog/page.tsx | no |  | no |  |
| /careers | frontend/src/app/careers/page.tsx | no |  | no |  |
| /community/discord | frontend/src/app/community/discord/page.tsx | no |  | no |  |
| /dashboard/admin/access-requests | frontend/src/app/dashboard/admin/access-requests/page.tsx | yes | admin | no | /v1/users/promote, /v1/users/sync-claims, /v1/access-requests |
| /dashboard/admin/audit | frontend/src/app/dashboard/admin/audit/page.tsx | yes | admin | no |  |
| /dashboard/admin/billing | frontend/src/app/dashboard/admin/billing/page.tsx | yes | admin | no |  |
| /dashboard/admin/datasets | frontend/src/app/dashboard/admin/datasets/page.tsx | yes | admin | no |  |
| /dashboard/admin/fairness | frontend/src/app/dashboard/admin/fairness/page.tsx | yes | admin | no |  |
| /dashboard/admin/models | frontend/src/app/dashboard/admin/models/page.tsx | yes | admin | no |  |
| /dashboard/admin | frontend/src/app/dashboard/admin/page.tsx | yes | admin | no |  |
| /dashboard/admin/reports | frontend/src/app/dashboard/admin/reports/page.tsx | yes | admin | no |  |
| /dashboard/admin/settings | frontend/src/app/dashboard/admin/settings/page.tsx | yes | admin | no |  |
| /dashboard/admin/users | frontend/src/app/dashboard/admin/users/page.tsx | yes | admin | no | /v1/users/promote, /v1/users/sync-claims |
| /dashboard/analyst | frontend/src/app/dashboard/analyst/page.tsx | yes | analyst | no |  |
| /dashboard/analyst/reports/[id] | frontend/src/app/dashboard/analyst/reports/[id]/page.tsx | yes | analyst | no |  |
| /dashboard/analyst/reports | frontend/src/app/dashboard/analyst/reports/page.tsx | yes | analyst | no |  |
| /dashboard/analyst/run | frontend/src/app/dashboard/analyst/run/page.tsx | yes | analyst | no |  |
| /dashboard/compliance | frontend/src/app/dashboard/compliance/page.tsx | yes | reviewer | no |  |
| /dashboard/explainboard | frontend/src/app/dashboard/explainboard/page.tsx | no |  | no |  |
| /dashboard/fairlens | frontend/src/app/dashboard/fairlens/page.tsx | no |  | no |  |
| /dashboard | frontend/src/app/dashboard/page.tsx | no |  | no |  |
| /dashboard/request-access | frontend/src/app/dashboard/request-access/page.tsx | no |  | yes | /v1/access-requests |
| /dashboard/reviewer/audit | frontend/src/app/dashboard/reviewer/audit/page.tsx | yes | reviewer | no |  |
| /dashboard/reviewer/fairness | frontend/src/app/dashboard/reviewer/fairness/page.tsx | yes | reviewer | no |  |
| /dashboard/reviewer | frontend/src/app/dashboard/reviewer/page.tsx | yes | reviewer | no |  |
| /dashboard/reviewer/profile | frontend/src/app/dashboard/reviewer/profile/page.tsx | yes | reviewer | no |  |
| /dashboard/reviewer/review/[id] | frontend/src/app/dashboard/reviewer/review/[id]/page.tsx | yes | reviewer | no |  |
| /dashboard/reviewer/thresholds | frontend/src/app/dashboard/reviewer/thresholds/page.tsx | yes | reviewer | no |  |
| /dashboard/settings | frontend/src/app/dashboard/settings/page.tsx | no |  | no |  |
| /dashboard/user | frontend/src/app/dashboard/user/page.tsx | yes | user | no |  |
| /dashboard/user/profile | frontend/src/app/dashboard/user/profile/page.tsx | yes | user | no |  |
| /dashboard/user/reports | frontend/src/app/dashboard/user/reports/page.tsx | yes | user | no |  |
| /dashboard/user/run | frontend/src/app/dashboard/user/run/page.tsx | yes | user | no |  |
| /datasets | frontend/src/app/datasets/page.tsx | yes | analyst | no |  |
| /decision-analysis | frontend/src/app/decision-analysis/page.tsx | no |  | no |  |
| /demo/firebase-exchange | frontend/src/app/demo/firebase-exchange/page.tsx | no |  | no |  |
| /docs/authentication | frontend/src/app/docs/authentication/page.tsx | no |  | no |  |
| /docs/compliance | frontend/src/app/docs/compliance/page.tsx | no |  | no |  |
| /docs/contributing | frontend/src/app/docs/contributing/page.tsx | no |  | no |  |
| /docs/data-format | frontend/src/app/docs/data-format/page.tsx | no |  | no |  |
| /docs/explainability | frontend/src/app/docs/explainability/page.tsx | no |  | no |  |
| /docs/fairness-metrics | frontend/src/app/docs/fairness-metrics/page.tsx | no |  | no |  |
| /docs/installation | frontend/src/app/docs/installation/page.tsx | no |  | no |  |
| /docs | frontend/src/app/docs/page.tsx | no |  | no |  |
| /docs/quick-start | frontend/src/app/docs/quick-start/page.tsx | no |  | no |  |
| /explainability | frontend/src/app/explainability/page.tsx | yes | analyst | no |  |
| /fairness | frontend/src/app/fairness/page.tsx | yes | analyst | no |  |
| /firebase-exchange-demo | frontend/src/app/firebase-exchange-demo/page.tsx | no |  | no |  |
| /guest | frontend/src/app/guest/page.tsx | yes | guest | no |  |
| /history/[id] | frontend/src/app/history/[id]/page.tsx | no |  | no |  |
| /history | frontend/src/app/history/page.tsx | no |  | no |  |
| /login | frontend/src/app/login/page.tsx | no |  | yes |  |
| /models/[id]/promote | frontend/src/app/models/[id]/promote/page.tsx | yes | admin | yes | models_promote |
| /models/[id]/retrain | frontend/src/app/models/[id]/retrain/page.tsx | yes | admin | yes | models_trigger_retrain |
| /models | frontend/src/app/models/page.tsx | yes | analyst | no |  |
| /monitor/drift | frontend/src/app/monitor/drift/page.tsx | no |  | no | models_trigger_retrain |
| / | frontend/src/app/page.tsx | no |  | no |  |
| /post-login | frontend/src/app/post-login/page.tsx | no |  | no |  |
| /register | frontend/src/app/register/page.tsx | no |  | no |  |
| /report/[id] | frontend/src/app/report/[id]/page.tsx | no |  | no |  |
| /report | frontend/src/app/report/page.tsx | no |  | no |  |
| /status | frontend/src/app/status/page.tsx | no |  | no |  |
| /unauthorized | frontend/src/app/unauthorized/page.tsx | no |  | no |  |
| /validation/[id] | frontend/src/app/validation/[id]/page.tsx | no |  | no |  |
| /validation | frontend/src/app/validation/page.tsx | no |  | no |  |
