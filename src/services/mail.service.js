"use strict";

const { createMailTransporter } = require("../configs/mail");

const getFromAddress = () =>
  process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@localhost";

const getAppUrl = () =>
  process.env.APP_URL || `http://localhost:${process.env.PORT || 3055}`;

class MailService {
  static async #send({ to, subject, text, html }) {
    const transporter = createMailTransporter();

    if (!transporter) {
      console.log("[MailService] SMTP not configured — logging email instead");
      console.log({ to, subject, text });
      return { mocked: true };
    }

    return transporter.sendMail({
      from: getFromAddress(),
      to,
      subject,
      text,
      html,
    });
  }

  static async sendVerifyEmail({ to, token }) {
    const appUrl = getAppUrl();
    const subject = "Verify your email";
    const text = [
      "Welcome! Please verify your email.",
      `Token: ${token}`,
      `Or call POST ${appUrl}/v1/api/shop/verify-email with body { "token": "..." }`,
      "This token expires in 24 hours.",
    ].join("\n");

    const html = `
      <p>Welcome! Please verify your email.</p>
      <p><strong>Token:</strong> <code>${token}</code></p>
      <p>Send <code>POST ${appUrl}/v1/api/shop/verify-email</code> with body:</p>
      <pre>{"token":"${token}"}</pre>
      <p>This token expires in 24 hours.</p>
    `;

    return this.#send({ to, subject, text, html });
  }

  static async sendResetPasswordEmail({ to, token }) {
    const appUrl = getAppUrl();
    const subject = "Reset your password";
    const text = [
      "You requested a password reset.",
      `Token: ${token}`,
      `Call POST ${appUrl}/v1/api/shop/reset-password with body:`,
      `{ "token": "...", "newPassword": "..." }`,
      "This token expires in 1 hour.",
      "If you did not request this, ignore this email.",
    ].join("\n");

    const html = `
      <p>You requested a password reset.</p>
      <p><strong>Token:</strong> <code>${token}</code></p>
      <p>Send <code>POST ${appUrl}/v1/api/shop/reset-password</code> with body:</p>
      <pre>{"token":"${token}","newPassword":"your-new-password"}</pre>
      <p>This token expires in 1 hour.</p>
    `;

    return this.#send({ to, subject, text, html });
  }
}

module.exports = MailService;
