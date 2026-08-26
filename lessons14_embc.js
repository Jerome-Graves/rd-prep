// Embedded C track, batch 14: actually writing a unit test.
// The existing Testing subsection covers the concepts. These three cover the
// mechanics: the files, the commands, the output, and what to do when the
// thing under test touches hardware.
// Code samples use &lt; &gt; &amp; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-test-first",
track: "Embedded C",
sub: "Testing",
title: "Your first unit test, end to end",
mins: 26,
body: `
<p>Every explanation of unit testing stops before the part where you actually run one. This is
that part: real files, real commands, real output.</p>

<h3>The thing under test</h3>
<p>Start with something with no hardware in it at all, because the first test should teach you
the mechanics rather than the mocking.</p>
<pre>/* src/scale.h */
#ifndef SCALE_H
#define SCALE_H
#include &lt;stdint.h&gt;

/* Convert a 12-bit ADC reading to millivolts.
   vref_mv is the reference in millivolts. Returns -1 if
   counts is out of range. */
int32_t adc_to_mv(uint16_t counts, uint16_t vref_mv);

#endif</pre>

<h3>The test, with no framework at all</h3>
<p>You do not need one to start. A test is a program that returns non-zero when something is
wrong.</p>
<pre>/* test/test_scale.c */
#include &lt;stdio.h&gt;
#include "scale.h"

static int failures;

#define CHECK(cond)                                      \\
    do {                                                 \\
        if (cond) {                                      \\
            printf("  pass: %s\\n", #cond);               \\
        } else {                                         \\
            printf("  FAIL: %s   (%s:%d)\\n",             \\
                   #cond, __FILE__, __LINE__);           \\
            failures++;                                  \\
        }                                                \\
    } while (0)

int main(void)
{
    printf("adc_to_mv\\n");

    CHECK(adc_to_mv(0, 3300)    == 0);
    CHECK(adc_to_mv(4095, 3300) == 3300);
    CHECK(adc_to_mv(1, 3300)    == 0);        /* truncates, not rounds */
    CHECK(adc_to_mv(4096, 3300) == -1);       /* out of range */

    printf("%s: %d failure(s)\\n", failures ? "FAILED" : "OK", failures);
    return failures != 0;
}</pre>
<p><code>#cond</code> is the preprocessor stringising the expression, so the output names the
condition without you writing it twice. That one trick is most of what a test framework's
assertion macros do.</p>

<h3>Running it</h3>
<pre>cc -std=c11 -Wall -Wextra -Isrc \\
   src/scale.c test/test_scale.c -o build/test_scale
./build/test_scale ; echo "exit $?"</pre>
<p>Note the compiler: the <b>host</b> one, not the cross compiler. The whole point is that this
runs on your machine in milliseconds with no board attached.</p>
<pre>adc_to_mv
  pass: adc_to_mv(0, 3300) == 0
  FAIL: adc_to_mv(4095, 3300) == 3300   (test/test_scale.c:24)
  pass: adc_to_mv(1, 3300) == 0
  pass: adc_to_mv(4096, 3300) == -1
FAILED: 1 failure(s)
exit 1</pre>

<h3>See it fail first</h3>
<p>Before you fix anything, make sure each test can fail. Break the implementation deliberately
and confirm the test that should catch it does.</p>
<p>This is not ceremony. A test that cannot fail is worse than no test, because it reports
success forever and you believe it. Every assertion should have been red at least once.</p>

<h3>The exit code is the interface</h3>
<p>Non-zero means failure, and that is what makes it work in a Makefile, in CI, and in
<code>make check</code>. Anything that prints "FAILED" and returns 0 will be green in CI
forever.</p>

<h3>Wiring it into the build</h3>
<pre>TEST_SRC := test/test_scale.c src/scale.c
CFLAGS   := -std=c11 -Wall -Wextra -Werror -Isrc -g

build/test_scale: $(TEST_SRC)
	@mkdir -p build
	cc $(CFLAGS) $^ -o $@

check: build/test_scale
	./build/test_scale

.PHONY: check</pre>
<p>Now <code>make check</code> runs it, and it fails the build when a test fails. That is the
whole loop.</p>

<h3>Add the sanitizers, because they are free</h3>
<pre>cc -std=c11 -Wall -Wextra -g \\
   -fsanitize=address,undefined \\
   -fno-omit-frame-pointer \\
   -Isrc src/scale.c test/test_scale.c -o build/test_scale</pre>
<p>They cost a few times the runtime, which is nothing on a test suite, and they turn a
one-byte overrun or a signed overflow from a silent pass into a loud failure with a stack
trace. On firmware code, where the same overrun on target would corrupt something unrelated,
this is the single highest-value thing in the whole setup.</p>

<h3>What makes a test worth having</h3>
<ul>
<li><b>One behaviour per test.</b> When it fails you should not have to work out which part.</li>
<li><b>The name is the documentation.</b> "rejects a count above full scale" beats "test3".</li>
<li><b>Arrange, act, assert.</b> Set up, do the one thing, then check. If setup dominates, the
code under test has too many dependencies, and that is a design signal.</li>
<li><b>Test the boundaries.</b> Zero, one, full scale, one past full scale. The middle of the
range almost never finds anything.</li>
<li><b>No branches in the test.</b> An <code>if</code> in a test means it is checking different
things on different runs, which is how a test quietly stops testing.</li>
</ul>

<h3>When to move to a framework</h3>
<p>When you want per-test isolation so one crash does not take the rest with it, setup and
teardown, or a report format CI can parse. Unity is the usual embedded answer and it is
two files you can drop in.</p>
<p>Starting without one is still right. Twenty lines of macro teaches you what the framework is
doing, and it removes the excuse that you cannot test until the tooling is set up.</p>
`,
quiz: [
{ q: "Why must you see each test fail before trusting it?",
o: ["Convention", "A test that cannot fail reports success forever and you believe it", "To measure coverage", "The framework requires it"],
a: 1, why: "Break the implementation deliberately and confirm the assertion catches it. Every assertion should have been red at least once, or you do not know it is connected to anything." },
{ q: "Why does a test program's exit code matter?",
o: ["It is logged", "Non-zero means failure, which is what make and CI act on", "It sets the return value of main", "It controls the output format"],
a: 1, why: "Anything that prints FAILED and returns 0 stays green in CI forever. The exit code is the interface between the test and everything that runs it." },
{ q: "Which compiler builds a host unit test?",
o: ["The cross compiler for the target", "The host compiler, so it runs on your machine in milliseconds with no board", "Either works", "A special test compiler"],
a: 1, why: "That is the entire point: the logic is exercised in a fast loop without hardware. Running on target is a separate and also necessary activity, not a replacement for it." },
{ q: "Why is <code>-fsanitize=address,undefined</code> especially valuable on firmware code?",
o: ["It speeds the tests up", "The same overrun on target would corrupt something unrelated; here it is a loud failure with a stack trace", "It replaces the need for tests", "It measures coverage"],
a: 1, why: "It costs a few times the runtime, which is nothing on a test suite. It turns the class of bug that reaches the field as an unexplained fault into an immediate diagnosis." }
],
interview: {
q: "Show me how you would put a piece of firmware logic under test.",
a: "I would start with something with no hardware in it, because the first test should teach the mechanics rather than the mocking. Take a conversion function, say counts to millivolts. The test is just a program: a CHECK macro that stringises the condition with the hash operator so the output names it without me writing it twice, a handful of assertions, and a return of non-zero if any failed. The exit code is the interface, because that is what make and CI act on, and anything that prints FAILED and returns zero stays green forever. I would build it with the host compiler rather than the cross compiler, since the whole point is that it runs on my machine in milliseconds without a board. Then two things people skip. First, see every assertion fail: break the implementation deliberately and confirm the test catches it, because a test that cannot fail is worse than no test. Second, turn on the address and undefined behaviour sanitizers, which cost a few times the runtime and turn a one-byte overrun or a signed overflow from a silent pass into a loud failure with a stack trace. On firmware that is the highest-value thing in the setup, because the same overrun on target corrupts something unrelated and reaches the field as a mystery. On the tests themselves: one behaviour each, the name as the documentation, arrange-act-assert, and boundaries rather than the middle of the range. And no branches in a test, because an if means it checks different things on different runs."
}
},

{
id: "emb-test-fake",
track: "Embedded C",
sub: "Testing",
title: "Testing a driver: writing the fake",
mins: 26,
body: `
<p>The previous lesson tested a pure function, which is the easy case. This is the one that
matters: the code touches a bus, and there is no bus.</p>

<h3>Step 1: the seam</h3>
<p>A driver that calls the vendor HAL directly cannot be tested, because there is nothing to
substitute. Give it an interface instead:</p>
<pre>/* widget.h */
typedef struct {
    int (*read) (void *ctx, uint8_t reg, uint8_t *buf, size_t len);
    int (*write)(void *ctx, uint8_t reg, const uint8_t *buf, size_t len);
    void (*delay_ms)(void *ctx, uint32_t ms);
    void *ctx;
} widget_io_t;

int widget_init(const widget_io_t *io, widget_t **out);
int widget_read(widget_t *dev, uint16_t *out);</pre>
<p>On target, <code>ctx</code> holds the real I2C handle and the function pointers call the HAL.
In a test, <code>ctx</code> points at your fake's state. The driver cannot tell the
difference, which is the whole idea.</p>
<p>Zephyr gives you this for free: the <code>struct device</code> pointer and the
<code>i2c_dt_spec</code> are already the seam.</p>

<h3>Step 2: the fake, and what it records</h3>
<p>A fake is not just a stub returning zero. It is a small working model, and the interesting
part is what it <b>remembers</b>.</p>
<pre>/* test/fake_bus.c */
static uint8_t  fk_regs[256];      /* the device's registers */
static int      fk_reads, fk_writes;
static int      fk_fail_on = -1;   /* which transfer returns an error */
static int      fk_n;              /* transfers so far */
static uint32_t fk_delay_total;    /* how long the driver waited */
static uint8_t  fk_last_reg;

static int fk_read(void *ctx, uint8_t reg, uint8_t *buf, size_t len)
{
    (void)ctx;
    fk_last_reg = reg;
    if (fk_n++ == fk_fail_on) return -EIO;
    fk_reads++;
    for (size_t i = 0; i &lt; len; i++) buf[i] = fk_regs[(uint8_t)(reg + i)];
    return 0;
}

static void fk_delay(void *ctx, uint32_t ms)
{
    (void)ctx;
    fk_delay_total += ms;          /* record it, do not actually sleep */
}

static void fk_reset(void)
{
    memset(fk_regs, 0, sizeof fk_regs);
    fk_reads = fk_writes = fk_n = 0;
    fk_fail_on = -1;
    fk_delay_total = 0;
}</pre>
<p>Three properties make this useful:</p>
<ul>
<li><b>It can fail on demand.</b> <code>fk_fail_on</code> makes the error path reachable. On
real hardware you cannot make the third transfer fail; here it is one line.</li>
<li><b>The delay is recorded, not taken.</b> A driver that waits 50 ms per retry would make the
suite crawl. Counting the time instead makes the test instant <b>and</b> lets you assert on
it.</li>
<li><b>It resets.</b> Called at the start of every test, so one test cannot influence the
next.</li>
</ul>

<h3>Step 3: the tests that are worth writing</h3>
<p>Not the happy path. That is one test and it usually already works.</p>
<pre>void test_init_rejects_wrong_part(void)
{
    fk_reset();
    fk_regs[REG_WHO_AM_I] = 0x00;        /* wrong id */
    widget_t *d;
    CHECK(widget_init(&amp;io, &amp;d) == -EINVAL);
}

void test_init_propagates_bus_error(void)
{
    fk_reset();
    fk_regs[REG_WHO_AM_I] = EXPECTED_ID;
    fk_fail_on = 1;                      /* the SECOND transfer fails */
    widget_t *d;
    CHECK(widget_init(&amp;io, &amp;d) == -EIO); /* not -EINVAL */
}

void test_init_does_not_leak_on_failure(void)
{
    fk_reset();
    fk_fail_on = 0;
    widget_t *d;
    widget_init(&amp;io, &amp;d);
    CHECK(alloc_count() == 0);            /* freed on the error path */
}

void test_reset_timeout_is_bounded(void)
{
    fk_reset();
    fk_regs[REG_CTRL] = RESET_BIT;       /* never clears */
    widget_t *d;
    CHECK(widget_init(&amp;io, &amp;d) == -ETIMEDOUT);
    CHECK(fk_delay_total &lt; 1000);        /* gave up in under a second */
}</pre>
<p>Every one of those is an error path, and every one is impossible or tedious to trigger on
real hardware. That is where the value is: the happy path gets exercised by everyone all the
time, and the error paths get exercised by nobody until a customer does it.</p>

<h3>The list worth working through</h3>
<p>For any driver, ask each of these and write the test if the answer is interesting:</p>
<ul>
<li>What if the device is not there at all?</li>
<li>What if the identity register is wrong?</li>
<li>What if a transfer fails, at each point in the sequence?</li>
<li>What if a status bit never clears? Is the wait bounded?</li>
<li>What if the caller passes NULL, or a zero length?</li>
<li>Does every error path free what the success path allocated?</li>
<li>Does the error the caller sees distinguish the causes?</li>
<li>Is the register sequence the one the datasheet specifies, in that order?</li>
</ul>
<p>That last one is worth its own test with a spy, because a driver that writes the right values
in the wrong order works on the bench and fails on a different silicon revision.</p>

<h3>What this does not prove</h3>
<p>Be honest about it, because an interviewer will ask. Passing tests against a fake prove the
logic, the sequencing and the error handling. They prove nothing about timing, about your
reading of the datasheet, or about the actual silicon.</p>
<p>If your fake and your driver share the same misunderstanding, both are wrong together and
every test passes. That is why the pyramid has a hardware tier at the top, and why "it passes
on the host" is a statement about your logic rather than about your product.</p>
`,
quiz: [
{ q: "Why can a driver that calls the vendor HAL directly not be unit tested?",
o: ["The HAL is too slow", "There is nothing to substitute: the call goes straight to hardware that is not there", "The HAL is closed source", "It needs an RTOS"],
a: 1, why: "The fix is an interface, a struct of function pointers plus a context, so the driver reaches the bus through something a test can replace. Zephyr's device pointer and dt_spec already are that seam." },
{ q: "Why should a fake record delays rather than actually sleeping?",
o: ["Sleeping is not portable", "It keeps the suite instant, and lets you assert that a timeout was bounded", "The delay function is unavailable", "To reduce power"],
a: 1, why: "A driver retrying with 50 ms waits would make the suite crawl. Recording it also turns 'does it give up in under a second' into an assertion instead of a hope." },
{ q: "Which tests are worth writing against a driver fake?",
o: ["The happy path, thoroughly", "The error paths: wrong identity, a transfer failing at each point, a status bit that never clears", "Performance tests", "Tests of the fake"],
a: 1, why: "The happy path is exercised by everyone all the time. The error paths are exercised by nobody until a customer does it, and on real hardware you cannot easily make the third transfer fail." },
{ q: "What does a passing suite against a fake NOT prove?",
o: ["That the logic is right", "Timing, your reading of the datasheet, or anything about the real silicon", "That error paths work", "That memory is freed"],
a: 1, why: "If the fake and the driver share the same misunderstanding, both are wrong together and every test passes. That is why the pyramid keeps a hardware tier at the top." }
],
interview: {
q: "How do you unit test a driver that talks to an I2C sensor?",
a: "The first thing is a seam, because a driver that calls the vendor HAL directly cannot be tested at all: the call goes straight to hardware that is not there. So the driver takes a small interface, a struct of function pointers for read, write and delay plus a void-star context. On target the context holds the real I2C handle; in a test it points at my fake, and the driver cannot tell the difference. In Zephyr you get this free, because the device pointer and the i2c_dt_spec already are the seam. Then the fake, which is a small working model rather than a stub returning zero. The interesting part is what it records and what it can be told to do: an array standing in for the device's registers, a counter for transfers, and a knob saying which transfer should fail, because on real hardware I cannot make the third transfer fail and here it is one line. I record delays rather than taking them, so the suite stays instant and I can also assert that a timeout was actually bounded. And it resets at the start of every test so they cannot influence each other. The tests worth writing are almost all error paths: the device absent, a wrong identity register, a transfer failing at each point in the sequence, a status bit that never clears, a NULL argument, and whether every error path frees what the success path allocated. I would also check the register write sequence with a spy, because writing the right values in the wrong order works on the bench and fails on a different silicon revision. What I would say it does not prove is timing, my reading of the datasheet, or anything about the real part: if my fake and my driver share a misunderstanding they are wrong together and everything passes, which is why there is still a hardware tier."
}
},

{
id: "emb-test-ztest",
track: "Embedded C",
sub: "Testing",
title: "ztest and twister: testing in Zephyr",
mins: 22,
body: `
<p>Zephyr ships its own test framework and its own runner, and the combination is genuinely good:
the same test can run on your laptop and on the board without changing a line.</p>

<h3>The shape of a ztest suite</h3>
<pre>tests/scale/
  CMakeLists.txt
  prj.conf
  testcase.yaml
  src/main.c</pre>
<pre>/* CMakeLists.txt */
cmake_minimum_required(VERSION 3.20.0)
find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(scale_test)
target_sources(app PRIVATE src/main.c ../../src/scale.c)
target_include_directories(app PRIVATE ../../src)

/* prj.conf */
CONFIG_ZTEST=y

/* testcase.yaml */
tests:
  app.scale:
    tags: unit</pre>

<h3>The test file</h3>
<pre>#include &lt;zephyr/ztest.h&gt;
#include "scale.h"

ZTEST_SUITE(scale, NULL, NULL, NULL, NULL, NULL);

ZTEST(scale, test_zero_counts_is_zero_mv)
{
    zassert_equal(adc_to_mv(0, 3300), 0);
}

ZTEST(scale, test_full_scale)
{
    zassert_equal(adc_to_mv(4095, 3300), 3300,
                  "full scale should be vref");
}

ZTEST(scale, test_rejects_out_of_range)
{
    zassert_equal(adc_to_mv(4096, 3300), -1);
}</pre>
<p>The five NULLs in <code>ZTEST_SUITE</code> are the setup, before, after and teardown hooks
plus a predicate deciding whether the suite runs at all. Most suites need none of them, which
is why they are usually NULL.</p>
<p>The assertions worth knowing: <code>zassert_equal</code>, <code>zassert_true</code>,
<code>zassert_not_null</code>, <code>zassert_ok</code> for a zero return,
<code>zassert_mem_equal</code>, and <code>zassert_within</code> for a tolerance. Every one takes
an optional message, and <b>using it is worth the extra seconds</b>, because a bare
<code>zassert_equal</code> failure tells you the values and not the intent.</p>

<h3>Running it</h3>
<pre>west build -p -b native_sim -t run tests/scale
west build -p -b nrf52840dk_nrf52840 tests/scale &amp;&amp; west flash</pre>
<p><code>native_sim</code> builds the whole application, kernel included, as a native
executable. Threads, semaphores, work queues and timers all behave, and it runs in
milliseconds on your laptop. It is the reason dual targeting is easier in Zephyr than almost
anywhere else.</p>

<h3>twister, the runner</h3>
<pre>west twister -T tests/ -p native_sim
west twister -T tests/ -p nrf52840dk_nrf52840 --device-testing
west twister -T tests/ --coverage
west twister -T tests/ -p native_sim -t unit</pre>
<p>twister reads every <code>testcase.yaml</code> it finds, builds each test for each platform,
runs them and reports. In CI that is the whole test job in one line.</p>
<p>The <code>tags</code> field is what lets you run a subset: fast unit tests on every commit,
the hardware-in-the-loop set nightly.</p>

<h3>Faking hardware in a Zephyr test</h3>
<p>Two mechanisms, and they solve different problems.</p>
<p><b>An emulator.</b> Zephyr has an <code>EMUL</code> layer: a fake device that registers
against a devicetree node, so <code>i2c_burst_read_dt</code> reaches your emulator instead of
silicon. Your driver is completely unmodified, and the test sets up the emulator's register
contents. This is the right answer when testing a driver.</p>
<p><b>A devicetree overlay for the test.</b> Point the node at the emulator, or add a node that
only exists in the test build. It keeps the test's hardware description separate from the
product's.</p>
<pre>tests/widget/boards/native_sim.overlay
tests/widget/src/widget_emul.c</pre>

<h3>What native_sim does and does not prove</h3>
<p>It proves your logic, your state machines, your use of the kernel APIs, and that you have no
memory errors, especially with the sanitizers on. Those are most of your bugs.</p>
<p>It does not prove timing, interrupt latency, stack usage on the real part, or anything about
the actual peripheral. Nor does it prove your code fits in flash. Those need the board, which
is why twister supports both and why the answer is both rather than either.</p>

<h3>What to say about this in an interview</h3>
<p>That Zephyr makes the host build cheap, so the usual excuse for not testing firmware does not
apply. That <code>native_sim</code> plus twister plus the sanitizers is a suite you can run on
every commit in seconds. And that you would still run the same tests on hardware before
believing them, because a host pass is a statement about your logic rather than about your
product.</p>
`,
quiz: [
{ q: "What does <code>native_sim</code> give you?",
o: ["A cycle-accurate simulator", "The whole application including the kernel, built as a native executable that runs in milliseconds", "A remote debugger", "A device emulator only"],
a: 1, why: "Threads, semaphores, work queues and timers all behave. It is the reason dual targeting is easier in Zephyr than almost anywhere else, and it is why there is no excuse for an untested code base." },
{ q: "What is twister?",
o: ["A build system", "A runner that reads every testcase.yaml, builds each test for each platform, runs them and reports", "A debugger", "A coverage tool"],
a: 1, why: "It makes the whole CI test job one command. The tags field lets you split fast unit tests on every commit from hardware-in-the-loop runs overnight." },
{ q: "What is the EMUL layer for?",
o: ["Emulating the CPU", "A fake device registered against a devicetree node, so a driver's bus calls reach it instead of silicon", "Emulating the kernel", "Simulating timing"],
a: 1, why: "The driver is completely unmodified: it still calls i2c_burst_read_dt, and the emulator answers. It is the right mechanism when the thing under test is the driver itself." },
{ q: "What does a passing native_sim suite not prove?",
o: ["That the logic works", "Timing, interrupt latency, real stack usage, the actual peripheral, or that it fits in flash", "That the kernel APIs are used correctly", "That there are no memory errors"],
a: 1, why: "Which is why twister supports hardware targets too, and why the answer is both rather than either. A host pass is a statement about your logic, not about your product." }
],
interview: {
q: "How would you set up testing on a Zephyr project?",
a: "I would lean hard on native_sim, because it builds the whole application including the kernel as a native executable, so threads, semaphores, work queues and timers all behave and the suite runs in milliseconds on a laptop. That removes the usual excuse for not testing firmware. Tests are ztest suites: a directory with a CMakeLists, a prj.conf with CONFIG_ZTEST, a testcase.yaml and the test source, using ZTEST_SUITE and ZTEST with zassert_equal, zassert_ok and friends, and I would always pass the optional message because a bare assertion failure tells you the values and not the intent. Then twister as the runner: it finds every testcase.yaml, builds each test for each platform, runs them and reports, which makes the CI job one command, and the tags field lets me run fast unit tests on every commit and the hardware set overnight. For driver tests specifically I would use the EMUL layer rather than hand-rolling a fake, because an emulator registers against a devicetree node so the driver's i2c calls reach it unmodified, with a test-only overlay pointing at it. I would run the host suite under the address and undefined sanitizers, since that is nearly free and catches the class of bug that reaches the field as an unexplained fault. And I would be clear about the limit: a native_sim pass proves the logic, the state machines and the API usage, and proves nothing about timing, interrupt latency, real stack usage or whether it fits in flash. Those need the board, which is why twister supports device testing and why the answer is both rather than either."
}
}

);
