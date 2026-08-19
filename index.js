import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// ⚡ This must run first so all backend database connections can read your variables!
dotenv.config();

import authRoutes from './routes/authRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js'; 
import pool from './config/db.js';
import { verifyToken, authorizeRoles } from './middleware/authMiddleware.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'Invalid JSON body. In Thunder Client, set the body to JSON and send a proper object.'
        });
    }
    next(err);
});

// Bind the Authentication System Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);

// ==================== PROTECTED CORE DATA ROUTES ====================

// Bind your leave request endpoints securely
// - GET & PATCH routes are locked down so only HR Staff and Managers can process approvals
// - POST route is locked down via verifyToken so any logged-in employee can apply for leave
app.use('/api/leave-requests', verifyToken, (req, res, next) => {
    if (req.method === 'GET' || req.method === 'PATCH') {
        return authorizeRoles('HR Staff', 'Manager')(req, res, next);
    }
    next();
}, leaveRoutes);

// TEST 1: Open Employee endpoint (Accessible by all logged-in workers)
app.get('/api/employees', verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT employee_id, first_name, last_name, email, job_title FROM employees');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//  TEST 2: Role-Restricted Endpoint (Only viewable by Managers and HR Staff)
app.get('/api/payroll/summary', verifyToken, authorizeRoles('HR Staff', 'Manager'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM payroll');
        res.json({ message: "Secure payroll records accessed.", data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`ModernTech HR Full-Stack Architecture running on http://localhost:${PORT}`);
});
