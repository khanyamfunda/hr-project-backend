import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import pool from './config/db.js';
import { verifyToken, authorizeRoles } from './middleware/authMiddleware.js';

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// Safety-net migration for anyone running against an older local database
// that still predates the start_date column added to schema.sql.
async function ensureEmployeeSchema() {
    const [columns] = await pool.query('SHOW COLUMNS FROM employees');
    const hasStartDate = columns.some((column) => column.Field === 'start_date');

    if (!hasStartDate) {
        await pool.query('ALTER TABLE employees ADD COLUMN start_date DATE NULL AFTER department_id');
        console.log('Migration: added employees.start_date column');
    }
}

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'Invalid JSON body. In Thunder Client, set the body to JSON and send a proper object.'
        });
    }
    next(err);
});

app.get('/', (req, res) => {
    res.json({
        message: 'ModernTech HR API is running',
        endpoints: [
            '/api/auth/login',
            '/api/auth/register',
            '/api/employees',
            '/api/departments',
            '/api/leave-requests',
            '/api/attendance',
            '/api/payroll/summary',
            '/api/payroll/my-payslips',
            '/api/payroll/preview/:yearMonth',
            '/api/payroll/process'
        ]
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/reviews', reviewRoutes);

// ==================== PROTECTED CORE DATA ROUTES ====================

// Bind your leave request endpoints securely
// - GET & PATCH routes are locked down so only HR Staff and Managers can process approvals
// - POST route is locked down via verifyToken so any logged-in employee can apply for leave
app.use('/api/leave-requests', verifyToken, (req, res, next) => {
    if ((req.method === 'GET' && req.path !== '/my') || req.method === 'PATCH') {
        return authorizeRoles('HR Staff', 'Manager')(req, res, next);
    }
    next();
}, leaveRoutes);

async function startServer() {
    try {
        await pool.query('SELECT 1');
        await ensureEmployeeSchema();
        app.listen(PORT, () => {
            console.log(`ModernTech HR Full-Stack Architecture running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error(`Database connection failed (${error.code || 'unknown'}): ${error.message || 'check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME'}`);
        process.exitCode = 1;
    }
}

startServer();
