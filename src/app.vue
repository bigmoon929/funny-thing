<template>
  <div class="main">
    <like-button />
  </div>
</template>
<script lang="ts" setup>
import LikeButton from '@/components/like-button/index.vue'
</script>
<style>
html,
body,
#app {
  height: 100%;
}

.main {
  display: flex;
  justify-content: center;
  height: 100%;
}
</style>
