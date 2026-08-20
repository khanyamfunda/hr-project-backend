import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import {
    getPayrollPreview,
    processPayroll,
    getMyPayslips,
    getPayrollSummary
} from '../controllers/payrollCon.js';

const router = express.Router();

// Apply token validation globally to this router as financial routes are inherently sensitive
router.use(verifyToken);

// 1. FETCH EMPLOYEE PORTAL HISTORICAL PAYSLIPS (Open to the logged-in employee)
router.get('/my-payslips', getMyPayslips);

// 2. WHOLE-TABLE PAYROLL LEDGER (Restricted to HR/Managers)
router.get('/summary', authorizeRoles('HR Staff', 'Manager'), getPayrollSummary);

// 3. GENERATE / VIEW MONTHLY PAYROLL RUN PREVIEW (Restricted to HR/Managers)
router.get('/preview/:yearMonth', authorizeRoles('HR Staff', 'Manager'), getPayrollPreview);

// 4. PROCESS / COMMIT LIVE MONTHLY PAYROLL CLOSURE (Restricted to HR/Managers)
router.post('/process', authorizeRoles('HR Staff', 'Manager'), processPayroll);

export default router;