---
title: Span<T>
authors: [burak]
tags: [dotnet, memory]
---

Notes on `Span<T>` — a view into existing memory with zero copying, and why it's forced to live on the stack.

{/* truncate */}

## What it actually is

`Span<T>` is a tiny struct holding just a pointer to the start of some memory and a length — roughly `{ ref T _reference; int _length; }`. It represents a "window" into a string, array, or stack-allocated buffer, without ever copying the underlying data.

## Measured: parsing with vs without allocation

Parsing `"1,2,3,...,10"` 200,000 times two ways, in `Release`:

```
--- string.Split (each token is a substring, allocates) ---
Elapsed: 72ms
Gen0: 8  Gen1: 0  Gen2: 0

--- ReadOnlySpan<char> slicing ---
Elapsed: 28ms
Gen0: 8  Gen1: 0  Gen2: 0   ← unchanged
```

`Split` allocates a `string[]` plus a fresh substring per token every call — 2,000,000+ short-lived allocations across the run. Slicing a `ReadOnlySpan<char>` (`remaining[..commaIndex]`) never allocates: the slice is just a new pointer + length referencing the *original* string's existing memory. `int.Parse` accepts a span directly, so no intermediate string is ever created at all.

## Why it's forced onto the stack

`Span<T>` is declared as a `ref struct`, and the compiler enforces a hard rule: it can never be a field of a regular class, a generic type argument, boxed, or stored in a collection. Proof:

```csharp
class Holder
{
    public Span<int> Data;
}
// error CS8345: Field or auto-implemented property cannot be of type 'Span<int>'
// unless it is an instance member of a ref struct.
```

The reason is memory safety. A `Span<T>` can point into the *middle* of a managed object (a string's internal buffer, for instance). .NET's GC periodically **compacts** the heap — moving objects to reduce fragmentation. The GC already tracks and updates pointers that live on the stack during this process, but doing the same for arbitrary interior pointers scattered across the heap would be far more expensive to support safely. Restricting `Span<T>` to the stack sidesteps the problem entirely: there's no interior pointer on the heap to go stale.

## Takeaway

`Span<T>` is the tool for "look at this data without copying it" — parsing, string processing, byte buffers, anything doing many small slices in a hot path. The stack-only restriction isn't a limitation to work around; it's what makes the zero-copy guarantee safe in the first place.
