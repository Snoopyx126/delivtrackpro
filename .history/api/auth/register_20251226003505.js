import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// --- CONFIGURATION BASÉE SUR VOTRE index.js ---

// 1. Connexion DB Robuste (comme dans votre projet atelier)
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return; // Déjà connecté
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("URI Manquant dans .env");
  }
  await mongoose.connect(process.env.MONGODB_URI);
};

// 2. Définition du Modèle (Directement ici pour éviter les erreurs d'import)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['company', 'driver'], required: true },
  
  // Champs spécifiques
  companyName: String,
  siret: String,
  phone: String,
  address: String,
  vehicleType: String,
  
  createdAt: { type: Date, default: Date.now }
});

// On évite de recompiler le modèle si le fichier est rechargé
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default async function handler(req, res) {
  // --- GESTION CORS (Comme dans votre index.js) ---
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Vous pourrez restreindre plus tard
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Gérer la pré-vérification du navigateur (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await connectDB();

    const { name, email, password, role, companyName, siret, phone, address, vehicleType } = req.body;

    // 1. Vérification doublon
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Cet email existe déjà.' });
    }

    // 2. Hachage du mot de passe (Comme dans votre index.js)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Création
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      companyName,
      siret,
      phone,
      address,
      vehicleType
    });

    res.status(201).json({ success: true, message: 'Compte créé', userId: newUser._id });

  } catch (error) {
    console.error('Erreur Register:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
}