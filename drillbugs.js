/* Per-bug line mappings for the spot-the-bug drills.
 *
 * Each entry: lines the fault lives on, a one-line title, why it matters, the
 * code as written, and the corrected version. Clicking a bug highlights those
 * lines in the code above.
 *
 * Line numbers are 1-based into the drill's `code` field and are checked
 * against it at load time, so a drill edit that shifts lines is caught rather
 * than silently pointing at the wrong place.
 */

const DRILL_BUGS = {

"d-spot-isr": [
{ lines: [4], t: "rx_len is not volatile",
  why: "Written by the ISR, read by the task. The compiler may cache it in a register, so the task spins on a stale value. Works at -O0, hangs at -O2.",
  bad: "static int     rx_len;",
  fix: "static volatile int rx_len;    /* the ISR writes it */" },

{ lines: [9], t: "No bounds check: the buffer overruns",
  why: "After 64 bytes the ISR writes past the end of rx_buf into whatever is next in memory. No error, and the corruption surfaces far from here.",
  bad: "rx_buf[rx_len++] = USART1-&gt;DR;",
  fix: "if (rx_len &lt; RX_SIZE) {\n    rx_buf[rx_len++] = USART1-&gt;DR;\n} else {\n    rx_overruns++;          /* count it, do not discard silently */\n    (void)USART1-&gt;DR;       /* still read, or the flag stays set */\n}" },

{ lines: [8], t: "Only RXNE is handled",
  why: "If the overrun flag is enabled and latches, the peripheral keeps asserting the interrupt. The handler finds RXNE clear, does nothing, and is re-entered immediately, forever.",
  bad: "if (USART1-&gt;SR &amp; USART_SR_RXNE) {",
  fix: "uint32_t sr = USART1-&gt;SR;\n\nif (sr &amp; USART_SR_ORE) {        /* handle every enabled condition */\n    rx_overruns++;\n    (void)USART1-&gt;DR;           /* read-to-clear the flag */\n}\nif (sr &amp; USART_SR_RXNE) {" },

{ lines: [15, 16, 17], t: "The read, copy and reset are not atomic",
  why: "The ISR can fire during the memcpy and write into the region being copied, so the message tears. And any byte arriving after rx_len was read is destroyed when it is set to zero.",
  bad: "int n = rx_len;\nmemcpy(dst, rx_buf, n);\nrx_len = 0;",
  fix: "/* patching this needs a critical section ... */\nuint32_t pri = __get_PRIMASK();\n__disable_irq();\nint n = rx_len;\nmemcpy(dst, rx_buf, n);\nrx_len = 0;\n__set_PRIMASK(pri);\n\n/* ... but the real fix is a ring buffer where the ISR\n   writes only head and the task writes only tail, so\n   no lock is needed at all. */" },

{ lines: [13, 16], t: "dst has no length parameter",
  why: "The function writes n bytes into a caller's buffer with no idea how big it is. A caller with a 16-byte buffer is overrun with no diagnostic.",
  bad: "int uart_get_message(uint8_t *dst)\n...\n    memcpy(dst, rx_buf, n);",
  fix: "int uart_get_message(uint8_t *dst, size_t cap)\n...\n    if ((size_t)n &gt; cap) n = (int)cap;   /* or return an error */\n    memcpy(dst, rx_buf, (size_t)n);" }
],

"d-spot-init": [
{ lines: [3, 4], t: "malloc is unchecked and dereferenced immediately",
  why: "If the allocation fails, line 4 writes through a null pointer. On most parts that is a fault at a very small address.",
  bad: "sensor_t *dev = malloc(sizeof(sensor_t));\ndev-&gt;io = io;",
  fix: "sensor_t *dev = calloc(1, sizeof(*dev));\nif (dev == NULL) {\n    return SENSOR_ERR_NO_MEM;\n}" },

{ lines: [4], t: "The transport is stored by pointer, not copied",
  why: "If the caller's sensor_io_t was on the stack, the driver is left holding a pointer into a frame that no longer exists.",
  bad: "dev-&gt;io = io;          /* dev->io is a pointer */",
  fix: "dev-&gt;io = *io;         /* dev->io is a value: copy it */" },

{ lines: [1], t: "No argument validation at an API boundary",
  why: "io, out and each function pointer inside io are all unchecked. A null read pointer faults deep inside the driver, where the cause is invisible.",
  bad: "int sensor_init(const sensor_io_t *io, sensor_t **out)\n{",
  fix: "int sensor_init(const sensor_io_t *io, sensor_t **out)\n{\n    if (io == NULL || out == NULL ||\n        io-&gt;read == NULL || io-&gt;write == NULL || io-&gt;delay_ms == NULL) {\n        return SENSOR_ERR_INVALID_ARG;\n    }" },

{ lines: [7, 8, 10, 11], t: "Every error is flattened to -1, and dev leaks",
  why: "A bus fault and a wrong chip ID become indistinguishable, and they send an engineer to different benches. Both returns also leak the allocation.",
  bad: "if (io-&gt;read(io-&gt;ctx, REG_WHO_AM_I, &amp;id, 1) != 0)\n    return -1;\n\nif (id != EXPECTED_ID)\n    return -1;",
  fix: "rc = dev-&gt;io.read(dev-&gt;io.ctx, REG_WHO_AM_I, &amp;id, 1);\nif (rc != 0) {\n    goto fail;                    /* propagate unchanged */\n}\nif (id != EXPECTED_ID) {\n    rc = SENSOR_ERR_WRONG_PART;   /* we know something it did not */\n    goto fail;\n}\n\n/* ... at the end of the function: */\nfail:\n    free(dev);\n    return rc;" },

{ lines: [13], t: "The write's return value is ignored",
  why: "Configuration can fail, and here it fails silently, leaving a device that reports success but is not configured.",
  bad: "io-&gt;write(io-&gt;ctx, REG_CTRL, &amp;cfg, 1);",
  fix: "rc = dev-&gt;io.write(dev-&gt;io.ctx, REG_CTRL, &amp;cfg, 1);\nif (rc != 0) {\n    goto fail;\n}" },

{ lines: [14], t: "A fixed delay instead of polling, called directly",
  why: "A datasheet maximum is a bound, not a duration. Polling is faster normally and correct if the part is slow. Calling delay_ms directly also puts a platform dependency inside the driver.",
  bad: "delay_ms(50);",
  fix: "for (unsigned tries = 0; ; tries++) {\n    uint8_t st;\n    rc = dev-&gt;io.read(dev-&gt;io.ctx, REG_CTRL, &amp;st, 1);\n    if (rc != 0) goto fail;\n    if ((st &amp; RESET_BIT) == 0) break;        /* ready */\n    if (tries &gt;= RESET_MAX_TRIES) {\n        rc = SENSOR_ERR_TIMEOUT;\n        goto fail;\n    }\n    dev-&gt;io.delay_ms(dev-&gt;io.ctx, 1);       /* injected, not global */\n}" }
],

"d-spot-ring": [
{ lines: [3, 10, 18], t: "count is read-modify-written by both sides",
  why: "This is the whole bug. count++ and count-- are each a load, a modify and a store. If the ISR fires between the task's load and store, the ISR's increment is overwritten and lost, so the count drifts away from reality.",
  bad: "static volatile int head, tail, count;\n...\n    count++;          /* in the ISR   */\n...\n    count--;          /* in the task  */",
  fix: "/* remove the shared variable entirely. Sacrifice one slot so\n   full and empty are distinguishable from head and tail alone. */\nstatic volatile uint8_t head, tail;    /* head: ISR only, tail: task only */\n\n#define RB_FULL()   (((head + 1u) &amp; (SIZE - 1u)) == tail)\n#define RB_EMPTY()  (head == tail)" },

{ lines: [3], t: "volatile does not make the sequence atomic",
  why: "volatile guarantees the accesses happen and are not reordered relative to each other. It says nothing about them being indivisible, which is the property actually needed here.",
  bad: "static volatile int head, tail, count;",
  fix: "/* volatile is necessary but not sufficient. The fix is structural:\n   give each index exactly one writer, so nothing is shared. */" },

{ lines: [9, 17], t: "Modulo is a division unless SIZE is a power of two",
  why: "A division in an interrupt handler costs tens of cycles on parts with no divide instruction. SIZE is 64 here, so a mask does the same job in one cycle.",
  bad: "head = (head + 1) % SIZE;\n...\ntail = (tail + 1) % SIZE;",
  fix: "head = (uint8_t)((head + 1u) &amp; (SIZE - 1u));\n...\ntail = (uint8_t)((tail + 1u) &amp; (SIZE - 1u));" },

{ lines: [3], t: "The indices are signed",
  why: "Signed overflow is undefined behaviour. It does not bite with a modulo, but it does the moment anyone moves to free-running counters, which is the usual next step.",
  bad: "static volatile int head, tail, count;",
  fix: "static volatile uint8_t head, tail;" }
],

"d-spot-regs": [
{ lines: [1, 2, 3, 4], t: "None of the registers are volatile",
  why: "The poll on line 10 has nothing in its body that the compiler believes can change SR, so at -O2 it reads once and branches to itself forever. Classic works-in-debug, hangs-in-release.",
  bad: "#define CR   (*(uint32_t *)0x40004000)",
  fix: "#define CR   (*(volatile uint32_t *)0x40004000)\n#define SR   (*(volatile uint32_t *)0x40004004)\n#define ICR  (*(volatile uint32_t *)0x40004008)\n#define DR   (*(volatile uint32_t *)0x4000400C)" },

{ lines: [10], t: "SR is read-to-clear, so polling it destroys flags",
  why: "Each read clears the flags. Any other condition that had latched is lost, and if the ready bit itself is read-to-clear the loop can consume its own exit condition.",
  bad: "while (!(SR &amp; 0x01)) { }",
  fix: "/* read once per iteration and keep the value */\nuint32_t sr;\ndo {\n    sr = SR;                       /* one read, all flags captured */\n    if (sr &amp; ERR_FLAGS) return -EIO;\n} while (!(sr &amp; 0x01) &amp;&amp; !timed_out());" },

{ lines: [10], t: "The wait is unbounded",
  why: "If the device never becomes ready this hangs with no diagnostic. Every wait needs a timeout so the failure becomes a returned error the caller or the watchdog can act on.",
  bad: "while (!(SR &amp; 0x01)) { }",
  fix: "uint32_t t0 = now_ms();\nwhile (!(SR &amp; 0x01)) {\n    if ((uint32_t)(now_ms() - t0) &gt; READY_TIMEOUT_MS) {\n        return -ETIMEDOUT;\n    }\n}" },

{ lines: [12], t: "Read-modify-write on a write-1-to-clear register",
  why: "The read picks up every pending flag, the OR adds bit 3, and the write puts it all back, clearing every one of them. You have silently acknowledged interrupts nothing handled.",
  bad: "ICR |= (1 &lt;&lt; 3);",
  fix: "ICR = (1u &lt;&lt; 3);       /* write only the bit you mean; no read */" },

{ lines: [14], t: "A field is ORed rather than cleared then set, and mode is unmasked",
  why: "OR can only turn bits on, so a field currently holding 7 stays 7 whatever mode you pass. And an out-of-range mode spills into bit 7, which belongs to something else.",
  bad: "CR |= (mode &lt;&lt; 4);",
  fix: "CR = (CR &amp; ~(7u &lt;&lt; 4)) | ((mode &amp; 7u) &lt;&lt; 4);" },

{ lines: [8, 12, 14], t: "Shifts use a signed 1",
  why: "Shifting a signed value into or past the sign bit is undefined behaviour. It costs one character to remove the whole class.",
  bad: "CR |= (1 &lt;&lt; 0);",
  fix: "CR |= (1u &lt;&lt; 0);" }
],

"d-spot-fixed": [
{ lines: [7], t: "The filter stalls and never converges",
  why: "Once (mv - filtered) is smaller than 16, the shift truncates to zero, the increment is nothing, and the output sticks permanently below the input. This is the drift.",
  bad: "filtered += (mv - filtered) &gt;&gt; 4;",
  fix: "/* keep the state scaled up by 2^K, shift only on output */\nstatic int32_t acc;\n\nacc += mv - (acc &gt;&gt; 4);\nreturn acc &gt;&gt; 4;" },

{ lines: [7], t: "Truncation biases the result downward",
  why: "A right shift rounds towards negative infinity, so negative differences round away from zero while positive ones round towards it. That is the 'drifts low' symptom.",
  bad: "filtered += (mv - filtered) &gt;&gt; 4;",
  fix: "/* the accumulator form above keeps the residue instead of\n   discarding it each sample, which removes the bias too */" },

{ lines: [5], t: "The multiply can overflow",
  why: "count * vref_mv promotes both to int. It happens to fit for a 12-bit count and a 3300 mV reference, and it does not for a 16-bit ADC or a larger reference.",
  bad: "int32_t mv = (count * vref_mv) / 4095;",
  fix: "int32_t mv = (int32_t)(((int64_t)count * vref_mv + 2047) / 4095);\n/*             widen first ^^^^^^^^^        round ^^^^^^      */" },

{ lines: [1], t: "filtered is never initialised",
  why: "The first call filters from zero, so the output takes about sixteen samples to arrive anywhere near the truth.",
  bad: "static int32_t filtered;",
  fix: "static int32_t acc;\nstatic bool    primed;\n\nif (!primed) { acc = mv &lt;&lt; 4; primed = true; return mv; }" },

{ lines: [1], t: "Static state means exactly one instance",
  why: "Two channels through this function share the filter and corrupt each other's results, and no test can establish a starting state.",
  bad: "static int32_t filtered;",
  fix: "typedef struct { int32_t acc; bool primed; } filt_t;\n\nint32_t read_mv(filt_t *f, uint16_t count, uint16_t vref_mv)" }
],

"d-spot-rtos": [
{ lines: [3, 4, 6], t: "&channel points into a frame that is released",
  why: "When start_sensors returns, that stack memory belongs to whatever runs next. Both tasks then read whatever is there.",
  bad: "int channel = 0;\nxTaskCreate(sensor_task, \"s0\", 256, &amp;channel, 5, NULL);",
  fix: "/* pass the value itself through the void pointer */\nxTaskCreate(sensor_task, \"s0\", 256, (void *)(uintptr_t)0, 5, NULL);\nxTaskCreate(sensor_task, \"s1\", 256, (void *)(uintptr_t)1, 5, NULL);\n\n/* and in the task: */\nint ch = (int)(uintptr_t)arg;" },

{ lines: [4, 5, 6], t: "Both tasks are given the same address",
  why: "Line 5 overwrites channel before the second task has read it, so whichever runs first may see 1 for both. A race on top of a lifetime bug.",
  bad: "xTaskCreate(sensor_task, \"s0\", 256, &amp;channel, 5, NULL);\nchannel = 1;\nxTaskCreate(sensor_task, \"s1\", 256, &amp;channel, 5, NULL);",
  fix: "/* two separate values, or pass by value as above */\nstatic int ch0 = 0, ch1 = 1;\nxTaskCreate(sensor_task, \"s0\", 256, &amp;ch0, 5, NULL);\nxTaskCreate(sensor_task, \"s1\", 256, &amp;ch1, 5, NULL);" },

{ lines: [13, 14], t: "The register select and read are separate transactions",
  why: "Between them the other task can address the same bus and move the device's internal pointer. Both transactions are individually correct and the data is still wrong.",
  bad: "i2c_write(addr[ch], REG_SELECT, ch);\nint v = i2c_read(addr[ch], REG_DATA);",
  fix: "/* one combined transaction with a repeated START */\nint v;\nint rc = i2c_write_read(addr[ch], REG_SELECT, &amp;v, sizeof v);\n\n/* better still: one task owns the bus and publishes to a queue,\n   which removes the shared state rather than protecting it */" },

{ lines: [4, 6], t: "xTaskCreate's return value is unchecked",
  why: "It returns a failure if the heap cannot supply the stack, and then the task simply does not exist with nothing to indicate it.",
  bad: "xTaskCreate(sensor_task, \"s0\", 256, &amp;channel, 5, NULL);",
  fix: "if (xTaskCreate(sensor_task, \"s0\", 256, arg, 5, NULL) != pdPASS) {\n    fatal(\"sensor task creation failed\");\n}" },

{ lines: [16], t: "vTaskDelay takes ticks, and drifts",
  why: "10 is ticks, not milliseconds, so the period silently changes with the tick rate. And vTaskDelay measures from the moment of the call, so execution time accumulates into drift.",
  bad: "vTaskDelay(10);",
  fix: "TickType_t last = xTaskGetTickCount();\nfor (;;) {\n    ...\n    vTaskDelayUntil(&amp;last, pdMS_TO_TICKS(10));   /* fixed period */\n}" },

{ lines: [14, 15], t: "A bus error is published as data",
  why: "i2c_read returns an int that is also a valid reading, so a failed transfer becomes a measurement nobody can distinguish from a real one.",
  bad: "int v = i2c_read(addr[ch], REG_DATA);\npublish(ch, v);",
  fix: "int v;\nif (i2c_read(addr[ch], REG_DATA, &amp;v) == 0) {\n    publish(ch, v);\n} else {\n    publish_fault(ch);       /* status separate from value */\n}" }
],

"d-spot-parse": [
{ lines: [3, 5], t: "in_len is passed and never used",
  why: "This is the root fault: the function is handed the buffer's length and ignores it, so every access below is unchecked. Line 5 reads in[0] before confirming a byte exists.",
  bad: "int parse_frame(uint8_t *in, int in_len, uint8_t *payload)\n{\n    if (in[0] != 0xAA)",
  fix: "int parse_frame(const uint8_t *in, size_t in_len,\n                uint8_t *payload, size_t payload_cap)\n{\n    if (in == NULL || in_len &lt; 2) {\n        return -1;                /* not enough for a header */\n    }\n    if (in[0] != 0xAA) {\n        return -1;\n    }" },

{ lines: [8, 10], t: "The length comes off the wire and is not validated",
  why: "len can be 255. The memcpy reads that many bytes from in without checking in_len, and writes them into payload without knowing its size.",
  bad: "int len = in[1];\n\nmemcpy(payload, &amp;in[2], len);",
  fix: "size_t len = in[1];\n\nif (len &gt; payload_cap) {\n    return -1;                        /* would overrun the caller */\n}\nif (in_len &lt; 2 + len + 2) {\n    return -1;                        /* frame is not all here */\n}" },

{ lines: [3, 10], t: "payload has no capacity parameter",
  why: "The signature makes it impossible for the function to be safe, however carefully the body is written.",
  bad: "int parse_frame(uint8_t *in, int in_len, uint8_t *payload)",
  fix: "int parse_frame(const uint8_t *in, size_t in_len,\n                uint8_t *payload, size_t payload_cap)" },

{ lines: [12], t: "The CRC bytes are read past the end",
  why: "Same root cause: in[2 + len] and in[3 + len] are indexed without ever checking that in_len reaches that far.",
  bad: "uint16_t crc = in[2 + len] | (in[3 + len] &lt;&lt; 8);",
  fix: "/* only reached after the in_len check above */\nuint16_t crc = (uint16_t)(in[2 + len] | ((uint16_t)in[3 + len] &lt;&lt; 8));" },

{ lines: [10, 13], t: "The CRC is verified after the copy",
  why: "Data is committed to the caller's buffer before it has been validated. Validate first, copy second.",
  bad: "memcpy(payload, &amp;in[2], len);\n\nuint16_t crc = ...;\nif (crc != crc16(&amp;in[2], len))\n    return -1;",
  fix: "if (crc != crc16(&amp;in[2], len)) {\n    return -1;                     /* reject before copying */\n}\nmemcpy(payload, &amp;in[2], len);      /* only now */" },

{ lines: [12], t: "The shift promotes to int",
  why: "Correct here because the value is small, but the habit should be an explicit cast: the same pattern at 24 bits shifts into the sign bit and is undefined.",
  bad: "(in[3 + len] &lt;&lt; 8)",
  fix: "((uint16_t)in[3 + len] &lt;&lt; 8)" }
],

"d-spot-fsm": [
{ lines: [15], t: "The timeout breaks across a counter wrap",
  why: "This is the once-a-day hang. When start is near the top of the range, start + TIMEOUT_MS wraps to a small number, and the comparison either fires immediately or never fires at all.",
  bad: "if (state == BUSY &amp;&amp; now_ms() &gt; start + TIMEOUT_MS) {",
  fix: "if (state == BUSY &amp;&amp; (uint32_t)(now_ms() - start) &gt; TIMEOUT_MS) {\n/*                     subtraction, not addition ^^^^^^^^^^^^^^ */" },

{ lines: [6, 11, 15], t: "Sequential ifs let one event cause two transitions",
  why: "The first if can set state to BUSY, and the second if then evaluates in the same call and can act on it. They should be mutually exclusive.",
  bad: "if (state == IDLE &amp;&amp; ev == EV_START) { ... }\nif (state == BUSY &amp;&amp; ev == EV_DONE)  { ... }\nif (state == BUSY &amp;&amp; ...)             { ... }",
  fix: "switch (state) {\ncase ST_IDLE:\n    if (ev == EV_START) { ... }\n    break;\ncase ST_BUSY:\n    if (ev == EV_DONE) { ... }\n    else if ((uint32_t)(now_ms() - start) &gt; TIMEOUT_MS) { ... }\n    break;\ndefault:\n    state = ST_FAULT;      /* an impossible value is a fault */\n    break;\n}" },

{ lines: [1], t: "state is a plain int, not an enum",
  why: "Any integer is assignable, and the compiler cannot warn about an unhandled case. There is also no default handling for a corrupted value.",
  bad: "static int state = IDLE;",
  fix: "typedef enum { ST_IDLE, ST_BUSY, ST_FAULT } state_t;\nstatic state_t state = ST_IDLE;" },

{ lines: [16], t: "There is no way out of FAULT",
  why: "Once there, no transition returns to IDLE, so the device stays faulted until reset with nothing to say why.",
  bad: "state = FAULT;",
  fix: "fault_reason = FAULT_MEASURE_TIMEOUT;   /* record why */\nfault_count++;                          /* and how often */\nstate = ST_FAULT;\n\n/* plus a transition out: */\ncase ST_FAULT:\n    if (ev == EV_RESET) { state = ST_IDLE; }\n    break;" },

{ lines: [1, 2], t: "Static state means one instance and no testable start",
  why: "There can only ever be one of these, and no test can establish a starting state before feeding it events.",
  bad: "static int state = IDLE;\nstatic uint32_t start;",
  fix: "typedef struct { state_t state; uint32_t start; } fsm_t;\n\nvoid tick(fsm_t *m, int ev)" }
],

"d-spot-fault": [
{ lines: [3], t: "printf in a fault handler",
  why: "Slow, stack-hungry, usually non-reentrant and typically blocking. If the fault was a stack overflow there is no stack left to format into, so the handler faults inside the fault handler.",
  bad: "printf(\"hard fault!\\n\");",
  fix: "/* capture, do not format. No calls that allocate or block. */\ncrash.pc   = frame[6];      /* the faulting instruction */\ncrash.lr   = frame[5];\ncrash.cfsr = SCB-&gt;CFSR;" },

{ lines: [1, 2], t: "Nothing about the fault is captured",
  why: "The stacked PC, the stacked LR and CFSR are all available and none is read. Without the PC you have no idea which instruction faulted.",
  bad: "void HardFault_Handler(void)\n{",
  fix: "__attribute__((naked)) void HardFault_Handler(void)\n{\n    __asm volatile (\n        \"tst   lr, #4       \\n\"   /* which stack holds the frame? */\n        \"ite   eq           \\n\"\n        \"mrseq r0, msp      \\n\"\n        \"mrsne r0, psp      \\n\"\n        \"b     hard_fault_c \\n\");\n}" },

{ lines: [4], t: "Spinning forever is the wrong action for a product",
  why: "The device is dead until someone power-cycles it, and it tells nobody anything. Record what happened and reset deliberately so the next boot can report it.",
  bad: "while (1) { }",
  fix: "crash.magic = CRASH_MAGIC;      /* in RAM that survives reset */\nNVIC_SystemReset();" },

{ lines: [9, 10], t: "The specific fault handlers are never enabled",
  why: "MemManage, BusFault and UsageFault default to disabled, so everything escalates to HardFault and you lose the specific cause.",
  bad: "clocks_init();\nperipherals_init();",
  fix: "clocks_init();\nSCB-&gt;SHCSR |= SCB_SHCSR_MEMFAULTENA_Msk\n            | SCB_SHCSR_BUSFAULTENA_Msk\n            | SCB_SHCSR_USGFAULTENA_Msk;\nperipherals_init();" },

{ lines: [7, 8], t: "No reset reason is logged at boot",
  why: "A watchdog reset, a brownout and a fault all look identical to whoever is supporting it. One register read distinguishes them.",
  bad: "void main(void)\n{",
  fix: "void main(void)\n{\n    log_reset_reason(RCC-&gt;CSR);   /* why did we restart? */\n    crash_report_if_any();        /* was it a fault? */\n    RCC-&gt;CSR |= RCC_CSR_RMVF;     /* clear for next time */" }
],

"d-spot-dma": [
{ lines: [1, 16], t: "dma_done is not volatile",
  why: "The poll loop has nothing in its body that the compiler believes can change it, so at -O2 it reads once and spins forever.",
  bad: "static int dma_done;\n...\nwhile (!dma_done) { }",
  fix: "static volatile int dma_done;" },

{ lines: [11], t: "The DMA target is a local",
  why: "It survives here only because the function waits. Make this asynchronous and the controller is writing into a stack frame that belongs to something else.",
  bad: "uint16_t buf[256];",
  fix: "/* static, aligned to a cache line, and padded to a whole number\n   of lines so an invalidate cannot clobber a neighbour */\nstatic __attribute__((aligned(32))) uint16_t buf[256];" },

{ lines: [18], t: "No cache invalidate: this is the M7 difference",
  why: "Cortex-M4 has no data cache so the CPU and DMA see the same memory. Cortex-M7 does, so the CPU may hold stale lines and the memcpy reads old data.",
  bad: "memcpy(out, buf, n * sizeof(uint16_t));",
  fix: "SCB_InvalidateDCache_by_Addr((uint32_t *)buf, sizeof buf);\nmemcpy(out, buf, (size_t)n * sizeof(uint16_t));" },

{ lines: [16], t: "No memory barrier after the flag test",
  why: "Even with volatile, nothing stops the buffer access being reordered against the flag check on a core that reorders.",
  bad: "while (!dma_done) { }",
  fix: "while (!dma_done) { }\n__DMB();                 /* order the flag test against the reads */" },

{ lines: [9, 11, 14], t: "n is never validated against the buffer",
  why: "buf holds 256 entries and n comes from the caller, so n = 1000 overruns the stack.",
  bad: "int read_block(uint16_t *out, int n)\n...\n    uint16_t buf[256];",
  fix: "int read_block(uint16_t *out, size_t n)\n{\n    if (out == NULL || n &gt; (sizeof buf / sizeof buf[0])) {\n        return -EINVAL;\n    }" },

{ lines: [16, 19], t: "The wait is unbounded and errors are never checked",
  why: "If the transfer never completes this hangs. DMA transfer-error and FIFO-error flags exist and are ignored, and the function always returns 0.",
  bad: "while (!dma_done) { }\n...\nreturn 0;",
  fix: "uint32_t t0 = now_ms();\nwhile (!dma_done) {\n    if (dma_error)                    return -EIO;\n    if ((uint32_t)(now_ms() - t0) &gt; DMA_TIMEOUT_MS) return -ETIMEDOUT;\n}" }
],

"d-spot-flash": [
{ lines: [10], t: "Erasing on every save wears the sector out",
  why: "Endurance is typically 10,000 to 100,000 erase cycles per sector. At a few erases a minute you reach 100,000 in weeks, and the product fails while the rest of the flash is untouched.",
  bad: "flash_erase_sector(SETTINGS_SECTOR);",
  fix: "/* append a record instead; erase only when the sector fills */\nunsigned slot = next_free_slot();\nif (slot &gt;= REC_COUNT) {\n    compact();          /* the only place an erase happens */\n    slot = 0;\n}" },

{ lines: [10, 11], t: "A power cut between erase and write loses everything",
  why: "Between the erase completing and the write completing, neither the old settings nor the new ones exist.",
  bad: "flash_erase_sector(SETTINGS_SECTOR);\nflash_write(SETTINGS_ADDR, (uint8_t *)s, sizeof(settings_t));",
  fix: "/* write the body first, with the validity marker still erased,\n   then the marker last: a half-written record is invisible */\nflash_write(addr + 4, body, REC_SIZE - 4);\nuint32_t committed = 0x00000000u;\nflash_write(addr, &amp;committed, 4);      /* this makes it visible */" },

{ lines: [1, 5, 11], t: "No CRC, no version, and padding is written raw",
  why: "Corrupted settings load as plausible values. Adding a field breaks every device in the field. And there is padding after offset whose contents are unspecified, so identical settings can produce different bytes.",
  bad: "typedef struct {\n    uint32_t sample_rate;\n    int16_t  offset;\n    char     name[16];\n} settings_t;",
  fix: "typedef struct {\n    uint32_t valid;        /* written last */\n    uint16_t format;       /* so future firmware knows the layout */\n    uint16_t crc;          /* over everything after this */\n    uint32_t sample_rate;\n    int16_t  offset;\n    int16_t  _pad;         /* explicit, so it is deterministic */\n    char     name[16];\n} settings_rec_t;" },

{ lines: [17], t: "settings_load never validates anything",
  why: "On a blank sector it returns 0xFF everywhere, which becomes a sample rate of 4294967295 and a name with no terminator.",
  bad: "memcpy(s, (void *)SETTINGS_ADDR, sizeof(settings_t));",
  fix: "const settings_rec_t *r = find_latest();\nif (r == NULL || r-&gt;crc != crc16(...)) {\n    *s = SETTINGS_DEFAULTS;\n    return SETTINGS_DEFAULTED;      /* report it, never silent */\n}\n*s = r-&gt;data;\nreturn SETTINGS_OK;" },

{ lines: [4], t: "name may not be null-terminated",
  why: "16 characters of data fill it completely, and any string function then runs off the end.",
  bad: "char     name[16];",
  fix: "char     name[16];      /* and on load: */\ns-&gt;name[sizeof s-&gt;name - 1] = '\\0';" },

{ lines: [7, 15], t: "Neither function can report a failure",
  why: "Flash operations fail, particularly on a worn sector, and both signatures return void. They also stall code running from flash, which affects interrupt latency.",
  bad: "void settings_save(settings_t *s)\n...\nvoid settings_load(settings_t *s)",
  fix: "int settings_save(const settings_t *s);   /* 0 or a negative error */\nint settings_load(settings_t *s);" }
],

"d-spot-boot": [
{ lines: [5], t: "The entry address is even, so the Thumb bit is clear",
  why: "This is the immediate fault. Cortex-M executes only Thumb, and bit 0 of a branch target must be 1 to say so. The result is a UsageFault with INVSTATE set.",
  bad: "void (*app)(void) = (void (*)(void))(APP_BASE + 0x200);",
  fix: "/* read the reset vector: that word already has bit 0 set */\nuint32_t sp    = *(volatile uint32_t *)(APP_BASE);\nuint32_t entry = *(volatile uint32_t *)(APP_BASE + 4);\nvoid (*app)(void) = (void (*)(void))entry;" },

{ lines: [5], t: "The application's stack pointer is never set",
  why: "The first word of the application's vector table is its initial MSP. Without loading it, the application runs on whatever stack the bootloader left behind.",
  bad: "/* nothing sets MSP */",
  fix: "__set_MSP(sp);          /* from the first word of the app's table */" },

{ lines: [7, 8], t: "VTOR is never set",
  why: "The vector table offset still points at the bootloader's table, so every interrupt in the application dispatches into the bootloader's handlers. The faults appear much later and look unrelated.",
  bad: "__disable_irq();\napp();",
  fix: "SCB-&gt;VTOR = APP_BASE;\n__DSB();                /* the write has landed   */\n__ISB();                /* refetch with it in effect */" },

{ lines: [7], t: "Interrupts are disabled and never re-enabled",
  why: "The application expects to start with interrupts enabled. Pending NVIC interrupts also need clearing first, or one fires the instant they are enabled, into a handler that is not ready.",
  bad: "__disable_irq();",
  fix: "__disable_irq();\nfor (int i = 0; i &lt; 8; i++) {\n    NVIC-&gt;ICER[i] = 0xFFFFFFFFu;      /* disable all */\n    NVIC-&gt;ICPR[i] = 0xFFFFFFFFu;      /* clear pending */\n}\n/* ... set MSP and VTOR ... */\n__enable_irq();                       /* immediately before the branch */" },

{ lines: [3, 4], t: "Peripherals are left in the bootloader's state",
  why: "The application initialises from whatever it inherits, so a peripheral still running, a clock still at the bootloader's setting or a DMA still armed misbehaves in ways that look like application bugs.",
  bad: "void jump_to_app(void)\n{",
  fix: "void jump_to_app(void)\n{\n    deinit_peripherals();      /* stop DMA, disable timers, uarts */\n    clocks_reset_to_default(); /* leave a documented clock state */" }
],

"d-spot-motor": [
{ lines: [10], t: "duty is unsigned and the expression can be negative",
  why: "This is the slam to full speed. When the motor overshoots, the error goes negative, the expression goes negative, and converting to uint16_t wraps it to near 65535. The timer accepts it.",
  bad: "uint16_t duty = (Kp * error + Ki * integral) / 256;",
  fix: "int32_t u = (Kp * error + Ki * integral) / 256;\n\nif (u &lt; 0)         u = 0;\nif (u &gt; PWM_PERIOD) u = PWM_PERIOD;\n\nuint16_t duty = (uint16_t)u;" },

{ lines: [8], t: "The integral has no anti-windup and can overflow",
  why: "While the output is saturated the integral keeps accumulating, so when the error reverses the controller stays saturated for a long time. It is also an int accumulating every millisecond forever.",
  bad: "integral += error;",
  fix: "/* only integrate when the output is not saturated */\nif (!saturated) {\n    integral += error;\n    if (integral &gt;  INTEGRAL_MAX) integral =  INTEGRAL_MAX;\n    if (integral &lt; -INTEGRAL_MAX) integral = -INTEGRAL_MAX;\n}" },

{ lines: [12], t: "No preload on the compare register",
  why: "Writing CCR1 directly can change the threshold after the counter has passed the old value, producing one cycle of the wrong width. On a motor that is a current spike.",
  bad: "TIM1-&gt;CCR1 = duty;",
  fix: "/* once, at init: */\nTIM1-&gt;CCMR1 |= TIM_CCMR1_OC1PE;    /* buffer CCR1 writes */\nTIM1-&gt;CR1   |= TIM_CR1_ARPE;\n\n/* then this write takes effect at the next update event */\nTIM1-&gt;CCR1 = duty;" },

{ lines: [5], t: "read_speed has no failure path",
  why: "If the encoder or sensor fails, whatever it returns is treated as a measurement and fed straight into the loop.",
  bad: "int measured = read_speed();",
  fix: "int measured;\nif (read_speed(&amp;measured) != 0) {\n    safe_state();          /* fail to stopped */\n    return;\n}" },

{ lines: [1], t: "Static state means one motor, and no safe state exists",
  why: "This cannot control two motors and no test can set a starting condition. Nothing brings the output to zero if the loop stops being called or the measurement is nonsense.",
  bad: "static int integral;",
  fix: "typedef struct {\n    int32_t integral;\n    bool    healthy;\n} pid_t;\n\nvoid control_tick(pid_t *c);" }
],

"d-spot-header": [
{ lines: [4], t: "MAX has no parentheses at all",
  why: "MAX(x, y) * 2 expands to x > y ? x : y * 2, because the conditional operator has very low precedence.",
  bad: "#define MAX(a,b)      a &gt; b ? a : b",
  fix: "/* parenthesise every parameter AND the whole body */\n#define MAX(a,b)      (((a) &gt; (b)) ? (a) : (b))\n\n/* better still, a function: evaluates each argument once */\nstatic inline int imax(int a, int b) { return a &gt; b ? a : b; }" },

{ lines: [4, 5], t: "MAX and ABS evaluate their arguments twice",
  why: "MAX(i++, j) increments i twice. Worse in firmware, MAX(read_status(), 10) reads a hardware register twice, and on a read-to-clear register the first read destroys the flags.",
  bad: "#define MAX(a,b)      a &gt; b ? a : b\n#define ABS(x)        ((x) &lt; 0 ? -(x) : (x))",
  fix: "static inline int  imax(int a, int b)  { return a &gt; b ? a : b; }\nstatic inline int  iabs(int x)        { return x &lt; 0 ? -x : x; }\n/* each argument is evaluated exactly once */" },

{ lines: [7], t: "SET_BIT is unparenthesised and uses a signed 1",
  why: "SET_BIT(reg, n + 1) expands to reg |= 1 << n + 1, and + binds tighter than <<. The signed 1 is also undefined behaviour when shifted into bit 31.",
  bad: "#define SET_BIT(r,b)  r |= 1 &lt;&lt; b",
  fix: "#define SET_BIT(r,b)  ((r) |= 1u &lt;&lt; (b))" },

{ lines: [9], t: "A static variable in a header",
  why: "Every translation unit that includes this gets its own private copy, so the count never aggregates. static also suppresses the duplicate-symbol error that would have caught it.",
  bad: "static int error_count = 0;",
  fix: "/* in the header: */\nextern int error_count;\n\n/* in exactly one .c file: */\nint error_count = 0;\n\n/* better: keep it static in one .c and expose functions,\n   so there is a single owner */" },

{ lines: [11], t: "bump_error increments its own translation unit's copy",
  why: "It looks like a shared counter behind a function, which makes the problem harder to spot than the bare variable would have been.",
  bad: "static inline void bump_error(void) { error_count++; }",
  fix: "/* declared in the header, defined in the owning .c file */\nvoid bump_error(void);\nunsigned error_get_count(void);" },

{ lines: [6], t: "ARRAY_LEN silently misreports on a pointer",
  why: "Passed an array parameter, which has decayed to a pointer, it returns the pointer size divided by the element size, with no warning. Worth keeping, but know the trap.",
  bad: "#define ARRAY_LEN(a)  (sizeof(a) / sizeof(a[0]))",
  fix: "/* GCC and Clang can make the misuse a compile error: */\n#define ARRAY_LEN(a)                                   \\\n    (sizeof(a) / sizeof((a)[0])                        \\\n     + sizeof(typeof(int[1 - 2 *                       \\\n         !!__builtin_types_compatible_p(typeof(a),     \\\n                                        typeof(&amp;(a)[0]))])) * 0)" }
],

"d-spot-i2c": [
{ lines: [5, 6, 7], t: "A STOP between the write and the read",
  why: "This is the reported fault. Two separate calls means a STOP after the write, which releases the bus and lets many devices reset or advance their internal address pointer, so the read comes from somewhere else.",
  bad: "i2c_write(0x68, &amp;reg, 1);\ndelay_us(50);\ni2c_read(0x68, rx, 2);",
  fix: "/* one transaction, repeated START, bus never released */\nrc = i2c_write_read(dev, &amp;reg, 1, rx, 2);" },

{ lines: [6], t: "The delay is a guess that fixes nothing",
  why: "There is no reason for 50 microseconds and it does nothing a correct transaction needs. It is the sort of line added when the real problem was the STOP.",
  bad: "delay_us(50);",
  fix: "/* delete it: a combined transaction needs no gap */" },

{ lines: [5, 7], t: "The address may need shifting",
  why: "Some APIs take the 7-bit address and shift internally, others take the pre-shifted byte. The tell is an analyser decoding exactly half the expected address.",
  bad: "i2c_write(0x68, &amp;reg, 1);",
  fix: "/* know which your API wants, and say so */\n#define BNO_ADDR_7BIT   0x68u\n#define BNO_ADDR_SHIFTED (BNO_ADDR_7BIT &lt;&lt; 1)" },

{ lines: [5, 7, 10], t: "Return values are ignored and it always returns 0",
  why: "A NAK, a timeout or a stuck bus all present as success with whatever was in rx. rx is also uninitialised, so the caller gets stack contents as a measurement.",
  bad: "i2c_write(0x68, &amp;reg, 1);\n...\ni2c_read(0x68, rx, 2);\n...\nreturn 0;",
  fix: "uint8_t rx[2] = { 0 };\n\nint rc = i2c_write_read(dev, &amp;reg, 1, rx, sizeof rx);\nif (rc != 0) {\n    return rc;              /* propagate unchanged */\n}" },

{ lines: [9], t: "The byte order is assumed, not documented",
  why: "Big-endian here, and nothing says so. The shift also promotes to int, which is fine at 16 bits but the wrong habit at 24 or 32.",
  bad: "*out = rx[0] &lt;&lt; 8 | rx[1];",
  fix: "/* big-endian on the wire, per the datasheet */\n*out = (uint16_t)(((uint16_t)rx[0] &lt;&lt; 8) | rx[1]);" },

{ lines: [1], t: "The address is hard-coded, so only one device is possible",
  why: "There is no handle or context, so this driver can never serve two of the same part, and no test can substitute the bus.",
  bad: "int sensor_read16(uint8_t reg, uint16_t *out)",
  fix: "int sensor_read16(sensor_t *dev, uint8_t reg, uint16_t *out)" }
],

"d-spot-cal": [
{ lines: [10], t: "No CRC on the stored record",
  why: "Corrupted coefficients load as plausible numbers and the instrument reports wrong measurements nobody can distinguish from correct. On a measurement instrument this is the worst failure mode available.",
  bad: "memcpy(&amp;cal, (void *)CAL_ADDR, sizeof(cal));",
  fix: "const cal_rec_t *f = (const cal_rec_t *)CAL_ADDR;\n\nif (f-&gt;crc != crc16((const uint8_t *)&amp;f-&gt;format,\n                    sizeof *f - offsetof(cal_rec_t, format))) {\n    return CAL_INVALID;\n}" },

{ lines: [12, 13], t: "Silently falling back to nominal",
  why: "The instrument quietly starts producing uncalibrated readings with nothing to indicate it. That is how a product ships wrong data for a year.",
  bad: "if (cal.gain_q16 == 0)\n    cal.gain_q16 = 65536;       /* nominal */",
  fix: "if (!valid) {\n    cal.offset = 0;\n    cal.gain_q16 = 65536;              /* nominal */\n    cal_state = CAL_NOMINAL_DEGRADED;\n    report_degraded(\"calibration invalid\");   /* never silent */\n}" },

{ lines: [12], t: "Blank flash passes the only check there is",
  why: "An erased sector reads as 0xFFFFFFFF, which is a large negative offset and a huge gain, and is not zero, so the gain check does not fire. Never-calibrated and corrupted are also indistinguishable.",
  bad: "if (cal.gain_q16 == 0)",
  fix: "if (f-&gt;format == 0xFFFFu)      cal_state = CAL_NEVER;\nelse if (f-&gt;format != CAL_FORMAT) cal_state = CAL_UNKNOWN_LAYOUT;\nelse if (crc_bad)              cal_state = CAL_CORRUPT;\nelse                           cal_state = CAL_FACTORY;" },

{ lines: [1, 4], t: "No format version, date or traceability",
  why: "Adding a coefficient later means every existing device holds the old layout. The date and equipment are what an auditor asks for, and what tells you whether a unit predates a known problem.",
  bad: "typedef struct {\n    int32_t offset;\n    int32_t gain_q16;\n} cal_t;",
  fix: "typedef struct {\n    uint16_t format;          /* layout version */\n    uint16_t crc;\n    uint32_t cal_unix_time;   /* when */\n    uint32_t equipment_id;    /* against what */\n    int32_t  offset;\n    int32_t  gain_q16;\n} cal_rec_t;" },

{ lines: [18], t: "The multiply overflows",
  why: "(raw - offset) times a Q16.16 gain is a 64-bit quantity. With a gain near 1.0 the multiplier is 65536, so any raw value above about 32768 overflows a signed 32-bit multiply, which is undefined behaviour.",
  bad: "return ((raw - cal.offset) * cal.gain_q16) &gt;&gt; 16;",
  fix: "int64_t v = (int64_t)(raw - cal.offset) * cal.gain_q16;\nv += (1LL &lt;&lt; 15);                /* round to nearest */\nreturn (int32_t)(v &gt;&gt; 16);" },

{ lines: [18], t: "The shift truncates and biases negative readings",
  why: "A right shift rounds towards negative infinity, so negative readings are biased down. Right-shifting a negative signed value is also implementation-defined.",
  bad: "return ((raw - cal.offset) * cal.gain_q16) &gt;&gt; 16;",
  fix: "v += (1LL &lt;&lt; 15);       /* add half an LSB before shifting */\nreturn (int32_t)(v &gt;&gt; 16);" },

{ lines: [6], t: "Static state means one channel",
  why: "Two channels share the calibration, and no test can install a known one before calling apply_cal.",
  bad: "static cal_t cal;",
  fix: "int32_t apply_cal(const cal_rec_t *c, int32_t raw);" }
]

};

/* Attach, and check every referenced line actually exists. A drill edit that
   shifts lines should be loud, not silently point at the wrong code. */
if (typeof DRILLS !== "undefined") {
    DRILLS.forEach(d => {
        const bugs = DRILL_BUGS[d.id];
        if (!bugs) return;
        const nLines = (d.code || "").split("\n").length;
        const bad = [];
        bugs.forEach(b => b.lines.forEach(n => {
            if (n < 1 || n > nLines) bad.push(d.id + " bug '" + b.t + "' -> line " + n);
        }));
        if (bad.length && typeof console !== "undefined") {
            console.warn("drillbugs: line out of range:", bad.join("; "));
        }
        d.bugs = bugs;
    });
}
