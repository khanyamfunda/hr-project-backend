CREATE DATABASE IF NOT EXISTS moderntech_hr;
USE moderntech_hr;

-- Drop tables in reverse order of dependencies to avoid foreign key errors during execution
DROP TABLE IF EXISTS performance_reviews;
DROP TABLE IF EXISTS payroll_records;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS payroll;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;

-- ==========================================
-- 1. DEPARTMENTS TABLE
-- ==========================================
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;

-- ==========================================
-- 2. EMPLOYEES TABLE
-- ==========================================
CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    salary DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    employment_history TEXT NULL,
    department_id INT,
    start_date DATE NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ==========================================
-- 3. USERS TABLE (AUTHENTICATION)
-- ==========================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('HR Staff', 'Manager', 'Employee') DEFAULT 'Employee',
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================
-- 4. PAYROLL TABLE (simple ledger used by the HR summary view)
-- ==========================================
CREATE TABLE payroll (
    payroll_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    hours_worked INT NOT NULL DEFAULT 0,
    leave_deductions INT NOT NULL DEFAULT 0,
    final_salary DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================
-- 5. LEAVE REQUESTS TABLE
-- ==========================================
CREATE TABLE leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('Approved', 'Pending', 'Denied') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================
-- 6. ATTENDANCE TABLE (clock-in/clock-out model)
-- ==========================================
CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    work_date DATE NOT NULL,
    clock_in DATETIME NULL,
    clock_out DATETIME NULL,
    work_mode VARCHAR(20) NOT NULL DEFAULT 'On Site',
    hours_worked DECIMAL(5, 2) NOT NULL DEFAULT 0,
    UNIQUE KEY unique_emp_attendance (employee_id, work_date),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================
-- 7. PAYROLL RECORDS TABLE (per-period processed payslips, used by
--    /api/payroll/preview, /api/payroll/process, /api/payroll/my-payslips)
-- ==========================================
CREATE TABLE payroll_records (
    payroll_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    pay_period VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    hours_worked DECIMAL(6, 2) NOT NULL DEFAULT 0,
    gross_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
    deductions DECIMAL(10, 2) NOT NULL DEFAULT 0,
    net_pay DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status ENUM('Draft', 'Processed') NOT NULL DEFAULT 'Draft',
    processed_at DATETIME NULL,
    UNIQUE KEY unique_emp_pay_period (employee_id, pay_period),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================
-- 8. PERFORMANCE REVIEWS TABLE
-- ==========================================
CREATE TABLE performance_reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    review_date DATE NOT NULL,
    score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    feedback_notes TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES employees(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX idx_employee_email ON employees(email);
CREATE INDEX idx_attendance_date ON attendance(work_date);
CREATE INDEX idx_leave_status ON leave_requests(status);

-- ==========================================
-- PUT DATA INTO TABLES SECTION
-- ==========================================

-- 1. PUTS All Unique Departments From our Project Data
INSERT INTO departments (department_name) VALUES
('Development'), ('HR'), ('QA'), ('Sales'), ('Marketing'), ('Design'), ('IT'), ('Finance'), ('Support');

-- 2. PUTS All 10 Employee Master Profiles Dynamically
INSERT INTO employees (first_name, last_name, email, job_title, salary, employment_history, department_id, start_date) VALUES
('Sihongile', 'Nkosi', 'sihongile.nkosi@moderntech.com', 'Software Engineer', 70000.00, 'Joined in 2015, promoted to Senior in 2021', 1, '2015-03-01'),
('Lungile', 'Moyo', 'lungile.moyo@moderntech.com', 'HR Manager', 80000.00, 'Joined in 2013, promoted to Manager in 2018', 2, '2013-06-15'),
('Thabo', 'Molefe', 'thabo.molefe@moderntech.com', 'Quality Analyst', 55000.00, 'Joined in 2018', 3, '2018-01-10'),
('Keshav', 'Naidoo', 'keshav.naidoo@moderntech.com', 'Sales Representative', 60000.00, 'Joined in 2020', 4, '2020-02-01'),
('Zanele', 'Khumalo', 'zanele.khumalo@moderntech.com', 'Marketing Specialist', 58000.00, 'Joined in 2019', 5, '2019-07-01'),
('Sipho', 'Zulu', 'sipho.zulu@moderntech.com', 'UI/UX Designer', 65000.00, 'Joined in 2016', 6, '2016-04-01'),
('Naledi', 'Moeketsi', 'naledi.moeketsi@moderntech.com', 'DevOps Engineer', 72000.00, 'Joined in 2017', 7, '2017-09-01'),
('Farai', 'Gumbo', 'farai.gumbo@moderntech.com', 'Content Strategist', 56000.00, 'Joined in 2021', 5, '2021-05-01'),
('Karabo', 'Dlamini', 'karabo.dlamini@moderntech.com', 'Accountant', 62000.00, 'Joined in 2018', 8, '2018-08-01'),
('Fatima', 'Patel', 'fatima.patel@moderntech.com', 'Customer Support Lead', 58000.00, 'Joined in 2016', 9, '2016-11-01');

-- 3. PUTS 10 System User Security Credentials (Mapped to Employee IDs 1 to 10)
-- All demo accounts share the password: Passw0rd!
INSERT INTO users (employee_id, username, password_hash, role) VALUES
(1, 'sihongile_dev', '$2b$10$P4sNAshyxLZTPpe7/YZhEOIVdLFE8GvQpT6imrv.BTxH9dyIekXEm', 'Employee'),
(2, 'lungile_hr', '$2b$10$P4sNAshyxLZTPpe7/YZhEOIVdLFE8GvQpT6imrv.BTxH9dyIekXEm', 'HR Staff'),
(3, 'thabo_qa', '$2b$10$P4sNAshyxLZTPpe7/YZhEOIVdLFE8GvQpT6imrv.BTxH9dyIekXEm', 'Employee'),
(4, 'keshav_sales', '$2b$10$P4sNAshyxLZTPpe7/YZhEOIVdLFE8GvQpT6imrv.BTxH9dyIekXEm', 'Employee'),
(5, 'zanele_mkt', '$2b$10$P4sNAshyxLZTPpe7/YZhEOIVdLFE8GvQpT6imrv.BTxH9dyIekXEm', 'Employee'),
(6, 'sipho_design', '$2b$10$P4sNAshyxLZTPpe7/YZhEOIVdLFE8GvQpT6imrv.BTxH9dyIekXEm', 'Employee'),
(7, 'naledi_ops', '$2b$10$P4sNAshyxLZTPpe7/YZhEOIVdLFE8GvQpT6imrv.BTxH9dyIekXEm', 'Manager'),
(8, 'farai_content', '$2b$10$P4sNAshyxLZTPpe7/YZhEOIVdLFE8GvQpT6imrv.BTxH9dyIekXEm', 'Employee'),
(9, 'karabo_fin', '$2b$10$P4sNAshyxLZTPpe7/YZhEOIVdLFE8GvQpT6imrv.BTxH9dyIekXEm', 'Manager'),
(10, 'fatima_support', '$2b$10$P4sNAshyxLZTPpe7/YZhEOIVdLFE8GvQpT6imrv.BTxH9dyIekXEm', 'Employee');

-- 4. PUTS Complete 10-Row Payroll Ledger From our first JSON file
INSERT INTO payroll (employee_id, hours_worked, leave_deductions, final_salary) VALUES
(1, 160, 0, 69500.00),
(2, 150, 10, 79000.00),
(3, 170, 4, 54800.00),
(4, 165, 0, 59700.00),
(5, 158, 5, 57850.00),
(6, 160, 2, 64800.00),
(7, 175, 3, 71800.00),
(8, 160, 0, 56000.00),
(9, 155, 5, 61500.00),
(10, 162, 4, 57750.00);

-- 5. PUTS Complete Daily Log Tracking History (clock-in/clock-out model)
-- Absent days are simply the lack of a row for that employee/date.
INSERT INTO attendance (employee_id, work_date, clock_in, clock_out, work_mode, hours_worked) VALUES
(1, '2025-07-25', '2025-07-25 09:00:00', '2025-07-25 17:00:00', 'On Site', 8.00),
(1, '2025-07-27', '2025-07-27 09:00:00', '2025-07-27 17:00:00', 'On Site', 8.00),
(1, '2025-07-28', '2025-07-28 09:00:00', '2025-07-28 17:00:00', 'On Site', 8.00),
(2, '2025-07-25', '2025-07-25 09:00:00', '2025-07-25 17:00:00', 'On Site', 8.00),
(2, '2025-07-26', '2025-07-26 09:00:00', '2025-07-26 17:00:00', 'On Site', 8.00),
(2, '2025-07-28', '2025-07-28 09:00:00', '2025-07-28 17:00:00', 'On Site', 8.00),
(3, '2025-07-25', '2025-07-25 09:00:00', '2025-07-25 17:00:00', 'On Site', 8.00),
(3, '2025-07-27', '2025-07-27 09:00:00', '2025-07-27 17:00:00', 'On Site', 8.00),
(3, '2025-07-28', '2025-07-28 09:00:00', '2025-07-28 17:00:00', 'On Site', 8.00),
(4, '2025-07-26', '2025-07-26 09:00:00', '2025-07-26 17:00:00', 'On Site', 8.00),
(4, '2025-07-27', '2025-07-27 09:00:00', '2025-07-27 17:00:00', 'On Site', 8.00),
(4, '2025-07-28', '2025-07-28 09:00:00', '2025-07-28 17:00:00', 'On Site', 8.00),
(5, '2025-07-25', '2025-07-25 09:00:00', '2025-07-25 17:00:00', 'On Site', 8.00),
(5, '2025-07-26', '2025-07-26 09:00:00', '2025-07-26 17:00:00', 'On Site', 8.00),
(5, '2025-07-28', '2025-07-28 09:00:00', '2025-07-28 17:00:00', 'On Site', 8.00),
(6, '2025-07-25', '2025-07-25 09:00:00', '2025-07-25 17:00:00', 'On Site', 8.00),
(6, '2025-07-26', '2025-07-26 09:00:00', '2025-07-26 17:00:00', 'On Site', 8.00),
(6, '2025-07-28', '2025-07-28 09:00:00', '2025-07-28 17:00:00', 'On Site', 8.00),
(7, '2025-07-25', '2025-07-25 09:00:00', '2025-07-25 17:00:00', 'On Site', 8.00),
(7, '2025-07-26', '2025-07-26 09:00:00', '2025-07-26 17:00:00', 'On Site', 8.00),
(7, '2025-07-27', '2025-07-27 09:00:00', '2025-07-27 17:00:00', 'On Site', 8.00),
(7, '2025-07-28', '2025-07-28 09:00:00', '2025-07-28 17:00:00', 'On Site', 8.00),
(8, '2025-07-25', '2025-07-25 09:00:00', '2025-07-25 17:00:00', 'On Site', 8.00),
(8, '2025-07-26', '2025-07-26 09:00:00', '2025-07-26 17:00:00', 'On Site', 8.00),
(8, '2025-07-27', '2025-07-27 09:00:00', '2025-07-27 17:00:00', 'On Site', 8.00),
(8, '2025-07-28', '2025-07-28 09:00:00', '2025-07-28 17:00:00', 'On Site', 8.00),
(9, '2025-07-25', '2025-07-25 09:00:00', '2025-07-25 17:00:00', 'On Site', 8.00),
(9, '2025-07-26', '2025-07-26 09:00:00', '2025-07-26 17:00:00', 'On Site', 8.00),
(9, '2025-07-27', '2025-07-27 09:00:00', '2025-07-27 17:00:00', 'On Site', 8.00),
(9, '2025-07-28', '2025-07-28 09:00:00', '2025-07-28 17:00:00', 'On Site', 8.00),
(10, '2025-07-25', '2025-07-25 09:00:00', '2025-07-25 17:00:00', 'On Site', 8.00),
(10, '2025-07-26', '2025-07-26 09:00:00', '2025-07-26 17:00:00', 'On Site', 8.00),
(10, '2025-07-28', '2025-07-28 09:00:00', '2025-07-28 17:00:00', 'On Site', 8.00);

-- 6. PUTS Leave Requests History Log Matrix (CORRECTED BY LUKHO WITH START/END DATES)
INSERT INTO leave_requests (employee_id, start_date, end_date, reason, status) VALUES
(1, '2025-07-22', '2025-07-25', 'Sick Leave', 'Approved'),
(1, '2025-12-01', '2025-12-05', 'Personal', 'Pending'),
(2, '2025-07-15', '2025-07-17', 'Family Responsibility', 'Denied'),
(2, '2024-12-02', '2024-12-06', 'Vacation', 'Approved'),
(3, '2025-07-10', '2025-07-12', 'Medical Appointment', 'Approved'),
(3, '2024-12-05', '2024-12-08', 'Personal', 'Pending'),
(4, '2025-07-20', '2025-07-22', 'Bereavement', 'Approved'),
(5, '2024-12-01', '2024-12-05', 'Childcare', 'Pending'),
(6, '2025-07-18', '2025-07-20', 'Sick Leave', 'Approved'),
(7, '2025-07-22', '2025-07-26', 'Vacation', 'Pending'),
(8, '2024-12-02', '2024-12-04', 'Medical Appointment', 'Approved'),
(9, '2025-07-19', '2025-07-21', 'Childcare', 'Denied'),
(10, '2024-12-03', '2024-12-10', 'Vacation', 'Pending');

-- 7. PUTS Performance Feedback Metrics For our Corporate Tracking System
INSERT INTO performance_reviews (employee_id, reviewer_id, review_date, score, feedback_notes) VALUES
(1, 9, '2026-06-15', 5, 'Consistently delivers complex development modules ahead of schedule.'),
(3, 7, '2026-06-20', 4, 'Excellent focus on detail throughout our core quality assurance pipelines.'),
(5, 7, '2026-07-02', 3, 'Solid operational output on regional promotion projects.'),
(8, 9, '2026-07-12', 5, 'Stellar messaging design across marketing channels.');
