import { test, expect } from "@playwright/test";

const trigger = (page) =>
  page.getByRole("button", { name: "Follow your curiosity" });
const world = (page) => page.getByRole("dialog", { name: "The Night Shift" });
const firstWord = (page) => page.locator("#hero-title .curiosity-word").first();

async function wordOffset(page) {
  return firstWord(page).evaluate((word) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(word).transform);
    return { x: matrix.m41, y: matrix.m42 };
  });
}

async function expectRestored(page) {
  await expect(page.locator(".hero-copy")).toHaveAttribute(
    "data-curiosity-level",
    "0",
  );
  expect(
    await page
      .locator(".curiosity-word")
      .evaluateAll((words) =>
        words.every(
          (word) =>
            getComputedStyle(word).transform === "none" &&
            getComputedStyle(word).opacity === "1" &&
            word.getAnimations().length === 0,
        ),
      ),
  ).toBe(true);
}

test("each discovery tap moves the real words further before entering and restores them on return", async ({
  page,
}) => {
  await page.goto("/");
  await expect(trigger(page)).toBeVisible();
  const initialBounds = await trigger(page).boundingBox();
  const originalText = await page.locator("#hero-title").innerText();

  await trigger(page).press("Enter");
  await expect.poll(async () => (await wordOffset(page)).y).toBeLessThan(-10);
  const firstOffset = await wordOffset(page);
  expect(
    await firstWord(page).evaluate((word) => word.getAnimations().length),
  ).toBe(1);

  await trigger(page).press("Enter");
  await expect
    .poll(async () => (await wordOffset(page)).y)
    .toBeLessThan(firstOffset.y - 20);
  const scatteredBounds = await trigger(page).boundingBox();
  expect(scatteredBounds.x).toBeCloseTo(initialBounds.x, 1);
  expect(scatteredBounds.y).toBeCloseTo(initialBounds.y, 1);
  expect(await page.locator("#hero-title").innerText()).toBe(originalText);
  await expect(world(page)).toHaveCount(0);

  await trigger(page).press("Enter");
  await expect(page.locator(".hero-copy")).toHaveAttribute(
    "data-curiosity-level",
    "3",
  );
  expect(
    await page.locator(".night-dialog").evaluate((node) => node.open),
  ).toBe(false);
  await expect(world(page)).toBeVisible();
  await expectRestored(page);
  await world(page).getByRole("button", { name: "Leave experience" }).click();
  await expect(trigger(page)).toBeFocused();
  await expectRestored(page);
});

test("scattering on small touch screens keeps the asterisk anchored, tappable, and within the viewport", async ({
  browser,
  baseURL,
}) => {
  for (const width of [320, 390]) {
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await trigger(page).scrollIntoViewIfNeeded();
      const initialBounds = await trigger(page).boundingBox();
      expect(initialBounds.width).toBeGreaterThanOrEqual(44);
      expect(initialBounds.height).toBeGreaterThanOrEqual(44);
      for (let count = 0; count < 2; count += 1) {
        await trigger(page).tap();
        await expect
          .poll(async () => (await wordOffset(page)).y)
          .toBeLessThan(count === 0 ? -10 : -40);
        const geometry = await trigger(page).evaluate((button) => {
          const bounds = button.getBoundingClientRect();
          return {
            x: bounds.x,
            y: bounds.y,
            hit:
              document
                .elementFromPoint(
                  bounds.x + bounds.width / 2,
                  bounds.y + bounds.height / 2,
                )
                ?.closest(".curiosity-trigger") === button,
            overflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          };
        });
        expect(geometry.x).toBeCloseTo(initialBounds.x, 1);
        expect(geometry.y).toBeCloseTo(initialBounds.y, 1);
        expect(geometry.hit).toBe(true);
        expect(geometry.overflow).toBeLessThanOrEqual(1);
      }
      await trigger(page).tap();
      await expect(world(page)).toBeVisible();
      await expectRestored(page);
    } finally {
      await context.close();
    }
  }
});

test("idle, resize, Escape, motion pause, and keyboard entry clear scatter state and cannot leave a delayed opening", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await expect(trigger(page)).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await trigger(page).press("Enter");
  await page.clock.fastForward(5100);
  await expectRestored(page);
  await expect(page.locator(".curiosity-hint")).toContainText(
    "A little curiosity can take you somewhere unexpected.",
  );

  for (let count = 0; count < 3; count += 1) await trigger(page).press("Enter");
  await expect(page.locator(".hero-copy")).toHaveAttribute(
    "data-curiosity-level",
    "3",
  );
  await page.setViewportSize({ width: 1100, height: 850 });
  await expectRestored(page);
  await page.clock.fastForward(1000);
  await expect(world(page)).toHaveCount(0);

  for (let count = 0; count < 3; count += 1) await trigger(page).press("Enter");
  await page.keyboard.press("Escape");
  await page.clock.fastForward(1000);
  await expectRestored(page);
  await expect(world(page)).toHaveCount(0);

  await trigger(page).press("Enter");
  await trigger(page).press("Enter");
  await page.getByRole("button", { name: "Pause motion" }).press("Enter");
  await expectRestored(page);
  await expect(page.locator(".curiosity-hint")).toContainText(
    "A little curiosity can take you somewhere unexpected.",
  );
  await page.clock.fastForward(5100);
  await expect(world(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Play motion" }).press("Enter");

  for (let count = 0; count < 3; count += 1) await trigger(page).press("Enter");
  await page.keyboard.type("curious");
  await expect(world(page)).toBeVisible();
  await expectRestored(page);
  await world(page)
    .getByRole("button", { name: "Leave experience" })
    .press("Enter");
  await page.clock.fastForward(1000);
  await expect(world(page)).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  await expectRestored(page);
});

test("reduced motion and unavailable Web Animations preserve three-tap entry without moving words", async ({
  browser,
  baseURL,
}) => {
  for (const fallback of ["reduced-motion", "no-web-animations"]) {
    const context = await browser.newContext({
      baseURL,
      reducedMotion: fallback === "reduced-motion" ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    try {
      if (fallback === "no-web-animations")
        await page.addInitScript(() => {
          Element.prototype.animate = undefined;
        });
      await page.goto("/");
      for (let count = 0; count < 2; count += 1) {
        await trigger(page).press("Enter");
        expect(await wordOffset(page)).toEqual({ x: 0, y: 0 });
        expect(
          await firstWord(page).evaluate((word) => word.getAnimations().length),
        ).toBe(0);
        await expect(world(page)).toHaveCount(0);
      }
      await trigger(page).press("Enter");
      await expect(world(page)).toBeVisible();
      await expectRestored(page);
    } finally {
      await context.close();
    }
  }
});
