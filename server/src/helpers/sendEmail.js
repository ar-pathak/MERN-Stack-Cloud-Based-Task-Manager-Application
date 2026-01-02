const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const inviteTemplatePath = path.join(__dirname, '../emails/inviteEmail.html');
const resetPasswordTemplatePath = path.join(__dirname, '../emails/resetPasswordEmail.html');

async function sendEmail({ to, subject, token, type = 'invite' }) {
    let htmlTemplate;
    let html;

    if (type === 'reset-password') {
        htmlTemplate = fs.readFileSync(resetPasswordTemplatePath, 'utf-8');
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/home/auth/reset-password/${token}`;
        html = htmlTemplate.replace(/{{RESET_LINK}}/g, resetLink);
    } else {
        htmlTemplate = fs.readFileSync(inviteTemplatePath, 'utf-8');
        const inviteLink = `${process.env.FRONTEND_URL}/accept-invite/${token}`;
        html = htmlTemplate.replace(/{{INVITE_LINK}}/g, inviteLink);
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
        html
    });
}

module.exports = sendEmail;
