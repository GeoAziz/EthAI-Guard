import type { ApiEndpoint, ApiErrorResponse } from '@/types/api-reference';

export const API_BASE_URL = 'https://api.ethixai.com/v1';

export const API_ERRORS: Record<number, ApiErrorResponse> = {
  400: {
    code: 400,
    status: 'Bad Request',
    description: 'Invalid request parameters or malformed JSON',
    example: '{"error": "Missing required field: target_column"}',
  },
  401: {
    code: 401,
    status: 'Unauthorized',
    description: 'Missing or invalid JWT token',
    example: '{"error": "Invalid authentication token"}',
  },
  403: {
    code: 403,
    status: 'Forbidden',
    description: 'Token valid but insufficient permissions',
    example: '{"error": "Insufficient permissions for this resource"}',
  },
  404: {
    code: 404,
    status: 'Not Found',
    description: 'Resource ID does not exist',
    example: '{"error": "Analysis with ID abc123 not found"}',
  },
  429: {
    code: 429,
    status: 'Too Many Requests',
    description: 'Rate limit exceeded',
    example: '{"error": "Rate limit exceeded. Try again in 60 seconds"}',
  },
  500: {
    code: 500,
    status: 'Internal Server Error',
    description: 'Server-side processing error',
    example: '{"error": "Analysis failed: insufficient memory for dataset"}',
  },
  503: {
    code: 503,
    status: 'Service Unavailable',
    description: 'Server temporarily unavailable',
    example: '{"error": "Service under maintenance. Expected uptime: 2 hours"}',
  },
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  // Core Analysis Endpoints
  {
    id: 'analyze',
    method: 'POST',
    path: '/api/analyze',
    title: 'Trigger Analysis',
    description: 'Trigger a comprehensive fairness analysis on your dataset',
    category: 'analysis',
    authentication: true,
    rateLimit: 'Standard: 100/min | Enterprise: 1000/min',
    requestExample: JSON.stringify(
      {
        dataset_name: 'loan_applications',
        data: {
          age: [25, 45, 35],
          income: [50000, 80000, 65000],
          loan_approved: [1, 1, 0],
        },
        target_column: 'loan_approved',
        protected_features: ['age', 'gender'],
      },
      null,
      2,
    ),
    responseExample: JSON.stringify(
      {
        analysis_id: 'anl_abc123xyz',
        status: 'processing',
        created_at: '2026-02-28T10:30:00Z',
        estimated_completion: '2026-02-28T10:35:00Z',
      },
      null,
      2,
    ),
    errorCodes: [400, 401, 429, 500],
    parameters: [
      {
        name: 'dataset_name',
        type: 'string',
        required: true,
        description: 'Unique name for your dataset',
      },
      {
        name: 'data',
        type: 'object',
        required: true,
        description: 'Dataset with feature arrays',
      },
      {
        name: 'target_column',
        type: 'string',
        required: true,
        description: 'Column name for prediction target',
      },
      {
        name: 'protected_features',
        type: 'string[]',
        required: true,
        description: 'Features to check for bias',
      },
    ],
  },
  {
    id: 'analyses-latest',
    method: 'GET',
    path: '/api/analyses/latest',
    title: 'Get Latest Analysis',
    description: 'Retrieve the most recent analysis results',
    category: 'analysis',
    authentication: true,
    responseExample: JSON.stringify(
      {
        analysis_id: 'anl_abc123xyz',
        status: 'completed',
        fairness_score: 0.87,
        bias_detected: true,
        disparate_impact_ratio: 0.72,
        recommendations: ['Increase feature diversity', 'Review protected features'],
      },
      null,
      2,
    ),
    errorCodes: [401, 404],
  },
  {
    id: 'report-by-id',
    method: 'GET',
    path: '/api/report/:id',
    title: 'Get Report by ID',
    description: 'Fetch a specific analysis report by ID',
    category: 'analysis',
    authentication: true,
    parameters: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'Analysis ID (format: anl_xxxxx)',
      },
    ],
    responseExample: JSON.stringify(
      {
        analysis_id: 'anl_abc123xyz',
        dataset_name: 'loan_applications',
        completed_at: '2026-02-28T10:35:00Z',
        metrics: {
          demographic_parity: 0.91,
          equalized_odds: 0.85,
          disparate_impact: 0.72,
        },
        bias_summary: 'Moderate bias detected in age feature',
      },
      null,
      2,
    ),
    errorCodes: [401, 404],
  },

  // Explainability
  {
    id: 'explain',
    method: 'POST',
    path: '/api/explain',
    title: 'Generate SHAP Explanations',
    description: 'Generate SHAP explanations for model predictions',
    category: 'explainability',
    authentication: true,
    requestExample: JSON.stringify(
      {
        analysis_id: 'anl_abc123xyz',
        instance_index: 0,
        sample_size: 100,
      },
      null,
      2,
    ),
    responseExample: JSON.stringify(
      {
        explanation_id: 'exp_xyz789abc',
        feature_importance: {
          age: 0.35,
          income: 0.28,
          employment_history: 0.22,
        },
        shap_values: [0.15, -0.08, 0.12],
        base_value: 0.42,
      },
      null,
      2,
    ),
    errorCodes: [400, 401, 429],
  },

  // Compliance
  {
    id: 'compliance-validate',
    method: 'POST',
    path: '/api/compliance/validate',
    title: 'Validate Compliance',
    description: 'Validate model against GDPR, ECOA, SR 11-7 frameworks',
    category: 'compliance',
    authentication: true,
    requestExample: JSON.stringify(
      {
        analysis_id: 'anl_abc123xyz',
        frameworks: ['GDPR', 'ECOA', 'SR_11_7'],
      },
      null,
      2,
    ),
    responseExample: JSON.stringify(
      {
        compliance_report_id: 'cmpl_abc123',
        frameworks: {
          GDPR: {
            compliant: true,
            score: 0.95,
            issues: [],
          },
          ECOA: {
            compliant: false,
            score: 0.72,
            issues: ['Disparate impact in age feature'],
          },
          SR_11_7: {
            compliant: true,
            score: 0.88,
            issues: [],
          },
        },
      },
      null,
      2,
    ),
    errorCodes: [400, 401, 429, 500],
  },

  // Data Management
  {
    id: 'datasets-upload',
    method: 'POST',
    path: '/api/datasets/upload',
    title: 'Upload Dataset',
    description: 'Upload a new dataset for analysis (max 50MB)',
    category: 'data-management',
    authentication: true,
    rateLimit: '10 datasets per hour',
    parameters: [
      {
        name: 'file',
        type: 'multipart/form-data',
        required: true,
        description: 'CSV or JSON dataset file',
      },
      {
        name: 'dataset_name',
        type: 'string',
        required: true,
        description: 'Name for the dataset',
      },
    ],
    responseExample: JSON.stringify(
      {
        dataset_id: 'dset_xyz789',
        dataset_name: 'loan_applications',
        rows: 5000,
        columns: 12,
        uploaded_at: '2026-02-28T10:30:00Z',
      },
      null,
      2,
    ),
    errorCodes: [400, 401, 413, 429],
  },
  {
    id: 'datasets-list',
    method: 'GET',
    path: '/api/datasets',
    title: 'List Datasets',
    description: 'List all uploaded datasets with pagination',
    category: 'data-management',
    authentication: true,
    parameters: [
      {
        name: 'page',
        type: 'number',
        required: false,
        description: 'Page number (default: 1)',
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: 'Results per page (default: 20, max: 100)',
      },
      {
        name: 'sort_by',
        type: 'string',
        required: false,
        description: 'Sort field: created_at, name, size (default: created_at)',
      },
    ],
    responseExample: JSON.stringify(
      {
        datasets: [
          {
            dataset_id: 'dset_xyz789',
            name: 'loan_applications',
            rows: 5000,
            created_at: '2026-02-28T10:30:00Z',
          },
        ],
        total: 42,
        page: 1,
        limit: 20,
      },
      null,
      2,
    ),
    errorCodes: [401, 403],
  },
];

export const API_CATEGORIES = [
  {
    id: 'analysis',
    title: 'Core Analysis',
    description: 'Bias detection and fairness analysis endpoints',
    icon: 'Zap',
    color: 'text-yellow-500',
  },
  {
    id: 'explainability',
    title: 'Explainability',
    description: 'SHAP plots and feature importance analysis',
    icon: 'Code',
    color: 'text-blue-500',
  },
  {
    id: 'compliance',
    title: 'Compliance',
    description: 'Regulatory framework validation',
    icon: 'Shield',
    color: 'text-green-500',
  },
  {
    id: 'data-management',
    title: 'Data Management',
    description: 'Dataset upload and management',
    icon: 'Database',
    color: 'text-purple-500',
  },
];
