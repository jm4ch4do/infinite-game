# Architecture Map — 01-simple-game

How the pieces are created and how they call each other.

## Ownership / creation chain

```
game.ts (createGame)
  -> SimpleGameScene (scene.ts)

SimpleGameScene.create()
  -> new Spawner(scene, state)
  -> spawner.spawnInitial(centerX, centerY, width, playerNames)
       -> new Planet(scene, x, y)
       -> Player.createPair(scene, width, centerY, playerNames)
            -> new Player(scene, side, name, x, y, fireKeyCode)
                 -> new Cannon(scene, x, y, side)
                 -> new PlayerController(scene, cannon, fireKeyCode)
       -> new TargetOrbit(scene, x, y)
            -> new Target(scene, x, y, value)  x6
       -> new ScoreBoard(scene, playerNames, winScore)
  -> new Overlord(scene, state, spawner, callbacks)
  -> layoutPlayfield(...)
```

## Per-frame loop

```
SimpleGameScene.update(time, delta)
  -> Overlord.update(delta)
       -> targetOrbit.container.rotation += ...
       -> for each Player: player.update(isGameOver)
            -> controller.setGameOver(isGameOver)
            -> controller.update()
                 -> reads fireKey.isDown
                 -> cannon.fire()          (no-op if on cooldown)
                      -> onFire?.()        (wired by Spawner.trackPlayer)
                           -> Spawner.spawnBullet(cannon)
                                -> new Bullet(...)
                                -> bullet.onDestroyed = handleBulletRemoved
            -> cannon.update(isGameOver)   (shows/hides ready indicator)
       -> Overlord.updateBullets(delta)
            -> for each bullet:
                 -> bullet.update(delta)                (age only; Arcade physics moves it)
                 -> bullet.collidesWithPlanet(...)
                 -> bullet.collidesWithTarget(...)       (per target, using orbit world matrix)
                 -> if target hit: Overlord.handleTargetHit(index, side)
                      -> Spawner.getPlayer(side)
                      -> player.addScore(value, winScore)
                      -> player.hasWon(winScore)?
                           -> state.recordWin(side, callbacks.onMatchWon(side))
                      -> target.destroy()
                           -> Actor.destroy() destroys body+label
                           -> onDestroyed -> Spawner.handleTargetRemoved
                                -> removes from targetOrbit.targets
                                -> if empty && !isGameOver: Spawner.respawnTargets()
                      -> callbacks.onScoreChanged(side, score) -> scene.showScoreChange
                      -> if won: callbacks.onRoundWon() -> scene.showWinPanel
                 -> if expired/hit/gameOver: bullet.destroy()
                      -> onDestroyed -> Spawner.handleBulletRemoved
```

## Resize / layout

```
scene.handleResize(gameSize)
  -> scene.layoutPlayfield(width, centerY)
       -> state.updatePlayfieldScale(width)
       -> overlord.planet.layout(...)
       -> overlord.targetOrbit.layout(...)
       -> for each overlord.players: player.layout(...) -> cannon.layout(...)
  -> winPanel?.layout()
  -> scene.layoutScoreTexts(...) -> overlord.scoreBoard.layout(...)
```

## Class responsibilities (one line each)

- `SimpleGameScene` — Phaser lifecycle, wiring, audio, resize, UI reactions.
- `Spawner` — creates all actors, tracks bullets/targets, decides respawn timing.
- `Overlord` — per-frame rules: movement tick, collision detection, scoring, win detection.
- `GameState` — match-wide data: win score, match wins, rotation speed, game-over flag, playfield scale.
- `Actor` (base class) — every actor extends this; `track()` registers Phaser objects so `destroy()` cleans them up automatically and fires `onDestroyed`.
- `Player` — a side's identity (name, score) plus its `Cannon` and `PlayerController`.
- `PlayerController` — reads the fire key, calls `cannon.fire()`.
- `Cannon` — the physical cannon; cooldown-gated `fire()`, notifies via `onFire`.
- `Bullet` — moves via Arcade physics, knows its own expiry and collision checks.
- `Planet` — the central target players must avoid hitting with bullets.
- `Target` / `TargetOrbit` — orbiting score targets and their rotating group.
- `ScoreBoard` / `WinPanel` — on-screen score and end-of-round UI.

## Notify-don't-ask pattern

Actors don't get polled or manipulated from outside; they call an optional callback when something happens:
- `Cannon.onFire` — fired when the cannon actually shoots.
- `Actor.onDestroyed` (used by `Bullet`, `Target`) — fired when the actor is destroyed, so `Spawner` can drop it from its tracked lists (and decide whether to respawn).
