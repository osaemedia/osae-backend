import { Router } from 'express';
import { createStory, getStories } from '../controllers/storyController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createStory);
router.get('/', authenticate, getStories);

export default router;