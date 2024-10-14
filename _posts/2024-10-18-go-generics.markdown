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

The above interface declaration defines `Ordered` to be the set of all `Integer`, `Float`, and `string` types. So far,
everything looks pretty simple. Let's take a look at what kind of [Go assembly][go-asm] is produce by some simple
examples.

## Monomorphization and Boxing

```go
package main

type Numbers interface {
	int | float32
}

func main() {
	var a int
	var b int
	a = 20
	b = 25
	_ = MinGeneric(a, b)

	var c float32
	var d float32
	c = 3.14
	d = 6.28
	_ = MinGeneric(c, d)
}

//go:noinline
func MinGeneric[T Numbers](x, y T) T {
	if x < y {
		return x
	}
	return y
}

```

```nasm
main_main_pc0:
        TEXT    main.main(SB), ABIInternal, $32-0
        CMPQ    SP, 16(R14)
        PCDATA  $0, $-2
        JLS     main_main_pc75
        PCDATA  $0, $-1
        PUSHQ   BP
        MOVQ    SP, BP
        SUBQ    $24, SP
        FUNCDATA        $0, gclocals·g2BeySu+wFnoycgXfElmcg==(SB)
        FUNCDATA        $1, gclocals·g2BeySu+wFnoycgXfElmcg==(SB)
        LEAQ    main..dict.MinGeneric[int](SB), AX
        MOVL    $20, BX
        MOVL    $25, CX
        PCDATA  $1, $0
        NOP
        CALL    main.MinGeneric[go.shape.int](SB)
        LEAQ    main..dict.MinGeneric[float32](SB), AX
        MOVSS   $f32.4048f5c3(SB), X0
        MOVSS   $f32.40c8f5c3(SB), X1
        NOP
        CALL    main.MinGeneric[go.shape.float32](SB)
        ADDQ    $24, SP
        POPQ    BP
        RET

```

```nasm
main_main_pc75:
        NOP
        PCDATA  $1, $-1
        PCDATA  $0, $-2
        CALL    runtime.morestack_noctxt(SB)
        PCDATA  $0, $-1
        JMP     main_main_pc0
        TEXT    main.MinGeneric[go.shape.float32](SB), DUPOK|NOSPLIT|NOFRAME|ABIInternal, $0-16
        FUNCDATA        $0, gclocals·Plqv2ff52JtlYaDd2Rwxbg==(SB)
        FUNCDATA        $1, gclocals·g2BeySu+wFnoycgXfElmcg==(SB)
        FUNCDATA        $5, main.MinGeneric[go.shape.float32].arginfo1(SB)
        FUNCDATA        $6, main.MinGeneric[go.shape.float32].argliveinfo(SB)
        PCDATA  $3, $1
        UCOMISS X0, X1
        JLS     main_MinGeneric[go_shape_float32]_pc6
        RET
main_MinGeneric[go_shape_float32]_pc6:
        MOVUPS  X1, X0
        RET
main_MinGeneric[float32]_pc0:
        TEXT    main.MinGeneric[float32](SB), DUPOK|WRAPPER|ABIInternal, $24-8
        CMPQ    SP, 16(R14)
        PCDATA  $0, $-2
        JLS     main_MinGeneric[float32]_pc43
        PCDATA  $0, $-1
        PUSHQ   BP
        MOVQ    SP, BP
        SUBQ    $16, SP
        MOVQ    32(R14), R12
        TESTQ   R12, R12
        JNE     main_MinGeneric[float32]_pc74
main_MinGeneric[float32]_pc23:
        NOP
        FUNCDATA        $0, gclocals·g2BeySu+wFnoycgXfElmcg==(SB)
        FUNCDATA        $1, gclocals·g2BeySu+wFnoycgXfElmcg==(SB)
        FUNCDATA        $5, main.MinGeneric[float32].arginfo1(SB)
        FUNCDATA        $6, main.MinGeneric[float32].argliveinfo(SB)
        PCDATA  $3, $1
        LEAQ    main..dict.MinGeneric[float32](SB), AX
        PCDATA  $1, $0
        NOP
        CALL    main.MinGeneric[go.shape.float32](SB)
        ADDQ    $16, SP
        POPQ    BP
        RET
main_MinGeneric[float32]_pc43:
        NOP
        PCDATA  $1, $-1
        PCDATA  $0, $-2
        MOVSS   X0, 8(SP)
        MOVSS   X1, 12(SP)
        CALL    runtime.morestack_noctxt(SB)
        PCDATA  $0, $-1
        MOVSS   8(SP), X0
        MOVSS   12(SP), X1
        JMP     main_MinGeneric[float32]_pc0
main_MinGeneric[float32]_pc74:
        LEAQ    32(SP), R13
        CMPQ    (R12), R13
        JNE     main_MinGeneric[float32]_pc23
        MOVQ    SP, (R12)
        JMP     main_MinGeneric[float32]_pc23
        TEXT    main.MinGeneric[go.shape.int](SB), DUPOK|NOSPLIT|NOFRAME|ABIInternal, $0-24
        FUNCDATA        $0, gclocals·Plqv2ff52JtlYaDd2Rwxbg==(SB)
        FUNCDATA        $1, gclocals·g2BeySu+wFnoycgXfElmcg==(SB)
        FUNCDATA        $5, main.MinGeneric[go.shape.int].arginfo1(SB)
        FUNCDATA        $6, main.MinGeneric[go.shape.int].argliveinfo(SB)
        PCDATA  $3, $1
        CMPQ    CX, BX
        JLE     main_MinGeneric[go_shape_int]_pc9
        MOVQ    BX, AX
        RET
main_MinGeneric[go_shape_int]_pc9:
        MOVQ    CX, AX
        RET
main_MinGeneric[int]_pc0:
        TEXT    main.MinGeneric[int](SB), DUPOK|WRAPPER|ABIInternal, $32-16
        CMPQ    SP, 16(R14)
        PCDATA  $0, $-2
        JLS     main_MinGeneric[int]_pc47
        PCDATA  $0, $-1
        PUSHQ   BP
        MOVQ    SP, BP
        SUBQ    $24, SP
        MOVQ    32(R14), R12
        TESTQ   R12, R12
        JNE     main_MinGeneric[int]_pc74
main_MinGeneric[int]_pc23:
        NOP
        FUNCDATA        $0, gclocals·g2BeySu+wFnoycgXfElmcg==(SB)
        FUNCDATA        $1, gclocals·g2BeySu+wFnoycgXfElmcg==(SB)
        FUNCDATA        $5, main.MinGeneric[int].arginfo1(SB)
        FUNCDATA        $6, main.MinGeneric[int].argliveinfo(SB)
        PCDATA  $3, $1
        MOVQ    BX, CX
        MOVQ    AX, BX
        LEAQ    main..dict.MinGeneric[int](SB), AX
        PCDATA  $1, $0
        CALL    main.MinGeneric[go.shape.int](SB)
        ADDQ    $24, SP
        POPQ    BP
        RET
main_MinGeneric[int]_pc47:
        NOP
        PCDATA  $1, $-1
        PCDATA  $0, $-2
        MOVQ    AX, 8(SP)
        MOVQ    BX, 16(SP)
        CALL    runtime.morestack_noctxt(SB)
        PCDATA  $0, $-1
        MOVQ    8(SP), AX
        MOVQ    16(SP), BX
        JMP     main_MinGeneric[int]_pc0
main_MinGeneric[int]_pc74:
        LEAQ    40(SP), R13
        CMPQ    (R12), R13
        JNE     main_MinGeneric[int]_pc23
        MOVQ    SP, (R12)
        JMP     main_MinGeneric[int]_pc23
```

## References

[go-asm]: https://go.dev/doc/asm
[go-generics]: https://deepsource.com/blog/go-1-18-generics-implementation
[monomorph]: https://en.wikipedia.org/wiki/Monomorphization
[boxing]: https://en.wikipedia.org/wiki/Boxing_(computer_programming)
