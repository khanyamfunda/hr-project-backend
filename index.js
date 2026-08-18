import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import pool from './config/db.js';
import { verifyToken, authorizeRoles } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Bind the Authentication System Routes
app.use('/api/auth', authRoutes);
app.use('/api/payroll', payrollRoutes);

// ==================== PROTECTED CORE DATA ROUTES ====================

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
