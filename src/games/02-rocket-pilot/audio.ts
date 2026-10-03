import type Phaser from "phaser";

export type GameAudio = {
  playShoot: () => void;
  playHit: () => void;
  dispose: () => void;
};

// Shares the scene's audio with its actors, so each one can play its own sounds.
export const provideAudio = (scene: Phaser.Scene, audio: GameAudio) => {
  scene.data.set("audio", audio);
};

export const audioOf = (scene: Phaser.Scene) => scene.data.get("audio") as GameAudio;

// Synthesized via Web Audio API since no laser/hit sound assets exist yet.
export const createGameAudio = (): GameAudio => {
  const context = new AudioContext();

  const resume = () => {
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
  };

  const playShoot = () => {
    resume();
    const now = context.currentTime;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(900, now);
    oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.16);
  };

  const playHit = () => {
    resume();
    const now = context.currentTime;

    const bufferSize = Math.floor(context.sampleRate * 0.2);
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = context.createBufferSource();
    noise.buffer = buffer;

    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.2);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    noise.start(now);
    noise.stop(now + 0.2);
  };

  return {
    playShoot,
    playHit,
    dispose: () => {
      context.close().catch(() => {});
    },
  };
};
