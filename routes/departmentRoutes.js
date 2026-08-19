import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import {
    getAllDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
} from '../controllers/departmentsCon.js';

const router = express.Router();

// Public routes or open to verified users inline
router.get('/', getAllDepartments);

// Protected data-altering operations
router.post('/', verifyToken, authorizeRoles('HR Staff', 'Manager'), createDepartment);
router.put('/:id', verifyToken, authorizeRoles('HR Staff', 'Manager'), updateDepartment);
router.delete('/:id', verifyToken, authorizeRoles('HR Staff', 'Manager'), deleteDepartment);

export default router;