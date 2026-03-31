<template>
  <Teleport to="body">
    <Transition name="error-modal">
      <div v-if="visible" class="error-modal-overlay" @click.self="$emit('close')">
        <div class="error-modal" :class="type">
          <!-- Icon -->
          <div class="error-modal-icon-wrapper">
            <div class="error-modal-icon" :class="type">
              <svg v-if="type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>

          <!-- Content -->
          <div class="error-modal-content">
            <h3 class="error-modal-title" :class="type">{{ title || defaultTitle }}</h3>
            <p class="error-modal-message">{{ message }}</p>
          </div>

          <!-- Action -->
          <button class="error-modal-dismiss" :class="type" @click="$emit('close')">
            DISMISS
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  type: { type: String, default: 'error' } // 'error' | 'warning'
})

defineEmits(['close'])

const defaultTitle = computed(() =>
  props.type === 'error' ? 'Error Occurred' : 'Warning'
)
</script>

<style>
/* ========== ERROR MODAL ========== */
.error-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(8px);
  padding: 20px;
}

.error-modal {
  background: rgba(15, 30, 60, 0.98);
  border: 1px solid rgba(255, 68, 102, 0.4);
  border-radius: 16px;
  max-width: 440px;
  width: 100%;
  padding: 32px 28px 24px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(255, 68, 102, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.error-modal.warning {
  border-color: rgba(255, 170, 0, 0.4);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(255, 170, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Icon */
.error-modal-icon-wrapper {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 68, 102, 0.12);
  border: 2px solid rgba(255, 68, 102, 0.35);
  animation: errorIconPulse 2s ease-in-out infinite;
}

.error-modal.warning .error-modal-icon-wrapper {
  background: rgba(255, 170, 0, 0.12);
  border-color: rgba(255, 170, 0, 0.35);
  animation: warningIconPulse 2s ease-in-out infinite;
}

.error-modal-icon {
  width: 36px;
  height: 36px;
  color: #ff4466;
}

.error-modal-icon.warning {
  color: #ffaa00;
}

.error-modal-icon svg {
  width: 100%;
  height: 100%;
}

@keyframes errorIconPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 68, 102, 0.3); }
  50% { box-shadow: 0 0 0 12px rgba(255, 68, 102, 0); }
}

@keyframes warningIconPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 170, 0, 0.3); }
  50% { box-shadow: 0 0 0 12px rgba(255, 170, 0, 0); }
}

/* Content */
.error-modal-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-modal-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #ff4466;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.error-modal-title.warning {
  color: #ffaa00;
}

.error-modal-message {
  font-family: 'Rajdhani', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: #aabbcc;
  line-height: 1.6;
  word-break: break-word;
}

/* Dismiss Button */
.error-modal-dismiss {
  padding: 10px 36px;
  background: rgba(255, 68, 102, 0.15);
  border: 1px solid rgba(255, 68, 102, 0.4);
  border-radius: 8px;
  color: #ff6b7a;
  font-family: 'Orbitron', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s;
}

.error-modal-dismiss:hover {
  background: rgba(255, 68, 102, 0.3);
  border-color: #ff4466;
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(255, 68, 102, 0.3);
}

.error-modal-dismiss.warning {
  background: rgba(255, 170, 0, 0.15);
  border-color: rgba(255, 170, 0, 0.4);
  color: #ffcc44;
}

.error-modal-dismiss.warning:hover {
  background: rgba(255, 170, 0, 0.3);
  border-color: #ffaa00;
  box-shadow: 0 4px 15px rgba(255, 170, 0, 0.3);
}

/* ========== TRANSITIONS ========== */
.error-modal-enter-active {
  transition: opacity 0.3s ease;
}
.error-modal-enter-active .error-modal {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
}
.error-modal-leave-active {
  transition: opacity 0.2s ease;
}
.error-modal-leave-active .error-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.error-modal-enter-from {
  opacity: 0;
}
.error-modal-enter-from .error-modal {
  opacity: 0;
  transform: scale(0.85) translateY(20px);
}

.error-modal-leave-to {
  opacity: 0;
}
.error-modal-leave-to .error-modal {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}
</style>
