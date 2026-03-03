/**
 * EthixAI Firebase Cloud Functions
 * 
 * This file wraps the existing Express backend routes for Firebase Cloud Functions deployment.
 * 
 * Each exported function is a separate Cloud Function.
 * 
 * Deployment:
 *   cd backend/functions && npm install
 *   firebase deploy --only functions
 * 
 * Local Testing:
 *   firebase emulators:start --only functions
 * 
 * Production URLs:
 *   https://us-central1-studio-8429244671-dd548.cloudfunctions.net/FUNCTION_NAME
 */

const functions = require('firebase-functions');
const firebaseAdmin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase Admin
if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp();
}

// Configure CORS for all functions
const corsOptions = {
  origin: true, // Allow all origins (tighten in production if needed)
};

/**
 * ==================== HEALTH & MONITORING ====================
 */

exports.health = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.status(200).json({ 
    status: 'healthy', 
    service: 'ethixai-backend',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString() 
  });
});

/**
 * ==================== AUTHENTICATION ====================
 */

// Test/verify Firebase token
exports.authTest = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    res.status(200).json({ 
      authenticated: true, 
      uid: decoded.uid, 
      email: decoded.email,
      role: decoded.role || decoded.claims?.role || 'user',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * ==================== USERS ====================
 */

// Get current authenticated user info
exports.usersMe = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    
    // TODO: Query MongoDB for extended user data if needed
    // For MVP, just return Firebase info
    res.status(200).json({ 
      id: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.email.split('@')[0],
      role: decoded.role || decoded.claims?.role || 'user',
      emailVerified: decoded.email_verified || false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * ==================== DATASETS ====================
 */

// List all datasets
exports.datasetsList = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.slice(7);
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    
    // TODO: Query MongoDB for datasets
    res.status(200).json({ 
      datasets: [],
      message: 'TODO: Connect to MongoDB',
      userId: decoded.uid
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Create/upload dataset
exports.datasetsCreate = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.slice(7);
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    
    // TODO: Handle file upload
    // TODO: Store in MongoDB
    res.status(201).json({ 
      id: 'dataset-' + Date.now(),
      message: 'TODO: Implement dataset upload',
      userId: decoded.uid
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific dataset
exports.datasetsGet = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.slice(7);
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    
    const datasetId = req.path.split('/').pop();
    
    // TODO: Query MongoDB for dataset
    res.status(200).json({ 
      id: datasetId,
      message: 'TODO: Fetch from MongoDB',
      userId: decoded.uid
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ==================== ANALYSIS ====================
 */

// Run bias analysis
exports.analyzeRun = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.slice(7);
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    
    // TODO: Call AI Core for bias detection
    // TODO: Generate SHAP explanations
    // TODO: Store results in MongoDB
    res.status(202).json({ 
      analysisId: 'analysis-' + Date.now(),
      status: 'queued',
      message: 'TODO: Implement analysis',
      userId: decoded.uid
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analysis results
exports.analyzeGet = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.slice(7);
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    
    const analysisId = req.path.split('/').pop();
    
    // TODO: Query MongoDB for results
    res.status(200).json({ 
      id: analysisId,
      message: 'TODO: Fetch from MongoDB',
      userId: decoded.uid
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ==================== ACCESS REQUESTS ====================
 */

// List access requests (admin only)
exports.accessRequestsList = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.slice(7);
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    
    const role = decoded.role || decoded.claims?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // TODO: Query MongoDB for access requests
    res.status(200).json({ 
      requests: [],
      message: 'TODO: Fetch from MongoDB'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve access request
exports.accessRequestsApprove = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.slice(7);
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    
    const role = decoded.role || decoded.claims?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const requestId = req.path.split('/')[3]; // Extract from path
    
    // TODO: Update request to 'approved'
    // TODO: Call Firebase setCustomUserClaims() to update user role
    res.status(200).json({ 
      status: 'approved',
      message: 'TODO: Implement approval',
      requestId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject access request
exports.accessRequestsReject = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.slice(7);
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    
    const role = decoded.role || decoded.claims?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const requestId = req.path.split('/')[3];
    
    // TODO: Update request to 'rejected'
    res.status(200).json({ 
      status: 'rejected',
      message: 'TODO: Implement rejection',
      requestId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

console.log('✓ Firebase Cloud Functions initialized');
