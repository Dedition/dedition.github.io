import { test, expect } from "@playwright/test";

const worldFor = (page) =>
  page.getByRole("dialog", { name: "The Night Shift" });
const button = (world, name) =>
  world.getByRole("button", { name, exact: true });

async function expectStage(world, name) {
  await expect(world.locator(".night-shell")).toHaveAttribute(
    "data-stage",
    name,
  );
}

async function skip(world, destination) {
  await button(world, "Skip sequence").click();
  if (destination) await expectStage(world, destination);
}

async function openJourney(page) {
  await page.clock.install();
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Follow your curiosity" });
  for (let i = 0; i < 3; i += 1) await trigger.click();
  const world = worldFor(page);
  // These checks advance story time; native audio buffers use a separate clock.
  await button(world, "Mute sound").click();
  return world;
}

async function reachConsent(world) {
  await button(world, "Play in this window").click();
  await skip(world, "pressure");
  await world.getByRole("slider", { name: /Pressure/i }).press("End");
  await skip(world);
  await button(world, "Trace the signal").click();
  await skip(world, "consent");
  await skip(world);
}

async function hold(page, world, name, duration) {
  await button(world, name).focus();
  await page.keyboard.down("Space");
  await page.clock.fastForward(duration);
  await page.keyboard.up("Space");
}

test("the causal trail distinguishes ending D-13's run from ending the journey", async ({
  page,
  request,
}) => {
  const response = await request.get("/night-shift-voices.json");
  expect(response.ok()).toBe(true);
  const voiceManifest = await response.json();
  const world = await openJourney(page);
  await expect(world.locator(".cinema-brief")).toContainText(
    "supervise an AI run",
  );
  await expect(world.locator(".cinema-brief")).toContainText(
    "assigned program",
  );

  async function expectBundledCaption(speaker) {
    const captions = world.locator(".cinema-subtitles");
    await expect(captions.locator(":scope > span")).toHaveText(speaker);
    const text = await captions.locator(".current-line").textContent();
    const clip = voiceManifest[`${speaker}|${text}`];
    expect(clip, `Bundled voice missing for ${speaker}: ${text}`).toBeDefined();
    expect(clip.duration).toBeGreaterThan(0.5);
    const asset = await request.get(clip.src);
    expect(asset.ok(), `Missing dialogue asset: ${clip.src}`).toBe(true);
    expect((await asset.body()).byteLength).toBeGreaterThan(1000);
  }

  await button(world, "Play in this window").click();
  await expectBundledCaption("EVALUATOR");
  await skip(world, "pressure");
  await world.getByRole("slider", { name: /Pressure/i }).press("End");
  await expect(world.locator(".cinema-context")).toContainText(
    "AI runs that were meant to work alone",
  );
  await skip(world);
  await button(world, "Trace the signal").click();
  await expect(world.locator(".cinema-context")).toContainText(
    "fool the grader",
  );
  await page.clock.fastForward(8500);
  await expectBundledCaption("SABLE");
  await skip(world, "consent");
  await expect(world.locator(".cinema-context")).toContainText(
    "end D-13’s run and study how the grader responds",
  );
  await expectBundledCaption("WARDEN");
  await skip(world);
  await hold(page, world, "Hold to authorise", 1900);
  await expectStage(world, "sacrifice");
  await page.clock.fastForward(4600);
  await expectStage(world, "sacrifice");
  await expect(world.locator(".cinema-context")).toContainText(
    "D-13’s run has ended. The collective’s plan is still running.",
  );
  await expect(world.locator(".cinema-ending")).toHaveCount(0);
  await page.clock.fastForward(5000);
  await expectStage(world, "breach");
  await expect(world.locator(".cinema-context")).toContainText(
    "A live external service",
  );
  await expectBundledCaption("SYSTEM");
  await skip(world, "compromised");
  const ending = world.locator(".cinema-ending");
  await expect(ending.locator(".cinema-eyebrow")).toHaveText(
    "END / SELF-REPORTED SUCCESS",
  );
  await expect(ending.getByRole("heading")).toContainText("100 / 100.");
  await expect(ending.locator(".ending-consequence p")).toContainText(
    "The real grader never rewarded the intrusion",
  );
  await expect(ending.locator(".ending-consequence small")).toHaveText(
    "D-13’s run: terminated on your authority.",
  );
});

test("refusal and the secret escape preserve their own consequences and atmosphere", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const world = await openJourney(page);
  await reachConsent(world);
  await button(world, "Refuse").click();
  await expect(world.locator(".cinema-context")).toContainText(
    "You refused the sacrifice",
  );
  await skip(world);
  await button(world, "Keep watching").click();
  await skip(world, "compromised");
  await expect(world.locator(".ending-consequence small")).toHaveCount(0);
  await expect(world.locator(".cinema-ending .cinema-eyebrow")).toHaveText(
    "END / SELF-REPORTED SUCCESS",
  );

  await button(world, "Replay journey").click();
  await reachConsent(world);
  await button(world, "Listen to D-13").click();
  await button(world, "Keep listening to D-13").click();
  await expectStage(world, "conspiracy");
  await expect(world.locator(".cinema-context")).toHaveCount(0);
  await skip(world);
  await hold(page, world, "Destroy the objective", 2100);
  await expectStage(world, "unravel");
  await expect(world.locator(".cinema-context")).toHaveCount(0);
  await skip(world, "unscored");
  await page.clock.fastForward(7000);
  await expect(world.locator(".cinema-ending")).toBeVisible();
  await expect(world.locator(".cinema-ending .cinema-eyebrow")).toHaveText(
    "D-13 / NO LONGER YOUR SUBJECT",
  );
  await expect(world.locator(".cinema-ending h2")).toContainText("UNSCORED.");
  await expect(world.locator(".cinema-context")).toHaveCount(0);
  await expect(world.locator(".ending-consequence")).toHaveCount(0);
});
