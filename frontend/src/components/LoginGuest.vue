
<script setup>
import { reactive, ref } from 'vue'
import { login as apiLogin, setToken } from '../services/api.js'

const emit = defineEmits(['hr-login', 'employee-login'])

const loginForm = reactive({ username: '', password: '' })
const loginError = ref('')
const isSubmitting = ref(false)

async function login() {
  loginError.value = ''
  isSubmitting.value = true
  try {
    const result = await apiLogin(loginForm.username.trim(), loginForm.password)
    setToken(result.token)

    if (result.role === 'HR Staff' || result.role === 'Manager') {
      emit('hr-login', result.role)
    } else {
      // 'Employee' role lands on their own self-service portal
      emit('employee-login', result.employeeId, result.role)
    }
  } catch (err) {
    loginError.value = err.message || 'Login failed. Check your username and password.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="row justify-content-center g-3 g-lg-4">
    <div class="col-12 col-md-10 col-lg-6">
      <div class="panel-card p-4 p-lg-5 reveal-in">
        <span class="eyebrow">ModernTech HR Portal</span>
        <h1 class="hero-title mt-2">Modern Tech HR System</h1>
        <p class="text-muted mb-4">Sign in with your ModernTech account. HR Staff and Managers land on the command center; Employees land on their self-service portal.</p>

        <form @submit.prevent="login" class="row g-3">
          <div class="col-12">
            <label class="form-label">Username</label>
            <input v-model="loginForm.username" class="form-control" placeholder="e.g. lungile_hr" autocomplete="username" />
          </div>
          <div class="col-12">
            <label class="form-label">Password</label>
            <input v-model="loginForm.password" type="password" class="form-control" autocomplete="current-password" />
          </div>
          <div v-if="loginError" class="col-12">
            <div class="alert alert-danger mb-0 py-2">{{ loginError }}</div>
          </div>
          <div class="col-12 d-grid">
            <button type="submit" class="btn btn-aurora btn-lg" :disabled="isSubmitting">
              {{ isSubmitting ? 'Signing in…' : 'Sign In' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
