"use client";

import { useAlertStore } from "../../hooks/useAlertStore";
import { useLedgerEvents } from "../../hooks/useLedgerEvents";
import { Alert, AlertSeverity } from "../../services/alertPipeline";

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critical: "border-red-500 bg-red-50 dark:bg-red-950",
  warning: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
  info: "border-blue-500 bg-blue-50 dark:bg-blue-950",
};

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  critical: "bg-red-500 text-white",
  warning: "bg-yellow-500 text-black",
  info: "bg-blue-500 text-white",
};

function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  return (
    <div className={`border-l-4 rounded-md p-4 mb-3 flex justify-between items-start gap-4 ${SEVERITY_STYLES[alert.severity]}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${SEVERITY_BADGE[alert.severity]}`}>
            {alert.severity}
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{alert.title}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{alert.description}</p>
        {alert.actionUrl && (
          <a href={alert.actionUrl} className="text-xs text-blue-600 dark:text-blue-400 mt-1 inline-block hover:underline">
            View details →
          </a>
        )}
        <p className="text-xs text-gray-400 mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
      </div>
      <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none" aria-label="Dismiss">
        x
      </button>
    </div>
  );
}

export default function AlertFeed() {
  useLedgerEvents();
  const { alerts, dismissAlert, clearAll } = useAlertStore();
  const visible = alerts.filter((a) => !a.dismissed);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Live Alerts
          {visible.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500">({visible.length})</span>}
        </h2>
        {visible.length > 0 && (
          <button onClick={clearAll} className="text-sm text-gray-500 hover:text-red-500 dark:hover:text-red-400">
            Clear all
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No alerts - listening for events...</p>
      ) : (
        <div>{visible.map((alert) => <AlertCard key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />)}</div>
      )}
    </div>
  );
}