import { DecodedEvent } from "../utils/eventDecoder";

export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  actionUrl?: string;
  eventId: string;
  timestamp: number;
  dismissed: boolean;
}

const EVENT_ALERT_MAP: Record<string, {
  severity: AlertSeverity;
  title: (data: Record<string, unknown>) => string;
  description: (data: Record<string, unknown>) => string;
  actionUrl?: string;
}> = {
  bandwidth_capacity: {
    severity: "warning",
    title: () => "Node Bandwidth Capacity Alert",
    description: (data) => `Node bandwidth capacity reached ${data.percentage ?? "?"}%.`,
    actionUrl: "/dashboard/nodes",
  },
  escrow_balance_low: {
    severity: "critical",
    title: () => "Escrow Balance Low",
    description: (data) => `Escrow balance low: ${data.amount ?? "?"} ${data.asset ?? "XLM"} remaining.`,
    actionUrl: "/dashboard/escrow",
  },
  token_streamed: {
    severity: "info",
    title: () => "Token Stream Completed",
    description: (data) => `${data.amount ?? "?"} tokens streamed to ${data.recipient ?? "unknown"}.`,
  },
  vault_unlocked: {
    severity: "info",
    title: () => "Vault Unlocked",
    description: (data) => `${data.amount ?? "?"} tokens released to ${data.beneficiary ?? "unknown"}.`,
  },
};

const DEDUP_WINDOW_MS = 10_000;
const dedupCache = new Map<string, number>();

function buildEventId(event: DecodedEvent): string {
  return `${event.contractAddress}:${event.eventName}:${JSON.stringify(event.data)}`;
}

function isDuplicate(eventId: string): boolean {
  const lastSeen = dedupCache.get(eventId);
  const now = Date.now();
  if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) return true;
  dedupCache.set(eventId, now);
  return false;
}

export function processEvent(event: DecodedEvent): Alert | null {
  const eventId = buildEventId(event);
  if (isDuplicate(eventId)) return null;

  if (event.isUnknown) {
    return {
      id: crypto.randomUUID(),
      severity: "warning",
      title: "Unknown Event",
      description: `Unknown event received: ${event.rawTopics[0] ?? event.rawData}`,
      eventId,
      timestamp: Date.now(),
      dismissed: false,
    };
  }

  const template = EVENT_ALERT_MAP[event.eventName];
  if (!template) return null;

  return {
    id: crypto.randomUUID(),
    severity: template.severity,
    title: template.title(event.data),
    description: template.description(event.data),
    actionUrl: template.actionUrl,
    eventId,
    timestamp: Date.now(),
    dismissed: false,
  };
}