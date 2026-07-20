import { NextRequest, NextResponse } from 'next/server';
import { isValidEmail } from '../../blog/utils';

/**
 * POST /api/newsletter
 * Subscribe email to newsletter
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fullName } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 },
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // Forward to backend API
    const backendResponse = await fetch(`${backendUrl}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName }),
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
        message: 'Successfully subscribed to newsletter',
        email,
        ...result,
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
