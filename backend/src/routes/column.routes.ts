import { Router } from 'express';
import { ColumnController } from '../controllers/column.controller.js';

const router = Router();

router.get('/', ColumnController.list);
router.post('/', ColumnController.create);
router.patch('/:id', ColumnController.update);
router.delete('/:id', ColumnController.delete);

export default router;
