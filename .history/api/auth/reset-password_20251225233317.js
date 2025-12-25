// api/auth/reset-password.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  try {
    // Dans une vraie app, on vérifie d'abord si l'user existe en DB
    // Et on génère un token unique. Ici on envoie un email simple.

    await resend.emails.send({
      from: 'DelivTrack <onboarding@resend.dev>', // Utilisez votre domaine vérifié ou celui de test
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: `
        <h1>Demande de réinitialisation</h1>
        <p>Cliquez sur le lien ci-dessous pour changer votre mot de passe :</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/reset-password-confirm">Changer mon mot de passe</a>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      `
    });

    res.status(200).json({ message: 'Email envoyé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email' });
  }
}