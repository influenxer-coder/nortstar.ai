# Supabase: Create chat tables (profiles, conversations, etc.)

If you see **"Could not find the table 'public.profiles' in the schema cache"**, the chat schema has not been applied to your Supabase project.

## Run the schema once

1. Open **Supabase Dashboard** → your project.
2. Go to **SQL Editor** → **New query**.
3. Copy the entire contents of **`supabase/run-chat-schema.sql`** from this repo and paste into the editor.
4. Click **Run** (or Cmd/Ctrl+Enter).

This creates:

- `public.profiles` (required for auth and chat)
- `public.conversations`
- `public.messages`
- `public.artifacts`
- `public.user_context`
- RLS policies and indexes

5. After it succeeds, refresh your app and try logging in again.

## Using Supabase CLI instead

From the project root:

```bash
supabase db push
```

(or link the project first with `supabase link` if needed).
