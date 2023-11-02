<!--

  <like-button>
    <template #button>
      <button>点赞</button>
    </template>
  </like-button>

-->
<template>
  <div @click="clickButton" class="like-button">
    <!-- 使用名为 'button' 的插槽 -->
    <slot name="icon">
      <liked-svg v-if="liked || isCrazyLiking" />
      <like-svg v-else />
    </slot>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import confetti, { shapeFromText, shapeFromPath } from './animate'
import LikeSvg from './like-svg.vue'
import LikedSvg from './liked-svg.vue'
import { ConfettiDefaultConfig } from './confetti-config'

const props = defineProps({
  liked: Boolean, // 是否是已点状态
  likeFunc: Function,
  cancelFunc: Function,
})

const clickBeginTime = ref(null)
const crazyClickCount = ref(0)
const liked = ref(props.liked)
const isCrazyLiking = ref(false)
const isCrazyClick = ref(false)
const crazyTimer = ref(null)

function confettiAnimate(position) {
  const config = ConfettiDefaultConfig
  config.position = position
  confetti(config)
}

const clickButton = (event) => {
  const now = Date.now()
  if (clickBeginTime.value === null) {
    clickBeginTime.value = now
  }

  if (clickBeginTime.value && now - clickBeginTime.value < 500) {
    // 判断连续点击
    isCrazyClick.value = true
    crazyClickCount.value++
  }

  if (liked.value) {
    liked.value = false
    return
  }

  isCrazyLiking.value = true
  let startX = event.clientX
  let startY = event.clientY
  confettiAnimate({ x: startX, y: startY })
  console.log('isCrazyClick:', isCrazyClick.value)
  if (isCrazyClick.value === true) {
    crazyTimer.value && clearTimeout(crazyTimer.value)
    crazyTimer.value = setTimeout(() => {
      clickOver()
    }, 500)

    return
  }

  clickOver()
}

function clickOver() {
  liked.value = !liked.value
  if (liked.value && props.likeFunc) {
    props.likeFunc(crazyClickCount.value)
  } else if (!liked.value && props.cancelFunc) {
    props.cancelFun
  }
  crazyClickCount.value = 0
  clickBeginTime.value = null
  isCrazyClick.value = false
  crazyTimer.value = null
  isCrazyLiking.value = false
}
</script>

<style scoped>
.like-button {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.icon {
  width: 40px;
}
</style>
