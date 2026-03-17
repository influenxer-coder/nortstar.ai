# Modal strategy agent API (onboarding Step 1)

The onboarding Step 1 "Analyze my product" flow calls a Modal endpoint that streams NDJSON. This doc describes how to call it from the frontend.

---

## HOW TO CALL THE MODAL API

The Modal endpoint streams NDJSON over HTTP.
Use fetch with a ReadableStream — do NOT use axios
(it buffers the response and breaks streaming).

Exact implementation:

```javascript
const abortController = new AbortController()

const response = await fetch(process.env.NEXT_PUBLIC_AGENT_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  signal: abortController.signal,
  body: JSON.stringify({
    url: productUrl,
    description: productDescription,
    strategy_doc: extractedFileText  // empty string if no file
  })
})

if (!response.ok) {
  throw new Error("Agent request failed")
}

const reader = response.body.getReader()
const decoder = new TextDecoder()
let buffer = ""

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split("\n")
  
  // Keep the last incomplete line in buffer
  buffer = lines.pop() ?? ""

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line)

      if (event.type === "log") {
        // append event.message to log display
      }

      if (event.type === "result") {
        // transition to State 3 with event.data
      }

      if (event.type === "error") {
        // show error message, return to State 1
      }

    } catch (e) {
      // incomplete JSON line — skip
    }
  }
}
```

- Store `abortController` at component level.
- Call `abortController.abort()` when the user clicks Cancel.

The Modal URL lives in your `.env` file:

```bash
NEXT_PUBLIC_AGENT_URL=https://your-org--your-app.modal.run
```

Never hardcode the URL in component code.

---

## PARSING MODEL OUTPUT AS JSON (Modal agent)

If your LLM returns JSON **wrapped in markdown code fences** (e.g. `` ```json ... ``` `` or `` ``` ... ``` ``), do **not** pass the raw string to `JSON.parse()` — it will throw.

Strip the code block first, then parse:

```python
import re
import json

def parse_model_json(raw: str) -> dict:
    # Remove optional ```json or ``` wrapper
    raw = raw.strip()
    match = re.search(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", raw, re.DOTALL)
    if match:
        raw = match.group(1).strip()
    return json.loads(raw)
```

Example: if the model returns:

````
```json
{ "name": "Agent NorthStar", "category": "..." }
```
````

then `parse_model_json(raw)` returns the dict. Use this (or equivalent) **before** emitting a `{"type": "result", "data": ...}` event so the frontend receives valid JSON.
