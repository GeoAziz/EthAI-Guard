/**
 * Mongoose connection management for Vercel serverless functions
 * Connection is reused across invocations (function instances)
 */
import 'server-only';

import mongoose, { Schema, Document } from 'mongoose';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/ethixai';

let cachedConnection: typeof mongoose | null = null;

export async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const conn = await mongoose.connect(MONGO_URL, {
    maxPoolSize: 10,
    minPoolSize: 2,
    connectTimeoutMS: 5000,
  });

  cachedConnection = conn;
  return conn;
}

// ============ MODELS ============

export interface IUser extends Document<string> {
  _id: string;
  email: string;
  name?: string;
  firebase_uid: string;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDataset extends Document<string> {
  _id: string;
  name: string;
  owner: string; // Firebase UID
  file_url?: string;
  rows_count: number;
  columns: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IReport extends Document<string> {
  _id: string;
  dataset_id: string;
  created_by: string; // Firebase UID
  bias_score: number;
  findings: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalysis extends Document<string> {
  _id: string;
  dataset_id: string;
  owner: string; // Firebase UID
  status: 'running' | 'completed' | 'failed';
  results: any;
  error?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IAccessRequest extends Document<string> {
  _id: string;
  requester_uid: string;
  dataset_id: string;
  access_level: 'viewer' | 'collaborator' | 'admin';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: Date;
  rejection_reason?: string;
  created_at: Date;
}

export interface IEvaluation extends Document<string> {
  _id: string;
  request_id: string;
  user_id: string;
  model_id: string;
  input_features: any;
  simulation: any;
  rules: any;
  risk: any;
  explanation: any;
  context: any;
  created_at: Date;
}

// Define schemas
const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: String,
  firebase_uid: { type: String, required: true, unique: true },
  role: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const DatasetSchema = new Schema<IDataset>({
  name: { type: String, required: true },
  owner: { type: String, required: true },
  file_url: String,
  rows_count: { type: Number, default: 0 },
  columns: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ReportSchema = new Schema<IReport>({
  dataset_id: { type: String, required: true },
  created_by: { type: String, required: true },
  bias_score: { type: Number, default: 0 },
  findings: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const AnalysisSchema = new Schema<IAnalysis>({
  dataset_id: { type: String, required: true },
  owner: { type: String, required: true },
  status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
  results: Schema.Types.Mixed,
  error: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const AccessRequestSchema = new Schema<IAccessRequest>({
  requester_uid: { type: String, required: true },
  dataset_id: { type: String, required: true },
  access_level: { type: String, enum: ['viewer', 'collaborator', 'admin'], required: true },
  reason: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewed_by: String,
  reviewed_at: Date,
  rejection_reason: String,
  created_at: { type: Date, default: Date.now },
});

const EvaluationSchema = new Schema<IEvaluation>({
  request_id: { type: String, required: true },
  user_id: { type: String, required: true },
  model_id: { type: String, required: true },
  input_features: Schema.Types.Mixed,
  simulation: Schema.Types.Mixed,
  rules: Schema.Types.Mixed,
  risk: Schema.Types.Mixed,
  explanation: Schema.Types.Mixed,
  context: Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now },
});

// Get or create models
export function getModels() {
  return {
    User: mongoose.models.User || mongoose.model<IUser>('User', UserSchema),
    Dataset: mongoose.models.Dataset || mongoose.model<IDataset>('Dataset', DatasetSchema),
    Report: mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema),
    Analysis: mongoose.models.Analysis || mongoose.model<IAnalysis>('Analysis', AnalysisSchema),
    AccessRequest: mongoose.models.AccessRequest || mongoose.model<IAccessRequest>('AccessRequest', AccessRequestSchema),
    Evaluation: mongoose.models.Evaluation || mongoose.model<IEvaluation>('Evaluation', EvaluationSchema),
  };
}
