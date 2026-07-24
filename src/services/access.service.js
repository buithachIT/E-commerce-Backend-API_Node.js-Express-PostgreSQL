"use strict";

const { pool } = require("../dbs/init.postgres");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const KeyTokenService = require("./key-token.service");
const MailService = require("./mail.service");
const { createTokenPair } = require("../auth/auth-utils");
const { getDataInfo } = require("../utils");
const {
  BadRequestError,
  AuthFailureError,
  ForbiddenError,
  NotFoundError,
} = require("../core/error.response");
const { findByEmail, findById } = require("./user.service");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createRawToken = () => crypto.randomBytes(32).toString("hex");

const GENERIC_EMAIL_MESSAGE =
  "If an account with that email exists, we have sent further instructions.";

class AccessService {
  static refreshToken = async ({ refreshToken, user, keyStore }) => {
    const { userId, email } = user;
    const usedTokens = keyStore.refresh_tokens_used || [];
    if (usedTokens.includes(refreshToken)) {
      await KeyTokenService.removeKeyById(keyStore.id);
      throw new ForbiddenError("Something warning happened!! Please re-login!");
    }

    if (keyStore.refresh_token !== refreshToken)
      throw new AuthFailureError("Shop not found!");

    const foundUser = await findByEmail({ email });
    if (!foundUser) throw new AuthFailureError("Shop not registered!");

    const tokens = await createTokenPair(
      { userId, email },
      keyStore.public_key,
      keyStore.private_key,
    );

    await KeyTokenService.updateRefreshTokenUsed(
      refreshToken,
      tokens.refreshToken,
    );
    return {
      userId: Number(userId),
      user: { userId: Number(userId), email },
      tokens,
    };
  };

  static logout = async ({ keyStore }) => {
    return KeyTokenService.removeKeyById(keyStore.id);
  };

  static login = async ({ email, password }) => {
    const foundUser = await findByEmail({
      email,
      select: [
        "id",
        "email",
        "password",
        "user_name",
        "avatar_url",
        "email_verified",
      ],
    });
    if (!foundUser) {
      throw new BadRequestError("Shop not registered!");
    }

    const match = await bcrypt.compare(password, foundUser.password);
    if (!match) {
      throw new AuthFailureError("Authentication error!");
    }

    if (!foundUser.email_verified) {
      throw new BadRequestError("Please verify your email before logging in!");
    }

    const userId = foundUser.id;
    const privateKey = crypto.randomBytes(64).toString("hex");
    const publicKey = crypto.randomBytes(64).toString("hex");
    const tokens = await createTokenPair(
      { userId, email: foundUser.email },
      publicKey,
      privateKey,
    );

    await KeyTokenService.createKeyToken({
      userId,
      publicKey,
      privateKey,
      refresh_token: tokens.refreshToken,
    });

    return {
      // Use this value for header x-client-id
      account: {
        id: Number(foundUser.id),
        email: foundUser.email,
        user_name: foundUser.user_name,
        email_verified: foundUser.email_verified,
      },
      tokens,
    };
  };

  static signUp = async ({ email, password }) => {
    if (!email || !password) {
      throw new BadRequestError("Email and password are required!");
    }
    if (password.length < 6) {
      throw new BadRequestError("Password must be at least 6 characters!");
    }

    const checkEmailResult = await pool.query(
      "SELECT id FROM accounts WHERE email=$1 LIMIT 1",
      [email],
    );
    if (checkEmailResult.rows.length > 0) {
      throw new BadRequestError("Shop already registered!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user_name = email.split("@")[0];
    const rawVerifyToken = createRawToken();
    const verifyTokenHash = hashToken(rawVerifyToken);
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newAccount = await pool.query(
      `INSERT INTO accounts (
         email, user_name, password,
         email_verified, email_verify_token, email_verify_expires
       ) VALUES ($1, $2, $3, FALSE, $4, $5)
       RETURNING id, email, user_name, email_verified`,
      [email, user_name, hashedPassword, verifyTokenHash, verifyExpires],
    );

    if (!newAccount.rows.length) {
      throw new BadRequestError("Failed to create account!");
    }

    const account = newAccount.rows[0];

    try {
      await MailService.sendVerifyEmail({ to: email, token: rawVerifyToken });
    } catch (error) {
      console.error("Failed to send verify email:", error.message);
    }

    return {
      userId: Number(account.id),
      account: {
        id: Number(account.id),
        email: account.email,
        user_name: account.user_name,
        email_verified: account.email_verified,
      },
      message:
        "Registration successful. Please check your email to verify your account before logging in.",
    };
  };

  static verifyEmail = async ({ token }) => {
    if (!token) throw new BadRequestError("Token is required!");

    const tokenHash = hashToken(token);
    const result = await pool.query(
      `SELECT id, email, email_verified
       FROM accounts
       WHERE email_verify_token = $1
         AND email_verify_expires > NOW()
       LIMIT 1`,
      [tokenHash],
    );

    if (!result.rows.length) {
      throw new BadRequestError("Invalid or expired verification token!");
    }

    const account = result.rows[0];
    if (account.email_verified) {
      return { email: account.email, email_verified: true };
    }

    await pool.query(
      `UPDATE accounts
       SET email_verified = TRUE,
           email_verify_token = NULL,
           email_verify_expires = NULL
       WHERE id = $1`,
      [account.id],
    );

    return { email: account.email, email_verified: true };
  };

  static resendVerification = async ({ email }) => {
    if (!email) throw new BadRequestError("Email is required!");

    const foundUser = await findByEmail({
      email,
      select: ["id", "email", "email_verified"],
    });

    if (foundUser && !foundUser.email_verified) {
      const rawToken = createRawToken();
      const tokenHash = hashToken(rawToken);
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await pool.query(
        `UPDATE accounts
         SET email_verify_token = $1, email_verify_expires = $2
         WHERE id = $3`,
        [tokenHash, expires, foundUser.id],
      );

      try {
        await MailService.sendVerifyEmail({ to: email, token: rawToken });
      } catch (error) {
        console.error("Failed to resend verify email:", error.message);
      }
    }

    return { message: GENERIC_EMAIL_MESSAGE };
  };

  static forgotPassword = async ({ email }) => {
    if (!email) throw new BadRequestError("Email is required!");

    const foundUser = await findByEmail({
      email,
      select: ["id", "email"],
    });

    if (foundUser) {
      const rawToken = createRawToken();
      const tokenHash = hashToken(rawToken);
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await pool.query(
        `UPDATE accounts
         SET password_reset_token = $1, password_reset_expires = $2
         WHERE id = $3`,
        [tokenHash, expires, foundUser.id],
      );

      try {
        await MailService.sendResetPasswordEmail({
          to: email,
          token: rawToken,
        });
      } catch (error) {
        console.error("Failed to send reset email:", error.message);
      }
    }

    return { message: GENERIC_EMAIL_MESSAGE };
  };

  static resetPassword = async ({ token, newPassword }) => {
    if (!token || !newPassword) {
      throw new BadRequestError("Token and newPassword are required!");
    }
    if (newPassword.length < 6) {
      throw new BadRequestError("Password must be at least 6 characters!");
    }

    const tokenHash = hashToken(token);
    const result = await pool.query(
      `SELECT id FROM accounts
       WHERE password_reset_token = $1
         AND password_reset_expires > NOW()
       LIMIT 1`,
      [tokenHash],
    );

    if (!result.rows.length) {
      throw new BadRequestError("Invalid or expired reset token!");
    }

    const accountId = result.rows[0].id;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE accounts
       SET password = $1,
           password_reset_token = NULL,
           password_reset_expires = NULL
       WHERE id = $2`,
      [hashedPassword, accountId],
    );

    await KeyTokenService.deleteKeyById(accountId);

    return { message: "Password updated successfully. Please log in again." };
  };

  static getProfile = async ({ userId }) => {
    const account = await findById({ userId });
    if (!account) {
      throw new NotFoundError("User not found!");
    }
    return account;
  };
}

module.exports = AccessService;
