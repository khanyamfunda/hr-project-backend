
<script setup>
import { computed, ref } from 'vue'
import { useHrState } from '../composables/userHrState.js'

const props = defineProps({
  employeeSessionId: { type: Number, required: true }
})
const emit = defineEmits(['logout'])

const { state, employeeById, payrollSourceByEmployee, downloadPayslipAsDoc, formatCurrency, formatDate, formatTime, clockInInBackend, clockOutInBackend, isBackendAuthenticated } = useHrState()

const employeeWorkMode = ref('On Site')
const employeeClockMessage = ref('')
const employeeClockMessageType = ref('info')
const showMyPayslips = ref(false)

const employeeSelfProfile = computed(() => employeeById.value[props.employeeSessionId] ?? null)

const employeeSelfAttendance = computed(() => {
  return state.attendance.find((record) => record.employeeId === props.employeeSessionId) ??
    { present: 0, remote: 0, absent: 0, leaveDays: 0 }
})

const employeeActiveShift = computed(() => {
  return state.attendanceLogs.find((log) => log.employeeId === props.employeeSessionId && !log.clockOutAt) ?? null
})

const employeeSelfRecentAttendanceLogs = computed(() => {
  return state.attendanceLogs
    .filter((log) => log.employeeId === props.employeeSessionId)
    .sort((a, b) => new Date(b.clockInAt) - new Date(a.clockInAt))
    .slice(0, 5)
})

const employeeSelfLeaveRequests = computed(() => {
  return state.leaveRequests.filter((request) => request.employeeId === props.employeeSessionId)
})

const employeeSelfPayroll = computed(() => payrollSourceByEmployee.value[props.employeeSessionId] ?? null)

const employeeSelfLatestPayslip = computed(() => {
  return state.generatedPayslips.find((slip) => slip.employeeId === props.employeeSessionId) ?? null
})

const employeeSelfPayslips = computed(() => {
  return state.generatedPayslips
    .filter((slip) => slip.employeeId === props.employeeSessionId)
    .sort((a, b) => new Date(b.generatedAt ?? 0) - new Date(a.generatedAt ?? 0))
})

function setEmployeeClockMessage(message, type = 'info') {
  employeeClockMessage.value = message
  employeeClockMessageType.value = type
}

function getCurrentDayKey(dateValue = new Date()) {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ensureEmployeeAttendanceRecord(employeeId) {
  let attendanceRecord = state.attendance.find((record) => record.employeeId === employeeId)
  if (!attendanceRecord) {
    attendanceRecord = { employeeId, present: 0, remote: 0, absent: 0, leaveDays: 0 }
    state.attendance.push(attendanceRecord)
  }
  return attendanceRecord
}

async function clockInEmployee() {
  if (employeeActiveShift.value) {
    setEmployeeClockMessage('You are already clocked in. Clock out before starting a new shift.', 'warning')
    return
  }

  const now = new Date()
  const todayKey = getCurrentDayKey(now)
  const alreadyClosedToday = state.attendanceLogs.some(
    (log) => log.employeeId === props.employeeSessionId && log.workDate === todayKey && Boolean(log.clockOutAt)
  )

  if (alreadyClosedToday) {
    setEmployeeClockMessage('You already completed your shift for today.', 'warning')
    return
  }

  try {
    if (isBackendAuthenticated()) await clockInInBackend(props.employeeSessionId, employeeWorkMode.value)
  } catch (error) {
    setEmployeeClockMessage(error.message || 'Clock-in could not be saved.', 'danger')
    return
  }
  state.attendanceLogs.unshift({
    id: Date.now(),
    employeeId: props.employeeSessionId,
    workDate: todayKey,
    workMode: employeeWorkMode.value,
    clockInAt: now.toISOString(),
    clockOutAt: null,
    workedHours: 0
  })

  setEmployeeClockMessage(`Clock-in captured for ${employeeWorkMode.value}.`, 'success')
}

async function clockOutEmployee() {
  const activeShift = employeeActiveShift.value
  if (!activeShift) {
    setEmployeeClockMessage('No active shift found. Clock in first.', 'warning')
    return
  }

  try {
    if (isBackendAuthenticated()) await clockOutInBackend()
  } catch (error) {
    setEmployeeClockMessage(error.message || 'Clock-out could not be saved.', 'danger')
    return
  }
  const now = new Date()
  const clockInAt = new Date(activeShift.clockInAt)
  const workedHours = Math.max(0.25, (now - clockInAt) / (1000 * 60 * 60))
  activeShift.clockOutAt = now.toISOString()
  activeShift.workedHours = Math.round(workedHours * 100) / 100

  const attendanceRecord = ensureEmployeeAttendanceRecord(activeShift.employeeId)
  if (activeShift.workMode === 'Remote') {
    attendanceRecord.remote += 1
  } else {
    attendanceRecord.present += 1
  }

  const payrollRecord = state.payrollSource.find((entry) => entry.employeeId === activeShift.employeeId)
  if (payrollRecord) {
    payrollRecord.hoursWorked = Math.round((Number(payrollRecord.hoursWorked) + activeShift.workedHours) * 100) / 100
  }

  setEmployeeClockMessage('Clock-out captured and synced to HR attendance.', 'success')
}

function requestMyPayslips() {
  showMyPayslips.value = true
}

function downloadMyPayslipDoc(slip) {
  downloadPayslipAsDoc(slip)
}
</script>

<template>
  <section class="reveal-in">
    <header class="panel-card p-3 p-lg-4 mb-4 d-flex flex-column flex-lg-row gap-3">
      <div>
        <span class="eyebrow">Employee Dashboard</span>
        <h1 class="hero-title mb-1">Welcome, {{ employeeSelfProfile?.name }}</h1>
        <p class="text-muted mb-0">Your personal HR information from the centralized records.</p>
      </div>
      <div class="ms-lg-auto d-flex align-items-start align-items-lg-center">
        <button class="btn btn-outline-dark" @click="emit('logout')">Log out</button>
      </div>
    </header>

    <section class="row g-3 g-lg-4">
      <div class="col-12">
        <article class="panel-card p-3 p-lg-4">
          <h3 class="section-title">Clock In / Clock Out</h3>
          <p class="small text-muted mb-3">Select where you are working today and clock in. HR attendance updates when you clock out.</p>

          <div class="row g-3 align-items-end">
            <div class="col-12 col-md-4">
              <label class="form-label">Work Mode</label>
              <select v-model="employeeWorkMode" class="form-select" :disabled="Boolean(employeeActiveShift)">
                <option value="On Site">On Site</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
            <div class="col-12 col-md-8 d-flex flex-wrap gap-2">
              <button class="btn btn-aurora" type="button" @click="clockInEmployee" :disabled="Boolean(employeeActiveShift)">
                Clock In
              </button>
              <button class="btn btn-outline-dark" type="button" @click="clockOutEmployee" :disabled="!employeeActiveShift">
                Clock Out
              </button>
              <span class="badge align-self-center" :class="employeeActiveShift ? 'text-bg-success' : 'text-bg-secondary'">
                {{ employeeActiveShift ? `Active Shift (${employeeActiveShift.workMode})` : 'Not Clocked In' }}
              </span>
            </div>
          </div>

          <div v-if="employeeClockMessage" class="alert py-2 mt-3 mb-0" :class="`alert-${employeeClockMessageType}`">
            {{ employeeClockMessage }}
          </div>
        </article>
      </div>

      <div class="col-12 col-lg-6">
        <article class="panel-card p-3 p-lg-4 h-100">
          <h3 class="section-title">My Profile</h3>
          <div class="small mb-2"><strong>Name:</strong> {{ employeeSelfProfile?.name }}</div>
          <div class="small mb-2"><strong>Email:</strong> {{ employeeSelfProfile?.email }}</div>
          <div class="small mb-2"><strong>Department:</strong> {{ employeeSelfProfile?.department }}</div>
          <div class="small mb-2"><strong>Role:</strong> {{ employeeSelfProfile?.role }}</div>
          <div class="small mb-2"><strong>Employment Start:</strong> {{ formatDate(employeeSelfProfile?.startDate) }}</div>
          <div class="small mb-0"><strong>Employment History:</strong> {{ employeeSelfProfile?.history }}</div>
        </article>
      </div>

      <div class="col-12 col-lg-6">
        <article class="panel-card p-3 p-lg-4 h-100">
          <h3 class="section-title">My Payroll Summary</h3>
          <div class="small mb-2"><strong>Annual Salary:</strong> {{ formatCurrency(employeeSelfProfile?.salary ?? 0) }}</div>
          <div class="small mb-2"><strong>Monthly Salary:</strong> {{ formatCurrency((employeeSelfProfile?.salary ?? 0) / 12) }}</div>
          <div class="small mb-2"><strong>Hours Worked:</strong> {{ employeeSelfPayroll?.hoursWorked ?? 0 }}</div>
          <div class="small mb-2"><strong>Leave Deductions:</strong> {{ employeeSelfPayroll?.leaveDeductions ?? 0 }}</div>
          <div class="small mb-2"><strong>Payroll Final Salary:</strong> {{ formatCurrency(employeeSelfPayroll?.finalSalary ?? 0) }}</div>
          <div class="small mb-0"><strong>Latest Net Pay:</strong> {{ formatCurrency(employeeSelfLatestPayslip?.netPay ?? 0) }}</div>
        </article>
      </div>

      <div class="col-12 col-lg-6">
        <article class="panel-card p-3 p-lg-4 h-100">
          <h3 class="section-title">My Attendance</h3>
          <div class="small mb-2"><strong>Present:</strong> {{ employeeSelfAttendance?.present ?? 0 }}</div>
          <div class="small mb-2"><strong>Remote:</strong> {{ employeeSelfAttendance?.remote ?? 0 }}</div>
          <div class="small mb-2"><strong>Absent:</strong> {{ employeeSelfAttendance?.absent ?? 0 }}</div>
          <div class="small mb-0"><strong>Approved Leave Days:</strong> {{ employeeSelfAttendance?.leaveDays ?? 0 }}</div>

          <h4 class="section-title mt-4 mb-2">Recent Clock Logs</h4>
          <div v-if="employeeSelfRecentAttendanceLogs.length" class="d-flex flex-column gap-2">
            <div v-for="log in employeeSelfRecentAttendanceLogs" :key="log.id" class="request-card">
              <div class="small"><strong>Date:</strong> {{ formatDate(log.workDate) }}</div>
              <div class="small"><strong>Mode:</strong> {{ log.workMode }}</div>
              <div class="small"><strong>Clock In:</strong> {{ formatTime(log.clockInAt) }}</div>
              <div class="small"><strong>Clock Out:</strong> {{ formatTime(log.clockOutAt) }}</div>
            </div>
          </div>
          <p v-else class="small text-muted mb-0 mt-2">No clock logs yet.</p>
        </article>
      </div>

      <div class="col-12 col-lg-6">
        <article class="panel-card p-3 p-lg-4 h-100">
          <h3 class="section-title">My Leave Requests</h3>
          <div v-if="employeeSelfLeaveRequests.length" class="d-flex flex-column gap-2">
            <div v-for="request in employeeSelfLeaveRequests" :key="request.id" class="request-card">
              <div class="small"><strong>Date:</strong> {{ formatDate(request.startDate) }}</div>
              <div class="small"><strong>Reason:</strong> {{ request.reason }}</div>
              <div class="small"><strong>Status:</strong> {{ request.status }}</div>
            </div>
          </div>
          <p v-else class="small text-muted mb-0">No leave requests found for your profile.</p>
        </article>
      </div>

      <div class="col-12">
        <article class="panel-card p-3 p-lg-4">
          <h3 class="section-title">My Digital Payslips</h3>
          <div class="mb-3 d-flex justify-content-between align-items-center gap-2 flex-wrap">
            <p class="small text-muted mb-0">Payslips are only shown on request.</p>
            <button class="btn btn-sm btn-outline-dark" type="button" @click="requestMyPayslips">Request My Payslips</button>
          </div>

          <div v-if="showMyPayslips && employeeSelfPayslips.length" class="d-flex flex-column gap-2">
            <div v-for="slip in employeeSelfPayslips" :key="slip.id" class="payslip-card">
              <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                  <div class="small"><strong>Period:</strong> {{ slip.month }}</div>
                  <div class="small"><strong>Payslip #:</strong> {{ slip.slipNumber ?? `MT-${String(slip.id).slice(-8)}` }}</div>
                  <div class="small"><strong>Generated:</strong> {{ formatDate(slip.generatedAt ?? new Date()) }}</div>
                  <div class="small"><strong>Gross Pay:</strong> {{ formatCurrency(slip.grossPay ?? (slip.baseMonthly + slip.overtimePay)) }}</div>
                </div>
                <div class="text-end d-flex flex-column align-items-end gap-2">
                  <div class="small text-muted">Net Pay</div>
                  <div class="fw-bold fs-5">{{ formatCurrency(slip.netPay) }}</div>
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-secondary" type="button" @click="downloadMyPayslipDoc(slip)">Download Document</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p v-else-if="showMyPayslips" class="small text-muted mb-0">No payslips available yet. HR can generate one from Payroll.</p>
          <p v-else class="small text-muted mb-0">Click "Request My Payslips" to view available payslips.</p>
        </article>
      </div>
    </section>
  </section>
</template>
