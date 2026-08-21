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

// All employee data (including salary) requires a valid login.
router.use(verifyToken);

// 1. GET ALL EMPLOYEES (HR/Manager only)
router.get('/', authorizeRoles('HR Staff', 'Manager'), getAllEmployees);

// 2. GET SINGLE EMPLOYEE BY ID
router.get('/:id', getEmployeeById);

// 3. CREATE EMPLOYEE (HR/Manager only)
router.post('/', authorizeRoles('HR Staff', 'Manager'), createEmployee);

// 4. UPDATE EMPLOYEE (HR/Manager only)
router.put('/:id', authorizeRoles('HR Staff', 'Manager'), updateEmployee);

// 5. DELETE EMPLOYEE (HR/Manager only)
router.delete('/:id', authorizeRoles('HR Staff', 'Manager'), deleteEmployee);

export default router;