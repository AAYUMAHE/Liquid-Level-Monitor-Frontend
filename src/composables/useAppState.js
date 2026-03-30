import { ref, computed } from 'vue'
import axios from 'axios'

// ============================================
// SINGLETON STATE (module-level refs)
// ============================================
const backendUrl = 'http://10.42.171.236:8000'

const status = ref('IDLE')
const isRunning = ref(false)
const isAuthenticated = ref(sessionStorage.getItem('auth') === 'true')
const selectedEstimator = ref('level') // 'level' or 'other'
const sourceMode = ref('camera')

const calibration = ref(1.0)
const targetFps = ref(60)
const thresholdHigh = ref(8)
const thresholdLow = ref(-8)

const level = ref(null)
const fps = ref(0)
const frameCount = ref(0)
const processingTime = ref(0)

const uploadedFile = ref(null)
const uploadedFilePath = ref(null)
const isUploading = ref(false)
const uploadMessage = ref('')
const uploadMessageType = ref('')

const sessionSaved = ref(false)
const trendData = ref([])

// Camera state
const cameraError = ref('')
const isCheckingCamera = ref(false)

// Auto Lighting state
const autoLightingEnabled = ref(true)
const claheClipLimit = ref(2.0)

// ROI state
const hasRoi = ref(false)
const currentRoi = ref({ x1: 0, y1: 0, x2: 0, y2: 0 })
const roiFrameData = ref(null)

// ============================================
// SAVE / EXPORT CONFIGURATION STATE
// ============================================
const outputFolder = ref('session_output')
const saveFrames = ref(true)
const saveExcel = ref(true)
const saveChart = ref(true)
const localSaveDirHandle = ref(null)   // File System Access API directory handle
const autoSaveStatus = ref('')         // 'saving' | 'idle' | 'error'
let autoSaveInterval = null
let savedFrameCount = 0

// ============================================
// COMPUTED
// ============================================
const statusClass = computed(() => {
  if (isRunning.value) return 'running'
  if (status.value === 'STOPPED') return 'stopped'
  return 'idle'
})

const levelDisplay = computed(() => {
  if (level.value === null) return '--'
  return level.value.toFixed(2)
})

const alertClass = computed(() => {
  if (level.value === null) return 'normal'
  if (level.value >= thresholdHigh.value) return 'danger'
  if (level.value <= thresholdLow.value) return 'warning'
  return 'normal'
})

const alertTitle = computed(() => {
  if (level.value === null) return 'System Ready'
  if (level.value >= thresholdHigh.value) return 'HIGH LEVEL ALERT'
  if (level.value <= thresholdLow.value) return 'LOW LEVEL ALERT'
  return 'Normal Operation'
})

const alertMessage = computed(() => {
  if (level.value === null) return 'Waiting for measurements...'
  if (level.value >= thresholdHigh.value) return `Level exceeds ${thresholdHigh.value} cm threshold`
  if (level.value <= thresholdLow.value) return `Level below ${thresholdLow.value} cm threshold`
  return 'All parameters within normal range'
})

const isCriticalAlert = computed(() => {
  if (level.value === null) return false
  return level.value >= thresholdHigh.value || level.value <= thresholdLow.value
})

const videoUrl = computed(() => isRunning.value ? `${backendUrl}/video_feed` : '')

// Save All computed toggle
const saveAll = computed({
  get: () => saveFrames.value && saveExcel.value && saveChart.value,
  set: (val) => {
    saveFrames.value = val
    saveExcel.value = val
    saveChart.value = val
  }
})

let pollingInterval = null
let targetLevel = 0
let smoothedTarget = 0
let levelHistory = []
const historySize = 3
const smoothingFactor = 0.4

const smoothLevel = (newLevel) => {
  if (newLevel === null || newLevel === undefined) return smoothedTarget
  levelHistory.push(newLevel)
  if (levelHistory.length > historySize) levelHistory.shift()
  const avgLevel = levelHistory.reduce((a, b) => a + b, 0) / levelHistory.length
  smoothedTarget += (avgLevel - smoothedTarget) * smoothingFactor
  return smoothedTarget
}

// ============================================
// API FUNCTIONS
// ============================================
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    uploadedFile.value = file
    uploadMessage.value = ''
  }
}

const uploadVideo = async () => {
  if (!uploadedFile.value) return
  isUploading.value = true
  uploadMessage.value = ''
  const formData = new FormData()
  formData.append('file', uploadedFile.value)
  try {
    const res = await axios.post(`${backendUrl}/upload_video`, formData)
    uploadedFilePath.value = res.data.path
    uploadMessage.value = 'Video uploaded successfully!'
    uploadMessageType.value = 'success'
  } catch (e) {
    uploadMessage.value = 'Upload failed: ' + (e.response?.data?.detail || e.message)
    uploadMessageType.value = 'error'
  } finally {
    isUploading.value = false
  }
}

const checkCamera = async () => {
  try {
    isCheckingCamera.value = true
    cameraError.value = ''
    const res = await axios.get(`${backendUrl}/check_camera`, { params: { index: 0 } })
    if (!res.data.available) {
      cameraError.value = res.data.message || 'Camera not found'
      return false
    }
    return true
  } catch (e) {
    cameraError.value = 'Failed to check camera: ' + (e.response?.data?.detail || e.message)
    return false
  } finally {
    isCheckingCamera.value = false
  }
}

const startSystem = async () => {
  try {
    cameraError.value = ''
    if (sourceMode.value === 'camera') {
      status.value = 'CHECKING CAMERA...'
      const cameraAvailable = await checkCamera()
      if (!cameraAvailable) {
        status.value = 'CAMERA ERROR'
        return false
      }
    } else {
      if (!uploadedFilePath.value) {
        cameraError.value = 'Please upload a video file first'
        status.value = 'IDLE'
        return false
      }
    }

    status.value = 'STARTING...'
    sessionSaved.value = false
    trendData.value = []
    levelHistory = []
    smoothedTarget = 0
    targetLevel = 0

    const source = sourceMode.value === 'camera' ? '0' : uploadedFilePath.value
    const res = await axios.post(`${backendUrl}/start`, null, {
      params: {
        source,
        calibration: calibration.value,
        fps: targetFps.value,
        output_folder: outputFolder.value || 'session_output'
      }
    })

    if (res.data.success === false) {
      cameraError.value = res.data.message || 'Failed to start'
      status.value = 'ERROR'
      return false
    }

    isRunning.value = true
    status.value = 'RUNNING'
    startPolling()

    // Start auto-saving frames to local folder if configured
    if (saveFrames.value && localSaveDirHandle.value) {
      startAutoSaving()
    }

    return true
  } catch (e) {
    status.value = 'ERROR'
    cameraError.value = 'Connection error: ' + (e.response?.data?.message || e.message)
    console.error(e)
    return false
  }
}

const stopSystem = async () => {
  try {
    stopAutoSaving()
    await axios.post(`${backendUrl}/stop`)
    isRunning.value = false
    status.value = 'STOPPED'
    stopPolling()
    sessionSaved.value = true
    level.value = null
    smoothedTarget = 0
    trendData.value = []

    // Auto-download selected items after session ends
    setTimeout(async () => {
      if (saveExcel.value) {
        window.open(`${backendUrl}/download_report`, '_blank')
      }
      if (saveChart.value) {
        setTimeout(() => window.open(`${backendUrl}/download_chart`, '_blank'), 500)
      }
    }, 1500) // wait for backend to finish generating report

    setTimeout(() => { sessionSaved.value = false }, 5000)
  } catch (e) {
    console.error(e)
  }
}

const setZero = async () => {
  try { await axios.post(`${backendUrl}/set_zero`) } catch (e) { console.error(e) }
}

const downloadReport = () => {
  try { window.open(`${backendUrl}/download_report`, '_blank') } catch (e) { console.error(e) }
}

const downloadChart = () => {
  try { window.open(`${backendUrl}/download_chart`, '_blank') } catch (e) { console.error(e) }
}

const downloadFramesZip = () => {
  try { window.open(`${backendUrl}/download_frames_zip`, '_blank') } catch (e) { console.error(e) }
}

// ============================================
// LOCAL FOLDER SAVE (File System Access API)
// ============================================
const pickLocalFolder = async () => {
  try {
    if (!window.showDirectoryPicker) {
      alert('Your browser does not support folder selection. Please use Chrome or Edge.')
      return false
    }
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    localSaveDirHandle.value = handle
    return true
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('Folder picker error:', e)
    }
    return false
  }
}

const startAutoSaving = () => {
  if (autoSaveInterval) return
  savedFrameCount = 0
  autoSaveStatus.value = 'saving'

  autoSaveInterval = setInterval(async () => {
    if (!isRunning.value || !localSaveDirHandle.value) {
      stopAutoSaving()
      return
    }

    try {
      const res = await fetch(`${backendUrl}/get_latest_frame`)
      if (!res.ok) return

      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('image')) return

      const blob = await res.blob()
      savedFrameCount++
      const fileName = `frame_${String(savedFrameCount).padStart(5, '0')}.jpg`

      const fileHandle = await localSaveDirHandle.value.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()

      autoSaveStatus.value = 'saving'
    } catch (e) {
      console.error('Auto-save frame error:', e)
      autoSaveStatus.value = 'error'
    }
  }, 1000) // every 1 second
}

const stopAutoSaving = () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
    autoSaveInterval = null
  }
  autoSaveStatus.value = 'idle'
}

const fetchLogs = async (limit = 200) => {
  try {
    const res = await axios.get(`${backendUrl}/logs`, { params: { limit } })
    return res.data
  } catch (e) {
    console.error('Failed to fetch logs:', e)
    return { logs: [], total: 0, running: false }
  }
}

const onAutoLightingChange = async () => {
  try {
    await axios.post(`${backendUrl}/set_auto_lighting`, null, {
      params: { enabled: autoLightingEnabled.value, clip_limit: claheClipLimit.value }
    })
  } catch (e) { console.error('Failed to update auto lighting:', e) }
}

const loadAutoLightingSettings = async () => {
  try {
    const res = await axios.get(`${backendUrl}/auto_lighting`)
    autoLightingEnabled.value = res.data.enabled
    claheClipLimit.value = res.data.clip_limit
  } catch (e) { console.error('Failed to load auto lighting settings:', e) }
}

const loadCurrentRoi = async () => {
  try {
    const res = await axios.get(`${backendUrl}/roi`)
    if (res.data.has_roi && res.data.roi) {
      hasRoi.value = true
      currentRoi.value = {
        x1: res.data.roi[0], y1: res.data.roi[1],
        x2: res.data.roi[2], y2: res.data.roi[3]
      }
    }
  } catch (e) { console.error('Failed to load ROI:', e) }
}

// ============================================
// POLLING
// ============================================
const startPolling = () => {
  pollingInterval = setInterval(async () => {
    try {
      const res = await axios.get(`${backendUrl}/level`)
      if (res.data.level !== null && res.data.level !== undefined) {
        level.value = res.data.level
        targetLevel = res.data.level
        smoothLevel(res.data.level)
        trendData.value.push(res.data.level)
        if (trendData.value.length > 30) trendData.value.shift()
      }
      fps.value = res.data.fps || 0
      frameCount.value = res.data.frame_count || 0
      processingTime.value = (res.data.processing_time || 0) * 1000
      if (res.data.running === false && isRunning.value) {
        stopSystem()
        status.value = 'SOURCE ENDED'
      }
    } catch (e) { console.error(e) }
  }, 100)
}

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

// ============================================
// EXPORT COMPOSABLE
// ============================================
export function useAppState() {
  return {
    backendUrl,
    status, statusClass, isRunning, isAuthenticated, selectedEstimator,
    sourceMode, calibration, targetFps,
    thresholdHigh, thresholdLow,
    level, levelDisplay, fps, frameCount, processingTime,
    uploadedFile, uploadedFilePath, isUploading, uploadMessage, uploadMessageType,
    sessionSaved, trendData,
    cameraError, isCheckingCamera,
    autoLightingEnabled, claheClipLimit,
    hasRoi, currentRoi, roiFrameData,
    videoUrl,
    alertClass, alertTitle, alertMessage, isCriticalAlert,
    // Save / Export config
    outputFolder, saveFrames, saveExcel, saveChart, saveAll,
    localSaveDirHandle, autoSaveStatus,
    // Smoothing
    smoothLevel,
    getSmoothedTarget: () => smoothedTarget,
    // API functions
    handleFileSelect, uploadVideo, checkCamera,
    startSystem, stopSystem, setZero, downloadReport,
    downloadChart, downloadFramesZip, fetchLogs,
    pickLocalFolder, startAutoSaving, stopAutoSaving,
    onAutoLightingChange, loadAutoLightingSettings, loadCurrentRoi,
    startPolling, stopPolling,
  }
}
