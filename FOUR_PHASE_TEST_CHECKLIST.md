# Four-Phase Cycle Implementation - Test Checklist

## Implementation Complete ✓

The Overlord now runs each frame in four deterministic phases:

1. **Phase 1: Collision Resolution** — All queued collision pairs are resolved; actors can mark themselves for removal
2. **Phase 2: Spawn** — All actors queued by events are registered and positioned
3. **Phase 3: Update** — Players act, then each actor (except marked ones) updates
4. **Phase 4: Removal** — All marked actors are dropped from tracking and destroyed

## Code Changes

- ✓ `Actor.ts`: Added `remove()`, `isRemoved`, `onRemove()`, `remove` event type
- ✓ `Bullet.ts`: Calls `remove()` instead of `destroy()` on collision and expiry
- ✓ `Target.ts`: Calls `remove()` instead of `destroy()` on collision
- ✓ `TargetOrbit.ts`: Listens to `onRemove` instead of `onDestroy`
- ✓ `Overlord.ts`: Four separate phase methods; removal queue; spawn queue
- ✓ `ARCHITECTURE.md`: Updated documentation

## Build Status

- ✓ TypeScript check passes (no Overlord-related errors)
- ✓ Vite build succeeds

## Manual Testing Required

Run `npm run dev` and play the game:

### Basic Gameplay
- [ ] Fire bullets from left cannon (Q) and right cannon (SPACE)
- [ ] Bullets move correctly and disappear when expired or out of bounds
- [ ] Targets are hit and disappear when bullets collide
- [ ] Scoring works (points awarded, score display updates)

### Collision Behavior
- [ ] One bullet hitting two targets in same frame scores on both (uncommon but possible)
- [ ] Targets always give points if hit (never skip due to removal timing)
- [ ] No visual glitches from actors mid-removal

### Orbit Refill
- [ ] When all targets are destroyed, orbit is cleared and refilled
- [ ] No gap: new orbit appears same frame targets are removed
- [ ] Rotation speed increases after each orbit clear

### Round/Win Condition
- [ ] One side scores enough to win the round
- [ ] Round ends, win panel shows
- [ ] Game continues to next round
- [ ] No stale bullets or targets in new round

### Frame Timing
- [ ] Actors removed in phase 1 (collision) don't update in phase 3
- [ ] Actors spawned in phase 2 start updating in phase 3 (next frame)
- [ ] No "isDestroyed" guard needed in update loop (removed)

### Edge Cases
- [ ] Game over: bullets and spawned actors don't appear
- [ ] Rapid fire: multiple bullets exist, collide correctly
- [ ] Server-side console: no errors or warnings about removed actors
