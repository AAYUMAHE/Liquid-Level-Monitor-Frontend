<template>
  <div class="dashboard">
    <header class="header">
      <div class="logo">
        <div class="logo-icon"></div>
        <span>LIQUID LEVEL MONITOR</span>
      </div>
      <div class="header-nav">
        <div class="header-status">
          <span class="status-dot" :class="statusClass"></span>
          <span>{{ status }}</span>
        </div>
      </div>
    </header>

    <router-view v-slot="{ Component }">
      <transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { useAppState } from './composables/useAppState.js'

const { status, statusClass } = useAppState()
</script>

<style scoped>
.header-nav {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-link {
  padding: 6px 14px;
  background: rgba(0, 20, 50, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.25);
  border-radius: 8px;
  color: #00d4ff;
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  text-decoration: none;
  transition: all 0.3s;
}

.nav-link:hover {
  background: rgba(0, 212, 255, 0.1);
  border-color: #00d4ff;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 212, 255, 0.2);
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>