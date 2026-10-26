// Demo Mode audio: the browser's built-in speech synthesis. This is NOT AI speech
// and cannot be downloaded; the UI labels it accordingly.

export function demoSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Remove pause tags and audio tags the browser voice would otherwise read aloud. */
export function stripMarkup(text: string): string {
  return text
    .replace(/<break[^>]*\/>/gi, " ")
    .replace(/\[[^\]]{1,40}\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stopDemo(): void {
  if (demoSupported()) window.speechSynthesis.cancel();
}

export function speakDemo(text: string, opts: { pitch: number; rate: number; onEnd: () => void }): boolean {
  if (!demoSupported()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const clean = stripMarkup(text).slice(0, 400);
  if (!clean) return false;
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "en-US";
  u.pitch = Math.min(2, Math.max(0, opts.pitch));
  u.rate = Math.min(1.5, Math.max(0.5, opts.rate));
  u.onend = opts.onEnd;
  u.onerror = opts.onEnd;
  synth.speak(u);
  return true;
}
