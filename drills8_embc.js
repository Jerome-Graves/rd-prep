// More write-the-code drills, in territory the existing ones do not cover:
// hysteresis, hex encoding, interpolation tables, a watchdog registry and a
// fixed-block pool.

DRILLS.push(

{
id: "d-write-hyst",
kind: "write",
track: "Embedded C",
d: 1,
title: "A threshold that does not chatter",
mins: 10,
brief: `
<p>A comparator with hysteresis, in software: a threshold that will not chatter when the signal
sits on it.</p>
<pre>typedef struct { int32_t on, off; bool state; } hyst_t;

void hyst_init  (hyst_t *h, int32_t on_threshold, int32_t off_threshold);
bool hyst_update(hyst_t *h, int32_t v);</pre>
<ul>
<li><code>h</code> the comparator's state, supplied by the caller and initialised by
<code>hyst_init</code>.</li>
<li><code>on_threshold</code> the level at or above which it switches <b>on</b>.</li>
<li><code>off_threshold</code> the level at or below which it switches <b>off</b>. Assume
<code>on_threshold &gt; off_threshold</code>; the gap between them is the hysteresis.</li>
<li><code>v</code> the newest sample.</li>
</ul>
<p><b>Returns.</b> <code>hyst_init</code> returns nothing and leaves the state <b>off</b>.
<code>hyst_update</code> returns the state after considering <code>v</code>.</p>
<p><b>The rule.</b> Reaching <code>on</code> turns it on. Dropping to <code>off</code> turns it
off. Anywhere between the two, it keeps whatever it already was. That middle case is the whole
point, and it is why the previous state has to be stored.</p>`,
answer: `
<pre>void hyst_init(hyst_t *h, int32_t on_threshold, int32_t off_threshold)
{
    h-&gt;on    = on_threshold;
    h-&gt;off   = off_threshold;
    h-&gt;state = false;
}

bool hyst_update(hyst_t *h, int32_t v)
{
    if (h-&gt;state) {
        if (v &lt;= h-&gt;off) h-&gt;state = false;
    } else {
        if (v &gt;= h-&gt;on)  h-&gt;state = true;
    }
    return h-&gt;state;
}</pre>

<h3>The shape</h3>
<p>Branch on the <b>current state first</b>, then test only the threshold that can change it.
That is what makes the band a hold rather than a decision.</p>
<p>The version people write instead tests both thresholds regardless of state, and then needs an
else that does nothing, which is the same thing written less clearly.</p>

<h3>Why the band exists at all</h3>
<p>A single threshold on a noisy signal produces one transition per noise excursion. A sensor
sitting right on the trip point can toggle thousands of times a second, and everything
downstream, a relay, a log, a state machine, sees every one of them.</p>
<p>The band has to be wider than the noise, which means you need to know the noise amplitude.
That is a measurement, not a guess, and it is the part interviewers are checking you know.</p>

<h3>What it costs</h3>
<p>The trip point is no longer a single number: the signal has to travel the whole band to
change state, so you have deliberately given up accuracy at the threshold for stability.</p>
<p>If both matter, the answer is a narrow band plus time-based debouncing, not a wider band.</p>

<h3>Where the same shape turns up</h3>
<p>Battery low warnings, thermal cutouts, a level sensor driving a pump, a signal-strength bar,
and the charge controller that must not chatter a MOSFET at the trip point.</p>
<p>It is also exactly what a hardware Schmitt trigger does, which is worth saying: you are
reimplementing a comparator with positive feedback.</p>`,
checklist: [
"Branches on the current state, then tests only the relevant threshold",
"Turns on at exactly the on threshold, and off at exactly the off threshold",
"Holds its state between the two",
"Starts in the off state",
"Returns the new state rather than nothing",
"Could say why the band must be wider than the noise, and what that costs"
]
},

{
id: "d-write-hex",
kind: "write",
track: "Embedded C",
d: 2,
title: "Hex, both directions, with the validation",
mins: 14,
brief: `
<p>Hex in both directions. The encoder is easy; the decoder is where the marks are, because it
is the one taking input from outside.</p>
<pre>size_t hex_encode(const uint8_t *in, size_t len, char *out, size_t cap);
int    hex_decode(const char *in, uint8_t *out, size_t cap, size_t *out_len);</pre>
<p><b>hex_encode</b></p>
<ul>
<li><code>in</code> the bytes to encode; <code>len</code> how many there are.</li>
<li><code>out</code> the character buffer to fill; <code>cap</code> its size in bytes,
<b>including</b> the terminator. Encoding 4 bytes needs a <code>cap</code> of at least 9.</li>
</ul>
<p>Produces <b>lowercase</b>, null-terminated text. <b>Returns</b> the characters written
excluding the terminator, so <code>2 * len</code>, or <b>0</b> if it will not fit.</p>
<p><b>hex_decode</b></p>
<ul>
<li><code>in</code> the null-terminated hex text. Accept upper or lower case, and treat the
empty string as a valid decode of zero bytes.</li>
<li><code>out</code> where the decoded bytes go; <code>cap</code> how many bytes it holds.</li>
<li><code>out_len</code> where to store how many bytes were actually decoded. Only meaningful on
success.</li>
</ul>
<p><b>Returns</b> 0 on success, or <b>-1</b> for any failure: an odd number of characters, any
character that is not a hex digit, or more bytes than <code>cap</code> can take.</p>`,
answer: `
<pre>size_t hex_encode(const uint8_t *in, size_t len, char *out, size_t cap)
{
    static const char D[] = "0123456789abcdef";

    if (out == NULL || cap &lt; (len * 2u) + 1u) return 0;

    for (size_t i = 0; i &lt; len; i++) {
        out[i * 2u]      = D[(in[i] &gt;&gt; 4) &amp; 0x0Fu];
        out[i * 2u + 1u] = D[ in[i]        &amp; 0x0Fu];
    }
    out[len * 2u] = '\\0';
    return len * 2u;
}

static int nibble(char c)
{
    if (c &gt;= '0' &amp;&amp; c &lt;= '9') return c - '0';
    if (c &gt;= 'a' &amp;&amp; c &lt;= 'f') return c - 'a' + 10;
    if (c &gt;= 'A' &amp;&amp; c &lt;= 'F') return c - 'A' + 10;
    return -1;
}

int hex_decode(const char *in, uint8_t *out, size_t cap, size_t *out_len)
{
    if (in == NULL || out == NULL || out_len == NULL) return -1;

    size_t n = strlen(in);
    if (n % 2u != 0u) return -1;          /* odd length */
    if (n / 2u &gt; cap) return -1;          /* would not fit */

    for (size_t i = 0; i &lt; n; i += 2u) {
        int hi = nibble(in[i]);
        int lo = nibble(in[i + 1u]);
        if (hi &lt; 0 || lo &lt; 0) return -1;  /* not hex */
        out[i / 2u] = (uint8_t)((hi &lt;&lt; 4) | lo);
    }
    *out_len = n / 2u;
    return 0;
}</pre>

<h3>The capacity check on the encoder</h3>
<p><code>len * 2 + 1</code>, and the <code>+ 1</code> is the terminator. Checking against
<code>len * 2</code> is the off-by-one, and it puts the NUL one past the end.</p>
<p>Note also that <code>len * 2</code> can overflow <code>size_t</code> for an absurd length. On
a 32-bit target that needs a 2 GB input, so it is worth a comment rather than a check, but
noticing it is the point.</p>

<h3>Why a nibble helper</h3>
<p>The three ranges are easy to get wrong inline, and doing it twice per byte doubles the chance.
One function, three ranges, tested once.</p>
<p>The trick people reach for, <code>c - '0'</code> then <code>c - 'a' + 10</code> without
checking the range, silently accepts characters between <code>'9'</code> and <code>'a'</code>
such as <code>':'</code> and <code>'?'</code>, which decode to values above 15 and corrupt the
byte.</p>

<h3>Validating before writing</h3>
<p>The length checks happen first, so a bad input leaves <code>out</code> untouched. The
character check is inside the loop and returns immediately, so a bad character partway through
leaves earlier bytes written but <code>*out_len</code> unset, which the caller must not use.</p>
<p>If leaving nothing behind matters, validate the whole string in a first pass and decode in a
second. Say which you chose and why.</p>

<h3>The shift, and the cast</h3>
<p><code>hi &lt;&lt; 4</code> is an <code>int</code>, so the result must be cast back to
<code>uint8_t</code>. Without the cast, <code>-Wconversion</code> warns and you have relied on
implicit truncation.</p>

<h3>Where you meet this</h3>
<p>Every debug console that dumps a buffer, every text protocol carrying binary, and every time
someone pastes a MAC address or a key into a config file. The decoder is the one that faces
untrusted input, which is why it does the validating.</p>`,
checklist: [
"Encoder checks cap against len * 2 + 1, including the terminator",
"Encoder terminates the output",
"Decoder rejects an odd-length string",
"Decoder rejects any non-hex character, including the ones between '9' and 'a'",
"Decoder accepts both upper and lower case",
"Decoder rejects input that would exceed cap, before writing anything",
"Casts back to uint8_t after the shift"
]
},

{
id: "d-write-lut",
kind: "write",
track: "Embedded C",
d: 2,
title: "A lookup table with interpolation",
mins: 14,
brief: `
<p>A thermistor curve, given as points. Convert a raw reading to a temperature.</p>
<pre>typedef struct { int32_t x, y; } point_t;

int32_t lut_lookup(const point_t *pts, size_t n, int32_t x);</pre>
<p><code>pts</code> is sorted by <code>x</code>, strictly increasing, with <code>n &gt;= 1</code>.</p>
<ul>
<li>Below the first point, return the first <code>y</code>.</li>
<li>Above the last point, return the last <code>y</code>.</li>
<li>Between two points, interpolate linearly and round to nearest.</li>
</ul>
<p>Integer arithmetic only. No floats.</p>`,
answer: `
<pre>int32_t lut_lookup(const point_t *pts, size_t n, int32_t x)
{
    if (pts == NULL || n == 0u) return 0;

    if (x &lt;= pts[0].x)        return pts[0].y;          /* clamp low  */
    if (x &gt;= pts[n - 1u].x)   return pts[n - 1u].y;     /* clamp high */

    /* find the segment: pts[i].x &lt;= x &lt; pts[i+1].x */
    size_t i = 0;
    while (i + 1u &lt; n &amp;&amp; pts[i + 1u].x &lt;= x) {
        i++;
    }

    int64_t x0 = pts[i].x,     y0 = pts[i].y;
    int64_t x1 = pts[i + 1u].x, y1 = pts[i + 1u].y;

    int64_t dx = x1 - x0;
    int64_t num = (y1 - y0) * (x - x0);

    /* round to nearest, correctly for a negative slope */
    int64_t half = dx / 2;
    int64_t r = (num &gt;= 0) ? (num + half) / dx : (num - half) / dx;

    return (int32_t)(y0 + r);
}</pre>

<h3>The three cases, in order</h3>
<p>Clamp low, clamp high, then interpolate. Handling the ends first means the search cannot run
off either edge, and it makes the segment loop simple.</p>
<p>Clamping rather than extrapolating is the right default for a sensor curve: outside the
calibrated range you have no information, and a straight line off the end of a thermistor curve
is confidently wrong.</p>

<h3>Why 64-bit intermediates</h3>
<p><code>(y1 - y0) * (x - x0)</code> is the product of two differences. With ADC counts and
millidegrees those are easily thousands each, so the product passes a million and can pass two
billion on a wide range.</p>
<p>Doing it in <code>int32_t</code> overflows silently and gives a plausible wrong answer.
Widening the intermediate is the same rule as the saturating add and the counts-to-millivolts
conversion: <b>compute in a type where it cannot overflow</b>.</p>

<h3>The rounding, and why it is not just + half</h3>
<p>Integer division truncates toward zero, so adding half the divisor rounds to nearest only for
a positive numerator. With a negative slope, which a thermistor has, you must subtract half
instead.</p>
<p>Getting this wrong biases the result by up to half an LSB in one direction, which shows up as
a systematic offset that only appears on part of the curve. That is a nasty calibration bug to
chase.</p>

<h3>The linear search, and when to replace it</h3>
<p>A linear walk is fine for the ten to twenty points a sensor curve usually has, and it is
easier to get right. If the table is large or the lookup is in a hot loop, binary search it, and
say that you would rather than doing it unprompted.</p>
<p>The other option, if <code>x</code> moves slowly, is to remember the last segment index and
start from there. Most readings land in the same segment as the previous one.</p>

<h3>Worth saying</h3>
<p>That the table should be <code>static const</code> so it lives in flash rather than costing
RAM plus a startup copy, and that a <code>_Static_assert</code> or a startup check on the
strictly-increasing property would catch a mistyped table before it produces silently wrong
readings.</p>`,
checklist: [
"Clamps below the first point and above the last, rather than extrapolating",
"Finds the correct segment for values in between",
"Interpolates linearly rather than snapping to the nearest point",
"Uses a wide enough intermediate that the product cannot overflow",
"Rounds to nearest, correctly for a negative slope",
"Handles n == 1",
"Mentioned static const for flash, or binary search if the table is large"
]
},

{
id: "d-write-watchdog",
kind: "write",
track: "Embedded C",
d: 2,
title: "A watchdog that only barks when it should",
mins: 12,
brief: `
<p>Every task must prove it is alive before the watchdog is fed. Feeding it from a timer is
exactly the bug this exists to prevent: the timer keeps running while every task is deadlocked,
so the watchdog never fires and the product hangs forever.</p>
<pre>#define WD_MAX_TASKS 8

void wd_init(void);
int  wd_register(void);
void wd_checkin(int id);
bool wd_all_checked_in(void);</pre>
<ul>
<li><code>wd_register</code> takes nothing and <b>returns</b> a fresh id, 0 to 7, or <b>-1</b>
when all <code>WD_MAX_TASKS</code> slots are taken. Each task calls it once at startup and keeps
the id.</li>
<li><code>id</code> in <code>wd_checkin</code> is that id. A task calls it each time round its
loop to say "still running". An id outside the registered range must be ignored rather than
corrupt anything.</li>
</ul>
<p><b>wd_all_checked_in</b> returns true only when <b>every</b> registered task has checked in
since the last time it returned true, and clears the flags when it does, so the next round
starts fresh. It returns false if even one task is missing.</p>
<p>The supervisor calls it and feeds the hardware watchdog only when it is true. A task with no
registered peers should not make it pass by accident, and neither should an unregistered
slot.</p>`,
answer: `
<pre>static uint32_t wd_registered;      /* bit per allocated id */
static volatile uint32_t wd_seen;   /* bit per id that has checked in */

void wd_init(void)
{
    wd_registered = 0u;
    wd_seen       = 0u;
}

int wd_register(void)
{
    for (int i = 0; i &lt; WD_MAX_TASKS; i++) {
        if ((wd_registered &amp; (1u &lt;&lt; i)) == 0u) {
            wd_registered |= (1u &lt;&lt; i);
            return i;
        }
    }
    return -1;                       /* full */
}

void wd_checkin(int id)
{
    if (id &lt; 0 || id &gt;= WD_MAX_TASKS) return;
    wd_seen |= (1u &lt;&lt; id);
}

bool wd_all_checked_in(void)
{
    if (wd_registered == 0u) return false;   /* nobody registered */

    if ((wd_seen &amp; wd_registered) != wd_registered) {
        return false;
    }
    wd_seen = 0u;                    /* clear, so each round must be earned */
    return true;
}</pre>

<h3>Why a bitmask</h3>
<p>One word holds every task's state, so the whole check is a single AND and a compare. It is
also the cheapest thing to update from a task: <code>|=</code> on a word, with no loop and
nothing to iterate while another task is doing the same.</p>

<h3>Why clearing is the whole point</h3>
<p>If <code>wd_seen</code> were never cleared, one check-in per task at startup would satisfy the
watchdog forever. Clearing on success means <b>every round has to be earned again</b>, which is
the entire difference between this and feeding from a timer.</p>
<p>The bug it prevents: a timer interrupt that feeds the watchdog keeps the system alive while
every task is deadlocked. The watchdog then reports a healthy system that is doing nothing at
all, which is worse than having no watchdog, because it removes the recovery you thought you
had.</p>

<h3>The empty case</h3>
<p>Returning true when nobody has registered would feed the watchdog on an empty system. False
is the safe answer: if the registration itself failed, the watchdog should fire.</p>

<h3>The concurrency question, which you should raise</h3>
<p><code>wd_seen |= bit</code> is a read-modify-write, so two tasks doing it at once can lose one
of the updates. The consequences here are mild, since a lost check-in only means one extra
supervisor round, but it is worth saying rather than leaving unexamined.</p>
<p>The fixes are a critical section, an atomic OR where the part has one, or accepting it with a
comment. On Cortex-M, <code>__atomic_fetch_or</code> or an LDREX/STREX pair does it
lock-free.</p>
<p><code>wd_seen</code> is <code>volatile</code> because a task and the supervisor both touch
it, and that is necessary but not sufficient: volatile is about visibility, not atomicity.</p>

<h3>What a real one adds</h3>
<ul>
<li><b>A deadline per task</b>, so a slow task is caught rather than merely a stopped one.</li>
<li><b>Recording who failed</b> before the reset, in retained RAM, so the next boot can report
it.</li>
<li><b>A windowed watchdog</b>, which also catches feeding too <i>early</i>, meaning a loop
running far faster than it should.</li>
</ul>`,
checklist: [
"A bit per task, so the check is one AND and a compare",
"Clears the seen flags on success, so every round must be earned",
"Could explain the bug this prevents: feeding from a timer while every task is deadlocked",
"Returns false when nothing has registered",
"wd_register returns -1 when full rather than overflowing",
"wd_checkin rejects an out-of-range id",
"Raised the read-modify-write race on the shared word, and that volatile does not fix it"
]
},

{
id: "d-write-pool",
kind: "write",
track: "Embedded C",
d: 3,
title: "A fixed-block pool, so malloc is not needed",
mins: 16,
brief: `
<p>An allocator that cannot fragment, because every block is the same size. This is what
replaces <code>malloc</code> when fragmentation over months of uptime is unacceptable.</p>
<pre>#define POOL_BLOCKS      8
#define POOL_BLOCK_SIZE  32     /* bytes, and a multiple of 4 */

void   pool_init(void);
void  *pool_alloc(void);
void   pool_free(void *p);
size_t pool_free_count(void);</pre>
<ul>
<li><code>pool_init</code> takes nothing, returns nothing, and puts every block back on the free
list. Calling it twice must be safe.</li>
<li><code>pool_alloc</code> takes nothing and <b>returns</b> a pointer to a free block of
<code>POOL_BLOCK_SIZE</code> bytes, or <b>NULL</b> when all <code>POOL_BLOCKS</code> are
out.</li>
<li><code>p</code> in <code>pool_free</code> is a pointer previously returned by
<code>pool_alloc</code>. <code>pool_free(NULL)</code> must be a no-op, matching what
<code>free</code> does.</li>
<li><code>pool_free_count</code> <b>returns</b> how many blocks are currently available, so 8
after <code>pool_init</code> and 0 once all are taken.</li>
</ul>
<p>Static storage only, no <code>malloc</code>. Blocks must be suitably aligned for anything the
caller stores in them, and must not overlap.</p>
<p>Thread the free list through the free blocks <b>themselves</b>, so the bookkeeping costs no
extra memory. That is the trick worth knowing, and it is why the block size has a minimum.</p>`,
answer: `
<pre>/* aligned so a block can hold any type the caller puts in it */
static union {
    uint8_t bytes[POOL_BLOCK_SIZE];
    void   *align;
} pool_store[POOL_BLOCKS];

static void  *free_list;
static size_t free_n;

void pool_init(void)
{
    free_list = NULL;
    for (size_t i = 0; i &lt; POOL_BLOCKS; i++) {
        /* push each block onto the list, using its own first bytes
           to hold the next pointer */
        void *b = &amp;pool_store[i];
        *(void **)b = free_list;
        free_list = b;
    }
    free_n = POOL_BLOCKS;
}

void *pool_alloc(void)
{
    if (free_list == NULL) return NULL;

    void *b = free_list;
    free_list = *(void **)b;        /* pop */
    free_n--;
    return b;
}

void pool_free(void *p)
{
    if (p == NULL) return;

    *(void **)p = free_list;        /* push */
    free_list = p;
    free_n++;
}

size_t pool_free_count(void)
{
    return free_n;
}</pre>

<h3>The free list lives inside the free blocks</h3>
<p>A block that is free is not holding anything, so its first bytes are available to hold the
next pointer. That is why the bookkeeping is free: no separate array of indices, no bitmap, and
no per-block header eating into the usable size.</p>
<p>It only works because <code>POOL_BLOCK_SIZE</code> is at least <code>sizeof(void *)</code>,
which is worth a <code>_Static_assert</code>.</p>

<h3>Why this cannot fragment</h3>
<p>Every block is interchangeable, so a request either succeeds or the pool is empty. There is no
state in which enough total memory is free but no single piece is big enough, which is the
failure that makes <code>malloc</code> unacceptable in a long-running system.</p>
<p>It is also constant time in both directions: a push and a pop, no search, no coalescing. That
makes it usable from an ISR, which <code>malloc</code> is not.</p>

<h3>Alignment</h3>
<p>The union with a <code>void *</code> member forces the array's alignment to at least a pointer's,
so a block can hold a struct containing pointers. A plain <code>uint8_t</code> array would be
byte-aligned, and on a Cortex-M3 storing a <code>uint32_t</code> to an odd address is a fault.</p>
<p>C11's <code>alignas(max_align_t)</code> says the same thing more directly if it is
available.</p>

<h3>The concurrency question</h3>
<p>Both operations are a load, a store and a counter update, so two callers at once corrupt the
list. If it is used from an ISR and a thread, wrap both in a critical section, or use an
LDREX/STREX or <code>__atomic</code> compare-and-swap loop on the head.</p>
<p>Say which you would do and why rather than leaving it unstated.</p>

<h3>What it does not protect you from</h3>
<p>Freeing a pointer that did not come from the pool, or freeing the same block twice, corrupts
the list silently and the failure appears later somewhere unrelated. If that risk matters, a
debug build can check the pointer lies inside <code>pool_store</code> and is on a block
boundary:</p>
<pre>uintptr_t off = (uintptr_t)p - (uintptr_t)pool_store;
if (off % sizeof pool_store[0] != 0u) return;    /* not a block start */
if (off &gt;= sizeof pool_store) return;            /* not ours          */</pre>
<p>That is cheap and catches the two mistakes people actually make.</p>

<h3>Why this is the standard firmware answer</h3>
<p>Bounded memory, bounded time, no fragmentation, usable from any context, and a free count you
can log to see how close you came. The cost is that every allocation is the same size, so you
need one pool per size class, which is usually two or three.</p>`,
checklist: [
"Static storage, no malloc",
"The free list is threaded through the free blocks themselves",
"Alignment is forced, not assumed",
"pool_alloc returns NULL when exhausted rather than overrunning",
"pool_free(NULL) is a no-op",
"Blocks are distinct and do not overlap",
"Could explain why a fixed-block pool cannot fragment, and that both operations are constant time",
"Raised the concurrency question, or the double-free risk"
]
}

);
