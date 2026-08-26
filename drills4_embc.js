// Zephyr drills. Five spot-the-bug and three write-the-code.
//
// The write drills compile, because their preludes supply a small fake of the
// Zephyr API the answer uses. That is not a workaround: it is exactly how you
// test Zephyr code off-target, and the drill is partly there to show that the
// device pointer and the dt_spec are already the seam you need.

DRILLS.push(

{
id: "d-spot-z-work",
kind: "spot",
track: "Embedded C",
d: 2,
title: "A Zephyr work handler that takes the system down with it",
mins: 12,
brief: `
<p>A BLE peripheral samples a sensor when an interrupt fires. It works on the bench and then, in
longer sessions, connections start dropping and log lines go missing.</p>
<p>Five faults. The first one explains the symptom.</p>`,
code: `LOG_MODULE_REGISTER(sampler);

static struct k_work sample_work;
static const struct device *i2c = DEVICE_DT_GET(DT_NODELABEL(i2c0));
static uint8_t results[64];
static int n_results;

static void sample_work_fn(struct k_work *w)
{
    uint8_t raw[6];

    i2c_burst_read(i2c, 0x19, 0x28, raw, sizeof raw);

    k_sleep(K_MSEC(50));          /* let the sensor settle */

    i2c_burst_read(i2c, 0x19, 0x28, raw, sizeof raw);

    results[n_results++] = raw[0];

    LOG_INF("sample %d = %u", n_results, raw[0]);
}

static void drdy_isr(const struct device *port,
                     struct gpio_callback *cb, uint32_t pins)
{
    k_work_submit(&amp;sample_work);
}

int sampler_start(void)
{
    k_work_init(&amp;sample_work, sample_work_fn);
    return 0;
}`,
answer: `
<h3>1. The handler sleeps on the system work queue</h3>
<p><code>k_work_submit()</code> puts the item on the <b>system</b> work queue, which Bluetooth,
networking and the logging subsystem all share. <code>k_sleep(K_MSEC(50))</code> in the handler
blocks every one of them for 50 ms per sample.</p>
<p>That is the whole symptom: dropped connections and missing log lines, appearing only when
sampling is frequent enough to matter. The fix is a dedicated queue:</p>
<pre>K_THREAD_STACK_DEFINE(sampler_stack, 2048);
static struct k_work_q sampler_q;

k_work_queue_start(&amp;sampler_q, sampler_stack,
                   K_THREAD_STACK_SIZEOF(sampler_stack), 5, NULL);
k_work_submit_to_queue(&amp;sampler_q, &amp;sample_work);</pre>
<p>Better still, do not sleep at all: the settle time is a reason to use
<code>k_work_delayable</code> and resubmit, so nothing is occupied while waiting.</p>

<h3>2. device_is_ready is never called</h3>
<p><code>DEVICE_DT_GET</code> resolves at build time and never returns NULL, so it cannot tell
you the device's init succeeded. Using a device whose init failed is undefined.</p>

<h3>3. Neither i2c_burst_read return value is checked</h3>
<p>Zephyr returns negative errno. A failed read leaves <code>raw</code> uninitialised and the
code stores and logs it as though it were a measurement.</p>

<h3>4. n_results has no bound</h3>
<p><code>results[n_results++]</code> with a 64-byte array and no check. It is also written from
the work handler and read from wherever the consumer lives, with nothing protecting it.</p>

<h3>5. The ISR callback ignores its own reason</h3>
<p>A GPIO callback receives <code>pins</code>, which says which line fired. Submitting
unconditionally means any pin sharing the callback triggers a sample. Minor here, and the sort
of thing a reviewer should still ask about.</p>

<h3>The one to say first</h3>
<p>If you only get one, say the work queue. It is the fault that explains the reported symptom,
and connecting a symptom to a cause is what the question is really asking.</p>`,
checklist: [
"Found the k_sleep in a handler on the shared system work queue",
"Connected that to the reported symptom: BLE and logging both live on that queue",
"Proposed a dedicated queue, or k_work_delayable instead of sleeping",
"Found the missing device_is_ready",
"Found both unchecked i2c_burst_read return values",
"Found the unbounded results[n_results++]",
"Noticed results is shared with no protection"
]
},

{
id: "d-spot-z-init",
kind: "spot",
track: "Embedded C",
d: 2,
title: "A Zephyr driver init that cannot work",
mins: 12,
brief: `
<p>An out-of-tree driver for an I2C sensor. It compiles, and at boot the device is never
ready.</p>
<p>Five faults.</p>`,
code: `#define DT_DRV_COMPAT mycorp_widget

struct widget_data {
    struct i2c_dt_spec bus;
    uint16_t last;
};

static int widget_init(const struct device *dev)
{
    struct widget_data *d = dev-&gt;data;
    uint8_t id;

    k_sleep(K_MSEC(100));              /* power-on settle */

    i2c_reg_read_byte_dt(&amp;d-&gt;bus, 0x0F, &amp;id);

    if (id != 0xB4) {
        return -1;
    }

    d-&gt;last = 0;
    return 0;
}

#define WIDGET_DEFINE(i)                                  \\
    static struct widget_data widget_data_##i = {         \\
        .bus = I2C_DT_SPEC_INST_GET(i),                   \\
    };                                                    \\
    DEVICE_DT_INST_DEFINE(i, widget_init, NULL,           \\
        &amp;widget_data_##i, NULL,                           \\
        PRE_KERNEL_1, 40, &amp;widget_api);

DT_INST_FOREACH_STATUS_OKAY(WIDGET_DEFINE)`,
answer: `
<h3>1. It sleeps at PRE_KERNEL_1</h3>
<p>There is no scheduler at PRE_KERNEL, so there is nothing to sleep on. This is the fault that
explains "never ready".</p>
<p>Two fixes, and they are different decisions. Move to <code>POST_KERNEL</code>, where sleeping
is legal. Or keep the early init and defer the settle time to first use, which is better if
something else genuinely needs this device early.</p>

<h3>2. The bus spec is in data, not config</h3>
<p><code>i2c_dt_spec</code> is fixed at build time: a device pointer and an address, neither of
which ever changes. Putting it in <code>data</code> costs RAM plus a startup copy for every
instance, when it should be a <code>const</code> config in flash.</p>
<pre>struct widget_config { struct i2c_dt_spec bus; };
struct widget_data   { uint16_t last; };</pre>

<h3>3. The bus is never checked for readiness</h3>
<p><code>device_is_ready(d-&gt;bus.bus)</code>, or <code>i2c_is_ready_dt(&amp;cfg-&gt;bus)</code>.
The I2C controller may itself have failed to initialise, and at PRE_KERNEL it may not have
initialised <b>yet</b>, which is the ordering problem the priority number exists to solve.</p>

<h3>4. The read's return value is discarded</h3>
<p><code>id</code> is uninitialised if the read fails, so the identity check compares against
whatever was on the stack. It might pass.</p>

<h3>5. It returns -1 rather than an errno</h3>
<p>Zephyr expects negative errno throughout. <code>-EINVAL</code> for a wrong part,
<code>-ENODEV</code> for one that is absent, and the read's own error passed through when the
bus fails. Returning -1 loses the distinction the caller needs.</p>

<h3>Also worth saying</h3>
<p>The init priority of 40 is a raw number. Using the Kconfig symbol,
<code>CONFIG_SENSOR_INIT_PRIORITY</code>, means it moves with the rest of the sensor drivers
instead of being pinned by hand.</p>`,
checklist: [
"Found the k_sleep at PRE_KERNEL, and said why there is no scheduler yet",
"Connected that to the reported symptom",
"Proposed POST_KERNEL, or deferring the settle to first use, as a deliberate choice",
"Found the i2c_dt_spec in data rather than a const config",
"Found the missing readiness check on the bus",
"Found the discarded read return value leaving id uninitialised",
"Noticed -1 instead of a negative errno"
]
},

{
id: "d-spot-z-isr",
kind: "spot",
track: "Embedded C",
d: 2,
title: "Zephyr calls from the wrong context",
mins: 10,
brief: `
<p>A UART receive path and a periodic timeout. It runs, mostly, and occasionally asserts or
behaves strangely under load.</p>
<p>Four faults, all about which context the code is running in.</p>`,
code: `static struct k_msgq rx_q;
static struct k_mutex cfg_lock;
static struct k_timer poll_timer;

static void uart_isr(const struct device *dev, void *user)
{
    uint8_t byte;

    k_mutex_lock(&amp;cfg_lock, K_FOREVER);

    while (uart_fifo_read(dev, &amp;byte, 1) == 1) {
        k_msgq_put(&amp;rx_q, &amp;byte, K_MSEC(10));
    }

    k_mutex_unlock(&amp;cfg_lock);
}

static void poll_expiry(struct k_timer *t)
{
    uint8_t buf[32];

    int rc = flash_read(flash_dev, 0x1000, buf, sizeof buf);

    if (rc == 0) {
        LOG_INF("polled: %02x", buf[0]);
    }

    k_sleep(K_MSEC(1));
}`,
answer: `
<h3>1. A mutex in an ISR</h3>
<p>Mutexes can block, so they are illegal from interrupt context, full stop. There is no
timeout that makes it legal.</p>
<p>If an ISR and a thread genuinely share state, the tools are a lock-free structure, a
semaphore signalled from the ISR, or <code>irq_lock()</code> around a very short critical
section.</p>

<h3>2. A non-zero timeout in an ISR</h3>
<p><code>k_msgq_put(&amp;rx_q, &amp;byte, K_MSEC(10))</code> asks to block for 10 ms. From an ISR
the only legal timeout is <code>K_NO_WAIT</code>, and the queue being full then has to be
handled: drop the byte and count it, or signal an overrun.</p>
<p>Counting the drops matters. Silently discarding data is how a link that "mostly works" gets
shipped.</p>

<h3>3. A k_timer callback is interrupt context</h3>
<p>This is the one people are surprised by. <code>k_timer</code> expiry functions run in
interrupt context, so <code>flash_read</code> and <code>k_sleep</code> are both illegal there,
and a flash read can take milliseconds while blocking everything.</p>
<p>Use <code>k_work_delayable</code> instead, which runs in a thread and may block. Reach for
<code>k_timer</code> only when you need the lower latency and the callback does almost
nothing.</p>

<h3>4. LOG_INF from interrupt context</h3>
<p>Legal with deferred logging, which is the default, and it is worth knowing why: the call site
only stores arguments and the formatting happens later in the log thread. Switch to
<code>CONFIG_LOG_MODE_IMMEDIATE</code> to debug a crash and this now formats and writes to a
UART inside an ISR, which will change the timing enough to hide the bug you are chasing.</p>

<h3>The thing that would have caught all of it</h3>
<p><code>CONFIG_ASSERT=y</code>. Zephyr checks for exactly these misuses and says nothing about
them by default, which is why it belongs in every development build.</p>`,
checklist: [
"Found the mutex in an ISR, and said no timeout makes it legal",
"Found the non-zero timeout on k_msgq_put, and that K_NO_WAIT is the only legal one",
"Said what to do when the queue is full: drop and count, rather than silently",
"Knew that a k_timer callback runs in interrupt context",
"Found flash_read and k_sleep inside that callback",
"Proposed k_work_delayable instead",
"Mentioned CONFIG_ASSERT would have reported these"
]
},

{
id: "d-spot-z-dt",
kind: "spot",
track: "Embedded C",
d: 1,
title: "A board bring-up that builds and does nothing",
mins: 10,
brief: `
<p>An overlay and a prj.conf for a new board. The build succeeds. The sensor is never found and
the second UART produces no output.</p>
<p>Four faults, across two files. This is a configuration drill rather than a C one.</p>`,
code: `/* app.overlay */
&amp;i2c1 {
    clock-frequency = &lt;I2C_BITRATE_FAST&gt;;

    lis2dh: lis2dh@19 {
        compatible = "st,lis2dh12";
        reg = &lt;0x19&gt;;
    };
};

&amp;uart1 {
    status = "okay";
    current-speed = &lt;115200&gt;;
};

/* prj.conf */
CONFIG_I2C=y
CONFIG_LIS2DH=y
CONFIG_SERIAL=y
CONFIG_LOG=y

/* main.c */
const struct device *s = DEVICE_DT_GET(DT_NODELABEL(lis2dh));
struct sensor_value v;
sensor_sample_fetch(s);
sensor_channel_get(s, SENSOR_CHAN_ACCEL_X, &amp;v);`,
answer: `
<h3>1. i2c1 is never enabled</h3>
<p>Setting <code>clock-frequency</code> on a node does not enable it. Without
<code>status = "okay"</code> the controller is not built, so neither is anything under it.</p>
<p>This is the fault behind "the sensor is never found", and it is the single most common Zephyr
bring-up mistake.</p>

<h3>2. uart1 has no pinctrl</h3>
<p>On most modern SoCs, enabling a peripheral and saying which pins it uses are separate. A UART
that is <code>okay</code> with no <code>pinctrl-0</code> and <code>pinctrl-names</code> builds
cleanly and outputs nothing, which is exactly the reported symptom.</p>

<h3>3. CONFIG_SENSOR is missing</h3>
<p><code>CONFIG_LIS2DH</code> depends on it, and Kconfig <b>silently ignores</b> a symbol whose
dependencies are unmet. The line sits in prj.conf looking correct while the driver is absent.</p>
<p>Confirm it rather than assume it:</p>
<pre>grep CONFIG_LIS2DH build/zephyr/.config</pre>

<h3>4. Nothing is checked in main</h3>
<p>No <code>device_is_ready(s)</code>, and neither <code>sensor_sample_fetch</code> nor
<code>sensor_channel_get</code> has its return value looked at. With the device absent this
reads a <code>sensor_value</code> that was never written.</p>

<h3>The diagnostic order</h3>
<p>Two files answer all of this in under a minute, and they should be the first thing you open
rather than the last:</p>
<pre>build/zephyr/zephyr.dts      the merged tree: is the node there and okay?
build/zephyr/.config         the merged Kconfig: is the driver built?</pre>
<p>The inputs tell you your intention. The generated files tell you what the build actually
concluded.</p>`,
checklist: [
"Found the missing status = okay on i2c1",
"Said that setting a property does not enable a node",
"Found the missing pinctrl on uart1, and connected it to the silent UART",
"Found the missing CONFIG_SENSOR, and that Kconfig ignores unmet dependencies silently",
"Found the missing device_is_ready and unchecked sensor calls",
"Named zephyr.dts and .config as the two files to read first"
]
},

{
id: "d-spot-z-thread",
kind: "spot",
track: "Embedded C",
d: 2,
title: "Threads ported from FreeRTOS",
mins: 10,
brief: `
<p>A control loop and a logging thread, ported from a FreeRTOS project. The control loop misses
its deadline whenever logging is busy, and the system occasionally faults in a thread that
looks innocent.</p>
<p>Four faults.</p>`,
code: `#define CONTROL_PRIO   9      /* carried over from the FreeRTOS port */
#define LOGGER_PRIO    1

K_THREAD_DEFINE(control_tid, 512, control_thread,
                NULL, NULL, NULL, CONTROL_PRIO, 0, 0);

K_THREAD_DEFINE(logger_tid, 1024, logger_thread,
                NULL, NULL, NULL, LOGGER_PRIO, 0, 0);

static void control_thread(void)
{
    while (1) {
        float e = setpoint - read_position();
        float u = pid_step(e);
        set_output(u);
        k_msleep(1);
    }
}

static void logger_thread(void)
{
    char line[256];

    while (1) {
        int n = snprintf(line, sizeof line, "pos=%f u=%f", pos, out);
        write_log(line, (size_t)n);
        k_yield();
    }
}`,
answer: `
<h3>1. The priorities are inverted by the port</h3>
<p>In FreeRTOS a <b>larger</b> number is more urgent. In Zephyr it is the opposite: <b>lower is
more urgent</b>, and negative values are cooperative.</p>
<p>So numbers carried straight across, where the control loop had 9 and the logger had 1, now
mean the <b>logger</b> outranks the control loop. Every time there is a line to write, control
waits.</p>
<p>The failure is a real-time one that presents as a performance problem, which is why it
survives a port review: nothing looks wrong, and the constants are unchanged.</p>

<h3>2. The logger never blocks</h3>
<p><code>k_yield()</code> gives up the CPU only to threads at the <b>same or higher</b>
priority. A thread that loops on yield is runnable forever, so it consumes every cycle not taken
by something more urgent, and starves anything below it entirely.</p>
<p>A logger should block on the queue it drains: <code>k_msgq_get(..., K_FOREVER)</code>. Then
it costs nothing when there is nothing to log.</p>

<h3>3. Both stacks are guesses, and the logger's is too small</h3>
<p>A 256-byte line buffer is a local, so it is on the stack, and <code>snprintf</code> with
<code>%f</code> pulls in floating-point formatting, which is one of the largest stack consumers
in the C library. 1024 bytes total is optimistic and this is a very plausible cause of the
"faults in an innocent-looking thread": an overflow corrupts whatever is next to it.</p>
<pre>CONFIG_THREAD_ANALYZER=y
CONFIG_THREAD_ANALYZER_AUTO=y
CONFIG_STACK_SENTINEL=y</pre>
<p>Measure under the worst case, then add margin. The 512 bytes for a control thread doing
floating-point PID deserves the same treatment.</p>

<h3>4. pos and out are read with nothing protecting them</h3>
<p>The logger reads variables the control thread writes. On a 32-bit target a single float is
an aligned word so it will not tear, but the two together are not a consistent pair: the logger
can print a position from before an update with an output from after it.</p>
<p>If the pair has to be coherent, publish them together through a message queue rather than
reading the live variables.</p>

<h3>The two that explain the deadline misses</h3>
<p>The inverted priorities and the yield loop, and they compound: the logger outranks control
and never blocks, so control runs only in the gaps. Say the priority direction first, because it
is the one that identifies this as a port rather than a design error.</p>`,
checklist: [
"Knew Zephyr priorities run the opposite way to FreeRTOS, so 9 is LESS urgent than 1",
"Found the k_yield loop and explained that it never blocks",
"Connected that to the control loop missing deadlines",
"Proposed blocking on the queue instead",
"Found the undersized logger stack, and linked %f to large stack use",
"Recommended measuring stacks rather than guessing",
"Noticed pos and out are read without coherence"
]
},

{
id: "d-write-z-sensor",
kind: "write",
track: "Embedded C",
d: 2,
title: "A Zephyr sensor read you can test off-target",
mins: 15,
brief: `
<p>Write <code>widget_read()</code> for an I2C sensor, in the Zephyr driver style.</p>
<ul>
<li>Reach the bus through the device's <code>const</code> config, not through a global.</li>
<li>Read two bytes from register 0x28, big-endian, into a <code>uint16_t</code>.</li>
<li>Return 0 on success, and the bus error unchanged on failure.</li>
<li>Reject a NULL output pointer with <code>-EINVAL</code>.</li>
<li>On a bus failure, do not touch the output.</li>
</ul>
<p>The prelude supplies a small fake of the Zephyr pieces you need, which is exactly how this
would be tested off-target in a real project.</p>`,
answer: `
<pre>int widget_read(const struct device *dev, uint16_t *out)
{
    const struct widget_config *cfg = dev-&gt;config;
    uint8_t raw[2];
    int rc;

    if (out == NULL) return -EINVAL;

    rc = i2c_burst_read_dt(&amp;cfg-&gt;bus, REG_DATA, raw, sizeof raw);
    if (rc != 0) return rc;                  /* pass it through unchanged */

    *out = (uint16_t)(((uint16_t)raw[0] &lt;&lt; 8) | raw[1]);
    return 0;
}</pre>
<h3>Why the config, and why const</h3>
<p>The bus spec is a device pointer plus an address, fixed at build time. Reaching it through
<code>dev-&gt;config</code> rather than a global is what lets two of these sensors exist, and
what lets a test point the same code at a fake.</p>
<p><code>const</code> puts it in flash. In <code>data</code> it would cost RAM plus a startup
copy per instance.</p>

<h3>Passing the error through unchanged</h3>
<p>Returning <code>-EIO</code> for everything throws away what the bus told you. A caller
distinguishing <code>-EBUSY</code> from <code>-ENODEV</code> can retry one and give up on the
other, and it can only do that if you did not flatten them.</p>

<h3>Not touching the output on failure</h3>
<p>A caller that forgets to check the return code then keeps its previous value rather than
getting half a reading. It costs nothing and it makes the function safer to misuse, which is a
reasonable thing to optimise for.</p>

<h3>The assembly, and the cast</h3>
<p><code>raw[0] &lt;&lt; 8</code> without a cast promotes to <code>int</code>. It is harmless at
this width, and it is still worth casting, because the same line at 24 or 32 bits shifts into
the sign bit of a signed int and becomes undefined. Writing it correctly at 16 bits is how you
have the habit at 32.</p>`,
checklist: [
"Reaches the bus through dev->config rather than a global",
"Rejects a NULL output with -EINVAL",
"Returns the bus error unchanged rather than flattening it to -EIO",
"Leaves the output untouched when the read fails",
"Assembles big-endian from the bytes, with a cast before the shift",
"Returns 0 on success"
]
},

{
id: "d-write-z-worker",
kind: "write",
track: "Embedded C",
d: 3,
title: "Deferred work with a retry, done safely",
mins: 15,
brief: `
<p>A sensor interrupt fires. The read must happen in a thread, not the ISR, and the sensor needs
20 ms to settle first. If the read fails, retry up to three times, then give up and report.</p>
<p>Write <code>sampler_submit()</code>, called from the ISR, and the work handler.</p>
<ul>
<li>The ISR must call nothing that can block.</li>
<li>The work must not run on the system work queue.</li>
<li>Waiting must not occupy a thread: use the delay, not a sleep.</li>
<li>After three failures, call <code>report_failure()</code> and stop.</li>
</ul>
<p>The prelude supplies a fake work queue that runs items when you tell it to, so the retry
behaviour is testable.</p>`,
answer: `
<pre>#define MAX_TRIES 3

static struct k_work_delayable sample_work;
static int tries;

void sampler_submit(void)                 /* called from the ISR */
{
    tries = 0;
    k_work_schedule_for_queue(&amp;sampler_q, &amp;sample_work, K_MSEC(20));
}

static void sample_work_fn(struct k_work *w)
{
    uint16_t v;
    int rc = sensor_read(&amp;v);

    if (rc == 0) {
        publish(v);
        return;
    }

    if (++tries &lt; MAX_TRIES) {
        k_work_schedule_for_queue(&amp;sampler_q, &amp;sample_work, K_MSEC(20));
        return;
    }

    report_failure(rc);
}</pre>
<h3>Why reschedule rather than sleep</h3>
<p>A handler that sleeps occupies its thread for the whole wait. Rescheduling releases the
thread immediately and the queue picks the item up again when the delay expires, so one work
queue can serve many of these.</p>
<p>It is the same reason a state machine beats a blocking sequence: the waiting costs nothing.</p>

<h3>Why not the system queue</h3>
<p><code>k_work_schedule()</code> would use the system queue, shared with Bluetooth, networking
and logging. Even without a sleep, a slow bus read there is felt everywhere. A dedicated queue
with its own stack and priority keeps the cost contained.</p>

<h3>What the ISR is allowed to do</h3>
<p><code>k_work_schedule_for_queue</code> is non-blocking, which is what makes it legal from
interrupt context. It is also idempotent in a useful way: scheduling an item that is already
scheduled does not queue it twice.</p>

<h3>The retry counter</h3>
<p>Reset it at submission, not in the handler, or a fresh trigger inherits the previous
attempt's count. It is only written from the queue's thread and from the ISR at submission,
which on a 32-bit target is a single aligned write, so it does not need protection here. Saying
why it is safe is better than not thinking about it.</p>`,
checklist: [
"The ISR calls only non-blocking APIs",
"Uses a dedicated queue rather than the system work queue, and said why",
"Uses the delay on the work item rather than sleeping in the handler",
"Retries at most three times",
"Resets the counter on submission, not in the handler",
"Calls report_failure once, after the last failure, and stops"
]
},

{
id: "d-write-z-msgq",
kind: "write",
track: "Embedded C",
d: 2,
title: "ISR to thread, without losing data silently",
mins: 14,
brief: `
<p>A UART ISR receives bytes. A thread consumes them. Write both halves using a message
queue.</p>
<ul>
<li><code>rx_isr_byte(uint8_t b)</code>: called from the ISR for each byte received.</li>
<li><code>rx_get(uint8_t *out, k_timeout_t timeout)</code>: called from the thread.</li>
<li>The ISR must not block, and must not lose data silently: count what it drops.</li>
<li><code>rx_dropped()</code> returns the count.</li>
</ul>
<p>The prelude provides a fake <code>k_msgq</code> with a small fixed depth, so the overflow
path is reachable.</p>`,
answer: `
<pre>K_MSGQ_DEFINE(rx_q, sizeof(uint8_t), RX_DEPTH, 1);

static volatile uint32_t rx_drops;

void rx_isr_byte(uint8_t b)
{
    if (k_msgq_put(&amp;rx_q, &amp;b, K_NO_WAIT) != 0) {
        rx_drops++;                 /* full: drop, but count it */
    }
}

int rx_get(uint8_t *out, k_timeout_t timeout)
{
    if (out == NULL) return -EINVAL;
    return k_msgq_get(&amp;rx_q, out, timeout);
}

uint32_t rx_dropped(void)
{
    return rx_drops;
}</pre>

<h3>K_NO_WAIT is the whole point</h3>
<p>Any other timeout is illegal from an ISR. That means the queue being full is a case you have
to handle rather than wait out, and there are only two honest choices: drop the newest, or drop
the oldest. Dropping silently is the third, and it is how a link that "mostly works" reaches a
customer.</p>

<h3>Why the counter matters more than it looks</h3>
<p>A drop count that a diagnostic command can read turns an invisible fault into a number that
trends. Silent recovery hides a degrading system right up until it fails outright, and by then
there is no history to explain it.</p>
<p>It is <code>volatile</code> because the ISR writes it and a thread reads it. On a 32-bit
target an aligned <code>uint32_t</code> increment from a single writer is safe here, since only
the ISR writes it and only threads read it. Two writers would need more.</p>

<h3>Why a message queue rather than a FIFO</h3>
<p>The item is one byte, fixed size. Copying it removes the entire question of who owns the
memory and when it is freed, which is what <code>k_fifo</code> would make you answer.</p>

<h3>The design question underneath</h3>
<p>Per-byte queue operations are expensive at high baud rates. The better answer at that point
is DMA into a ring buffer with a half-transfer interrupt, and the queue carrying <b>buffers</b>
rather than bytes. Saying so is the difference between answering the question and understanding
it.</p>`,
checklist: [
"Uses K_NO_WAIT in the ISR, and said why nothing else is legal",
"Handles the queue being full rather than ignoring the return value",
"Counts drops rather than discarding silently",
"The counter is volatile, with a reason given",
"Rejects a NULL output pointer",
"Mentioned that per-byte queueing is the wrong shape at high rates, and what to do instead"
]
}

);
