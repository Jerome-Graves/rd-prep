// Operating Systems track, batch 2: scheduling, synchronisation, deadlock.
//
// Three topics you half-know from FreeRTOS. The value here is the other half:
// what a general-purpose kernel does differently and why, because "how does
// Linux schedule versus how does FreeRTOS schedule" is the question that
// separates the two worlds.

LESSONS.push(

{
id: "os-sched",
track: "Operating Systems",
sub: "Fundamentals",
title: "Scheduling: fixed priority, round robin and fair share",
mins: 24,
body: `
<p>The scheduler answers one question: of the threads that are ready to run, which one runs next,
and for how long. Every difference between an RTOS and Linux comes from the fact that they are
optimising for opposite things.</p>

<ul>
<li>An <b>RTOS</b> optimises <b>worst-case latency</b>. It will happily starve a low-priority
task forever if that is what keeps the important one on time.</li>
<li>A <b>general-purpose OS</b> optimises <b>throughput and fairness</b>. It will not let
anything starve, and in exchange it can promise you nothing about the worst case.</li>
</ul>

<h3>Fixed priority preemptive, which you already use</h3>

<p>Every task has a priority. The highest-priority ready task runs. Full stop. If a higher one
becomes ready, it preempts immediately. Tasks of equal priority either round robin on a tick or
run to completion, depending on configuration.</p>

<p>It is trivially analysable, which is the point. With <b>rate monotonic</b> priority assignment,
shortest period gets the highest priority, and a set of periodic tasks is provably schedulable if
total utilisation stays under about 69%. You can prove your deadlines before you write the code.</p>

<h3>Round robin</h3>

<p>Equal shares in turn, each thread getting a time slice. Fair, simple, and useless on its own
for real time because a task's response depends on how many others exist.</p>

<h3>Linux CFS, and why it confuses people from your background</h3>

<p>The Completely Fair Scheduler does not have priorities in the sense you are used to. It tracks
<b>virtual runtime</b> for each thread: how much CPU it has consumed, weighted by its nice value.
The scheduler simply runs whichever thread has the lowest vruntime, so the one that has had least
CPU goes next.</p>

<p><code>nice</code> is a weight on that accounting, not a priority. A nice-19 thread still runs.
It just accumulates vruntime faster, so it is chosen less often. <b>Nothing starves</b>, which is
exactly the property that makes CFS unsuitable for a hard deadline.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Fixed priority preemptive always runs the highest ready task and can starve the lowest, while fair share runs whichever thread has had least CPU so nothing starves but nothing is guaranteed">
<rect class="bxa" x="24" y="26" width="300" height="40" rx="4"/>
<text class="th" x="40" y="52">Fixed priority preemptive</text>
<rect class="bx" x="24" y="74" width="300" height="128" rx="4"/>
<text class="ts" x="40" y="100">highest ready priority wins, always</text>
<text class="ts" x="40" y="122">preempts the instant it is ready</text>
<text class="ts" x="40" y="144">low priority can starve forever</text>
<text class="ts" x="40" y="166">worst case is provable</text>
<text class="ts" x="40" y="188">FreeRTOS, Zephyr, SCHED_FIFO</text>

<rect class="bxa" x="356" y="26" width="300" height="40" rx="4"/>
<text class="th" x="372" y="52">Fair share (CFS)</text>
<rect class="bx" x="356" y="74" width="300" height="128" rx="4"/>
<text class="ts" x="372" y="100">least virtual runtime wins</text>
<text class="ts" x="372" y="122">nice weights the accounting</text>
<text class="ts" x="372" y="144">nothing ever starves</text>
<text class="ts" x="372" y="166">worst case is not bounded</text>
<text class="ts" x="372" y="188">normal Linux userspace</text>
<text class="ts" x="24" y="230">Linux runs both. Real-time classes sit above CFS and are chosen first.</text>
</svg>

<h3>Linux does have real-time scheduling</h3>

<p>This is the part worth knowing, because it is where your two worlds meet. Linux has scheduling
<b>classes</b>, and they are consulted in order:</p>

<table>
<tr><th>Class</th><th>Behaviour</th></tr>
<tr><td><code>SCHED_DEADLINE</code></td><td>Earliest deadline first, with an admission test</td></tr>
<tr><td><code>SCHED_FIFO</code></td><td>Fixed priority 1 to 99, runs until it blocks or yields</td></tr>
<tr><td><code>SCHED_RR</code></td><td>As FIFO, but round robins between equal priorities</td></tr>
<tr><td><code>SCHED_OTHER</code></td><td>CFS. Everything normal.</td></tr>
</table>

<p>A <code>SCHED_FIFO</code> thread at priority 50 preempts every CFS thread on the machine and
behaves exactly like a FreeRTOS task. It will also lock the machine up if it spins, which is why
there is a runtime throttle by default.</p>

<h3>The answer to give</h3>

<p>"FreeRTOS is fixed-priority preemptive, so the highest ready task always runs and I can prove
my worst case. Linux defaults to CFS, which is fair-share by accumulated runtime, so nothing
starves and nothing is guaranteed. When I need RTOS behaviour under Linux I use SCHED_FIFO, pin
the thread to a core, and mlock its memory, because otherwise a page fault ruins the determinism
the scheduler just gave me."</p>
`,
quiz: [
{ q: "What is a fixed-priority preemptive scheduler optimising for?",
o: ["The total throughput of the system", "Worst-case latency for the top task", "Fairness between the runnable tasks", "The average response time overall"],
a: 1, why: "It will starve a low-priority task indefinitely to keep a high-priority one on time. That single-mindedness is what makes the worst case provable." },
{ q: "What does the nice value do under CFS?",
o: ["Sets a hard priority above other threads", "Weights how fast virtual runtime accrues", "Fixes the length of the thread's time slice", "Reserves a percentage of a CPU core"],
a: 1, why: "A nice-19 thread still runs; it just accumulates vruntime faster so it is picked less often. Nothing starves, which is why CFS cannot serve a hard deadline." },
{ q: "Which Linux scheduling class behaves like a FreeRTOS task?",
o: ["SCHED_OTHER, with a low nice value", "SCHED_FIFO, at a real-time priority", "SCHED_BATCH, for long-running work", "SCHED_IDLE, which runs when free"],
a: 1, why: "Fixed priority 1 to 99, preempts every CFS thread on the machine, and runs until it blocks or yields. It will also hang the box if it spins, hence the default runtime throttle." },
{ q: "Under rate monotonic assignment, which task gets the highest priority?",
o: ["The one with the shortest period", "The one that matters most to the product", "The one with the longest execution time", "Whichever was created first at startup"],
a: 0, why: "Shortest period wins, regardless of importance. It is a mathematical assignment, and it comes with a utilisation bound of about 69% below which the set is provably schedulable." }
],
interview: {
q: "How does scheduling on Linux differ from scheduling in an RTOS?",
a: "They optimise for opposite things. An RTOS is fixed-priority preemptive: the highest-priority ready task runs, full stop, and it will starve everything below it to keep that task on time. That single-mindedness is the point, because it makes the system analysable. With rate monotonic assignment, shortest period gets the highest priority, and a periodic task set is provably schedulable under about 69% utilisation, so you can prove your deadlines before writing the code. Linux defaults to CFS, which has no priorities in that sense. It tracks virtual runtime per thread, weighted by nice, and runs whichever has consumed least. Nothing starves, and in exchange nothing is guaranteed, which is exactly right for a desktop and useless for a control loop. What ties them together is that Linux has scheduling classes: SCHED_DEADLINE, SCHED_FIFO and SCHED_RR all sit above CFS. A SCHED_FIFO thread at priority 50 preempts every normal thread on the machine and behaves like a FreeRTOS task, and it will hang the machine if it spins, which is why there is a runtime throttle. So if I needed deterministic behaviour under Linux I would use SCHED_FIFO, pin the thread to a core, isolate that core, and mlockall the memory, because a page fault would otherwise destroy the determinism the scheduler just handed me."
}
},

{
id: "os-sync",
track: "Operating Systems",
sub: "Fundamentals",
title: "Mutexes, semaphores and what each is actually for",
mins: 22,
body: `
<p>These get treated as interchangeable and they are not. The distinction that matters is
<b>ownership</b>.</p>

<h3>Mutex: mutual exclusion, and it has an owner</h3>

<p>One thread takes it, the same thread releases it. The kernel knows who holds it, and that
single fact enables the thing that makes a mutex the right choice for protecting data:</p>

<p><b>Priority inheritance.</b> If a low-priority thread holds the mutex and a high-priority
thread blocks on it, the holder is temporarily boosted to the waiter's priority so it can finish
and release. Without that you get <b>priority inversion</b>, where a medium-priority thread that
wants neither preempts the holder and the high-priority thread waits on something unrelated.
That is the Mars Pathfinder bug.</p>

<h3>Semaphore: counting, and it has no owner</h3>

<p>A counter with two operations: take (decrement, block at zero) and give (increment, wake a
waiter). <b>Anyone can give it.</b> That is the whole difference, and it makes semaphores right
for a different job:</p>

<ul>
<li><b>Signalling.</b> An ISR gives; a task takes. The ISR did not "acquire" anything, so there
is nothing for it to release, and this is legal in a way a mutex never is.</li>
<li><b>Counting a resource.</b> Four DMA channels, semaphore initialised to four.</li>
</ul>

<h3>The mistake worth naming</h3>

<p>A binary semaphore used as a mutex compiles, runs, and looks fine. It has no owner, so it has
no priority inheritance, so you have reintroduced unbounded priority inversion into code that
looked correct. If you are protecting data, use a mutex. If you are signalling between contexts,
use a semaphore.</p>

<table>
<tr><th></th><th>Mutex</th><th>Semaphore</th></tr>
<tr><td>Has an owner</td><td>Yes</td><td>No</td></tr>
<tr><td>Released by</td><td>The taker only</td><td>Anyone</td></tr>
<tr><td>Priority inheritance</td><td>Yes</td><td>No</td></tr>
<tr><td>Usable from an ISR</td><td>No</td><td>Give, yes</td></tr>
<tr><td>Use it for</td><td>Protecting data</td><td>Signalling, counting</td></tr>
</table>

<h3>The others, briefly</h3>

<ul>
<li><b>Condition variable.</b> Wait until a predicate is true. Always paired with a mutex, and
always waited on in a <code>while</code> loop rather than an <code>if</code>, because wakeups can
be spurious and another thread may have consumed the condition first.</li>
<li><b>Spinlock.</b> Busy-waits instead of sleeping. Correct only where you cannot sleep, which
means inside the kernel or in an interrupt handler, and only when the hold time is shorter than
the cost of a context switch. Using one in userspace is nearly always wrong.</li>
<li><b>Atomics.</b> A single word updated indivisibly, no lock at all. Perfect for a counter or a
flag, and not a general substitute for a mutex.</li>
<li><b>Read-write lock.</b> Many readers or one writer. Worth it only when reads massively
dominate, because the bookkeeping is dearer than a plain mutex.</li>
</ul>

<h3>Why locking on Linux is cheaper than you would expect</h3>

<p>A <code>pthread_mutex_lock</code> on an uncontended mutex does not enter the kernel at all. It
is a compare-and-swap in userspace. Only when the lock is actually contended does it fall through
to a <b>futex</b> syscall to sleep. So the common case costs a few cycles and the syscall cost
appears only when you were going to wait anyway.</p>
`,
quiz: [
{ q: "What is the essential difference between a mutex and a semaphore?",
o: ["A semaphore can count above one", "A mutex has an owner and a semaphore does not", "A mutex is faster to take and release", "A semaphore cannot be shared between threads at all"],
a: 1, why: "Counting is a consequence, not the essence. Ownership is what lets the kernel boost the holder, which is why only a mutex can offer priority inheritance." },
{ q: "Why is a binary semaphore a poor substitute for a mutex?",
o: ["It is measurably slower to acquire", "No owner means no priority inheritance", "It cannot be taken from a normal task", "It permits only one waiter at a time"],
a: 1, why: "The code compiles and runs and looks correct, and you have quietly reintroduced unbounded priority inversion. That failure is the Mars Pathfinder bug." },
{ q: "Which primitive is right for an ISR telling a task that data arrived?",
o: ["A mutex, taken in the handler", "A semaphore the handler gives", "A spinlock held across the handler", "A condition variable signalled there"],
a: 1, why: "A handler cannot own or block, and a give has no owner, so it is legal. It is also why RTOS APIs have FromISR variants that never wait." },
{ q: "Why wait on a condition variable inside a while loop?",
o: ["The mutex must be retaken each time", "Wakeups can be spurious or already consumed", "It reduces the load on the scheduler", "The standard requires that construction"],
a: 1, why: "You can be woken without the predicate being true, or another thread can take the condition before you run. Re-checking is the only safe pattern." }
],
interview: {
q: "When would you use a mutex and when a semaphore?",
a: "The distinction is ownership. A mutex is taken and released by the same thread, and because the kernel knows who holds it, it can do priority inheritance: if a low-priority holder is blocking a high-priority waiter, the holder gets boosted so it can finish. Without that you get priority inversion, where a medium-priority thread that wants neither preempts the holder and the high-priority thread waits on something unrelated, which is the Mars Pathfinder bug. A semaphore is just a counter with no owner, so anyone can give it. That makes it right for signalling, typically an ISR giving and a task taking, because the handler never acquired anything and has nothing to release, and for counting a resource like four DMA channels. So: protecting shared data is a mutex, signalling between contexts or counting is a semaphore. The mistake I would call out in review is a binary semaphore used as a mutex. It compiles, it runs, it looks right, and it has silently removed priority inheritance from code that needed it. I would add that on Linux an uncontended pthread mutex never enters the kernel at all; it is a compare-and-swap in userspace and only falls through to a futex syscall when it actually has to wait."
}
},

{
id: "os-deadlock",
track: "Operating Systems",
sub: "Fundamentals",
title: "Deadlock, and the three things mistaken for it",
mins: 18,
body: `
<p>Deadlock is a specific thing with a specific definition, and being able to state it is most of
what the question is testing.</p>

<h3>The four conditions, all required</h3>

<p>Coffman's conditions. Deadlock needs <b>all four</b> at once, which is also the recipe for
preventing it: break any single one and deadlock becomes impossible.</p>

<ol>
<li><b>Mutual exclusion.</b> The resource cannot be shared.</li>
<li><b>Hold and wait.</b> A thread holds one resource while requesting another.</li>
<li><b>No preemption.</b> A resource cannot be taken away; it must be released voluntarily.</li>
<li><b>Circular wait.</b> A cycle exists: A waits on B, B waits on A.</li>
</ol>

<svg class="fig" viewBox="0 0 680 210" role="img" aria-label="Thread one holds lock A and waits for lock B while thread two holds lock B and waits for lock A, forming a cycle neither can escape">
<rect class="bxa" x="60" y="30" width="200" height="44" rx="4"/>
<text class="th" x="76" y="58">Thread 1</text>
<rect class="bx" x="60" y="82" width="200" height="70" rx="4"/>
<text class="ts" x="76" y="108">holds lock A</text>
<text class="ts" x="76" y="132">wants lock B</text>
<rect class="bxa" x="420" y="30" width="200" height="44" rx="4"/>
<text class="th" x="436" y="58">Thread 2</text>
<rect class="bx" x="420" y="82" width="200" height="70" rx="4"/>
<text class="ts" x="436" y="108">holds lock B</text>
<text class="ts" x="436" y="132">wants lock A</text>
<line class="arr" x1="264" y1="104" x2="416" y2="128" marker-end="url(#arrow)"/>
<line class="arr" x1="416" y1="104" x2="264" y2="128" marker-end="url(#arrow)"/>
<text class="ts" x="60" y="186">Neither will ever release. The system is not slow; it is stopped.</text>
</svg>

<h3>What you actually do about it</h3>

<p>In embedded and systems work the answer is almost always <b>prevention by lock ordering</b>,
which breaks circular wait. Every lock gets a rank, and a thread may only acquire in increasing
rank. It costs nothing at runtime, it is checkable by review, and Linux ships
<code>lockdep</code>, which watches acquisition order at runtime and shouts the moment two threads
disagree about it.</p>

<p>The alternatives are worse. Detection means building a wait-for graph and finding cycles, then
killing something. Avoidance means Banker's algorithm, which needs every thread to declare its
maximum resource claim up front and is essentially never used. Prevention is what ships.</p>

<p>The other practical measures: take one lock at a time where you can, use a timeout on the take
so a stuck thread is visible rather than silent, and put a watchdog behind the whole thing so a
deadlocked system reboots rather than sitting there.</p>

<h3>Three things people call deadlock that are not</h3>

<ul>
<li><b>Livelock.</b> Threads are running, and making no progress. Two people stepping aside for
each other in a corridor. CPU is busy, unlike deadlock, and a random backoff usually fixes it.</li>
<li><b>Starvation.</b> A thread never gets scheduled, but nothing is stuck in a cycle. Usually a
priority policy problem, and it is why CFS refuses to starve anything.</li>
<li><b>Priority inversion.</b> The high-priority thread <i>will</i> eventually run, and might wait
an unbounded time. Nothing is circular, so it is not deadlock, and the fix is priority
inheritance rather than lock ordering.</li>
</ul>

<p>Getting those apart matters, because the fixes are completely different and the symptom on a
bench looks the same: the product has stopped doing anything.</p>
`,
quiz: [
{ q: "How many of Coffman's conditions must hold for deadlock?",
o: ["Any one of the four is enough", "All four, at the same time", "At least two of the four", "Three, with circular wait optional"],
a: 1, why: "Which is exactly why prevention works: break any single one and deadlock cannot happen. Lock ordering breaks circular wait and costs nothing at runtime." },
{ q: "What is the usual practical defence in systems code?",
o: ["Detecting cycles in a wait-for graph", "A global lock ordering, checked by review", "Banker's algorithm over declared claims", "Giving every lock an equal priority"],
a: 1, why: "Every lock gets a rank and threads acquire in increasing rank, which breaks circular wait for free. Linux's lockdep watches the ordering at runtime and reports the first disagreement." },
{ q: "Threads are running hard and making no progress. What is that?",
o: ["Deadlock, since nothing completes", "Livelock, and the CPU is busy", "Starvation of the lowest priority", "Priority inversion via a held lock"],
a: 1, why: "Deadlock is blocked and idle; livelock is busy and useless, like two people repeatedly stepping aside for each other. A random backoff usually breaks it." },
{ q: "Why is priority inversion not deadlock?",
o: ["It only ever affects two threads", "There is no cycle; it does resolve", "The scheduler detects and clears it", "It cannot occur on a single core"],
a: 1, why: "The holder will finish eventually, so the waiter will run, though possibly far too late. Nothing is circular, and the fix is priority inheritance rather than lock ordering." }
],
interview: {
q: "What is deadlock, and how do you design against it?",
a: "Deadlock needs four conditions at once: mutual exclusion, hold and wait, no preemption, and circular wait. That is worth stating precisely because it is also the recipe for prevention. Break any one of the four and deadlock becomes impossible. In practice the one you break is circular wait, by giving every lock a rank and only ever acquiring in increasing rank. It costs nothing at runtime, a reviewer can check it, and Linux ships lockdep which watches acquisition order live and complains the first time two threads disagree. The alternatives are much worse: detection means building a wait-for graph and then killing something, and avoidance means Banker's algorithm with declared maximum claims, which nobody uses. Alongside the ordering I would take one lock at a time where possible, use a timeout on every take so a stuck thread becomes visible rather than silent, and keep a watchdog behind the whole system so a deadlocked product reboots instead of sitting there. I would also separate out three things that get called deadlock and are not. Livelock is threads running hard and achieving nothing, so the CPU is busy rather than idle, and a random backoff fixes it. Starvation is a scheduling policy problem with no cycle involved. And priority inversion resolves eventually, so it is not deadlock, and its fix is priority inheritance rather than lock ordering. The symptoms look identical on the bench, and the fixes have nothing in common."
}
}

);
