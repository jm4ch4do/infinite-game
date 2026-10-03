# Test Report — 01-shoot-the-moons

**Date:** 2026-10-03  
**Build Status:** ✓ Pass (after fixing path references)  
**Smoke Test:** ⚠ BLOCKED - Collision detection issue

## Summary

The game loads, the menu works, and the scene renders correctly. However, bullets do not collide with orbiting targets, which blocks all scoring and win condition tests.

## Build and Navigation

- ✅ **PASS**: `npm run build` succeeds
- ✅ **PASS**: `npm run typecheck` passes (after fixing stale paths)
- 🔧 **FIXED**: `src/menu/preview.ts` had stale import of `01-simple-game/status/WinPanel`
  - Changed to `01-shoot-the-moons/status/WinPanel`
- 🔧 **FIXED**: `src/menu/game-select/gameSelectMenu.template.html` had stale `data-game-id="01-simple-game"`
  - Changed to `data-game-id="01-shoot-the-moons"`
- ✅ **PASS**: After fixes, game loads cleanly via menu
- ✅ **PASS**: No console errors on initial load or during setup
- ✅ **PASS**: Canvas renders, central planet visible, orbit with targets visible
- ✅ **PASS**: Cannons visible on both sides with ready indicators

## Firing and Input

- ✅ **PASS**: Q key fires left cannon (ready indicator hides briefly)
- ✅ **PASS**: SPACE key fires right cannon (ready indicator hides briefly)
- ✅ **PASS**: Cooldown prevents rapid-fire; second press within ~1000ms is ignored
- ✅ **PASS**: Ready indicator reappears after cooldown
- ✅ **PASS**: Both cannons can fire in same frame
- ✅ **PASS**: Bullets are visible as small yellow circles
- ✅ **PASS**: Bullets travel horizontally toward the center

## Collision Detection — ⚠️ BLOCKER

- ❌ **FAIL**: Bullets do not collide with orbiting targets
  - Tested: 8 shots from each cannon (16 bullets total) over 3 seconds
  - Expected: At least some hits given the target density (6 targets orbiting)
  - Actual: 0/16 bullets hit, scores remained 0/0
  - Likely cause: **Container transform issue with Arcade physics**

### Technical Analysis

The issue is in how targets are positioned for collision detection:
- `Target.ts` creates each target as a circle with a physics body
- `TargetOrbit.ts` places all targets in a `Phaser.GameObjects.Container` at the center
- The container is rotated each frame: `this.container.rotation += (delta / 1000) * state.rotationSpeed`
- Targets have `physics.moves = false`, meaning Arcade physics only reads their position, never writes it
- **Problem**: When a container rotates, the world positions of its children transform, but Arcade physics in Phaser 4.2.1 may not update circle body positions for collision detection accordingly

This is a known limitation in some Phaser versions: Arcade physics bodies inside rotating containers may not have their collision bounds updated to match the container's transform.

### Evidence
- Bullets visibly travel straight across the screen
- Targets visibly orbit in a circle
- No collision events fire (game does not play hit sound)
- No score changes occur

## All Remaining Tests — BLOCKED

Because collision detection is not working, we cannot test:
- Scoring mechanics
- Win conditions
- Orbit refill behavior
- Round end and win panel
- Match progression
- Audio (hit sound never plays)
- Any gameplay-dependent features

## Fixes Needed Before Full Testing

1. **Primary**: Resolve the container/physics body transform issue. Options:
   - Manually update target physics body positions each frame based on container rotation
   - Remove targets from container and position them manually
   - Use a different collision shape that works with container transforms
   - Downgrade/upgrade Phaser to a version where this works

2. **Secondary**: Update `ARCHITECTURE.md` title from `01-simple-game` to `01-shoot-the-moons`

3. **Unclear specification**: When two bullets from opposite sides hit the same target in the same frame, should both sides score? (Currently undefined)

## Test Environment

- Node.js: npm installed
- Build tool: Vite 8.2.0
- Game framework: Phaser 4.2.1
- Browser: Chromium (via Playwright)
- Screen: 1920×1080

## Checklist Items Status

| Item | Status | Notes |
|------|--------|-------|
| Build & typecheck | ✅ | After fixes |
| Menu navigation | ✅ | All paths work |
| Game render | ✅ | Canvas and sprites visible |
| Q/SPACE firing | ✅ | Keys work, cooldown works |
| Bullet travel | ✅ | Visible on canvas |
| Collision | ❌ | **BLOCKER** |
| Scoring | ⏸️ | Blocked by collision |
| Win logic | ⏸️ | Blocked by collision |
| Orbit refill | ⏸️ | Blocked by collision |
| Layout/resize | ⏸️ | Can test when game is playable |
| Audio | ⏸️ | Music plays; hit sound blocked |

## Next Steps

1. Debug the physics body transform issue (probably in Phaser initialization or per-frame update)
2. Once collisions work, run the full checklist from [CHECKLIST.md](./CHECKLIST.md)
3. Verify all edge cases listed in the checklist
