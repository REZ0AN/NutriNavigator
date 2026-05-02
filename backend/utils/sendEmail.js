import nodemailer from "nodemailer";

/**
 * Send a plain-text email via Nodemailer.
 *
 * @param {Object} options
 * @param {string} options.email   - Recipient address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML body
 */
const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASS,
        },
    });
    
    await transporter.sendMail({
        from: `"NutriNavigator" <${process.env.SMTP_MAIL}>`,
        to: options.email,
        subject: options.subject,
        html: options.html
    });
};

export default sendEmail;
