'use server';

/**
 * @fileOverview Generates compliance recommendations based on the CBK ethical compliance score.
 *
 * - generateComplianceRecommendations - A function that generates compliance recommendations.
 * - GenerateComplianceRecommendationsInput - The input type for the generateComplianceRecommendations function.
 * - GenerateComplianceRecommendationsOutput - The return type for the generateComplianceRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateComplianceRecommendationsInputSchema = z.object({
  cbkScore: z
    .number()
    .describe('The CBK ethical compliance score, a number between 0 and 1.'),
  violations: z
    .array(z.string())
    .describe('A list of violations identified during the compliance check.'),
});
export type GenerateComplianceRecommendationsInput = z.infer<
  typeof GenerateComplianceRecommendationsInputSchema
>;

const GenerateComplianceRecommendationsOutputSchema = z.object({
  recommendations: z
    .string()
    .describe(
      'A list of recommendations to address the ethical concerns and ensure adherence to regulatory standards.'
    ),
});
export type GenerateComplianceRecommendationsOutput = z.infer<
  typeof GenerateComplianceRecommendationsOutputSchema
>;

export async function generateComplianceRecommendations(
  input: GenerateComplianceRecommendationsInput
): Promise<GenerateComplianceRecommendationsOutput> {
  return generateComplianceRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateComplianceRecommendationsPrompt',
  input: {schema: GenerateComplianceRecommendationsInputSchema},
  output: {schema: GenerateComplianceRecommendationsOutputSchema},
  prompt: `You are a compliance expert specializing in providing recommendations to address ethical concerns and ensure adherence to regulatory standards.

  Based on the CBK ethical compliance score and identified violations, generate a list of actionable recommendations.

  CBK Score: {{{cbkScore}}}
  Violations: {{#each violations}}- {{{this}}}\n{{/each}}

  Recommendations:`,
});

const generateComplianceRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateComplianceRecommendationsFlow',
    inputSchema: GenerateComplianceRecommendationsInputSchema,
    outputSchema: GenerateComplianceRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
