'use client'

import { useState } from 'react'
import { Check, ExternalLink, Settings, Database, Bell, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

const DATA_SOURCES = [
  {
    id: 'zendesk',
    name: 'Zendesk',
    description: 'Support tickets and customer conversations',
    icon: '🎫',
    connected: true,
    lastSync: '2 hours ago',
    itemsSynced: 127,
  },
  {
    id: 'gong',
    name: 'Gong',
    description: 'Sales call recordings and transcripts',
    icon: '📞',
    connected: true,
    lastSync: '2 hours ago',
    itemsSynced: 23,
  },
  {
    id: 'intercom',
    name: 'Intercom',
    description: 'In-app chat conversations',
    icon: '💬',
    connected: true,
    lastSync: '2 hours ago',
    itemsSynced: 89,
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Create tickets directly from insights',
    icon: '◉',
    connected: false,
    lastSync: null,
    itemsSynced: 0,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync PRDs to your Notion workspace',
    icon: '📄',
    connected: false,
    lastSync: null,
    itemsSynced: 0,
  },
]

export default function SettingsPage() {
  const [slackWebhook, setSlackWebhook] = useState('https://hooks.slack.com/services/demo/...')
  const [savedSlack, setSavedSlack] = useState(true)

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="sticky top-0 z-10 px-6 py-3 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-sm">
        <h1 className="text-sm font-semibold text-zinc-100">Settings</h1>
      </div>

      <div className="px-6 py-6 max-w-3xl space-y-8">
        {/* Organization */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300">Organization</h2>
          </div>
          <Card className="p-4 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Company Name</label>
              <Input defaultValue="Acme Corp" className="max-w-xs" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Domain</label>
              <Input defaultValue="acme.com" className="max-w-xs" disabled />
              <p className="text-xs text-zinc-600 mt-1">Used for SSO. Contact support to change.</p>
            </div>
          </Card>
        </section>

        {/* Data Sources */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300">Data Sources</h2>
          </div>
          <div className="space-y-3">
            {DATA_SOURCES.map(source => (
              <Card key={source.id} className="p-4">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{source.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-zinc-100">{source.name}</span>
                      {source.connected && (
                        <span className="flex items-center gap-1 text-[10px] text-green-400">
                          <Check className="w-3 h-3" /> Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{source.description}</p>
                    {source.connected && source.lastSync && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        Last synced {source.lastSync} · {source.itemsSynced} items
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={source.connected ? 'outline' : 'secondary'}
                    className="h-7 text-xs shrink-0"
                  >
                    {source.connected ? 'Configure' : 'Connect'}
                    {!source.connected && <ExternalLink className="w-3 h-3 ml-1" />}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Slack Notifications */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300">Slack Notifications</h2>
          </div>
          <Card className="p-4 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">
                Webhook URL
              </label>
              <div className="flex items-center gap-2 max-w-md">
                <Input
                  value={slackWebhook}
                  onChange={e => { setSlackWebhook(e.target.value); setSavedSlack(false) }}
                  placeholder="https://hooks.slack.com/services/..."
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => setSavedSlack(true)}
                  className={savedSlack ? 'bg-green-600 hover:bg-green-500' : 'bg-violet-600 hover:bg-violet-500'}
                >
                  {savedSlack ? <><Check className="w-3 h-3 mr-1" /> Saved</> : 'Save'}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">
                Alert Types
              </label>
              <div className="space-y-2">
                {['Critical insights (immediate)', 'Churn risk alerts (immediate)', 'Weekly report (Monday 9am)'].map(item => (
                  <label key={item} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-violet-500" />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* SSO */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300">Single Sign-On (SSO)</h2>
          </div>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-100 mb-1">Okta / Azure AD</p>
                <p className="text-xs text-zinc-500">Configure SAML 2.0 or OIDC for your organization</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                Configure SSO
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
