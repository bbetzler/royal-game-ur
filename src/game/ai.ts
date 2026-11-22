// Simple heuristic computer opponent.

import { type GameState, type Move, finishPos, squareOf } from './engine'
import { type RuleConfig, isRosette, opponent, sameSquare } from './rules'

/** Chance of each movement value with the configured dice (binomial). */
function rollOdds(rules: RuleConfig): Map<number, number> {
  const n = rules.dice.count
  const odds = new Map<number, number>()
  let binom = 1
  for (let k = 0; k <= n; k++) {
    const value = k === 0 ? rules.dice.zeroMoves : k
    odds.set(value, (odds.get(value) ?? 0) + binom / 2 ** n)
    binom = (binom * (n - k)) / (k + 1)
  }
  return odds
}

/** Probability that an opponent piece can capture on the given path position next turn. */
function danger(state: GameState, rules: RuleConfig, move: Move): number {
  const sq = squareOf(rules, move.player, move.to)
  if (!sq || (isRosette(rules, sq) && rules.rosetteIsSafe)) return 0
  const opp = opponent(move.player)
  // Only squares on the opponent's path can be attacked.
  const oppPos = rules.paths[opp].findIndex((s) => sameSquare(s, sq)) + 1
  if (oppPos === 0) return 0
  const odds = rollOdds(rules)
  let p = 0
  for (const [value, chance] of odds) {
    if (value === 0) continue
    if (state.pieces[opp].some((pos) => pos + value === oppPos && pos < oppPos)) p += chance
  }
  return Math.min(p, 1)
}

export function scoreMove(state: GameState, rules: RuleConfig, move: Move): number {
  let score = move.to - move.from
  if (move.captures) score += 100
  if (move.landsOnRosette) score += 60
  if (move.bearsOff) score += 40
  if (move.from === 0) score += 10
  // Leaving a safe rosette gives up a strong position.
  const fromSq = squareOf(rules, move.player, move.from)
  if (fromSq && isRosette(rules, fromSq)) score -= 25
  score -= 50 * danger(state, rules, move)
  // Prefer moving pieces that are nearly home, slightly.
  if (move.to === finishPos(rules)) score += 5
  return score
}

export function chooseMove(state: GameState, rules: RuleConfig, moves: Move[]): Move | null {
  let best: Move | null = null
  let bestScore = -Infinity
  for (const m of moves) {
    const s = scoreMove(state, rules, m)
    if (s > bestScore) {
      bestScore = s
      best = m
    }
  }
  return best
}
