import { computed, reactive, ref, watch } from 'vue'
import employeeInfoData from '../../employee_info.json'
import attendanceData from '../../Attendance.json'
import payrollData from '../../payroll_data.json'
import * as api from '../services/api.js'

const STORAGE_KEY = 'moderntech-hr-poc-state-v3'
const PAYSLIP_OVERTIME_RATE = 180
const PAYSLIP_TAX_RATE = 0.18
const PAYSLIP_PENSION_RATE = 0.06

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

// ---- Live backend integration ----
// Everything below is wired to the real, verified backend. Field-shape
// notes:
//   - Employees/payroll/attendance/performance-reviews come back camelCase.
//   - Leave requests come back snake_case (id, employee_id, first_name,
//     last_name, start_date, end_date, reason, status) and are mapped here.
export const backendStatus = reactive({ loading: false, error: null })
export const currentRole = ref(null) // 'HR Staff' | 'Manager' | 'Employee'

function mapBackendEmployee(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department || '—',
    salary: row.salary != null ? Number(row.salary) : 0,
    startDate: row.startDate ?? null,
    history: row.history ?? ''
  }
}

function mapBackendLeaveRequest(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    status: row.status
  }
}

// Raw clock-in/out log entry -> the shape AttendanceTracking.vue/EmployeePortal.vue expect
function mapBackendAttendanceLog(row) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    workDate: row.date,
    workMode: row.mode,
    clockInAt: row.clockIn,
    clockOutAt: row.clockOut,
    workedHours: row.hoursWorked ?? 0
  }
}

// Aggregates raw clock-in/out logs into the per-employee present/remote
// summary the tables render. "Absent" can't be derived from a clock-in
// model without a fixed working-day calendar, so it's left at 0 — every
// row here is a day the employee actually clocked in.
function buildAttendanceSummary(logs) {
  const summary = new Map()
  for (const log of logs) {
    if (!summary.has(log.employeeId)) {
      summary.set(log.employeeId, { employeeId: log.employeeId, present: 0, remote: 0, absent: 0, leaveDays: 0 })
    }
    const entry = summary.get(log.employeeId)
    if (log.workMode === 'Remote') entry.remote += 1
    else entry.present += 1
  }
  return Array.from(summary.values())
}

function mapBackendPayrollLedgerRow(row) {
  return {
    employeeId: row.employee_id,
    hoursWorked: Number(row.hours_worked ?? 0),
    leaveDeductions: Number(row.leave_deductions ?? 0),
    finalSalary: Number(row.final_salary ?? 0)
  }
}

function mapBackendReview(row) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    period: row.reviewDate,
    rating: row.score,
    summary: row.feedback
  }
}

export async function loadFromBackend() {
  backendStatus.loading = true
  backendStatus.error = null
  try {
    const isPrivileged = currentRole.value === 'HR Staff' || currentRole.value === 'Manager'

    const [employees, leaveRequests] = await Promise.all([
      api.fetchEmployees(),
      api.fetchLeaveRequests()
    ])
    state.employees = employees.map(mapBackendEmployee)
    state.leaveRequests = leaveRequests.map(mapBackendLeaveRequest)

    const attendanceRows = isPrivileged
      ? await api.fetchAllAttendanceAdmin()
      : await api.fetchMyAttendance()
    state.attendanceLogs = attendanceRows.map(mapBackendAttendanceLog)
    state.attendance = buildAttendanceSummary(state.attendanceLogs)

    if (isPrivileged) {
      const payrollResult = await api.fetchPayrollSummary()
      state.payrollSource = (payrollResult?.data ?? []).map(mapBackendPayrollLedgerRow)

      const reviews = await api.fetchAllReviews()
      state.performanceReviews = reviews.map(mapBackendReview)
    } else {
      // Employees don't have access to the whole-table payroll ledger or
      // every review record — only their own, loaded separately below.
      const myReviews = await api.fetchMyReviews()
      state.performanceReviews = myReviews.map(mapBackendReview)
    }
  } catch (err) {
    backendStatus.error = err.message
  } finally {
    backendStatus.loading = false
  }
}

export async function submitLeaveRequestToBackend({ employeeId, startDate, endDate, reason }) {
  await api.createLeaveRequest({ employeeId, startDate, endDate, reason })
  await loadFromBackend()
}

export async function updateLeaveStatusOnBackend(requestId, status) {
  await api.updateLeaveStatus(requestId, status)
  await loadFromBackend()
}

export async function clockInOnBackend(mode) {
  await api.clockIn(mode)
  await loadFromBackend()
}

export async function clockOutOnBackend() {
  await api.clockOut()
  await loadFromBackend()
}

export async function submitReviewToBackend({ employeeId, reviewDate, score, feedback }) {
  await api.createReview({ employeeId, reviewDate, score, feedback })
  await loadFromBackend()
}

export async function createEmployeeOnBackend(employee) {
  await api.createEmployee(employee)
  await loadFromBackend()
}

export async function updateEmployeeOnBackend(id, employee) {
  await api.updateEmployee(id, employee)
  await loadFromBackend()
}

export async function deleteEmployeeOnBackend(id) {
  await api.deleteEmployee(id)
  await loadFromBackend()
}

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
    downloadPayslipAsDoc,
    formatCurrency,
    formatDate,
    formatTime,
    getDateRangeLength,
    backendStatus,
    currentRole,
    loadFromBackend,
    submitLeaveRequestToBackend,
    updateLeaveStatusOnBackend,
    clockInOnBackend,
    clockOutOnBackend,
    submitReviewToBackend,
    createEmployeeOnBackend,
    updateEmployeeOnBackend,
    deleteEmployeeOnBackend
  }
}
