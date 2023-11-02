/**
 * 主要代码来源于：https://github.com/catdad/canvas-confetti
 *
 */

function promise(func) {
  return new Promise(func)
}

const newRaf = () => {
  const TIME = Math.floor(1000 / 60)
  let frame, cancel
  let frames = {}
  let lastFrameTime = 0

  if (
    typeof requestAnimationFrame === 'function' &&
    typeof cancelAnimationFrame === 'function'
  ) {
    frame = function (cb) {
      let id = Math.random()

      frames[id] = requestAnimationFrame(function onFrame(time) {
        if (lastFrameTime === time || lastFrameTime + TIME - 1 < time) {
          lastFrameTime = time
          delete frames[id]

          cb()
        } else {
          frames[id] = requestAnimationFrame(onFrame)
        }
      })

      return id
    }
    cancel = function (id) {
      if (frames[id]) {
        cancelAnimationFrame(frames[id])
      }
    }
  } else {
    frame = function (cb) {
      return setTimeout(cb, TIME)
    }
    cancel = function (timer) {
      return clearTimeout(timer)
    }
  }

  return { frame: frame, cancel: cancel }
}

const raf = newRaf()

const canUsePaths =
  typeof Path2D === 'function' && typeof DOMMatrix === 'function'

const defaults = {
  particleCount: 50,
  angle: 90,
  spread: 45,
  startVelocity: 45,
  decay: 0.9,
  gravity: 1,
  drift: 0,
  ticks: 200,
  x: 0.5,
  y: 0.5,
  shapes: ['square', 'circle'],
  zIndex: 100,
  colors: [
    '#26ccff',
    '#a25afd',
    '#ff5e7e',
    '#88ff5a',
    '#fcff42',
    '#ffa62d',
    '#ff36ff',
  ],
  // probably should be true, but back-compat
  disableForReducedMotion: false,
  scalar: 1,
}

function convert(val, transform) {
  return transform ? transform(val) : val
}

function isOk(val) {
  return !(val === null || val === undefined)
}

function prop(options, name, transform) {
  return convert(
    options && isOk(options[name]) ? options[name] : defaults[name],
    transform,
  )
}

function confettiCannon(globalOpts) {
  let canvas = null
  let isLibCanvas = !canvas
  // 获取全局配置中的resize属性
  let allowResize = !!prop(globalOpts || {}, 'resize')
  // 标记是否已经注册了resize事件
  let hasResizeEventRegistered = false
  // 获取全局配置中的disableForReducedMotion属性
  let globalDisableForReducedMotion = prop(
    globalOpts,
    'disableForReducedMotion',
    Boolean,
  )
  // 判断是否可以使用Web Worker, TODO: Web Worker
  // let shouldUseWorker = canUseWorker && !!prop(globalOpts || {}, 'useWorker')
  // // 如果可以使用Web Worker，则获取Web Worker实例
  // let worker = shouldUseWorker ? getWorker() : null
  let worker = null
  // 根据是否有canvas传入，选择不同的resize方法
  let resizer = isLibCanvas ? setCanvasWindowSize : setCanvasRectSize
  // 判断是否已经初始化
  let initialized = canvas && worker ? !!canvas.__confetti_initialized : false
  // 判断是否设置了减少动画
  let preferLessMotion =
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion)').matches
  // 动画对象
  let animationObj

  // 本地发射函数
  const fireLocal = (options, size, done) => {
    // 彩带数量
    let particleCount = prop(options, 'particleCount', onlyPositiveInt)
    let angle = prop(options, 'angle', Number)
    let spread = prop(options, 'spread', Number)
    let startVelocity = prop(options, 'startVelocity', Number)
    let decay = prop(options, 'decay', Number)
    let gravity = prop(options, 'gravity', Number)
    let drift = prop(options, 'drift', Number)
    let colors = prop(options, 'colors', colorsToRgb)
    let ticks = prop(options, 'ticks', Number)
    let shapes = prop(options, 'shapes')
    let scalar = prop(options, 'scalar')
    let flat = !!prop(options, 'flat')
    let origin = getOrigin(options)
    // 点击位置
    let position = getPosition(options)

    let temp = particleCount
    // 彩带，发射实物。
    let fettis = []

    // let startX = canvas.width * origin.x
    // let startY = canvas.height * origin.y

    let startX = position.x
    let startY = position.y

    while (temp--) {
      fettis.push(
        randomPhysics({
          x: startX,
          y: startY,
          angle: angle,
          spread: spread,
          startVelocity: startVelocity,
          color: colors[temp % colors.length],
          shape: shapes[randomInt(0, shapes.length)],
          ticks: ticks,
          decay: decay,
          gravity: gravity,
          drift: drift,
          scalar: scalar,
          flat: flat,
        }),
      )
    }

    // if we have a previous canvas already animating,
    // add to it
    if (animationObj) {
      return animationObj.addFettis(fettis)
    }

    animationObj = animate(canvas, fettis, resizer, size, done)

    return animationObj.promise
  }

  // 发射函数
  const fire = (options) => {
    let disableForReducedMotion =
      globalDisableForReducedMotion ||
      prop(options, 'disableForReducedMotion', Boolean)
    let zIndex = prop(options, 'zIndex', Number)

    if (disableForReducedMotion && preferLessMotion) {
      return promise(function (resolve) {
        resolve()
      })
    }

    if (isLibCanvas && animationObj) {
      // use existing canvas from in-progress animation
      canvas = animationObj.canvas
    } else if (isLibCanvas && !canvas) {
      // create and initialize a new canvas
      canvas = getCanvas(zIndex)
      document.body.appendChild(canvas)
    }

    if (allowResize && !initialized) {
      // initialize the size of a user-supplied canvas
      resizer(canvas)
    }

    let size = {
      width: canvas.width,
      height: canvas.height,
    }

    if (worker && !initialized) {
      worker.init(canvas)
    }

    initialized = true

    if (worker) {
      canvas.__confetti_initialized = true
    }

    function onResize() {
      if (worker) {
        // TODO this really shouldn't be immediate, because it is expensive
        var obj = {
          getBoundingClientRect: function () {
            if (!isLibCanvas) {
              return canvas.getBoundingClientRect()
            }
          },
        }

        resizer(obj)

        worker.postMessage({
          resize: {
            width: obj.width,
            height: obj.height,
          },
        })
        return
      }

      // don't actually query the size here, since this
      // can execute frequently and rapidly
      size.width = size.height = null
    }

    function done() {
      animationObj = null

      if (allowResize) {
        hasResizeEventRegistered = false
        window.removeEventListener('resize', onResize)
      }

      if (isLibCanvas && canvas) {
        document.body.removeChild(canvas)
        canvas = null
        initialized = false
      }
    }

    if (allowResize && !hasResizeEventRegistered) {
      hasResizeEventRegistered = true
      window.addEventListener('resize', onResize, false)
    }

    if (worker) {
      return worker.fire(options, size, done)
    }

    return fireLocal(options, size, done)
  }

  fire.reset = () => {
    if (worker) {
      worker.reset()
    }

    if (animationObj) {
      animationObj.reset()
    }
  }

  return fire
}

function transformPath2D(
  pathString,
  pathMatrix,
  x,
  y,
  scaleX,
  scaleY,
  rotation,
) {
  var path2d = new Path2D(pathString)

  var t1 = new Path2D()
  t1.addPath(path2d, new DOMMatrix(pathMatrix))

  var t2 = new Path2D()
  // see https://developer.mozilla.org/en-US/docs/Web/API/DOMMatrix/DOMMatrix
  t2.addPath(
    t1,
    new DOMMatrix([
      Math.cos(rotation) * scaleX,
      Math.sin(rotation) * scaleX,
      -Math.sin(rotation) * scaleY,
      Math.cos(rotation) * scaleY,
      x,
      y,
    ]),
  )

  return t2
}

export function shapeFromPath(pathData) {
  if (!canUsePaths) {
    throw new Error('path confetti are not supported in this browser')
  }

  let path, matrix

  if (typeof pathData === 'string') {
    path = pathData
  } else {
    path = pathData.path
    matrix = pathData.matrix
  }

  let path2d = new Path2D(path)
  let tempCanvas = document.createElement('canvas')
  let tempCtx = tempCanvas.getContext('2d')

  if (!matrix) {
    // attempt to figure out the width of the path, up to 1000x1000
    let maxSize = 1000
    let minX = maxSize
    let minY = maxSize
    let maxX = 0
    let maxY = 0
    let width, height

    // do some line skipping... this is faster than checking
    // every pixel and will be mostly still correct
    for (let x = 0; x < maxSize; x += 2) {
      for (let y = 0; y < maxSize; y += 2) {
        if (tempCtx.isPointInPath(path2d, x, y, 'nonzero')) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    width = maxX - minX
    height = maxY - minY

    let maxDesiredSize = 10
    let scale = Math.min(maxDesiredSize / width, maxDesiredSize / height)

    matrix = [
      scale,
      0,
      0,
      scale,
      -Math.round(width / 2 + minX) * scale,
      -Math.round(height / 2 + minY) * scale,
    ]
  }

  return {
    type: 'path',
    path: path,
    matrix: matrix,
  }
}

export function shapeFromText(textData) {
  var text,
    scalar = 1,
    color = '#000000',
    // see https://nolanlawson.com/2022/04/08/the-struggle-of-using-native-emoji-on-the-web/
    fontFamily =
      '"Twemoji Mozilla", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "system emoji", sans-serif'

  if (typeof textData === 'string') {
    text = textData
  } else {
    text = textData.text
    scalar = 'scalar' in textData ? textData.scalar : scalar
    fontFamily = 'fontFamily' in textData ? textData.fontFamily : fontFamily
    color = 'color' in textData ? textData.color : color
  }

  // all other confetti are 10 pixels,
  // so this pixel size is the de-facto 100% scale confetti
  var fontSize = 10 * scalar
  var font = '' + fontSize + 'px ' + fontFamily

  var canvas = new OffscreenCanvas(fontSize, fontSize)
  var ctx = canvas.getContext('2d')

  ctx.font = font
  var size = ctx.measureText(text)
  var width = Math.floor(size.width)
  var height = Math.floor(
    size.fontBoundingBoxAscent + size.fontBoundingBoxDescent,
  )

  canvas = new OffscreenCanvas(width, height)
  ctx = canvas.getContext('2d')
  ctx.font = font
  ctx.fillStyle = color

  ctx.fillText(text, 0, fontSize)

  var scale = 1 / scalar

  return {
    type: 'bitmap',
    // TODO these probably need to be transfered for workers
    bitmap: canvas.transferToImageBitmap(),
    matrix: [scale, 0, 0, scale, (-width * scale) / 2, (-height * scale) / 2],
  }
}

function onlyPositiveInt(number) {
  return number < 0 ? 0 : Math.floor(number)
}

function randomInt(min, max) {
  // [min, max)
  return Math.floor(Math.random() * (max - min)) + min
}

function toDecimal(str) {
  return parseInt(str, 16)
}

function colorsToRgb(colors) {
  return colors.map(hexToRgb)
}

function hexToRgb(str) {
  let val = String(str).replace(/[^0-9a-f]/gi, '')

  if (val.length < 6) {
    val = val[0] + val[0] + val[1] + val[1] + val[2] + val[2]
  }

  return {
    r: toDecimal(val.substring(0, 2)),
    g: toDecimal(val.substring(2, 4)),
    b: toDecimal(val.substring(4, 6)),
  }
}

function getOrigin(options) {
  let origin = prop(options, 'origin', Object)
  origin.x = prop(origin, 'x', Number)
  origin.y = prop(origin, 'y', Number)

  return origin
}

function getPosition(options) {
  let position = prop(options, 'position', Object)
  position.x = prop(position, 'x', Number)
  position.y = prop(position, 'y', Number)
  return position
}

function setCanvasWindowSize(canvas) {
  canvas.width = document.documentElement.clientWidth
  canvas.height = document.documentElement.clientHeight
}

function setCanvasRectSize(canvas) {
  let rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
}

function getCanvas(zIndex) {
  let canvas = document.createElement('canvas')

  canvas.style.position = 'fixed'
  canvas.style.top = '0px'
  canvas.style.left = '0px'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = zIndex

  return canvas
}

function ellipse(
  context,
  x,
  y,
  radiusX,
  radiusY,
  rotation,
  startAngle,
  endAngle,
  antiClockwise,
) {
  context.save()
  context.translate(x, y)
  context.rotate(rotation)
  context.scale(radiusX, radiusY)
  context.arc(0, 0, 1, startAngle, endAngle, antiClockwise)
  context.restore()
}

function randomPhysics(opts) {
  // 将角度从度转换为弧度
  let radAngle = opts.angle * (Math.PI / 180)
  // 将扩散角度从度转换为弧度
  let radSpread = opts.spread * (Math.PI / 180)

  return {
    x: opts.x, // 彩带的初始x坐标
    y: opts.y, // 彩带的初始y坐标
    wobble: Math.random() * 10, // 彩带的摆动幅度，随机值在0-10之间
    wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05), // 彩带的摆动速度，随机值在0.05-0.11之间
    velocity: opts.startVelocity * 0.5 + Math.random() * opts.startVelocity, // 彩带的初始速度，随机值在startVelocity的0.5-1.5倍之间
    angle2D: -radAngle + (0.5 * radSpread - Math.random() * radSpread), // 彩带的发射角度，随机值在-angle到angle+spread之间
    tiltAngle: (Math.random() * (0.75 - 0.25) + 0.25) * Math.PI, // 彩带的倾斜角度，随机值在0.25π到0.75π之间
    color: opts.color, // 彩带的颜色
    shape: opts.shape, // 彩带的形状
    tick: 0, // 彩带的当前帧数
    totalTicks: opts.ticks, // 彩带的总帧数
    decay: opts.decay, // 彩带的衰减率
    drift: opts.drift, // 彩带的漂移量
    random: Math.random() + 2, // 用于计算彩带位置的随机值，值在2-3之间
    tiltSin: 0, // 彩带倾斜角度的正弦值，初始为0
    tiltCos: 0, // 彩带倾斜角度的余弦值，初始为0
    wobbleX: 0, // 彩带摆动的x坐标，初始为0
    wobbleY: 0, // 彩带摆动的y坐标，初始为0
    gravity: opts.gravity * 3, // 彩带受到的重力，是输入的gravity的3倍
    ovalScalar: 0.6, // 彩带的椭圆缩放比例
    scalar: opts.scalar, // 彩带的缩放比例
    flat: opts.flat, // 彩带是否为平面，true表示平面，false表示立体
  }
}

function updateFetti(context, fetti) {
  fetti.x += Math.cos(fetti.angle2D) * fetti.velocity + fetti.drift
  fetti.y += Math.sin(fetti.angle2D) * fetti.velocity + fetti.gravity
  fetti.velocity *= fetti.decay

  if (fetti.flat) {
    fetti.wobble = 0
    fetti.wobbleX = fetti.x + 10 * fetti.scalar
    fetti.wobbleY = fetti.y + 10 * fetti.scalar

    fetti.tiltSin = 0
    fetti.tiltCos = 0
    fetti.random = 1
  } else {
    fetti.wobble += fetti.wobbleSpeed
    fetti.wobbleX = fetti.x + 10 * fetti.scalar * Math.cos(fetti.wobble)
    fetti.wobbleY = fetti.y + 10 * fetti.scalar * Math.sin(fetti.wobble)

    fetti.tiltAngle += 0.1
    fetti.tiltSin = Math.sin(fetti.tiltAngle)
    fetti.tiltCos = Math.cos(fetti.tiltAngle)
    fetti.random = Math.random() + 2
  }

  var progress = fetti.tick++ / fetti.totalTicks

  var x1 = fetti.x + fetti.random * fetti.tiltCos
  var y1 = fetti.y + fetti.random * fetti.tiltSin
  var x2 = fetti.wobbleX + fetti.random * fetti.tiltCos
  var y2 = fetti.wobbleY + fetti.random * fetti.tiltSin

  context.fillStyle =
    'rgba(' +
    fetti.color.r +
    ', ' +
    fetti.color.g +
    ', ' +
    fetti.color.b +
    ', ' +
    (1 - progress) +
    ')'

  context.beginPath()

  if (
    canUsePaths &&
    fetti.shape.type === 'path' &&
    typeof fetti.shape.path === 'string' &&
    Array.isArray(fetti.shape.matrix)
  ) {
    context.fill(
      transformPath2D(
        fetti.shape.path,
        fetti.shape.matrix,
        fetti.x,
        fetti.y,
        Math.abs(x2 - x1) * 0.1,
        Math.abs(y2 - y1) * 0.1,
        (Math.PI / 10) * fetti.wobble,
      ),
    )
  } else if (fetti.shape.type === 'bitmap') {
    var rotation = (Math.PI / 10) * fetti.wobble
    var scaleX = Math.abs(x2 - x1) * 0.1
    var scaleY = Math.abs(y2 - y1) * 0.1
    var width = fetti.shape.bitmap.width * fetti.scalar
    var height = fetti.shape.bitmap.height * fetti.scalar

    var matrix = new DOMMatrix([
      Math.cos(rotation) * scaleX,
      Math.sin(rotation) * scaleX,
      -Math.sin(rotation) * scaleY,
      Math.cos(rotation) * scaleY,
      fetti.x,
      fetti.y,
    ])

    // apply the transform matrix from the confetti shape
    matrix.multiplySelf(new DOMMatrix(fetti.shape.matrix))

    var pattern = context.createPattern(fetti.shape.bitmap, 'no-repeat')
    pattern.setTransform(matrix)

    context.globalAlpha = 1 - progress
    context.fillStyle = pattern
    context.fillRect(fetti.x - width / 2, fetti.y - height / 2, width, height)
    context.globalAlpha = 1
  } else if (fetti.shape === 'circle') {
    context.ellipse
      ? context.ellipse(
          fetti.x,
          fetti.y,
          Math.abs(x2 - x1) * fetti.ovalScalar,
          Math.abs(y2 - y1) * fetti.ovalScalar,
          (Math.PI / 10) * fetti.wobble,
          0,
          2 * Math.PI,
        )
      : ellipse(
          context,
          fetti.x,
          fetti.y,
          Math.abs(x2 - x1) * fetti.ovalScalar,
          Math.abs(y2 - y1) * fetti.ovalScalar,
          (Math.PI / 10) * fetti.wobble,
          0,
          2 * Math.PI,
        )
  } else if (fetti.shape === 'star') {
    var rot = (Math.PI / 2) * 3
    var innerRadius = 4 * fetti.scalar
    var outerRadius = 8 * fetti.scalar
    var x = fetti.x
    var y = fetti.y
    var spikes = 5
    var step = Math.PI / spikes

    while (spikes--) {
      x = fetti.x + Math.cos(rot) * outerRadius
      y = fetti.y + Math.sin(rot) * outerRadius
      context.lineTo(x, y)
      rot += step

      x = fetti.x + Math.cos(rot) * innerRadius
      y = fetti.y + Math.sin(rot) * innerRadius
      context.lineTo(x, y)
      rot += step
    }
  } else {
    context.moveTo(Math.floor(fetti.x), Math.floor(fetti.y))
    context.lineTo(Math.floor(fetti.wobbleX), Math.floor(y1))
    context.lineTo(Math.floor(x2), Math.floor(y2))
    context.lineTo(Math.floor(x1), Math.floor(fetti.wobbleY))
  }

  context.closePath()
  context.fill()

  return fetti.tick < fetti.totalTicks
}

function animate(canvas, fettis, resizer, size, done) {
  let animatingFettis = fettis.slice()
  let context = canvas.getContext('2d')
  let animationFrame
  let destroy

  const prom = promise(function (resolve) {
    function onDone() {
      animationFrame = destroy = null

      context.clearRect(0, 0, size.width, size.height)

      done()
      resolve()
    }

    function update() {
      // TODO: isWorker 判断当前js是否在webworker环境中
      // if (
      //   isWorker &&
      //   !(size.width === workerSize.width && size.height === workerSize.height)
      // ) {
      //   size.width = canvas.width = workerSize.width
      //   size.height = canvas.height = workerSize.height
      // }

      if (!size.width && !size.height) {
        resizer(canvas)
        size.width = canvas.width
        size.height = canvas.height
      }

      context.clearRect(0, 0, size.width, size.height)

      animatingFettis = animatingFettis.filter(function (fetti) {
        return updateFetti(context, fetti)
      })

      if (animatingFettis.length) {
        animationFrame = raf.frame(update)
      } else {
        onDone()
      }
    }

    animationFrame = raf.frame(update)
    destroy = onDone
  })

  return {
    addFettis: function (fettis) {
      animatingFettis = animatingFettis.concat(fettis)

      return prom
    },
    canvas: canvas,
    promise: prom,
    reset: function () {
      if (animationFrame) {
        raf.cancel(animationFrame)
      }

      if (destroy) {
        destroy()
      }
    },
  }
}

const confetti = confettiCannon({ useWorker: false, resize: true })

export default confetti
