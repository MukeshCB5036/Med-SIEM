import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.core.config import settings, logger

class EmailService:
    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USERNAME
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_USE_TLS

    def send_email(self, recipient_email: str, subject: str, html_body: str) -> bool:
        """Sends an HTML formatted email via configured SMTP server."""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = recipient_email

            part = MIMEText(html_body, 'html')
            msg.attach(part)

            # In development/test mode without live SMTP, log cleanly and return True
            if not self.host or self.host == "localhost" or self.host == "disabled":
                logger.info(f"[EMAIL SERVICE (MOCK/LOCAL)] Sent email to {recipient_email} | Subject: {subject} | Content: {html_body}")
                return True

            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.sendmail(self.from_email, [recipient_email], msg.as_string())
            
            logger.info(f"Email successfully delivered to {recipient_email}")
            return True
        except Exception as e:
            logger.warning(f"Failed to send email to {recipient_email}: {e}")
            return False

    def send_verification_email(self, recipient_email: str, user_name: str, token: str) -> bool:
        verification_link = f"http://localhost:3000/verify-email?token={token}"
        subject = "MedSIEM Healthcare SOC — Verify Your Account Email"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <div style="background-color: #0f172a; padding: 20px; border: 1px solid #1e293b; border-radius: 8px;">
                <h2 style="color: #e11d48; margin-top: 0;">MedSIEM Healthcare SOC</h2>
                <p>Hello <strong>{user_name}</strong>,</p>
                <p>An administrator has created a MedSIEM SOC Analyst account for your email address. Please click the button below to verify your email address and activate your account:</p>
                <div style="margin: 24px 0;">
                    <a href="{verification_link}" style="background-color: #e11d48; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
                </div>
                <p style="color: #94a3b8; font-size: 12px;">This verification link will expire in {settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS} hours and can only be used once.</p>
                <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">If you did not request this account, please notify your SOC Security Operations Lead immediately.</p>
            </div>
        </div>
        """
        return self.send_email(recipient_email, subject, html_body)

    def send_mfa_otp_email(self, recipient_email: str, user_name: str, otp: str) -> bool:
        subject = "MedSIEM SOC — One-Time Authentication Code (MFA)"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <div style="background-color: #0f172a; padding: 20px; border: 1px solid #1e293b; border-radius: 8px;">
                <h2 style="color: #e11d48; margin-top: 0;">MedSIEM Multi-Factor Verification</h2>
                <p>Hello <strong>{user_name}</strong>,</p>
                <p>Your one-time authentication passcode (OTP) for MedSIEM SOC access is:</p>
                <div style="background-color: #020617; border: 1px solid #1e293b; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
                    <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #34d399; letter-spacing: 6px;">{otp}</span>
                </div>
                <p style="color: #94a3b8; font-size: 12px;">This code will expire in {settings.MFA_OTP_EXPIRE_MINUTES} minutes. Never share this code with anyone.</p>
            </div>
        </div>
        """
        return self.send_email(recipient_email, subject, html_body)

email_service = EmailService()
