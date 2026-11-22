<script setup lang="ts">
import { computed } from 'vue'
import { type GameState, type Move, squareOf } from '../game/engine'
import { COLS, ROWS, type Player, type RuleConfig, type Square, isGap, isRosette, sameSquare } from '../game/rules'

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
      out.push({ sq, gap: isGap(sq), rosette: isRosette(props.rules, sq), piece, move, target })
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
      <span v-if="cell.rosette" class="rosette-mark" aria-label="rosette">✿</span>
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
  gap: 3px;
  justify-content: center;
}
.cell {
  position: relative;
  background: var(--square);
  border: 2px solid var(--square-border);
  display: grid;
  place-items: center;
}
.cell.gap {
  visibility: hidden;
}
.cell.rosette {
  background: var(--rosette);
}
.rosette-mark {
  position: absolute;
  font-size: calc(var(--cell) * 0.7);
  line-height: 1;
  color: var(--rosette-mark);
  pointer-events: none;
}
.cell.movable {
  cursor: pointer;
  box-shadow: inset 0 0 0 4px var(--highlight);
}
.cell.target {
  border-style: dashed;
  border-width: 3px;
}
.target-dot {
  width: 25%;
  height: 25%;
  border-radius: 50%;
  background: var(--target);
}
.piece {
  position: relative;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  border: 2px solid #000;
}
.piece.white {
  background: #fff;
}
.piece.black {
  background: #000;
}
</style>
