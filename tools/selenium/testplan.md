📘 EthAI-Guard — Test-First Execution Plan

(Single Source of Truth for Agent-Based Implementation)

0️⃣ Purpose of This Document (READ THIS FIRST)

This document exists to:

Lock product intent so no assistant “improvises”

Define page-level contracts that are binding

Drive automated E2E test generation

Enforce trust, auditability, and role isolation

Produce actionable logs after test failures

The coding assistant must not redesign UX, not reinterpret roles, and not weaken constraints.

If behavior is unclear, the assistant must:

Fail the test

Log why

Ask for clarification (via TODO comment)

1️⃣ Operating Principles (NON-NEGOTIABLE)
1.1 Test-First, Not Feature-First

Every page, action, and workflow must be validated via E2E tests

No UI is “done” until its tests pass

1.2 Page Contracts Are Law

Page contracts define what is allowed and forbidden

Implementation must conform to contracts, not the other way around

1.3 Role Separation Is Sacred

If a role cannot perform an action:

The UI must hide it

The API must reject it

Tests must verify both

1.4 Honesty Over Polish

Degraded explainability must be visible

Missing data must be explained

No silent fallback is allowed

2️⃣ System Roles (Authoritative)
Role	Core Responsibility
Data Scientist / User	Explore, analyze, understand
Auditor	Verify, export, annotate (read-only)
Admin	Control users, policies, access, system
Executive (optional)	Observe high-level risk only
3️⃣ Page-Level Contract System (CORE CONCEPT)

Every screen in EthAI-Guard must conform to a Page Contract.

A Page Contract defines:

Identity

Intent

Allowed Roles

Visible Capabilities

Forbidden Capabilities

States

Evidence Obligations

UX Invariants

E2E Assertions

4️⃣ Canonical Page Contract Template (USE THIS)
# Page Contract: <PAGE NAME>

## Identity
- Route: <canonical route>
- Auth: Public | Protected
- Roles Allowed: <list>

## Intent
What decision is the user here to make?

## Allowed Capabilities (By Role)
- User:
- Auditor:
- Admin:

## Forbidden Capabilities
Explicitly list actions that must never be possible.

## States
- loading
- empty
- ready
- degraded
- read-only
- error
- permission_denied

## Evidence Obligations
- Audit log required: Yes/No
- request_id required: Yes/No
- Signed artifact: Yes/No

## UX Invariants
- Things that must always be visible
- Things that must never appear
- Mode banners required

## E2E Assertions
- Deterministic checks Selenium must enforce

5️⃣ Mandatory Page Contracts (INITIAL SET)

The assistant must fully implement and test at least:

Landing /

Login /login

Dashboard /dashboard

Upload / Analyze /analyze

Jobs Queue /jobs

Job Detail /jobs/:id

Reports List /reports

Report Detail / ExplainBoard /reports/:id

Export Modal /reports/:id/export

Auditor Dashboard /dashboard/auditor

Admin User Management /admin/users

Admin Policy Editor /admin/policies

Audit Log /audit-log

Error Pages /403 /404 /500

Each page must have its own contract section.

6️⃣ ExplainBoard (SPECIAL CONTRACT RULES)

ExplainBoard is the core UX surface.

Mandatory Rules

Same page, different powers

Explicit mode banner required:

“Interactive Analysis Mode”

“Read-Only Audit View”

“Administrative Override Context”

Degraded State

If SHAP or explainability is unavailable:

Show degradation banner

Provide textual summary

Mark exports as “Partial Explainability”

Auditor Restrictions

No re-run

No parameter edits

No silent interactivity

7️⃣ Long-Running Jobs (MANDATORY BEHAVIOR)

All analysis jobs must:

Return jobId immediately

Appear in /jobs instantly

Persist across refresh

Survive network loss

Never duplicate on retry

Failure must show:

Friendly message

request_id

Retry guidance

8️⃣ Export & Evidence Rules (HIGH RISK AREA)

All exports must be signed

PII exports require explicit confirmation

Auditor exports may require approval

Every export creates an audit log entry

Download without audit = test failure

9️⃣ Logging & Failure Diagnostics (CRITICAL)
Test Failure Logs Must Include:

Page name

User role

Route

Expected vs actual behavior

request_id (if applicable)

Screenshot (DOM state)

Log Format (Required)
[TEST FAILURE]
Page: Report Detail / ExplainBoard
Role: Auditor
Action: Attempted export
Expected: Approval required
Actual: Export succeeded
request_id: abc-123

🔟 CI Expectations

Tests must run headless

Deterministic seed data

No reliance on manual setup

Fail fast on role leakage

Accessibility smoke tests included