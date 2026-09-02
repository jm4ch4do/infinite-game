/*
 * -------------------------------------------------------------------------
 * Game select scene
 * -------------------------------------------------------------------------
 *
 * Layout:
 *   - Centered "Select Game" title
 *   - One button for each registered game
 *   - BACK button to return to the main menu
 */
import _tplGameSelectShell from "./gameSelectMenu.template.html?raw";

/** Renders the game selection menu and connects game and back buttons. */
export const renderGameSelectMenu = ({
  root,
  onSelectGame,
  onBack,
}: {
  root: HTMLElement;
  onSelectGame: (gameId: string) => void;
  onBack: () => void;
}) => {
  root.innerHTML = _tplGameSelectShell;

  const gameButtons = root.querySelectorAll<HTMLButtonElement>("[data-game-id]");
  const backButton = root.querySelector<HTMLButtonElement>('[data-action="back"]');

  if (!gameButtons.length || !backButton) {
    throw new Error("Game select menu UI elements are missing");
  }

  gameButtons.forEach((button) => {
    button.addEventListener("click", () => onSelectGame(button.dataset.gameId!));
  });

  backButton.addEventListener("click", onBack);
};
