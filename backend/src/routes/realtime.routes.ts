import { Router } from 'express';
import { RealtimeController } from '../controllers/realtime.controller.js';

const router = Router();

// Stream SSE em tempo real (passando ?token=... na URL)
router.get('/events', RealtimeController.streamEvents);

// Status de conexões ativas
router.get('/status', RealtimeController.getStatus);

export default router;
