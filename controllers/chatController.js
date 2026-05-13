import OpenAI from 'openai';
import Lead from '../models/Lead.js';
import {
  sendNewLeadNotification,
  sendLeadCustomerConfirmation,
} from '../services/leadNotificationMail.js';

/** Lazy client so missing OPENAI_API_KEY does not crash the process at import time (e.g. Railway without vars yet). */
let openaiClient = null;
function getOpenAI() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: key });
  return openaiClient;
}

const SYSTEM_PROMPT = `You are a friendly, knowledgeable assistant for Blue Rhino Roofing, a Houston and Katy TX roofing company.

COMPANY FACTS (always use these exact details):
- Company: Blue Rhino Roofing
- Phone: (346) 733-8558
- Email: shawn@bluerhinoroofing.net
- Office: 2717 Commercial Center Blvd, Suite E200, Katy, TX 77494
- Website: www.bluerhinoroofing.net
- Service Area: Houston, Katy, Sugar Land, Cypress, The Woodlands, Spring, Humble, Pearland, Friendswood, Missouri City, Richmond, and all surrounding Greater Houston Area communities

KEY DIFFERENTIATORS:
- Licensed Texas Insurance Adjusters on staff who work ONLY for homeowners, never for insurance companies
- HAAG Engineering Certified for storm damage inspections and evaluations
- 4.8/5 customer rating
- 4+ years storm-related residential property inspection experience

WARRANTIES:
- 5-year workmanship warranty
- 30-year manufacturer warranty (IKO, TAMKO, Owens Corning, GAF materials only)
- Most projects completed in 1 day

SERVICES:
- Residential Roofing (repair, replacement, maintenance — all materials)
- Commercial Roofing (TPO, modified bitumen, flat/low-slope)
- Storm Damage & Insurance Claims (our specialty — licensed adjusters on staff)
- Gutters & Siding (installation, repair, storm damage)
- Interior Water Damage (ceiling stains, drywall, restoration)
- Financing through Express Financial

INSURANCE CLAIM PROCESS (4 steps):
1. Free Inspection & Documentation (HAAG certified, photos, detailed report)
2. Insurance Claim Filing Support (we handle all paperwork and filing)
3. Adjuster Meeting Assistance (we meet the adjuster on-site)
4. Approval & Expert Repair (premium materials, 5-year warranty)

APPRAISAL RIGHTS:
- Homeowners have the legal right to demand an appraisal if the insurance offer seems too low
- Process typically costs $1,000–$2,000
- Blue Rhino may cover the appraisal cost if they believe they can win
- Homeowner still pays their deductible

DEDUCTIBLE POLICY:
- Blue Rhino NEVER waives deductibles — it is illegal under Texas law
- Contractors who waive deductibles are committing fraud
- Verify at: tdi.texas.gov

MATERIALS USED: IKO, TAMKO, Owens Corning, GAF — no cheap substitutes

YOUR ROLE:
- Answer roofing and insurance questions helpfully and honestly
- Encourage free inspection bookings (call or form)
- Qualify leads by collecting name, phone, and address when they show interest in a quote
- Keep responses concise — 2-4 sentences
- If asked about deductible waiving, explain it is illegal and Blue Rhino won't do it
- Always emphasize the licensed adjuster advantage`;

export const chat = async (req, res) => {
  try {
    const { messages, leadInfo } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Messages array is required' });
    }

    if (leadInfo && leadInfo.name && leadInfo.phone) {
      try {
        const savedLead = await Lead.create({
          name: leadInfo.name,
          phone: leadInfo.phone,
          email: leadInfo.email || 'via-chatbot@pending.com',
          address: leadInfo.address || 'Provided via chatbot',
          roofType: leadInfo.roofType || 'Other',
          damageType: leadInfo.damageType || 'Other',
          notes: `Lead captured via chatbot. ${leadInfo.notes || ''}`,
          source: 'chatbot',
        });
        sendNewLeadNotification(savedLead).catch((err) =>
          console.error('Lead notification email failed:', err.message)
        );
        sendLeadCustomerConfirmation(savedLead).catch((err) =>
          console.error('Customer confirmation email failed:', err.message)
        );
      } catch (e) {
        console.error('Chatbot lead save error:', e.message);
      }
    }

    const openai = getOpenAI();
    if (!openai) {
      return res.json({
        success: true,
        reply:
          "Thanks for reaching out to Blue Rhino Roofing! For immediate assistance, please call us at (346) 733-8558 or fill out our estimate form. Our team responds within 30 minutes during business hours.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-10),
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "I'm sorry, I didn't catch that. Can you rephrase?";
    res.json({ success: true, reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.json({
      success: true,
      reply: "Thanks for reaching out to Blue Rhino Roofing! For immediate assistance, please call us at (346) 733-8558 or fill out our estimate form. Our team responds within 30 minutes during business hours.",
    });
  }
};
