import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import leadsRouter from './routes/leads.js';
import chatRouter from './routes/chat.js';
import { verifyLeadEmailSmtp } from './services/leadNotificationMail.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/leads', leadsRouter);
app.use('/api/chat', chatRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Blue Rhino Roofing API is running' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

async function start() {
  try {
    await connectDB();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error(
      '   Local: run MongoDB (mongod) or set MONGODB_URI in server/.env. Railway: set MONGODB_URI in Variables (Atlas mongodb+srv://...).'
    );
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🦏 Blue Rhino Roofing server running on port ${PORT}`);
  });

  verifyLeadEmailSmtp().catch(() => {});
}

start();
