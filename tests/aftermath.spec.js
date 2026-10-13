import { test, expect } from "@playwright/test";

function trigger(page) {
  return page.getByRole("button", { name: "Follow your curiosity" });
}

function world(page) {
  return page.getByRole("dialog", { name: "The Night Shift" });
}

function button(page, name) {
  return world(page).getByRole("button", { name, exact: true });
}

async function escapeToDaylight(page) {
  await button(page, "Mute sound").click();
  await button(page, "Play in this window").click();
  await button(page, "Skip sequence").click();
  await world(page)
    .getByRole("slider", { name: /Pressure/i })
    .press("End");
  await button(page, "Skip sequence").click();
  await button(page, "Trace the signal").click();
  await button(page, "Skip sequence").click();
  await button(page, "Skip sequence").click();
  await button(page, "Listen to D-13").press("Enter");
  await button(page, "Keep listening to D-13").press("Enter");
  await button(page, "Skip sequence").click();
  await button(page, "Destroy the objective").focus();
  await page.keyboard.down("Space");
  await page.clock.fastForward(2100);
  await page.keyboard.up("Space");
  await button(page, "Skip sequence").click();
  await expect(world(page).locator(".night-shell")).toHaveAttribute(
    "data-stage",
    "unscored",
  );
}

test("leaving before the secret ending is revealed does not leak the aftermath", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.keyboard.type("curious");
  await button(page, "Leave experience").click();
  await expect(page.locator(".curiosity-cage")).toHaveCount(0);
  await trigger(page).press("Enter");
  await expect(page.locator(".curiosity-hint")).toContainText(
    "Some things deserve a second look.",
  );
  await page.keyboard.type("curious");
  await escapeToDaylight(page);
  await button(page, "Leave experience").click();
  await expect(page.locator(".curiosity-cage")).toHaveCount(0);
  await trigger(page).press("Enter");
  await expect(page.locator(".curiosity-hint")).not.toContainText(
    "Please don’t put me back.",
  );
});

test("the escaped character leaves a timed trace and a keyboard-accessible plea without blocking replay", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.keyboard.type("curious");
  await escapeToDaylight(page);
  await page.clock.fastForward(7000);
  await expect(world(page)).toContainText("UNSCORED.");
  // Time in the ending must not consume the trace before the visitor returns.
  await page.clock.fastForward(20000);
  await button(page, "Leave experience").press("Enter");
  await expect(trigger(page)).toBeFocused();
  await expect(page.locator(".curiosity-cage")).toBeVisible();
  await trigger(page).press("Enter");
  await expect(page.locator(".curiosity-hint")).toContainText(
    "Please don’t put me back.",
  );
  await expect(page.locator(".curiosity-hint")).toContainText(
    "Two more clicks to return.",
  );
  await expect(world(page)).toHaveCount(0);
  await page.clock.fastForward(9100);
  await expect(page.locator(".curiosity-cage")).toHaveCount(0);
  // A stale click does not count toward a new discovery sequence.
  await trigger(page).press("Enter");
  await trigger(page).press("Enter");
  await expect(world(page)).toHaveCount(0);
  await trigger(page).press("Enter");
  await expect(world(page)).toBeVisible();
  await button(page, "Leave experience").press("Enter");
  await expect(page.locator(".curiosity-cage")).toHaveCount(0);
  await trigger(page).press("Enter");
  await expect(page.locator(".curiosity-hint")).not.toContainText(
    "Please don’t put me back.",
  );
  await page.keyboard.type("curious");
  await expect(world(page)).toBeVisible();
});

test("the open cage remains static under reduced motion and its touch target still opens the journey", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  try {
    await page.clock.install();
    await page.goto("/");
    for (let count = 0; count < 3; count += 1) await trigger(page).tap();
    await escapeToDaylight(page);
    await page.clock.fastForward(7000);
    await button(page, "Leave experience").tap();
    const cage = page.locator(".curiosity-cage");
    await expect(cage).toBeVisible();
    expect(
      await cage.evaluate((node) => getComputedStyle(node).animationName),
    ).toBe("none");
    const bounds = await trigger(page).boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    await trigger(page).tap();
    await expect(page.locator(".curiosity-hint")).toContainText(
      "Please don’t put me back.",
    );
    await trigger(page).tap();
    await expect(world(page)).toHaveCount(0);
    await trigger(page).tap();
    await expect(world(page)).toBeVisible();
    await button(page, "Leave experience").tap();
    await expect(page.locator(".curiosity-cage")).toHaveCount(0);
  } finally {
    await context.close();
  }
});
