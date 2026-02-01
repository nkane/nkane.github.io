---
title: "Go: Interfaces"
pubDate: 2024-10-06
tags: ["engineering", "go"]
---

# Go: Interfaces

Love them or hate them, the Go programming language has _interfaces_. The term [interface][interface] in programming
has overloaded semantics behind it, so the TLDR of interfaces are that they are an abstract type that describes a
set of method signatures. In some languages, you'll explicitly state whether or not a particular type needs to
implement an interface as part of the declaration of the type; however, in Go, interfaces are satisfied implicitly. In
other words, we don't have to declare all the interfaces that a concrete type satisfies. The Go compiler will be able
to resolve whether or not a particular type implement an interface. There are some neat and powerful concepts in Go
using interfaces, so let's start taking a look at what they're all about!

## Interface Declarations

Go allows you to define your own interfaces, which again is an _abstract type_. When interfaces are used as values, all
that is required is the _concrete type_ implement the methods signatures attached to the interface. This is the
implicit satisfaction that occurs with Go, we don't need to explicitly state that a concrete type implements a
particular interface.

Let's create a simple interface in go called `FileReader`, which will contain a single function
`ReadData([]map[string]string, error)` and we will implement two concrete types for reading CSV (comma separated
values) and TSV (tab separated values) files.

```go
package main

import (
    "encoding/csv"
    "fmt"
    "os"
    "strings"
)

type FileReader interface {
    ReadData() ([]map[string]string, error)
}

```

We can create a CSV Reader concrete type that implements a method called `ReadData` in order to fulfill the new
interface `FileReader`.

```go
type CSVReader struct {
    FilePath string
}

func (c *CSVReader) ReadData() ([]map[string]string, error) {
    file, err := os.Open(c.FilePath)
    if err != nil {
        return nil, err
    }
    defer file.Close()
    reader := csv.NewReader(file)
    records, err := reader.ReadAll()
    if err != nil {
        return nil, err
    }
    header := records[0]
    var data []map[string]string
    for _, row := range records[1:] {
        record := make(map[string]string)
        for i, value := range row {
            record[headers[i]] = value
        }
        data = append(data, record)
    }
    return data, nil
}

```

Then, we will create our TSV Reader concrete type that will also fulfill the `FileReader` interface.

```go
type TSVReader struct {
    FilePath string
}

func (t *TSVReader) ReadData() ([]map[string]string, error) {
    file, err := os.Open(t.FilePath)
    if err != nil {
        return nil, err
    }
    defer file.Close()

    reader := csv.NewReader(file)
    reader.Comma = '\t'
    records, err := reader.ReadAll()
    if err != nil {
        return nil, err
    }

    headers := records[0]
    var data []map[string]string
    for _, row := range records[1:] {
        record := make(map[string]string)
        for i, value := range row {
            record[headers[i]] = value
        }
        data = append(data, record)
    }
    return data, nil
}

```

With these two concrete types defined we can create a function which argument is the interface type of `FileReader`
and call the interface's defined function.

```go
func ProcessFile(reader FileReader) {
    data, err := reader.ReadData()
    if err != nil {
        fmt.Printf("Error reading data: %v\n", err)
        return
    }

    for _, record := range data {
        fmt.Println(record)
    }
}

func main() {
    csvReader := CSVReader{FilePath: "data.csv"}
    tsvReader := TSVReader{FilePath: "data.tsv"}
    fmt.Println("Reading CSV File:")
    ProcessFile(csvReader)
    fmt.Println("\nReading TSV File:")
    ProcessFile(tsvReader)
}

```

## Interface Examples: io.Reader and io.Writer

We've now see what it looks like to define our own interface, but let's take a look at one of the most interesting and
useful interfaces that the Go standard library has to offer the `io.Reader` and `io.Writer`. These interfaces are
defined as follows:

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

```

The function `io.Copy` takes both a `Reader` and a `Writer` as arguments. With these interfaces we can create a byte
buffer that contains data that can be redirected to a particular kind of writer, in our examples we'll use standard
out; however, the writer could be anything that implements the `Writer` interface.

```go
package main

import (
	"bytes"
	"io"
	"os"
)

func main() {
	data := []byte("this is a byte slice of data")
	reader := bytes.NewBuffer(data)
	if _, err := io.Copy(reader, os.Stdout); err != nil {
		panic(err)
	}
}

```

One again, a simple example of creating a new instances of a struct that implements the `Reader` interface and using
the `os.Stdout` as a `Writer`. Let's keep going, we can actually do the same with with a file as a `Reader` and output
the contents of the file to `os.Stdout`.

```go
package main

import (
    "io"
    "os"
)

func main() {
    file, err := os.Open("example.txt")
    if err != nil {
        panic(err)
    }
    defer file.Close()
    _, err = io.Copy(os.Stdout, file)
    if err != nil {
        panic(err)
    }
}

```

In Go, a `net.Conn` interface contains the same signatures as the `io.Reader` and `io.Writer`, meaning that any
concrete type that implements the `net.Conn` interface also implements both he `io.Reader` and `io.Writer` interfaces.
Let's create a simple example of this by creating a TCP server and client, we'll use the `io.ReadAll` function on the
server side which requires a `io.Reader` to be used and on client side we'll use the implemented `Write` method that
is attached to our concrete connection type that implements the `io.Writer` as another way to show how powerful these
interfaces can be.

```go
// server
package main

import (
    "fmt"
    "io"
    "net"
)

func main() {
    listener, err := net.Listen("tcp", ":8080")
    if err != nil {
        panic(err)
    }
    defer listener.Close()
    fmt.Println("Server is listening on port 8080...")
    for {
        conn, err := listener.Accept()
        if err != nil {
            fmt.Println("Error accepting connection:", err)
            continue
        }
        go handleConnection(conn)
    }
}

func handleConnection(conn net.Conn) {
    defer conn.Close()
    fmt.Println("Client connected.")
    // Read data from client (implements io.Reader)
    data, err := io.ReadAll(conn)
    if err != nil {
        fmt.Println("Error reading data:", err)
        return
    }

    fmt.Printf("Received from client: %s\n", string(data))
}

```

```go
// client
package main

import (
	"fmt"
	"net"
)

func main() {
	conn, err := net.Dial("tcp", "localhost:8080")
	if err != nil {
		panic(err)
	}
	defer conn.Close()
	message := "Hello from client!"
	// Write to server (conn implements io.Writer)
	_, err = conn.Write([]byte(message))
	if err != nil {
		fmt.Println("Error writing to server:", err)
		return
	}
	fmt.Println("Message sent to server.")
}

```

I often find myself looking toward the Go standard library for influence on elegant and simple API design. Now, with
that said, there are some rough edges of any language and standard library. For the most part, I find a lot of
inspiration and influence in the standard library and the `io.Reader` and `io.Writer` interfaces are one of many great
examples of how to compose power interfaces that allow for numerous concrete type implements.

## Interface Point to a Nil Pointer is Non-Nil?

This topic is pretty interesting, let's just talk about pointers in Go for a second. A pointer in Go is a variable that
contains it's own memory address, but the value of the variable is the memory address location that contains a variable
of that particular type. When we define a variable as a pointer in Go, its default value that is provided is `nil`. In
the below example, we should see the output value of `<nil>` indicating that indeed the default value was set to `nil`
for a pointer variable.

```go
package main

import "fmt"

func main() {
	var a *int
	fmt.Printf("%v\n", a)
}

```

If we edit the above code and give our variable another variable to point to, we should be able to print out the
address of the variable we're pointing to, the variables addresses, and the value.

```go
package main

import "fmt"

func main() {
	var i int
	i = 256
	fmt.Printf("i address: %p - i value: %d\n", &i, i)
	var a *int
	a = &i
	fmt.Printf("a address: %p - a value: %p - a actual value: %d\n", &a, a, *a)
}

```

Alright, that's about as much basic pointer stuff as we're going to cover for the moment. Let's talk about interfaces
and pointers of types that implement particular interfaces, what would happen if we had a concrete type pointer
variable of which the type implemented a particular interface but we never set the pointer to point to an actual
instance of the type? In other words, what would happen if we had a `nil` pointer that implements an interface?

```go
package main

import (
	"fmt"
	"strings"
)

type FieldPrinter interface {
	PrintFields() string
}

type MetaData struct {
	ID   int
	Name string
}

func (md *MetaData) PrintFields() string {
	sb := strings.Builder{}
	sb.WriteString(fmt.Sprint("ID: %d\n", md.ID))
	sb.WriteString(fmt.Sprint("Name: %d\n", md.Name))
	return sb.String()
}

func main() {
	var metaDataPtr *MetaData
	var fieldPrinter FieldPrinter
	if fieldPrinter == nil {
		fmt.Print("fieldPrinter is nil\n")
	}
	if metaDataPtr == nil {
		fmt.Print("metaDataPtr is nil\n")
	}
	fieldPrinter = metaDataPtr
	if fieldPrinter == nil {
		fmt.Print("fieldPrinter is nil\n")
	} else {
		fmt.Print("fieldPrinter is NOT nil?\n")
	}
}

```

Running the above code would show us that after we assign the interface variable to a pointer type that implements
that interface the interface variable is no longer `nil`? Well, this brings us to another point in this article that
is a bit odd, can you call a method on a `nil` pointer? Well, the answer is **yes** you can.

```go
package main

import (
	"fmt"
)

type MetaData struct {
	ID   int
	Name string
}

func (md *MetaData) CheckNil() {
	if md == nil {
		fmt.Printf("metadata is nil\n")
	} else {
		fmt.Printf("metadata is not nil\n")
	}
}

func main() {
	var metaDataPtr *MetaData
	metaDataPtr.CheckNil()
}

```

When we think of methods in Go, we should really just be thinking about a function call that either contains a pointer
or value, depending on the method receiver type, that is placed as the first argument to a function call. So the
method `func (md *MetaData) CheckNil() ...` should really be look at like `func CheckNil(md *MetaData) ...`. Bring it
back to why an interface becomes non-nil when we assign a interface to a nil pointer that implements that particular
interface, for drawing a basic idea we can say that an interface variables have a type component and a value component.
If the type component is a pointer type and the value is nil, technically the type does implement the interface and
since we just created an example that shows in some scenarios it is valid to call a method on a nil pointer, Go has to
set the interface variable to non-nil to avoid a scenario where an interface implementation may not directly access
the pointer variable.

## Type Assertion

A _type assertion_ is an operation that can be applied to an interface value that checks the dynamic type of its
operand matches the asserted type. A type assertion to a concrete type extracts the concrete value from its operand. If
the check fails, then the operation panics or returns an error depending on how to assertion is applied.

```go
var w io.Writer
w = os.Stdout
f := w.(*os.File)       // success
c := w.(*bytes.Buffer)  // panics
```

In order to avoid a panic, we can test whether it is some particular type. If the type assertion appears in an
assignment in which two results are expected, the operation does not panic on failure but instead returns a boolean
value that indicates the success of the assertion.

```go
var w io.Writer = os.Stdout
f, ok := w.(*os.File)       // success, ok value true
b, ok := w(*bytes.Buffer)   // failure, ok value failure
```

_Type switches_ simplifies an `if-else` chain that does a series of type value equality checks.

```go
switch x.(type) {
    case nil:       // ...
    case int, uint: // ...
    case bool:      // ...
    case string:    // ...
    default:        // ...
}
```

## VTable (Virtual Method Table)

In OOP languages, [_VTables_ or _virtual method tables_][vtable] are a component for enabling polymorphic behavior. A
_VTable_ is essentially a lookup table used to support dynamic dispatching of virtual functions, each class that has
a virtual method gets is own _VTable_, each object of that class carries a pointer, let's call it `vptr`, that points
to the _VTable_ of its class. The _VTable_ contains pointers to the actual implementations of the virtual functions.
When a method is called on an object, `vptr` is used to find the appropriate method address in the _VTable_, allowing
the correct function to be executed at runtime.

This mechanism provides the functionality required for runtime polymorphism, enabling behaviors in derived classes to
be invoked through base class pointers or references; however, it also has a performance cost due to the indirection
involved in accessing function pointer and memory overhead from storing the _VTable_.

_Cool story Nick, what does this have to do with anything that we were talking about previous?_

Well, I'm glad that you asked, we'll be talking about how interfaces work in Go and how similar it is to _VTables_.

## The iface and itab

Go's interfaces provide a way to achieve polymorphism, which approach will seem strikingly similar to _VTables_. Go
has structures called `iface` and `itab`, these types allow dynamic dispatching similar to the _VTable_ mechanism we
discussed in the previous section.

The `iface` structure represents an instance of an interface that contains a pointer to the actual data (concrete type)
, and a pointer to an `itab`, which helps resolve the appropriate method implementations. The `itab` structure helps
link the interface methods to the methods implemented by the concrete type, this structure contains metadata about the
type implementing the interface and pointers to the functions that implement the interface methods.

If we were to write our own conceptual implementation, it could look something like the following block of code:

```go
package main

import (
    "fmt"
    "reflect"
)

type methodFunc func(interface{})

type itab struct {
    typeName string
    methods  map[string]methodFunc
}

type iface struct {
    tab  *itab
    data interface{}
}

type Dog struct{}

func (d Dog) Speak() {
    fmt.Println("Woof!")
}

func createItab(typeName string, methods map[string]methodFunc) *itab {
    return &itab{
        typeName: typeName,
        methods:  methods,
    }
}

func (i *iface) Call(methodName string) {
    if method, ok := i.tab.methods[methodName]; ok {
        method(i.data)
    } else {
        fmt.Printf("Method %s not found for type %s\n", methodName, i.tab.typeName)
    }
}

func main() {
    dogItab := createItab("Dog", map[string]methodFunc{
        "Speak": func(data interface{}) {
            // Type assertion to call the actual method
            if d, ok := data.(Dog); ok {
                d.Speak()
            }
        },
    })
    animalInterface := &iface{
        tab:  dogItab,
        data: Dog{},
    }
    animalInterface.Call("Speak")
}

```

Obviously, this is over simplified but I think paints a clear picture of what is trying to be achieved.

## SIGSTOP

_"I can only show you the door, you're the one that has to walk through it."_

## References

- [interface][interface]
- [vtable][vtable]
- [iface][iface]

[interface]: https://en.wikipedia.org/wiki/Interface_(object-oriented_programming)
[vtable]: https://en.wikipedia.org/wiki/Virtual_method_table
[iface]: https://github.com/golang/go/blob/master/src/runtime/iface.go
