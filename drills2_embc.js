/* Code drills, batch 2. Same format as drills_embc.js.
   Code samples use &lt; &gt; &amp; escapes because they render inside <pre>. */

DRILLS.push(

// ============================================================ SPOT THE BUG

{
id: "d-spot-fault",
kind: "spot",
track: "Embedded C",
d: 3,
title: "A fault handler that tells you nothing",
mins: 9,
brief: `<p>The product ships with this. A customer reports it locking up. Explain why this
handler is worthless, and what you would replace it with.</p>`,
code: `void HardFault_Handler(void)
{
    printf("hard fault!\\n");
    while (1) { }
}

void main(void)
{
    clocks_init();
    peripherals_init();
    app_run();
}`,
answer: `<p><b>1. printf in a fault handler.</b> It is slow, stack-hungry, usually
non-reentrant and typically blocking. If the fault was a stack overflow there is no stack left
to format into, so the handler faults inside the fault handler and the core locks up hard,
which is worse than the original problem.</p>

<p><b>2. Nothing about the fault is captured.</b> The stacked PC, the stacked LR, and CFSR are
all sitting there and none of them is read. Without the PC you have no idea which instruction
faulted.</p>

<p><b>3. Spinning forever is the wrong action for a product.</b> The device is dead until
someone power-cycles it, and it tells nobody anything. It should record what happened and
reset deliberately, so the next boot can report it.</p>

<p><b>4. The specific fault handlers are never enabled.</b> MemManage, BusFault and UsageFault
default to disabled, so everything escalates to HardFault and you lose the specific cause.
Enabling them in SHCSR during development gives a far more precise answer.</p>

<p><b>5. There is no reset reason logged at boot.</b> Even if it did reset, nothing reads the
reset reason register, so a watchdog reset, a brownout and a fault all look the same to
whoever is supporting it.</p>

<p><b>What to write instead.</b> A small assembly shim decides from bit 2 of EXC_RETURN
whether the frame is on MSP or PSP, passes that pointer to a C function, and that function
copies the stacked PC and LR, CFSR, and BFAR or MMFAR (only when the matching valid bit is
set) into a RAM region that survives reset. Then reset. On the next boot the firmware reports
it. And archive the ELF for every release, because a stacked PC is a bare number without the
symbols from that exact build.</p>`,
checklist: [
"printf is slow, blocking and non-reentrant, and needs stack that may not exist",
"A stack overflow means the handler faults inside the fault handler",
"The stacked PC and LR are available and are not captured",
"CFSR is not read, so the fault category is lost",
"Spinning forever leaves a dead device that reports nothing",
"The configurable fault handlers are never enabled, so everything escalates to HardFault",
"Nothing reads or logs the reset reason at boot",
"Proposed capturing to retained RAM and resetting deliberately",
"Mentioned needing the ELF from that build to decode the address"
]
},

{
id: "d-spot-dma",
kind: "spot",
track: "Embedded C",
d: 3,
title: "An ADC to DMA path",
mins: 10,
brief: `<p>Reads a block of ADC samples using DMA. It works on a Cortex-M4 and fails
intermittently when the same code is moved to a Cortex-M7. Find every fault, and explain the
M7 difference specifically.</p>`,
code: `static int dma_done;

void DMA1_Stream0_IRQHandler(void)
{
    DMA1-&gt;LIFCR = DMA_LIFCR_CTCIF0;
    dma_done = 1;
}

int read_block(uint16_t *out, int n)
{
    uint16_t buf[256];

    dma_done = 0;
    dma_start((uint32_t)buf, n);

    while (!dma_done) { }

    memcpy(out, buf, n * sizeof(uint16_t));
    return 0;
}`,
answer: `<p><b>1. dma_done is not volatile.</b> The poll loop has nothing in its body that the
compiler believes can change it, so at -O2 it reads once and spins forever. Works in debug,
hangs in release.</p>

<p><b>2. buf is a local.</b> It happens to survive here because the function waits, but the
moment anyone makes this asynchronous, the controller is writing into a stack frame that
belongs to something else. DMA targets belong in .bss, a static pool or the heap.</p>

<p><b>3. No cache maintenance, which is the M7 difference.</b> Cortex-M4 has no data cache, so
the CPU and the DMA see the same memory. Cortex-M7 does. The DMA writes to actual RAM while
the CPU may still hold stale cached lines, so the memcpy reads old data. You need a cache
invalidate on that buffer before reading it.</p>

<p><b>4. No cache-line alignment.</b> Invalidation works on whole lines, so a buffer that
shares a line with other variables discards those neighbours' cached values too. The buffer
must be aligned to, and padded out to, a whole number of cache lines.</p>

<p><b>5. No memory barrier.</b> Even with volatile, nothing stops the buffer access being
reordered relative to the flag check on a core that reorders. A DMB after the flag test is the
minimum.</p>

<p><b>6. n is not validated against the buffer.</b> buf is 256 entries and n comes from the
caller, so n = 1000 overruns the stack.</p>

<p><b>7. The wait is unbounded.</b> If the transfer never completes this hangs with no
diagnostic. It needs a timeout.</p>

<p><b>8. No error handling.</b> DMA transfer-error and FIFO-error flags exist and are never
checked, and the function always returns 0.</p>

<p><b>9. Polling defeats the point.</b> The reason to use DMA is that the CPU need not be
involved; spinning on a flag burns the CPU anyway.</p>`,
checklist: [
"dma_done is not volatile, so the poll loop is optimised away at -O2",
"The buffer is a local and must not be, even though it survives here",
"No cache invalidate: the M4 has no data cache and the M7 does",
"No cache-line alignment, so invalidating clobbers neighbouring variables",
"No memory barrier between the flag check and the buffer access",
"n is not validated against the 256-entry buffer",
"The wait has no timeout",
"DMA error flags are never checked and the function always returns success",
"Polling wastes the CPU time that DMA was meant to free"
]
},

{
id: "d-spot-flash",
kind: "spot",
track: "Embedded C",
d: 3,
title: "Saving settings to flash",
mins: 10,
brief: `<p>Called whenever the user changes a setting, which in practice is a few times a
minute. Review it as a design, not just as code.</p>`,
code: `typedef struct {
    uint32_t sample_rate;
    int16_t  offset;
    char     name[16];
} settings_t;

void settings_save(settings_t *s)
{
    flash_unlock();
    flash_erase_sector(SETTINGS_SECTOR);
    flash_write(SETTINGS_ADDR, (uint8_t *)s, sizeof(settings_t));
    flash_lock();
}

void settings_load(settings_t *s)
{
    memcpy(s, (void *)SETTINGS_ADDR, sizeof(settings_t));
}`,
answer: `<p><b>1. The sector wears out.</b> Endurance is typically 10,000 to 100,000 erase
cycles per sector. At a few erases a minute you reach 100,000 in weeks, and the product fails
while the rest of the flash is untouched.</p>

<p><b>2. There is a window with no valid data.</b> Between the erase completing and the write
completing, neither the old settings nor the new ones exist. A power cut there loses
everything.</p>

<p><b>3. No CRC.</b> Corrupted settings load as plausible values, which is the worst failure
mode: wrong behaviour indistinguishable from correct.</p>

<p><b>4. No version or format field.</b> Adding a field to the struct means every device in
the field holds the old layout, and new firmware misreads it.</p>

<p><b>5. The struct is written raw, so padding goes to flash.</b> There is padding after
<code>offset</code>, and its contents are unspecified, so the same settings can produce
different bytes. That also breaks any checksum you add later unless you zero it first.</p>

<p><b>6. settings_load never validates anything.</b> On a blank sector it returns 0xFF
everywhere, which becomes a sample rate of 4294967295 and a name with no terminator.</p>

<p><b>7. name[16] may not be null-terminated,</b> so any string function on it runs off the
end.</p>

<p><b>8. No return values.</b> Flash operations fail, particularly on a worn sector, and
neither function can report it.</p>

<p><b>9. Flash operations stall instruction fetch,</b> so any interrupt handler running from
flash is blocked for the duration. On a system with real-time deadlines that has to be
accounted for.</p>

<p><b>What to do instead:</b> a log-structured store that appends records and only erases when
the sector fills, each record with a CRC, a version and a validity marker written last. Or
simply use the vendor's NVS or LittleFS, because these failure modes are subtle and only
appear after months in the field.</p>`,
checklist: [
"Erasing per save wears the sector out in weeks",
"A power loss between erase and write loses everything",
"No CRC, so corruption produces plausible wrong settings",
"No version field, so a future firmware misreads existing devices",
"Writing the struct raw sends unspecified padding bytes to flash",
"settings_load does not validate, so a blank sector loads as 0xFF everywhere",
"name may not be null-terminated",
"Neither function can report a flash failure",
"Flash operations stall code running from flash, affecting interrupt latency",
"Proposed a log-structured store, or using an existing NVS"
]
},

{
id: "d-spot-boot",
kind: "spot",
track: "Embedded C",
d: 3,
title: "A bootloader jumping to the application",
mins: 9,
brief: `<p>The bootloader validates an image then jumps to it. The application hard faults
immediately. Find the reason, and everything else wrong here.</p>`,
code: `#define APP_BASE 0x08008000

void jump_to_app(void)
{
    void (*app)(void) = (void (*)(void))(APP_BASE + 0x200);

    __disable_irq();
    app();
}`,
answer: `<p><b>1. The entry address is constructed by hand and is even.</b> That is the
immediate fault. Cortex-M executes only Thumb, and bit 0 of a branch target must be 1 to say
so. <code>APP_BASE + 0x200</code> is even, so the branch raises a UsageFault with INVSTATE
set.</p>
<p>The fix is not to add 1. It is to read the reset vector out of the application's own vector
table, which already has the bit set:</p>
<pre>uint32_t sp    = *(volatile uint32_t *)(APP_BASE);
uint32_t entry = *(volatile uint32_t *)(APP_BASE + 4);</pre>

<p><b>2. The stack pointer is never set.</b> The first word of the application's vector table
is its initial MSP, and the bootloader has to load it with <code>__set_MSP(sp)</code> before
branching. Otherwise the application runs on whatever stack the bootloader left.</p>

<p><b>3. VTOR is never set.</b> The vector table offset still points at the bootloader's
table, so every interrupt in the application dispatches into the bootloader's handlers. That
produces bewildering faults much later rather than immediately.</p>

<p><b>4. Peripherals are left as the bootloader configured them.</b> The application
initialises from whatever it inherits, so a peripheral still running, a clock still at the
bootloader's setting, or a DMA still armed will misbehave in ways that look like application
bugs.</p>

<p><b>5. Interrupts are disabled and never re-enabled.</b> The application expects to start
with interrupts enabled. It should be <code>__enable_irq()</code> immediately before the
branch, after everything else is set up.</p>

<p><b>6. Pending interrupts are not cleared.</b> An interrupt already pending in the NVIC
fires the instant interrupts are enabled, into the application's handler, before it is
ready.</p>

<p><b>7. No barriers.</b> After writing VTOR you need DSB then ISB, or the change may not be
in effect when the branch executes.</p>

<p><b>8. Calling it as a function rather than branching</b> leaves a return address on the
stack that will never be used. Harmless, but the intent is a jump, not a call.</p>`,
checklist: [
"The entry address is even, so the Thumb bit is clear and it faults with INVSTATE",
"Should read the reset vector from the application's vector table, not compute it",
"The initial MSP must be loaded from the first word of that table",
"VTOR is never set, so interrupts dispatch into the bootloader's handlers",
"Peripherals and clocks are left in the bootloader's state",
"Interrupts are disabled and never re-enabled",
"Pending NVIC interrupts are not cleared before enabling",
"DSB then ISB needed after writing VTOR"
]
},

{
id: "d-spot-motor",
kind: "spot",
track: "Embedded C",
d: 2,
title: "A motor speed controller",
mins: 10,
brief: `<p>A simple closed-loop speed controller called from a 1 kHz timer interrupt. It
mostly works, and occasionally the motor slams to full speed. Explain that, and review the
rest.</p>`,
code: `static int integral;

void control_tick(void)
{
    int measured = read_speed();
    int error    = setpoint - measured;

    integral += error;

    uint16_t duty = (Kp * error + Ki * integral) / 256;

    TIM1-&gt;CCR1 = duty;
}`,
answer: `<p><b>1. duty is unsigned and the expression can be negative.</b> That is the slam to
full speed. When the motor overshoots, the error goes negative, the expression goes negative,
and converting a negative value to <code>uint16_t</code> wraps it to something near 65535. The
timer accepts it and the output goes to maximum. It needs to be computed in a signed type and
then clamped.</p>

<p><b>2. No clamp at all.</b> Even without the sign bug, nothing bounds duty to the timer's
period, so a large error commands more than 100 per cent.</p>

<p><b>3. The integral has no anti-windup.</b> While the output is saturated the integral keeps
accumulating, so when the error finally reverses the controller stays saturated for a long
time. Classic windup, and it presents as a large overshoot after any sustained disturbance.</p>

<p><b>4. The integral can overflow.</b> It is an <code>int</code> accumulating every
millisecond forever, with no bound. Signed overflow is undefined behaviour.</p>

<p><b>5. No preload on the compare register.</b> Writing CCR1 directly can change the
threshold after the counter has passed the old value, producing one cycle of the wrong width.
On a motor that is a current spike.</p>

<p><b>6. The static integral means one instance,</b> so this cannot control two motors and no
test can set a starting condition.</p>

<p><b>7. read_speed has no failure path.</b> If the encoder or sensor fails, whatever it
returns is treated as a measurement.</p>

<p><b>8. There is no safe state.</b> If the loop stops being called, or the measurement is
nonsense, nothing brings the output to zero. A motor controller should fail to stopped.</p>

<p><b>9. The gains are applied with a shift by 256 with no comment</b> about the fixed-point
format, so nobody can tell what units Kp and Ki are in.</p>`,
checklist: [
"duty is unsigned and a negative result wraps to near full scale",
"No clamp bounding the output to the timer period",
"No anti-windup, so the integral keeps growing while saturated",
"The integral itself can overflow, which is undefined behaviour for a signed int",
"No preload, so a mid-cycle duty change gives one wrong pulse",
"Static state means one instance and no testable starting condition",
"read_speed has no way to report a failed measurement",
"No safe state: it should fail to stopped",
"The fixed-point scaling of the gains is undocumented"
]
},

{
id: "d-spot-header",
kind: "spot",
track: "Embedded C",
d: 1,
title: "A utility header",
mins: 9,
brief: `<p>A header included by every file in the project. Find the problems, and say what
symptom each one produces.</p>`,
code: `#ifndef UTIL_H
#define UTIL_H

#define MAX(a,b)      a &gt; b ? a : b
#define ABS(x)        ((x) &lt; 0 ? -(x) : (x))
#define ARRAY_LEN(a)  (sizeof(a) / sizeof(a[0]))
#define SET_BIT(r,b)  r |= 1 &lt;&lt; b

static int error_count = 0;

static inline void bump_error(void) { error_count++; }

#endif`,
answer: `<p><b>1. MAX has no parentheses at all.</b> <code>MAX(x, y) * 2</code> expands to
<code>x &gt; y ? x : y * 2</code>, because the conditional has very low precedence. It needs
parentheses around every parameter and around the whole body.</p>

<p><b>2. MAX and ABS both evaluate their arguments more than once.</b>
<code>MAX(i++, j)</code> increments i twice. Worse in firmware,
<code>MAX(read_status(), 10)</code> reads a hardware register twice, and on a read-to-clear
register the first read destroys the flags. Both should be static inline functions.</p>

<p><b>3. ARRAY_LEN silently gives the wrong answer on a pointer.</b> Passed an array
parameter, which has decayed to a pointer, it returns the pointer size divided by the element
size, with no warning. It is still worth having, but it is a trap worth knowing.</p>

<p><b>4. SET_BIT is unparenthesised and mis-precedenced.</b>
<code>SET_BIT(reg, n + 1)</code> expands to <code>reg |= 1 &lt;&lt; n + 1</code>, and
<code>+</code> binds tighter than <code>&lt;&lt;</code>, so it shifts by n+1 by accident here
but the general form is unsafe. It should be <code>((r) |= 1u &lt;&lt; (b))</code>, with the
<code>1u</code> so shifting into bit 31 is not undefined.</p>

<p><b>5. error_count is a static variable in a header.</b> Every translation unit that
includes this gets its own private copy, so the count never aggregates and the total is always
wrong. static also suppresses the duplicate-symbol error that would otherwise have caught
it.</p>

<p><b>6. bump_error increments whichever copy its own translation unit has,</b> which makes
the problem worse by hiding it behind a function that looks shared.</p>

<p><b>7. Unused-variable warnings.</b> Any file that includes this and never touches
error_count may warn, which trains people to ignore warnings.</p>

<p><b>The fix for the variable:</b> <code>extern int error_count;</code> in the header and one
definition in a .c file. Better still, keep it static inside one .c and expose functions, so
there is a single owner.</p>`,
checklist: [
"MAX has no parentheses, so it breaks under any surrounding operator",
"MAX and ABS evaluate their arguments twice",
"Double evaluation of a hardware read is worse than of i++",
"ARRAY_LEN silently misreports when given a decayed pointer",
"SET_BIT is unparenthesised and should use 1u",
"static in a header gives every translation unit its own private copy",
"static also suppresses the link error that would have revealed it",
"Proposed extern plus one definition, or a single owning .c file",
"Suggested static inline functions instead of the function-like macros"
]
},

{
id: "d-spot-i2c",
kind: "spot",
track: "Embedded C",
d: 1,
title: "An I2C register read",
mins: 9,
brief: `<p>Reads a 16-bit value from a sensor over I2C. The datasheet gives the device's 7-bit
address as 0x68. Readings are sometimes correct and sometimes come from the wrong
register.</p>`,
code: `int sensor_read16(uint8_t reg, uint16_t *out)
{
    uint8_t rx[2];

    i2c_write(0x68, &amp;reg, 1);
    delay_us(50);
    i2c_read(0x68, rx, 2);

    *out = rx[0] &lt;&lt; 8 | rx[1];
    return 0;
}`,
answer: `<p><b>1. A STOP between the write and the read.</b> This is the reported fault. Two
separate calls means a STOP after the write, which releases the bus and lets many devices
reset or advance their internal address pointer, so the read comes from somewhere else. It
also lets another task address the same device in between. It must be one combined
transaction with a repeated START.</p>

<p><b>2. The address may need shifting.</b> Some APIs take the 7-bit address and shift
internally, others take the pre-shifted byte. Passing 0x68 to one that expects the shifted
form puts 0x34 on the wire, and the tell is that an analyser decodes exactly half the expected
address.</p>

<p><b>3. The delay is a guess.</b> There is no reason for 50 microseconds and it does nothing
that a correct transaction needs. It is the sort of line that gets added when the real problem
was the STOP.</p>

<p><b>4. Neither i2c call's return value is checked,</b> and the function always returns 0. A
NAK, a timeout or a stuck bus all present as success with whatever was in rx.</p>

<p><b>5. rx is uninitialised,</b> so on a failed read the caller gets stack contents as a
measurement.</p>

<p><b>6. The byte order is assumed, not documented.</b> Big-endian here, and nothing says
so.</p>

<p><b>7. <code>rx[0] &lt;&lt; 8</code> promotes to int,</b> which is fine at 16 bits but the
habit should be an explicit cast, because the same pattern at 24 or 32 bits shifts into the
sign bit and is undefined.</p>

<p><b>8. The address is hard-coded,</b> so the driver cannot serve two of the same device, and
there is no handle or context.</p>

<p><b>9. No timeout anywhere.</b> If the bus is stuck low this can block indefinitely.</p>`,
checklist: [
"A STOP between the write and read lets the device pointer move",
"Needs one combined transaction with a repeated START",
"The address may need shifting, and half the expected value is the tell",
"The 50 microsecond delay is a guess that fixes nothing",
"Neither call's return value is checked and the function always returns success",
"rx is uninitialised, so a failed read returns stack contents as data",
"The byte order is assumed rather than documented",
"The shift should cast explicitly as a habit",
"The address is hard-coded, so only one device is possible"
]
},

{
id: "d-spot-cal",
kind: "spot",
track: "Embedded C",
d: 2,
title: "Loading calibration at boot",
mins: 8,
brief: `<p>Runs at startup on a measurement instrument. Review it, and pay particular
attention to what happens when things are not normal.</p>`,
code: `typedef struct {
    int32_t offset;
    int32_t gain_q16;
} cal_t;

static cal_t cal;

void cal_load(void)
{
    memcpy(&amp;cal, (void *)CAL_ADDR, sizeof(cal));

    if (cal.gain_q16 == 0)
        cal.gain_q16 = 65536;       /* nominal */
}

int32_t apply_cal(int32_t raw)
{
    return ((raw - cal.offset) * cal.gain_q16) &gt;&gt; 16;
}`,
answer: `<p><b>1. No CRC on the stored record.</b> Corrupted coefficients load as plausible
numbers and the instrument reports wrong measurements that nobody can distinguish from
correct. On a measurement instrument this is the worst available failure mode.</p>

<p><b>2. Silently falling back to nominal.</b> The only validity check is gain being zero, and
when it fires the instrument quietly starts producing uncalibrated readings with nothing to
indicate it. That is how a product ships wrong data for a year. Refuse to operate, or run
nominal and report degraded, but never silently substitute.</p>

<p><b>3. Nothing distinguishes never calibrated from corrupted.</b> A blank flash sector reads
as 0xFFFFFFFF, which is a large negative offset and a huge gain, and passes the zero check
happily.</p>

<p><b>4. No format or version field.</b> Adding a coefficient later means every existing
device holds the old layout and new firmware misreads it.</p>

<p><b>5. No calibration date or equipment record.</b> That is what an auditor asks for, and it
is what tells you whether a unit predates a known problem when you are scoping a recall.</p>

<p><b>6. apply_cal overflows.</b> <code>(raw - cal.offset)</code> times a Q16.16 gain is a
64-bit quantity. With a gain near 1.0 the multiplier is 65536, so a raw value above about
32768 overflows a signed 32-bit multiply, which is undefined behaviour. It must widen to
int64_t before multiplying.</p>

<p><b>7. The shift truncates and biases.</b> A right shift rounds towards negative infinity,
so negative readings are biased down. Add half an LSB before shifting to round to
nearest.</p>

<p><b>8. Shifting a negative signed value right is implementation-defined,</b> which is worth
knowing even though every real compiler does an arithmetic shift.</p>

<p><b>9. Static state means one channel,</b> and no test can install a known calibration.</p>`,
checklist: [
"No CRC, so corrupted coefficients load as plausible values",
"Silently falls back to nominal instead of reporting degraded or refusing",
"Cannot distinguish never-calibrated from corrupted; blank flash passes the check",
"No format or version field",
"No calibration date or traceability record",
"apply_cal overflows: the multiply needs widening to 64 bits first",
"The right shift truncates and biases negative values downward",
"Right-shifting a negative signed value is implementation-defined",
"Static state means one channel and no testable starting condition"
]
},

// ============================================================ WRITE THE CODE

{
id: "d-write-fault",
kind: "write",
track: "Embedded C",
d: 3,
title: "A fault handler worth shipping",
mins: 15,
brief: `<p>Write a Cortex-M hard fault handler that captures enough to diagnose the fault from
the field.</p>
<ul>
<li>Find the stacked frame on whichever stack was in use</li>
<li>Capture the faulting PC, the stacked LR, and the fault status</li>
<li>Survive the reset so the next boot can report it</li>
</ul>
<p>Say what you would do with the captured data, and what else the build needs.</p>`,
code: "",
answer: `<pre>/* A region the linker places in RAM that startup does NOT zero. */
typedef struct {
    uint32_t magic;
    uint32_t pc, lr, psr;
    uint32_t cfsr, hfsr, faultaddr;
} crash_t;

__attribute__((section(".noinit"))) static crash_t crash;

#define CRASH_MAGIC 0xDEADBEEFu

/* The shim exists only to work out which stack the frame is on. */
__attribute__((naked)) void HardFault_Handler(void)
{
    __asm volatile (
        "tst   lr, #4          \\n"   /* bit 2 of EXC_RETURN: 0 = MSP, 1 = PSP */
        "ite   eq              \\n"
        "mrseq r0, msp         \\n"
        "mrsne r0, psp         \\n"
        "b     hard_fault_c    \\n"
    );
}

void hard_fault_c(uint32_t *frame)
{
    crash.magic = CRASH_MAGIC;
    crash.pc    = frame[6];        /* the faulting instruction */
    crash.lr    = frame[5];
    crash.psr   = frame[7];
    crash.cfsr  = SCB-&gt;CFSR;
    crash.hfsr  = SCB-&gt;HFSR;

    crash.faultaddr = 0;
    if (SCB-&gt;CFSR &amp; SCB_CFSR_BFARVALID_Msk) {
        crash.faultaddr = SCB-&gt;BFAR;      /* only when the valid bit says so */
    } else if (SCB-&gt;CFSR &amp; SCB_CFSR_MMARVALID_Msk) {
        crash.faultaddr = SCB-&gt;MMFAR;
    }

    NVIC_SystemReset();               /* reset deliberately, do not spin */
}

/* early in main, before anything clears it */
void crash_report_if_any(void)
{
    if (crash.magic == CRASH_MAGIC) {
        log_crash(&amp;crash);            /* to a UART, or a log in flash */
        crash.magic = 0;              /* consume it */
    }
}</pre>

<p><b>Why the shim.</b> The frame may be on MSP or PSP, and only EXC_RETURN in LR says which.
A plain C function cannot read LR reliably on entry, so the naked shim does that one thing and
hands the pointer to C.</p>

<p><b>Why frame[6].</b> The stacked order is R0, R1, R2, R3, R12, LR, PC, xPSR from low
address up, so PC is index 6.</p>

<p><b>Why the valid bits.</b> BFAR and MMFAR hold stale values from previous faults unless the
matching valid bit is set, and a stale address looks perfectly plausible.</p>

<p><b>Why reset rather than spin.</b> A spinning device is dead and reports nothing. Resetting
and reporting on the next boot turns a field lockup into evidence.</p>

<p><b>What else the build needs.</b> Enable the specific fault handlers in SHCSR during
development so you get MemManage or BusFault rather than an escalated HardFault, and check the
FORCED bit in HFSR. Archive the ELF for every release, because the PC is a bare number without
the symbols from that exact build, and decoding against a different build gives a confident
wrong answer. And no printf in the handler: if the fault was a stack overflow there is no
stack to format into.</p>`,
checklist: [
"Uses bit 2 of EXC_RETURN to choose between MSP and PSP",
"A naked assembly shim passes the frame pointer to a C function",
"Reads the faulting PC at index 6 of the stacked frame",
"Reads CFSR for the fault category",
"Only reads BFAR or MMFAR when the corresponding valid bit is set",
"Stores into a RAM region that startup does not zero",
"Resets deliberately rather than spinning forever",
"Reports on the next boot and consumes the record",
"Mentioned enabling the configurable fault handlers, or archiving the ELF",
"Avoided printf in the handler"
]
},

{
id: "d-write-regfield",
kind: "write",
track: "Embedded C",
d: 2,
title: "Safe register field accessors",
mins: 12,
brief: `<p>A peripheral's CTRL register at 0x40004000 has:</p>
<ul>
<li>bit 0: ENABLE</li>
<li>bits 6:4: MODE, a 3-bit field</li>
<li>bit 7: read-only STATUS</li>
</ul>
<p>Write the register definition and accessors for enable, disable, and set-mode. Nothing a
caller does should be able to corrupt a neighbouring field or the read-only bit.</p>`,
code: "",
answer: `<pre>#include &lt;stdint.h&gt;

#define CTRL           (*(volatile uint32_t *)0x40004000u)

#define CTRL_ENABLE    (1u &lt;&lt; 0)

#define CTRL_MODE_SHIFT   4u
#define CTRL_MODE_MASK    (7u &lt;&lt; CTRL_MODE_SHIFT)

typedef enum {
    MODE_IDLE = 0u, MODE_RUN = 1u, MODE_TEST = 2u, MODE_MAX = 3u
} mode_t;

static inline void ctrl_enable(void)
{
    CTRL |= CTRL_ENABLE;
}

static inline void ctrl_disable(void)
{
    CTRL &amp;= ~CTRL_ENABLE;
}

static inline int ctrl_set_mode(mode_t m)
{
    if ((uint32_t)m &gt; MODE_MAX) {
        return -1;                      /* reject rather than corrupt */
    }
    uint32_t v = CTRL;
    v &amp;= ~CTRL_MODE_MASK;                             /* clear the field  */
    v |= ((uint32_t)m &lt;&lt; CTRL_MODE_SHIFT) &amp; CTRL_MODE_MASK;   /* then set   */
    CTRL = v;
    return 0;
}</pre>

<p><b>volatile</b> because the peripheral changes it without your involvement, and without it
a read can be optimised away.</p>

<p><b>1u rather than 1</b> so that a shift into bit 31 is never undefined behaviour. Making it
a reflex means never having to notice which bit you are shifting to.</p>

<p><b>Clear then set</b> for the field. A bare OR can only turn bits on, so a field currently
holding 7 would stay 7 whatever mode you passed.</p>

<p><b>The mask on the value as well as the check.</b> Belt and braces: even if the range check
were removed, an out-of-range value is confined to the field rather than spilling into bit 7,
the read-only status bit, or beyond.</p>

<p><b>The read-only bit is protected</b> because the read-modify-write writes back whatever it
read there, and the mask never touches it.</p>

<p><b>What I would say about it.</b> This is a read-modify-write, so it is not atomic against
an interrupt that also touches CTRL, and if that is possible it needs a critical section or a
hardware set/clear register. It is also wrong on a read-to-clear or write-1-to-clear register,
which the datasheet's access column tells you. And I would add
<code>_Static_assert</code> on the offsets if this were part of a larger register map struct,
so a layout change breaks the build rather than producing wrong addresses.</p>`,
checklist: [
"The register pointer is volatile",
"Shifts use unsigned constants (1u) rather than signed",
"Named shift and mask constants rather than magic numbers",
"Clear-then-set for the field, since OR alone cannot clear",
"The value is masked as well as range checked",
"An out-of-range mode is rejected rather than written",
"The read-only bit is preserved by the read-modify-write and never masked",
"Noted the read-modify-write is not atomic against an interrupt",
"Noted this approach is wrong on read-to-clear or write-1-to-clear registers"
]
},

{
id: "d-write-nvs",
kind: "write",
track: "Embedded C",
d: 3,
title: "A settings store that survives power loss",
mins: 15,
brief: `<p>Design and write a settings store in one flash sector that:</p>
<ul>
<li>Survives a power cut at any moment, always yielding either the old or the new settings</li>
<li>Does not wear out the sector after a few thousand saves</li>
<li>Detects corruption</li>
</ul>
<p>Assume flash can only change 1 bits to 0, and erase is per sector. Explain the ordering.</p>`,
code: "",
answer: `<pre>#define REC_SIZE     32u                       /* padded to a flash write unit */
#define REC_COUNT    (SECTOR_SIZE / REC_SIZE)

typedef struct {
    uint32_t valid;        /* 0xFFFFFFFF = empty, 0x00000000 = committed */
    uint16_t version;
    uint16_t crc;
    settings_t s;
} record_t;                /* sizeof must be REC_SIZE */

/* Find the last committed record. Empty slots read as all 0xFF. */
static const record_t *find_latest(void)
{
    const record_t *base = (const record_t *)SECTOR_ADDR;
    const record_t *best = NULL;

    for (unsigned i = 0; i &lt; REC_COUNT; i++) {
        if (base[i].valid != 0x00000000u) {
            continue;                      /* empty or half-written */
        }
        if (base[i].crc != crc16((const uint8_t *)&amp;base[i].version,
                                 REC_SIZE - sizeof(uint32_t) - sizeof(uint16_t))) {
            continue;                      /* corrupt: skip, keep the older one */
        }
        best = &amp;base[i];                   /* later records win */
    }
    return best;
}

int settings_save(const settings_t *s)
{
    unsigned slot = next_free_slot();

    if (slot &gt;= REC_COUNT) {               /* sector full: compact */
        record_t keep;
        const record_t *cur = find_latest();
        if (cur) { keep = *cur; }
        if (flash_erase_sector(SECTOR_ADDR) != 0) return -1;
        if (cur) { write_record(0, &amp;keep.s); }   /* re-seed with the survivor */
        slot = cur ? 1u : 0u;
    }
    return write_record(slot, s);
}

static int write_record(unsigned slot, const settings_t *s)
{
    record_t r;
    memset(&amp;r, 0xFF, sizeof r);            /* deterministic padding */
    r.version = SETTINGS_VERSION;
    r.s       = *s;
    r.crc     = crc16((const uint8_t *)&amp;r.version,
                      REC_SIZE - sizeof(uint32_t) - sizeof(uint16_t));

    uintptr_t addr = SECTOR_ADDR + slot * REC_SIZE;

    /* body FIRST, with valid still erased ... */
    if (flash_write(addr + sizeof(uint32_t),
                    (const uint8_t *)&amp;r.version,
                    REC_SIZE - sizeof(uint32_t)) != 0) {
        return -1;
    }
    /* ... then the marker, which is what makes the record visible */
    uint32_t committed = 0x00000000u;
    return flash_write(addr, (const uint8_t *)&amp;committed, sizeof committed);
}</pre>

<p><b>The ordering is the whole design.</b> The body is written while the valid marker is
still erased, so a power cut mid-write leaves a record whose marker is not committed, and
find_latest skips it. The previous record is untouched and still valid. Only the final small
write to the marker makes the new record visible, and that write is atomic enough at flash
level to be either done or not.</p>

<p><b>Endurance.</b> Appending means one erase per REC_COUNT saves rather than one per save.
With a 2 kB sector and 32-byte records that is 64 saves per erase, so 100,000 erase cycles
becomes 6.4 million saves.</p>

<p><b>The CRC</b> covers everything except the marker itself, so corruption is detected and
that record is skipped rather than loaded as plausible values.</p>

<p><b>The version field</b> lets future firmware recognise an old layout rather than
misreading it.</p>

<p><b>The compaction step is the risky one,</b> because there is a genuine window during the
erase. The usual answer for a product that cannot tolerate it is two sectors, writing the
survivor into the second before erasing the first.</p>

<p><b>And in practice</b> I would reach for LittleFS or the vendor's NVS first, because these
failure modes are subtle and only show up in a fleet.</p>`,
checklist: [
"Appends records rather than erasing and rewriting each save",
"Erases only when the sector fills, giving a large endurance multiplier",
"Writes the record body before the validity marker",
"Explained that a half-written record is therefore invisible, not corrupt",
"A CRC over the record so corruption is detected and skipped",
"A version or format field",
"Handles the blank state (erased flash reads as 0xFF)",
"Acknowledged that compaction still has a window, and mentioned a two-sector scheme",
"Mentioned using an existing NVS or LittleFS in practice"
]
},

{
id: "d-write-fake",
kind: "write",
track: "Embedded C",
d: 3,
title: "A fake transport for driver tests",
mins: 14,
brief: `<p>You have a driver taking an injected transport:</p>
<pre>int  (*read) (void *ctx, uint8_t reg, uint8_t *buf, size_t len);
int  (*write)(void *ctx, uint8_t reg, const uint8_t *buf, size_t len);
void (*delay_ms)(void *ctx, uint32_t ms);</pre>
<p>Write a fake that lets a host test: preload register values, make a specific transfer fail,
and check what the driver wrote and in what order. Then write one test using it.</p>`,
code: "",
answer: `<pre>#define FAKE_REGS  256
#define FAKE_LOG   64

typedef struct {
    uint8_t regs[FAKE_REGS];        /* behaves like a real register file */

    int      fail_on_nth;           /* -1 = never; otherwise fail that transfer */
    int      fail_rc;
    unsigned transfers;

    struct { uint8_t reg; uint8_t val; } log[FAKE_LOG];   /* what was written */
    unsigned log_n;

    uint32_t virtual_ms;            /* time advances instantly */
} fake_t;

void fake_init(fake_t *f)
{
    memset(f, 0, sizeof *f);
    f-&gt;fail_on_nth = -1;
}

static int fake_read(void *ctx, uint8_t reg, uint8_t *buf, size_t len)
{
    fake_t *f = ctx;
    if ((int)f-&gt;transfers++ == f-&gt;fail_on_nth) return f-&gt;fail_rc;

    for (size_t i = 0; i &lt; len; i++) {
        buf[i] = f-&gt;regs[(uint8_t)(reg + i)];      /* wraps like a real device */
    }
    return 0;
}

static int fake_write(void *ctx, uint8_t reg, const uint8_t *buf, size_t len)
{
    fake_t *f = ctx;
    if ((int)f-&gt;transfers++ == f-&gt;fail_on_nth) return f-&gt;fail_rc;

    for (size_t i = 0; i &lt; len; i++) {
        f-&gt;regs[(uint8_t)(reg + i)] = buf[i];
        if (f-&gt;log_n &lt; FAKE_LOG) {                 /* spy: record order */
            f-&gt;log[f-&gt;log_n].reg = (uint8_t)(reg + i);
            f-&gt;log[f-&gt;log_n].val = buf[i];
            f-&gt;log_n++;
        }
    }
    return 0;
}

static void fake_delay(void *ctx, uint32_t ms)
{
    ((fake_t *)ctx)-&gt;virtual_ms += ms;             /* no real waiting */
}

void fake_bind(fake_t *f, sensor_io_t *io)
{
    io-&gt;read = fake_read; io-&gt;write = fake_write;
    io-&gt;delay_ms = fake_delay; io-&gt;ctx = f;
}

/* ---- a test that real hardware cannot perform ---- */
void test_init_rejects_wrong_chip_id(void)
{
    fake_t f; sensor_io_t io; sensor_dev_t *dev = NULL;

    fake_init(&amp;f);
    f.regs[REG_WHO_AM_I] = 0x00;          /* not the expected part */
    fake_bind(&amp;f, &amp;io);

    int rc = sensor_init(&amp;io, &amp;dev);

    TEST_ASSERT_EQUAL(SENSOR_ERR_WRONG_PART, rc);
    TEST_ASSERT_NULL(dev);                /* the header promises out is untouched */
}</pre>

<p><b>Why a fake and not a stub.</b> Init is a sequence where later steps depend on earlier
writes, particularly polling a self-clearing reset bit. A stub returning canned values cannot
model that; a register array can.</p>

<p><b>The spy log</b> is there because ordering is a property of the interaction rather than
of the final state. The register file ends up identical whichever order the writes arrived in,
so only the log can prove that CTRL1 was written after the reset completed.</p>

<p><b>The virtual clock</b> is why the delay is injected. A timeout test with a real delay
takes real seconds; here the whole suite runs in milliseconds and is deterministic.</p>

<p><b>fail_on_nth</b> is what makes error paths reachable at all. You cannot make a real
sensor NAK the third write, and those paths are exactly the ones that run when something is
wrong in the field.</p>

<p><b>The context pointer</b> is what allows two independent fakes in one test, which a
file-scope static would not.</p>`,
checklist: [
"A register array so reads reflect previous writes (a fake, not a stub)",
"State lives in a struct reached through ctx, so two instances are possible",
"A transfer counter and a fail-on-nth mechanism to reach error paths",
"A log of writes, so ordering can be asserted",
"Explained that ordering cannot be checked from final state alone",
"The delay advances a virtual clock instead of really waiting",
"Explained that this keeps timeout tests fast and deterministic",
"Wrote a test that real hardware could not perform",
"The test also asserts the out pointer is untouched on failure"
]
},

{
id: "d-write-scale",
kind: "write",
track: "Embedded C",
d: 1,
title: "Counts to millivolts, safely",
mins: 10,
brief: `<p>Write <code>int32_t adc_to_mv(uint16_t count, uint16_t vref_mv)</code> for a 12-bit
ADC.</p>
<p>It must be exact across the whole input range, must not overflow for any plausible
reference up to 5000 mV, and must not lose resolution. Say what you would test.</p>`,
code: "",
answer: `<pre>#define ADC_MAX  4095u          /* 12-bit full scale */

int32_t adc_to_mv(uint16_t count, uint16_t vref_mv)
{
    /* widen BEFORE multiplying, and multiply BEFORE dividing */
    uint32_t num = (uint32_t)count * (uint32_t)vref_mv;

    /* round to nearest rather than truncating towards zero */
    return (int32_t)((num + ADC_MAX / 2u) / ADC_MAX);
}</pre>

<p><b>Multiply before dividing.</b> <code>(count / 4095) * vref</code> performs an integer
division first, which for any count below 4095 gives zero and throws the whole measurement
away. That is the single most common version of this bug.</p>

<p><b>Widen before multiplying.</b> Both operands promote to <code>int</code>, and
4095 x 5000 is about 20.5 million, which does fit in a 32-bit int. So this particular case
survives without the cast. The cast is there because the pattern gets reused: a 16-bit ADC at
65535 x 5000 is 328 million, still fitting, but a 24-bit converter does not, and by then
nobody re-derives the arithmetic. Casting to <code>uint32_t</code> makes it correct by
construction rather than by luck, and it also removes any question about signed overflow being
undefined.</p>

<p><b>Rounding.</b> Integer division truncates, which biases every reading down by up to one
LSB. Adding half the divisor before dividing rounds to nearest and removes the systematic
error, which matters if the result is then averaged or integrated.</p>

<p><b>Divide by 4095, not 4096.</b> A 12-bit ADC reports full scale as 4095, and that reading
corresponds to the reference. Using 4096 introduces a small gain error that is easy to miss
and that shows up as a fixed percentage offset at the top of the range.</p>

<p><b>What I would test</b>, all on a host with no hardware:</p>
<ul>
<li>The endpoints: count 0 gives 0, count 4095 gives exactly vref_mv.</li>
<li>The midpoint: count 2048 with a 3300 mV reference gives 1651 with rounding, 1650 without,
which is a direct check that the rounding is doing something.</li>
<li>A sweep across all 4096 counts against a double-precision reference, asserting the error
is under half an LSB. That is the test that catches an overflow at one particular input.</li>
<li>The largest plausible reference, to confirm no intermediate overflows.</li>
</ul>`,
checklist: [
"Multiplies before dividing, and said why dividing first destroys the result",
"Widens to a 32-bit type before the multiply",
"Explained that the cast is about the pattern being reused, not just this case",
"Rounds to nearest by adding half the divisor",
"Explained that truncation biases every reading down",
"Divides by 4095 rather than 4096, and said why",
"Named the endpoint tests (0 and full scale)",
"Proposed a full sweep against a floating-point reference"
]
},

{
id: "d-write-mavg",
kind: "write",
track: "Embedded C",
d: 2,
title: "A moving average that kills mains hum",
mins: 12,
brief: `<p>Samples arrive at 1 kHz and carry 50 Hz interference. Write a moving average filter
that removes the hum, costs constant time per sample regardless of window length, and supports
several channels.</p>
<p>State the window length you chose and why.</p>`,
code: "",
answer: `<pre>/* 1 kHz sampling, 50 Hz interference -> one mains period is 20 samples.
 * A moving average of N has nulls at multiples of Fs/N, so N = 20 places a
 * null exactly on 50 Hz and on every harmonic of it. */
#define MAVG_N   20

typedef struct {
    int32_t  buf[MAVG_N];
    int32_t  sum;
    uint8_t  idx;
    uint8_t  filled;
} mavg_t;

void mavg_init(mavg_t *m)
{
    memset(m, 0, sizeof *m);
}

int32_t mavg_update(mavg_t *m, int32_t x)
{
    m-&gt;sum -= m-&gt;buf[m-&gt;idx];        /* remove the sample leaving the window */
    m-&gt;buf[m-&gt;idx] = x;
    m-&gt;sum += x;                     /* add the new one                      */

    m-&gt;idx++;
    if (m-&gt;idx &gt;= MAVG_N) {
        m-&gt;idx = 0;
    }
    if (m-&gt;filled &lt; MAVG_N) {
        m-&gt;filled++;                 /* do not divide by the full N yet      */
    }
    return m-&gt;sum / m-&gt;filled;
}</pre>

<p><b>Why 20 and not a power of two.</b> This is a real trade. A power of two makes the divide
a shift and the index wrap a mask, which is why 16 or 32 is the usual choice. But the whole
point here is to place a null on 50 Hz, and that requires N to be exactly one mains period,
which at 1 kHz is 20. Choosing 16 would leave the hum largely intact, so the arithmetic cost
is worth paying. If the division mattered, 20 is a compile-time constant so the compiler
turns it into a multiply and shift anyway.</p>

<p><b>Constant time.</b> The running sum means one subtract, one store and one add per sample
regardless of N. Re-summing the window every time would be O(N).</p>

<p><b>The fill-up behaviour.</b> Dividing by <code>filled</code> rather than N means the
output is a correct average from the very first sample, instead of ramping up from zero over
the first 20. Whether you want that is a decision: some systems prefer to report not-ready
until the window is full, which is also defensible and better if the consumer would act on an
early value.</p>

<p><b>Overflow.</b> The sum holds N samples, so it needs enough headroom: with 20 samples of a
signed 16-bit quantity an int32_t is comfortable. That should be checked rather than
assumed.</p>

<p><b>The property worth naming:</b> a moving average has exactly linear phase, delaying every
frequency by the same (N-1)/2 samples, so the waveform is shifted and not distorted. That
matters if two filtered signals are being compared. The cost is that same delay, which in a
control loop is spent phase margin.</p>`,
checklist: [
"Chose N to match one mains period (20 samples at 1 kHz)",
"Explained that a moving average has nulls at multiples of Fs/N",
"Used a running sum for constant time per sample regardless of N",
"Acknowledged the power-of-two trade and justified not taking it",
"State is per instance in a caller-supplied struct",
"Handled the initial fill-up rather than ramping from zero",
"Considered sum overflow headroom",
"Named the linear phase property and the (N-1)/2 delay",
"Noted the delay costs phase margin in a control loop"
]
},

{
id: "d-write-cal2",
kind: "write",
track: "Embedded C",
d: 2,
title: "Two-point calibration, end to end",
mins: 14,
brief: `<p>Write the calibration side of a measurement instrument:</p>
<ul>
<li>A record structure suitable for storing in flash</li>
<li>A function that computes offset and gain from two known reference points</li>
<li>A function that applies it to a raw reading</li>
<li>What happens at boot when the record is missing or corrupt</li>
</ul>`,
code: "",
answer: `<pre>#define CAL_FORMAT   1u
#define GAIN_Q       16                       /* Q16.16 */

typedef struct {
    uint16_t format;          /* so future firmware knows the layout */
    uint16_t crc;             /* over everything after this field    */
    uint32_t cal_unix_time;   /* traceability */
    uint32_t equipment_id;
    int32_t  offset_counts;
    int32_t  gain_q16;
} cal_rec_t;

typedef enum { CAL_FACTORY, CAL_NOMINAL_DEGRADED, CAL_NONE } cal_state_t;

static cal_rec_t  cal;
static cal_state_t cal_state = CAL_NONE;

/* --- compute, from two reference points --- */
int cal_compute(int32_t raw_lo, int32_t ref_lo,
                int32_t raw_hi, int32_t ref_hi, cal_rec_t *out)
{
    int32_t draw = raw_hi - raw_lo;
    if (draw == 0) {
        return -1;                            /* degenerate: reject */
    }
    /* gain = (ref_hi - ref_lo) / (raw_hi - raw_lo), in Q16.16 */
    int64_t g = ((int64_t)(ref_hi - ref_lo) &lt;&lt; GAIN_Q) / draw;
    if (g &lt;= 0 || g &gt; (int64_t)INT32_MAX) {
        return -1;                            /* implausible: reject */
    }
    out-&gt;gain_q16      = (int32_t)g;
    /* offset is the raw value that maps to ref_lo */
    out-&gt;offset_counts = raw_lo - (int32_t)(((int64_t)ref_lo &lt;&lt; GAIN_Q) / g);
    out-&gt;format        = CAL_FORMAT;
    return 0;
}

/* --- apply --- */
int32_t cal_apply(int32_t raw)
{
    int64_t v = (int64_t)(raw - cal.offset_counts) * cal.gain_q16;
    v += (1 &lt;&lt; (GAIN_Q - 1));                 /* round to nearest */
    return (int32_t)(v &gt;&gt; GAIN_Q);
}

/* --- boot --- */
cal_state_t cal_load(void)
{
    const cal_rec_t *f = (const cal_rec_t *)CAL_ADDR;

    if (f-&gt;format == 0xFFFFu) {               /* erased flash: never calibrated */
        cal_state = CAL_NONE;
    } else if (f-&gt;format != CAL_FORMAT) {
        cal_state = CAL_NONE;                 /* a layout we do not understand */
    } else if (f-&gt;crc != crc16((const uint8_t *)&amp;f-&gt;cal_unix_time,
                               sizeof(cal_rec_t) - 4u)) {
        cal_state = CAL_NONE;                 /* corrupt */
    } else {
        cal = *f;
        cal_state = CAL_FACTORY;
    }

    if (cal_state != CAL_FACTORY) {           /* explicit, never silent */
        cal.offset_counts = 0;
        cal.gain_q16      = 1 &lt;&lt; GAIN_Q;      /* unity */
        cal_state = CAL_NOMINAL_DEGRADED;
        report_degraded("calibration invalid");
    }
    return cal_state;
}</pre>

<p><b>The arithmetic.</b> Both the compute and the apply widen to 64 bits before multiplying
or shifting, because a Q16.16 gain multiplied by a raw count overflows 32 bits almost
immediately. The apply adds half an LSB before shifting, because a plain right shift truncates
towards negative infinity and biases negative readings down.</p>

<p><b>The record.</b> CRC so corruption is detected rather than loaded as plausible values.
Format so a future firmware recognises an old layout. Date and equipment because that is what
an auditor asks for, and because it tells you whether a unit predates a known problem when
scoping a recall.</p>

<p><b>The boot decision is the important part.</b> Three distinguishable states, and the
degraded one is <b>reported</b>. Silently substituting nominal values is how a product ships
wrong measurements for a year. Whether the right policy is to degrade or to refuse to operate
is a product decision: on an instrument where a wrong number is worse than no number, refusing
is correct.</p>

<p><b>Field zeroing goes in a separate record</b> so a user action can never overwrite the
traceable factory gain, and a firmware update must never discard the factory record.</p>`,
checklist: [
"A record with a CRC, a format version, and a calibration date",
"Two-point computation solving for both gain and offset",
"Rejects degenerate input (identical raw points) and implausible gains",
"Widens to 64 bits before multiplying or shifting in both compute and apply",
"Rounds to nearest rather than truncating",
"Distinguishes never-calibrated, corrupt, and valid at boot",
"Handles erased flash reading as 0xFF",
"Reports degraded rather than silently using nominal values",
"Mentioned keeping field calibration in a separate record from factory"
]
},

{
id: "d-write-sched",
kind: "write",
track: "Embedded C",
d: 3,
title: "A cooperative scheduler without an RTOS",
mins: 14,
brief: `<p>Write a small cooperative scheduler for a bare-metal system with no RTOS.</p>
<ul>
<li>Register periodic tasks with a period in milliseconds</li>
<li>Run them from the main loop, driven by a millisecond tick</li>
<li>Correct across a counter wrap, and no drift</li>
<li>Report if a task overruns its period</li>
</ul>`,
code: "",
answer: `<pre>#define MAX_TASKS 8

typedef struct {
    void     (*fn)(void);
    uint32_t period_ms;
    uint32_t next_due;
    uint32_t overruns;        /* visible degradation, not silent */
    uint32_t worst_us;        /* creeping regressions become observable */
} task_t;

static task_t   tasks[MAX_TASKS];
static unsigned task_n;

int sched_add(void (*fn)(void), uint32_t period_ms)
{
    if (fn == NULL || period_ms == 0u || task_n &gt;= MAX_TASKS) {
        return -1;
    }
    tasks[task_n].fn        = fn;
    tasks[task_n].period_ms = period_ms;
    tasks[task_n].next_due  = now_ms() + period_ms;
    task_n++;
    return 0;
}

void sched_run(void)
{
    for (;;) {
        bool ran = false;

        for (unsigned i = 0; i &lt; task_n; i++) {
            task_t *t = &amp;tasks[i];

            /* subtraction, so this stays correct across a counter wrap */
            if ((int32_t)(now_ms() - t-&gt;next_due) &gt;= 0) {

                uint32_t t0 = dwt_cycles();
                t-&gt;fn();
                uint32_t us = cycles_to_us(dwt_cycles() - t0);
                if (us &gt; t-&gt;worst_us) {
                    t-&gt;worst_us = us;
                }

                /* advance from the DUE time, not from now: no drift */
                t-&gt;next_due += t-&gt;period_ms;

                /* if we are already past the new due time, we overran */
                if ((int32_t)(now_ms() - t-&gt;next_due) &gt;= 0) {
                    t-&gt;overruns++;
                    t-&gt;next_due = now_ms() + t-&gt;period_ms;   /* resynchronise */
                }
                ran = true;
            }
        }

        if (!ran) {
            __WFI();          /* nothing due: sleep until the next interrupt */
        }
    }
}</pre>

<p><b>The wrap-safe comparison.</b> <code>(int32_t)(now - due) &gt;= 0</code> works across a
counter wrap because the unsigned subtraction is modular and the cast interprets the small
result as a signed difference. Writing <code>now &gt;= due</code> fails when the counter wraps
between scheduling and checking.</p>

<p><b>Advancing from due, not from now,</b> is what removes drift. Adding the period to
<code>now</code> accumulates the execution time of every invocation, so a 100 ms task slowly
becomes a 103 ms task.</p>

<p><b>The overrun check</b> catches the case where a task took longer than its own period.
Without the resynchronisation the scheduler would try to catch up by running it repeatedly,
which makes an overload worse rather than better.</p>

<p><b>__WFI when nothing is due</b> is most of the power saving available on a bare-metal
system, and it costs one line.</p>

<p><b>The honest limitations,</b> which I would state rather than let someone discover: it is
cooperative, so a task that blocks stalls everything and there is no preemption. All tasks
share one stack, which is a benefit in RAM terms. And there are no priorities, so if one task
genuinely has a tighter deadline than the others it belongs in an interrupt, or the system
wants a real RTOS.</p>`,
checklist: [
"Wrap-safe timing using a signed cast of an unsigned subtraction",
"Advances the due time from the previous due time, so there is no drift",
"Explained why adding the period to now accumulates drift",
"Detects and counts overruns rather than silently catching up",
"Resynchronises after an overrun instead of running repeatedly",
"Validates arguments on registration",
"Sleeps with WFI when nothing is due",
"Records worst-case execution time so regressions are visible",
"Stated the cooperative limitations: no preemption, one stack, no priorities"
]
},

{
id: "d-write-cobs",
kind: "write",
track: "Embedded C",
d: 3,
title: "Framing that resynchronises by itself",
mins: 13,
brief: `<p>A serial link keeps losing sync after corruption and never recovers until a
timeout. Design and write a framing scheme that resynchronises on its own, and explain why it
works.</p>
<p>You may assume a CRC already exists.</p>`,
code: "",
answer: `<p><b>The design.</b> Use a delimiter byte that cannot occur inside a payload, so a
receiver can always find a frame boundary by scanning forward. Zero is the conventional
choice, and COBS (Consistent Overhead Byte Stuffing) is the standard way to remove zeros from
arbitrary data with a small, bounded overhead.</p>

<pre>/* Encode: replace every zero with a pointer to the next zero.
 * Output contains no zero bytes, so a zero delimiter is unambiguous.
 * Overhead is exactly one byte per 254 bytes of payload, plus one. */
size_t cobs_encode(const uint8_t *in, size_t len, uint8_t *out, size_t cap)
{
    if (cap &lt; len + len / 254u + 2u) {
        return 0;                         /* refuse rather than overrun */
    }
    size_t  rd = 0, wr = 1;
    size_t  code_at = 0;                  /* where the current count lives */
    uint8_t code = 1;

    while (rd &lt; len) {
        if (in[rd] == 0u) {
            out[code_at] = code;          /* close this run */
            code_at = wr++;
            code = 1;
        } else {
            out[wr++] = in[rd];
            code++;
            if (code == 0xFFu) {          /* max run: close it early */
                out[code_at] = code;
                code_at = wr++;
                code = 1;
            }
        }
        rd++;
    }
    out[code_at] = code;
    out[wr++] = 0x00u;                    /* the delimiter */
    return wr;
}</pre>

<p><b>Why it resynchronises.</b> Because zero appears nowhere except as the delimiter, a
receiver that has lost its place simply reads bytes until it sees a zero, and it is then
guaranteed to be at a frame boundary. No timeout, no state to reset, and recovery costs at
most one frame.</p>

<p><b>Why a length prefix does not.</b> If a length byte is corrupted, the receiver consumes
the wrong number of bytes and every subsequent frame is misaligned. Nothing in the stream tells
it where the next frame starts, so it stays lost until an idle timeout, which is exactly the
symptom described.</p>

<p><b>The overhead is bounded and predictable:</b> one byte per 254 bytes of payload plus one,
which is under 0.4 per cent. That is the property that makes COBS preferable to escaping, where
a payload of all delimiter bytes doubles in size.</p>

<p><b>The full frame</b> is then payload plus CRC, COBS encoded, followed by the zero
delimiter. Encoding the CRC too means a corrupted delimiter cannot fake a frame boundary that
passes the check.</p>

<p><b>The receiver</b> becomes trivial: accumulate bytes until a zero, decode, verify the CRC,
and on any failure discard and carry on from the next byte. It cannot get stuck, which is the
whole point.</p>`,
checklist: [
"Chose a delimiter-based framing rather than a length prefix",
"Explained that a corrupted length leaves the receiver permanently misaligned",
"Named COBS or an equivalent zero-elimination encoding",
"Explained that the payload contains no delimiter byte, so a boundary is unambiguous",
"Recovery costs at most one frame and needs no timeout",
"Stated the bounded overhead and contrasted it with escaping",
"Included the CRC inside the encoded region",
"Checked the output capacity rather than assuming it",
"Described a receiver that cannot get stuck"
]
}

);
