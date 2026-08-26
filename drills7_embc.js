// More spot-the-bug drills, in territory the existing ones do not cover:
// string and buffer handling, timing and rollover, cleanup on error paths,
// wire formats, and bitfields in a register map.

DRILLS.push(

{
id: "d-spot-str",
kind: "spot",
track: "Embedded C",
d: 1,
title: "Four small string functions",
mins: 12,
brief: `
<p>Utility code from a device that formats status lines for a serial console. It works in
testing, and occasionally produces garbage or resets in the field.</p>
<p>Five faults. Every one of them is a well-known trap rather than a clever mistake.</p>`,
code: `static char name[16];

void set_name(const char *src)
{
    strncpy(name, src, sizeof name);
}

const char *build_greeting(const char *who)
{
    char msg[32];

    sprintf(msg, "Hello, %s!", who);

    return msg;
}

int copy_field(char *dst, size_t cap, const char *src)
{
    size_t n = strlen(src);

    if (n &gt; cap) {
        return -1;
    }
    memcpy(dst, src, n);
    dst[n] = '\\0';
    return 0;
}

void log_line(const char *fmt, int v)
{
    char buf[64];

    int n = snprintf(buf, sizeof buf, fmt, v);

    uart_write(buf, (size_t)n);
}`,
answer: `
<h3>1. strncpy does not terminate</h3>
<p>If <code>src</code> is 16 characters or longer, <code>name</code> is filled completely and
there is no NUL. Every later <code>strlen</code> or <code>printf</code> then walks off the end
into whatever follows it in RAM.</p>
<pre>snprintf(name, sizeof name, "%s", src);</pre>
<p><code>snprintf</code> always terminates, and its return value tells you whether it
truncated.</p>

<h3>2. Returning a pointer to a local</h3>
<p><code>msg</code> lives on the stack and is gone the moment <code>build_greeting</code>
returns. The caller gets a pointer into a dead frame, which usually still holds the right text
until the next function call overwrites it.</p>
<p>That is why this is a field bug rather than a test bug: it works right up until the timing
changes.</p>
<p>The fixes, in order of preference: have the caller pass a buffer and a size; or use a
<code>static</code> buffer and document that it is not reentrant.</p>

<h3>3. sprintf with no bound</h3>
<p>Same function, second fault. <code>"Hello, %s!"</code> plus an arbitrary <code>who</code> into
32 bytes has no bound at all. A 40-character name overruns the stack frame, which on most
targets means the return address.</p>

<h3>4. The off-by-one in copy_field</h3>
<pre>if (n &gt; cap) return -1;      /* wrong */
memcpy(dst, src, n);
dst[n] = '\\0';              /* writes at dst[cap] when n == cap */</pre>
<p>With <code>n == cap</code> the check passes, and the terminator lands one byte past the end.
It needs <code>n &gt;= cap</code>, because <code>n</code> characters plus a terminator needs
<code>n + 1</code> bytes.</p>
<p>A one-byte overflow is the hardest kind to find, because it usually corrupts the next
variable rather than crashing.</p>

<h3>5. snprintf's return value is not what was written</h3>
<p><code>snprintf</code> returns the length it <b>wanted</b> to write. If the output was
truncated, <code>n</code> is larger than the buffer, and <code>uart_write(buf, n)</code> reads
past the end.</p>
<pre>int n = snprintf(buf, sizeof buf, "%d", v);
if (n &lt; 0) return;
size_t len = ((size_t)n &lt; sizeof buf) ? (size_t)n : sizeof buf - 1u;
uart_write(buf, len);</pre>
<p>Using the return value as a byte count is common, and it turns a truncation into an
out-of-bounds read.</p>

<h3>Also worth mentioning</h3>
<p><code>fmt</code> is a caller-supplied format string. If any caller ever passes something
derived from input, that is a format string vulnerability, and
<code>-Wformat-nonliteral</code> exists to find it. Marking the function with
<code>__attribute__((format(printf, 1, 2)))</code> at least gets the arguments checked.</p>`,
checklist: [
"strncpy may leave the destination unterminated",
"build_greeting returns a pointer to a stack local",
"sprintf into a fixed buffer has no bound",
"copy_field's check should be n >= cap, so the terminator does not land one past the end",
"snprintf returns the wanted length, so using it as a byte count reads past the buffer",
"Noticed the non-literal format string"
]
},

{
id: "d-spot-time",
kind: "spot",
track: "Embedded C",
d: 2,
title: "Timing that works for seven weeks",
mins: 12,
brief: `
<p>Timing helpers from a data logger. It passes a two-day soak test and misbehaves in the field
after about a month and a half.</p>
<p>Five faults.</p>`,
code: `#define SENSOR_STATUS (*(uint32_t *)0x40001000u)
#define READY_BIT      (1u &lt;&lt; 3)

static volatile uint32_t tick_ms;

void SysTick_Handler(void)
{
    tick_ms++;
}

static uint32_t now_ms(void)
{
    return tick_ms;
}

bool sensor_wait_ready(void)
{
    uint32_t start = now_ms();

    while (!(SENSOR_STATUS &amp; READY_BIT)) {
        if (now_ms() &gt; start + 100u) {
            return false;
        }
    }
    return true;
}

void delay_us(uint32_t us)
{
    for (volatile uint32_t i = 0; i &lt; us * 8u; i++) {
    }
}

void periodic_task(void)
{
    static uint32_t last;

    if (now_ms() - last &gt; 1000u) {
        take_sample();
        last = now_ms();
    }
}`,
answer: `
<h3>1. The timeout comparison breaks on rollover</h3>
<pre>if (now_ms() &gt; start + 100u)          /* wrong */
if ((uint32_t)(now_ms() - start) &gt;= 100u)   /* right */</pre>
<p><code>start + 100</code> wraps to a small number when <code>start</code> is near
0xFFFFFFFF, so the comparison is immediately true and the wait gives up at once. Or, depending
which side wraps, it never expires and the loop runs forever.</p>
<p>A 32-bit millisecond tick wraps after 49.7 days, which is why a two-day soak test never sees
it. Subtracting first makes the wrap cancel itself.</p>

<h3>2. The status register is not volatile</h3>
<pre>#define SENSOR_STATUS (*(uint32_t *)0x40001000u)
#define SENSOR_STATUS (*(volatile uint32_t *)0x40001000u)   /* right */</pre>
<p>Nothing in the C abstract machine can change that location, so the compiler is entitled to
read it once and reuse the value. The loop then spins forever on a stale copy.</p>
<p>It usually works at <code>-O0</code> and hangs at <code>-O2</code>, which is the signature
of a missing <code>volatile</code>.</p>

<h3>3. The timeout is checked after the condition, but never after the last wait</h3>
<p>Minor next to the others, and worth noticing: this polls flat out with no delay, so it
hammers the bus and burns power for the whole 100 ms.</p>

<h3>4. delay_us is a guess dressed as a number</h3>
<p>The loop count assumes a particular clock speed, a particular compiler, a particular
optimisation level and no interrupts. Change any one and the delay changes silently.</p>
<p><code>us * 8u</code> also overflows for <code>us</code> above about 537 million, and any
interrupt during the loop makes the delay longer by an unbounded amount.</p>
<p>Use a hardware timer, or the cycle counter (DWT) on a Cortex-M. If a busy loop really is the
only option, derive the count from the clock frequency and say in a comment that it is
approximate.</p>

<h3>5. periodic_task drifts</h3>
<pre>last = now_ms();      /* wrong: absorbs the lateness */
last += 1000u;        /* right: keeps the schedule */</pre>
<p>Setting <code>last</code> to the current time means every bit of lateness is kept
permanently. If the check runs 3 ms late each time, the period becomes 1003 ms and the logger
drifts by about four minutes a day.</p>
<p>Advancing by the period instead keeps the average exactly right, because a late run is
followed by a slightly early one.</p>
<p>The comparison should also be <code>&gt;=</code>, so an exactly-due sample is not delayed by
a whole tick.</p>`,
checklist: [
"The timeout comparison breaks on rollover, and knew it happens after 49.7 days",
"Rewrote it as a subtraction, done in unsigned",
"SENSOR_STATUS is missing volatile, so the loop can spin on a stale read",
"Connected the missing volatile to working at -O0 and hanging at -O2",
"delay_us is a calibrated guess: clock, compiler, optimisation and interrupts all change it",
"periodic_task drifts because last is set from the clock rather than advanced by the period"
]
},

{
id: "d-spot-leak",
kind: "spot",
track: "Embedded C",
d: 2,
title: "Error paths that do not clean up",
mins: 12,
brief: `
<p>Opening a session: allocate a context, take a lock, open a device, read some settings. Every
step can fail.</p>
<p>Five faults, all on the paths nobody tests.</p>`,
code: `int session_open(uint8_t addr, session_t **out)
{
    session_t *s = malloc(sizeof(*s));

    s-&gt;addr = addr;
    s-&gt;dev  = NULL;

    mutex_lock(&amp;bus_lock);

    s-&gt;dev = dev_open(addr);
    if (s-&gt;dev == NULL) {
        return -EIO;
    }

    if (dev_read(s-&gt;dev, REG_CFG, &amp;s-&gt;cfg) != 0) {
        free(s);
        return -EIO;
    }

    if (s-&gt;cfg == 0) {
        dev_close(s-&gt;dev);
        free(s);
        mutex_unlock(&amp;bus_lock);
        return -EINVAL;
    }

    mutex_unlock(&amp;bus_lock);
    *out = s;
    return 0;
}

void session_close(session_t *s)
{
    dev_close(s-&gt;dev);
    free(s);
    s = NULL;
}`,
answer: `
<h3>1. malloc is never checked</h3>
<p><code>s-&gt;addr = addr</code> on the very next line dereferences a possibly-NULL pointer. On
a microcontroller the heap is small enough that allocation failure is a realistic case rather
than a formality.</p>

<h3>2. The first failure path leaks everything</h3>
<pre>if (s-&gt;dev == NULL) {
    return -EIO;             /* leaks s AND leaves bus_lock held */
}</pre>
<p>The leaked memory is bad. The <b>held mutex is worse</b>: every later caller blocks forever,
so one failed open bricks the whole bus, and the symptom appears nowhere near the cause.</p>

<h3>3. The second failure path frees but does not close or unlock</h3>
<pre>if (dev_read(...) != 0) {
    free(s);                 /* dev is still open, lock still held */
    return -EIO;
}</pre>
<p>Three exits, three different subsets of the cleanup. That is the real defect: the cleanup was
written per-path rather than once, so each path is a fresh chance to forget something.</p>

<h3>4. session_close assigns to its own parameter</h3>
<pre>void session_close(session_t *s)
{
    dev_close(s-&gt;dev);
    free(s);
    s = NULL;        /* does nothing at all */
}</pre>
<p><code>s</code> is a copy of the caller's pointer, so setting it to NULL affects nothing. The
caller keeps a dangling pointer, and the line reads as protection while providing none, which is
worse than not writing it.</p>
<p>To actually clear it, take a <code>session_t **</code>. It also does not tolerate being
called with NULL, which a close function usually should.</p>

<h3>The fix: one exit, one cleanup</h3>
<pre>int session_open(uint8_t addr, session_t **out)
{
    int rc;
    session_t *s = calloc(1, sizeof(*s));
    if (s == NULL) return -ENOMEM;

    s-&gt;addr = addr;
    mutex_lock(&amp;bus_lock);

    s-&gt;dev = dev_open(addr);
    if (s-&gt;dev == NULL) { rc = -EIO; goto out; }

    rc = dev_read(s-&gt;dev, REG_CFG, &amp;s-&gt;cfg);
    if (rc != 0) { rc = -EIO; goto out; }

    if (s-&gt;cfg == 0) { rc = -EINVAL; goto out; }

    mutex_unlock(&amp;bus_lock);
    *out = s;
    return 0;

out:
    if (s-&gt;dev) dev_close(s-&gt;dev);
    mutex_unlock(&amp;bus_lock);
    free(s);
    return rc;
}</pre>
<p>Every failure goes through one label, so adding a resource later means editing one place
rather than three. This is the standard kernel idiom and the one legitimate use of
<code>goto</code> in C.</p>
<p>Note <code>calloc</code>, so <code>s-&gt;dev</code> is NULL and the cleanup can test it
safely.</p>

<h3>5. *out is written only on success, which this does get right</h3>
<p>Worth saying out loud when you review: leaving <code>*out</code> untouched on failure means a
caller who forgets to check keeps their old value rather than a pointer to freed memory.</p>`,
checklist: [
"malloc's return is never checked before being dereferenced",
"The dev_open failure path leaks the allocation",
"It also returns with the mutex still held, which blocks every later caller",
"The dev_read failure path frees but leaves the device open and the lock held",
"Proposed a single cleanup label rather than per-path cleanup",
"session_close assigns to its own parameter copy, which does nothing"
]
},

{
id: "d-spot-pack",
kind: "spot",
track: "Embedded C",
d: 2,
title: "A struct sent straight down the wire",
mins: 12,
brief: `
<p>A telemetry packet, defined as a struct and transmitted by pointing at its bytes. It works
between two identical boards and fails against the customer's gateway.</p>
<p>Five faults.</p>`,
code: `typedef struct {
    uint8_t  type;
    uint32_t timestamp;
    int16_t  temperature;
    uint8_t  flags;
} telemetry_t;

int send_telemetry(uint32_t ts, int16_t temp, uint8_t flags)
{
    telemetry_t pkt;

    pkt.type        = PKT_TELEMETRY;
    pkt.timestamp   = ts;
    pkt.temperature = temp;
    pkt.flags       = flags;

    return uart_send((uint8_t *)&amp;pkt, sizeof(telemetry_t));
}

int recv_telemetry(const uint8_t *buf, size_t len, telemetry_t *out)
{
    if (len &lt; sizeof(telemetry_t)) {
        return -1;
    }
    *out = *(telemetry_t *)buf;
    return 0;
}`,
answer: `
<h3>1. The struct has padding</h3>
<p>On a 32-bit target, <code>uint8_t type</code> is followed by three bytes of padding so that
<code>uint32_t timestamp</code> lands on a 4-byte boundary, and there is tail padding at the end.
<code>sizeof</code> is 12, not 8.</p>
<p>So the wire format contains four bytes of uninitialised stack, in positions the receiver has
to know about. The padding bytes are also an information leak: they are whatever was on the
stack.</p>

<h3>2. Byte order is whatever the sender happens to use</h3>
<p><code>timestamp</code> goes out in the sender's native order. Two identical boards agree,
and anything else does not. A protocol has to specify an order, and the code has to implement it
explicitly rather than inheriting it.</p>

<h3>3. The receive side casts a byte pointer to a struct pointer</h3>
<pre>*out = *(telemetry_t *)buf;</pre>
<p>Two problems in one line. <code>buf</code> may not be 4-byte aligned, and an unaligned
access is slow on Cortex-M3 and up and a fault on some parts. And casting
<code>const uint8_t *</code> to <code>telemetry_t *</code> breaks strict aliasing, so at
<code>-O2</code> the compiler may reorder around it.</p>

<h3>4. __attribute__((packed)) is not the fix people think</h3>
<p>The usual reaction is to pack the struct. That removes the padding, and introduces a
different problem: every member is now potentially unaligned, so the compiler generates
byte-wise accesses for them, and taking a pointer to a packed member produces an unaligned
pointer that is undefined to dereference.</p>
<p>It also does not fix byte order, which was the actual interoperability failure.</p>

<h3>The fix: serialise explicitly</h3>
<pre>#define TELEM_WIRE_LEN 8

static void put_be32(uint8_t *p, uint32_t v)
{
    p[0] = (uint8_t)(v &gt;&gt; 24); p[1] = (uint8_t)(v &gt;&gt; 16);
    p[2] = (uint8_t)(v &gt;&gt;  8); p[3] = (uint8_t)v;
}

int send_telemetry(uint32_t ts, int16_t temp, uint8_t flags)
{
    uint8_t w[TELEM_WIRE_LEN];

    w[0] = PKT_TELEMETRY;
    put_be32(&amp;w[1], ts);
    w[5] = (uint8_t)((uint16_t)temp &gt;&gt; 8);
    w[6] = (uint8_t)((uint16_t)temp);
    w[7] = flags;

    return uart_send(w, sizeof w);
}</pre>
<p>Longer, and it has no padding, no alignment question, no aliasing question, and one obvious
byte order. The length is a constant you can put in the protocol document.</p>

<h3>5. The signed field needs care too</h3>
<p><code>temperature</code> is <code>int16_t</code>. Shifting a signed value right is
implementation-defined for negatives, so convert to <code>uint16_t</code> first, as above. On
the receive side, read into a <code>uint16_t</code> and then convert.</p>

<h3>What to say in an interview</h3>
<p>That casting a struct onto a wire buffer is convenient and wrong, and that the three things it
gets wrong are padding, byte order and alignment. Then that explicit serialisation costs a few
lines and removes all three, plus a <code>static_assert</code> on the wire length so a struct
change cannot silently alter the protocol.</p>`,
checklist: [
"The struct has padding, so sizeof is not the wire length",
"Padding bytes are uninitialised, which leaks stack contents",
"Byte order is the sender's, so it only works between identical machines",
"The receive cast is both an alignment and a strict-aliasing problem",
"Said that packed is not the fix, and why",
"Proposed explicit byte-by-byte serialisation, with the signed field converted first"
]
},

{
id: "d-spot-bitfield",
kind: "spot",
track: "Embedded C",
d: 3,
title: "A register map built from bitfields",
mins: 12,
brief: `
<p>A peripheral described with C bitfields, because it reads nicely. It works on the development
board and behaves differently after a compiler upgrade.</p>
<p>Five faults.</p>`,
code: `typedef struct {
    unsigned enable   : 1;
    unsigned mode     : 3;
    unsigned          : 2;
    unsigned prescale : 8;
    unsigned reserved : 18;
} ctrl_reg_t;

#define CTRL (*(ctrl_reg_t *)0x40002000u)

typedef struct {
    unsigned overflow : 1;
    unsigned error    : 1;
    unsigned busy     : 1;
} status_reg_t;

#define STATUS (*(status_reg_t *)0x40002004u)

void timer_start(unsigned mode, unsigned prescale)
{
    CTRL.mode     = mode;
    CTRL.prescale = prescale;
    CTRL.enable   = 1;
}

bool had_overflow(void)
{
    if (STATUS.overflow) {
        STATUS.overflow = 0;      /* write 1 to clear */
        return true;
    }
    return false;
}`,
answer: `
<h3>1. Bitfield layout is implementation-defined</h3>
<p>The standard does not say which end of the storage unit the first bitfield occupies, how
fields straddle unit boundaries, or how they are padded. GCC on ARM allocates from the least
significant bit; other compilers and other targets do not have to.</p>
<p>So a register map built from bitfields is correct for one compiler on one target. "Behaves
differently after a compiler upgrade" is exactly the expected symptom.</p>
<p>This is why register maps use explicit masks and shifts, which are defined everywhere.</p>

<h3>2. Nothing is volatile</h3>
<p><code>ctrl_reg_t</code> and <code>status_reg_t</code> have no <code>volatile</code>, so the
compiler may cache reads, drop writes it thinks are redundant, and reorder. Polling
<code>STATUS.busy</code> in a loop would spin on a stale value.</p>
<p>The type would need to be <code>volatile ctrl_reg_t</code>, and even then the next problem
does not go away.</p>

<h3>3. Every field write is a read-modify-write of the whole register</h3>
<p><code>CTRL.mode = mode</code> compiles to: read the 32-bit register, mask in the field, write
it back. Three separate writes to <code>CTRL</code> therefore means three full
read-modify-writes.</p>
<p>Two consequences. If an interrupt touches <code>CTRL</code> in between, the update is lost.
And the peripheral sees intermediate states: after the second line the prescale is set while
enable is still 0, and if the hardware latches on any write, that is a real event.</p>
<p>The correct shape builds the whole value and writes it once:</p>
<pre>CTRL = (mode &lt;&lt; MODE_SHIFT) | (prescale &lt;&lt; PRESCALE_SHIFT) | ENABLE;</pre>

<h3>4. Write-1-to-clear is fatal here</h3>
<pre>STATUS.overflow = 0;      /* the comment says write 1 to clear */</pre>
<p>Two faults at once. It writes <b>0</b> where the hardware wants a <b>1</b>, so the flag is
never cleared. And because a bitfield write is a read-modify-write, it reads the register first
and writes back every other flag as it found it, which on a write-1-to-clear register
<b>clears every flag that happened to be set</b>.</p>
<p>So it fails to clear the one you wanted and silently clears the ones you did not. On such a
register you must write a plain mask and nothing else:</p>
<pre>STATUS = STATUS_OVERFLOW;      /* clears only this one */</pre>

<h3>5. status_reg_t does not describe the register</h3>
<p>Three bits declared for a 32-bit register. The compiler is free to make the struct one byte,
so <code>STATUS</code> may generate an 8-bit access to a peripheral that requires a 32-bit one.
Many peripherals fault or ignore a byte access entirely.</p>

<h3>The rule</h3>
<p>Do not use C bitfields for hardware registers. Use a
<code>volatile uint32_t</code> and named masks and shifts. They are more verbose, and they are
defined by the standard, portable across compilers, explicit about access width, and let you
control exactly how many writes the peripheral sees.</p>`,
checklist: [
"Bitfield layout is implementation-defined, so the map is compiler-specific",
"Connected that to the reported symptom after a compiler upgrade",
"Nothing is volatile",
"Each field assignment is a read-modify-write, so three lines means three register writes",
"The peripheral sees intermediate states, and an interrupt can lose an update",
"Writing 0 to a write-1-to-clear flag does not clear it, and the read-modify-write clears the others",
"status_reg_t may generate the wrong access width",
"Concluded: use volatile uint32_t with masks and shifts"
]
}

);
