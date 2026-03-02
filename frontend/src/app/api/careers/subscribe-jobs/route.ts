import { NextRequest, NextResponse } from 'next/server';
import { isValidEmail } from '../../../careers/utils';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 },
      );
    }

    // TODO: Subscribe email to job notifications
    // - Use email service (Mailchimp, ConvertKit, SendGrid)
    // - Or store in database with subscription status

    console.log('Job notification subscription:', email);

    return NextResponse.json(
      {
        success: true,
        message: 'You\'ll receive notifications about new job openings!',
        email,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Job notification subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 },
    );
  }
}
