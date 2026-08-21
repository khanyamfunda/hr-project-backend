// ==========================================
// APPLICATION CONSTANTS
// ==========================================

export const ROLES = {
  HR_STAFF: 'HR Staff',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee'
};

export const LEAVE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DENIED: 'Denied'
};

export const DEPARTMENTS = [
  'Development',
  'HR',
  'QA',
  'Sales',
  'Marketing',
  'Design',
  'IT',
  'Finance',
  'Support'
];

export const JWT_CONFIG = {
  EXPIRY: process.env.JWT_EXPIRY || '4h',
  SECRET: process.env.JWT_SECRET || 'supersecretcyberpunkkey123'
};

export const DB_CONFIG = {
  HOST: process.env.DB_HOST || 'localhost',
  PORT: process.env.DB_PORT || 3306,
  USER: process.env.DB_USER || 'root',
  PASSWORD: process.env.DB_PASSWORD || '',
  NAME: process.env.DB_NAME || 'moderntech_hr'
};

export const SERVER_PORT = process.env.PORT || 5000;
