---
layout: post
title: "Go: Reflection"
date: 2024-10-12
categories: blog engineering go
published: false
---

# Go: Reflection

The ability for a program to examine its own type structure is typically referred to as
[type introspection][type-introspection]. In Go, the authors have provided us a way to do this in the
[reflect package][reflect-package]. Let's start taking a look at what the reflect package is, how it's used in
particular areas of the standard library, and write our own reflect code to parse out some meta data attached to our
data structures.

## Brief Talk: Types and Interfaces

Go is a statically typed language, meaning every variable has exactly one known type that has been established at
compile time. We've previously talked about [interfaces][interfaces], but the TLDR of the article is that interfaces
represent a contract that a concrete type can implement which are implicitly satisfied. For variables defined as
interfaces, these variables are still statically typed with the type of interfaces. For instance, the follow code block
variable `r` is of a static type `io.Reader` regardless of the concrete type.

```go
var r io.Reader
r = os.Stdin
r = bufio.NewReader(r)
r = new(bytes.Buffer)
```

One of the interesting things about interfaces is that we can create blank interfaces, such as `interface{}` or `any`,
which represents the empty set of methods and is satisfied by any type at all. Recall what was stated previously, a
variable of interface type always has the same static type; however, at runtime the value stored in the interface
variable might change concrete types, that concrete type will always satisfy the interface.

## Reflection

## Reflect Metadata

## SIGABRT

[laws-of-reflection]: https://go.dev/blog/laws-of-reflection
[type-introspection]: https://en.wikipedia.org/wiki/Type_introspection
[reflect-package]: https://pkg.go.dev/reflect
[interfaces]: /blog/engineering/go/2024/10/06/go-intefaces.html
