# Infinite Game

A multi-game platform built with Phaser and TypeScript, featuring a modular menu system and support for single-player and multiplayer games.

## Features

- **Dynamic Menu System**: Navigate between main menu, game selection, and setup screens
- **Multi-Player Support**: Built-in support for 1-player and 2-player games
- **Game Registry**: Modular game system with easy game addition
- **Audio Integration**: Menu audio and sound effects
- **Score Tracking**: Match win tracking and player statistics

## Project Structure

```
src/
├── menu/              # Menu system and UI
│   ├── main/          # Main menu screen
│   ├── game-select/   # Game selection screen
│   ├── setup/         # Player setup and configuration
│   └── audio.ts       # Menu audio management
├── games/             # Game implementations
│   ├── 01-simple-game/  # First game example
│   ├── 02-simple-game-copy/
│   └── registry.ts    # Game registry
└── assets/            # Shared assets (sounds, etc.)
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser

## Architecture

See [MENU_FLOW.md](MENU_FLOW.md) for the menu navigation flow diagram and system architecture.

## Build

```bash
npm run build
```

## Technologies

- **Phaser 3**: Game framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
