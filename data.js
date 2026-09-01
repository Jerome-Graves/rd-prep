// R&D Prep lesson data. Each lesson: id, track, title, mins, body (HTML string),
// quiz (multiple choice), interview (open question with model answer).
// Code samples use &lt; &gt; escapes inside <pre> blocks.

const LESSONS = [

// ---------------------------------------------------------------- C++
{
id: "raii",
track: "C++",
sub: "The language",
title: "RAII and ownership",
mins: 25,
body: `
<p>In C++, the lifetime of a resource (memory, a file, a mutex lock, a serial port)
should be bound to the lifetime of a stack object. The constructor acquires, the
destructor releases. That is RAII: Resource Acquisition Is Initialisation. Everything
modern in C++ flows from taking this one idea seriously.</p>
<pre>{
    std::lock_guard&lt;std::mutex&gt; lk(m);   // acquires the lock
    // ... critical section ...
}   // lk destroyed here: lock released, even on early return or exception</pre>
<p>The firmware habit this replaces is the manual acquire/release pair, which leaks the
moment an early return, error path or exception skips the release. Destructors always
run when scope exits, so cleanup becomes unskippable.</p>
<h3>Ownership answers the question: who deletes this?</h3>
<ul>
<li><b>std::unique_ptr&lt;T&gt;</b>: exactly one owner. Cannot be copied, only moved.
When it dies, the T dies. Default choice for heap objects. Zero overhead vs a raw
pointer.</li>
<li><b>std::shared_ptr&lt;T&gt;</b>: shared ownership by reference counting. The T dies
when the last owner dies. Costs an atomic counter. Rarer than people think.</li>
<li><b>Raw pointer T*</b>: in modern code this means borrowing. Non-owning observer.
Fine to pass around; a design smell as an owner.</li>
<li><b>new / delete</b> in application code: almost always wrong now. Use
std::make_unique&lt;T&gt;(...).</li>
</ul>
<h3>Rule of Zero</h3>
<p>If your class holds resources through RAII members (unique_ptr, vector, string),
write no destructor and no copy or move functions: the compiler-generated ones are
correct. Only write the special functions when the class itself manages a raw resource,
which after this lesson it should not.</p>
<h3>Why embedded engineers should care most of all</h3>
<p>Embedded code is exactly where a missed release (a lock, a DMA channel, a chip
select) is fatal and where error paths multiply. RAII costs nothing at runtime: the
destructor call is the same machine code you would have written by hand, placed by the
compiler on every exit path. It is not a desktop luxury; it is the cheapest correctness
tool the language has.</p>`,
quiz: [
{ q: "A function acquires a mutex with std::lock_guard, then returns early on a sensor error. What happens to the mutex?",
o: ["It stays locked until the thread ends", "It is released when the guard goes out of scope", "It is released only if you call unlock()", "Undefined behaviour"],
a: 1, why: "The guard is a stack object; its destructor runs on every exit path, including early returns, and releases the lock." },
{ q: "Which type says 'exactly one owner, ownership can be transferred'?",
o: ["std::shared_ptr", "raw pointer", "std::unique_ptr", "std::weak_ptr"],
a: 2, why: "unique_ptr is single-owner and move-only. shared_ptr is shared; raw pointers should be non-owning borrows." },
{ q: "What runtime overhead does unique_ptr add over a raw owning pointer?",
o: ["An atomic reference count", "A heap allocation per pointer", "Essentially none", "A virtual call on destruction"],
a: 2, why: "unique_ptr is a zero-overhead abstraction: same size as a raw pointer, and the destructor call is the delete you would have written." },
{ q: "The Rule of Zero says:",
o: ["Never allocate memory", "Classes built from RAII members should define no special functions", "Every class needs a destructor", "Avoid constructors"],
a: 1, why: "If members manage themselves, the compiler-generated destructor/copy/move are correct. Write the five only when managing a raw resource directly." }
],
interview: {
q: "A junior engineer says RAII is a desktop luxury we cannot afford on embedded. What do you say?",
a: "RAII is free at runtime: the destructor is the same release code we would write by hand, except the compiler places it on every exit path, so we cannot forget one. Embedded is where that matters most, because our error paths hold locks, DMA channels and chip selects, and a single missed release hangs the system. If the concern is exceptions, we can compile without them and RAII still pays for early returns. If the concern is heap use, RAII is orthogonal: lock_guard and stack wrappers never touch the heap. I would show them our own bug history: most of our deadlocks were a release skipped on an error path, which is exactly the class of bug RAII deletes."
}
},

{
id: "move",
track: "C++",
sub: "The language",
title: "Move semantics, copies and references",
mins: 25,
body: `
<p>C++ copies by default. Assignment, pass-by-value and return-by-value all invoke copy
construction unless something better is available. For a vector of a million samples,
a copy is a million-element allocation and memcpy. Move semantics is the escape hatch:
instead of duplicating the guts, the new object steals them and the old object is left
empty but valid.</p>
<pre>std::vector&lt;double&gt; make_scan();        // returns by value: moved, not copied
auto a = make_scan();                     // cheap: move (or elided entirely)
auto b = a;                               // expensive: full copy
auto c = std::move(a);                    // cheap: steal a's buffer; a now empty</pre>
<h3>What std::move actually does</h3>
<p>Nothing, at runtime. It is a cast that marks an object as movable-from (an rvalue),
which lets overload resolution pick the move constructor. The real work happens in the
move constructor, which typically copies three pointers and nulls the source.</p>
<h3>lvalues and rvalues in one line each</h3>
<ul>
<li><b>lvalue</b>: has a name and an address; you can take &amp;x. Will be copied from.</li>
<li><b>rvalue</b>: a temporary about to die (function results, literals, std::move(x)).
Safe to steal from, so moves apply.</li>
</ul>
<h3>References</h3>
<ul>
<li><b>const T&amp;</b>: read-only borrow, binds to anything, the default for passing
big objects into functions.</li>
<li><b>T&amp;</b>: mutable borrow; the function will modify the caller's object.</li>
<li><b>T&amp;&amp;</b>: rvalue reference; this parameter steals. You mostly meet it in
move constructors.</li>
</ul>
<h3>The silent-copy traps</h3>
<ul>
<li>Passing a vector by value into a function that only reads it (use const ref).</li>
<li>for (auto s : container) copies every element; for (const auto&amp; s : container)
does not.</li>
<li>Using a moved-from object as if it still held its data: it is valid but
unspecified, typically empty. Assign to it before reuse.</li>
</ul>`,
quiz: [
{ q: "What does std::move(x) do at runtime?",
o: ["Copies x to a new location", "Frees x", "Nothing: it is a cast enabling move overloads", "Zeroes x"],
a: 2, why: "std::move is just static_cast to rvalue reference. The move constructor, if selected, does the actual pointer-stealing." },
{ q: "After auto b = std::move(a); where a is a vector, a is:",
o: ["Destroyed", "Valid but in an unspecified (typically empty) state", "Unchanged", "Undefined behaviour to touch"],
a: 1, why: "Moved-from standard objects are valid; you can assign to them or clear them, but should not assume contents." },
{ q: "Best parameter type for a large read-only ultrasound frame passed into a function:",
o: ["Frame f", "Frame&amp; f", "const Frame&amp; f", "Frame* f"],
a: 2, why: "const reference: no copy, cannot be modified, binds to temporaries too." },
{ q: "Which loop avoids copying each element?",
o: ["for (auto s : samples)", "for (const auto&amp; s : samples)", "Both copy", "Neither copies"],
a: 1, why: "auto by value copies every element; const auto&amp; borrows them." }
],
interview: {
q: "Your colleague returns a 50 MB std::vector from a function and another engineer objects that this copies 50 MB. Who is right?",
a: "Returning by value is fine in modern C++. Either return-value optimisation constructs the vector directly in the caller's storage, so nothing is copied at all, or worst case the move constructor runs, which copies three pointers, not 50 MB. The expensive mistake would be the caller then assigning it around by value, or iterating it with auto by value. So the guidance is: return by value freely, pass into functions by const reference, and reserve std::move for handing ownership onward."
}
},

{
id: "stl",
track: "C++",
sub: "Library and memory",
title: "STL containers and their costs",
mins: 25,
body: `
<p>Interviewers use container questions to test whether you know what your code costs.
The complete practical map:</p>
<ul>
<li><b>std::vector</b>: contiguous array. Index O(1), push_back amortised O(1), insert
in the middle O(n). Cache-friendly, and therefore the right default for almost
everything, including things textbooks say need lists.</li>
<li><b>std::deque</b>: fast push/pop at both ends, still O(1) indexing, but chunked
storage, so slightly slower iteration than vector.</li>
<li><b>std::list</b>: doubly linked. O(1) splice and mid-insert if you already hold an
iterator, but every element is a heap allocation and a cache miss. Almost never wins
in practice.</li>
<li><b>std::unordered_map / unordered_set</b>: hash table. Average O(1) lookup, insert,
erase; worst case O(n) if everything collides. No ordering.</li>
<li><b>std::map / set</b>: red-black tree. O(log n) everything, iterates in sorted
order. Choose it when you need ordering or ordered range queries, not because log n
sounds fast.</li>
</ul>
<h3>How a hash map is O(1)</h3>
<p>hash(key) picks a bucket; the bucket holds few elements if the load factor is kept
low, so lookup inspects a constant number of entries on average. Costs that interviews
probe: a bad hash puts everything in one bucket (O(n)); rehashing moves every element
when the table grows; iteration order is meaningless and changes.</p>
<h3>Iterator invalidation, the classic trap</h3>
<p>vector::push_back may reallocate, which invalidates every iterator, pointer and
reference into the vector. Erasing from a vector while iterating requires the
erase-returns-next-iterator pattern:</p>
<pre>for (auto it = v.begin(); it != v.end(); ) {
    if (bad(*it)) it = v.erase(it);
    else          ++it;
}</pre>
<h3>Small performance instincts worth saying out loud</h3>
<ul>
<li>reserve() before a known-size fill avoids repeated reallocation.</li>
<li>Contiguity beats asymptotics at small n: a linear scan of a small vector routinely
beats a hash lookup.</li>
<li>emplace_back constructs in place; push_back may construct then move.</li>
</ul>`,
quiz: [
{ q: "Middle insertion into std::vector costs:",
o: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
a: 2, why: "Everything after the insertion point shifts by one." },
{ q: "Why does std::vector usually beat std::list even for insert-heavy work at moderate sizes?",
o: ["Lists are not thread safe", "Vector's contiguous memory is cache-friendly; list nodes are scattered heap allocations", "Lists cannot be sorted", "Vector uses less code"],
a: 1, why: "Cache misses dominate modern performance; a shift within contiguous memory is often cheaper than chasing pointers." },
{ q: "When does unordered_map lookup degrade to O(n)?",
o: ["When the map is const", "When many keys hash to the same bucket", "After 1000 elements", "Never"],
a: 1, why: "Pathological or adversarial hashing puts everything in one bucket, turning lookup into a linear scan." },
{ q: "Which operation invalidates all iterators into a vector?",
o: ["Reading v[0]", "A push_back that triggers reallocation", "std::sort(v.begin(), v.end())", "v.size()"],
a: 1, why: "Reallocation moves the whole buffer; sort permutes values but the memory stays valid." }
],
interview: {
q: "You need to deduplicate a stream of a million sensor readings. Walk me through your container choice.",
a: "If I only need uniqueness and can tolerate unordered results, unordered_set gives average O(1) inserts, so O(n) overall; I would reserve capacity up front to avoid rehashing. If output must be sorted, two options: std::set for O(n log n) with sorted iteration built in, or often faster in practice, push everything into a vector, std::sort, then std::unique and erase, which is also O(n log n) but with vastly better cache behaviour and memory locality. For a million PODs I would benchmark, but expect the sort-unique vector to win."
}
},

{
id: "threads",
track: "C++",
sub: "Concurrency",
title: "Threads, races and atomics",
mins: 30,
body: `
<p>A <b>data race</b> is two threads accessing the same memory location, at least one
writing, with no synchronisation. In C++ this is undefined behaviour, not merely a
wrong value: the compiler is allowed to assume races do not happen and optimises
accordingly.</p>
<h3>The toolkit, smallest first</h3>
<ul>
<li><b>std::atomic&lt;T&gt;</b>: indivisible loads, stores and read-modify-write on a
single variable. Perfect for flags, counters and sequence numbers. atomic&lt;bool&gt;
stop_flag is the canonical clean-shutdown mechanism.</li>
<li><b>std::mutex + std::lock_guard / scoped_lock</b>: protect a compound invariant
(several variables that must change together). RAII locking, always.</li>
<li><b>std::condition_variable</b>: sleep until notified that a predicate may be true.
Always wait with a predicate: cv.wait(lk, []{ return !q.empty(); }); to survive
spurious wakeups.</li>
</ul>
<h3>Producer-consumer, the pattern behind every acquisition pipeline</h3>
<pre>std::mutex m;
std::condition_variable cv;
std::queue&lt;Frame&gt; q;

// producer (acquisition thread)
{ std::lock_guard&lt;std::mutex&gt; lk(m); q.push(frame); }
cv.notify_one();

// consumer (processing thread)
std::unique_lock&lt;std::mutex&gt; lk(m);
cv.wait(lk, []{ return !q.empty(); });
Frame f = std::move(q.front()); q.pop();
lk.unlock();          // release before the slow processing
process(f);</pre>
<p>Notice the discipline: the lock covers only the queue operations, never the slow
work. Your ScanControl code does exactly this shape in Python; C++ just makes the
sharp edges visible.</p>
<h3>Deadlock, and the two-line prevention policy</h3>
<p>Deadlock needs two locks acquired in opposite orders by two threads. Prevention:
acquire multiple locks in one global order everywhere, or take them atomically with
std::scoped_lock(m1, m2), which deadlock-avoids internally.</p>
<h3>Priority inversion (the embedded classic)</h3>
<p>Low-priority task holds a mutex; high-priority task blocks on it; medium-priority
task preempts the low one and the high-priority task starves behind it. Fix: priority
inheritance mutexes (FreeRTOS mutexes have this; its binary semaphores do not, which
is the standard exam question).</p>`,
quiz: [
{ q: "In C++, an unsynchronised concurrent read and write of the same int is:",
o: ["Fine on x86", "A performance bug only", "Undefined behaviour", "Allowed if the int is volatile"],
a: 2, why: "It is a data race, which is UB regardless of architecture. volatile does not fix races; atomics or mutexes do." },
{ q: "Best tool for a stop-requested flag checked by a worker loop:",
o: ["volatile bool", "std::atomic&lt;bool&gt;", "std::mutex around a bool", "A global int"],
a: 1, why: "A single-variable flag is exactly what atomics are for; volatile gives no atomicity or ordering guarantees in C++." },
{ q: "Why wait on a condition variable with a predicate lambda?",
o: ["Style preference", "It handles spurious wakeups and missed notifications", "It is faster", "Required by the compiler"],
a: 1, why: "cv.wait(lk, pred) loops until the predicate is true, so a spurious wakeup or an already-satisfied condition is handled correctly." },
{ q: "FreeRTOS: which primitive provides priority inheritance?",
o: ["Binary semaphore", "Mutex", "Queue", "Task notification"],
a: 1, why: "FreeRTOS mutexes implement priority inheritance; binary semaphores do not, so guarding shared state with a semaphore invites priority inversion." }
],
interview: {
q: "Your acquisition thread pushes frames and a processing thread consumes them. Frames occasionally go missing. Where do you look first?",
a: "First: is every access to the queue actually under the same lock, including size checks? A classic bug is checking empty() outside the lock, then popping inside it. Second: condition variable use. Waiting without a predicate loses frames to spurious wakeups and to notifications that fired before the wait started. Third: is the producer dropping on a full queue silently? I would add a counter on both sides, produced vs consumed, under the lock, and diff them; where the numbers diverge tells you which side lies. In my own scanner software the equivalent bug was a resume-check racing the writer, fixed by moving the check inside the lock."
}
},

// ---------------------------------------------------------------- DSP
{
id: "sampling",
track: "DSP",
sub: "Sampling and transforms",
title: "Sampling, Nyquist and aliasing",
mins: 25,
body: `
<p>Sampling at rate fs can only represent frequencies below fs/2 (the Nyquist
frequency). Any component above fs/2 does not disappear: it reflects, or folds, back
into the band as an alias at |f - k*fs|, indistinguishable from a genuine signal
there.</p>
<h3>Explain it to a layperson (rehearse this)</h3>
<p>A film camera at 24 frames per second watching a wheel: spin the wheel fast enough
and it appears to rotate slowly backwards. The samples are honest; the interpretation
is wrong, because the wheel moved more than half a revolution between frames. Aliasing
is exactly that, in voltage.</p>
<h3>Consequences you must own</h3>
<ul>
<li><b>Anti-alias filter before the ADC, always.</b> Once folded in, an alias is
mathematically indistinguishable from signal; no digital filter can remove it.</li>
<li>The filter needs a transition band, so you sample faster than 2x the signal band
in practice: fs of 2.5x to 5x the highest frequency of interest is typical.</li>
<li>Oversampling then decimating buys resolution and relaxes the analogue filter: each
4x oversample plus averaging is worth about 1 extra bit.</li>
<li>Decimation is itself sampling: filter before you throw samples away (a decimating
chain like 16 kHz PDM audio to 8 kHz must low-pass first).</li>
</ul>
<h3>Quantisation, the other half of the ADC</h3>
<p>An N-bit converter has SNR of about 6.02N + 1.76 dB for a full-scale sine. 12 bits
is roughly 74 dB. Headroom matters: a signal at one tenth of full scale wastes 20 dB
of that budget, which is why programmable gain sits in front of the ADC in your
ultrasound receiver.</p>
<h3>Choosing fs in the real world</h3>
<p>For a 2.5 MHz ultrasound transducer with usable energy to roughly 5 MHz, sampling at
25 to 50 MHz gives clean margin for the anti-alias filter and accurate time-of-flight
interpolation between samples; TOF precision improves with both SNR and oversampling.</p>`,
quiz: [
{ q: "You sample a 7 MHz tone at 10 MHz. Where does it appear?",
o: ["7 MHz", "3 MHz", "3.5 MHz", "It disappears"],
a: 1, why: "Alias at |7 - 10| = 3 MHz, folded below Nyquist (5 MHz)." },
{ q: "Why can software never remove aliasing after acquisition?",
o: ["Too slow", "The alias is bit-identical to a real in-band signal", "Patent restrictions", "It can, with a sharp FIR"],
a: 1, why: "Folding is a many-to-one map; information distinguishing alias from signal is destroyed at sampling time." },
{ q: "Approximate ideal SNR of a 12-bit ADC at full scale:",
o: ["48 dB", "62 dB", "74 dB", "96 dB"],
a: 2, why: "6.02 x 12 + 1.76 = 74 dB." },
{ q: "Before decimating 16 kHz audio to 8 kHz you must:",
o: ["Amplify it", "High-pass it", "Low-pass below 4 kHz", "Nothing, just drop samples"],
a: 2, why: "The new Nyquist is 4 kHz; content above it would alias into the decimated signal." }
],
interview: {
q: "A colleague shows you a spectrum with a mystery 300 kHz peak in a 1 MS/s capture and asks if it is real. What do you check?",
a: "First suspicion is an alias. I would change the sampling rate slightly: a real 300 kHz component stays at 300 kHz; an alias moves, because folding depends on fs. Second, check what sits above Nyquist in the analogue world: 700 kHz or 1.3 MHz sources fold to 300 kHz at 1 MS/s; switching supplies and transducer harmonics are usual suspects. Third, verify the anti-alias filter is actually in circuit and its corner is where we think. And I would look at raw time-domain data too, since a clean sinusoid at exactly one frequency often smells like interference rather than signal."
}
},

{
id: "fft",
track: "DSP",
sub: "Sampling and transforms",
title: "FFT, windows and leakage",
mins: 25,
body: `
<p>The DFT projects N samples onto N complex sinusoids spaced fs/N apart; the FFT is
just a fast algorithm for it, O(N log N) instead of O(N^2), by recursively splitting
the transform into halves. FFT of a million points: about 20 million operations
instead of a trillion. That factor is why real-time spectral processing exists.</p>
<h3>What the bins actually are</h3>
<ul>
<li>Bin spacing (resolution): fs / N. Want finer frequency detail? Record longer.</li>
<li>Bin k corresponds to k * fs / N Hz, up to Nyquist at k = N/2.</li>
<li>A real input of N samples yields N/2 independent complex bins: magnitude and
phase per frequency.</li>
</ul>
<h3>Leakage, and why windows exist</h3>
<p>The DFT silently assumes the N samples repeat forever. If a sinusoid does not
complete a whole number of cycles in the record, the wrap-around is a discontinuity,
and its energy smears across all bins: spectral leakage. A window (Hann, Hamming,
Blackman) tapers the record ends to zero so the wrap is smooth. The price is a wider
main lobe: you trade frequency sharpness for amplitude honesty and low sidelobes.</p>
<ul>
<li><b>Rectangular</b> (no window): narrowest lobe, terrible sidelobes (-13 dB). Fine
only if the tone is exactly bin-centred or you window in other ways.</li>
<li><b>Hann</b>: the sensible default. Sidelobes about -31 dB.</li>
<li><b>Blackman(-Harris)</b>: very low sidelobes when a weak tone hides near a strong
one; widest lobe.</li>
</ul>
<h3>Zero padding, demystified</h3>
<p>Appending zeros before the FFT interpolates the spectrum onto a finer grid. It looks
smoother, and it helps locate a peak between bins, but it adds no new information and
does not improve true resolution; only more actual signal does.</p>
<h3>In your pipeline</h3>
<p>Band-limited spectral metrics on ultrasound echoes are exactly this machinery: pick
a window, take the FFT of a gated echo, and integrate energy in bands. Being able to
say why the gate length sets your frequency resolution is interview gold.</p>`,
quiz: [
{ q: "FFT complexity for N points:",
o: ["O(N)", "O(N log N)", "O(N^2)", "O(log N)"],
a: 1, why: "The divide-and-conquer structure does log N stages of N operations." },
{ q: "Frequency resolution of an FFT is set by:",
o: ["ADC bit depth", "Record length in seconds", "Window choice only", "Zero padding amount"],
a: 1, why: "Bin spacing is fs/N = 1/T. Longer observation, finer resolution. Zero padding only interpolates." },
{ q: "Leakage occurs because:",
o: ["ADCs are nonlinear", "The DFT assumes the record repeats, and non-integer cycles create a wrap discontinuity", "Windows distort the signal", "Floating point rounds"],
a: 1, why: "Energy from the discontinuity spreads into all bins; windowing tapers it away." },
{ q: "Zero padding an FFT:",
o: ["Improves true resolution", "Adds information", "Interpolates the existing spectrum onto a finer grid", "Removes leakage"],
a: 2, why: "It is spectral interpolation: prettier peaks, no new information." }
],
interview: {
q: "You gate a 10 microsecond echo and FFT it. The customer asks why your spectral peaks are so broad. Explain.",
a: "A 10 microsecond record has an intrinsic resolution of 1/T = 100 kHz; nothing narrower can exist in that spectrum regardless of FFT size, and the window we apply to control leakage widens the main lobe further, roughly 2x for Hann. So the broad peaks are physics of observation length, not a processing fault. If they need finer frequency detail the honest options are a longer gate, if the echo physically lasts longer, or parametric estimation that assumes a model instead of the plain FFT. Zero padding would only make the same broad peak look smoother."
}
},

{
id: "filters",
track: "DSP",
sub: "Filters",
title: "FIR vs IIR, and causal filtering",
mins: 25,
body: `
<p>A digital filter is a weighted combination of samples. The two families differ in
what they combine:</p>
<ul>
<li><b>FIR</b> (finite impulse response): output = weighted sum of the last N inputs
only. Always stable. Can have exactly linear phase (pure delay, no waveform
distortion), which matters when pulse shape carries information, as in time-of-flight
work. Cost: needs many taps for sharp cutoffs, so more compute and more delay.</li>
<li><b>IIR</b> (infinite impulse response): output also feeds back previous outputs.
Sharp filters from a handful of coefficients, cheap enough for microcontrollers.
Cost: nonlinear phase (different frequencies delayed differently) and stability must
be designed for, since poles can leave the unit circle, especially in fixed point.</li>
</ul>
<h3>The classic IIR prototypes</h3>
<ul>
<li><b>Butterworth</b>: maximally flat passband, gentle rolloff. The default when you
want no ripple. (Your thesis band-pass is a Butterworth.)</li>
<li><b>Chebyshev</b>: sharper rolloff, bought with passband (type I) or stopband
(type II) ripple.</li>
<li><b>Elliptic</b>: sharpest of all, ripple in both bands.</li>
<li><b>Bessel</b>: maximally flat group delay, the IIR that tries hardest to preserve
pulse shape.</li>
</ul>
<h3>Causal vs zero-phase, an honest distinction</h3>
<p>filtfilt runs the filter forward then backward: zero phase distortion, beautiful
for offline analysis, but non-causal, so impossible in real time and subtly wrong to
compare against hardware behaviour. A live instrument filters causally, with real
group delay. If your analysis pipeline must mirror the instrument, filter causally in
analysis too; this exact reasoning is why a transmit-chain model uses sosfilt rather
than filtfilt.</p>
<h3>Numerical hygiene</h3>
<p>Implement IIR filters as cascaded second-order sections (SOS), not one big
polynomial: high-order transfer functions in direct form are numerically fragile.
Every serious toolchain (scipy sosfilt, CMSIS-DSP biquads) does this.</p>`,
quiz: [
{ q: "Which is guaranteed stable regardless of coefficients?",
o: ["IIR", "FIR", "Both", "Neither"],
a: 1, why: "FIR has no feedback, so no poles to escape the unit circle." },
{ q: "Linear phase matters for time-of-flight measurement because:",
o: ["It reduces noise", "All frequencies are delayed equally, so the pulse shape and its timing are preserved", "It sharpens cutoff", "It saves power"],
a: 1, why: "Nonlinear phase smears the wavefront; a linear-phase FIR delays the whole pulse by a known constant you can subtract." },
{ q: "Butterworth's defining property:",
o: ["Sharpest rolloff", "Ripple-free, maximally flat passband", "Zero group delay", "Cheapest to compute"],
a: 1, why: "It trades rolloff steepness for a completely flat passband." },
{ q: "Why implement a high-order IIR as second-order sections?",
o: ["Easier to read", "Numerical robustness: direct-form high-order polynomials are extremely sensitive to coefficient error", "Linear phase", "Runs on GPU"],
a: 1, why: "Root locations of high-order polynomials move wildly with tiny coefficient perturbations; biquad cascades keep each pair tame." }
],
interview: {
q: "Your offline analysis uses filtfilt but the deployed instrument filters in real time. A validation engineer says results differ. Explain and fix.",
a: "filtfilt is zero-phase and non-causal: it uses future samples, so features do not shift in time and the effective filtering is applied twice, squaring the magnitude response. The live system filters causally once, with real group delay, so timings shift and edges differ. That is not a bug in either half; it is a modelling mismatch. The fix is to make analysis mirror the hardware: same filter, same causal application, ideally the same second-order-section implementation, and account for group delay explicitly where timing is extracted. I have made precisely this change in an acquisition-modelling pipeline, switching filtfilt to causal sosfilt so training and deployment saw the same waveforms."
}
},

// ---------------------------------------------------------------- Acoustics
{
id: "impedance",
track: "Acoustics",
sub: "Waves and propagation",
title: "Impedance, reflection and attenuation",
mins: 25,
body: `
<p>Acoustic impedance Z = rho * c (density times sound speed) is the ratio of pressure
to particle velocity in a travelling wave. It plays the same role as electrical
impedance: mismatches reflect energy.</p>
<h3>Normal-incidence reflection, the equation to know cold</h3>
<pre>R = (Z2 - Z1) / (Z2 + Z1)      (pressure reflection coefficient)
Energy reflected = R^2</pre>
<ul>
<li>Water to steel: Z of about 1.5 vs 45 MRayl gives R around 0.94: almost everything
reflects. This is why pulse-echo works so well on metal in water.</li>
<li>Transducer (about 30 MRayl) to air (0.0004 MRayl): R of essentially -1. Nothing
crosses. This single number explains coupling gel, water tanks, and why airborne
ultrasound needs clever matching or high power.</li>
<li>Ice (about 3.5 MRayl) to water (1.5): R around 0.4, so both echo and transmission
are usable, which is convenient for imaging ice in a water bath.</li>
</ul>
<h3>Matching layers</h3>
<p>A quarter-wavelength layer of intermediate impedance (ideally sqrt(Z1*Z2)) acts like
an impedance transformer, exactly analogous to a quarter-wave line in RF. Transducer
front faces are built from them; it is also the trick that makes air-coupled
transducers possible at all.</p>
<h3>Attenuation</h3>
<p>Amplitude decays as exp(-alpha x), with alpha rising with frequency, roughly f^2 in
water from viscous absorption, and much faster in scattering media where grain
scattering adds a strong frequency dependence. The engineering consequence: frequency
choice is a trade between resolution (higher f, shorter wavelength) and penetration
(lower f survives). Choosing 1 to 5 MHz for decimetre-scale ice cores rather than
50 MHz is this trade-off, plus grain scattering, in action.</p>
<h3>dB fluency (say these without thinking)</h3>
<ul>
<li>-6 dB: half amplitude. -20 dB: one tenth amplitude. -3 dB: half power.</li>
<li>Two-way loss doubles the dB: a 30 dB one-way path is 60 dB pulse-echo.</li>
</ul>`,
quiz: [
{ q: "Pressure reflection coefficient at normal incidence:",
o: ["(Z2+Z1)/(Z2-Z1)", "(Z2-Z1)/(Z2+Z1)", "Z2/Z1", "sqrt(Z1 Z2)"],
a: 1, why: "R = (Z2 - Z1)/(Z2 + Z1); its square is the energy fraction reflected." },
{ q: "Why does ultrasound barely cross a solid-to-air boundary?",
o: ["Air absorbs it", "The impedance mismatch is enormous, so |R| approaches 1", "Air is too cold", "Wavelength too long"],
a: 1, why: "Z_air is about 5 orders below solids; almost all energy reflects. Hence gel and immersion tanks." },
{ q: "Ideal single matching layer between Z1 and Z2 is:",
o: ["Any thin glue", "Quarter wavelength thick with Z = sqrt(Z1 Z2)", "Half wavelength of Z1", "As thick as possible"],
a: 1, why: "The quarter-wave transformer, identical to its RF counterpart." },
{ q: "-6 dB corresponds to:",
o: ["Half power", "Half amplitude", "One tenth amplitude", "No change"],
a: 1, why: "20 log10(0.5) is about -6 dB. Half power is -3 dB." }
],
interview: {
q: "Why do higher-frequency transducers give better resolution but worse penetration?",
a: "Resolution scales with wavelength: lambda = c/f, so higher frequency means shorter pulses and finer axial resolution, and tighter focusing for lateral resolution. But attenuation grows with frequency, roughly f squared in absorbing media, and grain or particle scattering grows even faster once the wavelength approaches scatterer size. So each doubling of frequency sharpens the image but strips dB from the returned echo, until you run out of dynamic range. Every application picks its point on that curve: 50 MHz for microscopy over millimetres, single MHz for decimetres of coarse-grained material, where scattering, not absorption, is the enemy."
}
},

{
id: "arrays",
track: "Acoustics",
sub: "Transducers and beams",
title: "Phased arrays and acoustic levitation",
mins: 30,
body: `
<p>An array of small transducers, each driven with a chosen delay or phase, synthesises
a wavefront by interference. Everything the array does, steering, focusing,
levitating, is choosing those phases.</p>
<h3>Derive the steering law (do this on paper once)</h3>
<p>To steer a plane wave to angle theta, adjacent elements at pitch d must fire with
time offset dt = d sin(theta) / c, so element n leads by n*dt. To focus at a point,
compute each element's distance r_n to the focus and delay so all arrivals coincide:
delays = (r_max - r_n) / c. Steering and focusing are the same idea: equalise arrival
times along the chosen direction or at the chosen point.</p>
<h3>Grating lobes, the array's aliasing</h3>
<p>If element pitch d exceeds half a wavelength, the array response repeats at other
angles: spatial aliasing, identical in mathematics to sampling too slowly in time.
Rule: d of lambda/2 or less steers cleanly everywhere; coarser pitch restricts safe
steering range. At 40 kHz in air, lambda is 8.6 mm, which is why levitation arrays of
10 mm elements just about work.</p>
<h3>From imaging to manipulation: radiation force</h3>
<p>Sound carries momentum. A standing wave, made by opposing arrays or an array plus a
reflector, has fixed pressure nodes every half wavelength. A particle small compared
to the wavelength feels a time-averaged force described by the Gor'kov potential:
dense, incompressible particles (droplets, beads) are pushed to pressure nodes;
bubbles go to antinodes. Force scales with particle volume and acoustic intensity.</p>
<p>Move the trap by shifting the phase pattern: advance all phases and the node lattice
translates; more elaborate holograms (twin traps, vortex traps) hold particles in
mid-air from a single side. This is acoustic levitation: the trap positions are a
phase computation, updated fast enough to move matter smoothly.</p>
<h3>The crossover sentence (yours to own)</h3>
<p>Imaging solves the inverse problem: measure fields to infer the medium. Levitation
runs the forward problem: choose fields to place energy where you want it. Same
transducers, same wave physics, same array mathematics; one runs backwards, the
other forwards.</p>`,
quiz: [
{ q: "Delay between adjacent elements (pitch d) to steer to angle theta:",
o: ["d cos(theta)/c", "d sin(theta)/c", "c sin(theta)/d", "d/(c theta)"],
a: 1, why: "The projected path difference along the steered direction is d sin(theta); dividing by c gives the time offset." },
{ q: "Grating lobes appear when:",
o: ["Elements are too small", "Element pitch exceeds half a wavelength", "The array is curved", "Drive voltage is too high"],
a: 1, why: "Spatial undersampling, exactly analogous to temporal aliasing beyond Nyquist." },
{ q: "In a standing wave, a dense solid bead is pushed toward:",
o: ["Pressure antinodes", "Pressure nodes", "The transducer face", "Nowhere: forces cancel"],
a: 1, why: "Gor'kov: particles denser and stiffer than the medium collect at pressure nodes; bubbles do the opposite." },
{ q: "To translate a levitated particle horizontally you:",
o: ["Increase amplitude", "Shift the relative phases so the node pattern moves", "Heat the air", "Lower the frequency"],
a: 1, why: "The trap sits in the interference pattern; moving the pattern is a pure phase computation." }
],
interview: {
q: "You have imaged with ultrasound but never levitated anything. Why should an acoustic manipulation company hire you?",
a: "Because the physics and the mathematics are the same machinery run in opposite directions. My PhD solved the inverse problem: measure propagated fields and reconstruct the medium, which required wave propagation modelling, transducer physics, and phase-accurate timing across many element positions. Levitation is the forward problem: pick phases to synthesise a desired field, evaluated by the same models I already build. I have written the propagation solvers, the delay laws, and the hardware that drives and captures transducers with microsecond discipline. The new layer for me is trap dynamics, Gor'kov potentials and control loops around them, and I have the control background to close that loop. The rare part of the hire is wave physics plus instruments that actually work; that is exactly my record."
}
},

// ---------------------------------------------------------------- Control
{
id: "pid",
track: "Control",
sub: "Classical control",
title: "PID by intuition",
mins: 25,
body: `
<p>PID computes the control output from the error e = setpoint - measurement:</p>
<pre>u = Kp*e + Ki*integral(e dt) + Kd*de/dt</pre>
<ul>
<li><b>P</b> is a spring: push proportional to how far off you are. P alone often
leaves steady-state error (a P-only cruise control settles below the target on a
hill, since holding output requires nonzero error).</li>
<li><b>I</b> accumulates history and removes that offset: any persistent error winds
the integral up until the actuator cancels it. Too much I causes slow oscillation.</li>
<li><b>D</b> is a damper: react to how fast the error is changing, braking before
overshoot. It amplifies measurement noise, so real systems filter it (derivative on
measurement, low-pass filtered).</li>
</ul>
<h3>Integrator windup, the practical exam question</h3>
<p>Actuators saturate. If the heater is already at 100% and the integral keeps
accumulating, then when the setpoint is finally reached the wound-up integral keeps
driving output, causing massive overshoot. Fixes: clamp the integral, or stop
integrating while saturated (conditional integration), or back-calculate. Every
production PID has anti-windup; textbooks often forget it.</p>
<h3>Tuning by feel (works in interviews and in labs)</h3>
<ol>
<li>Ki = Kd = 0. Raise Kp until response is brisk with slight overshoot.</li>
<li>Add Ki to remove steady-state error; back off if slow oscillation appears.</li>
<li>Add a little Kd to tame overshoot if the measurement is clean enough.</li>
</ol>
<h3>Discrete implementation notes</h3>
<pre>integral += e * dt;                       // clamp me (anti-windup)
float deriv = (meas_prev - meas) / dt;    // derivative on measurement,
meas_prev = meas;                         // avoids setpoint-change kicks
u = Kp*e + Ki*integral + Kd*deriv;</pre>
<p>Derivative on measurement (not error) avoids the derivative kick when the setpoint
steps. Sample at 5 to 10 times the closed-loop bandwidth or faster.</p>`,
quiz: [
{ q: "Which term removes steady-state error?",
o: ["P", "I", "D", "None"],
a: 1, why: "The integral accumulates until the persistent error is cancelled; P alone needs nonzero error to hold output." },
{ q: "Integrator windup happens when:",
o: ["dt is too small", "The integral accumulates while the actuator is saturated", "Kd is zero", "The setpoint is negative"],
a: 1, why: "Saturation breaks the loop; the integral grows meaninglessly and must be discharged later, causing overshoot." },
{ q: "Derivative-on-measurement is preferred because:",
o: ["It is cheaper", "It avoids a large kick when the setpoint steps", "It removes noise", "It doubles bandwidth"],
a: 1, why: "A setpoint step makes de/dt momentarily infinite; the measurement changes smoothly." },
{ q: "First step of manual tuning:",
o: ["Max out Ki", "P-only: raise Kp until brisk with slight overshoot", "Set Kd high", "Random search"],
a: 1, why: "Establish proportional response first; add I for offset, D for damping." }
],
interview: {
q: "Your temperature loop overshoots badly after a large setpoint change, then settles fine. Diagnose.",
a: "Classic integrator windup. During the long climb the actuator sits saturated at 100%, but the integral keeps accumulating a huge term; when temperature reaches the setpoint the integral is still demanding full power, so it sails through and overshoots until the accumulated integral discharges. The response to small setpoint changes being fine is the fingerprint, since the actuator never saturates there. Fix: anti-windup, either clamping the integral, pausing integration while saturated, or back-calculation; optionally add setpoint ramping so the loop never sees a giant step."
}
},

{
id: "kalman",
track: "Control",
sub: "Estimation",
title: "Kalman filters without tears",
mins: 30,
body: `
<p>A Kalman filter is recursive least squares for a moving target: it maintains a state
estimate and an uncertainty (covariance), and at each tick blends prediction with
measurement, weighting each by trust.</p>
<h3>The loop (two steps forever)</h3>
<ol>
<li><b>Predict</b>: push the state through the motion model (x = F x + B u), and grow
the covariance (P = F P F' + Q) because motion models are imperfect: Q says how
much.</li>
<li><b>Update</b>: compare the measurement z with what the state predicts (innovation
y = z - H x), compute the Kalman gain K from the ratio of state uncertainty P to
measurement noise R, and correct: x += K y, P shrinks.</li>
</ol>
<p>The gain is the whole story: K large means trust the sensor (R small or P large);
K small means trust the model. Tuning a Kalman filter is confessing honest values of
Q and R.</p>
<h3>EKF in one sentence</h3>
<p>When motion or measurement models are nonlinear (they always are in robotics),
linearise them about the current estimate with Jacobians and run the same loop: that
is the Extended Kalman Filter.</p>
<h3>Worked example you can narrate: a 3-DOF robot EKF</h3>
<ul>
<li>State: x, y, yaw.</li>
<li>Predict from commanded body velocities integrated over dt; Q reflects how
chaotic the drive really is (deliberately large for a slippy or vibrating drive).</li>
<li>IMU yaw rate updates heading (small R: gyros are locally excellent).</li>
<li>Optical flow updates ground-relative velocity (moderate R, fails on some
surfaces, so gate it).</li>
<li>Fiducial (AprilTag) fixes absolute pose when visible (tiny R but rare: this is
what cancels drift).</li>
</ul>
<p>Each sensor has its own H and R and simply arrives when it arrives; asynchronous
fusion is the filter's superpower.</p>
<h3>Health checks that impress interviewers</h3>
<ul>
<li>Innovation should look like white noise sized by its predicted covariance; if it
is consistently biased, a model or calibration is wrong.</li>
<li>P collapsing to zero means overconfidence (Q too small): the filter starts
ignoring sensors.</li>
<li>Filter divergence usually traces to lies about Q and R, not to the algebra.</li>
</ul>`,
quiz: [
{ q: "The Kalman gain K is large when:",
o: ["Measurement noise R is large", "State uncertainty P is large relative to R", "Q is zero", "dt is small"],
a: 1, why: "K weighs prediction vs measurement by their uncertainties: uncertain state plus trusted sensor means big corrections." },
{ q: "Process noise Q represents:",
o: ["ADC quantisation", "Imperfection of the motion model between updates", "Sensor bias", "Numerical rounding"],
a: 1, why: "Q inflates covariance during prediction, admitting the model does not capture everything (slip, vibration, gusts)." },
{ q: "The EKF differs from the linear KF by:",
o: ["Running twice per tick", "Linearising nonlinear models with Jacobians at the current estimate", "Using particles", "Requiring no covariance"],
a: 1, why: "Same predict/update structure; F and H become Jacobians of the nonlinear functions." },
{ q: "A healthy filter's innovation sequence looks like:",
o: ["A constant offset", "Zero exactly", "White noise consistent with its predicted covariance", "A ramp"],
a: 2, why: "Persistent bias in innovations flags a wrong model, wrong calibration, or wrong noise settings." }
],
interview: {
q: "Why fuse optical flow, IMU and an occasional fiducial marker instead of picking the best sensor?",
a: "Because they fail differently and drift differently. The IMU gyro is superb over short intervals but integrates into drift; optical flow gives ground-relative velocity but degrades on low-texture surfaces and also drifts once integrated to position; a fiducial gives absolute pose with no drift, but only when in view. The EKF is the principled way to combine them: each sensor has its own noise model and update equation, corrections arrive asynchronously, and the covariance tracks how sure we are between absolute fixes. The result is smooth short-term motion from the IMU and flow, with the fiducial snapping accumulated drift to zero whenever it appears; no single sensor can deliver that."
}
},

// ------------------------------------------------- Electronics and Embedded
{
id: "frontend",
track: "Electronics",
sub: "Analogue front ends",
title: "Sensor front ends: op-amps to ADC",
mins: 30,
body: `
<p>The interview task 'here is a sensor, get its signal into an ADC' decomposes into
four questions: what impedance does the sensor present, how much gain is needed, what
bandwidth must survive, and what must be filtered before sampling.</p>
<h3>The three op-amp blocks that cover most sensors</h3>
<ul>
<li><b>Non-inverting amp</b>: gain 1 + Rf/Rg, very high input impedance. Default
voltage-output sensors.</li>
<li><b>Inverting amp</b>: gain -Rf/Rin, input impedance = Rin, convenient summing
node.</li>
<li><b>Transimpedance amp (TIA)</b>: current in, voltage out, V = -I * Rf. The block
for photodiodes and other current-source sensors; needs a small feedback capacitor
for stability against the diode capacitance.</li>
</ul>
<h3>A piezo receiver, since ultrasound is home turf</h3>
<p>A piezo element is a charge source with a small capacitance (high impedance at low
frequency). Two civilised choices: a <b>charge amplifier</b> (op-amp integrator with
Cf; gain V/Q = 1/Cf, insensitive to cable capacitance) or a high-input-impedance
voltage amp close to the element. Then band-pass around the transducer centre
frequency to kill both low-frequency microphonics and out-of-band noise, add
programmable gain to use the ADC's full scale across weak and strong echoes, and an
anti-alias filter matched to fs.</p>
<h3>ADC choices, said like an engineer</h3>
<ul>
<li><b>Resolution</b>: each bit is 6 dB of dynamic range; pick from required SNR plus
headroom, not vanity. 12 bits is 74 dB ideal.</li>
<li><b>Architecture</b>: SAR for MHz-rate general work and multiplexed channels;
sigma-delta for slow precise channels (load cells, temperature); pipeline/flash for
tens of MS/s and up (ultrasound capture).</li>
<li><b>Anti-alias filter</b>: corner and order chosen so anything above fs/2 is below
the ADC noise floor.</li>
<li><b>Drive</b>: SAR inputs need a low source impedance and often a dedicated driver
plus a flying capacitor; a slow op-amp straight into a fast SAR gives distortion.</li>
</ul>
<h3>Grounding and decoupling, minimum viable wisdom</h3>
<p>100 nF ceramic at every supply pin plus bulk per rail; keep switching currents out
of the analogue return path; a star or split ground joined at the ADC is the usual
compromise; and route the piezo input differentially or guarded, because at MHz and
microvolts, layout is part of the circuit.</p>`,
quiz: [
{ q: "Best first-stage for a photodiode:",
o: ["Non-inverting amp", "Transimpedance amp", "Instrumentation amp", "Comparator"],
a: 1, why: "A photodiode is a current source; a TIA converts current to voltage with a virtual-earth input." },
{ q: "A charge amplifier's gain for a piezo sensor is set by:",
o: ["The op-amp's GBW", "The feedback capacitor (V = Q/Cf)", "Supply voltage", "Cable length"],
a: 1, why: "Charge integrates onto Cf; crucially this makes the response insensitive to cable capacitance." },
{ q: "Each additional ADC bit buys roughly:",
o: ["3 dB", "6 dB", "10 dB", "20 dB"],
a: 1, why: "SNR of an ideal N-bit converter is 6.02N + 1.76 dB." },
{ q: "For a precise 10 Hz load-cell channel, the natural ADC architecture is:",
o: ["Flash", "Pipeline", "SAR at 50 MS/s", "Sigma-delta"],
a: 3, why: "Sigma-delta trades speed for resolution and noise shaping: 24 bits at low rates." }
],
interview: {
q: "Design, at block level, the receive chain from a 2.5 MHz piezo transducer to digital samples.",
a: "Transducer into a protection network first, since the same element may be pulsed at high voltage: back-to-back diodes or an expander/limiter to clamp transmit residue. Then a low-noise preamp: either a charge amp or high-impedance voltage stage, placed close to the element. Band-pass filtering around 2.5 MHz, roughly 0.5 to 2 times the centre frequency, to reject microphonics and wideband noise. A variable-gain stage next, because echo amplitudes span tens of dB with depth; time-gain compensation if imaging. Then the anti-alias low-pass matched to the converter: sampling at 25 MS/s, corner well below 12.5 MHz. Finally a pipeline or fast SAR ADC, 12 to 14 bits, with a proper driver stage. Clean analogue supply, decoupling at every pin, and the analogue return kept away from digital switching."
}
},

{
id: "embedded",
track: "Electronics",
sub: "Digital and interfacing",
title: "Embedded survival kit: interrupts, DMA, buses, RTOS",
mins: 30,
body: `
<h3>Interrupts vs polling</h3>
<p>Polling is simple and deterministic but burns CPU and adds latency up to one loop
period. Interrupts respond in microseconds and let the core sleep, at the price of
concurrency hazards. The professional pattern: ISRs do almost nothing (grab the data,
clear the flag, set an event or push to a queue) and a task does the real work.
Anything shared between ISR and main code must be atomic or protected, and in
FreeRTOS you must use the FromISR API variants inside handlers.</p>
<h3>DMA</h3>
<p>The DMA engine moves data between peripherals and memory without the CPU: you get
whole ADC blocks or UART buffers per interrupt instead of per byte. The pattern that
matters is the <b>double buffer / circular half-complete</b>: DMA fills half A while
you process half B, swapping at the half and full interrupts; miss the deadline and
data is overwritten. Cache-coherency (on M7-class parts) and alignment are the classic
gotchas.</p>
<h3>The three little buses</h3>
<ul>
<li><b>UART</b>: asynchronous, two wires, point to point, both ends must agree on baud.
Simple, error-tolerant framing needed, your Marlin link at 9600 is this.</li>
<li><b>I2C</b>: two wires shared by many devices, addressed, ~100 to 400 kHz (up to
3.4 MHz FM+). Cheap and slow; watch pull-up sizing, bus capacitance and the
stuck-bus lockup after a resetting master (fix: clock out 9 pulses).</li>
<li><b>SPI</b>: 4 wires plus a chip select per device, master-clocked to tens of MHz,
full duplex. The choice for ADCs, flash, displays; know mode 0..3 = clock
polarity/phase.</li>
</ul>
<h3>RTOS in five ideas</h3>
<ol>
<li>Preemptive priority scheduling: the highest-priority ready task runs, always.</li>
<li>Blocking is free: a task waiting on a queue or semaphore costs zero CPU.</li>
<li>Queues pass data safely between tasks and from ISRs.</li>
<li>Mutexes protect shared state and provide priority inheritance; binary semaphores
signal events but do NOT inherit priority.</li>
<li>Starvation and jitter come from priority design, not from the kernel: keep ISRs
short, keep high-priority tasks brief, never busy-wait.</li>
</ol>
<h3>Watchdogs and defensive habits</h3>
<p>A hardware watchdog reset is the last line; feed it from one place that only runs
when the system is genuinely healthy (all tasks checked in), never from a timer ISR
that keeps ticking while everything else is dead.</p>`,
quiz: [
{ q: "Correct ISR discipline is:",
o: ["Do all processing in the ISR for speed", "Grab data, signal a task, exit; process in task context", "Take a mutex in the ISR", "Call printf to log"],
a: 1, why: "Long ISRs wreck latency for everything else; mutexes and blocking calls are forbidden in handlers (use FromISR variants of queue/semaphore gives)." },
{ q: "Circular DMA with half/full interrupts exists so that:",
o: ["Data rate doubles", "You process one half while the other fills, with a hard deadline of half a buffer", "The CPU can sleep forever", "Alignment is unnecessary"],
a: 1, why: "It converts a continuous stream into fixed processing windows; miss the window and samples are overwritten." },
{ q: "Which bus is full duplex with a clock line and per-device selects?",
o: ["UART", "I2C", "SPI", "1-Wire"],
a: 2, why: "SPI: MOSI/MISO/SCK plus CS per slave, master-clocked to tens of MHz." },
{ q: "In FreeRTOS, priority inheritance is provided by:",
o: ["Binary semaphores", "Mutexes", "Queues", "Event groups"],
a: 1, why: "Guarding shared state with a binary semaphore invites priority inversion; mutexes boost the holder's priority." }
],
interview: {
q: "Your 1 MS/s ADC stream occasionally loses chunks of samples. The ISR-per-sample design 'worked on the bench'. What is wrong and what do you do?",
a: "An interrupt per sample at 1 MHz means an ISR every microsecond; entry/exit overhead alone saturates a mid-range MCU, and any longer-running ISR (a UART, a tick) causes overruns, which is why it fails intermittently rather than always. The fix is DMA: peripheral-to-memory in circular mode, interrupts only at half and full buffer, so the CPU handles thousands of samples per event with a comfortable deadline. Then I would size the buffer from worst-case task latency, check the overrun flag in hardware and count it, and make sure the processing task's priority and any cache maintenance are right. Losing data silently is the real crime, so the overrun counter goes on telemetry."
}
},

// ------------------------------------------------------------ CS and Maths
{
id: "structures",
track: "CS & Maths",
sub: "Data structures and algorithms",
title: "Ring buffers, FSMs and Big-O that matters",
mins: 30,
body: `
<h3>The ring buffer (write this from memory until boring)</h3>
<p>A fixed array plus head and tail indices, wrapping with modulo or a power-of-two
mask. It is THE embedded structure: bounded memory, O(1) push and pop, and with one
producer and one consumer it can be lock-free using two atomic indices (each side
writes only its own index).</p>
<pre>typedef struct { uint8_t buf[N]; volatile uint32_t head, tail; } ring_t;
// empty: head == tail        full: (head+1) % N == tail (sacrifice one slot)
bool put(ring_t* r, uint8_t b){
    uint32_t next = (r-&gt;head + 1) % N;
    if (next == r-&gt;tail) return false;      // full
    r-&gt;buf[r-&gt;head] = b;  r-&gt;head = next;  return true;
}
bool get(ring_t* r, uint8_t* b){
    if (r-&gt;head == r-&gt;tail) return false;   // empty
    *b = r-&gt;buf[r-&gt;tail];  r-&gt;tail = (r-&gt;tail + 1) % N;  return true;
}</pre>
<p>Interview follow-ups to be ready for: why sacrifice a slot (to distinguish full from
empty without a count), what changes with multiple producers (you need atomics or a
lock), and why write the data before advancing the index (ordering: the consumer must
never see an index that points at unwritten data).</p>
<h3>State machines</h3>
<p>Any protocol parser, motion sequence or UI is cleanest as an explicit FSM: an enum
of states, a struct of context, and one transition function switch(state) handling
each event. The wins are exhaustiveness (the compiler warns on unhandled states),
testability (feed events, assert states), and the absence of boolean-flag spaghetti.
If you find three interacting bool flags, you have an implicit FSM with 8 unnamed
states; name them.</p>
<h3>Big-O, the working subset</h3>
<ul>
<li>O(1) indexed access, hash lookup. O(log n) binary search, balanced trees.
O(n) scan. O(n log n) good sorts and the FFT. O(n^2) the nested loop you wrote by
accident over samples x channels.</li>
<li>Constants matter at real sizes: a linear scan of 50 elements beats a hash lookup;
contiguous O(n) often beats pointer-chasing O(log n).</li>
<li>Say the memory cost too: interviewers reward 'O(n log n) time, O(1) extra space
if I sort in place'.</li>
</ul>`,
quiz: [
{ q: "In the one-slot-sacrifice ring buffer, full is detected by:",
o: ["head == tail", "(head+1) mod N == tail", "a separate count variable", "tail == 0"],
a: 1, why: "head == tail means empty; advancing head into tail would be ambiguous, so that state is declared full." },
{ q: "A single-producer single-consumer ring buffer can be lock-free because:",
o: ["Interrupts are disabled", "Each side writes only its own index, and data is written before the index advances", "Modulo is atomic", "It cannot be"],
a: 1, why: "Ownership split plus write-then-publish ordering means each side sees a consistent view without locks." },
{ q: "Three interacting boolean flags controlling behaviour are best replaced by:",
o: ["More comments", "An explicit enum state machine", "A bitfield", "Nested ifs"],
a: 1, why: "The flags encode up to 8 anonymous states; naming them exposes illegal combinations and makes transitions testable." },
{ q: "Sorting a million floats then binary-searching 100 times costs about:",
o: ["O(n) total", "O(n log n) + 100 log n", "O(n^2)", "O(100 n log n)"],
a: 1, why: "One sort dominates; each subsequent search is log n. Amortise setup across queries." }
],
interview: {
q: "Implement a byte queue between a UART ISR and a task. What do you use and why?",
a: "A single-producer single-consumer ring buffer: fixed array, head written only by the ISR, tail only by the task. Power-of-two size so wrap is a mask. The ISR writes the byte first, then publishes by advancing head, so the task can never read an unwritten slot; on a single-core MCU with aligned 32-bit indices those writes are atomic, so no locking and no disabled interrupts. Full means data is arriving faster than it is consumed, so I return false, count the overrun, and surface that counter, never silently spin in an ISR. In FreeRTOS I might use a StreamBuffer, which is precisely this structure with wake-up built in; I would still size it from worst-case task latency times byte rate."
}
},

{
id: "leastsq",
track: "CS & Maths",
sub: "Numerical methods",
title: "Least squares, conditioning and optimisation",
mins: 30,
body: `
<h3>Least squares in three sentences</h3>
<p>To fit model parameters p to measurements y, minimise the sum of squared residuals
||y - f(p)||^2. If f is linear in p (f = A p), the minimum satisfies the normal
equations A'A p = A'y, solved in one step. Least squares is optimal when noise is
Gaussian, and its geometry, projecting y onto the space the model can reach, is worth
being able to sketch.</p>
<h3>Conditioning: when good fits go bad</h3>
<p>The condition number of A measures how much measurement noise is amplified into
parameter error. Nearly-parallel columns (nearly redundant parameters) make it huge:
the fit fights over two parameters that do nearly the same thing. Symptoms: wild
parameter swings between datasets that fit equally well. Cures: remove or combine
redundant parameters, scale columns to similar magnitudes, add regularisation (a
penalty lambda*||p||^2 that trades a little bias for a lot of variance), or solve via
QR or SVD rather than forming A'A, which squares the condition number.</p>
<h3>Choosing lambda honestly</h3>
<p>Sweep it: plot misfit against solution roughness across a decade or three and pick
the corner of the L-curve, where the misfit stops improving but the solution is not
yet oscillating between its bounds. If misfit is pinned high at every lambda, the
problem is the data or the model, not the regulariser; no amount of smoothing rescues
a data-limited slice.</p>
<h3>Nonlinear fitting: the three-step ladder</h3>
<ul>
<li><b>Gradient descent</b>: follow -grad. Robust, cheap per step, slow near the
minimum. Needs a step size.</li>
<li><b>Gauss-Newton</b>: exploit least-squares structure, approximating the Hessian by
J'J. Quadratic-ish convergence near the answer; can overshoot far from it.</li>
<li><b>Levenberg-Marquardt</b>: blend of both via damping lambda: (J'J + lambda I) dp
= -J'r. Large lambda behaves like gradient descent (safe), small lambda like
Gauss-Newton (fast). Adapt lambda on success or failure of each step. This is the
workhorse of instrument calibration and parameter extraction.</li>
</ul>
<h3>Two habits that mark a professional</h3>
<ul>
<li><b>Gradient checking</b>: verify every analytic gradient against finite
differences at a random point before trusting an optimiser.</li>
<li><b>Floating point respect</b>: subtracting nearly equal numbers destroys digits
(catastrophic cancellation); FP32 keeps about 7 significant digits, so accumulate
long sums in FP64 or compensated form, and expect an FP32 pipeline validated at
1e-6 relative error to be healthy, not broken.</li>
</ul>`,
quiz: [
{ q: "The normal equations for linear least squares are:",
o: ["A p = y", "A'A p = A'y", "p = A y", "A A' y = p"],
a: 1, why: "Setting the gradient of ||y - Ap||^2 to zero yields A'A p = A'y; in practice solve by QR or SVD for conditioning." },
{ q: "A huge condition number of A means:",
o: ["The fit will not converge", "Small data noise causes large parameter errors", "The model is nonlinear", "The residual is zero"],
a: 1, why: "Ill-conditioning amplifies noise into the parameters, often from nearly redundant columns." },
{ q: "In Levenberg-Marquardt, increasing the damping lambda makes the step:",
o: ["Larger and Newton-like", "Smaller and gradient-descent-like", "Random", "Exactly zero"],
a: 1, why: "(J'J + lambda I) with large lambda is dominated by the identity: short, safe, downhill steps." },
{ q: "Before trusting an analytic gradient you should:",
o: ["Plot it", "Compare it with finite differences at test points", "Normalise it", "Assume the maths is right"],
a: 1, why: "Gradient checking catches sign errors, missing terms and indexing bugs in minutes; every serious optimisation codebase does it." }
],
interview: {
q: "Your parameter fit returns wildly different values on two nearly identical datasets, though both fit the data well. What is happening and what do you do?",
a: "That is the signature of an ill-conditioned problem: two or more parameters are nearly redundant, so many parameter combinations produce almost the same predictions, and noise picks the winner. I would confirm by checking the condition number or the SVD of the Jacobian: tiny singular values flag the flat directions, and their vectors name the guilty parameter combinations. Cures in order of honesty: reparameterise or fix the redundant direction, add physically motivated regularisation and choose its weight by an L-curve sweep, and report the uncertainty along flat directions rather than pretending a point estimate. I have run exactly this analysis on tomographic reconstructions, where smoothing strength was chosen at the L-curve knee and one boundary slice proved data-limited: no lambda could rescue it, which is itself the correct answer."
}
}
];

// Extra rapid-fire interview questions for the daily rotation (no lesson attached).
const EXTRA_QUESTIONS = [
{ q: "Explain aliasing to someone with no engineering background.",
a: "Use the wagon-wheel effect: a camera filming a spinning wheel at 24 frames a second can make it appear to spin slowly backwards, because the wheel turns more than half a revolution between frames. Sampling voltage too slowly does the same: a fast signal masquerades as a slow one, and once recorded you cannot tell them apart. That is why we filter out too-fast signals before sampling." },
{ q: "What happens, in order, from reset to your main() running on a microcontroller?",
a: "Hardware latches the reset vector from the vector table and loads the stack pointer, then jumps to the reset handler. Startup code copies initialised data from flash to RAM, zeroes the BSS section, optionally configures clocks and the FPU, calls static constructors if C++, then branches to main. Knowing this is how you debug a board that dies before main." },
{ q: "Why might a 100 nF capacitor be placed at every IC power pin?",
a: "It is a local charge reservoir for fast switching transients: the supply and its traces have inductance, so sudden current demand would droop the pin voltage. The small ceramic close to the pin supplies the high-frequency component; bulk capacitance elsewhere handles the slow component. Placement matters more than value." },
{ q: "Interviewer hands you a mystery instrument that gives noisy repeated measurements of a constant quantity. How do you report its value and uncertainty?",
a: "Take N repeated readings; report the mean, and the uncertainty of the mean as the sample standard deviation divided by sqrt(N), assuming independent noise. Check independence by looking for drift or correlation first, since averaging correlated noise does not improve like sqrt(N). If there is drift, model or remove it before claiming a tight uncertainty." },
{ q: "Tell me about a time a measurement disagreed with your model. What did you do?",
a: "Structure: state the disagreement quantitatively; list the three hypotheses you formed (instrument, analysis, model); the discriminating test you built for each; which one it was; and what changed in your process afterwards. Prepare your own real story in this shape; never improvise it live." },
{ q: "What is priority inversion, and name a famous case.",
a: "A high-priority task blocks on a resource held by a low-priority task, which is itself preempted by medium-priority work, so the high-priority task effectively runs at low priority. The Mars Pathfinder lander suffered exactly this in 1997, fixed remotely by enabling priority inheritance on the offending mutex." },
{ q: "Why do we validate a GPU FP32 port against a CPU FP64 reference at 1e-6 rather than demanding bit-exactness?",
a: "FP32 carries about 7 significant digits, and parallel reduction orders differ between architectures, so bitwise equality is impossible and not meaningful. The correct test is a relative-error bound consistent with single precision and the algorithm's conditioning: agreement at 1e-6 relative says the port is faithful; demanding 1e-15 confuses precision with correctness." },
{ q: "How would you measure the speed of sound in a material with equipment you can carry?",
a: "Pulse-echo with a transducer and oscilloscope: measure round-trip time through a known thickness, c = 2d/t; calipers give d. Cross-check with a second thickness to cancel systematic delays (couplant, electronics) by using the time difference between back-wall echoes. State your uncertainty from timing resolution and thickness measurement." }
];
