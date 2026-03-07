<template>
  <div class="home-page">
    <div class="home-content">

      <!-- Left: Camera Feed -->
      <div class="camera-feed-card card">
        <div class="card-header">
          <span class="card-title">CAMERA FEED</span>
          <span class="badge live-badge">LIVE</span>
        </div>
        <div class="feed-container">
          <img v-if="feedSrc" :src="feedSrc" alt="Camera Feed" class="feed-img" />
          <div v-else class="feed-placeholder">
            <div class="placeholder-spinner"></div>
            <span>{{ feedError || 'Connecting to camera...' }}</span>
          </div>
        </div>
      </div>

      <!-- Right: Estimation Mode Selector -->
      <div class="selector-card card">
        <div class="card-header">
          <span class="card-title">ESTIMATION MODE</span>
        </div>

        <div class="selector-content">
          <div class="input-group">
            <label>Estimation Type</label>
            <div class="custom-select-wrapper">
              <select v-model="selectedEstimator" class="custom-select" id="estimator-select">
                <option value="level">Level Estimator</option>
                <option value="other" disabled>Other Estimator — Coming Soon</option>
              </select>
              <div class="select-arrow"></div>
            </div>
          </div>

          <p class="mode-description" v-if="selectedEstimator === 'level'">
            Measure liquid levels in real-time using computer vision edge detection and calibrated pixel-to-cm conversion.
          </p>

          <button class="ctrl-btn start-btn proceed-btn" @click="proceed">
            <span>PROCEED</span>
            <span class="arrow-icon">→</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useAppState } from '../composables/useAppState.js'

const router = useRouter()
const { backendUrl, selectedEstimator } = useAppState()

const feedSrc = ref(null)
const feedError = ref('')
let refreshTimer = null

const fetchFrame = async () => {
  try {
    const res = await axios.get(`${backendUrl}/capture_frame`, {
      params: { source: '0' }
    })
    if (res.data.success && res.data.image) {
      feedSrc.value = `data:image/jpeg;base64,${res.data.image}`
      feedError.value = ''
    } else {
      feedError.value = res.data.message || 'No frame available'
    }
  } catch (e) {
    feedError.value = 'Camera unavailable'
  }
}

const proceed = () => {
  router.push('/setup')
}

onMounted(() => {
  fetchFrame()
  refreshTimer = setInterval(fetchFrame, 1000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.home-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
  padding: 20px;
}

.home-content {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 24px;
  max-width: 1000px;
  width: 100%;
  align-items: start;
}

/* Camera Feed */
.camera-feed-card {
  overflow: hidden;
}

.feed-container {
  width: 100%;
  height: 380px;
  background: rgba(0, 10, 30, 0.8);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 212, 255, 0.1);
}

.feed-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.feed-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: #556;
  font-size: 14px;
}

.placeholder-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(0, 212, 255, 0.15);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.live-badge {
  padding: 3px 10px;
  background: rgba(0, 212, 255, 0.2);
  border: 1px solid #00d4ff;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  color: #00d4ff;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Selector Card */
.selector-card {
  display: flex;
  flex-direction: column;
}

.selector-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  flex: 1;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 11px;
  font-weight: 600;
  color: #667;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.custom-select-wrapper {
  position: relative;
}

.custom-select {
  width: 100%;
  padding: 12px 40px 12px 14px;
  background: rgba(0, 20, 50, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.25);
  border-radius: 10px;
  color: #e0e6ed;
  font-family: 'Rajdhani', sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  transition: all 0.3s;
}

.custom-select:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.25);
}

.custom-select option {
  background: #0f1e3c;
  color: #e0e6ed;
}

.custom-select option:disabled {
  color: #556;
}

.select-arrow {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #00d4ff;
  pointer-events: none;
}

.mode-description {
  padding: 12px 14px;
  background: rgba(0, 212, 255, 0.06);
  border: 1px solid rgba(0, 212, 255, 0.12);
  border-radius: 8px;
  font-size: 13px;
  color: #8899aa;
  line-height: 1.6;
}

.proceed-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 28px;
  font-size: 13px;
  letter-spacing: 2px;
  width: 100%;
  margin-top: auto;
}

.arrow-icon {
  font-size: 18px;
  transition: transform 0.3s;
}

.proceed-btn:hover:not(:disabled) .arrow-icon {
  transform: translateX(4px);
}

/* Responsive: stack on small screens */
@media (max-width: 768px) {
  .home-content {
    grid-template-columns: 1fr;
  }

  .feed-container {
    height: 260px;
  }
}
</style>
