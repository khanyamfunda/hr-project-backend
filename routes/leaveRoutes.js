import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// Get all requests for the HR admin queue
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT lr.id, e.first_name, e.last_name, lr.start_date, lr.end_date, lr.reason, lr.status 
            FROM leave_requests lr
            JOIN employees e ON lr.employee_id = e.employee_id
            ORDER BY lr.created_at DESC
        `;
        const [rows] = await pool.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching leave requests:", error);
        res.status(500).json({ error: "Failed to load approval queue data." });
    }
});

// Submit a new leave request (with validation)
router.post('/', async (req, res) => {
    const { employee_id, start_date, end_date, reason } = req.body;

    if (!employee_id || !start_date || !end_date || !reason || reason.trim() === "") {
        return res.status(400).json({ error: "All fields are required." });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(start_date) ||
        isNaN(end.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        return res.status(400).json({ error: "Dates must be valid and in YYYY-MM-DD format." });
    }

    if (start > end) {
        return res.status(400).json({ error: "Start date cannot be after end date." });
    }

    try {
        const query = `INSERT INTO leave_requests (employee_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)`;
        const [result] = await pool.query(query, [employee_id, start_date, end_date, reason]);
        
        res.status(201).json({ 
            message: "Leave request submitted successfully!", 
            requestId: result.insertId 
        });
    } catch (error) {
        console.error("Error creating leave request:", error);
        res.status(500).json({ error: "Database error. Failed to submit request." });
    }
});

// Update leave status (using transactions for bonus marks)
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Denied'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'Approved' or 'Denied'." });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const updateQuery = `UPDATE leave_requests SET status = ? WHERE id = ?`;
        const [result] = await connection.query(updateQuery, [status, id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Leave request not found." });
        }

        await connection.commit();
        res.status(200).json({ message: `Leave request status updated to ${status}.` });
    } catch (error) {
        await connection.rollback();
        console.error("Transaction error:", error);
        res.status(500).json({ error: "Failed to update status. Transaction rolled back." });
    } finally {
        connection.release();
    }
});

export default router;
