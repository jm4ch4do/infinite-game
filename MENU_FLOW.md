# Menu Navigation Flow

```mermaid
graph TD
    M["main.ts"] -->|mountMenu| MT["<b>Mount Menu</b><br/>mountMenu(root)"]
    
    MT --> A["<b>Main Menu</b><br/>renderMainScene"]
    A -->|PLAY| B["<b>Game Select</b><br/>renderGameSelectScene"]
    
    B -->|BACK| A
    B -->|Select Game| D["<b>Setup Screen</b><br/>renderSetupScene"]
    
    D -->|BACK| B
    D -->|START| E["<b>Begin Game</b><br/>beginGame"]
    
    E -->|REMATCH<br/>Same Settings| E
    E -->|REMATCH<br/>Adjust Settings| D
    E -->|CHANGE GAME| B
    E -->|CHANGE GAME<br/>Adjust Settings| D
    E -->|Random Next Game| D
    
    E -->|FINISH| G["🎮<br/>Phaser Game<br/>Running"]
    G -->|ESC or Quit| B
    
    linkStyle 6,7,10,13 stroke-width:3px
```

## Flow Overview

- **Boxes**: Menu navigation screens and game states
- **Diamonds**: Conditional routing (2-player check)
- **Arrows**: Transitions and what triggers them

The menu system handles navigation between screens, game selection, player setup, and game lifecycle management. Shared state like `pendingGameId`, `savedPlayerNames`, and `matchWins` is owned by `mountMenu()` and passed to the relevant screen callbacks.
