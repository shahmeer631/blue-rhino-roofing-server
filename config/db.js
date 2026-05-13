import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://localhost:27017/blue-rhino-roofing';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || DEFAULT_URI;
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log(`✅ MongoDB connected: ${conn.connection.host}`);
};
