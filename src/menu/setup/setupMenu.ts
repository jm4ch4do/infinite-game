import type { Difficulty as _regDifficulty, WinScore as _regWinScore } from "../../games/registry";
import _tplSetupShell from "./setupMenu.template.html?raw";

/*
 * -------------------------------------------------------------------------
 * Setup scene
 * -------------------------------------------------------------------------
 *
 * Layout:
 *   - Centered "Game Setup" title
 *   - Player 1 and Player 2 name inputs
 *   - Difficulty choices: EASY, MEDIUM, and HARD
 *   - Points-to-win choices: 10, 20, and 30
 *   - START and BACK buttons
 */
/** Renders the setup menu, applies initial values, and reports the submitted configuration. */
export const renderSetupMenu = ({
  root,
  onStart,
  onBack,
  initialValues,
}: {
  root: HTMLElement;
  onStart: (payload: { names: { left: string; right: string }; difficulty: _regDifficulty; winScore: _regWinScore }) => void;
  onBack: () => void;
  initialValues?: { names?: { left: string; right: string }; difficulty?: _regDifficulty; winScore?: _regWinScore };
}) => {
  root.innerHTML = _tplSetupShell;

  const player1NameInput = root.querySelector<HTMLInputElement>("#player1-name-input");
  const player2NameInput = root.querySelector<HTMLInputElement>("#player2-name-input");
  const startSetupButton = root.querySelector<HTMLButtonElement>('[data-action="start-setup"]');
  const backButton = root.querySelector<HTMLButtonElement>('[data-action="back"]');
  const difficultyButtons = root.querySelectorAll<HTMLButtonElement>("[data-difficulty]");
  const winScoreButtons = root.querySelectorAll<HTMLButtonElement>("[data-win-score]");

  if (!player1NameInput || !player2NameInput || !startSetupButton || !backButton) {
    throw new Error("Setup menu UI elements are missing");
  }

  /** Marks the option matching the supplied data attribute value as selected. */
  const selectButton = (buttons: NodeListOf<HTMLButtonElement>, attribute: string, value: string) => {
    buttons.forEach((button) => {
      button.classList.toggle("is-selected", button.dataset[attribute] === value);
    });
  };

  player1NameInput.value = initialValues?.names?.left ?? "";
  player2NameInput.value = initialValues?.names?.right ?? "";
  selectButton(difficultyButtons, "difficulty", initialValues?.difficulty ?? "easy");
  selectButton(winScoreButtons, "winScore", String(initialValues?.winScore ?? 10));

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => selectButton(difficultyButtons, "difficulty", button.dataset.difficulty!));
  });

  winScoreButtons.forEach((button) => {
    button.addEventListener("click", () => selectButton(winScoreButtons, "winScore", button.dataset.winScore!));
  });

  startSetupButton.addEventListener("click", () => {
    const names = {
      left: player1NameInput.value.trim() || "Player1",
      right: player2NameInput.value.trim() || "Player2",
    };

    const difficulty = (root.querySelector<HTMLButtonElement>("[data-difficulty].is-selected")?.dataset.difficulty as
      | _regDifficulty
      | undefined) ?? "easy";
    const winScore = (Number(root.querySelector<HTMLButtonElement>("[data-win-score].is-selected")?.dataset.winScore ?? 10) as _regWinScore) || 10;

    onStart({ names, difficulty, winScore });
  });

  backButton.addEventListener("click", onBack);
};
