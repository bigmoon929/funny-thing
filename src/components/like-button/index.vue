<!--

  <like-button>
    <template #button>
      <button>点赞</button>
    </template>
  </like-button>

-->
<template>
  <div @click="like" class="like-button">
    <!-- 使用名为 'button' 的插槽 -->
    <slot name="button">
      <!-- 默认的 SVG 点赞按钮 -->
      <svg
        t="1698826837077"
        class="icon"
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="10179"
        width="200"
        height="200"
      >
        <path
          d="M512 128a384 384 0 1 1 0 768A384 384 0 0 1 512 128z m0 85.333333a298.666667 298.666667 0 1 0 0 597.333334A298.666667 298.666667 0 0 0 512 213.333333z"
          p-id="10180"
        ></path>
        <path
          d="M746.666667 522.666667c0 141.397333-105.045333 256-234.666667 256-126.592 0-229.76-109.354667-234.496-246.186667L277.333333 522.666667h469.333334z m-105.386667 85.333333H382.677333l3.413334 6.357333c25.429333 45.44 69.162667 75.818667 118.144 78.762667L512 693.333333c52.053333 0 99.114667-31.146667 125.952-78.976l3.328-6.357333z"
          p-id="10181"
        ></path>
        <path
          d="M384 426.666667m-42.666667 0a42.666667 42.666667 0 1 0 85.333334 0 42.666667 42.666667 0 1 0-85.333334 0Z"
          p-id="10182"
        ></path>
        <path
          d="M640 426.666667m-42.666667 0a42.666667 42.666667 0 1 0 85.333334 0 42.666667 42.666667 0 1 0-85.333334 0Z"
          p-id="10183"
        ></path>
      </svg>
    </slot>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import confetti, { shapeFromText } from './animate'

const baseImgUrl = 'https://wptalk.wpstatic.cn/pcchat/'

const count = 200
const scalar = 2
const unicorn = shapeFromText({ text: '💖', scalar })
const defaults = {
  origin: { y: 0.1 },
  shapes: [unicorn],
  scalar,
}

function likeAnimate(position) {
  confetti({
    particleCount: 100,
    spread: 70,
    position: position,
    shapes: ['image'],
    shapeOptions: {
      image: [
        {
          src: 'https://particles.js.org/images/fruits/apple.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/avocado.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/banana.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/berries.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/cherry.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/grapes.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/lemon.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/orange.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/peach.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/pear.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/pepper.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/plum.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/star.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/strawberry.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/watermelon.png',
          width: 32,
          height: 32,
        },
        {
          src: 'https://particles.js.org/images/fruits/watermelon_slice.png',
          width: 32,
          height: 32,
        },
      ],
    },
  })
}

const props = defineProps({
  likeNum: Number,
  hasLike: Boolean,
})
const emit = defineEmits(['click-like'])

const animationInterval = ref()
const likeImgRef = ref(null)

const like = (event) => {
  console.log('点赞！！！')

  let startX = event.clientX
  let startY = event.clientY

  likeAnimate({ x: startX, y: startY })

  emit('click-like')
  if (likeImgRef.value) {
    console.log(likeImgRef.value)
    if (!props.hasLike) {
      likeImgRef.value.classList.add('nut-icon-am-breathe')
    } else {
      likeImgRef.value.classList.remove('nut-icon-am-breathe')
    }
  }
}

function startAnimation() {
  animationInterval.value = setInterval(() => {
    document.querySelector('.btn-icon').classList.add('pulse')
  }, 500)
}

function stopAnimation() {
  clearInterval(animationInterval.value)
  document.querySelector('.btn-icon').classList.remove('pulse')
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
