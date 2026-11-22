<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { type GameState, type Move, finishPos, squareOf } from '../game/engine'
import { COLS, GAPS, ROWS, type Player, type RuleConfig, type Square, isGap, isRosette, sameSquare } from '../game/rules'
import circles from '../assets/board/circles.jpg'
import eyes from '../assets/board/eyes.jpg'
import grid from '../assets/board/grid.jpg'
import lapis from '../assets/board/lapis.jpg'
import rosette from '../assets/board/rosette.jpg'
import zigzag from '../assets/board/zigzag.jpg'

// Same tile layout as the 2D board (GameBoard.vue): one string per board column, one letter
// per board row. Rosettes come from the rule config and replace these; '-' marks a gap.
const TILES: Record<string, string> = { C: circles, E: eyes, G: grid, Z: zigzag }
const TILE_LAYOUT = ['ZEZ', 'CZC', 'GCG', 'CEC', '-G-', '-E-', 'ZCZ', 'ZGZ']

const props = defineProps<{
  state: GameState
  rules: RuleConfig
  /** Moves the human may pick right now (empty when it is not their move). */
  moves: Move[]
}>()

const emit = defineEmits<{ select: [move: Move] }>()

const host = ref<HTMLDivElement | null>(null)

// World units: one square is 1 × 1, and the board is as high as a square is wide.
// Board row r (0 = black's lane) runs along x, column c along z with column 0 farthest away,
// so the board stands upright on a portrait screen like the 2D board.
const HEIGHT = 1
const PX = 128 // texture pixels per square
const GROUT = 0.1 // lapis frame around each tile, as a fraction of a square
const PIECE_R = 0.31
const PIECE_H = 0.16
// Camera direction: looking down at the board from the front and a little from the right.
const ELEVATION = THREE.MathUtils.degToRad(52)
const AZIMUTH = THREE.MathUtils.degToRad(14)
const FOV = 30

const center = (sq: Square) => new THREE.Vector3(sq.row - ROWS / 2 + 0.5, HEIGHT, sq.col - COLS / 2 + 0.5)

let renderer: THREE.WebGLRenderer | undefined
let resizeObserver: ResizeObserver | undefined
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
const raycaster = new THREE.Raycaster()

// --- Board top: the 2D tile artwork painted into a canvas texture, redrawn for highlights ---

const topCanvas = document.createElement('canvas')
topCanvas.width = ROWS * PX
topCanvas.height = COLS * PX
const topTexture = new THREE.CanvasTexture(topCanvas)
topTexture.colorSpace = THREE.SRGBColorSpace
topTexture.anisotropy = 8
// The top cap's UVs are the shape coordinates (x = row 0..3, y = 8 - col), see boardGeometry().
topTexture.repeat.set(1 / ROWS, 1 / COLS)

const images: Record<string, HTMLImageElement> = {}
function loadImages(): Promise<unknown> {
  return Promise.all(
    [circles, eyes, grid, lapis, rosette, zigzag].map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image()
          img.onload = img.onerror = resolve
          img.src = src
          images[src] = img
        }),
    ),
  )
}

/** Draw an image to fill a box, cropping it like CSS `object-fit: cover`. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height)
  const sw = w / scale
  const sh = h / scale
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

function paintTop() {
  const ctx = topCanvas.getContext('2d')!
  ctx.clearRect(0, 0, topCanvas.width, topCanvas.height)
  const lapisImg = images[lapis]
  if (lapisImg?.width) {
    const pattern = ctx.createPattern(lapisImg, 'repeat')!
    const s = (PX * 0.66) / lapisImg.width // as in the 2D board's lapis background size
    pattern.setTransform(new DOMMatrix().scale(s, s))
    ctx.fillStyle = pattern
  } else {
    ctx.fillStyle = '#1d3a8a'
  }
  ctx.fillRect(0, 0, topCanvas.width, topCanvas.height)

  const g = PX * GROUT
  const inner = PX - 2 * g
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const sq = { row, col }
      if (isGap(sq)) continue
      const x = row * PX
      const y = col * PX
      const src = isRosette(props.rules, sq) ? rosette : TILES[TILE_LAYOUT[col][row]]
      const img = images[src]
      if (img?.width) drawCover(ctx, img, x + g, y + g, inner, inner)

      const movable = props.moves.some((m) => eq(squareOf(props.rules, m.player, m.from), sq))
      const isTarget = props.moves.some((m) => eq(squareOf(props.rules, m.player, m.to), sq))
      ctx.strokeStyle = '#ffd23f'
      if (movable) {
        ctx.lineWidth = PX * 0.08
        ctx.setLineDash([])
        ctx.strokeRect(x + g + ctx.lineWidth / 2, y + g + ctx.lineWidth / 2, inner - ctx.lineWidth, inner - ctx.lineWidth)
      }
      if (isTarget) {
        ctx.lineWidth = PX * 0.06
        ctx.setLineDash([PX * 0.08, PX * 0.06])
        ctx.strokeRect(x + g + ctx.lineWidth / 2, y + g + ctx.lineWidth / 2, inner - ctx.lineWidth, inner - ctx.lineWidth)
        if (!occupied(sq)) {
          ctx.beginPath()
          ctx.arc(x + PX / 2, y + PX / 2, PX * 0.125, 0, Math.PI * 2)
          ctx.fillStyle = '#ffd23f'
          ctx.fill()
          ctx.lineWidth = PX * 0.05
          ctx.setLineDash([])
          ctx.strokeStyle = '#1a1410'
          ctx.stroke()
        }
      }
    }
  }
  topTexture.needsUpdate = true
}

// --- Board sides: a neutral, sandy stone texture made procedurally ---

function stoneTexture(): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#cdbfa6'
  ctx.fillRect(0, 0, size, size)
  // Soft blotches, then fine speckle, for a worn sandstone look.
  for (let i = 0; i < 140; i++) {
    const r = 6 + Math.random() * 26
    const light = Math.random() < 0.5
    ctx.fillStyle = light ? 'rgba(255,248,232,0.07)' : 'rgba(120,100,75,0.07)'
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 5000; i++) {
    const v = Math.random()
    ctx.fillStyle = v < 0.5 ? `rgba(95,78,58,${0.1 + v * 0.3})` : `rgba(255,250,238,${(v - 0.5) * 0.4})`
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random(), 1 + Math.random())
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(0.5, 0.5)
  return tex
}

/** The board outline (3 × 8 minus the gaps beside the bridge), extruded to the board height. */
function boardGeometry(): THREE.ExtrudeGeometry {
  // Shape coordinates: x = board row (0..3), y = COLS - board column.
  const gapCols = GAPS.map((g) => g.col)
  const y0 = COLS - (Math.max(...gapCols) + 1)
  const y1 = COLS - Math.min(...gapCols)
  const pts: [number, number][] = [
    [0, 0], [3, 0], [3, y0], [2, y0], [2, y1], [3, y1], [3, COLS], [0, COLS], [0, y1], [1, y1], [1, y0], [0, y0],
  ]
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))
  const geo = new THREE.ExtrudeGeometry(shape, { depth: HEIGHT, bevelEnabled: false })
  // Lay the shape flat: extrusion becomes height, shape y becomes depth (column 0 farthest).
  geo.rotateX(-Math.PI / 2)
  geo.translate(-ROWS / 2, 0, COLS / 2)
  return geo
}

const board = new THREE.Mesh(boardGeometry(), [
  new THREE.MeshStandardMaterial({ map: topTexture, roughness: 0.75 }), // top and bottom caps
  new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.95 }), // sides
])
board.castShadow = true
board.receiveShadow = true
scene.add(board)

// A floor that only shows the board's and pieces' shadows over the page background.
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.45 }))
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2e24, 1.6))
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2)
sun.position.set(-4, 9, 3)
sun.castShadow = true
sun.shadow.mapSize.set(1024, 1024)
sun.shadow.camera.left = sun.shadow.camera.bottom = -7
sun.shadow.camera.right = sun.shadow.camera.top = 7
sun.shadow.bias = -0.0005
sun.shadow.normalBias = 0.02
scene.add(sun)

// --- Pieces: discs with a contrasting ring on top, as on the 2D board ---

function pieceTopTexture(fill: string, ring: string): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = ring
  ctx.fillRect(0, 0, 128, 128)
  ctx.beginPath()
  ctx.arc(64, 64, 52, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const pieceGeometry = new THREE.CylinderGeometry(PIECE_R, PIECE_R, PIECE_H, 48)
const pieceMaterials: Record<Player, THREE.Material[]> = {
  white: [
    new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ map: pieceTopTexture('#fffdf7', '#1a1410'), roughness: 0.4 }),
  ],
  black: [
    new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ map: pieceTopTexture('#1a1410', '#fffdf7'), roughness: 0.4 }),
  ],
}
// One mesh per piece and player; pieces off the board (waiting or home) are hidden.
const pieceMeshes: Record<Player, THREE.Mesh[]> = { white: [], black: [] }
for (const p of ['white', 'black'] as Player[]) {
  const [side, top] = pieceMaterials[p]
  for (let i = 0; i < props.rules.piecesPerPlayer; i++) {
    const mesh = new THREE.Mesh(pieceGeometry, [side, top, side])
    mesh.castShadow = true
    mesh.visible = false
    scene.add(mesh)
    pieceMeshes[p].push(mesh)
  }
}

function placePieces() {
  for (const p of ['white', 'black'] as Player[]) {
    props.state.pieces[p].forEach((pos, i) => {
      const mesh = pieceMeshes[p][i]
      const sq = squareOf(props.rules, p, pos)
      mesh.visible = sq !== null && pos !== finishPos(props.rules)
      if (sq) mesh.position.copy(center(sq)).setY(HEIGHT + PIECE_H / 2)
    })
  }
}

// --- Camera, rendering and input ---

/** Place the camera so the whole board fills the canvas, centered. */
function fitCamera(width: number, height: number) {
  camera.aspect = width / height
  const dir = new THREE.Vector3(
    Math.sin(AZIMUTH) * Math.cos(ELEVATION),
    Math.sin(ELEVATION),
    Math.cos(AZIMUTH) * Math.cos(ELEVATION),
  )
  const corners: THREE.Vector3[] = []
  for (const x of [-ROWS / 2, ROWS / 2]) for (const y of [0, HEIGHT]) for (const z of [-COLS / 2, COLS / 2]) corners.push(new THREE.Vector3(x, y, z))
  const look = new THREE.Vector3(0, HEIGHT / 2, 0)
  const place = (d: number) => {
    camera.position.copy(look).addScaledVector(dir, d)
    camera.lookAt(look)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }
  const bounds = () => {
    const box = new THREE.Box2()
    for (const c of corners) {
      const p = c.clone().project(camera)
      box.expandByPoint(new THREE.Vector2(p.x, p.y))
    }
    return box
  }
  const halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  let dist = 20
  // Find the nearest distance where every corner is on screen, then shift the camera sideways
  // so the board's on-screen box is centered, and repeat; this converges in a few rounds.
  for (let i = 0; i < 4; i++) {
    let lo = 2
    let hi = 80
    for (let j = 0; j < 30; j++) {
      dist = (lo + hi) / 2
      place(dist)
      const box = bounds()
      if (Math.max(-box.min.x, box.max.x, -box.min.y, box.max.y) <= 0.96) hi = dist
      else lo = dist
    }
    dist = hi
    place(dist)
    const mid = bounds().getCenter(new THREE.Vector2())
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
    look.addScaledVector(right, mid.x * dist * halfH * camera.aspect).addScaledVector(up, mid.y * dist * halfH)
  }
  place(dist)
}

function render() {
  renderer?.render(scene, camera)
}

function resize() {
  const el = host.value
  if (!el || !renderer) return
  const { clientWidth: w, clientHeight: h } = el
  if (w === 0 || h === 0) return
  renderer.setSize(w, h, false)
  fitCamera(w, h)
  render()
}

function update() {
  paintTop()
  placePieces()
  render()
}

function onTap(e: MouseEvent) {
  const el = host.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
  const hit = raycaster.intersectObjects([board, ...pieceMeshes.white, ...pieceMeshes.black], false)[0]
  if (!hit) return
  const sq = { row: Math.floor(hit.point.x + ROWS / 2), col: Math.floor(hit.point.z + COLS / 2) }
  const move = props.moves.find((m) => eq(squareOf(props.rules, m.player, m.from), sq))
  if (move) emit('select', move)
}

function eq(a: Square | null, b: Square) {
  return a !== null && sameSquare(a, b)
}

function occupied(sq: Square) {
  return (['white', 'black'] as Player[]).some((p) => props.state.pieces[p].some((pos) => eq(squareOf(props.rules, p, pos), sq)))
}

onMounted(async () => {
  const el = host.value!
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  el.appendChild(renderer.domElement)
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(el)
  update()
  resize()
  await loadImages()
  update()
})

watch(() => [props.state, props.moves], update)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  renderer?.dispose()
})
</script>

<template>
  <div ref="host" class="board3d" @click="onTap" />
</template>

<style scoped>
.board3d {
  width: 100%;
  max-width: 400px;
  height: calc(var(--cell) * 8);
  touch-action: manipulation;
}
.board3d :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
