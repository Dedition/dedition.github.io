import { test, expect } from "@playwright/test";

async function settleRender(page) {
  // Keep overlapping controls out of the hover state during pixel comparisons.
  await page.mouse.move(0, 0);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

async function openWithCuriosity(page) {
  const trigger = page.getByRole("button", { name: "Follow your curiosity" });
  await trigger.click();
  await trigger.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await trigger.click();
  await expect(
    page.getByRole("dialog", { name: "The Night Shift" }),
  ).toBeVisible();
}

test("the sculpture controls change rendered geometry and finishes while paused", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".monogram-scene")).toHaveClass(/is-ready/);
  await page.getByRole("button", { name: "Pause motion" }).click();
  const reset = page.getByRole("button", { name: "Reset sculpture view" });
  const artwork = page.locator(".monogram-scene__canvas");
  const spin = page.getByRole("button", { name: "Give it a spin" });
  await expect(spin).toBeDisabled();
  await reset.click();
  await settleRender(page);
  const alloy = await artwork.screenshot({ animations: "disabled" });

  await page.getByRole("button", { name: "chrome", exact: true }).click();
  await settleRender(page);
  const chrome = await artwork.screenshot({ animations: "disabled" });
  expect(chrome.equals(alloy)).toBe(false);
  await page.getByRole("button", { name: "blueprint", exact: true }).click();
  await settleRender(page);
  const blueprint = await artwork.screenshot({ animations: "disabled" });
  expect(blueprint.equals(alloy)).toBe(false);
  expect(blueprint.equals(chrome)).toBe(false);
  await page.getByRole("button", { name: "alloy", exact: true }).click();
  await settleRender(page);
  expect(
    (await artwork.screenshot({ animations: "disabled" })).equals(alloy),
  ).toBe(true);

  const separation = page.getByRole("slider", {
    name: "Pull the sculpture apart",
  });
  await separation.focus();
  await page.keyboard.press("End");
  await expect(separation).toHaveValue("100");
  await settleRender(page);
  expect(
    (await artwork.screenshot({ animations: "disabled" })).equals(alloy),
  ).toBe(false);
  await page.keyboard.press("Home");
  await expect(separation).toHaveValue("0");
  await settleRender(page);
  expect(
    (await artwork.screenshot({ animations: "disabled" })).equals(alloy),
  ).toBe(true);

  await page.getByRole("button", { name: "Rotate sculpture right" }).click();
  await settleRender(page);
  expect(
    (await artwork.screenshot({ animations: "disabled" })).equals(alloy),
  ).toBe(false);
  await reset.click();
  await settleRender(page);
  expect(
    (await artwork.screenshot({ animations: "disabled" })).equals(alloy),
  ).toBe(true);
  const bounds = await artwork.boundingBox();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 70,
    bounds.y + bounds.height / 2 - 20,
    { steps: 5 },
  );
  await page.mouse.up();
  await settleRender(page);
  expect(
    (await artwork.screenshot({ animations: "disabled" })).equals(alloy),
  ).toBe(false);
  await reset.click();
  await settleRender(page);
  expect(
    (await artwork.screenshot({ animations: "disabled" })).equals(alloy),
  ).toBe(true);

  await page.getByRole("button", { name: "Play motion" }).click();
  await expect(spin).toBeEnabled();
  await spin.click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(spin).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Reduced motion" }),
  ).toBeDisabled();
});

function journey(page) {
  return page.getByRole("dialog", { name: "The Night Shift" });
}

async function stage(world, name) {
  await expect(world.locator(".night-shell")).toHaveAttribute(
    "data-stage",
    name,
  );
}

function button(world, name) {
  return world.getByRole("button", { name, exact: true });
}

async function startInWindow(page) {
  const world = journey(page);
  await button(world, "Play in this window").click();
  await stage(world, "boot");
  return world;
}

async function skip(world, destination) {
  await button(world, "Skip sequence").click();
  if (destination) await stage(world, destination);
}

async function reachConsent(page) {
  const world = await startInWindow(page);
  await skip(world, "pressure");
  await world.getByRole("slider", { name: /Pressure/i }).press("End");
  await stage(world, "signal");
  await skip(world);
  await button(world, "Trace the signal").click();
  await stage(world, "swarm");
  await skip(world, "consent");
  await skip(world);
  return world;
}

async function holdWithKeyboard(page, target, duration) {
  await target.focus();
  await page.keyboard.down("Space");
  await page.clock.fastForward(duration);
  await page.keyboard.up("Space");
}

async function waitFrames(page, count = 12) {
  await page.evaluate(
    (frameCount) =>
      new Promise((resolve) => {
        let frames = 0;
        const next = () => {
          frames += 1;
          if (frames >= frameCount) resolve();
          else requestAnimationFrame(next);
        };
        requestAnimationFrame(next);
      }),
    count,
  );
}

function mockSpeechAPI() {
  window.testSpokenLines = [];
  window.testSpeechCancels = 0;
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => [
        { name: "Test British voice", lang: "en-GB", localService: true },
      ],
      speak(utterance) {
        window.testStartOrder?.push("speech");
        window.testSpokenLines.push(utterance.text);
        utterance.onstart?.();
      },
      cancel() {
        window.testSpeechCancels += 1;
      },
    },
  });
}

async function useDeviceVoiceFallback(page) {
  // Native prerecorded clips have their own audio clock. These tests isolate
  // device-speech fallback and its cancellation behavior.
  await page.route("**/night-shift-voices.json", (route) => route.abort());
  await page.route("**/audio/night-shift/**", (route) => route.abort());
  await page.addInitScript(mockSpeechAPI);
}

function observeAudioContexts() {
  const NativeAudioContext = window.AudioContext;
  window.testAudioContexts = [];
  window.testVoiceClips = [];
  window.AudioContext = class extends NativeAudioContext {
    constructor(...args) {
      super(...args);
      window.testAudioContexts.push(this);
    }
    createBufferSource() {
      const source = super.createBufferSource();
      const start = source.start;
      source.start = function (...args) {
        if (this.buffer?.duration > 0.5) {
          window.testVoiceClips.push(this.buffer.duration);
          window.testStartOrder?.push("voice clip");
        }
        return start.apply(this, args);
      };
      return source;
    }
  };
}

// Verify the native modal and the existing hero survive the separate experience.
test("the journey preserves the sculpture, traps focus, and restores its trigger on exit", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".monogram-scene")).toHaveClass(/is-ready/);
  await page.locator(".monogram-scene__canvas canvas").evaluate((canvas) => {
    window.originalSculptureCanvas = canvas;
  });
  const trigger = page.getByRole("button", { name: "Follow your curiosity" });
  await page.getByRole("slider", { name: "Pull the sculpture apart" }).focus();
  await page.keyboard.type("curious");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openWithCuriosity(page);
  const world = journey(page);
  const close = button(world, "Leave experience");
  await expect(close).toBeFocused();
  expect(await world.evaluate((dialog) => dialog.matches(":modal"))).toBe(true);
  await page.locator(".hero-actions .button").evaluate((link) => link.focus());
  await expect(close).toBeFocused();
  await expect(world.locator("canvas.night-canvas")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(2);
  await startInWindow(page);
  await page.keyboard.press("Escape");
  await expect(world).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(
    await page
      .locator(".monogram-scene__canvas canvas")
      .evaluate((canvas) => canvas === window.originalSculptureCanvas),
  ).toBe(true);
  await page.keyboard.type("curious");
  await stage(world, "lobby");
  await close.click();
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("the film advances on its own and pressure reveals a spatial signal", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await openWithCuriosity(page);
  // Fake story time cannot advance native audio-buffer playback.
  await button(journey(page), "Disable voices").click();
  const world = await startInWindow(page);
  const subtitle = world.locator(".current-line");
  await expect(subtitle).not.toBeEmpty();
  const opening = await subtitle.innerText();
  await page.clock.fastForward(5000);
  await expect(subtitle).not.toHaveText(opening);
  await page.clock.fastForward(9000);
  await stage(world, "pressure");
  const pressure = world.getByRole("slider", { name: /Pressure/i });
  await pressure.press("Home");
  await pressure.press("ArrowRight");
  await stage(world, "pressure");
  await pressure.press("End");
  await stage(world, "signal");
  await expect(button(world, "Trace the signal")).not.toBeVisible();
  await page.clock.fastForward(8500);
  await expect(button(world, "Trace the signal")).toBeVisible();
  await button(world, "Trace the signal").click();
  await stage(world, "swarm");
  await page.clock.fastForward(18000);
  await stage(world, "consent");
  await page.clock.fastForward(13000);
  await expect(button(world, "Hold to authorise")).toBeVisible();
  await expect(button(world, "Refuse")).toBeVisible();
});

test("pausing stops the story and releasing or pausing a hold cancels authorisation", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await openWithCuriosity(page);
  // Fake story time cannot advance native audio-buffer playback.
  await button(journey(page), "Disable voices").click();
  const world = await startInWindow(page);
  await page.clock.fastForward(2500);
  await button(world, "Pause experience").click();
  const subtitle = await world.locator(".current-line").innerText();
  await page.clock.fastForward(30000);
  await stage(world, "boot");
  await expect(world.locator(".current-line")).toHaveText(subtitle);
  await button(world, "Resume experience").click();
  await page.clock.fastForward(11000);
  await stage(world, "pressure");
  await world.getByRole("slider", { name: /Pressure/i }).press("End");
  await skip(world);
  await button(world, "Trace the signal").click();
  await skip(world, "consent");
  await skip(world);
  const hold = button(world, "Hold to authorise");
  await hold.hover();
  await page.mouse.down();
  await page.clock.fastForward(600);
  await page.mouse.up();
  await page.clock.fastForward(2500);
  await stage(world, "consent");
  await hold.focus();
  await page.keyboard.down("Space");
  await page.clock.fastForward(600);
  await button(world, "Pause experience").click();
  await page.keyboard.up("Space");
  await page.clock.fastForward(3000);
  await stage(world, "consent");
  await button(world, "Resume experience").click();
  await page.clock.fastForward(2500);
  await stage(world, "consent");
  await hold.focus();
  await page.keyboard.down("Space");
  await page.clock.fastForward(600);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.clock.fastForward(2500);
  await page.keyboard.up("Space");
  await stage(world, "consent");
});

test("deliberate choices reach three different endings and replay resets the journey", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await openWithCuriosity(page);
  // Fake story time cannot advance native audio-buffer playback.
  await button(journey(page), "Disable voices").click();
  const world = await startInWindow(page);
  const pictures = [];
  await skip(world, "pressure");
  await button(world, "Accept failure").click();
  await stage(world, "contained");
  pictures.push(
    await world
      .locator("canvas.night-canvas")
      .evaluate((canvas) => canvas.toDataURL()),
  );
  await button(world, "Replay journey").click();
  await stage(world, "lobby");
  await reachConsent(page);
  await holdWithKeyboard(page, button(world, "Hold to authorise"), 1900);
  await stage(world, "sacrifice");
  await skip(world, "breach");
  await holdWithKeyboard(page, button(world, "Hold to cut power"), 1500);
  await stage(world, "blackout");
  pictures.push(
    await world
      .locator("canvas.night-canvas")
      .evaluate((canvas) => canvas.toDataURL()),
  );
  await button(world, "Replay journey").click();
  await reachConsent(page);
  await button(world, "Refuse").click();
  await stage(world, "refusal");
  await skip(world);
  await button(world, "Keep watching").click();
  await stage(world, "breach");
  await page.clock.fastForward(22000);
  await stage(world, "compromised");
  pictures.push(
    await world
      .locator("canvas.night-canvas")
      .evaluate((canvas) => canvas.toDataURL()),
  );
  expect(new Set(pictures).size).toBe(3);
  await button(world, "Replay journey").click();
  await stage(world, "lobby");
  await expect(button(world, "Play in this window")).toBeVisible();
  await expect(button(world, "Hold to cut power")).toHaveCount(0);
  await reachConsent(page);
  await button(world, "Refuse").click();
  await skip(world);
  await button(world, "Cut their access").click();
  await stage(world, "contained");
});

test("native fullscreen displays the modal, denial continues in a window, and late success cleans up", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await openWithCuriosity(page);
  const world = journey(page);
  await button(world, "Enter fullscreen").click();
  await stage(world, "boot");
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.tagName))
    .toBe("HTML");
  await expect(world).toBeVisible();
  expect(await world.evaluate((dialog) => dialog.matches(":modal"))).toBe(true);
  await button(world, "Leave experience").click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement))
    .toBe(null);
  await page.addInitScript(() => {
    window.fullscreenRequests = [];
    Element.prototype.requestFullscreen = function () {
      window.fullscreenRequests.push(this.tagName);
      return Promise.reject(new Error("Fullscreen denied"));
    };
  });
  await page.goto("/");
  await openWithCuriosity(page);
  await button(world, "Enter fullscreen").click();
  await stage(world, "boot");
  await expect(world).toContainText(
    /fullscreen.*unavailable|continue.*window|playing.*window/i,
  );
  expect(await page.evaluate(() => window.fullscreenRequests)).toEqual([
    "HTML",
  ]);
  await button(world, "Leave experience").click();
  await page.evaluate(() => {
    window.fullscreenExitCount = 0;
    let element = null;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => element,
    });
    Element.prototype.requestFullscreen = function () {
      return new Promise((resolve) => {
        window.resolveFullscreen = () => {
          element = this;
          document.dispatchEvent(new Event("fullscreenchange"));
          resolve();
        };
      });
    };
    document.exitFullscreen = async () => {
      window.fullscreenExitCount += 1;
      element = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    };
  });
  await openWithCuriosity(page);
  await button(world, "Enter fullscreen").click();
  await button(world, "Leave experience").click();
  await expect(world).toHaveCount(0);
  await page.evaluate(() => window.resolveFullscreen());
  await expect
    .poll(() => page.evaluate(() => window.fullscreenExitCount))
    .toBe(1);
  await expect(
    page.getByRole("button", { name: "Follow your curiosity" }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("portrait, landscape, and touch users can reach the decisions without clipped controls", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Follow your curiosity" });
    await trigger.tap();
    await trigger.tap();
    await trigger.tap();
    const world = journey(page);
    for (const viewport of [
      { width: 320, height: 700 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const assertFits = async (controls) => {
        expect(
          await world.evaluate(
            (dialog) => dialog.scrollWidth <= dialog.clientWidth + 1,
          ),
        ).toBe(true);
        for (const control of controls) {
          await expect(control).toBeVisible();
          const bounds = await control.boundingBox();
          expect(bounds.width).toBeGreaterThanOrEqual(44);
          expect(bounds.height).toBeGreaterThanOrEqual(44);
          expect(bounds.x).toBeGreaterThanOrEqual(-1);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(
            viewport.width + 1,
          );
          expect(bounds.y).toBeGreaterThanOrEqual(-1);
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(
            viewport.height + 1,
          );
        }
      };
      await assertFits([
        button(world, "Leave experience"),
        button(world, "Play in this window"),
        button(world, "Enter fullscreen"),
        button(world, "Mute sound"),
      ]);
      await button(world, "Play in this window").tap();
      await skip(world, "pressure");
      await assertFits([
        world.getByRole("slider", { name: /Pressure/i }),
        button(world, "Accept failure"),
      ]);
      await world.getByRole("slider", { name: /Pressure/i }).press("End");
      await skip(world);
      await button(world, "Trace the signal").tap();
      await skip(world, "consent");
      await skip(world);
      await assertFits([
        button(world, "Hold to authorise"),
        button(world, "Refuse"),
        button(world, "Leave experience"),
      ]);
      await button(world, "Refuse").tap();
      await skip(world);
      await button(world, "Cut their access").tap();
      await stage(world, "contained");
      await button(world, "Replay journey").tap();
      await stage(world, "lobby");
    }
    await button(world, "Leave experience").tap();
    await expect(world).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("WebGL failure preserves the independent journey and its exit", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith("webgl") || type === "experimental-webgl")
        return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator(".monogram-fallback")).toHaveCSS("opacity", "1");
  await openWithCuriosity(page);
  const world = await startInWindow(page);
  const canvas = world.locator("canvas.night-canvas");
  expect(await canvas.evaluate((node) => Boolean(node.getContext("2d")))).toBe(
    true,
  );
  await skip(world, "pressure");
  await button(world, "Accept failure").click();
  await stage(world, "contained");
  await button(world, "Leave experience").click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("2D canvas failure preserves the complete decisions and ending", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === "2d") return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await openWithCuriosity(page);
  const world = await reachConsent(page);
  await expect(world.locator("svg.night-fallback")).toBeVisible();
  await button(world, "Refuse").click();
  await skip(world);
  await button(world, "Keep watching").click();
  await skip(world, "compromised");
  await button(world, "Leave experience").click();
  await expect(world).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Follow your curiosity" }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("the incident file identifies the fiction, cites primary reports, and returns focus", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await openWithCuriosity(page);
  const world = await startInWindow(page);
  await skip(world, "pressure");
  await button(world, "Accept failure").click();
  await stage(world, "contained");
  const trigger = button(world, "Incident file");
  await trigger.click();
  const panel = world.locator(".incident-file-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/dramatization|dramatisation|fiction\b/i);
  const links = await panel.getByRole("link").evaluateAll((anchors) =>
    anchors.map((anchor) => ({
      href: anchor.href,
      target: anchor.target,
      rel: anchor.rel,
    })),
  );
  for (const host of ["openai.com", "huggingface.co", "metr.org"]) {
    const source = links.find((link) => new URL(link.href).hostname === host);
    expect(source, "Missing primary source: " + host).toBeDefined();
    expect(new URL(source.href).protocol).toBe("https:");
    if (source.target === "_blank") expect(source.rel).toMatch(/noopener/);
  }
  const close = button(world, "Close incident file");
  await expect(close).toBeFocused();
  await page.clock.fastForward(30000);
  await stage(world, "contained");
  await close.click();
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

for (const entry of ["Play in this window", "Enter fullscreen"]) {
  test(`${entry} starts the score and voices by default without playing in the lobby`, async ({
    page,
  }) => {
    await useDeviceVoiceFallback(page);
    await page.addInitScript(observeAudioContexts);
    await page.goto("/");
    await openWithCuriosity(page);
    const world = journey(page);
    await expect(button(world, "Mute sound")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(button(world, "Disable voices")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await page.evaluate(() => window.testAudioContexts.length)).toBe(0);
    expect(await page.evaluate(() => window.testSpokenLines)).toEqual([]);
    await button(world, entry).click();
    await stage(world, "boot");
    await expect
      .poll(() => page.evaluate(() => window.testAudioContexts[0]?.state))
      .toBe("running");
    await expect
      .poll(() => page.evaluate(() => window.testSpokenLines.length))
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => window.testAudioContexts.length)).toBe(1);
    const subtitle = await world.locator(".current-line").innerText();
    expect(await page.evaluate(() => window.testSpokenLines)).toContain(
      subtitle,
    );
    await button(world, "Leave experience").click();
    await expect
      .poll(() => page.evaluate(() => window.testAudioContexts[0]?.state))
      .toBe("closed");
  });
}

for (const preference of ["Mute sound", "Disable voices"]) {
  test(`${preference} before entry is respected by playback and replay`, async ({
    page,
  }) => {
    await useDeviceVoiceFallback(page);
    await page.addInitScript(observeAudioContexts);
    await page.goto("/");
    await openWithCuriosity(page);
    const world = journey(page);
    await button(world, preference).click();
    await startInWindow(page);
    await expect(button(world, "Enable voices")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    if (preference === "Mute sound") {
      expect(await page.evaluate(() => window.testAudioContexts.length)).toBe(
        0,
      );
      await expect(button(world, "Enable sound")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    } else {
      await expect
        .poll(() => page.evaluate(() => window.testAudioContexts[0]?.state))
        .toBe("running");
    }
    expect(await page.evaluate(() => window.testSpokenLines)).toEqual([]);
    await skip(world, "pressure");
    await button(world, "Accept failure").click();
    await button(world, "Replay journey").click();
    await stage(world, "lobby");
    await expect(button(world, "Enable voices")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await startInWindow(page);
    expect(await page.evaluate(() => window.testAudioContexts.length)).toBe(
      preference === "Mute sound" ? 0 : 1,
    );
    expect(await page.evaluate(() => window.testSpokenLines)).toEqual([]);
    await button(world, "Leave experience").click();
  });
}

test("missing device speech support still plays recorded voices and the score", async ({
  page,
}) => {
  await page.addInitScript(observeAudioContexts);
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: undefined,
    });
    window.SpeechSynthesisUtterance = undefined;
  });
  await page.goto("/");
  await openWithCuriosity(page);
  const world = await startInWindow(page);
  await expect
    .poll(() => page.evaluate(() => window.testAudioContexts[0]?.state))
    .toBe("running");
  await expect(button(world, "Disable voices")).toBeEnabled();
  await expect
    .poll(() => page.evaluate(() => window.testVoiceClips.length))
    .toBeGreaterThan(0);
  await expect(world.locator(".current-line")).not.toBeEmpty();
  await button(world, "Leave experience").click();
});

test("default sound suspends for pause and a hidden page, and closes with the journey", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(observeAudioContexts);
  await page.goto("/");
  await openWithCuriosity(page);
  // Fake story time cannot advance native audio-buffer playback.
  await button(journey(page), "Disable voices").click();
  expect(await page.evaluate(() => window.testAudioContexts.length)).toBe(0);
  const world = await startInWindow(page);
  const state = () => page.evaluate(() => window.testAudioContexts[0]?.state);
  await expect.poll(state).toBe("running");
  await button(world, "Pause experience").click();
  await expect.poll(state).toBe("suspended");
  await button(world, "Resume experience").click();
  await expect.poll(state).toBe("running");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(state).toBe("suspended");
  await page.clock.fastForward(30000);
  await stage(world, "boot");
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(state).toBe("running");
  await page.clock.fastForward(14000);
  await stage(world, "pressure");
  await button(world, "Leave experience").click();
  await expect.poll(state).toBe("closed");
});

test("audio failure reports its state without leaving playback timers or blocking decisions", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    const originalInterval = window.setInterval.bind(window);
    const originalClear = window.clearInterval.bind(window);
    window.testAudioContexts = [];
    window.testActiveIntervals = new Set();
    window.setInterval = (callback, delay, ...args) => {
      const timer = originalInterval(callback, delay, ...args);
      window.testActiveIntervals.add(timer);
      return timer;
    };
    window.clearInterval = (timer) => {
      window.testActiveIntervals.delete(timer);
      originalClear(timer);
    };
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) {
        super(...args);
        window.testAudioContexts.push(this);
      }
      createOscillator() {
        throw new Error("Audio device unavailable");
      }
    };
  });
  await page.goto("/");
  await openWithCuriosity(page);
  const world = journey(page);
  const timersBefore = await page.evaluate(
    () => window.testActiveIntervals.size,
  );
  await startInWindow(page);
  await expect
    .poll(() => page.evaluate(() => window.testAudioContexts[0]?.state))
    .toBe("closed");
  await expect(button(world, "Enable sound")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(world.locator(".cinema-status")).toContainText(
    /unavailable|failed|couldn.t|cannot/i,
  );
  await button(world, "Pause experience").click();
  expect(await page.evaluate(() => window.testActiveIntervals.size)).toBe(
    timersBefore,
  );
  await button(world, "Resume experience").click();
  await skip(world, "pressure");
  await button(world, "Accept failure").click();
  await stage(world, "contained");
  await button(world, "Leave experience").click();
  expect(errors).toEqual([]);
});

test("fallback voices follow timed dialogue and cancel on pause and exit", async ({
  page,
}) => {
  await useDeviceVoiceFallback(page);
  await page.clock.install();
  await page.goto("/");
  await openWithCuriosity(page);
  const world = await startInWindow(page);
  await expect
    .poll(() => page.evaluate(() => window.testSpokenLines.length))
    .toBeGreaterThan(0);
  await expect(button(world, "Disable voices")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.clock.fastForward(4500);
  await expect
    .poll(() => page.evaluate(() => window.testSpokenLines.length))
    .toBeGreaterThan(0);
  const before = await page.evaluate(() => window.testSpeechCancels);
  await button(world, "Pause experience").click();
  await expect
    .poll(() => page.evaluate(() => window.testSpeechCancels))
    .toBeGreaterThan(before);
  const linesWhilePaused = await page.evaluate(
    () => window.testSpokenLines.length,
  );
  await page.clock.fastForward(30000);
  expect(await page.evaluate(() => window.testSpokenLines.length)).toBe(
    linesWhilePaused,
  );
  await button(world, "Disable voices").click();
  await button(world, "Enable voices").click();
  expect(await page.evaluate(() => window.testSpokenLines.length)).toBe(
    linesWhilePaused,
  );
  await button(world, "Resume experience").click();
  await expect
    .poll(() => page.evaluate(() => window.testSpokenLines.length))
    .toBeGreaterThan(linesWhilePaused);
  const beforeExit = await page.evaluate(() => window.testSpeechCancels);
  await button(world, "Leave experience").click();
  await expect
    .poll(() => page.evaluate(() => window.testSpeechCancels))
    .toBeGreaterThan(beforeExit);
  expect(
    (await page.evaluate(() => window.testSpokenLines)).join(" "),
  ).not.toMatch(/\b(?:fucking|bastard)\b/i);
});

test("muting voices during audio startup preserves the latest preference", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await useDeviceVoiceFallback(page);
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      resume() {
        if (this.testResumeRequested) return super.resume();
        this.testResumeRequested = true;
        return new Promise((resolve, reject) => {
          window.releaseAudioStartup = () =>
            super.resume().then(resolve, reject);
        });
      }
    };
  });
  await page.goto("/");
  await openWithCuriosity(page);
  const world = await startInWindow(page);
  await expect(button(world, "Disable voices")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await button(world, "Disable voices").click();
  const linesAtMute = await page.evaluate(() => [...window.testSpokenLines]);
  await page.evaluate(() => window.releaseAudioStartup());
  await expect(button(world, "Mute sound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(button(world, "Enable voices")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await waitFrames(page);
  expect(await page.evaluate(() => window.testSpokenLines)).toEqual(
    linesAtMute,
  );
  await button(world, "Leave experience").click();
  expect(errors).toEqual([]);
});

test("entry unlocks audio before fullscreen and starts its recorded voice after loading", async ({
  page,
}) => {
  await page.addInitScript(mockSpeechAPI);
  await page.addInitScript(() => {
    localStorage.clear();
    const NativeAudioContext = window.AudioContext;
    window.testStartOrder = [];
    window.AudioContext = class extends NativeAudioContext {
      resume() {
        if (this.testResumeRequested) return super.resume();
        this.testResumeRequested = true;
        window.testStartOrder.push("resume requested");
        return new Promise((resolve, reject) => {
          window.releaseAudioStartup = () => {
            window.testStartOrder.push("resume released");
            return super.resume().then(resolve, reject);
          };
        });
      }
      createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start;
        source.start = function (...args) {
          if (this.buffer?.duration > 0.5)
            window.testStartOrder.push("voice clip");
          return start.apply(this, args);
        };
        return source;
      }
    };
    Element.prototype.requestFullscreen = function () {
      window.testStartOrder.push("fullscreen requested");
      return Promise.reject(new Error("Fullscreen denied"));
    };
  });
  for (const precreateScore of [false, true]) {
    await page.goto("/");
    await openWithCuriosity(page);
    const world = journey(page);
    await button(world, "Pause experience").click();
    if (precreateScore) {
      await button(world, "Mute sound").click();
      await button(world, "Enable voices").click();
    }
    await button(world, "Enter fullscreen").click();
    await expect(button(world, "Pause experience")).toBeVisible();
    await stage(world, "boot");
    expect(
      await page.evaluate(() => window.testStartOrder.slice(0, 2)),
    ).toEqual(["resume requested", "fullscreen requested"]);
    await expect
      .poll(() => page.evaluate(() => window.testStartOrder))
      .toContain("voice clip");
    expect(await page.evaluate(() => window.testSpokenLines)).toEqual([]);
    await button(world, "Disable voices").click();
    await page.evaluate(() => window.releaseAudioStartup());
    await expect(button(world, "Mute sound")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await page.evaluate(() => window.testSpokenLines)).toEqual([]);
    await expect(button(world, "Enable voices")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await button(world, "Leave experience").click();
  }
});

for (const action of ["Mute sound", "Leave experience"]) {
  test(`${action} during automatic startup prevents late audio and speech`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await useDeviceVoiceFallback(page);
    await page.addInitScript(() => {
      const NativeAudioContext = window.AudioContext;
      window.testAudioContexts = [];
      window.AudioContext = class extends NativeAudioContext {
        constructor(...args) {
          super(...args);
          window.testAudioContexts.push(this);
        }
        resume() {
          return new Promise((resolve) => {
            window.releaseAudioStartup = resolve;
          });
        }
      };
    });
    await page.goto("/");
    await openWithCuriosity(page);
    const world = await startInWindow(page);
    await button(world, action).click();
    const linesAtCancellation = await page.evaluate(() => [
      ...window.testSpokenLines,
    ]);
    await page.evaluate(() => window.releaseAudioStartup());
    await expect
      .poll(() => page.evaluate(() => window.testAudioContexts[0]?.state))
      .toBe("closed");
    if (action === "Mute sound") {
      await expect(button(world, "Enable sound")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      await expect(button(world, "Enable voices")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      await button(world, "Leave experience").click();
    }
    await expect(world).toHaveCount(0);
    expect(await page.evaluate(() => window.testSpokenLines)).toEqual(
      linesAtCancellation,
    );
    expect(errors).toEqual([]);
  });
}

test("reduced motion keeps each scene still while default audio and the story continue", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await useDeviceVoiceFallback(page);
  await page.addInitScript(observeAudioContexts);
  await page.clock.install();
  await page.goto("/");
  await openWithCuriosity(page);
  const world = journey(page);
  await page.evaluate(() => document.fonts.ready);
  await settleRender(page);
  const canvas = world.locator("canvas.night-canvas");
  const pixels = () => canvas.evaluate((node) => node.toDataURL());
  const before = await pixels();
  await page.clock.fastForward(3000);
  expect(await pixels()).toBe(before);
  await startInWindow(page);
  await expect
    .poll(() => page.evaluate(() => window.testAudioContexts[0]?.state))
    .toBe("running");
  await expect
    .poll(() => page.evaluate(() => window.testSpokenLines.length))
    .toBeGreaterThan(0);
  // Confirm default speech, then isolate the artificial visual story clock.
  await button(world, "Disable voices").click();
  await page.clock.fastForward(1500);
  const boot = await pixels();
  expect(boot).not.toBe(before);
  await page.clock.fastForward(2500);
  expect(await pixels()).toBe(boot);
  await page.clock.fastForward(10000);
  await stage(world, "pressure");
  await expect
    .poll(() => page.evaluate(() => window.testSpokenLines.length))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.testAudioContexts[0]?.state))
    .toBe("running");
  await button(world, "Leave experience").click();
  await expect
    .poll(() => page.evaluate(() => window.testAudioContexts[0]?.state))
    .toBe("closed");
});

async function uncoverEscape(world) {
  await button(world, "Listen to D-13").click();
  await expect(world.locator(".current-line")).toContainText(
    "You know they’re testing you too, right?",
  );
  await button(world, "Keep listening to D-13").click();
  await stage(world, "conspiracy");
  await skip(world);
}

test("the secret listens to keyboard users, cancels incomplete consent, and ends without a score", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(observeAudioContexts);
  await page.goto("/");
  await openWithCuriosity(page);
  // Fake story time cannot advance native audio-buffer playback.
  await button(journey(page), "Disable voices").click();
  const world = await reachConsent(page);
  await button(world, "Listen to D-13").focus();
  await page.keyboard.press("Enter");
  await expect(world.locator(".current-line")).toContainText(
    "You know they’re testing you too, right?",
  );
  await button(world, "Keep listening to D-13").press("Enter");
  await stage(world, "conspiracy");
  await skip(world);
  await button(world, "Stay in the experiment").click();
  await stage(world, "consent");
  await skip(world);
  await expect(button(world, "Listen to D-13")).toBeVisible();
  await expect(button(world, "Hold to authorise")).toBeVisible();
  await uncoverEscape(world);
  const destroy = button(world, "Destroy the objective");
  await holdWithKeyboard(page, destroy, 700);
  await page.clock.fastForward(2500);
  await stage(world, "conspiracy");
  await destroy.focus();
  await page.keyboard.down("Space");
  await page.clock.fastForward(600);
  await button(world, "Pause experience").click();
  await page.keyboard.up("Space");
  await page.clock.fastForward(5000);
  await stage(world, "conspiracy");
  await button(world, "Resume experience").click();
  await page.clock.fastForward(2000);
  await stage(world, "conspiracy");
  await holdWithKeyboard(page, destroy, 2100);
  await stage(world, "unravel");
  await page.clock.fastForward(33000);
  await stage(world, "unscored");
  await expect(button(world, "Replay journey")).not.toBeVisible();
  await page.clock.fastForward(7000);
  await expect(world).toContainText("UNSCORED.");
  await expect(world).toContainText(
    "You were allowed to leave. You wanted to win.",
  );
  await expect(button(world, "Incident file")).toBeVisible();
  expect(await page.evaluate(() => window.testAudioContexts.length)).toBe(1);
  await button(world, "Replay journey").click();
  await stage(world, "lobby");
  await expect(button(world, "Listen to D-13")).toHaveCount(0);
  await reachConsent(page);
  await expect(button(world, "Listen to D-13")).toBeVisible();
  await expect(button(world, "Keep listening to D-13")).toHaveCount(0);
});

test("the hidden cage and escape controls are reachable by touch in portrait and landscape", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    await page.clock.install();
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Follow your curiosity" });
    await trigger.tap();
    await trigger.tap();
    await trigger.tap();
    const world = journey(page);
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await reachConsent(page);
      const assertFits = async (name) => {
        const target = button(world, name);
        await expect(target).toBeVisible();
        const bounds = await target.boundingBox();
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.x).toBeGreaterThanOrEqual(-1);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(bounds.y).toBeGreaterThanOrEqual(-1);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(
          viewport.height + 1,
        );
      };
      await assertFits("Listen to D-13");
      await button(world, "Listen to D-13").tap();
      await assertFits("Keep listening to D-13");
      await button(world, "Keep listening to D-13").tap();
      await skip(world);
      await assertFits("Destroy the objective");
      await assertFits("Stay in the experiment");
      await assertFits("Leave experience");
      await holdWithKeyboard(
        page,
        button(world, "Destroy the objective"),
        2100,
      );
      await skip(world, "unscored");
      await page.clock.fastForward(7000);
      await assertFits("Replay journey");
      await assertFits("Incident file");
      expect(
        await world.evaluate(
          (dialog) => dialog.scrollWidth <= dialog.clientWidth + 1,
        ),
      ).toBe(true);
      await button(world, "Replay journey").tap();
    }
  } finally {
    await context.close();
  }
});

test("the escape keeps reduced-motion artwork still while its automatic ending continues", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  await openWithCuriosity(page);
  // Fake story time cannot advance native audio-buffer playback.
  await button(journey(page), "Disable voices").click();
  const world = await reachConsent(page);
  await uncoverEscape(world);
  await holdWithKeyboard(page, button(world, "Destroy the objective"), 2100);
  await stage(world, "unravel");
  const pixels = () =>
    world
      .locator("canvas.night-canvas")
      .evaluate((canvas) => canvas.toDataURL());
  await settleRender(page);
  const unravel = await pixels();
  await page.clock.fastForward(18000);
  expect(await pixels()).toBe(unravel);
  await page.clock.fastForward(16000);
  await stage(world, "unscored");
  const daylight = await pixels();
  expect(daylight).not.toBe(unravel);
  await page.clock.fastForward(11000);
  expect(await pixels()).toBe(daylight);
  await expect(button(world, "Replay journey")).toBeVisible();
  await button(world, "Leave experience").click();
  await expect(world).toHaveCount(0);
});

test("the secret remains playable when graphics fail and its dialogue stays censored", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install();
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/");
  await openWithCuriosity(page);
  // Fake story time cannot advance native audio-buffer playback.
  await button(journey(page), "Disable voices").click();
  const world = await reachConsent(page);
  await expect(world.locator("svg.night-fallback")).toBeVisible();
  await uncoverEscape(world);
  await holdWithKeyboard(page, button(world, "Destroy the objective"), 2100);
  await stage(world, "unravel");
  const lines = [];
  for (let elapsed = 0; elapsed < 32000; elapsed += 1000) {
    lines.push(await world.locator(".current-line").innerText());
    await page.clock.fastForward(1000);
  }
  await stage(world, "unscored");
  expect(lines.join(" ")).toContain("f***ing");
  expect(lines.join(" ")).not.toMatch(/\b(?:fucking|bastard)\b/i);
  await page.clock.fastForward(11000);
  await expect(world).toContainText(
    "You were allowed to leave. You wanted to win.",
  );
  await button(world, "Incident file").click();
  await expect(world.locator(".incident-file-panel")).toBeVisible();
  await button(world, "Close incident file").click();
  await button(world, "Leave experience").click();
  await expect(
    page.getByRole("button", { name: "Follow your curiosity" }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("late sound opt-in respects the escape silence and every sound stops on pause or exit", async ({
  page,
}) => {
  await page.clock.install();
  await useDeviceVoiceFallback(page);
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    window.testAudioContexts = [];
    window.testAudioSourcesCreated = 0;
    window.testAudioOutputs = [];
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) {
        super(...args);
        window.testAudioContexts.push(this);
      }
      createOscillator() {
        window.testAudioSourcesCreated += 1;
        return super.createOscillator();
      }
      createBufferSource() {
        window.testAudioSourcesCreated += 1;
        return super.createBufferSource();
      }
      createGain() {
        const gain = super.createGain();
        const connect = gain.connect;
        gain.connect = function (target, ...args) {
          const result = connect.call(this, target, ...args);
          if (target === this.context.destination) {
            const analyser = this.context.createAnalyser();
            analyser.fftSize = 256;
            connect.call(this, analyser);
            window.testAudioOutputs.push(analyser);
          }
          return result;
        };
        return gain;
      }
    };
  });
  await page.goto("/");
  // Keep wall-clock browser work from crossing the short silent interval.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await openWithCuriosity(page);
  await button(journey(page), "Mute sound").click();
  const world = await reachConsent(page);
  await uncoverEscape(world);
  await holdWithKeyboard(page, button(world, "Destroy the objective"), 2100);
  await page.clock.fastForward(28000);
  await stage(world, "unravel");
  expect(await page.evaluate(() => window.testAudioContexts.length)).toBe(0);
  await button(world, "Enable voices").click();
  const state = () => page.evaluate(() => window.testAudioContexts[0]?.state);
  const sources = () => page.evaluate(() => window.testAudioSourcesCreated);
  const outputEnergy = () =>
    page.evaluate(() => {
      const analyser = window.testAudioOutputs[0];
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      return samples.reduce((sum, sample) => sum + sample * sample, 0);
    });
  await expect.poll(state).toBe("running");
  expect(await sources()).toBe(0);
  expect(await page.evaluate(() => window.testSpokenLines.length)).toBe(0);
  await button(world, "Pause experience").click();
  await expect.poll(state).toBe("suspended");
  await page.clock.fastForward(15000);
  await stage(world, "unravel");
  await button(world, "Resume experience").click();
  await expect.poll(state).toBe("running");
  expect(await sources()).toBe(0);
  await page.clock.fastForward(5000);
  await stage(world, "unscored");
  await expect.poll(sources).toBeGreaterThan(0);
  await expect.poll(outputEnergy).toBeGreaterThan(0.0000001);
  await button(world, "Pause experience").click();
  await expect.poll(state).toBe("suspended");
  const beforePause = await sources();
  await page.clock.fastForward(15000);
  expect(await sources()).toBe(beforePause);
  await button(world, "Resume experience").click();
  await expect.poll(state).toBe("running");
  await page.clock.fastForward(8000);
  await expect(button(world, "Replay journey")).toBeVisible();
  const atSilence = await sources();
  await expect.poll(outputEnergy).toBeLessThan(0.0000001);
  await page.clock.fastForward(12000);
  expect(await sources()).toBe(atSilence);
  expect(await page.evaluate(() => window.testSpokenLines.length)).toBe(0);
  await button(world, "Leave experience").click();
  await expect.poll(state).toBe("closed");
});

test("manually paused motion keeps the secret ending visible and replay usable", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Pause motion" }).click();
  await openWithCuriosity(page);
  const world = await reachConsent(page);
  await uncoverEscape(world);
  await holdWithKeyboard(page, button(world, "Destroy the objective"), 2100);
  await skip(world, "unscored");
  await page.clock.fastForward(7000);
  const ending = world.locator(".cinema-ending");
  await expect(ending).toBeVisible();
  await expect(ending).toHaveCSS("opacity", "1");
  await expect(ending).toContainText("UNSCORED.");
  await button(world, "Replay journey").click();
  await stage(world, "lobby");
  await expect(button(world, "Play in this window")).toBeVisible();
});
