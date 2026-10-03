import "../style.css";
import { renderMainMenu } from "./main/mainMenu";
import { renderGameSelectMenu } from "./game-select/gameSelectMenu";
import { renderSetupMenu } from "./setup/setupMenu";
import Phaser from "phaser";
import { WinPanel } from "../games/01-shoot-the-moons/status/WinPanel";
import _tplMenuShell from "./menu-shell.template.html?raw";

/* Dev-only page (preview.html) that renders each menu screen without starting the game. */

const app = document.querySelector<HTMLDivElement>("#app")!;
const nav = document.querySelector<HTMLDivElement>("#preview-nav")!;

app.innerHTML = _tplMenuShell;
const root = app.querySelector<HTMLElement>("#scene-root")!;

let cleanup: (() => void) | undefined;

/** Boots a bare Phaser scene that shows the in-game WinPanel with sample data. */
const renderWinPanel = () => {
  class WinPanelPreviewScene extends Phaser.Scene {
    private panel?: WinPanel;

    constructor() {
      super("WinPanelPreviewScene");
    }

    create() {
      this.panel = new WinPanel(this, { left: "Player 1", right: "Player 2" }, { left: 2, right: 1 }, {
        onRematch: (adjust) => console.log("rematch", adjust),
        onNextGame: (adjust) => console.log("next game", adjust),
        onFinish: () => console.log("finish"),
        onGameWon: () => ({ left: 0, right: 0 }),
        onResetMatchWins: () => console.log("reset score"),
      });
      this.panel.layout();
      this.scale.on("resize", () => this.panel?.layout());
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    transparent: true,
    scene: [WinPanelPreviewScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
  cleanup = () => game.destroy(true);
};

const screens: Record<string, () => void> = {
  main: () =>
    renderMainMenu({
      root,
      onPlay: () => show("select"),
      onSettings: () => console.log("settings"),
      onCredits: () => console.log("credits"),
    }),
  select: () =>
    renderGameSelectMenu({
      root,
      onSelectGame: (id) => {
        console.log("select game", id);
        show("setup");
      },
      onBack: () => show("main"),
    }),
  setup: () =>
    renderSetupMenu({
      root,
      onStart: (payload) => console.log("start", payload),
      onBack: () => show("select"),
      initialValues: { names: { left: "Player 1", right: "Player 2" }, difficulty: "medium", winScore: 10 },
    }),
  "win panel": renderWinPanel,
};

const show = (name: string) => {
  cleanup?.();
  cleanup = undefined;
  root.innerHTML = "";
  screens[name]();
  history.replaceState(null, "", `#${encodeURIComponent(name)}`);
  nav.querySelectorAll("button").forEach((b) => b.classList.toggle("underline", b.dataset.screen === name));
};

nav.innerHTML = Object.keys(screens)
  .map((name) => `<button data-screen="${name}" class="rounded px-2 py-1 hover:bg-white/20">${name}</button>`)
  .join("");
nav.addEventListener("click", (e) => {
  const name = (e.target as HTMLElement).dataset.screen;
  if (name) show(name);
});

const initial = decodeURIComponent(location.hash.slice(1));
show(initial in screens ? initial : "main");

