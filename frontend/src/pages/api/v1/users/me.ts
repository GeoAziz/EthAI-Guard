/**
 * GET /api/v1/users/me
 * Get current authenticated user info
 */

import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest, ApiResponse } from '@/lib/api-handler';
import { connectDB, getModels, IUser } from '@/lib/db-client';

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  try {
    await connectDB();
    const { User } = getModels();

    // Try to find user in MongoDB
    let user = await User.findOne(
      { $or: [{ firebase_uid: req.user?.uid }, { email: req.user?.email }] },
      { password_hash: 0 }
    ).lean();

    // Auto-provision if not found
    if (!user) {
      user = await User.create({
        email: req.user?.email,
        firebase_uid: req.user?.uid,
        name: req.user?.email?.split('@')[0],
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: req.user?.role,
        emailVerified: req.user?.emailVerified,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch user:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
}

export default withAuth(handler);
