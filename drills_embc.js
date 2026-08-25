/* Code drills: free-response exercises, self-marked against a checklist.
   kind "spot"  -> realistic buggy code, find every fault
   kind "write" -> a specification, produce the implementation
   Code samples use &lt; &gt; escapes because they render inside <pre>. */

DRILLS.push(

// ============================================================ SPOT THE BUG

{
id: "d-spot-isr",
kind: "spot",
track: "Embedded C",
title: "UART receive interrupt and its buffer",
mins: 10,
brief: `<p>This is the receive path of a UART driver. The ISR fills a buffer and a task
drains it. Find everything wrong with it, and for each fault say what the symptom would be
and why.</p><p>There are at least six.</p>`,
code: `#define RX_SIZE 64

static uint8_t rx_buf[RX_SIZE];
static int     rx_len;

void USART1_IRQHandler(void)
{
    if (USART1-&gt;SR &amp; USART_SR_RXNE) {
        rx_buf[rx_len++] = USART1-&gt;DR;
    }
}

int uart_get_message(uint8_t *dst)
{
    int n = rx_len;
    memcpy(dst, rx_buf, n);
    rx_len = 0;
    return n;
}`,
answer: `<p><b>1. rx_len is not volatile.</b> It is written by the ISR and read by the task,
so the compiler may cache it in a register and the task can spin on a stale value. Symptom:
works at -O0, hangs or never sees data at -O2.</p>

<p><b>2. No bounds check on rx_len.</b> After 64 bytes the ISR writes past the end of
rx_buf into whatever is next in memory. Symptom: corruption of unrelated variables under
sustained input, appearing far from the cause.</p>

<p><b>3. Only RXNE is tested.</b> If the overrun flag is enabled and latches, the peripheral
keeps asserting the interrupt, the handler finds RXNE clear, does nothing, and returns
straight back into itself. Symptom: the system stops making progress entirely, while the
handler runs continuously and correctly.</p>

<p><b>4. The memcpy is not atomic against the ISR.</b> A byte can arrive mid-copy and be
written into the region being copied, so the message tears: part old, part new.</p>

<p><b>5. Bytes arriving between reading rx_len and zeroing it are destroyed.</b>
<code>rx_len = 0</code> is unconditional, so anything the ISR added after
<code>int n = rx_len</code> is silently lost.</p>

<p><b>6. dst has no length.</b> The function writes n bytes into a caller's buffer with no
idea how big it is. A caller with a 16-byte buffer gets overrun with no diagnostic.</p>

<p><b>The real fix</b> is structural rather than a patch. Marking rx_len volatile fixes
neither 4 nor 5, because the problem is that there are two writers and the sequence is not
atomic. Use a single-producer single-consumer ring buffer where the ISR writes only head and
the task writes only tail, so neither ever touches the other's variable and no lock is
needed at all.</p>`,
checklist: [
"rx_len is not volatile, so the task can spin on a value cached in a register",
"No bounds check: the ISR writes past the end of rx_buf after 64 bytes",
"Only RXNE is handled, so a latched overrun flag re-asserts the interrupt forever",
"The memcpy is not protected against the ISR, so a message can tear",
"Bytes arriving between reading rx_len and zeroing it are lost",
"dst has no length parameter, so the caller's buffer can be overrun",
"Said that volatile alone fixes neither the tear nor the lost bytes",
"Proposed a ring buffer with separate head and tail rather than patching in place"
]
},

{
id: "d-spot-init",
kind: "spot",
track: "Embedded C",
title: "Driver init and its error paths",
mins: 10,
brief: `<p>A device driver's init function. The happy path works. Review it as you would in a
pull request, and say what you would ask the author to change.</p>`,
code: `int sensor_init(const sensor_io_t *io, sensor_t **out)
{
    sensor_t *dev = malloc(sizeof(sensor_t));
    dev-&gt;io = io;

    uint8_t id;
    if (io-&gt;read(io-&gt;ctx, REG_WHO_AM_I, &amp;id, 1) != 0)
        return -1;

    if (id != EXPECTED_ID)
        return -1;

    io-&gt;write(io-&gt;ctx, REG_CTRL, &amp;cfg, 1);
    delay_ms(50);

    *out = dev;
    return 0;
}`,
answer: `<p><b>1. malloc is not checked.</b> If it returns NULL, <code>dev-&gt;io = io</code>
dereferences it immediately. On most parts that is a fault at address 0 plus a small offset.</p>

<p><b>2. dev leaks on both error paths.</b> Two early returns and neither frees the
allocation. This is exactly the case the goto-based unwind pattern exists for.</p>

<p><b>3. The io pointer is stored rather than the struct copied.</b> If the caller's
<code>sensor_io_t</code> was on the stack, the driver now holds a dangling pointer. It should
be <code>dev-&gt;io = *io;</code> with a by-value member, so the caller's struct need not
outlive the call.</p>

<p><b>4. Arguments are not validated.</b> This is an API boundary: io, out, and the function
pointers inside io should all be checked, because a null read pointer faults inside the
driver where the cause is invisible.</p>

<p><b>5. Errors are flattened to -1.</b> A bus failure and a wrong chip ID become
indistinguishable, and they send an engineer to different benches. Propagate the bus error
unchanged and use a distinct code for the identity mismatch, which is genuinely new
information the bus layer could not have supplied.</p>

<p><b>6. The write's return value is ignored.</b> Configuration can fail, and here it fails
silently, leaving a device that reports success but is not configured.</p>

<p><b>7. A fixed 50 ms delay instead of polling.</b> A datasheet maximum is a bound, not a
duration. Poll the ready or self-clearing reset bit with a timeout: faster normally, correct
if the part is slow, and it survives the delay being optimised away or the clock changing.</p>

<p><b>8. delay_ms is called directly.</b> That is a platform dependency inside the driver.
It belongs in the injected transport alongside read and write, both so the driver stays
portable and so a test can advance time instantly rather than really waiting.</p>`,
checklist: [
"malloc is unchecked and dereferenced immediately",
"dev leaks on both early returns; a goto-based unwind is the idiom",
"The io struct should be copied by value, not stored as a pointer to the caller's stack",
"No argument validation at an API boundary (io, out, and the function pointers)",
"Errors are flattened: a bus fault and a wrong chip ID become the same -1",
"The write's return value is ignored, so configuration fails silently",
"A fixed delay instead of polling a status bit with a timeout",
"delay_ms is a platform dependency and belongs in the injected transport"
]
},

{
id: "d-spot-ring",
kind: "spot",
track: "Embedded C",
title: "A ring buffer that mostly works",
mins: 10,
brief: `<p>A ring buffer used with one producer in an ISR and one consumer in a task.
It works under light load and occasionally misbehaves under heavy load. Explain why.</p>`,
code: `#define SIZE 64
static uint8_t buf[SIZE];
static volatile int head, tail, count;

void rb_put(uint8_t b)          /* called from the ISR */
{
    if (count == SIZE) return;
    buf[head] = b;
    head = (head + 1) % SIZE;
    count++;
}

int rb_get(uint8_t *b)          /* called from the task */
{
    if (count == 0) return -1;
    *b = buf[tail];
    tail = (tail + 1) % SIZE;
    count--;
    return 0;
}`,
answer: `<p><b>1. count is written by both sides.</b> That is the whole bug.
<code>count++</code> and <code>count--</code> are each a load, a modify and a store. If the
ISR fires between the task's load and store, the ISR's increment is overwritten and lost.
The count drifts away from the real occupancy, and eventually the buffer reports full when it
is not, or empty when it is not.</p>

<p><b>2. volatile does not help.</b> It guarantees the accesses happen and are not reordered.
It says nothing about them being indivisible, which is the property actually needed here.</p>

<p><b>3. The symptom matches the description.</b> Under light load the ISR rarely lands in
that window. Under heavy load it does, which is why the fault is load dependent and hard to
reproduce.</p>

<p><b>The fix: remove the shared variable.</b> Sacrifice one slot so occupancy can be derived
from head and tail alone:</p>
<pre>full  = ((head + 1) % SIZE == tail);
empty = (head == tail);</pre>
<p>Now the producer writes only head and the consumer writes only tail. Neither ever writes
the other's variable, so on a machine with atomic word writes the whole thing is lock-free
with no critical section at all.</p>

<p><b>Secondary points.</b> The modulo is a division unless SIZE is a power of two, which
matters in an ISR; with a power of two use <code>&amp; (SIZE - 1)</code>. And the indices
should be unsigned, since signed overflow is undefined if you ever move to free-running
counters.</p>`,
checklist: [
"count is read-modify-written by both the ISR and the task, so updates are lost",
"Explained that increment and decrement are each a load, modify and store",
"Said volatile does not make the sequence atomic",
"Connected the load dependence to the size of the race window",
"Fix: sacrifice one slot and derive full/empty from head and tail alone",
"Noted that the producer then writes only head and the consumer only tail",
"Noted the modulo becomes a mask if SIZE is a power of two",
"Noted the indices should be unsigned"
]
},

{
id: "d-spot-regs",
kind: "spot",
track: "Embedded C",
title: "A register access sequence",
mins: 8,
brief: `<p>Peripheral setup code. The datasheet says ICR is write-1-to-clear and SR is
read-to-clear. Find the faults.</p>`,
code: `#define CR   (*(uint32_t *)0x40004000)
#define SR   (*(uint32_t *)0x40004004)
#define ICR  (*(uint32_t *)0x40004008)
#define DR   (*(uint32_t *)0x4000400C)

void periph_start(void)
{
    CR |= (1 &lt;&lt; 0);              /* enable */

    while (!(SR &amp; 0x01)) { }     /* wait for ready */

    ICR |= (1 &lt;&lt; 3);             /* clear interrupt 3 */

    CR |= (mode &lt;&lt; 4);           /* set the 3-bit mode field at 6:4 */
}`,
answer: `<p><b>1. None of the registers are volatile.</b> The poll loop has nothing in its
body that the compiler believes can change SR, so at -O2 it reads once and branches to itself
forever. Classic works-in-debug, hangs-in-release.</p>

<p><b>2. Reading SR in the poll loop is destructive.</b> SR is read-to-clear, so each read
clears the flags. Any other flag that had latched is lost, and if the ready bit itself is
read-to-clear the loop can consume its own exit condition.</p>

<p><b>3. The poll is unbounded.</b> If the device never becomes ready this hangs with no
diagnostic. Every wait needs a timeout so the failure becomes a returned error the caller or
the watchdog can act on.</p>

<p><b>4. <code>ICR |= bit</code> is catastrophically wrong on a write-1-to-clear register.</b>
The read picks up every currently pending flag, the OR adds bit 3, and the write puts it all
back, clearing every one of them. You have silently acknowledged interrupts nothing handled.
It must be <code>ICR = (1u &lt;&lt; 3);</code> with no read at all.</p>

<p><b>5. The mode field is ORed, not clear-then-set.</b> OR can only turn bits on, so a field
currently holding 7 stays 7 whatever mode you pass. It needs
<code>CR = (CR &amp; ~(7u &lt;&lt; 4)) | ((mode &amp; 7u) &lt;&lt; 4);</code>.</p>

<p><b>6. No mask on mode.</b> Passing 9 gives <code>9 &lt;&lt; 4 = 0x90</code>, which sets
bit 7 as well: a neighbouring field silently corrupted.</p>

<p><b>7. Shifts use signed 1.</b> Use <code>1u</code>, so that shifting into bit 31 is never
undefined behaviour. It costs one character and removes the whole class.</p>

<p><b>8. The read-modify-writes on CR are not atomic</b> against an interrupt that also
touches CR.</p>`,
checklist: [
"No volatile, so the poll loop is optimised into an infinite loop at -O2",
"SR is read-to-clear, so polling it destroys other latched flags",
"The wait is unbounded and needs a timeout",
"ICR |= bit clears every pending flag on a write-1-to-clear register",
"The mode field needs clear-then-set, because OR cannot clear bits",
"mode is unmasked, so an out-of-range value spills into the neighbouring bit",
"Shifts should use 1u to avoid undefined behaviour at bit 31",
"The read-modify-writes on CR are not atomic against an interrupt"
]
},

{
id: "d-spot-fixed",
kind: "spot",
track: "Embedded C",
title: "A scaling and filtering calculation",
mins: 9,
brief: `<p>Converting a 12-bit ADC count to millivolts and smoothing it. Values look
approximately right in testing and drift low over time. Find out why.</p>`,
code: `static int32_t filtered;

int32_t read_mv(uint16_t count, uint16_t vref_mv)
{
    int32_t mv = (count * vref_mv) / 4095;

    filtered += (mv - filtered) &gt;&gt; 4;

    return filtered;
}`,
answer: `<p><b>1. The multiply can overflow.</b> <code>count * vref_mv</code> promotes both to
int. With a 12-bit count of 4095 and a 3300 mV reference that is 13.5 million, which fits in
32 bits, so this particular case survives. Move to a 16-bit ADC or a larger reference and it
does not. Widen the operand first:
<code>(int32_t)(((int64_t)count * vref_mv) / 4095)</code>.</p>

<p><b>2. The EMA stalls, which is the drift.</b> Once <code>(mv - filtered)</code> is smaller
than 16, the shift truncates to zero, the increment is nothing, and the filter stops moving.
The output sticks permanently below the input rather than converging on it.</p>

<p><b>3. The truncation is asymmetric.</b> A right shift rounds towards negative infinity, so
negative differences round away from zero while positive ones round towards it. That biases
the output downward, which is precisely the "drifts low" symptom.</p>

<p><b>The fix for both filter faults</b> is to hold the state at higher precision and shift
only on output:</p>
<pre>static int32_t acc;      /* the state, scaled up by 2^4 */

acc += mv - (acc &gt;&gt; 4);
return acc &gt;&gt; 4;</pre>

<p><b>4. filtered is never initialised.</b> The first call filters from zero, so the output
takes about sixteen samples to arrive anywhere near the truth. Seed it with the first reading
instead.</p>

<p><b>5. Static state means one instance.</b> Two channels through this function share the
filter and corrupt each other's results. The state belongs in a caller-supplied context.</p>

<p><b>6. No unit in the name and no status.</b> <code>filtered</code> says nothing about
scaling, and a bad reading has no way to be reported as anything other than a plausible
number.</p>`,
checklist: [
"The multiply should widen before multiplying, even though this case happens to fit",
"The EMA stalls once the difference is smaller than 2^K, so it never converges",
"The right shift truncates towards negative infinity, biasing the result low",
"Fix: keep the accumulator scaled up by 2^K and shift only on output",
"filtered is never initialised, so the first samples are wrong",
"Static state means the function cannot serve two channels",
"The variable name carries no unit",
"There is no way to report a failed or out-of-range reading"
]
},

{
id: "d-spot-rtos",
kind: "spot",
track: "Embedded C",
title: "Task setup and shared hardware",
mins: 9,
brief: `<p>An RTOS application's startup and one of its tasks. Two sensors on the same I2C
bus. Readings are occasionally wrong. Find every fault, not just that one.</p>`,
code: `void start_sensors(void)
{
    int channel = 0;
    xTaskCreate(sensor_task, "s0", 256, &amp;channel, 5, NULL);
    channel = 1;
    xTaskCreate(sensor_task, "s1", 256, &amp;channel, 5, NULL);
}

void sensor_task(void *arg)
{
    int ch = *(int *)arg;
    for (;;) {
        i2c_write(addr[ch], REG_SELECT, ch);
        int v = i2c_read(addr[ch], REG_DATA);
        publish(ch, v);
        vTaskDelay(10);
    }
}`,
answer: `<p><b>1. &amp;channel points into a stack frame that is released.</b> When
start_sensors returns, that memory belongs to whatever runs next. Both tasks then read
whatever is there.</p>

<p><b>2. Both tasks are given the same address.</b> Even before the frame dies, the second
xTaskCreate overwrote channel with 1, so whichever task reads first may see 1 for both. This
is a race on top of a lifetime bug.</p>

<p><b>3. The write and read are two separate transactions.</b> Between selecting the register
and reading it, the other task can address the same bus and move the device's internal
pointer. Both transactions are individually correct and the data is still wrong. It needs one
combined transaction with a repeated START, and where a sequence genuinely spans transactions,
a mutex around the whole sequence rather than around each call.</p>

<p><b>4. xTaskCreate's return value is not checked.</b> It returns a failure if the heap
cannot supply the stack, and then the task simply does not exist with nothing to indicate
it.</p>

<p><b>5. The stack size is a guess.</b> 256 is words in standard FreeRTOS, so 1 kB, but bytes
in some ports including ESP-IDF. Size it by measuring the high water mark under worst-case
load.</p>

<p><b>6. vTaskDelay(10) is in ticks, not milliseconds.</b> It should be
<code>pdMS_TO_TICKS(10)</code>, or the period silently changes with the tick rate
configuration.</p>

<p><b>7. vTaskDelay gives a drifting period,</b> since it delays from the moment of the call
rather than from a fixed schedule. <code>vTaskDelayUntil</code> gives a fixed period.</p>

<p><b>8. i2c_read's failure has nowhere to go.</b> It returns an int that is also a valid
reading, so a bus error is published as data.</p>

<p><b>The structural answer</b> to the bus problem is one task owning the bus and publishing
to a queue, which removes the shared mutable state instead of protecting it.</p>`,
checklist: [
"&channel points at a stack frame that is released when start_sensors returns",
"Both tasks receive the same pointer, and it has already been overwritten",
"The register select and the read are separate transactions, so the device pointer can move",
"xTaskCreate's return value is unchecked, so a failed task creation is silent",
"The stack size is a guess, and the units differ between FreeRTOS ports",
"vTaskDelay takes ticks, so it needs pdMS_TO_TICKS",
"vTaskDelay drifts; vTaskDelayUntil gives a fixed period",
"i2c_read has no way to report failure separately from data",
"Suggested one task owning the bus and publishing to a queue"
]
},

{
id: "d-spot-parse",
kind: "spot",
track: "Embedded C",
title: "A frame parser",
mins: 9,
brief: `<p>Parses a length-prefixed frame out of a receive buffer. Review it. Assume an
attacker or a noisy link can produce any bytes at all.</p>`,
code: `/* frame: [0xAA][len][payload...][crc_lo][crc_hi] */

int parse_frame(uint8_t *in, int in_len, uint8_t *payload)
{
    if (in[0] != 0xAA)
        return -1;

    int len = in[1];

    memcpy(payload, &amp;in[2], len);

    uint16_t crc = in[2 + len] | (in[3 + len] &lt;&lt; 8);
    if (crc != crc16(&amp;in[2], len))
        return -1;

    return len;
}`,
answer: `<p><b>1. in_len is never used.</b> The function is handed the buffer's length and
ignores it entirely, so every access below is unchecked. This is the root fault.</p>

<p><b>2. in[0] and in[1] are read before checking in_len &gt;= 2.</b> A one-byte buffer is
read past the end immediately.</p>

<p><b>3. The memcpy is unbounded in two directions.</b> It reads <code>len</code> bytes from
in without checking that <code>2 + len + 2 &lt;= in_len</code>, and it writes them into
payload without knowing how big payload is. len comes off the wire and can be 255.</p>

<p><b>4. payload has no capacity parameter.</b> The signature makes it impossible for the
function to be safe, however carefully the body is written.</p>

<p><b>5. The CRC bytes are read past the end</b> for the same reason, at
<code>in[2 + len]</code> and <code>in[3 + len]</code>.</p>

<p><b>6. The CRC is checked after the copy.</b> Data is committed to the caller's buffer
before it has been validated. Validate first, copy second.</p>

<p><b>7. <code>in[3 + len] &lt;&lt; 8</code> promotes to int.</b> Correct here because the
value is small, but the habit should be to cast to <code>uint16_t</code> first, because the
same pattern at 24 bits shifts into the sign bit and is undefined.</p>

<p><b>8. in should be const.</b> The function does not modify it, and saying so is a checked
promise that also lets callers pass a const buffer.</p>

<p><b>The signature it should have:</b></p>
<pre>int parse_frame(const uint8_t *in, size_t in_len,
                uint8_t *payload, size_t payload_cap);</pre>`,
checklist: [
"in_len is passed but never used, so every access is unchecked",
"The header bytes are read before confirming the buffer holds two bytes",
"The memcpy length comes from the wire and is not validated against in_len",
"payload has no capacity parameter, so the signature cannot be made safe",
"The CRC bytes are read past the end of the buffer",
"The CRC is verified after the copy rather than before it",
"The shift should cast to a wide unsigned type as a habit",
"in should be const",
"Gave a corrected signature with both lengths"
]
},

{
id: "d-spot-fsm",
kind: "spot",
track: "Embedded C",
title: "A state machine and a timeout",
mins: 8,
brief: `<p>Drives a measurement cycle. It works on the bench and hangs in the field roughly
once a day. Explain the hang, and everything else you would change.</p>`,
code: `static int state = IDLE;
static uint32_t start;

void tick(int ev)
{
    if (state == IDLE &amp;&amp; ev == EV_START) {
        start = now_ms();
        begin_measure();
        state = BUSY;
    }
    if (state == BUSY &amp;&amp; ev == EV_DONE) {
        publish();
        state = IDLE;
    }
    if (state == BUSY &amp;&amp; now_ms() &gt; start + TIMEOUT_MS) {
        state = FAULT;
    }
}`,
answer: `<p><b>1. The timeout comparison breaks across a wrap.</b>
<code>now_ms() &gt; start + TIMEOUT_MS</code> overflows when start is near the top of the
range: <code>start + TIMEOUT</code> wraps to a small number, the comparison becomes true
immediately, and the cycle faults instantly. Or, depending on the values, never becomes true
and the machine hangs in BUSY.</p>
<p>With a 32-bit millisecond counter that happens about every 49.7 days, but with a 16-bit or
faster counter it can easily be daily, which matches the reported symptom. The correct form is
<code>(now_ms() - start) &gt; TIMEOUT_MS</code>, which stays correct across a wrap because
unsigned subtraction is modular. Both variables must be unsigned, because signed overflow is
undefined.</p>

<p><b>2. Sequential ifs, not a switch.</b> The first if can set state to BUSY and the second
if then evaluates in the same call, so one event can drive two transitions. They should be
mutually exclusive.</p>

<p><b>3. No default handling.</b> Nothing says what happens for an unexpected state, so a
corrupted value silently does nothing.</p>

<p><b>4. state is a plain int, not an enum.</b> Any integer is assignable, and the compiler
cannot warn about an unhandled case.</p>

<p><b>5. No way out of FAULT.</b> Once there, no transition returns to IDLE, so the device
stays faulted until reset with nothing to say why.</p>

<p><b>6. state and start are static,</b> so there can only ever be one instance, and no test
can establish a starting state.</p>

<p><b>7. Nothing records why it faulted.</b> A counter or a reason code turns a field report
of "it stopped" into evidence.</p>`,
checklist: [
"The timeout uses now > start + TIMEOUT, which breaks across a counter wrap",
"Gave the correct form (now - start) > TIMEOUT and said why it works",
"Noted both variables must be unsigned because signed overflow is undefined",
"Sequential ifs let one event cause two transitions in a single call",
"No default case, so a corrupted state silently does nothing",
"state should be an enum rather than an int",
"There is no exit from FAULT",
"Static state means one instance and no testable starting condition",
"Nothing records the fault reason for later diagnosis"
]
},

// ============================================================ WRITE THE CODE

{
id: "d-write-ring",
kind: "write",
track: "Embedded C",
title: "Lock-free ring buffer for one ISR and one task",
mins: 15,
brief: `<p>Write a byte ring buffer for a single producer in an interrupt and a single
consumer in a task, with <b>no critical section and no mutex</b>.</p>
<ul>
<li><code>bool rb_put(uint8_t b)</code> called from the ISR, returns false if full</li>
<li><code>bool rb_get(uint8_t *b)</code> called from the task, returns false if empty</li>
</ul>
<p>State your assumptions. Explain in a comment why it is safe without a lock.</p>`,
code: "",
answer: `<pre>#define RB_SIZE 64                     /* power of two, so the wrap is a mask */

static uint8_t          rb_buf[RB_SIZE];
static volatile uint8_t rb_head;        /* written ONLY by the producer */
static volatile uint8_t rb_tail;        /* written ONLY by the consumer */

/* Safe without a lock because each index has exactly one writer, and a
 * uint8_t store is atomic on this target. One slot is sacrificed so that
 * head == tail means empty and never also means full. */

bool rb_put(uint8_t b)                  /* ISR context */
{
    uint8_t next = (uint8_t)((rb_head + 1u) &amp; (RB_SIZE - 1u));

    if (next == rb_tail) {
        return false;                   /* full: drop, do not overwrite */
    }
    rb_buf[rb_head] = b;                /* write the data ... */
    rb_head = next;                     /* ... then publish it */
    return true;
}

bool rb_get(uint8_t *b)                 /* task context */
{
    if (rb_tail == rb_head) {
        return false;                   /* empty */
    }
    *b = rb_buf[rb_tail];               /* read the data ... */
    rb_tail = (uint8_t)((rb_tail + 1u) &amp; (RB_SIZE - 1u));   /* ... then release */
    return true;
}</pre>

<p><b>The ordering matters.</b> In <code>rb_put</code> the data is written before head is
advanced, so the consumer never sees an index it can read before the byte is there. In
<code>rb_get</code> the byte is read before tail is advanced, so the producer cannot overwrite
a slot still being read. Reversing either line introduces a genuine race.</p>

<p><b>Assumptions worth stating.</b> Exactly one producer and one consumer. A byte store is
atomic on this target, which is true on Cortex-M for an aligned uint8_t. On a core with a
write buffer or weak ordering you would need a memory barrier between the data write and the
index update, because volatile orders the compiler but not the hardware.</p>

<p><b>Why the sacrificed slot.</b> Without it, head == tail is ambiguous: both empty and full.
The alternative is free-running indices that never wrap, deriving occupancy by subtraction,
which uses the whole buffer at the cost of limiting the size to half the index range.</p>`,
expect: [
{ re: /volatile/, want: "volatile on the shared indices", hint: "the other context changes them" },
{ re: /&\s*\(?\s*\w*SIZE\w*\s*-\s*1/i, want: "a mask rather than a modulo", hint: "power-of-two size" },
{ re: /(head|tail|next)\s*==\s*(head|tail|next)/, want: "an empty or full test comparing the indices", hint: "" },
{ re: /return\s+false/, want: "returning false when full rather than overwriting", hint: "" }
],
checklist: [
"Each index has exactly one writer: the producer writes head, the consumer writes tail",
"One slot sacrificed, so empty and full are distinguishable",
"Data is written before head advances, and read before tail advances",
"Size is a power of two so the wrap is a mask rather than a modulo",
"Indices are volatile",
"Returns false on full rather than overwriting unread data",
"Stated the single-producer, single-consumer assumption",
"Mentioned atomic index stores, or a barrier on a weakly ordered core"
]
},

{
id: "d-write-crc",
kind: "write",
track: "Embedded C",
title: "CRC-16/CCITT and its self-test",
mins: 12,
brief: `<p>Write <code>uint16_t crc16_ccitt(const uint8_t *data, size_t len)</code>.</p>
<p>Polynomial 0x1021, initial value 0xFFFF, no reflection of input or output, no final XOR.</p>
<p>Also write the one test you would run first, and say what value it must produce.</p>`,
code: "",
answer: `<pre>uint16_t crc16_ccitt(const uint8_t *data, size_t len)
{
    uint16_t crc = 0xFFFFu;                     /* init */

    for (size_t i = 0; i &lt; len; i++) {
        crc ^= (uint16_t)data[i] &lt;&lt; 8;          /* byte into the TOP half */

        for (int bit = 0; bit &lt; 8; bit++) {
            if (crc &amp; 0x8000u) {
                crc = (uint16_t)((crc &lt;&lt; 1) ^ 0x1021u);
            } else {
                crc = (uint16_t)(crc &lt;&lt; 1);
            }
        }
    }
    return crc;
}</pre>

<p><b>The first test</b> is the published check value: the CRC of the ASCII string
<code>123456789</code> must be <b>0x29B1</b>. Every catalogued CRC publishes one, and running
against it proves all the parameters match at once, because getting any single one wrong
changes the answer.</p>
<pre>assert(crc16_ccitt((const uint8_t *)"123456789", 9) == 0x29B1);</pre>

<p><b>Points that matter in the implementation.</b> The byte is XORed into the <b>top</b>
half, which is what makes this a division from the most significant end. The casts on the
shifts keep the arithmetic in 16 bits, since <code>crc &lt;&lt; 1</code> promotes to int and
would otherwise carry a bit beyond 0xFFFF. And <code>len</code> is <code>size_t</code> and
<code>data</code> is <code>const</code>.</p>

<p><b>Worth mentioning.</b> A table-driven version does one lookup per byte instead of eight
iterations, at a cost of 512 bytes, and the table is generated by exactly this loop. Also:
appending the CRC big-endian and running the CRC over the whole frame including those bytes
gives zero, which makes the receive check one line. And many parts have a hardware CRC unit,
which is worth checking before writing any of this.</p>`,
expect: [
{ re: /0x1021/i, want: "the polynomial 0x1021", hint: "" },
{ re: /0xFFFF/i, want: "the initial value 0xFFFF", hint: "" },
{ re: /0x8000/i, want: "a test of the top bit", hint: "this is an MSB-first CRC" },
{ re: /<<\s*8/, want: "the byte shifted into the high half", hint: "not XORed into the low byte" },
{ re: /const/, want: "const on the input pointer", hint: "" },
{ re: /size_t/, want: "size_t for the length", hint: "" }
],
checklist: [
"Initialises to 0xFFFF",
"XORs the byte into the high half of the register, not the low",
"Tests the top bit, shifts left, and XORs the polynomial only when that bit was set",
"Eight iterations per byte",
"Casts keep the arithmetic in 16 bits after the promoting shift",
"Signature uses const and size_t",
"Named the check value: 0x29B1 for the string 123456789",
"Mentioned the table-driven version, the checks-to-zero property, or a hardware CRC unit"
]
},

{
id: "d-write-init",
kind: "write",
track: "Embedded C",
title: "A driver init with clean error handling",
mins: 15,
brief: `<p>Write the init function for a sensor driver, given an injected transport.</p>
<ul>
<li>Validate arguments</li>
<li>Allocate the handle</li>
<li>Read the ID register and verify it</li>
<li>Reset the device and wait for it to be ready</li>
<li>Write one configuration register</li>
</ul>
<p>Every failure path must leave no allocation behind and must not touch the caller's out
pointer. Distinguish a bus failure from a wrong part.</p>`,
code: `typedef struct {
    int  (*read) (void *ctx, uint8_t reg, uint8_t *buf, size_t len);
    int  (*write)(void *ctx, uint8_t reg, const uint8_t *buf, size_t len);
    void (*delay_ms)(void *ctx, uint32_t ms);
    void *ctx;
} sensor_io_t;

typedef struct sensor_dev sensor_dev_t;      /* opaque */

int sensor_init(const sensor_io_t *io, sensor_dev_t **out);`,
answer: `<pre>struct sensor_dev {          /* defined here, not in the header */
    sensor_io_t io;          /* copied by value: the caller's may be on the stack */
};

int sensor_init(const sensor_io_t *io, sensor_dev_t **out)
{
    int rc;

    if (io == NULL || out == NULL ||
        io-&gt;read == NULL || io-&gt;write == NULL || io-&gt;delay_ms == NULL) {
        return SENSOR_ERR_INVALID_ARG;
    }

    sensor_dev_t *dev = calloc(1, sizeof(*dev));
    if (dev == NULL) {
        return SENSOR_ERR_NO_MEM;
    }
    dev-&gt;io = *io;                       /* copy, so io need not outlive this call */

    uint8_t id;
    rc = dev-&gt;io.read(dev-&gt;io.ctx, REG_WHO_AM_I, &amp;id, 1);
    if (rc != 0) {
        goto fail;                       /* propagate the bus error unchanged */
    }
    if (id != SENSOR_EXPECTED_ID) {
        rc = SENSOR_ERR_WRONG_PART;      /* we know something the bus layer did not */
        goto fail;
    }

    uint8_t rst = RESET_BIT;
    rc = dev-&gt;io.write(dev-&gt;io.ctx, REG_CTRL, &amp;rst, 1);
    if (rc != 0) {
        goto fail;
    }

    /* poll the self-clearing reset bit: a datasheet maximum is a bound, not a wait */
    for (unsigned tries = 0; ; tries++) {
        uint8_t st;
        rc = dev-&gt;io.read(dev-&gt;io.ctx, REG_CTRL, &amp;st, 1);
        if (rc != 0) {
            goto fail;
        }
        if ((st &amp; RESET_BIT) == 0) {
            break;                       /* ready */
        }
        if (tries &gt;= RESET_MAX_TRIES) {
            rc = SENSOR_ERR_TIMEOUT;
            goto fail;
        }
        dev-&gt;io.delay_ms(dev-&gt;io.ctx, 1);
    }

    uint8_t cfg = SENSOR_DEFAULT_CFG;
    rc = dev-&gt;io.write(dev-&gt;io.ctx, REG_CFG, &amp;cfg, 1);
    if (rc != 0) {
        goto fail;
    }

    *out = dev;                          /* set LAST, only on success */
    return 0;

fail:
    free(dev);
    return rc;
}</pre>

<p><b>Why each piece.</b> Validation happens at the API boundary because you do not control
what comes in. The transport is copied so the caller's struct need not outlive the call. The
single <code>fail</code> label gives one unwind path, so adding a resource later means adding
one line rather than updating five returns. The bus error is propagated unchanged, and only
the identity mismatch earns its own code, because that is genuinely new information. The reset
is polled with a timeout rather than delayed. And <code>*out</code> is written last, so a
caller that ignores the return value at least has a null rather than a half-built handle.</p>`,
expect: [
{ re: /==\s*NULL|!\w+\s*\)|NULL\s*==/, want: "argument validation", hint: "io, out and the function pointers" },
{ re: /goto\s+\w+/, want: "a single unwind path with goto", hint: "rather than duplicated cleanup" },
{ re: /free\s*\(/, want: "freeing the handle on failure", hint: "" },
{ re: /\*\s*out\s*=/, want: "assigning through out", hint: "and it should be the last thing you do" },
{ re: /dev->io\s*=\s*\*/, want: "copying the transport by value", hint: "the caller's struct may be on the stack" }
],
checklist: [
"Validates io, out and every function pointer before use",
"Checks the allocation",
"Copies the transport struct by value rather than storing a pointer",
"Uses one unwind path (goto fail) rather than duplicated cleanup",
"Frees the handle on every failure path",
"Propagates the bus error unchanged and uses a distinct code only for the wrong part",
"Polls the reset bit with a timeout instead of a fixed delay",
"Uses the injected delay rather than calling the platform directly",
"Sets *out last, and only on success"
]
},

{
id: "d-write-serial",
kind: "write",
track: "Embedded C",
title: "Serialise a frame for the wire",
mins: 12,
brief: `<p>Write a function that serialises this struct into a byte buffer, little-endian,
with no padding and no dependence on the compiler's struct layout.</p>
<pre>typedef struct {
    uint8_t  type;
    uint16_t seq;
    int32_t  value;
} msg_t;</pre>
<p>Signature: <code>int msg_pack(const msg_t *m, uint8_t *out, size_t cap)</code>, returning
bytes written or a negative error. Then write the matching unpack.</p>`,
code: "",
answer: `<pre>#define MSG_WIRE_LEN  7          /* 1 + 2 + 4, stated explicitly */

int msg_pack(const msg_t *m, uint8_t *out, size_t cap)
{
    if (m == NULL || out == NULL) {
        return -EINVAL;
    }
    if (cap &lt; MSG_WIRE_LEN) {
        return -ENOSPC;
    }

    out[0] = m-&gt;type;

    out[1] = (uint8_t)(m-&gt;seq);            /* little-endian: low byte first */
    out[2] = (uint8_t)(m-&gt;seq &gt;&gt; 8);

    uint32_t v = (uint32_t)m-&gt;value;       /* shift as unsigned */
    out[3] = (uint8_t)(v);
    out[4] = (uint8_t)(v &gt;&gt; 8);
    out[5] = (uint8_t)(v &gt;&gt; 16);
    out[6] = (uint8_t)(v &gt;&gt; 24);

    return MSG_WIRE_LEN;
}

int msg_unpack(msg_t *m, const uint8_t *in, size_t len)
{
    if (m == NULL || in == NULL) {
        return -EINVAL;
    }
    if (len &lt; MSG_WIRE_LEN) {
        return -EBADMSG;
    }

    m-&gt;type = in[0];

    m-&gt;seq  = (uint16_t)((uint16_t)in[2] &lt;&lt; 8 | in[1]);

    uint32_t v = (uint32_t)in[3]
               | (uint32_t)in[4] &lt;&lt; 8
               | (uint32_t)in[5] &lt;&lt; 16
               | (uint32_t)in[6] &lt;&lt; 24;
    m-&gt;value = (int32_t)v;

    return MSG_WIRE_LEN;
}</pre>

<p><b>Why byte by byte.</b> <code>memcpy</code> of the struct would transmit the compiler's
padding, whose contents are unspecified, so the same call can send different bytes each time
and a different compiler on either end breaks it. It would also transmit the CPU's byte order
rather than the protocol's.</p>

<p><b>Why shift as unsigned.</b> Shifting a negative <code>int32_t</code> right is
implementation-defined, and shifting into the sign bit is undefined. Casting to
<code>uint32_t</code> first makes the whole operation defined, and casting back on unpack is
the standard way round.</p>

<p><b>The test worth writing.</b> Pack then unpack must return the original for any value,
including the extremes: <code>INT32_MIN</code>, <code>INT32_MAX</code>, <code>-1</code>, and
0. A byte-order mistake made consistently in both directions is invisible to a round-trip
test alone, so also assert the exact bytes for one known message.</p>`,
expect: [
{ re: />>\s*8/, want: "explicit byte shifts", hint: "rather than memcpy of the struct" },
{ re: /uint32_t|uint16_t/, want: "an unsigned type for the shifting", hint: "shifting a negative signed value is not defined" },
{ re: /cap|len\s*<|<\s*\w*LEN/i, want: "a capacity or length check", hint: "before writing into the caller's buffer" },
{ re: /const/, want: "const on the input", hint: "" }
],
checklist: [
"Serialises field by field rather than memcpy of the struct",
"Explained that struct padding is unspecified and layout is compiler-dependent",
"Explicit little-endian byte order, low byte first",
"Casts the signed value to unsigned before shifting",
"Checks the destination capacity and returns an error rather than overrunning",
"Returns the number of bytes written",
"Uses const on the input pointers",
"Named the round-trip test and the extreme values",
"Noted that a round trip alone cannot catch a consistent byte-order error"
]
},

{
id: "d-write-ema",
kind: "write",
track: "Embedded C",
title: "A fixed-point smoothing filter that does not stall",
mins: 12,
brief: `<p>Write an exponential moving average in integer arithmetic, with no floating point
and no multiply.</p>
<ul>
<li>It must converge on a constant input rather than plateauing short of it</li>
<li>It must not bias negative values downward</li>
<li>It must support more than one instance</li>
<li>It must initialise sensibly on the first sample</li>
</ul>`,
code: "",
answer: `<pre>typedef struct {
    int32_t acc;        /* state, held scaled up by 2^shift */
    uint8_t shift;      /* time constant is roughly 2^shift samples */
    bool    primed;
} ema_t;

void ema_init(ema_t *f, uint8_t shift)
{
    f-&gt;acc    = 0;
    f-&gt;shift  = shift;
    f-&gt;primed = false;
}

int32_t ema_update(ema_t *f, int32_t x)
{
    if (!f-&gt;primed) {                       /* seed with the first sample ... */
        f-&gt;acc    = x &lt;&lt; f-&gt;shift;          /* ... so we do not ramp from zero */
        f-&gt;primed = true;
        return x;
    }

    f-&gt;acc += x - (f-&gt;acc &gt;&gt; f-&gt;shift);     /* state stays at high precision */
    return f-&gt;acc &gt;&gt; f-&gt;shift;              /* shift only on output */
}</pre>

<p><b>Why this form and not <code>y += (x - y) &gt;&gt; K</code>.</b> In the naive version,
once <code>(x - y)</code> is smaller than <code>2^K</code> the shift truncates to zero, the
increment is nothing, and the filter stops moving while still short of the input. Holding the
accumulator scaled up by <code>2^K</code> keeps the fractional part that the naive version
throws away, so it converges.</p>

<p><b>The bias.</b> A right shift rounds towards negative infinity, so in the naive form
negative errors round away from zero and positive ones towards it, pulling the output down.
Keeping the residue in the accumulator removes that too.</p>

<p><b>Instances.</b> The state is in a caller-supplied struct rather than a file-scope static,
so two channels do not corrupt each other and a test can establish a known starting state.</p>

<p><b>Worth stating.</b> <code>x &lt;&lt; shift</code> overflows if x is large, so for a wide
input range either widen the accumulator to int64_t or bound the input. And the time constant
is quantised to powers of two: you can have 16 samples or 32 but nothing between, which is the
price of avoiding a multiply.</p>`,
expect: [
{ re: />>\s*\w*shift|>>\s*K/i, want: "a shift for the time constant", hint: "" },
{ re: /acc|accum/i, want: "an accumulator held at higher precision", hint: "this is what stops it stalling" },
{ re: /struct|\w+\s*->/, want: "state in a caller-supplied struct", hint: "so more than one instance works" }
],
checklist: [
"Keeps the accumulator scaled up by 2^shift rather than shifting the increment",
"Shifts only on output",
"Explained that the naive form stalls once the error is below 2^K",
"Explained the downward bias from truncation towards negative infinity",
"State lives in a caller-supplied struct, so multiple instances work",
"Seeds from the first sample instead of ramping up from zero",
"Noted the overflow risk when seeding or with a wide input range",
"Noted that the time constant is quantised to powers of two"
]
},

{
id: "d-write-debounce",
kind: "write",
track: "Embedded C",
title: "Debounce a button",
mins: 10,
brief: `<p>Write a debounce routine called at a fixed rate from a timer, say every 5 ms.</p>
<ul>
<li>Report a stable press and a stable release, not a level</li>
<li>Support several buttons</li>
<li>No dynamic allocation and no blocking</li>
</ul>
<p>Say what the two edge cases are and how you handle them.</p>`,
code: "",
answer: `<pre>typedef struct {
    uint8_t history;        /* last 8 polls, newest in bit 0 */
    bool    stable;         /* the debounced level */
} btn_t;

typedef enum { BTN_NONE, BTN_PRESSED, BTN_RELEASED } btn_ev_t;

/* Call at a fixed rate. raw is true when the button is physically down. */
btn_ev_t btn_poll(btn_t *b, bool raw)
{
    b-&gt;history = (uint8_t)((b-&gt;history &lt;&lt; 1) | (raw ? 1u : 0u));

    if (b-&gt;history == 0xFFu &amp;&amp; !b-&gt;stable) {   /* 8 consecutive downs */
        b-&gt;stable = true;
        return BTN_PRESSED;
    }
    if (b-&gt;history == 0x00u &amp;&amp; b-&gt;stable) {    /* 8 consecutive ups   */
        b-&gt;stable = false;
        return BTN_RELEASED;
    }
    return BTN_NONE;
}</pre>

<p><b>Why a shift register.</b> The whole debounce is one shift, one OR and two comparisons,
with a single byte of state per button. It requires no timers, no counters to reset, and no
timestamps, and at a 5 ms poll it means the input must be steady for 40 ms.</p>

<p><b>Multiple buttons.</b> The state is per instance in a caller-supplied struct, so an
array of them costs two bytes each.</p>

<p><b>Edge case one: the initial state.</b> <code>history</code> starts at zero, which reads
as "released", so a button already held at boot produces a press event once eight polls have
passed. That is usually right, but it should be a decision rather than an accident, and if you
want the boot state suppressed you seed <code>history</code> and <code>stable</code> from the
first raw read.</p>

<p><b>Edge case two: the event is returned, not stored.</b> A caller that misses a call misses
the edge. Where events must not be lost, push them into a queue instead of returning them.</p>

<p><b>What I would ask before writing it.</b> Whether the switch is active low, which is the
common wiring, and whether there is a hardware RC filter, because the required window depends
on the switch and on whether anything is filtering already.</p>`,
expect: [
{ re: /<<\s*1/, want: "a shift register of recent samples", hint: "" },
{ re: /0xFF|0xff/, want: "a test for a run of consecutive samples", hint: "" },
{ re: /struct|\w+\s*->/, want: "per-instance state", hint: "so several buttons work" }
],
checklist: [
"Shifts a history of recent samples rather than using timers or counters",
"Reports edges (pressed and released) rather than a level",
"State is per instance in a caller-supplied struct",
"No allocation and no blocking",
"Stated the resulting debounce time from the poll rate and the history length",
"Handled the initial state deliberately",
"Noted that a returned event is lost if the caller misses a poll",
"Asked about active-low wiring or an existing hardware filter"
]
},

{
id: "d-write-parse",
kind: "write",
track: "Embedded C",
title: "A byte-at-a-time frame receiver",
mins: 15,
brief: `<p>Bytes arrive one at a time from an interrupt. Write a state machine that assembles
frames of the form:</p>
<pre>[0xAA] [len] [payload 0..255] [crc_lo] [crc_hi]</pre>
<p>where the CRC covers len and the payload. It must recover from corruption without getting
permanently stuck, and must never write outside its buffer.</p>`,
code: "",
answer: `<pre>#define MAX_PAYLOAD 64

typedef enum { S_SYNC, S_LEN, S_PAYLOAD, S_CRC_LO, S_CRC_HI } rx_state_t;

typedef struct {
    rx_state_t state;
    uint8_t    len;
    uint8_t    idx;
    uint8_t    payload[MAX_PAYLOAD];
    uint16_t   crc_rx;
    uint32_t   bad_frames;          /* visible degradation, not silent */
} rx_t;

/* Returns payload length when a good frame completes, else -1. */
int rx_byte(rx_t *r, uint8_t b)
{
    switch (r-&gt;state) {

    case S_SYNC:
        if (b == 0xAAu) {
            r-&gt;state = S_LEN;
        }
        break;                       /* anything else: stay hunting for sync */

    case S_LEN:
        if (b &gt; MAX_PAYLOAD) {       /* validate BEFORE trusting it */
            r-&gt;bad_frames++;
            r-&gt;state = S_SYNC;       /* resynchronise rather than overrun */
        } else {
            r-&gt;len   = b;
            r-&gt;idx   = 0;
            r-&gt;state = (b == 0u) ? S_CRC_LO : S_PAYLOAD;
        }
        break;

    case S_PAYLOAD:
        r-&gt;payload[r-&gt;idx++] = b;
        if (r-&gt;idx &gt;= r-&gt;len) {
            r-&gt;state = S_CRC_LO;
        }
        break;

    case S_CRC_LO:
        r-&gt;crc_rx = b;
        r-&gt;state  = S_CRC_HI;
        break;

    case S_CRC_HI:
        r-&gt;crc_rx |= (uint16_t)b &lt;&lt; 8;
        r-&gt;state   = S_SYNC;                 /* always return to hunting */
        {
            uint16_t calc = crc16(&amp;r-&gt;len, 1);
            calc = crc16_continue(calc, r-&gt;payload, r-&gt;len);
            if (calc == r-&gt;crc_rx) {
                return r-&gt;len;               /* good frame */
            }
            r-&gt;bad_frames++;
        }
        break;

    default:
        r-&gt;bad_frames++;
        r-&gt;state = S_SYNC;                   /* impossible state is a fault */
        break;
    }
    return -1;
}</pre>

<p><b>Recovery is the point.</b> The length is validated against the buffer before it is
trusted, so a corrupted length resynchronises instead of overrunning. Every terminal path
returns to S_SYNC, so no corruption can leave the machine stuck. And a payload of zero is
handled explicitly rather than falling into S_PAYLOAD and waiting forever.</p>

<p><b>What this does not solve.</b> A 0xAA byte inside a payload can cause a false sync after
a loss, and the CRC then rejects the resulting frame, so it costs a frame rather than
correctness. If that matters, use a delimiter with escaping such as COBS, which resynchronises
unambiguously.</p>

<p><b>The counter.</b> <code>bad_frames</code> exists so a marginal link is visible. Without
it, a link retrying constantly looks identical to a healthy one until it fails outright.</p>

<p><b>A timeout is worth adding</b> so a frame that stops mid-way does not hold the parser
in a non-sync state indefinitely while a fresh frame arrives behind it.</p>`,
expect: [
{ re: /switch|case\s+\w+:/, want: "an explicit state machine", hint: "rather than nested ifs" },
{ re: />\s*MAX|>=\s*MAX|>\s*\w*SIZE/i, want: "validating the length before storing payload", hint: "it comes off the wire" },
{ re: /default\s*:/, want: "a default case", hint: "an impossible state is a fault" },
{ re: /struct|\w+\s*->/, want: "per-instance state", hint: "" }
],
checklist: [
"An explicit state enum rather than flags or nested ifs",
"The length is validated against the buffer size before any payload is stored",
"A corrupt length resynchronises instead of overrunning",
"Every terminal path returns to the sync state, so it cannot get stuck",
"Zero-length payload handled explicitly",
"A default case treating an impossible state as a fault",
"State is per instance in a caller-supplied struct",
"Counts bad frames rather than discarding them silently",
"Mentioned false sync on 0xAA in the payload, or a timeout, as remaining limitations"
]
},

{
id: "d-write-timeout",
kind: "write",
track: "Embedded C",
title: "A wait that cannot hang",
mins: 8,
brief: `<p>Write a function that waits for a peripheral's READY bit, given a free-running
millisecond counter <code>uint32_t now_ms(void)</code> that wraps.</p>
<p>It must be correct across a counter wrap, must never wait forever, and must return
something the caller can act on. Explain the comparison you chose.</p>`,
code: "",
answer: `<pre>int periph_wait_ready(uint32_t timeout_ms)
{
    uint32_t start = now_ms();

    while ((SR &amp; SR_READY) == 0u) {

        if ((uint32_t)(now_ms() - start) &gt; timeout_ms) {
            return -ETIMEDOUT;
        }
    }
    return 0;
}</pre>

<p><b>The comparison is the whole question.</b> Write it as
<code>now_ms() - start &gt; timeout_ms</code>, not
<code>now_ms() &gt; start + timeout_ms</code>.</p>

<p>The subtraction form is correct across a wrap because unsigned arithmetic is defined to
wrap modulo 2^32. If start is 0xFFFFFF00 and the counter has since wrapped to 200, then
<code>200 - 0xFFFFFF00</code> evaluates to 456, which is the true elapsed time.</p>

<p>The addition form overflows: <code>0xFFFFFF00 + 1000</code> wraps to 744, the test becomes
<code>now &gt; 744</code>, and with now around four billion that is true immediately, so the
wait returns instantly having waited for nothing.</p>

<p><b>Both variables must be unsigned.</b> Signed overflow is undefined behaviour, so the same
trick with an <code>int32_t</code> counter has no defined meaning and the optimiser is
entitled to assume it cannot happen.</p>

<p><b>The one limitation:</b> the elapsed interval must be less than the counter's full range,
which for 32-bit milliseconds is about 49.7 days.</p>

<p><b>Two things I would add.</b> SR must be <code>volatile</code>, or the loop reads it once
and spins forever at -O2. And a timeout expiring is real information, so it is worth counting
so a device that is slowly getting worse is visible before it fails outright.</p>`,
expect: [
{ re: /\w+\s*\(\s*\)\s*-\s*start|now\w*\s*-\s*start/, want: "the subtraction form (now - start)", hint: "correct across a counter wrap" },
{ re: /uint32_t/, want: "unsigned types", hint: "signed overflow is undefined" },
{ re: /return\s+-|ETIMEDOUT|TIMEOUT/i, want: "returning an error on timeout", hint: "rather than hanging" }
],
checklist: [
"Uses (now - start) > timeout rather than now > start + timeout",
"Explained that unsigned subtraction is modular and stays correct across a wrap",
"Explained how the addition form overflows and returns immediately",
"Stated that both variables must be unsigned because signed overflow is undefined",
"Returns an error the caller can act on rather than hanging",
"Noted that the status register must be volatile",
"Noted the limitation that elapsed time must be under the counter range",
"Suggested counting timeouts so degradation is visible"
]
}

);
