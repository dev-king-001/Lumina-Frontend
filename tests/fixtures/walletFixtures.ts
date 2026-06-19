export interface WalletFixture {
  label: string;
  publicKey: string;
  balances: Record<string, string>;
}

export const WALLET_FIXTURES: Record<string, WalletFixture> = {
  alice: {
    label: "Alice",
    publicKey: "GALICEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXMOCK",
    balances: {
      XLM: "10000.5000000",
      USDC: "5000.0000000",
      LUM: "25000.0000000",
    },
  },
  bob: {
    label: "Bob",
    publicKey: "GBOBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXMOCK",
    balances: {
      XLM: "5000.2500000",
      USDC: "2500.0000000",
      LUM: "10000.0000000",
    },
  },
  carol: {
    label: "Carol",
    publicKey: "GCAROLXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXMOCK",
    balances: {
      XLM: "25000.7500000",
      ETH: "100.0000000",
      LUM: "50000.0000000",
    },
  },
};

export const PRE_FUNDED_WALLETS = Object.values(WALLET_FIXTURES);
