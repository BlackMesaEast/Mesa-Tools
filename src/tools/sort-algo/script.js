const slider = document.getElementById('speed')
const label = document.getElementById('speed-val')
label.textContent = slider.value
slider.addEventListener('input', () => (label.textContent = slider.value))

const valueCountSlider = document.getElementById('value-count')
const valueCountLabel = document.getElementById('value-count-val')
valueCountLabel.textContent = valueCountSlider.value
valueCountSlider.addEventListener('input', () => {
  valueCountLabel.textContent = valueCountSlider.value
  newValues()
})

let values = [100, 50, 75, 25, 150, 125, 175, 200, 300, 275, 350, 325]
let barObjects = [] // { currentX, targetX } — parallel to values[]
let sortGen = null
let sortInterval = null
let isSorting = false
let compareIndices = []
let swapIndices = []
let sortedIndices = new Set()

const bg = getComputedStyle(document.documentElement)
  .getPropertyValue('--surface')
  .trim()

function barWidth() {
  const margin = 4
  return (width - margin * (values.length + 1)) / values.length
}

function targetX(index) {
  const margin = 4
  return margin + index * (barWidth() + margin)
}

function initBars(snap) {
  barObjects = values.map((_, i) => ({
    currentX: snap ? targetX(i) : (barObjects[i]?.currentX ?? targetX(i)),
    targetX: targetX(i),
  }))
}

function newValues() {
  stopSort()
  values = []
  const count = parseInt(valueCountSlider.value, 10)
  for (let i = 0; i < count; i++) {
    values.push(Math.floor(Math.random() * 400) + 20)
  }
  displayValues = [...values]
  initBars(true)
}

function shuffleValues() {
  stopSort()
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[values[i], values[j]] = [values[j], values[i]]
  }
  displayValues = [...values]
  initBars(true)
}

// ── Sorting algorithms ──

function* bubbleSort() {
  const n = values.length
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      yield { type: 'compare', a: j, b: j + 1 }
      if (values[j] > values[j + 1]) {
        ;[values[j], values[j + 1]] = [values[j + 1], values[j]]
        yield { type: 'swap', a: j, b: j + 1 }
      }
    }
    yield { type: 'sorted', indices: [n - 1 - i] }
  }
  yield { type: 'sorted', indices: [0] }
  yield { type: 'done' }
}

function* partition(lo, hi) {
  const pivot = values[hi]
  let i = lo - 1
  for (let j = lo; j < hi; j++) {
    yield { type: 'compare', a: j, b: hi }
    if (values[j] <= pivot) {
      i++
      ;[values[i], values[j]] = [values[j], values[i]]
      if (i !== j) yield { type: 'swap', a: i, b: j }
    }
  }
  ;[values[i + 1], values[hi]] = [values[hi], values[i + 1]]
  yield { type: 'swap', a: i + 1, b: hi }
  return i + 1
}

function* quickSort(lo = 0, hi = values.length - 1) {
  if (lo >= hi) {
    if (lo === hi) yield { type: 'sorted', indices: [lo] }
    return
  }
  const pivotIdx = yield* partition(lo, hi)
  yield { type: 'sorted', indices: [pivotIdx] }
  yield* quickSort(lo, pivotIdx - 1)
  yield* quickSort(pivotIdx + 1, hi)
}

function* mergeSort(lo = 0, hi = values.length - 1) {
  if (lo >= hi) return
  const mid = (lo + hi) >> 1
  yield* mergeSort(lo, mid)
  yield* mergeSort(mid + 1, hi)
  yield* merge(lo, mid, hi)
}

function* merge(lo, mid, hi) {
  const left = values.slice(lo, mid + 1)
  const right = values.slice(mid + 1, hi + 1)
  let i = 0,
    j = 0,
    k = lo
  while (i < left.length && j < right.length) {
    yield { type: 'compare', a: k, b: k }
    if (left[i] <= right[j]) values[k] = left[i++]
    else values[k] = right[j++]
    yield { type: 'overwrite', index: k }
    k++
  }
  while (i < left.length) {
    values[k] = left[i++]
    yield { type: 'overwrite', index: k }
    k++
  }
  while (j < right.length) {
    values[k] = right[j++]
    yield { type: 'overwrite', index: k }
    k++
  }
}

// ── Step driver ──

function startSort() {
  if (isSorting) {
    stopSort()
    return
  }
  const algo = document.getElementById('algorithm').value
  initBars(true)
  sortedIndices = new Set()
  isSorting = true
  sortGen =
    algo === 'bubble'
      ? bubbleSort()
      : algo === 'merge'
        ? (function* () {
            yield* mergeSort()
            yield { type: 'sorted', indices: [...values.keys()] }
            yield { type: 'done' }
          })()
        : (function* () {
            yield* quickSort()
            yield { type: 'done' }
          })()
  document.querySelector('.controls .primary').textContent = 'Stop'
  scheduleTick()
}

function scheduleTick() {
  const delay = parseInt(document.getElementById('speed').value, 10)
  sortInterval = setTimeout(() => {
    stepSort()
    if (isSorting) scheduleTick()
  }, delay)
}

function stepSort() {
  const result = sortGen.next()
  if (result.done || !result.value) {
    finishSort()
    return
  }
  const step = result.value
  compareIndices = []
  swapIndices = []
  if (step.type === 'compare') compareIndices = [step.a, step.b]
  else if (step.type === 'swap') {
    swapIndices = [step.a, step.b]
    ;[barObjects[step.a], barObjects[step.b]] = [
      barObjects[step.b],
      barObjects[step.a],
    ]
    barObjects[step.a].targetX = targetX(step.a)
    barObjects[step.b].targetX = targetX(step.b)
  } else if (step.type === 'overwrite') {
    swapIndices = [step.index]
    barObjects[step.index].targetX = targetX(step.index)
  } else if (step.type === 'sorted')
    step.indices.forEach((i) => sortedIndices.add(i))
  else if (step.type === 'done') finishSort()
}

function finishSort() {
  clearTimeout(sortInterval)
  sortGen = null
  sortInterval = null
  isSorting = false
  compareIndices = []
  swapIndices = []
  for (let i = 0; i < values.length; i++) sortedIndices.add(i)
  document.querySelector('.controls .primary').textContent = 'Sort'
}

function stopSort() {
  clearTimeout(sortInterval)
  sortGen = null
  sortInterval = null
  isSorting = false
  compareIndices = []
  swapIndices = []
  sortedIndices = new Set()
  document.querySelector('.controls .primary').textContent = 'Sort'
}

// ── p5 ──

const LERP_FACTOR = 0.18

function setup() {
  let container = document.getElementById('canvas-container')
  let canvas = createCanvas(container.offsetWidth, container.offsetHeight)
  canvas.parent(container)
  initBars(true)
}

let displayValues = [...values]

function draw() {
  background(bg)
  const mode = document.getElementById('anim-mode').value
  if (mode === 'move') {
    for (let i = 0; i < barObjects.length; i++) {
      barObjects[i].currentX = lerp(
        barObjects[i].currentX,
        barObjects[i].targetX,
        LERP_FACTOR,
      )
    }
  } else {
    for (let i = 0; i < values.length; i++) {
      displayValues[i] = lerp(
        displayValues[i] ?? values[i],
        values[i],
        LERP_FACTOR,
      )
    }
  }
  drawValues()
}

function drawValues() {
  const bw = barWidth()
  const mode = document.getElementById('anim-mode').value
  noStroke()
  for (let i = 0; i < values.length; i++) {
    if (swapIndices.includes(i)) fill('#4f8ef7')
    else if (compareIndices.includes(i)) fill('#f7d44f')
    else if (sortedIndices.has(i)) fill('#4fc97a')
    else fill(255)
    if (mode === 'move') {
      rect(barObjects[i].currentX, height - values[i], bw, values[i])
    } else {
      const x = 4 + i * (bw + 4)
      rect(x, height - displayValues[i], bw, displayValues[i])
    }
  }
}

function windowResized() {
  let container = document.getElementById('canvas-container')
  resizeCanvas(container.offsetWidth, container.offsetHeight)
  initBars(true)
}
