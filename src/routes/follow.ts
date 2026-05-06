import { Router } from 'express';
import { followUser, unfollowUser, getUserStats } from '../controllers/followController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/:userId/follow', authenticate, followUser);
router.delete('/:userId/unfollow', authenticate, unfollowUser);
router.get('/:userId/stats', authenticate, getUserStats);

export default router;