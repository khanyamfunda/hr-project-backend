
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useHrState } from '../composables/userHrState.js'
import * as api from '../services/api.js'

const props = defineProps({
  employeeSessionId: { type: Number, required: true }
})
const emit = defineEmits(['logout'])

const { state, employeeById, formatCurrency, formatDate, formatTime, loadFromBackend } = useHrState()

const employeeWorkMode = ref('On Site')
const employeeClockMessage = ref('')
const employeeClockMessageType = ref('info')
const isClockingAction = ref(false)
const myPayslips = ref([])
const payslipsLoaded = ref(false)
const payslipsError = ref('')

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

const employeeSelfReviews = computed(() => {
  return state.performanceReviews.filter((review) => review.employeeId === props.employeeSessionId)
})

function setEmployeeClockMessage(message, type = 'info') {
  employeeClockMessage.value = message
  employeeClockMessageType.value = type
}

async function refreshAttendanceAndProfile() {
  await loadFromBackend()
}

async function clockInEmployee() {
  isClockingAction.value = true
  try {
    await api.clockIn(employeeWorkMode.value)
    await refreshAttendanceAndProfile()
    setEmployeeClockMessage(`Clock-in captured for ${employeeWorkMode.value}.`, 'success')
  } catch (err) {
    setEmployeeClockMessage(err.message, 'warning')
  } finally {
    isClockingAction.value = false
  }
}

async function clockOutEmployee() {
  isClockingAction.value = true
  try {
    await api.clockOut()
    await refreshAttendanceAndProfile()
    setEmployeeClockMessage('Clock-out captured and synced to HR attendance.', 'success')
  } catch (err) {
    setEmployeeClockMessage(err.message, 'warning')
  } finally {
    isClockingAction.value = false
  }
}

async function requestMyPayslips() {
  try {
    myPayslips.value = await api.fetchMyPayslips()
    payslipsError.value = ''
  } catch (err) {
    payslipsError.value = err.message
  } finally {
    payslipsLoaded.value = true
  }
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
              <button class="btn btn-aurora" type="button" @click="clockInEmployee" :disabled="Boolean(employeeActiveShift) || isClockingAction">
                Clock In
              </button>
              <button class="btn btn-outline-dark" type="button" @click="clockOutEmployee" :disabled="!employeeActiveShift || isClockingAction">
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
          <h3 class="section-title">My Salary</h3>
          <div class="small mb-2"><strong>Annual Salary:</strong> {{ formatCurrency(employeeSelfProfile?.salary ?? 0) }}</div>
          <div class="small mb-0"><strong>Monthly Salary:</strong> {{ formatCurrency((employeeSelfProfile?.salary ?? 0) / 12) }}</div>
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

      <div class="col-12 col-lg-6">
        <article class="panel-card p-3 p-lg-4 h-100">
          <h3 class="section-title">My Performance Reviews</h3>
          <div v-if="employeeSelfReviews.length" class="d-flex flex-column gap-2">
            <div v-for="review in employeeSelfReviews" :key="review.id" class="request-card">
              <div class="small"><strong>Date:</strong> {{ formatDate(review.period) }}</div>
              <div class="small"><strong>Score:</strong> {{ review.rating }} / 5</div>
              <div class="small"><strong>Feedback:</strong> {{ review.summary }}</div>
            </div>
          </div>
          <p v-else class="small text-muted mb-0">No performance reviews yet.</p>
        </article>
      </div>

      <div class="col-12">
        <article class="panel-card p-3 p-lg-4">
          <h3 class="section-title">My Digital Payslips</h3>
          <div class="mb-3 d-flex justify-content-between align-items-center gap-2 flex-wrap">
            <p class="small text-muted mb-0">Committed payroll runs for your account.</p>
            <button class="btn btn-sm btn-outline-dark" type="button" @click="requestMyPayslips">Request My Payslips</button>
          </div>

          <div v-if="payslipsError" class="alert alert-warning py-2">{{ payslipsError }}</div>

          <div v-if="payslipsLoaded && myPayslips.length" class="d-flex flex-column gap-2">
            <div v-for="slip in myPayslips" :key="slip.id" class="payslip-card">
              <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                  <div class="small"><strong>Pay Period:</strong> {{ slip.payPeriod }}</div>
                  <div class="small"><strong>Status:</strong> {{ slip.status }}</div>
                  <div class="small"><strong>Hours Worked:</strong> {{ slip.hoursWorked }}</div>
                  <div class="small"><strong>Gross Earnings:</strong> {{ formatCurrency(slip.grossEarnings) }}</div>
                  <div class="small"><strong>Deductions:</strong> {{ formatCurrency(slip.deductions) }}</div>
                </div>
                <div class="text-end d-flex flex-column align-items-end gap-2">
                  <div class="small text-muted">Net Pay</div>
                  <div class="fw-bold fs-5">{{ formatCurrency(slip.netPay) }}</div>
                </div>
              </div>
            </div>
          </div>
          <p v-else-if="payslipsLoaded" class="small text-muted mb-0">No payslips have been processed for you yet.</p>
          <p v-else class="small text-muted mb-0">Click "Request My Payslips" to view available payslips.</p>
        </article>
      </div>
    </section>
  </section>
</template>
