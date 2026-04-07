import { useEffect, useState } from 'react'

import type { ProviderConfig, SavedAction } from '@/lib/types'
import { getActions, getProviders, saveProvider, deleteProvider, saveAction, deleteAction } from '@/lib/storage'
import ProvidersPanel from '@/components/ProviderPanel'
import ActionsPanel from '@/components/ActionsPanel'

export default function App() {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [actions, setActions] = useState<SavedAction[]>([])

  useEffect(() => {
    setProviders(getProviders())
    setActions(getActions())
  }, [])

  function handleSaveProvider(p: ProviderConfig) {
    saveProvider(p)
    setProviders(getProviders())
  }

  function handleDeleteProvider(id: string) {
    deleteProvider(id)
    setProviders(getProviders())
  }

  function handleSaveAction(a: SavedAction) {
    saveAction(a)
    setActions(getActions())
  }

  function handleDeleteAction(id: string) {
    deleteAction(id)
    setActions(getActions())
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <ProvidersPanel
          providers={providers}
          onSave={handleSaveProvider}
          onDelete={handleDeleteProvider}
        />

        <div className="lg:col-span-2">
          <ActionsPanel
            providers={providers}
            actions={actions}
            onSave={handleSaveAction}
            onDelete={handleDeleteAction}
          />
        </div>
      </div>
    </div>
  )
}