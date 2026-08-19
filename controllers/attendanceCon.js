import pool from '../config/db.js';

// Helper function to format attendance responses consistently to camelCase for the UI
const toAttendanceResponse = (row) => ({
    id: row.attendance_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name ? `${row.first_name} ${row.last_name}`.trim() : null,
    date: row.work_date || null,
    clockIn: row.clock_in || null,
    clockOut: row.clock_out || null,
    mode: row.work_mode || 'On Site',
    hoursWorked: row.hours_worked ? Number(row.hours_worked) : 0,
    status: row.clock_out ? 'Completed' : 'Active Shift'
});

// @desc    Get logged-in employee's personal attendance logs
// @route   GET /api/attendance/my-logs
export const getMyLogs = async (req, res) => {
    try {
        const employeeId = req.user.id || req.user.employee_id; 
        // Fallback configuration check: Reads "id" or "employee_id" smoothly from the token, pulled dynamically from verified JWT token

        const [rows] = await pool.query(`
            SELECT *, DATE_FORMAT(work_date, '%Y-%m-%d') AS work_date
            FROM attendance
            WHERE employee_id = ?
            ORDER BY work_date DESC, clock_in DESC
        `, [employeeId]);

        res.json(rows.map(toAttendanceResponse));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get active shift status (Checks if user is currently clocked in)
// @route   GET /api/attendance/status
export const getShiftStatus = async (req, res) => {
    try {
        const employeeId = req.user.id || req.user.employee_id;

        const [rows] = await pool.query(`
            SELECT * FROM attendance
            WHERE employee_id = ? AND clock_out IS NULL
            LIMIT 1
        `, [employeeId]);

        if (rows.length === 0) {
            return res.json({ isClockedIn: false, activeShift: null });
        }

        res.json({ isClockedIn: true, activeShift: toAttendanceResponse(rows[0]) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Clock In (Triggers on "Clock In" button click)
// @route   POST /api/attendance/clock-in
export const clockIn = async (req, res) => {
    try {
        const employeeId = req.user.id || req.user.employee_id;
        const workMode = String(req.body.mode || 'On Site').trim(); // 'On Site' or 'Remote'

        // Prevent double clocking in
        const [active] = await pool.query(`
            SELECT attendance_id FROM attendance 
            WHERE employee_id = ? AND clock_out IS NULL 
            LIMIT 1
        `, [employeeId]);

        if (active.length > 0) {
            return res.status(400).json({ error: 'You are already clocked into an active shift.' });
        }

        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const now = new Date();

        const [result] = await pool.query(`
            INSERT INTO attendance (employee_id, work_date, clock_in, work_mode)
            VALUES (?, ?, ?, ?)
        `, [employeeId, today, now, workMode]);

        const [newRecord] = await pool.query('SELECT * FROM attendance WHERE attendance_id = ?', [result.insertId]);
        res.status(201).json({ message: 'Clocked in successfully.', log: toAttendanceResponse(newRecord[0]) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Clock Out (Triggers on "Clock Out" button click)
// @route   PUT /api/attendance/clock-out
export const clockOut = async (req, res) => {
    try {
        const employeeId = req.user.id || req.user.employee_id;
        const now = new Date();

        // Find open active shift
        const [active] = await pool.query(`
            SELECT attendance_id, clock_in FROM attendance 
            WHERE employee_id = ? AND clock_out IS NULL 
            LIMIT 1
        `, [employeeId]);

        if (active.length === 0) {
            return res.status(400).json({ error: 'No active shift found. You must clock in first.' });
        }

        const attendanceId = active[0].attendance_id;
        const clockInTime = new Date(active[0].clock_in);

        // Compute hours worked automatically (convert milliseconds difference to hours)
        const diffMs = now - clockInTime;
        const computedHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        await pool.query(`
            UPDATE attendance
            SET clock_out = ?, hours_worked = ?
            WHERE attendance_id = ?
        `, [now, computedHours, attendanceId]);

        const [updatedRecord] = await pool.query('SELECT * FROM attendance WHERE attendance_id = ?', [attendanceId]);
        res.json({ message: 'Clocked out successfully.', log: toAttendanceResponse(updatedRecord[0]) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get all attendance logs for admin tracking board
// @route   GET /api/attendance/admin/all
export const getAllAttendanceAdmin = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.*, e.first_name, e.last_name, 
                   DATE_FORMAT(a.work_date, '%Y-%m-%d') AS work_date
            FROM attendance a
            JOIN employees e ON a.employee_id = e.employee_id
            ORDER BY a.work_date DESC, a.clock_in DESC
        `);

        const responses = rows.map(row => {
            const base = toAttendanceResponse(row);
            base.employeeName = `${row.first_name} ${row.last_name}`.trim();
            return base;
        });

        res.json(responses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
