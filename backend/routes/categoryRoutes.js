import { Router } from 'express';
import * as c from '../controllers/categoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { roles } from '../middleware/roleMiddleware.js';
const router = Router(); router.get('/', c.getCategories); router.use(protect, roles('admin'));
router.post('/', c.createCategory); router.put('/:id', c.updateCategory); router.delete('/:id', c.deleteCategory);
export default router;
