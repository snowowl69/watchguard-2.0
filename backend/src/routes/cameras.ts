import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { cameraSchema, cameraUpdateSchema } from '../validators/schemas';
import * as camerasController from '../controllers/camerasController';

const router = Router();

router.get('/', authenticate, camerasController.listCameras);
router.post('/', authenticate, requireAdmin, validate(cameraSchema), camerasController.createCamera);
router.put('/:id', authenticate, requireAdmin, validate(cameraUpdateSchema), camerasController.updateCamera);

export default router;
