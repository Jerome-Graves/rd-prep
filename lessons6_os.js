// Operating Systems: kernel internals and drivers.
//
// The track had one driver lesson covering character devices and probe. This
// goes underneath that: how binding actually happens, interrupt handling, DMA
// and coherency, kernel allocation, the atomic-context rules, and how a driver
// is debugged once it is in the field.

LESSONS.push(

{
id: "os-drivermodel",
track: "Operating Systems",
sub: "Kernel internals and drivers",
title: "The driver model: buses, devices and how binding happens",
mins: 22,
body: `
<p>A Linux driver is never called directly. It is <b>bound</b> to a device by the kernel, and
understanding that mechanism explains most of the questions that begin "why is my probe function
not running".</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A bus holding lists of devices and drivers, with a match function pairing them and calling probe">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">the bus owns the matching</text>

<rect class="bx" x="40" y="76" width="220" height="130" rx="4"/>
<text class="th" x="56" y="102">devices</text>
<text class="ts" x="56" y="130">found from device tree,</text>
<text class="ts" x="56" y="152">enumeration, or hotplug</text>
<text class="ts" x="56" y="182">each has a compatible</text>
<text class="ts" x="56" y="200">string or an ID</text>

<rect class="bx" x="420" y="76" width="220" height="130" rx="4"/>
<text class="th" x="436" y="102">drivers</text>
<text class="ts" x="436" y="130">registered at module</text>
<text class="ts" x="436" y="152">load or at boot</text>
<text class="ts" x="436" y="182">each declares a table</text>
<text class="ts" x="436" y="200">of what it supports</text>

<rect class="bx" x="280" y="110" width="120" height="60" rx="4"/>
<text class="th" x="296" y="136">match</text>
<text class="ts" x="296" y="158">then probe</text>
</svg>

<p>Every device sits on a <b>bus</b>, and the bus type owns a match function. When either a new
device appears or a new driver registers, the bus tries to pair them. On a match it calls the
driver's <code>probe</code> with that device, and probe is where the driver claims resources and
brings the hardware up.</p>

<p>How the match is decided depends on the bus. PCI and USB match on vendor and product
identifiers read from the hardware itself, so enumeration is automatic. The <b>platform</b> bus,
which is where most memory-mapped peripherals on an embedded SoC live, cannot enumerate anything,
so the devices come from the device tree and matching is on the <code>compatible</code>
string.</p>

<p>That is the single most common failure. If probe never runs on an embedded target, the
question is almost always whether the compatible string in the device tree exactly matches one in
the driver's table. It is a string comparison with no fuzziness, and a driver that is not built,
or built as a module that was never loaded, produces exactly the same symptom.</p>

<p>The <b>separation</b> the model buys is worth appreciating. The same driver serves a peripheral
on any board, because everything board-specific, the addresses, the interrupt numbers, the clocks,
the pin configuration, arrives from the device tree rather than being compiled in. That is why a
mainline driver can support hundreds of boards it has never seen.</p>

<p>Two consequences follow for how you write one. Probe may be called for <b>several instances</b>
of the same device, so all state must live in a per-device structure rather than in globals. And
probe may be <b>deferred</b>: if a resource such as a regulator or a clock is not yet available,
returning the deferred-probe error tells the kernel to retry later, which is how ordering
dependencies are resolved without a fixed init order.</p>
`,
quiz: [
{ q: "What pairs a device with a driver?",
o: ["The kernel's init order", "The bus type's match function", "The device tree directly", "The module loader"],
a: 1, why: "The bus tries to pair whenever a device appears or a driver registers, and calls probe on a match. Each bus decides matching in its own way." },
{ q: "How does the platform bus match, and why?",
o: ["By vendor and product ID read from the hardware", "By compatible string, because it cannot enumerate", "By memory address ranges", "By the order devices appear in the device tree"],
a: 1, why: "PCI and USB read identifiers from the hardware, but a memory-mapped SoC peripheral announces nothing, so the description comes from the device tree." },
{ q: "Your probe function never runs on an embedded target. What is the most likely cause?",
o: ["The driver returned an error from init", "The compatible string does not match the driver's table", "The device tree was not compiled", "Interrupts are disabled at boot"],
a: 1, why: "It is an exact string comparison. A driver that was not built, or built as a module and never loaded, gives the identical symptom." },
{ q: "What does returning the deferred-probe error achieve?",
o: ["It disables the driver permanently", "The kernel retries later, once dependencies are available", "It forces the device tree to be reparsed", "It moves the driver earlier in the init order"],
a: 1, why: "It resolves ordering dependencies without a fixed init order, which is how a driver needing a clock or regulator that is not yet ready copes." }
],
interview: {
q: "Your driver's probe function is never called. How do you debug it?",
a: "I would work through the binding chain, because probe is only ever called by the bus after a successful match, so the failure is somewhere before that. First, is the driver actually present: built into the kernel, or built as a module that has been loaded. That sounds trivial and it accounts for a good share of these. Second, does the device exist as far as the kernel is concerned: on an embedded target that means checking the device tree node is present in the running system, since I can read the live device tree under sysfs, and confirming the node is not disabled by its status property, which is a very common one because many nodes ship disabled and are enabled per board. Third, and most likely, does the compatible string in the device tree exactly match an entry in the driver's ID table. It is a plain string comparison with no fuzziness, so a difference in a vendor prefix or a hyphen is enough to prevent binding, and nothing warns you. I can see whether the device and the driver have been bound by looking under sysfs at the bus's devices and drivers directories, and whether the device is sitting unbound. If everything matches and probe still does not run, I would check whether it is being deferred: a driver whose clock or regulator is not yet available returns the deferred-probe error and the kernel retries later, so it may bind eventually or never if that dependency never appears, and the deferred-probe list is visible from userspace. Beyond that I would enable the dynamic debug output for the driver core, which logs the match attempts and tells me directly what the bus decided."
}
},

{
id: "os-irq",
track: "Operating Systems",
sub: "Kernel internals and drivers",
title: "Interrupts in Linux: top halves, threads and latency",
mins: 24,
body: `
<p>An interrupt handler runs in a context with severe restrictions, and the reason for the
restrictions is that it has preempted something arbitrary. Understanding what that context forbids
is more useful than memorising which functions are safe.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The split between a short hard interrupt handler and deferred work in a softirq, tasklet, threaded handler or workqueue">
<rect class="bx" x="24" y="30" width="632" height="46" rx="4"/>
<text class="th" x="40" y="54">hard IRQ: acknowledge the device, grab what is urgent, return</text>
<text class="ts" x="40" y="72">cannot sleep, cannot allocate with GFP_KERNEL, interrupts may be off</text>

<rect class="bx" x="24" y="88" width="200" height="130" rx="4"/>
<text class="th" x="40" y="114">softirq / tasklet</text>
<text class="ts" x="40" y="142">still atomic</text>
<text class="ts" x="40" y="166">cannot sleep</text>
<text class="ts" x="40" y="196">very low latency</text>

<rect class="bx" x="240" y="88" width="200" height="130" rx="4"/>
<text class="th" x="256" y="114">threaded handler</text>
<text class="ts" x="256" y="142">runs in a kernel thread</text>
<text class="ts" x="256" y="166">MAY sleep</text>
<text class="ts" x="256" y="196">the usual choice</text>

<rect class="bx" x="456" y="88" width="200" height="130" rx="4"/>
<text class="th" x="472" y="114">workqueue</text>
<text class="ts" x="472" y="142">process context</text>
<text class="ts" x="472" y="166">may sleep freely</text>
<text class="ts" x="472" y="196">highest latency</text>
</svg>

<p>The <b>hard interrupt handler</b> must not sleep, because there is no process to put to sleep:
it has interrupted whatever was running, and blocking would block that unrelated thing. That one
fact implies everything else. It cannot take a mutex, because a mutex may sleep. It cannot
allocate memory in a way that may wait for reclaim. It cannot copy to or from userspace, because
that may fault.</p>

<p>So the handler should do the minimum: acknowledge the device so it stops asserting, capture
anything that would be lost, and defer the rest. Deferring is what the other mechanisms are for,
and they differ in how quickly they run and whether they may sleep.</p>

<p>A <b>threaded interrupt handler</b> is the modern default. You register a short primary handler
that acknowledges and returns a value asking for the thread, and the substantial work runs in a
kernel thread where sleeping is allowed. It has a priority, so it can be tuned, and under
PREEMPT_RT nearly all handlers become threaded anyway.</p>

<p><b>Shared interrupts</b> add one rule: when several devices share a line, each handler is
called and must check whether its own device actually asserted, returning a value that says
whether it handled anything. A handler that always claims the interrupt breaks the others, and
one that never claims it leads the kernel to disable the line as spurious.</p>

<p>Two failure modes are worth naming. A <b>level-triggered</b> interrupt that the handler fails
to clear at the device re-fires immediately and the system appears to hang, which is one of the
commonest bring-up symptoms. And an <b>interrupt storm</b>, from a floating line or a
misconfigured device, can starve everything else, which is why the kernel will disable a line that
fires continuously without being handled.</p>

<p>For latency, what matters is not the handler's average but the worst case, and the largest
contributors are usually long sections with interrupts disabled elsewhere in the kernel. That is
precisely what PREEMPT_RT reduces, and what the kernel's latency tracers measure.</p>
`,
quiz: [
{ q: "Why must a hard interrupt handler not sleep?",
o: ["It would miss the next interrupt", "There is no process to sleep; it preempted something arbitrary", "Sleeping is slower than polling", "The scheduler is disabled during interrupts"],
a: 1, why: "That single fact implies the rest: no mutexes, no allocation that may wait for reclaim, no copying to or from userspace." },
{ q: "What is the modern default for substantial interrupt work?",
o: ["A tasklet", "A threaded interrupt handler", "A workqueue", "Doing it all in the hard handler"],
a: 1, why: "A short primary handler acknowledges and asks for the thread, and the thread may sleep and has a tunable priority. Under PREEMPT_RT nearly all become threaded." },
{ q: "What must a handler on a shared interrupt line do?",
o: ["Always claim the interrupt", "Check whether its own device asserted, and report accordingly", "Disable the line while it runs", "Run in a workqueue rather than a thread"],
a: 1, why: "Always claiming breaks the other devices' handlers, and never claiming leads the kernel to disable the line as spurious." },
{ q: "What happens if a level-triggered interrupt is not cleared at the device?",
o: ["It is lost entirely", "It re-fires immediately and the system appears to hang", "The kernel converts it to edge triggered", "The handler runs once and the line is masked"],
a: 1, why: "It is one of the commonest bring-up symptoms, and reading a status register is often not enough to clear it; many peripherals need an explicit write." }
],
interview: {
q: "How would you structure the interrupt handling for a high-rate peripheral?",
a: "I would keep the hard interrupt handler as short as possible and defer everything else, because that handler runs in a context that has preempted something arbitrary and therefore cannot sleep, which rules out mutexes, most allocation, and any access to userspace. So in the hard handler I would acknowledge the device so it stops asserting, capture anything that would otherwise be lost such as a status word or a DMA pointer, and return. For the real work I would use a threaded interrupt handler, which is the modern default: the primary handler returns a value asking for the thread, and the thread runs in process context where it may sleep, take mutexes and allocate normally. It also has a priority I can tune, which matters if this peripheral has to win against other work. For a genuinely high rate I would avoid taking an interrupt per event at all, and use DMA into a ring with one interrupt per block, or a NAPI-style approach where the first interrupt disables further ones and the kernel polls the ring until it drains, since that is exactly how the network stack survives high packet rates. On correctness, if the line is shared I would make sure the handler checks whether my device actually asserted and reports honestly whether it handled anything, because always claiming breaks the other drivers and never claiming makes the kernel disable the line as spurious. And if the interrupt is level triggered I would be careful to clear it properly at the device, because reading a status register is often not sufficient and a handler that returns with the source still asserted re-enters immediately, which looks exactly like a hang."
}
},

{
id: "os-dma",
track: "Operating Systems",
sub: "Kernel internals and drivers",
title: "DMA: addresses, coherency and scatter-gather",
mins: 24,
body: `
<p>DMA lets a device move data without the processor touching every byte, which is what makes
high throughput possible at all. It also introduces two problems that do not exist for ordinary
memory access: the device sees different addresses, and it writes behind the cache.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The CPU seeing virtual addresses, the kernel physical addresses, and the device seeing bus addresses possibly translated by an IOMMU">
<rect class="bx" x="24" y="30" width="632" height="42" rx="4"/>
<text class="th" x="40" y="52">CPU: virtual address, translated by the MMU</text>
<rect class="bx" x="24" y="80" width="632" height="42" rx="4"/>
<text class="th" x="40" y="102">kernel: physical address</text>
<rect class="bx" x="24" y="130" width="632" height="42" rx="4"/>
<text class="th" x="40" y="152">device: bus address, possibly translated again by an IOMMU</text>
<rect class="bxa" x="24" y="180" width="632" height="50" rx="4"/>
<text class="th" x="40" y="204">these are three different numbers</text>
<text class="ts" x="40" y="222">handing a device a pointer from kmalloc without mapping it is the classic bug</text>
</svg>

<p>The <b>address</b> problem comes first. A kernel virtual address is not what the device needs,
and on a system with an IOMMU the device's view is translated again. The DMA API exists to hide
this: you map a buffer and receive a DMA address valid for that device, and you unmap when you
are finished. Passing a raw pointer to hardware happens to work on simple systems and fails as
soon as there is an IOMMU or a memory offset.</p>

<p>The <b>coherency</b> problem is the one that produces intermittent bugs. The device writes to
memory without going through the CPU's cache, so a cached copy the processor holds is stale.
Reading before invalidating gives old data; writing a buffer and starting a transfer before
flushing gives the device old data.</p>

<p>There are two ways to handle it. <b>Coherent</b> allocation gives a buffer that hardware and
processor see consistently, either because the platform is cache coherent or because the mapping
is uncached. It is simple and, when uncached, slow for the CPU to access, so it suits small
descriptor rings.</p>

<p><b>Streaming</b> mappings map an existing buffer for a single transfer, in a stated direction,
and the API performs the necessary cache maintenance at map and unmap. It is the efficient choice
for bulk data, and it carries an ownership rule: between mapping and unmapping the buffer belongs
to the device and the CPU must not touch it. Violating that is the classic source of a bug that
appears only under load.</p>

<p><b>Scatter-gather</b> handles the fact that a large userspace buffer is contiguous in virtual
memory and scattered in physical memory. You build a list of segments, map the list, and a capable
device walks it. A device without that capability needs a contiguous physical buffer, which on a
long-running system may simply be unobtainable, which is what the contiguous memory allocator
exists to reserve in advance.</p>

<p>Finally, every device has a <b>DMA mask</b> stating how many address bits it can drive. Get it
wrong and the kernel either bounces buffers through a low-memory copy, quietly costing
performance, or the device writes to the wrong place.</p>
`,
quiz: [
{ q: "Why can a driver not hand a kmalloc pointer straight to a device?",
o: ["The buffer may be swapped out", "The device needs a bus address, not a kernel virtual address", "kmalloc memory is always cached", "The buffer is not page aligned"],
a: 1, why: "It happens to work on simple systems and fails as soon as there is an IOMMU or an address offset, which is why the DMA API exists." },
{ q: "What is the ownership rule for a streaming DMA mapping?",
o: ["The CPU may read but not write", "Between map and unmap the buffer belongs to the device", "The buffer must not be freed until reboot", "Only one thread may access it"],
a: 1, why: "Touching it in that window bypasses the cache maintenance the API performs, which is the classic source of a bug that only appears under load." },
{ q: "When is a coherent allocation the right choice?",
o: ["For bulk data transfers", "For small, frequently accessed structures such as descriptor rings", "Whenever the platform has an IOMMU", "For buffers coming from userspace"],
a: 1, why: "It is simple and, where the mapping is uncached, slow for the CPU, so it suits small structures rather than bulk data." },
{ q: "What does the DMA mask tell the kernel?",
o: ["Which interrupts the device may raise", "How many address bits the device can drive", "How large a transfer the device supports", "Whether the device is cache coherent"],
a: 1, why: "Set it wrong and the kernel either bounces buffers through a low-memory copy, quietly costing performance, or the device writes somewhere it should not." }
],
interview: {
q: "A driver using DMA works most of the time but corrupts data occasionally. Where would you look?",
a: "Intermittent corruption with DMA is almost always cache coherency or a violated ownership rule, so that is where I would start rather than suspecting the hardware. The device writes to memory without going through the CPU's cache, so if the processor holds a cached copy of that buffer it is stale, and reading it before the mapping is unmapped or synced gives old data. In the other direction, if I fill a buffer and start a transfer before the cache is flushed, the device reads old data. The DMA API performs that maintenance at map and unmap, or at the explicit sync calls, so the question is whether the driver is respecting the rule: between mapping a streaming buffer and unmapping it, the buffer belongs to the device and the CPU must not touch it. Code that peeks at a status field in the buffer while a transfer is in flight will work on a coherent platform and corrupt on a non-coherent one, which is exactly the profile of a bug that appears occasionally or only on one board variant. The second thing I would check is the addresses, that the driver is using a DMA address obtained from the API rather than a kernel pointer, because passing a raw pointer works on simple systems and breaks with an IOMMU or an address offset. Then the DMA mask, because if it understates or overstates the device's addressing the kernel either bounces through a copy or lets the device write out of range. And I would look at buffer lifetime, since a buffer freed or reused while a transfer is still outstanding produces exactly this symptom. Turning on the DMA debug infrastructure in the kernel is worth doing early, because it catches mismatched maps and unmaps and API misuse directly."
}
},

{
id: "os-kernelmem",
track: "Operating Systems",
sub: "Kernel internals and drivers",
title: "Kernel memory: kmalloc, vmalloc and the allocators",
mins: 20,
body: `
<p>Allocation in the kernel is not one thing. The allocators differ in whether the memory is
physically contiguous, how large a request they serve, and whether the call may sleep, and
choosing wrongly produces failures that only appear after the system has been running for a
while.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="kmalloc giving physically contiguous memory with a size limit, vmalloc giving virtually contiguous memory of any size, and the page allocator underneath both">
<rect class="bx" x="24" y="30" width="308" height="180" rx="4"/>
<text class="th" x="40" y="58">kmalloc</text>
<text class="ts" x="40" y="86">physically contiguous</text>
<text class="ts" x="40" y="110">fast, small allocations</text>
<text class="ts" x="40" y="140">usable for DMA</text>
<text class="th" x="40" y="176">fails when memory is</text>
<text class="th" x="40" y="196">fragmented</text>

<rect class="bx" x="348" y="30" width="308" height="180" rx="4"/>
<text class="th" x="364" y="58">vmalloc</text>
<text class="ts" x="364" y="86">virtually contiguous only</text>
<text class="ts" x="364" y="110">any size, page granular</text>
<text class="ts" x="364" y="140">NOT usable for DMA</text>
<text class="th" x="364" y="176">slower: page tables</text>
<text class="th" x="364" y="196">and TLB pressure</text>
</svg>

<p><b>kmalloc</b> returns memory that is contiguous in physical as well as virtual address space,
which is what a device performing DMA requires. That contiguity is also its limitation: as the
system runs, physical memory fragments, and a large contiguous request becomes progressively
harder to satisfy. A driver that allocates a large buffer at probe time succeeds at boot and may
fail if the module is loaded later.</p>

<p><b>vmalloc</b> assembles pages that are contiguous only in the virtual address space. Any size
is available and fragmentation does not matter, at the cost of page table setup, extra TLB
pressure, and being unusable for DMA on a device that does not have an IOMMU.</p>

<p>Beneath both sits the <b>page allocator</b>, which hands out physically contiguous blocks in
powers of two using a buddy scheme, and the <b>slab</b> allocator, which carves those pages into
same-sized objects. That is why allocating many objects of one type is efficient and why the
kernel exposes its own caches for frequently used structures.</p>

<p>The <b>allocation flags</b> matter as much as the choice of allocator. The kernel flag permits
sleeping, so it may wait for reclaim and is what you use in process context. The atomic flag does
not sleep, draws on an emergency reserve and is far more likely to fail, and it is what you must
use in interrupt context. Using the sleeping flag in an atomic context is a genuine bug that may
not fail immediately.</p>

<p>Two habits prevent most driver memory problems. Use the <b>managed</b> allocation functions,
whose allocations are freed automatically when the device is removed or probe fails, since the
error paths in probe are where leaks hide. And treat every allocation as able to fail, because in
the kernel there is no exception to unwind and a missing check becomes a null dereference in a
context that takes the machine down.</p>
`,
quiz: [
{ q: "What does kmalloc guarantee that vmalloc does not?",
o: ["That the allocation cannot fail", "Physical contiguity, which DMA requires", "A larger maximum size", "That the memory is zeroed"],
a: 1, why: "Contiguity is also its limitation, since physical memory fragments as the system runs and large contiguous requests become harder to satisfy." },
{ q: "Why can vmalloc memory not normally be used for DMA?",
o: ["It is always uncached", "It is only contiguous in virtual address space", "It cannot be pinned", "It is allocated from high memory"],
a: 1, why: "A device without an IOMMU sees physical addresses, so a buffer that is scattered physically is not a single region as far as the device is concerned." },
{ q: "Which allocation flag must be used in interrupt context?",
o: ["The one permitting sleep, so the allocation succeeds", "The atomic one, which does not sleep", "Either, since the allocator detects the context", "Neither; allocation is forbidden entirely"],
a: 1, why: "The atomic flag draws on a reserve and is much more likely to fail, which is why interrupt handlers should preallocate wherever they can." },
{ q: "Why use the managed allocation functions in a driver?",
o: ["They are faster than the plain versions", "Allocations are freed automatically on remove or probe failure", "They cannot fail", "They allow larger allocations"],
a: 1, why: "The error paths in probe are exactly where leaks hide, and tying the lifetime to the device removes that whole class of bug." }
],
interview: {
q: "A driver allocates a large buffer and it sometimes fails on a system that has been up for weeks. Why?",
a: "That is the signature of physical memory fragmentation, and it tells me the driver is using kmalloc or the page allocator for something large. kmalloc gives memory that is contiguous in physical address space as well as virtual, which is what a device doing DMA needs, and that contiguity is exactly what becomes hard to find as a system runs, because pages get allocated and freed and the free memory ends up scattered even when there is plenty of it in total. So the allocation succeeds at boot when memory is fresh and fails weeks later, which is a horrible failure mode because it will not reproduce on the bench. There are several ways out depending on what the buffer is for. If the device does not actually need physical contiguity, because the system has an IOMMU or the device supports scatter-gather, then I would use vmalloc or a scatter-gather list and the problem disappears entirely. If it genuinely needs a large contiguous physical region, then I would reserve it at boot, which is what the contiguous memory allocator exists for, rather than trying to obtain it later. Alternatively I would allocate it once at probe and keep it for the lifetime of the device rather than allocating and freeing repeatedly. I would also check the allocation flags, because using the atomic flag draws on a small emergency reserve and fails far more readily than the sleeping flag, and if that call is in a context where it could sleep then it should. And whatever the fix, I would make sure the failure is handled properly, because in the kernel a missing check on an allocation becomes a null dereference that takes the whole machine down."
}
},

{
id: "os-sleep",
track: "Operating Systems",
sub: "Kernel internals and drivers",
title: "Atomic context, sleeping, and the rules you cannot break",
mins: 20,
body: `
<p>The single most useful question when writing kernel code is: <b>can this code sleep here?</b>
Almost every rule about which function may be called where follows from the answer, and most
kernel bugs by new authors are a violation of it.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Process context where sleeping is allowed, against atomic contexts where it is forbidden">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">process context: may sleep</text>
<rect class="bx" x="24" y="72" width="308" height="150" rx="4"/>
<text class="ts" x="40" y="100">a syscall on behalf of a task</text>
<text class="ts" x="40" y="124">a workqueue item</text>
<text class="ts" x="40" y="148">a threaded IRQ handler</text>
<text class="th" x="40" y="188">mutexes, allocation, copy</text>
<text class="th" x="40" y="210">to and from userspace</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">atomic context: must not sleep</text>
<rect class="bx" x="348" y="72" width="308" height="150" rx="4"/>
<text class="ts" x="364" y="100">hard interrupt handler</text>
<text class="ts" x="364" y="124">softirq or tasklet</text>
<text class="ts" x="364" y="148">holding a spinlock</text>
<text class="th" x="364" y="188">spinlocks and atomic</text>
<text class="th" x="364" y="210">allocation only</text>
</svg>

<p><b>Process context</b> means there is a task the kernel can put to sleep and reschedule, so
blocking is legitimate. That covers a system call executing on behalf of a process, a workqueue
item, and the threaded half of an interrupt handler.</p>

<p><b>Atomic context</b> means there is not: an interrupt handler has preempted something
unrelated, a softirq is running on borrowed time, and holding a spinlock means another CPU is
actively spinning waiting for you. Sleeping in any of these either has nothing to sleep, or
deadlocks whoever is spinning.</p>

<p>That gives the rules directly. A <b>mutex</b> may sleep, so it cannot be taken in atomic
context; a <b>spinlock</b> does not, which is why it is the primitive available there. Memory
allocation with the sleeping flag may wait for reclaim, so atomic code must use the atomic flag
and accept a much higher chance of failure. Copying to or from userspace may fault and therefore
sleep, so it is process context only.</p>

<p>The rule that catches people is that <b>holding a spinlock makes you atomic</b> even in code
that would otherwise be free to sleep. So a function that is perfectly correct in a system call
becomes a bug when a caller takes a spinlock around it, and the bug lives at the call site rather
than in the function.</p>

<p>The kernel will tell you, if you ask it to. Building with the sleep-in-atomic debug option
turns these into a loud warning with a stack trace at the moment of the violation, which is
enormously more useful than the intermittent deadlock you would otherwise chase. It belongs in
every development build.</p>

<p>The design consequence is to keep atomic sections <b>short and simple</b>. Take the spinlock,
manipulate the shared state, release it, and do anything substantial outside. That is easier to
reason about than working out whether every function you call might sleep somewhere three levels
down.</p>
`,
quiz: [
{ q: "What defines process context?",
o: ["Code running in userspace", "There is a task that can be slept and rescheduled", "Interrupts are enabled", "The code is in a kernel module"],
a: 1, why: "A system call on behalf of a process, a workqueue item and a threaded IRQ handler all qualify, and all may block legitimately." },
{ q: "Why can a mutex not be taken in an interrupt handler?",
o: ["It is too slow", "A mutex may sleep, and there is nothing to sleep", "Mutexes are not available to modules", "The handler already holds one"],
a: 1, why: "A spinlock does not sleep, which is why it is the primitive available in atomic context, at the cost of spinning another CPU." },
{ q: "What does holding a spinlock do to the code inside it?",
o: ["Nothing, if the code was already safe", "It makes that code atomic, so it must not sleep", "It disables interrupts on all cores", "It prevents preemption only on that core"],
a: 1, why: "A function that is correct in a system call becomes a bug when a caller takes a spinlock around it, and the bug lives at the call site." },
{ q: "How do you catch sleep-in-atomic violations reliably?",
o: ["Code review of every call path", "Enable the kernel's sleep-in-atomic debug option", "Run under a thread sanitizer", "Test under heavy load"],
a: 1, why: "It produces a warning with a stack trace at the moment of the violation, which is far more useful than chasing an intermittent deadlock later." }
],
interview: {
q: "What rules govern what a driver can do in different kernel contexts?",
a: "It comes down to one question: can this code sleep here. In process context there is a task the kernel can put to sleep and reschedule, so blocking is legitimate, and that covers a system call executing on behalf of a process, a workqueue item, and the threaded half of an interrupt handler. In atomic context there is no such task: a hard interrupt handler has preempted something unrelated, a softirq is running on borrowed time, and if I hold a spinlock then another CPU may be actively spinning waiting for me. Sleeping in any of those either has nothing to sleep or deadlocks whoever is spinning. Every specific rule follows from that. A mutex can sleep so it is process context only, and a spinlock cannot, which is why it is the primitive available in atomic context. Memory allocation with the sleeping flag may wait for reclaim, so atomic code has to use the atomic flag and accept a much higher failure rate, which is why interrupt paths preallocate. Copying to or from userspace can fault and therefore sleep, so it is process context only. The one that catches people is that holding a spinlock makes the code inside it atomic even if that code would otherwise be free to sleep, so a function that is perfectly correct when called from a system call becomes a bug when someone wraps a spinlock around the call, and the bug is at the call site rather than in the function. Practically I do two things: keep atomic sections short and do anything substantial outside them, and always build development kernels with the sleep-in-atomic debug option on, because it turns a violation into an immediate warning with a stack trace instead of an intermittent deadlock weeks later."
}
},

{
id: "os-driverdebug",
track: "Operating Systems",
sub: "Kernel internals and drivers",
title: "Debugging a driver, including in the field",
mins: 22,
body: `
<p>Kernel debugging is different from userspace debugging in one respect that shapes everything:
a mistake takes the whole system down, and a system that has gone down cannot tell you much. The
techniques are therefore weighted towards leaving evidence rather than towards interactive
inspection.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Techniques ordered from always-on logging through dynamic debug and tracing to interactive debugging">
<rect class="bx" x="24" y="30" width="632" height="42" rx="4"/>
<text class="th" x="40" y="52">printk and the kernel log: always there, survives a crash if persisted</text>
<rect class="bx" x="24" y="80" width="632" height="42" rx="4"/>
<text class="th" x="40" y="102">dynamic debug: enable per-file or per-function at run time, no rebuild</text>
<rect class="bx" x="24" y="130" width="632" height="42" rx="4"/>
<text class="th" x="40" y="152">ftrace and tracepoints: what the kernel did, with almost no overhead</text>
<rect class="bx" x="24" y="180" width="632" height="42" rx="4"/>
<text class="th" x="40" y="202">kgdb and JTAG: interactive, and usually impractical on a deployed target</text>
</svg>

<p>Reading an <b>oops</b> is the core skill. It gives the faulting address, the register state, and
a call trace. The line that matters most is the instruction pointer with its symbol and offset,
because that plus the disassembly identifies the exact instruction. A null dereference shows as a
very small faulting address; a wild pointer shows as an implausible one.</p>

<p>The distinction between an <b>oops</b> and a <b>panic</b> is worth knowing: an oops kills the
offending task and may leave the system limping, while a panic stops it. An oops that leaves locks
held or memory in an inconsistent state is not recoverable in any meaningful sense, so a system
that has oopsed should be treated as unreliable however well it appears to run.</p>

<p><b>Dynamic debug</b> is the tool that most improves day-to-day work: debug statements compiled
into the kernel can be enabled at run time by file, function or line, so you can turn on exactly
the driver you care about on a running system without rebuilding or rebooting.</p>

<p>For anything involving timing or ordering, <b>ftrace</b> is the right tool: function tracing to
see the call path, tracepoints in the subsystems, and the latency tracers for questions about
when something ran. It has almost no overhead when idle, which is what makes it usable in
production.</p>

<p>Getting evidence off a device that crashed is its own problem, and it needs designing in
advance. A <b>persistent log</b> in reserved RAM that survives a warm reboot, or a crash dump
written to storage, is what turns "it rebooted overnight" into a stack trace. Without it, a field
crash yields nothing at all.</p>

<p>Two options belong in every development build: the sleep-in-atomic checks, the locking
validator that detects a potential deadlock the first time an inconsistent lock order is taken
rather than when it eventually happens, and the memory debugging that catches use-after-free. They
cost performance and they find bugs that testing would not.</p>
`,
quiz: [
{ q: "What does the instruction pointer in an oops give you?",
o: ["The address of the process that crashed", "The exact faulting instruction, via symbol and offset", "The address of the memory that was corrupted", "The line number in the source file"],
a: 1, why: "That plus the disassembly identifies exactly where it went wrong. A tiny faulting address suggests a null dereference and an implausible one a wild pointer." },
{ q: "What is the difference between an oops and a panic?",
o: ["An oops is a warning and a panic is an error", "An oops kills the task and may limp on; a panic stops the system", "An oops occurs in modules and a panic in the core kernel", "There is no practical difference"],
a: 1, why: "A system that has oopsed may have left locks held or state inconsistent, so it should be treated as unreliable however well it appears to run." },
{ q: "What makes dynamic debug so useful?",
o: ["It adds no code to the kernel image", "Debug statements can be enabled per file or function at run time", "It works without kernel symbols", "It captures a full crash dump"],
a: 1, why: "You can turn on exactly the driver you care about on a running system with no rebuild and no reboot, which changes the pace of driver work." },
{ q: "What turns a field crash into usable evidence?",
o: ["A serial console left connected", "A persistent log in reserved RAM or a crash dump to storage", "Enabling every debug option in production", "Increasing the log level"],
a: 1, why: "It has to be designed in advance. Without it, a device that rebooted overnight yields nothing at all." }
],
interview: {
q: "A device in the field reboots occasionally and you cannot attach a debugger. How do you find the cause?",
a: "The constraint is that I have to leave evidence rather than inspect interactively, so my first question is whether the device is already capturing anything across the reboot. If it is not, that is the first change I would make: a persistent log in reserved memory that survives a warm reset, or a crash dump written to storage, so that the next occurrence produces an oops with a call trace rather than just a reboot. Without that I am guessing. Assuming I get a trace, the key lines are the faulting address and the instruction pointer with its symbol and offset, because that plus the disassembly tells me the exact instruction, and the shape of the faulting address is informative on its own, since a very small value suggests a null dereference and an implausible one suggests a wild pointer or a use-after-free. The call trace then tells me the path. Alongside that I would want to know whether it is really a crash or a watchdog reset, because those need different investigations, and whether it correlates with anything: load, temperature, a particular operation, time since boot. In parallel I would try to reproduce it on a bench unit with a kernel built with the debug options that testing does not otherwise exercise: the locking validator, which flags an inconsistent lock order the first time it is taken rather than when it eventually deadlocks, the sleep-in-atomic checks, and the memory debugging that catches use-after-free. Those cost performance and find exactly this class of bug. And if I can raise the rate of whatever I suspect, to turn a weekly failure into an hourly one, that is usually worth more than any tooling."
}
}

);
