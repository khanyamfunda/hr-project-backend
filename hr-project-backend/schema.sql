CREATE DATABASE IF NOT EXISTS moderntech_hr;
USE moderntech_hr;

DROP TABLE IF EXISTS performance_reviews;
DROP TABLE IF EXISTS payroll_records;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS payroll;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;

CREATE TABLE departments (
	department_id INT AUTO_INCREMENT PRIMARY KEY,
	department_name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE employees (
	employee_id INT AUTO_INCREMENT PRIMARY KEY,
	first_name VARCHAR(50) NOT NULL,
	last_name VARCHAR(50) NOT NULL,
	email VARCHAR(100) UNIQUE NOT NULL,
	job_title VARCHAR(100) NOT NULL,
	salary DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
	employment_history TEXT,
	department_id INT,
	start_date DATE,
	FOREIGN KEY (department_id) REFERENCES departments(department_id)
		ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE users (
	user_id INT AUTO_INCREMENT PRIMARY KEY,
	employee_id INT UNIQUE NOT NULL,
	username VARCHAR(100) UNIQUE NOT NULL,
	password_hash VARCHAR(255) NOT NULL,
	role ENUM('HR Staff', 'Manager', 'Employee') DEFAULT 'Employee',
	is_active BOOLEAN DEFAULT TRUE,
	FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payroll (
	payroll_id INT AUTO_INCREMENT PRIMARY KEY,
	employee_id INT NOT NULL,
	hours_worked INT NOT NULL DEFAULT 0,
	leave_deductions INT NOT NULL DEFAULT 0,
	final_salary DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
	FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB;

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

CREATE TABLE attendance (
	attendance_id INT AUTO_INCREMENT PRIMARY KEY,
	employee_id INT NOT NULL,
	work_date DATE NOT NULL,
	clock_in DATETIME NULL,
	clock_out DATETIME NULL,
	work_mode VARCHAR(20) NOT NULL DEFAULT 'On Site',
	hours_worked DECIMAL(5, 2) NOT NULL DEFAULT 0,
	UNIQUE KEY unique_emp_attendance (employee_id, work_date),
	FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payroll_records (
	payroll_id INT AUTO_INCREMENT PRIMARY KEY,
	employee_id INT NOT NULL,
	pay_period VARCHAR(7) NOT NULL,
	hours_worked DECIMAL(6, 2) NOT NULL DEFAULT 0,
	gross_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
	deductions DECIMAL(10, 2) NOT NULL DEFAULT 0,
	net_pay DECIMAL(10, 2) NOT NULL DEFAULT 0,
	status ENUM('Draft', 'Processed') NOT NULL DEFAULT 'Draft',
	processed_at DATETIME NULL,
	UNIQUE KEY unique_emp_pay_period (employee_id, pay_period),
	FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB;

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

CREATE INDEX idx_employee_email ON employees(email);
CREATE INDEX idx_attendance_date ON attendance(work_date);
CREATE INDEX idx_leave_status ON leave_requests(status);