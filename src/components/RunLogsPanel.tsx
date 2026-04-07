import { useState } from "react";
import type { RunLog, RunStatus, SavedAction } from "@/lib/types";
import { clearRunLogs, deleteRunLog } from "@/lib/storage";
import { formatDateTime, parseErrorMessage } from "@/lib/utils";

type Props = { logs: RunLog[]; actions: SavedAction[]; onClear: () => void; onDelete: () => void };
type Filter = "all" | RunStatus;

function LogCard({ log, actionName, onDelete }: { log: RunLog; actionName: string; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-atom-border bg-atom-bg px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span
          className={`size-2 rounded-full shrink-0 ${log.status === "success" ? "bg-atom-green" : "bg-atom-red"}`}
        />
        <span className="text-sm text-atom-fg truncate flex-1">{actionName}</span>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 text-atom-fg-muted hover:text-atom-fg transition leading-none"
        >
          ×
        </button>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-atom-fg-muted">
        <span>{formatDateTime(log.startedAt)}</span>
        {log.url && (
          <a
            href={log.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-atom-blue hover:underline underline-offset-2 transition"
          >
            Open
          </a>
        )}
      </div>
      {log.error && (
        <p className="mt-1 text-xs text-atom-red break-words line-clamp-3">{parseErrorMessage(log.error)}</p>
      )}
    </div>
  );
}

export default function RunLogsPanel({ logs, actions, onClear, onDelete }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;
  const filtered = filter === "all" ? logs : logs.filter((l) => l.status === filter);

  function getActionName(id: string) {
    return actions.find((a) => a.id === id)?.name ?? "Deleted action";
  }

  return (
    <div className="rounded-2xl border border-atom-border bg-atom-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-atom-fg">Run logs</h2>
          {logs.length > 0 && (
            <span className="rounded border border-atom-border px-1.5 py-0.5 text-xs text-atom-fg-muted">
              {logs.length}
            </span>
          )}
        </div>
        {logs.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clearRunLogs();
              onClear();
            }}
            className="text-xs text-atom-fg-muted hover:text-atom-fg transition"
          >
            Clear all
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-atom-fg-muted">No runs yet.</p>
      ) : (
        <>
          <div className="flex gap-1.5">
            {(
              [
                ["all", `All ${logs.length}`],
                ["success", `✓ ${successCount}`],
                ["error", `✗ ${errorCount}`],
              ] as [Filter, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFilter(val)}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  filter === val
                    ? val === "error"
                      ? "border-atom-red/50 bg-atom-red/10 text-atom-red"
                      : val === "success"
                        ? "border-atom-green/50 bg-atom-green/10 text-atom-green"
                        : "border-atom-blue/50 bg-atom-blue/10 text-atom-blue"
                    : "border-atom-border text-atom-fg-muted hover:text-atom-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((log) => (
              <LogCard
                key={log.id}
                log={log}
                actionName={getActionName(log.actionId)}
                onDelete={() => {
                  deleteRunLog(log.id);
                  onDelete();
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
