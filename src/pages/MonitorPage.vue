<template>
  <div class="monitor-page">
    <main class="main-grid">

      <!-- Left Column: Live Feed + Trend -->
      <div class="left-column">

        <div class="card video-card">
          <div class="card-header">
            <span class="card-title">LIVE MONITOR</span>
            <span class="badge">LIVE</span>
          </div>
          <div class="video-container">
            <img :src="videoUrl" alt="Live Feed" class="live-feed-img" />
          </div>
        </div>

        <div class="card trend-card">
          <div class="card-header">
            <span class="card-title">LEVEL TREND</span>
            <span class="card-subtitle">Last {{ trendData.length }} readings</span>
          </div>
          <div class="trend-container">
            <canvas ref="trendCanvas"></canvas>
          </div>
        </div>

      </div>

      <!-- Center Column: Cylinder + Alert -->
      <div class="center-column">

        <div class="card cylinder-card">
          <div class="card-header"><span class="card-title">LIQUID LEVEL</span></div>
          <div class="cylinder-container">
            <div class="cylinder-wrapper">
              <canvas ref="cylinderCanvas"></canvas>
            </div>
            <div class="level-display">
              <span class="level-value">{{ levelDisplay }}</span>
              <span class="level-unit">cm</span>
            </div>
          </div>
        </div>

        <div class="card alert-card" :class="alertClass">
          <div class="alert-icon-wrapper"><div class="alert-icon"></div></div>
          <div class="alert-content">
            <span class="alert-title">{{ alertTitle }}</span>
            <span class="alert-message">{{ alertMessage }}</span>
          </div>
          <div v-if="isCriticalAlert" class="critical-overlay">
            <span class="critical-text">⚠ CRITICAL ⚠</span>
          </div>
        </div>
        <div v-if="isCriticalAlert" class="fullscreen-alert-flash"></div>

      </div>

      <!-- Right Column: Runtime Controls -->
      <div class="right-column">

        <div class="card controls-card">
          <div class="card-header">
            <span class="card-title">RUNTIME CONTROLS</span>
          </div>
          <div class="controls-content">
            <div class="control-buttons vertical">
              <button class="ctrl-btn stop-btn full-width" @click="handleStop">
                <span class="btn-icon stop-icon"></span> STOP SYSTEM
              </button>
              <button class="ctrl-btn zero-btn full-width" @click="setZero">
                <span class="btn-icon zero-icon"></span> SET ZERO REF
              </button>
              <button class="ctrl-btn download-btn full-width" @click="downloadReport">
                <span class="btn-icon download-icon"></span> DOWNLOAD REPORT
              </button>
            </div>
          </div>
        </div>

        <div class="card session-card" v-if="sessionSaved">
          <div class="session-icon"></div>
          <div class="session-content">
            <span class="session-title">Session Saved</span>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppState } from '../composables/useAppState.js'

const router = useRouter()
const {
  videoUrl, isRunning,
  level, levelDisplay, trendData,
  alertClass, alertTitle, alertMessage, isCriticalAlert,
  sessionSaved,
  thresholdHigh, thresholdLow,
  stopSystem, setZero, downloadReport,
  startPolling, stopPolling,
  smoothLevel, getSmoothedTarget,
} = useAppState()

// ============================================
// CYLINDER ANIMATION
// ============================================
const cylinderCanvas = ref(null)
let cylinderCtx = null
let cylinderAnimId = null

let currentLevel = 0
let velocity = 0

const tension = 0.04
const damping = 0.15
let minLevel = -10
let maxLevel = 10
const windowSize = 20

const updateCylinderPhysics = () => {
  const smoothedTarget = getSmoothedTarget()
  const displacement = smoothedTarget - currentLevel
  const acceleration = displacement * tension - velocity * damping
  velocity += acceleration
  currentLevel += velocity
  const center = smoothedTarget
  minLevel = center - windowSize / 2
  maxLevel = center + windowSize / 2
}

const drawCylinder = () => {
  const canvas = cylinderCanvas.value
  if (!canvas) return
  const w = canvas.width
  const h = canvas.height
  const ctx = cylinderCtx

  ctx.clearRect(0, 0, w, h)

  const cylX = 40
  const cylY = 20
  const cylW = w - 80
  const cylH = h - 40

  // Cylinder background
  const bgGrad = ctx.createLinearGradient(cylX, 0, cylX + cylW, 0)
  bgGrad.addColorStop(0, 'rgba(10, 25, 47, 0.8)')
  bgGrad.addColorStop(0.5, 'rgba(20, 40, 70, 0.8)')
  bgGrad.addColorStop(1, 'rgba(10, 25, 47, 0.8)')
  ctx.fillStyle = bgGrad
  ctx.beginPath()
  ctx.roundRect(cylX, cylY, cylW, cylH, 10)
  ctx.fill()

  // Cylinder border glow
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(cylX, cylY, cylW, cylH, 10)
  ctx.stroke()

  // Liquid
  let normalized = (currentLevel - minLevel) / (maxLevel - minLevel)
  normalized = Math.max(0, Math.min(1, normalized))
  const liquidH = normalized * cylH
  const liquidY = cylY + cylH - liquidH

  const liqGrad = ctx.createLinearGradient(0, liquidY, 0, cylY + cylH)
  liqGrad.addColorStop(0, 'rgba(0, 212, 255, 0.9)')
  liqGrad.addColorStop(0.5, 'rgba(0, 150, 255, 0.7)')
  liqGrad.addColorStop(1, 'rgba(0, 100, 200, 0.5)')
  ctx.fillStyle = liqGrad
  ctx.beginPath()
  ctx.roundRect(cylX + 4, liquidY, cylW - 8, liquidH - 4, [0, 0, 8, 8])
  ctx.fill()

  // Surface wave
  if (liquidH > 10) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.beginPath()
    ctx.ellipse(cylX + cylW / 2, liquidY + 5, cylW / 2 - 10, 5, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Dynamic Scale ticks
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)'
  ctx.fillStyle = 'rgba(0, 212, 255, 0.8)'
  ctx.font = '10px monospace'
  ctx.textAlign = 'right'
  ctx.lineWidth = 1

  const startTick = Math.ceil(minLevel)
  const endTick = Math.floor(maxLevel)

  for (let i = startTick; i <= endTick; i++) {
    const norm = (i - minLevel) / (maxLevel - minLevel)
    const y = cylY + cylH - (norm * cylH)
    if (y < cylY || y > cylY + cylH) continue

    ctx.beginPath(); ctx.moveTo(cylX, y); ctx.lineTo(cylX + 10, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cylX + cylW - 10, y); ctx.lineTo(cylX + cylW, y); ctx.stroke()

    if (i % 5 === 0 || windowSize <= 10) {
      ctx.fillText(i.toString(), cylX - 5, y + 3)
    }
  }
}

const animateCylinder = () => {
  updateCylinderPhysics()
  drawCylinder()
  cylinderAnimId = requestAnimationFrame(animateCylinder)
}

// ============================================
// TREND GRAPH
// ============================================
const trendCanvas = ref(null)
let trendCtx = null
const maxTrendPoints = 30

const drawTrend = () => {
  const canvas = trendCanvas.value
  if (!canvas || !trendCtx) return
  const w = canvas.width
  const h = canvas.height
  const ctx = trendCtx
  const padding = 30

  ctx.clearRect(0, 0, w, h)

  // Grid
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = padding + (i / 5) * (h - 2 * padding)
    ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(w - padding, y); ctx.stroke()
  }

  if (trendData.value.length < 2) return

  const graphW = w - 2 * padding
  const graphH = h - 2 * padding
  const step = graphW / (maxTrendPoints - 1)

  // Line
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.8)'
  ctx.lineWidth = 2

  trendData.value.forEach((val, i) => {
    const x = padding + i * step
    const norm = (val - minLevel) / (maxLevel - minLevel)
    const safeNorm = Math.max(0, Math.min(1, norm))
    const y = padding + (1 - safeNorm) * graphH
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  // Fill
  const lastX = padding + (trendData.value.length - 1) * step
  ctx.lineTo(lastX, h - padding)
  ctx.lineTo(padding, h - padding)
  ctx.closePath()
  const fillGrad = ctx.createLinearGradient(0, padding, 0, h - padding)
  fillGrad.addColorStop(0, 'rgba(0, 212, 255, 0.3)')
  fillGrad.addColorStop(1, 'rgba(0, 212, 255, 0.05)')
  ctx.fillStyle = fillGrad
  ctx.fill()

  // Points
  ctx.fillStyle = '#00d4ff'
  trendData.value.forEach((val, i) => {
    const x = padding + i * step
    const norm = (val - minLevel) / (maxLevel - minLevel)
    const safeNorm = Math.max(0, Math.min(1, norm))
    const y = padding + (1 - safeNorm) * graphH
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
  })
}

watch(trendData, drawTrend, { deep: true })

// ============================================
// NAVIGATION
// ============================================
const handleStop = async () => {
  await stopSystem()
  router.push('/')
}

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  // Redirect if not running
  if (!isRunning.value) {
    router.replace('/')
    return
  }

  // Init cylinder
  const cylCanvas = cylinderCanvas.value
  cylCanvas.width = 200
  cylCanvas.height = 300
  cylinderCtx = cylCanvas.getContext('2d')
  animateCylinder()

  // Init trend
  const tCanvas = trendCanvas.value
  tCanvas.width = tCanvas.parentElement.clientWidth || 400
  tCanvas.height = 150
  trendCtx = tCanvas.getContext('2d')
  drawTrend()
})

onUnmounted(() => {
  if (cylinderAnimId) cancelAnimationFrame(cylinderAnimId)
})
</script>

<style scoped>
.monitor-page {
  padding: 0 20px 20px;
}

/* ========== MAIN GRID ========== */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
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
}

.video-container img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* ========== BADGE ========== */
.badge {
  padding: 3px 10px;
  background: rgba(0, 255, 136, 0.2);
  border: 1px solid #00ff88;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  color: #00ff88;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ========== TREND GRAPH ========== */
.trend-container {
  width: 100%;
  height: 150px;
}

.trend-container canvas {
  width: 100%;
  height: 100%;
}

/* ========== CYLINDER ========== */
.cylinder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cylinder-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.cylinder-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.level-display {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.level-value {
  font-family: 'Orbitron', sans-serif;
  font-size: 48px;
  font-weight: 700;
  color: #00d4ff;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
}

.level-unit {
  font-size: 18px;
  color: #667;
}

/* ========== ALERT PANEL ========== */
.alert-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 20px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.alert-card.normal { border-color: rgba(0, 255, 136, 0.3); }

.alert-card.warning {
  border-color: rgba(255, 170, 0, 0.5);
  background: rgba(255, 170, 0, 0.1);
}

.alert-card.danger {
  border-color: rgba(255, 68, 102, 0.8);
  background: rgba(255, 68, 102, 0.2);
  animation: dangerPulse 0.5s infinite, dangerShake 0.3s infinite;
  box-shadow: 0 0 20px rgba(255, 68, 102, 0.5), 0 0 40px rgba(255, 68, 102, 0.3), inset 0 0 20px rgba(255, 68, 102, 0.1);
}

@keyframes dangerPulse {
  0%, 100% { background: rgba(255, 68, 102, 0.2); border-color: rgba(255, 68, 102, 0.8); }
  50% { background: rgba(255, 68, 102, 0.4); border-color: rgba(255, 68, 102, 1); }
}

@keyframes dangerShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

.alert-icon-wrapper { position: relative; }

.alert-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 255, 136, 0.2);
  border: 2px solid #00ff88;
}

.alert-card.warning .alert-icon {
  background: rgba(255, 170, 0, 0.2);
  border-color: #ffaa00;
  animation: warningPulseIcon 1s infinite;
}

.alert-card.danger .alert-icon {
  background: rgba(255, 68, 102, 0.4);
  border-color: #ff4466;
  animation: dangerPulseIcon 0.3s infinite;
  box-shadow: 0 0 15px rgba(255, 68, 102, 0.8);
}

@keyframes warningPulseIcon {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes dangerPulseIcon {
  0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(255, 68, 102, 0.8); }
  50% { transform: scale(1.2); box-shadow: 0 0 25px rgba(255, 68, 102, 1); }
}

.alert-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.alert-title {
  font-weight: 700;
  font-size: 14px;
  color: #00ff88;
}

.alert-card.warning .alert-title { color: #ffaa00; }
.alert-card.danger .alert-title {
  color: #ff4466;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 2px;
  animation: textFlash 0.5s infinite;
}

@keyframes textFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.alert-message {
  font-size: 12px;
  color: #778;
}

.alert-card.danger .alert-message { color: #ffaaaa; }

/* Critical Overlay */
.critical-overlay {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4px 12px;
  background: linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.8), rgba(255, 0, 0, 0.8));
  animation: criticalSlide 0.5s infinite alternate;
}

.critical-text {
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
  animation: criticalBlink 0.3s infinite;
}

@keyframes criticalSlide { 0% { opacity: 0.8; } 100% { opacity: 1; } }
@keyframes criticalBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

/* Fullscreen Alert Flash */
.fullscreen-alert-flash {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 999;
  animation: fullscreenFlash 1s infinite;
}

@keyframes fullscreenFlash {
  0%, 100% { background: transparent; box-shadow: inset 0 0 100px rgba(255, 0, 0, 0); }
  50% { background: rgba(255, 0, 0, 0.05); box-shadow: inset 0 0 100px rgba(255, 0, 0, 0.3); }
}

/* ========== CONTROLS ========== */
.controls-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.control-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.control-buttons.vertical {
  grid-template-columns: 1fr;
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

.full-width { width: 100%; justify-content: center; }
.ctrl-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }

.stop-btn { background: linear-gradient(135deg, #ff4466, #cc3355); color: #fff; }
.stop-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(255, 68, 102, 0.4); }

.zero-btn { background: linear-gradient(135deg, #ffaa00, #ff8800); color: #000; }
.zero-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(255, 170, 0, 0.4); }

.download-btn { background: linear-gradient(135deg, #00d4ff, #0080ff); color: #fff; }
.download-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(0, 212, 255, 0.4); }

.btn-icon { width: 14px; height: 14px; background: currentColor; }

/* ========== SESSION CARD ========== */
.session-card {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(0, 255, 136, 0.1);
  border-color: rgba(0, 255, 136, 0.3);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.session-icon {
  width: 40px;
  height: 40px;
  background: rgba(0, 255, 136, 0.2);
  border: 2px solid #00ff88;
  border-radius: 50%;
}

.session-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.session-title {
  font-weight: 700;
  color: #00ff88;
}

/* ========== RESPONSIVE ========== */
@media (max-width: 1200px) {
  .main-grid { grid-template-columns: 1fr 1fr; }
  .right-column {
    grid-column: span 2;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .main-grid { grid-template-columns: 1fr; }
  .right-column { grid-column: span 1; grid-template-columns: 1fr; }
}
</style>
