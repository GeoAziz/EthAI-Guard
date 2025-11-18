/**
 * Artillery Processor for EthixAI Stress Tests
 * Generates realistic test payloads and handles custom logic
 */

const fs = require('fs');
const path = require('path');

// Load test data (will be generated separately)
let payload100, payload500, payload1000, payload5000;

try {
  payload100 = require('./data/payload_100.json');
  payload500 = require('./data/payload_500.json');
  payload1000 = require('./data/payload_1000.json');
  payload5000 = require('./data/payload_5000.json');
} catch (error) {
  console.warn('Test data files not found, generating minimal payloads...');
  payload100 = generatePayload(100);
  payload500 = generatePayload(500);
  payload1000 = generatePayload(1000);
  payload5000 = generatePayload(5000);
}

/**
 * Generate synthetic credit scoring dataset
 */
function generatePayload(size) {
  const data = [];
  const genders = ['male', 'female'];
  const ageGroups = ['18-25', '26-35', '36-45', '46-55', '56+'];
  const ethnicities = ['group_a', 'group_b', 'group_c', 'group_d'];
  
  for (let i = 0; i < size; i++) {
    data.push({
      id: `record_${i}`,
      credit_score: Math.floor(Math.random() * 400) + 500,  // 500-900
      income: Math.floor(Math.random() * 100000) + 30000,  // 30k-130k
      debt_to_income_ratio: Math.random() * 0.6,  // 0-0.6
      employment_years: Math.floor(Math.random() * 30),  // 0-30
      existing_credit_lines: Math.floor(Math.random() * 10),  // 0-10
      age: ageGroups[Math.floor(Math.random() * ageGroups.length)],
      gender: genders[Math.floor(Math.random() * genders.length)],
      ethnicity: ethnicities[Math.floor(Math.random() * ethnicities.length)],
      approved: Math.random() > 0.3  // 70% approval rate
    });
  }
  
  return data;
}

/**
 * Generate single sample record for explainability
 */
function generateSampleRecord() {
  return {
    id: `sample_${Date.now()}`,
    credit_score: 720,
    income: 65000,
    debt_to_income_ratio: 0.35,
    employment_years: 8,
    existing_credit_lines: 3,
    age: '36-45',
    gender: 'female',
    ethnicity: 'group_a'
  };
}

/**
 * Before scenario hook - set variables
 */
function setPayload(requestParams, context, ee, next) {
  // Set payload size based on scenario
  const size = context.vars.payloadSize || 100;
  
  switch(size) {
    case 500:
      context.vars.payload_100 = payload500;
      break;
    case 1000:
      context.vars.payload_100 = payload1000;
      break;
    case 5000:
      context.vars.payload_100 = payload5000;
      break;
    default:
      context.vars.payload_100 = payload100;
  }
  
  context.vars.sample_record = generateSampleRecord();
  
  return next();
}

/**
 * After response hook - log errors
 */
function logErrors(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    console.error(`[ERROR] ${response.statusCode} - ${requestParams.url}`);
    
    if (response.headers['x-request-id']) {
      console.error(`[REQUEST-ID] ${response.headers['x-request-id']}`);
    }
    
    if (response.body) {
      try {
        const body = JSON.parse(response.body);
        console.error(`[ERROR-DETAIL] ${body.error || body.message}`);
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }
  
  return next();
}

/**
 * Custom metrics
 */
function trackCustomMetrics(requestParams, response, context, ee, next) {
  const latency = response.timings.phases.total;
  
  // Track latency buckets
  if (latency < 1000) {
    ee.emit('counter', 'latency.under_1s', 1);
  } else if (latency < 2000) {
    ee.emit('counter', 'latency.1s_to_2s', 1);
  } else if (latency < 5000) {
    ee.emit('counter', 'latency.2s_to_5s', 1);
  } else {
    ee.emit('counter', 'latency.over_5s', 1);
  }
  
  // Track status codes
  ee.emit('counter', `status.${response.statusCode}`, 1);
  
  return next();
}

module.exports = {
  setPayload,
  logErrors,
  trackCustomMetrics
};
