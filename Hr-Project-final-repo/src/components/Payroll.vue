<!--
  =========================================================================
  OWNED BY: PERSON C (Payroll Lead)
  Payroll source data + digital payslip generation.
  =========================================================================
-->
<script setup>
import { computed, ref } from 'vue'
import { useHrState } from '../composables/userHrState.js'

const { state, employeeById, payrollSourceByEmployee, generatePayslipForEmployee, downloadPayslipAsDoc, formatCurrency, formatDate } = useHrState()

const selectedPayrollEmployeeId = ref(state.employees[0]?.id ?? 1)
const selectedPayrollMonth = ref('June 2026')
const requestedEmployeeId = ref(null)

const selectedPayrollEmployee = computed(() => employeeById.value[selectedPayrollEmployeeId.value])
const requestedEmployee = computed(() => employeeById.value[requestedEmployeeId.value] ?? null)
const requestedEmployeePayslips = computed(() => {
  if (!requestedEmployeeId.value) return []
  return state.generatedPayslips
    .filter((slip) => slip.employeeId === requestedEmployeeId.value)
    .sort((a, b) => new Date(b.generatedAt ?? 0) - new Date(a.generatedAt ?? 0))
})

function generatePayslip() {
  const employee = selectedPayrollEmployee.value
  if (!employee) return
  generatePayslipForEmployee(employee.id, selectedPayrollMonth.value)
}

function requestEmployeePayslips(employeeId) {
  requestedEmployeeId.value = employeeId
}

function downloadSlipDoc(slip) {
  downloadPayslipAsDoc(slip)
}
</script>

<template>
  <section class="row g-3 g-lg-4">
    <div class="col-12 col-lg-5">
      <article class="panel-card p-3 p-lg-4 h-100">
        <h3 class="section-title">Automated Payroll</h3>
        <form @submit.prevent="generatePayslip" class="row g-3">
          <div class="col-12">
            <label class="form-label">Employee</label>
            <select v-model="selectedPayrollEmployeeId" class="form-select">
              <option v-for="employee in state.employees" :key="employee.id" :value="employee.id">
                {{ employee.name }}
              </option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label">Pay Period</label>
            <input v-model="selectedPayrollMonth" class="form-control" />
          </div>
          <div class="col-12 d-grid">
            <button class="btn btn-aurora" type="submit">Generate Digital Payslip</button>
          </div>
        </form>
      </article>
    </div>

    <div class="col-12 col-lg-7">
      <article class="panel-card p-3 p-lg-4 h-100">
        <h3 class="section-title">Payroll Source Data</h3>
        <div class="table-responsive mb-3">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Hours Worked</th>
                <th>Leave Deductions</th>
                <th>Final Salary</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in state.payrollSource" :key="entry.employeeId">
                <td>{{ employeeById[entry.employeeId]?.name }}</td>
                <td>{{ entry.hoursWorked }}</td>
                <td>{{ entry.leaveDeductions }}</td>
                <td>{{ formatCurrency(entry.finalSalary) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="section-title">Generated Payslips</h3>
        <p class="small text-muted mb-2">Click an employee name to request and view only that employee's slips.</p>
        <div class="table-responsive mb-3">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="employee in state.employees" :key="employee.id">
                <td>
                  <button class="btn btn-link p-0 text-decoration-none" type="button" @click="requestEmployeePayslips(employee.id)">
                    {{ employee.name }}
                  </button>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-dark" type="button" @click="requestEmployeePayslips(employee.id)">View Slips</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="requestedEmployee" class="small mb-2">
          Showing slips for <strong>{{ requestedEmployee.name }}</strong>
        </div>

        <div class="d-flex flex-column gap-2" v-if="requestedEmployeeId">
          <div v-for="slip in requestedEmployeePayslips" :key="slip.id" class="payslip-card">
            <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div>
                <strong>{{ employeeById[slip.employeeId]?.name }}</strong>
                <div class="small text-muted">{{ slip.month }}</div>
                <div class="small text-muted">{{ slip.slipNumber ?? `MT-${String(slip.id).slice(-8)}` }} | Generated {{ formatDate(slip.generatedAt ?? new Date()) }}</div>
                <div class="small">Base: {{ formatCurrency(slip.baseMonthly) }} | Overtime: {{ formatCurrency(slip.overtimePay) }}</div>
                <div class="small">Gross: {{ formatCurrency(slip.grossPay ?? (slip.baseMonthly + slip.overtimePay)) }} | Hours: {{ slip.hoursWorked ?? 0 }}</div>
                <div class="small">Tax: {{ formatCurrency(slip.taxDeduction) }} | Pension: {{ formatCurrency(slip.pensionDeduction) }}</div>
                <div class="small">Leave Deduction: {{ formatCurrency(slip.leaveDeductionAmount ?? 0) }}</div>
              </div>
              <div class="text-end d-flex flex-column align-items-end gap-2">
                <div class="small text-muted">Net Pay</div>
                <div class="fw-bold fs-5">{{ formatCurrency(slip.netPay) }}</div>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-outline-secondary" type="button" @click="downloadSlipDoc(slip)">Download Document</button>
                </div>
              </div>
            </div>
          </div>
          <p v-if="!requestedEmployeePayslips.length" class="text-muted mb-0">No payslips found for this employee.</p>
        </div>
        <p v-else class="text-muted mb-0">Select an employee to request payslips.</p>
      </article>
    </div>
  </section>
</template>
