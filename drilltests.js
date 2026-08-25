/* Unit tests for the write-the-code drills.
 *
 * Attached to DRILLS by id. Each entry is a C main() using the CHECK macro
 * from crun.js's prelude, compiled after the user's answer.
 *
 * Only drills whose answer is portable C get tests. Anything that needs real
 * hardware, a Cortex-M core or a flash controller cannot be run this way, and
 * pretending otherwise would be worse than leaving it out.
 */

const DRILL_TESTS = {

// ---------------------------------------------------------- ring buffer
"d-write-ring": {
sig: "Define RB_SIZE, rb_put(uint8_t) and rb_get(uint8_t *).",
test: `int main(void)
{
    uint8_t v;

    CHECK(rb_get(&v) == false, "empty buffer returns false");

    CHECK(rb_put(0xA5) == true, "put into empty succeeds");
    CHECK(rb_get(&v) == true && v == 0xA5, "get returns what was put");
    CHECK(rb_get(&v) == false, "buffer empty again after the get");

    /* fill it: a correct implementation sacrifices one slot */
    int n = 0;
    while (rb_put((uint8_t)(n & 0xFF))) { n++; if (n > 4096) break; }
    CHECK(n == RB_SIZE - 1, "capacity is RB_SIZE-1 (one slot sacrificed)");
    CHECK(rb_put(0x11) == false, "put on full returns false");

    /* drain and check order and contents */
    int ok = 1;
    for (int i = 0; i < n; i++) {
        if (!rb_get(&v) || v != (uint8_t)(i & 0xFF)) { ok = 0; break; }
    }
    CHECK(ok, "data comes out in order, unmodified");
    CHECK(rb_get(&v) == false, "empty after draining");

    /* wrap the indices right round several times */
    ok = 1;
    for (int i = 0; i < RB_SIZE * 5; i++) {
        if (!rb_put((uint8_t)i)) { ok = 0; break; }
        if (!rb_get(&v) || v != (uint8_t)i) { ok = 0; break; }
    }
    CHECK(ok, "survives wrapping round many times");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- CRC-16
"d-write-crc": {
sig: "Define uint16_t crc16_ccitt(const uint8_t *data, size_t len).",
test: `int main(void)
{
    CHECK(crc16_ccitt((const uint8_t *)"123456789", 9) == 0x29B1,
          "published check value: 0x29B1 for 123456789");

    CHECK(crc16_ccitt((const uint8_t *)"", 0) == 0xFFFF,
          "empty input returns the init value");

    CHECK(crc16_ccitt((const uint8_t *)"A", 1) != crc16_ccitt((const uint8_t *)"B", 1),
          "different single bytes give different results");

    /* transposition: a plain additive checksum would miss this */
    CHECK(crc16_ccitt((const uint8_t *)"AB", 2) != crc16_ccitt((const uint8_t *)"BA", 2),
          "detects a transposition");

    /* appending the CRC big-endian makes the whole frame check to zero */
    uint8_t frame[11];
    memcpy(frame, "123456789", 9);
    uint16_t c = crc16_ccitt((const uint8_t *)"123456789", 9);
    frame[9]  = (uint8_t)(c >> 8);
    frame[10] = (uint8_t)(c & 0xFF);
    CHECK(crc16_ccitt(frame, 11) == 0x0000,
          "message plus its own CRC checks to zero");

    /* a single flipped bit must change the result */
    uint8_t a[4] = { 1, 2, 3, 4 }, b[4] = { 1, 2, 3, 5 };
    CHECK(crc16_ccitt(a, 4) != crc16_ccitt(b, 4), "one changed byte changes the CRC");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- serialisation
"d-write-serial": {
sig: "Define msg_t, MSG_WIRE_LEN, msg_pack and msg_unpack.",
prelude: `typedef struct { uint8_t type; uint16_t seq; int32_t value; } msg_t;`,
test: `int main(void)
{
    uint8_t buf[32];
    memset(buf, 0xCC, sizeof buf);

    msg_t m = { 0x7A, 0x1234, -2 };
    int n = msg_pack(&m, buf, sizeof buf);
    CHECK(n == 7, "packs into exactly 7 bytes");

    CHECK(buf[0] == 0x7A, "type is first");
    CHECK(buf[1] == 0x34 && buf[2] == 0x12, "seq is little-endian, low byte first");
    CHECK(buf[3] == 0xFE && buf[4] == 0xFF && buf[5] == 0xFF && buf[6] == 0xFF,
          "-2 serialises as FE FF FF FF");
    CHECK(buf[7] == 0xCC, "nothing written past the frame");

    msg_t r;
    int u = msg_unpack(&r, buf, 7);
    CHECK(u == 7, "unpack consumes 7 bytes");
    CHECK(r.type == m.type && r.seq == m.seq && r.value == m.value, "round trip is exact");

    /* the extremes are where the arithmetic breaks */
    int ok = 1;
    int32_t vals[] = { 0, 1, -1, INT32_MAX, INT32_MIN, 32767, -32768 };
    for (unsigned i = 0; i < sizeof vals / sizeof vals[0]; i++) {
        msg_t x = { 0x01, 0xFFFF, vals[i] }, y;
        if (msg_pack(&x, buf, sizeof buf) != 7) { ok = 0; break; }
        if (msg_unpack(&y, buf, 7) != 7)        { ok = 0; break; }
        if (y.value != vals[i] || y.seq != 0xFFFF) { ok = 0; break; }
    }
    CHECK(ok, "round trip holds at INT32_MIN, INT32_MAX and zero");

    CHECK(msg_pack(&m, buf, 3) < 0, "refuses a buffer that is too small");
    CHECK(msg_unpack(&r, buf, 3) < 0, "refuses a short input");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- EMA filter
"d-write-ema": {
sig: "Define ema_t, ema_init(ema_t *, uint8_t shift) and ema_update(ema_t *, int32_t).",
test: `int main(void)
{
    ema_t f;
    ema_init(&f, 4);

    int32_t first = ema_update(&f, 1000);
    CHECK(first == 1000, "seeds from the first sample rather than ramping from zero");

    /* the failure the naive form has: it must actually reach a constant input */
    for (int i = 0; i < 500; i++) ema_update(&f, 2000);
    int32_t settled = ema_update(&f, 2000);
    CHECK(settled == 2000, "converges exactly on a constant input (does not stall short)");

    /* and it must converge from above too, without a downward bias */
    for (int i = 0; i < 500; i++) ema_update(&f, 500);
    CHECK(ema_update(&f, 500) == 500, "converges when the input falls");

    /* negative values must not be biased downward by truncation */
    ema_t g; ema_init(&g, 4);
    ema_update(&g, -1000);
    for (int i = 0; i < 500; i++) ema_update(&g, -2000);
    CHECK(ema_update(&g, -2000) == -2000, "converges exactly on a negative input");

    /* it must smooth: a step should not appear immediately at the output */
    ema_t h; ema_init(&h, 4);
    ema_update(&h, 0);
    int32_t afterStep = ema_update(&h, 1600);
    CHECK(afterStep > 0 && afterStep < 1600, "a step is smoothed, not passed straight through");

    /* two instances must not interfere */
    ema_t p, q;
    ema_init(&p, 2); ema_init(&q, 2);
    ema_update(&p, 100); ema_update(&q, 900);
    for (int i = 0; i < 100; i++) { ema_update(&p, 100); ema_update(&q, 900); }
    CHECK(ema_update(&p, 100) == 100 && ema_update(&q, 900) == 900,
          "two instances are independent");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- debounce
"d-write-debounce": {
sig: "Define btn_t, btn_ev_t (BTN_NONE, BTN_PRESSED, BTN_RELEASED) and btn_poll(btn_t *, bool).",
test: `int main(void)
{
    btn_t b;
    memset(&b, 0, sizeof b);

    /* a single bounce must not produce an event */
    CHECK(btn_poll(&b, true) == BTN_NONE, "one sample is not enough to report a press");
    CHECK(btn_poll(&b, false) == BTN_NONE, "a bounce back does not report anything");

    /* a sustained press eventually reports exactly once */
    int events = 0, firstAt = -1;
    for (int i = 0; i < 40; i++) {
        if (btn_poll(&b, true) == BTN_PRESSED) { events++; if (firstAt < 0) firstAt = i; }
    }
    CHECK(events == 1, "a sustained press reports exactly one event");
    CHECK(firstAt >= 2, "it waits for several consistent samples first");

    /* a sustained release reports exactly once */
    events = 0;
    for (int i = 0; i < 40; i++) {
        if (btn_poll(&b, false) == BTN_RELEASED) events++;
    }
    CHECK(events == 1, "a sustained release reports exactly one event");

    /* noise around the transition must not produce spurious events */
    btn_t c; memset(&c, 0, sizeof c);
    events = 0;
    bool pattern[] = { true, false, true, false, true, false, true, false };
    for (int r = 0; r < 3; r++)
        for (unsigned i = 0; i < sizeof pattern / sizeof pattern[0]; i++)
            if (btn_poll(&c, pattern[i]) != BTN_NONE) events++;
    CHECK(events == 0, "alternating noise produces no events at all");

    /* two buttons are independent */
    btn_t d, e; memset(&d, 0, sizeof d); memset(&e, 0, sizeof e);
    int de = 0, ee = 0;
    for (int i = 0; i < 40; i++) {
        if (btn_poll(&d, true)  == BTN_PRESSED) de++;
        if (btn_poll(&e, false) == BTN_PRESSED) ee++;
    }
    CHECK(de == 1 && ee == 0, "two buttons do not interfere");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- counts to mV
"d-write-scale": {
sig: "Define int32_t adc_to_mv(uint16_t count, uint16_t vref_mv).",
test: `int main(void)
{
    CHECK(adc_to_mv(0, 3300) == 0, "zero counts is zero millivolts");
    CHECK(adc_to_mv(4095, 3300) == 3300, "full scale is exactly the reference");
    CHECK(adc_to_mv(4095, 5000) == 5000, "full scale holds at a 5000 mV reference");

    /* dividing before multiplying would give 0 here */
    CHECK(adc_to_mv(1, 3300) > 0, "a single count is not lost to integer division");

    /* rounding to nearest: truncation would give 0 here, rounding gives 1 */
    CHECK(adc_to_mv(1, 3300) == 1, "rounds to nearest rather than truncating");

    /* midpoint has a known exact answer */
    CHECK(adc_to_mv(2048, 3300) == 1650, "midpoint is 1650 mV");

    /* sweep the whole range against a floating point reference */
    int worst = 0, ok = 1;
    for (int c = 0; c <= 4095; c++) {
        double want = (double)c * 3300.0 / 4095.0;
        int32_t got = adc_to_mv((uint16_t)c, 3300);
        int err = (int)(got - want);
        if (err < 0) err = -err;
        if (err > worst) worst = err;
        if (got < 0 || got > 3300) { ok = 0; break; }
    }
    CHECK(ok, "never goes negative or exceeds the reference");
    CHECK(worst <= 1, "within one millivolt of the exact value across the whole range");

    /* the largest plausible reference must not overflow */
    CHECK(adc_to_mv(4095, 5000) == 5000, "no intermediate overflow at the top of the range");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- moving average
"d-write-mavg": {
sig: "Define MAVG_N, mavg_t, mavg_init(mavg_t *) and mavg_update(mavg_t *, int32_t).",
test: `int main(void)
{
    mavg_t m;
    mavg_init(&m);

    CHECK(mavg_update(&m, 100) == 100, "first sample is reported, not averaged with zeros");

    /* a constant input must settle exactly on that constant */
    for (int i = 0; i < MAVG_N * 3; i++) mavg_update(&m, 400);
    CHECK(mavg_update(&m, 400) == 400, "settles exactly on a constant input");

    /* a full window of a known ramp has a known mean */
    mavg_t r; mavg_init(&r);
    for (int i = 0; i < MAVG_N; i++) mavg_update(&r, 100);
    CHECK(mavg_update(&r, 100) == 100, "window full of a constant gives that constant");

    /* an impulse must be attenuated, not passed through */
    mavg_t p; mavg_init(&p);
    for (int i = 0; i < MAVG_N * 2; i++) mavg_update(&p, 0);
    int32_t spike = mavg_update(&p, 1000);
    CHECK(spike > 0 && spike < 1000, "an impulse is attenuated");

    /* and it must fully leave the window afterwards */
    for (int i = 0; i < MAVG_N; i++) mavg_update(&p, 0);
    CHECK(mavg_update(&p, 0) == 0, "the impulse leaves the window completely");

    /* negatives handled symmetrically */
    mavg_t n; mavg_init(&n);
    for (int i = 0; i < MAVG_N * 2; i++) mavg_update(&n, -400);
    CHECK(mavg_update(&n, -400) == -400, "works with negative values");

    /* two instances independent */
    mavg_t a, b; mavg_init(&a); mavg_init(&b);
    for (int i = 0; i < MAVG_N * 2; i++) { mavg_update(&a, 10); mavg_update(&b, 90); }
    CHECK(mavg_update(&a, 10) == 10 && mavg_update(&b, 90) == 90, "instances are independent");

    T_REPORT();
    return t_fail != 0;
}`
},

// ---------------------------------------------------------- wrap-safe timeout
"d-write-timeout": {
sig: "Define int periph_wait_ready(uint32_t timeout_ms). A fake clock and SR are provided.",
prelude: `/* provided for you */
#define SR_READY   0x01u
#define ETIMEDOUT  110

static uint32_t fake_now;              /* the millisecond counter */
static uint32_t reads_until_ready;     /* SR returns 0 this many times first */

static uint32_t now_ms(void) { return fake_now++; }

static uint32_t sr_read(void)
{
    if (reads_until_ready == 0u) return SR_READY;
    reads_until_ready--;
    return 0u;
}
#define SR sr_read()`,
test: `int main(void)
{
    /* already ready */
    fake_now = 0; reads_until_ready = 0;
    CHECK(periph_wait_ready(1000) == 0, "returns success when already ready");

    /* ready after a while, within the timeout */
    fake_now = 0; reads_until_ready = 20;
    CHECK(periph_wait_ready(1000) == 0, "returns success when it becomes ready in time");

    /* never ready: must give up rather than hang */
    fake_now = 0; reads_until_ready = 0xFFFFFFFFu;
    int rc = periph_wait_ready(50);
    CHECK(rc != 0, "returns an error when it never becomes ready");
    CHECK(fake_now < 100000u, "gave up rather than looping forever");

    /* the point of the exercise: correct when the counter wraps mid-wait */
    fake_now = 0xFFFFFFF0u; reads_until_ready = 40;
    CHECK(periph_wait_ready(1000) == 0,
          "still succeeds when the counter wraps during the wait");

    /* and it must still time out across the wrap, not return instantly */
    fake_now = 0xFFFFFFF0u; reads_until_ready = 0xFFFFFFFFu;
    uint32_t before = fake_now;
    rc = periph_wait_ready(100);
    CHECK(rc != 0, "still times out correctly across the wrap");
    CHECK((uint32_t)(fake_now - before) > 50u,
          "actually waited rather than returning immediately");

    T_REPORT();
    return t_fail != 0;
}`
}

};

/* attach to the drills */
if (typeof DRILLS !== "undefined") {
    DRILLS.forEach(d => {
        const t = DRILL_TESTS[d.id];
        if (t) { d.test = t.test; d.testPrelude = t.prelude || ""; d.testSig = t.sig || ""; }
    });
}
