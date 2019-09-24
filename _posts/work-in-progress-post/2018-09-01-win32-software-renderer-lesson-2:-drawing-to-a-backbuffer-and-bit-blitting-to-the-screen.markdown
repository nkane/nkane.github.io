---
layout: post
Title: "Win32 Software Renderer Lesson 2: Drawing to a Backbuffer and Bit Blitting to the Screen."
date: 2018-08-12
categories: blog gamedev gaming graphics programming
visible: 0
---
Let's start out the second lesson by going over a few definitions of words and/or question that may pop up in this article. From a computer science perspective, *[rendering][rendering]*
is the process of automatic generation of a photorealistic or non-photorealistic image from a two-dimensional or three-dimensional model by a computer program. The resulting image
from a renderer is typically called a *render*. Next, what is [software rendering][software-rendering] from the context of computer graphics rendering? Software rendering is the
process of rendering an image that is not dependent on graphics hardware ASIC (Application-Specific Integrated Curcuit). In other words, software rendering is the process of rendering
an image using only the *[CPU][cpu]*(Central Processing Unit) without the assistance of a graphics card; however, in modern time most CPU chips come with an embedded graphics accelerators
typically called *integrated graphics processors*, but our program that we will be writing will not be using any type of graphics acceleration.

Now that we have a few basic concepts covered, we should start talking about real-time rendering and how it relates to software rendering. Real-time rendering is a sub-field of computer
graphics that deals with rendering graphics to a screen as quickly as possible or quick enough to produce an illusion of motion (e.g., video games would fall under the category of real-time
rendering). In most cases when people refer to real-time rendering they are referring to using a GPU to handle the heavy load of drawing images to a buffer since the hardware for these units
was designed specifically to handle it unlike a general purpose CPU that acts more along the lines of a "jack of all trades" piece of hardware; however, a software renderer can be a real-time
renderer, but it will be a less efficient real-time renderer than a GPU renderer. Currently, there are a variety of rendering methods to list a few: [rasterisation][rasterisation],
[ray tracing][ray-tracing], [ray casting][ray-casting], and [path tracing][path-tracing]. These rendering methods also have sub-categories within them on methods for rendering, but we will
not be talking about all of these in this series. The fastest rendering method for a real-time software renderer to use is a rasterisation renderer, because the method does require as much
processing power as the other rendering methods.


### Real-time Software Renderer 



### Rasterisation


### Scanline Rendering



[bit-blit]:														https://en.wikipedia.org/wiki/Bit_blit
[cpu]:															https://en.wikipedia.org/wiki/Central_processing_unit
[path-tracing]:													https://en.wikipedia.org/wiki/Path_tracing
[pre-rendering]:												https://en.wikipedia.org/wiki/Pre-rendering
[rasterisation]:												https://en.wikipedia.org/wiki/Rasterisation
[ray-casting]:													https://en.wikipedia.org/wiki/Ray_casting
[ray-tracing]:													https://en.wikipedia.org/wiki/Ray_tracing_(graphics)
[rendering]:													https://en.wikipedia.org/wiki/Rendering_(computer_graphics)
[scanline-rendering]:											https://en.wikipedia.org/wiki/Scanline_rendering
[software-rendering]:											https://en.wikipedia.org/wiki/Software_rendering
