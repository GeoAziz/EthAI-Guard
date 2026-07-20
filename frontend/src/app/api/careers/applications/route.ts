import { NextRequest, NextResponse } from 'next/server';
import { isValidEmail } from '../../../careers/utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const jobId = formData.get('jobId') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const coverLetter = formData.get('coverLetter') as string;
    const linkedIn = formData.get('linkedIn') as string;
    const resume = formData.get('resume') as File;

    if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !resume) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 },
      );
    }

    if (resume.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Resume file too large (max 10MB)' },
        { status: 400 },
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // Forward to backend API
    const backendFormData = new FormData();
    backendFormData.append('fullName', fullName);
    backendFormData.append('email', email);
    backendFormData.append('phone', phone);
    backendFormData.append('jobId', jobId || '');
    backendFormData.append('jobTitle', jobTitle || '');
    backendFormData.append('coverLetter', coverLetter || '');
    backendFormData.append('linkedIn', linkedIn || '');
    backendFormData.append('resume', resume);

    const backendResponse = await fetch(`${backendUrl}/api/careers/applications`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { error: 'Backend API error' },
        { status: backendResponse.status },
      );
    }

    const result = await backendResponse.json();

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully! We\'ll review your submission and contact you within 2-3 business days.',
        email,
        ...result,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 },
    );
  }
}
