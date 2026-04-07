import { useState } from "react";
import type { ProviderConfig, ProviderType } from "@/lib/types";
import { PROVIDERS, getProviderDef } from "@/lib/providers";
import { createId } from "@/lib/utils";
import Modal from "@/components/Modal";
import { toast } from "@/lib/toast";

type Props = { providers: ProviderConfig[]; onSave: (p: ProviderConfig) => void; onDelete: (id: string) => void };

type ProviderFormState = { editingId: string | null; name: string; type: ProviderType; token: string; baseUrl: string };

const initialForm: ProviderFormState = { editingId: null, name: "", type: "github", token: "", baseUrl: "" };

const inputCls =
  "w-full rounded-xl border border-atom-border bg-atom-bg px-3 py-2 text-sm text-atom-fg outline-none transition focus:border-atom-blue placeholder:text-atom-fg-muted";

export default function ProvidersPanel({ providers, onSave, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProviderFormState>(initialForm);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isEditing = form.editingId !== null;

  function openAdd() {
    setForm(initialForm);
    setError("");
    setOpen(true);
  }
  function openEdit(p: ProviderConfig) {
    setForm({ editingId: p.id, name: p.name, type: p.type, token: p.token, baseUrl: p.baseUrl ?? "" });
    setError("");
    setOpen(true);
  }
  function handleClose() {
    setOpen(false);
    setError("");
  }
  function updateField<K extends keyof ProviderFormState>(key: K, value: ProviderFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.token.trim()) {
      setError("Token is required.");
      return;
    }
    onSave({
      id: form.editingId ?? createId(),
      name: form.name.trim(),
      type: form.type,
      token: form.token.trim(),
      baseUrl: form.baseUrl.trim() || undefined,
    });
    toast(isEditing ? "Provider updated" : "Provider saved");
    handleClose();
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg border border-atom-border px-2.5 py-1 text-xs text-atom-fg-sub transition hover:border-atom-blue hover:text-atom-blue"
          >
            + Add
          </button>
        </div>

        {providers.length === 0 ? (
          <p className="text-sm text-atom-fg-muted">No providers yet.</p>
        ) : (
          <div className="space-y-2">
            {providers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-atom-border bg-atom-bg px-3 py-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg className="size-4 shrink-0 text-atom-fg-sub" aria-hidden>
                    <use href={`/icons.svg#${getProviderDef(p.type).iconId}`} />
                  </svg>
                  <div className="min-w-0">
                    <span className="text-sm text-atom-fg truncate">{p.name}</span>
                    <p className="text-xs text-atom-fg-muted">••••••••{p.token.slice(-4)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {confirmDeleteId === p.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(p.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-lg border border-atom-red/50 bg-atom-red/10 px-2.5 py-1 text-xs text-atom-red transition hover:bg-atom-red/20"
                      >
                        Sure?
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-atom-border px-2.5 py-1 text-xs text-atom-fg-muted transition hover:text-atom-fg"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded-lg border border-atom-border px-2.5 py-1 text-xs text-atom-fg-sub transition hover:border-atom-blue hover:text-atom-blue"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="rounded-lg border border-atom-border px-2.5 py-1 text-xs text-atom-fg-sub transition hover:border-atom-red hover:text-atom-red"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} title={isEditing ? "Edit provider" : "Add provider"} onClose={handleClose}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-atom-fg-sub">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="My GitHub token"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-atom-fg-sub">Type</label>
            <select
              value={form.type}
              onChange={(e) => updateField("type", e.target.value as ProviderType)}
              className={inputCls}
            >
              {PROVIDERS.map((p) => (
                <option key={p.type} value={p.type}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-atom-fg-sub">Token</label>
            <input
              type="password"
              value={form.token}
              onChange={(e) => updateField("token", e.target.value)}
              placeholder="Paste personal access token"
              className={inputCls}
            />
            <p className="text-xs text-atom-fg-muted">
              Stored in localStorage.{" "}
              <a
                href={getProviderDef(form.type).tokenHelpUrl}
                target="_blank"
                rel="noreferrer"
                className="text-atom-blue hover:underline underline-offset-2 transition"
              >
                Get token
              </a>
            </p>
          </div>
          <details className="group">
            <summary className="cursor-pointer text-xs text-atom-fg-muted hover:text-atom-fg transition select-none">
              Advanced
            </summary>
            <div className="mt-2 space-y-1.5">
              <label className="block text-xs font-medium text-atom-fg-sub">
                Base URL <span className="text-atom-fg-muted">(optional)</span>
              </label>
              <input
                type="text"
                value={form.baseUrl}
                onChange={(e) => updateField("baseUrl", e.target.value)}
                placeholder={getProviderDef(form.type).defaultBaseUrl}
                className={inputCls}
              />
            </div>
          </details>
          {error && (
            <div className="rounded-xl border border-atom-red/40 bg-atom-red/10 px-3 py-2 text-sm text-atom-red">
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="rounded-xl bg-atom-blue px-4 py-2 text-sm font-medium text-atom-bg transition hover:brightness-110"
            >
              {isEditing ? "Update" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-atom-border px-4 py-2 text-sm text-atom-fg-sub transition hover:text-atom-fg"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
