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

SimpleGameScene.preload()
  -> preloadShip(scene)     static loader of the ship's assets (the one actor call the scene makes; see notes)

SimpleGameScene.create()
  -> new MainSpawner(scene, state)
  -> new Overlord(scene, state, mainSpawner, callbacks)
       -> mainSpawner.onSpawned = Overlord.register   (queues; overlord.start flushes the first spawn phase)
       -> physics.add.overlap(layer A, layer B, queueCollision)   per Overlord.collisionPairs
       -> physics.add.collider(solid layer A, solid layer B)      per Overlord.solidPairs
  -> overlord.start(centerX, centerY, width, playerNames)
       -> mainSpawner.spawnInitial(...)
           every actor below is announced via MainSpawner.spawn() -> Overlord.register(actor)
           -> new Planet(scene, x, y)                       layer "planet"
           -> spawnPlayer("left", ...) and spawnPlayer("right", ...)   one ship and one player per side
                -> new Ship(scene, x, y, side)              layer "ship", announced via onSpawned (an actor); the right side gets the red hull
                -> new Player(scene, side, ship)            announced via onPlayerCreated (not an actor)
  -> overlord.resize(width, height)
```

## Per-frame loop

```
Phaser physics step (before the scene update)
  -> overlap(ship layer, planet layer)
       -> Overlord.queueCollision(objA, objB)   maps game objects to actors, only queues the pair
  -> collider(ship-body layer, planet layer, processCallback)   before each contact, handleSolidContact on both actors; the ship then bounces off the planet with the planet's solidBounce

SimpleGameScene.update(time, delta)
  -> Overlord.update(delta)
       -> resolveCollisions()   for each queued pair (skips pairs with an already destroyed actor):
            -> a.handleCollision(b); b.handleCollision(a)
       -> for each player: player.update(state)
       -> for each registered actor: actor.update(delta, state)

Phaser post-update (after the scene update, when bodies are written back to sprites)
  -> Overlord (POST_UPDATE listener)
       -> for each registered actor: actor.lateUpdate()   the ship repositions its flame here
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

- `SimpleGameScene` — Phaser lifecycle, wiring, audio setup (shared with actors through `provideAudio`), resize and the win panel; it never touches actor instances. Its `preload` calls the static `preloadShip`, since Phaser only loads assets inside a scene's `preload`.
- `MainSpawner` — creates actors when asked and announces them to the Overlord; wires nothing.
- `Overlord` — keeps the list of actors and updates them one by one; receives Phaser collisions and tells the colliding actors; owns scores, win status via `GameState`; passes resizes to actors.
- `GameState` — match-wide data: scores, win score, match wins, rotation speed, game-over flag, playfield scale.
- `Actor` (base class) — `audio` gives access to the shared sound player; `handleResize()` defaults to a no-op; `track()` registers Phaser objects so `destroy()` cleans them up; defaults `update()` and `handleCollision()` are no-ops; `remove()` / `onRemove(listener)` ask for and observe removal, `onDestroy(listener)` subscribes to destruction (done by the Overlord); `points` is what hitting it is worth; `collisionLayer` and `colliders` opt it into Phaser collision detection (overlap reports); `solidLayer` and `solids` make its physics bodies bounce off other solids, as the ship does off the planet; `solidBounce` is the bounce it gives a moving solid that hits it, and `handleSolidContact(other)` runs before each solid contact so the moving solid can apply that bounce.
- `Planet` — the central obstacle; a solid that ships bounce off (immovable body, `solidBounce` stronger than the screen edges), and it ignores overlap reports.
- `Ship` (`actors/ship/`, together with its assets and `preloadShip`) — the player's ship: a sprite (`ship.png`; the right player's ship uses a red copy built once at runtime by rotating the hue, `createRedTexture`) with a movement body and nine hull hit circles that turn with it, so the wings count as touching; an engine flame (`fire.png`) drawn behind it, shown only while thrusting and repositioned in `lateUpdate()` (called by the Overlord after the physics step); turns, thrusts with a speed cap (`update` limits its overall velocity) and slows down faster when not thrusting, bounces off world bounds and the planet (`handleSolidContact`), plays the hit sound (throttled) when any hit circle touches the planet, and loops the engine sound (`engine-sound.mp3`) while thrust is held. Ships aren't in any collision or solid pair, so the two ships pass through each other.
- `Player` — not an actor. Reads its side's keys (left player, blue: A/D turn and W thrust; right player, red: arrows, left/right turn and up thrust) and commands its `Ship`.

## Notes

- Phaser only reports overlaps; actors are never destroyed during the physics step. Collisions are queued and resolved in phase 1 of `Overlord.update`, and destruction waits for phase 4.
- Planet body is a circle with `moves = false` and `immovable = true`: Arcade physics reads its (container-transformed) world position but never writes it back, and it is never pushed by a ship.
- Notify-don't-ask: actors call optional callbacks when something happens (`Actor.emit`, `Actor.onRemove` / `Actor.onDestroy` listeners).
