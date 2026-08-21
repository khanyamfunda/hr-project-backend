import { computed, reactive, watch } from 'vue'
import employeeInfoData from '../../employee_info.json'
import attendanceData from '../../Attendance.json'
import payrollData from '../../payroll_data.json'

const STORAGE_KEY = 'moderntech-hr-poc-state-v3'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'moderntech-hr-api-token'
export const AUTH_USER = 'hr_admin'
export const AUTH_PASSWORD = 'MT2026!'
const PAYSLIP_OVERTIME_RATE = 180
const PAYSLIP_TAX_RATE = 0.18
const PAYSLIP_PENSION_RATE = 0.06

let apiToken = localStorage.getItem(TOKEN_KEY) || ''

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      ...(options.headers || {})
    }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`)
  return payload
}

export async function authenticate(username, password) {
  const payload = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
  apiToken = payload.token
  localStorage.setItem(TOKEN_KEY, apiToken)
  return payload
}

export async function authenticateEmployee(employeeId, email) {
  const payload = await apiRequest('/auth/employee-login', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId, email })
  })
  apiToken = payload.token
  localStorage.setItem(TOKEN_KEY, apiToken)
  return payload
}

export async function hydrateEmployeeFromBackend(employeeId) {
  const [employee, leaveRequests, attendanceLogs, payslips] = await Promise.all([
    apiRequest(`/employees/${employeeId}`),
    apiRequest('/leave-requests/my'),
    apiRequest('/attendance/my-logs'),
    apiRequest('/payroll/my-payslips')
  ])

  state.employees = [mapEmployee(employee), ...state.employees.filter((item) => item.id !== employeeId)]
  state.leaveRequests = leaveRequests.map(mapLeaveRequest)
  state.attendanceLogs = attendanceLogs.map((log) => ({
    id: log.id,
    employeeId: log.employeeId,
    workDate: log.date,
    clockInAt: log.clockIn,
    clockOutAt: log.clockOut,
    workMode: log.mode,
    hoursWorked: Number(log.hoursWorked || 0)
  }))
  const employeeLogs = state.attendanceLogs.filter((log) => log.employeeId === employeeId)
  state.attendance = [{
    employeeId,
    present: employeeLogs.filter((log) => log.clockInAt && log.workMode === 'On Site').length,
    remote: employeeLogs.filter((log) => log.clockInAt && log.workMode === 'Remote').length,
    absent: 0,
    leaveDays: state.leaveRequests.filter((request) => request.status === 'Approved').length
  }, ...state.attendance.filter((record) => record.employeeId !== employeeId)]
  state.generatedPayslips = payslips.map((payslip) => ({
    id: payslip.id,
    slipNumber: `MT-${String(payslip.id).slice(-8)}`,
    generatedAt: payslip.processedAt,
    month: payslip.payPeriod,
    employeeId: payslip.employeeId,
    baseMonthly: Number(payslip.baseAnnualSalary || 0) / 12,
    hoursWorked: Number(payslip.hoursWorked || 0),
    grossPay: Number(payslip.grossEarnings || 0),
    taxDeduction: Number(payslip.deductions || 0),
    pensionDeduction: 0,
    leaveDeductions: 0,
    leaveDeductionAmount: 0,
    netPay: Number(payslip.netPay || 0)
  }))
  persistState()
  return state
}

export function clearAuthentication() {
  apiToken = ''
  localStorage.removeItem(TOKEN_KEY)
}

export function isBackendAuthenticated() {
  return Boolean(apiToken)
}

function mapEmployee(employee) {
  return {
    id: employee.id,
    name: employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
    email: employee.email,
    department: employee.department || '',
    departmentId: employee.departmentId,
    role: employee.role,
    salary: Number(employee.salary),
    startDate: employee.startDate,
    history: employee.history || ''
  }
}

function mapLeaveRequest(request) {
  return {
    id: request.id,
    employeeId: request.employee_id ?? request.employeeId,
    startDate: request.start_date ?? request.startDate,
    endDate: request.end_date ?? request.endDate,
    reason: request.reason,
    status: request.status
  }
}

function mapReview(review) {
  return {
    id: review.review_id ?? review.id,
    employeeId: review.employee_id ?? review.employeeId,
    period: review.period || review.review_date || '',
    rating: Number(review.score ?? review.rating),
    summary: review.feedback_notes ?? review.summary ?? ''
  }
}

export async function hydrateFromBackend() {
  const [employees, leaveRequests, attendanceLogs, payrollSource, performanceReviews] = await Promise.all([
    apiRequest('/employees'),
    apiRequest('/leave-requests'),
    apiRequest('/attendance/admin/all'),
    apiRequest('/payroll/summary'),
    apiRequest('/reviews')
  ])

  state.employees = employees.map(mapEmployee)
  state.leaveRequests = leaveRequests.map(mapLeaveRequest)
  state.attendanceLogs = attendanceLogs.map((log) => ({
    id: log.id,
    employeeId: log.employeeId,
    workDate: log.date,
    clockInAt: log.clockIn,
    clockOutAt: log.clockOut,
    workMode: log.mode,
    hoursWorked: Number(log.hoursWorked || 0)
  }))
  state.attendance = state.employees.map((employee) => {
    const logs = state.attendanceLogs.filter((log) => log.employeeId === employee.id)
    return {
      employeeId: employee.id,
      present: logs.filter((log) => log.clockInAt && log.workMode === 'On Site').length,
      remote: logs.filter((log) => log.clockInAt && log.workMode === 'Remote').length,
      absent: 0,
      leaveDays: state.leaveRequests.filter((request) => request.employeeId === employee.id && request.status === 'Approved').length
    }
  })
  state.payrollSource = (payrollSource.data ?? payrollSource).map((entry) => ({
    employeeId: entry.employeeId ?? entry.employee_id,
    hoursWorked: Number(entry.hoursWorked ?? entry.hours_worked ?? 0),
    leaveDeductions: Number(entry.leaveDeductions ?? entry.leave_deductions ?? 0),
    finalSalary: Number(entry.finalSalary ?? entry.final_salary ?? entry.netPay ?? entry.grossEarnings ?? 0)
  }))
  state.performanceReviews = performanceReviews.map(mapReview)
  persistState()
  return state
}

export async function refreshAttendanceFromBackend() {
  const [attendanceLogs, employees] = await Promise.all([
    apiRequest('/attendance/admin/all'),
    apiRequest('/employees')
  ])
  state.attendanceLogs = attendanceLogs.map((log) => ({
    id: log.id,
    employeeId: log.employeeId,
    workDate: log.date,
    clockInAt: log.clockIn,
    clockOutAt: log.clockOut,
    workMode: log.mode,
    hoursWorked: Number(log.hoursWorked || 0)
  }))
  const employeeRecords = employees.map(mapEmployee)
  state.attendance = employeeRecords.map((employee) => {
    const logs = state.attendanceLogs.filter((log) => log.employeeId === employee.id)
    return {
      employeeId: employee.id,
      present: logs.filter((log) => log.clockInAt && log.workMode === 'On Site').length,
      remote: logs.filter((log) => log.clockInAt && log.workMode === 'Remote').length,
      absent: 0,
      leaveDays: state.attendance.find((record) => record.employeeId === employee.id)?.leaveDays ?? 0
    }
  })
  return state.attendanceLogs
}

export async function createEmployeeInBackend(employee) {
  const created = await apiRequest('/employees', { method: 'POST', body: JSON.stringify(employee) })
  return mapEmployee(created)
}

export async function updateEmployeeInBackend(employeeId, employee) {
  const updated = await apiRequest(`/employees/${employeeId}`, { method: 'PUT', body: JSON.stringify(employee) })
  return mapEmployee(updated)
}

export async function deleteEmployeeFromBackend(employeeId) {
  await apiRequest(`/employees/${employeeId}`, { method: 'DELETE' })
}

export async function createLeaveRequestInBackend(request) {
  const result = await apiRequest('/leave-requests', {
    method: 'POST',
    body: JSON.stringify({ employee_id: request.employeeId, start_date: request.startDate, end_date: request.endDate, reason: request.reason })
  })
  return { ...request, id: result.requestId }
}

export async function updateLeaveStatusInBackend(requestId, status) {
  await apiRequest(`/leave-requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export async function createReviewInBackend(review) {
  const created = await apiRequest('/reviews', {
    method: 'POST',
    body: JSON.stringify({ employeeId: review.employeeId, period: review.period, rating: review.rating, summary: review.summary })
  })
  return mapReview(created)
}

export async function clockInInBackend(employeeId, workMode) {
  return apiRequest('/attendance/clock-in', { method: 'POST', body: JSON.stringify({ employee_id: employeeId, mode: workMode }) })
}

export async function clockOutInBackend() {
  return apiRequest('/attendance/clock-out', { method: 'PUT' })
}

function parseStartDateFromHistory(employmentHistory) {
  const yearMatch = /Joined in\s+(\d{4})/i.exec(employmentHistory ?? '')
  if (!yearMatch) return '2020-01-01'
  return `${yearMatch[1]}-01-01`
}

const importedEmployees = (employeeInfoData.employeeInformation ?? []).map((employee) => ({
  id: employee.employeeId,
  name: employee.name,
  email: employee.contact,
  department: employee.department,
  role: employee.position,
  salary: Number(employee.salary) * 12,
  startDate: parseStartDateFromHistory(employee.employmentHistory),
  history: employee.employmentHistory
}))

const importedAttendance = (attendanceData.attendanceAndLeave ?? []).map((employeeRecord) => ({
  employeeId: employeeRecord.employeeId,
  present: employeeRecord.attendance.filter((entry) => entry.status === 'Present').length,
  remote: employeeRecord.attendance.filter((entry) => entry.status === 'Remote').length,
  absent: employeeRecord.attendance.filter((entry) => entry.status === 'Absent').length,
  leaveDays: employeeRecord.leaveRequests.filter((entry) => entry.status === 'Approved').length
}))

const importedLeaveRequests = []
let leaveRequestId = 1
for (const employeeRecord of attendanceData.attendanceAndLeave ?? []) {
  for (const leaveRequest of employeeRecord.leaveRequests ?? []) {
    importedLeaveRequests.push({
      id: leaveRequestId,
      employeeId: employeeRecord.employeeId,
      startDate: leaveRequest.date,
      endDate: leaveRequest.date,
      reason: leaveRequest.reason,
      status: leaveRequest.status
    })
    leaveRequestId += 1
  }
}

const importedPayrollSource = (payrollData.payrollData ?? []).map((payrollEntry) => ({
  employeeId: payrollEntry.employeeId,
  hoursWorked: payrollEntry.hoursWorked,
  leaveDeductions: payrollEntry.leaveDeductions,
  finalSalary: payrollEntry.finalSalary
}))

const importedPayslips = importedPayrollSource.map((payrollEntry, index) => ({
  id: Date.now() + index,
  month: 'Imported Dataset',
  employeeId: payrollEntry.employeeId,
  baseMonthly: payrollEntry.finalSalary,
  overtimeHours: Math.max(0, payrollEntry.hoursWorked - 160),
  overtimePay: Math.max(0, payrollEntry.hoursWorked - 160) * 180,
  taxDeduction: payrollEntry.finalSalary * 0.18,
  pensionDeduction: payrollEntry.finalSalary * 0.06,
  leaveDeductionAmount: payrollEntry.leaveDeductions * 180,
  netPay: payrollEntry.finalSalary - payrollEntry.finalSalary * 0.18 - payrollEntry.finalSalary * 0.06
}))

// This `state` object is defined OUTSIDE the exported function, at module
// scope, so every component that imports useHrState() shares the exact
// same object (a simple hand-rolled "store" — like Pinia, but free).
export const state = reactive({
  employees: importedEmployees,
  leaveRequests: importedLeaveRequests,
  attendance: importedAttendance,
  attendanceLogs: [],
  performanceReviews: [
    { id: 1, employeeId: importedEmployees[0]?.id ?? 1, period: 'Q2 2026', rating: 4.7, summary: 'Excellent delivery pace and mentoring impact.' },
    { id: 2, employeeId: importedEmployees[1]?.id ?? 2, period: 'Q2 2026', rating: 4.5, summary: 'High defect prevention score in sprint releases.' },
    { id: 3, employeeId: importedEmployees[2]?.id ?? 3, period: 'Q2 2026', rating: 4.2, summary: 'Improved ticket closure by 16 percent.' }
  ],
  payrollSource: importedPayrollSource,
  generatedPayslips: importedPayslips
})

export const employeeById = computed(() => {
  return Object.fromEntries(state.employees.map((employee) => [employee.id, employee]))
})

export const payrollSourceByEmployee = computed(() => {
  return Object.fromEntries(state.payrollSource.map((entry) => [entry.employeeId, entry]))
})

function bootstrapFromLocalStorage() {
  const savedState = localStorage.getItem(STORAGE_KEY)
  if (!savedState) return
  try {
    const parsed = JSON.parse(savedState)
    state.employees = parsed.employees ?? state.employees
    state.leaveRequests = parsed.leaveRequests ?? state.leaveRequests
    state.attendance = parsed.attendance ?? state.attendance
    state.attendanceLogs = parsed.attendanceLogs ?? state.attendanceLogs
    state.performanceReviews = parsed.performanceReviews ?? state.performanceReviews
    state.payrollSource = parsed.payrollSource ?? state.payrollSource
    state.generatedPayslips = parsed.generatedPayslips ?? state.generatedPayslips

    // Guard against stale empty snapshots that hide seeded JSON data.
    if (!Array.isArray(state.employees) || state.employees.length === 0) {
      state.employees = importedEmployees
    }
    if (!Array.isArray(state.attendance) || state.attendance.length === 0) {
      state.attendance = importedAttendance
    }
    if (!Array.isArray(state.leaveRequests) || state.leaveRequests.length === 0) {
      state.leaveRequests = importedLeaveRequests
    }
    if (!Array.isArray(state.payrollSource) || state.payrollSource.length === 0) {
      state.payrollSource = importedPayrollSource
    }
    if (!Array.isArray(state.generatedPayslips) || state.generatedPayslips.length === 0) {
      state.generatedPayslips = importedPayslips
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}
bootstrapFromLocalStorage()

export function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// Automatically save to localStorage any time ANY part of state changes.
// This runs once, the moment this file is first imported by App.vue.
watch(state, persistState, { deep: true })

// ---- shared helper functions (formatting used by every module) ----
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)
}
export function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}
export function formatTime(dateValue) {
  if (!dateValue) return 'In progress'
  return new Date(dateValue).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}
export function getDateRangeLength(startDate, endDate) {
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor((new Date(endDate) - new Date(startDate)) / oneDay) + 1
}

function getCurrentPayrollPeriod() {
  return new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}

function normalizeNumber(value, fallback = 0) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

function formatPayslipNumber(payslipId) {
  return `MT-${String(payslipId).slice(-8)}`
}

export function calculatePayslip(employeeId, month = getCurrentPayrollPeriod()) {
  const employee = state.employees.find((item) => item.id === employeeId)
  if (!employee) return null

  const payrollBaseline = state.payrollSource.find((entry) => entry.employeeId === employeeId)
  const attendanceRecord = state.attendance.find((record) => record.employeeId === employeeId)

  const baseMonthly = normalizeNumber(employee.salary, 0) / 12
  const hoursWorked = normalizeNumber(payrollBaseline?.hoursWorked, 160)
  const overtimeHours = Math.max(0, hoursWorked - 160)
  const overtimePay = overtimeHours * PAYSLIP_OVERTIME_RATE
  const leaveDeductions = normalizeNumber(payrollBaseline?.leaveDeductions, attendanceRecord?.leaveDays ?? 0)
  const leaveDeductionAmount = leaveDeductions * 180
  const grossPay = baseMonthly + overtimePay
  const taxDeduction = grossPay * PAYSLIP_TAX_RATE
  const pensionDeduction = baseMonthly * PAYSLIP_PENSION_RATE
  const netPay = Math.max(0, grossPay - taxDeduction - pensionDeduction - leaveDeductionAmount)

  const id = Date.now() + Math.floor(Math.random() * 1000)
  return {
    id,
    slipNumber: formatPayslipNumber(id),
    generatedAt: new Date().toISOString(),
    month,
    employeeId,
    baseMonthly,
    hoursWorked,
    overtimeHours,
    overtimeRate: PAYSLIP_OVERTIME_RATE,
    overtimePay,
    grossPay,
    taxRate: PAYSLIP_TAX_RATE,
    taxDeduction,
    pensionRate: PAYSLIP_PENSION_RATE,
    pensionDeduction,
    leaveDeductions,
    leaveDeductionAmount,
    netPay
  }
}

export function generatePayslipForEmployee(employeeId, month = getCurrentPayrollPeriod()) {
  const payslip = calculatePayslip(employeeId, month)
  if (!payslip) return null
  state.generatedPayslips.unshift(payslip)
  return payslip
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildPayslipPrintHtml(slip, employee) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Payslip ${escapeHtml(slip.slipNumber ?? '')}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 24px;
        color: #182028;
      }
      .sheet {
        max-width: 780px;
        margin: 0 auto;
        border: 1px solid #d7dde2;
        border-radius: 10px;
        overflow: hidden;
      }
      .header {
        background: #eef6f3;
        padding: 18px 22px;
      }
      .header h1 {
        margin: 0;
        font-size: 22px;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px 14px;
        padding: 16px 22px;
        border-bottom: 1px solid #e6eaed;
      }
      .meta div {
        font-size: 14px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        padding: 10px 22px;
        border-bottom: 1px solid #f0f2f5;
        font-size: 14px;
      }
      th {
        text-align: left;
        color: #344452;
      }
      td:last-child,
      th:last-child {
        text-align: right;
      }
      .net {
        background: #f6f8f9;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <article class="sheet">
      <header class="header">
        <h1>ModernTech Solutions - Digital Payslip</h1>
      </header>
      <section class="meta">
        <div><strong>Payslip #:</strong> ${escapeHtml(slip.slipNumber ?? '')}</div>
        <div><strong>Period:</strong> ${escapeHtml(slip.month ?? '')}</div>
        <div><strong>Employee:</strong> ${escapeHtml(employee?.name ?? 'Unknown')}</div>
        <div><strong>Role:</strong> ${escapeHtml(employee?.role ?? 'N/A')}</div>
        <div><strong>Department:</strong> ${escapeHtml(employee?.department ?? 'N/A')}</div>
        <div><strong>Generated:</strong> ${escapeHtml(formatDate(slip.generatedAt ?? new Date()))}</div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Base Monthly Salary</td><td>${escapeHtml(formatCurrency(slip.baseMonthly ?? 0))}</td></tr>
          <tr><td>Overtime (${escapeHtml(slip.overtimeHours ?? 0)} hrs @ ${escapeHtml(formatCurrency(slip.overtimeRate ?? 0))})</td><td>${escapeHtml(formatCurrency(slip.overtimePay ?? 0))}</td></tr>
          <tr><td>Gross Pay</td><td>${escapeHtml(formatCurrency(slip.grossPay ?? 0))}</td></tr>
          <tr><td>Tax Deduction (${escapeHtml(Math.round((slip.taxRate ?? 0) * 100))}%)</td><td>-${escapeHtml(formatCurrency(slip.taxDeduction ?? 0))}</td></tr>
          <tr><td>Pension Deduction (${escapeHtml(Math.round((slip.pensionRate ?? 0) * 100))}%)</td><td>-${escapeHtml(formatCurrency(slip.pensionDeduction ?? 0))}</td></tr>
          <tr><td>Leave Deduction (${escapeHtml(slip.leaveDeductions ?? 0)} day(s))</td><td>-${escapeHtml(formatCurrency(slip.leaveDeductionAmount ?? 0))}</td></tr>
          <tr class="net"><td>Net Pay</td><td>${escapeHtml(formatCurrency(slip.netPay ?? 0))}</td></tr>
        </tbody>
      </table>
    </article>
  </body>
</html>`
}

function resolvePayslip(slipOrId) {
  const slip = typeof slipOrId === 'object'
    ? slipOrId
    : state.generatedPayslips.find((item) => item.id === slipOrId)

  if (!slip) return null
  const employee = state.employees.find((item) => item.id === slip.employeeId)
  return { slip, employee }
}

function downloadBlobFile(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export function downloadPayslipAsDoc(slipOrId) {
  const resolved = resolvePayslip(slipOrId)
  if (!resolved) return false
  const { slip, employee } = resolved

  const safeEmployeeName = String(employee?.name ?? 'employee').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const safePeriod = String(slip.month ?? 'period').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const fileName = `payslip-${safeEmployeeName}-${safePeriod}.doc`

  const htmlDoc = buildPayslipPrintHtml(slip, employee)
  const blob = new Blob([htmlDoc], { type: 'application/msword' })
  downloadBlobFile(blob, fileName)
  return true
}

// Composable entry point — this is what every component calls.
export function useHrState() {
  return {
    state,
    employeeById,
    payrollSourceByEmployee,
    persistState,
    calculatePayslip,
    generatePayslipForEmployee,
    authenticate,
    authenticateEmployee,
    hydrateEmployeeFromBackend,
    clearAuthentication,
    isBackendAuthenticated,
    hydrateFromBackend,
    refreshAttendanceFromBackend,
    createEmployeeInBackend,
    updateEmployeeInBackend,
    deleteEmployeeFromBackend,
    createLeaveRequestInBackend,
    updateLeaveStatusInBackend,
    createReviewInBackend,
    clockInInBackend,
    clockOutInBackend,
    downloadPayslipAsDoc,
    formatCurrency,
    formatDate,
    formatTime,
    getDateRangeLength
  }
}
