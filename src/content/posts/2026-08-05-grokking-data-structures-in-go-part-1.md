---
title: "Grokking Data Structures in Go — Part 1: Why Bother, and Chapter 1"
pubDate: 2026-08-05
tags: ["engineering", "go", "algorithms", "data-structures"]
---

# Why am I reading a beginner data structures book?

I've been writing software professionally for around fifteen years. On paper, re-reading a beginner-friendly data
structures book is not a great use of my time. I know what an array is. I know what a hash table is. I can reach for the
right container without thinking about it most days. So why in the hell am I sitting down with
[Grokking Data Structures][grokking-ds] by Marcello La Rocca and working through it from chapter one?

A couple of reasons, and they're both honest.

The first is that I've been grinding interview-style algorithm problems on the side, and the thing that keeps biting me
isn't the algorithms — it's the **mechanics**. The little stuff. Off-by-one on a loop bound, reaching for an array index
when I meant a value, forgetting that a freshly allocated slice is full of zeroes. None of that is "hard," but it's the
kind of thing that only gets fast and automatic with reps. Going back to the absolute fundamentals and rebuilding them
by hand is one of the best ways I know to make that friction disappear.

The second reason is the one that actually gets me out of bed for this stuff: I just like understanding how things work
all the way down. It's the same itch that made me
[build an 8-bit computer on breadboards](/posts/2024-08-23-8-bit-breadboard-computer/). Most of us spend our careers
standing on top of a giant stack of abstractions that somebody else built, and every once in a while it's good for the
soul to climb down a few layers and remember what's actually holding you up.

## The twist: it's a Python book, I'm writing Go

Here's the part that makes this more than a passive read. The book's examples are in **Python**. I'm re-implementing
every structure in **Go** as I go.

That's not me being difficult for the sake of it. Reading code is easy and a little bit of a lie — you nod along, it all
makes sense, and then you close the book and couldn't reproduce a line of it. Rebuilding each structure in a different
language forces me to actually understand the idea instead of memorizing the syntax, and as a bonus I get to keep
drilling the exact Go mechanics that keep tripping me up. Two birds.

So this is going to be a little series. One post per chunk of the book, roughly, with the real Go code and — this part
matters to me — the **tests**, because a data structure you haven't tested is a data structure you're just hoping works.

## What Chapter 1 is actually about

Chapter 1 doesn't build anything yet. It's the "why should you care" chapter, and the framing it lands on is the one
worth carrying through the whole book:

> A data structure is data plus the set of operations you allow on it — and choosing one is really choosing **which
> operations you want to be cheap**.

That's it. That's the whole game. There is no "best" data structure, only trade-offs. A structure that makes lookups
lightning fast usually pays for it somewhere else — slower inserts, more memory, whatever. The skill isn't memorizing
containers, it's being able to look at a problem, figure out which operations you'll do a thousand times and which
you'll do once, and pick the thing that makes the thousand cheap.

If you want to be pedantic about it in Go, a data structure is really the pairing of some stored data with a set of
methods — an interface plus the thing that satisfies it:

```go
// A tiny "collection of ints" — the operations are the contract;
// how they're stored (and what each one costs) is the whole rest of the book.
type IntCollection interface {
	Insert(x int) error
	Delete(i int) error
	Find(x int) int // index, or -1
}
```

Every chapter from here is really just a different set of answers to "okay, but what does each of those cost, and what
did we give up to get it?"

## Next up

Chapter 2 is where we actually build something: **static arrays**, and the first real trade-off — an unsorted array that
buys you dirt-cheap writes by refusing to promise any order. That's the next post, and it's where the Go and the tests
start showing up for real.

## Fin

Not much code this time, on purpose — this one's the "why." But I'm genuinely looking forward to this. There's something
grounding about going back to the bottom of the stack on purpose, especially fifteen years in. Curiosity doesn't have an
expiration date, and neither do the fundamentals.

[grokking-ds]: https://www.manning.com/books/grokking-data-structures
