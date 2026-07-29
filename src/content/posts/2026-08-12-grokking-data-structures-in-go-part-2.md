---
title: "Grokking Data Structures in Go — Part 2: Static & Unsorted Arrays"
pubDate: 2026-08-12
tags: ["engineering", "go", "algorithms", "data-structures"]
---

# The most primitive thing there is

If [Part 1](/posts/2026-08-05-grokking-data-structures-in-go-part-1/) was the "why," this is the "let's actually build
something." Chapter 2 of [Grokking Data Structures][grokking-ds] starts at the bottom: the **static array**. Fixed size,
contiguous memory, reach any slot by index in O(1). It's the thing almost every other data structure is secretly built
on top of, so it's the right place to start.

The one idea that runs through the entire chapter — and honestly through every array-backed structure you'll ever
write — is the split between **size** and **capacity**.

- **Capacity** is how many slots *exist*. You decide it up front and it never changes.
- **Size** is how many slots are *actually in use* right now.

Those are not the same number, and conflating them is where the bugs live. If you've written Go for any length of time
this should feel familiar — it's the exact same distinction as a slice's `len` versus its `cap`. A `make([]int, 10)`
gives you ten real, indexable, zeroed-out slots. The unused tail isn't "empty," it's full of zeroes pretending to be
nothing, and if you loop to `len(slice)` instead of your logical `Size` you'll happily read that junk.

## Unsorted arrays: cheap writes by not caring about order

The gem of this chapter is the **unsorted array**. Its entire contract is "I'll remember what you put in me." That's it.
No ordering promise. And that one refusal is exactly what makes it fast to write to.

Here's the whole thing in Go. I dropped the book's separate `MaxSize` field because `len(slice)` already *is* the
capacity — no reason to track it twice.

```go
package unsorted_arrays

import (
	"errors"
	"fmt"
)

type UnsortedArray[T comparable] struct {
	slice []T
	Size  int
}

func CreateUnsortedArray[T comparable](maxSize int) UnsortedArray[T] {
	return UnsortedArray[T]{slice: make([]T, maxSize), Size: 0}
}

// Insert — write at the first free slot. O(1); no order is promised.
func (ua *UnsortedArray[T]) Insert(element T) error {
	if ua.Size >= len(ua.slice) {
		return errors.New("array is already full")
	}
	ua.slice[ua.Size] = element
	ua.Size++
	return nil
}

// Delete — plug the hole with the last live element. O(1).
func (ua *UnsortedArray[T]) Delete(idx int) error {
	if ua.Size == 0 {
		return errors.New("delete from an empty array")
	}
	if idx < 0 || idx >= ua.Size {
		return fmt.Errorf("index %d out of range", idx)
	}
	ua.slice[idx] = ua.slice[ua.Size-1] // swap-with-last
	ua.Size--
	return nil
}

// Find — linear scan over the live region [0, Size). O(n).
func (ua *UnsortedArray[T]) Find(target T) int {
	for i := 0; i < ua.Size; i++ {
		if ua.slice[i] == target {
			return i
		}
	}
	return -1
}
```

A couple of things worth saying out loud.

**`[T comparable]`** is the right constraint here and no tighter. `Find` needs `==`, and `comparable` is exactly "the
types you can use `==` on." Don't reach for anything fancier than the operation actually requires.

**`Insert` is O(1)** because we don't care about order — we just drop the new value at index `Size` and bump the counter.
No shifting, no searching for the right spot.

**`Delete` is the trick to remember.** The naive way to delete from the middle of an array is to shift everything after
the hole one slot to the left — that's O(n). But if you don't care about order, you don't have to. You just grab the
**last** live element and drop it into the hole, then shrink `Size` by one. O(1). That "swap-with-last" move shows up
everywhere once you know to look for it — popping from a heap, fast-removing from a slice, all of it.

The catch, and it's a fair one: **delete reorders your data.** Deleting index 0 of `[1 2 3]` leaves you with `[3 2]`, not
`[2 3]`. That's not a bug, it's the deal you signed. The contract was "membership, not order," and this is what you
traded away to get the cheap delete.

**`Find` is O(n)** — a plain linear scan. That's the price of no ordering: with nothing sorted, you have no better
option than looking at everything. (Next chapter is where we pay the opposite way — sort the thing, and search gets
cheap while insert gets expensive.)

## Tests, because "it compiles" isn't "it works"

I said in Part 1 that I wasn't going to post code without tests, so here we go. The thing I most want the tests to pin
down is the weird stuff — that `Insert` keeps arrival order (not sorted order), and that `Delete` genuinely does the
swap-with-last reorder. If a test ever tells me `Delete(0)` on `[1 2 3]` gives `[2 3]`, then either my head or my code is
wrong, and I want to know immediately.

These are white-box tests — same package, so they can peek at the unexported `slice` and `Size`. The `live()` and
`build()` helpers live in the test file and never ship.

```go
package unsorted_arrays

import (
	"slices"
	"testing"
)

func (ua *UnsortedArray[T]) live() []T { return ua.slice[:ua.Size] }

func build(t *testing.T, capacity int, vals ...int) *UnsortedArray[int] {
	t.Helper()
	ua := CreateUnsortedArray[int](capacity)
	for _, v := range vals {
		if err := ua.Insert(v); err != nil {
			t.Fatalf("Insert(%d): %v", v, err)
		}
	}
	return &ua
}

func TestInsertKeepsOrderOfArrival(t *testing.T) {
	ua := build(t, 8, 5, 1, 4, 2)
	if got, want := ua.live(), []int{5, 1, 4, 2}; !slices.Equal(got, want) {
		t.Errorf("live = %v, want %v (insertion order, NOT sorted)", got, want)
	}
}

func TestInsertFull(t *testing.T) {
	ua := build(t, 2, 1, 2)
	if err := ua.Insert(3); err == nil {
		t.Fatal("expected error inserting into a full array")
	}
}

func TestDeleteSwapsWithLast(t *testing.T) {
	// deleting index 0 of [1 2 3] moves the last element (3) into the hole
	ua := build(t, 8, 1, 2, 3)
	if err := ua.Delete(0); err != nil {
		t.Fatalf("Delete(0): %v", err)
	}
	if got, want := ua.live(), []int{3, 2}; !slices.Equal(got, want) {
		t.Errorf("live = %v, want %v (swap-with-last reorders)", got, want)
	}
}

func TestDeleteOutOfRange(t *testing.T) {
	ua := build(t, 8, 1, 2, 3)
	for _, idx := range []int{-1, 3, 99} {
		if err := ua.Delete(idx); err == nil {
			t.Errorf("Delete(%d): expected error", idx)
		}
	}
}

func TestFind(t *testing.T) {
	ua := build(t, 8, 5, 1, 4, 2)
	tests := []struct {
		target, want int
	}{
		{5, 0}, {4, 2}, {2, 3}, {99, -1},
	}
	for _, tt := range tests {
		if got := ua.Find(tt.target); got != tt.want {
			t.Errorf("Find(%d) = %d, want %d", tt.target, got, tt.want)
		}
	}
}
```

And the part that makes it real:

```
$ go test -v ./...
=== RUN   TestInsertKeepsOrderOfArrival
--- PASS: TestInsertKeepsOrderOfArrival (0.00s)
=== RUN   TestInsertFull
--- PASS: TestInsertFull (0.00s)
=== RUN   TestDeleteSwapsWithLast
--- PASS: TestDeleteSwapsWithLast (0.00s)
=== RUN   TestDeleteOutOfRange
--- PASS: TestDeleteOutOfRange (0.00s)
=== RUN   TestFind
--- PASS: TestFind (0.00s)
PASS
ok  	unsorted_arrays	0.389s
```

## What I'm taking away

The whole chapter really comes down to one sentence: **an unsorted array is cheap writes and expensive search.** O(1) to
insert, O(1) to delete, O(n) to find. And the reason the writes are cheap is the exact same reason the search is
expensive — there's no order to maintain, which means nothing to shift on a write, but also nothing to exploit on a
read.

That's the trade-off framing from Chapter 1 showing up in concrete code for the first time. There's no free lunch. You
picked cheap writes, so you paid for it at search.

## Fin

Next chapter flips the whole thing on its head: keep the array **sorted**, and suddenly search drops to O(log n) with
binary search — but every insert turns into an O(n) shuffle to keep the order intact. Same memory, opposite bet. That's
Part 3.

[grokking-ds]: https://www.manning.com/books/grokking-data-structures
