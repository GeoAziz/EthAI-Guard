'use server';

/**
 * @fileOverview A flow that generates key insights and recommendations based on fairness analysis results.
 *
 * - generateFairnessInsights - A function that triggers the fairness insights generation process.
 * - GenerateFairnessInsightsInput - The input type for the generateFairnessInsights function.
 * - GenerateFairnessInsightsOutput - The return type for the generateFairnessInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFairnessInsightsInputSchema = z.object({
  fairnessMetrics: z
    .string()
    .describe(
      'A string containing fairness metrics such as statistical parity, equal opportunity, and disparate impact.'
    ),
  datasetDescription: z.string().describe('A description of the dataset being analyzed.'),
  modelDescription: z.string().describe('A description of the AI model being analyzed.'),
});
export type GenerateFairnessInsightsInput = z.infer<typeof GenerateFairnessInsightsInputSchema>;

const GenerateFairnessInsightsOutputSchema = z.object({
  insights: z.string().describe('Key insights derived from the fairness analysis results.'),
  recommendations: z
    .string()
    .describe('Recommendations for mitigating biases detected in the model.'),
});
export type GenerateFairnessInsightsOutput = z.infer<typeof GenerateFairnessInsightsOutputSchema>;

export async function generateFairnessInsights(
  input: GenerateFairnessInsightsInput
): Promise<GenerateFairnessInsightsOutput> {
  return generateFairnessInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFairnessInsightsPrompt',
  input: {schema: GenerateFairnessInsightsInputSchema},
  output: {schema: GenerateFairnessInsightsOutputSchema},
  prompt: `You are an AI fairness expert. Based on the following fairness analysis results, dataset description, and model description, generate key insights and recommendations for mitigating biases.

Fairness Metrics: {{{fairnessMetrics}}}
Dataset Description: {{{datasetDescription}}}
Model Description: {{{modelDescription}}}

Provide concise and actionable insights and recommendations.

Insights:
Recommendations:`,
});

const generateFairnessInsightsFlow = ai.defineFlow(
  {
    name: 'generateFairnessInsightsFlow',
    inputSchema: GenerateFairnessInsightsInputSchema,
    outputSchema: GenerateFairnessInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
