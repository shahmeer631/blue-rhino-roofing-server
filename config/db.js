import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://localhost:27017/blue-rhino-roofing';

/** True when running on Railway (or similar) where localhost MongoDB does not exist. */
function requiresRemoteMongoUri() {
  return (
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.RAILWAY_PROJECT_ID)
  );
}

export const connectDB = async () => {
  const uriFromEnv = process.env.MONGODB_URI?.trim();

  if (!uriFromEnv && requiresRemoteMongoUri()) {
    throw new Error(
      'MONGODB_URI is not set. On Railway: Variables → add MONGODB_URI with your MongoDB Atlas connection string (mongodb+srv://...). There is no database on localhost in the cloud.'
    );
  }

  const uri = uriFromEnv || DEFAULT_URI;
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log(`✅ MongoDB connected: ${conn.connection.host}`);
};
