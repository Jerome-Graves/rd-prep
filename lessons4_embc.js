// Embedded C track, batch 4: everyday firmware skills missing from the core set.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-fsm",
track: "Embedded C",
title: "State machines in firmware",
mins: 26,
body: `
<p>Most firmware is a state machine whether or not anyone admitted it. A device is
initialising, or idle, or measuring, or faulted, and what an input means depends entirely
on which of those it is. When that structure is implicit you get a spread of boolean
flags whose valid combinations nobody can enumerate.</p>
<h3>The smell you are replacing</h3>
<pre>if (is_ready &amp;&amp; !is_busy &amp;&amp; have_data &amp;&amp; !error_latched) { ... }</pre>
<p>Four booleans is sixteen combinations, of which perhaps five are legal, and nothing
says which. Every new flag doubles it. A state variable with five named values has five
combinations by construction.</p>
<h3>The switch form</h3>
<pre>typedef enum { ST_INIT, ST_IDLE, ST_MEASURING, ST_FAULT } state_t;

static state_t state = ST_INIT;

void tick(event_t ev)
{
    switch (state) {
    case ST_IDLE:
        if (ev == EV_START) { start_measurement(); state = ST_MEASURING; }
        break;
    case ST_MEASURING:
        if (ev == EV_DONE)  { publish(); state = ST_IDLE; }
        if (ev == EV_ERROR) { state = ST_FAULT; }
        break;
    ...
    default:
        state = ST_FAULT;      /* an impossible value is itself a fault */
        break;
    }
}</pre>
<p>Readable up to about six states. Beyond that the switch grows arms and the
transitions become hard to see as a whole.</p>
<h3>The table form</h3>
<p>For anything larger, put the transitions in data:</p>
<pre>typedef struct {
    state_t  from;
    event_t  ev;
    void   (*action)(void);
    state_t  to;
} transition_t;

static const transition_t table[] = {
    { ST_IDLE,      EV_START, start_measurement, ST_MEASURING },
    { ST_MEASURING, EV_DONE,  publish,           ST_IDLE      },
    { ST_MEASURING, EV_ERROR, log_fault,         ST_FAULT     },
};</pre>
<p>The whole machine is now one readable object, it lives in flash as
<code>const</code>, and you can walk it in a test to prove every state is reachable and
no state is a dead end. That is a property you cannot check by reading a switch.</p>
<h3>Rules that keep them honest</h3>
<ul>
<li><b>One place changes the state variable.</b> If transitions are scattered you have
lost the benefit.</li>
<li><b>Handle every state in the switch and add a default</b> that treats an impossible
value as a fault. Corrupted memory should be loud.</li>
<li><b>Decide what an unexpected event means</b> in each state: ignore, error, or
transition. Silence is a decision you did not make.</li>
<li><b>Keep actions short and non-blocking.</b> A state machine that blocks stops being
one.</li>
<li><b>Entry and exit actions</b>, if you need them, belong in the machine rather than
scattered at every call site that causes the transition.</li>
</ul>
<h3>Why they test well</h3>
<p>A state machine driven by an event function is trivially testable off-target: feed it
a sequence of events, assert the state and the actions. No hardware, no timing. That is
the same argument as the injected transport, and it is why pushing logic into an explicit
machine tends to improve testability as a side effect.</p>
<h3>Hierarchical machines</h3>
<p>When several states share behaviour, a flat machine duplicates it. Hierarchical state
machines let a parent state hold the common transitions, so "any state responds to
EV_RESET" is written once. Worth knowing the term; usually overkill below about a dozen
states.</p>`,
quiz: [
{ q: "Why is a state variable preferable to four boolean flags?",
o: ["It uses less RAM", "Four booleans allow sixteen combinations of which most are illegal and none are named", "Booleans are slower", "Enums are type-safe in C"],
a: 1, why: "The enum makes only the legal states representable and gives each one a name. Every extra flag doubles the combinations nobody has enumerated." },
{ q: "Why put transitions in a const table rather than a switch, for a large machine?",
o: ["It is faster", "The whole machine becomes one readable object that a test can walk to prove reachability", "It uses less flash", "Switches cannot handle many cases"],
a: 1, why: "You can check properties of the machine itself, such as every state being reachable and no state being a dead end, which is impossible by reading a scattered switch." },
{ q: "What should the default case of a state switch do?",
o: ["Nothing", "Treat the impossible value as a fault", "Return to the previous state", "Retry the event"],
a: 1, why: "Reaching an unlisted state means the variable was corrupted or a new state was added without handling. Both should be loud rather than silently ignored." },
{ q: "Why do explicit state machines test well off-target?",
o: ["They use no hardware", "You feed a sequence of events and assert on state and actions, with no timing or peripherals involved", "They are small", "They avoid interrupts"],
a: 1, why: "The same argument as an injected transport: pushing logic behind a plain function boundary makes it exercisable on a host." }
],
interview: {
q: "You inherit firmware controlled by a dozen boolean flags. How would you approach restructuring it?",
a: "First I would work out what the states actually are by reading the flag combinations the code tests for, because the machine is already there, just implicit. Then I would write the states and transitions down as a table before touching code, since that usually reveals combinations nobody handles and transitions that happen from two places. I would introduce the enum alongside the flags rather than instead of them at first, so I can assert they agree at run time and catch anywhere I missed. Then remove the flags one at a time. The reason it is worth doing is not tidiness: a flag soup has an exponential number of states nobody has enumerated, so you cannot say what the firmware does, and an explicit machine can be walked by a test to prove every state is reachable and none is a dead end."
}
},

{
id: "emb-fixedpoint",
track: "Embedded C",
title: "Fixed-point arithmetic",
mins: 26,
body: `
<p>Plenty of microcontrollers have no floating point unit, and on those that do, floats
still cost you determinism, code size and sometimes interrupt latency. Fixed point is
integer arithmetic with an agreed, implicit binary point, and it is how most control and
signal code on small parts is actually written.</p>
<h3>Q notation</h3>
<p>Q<i>m</i>.<i>n</i> means <i>m</i> integer bits and <i>n</i> fractional bits. A
Q16.16 value in an int32_t has a scale factor of 2^16:</p>
<pre>#define Q 16
#define TO_FIXED(x)    ((int32_t)((x) * (1 &lt;&lt; Q)))
#define TO_FLOAT(x)    ((float)(x) / (1 &lt;&lt; Q))

int32_t half = TO_FIXED(0.5);      /* 32768 */</pre>
<p>Choosing the split is the design decision: more fractional bits means finer
resolution and a smaller maximum value. Q16.16 in 32 bits gives you a range of roughly
plus or minus 32768 with a resolution of about 0.000015.</p>
<h3>The four operations</h3>
<pre>a + b            /* just add: scales already match */
a - b            /* just subtract */

(int32_t)(((int64_t)a * b) &gt;&gt; Q)     /* multiply: rescale down */
(int32_t)(((int64_t)a &lt;&lt; Q) / b)     /* divide: rescale up */</pre>
<p><b>Multiply and divide are where it goes wrong.</b> Multiplying two Q16.16 values
gives a Q32.32 intermediate, which overflows 32 bits, so you must widen to 64 first and
shift back afterwards. Doing the shift before the multiply throws away the precision you
were trying to keep.</p>
<h3>Rounding</h3>
<p>A plain right shift truncates towards negative infinity, which biases every result
downward and accumulates in a filter or an integrator. To round to nearest, add half a
least significant bit before shifting:</p>
<pre>(int32_t)((((int64_t)a * b) + (1 &lt;&lt; (Q - 1))) &gt;&gt; Q)</pre>
<p>Note also that <b>right-shifting a negative signed value is
implementation-defined</b> in older standards, though every compiler you will meet does
an arithmetic shift. If it matters, divide or cast explicitly.</p>
<h3>Saturation</h3>
<p>Wrapping is usually the wrong failure mode for a physical quantity: a motor command
that wraps from full forward to full reverse is dangerous. Clamp instead:</p>
<pre>if (v &gt; MAX) v = MAX;
else if (v &lt; MIN) v = MIN;</pre>
<p>Some cores have saturating instructions and DSP intrinsics that do this for free.</p>
<h3>When to use it</h3>
<ul>
<li><b>No FPU.</b> Software floating point is typically tens of cycles per operation and
pulls in a sizeable library.</li>
<li><b>Inside an ISR</b>, where using the FPU may mean saving and restoring its context.</li>
<li><b>Deterministic timing</b>, since integer operations are single-cycle and
predictable.</li>
<li><b>Sensor data</b>, which arrives as integers anyway, so converting to float and back
adds error rather than removing it.</li>
</ul>
<p>Where there is a hardware FPU and no hard timing constraint, floats are usually
simpler and less error-prone. The mistake is reaching for fixed point out of habit.</p>
<h3>Practical rules</h3>
<ul>
<li>Put the Q format in the type name or the variable name. <code>angle_q16</code> tells
a reader what the number means; <code>angle</code> does not.</li>
<li>Do all scaling in named macros or inline functions, never inline in expressions.</li>
<li>Multiply before you divide, to keep precision, but widen first to avoid overflow.</li>
<li>Write a host test comparing against double-precision floating point over the full
input range. That is the only way to find the case where your intermediate overflows.</li>
</ul>`,
quiz: [
{ q: "You multiply two Q16.16 values in int32_t. What goes wrong?",
o: ["Nothing", "The intermediate is Q32.32 and overflows 32 bits, so you must widen to 64 first", "The result is Q16.16 already", "The sign is lost"],
a: 1, why: "Multiplying two values with 16 fractional bits gives 32 fractional bits. Widen to int64_t, multiply, then shift right by Q to get back to the original format." },
{ q: "Why add (1 << (Q-1)) before the final right shift?",
o: ["To avoid overflow", "To round to nearest rather than truncating, which otherwise biases results downward", "To preserve the sign", "It is required by C"],
a: 1, why: "A plain shift truncates. In a filter or an integrator that bias accumulates over time into a visible offset." },
{ q: "Why is saturation usually preferred over wrapping for a physical quantity?",
o: ["It is faster", "Wrapping turns full forward into full reverse, which can be dangerous", "It uses less code", "Wrapping is undefined behaviour"],
a: 1, why: "Clamping degrades gracefully at the limit; wrapping produces a wildly wrong value with the opposite sign, which for a motor or actuator command is a safety issue." },
{ q: "When is fixed point the wrong choice?",
o: ["On any part with an FPU and no hard timing constraint", "Whenever precision matters", "In control loops", "When reading sensors"],
a: 0, why: "Floats are simpler and less error-prone where the hardware supports them and timing is not critical. Reaching for fixed point by habit adds risk for no benefit." }
],
interview: {
q: "A control loop written in floating point needs to move to a part with no FPU. How do you approach it?",
a: "First I would measure rather than assume, because software floating point may still be fast enough at the loop rate and the conversion carries real risk. If it is not, I would pick a Q format from the actual signal ranges rather than a default, since the split between integer and fractional bits is the whole design decision, and I would name every variable with its format so a reader can see the scaling. Multiplies get widened to 64 bits before the shift, with rounding added rather than truncating, because a filter accumulates that bias. Anything representing a physical output saturates rather than wraps. And crucially I would keep the original floating point implementation and write a host test that runs both over the full input range and compares, because that is the only reliable way to find the input where an intermediate overflows, and it converts the whole change from a leap of faith into a measurement."
}
},

{
id: "emb-bootloader",
track: "Embedded C",
title: "Bootloaders and firmware update",
mins: 28,
body: `
<p>Any product that ships needs a way to change its firmware after it leaves. The rules
are unforgiving: an update that fails halfway must not produce a brick, because a brick
is a return, a truck roll or a recall.</p>
<h3>The shape</h3>
<p>Flash is divided into a bootloader and one or more application slots, described by a
partition table. On reset the bootloader runs first, decides which image to start,
validates it, and jumps to it.</p>
<pre>0x00000   bootloader        never updated in the field, or updated very carefully
0x08000   partition table
0x10000   app slot A
0x90000   app slot B
0xF0000   storage / config</pre>
<h3>Jumping to the application</h3>
<p>Not a function call. The bootloader must set the vector table offset to the
application's table, load the application's stack pointer from the first word, and branch
to the reset vector in the second. Get the vector table offset wrong and every interrupt
in the application dispatches into the bootloader's handlers.</p>
<p>It should also undo what it configured: deinitialise peripherals, disable interrupts,
and leave the clocks in a documented state, because the application will initialise from
whatever it inherits.</p>
<h3>A/B update, and why</h3>
<p>Write the new image into the inactive slot while running from the active one. When it
is complete and verified, mark it and reboot. If anything fails at any point, the old
image is untouched and the device still boots.</p>
<p>The alternative, erasing the running application and writing over it, has a window
during which a power cut is fatal. A/B costs you double the flash and removes that
window entirely.</p>
<h3>Verify before you commit</h3>
<ol>
<li><b>Integrity.</b> A CRC or hash over the whole image, checked after writing and again
before every boot. Flash bits do rot.</li>
<li><b>Authenticity.</b> A signature, if the device must reject firmware you did not
produce. A CRC proves nothing about origin.</li>
<li><b>Compatibility.</b> A version and a hardware-revision field, so an image for
another product refuses to run rather than half working.</li>
</ol>
<h3>Rollback</h3>
<p>An image that passes its checks can still be broken: it might boot and then fail to
connect, or crash after a minute. So a robust scheme marks a new image <b>pending</b>,
boots it, and requires the application to confirm itself once it has proved it works. If
no confirmation arrives before a watchdog or a boot counter expires, the bootloader
reverts to the previous slot.</p>
<p>That mechanism is what turns "the update was corrupted" into a recoverable event and
"the update was bad" into a self-healing one.</p>
<h3>Anti-rollback</h3>
<p>For security, reverting to an older signed image is an attack: it reinstates fixed
vulnerabilities. A monotonic version counter in one-time-programmable fuses prevents it.
That directly conflicts with the rollback protection above, so the two policies have to
be reconciled deliberately rather than by accident.</p>
<h3>Practical hazards</h3>
<ul>
<li><b>Never update the bootloader in the field</b> if you can avoid it. If you must,
that update needs its own atomic mechanism, and it is the one operation with no safety
net.</li>
<li><b>Power loss during erase</b> leaves a partially erased sector that reads as neither
old nor new. Design assuming it happens.</li>
<li><b>The image is written while the application runs</b>, so writing flash may stall
execution, and the code doing the writing must not be in the sector being erased.</li>
<li><b>Keep the partition table and the linker script in agreement.</b> They are two
descriptions of the same layout and drift silently.</li>
</ul>`,
quiz: [
{ q: "What is the main argument for an A/B slot scheme?",
o: ["It is faster to write", "There is no window in which a power failure leaves the device unbootable", "It uses less flash", "It avoids needing a CRC"],
a: 1, why: "The old image is untouched until the new one is complete and verified. Erasing in place has an interval where a power cut is fatal." },
{ q: "Why must the bootloader set the vector table offset before jumping to the application?",
o: ["To enable interrupts", "Otherwise every interrupt dispatches into the bootloader's handlers", "To relocate the stack", "It is optional"],
a: 1, why: "The vector table base determines where the core looks for every exception handler. Leaving it pointing at the bootloader's table produces bewildering faults later." },
{ q: "A CRC over the image proves what?",
o: ["That the firmware is authentic", "That the image is intact, but nothing about its origin", "That the version is compatible", "That the device will boot"],
a: 1, why: "An attacker can recompute a CRC. Rejecting firmware you did not produce needs a signature, which is a different mechanism." },
{ q: "Why mark a new image pending and require the application to confirm itself?",
o: ["To save flash", "So an image that is intact but broken can be rolled back automatically", "To speed up boot", "For version tracking"],
a: 1, why: "Integrity checks catch corruption, not a bug. Requiring the application to prove it works before the image is made permanent turns a bad update into a self-healing event." }
],
interview: {
q: "Design a field update scheme for a battery-powered device that may lose power at any moment.",
a: "A/B slots, because with a single slot there is a window during which a power cut leaves the device unbootable, and on battery that window will eventually be hit. The bootloader stays out of the update path entirely if I can manage it, since it is the one component with no safety net. Each image carries a hash for integrity and a signature if we care about origin, plus a version and hardware revision so an image for another product refuses rather than half runs, and the bootloader re-verifies on every boot rather than only after writing, because flash degrades. Then a pending-and-confirm mechanism: the new image boots, has to prove it works, and if it does not confirm before a boot counter expires the bootloader reverts. That distinguishes a corrupted update from a bad one and makes both recoverable. And I would reconcile that against anti-rollback deliberately, because preventing downgrade for security and permitting revert for reliability pull in opposite directions."
}
},

{
id: "emb-flash",
track: "Embedded C",
title: "Flash memory, wear and storing settings",
mins: 24,
body: `
<p>Flash is not RAM with a longer memory. Its physics dictate an access pattern, and code
written without knowing that either fails slowly or corrupts on power loss.</p>
<h3>The three rules</h3>
<ul>
<li><b>You can only change a 1 to a 0 by writing.</b> Going the other way needs an
erase.</li>
<li><b>Erase works on whole sectors</b>, typically 4 kB. There is no single-byte
erase.</li>
<li><b>Endurance is finite</b>, commonly 10,000 to 100,000 erase cycles per sector, and
it is per sector rather than per device.</li>
</ul>
<p>The first rule has a useful consequence: you can rewrite a field from 0xFF to any
value without erasing, and you can clear bits in an already-written value. Log-structured
storage exploits exactly that.</p>
<h3>Why naive settings storage kills devices</h3>
<pre>void save_settings(settings_t *s) {
    flash_erase(SETTINGS_SECTOR);
    flash_write(SETTINGS_SECTOR, s, sizeof(*s));
}</pre>
<p>Two failures. Call it once a minute and at 100,000 cycles the sector is dead in about
ten weeks. And a power loss between the erase and the write leaves no settings at all,
not even the old ones.</p>
<h3>Log-structured storage</h3>
<p>Instead of overwriting, append. Each record carries a sequence number or a validity
marker, and the current value is the last valid record in the sector. When the sector
fills, compact into another sector and erase the old one.</p>
<pre>[rec 1][rec 2][rec 3][ ... erased 0xFF ... ]
                 ^ current</pre>
<p>Erases now happen once per sector-full rather than once per save, which multiplies
endurance by the number of records that fit. And because the old record survives until
compaction, a power loss during a write costs you the newest value rather than all of
them.</p>
<h3>Power-fail safety</h3>
<p>Assume power can be lost at any instant, including mid-write and mid-erase. The
patterns that survive it:</p>
<ul>
<li><b>Write the data, then the validity marker.</b> A record whose marker is missing is
ignored, so a half-written record is invisible rather than corrupt.</li>
<li><b>Never have a moment with no valid copy.</b> That is the flaw in erase-then-write.</li>
<li><b>Verify by reading back.</b> A write can fail silently on a worn sector.</li>
<li><b>Expect partially erased sectors</b>, which read as neither the old data nor
0xFF.</li>
</ul>
<h3>Execution while writing</h3>
<p>On many parts the flash controller stalls instruction fetch during an erase or
program, which can take tens of milliseconds. So an interrupt handler that lives in
flash cannot run during that time, and your latency guarantees evaporate. If an ISR must
be responsive, place it in RAM. This is a real reason to edit a linker script.</p>
<h3>Wear levelling and filesystems</h3>
<p>Spreading writes across sectors so no single one wears out is wear levelling. Doing it
properly, with power-fail safety and directories, is a filesystem: LittleFS and SPIFFS
are the common embedded choices, and NVS-style key-value stores are the lighter option.
Use one rather than writing your own unless the requirement is genuinely trivial, because
the failure modes are subtle and only appear after months in the field.</p>`,
quiz: [
{ q: "Why can you not simply overwrite a byte in flash?",
o: ["It is read-only", "Writing can only change 1 bits to 0; going back requires erasing a whole sector", "The address is not writable", "It needs a special instruction"],
a: 1, why: "This asymmetry is why erase granularity is a sector and why log-structured schemes work: appending a new record never needs an erase." },
{ q: "A settings save erases then writes a sector every minute. What are the two failures?",
o: ["It is slow and uses RAM", "The sector wears out in weeks, and a power loss between erase and write loses everything", "It corrupts RAM and is slow", "It cannot be interrupted"],
a: 1, why: "At 100,000 cycles a per-minute erase kills the sector in about ten weeks, and there is an interval where neither the old nor the new settings exist." },
{ q: "How does a log-structured store improve endurance?",
o: ["It compresses the data", "It appends records and erases only when the sector fills, multiplying life by records per sector", "It writes to RAM instead", "It uses a smaller sector"],
a: 1, why: "Erases become rare rather than per-save, and the previous record survives until compaction so there is never a moment with no valid copy." },
{ q: "Why might a time-critical ISR need to be placed in RAM?",
o: ["RAM is faster", "Flash erase or program can stall instruction fetch for tens of milliseconds", "Interrupts cannot run from flash", "To reduce power"],
a: 1, why: "If the handler lives in flash it simply cannot execute while the controller is busy, so any latency guarantee is void during an update or a settings write." }
],
interview: {
q: "A product in the field is losing its calibration settings. How do you investigate?",
a: "First I would find out how the settings are written, because erase-then-write in place is the usual cause and it fails in two distinct ways. If the sector is being erased on every save I would work out the write frequency against the endurance figure, since a per-minute save exhausts a sector in weeks and the symptom is exactly this. Then I would look for the power-fail window: if there is any moment between the erase and a complete write, a power cut leaves nothing valid, and on a device that can be unplugged that will happen. The fix is a log-structured store that appends records with a validity marker written after the data, so a half-written record is ignored rather than corrupt and the previous value survives until compaction. I would also read back and verify after writing, because a worn sector fails silently, and I would use an existing store like LittleFS or an NVS rather than writing one, since these failure modes only surface after months."
}
},

{
id: "emb-debugarch",
track: "Embedded C",
title: "Debug architecture, SWD and tracing",
mins: 26,
body: `
<p>Printf debugging changes the timing of the thing you are measuring, which on real-time
firmware often makes the fault disappear. The hardware provides better options and most
engineers never use them.</p>
<h3>SWD and JTAG</h3>
<p>JTAG is the older, wider interface. <b>SWD</b> is ARM's two-wire replacement: a clock
and a bidirectional data line, which matters when pins are scarce. Both give you halt,
step, breakpoints, watchpoints and memory access while the core is running.</p>
<p>Two facilities worth knowing:</p>
<ul>
<li><b>Hardware breakpoints</b> are implemented by a comparator unit and there are only a
few, typically six. Software breakpoints replace an instruction and therefore only work
in RAM, not flash.</li>
<li><b>Watchpoints</b> halt on a data access rather than an instruction. For finding what
corrupts a variable, a watchpoint answers in seconds what printf never will.</li>
</ul>
<h3>Non-intrusive observation</h3>
<p><b>ITM</b> is a trace peripheral that lets firmware write a byte to a stimulus port in
a few cycles, with the probe collecting it over a single SWO pin. That is a printf
substitute that costs almost no time, so it does not move the fault.</p>
<p><b>DWT</b> provides a free-running cycle counter, which is the cheapest accurate way
to time a function. <b>ETM</b>, where fitted, records the actual instruction stream, so
you can reconstruct what executed before a crash rather than inferring it.</p>
<p>And a poor engineer's version that works everywhere: toggle a spare GPIO at the start
and end of a region and watch it on a scope. Sub-microsecond resolution, no tooling, and
it measures interrupt latency and jitter directly.</p>
<h3>Debugging what you cannot halt</h3>
<p>Halting a motor controller or a radio link changes or breaks the thing you are
studying. Options that do not stop the core:</p>
<ul>
<li>Read memory live over SWD while the target runs.</li>
<li>ITM or a GPIO for timing.</li>
<li>A circular log in RAM that you dump after the event, which is far cheaper than
printing during it.</li>
</ul>
<h3>Decoding a crash</h3>
<p>A backtrace is addresses. Turning them into functions needs the ELF that matches the
firmware exactly, which is why you archive it per release. Mismatch it and you get
confident, wrong answers.</p>
<p>Where a debugger cannot be attached, store a small crash record in retained RAM or
flash: fault type, faulting address, stacked program counter, uptime, firmware version.
That turns a field failure into evidence.</p>
<h3>The unhelpful defaults</h3>
<ul>
<li><b>Optimisation reorders and inlines</b>, so at -O2 the debugger shows you a line
order that did not happen and variables that have been optimised away. Use -Og while
debugging, and remember that switching to -O0 may hide the fault entirely.</li>
<li><b>A low-power mode may drop the debug connection</b>, because the debug block is
clocked too. Most parts have a bit to keep it alive in sleep.</li>
<li><b>Watchdogs fire while you are halted</b> unless you tell the part to freeze them on
halt, which is usually one bit.</li>
</ul>`,
quiz: [
{ q: "Why are hardware breakpoints limited in number?",
o: ["Debugger licensing", "They are implemented by a comparator unit in silicon, typically six", "Flash cannot hold more", "The protocol limits them"],
a: 1, why: "Software breakpoints have no such limit but work by replacing an instruction, so they only apply to code in RAM rather than in flash." },
{ q: "You need to find what corrupts a variable. What is the right tool?",
o: ["printf on every write", "A data watchpoint", "A logic analyser", "More unit tests"],
a: 1, why: "A watchpoint halts on access to that address and tells you immediately which code did it, in seconds rather than by instrumenting every candidate." },
{ q: "Why is ITM better than printf for real-time debugging?",
o: ["It produces more output", "Writing to a stimulus port costs a few cycles, so it does not move the timing you are measuring", "It works without a probe", "It is easier to set up"],
a: 1, why: "printf over a UART takes long enough to change the behaviour under investigation, which is why a fault often vanishes when you instrument it." },
{ q: "Why archive the ELF for every release?",
o: ["It is needed to flash", "Crash addresses decode against its symbols, and a mismatched build decodes to plausible nonsense", "It contains the partition table", "For licensing"],
a: 1, why: "The image on the device has no symbols. Decoding a backtrace against a different build sends you looking in the wrong file with total confidence." }
],
interview: {
q: "A motor controller misbehaves under load and halting it makes the problem disappear. How do you debug it?",
a: "I would stop trying to halt it, because both stopping the core and instrumenting with printf change the timing of the thing I am measuring. First I would use a spare GPIO toggled at the start and end of the region of interest and watch it on a scope, which gives sub-microsecond resolution for free and shows interrupt latency and jitter directly. If the part has ITM I would use that instead of a UART, since a stimulus port write is a few cycles rather than hundreds of microseconds. Alongside that, a circular log in RAM that records events cheaply and gets dumped after the fault, rather than printing during it. If I can characterise it well enough to know which variable goes wrong, a data watchpoint tells me immediately what wrote it. And I would make sure the debug block is kept alive in low-power modes and that watchdogs freeze on halt, because both of those produce confusing symptoms that look like the bug."
}
},

{
id: "emb-realtime",
track: "Embedded C",
title: "Real-time analysis and timing",
mins: 26,
body: `
<p>"Real time" does not mean fast. It means that a late answer is a wrong answer, and
that you can say what the deadline is and show that you meet it.</p>
<h3>Hard, firm and soft</h3>
<ul>
<li><b>Hard</b>: a missed deadline is a system failure. An airbag, a motor commutation.</li>
<li><b>Firm</b>: a late result is useless but not dangerous. A dropped sensor sample.</li>
<li><b>Soft</b>: late is degraded. A user interface.</li>
</ul>
<p>Most systems mix all three, and the useful discipline is knowing which each task is
rather than treating everything as urgent.</p>
<h3>The numbers that matter</h3>
<ul>
<li><b>Interrupt latency</b>: event to the first instruction of the handler. On Cortex-M
this is short and deterministic unless something has disabled interrupts or a higher
priority handler is running.</li>
<li><b>Worst-case execution time</b>, WCET: the longest a piece of code can take. Not the
average, and not what you measured once.</li>
<li><b>Jitter</b>: the variation in when a periodic thing actually happens. For control
loops jitter often matters more than latency, because a varying sample interval corrupts
the maths.</li>
</ul>
<h3>Why critical sections are the enemy of latency</h3>
<p>Every region with interrupts disabled adds directly to the worst-case latency of every
interrupt. So a long critical section in an unrelated module silently breaks a deadline
somewhere else. Keep them short, count instructions rather than lines, and prefer designs
that need none: single producer and single consumer, atomic word accesses, queues rather
than shared state.</p>
<h3>Utilisation and rate monotonic</h3>
<p>Utilisation is the sum of each task's execution time divided by its period. Above 100
per cent nothing can save you. Below that, whether you meet deadlines depends on the
scheduling policy.</p>
<p><b>Rate monotonic</b> assigns priority by frequency: the fastest task gets the highest
priority. It is optimal among fixed-priority schemes, and there is a classic bound of
about 69 per cent utilisation below which a set of independent periodic tasks is
guaranteed schedulable. Above that it may still work, but you have to analyse rather than
assume.</p>
<p>Two things break the analysis, and both appear elsewhere in this track: <b>priority
inversion</b>, where a task is blocked by a lower priority one holding a resource, and
<b>unbounded work</b> such as a loop whose count depends on data.</p>
<h3>Measuring rather than hoping</h3>
<ul>
<li>Toggle a GPIO around the region and scope it. Sub-microsecond, free, and it shows
jitter as well as duration.</li>
<li>Use a cycle counter such as DWT for repeatable numbers.</li>
<li>Measure under <b>worst case</b>, not idle: cache cold, every branch taken, flash
busy, all interrupts enabled.</li>
<li>Record the maximum seen, not the average, and expose it as a counter.</li>
</ul>
<h3>The design rules that follow</h3>
<ul>
<li>Every loop has a bound you can state.</li>
<li>No dynamic allocation on a real-time path: allocation time is not bounded.</li>
<li>No recursion, so stack depth is analysable.</li>
<li>ISRs do the minimum and hand off to tasks.</li>
<li>Anything that cannot tolerate a clock change takes a lock that pins the frequency.</li>
</ul>`,
quiz: [
{ q: "What does 'hard real time' mean?",
o: ["Very fast", "A missed deadline is a system failure", "Written in assembly", "Deterministic to the nanosecond"],
a: 1, why: "It is about consequence rather than speed. A slow system with a guaranteed one second deadline is hard real time; a fast one with no guarantee is not." },
{ q: "Why does a long critical section in one module break timing in another?",
o: ["It uses more CPU", "Disabling interrupts adds directly to the worst-case latency of every interrupt in the system", "It fragments the heap", "It raises priority"],
a: 1, why: "Interrupt latency is a global property. A module that means well and masks interrupts for 200 microseconds has spent everyone else's budget." },
{ q: "Under rate monotonic scheduling, which task gets the highest priority?",
o: ["The most important", "The one with the shortest period", "The longest running", "The one started first"],
a: 1, why: "Priority follows frequency rather than perceived importance, and this is provably optimal among fixed-priority policies for independent periodic tasks." },
{ q: "Why measure WCET rather than average execution time?",
o: ["It is easier", "A deadline is missed by the worst case, not by the average", "Averages are unreliable", "WCET is faster to measure"],
a: 1, why: "Meeting a deadline on average means missing it regularly. Measurement must be under worst-case conditions: cold cache, every branch taken, all interrupts live." }
],
interview: {
q: "How would you convince yourself that a control loop meets its deadline?",
a: "I would start by writing the deadline down as a number, because a loop with no stated period cannot be shown to meet anything. Then measure rather than reason: toggle a GPIO around the loop and scope it, which gives sub-microsecond resolution and shows jitter as well as duration, or use the cycle counter for repeatable figures. The important part is measuring under worst case rather than idle, so cold cache, every branch taken, flash busy with a settings write, and every interrupt enabled, because that is the condition that will actually occur. Then I would add up utilisation across all the periodic work and check it against the rate monotonic bound, and look specifically for the two things that break the analysis, which are priority inversion and any loop whose count depends on data. And I would keep the maximum observed duration as a counter in the firmware, so if it ever creeps up in the field somebody sees it before a deadline is missed."
}
},

{
id: "emb-dma",
track: "Embedded C",
title: "DMA and the coherency problem",
mins: 24,
body: `
<p>Direct memory access moves data between a peripheral and memory without the CPU. That
buys throughput, lower latency and the ability to sleep during a transfer, and it
introduces a second master touching your memory whenever it likes.</p>
<h3>What it is for</h3>
<ul>
<li><b>Throughput.</b> A CPU loop moving a byte per interrupt collapses above a few
hundred kilobytes per second. DMA does not care.</li>
<li><b>Latency.</b> The transfer proceeds regardless of what the CPU is busy with, so it
does not inherit your interrupt jitter.</li>
<li><b>Power.</b> The core can sleep while data arrives, which on a battery product is
often the whole argument.</li>
</ul>
<h3>The shape of a transfer</h3>
<p>You configure a source, a destination, a length, whether each address increments, the
transfer width, and a trigger. The trigger is usually a peripheral request, so the DMA
moves a byte each time the UART has one. You get an interrupt at completion, and usually
at the halfway point too, which is what makes double buffering possible.</p>
<h3>Circular mode and ping-pong</h3>
<p>For continuous input, a circular buffer with half and full interrupts lets you process
one half while the hardware fills the other. That is how audio and ADC streams are
handled, and it removes the risk of missing a sample entirely.</p>
<p>The rule is that your processing must finish before the hardware comes round again.
If it does not, you get torn data with no error, so instrument the margin rather than
assuming it.</p>
<h3>Coherency, and why volatile does not fix it</h3>
<p>Three things can leave the CPU and the DMA disagreeing about memory:</p>
<ul>
<li><b>The compiler</b> caching a value in a register. <code>volatile</code> fixes this
one, and it is the only one it fixes.</li>
<li><b>A data cache</b> holding a stale line while DMA wrote actual RAM. Needs an
explicit invalidate before reading, and a clean before letting DMA read what you
wrote.</li>
<li><b>A write buffer</b> holding your stores. Needs a barrier.</li>
</ul>
<p>This is why "the buffer is DMA so it must be volatile" is the wrong mental model.
Mark the <b>completion flag</b> volatile, use a barrier, and invalidate the cache on
parts that have one. Marking the whole buffer volatile mostly just prevents the compiler
optimising every access to it.</p>
<h3>Buffer requirements</h3>
<ul>
<li><b>Alignment</b>, often to the cache line size, because invalidating a line that
partly contains other variables destroys them.</li>
<li><b>Not on the stack.</b> A DMA buffer must outlive the function that started the
transfer, and stack frames do not.</li>
<li><b>The right memory region.</b> Some DMA controllers cannot reach all RAM, and on
some parts cannot reach external PSRAM at all.</li>
</ul>
<h3>Failures to recognise</h3>
<ul>
<li><b>The first transfer works and later ones do not.</b> The completion flag is not
being cleared, or the descriptor is not being reloaded.</li>
<li><b>Data is correct only when you add a print.</b> Classic coherency: the delay lets
the cache or write buffer settle.</li>
<li><b>Some bytes are stale.</b> Cache invalidation with the wrong range or wrong
alignment.</li>
<li><b>It works with the debugger attached.</b> Halting changes the timing enough to hide
a race.</li>
</ul>`,
quiz: [
{ q: "What does marking a DMA buffer volatile actually fix?",
o: ["Cache coherency", "The compiler caching a value in a register, and nothing else", "Write buffering", "All three coherency problems"],
a: 1, why: "volatile is a compiler instruction. It has no effect on a data cache or a write buffer, which is why 'DMA means volatile' is the wrong mental model." },
{ q: "Why must a DMA buffer not be a local variable?",
o: ["Locals cannot be aligned", "The transfer outlives the function, and the stack frame does not", "The stack is too small", "DMA cannot reach stack memory"],
a: 1, why: "The controller writes into that memory after the function has returned, by which time the frame belongs to something else." },
{ q: "Why does a DMA buffer often need cache-line alignment?",
o: ["For speed", "Invalidating a line that partly contains other variables destroys them", "The controller requires it", "To reduce power"],
a: 1, why: "Cache maintenance works on whole lines. If your buffer shares a line with something else, invalidating it discards that neighbour's cached value too." },
{ q: "Data is wrong until you add a printf, then it is correct. What does that suggest?",
o: ["A compiler bug", "A coherency or timing problem: the delay lets the cache or write buffer settle", "A stack overflow", "Wrong DMA channel"],
a: 1, why: "Any fault that disappears when you slow the code down is timing-related. With DMA the usual cause is a missing cache invalidate or barrier." }
],
interview: {
q: "You are adding DMA to a UART receive path that currently works with an interrupt per byte. What do you have to get right?",
a: "The buffer first: it has to outlive the transfer so it cannot be a local, it may need alignment to a cache line so that maintenance operations do not clobber neighbouring variables, and on some parts it has to sit in a region the controller can actually reach. Then the coherency question, and I would be explicit that volatile only fixes the compiler caching a value in a register: on a part with a data cache I need an invalidate before reading, and a barrier so the completion flag check is not reordered against the buffer access. For continuous receive I would use circular mode with half and full interrupts so I process one half while the hardware fills the other, and I would instrument the margin rather than assume the processing finishes in time, because overrunning gives you torn data with no error. And I would expect the classic symptoms while bringing it up: works with a print in it, works with the debugger attached, first transfer fine and later ones not, which is usually an uncleared flag."
}
},

{
id: "emb-crc",
track: "Embedded C",
title: "CRC: what it computes and what it proves",
mins: 24,
body: `
<p>A CRC is the remainder of a division. Treat the whole message as one enormous binary
number, divide it by a fixed constant called the polynomial, and keep what is left over.
The only twist is that the subtraction inside the division is XOR, because binary
arithmetic without carries is what hardware can do in one gate.</p>

<p>That is the entire idea. Everything else is bookkeeping about which conventions both
ends agreed to.</p>

<h3>The whole algorithm</h3>
<p>This is CRC-16/CCITT-FALSE. A shift register, a test of the top bit, and a conditional
XOR:</p>
<pre>uint16_t crc16_ccitt(const uint8_t *data, size_t len)
{
    uint16_t crc = 0xFFFF;                      /* the init value */

    for (size_t i = 0; i &lt; len; i++) {
        crc ^= (uint16_t)data[i] &lt;&lt; 8;          /* byte enters at the TOP */

        for (int bit = 0; bit &lt; 8; bit++) {
            if (crc &amp; 0x8000) {                 /* top bit set? */
                crc = (uint16_t)((crc &lt;&lt; 1) ^ 0x1021);
            } else {
                crc = (uint16_t)(crc &lt;&lt; 1);
            }
        }
    }
    return crc;
}</pre>

<p>The byte is XORed into the <b>top</b> half of the register, not the bottom. That is what
makes this a division from the most significant end down, which is how long division works
on paper.</p>

<h3>Watch one byte go through</h3>
<p>Register starts at 0xFFFF, first byte is 0x31, the ASCII character 1:</p>
<pre>after xor of byte                          0xCEFF
bit 0: top was 1 -&gt; shift, then xor poly   0x8DDF
bit 1: top was 1 -&gt; shift, then xor poly   0x0B9F
bit 2: top was 0 -&gt; shift only             0x173E
bit 3: top was 0 -&gt; shift only             0x2E7C
bit 4: top was 0 -&gt; shift only             0x5CF8
bit 5: top was 0 -&gt; shift only             0xB9F0
bit 6: top was 1 -&gt; shift, then xor poly   0x63C1
bit 7: top was 0 -&gt; shift only             0xC782</pre>
<p>Eight iterations, one per bit, and the register is ready for the next byte.</p>

<h3>Proving yours is right</h3>
<p>Every CRC in the published catalogue comes with a <b>check value</b>: the CRC of the
ASCII string 123456789. Run yours against it and you know at once whether every parameter
matches.</p>
<pre>CRC-16/CCITT-FALSE   poly 0x1021, init 0xFFFF        -&gt; 0x29B1
CRC-16/XMODEM        poly 0x1021, init 0x0000        -&gt; 0x31C3
CRC-16/ARC           poly 0xA001 reflected, init 0   -&gt; 0xBB3D
CRC-32               poly 0xEDB88320 refl, init ~0   -&gt; 0xCBF43926</pre>
<p>Make that your first unit test, before you write a byte of protocol code. It is the
cheapest possible check and it runs on a host with no hardware.</p>

<h3>The receiver trick</h3>
<p>You do not have to compute the CRC and compare it. Append the CRC to the frame most
significant byte first, then run the CRC over the <b>whole thing including the CRC bytes</b>,
and the answer is zero.</p>
<pre>if (crc16_ccitt(frame, len) != 0) {
    reject();          /* one line, any frame length */
}</pre>
<p>This falls out of the arithmetic: appending the remainder makes the whole number
divisible. It removes the separate comparison and the chance of comparing the wrong bytes.</p>

<h3>What actually causes integration arguments</h3>
<p>A CRC is not defined by its polynomial. Two implementations that agree on the polynomial
and disagree on any one of these produce different answers, and both are entitled to call
themselves CRC-16:</p>
<ul>
<li><b>Width</b>, 8, 16 or 32</li>
<li><b>Polynomial</b>, and whether it is written in normal or reversed form</li>
<li><b>Init</b> value, commonly 0x0000 or 0xFFFF</li>
<li><b>Reflection</b> of input bytes, of the output, or both</li>
<li><b>Final XOR</b> applied to the result</li>
<li><b>Coverage</b>: exactly which bytes are included. Header? Length field? Start delimiter?</li>
</ul>
<p>That last one is not part of the algorithm at all, and it is the one most likely to be
undocumented. Specify all six in the protocol document, and include one worked example frame
in hex with its CRC. That single example settles more disputes than any amount of prose.</p>

<h3>Making it fast</h3>
<p>The bitwise version does eight iterations per byte. The table version precomputes what
those eight iterations do to each possible byte, so it does one:</p>
<pre>static const uint16_t crc_table[256] = { /* generated at build time */ };

uint16_t crc16_fast(const uint8_t *d, size_t n)
{
    uint16_t crc = 0xFFFF;
    while (n--)
        crc = (uint16_t)((crc &lt;&lt; 8) ^ crc_table[((crc &gt;&gt; 8) ^ *d++) &amp; 0xFF]);
    return crc;
}</pre>
<p>The table is built by running the bitwise loop over each of 256 values, so the slow
version remains the definition. Cost is 512 bytes, and declaring it const puts that in flash
rather than RAM.</p>
<p>Before writing either, check whether your part has a CRC peripheral. Most STM32s and the
ESP32 have one, and then it is a register write per word with no table at all.</p>

<h3>Why a CRC and not a sum</h3>
<p>A simple additive checksum is blind to reordering, because addition is commutative: swap
two bytes and the sum is unchanged. It also misses many multi-bit patterns.</p>
<p>A CRC is chosen so that the error patterns physical layers actually produce, particularly
bursts, are <b>guaranteed</b> detectable up to a known length. For the same field width you
get far better detection, and with a table or a peripheral it is not slower in any way that
matters.</p>

<h3>The thing it does not do</h3>
<p>A CRC detects accidental corruption. It is a public, keyless function, so anyone who can
modify a message can recompute the CRC over the modified message and produce something
indistinguishable from a valid frame.</p>
<p>Keeping the polynomial secret does not help either: it can be recovered from a handful of
known message and CRC pairs.</p>
<p>Integrity against an adversary needs a keyed construction such as an HMAC, or a signature
where the receiver must verify origin without holding the secret. This is the same
distinction as a bootloader checking a CRC versus verifying a signature. One catches a
corrupted download, the other refuses firmware you did not produce.</p>
`,
quiz: [
{ q: "What does a CRC actually compute?",
o: ["A sum of the bytes", "The remainder of a division, using XOR in place of subtraction", "A hash of the message", "A count of set bits"],
a: 1, why: "The message is treated as one long binary number and divided by the polynomial. XOR replaces subtraction because binary arithmetic without carries is what hardware does cheaply." },
{ q: "You append the CRC to a frame and run the CRC over the whole thing including those bytes. What should you get?",
o: ["The CRC again", "Zero", "The init value", "It is not meaningful"],
a: 1, why: "Appending the remainder makes the whole number divisible, so the remainder becomes zero. It lets the receiver check any frame length in one line with no comparison." },
{ q: "Two implementations agree on the polynomial and produce different answers. What is the most likely cause?",
o: ["A hardware fault", "Disagreement about init, reflection, final XOR or which bytes are covered", "Different CPU endianness", "Different compilers"],
a: 1, why: "The polynomial is one of six things that must match. Coverage is the one most often left undocumented, and it is not part of the algorithm at all." },
{ q: "Does a CRC protect a firmware image against tampering?",
o: ["Yes", "No: it is keyless, so an attacker recomputes it over the modified image", "Only CRC-32 does", "Only if the polynomial is secret"],
a: 1, why: "It is an error-detection code, not a security primitive. A secret polynomial does not help either, since it can be recovered from known message and CRC pairs. Use an HMAC or a signature." }
],
interview: {
q: "You are defining a serial protocol between a device and a PC. Talk me through the integrity check.",
a: "I would use a CRC rather than an additive checksum, because a sum is blind to transposition and misses a lot of multi-bit patterns, whereas a CRC guarantees detection of burst errors up to a known length for the same field width. CRC-16/CCITT-FALSE is a reasonable default and most parts have a hardware unit for it. The important part is the specification rather than the algorithm: I would write down width, polynomial, init value, whether input and output are reflected, the final XOR, and above all exactly which bytes are covered, because coverage is not part of the algorithm and is the thing that gets left out. Then one worked example frame in hex with its CRC, which settles integration arguments faster than any prose. On the implementation side I would test against the published check value for the string 123456789 before writing any protocol code, since that catches a wrong parameter immediately and runs on a host. On the receive side I would run the CRC over the frame including the CRC bytes and check for zero, which handles any length in one line. And I would be clear with whoever asks that this detects accidental corruption only. If the requirement is to reject frames an attacker wrote, that needs an HMAC or a signature, which is a different mechanism and a key management problem."
}
}

);
