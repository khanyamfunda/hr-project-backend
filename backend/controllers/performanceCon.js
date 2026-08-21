import pool from '../config/db.js';

const toReviewResponse = (row) => ({
    id: row.review_id,
    employeeId: row.employee_id,
    employeeName: row.employee_first_name ? `${row.employee_first_name} ${row.employee_last_name}`.trim() : null,
    reviewerId: row.reviewer_id,
    reviewerName: row.reviewer_first_name ? `${row.reviewer_first_name} ${row.reviewer_last_name}`.trim() : null,
    reviewDate: row.review_date,
    score: row.score,
    feedback: row.feedback_notes
});

// @desc    Get all performance reviews (HR/Manager only)
// @route   GET /api/performance-reviews
export const getAllReviews = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                pr.review_id, pr.employee_id, pr.reviewer_id, pr.review_date, pr.score, pr.feedback_notes,
                e.first_name AS employee_first_name, e.last_name AS employee_last_name,
                r.first_name AS reviewer_first_name, r.last_name AS reviewer_last_name
            FROM performance_reviews pr
            JOIN employees e ON pr.employee_id = e.employee_id
            JOIN employees r ON pr.reviewer_id = r.employee_id
            ORDER BY pr.review_date DESC
        `);
        res.json(rows.map(toReviewResponse));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get the logged-in employee's own performance reviews
// @route   GET /api/performance-reviews/my
export const getMyReviews = async (req, res) => {
    try {
        const employeeId = req.user.employee_id ?? req.user.id;
        const [rows] = await pool.query(`
            SELECT
                pr.review_id, pr.employee_id, pr.reviewer_id, pr.review_date, pr.score, pr.feedback_notes,
                r.first_name AS reviewer_first_name, r.last_name AS reviewer_last_name
            FROM performance_reviews pr
            JOIN employees r ON pr.reviewer_id = r.employee_id
            WHERE pr.employee_id = ?
            ORDER BY pr.review_date DESC
        `, [employeeId]);
        res.json(rows.map(toReviewResponse));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Submit a new performance review (HR/Manager only)
// @route   POST /api/performance-reviews
export const createReview = async (req, res) => {
    const { employeeId, reviewDate, score, feedback } = req.body || {};
    const reviewerId = req.user.employee_id ?? req.user.id;

    if (!employeeId || !reviewDate || !score || !feedback) {
        return res.status(400).json({ error: 'employeeId, reviewDate, score, and feedback are required.' });
    }
    if (score < 1 || score > 5) {
        return res.status(400).json({ error: 'score must be between 1 and 5.' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO performance_reviews (employee_id, reviewer_id, review_date, score, feedback_notes) VALUES (?, ?, ?, ?, ?)',
            [employeeId, reviewerId, reviewDate, score, feedback]
        );

        const [rows] = await pool.query(`
            SELECT
                pr.review_id, pr.employee_id, pr.reviewer_id, pr.review_date, pr.score, pr.feedback_notes,
                e.first_name AS employee_first_name, e.last_name AS employee_last_name,
                r.first_name AS reviewer_first_name, r.last_name AS reviewer_last_name
            FROM performance_reviews pr
            JOIN employees e ON pr.employee_id = e.employee_id
            JOIN employees r ON pr.reviewer_id = r.employee_id
            WHERE pr.review_id = ?
        `, [result.insertId]);

        res.status(201).json(toReviewResponse(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
