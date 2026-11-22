# Rules of the Game

This document records the rule sets proposed for the Royal Game of Ur and the decision on which one this project uses.

## Decision

**This project uses the Finkel rule set (the British Museum rules) by default.** It was approved on 2026-11-14.

Why Finkel:

1. **It is the most widely played version.** royalur.net calls it "the most popular today" and uses it as its default. The British Museum teaches it, and most commercial sets and apps use it.
2. **It has the best historical basis.** It is the only reconstruction that draws on an ancient rules text: a Babylonian cuneiform tablet from about 177 BCE, written by the scribe Itti-Marduk-balāṭu and translated by Irving Finkel in 1990.
3. **It suits mobile play.** A 14-square path with 7 pieces each gives games of about 10–15 minutes.

The engine keeps the rule parameters configurable (see [Rule parameters](#rule-parameters-for-the-engine)), so other variants can be added later without a rewrite.

---

## Background

No original rulebook for the game (c. 2600 BCE) survives, so every rule set is a reconstruction. The Babylonian tablet was written about 2,400 years after the oldest Ur boards. It is incomplete and uses obscure symbolism, so even the Finkel rules contain modern interpretation.

All versions share the following:

- **Board:** 20 squares, made of a 3×4 block, a 2-square bridge and a 3×2 block. Five squares are rosettes.
- **Lanes:** each player has a private outer row. The middle row is shared, and that is where captures happen.
- **Goal:** two players race their pieces from the start, along a fixed path and off the board. The first player to bear off all pieces wins.
- **Dice:** binary lots (tetrahedral dice or sticks), where each die shows marked (1) or unmarked (0).

### Board layout

```
 col:  1    2    3    4    5    6    7    8
     +----+----+----+----+         +----+----+
 D   | R  |    |    |    |         | R  |    |   Dark's private row
     +----+----+----+----+----+----+----+----+
 S   |    |    |    | R  |    |    |    |    |   shared middle row
     +----+----+----+----+----+----+----+----+
 L   | R  |    |    |    |         | R  |    |   Light's private row
     +----+----+----+----+         +----+----+
R = rosette
```

---

## Rule sets found

### 1. Finkel rules (British Museum): chosen

| Aspect | Rule |
|---|---|
| Pieces | 7 per player |
| Dice | 4 binary tetrahedral dice. The roll is the number of marked tips, 0–4. A 0 means no move. |
| Path | 14 squares (Bell's route): 4 on your own row, 8 along the shared middle row, 2 back on your own row, then off the board |
| Entering | A piece enters the board using a roll, like any other move |
| Bearing off | Needs an exact roll, one step past the 14th square |
| Rosettes | Landing on one gives an extra roll. A piece on a rosette cannot be captured. This matters most for the shared central rosette. |
| Capture | Landing on an opponent's piece in the shared row sends it back to the start |
| Blocking | You cannot land on your own piece, or on an opponent's piece that is on a rosette |
| Passing | You must move if any legal move exists. You pass only when you have none, or when you roll 0. |

Path for Light; Dark's path is the mirror image on row D:

| Path step | 1 | 2 | 3 | 4 | 5–12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|
| Square | L4 | L3 | L2 | **L1 (R)** | S1 → S8 (**S4 is the shared rosette**) | L8 | **L7 (R)** | off the board |

Roll probabilities with 4 binary dice:

| Roll | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Chance | 1/16 | 4/16 | 6/16 | 4/16 | 1/16 |

### 2. Masters rules (James Masters, tradgames.org.uk)

- **Dice:** 3 binary dice. A roll of 0 counts as a move of 4.
- **Path:** a longer 16-square route that wraps around the end of the board. A rosette sits on every 4th square, which mirrors the related Game of Twenty Squares.
- **Rosettes:** they give an extra roll but do not protect pieces.

### 3. Bell rules (R.C. Bell, 1979)

- Bell introduced the short 14-square route that the Finkel rules later used.
- Bell also proposed rules for capture and safe squares.
- These rules have largely been replaced by the Finkel rules, which are played on Bell's path.

### 4. Murray rules (H.J.R. Murray, 1952)

- This is the earliest reconstruction.
- It uses a long 27-square route that goes around the 2×3 block and back down the middle row.
- It is mainly of historical interest and rarely played today.

### 5. Modern variants (royalur.net)

- **Blitz:** 5 pieces each on the Masters path. Rosettes give no extra roll and are not safe. A capture gives an extra roll instead. This makes for a fast, aggressive game.
- **Tournament Engine:** 5 pieces each on the Masters path. Rosettes are safe but give no extra roll. Pieces may stack on rosettes and move together, and pieces may move backwards.
- **Others:** Skiryuk's path, and a path for the related "Aseb" board proposed by Murray. Both appear in the RoyalUr software library and are niche.

---

## Rule parameters for the engine

The game logic should take a rule configuration object rather than hard-coding the rules. These are the Finkel defaults:

| Parameter | Finkel default | Alternatives seen |
|---|---|---|
| `piecesPerPlayer` | 7 | 5 (Blitz, Tournament) |
| `dice` | 4 binary dice, 0 = no move | 3 binary dice, 0 = 4 (Masters) |
| `path` | Bell/Finkel (14 squares) | Masters (16), Murray (27), Skiryuk, Aseb |
| `rosetteGrantsExtraRoll` | true | false (Blitz, Tournament) |
| `rosetteIsSafe` | true | false (Masters, Blitz) |
| `captureGrantsExtraRoll` | false | true (Blitz) |
| `exactRollToBearOff` | true | n/a |

---

## Sources

- [RoyalUr.net: Rules](https://royalur.net/rules)
- [Masters, tradgames.org.uk: Royal Game of Ur](https://www.tradgames.org.uk/games/Royal-Game-Ur.htm)
- [Finkel, "On the Rules for the Royal Game of Ur" (PDF)](https://csclub.uwaterloo.ca/~pbarfuss/On_the_Rules_for_the_Royal_Game_of_Ur.pdf)
- [RoyalUr Java library: path and dice variants](https://github.com/RoyalUr/RoyalUr-Java)
- [Wikipedia: Royal Game of Ur](https://en.wikipedia.org/wiki/Royal_Game_of_Ur)
