const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : process.env.APP_URL || 'http://localhost:5000';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - email not sent:', options.subject, 'to:', options.to);
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SwapRunn <noreply@swaprunn.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Email send failed:', error);
      return false;
    }

    console.log('Email sent successfully to:', options.to);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your SwapRunn Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Reset Your Password</h1>
        <p>You requested to reset your password for your SwapRunn account.</p>
        <p>Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">SwapRunn - Vehicle Delivery Made Simple</p>
      </div>
    `,
  });
}

export async function sendAdminInvitationEmail(
  email: string, 
  inviterName: string, 
  dealershipName: string, 
  role: string,
  token: string
): Promise<boolean> {
  const acceptUrl = `${APP_URL}/accept-invitation?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: `You've been invited to join ${dealershipName} on SwapRunn`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">You're Invited!</h1>
        <p>${inviterName} has invited you to join <strong>${dealershipName}</strong> as a <strong>${role}</strong> on SwapRunn.</p>
        <p>SwapRunn helps car dealerships manage vehicle deliveries efficiently.</p>
        <p>Click the button below to accept your invitation and set up your account:</p>
        <a href="${acceptUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Accept Invitation</a>
        <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">SwapRunn - Vehicle Delivery Made Simple</p>
      </div>
    `,
  });
}

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}
