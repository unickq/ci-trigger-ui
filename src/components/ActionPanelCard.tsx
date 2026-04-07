import { useState } from "react";
import type { ProviderConfig, RunLog, SavedAction } from "@/lib/types";
import { getProviderDef } from "@/lib/providers";
import { appendRunLog, updateRunLogUrl } from "@/lib/storage";
import { createId, parseErrorMessage } from "@/lib/utils";
import Modal from "@/components/Modal";
import JsonEditor from "@/components/JsonEditor";

type DragHandle = { attributes: object; listeners: object | undefined };

type Props = {
  action: SavedAction;
  providers: ProviderConfig[];
  lastRun?: RunLog;
  dragHandle?: DragHandle;
  onEdit: (action: SavedAction) => void;
  onFork: (action: SavedAction) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onRunComplete?: () => void;
};

function ProviderIcon({ type }: { type: string }) {
  let iconId: string | null = null;
  try {
    iconId = getProviderDef(type as never).iconId;
  } catch {
    return null;
  }
  return (
    <svg className="size-4 shrink-0 text-atom-fg-sub" aria-hidden>
      <use href={`/icons.svg#${iconId}`} />
    </svg>
  );
}

async function runAction(
  action: SavedAction,
  provider: ProviderConfig,
): Promise<{ res: Response; responseJson: unknown }> {
  const def = getProviderDef(provider.type);
  const { url, init } = def.buildRequest(action, provider);
  const res = await fetch(url, init);
  const responseJson = await res.json().catch(() => res.status);
  return { res, responseJson };
}

export default function ActionPanelCard({
  action,
  providers,
  lastRun,
  dragHandle,
  onEdit,
  onFork,
  onDelete,
  onPin,
  onRunComplete,
}: Props) {
  const provider = providers.find((p) => p.id === action.providerId);

  const [showCurl, setShowCurl] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<"success" | "error" | null>(null);
  const [runError, setRunError] = useState("");
  const [jobUrl, setJobUrl] = useState<string | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);
  const [runParamsJson, setRunParamsJson] = useState("");

  function openRunModal() {
    const params = cardInfo?.params ?? {};
    setRunParamsJson(JSON.stringify(params, null, 2));
    setShowRunModal(true);
    setShowMenu(false);
  }

  function handleRunWithParams(e: React.FormEvent) {
    e.preventDefault();
    let params: Record<string, unknown> = {};
    try {
      params = JSON.parse(runParamsJson);
    } catch {
      return;
    }
    const def = provider ? getProviderDef(provider.type) : null;
    const overriddenAction = def ? { ...action, config: def.mergeParams(action.config, params) } : action;
    setShowRunModal(false);
    handleRun(overriddenAction);
  }

  async function handleRun(overrideAction?: SavedAction) {
    if (!provider) return;
    const actionToRun = overrideAction ?? action;
    setRunning(true);
    setRunStatus(null);
    setRunError("");
    setJobUrl(null);
    const startedAt = new Date().toISOString();
    const logId = createId();
    let status: "success" | "error" = "success";
    let errorMsg = "",
      url: string | null = null;
    let responsePayload: unknown;

    try {
      const def = getProviderDef(provider.type);
      const { res, responseJson } = await runAction(actionToRun, provider);
      responsePayload = responseJson;
      if (res.ok || res.status === 204) {
        url = def.buildResultUrl(actionToRun, responseJson);
        setJobUrl(url);
        setRunStatus("success");
        if (def.fetchRunUrl) {
          def.fetchRunUrl(actionToRun, provider, startedAt).then((runUrl) => {
            if (runUrl) {
              setJobUrl(runUrl);
              updateRunLogUrl(logId, runUrl);
              onRunComplete?.();
            }
          });
        }
      } else {
        const text = typeof responseJson === "string" ? responseJson : JSON.stringify(responseJson) || res.statusText;
        status = "error";
        errorMsg = `${res.status}: ${text}`;
        setRunStatus("error");
        setRunError(errorMsg);
      }
    } catch (e) {
      status = "error";
      errorMsg = e instanceof Error ? e.message : "Unknown error";
      setRunStatus("error");
      setRunError(errorMsg);
    } finally {
      appendRunLog({
        id: logId,
        actionId: action.id,
        startedAt,
        status,
        requestPayload: actionToRun.config,
        responsePayload,
        error: errorMsg || undefined,
        url: url ?? undefined,
      });
      onRunComplete?.();
      setRunning(false);
    }
  }

  const curl = provider ? getProviderDef(provider.type).buildCurl(action, provider) : "";
  const cardInfo = provider ? getProviderDef(provider.type).buildCardInfo(action.config) : null;
  const linkCls = "text-atom-blue hover:underline underline-offset-2 transition";

  return (
    <div className="border border-atom-border rounded-xl p-3 space-y-2 bg-atom-surface">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {dragHandle && (
            <button
              type="button"
              className="shrink-0 cursor-grab active:cursor-grabbing text-atom-fg-muted hover:text-atom-fg-sub transition touch-none"
              {...dragHandle.attributes}
              {...dragHandle.listeners}
              aria-label="Drag to reorder"
            >
              <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                <circle cx="2" cy="2" r="1.5" />
                <circle cx="8" cy="2" r="1.5" />
                <circle cx="2" cy="7" r="1.5" />
                <circle cx="8" cy="7" r="1.5" />
                <circle cx="2" cy="12" r="1.5" />
                <circle cx="8" cy="12" r="1.5" />
              </svg>
            </button>
          )}
          {provider && (
            <span title={provider.name}>
              <ProviderIcon type={provider.type} />
            </span>
          )}
          <div className="text-sm font-medium text-atom-fg truncate">{action.name}</div>
          <button
            type="button"
            onClick={() => onPin(action.id)}
            title={action.pinned ? "Unpin" : "Pin"}
            className={`shrink-0 transition ${action.pinned ? "text-atom-yellow" : "text-atom-fg-muted hover:text-atom-yellow"}`}
          >
            {action.pinned ? "★" : "☆"}
          </button>
          {lastRun && (
            <span
              title={lastRun.status === "success" ? "Last run succeeded" : `Last run failed: ${lastRun.error ?? ""}`}
              className={`size-2 rounded-full shrink-0 ${lastRun.status === "success" ? "bg-atom-green" : "bg-atom-red"}`}
            />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowMenu((v) => !v);
                setConfirmDelete(false);
              }}
              className="rounded-lg border border-atom-border px-2 py-1 text-xs text-atom-fg-muted transition hover:border-atom-blue hover:text-atom-blue"
            >
              ···
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => {
                    setShowMenu(false);
                    setConfirmDelete(false);
                  }}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-atom-border bg-atom-raised py-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCurl((v) => !v);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-atom-fg-sub hover:bg-atom-border hover:text-atom-fg"
                  >
                    {showCurl ? "Hide curl" : "Show curl"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFork(action);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-atom-fg-sub hover:bg-atom-border hover:text-atom-fg"
                  >
                    Fork
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onEdit(action);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-atom-fg-sub hover:bg-atom-border hover:text-atom-fg"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={openRunModal}
                    className="w-full px-3 py-1.5 text-left text-xs text-atom-fg-sub hover:bg-atom-border hover:text-atom-fg"
                  >
                    Run with params…
                  </button>
                  <div className="my-1 border-t border-atom-border" />
                  {confirmDelete ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5">
                      <span className="text-xs text-atom-red">Sure?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(action.id);
                          setShowMenu(false);
                        }}
                        className="text-xs text-atom-red underline underline-offset-2 hover:brightness-125"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs text-atom-fg-muted hover:text-atom-fg"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="w-full px-3 py-1.5 text-left text-xs text-atom-red hover:bg-atom-border"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleRun()}
            disabled={!provider || running}
            className="rounded-lg border border-atom-blue/50 bg-atom-blue/10 px-2.5 py-1 text-xs font-medium text-atom-blue transition hover:bg-atom-blue/20 disabled:opacity-40"
          >
            {running ? "…" : "Run"}
          </button>
        </div>
      </div>

      {cardInfo && (
        <div className="space-y-0.5 text-xs text-atom-fg-muted">
          {cardInfo.repoUrl && cardInfo.repoLabel && (
            <div>
              <a href={cardInfo.repoUrl} target="_blank" rel="noreferrer" className={linkCls}>
                {cardInfo.repoLabel}
              </a>
            </div>
          )}
          <div>
            <a href={cardInfo.pipelineUrl} target="_blank" rel="noreferrer" className={linkCls}>
              {cardInfo.pipelineLabel}
            </a>{" "}
            · {cardInfo.ref}
          </div>
        </div>
      )}

      {cardInfo?.params && (
        <div>
          <button
            type="button"
            onClick={() => setShowParams((v) => !v)}
            className="text-xs text-atom-fg-muted hover:text-atom-fg transition"
          >
            {showParams ? "▾" : "▸"} params ({Object.keys(cardInfo.params).length})
          </button>
          {showParams && (
            <pre className="mt-1.5 rounded-lg bg-atom-bg border border-atom-border px-3 py-2 text-xs text-atom-cyan overflow-x-auto whitespace-pre font-mono">
              {JSON.stringify(cardInfo.params, null, 2)}
            </pre>
          )}
        </div>
      )}

      {runStatus === "success" && (
        <div className="rounded-lg border border-atom-green/30 bg-atom-green/10 px-3 py-1.5 text-xs text-atom-green">
          Triggered successfully
          {jobUrl && (
            <>
              {" · "}
              <a
                href={jobUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:brightness-125"
              >
                Open
              </a>
            </>
          )}
        </div>
      )}

      {runStatus === "error" && (
        <div className="rounded-lg border border-atom-red/30 bg-atom-red/10 px-3 py-1.5 text-xs text-atom-red break-words">
          {parseErrorMessage(runError) || "Request failed"}
        </div>
      )}

      {showCurl && (
        <div className="relative">
          <pre className="rounded-lg bg-atom-bg border border-atom-border px-3 py-2.5 pr-16 text-xs text-atom-cyan overflow-x-auto whitespace-pre font-mono">
            {curl}
          </pre>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(curl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="absolute right-2 top-2 rounded border border-atom-border bg-atom-surface px-2 py-1 text-xs text-atom-fg-muted transition hover:text-atom-fg"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      <Modal open={showRunModal} title={`Run: ${action.name}`} onClose={() => setShowRunModal(false)}>
        <form onSubmit={handleRunWithParams} className="space-y-3">
          <p className="text-xs text-atom-fg-muted">Params are used for this run only and won't be saved.</p>
          <JsonEditor value={runParamsJson} onChange={setRunParamsJson} rows={6} />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={running}
              className="rounded-xl bg-atom-blue px-4 py-2 text-sm font-medium text-atom-bg transition hover:brightness-110 disabled:opacity-40"
            >
              {running ? "…" : "Run"}
            </button>
            <button
              type="button"
              onClick={() => setShowRunModal(false)}
              className="rounded-xl border border-atom-border px-4 py-2 text-sm text-atom-fg-sub transition hover:text-atom-fg"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
