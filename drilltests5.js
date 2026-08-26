/* Unit tests for the pattern drills.
 *
 * Kept as small as the drills are. Each one checks the property the pattern
 * exists to guarantee, and each was verified to fail against the obvious wrong
 * answer: 1 instead of 1u, forgetting to clear a field, an unbounded wait,
 * dividing before multiplying, moving the ring index before writing.
 */

Object.assign(DRILL_TESTS, {

"d-pat-bits": {
sig: "Define bit_set, bit_clear, bit_toggle and bit_test, all taking (uint32_t r, unsigned n).",
test: `int main(void)
{
    CHECK(bit_set(0u, 0)    == 0x00000001u, "set bit 0");
    CHECK(bit_set(0u, 31)   == 0x80000000u, "set bit 31 (needs 1u, not 1)");
    CHECK(bit_set(0xFu, 2)  == 0x0000000Fu, "setting a set bit changes nothing");

    CHECK(bit_clear(0xFFFFFFFFu, 0)  == 0xFFFFFFFEu, "clear bit 0");
    CHECK(bit_clear(0xFFFFFFFFu, 31) == 0x7FFFFFFFu, "clear bit 31");
    CHECK(bit_clear(0u, 5)           == 0u,          "clearing a clear bit changes nothing");

    CHECK(bit_toggle(0u, 3)          == 0x00000008u, "toggle a clear bit sets it");
    CHECK(bit_toggle(0x00000008u, 3) == 0u,          "toggle a set bit clears it");
    CHECK(bit_toggle(bit_toggle(0xA5u, 7), 7) == 0xA5u, "toggling twice restores");

    CHECK(bit_test(0x00000001u, 0),        "test a set bit");
    CHECK(bit_test(0x80000000u, 31),       "test bit 31");
    CHECK(!bit_test(0xFFFFFFFEu, 0),       "test a clear bit");

    /* the whole point: nothing else moves */
    CHECK(bit_set(0xAAAA5555u, 0)   == 0xAAAA5555u, "bit already set: no other bit moves");
    CHECK(bit_clear(0xAAAA5555u, 1) == 0xAAAA5555u, "bit already clear: no other bit moves");

    int all = 1;
    for (unsigned n = 0; n < 32u; n++) {
        uint32_t s = bit_set(0u, n);
        if (s != (1u << n)) all = 0;
        if (bit_clear(s, n) != 0u) all = 0;
        if (!bit_test(s, n)) all = 0;
    }
    CHECK(all, "every bit position 0..31 behaves");

    T_REPORT();
    return 0;
}`
},

"d-pat-field": {
sig: "Define uint32_t field_get(uint32_t reg, uint32_t mask, unsigned shift) and uint32_t field_set(uint32_t reg, uint32_t mask, unsigned shift, uint32_t v).",
test: `#define M  0x00000F00u      /* a 4-bit field at bit 8 */
#define S  8u

int main(void)
{
    CHECK(field_get(0x00000A00u, M, S) == 0xAu, "reads the field");
    CHECK(field_get(0xFFFFFFFFu, M, S) == 0xFu, "reads a full field");
    CHECK(field_get(0xFFFFF0FFu, M, S) == 0x0u, "reads an empty field");

    CHECK(field_set(0u, M, S, 0x5u) == 0x00000500u, "writes into an empty register");

    /* the one people get wrong: the field must be REPLACED, not ORed */
    CHECK(field_set(0x00000F00u, M, S, 0x1u) == 0x00000100u,
          "replaces the old field rather than ORing over it");
    CHECK(field_set(0x00000F00u, M, S, 0x0u) == 0x00000000u,
          "can set the field back to zero");

    /* other bits untouched */
    CHECK(field_set(0xABCD01EFu, M, S, 0x7u) == 0xABCD07EFu,
          "leaves every other bit alone");

    /* an over-large value must not spill upward */
    CHECK(field_set(0u, M, S, 0xFFu) == 0x00000F00u,
          "an over-large value is masked, not spilled into the bits above");

    /* a field at bit 0, and one at the top */
    CHECK(field_get(0x0000000Bu, 0x0000000Fu, 0u) == 0xBu, "field at bit 0");
    CHECK(field_set(0u, 0xF0000000u, 28u, 0x9u) == 0x90000000u, "field at the top");

    T_REPORT();
    return 0;
}`
},

"d-pat-wait": {
sig: "Define bool wait_ready(bool (*is_ready)(void), uint32_t timeout_ms, void (*delay_ms)(uint32_t)). Counters ready_after, polls and slept_total are provided.",
prelude: `/* the fake peripheral: becomes ready after a set number of polls */
static int      ready_after;
static int      polls;
static uint32_t slept_total;

static bool fake_ready(void)      { return ++polls > ready_after; }
static void fake_delay(uint32_t m){ slept_total += m; }

static void w_reset(int after) { ready_after = after; polls = 0; slept_total = 0; }
`,
test: `int main(void)
{
    /* already ready: must return at once and never sleep */
    w_reset(0);
    CHECK(wait_ready(fake_ready, 100u, fake_delay) == true, "already ready: succeeds");
    CHECK(slept_total == 0u,  "already ready: does not sleep at all");
    CHECK(polls == 1,         "already ready: checks before waiting");

    /* ready after a few polls */
    w_reset(3);
    CHECK(wait_ready(fake_ready, 100u, fake_delay) == true, "becomes ready: succeeds");
    CHECK(slept_total <= 4u, "waits only as long as it needed to");

    /* never ready: must give up, and must not run forever */
    w_reset(1000000);
    CHECK(wait_ready(fake_ready, 10u, fake_delay) == false, "never ready: returns false");
    CHECK(slept_total <= 10u, "never ready: sleeps no longer than the timeout");
    CHECK(polls >= 10,        "never ready: actually polled");

    /* a zero timeout still gets one look */
    w_reset(0);
    CHECK(wait_ready(fake_ready, 0u, fake_delay) == true,
          "a zero timeout still checks once");

    w_reset(1000000);
    CHECK(wait_ready(fake_ready, 0u, fake_delay) == false,
          "a zero timeout on a dead device returns false");
    CHECK(slept_total == 0u, "and does not sleep");

    T_REPORT();
    return 0;
}`
},

"d-pat-clamp": {
sig: "Define int32_t clamp_i32(int32_t v, int32_t lo, int32_t hi) and uint8_t add_sat_u8(uint8_t a, uint8_t b).",
test: `int main(void)
{
    CHECK(clamp_i32(5, 0, 10)    == 5,   "inside the range passes through");
    CHECK(clamp_i32(-1, 0, 10)   == 0,   "below the floor returns the floor");
    CHECK(clamp_i32(11, 0, 10)   == 10,  "above the ceiling returns the ceiling");
    CHECK(clamp_i32(0, 0, 10)    == 0,   "exactly the floor is allowed");
    CHECK(clamp_i32(10, 0, 10)   == 10,  "exactly the ceiling is allowed");
    CHECK(clamp_i32(-50, -20, 20) == -20, "negative range works");
    CHECK(clamp_i32(7, 7, 7)     == 7,   "a single-value range");

    CHECK(add_sat_u8(1u, 2u)     == 3u,   "an ordinary add");
    CHECK(add_sat_u8(200u, 55u)  == 255u, "exactly 255 does not saturate early");
    CHECK(add_sat_u8(200u, 56u)  == 255u, "one over saturates rather than wrapping to 0");
    CHECK(add_sat_u8(255u, 255u) == 255u, "the worst case saturates");
    CHECK(add_sat_u8(0u, 0u)     == 0u,   "zero plus zero");
    CHECK(add_sat_u8(255u, 1u)   == 255u, "the classic wrap case");

    int sound = 1;
    for (unsigned a = 0; a < 256u; a += 7u)
        for (unsigned b = 0; b < 256u; b += 11u) {
            unsigned want = (a + b > 255u) ? 255u : a + b;
            if (add_sat_u8((uint8_t)a, (uint8_t)b) != want) { sound = 0; }
        }
    CHECK(sound, "agrees with a reference across the range");

    T_REPORT();
    return 0;
}`
},

"d-pat-bytes": {
sig: "Define uint16_t be16_get(const uint8_t *p) and void be16_put(uint8_t *p, uint16_t v).",
test: `int main(void)
{
    uint8_t a[2] = { 0x12, 0x34 };
    CHECK(be16_get(a) == 0x1234u, "big-endian: first byte is most significant");

    uint8_t b[2] = { 0x00, 0xFF };
    CHECK(be16_get(b) == 0x00FFu, "low byte only");

    uint8_t c[2] = { 0xFF, 0x00 };
    CHECK(be16_get(c) == 0xFF00u, "high byte only");

    uint8_t d[2] = { 0x80, 0x01 };
    CHECK(be16_get(d) == 0x8001u, "top bit set does not sign-extend");

    uint8_t z[2] = { 0, 0 };
    CHECK(be16_get(z) == 0u, "zero");

    uint8_t out[2] = { 0xAA, 0xAA };
    be16_put(out, 0x1234u);
    CHECK(out[0] == 0x12u && out[1] == 0x34u, "put writes most significant first");

    be16_put(out, 0xFFFFu);
    CHECK(out[0] == 0xFFu && out[1] == 0xFFu, "put of all ones");

    be16_put(out, 0x00FFu);
    CHECK(out[0] == 0x00u && out[1] == 0xFFu, "put masks each byte");

    /* round trip over the whole range */
    int rt = 1;
    for (uint32_t v = 0; v <= 0xFFFFu; v += 97u) {
        uint8_t t[2];
        be16_put(t, (uint16_t)v);
        if (be16_get(t) != (uint16_t)v) { rt = 0; break; }
    }
    CHECK(rt, "get and put round trip across the range");

    /* must work from an unaligned address: rules out a pointer cast */
    uint8_t raw[5] = { 0x00, 0xDE, 0xAD, 0x00, 0x00 };
    CHECK(be16_get(raw + 1) == 0xDEADu, "works from an unaligned address");
    be16_put(raw + 3, 0xBEEFu);
    CHECK(raw[3] == 0xBEu && raw[4] == 0xEFu, "put works unaligned too");

    T_REPORT();
    return 0;
}`
},

"d-pat-errcheck": {
sig: "Define int do_sequence(void), calling step_a, step_b then step_c. Their return values and call counters are provided.",
prelude: `/* each step returns whatever you set, and records that it ran */
static int rc_a, rc_b, rc_c;
static int ran_a, ran_b, ran_c;

static int step_a(void) { ran_a++; return rc_a; }
static int step_b(void) { ran_b++; return rc_b; }
static int step_c(void) { ran_c++; return rc_c; }

static void seq_reset(int a, int b, int c)
{
    rc_a = a; rc_b = b; rc_c = c;
    ran_a = ran_b = ran_c = 0;
}
`,
test: `int main(void)
{
    /* all succeed */
    seq_reset(0, 0, 0);
    CHECK(do_sequence() == 0, "all steps succeed: returns 0");
    CHECK(ran_a == 1 && ran_b == 1 && ran_c == 1, "all three ran");

    /* a fails */
    seq_reset(-11, 0, 0);
    CHECK(do_sequence() == -11, "returns a's error code, not a generic -1");
    CHECK(ran_a == 1, "a ran");
    CHECK(ran_b == 0, "b did NOT run after a failed");
    CHECK(ran_c == 0, "c did NOT run after a failed");

    /* b fails */
    seq_reset(0, -22, 0);
    CHECK(do_sequence() == -22, "returns b's error code");
    CHECK(ran_b == 1, "b ran");
    CHECK(ran_c == 0, "c did NOT run after b failed");

    /* c fails */
    seq_reset(0, 0, -33);
    CHECK(do_sequence() == -33, "returns c's error code");
    CHECK(ran_a == 1 && ran_b == 1 && ran_c == 1, "all three ran before c failed");

    /* distinct codes stay distinct */
    seq_reset(-5, 0, 0);
    int first = do_sequence();
    seq_reset(0, -6, 0);
    int second = do_sequence();
    CHECK(first != second, "different failures give different codes");

    T_REPORT();
    return 0;
}`
},

"d-pat-macros": {
sig: "Define the macros ARRAY_SIZE(a), MIN(a, b) and MAX(a, b).",
test: `int main(void)
{
    int  a[10];
    char c[3];
    CHECK(ARRAY_SIZE(a) == 10u, "ARRAY_SIZE of an int array");
    CHECK(ARRAY_SIZE(c) == 3u,  "ARRAY_SIZE of a char array");

    CHECK(MIN(1, 2) == 1, "MIN picks the smaller");
    CHECK(MAX(1, 2) == 2, "MAX picks the larger");
    CHECK(MIN(2, 2) == 2, "MIN of equals");
    CHECK(MIN(-5, 3) == -5, "MIN with a negative");

    /* Body-bracketing. These must assign first: an unbracketed macro swallows
       the comparison as well, so writing MIN(1,2)*3 == 3 inline would pass for
       the wrong reason. */
    int r1 = MIN(1, 2) * 3;   CHECK(r1 == 3, "MIN(1,2)*3 is 3, so the body is bracketed");
    int r2 = MAX(1, 2) * 3;   CHECK(r2 == 6, "MAX(1,2)*3 is 6");
    int r3 = 2 * MIN(3, 4);   CHECK(r3 == 6, "multiplication on the left too");
    int r4 = 10 - MIN(1, 2);  CHECK(r4 == 9, "subtraction around it");

    /* Argument-bracketing. */
    int x = 5, y = 1;
    int r5 = MIN(x, y + 10);  CHECK(r5 == 5,  "MIN(x, y+10) treats y+10 as one value");
    int r6 = MAX(x, y + 10);  CHECK(r6 == 11, "MAX(x, y+10) likewise");
    int r7 = MIN(1 + 1, 3);   CHECK(r7 == 2,  "an expression as the first argument");

    /* used where a constant expression is needed */
    int buf[MIN(8, 16)];
    CHECK(ARRAY_SIZE(buf) == 8u, "usable in a constant expression");

    T_REPORT();
    return 0;
}`
},

"d-pat-ring": {
sig: "RB_SIZE and rb_t are provided. Define bool rb_put(rb_t *rb, uint8_t v) and bool rb_get(rb_t *rb, uint8_t *out).",
prelude: `#define RB_SIZE 16

typedef struct {
    uint8_t  buf[RB_SIZE];
    uint16_t head, tail;
} rb_t;
`,
test: `int main(void)
{
    rb_t rb = { {0}, 0, 0 };
    uint8_t v;

    CHECK(rb_get(&rb, &v) == false, "empty at the start");

    CHECK(rb_put(&rb, 0x41) == true, "put one");
    CHECK(rb_get(&rb, &v) == true,   "get one");
    CHECK(v == 0x41,                 "and it is what went in");
    CHECK(rb_get(&rb, &v) == false,  "empty again");

    /* order */
    rb_put(&rb, 'a'); rb_put(&rb, 'b'); rb_put(&rb, 'c');
    rb_get(&rb, &v); CHECK(v == 'a', "FIFO order: first");
    rb_get(&rb, &v); CHECK(v == 'b', "FIFO order: second");
    rb_get(&rb, &v); CHECK(v == 'c', "FIFO order: third");

    /* capacity: one slot is sacrificed, so RB_SIZE - 1 fit */
    rb_t f = { {0}, 0, 0 };
    int n = 0;
    while (rb_put(&f, (uint8_t)n)) n++;
    CHECK(n == RB_SIZE - 1, "holds RB_SIZE - 1, because one slot distinguishes full from empty");
    CHECK(rb_put(&f, 0xFF) == false, "refuses when full rather than overwriting");

    /* and everything comes back intact and in order */
    int ok = 1;
    for (int i = 0; i < RB_SIZE - 1; i++) {
        if (!rb_get(&f, &v) || v != (uint8_t)i) { ok = 0; break; }
    }
    CHECK(ok, "a full buffer empties in order with nothing lost");
    CHECK(rb_get(&f, &v) == false, "empty after draining");

    /* wrap: keep going well past the end of the array */
    rb_t w = { {0}, 0, 0 };
    int wrapped = 1;
    for (int i = 0; i < 500; i++) {
        if (!rb_put(&w, (uint8_t)i))          { wrapped = 0; break; }
        if (!rb_get(&w, &v) || v != (uint8_t)i) { wrapped = 0; break; }
    }
    CHECK(wrapped, "wraps correctly over 500 put/get cycles");

    /* indices stay inside the array */
    CHECK(w.head < RB_SIZE && w.tail < RB_SIZE, "indices are always masked into range");

    T_REPORT();
    return 0;
}`
},

"d-pat-scale": {
sig: "Define uint32_t counts_to_mv(uint16_t counts, uint32_t vref_mv).",
test: `int main(void)
{
    CHECK(counts_to_mv(0u, 3300u)    == 0u,    "zero counts is zero mV");
    CHECK(counts_to_mv(4095u, 3300u) == 3300u, "full scale is vref");

    /* the test that catches dividing before multiplying */
    CHECK(counts_to_mv(2048u, 3300u) > 1600u &&
          counts_to_mv(2048u, 3300u) < 1700u,
          "half scale is about half of vref, not 0");
    CHECK(counts_to_mv(1u, 3300u) == 0u,   "one count truncates to 0 mV");
    CHECK(counts_to_mv(2u, 3300u) == 1u,   "two counts is 1 mV");

    int monotonic = 1;
    uint32_t prev = 0;
    for (uint32_t c = 0; c <= 4095u; c += 13u) {
        uint32_t mv = counts_to_mv((uint16_t)c, 3300u);
        if (mv < prev) { monotonic = 0; break; }
        prev = mv;
    }
    CHECK(monotonic, "never decreases as counts rise");

    /* a large vref, where a 16-bit intermediate would overflow */
    CHECK(counts_to_mv(4095u, 60000u) == 60000u,
          "no intermediate overflow with a large vref");
    CHECK(counts_to_mv(2048u, 60000u) > 29000u,
          "and the midpoint is still sensible");

    /* agrees with 64-bit arithmetic, so the order of operations is right */
    int agrees = 1;
    for (uint32_t c = 0; c <= 4095u; c += 7u) {
        uint32_t want = (uint32_t)(((uint64_t)c * 3300u) / 4095u);
        if (counts_to_mv((uint16_t)c, 3300u) != want) { agrees = 0; break; }
    }
    CHECK(agrees, "matches exact arithmetic across the range");

    T_REPORT();
    return 0;
}`
},

"d-pat-seam": {
sig: "Define dev_io_t (read, write, delay_ms, ctx), struct dev_s, and int dev_init(const dev_io_t *io, dev_t **out). dev_t, DEV_EINVAL, DEV_ENOMEM and a fake transport are provided.",
prelude: `#define DEV_EINVAL (-1)
#define DEV_ENOMEM (-2)

typedef struct dev_s dev_t;

/* a fake transport, so the copy and the ctx can be checked */
static int  fake_reads;
static void *fake_seen_ctx;
static int  fake_ctx_marker = 0x5A;

static int  fake_read (void *ctx, uint8_t reg, uint8_t *buf, size_t len)
{ (void)reg; (void)buf; (void)len; fake_reads++; fake_seen_ctx = ctx; return 0; }

static int  fake_write(void *ctx, uint8_t reg, const uint8_t *buf, size_t len)
{ (void)ctx; (void)reg; (void)buf; (void)len; return 0; }

static void fake_delay(void *ctx, uint32_t ms) { (void)ctx; (void)ms; }
`,
test: `int main(void)
{
    dev_t *d = (dev_t *)0xDEADBEEF;      /* poisoned, to prove *out is untouched */

    /* NULL arguments */
    CHECK(dev_init(NULL, &d) == DEV_EINVAL, "NULL io is rejected");
    CHECK(d == (dev_t *)0xDEADBEEF,         "and *out is untouched");

    dev_io_t io = { fake_read, fake_write, fake_delay, &fake_ctx_marker };
    CHECK(dev_init(&io, NULL) == DEV_EINVAL, "NULL out is rejected");

    /* NULL function pointers, one at a time */
    dev_io_t bad;

    bad = io; bad.read = NULL;
    d = (dev_t *)0xDEADBEEF;
    CHECK(dev_init(&bad, &d) == DEV_EINVAL, "NULL read is rejected");
    CHECK(d == (dev_t *)0xDEADBEEF,         "and *out is still untouched");

    bad = io; bad.write = NULL;
    CHECK(dev_init(&bad, &d) == DEV_EINVAL, "NULL write is rejected");

    bad = io; bad.delay_ms = NULL;
    CHECK(dev_init(&bad, &d) == DEV_EINVAL, "NULL delay_ms is rejected");

    /* success */
    d = NULL;
    CHECK(dev_init(&io, &d) == 0, "a complete transport succeeds");
    CHECK(d != NULL,              "and hands back a handle");

    /* the transport was COPIED, so the caller's struct need not survive */
    {
        dev_io_t local = { fake_read, fake_write, fake_delay, &fake_ctx_marker };
        dev_t *d2 = NULL;
        CHECK(dev_init(&local, &d2) == 0, "init from a stack transport succeeds");
        memset(&local, 0, sizeof local);  /* the caller's copy goes away */

        fake_reads = 0; fake_seen_ctx = NULL;
        uint8_t b;
        struct probe { dev_io_t io; };    /* same first member, so we can call through */
        ((struct probe *)d2)->io.read(((struct probe *)d2)->io.ctx, 0x00, &b, 1);
        CHECK(fake_reads == 1, "the device still works after the caller's struct is gone");
        CHECK(fake_seen_ctx == &fake_ctx_marker, "and ctx is passed back untouched");
    }

    T_REPORT();
    return 0;
}`
}

});

/* attach to the drills */
if (typeof DRILLS !== "undefined") {
    DRILLS.forEach(d => {
        const t = DRILL_TESTS[d.id];
        if (t) { d.test = t.test; d.testPrelude = t.prelude || ""; d.testSig = t.sig || ""; }
    });
}
