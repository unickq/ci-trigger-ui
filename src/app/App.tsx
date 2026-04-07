import { useRef, useState, useCallback } from "react";

import type { ProviderConfig, RunLog, SavedAction } from "@/lib/types";
import {
  getActions,
  getProviders,
  getRunLogs,
  saveProvider,
  deleteProvider,
  saveAction,
  deleteAction,
  setProviders as storeProviders,
  setActions as storeActions,
} from "@/lib/storage";
import { toast } from "@/lib/toast";
import ProvidersPanel from "@/components/ProviderPanel";
import ActionsPanel from "@/components/ActionsPanel";
import RunLogsPanel from "@/components/RunLogsPanel";
import Toaster from "@/components/Toaster";
import Modal from "@/components/Modal";

export default function App() {
  const [providers, setProviders] = useState<ProviderConfig[]>(getProviders);
  const [actions, setActions] = useState<SavedAction[]>(getActions);
  const [logs, setLogs] = useState<RunLog[]>(getRunLogs);
  const importRef = useRef<HTMLInputElement>(null);

  function handleSaveProvider(p: ProviderConfig) {
    saveProvider(p);
    setProviders(getProviders());
  }
  function handleDeleteProvider(id: string) {
    deleteProvider(id);
    setProviders(getProviders());
  }
  function handleSaveAction(a: SavedAction) {
    saveAction(a);
    setActions(getActions());
  }
  function handleDeleteAction(id: string) {
    deleteAction(id);
    setActions(getActions());
  }
  function handlePinAction(id: string) {
    const all = getActions();
    storeActions(all.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)));
    setActions(getActions());
  }

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showProviders, setShowProviders] = useState(false);

  const doExport = useCallback((withTokens: boolean) => {
    const providers = getProviders().map((p) => (withTokens ? p : { ...p, token: "" }));
    const data = { providers, actions: getActions() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = withTokens ? "ci-trigger-export.json" : "ci-trigger-export-no-tokens.json";
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, []);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        let addedP = 0,
          updatedP = 0,
          addedA = 0,
          updatedA = 0;

        if (Array.isArray(data.providers)) {
          const existing = getProviders();
          const merged = [...existing];
          for (const p of data.providers) {
            const idx = merged.findIndex((x) => x.id === p.id);
            if (idx === -1) {
              merged.push(p);
              addedP++;
            } else {
              // keep existing token if import has no token (exported without tokens)
              merged[idx] = { ...p, token: p.token || merged[idx].token };
              updatedP++;
            }
          }
          storeProviders(merged);
          setProviders(getProviders());
        }

        if (Array.isArray(data.actions)) {
          const existing = getActions();
          const merged = [...existing];
          for (const a of data.actions) {
            const idx = merged.findIndex((x) => x.id === a.id);
            if (idx === -1) {
              merged.push(a);
              addedA++;
            } else {
              merged[idx] = a;
              updatedA++;
            }
          }
          storeActions(merged);
          setActions(getActions());
        }

        const parts = [];
        if (addedP || updatedP) parts.push(`providers: +${addedP} ~${updatedP}`);
        if (addedA || updatedA) parts.push(`actions: +${addedA} ~${updatedA}`);
        toast(parts.length ? `Merged - ${parts.join(", ")}` : "Nothing to import");
      } catch {
        toast("Invalid file", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="min-h-screen bg-atom-bg text-atom-fg flex flex-col">
      <header className="border-b border-atom-border bg-atom-surface px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-atom-fg">CI Trigger</span>
            <span className="rounded border border-atom-border px-1.5 py-0.5 text-xs text-atom-fg-muted">personal</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProviders(true)}
              className="rounded-lg border border-atom-border px-2.5 py-1 text-xs text-atom-fg-sub transition hover:border-atom-blue hover:text-atom-blue"
            >
              Providers {providers.length > 0 && <span className="ml-1 text-atom-fg-muted">{providers.length}</span>}
            </button>
            <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="rounded-lg border border-atom-border px-2.5 py-1 text-xs text-atom-fg-sub transition hover:border-atom-blue hover:text-atom-blue"
            >
              Import
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu((v) => !v)}
                className="rounded-lg border border-atom-border px-2.5 py-1 text-xs text-atom-fg-sub transition hover:border-atom-blue hover:text-atom-blue"
              >
                Export ▾
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-atom-border bg-atom-raised py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => doExport(true)}
                      className="w-full px-3 py-1.5 text-left text-xs text-atom-fg-sub hover:bg-atom-border hover:text-atom-fg"
                    >
                      With tokens
                    </button>
                    <button
                      type="button"
                      onClick={() => doExport(false)}
                      className="w-full px-3 py-1.5 text-left text-xs text-atom-fg-sub hover:bg-atom-border hover:text-atom-fg"
                    >
                      Without tokens
                      <span className="ml-1 text-atom-fg-muted">- share with team</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <Modal open={showProviders} title="Providers" onClose={() => setShowProviders(false)}>
        <ProvidersPanel providers={providers} onSave={handleSaveProvider} onDelete={handleDeleteProvider} />
      </Modal>

      <div className="flex-1 p-6 space-y-6">
        <div>
          <ActionsPanel
            providers={providers}
            actions={actions}
            logs={logs}
            onSave={handleSaveAction}
            onDelete={handleDeleteAction}
            onReorder={(reordered) => {
              storeActions(reordered);
              setActions(getActions());
            }}
            onPin={handlePinAction}
            onRunComplete={() => setLogs(getRunLogs())}
            onOpenProviders={() => setShowProviders(true)}
          />
        </div>
        <RunLogsPanel
          logs={logs}
          actions={actions}
          onClear={() => setLogs([])}
          onDelete={() => setLogs(getRunLogs())}
        />
      </div>

      <footer className="mt-8 border-t border-atom-border px-6 py-3 text-center text-xs text-atom-fg-muted">
        <a
          href="https://github.com/unickq/ci-trigger-ui"
          target="_blank"
          rel="noreferrer"
          className="hover:text-atom-fg transition"
        >
          ci-trigger-ui
        </a>
        {" · "}data stored locally in your browser
      </footer>

      <Toaster />
    </div>
  );
}
