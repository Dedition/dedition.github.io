import { test, expect } from "@playwright/test";

test("renders the portfolio and a single interactive scene without failed assets or page errors", async ({
  page,
}) => {
  const errors = [];
  const failedAssets = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      response.url().startsWith("http://127.0.0.1")
    )
      failedAssets.push(response.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Serious about",
  );
  await expect(page.locator(".monogram-scene")).toHaveClass(/is-ready/);
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Rotate sculpture right" }).click();
  await page.getByRole("button", { name: "Reset sculpture view" }).click();
  await page
    .getByRole("link", { name: "Explore my work", exact: true })
    .click();
  await expect(page).toHaveURL(/#work$/);
  await expect(
    page.getByRole("heading", { name: "Built with intent." }),
  ).toBeInViewport();
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`content fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    for (const id of ["work", "about", "experience", "contact"]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await expect(
      page.getByRole("link", { name: "L.ladipo@hotmail.com", exact: true }),
    ).toBeVisible();
  });
}

test("mobile navigation is keyboard accessible and closes after choosing a section", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Menu" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "About", exact: true })
    .click();
  await expect(page).toHaveURL(/#about$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("heading", {
      name: "A winding path. A deliberate direction.",
    }),
  ).toBeInViewport();
});

test("case studies can be opened and closed with the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  const summary = page.locator(".case-study summary").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".case-study").first()).toHaveAttribute("open", "");
  await expect(
    page.getByRole("heading", {
      name: "Clarity at the surface. Care underneath.",
    }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".case-study").first()).not.toHaveAttribute("open");
});

test("contact and resume work without a third-party form service", async ({
  page,
  context,
  request,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "L.ladipo@hotmail.com", exact: true }),
  ).toHaveAttribute("href", "mailto:L.ladipo@hotmail.com");
  await page.getByRole("button", { name: "Copy email address" }).click();
  await expect(page.getByRole("status")).toHaveText("Email copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "L.ladipo@hotmail.com",
  );
  const pdf = await request.get("/Leo-Ladipo-Resume.pdf");
  expect(pdf.ok()).toBe(true);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Résumé PDF", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("Leo-Ladipo-Resume.pdf");
});

test("clipboard denial leaves a useful, selectable contact address", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () => Promise.reject(new Error("Permission denied")),
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Copy email address" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Could not copy. You can select the email address above.",
  );
  await expect(
    page.getByRole("link", { name: "L.ladipo@hotmail.com", exact: true }),
  ).toBeVisible();
});

test("motion controls and live reduced-motion preference stop automatic animation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".monogram-scene")).toHaveClass(/is-ready/);
  await page.getByRole("button", { name: "Pause motion" }).click();
  await expect(page.locator(".site")).toHaveAttribute("data-paused", "true");
  const scene = page.locator(".monogram-scene__canvas");
  await page.waitForTimeout(100);
  const first = await scene.screenshot();
  await page.waitForTimeout(180);
  expect(await scene.screenshot()).toEqual(first);
  await page.getByRole("button", { name: "Play motion" }).click();
  await expect(page.locator(".site")).toHaveAttribute("data-paused", "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Reduced motion" }),
  ).toBeDisabled();
  await expect(page.locator(".site")).toHaveAttribute("data-paused", "true");
  await page.getByRole("button", { name: "Rotate sculpture left" }).click();
});

test("a browser without WebGL still displays the artwork, content, navigation, and contact", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith("webgl") || type === "experimental-webgl")
        return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".monogram-fallback")).toHaveCSS("opacity", "1");
  await expect(
    page.getByRole("button", { name: "Rotate sculpture left" }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Explore my work", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Built with intent." }),
  ).toBeInViewport();
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("link", { name: "L.ladipo@hotmail.com", exact: true }),
  ).toBeVisible();
});

test("a lost GPU context shows the fallback and can restore the sculpture", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".monogram-scene")).toHaveClass(/is-ready/);
  await page.locator("canvas").evaluate((canvas) => {
    window.testContext = canvas
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context");
    window.testContext.loseContext();
  });
  await expect(page.locator(".monogram-scene")).not.toHaveClass(/is-ready/);
  await expect(page.locator(".monogram-fallback")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => window.testContext.restoreContext());
  await expect(page.locator(".monogram-scene")).toHaveClass(/is-ready/);
  await expect(
    page.getByRole("button", { name: "Rotate sculpture right" }),
  ).toBeVisible();
});

test("an interrupted app download keeps the HTML profile and contact links visible", async ({
  page,
}) => {
  await page.route("**/assets/index-*.js", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Thoughtful software. A curious mind." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read my résumé" }),
  ).toHaveAttribute("href", "/Leo-Ladipo-Resume.pdf");
  await expect(page.getByRole("link", { name: "Email Leo" })).toHaveAttribute(
    "href",
    "mailto:L.ladipo@hotmail.com",
  );
});

test("a React rendering failure shows recovery links instead of a blank page", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.matchMedia = () => {
      throw new Error("Simulated browser API failure");
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Let’s try that again." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reload portfolio" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read my résumé" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Email Leo" })).toBeVisible();
});
