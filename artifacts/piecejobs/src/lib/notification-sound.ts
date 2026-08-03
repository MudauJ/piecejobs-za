// Extend Window to hold the pre-unlocked AudioContext
declare global {
  interface Window {
    unlockedAudioContext?: AudioContext;
  }
}

/**
 * Plays a soft bell/ding using the Web Audio API.
 * Reuses window.unlockedAudioContext if available (unlocked by a prior user click).
 */
export function playNotificationSound(): void {
  try {
    const AudioCtx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    const ctx = window.unlockedAudioContext || new AudioCtx();

    const oscillator = ctx.createOscillator();
    const gainNode   = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.log("Audio play failed:", e);
  }
}
