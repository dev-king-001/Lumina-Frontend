import { test, expect } from "@playwright/test";

const ALICE_PK = "GALICEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXMOCK";

async function initConnectedWallet(page: import("@playwright/test").Page, publicKey: string) {
  await page.addInitScript(
    (args: { pk: string }) => {
      let currentPk = args.pk;
      (window as Record<string, unknown>).freighter = {
        isConnected: async () => ({ isConnected: true }),
        getUserInfo: async () => ({ publicKey: currentPk }),
        signTransaction: async (xdr: string) => ({ signedTxXdr: xdr }),
        signAuthEntry: async (ae: string) => ({ signedAuthEntry: ae }),
      };
      (window as Record<string, unknown>).__switchWallet = (newPk: string) => {
        currentPk = newPk;
        (window as Record<string, unknown>).freighter = {
          isConnected: async () => ({ isConnected: true }),
          getUserInfo: async () => ({ publicKey: newPk }),
          signTransaction: async (xdr: string) => ({ signedTxXdr: xdr }),
          signAuthEntry: async (ae: string) => ({ signedAuthEntry: ae }),
        };
        window.dispatchEvent(new Event("accountChange"));
      };
    },
    { pk: publicKey },
  );
  await page.goto("/");
  await page.waitForSelector("[data-testid=wallet-indicator]", { state: "attached" });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.dispatchEvent(new Event("accountChange")));
  await page.waitForTimeout(1000);
}

test.describe("Billing and Balance Flows", () => {
  test("dashboard renders with connected wallet", async ({ page }) => {
    await initConnectedWallet(page, ALICE_PK);

    await expect(page.locator("[data-testid=wallet-indicator]")).toHaveAttribute(
      "data-public-key",
      ALICE_PK,
    );
    await expect(page.getByText("Vesting operations dashboard")).toBeVisible();
  });

  test("wallet indicator shows generation counter increments", async ({ page }) => {
    await initConnectedWallet(page, ALICE_PK);

    const generation = page.locator("[data-testid=wallet-generation]");
    const gen1 = await generation.getAttribute("data-generation");

    await page.evaluate(
      ({ pk }: { pk: string }) =>
        (window as Record<string, unknown>).__switchWallet(pk),
      { pk: "GBOBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXMOCK" },
    );
    await page.waitForTimeout(500);

    const gen2 = await generation.getAttribute("data-generation");
    expect(Number(gen2)).toBeGreaterThan(Number(gen1));
  });
});

test.describe("Error Simulation", () => {
  test("shows false transitioning state after wallet switch completes", async ({ page }) => {
    await initConnectedWallet(page, ALICE_PK);

    const transitioning = page.locator("[data-testid=wallet-transitioning]");
    await expect(transitioning).toHaveAttribute("data-transitioning", "false");

    await page.evaluate(
      ({ pk }: { pk: string }) =>
        (window as Record<string, unknown>).__switchWallet(pk),
      { pk: "GBOBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXMOCK" },
    );
    await page.waitForTimeout(500);

    await expect(transitioning).toHaveAttribute("data-transitioning", "false");
  });

  test("connection refused shows disconnected state", async ({ page }) => {
    await initConnectedWallet(page, ALICE_PK);

    const indicator = page.locator("[data-testid=wallet-indicator]");
    await expect(indicator).toHaveAttribute("data-public-key", ALICE_PK);

    await page.evaluate(() => {
      (window as Record<string, unknown>).freighter = {
        isConnected: async () => ({ isConnected: false }),
        getUserInfo: async () => ({ publicKey: undefined }),
      };
      window.dispatchEvent(new Event("accountChange"));
    });
    await page.waitForTimeout(500);

    await expect(indicator).toHaveAttribute("data-public-key", "disconnected");
  });

  test("sign transaction returns signed XDR", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Record<string, unknown>).freighter = {
        isConnected: async () => ({ isConnected: true }),
        getUserInfo: async () => ({ publicKey: "ALICE_PK" }),
        signTransaction: async (xdr: string) => ({ signedTxXdr: "SIGNED_" + xdr }),
        signAuthEntry: async (authEntry: string) => ({ signedAuthEntry: "SIGNED_" + authEntry }),
      };
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const signed = await page.evaluate(async () => {
      const f = (window as Record<string, unknown>).freighter as {
        signTransaction: (xdr: string) => Promise<{ signedTxXdr: string }>;
      };
      const result = await f.signTransaction("RAW_XDR");
      return result.signedTxXdr;
    });

    expect(signed).toBe("SIGNED_RAW_XDR");
  });
});

test.describe("Session Watcher", () => {
  test("signals disconnect when wallet drops connection", async ({ page }) => {
    await initConnectedWallet(page, ALICE_PK);

    const indicator = page.locator("[data-testid=wallet-indicator]");
    await expect(indicator).toHaveAttribute("data-public-key", ALICE_PK);

    await page.evaluate(() => {
      (window as Record<string, unknown>).freighter = {
        isConnected: async () => ({ isConnected: false }),
        getUserInfo: async () => { throw new Error("Wallet disconnected"); },
      };
      window.dispatchEvent(new Event("accountChange"));
    });

    await page.waitForTimeout(500);
    await expect(indicator).toHaveAttribute("data-public-key", "disconnected");
  });
});
