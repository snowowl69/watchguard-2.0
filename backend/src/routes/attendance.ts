import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { attendanceQuerySchema } from '../validators/schemas';
import * as attendanceController from '../controllers/attendanceController';

const router = Router();

router.get('/', authenticate, validate(attendanceQuerySchema, 'query'), attendanceController.listLogs);
router.get('/stats', authenticate, attendanceController.getStats);
router.get('/export', authenticate, attendanceController.exportCSV);
router.get('/:userId/history', authenticate, attendanceController.getUserHistory);

export default router;
