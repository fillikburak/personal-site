---
title: StringBuilder vs string concatenation
authors: [burak]
tags: [dotnet, memory]
---

Notes on why building a string with `+=` in a loop is quadratic, and why `StringBuilder` isn't just a style preference.

{/* truncate */}

## Strings are immutable

Every `string` in .NET is immutable — once created, its contents never change. `a += "x"` doesn't modify `a`'s existing character buffer; it allocates a **brand new** string containing the old contents plus the addition, then points `a` at the new one. The old string object is discarded.

This is provable directly:

```csharp
string a = "hello";
string d = a;              // d and a point to the SAME object
d += " world";              // d now points to a NEW object
Console.WriteLine(a);       // still "hello" — untouched
```

If `a` and `d` shared the same object and that object were mutated in place, `a` would show `"hello world"` too. It doesn't — proof that `+=` never mutates, only reassigns.

## Why immutability, not just "how it's designed"

Three converging reasons:

- **String interning.** The CLR shares identical string literals across a program to save memory (`"hello"` used in two places is often the *same* object). A mutable string would mean editing one literal silently corrupts every other place using it.
- **Dictionary/HashSet keys.** Strings are used as hash keys constantly. A mutable key that changes after insertion breaks the hash table's internal invariants — the entry becomes unfindable.
- **Thread safety.** An immutable object can be shared across threads with zero locking, because nothing can change underneath a reader.

## The cost, measured

Building a 20,000-character string two ways, in `Release`:

```
--- string += in a loop ---
Elapsed: 30ms
Gen0: 47  Gen1: 4  Gen2: 0

--- StringBuilder ---
Elapsed: 0ms
Gen0: 47  Gen1: 4  Gen2: 0   ← unchanged
```

The `+=` loop alone triggered 47 gen0 collections and 4 gen1 promotions — because each of the 20,000 iterations discarded the old string and allocated a new, slightly longer one, **copying every previous character again**. That's O(n²) total copying for n appends.

`StringBuilder` did the identical job — appended 20,000 characters — and the GC counters didn't move. Its internal buffer grows in chunks (roughly doubling on overflow), so it reallocates a handful of times total instead of once per append.

## Takeaways

- `+=` in a loop is O(n²): total work grows quadratically with iteration count.
- `StringBuilder` is O(n): amortized constant-time appends via buffer growth.
- The break-even point isn't "large strings only" — even modest loops (dozens of iterations) show measurable GC pressure from `+=` that `StringBuilder` avoids entirely.
