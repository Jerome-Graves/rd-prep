/* Unit tests for the remaining write drills.
 *
 * Some of these need a contract pinned down precisely, because a test can only
 * call functions whose names it knows. Each entry's `sig` states exactly what
 * to define, and it is shown above the editor.
 *
 * d-write-fault has no tests and will not get any: it is naked assembly, SCB
 * registers and EXC_RETURN, none of which exist on x86. Faking them convincingly
 * enough to be worth running would test the fake rather than your answer.
 */

Object.assign(DRILL_TESTS, {

// ---------------------------------------------------------- driver init
"d-write-init": {
sig: "Define struct sensor_dev { sensor_io_t io; } and int sensor_init(const sensor_io_t *, sensor_dev_t **). The io type, error codes and register numbers are provided.",
prelude: `/* provided for you */
typedef struct {
    int  (*read) (void *ctx, uint8_t reg, uint8_t *buf, size_t len);
    int  (*write)(void *ctx, uint8_t reg, const uint8_t *buf, size_t len);
    void (*delay_ms)(void *ctx, uint32_t ms);
    void *ctx;
} sensor_io_t;

typedef struct sensor_dev sensor_dev_t;

#define SENSOR_ERR_INVALID_ARG  (-1)
#define SENSOR_ERR_NO_MEM       (-2)
#define SENSOR_ERR_WRONG_PART   (-3)
#define SENSOR_ERR_TIMEOUT      (-4)
#define BUS_ERR                 (-99)      /* what the transport returns on failure */

#define REG_WHO_AM_I        0x00
#define REG_CTRL            0x20
#define REG_CFG             0x21
#define RESET_BIT           0x80
#define SENSOR_EXPECTED_ID  0xA5
#define SENSOR_DEFAULT_CFG  0x38
#define RESET_MAX_TRIES     50

/* a fake device, and allocation counting so leaks are detectable */
static uint8_t  fk_regs[256];
static int      fk_fail_on = -1;      /* which transfer returns BUS_ERR */
static int      fk_n;                 /* transfers so far */
static int      fk_reset_reads;       /* reads of CTRL before RESET_BIT clears */
static unsigned fk_delay_total;

static int fk_read(void *c, uint8_t r, uint8_t *b, size_t n)
{
    (void)c;
    if (fk_n++ == fk_fail_on) return BUS_ERR;
    for (size_t i = 0; i < n; i++) {
        uint8_t v = fk_regs[(uint8_t)(r + i)];
        if ((uint8_t)(r + i) == REG_CTRL) {
            if (fk_reset_reads > 0) { fk_reset_reads--; v |= RESET_BIT; }
            else                    { v = (uint8_t)(v & (uint8_t)~RESET_BIT); }
        }
        b[i] = v;
    }
    return 0;
}
static int fk_write(void *c, uint8_t r, const uint8_t *b, size_t n)
{
    (void)c;
    if (fk_n++ == fk_fail_on) return BUS_ERR;
    for (size_t i = 0; i < n; i++) fk_regs[(uint8_t)(r + i)] = b[i];
    return 0;
}
static void fk_delay(void *c, uint32_t ms) { (void)c; fk_delay_total += ms; }

static void fk_reset(sensor_io_t *io)
{
    memset(fk_regs, 0, sizeof fk_regs);
    fk_regs[REG_WHO_AM_I] = SENSOR_EXPECTED_ID;
    fk_fail_on = -1; fk_n = 0; fk_reset_reads = 0; fk_delay_total = 0;
    io->read = fk_read; io->write = fk_write; io->delay_ms = fk_delay; io->ctx = NULL;
}

/* count allocations so a leak on an error path is visible */
static int alloc_live;
static void *t_calloc(size_t n, size_t sz) { void *p = calloc(n, sz); if (p) alloc_live++; return p; }
static void *t_malloc(size_t sz)           { void *p = malloc(sz);    if (p) alloc_live++; return p; }
static void  t_free(void *p)               { if (p) alloc_live--; free(p); }
#define calloc t_calloc
#define malloc t_malloc
#define free   t_free`,
test: `int main(void)
{
    sensor_io_t io; sensor_dev_t *dev;

    /* --- argument validation --- */
    fk_reset(&io); dev = (sensor_dev_t *)0x1;
    CHECK(sensor_init(NULL, &dev) == SENSOR_ERR_INVALID_ARG, "rejects a null io");
    fk_reset(&io);
    CHECK(sensor_init(&io, NULL) == SENSOR_ERR_INVALID_ARG, "rejects a null out");
    fk_reset(&io); io.read = NULL; dev = NULL;
    CHECK(sensor_init(&io, &dev) == SENSOR_ERR_INVALID_ARG, "rejects a null function pointer");

    /* --- happy path --- */
    fk_reset(&io); dev = NULL; alloc_live = 0;
    int rc = sensor_init(&io, &dev);
    CHECK(rc == 0, "succeeds on a good device");
    CHECK(dev != NULL, "sets the out pointer on success");
    CHECK(fk_regs[REG_CFG] == SENSOR_DEFAULT_CFG, "writes the configuration register");

    /* --- wrong part --- */
    fk_reset(&io); fk_regs[REG_WHO_AM_I] = 0x00; dev = NULL; alloc_live = 0;
    rc = sensor_init(&io, &dev);
    CHECK(rc == SENSOR_ERR_WRONG_PART, "distinct error for the wrong chip id");
    CHECK(dev == NULL, "leaves out untouched on failure");
    CHECK(alloc_live == 0, "no leak on the wrong-part path");

    /* --- bus error is propagated, not flattened --- */
    fk_reset(&io); fk_fail_on = 0; dev = NULL; alloc_live = 0;
    rc = sensor_init(&io, &dev);
    CHECK(rc == BUS_ERR, "propagates the bus error unchanged");
    CHECK(alloc_live == 0, "no leak when the bus fails");

    /* --- failure part way through, after allocation --- */
    fk_reset(&io); fk_fail_on = 1; dev = NULL; alloc_live = 0;
    rc = sensor_init(&io, &dev);
    CHECK(rc != 0, "fails when a later transfer fails");
    CHECK(alloc_live == 0, "no leak when a later transfer fails");

    /* --- reset polling rather than a fixed delay --- */
    fk_reset(&io); fk_reset_reads = 5; dev = NULL; alloc_live = 0;
    rc = sensor_init(&io, &dev);
    CHECK(rc == 0, "waits for the reset bit to clear, then succeeds");

    /* --- reset that never completes must time out, not hang --- */
    fk_reset(&io); fk_reset_reads = 1000000; dev = NULL; alloc_live = 0;
    rc = sensor_init(&io, &dev);
    CHECK(rc != 0, "times out when the reset bit never clears");
    CHECK(alloc_live == 0, "no leak on the timeout path");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- frame receiver
"d-write-parse": {
sig: "Define MAX_PAYLOAD, rx_t, and int rx_byte(rx_t *, uint8_t) returning the payload length on a good frame or -1. A working crc16() is provided; the CRC covers the length byte and the payload.",
prelude: `/* provided for you */
static uint16_t crc16(const uint8_t *d, size_t n)
{
    uint16_t c = 0xFFFFu;
    for (size_t i = 0; i < n; i++) {
        c = (uint16_t)(c ^ (uint16_t)((uint16_t)d[i] << 8));
        for (int b = 0; b < 8; b++)
            c = (c & 0x8000u) ? (uint16_t)((c << 1) ^ 0x1021u) : (uint16_t)(c << 1);
    }
    return c;
}
static uint16_t crc16_continue(uint16_t c, const uint8_t *d, size_t n)
{
    for (size_t i = 0; i < n; i++) {
        c = (uint16_t)(c ^ (uint16_t)((uint16_t)d[i] << 8));
        for (int b = 0; b < 8; b++)
            c = (c & 0x8000u) ? (uint16_t)((c << 1) ^ 0x1021u) : (uint16_t)(c << 1);
    }
    return c;
}`,
test: `/* build a well-formed frame: AA, len, payload, crc_lo, crc_hi */
static size_t build(uint8_t *out, const uint8_t *payload, uint8_t len)
{
    size_t k = 0;
    out[k++] = 0xAAu;
    out[k++] = len;
    for (uint8_t i = 0; i < len; i++) out[k++] = payload[i];
    uint16_t c = crc16(&len, 1);
    c = crc16_continue(c, payload, len);
    out[k++] = (uint8_t)(c & 0xFFu);
    out[k++] = (uint8_t)(c >> 8);
    return k;
}

static int feed(rx_t *r, const uint8_t *b, size_t n)
{
    int last = -1;
    for (size_t i = 0; i < n; i++) { int v = rx_byte(r, b[i]); if (v >= 0) last = v; }
    return last;
}

int main(void)
{
    rx_t r; uint8_t f[300];
    uint8_t pay[8] = { 1, 2, 3, 4, 5, 6, 7, 8 };

    memset(&r, 0, sizeof r);
    size_t n = build(f, pay, 8);
    CHECK(feed(&r, f, n) == 8, "accepts a good frame and reports the payload length");
    CHECK(memcmp(r.payload, pay, 8) == 0, "payload lands in the buffer intact");

    /* two frames back to back */
    memset(&r, 0, sizeof r);
    n = build(f, pay, 8);
    size_t n2 = build(f + n, pay, 4);
    CHECK(feed(&r, f, n + n2) == 4, "handles two frames back to back");

    /* corrupted CRC must be rejected */
    memset(&r, 0, sizeof r);
    n = build(f, pay, 8);
    f[n - 1] ^= 0xFFu;
    CHECK(feed(&r, f, n) == -1, "rejects a frame with a bad CRC");

    /* and it must recover: a good frame straight after is accepted */
    n2 = build(f + n, pay, 5);
    CHECK(feed(&r, f + n, n2) == 5, "recovers after a bad CRC");

    /* a length larger than the buffer must not overrun, and must resync */
    memset(&r, 0, sizeof r);
    uint8_t evil[4] = { 0xAAu, 0xFFu, 0x00u, 0x00u };
    feed(&r, evil, 4);
    n = build(f, pay, 6);
    CHECK(feed(&r, f, n) == 6, "an over-long length is rejected and it resynchronises");

    /* garbage before a frame is skipped */
    memset(&r, 0, sizeof r);
    uint8_t junk[5] = { 0x11u, 0x22u, 0x33u, 0x44u, 0x55u };
    feed(&r, junk, 5);
    n = build(f, pay, 3);
    CHECK(feed(&r, f, n) == 3, "skips leading garbage and finds the frame");

    /* zero-length payload */
    memset(&r, 0, sizeof r);
    n = build(f, pay, 0);
    CHECK(feed(&r, f, n) == 0, "handles a zero-length payload");

    /* A truncated frame costs one frame to recover from, because the next
       frame's first bytes are eaten as the missing CRC. It must not wedge
       permanently: the frame after that has to be accepted. */
    memset(&r, 0, sizeof r);
    n = build(f, pay, 8);
    feed(&r, f, n - 2);                     /* stop before the CRC */
    n2 = build(f + n, pay, 7);
    feed(&r, f + n, n2);                    /* this one is the casualty */
    size_t n3 = build(f + n + n2, pay, 3);
    CHECK(feed(&r, f + n + n2, n3) == 3,
          "recovers after a truncated frame (costing one frame, not wedging)");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- COBS framing
"d-write-cobs": {
sig: "Define size_t cobs_encode(const uint8_t *in, size_t len, uint8_t *out, size_t cap) returning bytes written (including the trailing zero delimiter) or 0 if it will not fit. A reference cobs_decode() is provided.",
prelude: `/* provided for you: a reference decoder, so the round trip can be checked */
static size_t cobs_decode(const uint8_t *in, size_t len, uint8_t *out, size_t cap)
{
    size_t rd = 0, wr = 0;
    while (rd < len) {
        uint8_t code = in[rd++];
        if (code == 0u) break;                       /* delimiter */
        for (uint8_t i = 1; i < code; i++) {
            if (rd >= len || wr >= cap) return 0;
            out[wr++] = in[rd++];
        }
        if (code < 0xFFu && rd < len && in[rd] != 0u) {
            if (wr >= cap) return 0;
            out[wr++] = 0u;
        }
    }
    return wr;
}`,
test: `static int roundtrip(const uint8_t *data, size_t len, const char *name)
{
    uint8_t enc[1024], dec[1024];
    size_t e = cobs_encode(data, len, enc, sizeof enc);
    if (e == 0) { CHECK(0, name); return 0; }

    /* the encoded body must contain no zero except the final delimiter */
    int zeros = 0;
    for (size_t i = 0; i + 1 < e; i++) if (enc[i] == 0u) zeros++;
    if (zeros != 0)            { CHECK(0, name); return 0; }
    if (enc[e - 1] != 0u)      { CHECK(0, name); return 0; }

    size_t d = cobs_decode(enc, e, dec, sizeof dec);
    int ok = (d == len) && (len == 0 || memcmp(dec, data, len) == 0);
    CHECK(ok, name);
    return ok;
}

int main(void)
{
    uint8_t buf[600];

    uint8_t a[] = { 1, 2, 3, 4, 5 };
    roundtrip(a, sizeof a, "round trip: no zeros in the payload");

    uint8_t b[] = { 0, 0, 0 };
    roundtrip(b, sizeof b, "round trip: payload is all zeros");

    uint8_t c[] = { 1, 0, 2, 0, 3 };
    roundtrip(c, sizeof c, "round trip: zeros interleaved");

    uint8_t d0[] = { 0 };
    roundtrip(d0, 1, "round trip: a single zero byte");

    roundtrip(a, 0, "round trip: empty payload");

    /* a long run with no zeros exercises the 0xFF code path */
    for (size_t i = 0; i < 600; i++) buf[i] = (uint8_t)((i % 254) + 1);
    roundtrip(buf, 600, "round trip: 600 bytes with no zeros (code 0xFF path)");

    /* exactly 254 non-zero bytes is the boundary case */
    for (size_t i = 0; i < 254; i++) buf[i] = (uint8_t)(i + 1);
    roundtrip(buf, 254, "round trip: exactly 254 non-zero bytes");

    /* every byte value present */
    for (size_t i = 0; i < 256; i++) buf[i] = (uint8_t)i;
    roundtrip(buf, 256, "round trip: all 256 byte values");

    /* overhead must be bounded and small */
    uint8_t enc[1024];
    for (size_t i = 0; i < 254; i++) buf[i] = (uint8_t)(i + 1);
    size_t e = cobs_encode(buf, 254, enc, sizeof enc);
    CHECK(e > 0 && e <= 254 + 3, "overhead is small and bounded");

    /* must refuse rather than overrun a small buffer */
    uint8_t tiny[4];
    CHECK(cobs_encode(buf, 254, tiny, sizeof tiny) == 0, "refuses a buffer that is too small");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- calibration
"d-write-cal2": {
sig: "Define GAIN_Q (16), cal_rec_t with int32_t offset_counts and int32_t gain_q16, int cal_compute(int32_t raw_lo,int32_t ref_lo,int32_t raw_hi,int32_t ref_hi,cal_rec_t *out), and int32_t cal_apply_rec(const cal_rec_t *c, int32_t raw).",
test: `int main(void)
{
    cal_rec_t c;

    /* a straightforward 1:1 calibration with an offset */
    CHECK(cal_compute(100, 0, 1100, 1000, &c) == 0, "computes from two valid points");
    CHECK(cal_apply_rec(&c, 100)  == 0,    "maps the low reference point exactly");
    CHECK(cal_apply_rec(&c, 1100) == 1000, "maps the high reference point exactly");
    CHECK(cal_apply_rec(&c, 600)  == 500,  "is linear in between");

    /* a gain other than one */
    CHECK(cal_compute(0, 0, 1000, 2000, &c) == 0, "computes with a gain of two");
    CHECK(cal_apply_rec(&c, 0)    == 0,    "zero maps to zero");
    CHECK(cal_apply_rec(&c, 1000) == 2000, "full scale maps correctly with gain 2");
    CHECK(cal_apply_rec(&c, 500)  == 1000, "halfway is halfway");

    /* a gain below one */
    CHECK(cal_compute(0, 0, 4000, 1000, &c) == 0, "computes with a gain of a quarter");
    CHECK(cal_apply_rec(&c, 4000) == 1000, "quarter gain maps full scale correctly");

    /* degenerate input must be rejected, not divided by zero */
    cal_rec_t bad;
    CHECK(cal_compute(500, 0, 500, 1000, &bad) != 0, "rejects two identical raw points");

    /* negative readings must not be biased downward by a truncating shift */
    CHECK(cal_compute(-1000, -1000, 1000, 1000, &c) == 0, "computes across zero");
    CHECK(cal_apply_rec(&c, -1000) == -1000, "negative reference point is exact");
    CHECK(cal_apply_rec(&c, 0)     == 0,     "zero is exact");
    CHECK(cal_apply_rec(&c, 1000)  == 1000,  "positive reference point is exact");

    /* large values must not overflow the intermediate */
    CHECK(cal_compute(0, 0, 100000, 200000, &c) == 0, "computes with large values");
    CHECK(cal_apply_rec(&c, 100000) == 200000, "no intermediate overflow at 100000 counts");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- register fields
"d-write-regfield": {
sig: "A volatile uint32_t CTRL is provided (do not define it yourself). Define CTRL_ENABLE, CTRL_MODE_SHIFT, CTRL_MODE_MASK, mode_t with MODE_MAX, ctrl_enable(), ctrl_disable() and int ctrl_set_mode(mode_t).",
prelude: `/* provided for you: the register, as a variable so it can be inspected */
static volatile uint32_t CTRL;`,
test: `int main(void)
{
    CTRL = 0u;
    ctrl_enable();
    CHECK((CTRL & 1u) != 0u, "enable sets bit 0");

    CTRL = 0xFFFFFFFFu;
    ctrl_disable();
    CHECK((CTRL & 1u) == 0u, "disable clears bit 0");
    CHECK((CTRL & 0xFFFFFF00u) == 0xFFFFFF00u, "disable leaves the other bits alone");

    /* setting a mode must clear the field first */
    CTRL = (7u << 4);                       /* field currently all ones */
    CHECK(ctrl_set_mode((mode_t)2) == 0, "accepts a valid mode");
    CHECK(((CTRL >> 4) & 7u) == 2u, "clear-then-set: replaces the field rather than ORing");

    /* going back to zero must work, which a bare OR cannot do */
    CHECK(ctrl_set_mode((mode_t)0) == 0, "accepts mode zero");
    CHECK(((CTRL >> 4) & 7u) == 0u, "can set the field back to zero");

    /* neighbouring bits must survive */
    CTRL = 0u;
    CTRL |= 1u;                             /* enable bit set */
    CTRL |= (1u << 7);                      /* the read-only status bit */
    ctrl_set_mode((mode_t)5);
    CHECK((CTRL & 1u) != 0u, "setting the mode preserves the enable bit");
    CHECK((CTRL & (1u << 7)) != 0u, "setting the mode preserves bit 7");
    CHECK(((CTRL >> 4) & 7u) == 5u, "and the mode is actually set");

    /* an out-of-range mode must not spill into bit 7 */
    CTRL = 0u;
    int rc = ctrl_set_mode((mode_t)9);
    CHECK(rc != 0 || (CTRL & (1u << 7)) == 0u,
          "an out-of-range mode is rejected or masked, never spilling into bit 7");
    CHECK(rc != 0 || ((CTRL >> 4) & 7u) == 1u,
          "if it accepts 9 at all, it is masked to 3 bits");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- the fake itself
"d-write-fake": {
sig: "Define fake_t, fake_init(fake_t *), fake_bind(fake_t *, sensor_io_t *), and inside fake_t: uint8_t regs[256], int fail_on_nth, int fail_rc, unsigned transfers, a write log with fields log[].reg and log[].val plus unsigned log_n, and uint32_t virtual_ms. The io type is provided.",
prelude: `/* provided for you */
typedef struct {
    int  (*read) (void *ctx, uint8_t reg, uint8_t *buf, size_t len);
    int  (*write)(void *ctx, uint8_t reg, const uint8_t *buf, size_t len);
    void (*delay_ms)(void *ctx, uint32_t ms);
    void *ctx;
} sensor_io_t;`,
test: `int main(void)
{
    fake_t f; sensor_io_t io;
    uint8_t b[4];

    fake_init(&f);
    fake_bind(&f, &io);

    CHECK(io.read && io.write && io.delay_ms, "bind fills in all three function pointers");
    CHECK(io.ctx == &f, "ctx points at the fake, so two instances are possible");

    /* it behaves like a register file: reads reflect earlier writes */
    f.regs[0x10] = 0x5A;
    CHECK(io.read(io.ctx, 0x10, b, 1) == 0 && b[0] == 0x5A, "a preloaded register reads back");

    uint8_t v = 0x38;
    CHECK(io.write(io.ctx, 0x20, &v, 1) == 0, "a write succeeds");
    CHECK(io.read(io.ctx, 0x20, b, 1) == 0 && b[0] == 0x38, "and reading it back gives what was written");

    /* multi-byte access */
    uint8_t four[4] = { 1, 2, 3, 4 };
    io.write(io.ctx, 0x30, four, 4);
    CHECK(io.read(io.ctx, 0x30, b, 4) == 0 && memcmp(b, four, 4) == 0, "multi-byte transfers work");

    /* it records what was written, in order */
    fake_init(&f); fake_bind(&f, &io);
    uint8_t x = 0x11, y = 0x22;
    io.write(io.ctx, 0x40, &x, 1);
    io.write(io.ctx, 0x41, &y, 1);
    CHECK(f.log_n == 2, "the write log records both writes");
    CHECK(f.log[0].reg == 0x40 && f.log[0].val == 0x11, "first log entry is the first write");
    CHECK(f.log[1].reg == 0x41 && f.log[1].val == 0x22, "order is preserved");

    /* fault injection: the whole reason a fake beats real hardware */
    fake_init(&f); fake_bind(&f, &io);
    f.fail_on_nth = 2; f.fail_rc = -99;
    CHECK(io.read(io.ctx, 0, b, 1) == 0, "transfer 0 succeeds");
    CHECK(io.read(io.ctx, 0, b, 1) == 0, "transfer 1 succeeds");
    CHECK(io.read(io.ctx, 0, b, 1) == -99, "transfer 2 fails as programmed");
    CHECK(io.read(io.ctx, 0, b, 1) == 0, "and it succeeds again afterwards");

    /* the clock advances without really waiting */
    fake_init(&f); fake_bind(&f, &io);
    io.delay_ms(io.ctx, 500);
    io.delay_ms(io.ctx, 250);
    CHECK(f.virtual_ms == 750, "delay advances a virtual clock rather than sleeping");

    /* two independent fakes */
    fake_t g; sensor_io_t io2;
    fake_init(&f); fake_bind(&f, &io);
    fake_init(&g); fake_bind(&g, &io2);
    uint8_t p = 0xAA, q = 0xBB;
    io.write(io.ctx, 0x50, &p, 1);
    io2.write(io2.ctx, 0x50, &q, 1);
    io.read(io.ctx, 0x50, b, 1);
    CHECK(b[0] == 0xAA, "two fakes do not share state");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- scheduler
"d-write-sched": {
sig: "Define MAX_TASKS, task_t, int sched_add(void (*fn)(void), uint32_t period_ms) and void sched_poll(void) which runs one pass rather than looping forever. Also expose task_t tasks[] and unsigned task_n so the tests can inspect overruns. A fake now_ms() is provided.",
prelude: `/* provided for you: a fake clock you control */
static uint32_t fake_now;
static uint32_t now_ms(void) { return fake_now; }
static void     advance(uint32_t ms) { fake_now += ms; }

static int  hits_a, hits_b;
static void task_a(void) { hits_a++; }
static void task_b(void) { hits_b++; }

/* a task that takes 30 ms of simulated time, to force an overrun */
static int  hits_slow;
static void task_slow(void) { hits_slow++; advance(30); }`,
test: `int main(void)
{
    fake_now = 0; hits_a = hits_b = hits_slow = 0;
    task_n = 0;
    memset(tasks, 0, sizeof tasks);

    CHECK(sched_add(NULL, 10) != 0, "rejects a null function");
    CHECK(sched_add(task_a, 0) != 0, "rejects a zero period");

    CHECK(sched_add(task_a, 10) == 0, "adds a task");
    CHECK(sched_add(task_b, 25) == 0, "adds a second task");

    /* nothing is due yet */
    sched_poll();
    CHECK(hits_a == 0 && hits_b == 0, "nothing runs before its period has elapsed");

    /* after 10 ms only task_a is due */
    advance(10); sched_poll();
    CHECK(hits_a == 1 && hits_b == 0, "runs the task whose period elapsed");

    /* after 100 ms total: a should have run about 10 times, b about 4 */
    for (int i = 0; i < 9; i++) { advance(10); sched_poll(); }
    CHECK(hits_a == 10, "10 ms task ran ten times in 100 ms");
    CHECK(hits_b == 4,  "25 ms task ran four times in 100 ms");

    /* no drift: due times advance from the previous due time */
    fake_now = 0; hits_a = 0; task_n = 0; memset(tasks, 0, sizeof tasks);
    sched_add(task_a, 10);
    for (int i = 0; i < 100; i++) { advance(10); sched_poll(); }
    CHECK(hits_a == 100, "no drift over 100 periods");

    /* overrun detection: a 30 ms task on a 10 ms period */
    fake_now = 0; hits_slow = 0; task_n = 0; memset(tasks, 0, sizeof tasks);
    sched_add(task_slow, 10);
    for (int i = 0; i < 5; i++) { advance(10); sched_poll(); }
    CHECK(hits_slow > 0, "the slow task ran");
    CHECK(tasks[0].overruns > 0, "overruns are detected and counted");

    /* wrap safety: the clock near the top of its range */
    fake_now = 0xFFFFFFF0u; hits_a = 0; task_n = 0; memset(tasks, 0, sizeof tasks);
    sched_add(task_a, 10);
    for (int i = 0; i < 5; i++) { advance(10); sched_poll(); }
    CHECK(hits_a == 5, "still correct when the millisecond counter wraps");

    T_REPORT();
    return t_fail != 0;
}`
}

});

/* attach the new entries */
if (typeof DRILLS !== "undefined") {
    DRILLS.forEach(d => {
        const t = DRILL_TESTS[d.id];
        if (t) { d.test = t.test; d.testPrelude = t.prelude || ""; d.testSig = t.sig || ""; }
    });
}
