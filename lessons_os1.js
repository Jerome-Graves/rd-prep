// Operating Systems track, batch 1: Fundamentals.
//
// Written deliberately as a bridge from bare metal. Everything here has a
// Cortex-M or FreeRTOS counterpart you already use, and the fastest way to hold
// it is to see the pair rather than learn the Linux half cold.
//
// Code samples use &lt; &gt; &amp; escapes inside <pre> blocks.

LESSONS.push(

{
id: "os-proc",
track: "Operating Systems",
sub: "Fundamentals",
title: "Processes and threads, from a FreeRTOS task",
mins: 20,
body: `
<p>You already write threads. A FreeRTOS task <b>is</b> a thread: a schedulable stream of
execution with its own stack, sharing everything else with its siblings. That is why two tasks
touching the same buffer need a mutex, and why a task that overruns its stack corrupts something
belonging to a different task.</p>

<p>A <b>process</b> is that, plus a private address space, plus the resources the kernel tracks
on its behalf: open file descriptors, a working directory, a user id, signal handlers.</p>

<svg class="fig" viewBox="0 0 680 330" role="img" aria-label="One process containing two threads that share code, globals and heap while each keeps its own stack, beside two separate processes that share nothing">
<rect class="bxa" x="24" y="30" width="290" height="40" rx="4"/>
<text class="th" x="40" y="56">One process, two threads</text>
<rect class="bx" x="24" y="80" width="290" height="150" rx="4"/>
<text class="ts" x="40" y="106">code, globals, heap, file descriptors</text>
<text class="ts" x="40" y="124">SHARED between both threads</text>
<rect class="bx" x="44" y="140" width="115" height="70" rx="4"/>
<text class="ts" x="58" y="164">thread 1</text>
<text class="ts" x="58" y="184">own stack</text>
<text class="ts" x="58" y="202">own registers</text>
<rect class="bx" x="179" y="140" width="115" height="70" rx="4"/>
<text class="ts" x="193" y="164">thread 2</text>
<text class="ts" x="193" y="184">own stack</text>
<text class="ts" x="193" y="202">own registers</text>
<text class="ts" x="24" y="256">a bad pointer in one corrupts the other</text>
<text class="ts" x="24" y="276">switching between them: just registers</text>

<rect class="bxa" x="366" y="30" width="290" height="40" rx="4"/>
<text class="th" x="382" y="56">Two processes</text>
<rect class="bx" x="366" y="80" width="138" height="150" rx="4"/>
<text class="ts" x="380" y="106">process A</text>
<text class="ts" x="380" y="126">own address</text>
<text class="ts" x="380" y="144">space</text>
<text class="ts" x="380" y="170">own heap</text>
<text class="ts" x="380" y="190">own fds</text>
<rect class="bx" x="518" y="80" width="138" height="150" rx="4"/>
<text class="ts" x="532" y="106">process B</text>
<text class="ts" x="532" y="126">own address</text>
<text class="ts" x="532" y="144">space</text>
<text class="ts" x="532" y="170">own heap</text>
<text class="ts" x="532" y="190">own fds</text>
<text class="ts" x="366" y="256">a bad pointer in A cannot reach B</text>
<text class="ts" x="366" y="276">switching: registers AND page tables</text>
</svg>

<h3>Why a Cortex-M has threads but not processes</h3>

<p>A private address space needs address translation, and address translation needs an
<b>MMU</b>. A Cortex-M does not have one. It has an MPU, which can forbid an access but cannot
give two pieces of code the same address meaning different memory. So on your parts there is one
address space, every pointer is a physical address, and "process" has nothing to attach to.</p>

<p>This is the whole answer to the interview question, and you can derive it from hardware you
already know.</p>

<h3>What it costs to switch</h3>

<ul>
<li><b>Thread to thread, same process.</b> Save registers, load registers, change the stack
pointer. This is exactly what your PendSV handler does.</li>
<li><b>Process to process.</b> All of that, plus swapping the page tables. The TLB then holds
translations for the wrong process, so it is flushed or tagged with an address space id. The
caches go cold. It is an order of magnitude dearer.</li>
</ul>

<h3>Talking, and the reason to choose one</h3>

<p>Threads share memory, so they communicate by writing to it, and that is why they need locks.
Processes share nothing by default, so they need <b>IPC</b>: pipes, sockets, message queues, or
shared memory they explicitly ask the kernel to map into both.</p>

<p>The decision is almost never about speed. It is about <b>blast radius</b>. A thread that
dereferences a null pointer takes down every thread in the process. A process that does it dies
alone, and something can restart it. That is why a browser puts each tab in its own process, and
why a robot might run its vision pipeline separately from its motion control.</p>

<p>On a Cortex-M you get the first behaviour whether you want it or not, which is why the MPU
stack guard matters so much there.</p>
`,
quiz: [
{ q: "What does a thread have of its own, and what does it share?",
o: ["Its own heap and its own globals, sharing only the code", "Its own stack and registers, sharing everything else", "Its own address space and file handles", "Nothing of its own; it shares all state"],
a: 1, why: "That sharing is exactly why two threads touching one variable need a mutex, and why a FreeRTOS task is a thread rather than a process." },
{ q: "Why can a Cortex-M run tasks but not processes?",
o: ["Its cores are far too slow to manage the bookkeeping", "It has no MMU, so there is no address translation", "FreeRTOS chose not to implement them", "Processes require more than one core"],
a: 1, why: "A private address space needs translation. The MPU can forbid an access but cannot make one address mean different memory for different code, so there is nothing for a process to be." },
{ q: "What makes a process switch dearer than a thread switch?",
o: ["It saves a much larger register set", "The page tables change, so the TLB and caches suffer", "The scheduler must run a considerably slower algorithm", "It has to flush every pending file write"],
a: 1, why: "Registers are the cheap part and both do it. Swapping address spaces invalidates cached translations and leaves the caches cold, which is where the order of magnitude goes." },
{ q: "What is the usual real reason to choose processes over threads?",
o: ["They are measurably faster to schedule and to switch", "Isolation: one crashing does not kill the others", "They consume noticeably less memory", "They are easier to write and debug"],
a: 1, why: "Processes are dearer on almost every axis. You pay that for blast radius, which is why a browser tab and a vision pipeline each get their own." }
],
interview: {
q: "What is the difference between a process and a thread?",
a: "A thread is a schedulable stream of execution with its own stack and registers, sharing code, globals, heap and file descriptors with the other threads beside it. A process is one or more threads plus a private address space and the resources the kernel tracks for it. I come at this from FreeRTOS, where a task is a thread: they share everything, which is exactly why two tasks touching one buffer need a mutex, and why a task overrunning its stack corrupts a different task rather than faulting cleanly. There are no processes on a Cortex-M because a private address space needs an MMU and the part only has an MPU, which can forbid an access but cannot translate one. On the cost side, a thread switch is registers and a stack pointer, which is what PendSV does; a process switch also swaps page tables, so the TLB is flushed or tagged and the caches go cold, and it is an order of magnitude dearer. But the reason to pick processes is almost never speed. It is isolation. A thread that dereferences null takes the whole process with it, and a process that does it dies alone and can be restarted, which is why a browser gives each tab its own and why you might separate a vision pipeline from motion control."
}
},

{
id: "os-vm",
track: "Operating Systems",
sub: "Fundamentals",
title: "Virtual memory, the MMU, and why bare metal has neither",
mins: 22,
body: `
<p>On your Cortex-M a pointer is an address on the bus. Dereference <code>0x20000100</code> and
the core drives exactly that onto the AHB. There is one address space, it is physical, and every
piece of code sees the same one.</p>

<p>Under Linux a pointer is a <b>virtual</b> address that means nothing to the memory until the
MMU translates it. Two processes can both hold <code>0x00400000</code> and be looking at
completely different RAM.</p>

<h3>How the translation works</h3>

<p>The address is split. The low bits are an offset inside a page, typically 4 kB, so 12 bits.
The high bits index page tables that the kernel maintains per process, and which end at a
<b>physical frame number</b>.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A virtual address splits into a page number that is translated through page tables into a physical frame number, and an offset that passes through unchanged">
<rect class="bxa" x="24" y="30" width="230" height="40" rx="4"/>
<text class="th" x="40" y="56">virtual address</text>
<rect class="bx" x="24" y="78" width="150" height="46" rx="4"/>
<text class="ts" x="38" y="106">page number</text>
<rect class="bx" x="178" y="78" width="76" height="46" rx="4"/>
<text class="ts" x="192" y="106">offset</text>
<rect class="bxa" x="300" y="78" width="140" height="46" rx="4"/>
<text class="th" x="316" y="106">page tables</text>
<line class="arr" x1="176" y1="101" x2="296" y2="101" marker-end="url(#arrow)"/>
<rect class="bxa" x="486" y="30" width="170" height="40" rx="4"/>
<text class="th" x="502" y="56">physical address</text>
<rect class="bx" x="486" y="78" width="94" height="46" rx="4"/>
<text class="ts" x="500" y="106">frame</text>
<rect class="bx" x="584" y="78" width="72" height="46" rx="4"/>
<text class="ts" x="598" y="106">offset</text>
<line class="arr" x1="442" y1="101" x2="482" y2="101" marker-end="url(#arrow)"/>
<line class="arr" x1="216" y1="126" x2="216" y2="160" marker-end="url(#arrow)"/>
<line class="arr" x1="216" y1="160" x2="620" y2="160"/>
<line class="arr" x1="620" y1="160" x2="620" y2="128" marker-end="url(#arrow)"/>
<text class="ts" x="300" y="182">the offset is never translated</text>
<text class="ts" x="24" y="216">The TLB caches recent translations. A miss walks the tables, which is why locality</text>
<text class="ts" x="24" y="236">matters and why a process switch that flushes the TLB is expensive.</text>
</svg>

<h3>What it buys</h3>

<ul>
<li><b>Isolation.</b> A process cannot name memory that is not mapped for it. This is the
enforcement behind everything in the previous lesson.</li>
<li><b>The illusion of contiguity.</b> A 100 MB allocation can be scattered across physical RAM
and still look like one block, so there is no fragmentation of the kind that kills a long-running
bare-metal heap.</li>
<li><b>Lazy everything.</b> <code>malloc</code> of 1 GB costs almost nothing until you touch it,
because pages are only backed when first written.</li>
<li><b>Copy on write.</b> <code>fork()</code> does not copy memory. Both processes share pages
marked read-only, and the copy happens per page, on the first write.</li>
</ul>

<h3>The page fault is not an error</h3>

<p>This is the piece people get wrong. A page fault means the MMU found no valid translation and
trapped to the kernel. Usually the kernel then does something perfectly normal: allocates the
page, reads it from disk, or performs the copy-on-write. Execution resumes. Only an access with
no legitimate mapping becomes <code>SIGSEGV</code>.</p>

<h3>Why this is a problem for real time</h3>

<p>A page fault has <b>unbounded</b> latency. It might be a microsecond, or it might be a disk
read. Everything you know about worst-case execution time stops holding. That is why real-time
Linux code calls <code>mlockall()</code> to pin its pages in RAM up front, and why hard real-time
work stays on a core with no demand paging at all.</p>

<h3>MPU versus MMU, since you know one of them</h3>

<table>
<tr><th></th><th>MPU (Cortex-M)</th><th>MMU (Cortex-A)</th></tr>
<tr><td>Translates addresses</td><td>No</td><td>Yes</td></tr>
<tr><td>Enforces permissions</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Granularity</td><td>A handful of regions</td><td>Pages, typically 4 kB</td></tr>
<tr><td>Enables processes</td><td>No</td><td>Yes</td></tr>
<tr><td>Costs</td><td>Almost nothing</td><td>Silicon, power, TLB misses</td></tr>
</table>

<p>Both let you catch a null dereference. Only one lets two programs disagree about what an
address means.</p>
`,
quiz: [
{ q: "What does the MMU actually do to an address?",
o: ["Checks the access permission granted on it", "Maps a virtual page to a physical frame", "Caches the memory contents at it", "Aligns it to the natural word size"],
a: 1, why: "Translation is the part an MPU cannot do. Permission checking happens in both, which is why the MPU can catch a null dereference but cannot give two processes separate address spaces." },
{ q: "A page fault occurs. What is the most likely cause?",
o: ["The program has dereferenced a null or stale pointer", "Something entirely routine, such as a first touch", "The physical memory has been exhausted", "The page tables have become corrupted"],
a: 1, why: "Demand paging, lazy allocation and copy-on-write all work by faulting deliberately. Only an access with no legitimate mapping turns into SIGSEGV." },
{ q: "Why does hard real-time code call mlockall()?",
o: ["To reserve the memory before others take it", "A page fault has unbounded latency", "It makes the memory accesses run faster", "The scheduler requires it for FIFO tasks"],
a: 1, why: "A fault might resolve in a microsecond or wait on a disk. That destroys any worst-case execution time you calculated, so the pages are pinned in RAM before the deadline-critical work starts." },
{ q: "What does fork() copy?",
o: ["The whole address space, duplicated immediately", "Nothing at first: pages are shared copy-on-write", "Only the stack and the registers", "The heap, but the code is shared"],
a: 1, why: "Both processes share the same physical pages marked read-only, and a copy is made per page on the first write. It is why fork is cheap and why exec straight after it wastes almost nothing." }
],
interview: {
q: "Explain virtual memory, and say why it does not exist on the parts you normally work with.",
a: "A virtual address means nothing to the memory until the MMU translates it. The low bits are an offset inside a page, usually 4 kB, and the high bits index per-process page tables that produce a physical frame number, with the TLB caching recent translations. That buys four things: isolation, because a process cannot name memory that is not mapped for it; the illusion of contiguity, so a large allocation can be scattered physically; lazy allocation, so a big malloc costs nothing until touched; and copy-on-write, which is why fork does not actually copy anything. The thing people get wrong is that a page fault is usually not an error. It is how demand paging and copy-on-write are implemented, and the kernel resolves it and resumes. Only an access with no legitimate mapping becomes a segfault. It does not exist on a Cortex-M because the part has an MPU rather than an MMU. The MPU enforces permissions on a handful of regions, so it can catch a null dereference or guard a stack, but it does not translate, so every pointer is a physical address and there is one address space. That is also why virtual memory is awkward for hard real time: a page fault has unbounded latency, so anything with a deadline calls mlockall to pin its pages first."
}
},

{
id: "os-mode",
track: "Operating Systems",
sub: "Fundamentals",
title: "User mode, kernel mode and the system call",
mins: 18,
body: `
<p>You have already met this, on a Cortex-M. The <b>CONTROL</b> register decides whether thread
mode is privileged, unprivileged code cannot touch the NVIC, and <code>SVC</code> is the
instruction that asks privileged code to do something on your behalf. Linux is the same idea with
more consequence.</p>

<h3>Two worlds</h3>

<ul>
<li><b>User mode.</b> Your application. Cannot touch hardware, cannot see other processes'
memory, cannot change page tables. Enforced by the CPU, not by convention.</li>
<li><b>Kernel mode.</b> The kernel and its drivers. Full access to everything.</li>
</ul>

<p>The boundary is the point of the whole design. A bug in your program cannot take the machine
down, because your program was never given the means. On bare metal there is no boundary, every
line you write runs privileged, and a wild pointer can reprogram the clock tree.</p>

<h3>Crossing it: the system call</h3>

<p>You cannot call into the kernel. You <b>trap</b> into it, at an entry point the kernel chose.
The sequence:</p>

<ol>
<li>Userspace puts a call number and arguments in registers.</li>
<li>It executes a trap instruction, <code>syscall</code> on x86-64 or <code>svc</code> on ARM.
The same instruction you use for an RTOS kernel call.</li>
<li>The CPU switches to kernel mode and jumps to one fixed handler.</li>
<li>The kernel checks the number, validates every pointer argument, does the work, returns.</li>
<li>The CPU drops back to user mode with a result in a register.</li>
</ol>

<p>That validation step is why a syscall is not just a function call. Everything from userspace is
hostile until proven otherwise, which is why the kernel uses <code>copy_from_user()</code> rather
than dereferencing a pointer you handed it.</p>

<h3>What it costs, and what people do about it</h3>

<p>Hundreds of cycles for the mode switch alone, plus the cache and branch-predictor damage, plus
whatever the Spectre and Meltdown mitigations added. That cost shapes real APIs:</p>

<ul>
<li><code>read()</code> a byte at a time is catastrophic, so stdio buffers and calls it in
4 kB chunks.</li>
<li><code>epoll</code> exists so one syscall can report on thousands of sockets.</li>
<li>The <b>vDSO</b> maps a small piece of kernel code into every process so that
<code>gettimeofday()</code> needs no trap at all.</li>
<li>A futex takes the uncontended lock entirely in userspace and only traps when it must
actually wait.</li>
</ul>

<h3>The bit worth saying out loud</h3>

<p>"Library call" and "system call" are not the same thing. <code>printf</code> is a library
function that eventually performs a <code>write</code> syscall. <code>malloc</code> is a library
function that only occasionally performs an <code>mmap</code> or <code>brk</code>. Which is why
<code>strace</code> shows you far fewer lines than your code has function calls, and why it is
the fastest way to find out what a program is really doing.</p>
`,
quiz: [
{ q: "How does userspace get the kernel to do something?",
o: ["It calls the relevant kernel function directly", "It traps, at an entry point the kernel chose", "It writes to a shared memory mailbox", "It raises an interrupt on the timer"],
a: 1, why: "A direct call would let userspace enter the kernel wherever it liked. The trap instruction enters at one fixed handler, which is what makes the boundary enforceable." },
{ q: "Why does the kernel use copy_from_user() rather than dereferencing your pointer?",
o: ["It is faster on a modern processor", "Every userspace argument is hostile until checked", "That pointer belongs to a completely different address space", "It keeps the caches from being flushed"],
a: 1, why: "The pointer might be null, unmapped, or point into the kernel's own memory. Validating it is most of what makes a syscall dearer than a function call." },
{ q: "What is the vDSO for?",
o: ["Loading shared libraries more quickly", "Serving some calls with no trap at all", "Isolating drivers from the main kernel", "Verifying the signature on a binary"],
a: 1, why: "Kernel code mapped into every process, so something as common as gettimeofday costs a function call rather than a mode switch." },
{ q: "Is printf a system call?",
o: ["Yes, printf traps directly into the kernel itself", "No, it is a library function that calls write", "Only when the output is a terminal", "Only when the stream is unbuffered"],
a: 1, why: "It formats and buffers in userspace, then performs a write syscall when the buffer fills or the stream is flushed. This is why strace shows far fewer lines than your code has calls." }
],
interview: {
q: "What happens when a program makes a system call?",
a: "It cannot call the kernel, it traps into it. Userspace puts a call number and arguments in registers and executes a trap instruction, syscall on x86-64 or svc on ARM, which is the same instruction an RTOS uses for a kernel call. The CPU switches to kernel mode and enters at one fixed handler, so userspace never chooses where it lands. The kernel then validates everything, particularly pointer arguments, which is why it uses copy_from_user rather than dereferencing what you handed it: the pointer could be null, unmapped, or aimed at the kernel's own memory. It does the work and returns to user mode with a result in a register. The cost is hundreds of cycles plus cache and predictor damage, and that cost visibly shapes the API surface: stdio buffers so read is not called per byte, epoll exists so one call covers thousands of sockets, the vDSO maps kernel code into the process so gettimeofday needs no trap, and a futex handles the uncontended case entirely in userspace. I would also separate library calls from syscalls, since printf is a library function that eventually performs write, which is why strace shows so much less than the source suggests. The Cortex-M version of all this is the CONTROL register and SVC, so the mechanism is familiar; what is different is that on bare metal every line runs privileged, so there is no boundary to protect you from your own pointer."
}
}

);
