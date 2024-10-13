---
layout: post
title: "Go: Generics"
date: 2024-10-11
categories: blog engineering go
published: false
---

# Go: Generics

Generics in programming come in a variety of different flavors, and for awhile Go did officially have generics in the
language. Despite whether your for or against generics, they are part of the language since version `1.18`. If you're
not familiar with generics, they're a way of writing code that is independent of the specific type being used. To be
honest, when generics were first being talking about I was definitely against adding them to the language. My opinion
hasn't changed much, but I do see how they can make some situations a little less verbose and repetitive. Either way,
we'll explore what generics are in Go and how we can use them.

## Type Parameters

Functions and types now have the ability to have type parameters. At first glace, the syntax of this might look a bit
odd.

```go
import "golang.org/x/exp/constraints"

func Min[T constraints.Ordered](x, y T) T {
    if x < y {
        return x
    }
    return y
}

```

When calling a generic function, you can provide the type argument which would look something like the following:

```go
package main

import (
	"fmt"

	"golang.org/x/exp/constraints"
)

func main() {
	var a int
	var b int
	a = 20
	b = 25
	min := Min[int](a, b)
	fmt.Println(min)

	var c float32
	var d float32
	c = 3.14
	d = 6.28
	minf := Min[float32](c, d)
	fmt.Println(minf)
}

func Min[T constraints.Ordered](x, y T) T {
	if x < y {
		return x
	}
	return y
}

```

Some odd looking syntax, but I'm sure you can figure out what's going on here. We are just passing in the type prior
to the arguments of the function letting the compiler know that we'll be using this generic with a particular type;
however, the types can actually be implicitly inferred by the types that we are passing in to the function. This means,
we don't actually need to pass in the type constraint.

```go
package main

import (
	"fmt"

	"golang.org/x/exp/constraints"
)

func main() {
	var a int
	var b int
	a = 20
	b = 25
	min := Min(a, b)
	fmt.Println(min)

	var c float32
	var d float32
	c = 3.14
	d = 6.28
	minf := Min(c, d)
	fmt.Println(minf)
}

func Min[T constraints.Ordered](x, y T) T {
	if x < y {
		return x
	}
	return y
}

```

If we've been keen this far, we might have noticed that there is a package `constraints` that we've been using. What's
that all about? Well, along with having generics in a language, Go needed a way to group types together in a nice way.
Out of all of the features introduced in `1.18`, _type sets_ are definitely the neatest.

## Type sets

In Go, when using generics the types we're passing to the generics are called _type constraints_. These
_type constraints_ must be defined `interface` types; however, prior to the addition of generics interfaces in Go were
just function signatures that a concrete type could implement to implicitly be consider a type of that interface. For
more information, check out the post I did on [interfaces](/blog/engineering/go/2024/10/06/go-interfaces.html). In
order to help group types together, interfaces in Go were looked at in a new way. This new way was that an interface
can define a set of types with some added syntax.

The newly added syntax looks like the bitwise operators `|` and `~`; however, in this particular use case the `|`
token is used like union of the types and the `~` token means the set of all types whose underlying type is of that
particular referred type. The `constraints` package actually wraps up some of the most common ones we might want to
use. For instance in our previous code block, we used `constraints.Ordered` which is really defined as the following:

```go
type Ordered interface {
	Integer | Float | ~string
}

```
