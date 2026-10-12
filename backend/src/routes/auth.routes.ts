import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Rota de login (pública)
router.post('/login', AuthController.login);

// Rota de verificação do usuário logado (protegida por JWT)
router.get('/me', authMiddleware, AuthController.me);

// Rota de alteração de senha autenticada
router.post('/change-password', authMiddleware, AuthController.changePassword);

export default router;
