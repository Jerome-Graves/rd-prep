// More pattern drills. Same rules: one idea, an exact signature, nothing
// invented to hold in your head.

DRILLS.push(

{
id: "d-pat-swap",
kind: "pattern",
track: "Embedded C",
d: 1,
title: "Swap two values",
mins: 4,
brief: `
<p>The smallest one there is.</p>
<pre>void swap_i32(int32_t *a, int32_t *b);</pre>
<p>Then say what you think of the XOR trick.</p>`,
answer: `
<pre>void swap_i32(int32_t *a, int32_t *b)
{
    int32_t t = *a;
    *a = *b;
    *b = t;
}</pre>

<h3>The shape to remember</h3>
<pre>save one, overwrite it, restore the other from the save</pre>
<p>Three lines. There is no cleverer correct version.</p>

<h3>The XOR trick, and why not</h3>
<pre>*a ^= *b;  *b ^= *a;  *a ^= *b;      /* do not */</pre>
<p>It swaps without a temporary, and it is wrong in one case that matters: if
<code>a == b</code>, the first line zeroes the value and it never comes back. Aliasing is
exactly the case a swap function meets, because it is usually called from a sort.</p>
<p>It is also not faster. The compiler allocates the temporary to a register, so the plain
version costs nothing, and the XOR version has three dependent operations that cannot be
reordered.</p>
<p>The right answer in an interview is: I know the trick, it is a false economy, and it has a
correctness bug. That is more informative than either using it or not knowing it.</p>

<h3>The generic version, since it will come up</h3>
<pre>void swap_bytes(void *a, void *b, size_t n)
{
    uint8_t *x = a, *y = b;
    for (size_t i = 0; i &lt; n; i++) {
        uint8_t t = x[i]; x[i] = y[i]; y[i] = t;
    }
}</pre>
<p>Byte-wise so it works on any type, which is what <code>qsort</code> does internally. Note it
has the same aliasing question, and here overlapping ranges rather than identical pointers are
the problem.</p>`,
expect: [
{ re: /\*\s*a\s*=\s*\*\s*b/, want: "assignment through the pointers, not of them", hint: "" }
],
checklist: [
"Uses a temporary, and swaps through the pointers",
"Does not use the XOR trick",
"Could explain that XOR swap breaks when both pointers are the same",
"Said that the temporary is free, because the compiler keeps it in a register"
]
},

{
id: "d-pat-abs",
kind: "pattern",
track: "Embedded C",
d: 1,
title: "Absolute value, and the one input that breaks it",
mins: 5,
brief: `
<p>Two small functions.</p>
<pre>int32_t sign_i32(int32_t v);      /* -1, 0 or +1 */
uint32_t abs_i32(int32_t v);      /* magnitude, note the return type */</pre>
<p>The return type of the second one is the whole question.</p>`,
answer: `
<pre>int32_t sign_i32(int32_t v)
{
    if (v &gt; 0) return 1;
    if (v &lt; 0) return -1;
    return 0;
}

uint32_t abs_i32(int32_t v)
{
    /* compute the magnitude in unsigned, where INT32_MIN fits */
    return (v &lt; 0) ? (0u - (uint32_t)v) : (uint32_t)v;
}</pre>

<h3>Why the return type is unsigned</h3>
<p>Two's complement is not symmetric. <code>INT32_MIN</code> is -2147483648 and
<code>INT32_MAX</code> is 2147483647, so the magnitude of the most negative value <b>does not
fit in an int32_t</b>.</p>
<pre>int32_t abs_i32(int32_t v) { return v &lt; 0 ? -v : v; }   /* wrong */</pre>
<p>For <code>INT32_MIN</code>, <code>-v</code> overflows, which is undefined. In practice it
returns <code>INT32_MIN</code> again, so the function returns a negative "absolute value" and
nothing warns you.</p>
<p>The C library's <code>abs()</code> has exactly this hole, documented and unfixable, because
its return type was fixed decades ago.</p>

<h3>Why the conversion is written that way</h3>
<p><code>(uint32_t)v</code> on a negative value is defined: it adds 2^32. So
<code>INT32_MIN</code> becomes 2147483648, and <code>0u - that</code> gives 2147483648 back,
which is the correct magnitude.</p>
<p>Doing the negation in signed and then converting is the version that breaks.</p>
<p><b>Worth knowing:</b> the tests on this drill cannot catch that mistake either. On x86 at
-O1, <code>-INT32_MIN</code> produces the same bits that convert to the correct magnitude, so
<code>(uint32_t)(v &lt; 0 ? -v : v)</code> passes every assertion. It is still undefined, and it
is still the version that a sanitizer flags and a different optimiser may treat differently.
<b>Check my code</b> looks for the conversion textually instead.</p>

<h3>The general rule this is an instance of</h3>
<p><b>Do the arithmetic in a type where the result cannot overflow.</b> Same rule as the
saturating add and the integer parser: not "check afterwards", because on a signed type
afterwards is already undefined and the compiler may delete your check.</p>

<h3>Where it bites in real code</h3>
<p>An error term in a control loop, a difference between two sensor readings, or a delta between
timestamps. Anywhere you subtract two numbers and then take the magnitude, the most negative
result is reachable and is the one that behaves differently.</p>`,
expect: [
{ re: /0u?\s*-\s*\(\s*uint32_t\s*\)/, want: "conversion to unsigned before the negation",
  hint: "0u - (uint32_t)v; the compiler cannot catch this one, see the answer" }
],
checklist: [
"abs returns an unsigned type",
"Handles INT32_MIN correctly rather than returning a negative number",
"Converts to unsigned before negating, not after",
"sign returns three distinct values including zero",
"Could say why the library's abs() has the same hole"
]
},

{
id: "d-pat-elapsed",
kind: "pattern",
track: "Embedded C",
d: 2,
title: "Has the timeout expired?",
mins: 6,
brief: `
<p>A free-running millisecond tick that wraps at 2^32.</p>
<pre>bool expired(uint32_t start, uint32_t now, uint32_t timeout_ms);</pre>
<p>Return true once <code>timeout_ms</code> has passed since <code>start</code>. It must keep
working when the tick wraps, which it will after about 49 days.</p>
<p>This is a one-liner that is very commonly written wrong.</p>`,
answer: `
<pre>bool expired(uint32_t start, uint32_t now, uint32_t timeout_ms)
{
    return (uint32_t)(now - start) &gt;= timeout_ms;
}</pre>

<h3>The shape to remember</h3>
<pre>subtract, THEN compare
never compare the absolute values</pre>

<h3>Why subtracting first survives the wrap</h3>
<p>Unsigned arithmetic wraps by definition: it is modular, not undefined. So if
<code>start</code> is 0xFFFFFF00 and <code>now</code> is 0x00000010, the subtraction gives 0x110,
which is 272 ms. Exactly right, with no special case.</p>
<p>The wrap cancels itself, which is why this works and why the type must be
<b>unsigned</b>.</p>

<h3>The wrong version</h3>
<pre>return now &gt;= start + timeout_ms;      /* breaks on wrap */</pre>
<p><code>start + timeout_ms</code> wraps to a small number, and <code>now</code> is large, so
this reports expired immediately. Or the reverse: it never expires and the code hangs for 49
days.</p>
<p>It works perfectly for the first 49 days of uptime, which is exactly long enough to ship.
This is a well-known class of field bug and it has taken down real systems.</p>

<h3>Why >= and not ></h3>
<p>A timeout of exactly <code>timeout_ms</code> should have expired. With <code>&gt;</code> you
wait one tick longer than asked, which nobody notices until the tick is 10 ms and someone asks
for a 10 ms timeout.</p>

<h3>The same shape everywhere</h3>
<pre>if ((uint32_t)(now - last_sample) &gt;= SAMPLE_PERIOD) { ... }
if ((int32_t)(seq_a - seq_b) &gt; 0)    /* sequence numbers */</pre>
<p>That second one is the signed version, and it is how TCP compares sequence numbers: cast the
difference to signed and check the sign, which handles wrap in both directions.</p>`,
checklist: [
"Subtracts first, then compares against the timeout",
"The subtraction is done in an unsigned type",
"Works when now < start, which is the wrap case",
"Uses >= so an exact timeout counts as expired",
"Could say why comparing start + timeout against now breaks"
]
},

{
id: "d-pat-align",
kind: "pattern",
track: "Embedded C",
d: 2,
title: "Rounding up to an alignment",
mins: 6,
brief: `
<p>Two functions, with <code>a</code> always a power of two.</p>
<pre>uint32_t align_up(uint32_t v, uint32_t a);
bool     is_aligned(uint32_t v, uint32_t a);</pre>
<p><code>align_up(0, 8)</code> is 0, <code>align_up(1, 8)</code> is 8, <code>align_up(8, 8)</code>
is 8. No division and no loop.</p>`,
answer: `
<pre>uint32_t align_up(uint32_t v, uint32_t a)
{
    return (v + a - 1u) &amp; ~(a - 1u);
}

bool is_aligned(uint32_t v, uint32_t a)
{
    return (v &amp; (a - 1u)) == 0u;
}</pre>

<h3>The shape to remember</h3>
<pre>a - 1     is the mask of the low bits
&amp; ~(a-1)  clears them: rounds DOWN
+ a - 1   first: rounds UP instead</pre>

<h3>Reading it</h3>
<p>For <code>a = 8</code>: <code>a - 1</code> is 7, which is <code>0b111</code>, the three bits
that make a value unaligned. ANDing with <code>~7</code> clears them, giving the multiple of 8
at or below <code>v</code>.</p>
<p>Adding <code>a - 1</code> before clearing pushes anything that was not already aligned up into
the next multiple. Anything already aligned is pushed to just below the next one and comes back
down to itself, which is why <code>align_up(8, 8)</code> is 8 rather than 16.</p>

<h3>Why it only works for powers of two</h3>
<p><code>a - 1</code> is only a clean mask of low bits when <code>a</code> has a single bit set.
For <code>a = 6</code>, <code>a - 1</code> is 5, which is <code>0b101</code>, and the whole thing
is nonsense.</p>
<p>Alignments are always powers of two in practice, which is why this is the standard form. If
you need an arbitrary multiple it is <code>((v + a - 1) / a) * a</code>, with a real division.</p>

<h3>Where you meet it</h3>
<p>Allocators rounding a request to a block size, DMA buffers needing a cache-line or 4-byte
boundary, flash writes that must start on a page, and structure padding. It is one of the most
reused expressions in systems code.</p>

<h3>The overflow to be aware of</h3>
<p><code>v + a - 1</code> can wrap if <code>v</code> is within <code>a</code> of the top of the
range. It then rounds down to zero rather than up. Rare, real, and worth saying out loud rather
than defending against unless the input is untrusted.</p>`,
checklist: [
"align_up uses (v + a - 1) & ~(a - 1), with no division or loop",
"align_up leaves an already-aligned value unchanged",
"is_aligned tests the low bits against zero",
"Said that a - 1 is only a valid mask when a is a power of two",
"Noticed that v + a - 1 can overflow near the top of the range"
]
},

{
id: "d-pat-reg",
kind: "pattern",
track: "Embedded C",
d: 2,
title: "Declaring a hardware register",
mins: 6,
brief: `
<p>No functions. Write the declarations, which is the thing most likely to be asked cold.</p>
<pre>/* 1. a read-write 32-bit register at 0x40021000, as a macro
      you can assign to:            REG_CTRL = 0x12; */

/* 2. a read-only status register at 0x40021004: the hardware
      changes it, your code must not write it */

/* 3. a pointer to a volatile int */

/* 4. a volatile pointer to a non-volatile int */</pre>
<p>Say why each qualifier is where it is. The exercise is the placement, not the addresses.</p>`,
answer: `
<pre>/* 1. read-write register */
#define REG_CTRL   (*(volatile uint32_t *)0x40021000u)

/* 2. read-only status register */
#define REG_STATUS (*(const volatile uint32_t *)0x40021004u)

/* 3. a pointer to a volatile int: the target is volatile */
volatile int *p;

/* 4. a volatile pointer to a plain int: the POINTER is volatile */
int * volatile q;</pre>

<h3>Reading the register macro from the inside out</h3>
<pre>0x40021000u                        a number
(volatile uint32_t *)0x40021000u   treat it as an address of a
                                   volatile 32-bit thing
*(volatile uint32_t *)0x40021000u  the thing itself</pre>
<p>The outer <code>*</code> is what makes it usable as a variable, so
<code>REG_CTRL |= 1u</code> reads and writes the hardware. Without it you would have to write
<code>*REG_CTRL</code> everywhere.</p>
<p>The brackets around the whole macro body are not optional: without them
<code>REG_CTRL |= 1u</code> expands into something that binds wrongly.</p>

<h3>Why const volatile is not a contradiction</h3>
<p>They constrain <b>different parties</b>. <code>const</code> stops <b>your code</b> writing
it. <code>volatile</code> stops <b>the compiler</b> assuming the value it read last time is
still good, because the hardware changes it underneath.</p>
<p>A status register is exactly that: read-only to you, changing on its own. Leaving out
<code>volatile</code> because it is already <code>const</code> is how a polling loop reads the
register once and spins forever.</p>

<h3>The left-of-the-star rule</h3>
<pre>volatile int *p;      the int is volatile
int * volatile p;     the pointer is volatile
volatile int * volatile p;    both</pre>
<p>A qualifier applies to what is <b>immediately to its left</b>, unless there is nothing there,
in which case it applies to the right. Everything before the <code>*</code> describes the
target; everything after describes the pointer.</p>

<h3>The one you will actually write most</h3>
<pre>volatile uint32_t * const REG = (volatile uint32_t *)0x40021000u;</pre>
<p>A <b>constant pointer</b> to a <b>volatile</b> register: the address never changes, the
contents do. If you can produce that line and explain both qualifiers, you have answered the
question this drill exists for.</p>`,
expect: [
{ re: /volatile/, want: "volatile on the register's type", hint: "" },
{ re: /const\s+volatile|volatile\s+const/, want: "const volatile on the read-only status register", hint: "" },
{ re: /\*\s*volatile/, want: "a volatile POINTER (int * volatile), not just a volatile target", hint: "" }
],
checklist: [
"The register macro dereferences a cast address, and the whole body is bracketed",
"The status register is const volatile, and could say why that is not a contradiction",
"volatile int *p is a pointer to a volatile int",
"int * volatile q is a volatile pointer",
"Could state the rule: a qualifier binds to what is immediately left of it",
"Could write volatile uint32_t * const REG and explain both qualifiers"
]
},

{
id: "d-pat-container",
kind: "pattern",
track: "Embedded C",
d: 3,
title: "container_of, and why it exists",
mins: 8,
brief: `
<p>Given a pointer to a member, recover a pointer to the struct that contains it.</p>
<pre>#define container_of(ptr, type, member)  /* ... */</pre>
<p>Then use it: a linked list node is embedded in a larger struct, and a callback receives only
the node.</p>
<p>This is how intrusive lists work in the Linux kernel, in Zephyr, and in every RTOS you will
meet.</p>`,
answer: `
<pre>#define container_of(ptr, type, member) \\
    ((type *)((char *)(ptr) - offsetof(type, member)))</pre>

<h3>How it works</h3>
<p><code>offsetof(type, member)</code> is how many bytes into the struct that member sits.
Subtracting it from the member's address gives the struct's address, and the cast says what
kind of thing is there.</p>
<pre>struct task {
    int          id;          /* offset 0 */
    struct node  link;        /* offset 4 */
    uint32_t     deadline;
};

void on_node(struct node *n)
{
    struct task *t = container_of(n, struct task, link);
    /* now you have the whole task from just the link */
}</pre>

<h3>Why the cast to char *</h3>
<p>Pointer arithmetic is in units of the pointed-to type. Subtracting from a
<code>struct node *</code> would move whole nodes. Casting to <code>char *</code> makes the
arithmetic bytes, which is what an offset is measured in.</p>
<p><code>char</code> is also exempt from the strict aliasing rules, so looking at an object
through a character pointer is always legal.</p>

<h3>Why every argument is bracketed</h3>
<p>Same rule as always. <code>(char *)ptr - offsetof(...)</code> without brackets around
<code>ptr</code> breaks the moment somebody passes an expression rather than a plain
variable.</p>

<h3>What it is for</h3>
<p>An <b>intrusive</b> list: the link lives inside the object rather than the list allocating a
node that points at it. That means no allocation to add something to a list, and an object can
be on several lists at once by having several link members.</p>
<p>That is why kernels and RTOSes use it. On a microcontroller "no allocation to enqueue" is not
a micro-optimisation, it is the difference between a bounded system and one that can fail to
enqueue.</p>

<h3>The honest warning</h3>
<p>It is not type safe. Name the wrong member or the wrong type and it compiles and produces a
pointer to the wrong place. The Linux version adds a <code>typeof</code> check that catches the
mismatch; the portable version above cannot.</p>
<p>Knowing that limitation is part of knowing the idiom.</p>`,
expect: [
{ re: /offsetof/, want: "offsetof, rather than a hand-computed offset", hint: "" },
{ re: /\(\s*char\s*\*\s*\)/, want: "a cast to char * so the arithmetic is in bytes", hint: "" }
],
checklist: [
"Uses offsetof rather than a hand-computed number",
"Casts to char * so the subtraction is in bytes, and said why",
"Casts the result back to the container type",
"Every macro argument is bracketed",
"Could explain what an intrusive list is and why it needs no allocation",
"Said that it is not type safe"
]
}

);
