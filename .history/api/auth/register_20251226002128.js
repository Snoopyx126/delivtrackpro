import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// --- 1. CONNEXION DB (Intégrée) ---
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).then((mongoose) => {
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

// --- 2. MODÈLE USER (Intégré) ---
// On vérifie si le modèle existe déjà pour éviter l'erreur "OverwriteModelError"
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

// --- 3. HANDLER (La logique) ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Connexion à la DB
    await dbConnect();

    const { name, email, password, role, companyName, vehicleType } = req.body;

    // Vérif existence
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création
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
    console.error('Erreur Register:', error);
    res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
}