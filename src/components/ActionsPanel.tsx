import type { ProviderConfig, RunLog, SavedAction } from "@/lib/types";
import { getProviderDef, getProviderDefByActionType } from "@/lib/providers";
import { toast } from "@/lib/toast";
import { createId } from "@/lib/utils";
import { useMemo, useState } from "react";
import ActionPanelCard from "@/components/ActionPanelCard";
import JsonEditor from "@/components/JsonEditor";
import Modal from "@/components/Modal";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  providers: ProviderConfig[];
  actions: SavedAction[];
  logs: RunLog[];
  onSave: (a: SavedAction) => void;
  onDelete: (id: string) => void;
  onReorder: (actions: SavedAction[]) => void;
  onPin: (id: string) => void;
  onRunComplete?: () => void;
  onOpenProviders?: () => void;
};

type CardProps = {
  action: SavedAction;
  providers: ProviderConfig[];
  lastRun?: RunLog;
  onEdit: (a: SavedAction) => void;
  onFork: (a: SavedAction) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onRunComplete?: () => void;
};

function SortableCard(props: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.action.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <ActionPanelCard {...props} dragHandle={{ attributes, listeners }} />
    </div>
  );
}

type ActionFormState = {
  editingId: string | null;
  name: string;
  providerId: string;
  owner: string;
  repo: string;
  workflowId: string;
  ref: string;
  inputsJson: string;
  projectSlug: string;
  branch: string;
  parametersJson: string;
};

const initialForm: ActionFormState = {
  editingId: null,
  name: "",
  providerId: "",
  owner: "",
  repo: "",
  workflowId: "",
  ref: "main",
  inputsJson: "{}",
  projectSlug: "",
  branch: "main",
  parametersJson: "{}",
};

function formFromAction(action: SavedAction): ActionFormState {
  const base = { ...initialForm, editingId: action.id, name: action.name, providerId: action.providerId };
  const def = getProviderDefByActionType(action.type);
  return def ? { ...base, ...def.buildFormState(action.config) } : base;
}

const inputCls =
  "w-full rounded-xl border border-atom-border bg-atom-bg px-3 py-2 text-sm text-atom-fg outline-none transition focus:border-atom-blue placeholder:text-atom-fg-muted";

export default function ActionsPanel({
  providers,
  actions,
  logs,
  onSave,
  onDelete,
  onReorder,
  onPin,
  onRunComplete,
  onOpenProviders,
}: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ActionFormState>({ ...initialForm, providerId: providers[0]?.id ?? "" });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const effectiveProviderId = form.providerId || providers[0]?.id || "";
  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === effectiveProviderId),
    [providers, effectiveProviderId],
  );
  const isEditing = form.editingId !== null;

  const lastRunByActionId = useMemo(() => {
    const map = new Map<string, RunLog>();
    for (const log of logs) {
      if (!map.has(log.actionId)) map.set(log.actionId, log);
    }
    return map;
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? actions.filter((a) => {
          if (a.name.toLowerCase().includes(q)) return true;
          return JSON.stringify(a.config).toLowerCase().includes(q);
        })
      : actions;
    return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [actions, search]);

  function openAdd() {
    setForm({ ...initialForm, providerId: providers[0]?.id ?? "" });
    setError("");
    setOpen(true);
  }
  function handleEdit(action: SavedAction) {
    setForm(formFromAction(action));
    setError("");
    setOpen(true);
  }
  function handleFork(action: SavedAction) {
    setForm({ ...formFromAction(action), editingId: null, name: `${action.name} (copy)` });
    setError("");
    setOpen(true);
  }
  function handleClose() {
    setOpen(false);
    setError("");
  }
  function updateField<K extends keyof ActionFormState>(key: K, value: ActionFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!effectiveProviderId) {
      setError("Provider required");
      return;
    }
    const isGitHub = selectedProvider?.type === "github";
    if (isGitHub) {
      if (!form.owner.trim()) {
        setError("Owner is required");
        return;
      }
      if (!form.repo.trim()) {
        setError("Repo is required");
        return;
      }
      if (!form.workflowId.trim()) {
        setError("Workflow file is required");
        return;
      }
      if (!form.ref.trim()) {
        setError("Ref is required");
        return;
      }
    } else {
      if (!form.projectSlug.trim()) {
        setError("Project slug is required");
        return;
      }
      if (!form.branch.trim()) {
        setError("Branch is required");
        return;
      }
    }
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(isGitHub ? form.inputsJson : form.parametersJson);
    } catch {
      setError("Invalid JSON");
      return;
    }

    const id = form.editingId ?? createId();
    const actionType = getProviderDef(selectedProvider!.type).actionType;
    const action: SavedAction = isGitHub
      ? {
          id,
          name: form.name.trim(),
          providerId: effectiveProviderId,
          type: actionType,
          config: {
            owner: form.owner.trim(),
            repo: form.repo.trim(),
            workflowId: form.workflowId.trim(),
            ref: form.ref.trim(),
            inputs: parsed,
          },
        }
      : {
          id,
          name: form.name.trim(),
          providerId: effectiveProviderId,
          type: actionType,
          config: { projectSlug: form.projectSlug.trim(), branch: form.branch.trim(), parameters: parsed },
        };

    onSave(action);
    toast(isEditing ? "Action updated" : "Action saved");
    handleClose();
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-atom-fg shrink-0">Actions</h2>
          {actions.length > 0 && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="min-w-0 flex-1 rounded-lg border border-atom-border bg-atom-bg px-2.5 py-1 text-xs text-atom-fg outline-none transition focus:border-atom-blue placeholder:text-atom-fg-muted"
            />
          )}
          <button
            type="button"
            onClick={openAdd}
            disabled={providers.length === 0}
            className="shrink-0 rounded-lg border border-atom-border px-2.5 py-1 text-xs text-atom-fg-sub transition hover:border-atom-blue hover:text-atom-blue disabled:opacity-40"
          >
            + Add
          </button>
        </div>

        {actions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-atom-border px-6 py-12 text-center">
            <p className="text-sm text-atom-fg-muted">No actions yet.</p>
            <p className="mt-1 text-xs text-atom-fg-muted/60">
              {providers.length === 0 ? (
                <>
                  Start by{" "}
                  <button
                    type="button"
                    onClick={onOpenProviders}
                    className="text-atom-blue hover:underline underline-offset-2 transition"
                  >
                    adding a provider
                  </button>
                  .
                </>
              ) : (
                'Click "+ Add" to create your first action.'
              )}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-atom-fg-muted px-1">No actions match "{search}".</p>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={(e: DragEndEvent) => {
              const { active, over } = e;
              if (!over || active.id === over.id) return;
              const oldIndex = actions.findIndex((a) => a.id === active.id);
              const newIndex = actions.findIndex((a) => a.id === over.id);
              onReorder(arrayMove(actions, oldIndex, newIndex));
            }}
          >
            <SortableContext items={filtered.map((a) => a.id)} strategy={rectSortingStrategy}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((a) => (
                  <SortableCard
                    key={a.id}
                    action={a}
                    providers={providers}
                    lastRun={lastRunByActionId.get(a.id)}
                    onEdit={handleEdit}
                    onFork={handleFork}
                    onDelete={onDelete}
                    onPin={onPin}
                    onRunComplete={onRunComplete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Modal open={open} title={isEditing ? "Edit action" : "Add action"} onClose={handleClose}>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-atom-fg-sub">Name</label>
            <input
              placeholder="Deploy prod"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-atom-fg-sub">Provider</label>
            <select
              value={effectiveProviderId}
              onChange={(e) => updateField("providerId", e.target.value)}
              className={inputCls}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>

          {selectedProvider?.type === "github" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-atom-fg-sub">Owner</label>
                  <input
                    placeholder="org"
                    value={form.owner}
                    onChange={(e) => updateField("owner", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-atom-fg-sub">Repo</label>
                  <input
                    placeholder="repo"
                    value={form.repo}
                    onChange={(e) => updateField("repo", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-atom-fg-sub">Workflow file</label>
                  <input
                    placeholder="deploy.yml"
                    value={form.workflowId}
                    onChange={(e) => updateField("workflowId", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-atom-fg-sub">Ref</label>
                  <input
                    placeholder="main"
                    value={form.ref}
                    onChange={(e) => updateField("ref", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-atom-fg-sub">Inputs (JSON)</label>
                <JsonEditor value={form.inputsJson} onChange={(v) => updateField("inputsJson", v)} placeholder="{}" />
              </div>
            </>
          )}

          {selectedProvider?.type === "circleci" && (
            <>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-atom-fg-sub">Project slug</label>
                <input
                  placeholder="gh/org/repo"
                  value={form.projectSlug}
                  onChange={(e) => updateField("projectSlug", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-atom-fg-sub">Branch</label>
                <input
                  placeholder="main"
                  value={form.branch}
                  onChange={(e) => updateField("branch", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-atom-fg-sub">Parameters (JSON)</label>
                <JsonEditor
                  value={form.parametersJson}
                  onChange={(v) => updateField("parametersJson", v)}
                  placeholder="{}"
                />
              </div>
            </>
          )}

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
