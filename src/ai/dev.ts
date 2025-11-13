import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-dataset-fixes.ts';
import '@/ai/flows/generate-fairness-insights.ts';
import '@/ai/flows/generate-compliance-recommendations.ts';