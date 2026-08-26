/* Per-bug line mappings for the second set of spot-the-bug drills.
 * Line numbers are 1-based into each drill's `code` field and are checked
 * against it at load time.
 */

Object.assign(DRILL_BUGS, {

"d-spot-str": [
{ lines: [5], t: "strncpy may leave the destination unterminated",
  why: "If src is 16 characters or longer, name is filled completely with no NUL, and every later strlen or printf walks off the end into whatever follows it in RAM.",
  bad: "    strncpy(name, src, sizeof name);",
  fix: "    snprintf(name, sizeof name, \"%s\", src);   /* always terminates */" },

{ lines: [10, 14], t: "Returns a pointer to a stack local",
  why: "msg is gone the moment the function returns. The caller gets a pointer into a dead frame, which usually still holds the right text until the next call overwrites it, so it works in testing and fails in the field.",
  bad: "    char msg[32];\n    ...\n    return msg;",
  fix: "/* take a buffer from the caller instead */\nint build_greeting(char *out, size_t cap, const char *who)\n{\n    return snprintf(out, cap, \"Hello, %s!\", who);\n}" },

{ lines: [12], t: "sprintf into a fixed buffer has no bound",
  why: "\"Hello, %s!\" plus an arbitrary who into 32 bytes. A 40-character name overruns the stack frame, which on most targets means the return address.",
  bad: "    sprintf(msg, \"Hello, %s!\", who);",
  fix: "    snprintf(msg, sizeof msg, \"Hello, %s!\", who);" },

{ lines: [21, 25], t: "Off by one: the terminator lands one past the end",
  why: "With n == cap the check passes, and dst[n] writes at dst[cap]. n characters plus a terminator needs n + 1 bytes. A one-byte overflow usually corrupts the next variable rather than crashing, which makes it very hard to find.",
  bad: "    if (n &gt; cap) {\n    ...\n    dst[n] = '\\0';",
  fix: "    if (n &gt;= cap) {\n        return -1;\n    }" },

{ lines: [33, 35], t: "snprintf's return is the wanted length, not what was written",
  why: "If the output was truncated, n is larger than the buffer and uart_write reads past the end. Using the return value as a byte count turns a truncation into an out-of-bounds read.",
  bad: "    int n = snprintf(buf, sizeof buf, fmt, v);\n\n    uart_write(buf, (size_t)n);",
  fix: "    int n = snprintf(buf, sizeof buf, fmt, v);\n    if (n &lt; 0) return;\n    size_t len = ((size_t)n &lt; sizeof buf) ? (size_t)n : sizeof buf - 1u;\n    uart_write(buf, len);" }
],

"d-spot-time": [
{ lines: [21], t: "The timeout comparison breaks when the tick wraps",
  why: "start + 100 wraps to a small number near the top of the range, so the wait gives up immediately, or never expires at all. A 32-bit millisecond tick wraps after 49.7 days, which is why a two-day soak test never sees it.",
  bad: "        if (now_ms() &gt; start + 100u) {",
  fix: "        if ((uint32_t)(now_ms() - start) &gt;= 100u) {\n            /* subtract first: the wrap cancels itself */" },

{ lines: [1, 20], t: "The status register is not volatile",
  why: "Nothing in the C abstract machine can change that location, so the compiler may read it once and reuse the value, and the loop spins forever on a stale copy. Works at -O0, hangs at -O2.",
  bad: "#define SENSOR_STATUS (*(uint32_t *)0x40001000u)",
  fix: "#define SENSOR_STATUS (*(volatile uint32_t *)0x40001000u)" },

{ lines: [20, 21, 22, 23], t: "Polls flat out with no delay",
  why: "The loop hammers the bus and burns power for the whole timeout. A short sleep or a WFI between polls costs nothing in responsiveness and a great deal in current.",
  bad: "    while (!(SENSOR_STATUS &amp; READY_BIT)) {\n        if (now_ms() &gt; start + 100u) {\n            return false;\n        }",
  fix: "    while (!(SENSOR_STATUS &amp; READY_BIT)) {\n        if ((uint32_t)(now_ms() - start) &gt;= 100u) return false;\n        __WFI();          /* or a 1 ms sleep */" },

{ lines: [28, 30], t: "delay_us is a guess dressed as a number",
  why: "The loop count assumes a clock speed, a compiler, an optimisation level and no interrupts. Change any one and the delay changes silently. us * 8 also overflows above about 537 million.",
  bad: "void delay_us(uint32_t us)\n{\n    for (volatile uint32_t i = 0; i &lt; us * 8u; i++) {",
  fix: "/* use a hardware timer, or the DWT cycle counter on Cortex-M */\nvoid delay_us(uint32_t us)\n{\n    uint32_t start = DWT-&gt;CYCCNT;\n    uint32_t ticks = us * (SystemCoreClock / 1000000u);\n    while ((DWT-&gt;CYCCNT - start) &lt; ticks) { }\n}" },

{ lines: [38, 40], t: "periodic_task drifts, because it absorbs its own lateness",
  why: "Setting last from the clock keeps every bit of lateness permanently. Three milliseconds late each time makes the period 1003 ms, which is about four minutes a day. The comparison should also be >=.",
  bad: "    if (now_ms() - last &gt; 1000u) {\n        take_sample();\n        last = now_ms();",
  fix: "    if ((uint32_t)(now_ms() - last) &gt;= 1000u) {\n        take_sample();\n        last += 1000u;      /* keeps the schedule, so a late run\n                               is followed by an early one */" }
],

"d-spot-leak": [
{ lines: [3, 5], t: "malloc's return is never checked",
  why: "The very next line dereferences it. On a microcontroller the heap is small enough that allocation failure is a realistic case rather than a formality.",
  bad: "    session_t *s = malloc(sizeof(*s));\n\n    s-&gt;addr = addr;",
  fix: "    session_t *s = calloc(1, sizeof(*s));\n    if (s == NULL) return -ENOMEM;\n\n    s-&gt;addr = addr;" },

{ lines: [11, 12, 13], t: "The first failure path leaks the allocation AND holds the lock",
  why: "The leak is bad; the held mutex is worse. Every later caller blocks forever, so one failed open bricks the whole bus and the symptom appears nowhere near the cause.",
  bad: "    if (s-&gt;dev == NULL) {\n        return -EIO;\n    }",
  fix: "    if (s-&gt;dev == NULL) {\n        rc = -EIO;\n        goto out;          /* one cleanup path for every failure */\n    }" },

{ lines: [15, 16, 17], t: "The second failure path frees but does not close or unlock",
  why: "Three exits, three different subsets of the cleanup. That is the real defect: the cleanup was written per path rather than once, so each path is a fresh chance to forget something.",
  bad: "    if (dev_read(s-&gt;dev, REG_CFG, &amp;s-&gt;cfg) != 0) {\n        free(s);\n        return -EIO;\n    }",
  fix: "    rc = dev_read(s-&gt;dev, REG_CFG, &amp;s-&gt;cfg);\n    if (rc != 0) {\n        rc = -EIO;\n        goto out;\n    }" },

{ lines: [20, 21, 22, 23, 24], t: "Only the third path cleans up fully, and in a different order",
  why: "It happens to be right, which is what makes the other two easy to miss in review. Cleanup that is correct by coincidence rather than by structure will break the next time someone adds a resource.",
  bad: "    if (s-&gt;cfg == 0) {\n        dev_close(s-&gt;dev);\n        free(s);\n        mutex_unlock(&amp;bus_lock);\n        return -EINVAL;\n    }",
  fix: "    if (s-&gt;cfg == 0) {\n        rc = -EINVAL;\n        goto out;\n    }\n\n    /* ... and one label at the end: */\nout:\n    if (s-&gt;dev) dev_close(s-&gt;dev);\n    mutex_unlock(&amp;bus_lock);\n    free(s);\n    return rc;" },

{ lines: [32, 36], t: "session_close assigns to its own parameter copy",
  why: "s is a copy of the caller's pointer, so setting it to NULL affects nothing. The caller keeps a dangling pointer, and the line reads as protection while providing none, which is worse than not writing it.",
  bad: "void session_close(session_t *s)\n{\n    ...\n    s = NULL;",
  fix: "void session_close(session_t **ps)\n{\n    if (ps == NULL || *ps == NULL) return;\n    dev_close((*ps)-&gt;dev);\n    free(*ps);\n    *ps = NULL;      /* now it actually clears the caller's pointer */\n}" }
],

"d-spot-pack": [
{ lines: [1, 2, 3, 4, 5, 6], t: "The struct has padding, so sizeof is not the wire length",
  why: "uint8_t type is followed by three bytes of padding so timestamp lands on a 4-byte boundary, plus tail padding. sizeof is 12, not 8, and the padding bytes are uninitialised stack contents.",
  bad: "typedef struct {\n    uint8_t  type;\n    uint32_t timestamp;\n    int16_t  temperature;\n    uint8_t  flags;\n} telemetry_t;",
  fix: "/* do not define the wire format as a struct at all */\n#define TELEM_WIRE_LEN 8\n_Static_assert(TELEM_WIRE_LEN == 8, \"protocol says 8 bytes\");" },

{ lines: [17], t: "Byte order is whatever the sender happens to use",
  why: "timestamp goes out in the sender's native order, so two identical boards agree and the customer's gateway does not. A protocol has to specify an order, and the code has to implement it rather than inherit it.",
  bad: "    return uart_send((uint8_t *)&amp;pkt, sizeof(telemetry_t));",
  fix: "    uint8_t w[TELEM_WIRE_LEN];\n    w[0] = PKT_TELEMETRY;\n    put_be32(&amp;w[1], ts);\n    w[5] = (uint8_t)((uint16_t)temp &gt;&gt; 8);\n    w[6] = (uint8_t)((uint16_t)temp);\n    w[7] = flags;\n    return uart_send(w, sizeof w);" },

{ lines: [10, 17], t: "The padding bytes are never initialised",
  why: "pkt is an uninitialised local and only its named members are written, so the padding goes out as whatever was on the stack. That is both non-deterministic and an information leak.",
  bad: "    telemetry_t pkt;",
  fix: "    telemetry_t pkt = { 0 };     /* if you keep the struct at all */" },

{ lines: [25], t: "Casting a byte pointer to a struct pointer",
  why: "Two problems in one line: buf may not be 4-byte aligned, which is slow on Cortex-M3 and a fault on some parts, and the cast breaks strict aliasing so the compiler may reorder around it at -O2.",
  bad: "    *out = *(telemetry_t *)buf;",
  fix: "    out-&gt;type        = buf[0];\n    out-&gt;timestamp   = get_be32(&amp;buf[1]);\n    out-&gt;temperature = (int16_t)(((uint16_t)buf[5] &lt;&lt; 8) | buf[6]);\n    out-&gt;flags       = buf[7];" },

{ lines: [4, 14], t: "The signed field needs converting before it is shifted",
  why: "temperature is int16_t, and shifting a negative signed value right is implementation-defined. Convert to uint16_t first, and on the receive side read into an unsigned then convert back.",
  bad: "    int16_t  temperature;\n    ...\n    pkt.temperature = temp;",
  fix: "    w[5] = (uint8_t)((uint16_t)temp &gt;&gt; 8);\n    w[6] = (uint8_t)((uint16_t)temp);" }
],

"d-spot-bitfield": [
{ lines: [1, 2, 3, 4, 5, 6, 7], t: "Bitfield layout is implementation-defined",
  why: "The standard does not fix which end of the storage unit the first field occupies, how fields straddle units, or the padding. GCC on ARM allocates from the least significant bit; nothing requires that. A register map built this way is correct for one compiler on one target.",
  bad: "typedef struct {\n    unsigned enable   : 1;\n    unsigned mode     : 3;\n    ...\n} ctrl_reg_t;",
  fix: "/* masks and shifts are defined everywhere */\n#define CTRL_ENABLE        (1u &lt;&lt; 0)\n#define CTRL_MODE_SHIFT    1u\n#define CTRL_MODE_MASK     (0x7u &lt;&lt; CTRL_MODE_SHIFT)\n#define CTRL_PRESCALE_SHIFT 6u\n#define CTRL_PRESCALE_MASK (0xFFu &lt;&lt; CTRL_PRESCALE_SHIFT)" },

{ lines: [9, 17], t: "Neither register is volatile",
  why: "The compiler may cache reads, drop writes it thinks redundant, and reorder them. Polling STATUS.busy would spin on a stale value.",
  bad: "#define CTRL (*(ctrl_reg_t *)0x40002000u)",
  fix: "#define CTRL (*(volatile uint32_t *)0x40002000u)" },

{ lines: [21, 22, 23], t: "Each field write is a read-modify-write of the whole register",
  why: "Three assignments means three full read-modify-writes. An interrupt touching CTRL in between loses an update, and the peripheral sees intermediate states: after line 22 the prescale is set while enable is still 0.",
  bad: "    CTRL.mode     = mode;\n    CTRL.prescale = prescale;\n    CTRL.enable   = 1;",
  fix: "    CTRL = ((mode &amp; 0x7u) &lt;&lt; CTRL_MODE_SHIFT)\n         | ((prescale &amp; 0xFFu) &lt;&lt; CTRL_PRESCALE_SHIFT)\n         | CTRL_ENABLE;      /* one write, no intermediate state */" },

{ lines: [29], t: "Writing 0 to a write-1-to-clear flag, via a read-modify-write",
  why: "Two faults at once. It writes 0 where the hardware wants a 1, so the flag is never cleared. And because a bitfield write reads the register first and writes every other flag back as it found it, on a write-1-to-clear register it clears every flag that happened to be set.",
  bad: "        STATUS.overflow = 0;      /* write 1 to clear */",
  fix: "        STATUS = STATUS_OVERFLOW;   /* a plain write of just this bit */" },

{ lines: [11, 12, 13, 14, 15], t: "The status struct does not describe the register's width",
  why: "Three bits declared for a 32-bit register. The compiler may make the struct one byte, so STATUS can generate an 8-bit access to a peripheral that requires a 32-bit one, and many peripherals fault or ignore it.",
  bad: "typedef struct {\n    unsigned overflow : 1;\n    unsigned error    : 1;\n    unsigned busy     : 1;\n} status_reg_t;",
  fix: "#define STATUS_OVERFLOW (1u &lt;&lt; 0)\n#define STATUS_ERROR    (1u &lt;&lt; 1)\n#define STATUS_BUSY     (1u &lt;&lt; 2)\n#define STATUS (*(volatile uint32_t *)0x40002004u)" }
]

});

/* attach, checking every line number is in range */
if (typeof DRILLS !== "undefined") {
    DRILLS.forEach(d => {
        const bugs = DRILL_BUGS[d.id];
        if (!bugs || d.bugs) return;
        const nLines = (d.code || "").split("\n").length;
        const bad = [];
        bugs.forEach(b => b.lines.forEach(n => {
            if (n < 1 || n > nLines) bad.push(d.id + " bug '" + b.t + "' -> line " + n);
        }));
        if (bad.length && typeof console !== "undefined") {
            console.warn("drillbugs7: line out of range:", bad.join("; "));
        }
        d.bugs = bugs;
    });
}
