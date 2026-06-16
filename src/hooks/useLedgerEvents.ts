"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWalletQueryKey } from "@/src/hooks/useWalletIdentity";
import {
  type DecodedError,
  type ErrorDecodeContext,
  resolveError,
} from "@/src/utils/errorDecoder";
import { reportUnknownStellarError } from "@/src/utils/errorTelemetry";

export function useLedgerEvents(defaultContext: ErrorDecodeContext = {}) {
  const [eventError, setEventError] = useState<DecodedError | null>(null);

  const walletQueryKey = useWalletQueryKey(["ledger", "events"]);

  const queryKey = useMemo(() => walletQueryKey, [walletQueryKey]);

  const { data: events } = useQuery({
    queryKey,
    queryFn: async () => {
      return [] as Array<{ id: string; type: string; data: unknown }>;
    },
    enabled: !walletQueryKey[0]?.startsWith("wallet-blocked"),
    staleTime: 15_000,
  });

  useEffect(() => {
    return () => {
      setEventError(null);
    };
  }, [queryKey]);

  const decodeLedgerEventError = useCallback(
    (error: unknown, context: ErrorDecodeContext = {}) => {
      const decodedError = resolveError(
        error,
        { ...defaultContext, ...context },
        reportUnknownStellarError,
      );

      setEventError(decodedError);
      return decodedError;
    },
    [defaultContext],
  );

  return {
    events,
    eventError,
    clearEventError: () => setEventError(null),
    decodeLedgerEventError,
  };
}
