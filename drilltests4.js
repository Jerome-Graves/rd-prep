/* Unit tests for the Zephyr write drills.
 *
 * Zephyr headers do not exist on the host, so each prelude supplies a small
 * fake of exactly the API the answer uses. That is not a workaround for the
 * drill: it is how Zephyr code is genuinely tested off-target, and it only
 * works because the device pointer and the dt_spec are already seams.
 */

Object.assign(DRILL_TESTS, {

// ------------------------------------------------- a driver read, off target
"d-write-z-sensor": {
sig: "Define int widget_read(const struct device *dev, uint16_t *out). The fake device, config struct, i2c_burst_read_dt and REG_DATA are provided.",
prelude: `/* --- a minimal fake of the Zephyr pieces this needs ------------------- */
#define MU __attribute__((unused))
#define EINVAL 22
#define EIO     5
#define EBUSY  16
#define ENODEV 19

struct device { const char *name; const void *config; void *data; };

struct i2c_dt_spec { const struct device *bus; uint16_t addr; };

struct widget_config { struct i2c_dt_spec bus; };
struct widget_data   { uint16_t last; };

#define REG_DATA 0x28

/* the fake bus: what it will return, and what it recorded */
static int      fk_rc;                /* what the next read returns */
static uint8_t  fk_bytes[2];          /* what it hands back */
static int      fk_calls;
static uint8_t  fk_last_reg;
static uint16_t fk_last_addr;

MU static int i2c_burst_read_dt(const struct i2c_dt_spec *spec, uint8_t reg,
                             uint8_t *buf, uint32_t len)
{
    fk_calls++;
    fk_last_reg  = reg;
    fk_last_addr = spec->addr;
    if (fk_rc != 0) return fk_rc;     /* on failure, buf is left alone */
    for (uint32_t i = 0; i < len && i < 2u; i++) buf[i] = fk_bytes[i];
    return 0;
}

static const struct widget_config test_cfg = { .bus = { .bus = NULL, .addr = 0x19 } };
static struct widget_data          test_data;
static const struct device         test_dev = { "widget", &test_cfg, &test_data, };
`,
test: `int main(void)
{
    uint16_t v;
    int rc;

    /* a normal read, assembled big-endian */
    fk_rc = 0; fk_bytes[0] = 0x12; fk_bytes[1] = 0x34;
    fk_calls = 0; v = 0xAAAA;
    rc = widget_read(&test_dev, &v);
    CHECK(rc == 0,        "returns 0 on success");
    CHECK(v == 0x1234u,   "assembles big-endian, high byte first");
    CHECK(fk_calls == 1,  "reads the bus exactly once");
    CHECK(fk_last_reg == REG_DATA, "reads from REG_DATA");
    CHECK(fk_last_addr == 0x19,    "uses the address from the config, not a global");

    /* the top bit set: no signed promotion trouble */
    fk_rc = 0; fk_bytes[0] = 0xFF; fk_bytes[1] = 0xFF; v = 0;
    CHECK(widget_read(&test_dev, &v) == 0, "reads 0xFFFF");
    CHECK(v == 0xFFFFu,                    "0xFFFF assembles correctly");

    fk_rc = 0; fk_bytes[0] = 0x80; fk_bytes[1] = 0x00; v = 0;
    widget_read(&test_dev, &v);
    CHECK(v == 0x8000u, "top bit set does not sign-extend");

    /* zero */
    fk_rc = 0; fk_bytes[0] = 0x00; fk_bytes[1] = 0x00; v = 0xFFFF;
    widget_read(&test_dev, &v);
    CHECK(v == 0u, "reads zero");

    /* a bus failure: the error passes through and the output is untouched */
    fk_rc = -EBUSY; v = 0x5555;
    rc = widget_read(&test_dev, &v);
    CHECK(rc == -EBUSY, "passes the bus error through unchanged, not -EIO");
    CHECK(v == 0x5555u, "leaves the output untouched when the read fails");

    fk_rc = -ENODEV; v = 0x1111;
    rc = widget_read(&test_dev, &v);
    CHECK(rc == -ENODEV, "a different bus error is also passed through");
    CHECK(v == 0x1111u,  "still untouched");

    /* a NULL output is rejected, and must not reach the bus */
    fk_rc = 0; fk_calls = 0;
    rc = widget_read(&test_dev, NULL);
    CHECK(rc == -EINVAL, "NULL output gives -EINVAL");
    CHECK(fk_calls == 0, "and does not touch the bus first");

    T_REPORT();
    return 0;
}`
},

// ---------------------------------------------- deferred work with a retry
"d-write-z-worker": {
sig: "Define void sampler_submit(void) and the work handler. A fake queue, k_work_delayable, k_work_schedule_for_queue, sensor_read, publish and report_failure are provided; sampler_q and MAX_TRIES too.",
prelude: `/* --- a fake work queue you can step by hand -------------------------- */
#define MU __attribute__((unused))
#define MAX_TRIES 3

typedef struct { int ms; } k_timeout_t;
#define K_MSEC(x) ((k_timeout_t){ (x) })
#define K_NO_WAIT ((k_timeout_t){ 0 })

struct k_work;
typedef void (*k_work_handler_t)(struct k_work *w);
struct k_work { k_work_handler_t handler; };
struct k_work_delayable { struct k_work work; };
struct k_work_q { int dummy; };

static struct k_work_q sampler_q;

/* what the fake queue is holding */
static k_work_handler_t q_handler;
static int q_pending;          /* is something scheduled? */
static int q_delay_ms;         /* the delay it was scheduled with */
static int q_schedules;        /* how many times anything was scheduled */
static int q_wrong_queue;      /* set if the system queue was used */

MU static int k_work_schedule_for_queue(struct k_work_q *q,
                                     struct k_work_delayable *dw, k_timeout_t d)
{
    if (q != &sampler_q) q_wrong_queue++;
    q_handler  = dw->work.handler;
    q_delay_ms = d.ms;
    q_pending  = 1;
    q_schedules++;
    return 0;
}

/* the system-queue version, so using it by mistake is detectable */
MU static int k_work_schedule(struct k_work_delayable *dw, k_timeout_t d)
{
    q_wrong_queue++;
    q_handler = dw->work.handler; q_delay_ms = d.ms; q_pending = 1; q_schedules++;
    return 0;
}

MU static void k_work_init_delayable(struct k_work_delayable *dw, k_work_handler_t h)
{ dw->work.handler = h; }

/* sleeping is not allowed in a handler: calling this fails the drill */
static int q_slept;
MU static void k_sleep(k_timeout_t t) { (void)t; q_slept++; }
#define k_msleep(ms) k_sleep(K_MSEC(ms))

/* run whatever is scheduled, as the queue thread would */
MU static void q_run_once(void)
{
    if (!q_pending) return;
    q_pending = 0;
    q_handler(NULL);
}

/* --- the sensor, and the two outcomes -------------------------------- */
static int      s_rc;          /* what sensor_read returns */
static uint16_t s_val;
static int      s_reads;
MU static int sensor_read(uint16_t *out) { s_reads++; if (s_rc) return s_rc; *out = s_val; return 0; }

static int      pub_calls;
static uint16_t pub_last;
MU static void publish(uint16_t v) { pub_calls++; pub_last = v; }

static int fail_calls, fail_last;
MU static void report_failure(int rc) { fail_calls++; fail_last = rc; }

MU static void q_reset(void)
{
    q_pending = q_delay_ms = q_schedules = q_wrong_queue = q_slept = 0;
    s_reads = pub_calls = fail_calls = fail_last = 0;
}
`,
test: `int main(void)
{
    /* first attempt succeeds */
    q_reset(); s_rc = 0; s_val = 0x1234;
    sampler_submit();
    CHECK(q_pending == 1,        "submitting schedules the work");
    CHECK(q_delay_ms == 20,      "schedules it with the 20 ms settle delay");
    CHECK(q_wrong_queue == 0,    "uses the dedicated queue, not the system one");
    CHECK(s_reads == 0,          "does not read the sensor from the submit path");
    q_run_once();
    CHECK(s_reads == 1,          "the handler reads once");
    CHECK(pub_calls == 1,        "publishes on success");
    CHECK(pub_last == 0x1234u,   "publishes the value read");
    CHECK(q_pending == 0,        "does not reschedule after success");
    CHECK(fail_calls == 0,       "does not report a failure");
    CHECK(q_slept == 0,          "never sleeps in the handler");

    /* fails twice then succeeds */
    q_reset(); s_rc = -5; s_val = 0x4321;
    sampler_submit();
    q_run_once();
    CHECK(q_pending == 1,   "reschedules after the first failure");
    CHECK(q_delay_ms == 20, "reschedules with the same delay");
    q_run_once();
    CHECK(q_pending == 1,   "reschedules after the second failure");
    s_rc = 0;
    q_run_once();
    CHECK(pub_calls == 1,   "publishes once it finally succeeds");
    CHECK(fail_calls == 0,  "and does not report a failure");
    CHECK(q_pending == 0,   "stops rescheduling once it works");

    /* fails every time: three attempts, then report and stop */
    q_reset(); s_rc = -77;
    sampler_submit();
    q_run_once(); q_run_once(); q_run_once();
    CHECK(s_reads == MAX_TRIES, "attempts exactly MAX_TRIES times");
    CHECK(fail_calls == 1,      "reports the failure once");
    CHECK(fail_last == -77,     "reports the error it actually got");
    CHECK(q_pending == 0,       "stops rescheduling after the last attempt");
    CHECK(pub_calls == 0,       "publishes nothing");
    CHECK(q_slept == 0,         "still never sleeps");

    /* a fresh trigger must not inherit the previous attempt count */
    q_reset(); s_rc = -1;
    sampler_submit();
    q_run_once(); q_run_once();      /* two failures, not yet given up */
    s_rc = -1;
    sampler_submit();                 /* fresh trigger */
    q_run_once(); q_run_once();
    CHECK(fail_calls == 0, "a fresh submit resets the retry counter");

    T_REPORT();
    return 0;
}`
},

// -------------------------------------------------- ISR to thread, counted
"d-write-z-msgq": {
sig: "Define void rx_isr_byte(uint8_t b), int rx_get(uint8_t *out, k_timeout_t timeout) and uint32_t rx_dropped(). A fake k_msgq of depth RX_DEPTH, k_msgq_put, k_msgq_get, K_NO_WAIT and K_FOREVER are provided.",
prelude: `/* --- a fake message queue with a small, reachable depth --------------- */
#define MU __attribute__((unused))
#define EINVAL 22
#define EAGAIN 11
#define ENOMSG 42
#define RX_DEPTH 4

typedef struct { int ms; } k_timeout_t;
#define K_NO_WAIT  ((k_timeout_t){ 0 })
#define K_FOREVER  ((k_timeout_t){ -1 })
#define K_MSEC(x)  ((k_timeout_t){ (x) })

struct k_msgq { uint8_t buf[RX_DEPTH]; int head, tail, count; };

static struct k_msgq rx_q;

/* records whether a blocking timeout was ever used from the ISR path */
static int mq_blocking_put;

MU static int k_msgq_put(struct k_msgq *q, const void *item, k_timeout_t t)
{
    if (t.ms != 0) mq_blocking_put++;      /* illegal in an ISR */
    if (q->count >= RX_DEPTH) return -ENOMSG;
    q->buf[q->tail] = *(const uint8_t *)item;
    q->tail = (q->tail + 1) % RX_DEPTH;
    q->count++;
    return 0;
}

MU static int k_msgq_get(struct k_msgq *q, void *out, k_timeout_t t)
{
    (void)t;
    if (q->count == 0) return -EAGAIN;      /* the fake never actually blocks */
    *(uint8_t *)out = q->buf[q->head];
    q->head = (q->head + 1) % RX_DEPTH;
    q->count--;
    return 0;
}

#define K_MSGQ_DEFINE(name, sz, depth, align)   /* the fake is already defined */

MU static void mq_reset(void)
{
    rx_q.head = rx_q.tail = rx_q.count = 0;
    mq_blocking_put = 0;
}
`,
test: `int main(void)
{
    uint8_t b;

    /* a byte in, a byte out */
    mq_reset();
    rx_isr_byte(0x41);
    CHECK(rx_get(&b, K_FOREVER) == 0, "gets a queued byte");
    CHECK(b == 0x41,                  "and it is the byte that went in");
    CHECK(mq_blocking_put == 0,       "the ISR path never uses a blocking timeout");

    /* order is preserved */
    mq_reset();
    rx_isr_byte('a'); rx_isr_byte('b'); rx_isr_byte('c');
    rx_get(&b, K_FOREVER); CHECK(b == 'a', "FIFO order: first byte first");
    rx_get(&b, K_FOREVER); CHECK(b == 'b', "FIFO order: second");
    rx_get(&b, K_FOREVER); CHECK(b == 'c', "FIFO order: third");

    /* overflow: the queue is depth 4, so the fifth byte cannot fit */
    mq_reset();
    for (int i = 0; i < RX_DEPTH; i++) rx_isr_byte((uint8_t)i);
    CHECK(rx_dropped() == 0u, "nothing dropped while it fits");
    rx_isr_byte(0xFF);
    CHECK(rx_dropped() == 1u, "counts the byte it could not queue");
    rx_isr_byte(0xFE);
    rx_isr_byte(0xFD);
    CHECK(rx_dropped() == 3u, "keeps counting");
    CHECK(mq_blocking_put == 0, "still never blocks, even when full");

    /* the queued data is intact: it dropped the new bytes, not the old ones */
    for (int i = 0; i < RX_DEPTH; i++) {
        rx_get(&b, K_FOREVER);
        CHECK(b == (uint8_t)i, "the bytes already queued survived the overflow");
    }

    /* an empty queue reports rather than returning stale data */
    mq_reset();
    b = 0x99;
    CHECK(rx_get(&b, K_NO_WAIT) != 0, "an empty queue does not report success");

    /* a NULL output is rejected */
    CHECK(rx_get(NULL, K_FOREVER) == -EINVAL, "NULL output gives -EINVAL");

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
