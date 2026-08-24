// Embedded C track for R&D Prep, part 3 of 3.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-testing",
track: "Embedded C",
title: "Testing firmware without hardware",
mins: 30,
body: `
<p>The half of a driver that matters is the half that handles failure, and that half
never runs on your bench. You cannot make a real sensor return a wrong chip ID, refuse
to come out of reset, or NAK on the third write. So if those paths only exist against
real hardware, they ship untested.</p>
<h3>Testability is a design property, not an activity</h3>
<p>Consider a driver that calls the vendor HAL directly. It can only ever execute with
the SDK present, on the target, with the part attached. There is no other way to run it.
Now consider one that reaches the bus through an injected struct: the same logic runs on
your laptop against a fake that returns whatever you like.</p>
<p>The cost is one indirect call. The benefit is that the error paths become reachable
at all. <b>You cannot retrofit this cheaply</b>, which is why it is a decision to make
before writing the driver rather than after.</p>
<h3>Stubs, fakes, spies and mocks</h3>
<p>The vocabulary matters because it names different jobs. Grenning's terms, widely
used:</p>
<ul>
<li><b>Stub</b>: returns canned values. Enough to make the code under test run.</li>
<li><b>Fake</b>: a working but simplified implementation. An array of 256 bytes standing
in for a device's registers is a fake.</li>
<li><b>Spy</b>: records what happened so the test can assert on it afterwards. "Did init
write 0x4B to CTRL1, after the reset rather than before?"</li>
<li><b>Mock</b>: has expectations built in and fails the test itself when they are not
met.</li>
</ul>
<p>A useful transport double is usually a fake plus a spy: an array of registers, a log
of writes, and a flag to force the next operation to fail with a chosen error.</p>
<h3>What becomes testable</h3>
<p>None of this list is reachable on a bench:</p>
<ul>
<li>The chip ID is wrong, so init returns "wrong part" rather than a generic failure.</li>
<li>The bus NAKs on the third write, so init propagates the error and does not continue.</li>
<li>The reset bit never clears, so init times out after the right number of attempts
rather than hanging.</li>
<li>Init wrote the right value to the right register, in the right order, after the reset
and not before.</li>
<li>Unit conversion and sign handling across the full signed range.</li>
</ul>
<p><b>"Did init write 0x4B to CTRL1?" is a three-line test and impossible against real
hardware</b>, because you would have to read the register back and hope the part had not
modified it.</p>
<h3>Getting it building on a host</h3>
<p>Stub whatever platform types the driver still needs. If the driver is properly
layered that is a very short list, often just an error type and a handful of constants.
If you find yourself stubbing the whole I2C API, the layering is wrong and the test is
telling you so.</p>
<pre>test/
  stub/esp_err.h      minimal platform types
  fake_io.c           the transport double
  test_driver.c       the tests and main()</pre>
<p>Start with a <code>main()</code> and a handful of assertions that print and count
failures. Unity, CMock or Ceedling can come later. Reaching for a framework before the
first passing test is how a day disappears into infrastructure.</p>
<h3>Test names are documentation</h3>
<pre>void test_init_returns_wrong_part_when_chip_id_mismatches(void);
void test_init_does_not_configure_after_a_bus_failure(void);
void test_reset_times_out_rather_than_hanging(void);</pre>
<p>A reader who never opens the implementation learns what the driver promises. That is
the second job tests do, and it is why they survive as specification long after they stop
finding bugs.</p>
<h3>See each test fail</h3>
<p>Break the driver deliberately, watch the test catch it, put it back. <b>A test you
have never seen fail is a test you are trusting on faith</b>, and plenty of them turn out
to assert nothing at all.</p>`,
quiz: [
{ q: "Why is testability described as a design property rather than a testing activity?",
o: ["Because tests are written first", "Because a driver that calls the HAL directly can only ever run on the target with the part attached", "Because it needs a framework", "It is not; testing is separate from design"],
a: 1, why: "Whether the error paths can be exercised at all is decided by how the driver reaches its hardware. Retrofitting an indirection into a driver that calls the HAL directly is close to a rewrite." },
{ q: "What is a spy, as distinct from a stub?",
o: ["A test that runs on hardware", "A double that records what happened so the test can assert on it", "A double that returns fixed values", "A mock with expectations"],
a: 1, why: "A stub just returns canned values to keep the code running. A spy keeps a log, which is how you check that init wrote the right registers in the right order." },
{ q: "Which of these can only be tested with a fake, not on real hardware?",
o: ["That a good reading is returned", "That the driver returns a distinct error when the chip ID is wrong", "That the bus speed is 100 kHz", "That the LED lights"],
a: 1, why: "You cannot make a real sensor report a wrong identity. Neither can you make it NAK on demand or refuse to leave reset, which is why those paths ship untested without doubles." },
{ q: "Why should you watch each test fail before trusting it?",
o: ["To measure how long it takes", "Because a test that has never failed may assert nothing at all", "It is required by TDD", "To check the compiler"],
a: 1, why: "Break the code deliberately and confirm the test catches it. Tests with inverted logic, missing assertions or unreachable bodies all pass happily and protect nothing." }
],
interview: {
q: "Your manager asks how you will know a new driver works. What do you tell them?",
a: "That plugging it in and seeing a good reading only tests the happy path, which is the half that will work anyway. What matters is the failure paths, and I cannot produce those on a bench: I cannot make a sensor report the wrong identity, NAK on the third write, or refuse to leave reset. So I would structure the driver to take its bus access and its delay through an injected struct, which means the same logic runs on a laptop against a fake that returns whatever I ask it to. Then the tests cover the wrong-part path, error propagation, the reset timeout, and that init writes the right registers in the right order, which is a spy assertion and is impossible against real hardware. The bench work then proves the board and the adapter, which is a much smaller thing. And I would break each test deliberately once to confirm it fails, because a test nobody has seen fail is not evidence."
}
},

{
id: "emb-hil",
track: "Embedded C",
title: "Hardware in the loop and where tests belong",
mins: 26,
body: `
<p>Off-target tests prove logic. They cannot prove that your timing is right, that the
part behaves as its datasheet claims, or that the board works. That is what
hardware-in-the-loop testing is for, and knowing which question belongs to which tier is
most of the skill.</p>
<h3>Three tiers</h3>
<table class="stats">
<tr><th>Tier</th><th>Answers</th><th>Runs</th><th>Speed</th></tr>
<tr><td>Bench bring-up</td><td>is this board good</td><td>once, by hand</td><td>minutes</td></tr>
<tr><td>Host unit tests</td><td>is the logic right</td><td>every commit</td><td>milliseconds</td></tr>
<tr><td>Hardware in the loop</td><td>does it work against the real part, repeatably</td><td>nightly or per release</td><td>minutes to hours</td></tr>
</table>
<p>The tier people skip is the middle one, and it is the cheapest.</p>
<h3>What a HIL rig actually is</h3>
<p>A PC driving the target and the instruments around it: a programmable power supply, a
signal generator, a multimeter, a scope or logic analyser, and the debug probe. A script
flashes firmware, sets up stimulus, runs a scenario, captures measurements and produces a
report. Every instrument on the bench has a comms port and a command set, so the rig is
mostly software.</p>
<p>What it buys you that a unit test cannot:</p>
<ul>
<li><b>Real timing.</b> Interrupt latency, bus rise times, mode switching delays.</li>
<li><b>Real electrical behaviour.</b> Brownout thresholds, current draw in each mode,
what happens when a supply sags.</li>
<li><b>Fault injection you cannot do in software.</b> Pull a supply mid-write. Yank a
bus line. Feed a sensor an out-of-range signal.</li>
<li><b>Overnight and weekend soak</b>, which finds the once-a-day fault that nobody
reproduces by hand.</li>
<li><b>Evidence.</b> A dated report against numbered requirements, which is what
regulated work needs.</li>
</ul>
<h3>The hard part is not the rig</h3>
<p>Building the rig is engineering. Deciding <b>what to test</b> is judgement, and its
value is bounded by how well the requirements are written. "The LED shall be brighter
when the data is better" cannot be tested. "LED duty cycle shall be proportional to the
sensor's surface quality register, updated at 20 Hz" can.</p>
<p>So the chain is: a requirement with a number in it, a scenario that exercises it, a
measurement that either passes or fails, and traceability from the report back to the
requirement. Where that chain is broken, an expensive rig produces confident nonsense.</p>
<h3>Deciding which tier a test belongs to</h3>
<ul>
<li>Can it be decided by logic alone? <b>Host test.</b> It costs milliseconds and runs on
every commit.</li>
<li>Does it depend on real timing, real electrical behaviour or the part's actual
firmware? <b>HIL.</b></li>
<li>Is it a one-off question about this specific board? <b>Bench.</b> Write down the
answer and move on.</li>
</ul>
<p>Pushing work down a tier is nearly always right. A test that could run on a laptop and
instead needs the rig will be run less often, will block someone else who needs the
hardware, and will stop working when the board goes back to the client.</p>
<h3>Boards are a scarce resource</h3>
<p>Client hardware is often one unit, shared, and temporary. Logic that can only be
exercised with the board attached is a scheduling problem as much as a quality one. Tests
that run on a laptop still run eighteen months later when the client returns with a
variant and the hardware is long gone.</p>`,
quiz: [
{ q: "Which question belongs to a host unit test rather than a HIL rig?",
o: ["Does the driver time out correctly when the reset bit never clears", "What is the interrupt latency under load", "Does the board brown out at 2.9 V", "Is the I2C rise time within spec"],
a: 0, why: "A reset that never completes is pure logic and can be produced instantly by a fake. The other three depend on real timing or real electrical behaviour and need hardware." },
{ q: "What limits the value of a HIL rig?",
o: ["The number of instruments", "The quality of the requirements it is testing against", "The speed of the PC", "The debug probe"],
a: 1, why: "A rig executes scenarios; it does not decide which ones matter. Vague requirements produce tests that pass while the product misbehaves, which is worse than no rig at all." },
{ q: "Why prefer pushing a test down to the host tier where possible?",
o: ["Host tests are more thorough", "It runs on every commit, needs no hardware, and still works when the board goes back", "HIL tests are unreliable", "It is required by ISO 13485"],
a: 1, why: "Speed and availability. A test needing scarce shared hardware runs less often and stops working when the board leaves, taking your regression coverage with it." },
{ q: "Which fault can a HIL rig inject that a software test cannot?",
o: ["A wrong chip ID", "A bus NAK", "Collapsing the supply rail mid-write", "An invalid function argument"],
a: 2, why: "The first two are trivially faked in software. Electrical faults, marginal supplies and real timing violations need instruments driving actual hardware." }
],
interview: {
q: "How would you decide what goes into an automated hardware test rig and what does not?",
a: "I would start from the requirements rather than from the rig, because a scenario that does not trace back to a numbered requirement is hard to justify and hard to interpret when it fails. Then I would push everything down a tier wherever I can: anything decidable by logic alone belongs in host unit tests, because they run in milliseconds on every commit and keep working when the hardware goes back to the client. What is left for the rig is the things that genuinely need real hardware, which is timing, electrical behaviour, the part's own firmware, fault injection like collapsing a supply mid-write, and long soak runs that find the once-a-day fault. And I would make the report traceable to requirement numbers, because on regulated work the evidence is the deliverable, and because it forces us to notice which requirements no test actually covers."
}
},

{
id: "emb-defensive",
track: "Embedded C",
title: "Coding standards, MISRA and static analysis",
mins: 22,
body: `
<p>Coding standards in embedded exist because the same defects recur, because compilers
differ in what they leave undefined, and because in a regulated context you must be able
to show why the code is likely to be correct rather than assert that it is.</p>
<h3>The rules that earn their place</h3>
<p>Whatever standard you follow, a small set does most of the work:</p>
<ul>
<li>Fixed-width types everywhere that touches hardware, a protocol or a struct layout.</li>
<li>No implicit conversions between signed and unsigned, and no narrowing without an
explicit cast.</li>
<li>Every <code>if</code> and loop body braced, even one-liners.</li>
<li>Every <code>switch</code> has a <code>default</code>, and deliberate fallthrough is
annotated.</li>
<li>One return value convention per module, checked at every call site.</li>
<li>Parenthesise every macro parameter and body; prefer inline functions.</li>
<li>No dynamic allocation after initialisation, or none at all.</li>
<li>No recursion, so worst-case stack is analysable.</li>
<li>Every loop has a bound you can state.</li>
</ul>
<h3>MISRA C in one paragraph</h3>
<p>A set of rules for C in safety-related systems, originally automotive and now used
across medical, industrial and aerospace. Rules are <b>mandatory</b>, <b>required</b> or
<b>advisory</b>, and required rules may be deviated from with documented justification.
The point of the deviation process is that departures become visible and argued rather
than accidental. Most of it targets exactly the things this track has covered:
implementation-defined behaviour, implicit conversions, pointer arithmetic and the
preprocessor.</p>
<p>You will not be asked to recite rule numbers. You may well be asked whether you have
worked under a standard and what you think of it, and the honest answer is that the
value is in the discipline and the deviation record, not in the specific list.</p>
<h3>Compiler warnings are the cheapest analysis you have</h3>
<pre>-Wall -Wextra -Werror
-Wconversion            /* implicit narrowing */
-Wshadow                /* a local hiding an outer name */
-Wundef                 /* undefined identifier in #if */
-Wsign-compare
-Wformat=2</pre>
<p>Several bugs in this track are diagnosable: the always-true comparison on a narrow
loop variable, missing parentheses around a bitwise operand, <code>sizeof</code> on a
pointer passed to <code>memset</code>, format string mismatches. Turning warnings into
errors is the single highest-value change most codebases can make, and the cost is one
afternoon of cleanup.</p>
<h3>Static analysis</h3>
<p>Tools like cppcheck, clang-tidy and the commercial analysers reason across functions
in ways a compiler does not: null dereferences, resource leaks on error paths, buffer
overruns with computable indices, unreachable code. Run them in CI so the count only ever
goes down, and treat a suppressed warning as needing a comment saying why.</p>
<h3>Defensive habits</h3>
<ul>
<li>Validate at API boundaries, trust internally. Checking the same pointer in nine
layers is noise.</li>
<li>Give every wait a timeout.</li>
<li>Count anomalies rather than ignoring them, and expose the counters.</li>
<li>Fail loudly at init rather than degrading silently later. A device that reports
absent at startup is a support call; one that returns plausible wrong readings for a
month is a recall.</li>
</ul>`,
quiz: [
{ q: "What is the purpose of MISRA's deviation process?",
o: ["To allow rules to be ignored quietly", "To make departures from the standard visible, justified and recorded", "To speed up certification", "To replace testing"],
a: 1, why: "Required rules can be deviated from with documented justification. The value is that a departure becomes an argued decision on the record rather than an accident nobody notices." },
{ q: "Which single change usually gives the biggest defect reduction for the least effort?",
o: ["Adopting a new language", "Turning on -Wall -Wextra -Werror and fixing the fallout", "Adding more unit tests", "Buying a static analyser"],
a: 1, why: "The compiler already detects several classes of real bug and is ignored by default. Making warnings errors costs an afternoon of cleanup and stops the whole class returning." },
{ q: "Why do embedded standards commonly ban recursion?",
o: ["It is slow", "Worst-case stack usage becomes impossible to analyse", "It is not supported by all compilers", "It prevents inlining"],
a: 1, why: "Static stack analysis needs a bounded call graph. Recursion makes the depth data-dependent, so you can no longer prove the stack will not overflow." },
{ q: "Where should argument validation live?",
o: ["In every function, at every layer", "At API boundaries, trusting internal calls", "Only in debug builds", "Nowhere; use assertions instead"],
a: 1, why: "Checking the same pointer at nine layers is noise that hides the checks that matter. Validate what comes in from outside your module and trust your own internals." }
],
interview: {
q: "Have you worked to a coding standard, and what do you think of them?",
a: "I have worked to project standards rather than to certified MISRA, and I have read enough of MISRA to know what it targets, which is largely implementation-defined behaviour, implicit conversions, pointer arithmetic and the preprocessor. My honest view is that the value is in the discipline and the deviation record rather than in the specific rule list: the process forces a departure to become an argued decision rather than an accident. The parts I would adopt in any codebase regardless are fixed-width types, no implicit signed and unsigned mixing, braces everywhere, one error convention checked at every call site, and no dynamic allocation after init so worst-case memory is provable. And before any of that I would turn on -Wall -Wextra -Werror, because the compiler already finds several of these and is usually being ignored, and that is an afternoon of work rather than a project."
}
},

{
id: "emb-rtos",
track: "Embedded C",
title: "Tasks, queues and priority",
mins: 26,
body: `
<p>An RTOS buys you the ability to write blocking, sequential code for several activities
at once. It also buys you a set of failure modes that do not exist in a superloop, so a
task needs a reason to exist.</p>
<h3>What justifies a task</h3>
<ul>
<li><b>A different rate.</b> Something at 100 Hz alongside something at 1 Hz.</li>
<li><b>Blocking work</b> that must not stall everything else.</li>
<li><b>A different priority</b>, because something is time-critical and the rest is not.</li>
</ul>
<p>If none of those apply, two tasks where one would do is a source of races rather than
a sign of sophistication. <b>Being able to say why each task exists</b> is the thing worth
having, and it is a very likely interview question.</p>
<h3>Queues rather than shared memory</h3>
<p>The cleanest way to move data between contexts is a queue, because it removes the
shared mutable state instead of protecting it. One task owns the sensor and publishes
samples; others consume and never touch the bus. There is no lock to forget and only one
piece of code knows the device exists.</p>
<p>Most RTOSes provide an ISR-safe variant of the send call, typically named with a
FromISR suffix, which must be used from interrupt context and often asks whether a higher
priority task was woken so you can yield on exit.</p>
<h3>Semaphore or mutex</h3>
<p>They look interchangeable and are not.</p>
<ul>
<li>A <b>semaphore</b> is for signalling: something happened, another task should wake.
It has no owner.</li>
<li>A <b>mutex</b> is for protecting a resource. It has an owner, and in FreeRTOS it
carries <b>priority inheritance</b>.</li>
</ul>
<p>Using a binary semaphore for mutual exclusion is common and gives you priority
inversion, because the inheritance is the thing you have just given up.</p>
<h3>Priority inversion</h3>
<p>Low holds a mutex. High blocks on it. Medium, which needs nothing, preempts Low.
Low cannot run, so it cannot release, so High waits behind Medium indefinitely. The
priorities have inverted.</p>
<p>This grounded Mars Pathfinder in 1997: the rover kept resetting, the cause was exactly
this, and the fix was enabling priority inheritance remotely. <b>Priority
inheritance</b> raises the holder to the blocked task's priority until it releases;
<b>priority ceiling</b> runs any holder at the highest priority that can ever take the
mutex.</p>
<h3>Stack sizing</h3>
<p>Each task has its own stack, usually taken from the heap at creation, and overflowing
it corrupts whatever is next in memory with no error. Size it by measurement rather than
by guess: <code>uxTaskGetStackHighWaterMark</code> reports the closest a task has come to
the limit. Run it under worst-case load and leave headroom.</p>
<p>Note the units trap: FreeRTOS's stack parameter is in <b>words</b>, while some ports
including ESP-IDF take <b>bytes</b>. Porting between them silently changes your stack by
a factor of four.</p>
<h3>Failure modes to recognise</h3>
<ul>
<li><b>A task never runs.</b> Creation failed and the return value was not checked, or a
higher priority task never blocks and starves it.</li>
<li><b>Everything is fine until it is not.</b> Stack overflow under an unusual path.</li>
<li><b>Occasional wrong data.</b> Shared state without protection, or a queue used
without the FromISR variant.</li>
<li><b>The watchdog fires.</b> Something blocked forever with no timeout.</li>
</ul>`,
quiz: [
{ q: "What justifies creating a second task?",
o: ["It makes the code tidier", "A different rate, blocking work, or a different priority", "Every driver should have one", "It reduces stack usage"],
a: 1, why: "Tasks cost stack and introduce shared state. Without a rate, blocking or priority reason, one task is simpler and has fewer failure modes." },
{ q: "You use a binary semaphore to protect a shared resource. What do you lose?",
o: ["Nothing", "Priority inheritance, which exposes you to priority inversion", "The ability to signal", "Interrupt safety"],
a: 1, why: "A semaphore signals and has no owner. A mutex has an owner and can raise its priority while held, which is what prevents a medium-priority task starving a high-priority one." },
{ q: "In priority inversion, what actually blocks the high-priority task?",
o: ["The mutex itself", "A medium-priority task preempting the low-priority mutex holder", "The scheduler", "Interrupt latency"],
a: 1, why: "High waits on the mutex, but the holder cannot run because Medium preempted it. The high-priority task is effectively behind a medium one it has no relationship with." },
{ q: "How should you size a task stack?",
o: ["Use the default", "Measure with the high water mark under worst-case load and leave headroom", "Make it as large as possible", "Match the largest local variable"],
a: 1, why: "Guessing wastes RAM or corrupts memory. The high water mark reports the closest the task has come to its limit, and worst case usually includes a rarely taken path." }
],
interview: {
q: "How would you decide the task structure for a device with a fast sensor, a radio link and a user interface?",
a: "I would start by asking what forces them apart, because a task needs a reason. The sensor has a fixed high rate and must not be delayed, so it gets its own task at the highest of the three and publishes samples to a queue. The radio blocks on transmission and its timing is imposed by the host rather than by us, so it consumes from that queue at its own pace and cannot stall the sensor. The user interface is slow and can be lowest priority. That gives three tasks, each with a rate or a blocking reason I can state, and the only shared state is the queue itself, which removes the need for locks. Then I would size the stacks by measuring the high water mark under worst-case load rather than guessing, check every creation return value, and make sure whatever feeds the watchdog does so on evidence of progress rather than on a timer."
}
},

{
id: "emb-faults",
track: "Embedded C",
title: "Faults, watchdogs and postmortem debugging",
mins: 24,
body: `
<p>Firmware fails in the field, at a customer, with nobody watching. What you get is
whatever the device recorded, so designing for the postmortem is part of the job.</p>
<h3>Hard faults</h3>
<p>On Cortex-M a fault handler runs with the failing context stacked below it: the
program counter, link register and status register at the moment of the fault. A useful
handler captures those and reports them rather than sitting in a while loop.</p>
<p>Common causes, and what each looks like:</p>
<ul>
<li><b>Null or wild pointer dereference.</b> The faulting address is near zero or
obviously nonsense.</li>
<li><b>Unaligned access.</b> Faults on M0 for any word access, and on all cores for
LDRD, LDM and STM.</li>
<li><b>Stack overflow.</b> The stack pointer has walked into another region, and the
symptoms usually appear as corruption before the fault.</li>
<li><b>Executing non-code.</b> A corrupted function pointer or a return into freed
memory.</li>
<li><b>Accessing a peripheral whose clock is off.</b> Very common during bring-up and it
faults rather than reading zeros.</li>
</ul>
<p>The fault status registers say which category it was. Decoding them is far faster than
guessing, and a good handler prints the address and the reason before it resets.</p>
<h3>Watchdogs</h3>
<p>A watchdog exists to catch the case where the system has stopped working. <b>Any
change that makes it less likely to fire is making it worse at its only job.</b></p>
<p>So the wrong fixes are increasing the timeout, disabling it, and feeding it inside a
long operation. That last one is the most insidious, because it works: you have taught
the watchdog to say everything is fine while the system is stuck.</p>
<p>The right fix is to bound whatever occasionally takes too long. If a long operation is
genuinely legitimate, it moves off the path that feeds the watchdog, and a supervising
task feeds on <b>evidence of progress</b> rather than on a timer. Never feed from a timer
callback or anywhere that runs regardless of health.</p>
<h3>The reset reason register</h3>
<p>Every modern part records why it last reset: power-on, brownout, watchdog, software,
external pin, fault. Reading it at startup and logging it turns "it rebooted" into a
diagnosis. On a product, storing the last few reasons in non-volatile memory turns a
customer's vague report into evidence.</p>
<h3>Designing for the postmortem</h3>
<ul>
<li>Log the reset reason at every boot.</li>
<li>Keep a small crash record in non-volatile memory: fault type, address, uptime.</li>
<li>Expose counters for the things that fail silently: bus retries, dropped bytes,
overruns, allocation failures.</li>
<li>Record the firmware version and build timestamp in the boot log, so you know what was
actually running.</li>
<li>Keep the ELF matching every release, because a backtrace decodes against symbols and
a mismatched build decodes into lies.</li>
</ul>
<h3>Reproducing an intermittent fault</h3>
<p>Increase the rate rather than waiting: run the bus faster, raise the sample rate,
shorten timeouts, add load. If a fault is a race, making the window matter more often
turns a weekly failure into a per-minute one. And keep the failing conditions written
down, because the second hardest part of an intermittent bug is proving you have fixed
it.</p>`,
quiz: [
{ q: "A task occasionally takes 3 seconds and the 2-second watchdog resets the board. Which fix is right?",
o: ["Increase the watchdog timeout", "Feed the watchdog inside the long operation", "Find and bound whatever makes it take 3 seconds", "Disable the watchdog"],
a: 2, why: "The first, second and fourth all make the watchdog worse at detecting a genuine hang. The task normally takes 50 ms, so something is running sixty times longer and that is the actual fault." },
{ q: "A board resets repeatedly. What is the first thing to read?",
o: ["The stack high water mark", "The reset reason register", "The supply rail on a scope", "The linker map"],
a: 1, why: "The part already recorded why it reset. One register distinguishes watchdog, brownout, fault and software reset, eliminating most of the shortlist before you set up any instrument." },
{ q: "Why is feeding the watchdog from a periodic timer callback a bad idea?",
o: ["It costs CPU time", "It runs regardless of whether the system is healthy, so it reports health that does not exist", "Timers are unreliable", "It cannot be done from an ISR"],
a: 1, why: "A watchdog should be fed by evidence that the system is doing its job. A timer keeps firing while every task is deadlocked, which is exactly the situation you built it to catch." },
{ q: "Why must the ELF file match the firmware actually running on the device?",
o: ["The device checks it", "Backtraces are decoded against its symbols, so a mismatch decodes to plausible nonsense", "It contains the reset vector", "It is needed to flash"],
a: 1, why: "Address to function mapping comes from the ELF. Decode a crash against a different build and you get confident, wrong answers that send you looking in the wrong file." }
],
interview: {
q: "A customer reports that a device occasionally reboots and cannot reproduce it on demand. How do you proceed?",
a: "First I would find out what the device already knows. The reset reason register distinguishes watchdog, brownout and fault, and if the firmware is not already logging it at boot then that is the first change, along with storing the last few reasons in non-volatile memory so the next occurrence produces evidence rather than a phone call. If it turns out to be a fault I would want the fault status registers and the stacked program counter recorded too, because that usually names the file. In parallel I would try to make it more frequent rather than waiting for it: raise the bus speed, increase sample rates, shorten timeouts and add load, since a race that fires weekly will fire far more often once its window matters more. And I would write down the conditions carefully, because with an intermittent fault proving you have fixed it is harder than finding it."
}
},

{
id: "emb-power",
track: "Embedded C",
title: "Clocks, power modes and what they break",
mins: 22,
body: `
<p>Power management is where correctness and energy meet, and it breaks firmware in ways
that look like unrelated bugs.</p>
<h3>The clock tree</h3>
<p>An MCU has several oscillators and a network of dividers feeding the core and each
peripheral. Three facts follow:</p>
<ul>
<li>A peripheral's baud rate or sample rate is derived from its clock, so changing a
divider upstream changes it.</li>
<li>The internal RC oscillator is typically only accurate to one or two per cent, and
worse over temperature. UART above about 38400 usually needs a crystal.</li>
<li>If the PLL fails to lock, the part quietly runs from the fallback source and every
timing calculation in the firmware is wrong. That is a classic bring-up fault.</li>
</ul>
<h3>What halving the CPU clock breaks</h3>
<ul>
<li><b>Peripheral rates</b>, if they derive from the clock you changed. A 115200 UART
becomes 57600 and the wire is garbage.</li>
<li><b>Timer periods.</b> A prescaler chosen for the old frequency now ticks at half
speed, so every timeout in the firmware doubles.</li>
<li><b>Busy-wait delay loops</b>, which were calibrated by hand.</li>
<li><b>Bit-banged protocols</b>, which are timed in CPU cycles and simply stop working.</li>
<li><b>Your compute budget.</b> Every ISR now takes twice as long, and a control loop
that just fitted in its period no longer does.</li>
</ul>
<p>That last one is the one people forget. Nothing in the code changed and the real-time
guarantees are gone.</p>
<h3>Sleep modes</h3>
<p>Names differ by vendor but the ladder is consistent: the deeper you go, the less is
retained and the longer it takes to wake.</p>
<ul>
<li><b>Idle</b>: core stopped, peripherals running. Wake from anything, instantly.</li>
<li><b>Sleep or stop</b>: most clocks off, RAM retained. Wake from a few sources,
microseconds to milliseconds.</li>
<li><b>Deep sleep</b>: most of the chip off, only a small retention region survives. Wake
resembles a reset, and execution restarts rather than resuming.</li>
</ul>
<p>Two consequences worth knowing. <b>The wake source must be configured before you
sleep</b>, or the part never comes back. And in deep sleep your variables are gone, so
anything that must survive goes in the retention area or non-volatile storage, and your
startup code has to distinguish a cold boot from a wake.</p>
<h3>Where the energy actually goes</h3>
<p>On a battery device the average is usually dominated by how long the part stays awake
rather than by what it does while awake. So the wins are: sleep between events rather
than polling, use interrupts and DMA so the core is not spinning, batch radio activity,
and shorten wake time rather than optimising the code that runs during it.</p>
<p>Measure rather than reason about it. A current probe or a supply with logging shows
you the duty cycle, and it is usually not where people expect.</p>
<h3>Making it safe</h3>
<p>Code that cannot tolerate a frequency change should say so. Frameworks that support
dynamic frequency scaling provide a lock or a vote that pins the clock while a critical
section runs. The alternative is a driver that works until somebody enables power saving
six months later.</p>`,
quiz: [
{ q: "You halve the CPU clock to save power. Which effect do people most often forget?",
o: ["UART baud rate changes", "Timer periods double", "Every ISR now takes twice as long, so real-time deadlines may be missed", "Delay loops take longer"],
a: 2, why: "The first three are usually anticipated. Halving the clock halves the compute budget, so a handler that just fitted in its window no longer does, with nothing in the code having changed." },
{ q: "Firmware works at 9600 baud but not at 115200 on the same board. Most likely cause?",
o: ["A broken cable", "The clock is not what the baud divider assumed, and the tolerance budget is tighter at high rates", "The UART peripheral is faulty", "Wrong parity"],
a: 1, why: "At low baud the divider is large so rounding costs little. At high baud it is small, and an inaccurate RC oscillator or an unlocked PLL consumes the whole two to three per cent budget." },
{ q: "What must be configured before entering deep sleep?",
o: ["The stack pointer", "The wake source", "The heap size", "The watchdog"],
a: 1, why: "In deep sleep most of the chip is off and only specific sources can wake it. If none is armed, the part never comes back and only a power cycle or reset recovers it." },
{ q: "On a battery device, what usually dominates average current?",
o: ["Code efficiency while awake", "How long the part stays awake at all", "Flash access", "RAM size"],
a: 1, why: "Active current is typically orders of magnitude above sleep current, so the duty cycle dominates. Shortening wake time beats optimising the code that runs during it." }
],
interview: {
q: "You are asked to halve the power consumption of an existing battery product. Where do you start?",
a: "By measuring rather than reasoning, because the answer is usually not where people expect. A current probe or a logging supply gives you the duty cycle, and on almost every battery device the average is dominated by how long the part is awake rather than by what it does while awake. So the first questions are what wakes it, how often, and how long it stays up. Common wins are replacing polling with interrupts or DMA so the core is not spinning, batching radio activity because the transmit peak dwarfs everything else, and shortening the wake path rather than optimising the code inside it. Only then would I look at clock scaling, and carefully, because halving the clock changes peripheral rates, doubles timer periods and halves the compute budget, so anything with a real-time deadline needs a lock that pins the frequency while it runs."
}
},

{
id: "emb-build",
track: "Embedded C",
title: "Toolchain, linker scripts and the map file",
mins: 24,
body: `
<p>Firmware is the only common software where you must know where things ended up. The
tools that tell you are the linker script and the map file, and most engineers never open
either until something breaks.</p>
<h3>What the toolchain does</h3>
<ol>
<li><b>Preprocessor</b>: text substitution, includes, conditionals.</li>
<li><b>Compiler</b>: one translation unit to one object file, sorting everything into
sections.</li>
<li><b>Assembler</b>: to machine code.</li>
<li><b>Linker</b>: combines objects, resolves symbols, and <b>places each section at an
address</b> according to the linker script.</li>
<li><b>objcopy</b>: strips the ELF down to a raw binary or hex image for flashing.</li>
</ol>
<p>The ELF keeps symbols and debug information; the binary is what goes on the chip.
Backtraces decode against the ELF, which is why you keep the one matching every release.</p>
<h3>The linker script</h3>
<p>Two parts. <b>MEMORY</b> declares the regions that physically exist, with an origin,
a length and permissions. <b>SECTIONS</b> says which output sections go where, and this is
where .data gets its two addresses: a load address in flash and a run address in RAM,
which is exactly why startup has to copy it.</p>
<p>Reasons you will edit one: adding a bootloader and moving the application, reserving a
region for calibration data that survives reflashing, placing a timing-critical function
in RAM, or laying out OTA partitions.</p>
<h3>The map file</h3>
<p>Generated on request and usually ignored. It tells you:</p>
<ul>
<li>How much flash and RAM each section actually consumed.</li>
<li><b>Which object file contributed what</b>, so you can find the library that quietly
pulled in 40 kB.</li>
<li>The address of every symbol, which is how you identify what a faulting address
belongs to.</li>
<li>Which archive members were pulled in and why.</li>
</ul>
<p>When a build suddenly grows, or when the heap has mysteriously shrunk, the map file
holds the answer and nothing else does.</p>
<h3>Why builds must be reproducible</h3>
<p>On a product you may have to rebuild a release years later to reproduce a customer's
fault. That means pinning the toolchain version, not just the source, and recording the
compiler, flags and library versions alongside the tag. A build that only works on one
engineer's laptop is a liability, and it is the argument for containerised or scripted
builds and for CI compiling every commit on a clean machine.</p>
<h3>Optimisation levels</h3>
<ul>
<li><b>-O0</b>: no optimisation. Debugging is pleasant, code is large and slow, and
missing volatile or undefined behaviour stays hidden.</li>
<li><b>-Og</b>: optimised but debuggable, and a sensible default for development.</li>
<li><b>-O2</b>: the usual release setting.</li>
<li><b>-Os</b>: optimise for size, which on a flash-constrained part often matters more
than speed.</li>
</ul>
<p><b>Test at the level you ship.</b> A bug that only appears at -O2 is the normal case
for volatile and aliasing faults, and a project that develops at -O0 and ships at -O2
finds them at the worst possible moment.</p>`,
quiz: [
{ q: "Why does .data have two addresses in the linker script?",
o: ["For redundancy", "A load address in flash where the initial values live, and a run address in RAM where it is used", "One for debug and one for release", "To support bank switching"],
a: 1, why: "The values must survive power-off so they live in flash, and they must be writable so they run from RAM. Startup copies from the load address to the run address before main." },
{ q: "Your firmware suddenly grows by 40 kB after adding one library call. What tells you why?",
o: ["The ELF file size", "The map file, which shows what each object contributed", "The disassembly", "The linker script"],
a: 1, why: "The map file attributes space to object files and archive members, which is how you find the printf or floating point support that got pulled in behind one innocuous call." },
{ q: "Why keep the ELF file for every firmware release?",
o: ["It is needed to flash the device", "Backtraces and fault addresses decode against its symbols", "It contains the linker script", "For licence compliance"],
a: 1, why: "The binary on the chip has no symbols. Address to function mapping lives in the ELF, and decoding against a different build produces confident nonsense." },
{ q: "Why is developing at -O0 and shipping at -O2 risky?",
o: ["-O2 is unstable", "Missing volatile and undefined behaviour are hidden at -O0 and appear at -O2, so you find them last", "Debug symbols differ", "It changes the memory map"],
a: 1, why: "The optimiser is what exploits UB and elides non-volatile accesses. Testing at the level you ship means those faults surface during development rather than at release." }
],
interview: {
q: "A release build works and a debug build does not, or vice versa. How do you think about that?",
a: "Either direction tells me something specific. Working at -O0 and failing at -O2 is nearly always a missing volatile or undefined behaviour, because those are exactly the cases where the optimiser is entitled to assume something the code violates, so I would look at hardware registers, ISR-shared variables, delay loops, aliasing and signed overflow. The other direction, failing only in the debug build, usually means timing: the code is slower, so a race that was previously hidden now has a window, or a delay that was accidentally long enough no longer is. Either way I would want the same build settings in test as in production, because a project that develops at -O0 and ships at -O2 discovers this class of fault at release. And I would keep the ELF for whichever build is misbehaving, so a fault address decodes to a real function rather than to whatever the other build had at that address."
}
}

);
