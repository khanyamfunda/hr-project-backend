<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useHrState } from '../composables/userHrState.js'

const { state, employeeById, formatDate, formatTime, refreshAttendanceFromBackend, isBackendAuthenticated } = useHrState()

let refreshTimer

async function refreshAttendance() {
  if (!isBackendAuthenticated()) return
  try {
    await refreshAttendanceFromBackend()
  } catch {
    // Keep the last known attendance data visible if the API is temporarily unavailable.
  }
}

onMounted(() => {
  refreshAttendance()
  refreshTimer = window.setInterval(refreshAttendance, 5000)
  window.addEventListener('focus', refreshAttendance)
})

onUnmounted(() => {
  window.clearInterval(refreshTimer)
  window.removeEventListener('focus', refreshAttendance)
})

const hrAttendanceLogs = computed(() => {
  return [...state.attendanceLogs]
    .sort((a, b) => new Date(b.clockInAt) - new Date(a.clockInAt))
    .map((log) => ({
      ...log,
      employeeName: employeeById.value[log.employeeId]?.name ?? 'Unknown'
    }))
})
</script>

<template>
  <section class="row g-3 g-lg-4">
    <div class="col-12">
      <article class="panel-card p-3 p-lg-4">
        <h3 class="section-title">Attendance Tracking</h3>
        <p class="small text-muted">Clock-out events from employee dashboards sync here with remote or on-site tags.</p>

        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Present</th>
                <th>Remote</th>
                <th>Absent</th>
                <th>Leave Days</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in state.attendance" :key="record.employeeId">
                <td>{{ employeeById[record.employeeId]?.name }}</td>
                <td>{{ record.present }}</td>
                <td>{{ record.remote }}</td>
                <td>{{ record.absent }}</td>
                <td>{{ record.leaveDays }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="section-title mt-4">Clock Logs</h4>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Mode</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in hrAttendanceLogs" :key="log.id">
                <td>{{ log.employeeName }}</td>
                <td>{{ formatDate(log.workDate) }}</td>
                <td>
                  <span class="badge" :class="log.workMode === 'Remote' ? 'text-bg-info' : 'text-bg-success'">
                    {{ log.workMode }}
                  </span>
                </td>
                <td>{{ formatTime(log.clockInAt) }}</td>
                <td>{{ formatTime(log.clockOutAt) }}</td>
                  <td>{{ log.clockOutAt ? Number(log.hoursWorked ?? 0).toFixed(2) : '-' }}</td>
              </tr>
              <tr v-if="!hrAttendanceLogs.length">
                <td colspan="6" class="text-muted">No clock events yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  </section>
</template>
