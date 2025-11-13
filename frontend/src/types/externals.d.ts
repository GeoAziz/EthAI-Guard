// Lightweight external module declarations to quiet missing-type errors in the editor
declare module 'genkit' {
  const genkit: any;
  export = genkit;
}

declare module '@genkit-ai/google-genai' {
  const googleGenAI: any;
  export = googleGenAI;
}

declare module 'dotenv' {
  export function config(options?: any): any;
}

declare module 'react-day-picker' {
  const DayPicker: any;
  export { DayPicker };
  export default DayPicker;
}
