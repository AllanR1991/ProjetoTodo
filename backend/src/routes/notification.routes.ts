import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { optionalAuthMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Obter chave pública VAPID (para o frontend criar a PushSubscription no navegador)
router.get('/public-key', NotificationController.getPublicKey);

// Registrar ou atualizar inscrição de push
router.post('/subscribe', optionalAuthMiddleware, NotificationController.subscribe);

// Desinscrever dispositivo
router.post('/unsubscribe', NotificationController.unsubscribe);

// Disparar notificação de teste (para testar som e vibração no celular imediatamente)
router.post('/test', optionalAuthMiddleware, NotificationController.sendTestNotification);

export default router;
