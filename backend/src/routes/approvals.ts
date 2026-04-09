import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate';
import * as approvalsController from '../controllers/approvalsController';

const router = Router();

router.get('/', authenticate, requireAdmin, approvalsController.listPending);
router.post('/:id/approve', authenticate, requireAdmin, approvalsController.approve);
router.post('/:id/reject', authenticate, requireAdmin, approvalsController.reject);

export default router;
