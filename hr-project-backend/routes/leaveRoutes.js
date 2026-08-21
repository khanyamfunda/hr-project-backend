import express from 'express';
import { 
    getAllLeaveRequests, 
    getMyLeaveRequests,
    createLeaveRequest, 
    updateLeaveStatus 
} from '../controllers/LeaveCon.js'; // Adjust path based on your folder structure

const router = express.Router();

router.get('/my', getMyLeaveRequests);

// Get all requests for the HR admin queue
router.get('/', getAllLeaveRequests);

// Submit a new leave request
router.post('/', createLeaveRequest);

// Update leave status
router.patch('/:id', updateLeaveStatus);

export default router;

