---
title: GC generations
authors: [burak]
tags: [dotnet, memory]
---

Notes on why the CLR splits its managed heap into three garbage-collection generations, and what that means for how you write allocation-heavy code.

{/* truncate */}

## The assumption behind generations

Most objects die young: a request DTO, a formatted log line, a LINQ
intermediate — created, used once, gone. A handful of objects — a cache, a
singleton service, a connection pool — live for the process's entire
lifetime. Instead of scanning the whole heap on every pass, the GC splits it
into three generations and spends almost all its effort on the generation
that dies fastest.

| Generation | Holds | Collected | Cost |
|---|---|---|---|
| Gen 0 | every new object | very often | cheap — small region, scanned fast |
| Gen 1 | Gen 0 survivors | occasionally | a buffer between 0 and 2 |
| Gen 2 | Gen 1 survivors | rarely | expensive — full heap walk |

`GC.MaxGeneration` is `2` on every desktop/server CLR — there's no Gen 3. An
object is promoted exactly once per sweep it survives: Gen 0 → Gen 1 → Gen 2,
never further.

## Watching a promotion happen

`GC.GetGeneration(obj)` reports exactly where an object lives right now.
Holding one reference alive across three explicit collections shows the
ladder directly:

```csharp
var obj = new object();
Console.WriteLine(GC.GetGeneration(obj)); // 0

GC.Collect(0);
Console.WriteLine(GC.GetGeneration(obj)); // 1

GC.Collect(1);
Console.WriteLine(GC.GetGeneration(obj)); // 2

GC.Collect(2);
Console.WriteLine(GC.GetGeneration(obj)); // 2 — Gen 2 is terminal
```

Same object, three collections, three answers. Promotion isn't a heuristic
the runtime guesses at — it's the literal rule: survive a sweep of your
current generation, move up exactly one.

## What actually lives in Gen 0

Allocating 500,000 short-lived strings — each built, read once, and never
stored anywhere — and checking `GC.CollectionCount()` before and after:

```
Gen 0 collections: 6
Gen 1 collections: 0
Gen 2 collections: 0
```

Six Gen 0 sweeps ran. Gen 1 and Gen 2 never fired, because nothing survived
long enough to need promoting. That's the entire point of Gen 0: cheap,
frequent, and by design, almost everything that enters it never leaves.

## Contrast: keeping things alive

Change one variable — hold the objects in a `List` instead of discarding
them — and the same allocation count promotes heavily instead:

```
Gen 0 collections: 4    Gen 1 collections: 3    Gen 2 collections: 2
Managed memory:    59,897,208 bytes
```

Every sweep promoted survivors upward, because a live reference (`list`)
kept them reachable. Same shape of workload, opposite outcome — the only
variable is whether something still points at the object when the sweep
runs.

## A Debug/Release trap

Benchmarking this matters only in `Release`. In `Debug`, the JIT keeps a
local variable rooted for its *entire lexical scope* (so a debugger can
still inspect it), even past its last real use. In `Release`, the JIT ends a
local's actual lifetime at its last use — so a `List` nobody touches again
after a loop can be fully collected by a later `GC.Collect()`, even though
the variable is technically still "in scope." Measuring GC behavior in
`Debug` measures an artifact of the debugger, not your program.

## Takeaways

- Gen 0 collections firing constantly in a running app is normal, expected,
  and cheap.
- Rising Gen 2 counts are the real signal to investigate — something is
  holding references longer than it should: an unbounded cache, a forgotten
  event subscription, a static list that only ever grows.
- Promotion is a strict rule, not a heuristic: survive a sweep, move up
  exactly one generation.
- Always benchmark GC/memory behavior in `Release`, never `Debug`.
