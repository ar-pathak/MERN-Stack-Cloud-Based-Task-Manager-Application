const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const inviteTemplatePath = path.join(__dirname, '../emails/inviteEmail.html');
const resetPasswordTemplatePath = path.join(__dirname, '../emails/resetPasswordEmail.html');
const emailVerificationTemplatePath = path.join(__dirname, '../emails/emailVerificationEmail.html');

const getFrontendBaseUrl = () =>
    String(process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');

const applyTemplateToken = (template, placeholder, value) =>
    template.replace(new RegExp(placeholder, 'g'), value);

async function sendEmail({ to, subject, token, type = 'invite', html }) {
    let htmlContent = html;

    if (!htmlContent) {
        if (!token) {
            throw new Error('Email token is required when HTML content is not provided');
        }

        const frontendBaseUrl = getFrontendBaseUrl();

        if (type === 'reset-password') {
            const template = fs.readFileSync(resetPasswordTemplatePath, 'utf-8');
            const resetLink = `${frontendBaseUrl}/home/auth/reset-password/${token}`;
            htmlContent = applyTemplateToken(template, '{{RESET_LINK}}', resetLink);
        } else if (type === 'email-verification') {
            const template = fs.readFileSync(emailVerificationTemplatePath, 'utf-8');
            const verificationLink = `${frontendBaseUrl}/email-verification/${token}`;
            htmlContent = applyTemplateToken(template, '{{VERIFY_LINK}}', verificationLink);
        } else {
            const template = fs.readFileSync(inviteTemplatePath, 'utf-8');
            const inviteLink = `${frontendBaseUrl}/invites/accept/${token}`;
            htmlContent = applyTemplateToken(template, '{{INVITE_LINK}}', inviteLink);
        }
    }

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: `"Task Manager" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: htmlContent
    });
}

module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
