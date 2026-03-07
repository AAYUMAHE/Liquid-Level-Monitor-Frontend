<template>
  <div class="setup-page">
    <main class="setup-grid">

      <!-- Left: Source + Preview -->
      <div class="left-column">

        <div class="card video-card">
          <div class="card-header">
            <span class="card-title">VIDEO SOURCE</span>
            <span class="badge setup-badge">SETUP</span>
          </div>

          <div class="upload-content">
            <div class="source-tabs">
              <button class="tab-btn" :class="{ active: sourceMode === 'camera' }" @click="sourceMode = 'camera'">
                <span class="tab-icon camera-icon"></span> Camera
              </button>
              <button class="tab-btn" :class="{ active: sourceMode === 'video' }" @click="sourceMode = 'video'">
                <span class="tab-icon video-icon"></span> Video File
              </button>
            </div>

            <div v-if="sourceMode === 'video'" class="file-upload">
              <input type="file" ref="fileInput" @change="handleFileSelect" accept=".mp4,.avi,.mov,.mkv" hidden />
              <button class="upload-btn" @click="$refs.fileInput.click()">
                <span class="upload-icon"></span> {{ uploadedFile ? uploadedFile.name : 'Select Video File' }}
              </button>
              <button v-if="uploadedFile" class="action-btn upload-action" @click="uploadVideo" :disabled="isUploading">
                {{ isUploading ? 'Uploading...' : 'Upload' }}
              </button>
            </div>
            <div v-if="uploadMessage" class="upload-message" :class="uploadMessageType">{{ uploadMessage }}</div>

            <div class="roi-section mt-4">
              <button class="roi-select-btn" @click="openRoiSelector">
                <span class="roi-icon"></span> {{ hasRoi ? 'Change ROI' : 'Select ROI' }}
              </button>
              <div v-if="hasRoi" class="roi-status mt-2">
                ROI: ({{ currentRoi.x1 }}, {{ currentRoi.y1 }}) to ({{ currentRoi.x2 }}, {{ currentRoi.y2 }})
              </div>
              <div v-else class="roi-status roi-warning mt-2">
                No ROI set - full frame will be processed
              </div>
            </div>
          </div>

          <div class="video-container">
            <div class="setup-preview">
              <img v-if="roiFrameData" :src="`data:image/jpeg;base64,${roiFrameData}`" alt="Setup Preview" class="live-feed-img" />
              <div v-else class="video-placeholder">
                <div class="placeholder-icon"></div>
                <span>Preview Area</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Right: Configuration -->
      <div class="right-column">

        <div class="card controls-card">
          <div class="card-header">
            <span class="card-title">CONFIGURATION</span>
          </div>

          <div class="controls-content">

            <div class="input-group">
              <label>Calibration (px/cm)</label>
              <input type="number" v-model="calibration" step="0.1" min="0.1" />
            </div>

            <div class="input-group">
              <label>Target FPS</label>
              <input type="number" v-model="targetFps" step="1" min="1" max="120" />
            </div>

            <div class="input-group">
              <label>Alert Threshold (cm)</label>
              <div class="threshold-inputs">
                <input type="number" v-model="thresholdHigh" placeholder="High" step="0.5" />
                <input type="number" v-model="thresholdLow" placeholder="Low" step="0.5" />
              </div>
            </div>

            <div class="input-group">
              <label>Auto Light Adjust</label>
              <div class="lighting-controls">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="autoLightingEnabled" @change="onAutoLightingChange" />
                  <span class="toggle-slider"></span>
                </label>
                <div class="clip-limit-input" v-if="autoLightingEnabled">
                  <label>Clip Limit</label>
                  <input type="number" v-model="claheClipLimit" step="0.5" min="0.5" max="10" @change="onAutoLightingChange" />
                </div>
              </div>
            </div>

            <div class="control-buttons mt-4">
              <button class="ctrl-btn back-btn" @click="goBack">
                <span class="arrow-icon">←</span> BACK
              </button>
              <button class="ctrl-btn start-btn" @click="handleStart" :disabled="isCheckingCamera">
                <span class="btn-icon start-icon"></span> {{ isCheckingCamera ? 'CHECKING...' : 'START SYSTEM' }}
              </button>
            </div>

            <div v-if="cameraError" class="camera-error mt-4">
              <span class="error-icon"></span> {{ cameraError }}
            </div>
          </div>
        </div>

      </div>

    </main>

    <!-- ROI Modal -->
    <div v-if="showRoiModal" class="roi-modal-overlay" @click.self="cancelRoiSelection">
      <div class="roi-modal">
        <div class="roi-modal-header">
          <span class="roi-modal-title">SELECT REGION OF INTEREST</span>
          <button class="roi-close-btn" @click="cancelRoiSelection">&times;</button>
        </div>
        <div class="roi-modal-body">
          <p class="roi-instructions">
            Click two points on the image to define the ROI rectangle.
            <br>Point 1: {{ roiPoints.length > 0 ? `(${roiPoints[0].x}, ${roiPoints[0].y})` : 'Not set' }}
            <br>Point 2: {{ roiPoints.length > 1 ? `(${roiPoints[1].x}, ${roiPoints[1].y})` : 'Not set' }}
          </p>
          <div class="roi-canvas-container" v-if="roiFrameLoaded">
            <canvas ref="roiCanvas" @click="handleRoiClick" class="roi-canvas"></canvas>
          </div>
          <div v-else class="roi-loading">
            {{ roiError || 'Loading frame...' }}
          </div>
        </div>
        <div class="roi-modal-footer">
          <button class="roi-btn roi-btn-secondary" @click="resetRoiPoints">Reset Points</button>
          <button class="roi-btn roi-btn-secondary" @click="clearRoi">Clear ROI</button>
          <button class="roi-btn roi-btn-primary" @click="confirmRoi" :disabled="roiPoints.length < 2">Confirm ROI</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useAppState } from '../composables/useAppState.js'

const router = useRouter()
const {
  backendUrl,
  sourceMode, calibration, targetFps,
  thresholdHigh, thresholdLow,
  uploadedFile, uploadedFilePath, isUploading, uploadMessage, uploadMessageType,
  cameraError, isCheckingCamera,
  autoLightingEnabled, claheClipLimit,
  hasRoi, currentRoi, roiFrameData,
  handleFileSelect, uploadVideo,
  startSystem, onAutoLightingChange, loadAutoLightingSettings, loadCurrentRoi,
} = useAppState()

// ROI local state
const showRoiModal = ref(false)
const roiFrameLoaded = ref(false)
const roiFrameWidth = ref(0)
const roiFrameHeight = ref(0)
const roiPoints = ref([])
const roiError = ref('')
const roiCanvas = ref(null)
let roiCtx = null

// Navigation
const goBack = () => {
  router.push('/')
}

const handleStart = async () => {
  const success = await startSystem()
  if (success) {
    router.push('/monitor')
  }
}

// ============================================
// ROI FUNCTIONS (moved from App.vue)
// ============================================
const openRoiSelector = async () => {
  roiError.value = ''
  roiFrameLoaded.value = false
  roiPoints.value = []
  showRoiModal.value = true
  try {
    const source = sourceMode.value === 'camera' ? '0' : (uploadedFilePath.value || '0')
    const res = await axios.get(`${backendUrl}/capture_frame`, { params: { source } })
    if (!res.data.success) {
      roiError.value = res.data.message || 'Failed to capture frame'
      return
    }
    roiFrameData.value = res.data.image
    roiFrameWidth.value = res.data.width
    roiFrameHeight.value = res.data.height
    roiFrameLoaded.value = true
    setTimeout(() => { drawRoiFrame() }, 50)
  } catch (e) {
    roiError.value = 'Failed to capture frame: ' + (e.response?.data?.message || e.message)
  }
}

const drawRoiFrame = () => {
  const canvas = roiCanvas.value
  if (!canvas || !roiFrameData.value) return
  const maxWidth = 500
  const maxHeight = 320
  let displayWidth = roiFrameWidth.value
  let displayHeight = roiFrameHeight.value
  if (displayWidth > maxWidth) {
    const scale = maxWidth / displayWidth
    displayWidth = maxWidth
    displayHeight = Math.round(displayHeight * scale)
  }
  if (displayHeight > maxHeight) {
    const scale = maxHeight / displayHeight
    displayHeight = maxHeight
    displayWidth = Math.round(displayWidth * scale)
  }
  canvas.width = displayWidth
  canvas.height = displayHeight
  roiCtx = canvas.getContext('2d')
  const img = new Image()
  img.onload = () => {
    roiCtx.drawImage(img, 0, 0, displayWidth, displayHeight)
    drawRoiPoints()
  }
  img.src = `data:image/jpeg;base64,${roiFrameData.value}`
}

const drawRoiPoints = () => {
  if (!roiCtx || !roiFrameData.value) return
  const canvas = roiCanvas.value
  const img = new Image()
  img.onload = () => {
    roiCtx.drawImage(img, 0, 0, canvas.width, canvas.height)
    roiCtx.fillStyle = '#00ff00'
    roiCtx.strokeStyle = '#00ff00'
    roiCtx.lineWidth = 2
    roiPoints.value.forEach((pt, idx) => {
      const x = (pt.x / roiFrameWidth.value) * canvas.width
      const y = (pt.y / roiFrameHeight.value) * canvas.height
      roiCtx.beginPath()
      roiCtx.arc(x, y, 6, 0, Math.PI * 2)
      roiCtx.fill()
      roiCtx.fillStyle = '#ffffff'
      roiCtx.font = '12px Arial'
      roiCtx.fillText(`P${idx + 1}`, x + 10, y - 5)
      roiCtx.fillStyle = '#00ff00'
    })
    if (roiPoints.value.length === 2) {
      const p1 = roiPoints.value[0]
      const p2 = roiPoints.value[1]
      const x1 = (Math.min(p1.x, p2.x) / roiFrameWidth.value) * canvas.width
      const y1 = (Math.min(p1.y, p2.y) / roiFrameHeight.value) * canvas.height
      const x2 = (Math.max(p1.x, p2.x) / roiFrameWidth.value) * canvas.width
      const y2 = (Math.max(p1.y, p2.y) / roiFrameHeight.value) * canvas.height
      roiCtx.strokeStyle = '#00ff00'
      roiCtx.lineWidth = 2
      roiCtx.setLineDash([5, 5])
      roiCtx.strokeRect(x1, y1, x2 - x1, y2 - y1)
      roiCtx.setLineDash([])
      roiCtx.fillStyle = 'rgba(0, 255, 0, 0.1)'
      roiCtx.fillRect(x1, y1, x2 - x1, y2 - y1)
    }
  }
  img.src = `data:image/jpeg;base64,${roiFrameData.value}`
}

const handleRoiClick = (event) => {
  if (roiPoints.value.length >= 2) return
  const canvas = roiCanvas.value
  const rect = canvas.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const clickY = event.clientY - rect.top
  const x = Math.round((clickX / canvas.width) * roiFrameWidth.value)
  const y = Math.round((clickY / canvas.height) * roiFrameHeight.value)
  roiPoints.value.push({ x, y })
  drawRoiPoints()
}

const resetRoiPoints = () => {
  roiPoints.value = []
  drawRoiFrame()
}

const cancelRoiSelection = () => {
  showRoiModal.value = false
  roiPoints.value = []
  roiFrameLoaded.value = false
}

const confirmRoi = async () => {
  if (roiPoints.value.length < 2) return
  const p1 = roiPoints.value[0]
  const p2 = roiPoints.value[1]
  const x1 = Math.min(p1.x, p2.x)
  const y1 = Math.min(p1.y, p2.y)
  const x2 = Math.max(p1.x, p2.x)
  const y2 = Math.max(p1.y, p2.y)
  try {
    await axios.post(`${backendUrl}/set_roi`, null, { params: { x1, y1, x2, y2 } })
    currentRoi.value = { x1, y1, x2, y2 }
    hasRoi.value = true
    showRoiModal.value = false
  } catch (e) {
    roiError.value = 'Failed to set ROI: ' + (e.response?.data?.message || e.message)
  }
}

const clearRoi = async () => {
  try {
    await axios.post(`${backendUrl}/clear_roi`)
    hasRoi.value = false
    currentRoi.value = { x1: 0, y1: 0, x2: 0, y2: 0 }
    roiPoints.value = []
    if (roiFrameLoaded.value) drawRoiFrame()
  } catch (e) {
    console.error('Failed to clear ROI:', e)
  }
}

// Load settings on mount
onMounted(() => {
  loadCurrentRoi()
  loadAutoLightingSettings()
})
</script>

<style scoped>
.setup-page {
  padding: 0 20px 20px;
}

.setup-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 20px;
}

/* ========== VIDEO PANEL ========== */
.video-container {
  width: 100%;
  height: 220px;
  background: rgba(0, 10, 30, 0.8);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 212, 255, 0.1);
  margin-top: 15px;
}

.setup-preview {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.video-container img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #445;
}

.placeholder-icon {
  width: 50px;
  height: 50px;
  border: 2px dashed #334;
  border-radius: 10px;
}

/* ========== UPLOAD / SOURCE TABS ========== */
.source-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  background: rgba(0, 20, 50, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 8px;
  color: #88a;
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tab-btn.active {
  background: rgba(0, 212, 255, 0.15);
  border-color: #00d4ff;
  color: #00d4ff;
}

.tab-btn:hover { border-color: #00d4ff; }

.tab-icon {
  width: 16px;
  height: 16px;
  background: currentColor;
  mask-size: contain;
}

.file-upload {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-btn {
  padding: 12px;
  background: rgba(0, 20, 50, 0.5);
  border: 1px dashed rgba(0, 212, 255, 0.3);
  border-radius: 8px;
  color: #88a;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.upload-btn:hover { border-color: #00d4ff; color: #00d4ff; }

.action-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #00d4ff, #0080ff);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(0, 212, 255, 0.4); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.upload-message {
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
  text-align: center;
}

.upload-message.success {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  color: #00ff88;
}

.upload-message.error {
  background: rgba(255, 68, 102, 0.1);
  border: 1px solid rgba(255, 68, 102, 0.3);
  color: #ff4466;
}

/* ========== ROI ========== */
.roi-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(0, 212, 255, 0.1);
}

.roi-select-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #9933ff, #6600cc);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.roi-select-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(153, 51, 255, 0.4); }

.roi-icon {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-radius: 2px;
}

.roi-status {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 6px;
  font-size: 11px;
  color: #00ff88;
  text-align: center;
}

.roi-status.roi-warning {
  background: rgba(255, 170, 0, 0.1);
  border-color: rgba(255, 170, 0, 0.3);
  color: #ffaa00;
}

/* ========== CONTROLS ========== */
.controls-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
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

.input-group input {
  padding: 10px 12px;
  background: rgba(0, 20, 50, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  transition: all 0.3s;
}

.input-group input:focus { outline: none; border-color: #00d4ff; box-shadow: 0 0 10px rgba(0, 212, 255, 0.2); }

.threshold-inputs {
  display: flex;
  gap: 10px;
}

.threshold-inputs input { flex: 1; }

/* ========== LIGHTING CONTROLS ========== */
.lighting-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  flex-shrink: 0;
}

.toggle-switch input { opacity: 0; width: 0; height: 0; }

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(100, 100, 120, 0.4);
  border: 1px solid rgba(100, 100, 120, 0.6);
  border-radius: 26px;
  transition: all 0.3s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: #667;
  border-radius: 50%;
  transition: all 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background: rgba(0, 212, 255, 0.3);
  border-color: #00d4ff;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(24px);
  background: #00d4ff;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.clip-limit-input {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.clip-limit-input label {
  font-size: 10px;
  color: #667;
  white-space: nowrap;
}

.clip-limit-input input {
  width: 70px;
  padding: 6px 8px;
  background: rgba(0, 20, 50, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 12px;
}

.clip-limit-input input:focus { outline: none; border-color: #00d4ff; }

/* ========== BUTTONS ========== */
.control-buttons {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
}

.ctrl-btn {
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-family: 'Orbitron', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.ctrl-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.back-btn {
  background: rgba(100, 100, 120, 0.3);
  border: 1px solid rgba(100, 100, 120, 0.5);
  color: #aab;
}

.back-btn:hover:not(:disabled) { background: rgba(100, 100, 120, 0.5); }

.start-btn {
  background: linear-gradient(135deg, #00ff88, #00cc66);
  color: #000;
}

.start-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(0, 255, 136, 0.4); }

.btn-icon { width: 14px; height: 14px; background: currentColor; }

.arrow-icon { font-size: 16px; }

/* ========== CAMERA ERROR ========== */
.camera-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  background: rgba(255, 68, 102, 0.15);
  border: 1px solid rgba(255, 68, 102, 0.4);
  border-radius: 8px;
  color: #ff6b7a;
  font-size: 13px;
  font-weight: 600;
  animation: errorFadeIn 0.3s ease-out;
}

.camera-error .error-icon {
  width: 20px;
  height: 20px;
  background: #ff4466;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
}

.camera-error .error-icon::before,
.camera-error .error-icon::after {
  content: '';
  position: absolute;
  background: white;
  top: 50%;
  left: 50%;
}

.camera-error .error-icon::before { width: 2px; height: 8px; transform: translate(-50%, -70%); }
.camera-error .error-icon::after { width: 2px; height: 2px; border-radius: 50%; transform: translate(-50%, 100%); }

@keyframes errorFadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ========== BADGES ========== */
.setup-badge {
  padding: 3px 10px;
  background: rgba(255, 170, 0, 0.2);
  border: 1px solid #ffaa00;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  color: #ffaa00;
}

/* ========== ROI MODAL ========== */
.roi-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
  padding: 20px;
  overflow-y: auto;
}

.roi-modal {
  background: rgba(15, 30, 60, 0.98);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 12px;
  max-width: 550px;
  width: 100%;
  margin: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.roi-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 212, 255, 0.1);
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
  flex-shrink: 0;
}

.roi-modal-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #00d4ff;
  letter-spacing: 1px;
}

.roi-close-btn {
  width: 28px;
  height: 28px;
  background: rgba(255, 68, 102, 0.2);
  border: 1px solid rgba(255, 68, 102, 0.4);
  border-radius: 50%;
  color: #ff4466;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.roi-close-btn:hover { background: rgba(255, 68, 102, 0.4); }

.roi-modal-body {
  padding: 15px;
  flex: 1;
  overflow-y: auto;
}

.roi-instructions {
  margin-bottom: 12px;
  padding: 10px;
  background: rgba(0, 20, 50, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 6px;
  font-size: 12px;
  color: #aab;
  line-height: 1.6;
}

.roi-canvas-container {
  display: flex;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 8px;
  max-height: 350px;
  overflow: auto;
}

.roi-canvas {
  cursor: crosshair;
  border: 2px solid rgba(0, 212, 255, 0.3);
  border-radius: 4px;
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.roi-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  color: #667;
  font-size: 13px;
}

.roi-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(0, 20, 50, 0.3);
  border-top: 1px solid rgba(0, 212, 255, 0.1);
  flex-shrink: 0;
}

.roi-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.roi-btn-secondary {
  background: rgba(100, 100, 120, 0.3);
  border: 1px solid rgba(100, 100, 120, 0.5);
  color: #aab;
}

.roi-btn-secondary:hover { background: rgba(100, 100, 120, 0.5); }

.roi-btn-primary {
  background: linear-gradient(135deg, #00d4ff, #0080ff);
  color: #fff;
}

.roi-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0, 212, 255, 0.4); }
.roi-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* ========== RESPONSIVE ========== */
@media (max-width: 900px) {
  .setup-grid { grid-template-columns: 1fr; }
}

/* ========== UTILITIES ========== */
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
</style>
