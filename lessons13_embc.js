// Embedded C track, batch 13: the bench, the whiteboard and the build.
// The three things an interview asks that the rest of the track does not cover:
// driving a debugger, answering an open design question, and reading a build.
// Code samples use &lt; &gt; &amp; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-gdb",
track: "Embedded C",
sub: "Bring-up and diagnosis",
title: "Driving gdb on a target",
mins: 24,
body: `
<p>If someone sits you at a bench with a debugger attached, the question is usually not whether
you can find the bug but whether you can drive the tool without narrating a struggle. The
useful subset is about fifteen commands.</p>

<h3>Getting attached</h3>
<pre>openocd -f interface/stlink.cfg -f target/stm32f4x.cfg
JLinkGDBServer -device nRF52840_xxAA -if SWD -speed 4000
west debug                          Zephyr, does both ends

arm-none-eabi-gdb build/zephyr/zephyr.elf
  (gdb) target extended-remote :3333    OpenOCD
  (gdb) target remote :2331             J-Link
  (gdb) monitor reset halt
  (gdb) load
  (gdb) continue</pre>
<p><code>monitor</code> passes the rest of the line to the probe server rather than to gdb,
which is how you reach <code>reset halt</code>, <code>reset init</code> and flash commands.</p>

<h3>The commands worth having ready</h3>
<pre>bt                  backtrace: where am I and how did I get here
bt full             the same, with each frame's locals
frame 2 / f 2       select a frame, then print its locals
info locals
info args
info registers      all of them
p/x $pc  p $sp  p $lr

p expr              print, in whatever form: p buf[3], p *dev
p/x val             hex.  p/t is binary, p/d decimal
x/16xb ptr          examine 16 bytes, hex
x/8xw 0x40021000    8 words: a peripheral register block
x/s name            as a string
x/16i $pc           the next 16 instructions

ptype dev           what type is this, expanded
p sizeof(struct foo)</pre>
<p><code>x</code> is the one that pays off on embedded work: reading a peripheral block with
<code>x/8xw</code> answers "did that write actually land" in one line.</p>

<h3>Breakpoints and, more usefully, watchpoints</h3>
<pre>b uart.c:214              break at a line
b uart_send               break at a function
b uart.c:214 if len &gt; 64  conditional, which is the one
                          that finds intermittent bugs
tbreak                    one-shot

watch rx_len              stop when this value changes
rwatch rx_len             stop when it is read
awatch rx_len             either
info watchpoints
delete 2</pre>
<p><b>The watchpoint is the tool people forget.</b> "This variable is being corrupted and I
cannot find who writes it" is exactly what it answers: set the watchpoint, continue, and the
next stop is the culprit with a backtrace.</p>
<p>Cortex-M implements watchpoints in the DWT unit, so there are typically only four, and only
on aligned addresses of 1, 2 or 4 bytes. Exceed that and gdb falls back to single-stepping the
whole program, which is thousands of times slower and looks like a hang.</p>

<h3>Reading a fault</h3>
<pre>p/x *(uint32_t *)0xE000ED28    CFSR: what kind of fault
p/x *(uint32_t *)0xE000ED38    BFAR: the address that faulted
p/x *(uint32_t *)0xE000ED34    MMFAR

x/8xw $sp                      the stacked frame:
                               R0 R1 R2 R3 R12 LR PC xPSR</pre>
<p>The stacked PC is the instruction that faulted, and it is the seventh word from the frame
base. Feed it to <code>info symbol</code> or <code>addr2line</code> and you have the line.</p>
<pre>info symbol 0x08001a3c
arm-none-eabi-addr2line -e zephyr.elf 0x08001a3c</pre>

<h3>The one that catches everyone</h3>
<p>If the code was built with <code>-O2</code>, variables get optimised into registers and gdb
prints <code>&lt;optimized out&gt;</code>, and stepping jumps around apparently at random.</p>
<p>That is not a broken debugger, it is an accurate view of code that no longer matches the
source line by line. <code>-Og</code> is the setting to build with: it optimises but keeps the
debug view honest.</p>
<p>Saying this out loud when it happens, rather than being confused by it, is worth a
surprising amount.</p>

<h3>Things worth knowing exist</h3>
<ul>
<li><b>RTOS awareness.</b> With the right settings gdb lists every thread rather than only the
running one, so <code>info threads</code> and <code>thread 3</code> work. On Zephyr that is
<code>CONFIG_DEBUG_THREAD_INFO</code>.</li>
<li><b><code>set var x = 5</code>.</b> Change a value and continue, to test a branch you cannot
otherwise reach.</li>
<li><b><code>jump</code> and <code>return</code>.</b> Skip a call or force a return. Blunt, and
occasionally exactly what you need.</li>
<li><b>A <code>.gdbinit</code></b> holding your connect, reset and load sequence, so attaching
is one command rather than five.</li>
<li><b>Semihosting.</b> printf through the debug probe with no UART at all. Convenient, and it
halts the core on every call, so it destroys timing.</li>
</ul>

<h3>What to say if you are handed a debugger</h3>
<p>Narrate the plan before touching it: where you would break, what you expect to see, and what
each outcome would tell you. Someone who says "I will watch that variable, and if it changes
inside the ISR that confirms the missing volatile" is doing the job. Someone who single-steps
in silence is not.</p>
`,
quiz: [
{ q: "A variable is being corrupted and you cannot find the writer. What is the tool?",
o: ["A breakpoint on every function", "A watchpoint on the variable, which stops on the write and gives you a backtrace", "More logging", "Single-stepping"],
a: 1, why: "Cortex-M implements them in the DWT unit, so there are typically four, on aligned 1, 2 or 4 byte addresses. Exceed that and gdb single-steps the whole program, which looks like a hang." },
{ q: "gdb prints &lt;optimized out&gt; and stepping jumps around. What does that mean?",
o: ["The debugger is broken", "The build is optimised, so the code no longer matches the source line by line", "The ELF does not match the binary", "The probe is too slow"],
a: 1, why: "It is an accurate view rather than a fault. -Og is the development setting: it optimises but keeps the debug view honest. Recognising it out loud is worth more than being puzzled by it." },
{ q: "What does <code>monitor</code> do in gdb?",
o: ["Watches a variable", "Passes the rest of the line to the probe server rather than to gdb", "Displays memory continuously", "Enables tracing"],
a: 1, why: "It is how you reach OpenOCD or J-Link commands such as reset halt, reset init and flash operations, which gdb itself knows nothing about." },
{ q: "Which command reads a peripheral register block?",
o: ["p reg", "x/8xw 0x40021000", "info registers", "ptype"],
a: 1, why: "Examine eight words in hex from that address. It answers 'did that write actually land' in one line, and it is the single most useful gdb command in embedded work." }
],
interview: {
q: "We hand you a board, a debugger and a bug where a counter sometimes has the wrong value. What do you do?",
a: "First I would say what I think is happening and what would confirm it, because narrating the plan is most of the value. A counter with an occasionally wrong value in firmware is usually a shared variable, so my first hypothesis is either a missing volatile or a read-modify-write that an interrupt lands in the middle of. The tool for that is a watchpoint rather than breakpoints: watch the variable, continue, and the next stop tells me who wrote it with a full backtrace. If it stops inside the ISR while the main-line code was mid-update, that is the race confirmed. I would be aware that Cortex-M implements watchpoints in the DWT unit, so there are about four and they want aligned addresses of one, two or four bytes; ask for more and gdb silently falls back to single-stepping the whole program, which looks like a hang rather than an error. If the value is only wrong at higher optimisation I would suspect the missing volatile specifically, and I would check by reading the disassembly around the access to count the loads. I would also build at -Og rather than -O2 while debugging, because at -O2 the locals are in registers, gdb says optimized out and stepping jumps around, and that is an accurate view of code that no longer matches the source rather than a broken tool. And if I get a fault instead, the stacked frame at the stack pointer gives me R0 to R3, R12, LR, PC and xPSR, so the stacked PC plus addr2line against the ELF for that exact build gives me the line."
}
},

{
id: "emb-design",
track: "Embedded C",
sub: "Drivers and architecture",
title: "Answering a system design question",
mins: 26,
body: `
<p>"Design the firmware for a battery-powered sensor that logs to flash and uploads over BLE."
There is no right answer, and there is definitely a wrong way to start, which is by naming a
microcontroller.</p>

<h3>The shape of a good answer</h3>
<ol>
<li><b>Ask what it has to do.</b> Numbers, not adjectives.</li>
<li><b>State the constraints that will actually decide the design.</b></li>
<li><b>Draw the data flow</b>, from sensor to consumer.</li>
<li><b>Choose the software architecture</b>, and say why.</li>
<li><b>Name what will go wrong</b>, and what you would do about it.</li>
<li><b>Say what you would build first</b>, and what you would measure.</li>
</ol>
<p>The interviewer is watching for whether you ask before you answer, whether you can justify a
choice rather than assert it, and whether you know where the risk is.</p>

<h3>Step 1: the questions to ask</h3>
<pre>How often does it sample, and how precisely timed?
How long must it run on a battery, and which battery?
How much data, and can any of it be lost?
How often does it connect, and to what?
Does it need to survive power loss mid-write?
How many units, and can they be updated in the field?
What is the environment: temperature, wet, moving?
Regulated? Safety-relevant? Which market?</pre>
<p>Three or four of these, chosen for the product in front of you, is enough. Asking all of them
mechanically is its own kind of failure.</p>

<h3>Step 2: the constraint that decides everything</h3>
<p>Usually one does. For a battery sensor it is the energy budget, and it is worth doing
arithmetic out loud:</p>
<pre>2000 mAh cell, target one year  -&gt; about 228 uA average

radio on, 5 mA for 200 ms per hour  -&gt; 0.28 uA average
sample at 1 Hz, 2 mA for 5 ms       -&gt; 10 uA average
sleep current                       -&gt; whatever is left

so the sleep current is the whole design.</pre>
<p>That calculation changes the answer: it says the part choice is driven by sleep current and
wake time, that the sensor must be powered down between samples, and that a linear regulator
with 50 microamps of quiescent current has just spent a fifth of the budget.</p>
<p>Doing one number out loud is worth more than ten minutes of block diagram.</p>

<h3>Step 3: the data flow</h3>
<pre>sensor -&gt; ISR or DMA -&gt; ring buffer -&gt; processing
       -&gt; record -&gt; flash log -&gt; BLE upload -&gt; erase</pre>
<p>Then ask the questions the arrows raise. What is the rate at each stage? Where does data wait,
and how much can wait there? What happens when the consumer is slower than the producer? Where
does data become durable, and what is lost if power fails just before that?</p>

<h3>Step 4: the architecture, with a reason</h3>
<pre>super loop           few tasks, no blocking, easiest to reason
                     about and to certify

cooperative          you control the switch points, so no
scheduler            locking, but one long task hurts everyone

RTOS                 several independent activities with
                     different rates, or a stack that demands
                     it (BLE, TCP/IP)

interrupt +          a tiny ISR does the urgent part, a
deferred work        thread does the rest</pre>
<p>For this product: a BLE stack effectively decides it, because those come as RTOS-based
subsystems. That is a legitimate reason and better than a preference.</p>

<h3>Step 5: where it will go wrong</h3>
<p>Naming the failure modes unprompted is the strongest signal in the whole answer:</p>
<ul>
<li><b>Flash wear.</b> A record a second for a year is 31 million writes. Wear levelling, or a
log-structured store, is not optional.</li>
<li><b>Power loss mid-write.</b> Write the data, then the validity marker, so a half-written
record is ignored rather than corrupt.</li>
<li><b>The connection drops mid-upload.</b> Do not erase until the far end has acknowledged, so
the worst case is a duplicate rather than a hole.</li>
<li><b>Clock drift.</b> Twenty ppm is ten minutes a year, so timestamps need discipline from the
peer at connect.</li>
<li><b>The battery ages.</b> Cold and end-of-life both raise internal resistance, so the radio
burst may brown out a cell that measures fine at rest.</li>
<li><b>An update bricks the fleet.</b> A/B images and a confirm step, or do not ship update at
all.</li>
</ul>

<h3>Step 6: what you would build first</h3>
<p>Answer with a measurement, not a feature. "First I would put the part in its deepest sleep
with the sensor attached and measure the actual current, because if that number is wrong
nothing else in the design survives."</p>
<p>That is the answer of someone who has watched a power budget fail, and it is what the
question is really asking.</p>

<h3>Two failure modes in the answer itself</h3>
<ul>
<li><b>Starting with a part number.</b> It reveals that you have chosen before you have
constrained.</li>
<li><b>Refusing to commit.</b> After asking, pick something and defend it. "I would use an RTOS
because the BLE stack requires one, and I would keep the number of threads small" is an answer.
"It depends" is not.</li>
</ul>
`,
quiz: [
{ q: "How should you open an answer to a system design question?",
o: ["By choosing a microcontroller", "By asking what it has to do, in numbers rather than adjectives", "By drawing a block diagram", "By listing the peripherals"],
a: 1, why: "Starting with a part number reveals that you have chosen before you have constrained. Three or four well-chosen questions is enough; asking all of them mechanically is its own kind of failure." },
{ q: "In a battery-powered design, which single calculation changes the whole answer?",
o: ["Flash usage", "The average current budget, worked out from capacity and target life", "Clock speed", "BLE throughput"],
a: 1, why: "2000 mAh over a year is about 228 microamps average. That says the part is chosen on sleep current, that the sensor must be powered down between samples, and that a 50 microamp regulator has spent a fifth of the budget." },
{ q: "What is the strongest unprompted signal in a design answer?",
o: ["Naming the right chip", "Naming the failure modes and what you would do about each", "Drawing a neat diagram", "Quoting a standard"],
a: 1, why: "Flash wear, power loss mid-write, a dropped upload, clock drift, battery ageing, a bad update. Each one is evidence you have shipped something rather than only designed it." },
{ q: "Asked what you would build first, what is the best kind of answer?",
o: ["The most complex subsystem", "A measurement that would invalidate the design if it came out wrong, such as actual sleep current", "The user interface", "The BLE stack"],
a: 1, why: "It is the answer of someone who has watched a power budget fail. Building the feature first and discovering the constraint later is exactly the mistake the question is probing for." }
],
interview: {
q: "Design the firmware for a battery-powered sensor that logs to flash and uploads over BLE.",
a: "Before choosing anything I would want a few numbers: sample rate and how precisely timed, target battery life and cell, how much data and whether any of it may be lost, how often it connects, and whether it has to survive power loss mid-write. For a product like this the energy budget usually decides everything, so I would do that arithmetic out loud. A 2000 milliamp-hour cell over a year is about 228 microamps average. A radio burst of 5 milliamps for 200 milliseconds an hour is well under a microamp averaged, and sampling at 1 Hz for 5 milliseconds at 2 milliamps is about 10, so nearly the entire budget is sleep current. That tells me the part is chosen on sleep current and wake time, the sensor must be powered down between samples, and a regulator with 50 microamps of quiescent current has just spent a fifth of the budget. Then the data flow: sensor into an ISR or DMA, a ring buffer, a record, a log-structured flash store, upload, erase. On architecture I would use an RTOS, not by preference but because the BLE stack effectively requires one, and I would keep the thread count small. The failure modes I would name unprompted are flash wear, since a record a second for a year is 31 million writes so wear levelling is not optional; power loss mid-write, which I would handle by writing the data then the validity marker so a half-written record is ignored; a dropped upload, where I would not erase until the peer acknowledges so the worst case is a duplicate rather than a hole; clock drift, since 20 ppm is ten minutes a year; and the battery's rising internal resistance when cold or old, which can brown out during a radio burst on a cell that measures fine at rest. And the first thing I would actually build is none of that: I would put the part in its deepest sleep with the sensor attached and measure the real current, because if that number is wrong the rest of the design does not survive."
}
},

{
id: "emb-buildtools",
track: "Embedded C",
sub: "Memory and the build",
title: "Reading a build: make, CMake and the compile line",
mins: 24,
body: `
<p>You do not need to love build systems, but you do need to be able to read one, because
"it does not build on my machine" and "why is this flag not applied" are both build questions
and both come up.</p>

<h3>What make actually does</h3>
<p>One idea: a target, its prerequisites, and a recipe that runs only when a prerequisite is
newer than the target.</p>
<pre>CC      := arm-none-eabi-gcc
CFLAGS  := -mcpu=cortex-m4 -mthumb -O2 -g3 -Wall -Wextra
SRCS    := $(wildcard src/*.c)
OBJS    := $(SRCS:.c=.o)

app.elf: $(OBJS) link.ld
	$(CC) $(CFLAGS) -T link.ld $(OBJS) -o $@

%.o: %.c
	$(CC) $(CFLAGS) -c $&lt; -o $@

clean:
	rm -f $(OBJS) app.elf

.PHONY: clean</pre>
<ul>
<li><code>$@</code> is the target, <code>$&lt;</code> the first prerequisite,
<code>$^</code> all of them.</li>
<li><code>%.o: %.c</code> is a pattern rule: how to make any object from its source.</li>
<li><code>.PHONY</code> says <code>clean</code> is not a file, so make does not skip it if a
file called <code>clean</code> happens to exist.</li>
<li><b>Recipes are indented with a tab.</b> Spaces produce "missing separator", which is the
first thing everyone hits.</li>
</ul>

<h3>The bug in that Makefile</h3>
<p>It has no header dependencies. Edit a header and nothing rebuilds, so you debug a stale
object and lose an afternoon.</p>
<pre>CFLAGS += -MMD -MP
-include $(OBJS:.o=.d)</pre>
<p><code>-MMD</code> makes the compiler emit a <code>.d</code> file listing the headers each
object depends on, and <code>-include</code> pulls them in. Two lines, and it is the difference
between a Makefile that works and one that lies.</p>

<h3>Reading a compile line</h3>
<pre>arm-none-eabi-gcc
  -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard
  -Os -g3 -ffunction-sections -fdata-sections
  -Wall -Wextra -Werror
  -DSTM32F407xx -Iinc -Idrivers
  -c src/main.c -o build/main.o</pre>
<ul>
<li><code>-mfloat-abi=hard</code> passes floats in FPU registers. <b>Every object and every
library must agree</b>, or the link fails or, worse, silently passes arguments in the wrong
place.</li>
<li><code>-ffunction-sections -fdata-sections</code> put each function and object in its own
section, so the linker's <code>--gc-sections</code> can discard the unused ones. They only pay
off together.</li>
<li><code>-Os</code> optimises for size, which is usually right on a microcontroller and often
also faster, because flash is slow and cache is small.</li>
<li><code>-g3</code> costs nothing in the image: debug information goes in the ELF and is not
flashed.</li>
</ul>

<h3>CMake, the parts you need</h3>
<pre>cmake_minimum_required(VERSION 3.20)
project(app C ASM)

add_executable(app src/main.c src/uart.c)

target_include_directories(app PRIVATE inc)
target_compile_options(app PRIVATE -Wall -Wextra -Werror)
target_compile_definitions(app PRIVATE STM32F407xx)
target_link_options(app PRIVATE -T\${CMAKE_SOURCE_DIR}/link.ld)</pre>
<p>The modern idiom is that everything hangs off a target, and the keyword says who inherits
it:</p>
<pre>PRIVATE     this target only
INTERFACE   consumers only, not this target
PUBLIC      both</pre>
<p>Getting that right is what stops one library's private include path leaking across the
project. The old global commands, <code>include_directories</code> and
<code>add_definitions</code>, apply to everything and are what the target commands
replaced.</p>

<h3>Cross-compiling</h3>
<p>A toolchain file, passed once at configure time:</p>
<pre>set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_SYSTEM_PROCESSOR arm)
set(CMAKE_C_COMPILER arm-none-eabi-gcc)
set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)

cmake -B build -DCMAKE_TOOLCHAIN_FILE=arm.cmake</pre>
<p><code>CMAKE_SYSTEM_NAME Generic</code> is what tells CMake there is no operating system.
The <code>TRY_COMPILE</code> line is the one people search for: without it CMake tries to build
and <b>link</b> a test executable during configure, which fails on a bare-metal target that has
no startup code yet.</p>

<h3>When the build is lying to you</h3>
<pre>make --debug=b            why did it decide to rebuild this
make -n                   print the recipes, run nothing
make -p                   dump every rule and variable

cmake --build build -v    show the actual compile lines
compile_commands.json     what your editor and clang-tidy read
                          (-DCMAKE_EXPORT_COMPILE_COMMANDS=ON)</pre>
<p><code>-v</code> is the one to reach for first. Almost every "that flag is not being applied"
is answered by reading the line that actually ran, and it is usually a target-versus-global
scope mistake.</p>

<h3>The reproducibility question</h3>
<p>A build depends on the compiler version, the flags, the library versions and the linker
script, none of which live in your source tree by default. Pinning them, in a container or a
documented toolchain version with a checksum, is what makes a release rebuildable a year
later.</p>
`,
quiz: [
{ q: "A Makefile rebuilds nothing when you edit a header. What is missing?",
o: ["A clean rule", "Header dependency generation: -MMD -MP plus -include of the .d files", "A .PHONY declaration", "Tab indentation"],
a: 1, why: "Without it make has no idea an object depends on a header, so you debug a stale object. Two lines, and it is the difference between a Makefile that works and one that lies." },
{ q: "What does <code>-ffunction-sections</code> achieve on its own?",
o: ["Smaller code immediately", "Nothing much: it needs the linker's --gc-sections to discard the unused sections", "Faster linking", "Better debug information"],
a: 1, why: "It puts each function in its own section so the linker can drop the ones nothing references. The two flags only pay off together, which is why they are always quoted as a pair." },
{ q: "In modern CMake, what does PRIVATE versus PUBLIC control?",
o: ["Symbol visibility in the binary", "Who inherits the setting: PRIVATE this target only, INTERFACE consumers only, PUBLIC both", "Access to source files", "Whether the option is optional"],
a: 1, why: "It is what stops one library's private include path leaking across the whole project. The old global commands applied to everything, which is exactly the problem the target commands replaced." },
{ q: "A compile flag appears to have no effect. What do you run?",
o: ["make clean", "cmake --build build -v, and read the line that actually ran", "cmake --fresh", "Check the documentation"],
a: 1, why: "Almost every case is answered by reading the real compile line, and the cause is usually a target-versus-global scope mistake. For make, -n prints the recipes without running them." }
],
interview: {
q: "Someone says a compiler flag they added is being ignored. How do you find out what is happening?",
a: "I would look at the compile line that actually ran rather than at the build files, because the files tell you the intention and the line tells you the result. With CMake that is cmake --build with -v, and with make it is make -n to print the recipes without running them. Nine times out of ten the flag is there but scoped wrongly: in modern CMake everything hangs off a target and the keyword decides who inherits it, so a PRIVATE option on one library never reaches the executable, and people reach for the old global commands like add_definitions when they mean target_compile_options. The other common cause is that the build did not reconfigure, so I would check whether a clean configure changes the answer before going further. If the flag is genuinely present and the behaviour is still wrong, I would suspect an ordering or override problem, since later flags win for most GCC options, and something later in the line may be undoing it. For make specifically, the other classic is that nothing rebuilt at all, which usually means the Makefile has no header dependency generation: without -MMD and -MP and an include of the resulting .d files, editing a header rebuilds nothing and you end up debugging a stale object. And on a cross-compiled project I would check that ABI-affecting flags like -mfloat-abi agree across every object and library, because a mismatch there either fails at link or, worse, passes arguments in the wrong place."
}
}

);
