// Embedded C track, batch 5: the Cortex-M architecture underneath the C.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-cm-model",
track: "Embedded C",
sub: "Cortex-M architecture",
title: "The Cortex-M programmer's model",
mins: 24,
body: `
<p>You can write firmware for years without opening the architecture manual, right up until
something hard faults and the debugger shows you a register dump. This is the minimum you
need to read that dump.</p>

<h3>The registers</h3>
<p>Sixteen visible at a time. R0 to R12 are general purpose, and the last three are special:</p>
<ul>
<li><b>R13, the stack pointer.</b> Banked: there are two of them, MSP and PSP, and which one
R13 refers to depends on the mode. Handlers always use MSP.</li>
<li><b>R14, the link register.</b> Holds the return address for a function call. On exception
entry it holds something else entirely, which is the next lesson.</li>
<li><b>R15, the program counter.</b> Writing to it is a branch.</li>
</ul>
<p>Alongside those sit <b>xPSR</b>, holding the condition flags and the number of the exception
currently executing, and <b>CONTROL</b>, selecting which stack pointer thread mode uses and
whether it is privileged.</p>

<h3>Two modes, two stacks</h3>
<p>The core is in <b>thread mode</b> when running ordinary code, and <b>handler mode</b> when
running an exception. That is the whole distinction, and it decides two things: handler mode is
always privileged, and it always uses MSP.</p>
<p>Thread mode can use either stack pointer. Bare metal firmware typically leaves everything on
MSP and never thinks about it. An RTOS gives each task its own stack on PSP and keeps MSP for
handlers, which is why a task stack overflow does not immediately take down interrupt
handling.</p>

<h3>Privilege</h3>
<p>Privileged code can touch the system registers: NVIC, SCB, MPU, and the special registers
themselves. Unprivileged code cannot, and a bare attempt is a fault rather than a silent
no-op.</p>
<p>Most firmware runs entirely privileged, and that is a legitimate choice for a small system.
The reason to care is that dropping tasks to unprivileged and configuring the MPU is how you
get memory protection between tasks, which turns a wild pointer from silent corruption into an
immediate, localised fault.</p>

<h3>Thumb, and the bit that catches everyone</h3>
<p>Cortex-M executes only the Thumb instruction set. There is no ARM state to switch to. But
the encoding still uses <b>bit 0 of an address to mean "this target is Thumb"</b>, and since
there is no alternative, that bit must always be 1.</p>
<p>So every function pointer, every vector table entry and the reset vector itself carries an
odd address. The linker and compiler do this for you. It bites when you construct an address by
hand:</p>
<pre>/* jumping to an application from a bootloader */
uint32_t entry = *(uint32_t *)(APP_BASE + 4);   /* reset vector, already odd */
void (*app)(void) = (void (*)(void))entry;      /* correct */

void (*app)(void) = (void (*)(void))(APP_BASE + 0x200);  /* even: hard fault */</pre>
<p>A UsageFault with INVSTATE set means exactly this: a branch to an address with bit 0 clear.
It is one of the more common bootloader bring-up faults and it looks baffling until you know
the rule.</p>

<h3>Reading a fault dump</h3>
<p>With the model above, a register dump becomes readable. The PC tells you which instruction
faulted, which you decode against the ELF. The LR tells you who called that function, or on
exception entry, which stack and mode to return to. R0 to R3 usually hold the arguments,
because that is what the calling convention says.</p>
<p>That last point is worth internalising: the ABI says R0 to R3 carry the first four arguments
and the return value comes back in R0. So a fault dump often shows you the arguments that
caused it.</p>
`,
quiz: [
{ q: "Which stack pointer does an exception handler always use?",
o: ["PSP", "MSP", "Whichever thread mode was using", "It depends on CONTROL"],
a: 1, why: "Handler mode is always privileged and always uses MSP. That separation is what lets an RTOS give tasks their own PSP stacks without a task overflow taking out interrupt handling." },
{ q: "Why must the address in a function pointer have bit 0 set?",
o: ["For alignment", "It signals Thumb state, and Cortex-M has no other state", "It marks the end of the vector table", "It is a parity bit"],
a: 1, why: "The encoding is inherited from cores that could switch between ARM and Thumb. Cortex-M only has Thumb, so the bit must be 1 always. Constructing an address by hand and getting an even value gives a UsageFault with INVSTATE set." },
{ q: "What does R14 hold during normal execution?",
o: ["The stack pointer", "The return address of the current call", "The exception number", "The condition flags"],
a: 1, why: "It is the link register. On exception entry it holds EXC_RETURN instead, which encodes which stack and mode to return to rather than a real address." },
{ q: "Under the ARM calling convention, where do the first four arguments live?",
o: ["On the stack", "R0 to R3", "R4 to R7", "In memory pointed to by R12"],
a: 1, why: "R0 to R3 carry the first four arguments and R0 carries the return value. This is why a fault register dump often shows you the arguments that caused the fault." }
],
interview: {
q: "A board hard faults immediately after your bootloader jumps to the application. Where do you start?",
a: "First I would read the fault status registers rather than guess, because CFSR tells you the category straight away. If it is a UsageFault with INVSTATE set, that is almost certainly the Thumb bit: the address I branched to has bit 0 clear. That happens when you construct the entry point by hand rather than reading the reset vector out of the application's vector table, and the reset vector already has the bit set. The other candidates I would check in order are the vector table offset, because if VTOR still points at the bootloader's table then every interrupt dispatches into the wrong handlers, and the stack pointer, because the first word of the application's table is its initial MSP and the bootloader has to load it before branching. And I would check what state I left the peripherals in, since the application initialises from whatever it inherits, so an interrupt still enabled from the bootloader can fire before the application is ready for it."
}
},

{
id: "emb-cm-exceptions",
track: "Embedded C",
sub: "Cortex-M architecture",
title: "The exception model: stacking, EXC_RETURN and tail-chaining",
mins: 26,
body: `
<p>An interrupt on Cortex-M does a surprising amount in hardware, and knowing what it does is
the difference between reading a fault dump and guessing at one.</p>

<h3>What the core does before your handler runs</h3>
<p>It pushes eight registers onto the current stack, all by itself:</p>

<svg class="fig" viewBox="0 0 680 496" role="img" aria-label="The Cortex-M exception stack frame: eight registers pushed automatically on exception entry">
<rect class="bx" x="40" y="60" width="180" height="48" rx="4"/>
<text class="th" x="56" y="82">Higher addresses</text>
<text class="ts" x="56" y="100">the stack grows down</text>
<rect class="bx" x="250" y="60" width="180" height="38" rx="4"/>
<text class="th" x="266" y="85">xPSR</text>
<text class="ts" x="444" y="85">SP + 0x1C</text>
<rect class="bx" x="250" y="100" width="180" height="38" rx="4"/>
<text class="th" x="266" y="125">PC</text>
<text class="ts" x="444" y="125">SP + 0x18</text>
<rect class="bx" x="250" y="140" width="180" height="38" rx="4"/>
<text class="th" x="266" y="165">LR</text>
<text class="ts" x="444" y="165">SP + 0x14</text>
<rect class="bx" x="250" y="180" width="180" height="38" rx="4"/>
<text class="th" x="266" y="205">R12</text>
<text class="ts" x="444" y="205">SP + 0x10</text>
<rect class="bx" x="250" y="220" width="180" height="38" rx="4"/>
<text class="th" x="266" y="245">R3</text>
<text class="ts" x="444" y="245">SP + 0x0C</text>
<rect class="bx" x="250" y="260" width="180" height="38" rx="4"/>
<text class="th" x="266" y="285">R2</text>
<text class="ts" x="444" y="285">SP + 0x08</text>
<rect class="bx" x="250" y="300" width="180" height="38" rx="4"/>
<text class="th" x="266" y="325">R1</text>
<text class="ts" x="444" y="325">SP + 0x04</text>
<rect class="bxa" x="250" y="340" width="180" height="38" rx="4"/>
<text class="th" x="266" y="365">R0</text>
<text class="ts" x="444" y="365">SP + 0x00</text>
<rect class="bxa" x="40" y="330" width="180" height="48" rx="4"/>
<text class="th" x="56" y="352">SP on entry</text>
<text class="ts" x="56" y="370">points at R0</text>
<rect class="bx" x="40" y="400" width="600" height="76" rx="4"/>
<text class="th" x="56" y="424">The core does this in hardware</text>
<text class="ts" x="56" y="444">R0 to R3, R12, LR, PC and xPSR are exactly the registers the C calling</text>
<text class="ts" x="56" y="462">convention lets a function clobber, so a plain C function can be a handler</text>
</svg>
<p class="figcap">The stacked frame. Your handler can read it, which is what makes a useful
fault handler possible.</p>

<p>The choice of registers is not arbitrary. R0 to R3, R12, LR, PC and xPSR are precisely the
caller-saved registers under the ARM calling convention: the ones a C function is already
allowed to destroy. So a plain C function is a legal interrupt handler with no assembly wrapper
and no <code>__attribute__((interrupt))</code>. If the handler happens to use R4 to R11, the
compiler saves them itself as it would in any function.</p>

<h3>EXC_RETURN</h3>
<p>On entry the core puts a magic value in LR instead of a return address. It is not an address
at all: the top bits are all ones, and the low bits encode how to return.</p>
<pre>0xFFFFFFF1   return to handler mode, MSP
0xFFFFFFF9   return to thread mode,  MSP
0xFFFFFFFD   return to thread mode,  PSP</pre>
<p>Branching to that value is what triggers the unstacking. So a handler returns with an
ordinary <code>bx lr</code>, and the core recognises the pattern.</p>
<p>The practical use is in a fault handler: bit 2 of EXC_RETURN tells you which stack the frame
is on, so you know where to look for the faulting PC.</p>
<pre>void hard_fault_handler_c(uint32_t *frame)
{
    uint32_t pc  = frame[6];      /* the faulting instruction */
    uint32_t psr = frame[7];
    /* decode pc against the ELF with addr2line */
}</pre>

<h3>Tail-chaining</h3>
<p>If a second exception is pending when the first handler returns, the core does not unstack
and immediately restack the same eight registers. It skips both and goes straight into the next
handler.</p>
<p>That is roughly six cycles instead of about twenty-four, and it is invisible to your code.
It matters because it means back-to-back interrupts are much cheaper than the naive
calculation, which changes the arithmetic when you are working out whether a load is
sustainable.</p>

<h3>Late arrival</h3>
<p>If a higher priority exception arrives while the core is still stacking for a lower one, the
core switches targets and runs the higher one first, reusing the stacking already done. Again
free, again invisible.</p>

<h3>The FPU wrinkle</h3>
<p>On a part with an FPU there are seventeen more registers that might need saving. Stacking
them on every interrupt would be expensive, so the core uses <b>lazy stacking</b>: it reserves
the space but does not fill it, and only actually saves the FPU registers if the handler turns
out to use one.</p>
<p>Two consequences. Your stack frame is 104 bytes rather than 32 whenever the FPU context is
active, which matters when sizing stacks. And a handler that uses a float pays a one-off
cost the first time, which shows up as jitter rather than a constant.</p>

<h3>Escalation</h3>
<p>A configurable fault that cannot be taken, because its handler is disabled or because it
occurred inside a handler of equal or higher priority, escalates to <b>HardFault</b>. The
FORCED bit in HFSR tells you this happened, and the real reason is still in CFSR.</p>
<p>So "it hard faults" often means a MemManage or BusFault that had nowhere to go. Enabling the
individual fault handlers in SHCSR during development gives you a much more specific answer.</p>
`,
quiz: [
{ q: "Why can a plain C function serve as a Cortex-M interrupt handler?",
o: ["The compiler adds a special prologue", "The core stacks exactly the caller-saved registers the C ABI allows a function to clobber", "Handlers do not use registers", "It cannot, you need an assembly wrapper"],
a: 1, why: "R0 to R3, R12, LR, PC and xPSR are the caller-saved set. Anything else the handler touches, the compiler saves as it would in any function. This is why Cortex-M needs no interrupt attribute." },
{ q: "What is in LR when a handler starts?",
o: ["The return address", "EXC_RETURN, encoding which mode and stack to return to", "The exception number", "Zero"],
a: 1, why: "It is a magic value with the top bits set, not an address. Branching to it triggers unstacking. Bit 2 tells a fault handler which stack holds the frame, which is how you find the faulting PC." },
{ q: "What does tail-chaining avoid?",
o: ["Running the second handler", "Unstacking and immediately restacking the same eight registers", "Priority checks", "Saving the FPU"],
a: 1, why: "Back-to-back exceptions cost around six cycles between handlers rather than a full unstack plus restack. It makes sustained interrupt load cheaper than the naive arithmetic suggests." },
{ q: "The HFSR FORCED bit is set. What does that tell you?",
o: ["The fault was a genuine HardFault", "A configurable fault escalated because it could not be taken", "The debugger caused it", "The vector table is corrupt"],
a: 1, why: "A MemManage, BusFault or UsageFault escalates when its handler is disabled or when it happens inside a handler of equal or higher priority. The real cause is still in CFSR." }
],
interview: {
q: "Walk me through what you would put in a fault handler on a product that has to be diagnosable from the field.",
a: "The handler needs to capture the stacked frame first, so I would have a small assembly shim that works out from bit 2 of EXC_RETURN whether the frame is on MSP or PSP, puts that pointer in R0, and calls a C function. From the frame I take the stacked PC, which is the faulting instruction, and the stacked LR, which gives me some idea of the call path. Then the fault status registers: CFSR for the category, and BFAR or MMFAR for the offending address when the corresponding valid bit is set, because those registers only mean something when the valid bit says so. I would also check the FORCED bit in HFSR, since a plain HardFault is usually an escalated MemManage or BusFault and the specific cause is more useful. All of that goes into a small struct in a RAM region that survives reset, then I reset deliberately rather than sitting in a loop, and on the next boot the firmware reports it. And I would archive the ELF for every release, because a stacked PC is a bare number without the symbols from that exact build, and decoding against a slightly different binary gives you a confident answer pointing at the wrong function."
}
},

{
id: "emb-cm-nvic",
track: "Embedded C",
sub: "Cortex-M architecture",
title: "NVIC, priorities and masking",
mins: 25,
body: `
<p>The NVIC is the block that decides which interrupt runs next. Three things about it surprise
people, and all three cause real bugs.</p>

<h3>Lower number means more urgent</h3>
<p>Priority 0 is the highest configurable priority and preempts priority 5. This is backwards
from most people's intuition and it is worth saying out loud when you configure a system.</p>

<h3>Not all the bits are there</h3>
<p>The priority register is eight bits wide, but silicon only implements the <b>upper</b> few.
Three bits is common, giving eight distinct levels. The rest read as zero and are ignored.</p>
<pre>/* on a part with 3 priority bits implemented */
NVIC_SetPriority(USART1_IRQn, 0);   /* stored as 0x00 */
NVIC_SetPriority(TIM2_IRQn,   1);   /* stored as 0x20 */
</pre>
<p>CMSIS shifts your value into the implemented bits for you, so passing 0 to 7 works as
expected. Writing the register directly does not, and a scheme designed around sixteen levels
on a part with eight silently collapses pairs of priorities into one.</p>
<p><code>__NVIC_PRIO_BITS</code> in the device header tells you how many you have. Check it
before designing a priority scheme rather than after.</p>

<h3>Preempt priority versus subpriority</h3>
<p>The implemented bits are split between a <b>preempt</b> field and a <b>subpriority</b> field,
and AIRCR.PRIGROUP decides where the split falls.</p>
<p>Only the preempt field decides preemption. Subpriority only breaks ties between exceptions
that are pending simultaneously; it never lets one interrupt preempt another.</p>
<p>This catches people who set sixteen distinct priorities, find that nothing preempts anything,
and cannot see why. Under an RTOS, do not touch PRIGROUP: FreeRTOS in particular expects all
bits to be preempt priority, and its configASSERT checks will tell you if you have changed it.</p>

<h3>Three ways to mask, and they are not equivalent</h3>
<ul>
<li><b>PRIMASK</b> blocks every configurable-priority interrupt. This is what
<code>__disable_irq()</code> sets. NMI and HardFault still get through.</li>
<li><b>BASEPRI</b> blocks everything with a priority number greater than or equal to the value
you write, and zero disables the masking entirely. This is the useful one: it lets you protect
a critical section from the RTOS and from low priority interrupts while leaving genuinely
urgent ones running.</li>
<li><b>FAULTMASK</b> blocks HardFault too. You almost never want this.</li>
</ul>
<p>BASEPRI is why an RTOS defines a "maximum syscall priority". Interrupts above that line are
never masked by the kernel, so they have low, bounded latency, and in exchange they are
forbidden from calling any RTOS API.</p>

<h3>Pending and active are different</h3>
<p>An interrupt is <b>pending</b> when the hardware has asserted it and it has not yet been
taken. It is <b>active</b> while its handler is running. Both are visible in NVIC registers, and
the distinction matters when debugging.</p>
<p>An interrupt that is pending and never becomes active means something is masking it: its
enable bit, PRIMASK, BASEPRI, or a higher priority handler that never returns. An interrupt
that goes active repeatedly and immediately means the peripheral condition was never
cleared.</p>
<p>Also worth knowing: clearing the source in the peripheral does not clear a pending bit that
has already latched in the NVIC, so a late clear can leave you with one spurious entry into
the handler.</p>
`,
quiz: [
{ q: "On Cortex-M, which preempts which?",
o: ["Priority 5 preempts priority 0", "Priority 0 preempts priority 5", "They never preempt", "Whichever was enabled first"],
a: 1, why: "Lower number means more urgent, which is the opposite of most people's intuition. Priority 0 is the highest configurable priority." },
{ q: "Your part implements 3 priority bits. What happens to a scheme using 16 levels?",
o: ["It works", "Pairs of priorities collapse into one, so things you expected to preempt do not", "The build fails", "Priorities invert"],
a: 1, why: "Only the upper implemented bits are stored. Check __NVIC_PRIO_BITS before designing the scheme, and use the CMSIS setter, which shifts your value into place for you." },
{ q: "What does subpriority do?",
o: ["Decides preemption", "Breaks ties between simultaneously pending exceptions only", "Sets the vector address", "Masks lower priorities"],
a: 1, why: "Only the preempt field causes preemption. Subpriority never lets one interrupt preempt another, which is why a scheme with many distinct priorities can appear to do nothing." },
{ q: "Why is BASEPRI more useful than PRIMASK for a critical section?",
o: ["It is faster", "It masks only interrupts at or below a chosen priority, leaving urgent ones running", "It also masks HardFault", "It is required by CMSIS"],
a: 1, why: "PRIMASK is all or nothing. BASEPRI is what lets an RTOS protect its data structures while leaving high priority interrupts with bounded latency, in exchange for those interrupts being forbidden from calling RTOS APIs." }
],
interview: {
q: "How would you assign interrupt priorities on a system with a motor control loop, a UART console and a BLE stack?",
a: "First I would find out how many priority bits the part actually implements, because designing sixteen levels on a part with eight silently collapses pairs and you get preemption that does not happen. Then I would assign by deadline rather than by importance, which is essentially rate monotonic reasoning: the motor loop has the tightest deadline so it gets the most urgent priority, meaning the lowest number. The BLE stack usually comes with a vendor requirement about its own priorities and I would respect that rather than fight it. The console gets the least urgent, because nothing bad happens if a character is late. If there is an RTOS I would keep everything that calls kernel APIs at or below the maximum syscall priority, and I would consider putting the motor loop above that line so the kernel never masks it, accepting that it then cannot use any RTOS call and has to communicate through something lock-free. I would also leave PRIGROUP alone so all the bits are preempt priority. And I would measure rather than assume: the DWT cycle counter on the handler entry and exit, worst case, under load."
}
},

{
id: "emb-cm-systick",
track: "Embedded C",
sub: "Cortex-M architecture",
title: "SysTick, PendSV and how a context switch actually happens",
mins: 24,
body: `
<p>Every Cortex-M has a small timer and two exceptions that exist specifically so an RTOS can be
written portably. Understanding them makes the kernel stop being magic.</p>

<h3>SysTick</h3>
<p>A 24-bit down counter in the core rather than in the vendor's peripheral block, so it is in
the same place on every Cortex-M. It counts down to zero, fires its exception, reloads, and
repeats.</p>
<p>That is what an RTOS uses for its tick. Three practical points:</p>
<ul>
<li>It is 24 bits, so at 168 MHz the longest period is about 100 ms. For anything longer you
need a vendor timer.</li>
<li>It stops in most sleep modes, which is why tickless idle needs a separate always-on timer
such as an RTC.</li>
<li>Reading the count clears the COUNTFLAG, so a stray read while debugging can lose an
overflow.</li>
</ul>

<h3>SVC</h3>
<p>A synchronous exception raised by the <code>svc</code> instruction. It is how unprivileged
code asks the kernel to do something privileged, exactly like a system call on a desktop.</p>
<p>The immediate value in the instruction says which service is wanted, and the handler reads it
back out of the instruction stream using the stacked PC. Most bare metal firmware never uses
it. It becomes relevant the moment you run tasks unprivileged.</p>

<h3>PendSV, and why it exists</h3>
<p>PendSV is an exception with no hardware source: software sets its pending bit and it runs
when nothing more urgent is left. It is conventionally set to the <b>lowest</b> priority in the
system, and that is the entire trick.</p>
<p>Consider what a context switch has to do: save one task's registers, pick another, restore
its registers. Doing that inside the SysTick handler would be wrong, because a device interrupt
could arrive mid-switch, and returning from it would land in a half-switched state.</p>
<p>So the tick handler does not switch. It decides a switch is needed and pends PendSV:</p>
<pre>void SysTick_Handler(void)
{
    if (a_higher_priority_task_is_ready()) {
        SCB-&gt;ICSR = SCB_ICSR_PENDSVSET_Msk;   /* run it later */
    }
}</pre>
<p>Because PendSV is the lowest priority, it cannot run until every other pending handler has
finished. The switch therefore happens at a point where no other exception is in progress, and
tail-chaining means the transition from the tick handler into PendSV costs almost nothing.</p>

<h3>What the switch does</h3>
<p>The core has already stacked eight registers. PendSV saves the other eight, R4 to R11, stores
the task's stack pointer in its control block, loads the next task's stack pointer, pops R4 to
R11 from that stack, and returns. The hardware unstacks the remaining eight into the new
context.</p>
<p>So the work splits neatly: hardware handles the caller-saved half, the kernel handles the
callee-saved half. That is why every RTOS port for Cortex-M has a PendSV handler in assembly and
why it is only around twenty instructions.</p>

<h3>What this explains</h3>
<p>A few things that otherwise look arbitrary:</p>
<ul>
<li>Why <code>portYIELD_FROM_ISR</code> exists. It pends PendSV so the switch happens on the way
out of your handler rather than at the next tick, which can be the difference between meeting
and missing a deadline.</li>
<li>Why an RTOS insists PendSV is at the lowest priority. Put it anywhere else and it can
preempt a device handler mid-flight.</li>
<li>Why tickless idle is a separate feature. SysTick stops in sleep, so staying asleep for a
hundred ticks requires a different timer and a correction to the tick count on wake.</li>
</ul>
`,
quiz: [
{ q: "Why is PendSV set to the lowest priority?",
o: ["To save power", "So the context switch cannot run while any other exception is still in progress", "Because it is slow", "CMSIS requires it"],
a: 1, why: "A switch that happened mid-handler could return into a half-switched state. Lowest priority guarantees every pending handler has finished first, and tail-chaining makes the transition nearly free." },
{ q: "How wide is the SysTick counter?",
o: ["16 bits", "24 bits", "32 bits", "It varies by vendor"],
a: 1, why: "24 bits, which at typical clock rates caps the period at roughly 100 ms. It also lives in the core rather than the vendor peripheral block, which is what makes RTOS ports portable." },
{ q: "In a context switch, which registers does the kernel save, as opposed to the hardware?",
o: ["All sixteen", "R4 to R11, the callee-saved half", "R0 to R3 only", "None, hardware does it all"],
a: 1, why: "The core stacks R0 to R3, R12, LR, PC and xPSR automatically. PendSV saves the rest. That split is why an RTOS PendSV handler is only about twenty instructions." },
{ q: "Why does tickless idle need a timer other than SysTick?",
o: ["SysTick is too fast", "SysTick stops in most sleep modes", "SysTick is 24 bits", "It does not"],
a: 1, why: "Both the width and the sleep behaviour matter, but stopping in sleep is the blocker: to stay asleep across many ticks you need something always-on, such as an RTC, plus a correction to the tick count on wake." }
],
interview: {
q: "Explain how an RTOS switches tasks on Cortex-M.",
a: "The core does half the work already. On any exception entry it stacks eight registers, R0 to R3, R12, LR, PC and xPSR, which are the caller-saved set under the calling convention. So a switch only has to deal with the other eight, R4 to R11. The tick handler itself does not switch. It decides whether a switch is needed and sets the PendSV pending bit, and PendSV sits at the lowest priority in the system so it cannot run until every other pending exception has finished. That matters because switching inside a handler could leave you returning into a half-switched context, and tail-chaining means going from the tick handler into PendSV costs about six cycles rather than a full unstack and restack. The PendSV handler itself pushes R4 to R11, stores the stack pointer into the current task's control block, loads the next task's stack pointer, pops R4 to R11 from that stack and returns, and the hardware unstacks the rest into the new context. It is around twenty instructions of assembly. It also explains portYIELD_FROM_ISR: that pends PendSV so the switch happens on the way out of your interrupt rather than waiting for the next tick."
}
},

{
id: "emb-cm-memory",
track: "Embedded C",
sub: "Cortex-M architecture",
title: "The memory map, memory types and barriers",
mins: 26,
body: `
<p>Cortex-M fixes the memory map in the architecture rather than leaving it to the vendor. That
is why an address tells you something about what lives there.</p>

<h3>The regions worth remembering</h3>
<pre>0x00000000   Code      flash, and where the vector table starts after reset
0x20000000   SRAM
0x40000000   Peripheral vendor peripherals
0x60000000   External RAM
0xE0000000   Private Peripheral Bus: NVIC, SCB, SysTick, MPU, DWT, ITM</pre>
<p>The one to know cold is <b>0xE0000000</b>. Everything architectural lives there, in the same
place on every Cortex-M, which is why CMSIS can define <code>SCB-&gt;CFSR</code> once for all
vendors. A fault address in that range means you touched a core register you should not have,
often from unprivileged code.</p>
<p>0x20000000 for RAM and 0x40000000 for peripherals is worth recognising in a fault dump.
A faulting address of 0x00000000 or a small number is a null pointer dereference, or more often
a null pointer plus a struct offset, which is why the address is small but not zero.</p>

<h3>Memory types</h3>
<p>Three types, and the difference is what the hardware is permitted to do behind your back:</p>
<ul>
<li><b>Normal</b> memory, meaning flash and RAM. Accesses can be reordered, merged, and
speculatively performed. This is fine because reading RAM twice has no side effect.</li>
<li><b>Device</b> memory, meaning peripherals. No speculation, no merging, and accesses to the
same peripheral stay in order.</li>
<li><b>Strongly-ordered.</b> Nothing is reordered at all, and each access completes before the
next begins.</li>
</ul>
<p>The peripheral region is Device by default, which is why simple register writes on a Cortex-M
usually behave as written. It is also why <code>volatile</code> alone is enough far more often
here than on a large application processor, and why that habit stops working the moment you
move to something with a write buffer and a cache.</p>

<h3>The three barriers</h3>
<ul>
<li><b>DMB</b>, data memory barrier. Memory accesses before it are observed before those after
it. It does not wait for them to complete.</li>
<li><b>DSB</b>, data synchronisation barrier. Stronger: execution stops until every preceding
memory access has actually completed.</li>
<li><b>ISB</b>, instruction synchronisation barrier. Flushes the pipeline so instructions after
it are fetched again, after any preceding context-changing operation.</li>
</ul>
<p>The rule that covers most real cases: after changing something that affects how instructions
execute, use <b>DSB then ISB</b>.</p>
<pre>SCB-&gt;VTOR = new_table;
__DSB();      /* the write has actually landed */
__ISB();      /* refetch, so the change is in effect */</pre>
<p>That applies to writing VTOR, enabling or disabling the MPU, changing CONTROL, and enabling
or disabling the cache on an M7. Skipping them gives a fault a few instructions later that
appears to have nothing to do with the change.</p>

<h3>A disabling gotcha</h3>
<p>Clearing an interrupt's enable bit does not guarantee that an already-pending interrupt will
not still be taken, because the write may not have propagated. The correct sequence is to
disable, then DSB, then ISB. This is a genuinely obscure bug and it looks like an interrupt
firing after you switched it off.</p>

<h3>Bit-banding, and why you probably should not</h3>
<p>Cortex-M3 and M4 map the lowest megabyte of SRAM and of the peripheral region into alias
regions where each <b>word</b> corresponds to one <b>bit</b> of the original.</p>
<pre>/* set bit 3 at 0x20000000, atomically, no read-modify-write */
#define BB(addr, bit) \\
    (*(volatile uint32_t *)(0x22000000 + (((addr) - 0x20000000) * 32) + ((bit) * 4)))

BB(0x20000000, 3) = 1;</pre>
<p>The appeal is atomicity: it is a single store, so an interrupt cannot land in the middle the
way it can with <code>reg |= bit</code>.</p>
<p>The reasons not to reach for it: Cortex-M0, M0+ and M7 do not have it at all, so it is a
portability trap, and it makes the code substantially harder to read. Where you need an atomic
bit set, prefer the peripheral's own set and clear registers if it has them, and otherwise a
short critical section.</p>

<h3>Unaligned access</h3>
<p>Cortex-M3, M4 and M7 support unaligned word and halfword loads and stores. Cortex-M0 and M0+
do not, and fault.</p>
<p>Even where it is supported, it never applies to LDM, STM, LDRD or STRD, which the compiler
uses whenever it moves more than one word. That is the real reason packing a struct is
dangerous rather than merely slow: the compiler may generate a multi-word access to something
no longer aligned, and it faults.</p>
`,
quiz: [
{ q: "What lives at 0xE0000000?",
o: ["Vendor peripherals", "The Private Peripheral Bus: NVIC, SCB, SysTick, MPU, DWT", "External RAM", "The vector table"],
a: 1, why: "Everything architectural, in the same place on every Cortex-M. That is why CMSIS can define SCB->CFSR once for all vendors, and a fault address in that range means you touched a core register you should not have." },
{ q: "You have just written SCB->VTOR. What should follow?",
o: ["Nothing", "DSB then ISB", "Just ISB", "A critical section"],
a: 1, why: "DSB waits for the write to actually complete, ISB flushes the pipeline so the change takes effect. The same applies to enabling the MPU, changing CONTROL, and cache operations. Skipping them gives a fault a few instructions later that looks unrelated." },
{ q: "Why is bit-banding a portability trap?",
o: ["It is slow", "Cortex-M0, M0+ and M7 do not have it", "It needs privileged access", "It only works on peripherals"],
a: 1, why: "Only M3 and M4 implement it. Where you need an atomic bit set, prefer the peripheral's own set and clear registers, and otherwise a short critical section." },
{ q: "Unaligned access is supported on Cortex-M4. Which operations still fault?",
o: ["None", "LDM, STM, LDRD and STRD", "Byte accesses", "Peripheral accesses only"],
a: 1, why: "The multi-word instructions always require alignment, and the compiler emits them whenever it moves more than one word. That is why packing a struct is a correctness risk rather than just a performance one." }
],
interview: {
q: "When do you actually need a memory barrier on a Cortex-M?",
a: "Less often than on a big application processor, because the peripheral region is Device memory by default, so accesses to a peripheral are not reordered or merged and simple register writes behave as written. The cases where you do need one fall into two groups. First, after a context-changing operation: writing VTOR, enabling or disabling the MPU, changing CONTROL, or enabling the cache on an M7. There the rule is DSB then ISB, because DSB waits for the write to land and ISB flushes the pipeline so the change is actually in effect. Skipping them gives you a fault a few instructions later that looks completely unrelated to the change. There is also a specific case where disabling an interrupt needs DSB and ISB or you can still take an already-pending one, which looks like an interrupt firing after you turned it off. Second, DMA on a part with a cache or a write buffer, where you need a clean before the controller reads your buffer and an invalidate after it writes one, plus a barrier so the completion flag check is not reordered against the buffer access. And I would be clear that volatile is not a barrier: it is a compiler instruction and has no effect on the hardware at all."
}
},

{
id: "emb-cm-mpu",
track: "Embedded C",
sub: "Cortex-M architecture",
title: "The MPU: turning silent corruption into an immediate fault",
mins: 23,
body: `
<p>Most small firmware runs with every address writable by every line of code. A wild pointer
scribbles on something and the symptom appears somewhere else entirely, much later. The MPU is
how you stop that.</p>

<h3>What it is</h3>
<p>A small unit that divides the address space into a handful of regions, typically eight, each
with a base address, a size and a set of permissions. Any access that violates them raises a
MemManage fault at the instruction that did it.</p>
<p>Note what it is not. It does not translate addresses, so there are no virtual addresses and
no paging. It only permits or denies.</p>

<h3>The classic ARMv7-M constraints</h3>
<p>On Cortex-M0+, M3, M4 and M7 the region rules are restrictive and catch people out:</p>
<ul>
<li>Size must be a power of two, minimum 32 bytes.</li>
<li>The base address must be aligned to the size. A 4 kB region must start on a 4 kB
boundary.</li>
<li>Regions may overlap, and where they do, the <b>highest numbered</b> region wins.</li>
</ul>
<p>Those constraints mean the MPU configuration and the linker script have to be designed
together. Placing a task stack on an arbitrary address and then trying to protect it does not
work; the linker has to align it in the first place.</p>
<p>ARMv8-M, meaning Cortex-M23 and M33, replaces this with base and limit registers, so the
alignment restriction largely disappears. Worth knowing which you are on before you design
anything.</p>

<h3>The two things worth doing even on a small system</h3>
<p><b>Catch null pointer dereferences.</b> Make the first region cover address zero upward with
no access permitted. Then <code>p-&gt;field</code> on a null pointer faults immediately, at the
instruction that did it, rather than reading whatever is at the bottom of flash and carrying
on with a plausible wrong value.</p>
<p>This is worth doing on its own. On many parts address zero is a valid flash mapping, so a
null dereference currently succeeds and returns garbage.</p>
<p><b>Guard your stacks.</b> Place a small no-access region immediately below each task stack.
An overflow then faults at the moment it happens, instead of quietly corrupting whatever is
adjacent and producing a fault somewhere unrelated.</p>
<p>Compare that with the usual approach of checking a high water mark, which tells you after the
fact that you came close, or a pattern-based check, which only notices at the next context
switch. The MPU catches it at the instruction.</p>

<h3>Making it usable</h3>
<p>Enable the MemManage handler in SHCSR rather than letting it escalate to HardFault, and read
MMFAR for the offending address, but only when MMARVALID is set in CFSR. Without that check you
will read a stale address and chase the wrong thing.</p>
<pre>SCB-&gt;SHCSR |= SCB_SHCSR_MEMFAULTENA_Msk;

/* in the handler */
if (SCB-&gt;CFSR &amp; SCB_CFSR_MMARVALID_Msk) {
    uint32_t bad = SCB-&gt;MMFAR;
}</pre>
<p>And remember DSB then ISB after enabling or disabling the MPU, or the change may not be in
effect when the next instruction runs.</p>

<h3>The honest trade</h3>
<p>Full task isolation, where every task runs unprivileged with its own region set, is real work:
the regions get reprogrammed on every context switch, drivers need care about which task owns
which peripheral, and shared buffers have to be granted deliberately.</p>
<p>The null-pointer region and the stack guards are a fraction of the effort and catch a large
share of the bugs. That is a good answer to give when someone asks whether you have used the
MPU: the interesting part is knowing which subset is worth the cost on a given project.</p>
`,
quiz: [
{ q: "What does the MPU do when a region's permissions are violated?",
o: ["Translates the address", "Raises a MemManage fault at the offending instruction", "Ignores the access", "Resets the part"],
a: 1, why: "It permits or denies; it never translates, so there is no paging and no virtual addressing. Faulting at the instruction is the whole value: it converts silent corruption into a located error." },
{ q: "On ARMv7-M, what must be true of a region's base address?",
o: ["Nothing", "It must be aligned to the region's size", "It must be in SRAM", "It must be 4-byte aligned"],
a: 1, why: "Size is a power of two, minimum 32 bytes, and the base must be aligned to that size. This is why the MPU configuration and the linker script have to be designed together. ARMv8-M uses base and limit registers instead and largely removes the restriction." },
{ q: "Two MPU regions overlap. Which one applies?",
o: ["The lower numbered", "The higher numbered", "The more restrictive", "It is undefined"],
a: 1, why: "The highest numbered region wins. That is deliberately useful: you can lay down a broad restrictive region and then carve exceptions out of it with higher numbers." },
{ q: "What is the cheapest genuinely useful thing to do with an MPU?",
o: ["Full task isolation", "A no-access region at address zero to catch null dereferences", "Disable the cache", "Protect the vector table"],
a: 1, why: "On many parts address zero is valid flash, so a null dereference currently succeeds and returns garbage. A no-access region there makes it fault at the instruction. Stack guard regions are the other high-value, low-effort use." }
],
interview: {
q: "Have you used the MPU, and what would you use it for?",
a: "I would separate what is cheap from what is expensive, because full task isolation and a couple of guard regions are very different amounts of work. The two things I think are worth doing on almost any project are a no-access region covering address zero, which turns a null pointer dereference into an immediate MemManage fault at the instruction that did it rather than a successful read of whatever is at the bottom of flash, and a small no-access region below each task stack, so an overflow faults at the moment it happens instead of silently corrupting whatever is adjacent and surfacing somewhere unrelated. Both are a handful of registers and they catch a large share of the bugs that are otherwise hardest to find. Full isolation, with tasks running unprivileged and regions reprogrammed on every context switch, is real work and I would want a reason for it, such as running third party code or a safety requirement. The practical constraint on the classic MPU is that regions must be a power of two in size and aligned to their own size, so the configuration and the linker script have to be designed together. And I would enable the MemManage handler rather than let it escalate to HardFault, and only trust MMFAR when MMARVALID is set."
}
},

{
id: "emb-cm-cmsis",
track: "Embedded C",
sub: "Cortex-M architecture",
title: "CMSIS, intrinsics and reading the disassembly",
mins: 22,
body: `
<p>CMSIS is the layer that makes core features look the same across vendors, and it is the layer
people use daily without knowing what it covers.</p>

<h3>What CMSIS actually is</h3>
<p>Mostly headers. <code>core_cm4.h</code> and friends define the core peripherals as structs at
their architectural addresses, so <code>SCB-&gt;CFSR</code> and <code>NVIC-&gt;ISER[0]</code>
mean the same thing on every vendor's part.</p>
<p>On top of that sit intrinsics, wrapping instructions that C has no syntax for:</p>
<pre>__disable_irq();      /* cpsid i   : set PRIMASK        */
__enable_irq();       /* cpsie i                        */
__DMB(); __DSB(); __ISB();
__WFI();              /* sleep until an interrupt       */
__get_PSP(); __set_PSP(sp);
__CLZ(x);             /* count leading zeros, one cycle */
__REV(x);             /* byte-reverse: endian swap      */</pre>
<p>The last two are worth knowing. <code>__CLZ</code> gives you a priority-encoder in one
instruction, which turns "find the highest set bit" from a loop into a single operation and is
how a scheduler picks the top ready task. <code>__REV</code> does an endian swap in one
instruction rather than four shifts and ORs.</p>
<p>The vendor then supplies a device header that includes the core one and adds their
peripherals, plus a startup file with the vector table and the reset handler. That is the whole
stack, and none of it is a framework.</p>

<h3>Why read disassembly at all</h3>
<p>Three situations where nothing else will do:</p>
<ul>
<li>A fault dump gives you a PC. Decoding it against the ELF tells you the line, and looking at
the surrounding instructions tells you what it was actually doing.</li>
<li>You suspect the compiler removed or reordered something, usually a missing
<code>volatile</code>.</li>
<li>You are counting cycles in an interrupt handler and need to know what it really costs.</li>
</ul>

<h3>The instructions you need to recognise</h3>
<p>You do not need to write Thumb assembly. You need to read about a dozen forms:</p>
<pre>LDR  r0, [r1]        load from the address in r1
LDR  r0, [r1, #4]    load from r1 + 4          (a struct field)
LDRB / LDRH          load byte / halfword      (uint8_t / uint16_t)
STR  r0, [r1]        store
LDM / STM            load or store several registers at once
MOV  r0, r1          register to register
MOVW / MOVT          build a 32-bit constant in two halves
ADD / SUB / AND / ORR / EOR / LSL / LSR
CMP  r0, #1          compare, sets the flags
B    label           branch
BEQ / BNE / BLT      branch if the flags say so
BL   label           branch and link: a function call
BX   lr              return
PUSH / POP           stack, and POP {pc} is also a return</pre>

<h3>Two things to look for specifically</h3>
<p><b>A missing volatile.</b> A polling loop that reads a register should show the LDR inside the
loop:</p>
<pre>.loop:
    ldr   r1, [r0]        &lt;-- the read is here, good
    tst   r1, #1
    beq   .loop</pre>
<p>If the LDR has moved above the label and the loop body is a bare <code>b .loop</code>, the
read was hoisted and you are missing a volatile. This is the fastest way to confirm that
diagnosis, and it takes ten seconds.</p>
<p><b>Unexpected library calls.</b> A <code>bl __aeabi_uidiv</code> means an integer division
that the part has no instruction for, which is far more expensive than it looks in C. A
<code>bl __aeabi_dadd</code> means double precision floating point, usually because a literal
was written <code>1.5</code> rather than <code>1.5f</code>, and on a part whose FPU is single
precision only that runs entirely in software.</p>
<p>That last one is a genuinely common performance bug and it is invisible in the source.</p>

<h3>How to get the disassembly</h3>
<pre>arm-none-eabi-objdump -d --source firmware.elf &gt; firmware.lst
arm-none-eabi-addr2line -e firmware.elf 0x080012a4</pre>
<p>The first interleaves source with instructions, which is the readable form. The second turns
a fault address into a file and line. Both need the ELF from that exact build, which is the
argument for archiving it with every release.</p>
`,
quiz: [
{ q: "What is CMSIS, mostly?",
o: ["A hardware abstraction framework", "Headers defining the core peripherals at their architectural addresses, plus intrinsics", "A build system", "An RTOS"],
a: 1, why: "It is why SCB->CFSR means the same on every vendor's part. The vendor adds a device header with their peripherals and a startup file. None of it is a framework." },
{ q: "What does __CLZ do, and why does it matter?",
o: ["Clears an interrupt", "Counts leading zeros in one instruction, which makes finding the highest set bit a single operation", "Clears the cache", "Sets the priority"],
a: 1, why: "It turns a search loop into one instruction, which is how a scheduler picks the highest priority ready task in constant time. __REV is the other one worth knowing: an endian swap in a single instruction." },
{ q: "In a disassembled polling loop, the LDR sits above the loop label and the body is just a branch. What does that mean?",
o: ["The compiler optimised correctly", "The read was hoisted out: the variable is missing volatile", "The loop is unrolled", "An interrupt is pending"],
a: 1, why: "The read happens once and the loop spins on a stale value. Checking the disassembly is the fastest way to confirm a missing volatile, and it takes about ten seconds." },
{ q: "You see bl __aeabi_dadd in a hot function. What is happening?",
o: ["An integer add", "Double precision floating point, often from writing 1.5 instead of 1.5f", "A DMA transfer", "An atomic operation"],
a: 1, why: "On a part whose FPU is single precision only, doubles run entirely in software. A missing f suffix on a literal promotes the whole expression, and it is invisible in the source." }
],
interview: {
q: "When do you drop to looking at the disassembly?",
a: "Three situations mainly. When I have a fault dump, because the stacked PC is just a number and addr2line against the ELF from that exact build turns it into a file and line, and reading the instructions around it tells me what it was actually doing. When I suspect the compiler has removed or reordered something, which is nearly always a missing volatile on a hardware register or an ISR-shared variable: in a polling loop you can see immediately whether the LDR is inside the loop or has been hoisted above it, and that takes about ten seconds to check against however long you would otherwise spend reasoning about it. And when I am counting cycles in an interrupt handler, where what matters is the instructions rather than the source. The other thing I look for is unexpected library calls. A bl to __aeabi_uidiv means a division the part has no instruction for, and a bl to one of the double precision routines usually means someone wrote 1.5 instead of 1.5f, which on a single precision FPU means the whole expression runs in software. Both are invisible in the source and both can dominate a hot path."
}
}

);
