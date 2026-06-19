import { test, expect } from "@playwright/test";

const ALICE_PK = "GALICEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXMOCK";
const BOB_PK = "GBOBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXMOCK";

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

test.describe("Wallet Connection Flows", () => {
  test("connect wallet displays public key", async ({ page }) => {
    await initConnectedWallet(page, ALICE_PK);
    const indicator = page.locator("[data-testid=wallet-indicator]");
    await expect(indicator).toHaveAttribute("data-public-key", ALICE_PK);
  });

  test("disconnect clears public key", async ({ page }) => {
    await initConnectedWallet(page, ALICE_PK);

    const indicator = page.locator("[data-testid=wallet-indicator]");
    await expect(indicator).toHaveAttribute("data-public-key", ALICE_PK);

    await page.evaluate(() => {
      (window as Record<string, unknown>).freighter = {
        isConnected: async () => ({ isConnected: false }),
        getUserInfo: async () => ({ publicKey: undefined }),
        signTransaction: async (xdr: string) => ({ signedTxXdr: xdr }),
        signAuthEntry: async (ae: string) => ({ signedAuthEntry: ae }),
      };
      window.dispatchEvent(new Event("accountChange"));
    });
    await page.waitForTimeout(500);

    await expect(indicator).toHaveAttribute("data-public-key", "disconnected");
  });

  test("switch accounts updates displayed key", async ({ page }) => {
    await initConnectedWallet(page, ALICE_PK);

    const indicator = page.locator("[data-testid=wallet-indicator]");
    await expect(indicator).toHaveAttribute("data-public-key", ALICE_PK);

    await page.evaluate(
      ({ pk }: { pk: string }) =>
        (window as Record<string, unknown>).__switchWallet(pk),
      { pk: BOB_PK },
    );
    await page.waitForTimeout(500);

    await expect(indicator).toHaveAttribute("data-public-key", BOB_PK);
  });

  test("re-connect after disconnect restores key", async ({ page }) => {
    await initConnectedWallet(page, ALICE_PK);

    const indicator = page.locator("[data-testid=wallet-indicator]");
    await expect(indicator).toHaveAttribute("data-public-key", ALICE_PK);

    await page.evaluate(() => {
      (window as Record<string, unknown>).freighter = {
        isConnected: async () => ({ isConnected: false }),
        getUserInfo: async () => ({ publicKey: undefined }),
        signTransaction: async (xdr: string) => ({ signedTxXdr: xdr }),
        signAuthEntry: async (ae: string) => ({ signedAuthEntry: ae }),
      };
      window.dispatchEvent(new Event("accountChange"));
    });
    await page.waitForTimeout(500);
    await expect(indicator).toHaveAttribute("data-public-key", "disconnected");

    await page.evaluate(
      ({ pk }: { pk: string }) =>
        (window as Record<string, unknown>).__switchWallet(pk),
      { pk: BOB_PK },
    );
    await page.waitForTimeout(500);
    await expect(indicator).toHaveAttribute("data-public-key", BOB_PK);
  });

  test("generation counter increments on each account change", async ({ page }) => {
    await initConnectedWallet(page, ALICE_PK);

    const generation = page.locator("[data-testid=wallet-generation]");
    const gen1 = await generation.getAttribute("data-generation");

    await page.evaluate(
      ({ pk }: { pk: string }) =>
        (window as Record<string, unknown>).__switchWallet(pk),
      { pk: BOB_PK },
    );
    await page.waitForTimeout(500);

    const gen2 = await generation.getAttribute("data-generation");
    expect(Number(gen2)).toBeGreaterThan(Number(gen1));
  });
});

test.describe("Wallet Error States", () => {
  test("shows disconnected when connection refused", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Record<string, unknown>).freighter = {
        isConnected: async () => ({ isConnected: true }),
        getUserInfo: async () => ({ publicKey: undefined }),
      };
    });
    await page.goto("/");
    await page.waitForSelector("[data-testid=wallet-indicator]", { state: "attached" });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.dispatchEvent(new Event("accountChange")));
    await page.waitForTimeout(500);

    const indicator = page.locator("[data-testid=wallet-indicator]");
    await expect(indicator).toHaveAttribute("data-public-key", "disconnected");
  });

  test("handles getUserInfo rejection gracefully", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Record<string, unknown>).freighter = {
        isConnected: async () => ({ isConnected: true }),
        getUserInfo: async () => { throw new Error("Mock: connection refused"); },
        signTransaction: async (xdr: string) => ({ signedTxXdr: xdr }),
        signAuthEntry: async (ae: string) => ({ signedAuthEntry: ae }),
      };
    });
    await page.goto("/");
    await page.waitForSelector("[data-testid=wallet-indicator]", { state: "attached" });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.dispatchEvent(new Event("accountChange")));
    await page.waitForTimeout(500);

    const indicator = page.locator("[data-testid=wallet-indicator]");
    await expect(indicator).toHaveAttribute("data-public-key", "disconnected");
  });
});
