import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import MonogramScene from "./MonogramScene";
import { Arrow } from "./Icons";
import NightShift from "./NightShift";
import { scatterWords } from "./curiosity-scatter";
import "./playground.css";

const finishes = ["alloy", "chrome", "blueprint"];
const aftermathLine = "“Please don’t put me back.”";

function CuriousWords({ children }) {
  return children.split(/(\s+)/).map((word, index) =>
    /\S/.test(word) ? (
      <span className="curiosity-word" key={index}>
        {word}
      </span>
    ) : (
      word
    ),
  );
}

export default function Hero({ paused, reducedMotion, onToggleMotion }) {
  const [world, setWorld] = useState(false);
  const [finish, setFinish] = useState("alloy");
  const [separation, setSeparation] = useState(0);
  const [impulse, setImpulse] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [hint, setHint] = useState("");
  const [escapePending, setEscapePending] = useState(false);
  const [aftermathUnread, setAftermathUnread] = useState(false);
  const [cageVisible, setCageVisible] = useState(false);
  const [curiosityLevel, setCuriosityLevel] = useState(0);
  const escaped = useRef(false);
  const curiosity = useRef({ count: 0, time: 0 });
  const copyRef = useRef(null);
  const scatterAnimations = useRef([]);
  const restoreTimer = useRef(null);
  const entryTimer = useRef(null);
  const entryPending = useRef(false);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const previousWorld = useRef(false);

  const rememberEscape = useCallback(() => {
    if (escaped.current) return;
    escaped.current = true;
    setEscapePending(true);
    setAftermathUnread(true);
  }, []);

  useEffect(() => {
    if (world || !escapePending) return;
    setEscapePending(false);
    setCageVisible(true);
  }, [world, escapePending]);

  useEffect(() => {
    if (!cageVisible || world) return;
    const timeout = window.setTimeout(() => setCageVisible(false), 9000);
    return () => window.clearTimeout(timeout);
  }, [cageVisible, world]);

  const resetCuriosity = useCallback(() => {
    window.clearTimeout(restoreTimer.current);
    window.clearTimeout(entryTimer.current);
    entryPending.current = false;
    scatterAnimations.current.forEach((animation) => animation.cancel());
    scatterAnimations.current = [];
    curiosity.current = { count: 0, time: 0 };
    setCuriosityLevel(0);
    setHint((value) => (value === aftermathLine ? value : ""));
  }, []);

  const enterWorld = useCallback(() => {
    resetCuriosity();
    if (typeof dialogRef.current?.showModal !== "function") {
      setHint("This browser can explore the sculpture right here.");
      return;
    }
    setHint("");
    setCageVisible(false);
    setWorld(true);
  }, [resetCuriosity]);

  function followCuriosity() {
    if (entryPending.current || world) return;
    window.clearTimeout(restoreTimer.current);
    const now = Date.now();
    const count = aftermathUnread
      ? 1
      : now - curiosity.current.time < 5000
        ? curiosity.current.count + 1
        : 1;
    if (aftermathUnread) {
      setAftermathUnread(false);
      setHint(aftermathLine);
    } else if (count < 3) {
      setHint(
        count === 1
          ? "Some things deserve a second look."
          : "One more. Follow your curiosity.",
      );
    }
    curiosity.current = { count, time: now };
    setCuriosityLevel(count);
    if (!paused && !reducedMotion) {
      scatterAnimations.current = scatterWords(
        copyRef.current,
        triggerRef.current,
        count,
        scatterAnimations.current,
      );
    }
    if (count >= 3) {
      if (paused || reducedMotion || !scatterAnimations.current.length) {
        enterWorld();
      } else {
        entryPending.current = true;
        entryTimer.current = window.setTimeout(enterWorld, 560);
      }
      return;
    }
    restoreTimer.current = window.setTimeout(resetCuriosity, 5000);
  }

  useEffect(() => {
    if (!paused && !reducedMotion) return;
    if (entryPending.current) enterWorld();
    else resetCuriosity();
  }, [paused, reducedMotion, enterWorld, resetCuriosity]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) resetCuriosity();
    };
    window.addEventListener("resize", resetCuriosity);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("resize", resetCuriosity);
      document.removeEventListener("visibilitychange", onVisibility);
      resetCuriosity();
    };
  }, [resetCuriosity]);

  useEffect(() => {
    let sequence = "";
    let lastKeyTime = 0;
    function findSecret(event) {
      if (event.key === "Escape" && entryPending.current) {
        event.preventDefault();
        resetCuriosity();
        return;
      }
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing ||
        event.target.closest?.(
          "input, textarea, select, [contenteditable=true]",
        )
      )
        return;
      if (event.key.length !== 1) {
        sequence = "";
        return;
      }
      const now = Date.now();
      sequence =
        (now - lastKeyTime < 1800 ? sequence : "") + event.key.toLowerCase();
      sequence = sequence.slice(-7);
      lastKeyTime = now;
      if (sequence === "curious") {
        sequence = "";
        enterWorld();
      }
    }
    document.addEventListener("keydown", findSecret);
    return () => document.removeEventListener("keydown", findSecret);
  }, [enterWorld, resetCuriosity]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog.open) dialog.close();
    if (world) {
      dialog.showModal();
      closeRef.current?.focus({ preventScroll: true });
    } else {
      if (previousWorld.current)
        triggerRef.current?.focus({ preventScroll: true });
    }
    previousWorld.current = world;
    const originalOverflow = document.body.style.overflow;
    if (world) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
      if (dialog.open) dialog.close();
    };
  }, [world]);

  return (
    <section className="hero shell" aria-labelledby="hero-title">
      <div
        className="hero-copy"
        ref={copyRef}
        data-curiosity-level={curiosityLevel}
      >
        <p className="eyebrow">
          <span className="status-dot" />
          <span>
            <CuriousWords>FULL-STACK SOFTWARE ENGINEER</CuriousWords>
          </span>
        </p>
        <h1 id="hero-title">
          <CuriousWords>Serious about</CuriousWords>
          <br />
          <CuriousWords>the</CuriousWords>{" "}
          <span className="serif-word curiosity-word">craft.</span>
          <br />
          <CuriousWords>Curious by</CuriousWords>
          <br />
          <span className="outline-word curiosity-word">nature.</span>
          <button
            type="button"
            className="hero-asterisk curiosity-trigger"
            aria-label="Follow your curiosity"
            title="A little curiosity goes a long way."
            ref={triggerRef}
            onClick={followCuriosity}
          >
            {cageVisible ? (
              <svg
                className="curiosity-cage"
                viewBox="0 0 64 64"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 49V27a17 17 0 0 1 34 0v22M9 50h39M14 55h30M11 27h36M22 28v21M36 28v21M24 22l5-10 5 10M29 10V6" />
                <path
                  className="curiosity-cage-door"
                  d="M37 29l17-6v32l-17-6M48 38v5"
                />
                <path
                  className="curiosity-cage-spark"
                  d="m49 10 3-4m3 10 5-1"
                />
              </svg>
            ) : (
              <span aria-hidden="true">✳</span>
            )}
          </button>
        </h1>
        <p className="hero-intro">
          <CuriousWords>
            I’m Leo. I build thoughtful software, from the interface you touch
            to the systems you don’t see.
          </CuriousWords>
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href="#work">
            Explore my work
            <Arrow />
          </a>
          <a className="text-link" href="#about">
            A little about me
            <Arrow diagonal />
          </a>
        </div>
        <p className="curiosity-hint" aria-live="polite">
          {hint || "A little curiosity can take you somewhere unexpected."}
          {hint === aftermathLine && (
            <span className="curiosity-return">Two more clicks to return.</span>
          )}
        </p>
      </div>
      <div className="hero-art playground-art">
        <div
          className="sculpture-stage"
          role="region"
          aria-label="Interactive sculpture lab"
        >
          <div className="art-topline">
            <span>FIG. 01 / THE SCULPTURE LAB</span>
            <span className="art-cross" aria-hidden="true">
              +
            </span>
          </div>
          <MonogramScene
            paused={paused}
            active={!world}
            finish={finish}
            separation={separation}
            impulse={impulse}
            onReady={setSceneReady}
          />
          <div className="playground-console">
            <div className="lab-heading">
              <span>GO ON. PLAY WITH IT.</span>
              <span>{sceneReady ? "DRAG TO EXPLORE ↔" : "STILL VIEW"}</span>
            </div>
            <fieldset className="lab-finishes" disabled={!sceneReady}>
              <legend className="sr-only">Sculpture finish</legend>
              {finishes.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={finish === value}
                  onClick={() => setFinish(value)}
                >
                  <span
                    className={`finish-swatch swatch-${value}`}
                    aria-hidden="true"
                  />
                  {value}
                </button>
              ))}
            </fieldset>
            <div className="lab-adjustments">
              <div className="lab-separation">
                <label htmlFor="sculpture-separation">
                  Pull it apart
                  <output htmlFor="sculpture-separation" aria-hidden="true">
                    {separation}%
                  </output>
                </label>
                <input
                  id="sculpture-separation"
                  aria-label="Pull the sculpture apart"
                  type="range"
                  min="0"
                  max="100"
                  value={separation}
                  disabled={!sceneReady}
                  onChange={(event) =>
                    setSeparation(Number(event.target.value))
                  }
                  style={{ "--range-value": `${separation}%` }}
                />
              </div>
              <button
                className="lab-spin"
                type="button"
                disabled={!sceneReady || paused}
                title={
                  paused
                    ? "Resume motion to give it a spin"
                    : "Give the sculpture a spin"
                }
                onClick={() => setImpulse((value) => value + 1)}
              >
                <span aria-hidden="true">↻</span>Give it a spin
              </button>
            </div>
            <div className="lab-footer">
              <span>TWO INITIALS. ENDLESS POSSIBILITIES.</span>
              <button
                type="button"
                className="motion-toggle"
                onClick={onToggleMotion}
                disabled={reducedMotion}
                aria-pressed={paused}
              >
                <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>
                {reducedMotion
                  ? "Reduced motion"
                  : paused
                    ? "Play motion"
                    : "Pause motion"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        className="night-dialog"
        aria-label="The Night Shift"
        onCancel={(event) => {
          event.preventDefault();
          setWorld(false);
        }}
      >
        {world && (
          <NightShift
            paused={paused}
            reducedMotion={reducedMotion}
            onToggleMotion={onToggleMotion}
            onClose={() => setWorld(false)}
            onEscape={rememberEscape}
            closeRef={closeRef}
          />
        )}
      </dialog>
      <div className="hero-footnote">
        <span>
          <span className="tiny-cross" aria-hidden="true">
            +
          </span>{" "}
          STERLING, VIRGINIA · OPEN TO RELOCATION
        </span>
        <a href="#work">
          SCROLL TO EXPLORE <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
