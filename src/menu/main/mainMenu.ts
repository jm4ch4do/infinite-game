/*
 * -------------------------------------------------------------------------
 * Main menu scene
 * -------------------------------------------------------------------------
 *
 * Layout:
 *   - Centered "Infinite Game" title
 *   - Version and ready-status text
 *   - PLAY GAME, SETTINGS, and CREDITS buttons
 */
import _tplMainMenuShell from "./mainMenu.template.html?raw";

/** Renders the main menu and connects its buttons to the supplied actions. */
export const renderMainMenu = ({
  root,
  onPlay,
  onSettings,
  onCredits,
}: {
  root: HTMLElement;
  onPlay: () => void;
  onSettings: () => void;
  onCredits: () => void;
}) => {
  root.innerHTML = _tplMainMenuShell;

  const playButton = root.querySelector<HTMLButtonElement>('[data-action="play"]');
  const settingsButton = root.querySelector<HTMLButtonElement>('[data-action="settings"]');
  const creditsButton = root.querySelector<HTMLButtonElement>('[data-action="credits"]');

  if (!playButton || !settingsButton || !creditsButton) {
    throw new Error("Main menu UI elements are missing");
  }

  playButton.addEventListener("click", onPlay);
  settingsButton.addEventListener("click", onSettings);
  creditsButton.addEventListener("click", onCredits);
};
