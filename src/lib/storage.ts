import type { ProviderConfig, RunLog, SavedAction } from './types'

const PROVIDERS_KEY = 'ci-trigger.providers'
const ACTIONS_KEY = 'ci-trigger.actions'
const RUN_LOGS_KEY = 'ci-trigger.runLogs'

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)

  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getProviders(): ProviderConfig[] {
  return readJson(PROVIDERS_KEY, [])
}

export function setProviders(providers: ProviderConfig[]) {
  writeJson(PROVIDERS_KEY, providers)
}

export function getActions(): SavedAction[] {
  return readJson(ACTIONS_KEY, [])
}

export function setActions(actions: SavedAction[]) {
  writeJson(ACTIONS_KEY, actions)
}

export function getRunLogs(): RunLog[] {
  return readJson(RUN_LOGS_KEY, [])
}

export function setRunLogs(logs: RunLog[]) {
  writeJson(RUN_LOGS_KEY, logs)
}

export function saveProvider(provider: ProviderConfig) {
  const providers = getProviders()
  const index = providers.findIndex((item) => item.id === provider.id)

  if (index >= 0) {
    providers[index] = provider
  } else {
    providers.push(provider)
  }

  writeJson(PROVIDERS_KEY, providers)
}

export function deleteProvider(id: string) {
  const providers = getProviders().filter((item) => item.id !== id)
  writeJson(PROVIDERS_KEY, providers)
}


export function saveAction(action: SavedAction) {
  const actions = getActions()
  const index = actions.findIndex((item) => item.id === action.id)

  if (index >= 0) {
    actions[index] = action
  } else {
    actions.push(action)
  }

  writeJson(ACTIONS_KEY, actions)
}

export function deleteAction(id: string) {
  const actions = getActions().filter((item) => item.id !== id)
  writeJson(ACTIONS_KEY, actions)
}



export function appendRunLog(log: RunLog) {
  const logs = getRunLogs()
  logs.unshift(log)
  writeJson(RUN_LOGS_KEY, logs.slice(0, 100))
}

export function clearRunLogs() {
  writeJson(RUN_LOGS_KEY, [])
}