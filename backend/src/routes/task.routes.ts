import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';

const router = Router();

// Rota de Previsão de Recorrência (deve ficar antes de /:id)
router.post('/preview-recurrence', TaskController.previewRecurrence);

// CRUD rotas
router.get('/', TaskController.list);
router.get('/:id', TaskController.getById);
router.post('/', TaskController.create);
router.patch('/:id', TaskController.update);
router.put('/:id', TaskController.update);
router.delete('/:id', TaskController.delete);

// Rota Core de Conclusão e Recorrência
router.patch('/:id/complete', TaskController.complete);

export default router;
