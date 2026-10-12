import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';

const router = Router();

// Endpoint público para webhook de e-mails (Make.com, Zapier, etc.)
router.post('/incoming-email', WebhookController.handleIncomingEmail);

export default router;
