import { Router } from 'express';
import { startLiveStream, endLiveStream, getLiveStreams } from '../controllers/liveController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/start', authenticate, startLiveStream);
router.post('/:streamId/end', authenticate, endLiveStream);
router.get('/', authenticate, getLiveStreams);

export default router;