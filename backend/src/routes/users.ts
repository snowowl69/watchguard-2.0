import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { updateUserSchema } from '../validators/schemas';
import * as usersController from '../controllers/usersController';

const router = Router();

router.get('/', authenticate, requireAdmin, usersController.listUsers);
router.get('/:id', authenticate, usersController.getUser);
router.put('/:id', authenticate, validate(updateUserSchema), usersController.updateUser);
router.delete('/:id', authenticate, requireAdmin, usersController.deleteUser);

export default router;
