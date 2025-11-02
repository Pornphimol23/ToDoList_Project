// routes/meta.js
import { Router } from 'express';
import { getStatuses, getPriorities } from '../controllers/metaController.js';
const router = Router();
router.get('/statuses', getStatuses);
router.get('/priorities', getPriorities);
export default router;