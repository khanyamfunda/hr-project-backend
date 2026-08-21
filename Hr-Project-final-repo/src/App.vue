<script setup>
import { ref } from 'vue'
import { clearAuthentication } from './composables/userHrState.js'

import LoginGuest from './components/LoginGuest.vue'
import Dashboard from './components/Dashboard.vue'
import EmployeeManagement from './components/EmployeeManagement.vue'
import LeaveRequests from './components/LeaveRequests.vue'
import AttendanceTracking from './components/AttendanceTracking.vue'
import Payroll from './components/Payroll.vue'
import PerformanceReviews from './components/PerformanceReviews.vue'
import EmployeePortal from './components/EmployeePortal.vue'

const authRole = ref('guest') 
const activeTab = ref('dashboard')
const employeeSessionId = ref(null)

const HR_TABS = ['dashboard', 'employees', 'leave', 'attendance', 'payroll', 'reviews']

function handleHrLogin() {
  authRole.value = 'hr'
  activeTab.value = 'dashboard'
}

function handleEmployeeLogin(employeeId) {
  authRole.value = 'employee'
  employeeSessionId.value = employeeId
}

function logout() {
  authRole.value = 'guest'
  employeeSessionId.value = null
  clearAuthentication()
}
</script>

<template>
  <div class="page-shell">
    <div class="gradient-orb orb-one"></div>
    <div class="gradient-orb orb-two"></div>

    <main class="container py-4 py-lg-5">
      <LoginGuest v-if="authRole === 'guest'" @hr-login="handleHrLogin" @employee-login="handleEmployeeLogin" />

      <section v-else-if="authRole === 'hr'" class="reveal-in">
        <header class="panel-card p-3 p-lg-4 mb-4 d-flex flex-column flex-lg-row gap-3">
          <div>
            <span class="eyebrow">ModernTech Solutions</span>
            <h1 class="hero-title mb-1">Human Resources Command Center</h1>
            <p class="text-muted mb-0">Centralized employee records, leave workflows, payroll, and performance insights.</p>
          </div>
          <div class="ms-lg-auto d-flex align-items-start align-items-lg-center">
            <button class="btn btn-outline-dark" @click="logout">Log out</button>
          </div>
        </header>

        <nav class="panel-card mb-4 p-2 overflow-auto">
          <div class="d-flex flex-nowrap gap-2">
            <button
              v-for="tab in HR_TABS"
              :key="tab"
              class="btn text-capitalize"
              :class="activeTab === tab ? 'btn-aurora' : 'btn-outline-dark'"
              @click="activeTab = tab"
            >
              {{ tab }}
            </button>
          </div>
        </nav>

        <Dashboard v-if="activeTab === 'dashboard'" />
        <EmployeeManagement v-else-if="activeTab === 'employees'" />
        <LeaveRequests v-else-if="activeTab === 'leave'" />
        <AttendanceTracking v-else-if="activeTab === 'attendance'" />
        <Payroll v-else-if="activeTab === 'payroll'" />
        <PerformanceReviews v-else-if="activeTab === 'reviews'" />
      </section>

      <EmployeePortal v-else :employee-session-id="employeeSessionId" @logout="logout" />
    </main>
  </div>
</template>
