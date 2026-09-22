import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuration du transporteur SMTP (utilise les variables d'environnement)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD, // App Password pour Gmail
  },
});

export const sendResetPasswordEmail = async (to: string, token: string) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetLink = `${appUrl}/mot-de-passe-reinitialisation?token=${token}`;

  console.log(`\n========================================\n📧 [EMAIL SERVICE] Lien de réinitialisation pour : ${to}\n🔗 ${resetLink}\n========================================\n`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('[EmailService] SMTP_USER ou SMTP_PASSWORD non configuré dans .env. Le lien a été affiché dans la console ci-dessus.');
    return { success: true, devMode: true };
  }

  const mailOptions = {
    from: `"Concours Maroc" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Réinitialisation de votre mot de passe',
    text: `Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe. Veuillez cliquer sur le lien suivant pour choisir un nouveau mot de passe :\n\n${resetLink}\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\nCordialement,\nL'équipe Concours Maroc`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E6ECF3; border-radius: 10px;">
        <h2 style="color: #0B2A4A;">Réinitialisation de votre mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Veuillez cliquer sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #0B63CE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Réinitialiser mon mot de passe</a>
        </div>
        <p style="font-size: 0.9em; color: #666;">Ou copiez-collez ce lien dans votre navigateur :<br><a href="${resetLink}">${resetLink}</a></p>
        <p style="margin-top: 30px; font-size: 0.85em; color: #888;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail et votre mot de passe restera inchangé.</p>
        <hr style="border: 0; border-top: 1px solid #E6ECF3; margin: 20px 0;">
        <p style="font-size: 0.8em; color: #888; text-align: center;">L'équipe Concours Maroc</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EmailService] E-mail de réinitialisation envoyé avec succès :', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('[EmailService] Erreur lors de l\'envoi SMTP (vérifiez vos identifiants .env) :', error);
    // Return success in dev with the logged link so UI continues smoothly
    return { success: true, warning: 'SMTP failed, check console for reset link' };
  }
};
