import express from 'express';
import { chat } from '../controllers/chatController.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, message: 'Too many messages. Please slow down.' },
});

router.post('/', chatLimiter, chat);

export default router;
