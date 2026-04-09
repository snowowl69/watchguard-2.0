import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate';
import { upload } from '../middleware/upload';
import * as faceController from '../controllers/faceController';

const router = Router();

router.post('/recognize', authenticate, upload.single('image'), faceController.recognize);
router.post('/register', upload.single('image'), faceController.register);
router.get('/embedding/:userId', authenticate, requireAdmin, faceController.getEmbedding);

export default router;
