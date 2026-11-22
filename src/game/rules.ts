// Rule configuration and board geometry. See RuleOfTheGame.md.

export type Player = 'white' | 'black'

/** A physical board square: row 0 = black's lane, 1 = shared, 2 = white's lane; col 0..7. */
export interface Square {
  row: number
  col: number
}

export interface DiceConfig {
  /** Number of binary dice. */
  count: number
  /** Movement for a roll where no die shows a mark (0 = no move, Masters uses 4). */
  zeroMoves: number
}

export interface RuleConfig {
  name: string
  piecesPerPlayer: number
  dice: DiceConfig
  /** Board squares in path order, for each player. Path position p (1-based) = path[p - 1]. */
  paths: Record<Player, Square[]>
  rosettes: Square[]
  rosetteGrantsExtraRoll: boolean
  rosetteIsSafe: boolean
  captureGrantsExtraRoll: boolean
  exactRollToBearOff: boolean
}

export const ROWS = 3
export const COLS = 8

/** Squares that do not exist on the board (the gaps beside the bridge). */
export const GAPS: Square[] = [
  { row: 0, col: 4 },
  { row: 0, col: 5 },
  { row: 2, col: 4 },
  { row: 2, col: 5 },
]

export const ROSETTES: Square[] = [
  { row: 0, col: 0 },
  { row: 2, col: 0 },
  { row: 1, col: 3 },
  { row: 0, col: 6 },
  { row: 2, col: 6 },
]

/** Bell/Finkel path: 4 squares in the own lane, 8 shared, 2 back in the own lane. */
function bellPath(lane: number): Square[] {
  return [
    { row: lane, col: 3 },
    { row: lane, col: 2 },
    { row: lane, col: 1 },
    { row: lane, col: 0 },
    ...Array.from({ length: 8 }, (_, col) => ({ row: 1, col })),
    { row: lane, col: 7 },
    { row: lane, col: 6 },
  ]
}

export const FINKEL_RULES: RuleConfig = {
  name: 'Finkel',
  piecesPerPlayer: 7,
  dice: { count: 4, zeroMoves: 0 },
  paths: { black: bellPath(0), white: bellPath(2) },
  rosettes: ROSETTES,
  rosetteGrantsExtraRoll: true,
  rosetteIsSafe: true,
  captureGrantsExtraRoll: false,
  exactRollToBearOff: true,
}

export const sameSquare = (a: Square, b: Square) => a.row === b.row && a.col === b.col

export const isRosette = (rules: RuleConfig, sq: Square) => rules.rosettes.some((r) => sameSquare(r, sq))

export const isGap = (sq: Square) => GAPS.some((g) => sameSquare(g, sq))

export const opponent = (p: Player): Player => (p === 'white' ? 'black' : 'white')
