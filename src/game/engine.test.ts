import { describe, expect, it } from 'vitest'
import { chooseMove } from './ai'
import { type GameState, applyMove, applyRoll, finishPos, legalMoves, newGame, passTurn, rollDice } from './engine'
import { FINKEL_RULES as R } from './rules'

/** A state in the move phase with the given roll and piece positions. */
function at(roll: number, white: number[], black: number[] = []): GameState {
  const s = newGame(R)
  s.pieces.white = [...white, ...Array(7 - white.length).fill(0)]
  s.pieces.black = [...black, ...Array(7 - black.length).fill(0)]
  return { ...s, phase: 'move', roll }
}

describe('dice', () => {
  it('counts marked dice; zero means no move', () => {
    expect(rollDice(R, () => 0.1).value).toBe(4)
    expect(rollDice(R, () => 0.9).value).toBe(0)
  })
  it('a 0 roll has no legal moves', () => {
    expect(legalMoves(at(0, []), R)).toEqual([])
  })
  it('applyRoll enters the move phase', () => {
    const s = applyRoll(newGame(R), R, () => 0.1)
    expect(s.phase).toBe('move')
    expect(s.roll).toBe(4)
  })
})

describe('moves', () => {
  it('offers a single entering move for all waiting pieces', () => {
    const moves = legalMoves(at(2, []), R)
    expect(moves).toHaveLength(1)
    expect(moves[0]).toMatchObject({ from: 0, to: 2 })
  })

  it('cannot land on an own piece', () => {
    const moves = legalMoves(at(2, [2]), R)
    expect(moves.map((m) => [m.from, m.to])).toEqual([[2, 4]])
  })

  it('needs an exact roll to bear off', () => {
    const overshoot = legalMoves(at(3, [13, 15, 15, 15, 15, 15, 15]), R)
    expect(overshoot).toEqual([])
    const exact = legalMoves(at(2, [13]), R).find((m) => m.from === 13)
    expect(exact).toMatchObject({ to: finishPos(R), bearsOff: true })
  })

  it('captures an opponent in the shared row', () => {
    const s = at(1, [4], [5]) // path position 5 is the first shared square for both players
    const move = legalMoves(s, R).find((m) => m.from === 4)!
    expect(move.captures).toBe(true)
    const next = applyMove(s, R, move)
    expect(next.pieces.black[0]).toBe(0)
    expect(next.turn).toBe('black')
  })

  it('cannot capture on the safe central rosette', () => {
    const s = at(1, [7], [8]) // path 8 = S4, the central rosette
    expect(legalMoves(s, R).find((m) => m.from === 7)).toBeUndefined()
  })

  it('pieces in private lanes never collide', () => {
    const s = at(1, [3], [4])
    expect(legalMoves(s, R).find((m) => m.from === 3)?.captures).toBe(false)
  })

  it('landing on a rosette grants an extra roll', () => {
    const s = at(4, [])
    const next = applyMove(s, R, legalMoves(s, R)[0])
    expect(next.turn).toBe('white')
    expect(next.phase).toBe('roll')
  })

  it('bearing off the last piece wins', () => {
    const s = at(1, [14, 15, 15, 15, 15, 15, 15])
    const next = applyMove(s, R, legalMoves(s, R)[0])
    expect(next.phase).toBe('over')
    expect(next.winner).toBe('white')
  })
})

describe('full game', () => {
  it('computer vs computer always finishes with a winner', () => {
    let seed = 42
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
    for (let game = 0; game < 50; game++) {
      let s = newGame(R)
      let turns = 0
      while (s.phase !== 'over' && turns++ < 5000) {
        s = applyRoll(s, R, rng)
        const moves = legalMoves(s, R)
        s = moves.length ? applyMove(s, R, chooseMove(s, R, moves)!) : passTurn(s)
      }
      expect(s.phase).toBe('over')
      expect(s.pieces[s.winner!].every((p) => p === finishPos(R))).toBe(true)
    }
  })
})

describe('ai', () => {
  it('prefers a capture', () => {
    // White sits on shared square S3 (path 7); black can capture it from path 5 with a 2.
    const s = { ...at(2, [7], [5, 1]), turn: 'black' as const }
    expect(chooseMove(s, R, legalMoves(s, R))).toMatchObject({ from: 5, captures: true })
  })
})
