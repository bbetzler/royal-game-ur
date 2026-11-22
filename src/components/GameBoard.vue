<script setup lang="ts">
import { computed } from 'vue'
import { type GameState, type Move, squareOf } from '../game/engine'
import { COLS, ROWS, type Player, type RuleConfig, type Square, isGap, isRosette, sameSquare } from '../game/rules'
import circles from '../assets/board/circles.jpg'
import eyes from '../assets/board/eyes.jpg'
import grid from '../assets/board/grid.jpg'
import rosette from '../assets/board/rosette.jpg'
import zigzag from '../assets/board/zigzag.jpg'

// Tile artwork for the plain squares, one string per screen row (= board column), one letter
// per screen column (= board row). Rosettes come from the rule config and replace these;
// '-' marks a gap. The lanes mirror each other, as on the original board.
const TILES: Record<string, string> = { C: circles, E: eyes, G: grid, Z: zigzag }
const TILE_LAYOUT = ['ZEZ', 'CZC', 'GCG', 'CEC', '-G-', '-E-', 'ZCZ', 'ZGZ']

const props = defineProps<{
  state: GameState
  rules: RuleConfig
  /** Moves the human may pick right now (empty when it is not their move). */
  moves: Move[]
}>()

const emit = defineEmits<{ select: [move: Move] }>()

interface Cell {
  sq: Square
  gap: boolean
  rosette: boolean
  image: string
  piece: Player | null
  move: Move | null // a selectable move whose piece stands here
  target: boolean // a selectable move ends here
}

// The board is drawn upright for portrait screens: board columns become screen rows,
// black's lane is on the left, white's lane on the right.
const cells = computed<Cell[]>(() => {
  const out: Cell[] = []
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const sq = { row, col }
      let piece: Player | null = null
      for (const p of ['white', 'black'] as Player[]) {
        if (props.state.pieces[p].some((pos) => eq(squareOf(props.rules, p, pos), sq))) piece = p
      }
      const move = props.moves.find((m) => eq(squareOf(props.rules, m.player, m.from), sq)) ?? null
      const target = props.moves.some((m) => eq(squareOf(props.rules, m.player, m.to), sq))
      const isRos = isRosette(props.rules, sq)
      const image = isRos ? rosette : (TILES[TILE_LAYOUT[col][row]] ?? '')
      out.push({ sq, gap: isGap(sq), rosette: isRos, image, piece, move, target })
    }
  }
  return out
})

function eq(a: Square | null, b: Square) {
  return a !== null && sameSquare(a, b)
}

function tap(cell: Cell) {
  if (cell.move) emit('select', cell.move)
}
</script>

<template>
  <div class="board">
    <div
      v-for="cell in cells"
      :key="`${cell.sq.row}-${cell.sq.col}`"
      class="cell"
      :class="{ gap: cell.gap, rosette: cell.rosette, movable: cell.move, target: cell.target }"
      @click="tap(cell)"
    >
      <img v-if="!cell.gap" class="tile" :src="cell.image" :alt="cell.rosette ? 'rosette' : ''" draggable="false" />
      <span v-if="cell.target && !cell.piece" class="target-dot" />
      <span v-if="cell.piece" class="piece" :class="cell.piece" />
    </div>
  </div>
</template>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(3, var(--cell));
  grid-template-rows: repeat(8, var(--cell));
  justify-content: center;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.6));
}
/* Each square sits in a lapis frame; neighbouring frames form the grout lines. */
.cell {
  --grout: calc(var(--cell) * 0.1);
  position: relative;
  background: url('../assets/board/lapis.jpg') center / calc(var(--cell) * 0.66) auto repeat;
  display: grid;
  place-items: center;
}
.cell.gap {
  visibility: hidden;
}
.tile {
  position: absolute;
  inset: var(--grout);
  width: calc(100% - 2 * var(--grout));
  height: calc(100% - 2 * var(--grout));
  object-fit: cover;
  pointer-events: none;
}
.cell::after {
  content: '';
  position: absolute;
  inset: var(--grout);
  pointer-events: none;
}
.cell.movable {
  cursor: pointer;
}
.cell.movable::after {
  box-shadow: inset 0 0 0 4px var(--highlight);
}
.cell.target::after {
  border: 3px dashed var(--highlight);
}
.target-dot {
  position: relative;
  width: 25%;
  height: 25%;
  border-radius: 50%;
  background: var(--target);
  box-shadow: 0 0 0 3px var(--piece-black);
}
.piece {
  position: relative;
  width: 62%;
  height: 62%;
  border-radius: 50%;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.55);
}
.piece.white {
  background: var(--piece-white);
  border: 3px solid var(--piece-black);
}
.piece.black {
  background: var(--piece-black);
  border: 3px solid var(--piece-white);
}
</style>
