import { NextRequest, NextResponse } from 'next/server';
import { isValidEmail } from '../../../careers/utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const jobId = formData.get('jobId') as string;
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

    // TODO: Store application in database or send to email service
    console.log('Job application received:', {
      fullName,
      email,
      phone,
      jobId,
      coverLetter,
      linkedIn,
      resumeSize: resume.size,
      timestamp: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully! We\'ll review your submission and contact you within 2-3 business days.',
        email,
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
