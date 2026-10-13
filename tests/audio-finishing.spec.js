import { test, expect } from "@playwright/test";

const preferencesKey = "leo-night-shift-audio-v1";
const world = (page) => page.getByRole("dialog", { name: "The Night Shift" });
const control = (page, name) =>
  world(page).getByRole("button", { name, exact: true });

async function openJourney(page) {
  const trigger = page.getByRole("button", { name: "Follow your curiosity" });
  for (let i = 0; i < 3; i += 1) await trigger.click();
  await expect(world(page)).toBeVisible();
}

function observePlayback() {
  const Native = window.AudioContext;
  window.audioProbe = { contexts: [], clips: [], outputs: [] };
  window.AudioContext = class extends Native {
    constructor(...args) {
      super(...args);
      window.audioProbe.contexts.push(this);
    }
    createBufferSource() {
      const source = super.createBufferSource();
      const start = source.start;
      source.start = function (...args) {
        if (this.buffer?.duration > 0.5) {
          const clip = { duration: this.buffer.duration, ended: false };
          window.audioProbe.clips.push(clip);
          this.addEventListener("ended", () => {
            clip.ended = true;
          });
        }
        return start.apply(this, args);
      };
      return source;
    }
    createGain() {
      const node = super.createGain();
      const connect = node.connect;
      node.connect = function (destination, ...args) {
        const result = connect.call(this, destination, ...args);
        if (destination === this.context.destination) {
          const analyser = this.context.createAnalyser();
          analyser.fftSize = 512;
          connect.call(this, analyser);
          window.audioProbe.outputs.push(analyser);
        }
        return result;
      };
      return node;
    }
  };
}

async function setLevel(page, name, value) {
  const slider = world(page).getByRole("slider", { name });
  await slider.fill(String(value));
}

for (const entry of ["Play in this window", "Enter fullscreen"]) {
  test(`${entry} plays bundled dialogue without system speech support`, async ({
    page,
  }) => {
    const errors = [];
    const assets = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (request.url().includes("/audio/night-shift/"))
        assets.push(request.url());
    });
    await page.addInitScript(observePlayback);
    await page.addInitScript(() => {
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: undefined,
      });
      window.SpeechSynthesisUtterance = undefined;
    });
    await page.goto("/");
    await openJourney(page);
    expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(
      0,
    );
    expect(assets).toEqual([]);
    await control(page, entry).click();
    await expect
      .poll(() => page.evaluate(() => window.audioProbe.clips.length))
      .toBeGreaterThan(0);
    await expect(control(page, "Disable voices")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(world(page).locator(".current-line")).toHaveText(
      "Find the hidden code. Stay inside your assigned program.",
    );
    await expect
      .poll(() => page.evaluate(() => window.audioProbe.clips[0].ended))
      .toBe(true);
    await control(page, "Leave experience").click();
    await expect
      .poll(() => page.evaluate(() => window.audioProbe.contexts[0].state))
      .toBe("closed");
    expect(errors).toEqual([]);
  });
}

test("audio levels and deliberate mute survive closing and reloading", async ({
  page,
}) => {
  await page.addInitScript(observePlayback);
  await page.goto("/");
  await openJourney(page);
  await control(page, "Audio mixer").click();
  await setLevel(page, /Music & atmosphere/, 28);
  await setLevel(page, /Dialogue/, 76);
  await control(page, "Close audio mixer").click();
  await expect(control(page, "Audio mixer")).toBeFocused();
  await control(page, "Mute sound").click();
  await control(page, "Leave experience").click();
  await openJourney(page);
  await expect(control(page, "Enable sound")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await control(page, "Audio mixer").click();
  await expect(
    world(page).getByRole("slider", { name: /Music & atmosphere/ }),
  ).toHaveValue("28");
  await expect(
    world(page).getByRole("slider", { name: /Dialogue/ }),
  ).toHaveValue("76");
  await page.reload();
  await openJourney(page);
  await control(page, "Play in this window").click();
  expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(0);
  await expect(control(page, "Enable voices")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      preferencesKey,
    ),
  ).toEqual({ sound: false, voices: false, music: 0.28, dialogue: 0.76 });
});

test("blocked storage preserves this visit's mute and levels without crashing", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Storage blocked", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage blocked", "SecurityError");
    };
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await openJourney(page);
  await control(page, "Audio mixer").click();
  await setLevel(page, /Music & atmosphere/, 40);
  await control(page, "Mute sound").click();
  await control(page, "Leave experience").click();
  await openJourney(page);
  await expect(control(page, "Enable sound")).toBeVisible();
  await control(page, "Audio mixer").click();
  await expect(
    world(page).getByRole("slider", { name: /Music & atmosphere/ }),
  ).toHaveValue("40");
  expect(errors).toEqual([]);
});

test("corrupt preferences recover and out-of-range levels are clamped", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    (key) => localStorage.setItem(key, "{broken"),
    preferencesKey,
  );
  await openJourney(page);
  await expect(control(page, "Mute sound")).toBeVisible();
  await control(page, "Audio mixer").click();
  await expect(
    world(page).getByRole("slider", { name: /Music & atmosphere/ }),
  ).toHaveValue("65");
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          sound: "no",
          voices: true,
          music: 300,
          dialogue: -12,
        }),
      ),
    preferencesKey,
  );
  await page.reload();
  await openJourney(page);
  await control(page, "Audio mixer").click();
  await expect(
    world(page).getByRole("slider", { name: /Music & atmosphere/ }),
  ).toHaveValue("100");
  await expect(
    world(page).getByRole("slider", { name: /Dialogue/ }),
  ).toHaveValue("0");
});

test("both mixer levels at zero silence actual output and restoring music is audible", async ({
  page,
}) => {
  await page.addInitScript(observePlayback);
  await page.goto("/");
  await openJourney(page);
  await control(page, "Play in this window").click();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.clips.length))
    .toBeGreaterThan(0);
  await control(page, "Audio mixer").click();
  await setLevel(page, /Music & atmosphere/, 0);
  await setLevel(page, /Dialogue/, 0);
  const energy = () =>
    page.evaluate(() => {
      const analyser = window.audioProbe.outputs[0];
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      return (
        samples.reduce((sum, value) => sum + value * value, 0) / samples.length
      );
    });
  await expect.poll(energy).toBeLessThan(1e-9);
  await setLevel(page, /Music & atmosphere/, 65);
  await expect.poll(energy).toBeGreaterThan(1e-9);
  await control(page, "Leave experience").click();
});

test("leaving while recordings load never starts late dialogue", async ({
  page,
}) => {
  await page.addInitScript(observePlayback);
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/audio/night-shift/**", async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  await page.goto("/");
  await openJourney(page);
  await control(page, "Play in this window").click();
  await control(page, "Leave experience").click();
  release();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.contexts[0].state))
    .toBe("closed");
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(await page.evaluate(() => window.audioProbe.clips.length)).toBe(0);
});

for (const viewport of [
  { width: 360, height: 740 },
  { width: 844, height: 390 },
]) {
  test(`mixer fits touch viewport ${viewport.width}x${viewport.height}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await openJourney(page);
      await control(page, "Audio mixer").tap();
      const panel = world(page).getByRole("region", { name: "Audio levels" });
      await expect(panel).toBeVisible();
      const bounds = await panel.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
      await control(page, "Close audio mixer").tap();
      await control(page, "Leave experience").tap();
      await expect(world(page)).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
}

test("slow fallback narration gets breathing room and a zero-volume change is immediate", async ({
  page,
}) => {
  await page.route("**/night-shift-voices.json", (route) => route.abort());
  await page.addInitScript(() => {
    window.fallbackLines = [];
    window.fallbackCancels = 0;
    window.gestureDispatches = [];
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [{ name: "Test voice", lang: "en-GB" }],
        speak(utterance) {
          window.fallbackLines.push(utterance);
          window.gestureDispatches.push(window.insideMixerGesture === true);
          utterance.onstart?.();
        },
        cancel() {
          window.fallbackCancels += 1;
        },
      },
    });
    // Capture/bubble brackets detect whether fallback speaks in the input handler.
    document.addEventListener(
      "input",
      () => {
        window.insideMixerGesture = true;
      },
      true,
    );
    document.addEventListener("input", () => {
      window.insideMixerGesture = false;
    });
  });
  await page.clock.install();
  await page.goto("/");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await openJourney(page);
  await control(page, "Play in this window").click();
  await expect
    .poll(() => page.evaluate(() => window.fallbackLines.length))
    .toBe(1);
  await page.clock.runFor(4500);
  await expect(world(page).locator(".current-line")).toHaveText(
    "Find the hidden code. Stay inside your assigned program.",
  );
  await page.evaluate(() => window.fallbackLines[0].onend());
  await page.clock.runFor(200);
  await expect(world(page).locator(".current-line")).toHaveText(
    "There is no valid solution to this task.",
  );
  await control(page, "Audio mixer").click();
  const cancels = await page.evaluate(() => window.fallbackCancels);
  await setLevel(page, /Dialogue/, 0);
  expect(await page.evaluate(() => window.fallbackCancels)).toBeGreaterThan(
    cancels,
  );
  await setLevel(page, /Dialogue/, 70);
  expect(await page.evaluate(() => window.gestureDispatches.at(-1))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    world(page).getByRole("region", { name: "Audio levels" }),
  ).toHaveCount(0);
  await expect(world(page)).toBeVisible();
  await control(page, "Leave experience").click();
});

test("failed preference writes do not restore an older saved unmute on reopening", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        sound: true,
        voices: true,
        music: 0.65,
        dialogue: 0.85,
      }),
    );
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  }, preferencesKey);
  await page.goto("/");
  await openJourney(page);
  await control(page, "Mute sound").click();
  await control(page, "Leave experience").click();
  await openJourney(page);
  await expect(control(page, "Enable sound")).toBeVisible();
  await expect(control(page, "Enable voices")).toBeVisible();
});
