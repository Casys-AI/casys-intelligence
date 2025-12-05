---
title: "The Hidden Bug That Never Failed"
slug: worker-rpc-bridge-hidden-bug
date: 2025-12-05
category: engineering
tags:
  - typescript
  - debugging
  - deno
snippet: "The code worked perfectly. The tests passed. There was just one problem: it never actually worked."
format: linkedin
language: en
author: Erwan Lee Pesle
---

The code worked perfectly. The tests passed. The feature was "shipped."

There was just one problem: it never actually worked.

Last week I discovered a bug that had been hiding in our codebase for months. The code was there. It was called. It did... nothing.

## What Happened

We built a sandbox that executes user code with MCP tools (think: AI calling external APIs). The implementation looked solid:

```typescript
const tools = wrapMCPClient(client);
executor.execute(code, tools);
```

Clean, right? Except inside the executor, we serialize the context:

```typescript
JSON.stringify(tools)  // → undefined
```

**Functions can't be serialized.** Our MCP tools silently vanished into the void. Every. Single. Time.

## Why Tests Passed

They used mock data, not real functions. No integration test actually called the tools.

## The Fix

The fix wasn't a one-liner. We rebuilt the architecture:

- Pass tool *definitions* (serializable) instead of functions
- Generate proxies in an isolated Worker
- Route calls through an RPC bridge
- Trace everything natively (no stdout parsing hacks)

## The Lesson

"It works" and "it's tested" doesn't mean "it actually does what we think."

Sometimes the most dangerous bugs are the ones that fail silently.

---

What's the sneakiest bug you've ever found in production code?
