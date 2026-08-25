// Embedded C track, batch 6: testing depth, following Grenning's
// "Test-Driven Development for Embedded C" and Feathers on legacy code.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-tdd-loop",
track: "Embedded C",
sub: "Testing",
title: "The TDD cycle, and why the red step is not optional",
mins: 24,
body: `
<p>Test driven development is usually explained as a testing practice. It is better understood
as a design practice that happens to leave tests behind, and the difference shows up in what you
do when a test is hard to write.</p>

<h3>The micro cycle</h3>
<p>Grenning's version is five steps, and the discipline is in how small each one is:</p>
<ol>
<li>Add one small test.</li>
<li>Run every test and watch the new one <b>fail</b>.</li>
<li>Make the smallest change that passes it.</li>
<li>Run every test and watch them all pass.</li>
<li>Refactor, with the tests still passing.</li>
</ol>
<p>Minutes per cycle, not hours. If a cycle takes half an hour you have taken too big a step, and
the usual fix is to find a smaller test rather than to push on.</p>

<h3>Why step 2 matters more than it looks</h3>
<p>A passing test tells you one of two things: the code is correct, or the test checks nothing.
From outside they are identical.</p>
<p>The quiet failure modes are common. An assertion with inverted logic. A test body that never
runs because of a typo in the name or a guard. A fixture returning success unconditionally. An
assertion deleted during a refactor and never noticed.</p>
<p>Watching it fail <b>for the reason you expected</b>, then pass after the change, is the only
cheap evidence that the test is connected to the behaviour it claims to check. It is worth doing
even when you write the test after the code, which is why this step survives outside TDD.</p>

<h3>The test list</h3>
<p>Before writing any test, write the list of cases on paper or in a comment block. For a driver
init that is something like:</p>
<pre>- null io                    -&gt; invalid arg
- null out                   -&gt; invalid arg
- a null function pointer    -&gt; invalid arg
- read fails                 -&gt; error propagated unchanged
- wrong chip id              -&gt; BNO055_ERR_WRONG_PART
- allocation fails           -&gt; no leak, out untouched
- reset never completes      -&gt; timeout
- happy path                 -&gt; handle valid, out set last</pre>
<p>Two things happen. You notice error cases before you write the code, which is when they are
cheap. And the list becomes a queue, so you are never deciding what to do next while also
solving the problem in front of you.</p>
<p>Add to it whenever a new case occurs to you mid-cycle rather than chasing it immediately.</p>

<h3>Arrange, act, assert</h3>
<p>One shape for every test, so a reader never has to work out which part is which:</p>
<pre>void test_init_rejects_wrong_chip_id(void)
{
    fake_regs[BNO055_REG_CHIP_ID] = 0x00;     /* arrange */

    esp_err_t rc = bno055_init(&amp;io, &amp;dev);    /* act    */

    TEST_ASSERT_EQUAL(BNO055_ERR_WRONG_PART, rc);   /* assert */
    TEST_ASSERT_NULL(dev);
}</pre>
<p>Note the second assertion. The header promises that <code>out</code> is untouched on failure,
so the test checks it. A promise nothing verifies is a comment, not a contract.</p>

<h3>What good tests have in common</h3>
<p>The usual initials are FIRST:</p>
<ul>
<li><b>Fast.</b> Milliseconds. A slow suite gets run less, and a suite that is run less stops
being a safety net.</li>
<li><b>Isolated.</b> No test depends on another, and order does not matter. Shared state between
tests produces failures that only appear in certain sequences.</li>
<li><b>Repeatable.</b> Same result every run, on any machine. No real delays, no real hardware,
no wall clock.</li>
<li><b>Self-verifying.</b> Pass or fail, with no human reading output to decide.</li>
<li><b>Timely.</b> Written close to the code, not months later.</li>
</ul>

<h3>The claim worth understanding</h3>
<p>Grenning's phrasing is that as the tests get more specific, the code gets more generic. Each
new case makes a hardcoded answer untenable, so the implementation is pushed toward something
general, one step at a time.</p>
<p>That is why it is a design practice. You are not verifying a design you already chose; the
sequence of tests is doing some of the choosing. And the moment a test is painful to write, that
is information about the design rather than an obstacle to push through.</p>
`,
quiz: [
{ q: "Why watch a new test fail before making it pass?",
o: ["It is a formality", "A test that has never failed may assert nothing at all", "To measure speed", "To check the compiler"],
a: 1, why: "Inverted assertions, bodies that never run, fixtures returning unconditional success and accidentally deleted assertions all pass happily. Seeing it fail for the expected reason is the only cheap evidence the test is connected to the behaviour." },
{ q: "What is the purpose of writing a test list first?",
o: ["Documentation", "You notice error cases while they are cheap, and you never decide what to do next while solving a problem", "It is required by Unity", "To estimate effort"],
a: 1, why: "It separates deciding what to test from working out how. New cases that occur mid-cycle go on the list rather than derailing the current one." },
{ q: "In FIRST, what does Isolated mean?",
o: ["The test runs on separate hardware", "No test depends on another and order does not matter", "The code is in its own file", "It uses no globals"],
a: 1, why: "Shared state between tests produces failures that appear only in certain sequences, which are among the most confusing to debug. Each test arranges everything it needs." },
{ q: "A test is difficult to write. What does that usually indicate?",
o: ["The test is too ambitious", "Something about the design, most often a dependency that cannot be substituted", "You need a bigger framework", "Nothing"],
a: 1, why: "Difficulty is feedback. The usual cause is a hard-coded dependency on the platform, and fixing the structure is cheaper than maintaining an elaborate stub to work around it." }
],
interview: {
q: "You have said you use TDD. Convince me it is worth the time on a firmware project.",
a: "I would put the argument in terms of when defects get found rather than in terms of purity. A fault found in the cycle where I wrote the code costs minutes, because the change is still in my head and the search space is one function. The same fault found during integration costs a day, and found in the field it costs a site visit and a firmware release. On a contract project there is a second argument that matters more: client hardware is scarce and temporary. If the logic can only be exercised with the board attached, then testing stops the day the board goes back, and when the client returns eighteen months later with a bug I have source and nothing to run it on. A host suite still works. I would also be honest about where it does not apply. Timing, electrical behaviour and anything about a real peripheral belong on hardware, and trying to unit test those is wasted effort. What TDD is good at is logic, error paths and protocol handling, which is most of a driver by line count and almost all of the paths that never execute during normal testing. And the design effect is real: the discipline pushes hardware access behind a narrow interface, and that interface is what makes the driver portable to the next project."
}
},

{
id: "emb-tdd-doubles",
track: "Embedded C",
sub: "Testing",
title: "Test doubles and the three ways to substitute in C",
mins: 26,
body: `
<p>A double is anything standing in for a real dependency during a test. Two questions decide
which you need: what is the test asserting, and how are you going to swap the real thing out.</p>

<h3>The five kinds</h3>
<p>Meszaros' vocabulary, which Grenning uses:</p>
<ul>
<li><b>Dummy.</b> Passed to satisfy a signature and never used. A null callback where the code
under test does not call it.</li>
<li><b>Stub.</b> Returns canned answers. No memory of what happened. Keeps the code running so
you can assert on its result.</li>
<li><b>Spy.</b> Records calls, arguments and order so the test can assert on them afterwards.</li>
<li><b>Fake.</b> A working but simplified implementation. A 256-byte array standing in for a
device's register file.</li>
<li><b>Mock.</b> Programmed with expectations up front and fails during execution if they are
violated. This is what CMock generates.</li>
</ul>

<h3>Choosing between them</h3>
<p>The question is what you are asserting:</p>
<ul>
<li>Asserting on a <b>returned value</b>? A stub or a fake.</li>
<li>Asserting on the <b>final state</b> of the device? A fake, because it has to behave
coherently across several operations.</li>
<li>Asserting on the <b>interaction</b>, meaning which calls happened and in what order? A spy or
a mock.</li>
</ul>
<p>That last distinction is the one people get wrong. "Init wrote CTRL1 with 0x38 after the reset
completed" is a statement about the sequence of calls, not about any final value, and a fake
cannot tell you: it ends up with the right contents regardless of what order the writes
arrived.</p>

<h3>How you actually swap it out</h3>
<p>C has three mechanisms, and Grenning covers all three because they suit different situations.</p>

<svg class="fig" viewBox="0 0 680 401" role="img" aria-label="Three ways to substitute a dependency in C: link-time, function pointer and preprocessor">
<rect class="bx" x="215" y="50" width="205" height="30" rx="4"/>
<text class="th" x="231" y="70">Production build</text>
<rect class="bxa" x="435" y="50" width="205" height="30" rx="4"/>
<text class="th" x="451" y="70">Test build</text>
<rect class="bx" x="40" y="95" width="160" height="54" rx="4"/>
<text class="th" x="56" y="119">Link-time</text>
<text class="ts" x="56" y="137">chosen at link</text>
<rect class="bx" x="215" y="95" width="205" height="54" rx="4"/>
<text class="ts" x="231" y="127">link i2c_real.o</text>
<rect class="bxa" x="435" y="95" width="205" height="54" rx="4"/>
<text class="ts" x="451" y="127">link i2c_fake.o</text>
<rect class="bx" x="40" y="165" width="160" height="54" rx="4"/>
<text class="th" x="56" y="189">Function pointer</text>
<text class="ts" x="56" y="207">chosen at run time</text>
<rect class="bx" x="215" y="165" width="205" height="54" rx="4"/>
<text class="ts" x="231" y="197">io.read = esp_read</text>
<rect class="bxa" x="435" y="165" width="205" height="54" rx="4"/>
<text class="ts" x="451" y="197">io.read = fake_read</text>
<rect class="bx" x="40" y="235" width="160" height="54" rx="4"/>
<text class="th" x="56" y="259">Preprocessor</text>
<text class="ts" x="56" y="277">chosen at compile</text>
<rect class="bx" x="215" y="235" width="205" height="54" rx="4"/>
<text class="ts" x="231" y="267">#define READ i2c_read</text>
<rect class="bxa" x="435" y="235" width="205" height="54" rx="4"/>
<text class="ts" x="451" y="267">#define READ fake_read</text>
<rect class="bx" x="40" y="305" width="600" height="76" rx="4"/>
<text class="th" x="56" y="329">The driver source is identical in both builds</text>
<text class="ts" x="56" y="349">That is the point: you test the code you ship, not a copy of it. Only what</text>
<text class="ts" x="56" y="367">it is linked against, pointed at, or compiled with changes.</text>
</svg>
<p class="figcap">Three seams. Which one is available to you is often decided by code you did not
write.</p>

<h3>Trade-offs</h3>
<p><b>Link-time</b> needs no change to the production source at all, which makes it the only
option for code you cannot modify, and it is how CMock works. The cost is that the substitution
is per executable, so one test cannot use the real thing while another uses the fake without
separate binaries.</p>
<p><b>Function pointer</b> is the injected transport you already use. It is per instance and
switchable at run time, so one test can exercise two devices with different behaviour. It costs
an indirect call and it requires the production design to accommodate it, which is exactly the
design pressure that makes it worth having.</p>
<p><b>Preprocessor</b> is the crude one. It is genuinely useful for wrapping something with no
other seam, such as a vendor macro, but it means the test build compiles different source from
the production build, which weakens the guarantee. Keep it for cases where nothing else works.</p>

<h3>The measurement hiding in your test setup</h3>
<p>How much you have to replace is a direct reading of how coupled the code is.</p>
<p>A properly layered driver needs three functions replaced: read, write and delay. If you find
yourself faking a whole vendor I2C API, with its handles and init structures and status enums,
the driver is talking to the platform rather than to an abstraction you defined.</p>
<p>The useful move is to treat that as a design signal rather than a problem to grind through.
An elaborate stub is a maintenance liability that also fails to catch the thing it was
protecting you from.</p>
`,
quiz: [
{ q: "Which double do you need to assert that init wrote CTRL1 after the reset completed?",
o: ["A stub", "A spy or a mock", "A fake", "A dummy"],
a: 1, why: "Ordering is a property of the interaction, not of the final state. A fake ends up with the right register contents regardless of what order the writes arrived in, so it cannot distinguish the two cases." },
{ q: "What distinguishes a fake from a stub?",
o: ["Nothing", "A fake is a working simplified implementation that behaves coherently; a stub only returns canned answers", "A fake runs on hardware", "A stub records calls"],
a: 1, why: "Write 0x38 to a fake register file and reading it back gives 0x38, so sequences where a later step depends on an earlier write actually work. A stub has no memory." },
{ q: "Which substitution mechanism needs no change to the production source?",
o: ["Function pointer", "Link-time", "Preprocessor", "None of them"],
a: 1, why: "You compile the same source and link a different object file providing the same symbol. It is the only option for code you cannot modify, and it is how CMock works." },
{ q: "Why is preprocessor substitution the last resort?",
o: ["It is slow", "The test build compiles different source from the production build, which weakens the guarantee", "It does not work in C", "It needs a framework"],
a: 1, why: "The whole value of the other two is that the code under test is byte-for-byte the code you ship. It remains genuinely useful for wrapping something with no other seam, such as a vendor macro." }
],
interview: {
q: "How would you test a driver's behaviour when the bus NAKs on the third write?",
a: "That is a case you cannot produce on real hardware, which is exactly why it needs a double. I would use a fake for the transport, because the driver's init is a sequence and a later step depends on earlier ones, so canned answers from a stub would not exercise the real path. The fake keeps a register array and a call counter, and I program it to return an error on the third write specifically. Then the test asserts two things: that the error came back unchanged rather than being flattened into a generic failure, and that nothing leaked, so the handle was freed and the caller's out pointer was left untouched. That second assertion is the one people skip, and it is the one that catches a resource leak on an error path that would otherwise never execute. If I also wanted to check the ordering, that the reset poll happened before the configuration writes, I would add a spy or use the fake's call log, because ordering is a property of the interaction rather than of the final state. And the substitution mechanism would be the function pointer transport, since it is per instance and lets the test switch behaviour at run time without a separate binary."
}
},

{
id: "emb-tdd-unity",
track: "Embedded C",
sub: "Testing",
title: "Unity, CMock, Ceedling and CppUTest",
mins: 25,
body: `
<p>The tooling is small and worth knowing by name, because "I have used a unit test framework"
is a much weaker answer than being able to say what each piece does.</p>

<h3>Start smaller than you think</h3>
<p>The first goal is to prove the code can be compiled and exercised off-target at all. A
<code>main</code> with a few checks does that in ten minutes:</p>
<pre>int main(void)
{
    int fails = 0;
    fails += test_init_rejects_null_io();
    fails += test_init_rejects_wrong_id();
    printf("%d failures\\n", fails);
    return fails != 0;
}</pre>
<p>Reaching for Ceedling first means a day on infrastructure with nothing proven, and if the
driver turns out to be too coupled to build on the host, all of it was wasted. Migrating to a
framework afterwards is easy.</p>

<h3>Unity</h3>
<p>A single .c and .h pair. Assertion macros and a runner:</p>
<pre>#include "unity.h"

void setUp(void)    { fake_i2c_reset(); }     /* before every test */
void tearDown(void) { }                       /* after  every test */

void test_init_rejects_null_io(void)
{
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, bno055_init(NULL, &amp;dev));
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_init_rejects_null_io);
    return UNITY_END();
}</pre>
<p>The assertions worth knowing beyond <code>TEST_ASSERT_EQUAL</code>:
<code>TEST_ASSERT_EQUAL_HEX8</code>, which reports mismatches in hex rather than decimal and is
far more readable for register values; <code>TEST_ASSERT_EQUAL_MEMORY</code> for buffers;
<code>TEST_ASSERT_EQUAL_INT8_ARRAY</code>; and <code>TEST_ASSERT_FLOAT_WITHIN</code>, because
comparing floats for equality is a bug.</p>
<p>The <code>_MESSAGE</code> variants take a string, which is what turns "expected 56 was 0" into
something you can act on when it fails six months later.</p>

<h3>Why runner generation exists</h3>
<p>C has no reflection, so nothing can enumerate the test functions in a file. Somebody has to
write the <code>RUN_TEST</code> lines.</p>
<p>Doing that by hand means a test you wrote but forgot to register silently never runs, and it
does not fail, so nothing tells you. Unity ships a Ruby script that parses the file and generates
the runner, which removes the class entirely. It is the main reason to adopt the generator even
on a small project.</p>

<h3>CMock</h3>
<p>Give it a header and it generates a mock implementation of every function in it, plus an
expectation API:</p>
<pre>/* the test says what it expects to happen */
i2c_read_ExpectAndReturn(handle, 0x00, buf, 4, ESP_OK);
i2c_write_ExpectAndReturn(handle, 0x3D, &amp;mode, 1, ESP_OK);

bno055_init(&amp;io, &amp;dev);      /* a call out of order fails here */
</pre>
<p>It works by link-time substitution: the mock provides the same symbols, so the code under
test is unchanged. That is its strength and its limitation. It is excellent for a C API you
cannot modify, and it produces tests that are tightly bound to the exact call sequence, which
makes them brittle if you refactor the implementation without changing the behaviour.</p>
<p>Use it where the interaction genuinely is the specification. Prefer a fake where the behaviour
is.</p>

<h3>Ceedling</h3>
<p>The build system that ties Unity, CMock and rake together. Point it at a directory, and
<code>test_foo.c</code> is compiled against <code>foo.c</code> with mocks generated automatically
for every header it includes as <code>mock_bar.h</code>.</p>
<p>The convention over configuration is the appeal: no makefile per test. The cost is a Ruby
dependency and a certain amount of magic, which is a real consideration if the rest of your
build is CMake.</p>

<h3>CppUTest</h3>
<p>What Grenning's book actually uses for most of its examples. Written in C++ but tests C
happily, and the reason to consider it is that it has <b>memory leak detection built in</b>:
a test that allocates and does not free fails, and it names the file and line.</p>
<p>For driver code with allocation on error paths that is a genuinely valuable property, and it
is not something Unity gives you.</p>

<h3>What to say about this in an interview</h3>
<p>Naming the pieces and what each is for beats claiming expertise in any of them. Unity is the
assertions and the runner. CMock generates mocks by link-time substitution. Ceedling is the build
glue. CppUTest is the alternative with leak detection. And the first test matters more than which
of them you picked.</p>
`,
quiz: [
{ q: "Why does Unity ship a script to generate the test runner?",
o: ["To speed up compilation", "C has no reflection, so a test you forgot to register silently never runs", "To support C++", "To generate mocks"],
a: 1, why: "Nothing can enumerate the functions in a file, so somebody must write the RUN_TEST lines. Hand-written runners fail silently when a test is missed, because a test that does not run does not fail." },
{ q: "How does CMock substitute the real implementation?",
o: ["Function pointers", "Link-time substitution: the mock provides the same symbols", "The preprocessor", "It rewrites the source"],
a: 1, why: "That is why it works on a C API you cannot modify. The trade is that the tests bind tightly to the exact call sequence, so refactoring the implementation without changing behaviour can still break them." },
{ q: "What does CppUTest offer that Unity does not?",
o: ["C support", "Built-in memory leak detection that names the file and line", "Faster tests", "Mock generation"],
a: 1, why: "For driver code that allocates and must free on every error path, a test that fails when memory leaks is genuinely valuable, and it is what Grenning's book uses for most examples." },
{ q: "Why prefer TEST_ASSERT_EQUAL_HEX8 over TEST_ASSERT_EQUAL for a register value?",
o: ["It is faster", "Mismatches are reported in hex, which is readable for register values", "It checks the type", "It is required"],
a: 1, why: "Expected 0x38 was 0x30 is immediately meaningful; expected 56 was 48 needs conversion before it means anything. The _MESSAGE variants add a string, which matters when the failure appears months later." }
],
interview: {
q: "How would you set up unit testing on a firmware project that has none?",
a: "I would start far smaller than the tooling question suggests. The first goal is proving that some piece of logic can be compiled and run off-target at all, and a main with a handful of if statements does that in ten minutes. If the code turns out to be too coupled to the vendor SDK to build on the host, I have learned that immediately rather than after a day of build configuration. Once one test runs, I would move to Unity, mainly for the assertion macros and the generated runner. The generator matters more than it sounds: C has no reflection, so runners are hand-written, and a test you forgot to register silently never runs and never fails. Then I would add CMock only where I need to fake a C API I cannot change, and prefer a hand-written fake where the behaviour rather than the call sequence is the specification, because mock-based tests bind to the exact sequence and get brittle under refactoring. Ceedling ties it together if the project is comfortable with a Ruby dependency; if the rest of the build is CMake I would wire Unity in directly instead. I would also run the host build under UBSan and ASan, because that catches undefined behaviour and memory errors for almost no effort, and put the whole thing in CI on a clean machine so the build cannot quietly depend on one engineer's laptop."
}
},

{
id: "emb-tdd-dualtarget",
track: "Embedded C",
sub: "Testing",
title: "Dual targeting: develop on the host, run on the target",
mins: 24,
body: `
<p>Dual targeting means the same source builds and runs in two places: on your machine for
development, and on the target for the real thing. It is the practice that makes everything else
in this batch possible.</p>

<h3>Why the host build is worth the effort</h3>
<ul>
<li><b>Speed.</b> A host suite runs in milliseconds. The target cycle is compile, flash, run,
observe, which is seconds at best and involves hardware you may be sharing.</li>
<li><b>Availability.</b> It runs on every commit, on every engineer's machine, in CI, and
eighteen months later when the client's board has gone back.</li>
<li><b>Tooling.</b> This is the underrated one. On the host you get UBSan, AddressSanitizer,
Valgrind, gcov and a debugger that never loses its connection.</li>
</ul>
<p>That third point deserves emphasis. Running your driver logic under UndefinedBehaviorSanitizer
catches signed overflow, out-of-range shifts, misaligned access and null dereference at run time,
with a file and line. There is no equivalent on target. For the cost of one extra build
configuration you get a class of bug found automatically.</p>

<h3>What the host build genuinely proves</h3>
<p>Logic, error paths, protocol handling, state machine transitions, buffer management,
serialisation. On a typical driver that is most of the code by line count and nearly all of the
paths that never execute during normal operation.</p>

<h3>What it does not prove</h3>
<p>Be honest about this, because overclaiming is what gives host testing a bad name:</p>
<ul>
<li>Timing, interrupt latency, and anything about real-time behaviour.</li>
<li>Electrical behaviour, rise times, marginal supplies.</li>
<li>Whether the peripheral registers do what the datasheet says.</li>
<li>Alignment faults, since x86 tolerates unaligned access that Cortex-M0 does not.</li>
<li>Anything about the target compiler, which is a different compiler with different bugs and
different optimisation decisions.</li>
</ul>

<h3>Grenning's point about running on target anyway</h3>
<p>Because of that last list, the suite should also be built with the cross compiler and run on
the target periodically. Not on every commit, but often enough that a divergence is caught while
it is still small.</p>
<p>What that catches is specific and worth knowing: differences in type sizes, alignment
requirements, endianness, and compiler behaviour. A test that passes on the host and fails on
target has found a genuine portability defect, and it has found it in a test rather than in a
product.</p>

<h3>The build matrix</h3>
<p>A mature setup has four configurations, and each earns its place:</p>
<pre>host / debug       fast iteration, assertions on, sanitizers on
host / release     the optimisation level you ship, to surface UB and volatile faults
target / debug     on-target test suite, -Og, assertions on
target / release   the actual product</pre>
<p>The second one is the one people leave out. Developing at -O0 and shipping at -O2 hides
missing <code>volatile</code> and undefined behaviour until the release build, which has had the
least testing. Running the suite at the shipped optimisation level surfaces those during
development.</p>

<h3>A free portability check</h3>
<p>If your host is 64-bit and your target is 32-bit, the host build already exercises different
pointer and <code>long</code> sizes. Code that assumes <code>sizeof(void *) == sizeof(int)</code>
breaks on one of them, which is a bug you wanted to find anyway.</p>
<p>Some teams deliberately build the host suite both 32-bit and 64-bit, and occasionally
big-endian under an emulator, precisely to shake out these assumptions.</p>

<h3>What makes it possible</h3>
<p>None of this works unless the code under test can be compiled without the vendor SDK. That is
the layering test from the drivers lesson, and this is what it buys you.</p>
<p>The board layer, the bus layer and the adapter stay on target. The driver logic, the state
machines, the protocol code and the maths all build and run anywhere.</p>
`,
quiz: [
{ q: "What is the underrated benefit of a host build?",
o: ["It is faster", "Host-only tooling: UBSan, AddressSanitizer, Valgrind and gcov", "It needs no compiler", "It proves timing"],
a: 1, why: "Speed and availability matter, but running the logic under UndefinedBehaviorSanitizer catches signed overflow, bad shifts, misaligned access and null dereference with a file and line, and there is no equivalent on target." },
{ q: "Why run the test suite on the target as well, not just the host?",
o: ["It is faster there", "It catches type sizes, alignment, endianness and target compiler differences", "The host build is unreliable", "Regulations require it"],
a: 1, why: "A test passing on host and failing on target has found a genuine portability defect, in a test rather than in a product. Grenning's point is that dual targeting means both, not host instead of target." },
{ q: "Which build configuration do teams most often leave out?",
o: ["host debug", "host release, at the optimisation level you actually ship", "target release", "target debug"],
a: 1, why: "Developing at -O0 and shipping at -O2 hides missing volatile and undefined behaviour until the release build, which has had the least testing. Running the suite at the shipped level surfaces them during development." },
{ q: "What does a 64-bit host build give you for free against a 32-bit target?",
o: ["Faster tests", "Exposure of code that assumes pointer and long sizes", "Better coverage", "Nothing"],
a: 1, why: "Different pointer and long sizes mean assumptions like sizeof(void *) == sizeof(int) break on one build or the other. Some teams deliberately build 32-bit and 64-bit for exactly this." }
],
interview: {
q: "What can a host-based test suite not tell you about firmware?",
a: "Anything physical, and I think being clear about that is what makes the rest credible. It cannot tell me about timing or interrupt latency, about electrical behaviour like rise times or a marginal supply, or about whether a peripheral register actually behaves the way the datasheet claims, which is often the real question during bring-up. It will not catch alignment faults either, because x86 tolerates unaligned access that a Cortex-M0 faults on. And it is a different compiler, so the code generation, the optimisation decisions and the compiler bugs are all different. That is why dual targeting means both: I would build the same suite with the cross compiler and run it on target periodically, because a test that passes on host and fails on target has found a real portability defect and found it in a test instead of in a product. What the host build does cover is logic, error paths, protocol handling and state machines, which on a typical driver is most of the code and nearly all of the paths that never run during normal operation. Plus the sanitizers, which have no on-target equivalent and catch undefined behaviour automatically."
}
},

{
id: "emb-tdd-legacy",
track: "Embedded C",
sub: "Testing",
title: "Getting legacy firmware under test",
mins: 26,
body: `
<p>Michael Feathers defines legacy code as code without tests, which is deliberately blunt and
useful: it makes the problem about the safety net rather than about age or style.</p>

<h3>The dilemma</h3>
<p>To change code safely you want tests. To write tests you usually have to change the code, so
it can be built in isolation. That is circular, and every technique here exists to break the
circle.</p>

<h3>Seams</h3>
<p>A <b>seam</b> is a place where you can change behaviour without editing at that place. C has
three, and they are the same three substitution mechanisms:</p>
<ul>
<li><b>Link seam.</b> Compile the same source, link a different object providing the same
symbols. The most powerful for legacy code because it needs no source change at all.</li>
<li><b>Preprocessing seam.</b> Redefine a name at compile time. Ugly, and the only option when
the dependency is a macro.</li>
<li><b>Object seam.</b> A function pointer the caller supplies. The cleanest, and the one you
have to introduce yourself.</li>
</ul>
<p>The first question when facing an untestable function is not "how do I restructure this" but
"which seam already exists". Often the link seam does, and you can get a first test running
today without touching the file.</p>

<h3>Characterisation tests</h3>
<p>Before changing behaviour you do not understand, capture what it currently does. Not what it
should do, what it does.</p>
<pre>/* not a specification: a record of current behaviour */
void test_characterise_scale_at_zero(void)
{
    TEST_ASSERT_EQUAL(0, scale_reading(0));
}
void test_characterise_scale_negative(void)
{
    TEST_ASSERT_EQUAL(-1, scale_reading(-100));   /* surprising, but true today */
}</pre>
<p>Write the assertion with a guess, run it, and let the failure tell you the real answer. Then
put the real answer in. That feels backwards and it is the fastest way to document behaviour
nobody remembers.</p>
<p>Some of what you capture will be bugs. Record them as they are, get the tests green, and fix
them deliberately afterwards as a change with a safety net, rather than mixing the two.</p>

<h3>Sprout and wrap</h3>
<p>When you must add behaviour to a function you cannot safely restructure:</p>
<p><b>Sprout.</b> Write the new logic as a separate, tested function, and add a single call to it
from the untested one. The new code is fully covered, and the risky function changed by one
line.</p>
<pre>void process_sample(int raw)      /* 400 lines, no tests */
{
    ...
    apply_calibration(&amp;raw);      /* new, tested, one line added */
    ...
}</pre>
<p><b>Wrap.</b> Rename the original, write a new function with the old name that calls it and
adds the new behaviour. Every existing caller is unchanged.</p>
<p>Neither is elegant. Both let you make progress without a rewrite you cannot justify, and they
leave the codebase slightly better tested than you found it.</p>

<h3>The embedded-specific obstacle</h3>
<p>The usual blocker is a direct register access buried in the logic:</p>
<pre>void motor_step(void)
{
    if (GPIOA-&gt;IDR &amp; LIMIT_PIN) { ... }    /* cannot run on a host */
}</pre>
<p>The lowest-friction fix is not to redesign the module. It is to extract that access into a tiny
function, then use a link seam to replace it in the test build:</p>
<pre>bool limit_switch_active(void) { return (GPIOA-&gt;IDR &amp; LIMIT_PIN) != 0; }</pre>
<p>One function, one obvious change, and now the logic is testable. Repeat as you touch things.
That incremental approach is what actually happens on real projects, as opposed to the rewrite
that gets proposed and never scheduled.</p>

<h3>Where to start</h3>
<p>Not with the worst file. Start with something you are about to change anyway, because that is
where the tests pay for themselves immediately, and because you need the safety net there
regardless.</p>
`,
quiz: [
{ q: "How does Feathers define legacy code?",
o: ["Code over five years old", "Code without tests", "Code in an old language", "Undocumented code"],
a: 1, why: "Deliberately blunt, and useful: it makes the problem about the missing safety net rather than about age or style. Freshly written untested code is legacy by this definition." },
{ q: "What is a seam?",
o: ["A module boundary", "A place where behaviour can be changed without editing at that place", "A test fixture", "A linker section"],
a: 1, why: "C has three: link, preprocessing and object. When facing an untestable function, the first question is which seam already exists, because the link seam often lets you get a test running without touching the file." },
{ q: "What is a characterisation test for?",
o: ["Specifying correct behaviour", "Recording what the code currently does, including its bugs", "Measuring performance", "Checking coverage"],
a: 1, why: "You write a guess, let it fail, and put the real answer in. Some of what you capture will be wrong; record it as-is, get green, then fix deliberately as a separate change with a safety net." },
{ q: "You must add logic to a 400-line untested function. What is the sprout technique?",
o: ["Rewrite the function", "Write the new logic as a separate tested function and add one call to it", "Comment out the old code", "Copy the function and edit the copy"],
a: 1, why: "The new code is fully covered and the risky function changed by exactly one line. Wrapping is the sibling: rename the original and give the new name to a function that calls it." }
],
interview: {
q: "You inherit 20,000 lines of firmware with no tests and a bug to fix. What do you do?",
a: "I would not start by proposing a rewrite or by trying to get the whole thing under test, because neither is schedulable. I would start where I have to change something anyway, since that is where a safety net pays for itself immediately. First I would try to get the relevant module compiling on the host at all, and the usual blocker is a direct register access buried in the logic. Rather than redesign the module I would extract that access into a one-line function and use a link seam to replace it in the test build, which needs no change to the logic itself. Then characterisation tests: not what the code should do, but what it actually does today, written by guessing an assertion, letting it fail, and putting the real answer in. Some of that will capture bugs, and I would record them as they are, get everything green, and fix them afterwards as a separate change so I am never fixing and refactoring at the same time. For the bug itself, if it is in a function I cannot safely restructure, I would sprout: write the fix as a separate tested function and add one call to it, so the new code is covered and the risky function changed by one line. And I would leave the module slightly better tested than I found it rather than trying to finish the job, because the alternative is a large change nobody will approve."
}
},

{
id: "emb-tdd-design",
track: "Embedded C",
sub: "Testing",
title: "Testability as design pressure",
mins: 23,
body: `
<p>The claim in the drivers lesson was that testability is a design property rather than a testing
activity. This is why, and what it looks like when you take it seriously.</p>

<h3>Pain in the test is a design signal</h3>
<p>Specific difficulties map to specific design problems, and the mapping is reliable enough to
use as a diagnostic:</p>
<ul>
<li><b>The setup is enormous.</b> Too many dependencies. The unit is doing several jobs.</li>
<li><b>You cannot construct the object in a known state.</b> Hidden global state.</li>
<li><b>You must fake a whole vendor API.</b> The abstraction boundary is in the wrong place.</li>
<li><b>The test needs a real delay.</b> Time is a dependency you did not inject.</li>
<li><b>Only one instance is possible.</b> Something is a file-scope static that should be in a
handle.</li>
<li><b>You cannot provoke the error path.</b> The failure source is not substitutable.</li>
</ul>
<p>In every case the cheap response is to work around it in the test, and the correct response is
to fix the design. The workaround leaves you with a complicated test that is itself a
liability.</p>

<h3>Dependency inversion, in C</h3>
<p>The high-level policy should not depend on the low-level detail. Both should depend on an
abstraction.</p>
<p>Concretely, the driver must not call <code>i2c_master_transmit</code>. The driver defines what
it needs, a struct of function pointers, and the adapter satisfies it. The arrow between the
driver and the platform has been reversed: the platform now depends on the driver's
definition.</p>
<pre>/* the driver owns this declaration */
typedef struct {
    int  (*read) (void *ctx, uint8_t reg, uint8_t *buf, size_t len);
    int  (*write)(void *ctx, uint8_t reg, const uint8_t *buf, size_t len);
    void (*delay_ms)(void *ctx, uint32_t ms);
    void *ctx;
} dev_io_t;</pre>
<p>That is the whole of dependency inversion in C. No framework, no container, four members.</p>

<h3>Interface segregation</h3>
<p>Note what is <b>not</b> in that struct. No bus initialisation, no clock configuration, no chip
select control, no error string formatting.</p>
<p>The driver declares only what it actually uses, so a test double is three functions rather than
thirty. That is interface segregation doing real work: every member you add is a member every
double must provide.</p>

<h3>Single responsibility, measured</h3>
<p>The usual phrasing is that a module should have one reason to change. A more practical test for
firmware: <b>how many things must you fake to test it?</b></p>
<p>Three is a well-factored driver. Ten means the unit is doing several jobs, and splitting it
will make both the code and the tests better.</p>

<h3>The humble object</h3>
<p>Some code genuinely cannot be tested off-target: the register pokes, the interrupt handler
prologue, the vendor calls. The technique is to make that layer as <b>thin and stupid</b> as
possible, with no decisions in it, and push every decision into something testable.</p>
<pre>void ADC_IRQHandler(void)          /* humble: no logic */
{
    uint16_t raw = ADC1-&gt;DR;
    adc_sample_received(raw);      /* everything interesting is here, and tested */
}</pre>
<p>You are not eliminating untestable code; you are shrinking it to the point where reading it is
sufficient review. That is a legitimate and honest position, and it is a better answer than
claiming full coverage.</p>

<h3>Why "we will add tests later" does not happen</h3>
<p>Not laziness. If the driver calls the HAL directly, retrofitting the indirection means changing
every call site, and the structure that made it untestable is usually load-bearing by then.</p>
<p>The obstacle is architectural, and architecture is decided at the start. That is the real
argument for writing the first test early: not because the test is valuable on day one, but
because writing it forces a boundary to exist while it is still cheap to put one there.</p>
`,
quiz: [
{ q: "Your test needs a real one-second delay to run. What is the design problem?",
o: ["The test is too slow", "Time is a dependency that was not injected", "The RTOS is wrong", "Nothing"],
a: 1, why: "A driver calling vTaskDelay depends on FreeRTOS and forces every timeout test to take real seconds. An injected delay function lets the double advance time instantly, which is why the transport struct has one." },
{ q: "What is dependency inversion in C, concretely?",
o: ["Using a framework", "The driver declares a struct of function pointers it needs, and the adapter satisfies it", "Calling the HAL through a wrapper", "Using void pointers"],
a: 1, why: "The arrow reverses: rather than the driver depending on the platform, the platform depends on a definition the driver owns. Four struct members, no framework." },
{ q: "What is a practical single-responsibility test for a firmware module?",
o: ["Line count", "How many things you must fake to test it", "Number of functions", "Number of includes"],
a: 1, why: "Three is a well-factored driver. Ten means the unit is doing several jobs, and splitting it improves both the code and the tests." },
{ q: "What is the humble object pattern?",
o: ["Using small functions", "Making the untestable layer as thin and decision-free as possible, with all logic pushed into testable code", "Avoiding globals", "Writing fewer tests"],
a: 1, why: "You do not eliminate untestable code; you shrink it until reading it is sufficient review. An ISR that reads a register and calls a tested function is the canonical example." }
],
interview: {
q: "You are reviewing a driver that calls the vendor HAL directly. What do you say?",
a: "I would frame it as a consequence rather than a style objection, because saying it should use dependency injection sounds like a preference. The consequence is that this code can only ever run on this vendor's silicon with the part physically attached. That means the error paths cannot be exercised at all, since you cannot make a real sensor report the wrong chip ID or NAK on the third write, and those are exactly the paths that run when something is wrong in the field. It also means the tests stop working the day the client's board goes back, which on contract work is a scheduling problem as much as a quality one. Then I would say what I would change: the driver declares a small struct of function pointers for what it actually needs, read, write and a delay, plus an opaque context so more than one instance is possible, and the adapter satisfies it. That is four members and no framework. I would also point out the timing of it, because retrofitting that later means changing every call site and by then the structure is usually load-bearing, which is why we will add tests later so rarely happens. And if there is genuinely untestable code left, register pokes and the handler prologue, I would want it as thin as possible with no decisions in it, so that reading it is sufficient review."
}
},

{
id: "emb-tdd-coverage",
track: "Embedded C",
sub: "Testing",
title: "Coverage, mutation testing and what tests do not tell you",
mins: 24,
body: `
<p>A green suite and 90 per cent coverage feel like evidence. They are weaker evidence than they
look, and knowing exactly how they are weak is what separates someone who uses the numbers from
someone who quotes them.</p>

<h3>The three kinds of coverage</h3>
<ul>
<li><b>Statement.</b> Was this line executed? The weakest.</li>
<li><b>Branch, or decision.</b> Did every branch go both ways? Meaningfully stronger.</li>
<li><b>MC/DC.</b> Modified Condition/Decision Coverage: for a compound condition, has each
sub-condition been shown to independently change the outcome? Required for DO-178C Level A
avionics.</li>
</ul>
<p>The difference matters:</p>
<pre>if (a &amp;&amp; b) { do_thing(); }</pre>
<p>One test with a and b both true gives 100 per cent statement coverage of the body and tells you
almost nothing. Branch coverage additionally needs a case where the condition is false. MC/DC
needs cases proving that a alone and b alone each flip the result.</p>

<h3>Getting the numbers</h3>
<p>On a host build it is two flags:</p>
<pre>gcc --coverage -O0 driver.c test_driver.c -o tests
./tests
gcov driver.c            # or lcov + genhtml for a browsable report</pre>
<p>Note <code>-O0</code>. Optimisation moves and merges code, so coverage at higher levels is
harder to attribute. This is one of the few places where measuring at -O0 is the right call.</p>

<h3>The fundamental limitation</h3>
<p>Coverage measures what was <b>executed</b>. It says nothing about what was <b>verified</b>.</p>
<pre>void test_useless(void)
{
    bno055_init(&amp;io, &amp;dev);      /* 100% coverage of init */
}                                /* zero assertions */</pre>
<p>That test executes every line and asserts nothing. It passes forever, whatever you do to the
code.</p>
<p>So coverage is best read as a <b>negative</b> signal. Uncovered lines definitely are not
tested; covered lines merely might be. The useful question is not "is coverage high" but "what is
uncovered, and is that acceptable?" That list is usually short and specific, and it is often the
error paths.</p>

<h3>Mutation testing</h3>
<p>The technique that measures what coverage cannot. Change the code deliberately, then check
whether a test fails:</p>
<pre>if (len &gt; MAX)     -&gt;   if (len &gt;= MAX)
return -1;         -&gt;   return 0;
a + b              -&gt;   a - b</pre>
<p>If every test still passes, no test was actually checking that behaviour. A surviving mutant is
a hole in the assertions, not in the coverage.</p>
<p>Full tooling for C is heavier than most projects want. Doing it by hand for ten minutes on your
most safety-relevant function is cheap and genuinely surprising, and it is a good thing to
mention in an interview because it shows you know what coverage does not measure.</p>

<h3>Flaky tests</h3>
<p>A test that sometimes passes destroys the value of the whole suite, because people start
rerunning failures instead of reading them. The causes, in rough order of frequency:</p>
<ul>
<li><b>Shared state between tests.</b> A static not reset in setUp. Symptom: passes alone, fails
in a suite, or depends on order.</li>
<li><b>Real time.</b> Any test using the wall clock or a real delay.</li>
<li><b>Uninitialised memory.</b> Reads whatever was there, which varies. ASan and MSan find
these.</li>
<li><b>Real hardware.</b> Shared, stateful and occasionally in a bad mood.</li>
</ul>
<p>The correct response is to fix or delete, never to retry. A suite with a known-flaky test in it
is a suite nobody trusts, and the next real failure will be dismissed too.</p>

<h3>Testing behaviour, not implementation</h3>
<p>The most common way a suite becomes a burden is asserting on internals. If a test breaks every
time you refactor without changing behaviour, it was testing the implementation.</p>
<p>Mock-heavy tests are particularly prone to this: they bind to an exact call sequence, so
reordering two independent writes fails a test even though nothing observable changed. That is
the argument for preferring a fake where the specification is the behaviour, and reserving mocks
for where the interaction genuinely is the specification.</p>
`,
quiz: [
{ q: "What does coverage actually measure?",
o: ["What was verified", "What was executed", "How many assertions ran", "Test quality"],
a: 1, why: "A test with zero assertions gives full coverage of everything it calls. Read coverage as a negative signal: uncovered lines definitely are not tested, covered lines merely might be." },
{ q: "For if (a && b), what does MC/DC require beyond branch coverage?",
o: ["Nothing", "Cases showing that a alone and b alone each independently change the outcome", "100% statement coverage", "Testing every input value"],
a: 1, why: "Branch coverage only needs the condition to go both ways. MC/DC needs each sub-condition shown to matter independently, which is why it is required for DO-178C Level A avionics." },
{ q: "What does a surviving mutant tell you?",
o: ["The code is wrong", "No test was actually checking that behaviour: a hole in the assertions", "Coverage is low", "The test is slow"],
a: 1, why: "Change > to >= or a return value, and if every test still passes then nothing was asserting on it. It measures assertion quality, which is exactly what coverage cannot." },
{ q: "A test passes alone but fails in the suite. What is the most likely cause?",
o: ["A compiler bug", "Shared state, typically a static not reset in setUp", "Insufficient coverage", "A timing problem"],
a: 1, why: "Order dependence is the signature of shared state. It is the most common cause of flakiness, and the fix is to reset everything in setUp rather than to rerun the suite." }
],
interview: {
q: "Your team has 85 per cent coverage. What does that tell you, and what would you do with it?",
a: "On its own, less than it sounds. Coverage measures what was executed, not what was verified, so a test that calls a function and asserts nothing contributes full coverage of everything it touches. I would read it as a negative signal instead: the uncovered fifteen per cent definitely is not tested, and that list is usually short, specific and worth looking at, because in firmware it tends to be the error paths, which are exactly the paths that run when something is wrong in the field. I would also want to know which kind of coverage it is. Statement coverage is weak, since one test through an if with a compound condition gives full statement coverage of the body while checking almost nothing. Branch coverage is meaningfully stronger, and MC/DC stronger still, which is why avionics requires it. To find out whether the assertions are any good rather than the execution, I would do a little mutation testing by hand on the most safety-relevant function: change a greater-than to a greater-or-equal, flip a return value, and see whether any test fails. A surviving mutant is a hole in the assertions that coverage cannot see. And I would look for tests asserting on internals rather than behaviour, because those break on every refactor and are what turns a suite from an asset into something people want to delete."
}
}

);
