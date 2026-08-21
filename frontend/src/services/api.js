// Central API client for talking to the hr-project-backend Express server.
// Every function here maps 1:1 to a real, verified endpoint on that backend.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const TOKEN_KEY = 'moderntech-hr-auth-token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
  } catch (networkError) {
    throw new Error(`Could not reach the server at ${API_BASE_URL}. Is the backend running? (${networkError.message})`)
  }

  let data = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return data
}

// ---- Auth ----
// The login response body only includes { token, role, username } — but
// employee_id lives inside the token's own payload, so we decode it here
// rather than needing a second round trip.
export function decodeTokenPayload(token) {
  try {
    const payloadPart = token.split('.')[1]
    const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function login(username, password) {
  const result = await request('/api/auth/login', { method: 'POST', body: { username, password }, auth: false })
  const payload = decodeTokenPayload(result.token)
  return { ...result, employeeId: payload?.employee_id ?? null }
}

export function register(employeeId, username, password, role) {
  return request('/api/auth/register', {
    method: 'POST',
    body: { employee_id: employeeId, username, password, role },
    auth: false
  })
}

// ---- Employees (all fields returned in camelCase: id, firstName, lastName,
// name, email, departmentId, department, role, salary, history, startDate) ----
export function fetchEmployees() {
  return request('/api/employees')
}

export function fetchEmployee(id) {
  return request(`/api/employees/${id}`)
}

export function createEmployee(employee) {
  return request('/api/employees', { method: 'POST', body: employee })
}

export function updateEmployee(id, employee) {
  return request(`/api/employees/${id}`, { method: 'PUT', body: employee })
}

export function deleteEmployee(id) {
  return request(`/api/employees/${id}`, { method: 'DELETE' })
}

// ---- Departments ----
export function fetchDepartments() {
  return request('/api/departments')
}

// ---- Leave requests ----
export function fetchLeaveRequests() {
  return request('/api/leave-requests')
}

export function createLeaveRequest({ employeeId, startDate, endDate, reason }) {
  return request('/api/leave-requests', {
    method: 'POST',
    body: { employee_id: employeeId, start_date: startDate, end_date: endDate, reason }
  })
}

export function updateLeaveStatus(id, status) {
  return request(`/api/leave-requests/${id}`, { method: 'PATCH', body: { status } })
}

// ---- Attendance ----
export function fetchMyAttendance() {
  return request('/api/attendance/my-logs')
}

export function fetchShiftStatus() {
  return request('/api/attendance/status')
}

export function clockIn(mode = 'On Site') {
  return request('/api/attendance/clock-in', { method: 'POST', body: { mode } })
}

export function clockOut() {
  return request('/api/attendance/clock-out', { method: 'PUT' })
}

export function fetchAllAttendanceAdmin() {
  return request('/api/attendance/admin/all')
}

// ---- Payroll ----
// Whole-table ledger (HR/Manager only) — { message, data: [...] }
export function fetchPayrollSummary() {
  return request('/api/payroll/summary')
}

// Logged-in employee's own processed payslips
export function fetchMyPayslips() {
  return request('/api/payroll/my-payslips')
}

// Calculated (not-yet-committed) preview for a given 'YYYY-MM' pay period
export function fetchPayrollPreview(yearMonth) {
  return request(`/api/payroll/preview/${yearMonth}`)
}

// Commits a payroll run for one employee/period to payroll_records
export function processPayroll({ employeeId, payPeriod, hoursWorked, grossEarnings, deductions, netPay }) {
  return request('/api/payroll/process', {
    method: 'POST',
    body: { employeeId, payPeriod, hoursWorked, grossEarnings, deductions, netPay }
  })
}

// ---- Performance reviews ----
export function fetchAllReviews() {
  return request('/api/performance-reviews')
}

export function fetchMyReviews() {
  return request('/api/performance-reviews/my')
}

export function createReview({ employeeId, reviewDate, score, feedback }) {
  return request('/api/performance-reviews', {
    method: 'POST',
    body: { employeeId, reviewDate, score, feedback }
  })
}
