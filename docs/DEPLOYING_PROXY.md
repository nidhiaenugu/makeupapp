# Deploying the AI proxy

You only need this if you want **other people** to get the AI features without each of them supplying an Anthropic API key.

Glowmatch works fully without any AI. If it's just you, skip this entirely and paste your own key into the You tab instead — it's stored in your device keychain and never leaves your phone except to reach Anthropic.

## Why a proxy at all

A key shipped inside a mobile app can be extracted from the bundle by anyone who downloads it. There is no way to hide it. So the key lives on a server you control, the app sends plain JSON describing what it wants, and the server decides which prompt to run.

That also means the app can't be used to run arbitrary prompts on your account — the three endpoints only do the three things Glowmatch needs.

## Deploy

The proxy is three serverless functions in `server/`. It's set up for Vercel; any platform that runs Node handlers works with minor changes.

```bash
cd server
npm install
npx vercel          # first run: links the project
npx vercel env add ANTHROPIC_API_KEY production
npx vercel deploy --prod
```

Point the app at it:

```bash
# .env in the project root
EXPO_PUBLIC_AI_PROXY_URL=https://your-proxy.vercel.app/api
```

Restart the dev server. A "Hosted" option appears in the You tab's advisor settings.

## Endpoints

| Route | Does |
|---|---|
| `POST /api/intent` | Free text → structured profile fields |
| `POST /api/explain` | One product + match reasons → a friendlier sentence |
| `POST /api/advisor` | Chat, grounded in a catalog excerpt the app supplies |

All three return `{ error }` with a non-2xx status on failure, and the app degrades to the deterministic engine rather than showing an error.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | From [console.anthropic.com](https://console.anthropic.com/) |
| `ALLOWED_ORIGIN` | No | Defaults to `*`. Set it for the web build so only your domain can call the proxy. |

## Before you point real users at it

**The built-in rate limiter is not enough.** `server/api/_shared.js` caps requests per IP per warm instance. Serverless instances are short-lived and not shared, so it slows down casual abuse and nothing more. Put a real limiter in front — Vercel KV, Upstash, or your platform's API gateway — before this is publicly reachable, or you're paying for anyone who finds the URL.

**Set a spend limit** on your Anthropic account. Costs scale with usage and there's no ceiling by default.

**Consider requiring auth.** As written the endpoints are open. If you're shipping to real users, the simplest hardening is a shared token the app sends in a header and the proxy checks — enough to stop drive-by usage, though not enough to stop a determined user who extracts it from the bundle. Real per-user auth needs accounts, which is what the `ProfileRepository` seam is there for.

## Keeping prompts in sync

`server/api/_prompts.js` duplicates the prompts and the intent schema from `src/core/ai/prompts.ts`. They're duplicated because the proxy deploys on its own with no build step and no access to the app's TypeScript.

**If you change one, change both.** They're small and rarely change, but a drift here shows up as the proxy returning fields the app then discards.

## Model and cost

Both paths use `claude-opus-5`. It's set in one place per side — `AI_MODEL` in `src/core/ai/prompts.ts` and in `server/api/_shared.js`.

Intent parsing and explanations run at `effort: "low"` and are small requests. The advisor runs at `effort: "medium"` with the system prompt cached, so repeat turns in a conversation are much cheaper than the first. If you want to cut costs further, `claude-sonnet-5` is a reasonable swap for the explanation endpoint in particular.

## Testing locally

```bash
cd server
ANTHROPIC_API_KEY=sk-ant-... npx vercel dev
```

Then set `EXPO_PUBLIC_AI_PROXY_URL=http://localhost:3000/api` and restart Expo. On a physical device use your machine's LAN IP rather than `localhost`.
