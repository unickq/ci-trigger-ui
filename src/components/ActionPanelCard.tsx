import { useState } from 'react'
import type { ProviderConfig, SavedAction } from '@/lib/types'

type Props = {
  action: SavedAction
  providers: ProviderConfig[]
  onEdit: (action: SavedAction) => void
  onFork: (action: SavedAction) => void
  onDelete: (id: string) => void
}

function isGitHubConfig(config: SavedAction['config']): config is Extract<SavedAction['config'], { owner: string }> {
  return typeof config === 'object' && config !== null && 'owner' in config
}

function isCircleCiConfig(config: SavedAction['config']): config is Extract<SavedAction['config'], { projectSlug: string }> {
  return typeof config === 'object' && config !== null && 'projectSlug' in config
}

function repoUrlFromSlug(slug: string): string | null {
  const [vcs, org, repo] = slug.split('/')
  if (!org || !repo) return null
  if (vcs === 'gh' || vcs === 'github') return `https://github.com/${org}/${repo}`
  if (vcs === 'bb' || vcs === 'bitbucket') return `https://bitbucket.org/${org}/${repo}`
  return null
}

function ProviderIcon({ type }: { type: string }) {
  const iconId = type === 'github' ? 'github-icon' : type === 'circleci' ? 'circleci-icon' : null
  if (!iconId) return null
  return (
    <svg className="size-4 shrink-0 fill-zinc-300" aria-hidden>
      <use href={`/icons.svg#${iconId}`} />
    </svg>
  )
}

function buildCurl(action: SavedAction, provider: ProviderConfig): string {
  const base = provider.baseUrl

  if (isGitHubConfig(action.config)) {
    const { owner, repo, workflowId, ref, inputs } = action.config
    const url = `${base ?? 'https://api.github.com'}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`
    const body = JSON.stringify({ ref, inputs: inputs ?? {} })
    return [
      `curl -X POST \\`,
      `  -H "Accept: application/vnd.github+json" \\`,
      `  -H "Authorization: Bearer ${provider.token}" \\`,
      `  ${url} \\`,
      `  -d '${body}'`,
    ].join('\n')
  }

  if (isCircleCiConfig(action.config)) {
    const { projectSlug, branch, parameters } = action.config
    const url = `${base ?? 'https://circleci.com/api/v2'}/project/${projectSlug}/pipeline`
    const body = JSON.stringify({ branch, parameters: parameters ?? {} })
    return [
      `curl -X POST \\`,
      `  -H "Circle-Token: ${provider.token}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  ${url} \\`,
      `  -d '${body}'`,
    ].join('\n')
  }

  return ''
}

function resolveBase(provider: ProviderConfig, type: 'github' | 'circleci'): string {
  if (provider.baseUrl) return provider.baseUrl
  const isDev = import.meta.env.DEV
  if (type === 'github') return isDev ? '/proxy/github' : 'https://api.github.com'
  return isDev ? '/proxy/circleci' : 'https://circleci.com/api/v2'
}

async function runAction(action: SavedAction, provider: ProviderConfig): Promise<Response> {
  if (isGitHubConfig(action.config)) {
    const { owner, repo, workflowId, ref, inputs } = action.config
    const base = resolveBase(provider, 'github')
    const url = `${base}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`
    return fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${provider.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref, inputs: inputs ?? {} }),
    })
  }

  if (isCircleCiConfig(action.config)) {
    const { projectSlug, branch, parameters } = action.config
    const base = resolveBase(provider, 'circleci')
    const url = `${base}/project/${projectSlug}/pipeline`
    return fetch(url, {
      method: 'POST',
      headers: {
        'Circle-Token': provider.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ branch, parameters: parameters ?? {} }),
    })
  }

  return Promise.reject(new Error('Unknown action type'))
}

export default function ActionPanelCard({ action, providers, onEdit, onFork, onDelete }: Props) {
  const provider = providers.find((p) => p.id === action.providerId)
  const providerName = provider?.name ?? 'Unknown'

  const [showCurl, setShowCurl] = useState(false)
  const [copied, setCopied] = useState(false)
  const [running, setRunning] = useState(false)
  const [runStatus, setRunStatus] = useState<'success' | 'error' | null>(null)
  const [runError, setRunError] = useState('')

  async function handleRun() {
    if (!provider) return
    setRunning(true)
    setRunStatus(null)
    setRunError('')

    try {
      const res = await runAction(action, provider)
      if (res.ok || res.status === 204) {
        setRunStatus('success')
      } else {
        const text = await res.text().catch(() => res.statusText)
        setRunStatus('error')
        setRunError(`${res.status}: ${text}`)
      }
    } catch (e) {
      setRunStatus('error')
      setRunError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  const curl = provider ? buildCurl(action, provider) : ''

  return (
    <div className="border border-zinc-800 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {provider && <ProviderIcon type={provider.type} />}
          <div className="text-sm font-medium truncate">{action.name}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { setShowCurl((v) => !v); setRunStatus(null) }}
            className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          >
            curl
          </button>

          <button
            type="button"
            onClick={() => onFork(action)}
            className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          >
            Fork
          </button>

          <button
            type="button"
            onClick={() => onEdit(action)}
            className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={handleRun}
            disabled={!provider || running}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-40"
          >
            {running ? '…' : 'Run'}
          </button>
        </div>
      </div>

      {isGitHubConfig(action.config) && (
        <div className="space-y-0.5 text-xs text-zinc-400">
          <div>
            <a
              href={`https://github.com/${action.config.owner}/${action.config.repo}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-200 underline underline-offset-2"
            >
              {action.config.owner}/{action.config.repo}
            </a>
          </div>
          <div>
            <a
              href={`https://github.com/${action.config.owner}/${action.config.repo}/actions/workflows/${action.config.workflowId}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-200 underline underline-offset-2"
            >
              {action.config.workflowId}
            </a>
            {' '}· {action.config.ref}
          </div>
        </div>
      )}

      {isCircleCiConfig(action.config) && (() => {
        const repoUrl = repoUrlFromSlug(action.config.projectSlug)
        const [, org, repo] = action.config.projectSlug.split('/')
        return (
          <div className="space-y-0.5 text-xs text-zinc-400">
            {repoUrl && (
              <div>
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-200 underline underline-offset-2"
                >
                  {org}/{repo}
                </a>
              </div>
            )}
            <div>
              <a
                href={`https://app.circleci.com/pipelines/${action.config.projectSlug}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-zinc-200 underline underline-offset-2"
              >
                CircleCI pipelines
              </a>
              {' '}· {action.config.branch}
            </div>
          </div>
        )
      })()}

      <div className="text-xs text-zinc-500">Provider: {providerName}</div>

      {runStatus === 'success' && (
        <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-300">
          Triggered successfully
        </div>
      )}

      {runStatus === 'error' && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs text-red-300 break-all">
          {runError || 'Request failed'}
        </div>
      )}

      {showCurl && (
        <div className="relative">
          <pre className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2.5 pr-16 text-xs text-zinc-300 overflow-x-auto whitespace-pre">
            {curl}
          </pre>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(curl)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="absolute right-2 top-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-400 transition hover:text-zinc-100"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => { if (window.confirm(`Delete "${action.name}"?`)) onDelete(action.id) }}
        className="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-400 transition hover:border-red-700 hover:text-red-300"
      >
        Delete
      </button>
    </div>
  )
}
