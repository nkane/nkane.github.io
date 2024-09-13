---
layout: post
title: "Go (1.22): HTTP Router"
date: 2024-09-13
categories: blog engineering go
published: true
---

# Go (1.22) HTTP Router

Personally, I have found the Go standard library one of the best standard libraries that a programming language has to
offer. At least from the perspective of web programming, it always been pretty easy to work with; however, one of the
things that was lacking was a router that let you have HTTP method, path, and wild card matching. In most of my
projects, I'd reach for an open source library that implemented a router with some lightweight features like
[chi](https://github.com/go-chi/chi); however, since Go's release of [version 1.22] earlier this year the `net/http`
package received a pretty sweet update for the router that allows for HTTP method and wild card matching. In this
article we will go over some of new things that we can do without a third party library.

## ServerMux Path Parameters

One of the new features of `ServerMux` is path parameter parsing, which gives us a way to parse out URL parameters. In
order to have access to path parameters, we'll need to ensure that we've got Go version 1.22 installed and our mod file
is using at least 1.22 as well.

```go
package main

import (
	"log"
	"net/http"
)

func main() {
	router := http.NewServeMux()
	router.HandleFunc("/item/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		w.Write([]byte("item: " + id))
	})

	server := http.Server{
		Addr:    ":8080",
		Handler: router,
	}

	log.Println("Starting server on port :8080")
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
```

## Conflicting Paths and Precedence

Every HTTP router could handle overlapping patterns different ways. Per the
[routing enhancements][routing enhancements] post on the Go dev blog, since Go has always allowed overlaps and chosen
the longer pattern regardless of registration order preserving order-independence was important for backwards
compatibility. The router rules for handling overlapping patterns in this update basically determines which pattern
is _more specific_ than another if it matches a strict subset of requests. The precedence rule is the most specific
pattern wins.

If we have two routes that conflict with one another `/item/{id}` and `/item/latest`, when we submit a HTTP call to
`/post/latest` the router would resolve to correct route path due to Go's _most specific_ precedence routing.

```go
package main

import (
	"log"
	"net/http"
)

func findByID(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    w.Write([]byte("Finding by ID: " + id))
}

func getLatest(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Getting the latest"))
}

func main() {
	router := http.NewServeMux()
	router.HandleFunc("/item/{id}", findByID)
	router.HandleFunc("/item/latest", getLatest)

	server := http.Server{
		Addr:    ":8080",
		Handler: router,
	}

	log.Println("Starting server on port :8080")
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
```

There are cases where routing can be a bit ambiguous, if we had `/posts/{id}` and `{resource}/latest` as routing paths
they would potentially conflict with one another in the scenario where a call to `/post/latest` was made. The program
that attempts to register these routes will create a panic stopping this conflict from happening.

```go
package main

import (
	"log"
	"net/http"
)

func findByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	w.Write([]byte("Finding by ID: " + id))
}

func getLatest(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Getting the latest"))
}

func main() {
	router := http.NewServeMux()
	router.HandleFunc("/posts/{id}", findByID)
	router.HandleFunc("/{resource}/latest", getLatest)

	server := http.Server{
		Addr:    ":8080",
		Handler: router,
	}

	log.Println("Starting server on port :8080")
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}

```

```bash
~/dev/go-examples
❯ go run main.go
panic: pattern "/{resource}/latest" (registered at main.go:20)
conflicts with pattern "/posts/{id}" (registered at main.go:19):
/{resource}/latest and /posts/{id} both match some paths, like "/posts/latest".
But neither is more specific than the other.
/{resource}/latest matches "/resource/latest", but /posts/{id} doesn't.
/posts/{id} matches "/posts/id", but /{resource}/latest doesn't.

goroutine 1 [running]:
net/http.(*ServeMux).register(...)
        /usr/local/go/src/net/http/server.go:2738
net/http.(*ServeMux).HandleFunc(0xc0000061c0?, {0x6944e1?, 0x4086eb?}, 0x0?)
        /usr/local/go/src/net/http/server.go:2712 +0x65
main.main()
        main.go:20 +0x59
exit status 2

```

## Method Based Routing

Prior to version 1.22, the handler code would have to check which HTTP method was used explicitly in the code; however,
with the new update we get the ability to specify the HTTP method in the route string. If not methods have been
defined on a path, then it will handle all methods that haven't been explicitly defined. One gotcha about the method
and route pathing is that you'll only want a single space between the method and the route; otherwise, the router will
no longer be able to match properly.

```go
package main

import (
	"log"
	"net/http"
)

func find(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Finding"))
}

func create(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Creating"))
}

func update(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Updating"))
}

func findByID(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    w.Write([]byte("Finding by ID: " + id))
}

func getLatest(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Getting the latest"))
}

func main() {
	router := http.NewServeMux()
	router.HandleFunc("GET /item", find)
	router.HandleFunc("POST /item", create)
	router.HandleFunc("GET /item/{id}", findByID)
	router.HandleFunc("PUT /item/{id}", update)
	router.HandleFunc("GET /item/latest", getLatest)

	server := http.Server{
		Addr:    ":8080",
		Handler: router,
	}

	log.Println("Starting server on port :8080")
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
```

## Host Based Routing

Another additional feature is that has been added is the ability to handle host name instead of just a path.

```go
package main

import (
	"log"
	"net/http"
)

func handleOther(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("handle other ..."))
}

func handleDomain(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("handle domain ..."))
}

func main() {
	router := http.NewServeMux()
	router.HandleFunc("/", handleOther)
	router.HandleFunc("hiddenpixel.com/", handleDomain)

	server := http.Server{
		Addr:    ":8080",
		Handler: router,
	}

	log.Println("Starting server on port :8080")
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
```

The following curl request can be submitted to test out the host name functionality,
`curl -H "Host: hiddenpixle.com" localhost:8080`.

## Middleware

Out of the box, the Go standard library doesn't provide a way to attach middleware to our routers; however, we easily
implement middleware handling with a little bit of code.

```go
package main

import (
	"log"
	"net/http"
	"time"
)

type wrappedWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *wrappedWriter) WriteHeader(statusCode int) {
	w.ResponseWriter.WriteHeader(statusCode)
	w.statusCode = statusCode
}

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &wrappedWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}
		next.ServeHTTP(wrapped, r)
		log.Println(wrapped.statusCode,
			r.Method,
			r.URL.Path,
			time.Since(start))
	})
}

func find(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Finding"))
}

func create(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Creating"))
}

func findByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	w.Write([]byte("Finding by ID: " + id))
}

func getLatest(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Getting the latest"))
}

func main() {
	router := http.NewServeMux()
	router.HandleFunc("GET /item", find)
	router.HandleFunc("POST /item", create)
	router.HandleFunc("GET /item/{id}", findByID)
	router.HandleFunc("GET /item/latest", getLatest)

	server := http.Server{
		Addr:    ":8080",
		Handler: Logging(router),
	}

	log.Println("Starting server on port :8080")
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
```

Since we're probably going to want to do some kind of middleware chaining, we can also implement that as well.

```go
package main

import (
	"log"
	"net/http"
	"time"
)

type Middleware func(http.Handler) http.Handler

func CreateStack(xs ...Middleware) Middleware {
	return func(next http.Handler) http.Handler {
		for i := len(xs) - 1; i >= 0; i-- {
			x := xs[i]
			next = x(next)
		}
		return next
	}
}

type wrappedWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *wrappedWriter) WriteHeader(statusCode int) {
	w.ResponseWriter.WriteHeader(statusCode)
	w.statusCode = statusCode
}

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &wrappedWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}
		next.ServeHTTP(wrapped, r)
		log.Println(wrapped.statusCode,
			r.Method,
			r.URL.Path,
			time.Since(start))
	})
}

func EnableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("Enabling CORS")
	})
}

func find(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Finding"))
}

func create(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Creating"))
}

func findByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	w.Write([]byte("Finding by ID: " + id))
}

func getLatest(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Getting the latest"))
}

func main() {
	router := http.NewServeMux()
	router.HandleFunc("GET /item", find)
	router.HandleFunc("POST /item", create)
	router.HandleFunc("GET /item/{id}", findByID)
	router.HandleFunc("GET /item/latest", getLatest)

	stack := CreateStack(
		Logging,
		EnableCORS,
	)
	server := http.Server{
		Addr:    ":8080",
		Handler: stack(router),
	}

	log.Println("Starting server on port :8080")
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
```

## Subrouting

Another feature that we might want would be subrouting, which is the ability to split our routing logic across multiple
routers. In this example, we are just wrapping our normal routes to also handle a `/v1` prefix; however, we can also
split out routes with subrouters in order to apply different middleware to those routes as well.

```go
package main

import (
	"log"
	"net/http"
	"time"
)

type Middleware func(http.Handler) http.Handler

func CreateStack(xs ...Middleware) Middleware {
	return func(next http.Handler) http.Handler {
		for i := len(xs) - 1; i >= 0; i-- {
			x := xs[i]
			next = x(next)
		}
		return next
	}
}

type wrappedWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *wrappedWriter) WriteHeader(statusCode int) {
	w.ResponseWriter.WriteHeader(statusCode)
	w.statusCode = statusCode
}

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &wrappedWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}
		next.ServeHTTP(wrapped, r)
		log.Println(wrapped.statusCode,
			r.Method,
			r.URL.Path,
			time.Since(start))
	})
}

func EnableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("Enabling CORS")
	})
}

func find(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Finding"))
}

func create(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Creating"))
}

func findByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	w.Write([]byte("Finding by ID: " + id))
}

func getLatest(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Getting the latest"))
}

func main() {
	router := http.NewServeMux()
	router.HandleFunc("GET /item", find)
	router.HandleFunc("POST /item", create)
	router.HandleFunc("GET /item/{id}", findByID)
	router.HandleFunc("GET /item/latest", getLatest)

	v1 := http.NewServeMux()
	v1.Handle("/v1/", http.StripPrefix("/v1", router))

	stack := CreateStack(
		Logging,
		EnableCORS,
	)
	server := http.Server{
		Addr:    ":8080",
		Handler: stack(router),
	}

	log.Println("Starting server on port :8080")
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
```

## EOF

In my opinion, the newly added features to the `net/http` routing has been a huge win for the Go standard library. It
gives developers a easier approach to HTTP routing without having to pull in libraries; however, I'm sure that there
are other nice features that routing libraries offer that would be a bit more of a hassle to write on your own. As with
all things, there is a good balance be to had in your projects with choosing what is best for the project, but I am
glad that Go team implemented these features to give us a standard approach in simple cases.

## References

- [version 1.22][version 1.22]
- [routing enhancements][routing enhancements]
- [dreams-of-code][dreams-of-code]

[version 1.22]: https://tip.golang.org/doc/go1.22
[routing enhancements]: https://go.dev/blog/routing-enhancements
[dreams-of-code]: https://www.youtube.com/watch?v=H7tbjKFSg58
