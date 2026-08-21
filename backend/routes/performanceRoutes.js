import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { getAllReviews, getMyReviews, createReview } from '../controllers/performanceCon.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', authorizeRoles('HR Staff', 'Manager'), getAllReviews);
router.get('/my', getMyReviews);
router.post('/', authorizeRoles('HR Staff', 'Manager'), createReview);

export default router;
