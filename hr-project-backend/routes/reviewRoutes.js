import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { getReviews, createReview, updateReview } from '../controllers/reviewCon.js';

const router = express.Router();
router.use(verifyToken, authorizeRoles('HR Staff', 'Manager'));
router.get('/', getReviews);
router.post('/', createReview);
router.patch('/:id', updateReview);

export default router;