// Warm-up drills: the implement-it-from-scratch questions interviewers open
// with. Short, classic, and every one of them has an edge case that separates
// a careful answer from a quick one.

DRILLS.push(

{
id: "d-write-strrev",
kind: "write",
track: "Embedded C",
title: "Reverse a string in place",
mins: 8,
brief: `
<p>The oldest warm-up there is. Reverse a null-terminated string <b>in place</b>, with no
allocation and no second buffer.</p>
<p>Handle the empty string and the single character. Do not write past the terminator, and do
not move it.</p>`,
answer: `
<pre>void str_reverse(char *s)
{
    if (s == NULL) return;

    size_t n = strlen(s);
    if (n &lt; 2) return;               /* "" and "a" are already done */

    char *a = s, *b = s + n - 1;
    while (a &lt; b) {
        char t = *a; *a = *b; *b = t;
        a++; b--;
    }
}</pre>
<h3>What is being tested</h3>
<p>Three things, none of them the swap.</p>
<ul>
<li><b>The terminator stays where it is.</b> Reversing <code>n + 1</code> bytes puts the NUL at
the front and leaves the string empty. It is the single most common wrong answer.</li>
<li><b>The loop condition.</b> <code>a &lt; b</code>, not <code>a != b</code>. With an even
length the pointers cross without ever being equal, so <code>!=</code> runs off both ends.</li>
<li><b>The degenerate cases.</b> Length 0 and 1 need no work, and a null pointer should not
crash.</li>
</ul>
<h3>Worth saying out loud</h3>
<p>That <code>strlen</code> is a second pass, so if the length is already known the caller
should pass it. On a long string in a hot loop that matters; on a warm-up question it does
not, and saying you noticed is the point.</p>
<p>Also that this reverses <b>bytes</b>. On UTF-8 it would produce nonsense, because a
multi-byte character reversed byte-wise is no longer that character. Nobody expects you to
handle it, and everybody notices if you mention it.</p>`,
checklist: [
"Reverses in place, with no second buffer",
"Leaves the terminator at the end rather than reversing it too",
"Uses a &lt; b, not a != b, so an even length cannot run off the ends",
"Handles the empty string and a single character",
"Handles a NULL pointer without crashing",
"Mentioned that strlen is an extra pass, or that this is byte-wise not character-wise"
]
},

{
id: "d-write-popcount",
kind: "write",
track: "Embedded C",
title: "Count the set bits",
mins: 10,
brief: `
<p>Return how many bits are set in a 32-bit value.</p>
<p>Write the naive version first so it is correct, then improve it. Say what each version
costs.</p>`,
answer: `
<h3>The three answers, in the order to give them</h3>
<pre>/* 1. the obvious one: 32 iterations, always */
int popcount32(uint32_t v)
{
    int n = 0;
    while (v) { n += (int)(v &amp; 1u); v &gt;&gt;= 1; }
    return n;
}

/* 2. Kernighan: one iteration per SET bit */
int popcount32(uint32_t v)
{
    int n = 0;
    while (v) { v &amp;= v - 1u; n++; }
    return n;
}

/* 3. SWAR: constant time, no branches */
int popcount32(uint32_t v)
{
    v = v - ((v &gt;&gt; 1) &amp; 0x55555555u);
    v = (v &amp; 0x33333333u) + ((v &gt;&gt; 2) &amp; 0x33333333u);
    v = (v + (v &gt;&gt; 4)) &amp; 0x0F0F0F0Fu;
    return (int)((v * 0x01010101u) &gt;&gt; 24);
}</pre>
<h3>Why <code>v &amp;= v - 1</code> clears the lowest set bit</h3>
<p>Subtracting one flips the lowest set bit to zero and sets every bit below it. ANDing with
the original keeps only the bits above, so exactly one set bit disappears per iteration. The
loop therefore runs once per set bit rather than 32 times, which is a real win on sparse
values and no worse on dense ones.</p>
<h3>The embedded answer</h3>
<p>On a Cortex-M there may be no popcount instruction, so the SWAR version is genuinely the
fast one. On a machine that has one, <code>__builtin_popcount</code> compiles to a single
instruction and beats everything here, so the honest answer names it and then shows you can do
it by hand.</p>
<p>A 256-entry byte lookup table is the fourth answer, and worth mentioning: four lookups and
three adds, at the cost of 256 bytes of flash and a probable cache miss on a big
processor.</p>`,
checklist: [
"A correct naive version first",
"The v &amp;= v - 1 trick, with an explanation of why it clears the lowest set bit",
"Said that it costs one iteration per set bit rather than 32",
"Mentioned __builtin_popcount, or the hardware instruction where it exists",
"No undefined behaviour: unsigned throughout, so the shifts are safe",
"Handles 0 and 0xFFFFFFFF"
]
},

{
id: "d-write-bswap",
kind: "write",
track: "Embedded C",
title: "Byte order, both directions",
mins: 10,
brief: `
<p>Two functions.</p>
<ul>
<li><code>bswap32</code> reverses the byte order of a 32-bit value.</li>
<li><code>load_be32</code> reads four bytes from a buffer as a big-endian value, correctly on
<b>any</b> host.</li>
</ul>
<p>The second is the one that matters in firmware, and the one people get subtly wrong.</p>`,
answer: `
<pre>uint32_t bswap32(uint32_t v)
{
    return ((v &amp; 0x000000FFu) &lt;&lt; 24) |
           ((v &amp; 0x0000FF00u) &lt;&lt;  8) |
           ((v &amp; 0x00FF0000u) &gt;&gt;  8) |
           ((v &amp; 0xFF000000u) &gt;&gt; 24);
}

uint32_t load_be32(const uint8_t *p)
{
    return ((uint32_t)p[0] &lt;&lt; 24) |
           ((uint32_t)p[1] &lt;&lt; 16) |
           ((uint32_t)p[2] &lt;&lt;  8) |
           ((uint32_t)p[3]);
}</pre>
<h3>Why load_be32 is the important one</h3>
<p>It never asks what the host's endianness is, because it never needs to: it assembles the
value from bytes arithmetically, and shifting is defined in terms of value, not storage. The
same code is correct on a big-endian and a little-endian machine.</p>
<p>The wrong answers both involve looking at storage:</p>
<pre>uint32_t v = *(uint32_t *)p;           /* alignment AND aliasing */
if (host_is_little) v = bswap32(v);    /* and now it depends on the host */</pre>
<p>That version has three problems: <code>p</code> may not be 4-byte aligned, casting a
<code>uint8_t*</code> to <code>uint32_t*</code> breaks strict aliasing, and it needs a
host-endianness test that will eventually be wrong.</p>
<h3>The cast that catches people</h3>
<p><code>p[0] &lt;&lt; 24</code> without the cast is a bug. <code>p[0]</code> is a
<code>uint8_t</code>, which promotes to <b>signed int</b>, and shifting a value into the sign
bit of a signed int is undefined behaviour. Casting each byte to
<code>uint32_t</code> first is what makes it defined.</p>
<h3>Worth knowing</h3>
<p><code>__builtin_bswap32</code> exists and compiles to a single <code>REV</code> instruction
on ARM. Name it, then show the portable version.</p>`,
checklist: [
"bswap32 is correct and uses unsigned types throughout",
"load_be32 assembles from bytes, so it works on any host endianness",
"Each byte is cast to uint32_t before shifting, avoiding the signed-promotion UB",
"Said why casting the buffer pointer to uint32_t* is wrong: alignment and strict aliasing",
"Did not need a host-endianness test",
"Mentioned __builtin_bswap32 or the REV instruction"
]
},

{
id: "d-write-mystr",
kind: "write",
track: "Embedded C",
title: "strlen, and a copy that is actually safe",
mins: 12,
brief: `
<p>Two functions.</p>
<ul>
<li><code>my_strlen</code>, the obvious one.</li>
<li><code>safe_copy(char *dst, size_t cap, const char *src)</code>, which copies with a bound,
<b>always</b> terminates, and returns the length it <b>wanted</b> to write so the caller can
detect truncation.</li>
</ul>
<p>Those are snprintf's semantics, and they are the right ones. Do not reimplement
<code>strncpy</code>.</p>`,
answer: `
<pre>size_t my_strlen(const char *s)
{
    const char *p = s;
    while (*p) p++;
    return (size_t)(p - s);
}

size_t safe_copy(char *dst, size_t cap, const char *src)
{
    size_t n = my_strlen(src);

    if (cap != 0) {
        size_t copy = (n &lt; cap - 1) ? n : cap - 1;
        memcpy(dst, src, copy);
        dst[copy] = '\\0';
    }
    return n;                 /* what it WANTED, so n &gt;= cap means truncated */
}</pre>
<h3>Why the return value is the wanted length</h3>
<p>Returning the number of bytes written tells the caller nothing: they cannot distinguish
"fitted exactly" from "truncated". Returning the length required makes the test
<code>if (safe_copy(...) &gt;= cap)</code>, which is what <code>snprintf</code> does and why its
contract is worth copying.</p>
<h3>The three traps</h3>
<ul>
<li><b><code>cap == 0</code>.</b> There is nowhere to put a terminator, so write nothing at
all. Writing <code>dst[0] = 0</code> when cap is zero is a one-byte overflow, and it is the
usual bug in hand-written versions.</li>
<li><b><code>cap - 1</code> on an unsigned type.</b> If you compute it before checking for
zero, it wraps to SIZE_MAX and the bound disappears entirely.</li>
<li><b>Always terminate.</b> This is exactly what <code>strncpy</code> does not do, and why it
should not be used.</li>
</ul>
<h3>Worth saying</h3>
<p>That <code>my_strlen</code> reads the source twice, once here and once in the copy, so a
single-pass version is possible if it matters. And that real <code>strlen</code>
implementations read a word at a time with bit tricks to find a zero byte, which is why
yours will be slower and why you should use the library one.</p>`,
checklist: [
"my_strlen is correct and takes a const char *",
"safe_copy always terminates, unlike strncpy",
"Returns the length it wanted, so truncation is detectable",
"Handles cap == 0 by writing nothing at all",
"Does not compute cap - 1 before checking cap is non-zero",
"Said why strncpy is the wrong thing to reimplement"
]
},

{
id: "d-write-parseint",
kind: "write",
track: "Embedded C",
title: "Parse an integer, and reject what you should",
mins: 14,
brief: `
<p><code>bool parse_i32(const char *s, int32_t *out)</code>. Return true and write the value
only if the whole string is a valid decimal integer that fits.</p>
<p>Reject: the empty string, anything with trailing characters, and anything that overflows.
Accept an optional leading <code>+</code> or <code>-</code>. Do not accept leading
whitespace.</p>
<p>This is the question behind "why not just use atoi".</p>`,
answer: `
<pre>bool parse_i32(const char *s, int32_t *out)
{
    if (s == NULL || out == NULL) return false;

    bool neg = false;
    if (*s == '+' || *s == '-') { neg = (*s == '-'); s++; }

    if (*s &lt; '0' || *s &gt; '9') return false;      /* need one digit */

    /* accumulate in uint32_t, so there is no signed overflow anywhere */
    uint32_t acc = 0;
    const uint32_t limit = neg ? 2147483648u : 2147483647u;

    while (*s) {
        if (*s &lt; '0' || *s &gt; '9') return false;  /* trailing junk */
        uint32_t d = (uint32_t)(*s - '0');
        if (acc &gt; (limit - d) / 10u) return false;   /* would overflow */
        acc = acc * 10u + d;
        s++;
    }

    *out = neg ? (int32_t)(0u - acc) : (int32_t)acc;
    return true;
}</pre>
<h3>The overflow check, and why it is written that way</h3>
<p>You cannot detect the overflow after it happens: signed overflow is undefined, so the
compiler may assume it never occurs and delete your check. Accumulating in an unsigned type
makes the arithmetic defined, and testing <code>acc &gt; (limit - d) / 10</code>
<b>before</b> multiplying is what keeps it in range.</p>
<h3>The asymmetry that catches people</h3>
<p>Two's complement is not symmetric: the limit is 2147483647 going up and 2147483648 going
down. Using the same bound for both rejects the perfectly valid <code>-2147483648</code>.</p>
<p>The negation is also written as <code>0u - acc</code> in unsigned, then converted, because
computing <code>-2147483648</code> as a signed value overflows on the way.</p>
<h3>Why atoi is not an option</h3>
<p><code>atoi("abc")</code> is 0. So is <code>atoi("0")</code>. There is no way to tell them
apart and no overflow report at all, so any input you did not generate yourself cannot be
parsed with it. <code>strtol</code> with the end pointer checked is the library answer, and
this function is what it does.</p>`,
checklist: [
"Rejects the empty string and a lone sign",
"Rejects trailing characters rather than stopping at the first bad one",
"Detects overflow before it happens, not after",
"Accumulates in an unsigned type so no signed overflow is possible",
"Handles INT32_MIN, whose magnitude is one larger than INT32_MAX",
"Said why atoi cannot be used, and that strtol is the library answer"
]
},

{
id: "d-write-revbits",
kind: "write",
track: "Embedded C",
title: "Reverse the bits in a word",
mins: 10,
brief: `
<p><code>uint32_t reverse_bits32(uint32_t v)</code>: bit 0 becomes bit 31, bit 1 becomes bit 30,
and so on.</p>
<p>Give the loop version, then the divide-and-conquer version. This one turns up in CRC work,
in FFT bit-reversal and in reading a peripheral wired backwards.</p>`,
answer: `
<pre>/* the loop: 32 iterations, easy to get right */
uint32_t reverse_bits32(uint32_t v)
{
    uint32_t r = 0;
    for (int i = 0; i &lt; 32; i++) {
        r = (r &lt;&lt; 1) | (v &amp; 1u);
        v &gt;&gt;= 1;
    }
    return r;
}

/* divide and conquer: swap adjacent groups, doubling the size each step */
uint32_t reverse_bits32(uint32_t v)
{
    v = ((v &gt;&gt; 1)  &amp; 0x55555555u) | ((v &amp; 0x55555555u) &lt;&lt; 1);
    v = ((v &gt;&gt; 2)  &amp; 0x33333333u) | ((v &amp; 0x33333333u) &lt;&lt; 2);
    v = ((v &gt;&gt; 4)  &amp; 0x0F0F0F0Fu) | ((v &amp; 0x0F0F0F0Fu) &lt;&lt; 4);
    v = ((v &gt;&gt; 8)  &amp; 0x00FF00FFu) | ((v &amp; 0x00FF00FFu) &lt;&lt; 8);
    return (v &gt;&gt; 16) | (v &lt;&lt; 16);
}</pre>
<h3>Reading the second one</h3>
<p>Each line swaps neighbouring groups of the same size: single bits, then pairs, then nibbles,
then bytes, then halves. Five steps instead of 32, and no branches at all.</p>
<p>The masks are the pattern to recognise rather than memorise: <code>0x55</code> is
<code>01010101</code>, <code>0x33</code> is <code>00110011</code>, <code>0x0F</code> is
<code>00001111</code>. Each one selects alternate groups at that scale.</p>
<h3>Two properties worth stating</h3>
<ul>
<li>It is its own inverse. Applying it twice gives you back the original, which is the easiest
property to test and the first test to write.</li>
<li>It is not a byte swap. <code>bswap32</code> reverses byte order and leaves the bits within
each byte alone; this reverses the bits too. Confusing the two is common, and a test with
<code>0x01</code> tells them apart immediately.</li>
</ul>
<h3>The hardware answer</h3>
<p>ARMv7-M has an <code>RBIT</code> instruction, reachable as <code>__RBIT()</code> in CMSIS,
which does this in one cycle. Say so, because it is exactly the sort of thing this question is
fishing for.</p>`,
checklist: [
"A correct loop version",
"The divide-and-conquer version, with the mask pattern explained rather than recited",
"Unsigned throughout, so no shift is undefined",
"Noted that applying it twice returns the original",
"Distinguished it from a byte swap",
"Mentioned the RBIT instruction or __RBIT"
]
},

{
id: "d-write-pow2",
kind: "write",
track: "Embedded C",
title: "Powers of two, and rounding up to one",
mins: 10,
brief: `
<p>Two functions.</p>
<ul>
<li><code>bool is_pow2(uint32_t v)</code>, true only for 1, 2, 4, 8 and so on.</li>
<li><code>uint32_t round_up_pow2(uint32_t v)</code>, the smallest power of two that is at least
<code>v</code>.</li>
</ul>
<p>Both come up constantly in buffer sizing, allocators and alignment. Decide what each does
with zero, and say so.</p>`,
answer: `
<pre>bool is_pow2(uint32_t v)
{
    return v != 0u &amp;&amp; (v &amp; (v - 1u)) == 0u;
}

uint32_t round_up_pow2(uint32_t v)
{
    if (v &lt;= 1u) return 1u;
    v--;                       /* so an exact power of two stays put */
    v |= v &gt;&gt; 1;
    v |= v &gt;&gt; 2;
    v |= v &gt;&gt; 4;
    v |= v &gt;&gt; 8;
    v |= v &gt;&gt; 16;
    return v + 1u;
}</pre>
<h3>Why <code>v &amp; (v - 1)</code> works</h3>
<p>A power of two has exactly one bit set. Subtracting one clears it and sets everything below,
so the AND is zero. Anything with two or more bits set keeps the higher ones.</p>
<p>The <code>v != 0</code> is not optional: zero satisfies the AND test and is not a power of
two. Leaving it out is the standard wrong answer to this question.</p>
<h3>Reading the round-up</h3>
<p>The shifts smear the highest set bit down into every position below it, giving a solid run
of ones. Adding one then carries all the way up to the next power of two.</p>
<p>The initial <code>v--</code> is what makes an exact power of two return itself rather than
double.</p>
<h3>The edge case to state out loud</h3>
<p>Anything above 0x80000000 cannot be rounded up within 32 bits. This version returns 0, since
the smear gives 0xFFFFFFFF and adding one wraps. That may be acceptable, but it has to be a
decision: either document it, return an error, or widen the type.</p>
<p>Saying "and here is what it does above 2^31, which you may not want" is the difference
between an answer and a good answer.</p>`,
checklist: [
"is_pow2 rejects zero explicitly",
"Explained why v &amp; (v - 1) identifies a power of two",
"round_up_pow2 returns v itself when v is already a power of two",
"Handles 0 and 1 deliberately rather than by accident",
"Stated what happens above 2^31 rather than leaving it undefined",
"Unsigned arithmetic throughout"
]
},

{
id: "d-write-utoa",
kind: "write",
track: "Embedded C",
title: "Integer to string, without printf",
mins: 12,
brief: `
<p><code>size_t u32_to_str(uint32_t v, char *buf, size_t cap)</code>: write the decimal
representation with a terminator, and return the number of characters written excluding the
terminator. Return 0 and write nothing if it will not fit.</p>
<p>No <code>sprintf</code>. This is what you write when printf's 25 kB is not available, and it
is a fair question for exactly that reason.</p>`,
answer: `
<pre>size_t u32_to_str(uint32_t v, char *buf, size_t cap)
{
    char tmp[10];                 /* 4294967295 is 10 digits */
    size_t n = 0;

    if (buf == NULL || cap == 0u) return 0;

    /* generate digits backwards; do-while so 0 produces "0" */
    do {
        tmp[n++] = (char)('0' + (v % 10u));
        v /= 10u;
    } while (v != 0u);

    if (n + 1u &gt; cap) return 0;   /* will not fit with its terminator */

    for (size_t i = 0; i &lt; n; i++) buf[i] = tmp[n - 1u - i];
    buf[n] = '\\0';
    return n;
}</pre>
<h3>The three things being checked</h3>
<ul>
<li><b>do-while, not while.</b> A plain <code>while (v)</code> produces an empty string for
zero. It is the most common bug in this function and the first test anyone writes.</li>
<li><b>The buffer is exactly big enough.</b> 4294967295 is ten digits, so
<code>char tmp[10]</code> is right and <code>tmp[9]</code> overflows on the largest input.
Getting this from the type rather than from guessing is the point.</li>
<li><b>Nothing is written when it does not fit.</b> Checking the capacity before writing rather
than during means a failure leaves the buffer untouched, which is a much easier contract to
use.</li>
</ul>
<h3>Digits come out backwards</h3>
<p>Repeated division gives the least significant digit first, so you either build into a
temporary and reverse, or walk backwards from the end of the destination. Both are fine; the
temporary is easier to get right and costs ten bytes of stack.</p>
<h3>Worth mentioning</h3>
<p>That division by a constant 10 is compiled to a multiply and shift, so this is not as slow
as it looks. And that the signed version needs care at INT32_MIN, whose magnitude does not fit
in an int32_t, which is the same asymmetry as in the parsing direction.</p>`,
checklist: [
"Uses do-while, so zero produces \"0\" rather than an empty string",
"Temporary buffer is 10 characters, sized from the type rather than guessed",
"Checks the capacity before writing, and writes nothing when it will not fit",
"Terminates the string",
"Returns the length excluding the terminator",
"Handles UINT32_MAX correctly"
]
}

);
