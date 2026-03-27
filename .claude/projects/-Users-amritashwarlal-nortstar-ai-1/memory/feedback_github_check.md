---
name: Always check prerequisites before building
description: When a feature depends on connected services (GitHub, analytics), verify the connection exists for the current user before building the feature. Ask the user to connect if missing — don't silently skip.
type: feedback
---

Always verify prerequisites before building features that depend on external connections (GitHub, PostHog, etc.). If the connection doesn't exist for the current user, prompt them to connect — don't silently fail or skip.

**Why:** Built the entire launch/PR feature without checking that the logged-in user had GitHub connected. Wasted multiple debug cycles because agents + GitHub token belonged to a different user_id.

**How to apply:** Before implementing any feature that reads from user_context or agents, verify the current auth user has the required data. If not, add a connection prompt in the UI flow before the feature.
