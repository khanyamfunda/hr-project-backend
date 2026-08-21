<script setup>
import { computed, reactive, ref } from 'vue'
import { useHrState } from '../composables/userHrState.js'

const { state, employeeById, formatDate, getDateRangeLength, createLeaveRequestInBackend, updateLeaveStatusInBackend } = useHrState()
const actionError = ref('')
const actionMessage = ref('')

const leaveForm = reactive({
  employeeId: state.employees[0]?.id ?? 1,
  startDate: '',
  endDate: '',
  reason: ''
})

const leaveValidationErrors = computed(() => {
  const errors = []
  if (!leaveForm.startDate || !leaveForm.endDate) errors.push('Start and end date are required.')
  if (leaveForm.startDate && leaveForm.endDate && leaveForm.startDate > leaveForm.endDate) errors.push('End date must be on or after start date.')
  if (!leaveForm.reason.trim()) errors.push('Please provide a short leave reason.')
  return errors
})

async function submitLeaveRequest() {
  if (leaveValidationErrors.value.length) return

  try {
    const request = await createLeaveRequestInBackend({
      employeeId: Number(leaveForm.employeeId),
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason.trim(),
      status: 'Pending'
    })
    state.leaveRequests.unshift(request)
    actionError.value = ''
    actionMessage.value = 'Leave request saved.'
  } catch (error) {
    actionMessage.value = ''
    actionError.value = error.message || 'Could not save leave request.'
    return
  }

  leaveForm.startDate = ''
  leaveForm.endDate = ''
  leaveForm.reason = ''
}

async function updateLeaveStatus(requestId, newStatus) {
  const targetRequest = state.leaveRequests.find((request) => request.id === requestId)
  if (!targetRequest || targetRequest.status === newStatus) return

  try {
    await updateLeaveStatusInBackend(requestId, newStatus)
    targetRequest.status = newStatus
    actionError.value = ''
    actionMessage.value = `Leave request ${newStatus.toLowerCase()}.`
  } catch (error) {
    actionMessage.value = ''
    actionError.value = error.message || 'Could not update leave request.'
    return
  }

  if (newStatus === 'Approved') {
    const attendanceRecord = state.attendance.find((record) => record.employeeId === targetRequest.employeeId)
    if (!attendanceRecord) return
    attendanceRecord.leaveDays += getDateRangeLength(targetRequest.startDate, targetRequest.endDate)
  }
}
</script>

<template>
  <section class="row g-3 g-lg-4">
    <div v-if="actionError || actionMessage" class="col-12">
      <div v-if="actionError" class="alert alert-danger mb-0">{{ actionError }}</div>
      <div v-else class="alert alert-success mb-0">{{ actionMessage }}</div>
    </div>
    <div class="col-12 col-lg-5">
      <article class="panel-card p-3 p-lg-4 h-100">
        <h3 class="section-title">Submit Time Off Request</h3>
        <form @submit.prevent="submitLeaveRequest" class="row g-3">
          <div class="col-12">
            <label class="form-label">Employee</label>
            <select v-model="leaveForm.employeeId" class="form-select">
              <option v-for="employee in state.employees" :key="employee.id" :value="employee.id">
                {{ employee.name }}
              </option>
            </select>
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Start Date</label>
            <input v-model="leaveForm.startDate" class="form-control" type="date" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">End Date</label>
            <input v-model="leaveForm.endDate" class="form-control" type="date" />
          </div>
          <div class="col-12">
            <label class="form-label">Reason</label>
            <textarea v-model="leaveForm.reason" class="form-control" rows="3"></textarea>
          </div>

          <div v-if="leaveValidationErrors.length" class="col-12">
            <div class="alert alert-warning mb-0 py-2">
              <div v-for="error in leaveValidationErrors" :key="error">{{ error }}</div>
            </div>
          </div>

          <div class="col-12 d-grid">
            <button class="btn btn-aurora" type="submit">Create Leave Request</button>
          </div>
        </form>
      </article>
    </div>

    <div class="col-12 col-lg-7">
      <article class="panel-card p-3 p-lg-4 h-100">
        <h3 class="section-title">Approval Queue</h3>
        <div class="d-flex flex-column gap-3">
          <div v-for="request in state.leaveRequests" :key="request.id" class="request-card">
            <div>
              <strong>{{ employeeById[request.employeeId]?.name }}</strong>
              <div class="small text-muted">{{ formatDate(request.startDate) }} to {{ formatDate(request.endDate) }}</div>
              <div class="small">{{ request.reason }}</div>
            </div>
            <div class="text-end">
              <span
                class="badge mb-2"
                :class="request.status === 'Approved' ? 'text-bg-success' : request.status === 'Denied' ? 'text-bg-danger' : 'text-bg-warning'"
              >
                {{ request.status }}
              </span>
              <div class="d-flex gap-2 justify-content-end">
                <button class="btn btn-sm btn-success" @click="updateLeaveStatus(request.id, 'Approved')">Approve</button>
                <button class="btn btn-sm btn-outline-danger" @click="updateLeaveStatus(request.id, 'Denied')">Deny</button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
