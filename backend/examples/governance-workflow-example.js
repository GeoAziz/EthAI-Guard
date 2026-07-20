/**
 * Example: Complete Governance Workflow Implementation
 *
 * This file demonstrates how to use the governance workflows for a
 * model deployment scenario with approval and compliance sign-off.
 */

const ApprovalWorkflowService = require('../src/services/approvalWorkflowService');
const ComplianceSignOffService = require('../src/services/complianceSignOffService');
const AuditCallbackService = require('../src/services/auditCallbackService');
const GovernanceHelper = require('../src/utils/governanceHelper');

// ============ SCENARIO: MODEL DEPLOYMENT WITH FULL GOVERNANCE ============

async function deployModelWithGovernance() {
  const modelVersion = 'model-v2.1.0';
  const tenantId = 'acme-corp';
  const initiatedBy = 'alice@acme.com';

  console.log(`\n🚀 Starting governance workflow for ${modelVersion}\n`);

  try {
    // ============ STEP 1: Register Audit Callbacks ============
    console.log('📧 Step 1: Registering audit callbacks...');

    const callbacks = await GovernanceHelper.registerGovernanceCallbacks(tenantId, {
      slackWebhook: process.env.SLACK_WEBHOOK_URL,
      emailWebhook: process.env.EMAIL_WEBHOOK_URL,
      emailApiKey: process.env.EMAIL_API_KEY,
    });

    console.log(`✅ Registered ${callbacks.length} callbacks`);

    // ============ STEP 2: Initiate Approval Workflow ============
    console.log('\n📋 Step 2: Creating approval workflow...');

    const workflow = await GovernanceHelper.initiateDeploymentApproval(
      modelVersion,
      initiatedBy,
      tenantId,
    );

    console.log(`✅ Approval workflow created: ${workflow.workflowId}`);
    console.log(`   Stages: ${workflow.stages.map(s => s.name).join(' → ')}`);
    console.log(`   Pending approvals: ${workflow.approvals.length}`);

    // Dispatch event to callbacks
    await GovernanceHelper.dispatchGovernanceEvent(
      'approval_initiated',
      modelVersion,
      modelVersion,
      { workflowId: workflow.workflowId },
    );

    // ============ STEP 3: Create Compliance Sign-Off ============
    console.log('\n✓ Step 3: Creating compliance sign-off...');

    const signOff = await GovernanceHelper.createModelComplianceSignOff(
      modelVersion,
      tenantId,
      initiatedBy,
    );

    console.log(`✅ Compliance sign-off created: ${signOff.signOffId}`);
    console.log(`   Compliance areas: ${signOff.complianceAreas.map(a => a.name).join(', ')}`);
    console.log(`   Required sign-offs: ${signOff.requiredSignOffs.map(r => r.role).join(', ')}`);

    // ============ STEP 4: Simulate Compliance Checks ============
    console.log('\n🔍 Step 4: Running compliance checks...');

    // Fairness compliance
    await ComplianceSignOffService.updateComplianceChecklist(
      signOff.signOffId,
      'fairness',
      [
        {
          checkId: 'fair-1',
          status: 'passed',
          evidence: 'Demographic parity ratio: 0.95 (within acceptable range)',
        },
        {
          checkId: 'fair-2',
          status: 'passed',
          evidence: 'Equal opportunity difference: 0.02 (below 0.10 threshold)',
        },
        {
          checkId: 'fair-3',
          status: 'passed',
          evidence: 'Disparate impact ratio: 0.92 (above 0.80 threshold)',
        },
      ],
    );

    // Explainability compliance
    await ComplianceSignOffService.updateComplianceChecklist(
      signOff.signOffId,
      'explainability',
      [
        {
          checkId: 'exp-1',
          status: 'passed',
          evidence: 'SHAP explanations generated for all predictions',
        },
        {
          checkId: 'exp-2',
          status: 'passed',
          evidence: 'Feature importance: [age:0.32, income:0.28, credit_history:0.25, ...]',
        },
      ],
    );

    // Data protection compliance
    await ComplianceSignOffService.updateComplianceChecklist(
      signOff.signOffId,
      'data_protection',
      [
        {
          checkId: 'dp-1',
          status: 'passed',
          evidence: 'PII removal confirmed: no emails, phone numbers, or SSNs',
        },
        {
          checkId: 'dp-2',
          status: 'passed',
          evidence: 'GDPR Article 22 compliance verified',
        },
      ],
    );

    console.log('✅ Compliance checks completed');

    // ============ STEP 5: Risk Assessment ============
    console.log('\n⚠️  Step 5: Assessing risks...');

    await ComplianceSignOffService.assessRisks(signOff.signOffId, {
      overallRisk: 'medium',
      identifiedRisks: [
        {
          riskId: 'risk-1',
          description: 'Potential bias in age group 25-34 (slightly lower accuracy)',
          severity: 'HIGH',
          likelihood: 'LOW',
          mitigationStrategy: 'Monitor cohort performance weekly for first month',
          owner: 'ml-team@acme.com',
        },
      ],
      mitigationStatus: 'in_progress',
    });

    console.log('✅ Risk assessment completed');

    // ============ STEP 6: Approvers Review ============
    console.log('\n👥 Step 6: Approval workflow in progress...');

    // Get workflow details
    const workflowStatus = await ApprovalWorkflowService.getWorkflowHistory(
      workflow.workflowId,
    );

    console.log(`   Current stage: ${workflowStatus.workflow.stages[workflowStatus.workflow.currentStage].name}`);
    console.log(`   Pending approvers:`);

    const pendingApprovals = workflowStatus.workflow.approvals.filter(a => a.status === 'pending');
    pendingApprovals.forEach(approval => {
      const slaStatus = workflowStatus.slaStatus[approval.requestId];
      const hoursRemaining = slaStatus ? slaStatus.hoursRemaining.toFixed(1) : 'N/A';
      console.log(`     - ${approval.approverEmail} (${hoursRemaining}h remaining)`);
    });

    // Simulate approval from performance reviewer
    if (pendingApprovals.length > 0) {
      const approval1 = pendingApprovals[0];
      await ApprovalWorkflowService.submitApproval(
        workflow.workflowId,
        approval1.requestId,
        {
          approved: true,
          reason: 'Performance metrics look excellent',
          comments: 'F1 score improved from 0.92 to 0.96. No fairness degradation detected.',
          decidedBy: 'bob@acme.com',
        },
      );

      console.log(`   ✅ Approved by ${approval1.approverEmail}`);

      await GovernanceHelper.dispatchGovernanceEvent(
        'approval_submitted',
        modelVersion,
        modelVersion,
        { approved: true, stage: 'Performance Review' },
      );
    }

    // ============ STEP 7: Compliance Sign-Off ============
    console.log('\n✍️  Step 7: Compliance sign-off...');

    await ComplianceSignOffService.addSignOff(signOff.signOffId, {
      areaId: 'fairness',
      areaName: 'fairness',
      signedOffBy: {
        email: 'compliance@acme.com',
        name: 'Compliance Officer',
        role: 'compliance-officer',
      },
      comments: 'Model meets fairness requirements. Demographic parity maintained.',
      attestation: 'I hereby attest that this model meets all fairness compliance requirements per EU AI Act Article 6 and GDPR Article 22.',
      expiryDate: new Date('2025-12-31'),
    });

    console.log('✅ Compliance sign-off submitted');

    // ============ STEP 8: Check Readiness for Deployment ============
    console.log('\n🎯 Step 8: Checking deployment readiness...');

    const status = await GovernanceHelper.getModelGovernanceStatus(modelVersion, tenantId);

    console.log(`   Approval status: ${status.approval?.status || 'N/A'}`);
    console.log(`   Compliance status: ${status.compliance?.status || 'N/A'}`);
    console.log(`   Compliance readiness score: ${status.compliance?.readinessScore || 0}%`);
    console.log(`   Ready for deployment: ${status.governance.readyForDeployment ? '✅ YES' : '❌ NO'}`);

    if (status.governance.blockers.length > 0) {
      console.log(`   Blockers:`);
      status.governance.blockers.forEach(blocker => {
        console.log(`     - ${blocker.type}: ${JSON.stringify(blocker)}`);
      });
    }

    // ============ STEP 9: Get Compliance Report ============
    console.log('\n📊 Step 9: Generating compliance report...');

    const report = await ComplianceSignOffService.getComplianceReport(signOff.signOffId);

    console.log(`   Overall Status: ${report.overallStatus}`);
    console.log(`   Readiness Score: ${report.readinessScore}%`);
    console.log(`   Risk Level: ${report.riskAssessment?.overallRisk || 'Not assessed'}`);
    console.log('\n   Compliance Areas:');

    report.complianceSummary.forEach(area => {
      const checksPassed = area.checksPassed;
      const checksTotal = area.checksTotal;
      const status = area.status;
      const signedOff = area.signedOff ? '✓' : '✗';

      console.log(`     ${area.name}: ${checksPassed}/${checksTotal} checks passed [${status}] ${signedOff}`);
    });

    // ============ STEP 10: Callback Metrics ============
    if (callbacks.length > 0) {
      console.log('\n📈 Step 10: Callback delivery metrics...');

      for (const callback of callbacks) {
        const metrics = await AuditCallbackService.getCallbackMetrics(callback.callbackId);
        console.log(`   ${callback.name}:`);
        console.log(`     Status: ${metrics.status}`);
        console.log(`     Success Rate: ${metrics.deliveryStatus.successRate.toFixed(1)}%`);
        console.log(`     Total Attempts: ${metrics.metrics.totalDeliveryAttempts}`);
      }
    }

    console.log('\n✅ Complete governance workflow executed successfully!\n');

    return {
      modelVersion,
      workflowId: workflow.workflowId,
      signOffId: signOff.signOffId,
      governanceStatus: status,
      complianceReport: report,
    };
  } catch (error) {
    console.error('\n❌ Error during governance workflow:', error.message);
    throw error;
  }
}

// ============ ADDITIONAL EXAMPLES ============

async function exampleDelegation() {
  console.log('\n=== EXAMPLE: Approval Delegation ===\n');

  const workflowId = 'wf-123';
  const approvalRequestId = 'req-456';

  try {
    const workflow = await ApprovalWorkflowService.delegateApproval(
      workflowId,
      approvalRequestId,
      'delegate@acme.com',
      'Original approver is out of office until next Monday',
    );

    console.log('✅ Approval delegated successfully');
    console.log(`   Original approver: alice@acme.com`);
    console.log(`   Delegated to: delegate@acme.com`);
    console.log(`   New approval created for delegated approver`);
  } catch (error) {
    console.log('Note: This is an example. In production, both users would exist.');
  }
}

async function exampleCallbackFiltering() {
  console.log('\n=== EXAMPLE: Callback Event Filtering ===\n');

  // Webhook that only triggers on critical failures
  const criticalFailureWebhook = {
    name: 'Critical Alerts',
    url: 'https://alerting.acme.com/critical',
    eventFilters: {
      eventTypes: ['approval_rejected', 'compliance_violation'],
      entityTypes: ['model_version'],
      statuses: ['FAIL'],
      tags: ['critical'],
    },
  };

  // Webhook for all governance events
  const allEventsWebhook = {
    name: 'Audit Trail',
    url: 'https://audit.acme.com/events',
    eventFilters: {
      eventTypes: [], // Empty means all event types
      entityTypes: ['model_version'],
      statuses: [],
      tags: [],
    },
  };

  console.log('Critical Failure Webhook:');
  console.log(`  - Only triggers on: ${criticalFailureWebhook.eventFilters.eventTypes.join(', ')}`);
  console.log(`  - Only for: ${criticalFailureWebhook.eventFilters.statuses.join(', ')} status`);
  console.log(`  - With tags: ${criticalFailureWebhook.eventFilters.tags.join(', ')}`);

  console.log('\nAll Events Webhook:');
  console.log(`  - Triggers on: all event types`);
  console.log(`  - For entities: ${allEventsWebhook.eventFilters.entityTypes.join(', ')}`);
}

// Export for use in other modules
module.exports = {
  deployModelWithGovernance,
  exampleDelegation,
  exampleCallbackFiltering,
};

// Run example if invoked directly
if (require.main === module) {
  deployModelWithGovernance()
    .then(() => {
      console.log('Example completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Example failed:', error);
      process.exit(1);
    });
}
