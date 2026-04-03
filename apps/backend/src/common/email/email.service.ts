import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  context?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryCount?: number;
}

export interface EmailLog {
  timestamp: Date;
  to: string | string[];
  subject: string;
  success: boolean;
  messageId?: string;
  error?: string;
  retryCount: number;
  duration: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Email Service
 * 提供邮件发送功能，支持 SMTP 协议
 *
 * 支持的邮件服务商：
 * - SendGrid (smtp.sendgrid.net)
 * - 阿里云邮件推送 (smtpdm.aliyun.com)
 * - 腾讯企业邮箱 (smtp.exmail.qq.com)
 * - 自定义 SMTP 服务器
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;
  private transporter: Transporter | null = null;
  private readonly retryConfig: RetryConfig;
  private emailLogs: EmailLog[] = [];
  private readonly maxLogSize = 1000;

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get<string>(
      "SMTP_FROM_EMAIL",
      "noreply@aineed.com",
    );
    this.fromName = this.configService.get<string>("SMTP_FROM_NAME", "AiNeed");
    this.frontendUrl = this.configService.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
    this.retryConfig = {
      maxRetries: this.configService.get<number>("SMTP_MAX_RETRIES", 3),
      baseDelayMs: this.configService.get<number>(
        "SMTP_RETRY_BASE_DELAY",
        1000,
      ),
      maxDelayMs: this.configService.get<number>("SMTP_RETRY_MAX_DELAY", 10000),
    };
  }

  async onModuleInit() {
    await this.initializeTransporter();
  }

  /**
   * 初始化邮件传输器
   */
  private async initializeTransporter(): Promise<void> {
    const host = this.configService.get<string>("SMTP_HOST");
    const port = this.configService.get<number>("SMTP_PORT", 587);
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");
    const secure = this.configService.get<boolean>("SMTP_SECURE", false);

    // 如果没有配置 SMTP，使用模拟模式
    if (!host || !user || !pass) {
      this.logger.warn(
        "SMTP configuration not found. Email service will run in simulation mode. " +
          "Configure SMTP_HOST, SMTP_USER, and SMTP_PASS to enable real email sending.",
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        // 连接池配置
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        // 超时配置
        connectionTimeout: 10000,
        socketTimeout: 10000,
        // TLS 配置
        tls: {
          rejectUnauthorized: this.configService.get<boolean>(
            "SMTP_REJECT_UNAUTHORIZED",
            true,
          ),
        },
      });

      // 验证连接
      await this.transporter.verify();
      this.logger.log(
        `Email transporter initialized successfully. Connected to ${host}:${port}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize email transporter: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      this.transporter = null;
    }
  }

  /**
   * 发送邮件（带重试机制）
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now();
    let lastError: string | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      retryCount = attempt;
      try {
        const result = await this.doSend(options);
        const duration = Date.now() - startTime;

        // 记录日志
        this.logEmail({
          timestamp: new Date(),
          to: options.to,
          subject: options.subject,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          retryCount,
          duration,
        });

        return { ...result, retryCount };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(
          `Email send attempt ${attempt + 1} failed: ${lastError}`,
        );

        // 如果还有重试机会，等待后重试
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt);
          this.logger.debug(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    const duration = Date.now() - startTime;

    // 记录失败日志
    this.logEmail({
      timestamp: new Date(),
      to: options.to,
      subject: options.subject,
      success: false,
      error: lastError,
      retryCount,
      duration,
    });

    return {
      success: false,
      error: lastError,
      retryCount,
    };
  }

  /**
   * 实际发送邮件
   */
  private async doSend(options: EmailOptions): Promise<EmailResult> {
    const { to, subject, html, text, attachments } = options;

    // 如果没有配置真实传输器，使用模拟模式
    if (!this.transporter) {
      return this.simulateSend(options);
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: Array.isArray(to) ? to.join(",") : to,
      subject,
      html,
      text,
      attachments: attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
      headers: {
        "X-Mailer": "AiNeed Mailer",
        "X-Priority": "3",
      },
    };

    const info = await this.transporter.sendMail(mailOptions);

    this.logger.debug(`Email sent successfully. MessageId: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  }

  /**
   * 模拟发送（开发/测试环境）
   */
  private simulateSend(options: EmailOptions): Promise<EmailResult> {
    const { to, subject } = options;

    this.logger.log(
      `[SIMULATION] Sending email to ${Array.isArray(to) ? to.join(", ") : to}: ${subject}`,
    );

    const messageId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.debug(`[SIMULATION] Email sent. MessageId: ${messageId}`);

    return Promise.resolve({
      success: true,
      messageId,
    });
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelayMs * Math.pow(2, attempt),
      this.retryConfig.maxDelayMs,
    );
    // 添加随机抖动，避免同时重试
    return delay + Math.random() * 500;
  }

  /**
   * 异步等待
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 记录邮件日志
   */
  private logEmail(log: EmailLog): void {
    this.emailLogs.push(log);
    // 保持日志大小限制
    if (this.emailLogs.length > this.maxLogSize) {
      this.emailLogs.shift();
    }
  }

  /**
   * 获取邮件发送日志
   */
  getEmailLogs(limit: number = 100): EmailLog[] {
    return this.emailLogs.slice(-limit);
  }

  /**
   * 获取邮件发送统计
   */
  getEmailStats(): {
    total: number;
    success: number;
    failed: number;
    successRate: number;
  } {
    const total = this.emailLogs.length;
    const success = this.emailLogs.filter((log) => log.success).length;
    const failed = total - success;
    const successRate = total > 0 ? (success / total) * 100 : 0;

    return { total, success, failed, successRate };
  }

  // ============================================
  // 便捷方法 - 预定义的邮件模板
  // ============================================

  /**
   * 发送欢迎邮件
   */
  async sendWelcomeEmail(
    email: string,
    nickname?: string,
  ): Promise<EmailResult> {
    const html = this.renderTemplate("welcome", {
      nickname: nickname || "用户",
      loginUrl: `${this.frontendUrl}/login`,
      year: new Date().getFullYear(),
    });

    return this.send({
      to: email,
      subject: "欢迎使用 AiNeed",
      html,
    });
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<EmailResult> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    const html = this.renderTemplate("password-reset", {
      resetUrl,
      expiresIn: "1 小时",
      year: new Date().getFullYear(),
    });

    return this.send({
      to: email,
      subject: "重置您的密码 - AiNeed",
      html,
    });
  }

  /**
   * 发送邮件验证
   */
  async sendEmailVerification(
    email: string,
    verificationToken: string,
  ): Promise<EmailResult> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}`;

    const html = this.renderTemplate("email-verification", {
      verificationUrl,
      expiresIn: "24 小时",
      year: new Date().getFullYear(),
    });

    return this.send({
      to: email,
      subject: "验证您的邮箱 - AiNeed",
      html,
    });
  }

  /**
   * 发送通知邮件
   */
  async sendNotificationEmail(
    email: string,
    title: string,
    content: string,
  ): Promise<EmailResult> {
    const html = this.renderTemplate("notification", {
      title,
      content,
      year: new Date().getFullYear(),
    });

    return this.send({
      to: email,
      subject: title,
      html,
    });
  }

  /**
   * 发送订阅确认邮件
   */
  async sendSubscriptionConfirmationEmail(
    email: string,
    planName: string,
    amount: number,
    startDate: Date,
    endDate: Date,
  ): Promise<EmailResult> {
    const html = this.renderTemplate("subscription-confirmation", {
      planName,
      amount: amount.toFixed(2),
      startDate: startDate.toLocaleDateString("zh-CN"),
      endDate: endDate.toLocaleDateString("zh-CN"),
      dashboardUrl: `${this.frontendUrl}/dashboard/subscription`,
      year: new Date().getFullYear(),
    });

    return this.send({
      to: email,
      subject: "订阅确认 - AiNeed",
      html,
    });
  }

  /**
   * 发送订单确认邮件
   */
  async sendOrderConfirmationEmail(
    email: string,
    orderNo: string,
    items: Array<{ name: string; quantity: number; price: number }>,
    totalAmount: number,
  ): Promise<EmailResult> {
    const html = this.renderTemplate("order-confirmation", {
      orderNo,
      items,
      totalAmount: totalAmount.toFixed(2),
      orderUrl: `${this.frontendUrl}/dashboard/orders/${orderNo}`,
      year: new Date().getFullYear(),
    });

    return this.send({
      to: email,
      subject: `订单确认 #${orderNo} - AiNeed`,
      html,
    });
  }

  /**
   * 发送定制服务更新邮件
   */
  async sendCustomizationUpdateEmail(
    email: string,
    requestId: string,
    status: string,
    message: string,
  ): Promise<EmailResult> {
    const statusText: Record<string, string> = {
      pending: "待处理",
      processing: "处理中",
      completed: "已完成",
      cancelled: "已取消",
    };

    const html = this.renderTemplate("customization-update", {
      requestId,
      status: statusText[status] || status,
      message,
      detailUrl: `${this.frontendUrl}/dashboard/customization/${requestId}`,
      year: new Date().getFullYear(),
    });

    return this.send({
      to: email,
      subject: `定制服务更新 - ${statusText[status] || status} - AiNeed`,
      html,
    });
  }

  // ============================================
  // 邮件模板渲染
  // ============================================

  /**
   * 渲染邮件模板
   */
  private renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): string {
    const templates: Record<string, (ctx: Record<string, any>) => string> = {
      welcome: this.welcomeTemplate,
      "password-reset": this.passwordResetTemplate,
      "email-verification": this.emailVerificationTemplate,
      notification: this.notificationTemplate,
      "subscription-confirmation": this.subscriptionConfirmationTemplate,
      "order-confirmation": this.orderConfirmationTemplate,
      "customization-update": this.customizationUpdateTemplate,
    };

    const template = templates[templateName];
    if (!template) {
      this.logger.warn(`Template "${templateName}" not found, using default`);
      return this.defaultTemplate(context);
    }

    return template.call(this, context);
  }

  private welcomeTemplate(ctx: Record<string, any>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎨 欢迎来到 AiNeed</h1>
          </div>
          <div class="content">
            <p>亲爱的 <strong>${ctx.nickname}</strong>，</p>
            <p>感谢您注册 AiNeed，您的专属 AI 造型师已准备就绪！</p>
            <p>我们将帮助您：</p>
            <ul>
              <li>✨ 分析您的体型和色彩特征</li>
              <li>👗 获得个性化的穿搭推荐</li>
              <li>🔮 体验虚拟试衣功能</li>
              <li>💬 随时咨询 AI 造型师</li>
            </ul>
            <a href="${ctx.loginUrl}" class="button">立即开始</a>
            <p>如有任何问题，请随时联系我们的客服团队。</p>
          </div>
          <div class="footer">
            <p>© ${ctx.year} AiNeed. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private passwordResetTemplate(ctx: Record<string, unknown>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 密码重置</h1>
          </div>
          <div class="content">
            <p>您好，</p>
            <p>您收到了此邮件是因为您（或其他人）请求重置 AiNeed 账户的密码。</p>
            <p style="text-align: center;">
              <a href="${ctx.resetUrl}" class="button">重置密码</a>
            </p>
            <p>或者复制以下链接到浏览器：</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px; font-size: 12px;">
              ${ctx.resetUrl}
            </p>
            <div class="warning">
              ⚠️ <strong>注意：</strong>此链接将在 ${ctx.expiresIn} 后失效。
            </div>
            <p>如果您没有请求重置密码，请忽略此邮件，您的密码不会被更改。</p>
          </div>
          <div class="footer">
            <p>© ${ctx.year} AiNeed. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private emailVerificationTemplate(ctx: Record<string, unknown>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 验证您的邮箱</h1>
          </div>
          <div class="content">
            <p>您好，</p>
            <p>请点击下方按钮验证您的邮箱地址：</p>
            <p style="text-align: center;">
              <a href="${ctx.verificationUrl}" class="button">验证邮箱</a>
            </p>
            <p>或者复制以下链接到浏览器：</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px; font-size: 12px;">
              ${ctx.verificationUrl}
            </p>
            <p>⏰ 此链接将在 ${ctx.expiresIn} 后失效。</p>
          </div>
          <div class="footer">
            <p>© ${ctx.year} AiNeed. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private notificationTemplate(ctx: Record<string, unknown>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 ${ctx.title}</h1>
          </div>
          <div class="content">
            ${ctx.content}
          </div>
          <div class="footer">
            <p>此邮件由 AiNeed 自动发送，请勿直接回复。</p>
            <p>© ${ctx.year} AiNeed. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private subscriptionConfirmationTemplate(ctx: Record<string, unknown>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #333; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .plan-info { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .plan-info h3 { margin-top: 0; color: #667eea; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⭐ 订阅成功</h1>
          </div>
          <div class="content">
            <p>恭喜！您已成功订阅 <strong>${ctx.planName}</strong></p>
            <div class="plan-info">
              <h3>订阅详情</h3>
              <p><strong>订阅金额：</strong>¥${ctx.amount}</p>
              <p><strong>生效日期：</strong>${ctx.startDate}</p>
              <p><strong>到期日期：</strong>${ctx.endDate}</p>
            </div>
            <p style="text-align: center;">
              <a href="${ctx.dashboardUrl}" class="button">查看我的订阅</a>
            </p>
            <p>感谢您的支持！如有任何问题，请随时联系我们的客服团队。</p>
          </div>
          <div class="footer">
            <p>© ${ctx.year} AiNeed. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private orderConfirmationTemplate(ctx: Record<string, unknown>): string {
    const items = (ctx.items ?? []) as Array<{ name: string; quantity: number; price: number }>;
    const itemsHtml = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${(item as { name: string }).name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${(item as { quantity: number }).quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">¥${(item as { price: number }).price.toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .order-table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; margin: 20px 0; }
          .order-table th { background: #f5f5f5; padding: 10px; text-align: left; }
          .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛒 订单确认</h1>
          </div>
          <div class="content">
            <p>您的订单已成功提交！</p>
            <p><strong>订单号：</strong>${ctx.orderNo}</p>
            <table class="order-table">
              <thead>
                <tr>
                  <th style="padding: 10px;">商品</th>
                  <th style="padding: 10px; text-align: center;">数量</th>
                  <th style="padding: 10px; text-align: right;">价格</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 10px; text-align: right;"><strong>总计：</strong></td>
                  <td style="padding: 10px; text-align: right;"><strong>¥${ctx.totalAmount}</strong></td>
                </tr>
              </tfoot>
            </table>
            <p style="text-align: center;">
              <a href="${ctx.orderUrl}" class="button">查看订单详情</a>
            </p>
          </div>
          <div class="footer">
            <p>© ${ctx.year} AiNeed. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private customizationUpdateTemplate(ctx: Record<string, unknown>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #9C27B0; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-box { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
          .button { display: inline-block; padding: 12px 30px; background: #9C27B0; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👔 定制服务更新</h1>
          </div>
          <div class="content">
            <p>您的定制服务状态已更新：</p>
            <div class="status-box">
              <p><strong>服务单号：</strong>${ctx.requestId}</p>
              <p><strong>当前状态：</strong>${ctx.status}</p>
              <p><strong>更新说明：</strong>${ctx.message}</p>
            </div>
            <p style="text-align: center;">
              <a href="${ctx.detailUrl}" class="button">查看详情</a>
            </p>
          </div>
          <div class="footer">
            <p>© ${ctx.year} AiNeed. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private defaultTemplate(ctx: Record<string, unknown>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AiNeed</h1>
          </div>
          <div class="content">
            <pre>${JSON.stringify(ctx, null, 2)}</pre>
          </div>
          <div class="footer">
            <p>© ${ctx.year || new Date().getFullYear()} AiNeed. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
