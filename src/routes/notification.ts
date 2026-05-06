import { Router } from 'express';
import { getNotifications, markNotificationRead } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getNotifications);
router.put('/:notificationId/read', authenticate, markNotificationRead);

export default router;