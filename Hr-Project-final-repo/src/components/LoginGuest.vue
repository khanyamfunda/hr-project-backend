
<script setup>
import { reactive, ref } from 'vue'
import { useHrState, AUTH_USER, AUTH_PASSWORD } from '../composables/userHrState.js'

const emit = defineEmits(['hr-login', 'employee-login'])

const { state, employeeById, authenticate, authenticateEmployee, hydrateFromBackend, hydrateEmployeeFromBackend } = useHrState()

const loginForm = reactive({ username: '', password: '' })
const loginError = ref('')

const employeeLoginForm = reactive({ employeeId: state.employees[0]?.id ?? 1, email: '' })
const employeeLoginError = ref('')

async function login() {
  try {
    const user = await authenticate(loginForm.username, loginForm.password)
    await hydrateFromBackend()
    loginError.value = ''
    emit('hr-login', user)
  } catch (error) {
    if (loginForm.username === AUTH_USER && loginForm.password === AUTH_PASSWORD) {
      loginError.value = ''
      emit('hr-login', { role: 'HR Staff', localOnly: true })
      return
    }
    loginError.value = error.message || 'Invalid credentials.'
  }
}

async function loginEmployee() {
  const employee = employeeById.value[Number(employeeLoginForm.employeeId)]
  if (!employee) {
    employeeLoginError.value = 'Select a valid employee profile.'
    return
  }
  if (employee.email.toLowerCase() !== employeeLoginForm.email.trim().toLowerCase()) {
    employeeLoginError.value = 'Email does not match selected employee profile.'
    return
  }
  try {
    await authenticateEmployee(employee.id, employeeLoginForm.email)
    await hydrateEmployeeFromBackend(employee.id)
    employeeLoginError.value = ''
    emit('employee-login', employee.id)
  } catch (error) {
    employeeLoginError.value = error.message || 'Employee login failed.'
  }
}
</script>

<template>
  <section class="row justify-content-center g-3 g-lg-4">
    <div class="col-12 col-md-10 col-lg-6">
      <div class="panel-card p-4 p-lg-5 reveal-in">
        <span class="eyebrow">ModernTech HR Portal</span>
        <h1 class="hero-title mt-2">Modern Tech HR System</h1>
        <p class="text-muted mb-4">Demo login for the mock authentication bonus requirement.</p>

        <form @submit.prevent="login" class="row g-3">
          <div class="col-12">
            <label class="form-label">Username</label>
            <input v-model="loginForm.username" class="form-control" placeholder="hr_admin" />
          </div>
          <div class="col-12">
            <label class="form-label">Password</label>
            <input v-model="loginForm.password" type="password" class="form-control" placeholder="MT2026!" />
          </div>
          <div v-if="loginError" class="col-12">
            <div class="alert alert-danger mb-0 py-2">{{ loginError }}</div>
          </div>
          <div class="col-12 d-grid">
            <button type="submit" class="btn btn-aurora btn-lg">Access HR Portal</button>
          </div>
        </form>
      </div>
    </div>

    <div class="col-12 col-md-10 col-lg-6">
      <div class="panel-card p-4 p-lg-5 reveal-in">
        <span class="eyebrow">ModernTech Employee Portal</span>
        <h2 class="section-title mt-2">Employee Self-Service Login</h2>
        <p class="text-muted mb-4">Employees can view their own profile, salary, start date, leave and payroll summary.</p>

        <form @submit.prevent="loginEmployee" class="row g-3">
          <div class="col-12">
            <label class="form-label">Employee</label>
            <select v-model="employeeLoginForm.employeeId" class="form-select">
              <option v-for="employee in state.employees" :key="employee.id" :value="employee.id">
                {{ employee.name }}
              </option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label">Work Email</label>
            <input v-model="employeeLoginForm.email" type="email" class="form-control" placeholder="employee@moderntech.com" />
          </div>
          <div v-if="employeeLoginError" class="col-12">
            <div class="alert alert-danger mb-0 py-2">{{ employeeLoginError }}</div>
          </div>
          <div class="col-12 d-grid">
            <button type="submit" class="btn btn-outline-dark btn-lg">Open My Dashboard</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
