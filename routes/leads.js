import express from 'express';
import { createLead, getLeads } from '../controllers/leadsController.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Too many submissions. Please wait before trying again.' },
});

router.post('/', submitLimiter, createLead);
router.get('/', getLeads); // In production, protect this with auth middleware

export default router;
