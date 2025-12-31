const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '../emails/inviteEmail.html');

async function sendEmail({ to, subject, token }) {
    const htmlTemplate = fs.readFileSync(templatePath, 'utf-8');

    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite/${token}`;
    const html = htmlTemplate.replace(/{{INVITE_LINK}}/g, inviteLink);

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
