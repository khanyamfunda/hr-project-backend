<script setup>
import { computed, reactive, ref } from 'vue'
import { useHrState } from '../composables/userHrState.js'

const { state, formatDate, formatCurrency, createEmployeeInBackend, updateEmployeeInBackend, deleteEmployeeFromBackend } = useHrState()
const actionError = ref('')
const actionMessage = ref('')

const employeeForm = reactive({
  name: '',
  email: '',
  department: '',
  role: '',
  salary: '',
  startDate: ''
})

const selectedEmployeeId = ref(null)

const employeeEditForm = reactive({
  name: '',
  email: '',
  department: '',
  role: '',
  salary: '',
  startDate: '',
  history: ''
})

const employeeValidationErrors = computed(() => {
  const errors = []
  if (!employeeForm.name.trim()) errors.push('Employee name is required.')
  if (!/^\S+@\S+\.\S+$/.test(employeeForm.email.trim())) errors.push('A valid work email is required.')
  if (!employeeForm.department.trim()) errors.push('Department is required.')
  if (!employeeForm.role.trim()) errors.push('Role is required.')
  if (!Number(employeeForm.salary) || Number(employeeForm.salary) < 120000) errors.push('Salary must be at least R120,000.')
  if (!employeeForm.startDate) errors.push('Start date is required.')
  return errors
})

const employeeEditValidationErrors = computed(() => {
  const errors = []
  if (!employeeEditForm.name.trim()) errors.push('Employee name is required.')
  if (!/^\S+@\S+\.\S+$/.test(employeeEditForm.email.trim())) errors.push('A valid work email is required.')
  if (!employeeEditForm.department.trim()) errors.push('Department is required.')
  if (!employeeEditForm.role.trim()) errors.push('Role is required.')
  if (!Number(employeeEditForm.salary) || Number(employeeEditForm.salary) < 120000) errors.push('Salary must be at least R120,000.')
  if (!employeeEditForm.startDate) errors.push('Start date is required.')
  return errors
})

const selectedEmployeeRecord = computed(() => {
  if (!selectedEmployeeId.value) return null
  return state.employees.find((employee) => employee.id === selectedEmployeeId.value) ?? null
})

async function addEmployee() {
  if (employeeValidationErrors.value.length) return

  try {
    const nameParts = employeeForm.name.trim().split(/\s+/)
    const createdEmployee = await createEmployeeInBackend({
      firstName: nameParts.shift(),
      lastName: nameParts.join(' ') || 'Employee',
      email: employeeForm.email.trim(),
      department: employeeForm.department.trim(),
      role: employeeForm.role.trim(),
      salary: Number(employeeForm.salary),
      startDate: employeeForm.startDate,
      history: 'Added through HR portal.'
    })
    state.employees.push(createdEmployee)
    state.payrollSource.push({ employeeId: createdEmployee.id, hoursWorked: 0, leaveDeductions: 0, finalSalary: createdEmployee.salary / 12 })
    actionError.value = ''
    actionMessage.value = `Employee added. Estimated monthly payment: ${formatCurrency(createdEmployee.salary / 12)}`

    employeeForm.name = ''
    employeeForm.email = ''
    employeeForm.department = ''
    employeeForm.role = ''
    employeeForm.salary = ''
    employeeForm.startDate = ''
  } catch (error) {
    actionMessage.value = ''
    actionError.value = error.message || 'Could not save employee.'
  }
}

function selectEmployeeForEdit(employeeId) {
  const employee = state.employees.find((item) => item.id === employeeId)
  if (!employee) return

  selectedEmployeeId.value = employee.id
  employeeEditForm.name = employee.name
  employeeEditForm.email = employee.email
  employeeEditForm.department = employee.department
  employeeEditForm.role = employee.role
  employeeEditForm.salary = employee.salary
  employeeEditForm.startDate = employee.startDate
  employeeEditForm.history = employee.history
}

async function updateSelectedEmployee() {
  if (!selectedEmployeeRecord.value || employeeEditValidationErrors.value.length) return

  try {
    const nameParts = employeeEditForm.name.trim().split(/\s+/)
    const updatedEmployee = await updateEmployeeInBackend(selectedEmployeeRecord.value.id, {
      firstName: nameParts.shift(),
      lastName: nameParts.join(' ') || 'Employee',
      email: employeeEditForm.email.trim(),
      department: employeeEditForm.department.trim(),
      role: employeeEditForm.role.trim(),
      salary: Number(employeeEditForm.salary),
      startDate: employeeEditForm.startDate,
      history: employeeEditForm.history.trim() || 'Updated through HR portal.'
    })

    Object.assign(selectedEmployeeRecord.value, updatedEmployee)
    const payrollRecord = state.payrollSource.find((entry) => entry.employeeId === selectedEmployeeRecord.value.id)
    if (payrollRecord) payrollRecord.finalSalary = Number(employeeEditForm.salary) / 12
    actionError.value = ''
    actionMessage.value = 'Employee and monthly payment estimate updated.'
  } catch (error) {
    actionMessage.value = ''
    actionError.value = error.message || 'Could not update employee.'
  }
}

async function removeSelectedEmployee() {
  if (!selectedEmployeeRecord.value) return
  const targetId = selectedEmployeeRecord.value.id

  try {
    await deleteEmployeeFromBackend(targetId)
  } catch (error) {
    actionMessage.value = ''
    actionError.value = error.message || 'Could not delete employee.'
    return
  }
  state.employees = state.employees.filter((employee) => employee.id !== targetId)
  state.attendance = state.attendance.filter((record) => record.employeeId !== targetId)
  state.leaveRequests = state.leaveRequests.filter((request) => request.employeeId !== targetId)
  state.payrollSource = state.payrollSource.filter((entry) => entry.employeeId !== targetId)
  state.generatedPayslips = state.generatedPayslips.filter((slip) => slip.employeeId !== targetId)
  state.performanceReviews = state.performanceReviews.filter((review) => review.employeeId !== targetId)

  selectedEmployeeId.value = null
  employeeEditForm.name = ''
  employeeEditForm.email = ''
  employeeEditForm.department = ''
  employeeEditForm.role = ''
  employeeEditForm.salary = ''
  employeeEditForm.startDate = ''
  employeeEditForm.history = ''
  actionError.value = ''
  actionMessage.value = 'Employee deleted.'
}
</script>

<template>
  <section class="row g-3 g-lg-4">
    <div class="col-12 col-lg-4">
      <article class="panel-card p-3 p-lg-4 h-100">
        <h3 class="section-title">Add Employee</h3>
        <form @submit.prevent="addEmployee" class="row g-3">
          <div class="col-12">
            <label class="form-label">Full Name</label>
            <input v-model="employeeForm.name" class="form-control" placeholder="Jane Doe" />
          </div>
          <div class="col-12">
            <label class="form-label">Work Email</label>
            <input v-model="employeeForm.email" type="email" class="form-control" placeholder="jane.doe@moderntech.com" />
          </div>
          <div class="col-12">
            <label class="form-label">Department</label>
            <input v-model="employeeForm.department" class="form-control" placeholder="Development" />
          </div>
          <div class="col-12">
            <label class="form-label">Role</label>
            <input v-model="employeeForm.role" class="form-control" placeholder="Software Engineer" />
          </div>
          <div class="col-12">
            <label class="form-label">Annual Salary (ZAR)</label>
            <input v-model.number="employeeForm.salary" type="number" class="form-control" placeholder="480000" />
          </div>
          <div class="col-12">
            <label class="form-label">Start Date</label>
            <input v-model="employeeForm.startDate" type="date" class="form-control" />
          </div>

          <div v-if="employeeValidationErrors.length" class="col-12">
            <div class="alert alert-warning mb-0 py-2">
              <div v-for="error in employeeValidationErrors" :key="error">{{ error }}</div>
            </div>
          </div>

          <div class="col-12 d-grid">
            <button class="btn btn-aurora" type="submit">Add Employee</button>
          </div>
        </form>
      </article>
    </div>

    <div v-if="actionError || actionMessage" class="col-12">
      <div v-if="actionError" class="alert alert-danger mb-0">{{ actionError }}</div>
      <div v-else class="alert alert-success mb-0">{{ actionMessage }}</div>
    </div>

    <div class="col-12 col-lg-8">
      <article class="panel-card p-3 p-lg-4">
        <h3 class="section-title">Employee Directory</h3>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Role</th>
                <th>Start Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="employee in state.employees" :key="employee.id">
                <td>{{ employee.name }}</td>
                <td>{{ employee.department }}</td>
                <td>{{ employee.role }}</td>
                <td>{{ formatDate(employee.startDate) }}</td>
                <td>
                  <button class="btn btn-sm btn-outline-dark" @click="selectEmployeeForEdit(employee.id)">
                    Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article v-if="selectedEmployeeRecord" class="panel-card p-3 p-lg-4 mt-3">
        <h3 class="section-title">Edit: {{ selectedEmployeeRecord.name }}</h3>
        <form @submit.prevent="updateSelectedEmployee" class="row g-3">
          <div class="col-12 col-md-6">
            <label class="form-label">Full Name</label>
            <input v-model="employeeEditForm.name" class="form-control" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Work Email</label>
            <input v-model="employeeEditForm.email" type="email" class="form-control" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Department</label>
            <input v-model="employeeEditForm.department" class="form-control" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Role</label>
            <input v-model="employeeEditForm.role" class="form-control" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Annual Salary (ZAR)</label>
            <input v-model.number="employeeEditForm.salary" type="number" class="form-control" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Start Date</label>
            <input v-model="employeeEditForm.startDate" type="date" class="form-control" />
          </div>
          <div class="col-12">
            <label class="form-label">Employment History</label>
            <textarea v-model="employeeEditForm.history" class="form-control" rows="2"></textarea>
          </div>

          <div v-if="employeeEditValidationErrors.length" class="col-12">
            <div class="alert alert-warning mb-0 py-2">
              <div v-for="error in employeeEditValidationErrors" :key="error">{{ error }}</div>
            </div>
          </div>

          <div class="col-12 d-flex gap-2">
            <button class="btn btn-aurora" type="submit">Save Changes</button>
            <button class="btn btn-outline-danger" type="button" @click="removeSelectedEmployee">Remove Employee</button>
          </div>
        </form>
      </article>
    </div>
  </section>
</template>
