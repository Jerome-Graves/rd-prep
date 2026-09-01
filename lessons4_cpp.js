// C++ lessons: the Concurrency section, which had a single lesson.
//
// For a senior embedded or systems role this is one of the most likely areas
// to be probed in depth, so it is built out properly here: the memory model,
// the synchronisation primitives, the task-based abstractions, and the two
// things people reach for too early, which are lock-free structures and
// hand-rolled thread pools.

LESSONS.push(

{
id: "cpp-memmodel",
track: "C++",
sub: "Concurrency",
title: "The memory model: what a data race actually means",
mins: 24,
body: `
<p>Before C++11 the language said nothing about threads, so multithreaded code was defined by
your compiler and your platform. The memory model changed that by defining, precisely, when one
thread is guaranteed to see another thread's writes.</p>

<p>The central definition is <b>happens-before</b>. If write A happens-before read B, then B is
guaranteed to see A. If there is no happens-before relationship between two accesses to the same
location and at least one is a write, that is a <b>data race</b>, and a data race is undefined
behaviour, not merely an unpredictable value.</p>

<svg class="fig" viewBox="0 0 680 260" role="img" aria-label="Two threads with a release store and an acquire load establishing a happens-before edge, so everything written before the release is visible after the acquire">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">a release and a matching acquire create the edge</text>

<rect class="bx" x="40" y="76" width="270" height="150" rx="4"/>
<text class="th" x="56" y="102">thread A</text>
<text class="ts" x="56" y="130">data = 42;</text>
<text class="ts" x="56" y="154">more writes here</text>
<text class="th" x="56" y="188">flag.store(true, release)</text>
<text class="ts" x="56" y="212">everything above is published</text>

<line class="ln" x1="310" y1="185" x2="370" y2="130"/>

<rect class="bx" x="370" y="76" width="270" height="150" rx="4"/>
<text class="th" x="386" y="102">thread B</text>
<text class="th" x="386" y="130">flag.load(acquire)</text>
<text class="ts" x="386" y="160">if it saw true, then</text>
<text class="ts" x="386" y="186">data == 42 is guaranteed</text>
<text class="ts" x="386" y="212">and so is everything else A wrote</text>
</svg>

<p>That distinction matters. Because a race is undefined behaviour, the compiler is entitled to
assume it never happens, and it optimises on that basis. Reasoning about "which value will I
get" is the wrong frame; the answer is that the program has no defined meaning at all.</p>

<p>The orderings are worth knowing by name. <b>Sequentially consistent</b> is the default and
gives a single total order all threads agree on, which is the easiest to reason about and the
most expensive on weakly ordered hardware. <b>Acquire and release</b> pair up: everything written
before a release store is visible to a thread that performs an acquire load of that same
variable and sees the stored value. <b>Relaxed</b> gives atomicity and nothing else, no ordering
with respect to anything.</p>

<p>Relaxed is right for a counter whose value you read later, such as a statistic. It is wrong
for a flag that publishes data, because the data writes can be reordered past it and the reader
sees the flag without the payload. That specific mistake is the classic broken lock-free
publish.</p>

<p>Two practical points. First, <code>volatile</code> is not a threading tool: it constrains the
compiler's elision of accesses and says nothing about other cores or about tearing. Second, the
model is what makes <b>thread sanitizer</b> possible, because a race is now a well-defined thing
a tool can detect. Running your tests under it is the single highest-value concurrency practice
available.</p>
`,
quiz: [
{ q: "What is a data race, in the language's terms?",
o: ["Two threads accessing the same variable at once", "Unsynchronised access where at least one is a write, and it is undefined behaviour", "A read that observes a stale value", "Two threads competing for the same lock"],
a: 1, why: "Two concurrent reads are not a race. And because it is undefined behaviour rather than an unpredictable value, the compiler may assume it never occurs." },
{ q: "What do acquire and release orderings establish together?",
o: ["That the operations execute in program order", "A happens-before edge, so writes before the release are visible after the acquire", "Mutual exclusion between the two threads", "That the value is written to main memory immediately"],
a: 1, why: "That pairing is what publishes data safely. The release makes prior writes visible to any thread that acquires and observes the stored value." },
{ q: "When is memory_order_relaxed appropriate?",
o: ["For a flag that publishes data written before it", "For a counter whose value is only read later", "Whenever performance matters more than correctness", "For any variable accessed by a single thread"],
a: 1, why: "It gives atomicity with no ordering, so it suits a statistic. Using it for a publishing flag lets the data writes be reordered past it." },
{ q: "Why is volatile not a substitute for atomic?",
o: ["It is slower on most compilers", "It constrains the compiler but says nothing about other cores or tearing", "It cannot be applied to integers", "It prevents the variable being cached at all"],
a: 1, why: "It is a tool for memory-mapped hardware, where the access itself has a side effect. It provides neither atomicity nor any ordering between threads." }
],
interview: {
q: "What does the C++ memory model give you?",
a: "It defines when one thread is guaranteed to see another thread's writes, which before C++11 was left entirely to the compiler and the platform. The central concept is happens-before: if a write happens-before a read, the read is guaranteed to see it, and if two accesses to the same location have no happens-before relationship between them and at least one is a write, that is a data race. The important part is that a race is undefined behaviour rather than an unpredictable value, so asking which value I will get is the wrong question; the program simply has no defined meaning, and the compiler is entitled to optimise on the assumption that races do not occur. On the orderings, sequential consistency is the default and gives a single total order that all threads agree on, which is the easiest to reason about and the most expensive on weakly ordered hardware like ARM. Acquire and release pair up to give me exactly what I usually want, which is publication: everything I wrote before a release store is visible to a thread that does an acquire load on the same variable and sees my value. Relaxed gives atomicity and no ordering at all, which is right for something like a statistics counter I read later and quite wrong for a flag that publishes a payload, because the data writes can be reordered past it. I would also say that volatile is not part of this at all; it is for memory-mapped hardware and provides neither atomicity nor ordering. And practically, the fact that a race is now well defined is what makes thread sanitizer possible, and running the test suite under it is the highest-value concurrency practice I know."
}
},

{
id: "cpp-locks",
track: "C++",
sub: "Concurrency",
title: "Mutexes, locks and condition variables in practice",
mins: 22,
body: `
<p>A mutex protects an invariant, not a variable. That framing decides how big the critical
section should be and which operations belong inside it, and it is what separates code that
merely compiles from code that is correct.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The RAII lock types: lock_guard for a simple scope, unique_lock when it must be released or moved, scoped_lock for several mutexes at once">
<rect class="bx" x="24" y="30" width="200" height="180" rx="4"/>
<text class="th" x="40" y="58">lock_guard</text>
<text class="ts" x="40" y="86">locks in the ctor,</text>
<text class="ts" x="40" y="108">unlocks in the dtor</text>
<text class="ts" x="40" y="142">no other operations</text>
<text class="th" x="40" y="180">the default choice</text>

<rect class="bx" x="240" y="30" width="200" height="180" rx="4"/>
<text class="th" x="256" y="58">unique_lock</text>
<text class="ts" x="256" y="86">can unlock early,</text>
<text class="ts" x="256" y="108">relock, be moved</text>
<text class="ts" x="256" y="142">slightly larger</text>
<text class="th" x="256" y="180">needed by wait()</text>

<rect class="bx" x="456" y="30" width="200" height="180" rx="4"/>
<text class="th" x="472" y="58">scoped_lock</text>
<text class="ts" x="472" y="86">several mutexes</text>
<text class="ts" x="472" y="108">at once</text>
<text class="ts" x="472" y="142">deadlock-avoiding</text>
<text class="th" x="472" y="180">use for two or more</text>
</svg>

<p>Always take the lock through an RAII type. An early return, a break or a thrown exception
between a manual lock and unlock leaks the lock and hangs the program, and enumerating the exit
paths by hand is exactly the sort of thing people get wrong during a later edit.</p>

<p>The three types divide cleanly. <code>lock_guard</code> is the default. <code>unique_lock</code>
is for when you must unlock early or hand ownership on, and it is what a condition variable's
wait requires because wait has to unlock and relock. <code>scoped_lock</code> takes several
mutexes at once using a deadlock-avoiding algorithm, which is strictly better than taking them
one at a time.</p>

<p><b>Deadlock</b> is a design problem, not a bug to be found. The reliable prevention is a global
lock ordering: every piece of code that needs two mutexes takes them in the same order, which
breaks the circular wait condition. The other rule that prevents most of the rest is never to
call unknown code, such as a user callback, while holding a lock, because you do not know what
it will lock.</p>

<p>A <b>condition variable</b> always needs three things together: a mutex, a predicate, and a
loop. The wait must be in a loop because a wakeup can be spurious, and because the condition may
have been made true and then false again before your thread ran. The predicate overload writes
that loop for you, which is why it should always be used.</p>

<p>Two failure modes are worth naming. Notifying without holding the lock can lose the wakeup if
the waiter has checked the predicate but not yet waited. And <code>notify_one</code> on a
condition where waiters are waiting for different things can wake the wrong thread, which then
goes back to sleep while the right one never runs; where the waiters are not interchangeable,
notify all of them.</p>
`,
quiz: [
{ q: "Why should a mutex always be taken through an RAII type?",
o: ["It is faster than a manual lock and unlock", "Every exit path releases it, including an exception", "It prevents deadlock automatically", "It allows the mutex to be copied"],
a: 1, why: "An early return, a break or a throw between a manual lock and unlock leaks it, and enumerating the exit paths by hand is what later edits get wrong." },
{ q: "When do you need unique_lock rather than lock_guard?",
o: ["Whenever more than one thread is involved", "When you must unlock early, move it, or wait on a condition variable", "When the mutex is recursive", "When the critical section is long"],
a: 1, why: "Condition variable wait has to unlock and relock, which lock_guard cannot do. Otherwise lock_guard is the smaller, clearer default." },
{ q: "What is the reliable way to prevent deadlock with two mutexes?",
o: ["Use a timeout on every lock attempt", "Impose a global order, or take them together with scoped_lock", "Make one of the mutexes recursive", "Keep the critical sections very short"],
a: 1, why: "Consistent ordering breaks the circular wait condition. scoped_lock takes several at once using a deadlock-avoiding algorithm." },
{ q: "Why must a condition variable wait be in a loop with a predicate?",
o: ["To handle more than one waiting thread", "Because wakeups can be spurious and the condition can change back", "To avoid holding the mutex too long", "Because notify_one may wake several threads"],
a: 1, why: "The predicate overload writes the loop for you, which is why it should always be used rather than the bare wait." }
],
interview: {
q: "How would you make a class thread safe?",
a: "The first question I would ask is whether it should be, because a class that locks internally is often the wrong design: it makes every operation pay for synchronisation, and it does not compose, since two individually thread-safe calls are not atomic together. Frequently the better answer is to leave the class unsynchronised and let the caller own the locking, or to hand ownership to a single thread and communicate by message. If it does need internal locking, then I think in terms of protecting an invariant rather than protecting a variable, because that is what tells me how large the critical section should be and which operations belong inside it. I would take the mutex through an RAII type in every case, normally lock_guard, because an early return or a thrown exception between a manual lock and unlock leaks the lock and hangs the program. unique_lock where I need to release early or wait on a condition variable, and scoped_lock whenever more than one mutex is involved, because it uses a deadlock-avoiding algorithm rather than relying on me getting the order right. On deadlock generally, I treat it as a design question rather than a bug to hunt: a global lock ordering breaks the circular wait condition, and I never call unknown code, such as a user-supplied callback, while holding a lock, because I have no idea what it will lock. For any condition variable I would always use the predicate overload of wait, because the loop it writes handles both spurious wakeups and the case where the condition became true and false again before my thread ran. And I would run the tests under thread sanitizer, because reasoning is not a substitute for detection here."
}
},

{
id: "cpp-atomics",
track: "C++",
sub: "Concurrency",
title: "Atomics: what they cost and where they belong",
mins: 22,
body: `
<p>An atomic operation is indivisible: no other thread can observe it half done. That is a
narrower guarantee than people expect, and understanding exactly how narrow is what stops
atomics being misused.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="An atomic making one operation indivisible, against a mutex making a whole region indivisible">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">atomic</text>
<rect class="bx" x="24" y="72" width="308" height="140" rx="4"/>
<text class="ts" x="40" y="100">ONE operation is indivisible</text>
<text class="ts" x="40" y="132">counter++ is safe</text>
<text class="th" x="40" y="170">two related atomics</text>
<text class="th" x="40" y="192">are still not atomic together</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">mutex</text>
<rect class="bx" x="348" y="72" width="308" height="140" rx="4"/>
<text class="ts" x="364" y="100">a REGION is indivisible</text>
<text class="ts" x="364" y="132">an invariant across several</text>
<text class="ts" x="364" y="154">variables can be maintained</text>
<text class="th" x="364" y="192">this is what you usually need</text>
</svg>

<p>That is the first and most important limit. Updating two related atomics leaves a window in
which another thread sees one updated and the other not, so an invariant spanning two variables
needs a mutex however atomic each variable is. Reaching for atomics to avoid a lock, and then
needing two of them, means the lock was the right answer.</p>

<p>The operations worth knowing are <b>load</b>, <b>store</b>, <b>exchange</b>, <b>fetch_add</b>
and the two <b>compare_exchange</b> forms. Compare-exchange is the general primitive: it writes
only if the current value matches what you expected, and returns whether it succeeded, which is
what lets you build a read-modify-write loop for an arbitrary update.</p>

<p>The <b>weak</b> form may fail spuriously even when the value matched, which allows a cheaper
implementation on some architectures. That is fine inside a loop, which is where compare-exchange
almost always lives, and the strong form is for the rare case where you are not looping.</p>

<p>On cost: an uncontended atomic is close to free, and a contended one is not. Every writer
must own the cache line exclusively, so a counter hammered by many cores makes that line
ping-pong between them, and throughput collapses. The fix is not a cleverer atomic, it is
per-thread counters summed at the end, which removes the sharing entirely.</p>

<p>The related trap is <b>false sharing</b>: two independent atomics that happen to sit in the
same cache line contend as though they were one variable. Padding or aligning them to
<code>hardware_destructive_interference_size</code> separates them, and it can be worth a large
multiple in a hot path.</p>

<p>Finally, <code>atomic&lt;T&gt;</code> for a large T is not lock free; the implementation takes
a hidden lock. <code>is_lock_free</code> tells you, and it is worth checking rather than assuming
that because it compiled it is cheap.</p>
`,
quiz: [
{ q: "What does an atomic operation guarantee?",
o: ["That a region of code runs without interruption", "That one operation is indivisible", "That the value is written to main memory", "That only one thread can access the variable"],
a: 1, why: "It is narrower than people expect. An invariant spanning two variables needs a mutex, however atomic each variable is individually." },
{ q: "What does compare_exchange do?",
o: ["Swaps two atomic variables", "Writes only if the current value matches the expected one", "Compares two atomics for equality", "Exchanges the value and the memory ordering"],
a: 1, why: "It is the general read-modify-write primitive, which is what lets you build an arbitrary update as a retry loop." },
{ q: "Why is the weak form of compare_exchange acceptable in a loop?",
o: ["It is more strongly ordered than the strong form", "It may fail spuriously, which the loop retries anyway", "It only works inside a loop", "It has stronger progress guarantees"],
a: 1, why: "Allowing a spurious failure permits a cheaper implementation on some architectures, and the loop absorbs it at no cost." },
{ q: "Why does a heavily contended atomic counter scale badly?",
o: ["The atomic instruction is not lock free", "Every writer must own the cache line exclusively, so it ping-pongs", "The compiler inserts a hidden mutex", "Atomic operations disable the store buffer"],
a: 1, why: "The fix is per-thread counters summed at the end, which removes the sharing rather than making the atomic cleverer." }
],
interview: {
q: "When would you use an atomic rather than a mutex?",
a: "When the thing I need to make indivisible is a single operation on a single variable, and I do not have an invariant spanning several. A counter, a flag, a pointer swap: those are the cases atomics fit. As soon as I find myself needing two related atomics to stay consistent with each other, the atomics are the wrong tool, because updating two of them leaves a window where another thread sees one updated and not the other, and that means the lock was the right answer all along. On the operations, compare_exchange is the general primitive because it writes only if the value still matches what I expected, which lets me build any read-modify-write as a retry loop, and I would use the weak form inside that loop since it may fail spuriously in exchange for being cheaper on some architectures. On cost I would be careful not to assume atomics are free. Uncontended they are close to it, but every writer has to own the cache line exclusively, so a counter hammered by many cores makes the line ping-pong and throughput falls off a cliff. The answer there is not a cleverer atomic, it is per-thread counters summed at the end, which removes the sharing altogether. I would also watch for false sharing, where two independent atomics land in the same cache line and contend as if they were one variable, which padding to the destructive interference size fixes. And I would check is_lock_free rather than assume, because an atomic over a large type is implemented with a hidden lock and is not cheap at all."
}
},

{
id: "cpp-async",
track: "C++",
sub: "Concurrency",
title: "Futures, promises and task-based concurrency",
mins: 20,
body: `
<p>Threads are a low-level tool: you get a stack, an OS object and the job of managing its
lifetime. Task-based concurrency raises the level, letting you say what work should happen and
get back a handle to its eventual result.</p>

<svg class="fig" viewBox="0 0 680 230" role="img" aria-label="A promise setting a value that a future retrieves, with the shared state between them">
<rect class="bx" x="40" y="70" width="170" height="80" rx="4"/>
<text class="th" x="56" y="98">promise</text>
<text class="ts" x="56" y="124">the producing end</text>

<rect class="bxa" x="250" y="70" width="180" height="80" rx="4"/>
<text class="th" x="266" y="98">shared state</text>
<text class="ts" x="266" y="124">value or exception</text>

<rect class="bx" x="470" y="70" width="170" height="80" rx="4"/>
<text class="th" x="486" y="98">future</text>
<text class="ts" x="486" y="124">the consuming end</text>

<line class="ln" x1="210" y1="110" x2="250" y2="110"/>
<line class="ln" x1="430" y1="110" x2="470" y2="110"/>
<text class="ts" x="40" y="190">an exception thrown in the task is stored and rethrown by get()</text>
</svg>

<p>A <b>promise</b> is the producing end and a <b>future</b> the consuming end, connected by a
shared state. The producer sets a value or an exception; the consumer calls <code>get</code>,
which blocks until it is available. The exception path is the part that makes this genuinely
useful: an exception thrown inside the task is captured and rethrown at the point of
<code>get</code>, so error handling crosses the thread boundary properly instead of terminating
the program.</p>

<p><code>std::async</code> packages the common case, and it has two surprises. Its default
launch policy allows the implementation to choose deferred execution, so the work may not start
until you call <code>get</code>, which means an apparently parallel loop can run entirely
sequentially. Pass <code>std::launch::async</code> explicitly when you actually want a thread.</p>

<p>The second surprise is that the future returned by <code>async</code> has a blocking
destructor. If you do not store it, the temporary is destroyed at the end of the full expression
and that destructor waits for the task, so the call is synchronous after all. Both of these
catch people, and both are silent.</p>

<p>The deeper limitation is that futures do not compose. There is no standard way to say "when
this completes, do that" without blocking a thread on <code>get</code>, and no way to wait for
the first of several. That is what the sender and receiver work in C++26 addresses, and in the
meantime it is why most real systems use a library rather than the standard facilities.</p>

<p>Practically, task-based code is easier to get right than thread-based code because lifetime
and error propagation are handled for you. Where you do need long-lived threads, prefer a thread
pool sized near the hardware concurrency over creating threads per unit of work, since creation
costs a stack and a kernel object and oversubscription thrashes the scheduler.</p>
`,
quiz: [
{ q: "What happens to an exception thrown inside a task?",
o: ["It terminates the program immediately", "It is stored and rethrown when get is called", "It is silently discarded", "It is converted into an error code"],
a: 1, why: "That is what makes the future genuinely useful: error handling crosses the thread boundary properly rather than ending the process." },
{ q: "What is the surprise in std::async's default launch policy?",
o: ["It always creates a new thread", "It may defer, so the work runs only when get is called", "It runs the task on the calling thread", "It queues the task on a global pool"],
a: 1, why: "An apparently parallel loop can therefore run entirely sequentially. Passing std::launch::async explicitly is what asks for concurrency." },
{ q: "Why does an unstored future from std::async make the call synchronous?",
o: ["The task cannot start without a future", "The temporary's destructor blocks until the task finishes", "The compiler optimises the call away", "async refuses to run without a stored result"],
a: 1, why: "The temporary is destroyed at the end of the full expression, and that destructor waits. It is a classic surprise inside a loop." },
{ q: "What is the main limitation of standard futures?",
o: ["They cannot carry exceptions", "They do not compose, so continuations mean blocking a thread", "They only work with trivially copyable types", "They require a thread pool to be configured"],
a: 1, why: "There is no standard way to say when this completes do that, or to wait for the first of several, which is why most real systems use a library." }
],
interview: {
q: "How would you parallelise a batch of independent computations?",
a: "I would use task-based concurrency rather than raw threads, because the lifetime management and the error propagation come for free. Each unit of work becomes a task returning a future, and an exception thrown inside a task is captured and rethrown when I call get, so error handling crosses the thread boundary properly instead of terminating the process, which is what happens if an exception escapes a raw thread. If I used std::async I would be careful about two things that catch people and are both silent. The default launch policy lets the implementation defer, so the work may not start until I call get and my apparently parallel loop runs sequentially; I would pass std::launch::async explicitly. And the future returned by async has a blocking destructor, so if I do not store it the temporary is destroyed at the end of the full expression and waits there, which again makes the whole thing synchronous. In practice, for a real batch I would not spawn a task per item at all. I would use a thread pool sized near hardware concurrency, because creating a thread costs a stack and a kernel object and oversubscribing thrashes the scheduler, and I would size the work chunks so that each is large enough to dwarf the scheduling overhead. If the standard parallel algorithms fit the shape of the problem, a parallel execution policy on a standard algorithm is the least code and often the right answer. The thing I would keep in mind throughout is that standard futures do not compose, so if I needed continuations or wait-for-first I would reach for a library rather than trying to build it on get."
}
},

{
id: "cpp-lockfree",
track: "C++",
sub: "Concurrency",
title: "Lock-free: what it buys, and why it is rarely worth it",
mins: 22,
body: `
<p>Lock-free is a <b>progress guarantee</b>, not a performance claim. It says that at least one
thread makes progress in a bounded number of steps regardless of what any other thread does,
including being descheduled mid-operation. That is a real property with a real use, and it is
not the same as being fast.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="The progress guarantees from blocking through lock-free to wait-free, with cost rising alongside">
<rect class="bx" x="24" y="30" width="200" height="180" rx="4"/>
<text class="th" x="40" y="58">blocking</text>
<text class="ts" x="40" y="86">a descheduled holder</text>
<text class="ts" x="40" y="108">blocks everyone</text>
<text class="th" x="40" y="150">simplest</text>
<text class="ts" x="40" y="180">usually fastest too</text>

<rect class="bx" x="240" y="30" width="200" height="180" rx="4"/>
<text class="th" x="256" y="58">lock-free</text>
<text class="ts" x="256" y="86">SOME thread always</text>
<text class="ts" x="256" y="108">makes progress</text>
<text class="th" x="256" y="150">an individual thread</text>
<text class="ts" x="256" y="180">may still starve</text>

<rect class="bx" x="456" y="30" width="200" height="180" rx="4"/>
<text class="th" x="472" y="58">wait-free</text>
<text class="ts" x="472" y="86">EVERY thread finishes</text>
<text class="ts" x="472" y="108">in bounded steps</text>
<text class="th" x="472" y="150">strongest</text>
<text class="ts" x="472" y="180">and much the dearest</text>
</svg>

<p>The reason to want it is usually not throughput. It is that a lock-free structure can be used
where a mutex cannot: from a signal handler, from an interrupt context, or in a hard real-time
path where a priority inversion or a descheduled lock holder would blow a deadline.</p>

<p>Under contention a lock-free structure is frequently <b>slower</b> than a mutex, because the
retry loop repeats work that is then thrown away, and the cache line still bounces between cores
exactly as it would with a lock. What you have removed is the blocking, not the contention.</p>

<p>Writing one correctly is genuinely hard, and the reason is the <b>ABA problem</b>: a
compare-exchange sees the value it expected, but the value changed to something else and back
again in between, so the comparison succeeds while the underlying structure has moved on. Fixing
it needs a tagged pointer, hazard pointers or epoch-based reclamation, and those bring their own
subtleties.</p>

<p>Reclaiming memory is the other half of the difficulty. Removing a node from a lock-free list
does not tell you when it is safe to free, because another thread may still be reading it. That
is what hazard pointers and epoch schemes solve, and it is a substantial piece of machinery.</p>

<p>So the honest guidance is: use a library implementation, do not write your own, and be clear
about which of the two reasons applies. If you want the progress guarantee because you are in a
signal handler or a real-time path, it is the right tool. If you want throughput, measure a
mutex first, because on most workloads it wins, and a well-designed structure that avoids sharing
altogether beats both.</p>

<p>The one lock-free structure worth writing by hand is a <b>single-producer, single-consumer
ring buffer</b>, because each index is written by exactly one side. That makes the reasoning
tractable and it is exactly the structure needed between an interrupt and a task.</p>
`,
quiz: [
{ q: "What does lock-free actually guarantee?",
o: ["Higher throughput than a mutex", "Some thread makes progress in bounded steps, whatever others do", "That no atomic operation ever fails", "That every thread finishes in bounded time"],
a: 1, why: "It is a progress guarantee, not a performance claim. Wait-free is the stronger property where every thread finishes in bounded steps." },
{ q: "Why is lock-free often slower under contention?",
o: ["Atomic operations are slower than mutex operations", "The retry loop repeats work and the cache line still bounces", "It requires more memory per element", "The compiler cannot optimise the retry loop"],
a: 1, why: "You have removed the blocking, not the contention. On most workloads a mutex wins, and avoiding sharing altogether beats both." },
{ q: "What is the ABA problem?",
o: ["Two threads reading the same value", "The value changed and changed back, so the comparison wrongly succeeds", "A compare-exchange failing spuriously", "Two atomics sharing a cache line"],
a: 1, why: "The structure has moved on even though the compared value matches. Tagged pointers, hazard pointers or epoch schemes are the standard fixes." },
{ q: "Which lock-free structure is reasonable to write by hand?",
o: ["A multi-producer queue", "A single-producer single-consumer ring buffer", "A lock-free hash map", "A lock-free linked list"],
a: 1, why: "Each index is written by exactly one side, which makes the reasoning tractable, and it is exactly what is needed between an interrupt and a task." }
],
interview: {
q: "When would you write lock-free code?",
a: "Rarely, and for the progress guarantee rather than for speed. Lock-free means that some thread makes progress in a bounded number of steps whatever the others do, including one being descheduled in the middle of an operation, and the situations where I actually need that are quite specific: communicating from a signal handler, from an interrupt context, or in a hard real-time path where a descheduled lock holder or a priority inversion would blow a deadline. In those places a mutex is simply not usable, so the structure has to be lock-free. What I would not do is reach for it expecting throughput, because under contention it is frequently slower than a mutex: the retry loop repeats work that then gets discarded, and the cache line ping-pongs between cores exactly as it would with a lock, so I have removed the blocking rather than the contention. On most workloads a mutex wins, and a design that avoids the sharing altogether, such as per-thread state combined at the end, beats both. If I did need one I would use a well-tested library implementation rather than write it, because the correctness traps are severe: the ABA problem, where a compare-exchange sees the value it expected but the value went away and came back so the structure has actually moved on, and safe memory reclamation, since removing a node does not tell you when another thread has finished reading it. Hazard pointers and epoch-based schemes solve those and are substantial machinery. The one exception I would write myself is a single-producer, single-consumer ring buffer, because each index is written by exactly one side, which keeps the reasoning tractable, and that is the structure I would use between an ISR and a task."
}
},

{
id: "cpp-parallel",
track: "C++",
sub: "Concurrency",
title: "Parallel algorithms, and designing for scale",
mins: 20,
body: `
<p>The standard algorithms take an execution policy, so a great deal of parallelism is available
without writing any threading code at all. Passing <code>std::execution::par</code> to a sort or
a transform asks the implementation to use whatever parallelism it has, and that is very often
the right first move.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Speedup against thread count flattening off, with the gap explained by the serial fraction and by synchronisation overhead">
<line class="ln" x1="70" y1="60" x2="70" y2="200"/>
<line class="ln" x1="70" y1="200" x2="630" y2="200"/>
<text class="ts" x="24" y="66">speedup</text>
<text class="ts" x="540" y="222">threads</text>

<line class="ln" x1="70" y1="200" x2="620" y2="70"/>
<text class="ts" x="500" y="62">ideal</text>

<line class="ln" x1="70" y1="200" x2="250" y2="140"/>
<line class="ln" x1="250" y1="140" x2="400" y2="122"/>
<line class="ln" x1="400" y1="122" x2="620" y2="128"/>
<text class="ts" x="430" y="112">real: flattens, then falls</text>
<text class="ts" x="120" y="176">the serial fraction sets the ceiling</text>
</svg>

<p><b>Amdahl's law</b> is the first thing to apply, before writing anything. If nine tenths of
the work parallelises perfectly, the maximum speedup is ten times no matter how many cores you
have, and at eight cores you get under five. Knowing the serial fraction tells you whether the
exercise is worth starting.</p>

<p>The policies differ in what they promise. <code>par</code> allows the work to run on several
threads, so your callable must not race. <code>par_unseq</code> additionally allows
interleaving within a thread, which means the callable must be safe to vectorise: no locks, no
allocation, no ordering assumptions between elements. Passing a callable that locks to
<code>par_unseq</code> can deadlock against itself.</p>

<p>The most common reason parallelism disappoints is that the work is <b>memory bound</b> rather
than compute bound. Eight cores all waiting on the same memory bus do not go eight times faster,
and adding threads past that point makes things worse through contention. Profiling for cache
misses before parallelising tells you which regime you are in.</p>

<p><b>Granularity</b> is the other lever. Chunks that are too small are dominated by scheduling
overhead; chunks that are too large leave cores idle at the end waiting for a straggler. A good
rule is chunks large enough that the per-chunk overhead is negligible, and numerous enough that
work stealing can balance them.</p>

<p>Finally, design to avoid sharing rather than to synchronise it. Give each thread its own
accumulator and combine at the end; partition the data so threads touch disjoint regions; use
immutable data where you can. A parallel algorithm with no shared mutable state has no races to
find and no locks to contend, and it scales in the way the naive picture suggests.</p>
`,
quiz: [
{ q: "What does Amdahl's law tell you before parallelising?",
o: ["How many threads the hardware supports", "The speedup is capped by the serial fraction", "Which algorithm parallelises best", "How large each chunk should be"],
a: 1, why: "If a tenth is serial, ten times is the ceiling however many cores you have. It tells you whether the exercise is worth starting." },
{ q: "What extra requirement does par_unseq place on your callable?",
o: ["It must be free of side effects entirely", "It must be safe to interleave, so no locks or allocation", "It must be a lambda rather than a function", "It must return the same type it takes"],
a: 1, why: "Interleaving within a thread means a callable that locks can deadlock against itself. par only requires that it not race between threads." },
{ q: "Why does parallelising a memory-bound loop disappoint?",
o: ["The compiler cannot vectorise it", "The cores all wait on the same memory bus", "The scheduling overhead dominates", "Memory-bound code cannot be split"],
a: 1, why: "Adding threads past that point makes it worse through contention. Profiling for cache misses first tells you which regime you are in." },
{ q: "What is the best structural approach to a parallel accumulation?",
o: ["A single atomic accumulator", "Per-thread accumulators combined at the end", "A mutex around the shared accumulator", "A lock-free queue of partial results"],
a: 1, why: "It removes the sharing entirely, so there are no races to find and no contention, and it scales the way the naive picture suggests." }
],
interview: {
q: "A processing loop is too slow. How would you decide whether to parallelise it?",
a: "I would profile before deciding anything, for two reasons. The first is Amdahl's law: if only part of the runtime is in this loop, the speedup I can possibly get is bounded by that fraction, so if the loop is a fifth of the total then even perfect parallelism buys me twenty-five percent and it may not be worth the complexity. The second is that I need to know whether the loop is compute bound or memory bound, because parallelising a memory-bound loop is largely futile: eight cores all waiting on the same memory bus do not go eight times faster, and past a point extra threads make it worse through contention. Cache miss counters tell me which regime I am in, and if it is memory bound then the productive work is improving locality, changing the data layout from array of structures to structure of arrays, or reducing the working set, and that often gives a bigger win than threading would. If it is genuinely compute bound and a worthwhile fraction of the total, then my first move is a standard algorithm with a parallel execution policy, because that is almost no code and lets the implementation handle chunking and scheduling. I would be careful about which policy: par requires my callable not to race, and par_unseq additionally allows interleaving within a thread, so a callable that takes a lock can deadlock against itself. If I need to hand-roll it, I would design to avoid sharing rather than to synchronise it, giving each thread its own accumulator and combining at the end, and I would pick a chunk size large enough that the scheduling overhead is negligible but small enough that work stealing can balance the tail."
}
},

{
id: "cpp-threadsafety",
track: "C++",
sub: "Concurrency",
title: "Designing concurrent code you can reason about",
mins: 20,
body: `
<p>Most concurrency bugs are design failures rather than coding errors. The primitives are
straightforward; deciding which data is shared, and by whom, is where the difficulty actually
lives.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Four designs ordered by how easy they are to reason about, from no sharing through immutable data and message passing to shared mutable state">
<rect class="bx" x="24" y="30" width="632" height="44" rx="4"/>
<text class="th" x="40" y="52">no sharing: each thread owns its data outright</text>
<text class="ts" x="40" y="70">nothing to synchronise, nothing to get wrong</text>

<rect class="bx" x="24" y="82" width="632" height="44" rx="4"/>
<text class="th" x="40" y="104">immutable sharing: many readers, no writers</text>
<text class="ts" x="40" y="122">safe by construction, no locks needed</text>

<rect class="bx" x="24" y="134" width="632" height="44" rx="4"/>
<text class="th" x="40" y="156">message passing: ownership transferred, not shared</text>
<text class="ts" x="40" y="174">one queue to reason about instead of many invariants</text>

<rect class="bx" x="24" y="186" width="632" height="44" rx="4"/>
<text class="th" x="40" y="208">shared mutable state: locks, and everything that follows</text>
<text class="ts" x="40" y="226">sometimes necessary, and always the most expensive to verify</text>
</svg>

<p>The ordering above is the design preference. Each step down adds reasoning burden, so the
question to ask of any concurrent design is how far down it sits and whether it needs to.</p>

<p><b>Message passing</b> deserves particular attention because it converts a hard problem into
an easier one. Rather than several threads sharing a structure under a lock, one thread owns it
and the others send it work through a queue. There is exactly one place where synchronisation
happens, the queue itself, and the ownership rules become obvious.</p>

<p>A common mistake is making a class "thread safe" by locking inside every method. It does not
compose: two individually atomic calls are not atomic together, so a caller who checks a
condition and then acts on it still has a race. It also makes every user pay for synchronisation
whether they share the object or not. Leaving the class unsynchronised and documenting that the
caller owns the locking is frequently the better design.</p>

<p>Document the <b>threading contract</b> of every type explicitly: whether it is safe to use
from several threads, safe only for concurrent reads, or single-threaded. That one line of
documentation prevents more bugs than most of the code around it, because the alternative is
each caller guessing.</p>

<p>Finally, verification. Reasoning is necessary and not sufficient here, because races are
timing dependent and a test that passes a thousand times can fail in the field. <b>Thread
sanitizer</b> detects races that did not even manifest, which is a qualitatively different thing
from testing. Running the suite under it, and running long stress tests under realistic load, is
what turns a design argument into evidence.</p>
`,
quiz: [
{ q: "What is the easiest concurrent design to reason about?",
o: ["Shared state with fine-grained locks", "No sharing at all: each thread owns its data", "Immutable shared state", "Message passing between threads"],
a: 1, why: "Nothing to synchronise means nothing to get wrong. Immutable sharing and message passing follow, and shared mutable state is the most expensive to verify." },
{ q: "Why does locking inside every method fail to make a class safe to use?",
o: ["The locks are too fine grained to be efficient", "Two atomic calls are not atomic together, so callers still race", "Recursive locking causes deadlock", "It prevents the class from being copied"],
a: 1, why: "A caller who checks a condition then acts on it has a race regardless. It also makes every user pay for synchronisation they may not need." },
{ q: "What does message passing simplify?",
o: ["The cost of transferring data between threads", "There is one place where synchronisation happens, and ownership is clear", "The need for any queue at all", "The scheduling of the worker threads"],
a: 1, why: "One thread owns the structure and others send it work, so instead of many invariants under a lock there is a single queue to reason about." },
{ q: "Why is testing insufficient for concurrency?",
o: ["Tests cannot create multiple threads", "Races are timing dependent, so a passing test proves little", "Thread scheduling is deterministic in tests", "Tests run too slowly to expose races"],
a: 1, why: "Thread sanitizer detects races that did not manifest at all, which is qualitatively different from observing that nothing went wrong this time." }
],
interview: {
q: "How do you approach designing a multithreaded system so it is maintainable?",
a: "I try to push the design as far up a preference order as I can. Best is no sharing at all, where each thread owns its own data outright, because then there is nothing to synchronise and nothing to get wrong. Next is immutable sharing, many readers and no writers, which is safe by construction. Next is message passing, where ownership is transferred rather than shared: one thread owns the structure and the others send it work through a queue, so there is exactly one place where synchronisation happens and the ownership rules are obvious. Last, and only when it is genuinely necessary, is shared mutable state with locks, because that is by far the most expensive thing to verify. A specific anti-pattern I would push back on is making a class thread safe by locking inside every method, because it does not compose: two individually atomic calls are not atomic together, so a caller who checks a condition and then acts on it still has a race, and meanwhile every user pays for synchronisation whether they share the object or not. Usually the better design is to leave the class unsynchronised and be explicit that the caller owns the locking. That points at the practice I think matters most, which is documenting the threading contract of every type in one line: safe from multiple threads, safe for concurrent reads only, or single threaded. That prevents more bugs than most of the code around it, because otherwise every caller is guessing. And I would treat verification as separate from reasoning, because races are timing dependent and a test passing a thousand times proves very little. Running the suite under thread sanitizer detects races that never even manifested, which is a different kind of evidence, and I would pair that with long stress runs under realistic load."
}
}

);
