import { NextRequest, NextResponse } from 'next/server';
import { isValidEmail } from '../../blog/utils';

/**
 * POST /api/newsletter
 * Subscribe email to newsletter
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 },
      );
    }

    // Check for duplicate (basic check - would be more robust in production)
    // In production, query database for existing subscription

    // TODO: Integrate with newsletter service (e.g., Mailchimp, ConvertKit, etc.)
    // For now, just return success

    console.log('Newsletter subscription:', email);

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed to newsletter',
        email,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 },
    );
  }
}
