# Architecture Map — 01-simple-game

How the pieces are created and how they call each other.

## The mental model

Think of the game as a board game that advances frame by frame:

- **Pieces (actors)** follow the rules built into them and never reach across the table to each other.
- **Players** are the two humans. Each decides when to act and moves only their own piece (`Player` is not an actor).
- **The Overlord** is a third person at the table acting as referee: it plays nothing, keeps the score sheet (`GameState`), calls out collisions, passes messages between pieces and applies the win rules.

Only players and the Overlord command actors.

## Design principles

These are deliberate choices; keep new code consistent with them.

1. **Actors own their own logic.** Each actor decides what happens to itself: `Bullet` expires and destroys itself, `Target` destroys itself when hit, `TargetOrbit` rotates and counts its own targets, `Cannon` places itself on resize, `ScoreBoard` updates and animates its own texts. Behaviour that only concerns one actor lives in that actor, never in the Overlord.
2. **Actors talk only to the Overlord, and only by notifying.** An actor never calls, reads or changes another actor and holds no reference to the Overlord. The only things that call actors are the Overlord and the `Player`s (and `TargetOrbit` for the targets it created, since they are one physical object). It announces what happened with `emit(event)` (typed `ActorEvent`: `spawned`, `score`, `targetsEmpty`, plus `Actor.onDestroy` listeners). The Overlord sets `onEvent` on every actor it registers and handles all events in one place. Actors play their own sounds through `this.audio` (from the `Actor` base class) instead of going through the scene.
3. **The Overlord only routes events and controls status.** It keeps a list of actors and a list of players, updates the players (input) and then every actor, calls `handleResize` on each actor, tells every actor about score changes (`handleScoreChanged`), forwards Phaser collisions as `a.handleCollision(b)` / `b.handleCollision(a)`, and owns match status through `GameState` (scores, win, game-over, rotation speed). It must not contain rules about a specific actor type; if it needs one, give the actors a generic field or event instead (e.g. `Actor.points`).
4. **Actors react to collisions themselves.** Phaser detects overlaps (Arcade physics); the Overlord queues them and resolves them after the physics step. `Actor.handleCollision` is a no-op by default; actors that care override it (a bullet scores for its owner and destroys itself, a target destroys itself, the planet ignores it).
5. **The MainSpawner creates the initial actors; actors can also spawn actors.** The MainSpawner builds the starting set (planet, cannons and their players, target orbit, score board) and replacement target orbits and announces each actor to the Overlord (`onSpawned`) and each player (`onPlayerCreated`) and keeps no references to them. It wires nothing on them and makes no game decisions: the Overlord decides when a new target orbit is needed and asks the MainSpawner to build it. Actors may create things they own (a `Cannon` creates its bullets) and announce them with a `spawned` event.
6. **Nothing is destroyed during the physics step.** Collisions are queued and resolved at the start of `Overlord.update`.
7. **Defaults are inert.** Base-class `update`, `handleCollision` and `handleResize` do nothing, so an actor only implements what it needs.
## Ownership / creation chain

```
game.ts (createGame)
  -> SimpleGameScene (scene.ts)

SimpleGameScene.create()
  -> new MainSpawner(scene, state)
  -> new Overlord(scene, state, mainSpawner, callbacks)
       -> mainSpawner.onSpawned = Overlord.register
       -> physics.add.overlap(layer A, layer B, queueCollision)   per Overlord.collisionPairs
  -> overlord.start(centerX, centerY, width, playerNames)
       -> mainSpawner.spawnInitial(...)
       every actor below is announced via MainSpawner.spawn() -> Overlord.register(actor)
       -> new Planet(scene, x, y)                       layer "planet"
       -> spawnPlayer(side, x, y, fireKeyCode) x2
            -> new Cannon(scene, x, y, side)               announced via onSpawned (an actor)
            -> new Player(scene, side, actor, fireKeyCode)   announced via onPlayerCreated (not an actor)
       -> new TargetOrbit(scene, x, y)
            -> new Target(scene, x, y, value)  x6        layer "target"
       -> new ScoreBoard(scene, playerNames, winScore)
  -> overlord.resize(width, height)
```

## Per-frame loop

```
Phaser physics step (before the scene update)
  -> overlap(bullet layer, target layer / planet layer)
       -> Overlord.queueCollision(objA, objB)   maps game objects to actors, only queues the pair

SimpleGameScene.update(time, delta)
  -> Overlord.update(delta)
       -> resolveCollisions()   for each queued pair (skips pairs with an already destroyed actor):
            -> a.handleCollision(b); b.handleCollision(a)
                 -> Bullet: if other.points > 0 -> emit "score" -> Overlord.handleEvent -> Overlord.scorePoints
                              -> state.addScore / state.hasWon / state.recordWin(...)
                              -> every actor.handleScoreChanged(side, score)   (ScoreBoard updates and highlights itself)
                              -> if won: callbacks.onRoundWon()        -> scene.showWinPanel
                            then destroys itself
                 -> Target: plays its hit sound, destroy()      Planet / others: ignore
                 -> Actor.destroy() -> destroy listeners
                      -> Overlord drops the actor from its list
                      -> TargetOrbit.removeTarget drops the target; emits "targetsEmpty" (with itself as source) when none are left
            -> if the orbit reported empty (`targetsEmpty` event from TargetOrbit) and the round is not over:
                 -> Overlord destroys the empty orbit, state.increaseRotationSpeed(); MainSpawner.spawnTargetOrbit()   (decided after all pairs)
       -> for each player: player.update(state)
            -> Player: reads its fire key -> cannon.fire() -> new Bullet -> emit "spawned" -> Overlord.register
       -> for each registered actor: actor.update(delta, state)
            -> TargetOrbit: rotates the container, keeps labels upright
            -> Cannon: shows/hides its ready indicator
            -> Bullet: ages, destroys itself when expired or the round is over
```
## Resize / layout

```
scene.handleResize(gameSize)
  -> overlord.resize(width, height)
       -> state.updatePlayfieldScale(width)
       -> for each registered actor: actor.handleResize(width, height, state)
            -> Planet / TargetOrbit: center and scale themselves
            -> Cannon: places itself at its screen edge
            -> ScoreBoard: repositions its texts (also re-arranges itself on a score change)
  -> winPanel?.layout()
Overlord.register also calls handleResize once, so newly spawned actors (e.g. a respawned orbit) start laid out.
```
## Class responsibilities (one line each)

- `SimpleGameScene` — Phaser lifecycle, wiring, audio setup (shared with actors through `provideAudio`), resize and the win panel; it never touches actors.
- `MainSpawner` — creates actors (initial set, new target orbits) when asked and announces them to the Overlord; wires nothing.
- `Overlord` — keeps the list of actors and updates them one by one; receives Phaser collisions and tells the colliding actors; owns scores, win status and the target-respawn decision via `GameState`; passes resizes to actors.
- `GameState` — match-wide data: scores, win score, match wins, rotation speed, game-over flag, playfield scale.
- `Actor` (base class) — `audio` gives access to the shared sound player; `handleResize()` defaults to a no-op; `track()` registers Phaser objects so `destroy()` cleans them up; defaults `update()` and `handleCollision()` are no-ops; `onDestroy(listener)` subscribes to destruction; `points` is what hitting it is worth; `collisionLayer` and `collider` opt it into Phaser collision detection.
- `Player` — not an actor. A side's human: reads its fire key each frame and calls `fire()` on the actor assigned to it (currently its `Cannon`).
- `Cannon` — the physical cannon; cooldown-gated `fire()`, creates the `Bullet` and emits `spawned`; plays the shoot sound; places itself on resize.
- `Bullet` — knows its owner side; moves via Arcade physics, expires on its own, emits `score` for its owner on collision and destroys itself.
- `Planet` — the central obstacle; ignores collisions.
- `Target` / `TargetOrbit` — orbiting score targets (destroyed on collision) and their rotating container, which emits `targetsEmpty`.
- `ScoreBoard` / `WinPanel` — on-screen score and end-of-round UI.

## Notes

- Phaser only reports overlaps; actors are never destroyed during the physics step. Collisions are queued and resolved at the start of `Overlord.update`.
- Target and planet bodies are circles with `moves = false`: Arcade physics reads their (container-transformed) world position but never writes it back.
- Notify-don't-ask: actors call optional callbacks when something happens (`Actor.emit`, `Actor.onDestroy` listeners).
