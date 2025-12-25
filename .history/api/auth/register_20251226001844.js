// api/auth/register.js
import dbConnect from '../../lib/mongodb.js'; // Ajustez le chemin selon votre structure
import User from '../../src/models/User';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const { name, email, password, role, companyName, vehicleType } = req.body;

    // 1. Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    // 2. Sécuriser le mot de passe (Hashage)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Créer l'utilisateur
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      companyName,
      vehicleType
    });

    res.status(201).json({ message: 'Compte créé avec succès', userId: newUser._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
  }
}