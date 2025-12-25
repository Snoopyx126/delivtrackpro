import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// --- 1. CONNEXION DB ---
const MONGODB_URI = process.env.MONGODB_URI;
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).then((m) => m);
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

// --- 2. MODÈLE USER ---
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['company', 'driver'], required: true },
  companyName: String,
  vehicleType: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// --- 3. HANDLER ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const { email, password } = req.body;

    // Recherche user (on inclut le password s'il est masqué par défaut, ici pas besoin)
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // Réponse propre
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
    console.error('Erreur Login:', error);
    res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
}