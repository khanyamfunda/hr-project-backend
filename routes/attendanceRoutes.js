import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import {
    getMyLogs,
    getShiftStatus,
    clockIn,
    clockOut,
    getAllAttendanceAdmin
} from '../controllers/attendanceCon.js';

const router = express.Router();

// Apply token validation globally—every attendance operation requires an identified employee
router.use(verifyToken);

// 1. INDIVIDUAL PORTAL TRACKING PATHS
router.get('/my-logs', getMyLogs);
router.get('/status', getShiftStatus);
router.post('/clock-in', clockIn);
router.put('/clock-out', clockOut);

// 2. ADMIN BOARD PATHS (Restricted to HR/Managers)
router.get('/admin/all', authorizeRoles('HR Staff', 'Manager'), getAllAttendanceAdmin);

export default router;
