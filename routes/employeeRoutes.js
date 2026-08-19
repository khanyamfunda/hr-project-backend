import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
} from '../controllers/employeeCon.js';

const router = express.Router();

// 1. GET ALL EMPLOYEES (Publicly viewable or open to logged-in users inline)
router.get('/', getAllEmployees);

// 2. GET SINGLE EMPLOYEE BY ID
router.get('/:id', getEmployeeById);

// 3. CREATE EMPLOYEE (Protected Inline)
router.post('/', verifyToken, authorizeRoles('HR Staff', 'Manager'), createEmployee);

// 4. UPDATE EMPLOYEE (Protected Inline)
router.put('/:id', verifyToken, authorizeRoles('HR Staff', 'Manager'), updateEmployee);

// 5. DELETE EMPLOYEE (Protected Inline)
router.delete('/:id', verifyToken, authorizeRoles('HR Staff', 'Manager'), deleteEmployee);

export default router;