// Pattern drills: the short structures worth having in muscle memory.
//
// One idea each, an exact signature given in the brief, nothing invented to
// hold in your head. The point is not to solve anything. It is to be able to
// write these cold, so that under pressure you start from a shape you already
// know instead of from a blank screen.

DRILLS.push(

{
id: "d-pat-bits",
kind: "pattern",
track: "Embedded C",
d: 1,
title: "Set, clear, toggle and test a bit",
mins: 5,
brief: `
<p>Four one-liners. Each takes a register value and a bit number, and must not disturb any
other bit.</p>
<pre>uint32_t bit_set   (uint32_t r, unsigned n);
uint32_t bit_clear (uint32_t r, unsigned n);
uint32_t bit_toggle(uint32_t r, unsigned n);
bool     bit_test  (uint32_t r, unsigned n);</pre>
<p>Nothing else. If you can write these without thinking, half of register work is free.</p>`,
answer: `
<pre>uint32_t bit_set(uint32_t r, unsigned n)    { return r |  (1u &lt;&lt; n); }
uint32_t bit_clear(uint32_t r, unsigned n)  { return r &amp; ~(1u &lt;&lt; n); }
uint32_t bit_toggle(uint32_t r, unsigned n) { return r ^  (1u &lt;&lt; n); }
bool     bit_test(uint32_t r, unsigned n)   { return (r &amp; (1u &lt;&lt; n)) != 0u; }</pre>

<h3>The shape to remember</h3>
<pre>set     |=   the bit
clear   &amp;= ~ the bit
toggle  ^=   the bit
test    &amp;    the bit, then compare</pre>
<p>OR to add, AND-NOT to remove, XOR to flip, AND to ask. That is the whole thing.</p>

<h3>The <code>u</code> is not decoration</h3>
<p><code>1 &lt;&lt; 31</code> shifts into the sign bit of a <b>signed</b> int, which is undefined
behaviour. <code>1u &lt;&lt; 31</code> is fine.</p>
<p>It will appear to work for years and then not, so write the <code>u</code> every time and
stop thinking about it.</p>
<p><b>Worth knowing:</b> the tests on this drill cannot catch a missing <code>u</code>. On x86
at -O1, <code>1 &lt;&lt; 31</code> produces exactly the same bits as <code>1u &lt;&lt; 31</code>,
so every assertion passes either way. <b>Check my code</b> looks for it textually instead.</p>
<p>That is the whole problem with undefined behaviour in one example: it is not wrong today, on
this compiler, at this optimisation level. It is wrong the first time one of those three
changes, and nothing you can run will warn you first.</p>

<h3>Why <code>!= 0</code> on the test</h3>
<p><code>r &amp; (1u &lt;&lt; n)</code> is <code>0x80000000</code>, not <code>1</code>, when bit
31 is set. Returning it into a <code>bool</code> is fine in C99, but the moment somebody writes
<code>if (bit_test(r, n) == 1)</code> the habit fails. Comparing against zero makes it a real
boolean.</p>

<h3>As macros, which is how you will meet them</h3>
<pre>#define BIT(n)          (1u &lt;&lt; (n))
#define SET_BIT(r, n)    ((r) |=  BIT(n))
#define CLEAR_BIT(r, n)  ((r) &amp;= ~BIT(n))</pre>
<p>Every argument in brackets, and the whole body in brackets. <code>BIT(x + 1)</code> without
them expands to <code>1u &lt;&lt; x + 1</code>, and <code>+</code> binds tighter than
<code>&lt;&lt;</code>, so you get <code>1u &lt;&lt; (x + 1)</code> by luck rather than
<code>(1u &lt;&lt; x) + 1</code>. Get in the habit and you never have to work out which.</p>`,
expect: [
{ re: /1u\s*<</, want: "1u rather than 1 before the shift",
  hint: "the compiler cannot catch this one: see the note in the answer" }
],
checklist: [
"Set uses |=, clear uses &amp;= ~, toggle uses ^=",
"Test uses &amp; and compares against zero",
"Every literal is unsigned: 1u, not 1",
"No other bits are disturbed",
"Could write the macro forms with every argument parenthesised"
]
},

{
id: "d-pat-field",
kind: "pattern",
track: "Embedded C",
d: 2,
title: "Read and write a register field",
mins: 6,
brief: `
<p>A field of several bits inside a register, given a mask and a shift.</p>
<pre>uint32_t field_get(uint32_t reg, uint32_t mask, unsigned shift);
uint32_t field_set(uint32_t reg, uint32_t mask, unsigned shift, uint32_t v);</pre>
<p><code>field_set</code> returns the new register value with that field replaced and every
other bit untouched. It must not let an over-large value spill into neighbouring bits.</p>`,
answer: `
<pre>uint32_t field_get(uint32_t reg, uint32_t mask, unsigned shift)
{
    return (reg &amp; mask) &gt;&gt; shift;
}

uint32_t field_set(uint32_t reg, uint32_t mask, unsigned shift, uint32_t v)
{
    return (reg &amp; ~mask) | ((v &lt;&lt; shift) &amp; mask);
}</pre>

<h3>The shape to remember</h3>
<pre>get:  mask, then shift down
set:  clear the field, then OR the shifted value back in</pre>

<h3>The two places it goes wrong</h3>
<p><b>Forgetting to clear first.</b> <code>reg | (v &lt;&lt; shift)</code> only ever sets bits, so
a field going from 3 to 1 stays 3. It works on a register that starts at zero and fails
afterwards, which is the worst way for a bug to behave.</p>
<p><b>Not re-masking the value.</b> <code>(v &lt;&lt; shift)</code> without the trailing
<code>&amp; mask</code> lets a value too large for the field spill into the bits above it. That
one is very hard to find, because the field you were setting looks correct.</p>

<h3>Why both operations use the same mask</h3>
<p>The mask defines the field, so it appears twice in <code>field_set</code>: inverted to clear,
and upright to bound the new value. Seeing <code>~mask</code> and <code>&amp; mask</code> in the
same line is how you recognise a correct one.</p>

<h3>Where the mask and shift come from</h3>
<pre>#define BAUD_SHIFT  8u
#define BAUD_MASK   (0x0Fu &lt;&lt; BAUD_SHIFT)</pre>
<p>Define the shift once and derive the mask from it, so they cannot drift apart. Two
independent literals is how a register map ends up with a mask that does not match its
shift.</p>`,
checklist: [
"field_get masks then shifts down",
"field_set clears the field before ORing the new value in",
"The new value is re-masked, so it cannot spill into neighbouring bits",
"Other bits in the register are untouched",
"Said why deriving the mask from the shift stops them drifting apart"
]
},

{
id: "d-pat-wait",
kind: "pattern",
track: "Embedded C",
d: 2,
title: "A wait that cannot hang",
mins: 6,
brief: `
<p>Poll a function until it says ready, or give up.</p>
<pre>bool wait_ready(bool (*is_ready)(void), uint32_t timeout_ms,
                void (*delay_ms)(uint32_t));</pre>
<p>Return true if it became ready, false if the timeout expired. Poll every 1 ms.</p>
<p>The structure matters more than the detail: any wait on hardware needs this shape.</p>`,
answer: `
<pre>bool wait_ready(bool (*is_ready)(void), uint32_t timeout_ms,
                void (*delay_ms)(uint32_t))
{
    for (uint32_t i = 0; i &lt; timeout_ms; i++) {
        if (is_ready()) {
            return true;
        }
        delay_ms(1);
    }
    return is_ready();          /* one last look after the final wait */
}</pre>

<h3>The shape to remember</h3>
<pre>bounded loop
    check first
    then wait
check once more on the way out
return whether it happened</pre>

<h3>Check before you wait</h3>
<p>If it is already ready, this returns immediately and never sleeps. Waiting first costs a
millisecond on every single call for no reason, and on a fast peripheral that is most of the
time.</p>

<h3>The last look</h3>
<p>Without it, the final <code>delay_ms(1)</code> is wasted: you slept and then declared failure
without checking whether the sleep helped. One extra call, and it removes an off-by-one that
makes a timeout fire one tick early.</p>

<h3>What matters is that it terminates</h3>
<pre>while (!(REG &amp; READY_BIT)) { }      /* the bug */</pre>
<p>That is the line this pattern exists to replace. It is fine on the bench and it hangs the
product forever when the peripheral does not answer, which is exactly the day you needed the
device to keep working.</p>
<p>Every wait on hardware gets a bound. If there is genuinely nothing sensible to do on timeout,
that is an argument for a watchdog, not for an unbounded loop.</p>`,
checklist: [
"The loop is bounded: it cannot run forever",
"Checks the condition before waiting the first time",
"Checks once more after the final wait",
"Returns whether it succeeded, rather than nothing",
"Said what an unbounded while loop costs, and when it bites"
]
},

{
id: "d-pat-clamp",
kind: "pattern",
track: "Embedded C",
d: 1,
title: "Clamp and saturate",
mins: 5,
brief: `
<p>Two small things that come up constantly.</p>
<pre>int32_t clamp_i32(int32_t v, int32_t lo, int32_t hi);
uint8_t add_sat_u8(uint8_t a, uint8_t b);</pre>
<p><code>clamp_i32</code> confines a value to a range. <code>add_sat_u8</code> adds and sticks
at 255 rather than wrapping to a small number.</p>`,
answer: `
<pre>int32_t clamp_i32(int32_t v, int32_t lo, int32_t hi)
{
    if (v &lt; lo) return lo;
    if (v &gt; hi) return hi;
    return v;
}

uint8_t add_sat_u8(uint8_t a, uint8_t b)
{
    uint16_t s = (uint16_t)a + (uint16_t)b;     /* wider, so it cannot wrap */
    return (s &gt; 255u) ? 255u : (uint8_t)s;
}</pre>

<h3>The shape to remember</h3>
<pre>clamp:     below the floor, return the floor
           above the ceiling, return the ceiling
           otherwise return it

saturate:  compute in a wider type
           if it overflowed, return the limit</pre>

<h3>Why the wider type</h3>
<p><code>a + b</code> in <code>uint8_t</code> promotes to <code>int</code> anyway, so the sum is
correct, but assigning it back to a <code>uint8_t</code> truncates. Doing the arithmetic in
<code>uint16_t</code> makes the intent explicit and gives you something to test.</p>
<p>The general rule: <b>detect overflow before it happens or in a type where it cannot
happen.</b> Checking afterwards on a signed type is undefined and the compiler may delete the
check.</p>

<h3>Why clamp is written as two ifs</h3>
<p>The nested ternary version is one line and hard to read at a glance:</p>
<pre>return v &lt; lo ? lo : (v &gt; hi ? hi : v);</pre>
<p>Both are correct. Write whichever you can produce without hesitating, because that is the
one you will get right at a whiteboard.</p>

<h3>Where it turns up</h3>
<p>PWM duty limits, an ADC reading with a plausibility bound, an integrator with anti-windup,
and a setpoint from an untrusted source. Anywhere a number arrives from outside and a bound is
a physical fact rather than a preference.</p>`,
checklist: [
"clamp returns the bound, not the value, when out of range",
"clamp handles v exactly equal to lo and to hi",
"add_sat computes in a wider type so the sum cannot wrap",
"add_sat returns 255 rather than a small wrapped number",
"Said the rule: detect overflow before it happens, or in a type where it cannot"
]
},

{
id: "d-pat-bytes",
kind: "pattern",
track: "Embedded C",
d: 2,
title: "Bytes to a value, and back",
mins: 6,
brief: `
<p>Serialisation, in both directions, big-endian.</p>
<pre>uint16_t be16_get(const uint8_t *p);
void     be16_put(uint8_t *p, uint16_t v);</pre>
<p>Must be correct on any host, and must work from an unaligned address.</p>`,
answer: `
<pre>uint16_t be16_get(const uint8_t *p)
{
    return (uint16_t)(((uint16_t)p[0] &lt;&lt; 8) | p[1]);
}

void be16_put(uint8_t *p, uint16_t v)
{
    p[0] = (uint8_t)(v &gt;&gt; 8);
    p[1] = (uint8_t)(v &amp; 0xFFu);
}</pre>

<h3>The shape to remember</h3>
<pre>get:  shift each byte up to its position, OR them together
put:  shift the value down to each position, mask to a byte</pre>
<p>Big-endian means the most significant byte comes first, so <code>p[0]</code> is the one that
gets shifted furthest. Little-endian is the same code with the indices swapped.</p>

<h3>Why this is the correct way</h3>
<p>It never asks what the host's byte order is, because it works arithmetically rather than by
looking at storage. Shifting is defined in terms of <b>value</b>, so the same source is right on
a big-endian and a little-endian machine.</p>
<p>The wrong version looks shorter and has three separate problems:</p>
<pre>uint16_t v = *(uint16_t *)p;      /* alignment, aliasing, and endianness */</pre>
<p><code>p</code> may not be 2-byte aligned; casting a <code>uint8_t*</code> to
<code>uint16_t*</code> breaks strict aliasing; and the result depends on the host.</p>

<h3>The cast that matters</h3>
<p>At 16 bits, <code>p[0] &lt;&lt; 8</code> without the cast is harmless. At 32 bits,
<code>p[0] &lt;&lt; 24</code> promotes <code>uint8_t</code> to <b>signed int</b> and shifts into
the sign bit, which is undefined.</p>
<p>Write the cast at 16 bits so the habit is already there at 32, where it is a real bug.</p>`,
checklist: [
"be16_get assembles from the bytes, so it is host-independent",
"p[0] is the most significant byte",
"Each byte is cast to the wide type before shifting",
"be16_put masks each byte on the way out",
"Works from an unaligned pointer, and said why the pointer cast does not"
]
},

{
id: "d-pat-errcheck",
kind: "pattern",
track: "Embedded C",
d: 1,
title: "Propagating an error without losing it",
mins: 6,
brief: `
<p>A sequence of three calls that can each fail. Write it so the first failure stops the
sequence and the caller learns which error it was.</p>
<pre>int step_a(void);
int step_b(void);
int step_c(void);

int do_sequence(void);      /* 0 on success, the failing step's code otherwise */</pre>
<p>Each step returns 0 for success and a negative value for failure.</p>`,
answer: `
<pre>int do_sequence(void)
{
    int rc;

    rc = step_a();
    if (rc != 0) return rc;

    rc = step_b();
    if (rc != 0) return rc;

    return step_c();
}</pre>

<h3>The shape to remember</h3>
<pre>rc = call();
if (rc) return rc;</pre>
<p>Two lines, repeated. That is the whole pattern, and it is most of what disciplined firmware
looks like.</p>

<h3>What it gets right</h3>
<ul>
<li><b>It stops.</b> Step b never runs if a failed, which matters when b assumes a's effect.</li>
<li><b>The error keeps its identity.</b> Returning <code>rc</code> rather than <code>-1</code>
means the caller can distinguish a timeout from a missing device and act differently.</li>
<li><b>The last call is just returned.</b> No <code>rc = step_c(); return rc;</code>.</li>
</ul>

<h3>The version with cleanup</h3>
<p>When something has been acquired, the same shape with one exit:</p>
<pre>int do_sequence_with_resource(void)
{
    int rc;
    void *buf = acquire();
    if (buf == NULL) return -ENOMEM;

    rc = step_a();
    if (rc != 0) goto out;

    rc = step_b();
    if (rc != 0) goto out;

    rc = step_c();

out:
    release(buf);
    return rc;
}</pre>
<p>This is the one legitimate use of <code>goto</code> in C, and it is common in the Linux
kernel for exactly this reason. Every exit path releases, because there is only one exit
path.</p>
<p>The alternative, releasing at each early return, means adding a resource later requires
editing every return, and the one you miss is the leak.</p>`,
checklist: [
"Checks the return of every call",
"Stops at the first failure rather than continuing",
"Returns the original error code rather than a generic -1",
"Returns the final call directly instead of assigning then returning",
"Could write the goto-cleanup version, and said why it has a single exit"
]
},

{
id: "d-pat-macros",
kind: "pattern",
track: "Embedded C",
d: 1,
title: "The three macros, parenthesised properly",
mins: 5,
brief: `
<p>Write these three so they cannot be broken by their arguments.</p>
<pre>ARRAY_SIZE(a)     how many elements
MIN(a, b)
MAX(a, b)</pre>
<p>They look trivial. The parenthesisation is the entire exercise.</p>`,
answer: `
<pre>#define ARRAY_SIZE(a)  (sizeof(a) / sizeof((a)[0]))
#define MIN(a, b)      (((a) &lt; (b)) ? (a) : (b))
#define MAX(a, b)      (((a) &gt; (b)) ? (a) : (b))</pre>

<h3>The rule</h3>
<p><b>Every argument in brackets, and the whole body in brackets.</b> No exceptions, no
judgement calls, no thinking about whether this one needs it.</p>

<h3>What it costs to skip</h3>
<pre>#define MIN(a, b)  a &lt; b ? a : b

MIN(1, 2) * 3     expands to  1 &lt; 2 ? 1 : 2 * 3
                  which is    1 &lt; 2 ? 1 : 6
                  and ?: binds looser than *, so the whole
                  thing is not what anyone intended</pre>
<p>Wrapping the body fixes that. Wrapping the arguments fixes the other half:
<code>MIN(x, y + 1)</code> without brackets around <code>b</code> compares <code>x &lt; y</code>
and returns <code>y + 1</code>.</p>

<h3>The one MIN cannot fix</h3>
<pre>MIN(i++, limit)</pre>
<p><code>a</code> appears twice in the expansion, so <code>i</code> is incremented twice on one
branch. No amount of parenthesising helps, because the problem is that a macro is not a
function.</p>
<p>The defences are a <code>static inline</code> function, which evaluates its arguments once,
or GCC's statement-expression form. Knowing that the problem exists is the part worth
having.</p>

<h3>Why ARRAY_SIZE is a trap in disguise</h3>
<pre>void f(int a[10])
{
    ARRAY_SIZE(a);        /* NOT 10 */
}</pre>
<p>The parameter is a pointer, so this is the pointer size divided by the element size. It
silently gives 2 on a 32-bit target with <code>int</code> elements.</p>
<p><code>ARRAY_SIZE</code> is only valid where the real array is in scope. That is why a
function taking a buffer must also take its length.</p>`,
checklist: [
"Every macro argument is in brackets",
"The whole macro body is in brackets",
"ARRAY_SIZE divides by sizeof((a)[0]), with the argument bracketed",
"Said that MIN evaluates an argument twice, so side effects break it",
"Said that ARRAY_SIZE on a function parameter gives the pointer size"
]
},

{
id: "d-pat-ring",
kind: "pattern",
track: "Embedded C",
d: 3,
title: "The smallest ring buffer that works",
mins: 8,
brief: `
<p>A power-of-two ring buffer, in as few lines as it takes.</p>
<pre>#define RB_SIZE 16       /* provided, a power of two */

typedef struct {
    uint8_t  buf[RB_SIZE];
    uint16_t head, tail;
} rb_t;

bool rb_put(rb_t *rb, uint8_t v);       /* false if full */
bool rb_get(rb_t *rb, uint8_t *out);    /* false if empty */</pre>
<p>Sacrifice one slot to tell full from empty. No modulo, no counter.</p>`,
answer: `
<pre>bool rb_put(rb_t *rb, uint8_t v)
{
    uint16_t next = (uint16_t)((rb-&gt;head + 1u) &amp; (RB_SIZE - 1u));

    if (next == rb-&gt;tail) {
        return false;               /* full */
    }
    rb-&gt;buf[rb-&gt;head] = v;
    rb-&gt;head = next;                /* publish AFTER writing */
    return true;
}

bool rb_get(rb_t *rb, uint8_t *out)
{
    if (rb-&gt;head == rb-&gt;tail) {
        return false;               /* empty */
    }
    *out = rb-&gt;buf[rb-&gt;tail];
    rb-&gt;tail = (uint16_t)((rb-&gt;tail + 1u) &amp; (RB_SIZE - 1u));
    return true;
}</pre>

<h3>The shape to remember</h3>
<pre>empty:  head == tail
full:   next(head) == tail
wrap:   &amp; (SIZE - 1), because SIZE is a power of two
order:  write the data, THEN move the index</pre>

<h3>Why one slot is wasted</h3>
<p>With no spare slot, a completely full buffer and a completely empty one both have
<code>head == tail</code> and there is no way to tell them apart. Giving up one slot makes the
two states distinguishable with no counter and no flag, and a counter is exactly the shared
variable that would need protecting.</p>

<h3>Why the mask, not the modulo</h3>
<p><code>% RB_SIZE</code> is a division, which on a Cortex-M0 has no instruction and becomes a
library call. <code>&amp; (RB_SIZE - 1)</code> is one cycle, and it is only correct because the
size is a power of two. That is why ring buffers are always sized that way.</p>

<h3>Why the order of the last two lines matters</h3>
<p>Write the data, then advance the index. If a consumer runs between the two, it sees the old
index and does not read the half-written slot.</p>
<p>Reverse those two lines and the consumer can read a slot the producer has not filled yet.
That single ordering is what makes this safe for one producer and one consumer with no lock at
all, and it is the answer to "how would you do this without a mutex".</p>`,
checklist: [
"Empty is head == tail",
"Full is computed from the next head, not from a counter",
"Wrapping uses a mask, and said why the size must be a power of two",
"Writes the data before advancing the index",
"Said that this ordering is what makes it lock-free for one producer and one consumer"
]
},

{
id: "d-pat-scale",
kind: "pattern",
track: "Embedded C",
d: 2,
title: "Counts to units, without overflowing",
mins: 6,
brief: `
<p>Convert a 12-bit ADC reading to millivolts.</p>
<pre>uint32_t counts_to_mv(uint16_t counts, uint32_t vref_mv);
/* counts is 0..4095, full scale reads vref_mv */</pre>
<p>Get the arithmetic order right, and say what happens to the fraction.</p>`,
answer: `
<pre>uint32_t counts_to_mv(uint16_t counts, uint32_t vref_mv)
{
    return ((uint32_t)counts * vref_mv) / 4095u;
}</pre>

<h3>The shape to remember</h3>
<pre>multiply first, divide second
promote to the wide type BEFORE multiplying</pre>

<h3>Why the order is the whole question</h3>
<pre>(counts / 4095) * vref_mv     /* wrong: integer division first */</pre>
<p><code>counts / 4095</code> is 0 for every input except full scale, so this returns 0 or
<code>vref_mv</code> and nothing in between. It is the single most common mistake in fixed-point
scaling, and it looks perfectly reasonable.</p>

<h3>Why the cast comes first</h3>
<p><code>counts * vref_mv</code> is 4095 × 3300 = about 13.5 million, which needs 24 bits.
<code>uint16_t</code> promotes to <code>int</code>, so on a 32-bit target this happens to fit,
and on a 16-bit target it overflows silently.</p>
<p>Casting before the multiply says what you meant rather than relying on the target's
<code>int</code> width, which is exactly the assumption that does not travel.</p>

<h3>Rounding</h3>
<p>Integer division truncates, so this reads about half an LSB low on average. If that matters:</p>
<pre>return ((uint32_t)counts * vref_mv + 2047u) / 4095u;</pre>
<p>Adding half the divisor before dividing rounds to nearest. It costs one add, and the version
without it is fine for most work as long as the choice was deliberate.</p>

<h3>4095 and not 4096</h3>
<p>A 12-bit converter has 4096 codes, numbered 0 to 4095, and full scale reads 4095. Dividing by
4096 makes full scale read slightly under <code>vref</code>.</p>
<p>Which is right depends on the datasheet's transfer function, and being able to say <b>why you
chose one</b> is the part that matters.</p>`,
checklist: [
"Multiplies before dividing",
"Casts to the wide type before the multiply, not after",
"Divides by 4095 for a 12-bit converter, and could justify it",
"Said that integer division truncates, and how to round to nearest",
"No intermediate overflows on a 16-bit int"
]
},

{
id: "d-pat-seam",
kind: "pattern",
track: "Embedded C",
d: 3,
title: "The transport struct, from memory",
mins: 8,
brief: `
<p>The pattern that makes a driver portable and testable. Write it from memory.</p>
<pre>/* a transport the driver calls, and a context it passes back */
typedef struct { ... } dev_io_t;

typedef struct dev_s dev_t;              /* opaque */

int dev_init(const dev_io_t *io, dev_t **out);</pre>
<p>Fill in the transport struct and write <code>dev_init</code>. It must reject a NULL argument
or a NULL function pointer, copy the transport into the device, and leave <code>*out</code>
untouched on failure. Return 0 or a negative error.</p>
<p>Use <code>calloc</code> for the device. <code>DEV_EINVAL</code> and <code>DEV_ENOMEM</code>
are provided.</p>`,
answer: `
<pre>typedef struct {
    int  (*read) (void *ctx, uint8_t reg, uint8_t *buf, size_t len);
    int  (*write)(void *ctx, uint8_t reg, const uint8_t *buf, size_t len);
    void (*delay_ms)(void *ctx, uint32_t ms);
    void *ctx;
} dev_io_t;

struct dev_s {
    dev_io_t io;
};

int dev_init(const dev_io_t *io, dev_t **out)
{
    if (io == NULL || out == NULL)  return DEV_EINVAL;
    if (io-&gt;read == NULL || io-&gt;write == NULL || io-&gt;delay_ms == NULL)
        return DEV_EINVAL;

    dev_t *dev = calloc(1, sizeof(*dev));
    if (dev == NULL) return DEV_ENOMEM;

    dev-&gt;io = *io;          /* copy, so the caller's struct need not survive */

    *out = dev;             /* only on success */
    return 0;
}</pre>

<h3>The shape to remember</h3>
<pre>a struct of function pointers, plus a void *ctx
an opaque handle type
init: validate, allocate, copy the io, hand back the handle</pre>

<h3>What <code>ctx</code> is for</h3>
<p>A function pointer alone cannot carry state. <code>ctx</code> is whatever the implementation
needs, passed back untouched on every call: an I2C handle on target, a pointer to fake registers
in a test. The driver never looks inside it.</p>
<p>That single <code>void *</code> is what turns three function pointers into a working
abstraction.</p>

<h3>Why copy the io struct</h3>
<p><code>dev-&gt;io = *io</code> means the caller can build the transport on the stack and let
it go. Storing the pointer instead would leave the device holding a dangling reference the
moment the caller's function returns.</p>
<p>What the caller <b>must</b> keep alive is whatever <code>ctx</code> points at, and that
belongs in the header's documentation.</p>

<h3>Why the handle is opaque</h3>
<p><code>typedef struct dev_s dev_t;</code> in the header with the definition in the .c file
means callers cannot reach inside. You can change the layout without recompiling them, and
nobody can write code that depends on your internals.</p>

<h3>Why *out is untouched on failure</h3>
<p>A caller who forgets to check the return keeps their old value rather than getting a pointer
to nothing. It costs nothing and makes the function safer to misuse.</p>

<h3>Why this is the answer to "how would you test that"</h3>
<p>Point <code>read</code> and <code>write</code> at functions that answer from an array, and the
whole driver runs on your laptop with no hardware. That is not a testing trick bolted on
afterwards: it is the same indirection that makes the driver portable, used for a second
purpose.</p>`,
checklist: [
"Three function pointers plus a void *ctx",
"Rejects NULL arguments and NULL function pointers before allocating",
"Copies the io struct rather than storing the pointer, and said why",
"Leaves *out untouched on every failure path",
"Frees nothing it did not allocate, and does not leak on the error paths",
"Said what ctx is for, and that this is the same seam a test uses"
]
}

);
