# Strategy Agent Call — Step 1 of Onboarding

## Where it happens

`app/onboarding/product/ProductOnboardingFlow.tsx` — the product onboarding wizard (not the agent-creation flow at `/dashboard/agents/new`).

## Trigger

User fills in product URL + optional description + optional strategy doc on Step 1 and clicks **"Analyze"**. This calls `runStep1` → `runAgentStream(...)`.

## The call

```ts
// runAgentStream() in ProductOnboardingFlow.tsx:221
const res = await fetch(process.env.NEXT_PUBLIC_AGENT_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  signal,
  body: JSON.stringify({ url, description, strategy_doc }),
})
```

`NEXT_PUBLIC_AGENT_URL` points to an **external Modal-hosted agent** (Python, streams NDJSON).

## Streaming protocol

The agent streams newline-delimited JSON. The client reads chunks and dispatches on `event.type`:

| `type`   | Action                                                    |
|----------|-----------------------------------------------------------|
| `log`    | `setStep1CurrentStatus(msg)` — updates the progress label |
| `result` | `setStep1Result(data)` → `setStep1Screen('report')`       |
| `error`  | `setStep1Error(msg)` → `setStep1Screen('form')`           |

## After result

- `buildReportMarkdown(data)` renders the `StrategyResultData` JSON into markdown for the right-panel report view.
- If a project already exists, the JSON + markdown are PATCHed to `/api/projects/${projectId}`.

## Strategy chat (follow-on)

`app/api/onboarding/strategy-chat/route.ts` — a separate POST that takes `{ message, strategy_json }` and calls `claude-sonnet-4-6` to let the user debate/refine the report inline.

---

## Hooking up a second agent call

The pattern to follow:

```ts
// 1. Define a new runXxxStream() following the same shape as runAgentStream()
async function runSecondAgentStream({ ..., signal, onLog, onResult, onError }) {
  const res = await fetch(process.env.NEXT_PUBLIC_SECOND_AGENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ ... }),
  })
  // same NDJSON reader loop as runAgentStream
}

// 2. Call it after step1 result is received (inside onResult callback):
onResult: (data) => {
  stopRunning()
  setStep1Result(data as StrategyResultData)
  // Fire second agent
  runSecondAgentStream({
    strategy: data,
    signal: controller.signal,
    onLog: ...,
    onResult: ...,
    onError: ...,
  })
},
```

Key env var to add: `NEXT_PUBLIC_SECOND_AGENT_URL` in `.env.local` and Vercel project settings.
