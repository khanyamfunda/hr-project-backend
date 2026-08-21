
<script setup>
import { computed, reactive, ref } from 'vue'
import { useHrState } from '../composables/userHrState.js'

const { state, employeeById, submitReviewToBackend } = useHrState()

const reviewForm = reactive({
  employeeId: state.employees[0]?.id ?? 1,
  reviewDate: new Date().toISOString().slice(0, 10),
  score: 3,
  feedback: ''
})
const submitError = ref('')
const isSubmitting = ref(false)

const reviewValidationErrors = computed(() => {
  const errors = []
  if (!Number(reviewForm.employeeId)) errors.push('Select an employee.')
  if (!reviewForm.reviewDate) errors.push('Review date is required.')
  if (!Number(reviewForm.score) || Number(reviewForm.score) < 1 || Number(reviewForm.score) > 5) errors.push('Score must be between 1 and 5.')
  if (!reviewForm.feedback.trim()) errors.push('Add feedback notes.')
  return errors
})

async function addPerformanceReview() {
  if (reviewValidationErrors.value.length) return
  submitError.value = ''
  isSubmitting.value = true
  try {
    await submitReviewToBackend({
      employeeId: Number(reviewForm.employeeId),
      reviewDate: reviewForm.reviewDate,
      score: Number(reviewForm.score),
      feedback: reviewForm.feedback.trim()
    })
    reviewForm.feedback = ''
    reviewForm.score = 3
  } catch (err) {
    submitError.value = err.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="row g-3 g-lg-4">
    <div class="col-12 col-lg-4">
      <article class="panel-card p-3 p-lg-4 h-100">
        <h3 class="section-title">Add Review</h3>
        <form @submit.prevent="addPerformanceReview" class="row g-3">
          <div class="col-12">
            <label class="form-label">Employee</label>
            <select v-model="reviewForm.employeeId" class="form-select">
              <option v-for="employee in state.employees" :key="employee.id" :value="employee.id">
                {{ employee.name }}
              </option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label">Review Date</label>
            <input v-model="reviewForm.reviewDate" type="date" class="form-control" />
          </div>
          <div class="col-12">
            <label class="form-label">Score (1 to 5)</label>
            <select v-model.number="reviewForm.score" class="form-select">
              <option v-for="n in [1, 2, 3, 4, 5]" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label">Feedback Notes</label>
            <textarea v-model="reviewForm.feedback" class="form-control" rows="4" placeholder="Write your assessment..."></textarea>
          </div>

          <div v-if="reviewValidationErrors.length" class="col-12">
            <div class="alert alert-warning mb-0 py-2">
              <div v-for="error in reviewValidationErrors" :key="error">{{ error }}</div>
            </div>
          </div>
          <div v-if="submitError" class="col-12">
            <div class="alert alert-danger mb-0 py-2">{{ submitError }}</div>
          </div>

          <div class="col-12 d-grid">
            <button class="btn btn-aurora" type="submit" :disabled="isSubmitting">
              {{ isSubmitting ? 'Saving…' : 'Save Review Record' }}
            </button>
          </div>
        </form>
      </article>
    </div>

    <div class="col-12 col-lg-8">
      <article class="panel-card p-3 p-lg-4">
        <h3 class="section-title">Performance Review Records</h3>
        <p class="text-muted small">All submitted reviews, most recent first.</p>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th style="min-width: 100px">Score</th>
                <th style="min-width: 280px">Feedback</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="review in state.performanceReviews" :key="review.id">
                <td>{{ employeeById[review.employeeId]?.name }}</td>
                <td>{{ review.period }}</td>
                <td>{{ review.rating }} / 5</td>
                <td>{{ review.summary }}</td>
              </tr>
              <tr v-if="!state.performanceReviews.length">
                <td colspan="4" class="text-muted">No performance reviews yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  </section>
</template>
