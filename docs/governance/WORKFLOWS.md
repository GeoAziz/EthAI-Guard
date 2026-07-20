# Advanced Governance Workflows

Complete implementation of approval workflows, compliance sign-offs, and audit callbacks for EthAI Guard governance platform.

## Overview

The governance system provides three core capabilities:

1. **Approval Workflows** - Multi-stage approval chains for model deployments, policy changes, and configuration updates
2. **Compliance Sign-Offs** - Formal compliance attestation with multi-role sign-off requirements
3. **Audit Callbacks** - Webhook-based event notifications for governance events

## Architecture

### Models

#### ApprovalWorkflow
```typescript
- workflowId: string (unique)
- name: string
- type: enum['model_deployment', 'model_retirement', 'policy_change', 'config_update']
- stages: ApprovalStage[]
  - stageId: string
  - name: string
  - order: number
  - approvalType: enum['sequential', 'parallel', 'any-of']
  - requiredApprovers: { count, roles[] }
  - slaHours: number
  - autoApprovalIfPastSLA: boolean
  - allowDelegation: boolean
- currentStage: number
- overallStatus: enum['pending', 'in_progress', 'approved', 'rejected', 'blocked']
- approvals: ApprovalRequest[]
  - requestId: string
  - stageId: string
  - approverEmail: string
  - status: enum['pending', 'approved', 'rejected', 'delegated', 'sla_expired']
  - decision: { approved, reason, comments, decisionTime }
  - delegatedTo: { email, reason, delegatedAt }
  - slaDeadline: Date
- events: GovernanceEvent[]
```

#### ComplianceSignOff
```typescript
- signOffId: string (unique)
- entityType: enum['model_version', 'model_card', 'deployment', 'policy']
- entityId: string
- complianceAreas: ComplianceArea[]
  - areaId: string
  - name: enum['fairness', 'explainability', 'data_protection', 'security', 'regulatory', 'ethical', 'operational']
  - checklist: ComplianceCheck[]
    - checkId: string
    - description: string
    - status: enum['pending', 'passed', 'failed', 'na']
    - evidence: string
    - verifiedBy: string
- signOffs: SignOffRecord[]
  - signOffRequestId: string
  - areaId: string
  - signedOffBy: { email, name, role }
  - signOffDate: Date
  - expiryDate: Date (optional)
  - status: enum['signed', 'revoked', 'expired']
  - attestation: string
- overallStatus: enum['draft', 'pending_review', 'approved', 'conditional_approval', 'rejected']
- readinessScore: number (0-100)
- riskAssessment: { overallRisk, identifiedRisks[], mitigationStatus }
- auditTrail: GovernanceEvent[]
```

#### AuditCallback
```typescript
- callbackId: string (unique)
- name: string
- url: string
- auth: { type, credentials }
- eventFilters: {
    eventTypes: string[]
    entityTypes: string[]
    statuses: string[]
    tags: string[]
  }
- delivery: {
    maxRetries: number
    retryDelaySeconds: number
    timeoutSeconds: number
  }
- status: enum['active', 'paused', 'disabled', 'error']
- deliveryHistory: DeliveryRecord[]
- metrics: { totalAttempts, successful, failed, averageResponseTimeMs }
```

## API Endpoints

### Approval Workflows

#### Create Workflow
```http
POST /api/governance/approval-workflows

{
  "name": "Model Deployment Review",
  "description": "Standard approval for production deployment",
  "type": "model_deployment",
  "stages": [
    {
      "stageId": "perf-review",
      "name": "Performance Review",
      "order": 1,
      "approvalType": "sequential",
      "requiredApprovers": {
        "count": 1,
        "roles": ["ml-engineer"]
      },
      "slaHours": 24,
      "autoApprovalIfPastSLA": false,
      "allowDelegation": true
    }
  ],
  "entityType": "model_version",
  "entityId": "model-123",
  "entityVersion": "v1.0.0"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "workflowId": "wf-xxx",
    "currentStage": 0,
    "overallStatus": "in_progress",
    "approvals": [...]
  }
}
```

#### Get Workflow History
```http
GET /api/governance/approval-workflows/:workflowId

Response: 200 OK
{
  "success": true,
  "data": {
    "workflow": {...},
    "events": [...],
    "approvalsSummary": {
      "total": 3,
      "approved": 1,
      "pending": 2,
      "rejected": 0
    },
    "slaStatus": {
      "req-1": {
        "deadline": "2025-01-15T10:00:00Z",
        "isExpired": false,
        "hoursRemaining": 18.5
      }
    }
  }
}
```

#### Submit Approval
```http
POST /api/governance/approval-workflows/:workflowId/approvals/:approvalRequestId

{
  "approved": true,
  "reason": "Metrics look good",
  "comments": "Fairness score improved from 0.92 to 0.96"
}

Response: 200 OK
{
  "success": true,
  "message": "Approval submitted",
  "data": {
    "workflowId": "wf-xxx",
    "currentStage": 0,
    "overallStatus": "in_progress"
  }
}
```

#### Delegate Approval
```http
POST /api/governance/approval-workflows/:workflowId/approvals/:approvalRequestId/delegate

{
  "delegateTo": "delegate@company.com",
  "reason": "Out of office until Monday"
}

Response: 200 OK
{
  "success": true,
  "message": "Approval delegated",
  "data": {...}
}
```

#### Get Pending Approvals for User
```http
GET /api/governance/approval-workflows/pending/:userEmail?role=ml-engineer

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "workflowId": "wf-1",
      "name": "Model Deployment Review",
      "entityId": "model-123",
      "currentStage": 0,
      "stageName": "Performance Review",
      "approvalsSummary": {...}
    }
  ]
}
```

### Compliance Sign-Offs

#### Create Sign-Off
```http
POST /api/governance/compliance-signoffs

{
  "entityType": "model_version",
  "entityId": "model-123",
  "entityVersion": "v1.0.0",
  "requiredSignOffs": [
    {
      "role": "compliance-officer",
      "count": 1
    },
    {
      "role": "privacy-lead",
      "count": 1
    }
  ],
  "reviewDeadline": "2025-01-20T17:00:00Z"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "signOffId": "cso-xxx",
    "overallStatus": "draft",
    "readinessScore": 0,
    "complianceAreas": [...]
  }
}
```

#### Get Compliance Report
```http
GET /api/governance/compliance-signoffs/:signOffId

Response: 200 OK
{
  "success": true,
  "data": {
    "signOffId": "cso-xxx",
    "entityType": "model_version",
    "overallStatus": "pending_review",
    "readinessScore": 75,
    "complianceSummary": [
      {
        "name": "fairness",
        "status": "compliant",
        "checksPassed": 3,
        "checksTotal": 3,
        "signedOff": false
      }
    ],
    "signOffCoverage": {
      "required": {
        "compliance-officer": { "role": "compliance-officer", "count": 1 },
        "privacy-lead": { "role": "privacy-lead", "count": 1 }
      },
      "signed": {
        "compliance-officer": [...]
      },
      "complete": false
    }
  }
}
```

#### Add Sign-Off
```http
POST /api/governance/compliance-signoffs/:signOffId/sign

{
  "areaId": "fairness",
  "areaName": "fairness",
  "comments": "Reviewed demographic parity across protected attributes",
  "attestation": "Model meets fairness compliance requirements per GDPR Article 22",
  "expiryDate": "2026-01-15"
}

Response: 200 OK
{
  "success": true,
  "message": "Sign-off submitted",
  "data": {...}
}
```

#### Update Compliance Checklist
```http
POST /api/governance/compliance-signoffs/:signOffId/checklist/:areaId

{
  "checklistUpdates": [
    {
      "checkId": "fair-1",
      "status": "passed",
      "evidence": "Demographic parity ratio: 0.95"
    },
    {
      "checkId": "fair-2",
      "status": "passed",
      "evidence": "Equal opportunity difference: 0.02"
    }
  ]
}

Response: 200 OK
{
  "success": true,
  "message": "Checklist updated",
  "data": {...}
}
```

#### Revoke Sign-Off
```http
POST /api/governance/compliance-signoffs/:signOffId/revoke/:signOffRequestId

{
  "reason": "Metrics updated, revalidation required"
}

Response: 200 OK
{
  "success": true,
  "message": "Sign-off revoked",
  "data": {...}
}
```

#### Risk Assessment
```http
POST /api/governance/compliance-signoffs/:signOffId/risk-assessment

{
  "overallRisk": "medium",
  "identifiedRisks": [
    {
      "riskId": "risk-1",
      "description": "Potential fairness issue with age group 25-34",
      "severity": "HIGH",
      "likelihood": "MEDIUM",
      "mitigationStrategy": "Monitor cohort performance weekly",
      "owner": "ml-team@company.com"
    }
  ],
  "mitigationStatus": "in_progress"
}

Response: 200 OK
{
  "success": true,
  "message": "Risk assessment updated",
  "data": {...}
}
```

### Audit Callbacks

#### Register Callback
```http
POST /api/governance/audit-callbacks

{
  "name": "Compliance Slack",
  "url": "https://hooks.slack.com/services/xxx",
  "description": "Send governance events to compliance channel",
  "auth": {
    "type": "none"
  },
  "headers": {
    "X-Custom-Header": "value"
  },
  "eventFilters": {
    "eventTypes": ["approval_completed", "compliance_violation"],
    "entityTypes": ["model_version"],
    "statuses": ["FAIL", "PASS"],
    "tags": ["high-risk"]
  },
  "delivery": {
    "maxRetries": 3,
    "retryDelaySeconds": 300,
    "timeoutSeconds": 30
  }
}

Response: 201 Created
{
  "success": true,
  "data": {
    "callbackId": "cb-xxx",
    "status": "active",
    "metrics": {...}
  }
}
```

#### Update Callback
```http
PUT /api/governance/audit-callbacks/:callbackId

{
  "name": "Updated Name",
  "status": "paused"
}

Response: 200 OK
```

#### Test Callback
```http
POST /api/governance/audit-callbacks/:callbackId/test

Response: 200 OK
{
  "success": true,
  "statusCode": 200,
  "response": {...}
}
```

#### Dispatch Event
```http
POST /api/governance/audit-callbacks/dispatch

{
  "eventType": "approval_completed",
  "entityType": "model_version",
  "entityId": "model-123",
  "status": "PASS",
  "tags": ["important"]
}

Response: 200 OK
{
  "success": true,
  "message": "Event dispatched to callbacks",
  "data": {
    "deliveries": ["del-1", "del-2"]
  }
}
```

#### Retry Pending Deliveries
```http
POST /api/governance/audit-callbacks/retry-pending

Response: 200 OK
{
  "success": true,
  "message": "5 deliveries retried",
  "data": {
    "retriedCount": 5
  }
}
```

#### Get Callback Metrics
```http
GET /api/governance/audit-callbacks/:callbackId/metrics

Response: 200 OK
{
  "success": true,
  "data": {
    "callbackId": "cb-xxx",
    "name": "Compliance Slack",
    "status": "active",
    "metrics": {
      "totalDeliveryAttempts": 150,
      "successfulDeliveries": 145,
      "failedDeliveries": 5,
      "averageResponseTimeMs": 250
    },
    "deliveryStatus": {
      "total": 150,
      "delivered": 145,
      "failed": 5,
      "pending": 0,
      "successRate": 96.67
    }
  }
}
```

## Helper Functions

### Initiate Deployment Approval
```javascript
const GovernanceHelper = require('../utils/governanceHelper');

const workflow = await GovernanceHelper.initiateDeploymentApproval(
  'model-123',
  'user@company.com',
  'tenant-1'
);
```

### Create Compliance Sign-Off
```javascript
const signOff = await GovernanceHelper.createModelComplianceSignOff(
  'model-123',
  'tenant-1',
  'user@company.com'
);
```

### Get Governance Status
```javascript
const status = await GovernanceHelper.getModelGovernanceStatus(
  'model-123',
  'tenant-1'
);

// Returns:
{
  modelVersion: 'model-123',
  approval: {
    workflowId: 'wf-xxx',
    status: 'in_progress',
    currentStage: 1,
    stageName: 'Fairness Review',
    approvalsSummary: { total: 3, approved: 1, pending: 2, rejected: 0 }
  },
  compliance: {
    signOffId: 'cso-xxx',
    status: 'pending_review',
    readinessScore: 85,
    signOffCoverage: { complete: false }
  },
  governance: {
    readyForDeployment: false,
    blockers: [
      { type: 'pending_approvals', count: 2 },
      { type: 'compliance_not_approved' }
    ]
  }
}
```

## Background Worker

The `GovernanceWorker` runs automatic tasks:

- **SLA Expiration Check** (every 5 minutes)
  - Detects expired approval SLAs
  - Auto-approves if configured
  - Sends notifications

- **Callback Delivery Retry** (every 1 minute)
  - Retries failed webhook deliveries
  - Respects backoff strategy
  - Disables callback after 10 consecutive failures

- **Compliance Expiry Check** (every 1 hour)
  - Detects sign-offs expiring in 30 days
  - Sends renewal notifications

- **Governance Metrics Update** (every 1 minute)
  - Tracks workflow and sign-off statistics
  - Logs to monitoring system

### Configuration

```env
# Optional: customize worker intervals (milliseconds)
GOVERNANCE_WORKER_INTERVAL_MS=60000
GOVERNANCE_SLA_CHECK_INTERVAL_MS=300000
GOVERNANCE_CALLBACK_RETRY_INTERVAL_MS=60000
GOVERNANCE_COMPLIANCE_EXPIRY_CHECK_MS=3600000
```

## Authentication & Authorization

All governance endpoints require authentication via `authGuard` middleware.

Role-based access control:
- `compliance-officer` - Can sign-off on compliance areas
- `ml-engineer` - Can approve performance aspects
- `fairness-reviewer` - Can approve fairness assessments
- `admin` - Full governance access

## Examples

### Complete Deployment Approval Flow

```javascript
// 1. Initiate approval workflow
const workflow = await GovernanceHelper.initiateDeploymentApproval(
  'model-v2.1.0',
  'alice@company.com',
  'tenant-1'
);

// 2. Create compliance sign-off
const signOff = await GovernanceHelper.createModelComplianceSignOff(
  'model-v2.1.0',
  'tenant-1',
  'alice@company.com'
);

// 3. Update compliance checklists (as tests run)
await ComplianceSignOffService.updateComplianceChecklist(
  signOff.signOffId,
  'fairness',
  [
    { checkId: 'fair-1', status: 'passed', evidence: 'Parity: 0.95' }
  ]
);

// 4. Approvers submit decisions
const approval = await ApprovalWorkflowService.submitApproval(
  workflow.workflowId,
  approval_request_id,
  { approved: true, reason: 'Metrics excellent', decidedBy: 'bob@company.com' }
);

// 5. Compliance officer signs off
await ComplianceSignOffService.addSignOff(signOff.signOffId, {
  areaId: 'fairness',
  areaName: 'fairness',
  signedOffBy: { email: 'charlie@company.com', name: 'Charlie', role: 'compliance-officer' },
  attestation: 'Model meets fairness requirements'
});

// 6. Check readiness
const status = await GovernanceHelper.getModelGovernanceStatus(
  'model-v2.1.0',
  'tenant-1'
);

if (status.governance.readyForDeployment) {
  // Deploy model
  await modelManager.deployModel('model-v2.1.0');
}
```

## Event Types for Webhooks

- `approval_initiated` - Workflow created
- `approval_submitted` - Approval decision made
- `approval_delegated` - Approval delegated to another user
- `sla_expired` - SLA deadline passed
- `stage_advanced` - Workflow moved to next stage
- `approval_completed` - All approvals done
- `approval_rejected` - Workflow rejected
- `compliance_signoff_created` - Sign-off created
- `compliance_checklist_updated` - Checklist progressed
- `signed_off` - Area signed off
- `signoff_revoked` - Sign-off revoked
- `compliance_risk_assessed` - Risk assessment completed

## Monitoring & Observability

Key metrics exported:
- `governance_workflows_total` - Total workflows by status
- `governance_approvals_pending` - Pending approvals
- `governance_sla_violations` - Expired SLAs
- `governance_callback_delivery_success_rate` - Webhook success rate
- `governance_compliance_signoffs_approved` - Approved sign-offs

Access metrics via `/metrics` endpoint.
