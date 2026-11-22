// Pure game logic, independent of the UI.
//
// Piece positions: 0 = waiting at the start, 1..pathLength = on the board
// (path position), pathLength + 1 = borne off (finished).

import { type Player, type RuleConfig, type Square, isRosette, opponent, sameSquare } from './rules'

export type Phase = 'roll' | 'move' | 'over'

export interface GameState {
  pieces: Record<Player, number[]>
  turn: Player
  phase: Phase
  /** Movement of the current roll, or null before rolling. */
  roll: number | null
  /** The individual dice of the current roll (1 = marked), for display. */
  dice: number[]
  winner: Player | null
}

export interface Move {
  player: Player
  piece: number
  from: number
  to: number
  captures: boolean
  landsOnRosette: boolean
  bearsOff: boolean
}

export type Rng = () => number

export const pathLength = (rules: RuleConfig) => rules.paths.white.length
export const finishPos = (rules: RuleConfig) => pathLength(rules) + 1

export function newGame(rules: RuleConfig, first: Player = 'white'): GameState {
  return {
    pieces: {
      white: Array(rules.piecesPerPlayer).fill(0),
      black: Array(rules.piecesPerPlayer).fill(0),
    },
    turn: first,
    phase: 'roll',
    roll: null,
    dice: [],
    winner: null,
  }
}

/** The board square of a path position, or null when off the board. */
export function squareOf(rules: RuleConfig, player: Player, pos: number): Square | null {
  if (pos < 1 || pos > pathLength(rules)) return null
  return rules.paths[player][pos - 1]
}

export function rollDice(rules: RuleConfig, rng: Rng = Math.random): { dice: number[]; value: number } {
  const dice = Array.from({ length: rules.dice.count }, (): number => (rng() < 0.5 ? 1 : 0))
  const marked = dice.reduce((a, b) => a + b, 0)
  return { dice, value: marked === 0 ? rules.dice.zeroMoves : marked }
}

/** Who (if anyone) stands on a board square. */
function occupant(state: GameState, rules: RuleConfig, sq: Square): { player: Player; piece: number } | null {
  for (const player of ['white', 'black'] as Player[]) {
    const idx = state.pieces[player].findIndex((pos) => {
      const s = squareOf(rules, player, pos)
      return s !== null && sameSquare(s, sq)
    })
    if (idx >= 0) return { player, piece: idx }
  }
  return null
}

export function legalMoves(state: GameState, rules: RuleConfig): Move[] {
  if (state.phase !== 'move' || state.roll === null || state.roll === 0) return []
  const player = state.turn
  const finish = finishPos(rules)
  const moves: Move[] = []
  let startPieceSeen = false

  state.pieces[player].forEach((from, piece) => {
    if (from === finish) return
    // Pieces waiting at the start are interchangeable: offer only one.
    if (from === 0) {
      if (startPieceSeen) return
      startPieceSeen = true
    }
    let to = from + state.roll!
    if (to > finish) {
      if (rules.exactRollToBearOff) return
      to = finish
    }
    if (to === finish) {
      moves.push({ player, piece, from, to, captures: false, landsOnRosette: false, bearsOff: true })
      return
    }
    const sq = squareOf(rules, player, to)!
    const occ = occupant(state, rules, sq)
    const rosette = isRosette(rules, sq)
    if (occ) {
      if (occ.player === player) return
      if (rosette && rules.rosetteIsSafe) return
    }
    moves.push({ player, piece, from, to, captures: occ !== null, landsOnRosette: rosette, bearsOff: false })
  })
  return moves
}

/** Roll the dice and enter the 'move' phase. If `legalMoves` then returns nothing, the caller
 * shows the roll and calls `passTurn`. */
export function applyRoll(state: GameState, rules: RuleConfig, rng: Rng = Math.random): GameState {
  if (state.phase !== 'roll') return state
  const { dice, value } = rollDice(rules, rng)
  return { ...state, phase: 'move', roll: value, dice }
}

export function passTurn(state: GameState): GameState {
  if (state.phase !== 'move') return state
  return { ...state, turn: opponent(state.turn), phase: 'roll', roll: null, dice: [] }
}

export function applyMove(state: GameState, rules: RuleConfig, move: Move): GameState {
  const pieces = { white: [...state.pieces.white], black: [...state.pieces.black] }
  pieces[move.player][move.piece] = move.to

  if (move.captures) {
    const sq = squareOf(rules, move.player, move.to)!
    const opp = opponent(move.player)
    const idx = pieces[opp].findIndex((pos) => {
      const s = squareOf(rules, opp, pos)
      return s !== null && sameSquare(s, sq)
    })
    if (idx >= 0) pieces[opp][idx] = 0
  }

  if (pieces[move.player].every((pos) => pos === finishPos(rules))) {
    return { ...state, pieces, phase: 'over', winner: move.player, roll: null, dice: [] }
  }

  const extraRoll =
    (move.landsOnRosette && rules.rosetteGrantsExtraRoll) || (move.captures && rules.captureGrantsExtraRoll)

  return {
    ...state,
    pieces,
    turn: extraRoll ? move.player : opponent(move.player),
    phase: 'roll',
    roll: null,
    dice: [],
  }
}
