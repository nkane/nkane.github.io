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

Reflection gives us a way to examine the type and value pair stored inside an interface variable. There are two
important types in the `reflect` package, `reflect.Type` and `reflect.Value`. A `reflect.Type` represents a Go type,
and `reflect.Value` represents the types value. The `reflect.Type` is typically referred to as a _type descriptor_,
which is a data structure that contains meta data about a specific type. Below is the current `reflect.Type` interface
for Go version `1.23.1`.

```go
type Type interface {
	Align() int
	FieldAlign() int
	Method(int) Method
	MethodByName(string) (Method, bool)
	NumMethod() int
	Name() string
	PkgPath() string
	Size() uintptr
	String() string
	Kind() Kind
	Implements(u Type) bool
	AssignableTo(u Type) bool
	ConvertibleTo(u Type) bool
	Comparable() bool
	Bits() int
	ChanDir() ChanDir
	IsVariadic() bool
	Elem() Type
	Field(i int) StructField
	FieldByIndex(index []int) StructField
	FieldByName(name string) (StructField, bool)
	FieldByNameFunc(match func(string) bool) (StructField, bool)
	In(i int) Type
	Key() Type
	Len() int
	NumField() int
	NumIn() int
	NumOut() int
	Out(i int) Type
	OverflowComplex(x complex128) bool
	OverflowFloat(x float64) bool
	OverflowInt(x int64) bool
	OverflowUint(x uint64) bool
	CanSeq() bool
	CanSeq2() bool
	common() *abi.Type
	uncommon() *uncommonType
}

```

The underlying type that implements this interface is found in the [internal/abi][go-abi] package, the structure is
defined as follows:

```go
type Type struct {
	Size_       uintptr
	PtrBytes    uintptr // number of (prefix) bytes in the type that can contain pointers
	Hash        uint32  // hash of type; avoids computation in hash tables
	TFlag       TFlag   // extra type information flags
	Align_      uint8   // alignment of variable with this type
	FieldAlign_ uint8   // alignment of struct field with this type
	Kind_       Kind    // enumeration for C
	// function for comparing objects of this type
	// (ptr to object A, ptr to object B) -> ==?
	Equal func(unsafe.Pointer, unsafe.Pointer) bool
	// GCData stores the GC type data for the garbage collector.
	// If the KindGCProg bit is set in kind, GCData is a GC program.
	// Otherwise it is a ptrmask bitmap. See mbitmap.go for details.
	GCData    *byte
	Str       NameOff // string form
	PtrToThis TypeOff // type for pointer to this type, may be zero
}

```

We won't go further than this right now, but I think it provides some pretty good insight in to what is going on
underneath the `reflect` package. There are particular types that have the ability to check the [application binary
interface][abi] of particular defined types in a program at runtime.

So, let's create our own structure in a program and start taking a look at some of the ways we can use the `reflect`
package to find out some information about our type at runtime.

## Reflection: User Defined Structures

We'll create our own struct named `Person`, initialize a new variable to be of the type `Person`, and then use the
`reflect` package to find out what information we can find out about our struct at runtime.

```go
package main

import (
	"fmt"
	"reflect"
)

type Person struct {
	Name string
	Age  int
}

func main() {
	// create a reflect.Value from an instance of Person
	s := Person{Name: "Nick", Age: 34}
	v := reflect.ValueOf(s)
	// access the type descriptor (reflect.Type) of the value
	t := v.Type()
	// Inspect the type descriptor
	fmt.Println("Type Name:", t.Name())            // Person
	fmt.Println("Kind:", t.Kind())                 // struct
	fmt.Println("Number of Fields:", t.NumField()) // 2
	// inspect each field in the struct
	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		fmt.Printf("Field Name: %s, Field Type: %s\n", field.Name, field.Type)
	}
}

```

If for some reason we need to return the inverse value of `reflect.ValueOf`, there is a provided `reflect.Interface`
method attached to the `reflect.Value` that will return a static type `interface{}` of the value.

```go
package main

import (
	"fmt"
	"reflect"
)

type Person struct {
	Name string
	Age  int
}

func main() {
	// create a reflect.Value from an instance of MyStruct
	s := Person{Name: "Nick", Age: 34}
	v := reflect.ValueOf(s)
	// access the type descriptor (reflect.Type) of the value
	t := v.Type()
	// inspect the type descriptor
	fmt.Println("Type Name:", t.Name())            // Person
	fmt.Println("Kind:", t.Kind())                 // struct
	fmt.Println("Number of Fields:", t.NumField()) // 2
	// inspect each field in the struct
	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		fmt.Printf("Field Name: %s, Field Type: %s\n", field.Name, field.Type)
	}
	// return back an interface{}
	fmt.Println("interface: ", v.Interface())
}

```

Mutation of reflection objects is possible, but the value must be settable. If we have a struct that has an unexported
field, than that field will not be settable via reflection. Let's create an example of this.

```go
package main

import (
	"fmt"
	"reflect"
)

type Person struct {
	Name   string
	Age    int
	hidden bool // unexported field (not settable via reflection)
}

func main() {
	// create an instance of Person
	p := Person{Name: "Nick", Age: 30}
	// call the reflection function to inspect and manipulate the struct
	InspectAndSetStruct(&p)
	// output the modified struct
	fmt.Println("Modified Struct:", p)
}

func InspectAndSetStruct(s interface{}) {
	// get the reflect.Value of the struct
	v := reflect.ValueOf(s)
	// ensure we're working with a pointer to the struct
	if v.Kind() != reflect.Ptr || v.Elem().Kind() != reflect.Struct {
		fmt.Println("Expected a pointer to a struct.")
		return
	}
	// get the element that the pointer points to (the struct itself)
	v = v.Elem()
	// get the reflect.Type of the struct
	t := v.Type()
	fmt.Printf("Inspecting struct of type: %s\n", t.Name())
	// iterate over the fields in the struct
	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		fieldValue := v.Field(i)
		fmt.Printf("Field Name: %s, Field Type: %s, Field Value: %v\n", field.Name, field.Type, fieldValue)
		// check if the field is settable (exported fields only)
		if fieldValue.CanSet() {
			// Set new values dynamically
			switch fieldValue.Kind() {
			case reflect.String:
				fieldValue.SetString("Updated Name")
			case reflect.Int:
				fieldValue.SetInt(100)
			default:
				fmt.Printf("Cannot set value for field: %s\n", field.Name)
			}
		} else {
			fmt.Printf("Field %s is unexported or not settable.\n", field.Name)
		}
	}
}

```

Now, this particular use case in our example isn't useful in general; however, we're just trying to expose ourselves
to difference concepts that are available to use. For the last section of this article, let's take a look at the
`encoding/json` package as a way to understand how the standard library uses reflection. I've said this before, but
anytime that I'm looking for how to use a particular feature I'll always start at the Go standard library.

## Reflection: encoding/json

## SIGABRT

[laws-of-reflection]: https://go.dev/blog/laws-of-reflection
[type-introspection]: https://en.wikipedia.org/wiki/Type_introspection
[reflect-package]: https://pkg.go.dev/reflect
[interfaces]: /blog/engineering/go/2024/10/06/go-intefaces.html
[go-abi]: https://pkg.go.dev/internal/abi
[abi]: https://en.wikipedia.org/wiki/Application_binary_interface
