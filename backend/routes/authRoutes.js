import { Router } from 'express';
import { register, login, me, notifications, readNotification } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = Router();
router.post('/register', register); router.post('/login', login); router.get('/me', protect, me);
router.get('/notifications', protect, notifications);
router.patch('/notifications/:id/read', protect, readNotification);
export default router;
