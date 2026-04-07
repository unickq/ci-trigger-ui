import type { CircleCiActionConfig, GitHubActionConfig, ProviderConfig, SavedAction } from '@/lib/types'
import { createId } from '@/lib/utils'
import { useMemo, useState } from 'react'
import ActionPanelCard from '@/components/ActionPanelCard'

type Props = {
  providers: ProviderConfig[]
  actions: SavedAction[]
  onSave: (action: SavedAction) => void
  onDelete: (id: string) => void
}

type ActionFormState = {
  editingId: string | null
  name: string
  providerId: string
  // GitHub
  owner: string
  repo: string
  workflowId: string
  ref: string
  inputsJson: string
  // CircleCI
  projectSlug: string
  branch: string
  parametersJson: string
}

const initialForm: ActionFormState = {
  editingId: null,
  name: '',
  providerId: '',
  owner: '',
  repo: '',
  workflowId: '',
  ref: 'main',
  inputsJson: '{}',
  projectSlug: '',
  branch: 'main',
  parametersJson: '{}',
}

function formFromAction(action: SavedAction): ActionFormState {
  const base = {
    ...initialForm,
    editingId: action.id,
    name: action.name,
    providerId: action.providerId,
  }

  const cfg = action.config as GitHubActionConfig & CircleCiActionConfig

  if (action.type === 'github-workflow-dispatch') {
    return {
      ...base,
      owner: cfg.owner ?? '',
      repo: cfg.repo ?? '',
      workflowId: cfg.workflowId ?? '',
      ref: cfg.ref ?? 'main',
      inputsJson: JSON.stringify(cfg.inputs ?? {}, null, 2),
    }
  }

  return {
    ...base,
    projectSlug: cfg.projectSlug ?? '',
    branch: cfg.branch ?? 'main',
    parametersJson: JSON.stringify(cfg.parameters ?? {}, null, 2),
  }
}

export default function ActionsPanel({ providers, actions, onSave, onDelete }: Props) {
  const [form, setForm] = useState<ActionFormState>({
    ...initialForm,
    providerId: providers[0]?.id ?? '',
  })

  const effectiveProviderId = form.providerId || providers[0]?.id || ''

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === effectiveProviderId),
    [providers, effectiveProviderId],
  )

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isEditing = form.editingId !== null

  function updateField<K extends keyof ActionFormState>(key: K, value: ActionFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
    setSuccess('')
  }

  function handleEdit(action: SavedAction) {
    setForm(formFromAction(action))
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleFork(action: SavedAction) {
    setForm({ ...formFromAction(action), editingId: null, name: `${action.name} (copy)` })
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setForm({ ...initialForm, providerId: providers[0]?.id ?? '' })
    setError('')
    setSuccess('')
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim()) {
      setError('Name is required')
      return
    }

    if (!effectiveProviderId) {
      setError('Provider required')
      return
    }

    const isGitHub = selectedProvider?.type === 'github'

    if (isGitHub) {
      if (!form.owner.trim()) { setError('Owner is required'); return }
      if (!form.repo.trim()) { setError('Repo is required'); return }
      if (!form.workflowId.trim()) { setError('Workflow file is required'); return }
      if (!form.ref.trim()) { setError('Ref is required'); return }
    } else {
      if (!form.projectSlug.trim()) { setError('Project slug is required'); return }
      if (!form.branch.trim()) { setError('Branch is required'); return }
    }

    const jsonField = isGitHub ? form.inputsJson : form.parametersJson
    let parsed: Record<string, unknown> = {}

    try {
      parsed = JSON.parse(jsonField)
    } catch {
      setError('Invalid JSON')
      return
    }

    const id = form.editingId ?? createId()

    const action: SavedAction = isGitHub
      ? {
          id,
          name: form.name.trim(),
          providerId: effectiveProviderId,
          type: 'github-workflow-dispatch',
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
          type: 'circleci-pipeline',
          config: {
            projectSlug: form.projectSlug.trim(),
            branch: form.branch.trim(),
            parameters: parsed,
          },
        }

    onSave(action)
    setForm({ ...initialForm, providerId: providers[0]?.id ?? '' })
    setSuccess(isEditing ? 'Updated' : 'Saved')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-lg font-medium">
          {isEditing ? 'Edit action' : 'Actions'}
        </h2>

        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
        />

        <select
          value={effectiveProviderId}
          onChange={(e) => updateField('providerId', e.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.type})
            </option>
          ))}
        </select>

        {selectedProvider?.type === 'github' && (
          <>
            <input
              placeholder="owner"
              value={form.owner}
              onChange={(e) => updateField('owner', e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <input
              placeholder="repo"
              value={form.repo}
              onChange={(e) => updateField('repo', e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <input
              placeholder="workflow.yml"
              value={form.workflowId}
              onChange={(e) => updateField('workflowId', e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <input
              placeholder="ref"
              value={form.ref}
              onChange={(e) => updateField('ref', e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <textarea
              value={form.inputsJson}
              onChange={(e) => updateField('inputsJson', e.target.value)}
              rows={4}
              placeholder="inputs (JSON)"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </>
        )}

        {selectedProvider?.type === 'circleci' && (
          <>
            <input
              placeholder="project-slug (e.g. gh/org/repo)"
              value={form.projectSlug}
              onChange={(e) => updateField('projectSlug', e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <input
              placeholder="branch"
              value={form.branch}
              onChange={(e) => updateField('branch', e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <textarea
              value={form.parametersJson}
              onChange={(e) => updateField('parametersJson', e.target.value)}
              rows={4}
              placeholder="parameters (JSON)"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </>
        )}

        {error && <div className="text-red-400 text-sm">{error}</div>}
        {success && <div className="text-green-400 text-sm">{success}</div>}

        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white text-black rounded-xl text-sm">
            {isEditing ? 'Update' : 'Save'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:text-zinc-100"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {actions.map((a) => (
          <ActionPanelCard
            key={a.id}
            action={a}
            providers={providers}
            onEdit={handleEdit}
            onFork={handleFork}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
