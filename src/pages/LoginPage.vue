<template>
  <div class="login-page">
    <div class="login-card card">
      <div class="login-header">
        <div class="login-logo-icon"></div>
        <h2 class="login-title">LIQUID LEVEL MONITOR</h2>
        <p class="login-subtitle">Admin Authentication Required</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="input-group">
          <label for="username">Username</label>
          <input
            id="username"
            type="text"
            v-model="username"
            placeholder="Enter username"
            autocomplete="username"
          />
        </div>

        <div class="input-group">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            v-model="password"
            placeholder="Enter password"
            autocomplete="current-password"
          />
        </div>

        <div v-if="errorMsg" class="login-error">
          <span class="error-dot"></span>
          {{ errorMsg }}
        </div>

        <button type="submit" class="ctrl-btn start-btn login-btn">
          <span>LOGIN</span>
          <span class="arrow-icon">→</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppState } from '../composables/useAppState.js'

const router = useRouter()
const { isAuthenticated } = useAppState()

const username = ref('')
const password = ref('')
const errorMsg = ref('')

const handleLogin = () => {
  if (username.value === 'admin' && password.value === 'admin') {
    isAuthenticated.value = true
    sessionStorage.setItem('auth', 'true')
    errorMsg.value = ''
    router.push('/')
  } else {
    errorMsg.value = 'Invalid credentials. Please try again.'
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
  padding: 20px;
}

.login-card {
  max-width: 400px;
  width: 100%;
  padding: 36px 32px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-logo-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #00d4ff, #0080ff);
  border-radius: 12px;
  box-shadow: 0 0 25px rgba(0, 212, 255, 0.4);
  margin: 0 auto 16px;
}

.login-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #00d4ff;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.4);
  margin-bottom: 6px;
}

.login-subtitle {
  font-size: 13px;
  color: #667;
  letter-spacing: 1px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
  padding: 12px 14px;
  background: rgba(0, 20, 50, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 10px;
  color: #e0e6ed;
  font-family: 'Rajdhani', sans-serif;
  font-size: 15px;
  transition: all 0.3s;
}

.input-group input:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.25);
}

.input-group input::placeholder {
  color: #445;
}

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 68, 102, 0.1);
  border: 1px solid rgba(255, 68, 102, 0.3);
  border-radius: 8px;
  color: #ff6b7a;
  font-size: 13px;
  font-weight: 600;
  animation: shake 0.4s ease;
}

.error-dot {
  width: 8px;
  height: 8px;
  background: #ff4466;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(255, 68, 102, 0.6);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  font-size: 13px;
  letter-spacing: 2px;
  width: 100%;
  margin-top: 6px;
}

.arrow-icon {
  font-size: 18px;
  transition: transform 0.3s;
}

.login-btn:hover .arrow-icon {
  transform: translateX(4px);
}
</style>
