import _assetBgMusicUrl from "../assets/sounds/cyber-theme.ogg";
import _assetClickSoundUrl from "../assets/sounds/menu-click.wav";

export type MenuAudio = {
  startMenuMusic: () => Promise<void>;
  playHover: () => void;
  playClick: () => void;
};

const playSfx = (sourceAudio: HTMLAudioElement) => {
  const sfx = sourceAudio.cloneNode() as HTMLAudioElement;
  sfx.volume = sourceAudio.volume;
  sfx.play().catch(() => {
    // Ignore blocked play attempts before a user gesture.
  });
};

export const createMenuAudio = (): MenuAudio => {
  const bgMusic = new Audio(_assetBgMusicUrl);
  const hoverSound = new Audio(_assetClickSoundUrl);
  const clickSound = new Audio(_assetClickSoundUrl);

  bgMusic.loop = true;
  bgMusic.volume = 0.35;
  bgMusic.preload = "auto";
  hoverSound.volume = 0.45;
  hoverSound.preload = "auto";
  clickSound.volume = 0.55;
  clickSound.preload = "auto";

  return {
    startMenuMusic: async () => {
      try {
        await bgMusic.play();
      } catch {
        // Browser may still block until first trusted interaction.
      }
    },
    playHover: () => playSfx(hoverSound),
    playClick: () => playSfx(clickSound),
  };
};
