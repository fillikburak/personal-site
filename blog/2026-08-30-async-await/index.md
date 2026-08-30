---
title: async/await in C#
authors: [burak]
tags: [dotnet, async]
---

Notes on how `async`/`await` actually behaves in C#, beyond "it makes code non-blocking."

{/* truncate */}

## The state machine

`async` methods are compiled into a state machine. Each `await` is a potential
suspend point: if the awaited task isn't already complete, the method returns
control to its caller immediately, and the rest of the method runs later as a
continuation when the task completes.

This means `async` doesn't create a new thread by itself — it's about
*not blocking* the current thread while waiting, not about parallelism.

## `Task` vs `Task<T>` vs `void`

- `Task` / `Task<T>` — the normal case. Callers can `await` it, observe
  exceptions, and compose it with `Task.WhenAll` / `Task.WhenAny`.
- `async void` — fire-and-forget. Exceptions thrown inside can't be caught by
  the caller (they surface on the `SynchronizationContext` / crash the
  process). Only acceptable for top-level event handlers.

## Exceptions

An exception thrown inside an `async` method is captured and rethrown when the
returned `Task` is awaited — not when the method is called. Await a task
twice (or via `Task.Exception`) and the exception is re-observed.

```csharp
async Task<int> DivideAsync(int a, int b)
{
    await Task.Delay(10); // yields control
    return a / b; // throws DivideByZeroException if b == 0
}

try
{
    await DivideAsync(1, 0);
}
catch (DivideByZeroException)
{
    // caught here, at the await — not at the call site
}
```

## `ConfigureAwait(false)`

In library code (not ASP.NET Core, which has no `SynchronizationContext`),
`ConfigureAwait(false)` tells the continuation it doesn't need to resume on
the original context. In modern ASP.NET Core this mostly doesn't matter, but
it still matters in UI apps and in shared library code that might run under
either.

## Deadlock trap

Blocking on async code with `.Result` or `.Wait()` from a context that has a
captured `SynchronizationContext` (classic ASP.NET, WPF, WinForms) can
deadlock: the continuation needs that context to resume, but the thread that
owns the context is blocked waiting for the task. `async` all the way down
avoids this.

## Takeaways

- `await` frees the thread while waiting; it doesn't imply a new thread.
- Never use `async void` outside event handlers.
- Exceptions surface at the `await`, not at the call.
- Don't mix blocking calls (`.Result`, `.Wait()`) with async code.
