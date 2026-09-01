// Extra CS & Maths lessons for R&D Prep. Same shape as data.js entries.
// Loaded after data.js; appends to the global LESSONS array.

LESSONS.push(

{
id: "cm-hash",
track: "CS & Maths",
sub: "Data structures and algorithms",
title: "Hash maps and honest complexity",
mins: 25,
body: `
<p>A hash map turns a key into an array index. A hash function maps the key (a string,
a channel ID, a probe serial number) to a large integer; the map takes that integer
modulo the table size and looks in that bucket. If the bucket holds the key, done:
one hash, one array access, O(1).</p>
<h3>Collisions and load factor</h3>
<p>Two keys will eventually land in the same bucket; that is a collision, and the map
must handle it. Chaining hangs a small list off each bucket; open addressing probes
the next slots until it finds a free one. Either way, performance depends on the
<b>load factor</b>: entries divided by buckets. At load 0.5 most buckets hold zero or
one entry and lookups stay near one probe. Push the load towards 1.0 and chains grow;
in the worst case (a bad hash or adversarial keys) every key lands in one bucket and
lookup degrades to an O(n) list scan.</p>
<h3>Rehashing and amortised cost</h3>
<p>To keep the load factor low, the map grows: when load crosses a threshold (0.75 is
typical), it allocates a table about twice the size and re-inserts every entry. That
one insert costs O(n). But it buys room for n more cheap inserts before the next
rehash, so averaged over any long sequence the cost per insert is still constant.
That is all <b>amortised O(1)</b> means: the expensive operations are rare enough
that they wash out over the sequence. The caution for instrument code: the wash-out
is an average, not a promise about any single call. If an insert on the acquisition
path can trigger a rehash of a million entries, your loop has a latency spike.
Pre-size the map (reserve) before the run starts.</p>
<h3>When O(1) loses to O(n)</h3>
<p>Big-O hides constants, and at real sizes constants win. A hash lookup costs a hash
computation, a modulo, and at least one probably-cache-missing memory access. A linear
scan of a small contiguous array costs a handful of comparisons through data already
in cache. Worked numbers: with 16 channel names, a scan touches at most 16 entries in
one or two cache lines, roughly tens of nanoseconds; a hash lookup of a string key can
cost as much just hashing the string. The crossover is typically somewhere between 30
and 100 elements. Below it, a sorted or even unsorted array wins; above a few hundred,
the hash map pulls away and by a million entries it is no contest.</p>
<h3>Choose the structure from the access pattern</h3>
<ul>
<li>Lookup by arbitrary key, thousands of entries, order irrelevant: hash map.</li>
<li>Iterate in key order, or range queries (all events between two timestamps):
sorted array or tree; hash maps have no useful order.</li>
<li>Small fixed set checked in a hot loop: plain array, scan it.</li>
<li>Keys are small dense integers (channel 0 to 63): just index an array; that is the
perfect hash you get for free.</li>
</ul>
<p>The interview answer that lands is never the memorised O(1). It is: here is the
access pattern, here is the size, here is why this structure and what it costs when
it resizes.</p>`,
quiz: [
{ q: "A hash map's load factor is 0.9 and rising. What is the main risk?",
o: ["Hash values overflow", "Keys are silently dropped", "Longer collision chains, so lookups drift from O(1) towards O(n)", "Memory is freed too early"],
a: 2, why: "High load means more keys per bucket, so each lookup scans a longer chain or probe sequence. Rehashing to more buckets restores short chains." },
{ q: "Amortised O(1) insertion means:",
o: ["Averaged over many inserts the cost is constant, though a single insert may be O(n)", "Every single insert is constant time", "Insertion is constant only if there are no collisions", "The compiler optimises the inserts away"],
a: 0, why: "Occasional O(n) rehashes are paid for by the many cheap inserts between them. Any individual call can still be slow, which matters on latency-sensitive paths." },
{ q: "You look up one of 16 fixed channel names inside a tight acquisition loop. The fastest realistic choice is:",
o: ["A large hash map", "A small array scanned linearly", "A balanced tree", "A database"],
a: 1, why: "At 16 elements the whole array sits in one or two cache lines; a scan beats hashing the key. Big-O only dominates at scale." },
{ q: "The best way to avoid a rehash latency spike during a timed acquisition run is:",
o: ["Use a smaller load factor threshold", "Hash the keys twice", "Lower the process priority", "Reserve the expected capacity before the run starts"],
a: 3, why: "Pre-sizing means the table never grows mid-run, so every insert stays cheap. Threshold tweaks only move where the spike happens." }
],
interview: {
q: "Talk me through how a hash map works and when you would refuse to use one.",
a: "A hash function maps the key to an integer, that integer modulo the table size picks a bucket, and collisions are resolved by chaining or probing. Performance hinges on load factor: kept below about 0.75 by occasional doubling rehashes, lookups are amortised O(1). I would refuse one in three cases. First, tiny collections in a hot loop: scanning 20 contiguous elements beats hashing, because cache behaviour dominates at that size. Second, ordered or range access, say all samples between two timestamps, where a sorted structure is the right tool. Third, hard latency paths: a rehash mid-acquisition is an O(n) spike, so I either reserve capacity up front or use a fixed-size structure I can reason about." }
},

{
id: "cm-memory",
track: "CS & Maths",
sub: "Systems",
title: "Memory, cache and locality",
mins: 30,
body: `
<p>Modern CPUs are fast; memory is not. The hierarchy exists to hide that gap, and
the orders of magnitude are worth knowing cold: a register is effectively free, L1
cache is about 1 ns, L2 a few ns, L3 tens of ns, and main memory (DRAM) around
100 ns. An SSD is tens of microseconds. So one DRAM access costs the same as roughly
a hundred L1 hits. Numerical code lives or dies by which of those levels it actually
talks to.</p>
<h3>Cache lines</h3>
<p>Caches do not move single bytes. They move fixed blocks, typically 64 bytes: one
cache line, which holds 8 doubles or 16 floats. Touch one double and its 7 neighbours
arrive for free. That single fact drives most of what follows.</p>
<h3>Two kinds of locality</h3>
<ul>
<li><b>Spatial</b>: if you touched address x, you will probably touch x+8 soon. Reward
it by walking arrays in order, so each loaded line is fully used.</li>
<li><b>Temporal</b>: if you touched x, you will probably touch x again soon. Reward it
by reusing data while it is still resident, for example processing one block of
samples completely before moving on, rather than making five full passes over a huge
buffer.</li>
</ul>
<h3>Worked example: traversal order</h3>
<p>Take a 1000 x 1000 matrix of doubles: 8 MB, far bigger than a typical L2. In C,
C++ and NumPy (default) it is row-major: element [i][j] sits next to [i][j+1] in
memory. Sum it row by row and each 64-byte line you fetch supplies 8 consecutive
elements, so you take about 125,000 cache misses for a million elements. Sum it
column by column and consecutive accesses are 8000 bytes apart: every access lands
on a different line, and because the matrix does not fit in cache the line is gone
before you come back for its neighbour. Roughly 1,000,000 misses, 8 times more, and
in practice a slowdown of several times for identical arithmetic. MATLAB and Fortran
are column-major, so the fast direction flips: iterate down columns there. Same rule,
opposite memory layout.</p>
<h3>False sharing</h3>
<p>Cache coherence works in lines too. If thread A repeatedly writes counter1 and
thread B writes counter2, and both counters sit in the same 64-byte line, the line
ping-pongs between the two cores' caches even though the threads never touch the same
variable. That is false sharing, and it can quietly erase the gain from
parallelising. Fix: pad or align per-thread data so each thread's hot writes live on
their own line.</p>
<h3>Fragmentation</h3>
<p>A heap that allocates and frees many different sizes ends up with free memory
scattered in small holes: total free space is plentiful, but no single hole fits the
next big buffer. That is fragmentation, and on a long-running instrument it is a
slow-motion crash. Defences: allocate the big buffers once at startup, use pools of
fixed-size blocks for the churn, and treat any steady-growth memory graph with
suspicion even when nothing leaks.</p>`,
quiz: [
{ q: "Roughly how much slower is a main-memory (DRAM) access than an L1 cache hit?",
o: ["About 2 times", "About 100 times", "About a million times", "They are the same since both are RAM"],
a: 1, why: "L1 is around 1 ns and DRAM around 100 ns, so the ratio is roughly two orders of magnitude. This gap is why locality dominates numerical performance." },
{ q: "A 64-byte cache line holds how many doubles?",
o: ["64", "16", "2", "8"],
a: 3, why: "A double is 8 bytes, so 64 divided by 8 gives 8. Touching one double drags in its 7 neighbours, which is the payoff for sequential access." },
{ q: "In C or C++, summing a large 2D array column by column is slow mainly because:",
o: ["Each access lands on a different cache line and lines are evicted before reuse", "The compiler cannot vectorise columns", "Column indices need an extra multiplication", "The OS pages the array to disk"],
a: 0, why: "Row-major layout means column steps jump thousands of bytes, so each fetched line contributes one element instead of eight and is evicted before its neighbours are needed." },
{ q: "Two threads each increment their own separate counter, yet scaling is terrible. A likely cause is:",
o: ["The counters overflow", "Integer increments cannot run in parallel", "False sharing: both counters sit in the same cache line, which ping-pongs between cores", "The threads share a mutex"],
a: 2, why: "Coherence operates on whole lines, so writes to distinct variables in one line still force the line to bounce between cores. Padding to separate lines fixes it." }
],
interview: {
q: "Your colleague's MATLAB analysis ported to C++ runs four times slower than expected with identical maths. Where do you look first?",
a: "Traversal order against memory layout. MATLAB is column-major and C++ is row-major, so a loop nest that was cache-friendly in MATLAB walks C++ arrays with a large stride: every access misses, and since a line holds 8 doubles you can pay up to 8 times the memory traffic for the same arithmetic. I would confirm with a profiler showing cache miss rate, then swap the loop order or transpose the storage. If it is threaded, I would also check for false sharing of per-thread accumulators and pad them to separate cache lines. In my experience these two memory effects explain most identical-maths slowdowns before any question of compiler flags arises." }
},

{
id: "cm-concurrency",
track: "CS & Maths",
sub: "Systems",
title: "Concurrency concepts that survive interviews",
mins: 30,
body: `
<p>Concurrency questions are less about syntax than about failure taxonomy: can you
name what went wrong and why. Four terms cover most of it.</p>
<h3>The four failure modes</h3>
<ul>
<li><b>Race condition</b>: the result depends on timing. Two threads run
count = count + 1; each reads 5, each writes 6, one increment is lost. The bug is
intermittent, load-dependent, and vanishes under a debugger.</li>
<li><b>Deadlock</b>: threads wait on each other forever. Thread A holds lock 1 and
wants lock 2; thread B holds lock 2 and wants lock 1. Everything stops, cleanly.</li>
<li><b>Livelock</b>: threads stay busy but make no progress, like two people
side-stepping the same way in a corridor forever. Retry loops that all back off and
retry in sync are the classic source.</li>
<li><b>Starvation</b>: the system progresses but one thread never gets the resource,
for example a low-priority logger that never acquires a lock under contention.</li>
</ul>
<h3>The four deadlock conditions</h3>
<p>Deadlock requires all four of: <b>mutual exclusion</b> (resources are exclusive),
<b>hold and wait</b> (a thread keeps what it has while waiting for more),
<b>no preemption</b> (resources cannot be forcibly taken), and <b>circular wait</b>
(a cycle of threads each waiting on the next). Break any one and deadlock is
impossible. The cheapest to break is circular wait: give every lock a global order
and always acquire in that order. Second cheapest is hold and wait: acquire
everything at once or use try-lock with backout.</p>
<h3>Lock granularity</h3>
<p>One big lock is easy to reason about but serialises everything: threads queue for
data they do not even share. Fine-grained locks (per channel, per buffer) allow real
parallelism but multiply the ways to deadlock and the cost of acquiring several. The
professional habit: start coarse and correct, measure contention, then split only the
lock the profiler blames. Also keep critical sections short: compute outside, lock,
swap a pointer or copy a result, unlock.</p>
<h3>The SPSC lock-free ring</h3>
<p>With exactly one producer (say an acquisition ISR or thread) and one consumer,
a ring buffer needs no lock at all: the producer writes data, then advances the head
index; the consumer reads data, then advances the tail. Each index has a single
writer, and the write-then-publish order guarantees the consumer never sees unwritten
data. This only works for single producer, single consumer; add a second producer
and you need atomics or a lock.</p>
<h3>Why speedup saturates: Amdahl in words</h3>
<p>If a fraction of the job is inherently serial, that fraction sets a ceiling no core
count can break. Worked numbers: 95 percent parallel, 5 percent serial. With infinite
cores the parallel part takes zero time, but the serial 5 percent remains, so maximum
speedup is 1/0.05 = 20 times. At 8 cores you get about 1/(0.05 + 0.95/8), roughly
5.9 times, not 8. When someone reports adding cores stopped helping, ask what the
serial fraction is: usually a lock, a merge step, or I/O.</p>`,
quiz: [
{ q: "A bug appears once a week under load and never when single-stepping in a debugger. Most likely:",
o: ["A syntax error", "A deadlock", "A race condition, since the debugger changes the timing that exposes it", "A compiler bug"],
a: 2, why: "Races depend on instruction interleaving; a debugger serialises execution and hides them. Timing dependence plus intermittency is the classic race signature." },
{ q: "Which strategy directly prevents circular wait?",
o: ["Making all locks recursive", "Acquiring locks in a fixed global order everywhere", "Using more threads", "Raising thread priorities"],
a: 1, why: "A fixed acquisition order means no cycle of threads each holding what the next wants can form, so one of the four necessary deadlock conditions is broken." },
{ q: "A program is 95 percent parallelisable. Its maximum possible speedup on unlimited cores is about:",
o: ["95 times", "Unlimited", "9.5 times", "20 times"],
a: 3, why: "Amdahl: the 5 percent serial part always remains, so the ceiling is 1 divided by 0.05, which is 20. Extra cores only shrink the parallel part." },
{ q: "The SPSC ring buffer avoids locks because:",
o: ["Each index has exactly one writer, and data is written before the index is advanced", "Interrupts are disabled during access", "The buffer is small enough to be atomic", "Both threads run on the same core"],
a: 0, why: "Producer owns head, consumer owns tail, and publish-after-write ordering means each side always sees a consistent view. A second producer breaks the scheme." }
],
interview: {
q: "Our instrument GUI freezes occasionally and a core dump shows two threads each blocked acquiring a mutex. How do you diagnose and fix it?",
a: "Two threads blocked on mutexes is the deadlock signature, so first I confirm the cycle: from the dump, which lock does each thread hold and which does it want. If A holds the data lock wanting the display lock while B holds the reverse, that is circular wait. The durable fix is a global lock ordering, documented and asserted in debug builds, so every thread acquires in the same sequence. I would also shrink the critical sections: often one thread holds a lock across a long render or file write it does not need protection for. Then I make it reproducible by adding stress delays at the lock sites, verify the freeze occurs before the fix and not after, and leave a watchdog that logs lock-wait times in production." }
},

{
id: "cm-linalg",
track: "CS & Maths",
sub: "Numerical methods",
title: "Linear algebra for instrument software",
mins: 30,
body: `
<p>Most instrument maths is linear algebra wearing a lab coat: calibration is a
matrix, fitting is a projection, and a mysterious unstable reconstruction is usually
a small singular value. The intuitions below are the ones that come up.</p>
<h3>A matrix is a transformation</h3>
<p>Forget the grid of numbers first; a matrix A is a machine that takes a vector and
returns a stretched, rotated, sheared version of it. In measurement terms, A maps
the thing you want (parameters, an image) to the thing you record (sensor readings).
The recurring engineering question is the inverse one: given readings y, what input
x produced them?</p>
<h3>Rank and null space</h3>
<p>The <b>rank</b> is how many genuinely independent directions A preserves; the
<b>null space</b> is the set of inputs A maps to zero, the directions the measurement
simply cannot see. If a 6-parameter calibration matrix has rank 5, some combination
of parameters produces no change in any reading: two parameters are doing one job.
No algorithm recovers what the physics never recorded; you either add a measurement
that sees that direction or remove the redundancy from the model.</p>
<h3>Least squares is a projection</h3>
<p>With more measurements than parameters, y = Ax usually has no exact solution:
noisy y does not lie in the subspace of outputs A can produce. Least squares picks
the point of that subspace closest to y, which is the perpendicular projection of y
onto it, and reports the x that lands there. The residual, what is left over, is
perpendicular to everything the model can express. That is a useful diagnostic: if
the residual still contains obvious structure (a trend, a periodicity), the model is
missing a column, not merely fighting noise.</p>
<h3>Condition number</h3>
<p>The condition number is the ratio of the largest to smallest singular value, and
it is a noise amplifier rating: a condition number of 1e4 means a relative error of
1e-6 in the data can become 1e-2 in the solution. Rule of thumb: you lose about
log10(condition number) significant digits. A condition number of 1e8 in FP32
arithmetic, which only carries about 7 digits, means the answer can be pure noise
while the code runs without a single warning.</p>
<h3>SVD in plain words</h3>
<p>The singular value decomposition says every matrix, however messy, is a rotation,
then a pure axis-by-axis scaling, then another rotation. The scalings are the
singular values, and they rank the directions of the measurement from strongly
sensed to barely sensed. Tiny singular values are the honest small print: they name
the parameter combinations your instrument barely measures. Inverting them divides
noise by a tiny number, which is where wild reconstructions come from. Truncating
them (dropping directions below a noise-based threshold) trades a little bias for a
lot of stability, and the singular vectors tell you exactly which physical
combinations you gave up on. When a fit misbehaves, the SVD of the Jacobian is the
first thing worth printing.</p>`,
quiz: [
{ q: "A calibration model has 6 parameters but its matrix has rank 5. This means:",
o: ["One measurement is broken", "Some combination of parameters produces no change in the readings, so it cannot be recovered from data", "The matrix cannot be stored", "The fit will take 6 times longer"],
a: 1, why: "Rank below the parameter count means a direction lies in the null space: the data is blind to it. Fix the model or add a measurement; no solver can conjure it." },
{ q: "Geometrically, the linear least squares solution is:",
o: ["The projection of the data vector onto the subspace of outputs the model can produce", "The intersection of all measurement lines", "The longest vector satisfying the model", "The average of the data"],
a: 0, why: "Least squares finds the closest reachable point to y, which is the perpendicular projection onto the model's column space; the residual is orthogonal to it." },
{ q: "A problem has condition number 1e8 and you solve it in FP32 (about 7 digits). Roughly how many significant digits survive in the solution?",
o: ["7", "About 4", "Essentially none", "15"],
a: 2, why: "You lose about log10 of the condition number, here 8 digits, which exceeds the 7 digits FP32 carries. The output can be dominated by amplified noise." },
{ q: "Tiny singular values of the system matrix tell you:",
o: ["The data contains outliers", "The matrix is not square", "The algorithm has converged", "Which parameter combinations the measurement barely senses, and where noise will be amplified on inversion"],
a: 3, why: "Small singular values mark weakly measured directions; inverting divides by them, blowing noise up. Their singular vectors identify the guilty combinations." }
],
interview: {
q: "A reconstruction algorithm gives wildly different images from two acquisitions of the same static phantom. Walk me through your diagnosis.",
a: "Both images fit their data, so this points at ill-conditioning rather than a bug: the inverse problem has directions the measurement barely constrains, and noise picks the answer along them. I would compute the SVD of the system matrix, or of the Jacobian for a nonlinear method, and look at the singular value spectrum. A sharp drop or a long tail of tiny values confirms it, and the corresponding singular vectors show which image features are unconstrained, often edges outside the aperture. The remedies, in order: change the acquisition geometry to sense those directions, truncate or regularise the small singular values with a threshold set from the noise floor, and report uncertainty along the weak directions instead of presenting one image as truth." }
},

{
id: "cm-float",
track: "CS & Maths",
sub: "Numerical methods",
title: "Floating point without superstition",
mins: 30,
body: `
<p>Floating point is not mysterious and it is not random; it is a well-specified
rounding system, and most grief comes from treating it as exact. IEEE 754 stores a
number as sign, exponent and significand: essentially scientific notation in base 2.
FP32 gives the significand 24 bits, about 7 decimal digits; FP64 gives 53 bits,
about 16 digits. Every arithmetic operation computes the exact result, then rounds
it to the nearest representable number. One operation is fine. The trouble is what
sequences of operations do to those rounding errors.</p>
<h3>Catastrophic cancellation</h3>
<p>Subtracting nearly equal numbers deletes the digits you trusted. Worked example:
two path lengths measured as 1.0000123 m and 1.0000045 m, both stored in FP32.
Each is only good to about 7 digits, so each carries an absolute error near 1e-7 m.
Their difference is 7.8e-6 m, but the errors do not cancel: the result is
7.8e-6 plus or minus roughly 2e-7, so of your 7 stored digits barely 1.5 remain
meaningful. The inputs were fine; the subtraction destroyed the information. Cures:
rearrange the algebra to avoid the subtraction (compute the difference directly from
raw quantities), or carry that one step in FP64.</p>
<h3>Accumulation and the Kahan idea</h3>
<p>Long sums grind digits away because a big accumulator cannot absorb small
addends. Blunt demonstration: FP32 represents integers exactly only up to
2^24 = 16777216. Add 1.0f repeatedly and the sum climbs correctly until 16777216,
then stops moving: 16777216 + 1 rounds back to 16777216. Averaging ten million
samples in an FP32 accumulator is therefore quietly wrong. Kahan summation fixes it
with one extra variable that captures each addition's rounding error and feeds it
back into the next step, recovering nearly full precision for the cost of a few
extra flops. Simpler alternatives: accumulate in FP64, or sum blocks pairwise.</p>
<h3>Never compare with equality</h3>
<p>if (x == 0.1 * 3) is a bug: neither side is exactly representable and they were
rounded at different points. Compare with a tolerance instead, and make it relative
for large numbers and absolute near zero: abs(a - b) less than atol + rtol * abs(b).
Choosing rtol is a judgement about your algorithm's expected error, not a ritual
1e-9.</p>
<h3>ULP</h3>
<p>One ULP, a unit in the last place, is the gap between a float and its nearest
neighbour. The gap scales with the number: near 1.0, an FP32 ULP is about 1.2e-7;
near 16 million it is exactly 1. Saying two results agree within a few ULP is the
precise way to say they are as equal as this format allows.</p>
<h3>Why GPU and CPU results differ legitimately</h3>
<p>Floating point addition is not associative: (a + b) + c can differ from
a + (b + c) in the last bits. A GPU sums in parallel with a different grouping than
a serial CPU loop, may fuse multiply and add into one rounding (FMA), and may use
different library code for functions like exp. Bit-identical results across the two
are the unreasonable expectation; agreement within a small relative tolerance is the
correct acceptance test. An FP32 pipeline that matches an FP64 reference to 1e-6
relative is healthy, not broken.</p>`,
quiz: [
{ q: "FP32 and FP64 carry roughly how many decimal digits respectively?",
o: ["3 and 6", "10 and 20", "7 and 16", "32 and 64"],
a: 2, why: "24 significand bits give about 7 decimal digits; 53 bits give about 16. The exponent extends range, not precision." },
{ q: "Subtracting 1.0000123 from 1.0000045 stored in FP32 is dangerous because:",
o: ["Subtraction is slower than addition", "The result is negative", "FP32 cannot store numbers near 1", "The shared leading digits cancel, leaving a result dominated by the operands' rounding errors"],
a: 3, why: "Each operand is good to about 1e-7 absolute; the difference of 7.8e-6 inherits those errors, so only one or two significant digits survive." },
{ q: "Repeatedly adding 1.0f to an FP32 accumulator stalls at 16777216 because:",
o: ["Beyond 2 to the power 24 the gap between consecutive FP32 values exceeds 1, so adding 1 rounds back", "FP32 overflows at that value", "The compiler caps loop counts", "1.0f is not exactly representable"],
a: 0, why: "At that magnitude one ULP equals 2, so the exact sum lands between representable values and rounds down to the unchanged accumulator. Kahan or FP64 accumulation avoids it." },
{ q: "Your CUDA port matches the CPU reference to 1e-6 relative error but not bit-for-bit. The right conclusion is:",
o: ["The GPU has a hardware fault", "The port is broken and must be fixed", "This is expected: different summation order and FMA change last-bit rounding, and tolerance-based comparison is the correct test", "FP32 should never be used on GPUs"],
a: 2, why: "Float addition is not associative and GPUs group operations differently, so last-bit differences are legitimate. Validate against a tolerance, ideally versus an FP64 reference." }
],
interview: {
q: "A junior engineer says the GPU port must be buggy because its output does not exactly match the CPU version. How do you respond?",
a: "I would explain that bit-identical was never the right target. Floating point addition is not associative, and the GPU sums in a different order, fuses multiply-adds with different rounding, and uses different transcendental libraries, so last-bit differences are expected behaviour, not bugs. The proper test is a tolerance: compare both against an FP64 reference and require agreement within a bound justified by the algorithm, something like 1e-6 relative for a healthy FP32 pipeline. Then I would check the discrepancy actually is last-bit sized: if errors reach 1e-3, that points to real problems like catastrophic cancellation or an FP32 accumulator over millions of samples, which we would fix with reordering or Kahan summation. Same maths, different rounding paths." }
},

{
id: "cm-stats",
track: "CS & Maths",
sub: "Statistics and learning",
title: "Statistics for experiments",
mins: 30,
body: `
<p>Instrument statistics starts with one formula and a list of the ways it fails.
The formula: average N independent measurements with standard deviation sigma and
the mean has a standard error of sigma divided by sqrt(N). Worked numbers: single
readings with sigma = 10 mV, average 100 of them, and the standard error of the mean
is 10/sqrt(100) = 1 mV. Want 0.5 mV? You need 400 readings: halving the error costs
four times the data. That sqrt is why averaging is powerful and why it is expensive.</p>
<h3>When averaging fails</h3>
<p>The sqrt(N) law assumes the errors are independent and the thing measured holds
still. Both assumptions break routinely.</p>
<ul>
<li><b>Drift</b>: if the baseline creeps (temperature, ageing), longer averages
eventually get worse, not better: you are averaging a moving target. Symptom: the
error shrinks with N, bottoms out, then grows. Cures: measure faster than the drift,
alternate signal and reference, or fit the drift and remove it.</li>
<li><b>Correlated noise</b>: if consecutive samples share low-frequency noise, N
samples do not contain N independent pieces of information. The effective N is
smaller, sometimes drastically, and the naive sigma/sqrt(N) claim overstates your
precision. Check by plotting error against averaging length and seeing where it
departs from the sqrt line.</li>
</ul>
<h3>Variance propagation</h3>
<p>For independent errors: adding or subtracting quantities, the variances add, so
uncertainties add in quadrature: sqrt(0.3^2 + 0.4^2) = 0.5, not 0.7. Multiplying or
dividing, the relative uncertainties add in quadrature: a 1 percent timing error and
a 2 percent length error give a speed error of sqrt(1 + 4), about 2.2 percent. The
practical reading: the biggest term dominates, so improve the worst measurement and
ignore the rest until it is no longer the worst.</p>
<h3>Histogram before summary</h3>
<p>Mean and standard deviation silently assume one blob of roughly Gaussian data.
Plot the histogram first. Two peaks mean two regimes (a mode-hopping laser, a
trigger firing on the wrong edge) and the mean sits meaninglessly between them.
A heavy one-sided tail means the median tells the truth and the mean chases the
tail. Thirty seconds of plotting prevents a summary statistic of a distribution it
does not describe.</p>
<h3>Outlier policy</h3>
<p>Investigate, do not silently delete. An outlier is either a fault, in which case
it has a cause worth finding (mains spike, cosmic ray, cable knock, off-by-one in
the parser), or it is real physics being inconvenient. Deleting points because they
spoil the fit is how discoveries and bugs both get erased. Defensible practice:
a stated rule fixed in advance, every exclusion logged, and results reported with
and without the excluded points.</p>
<h3>What Cramer-Rao tells a designer</h3>
<p>The Cramer-Rao bound is the floor: given your noise level and measurement model,
no unbiased estimator can beat a certain variance. Its two uses are worth
memorising. If your estimator sits far above the bound, better software can help.
If it sits at the bound, stop tuning code: only better physics, more bandwidth,
more SNR or longer integration, will improve the measurement. It converts arguments
about algorithms into a number that says whether the algorithm was ever the
problem.</p>`,
quiz: [
{ q: "Single readings have sigma of 10 mV. To get a standard error of the mean of 0.5 mV you need about:",
o: ["20 readings", "400 readings", "40 readings", "100 readings"],
a: 1, why: "SEM equals sigma over sqrt(N), so N equals (10/0.5) squared, which is 400. Each halving of the error quadruples the data required." },
{ q: "Averaging longer initially improves your measurement, then makes it worse. The classic cause is:",
o: ["Too much data for the computer", "The sqrt law working correctly", "Detector saturation", "Baseline drift: beyond some length you are averaging a moving target"],
a: 3, why: "Independence and stationarity underpin sqrt(N); slow drift violates stationarity, so long averages mix different true values. Measure faster than the drift or remove it." },
{ q: "Two independent uncertainties of 0.3 mm and 0.4 mm on added lengths combine to:",
o: ["0.5 mm", "0.7 mm", "0.35 mm", "0.12 mm"],
a: 0, why: "Independent errors add in quadrature: sqrt(0.09 + 0.16) equals sqrt(0.25), which is 0.5 mm. Straight addition of 0.7 assumes fully correlated errors." },
{ q: "Your estimator's variance already sits at the Cramer-Rao bound. The way to improve precision is:",
o: ["A cleverer estimation algorithm", "More iterations of the same fit", "Better physics: more SNR, bandwidth or integration time, since no unbiased estimator can beat the bound", "Averaging the estimator with itself"],
a: 2, why: "The bound is the information-theoretic floor for the given data. At the floor, only changing the measurement itself, not the software, buys precision." }
],
interview: {
q: "A technician reports that averaging for ten minutes gives worse repeatability than averaging for one minute. What is going on and what do you do?",
a: "That inverted result almost always means the sqrt(N) assumptions are broken, and my first suspect is drift: if the baseline moves with temperature or time, long averages blend different true values and repeatability degrades. I would plot the deviation against averaging length; independent noise follows the inverse sqrt line, and the point where the curve flattens and turns upward measures the drift timescale. I would also check for correlated low-frequency noise, which reduces the effective number of independent samples. Fixes in order: average only up to the optimum length, alternate measurement and reference to cancel the drift, stabilise the dominant environmental driver, or fit and subtract the drift. The one-minute result is not luck; it is the instrument telling us its stability budget." }
}

);
