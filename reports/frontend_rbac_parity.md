# Frontend ↔ Backend RBAC Parity Report

Generated: 2025-11-29T16:03:47.334Z

## Summary

- backend endpoints scanned: 40
- frontend pages scanned: 67
- mismatches (page calls protected endpoint but page lacks required role): 0
- backend protected endpoints not referenced by frontend pages: 9

## Backend protected endpoints not referenced by any frontend page

- /logs (roles: ["admin"], files: ["auditLogs.js"])
- /logs/{model_id}/trail (roles: ["admin"], files: ["auditLogs.js"])
- /summary (roles: ["admin"], files: ["auditLogs.js"])
- /log (roles: ["admin"], files: ["auditLogs.js"])
- /violations (roles: ["admin"], files: ["auditLogs.js"])
- /compliance-rate (roles: ["admin"], files: ["auditLogs.js"])
- /event-types (roles: ["admin"], files: ["auditLogs.js"])
- /actors (roles: ["admin"], files: ["auditLogs.js"])
- /timeline (roles: ["admin"], files: ["auditLogs.js"])

## Backend called by pages (mapping)

- /v1/users/promote 
  - Called by: /dashboard/admin/access-requests, /dashboard/admin/users
- /v1/users/sync-claims 
  - Called by: /dashboard/admin/access-requests, /dashboard/admin/users
- /v1/access-requests 
  - Called by: /dashboard/admin/access-requests, /dashboard/request-access
- models_promote 
  - Called by: /models/[id]/promote (unknown mapping)
- models_trigger_retrain 
  - Called by: /models/[id]/retrain (unknown mapping), /monitor/drift (unknown mapping)
