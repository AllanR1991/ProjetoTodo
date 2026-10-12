import { Router } from 'express';
import { EmailSyncController } from '../controllers/email-sync.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Testar credenciais IMAP
router.post('/test', authMiddleware, EmailSyncController.testConnection);

// Obter configuração atual do usuário
router.get('/config', authMiddleware, EmailSyncController.getConfig);

// Salvar / atualizar configuração
router.post('/config', authMiddleware, EmailSyncController.saveConfig);

// Desconectar / remover conta
router.delete('/config', authMiddleware, EmailSyncController.removeConfig);

// Disparar sincronização manual imediatamente
router.post('/sync-now', authMiddleware, EmailSyncController.syncNow);

export default router;
