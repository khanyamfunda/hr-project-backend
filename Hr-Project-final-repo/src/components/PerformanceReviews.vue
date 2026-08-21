
<script setup>
import { computed, reactive, ref } from 'vue'
import { useHrState } from '../composables/userHrState.js'

const { state, employeeById, createReviewInBackend } = useHrState()
const actionError = ref('')
const actionMessage = ref('')

const reviewForm = reactive({
  employeeId: state.employees[0]?.id ?? 1,
  period: '',
  rating: 3,
  summary: ''
})

const reviewValidationErrors = computed(() => {
  const errors = []
  if (!Number(reviewForm.employeeId)) errors.push('Select an employee.')
  if (!reviewForm.period.trim()) errors.push('Review period is required.')
  if (!Number(reviewForm.rating) || Number(reviewForm.rating) < 1 || Number(reviewForm.rating) > 5) errors.push('Rating must be between 1 and 5.')
  if (!reviewForm.summary.trim()) errors.push('Add a short performance note.')
  return errors
})

async function addPerformanceReview() {
  if (reviewValidationErrors.value.length) return

  try {
    const review = await createReviewInBackend({
      employeeId: Number(reviewForm.employeeId),
      period: reviewForm.period.trim(),
      rating: Number(reviewForm.rating),
      summary: reviewForm.summary.trim()
    })
    state.performanceReviews.unshift(review)
    actionError.value = ''
    actionMessage.value = 'Review saved.'
  } catch (error) {
    actionMessage.value = ''
    actionError.value = error.message || 'Could not save review.'
    return
  }

  reviewForm.period = ''
  reviewForm.rating = 3
  reviewForm.summary = ''
}

function normalizeReviewRating(review) {
  const parsed = Number(review.rating)
  if (Number.isNaN(parsed)) {
    review.rating = 1
    return
  }
  review.rating = Math.min(5, Math.max(1, Math.round(parsed * 10) / 10))
}

function normalizeDraftReviewRating() {
  const parsed = Number(reviewForm.rating)
  if (Number.isNaN(parsed)) {
    reviewForm.rating = 1
    return
  }
  reviewForm.rating = Math.min(5, Math.max(1, Math.round(parsed * 10) / 10))
}
</script>

<template>
  <section class="row g-3 g-lg-4">
    <div v-if="actionError || actionMessage" class="col-12">
      <div v-if="actionError" class="alert alert-danger mb-0">{{ actionError }}</div>
      <div v-else class="alert alert-success mb-0">{{ actionMessage }}</div>
    </div>
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
            <label class="form-label">Review Period</label>
            <input v-model="reviewForm.period" class="form-control" placeholder="Q3 2026" />
          </div>
          <div class="col-12">
            <label class="form-label">Rating (1 to 5)</label>
            <input
              v-model.number="reviewForm.rating"
              class="form-control"
              type="number"
              min="1"
              max="5"
              step="0.1"
              @blur="normalizeDraftReviewRating"
            />
          </div>
          <div class="col-12">
            <label class="form-label">HR Performance Notes</label>
            <textarea v-model="reviewForm.summary" class="form-control" rows="4" placeholder="Write your assessment..."></textarea>
          </div>

          <div v-if="reviewValidationErrors.length" class="col-12">
            <div class="alert alert-warning mb-0 py-2">
              <div v-for="error in reviewValidationErrors" :key="error">{{ error }}</div>
            </div>
          </div>

          <div class="col-12 d-grid">
            <button class="btn btn-aurora" type="submit">Save Review Record</button>
          </div>
        </form>
      </article>
    </div>

    <div class="col-12 col-lg-8">
      <article class="panel-card p-3 p-lg-4">
        <h3 class="section-title">Performance Review Records</h3>
        <p class="text-muted small">HR can edit ratings and notes directly in the table below.</p>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th style="min-width: 150px">Rating</th>
                <th style="min-width: 280px">Summary</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="review in state.performanceReviews" :key="review.id">
                <td>{{ employeeById[review.employeeId]?.name }}</td>
                <td>{{ review.period }}</td>
                <td>
                  <input
                    v-model.number="review.rating"
                    class="form-control form-control-sm"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    @blur="normalizeReviewRating(review)"
                  />
                </td>
                <td>
                  <textarea v-model="review.summary" class="form-control form-control-sm" rows="2"></textarea>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  </section>
</template>
