---
layout: post
title: "Endianness"
date: 2017-09-23
categories: blog engineering
visible: 0
---
What is endianness in regard to computers? I am going to attempt to give an indepth explaination of of computer endianness, but before we start getting in to we need to cover a few basic concepts.

### Bits / Bytes ###
The term "[bit]" is short for binary digit, which is the basic base-2 unit of information used in computers. A binary digit can represent one of two values, and in computers typically these values are 0 or 1. When collections of bits are stored together, they can be interpreted to represent characters, integer values, decimal values, and much more. Typicaly, a collection a 8-bits is referred to as a "[byte]" - there is a caveat to that previous statement. As stated in the wiki page, a byte is actually consider the number of bits used to encode a single character on a particular computer platform; however, for the purpopse of this article we are going to say that 8-bits is equivalent to 1-byte. A byte of data can represent 256 (2 to the power of 7) values.

``` plain
- NOTE:
--> Bit-8: Most Significant Bit  (MSB)
--> Bit-1: Least Significant Bit (LSB)
---> 1-Byte Table:
    +---------------+-------+-------+-------+-------+-------+-------+
    | Bit-8 | Bit-7 | Bit-6 | Bit-5 | Bit-4 | Bit-3 | Bit-2 | Bit-1 |
    +-------+-------+-------+-------+-------+-------+-------+-------+
    |   0   |   0   |   0   |   0   |   0   |   0   |   0   |   0   |
    +-------+-------+-------+-------+-------+-------+-------+-------+
    |  128  |   64  |   32  |   16  |   8   |   4   |   2   |   1   |
    +-------+-------+-------+-------+-------+-------+-------+-------+

--> Bit-1: Most Significant Bit  (MSB)
--> Bit-8: Least Significant Bit (LSB)
---> 1-Byte Table:
    +---------------+-------+-------+-------+-------+-------+-------+
    | Bit-8 | Bit-7 | Bit-6 | Bit-5 | Bit-4 | Bit-3 | Bit-2 | Bit-1 |
    +-------+-------+-------+-------+-------+-------+-------+-------+
    |   0   |   0   |   0   |   0   |   0   |   0   |   0   |   0   |
    +-------+-------+-------+-------+-------+-------+-------+-------+
    |   1   |   2   |   4   |   8   |   16  |   32  |   64  |  128  |
    +-------+-------+-------+-------+-------+-------+-------+-------+

- NOTATION:
--> x = Base
--> y = Exponent
---> Example: x^(y)
---> Example: base^(exponent)
     ------------------		------------------
   	   MSB: 8th		      MSB: 1st
     ------------------		------------------
     Bit-1: 2^(0) =   1		Bit-1: 2^(7) = 128
     Bit-2: 2^(1) =   2		Bit-2: 2^(6) =  64
     Bit-3: 2^(2) =   4		Bit-3: 2^(5) =  32
     Bit-4: 2^(3) =   8		Bit-4: 2^(4) =  16
     Bit-5: 2^(4) =  16		Bit-5: 2^(3) =   8
     Bit-6: 2^(5) =  32		Bit-6: 2^(2) =   4
     Bit-7: 2^(6) =  64 	Bit-7: 2^(1) =   2
     Bit-8: 2^(7) = 128		Bit-8: 2^(0) =   1
     ------------------		------------------
     1-Byte Total:  256		1-Byte Total:  256
     ------------------		------------------

- BIT REPRESENTATION EXAMPLE(S):
-> NOTE:
--> Unsigned Integer Representation: 
---> Unsigned Integer: 137
---> Bit Representation: 1 0 0 0 1 0 0 1
---> Table Representation:
     +---------------+-------+-------+-------+-------+-------+-------+
     | Bit-8 | Bit-7 | Bit-6 | Bit-5 | Bit-4 | Bit-3 | Bit-2 | Bit-1 |
     +-------+-------+-------+-------+-------+-------+-------+-------+
     |   1   |   0   |   0   |   0   |   1   |   0   |   0   |   1   |
     +-------+-------+-------+-------+-------+-------+-------+-------+
     |  128  |   64  |   32  |   16  |   8   |   4   |   2   |   1   |
     +-------+-------+-------+-------+-------+-------+-------+-------+
	
     ---------------------------
     [ ON  ]  Bit-1: 2^(0) =   1
     [ OFF ]  Bit-1: 2^(1) =   0
     [ OFF ]  Bit-3: 2^(2) =   0
     [ ON  ]  Bit-4: 2^(3) =   8
     [ OFF ]  Bit-5: 2^(4) =   0
     [ OFF ]  Bit-6: 2^(5) =   0
     [ OFF ]  Bit-7: 2^(6) =   0
     [ ON  ]  Bit-8: 2^(7) = 128
     ---------------------------
     1-Byte Total: 	     137
     ---------------------------
```

#### Brief Review of One's and Two's Complement ####
In order to understand how Two's Complement works, it is helpful to review how One's Complement works. One's Complement is obtained by inverting all the bits in the binary representation of a number. Another way to think about One's Complement, is that the largest value bit is considered the inverse value minus one (e.g., in a byte the 8th bit would be equivalent to -127). The issue with One's Complement binary signed integer representation is that there ends up being two different binary representation of the value 0 referred to as [signed zero]. Basically, you have two representations of the number 0, either +0 or -0. For certain cases this can cause issues; however, as an example in floating-point arithmetic it requires both +0 and -0 per the [IEEE 754] standard. For this article we are not going to discuss floating point binary representation or arithmetic.

```plain
-> NOTE: 
-> If you are not familiar with one's or two complement,
   read the "Brief Review of One's and Two's Complement" section above.

--> Signed Integer Representation (One's Complement): 
---> Signed Integer: -118
---> Bit Representation: 1 0 0 0 1 0 0 1
---> Table Representation:
     +---------+-------+-------+-------+-------+-------+-------+-------+
     |  Bit-8  | Bit-7 | Bit-6 | Bit-5 | Bit-4 | Bit-3 | Bit-2 | Bit-1 |
     +---------+-------+-------+-------+-------+-------+-------+-------+
     |    1    |   0   |   0   |   0   |   1   |   0   |   0   |   1   |
     +---------+-------+-------+-------+-------+-------+-------+-------+
     |  -127   |   64  |   32  |   16  |   8   |   4   |   2   |   1   |
     +---------+-------+-------+-------+-------+-------+-------+-------+
	
     ----------------------------
     [ ON  ]  Bit-1: 2^(0) =    1
     [ OFF ]  Bit-1: 2^(1) =    0
     [ OFF ]  Bit-3: 2^(2) =    0
     [ ON  ]  Bit-4: 2^(3) =    8
     [ OFF ]  Bit-5: 2^(4) =    0
     [ OFF ]  Bit-6: 2^(5) =    0
     [ OFF ]  Bit-7: 2^(6) =    0
     [ ON  ]  Bit-8: 2^(7) = -127
     ----------------------------
     1-Byte Total: 	     -118
     ----------------------------

--> Signed Integer Representation (Two's Complement): 
---> Signed Integer: 
---> Bit Representation: 1 0 0 0 1 0 0 1
---> Table Representation:
    +---------+-------+-------+-------+-------+-------+-------+-------+
    |  Bit-8  | Bit-7 | Bit-6 | Bit-5 | Bit-4 | Bit-3 | Bit-2 | Bit-1 |
    +---------+-------+-------+-------+-------+-------+-------+-------+
    |    1    |   0   |   0   |   0   |   1   |   0   |   0   |   1   |
    +---------+-------+-------+-------+-------+-------+-------+-------+
    |  -128   |   64  |   32  |   16  |   8   |   4   |   2   |   1   |
    +---------+-------+-------+-------+-------+-------+-------+-------+

    ----------------------------
    [ ON  ]  Bit-1: 2^(0) =    1
    [ OFF ]  Bit-1: 2^(1) =    0
    [ OFF ]  Bit-3: 2^(2) =    0
    [ ON  ]  Bit-4: 2^(3) =    8
    [ OFF ]  Bit-5: 2^(4) =    0
    [ OFF ]  Bit-6: 2^(5) =    0
    [ OFF ]  Bit-7: 2^(6) =    0
    [ ON  ]  Bit-8: 2^(7) = -128
    ----------------------------
    1-Byte Total: 	    -119
    ----------------------------
```

### Hexadecimal ###
[Hexadecimal], base-16, in computers is an easy way of representing large bit patterns. A single hexadecimal value can represent 15 values, meaning that a single hexadecimal value is 4-bits (i.e., a [nibble]); therefore, in order to represent 1-byte (8-bits) of data two hexadecimal values are needed.

```plain
-> NOTE:
--> Hexadecimal values are usually represented with a "0x".
---> Hexadecmial Table:
    +--------+-------------+--------+
    | Denary | Hexadecmial | Binary |
    +--------+-------------+--------+
    |    1   |     0x1     |  0001  |
    +--------+-------------+--------+
    |    2   |     0x2     |  0010  |
    +--------+-------------+--------+
    |    3   |     0x3     |  0011  |
    +--------+-------------+--------+
    |    4   |     0x4     |  0100  |
    +--------+-------------+--------+
    |    5   |     0x5     |  0101  |
    +--------+-------------+--------+
    |    6   |     0x6     |  0110  |
    +--------+-------------+--------+
    |    7   |     0x7     |  0111  |
    +--------+-------------+--------+
    |    8   |     0x8     |  1000  |
    +--------+-------------+--------+
    |    9   |     0x9     |  1001  |
    +--------+-------------+--------+
    |   10   |     0xA     |  1010  |
    +--------+-------------+--------+
    |   11   |     0xB     |  1011  |
    +--------+-------------+--------+
    |   12   |     0xC     |  1100  |
    +--------+-------------+--------+
    |   13   |     0xD     |  1101  |
    +--------+-------------+--------+
    |   14   |     0xE     |  1110  |
    +--------+-------------+--------+
    |   15   |     0xF     |  1111  |
    +--------+-------------+--------+

--> Hexadecimal Representation of 2-byte(16-bit) Unsigned Integer:
--> Unsigned Integer: 1025

--> Big Endian (2-bytes) Unsigned Integer:
--> Most Significant Byte:  (0x04)  - Storage Address: 0x00
--> Least Significant Byte: (0x01)  - Storage Address: 0x20
    +--------+-------------+---------------------+
    | Denary | Hexadecmial |        Binary       |
    +--------+-------------+---------------------+
    |  1025  |    0x0401   | 0000 0100 0000 0001 |
    +--------+-------------+---------------------+

--> Little Endian (2-bytes) Unsigned Integer:
--> Most Significant Byte:  (0x01)  - Storage Address: 0x00
--> Least Significant Byte: (0x04)  - Storage Address: 0x20
    +--------+-------------+---------------------+
    | Denary | Hexadecmial |        Binary       |
    +--------+-------------+---------------------+
    |  1025  |    0x0104   | 0000 0001 0000 0100 |
    +--------+-------------+---------------------+
```

### Bit / Byte Data Interpretation ###
In the previous two sections, I have given basic examples of unsigned and signed integer byte(s) interpretations; however, data stored in binary in a computer has no inherent meaning unless given a particular way to intrepreted the data. This translation of raw binary to a meaningful value is an abstract concept. It is important to acknowledge that computers store data (i.e., computers store bits - 1s and 0s), and that any intrepretation of the binary data is an abstract concept that (e.g., an unsigned or signed integer).

### Computer Memory Addressing ###
Besides CPU registers, a temporary holding place for data (a topic we will cover in another article), a general purpose computer typically has three general primary types of memory that can be used to store data: cache memory, primary memory / main memory, and secondary memory. For the purposes of this article, we are just going to lump these together when talking about computer memory addressing; additionally, we are not going to concern ourselves with memory virtualization (i.e., virtual addresses) and just consider all the memory addresses that we are using in examples as physical memory addresses.

Modern general purpose computer memory is typically byte-addressable. Meaning, each 1-byte location inside of memory has a numerical value that is associated with that locations address.

```plain
-> Memory Layout Example:
   -------	---------------
    Block	  Hex Address
   -------	---------------
    . . .
   +-----+
   |     |    <-    0x0000
   +-----+
   |     |    <-    0x0001
   +-----+
   |     |    <-    0x0002
   +-----+
   |     |    <-    0x0003
   +-----+
    . . .
   +-----+
   |     |    <-    0x00F2
   +-----+
   |     |    <-    0x00F3
   +-----+
   |     |    <-    0x00F4
   +-----+
    . . .
```

### Most and Least Significant Bits/Bytes ###
The term Most Significant Bit First and Least Significant Bit First are indications on the bit ordering sequence in a bit stream; additionally, the Most Signficant Byte First and Least Signification Byte First are similiar in meaning to the previous, but the ordering is done at the byte sequence instead of the bit sequence.

The Most Significant Bit First indicates that the bit stream will begins with the largest valued bit first. The Least Significant Bit first indicates that the bit stream will begin with the smallest valued bit first.

```plain
Most Significant Bit
--> Value:
---> Dec: 18
---> Hex: 0x0012

--> Bit-8: Most Significant Bit  (MSB) - Front
--> Bit-1: Least Significant Bit (LSB) - End
    +---------------+-------+-------+-------+-------+-------+-------+
    | Bit-8 | Bit-7 | Bit-6 | Bit-5 | Bit-4 | Bit-3 | Bit-2 | Bit-1 |
    +-------+-------+-------+-------+-------+-------+-------+-------+
    |   0   |   0   |   0   |   0   |   0   |   0   |   0   |   0   |
    +-------+-------+-------+-------+-------+-------+-------+-------+
    |   1   |   2   |   4   |   8   |   16  |   32  |   64  |  128  |
    +-------+-------+-------+-------+-------+-------+-------+-------+

Least Significant Bit
--> Value: 
---> Dec: 18
---> Hex: 0x0012

--> Bit-8: Most Significant Bit  (MSB) - End
--> Bit-1: Least Significant Bit (LSB) - Front
    +---------------+-------+-------+-------+-------+-------+-------+
    | Bit-8 | Bit-7 | Bit-6 | Bit-5 | Bit-4 | Bit-3 | Bit-2 | Bit-1 |
    +-------+-------+-------+-------+-------+-------+-------+-------+
    |   0   |   0   |   0   |   1   |   0   |   0   |   1   |   0   |
    +-------+-------+-------+-------+-------+-------+-------+-------+
    |  128  |   64  |   32  |   16  |   8   |   4   |   2   |   1   |
    +-------+-------+-------+-------+-------+-------+-------+-------+

Most Significant Byte (Big Endian) 

Least Significant Byte (Little Endian)
```


### Big-Endian  ###
TODO(nick):

### Little Endian ###
TODO(nick):

### Examples of Endianness ###
TODO(nick):

[bit]:				https://en.wikipedia.org/wiki/Bit
[byte]:				https://en.wikipedia.org/wiki/Byte
[nibble]:			http://en.wikipedia.org/wiki/Nibble
[Hexadecimal]:  		https://en.wikipedia.org/wiki/Hexadecimal
[MSB]:				https://en.wikipedia.org/wiki/Most_significant_bit
[LSB]:				https://en.wikipedia.org/wiki/Least_significant_bit
[Endianness]:			https://en.wikipedia.org/wiki/Endianness
[GeeksForGeeks-Endianness]:	https://www.geeksforgeeks.org/little-and-big-endian-mystery/
[GeeksForGeeks-Complements]:	https://www.geeksforgeeks.org/1s-2s-complement-binary-number/
[signed zero]: 			https://en.wikipedia.org/wiki/Signed_zero
[IEEE 754]:			https://en.wikipedia.org/wiki/Signed_zero
[Endian-Calculator]:		http://www.scadacore.com/tools/programming-calculators/online-hex-converter/
[Byte-Order-Tutorial]:		http://www.yolinux.com/TUTORIALS/Endian-Byte-Order.html
[Understanding-Byte-Order]: 	https://betterexplained.com/articles/understanding-big-and-little-endian-byte-order/
[Memory-Address]:		https://en.wikipedia.org/wiki/Memory_address
[Computer-Memory]:		https://www.tutorialspoint.com/computer_fundamentals/computer_memory.htm
