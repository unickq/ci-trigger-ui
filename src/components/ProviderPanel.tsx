import type { ProviderConfig, ProviderType } from '@/lib/types'
import { createId } from '@/lib/utils'
import { useState } from 'react'

type Props = {
  providers: ProviderConfig[]
  onSave: (provider: ProviderConfig) => void
  onDelete: (id: string) => void
}

type ProviderFormState = {
  editingId: string | null
  name: string
  type: ProviderType
  token: string
  baseUrl: string
}

const initialForm: ProviderFormState = {
  editingId: null,
  name: '',
  type: 'github',
  token: '',
  baseUrl: '',
}

export default function ProvidersPanel({ providers, onSave, onDelete }: Props) {
  const [form, setForm] = useState<ProviderFormState>(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isEditing = form.editingId !== null

  function updateField<K extends keyof ProviderFormState>(key: K, value: ProviderFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  function handleEdit(provider: ProviderConfig) {
    setForm({
      editingId: provider.id,
      name: provider.name,
      type: provider.type,
      token: provider.token,
      baseUrl: provider.baseUrl ?? '',
    })
    setError('')
    setSuccess('')
  }

  function handleCancel() {
    setForm(initialForm)
    setError('')
    setSuccess('')
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const trimmedName = form.name.trim()
    const trimmedToken = form.token.trim()
    const trimmedBaseUrl = form.baseUrl.trim()

    if (!trimmedName) {
      setError('Name is required.')
      return
    }

    if (!trimmedToken) {
      setError('Token is required.')
      return
    }

    const provider: ProviderConfig = {
      id: form.editingId ?? createId(),
      name: trimmedName,
      type: form.type,
      token: trimmedToken,
      baseUrl: trimmedBaseUrl || undefined,
    }

    onSave(provider)
    setForm(initialForm)
    setError('')
    setSuccess(isEditing ? 'Provider updated.' : `Provider saved.`)
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
      >
        <div>
          <h2 className="text-lg font-medium">{isEditing ? 'Edit provider' : 'Providers'}</h2>
          {!isEditing && (
            <p className="mt-1 text-sm text-zinc-400">
              Save a personal token locally in your browser.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="provider-name" className="block text-sm font-medium text-zinc-200">
            Name
          </label>
          <input
            id="provider-name"
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="My GitHub token"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="provider-type" className="block text-sm font-medium text-zinc-200">
            Type
          </label>
          <select
            id="provider-type"
            value={form.type}
            onChange={(e) => updateField('type', e.target.value as ProviderType)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
          >
            <option value="github">GitHub</option>
            <option value="circleci">CircleCI</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="provider-token" className="block text-sm font-medium text-zinc-200">
            Token
          </label>
          <input
            id="provider-token"
            type="password"
            value={form.token}
            onChange={(e) => updateField('token', e.target.value)}
            placeholder="Paste personal access token"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
          />
          <p className="text-xs text-zinc-500">
            Stored in localStorage. Fine for a personal MVP, not for shared use.
          </p>
        </div>

        {/* <div className="space-y-2">
          <label htmlFor="provider-base-url" className="block text-sm font-medium text-zinc-200">
            Base URL <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            id="provider-base-url"
            type="text"
            value={form.baseUrl}
            onChange={(e) => updateField('baseUrl', e.target.value)}
            placeholder={
              form.type === 'github'
                ? 'https://api.github.com'
                : 'https://circleci.com/api/v2'
            }
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
          />
        </div> */}

        {error && (
          <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex rounded-xl border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white"
          >
            {isEditing ? 'Update' : 'Save provider'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:text-zinc-100"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-zinc-200">Saved providers</h3>
        </div>

        {providers.length === 0 ? (
          <p className="text-sm text-zinc-500">No providers saved yet.</p>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-100">{provider.name}</p>
                    <span className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                      {provider.type}
                    </span>
                  </div>

                  <p className="mt-1 break-all text-xs text-zinc-500">
                    Token: ••••••••{provider.token.slice(-4)}
                  </p>

                  {provider.baseUrl && (
                    <p className="mt-1 break-all text-xs text-zinc-500">
                      Base URL: {provider.baseUrl}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(provider)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (window.confirm(`Delete "${provider.name}"?`)) onDelete(provider.id) }}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
