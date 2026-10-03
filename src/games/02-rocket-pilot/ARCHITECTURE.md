# Architecture Map — 02-rocket-pilot

How the pieces are created and how they call each other.

## The mental model

Think of the game as a board game that advances frame by frame:

- **Pieces (actors)** follow the rules built into them and never reach across the table to each other.
- **Players** are the two humans. Each decides when to act and moves only their own piece (`Player` is not an actor).
- **The Overlord** is a third person at the table acting as referee: it plays nothing, keeps the score sheet (`GameState`), calls out collisions, passes messages between pieces and applies the win rules.

Only players and the Overlord command actors.

## Design principles

These are deliberate choices; keep new code consistent with them.

1. **Actors own their own logic.** Each actor decides what happens to itself. Behaviour that only concerns one actor lives in that actor, never in the Overlord.
2. **Actors talk only to the Overlord, and only by notifying.** An actor never calls, reads or changes another actor and holds no reference to the Overlord. The only things that call actors are the Overlord and the `Player`s. It announces what happened with `emit(event)` (typed `ActorEvent`). Actors call `remove()` to ask for removal; only the Overlord calls `destroy()`. The Overlord sets `onEvent` on every actor it registers and handles all events in one place. Actors play their own sounds through `this.audio` (from the `Actor` base class) instead of going through the scene.
3. **The Overlord only routes events and controls status.** It keeps a list of actors and a list of players, runs each frame in four phases (collisions, spawns, updates, removals), updates the players (input) and then every actor, calls `handleResize` on each actor, tells every actor about score changes (`handleScoreChanged`), forwards Phaser collisions as `a.handleCollision(b)` / `b.handleCollision(a)`, and owns match status through `GameState`. It must not contain rules about a specific actor type; if it needs one, give the actors a generic field or event instead.
4. **Actors react to collisions themselves.** Phaser detects overlaps (Arcade physics); the Overlord queues them and resolves them after the physics step. `Actor.handleCollision` is a no-op by default; actors that care override it.
5. **The MainSpawner creates the initial actors; actors can also spawn actors.** The MainSpawner builds the starting set and announces each actor to the Overlord (`onSpawned`) and each player (`onPlayerCreated`) and keeps no references to them. It wires nothing on them and makes no game decisions: the Overlord decides when new actors are needed and asks the MainSpawner to build them. Actors may create things they own and announce them with a `spawned` event.
6. **Nothing is created or destroyed while the Overlord iterates.** Collisions are queued during the physics step and resolved in phase 1 of `Overlord.update`; spawns are queued and registered in phase 2; removals are queued by `remove()` and destroyed in phase 4, so an actor removed early in a frame can still be read later in it.
7. **Defaults are inert.** Base-class `update`, `handleCollision` and `handleResize` do nothing, so an actor only implements what it needs.

## Ownership / creation chain

```
game.ts (createGame)
  -> SimpleGameScene (scene.ts)

SimpleGameScene.create()
  -> new MainSpawner(scene, state)
  -> new Overlord(scene, state, mainSpawner, callbacks)
       -> mainSpawner.onSpawned = Overlord.register   (queues; overlord.start flushes the first spawn phase)
       -> physics.add.overlap(layer A, layer B, queueCollision)   per Overlord.collisionPairs
  -> overlord.start(centerX, centerY, width, playerNames)
       -> mainSpawner.spawnInitial(...)
           every actor below is announced via MainSpawner.spawn() -> Overlord.register(actor)
           -> new Planet(scene, x, y)                       layer "planet"
           
           TODO: Add players, targets, and score display
           // -> spawnPlayer(side, x, y, fireKeyCode) x2
           // -> new TargetOrbit(scene, x, y)
           // -> new ScoreBoard(scene, playerNames, winScore)
  -> overlord.resize(width, height)
```

## Per-frame loop

```
Phaser physics step (before the scene update)
  -> overlap detection (currently no active collisions)
       -> Overlord.queueCollision(objA, objB)   maps game objects to actors, only queues the pair

SimpleGameScene.update(time, delta)
  -> Overlord.update(delta)
       -> resolveCollisions()   for each queued pair (skips pairs with an already destroyed actor):
            -> a.handleCollision(b); b.handleCollision(a)
       -> for each player: player.update(state)
       -> for each registered actor: actor.update(delta, state)
```

## Resize / layout

```
scene.handleResize(gameSize)
  -> overlord.resize(width, height)
       -> state.updatePlayfieldScale(width)
       -> for each registered actor: actor.handleResize(width, height, state)
            -> Planet: center and scale itself
  -> winPanel?.layout()

The spawn phase also calls handleResize once per actor, so newly spawned actors start laid out.
```

## Class responsibilities (one line each)

- `SimpleGameScene` — Phaser lifecycle, wiring, audio setup (shared with actors through `provideAudio`), resize and the win panel; it never touches actors.
- `MainSpawner` — creates actors when asked and announces them to the Overlord; wires nothing.
- `Overlord` — keeps the list of actors and updates them one by one; receives Phaser collisions and tells the colliding actors; owns scores, win status via `GameState`; passes resizes to actors.
- `GameState` — match-wide data: scores, win score, match wins, rotation speed, game-over flag, playfield scale.
- `Actor` (base class) — `audio` gives access to the shared sound player; `handleResize()` defaults to a no-op; `track()` registers Phaser objects so `destroy()` cleans them up; defaults `update()` and `handleCollision()` are no-ops; `remove()` / `onRemove(listener)` ask for and observe removal, `onDestroy(listener)` subscribes to destruction (done by the Overlord); `points` is what hitting it is worth; `collisionLayer` and `collider` opt it into Phaser collision detection.
- `Planet` — the central obstacle; ignores collisions.

## Notes

- Phaser only reports overlaps; actors are never destroyed during the physics step. Collisions are queued and resolved in phase 1 of `Overlord.update`, and destruction waits for phase 4.
- Planet body is a circle with `moves = false`: Arcade physics reads its (container-transformed) world position but never writes it back.
- Notify-don't-ask: actors call optional callbacks when something happens (`Actor.emit`, `Actor.onRemove` / `Actor.onDestroy` listeners).
