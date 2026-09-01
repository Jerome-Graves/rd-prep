// CS and Maths lessons, second course: algorithms and measurement.
//
// These carry a `sub` so the page groups them under a heading, in the same way
// the Embedded C track is organised.

LESSONS.push(

{
id: "cm-complexity",
track: "CS & Maths",
sub: "Algorithms and measurement",
title: "What big-O hides, and when it lies to you",
mins: 20,
body: `
<p>Asymptotic complexity tells you how the cost grows as the input grows without bound. That is
a genuinely useful thing to know and it is not the same as knowing which of two implementations
is faster on your data.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Two curves crossing, where the asymptotically better algorithm is slower below the crossover point">
<line class="ln" x1="70" y1="60" x2="70" y2="200"/>
<line class="ln" x1="70" y1="200" x2="630" y2="200"/>
<text class="ts" x="24" y="66">cost</text>
<text class="ts" x="580" y="222">input size</text>

<line class="ln" x1="70" y1="190" x2="620" y2="70"/>
<text class="ts" x="500" y="60">O(n squared), small constant</text>

<line class="ln" x1="70" y1="130" x2="620" y2="105"/>
<text class="ts" x="480" y="126">O(n log n), large constant</text>

<circle class="dot" cx="345" cy="118" r="5"/>
<text class="th" x="300" y="104">crossover</text>
<text class="ts" x="130" y="176">real inputs often live here</text>
</svg>

<p>Big-O discards the constant factor and every lower-order term, and on real hardware the
constant factor is where the cache lives. A vector and a linked list are both O(n) to traverse,
and the vector is often five to ten times faster because one is a sequential walk the prefetcher
can predict and the other is a chain of dependent loads that stall.</p>

<p>It also averages over cases that behave very differently. Quicksort's average is n log n and
its worst case is n squared, and which you get depends on the pivot strategy and the input.
Hash table lookup is constant on average and linear when the keys collide, which an adversary
can arrange deliberately.</p>

<p>And it says nothing about <b>where</b> the cost falls. An algorithm that is asymptotically
worse but does all its work sequentially over contiguous memory can beat a better one that
allocates, chases pointers or misses the cache. On a modern processor a cache miss is a few
hundred cycles, which is a great many comparisons.</p>

<p>The honest position is that big-O is a tool for the right question. Use it to reject an
approach that will not scale, because an n squared algorithm on a million elements is not a
tuning problem, it is a wrong choice. Then measure the candidates that survive, with realistic
data and realistic sizes, because below the crossover the asymptotically worse one frequently
wins.</p>

<p>The specific traps worth remembering: amortised is not worst case, which matters in a
real-time path where one expensive resize can miss a deadline; average is not worst case when
an adversary controls the input; and the size of n in your system may be permanently small, in
which case the constant factor is the only thing that has ever mattered.</p>
`,
quiz: [
{ q: "Why can a vector beat a linked list when both traversals are O(n)?",
o: ["Vectors have a lower asymptotic complexity", "Sequential access is cache friendly and predictable", "Linked lists cannot be traversed in order", "Vectors avoid the loop overhead entirely"],
a: 1, why: "Big-O discards the constant factor, and on real hardware the constant factor is where the cache lives. Pointer chasing defeats the prefetcher." },
{ q: "Why does amortised constant time matter in a real-time path?",
o: ["It is slower than true constant time on average", "One expensive operation can still miss a deadline", "It only applies to hash tables", "It cannot be measured accurately"],
a: 1, why: "Doubling on resize makes the total linear over a long sequence, but a single insert may be O(n). The deadline cares about that one." },
{ q: "What is big-O genuinely good for?",
o: ["Predicting which of two implementations is faster", "Rejecting an approach that will not scale at all", "Estimating the cache behaviour of an algorithm", "Choosing between two constant-time operations"],
a: 1, why: "An n squared algorithm on a million elements is a wrong choice rather than a tuning problem. Below the crossover, measurement decides." },
{ q: "When does average-case complexity mislead you badly?",
o: ["When the input is randomly distributed", "When an adversary can choose the input", "When the data set is very large", "When the algorithm is recursive"],
a: 1, why: "Hash table lookup is constant on average and linear when keys collide, and an attacker can arrange exactly that. It is a denial-of-service vector." }
],
interview: {
q: "A colleague says an algorithm is O(n log n) so it will be fast enough. How would you respond?",
a: "I would say that tells us it will scale, which is useful, and it does not tell us it will be fast enough, which is a different question. Big-O discards the constant factor and every lower-order term, and on real hardware the constant factor is largely about memory access, so two algorithms with the same complexity can differ by an order of magnitude depending on whether they walk contiguous memory or chase pointers. A cache miss is a few hundred cycles, which is a great many comparisons, so an asymptotically worse algorithm that streams can comfortably beat a better one that allocates and misses. I would also want to know which n we are actually talking about, because if the input is permanently a few hundred elements then we are below the crossover point and the constant factor is the only thing that has ever mattered. And I would ask whether the figure is average or worst case, because those diverge in exactly the situations that hurt: quicksort is n log n on average and n squared on the wrong input, hash lookup is constant on average and linear when the keys collide, and amortised constant is not the same as constant if there is a deadline, since one expensive resize can miss it. So the way I would use the complexity figure is to reject anything that plainly will not scale, because that is a wrong choice rather than a tuning problem, and then measure the candidates that survive against realistic data at realistic sizes. The measurement is what answers fast enough."
}
},

{
id: "cm-dp",
track: "CS & Maths",
sub: "Algorithms and measurement",
title: "Dynamic programming: recognising overlapping subproblems",
mins: 20,
body: `
<p>Dynamic programming applies whenever a problem has two properties. It has <b>optimal
substructure</b>, meaning the best solution is built from best solutions to smaller versions of
the same problem. And it has <b>overlapping subproblems</b>, meaning the same smaller problem
comes up many times.</p>

<p>That second property is what distinguishes it from divide and conquer. Merge sort splits into
subproblems that never overlap, so caching results would gain nothing. Fibonacci computed
recursively re-solves the same values exponentially often, so caching turns exponential into
linear.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A recursion tree with repeated identical subproblems, and the same computation as a filled table with each entry computed once">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">naive recursion</text>
<rect class="bx" x="24" y="72" width="308" height="150" rx="4"/>
<text class="ts" x="40" y="100">f(5)</text>
<text class="ts" x="60" y="126">f(4)          f(3)</text>
<text class="ts" x="80" y="152">f(3)   f(2)   f(2)  f(1)</text>
<text class="ts" x="40" y="192">the same values, again and again</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">tabulated</text>
<rect class="bx" x="348" y="72" width="308" height="150" rx="4"/>
<text class="ts" x="364" y="100">f(1) f(2) f(3) f(4) f(5)</text>
<text class="ts" x="364" y="132">each computed exactly once</text>
<text class="ts" x="364" y="164">order chosen so dependencies</text>
<text class="ts" x="364" y="186">are already filled in</text>
</svg>

<p>There are two ways to implement it. <b>Memoisation</b> keeps the natural recursion and caches
results as they are computed, which is the smaller change and only computes what is actually
needed. <b>Tabulation</b> fills a table bottom up in an order guaranteeing every dependency is
already present, which avoids the recursion entirely and is usually faster and easier to bound
in memory.</p>

<p>The design work is choosing the <b>state</b>. It must capture everything the future depends
on and nothing else. Too little and the recurrence is wrong; too much and the table is enormous.
That is the same requirement as a state in a control system, and recognising it as such helps.</p>

<p>Memory is often the binding constraint rather than time. A great many recurrences depend only
on the previous row of the table, in which case you keep two rows rather than the whole thing
and the memory drops from quadratic to linear. That trick alone makes several textbook
algorithms practical on real inputs.</p>

<p>The trap worth naming is applying it where the subproblems do not actually overlap. Then you
have added a table, a lookup and a great deal of code for no gain at all, and plain recursion or
a greedy algorithm was the right answer.</p>
`,
quiz: [
{ q: "What distinguishes dynamic programming from divide and conquer?",
o: ["It always uses less memory", "The subproblems overlap, so caching gains something", "It is applied bottom up rather than top down", "It requires the problem to be numerical"],
a: 1, why: "Merge sort's subproblems never overlap, so a cache would gain nothing. Fibonacci re-solves the same values exponentially often, so caching transforms it." },
{ q: "What is the difference between memoisation and tabulation?",
o: ["Memoisation caches within the recursion, tabulation fills bottom up", "Memoisation is exact, tabulation is approximate", "Tabulation only works for numerical problems", "Memoisation cannot handle overlapping subproblems"],
a: 1, why: "Memoisation is the smaller change and computes only what is needed. Tabulation avoids the recursion, is usually faster, and is easier to bound in memory." },
{ q: "What must the state in a dynamic program capture?",
o: ["The whole history of the input", "Everything the future depends on, and nothing more", "The optimal solution found so far", "The number of subproblems remaining"],
a: 1, why: "Too little and the recurrence is wrong; too much and the table is enormous. It is the same requirement as a state in a control system." },
{ q: "How is a quadratic-memory dynamic program often reduced to linear?",
o: ["By using memoisation instead of tabulation", "By keeping only the rows the recurrence depends on", "By solving the subproblems in parallel", "By compressing the table entries"],
a: 1, why: "A great many recurrences depend only on the previous row, so two rows suffice. That alone makes several textbook algorithms practical on real inputs." }
],
interview: {
q: "How do you recognise a problem that dynamic programming will solve?",
a: "I look for two properties together. The first is optimal substructure, meaning the best answer to the whole problem is built out of best answers to smaller instances of the same problem, so the recurrence is well defined. The second, and the one that actually justifies the technique, is overlapping subproblems, meaning the same smaller instance comes up many times. That is what separates it from divide and conquer: merge sort splits into subproblems that never recur, so caching would gain nothing at all, whereas a naive recursive Fibonacci re-solves the same values exponentially often and caching turns it from exponential into linear. Once I think it applies, the real design work is choosing the state, because the state has to capture everything the future depends on and nothing more. Too little and the recurrence is simply wrong; too much and the table becomes enormous. I find it helps to think of it exactly as I would a state in a control system. On implementation I would usually start with memoisation, keeping the natural recursion and caching results, because it is a small change and only computes what is actually reached, and then move to tabulation if I need the speed or a bounded memory footprint. Memory is often the binding constraint rather than time, and the trick worth knowing is that many recurrences only depend on the previous row of the table, so keeping two rows instead of the whole table takes the memory from quadratic to linear. The mistake I would want to avoid is applying it where the subproblems do not overlap, because then I have added a table and a lot of code for nothing."
}
},

{
id: "cm-random",
track: "CS & Maths",
sub: "Algorithms and measurement",
title: "Random numbers, seeds and reproducibility",
mins: 20,
body: `
<p>A great deal of engineering work depends on randomness: Monte Carlo simulation, randomised
testing, dithering, stochastic optimisation. All of it depends on the generator being good
enough for the job and on the results being reproducible, and those two requirements pull in
different directions unless you are deliberate.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Three categories of generator: weak legacy generators, good statistical generators, and cryptographic generators">
<rect class="bx" x="24" y="30" width="200" height="180" rx="4"/>
<text class="th" x="40" y="58">legacy</text>
<text class="ts" x="40" y="86">rand and similar</text>
<text class="ts" x="40" y="112">short period,</text>
<text class="ts" x="40" y="134">poor low bits,</text>
<text class="ts" x="40" y="156">correlated in</text>
<text class="ts" x="40" y="178">higher dimensions</text>

<rect class="bx" x="240" y="30" width="200" height="180" rx="4"/>
<text class="th" x="256" y="58">statistical</text>
<text class="ts" x="256" y="86">Mersenne, PCG,</text>
<text class="ts" x="256" y="108">xoshiro</text>
<text class="ts" x="256" y="140">long period, passes</text>
<text class="ts" x="256" y="162">the test suites,</text>
<text class="ts" x="256" y="184">fast and seedable</text>

<rect class="bx" x="456" y="30" width="200" height="180" rx="4"/>
<text class="th" x="472" y="58">cryptographic</text>
<text class="ts" x="472" y="86">unpredictable even</text>
<text class="ts" x="472" y="108">given past output</text>
<text class="ts" x="472" y="140">slower, and you</text>
<text class="ts" x="472" y="162">must not seed it</text>
<text class="ts" x="472" y="184">reproducibly</text>
</svg>

<p>The classic library <code>rand</code> is not good enough for simulation. Its period can be
short, its low-order bits are often visibly patterned, and successive values can be correlated
when used as coordinates in more than one dimension, which is exactly what a Monte Carlo
integration does. Modern generators such as PCG or xoshiro are fast, small and pass the standard
statistical test suites.</p>

<p>The other everyday error is <b>reducing the range by a modulo</b>. Taking a generator's output
modulo n is biased whenever n does not divide the generator's range, and the bias is largest for
large n. The correct approach is rejection sampling, which the standard library's uniform
distribution already implements.</p>

<p><b>Reproducibility</b> is the property that makes randomised work usable. Log the seed, always,
and make it settable. A randomised test that fails is worth very little if you cannot run it
again; with the seed recorded, a failure becomes a directed test you can keep. The same applies
to a simulation whose result you may need to defend months later.</p>

<p>Reproducibility across <b>threads</b> needs more care. Sharing one generator introduces both
contention and an ordering dependence, so results change with scheduling. The standard answer is
a separate generator per stream, seeded deterministically from a master seed and a stream index,
which gives independence and repeatability at the same time.</p>

<p>Finally, do not use a statistical generator for anything security related, and do not seed a
cryptographic one reproducibly. Those two requirements are genuinely incompatible, which is why
they are different tools.</p>
`,
quiz: [
{ q: "Why is the classic rand unsuitable for Monte Carlo work?",
o: ["It is too slow for large simulations", "Short period, weak low bits and correlation in higher dimensions", "It cannot be seeded reproducibly", "It only produces integers"],
a: 1, why: "Successive values used as coordinates can be visibly correlated, which is exactly what an integration does. PCG or xoshiro are fast and pass the test suites." },
{ q: "What is wrong with reducing a random value with modulo n?",
o: ["It is slower than a division", "It biases the result unless n divides the range", "It destroys the generator's period", "It only works for powers of two"],
a: 1, why: "The bias is largest for large n. Rejection sampling is correct, and the standard library's uniform distribution already does it." },
{ q: "Why log the seed of a randomised test?",
o: ["It proves the test was actually random", "A failure becomes reproducible and can be kept as a directed test", "It allows the generator to be changed later", "It is required for statistical validity"],
a: 1, why: "A failing seed is a reproducible case pointing at a real defect. Without it, rerunning until it passes discards the only hard information you had." },
{ q: "How should random numbers be handled across threads?",
o: ["Share one generator behind a mutex", "A separate generator per stream, seeded from a master seed", "Use a cryptographic generator, which is thread safe", "Seed each thread from the system clock"],
a: 1, why: "Sharing introduces contention and an ordering dependence, so results change with scheduling. Per-stream generators give independence and repeatability together." }
],
interview: {
q: "You are setting up a Monte Carlo simulation. What do you think about for the random numbers?",
a: "Three things: the quality of the generator, the correctness of how I map its output onto the distribution I want, and reproducibility. On quality, I would not use the classic library rand, because its period can be short, its low-order bits are often visibly patterned, and successive values can be correlated when used as coordinates in several dimensions, which is precisely what a Monte Carlo integration does. I would use something like PCG or xoshiro, which are fast, small, seedable and pass the standard statistical test suites. On mapping, the everyday error is reducing the range with a modulo, which is biased whenever the modulus does not divide the generator's range and is worst for large ranges; the correct approach is rejection sampling and the standard library's uniform distribution already implements it, so I would use that rather than roll my own. On reproducibility, I would log the seed and make it settable, because a simulation result I cannot reproduce is one I cannot defend, and a randomised test that fails is worth very little unless I can run it again. If the simulation is threaded I would not share one generator, because that gives me both lock contention and a dependence on scheduling order, so the results would change run to run; instead I would use one generator per stream, seeded deterministically from a master seed and a stream index, which gives me independence and repeatability at the same time. And I would keep clearly in mind that a statistical generator is not a cryptographic one, and that seeding a cryptographic generator reproducibly defeats its purpose, because those two requirements are genuinely incompatible."
}
},

{
id: "cm-integrity",
track: "CS & Maths",
sub: "Algorithms and measurement",
title: "Checksums, CRCs and hashes: choosing the right integrity check",
mins: 20,
body: `
<p>Three different tools get called checksums, and they defend against three different things.
Using the wrong one is a common and quiet mistake.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="A simple checksum, a CRC and a cryptographic hash compared by what each detects and what each costs">
<rect class="bx" x="24" y="30" width="200" height="180" rx="4"/>
<text class="th" x="40" y="58">sum or XOR</text>
<text class="ts" x="40" y="86">catches single bit</text>
<text class="ts" x="40" y="108">errors, trivially cheap</text>
<text class="ts" x="40" y="142">misses reordering,</text>
<text class="ts" x="40" y="164">misses two errors</text>
<text class="ts" x="40" y="186">that cancel</text>

<rect class="bx" x="240" y="30" width="200" height="180" rx="4"/>
<text class="th" x="256" y="58">CRC</text>
<text class="ts" x="256" y="86">catches all bursts up</text>
<text class="ts" x="256" y="108">to its width</text>
<text class="ts" x="256" y="140">cheap in hardware,</text>
<text class="ts" x="256" y="162">table driven in software</text>
<text class="ts" x="256" y="186">not against an attacker</text>

<rect class="bx" x="456" y="30" width="200" height="180" rx="4"/>
<text class="th" x="472" y="58">cryptographic hash</text>
<text class="ts" x="472" y="86">infeasible to forge</text>
<text class="ts" x="472" y="108">a collision</text>
<text class="ts" x="472" y="140">much more expensive</text>
<text class="ts" x="472" y="162">and still not</text>
<text class="ts" x="472" y="186">authentication alone</text>
</svg>

<p>A <b>simple sum or XOR</b> catches a single flipped bit and very little else. Two errors that
cancel, or a reordering of the data, both pass. It is adequate for a short message on a reliable
link and is not an integrity check in any serious sense.</p>

<p>A <b>CRC</b> is polynomial division over a binary field, and its properties are precise
rather than statistical: a well-chosen CRC of width n detects every burst error up to n bits,
all single and double bit errors, and any odd number of errors. That guarantee is why it appears
in every serious link layer. It is cheap in hardware, a shift register and some XORs, and
table-driven in software.</p>

<p>A <b>cryptographic hash</b> defends against a deliberate adversary. A CRC is trivial to forge:
given a message and a target CRC, computing the modification that produces it is straightforward
arithmetic. If someone might tamper with the data, you need a hash, and if you need to know
<i>who</i> produced it you need a message authentication code or a signature, because a bare
hash proves nothing about origin.</p>

<p>Two practical points. Choose a <b>standard polynomial</b> rather than inventing one, because
the published ones have known and proven error-detection properties at particular message
lengths, and a homemade polynomial may be far weaker than its width suggests. And check the
<b>parameters</b>, because CRC-32 alone does not specify an implementation: the initial value,
whether the input and output are bit-reflected, and the final XOR all vary between standards,
and two correct implementations with different parameters simply disagree.</p>

<p>Finally, be clear what the check covers. A CRC on a packet says the packet arrived intact; it
says nothing about whether it was written to flash correctly, or whether the sender read it
correctly in the first place. End-to-end checks catch what per-hop checks cannot.</p>
`,
quiz: [
{ q: "What does a CRC guarantee that a simple sum does not?",
o: ["Protection against a deliberate attacker", "Detection of every burst error up to its width", "A smaller check value for the same data", "Detection of reordering within the message"],
a: 1, why: "The properties are precise rather than statistical, which is why CRCs appear in every serious link layer. Sums miss cancelling errors entirely." },
{ q: "Why is a CRC useless against tampering?",
o: ["It is too short to be secure", "Given a target value, the required modification is easy to compute", "It cannot be applied to encrypted data", "It only covers part of the message"],
a: 1, why: "Forging one is straightforward arithmetic. Deliberate tampering needs a cryptographic hash, and knowing who sent it needs a MAC or a signature." },
{ q: "Why do two correct CRC-32 implementations sometimes disagree?",
o: ["One of them has a bug in the table", "Initial value, reflection and final XOR vary between standards", "The polynomial differs between processors", "The message length affects the result"],
a: 1, why: "The name alone does not specify an implementation. The parameters have to be matched, which is a common interoperability problem." },
{ q: "What does a per-hop CRC not tell you?",
o: ["Whether the link introduced a burst error", "Whether the data was correct before it was sent", "Whether the packet was reordered in transit", "Whether the packet arrived at all"],
a: 1, why: "It covers the hop, not the path. An end-to-end check is what catches corruption in memory, in a driver, or before transmission." }
],
interview: {
q: "You are designing a protocol for a noisy link. How do you protect the data?",
a: "I would use a CRC for the link itself, and I would choose a standard polynomial rather than invent one, because the published polynomials have proven error-detection properties at particular message lengths and a homemade one can be much weaker than its width suggests. The reason a CRC rather than a sum is that its guarantees are precise rather than statistical: a well-chosen CRC of a given width detects every burst error up to that width, all single and double bit errors, and any odd number of errors, whereas a simple sum misses two errors that cancel and misses reordering entirely. I would size it against the expected error rate and the message length, and I would pin down the parameters explicitly in the specification, because CRC-32 as a name does not define an implementation: the initial value, whether the input and output are bit reflected and the final XOR all vary, and two perfectly correct implementations with different parameters just disagree, which is a classic interoperability problem. Beyond the link I would think about what the check actually covers, because a per-hop CRC tells me the hop was clean and says nothing about whether the data was already corrupted in memory or by a driver before it was sent, so for anything important I would add an end-to-end check as well. And I would be explicit about the threat model. A CRC protects against noise, not against an adversary, because given a message and a target CRC the required modification is easy to compute. If tampering is in scope I need a cryptographic hash, and if I need to know who produced the data then even a hash is not enough and I need a message authentication code or a signature."
}
},

{
id: "cm-search",
track: "CS & Maths",
sub: "Algorithms and measurement",
title: "Searching: binary search, and the bugs it is famous for",
mins: 18,
body: `
<p>Binary search is four lines long and was reportedly implemented incorrectly in most textbooks
for two decades. It is worth understanding exactly why, because the failure modes generalise.</p>

<svg class="fig" viewBox="0 0 680 230" role="img" aria-label="A sorted range being halved repeatedly, with the invariant that the target lies within the current bounds">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">the invariant: if the target is present, it lies within low and high</text>

<rect class="bx" x="40" y="80" width="600" height="34" rx="3"/>
<text class="ts" x="290" y="103">the whole range</text>
<rect class="bx" x="40" y="122" width="300" height="34" rx="3"/>
<text class="ts" x="150" y="145">first half</text>
<rect class="bx" x="40" y="164" width="150" height="34" rx="3"/>
<text class="ts" x="70" y="187">quarter</text>
<text class="ts" x="360" y="187">each step halves it, so log2 n steps</text>
</svg>

<p>The famous bug is computing the midpoint as low plus high, divided by two. For large indices
that sum overflows before the division, and the result is a negative or wrapped index. Computing
low plus half the difference between high and low avoids the intermediate entirely, and costs
nothing.</p>

<p>The second family of bugs is the boundary condition. Whether the upper bound is inclusive or
exclusive, whether the loop condition uses less-than or less-than-or-equal, and whether the
range shrinks on every iteration all have to be consistent. Getting one wrong gives either an
infinite loop when the range stops shrinking, or a miss at one end.</p>

<p>The way to get it right is to state the <b>invariant</b> explicitly and check that every
branch preserves it: if the target is present, it lies within the current bounds. Then confirm
the range strictly shrinks each iteration, which guarantees termination.</p>

<p>In practice you should rarely write it. The standard library gives you lower bound, upper
bound and equal range, and those answer more useful questions than a plain found-or-not: where
would this be inserted, what is the first element not less than this, what is the range of
elements equal to this. Reaching for the library version also gets the overflow and the
boundaries right for free.</p>

<p>Two conditions are easy to forget. The range must genuinely be <b>sorted</b> by the same
comparator you are searching with, and a comparator inconsistent with the ordering gives
undefined behaviour rather than a wrong answer. And binary search needs <b>random access</b>: on
a linked list it degenerates to a linear walk with extra steps, which is why searching a list
means using a different structure rather than a different algorithm.</p>
`,
quiz: [
{ q: "What is the classic binary search overflow bug?",
o: ["The loop counter overflows on a long array", "Computing the midpoint as low plus high before dividing", "The return value overflows for large indices", "The comparison function overflows on large values"],
a: 1, why: "The sum overflows before the division for large indices. Computing low plus half the difference avoids the intermediate entirely and costs nothing." },
{ q: "What guarantees a binary search terminates?",
o: ["The array being sorted", "The range strictly shrinking on every iteration", "The loop condition using less-than-or-equal", "The midpoint being computed correctly"],
a: 1, why: "If a branch can leave the range unchanged, the loop can spin forever. Stating the invariant and checking the shrink is how you get it right." },
{ q: "Why prefer the library's lower bound to a hand-written search?",
o: ["It is faster on every implementation", "It answers a more useful question and gets the edge cases right", "It works on unsorted data as well", "It avoids the need for a comparator"],
a: 1, why: "Where would this be inserted, and what is the first element not less than this, are more useful than found-or-not, and the overflow and boundaries come free." },
{ q: "Why does binary search not help on a linked list?",
o: ["Linked lists cannot be sorted", "It needs random access, so it degenerates to a linear walk", "The comparator cannot be applied to nodes", "The midpoint cannot be computed"],
a: 1, why: "Reaching the midpoint costs a traversal, so you have done a linear walk with extra steps. The answer is a different structure, not a different algorithm." }
],
interview: {
q: "Write me a binary search. What are you being careful about?",
a: "In production I would not write one, I would use the standard library's lower bound or equal range, because they answer a more useful question than found-or-not and they get the edge cases right. But the things I would be careful about if I did write it are these. First, the midpoint: computing low plus high and then dividing overflows for large indices, which is the famous bug that sat in textbooks for years, so I compute low plus half the difference between high and low, which never forms the large intermediate. Second, the boundary convention: whether the upper bound is inclusive or exclusive has to be consistent with the loop condition and with how I shrink the range, and getting one of the three wrong gives either an infinite loop, when a branch fails to shrink the range, or a miss at one end. The way I keep that straight is to state the invariant explicitly, that if the target is present it lies within the current bounds, and then check that every branch preserves it and that the range strictly shrinks each iteration, which is what guarantees termination. Third, the preconditions: the range genuinely has to be sorted by the same comparator I am searching with, and a comparator that is inconsistent with the ordering is undefined behaviour rather than merely a wrong answer, so it can read out of bounds. And I would remember that binary search needs random access, so on a linked list it degenerates to a linear walk with extra work, and the right response there is to change the data structure rather than the algorithm."
}
},

{
id: "cm-profiling",
track: "CS & Maths",
sub: "Algorithms and measurement",
title: "Measuring performance honestly",
mins: 20,
body: `
<p>Almost every performance disappointment traces back to a measurement that was not measuring
what the engineer believed. Getting the measurement right is the skill; the optimisation
afterwards is comparatively easy.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Four ways a benchmark misleads: dead code elimination, cold caches, unrepresentative data, and measuring the wrong thing">
<rect class="bx" x="24" y="30" width="632" height="46" rx="4"/>
<text class="th" x="40" y="52">the optimiser deleted the work, because the result was unused</text>
<text class="ts" x="40" y="70">a loop that computes nothing runs impossibly fast</text>

<rect class="bx" x="24" y="86" width="632" height="46" rx="4"/>
<text class="th" x="40" y="108">the caches were warm, or cold, and the real workload is not</text>
<text class="ts" x="40" y="126">the first iteration and the thousandth are different measurements</text>

<rect class="bx" x="24" y="142" width="632" height="46" rx="4"/>
<text class="th" x="40" y="164">the data was not representative</text>
<text class="ts" x="40" y="182">sorted input, all-zeros, or one size only</text>

<rect class="bx" x="24" y="198" width="632" height="46" rx="4"/>
<text class="th" x="40" y="220">the mean hid the distribution</text>
<text class="ts" x="40" y="238">a deadline cares about the worst case, not the average</text>
</svg>

<p><b>Dead code elimination</b> is the first trap. If the result of the computation is never
used, the compiler removes it, and the benchmark reports a time that reflects an empty loop.
Benchmark libraries provide a way to tell the optimiser a value is used; without it the number
is meaningless.</p>

<p><b>Cache state</b> is the second. Running the same small buffer a million times measures a
warm cache, which may or may not resemble reality. If the production workload touches the data
once, the benchmark is optimistic by an order of magnitude.</p>

<p>Then there is the question of which statistic. The <b>mean</b> hides the distribution, and
for anything with a deadline the number that matters is a high percentile or the worst case. A
routine that averages one microsecond and occasionally takes fifty is a different engineering
proposition from one that always takes two.</p>

<p><b>Amdahl's law</b> bounds what optimisation can achieve: the speedup is limited by the
fraction you do not improve. If a routine is five percent of the runtime, making it infinitely
fast gains five percent. That is why profiling before optimising is not a nicety, it is the
difference between effort that matters and effort that does not.</p>

<p>Finally, prefer a <b>sampling profiler</b> for finding where the time goes. Instrumenting
every function distorts exactly the small, hot functions you care about, because the
instrumentation is comparable in cost to the function. Sampling perturbs almost nothing and
gives a statistical picture that is usually more truthful.</p>

<p>The discipline that makes all of it work: change one thing, measure again, and keep the
measurement. A performance improvement without a before and after number is an assertion.</p>
`,
quiz: [
{ q: "Why can a benchmark report an impossibly fast time?",
o: ["The timer resolution was too coarse", "The optimiser removed the computation because the result was unused", "The cache was cold on the first iteration", "The compiler vectorised the loop"],
a: 1, why: "Dead code elimination is the first trap in any microbenchmark. Benchmark libraries provide a way to tell the optimiser a value is used." },
{ q: "What does Amdahl's law tell you before you optimise?",
o: ["How many cores the workload will scale to", "The speedup is capped by the fraction you do not improve", "Which routine consumes the most memory", "How much the compiler can optimise automatically"],
a: 1, why: "Making a five percent routine infinitely fast gains five percent. That is why profiling first is the difference between effort that matters and effort that does not." },
{ q: "Why is a sampling profiler usually preferred to instrumentation?",
o: ["It measures every function call exactly", "Instrumentation distorts the small hot functions most", "It requires no symbols to be present", "It can profile optimised builds only"],
a: 1, why: "The instrumentation cost is comparable to a small function's own cost, so it changes what it measures. Sampling perturbs almost nothing." },
{ q: "Why is the mean a poor statistic for a real-time routine?",
o: ["It is harder to compute than the median", "A deadline cares about the worst case, not the average", "It is biased by the first cold iteration", "It cannot be compared between machines"],
a: 1, why: "A routine averaging one microsecond that occasionally takes fifty is a completely different engineering proposition from one that always takes two." }
],
interview: {
q: "How would you go about making a slow piece of software faster?",
a: "I would measure before changing anything, because intuition about where time goes is famously unreliable and Amdahl's law means effort spent on the wrong five percent is capped at a five percent gain no matter how well I do it. So the first step is a profile, and I would prefer a sampling profiler over instrumentation, because instrumenting every function distorts exactly the small hot functions I care about, since the instrumentation costs about as much as the function itself, whereas sampling perturbs almost nothing. Once I know where the time actually goes, I would build a benchmark for that piece specifically, and I would be careful about the classic ways a microbenchmark lies. The first is dead code elimination: if the result is never used, the optimiser deletes the work and I measure an empty loop, so I would use a benchmark library's do-not-optimise mechanism. The second is cache state, because running the same small buffer a million times measures a warm cache and may be an order of magnitude optimistic against a workload that touches its data once. The third is representative data, because sorted input or all zeros can take a completely different path. And I would look at the distribution rather than the mean, because if there is a deadline involved then a high percentile or the worst case is the number that matters, and a routine averaging a microsecond that occasionally takes fifty is a different proposition from one that always takes two. Then I would change one thing at a time, re-measure, and keep the numbers, because a performance claim without a before and after is just an assertion."
}
}

);
