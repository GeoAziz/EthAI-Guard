import { NextRequest, NextResponse } from 'next/server';
import { isValidEmail } from '../../../careers/utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const message = formData.get('message') as string;
    const resume = formData.get('resume') as File;

    if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !message?.trim() || !resume) {
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
    console.log('General application received:', {
      fullName,
      email,
      phone,
      message,
      resumeSize: resume.size,
      timestamp: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your interest in EthixAI! We\'ll review your application and reach out if we find a good fit.',
        email,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('General application submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 },
    );
  }
}
