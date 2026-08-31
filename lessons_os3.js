// Operating Systems track, batch 3: bare metal versus Linux.
//
// The comparative half. MPU versus MMU is already a table in os-vm and the
// scheduler comparison is most of os-sched, so this covers the four things that
// are genuinely not said anywhere else: how to choose, how to run both at once,
// what boot actually looks like on each, and what changes about the C you write.

LESSONS.push(

{
id: "os-choose",
track: "Operating Systems",
sub: "Bare metal vs Linux",
title: "Choosing between bare metal, an RTOS and Linux",
mins: 22,
body: `
<p>This is a design question you will be asked, and the wrong way to answer it is to start with
a preference. Start with what the product has to do.</p>

<table>
<tr><th></th><th>Bare metal</th><th>RTOS</th><th>Linux</th></tr>
<tr><td>Boot to working</td><td>Microseconds</td><td>Milliseconds</td><td><b>Seconds</b></td></tr>
<tr><td>Worst-case response</td><td>Provable</td><td>Provable</td><td>Not bounded</td></tr>
<tr><td>RAM</td><td>Kilobytes</td><td>Tens of kB</td><td><b>Tens of MB</b></td></tr>
<tr><td>Needs an MMU</td><td>No</td><td>No</td><td>Yes</td></tr>
<tr><td>Storage</td><td>Internal flash</td><td>Internal flash</td><td>eMMC or NAND</td></tr>
<tr><td>Deep sleep current</td><td>Microamps</td><td>Microamps</td><td>Milliamps</td></tr>
<tr><td>Networking, filesystems, USB host, display</td><td>You write it</td><td>Ported stacks</td><td><b>Free</b></td></tr>
</table>

<h3>The two questions that actually decide it</h3>

<p><b>Do you need something you would otherwise have to write?</b> A TCP/IP stack with TLS, a
filesystem that survives power loss, USB host, a display stack, a camera pipeline, a package
manager, Python. Writing any of those yourself is months, and on Linux they are a configuration
choice. That is the entire argument for Linux and it is usually decisive.</p>

<p><b>Do you need a bounded response?</b> If something has to happen within 50 microseconds of an
edge, every time, Linux alone cannot promise it. PREEMPT_RT gets typical latency into the tens of
microseconds and it is still a statistical claim, not a proof.</p>

<h3>The costs people forget</h3>

<ul>
<li><b>Bill of materials.</b> Linux drags in DRAM, eMMC, a PMIC, more pins, more layers, and a
part an order of magnitude dearer than a Cortex-M.</li>
<li><b>Power.</b> Milliamps idling against microamps. On a battery product this alone often ends
the discussion.</li>
<li><b>Boot time.</b> Two to twenty seconds. If a user presses a button and expects a response,
that is a product problem, not an engineering one.</li>
<li><b>The security obligation.</b> You have shipped a Linux userspace with a CVE feed attached to
it. Somebody is now responsible for updates for the product's whole life, and under the UK PSTI
Act you must publish how long that is.</li>
<li><b>Licensing.</b> The kernel is GPLv2, so kernel modifications and drivers you link into it
have obligations. Userspace is unaffected, which is why anything proprietary lives there.</li>
</ul>

<h3>The honest short answer</h3>

<p>"Bare metal or an RTOS when the job is deterministic control, the memory budget is kilobytes,
and it has to run for a year on a battery. Linux when I need a network stack, a filesystem or a
display that I would otherwise be writing myself, and the product can afford the seconds of boot
and the milliamps. If I need both, that is not a compromise, it is a two-core design."</p>
`,
quiz: [
{ q: "What is usually the decisive argument for Linux on a product?",
o: ["It is considerably easier to develop against", "It supplies stacks you would otherwise write", "It runs measurably faster than an RTOS", "It is required for any networked device"],
a: 1, why: "TCP/IP with TLS, a power-fail-safe filesystem, USB host, a display or camera pipeline. Each is months of work bare metal and a configuration choice on Linux." },
{ q: "Which cost of choosing Linux most often ends a battery product?",
o: ["The kernel's GPLv2 licensing obligations", "Idle current in milliamps, not microamps", "The extra board area the DRAM needs", "The longer development time it implies"],
a: 1, why: "Three orders of magnitude on the quantity that sets battery life. The boot time and the bill of materials hurt too, but this is the one that is usually fatal." },
{ q: "Can PREEMPT_RT give you a provable worst-case response?",
o: ["Yes, that is precisely what it was built to provide", "No, it improves a statistical distribution", "Only when paired with SCHED_DEADLINE", "Only on a single-core processor"],
a: 1, why: "It gets typical latency into the tens of microseconds, which is a very different claim from the bound a fixed-priority RTOS on bare hardware lets you prove." },
{ q: "Which obligation does shipping Linux create that bare metal does not?",
o: ["A published minimum security update period", "A requirement to open source your firmware", "Certification against a functional safety standard", "A guarantee of a fixed boot time"],
a: 0, why: "You have attached a CVE feed to your product for its whole life, and the UK PSTI Act requires you to publish how long you will service it. GPLv2 touches the kernel, not your userspace." }
],
interview: {
q: "How would you decide between an RTOS and embedded Linux for a new product?",
a: "I would start from what the product has to do rather than from a preference, and two questions usually settle it. First, do I need something I would otherwise have to write: a TCP/IP stack with TLS, a filesystem that survives power loss, USB host, a display or camera pipeline, Python. Each of those is months bare metal and a configuration choice on Linux, and that is normally the decisive argument. Second, do I need a bounded worst-case response. If something must happen within tens of microseconds of an edge every single time, Linux cannot promise that; PREEMPT_RT gets typical latency very low but it is a statistical claim, not the proof you get from fixed-priority scheduling on bare hardware. Then the costs people forget. Linux drags in DRAM, eMMC and a PMIC, so the bill of materials and the board both grow. Idle current goes from microamps to milliamps, which on a battery product usually ends the discussion by itself. Boot goes from microseconds to seconds, which is a user-facing problem. And you have taken on a security obligation for the life of the product, with a published update period under the PSTI Act. If the answer to both questions is yes, that is not a compromise: it is a two-core design, with Linux doing connectivity and a Cortex-M or a second chip holding the deadline."
}
},

{
id: "os-amp",
track: "Operating Systems",
sub: "Bare metal vs Linux",
title: "AMP: running Linux and an RTOS side by side",
mins: 22,
body: `
<p>When you need a network stack <i>and</i> a hard deadline, you do not compromise. You run both,
on different cores. This is <b>asymmetric multiprocessing</b>, and it is the standard shape of a
serious embedded product.</p>

<p>Distinguish it from SMP first. Under <b>SMP</b>, one kernel schedules across identical cores
and treats them as a pool. Under <b>AMP</b>, each core runs its own separate software, and they
are usually not even the same architecture.</p>

<h3>Two ways to build it</h3>

<ul>
<li><b>Two chips.</b> An application processor plus a microcontroller, joined by UART, SPI or
USB. Simple, well isolated, and every boundary is visible. Your BugBot is exactly this: an
ESP32-S3 doing control and a separate AI processor, talking over UART across a header.</li>
<li><b>One SoC, heterogeneous cores.</b> STM32MP1 with Cortex-A7 plus M4, i.MX8 with A53 plus M4,
ESP32-P4. Cheaper, one power domain, and considerably more subtle because the two halves share
memory and peripherals.</li>
</ul>

<svg class="fig" viewBox="0 0 680 260" role="img" aria-label="A Cortex-A core running Linux and a Cortex-M core running an RTOS, sharing a block of memory and a mailbox, with Linux owning storage and networking and the M core owning the real-time peripherals">
<rect class="bxa" x="24" y="26" width="270" height="40" rx="4"/>
<text class="th" x="40" y="52">Cortex-A, Linux</text>
<rect class="bx" x="24" y="74" width="270" height="104" rx="4"/>
<text class="ts" x="40" y="100">networking, TLS, filesystem</text>
<text class="ts" x="40" y="122">UI, logging, updates</text>
<text class="ts" x="40" y="144">boots the other core</text>
<text class="ts" x="40" y="166">no deadline it must meet</text>

<rect class="bxa" x="386" y="26" width="270" height="40" rx="4"/>
<text class="th" x="402" y="52">Cortex-M, RTOS</text>
<rect class="bx" x="386" y="74" width="270" height="104" rx="4"/>
<text class="ts" x="402" y="100">motor control, ADC, PWM</text>
<text class="ts" x="402" y="122">the microsecond deadlines</text>
<text class="ts" x="402" y="144">keeps running if Linux reboots</text>
<text class="ts" x="402" y="166">owns its peripherals outright</text>

<rect class="bxa" x="234" y="196" width="212" height="44" rx="4"/>
<text class="th" x="250" y="222">shared memory + mailbox</text>
<line class="arr" x1="160" y1="182" x2="290" y2="200" marker-end="url(#arrow)"/>
<line class="arr" x1="520" y1="182" x2="390" y2="200" marker-end="url(#arrow)"/>
</svg>

<h3>How the halves talk</h3>

<ul>
<li><b>Shared memory</b> for the data, in a region both can see and that Linux must not treat as
ordinary cacheable RAM without thought.</li>
<li><b>A mailbox or IPCC</b> for the doorbell: a hardware interrupt saying "look at the buffer".
Polling shared memory from Linux wastes power and adds latency.</li>
<li><b>rpmsg over OpenAMP</b>, which is the standardised version of the above: virtio rings in
shared memory plus a mailbox, presented to Linux as a character device.</li>
<li><b>remoteproc</b>, the Linux subsystem that loads the M core's firmware from the filesystem
and starts it. So the RTOS image ships as a file in the Linux rootfs and is updated with it.</li>
</ul>

<h3>The parts that actually bite</h3>

<ul>
<li><b>Who owns which peripheral.</b> Both cores can usually reach every peripheral, and nothing
stops them. This has to be decided and written down, because the failure is silent corruption
rather than an error.</li>
<li><b>Cache coherency.</b> The A core has caches and the M core may not be in the same coherency
domain. A buffer written by one and read by the other needs a clean or an invalidate, or the
region needs marking non-cacheable. This is the same problem as your DMA buffers, one level up.</li>
<li><b>Lifecycle.</b> Linux reboots for an update. Does the motor stop? Usually the answer must be
no, which means the M core keeps running and has to survive its peer disappearing and coming back
mid-conversation.</li>
<li><b>Debugging two things at once.</b> Two debuggers, two consoles, and a class of bug that only
appears in the gap between them.</li>
</ul>

<p>The reason to know this is that it is the answer to "you need a network stack and a 50
microsecond deadline". Not "we will make Linux fast enough".</p>
`,
quiz: [
{ q: "What distinguishes AMP from SMP?",
o: ["AMP requires cores of different speeds", "Each AMP core runs its own separate software", "SMP is for two chips, AMP for one chip", "AMP always needs a hypervisor to arbitrate"],
a: 1, why: "Under SMP one kernel schedules across a pool of identical cores. Under AMP the cores run different software entirely, often on different architectures." },
{ q: "What is a mailbox or IPCC used for in an AMP design?",
o: ["Carrying the message payload itself", "Interrupting the other core to look", "Keeping the two caches coherent", "Loading firmware onto the second core"],
a: 1, why: "The data goes in shared memory; the mailbox is the doorbell. Polling shared memory from Linux instead costs power and adds latency." },
{ q: "What does the remoteproc subsystem do?",
o: ["Routes the rpmsg messages between the two cores", "Loads and starts the other core's firmware", "Maps the shared memory region for both", "Arbitrates which core owns a peripheral"],
a: 1, why: "It takes the firmware image from the Linux filesystem and boots the M core with it, so the RTOS image ships and updates as a file in the rootfs." },
{ q: "Why is cache coherency a hazard between the two cores?",
o: ["The cores may run at different clock speeds", "They may not share a coherency domain", "The M core has no cache of its own at all", "Shared memory is always uncached anyway"],
a: 1, why: "A buffer written by one and read by the other needs a clean or an invalidate, or the region must be non-cacheable. It is the DMA buffer problem one level up." }
],
interview: {
q: "The product needs a TLS network stack and a 50 microsecond control deadline. What do you do?",
a: "I would not try to make Linux meet the deadline. I would split it, which is asymmetric multiprocessing: Linux on an application core doing networking, TLS, filesystem, UI and updates, and an RTOS or bare metal on a second core owning the control loop and its peripherals. That can be two chips joined by UART or SPI, which is simple and well isolated, or one SoC with heterogeneous cores like an STM32MP1 or i.MX8, which is cheaper and considerably more subtle. The two halves talk through shared memory for the payload plus a hardware mailbox as the doorbell, because polling shared memory from Linux costs power and latency. The standardised version of that is rpmsg over OpenAMP, which is virtio rings plus a mailbox presented to Linux as a character device, and remoteproc is the Linux subsystem that loads the M core's firmware out of the rootfs and starts it, so the RTOS image updates like any other file. The parts that actually bite are ownership and lifecycle. Both cores can usually reach every peripheral and nothing enforces the split, so it has to be decided and documented, because the failure mode is silent corruption. Cache coherency between the halves is the DMA buffer problem one level up. And Linux will reboot for an update while the motor must keep turning, so the M core has to survive its peer vanishing and returning mid-conversation."
}
},

{
id: "os-boot",
track: "Operating Systems",
sub: "Bare metal vs Linux",
title: "Boot: from the reset vector to init",
mins: 20,
body: `
<p>You know the Cortex-M sequence exactly, and it is short. The core reads the first word of the
vector table into MSP, the second word as the reset vector, and branches. <code>Reset_Handler</code>
copies <code>.data</code> from flash to RAM, zeroes <code>.bss</code>, runs constructors, calls
<code>main</code>. Microseconds, and every step is code you can read.</p>

<p>Linux takes seconds and has five stages. The reason is one constraint: <b>DRAM is not
initialised at reset</b>, and the kernel is far too large to run without it.</p>

<h3>The chain</h3>

<ol>
<li><b>Boot ROM.</b> Mask-programmed into the silicon, unchangeable. Reads straps or fuses to
decide where to look, and loads a small first stage into the on-chip SRAM. This is the root of
trust for secure boot, because it is the one thing an attacker cannot replace.</li>
<li><b>First stage, the SPL.</b> A few tens of kilobytes, because that is all the SRAM there is.
Its whole job is to bring up the DDR controller and the clocks, then load the next stage into the
DRAM it has just made work.</li>
<li><b>U-Boot.</b> The full bootloader, now with real memory. Finds the kernel, the device tree
and often an initramfs, verifies signatures if secure boot is on, and hands over. This is the
stage with a console, and where the boot arguments live.</li>
<li><b>The kernel.</b> Decompresses, parses the device tree it was handed a pointer to, brings up
the memory manager and the scheduler, probes drivers against <code>compatible</code>, mounts the
root filesystem.</li>
<li><b>init.</b> PID 1, usually systemd. Starts everything else. The kernel is up long before the
product is.</li>
</ol>

<h3>What each stage explains</h3>

<p>The staging looks baroque until you see it as one constraint repeated: <b>each stage exists to
make the next one possible</b>. The ROM cannot hold a bootloader, so it loads one. The SPL cannot
hold a kernel, so it brings up DRAM and loads U-Boot. U-Boot cannot be an operating system, so it
loads one.</p>

<p>It also explains where boot time goes, and it is rarely the kernel. It is U-Boot's default
delay, probing devices that are not there, decompressing, and then systemd starting forty units
in dependency order. Cutting boot time is mostly deleting work from stages three and five.</p>

<h3>Two things worth carrying</h3>

<p><b>The device tree is passed in, not compiled in.</b> U-Boot loads the <code>.dtb</code> and
hands the kernel a pointer to it. That is why the same kernel binary boots different boards, and
it is the concrete difference from Zephyr, where devicetree became constants at build time and no
blob exists at all.</p>

<p><b>Secure boot is a chain, and it starts in silicon.</b> The ROM verifies the SPL, the SPL
verifies U-Boot, U-Boot verifies the kernel. Break any link and everything above it is
unverified, which is the same argument as a bootloader you can replace on a Cortex-M making the
application's signature check meaningless.</p>
`,
quiz: [
{ q: "Why does Linux boot need a separate first stage before U-Boot?",
o: ["To verify the signature on the bootloader", "DRAM is not up, so it must fit in SRAM", "To choose which kernel image to load", "To decompress the kernel into memory"],
a: 1, why: "The SPL is a few tens of kilobytes because that is all the on-chip SRAM there is, and its job is to initialise the DDR controller so a full bootloader has somewhere to live." },
{ q: "How does the kernel get the device tree?",
o: ["It is compiled into the kernel image", "The bootloader passes it a pointer", "It reads it from the root filesystem", "The boot ROM places it in SRAM"],
a: 1, why: "U-Boot loads the .dtb and hands over a pointer, which is why one kernel binary boots many boards. Zephyr has no blob at all: its devicetree became constants at build time." },
{ q: "Where does embedded Linux boot time usually go?",
o: ["Kernel decompression and driver probing", "U-Boot delay and starting the init units", "The boot ROM reading its strapping pins", "Mounting and checking the root filesystem"],
a: 1, why: "Rarely the kernel. It is U-Boot's default countdown, probing absent devices, and then systemd bringing up dozens of units in dependency order." },
{ q: "What makes the boot ROM the root of trust?",
o: ["It runs before any interrupt is enabled", "It is in silicon and cannot be replaced", "It holds the private signing key", "It is the smallest stage in the chain"],
a: 1, why: "Mask-programmed and unchangeable, so it is the one link an attacker cannot swap. Every stage above it is only as trustworthy as the one that verified it." }
],
interview: {
q: "Walk me through what happens between power-on and a Linux prompt.",
a: "Five stages, and they exist because of one constraint: DRAM is not initialised at reset and the kernel is far too big to run without it. First the boot ROM, mask-programmed into the silicon, reads straps or fuses to decide where to look and loads a small first stage into on-chip SRAM. Because it cannot be replaced, it is the root of trust for secure boot. Second the SPL, a few tens of kilobytes since that is all the SRAM there is, whose entire job is to bring up the DDR controller and clocks and then load the next stage into the memory it just made work. Third U-Boot, the full bootloader with real memory available, which finds the kernel, the device tree and often an initramfs, checks signatures if secure boot is on, and hands over. Fourth the kernel: decompress, parse the device tree it was given a pointer to, bring up memory management and the scheduler, probe drivers against compatible strings, mount the root filesystem. Fifth init, usually systemd, as PID 1 starting everything else. The staging looks baroque until you notice each stage exists purely to make the next one possible. It also tells you where boot time goes, which is almost never the kernel: it is U-Boot's countdown, probing devices that are not fitted, and systemd bringing up dozens of units. Compared with a Cortex-M, where the hardware loads the stack pointer from the first vector word and Reset_Handler copies .data, zeroes .bss and calls main in microseconds, the whole difference is that nothing on the Linux side can assume its memory exists yet."
}
},

{
id: "os-cchange",
track: "Operating Systems",
sub: "Bare metal vs Linux",
title: "What changes about your C when it runs on Linux",
mins: 20,
body: `
<p>The language is the same. Almost everything around it is different, and the differences are
where a bare-metal engineer gets caught.</p>

<h3>You are no longer the whole machine</h3>

<p>On a Cortex-M your code owns every cycle, every byte and every peripheral. Under Linux you are
one process among many, you are preempted without warning, and you cannot touch hardware at all.
That last one surprises people most: there is no writing to a peripheral register from userspace.
You go through <code>/dev</code>, <code>/sys</code>, or a kernel driver somebody has to write.</p>

<h3>main returns, and the return value matters</h3>

<p>Your bare-metal <code>main</code> never returns; if it did, the startup code traps in a loop.
Under Linux <code>main</code> returning is normal, and its value is the process exit code, which
is the interface to every script and CI system that will ever run your program. Zero is success.
Anything that prints an error and returns zero is a bug.</p>

<p>You also get <code>argc</code> and <code>argv</code>, an environment, and a working directory:
configuration that arrives at run time rather than being compiled in.</p>

<h3>Everything is a file descriptor</h3>

<p>A small integer refers to a file, a socket, a pipe, a serial port, a GPIO chip, a timer. The
same <code>read</code>, <code>write</code>, <code>close</code> and <code>poll</code> work on all
of them, which is why <code>epoll</code> can watch thousands of unrelated things at once. It is
the single most useful abstraction to absorb, and it has no bare-metal counterpart.</p>

<h3>errno, and its trap</h3>

<p>Most calls return -1 and set the global <code>errno</code>. The trap: <b>errno is only
meaningful immediately after a failure</b>. A successful call does not clear it, so checking it
without first checking the return value reads whatever went wrong earlier. It is thread-local, so
it is safe across threads, which is the one thing about it people worry about unnecessarily.</p>

<h3>Signals, which have no analogue you know</h3>

<p>The kernel can interrupt your process asynchronously: <code>SIGINT</code> from Ctrl-C,
<code>SIGTERM</code> asking you to shut down, <code>SIGSEGV</code> when you dereferenced
something you should not have. A handler is closer to an ISR than to a function, and the same
rules apply, harder: only async-signal-safe calls, so no <code>printf</code> and no
<code>malloc</code>. The usual pattern is to set a <code>volatile sig_atomic_t</code> flag and
handle it in the main loop, which should feel familiar.</p>

<h3>Memory stops being yours to place</h3>

<p>No linker script putting a buffer at <code>0x20000000</code>, no section attributes, no
counting bytes of RAM. <code>malloc</code> works and keeps working, because the address space is
virtual and fragmentation is handled for you. The habits change: dynamic allocation is normal
rather than banned, and the thing to watch is leaks rather than exhaustion.</p>

<h3>Linking, which is where the surprises live</h3>

<ul>
<li><b>Dynamic by default.</b> Your binary needs its shared libraries present at the right
versions on the target. <code>ldd</code> tells you what it wants.</li>
<li><b>glibc versus musl.</b> Most embedded roots use musl or uClibc for size, and a binary built
against glibc will not run there. This is a very common first hour of confusion.</li>
<li><b>Static linking</b> sidesteps both, at the cost of size, and is often the right answer for a
single application on a small image.</li>
</ul>
`,
quiz: [
{ q: "How does userspace code drive a peripheral register?",
o: ["By writing to its physical address directly", "It cannot: through /dev, /sys or a driver", "By mapping it with a privileged pointer", "Only from a thread running as root"],
a: 1, why: "The MMU and the privilege boundary make it impossible by design, which is the point. Even as root you go through a driver or an explicit mmap of /dev/mem." },
{ q: "When is errno meaningful?",
o: ["At any point after the call is made", "Only just after a call has failed", "Once it has been cleared and reread", "Only inside a single-threaded program"],
a: 1, why: "A successful call does not reset it, so reading it without first checking the return value gives you whatever failed earlier. It is thread-local, so threads are not the hazard." },
{ q: "Why can a signal handler not call printf?",
o: ["It runs before the standard library is up", "Only async-signal-safe calls are allowed", "The output stream may not exist yet", "Signals are delivered with interrupts off"],
a: 1, why: "It is an ISR by another name: it can interrupt the process mid-malloc or mid-printf, so re-entering those corrupts them. Set a volatile sig_atomic_t flag and act in the main loop." },
{ q: "A binary built on your desktop will not run on the target. What is the usual cause?",
o: ["The target processor is a different architecture", "glibc on the host against musl on the target", "The binary was statically rather than dynamically linked", "The target filesystem is mounted read-only"],
a: 1, why: "Most embedded roots use musl or uClibc for size and a glibc-linked binary will not start. ldd shows what it wants; static linking sidesteps it at the cost of size." }
],
interview: {
q: "You have written firmware for years. What surprises you first about writing C for Linux?",
a: "That you are no longer the whole machine. On a Cortex-M my code owns every cycle, every byte and every peripheral. Under Linux I am one process among many, I get preempted without warning, and I cannot touch hardware at all: no writing a peripheral register from userspace, it goes through /dev, /sys or a kernel driver somebody has to write. Then a few concrete things. main returns, and its value is the process exit code, which is the interface to every script and CI system that will run it, so printing an error and returning zero is a real bug. Everything is a file descriptor: files, sockets, pipes, serial ports, GPIO chips and timers all take the same read, write and poll, which is why epoll can watch thousands of unrelated things and which has no bare-metal counterpart. errno is only meaningful straight after a failure, because a successful call does not clear it, though being thread-local it is safe across threads. Signals are the closest thing to an ISR and the same discipline applies harder, so a handler sets a volatile sig_atomic_t and the main loop does the work. Memory stops being mine to place: no linker script pinning a buffer at 0x20000000, malloc is normal rather than banned, and the thing to watch becomes leaks rather than exhaustion. And the surprise that costs the most time is linking, where a binary built against glibc simply will not run on a musl rootfs."
}
}

);
