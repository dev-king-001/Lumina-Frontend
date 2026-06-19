export interface MockWalletState {
  publicKey: string | null;
  isConnected: boolean;
  network: string;
  networkPassphrase: string;
}

export interface MockFreighterConfig {
  initialState?: Partial<MockWalletState>;
  networkDelayMs?: number;
  failOn?: {
    isConnected?: boolean;
    getUserInfo?: boolean;
    signTransaction?: boolean;
    signAuthEntry?: boolean;
  };
}

type MockFreighterApi = NonNullable<Window["freighter"]> & {
  signTransaction: (xdr: string) => Promise<{ signedTxXdr: string }>;
  signAuthEntry: (authEntry: string) => Promise<{ signedAuthEntry: string }>;
};

export function createMockFreighter(config?: MockFreighterConfig): MockFreighterApi {
  const state: MockWalletState = {
    publicKey: "GA4ZZZEXAMPLEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXMOCK",
    isConnected: true,
    network: "TESTNET",
    networkPassphrase: "Test SDF Network ; September 2015",
    ...config?.initialState,
  };

  const delay = config?.networkDelayMs ?? 0;
  const fail = config?.failOn ?? {};

  function maybeReject(action: string): Promise<never> | null {
    if (fail[action as keyof typeof fail]) {
      return Promise.reject(new Error(`${action} rejected by mock config`));
    }
    return null;
  }

  function applyDelay<T>(result: T): Promise<T> {
    if (delay > 0) {
      return new Promise((resolve) => setTimeout(() => resolve(result), delay));
    }
    return Promise.resolve(result);
  }

  return {
    isConnected: async () => {
      const err = maybeReject("isConnected");
      if (err) return err;
      return applyDelay({ isConnected: state.isConnected });
    },

    getUserInfo: async () => {
      const err = maybeReject("getUserInfo");
      if (err) return err;
      return applyDelay({
        publicKey: state.publicKey ?? undefined,
      });
    },

    signTransaction: async (xdr: string) => {
      const err = maybeReject("signTransaction");
      if (err) return err;
      return applyDelay({
        signedTxXdr: xdr,
      });
    },

    signAuthEntry: async (authEntry: string) => {
      const err = maybeReject("signAuthEntry");
      if (err) return err;
      return applyDelay({
        signedAuthEntry: authEntry,
      });
    },
  };
}

export function installMockFreighter(
  windowObj: Window,
  config?: MockFreighterConfig,
): void {
  const mock = createMockFreighter(config);
  (windowObj as unknown as Record<string, unknown>).freighter = mock;
}
