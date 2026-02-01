---
title: "Go: Pointer and Value Semantics"
pubDate: 2024-09-06
tags: ["engineering", "go"]
---

# Go: Pointer and Value Semantics

Go has two different data semantics, **pointer** and **value**. What does this even mean? Since Go is a managed
language it is kind of important to understand the difference between pointer and value semantics. In this blog post,
we'll discuss the difference between the two and poke around with some compiler commands to help us determine when
variables are allocated on the heap.

## Stack vs. Heap

The tale of two different memory regions, the _Stack_ and the _Heap_. If you've been programming for sometime, you've
probably heard of both the _Stack_ and the _Heap_. The basic idea is during the boot up of your program, the program
contains a pre-allocated region of memory known as the _Stack_ and when you need more memory you can request blocks
of memory from the operating system dynamically, which is often abstracted away as allocators in C this would be
`malloc`, as blocks on the _Heap_. The _Stack_ block of memory is used for local variables within functions as a
temporary storage mechanism, often you'll hear that the _Stack_ grows from top down referring to the address range
of starting at a higher address and growing to a lower address. On the other hand, you'll hear that the _Heap_ grows
from the bottom up, meaning the address range starts lower and gets higher.

In Go and in C, the address-of operator `&` and the dereference operator `*` are provided. Obviously, there are some
differences with particular, but in general the `&` operator will give us the address of the variable and the `*`
operator will get the value of a pointer variable and it can be used to denote that a variable is a pointer.

The behavior of the _Stack_ and _Heap_ growth is system architecture and management specific. A simple example of
_Stack_ growth in C and Go would look like the following:

```c
#include <stdio.h>

void stackGrowth(int level, void* prevAddr) {
    int x;
    void* currAddr = (void*)&x;
    printf("Level %d: Address of x = %p, Difference = %+ld\n",
            level, currAddr, (char*)currAddr - (char*)prevAddr);
    if (level < 5) {
        stackGrowth(level + 1, currAddr);
    }
}

int main() {
    printf("Stack growth demonstration:\n");
    int x;
    stackGrowth(1, (void*)&x);
    return 0;
}

```

```go
package main

import (
	"fmt"
	"unsafe"
)

func stackGrowth(level int, prevAddr uintptr) {
	var x int
	currAddr := uintptr(unsafe.Pointer(&x))
	fmt.Printf("Level %d: Address of x = %p, Difference = %+d\n",
            level, unsafe.Pointer(&x), currAddr-prevAddr)
	if level < 5 {
		stackGrowth(level+1, currAddr)
	}
}

func main() {
	fmt.Println("Stack growth demonstration:")
	var x int
	stackGrowth(1, uintptr(unsafe.Pointer(&x)))
}

```

In order to demonstrate _Heap_ growth, I'll just provide an example in C, keep in mind depending on the architecture
and operating system the behavior of these program could differ.

```c
#include <stdio.h>
#include <stdlib.h>

int main() {
    printf("Heap growth demonstration:\n");
    int *ptr1 = (int *)malloc(sizeof(int));
    int *ptr2 = (int *)malloc(sizeof(int));
    int *ptr3 = (int *)malloc(sizeof(int));
    int *ptr4 = (int *)malloc(sizeof(int));
    int *ptr5 = (int *)malloc(sizeof(int));
    printf("Address of ptr1: %p\n", (void *)ptr1);
    printf("Address of ptr2: %p, Difference = %+ld bytes\n",
            (void *)ptr2, (char *)ptr2 - (char *)ptr1);
    printf("Address of ptr3: %p, Difference = %+ld bytes\n",
            (void *)ptr3, (char *)ptr3 - (char *)ptr2);
    printf("Address of ptr4: %p, Difference = %+ld bytes\n",
            (void *)ptr4, (char *)ptr4 - (char *)ptr3);
    printf("Address of ptr5: %p, Difference = %+ld bytes\n",
            (void *)ptr5, (char *)ptr5 - (char *)ptr4);
    free(ptr1);
    free(ptr2);
    free(ptr3);
    free(ptr4);
    free(ptr5);
    return 0;
}

```

To avoid getting too deep in to the these topics, we'll just leave it at this high level overview.

## Understanding Allocations

A [goroutine][Goroutines] is a lightweight thread managed by the _Go runtime_. In computer science terminology a
_goroutine_ is considered a [green thread][Green Thread], and in Go each _goroutine_ will have it's own stack that is
allocated and managed by the Go runtime. During compilation of a Go program, the compiler will ultimately determine
whether or not a variable needs to be placed on the _Stack_ or the _Heap_. Typically, this is done by a process called
[escape analysis][Escape Analysis], which is a method for determining the dynamic scope of pointers.

The below example has a declared variable `n` and a function `func square(x int) int`, this function just returns a
value. When a function is called, a _stack frame_ is created which uses a chunk of memory from the _Stack_ to allocate
local variables of the function. Since we're just returning a value, once the function returns the _stack frame_ can
be placed back in to the pool of memory of the _Stack_ for reuse. Next, the `println` function is called, which would
subsequently reuse blocks of memory from the _Stack_ that were previously used by the function _square_ effectively
overwrite the _Stack_ memory; therefore, no variables have escaped to the _Heap_.

```go
package main

func main() {
	n := 4
	n2 := square(n)
	println(n2)
}

func square(x int) int {
	return x * x
}

```

Similarly, the next example shows that sharing down pointers should typically result in the same behavior as the
previous example. The `main` function contains a variable `n` which address is passed to the `inc` function, the
pointer is dereferenced and incremented.

```go
package main

func main() {
	n := 4
	inc(&n)
	println(n)
}

func inc(x *int) {
	*x++
}

```

Now this is all well and good, but how can we prove that this is actually what is happening? The Go compiler allows us
to pass in garbage collector build flags, such as `go build -gcflags '-m -m' main.go`. This can give us some insight
into what variables might be escaping to the _Heap_.

```bash

❯ go build -gcflags '-m -m' main.go
# command-line-arguments
./main.go:9:6: can inline inc with cost 4 as: func(*int) { *x++ }
./main.go:3:6: can inline main with cost 15 as: func() { n := 4; inc(&n); println(n) }
./main.go:5:5: inlining call to inc
./main.go:9:10: x does not escape

```

Now that we've got some output from the compiler that gives us some hints about whether or not a variable escapes to
the _Heap_. In that output, we saw a term _inline_, stating that a particular function can be _inline_. What does it
mean to [inline][Inlining] a function? Well, it's pretty simple actually, it's a compiler optimization that can be done
that replaces a function call with the exact body of the called function to avoid the overhead of setting up a function
call. If you'd like to tell the compiler to explicitly not _inline_ a function, Go has a special comment called a
`pragma` that can be added above the function `//go:noinline` that tells the compiler to not perform the _inlining_
optimization on that particular function.

Now, what happens when we have a function that returns a pointer? Again, it's better to specifically check your use
case since the compiler is ultimately the thing that will determine whether or not a particular variable is allocated
on the _Stack_ or the _Heap_. In generally, it's probably safe to assume that if you declare a pointer value inside of
a function that is returned from that function that it will most likely be escaped to the _Heap_. In other words,
sharing up will typically escape to the _Heap_.

```go
package main

func main() {
	n := answer()
	println(*n / 2)
}

func answer() *int {
	x := 42
	return &x
}

```

```bash
❯ go build -gcflags '-m -m' main.go
# command-line-arguments
./main.go:8:6: can inline answer with cost 8 as: func() *int { x := 42; return &x }
./main.go:3:6: can inline main with cost 19 as: func() { n := answer(); println(*n / 2) }
./main.go:4:13: inlining call to answer
./main.go:9:2: x escapes to heap:
./main.go:9:2:   flow: ~r0 = &x:
./main.go:9:2:     from &x (address-of) at ./main.go:10:9
./main.go:9:2:     from return &x (return) at ./main.go:10:2
./main.go:9:2: moved to heap: x

```

Another example of returning a value from a function versus return a pointer, showing that the pointer returned is
escaped to the _Heap_.

```go
package main

func main() {
	var a int
	a = 10

	var b int
	b = 15

	_ = AddReturnValue(a, b)

	_ = AddReturnPointer(a, b)
}

//go:noinline
func AddReturnValue(x int, y int) int {
	value := x + y
	return value
}

//go:noinline
func AddReturnPointer(x int, y int) *int {
	pointer := x + y
	return &pointer
}

```

```bash
❯ go build -gcflags '-m -m' main.go
# command-line-arguments
./main.go:16:6: cannot inline AddReturnValue: marked go:noinline
./main.go:22:6: cannot inline AddReturnPointer: marked go:noinline
./main.go:3:6: cannot inline main: function too complex: cost 140 exceeds budget 80
./main.go:23:2: pointer escapes to heap:
./main.go:23:2:   flow: ~r0 = &pointer:
./main.go:23:2:     from &pointer (address-of) at ./main.go:24:9
./main.go:23:2:     from return &pointer (return) at ./main.go:24:2
./main.go:23:2: moved to heap: pointer

```

If a variable is wrapped as an `interface`, the escape analysis sometimes cannot prove that it's safe for the variable
to be on the _Stack_.

```go
package main

import "fmt"

func main() {
	var i interface{}
	x := 10
	i = x
	fmt.Println(i)
}

```

```bash
❯ go build -gcflags '-m -m' main.go
# command-line-arguments
./main.go:5:6: cannot inline main: function too complex: cost 90 exceeds budget 80
./main.go:9:13: inlining call to fmt.Println
./main.go:8:6: x escapes to heap:
./main.go:8:6:   flow: i = &{storage for x}:
./main.go:8:6:     from x (spill) at ./main.go:8:6
./main.go:8:6:     from i = x (assign) at ./main.go:8:4
./main.go:8:6:   flow: {storage for ... argument} = i:
./main.go:8:6:     from ... argument (slice-literal-element) at ./main.go:9:13
./main.go:8:6:   flow: fmt.a = &{storage for ... argument}:
./main.go:8:6:     from ... argument (spill) at ./main.go:9:13
./main.go:8:6:     from fmt.a := ... argument (assign-pair) at ./main.go:9:13
./main.go:8:6:   flow: {heap} = *fmt.a:
./main.go:8:6:     from fmt.Fprintln(os.Stdout, fmt.a...) (call parameter) at ./main.go:9:13
./main.go:8:6: x escapes to heap
./main.go:9:13: ... argument does not escape

```

## Go Interfaces for References

If you take a look at the Go interface for `io.Reader`, it's a great example of a function that shares down a pointer
instead of sharing up.

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}
```

## References

- [Gophercon 2019: Understaning Allocation][Gophercon 2019: Understaning Allocation]
- [Ardan Labs - Pointers][Ardan Labs - Pointers]
- [Ardan Labs - Stacks and Pointer][Ardan Labs - Stacks and Pointer]
- [Goroutines][Goroutines]
- [Green Thread][Green Thread]
- [Escape Analysis][Escape Analysis]
- [Inlining][Inlining]
- [Go.dev: Stack or Heap][Go.dev: Stack or Heap]

[Gophercon 2019: Understaning Allocation]: https://www.youtube.com/watch?v=ZMZpH4yT7M0
[Ardan Labs - Pointers]: https://www.youtube.com/watch?v=i5nyPaAwM3s
[Ardan Labs - Stacks and Pointer]: https://www.ardanlabs.com/blog/2017/05/language-mechanics-on-stacks-and-pointers.html
[Goroutines]: https://go.dev/tour/concurrency/1
[Green Thread]: https://en.wikipedia.org/wiki/Green_thread
[Escape Analysis]: https://en.wikipedia.org/wiki/Escape_analysis
[Inlining]: https://en.wikipedia.org/wiki/Inline_expansion
[Go.dev: Stack or Heap]: https://go.dev/doc/faq#stack_or_heap
