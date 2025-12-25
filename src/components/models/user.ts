// src/models/User.ts
import mongoose from 'mongoose';

// Si le modèle existe déjà (recompilation à chaud), on le réutilise, sinon on le crée
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Sera hashé
  role: { type: String, enum: ['company', 'driver'], required: true },
  
  // Champs optionnels
  companyName: String, // Pour les entreprises
  vehicleType: String, // Pour les livreurs
  
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User || mongoose.model('User', UserSchema);