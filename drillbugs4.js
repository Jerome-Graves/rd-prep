/* Per-bug line mappings for the Zephyr spot-the-bug drills.
 * Line numbers are 1-based into each drill's `code` field and are checked
 * against it at load time.
 */

Object.assign(DRILL_BUGS, {

"d-spot-z-work": [
{ lines: [14], t: "Sleeping on the shared system work queue",
  why: "k_work_submit puts the item on the SYSTEM queue, which Bluetooth, networking and logging all share. A 50 ms sleep here blocks every one of them, per sample. That is the reported symptom: dropped connections and missing log lines.",
  bad: "    k_sleep(K_MSEC(50));          /* let the sensor settle */",
  fix: "    /* do not sleep here. Use your own queue, and reschedule\n       rather than block:  k_work_schedule_for_queue(&sampler_q,\n                              &sample_work, K_MSEC(50)); */" },

{ lines: [26], t: "Submitted to the system queue rather than a dedicated one",
  why: "Even without the sleep, a slow bus read on the shared queue is felt by every subsystem using it. A dedicated queue with its own stack and priority contains the cost.",
  bad: "    k_work_submit(&amp;sample_work);",
  fix: "    k_work_submit_to_queue(&amp;sampler_q, &amp;sample_work);" },

{ lines: [4, 31], t: "device_is_ready is never called",
  why: "DEVICE_DT_GET resolves at build time and never returns NULL, so it cannot tell you whether the device's init succeeded. Calling into a device whose init failed is undefined.",
  bad: "static const struct device *i2c = DEVICE_DT_GET(DT_NODELABEL(i2c0));",
  fix: "static const struct device *i2c = DEVICE_DT_GET(DT_NODELABEL(i2c0));\n/* and in sampler_start: */\nif (!device_is_ready(i2c)) return -ENODEV;" },

{ lines: [12, 16], t: "Both bus reads have their return value discarded",
  why: "Zephyr returns negative errno. A failed read leaves raw uninitialised, and the code then stores and logs it as though it were a measurement.",
  bad: "    i2c_burst_read(i2c, 0x19, 0x28, raw, sizeof raw);",
  fix: "    int rc = i2c_burst_read(i2c, 0x19, 0x28, raw, sizeof raw);\n    if (rc != 0) { LOG_ERR(\"read failed: %d\", rc); return; }" },

{ lines: [18], t: "results[n_results++] has no bound, and no protection",
  why: "A 64-byte array indexed by a counter nothing limits. It is also written here and read by a consumer elsewhere, with nothing making that safe.",
  bad: "    results[n_results++] = raw[0];",
  fix: "    if (n_results &lt; (int)ARRAY_SIZE(results)) {\n        results[n_results++] = raw[0];\n    } else {\n        overruns++;      /* count it rather than dropping silently */\n    }" }
],

"d-spot-z-init": [
{ lines: [13, 31], t: "Sleeping at PRE_KERNEL_1, where there is no scheduler",
  why: "PRE_KERNEL runs before the kernel starts, so there is nothing to sleep on. This is the fault that explains the device never becoming ready.",
  bad: "    k_sleep(K_MSEC(100));              /* power-on settle */",
  fix: "    /* either move the init to POST_KERNEL, where sleeping is legal,\n       or drop the sleep and defer the settle time to first use */" },

{ lines: [3, 4], t: "The bus spec is in data rather than a const config",
  why: "An i2c_dt_spec is a device pointer and an address, both fixed at build time. In data it costs RAM plus a startup copy for every instance; it belongs in a const config, in flash.",
  bad: "struct widget_data {\n    struct i2c_dt_spec bus;",
  fix: "struct widget_config { struct i2c_dt_spec bus; };\nstruct widget_data   { uint16_t last; };" },

{ lines: [15], t: "The bus is never checked for readiness",
  why: "The I2C controller may have failed its own init, and at PRE_KERNEL it may simply not have run yet, which is the ordering problem the init priority exists to solve.",
  bad: "    i2c_reg_read_byte_dt(&amp;d-&gt;bus, 0x0F, &amp;id);",
  fix: "    if (!i2c_is_ready_dt(&amp;cfg-&gt;bus)) return -ENODEV;\n    rc = i2c_reg_read_byte_dt(&amp;cfg-&gt;bus, REG_WHO_AM_I, &amp;id);" },

{ lines: [15, 17], t: "The read's return value is discarded, so id may be uninitialised",
  why: "If the read fails, id holds whatever was on the stack and the identity check compares against garbage. It might even pass.",
  bad: "    i2c_reg_read_byte_dt(&amp;d-&gt;bus, 0x0F, &amp;id);\n\n    if (id != 0xB4) {",
  fix: "    rc = i2c_reg_read_byte_dt(&amp;cfg-&gt;bus, REG_WHO_AM_I, &amp;id);\n    if (rc != 0) return rc;\n\n    if (id != WIDGET_EXPECTED_ID) {" },

{ lines: [18], t: "Returns -1 instead of a negative errno",
  why: "Zephyr uses negative errno throughout, and a caller distinguishing a wrong part from an absent one can act differently. Returning -1 flattens that away.",
  bad: "        return -1;",
  fix: "        return -EINVAL;      /* or -ENODEV if it is absent */" }
],

"d-spot-z-isr": [
{ lines: [9, 15], t: "A mutex taken in interrupt context",
  why: "Mutexes can block, so they are illegal from an ISR whatever timeout you pass. There is no legal variant of this call here.",
  bad: "    k_mutex_lock(&amp;cfg_lock, K_FOREVER);",
  fix: "    /* no mutex in an ISR. If state really is shared, use a\n       lock-free structure, a semaphore given from here, or a\n       very short irq_lock() region */" },

{ lines: [12], t: "A non-zero timeout from an ISR",
  why: "K_NO_WAIT is the only legal timeout in interrupt context. Asking to block for 10 ms is undefined behaviour, and CONFIG_ASSERT would report it immediately.",
  bad: "        k_msgq_put(&amp;rx_q, &amp;byte, K_MSEC(10));",
  fix: "        if (k_msgq_put(&amp;rx_q, &amp;byte, K_NO_WAIT) != 0) {\n            rx_drops++;        /* full: drop, but count it */\n        }" },

{ lines: [18, 22], t: "A k_timer callback runs in interrupt context",
  why: "This is the one people are surprised by. flash_read can take milliseconds and blocks, and neither is legal here. k_work_delayable runs in a thread and may block.",
  bad: "static void poll_expiry(struct k_timer *t)\n{\n    uint8_t buf[32];\n\n    int rc = flash_read(flash_dev, 0x1000, buf, sizeof buf);",
  fix: "static void poll_work_fn(struct k_work *w)   /* thread context */\n{\n    uint8_t buf[32];\n\n    int rc = flash_read(flash_dev, 0x1000, buf, sizeof buf);" },

{ lines: [28], t: "k_sleep inside a timer callback",
  why: "Sleeping in interrupt context is undefined. It is also pointless: the timer already provides the periodicity this is trying to add.",
  bad: "    k_sleep(K_MSEC(1));",
  fix: "    /* delete it: the timer period sets the rate */" }
],

"d-spot-z-dt": [
{ lines: [2, 3], t: "i2c1 is never enabled",
  why: "Setting a property does not enable a node. Without status = okay the controller is not built, so neither is anything under it, and the sensor cannot exist.",
  bad: "&amp;i2c1 {\n    clock-frequency = &lt;I2C_BITRATE_FAST&gt;;",
  fix: "&amp;i2c1 {\n    status = \"okay\";\n    clock-frequency = &lt;I2C_BITRATE_FAST&gt;;" },

{ lines: [11, 12, 13], t: "uart1 is enabled but has no pinctrl",
  why: "On most modern SoCs the peripheral and its pin routing are described separately. A UART that is okay with no pinctrl builds cleanly and outputs nothing, which is the reported symptom.",
  bad: "&amp;uart1 {\n    status = \"okay\";\n    current-speed = &lt;115200&gt;;",
  fix: "&amp;uart1 {\n    status = \"okay\";\n    current-speed = &lt;115200&gt;;\n    pinctrl-0 = &lt;&amp;uart1_default&gt;;\n    pinctrl-1 = &lt;&amp;uart1_sleep&gt;;\n    pinctrl-names = \"default\", \"sleep\";" },

{ lines: [18], t: "CONFIG_LIS2DH depends on CONFIG_SENSOR, which is missing",
  why: "Kconfig silently ignores a symbol whose dependencies are unmet, so this line sits in prj.conf looking correct while the driver is simply not built.",
  bad: "CONFIG_LIS2DH=y",
  fix: "CONFIG_SENSOR=y\nCONFIG_LIS2DH=y\n/* then confirm it:  grep CONFIG_LIS2DH build/zephyr/.config */" },

{ lines: [23, 25, 26], t: "Nothing is checked in main",
  why: "No device_is_ready, and neither sensor call has its return value looked at. With the device absent, this reads a sensor_value that was never written.",
  bad: "const struct device *s = DEVICE_DT_GET(DT_NODELABEL(lis2dh));\nstruct sensor_value v;\nsensor_sample_fetch(s);",
  fix: "const struct device *s = DEVICE_DT_GET(DT_NODELABEL(lis2dh));\nif (!device_is_ready(s)) return -ENODEV;\nstruct sensor_value v;\nint rc = sensor_sample_fetch(s);\nif (rc != 0) return rc;" }
],

"d-spot-z-thread": [
{ lines: [1, 2], t: "The priorities are inverted by the port",
  why: "FreeRTOS treats a larger number as more urgent; Zephyr is the opposite, so lower is more urgent. Carried across unchanged, these make the logger outrank the control loop.",
  bad: "#define CONTROL_PRIO   9      /* carried over from the FreeRTOS port */\n#define LOGGER_PRIO    1",
  fix: "#define CONTROL_PRIO   1      /* lower number = higher priority */\n#define LOGGER_PRIO    9" },

{ lines: [27], t: "The logger never blocks, so it starves everything below it",
  why: "k_yield only gives up the CPU to threads at the same or higher priority, so a loop on yield stays runnable forever and consumes every spare cycle.",
  bad: "        k_yield();",
  fix: "        /* block on the queue you drain, so it costs nothing when idle */\n        k_msgq_get(&amp;log_q, &amp;line, K_FOREVER);" },

{ lines: [7, 22, 25], t: "The logger's stack is too small for what it does",
  why: "A 256-byte local plus snprintf with %f, which pulls in floating-point formatting, one of the largest stack consumers in the C library. 1024 total is optimistic, and an overflow corrupts whatever is next to it.",
  bad: "K_THREAD_DEFINE(logger_tid, 1024, logger_thread,",
  fix: "K_THREAD_DEFINE(logger_tid, 2048, logger_thread,\n/* and measure it: CONFIG_THREAD_ANALYZER=y, CONFIG_STACK_SENTINEL=y */" },

{ lines: [25], t: "pos and out are read with no coherence",
  why: "The control thread writes them and the logger reads them. Neither will tear on a 32-bit target, but the pair is not consistent: you can print a position from before an update with an output from after it.",
  bad: "        int n = snprintf(line, sizeof line, \"pos=%f u=%f\", pos, out);",
  fix: "        /* publish the pair together through a queue, so the\n           reader always sees one consistent sample */\n        struct sample s;\n        k_msgq_get(&amp;log_q, &amp;s, K_FOREVER);" }
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
            console.warn("drillbugs4: line out of range:", bad.join("; "));
        }
        d.bugs = bugs;
    });
}
