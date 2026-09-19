---
title: Source generators
authors: [burak]
tags: [dotnet]
---

Notes on what a source generator actually does, using .NET's built-in `[GeneratedRegex]` as a concrete example.

{/* truncate */}

## What a source generator is

Normally the compiler only compiles the code you typed. A source generator is a plugin that runs *during compilation*, inspects your code, and writes **additional** C# source based on what it finds — which then gets compiled right alongside your own code, as if you'd typed it yourself.

This all happens before the program ever runs. By the time your app executes, the generated code is just ordinary, already-compiled code — no runtime cost to produce it.

Contrast with **reflection**, the older approach many libraries use: reflection inspects code structure *while the program is running*, every time it's needed. A source generator does that inspection once, at compile time, and bakes the answer directly into the binary.

## A real example: `[GeneratedRegex]`

```csharp
partial class Program
{
    [GeneratedRegex(@"\d+")]
    private static partial Regex GeneratedNumberRegex();
}
```

The method has no body — it ends in `;`. Two things make this legal:

- `partial` means "part of this method is defined elsewhere."
- `[GeneratedRegex(...)]` is the instruction telling the generator what to produce for that "elsewhere."

The generator writes the missing body into a separate file, found under `obj/` when `EmitCompilerGeneratedFiles` is enabled:

```csharp
private static partial Regex GeneratedNumberRegex()
    => global::System.Text.RegularExpressions.Generated.GeneratedNumberRegex_0.Instance;
```

It also emits a full custom `Regex` subclass with hand-written-equivalent matching logic for that exact pattern — not a general-purpose interpreter, code specific to `\d+`.

## Measuring the difference

The naive comparison (creating one `Regex` instance before the loop, reusing it 200,000 times) showed almost no difference — because the expensive part, parsing the pattern, only happened once either way. The real cost shows up when construction isn't cached:

```
--- new Regex(...) recreated every iteration ---
Elapsed: 217ms

--- GeneratedNumberRegex() — already built at compile time ---
Elapsed: 24ms
```

`new Regex(@"\d+")` inside the loop re-parses the pattern from scratch 200,000 times. `GeneratedNumberRegex()` just returns a cached singleton — the "parse the pattern" work happened exactly once, at compile time, not at all at runtime.

## Takeaway

A source generator trades "figure this out every time it's needed" for "figure it out once, before the program even starts." The win isn't necessarily raw per-call speed for something already cached — it's eliminating the up-front cost entirely, which matters most for one-off or rarely-reused work, and for Native AOT scenarios where runtime code generation isn't available at all.
