<template>
  <div class="dashboard">
    <header class="header">
      <div class="logo">
        <div class="logo-icon"></div>
        <span>LIQUID LEVEL MONITOR</span>
      </div>
      <div class="header-status">
        <span class="status-dot" :class="statusClass"></span>
        <span>{{ status }}</span>
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