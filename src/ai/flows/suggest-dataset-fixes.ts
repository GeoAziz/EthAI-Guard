'use server';

/**
 * @fileOverview A flow that suggests potential fixes to a dataset to mitigate bias.
 *
 * - suggestDatasetFixes - A function that suggests fixes for dataset bias.
 * - SuggestDatasetFixesInput - The input type for the suggestDatasetFixes function.
 * - SuggestDatasetFixesOutput - The return type for the suggestDatasetFixes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDatasetFixesInputSchema = z.object({
  datasetDescription: z
    .string()
    .describe('A description of the dataset, including its columns and purpose.'),
  identifiedBiases: z
    .string()
    .describe('A description of the biases identified in the dataset.'),
});
export type SuggestDatasetFixesInput = z.infer<typeof SuggestDatasetFixesInputSchema>;

const SuggestDatasetFixesOutputSchema = z.object({
  suggestedFixes: z
    .string()
    .describe(
      'A list of suggested fixes to the dataset to mitigate the identified biases, including re-weighting or re-sampling strategies.'
    ),
});
export type SuggestDatasetFixesOutput = z.infer<typeof SuggestDatasetFixesOutputSchema>;

export async function suggestDatasetFixes(
  input: SuggestDatasetFixesInput
): Promise<SuggestDatasetFixesOutput> {
  return suggestDatasetFixesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDatasetFixesPrompt',
  input: {schema: SuggestDatasetFixesInputSchema},
  output: {schema: SuggestDatasetFixesOutputSchema},
  prompt: `You are an expert data scientist specializing in mitigating bias in datasets.

You will analyze the provided dataset description and identified biases, and suggest potential fixes to the dataset to mitigate those biases. These fixes may include re-weighting strategies, re-sampling strategies, or other relevant techniques.

Dataset Description: {{{datasetDescription}}}
Identified Biases: {{{identifiedBiases}}}

Suggested Fixes:`,
});

const suggestDatasetFixesFlow = ai.defineFlow(
  {
    name: 'suggestDatasetFixesFlow',
    inputSchema: SuggestDatasetFixesInputSchema,
    outputSchema: SuggestDatasetFixesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
