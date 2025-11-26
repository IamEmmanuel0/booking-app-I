require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: +process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("email config error:", error);
  } else {
    console.log("Email server is ready!");
  }
})

  const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: '"Booking App" <noreply@gmail.com>',
    to, subject, html,
  };

  
  try {
    await transporter.sendMail(mailOptions)
    return {success: true}
  } catch (error) {
    console.error('Error sending email:', error);
    return {success: false, error}
  }
}


module.exports = {sendEmail}