import { Router } from 'express';
import { createPost, getFeed, likePost, commentOnPost } from '../controllers/postController';
import { authenticate } from '../middleware/auth';
import { createPostLimiter, commentLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/create', authenticate, createPostLimiter, createPost);
router.get('/feed', authenticate, getFeed);
router.post('/:postId/like', authenticate, likePost);
router.post('/:postId/comment', authenticate, commentLimiter, commentOnPost);

export default router;