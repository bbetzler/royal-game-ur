<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GameBoard from './components/GameBoard.vue'
import { chooseMove } from './game/ai'
import { type GameState, type Move, applyMove, applyRoll, finishPos, legalMoves, newGame, passTurn } from './game/engine'
import { FINKEL_RULES, type Player } from './game/rules'

const rules = FINKEL_RULES
const HUMAN: Player = 'white'
const COMPUTER: Player = 'black'
const DELAY = 800

const state = ref<GameState>(newGame(rules, HUMAN))
const message = ref('Your turn. Roll the dice.')
let timer: ReturnType<typeof setTimeout> | undefined

const moves = computed(() => legalMoves(state.value, rules))
const humanMoves = computed(() => (state.value.turn === HUMAN ? moves.value : []))
const canRoll = computed(() => state.value.turn === HUMAN && state.value.phase === 'roll')
const startMove = computed(() => humanMoves.value.find((m) => m.from === 0) ?? null)

const waiting = (p: Player) => state.value.pieces[p].filter((pos) => pos === 0).length
const finished = (p: Player) => state.value.pieces[p].filter((pos) => pos === finishPos(rules)).length
const label = (p: Player) => (p === HUMAN ? 'You' : 'Computer')

function later(fn: () => void, ms = DELAY) {
  clearTimeout(timer)
  timer = setTimeout(fn, ms)
}

function roll() {
  state.value = applyRoll(state.value, rules)
  const who = label(state.value.turn)
  if (moves.value.length === 0) {
    message.value =
      state.value.roll === 0 ? `${who} rolled 0. No move.` : `${who} rolled ${state.value.roll}. No legal move.`
    later(() => {
      state.value = passTurn(state.value)
    }, DELAY * 1.5)
  } else if (state.value.turn === HUMAN) {
    message.value = `You rolled ${state.value.roll}. Tap a highlighted piece.`
  } else {
    message.value = `Computer rolled ${state.value.roll}.`
  }
}

function play(move: Move) {
  const you = move.player === HUMAN
  state.value = applyMove(state.value, rules, move)
  if (state.value.phase === 'over') {
    message.value = state.value.winner === HUMAN ? 'You win! 🎉' : 'The computer wins.'
    return
  }
  const notes: string[] = []
  if (move.captures) notes.push(you ? 'You captured a piece!' : 'The computer captured your piece!')
  if (move.bearsOff) notes.push(you ? 'Your piece reached home.' : 'A computer piece reached home.')
  if (state.value.turn === move.player) notes.push(you ? 'Rosette! Roll again.' : 'Rosette: the computer rolls again.')
  else notes.push(state.value.turn === HUMAN ? 'Your turn. Roll the dice.' : "Computer's turn.")
  message.value = notes.join(' ')
}

function select(move: Move) {
  if (state.value.turn === HUMAN) play(move)
}

function restart() {
  clearTimeout(timer)
  state.value = newGame(rules, HUMAN)
  message.value = 'Your turn. Roll the dice.'
}

// Drive the computer's turn.
watch(
  () => [state.value.turn, state.value.phase, state.value.roll] as const,
  ([turn, phase]) => {
    if (turn !== COMPUTER) return
    if (phase === 'roll') later(roll)
    else if (phase === 'move' && moves.value.length > 0) {
      const m = chooseMove(state.value, rules, moves.value)
      if (m) later(() => play(m))
    }
  },
)
</script>

<template>
  <main class="app">
    <header class="bar">
      <span class="who"><span class="dot black" /> Computer</span>
      <span>Start: {{ waiting(COMPUTER) }}</span>
      <span>Home: {{ finished(COMPUTER) }}/{{ rules.piecesPerPlayer }}</span>
    </header>

    <GameBoard :state="state" :rules="rules" :moves="humanMoves" @select="select" />

    <section class="bar">
      <span class="who"><span class="dot white" /> You</span>
      <button class="pool" :class="{ movable: startMove }" :disabled="!startMove" @click="startMove && select(startMove)">
        Start: {{ waiting(HUMAN) }}
      </button>
      <span>Home: {{ finished(HUMAN) }}/{{ rules.piecesPerPlayer }}</span>
    </section>

    <p class="message" aria-live="polite">{{ message }}</p>

    <div class="controls">
      <div class="dice" aria-label="dice">
        <span v-for="(d, i) in state.dice" :key="i" class="die" :class="{ marked: d === 1 }" />
        <strong v-if="state.roll !== null" class="roll">{{ state.roll }}</strong>
      </div>
      <button v-if="state.phase !== 'over'" class="roll-btn" :disabled="!canRoll" @click="roll">Roll dice</button>
      <button v-else class="roll-btn" @click="restart">New game</button>
    </div>
    <button class="link" @click="restart">Restart</button>
  </main>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  max-width: 480px;
  margin: 0 auto;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 360px;
  font-size: 0.95rem;
}
.who {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #000;
}
.dot.white {
  background: #fff;
}
.dot.black {
  background: #000;
}
.pool {
  font: inherit;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--muted);
  background: transparent;
  color: inherit;
}
.pool.movable {
  outline: 3px solid var(--highlight);
  cursor: pointer;
}
.message {
  min-height: 2.6em;
  margin: 0;
  text-align: center;
}
.controls {
  display: flex;
  align-items: center;
  gap: 16px;
}
.dice {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 120px;
}
.die {
  width: 0;
  height: 0;
  border-left: 11px solid transparent;
  border-right: 11px solid transparent;
  border-bottom: 20px solid var(--die);
  position: relative;
}
.die.marked::after {
  content: '';
  position: absolute;
  left: -3px;
  top: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
}
.roll {
  font-size: 1.6rem;
  margin-left: 6px;
}
.roll-btn {
  font: inherit;
  font-size: 1.1rem;
  font-weight: 600;
  padding: 12px 22px;
  border-radius: 10px;
  border: none;
  background: var(--button);
  color: var(--button-text);
  cursor: pointer;
}
.roll-btn:disabled {
  background: var(--bg);
  color: var(--text);
  box-shadow: inset 0 0 0 2px var(--text);
  cursor: default;
}
.link {
  background: none;
  border: none;
  color: var(--muted);
  text-decoration: underline;
  font: inherit;
  cursor: pointer;
}
</style>
