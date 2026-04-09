import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt';
import { sendPasswordResetEmail } from '../services/emailService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// In-memory store for reset tokens (use Redis in production)
const resetTokens = new Map<string, { email: string; expires: Date }>();

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isDeleted) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Account is not active. Contact admin.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    logger.info(`User ${user.email} logged in successfully`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          employeeId: user.employeeId,
          faceImagePath: user.faceImagePath,
          status: user.status,
        },
      },
    });
  } catch (error: any) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'Refresh token not found' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.isDeleted || user.status !== 'ACTIVE') {
      res.status(401).json({ success: false, message: 'User not found or inactive' });
      return;
    }

    const newPayload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
    const newAccessToken = signAccessToken(newPayload);

    res.json({
      success: true,
      message: 'Token refreshed',
      data: { accessToken: newAccessToken },
    });
  } catch (error: any) {
    logger.warn(`Token refresh failed: ${error.message}`);
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('refreshToken', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        department: true,
        faceImagePath: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    logger.error(`Get me error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, {
      email: user.email,
      expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    await sendPasswordResetEmail(user.email, token);

    res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (error: any) {
    logger.error(`Forgot password error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body;

    const resetData = resetTokens.get(token);
    if (!resetData || resetData.expires < new Date()) {
      res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email: resetData.email },
      data: { passwordHash },
    });

    resetTokens.delete(token);

    logger.info(`Password reset for ${resetData.email}`);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error: any) {
    logger.error(`Reset password error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
