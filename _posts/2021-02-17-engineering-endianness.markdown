---
layout: post
title: "Endianness"
date: 2021-02-17
categories: blog engineering
visible: 1
---
What does the term "_endianness_" mean? This term, was created by a writer named _Jonathan Swift_ in a novel named "_Gulliver's Travels_", in which
natives of a particular island used to the term to determine whether a particular person would break their boiled egg from the big end
(Big-Endians) or from the little end (Little-Endians). A rather fitting name for such a trivial issue, but what does this have to do with
computers? Well, it turns out that Jonathan Swift's fictional natives trivial issue of, "_which end to break the boiled egg from_"
became our own reality trivial issue of, "_which way do we order bytes within a computer_".

For the sake of being relatively complete, I am going to tangentially cover a few basic concepts. Let's think of computer memory as a sequence
of boxes that are addressable by a particular number, which can be referred to as it memory address. Within each box, a byte of memory (8-bits)
is stored at that particular memory address. The endianness problem begins with this question: _In a multi-byte quantity, which byte
starts at beginning? Do we use most significant byte (Big-Endian) or least significant byte (Little-Endian)?_ 


Using an example from _Jason Gregory's_ book, _Game Engine Architecture_, if we have the integer value of 4660 which is represented by two bytes
in hexidecmial 0x1234 and those two individual bytes are 0x12 and 0x34. We can refer to the byte 0x12 as the most significant byte (MSB) and 0x34
as the least significant byte (LSB). Let's write a basic program in C to help us have a better understanding of how this works. For this example,
I am writing this program on a x86-64 intel core i7 process, which happens to be little endian; therefore, if we assign a 16-bit integer to the
value of _0x1234_, we would expect that in memory it should be stored as _[ 0x34 0x12 ]_.

```c
#include <stdio.h>
#include <stdint.h>

int main(void)
{
    int16_t x = 0x1234;
    printf("decimal: %d - hex: 0x%X\n", x, x);

    int8_t *p = (int8_t *)&x;
    printf("[ 0x%02hhX ", *(p + 0));
    printf("0x%02hhX ]",  *(p + 1));

    return 0;
}
```
```text
decimal: 4660 - hex: 0x1234
[ 0x34 0x12 ]
```

In the 16-bit integer example, we can see that the actual byte representation of this value is indeed store as little-endian when we access each
byte individually using pointer arithmetic. Let's do a 32-bit integer value, just to hammer home the point. If we have a 32-bit integer with the
value of _0xABCD1234_, each byte being _[ 0xAB 0xCD 0x12 0x34 ]_, the most signficant byte is _0xAB_ and the least significant byte is _0x34_;
therefore, we should be expecting the following byte order in little endian: _[ 0x34 0x12 0xCD 0xAB ]_.

```c
#include <stdio.h>
#include <stdint.h>

int main(void)
{
    int32_t x = 0xABCD1234;
    printf("decimal: %d - hex: 0x%X\n", x, x);

    int8_t *p = (int8_t *)&x;
    printf("address: %p, 0x%02hhX\n", (p + 0), *(p + 0));
    printf("address: %p, 0x%02hhX\n", (p + 1), *(p + 1));
    printf("address: %p, 0x%02hhX\n", (p + 2), *(p + 2));
    printf("address: %p, 0x%02hhX\n", (p + 3), *(p + 3));

    return 0;
}
```
```text
decimal: -1412623820 - hex: 0xABCD1234
address: 0000003638B3FA00, 0x34
address: 0000003638B3FA01, 0x12
address: 0000003638B3FA02, 0xCD
address: 0000003638B3FA03, 0xAB
```

Alright, we have written two programs to try to help us understand how our values are stored in memory on an x86-64 processor in little endian.
Now, let's write a program that has a simple C structure and write that structure out to a file as binary and examine the byte ordering. 

```c
#include <stdio.h>
#include <stdint.h>

typedef struct _vector3i
{
    int32_t x;
    int32_t y;
    int32_t z;
} Vector3i;

int main(void)
{
    FILE *file = NULL;
    file = fopen("vector.dat", "w");
    if (file == NULL)
    {
        fprintf(stderr, "\nError opening file\n");
        exit(1);
    }
    Vector3i vector_a;
    vector_a.x = 0xAB56EF12;
    vector_a.y = 0x3679FE01;
    vector_a.z = 0xBCAF9823; 

    Vector3i vector_b;
    vector_b.x = 0xDEADBEEF;
    vector_b.y = 0xC0FFEE01;
    vector_b.z = 0xEFBEADDE;

    if (fwrite(&vector_a, sizeof(Vector3i), 1, file) == 0)
    {
        fprintf(stderr, "\nError failed to write vector_a\n");
        fclose(file);
        exit(1);
    }

    if (fwrite(&vector_b, sizeof(Vector3i), 1, file) == 0)
    {
        fprintf(stderr, "\nError failed to write vector_b\n");
        fclose(file);
        exit(1);
    }

    printf("contents to file written successfully!\n");
    fclose(file);

    return 0;
}
```

Reading the hexidecimal data from the file that we wrote out, we can see once again how those structures are written out to a file in
little endian format. We can dump out the hexidecimal using groups of 4-bytes since we are using 32-bit integers and single byte groups.

```text
-- 4-bytes grouped --
00000000: 12EF56AB 01FE7936 2398AFBC EFBEADDE  ..V...y6#.......
00000010: 01EEFFC0 DEADBEEF                    ........
```
```text
-- 1-byte grouped --
00000000: 12 EF 56 AB 01 FE 79 36 23 98 AF BC EF BE AD DE  ..V...y6#.......
00000010: 01 EE FF C0 DE AD BE EF                          ........
```

The first group of 4-bytes is _[ 0x12 0xEF 0x56 0xAB ]_, which when taking a look at our program's first structure vector_a the field x
value was set to _0xAB56EF12_. As expected, this little endian byte ordering.

The examples that we have done this far have just been about writing out data to either the terminal or a file in the byte order of the
processor that the executing program is using, and in my case that is an x86_64 intel i7; therefore, the byte order has been little endian.
Now, what if we need to swap the byte ordering to big endian? Let's start out with simple example of swapping just a single 32-bit integer.
There are multiple ways that we can write this, but let's start out with a straightforward approach of using bitwise operations. In order
to swap using bitwise operations. We need to move the the byte in the last position up to the first byte memory address this can be 
achieved by right shifting our last byte by 24-bit (3-bytes). Next, we have to right shift the second to last byte up 8-bits (1-byte). Then,
we basically repeat that same process but left shift the beginning two bytes.

```c
#include <stdio.h>
#include <stdint.h>

int main(void)
{
    int32_t x = 0xABCD1234;
    int8_t *p = (int8_t *)&x;
 
    printf("little endian\n");   
    printf("address: %p - 0x%02hhX\n", (p + 0), *(p + 0));
    printf("address: %p - 0x%02hhX\n", (p + 1), *(p + 1));
    printf("address: %p - 0x%02hhX\n", (p + 2), *(p + 2));
    printf("address: %p - 0x%02hhX\n", (p + 3), *(p + 3));

    x = ((x & 0x000000FF) << 24) |
        ((x & 0x0000FF00) << 8)  |
        ((x & 0x00FF0000) >> 8)  |
        ((x & 0xFF000000) >> 24);

    printf("big endian\n");   
    printf("address: %p - 0x%02hhX\n", (p + 0), *(p + 0));
    printf("address: %p - 0x%02hhX\n", (p + 1), *(p + 1));
    printf("address: %p - 0x%02hhX\n", (p + 2), *(p + 2));
    printf("address: %p - 0x%02hhX\n", (p + 3), *(p + 3));
}
```

From the output, we can see that the byte ordering was reversed from _[ 0x34 0x12 0xCD 0xAB ]_ to _[0xAB 0xCD 0x12 0x34 ]_. This is exactly what
we were expecting to see. If you are a bit (pun intended) confused about our shifting operations, just think of it as assigning 4 temporary 
variables to the values _[ 0xAB 0x00 0x00 0x00 ]_, _[ 0xCD 0x00 0x00 0x00 ]_ , _[ 0x00 0x00 0x12 0x00 ]_, and _[ 0x00 0x00 0x00 0x34 ]_ then
bitwise ORing those values together to produce the result that we expect: _[0xAB 0xCD 0x12 0x34 ]_. This process works for swapping between
either endianness.

```text
little endian
address: 0000005E488FF940 - 0x34
address: 0000005E488FF941 - 0x12
address: 0000005E488FF942 - 0xCD
address: 0000005E488FF943 - 0xAB
big endian
address: 0000005E488FF940 - 0xAB
address: 0000005E488FF941 - 0xCD
address: 0000005E488FF942 - 0x12
address: 0000005E488FF943 - 0x34
```

Instead of using shift operations, the standard library for MSVC does contain run-time routines for byte swapping called: _byteswap_ushort_, 
_byteswawp_ulong_, and _byteswap_uint64_; however, these are not considered compiler instrinsics because these routines are include in the
run-time header file _stdlib.h_. We can write a program with and without compiler optimizations turned on to see what kind of assembly code
is being produced.

```c
#include <stdio.h>
#include <stdint.h>

int main(void)
{
    int32_t x = 0xABCD1234;
    int8_t *p = (int8_t *)&x;
 
    printf("little endian\n");   
    printf("address: %p - 0x%02hhX\n", (p + 0), *(p + 0));
    printf("address: %p - 0x%02hhX\n", (p + 1), *(p + 1));
    printf("address: %p - 0x%02hhX\n", (p + 2), *(p + 2));
    printf("address: %p - 0x%02hhX\n", (p + 3), *(p + 3));
        
    x = _byteswap_ulong(x);

    printf("big endian\n");   
    printf("address: %p - 0x%02hhX\n", (p + 0), *(p + 0));
    printf("address: %p - 0x%02hhX\n", (p + 1), *(p + 1));
    printf("address: %p - 0x%02hhX\n", (p + 2), *(p + 2));
    printf("address: %p - 0x%02hhX\n", (p + 3), *(p + 3));

    return 0;
}
```

Alright, we wrote our program and compiled it with the MSVC compiler with optimizations turned off and produced debug information as well.
Now, we can load up the program in something that provides the disassembly to see what exactly is going on our __byteswap_ulong_ function
call. Below are segnments of the disassembly provided to paint a picture of what is going on.

```nasm
; ...
; call to jump instruction
mov     ecx, [rsp+38h+Long] ; Long
call    j__byteswap_ulong
; ...

; ...
; jump instruction to function
; unsigned int __cdecl j__byteswap_ulong(unsigned int Long)
j__byteswap_ulong proc near
jmp     _byteswap_ulong
j__byteswap_ulong endp
; ...

;...
; unoptimized instructions for byte swap
; unsigned int __cdecl byteswap_ulong(unsigned int Long)
_byteswap_ulong proc near
mov     eax, ecx
mov     r8d, 0FF00h
and     eax, r8d
mov     edx, ecx
shl     edx, 10h
add     eax, edx
mov     edx, ecx
shl     eax, 8
shr     edx, 8
and     edx, r8d
shr     ecx, 18h
add     eax, edx
add     eax, ecx
retn
_byteswap_ulong endp
; ...
```

From a high level overview of the assembly code, there does appear to be several _and_ _shl (shift logical left)_ and _shr (shift logical
right)_ instructions, which if you recall from our original solution to swap bytes using bitwise operators this seems kind of familiar.
Just out of curiosity, let's take the original code and disassembly the code to see what is produced with opitimzations turned off.

```nasm
; hand rolled shift example
; ...
mov     eax, [rsp+38h+var_18]
and     eax, 0FFh
shl     eax, 18h
mov     ecx, [rsp+38h+var_18]
and     ecx, 0FF00h
shl     ecx, 8
or      eax, ecx
mov     ecx, [rsp+38h+var_18]
and     ecx, 0FF0000h
sar     ecx, 8
or      eax, ecx
mov     ecx, [rsp+38h+var_18]
and     ecx, 0FF000000h
shr     ecx, 18h
or      eax, ecx
mov     [rsp+38h+var_18], eax
; ...
```

Taking a look at the disassembly produced by the original code, we can see that it is slightly different than the standard library function call
__byteswap_ulong_; however, there are still shift instructions which is what we expected. Now, let's turn on the highest optimizations available
to the MSVC compiler for the __byteswap_ulong_ function call and our own shift examples to see what happens.

```nasm
; _byteswap_ulong function example
; int __cdecl main(int argc, const char **argv, const char **envp)
main proc near

arg_0= dword ptr  8

sub     rsp, 28h
lea     rcx, Format     ; "little endian\n"
mov     [rsp+28h+arg_0], 0ABCD1234h
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0]
lea     rdx, [rsp+28h+arg_0]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+1]
lea     rdx, [rsp+28h+arg_0+1]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+2]
lea     rdx, [rsp+28h+arg_0+2]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+3]
lea     rdx, [rsp+28h+arg_0+3]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
mov     eax, [rsp+28h+arg_0]
lea     rcx, aBigEndian ; "big endian\n"
bswap   eax
mov     [rsp+28h+arg_0], eax
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0]
lea     rdx, [rsp+28h+arg_0]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+1]
lea     rdx, [rsp+28h+arg_0+1]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+2]
lea     rdx, [rsp+28h+arg_0+2]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+3]
lea     rdx, [rsp+28h+arg_0+3]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
xor     eax, eax
add     rsp, 28h
retn
main endp
```

In the above disassembly output for the optimized version of code that calls the standard library function __byteswap_ulong_, we can see that
there is no longer a instruction to call to a jump label that then jumps to the instructions for the __byteswap_ulong_ implementation which 
uses _and_, _shl_, and _shr_ instructions for the swap; however, instead in place of that there is an instruction named _bswap_ that is used
instead of all of other code that was produced in the unoptimized version of the compiled code. Let's do the same thing we just did for this
our __byteswap_ulong_ optimized version with our hand rolled shift code example.

```nasm
; hand rolled shift example
; int __cdecl main(int argc, const char **argv, const char **envp)
main proc near

arg_0= dword ptr  8

sub     rsp, 28h
lea     rcx, Format     ; "little endian\n"
mov     [rsp+28h+arg_0], 0ABCD1234h
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0]
lea     rdx, [rsp+28h+arg_0]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+1]
lea     rdx, [rsp+28h+arg_0+1]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+2]
lea     rdx, [rsp+28h+arg_0+2]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+3]
lea     rdx, [rsp+28h+arg_0+3]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
mov     ecx, [rsp+28h+arg_0]
mov     edx, ecx
sar     edx, 8
mov     eax, ecx
and     eax, 0FF00h
and     edx, 0FF00h
shl     eax, 8
or      edx, eax
mov     eax, ecx
shl     ecx, 18h
shr     eax, 18h
or      edx, eax
or      edx, ecx
lea     rcx, aBigEndian ; "big endian\n"
mov     [rsp+28h+arg_0], edx
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0]
lea     rdx, [rsp+28h+arg_0]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+1]
lea     rdx, [rsp+28h+arg_0+1]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+2]
lea     rdx, [rsp+28h+arg_0+2]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
movsx   r8d, byte ptr [rsp+28h+arg_0+3]
lea     rdx, [rsp+28h+arg_0+3]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
xor     eax, eax
add     rsp, 28h
retn
main endp
```

Again, taking another high level overview of this code we can see that even with optimizations turned on there are still a bunch of shifting
instructions followed by other bitwise operations. The MSVC compiler couldn't optimized our code out to use the _bswap_ instruction with
the highest level of optimizations turned on. The reason I am mentioning this is because compilers typically have something called an 
intrinsic function that are used as a way to inline assembly instructions to ensure that those will be used by the compiled program; however,
intrinsic functions are not portable, in other words, these instrinsic functions will be compiler and platform dependent.

In our particular case, we want the compiler to produce the _bswap_ assembly instruction usage instead of all that shift code in our hand 
rolled version or the unoptimized usage of the __byteswap_ulong_. Now, as stated previously, compilers typically come with intrinsic
functions, but for this particular case there is no available intrinsic function for __bswap_ in the MSVC compiler intrinsic headers.
Per the MSDN documentation, it just says to use the portable __byteswap_ulong_ function. I don't know about you, but that answer doesn't
quiet satisfy my curiosity. So let's keep diggin' deeper in ye olde rabbit hole.

Let's write our own assembly subroutine that uses the _bswap_ instruction. Now, during my initial research phase of how to do this, I found
out that the MSVC compiler doesn't support C inline assembly for 64-bit compiled programs. To be honest, that constraint seems completely
unnecessary, but I am not a compiler write; therefore, we are stuck with what we got for this parituclar situation. Basically, what this means
is that we cannot inline our assembly to simply just a _bswap_ instruction being produced, and there is not an actual available intrinsic 
function for the _bswap_ instruction, we are going to have to create an assembly file with a subroutine that we will assemble then compile
and link our assembled code with our C code that calls our assembly subroutine. 

Let's start out with creating an assembly subroutine that just uses one argument stored in the register _ecx_, use _bswap_ on _ecx_, then 
move that result to the output register _eax_. We will call this subroutine __bswap_.

```nasm
; PUBLIC  _bswap

_TEXT  SEGMENT

_bswap PROC
    push  rbp
    mov   rbp, rsp
    
    bswap ecx
    mov   eax, ecx

    pop   rbp
    ret   0
_bswap ENDP

_TEXT  ENDS

END          ; END directive required at end of file
```

Using the MASM x64 compiler, we can produce an object file from our assembly file. Next on our list, we are going write our same example
program that we have been using, but this time we are going to give a function prototype for our assembly function __bswap_ and call that
function within our program to do the byte swap. When we are going to compile and link our C program, we need to pass in our assembled 
object file that we produced for our C program to link against.

```c
#include <stdio.h>
#include <stdint.h>

int _bswap(int32_t);

int main(void)
{
    int32_t x = 0xABCD1234;
    int8_t *p = (int8_t *)&x;
 
    printf("little endian\n");   
    printf("address: %p - 0x%02hhX\n", (p + 0), *(p + 0));
    printf("address: %p - 0x%02hhX\n", (p + 1), *(p + 1));
    printf("address: %p - 0x%02hhX\n", (p + 2), *(p + 2));
    printf("address: %p - 0x%02hhX\n", (p + 3), *(p + 3));

    x = _bswap(x);

    printf("big endian\n");   
    printf("address: %p - 0x%02hhX\n", (p + 0), *(p + 0));
    printf("address: %p - 0x%02hhX\n", (p + 1), *(p + 1));
    printf("address: %p - 0x%02hhX\n", (p + 2), *(p + 2));
    printf("address: %p - 0x%02hhX\n", (p + 3), *(p + 3));

    return 0;
}
```
```text
little endian
address: 000000D64D91F890 - 0x34
address: 000000D64D91F891 - 0x12
address: 000000D64D91F892 - 0xCD
address: 000000D64D91F893 - 0xAB
big endian
address: 000000D64D91F890 - 0xAB
address: 000000D64D91F891 - 0xCD
address: 000000D64D91F892 - 0x12
address: 000000D64D91F893 - 0x34
```

We don't really see anything special here, but we do know that the swap does appear to be working. Let's take a look at the produce
assebly for this particular implementation to see what we get out of it.

```nasm
; int __cdecl main(int argc, const char **argv, const char **envp)
main proc near

var_18= dword ptr -18h
var_10= qword ptr -10h

sub     rsp, 38h
mov     [rsp+38h+var_18], 0ABCD1234h
lea     rax, [rsp+38h+var_18]
mov     [rsp+38h+var_10], rax
lea     rcx, Format     ; "little endian\n"
call    j_printf
mov     rax, [rsp+38h+var_10]
movsx   eax, byte ptr [rax]
mov     r8d, eax
mov     rdx, [rsp+38h+var_10]
lea     rcx, aAddressP0x02hh ; "address: %p - 0x%02hhX\n"
call    j_printf
mov     rax, [rsp+38h+var_10]
movsx   eax, byte ptr [rax+1]
mov     rcx, [rsp+38h+var_10]
inc     rcx
mov     r8d, eax
mov     rdx, rcx
lea     rcx, aAddressP0x02hh_0 ; "address: %p - 0x%02hhX\n"
call    j_printf
mov     rax, [rsp+38h+var_10]
movsx   eax, byte ptr [rax+2]
mov     rcx, [rsp+38h+var_10]
add     rcx, 2
mov     r8d, eax
mov     rdx, rcx
lea     rcx, aAddressP0x02hh_1 ; "address: %p - 0x%02hhX\n"
call    j_printf
call    j_printf
mov     rax, [rsp+38h+var_10]
movsx   eax, byte ptr [rax+3]
mov     rcx, [rsp+38h+var_10]
add     rcx, 3
mov     r8d, eax
mov     rdx, rcx
lea     rcx, aAddressP0x02hh_2 ; "address: %p - 0x%02hhX\n"
call    j_printf
mov     ecx, [rsp+38h+var_18]
call    j__bswap
mov     [rsp+38h+var_18], eax
lea     rcx, aBigEndian ; "big endian\n"
call    j_printf
mov     rax, [rsp+38h+var_10]
movsx   eax, byte ptr [rax]
mov     r8d, eax
mov     rdx, [rsp+38h+var_10]
lea     rcx, aAddressP0x02hh_3 ; "address: %p - 0x%02hhX\n"
call    j_printf
mov     rax, [rsp+38h+var_10]
movsx   eax, byte ptr [rax+1]
mov     rcx, [rsp+38h+var_10]
inc     rcx
mov     r8d, eax
mov     rdx, rcx
lea     rcx, aAddressP0x02hh_4 ; "address: %p - 0x%02hhX\n"
call    j_printf
mov     rax, [rsp+38h+var_10]
movsx   eax, byte ptr [rax+2]
mov     rcx, [rsp+38h+var_10]
add     rcx, 2
mov     r8d, eax
mov     rdx, rcx
lea     rcx, aAddressP0x02hh_5 ; "address: %p - 0x%02hhX\n"
call    j_printf
mov     rax, [rsp+38h+var_10]
movsx   eax, byte ptr [rax+3]
mov     rcx, [rsp+38h+var_10]
add     rcx, 3
mov     r8d, eax
mov     rdx, rcx
lea     rcx, aAddressP0x02hh_6 ; "address: %p - 0x%02hhX\n"
call    j_printf
xor     eax, eax
add     rsp, 38h
retn
main endp

; ...
; Attributes: thunk
j__bswap proc near
jmp     _bswap
j__bswap endp
; ...

; ...
; Attributes: bp-based frame
_bswap proc near
push    rbp
mov     rbp, rsp
bswap   ecx
mov     eax, ecx
pop     rbp
retn
_bswap endp
; ...
```

Kind of what we should have been expecting, we basically still will have the over head of a function call since we cannot inline our
assembly. This experiment has been kind of insightful and interesting, and I previously didn't know about the _bswap_ instruction prior
to producing the optimized assembly code from the _byteswap_ulong_. I doubt that I will ever truly need to use this in practice, but it
is nice to poke around at things like this once and awhile to see what happens or is produced by a compiler.

Let's write another example writing out a structure to a file as both little endian and big endian. We can write two different examples
using our own shift logic code.

```c
#include <stdio.h>
#include <stdint.h>

typedef struct _vector3i
{
    int16_t id;
    int32_t x;
    int32_t y;
    int32_t z;
} Vector3i;


inline int16_t swap16(int16_t value)
{
    return ((value & 0x00FF) << 8) |
           ((value & 0xFF00) >> 8);
}

inline int32_t swap32(int32_t value)
{
    return ((value & 0x000000FF) << 24) |
           ((value & 0x0000FF00) << 8)  |
           ((value & 0x00FF0000) >> 8)  |
           ((value & 0xFF000000) >> 24);
}

void WriteStructToFile(const char *name, Vector3i *v)
{
    FILE *file = NULL;
    file = fopen(name, "w");
    if (file == NULL)
    {
        fprintf(stderr, "\nError opening file\n");
        exit(1);
    }

    if (fwrite(v, sizeof(Vector3i), 1, file) == 0)
    {
        fprintf(stderr, "\nError failed to write vector_a\n");
        fclose(file);
        exit(1);
    }

    printf("%s contents to file written successfully!\n", name);
    fclose(file);
}

int main(void)
{
    Vector3i vector_a;
    vector_a.id = 0xAB12;
    vector_a.x =  0xDEADBEEF;
    vector_a.y =  0xC0FFEE01;
    vector_a.z =  0xEFBEADDE;
    WriteStructToFile("vector_little_endian.dat", &vector_a);

    vector_a.id = swap16(vector_a.id);
    vector_a.x  = swap32(vector_a.x);
    vector_a.y  = swap32(vector_a.y);
    vector_a.z  = swap32(vector_a.z);
    WriteStructToFile("vector_big_endian.dat", &vector_a);

    return 0;
}
```
```text
-- little endian --
-- 1-byte group --
00000000: 12 ab 00 00 ef be ad de 01 ee ff c0 de ad be ef  ................
```
```text
-- big endian --
-- 1-byte group --
00000000: ab 12 00 00 de ad be ef c0 ff ee 01 ef be ad de  ................
```

Let's go ahead a take a look at the disassembly for this particular executable. In our source code, we delcared our byte swapping functions
as _inline_ functions. The _inline_ keyword in C is used as an indicator for the compiler to potentially inline the produced assembly
instructions instead of creating the overhead for a fucntion call.

```nasm
; int __cdecl main(int argc, const char **argv, const char **envp)
main proc near

Str= word ptr -28h
var_24= dword ptr -24h
var_20= dword ptr -20h
var_1C= dword ptr -1Ch
var_18= qword ptr -18h

push    rbx
sub     rsp, 40h
mov     rax, cs:__security_cookie
xor     rax, rsp
mov     [rsp+48h+var_18], rax
mov     eax, 0FFFFAB12h
mov     [rsp+48h+var_24], 0DEADBEEFh
lea     rdx, Mode       ; "w"
mov     [rsp+48h+Str], ax
lea     rcx, Filename   ; "vector_little_endian.dat"
mov     [rsp+48h+var_20], 0C0FFEE01h
mov     [rsp+48h+var_1C], 0EFBEADDEh
call    j_fopen
mov     rbx, rax
test    rax, rax
jnz     short loc_140007111

;...
loc_140007111:          ; Size
mov     edx, 10h
lea     rcx, [rsp+48h+Str] ; Str
mov     r9, rbx         ; File
lea     r8d, [rdx-0Fh]  ; Count
call    j_fwrite
test    rax, rax
jnz     short loc_140007155
;...

;...
loc_140007155:
lea     rdx, Filename   ; "vector_little_endian.dat"
lea     rcx, aSContentsToFil ; "%s contents to file written successfull"...
call    j_printf
mov     rcx, rbx        ; File
call    j_fclose
movzx   eax, [rsp+48h+Str]
mov     edx, 0FFh
movzx   ecx, ax
shl     ax, 8
sar     cx, 8
and     cx, dx
or      cx, ax
mov     [rsp+48h+Str], cx
mov     ecx, [rsp+48h+var_24]
mov     edx, ecx
sar     edx, 8
mov     eax, ecx
and     eax, 0FF00h
and     edx, 0FF00h
shl     eax, 8
or      edx, eax
mov     eax, ecx
shr     eax, 18h
or      edx, eax
shl     ecx, 18h
or      edx, ecx
mov     ecx, [rsp+48h+var_20]
mov     [rsp+48h+var_24], edx
mov     eax, ecx
and     eax, 0FF00h
mov     edx, ecx
shl     eax, 8
sar     edx, 8
and     edx, 0FF00h
or      edx, eax
mov     eax, ecx
shr     eax, 18h
or      edx, eax
shl     ecx, 18h
or      edx, ecx
mov     ecx, [rsp+48h+var_1C]
mov     r8d, ecx
mov     [rsp+48h+var_20], edx
sar     r8d, 8
lea     rdx, Mode       ; "w"
mov     eax, ecx
and     r8d, 0FF00h
and     eax, 0FF00h
shl     eax, 8
or      r8d, eax
mov     eax, ecx
shl     ecx, 18h
shr     eax, 18h
or      r8d, eax
or      r8d, ecx
lea     rcx, aVectorBigEndia ; "vector_big_endian.dat"
mov     [rsp+48h+var_1C], r8d
call    j_fopen
mov     rbx, rax
test    rax, rax
jnz     short loc_140007252
;...

;...
loc_140007252:          ; Size
mov     edx, 10h
lea     rcx, [rsp+48h+Str] ; Str
mov     r9, rbx         ; File
lea     r8d, [rdx-0Fh]  ; Count
call    j_fwrite
test    rax, rax
jnz     short loc_140007296
;...

;...
loc_140007296:
lea     rdx, aVectorBigEndia ; "vector_big_endian.dat"
lea     rcx, aSContentsToFil ; "%s contents to file written successfull"...
call    j_printf
mov     rcx, rbx        ; File
call    j_fclose
xor     eax, eax
mov     rcx, [rsp+48h+var_18]
xor     rcx, rsp        ; StackCookie
call    j___security_check_cookie
add     rsp, 40h
pop     rbx
retn
main endp
;...
```

The assembly output does for what we are interested in doesn't look much different than our original example from our hand rolled shift
implementation of just a single integer. It's just expanded out a bit, because we are doing it a few times. This was compiled with MSVC
with optimizations turned on and debug information turn on as well.

Let's do the same thing byte swapping, but this time use the portable standard library functions __byteswap__ functions.

```c
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>

typedef struct _vector3i
{
    int16_t id;
    int32_t x;
    int32_t y;
    int32_t z;
} Vector3i;

void WriteStructToFile(const char *name, Vector3i *v)
{
    FILE *file = NULL;
    file = fopen(name, "w");
    if (file == NULL)
    {
        fprintf(stderr, "\nError opening file\n");
        exit(1);
    }

    if (fwrite(v, sizeof(Vector3i), 1, file) == 0)
    {
        fprintf(stderr, "\nError failed to write vector_a\n");
        fclose(file);
        exit(1);
    }

    printf("%s contents to file written successfully!\n", name);
    fclose(file);
}

int main(void)
{
    Vector3i vector_a;
    vector_a.id = 0xAB12;
    vector_a.x =  0xDEADBEEF;
    vector_a.y =  0xC0FFEE01;
    vector_a.z =  0xEFBEADDE;
    WriteStructToFile("vector_little_endian.dat", &vector_a);

    vector_a.id = _byteswap_ushort(vector_a.id);
    vector_a.x  = _byteswap_ulong(vector_a.x);
    vector_a.y  = _byteswap_ulong(vector_a.y);
    vector_a.z  = _byteswap_ulong(vector_a.z);
    WriteStructToFile("vector_big_endian.dat", &vector_a);

    return 0;
}
```
```text
-- little endian --
-- 1-byte group --
00000000: 12 ab 00 00 ef be ad de 01 ee ff c0 de ad be ef  ................
```
```text
-- big endian --
-- 1-byte group --
00000000: ab 12 00 00 de ad be ef c0 ff ee 01 ef be ad de  ................
```

Alright, we were able to achieve the same results using the standard library __byteswap_ functions. Now, let's create a disassembly dump
that we can take a look at to make sure the MSVC compiler with the highest optimization setting is producing our bswap instructions again.

```nasm
; int __cdecl main(int argc, const char **argv, const char **envp)
main proc near

Str= word ptr -28h
var_24= dword ptr -24h
var_20= dword ptr -20h
var_1C= dword ptr -1Ch
var_18= qword ptr -18h

push    rbx
sub     rsp, 40h
mov     rax, cs:__security_cookie
xor     rax, rsp
mov     [rsp+48h+var_18], rax
mov     eax, 0FFFFAB12h
mov     [rsp+48h+var_24], 0DEADBEEFh
lea     rdx, Mode       ; "w"
mov     [rsp+48h+Str], ax
lea     rcx, Filename   ; "vector_little_endian.dat"
mov     [rsp+48h+var_20], 0C0FFEE01h
mov     [rsp+48h+var_1C], 0EFBEADDEh
call    j_fopen
mov     rbx, rax
test    rax, rax
jz      loc_1400071B2

;...
mov     edx, 10h        ; Size
lea     rcx, [rsp+48h+Str] ; Str
mov     r9, rax         ; File
lea     r8d, [rdx-0Fh]  ; Count
call    j_fwrite
test    rax, rax
jz      loc_1400071D6
;...

;...
lea     rdx, Filename   ; "vector_little_endian.dat"
lea     rcx, Format     ; "%s contents to file written successfull"...
call    j_printf
mov     rcx, rbx        ; File
call    j_fclose
mov     eax, [rsp+48h+var_24]
lea     rdx, Mode       ; "w"
ror     [rsp+48h+Str], 8
lea     rcx, aVectorBigEndia ; "vector_big_endian.dat"
bswap   eax
mov     [rsp+48h+var_24], eax
mov     eax, [rsp+48h+var_20]
bswap   eax
mov     [rsp+48h+var_20], eax
mov     eax, [rsp+48h+var_1C]
bswap   eax
mov     [rsp+48h+var_1C], eax
call    j_fopen
mov     rbx, rax
test    rax, rax
jz      loc_140007202
;...

;...
mov     edx, 10h        ; Size
lea     rcx, [rsp+48h+Str] ; Str
mov     r9, rax         ; File
lea     r8d, [rdx-0Fh]  ; Count
call    j_fwrite
test    rax, rax
jz      loc_140007226
;...

;...
lea     rdx, aVectorBigEndia ; "vector_big_endian.dat"
lea     rcx, Format     ; "%s contents to file written successfull"...
call    j_printf
mov     rcx, rbx        ; File
call    j_fclose
xor     eax, eax
mov     rcx, [rsp+48h+var_18]
xor     rcx, rsp        ; StackCookie
call    j___security_check_cookie
add     rsp, 40h
pop     rbx
retn
;...
```

At last, we can see that the MSVC compiler optimizer did exactly what we wanted it to do with optimizations turned on, debug information turned on,
and without explicitly using a compiler instrinstic.

I would like to focus our attention on another situation, how can we effectively byte swap a floating point value? Once again, I am going to
refer to _Jason Gregory's_ book for another great example of how to easily do this. Basically, we create a union with both a _unsigned int32_
and a _real32_ members to avoid casting between different types.

```c
#include <stdio.h>
#include <stdint.h>

typedef float real32;

typedef union _real32_int32
{
    uint32_t as_uint32;
    real32   as_real32;
} Real32_Int32;

inline uint32_t swap_int32(uint32_t value)
{
    return _byteswap_ulong(value);
}

inline real32 swap_real32(real32 value)
{
    Real32_Int32 u;
    u.as_real32 = value;
    u.as_uint32 = swap_int32(u.as_uint32);
    return u.as_real32;
}

int main(void)
{
    Real32_Int32 x;
    x.as_uint32 = 0xABCD1234;
    int8_t *p = (int8_t *)&x;
 
    printf("little endian\n");   
    printf("address: %p - 0x%02hhX\n", (p + 0), *(p + 0));
    printf("address: %p - 0x%02hhX\n", (p + 1), *(p + 1));
    printf("address: %p - 0x%02hhX\n", (p + 2), *(p + 2));
    printf("address: %p - 0x%02hhX\n", (p + 3), *(p + 3));
        
    x.as_real32 = swap_real32(x.as_real32);

    printf("big endian\n");   
    printf("address: %p - 0x%02hhX\n", (p + 0), *(p + 0));
    printf("address: %p - 0x%02hhX\n", (p + 1), *(p + 1));
    printf("address: %p - 0x%02hhX\n", (p + 2), *(p + 2));
    printf("address: %p - 0x%02hhX\n", (p + 3), *(p + 3));

    return 0;
}
```
```text
little endian
address: 00000004822FF820 - 0x34
address: 00000004822FF821 - 0x12
address: 00000004822FF822 - 0xCD
address: 00000004822FF823 - 0xAB
big endian
address: 00000004822FF820 - 0xAB
address: 00000004822FF821 - 0xCD
address: 00000004822FF822 - 0x12
address: 00000004822FF823 - 0x34
```

There we go! A simple way to reverse bytes for a real32 or 32-bit float value using a union. In this article, I did go in to a few random
rabbit holes with disassembling the examples. To summarize what we went over, endianness is a trivial matter of byte ordering: do we start
with the most significant or least significant byte for our memory ordering? Swapping between little and big endian can be done either
mannual using our shift code or certian CPU architectures instructions.

#### References
- [intel-intrinstics](https://software.intel.com/sites/landingpage/IntrinsicsGuide/#expand=4152,3483,3484,596&text=bswap)
- [agnor-tables](https://www.agner.org/optimize/instruction_tables.pdf)
- [_byteswap](https://docs.microsoft.com/en-us/cpp/c-runtime-library/reference/byteswap-uint64-byteswap-ulong-byteswap-ushort?view=msvc-160)
- [x86-instructions](https://www.felixcloutier.com/x86/)
- [x64-calling-conventions](https://docs.microsoft.com/en-us/cpp/build/x64-calling-convention?view=msvc-160)
- [masm-example](https://renenyffenegger.ch/notes/Windows/development/Visual-Studio/masm/functions/add_3/index)
- [wiki-endianness](https://en.wikipedia.org/wiki/Endianness)