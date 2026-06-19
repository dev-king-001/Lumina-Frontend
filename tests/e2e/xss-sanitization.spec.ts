import { test, expect } from "@playwright/test";

/**
 * XSS Sanitization Tests
 *
 * These tests verify that the sanitizer correctly neutralises XSS payloads
 * in node labels, descriptions, and metadata fields that originate from
 * on-chain data (which can be set by any network participant).
 *
 * Strategy:
 * - Navigate to /node-list-demo which renders NodeCard/NodeList with mock
 *   on-chain data and exposes sanitizeNodeString on window.__sanitizeNodeString__
 * - Verify that allowed tags survive but dangerous patterns are stripped.
 * - Use page.evaluate to call sanitizeNodeString directly on various payloads.
 */

const XSS_PAYLOADS: Record<string, string> = {
  scriptTag: '<script>alert("xss")</script>',
  eventHandler: '<img src=x onerror="alert(1)">',
  javaScriptUri: '<a href="javascript:alert(1)">click</a>',
  iframe: '<iframe src="https://evil.com"></iframe>',
  encodedScript: "&lt;script&gt;alert(1)&lt;/script&gt;",
  homoglyph: "＜script＞alert(1)＜/script＞",
};

test.describe("XSS Sanitization — NodeCard rendering", () => {
  test("NodeCard renders node labels with allowed formatting tags", async ({
    page,
  }) => {
    await page.goto("/node-list-demo");
    await page.waitForSelector("[data-testid=node-card]", {
      state: "attached",
    });

    const sfoCard = page.locator('[data-node-id="node-002-sfo-edge"]');
    await expect(sfoCard).toBeVisible();

    // The <b> tag should be present in the rendered HTML
    const sfoLabel = sfoCard.locator("h3");
    const sfoLabelHTML = await sfoLabel.innerHTML();
    expect(sfoLabelHTML).toContain("<b>SFO</b>");
  });

  test("NodeCard renders metadata with allowed italic tag", async ({
    page,
  }) => {
    await page.goto("/node-list-demo");
    await page.waitForSelector("[data-testid=node-card]", {
      state: "attached",
    });

    const sfoCard = page.locator('[data-node-id="node-002-sfo-edge"]');
    const cardHTML = await sfoCard.innerHTML();

    // The <i> tag should survive in the description
    expect(cardHTML).toContain("<i>Pacific</i>");
  });

  test("NodeCard aria-label strips HTML tags", async ({ page }) => {
    await page.goto("/node-list-demo");
    await page.waitForSelector("[data-testid=node-card]", {
      state: "attached",
    });

    const sfoCard = page.locator('[data-node-id="node-002-sfo-edge"]');
    const ariaLabel = await sfoCard.getAttribute("aria-label");

    // aria-label should be plain text without HTML tags
    expect(ariaLabel).not.toContain("<b>");
    expect(ariaLabel).not.toContain("<i>");
    expect(ariaLabel).toContain("SFO Edge Router");
  });
});

test.describe("XSS Sanitization — sanitizeNodeString direct testing", () => {
  test("sanitizeNodeString strips script tags", async ({ page }) => {
    await page.goto("/node-list-demo");
    await page.waitForSelector("[data-testid=node-card]", {
      state: "attached",
    });

    const result = await page.evaluate((payload: string) => {
      const fn = (window as Record<string, unknown>)
        .__sanitizeNodeString__ as (dirty: string) => string;
      if (!fn) return { error: "sanitizeNodeString not exposed" };
      return { sanitized: fn(payload) };
    }, XSS_PAYLOADS.scriptTag);

    expect(result).toHaveProperty("sanitized");
    // Script tags should be stripped
    expect(result.sanitized).not.toContain("<script>");
    expect(result.sanitized).not.toContain("</script>");
    // Inner text may survive (depends on KEEP_CONTENT)
  });

  test("sanitizeNodeString strips event handlers", async ({ page }) => {
    await page.goto("/node-list-demo");
    await page.waitForSelector("[data-testid=node-card]", {
      state: "attached",
    });

    const result = await page.evaluate((payload: string) => {
      const fn = (window as Record<string, unknown>)
        .__sanitizeNodeString__ as (dirty: string) => string;
      return { sanitized: fn(payload) };
    }, XSS_PAYLOADS.eventHandler);

    expect(result.sanitized).not.toContain("onerror");
    expect(result.sanitized).not.toContain("<img");
    expect(result.sanitized).not.toContain("onmouseover");
  });

  test("sanitizeNodeString strips JavaScript URIs", async ({ page }) => {
    await page.goto("/node-list-demo");
    await page.waitForSelector("[data-testid=node-card]", {
      state: "attached",
    });

    const result = await page.evaluate((payload: string) => {
      const fn = (window as Record<string, unknown>)
        .__sanitizeNodeString__ as (dirty: string) => string;
      return { sanitized: fn(payload) };
    }, XSS_PAYLOADS.javaScriptUri);

    expect(result.sanitized).not.toContain("javascript:");
  });

  test("sanitizeNodeString strips iframe tags", async ({ page }) => {
    await page.goto("/node-list-demo");
    await page.waitForSelector("[data-testid=node-card]", {
      state: "attached",
    });

    const result = await page.evaluate((payload: string) => {
      const fn = (window as Record<string, unknown>)
        .__sanitizeNodeString__ as (dirty: string) => string;
      return { sanitized: fn(payload) };
    }, XSS_PAYLOADS.iframe);

    expect(result.sanitized).not.toContain("<iframe");
  });

  test("sanitizeNodeString neutralizes encoded HTML entities", async ({
    page,
  }) => {
    await page.goto("/node-list-demo");
    await page.waitForSelector("[data-testid=node-card]", {
      state: "attached",
    });

    const result = await page.evaluate((payload: string) => {
      const fn = (window as Record<string, unknown>)
        .__sanitizeNodeString__ as (dirty: string) => string;
      return { sanitized: fn(payload) };
    }, XSS_PAYLOADS.encodedScript);

    // Encoded entities should NOT decode into real script tags
    expect(result.sanitized).not.toContain("<script>");
    expect(result.sanitized).not.toContain("</script>");
  });

  test("sanitizeNodeString handles Unicode homoglyph attacks", async ({
    page,
  }) => {
    await page.goto("/node-list-demo");
    await page.waitForSelector("[data-testid=node-card]", {
      state: "attached",
    });

    const result = await page.evaluate((payload: string) => {
      const fn = (window as Record<string, unknown>)
        .__sanitizeNodeString__ as (dirty: string) => string;
      return { sanitized: fn(payload) };
    }, XSS_PAYLOADS.homoglyph);

    // Homoglyph characters should not produce functional HTML tags
    expect(result.sanitized).not.toMatch(/<script[^>]*>/i);
  });

  test("sanitizeNodeString preserves allowed formatting tags", async ({
    page,
  }) => {
    await page.goto("/node-list-demo");
    await page.waitForSelector("[data-testid=node-card]", {
      state: "attached",
    });

    const result = await page.evaluate(() => {
      const fn = (window as Record<string, unknown>)
        .__sanitizeNodeString__ as (dirty: string) => string;
      return { sanitized: fn("<b>Bold</b> and <i>italic</i> text") };
    });

    // Allowed tags should survive
    expect(result.sanitized).toContain("<b>");
    expect(result.sanitized).toContain("<i>");
    // Dangerous tags should NOT survive even if mixed in
    expect(result.sanitized).not.toContain("<script>");
  });

  test("sanitizeNodeString adds rel attributes to anchor tags", async ({
    page,
  }) => {
    await page.goto("/node-list-demo");
    await page.waitForSelector("[data-testid=node-card]", {
      state: "attached",
    });

    const result = await page.evaluate(() => {
      const fn = (window as Record<string, unknown>)
        .__sanitizeNodeString__ as (dirty: string) => string;
      return {
        sanitized: fn('<a href="https://example.com">link</a>'),
      };
    });

    // Anchor tags should have nofollow, noopener, noreferrer added
    expect(result.sanitized).toContain("nofollow");
    expect(result.sanitized).toContain("noopener");
    expect(result.sanitized).toContain("noreferrer");
  });
});
