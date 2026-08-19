CREATE DATABASE IF NOT EXISTS moderntech_hr;
USE moderntech_hr;

-- Drop tables in reverse order of dependencies to avoid foreign key errors during execution
DROP TABLE IF EXISTS performance_reviews;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS payroll;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;


-- ==================== 1. DEPARTMENTS TABLE ====================
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;


-- ==================== 2. EMPLOYEES TABLE ====================
CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    salary DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    employment_history TEXT NULL,
    department_id INT,
    FOREIGN KEY (department_id) 
        REFERENCES departments(department_id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ==================== 3. USERS TABLE (AUTHENTICATION) ====================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('HR Staff', 'Manager', 'Employee') DEFAULT 'Employee',
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (employee_id) 
        REFERENCES employees(employee_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- ==================== 4. PAYROLL TABLE ====================
CREATE TABLE payroll (
    payroll_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    hours_worked INT NOT NULL DEFAULT 0,
    leave_deductions INT NOT NULL DEFAULT 0,
    final_salary DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (employee_id) 
        REFERENCES employees(employee_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- ==================== 5. LEAVE REQUESTS TABLE ====================
CREATE TABLE leave_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    request_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('Approved', 'Pending', 'Denied') DEFAULT 'Pending',
    FOREIGN KEY (employee_id) 
        REFERENCES employees(employee_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- ==================== 6. ATTENDANCE TABLE ====================
CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    log_date DATE NOT NULL,
    status ENUM('Present', 'Absent') NOT NULL,
    UNIQUE KEY unique_emp_attendance (employee_id, log_date),
    FOREIGN KEY (employee_id) 
        REFERENCES employees(employee_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- ==================== 7. PERFORMANCE REVIEWS TABLE ====================
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


-- ==================== PERFORMANCE INDEXES ====================
CREATE INDEX idx_employee_email ON employees(email);
CREATE INDEX idx_attendance_date ON attendance(log_date);
CREATE INDEX idx_leave_status ON leave_requests(status);


-- ==================== PUT DATA INTO TABLES SECTION ====================

-- 1. PUTS All Unique Departments From our Project Data
INSERT INTO departments (department_name) VALUES 
('Development'), ('HR'), ('QA'), ('Sales'), ('Marketing'), ('Design'), ('IT'), ('Finance'), ('Support');


-- 2. PUTS All 10 Employee Master Profiles Dynamically
INSERT INTO employees (first_name, last_name, email, job_title, salary, employment_history, department_id) VALUES
('Sibongile', 'Nkosi', 'sibongile.nkosi@moderntech.com', 'Software Engineer', 70000.00, 'Joined in 2015, promoted to Senior in 2018', 1),
('Lungile', 'Moyo', 'lungile.moyo@moderntech.com', 'HR Manager', 80000.00, 'Joined in 2013, promoted to Manager in 2017', 2),
('Thabo', 'Molefe', 'thabo.molefe@moderntech.com', 'Quality Analyst', 55000.00, 'Joined in 2018', 3),
('Keshav', 'Naidoo', 'keshav.naidoo@moderntech.com', 'Sales Representative', 60000.00, 'Joined in 2020', 4),
('Zanele', 'Khumalo', 'zanele.khumalo@moderntech.com', 'Marketing Specialist', 58000.00, 'Joined in 2019', 5),
('Sipho', 'Zulu', 'sipho.zulu@moderntech.com', 'UI/UX Designer', 65000.00, 'Joined in 2016', 6),
('Naledi', 'Moeketsi', 'naledi.moeketsi@moderntech.com', 'DevOps Engineer', 72000.00, 'Joined in 2017', 7),
('Farai', 'Gumbo', 'farai.gumbo@moderntech.com', 'Content Strategist', 56000.00, 'Joined in 2021', 5),
('Karabo', 'Dlamini', 'karabo.dlamini@moderntech.com', 'Accountant', 62000.00, 'Joined in 2018', 8),
('Fatima', 'Patel', 'fatima.patel@moderntech.com', 'Customer Support Lead', 58000.00, 'Joined in 2016', 9);


-- 3. PUTS 10 System User Security Credentials (Mapped to Employee IDs 1 to 10)
-- Passwords are encrypted as a bcrypt hash of 'ModernTech2026!'
-- Roles are distributed to test different clearance privileges on your dashboard menus
INSERT INTO users (employee_id, username, password_hash, role) VALUES
(1, 'sibongile_dev', '$2b$10$GZYl2ObHTS/MdCCT.lIyY.OGKlln.SYZlBhFEFzkzYagoWjihIvde', 'Employee'),
(2, 'lungile_hr', '$2b$10$GZYl2ObHTS/MdCCT.lIyY.OGKlln.SYZlBhFEFzkzYagoWjihIvde', 'HR Staff'),
(3, 'thabo_qa', '$2b$10$GZYl2ObHTS/MdCCT.lIyY.OGKlln.SYZlBhFEFzkzYagoWjihIvde', 'Employee'),
(4, 'keshav_sales', '$2b$10$GZYl2ObHTS/MdCCT.lIyY.OGKlln.SYZlBhFEFzkzYagoWjihIvde', 'Employee'),
(5, 'zanele_mkt', '$2b$10$GZYl2ObHTS/MdCCT.lIyY.OGKlln.SYZlBhFEFzkzYagoWjihIvde', 'Employee'),
(6, 'sipho_design', '$2b$10$GZYl2ObHTS/MdCCT.lIyY.OGKlln.SYZlBhFEFzkzYagoWjihIvde', 'Employee'),
(7, 'naledi_ops', '$2b$10$GZYl2ObHTS/MdCCT.lIyY.OGKlln.SYZlBhFEFzkzYagoWjihIvde', 'Manager'),
(8, 'farai_content', '$2b$10$GZYl2ObHTS/MdCCT.lIyY.OGKlln.SYZlBhFEFzkzYagoWjihIvde', 'Employee'),
(9, 'karabo_fin', '$2b$10$GZYl2ObHTS/MdCCT.lIyY.OGKlln.SYZlBhFEFzkzYagoWjihIvde', 'Manager'),
(10, 'fatima_support', '$2b$10$GZYl2ObHTS/MdCCT.lIyY.OGKlln.SYZlBhFEFzkzYagoWjihIvde', 'Employee');


-- 4. PUTS Complete 10-Row Payroll Ledger From our First JSON File
INSERT INTO payroll (employee_id, hours_worked, leave_deductions, final_salary) VALUES
(1, 160, 8, 69500.00),
(2, 150, 10, 79000.00),
(3, 170, 4, 54800.00),
(4, 165, 6, 59700.00),
(5, 158, 5, 57850.00),
(6, 168, 2, 64800.00),
(7, 175, 3, 71800.00),
(8, 160, 0, 56000.00),
(9, 155, 5, 61500.00),
(10, 162, 4, 57750.00);


-- 5. PUTS Complete Daily Log Tracking History From our Third JSON File
INSERT INTO attendance (employee_id, log_date, status) VALUES
(1, '2025-07-25', 'Present'), (1, '2025-07-26', 'Absent'), (1, '2025-07-27', 'Present'), (1, '2025-07-28', 'Present'), (1, '2025-07-29', 'Present'),
(2, '2025-07-25', 'Present'), (2, '2025-07-26', 'Present'), (2, '2025-07-27', 'Absent'), (2, '2025-07-28', 'Present'), (2, '2025-07-29', 'Present'),
(3, '2025-07-25', 'Present'), (3, '2025-07-26', 'Present'), (3, '2025-07-27', 'Present'), (3, '2025-07-28', 'Absent'), (3, '2025-07-29', 'Present'),
(4, '2025-07-25', 'Absent'),  (4, '2025-07-26', 'Present'), (4, '2025-07-27', 'Present'), (4, '2025-07-28', 'Present'), (4, '2025-07-29', 'Present'),
(5, '2025-07-25', 'Present'), (5, '2025-07-26', 'Present'), (5, '2025-07-27', 'Absent'), (5, '2025-07-28', 'Present'), (5, '2025-07-29', 'Present'),
(6, '2025-07-25', 'Present'), (6, '2025-07-26', 'Present'), (6, '2025-07-27', 'Absent'), (6, '2025-07-28', 'Present'), (6, '2025-07-29', 'Present'),
(7, '2025-07-25', 'Present'), (7, '2025-07-26', 'Present'), (7, '2025-07-27', 'Present'), (7, '2025-07-28', 'Absent'), (7, '2025-07-29', 'Present'),
(8, '2025-07-25', 'Present'), (8, '2025-07-26', 'Absent'),  (8, '2025-07-27', 'Present'), (8, '2025-07-28', 'Present'), (8, '2025-07-29', 'Present'),
(9, '2025-07-25', 'Present'), (9, '2025-07-26', 'Present'), (9, '2025-07-27', 'Present'), (9, '2025-07-28', 'Absent'), (9, '2025-07-29', 'Present'),
(10, '2025-07-25', 'Present'), (10, '2025-07-26', 'Present'), (10, '2025-07-27', 'Absent'), (10, '2025-07-28', 'Present'), (10, '2025-07-29', 'Present');


-- 6. PUTS Leave Requests History Log Matrix
INSERT INTO leave_requests (employee_id, request_date, reason, status) VALUES
(1, '2025-07-22', 'Sick Leave', 'Approved'), (1, '2024-12-01', 'Personal', 'Pending'),
(2, '2025-07-15', 'Family Responsibility', 'Denied'), (2, '2024-12-02', 'Vacation', 'Approved'),
(3, '2025-07-10', 'Medical Appointment', 'Approved'), (3, '2024-12-05', 'Personal', 'Pending'),
(4, '2025-07-20', 'Bereavement', 'Approved'),
(5, '2024-12-01', 'Childcare', 'Pending'),
(6, '2025-07-18', 'Sick Leave', 'Approved'),
(7, '2025-07-22', 'Vacation', 'Pending'),
(8, '2024-12-02', 'Medical Appointment', 'Approved'),
(9, '2025-07-19', 'Childcare', 'Denied'),
(10, '2024-12-03', 'Vacation', 'Pending');


-- 7. PUTS Performance Feedback Metrics For our Corporate Tracking System
INSERT INTO performance_reviews (employee_id, reviewer_id, review_date, score, feedback_notes) VALUES
(1, 9, '2026-06-15', 5, 'Consistently delivers complex development modules ahead of schedule.'),
(3, 7, '2026-06-20', 4, 'Excellent focus on detail throughout our core quality assurance pipelines.'),
(5, 7, '2026-07-02', 3, 'Solid operational output on regional promotion projects.'),
(8, 9, '2026-07-12', 5, 'Stellar messaging design across marketing channels.');

-- 1. Completely drop the old layout to clear out conflicting strict properties
DROP TABLE IF EXISTS attendance;

-- 2. Build the updated MVC schema model with hours tracking features
CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    work_date DATE NOT NULL,
    clock_in DATETIME NOT NULL,
    clock_out DATETIME NULL,
    work_mode VARCHAR(50) DEFAULT 'On Site',
    hours_worked DECIMAL(10, 2) DEFAULT 0.00,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB;
