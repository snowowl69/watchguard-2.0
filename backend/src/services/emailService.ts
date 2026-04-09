import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
  try {
    const resetUrl = `${process.env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@watchguard.app',
      to,
      subject: 'Watch Guard - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0e1a; color: #e5e7eb;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1d6ff0;">🛡️ Watch Guard</h1>
            <p style="color: #9ca3af;">Smart Face Recognition Security System</p>
          </div>
          <div style="background: #111827; padding: 30px; border-radius: 8px;">
            <h2 style="color: #fff; margin-top: 0;">Password Reset Request</h2>
            <p>You requested a password reset. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #1d6ff0; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      `,
    });

    logger.info(`Password reset email sent to ${to}`);
    return true;
  } catch (error: any) {
    logger.error(`Failed to send password reset email: ${error.message}`);
    return false;
  }
}

export async function sendNotificationEmail(to: string, subject: string, message: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@watchguard.app',
      to,
      subject: `Watch Guard - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0e1a; color: #e5e7eb;">
          <h1 style="color: #1d6ff0; text-align: center;">🛡️ Watch Guard</h1>
          <div style="background: #111827; padding: 20px; border-radius: 8px;">
            <h2 style="color: #fff;">${subject}</h2>
            <p>${message}</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error: any) {
    logger.error(`Failed to send notification email: ${error.message}`);
    return false;
  }
}
