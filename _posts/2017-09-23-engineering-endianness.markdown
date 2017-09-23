---
layout: post
title: "Endianness"
date: 2017-09-23
categories: blog engineering
visible: 0
---
What is endianness in regard to computers? I am going to attempt to give an indepth explaination of of computer endianness, but before we start getting in to we need to cover a few basic concepts.

### Bits / Bytes ###
The term "[bit]" short for binary digit, which is the basic unit of information used in computers. A binary digit can represent one of two values, and in computers typically these values are 0 or 1. When collections of bits are stored together, they can be interpreted to represent characters, integer values, decimal values, and much more. Typicaly, a collection a 8-bits is referred to as a "[byte]" - there is a caveat to that previous statement. As stated in the wiki page, a byte is actually consider the number of bits used to encode a single character on a particular computer platform; however, for the purpopse of this article we are going to say that 8-bits is equivalent to 1-byte. A byte of data can represent 256 (2 to the power of 7) values.

``` plain
- NOTE:
--> Bit-8: Most Significant Bit  (MSB)
--> Bit-1: Least Significant Bit (LSB)
--> This byte order is consider big endian

 ---------------+-------+-------+-------+-------+-------+-------
| Bit-8 | Bit-7 | Bit-6 | Bit-5 | Bit-4 | Bit-3 | Bit-2 | Bit-1 |
+-------+-------+-------+-------+-------+-------+-------+-------+
|   0   |   0   |   0   |   0   |   0   |   0   |   0   |   0   |
+-------+-------+-------+-------+-------+-------+-------+-------+
|  128  |   64  |   32  |   16  |   8   |   4   |   2   |   1   |
 -------+-------+-------+-------+-------+-------+-------+------- 

- NOTATION:
--> x = Base
--> y = Exponent
---> Example: x^(y)
---> Example: base^(exponent)
------------------
Bit-1: 2^(0) =   1
Bit-2: 2^(1) =   2
Bit-3: 2^(2) =   4
Bit-4: 2^(3) =   8
Bit-5: 2^(4) =  16
Bit-6: 2^(5) =  32
Bit-7: 2^(6) = 	64
Bit-8: 2^(7) = 128
------------------
Total:	       256
------------------
```

### Hexidecimal ###


### Computer Memory ###


### Most and Least Significant Bits ###


### Big-Endian  ###


### Little Endian ###


### Examples of Endianness ###


[bit]:		https://en.wikipedia.org/wiki/Bit
[byte]:		https://en.wikipedia.org/wiki/Byte
[MSB]:		https://en.wikipedia.org/wiki/Most_significant_bit
[LSB]:		https://en.wikipedia.org/wiki/Least_significant_bit
[Endianness]:	https://en.wikipedia.org/wiki/Endianness
