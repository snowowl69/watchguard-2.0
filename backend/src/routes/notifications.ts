import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as notificationsController from '../controllers/notificationsController';

const router = Router();

router.get('/', authenticate, notificationsController.listNotifications);
router.put('/:id/read', authenticate, notificationsController.markRead);
router.put('/read-all', authenticate, notificationsController.markAllRead);

export default router;
