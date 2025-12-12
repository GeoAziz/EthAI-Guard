#!/usr/bin/env node
/**
 * Demo Data Seeding Script for EthixAI
 * 
 * This script creates:
 * 1. Demo user account
 * 2. Sample datasets
 * 3. Pre-computed analysis results
 * 4. Compliance reports
 * 
 * Usage:
 *   node tools/demo/seed-demo-data.js
 * 
 * Requirements:
 *   - MongoDB running
 *   - Backend environment configured
 */

const admin = require('firebase-admin');
const { MongoClient } = require('mongodb');

const crypto = require('crypto');
// Configuration
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27018/ethixai';
const DEMO_USER = {
  email: 'demo@ethixai.com',
  password: 'SecureDemo2024!',
  displayName: 'Demo Investor',
  role: 'demo',
};

// Small helper to generate cryptographically secure API keys.
// Uses crypto.randomBytes and returns a hex string suffix.
// Adjust bytes (default 18) if you need a different length.
function generateApiKey(prefix = 'demo_api_key_', bytes = 18) {
  return prefix + crypto.randomBytes(bytes).toString('hex');
}

// Initialize Firebase Admin (if using Firebase Auth)
let firebaseApp;
try {
  if (!admin.apps.length) {
    const serviceAccount = require('../../serviceAccountKey.json');
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (error) {
  console.warn('⚠️  Firebase Admin not configured. Skipping Firebase user creation.');
}

// Sample datasets for demo
const DEMO_DATASETS = [
  {
    name: 'loan_applications_q4_2024.csv',
    description: 'Quarterly loan application data for fairness analysis',
    uploadedAt: new Date('2024-11-01'),
    rows: 1000,
    columns: 12,
    sensitiveAttributes: ['gender', 'race', 'age_group'],
    targetColumn: 'approved',
    status: 'processed',
  },
  {
    name: 'credit_scoring_historical.csv',
    description: 'Historical credit scoring model data',
    uploadedAt: new Date('2024-10-15'),
    rows: 5000,
    columns: 15,
    sensitiveAttributes: ['gender', 'ethnicity', 'zip_code'],
    targetColumn: 'credit_approved',
    status: 'processed',
  },
];

// Pre-computed analysis results
const DEMO_ANALYSES = [
  {
    analysisId: 'demo-analysis-001',
    datasetName: 'loan_applications_q4_2024.csv',
    createdAt: new Date('2024-11-01T10:30:00Z'),
    status: 'completed',
    summary: {
      overallFairnessScore: 0.83,
      riskLevel: 'medium',
      biasMetrics: {
        demographicParity: {
          gender: 0.08,
          race: 0.12,
          ageGroup: 0.06,
        },
        equalOpportunity: {
          gender: 0.05,
          race: 0.09,
          ageGroup: 0.04,
        },
        disparateImpact: {
          gender: 0.88,
          race: 0.82,
          ageGroup: 0.91,
        },
      },
      featureImportance: {
        credit_score: 0.35,
        debt_to_income: 0.28,
        income: 0.22,
        previous_defaults: 0.15,
        employment_years: 0.08,
        age: 0.05,
        loan_amount: 0.04,
        gender: 0.02,
      },
      shapValues: {
        credit_score: 0.35,
        debt_to_income: 0.28,
        income: 0.22,
        previous_defaults: 0.15,
      },
      violations: [
        {
          level: 'high',
          attribute: 'race',
          metric: 'disparate_impact',
          value: 0.82,
          threshold: 0.80,
          description: 'Disparate impact detected for race attribute (0.82 vs 0.80 threshold)',
          recommendation: 'Review training data for racial bias. Consider reweighting or synthetic data augmentation.',
        },
        {
          level: 'medium',
          attribute: 'race',
          metric: 'demographic_parity',
          value: 0.12,
          threshold: 0.10,
          description: 'Demographic parity difference exceeds threshold for race',
          recommendation: 'Implement fairness constraints during model training.',
        },
      ],
      complianceScore: 75,
      complianceStatus: 'needs_review',
    },
  },
  {
    analysisId: 'demo-analysis-002',
    datasetName: 'credit_scoring_historical.csv',
    createdAt: new Date('2024-10-15T14:20:00Z'),
    status: 'completed',
    summary: {
      overallFairnessScore: 0.91,
      riskLevel: 'low',
      biasMetrics: {
        demographicParity: {
          gender: 0.04,
          ethnicity: 0.07,
          zipCode: 0.05,
        },
        equalOpportunity: {
          gender: 0.03,
          ethnicity: 0.06,
          zipCode: 0.04,
        },
        disparateImpact: {
          gender: 0.94,
          ethnicity: 0.89,
          zipCode: 0.92,
        },
      },
      featureImportance: {
        payment_history: 0.42,
        credit_utilization: 0.31,
        account_age: 0.18,
        recent_inquiries: 0.09,
      },
      shapValues: {
        payment_history: 0.42,
        credit_utilization: 0.31,
        account_age: 0.18,
        recent_inquiries: 0.09,
      },
      violations: [],
      complianceScore: 91,
      complianceStatus: 'compliant',
    },
  },
];

// Compliance reports
const DEMO_COMPLIANCE_REPORTS = [
  {
    reportId: 'compliance-001',
    analysisId: 'demo-analysis-001',
    generatedAt: new Date('2024-11-01T11:00:00Z'),
    regulations: [
      {
        name: 'Equal Credit Opportunity Act (ECOA)',
        status: 'needs_review',
        findings: 'Potential disparate impact detected for protected class (race)',
      },
      {
        name: 'Fair Housing Act',
        status: 'compliant',
        findings: 'No violations detected for housing-related discrimination',
      },
      {
        name: 'GDPR Article 22 (Right to Explanation)',
        status: 'compliant',
        findings: 'Model provides SHAP-based explanations for all decisions',
      },
    ],
    violations: [
      {
        level: 'High',
        description: 'Disparate impact detected for the "race" attribute, potentially violating Equal Credit Opportunity Act (ECOA).',
        recommendation: 'Review and re-weight the "income" and "loan_amount" features. Consider using a different model algorithm less sensitive to these interactions.',
      },
      {
        level: 'Medium',
        description: 'Model lacks transparency for individual decisions, which may not meet GDPR\'s "right to explanation" requirements.',
        recommendation: 'Implement SHAP or LIME for all loan rejection decisions and make explanations available upon request.',
      },
      {
        level: 'Low',
        description: 'The dataset used for training has not been updated in the last 12 months, leading to potential model drift.',
        recommendation: 'Establish a quarterly data refresh and model retraining schedule to mitigate concept drift.',
      },
    ],
  },
];

// Seed function
async function seedDemoData() {
  console.log('🌱 Starting EthixAI Demo Data Seeding...\n');

  let mongoClient;
  let firebaseUid = null;

  try {
    // 1. Create Firebase Demo User
    console.log('👤 Creating Firebase demo user...');
    if (firebaseApp) {
      try {
        const userRecord = await admin.auth().createUser({
          email: DEMO_USER.email,
          password: DEMO_USER.password,
          displayName: DEMO_USER.displayName,
          emailVerified: true,
        });
        firebaseUid = userRecord.uid;
        console.log(`   ✅ Firebase user created: ${userRecord.email} (UID: ${firebaseUid})`);
      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          const existingUser = await admin.auth().getUserByEmail(DEMO_USER.email);
          firebaseUid = existingUser.uid;
          console.log(`   ℹ️  User already exists: ${DEMO_USER.email} (UID: ${firebaseUid})`);
        } else {
          throw error;
        }
      }
    } else {
      console.log('   ⚠️  Skipping Firebase user creation (not configured)');
      firebaseUid = 'demo-user-local-id';
    }

    // 2. Connect to MongoDB
    console.log('\n📦 Connecting to MongoDB...');
    mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();
    const db = mongoClient.db();
    console.log(`   ✅ Connected to: ${MONGO_URL}`);

    // 3. Seed User Profile in MongoDB
    console.log('\n👥 Seeding user profile...');
    const usersCollection = db.collection('users');
    const userProfile = {
      firebaseUid,
      email: DEMO_USER.email,
      displayName: DEMO_USER.displayName,
      role: DEMO_USER.role,
      createdAt: new Date('2024-10-01'),
      lastLogin: new Date(),
      preferences: {
        theme: 'dark',
        notifications: true,
      },
      apiKey: 'demo_api_key_' + crypto.randomBytes(18).toString('hex'),
      apiKey: generateApiKey(),
    };
    await usersCollection.updateOne(
      { firebaseUid },
      { $set: userProfile },
      { upsert: true }
    );
    console.log(`   ✅ User profile created/updated`);

    // 4. Seed Datasets
    console.log('\n📊 Seeding demo datasets...');
    const datasetsCollection = db.collection('datasets');
    for (const dataset of DEMO_DATASETS) {
      await datasetsCollection.updateOne(
        { name: dataset.name, userId: firebaseUid },
        { $set: { ...dataset, userId: firebaseUid } },
        { upsert: true }
      );
      console.log(`   ✅ Dataset: ${dataset.name}`);
    }

    // 5. Seed Analysis Results
    console.log('\n🔬 Seeding analysis results...');
    const analysesCollection = db.collection('analyses');
    for (const analysis of DEMO_ANALYSES) {
      await analysesCollection.updateOne(
        { analysisId: analysis.analysisId },
        { $set: { ...analysis, userId: firebaseUid } },
        { upsert: true }
      );
      console.log(`   ✅ Analysis: ${analysis.analysisId}`);
    }

    // 6. Seed Compliance Reports
    console.log('\n📋 Seeding compliance reports...');
    const reportsCollection = db.collection('compliance_reports');
    for (const report of DEMO_COMPLIANCE_REPORTS) {
      await reportsCollection.updateOne(
        { reportId: report.reportId },
        { $set: { ...report, userId: firebaseUid } },
        { upsert: true }
      );
      console.log(`   ✅ Report: ${report.reportId}`);
    }

    // 7. Create indexes for performance
    console.log('\n⚡ Creating database indexes...');
    await usersCollection.createIndex({ firebaseUid: 1 }, { unique: true });
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await datasetsCollection.createIndex({ userId: 1, name: 1 });
    await analysesCollection.createIndex({ userId: 1, analysisId: 1 });
    await analysesCollection.createIndex({ createdAt: -1 });
    await reportsCollection.createIndex({ userId: 1, reportId: 1 });
    console.log('   ✅ Indexes created');

    console.log('\n✨ Demo data seeding completed successfully!\n');
    console.log('📝 Demo Credentials:');
    console.log(`   Email:    ${DEMO_USER.email}`);
    console.log(`   Password: ${DEMO_USER.password}`);
    console.log(`   UID:      ${firebaseUid}\n`);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run seeding
seedDemoData();