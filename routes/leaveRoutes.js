import express from 'express';
import {
  getAllLeaveRequests,
  requestLeave,
  updateLeaveStatus
} from '../controllers/leaveCon.js'; // Adjust path based on your folder structure

const router = express.Router();

// Get all requests for the HR admin queue
router.get('/', getAllLeaveRequests);

// Submit a new leave request
router.post('/', requestLeave);

// Update leave status
router.patch('/:id', updateLeaveStatus);

export default router;

