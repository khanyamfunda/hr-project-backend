import pool from '../config/db.js';

// Get logs for the logged-in employee
export const getMyLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC',
      [req.user.employee_id || req.user.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get active shift status
export const getShiftStatus = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = CURDATE()',
      [req.user.employee_id || req.user.id]
    );
    res.json(rows[0] || { status: 'out' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Clock In
export const clockIn = async (req, res) => {
  try {
    const employeeId = req.user.employee_id || req.user.id;
    const [result] = await pool.query(
      'INSERT INTO attendance (employee_id, date, status, check_in) VALUES (?, CURDATE(), "Present", CURTIME())',
      [employeeId]
    );
    res.status(201).json({ message: 'Clocked in successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Clock Out
export const clockOut = async (req, res) => {
  try {
    const employeeId = req.user.employee_id || req.user.id;
    await pool.query(
      'UPDATE attendance SET check_out = CURTIME() WHERE employee_id = ? AND date = CURDATE()',
      [employeeId]
    );
    res.json({ message: 'Clocked out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all attendance records (Admin)
export const getAllAttendanceAdmin = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM attendance ORDER BY date DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};