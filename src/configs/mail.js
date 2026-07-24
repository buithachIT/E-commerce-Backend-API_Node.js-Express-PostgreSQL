"use strict";

const nodemailer = require("nodemailer");

const PLACEHOLDER_MARKERS = [
  "your@",
  "your_app_password",
  "change_me",
  "example.com",
];

const isPlaceholderSmtp = () => {
  const user = String(process.env.SMTP_USER || "").toLowerCase();
  const pass = String(process.env.SMTP_PASS || "").toLowerCase();
  if (!process.env.SMTP_HOST || !user || !pass) return true;
  return PLACEHOLDER_MARKERS.some(
    (marker) => user.includes(marker) || pass.includes(marker),
  );
};

const createMailTransporter = () => {
  if (isPlaceholderSmtp()) {
    return null;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

module.exports = {
  createMailTransporter,
};
