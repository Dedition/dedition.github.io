const storageKey = "leo-night-shift-audio-v1";
const defaults = { sound: true, voices: true, music: 0.65, dialogue: 0.85 };
let sessionPreferences;

function normalize(value) {
  const source = value && typeof value === "object" ? value : {};
  const level = (key) =>
    typeof source[key] === "number" && Number.isFinite(source[key])
      ? Math.max(0, Math.min(1, source[key]))
      : defaults[key];
  const sound =
    typeof source.sound === "boolean" ? source.sound : defaults.sound;
  return {
    sound,
    voices:
      sound &&
      (typeof source.voices === "boolean" ? source.voices : defaults.voices),
    music: level("music"),
    dialogue: level("dialogue"),
  };
}

export function readAudioPreferences() {
  if (sessionPreferences) return { ...sessionPreferences };
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) sessionPreferences = normalize(JSON.parse(stored));
  } catch {
    // Browsers can block storage; preferences still survive reopening this page.
  }
  return { ...(sessionPreferences || defaults) };
}

export function saveAudioPreferences(value) {
  sessionPreferences = normalize(value);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(sessionPreferences));
  } catch {
    // Keep the in-memory choice when durable storage is unavailable.
  }
}
