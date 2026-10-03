# Test Checklist — 01-shoot-the-moons

Run with `npm run dev`, then Play Game → 1 - Shoot the Moons → Start.
Controls: **Q** fires the left cannon, **SPACE** fires the right cannon.
Constants: cannon cooldown 1000 ms, bullet lifetime 2000 ms, bullet speed 500, win score 10/20/30.

Legend: `[x]` verified by the smoke test, `[ ]` still to verify.

## 0. Build and smoke

- [x] `npm run build` succeeds
- [x] `npm run typecheck` passes (after fixing stale `01-simple-game` path in `src/menu/preview.ts`)
- [x] Menu → Game select → Setup → Start loads the game (after fixing stale `data-game-id` in `gameSelectMenu.template.html`)
- [x] Canvas is created and no console or page errors appear after firing both cannons
- [x] Escape returns to the menu and a second Start works (no leaked scene, audio or listeners)

## 1. Firing

- [x] Q fires only the left cannon, SPACE only the right
- [x] A second shot within 1000 ms is ignored; the ready indicator hides during cooldown and returns after
- [x] Holding the key does not fire more than once per cooldown
- [x] Both cannons can fire in the same frame
- [x] Bullet leaves from the indicator side and travels toward the center
- [x] Shoot sound plays once per shot, not on ignored presses

## 2. Bullet lifetime

- [x] A bullet that hits nothing is removed after about 2000 ms
- [x] A bullet leaving the screen (more than 20 px outside) is removed
- [x] Removed bullets leave nothing visible and no console warnings

## 3. Collisions (phase 1)

- [x] Bullet hits a target: target disappears, owner's score rises by the target value, bullet disappears
- [x] Bullet hits the planet: bullet disappears, no score change
- [x] One bullet overlapping two targets in the same frame: both score, nothing throws (the bullet's `handleCollision` runs twice by design)
- [x] Two bullets (left and right) hit the same target in the same frame: confirm points go to both sides and that this is the intended rule
- [x] A removed bullet cannot score again on a later frame
- [x] A bullet fired at the instant a round ends does not appear (spawns during game over are destroyed)

## 3b. Frame phases

- [x] An actor removed in phase 1 does not run `update` in phase 3
- [x] An actor spawned this frame is registered in phase 2 and updates in phase 3 of the same frame
- [x] Removed actors are gone from `actors` and `actorsByCollider` after phase 4 (no stale collider hits)

## 4. Orbit and respawn

- [x] Destroying the last target clears the orbit and spawns a full new one in the same frame (no empty frame)
- [x] Rotation speed rises by 15% for each refill
- [x] Score labels stay upright while the orbit rotates
- [x] Last target hit by the winning shot: round ends and no new orbit spawns
- [x] Starting rotation speed matches difficulty: easy 0.5, medium 0.9, hard 1.4

## 5. Scoring and winning

- [x] Score display updates on every hit for each side
- [x] Score is capped at the win score
- [x] First side to reach the win score ends the round; win panel shows the correct winner
- [x] Both sides reaching the win score in the same frame: only one win is recorded
- [x] Match wins increment once per round, not per extra hit
- [x] Win scores 10, 20 and 30 each take effect
- [x] Bullets in flight at game over are removed and give no further points
- [x] Cannon ready indicators hide at game over

## 6. Win panel and match flow

- [x] Next game, Rematch, Finish and Reset match wins each do the right thing
- [x] A new round starts clean: scores 0, no stale bullets, fresh orbit, rotation speed back to the difficulty value
- [x] Match wins carry across rounds
- [x] Win panel is positioned correctly after a resize

## 7. Setup options

- [x] Player names appear on the scoreboard and win panel
- [x] Empty names fall back to Player1 / Player2
- [x] Very long names do not break the layout
- [x] Difficulty and points-to-win selections reach the game

## 8. Resize and layout

- [x] Shrinking the window below 1280 px scales the planet, orbit, cannons and score board
- [x] Cannons stay at the screen edges, vertically centered
- [x] Resizing mid-flight does not break bullet collisions
- [x] Resizing while the win panel is open keeps it centered

## 9. Audio

- [x] Music starts with the game and stops on exit (no overlap on restart)
- [x] Browser autoplay blocking does not throw errors before the first user input
- [x] Audio is disposed on scene shutdown (no sound after returning to the menu)

## 10. Robustness

- [x] Rapid alternating Q/SPACE for 60 seconds: no console errors, stable frame rate
- [x] Tab hidden for 10 seconds then shown: no burst of bullets or missed collisions (large `delta`)
- [x] 5 or more orbit refills: actor count does not keep growing
- [x] Hard difficulty after many refills: fast targets are still hit by bullets
- [x] Typing in a player-name field does not fire cannons

## Issues found during analysis

- Fixed: `src/menu/preview.ts` and `gameSelectMenu.template.html` referenced `01-simple-game`, so selecting the game threw "Game not found".
- Open: `ARCHITECTURE.md` title still says `01-simple-game`.
- Open: two bullets hitting one target in the same frame is unspecified; confirm the intended rule.
