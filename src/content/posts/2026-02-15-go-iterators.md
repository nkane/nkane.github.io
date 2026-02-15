---
title: "Go (1.23): Iterators"
pubDate: 2026-02-15
tags: ["engineering", "go"]
---

# Go (1.23): Iterators

Iterators are one of those things that have been around forever in other languages, and Go has finally decided to add
official support for them in version `1.23`. For years, Go developers have been dealing with the somewhat clunky pattern
of channels for iteration or just writing explicit loops everywhere. To be honest, I was a bit skeptical when I first
heard about this addition. Go has always been about simplicity, and adding iterator support felt like it might be
creeping towards the complexity of other languages. But after actually using them, I can see the appeal.

## What the hell is an iterator anyway?

If you've used languages like Python, Rust, or even JavaScript, you've probably used iterators without thinking too
much about it. An iterator is essentially a way to traverse through a collection of elements one at a time without
exposing the underlying structure of the collection. It's a pattern that decouples the logic of iteration from the
data structure itself.

In Go, iterators are implemented as functions that take a `yield` function as an argument. This `yield` function is
called for each element in the sequence, and if it returns `false`, iteration stops. Let's look at the basic function
signatures that Go 1.23 introduces in the `iter` package:

```go
type Seq[V any] func(yield func(V) bool)
type Seq2[K, V any] func(yield func(K, V) bool)
```

`Seq` is for single-value sequences (like a slice of integers), and `Seq2` is for key-value pairs (like iterating over
a map). The beauty of this design is that it works seamlessly with Go's existing `for range` loops.

## Basic Iterator Usage

Let's start with a simple example. Here's how you might create an iterator that yields the numbers from 0 to n:

```go
package main

import (
	"fmt"
	"iter"
)

func Range(n int) iter.Seq[int] {
	return func(yield func(int) bool) {
		for i := 0; i < n; i++ {
			if !yield(i) {
				return
			}
		}
	}
}

func main() {
	for v := range Range(5) {
		fmt.Println(v)
	}
}
```

Running this will output:

```
0
1
2
3
4
```

The `for range` loop automatically handles calling our iterator function and passing in a yield function that receives
each value. When we break out of the loop early, the yield function returns `false`, and our iterator knows to stop.

## Iterating Over Custom Data Structures

The real power of iterators comes when you're working with custom data structures. Let's say you have a binary tree
and you want to iterate over its elements in-order:

```go
package main

import (
	"fmt"
	"iter"
)

type Node[T any] struct {
	Value T
	Left  *Node[T]
	Right *Node[T]
}

func (n *Node[T]) InOrder() iter.Seq[T] {
	return func(yield func(T) bool) {
		if n == nil {
			return
		}
		for v := range n.Left.InOrder() {
			if !yield(v) {
				return
			}
		}
		if !yield(n.Value) {
			return
		}
		for v := range n.Right.InOrder() {
			if !yield(v) {
				return
			}
		}
	}
}

func main() {
	tree := &Node[int]{
		Value: 4,
		Left: &Node[int]{
			Value: 2,
			Left:  &Node[int]{Value: 1},
			Right: &Node[int]{Value: 3},
		},
		Right: &Node[int]{
			Value: 6,
			Left:  &Node[int]{Value: 5},
			Right: &Node[int]{Value: 7},
		},
	}

	for v := range tree.InOrder() {
		fmt.Println(v)
	}
}
```

This outputs:

```
1
2
3
4
5
6
7
```

Without iterators, you'd have to either collect all values into a slice first or use channels (which has its own
overhead and complexity). The iterator approach is clean, composable, and lazy - it only generates values as they're
needed.

## Using Seq2 for Key-Value Pairs

When you need to iterate over key-value pairs, `Seq2` is your friend. Here's an example of an iterator over a map
that filters entries based on some condition:

```go
package main

import (
	"fmt"
	"iter"
)

func FilterMap[K comparable, V any](m map[K]V, predicate func(K, V) bool) iter.Seq2[K, V] {
	return func(yield func(K, V) bool) {
		for k, v := range m {
			if predicate(k, v) {
				if !yield(k, v) {
					return
				}
			}
		}
	}
}

func main() {
	ages := map[string]int{
		"Alice":   25,
		"Bob":     17,
		"Charlie": 30,
		"Diana":   15,
	}

	fmt.Println("Adults only:")
	for name, age := range FilterMap(ages, func(k string, v int) bool {
		return v >= 18
	}) {
		fmt.Printf("%s: %d\n", name, age)
	}
}
```

## The Pull Iterator Pattern

Go 1.23 also introduced a way to convert push-style iterators (which call yield for each element) into pull-style
iterators (where you explicitly ask for the next element). This is useful when you need more control over the
iteration process:

```go
package main

import (
	"fmt"
	"iter"
)

func Range(n int) iter.Seq[int] {
	return func(yield func(int) bool) {
		for i := 0; i < n; i++ {
			if !yield(i) {
				return
			}
		}
	}
}

func main() {
	next, stop := iter.Pull(Range(10))
	defer stop()

	// Get first three values manually
	for i := 0; i < 3; i++ {
		v, ok := next()
		if !ok {
			break
		}
		fmt.Println(v)
	}

	fmt.Println("Stopping early...")
}
```

The `iter.Pull` function returns a `next` function that you call to get the next value, and a `stop` function that
you should call when you're done (typically with `defer`) to clean up any resources. This is particularly useful
when you need to interleave iteration with other logic or when you're implementing something like a parser.

## Composing Iterators

One of the things I actually like about this iterator design is how well they compose. You can chain iterators
together to create pipelines of transformations:

```go
package main

import (
	"fmt"
	"iter"
)

func Map[T, U any](seq iter.Seq[T], f func(T) U) iter.Seq[U] {
	return func(yield func(U) bool) {
		for v := range seq {
			if !yield(f(v)) {
				return
			}
		}
	}
}

func Filter[T any](seq iter.Seq[T], predicate func(T) bool) iter.Seq[T] {
	return func(yield func(T) bool) {
		for v := range seq {
			if predicate(v) {
				if !yield(v) {
					return
				}
			}
		}
	}
}

func Take[T any](seq iter.Seq[T], n int) iter.Seq[T] {
	return func(yield func(T) bool) {
		count := 0
		for v := range seq {
			if count >= n {
				return
			}
			if !yield(v) {
				return
			}
			count++
		}
	}
}

func Range(start, end int) iter.Seq[int] {
	return func(yield func(int) bool) {
		for i := start; i < end; i++ {
			if !yield(i) {
				return
			}
		}
	}
}

func main() {
	// Get first 5 even squares starting from 1
	squares := Map(Range(1, 100), func(x int) int { return x * x })
	evenSquares := Filter(squares, func(x int) bool { return x%2 == 0 })
	firstFive := Take(evenSquares, 5)

	for v := range firstFive {
		fmt.Println(v)
	}
}
```

This outputs:

```
4
16
36
64
100
```

The entire pipeline is lazy - we're ranging from 1 to 100, but we only actually process the values we need to get
the first 5 even squares.

## Standard Library Support

The Go standard library has been updated to support iterators in several packages. The `slices` and `maps` packages
now include functions that work with iterators:

```go
package main

import (
	"fmt"
	"maps"
	"slices"
)

func main() {
	// slices.All returns an iterator over index-value pairs
	s := []string{"a", "b", "c"}
	for i, v := range slices.All(s) {
		fmt.Printf("%d: %s\n", i, v)
	}

	// slices.Values returns an iterator over just the values
	for v := range slices.Values(s) {
		fmt.Println(v)
	}

	// slices.Backward iterates in reverse
	for i, v := range slices.Backward(s) {
		fmt.Printf("%d: %s\n", i, v)
	}

	// maps.Keys and maps.Values return iterators
	m := map[string]int{"one": 1, "two": 2, "three": 3}
	for k := range maps.Keys(m) {
		fmt.Println(k)
	}

	// Collect iterator values back into a slice
	vals := slices.Collect(slices.Values(s))
	fmt.Printf("%v\n", vals)
}
```

The `slices.Collect` function is particularly useful - it takes an iterator and collects all values into a slice.
There's also `maps.Collect` for collecting `Seq2` iterators into maps.

## How It Works Under the Hood

If you're curious about how this magic works (and if you've read my other posts, you know I like to dig into the
internals), the `for range` loop over a function has been added as a special case in the compiler.

When you write:

```go
for v := range someIterator {
    // do something with v
}
```

The compiler transforms this into something roughly equivalent to:

```go
someIterator(func(v T) bool {
    // do something with v
    return true // or false if break is called
})
```

The yield function that gets passed to your iterator is generated by the compiler and handles all the bookkeeping
for `break`, `continue`, and `return` statements within the loop body.

Let's look at what the compiler actually generates. Take this simple example:

```go
package main

import "iter"

func Range(n int) iter.Seq[int] {
	return func(yield func(int) bool) {
		for i := 0; i < n; i++ {
			if !yield(i) {
				return
			}
		}
	}
}

//go:noinline
func Sum(seq iter.Seq[int]) int {
	sum := 0
	for v := range seq {
		sum += v
	}
	return sum
}

func main() {
	_ = Sum(Range(10))
}
```

The generated code for the `Sum` function handles the iterator protocol, setting up the yield function and managing
the control flow. The compiler ensures that any panics are properly handled and that deferred functions in the
iterator are called even if iteration is stopped early.

## Performance Considerations

Iterators in Go aren't free. There's function call overhead for each yielded value, and the closure captures can
add memory allocations. For hot loops over small slices, a traditional `for` loop with an index will still be faster:

```go
// This is faster for simple cases
for i := 0; i < len(slice); i++ {
    // use slice[i]
}

// This has iterator overhead
for v := range slices.Values(slice) {
    // use v
}
```

However, for complex data structures, lazy evaluation, or when you want to compose multiple operations, iterators
provide a cleaner abstraction that's often worth the small performance cost. The key is knowing when to use each
approach.

## When to Use Iterators

After working with Go iterators for a while, here's my take on when they make sense:

1. **Custom data structures**: When you have a tree, graph, or other complex structure that you want to traverse,
   iterators provide a clean interface.

2. **Lazy evaluation**: When you don't want to compute all values upfront, especially if you might stop early.

3. **Composable pipelines**: When you want to chain multiple transformations together.

4. **Abstraction boundaries**: When you want to hide the implementation details of how a collection is stored.

And when you should probably just use a regular loop:

1. **Simple slice iteration**: If you're just iterating over a slice once, stick with the traditional approach.

2. **Performance-critical code**: If every nanosecond counts, benchmark both approaches.

3. **When you need the index**: While `Seq2` can provide indices, a traditional loop is often clearer.

## Fin

Go 1.23's iterators are a solid addition to the language. They're not going to revolutionize how you write Go code,
but they provide a cleaner way to handle certain patterns that were previously awkward. The integration with
`for range` is particularly nice - it feels like a natural extension of the language rather than bolted-on
functionality.

If you're coming from a language with rich iterator support like Rust or Python, you might find Go's iterators a bit
basic in comparison. But that's kind of the Go way - provide just enough to solve the problem without going
overboard. The design is simple, the implementation is straightforward, and it composes well with existing Go
patterns.

The standard library support in `slices` and `maps` packages makes it easy to get started, and writing your own
iterators is pretty simple once you understand the `yield` function pattern. Just remember that iterators aren't
always the best tool for the job - sometimes a plain old `for` loop is exactly what you need.
