---
title: "Grokking Data Structures in Go — Part 3: Sorted Arrays & Binary Search"
pubDate: 2026-08-19
tags: ["engineering", "go", "algorithms", "data-structures"]
---

# Same memory, opposite bet

[Part 2](/posts/2026-08-12-grokking-data-structures-in-go-part-2/) left off with the unsorted array: cheap writes,
expensive search. Chapter 3 of [Grokking Data Structures][grokking-ds] takes the exact same block of memory and makes
one small promise about it — **it's always sorted** — and that single promise flips the entire cost profile on its head.

Nothing about the storage changes. It's still a fixed, contiguous chunk with a size-versus-capacity split. The only new
thing is an invariant: after every operation, `slice[0] <= slice[1] <= … <= slice[Size-1]`. That's the whole data
structure. And everything it costs you, and everything it buys you, falls straight out of keeping that promise.

## Binary search — the reason you'd bother

The payoff for keeping things sorted is that you can **binary search**. Instead of walking the whole array looking for a
value, you look at the middle element. One comparison tells you which *half* the target has to be in, so you throw the
other half away. Then you do it again. Every step halves the search space, which is `log₂(n)` steps instead of `n`. For
a million elements that's the difference between ~20 comparisons and a million.

```go
// Find — binary search over [0, Size). Returns index or -1. O(log n).
func (sa *SortedArray[T]) Find(target T) int {
	lo, hi := 0, sa.Size-1
	for lo <= hi { // <= so the final one-element window IS checked
		mid := lo + (hi-lo)/2 // not (lo+hi)/2 — avoids integer overflow
		switch {
		case sa.slice[mid] == target:
			return mid
		case sa.slice[mid] < target:
			lo = mid + 1 // target is in the right half
		default:
			hi = mid - 1 // target is in the left half
		}
	}
	return -1
}
```

Binary search is one of those things that looks trivial and then eats an afternoon when you get it subtly wrong. The
entire bug surface is two lines:

- **`for lo <= hi`, not `lo < hi`.** With `<`, when the window shrinks to a single element you exit *before* checking it,
  and you'll miss values that are actually there.
- **`mid := lo + (hi-lo)/2`, not `(lo+hi)/2`.** Adding two large indices can overflow. It won't bite you on a toy array,
  but it's the correct idiom, so just write it that way every time and never think about it again.

Get those two right and the rest is bookkeeping.

## The bill: writes are now O(n)

Here's the catch. That sorted invariant isn't free — you pay for it on every write.

**Insert** can't just drop the value at the end anymore. It has to go in the one spot that keeps things ordered, which
means shifting every larger element one slot to the right to open a hole. If you look closely, this loop is *literally*
one pass of insertion sort:

```go
// Insert — keep sorted by shifting larger elements right. O(n).
func (sa *SortedArray[T]) Insert(element T) error {
	if sa.Size >= len(sa.slice) {
		return errors.New("array is already full")
	}
	i := sa.Size
	for i > 0 && sa.slice[i-1] > element { // shift the tail right...
		sa.slice[i] = sa.slice[i-1]
		i--
	}
	sa.slice[i] = element // ...then drop element into the opened hole
	sa.Size++
	return nil
}
```

**Delete** loses the slick swap-with-last trick from the last post. Plugging a hole with the last element would scramble
the order, and order is the whole point now — so it has to shift the tail left to close the gap. O(n) again.

```go
// Delete — close the gap by shifting the tail left. O(n).
func (sa *SortedArray[T]) Delete(idx int) error {
	if sa.Size == 0 {
		return errors.New("delete from an empty array")
	}
	if idx < 0 || idx >= sa.Size {
		return fmt.Errorf("index %d out of range", idx)
	}
	for i := idx; i < sa.Size-1; i++ {
		sa.slice[i] = sa.slice[i+1] // shift left to preserve order
	}
	sa.Size--
	return nil
}
```

One more, because it's a nice little lesson in not repeating yourself. If you want to delete **by value** instead of by
index, you don't write a second search — you already have one. `DeleteByValue` is just `Find` plus the same left-shift:

```go
// DeleteByValue — locate with Find (O(log n)), then the same left-shift (O(n)). No-op if absent.
func (sa *SortedArray[T]) DeleteByValue(element T) {
	idx := sa.Find(element) // reuse Find — don't paste a second binary search
	if idx == -1 {
		return
	}
	for i := idx; i < sa.Size-1; i++ {
		sa.slice[i] = sa.slice[i+1]
	}
	sa.Size--
}
```

I'll be honest — my first pass at this had a second method called `Search` that was a byte-for-byte copy of `Find`. Two
names, one function. Writing the tests is what made me delete it. Which is a decent segue.

## The tests

Same deal as last time — white-box table tests, and I care most about the cases that would quietly lie to me. Does
binary search actually find the first, middle, and last elements, and correctly *not* find a value that falls in a gap?
Does deleting by value on an array with duplicates remove exactly one of them? Here's the shape of it (trimmed — the real
file has around thirty cases across insert, find, both deletes, and a churn test that asserts the array is still sorted
afterward):

```go
func TestFind(t *testing.T) {
	sa := build(t, 16, 2, 4, 6, 8, 10) // distinct + sorted → deterministic index
	tests := []struct {
		name   string
		target int
		want   int // index, -1 if absent
	}{
		{"first", 2, 0},
		{"middle", 6, 2},
		{"last", 10, 4},
		{"absent below", 1, -1},
		{"absent above", 99, -1},
		{"absent gap", 5, -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := sa.Find(tt.target); got != tt.want {
				t.Errorf("Find(%d) = %d, want %d", tt.target, got, tt.want)
			}
		})
	}
}

// DeleteByValue on a value with duplicates removes exactly one occurrence.
func TestDeleteByValueDuplicates(t *testing.T) {
	sa := build(t, 16, 1, 2, 2, 2, 3)
	sa.DeleteByValue(2)
	if got, want := sa.live(), []int{1, 2, 2, 3}; !slices.Equal(got, want) {
		t.Errorf("live = %v, want %v (one occurrence removed)", got, want)
	}
}

// After arbitrary insert/delete churn, the invariant still holds.
func TestInvariantHolds(t *testing.T) {
	sa := build(t, 32, 9, 3, 7, 1, 5, 8, 2, 6, 4, 0)
	sa.DeleteByValue(5)
	_ = sa.Delete(0)
	_ = sa.Insert(5)
	if !slices.IsSorted(sa.live()) {
		t.Errorf("invariant broken: live = %v is not sorted", sa.live())
	}
}
```

```
$ go test ./...
ok  	sorted-arrays	0.348s
```

That `TestInvariantHolds` one is my favorite kind of test — it doesn't check a specific value, it checks that the
*promise* survived a bunch of poking. If the sorted invariant is the whole data structure, then "is it still sorted after
I mess with it" is the realest assertion I can make.

## The trade-off, side by side

Two chapters, same memory, opposite bets:

| Operation | Unsorted (Part 2) | Sorted (Part 3) |
| --- | --- | --- |
| Find(x) | O(n) linear scan | **O(log n)** binary search |
| Insert(x) | O(1) write at end | O(n) shift right |
| Delete(i) | O(1) swap-with-last | O(n) shift left |
| Min / Max | O(n) scan | **O(1)** (`slice[0]` / `slice[Size-1]`) |

Sorted wins hard when you read and search way more than you write — think of something like a lookup table you build
once and then query forever. Unsorted (or, honestly, a hash map) wins when writes dominate. Neither one is "better." They
just made different bets about which operation you'd do the most.

## Fin

Two things really stuck with me from this chapter. One: binary search is completely trivial and completely easy to get
wrong, and the fix is to just memorize the two lines that matter. Two — and this is the thread through the whole book so
far — **maintaining an invariant costs you something, and that cost is exactly what buys you the speed somewhere else.**
Sorted search is cheap *because* insert does the work of keeping things ordered. There's no free lunch. There never is.

Next up the book leaves fixed-size storage behind and gets into dynamic arrays — the "how does a slice actually grow"
trick, capacity doubling, amortized O(1) append. That's the good stuff, and it's the thing Go's slices are doing under
you every single day.

[grokking-ds]: https://www.manning.com/books/grokking-data-structures
