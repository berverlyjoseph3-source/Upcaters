// enterprise-ai-agent-platform/apps/api/src/services/email.service.ts
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { prisma } from '../db/client';

export interface EmailOptions {
  to: string | string[];
  toName?: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>;
}

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;
  private static fromEmail: string = process.env.FROM_EMAIL || 'noreply@aiagentplatform.com';
  private static fromName: string = process.env.FROM_NAME || 'AI Agent Platform';

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  static initialize(): void {
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      logger.info('SMTP email service initialized');
    } else if (process.env.SENDGRID_API_KEY) {
      // SendGrid would be initialized here
      logger.info('SendGrid email service initialized');
    } else {
      logger.warn('No email service configured. Email features will be disabled.');
    }
  }

  static async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const toAddresses = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const toName = options.toName || (Array.isArray(options.to) ? options.to[0] : options.to.split('@')[0]);

    const htmlContent = await this.renderTemplate(options.template, {
      ...options.data,
      recipientName: toName,
      year: new Date().getFullYear(),
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: toAddresses,
      subject: options.subject,
      html: htmlContent,
      attachments: options.attachments,
    };

    try {
      if (!this.transporter) {
        // Log email instead of sending (development mode)
        logger.info({
          to: toAddresses,
          subject: options.subject,
          template: options.template,
          data: options.data,
        }, 'Email would be sent (no transporter configured)');
        
        // Store in database for audit
        await this.storeEmail(options, 'pending');
        
        return { success: true, messageId: `mock_${Date.now()}` };
      }

      const result = await this.transporter.sendMail(mailOptions);
      await this.storeEmail(options, 'sent', result.messageId);
      
      logger.info({ messageId: result.messageId, to: toAddresses, subject: options.subject }, 'Email sent successfully');
      return { success: true, messageId: result.messageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, to: toAddresses, subject: options.subject }, 'Failed to send email');
      await this.storeEmail(options, 'failed', undefined, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private static async storeEmail(options: EmailOptions, status: string, messageId?: string, error?: string): Promise<void> {
    try {
      await prisma.emailQueue.create({
        data: {
          to: Array.isArray(options.to) ? options.to.join(',') : options.to,
          toName: options.toName,
          subject: options.subject,
          template: options.template,
          templateData: options.data,
          status: status as any,
          sentAt: status === 'sent' ? new Date() : undefined,
          errorMessage: error,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to store email in queue');
    }
  }

  private static async renderTemplate(template: string, data: Record<string, any>): Promise<string> {
    const templates: Record<string, (data: any) => string> = {
      'welcome': (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AI Agent Platform</title>
        </head>
        <body style="font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 16px; line-height: 56px; font-size: 24px; font-weight: bold; color: white; margin-bottom: 16px;">AI</div>
              <h1 style="font-size: 28px; color: #1e293b; margin: 0 0 8px;">Welcome to AI Agent Platform!</h1>
              <p style="font-size: 16px; color: #64748b; margin: 0;">Your AI-powered workflow starts now</p>
            </div>

            <!-- Main Card -->
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 24px;">
              <p style="font-size: 16px; color: #334155; margin: 0 0 24px; line-height: 1.6;">
                Hello ${d.recipientName || 'there'},<br><br>
                Welcome to AI Agent Platform! We're excited to have you onboard. Your account is now ready, and you can start using our AI agents right away.
              </p>

              <!-- Quick Start -->
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="font-size: 16px; color: #0369a1; margin: 0 0 12px;">🚀 Quick Start Guide</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div style="background: white; border-radius: 8px; padding: 12px; text-align: center;">
                    <span style="font-size: 24px;">📧</span>
                    <p style="font-size: 13px; color: #475569; margin: 8px 0 0;">Send smart emails with AI</p>
                  </div>
                  <div style="background: white; border-radius: 8px; padding: 12px; text-align: center;">
                    <span style="font-size: 24px;">📅</span>
                    <p style="font-size: 13px; color: #475569; margin: 8px 0 0;">Schedule meetings automatically</p>
                  </div>
                  <div style="background: white; border-radius: 8px; padding: 12px; text-align: center;">
                    <span style="font-size: 24px;">🌐</span>
                    <p style="font-size: 13px; color: #475569; margin: 8px 0 0;">Search the web with AI</p>
                  </div>
                  <div style="background: white; border-radius: 8px; padding: 12px; text-align: center;">
                    <span style="font-size: 24px;">✨</span>
                    <p style="font-size: 13px; color: #475569; margin: 8px 0 0;">Generate content instantly</p>
                  </div>
                </div>
              </div>

              <!-- Pricing Note -->
              <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="font-size: 14px; color: #854d0e; margin: 0;">
                  💡 <strong>You're on the Free plan</strong> — 50 AI actions and 100 API calls per month.<br>
                  <span style="font-size: 13px;">Upgrade to unlock more features starting at just <strong>$39/month</strong>.</span>
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center;">
                <a href="${d.dashboardUrl || 'https://app.aiagentplatform.com/dashboard'}" 
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(59,130,246,0.3);">
                  Go to Dashboard
                </a>
              </div>
            </div>

            <!-- Plan Features -->
            <div style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 24px;">
              <h3 style="font-size: 16px; color: #1e293b; margin: 0 0 16px;">📊 Your Free Plan Includes:</h3>
              <div style="display: grid; gap: 8px;">
                ${[
                  { icon: '✅', text: '50 AI Actions per month' },
                  { icon: '✅', text: '100 API Calls per month' },
                  { icon: '✅', text: 'Email Agent (Gmail integration)' },
                  { icon: '✅', text: 'Calendar Agent (Google Calendar)' },
                  { icon: '✅', text: 'Web Agent (Search & Research)' },
                  { icon: '✅', text: 'Basic Content Generation' },
                  { icon: '✅', text: 'Community Support' },
                ].map(item => `
                  <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #475569;">
                    <span>${item.icon}</span>
                    <span>${item.text}</span>
                  </div>
                `).join('')}
              </div>
              
              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="font-size: 13px; color: #64748b; margin: 0 0 8px;">Want more? Upgrade to unlock premium features</p>
                <a href="${d.dashboardUrl || 'https://app.aiagentplatform.com'}/billing" 
                   style="display: inline-block; background: #f1f5f9; color: #3b82f6; padding: 8px 20px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
                  View Plans → Starting at $39/mo
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0 0 8px;">
                © ${new Date().getFullYear()} AI Agent Platform. All rights reserved.
              </p>
              <p style="font-size: 12px; color: #cbd5e1; margin: 0;">
                If you have questions, reply to this email or visit our <a href="https://docs.aiagentplatform.com" style="color: #3b82f6;">Help Center</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,

      'password_reset': (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 16px; line-height: 56px; font-size: 24px; font-weight: bold; color: white; margin-bottom: 16px;">🔐</div>
              <h1 style="font-size: 28px; color: #1e293b; margin: 0 0 8px;">Reset Your Password</h1>
              <p style="font-size: 16px; color: #64748b; margin: 0;">We received a request to reset your password</p>
            </div>

            <!-- Main Card -->
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 24px;">
              <p style="font-size: 16px; color: #334155; margin: 0 0 24px; line-height: 1.6;">
                Hello ${d.recipientName || 'there'},<br><br>
                Click the button below to create a new password. This link expires in ${d.expiresInHours || 1} hour(s).
              </p>

              <!-- Reset Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${d.resetLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(245,158,11,0.3);">
                  Reset Password
                </a>
              </div>

              <!-- Fallback Link -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="font-size: 13px; color: #64748b; margin: 0 0 8px;">If the button doesn't work, copy and paste this URL:</p>
                <p style="font-size: 12px; color: #3b82f6; margin: 0; word-break: break-all;">${d.resetLink}</p>
              </div>

              <!-- Security Notice -->
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px;">
                <p style="font-size: 14px; color: #991b1b; margin: 0;">
                  ⚠️ If you didn't request this password reset, please ignore this email. Your account remains secure.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0;">
                © ${new Date().getFullYear()} AI Agent Platform. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,

      'email_verification': (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #3b82f6, #06b6d4); border-radius: 16px; line-height: 56px; font-size: 24px; font-weight: bold; color: white; margin-bottom: 16px;">✉️</div>
              <h1 style="font-size: 28px; color: #1e293b; margin: 0 0 8px;">Verify Your Email</h1>
              <p style="font-size: 16px; color: #64748b; margin: 0;">One last step to activate your account</p>
            </div>

            <!-- Main Card -->
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 24px;">
              <p style="font-size: 16px; color: #334155; margin: 0 0 24px; line-height: 1.6;">
                Hello ${d.recipientName || 'there'},<br><br>
                Please verify your email address to complete your registration and unlock all features.
              </p>

              <!-- Verify Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${d.verificationLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #06b6d4); color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(59,130,246,0.3);">
                  Verify Email Address
                </a>
              </div>

              <p style="font-size: 14px; color: #64748b; margin: 0; text-align: center;">
                This link expires in ${d.expiresInDays || 7} days.
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0;">
                © ${new Date().getFullYear()} AI Agent Platform. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,

      'invoice': (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice ${d.invoiceNumber}</title>
        </head>
        <body style="font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 16px; line-height: 56px; font-size: 24px; font-weight: bold; color: white; margin-bottom: 16px;">🧾</div>
              <h1 style="font-size: 28px; color: #1e293b; margin: 0 0 8px;">Invoice ${d.invoiceNumber}</h1>
              <p style="font-size: 16px; color: #64748b; margin: 0;">Thank you for your payment!</p>
            </div>

            <!-- Main Card -->
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 24px;">
              <p style="font-size: 16px; color: #334155; margin: 0 0 24px; line-height: 1.6;">
                Hello ${d.recipientName || 'there'},<br><br>
                Your payment has been processed successfully. Here are the details:
              </p>

              <!-- Invoice Details -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 4px;">Amount</p>
                    <p style="font-size: 24px; font-weight: 700; color: #166534; margin: 0;">$${d.amount}</p>
                  </div>
                  <div>
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 4px;">Date</p>
                    <p style="font-size: 16px; color: #334155; margin: 0;">${new Date(d.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 4px;">Status</p>
                    <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">Paid</span>
                  </div>
                  <div>
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 4px;">Plan</p>
                    <p style="font-size: 16px; color: #334155; margin: 0;">${d.planName || 'Subscription'}</p>
                  </div>
                </div>

                ${d.overageAmount ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #bbf7d0;">
                  <div style="display: flex; justify-content: space-between; font-size: 14px; color: #64748b;">
                    <span>Overage Charges</span>
                    <span>$${d.overageAmount}</span>
                  </div>
                </div>
                ` : ''}
              </div>

              ${d.pdfUrl ? `
              <div style="text-align: center;">
                <a href="${d.pdfUrl}" 
                   style="display: inline-block; background: #f1f5f9; color: #3b82f6; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
                  📄 Download Invoice PDF
                </a>
              </div>
              ` : ''}
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0;">
                © ${new Date().getFullYear()} AI Agent Platform. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,

      'payment_failed': (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Failed</title>
        </head>
        <body style="font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 16px; line-height: 56px; font-size: 24px; font-weight: bold; color: white; margin-bottom: 16px;">⚠️</div>
              <h1 style="font-size: 28px; color: #1e293b; margin: 0 0 8px;">Payment Failed</h1>
              <p style="font-size: 16px; color: #64748b; margin: 0;">We couldn't process your payment</p>
            </div>

            <!-- Main Card -->
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 24px;">
              <p style="font-size: 16px; color: #334155; margin: 0 0 24px; line-height: 1.6;">
                Hello ${d.recipientName || 'there'},<br><br>
                We were unable to process your payment for the amount below.
              </p>

              <!-- Error Details -->
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <div style="margin-bottom: 16px;">
                  <p style="font-size: 13px; color: #991b1b; margin: 0 0 4px;">Amount</p>
                  <p style="font-size: 24px; font-weight: 700; color: #991b1b; margin: 0;">$${d.amount}</p>
                </div>
                <div style="padding-top: 16px; border-top: 1px solid #fecaca;">
                  <p style="font-size: 13px; color: #991b1b; margin: 0 0 4px;">Error</p>
                  <p style="font-size: 14px; color: #991b1b; margin: 0;">${d.errorMessage || 'Payment processing failed'}</p>
                </div>
              </div>

              <!-- CTA -->
              <div style="text-align: center;">
                <a href="${d.retryUrl || 'https://app.aiagentplatform.com/billing'}" 
                   style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(239,68,68,0.3);">
                  Update Payment Method
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0;">
                © ${new Date().getFullYear()} AI Agent Platform. All rights reserved.
              </p>
              <p style="font-size: 12px; color: #cbd5e1; margin: 8px 0 0;">
                Need help? <a href="mailto:support@aiagentplatform.com" style="color: #3b82f6;">Contact Support</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,

      'usage_warning': (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Usage Limit Warning</title>
        </head>
        <body style="font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #f59e0b, #f97316); border-radius: 16px; line-height: 56px; font-size: 24px; font-weight: bold; color: white; margin-bottom: 16px;">⚡</div>
              <h1 style="font-size: 28px; color: #1e293b; margin: 0 0 8px;">Usage Limit Alert</h1>
              <p style="font-size: 16px; color: #64748b; margin: 0;">You're approaching your plan limits</p>
            </div>

            <!-- Main Card -->
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 24px;">
              <p style="font-size: 16px; color: #334155; margin: 0 0 24px; line-height: 1.6;">
                Hello ${d.recipientName || 'there'},<br><br>
                You have used <strong>${d.percentage}%</strong> of your monthly ${d.metric} limit.
              </p>

              <!-- Usage Bar -->
              <div style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 14px; color: #64748b;">Used: ${d.used}/${d.limit}</span>
                  <span style="font-size: 14px; font-weight: 600; color: ${d.percentage >= 90 ? '#ef4444' : d.percentage >= 70 ? '#f59e0b' : '#10b981'};">${d.percentage}%</span>
                </div>
                <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <div style="height: 100%; width: ${Math.min(d.percentage, 100)}%; background: ${d.percentage >= 90 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : d.percentage >= 70 ? 'linear-gradient(90deg, #f59e0b, #f97316)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)'}; border-radius: 4px; transition: width 0.3s ease;"></div>
                </div>
              </div>

              <!-- Overage Warning -->
              ${d.isOverLimit ? `
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="font-size: 14px; color: #991b1b; margin: 0;">
                  ⚠️ You are now in <strong>overage territory</strong>. Additional usage will be charged at <strong>$${d.overageRate}/${d.metric === 'AI Actions' ? 'action' : 'call'}</strong>.
                </p>
              </div>
              ` : `
              <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="font-size: 14px; color: #854d0e; margin: 0;">
                  📊 Resets on <strong>${new Date(d.resetDate).toLocaleDateString()}</strong>. After your limit, overage charges apply at <strong>$${d.overageRate}/${d.metric === 'AI Actions' ? 'action' : 'call'}</strong>.
                </p>
              </div>
              `}

              <!-- Upgrade CTA -->
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                <h3 style="font-size: 15px; color: #0369a1; margin: 0 0 8px;">💡 Consider Upgrading</h3>
                <p style="font-size: 14px; color: #475569; margin: 0 0 12px;">
                  Upgrade to a higher plan for more actions and lower overage rates.
                </p>
                <a href="${d.upgradeUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                  View Plans — Starting at $39/mo
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0;">
                © ${new Date().getFullYear()} AI Agent Platform. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,

             'upgrade_confirmation': (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Plan Upgrade Confirmation</title>
        </head>
        <body style="font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 16px; line-height: 56px; font-size: 24px; font-weight: bold; color: white; margin-bottom: 16px;">🎉</div>
              <h1 style="font-size: 28px; color: #1e293b; margin: 0 0 8px;">Plan Upgraded!</h1>
              <p style="font-size: 16px; color: #64748b; margin: 0;">Welcome to ${d.planName}!</p>
            </div>

            <!-- Main Card -->
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 24px;">
              <p style="font-size: 16px; color: #334155; margin: 0 0 24px; line-height: 1.6;">
                Hello ${d.recipientName || 'there'},<br><br>
                Your plan has been upgraded to <strong>${d.planName}</strong>. Here's what you now have access to:
              </p>

              <!-- New Limits -->
              <div style="background: linear-gradient(135deg, #f0f9ff, #faf5ff); border: 1px solid #e0e7ff; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                    <p style="font-size: 28px; font-weight: 700; color: #6366f1; margin: 0;">${d.aiActions}</p>
                    <p style="font-size: 13px; color: #64748b; margin: 4px 0 0;">AI Actions/month</p>
                  </div>
                  <div>
                    <p style="font-size: 28px; font-weight: 700; color: #6366f1; margin: 0;">${d.apiCalls}</p>
                    <p style="font-size: 13px; color: #64748b; margin: 4px 0 0;">API Calls/month</p>
                  </div>
                  <div>
                    <p style="font-size: 28px; font-weight: 700; color: #6366f1; margin: 0;">${d.teamMembers}</p>
                    <p style="font-size: 13px; color: #64748b; margin: 4px 0 0;">Team Members</p>
                  </div>
                  <div>
                    <p style="font-size: 28px; font-weight: 700; color: #6366f1; margin: 0;">${d.storageGB}GB</p>
                    <p style="font-size: 13px; color: #64748b; margin: 4px 0 0;">Storage</p>
                  </div>
                </div>
              </div>

              <!-- New Features -->
              <div style="margin-bottom: 24px;">
                <h3 style="font-size: 16px; color: #1e293b; margin: 0 0 12px;">🆕 New Features Unlocked</h3>
                <div style="display: grid; gap: 8px;">
                  ${(d.newFeatures || []).map((feature: string) => `
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #475569; padding: 8px; background: #f8fafc; border-radius: 8px;">
                      <span>✨</span>
                      <span>${feature}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Overage Info -->
              ${d.overagePricing ? `
              <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h4 style="font-size: 14px; color: #64748b; margin: 0 0 8px;">📊 Overage Pricing (beyond limits)</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #475569;">
                  <div>AI Actions: $${d.overagePricing.aiAction}/action</div>
                  <div>API Calls: $${d.overagePricing.apiCall}/call</div>
                  ${d.overagePricing.imageGeneration ? `<div>Image Gen: $${d.overagePricing.imageGeneration}/image</div>` : ''}
                  ${d.overagePricing.videoGeneration ? `<div>Video Gen: $${d.overagePricing.videoGeneration}/video</div>` : ''}
                </div>
              </div>
              ` : ''}

              <!-- Billing Info -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="font-size: 14px; color: #166534; margin: 0;">
                  💳 <strong>${this.formatCurrency(d.price)}/${d.interval}</strong> charged to your payment method. 
                  Next billing: <strong>${new Date(d.nextBillingDate).toLocaleDateString()}</strong>
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align: center;">
                <a href="${d.dashboardUrl || 'https://app.aiagentplatform.com/dashboard'}" 
                   style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(139,92,246,0.3);">
                  Start Using Your New Features
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0 0 8px;">
                © ${new Date().getFullYear()} AI Agent Platform. All rights reserved.
              </p>
              <p style="font-size: 12px; color: #cbd5e1; margin: 0;">
                Manage your subscription at any time in <a href="${d.billingUrl || 'https://app.aiagentplatform.com/billing'}" style="color: #8b5cf6;">Billing Settings</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,

      'daily_digest': (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Daily Digest</title>
        </head>
        <body style="font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 16px; line-height: 56px; font-size: 24px; font-weight: bold; color: white; margin-bottom: 16px;">📊</div>
              <h1 style="font-size: 28px; color: #1e293b; margin: 0 0 8px;">Your Daily Digest</h1>
              <p style="font-size: 16px; color: #64748b; margin: 0;">${new Date().toLocaleDateString()}</p>
            </div>

            <!-- Stats Cards -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
              <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); text-align: center;">
                <p style="font-size: 32px; font-weight: 700; color: #3b82f6; margin: 0;">${d.totalExecutions || 0}</p>
                <p style="font-size: 13px; color: #64748b; margin: 4px 0 0;">Total Actions</p>
              </div>
              <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); text-align: center;">
                <p style="font-size: 32px; font-weight: 700; color: #10b981; margin: 0;">${d.successful || 0}</p>
                <p style="font-size: 13px; color: #64748b; margin: 4px 0 0;">Successful</p>
              </div>
              <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); text-align: center;">
                <p style="font-size: 32px; font-weight: 700; color: #f59e0b; margin: 0;">$${(d.totalCost || 0).toFixed(2)}</p>
                <p style="font-size: 13px; color: #64748b; margin: 4px 0 0;">Total Cost</p>
              </div>
              <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); text-align: center;">
                <p style="font-size: 32px; font-weight: 700; color: #8b5cf6; margin: 0;">${((d.totalTokens || 0) / 1000).toFixed(1)}K</p>
                <p style="font-size: 13px; color: #64748b; margin: 4px 0 0;">Tokens Used</p>
              </div>
            </div>

            <!-- Agent Breakdown -->
            ${d.byAgent && Object.keys(d.byAgent).length > 0 ? `
            <div style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 24px;">
              <h3 style="font-size: 16px; color: #1e293b; margin: 0 0 16px;">🤖 Usage by Agent</h3>
              ${Object.entries(d.byAgent).map(([agent, count]) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                  <span style="font-size: 14px; color: #475569;">${agent}</span>
                  <span style="font-size: 14px; font-weight: 600; color: #1e293b;">${count}</span>
                </div>
              `).join('')}
            </div>
            ` : ''}

            <!-- CTA -->
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${d.dashboardUrl || 'https://app.aiagentplatform.com/analytics'}" 
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 600;">
                View Full Analytics
              </a>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0 0 8px;">
                © ${new Date().getFullYear()} AI Agent Platform. All rights reserved.
              </p>
              <p style="font-size: 12px; color: #cbd5e1; margin: 0;">
                <a href="${d.unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe from daily digest</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,

      'weekly_report': (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Weekly Report</title>
        </head>
        <body style="font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #8b5cf6, #ec4899); border-radius: 16px; line-height: 56px; font-size: 24px; font-weight: bold; color: white; margin-bottom: 16px;">📈</div>
              <h1 style="font-size: 28px; color: #1e293b; margin: 0 0 8px;">Your Weekly Report</h1>
              <p style="font-size: 16px; color: #64748b; margin: 0;">${d.startDate} - ${d.endDate}</p>
            </div>

            <!-- Summary -->
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 24px;">
              <h3 style="font-size: 18px; color: #1e293b; margin: 0 0 20px;">📊 Weekly Summary</h3>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center;">
                  <p style="font-size: 36px; font-weight: 700; color: #3b82f6; margin: 0;">${d.totalExecutions || 0}</p>
                  <p style="font-size: 14px; color: #64748b; margin: 4px 0 0;">Total Executions</p>
                  <p style="font-size: 12px; color: #94a3b8; margin: 4px 0 0;">${d.successful || 0} success, ${d.failed || 0} failed</p>
                </div>
                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center;">
                  <p style="font-size: 36px; font-weight: 700; color: #10b981; margin: 0;">$${(d.totalCost || 0).toFixed(2)}</p>
                  <p style="font-size: 14px; color: #64748b; margin: 4px 0 0;">Total Cost</p>
                  <p style="font-size: 12px; color: #94a3b8; margin: 4px 0 0;">${((d.totalTokens || 0) / 1000).toFixed(1)}K tokens</p>
                </div>
              </div>

              <!-- Daily Breakdown -->
              ${d.dailyBreakdown ? `
              <h4 style="font-size: 15px; color: #475569; margin: 0 0 12px;">📅 Daily Breakdown</h4>
              <div style="margin-bottom: 20px;">
                ${Object.entries(d.dailyBreakdown).map(([date, count]: [string, number]) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-size: 14px; color: #475569;">${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 80px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${Math.min((count / (d.highestDayCount || 1)) * 100, 100)}%; background: #3b82f6; border-radius: 3px;"></div>
                      </div>
                      <span style="font-size: 14px; font-weight: 600; color: #1e293b; width: 30px; text-align: right;">${count}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
              ` : ''}

              <!-- Agent Usage -->
              ${d.byAgent ? `
              <h4 style="font-size: 15px; color: #475569; margin: 0 0 12px;">🤖 Agent Usage</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${Object.entries(d.byAgent).map(([agent, count]) => `
                  <div style="background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center;">
                    <p style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0;">${count}</p>
                    <p style="font-size: 12px; color: #64748b; margin: 4px 0 0;">${agent}</p>
                  </div>
                `).join('')}
              </div>
              ` : ''}
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${d.dashboardUrl || 'https://app.aiagentplatform.com/analytics'}" 
                 style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 600;">
                View Detailed Analytics
              </a>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0 0 8px;">
                © ${new Date().getFullYear()} AI Agent Platform. All rights reserved.
              </p>
              <p style="font-size: 12px; color: #cbd5e1; margin: 0;">
                <a href="${d.unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe from weekly reports</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const templateFn = templates[template];
    if (!templateFn) {
      logger.warn({ template }, 'Email template not found');
      return `<p>${JSON.stringify(data)}</p>`;
    }

    return templateFn(data);
  }

  // Public API methods
  static async sendWelcomeEmail(to: string, name: string, dashboardUrl: string): Promise<{ success: boolean; messageId?: string }> {
    return this.sendEmail({
      to,
      toName: name,
      subject: 'Welcome to AI Agent Platform!',
      template: 'welcome',
      data: { recipientName: name, dashboardUrl },
    });
  }

  static async sendPasswordResetEmail(to: string, name: string, resetLink: string, expiresInHours: number = 1): Promise<{ success: boolean; messageId?: string }> {
    return this.sendEmail({
      to,
      toName: name,
      subject: 'Reset Your Password',
      template: 'password_reset',
      data: { recipientName: name, resetLink, expiresInHours },
    });
  }

  static async sendPasswordChangedEmail(to: string, name: string): Promise<{ success: boolean; messageId?: string }> {
    return this.sendEmail({
      to,
      toName: name,
      subject: 'Your Password Was Changed',
      template: 'password_changed',
      data: { recipientName: name, changedAt: new Date().toISOString() },
    });
  }

  static async sendEmailVerification(to: string, name: string, verificationLink: string, expiresInDays: number = 7): Promise<{ success: boolean; messageId?: string }> {
    return this.sendEmail({
      to,
      toName: name,
      subject: 'Verify Your Email Address',
      template: 'email_verification',
      data: { recipientName: name, verificationLink, expiresInDays },
    });
  }

  static async sendInvoiceEmail(to: string, name: string, invoiceNumber: string, amount: number, date: Date, pdfUrl?: string): Promise<{ success: boolean; messageId?: string }> {
    return this.sendEmail({
      to,
      toName: name,
      subject: `Invoice ${invoiceNumber}`,
      template: 'invoice',
      data: { recipientName: name, invoiceNumber, amount, date: date.toISOString(), pdfUrl },
    });
  }

  static async sendPaymentFailureEmail(to: string, name: string, amount: number, errorMessage: string, retryUrl: string): Promise<{ success: boolean; messageId?: string }> {
    return this.sendEmail({
      to,
      toName: name,
      subject: 'Payment Failed',
      template: 'payment_failed',
      data: { recipientName: name, amount, errorMessage, retryUrl },
    });
  }

  static async sendUsageWarningEmail(to: string, name: string, metric: string, used: number, limit: number, percentage: number, resetDate: Date, upgradeUrl: string): Promise<{ success: boolean; messageId?: string }> {
    return this.sendEmail({
      to,
      toName: name,
      subject: `Usage Limit Alert: ${percentage}% of ${metric} used`,
      template: 'usage_warning',
      data: { recipientName: name, metric, used, limit, percentage, resetDate: resetDate.toISOString(), upgradeUrl },
    });
  }

  static async sendUpgradeConfirmationEmail(data: {
    to: string;
    name: string;
    planName: string;
    aiActions: number | string;
    apiCalls: number | string;
    teamMembers: number;
    storageGB: number;
    price: number;
    interval: string;
    nextBillingDate: Date;
    newFeatures: string[];
    overagePricing?: {
      aiAction: number;
      apiCall: number;
      imageGeneration?: number;
      videoGeneration?: number;
    };
    dashboardUrl?: string;
    billingUrl?: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    return this.sendEmail({
      to: data.to,
      toName: data.name,
      subject: `Welcome to ${data.planName}! 🎉`,
      template: 'upgrade_confirmation',
      data: {
        recipientName: data.name,
        planName: data.planName,
        aiActions: typeof data.aiActions === 'number' ? data.aiActions.toLocaleString() : data.aiActions,
        apiCalls: typeof data.apiCalls === 'number' ? data.apiCalls.toLocaleString() : data.apiCalls,
        teamMembers: data.teamMembers,
        storageGB: data.storageGB,
        price: data.price,
        interval: data.interval,
        nextBillingDate: data.nextBillingDate.toISOString(),
        newFeatures: data.newFeatures,
        overagePricing: data.overagePricing,
        dashboardUrl: data.dashboardUrl,
        billingUrl: data.billingUrl,
      },
    });
  }

  static async sendDailyDigest(data: {
    to: string;
    name: string;
    totalExecutions: number;
    successful: number;
    failed: number;
    totalCost: number;
    totalTokens: number;
    byAgent: Record<string, number>;
    dashboardUrl?: string;
    unsubscribeUrl?: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    return this.sendEmail({
      to: data.to,
      toName: data.name,
      subject: `Your Daily Digest - ${new Date().toLocaleDateString()}`,
      template: 'daily_digest',
      data: {
        recipientName: data.name,
        totalExecutions: data.totalExecutions,
        successful: data.successful,
        failed: data.failed,
        totalCost: data.totalCost,
        totalTokens: data.totalTokens,
        byAgent: data.byAgent,
        dashboardUrl: data.dashboardUrl,
        unsubscribeUrl: data.unsubscribeUrl,
      },
    });
  }

  static async sendWeeklyReport(data: {
    to: string;
    name: string;
    startDate: string;
    endDate: string;
    totalExecutions: number;
    successful: number;
    failed: number;
    totalCost: number;
    totalTokens: number;
    dailyBreakdown: Record<string, number>;
    highestDayCount: number;
    byAgent: Record<string, number>;
    dashboardUrl?: string;
    unsubscribeUrl?: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    return this.sendEmail({
      to: data.to,
      toName: data.name,
      subject: `Your Weekly Report - ${data.startDate} to ${data.endDate}`,
      template: 'weekly_report',
      data: {
        recipientName: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        totalExecutions: data.totalExecutions,
        successful: data.successful,
        failed: data.failed,
        totalCost: data.totalCost,
        totalTokens: data.totalTokens,
        dailyBreakdown: data.dailyBreakdown,
        highestDayCount: data.highestDayCount,
        byAgent: data.byAgent,
        dashboardUrl: data.dashboardUrl,
        unsubscribeUrl: data.unsubscribeUrl,
      },
    });
  }
}