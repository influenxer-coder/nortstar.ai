# Frontend spec: Onboarding Step 1 — "Analyze my product"

This document tells the **frontend (or frontend coding agent)** exactly what to build for the Step 1 "Analyze my product" flow. Follow it so the UI matches the backend contract and UX expectations.

---

## 1. What the user does (Step 1 flow)

1. **Product URL** — User enters or pastes the product/company website URL (e.g. `https://www.example.com/`). Required.
2. **Product description** (optional) — User can type a short description of what the product does and who it's for.
3. **Strategy doc** (optional) — User can upload a file (e.g. PDF, doc). Frontend must extract text from the file and send it as a string. If no file, send empty string.
4. User clicks **Start analysis** (or equivalent). The frontend calls the Modal agent API and shows live progress.
5. When the agent finishes, the frontend receives the full result and transitions to the next step (e.g. Step 2 or a results view). If the agent errors, show the error and let the user retry or edit inputs.

---

## 2. API contract

- **Endpoint:** `POST` to the URL in `process.env.NEXT_PUBLIC_AGENT_URL` (set in `.env`, never hardcode).
- **Request body (JSON):**
  - `url` (string, required) — Product/company website URL.
  - `description` (string, optional) — Product description from the user. Default `""`.
  - `strategy_doc` (string, optional) — Extracted text from uploaded file. Default `""`.
- **Response:** Streaming NDJSON (`Content-Type` / `application/x-ndjson`). Each line is a single JSON object. Do **not** use `axios`; use `fetch` with `response.body.getReader()` so the stream is not buffered.

**Event types (each line is one of these):**

| `event.type` | Meaning | What to do |
|--------------|---------|------------|
| `log`        | Progress message from the agent | Append `event.message` to the on-screen log and update the "current status" line (see UI below). |
| `result`     | Analysis finished successfully | Stop the loading state, store `event.data`, and transition to the next step (e.g. show summary or go to Step 2). |
| `error`      | Agent failed | Stop the loading state, show `event.message` to the user, and allow retry (e.g. stay on Step 1). |

---

## 3. UI behavior (what the frontend must implement)

### 3.1 During the request (streaming)

- **Show live logs on the screen**, not only a timer or spinner.
- **Claude-style progress:**
  - A **beating / pulsing icon** (e.g. animated dot or icon) while the request is in progress.
  - **One-line current status:** display the **latest** `event.message` from the stream (e.g. "Researching your product…", "Mapping competitors…", "Synthesizing opportunities…"). Update this line every time a new `log` event arrives.
- Optionally, show a **scrollable log** of all `event.message` lines below the one-line status, so the user can see the full sequence.
- **Cancel button:** when the user clicks Cancel, call `abortController.abort()`. Stop the animation and clear or reset the status. Do not treat this as an error; the user chose to cancel.

### 3.2 When `result` is received

- Stop the pulsing icon and any "in progress" state.
- Use `event.data` as the **analysis result** for the rest of the onboarding flow. The structure is fixed (see Section 5). No need to parse JSON again; `event.data` is already the full object.
- Transition to the next step (e.g. "Step 2 of 6" or a results screen) and pass `event.data` (or the parts you need) to that step.

### 3.3 When `error` is received or fetch fails

- Stop the pulsing icon.
- Show `event.message` (or the fetch error) to the user in a clear error state.
- Keep the user on Step 1 so they can fix inputs (URL, description, file) and try again. Do not navigate away.

---

## 4. How to call the API (streaming, no axios)

Use **fetch** with a **ReadableStream**. Do **not** use axios for this request (it buffers the response and breaks streaming).

- Store an `AbortController` at component (or hook) level so Cancel can call `abort()`.
- After `fetch()`, check `response.ok`; if not ok, throw or handle as error.
- Use `response.body.getReader()` and a `TextDecoder`, then read chunks in a loop. Accumulate into a buffer and split by newline; only parse complete lines (each line is one NDJSON object). Keep the last incomplete chunk in the buffer for the next iteration.
- For each parsed `event`:
  - `event.type === "log"` → update "current status" line and append to log list.
  - `event.type === "result"` → store `event.data`, stop loading, go to next step.
  - `event.type === "error"` → show `event.message`, stop loading, stay on Step 1.

Example structure (pseudocode):

```javascript
const abortController = new AbortController();

const response = await fetch(process.env.NEXT_PUBLIC_AGENT_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  signal: abortController.signal,
  body: JSON.stringify({
    url: productUrl,
    description: productDescription || "",
    strategy_doc: extractedFileText || "",
  }),
});

if (!response.ok) throw new Error("Agent request failed");

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "log") { /* set currentStatus = event.message; append to logs */ }
      if (event.type === "result") { /* set result = event.data; go to next step */ }
      if (event.type === "error") { /* set error = event.message; show error UI */ }
    } catch (e) { /* skip incomplete line */ }
  }
}
```

---

## 5. Result shape (`event.data` when `event.type === "result"`)

The backend returns a single object. Use this structure for rendering and for passing data to the next step. **Minimal changes:** if the backend adds optional fields later, ignore them until the frontend is updated; the fields below are the contract.

| Key | Type | Description |
|-----|------|-------------|
| `input_product` | object | Product summary: `name`, `category`, `target_customer`, `core_value_prop`, `job_it_replaces`, `pricing_signal`, `key_differentiators`, etc. |
| `stage` | string | `"early"` \| `"scaling"` \| `"defending"` |
| `framework_applied` | string | Human-readable framework name (e.g. "Jobs To Be Done") |
| `framework_selection_reasoning` | string | Why this framework was chosen |
| `competitive_map` | object | `direct`, `indirect`, `status_quo` arrays/object with competitors and quotes |
| `market_trends` | object | `emerging_trends`, `new_threats`, `customer_behavior_shifts` |
| `unmet_needs` | array | Objects with `need`, `evidence`, `how_widespread`, etc. |
| `momentum_advantages` | array | Objects with `advantage`, `trend_backing`, `recommendation` |
| `threats` | array | Objects with `threat`, `who_is_driving_it`, `urgency`, `recommended_response` |
| `recommended_wedge` | string | Single paragraph positioning recommendation |
| `ranked_opportunities` | array | Ranked list; each item has `rank`, `opportunity`, `composite_score`, `segment_size_score`, `pain_urgency_score`, `strategic_fit_score`, `recommended_action`, and reasonings |

Use these keys to drive the next step UI (e.g. show `recommended_wedge`, list `ranked_opportunities`, or pass the whole object to Step 2).

---

## 6. Environment

- **Required:** In the frontend `.env` (or equivalent), set:
  - `NEXT_PUBLIC_AGENT_URL=https://influenxer-coder--northstar-agent-analyze.modal.run`
- Do not hardcode this URL in components. Read it from `process.env.NEXT_PUBLIC_AGENT_URL`.

---

## 7. Checklist for the frontend coding agent

- [x] Step 1 form: product URL (required), product description (optional), strategy doc file upload (optional); extract text from file and hold in state.
- [x] Start analysis calls `POST` to `NEXT_PUBLIC_AGENT_URL` with `{ url, description, strategy_doc }` using `fetch` and stream reading (no axios).
- [x] AbortController stored at component/hook level; Cancel button calls `abort()`.
- [x] While streaming: show pulsing/beating icon and **one-line current status** from the latest `log` event; optionally show full log list.
- [x] On `result`: stop loading, store `event.data`, transition to next step (or results view).
- [x] On `error`: show `event.message`, stay on Step 1, allow retry.
- [x] Use the result shape in Section 5 for rendering and for passing data to subsequent steps.
