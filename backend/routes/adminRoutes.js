import { Router } from 'express';
import * as c from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { roles } from '../middleware/roleMiddleware.js';
const router = Router(); router.use(protect, roles('admin'));
router.get('/users', c.users); router.patch('/users/:id/status', c.userStatus);
router.get('/suppliers', c.suppliers); router.patch('/suppliers/:id/verification', c.verification);
router.get('/products', c.products); router.delete('/products/:id', c.deactivate); router.get('/orders', c.orders);
export default router;
