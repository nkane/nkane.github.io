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

Great, now that we have a few basic concepts covered, what is real-time rendering and how is that different than software rendering? Real-time rendering is a sub-field of computer graphics
that deals with rendering graphics to a screen as quickly as possible or quick enough to produce an illusion of motion (e.g., video games would fall under the category of real-time rendering).
In most cases when people refer to real-time rendering they are referring to using a GPU to handle the heavy load of drawing images to a buffer since the hardware for these units was designed
specifically to handle it unlike a general purpose CPU that acts more like a jack of all trades. Technically, a software renderer can be a real-time renderer as well. Prior to the populatization
of graphics cards, a majority of video games shipped with software renderers and at time both giving the option to use one or the other for rendering the game.

### TODO(nick): talk about the differences between something like a raytracer or slower generation of photorealistic graphics vs. what video games use "real-time graphics"




[cpu]:															https://en.wikipedia.org/wiki/Central_processing_unit
[pre-rendering]:												https://en.wikipedia.org/wiki/Pre-rendering
[ray-tracing]:													https://en.wikipedia.org/wiki/Ray_tracing_(graphics)
[rendering]:													https://en.wikipedia.org/wiki/Rendering_(computer_graphics)
[software-rendering]:											https://en.wikipedia.org/wiki/Software_rendering
