import { Router } from 'express';
import { sendMessage, getMessages, markAsRead, uploadMiddleware } from '../controllers/messageController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/send', authenticate, uploadMiddleware, sendMessage);
router.get('/', authenticate, getMessages);
router.put('/:messageId/read', authenticate, markAsRead);

export default router;