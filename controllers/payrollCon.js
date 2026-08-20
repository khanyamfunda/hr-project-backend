import pool from '../config/db.js';

// Helper function to map payroll responses consistently to camelCase for the frontend UI
const toPayrollResponse = (row) => ({
    id: row.payroll_id || null,
    employeeId: row.employee_id,
    employeeName: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    role: row.job_title,
    departmentName: row.department_name || 'Unassigned',
    payPeriod: row.pay_period || null,
    baseAnnualSalary: Number(row.salary),
    hoursWorked: Number(row.total_hours_logged || row.hours_worked || 0),
    grossEarnings: Number(row.gross_earnings || 0),
    deductions: Number(row.deductions || 0),
    netPay: Number(row.net_pay || 0),
    status: row.status || 'Draft',
    processedAt: row.processed_at || null
});

// @desc    Generate / calculate monthly runtime preview (Fixes dashboard charts and budget bugs)
// @route   GET /api/payroll/preview/:yearMonth
export const getPayrollPreview = async (req, res) => {
    try {
        const { yearMonth } = req.params; // Expects format: YYYY-MM (e.g., '2026-08')

        // Aggregate actual attendance hours worked and join with base profiles
        const [rows] = await pool.query(`
            SELECT e.employee_id, e.first_name, e.last_name, e.email, e.job_title, e.salary,
                   d.department_name,
                   COALESCE(SUM(a.hours_worked), 0) AS total_hours_logged
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN attendance a ON e.employee_id = a.employee_id
                 AND DATE_FORMAT(a.work_date, '%Y-%m') = ?
            GROUP BY e.employee_id
        `, [yearMonth]);

        // Process actual mathematical payouts based on standard South African working hours paradigm
        const processedPreviews = rows.map(emp => {
            const annualSalary = Number(emp.salary);

            // Standard industrial math: Annual Salary / 12 months = monthly base rate
            const standardMonthlyBase = annualSalary / 12;

            // Assuming a standard 160-hour work month to figure out exact hourly value
            const hourlyRate = standardMonthlyBase / 160;
            const totalHours = Number(emp.total_hours_logged);

            // Calculation Safety: If no hours logged yet, show base salary projection instead of zero
            let grossEarnings = totalHours > 0 ? (hourlyRate * totalHours) : standardMonthlyBase;

            // Apply standard baseline tax / UI deductions estimation (e.g., 20% for UIF & PAYE)
            const deductions = grossEarnings * 0.20;
            const netPay = grossEarnings - deductions;

            return {
                ...toPayrollResponse(emp),
                payPeriod: yearMonth,
                hoursWorked: Math.round(totalHours * 100) / 100,
                grossEarnings: Math.round(grossEarnings * 100) / 100,
                deductions: Math.round(deductions * 100) / 100,
                netPay: Math.round(netPay * 100) / 100,
                status: 'Draft'
            };
        });

        res.json(processedPreviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Log / commit live monthly payroll closure (Saves processing records to database)
// @route   POST /api/payroll/process
export const processPayroll = async (req, res) => {
    try {
        const { employeeId, payPeriod, hoursWorked, grossEarnings, deductions, netPay } = req.body || {};

        if (!employeeId || !payPeriod || !grossEarnings) {
            return res.status(400).json({ error: 'Employee ID, pay period, and earnings matrix values are required.' });
        }

        // Prevent processing duplicate payroll records for the same employee in the same month
        const [duplicateCheck] = await pool.query(
            'SELECT payroll_id FROM payroll_records WHERE employee_id = ? AND pay_period = ?',
            [employeeId, payPeriod]
        );

        if (duplicateCheck.length > 0) {
            return res.status(409).json({ error: 'A payroll record has already been committed for this employee this month.' });
        }

        const [result] = await pool.query(`
            INSERT INTO payroll_records (employee_id, pay_period, hours_worked, gross_earnings, deductions, net_pay, status, processed_at)
            VALUES (?, ?, ?, ?, ?, ?, 'Processed', NOW())
        `, [employeeId, payPeriod, hoursWorked || 0, grossEarnings, deductions || 0, netPay]);

        res.status(201).json({ message: 'Payroll run successfully finalized.', recordId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Fetch employee historical payslips (For Employee Portal View)
// @route   GET /api/payroll/my-payslips
export const getMyPayslips = async (req, res) => {
    try {
        const employeeId = req.user.employee_id ?? req.user.id; // JWT payload uses employee_id

        const [rows] = await pool.query(`
            SELECT p.*, e.first_name, e.last_name, e.email, e.job_title, e.salary, d.department_name
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE p.employee_id = ?
            ORDER BY p.pay_period DESC
        `, [employeeId]);

        res.json(rows.map(toPayrollResponse));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get the full payroll ledger (HR/Manager only) — the simple
//          hours/deductions/final-salary table, distinct from the
//          period-based payroll_records used above.
// @route   GET /api/payroll/summary
export const getPayrollSummary = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.*, e.first_name, e.last_name
            FROM payroll p
            JOIN employees e ON p.employee_id = e.employee_id
            ORDER BY p.employee_id
        `);
        res.json({ message: 'Secure payroll records accessed.', data: rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};