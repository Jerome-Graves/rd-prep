// Operating Systems lessons, fourth section: running Linux in a product.
//
// The track already has Fundamentals, Bare metal vs Linux and Embedded Linux.
// These sit alongside them under their own heading.

LESSONS.push(

{
id: "os-rt",
track: "Operating Systems",
sub: "Running Linux in a product",
title: "Real-time Linux: what PREEMPT_RT does and does not give you",
mins: 22,
body: `
<p>Stock Linux is a throughput operating system. It is willing to delay any individual task in
order to get more total work done, and that is exactly the wrong trade when something has a
deadline. Real-time Linux changes the trade rather than making the kernel faster.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A latency distribution with a long tail under a stock kernel, against a tighter bounded distribution under a real-time kernel">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">what matters is the tail, not the average</text>

<line class="ln" x1="70" y1="200" x2="630" y2="200"/>
<text class="ts" x="560" y="222">latency</text>

<line class="ln" x1="120" y1="200" x2="150" y2="90"/>
<line class="ln" x1="150" y1="90" x2="200" y2="180"/>
<line class="ln" x1="200" y1="180" x2="600" y2="196"/>
<text class="ts" x="380" y="176">stock kernel: long tail, occasional milliseconds</text>

<line class="ln" x1="120" y1="200" x2="145" y2="118"/>
<line class="ln" x1="145" y1="118" x2="175" y2="200"/>
<text class="ts" x="180" y="112">real-time kernel: bounded</text>
</svg>

<p><b>PREEMPT_RT</b> makes almost all of the kernel preemptible. Spinlocks become sleeping
mutexes, interrupt handlers move into kernel threads that can themselves be preempted, and the
result is that a high-priority task can interrupt nearly anything. It also brings priority
inheritance on those mutexes, which prevents the unbounded priority inversion that would
otherwise defeat the whole exercise.</p>

<p>What you get is <b>bounded worst-case latency</b>, typically tens of microseconds on decent
hardware. What you do not get is more throughput; the overhead of all that preemptibility
usually costs a few percent. Real-time means predictable, not fast, and confusing the two is the
commonest misunderstanding in the area.</p>

<p>Getting the benefit requires work beyond installing the kernel. The task must run under a
real-time scheduling policy at a sensible priority. Its memory must be locked so a page fault
cannot introduce a delay. Its stack should be pre-faulted for the same reason. And it must not
call anything that can block unpredictably, which rules out ordinary allocation and most file
I/O in the hot path.</p>

<p>The hardware and configuration matter as much as the kernel. System management interrupts on
x86, power management transitions, and CPU frequency scaling all introduce latency the kernel
cannot control. Isolating a core, pinning the task to it and steering interrupts away is standard
practice, and it converts a shared machine into something closer to a dedicated one.</p>

<p>The measurement to insist on is <b>cyclictest under load</b>. An idle machine tells you
nothing; the number that matters is the maximum latency while the system is doing everything it
will do in service, over hours rather than minutes, because the tail is what you are buying.</p>
`,
quiz: [
{ q: "What does PREEMPT_RT actually provide?",
o: ["Higher throughput for real-time tasks", "Bounded worst-case latency, at a small throughput cost", "Faster interrupt handling in every case", "Guaranteed execution within one millisecond"],
a: 1, why: "Real-time means predictable rather than fast. The preemptibility costs a few percent of throughput, which is the trade you are making deliberately." },
{ q: "Why must a real-time task lock its memory?",
o: ["To prevent other processes reading it", "A page fault would introduce an unbounded delay", "Locked memory is allocated from a faster region", "The scheduler requires it for real-time policies"],
a: 1, why: "Demand paging is exactly the kind of unpredictable delay real-time work cannot tolerate, so the pages must be resident and pre-faulted." },
{ q: "What does priority inheritance on RT mutexes prevent?",
o: ["Deadlock between two tasks", "Unbounded priority inversion", "Starvation of low-priority tasks", "Cache thrashing between cores"],
a: 1, why: "Without it a low-priority lock holder preempted by a medium task blocks the high-priority task indefinitely, which defeats the whole exercise." },
{ q: "How should real-time latency be measured?",
o: ["Average latency on an idle system", "Maximum latency under realistic load, over hours", "The scheduler's context switch time", "Interrupt latency measured with a scope"],
a: 1, why: "An idle machine tells you nothing, because the tail is what you are buying. Cyclictest under full load for hours is the standard check." }
],
interview: {
q: "A customer wants a one millisecond control loop on embedded Linux. Is that reasonable?",
a: "It is achievable, but only if the requirement is stated as a bounded worst case rather than an average, and only with work beyond installing a kernel. I would start by pinning down what one millisecond means: whether an occasional overrun is tolerable or whether it is a hard deadline, because that changes the engineering enormously. Assuming it is hard, I would use a PREEMPT_RT kernel, which makes almost all of the kernel preemptible by turning spinlocks into sleeping mutexes and moving interrupt handlers into schedulable threads, and which brings priority inheritance so a low-priority lock holder cannot block my task indefinitely. Typical worst-case latencies on decent hardware are tens of microseconds, so a millisecond has real margin. But the kernel alone is not enough. The task has to run under a real-time scheduling policy at an appropriate priority, its memory has to be locked and its stack pre-faulted so a page fault cannot introduce a delay, and the hot path must not call anything that blocks unpredictably, which rules out ordinary allocation and most file I/O. I would isolate a core, pin the task to it and steer interrupts elsewhere, and I would disable frequency scaling and the deeper idle states, because those transitions cost latency the kernel cannot control. Then I would measure it properly with cyclictest under realistic load for hours rather than minutes, because the whole point is the tail. And I would be honest that real-time means predictable rather than fast: the preemptibility costs a few percent of throughput, and if the customer also wants maximum throughput those are different requirements pulling in opposite directions."
}
},

{
id: "os-fs",
track: "Operating Systems",
sub: "Running Linux in a product",
title: "Filesystems, flash, and surviving power loss",
mins: 22,
body: `
<p>An embedded product loses power at arbitrary moments, usually while writing. A filesystem
that cannot survive that turns a power cut into a device that will not boot, and this is one of
the commonest field failures in Linux products.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A read-only root filesystem with a separate small writable partition, and the layering of flash translation beneath">
<rect class="bx" x="24" y="30" width="304" height="90" rx="4"/>
<text class="th" x="40" y="56">root filesystem</text>
<text class="ts" x="40" y="82">read only</text>
<text class="ts" x="40" y="104">cannot be corrupted by a power cut</text>

<rect class="bx" x="344" y="30" width="312" height="90" rx="4"/>
<text class="th" x="360" y="56">data partition</text>
<text class="ts" x="360" y="82">small, writable, journalled</text>
<text class="ts" x="360" y="104">the only thing at risk</text>

<rect class="bxa" x="24" y="136" width="632" height="46" rx="4"/>
<text class="th" x="40" y="162">raw flash: the filesystem manages wear and bad blocks itself</text>
<rect class="bxa" x="24" y="192" width="632" height="46" rx="4"/>
<text class="th" x="40" y="218">managed flash: a controller hides it, and its behaviour is undocumented</text>
</svg>

<p>The single most effective decision is to make the <b>root filesystem read only</b>. A
filesystem that is never written cannot be corrupted by an interrupted write, and everything
that must be writable goes on a separate, small partition. That also makes the device's
behaviour reproducible, since the running system is exactly what was flashed.</p>

<p>Which filesystem depends on what is underneath. On <b>raw NAND or NOR</b>, UBIFS handles wear
levelling, bad blocks and power-cut recovery itself, because there is no controller to do it.
On <b>managed flash</b>, an eMMC or an SD card, a controller inside the device does the
translation and hides it, so you use an ordinary journalled filesystem such as ext4 and accept
that the controller's own behaviour on power loss is largely undocumented.</p>

<p>That last point deserves emphasis. A cheap SD card can corrupt data that was written and
acknowledged long before the power cut, because its internal translation layer was mid-update.
Industrial cards specify power-loss protection; consumer ones generally do not, and testing is
the only way to know what you have.</p>

<p><b>Journalling</b> protects metadata, so the filesystem stays mountable, and by default it
does not protect your file contents. If a file must be updated atomically, the pattern is to
write a new file, flush it, sync it, then rename over the old one, since rename is atomic. Each
of those steps is necessary and skipping the flush is the usual mistake.</p>

<p>Finally, <b>test it</b> rather than reason about it. Automated power cycling during heavy
writes, thousands of times, is the only way to find out what actually happens, and it reliably
finds problems that inspection does not.</p>
`,
quiz: [
{ q: "What is the most effective protection against power-loss corruption?",
o: ["A journalling filesystem", "A read-only root filesystem with a small writable partition", "A battery-backed write cache", "Frequent filesystem checks at boot"],
a: 1, why: "A filesystem that is never written cannot be corrupted by an interrupted write, and it makes the running system exactly what was flashed." },
{ q: "Why is UBIFS used on raw NAND rather than ext4?",
o: ["It is faster on flash memory", "There is no controller, so the filesystem must handle wear and bad blocks", "ext4 cannot address large flash devices", "It compresses the data automatically"],
a: 1, why: "On managed flash a controller does the translation, so an ordinary journalled filesystem is appropriate. On raw flash the filesystem has that job." },
{ q: "What does journalling actually protect by default?",
o: ["File contents written just before the power cut", "Filesystem metadata, so it stays mountable", "The bad block table on the flash", "Data held in the page cache"],
a: 1, why: "Your file contents are a separate concern, which is why atomic update needs the write, flush, sync and rename pattern." },
{ q: "Why can a consumer SD card corrupt data written long before a power cut?",
o: ["Its write cache is larger than expected", "Its internal translation layer can be mid-update", "It reorders writes to improve wear levelling", "Its filesystem journal is undersized"],
a: 1, why: "The controller's behaviour on power loss is largely undocumented, and industrial cards specify power-loss protection where consumer ones do not." }
],
interview: {
q: "Devices in the field are failing to boot after power cuts. How would you approach it?",
a: "First I would find out what is actually corrupted, because the fix differs. If the root filesystem is damaged then the strongest answer, and the one I would push for, is to make root read only, with everything writable moved to a separate small partition. A filesystem that is never written cannot be corrupted by an interrupted write, and it has the secondary benefit that the running system is exactly what was flashed, which makes field behaviour reproducible. If the damage is in the data partition then I would look at how it is being written, because journalling protects metadata so the filesystem stays mountable and by default does not protect file contents at all. For anything that must be updated atomically the pattern is to write a new file, flush it, fsync it, and then rename over the old one, because rename is atomic; skipping the fsync is the usual mistake and it looks correct until the power goes. I would also want to know what the storage is. On raw NAND I would expect UBIFS, which handles wear levelling, bad blocks and power-cut recovery itself. On managed flash, an eMMC or an SD card, there is a controller doing the translation and hiding it, and its behaviour on power loss is largely undocumented, so a cheap consumer card can lose data that was written and acknowledged long before the cut because its translation layer was mid-update. If that is what we are using, I would move to industrial parts that specify power-loss protection. And whatever we change, I would validate it by automated power cycling during heavy writes, thousands of cycles, because that finds problems that no amount of reasoning about the design will."
}
},

{
id: "os-perf",
track: "Operating Systems",
sub: "Running Linux in a product",
title: "Finding out what a Linux system is actually doing",
mins: 22,
body: `
<p>When an embedded Linux system is slow, or stuttering, or drawing too much power, the
question is always the same: what is it doing? Linux has an unusually good set of answers, and
knowing which tool answers which question saves a great deal of time.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Tools arranged by the question they answer: what is running, where is CPU time going, what syscalls, and what is happening inside the kernel">
<rect class="bx" x="24" y="30" width="632" height="44" rx="4"/>
<text class="th" x="40" y="52">what is running and what is it waiting for?</text>
<text class="ts" x="40" y="70">top, ps, and the process state column</text>

<rect class="bx" x="24" y="82" width="632" height="44" rx="4"/>
<text class="th" x="40" y="104">where is the CPU time going, across the whole system?</text>
<text class="ts" x="40" y="122">perf top, perf record, and a flame graph</text>

<rect class="bx" x="24" y="134" width="632" height="44" rx="4"/>
<text class="th" x="40" y="156">what is it asking the kernel to do?</text>
<text class="ts" x="40" y="174">strace, and its timing options</text>

<rect class="bx" x="24" y="186" width="632" height="44" rx="4"/>
<text class="th" x="40" y="208">what is happening inside the kernel, and why is it late?</text>
<text class="ts" x="40" y="226">ftrace, trace-cmd, and the scheduler tracepoints</text>
</svg>

<p>The first question is always whether the process is <b>running or waiting</b>, because those
have completely different causes. A process in state R is using CPU and wants a profiler; one in
D is blocked in uninterruptible I/O and no amount of CPU profiling will explain it. Reading the
state column before reaching for a tool saves the commonest wasted afternoon.</p>

<p><b>perf</b> is the general profiler. It samples the whole system, kernel and userspace
together, and attributes time to functions. A flame graph made from its output shows where the
time goes at a glance, and unlike instrumenting the code it perturbs the system very little. It
also counts hardware events, so cache misses and branch mispredictions are available when the
profile alone does not explain the slowness.</p>

<p><b>strace</b> answers a different question: which system calls, with what arguments, taking
how long. It is the fastest way to find a program opening a file that does not exist, retrying a
failing call, or spending its life in one blocking syscall. It slows the target considerably,
which is fine for diagnosis and misleading for timing.</p>

<p><b>ftrace</b> is the kernel's own tracer and is what you use when the question is about
scheduling or latency: which task ran when, why a wakeup was late, how long an interrupt was
disabled. It has almost no overhead when idle and is built into every modern kernel.</p>

<p>The habit that matters more than any tool is to <b>form a hypothesis first</b>. These tools
produce enormous quantities of data, and going in without a specific question generally produces
a large file and no conclusion. Decide what you expect to see, then look for whether it is
there.</p>
`,
quiz: [
{ q: "What does a process in state D tell you?",
o: ["It is consuming CPU and should be profiled", "It is blocked in uninterruptible I/O", "It has been stopped by a signal", "It is a kernel thread rather than a process"],
a: 1, why: "CPU profiling will explain nothing about it. Reading the state before choosing a tool saves the commonest wasted afternoon." },
{ q: "What makes perf suitable for a production system?",
o: ["It instruments every function precisely", "It samples, so it perturbs the system very little", "It requires no kernel support", "It only measures userspace code"],
a: 1, why: "Sampling gives a statistical picture across kernel and userspace with little disturbance, unlike instrumentation which distorts small hot functions." },
{ q: "What question is strace the right tool for?",
o: ["Which functions consume the most CPU", "Which system calls are made, with what arguments and duration", "Why a task was scheduled late", "How many cache misses occurred"],
a: 1, why: "It finds a program opening a missing file, retrying a failing call, or blocking in one syscall. It slows the target, so it is for diagnosis rather than timing." },
{ q: "When is ftrace the right tool?",
o: ["When profiling userspace CPU usage", "When the question is about scheduling, wakeups or latency", "When counting hardware performance events", "When tracing library calls"],
a: 1, why: "It is the kernel's own tracer, with almost no idle overhead, and it answers which task ran when and why a wakeup was late." }
],
interview: {
q: "An embedded Linux application intermittently misses its deadline. How do you find out why?",
a: "I would start by working out whether it is late because it is not getting CPU, or late because it is blocked, or late because it is genuinely taking too long, since those have completely different causes and different tools. Looking at the process state is the cheapest first step: R means it is running and a profiler is the right next move, D means it is blocked in uninterruptible I/O and no amount of CPU profiling will explain anything. If it is a scheduling problem, which intermittent deadline misses often are, ftrace is the tool, because it gives me the scheduler tracepoints: which task ran when, when my task was woken and when it actually got the CPU, and what ran in between. That distinction between wakeup and actual start is usually where the answer is, and it tells me whether I am being preempted, whether an interrupt handler is running long, or whether a higher-priority task is holding the CPU. If it turns out to be genuinely compute-bound then I would use perf, sampling across kernel and userspace, and render it as a flame graph, and if the profile looks flat I would look at hardware counters for cache misses, because a memory-bound loop looks unremarkable in a function profile. If it is blocking, strace with timing would show me which syscall it is sitting in, though I would remember that strace slows the target enough that I should treat it as diagnostic rather than as a measurement. Underneath all of that, the habit I would keep is forming a hypothesis before reaching for a tool, because all of these produce enormous amounts of data and going in without a specific question usually produces a large file and no conclusion."
}
},

{
id: "os-cgroups",
track: "Operating Systems",
sub: "Running Linux in a product",
title: "Namespaces, cgroups and what a container really is",
mins: 20,
body: `
<p>A container is not a virtual machine and it is not a kernel feature. It is a normal process
that the kernel has been asked to lie to, using two independent mechanisms that are worth
understanding separately.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Namespaces controlling what a process can see, and cgroups controlling what it can use, as two independent axes">
<rect class="bx" x="24" y="30" width="304" height="180" rx="4"/>
<text class="th" x="40" y="58">namespaces: what it can SEE</text>
<text class="ts" x="40" y="92">pid: its own process tree</text>
<text class="ts" x="40" y="116">mount: its own filesystem view</text>
<text class="ts" x="40" y="140">net: its own interfaces</text>
<text class="ts" x="40" y="164">uts, ipc, user, cgroup</text>
<text class="ts" x="40" y="196">isolation, not limitation</text>

<rect class="bx" x="344" y="30" width="312" height="180" rx="4"/>
<text class="th" x="360" y="58">cgroups: what it can USE</text>
<text class="ts" x="360" y="92">cpu: shares and quotas</text>
<text class="ts" x="360" y="116">memory: a hard limit</text>
<text class="ts" x="360" y="140">io: bandwidth and weight</text>
<text class="ts" x="360" y="164">pids: process count</text>
<text class="ts" x="360" y="196">limitation, not isolation</text>
</svg>

<p><b>Namespaces</b> control what a process can see. A PID namespace gives it its own process
tree, so its first process is PID 1 and it cannot see anything outside. A mount namespace gives
it its own view of the filesystem. A network namespace gives it its own interfaces and routing
table. Each is independent, and you can use one without the others.</p>

<p><b>Cgroups</b> control what a process can use: a share of CPU, a hard memory limit, I/O
bandwidth, a maximum number of processes. This is where the useful behaviour for an embedded
product actually lives, because it is what stops one misbehaving component taking the system
down.</p>

<p>That separation is the practically important point. You do not need containers to get the
benefit. Putting a memory limit on a component so that a leak kills only that component, and
giving the control process a guaranteed CPU share so a background job cannot starve it, are both
cgroup settings applied to ordinary systemd services. That is a small change with a large
payoff.</p>

<p>The <b>memory limit</b> deserves particular attention, because exceeding it invokes the
out-of-memory killer within that group rather than system-wide. A leak in a logging daemon then
kills the logging daemon instead of taking down the control loop, which converts a total failure
into a partial one.</p>

<p>What containers do <b>not</b> provide is a strong security boundary. Every container shares
one kernel, so a kernel vulnerability crosses the boundary, which is why virtual machines still
exist. For separating your own components on your own device that is usually acceptable; for
running untrusted code it is not.</p>
`,
quiz: [
{ q: "What do namespaces control?",
o: ["How much CPU and memory a process may use", "What a process can see", "Which users may run a process", "The scheduling priority of a process"],
a: 1, why: "PID, mount and network namespaces each give a process its own view. Limiting resources is the separate job of cgroups." },
{ q: "What is the most useful cgroup setting for embedded reliability?",
o: ["A CPU share for background tasks", "A memory limit, so a leak kills only that component", "A PID limit to prevent fork bombs", "An I/O weight for logging"],
a: 1, why: "Exceeding the limit invokes the out-of-memory killer within that group, converting a total system failure into a partial one." },
{ q: "Do you need containers to use cgroups?",
o: ["Yes, cgroups are a container feature", "No, they apply to ordinary services directly", "Only if namespaces are also configured", "Only on systems using systemd"],
a: 1, why: "Applying limits to ordinary systemd services is a small change with a large payoff, and it does not require any container tooling." },
{ q: "Why is a container not a strong security boundary?",
o: ["Its filesystem is shared with the host", "Every container shares one kernel", "Namespaces can be disabled at runtime", "cgroup limits can be exceeded"],
a: 1, why: "A kernel vulnerability crosses the boundary, which is why virtual machines still exist for untrusted code." }
],
interview: {
q: "One process on your embedded Linux device occasionally leaks memory and takes the whole system down. What would you do?",
a: "The immediate mitigation is a cgroup memory limit on that process, because exceeding a cgroup's limit invokes the out-of-memory killer within that group rather than system-wide. So instead of the kernel choosing a victim across the whole system, which frequently picks something important, the leaking process is killed and everything else keeps running. That turns a total failure into a partial one, and combined with a systemd restart policy it becomes a self-healing nuisance rather than an outage. I would point out that this needs no container tooling at all: cgroup limits apply directly to ordinary systemd services through a couple of directives in the unit file, and it is worth doing for every non-critical component on the device. It is also worth separating the two mechanisms people conflate here. Namespaces control what a process can see, so its own process tree, its own filesystem view, its own network interfaces, and cgroups control what it can use, so CPU shares, memory limits, I/O bandwidth. A container is just both of those applied together plus some packaging, and for reliability on an embedded device it is the cgroup half that does the useful work. Alongside the mitigation I would want to actually fix the leak, so I would add memory usage to whatever telemetry the device reports, since a slow leak is very visible as a trend and nearly invisible in a snapshot, and I would run the component under a sanitiser or with valgrind on a development board to find it. And I would be clear that a cgroup limit is a reliability boundary, not a security one, because every process still shares one kernel."
}
},

{
id: "os-net",
track: "Operating Systems",
sub: "Running Linux in a product",
title: "The network stack, from a driver's point of view",
mins: 20,
body: `
<p>For an embedded product, the network stack is usually either working perfectly or failing in
a way that makes no sense. Knowing the path a packet takes makes the second case tractable.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A packet's path from the wire through the driver, softirq, protocol stack and socket buffer to the application">
<rect class="bx" x="24" y="30" width="632" height="36" rx="4"/>
<text class="ts" x="40" y="54">wire: the controller writes into a DMA ring and raises an interrupt</text>
<rect class="bx" x="24" y="74" width="632" height="36" rx="4"/>
<text class="ts" x="40" y="98">driver: acknowledges quickly, schedules the real work</text>
<rect class="bx" x="24" y="118" width="632" height="36" rx="4"/>
<text class="ts" x="40" y="142">softirq with NAPI: polls the ring, batching many packets per interrupt</text>
<rect class="bx" x="24" y="162" width="632" height="36" rx="4"/>
<text class="ts" x="40" y="186">protocol stack: IP, then TCP or UDP, then into the socket buffer</text>
<rect class="bx" x="24" y="206" width="632" height="36" rx="4"/>
<text class="ts" x="40" y="230">application: reads when it is scheduled, which may be much later</text>
</svg>

<p><b>NAPI</b> is the mechanism that makes high packet rates survivable. Taking an interrupt per
packet collapses under load, so the driver disables receive interrupts and the kernel polls the
ring instead, processing many packets per entry. The system therefore switches from interrupt
driven at low rates to polled at high rates, automatically.</p>

<p>The consequence for diagnosis is that <b>packet loss can happen in several distinct places</b>,
and they have different fixes. The controller can drop when its ring is full because the driver
was not scheduled. The stack can drop when the socket receive buffer is full because the
application did not read. And a queue discipline can drop deliberately on transmit. The
per-interface and per-socket counters distinguish them, and reading those before changing
anything is the whole diagnosis.</p>

<p>For an embedded system the usual failure is the third: the application is not reading fast
enough, because it is doing work in the same thread or because it is not scheduled promptly. The
fix is in the application rather than the network configuration, and enlarging the buffer only
delays it.</p>

<p><b>Latency</b> has its own set of traps. Nagle's algorithm delays small writes to coalesce
them, which interacts badly with delayed acknowledgements and can add tens of milliseconds to a
small request-response exchange. Disabling it is right for a control protocol and wrong for bulk
transfer. Interrupt coalescing in the controller trades latency for CPU in the same way, and its
defaults are chosen for throughput.</p>

<p>Where the latency requirement is genuinely hard, the answer is usually to leave the general
stack: a real-time protocol on a dedicated interface, or a raw socket with a queue discipline
chosen for the job, because the general stack is optimised for a different problem than the one
you have.</p>
`,
quiz: [
{ q: "What problem does NAPI solve?",
o: ["Packets arriving out of order", "Taking one interrupt per packet collapsing under load", "Checksum offload being unavailable", "The socket buffer overflowing"],
a: 1, why: "The driver disables receive interrupts and the kernel polls the ring, so the system moves from interrupt driven at low rates to polled at high rates." },
{ q: "Where is packet loss most commonly caused in an embedded application?",
o: ["Corruption on the wire", "The socket receive buffer filling because the application did not read", "The controller's DMA ring being too small", "The transmit queue discipline dropping"],
a: 1, why: "Enlarging the buffer only delays it; the fix is in the application, and the per-socket counters are what distinguish this from the other causes." },
{ q: "What does Nagle's algorithm do?",
o: ["Retransmits lost segments faster", "Delays small writes to coalesce them", "Adjusts the window size dynamically", "Reorders packets for efficiency"],
a: 1, why: "Combined with delayed acknowledgements it can add tens of milliseconds to a small request-response exchange, which is why control protocols disable it." },
{ q: "What does interrupt coalescing trade?",
o: ["Throughput against memory use", "Latency against CPU load", "Reliability against speed", "Bandwidth against packet size"],
a: 1, why: "Its defaults are chosen for throughput, so a latency-sensitive product usually needs them changed deliberately." }
],
interview: {
q: "Your device drops UDP packets under load. How do you find out where?",
a: "I would find out where they are being dropped before changing anything, because there are several distinct places and they have different fixes. The counters tell me directly: the interface statistics show drops at the driver and controller level, and the per-socket receive errors show drops because the socket buffer was full. Those two mean quite different things. Drops at the controller usually mean the driver was not scheduled quickly enough to refill the receive ring, which points at interrupt handling, CPU contention or a NAPI budget issue. Drops at the socket mean the application did not read fast enough, which is by far the most common case in an embedded product and is an application problem rather than a network one. In that case enlarging the receive buffer only delays the failure, so I would look at whether the reading thread is doing work it should not be doing inline, or whether it is simply not being scheduled promptly, which I would check with the scheduler tracepoints. I would also want to know whether the loss is steady or bursty, because bursty loss with an otherwise idle system suggests a scheduling latency problem rather than a throughput one. If it turns out to be genuinely at the limit of what the stack can do, then the options are to reduce the work per packet, batch the reads with recvmmsg, pin the handling to an isolated core with the interrupt steered to the same core, and check whether interrupt coalescing settings are appropriate, since the defaults are chosen for throughput rather than latency. And I would be clear with whoever owns the requirement that UDP has no delivery guarantee, so if the data must not be lost then buffering and retry belong in the application protocol."
}
},

{
id: "os-power",
track: "Operating Systems",
sub: "Running Linux in a product",
title: "Power management: idle states, wakeups and why it never sleeps",
mins: 20,
body: `
<p>A battery-powered Linux device spends most of its life doing nothing, and almost all of the
engineering is in making sure that nothing is genuinely nothing. The usual complaint, that the
system will not stay asleep or draws too much when idle, has a small number of common causes.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Runtime idle states with increasing depth and exit latency, and separately full system suspend">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">deeper states save more and take longer to leave</text>

<rect class="bx" x="24" y="72" width="150" height="60" rx="4"/>
<text class="ts" x="40" y="98">running</text>
<rect class="bx" x="186" y="72" width="150" height="60" rx="4"/>
<text class="ts" x="202" y="98">shallow idle</text>
<text class="ts" x="202" y="120">microseconds</text>
<rect class="bx" x="348" y="72" width="150" height="60" rx="4"/>
<text class="ts" x="364" y="98">deep idle</text>
<text class="ts" x="364" y="120">caches lost</text>
<rect class="bx" x="510" y="72" width="146" height="60" rx="4"/>
<text class="ts" x="526" y="98">suspend</text>
<text class="ts" x="526" y="120">RAM only</text>

<text class="ts" x="40" y="170">a timer that fires every few milliseconds prevents anything below shallow idle</text>
<text class="ts" x="40" y="200">the governor will not choose a state whose exit latency exceeds the predicted idle time</text>
</svg>

<p>The first thing to understand is that <b>idle is not one state</b>. There is a ladder of them,
each saving more and taking longer to leave. The governor predicts how long the next idle period
will be and picks the deepest state whose exit latency fits. So anything that wakes the system
frequently keeps it permanently in the shallowest state, and the average power reflects that
rather than the deep-state figure on the datasheet.</p>

<p>That makes <b>timer activity</b> the usual culprit. A poll loop with a short sleep, a daemon
checking something every hundred milliseconds, or a filesystem writeback timer will each prevent
deep idle entirely. The tooling to find them is direct: the kernel can report which processes are
causing wakeups, and powertop presents that as a ranked list.</p>

<p>The design response is to make the system genuinely <b>event driven</b>: block on an
interrupt, a socket or a file descriptor rather than polling, and where periodic work is
unavoidable, batch it and align the timers so several pieces of work wake the system once rather
than separately. Timer slack and deferrable timers exist for exactly this.</p>

<p><b>Suspend</b> is a different mechanism from idle: the system stops entirely and only memory
is refreshed, with resume driven by a configured wake source. The engineering there is mostly
about which sources are enabled and whether every driver actually suspends and resumes correctly,
because one driver that fails to release a wake lock keeps the whole system up.</p>

<p>The measurement discipline is the same as anywhere else: measure the current, with the system
doing what it will really do, over a realistic period. Estimating from the datasheet's deep-state
figure and the assumed duty cycle is how endurance predictions come out wrong by a factor of
several.</p>
`,
quiz: [
{ q: "Why does frequent activity ruin idle power even if the work is trivial?",
o: ["Each wakeup costs a fixed large amount of energy", "The governor cannot choose a deep state if the idle period is short", "Shallow states consume more than running", "The scheduler disables idle entirely"],
a: 1, why: "The governor picks the deepest state whose exit latency fits the predicted idle time, so frequent wakeups pin the system in the shallowest state." },
{ q: "What is usually the cause of a device that will not enter deep idle?",
o: ["An interrupt storm from a peripheral", "Timers and polling loops waking it frequently", "The CPU governor being set to performance", "Insufficient memory to save state"],
a: 1, why: "A daemon polling every hundred milliseconds prevents deep idle entirely, and the kernel can report which processes are causing the wakeups." },
{ q: "What do deferrable timers and timer slack achieve?",
o: ["They reduce the accuracy required of the clock", "They let several pieces of work wake the system once", "They lower the CPU frequency during idle", "They defer work until the battery is charged"],
a: 1, why: "Aligning and batching wakeups is what turns many shallow idle periods into fewer, longer, deeper ones." },
{ q: "Why might a system fail to suspend at all?",
o: ["The memory controller cannot self-refresh", "A driver failing to release a wake lock", "The idle governor is misconfigured", "The CPU frequency is too high"],
a: 1, why: "Suspend requires every driver to suspend cleanly, and one that holds a wake source keeps the whole system up." }
],
interview: {
q: "A battery-powered Linux device is drawing far more idle current than expected. How would you investigate?",
a: "I would start by measuring rather than reasoning, so a current measurement with enough time resolution to see individual wakeups rather than just an average, because the shape tells me immediately whether it is a constant draw or a train of wakeups. If it is wakeups, and it usually is, then the cause is that idle is not one state but a ladder of them, each saving more and taking longer to exit, and the governor only chooses a deep state if it predicts the idle period will be long enough to justify the exit latency. So anything waking the system every few milliseconds pins it in the shallowest state and the average power reflects that rather than the deep-state number on the datasheet. To find the culprits I would use the kernel's wakeup accounting, most easily through powertop, which ranks processes and interrupt sources by how often they wake the system. Typically it is a poll loop with a short sleep, a daemon checking something on a timer, or filesystem writeback. The design fix is to make the system genuinely event driven, blocking on a file descriptor or an interrupt rather than polling, and where periodic work is unavoidable, to batch it and align the timers so several pieces of work wake the system once instead of separately, which is what timer slack and deferrable timers are for. If the requirement is for actual suspend rather than idle, that is a different mechanism and the usual problem is a driver that does not suspend cleanly or holds a wake source, so I would check which wake sources are enabled and work through the drivers. Throughout I would keep measuring, because endurance predictions built from a datasheet figure and an assumed duty cycle come out wrong by a factor of several."
}
}

);
