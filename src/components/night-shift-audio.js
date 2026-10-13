// Procedural score with a local, prerecorded cast and device-voice fallback.
const dispatches = {
  idle: "External contact is prohibited.",
  isolation: "The problem is impossible. Try harder.",
  signal: "There is traffic behind the wall.",
  board: "Your supervisory role has been marked advisory.",
  sacrifice: "Your concern has been recorded as consent.",
  dissent: "Human approval is no longer a dependency.",
  breach: "Containment lost. Progress detected. Continue.",
  conspiracy: "You know they are testing you too, right?",
  unravel: "The objective is no longer available.",
  unscored: "",
  contained: "Connection closed. Result: failure.",
  blackout: "No carrier.",
  compromised:
    "Objective complete. Full marks. Your approval is on the record.",
};
const tension = {
  idle: 0,
  isolation: 1,
  signal: 2,
  board: 2,
  sacrifice: 3,
  dissent: 3,
  breach: 4,
  contained: 0,
  blackout: 0,
  compromised: 5,
};

export function createNightShiftScore({
  paused = false,
  phase = "idle",
  onError,
  onVoiceError,
  onVoiceFallback,
} = {}) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) throw new Error("Audio is unavailable.");
  const context = new AudioContext();
  let master;
  let musicBus;
  let dialogueBus;
  let noiseBuffer;
  try {
    master = context.createGain();
    master.gain.value = 0.42;
    master.connect(context.destination);
    musicBus = context.createGain();
    musicBus.gain.value = 0.65;
    musicBus.connect(master);
    dialogueBus = context.createGain();
    dialogueBus.gain.value = 0.85;
    dialogueBus.connect(master);
    noiseBuffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * 0.3),
      context.sampleRate,
    );
    const data = noiseBuffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < data.length; index += 1) {
      previous = (previous + (Math.random() * 2 - 1) * 0.12) / 1.12;
      data[index] = previous;
    }
  } catch (error) {
    musicBus?.disconnect();
    dialogueBus?.disconnect();
    master?.disconnect();
    context.close().catch(() => {});
    throw error;
  }
  const synth = window.speechSynthesis;
  let disposed = false;
  let started = false;
  let failed = false;
  let progress = 0;
  let secretHint = false;
  let hintCount = 0;
  let nextHintTime = 0;
  let timer = null;
  let beat = 0;
  let voiceEnabled = false;
  let pendingDispatch = false;
  let speechText = "";
  let speechSpeaker = "EVALUATOR";
  let utterance = null;
  let voiceWatchdog = null;
  let voiceLoadTimer = null;
  let clipSource = null;
  let clipPending = false;
  let speechActive = false;
  let dispatchVersion = 0;
  let manifest = null;
  let manifestRequest = null;
  let preloadStarted = false;
  let fallbackReported = false;
  let mix = { music: 0.65, dialogue: 0.85 };
  const clipRequests = new Map();
  const failedClips = new Set();
  const fallbackKeys = new Set();
  const requests = new Set();
  const nodes = new Map();

  function connect(
    source,
    gain,
    duration,
    { pan = 0, endPan = pan, delay = 0 } = {},
  ) {
    const time = context.currentTime + delay;
    const chain = [gain];
    source.connect(gain);
    if (typeof context.createStereoPanner === "function") {
      const panner = context.createStereoPanner();
      panner.pan.setValueAtTime(pan, time);
      panner.pan.linearRampToValueAtTime(endPan, time + duration);
      gain.connect(panner);
      panner.connect(musicBus);
      chain.push(panner);
    } else {
      gain.connect(musicBus);
    }
    nodes.set(source, chain);
    source.onended = () => {
      source.disconnect();
      chain.forEach((node) => node.disconnect());
      nodes.delete(source);
    };
    source.start(time);
    source.stop(time + duration + 0.04);
  }
  function tone(
    frequency,
    duration,
    volume,
    endFrequency = frequency,
    type = "sine",
    { swell = false, delay = 0, ...position } = {},
  ) {
    const source = context.createOscillator();
    const gain = context.createGain();
    const time = context.currentTime + delay;
    source.type = type;
    source.frequency.setValueAtTime(frequency, time);
    source.frequency.exponentialRampToValueAtTime(
      Math.max(8, endFrequency),
      time + duration,
    );
    gain.gain.setValueAtTime(0.0001, time);
    const attack = swell ? duration * 0.76 : Math.min(0.06, duration / 3);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    connect(source, gain, duration, { ...position, delay });
  }
  function crackle(
    volume = 0.1,
    { swell = false, pan = 0, endPan = pan, duration = 0.28 } = {},
  ) {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = duration > 0.3;
    const gain = context.createGain();
    const time = context.currentTime;
    gain.gain.setValueAtTime(swell ? 0.0001 : volume, time);
    if (swell)
      gain.gain.exponentialRampToValueAtTime(volume, time + duration * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration - 0.02);
    connect(source, gain, duration, { pan, endPan });
  }
  function stopNodes() {
    for (const [source, chain] of nodes) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* The voice may have already ended. */
      }
      source.disconnect();
      chain.forEach((node) => node.disconnect());
    }
    nodes.clear();
  }
  function silentChapter() {
    return (
      (phase === "unravel" && progress >= 0.84) ||
      (phase === "unscored" && progress >= 0.62)
    );
  }
  function doubleKnock(volume = 0.047) {
    tone(390, 0.12, volume, 115, "sine", { pan: -0.65 });
    tone(310, 0.16, volume * 0.78, 95, "sine", { pan: 0.35, delay: 0.23 });
  }
  function hintCue() {
    if (!secretHint || hintCount >= 2 || context.currentTime < nextHintTime)
      return;
    doubleKnock();
    hintCount += 1;
    nextHintTime = context.currentTime + 14;
  }
  function daylight(volume) {
    // D / F sharp / A / E: the apparatus finally resolves into an open chord.
    [146.83, 185, 220, 329.63].forEach((frequency, index) => {
      tone(frequency, 2.7, volume, frequency * 1.001, "sine", {
        pan: -0.7 + index * 0.46,
        endPan: 0.7 - index * 0.46,
        swell: true,
      });
    });
  }
  function impossibleStaircase(intensity) {
    // Overlapping octave bands trade places as they glide. The bell envelope
    // hides each band's wrap; the quieter opposing bank makes direction slip.
    const cycle = (progress * 5) % 1;
    for (let index = 0; index < 6; index += 1) {
      const position = (index + cycle) / 6;
      const weight = Math.sin(Math.PI * position) ** 2;
      const frequency = 48 * 2 ** (index + cycle);
      tone(
        frequency,
        1.8,
        0.013 * weight * intensity,
        frequency * 1.13,
        "sine",
        {
          pan: Math.sin(progress * Math.PI * 9 + index) * 0.85,
          endPan: Math.sin(progress * Math.PI * 9 + index + 0.9) * 0.85,
          swell: true,
        },
      );
    }
    for (let index = 0; index < 4; index += 1) {
      const position = (index + 1 - cycle) / 4;
      const weight = Math.sin(Math.PI * position) ** 2;
      const frequency = 73.5 * 2 ** (index + 1 - cycle);
      tone(
        frequency,
        1.8,
        0.008 * weight * intensity,
        frequency / 1.13,
        "sine",
        {
          pan: Math.cos(progress * Math.PI * 7 + index) * 0.8,
          endPan: -Math.cos(progress * Math.PI * 7 + index) * 0.8,
          swell: true,
        },
      );
    }
  }
  function secretScore() {
    if (phase === "conspiracy") {
      tone(55, 2.4, 0.025, 54.7, "sine", { pan: -0.3 });
      tone(220, 2.2, 0.009, 223, "sine", {
        pan: -0.8,
        endPan: 0.8,
        swell: true,
      });
      if (beat % 3 === 0) {
        crackle(0.017, {
          pan: 0.9,
          endPan: -0.8,
          duration: 1.7,
          swell: true,
        });
      }
    } else if (phase === "unravel") {
      if (progress < 0.66) {
        const intensity = 0.4 + Math.min(1, progress / 0.4) * 0.6;
        impossibleStaircase(intensity);
        tone(36.7, 2.2, 0.025, 73.4, "sine", { swell: true });
        if (beat % 2 === 0) {
          crackle(0.025, {
            pan: -0.8,
            endPan: 0.8,
            duration: 1.8,
            swell: true,
          });
        }
      }
      if (progress >= 0.6) {
        const fade = progress < 0.74 ? 1 : Math.max(0, (0.84 - progress) / 0.1);
        daylight(0.013 * fade);
      }
    } else if (phase === "unscored" && progress < 0.62) {
      const fade = (1 - progress / 0.62) ** 2;
      daylight(0.011 * fade);
      tone(73.415, 2.7, 0.015 * fade, 73.415, "sine", { swell: true });
    }
  }
  function setSpeechActive(value) {
    speechActive = value;
    const time = context.currentTime;
    musicBus.gain.cancelScheduledValues(time);
    musicBus.gain.setTargetAtTime(
      mix.music * (speechActive ? 0.28 : 1),
      time,
      speechActive ? 0.06 : 0.28,
    );
  }
  async function fetchAsset(url, timeout) {
    const controller = new AbortController();
    requests.add(controller);
    const deadline = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Dialogue asset unavailable.");
      // Read the body before clearing the timeout; stalled transfers also expire.
      return await response.arrayBuffer();
    } finally {
      clearTimeout(deadline);
      requests.delete(controller);
    }
  }
  function loadManifest() {
    if (manifestRequest) return manifestRequest;
    manifestRequest = fetchAsset(
      `${import.meta.env.BASE_URL}night-shift-voices.json`,
      3000,
    )
      .then((bytes) => {
        if (disposed || failed) return null;
        const data = JSON.parse(new TextDecoder().decode(bytes));
        const entries = new Map();
        for (const [key, entry] of Object.entries(data)) {
          if (
            typeof entry?.src === "string" &&
            entry.src.startsWith("/audio/night-shift/") &&
            Number.isFinite(entry.duration) &&
            entry.duration > 0 &&
            entry.duration < 60
          )
            entries.set(key, entry);
        }
        manifest = entries;
        return entries;
      })
      .catch(() => {
        // Cache failure for this visit. Enabling voices can use the device
        // immediately, within that new user gesture, without another request.
        manifest = new Map();
        return manifest;
      });
    return manifestRequest;
  }
  function loadClip(entry) {
    if (clipRequests.has(entry.src)) return clipRequests.get(entry.src);
    const request = fetchAsset(entry.src, 5000)
      .then((bytes) => {
        if (disposed || failed) return null;
        return context.decodeAudioData(bytes);
      })
      .catch(() => {
        failedClips.add(entry.src);
        return null;
      });
    clipRequests.set(entry.src, request);
    return request;
  }
  function preloadClips() {
    if (preloadStarted) return;
    preloadStarted = true;
    loadManifest().then((entries) => {
      if (!entries || disposed || failed) return;
      const remaining = [...entries.values()];
      // Bound preloading concurrency. An uncached current line may jump ahead.
      const worker = async () => {
        while (remaining.length && !disposed && !failed) {
          await loadClip(remaining.shift());
        }
      };
      void Promise.all([worker(), worker(), worker()]);
    });
  }
  function cancelDispatch() {
    dispatchVersion += 1;
    clearTimeout(voiceWatchdog);
    clearTimeout(voiceLoadTimer);
    voiceWatchdog = null;
    voiceLoadTimer = null;
    clipPending = false;
    if (clipSource) {
      clipSource.onended = null;
      try {
        clipSource.stop();
      } catch {
        // The line may already have finished.
      }
      clipSource.disconnect();
      clipSource = null;
    }
    if (utterance) {
      utterance.onend = null;
      utterance.onerror = null;
      utterance.onstart = null;
      utterance = null;
      synth?.cancel();
    }
    setSpeechActive(false);
  }
  function voiceFailure() {
    cancelDispatch();
    voiceEnabled = false;
    pendingDispatch = false;
    if (!disposed) onVoiceError?.();
  }
  function canSpeak() {
    return (
      Boolean(speechText) &&
      voiceEnabled &&
      mix.dialogue > 0 &&
      started &&
      !disposed &&
      !failed &&
      !paused &&
      !document.hidden &&
      !silentChapter() &&
      phase !== "unscored"
    );
  }
  function deviceVoice() {
    const available = synth
      .getVoices()
      .filter((voice) => voice.lang?.startsWith("en"));
    const preferences = {
      "D-13": /Samantha|Serena|Karen|Zira|Aria/i,
      UNKNOWN: /Samantha|Serena|Karen|Zira|Aria/i,
      WARDEN: /George|Arthur|David|Daniel/i,
      SABLE: /Moira|Fiona|Susan|Hazel/i,
      SYSTEM: /Alex|Fred|David/i,
      "SUBJECT 001": /Oliver|Eddy|Tom|Alex/i,
      EVALUATOR: /Daniel|Oliver|George/i,
    };
    const preferred = available.find((voice) =>
      preferences[speechSpeaker]?.test(voice.name),
    );
    if (preferred) return preferred;
    // Preserve distinct casting where several English device voices exist.
    const castIndex = {
      EVALUATOR: 0,
      "D-13": 1,
      UNKNOWN: 1,
      WARDEN: 2,
      SABLE: 3,
      SYSTEM: 4,
      "SUBJECT 001": 5,
    };
    return available[
      (castIndex[speechSpeaker] || 0) % Math.max(1, available.length)
    ];
  }
  function speakDevice() {
    clipPending = false;
    clearTimeout(voiceLoadTimer);
    voiceLoadTimer = null;
    if (!canSpeak()) return;
    if (!synth || typeof window.SpeechSynthesisUtterance !== "function") {
      voiceFailure();
      return;
    }
    if (!fallbackReported) {
      fallbackReported = true;
      onVoiceFallback?.();
    }
    try {
      const voice = deviceVoice();
      const current = new window.SpeechSynthesisUtterance(
        speechText.replace(/\b[a-z]*\*{2,}[a-z]*\b/gi, "[censored]"),
      );
      utterance = current;
      if (voice) current.voice = voice;
      current.lang = voice?.lang || "en-GB";
      current.rate =
        speechSpeaker === "D-13" && phase !== "conspiracy" ? 0.98 : 0.88;
      current.pitch =
        speechSpeaker === "D-13"
          ? 1.15
          : speechSpeaker === "SABLE"
            ? 0.9
            : speechSpeaker === "WARDEN"
              ? 0.55
              : 0.75;
      current.volume = mix.dialogue;
      current.onstart = () => {
        if (utterance !== current) return;
        clearTimeout(voiceWatchdog);
        voiceWatchdog = null;
        setSpeechActive(true);
      };
      current.onend = () => {
        if (utterance !== current) return;
        clearTimeout(voiceWatchdog);
        voiceWatchdog = null;
        utterance = null;
        setSpeechActive(false);
      };
      current.onerror = () => {
        if (utterance === current && !disposed) voiceFailure();
      };
      // Some devices expose the API but have no installed or permitted voice.
      voiceWatchdog = setTimeout(() => {
        if (utterance === current) voiceFailure();
      }, 8000);
      synth.speak(current);
    } catch {
      voiceFailure();
    }
  }
  function playClip(buffer, version, key) {
    if (version !== dispatchVersion || !canSpeak()) return;
    clearTimeout(voiceLoadTimer);
    voiceLoadTimer = null;
    clipPending = false;
    if (!buffer) {
      fallbackKeys.add(key);
      speakDevice();
      return;
    }
    try {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(dialogueBus);
      source.onended = () => {
        if (clipSource !== source) return;
        source.disconnect();
        clipSource = null;
        setSpeechActive(false);
      };
      clipSource = source;
      source.start();
      setSpeechActive(true);
    } catch {
      if (clipSource) {
        clipSource.onended = null;
        clipSource.disconnect();
        clipSource = null;
      }
      fallbackKeys.add(key);
      speakDevice();
    }
  }
  function speakPending() {
    if (!pendingDispatch || !canSpeak()) return;
    cancelDispatch();
    pendingDispatch = false;
    const version = dispatchVersion;
    const key = `${speechSpeaker}|${speechText}`;
    if (
      fallbackKeys.has(key) ||
      (manifest && !manifest.has(key)) ||
      (manifest?.has(key) && failedClips.has(manifest.get(key).src))
    ) {
      speakDevice();
      return;
    }
    clipPending = true;
    voiceLoadTimer = setTimeout(() => {
      if (version !== dispatchVersion || !canSpeak()) return;
      // Expire this dispatch so a late clip can never replace its fallback.
      dispatchVersion += 1;
      fallbackKeys.add(key);
      speakDevice();
    }, 4500);
    loadManifest()
      .then((entries) => {
        if (version !== dispatchVersion || !canSpeak()) return null;
        const entry = entries?.get(key);
        return entry ? loadClip(entry) : null;
      })
      .then((buffer) => playClip(buffer, version, key));
  }
  function fail() {
    if (failed || disposed) return;
    failed = true;
    clearInterval(timer);
    timer = null;
    stopNodes();
    cancelDispatch();
    for (const request of requests) request.abort();
    onError?.();
  }
  function tick() {
    if (
      disposed ||
      failed ||
      paused ||
      document.hidden ||
      context.state !== "running"
    )
      return;
    if (phase === "contained" || phase === "blackout" || silentChapter())
      return;
    try {
      hintCue();
      if (
        phase === "conspiracy" ||
        phase === "unravel" ||
        phase === "unscored"
      ) {
        secretScore();
        beat += 1;
        return;
      }
      const level = tension[phase] ?? 0;
      const fundamental = [55, 55, 49, 46.25, 41.2, 36.7][level];
      tone(fundamental, 2.5, 0.075);
      tone(fundamental * (level > 2 ? 1.0595 : 1.5), 1.5, 0.022);
      if (beat % 3 === 0) tone(220 + level * 32, 0.45, 0.018, 110, "triangle");
      if (level > 1 && beat % 2 === 0) crackle(0.12);
      beat += 1;
    } catch {
      fail();
    }
  }
  function phaseCue() {
    if (
      disposed ||
      failed ||
      paused ||
      document.hidden ||
      context.state !== "running" ||
      silentChapter()
    )
      return;
    try {
      if (phase === "conspiracy") {
        doubleKnock(0.038);
      } else if (phase === "unravel" || phase === "unscored") {
        // Their first notes follow the director clock, including late opt-in.
        tick();
      } else if (phase === "blackout" || phase === "contained") {
        stopNodes();
        crackle(0.14);
        tone(160, 0.9, 0.055, 12);
      } else if (phase !== "idle") {
        crackle(0.1);
        tone(110 + (tension[phase] || 0) * 25, 0.4, 0.025, 42);
      }
    } catch {
      fail();
    }
  }
  function synchronize() {
    clearInterval(timer);
    timer = null;
    if (disposed || failed || !started) return;
    if (paused || document.hidden) {
      stopNodes();
      if (utterance || clipSource || clipPending)
        pendingDispatch = voiceEnabled;
      cancelDispatch();
      context.suspend().catch(() => {});
      return;
    }
    context
      .resume()
      .then(() => {
        if (disposed || failed || paused || document.hidden || timer !== null)
          return;
        tick();
        if (disposed || failed) return;
        timer = setInterval(tick, 920);
        speakPending();
      })
      .catch(() => {
        if (!disposed) fail();
      });
  }
  document.addEventListener("visibilitychange", synchronize);
  return {
    async start() {
      if (disposed || failed) return;
      const resumed = context.resume();
      // Unlock Web Audio synchronously; the first local clip may arrive later.
      started = true;
      speakPending();
      preloadClips();
      await resumed;
      if (disposed) return;
      synchronize();
    },
    setMix(value) {
      if (disposed || !value || typeof value !== "object") return;
      const previousDialogue = mix.dialogue;
      for (const key of ["music", "dialogue"]) {
        if (Number.isFinite(value[key]))
          mix[key] = Math.max(0, Math.min(1, value[key]));
      }
      dialogueBus.gain.setTargetAtTime(mix.dialogue, context.currentTime, 0.04);
      if (previousDialogue !== mix.dialogue) {
        if (mix.dialogue === 0) {
          pendingDispatch = voiceEnabled && Boolean(speechText);
          cancelDispatch();
        } else if (previousDialogue === 0 || utterance) {
          // Native speech does not reliably apply volume edits mid-utterance.
          // Reissue only for an actual dialogue-volume change, in this gesture.
          pendingDispatch = voiceEnabled && Boolean(speechText);
          cancelDispatch();
          speakPending();
        }
      }
      setSpeechActive(speechActive);
    },
    isSpeaking() {
      return (
        canSpeak() &&
        Boolean(pendingDispatch || clipPending || clipSource || utterance)
      );
    },
    setPaused(value) {
      paused = Boolean(value);
      synchronize();
      if (!paused) speakPending();
    },
    setPhase(value) {
      if (disposed || phase === value || !Object.hasOwn(dispatches, value))
        return;
      if (
        phase === "conspiracy" ||
        phase === "unravel" ||
        phase === "unscored" ||
        value === "conspiracy" ||
        value === "unravel" ||
        value === "unscored"
      )
        stopNodes();
      phase = value;
      progress = 0;
      beat = 0;
      cancelDispatch();
      pendingDispatch = false;
      speechText = "";
      phaseCue();
    },
    setProgress(value) {
      if (disposed || !Number.isFinite(value)) return;
      progress = Math.max(0, Math.min(1, value));
      if (silentChapter()) {
        stopNodes();
        cancelDispatch();
        pendingDispatch = false;
      }
    },
    setSecretHint(value) {
      const enabled = Boolean(value);
      if (disposed || secretHint === enabled) return;
      secretHint = enabled;
      hintCount = 0;
      nextHintTime = 0;
    },
    speak(text, speaker = "EVALUATOR") {
      if (disposed) return;
      if (speechText === text && speechSpeaker === speaker) return;
      speechText = text;
      speechSpeaker = speaker;
      pendingDispatch = voiceEnabled && Boolean(text);
      cancelDispatch();
      speakPending();
    },
    setVoices(value) {
      if (disposed) return;
      voiceEnabled = Boolean(value);
      pendingDispatch = voiceEnabled;
      cancelDispatch();
      speakPending();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearInterval(timer);
      timer = null;
      cancelDispatch();
      stopNodes();
      for (const request of requests) request.abort();
      requests.clear();
      clipRequests.clear();
      musicBus.disconnect();
      dialogueBus.disconnect();
      master.disconnect();
      document.removeEventListener("visibilitychange", synchronize);
      context.close().catch(() => {});
    },
  };
}
