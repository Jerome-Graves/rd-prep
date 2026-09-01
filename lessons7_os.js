// Operating Systems: memory management.
//
// The track had one lesson on virtual memory and the MMU. This is the rest of
// the subject: what a page fault costs, how userspace allocation really works,
// what happens under memory pressure, mmap and zero copy, finding leaks and
// fragmentation, and caches.

LESSONS.push(

{
id: "os-paging",
track: "Operating Systems",
sub: "Memory management",
title: "Page tables, the TLB, and what a page fault costs",
mins: 22,
body: `
<p>Every memory access your program makes goes through a translation, and the cost of that
translation is invisible until it is not. Understanding the mechanism explains a whole class of
performance results that otherwise look like magic.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A virtual address split into indices walking a multi-level page table to a physical frame, with the TLB caching the result">
<rect class="bx" x="24" y="24" width="632" height="44" rx="4"/>
<text class="th" x="40" y="50">virtual address = index, index, index, offset within the page</text>

<rect class="bx" x="24" y="86" width="196" height="60" rx="4"/>
<text class="th" x="40" y="112">level 1 table</text>
<text class="ts" x="40" y="134">one memory read</text>
<rect class="bx" x="240" y="86" width="196" height="60" rx="4"/>
<text class="th" x="256" y="112">level 2 table</text>
<text class="ts" x="256" y="134">another read</text>
<rect class="bx" x="456" y="86" width="200" height="60" rx="4"/>
<text class="th" x="472" y="112">level 3, then the frame</text>
<text class="ts" x="472" y="134">and another</text>

<rect class="bxa" x="24" y="164" width="632" height="62" rx="4"/>
<text class="th" x="40" y="190">the TLB caches completed translations</text>
<text class="ts" x="40" y="212">a hit costs nothing; a miss costs a walk; a fault costs a trap into the kernel</text>
</svg>

<p>A virtual address is split into a series of indices and a page offset. The hardware walks a
tree of page tables, each level costing a memory read, and arrives at a physical frame. On a
64-bit system that is typically four levels, so an unaided translation is four extra memory
accesses for every one you asked for.</p>

<p>The <b>TLB</b> is what makes that acceptable: it caches completed translations, and a hit costs
essentially nothing. The consequence is that memory access performance depends on how many
distinct pages you touch, not just how many bytes. A program striding through a large array with a
big step touches a new page every access, misses the TLB every time, and runs far slower than the
byte count suggests.</p>

<p><b>Huge pages</b> attack this directly: one entry covering two megabytes instead of four
kilobytes covers five hundred times as much memory with the same TLB entry. For a large working
set that can be a substantial win, at the cost of coarser granularity and more waste.</p>

<p>A <b>page fault</b> is what happens when the translation is not merely uncached but absent.
Not all faults are equal, and the distinction matters. A <b>minor</b> fault is resolved without
touching storage: the page is already in memory, perhaps in the page cache or shared with another
process, and only the mapping needs creating. A <b>major</b> fault requires reading from storage
and costs orders of magnitude more.</p>

<p>Faults are not a pathology. <b>Demand paging</b> means a freshly executed program maps its
binary and faults pages in as they are touched, so start-up reads only what is used.
<b>Copy-on-write</b> means fork shares every page read-only and copies one only when written,
which is what makes forking a large process cheap. Both trade a fault for work not done.</p>

<p>For a real-time system the picture inverts: a fault is an unbounded delay you cannot schedule
around, which is why real-time code locks its pages into memory up front and pre-faults its stack,
accepting the cost once rather than at an unpredictable moment.</p>
`,
quiz: [
{ q: "Why can a program's speed depend on how many pages it touches rather than how many bytes?",
o: ["Pages are read from storage individually", "Each new page risks a TLB miss and a page table walk", "The cache line size equals the page size", "Larger strides use more bandwidth"],
a: 1, why: "A large stride touches a new page every access, misses the TLB each time and pays a multi-level walk, which is invisible in the byte count." },
{ q: "What is the difference between a minor and a major page fault?",
o: ["Minor faults occur in userspace, major in the kernel", "A minor fault is resolved without touching storage", "A minor fault is recoverable and a major one is not", "Major faults only occur on write"],
a: 1, why: "The page may already be in the page cache or shared with another process, so only the mapping needs creating. A major fault reads storage and costs far more." },
{ q: "What does copy-on-write achieve at fork?",
o: ["It halves memory usage permanently", "Pages are shared read-only and copied only when written", "It avoids creating a new page table", "It prevents the child from modifying memory"],
a: 1, why: "It is what makes forking a large process cheap: the cost is a fault on first write rather than a full copy up front." },
{ q: "Why does real-time code lock its pages into memory?",
o: ["To reduce total memory usage", "A page fault is an unbounded delay that cannot be scheduled around", "Locked pages are cached more aggressively", "It prevents other processes from evicting them"],
a: 1, why: "It also pre-faults the stack, paying the cost once at start-up rather than at an unpredictable moment during a deadline." }
],
interview: {
q: "Explain what happens when a process accesses memory that is not resident.",
a: "The access itself goes through the MMU, which splits the virtual address into a series of indices and walks a multi-level page table to find the physical frame. If the translation is already in the TLB that costs nothing, and if it is not, the hardware pays a walk of several memory reads. If the page table entry says the page is not present at all, the hardware raises a page fault, which traps into the kernel, and the kernel decides what to do based on why. If the address is not part of any valid mapping the process gets a segmentation fault. If it is a valid mapping, the kernel resolves it, and how expensive that is depends on the kind of fault. A minor fault is resolved without touching storage: the page might already be in the page cache because another process has the file open, or it might be an anonymous page that just needs a zeroed frame, or it might be a copy-on-write page that needs duplicating because this is the first write. A major fault means the data has to be read from storage, and that is orders of magnitude more expensive, which is why the ratio of minor to major faults is the number I look at when diagnosing a slow system rather than the total. Once resolved, the kernel installs the mapping and returns to the faulting instruction, which re-executes and now succeeds. The reason this design is worth the cost is demand paging and copy-on-write: a program starts by mapping its binary and faulting in only the pages it actually uses, and fork shares everything read-only rather than copying it, so both trade an occasional fault for a great deal of work not done. The exception is real-time code, where an unbounded fault is unacceptable, so it locks its pages in and pre-faults its stack up front."
}
},

{
id: "os-malloc",
track: "Operating Systems",
sub: "Memory management",
title: "How userspace allocation actually works",
mins: 22,
body: `
<p>Between your call to allocate and the kernel giving you memory sits an allocator with its own
policies, and most surprising memory behaviour in an application comes from that layer rather than
from the kernel.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Application calls into the C library allocator, which requests memory from the kernel in large chunks and reuses it">
<rect class="bx" x="24" y="26" width="632" height="42" rx="4"/>
<text class="th" x="40" y="52">application: many small allocations and frees</text>
<rect class="bxa" x="24" y="80" width="632" height="70" rx="4"/>
<text class="th" x="40" y="106">C library allocator: bins, arenas, per-thread caches</text>
<text class="ts" x="40" y="132">reuses freed memory; rarely returns it to the kernel</text>
<rect class="bx" x="24" y="162" width="632" height="64" rx="4"/>
<text class="th" x="40" y="188">kernel: hands out address space in large chunks</text>
<text class="ts" x="40" y="212">physical pages arrive later, on first touch</text>
</svg>

<p>The allocator asks the kernel for memory in <b>large chunks</b>, either by extending the heap
or by mapping a region, and then serves your requests from those chunks. Freeing returns memory to
the allocator, not usually to the kernel, which is why a process's resident size very often does
not fall after a large free.</p>

<p>That single fact explains the most common false alarm in memory work: a program frees a great
deal and the operating system still reports the same usage. It is not a leak, it is the allocator
holding the memory ready for reuse, which is usually the right thing to do.</p>

<p>The kernel adds its own layer of laziness. An allocation gives you <b>address space</b>, and
physical pages are attached on first touch. So a large allocation is nearly free until used, and a
program can be granted more memory than exists, which is what <b>overcommit</b> means and why an
allocation succeeding is not a guarantee that touching it will.</p>

<p><b>Fragmentation</b> is the failure mode that matters in long-running systems. Free memory
exists but not in the contiguous shape being asked for, so usage creeps upward even though the
program is balanced in what it allocates and frees. A pattern of mixed sizes with different
lifetimes is the classic cause.</p>

<p>Real allocators do a lot to reduce contention as well as fragmentation: <b>per-thread caches</b>
so most allocations never take a lock, <b>size classes</b> so same-sized objects are served from
the same pool, and separate handling for large requests, which typically get their own mapping and
are returned to the kernel directly when freed.</p>

<p>For embedded work the decisive question is often different: not how fast the allocator is, but
whether the timing is <b>bounded</b>. General allocators have no useful worst case, which is why
safety-critical and hard real-time code allocates everything up front, or uses fixed-size pools
whose allocation is a constant-time list operation.</p>
`,
quiz: [
{ q: "Why does a process's memory usage often not fall after freeing a lot of memory?",
o: ["The kernel updates the figure lazily", "The allocator keeps the memory for reuse rather than returning it", "The pages are still in the page cache", "Freed memory becomes swap"],
a: 1, why: "It is the commonest false alarm in memory work. Holding the memory ready for reuse is usually the right behaviour, not a leak." },
{ q: "What does overcommit mean?",
o: ["Allocating more than a process needs", "The kernel grants more address space than there is memory", "Multiple processes sharing one page", "Reserving swap in advance"],
a: 1, why: "Physical pages attach on first touch, so an allocation succeeding is not a guarantee that touching it will succeed later." },
{ q: "What is the signature of heap fragmentation?",
o: ["Allocation becomes slower over time", "Usage creeps up although allocations and frees are balanced", "Free returns an error", "The page cache grows without bound"],
a: 1, why: "Free memory exists but not in the contiguous shape requested, and mixed sizes with different lifetimes is the classic cause." },
{ q: "Why do hard real-time systems avoid the general allocator?",
o: ["It uses too much memory", "Its timing has no useful bound", "It is not thread safe", "It cannot allocate large blocks"],
a: 1, why: "They allocate everything up front, or use fixed-size pools where allocation is a constant-time list operation with a known worst case." }
],
interview: {
q: "A long-running service slowly grows in memory but valgrind reports no leaks. What is going on?",
a: "If the leak checkers are clean then the memory is still reachable, so I would stop thinking about leaks in the strict sense and consider three other explanations. The first and most likely is fragmentation. The allocator serves requests from large chunks it obtained from the kernel, and if the program allocates a mixture of sizes with different lifetimes, free memory ends up scattered in pieces that are not the shape of the next request, so the allocator asks the kernel for more even though its total free space is large. The program is balanced in what it allocates and frees, and usage still creeps up. That is characteristic of long-running services and it fits the symptom exactly. The second is simply that freed memory is not returned to the kernel. The allocator holds it for reuse, so the resident size stays at the high-water mark, which looks like growth if the workload has occasional spikes. That one plateaus rather than growing indefinitely, so I would check whether the growth is genuinely unbounded or just approaching a peak. The third is unbounded caching, which is a real leak in effect but not one a checker will flag, because everything is still reachable from a cache or a list that nothing ever trims. To distinguish them I would look at the allocator's own statistics rather than the operating system's figure, since that tells me how much it holds free versus how much is in use, and if in-use is flat while total grows it is fragmentation. Heap profiling by allocation site tells me if something is accumulating. And if it is fragmentation, the fixes are to make allocation sizes more uniform, use pools for the offending object type, or switch to an allocator with better fragmentation behaviour."
}
},

{
id: "os-pressure",
track: "Operating Systems",
sub: "Memory management",
title: "Memory pressure: reclaim, swap and the OOM killer",
mins: 22,
body: `
<p>What a system does as it runs out of memory is one of the more consequential things to
understand about it, because the behaviour is rarely a clean failure and on an embedded device it
frequently looks like something else entirely.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Escalation from dropping clean page cache, to writing back dirty pages and swapping, to thrashing, to the OOM killer">
<rect class="bx" x="24" y="24" width="632" height="42" rx="4"/>
<text class="th" x="40" y="50">1. drop clean page cache: nearly free, but re-reads cost later</text>
<rect class="bx" x="24" y="74" width="632" height="42" rx="4"/>
<text class="th" x="40" y="100">2. write back dirty pages, swap anonymous memory out</text>
<rect class="bx" x="24" y="124" width="632" height="42" rx="4"/>
<text class="th" x="40" y="150">3. thrashing: the system spends its time paging, not working</text>
<rect class="bxa" x="24" y="174" width="632" height="52" rx="4"/>
<text class="th" x="40" y="200">4. OOM killer: choose a victim and kill it</text>
<text class="ts" x="40" y="218">the machine survives; your process does not</text>
</svg>

<p>The first response is <b>reclaim</b>, and the cheapest memory to reclaim is clean page cache:
file data that can be dropped because an identical copy is on storage. This is why free memory on
a healthy system is always low. Memory used for cache is not wasted, and a monitoring alarm on low
free memory is usually measuring the wrong thing.</p>

<p>When clean pages run out, reclaim gets more expensive: dirty pages have to be written back, and
anonymous memory, which has no file behind it, has to be written to <b>swap</b> if there is any.
The <b>swappiness</b> setting expresses the balance between evicting file pages and swapping
anonymous ones.</p>

<p>Many embedded systems have no swap, and that changes the shape of failure. Anonymous memory
cannot be evicted at all, so the only reclaimable memory is file-backed, which includes the pages
of running executables. The system ends up evicting code and immediately faulting it back in, and
the visible symptom is that everything becomes slow and unresponsive with the storage active,
which people usually misdiagnose as a storage or CPU problem.</p>

<p>The <b>OOM killer</b> is the last resort. It scores processes, largely on memory use adjusted
by a tunable bias, and kills one. The important points are that it protects the machine rather
than your application, that the victim is often not the culprit, and that on a device the killed
process may be the one thing that mattered. Setting the bias on critical processes is a legitimate
design decision.</p>

<p>Worse than being killed is being <b>nearly</b> out: a system thrashing at the edge is often
less useful than one that has failed cleanly, because it responds to nothing while never quite
crossing the threshold. On a product it is frequently better to detect pressure early, using the
kernel's pressure metrics, and shed load or restart deliberately, rather than wait for the
kernel's own decision.</p>
`,
quiz: [
{ q: "Why is low free memory on a healthy Linux system not a problem?",
o: ["The figure is inaccurate", "Most of it is clean page cache, reclaimable at almost no cost", "Free memory is reserved for the kernel", "The kernel reports free memory after reclaim"],
a: 1, why: "Memory used for cache is not wasted, which is why an alarm on low free memory is usually measuring the wrong thing." },
{ q: "What changes about memory pressure on a system with no swap?",
o: ["The OOM killer never runs", "Anonymous memory cannot be evicted, so only file pages including code can be", "Reclaim becomes faster", "Dirty pages are dropped rather than written back"],
a: 1, why: "The system evicts executable pages and immediately faults them back, which looks like a storage or CPU problem rather than a memory one." },
{ q: "What is the OOM killer's purpose?",
o: ["To free memory for the process that requested it", "To protect the machine, even at the cost of a process", "To kill the process that allocated most recently", "To trigger a controlled reboot"],
a: 1, why: "The victim is often not the culprit, and on a device it may be the one process that mattered, which is why biasing critical processes is a real design decision." },
{ q: "Why can a thrashing system be worse than one that has failed?",
o: ["It corrupts data", "It responds to nothing while never crossing the failure threshold", "It damages the storage device", "It disables the OOM killer"],
a: 1, why: "Detecting pressure early from the kernel's metrics and shedding load or restarting deliberately is often better than waiting for the kernel's own decision." }
],
interview: {
q: "An embedded Linux device becomes unresponsive after several days. How would you investigate?",
a: "My first hypothesis would be memory pressure, because that failure mode matches the symptom particularly well on a device with no swap, and it develops over days rather than immediately. What happens is that as memory fills, the kernel reclaims, and the cheapest thing to reclaim is clean page cache. With no swap the anonymous memory of running processes cannot be evicted at all, so the only reclaimable memory is file-backed, and that includes the pages of the executables themselves. The system ends up evicting code and immediately faulting it straight back in from flash, so it spends its time paging rather than working. Everything is slow, the storage is busy, and it looks like a storage or CPU problem, which is why it gets misdiagnosed. To confirm it I would look at the memory breakdown over time, specifically whether anonymous memory is growing and cache is being squeezed towards nothing, and at the major fault rate, because a high major fault rate with an idle workload is the tell. The kernel's pressure stall metrics say directly how much time is being lost to memory, which is the cleanest signal. I would also check whether the OOM killer has fired, because a device that killed something days ago may have been limping since. If it is memory, the next question is what is growing, which is a matter of tracking per-process usage over time and then heap profiling the offender, remembering that unbounded caches and fragmentation both look like growth without being leaks. On the product side I would argue for detecting pressure early and acting on it, shedding load or restarting a component deliberately, rather than waiting for the kernel to choose a victim, because a device thrashing at the edge is less useful than one that failed cleanly and recovered."
}
},

{
id: "os-mmap",
track: "Operating Systems",
sub: "Memory management",
title: "mmap, shared memory and zero copy",
mins: 22,
body: `
<p>Mapping memory rather than copying it removes work from the fast path, and it is the mechanism
behind a surprising number of things: file access, shared libraries, inter-process communication,
and userspace access to hardware registers.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Read copying from page cache to a user buffer, against mmap giving the process direct access to the page cache pages">
<rect class="bx" x="24" y="26" width="308" height="196" rx="4"/>
<text class="th" x="40" y="52">read</text>
<text class="ts" x="40" y="82">storage to page cache</text>
<text class="ts" x="40" y="106">page cache to your buffer</text>
<text class="ts" x="40" y="130">one copy per call</text>
<text class="ts" x="40" y="166">simple, predictable,</text>
<text class="ts" x="40" y="188">errors reported at the call</text>

<rect class="bxa" x="348" y="26" width="308" height="196" rx="4"/>
<text class="th" x="364" y="52">mmap</text>
<text class="ts" x="364" y="82">storage to page cache</text>
<text class="ts" x="364" y="106">page cache mapped in</text>
<text class="ts" x="364" y="130">no copy at all</text>
<text class="ts" x="364" y="166">faults, not calls</text>
<text class="ts" x="364" y="188">I/O errors arrive as signals</text>
</svg>

<p>An ordinary read moves data from storage into the page cache and then copies it into your
buffer. <b>mmap</b> maps those page cache pages into your address space instead, so there is no
second copy and no system call per access. Access to an unresident page faults, the kernel brings
it in, and your instruction resumes.</p>

<p>That makes mapping attractive for large files, random access patterns, and repeated access. It
is less attractive for streaming a file once, where the fault-per-page overhead exceeds the copy
it saved, and for small files, where setting up and tearing down the mapping dominates.</p>

<p>Two properties catch people out. Errors surface as <b>signals</b> rather than return values, so
a storage error or a truncated file becomes a fault at an arbitrary instruction rather than an
error you can check. And the mapping's <b>size is fixed at creation</b>, so a file that another
process shortens leaves you with a mapping over pages that no longer exist.</p>

<p>The same call underpins <b>shared memory</b>: two processes mapping the same object see the
same physical pages, which is the fastest inter-process channel there is because after setup there
is no kernel involvement at all. That is also its cost, since it provides no synchronisation, so
you must supply your own, and no protection against a misbehaving peer corrupting the region.</p>

<p>In embedded work mapping is also how userspace reaches <b>hardware</b>: a driver implements a
map operation and the application maps device registers or a DMA buffer directly, which is how
frame buffers, camera pipelines and high-rate acquisition avoid copying every frame through the
kernel.</p>

<p>The general idea, <b>zero copy</b>, appears throughout the system: sending a file to a socket
without moving it through userspace, splicing between descriptors, or passing buffers by handle
between processes rather than by value.</p>
`,
quiz: [
{ q: "What does mmap avoid compared with read?",
o: ["The transfer from storage", "The copy from page cache into a user buffer", "Page faults", "The page cache entirely"],
a: 1, why: "The page cache pages are mapped into your address space directly, so there is no second copy and no system call per access." },
{ q: "When is read preferable to mmap?",
o: ["For random access to a large file", "For streaming a file once, or for small files", "When several processes share the data", "When the file is on flash"],
a: 1, why: "The fault-per-page overhead exceeds the copy it saved for a single sequential pass, and mapping setup dominates for small files." },
{ q: "How do I/O errors surface on a mapped file?",
o: ["As an error return from the access", "As a signal at an arbitrary instruction", "They are retried silently", "The mapping is unmapped automatically"],
a: 1, why: "There is no call to return an error from, so a storage error or a file truncated by another process becomes a fault where you cannot easily check for it." },
{ q: "What does shared memory not provide?",
o: ["Speed", "Synchronisation between the processes", "A common physical page set", "Persistence of the mapping"],
a: 1, why: "It is the fastest channel because after setup the kernel is not involved, and that is exactly why you must supply your own synchronisation." }
],
interview: {
q: "When would you use mmap rather than read, and what are the risks?",
a: "I would reach for mmap when the access pattern is random, when the file is large, when the same data is read repeatedly, or when several processes need the same data, because in all of those cases it avoids the copy from the page cache into a user buffer and avoids a system call per access. Shared mappings between processes are the strongest case, since two processes mapping the same object see the same physical pages and after setup there is no kernel involvement at all, which makes it the fastest inter-process channel available. In embedded work it is also how userspace reaches hardware, with a driver implementing a map operation so an application can access device registers or a DMA buffer directly, which is what makes camera and acquisition pipelines viable without copying every frame. I would not use it for streaming a file once, because the per-page fault overhead is worse than the single copy it saves, nor for small files, where setting up and tearing down the mapping dominates. The risks are worth being explicit about. Errors arrive as signals rather than return values, so a storage error or a file truncated by another process turns into a fault at an arbitrary instruction rather than something I can check, and that needs either a signal handler or a guarantee about the file's stability. The mapping size is fixed when it is created, so shrinking files are a real hazard. Shared memory gives no synchronisation whatsoever, so I have to provide my own, and it gives no protection either, so a misbehaving peer can corrupt the region. And on a system with limited address space or under memory pressure, large mappings interact with reclaim in ways that plain reads do not."
}
},

{
id: "os-leaks",
track: "Operating Systems",
sub: "Memory management",
title: "Finding leaks, growth and where memory actually went",
mins: 22,
body: `
<p>"The system is using too much memory" is a question about measurement before it is a question
about code, because the obvious numbers are misleading and several very different problems share
one symptom.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Virtual size, resident size and proportional set size compared, showing how shared pages are counted">
<rect class="bx" x="24" y="26" width="632" height="58" rx="4"/>
<text class="th" x="40" y="52">virtual size: address space reserved</text>
<text class="ts" x="40" y="74">includes memory never touched; almost always meaningless</text>
<rect class="bx" x="24" y="96" width="632" height="58" rx="4"/>
<text class="th" x="40" y="122">resident: physical pages currently mapped</text>
<text class="ts" x="40" y="144">counts shared pages in full, in every process that maps them</text>
<rect class="bxa" x="24" y="166" width="632" height="58" rx="4"/>
<text class="th" x="40" y="192">proportional: shared pages divided among sharers</text>
<text class="ts" x="40" y="214">the only one that sums sensibly across processes</text>
</svg>

<p>Start with the right number. <b>Virtual size</b> counts address space that may never have been
touched and is almost always the wrong figure. <b>Resident</b> size counts shared pages, including
every library, in full for each process that maps them, so adding it up across processes
overcounts badly. <b>Proportional</b> size divides shared pages among their sharers and is the
only one that totals sensibly.</p>

<p>Then separate the cases, because they need different fixes. A <b>true leak</b> is memory that
is no longer reachable, and the sanitizers and leak checkers find it directly. Growth that is
still reachable is a <b>logical leak</b>: a cache with no eviction, a list that only ever gets
appended to, a subscription never removed. No checker will report it, because nothing is
technically wrong.</p>

<p><b>Fragmentation</b> is the third case, where the program is balanced but the allocator cannot
reuse what it holds, and it is distinguished by comparing what the allocator says is in use with
what the process holds from the kernel. If in-use is flat and the total grows, it is
fragmentation.</p>

<p>The most useful tool for the reachable cases is a <b>heap profiler</b> that attributes live
memory to allocation sites, so you get a ranked list of what is holding memory now rather than a
list of what leaked. Comparing two snapshots taken an hour apart isolates growth immediately.</p>

<p>Do not forget the memory that is not in the heap. <b>Kernel</b> allocations on behalf of a
process, socket buffers, open file descriptors, and above all <b>thread stacks</b>, which are
often megabytes each by default, can dominate. A process creating threads without bound grows
steadily with a completely clean heap profile.</p>

<p>On a constrained device the strongest practice is to measure continuously rather than
investigate after the fact: record memory per process over time as part of normal telemetry, so
that growth is visible as a trend long before it becomes a failure, and so you can tell which
release introduced it.</p>
`,
quiz: [
{ q: "Why is resident size misleading when summed across processes?",
o: ["It excludes the page cache", "Shared pages are counted in full in every process that maps them", "It includes untouched address space", "It is updated only at intervals"],
a: 1, why: "Proportional size divides shared pages among their sharers and is the only figure that totals sensibly across a system." },
{ q: "What is a logical leak?",
o: ["Memory freed twice", "Memory still reachable but never released, such as an unevicted cache", "A leak reported only under load", "Memory lost to fragmentation"],
a: 1, why: "No leak checker will report it because nothing is technically wrong: a cache with no eviction or a list only ever appended to is working as written." },
{ q: "How do you distinguish fragmentation from a leak?",
o: ["Fragmentation only occurs with threads", "Compare allocator in-use against what the process holds from the kernel", "Fragmentation shows in virtual size only", "Run the leak checker twice"],
a: 1, why: "If in-use is flat while the total the process holds grows, the allocator is unable to reuse what it has rather than the program losing memory." },
{ q: "What non-heap source often dominates a process's memory?",
o: ["The page cache", "Thread stacks, often megabytes each", "Environment variables", "The executable's text section"],
a: 1, why: "A process creating threads without bound grows steadily with a completely clean heap profile, which sends people looking in the wrong place." }
],
interview: {
q: "How would you track down memory growth in a service running on a constrained device?",
a: "I would start by making sure I am measuring the right thing, because the obvious numbers mislead. Virtual size includes address space that may never have been touched, so it is nearly always the wrong figure. Resident size counts shared pages in full in every process that maps them, so summing it across processes overcounts heavily. Proportional set size divides shared pages among their sharers and is the one that totals sensibly, so that is what I would trend. Next I would separate the three problems that share this symptom, because they need different fixes. A true leak, where memory is unreachable, is what the sanitizers and leak checkers find directly, and if one reports something that is the easy case. A logical leak, where the memory is still reachable from a cache that never evicts or a list that only ever grows, will not be reported by any checker because nothing is technically wrong, and that is where a heap profiler earns its keep: it attributes live memory to allocation sites, so comparing two snapshots an hour apart shows me exactly what is accumulating. Fragmentation is the third, and I would distinguish it by comparing the allocator's own in-use figure against what the process holds from the kernel, because if in-use is flat while the total grows then the allocator simply cannot reuse what it has. I would also check outside the heap, since kernel allocations on the process's behalf, socket buffers, file descriptors, and especially thread stacks, which are often megabytes each, can dominate, and an unbounded thread count grows steadily with a perfectly clean heap profile. On a device the thing I would actually push for is continuous measurement as part of normal telemetry, so growth appears as a trend weeks before it becomes a failure and I can tell which release introduced it, rather than investigating after a field unit has already fallen over."
}
},

{
id: "os-cache",
track: "Operating Systems",
sub: "Memory management",
title: "Caches: coherency, maintenance and false sharing",
mins: 22,
body: `
<p>Caches are transparent until something else writes to memory, and then they are the source of
bugs that appear on one board and not another. On an embedded system the programmer is far more
likely to have to think about them explicitly than on a desktop.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Two CPUs with caches kept coherent by hardware, and a DMA device writing to memory outside that coherency">
<rect class="bx" x="24" y="26" width="180" height="70" rx="4"/>
<text class="th" x="40" y="52">CPU 0 cache</text>
<text class="ts" x="40" y="76">coherent by hardware</text>
<rect class="bx" x="216" y="26" width="180" height="70" rx="4"/>
<text class="th" x="232" y="52">CPU 1 cache</text>
<text class="ts" x="232" y="76">coherent by hardware</text>
<rect class="bxa" x="416" y="26" width="240" height="70" rx="4"/>
<text class="th" x="432" y="52">DMA device</text>
<text class="ts" x="432" y="76">often NOT coherent</text>

<rect class="bx" x="24" y="112" width="632" height="52" rx="4"/>
<text class="th" x="40" y="140">main memory</text>

<rect class="bxa" x="24" y="178" width="632" height="48" rx="4"/>
<text class="th" x="40" y="206">software must maintain what hardware does not</text>
</svg>

<p>Between processors, coherency is normally handled in <b>hardware</b>: a protocol ensures that a
write on one core is visible to another, so ordinary shared-memory programming works without
explicit maintenance. What hardware coherency does not give you is <b>ordering</b>, which is why
memory barriers and atomics still matter.</p>

<p>Devices are the problem. A DMA engine on many embedded SoCs writes to memory <b>without</b>
participating in the coherency protocol, so the processor's cached copy is stale after a device
write, and a device reads stale data if the processor's write is still in the cache. This is why
DMA requires explicit invalidate and clean operations, and why the DMA API performs them for
you.</p>

<p>The two operations are worth keeping straight. <b>Invalidate</b> discards cached copies so the
next read comes from memory, and is what you do before reading a buffer the device wrote.
<b>Clean</b>, or flush, writes dirty lines out to memory, and is what you do after filling a
buffer before the device reads it. Getting them the wrong way round produces corruption in one
direction only, which is a useful diagnostic clue.</p>

<p><b>False sharing</b> is the performance version of the same physics. Two cores writing to
different variables that happen to occupy one cache line cause that line to bounce between them,
and throughput collapses even though the program is logically independent. The fix is padding or
alignment so that independently written data lands on separate lines.</p>

<p>Caches also shape <b>predictability</b>, which matters for real-time work. A cache miss is far
slower than a hit, so worst-case timing must assume misses, and some systems lock critical code or
data into cache, or reserve a portion of it, precisely to remove that variability.</p>

<p>Finally, self-modifying or newly loaded <b>code</b> needs attention on architectures with split
instruction and data caches: writing instructions through the data path leaves the instruction
cache unaware, so the sequence has to clean the data cache and invalidate the instruction cache.
That is what a JIT, a bootloader, or a firmware loader has to do.</p>
`,
quiz: [
{ q: "What does hardware cache coherency between processors not provide?",
o: ["Visibility of one core's write to another", "Ordering, which still requires barriers and atomics", "Correct data after a DMA write", "Coherency across power states"],
a: 1, why: "Coherency ensures a write becomes visible; it does not constrain the order in which independent writes become visible, which is what barriers are for." },
{ q: "Which operation do you perform before reading a buffer a device wrote?",
o: ["Clean, to write dirty lines out", "Invalidate, so the next read comes from memory", "Both, in that order", "Neither, if the buffer is aligned"],
a: 1, why: "Clean is what you do after filling a buffer before the device reads it. Getting them the wrong way round corrupts in one direction only, which is a clue." },
{ q: "What is false sharing?",
o: ["Two processes mapping the same page", "Two cores writing different variables in the same cache line", "A cache line shared between instruction and data caches", "Sharing a buffer without synchronisation"],
a: 1, why: "The line bounces between the cores and throughput collapses even though the program is logically independent. Padding or alignment fixes it." },
{ q: "Why must a firmware loader do cache maintenance after writing code?",
o: ["To make the code position independent", "Instructions written through the data path leave the instruction cache unaware", "To ensure the code is contiguous", "To mark the pages executable"],
a: 1, why: "With split instruction and data caches the sequence has to clean the data cache and then invalidate the instruction cache, which is what a JIT does too." }
],
interview: {
q: "When does an embedded programmer have to think about caches explicitly?",
a: "Mostly at the boundary where something other than the processor touches memory, because between cores coherency is handled in hardware and ordinary shared-memory code works without any maintenance. The big case is DMA. On many embedded SoCs a DMA engine writes to memory without participating in the coherency protocol, so after a device write the processor's cached copy is stale, and if the processor fills a buffer and the write is still sitting in cache then the device reads old data. That is why you invalidate before reading a buffer the device wrote and clean before letting the device read a buffer you filled, and getting those the wrong way round corrupts in exactly one direction, which is a useful clue when debugging. In practice the DMA API does this for me if I use it properly and respect the rule that between map and unmap the buffer belongs to the device. The second case is writing code at run time, which a bootloader, a firmware loader or a JIT does: on an architecture with split instruction and data caches, instructions written through the data path leave the instruction cache unaware, so I have to clean the data cache and invalidate the instruction cache before jumping to it. The third is performance rather than correctness, and that is false sharing, where two cores writing to different variables that happen to share a cache line make that line bounce between them and throughput collapses even though the code is logically independent. Padding or aligning independently written data to separate lines fixes it. And for real-time work caches matter for predictability, because worst-case timing has to assume misses, which is why some systems lock critical code or data into cache to remove the variability."
}
}

);
