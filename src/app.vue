<template>
  <div class="main">
    <like-button :liked="false" :likeFunc="likeFunc" :cancelFunc="cancelFunc" />
  </div>
</template>
<script lang="ts" setup>
import LikeButton from '@/components/like-button/index.vue'

function likeFunc(count: number) {
  console.info(`疯狂点赞${count}次`)
}

function cancelFunc() {
  console.info(`取消点赞`)
}
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
