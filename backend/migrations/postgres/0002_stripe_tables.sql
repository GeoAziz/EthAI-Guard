-- Stripe Integration Tables
-- Migration: Add Stripe customer/subscription columns and compliance reports
-- Version: 0002
--
-- This migration is additive to 0001_tenancy_billing.sql: it does NOT
-- redeclare subscriptions/invoices/usage_records (those already exist with
-- tenant_id as text, FK'd to tenants(tenant_id), and RLS keyed on the
-- app.tenant_id session variable set by src/db/postgres.js#withTenant). It
-- only adds the Stripe-specific columns those tables were missing, plus two
-- genuinely new tables (stripe_customers, compliance_reports) using the same
-- text tenant_id / app.tenant_id convention as 0001 for consistency.

-- ============================================================
-- stripe_customers: Map EthixAI tenants to Stripe customers
-- ============================================================
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL UNIQUE REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_tenant_id ON stripe_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stripe_customer_isolation ON stripe_customers;
CREATE POLICY stripe_customer_isolation ON stripe_customers
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================
-- subscriptions / invoices / usage_records: add Stripe-specific columns
-- to the tables 0001_tenancy_billing.sql already created. Do not
-- re-CREATE TABLE here — that previously produced a second, incompatible
-- schema (uuid tenant_id + app.current_tenant_id RLS) that silently
-- no-op'd under CREATE TABLE IF NOT EXISTS while stripeService.js kept
-- querying columns that only existed in the discarded definition.
-- ============================================================
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_item_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS overage_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ DEFAULT (now() + interval '30 days');

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);

-- ============================================================
-- compliance_reports: Store generated compliance report PDFs
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  analysis_id UUID,  -- Reference to analysis that generated this report
  s3_key VARCHAR(500),  -- S3 path if stored in object storage
  file_size INTEGER,  -- Bytes
  metadata JSONB DEFAULT '{}',  -- Report metadata: title, analyst, etc.
  generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 years'),  -- ECOA requires 7-year retention
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_tenant_id ON compliance_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_analysis_id ON compliance_reports(analysis_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_at ON compliance_reports(generated_at);

ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS compliance_report_isolation ON compliance_reports;
CREATE POLICY compliance_report_isolation ON compliance_reports
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================
-- Triggers: Auto-update timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_stripe_customers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stripe_customers_timestamp ON stripe_customers;
CREATE TRIGGER stripe_customers_timestamp
BEFORE UPDATE ON stripe_customers
FOR EACH ROW
EXECUTE FUNCTION update_stripe_customers_timestamp();

CREATE OR REPLACE FUNCTION update_subscriptions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_timestamp ON subscriptions;
CREATE TRIGGER subscriptions_timestamp
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_timestamp();

-- ============================================================
-- Grants for the low-privilege application role (see 0001).
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ethixai_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON stripe_customers, compliance_reports TO ethixai_app;
  END IF;
END
$$;

-- ============================================================
-- Cleanup Script (if needed)
-- ============================================================

/*
-- To rollback the additions from this migration (NOT recommended in production):
DROP TABLE IF EXISTS compliance_reports CASCADE;
DROP TABLE IF EXISTS stripe_customers CASCADE;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_subscription_id, DROP COLUMN IF EXISTS stripe_item_id, DROP COLUMN IF EXISTS cancelled_at;
ALTER TABLE invoices DROP COLUMN IF EXISTS stripe_invoice_id, DROP COLUMN IF EXISTS overage_cents, DROP COLUMN IF EXISTS usage_total, DROP COLUMN IF EXISTS due_at;
*/
