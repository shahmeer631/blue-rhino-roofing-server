import Lead from '../models/Lead.js';
import {
  sendNewLeadNotification,
  sendLeadCustomerConfirmation,
} from '../services/leadNotificationMail.js';

export const createLead = async (req, res) => {
  try {
    let { name, phone, email, address, roofType, damageType, notes, message, source } = req.body;
    source = source || 'estimate-form';

    if (source === 'contact-page') {
      if (!name || !phone || !email || !(message || '').trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please fill in name, phone, email, and message.',
        });
      }
      address = 'Provided via contact form — follow-up required';
      roofType = 'Other';
      damageType = 'Other';
      notes = (message || '').trim();
    } else if (!name || !phone || !email || !address || !roofType || !damageType) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.',
      });
    }

    const lead = await Lead.create({
      name,
      phone,
      email,
      address,
      roofType,
      damageType,
      notes,
      source,
    });

    sendNewLeadNotification(lead).catch((err) =>
      console.error('Lead notification email failed:', err.message)
    );
    sendLeadCustomerConfirmation(lead).catch((err) =>
      console.error('Customer confirmation email failed:', err.message)
    );

    const replyMessage =
      source === 'contact-page'
        ? 'Thank you! We received your message and will contact you within 30 minutes during business hours.'
        : 'Your estimate request has been received! We\'ll contact you within 30 minutes during business hours.';

    res.status(201).json({
      success: true,
      message: replyMessage,
      data: { id: lead._id },
    });
  } catch (error) {
    console.error('Create lead error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

export const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
