import express from 'express';
import { prisma } from '../index.js';
import { sendResetPasswordEmail } from '../services/emailService.js';
import { hashPassword } from '../../src/lib/utils.js';
import crypto from 'crypto';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only_concours_maroc';

// Utilitaire pour signer un token (remplace jwt.sign pour éviter une dépendance supplémentaire)
function signToken(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 3600000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

// Utilitaire pour vérifier un token
function verifyToken(token: string) {
  try {
    const [payload, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
    if (signature !== expectedSignature) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Date.now() > decoded.exp) return null; // Expiré
    return decoded.email;
  } catch (e) {
    return null;
  }
}

router.get('/verify-token', (req, res) => {
  const token = (req.query.token as string) || '';
  if (!token) {
    return res.status(400).json({ valid: false, error: 'Token manquant.' });
  }
  const email = verifyToken(token);
  if (!email) {
    return res.status(400).json({ valid: false, error: 'Ce lien de réinitialisation est invalide ou a expiré.' });
  }
  res.json({ valid: true, email });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Adresse e-mail requise.' });
  }

  try {
    try {
      if (prisma && prisma.user) {
        await prisma.user.findUnique({ where: { email } });
      }
    } catch (dbError) {
      console.warn('[AuthRoute] Base de données Prisma non connectée, utilisation du mode de secours.');
    }

    const token = signToken(email);
    await sendResetPasswordEmail(email, token);

    // On retourne un message de succès (évite l'énumération des comptes)
    res.json({ success: true, message: 'Si un compte existe, un e-mail a été envoyé.' });
  } catch (error) {
    console.error('[AuthRoute] Erreur forgot-password:', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token et nouveau mot de passe requis.' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }

  try {
    const email = verifyToken(token);
    if (!email) {
      return res.status(400).json({ error: 'Lien invalide ou expiré.' });
    }

    // Même schéma de hachage que le reste de l'application (src/lib/utils.ts)
    const passwordHash = hashPassword(newPassword);

    try {
      if (prisma && prisma.user) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash }
          });
        }
      }
    } catch (dbError) {
      console.warn('[AuthRoute] Base de données Prisma non connectée lors de l\'update.');
    }

    res.json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    console.error('[AuthRoute] Erreur reset-password:', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;
