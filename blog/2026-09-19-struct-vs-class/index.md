---
title: struct vs class
authors: [burak]
tags: [dotnet, memory]
---

Notes on the actual difference between `struct` and `class` — copy semantics, where the data really lives, boxing, and when to reach for which.

{/* truncate */}

## The core difference is copying, not location

`class` is a reference type: a variable holds an 8-byte pointer to an object on the heap. `struct` is a value type: a variable holds the *entire value itself*. This is provable directly:

```csharp
var classPoint1 = new PointClass(1, 1);
var classPoint2 = classPoint1;   // reference copied — both point to the SAME object
classPoint2.X = 99;
// classPoint1.X is now 99 too — they share one object

var structPoint1 = new PointStruct(1, 1);
var structPoint2 = structPoint1; // entire value copied — two independent copies
structPoint2.X = 99;
// structPoint1.X is still 1 — untouched
```

## "Value type" doesn't mean "always on the stack"

This is the common misconception. A `struct`'s data lives wherever its *container* lives — not in a fixed place:

| Where the struct is | Where it lives |
|---|---|
| A lone local variable in a method | Stack |
| An element of an array | Heap (embedded in the array's block — arrays are always heap objects) |
| A field of a class | Heap (embedded in that class instance) |
| Assigned to `object` or an interface (**boxing**) | Heap — a brand new, independent copy |

A `PointStruct[]` array is heap-allocated (all arrays are), and the structs are embedded directly inside that one block — no per-element allocation. A `PointClass[]` array is also heap-allocated, but it only holds fixed-size references; each element is a *separate* heap allocation elsewhere.

Measured for 1,000,000 elements, in `Release`:

```
--- class Point[] ---
Allocation: 49ms
Gen0: 3  Gen1: 2  Gen2: 1
Memory: 48,844,896 bytes

--- struct Point[] ---
Allocation: 1ms
Gen0: 3  Gen1: 2  Gen2: 1   ← unchanged
Memory: 56,844,920 bytes    (+8MB — just the array itself)
```

`class` triggered real GC pressure (1,000,000 separate object allocations). `struct` triggered none — the array is one contiguous block, filling it is just writing bytes into existing slots.

## Boxing: an easy-to-miss heap allocation

Assigning a struct to `object` (or an interface) creates an independent heap copy:

```csharp
var s = new PointStruct(1, 1);
object boxed = s;  // boxing — new heap copy
s.X = 99;
// boxed still shows (1, 1) — proven independent
```

The cost is real and easy to trigger by accident (`List<object>`, non-generic collections, interface parameters):

```
List<PointStruct> (no boxing):  11ms,  0 GC collections,  8,069,512 bytes
List<object> (each boxed):      36ms,  Gen0:3 Gen1:2 Gen2:1,  48,837,664 bytes
```

Boxed structs behave *exactly* like the `class` array above — because that's effectively what boxing does under the hood: wraps the value in a heap object.

## Stack vs heap, one level up

A heap object's size must be knowable in a form the array's fixed-width slots can hold. References are always the same size (8 bytes) regardless of what they point to — which is *why* class instances can vary wildly in size and still sit in a uniform array: the array never holds the object, only a same-sized pointer to it. A `struct[]` can't mix element sizes the same way, because the array embeds the data directly.

Per-thread stacks matter here too: each thread gets its own independent stack region, sized however you configure it. Recursing on a thread with a 64KB stack overflowed at ~depth 900; the same recursion on the default thread stack reached depth ~104,500 before overflowing — a ~100x difference, purely from stack size, with nothing else about the code changed.

## When to use which

**Reach for `struct` when:** the type represents a single small value (a point, a color, a money amount), it's immutable, it has no identity, and you'll create *many* of them — especially in arrays or hot loops. Microsoft's rule of thumb: keep it under ~16 bytes, since larger structs make every copy (assignment, parameter pass) proportionally more expensive.

**Reach for `class` when:** the type has identity (two instances with equal fields are still conceptually different — a `Customer`, an `Order`), it's larger, it needs inheritance/polymorphism, or it represents shared mutable state meant to be observed through references (a cache, a service, anything registered in DI).

Default to `class`. Move to `struct` only once profiling shows the allocation cost actually matters.
