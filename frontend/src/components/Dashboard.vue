<script setup>
import { computed } from 'vue'
import { useHrState } from '../composables/userHrState.js'

const { state, employeeById, formatCurrency } = useHrState()

const dashboardStats = computed(() => {
  const pendingRequests = state.leaveRequests.filter((request) => request.status === 'Pending').length
  const annualPayroll = state.employees.reduce((sum, employee) => sum + employee.salary, 0)
  const averageRating =
    state.performanceReviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) /
    state.performanceReviews.length

  return {
    employees: state.employees.length,
    pendingRequests,
    monthlyPayroll: annualPayroll / 12,
    averageRating
  }
})

const attendanceChartData = computed(() => {
  return state.attendance.map((record) => {
    const totalTrackedDays = record.present + record.remote + record.absent + record.leaveDays
    const attendanceScore = ((record.present + record.remote) / totalTrackedDays) * 100
    return {
      ...record,
      name: employeeById.value[record.employeeId]?.name ?? 'Unknown',
      attendanceScore
    }
  })
})
</script>

<template>
  <section class="row g-3 g-lg-4">
    <div class="col-6 col-lg-3">
      <article class="metric-card">
        <h2>{{ dashboardStats.employees }}</h2>
        <p>Total employees</p>
      </article>
    </div>
    <div class="col-6 col-lg-3">
      <article class="metric-card">
        <h2>{{ dashboardStats.pendingRequests }}</h2>
        <p>Pending leave requests</p>
      </article>
    </div>
    <div class="col-6 col-lg-3">
      <article class="metric-card">
        <h2>{{ formatCurrency(dashboardStats.monthlyPayroll) }}</h2>
        <p>Estimated monthly payroll</p>
      </article>
    </div>
    <div class="col-6 col-lg-3">
      <article class="metric-card">
        <h2>{{ dashboardStats.averageRating.toFixed(1) }}</h2>
        <p>Average performance rating</p>
      </article>
    </div>

    <div class="col-12">
      <article class="panel-card p-3 p-lg-4">
        <h3 class="section-title">Attendance Compliance (Dummy Chart)</h3>
        <p class="text-muted small mb-4">Bonus feature: client-side data visualization based on attendance records.</p>

        <div class="d-flex flex-column gap-3">
          <div v-for="item in attendanceChartData" :key="item.employeeId">
            <div class="d-flex justify-content-between small mb-1">
              <strong>{{ item.name }}</strong>
              <span>{{ item.attendanceScore.toFixed(0) }}%</span>
            </div>
            <div class="chart-track">
              <div class="chart-fill" :style="{ width: `${item.attendanceScore}%` }"></div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
