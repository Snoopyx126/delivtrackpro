// api/auth/login.js
import dbConnect from '../../lib/mongodb.js';
import User from '../../src/models/User';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const { email, password } = req.body;

    // 1. Trouver l'utilisateur
    // .select('+password') est nécessaire si vous avez exclu le mdp par défaut dans le schéma
    const user = await User.findOne({ email }); 
    
    if (!user) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // 2. Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // 3. Retourner les infos (Sans le mot de passe !)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyName: user.companyName,
      vehicleType: user.vehicleType
    };

    res.status(200).json({ user: userData });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
}