/**
 * Careers page utilities
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatSalary(salary: number): string {
  return `$${(salary / 1000).toFixed(0)}k`;
}

export function formatSalaryRange(min?: number, max?: number): string {
  if (!min || !max) {return 'Competitive';}
  return `${formatSalary(min)} - ${formatSalary(max)}`;
}

export interface ApplicationData {
  fullName: string;
  email: string;
  phone: string;
  resume?: File | null;
  coverLetter: string;
  linkedIn?: string;
}

export interface GeneralApplicationData {
  fullName: string;
  email: string;
  phone: string;
  resume?: File | null;
  message: string;
}

export function validateApplicationData(data: Partial<ApplicationData>): string[] {
  const errors: string[] = [];

  if (!data.fullName?.trim()) {errors.push('Full name is required');}
  if (!data.email?.trim()) {errors.push('Email is required');}
  else if (!isValidEmail(data.email)) {errors.push('Valid email is required');}
  if (!data.phone?.trim()) {errors.push('Phone number is required');}
  if (!data.resume) {errors.push('Resume file is required');}
  if (!data.coverLetter?.trim()) {errors.push('Cover letter is required');}

  return errors;
}

export function validateGeneralApplicationData(data: Partial<GeneralApplicationData>): string[] {
  const errors: string[] = [];

  if (!data.fullName?.trim()) {errors.push('Full name is required');}
  if (!data.email?.trim()) {errors.push('Email is required');}
  else if (!isValidEmail(data.email)) {errors.push('Valid email is required');}
  if (!data.phone?.trim()) {errors.push('Phone number is required');}
  if (!data.resume) {errors.push('Resume file is required');}
  if (!data.message?.trim()) {errors.push('Tell us why you want to join is required');}

  return errors;
}

export function subscribeToJobNotifications(email: string): Promise<{ success: boolean; message: string }> {
  if (!isValidEmail(email)) {
    return Promise.reject(new Error('Invalid email'));
  }
  return Promise.resolve({ success: true, message: 'Subscribed' });
}
