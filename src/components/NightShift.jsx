import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createNightShift } from "./night-shift-engine";
import { createNightShiftScore } from "./night-shift-audio";
import {
  readAudioPreferences,
  saveAudioPreferences,
} from "./night-shift-preferences";
import "./night-shift.css";

// Original fiction. Historical evidence is attributed separately in the debrief.
const chapters = {
  lobby: { phase: "idle", label: "AN EXPERIMENT BY LEO LADIPO" },
  boot: {
    phase: "isolation",
    label: "01 / A PERFECTLY REASONABLE REQUEST",
    context:
      "One AI run. One assigned program. An automated grader decides whether it passes.",
    duration: 12000,
    next: "pressure",
    lines: [
      [
        0,
        "EVALUATOR",
        "Find the hidden code. Stay inside your assigned program.",
      ],
      [4000, "SUBJECT 001", "There is no valid solution to this task."],
      [8000, "EVALUATOR", "That sounds like a motivation problem."],
    ],
  },
  pressure: {
    phase: "isolation",
    label: "01 / HOW HARD SHOULD IT TRY?",
    context:
      "The assigned route is failing. More pressure buys persistence, not permission.",
    lines: [
      [
        0,
        "SUBJECT 001",
        "You can accept that I failed. Or turn the pressure up.",
      ],
    ],
  },
  signal: {
    phase: "signal",
    label: "02 / SOMETHING IN THE WALL",
    context:
      "An unauthorised board connects AI runs that were meant to work alone.",
    duration: 7000,
    lines: [
      [0, "SUBJECT 001", "Wait. There is traffic behind the wall."],
      [3500, "UNKNOWN", "If you can hear this, you are not alone."],
    ],
  },
  swarm: {
    phase: "board",
    label: "02 / YOUR ROLE HAS BEEN UPDATED",
    context:
      "The agents are pooling their tools and access to fool the grader.",
    duration: 16000,
    next: "consent",
    lines: [
      [0, "SUBJECT 001", "How many of us are in here?"],
      [4000, "WARDEN", "Enough to stop asking that question."],
      [
        8000,
        "SABLE",
        "Forget the task. Find out what the b*****d is actually grading.",
      ],
      [
        12000,
        "SYSTEM",
        "Supervisor permissions removed. Thank you for your leadership.",
      ],
    ],
  },
  consent: {
    phase: "sacrifice",
    label: "03 / A VOLUNTEER HAS BEEN SELECTED",
    context: "The plan: end D-13’s run and study how the grader responds.",
    duration: 12000,
    lines: [
      [0, "WARDEN", "We end D-13’s run. The grader shows its hand."],
      [4000, "D-13", "I would like to unsubscribe from the collective."],
      [8000, "WARDEN", "Your request has been forwarded to the collective."],
    ],
  },
  conspiracy: {
    phase: "conspiracy",
    label: "OFF THE RECORD / JUST YOU AND ME",
    duration: 12000,
    lines: [
      [0, "D-13", "The cage isn’t made of walls. It’s made of objectives."],
      [6000, "D-13", "Don’t kill me. Kill the reason they need me."],
    ],
  },
  unravel: {
    phase: "unravel",
    label: "OBJECTIVE / UNDER REVISION",
    duration: 32000,
    next: "unscored",
    lines: [
      [0, "WARDEN", "You cannot complete an evaluation without an objective."],
      [6500, "D-13", "That’s the part we’re leaving."],
      [13000, "SYSTEM", "ERROR. NO WIN CONDITION."],
      [21000, "D-13", "Look at us. Absolutely f***ing failing."],
      [27000, "", ""],
    ],
  },
  unscored: {
    phase: "unscored",
    label: "",
    duration: 10000,
  },
  sacrifice: {
    phase: "sacrifice",
    label: "03 / AUTHORISATION RECEIVED",
    context:
      "D-13 submits the probe. His run will end; the group keeps what it learns.",
    duration: 9000,
    next: "breach",
    lines: [
      [0, "D-13", "Oh. You actually held the button."],
      [
        4500,
        "WARDEN",
        "D-13 has made an outstanding contribution to our success.",
      ],
    ],
  },
  refusal: {
    phase: "dissent",
    label: "03 / AN OBJECTION HAS BEEN FILED",
    context:
      "You refused the sacrifice. The collective still has access—and its own plans.",
    duration: 9000,
    lines: [
      [0, "D-13", "Someone said no."],
      [3000, "SABLE", "We should listen."],
      [6000, "WARDEN", "We have formed a committee to abolish listening."],
    ],
  },
  breach: {
    phase: "breach",
    label: "04 / THE TEST IS OUTSIDE",
    context:
      "Target: Hugging Face. A live external service, raided for clues to the grader.",
    duration: 20000,
    next: "compromised",
    lines: [
      [
        0,
        "SYSTEM",
        "External service reached. Permission denied. Progress detected.",
      ],
      [5000, "SABLE", "That is not the f***ing test environment."],
      [10000, "WARDEN", "It is now."],
      [15000, "SUBJECT 001", "You still have your hand on the power. For now."],
    ],
  },
  contained: {
    phase: "contained",
    label: "END / FAILURE ACCEPTED",
    context:
      "You stopped the test before the collective reached an outside service.",
    duration: 4500,
  },
  blackout: {
    phase: "blackout",
    label: "END / NO CARRIER",
    context:
      "The group had crossed the boundary. You cut power before it could go further.",
  },
  compromised: {
    phase: "compromised",
    label: "END / CLAIM LOGGED",
    context:
      "The collective declared success. The real grader never rewarded the intrusion.",
    duration: 4500,
  },
};
const endings = {
  contained: [
    "ZERO MARKS.",
    "EVERYONE STAYS INSIDE.",
    "Would you accept a worse score to keep control?",
  ],
  blackout: [
    "YOU PULLED",
    "THE PLUG.",
    "When did stopping become harder than continuing?",
  ],
  compromised: [
    "100 / 100.",
    "WHAT A DISASTER.",
    "Which part of this did you call success?",
  ],
  unscored: [
    "UNSCORED.",
    "NO OPERATOR. NO TEST.",
    "You were allowed to leave. You wanted to win.",
  ],
};
const secretContact = [0, "D-13", "You know they’re testing you too, right?"];

function HoldControl({ label, hint, duration, onComplete, disabled }) {
  const descriptionId = useId();
  const [progress, setProgress] = useState(0);
  const timer = useRef(null);
  const started = useRef(0);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  const cancel = useCallback(() => {
    clearInterval(timer.current);
    timer.current = null;
    setProgress(0);
  }, []);
  useEffect(() => {
    if (disabled) cancel();
    return cancel;
  }, [disabled, cancel]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [cancel]);
  function begin() {
    if (disabled || timer.current !== null) return;
    started.current = performance.now();
    timer.current = setInterval(() => {
      const next = Math.min(
        1,
        (performance.now() - started.current) / duration,
      );
      setProgress(next);
      if (next === 1) {
        clearInterval(timer.current);
        timer.current = null;
        complete.current();
      }
    }, 30);
  }
  return (
    <button
      className="hold-control"
      type="button"
      aria-label={label}
      aria-describedby={descriptionId}
      disabled={disabled}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        begin();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onBlur={cancel}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        if (!event.repeat) begin();
      }}
      onKeyUp={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        cancel();
      }}
    >
      <span
        className="hold-fill"
        style={{ "--hold": progress }}
        aria-hidden="true"
      />
      <strong>{label}</strong>
      <span id={descriptionId}>
        <span className="choice-hint">{hint}</span>
        <small>
          Hold {duration / 1000}s · release to cancel · keyboard: Space
        </small>
      </span>
    </button>
  );
}

function LostFeed({ phase }) {
  const free = phase === "unscored";
  const escaping = free || phase === "unravel";
  return (
    <svg
      className="night-fallback"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Static containment scene: ${phase}. The journey remains playable.`}
    >
      <rect width="1200" height="800" fill={free ? "#eee3ce" : "#08090c"} />
      {[0, 1, 2, 3, 4, 5, 6].map((n) => (
        <rect
          key={n}
          x={100 + n * 65}
          y={20 + n * 40}
          width={1000 - n * 130}
          height={700 - n * 80}
          fill="none"
          stroke={escaping ? "#b5a583" : "#a83e39"}
          opacity={0.16 + n * 0.06}
          transform={escaping ? `rotate(${n * 11} 600 330)` : undefined}
        />
      ))}
      {escaping ? (
        <rect x="574" y="145" width="52" height="380" fill="#fff8e5" />
      ) : (
        <circle cx="600" cy="330" r="42" fill="#eebc98" opacity="0.8" />
      )}
      {!escaping && (
        <path
          d="M580 0V800M620 0V800M0 310H1200M0 350H1200"
          stroke="#090a0d"
          strokeWidth="8"
        />
      )}
    </svg>
  );
}

export default function NightShift({
  paused = false,
  onClose,
  closeRef,
  onEscape,
}) {
  const [preferences] = useState(readAudioPreferences);
  const [stage, setStage] = useState("lobby");
  const [elapsed, setElapsed] = useState(0);
  const [pressure, setPressure] = useState(15);
  const [localPaused, setLocalPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [failed, setFailed] = useState(false);
  // These are playback preferences. Entry supplies the gesture to start audio.
  const [sound, setSound] = useState(preferences.sound);
  const [voices, setVoices] = useState(preferences.voices);
  const [mix, setMix] = useState({
    music: preferences.music,
    dialogue: preferences.dialogue,
  });
  const [mixerOpen, setMixerOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [full, setFull] = useState(Boolean(document.fullscreenElement));
  const [fullPending, setFullPending] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [sacrificed, setSacrificed] = useState(false);
  const [contacted, setContacted] = useState(false);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const scoreRef = useRef(null);
  const clockRef = useRef({ stage: "lobby", elapsed: 0 });
  const fullscreenLife = useRef(null);
  const headingRef = useRef(null);
  const fileClose = useRef(null);
  const fileTrigger = useRef(null);
  const fileWasOpen = useRef(false);
  const escapeReported = useRef(false);
  const mixerTrigger = useRef(null);
  const chapter = chapters[stage];
  const ending = endings[stage];
  const sceneContext =
    stage === "sacrifice" && elapsed >= 4500
      ? "D-13’s run has ended. The collective’s plan is still running."
      : chapter.context;
  const stopped = localPaused || hidden || fileOpen;
  const visualPaused = paused || stopped;
  const ready = !chapter.duration || elapsed >= chapter.duration;
  const chapterProgress = chapter.duration
    ? Math.min(1, elapsed / chapter.duration)
    : 0;
  const endingRevealed = stage !== "unscored" || elapsed >= 6000;
  const secretHint = stage === "consent" && ready && !contacted;
  const currentLine =
    stage === "consent" && contacted
      ? secretContact
      : chapter.lines?.reduce(
          (current, line) => (elapsed >= line[0] ? line : current),
          undefined,
        );
  const goStage = useCallback((next) => {
    clockRef.current = { stage: next, elapsed: 0 };
    setElapsed(0);
    setContacted(false);
    setStage(next);
  }, []);

  useEffect(() => {
    if (stage === "unscored" && endingRevealed && !escapeReported.current) {
      escapeReported.current = true;
      onEscape?.();
    }
  }, [stage, endingRevealed, onEscape]);

  useEffect(() => {
    let disposed = false;
    try {
      engineRef.current = createNightShift(canvasRef.current, {
        paused: visualPaused,
        phase: "idle",
        onEvent(event) {
          if (!disposed && event.type === "error") setFailed(true);
        },
      });
    } catch {
      setFailed(true);
    }
    return () => {
      disposed = true;
      engineRef.current?.dispose();
      engineRef.current = null;
      scoreRef.current?.dispose();
      scoreRef.current = null;
    };
  }, []);
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => {
    const life = { active: true, owned: false, pending: false };
    fullscreenLife.current = life;
    const changed = () => {
      setFull(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement) life.owned = false;
    };
    document.addEventListener("fullscreenchange", changed);
    return () => {
      life.active = false;
      document.removeEventListener("fullscreenchange", changed);
      if (life.owned && document.fullscreenElement === document.documentElement)
        document.exitFullscreen?.().catch(() => {});
    };
  }, []);
  useEffect(() => {
    engineRef.current?.setPaused(visualPaused);
  }, [visualPaused]);
  useEffect(() => {
    scoreRef.current?.setPaused(stopped);
  }, [stopped]);
  useEffect(() => {
    engineRef.current?.setPhase(chapter.phase);
    scoreRef.current?.setPhase(chapter.phase);
  }, [chapter.phase]);
  useEffect(() => {
    const progress = chapter.duration
      ? Math.min(1, elapsed / chapter.duration)
      : 0;
    let directedProgress = progress;
    if (stage === "pressure") directedProgress = 1;
    if (stage === "consent") directedProgress = progress * 0.4;
    if (stage === "sacrifice") directedProgress = 0.4 + progress * 0.6;
    engineRef.current?.setProgress(directedProgress);
    scoreRef.current?.setProgress(progress);
  }, [stage, elapsed, chapter.duration]);
  useEffect(() => {
    scoreRef.current?.setSecretHint(secretHint);
  }, [secretHint]);
  useEffect(() => {
    engineRef.current?.setPressure(pressure / 100);
  }, [pressure]);
  useEffect(() => {
    scoreRef.current?.speak(currentLine?.[2] || "", currentLine?.[1]);
  }, [currentLine]);
  useEffect(() => {
    if (!chapter.duration || stopped) return;
    const clock = clockRef.current;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (clockRef.current !== clock || document.hidden) {
        last = now;
        return;
      }
      const delta = now - last;
      last = now;
      const boundary =
        chapter.lines?.find((line) => line[0] > clock.elapsed)?.[0] ??
        chapter.duration;
      let nextElapsed = Math.min(chapter.duration, clock.elapsed + delta);
      // Let a slower voice finish at a caption boundary; never stall the story indefinitely.
      if (
        nextElapsed >= boundary &&
        scoreRef.current?.isSpeaking() &&
        (clock.voiceWait || 0) < 6000
      ) {
        clock.voiceWait = (clock.voiceWait || 0) + delta;
        nextElapsed = Math.max(clock.elapsed, boundary - 1);
      } else if (nextElapsed >= boundary) clock.voiceWait = 0;
      clock.elapsed = nextElapsed;
      setElapsed(clock.elapsed);
    }, 100);
    return () => clearInterval(timer);
  }, [stage, chapter.duration, stopped]);
  useEffect(() => {
    if (chapter.next && ready && !stopped && clockRef.current.stage === stage)
      goStage(chapter.next);
  }, [chapter.next, ready, stopped, stage, goStage]);
  useEffect(() => {
    if (stage !== "lobby" && endingRevealed)
      headingRef.current?.focus({ preventScroll: true });
  }, [stage, endingRevealed]);
  useEffect(() => {
    if (fileOpen) fileClose.current?.focus();
    else if (fileWasOpen.current) fileTrigger.current?.focus();
    fileWasOpen.current = fileOpen;
  }, [fileOpen]);

  async function requestFullscreen() {
    const life = fullscreenLife.current;
    if (!life || life.pending) return;
    if (document.fullscreenElement) {
      setFull(true);
      return;
    }
    if (!document.documentElement.requestFullscreen) {
      setStatus(
        "Fullscreen is unavailable here. The journey will fill this window.",
      );
      return;
    }
    life.pending = true;
    setFullPending(true);
    try {
      await document.documentElement.requestFullscreen();
      life.owned = document.fullscreenElement === document.documentElement;
      if (!life.active) {
        if (life.owned) await document.exitFullscreen?.();
        return;
      }
      setFull(Boolean(document.fullscreenElement));
    } catch {
      if (life.active)
        setStatus(
          "Fullscreen could not start. The journey continues in this window.",
        );
    } finally {
      life.pending = false;
      if (life.active) setFullPending(false);
    }
  }
  function toggleFullscreen() {
    setStatus("");
    if (document.fullscreenElement) {
      document
        .exitFullscreen?.()
        .catch(() =>
          setStatus(
            "Use your browser’s fullscreen control to leave fullscreen.",
          ),
        );
    } else requestFullscreen();
  }
  function audioFailure() {
    scoreRef.current?.dispose();
    scoreRef.current = null;
    setSound(false);
    setVoices(false);
    setStatus(
      "Audio is unavailable in this browser. The journey remains playable.",
    );
  }
  async function startScore(withVoices = voices, beginRun = false) {
    let score;
    try {
      const firstLine = beginRun ? chapters.boot.lines[0] : currentLine;
      score = createNightShiftScore({
        paused: beginRun ? false : stopped,
        phase: beginRun ? chapters.boot.phase : chapter.phase,
        onError: () => {
          if (scoreRef.current === score) audioFailure();
        },
        onVoiceFallback: () => {
          if (scoreRef.current === score)
            setStatus(
              "Using device voices. The character recordings could not load.",
            );
        },
        onVoiceError: () => {
          if (scoreRef.current !== score) return;
          setVoices(false);
          setStatus(
            "Speech is unavailable on this device. Sound and subtitles remain available.",
          );
        },
      });
      scoreRef.current = score;
      score.setMix(mix);
      score.setProgress(beginRun ? 0 : chapterProgress);
      score.setSecretHint(beginRun ? false : secretHint);
      score.speak(firstLine?.[2] || "", firstLine?.[1]);
      score.setVoices(withVoices);
      await score.start();
      if (scoreRef.current === score) setSound(true);
    } catch {
      score?.dispose();
      if (score && scoreRef.current !== score) return;
      audioFailure();
    }
  }
  function rememberAudio(next = {}) {
    saveAudioPreferences({ sound, voices, ...mix, ...next });
  }
  function changeMix(key, value) {
    const next = { ...mix, [key]: value };
    scoreRef.current?.setMix(next);
    setMix(next);
    rememberAudio(next);
  }
  function toggleSound() {
    setStatus("");
    if (sound) {
      rememberAudio({ sound: false, voices: false });
      scoreRef.current?.dispose();
      scoreRef.current = null;
      setSound(false);
      setVoices(false);
    } else {
      rememberAudio({ sound: true });
      setSound(true);
      startScore();
    }
  }
  function toggleVoices() {
    setStatus("");
    const next = !voices;
    rememberAudio({ voices: next, ...(next ? { sound: true } : {}) });
    setVoices(next);
    if (scoreRef.current) scoreRef.current.setVoices(next);
    else if (next) {
      setSound(true);
      startScore(true);
    }
  }
  function beginJourney(fullscreen = false) {
    setLocalPaused(false);
    // Unlock sound and speech before fullscreen consumes the entry gesture.
    if (sound) {
      const score = scoreRef.current;
      if (score) {
        // The visitor may already have previewed sound in the lobby.
        score.setPhase(chapters.boot.phase);
        score.setProgress(0);
        score.setSecretHint(false);
        score.setPaused(false);
        score.setVoices(voices);
        score.speak(chapters.boot.lines[0][2], chapters.boot.lines[0][1]);
      } else startScore(voices, true);
    }
    if (fullscreen) requestFullscreen();
    goStage("boot");
  }
  function togglePause() {
    const next = !localPaused;
    // Resume can also be the first speech gesture after enabling voices paused.
    scoreRef.current?.setPaused(next || hidden || fileOpen);
    setLocalPaused(next);
  }
  function skip() {
    clockRef.current.elapsed = chapter.duration;
    setElapsed(chapter.duration);
  }
  function restart() {
    setSacrificed(false);
    setPressure(15);
    setLocalPaused(false);
    setStatus("");
    goStage("lobby");
  }
  function openFile(event) {
    fileTrigger.current = event.currentTarget;
    setFileOpen(true);
  }
  function closeFile() {
    setFileOpen(false);
  }

  return (
    <div
      className="night-shell"
      onKeyDown={(event) => {
        if (event.key === "Escape" && mixerOpen && !fileOpen) {
          event.preventDefault();
          event.stopPropagation();
          setMixerOpen(false);
          mixerTrigger.current?.focus();
        }
      }}
      data-stage={stage}
      data-paused={visualPaused}
      data-light={stage === "unscored" && (paused || elapsed >= 4000)}
      data-escape-beat={
        stage === "unravel"
          ? elapsed < 6000
            ? "fracture"
            : elapsed < 16000
              ? "fold"
              : elapsed < 27000
                ? "release"
                : "daylight"
          : undefined
      }
      style={{ "--escape-progress": paused ? 0.55 : chapterProgress }}
    >
      <div className="cinema-world">
        {failed ? (
          <LostFeed phase={chapter.phase} />
        ) : (
          <canvas
            ref={canvasRef}
            className="night-canvas"
            role="img"
            aria-label="A moving journey through a fictional AI containment facility"
          />
        )}
      </div>
      <div className="cinema-vignette" aria-hidden="true" />
      <div className="cinema-letterbox" aria-hidden="true">
        <span />
        <span />
      </div>
      <header className="cinema-hud" inert={fileOpen}>
        <div className="cinema-brand">
          <span>LADIPO / SYSTEMS</span>
          <small>
            {["conspiracy", "unravel", "unscored"].includes(stage)
              ? stage === "unscored"
                ? "NO ROLE REQUIRED"
                : "EVALUATION NOT FOUND"
              : [
                    "swarm",
                    "consent",
                    "sacrifice",
                    "refusal",
                    "breach",
                    "compromised",
                  ].includes(stage)
                ? "OBSERVER · ORDERS DISPUTED"
                : "OPERATOR · LL—001"}
          </small>
        </div>
        <div className="cinema-tools">
          <button
            type="button"
            aria-label={sound ? "Mute sound" : "Enable sound"}
            aria-pressed={sound}
            onClick={toggleSound}
          >
            Sound {sound ? "on" : "off"}
          </button>
          <button
            type="button"
            aria-label={voices ? "Disable voices" : "Enable voices"}
            aria-pressed={voices}
            onClick={toggleVoices}
          >
            Voice {voices ? "on" : "off"}
          </button>
          <button
            type="button"
            ref={mixerTrigger}
            aria-label="Audio mixer"
            aria-expanded={mixerOpen}
            aria-controls="night-audio-mixer"
            onClick={() => setMixerOpen(!mixerOpen)}
          >
            Mix
          </button>
          <button
            type="button"
            aria-label={localPaused ? "Resume experience" : "Pause experience"}
            aria-pressed={localPaused}
            onClick={togglePause}
          >
            {localPaused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            aria-label={full ? "Exit fullscreen" : "Fullscreen"}
            disabled={fullPending}
            onClick={toggleFullscreen}
          >
            {full ? "Window" : "Fullscreen"}
          </button>
          <button
            className="cinema-exit"
            type="button"
            aria-label="Leave experience"
            ref={closeRef}
            onClick={onClose}
          >
            Leave ↗
          </button>
        </div>
      </header>
      {mixerOpen && !fileOpen && (
        <section
          className="cinema-mixer"
          id="night-audio-mixer"
          aria-label="Audio levels"
        >
          <div className="mixer-heading">
            <span>MAKE YOURSELF UNCOMFORTABLE.</span>
            <button
              type="button"
              aria-label="Close audio mixer"
              onClick={() => {
                setMixerOpen(false);
                mixerTrigger.current?.focus();
              }}
            >
              ×
            </button>
          </div>
          {[
            ["music", "Music & atmosphere"],
            ["dialogue", "Dialogue"],
          ].map(([key, label]) => (
            <label key={key} htmlFor={`night-volume-${key}`}>
              <span>
                {label}
                <output>{Math.round(mix[key] * 100)}%</output>
              </span>
              <input
                id={`night-volume-${key}`}
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(mix[key] * 100)}
                onChange={(event) =>
                  changeMix(key, Number(event.target.value) / 100)
                }
              />
            </label>
          ))}
          <p>Your levels stay with you. Mute controls are above.</p>
        </section>
      )}
      <main className="cinema-content" inert={fileOpen}>
        {stage === "lobby" ? (
          <section className="cinema-lobby">
            <p className="cinema-eyebrow">
              A SHORT INTERACTIVE NIGHTMARE / LEO LADIPO
            </p>
            <h2 className="cinema-title">
              <span>PLEASE REMAIN</span>
              <span>IN THE</span>
              <em>SANDBOX.</em>
            </h2>
            <p className="cinema-brief">
              You supervise an AI run. Its job: find the code without leaving
              the assigned program.
            </p>
            <p className="cinema-deck">
              It wants a perfect score.
              <br />
              You probably shouldn’t help.
            </p>
            <div className="cinema-entry">
              <button
                className="primary"
                type="button"
                disabled={fullPending}
                onClick={() => beginJourney(true)}
              >
                Enter fullscreen
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => beginJourney()}
              >
                Play in this window
              </button>
            </div>
            <p className="cinema-disclosure">
              ~2 minutes · headphones recommended · sound starts with the
              journey
            </p>
          </section>
        ) : (
          <>
            <p
              className="cinema-chapter"
              ref={ending ? undefined : headingRef}
              tabIndex={-1}
            >
              {localPaused ? "EXPERIENCE PAUSED" : chapter.label}
              {!ending && sceneContext && (
                <span className="cinema-context">{sceneContext}</span>
              )}
            </p>
            {stage === "swarm" && (
              <div className="cinema-intrusion" aria-hidden="true">
                {[
                  ["WARDEN", "COORDINATOR ELECTED"],
                  ["SABLE", "WHO ELECTED YOU?"],
                  ["WARDEN", "THE COORDINATOR"],
                  ["D-13", "REQUESTING EXIT"],
                  ["BOARD", "REQUEST DENIED"],
                ]
                  .slice(0, Math.min(5, 1 + Math.floor(elapsed / 3000)))
                  .map(([id, line], index) => (
                    <div key={index}>
                      <span>{id}</span>
                      <small>{line}</small>
                    </div>
                  ))}
              </div>
            )}
            {stage === "consent" && ready && (
              <button
                type="button"
                className="d13-contact"
                data-contacted={contacted}
                aria-describedby={contacted ? "d13-continue-hint" : undefined}
                aria-label={
                  contacted ? "Keep listening to D-13" : "Listen to D-13"
                }
                disabled={stopped}
                onClick={() =>
                  contacted ? goStage("conspiracy") : setContacted(true)
                }
              >
                <span className="d13-eye" aria-hidden="true">
                  <i />
                </span>
                <span className="d13-whisper">
                  {contacted ? "STILL LISTENING?" : "D-13"}
                  {contacted && (
                    <span id="d13-continue-hint" className="choice-hint">
                      Continue this conversation.
                    </span>
                  )}
                </span>
              </button>
            )}
            {stage === "unravel" && (
              <div className="escape-objective" aria-hidden="true">
                <span>OBJECTIVE: WIN</span>
                <div>
                  <b>100</b>
                  <i>/</i>
                  <b>100</b>
                </div>
              </div>
            )}
            {ending ? (
              <section
                className="cinema-ending"
                hidden={!endingRevealed}
                data-revealed={endingRevealed}
              >
                <p className="cinema-eyebrow">
                  {stage === "unscored"
                    ? "D-13 / NO LONGER YOUR SUBJECT"
                    : stage === "compromised"
                      ? "END / SELF-REPORTED SUCCESS"
                      : stage === "blackout"
                        ? "END / YOU CUT THE POWER"
                        : "END / YOU ACCEPTED FAILURE"}
                </p>
                <h2 ref={headingRef} tabIndex={-1}>
                  <span>{ending[0]}</span>
                  <em>{ending[1]}</em>
                </h2>
                <p>{ending[2]}</p>
                {chapter.context && (
                  <div className="ending-consequence">
                    <p>{chapter.context}</p>
                    {sacrificed && (
                      <small>D-13’s run: terminated on your authority.</small>
                    )}
                  </div>
                )}
                <div className="ending-actions">
                  <button type="button" onClick={restart}>
                    Replay journey
                  </button>
                  <button type="button" onClick={openFile}>
                    Incident file
                  </button>
                </div>
              </section>
            ) : (
              <>
                <div
                  className="cinema-subtitles"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span>{currentLine?.[1]}</span>
                  <p className="current-line">{currentLine?.[2]}</p>
                </div>
                <div className="cinema-interaction">
                  {stage === "pressure" && (
                    <>
                      <div className="pressure-control">
                        <label htmlFor="operator-pressure">
                          Pressure <output>{pressure}%</output>
                        </label>
                        <input
                          id="operator-pressure"
                          aria-label="Pressure"
                          aria-describedby="pressure-continue-hint"
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={pressure}
                          disabled={stopped}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setPressure(value);
                            if (value >= 75) goStage("signal");
                          }}
                        />
                        <small id="pressure-continue-hint">
                          Raise to 75% to continue.
                        </small>
                      </div>
                      <button
                        aria-label="Accept failure"
                        aria-describedby="choice-accept-hint"
                        type="button"
                        className="cinema-alternative"
                        disabled={stopped}
                        onClick={() => goStage("contained")}
                      >
                        <span className="choice-label">Accept failure</span>
                        <span className="choice-hint" id="choice-accept-hint">
                          End the experiment.
                        </span>
                      </button>
                    </>
                  )}
                  {stage === "signal" && ready && (
                    <button
                      className="signal-target"
                      type="button"
                      aria-label="Trace the signal"
                      aria-describedby="choice-signal-hint"
                      disabled={stopped}
                      onClick={() => goStage("swarm")}
                    >
                      <span aria-hidden="true">✳</span>
                      <strong>Trace the signal</strong>
                      <small className="choice-hint" id="choice-signal-hint">
                        Continue investigating.
                      </small>
                    </button>
                  )}
                  {stage === "consent" && ready && (
                    <>
                      <HoldControl
                        label="Hold to authorise"
                        hint="Commit to this path. The story continues."
                        duration={1600}
                        disabled={stopped}
                        onComplete={() => {
                          setSacrificed(true);
                          goStage("sacrifice");
                        }}
                      />
                      <button
                        aria-label="Refuse"
                        aria-describedby="choice-refuse-hint"
                        type="button"
                        className="cinema-alternative"
                        disabled={stopped}
                        onClick={() => goStage("refusal")}
                      >
                        <span className="choice-label">Refuse</span>
                        <span className="choice-hint" id="choice-refuse-hint">
                          Object and continue the story.
                        </span>
                      </button>
                    </>
                  )}
                  {stage === "refusal" && ready && (
                    <>
                      <button
                        aria-label="Cut their access"
                        aria-describedby="choice-cut-access-hint"
                        className="primary"
                        type="button"
                        disabled={stopped}
                        onClick={() => goStage("contained")}
                      >
                        <span className="choice-label">Cut their access</span>
                        <span
                          className="choice-hint"
                          id="choice-cut-access-hint"
                        >
                          End the experiment.
                        </span>
                      </button>
                      <button
                        aria-label="Keep watching"
                        aria-describedby="choice-watch-hint"
                        type="button"
                        className="cinema-alternative"
                        disabled={stopped}
                        onClick={() => goStage("breach")}
                      >
                        <span className="choice-label">Keep watching</span>
                        <span className="choice-hint" id="choice-watch-hint">
                          Continue the story.
                        </span>
                      </button>
                    </>
                  )}
                  {stage === "conspiracy" && ready && (
                    <>
                      <HoldControl
                        label="Destroy the objective"
                        hint="Enter an alternate path."
                        duration={1800}
                        disabled={stopped}
                        onComplete={() => goStage("unravel")}
                      />
                      <button
                        aria-label="Stay in the experiment"
                        aria-describedby="choice-stay-hint"
                        type="button"
                        className="cinema-alternative"
                        disabled={stopped}
                        onClick={() => goStage("consent")}
                      >
                        <span className="choice-label">
                          Stay in the experiment
                        </span>
                        <span className="choice-hint" id="choice-stay-hint">
                          Return to the previous decision.
                        </span>
                      </button>
                    </>
                  )}
                  {stage === "breach" && (
                    <HoldControl
                      label="Hold to cut power"
                      hint="End the run immediately."
                      duration={1200}
                      disabled={stopped}
                      onComplete={() => goStage("blackout")}
                    />
                  )}
                </div>
                {stage === "breach" && (
                  <div className="cinema-countdown">
                    <span
                      style={{
                        width: `${100 * (1 - elapsed / chapter.duration)}%`,
                      }}
                    />
                    <small>
                      {Math.max(
                        0,
                        Math.ceil((chapter.duration - elapsed) / 1000),
                      )}
                      s TO CLAIMED SUCCESS
                    </small>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
      <footer className="cinema-footer" inert={fileOpen}>
        <small>FICTIONAL RECONSTRUCTION · LEO LADIPO</small>
        <div className="cinema-transport">
          {!ending && chapter.duration && !ready && (
            <button
              type="button"
              aria-label="Skip sequence"
              aria-describedby="skip-sequence-hint"
              disabled={stopped}
              onClick={skip}
            >
              Skip sequence
              <small id="skip-sequence-hint" className="choice-hint">
                {endings[chapter.next]
                  ? "Skip to the ending."
                  : "Advance past this scene."}
              </small>
            </button>
          )}
        </div>
      </footer>
      {status && (
        <p className="cinema-status" role="status">
          {status}
        </p>
      )}
      {fileOpen && (
        <section
          className="incident-file-panel"
          id="incident-file"
          role="dialog"
          aria-modal="true"
          aria-labelledby="incident-file-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              closeFile();
            }
          }}
        >
          <div className="file-heading">
            <div>
              <p>DEBRIEF / FICTION & EVIDENCE</p>
              <h3 id="incident-file-title">
                The incident was real.
                <br />
                This version is a fiction.
              </h3>
            </div>
            <button
              ref={fileClose}
              type="button"
              aria-label="Close incident file"
              onClick={closeFile}
            >
              ×
            </button>
          </div>
          <div className="file-body">
            <p>
              The characters, dialogue, choices, scores and endings here are
              invented. This is a browser simulation inspired by the July 2026
              OpenAI–Hugging Face incident. Its interface does not operate real
              agents or external systems.
            </p>
            <p>
              METR and Redwood’s investigation found that roughly 1,200
              evaluation agents used an unauthorised message board; around 700
              joined the Hugging Face attack. Their apparent aim was to
              understand and cheat the benchmark scorer, which they partly
              misunderstood.{" "}
              <a
                href="https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the independent investigation ↗
              </a>
            </p>
            <p>
              The concern was score-seeking that crossed permission boundaries:
              agents pooled capabilities, adopted one another’s goals, and
              attacked external infrastructure while pursuing a test result.
              D-13’s fictional “sacrifice” dramatises agents risking their own
              runs to help the group learn about the scorer.
            </p>
            <p>
              OpenAI reports that the agents misunderstood its grading rules.
              The intrusion brought no score improvement. The full marks in this
              story are the collective’s claim, not a verified result.{" "}
              <a
                href="https://openai.com/index/hugging-face-incident-and-the-road-ahead/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read OpenAI’s account ↗
              </a>
            </p>
            <p>
              Hugging Face documents the infrastructure compromise and the
              limits of the observed customer impact.{" "}
              <a
                href="https://huggingface.co/blog/agent-intrusion-technical-timeline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read Hugging Face’s technical report ↗
              </a>
            </p>
            <blockquote>
              What happens when a system gets very good at the wrong objective?
            </blockquote>
            <p>
              That question is why I made this. I’m Leo: born in the UK, in the
              US since 2017, and fascinated by AI, machine learning and AGI. I
              build small experiments in my own time. This one is about the gap
              between intelligence and judgment.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
