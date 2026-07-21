// R&D Prep: CS & Maths expansion pack (lessons2_csmaths.js).
// Same schema as data.js; appended to the existing LESSONS array.

LESSONS.push(

{
id: "cm-sorting",
track: "CS & Maths",
title: "Sorting and searching in practice",
mins: 25,
body: `
<p>Interviewers rarely want you to implement quicksort from memory. They want to know
which sort you reach for, what it costs, and whether you know the edge cases of binary
search. That is a practitioner's map, and it is small enough to own completely.</p>
<h3>Which sort, and why std::sort wins</h3>
<p>std::sort is introsort: quicksort for speed, switching to heapsort if recursion goes
pathological, and insertion sort for tiny runs. You get O(n log n) guaranteed, excellent
cache behaviour, and two decades of tuning. In Python, sorted() is Timsort, a merge sort
variant that exploits existing runs, so nearly-sorted data sorts in close to O(n).
The practical rule: call the library sort, and spend your cleverness on the comparator
and on whether you need to sort at all.</p>
<h3>Stability, in one sentence</h3>
<p>A stable sort preserves the relative order of equal keys. Sort scan records by
timestamp, then stably by channel, and records within each channel stay time-ordered.
std::sort is not stable; std::stable_sort and Timsort are. If your two-pass sort
scrambles ties, this is why.</p>
<h3>Selection: when you do not need the full sort</h3>
<ul>
<li><b>std::nth_element</b>: puts the k-th element in its sorted position in O(n)
average. The right tool for a median: for a million samples that is roughly a million
operations instead of the twenty million a full sort costs.</li>
<li><b>std::partial_sort</b>: the smallest k elements, sorted, in O(n log k). The top
ten of a million scores does not justify sorting a million entries.</li>
<li>A running median over a stream is two heaps, not repeated sorting.</li>
</ul>
<h3>Binary search edge discipline</h3>
<p>Binary search is famous for off-by-one bugs. The discipline that removes them:
work with a half-open interval [lo, hi), compute mid = lo + (hi - lo)/2 to avoid
overflow, and make every branch strictly shrink the interval. Better still, think in
terms of lower_bound (first element not less than the target) and upper_bound (first
element greater). Their difference counts occurrences, and equal_range gives both.
On a million sorted elements a lookup takes about 20 comparisons, since 2 to the power
20 is 1,048,576.</p>
<h3>Sorted array versus hash table</h3>
<p>A hash lookup is O(1) average, but a sorted vector wins more often than the
asymptotics suggest: it is contiguous, so the twenty binary-search probes hit cache
nicely, it supports range queries and nearest-neighbour lookups that hashes cannot do
at all, and it costs no per-element overhead. The working heuristic: build-once,
query-many favours a sorted vector; heavy interleaved insert and lookup favours the
hash. And below about fifty elements a plain linear scan beats both, because constants
beat asymptotics at small n.</p>
<h3>Things to say out loud in an interview</h3>
<ul>
<li>Sorting costs O(n log n) time but enables O(log n) queries forever after:
amortise the sort across the queries it unlocks.</li>
<li>Comparison sorts cannot beat O(n log n) in general, but counting or radix sorts
reach O(n) when keys are small integers, timestamps or bucketed floats.</li>
<li>Know your data: nearly sorted, few unique keys, or already-bucketed inputs all
change the right answer.</li>
</ul>`,
quiz: [
{ q: "std::sort is typically implemented as:",
o: ["Pure quicksort", "Merge sort", "Introsort: quicksort with heapsort fallback and insertion sort for small runs", "Bubble sort with early exit"],
a: 2, why: "Introsort keeps quicksort's average speed but bounds the worst case by switching to heapsort when recursion depth explodes." },
{ q: "A stable sort guarantees:",
o: ["Equal keys keep their original relative order", "O(n) worst case", "No extra memory", "Sorted output on every core"],
a: 0, why: "Stability only concerns ties; it is what makes multi-pass sorts (by one key, then another) compose correctly." },
{ q: "Best tool for the median of a million unsorted floats:",
o: ["std::sort then middle element", "std::stable_sort", "A hash set", "std::nth_element"],
a: 3, why: "nth_element places the middle element in its sorted position in O(n) average, roughly 20 times cheaper than a full sort at this size." },
{ q: "About how many comparisons does binary search need on 1,000,000 sorted elements?",
o: ["10", "20", "1000", "500,000"],
a: 1, why: "Each probe halves the interval and 2 to the power 20 is 1,048,576, so about 20 probes suffice." }
],
interview: {
q: "You have a million time-stamped sensor events and need fast lookups by timestamp. A colleague reaches for a hash map. What do you suggest?",
a: "I would ask what the queries look like. Exact-match lookups by identical timestamp suit a hash, but timestamp queries are almost never exact: we want the nearest event, or everything in a window, and a hash map cannot answer either without scanning. I would sort the events once, O(n log n), then use lower_bound style binary search: about 20 probes per query on a million records, contiguous memory, and range queries fall out for free by searching both endpoints. If events keep arriving, I would buffer new ones and merge periodically rather than pay per-insert. The hash map only wins if we genuinely key on exact identifiers, and then I would say so."
}
},

{
id: "cm-graphs",
track: "CS & Maths",
title: "Graphs and trees where engineers meet them",
mins: 30,
body: `
<p>Engineers meet graphs constantly without naming them: dependency builds, signal
routing, netlists, state spaces, sensor networks. The interview layer is thin: two
representations, two traversals, one shortest-path idea, heaps, and topological
order.</p>
<h3>Representations and their costs</h3>
<ul>
<li><b>Adjacency list</b>: for each node, a list of neighbours. Memory O(V + E), the
default for sparse graphs, which is nearly all real graphs.</li>
<li><b>Adjacency matrix</b>: V by V grid of flags or weights. O(1) edge lookup but
O(V squared) memory: 10,000 nodes already means 100 million entries. Right only for
small or dense graphs, or when you want linear-algebra tricks.</li>
</ul>
<h3>BFS and DFS: same skeleton, different container</h3>
<p>Both visit every node once and every edge once, O(V + E). Breadth-first search uses
a queue and explores in rings of increasing distance, so in an unweighted graph the
first time BFS reaches a node it has found a shortest path in edge count. Depth-first
search uses a stack (or recursion) and dives deep; it is the natural engine for cycle
detection, connected components, reachability and topological sorting. The mistake
interviewers watch for: forgetting the visited set, which turns any cyclic graph into
an infinite loop.</p>
<h3>Dijkstra by intuition</h3>
<p>With weighted edges, shortest path means cheapest total, and Dijkstra is the
algorithm to know. Picture the graph as a network of pipes and pour water in at the
source: the wavefront reaches nodes in order of increasing total cost. Dijkstra
simulates that with a priority queue of tentative distances, repeatedly settling the
closest unsettled node and relaxing its neighbours. Once a node is settled its
distance is final, which is exactly why negative edge weights break the algorithm:
a later cheap detour could undercut a settled node. Cost with a binary heap:
O((V + E) log V). A star search is Dijkstra plus an admissible estimate of remaining
cost, steering the wavefront toward the goal.</p>
<h3>Heaps: the tree you use most and see least</h3>
<p>A binary heap is a complete binary tree stored flat in an array: children of index
i sit at 2i + 1 and 2i + 2, no pointers. The root is always the minimum (or maximum);
push and pop cost O(log n) by bubbling up or sifting down. That one structure powers
priority queues, schedulers, Dijkstra's frontier, timer wheels and the two-heap
running median. For interval problems, sorting endpoints or sweeping a line with a
heap solves most scheduling and overlap questions without exotic structures.</p>
<h3>Topological order: dependencies without tears</h3>
<p>A directed acyclic graph (DAG) of tasks, where an edge means must-run-before, always
admits a topological order. Kahn's algorithm produces it: repeatedly remove a node with
no incoming edges and append it to the output. If you run out of zero-in-degree nodes
before emptying the graph, you have proven a dependency cycle, and the nodes left over
are the culprits. Build systems, spreadsheet recalculation, firmware init ordering and
Makefiles are all this algorithm wearing different clothes.</p>
<h3>Sentences that land well</h3>
<ul>
<li>BFS for fewest hops, Dijkstra for cheapest total, DFS for structure.</li>
<li>Most real graphs are sparse: adjacency lists unless proven otherwise.</li>
<li>A cycle in the dependency graph is not an ordering problem, it is a design
problem.</li>
</ul>`,
quiz: [
{ q: "In an unweighted graph, the first time BFS reaches a node it has found:",
o: ["A random path", "A shortest path in edge count", "The cheapest weighted path", "A cycle"],
a: 1, why: "BFS explores in rings of increasing hop count, so no shorter route to that node can exist." },
{ q: "Dijkstra's algorithm fails when:",
o: ["The graph is sparse", "There are more edges than nodes", "Some edge weights are negative", "The graph is directed"],
a: 2, why: "Dijkstra finalises the closest node permanently; a negative edge discovered later could undercut an already-settled distance." },
{ q: "In a binary heap of a million elements, inserting one element costs about:",
o: ["1 comparison", "20 comparisons", "1000 comparisons", "A full rebuild"],
a: 1, why: "Insert bubbles up at most the tree height, log2 of 1,000,000, which is about 20." },
{ q: "Kahn's algorithm gets stuck with nodes remaining but none of in-degree zero. This proves:",
o: ["The graph is disconnected", "The graph is too large", "A node has no edges", "The dependency graph contains a cycle"],
a: 3, why: "In a DAG some node always has in-degree zero; running out early means the leftovers form at least one cycle." }
],
interview: {
q: "Your firmware modules have an init-order problem: module A sometimes starts before the clock driver it needs. How would you solve this properly?",
a: "I would stop hand-ordering the init list and make the dependencies explicit: each module declares what it requires, giving a directed graph with edges meaning must-init-before. Then a topological sort, Kahn's algorithm, generates the init order automatically, at build time if possible so it costs nothing at runtime. The immediate win is correctness, but the bigger win is that cycles get detected instead of causing intermittent boot failures: if Kahn's runs out of zero-in-degree modules, the leftover set names the circular dependency, and that is a design conversation, not a reordering hack. I have used the same pattern for processing pipelines, where stage order was previously tribal knowledge held in one engineer's head."
}
},

{
id: "cm-numerics",
track: "CS & Maths",
title: "ODE solvers and simulation maths",
mins: 30,
body: `
<p>Any simulation that steps physics forward in time, robot dynamics, thermal models,
circuit transients, wave propagation, rests on a numerical integrator. Interviewers
probe whether you know what your solver costs, when it lies, and when it explodes.</p>
<h3>Euler versus RK4: accuracy per function call</h3>
<p>Forward Euler steps x by h times f(x, t): one derivative evaluation per step, with
global error O(h). Halve the step, halve the error. Classical Runge-Kutta 4 samples
the derivative four times per step and blends them, buying global error O(h to the
fourth): halve the step and the error drops by a factor of 16. The consequence is
counterintuitive but central: RK4 costs four times more per step yet is usually far
cheaper per unit of accuracy, because you can take dramatically longer steps. Euler
survives in real-time control loops where the step is fixed and tiny anyway, and in
first drafts.</p>
<h3>Stability and stiffness, in words</h3>
<p>Accuracy asks how close the answer is; stability asks whether errors grow or decay
as you step. Every explicit method has a stability limit: push the step size past it
and the solution oscillates with growing amplitude, then overflows, even though each
individual step looked reasonable. A problem is <b>stiff</b> when it contains
timescales far apart: a thermal model with a milliseconds-fast sensor and an
hours-slow enclosure. An explicit solver must step at the fastest timescale for
stability even after that transient has died away, which is ruinously slow. Implicit
methods such as backward Euler solve an equation at each step, costing more per step,
but remain stable at large steps. The fingerprint of stiffness: your adaptive explicit
solver crawls with tiny steps while the solution looks utterly smooth. Reach for a
stiff solver, in scipy the BDF or Radau options.</p>
<h3>Step-size control</h3>
<p>Adaptive solvers such as RK45 embed two estimates of different order in one step;
their difference estimates the local error. If it exceeds tolerance, shrink the step
and retry; if comfortably under, grow it. You set tolerances, not step sizes. The
honest habit: tighten the tolerance by a factor of ten and check the answer moves
less than you care about. If it moves a lot, you were not converged.</p>
<h3>Energy drift: the symptom worth memorising</h3>
<p>Integrate an undamped oscillator or an orbit with forward Euler and the amplitude
grows every cycle: the method injects energy. Runge-Kutta methods typically bleed
energy slowly instead. Neither is acceptable for long simulations of conservative
systems. Symplectic integrators, semi-implicit Euler and velocity Verlet being the
famous ones, are built to respect the underlying geometry: energy errors stay bounded,
oscillating rather than accumulating, which is why molecular dynamics and orbital
mechanics use them, and why game physics engines use semi-implicit Euler.</p>
<h3>CFL: the same idea in space and time</h3>
<p>Explicit finite-difference schemes for wave equations carry the Courant condition:
information must not travel more than one grid cell per time step, c times dt over dx
at most 1 in one dimension. Refine the spatial grid by two and you must halve the time
step too, so the total cost rises eightfold in one dimension plus time. For diffusion
equations it is harsher still: dt scales with dx squared. This is why fine simulation
grids get expensive so much faster than intuition expects.</p>`,
quiz: [
{ q: "Halving the step size of an RK4 integration reduces global error by roughly:",
o: ["A factor of 16", "A factor of 2", "A factor of 4", "It is unchanged"],
a: 0, why: "RK4 has global error of order h to the fourth, and 2 to the fourth is 16." },
{ q: "Your adaptive explicit solver takes absurdly tiny steps although the solution looks smooth. The likely cause is:",
o: ["Too much output logging", "The problem is stiff: stability, not accuracy, is limiting the step", "A singular matrix", "The tolerance is too loose"],
a: 1, why: "Stiff systems force explicit methods to step at the fastest timescale even when it no longer affects the visible solution; an implicit solver fixes it." },
{ q: "An undamped pendulum simulated with forward Euler will:",
o: ["Conserve energy exactly", "Stop moving", "Gain amplitude steadily as the method injects energy", "Behave identically to RK4"],
a: 2, why: "Forward Euler is not symplectic and systematically adds energy to oscillatory systems; symplectic integrators keep the error bounded." },
{ q: "For an explicit 1D wave-equation scheme, refining dx by a factor of 2 requires dt to:",
o: ["Stay the same", "Double", "Shrink by a factor of 4", "Halve, to keep c dt/dx within the Courant limit"],
a: 3, why: "The CFL condition ties the time step to the grid spacing, so total cost grows much faster than the spatial refinement alone." }
],
interview: {
q: "Your robot dynamics simulation matches reality for short runs but the simulated arm slowly gains energy over minutes. What is going on and what would you change?",
a: "That is the classic signature of a non-symplectic integrator on a nearly conservative system: forward Euler, and to a lesser degree standard Runge-Kutta, does not respect energy conservation, so error accumulates as steady drift rather than noise. Shrinking the step suppresses it but never removes it. I would switch to a symplectic scheme, semi-implicit Euler or velocity Verlet, which keeps energy error bounded and oscillatory instead of growing, at essentially the same cost per step. I would also separate concerns: check whether contact and friction models inject energy independently, and verify by simulating the undamped arm alone and plotting total energy over time. That plot is cheap and tells you immediately whether the integrator is the culprit."
}
},

{
id: "cm-interp",
track: "CS & Maths",
title: "Interpolation and resampling maths",
mins: 25,
body: `
<p>Interpolation questions test whether you understand what you are assuming when you
invent values between samples. Every scheme is a smoothness assumption in disguise,
and the right one depends on what the data means.</p>
<h3>The ladder: linear, cubic, spline</h3>
<ul>
<li><b>Linear</b>: connect the dots. Continuous value, discontinuous slope. Cheap,
monotone, never overshoots. Right for lookup tables and anywhere kinks are
tolerable.</li>
<li><b>Cubic (piecewise Hermite)</b>: fits a cubic in each interval using slopes at
the endpoints. Smooth first derivative. Catmull-Rom estimates the slopes from
neighbours; the shape-preserving PCHIP variant clamps them so the curve never
overshoots the data, which is why it is the sane choice for physical quantities
that must not go negative.</li>
<li><b>Cubic spline</b>: one global solve so that value, slope and curvature are all
continuous. Beautifully smooth, but global: moving one point wiggles the whole
curve, and it happily overshoots near sharp features.</li>
</ul>
<h3>Runge's warning about high-degree polynomials</h3>
<p>Fitting one polynomial of degree n through n + 1 equally spaced points seems
natural and fails spectacularly: as the degree grows the fit oscillates wildly near
the interval ends. That is the Runge phenomenon. The cures: use piecewise low-order
interpolation (splines exist precisely for this), or if you must use one high-degree
polynomial, sample at Chebyshev points, which crowd toward the ends and tame the
oscillation. The interview sentence: never fit a degree-20 polynomial to 21 equally
spaced points and expect physics.</p>
<h3>Sinc interpolation: sampling theory closes the loop</h3>
<p>For a band-limited signal sampled above the Nyquist rate, the sampling theorem does
not merely say information survives; it gives the exact reconstruction: place a sinc
function at every sample and sum. Every practical resampler, polyphase filters,
windowed-sinc kernels, upsampling in your DSP chain, is a finite approximation of
that ideal. This is why resampling belongs to filtering: upsample by inserting zeros
then low-pass, downsample by low-pass then decimate. Linear interpolation of a
waveform is just a very poor low-pass filter, fine for envelopes, damaging for
phase-critical work.</p>
<h3>Parabolic peak refinement, derived in words</h3>
<p>You have a sampled correlation or spectrum with a peak at bin i, and want the true
peak location between bins. Near its maximum any smooth peak looks like a parabola,
so fit one through the three points around the maximum: values a, b, c at bins
i - 1, i, i + 1. Write the parabola, differentiate, set the derivative to zero, and
the vertex lands at offset d = 0.5 (a - c) / (a - 2b + c) bins from i, always within
half a bin. Worked example: samples 2, 5, 4 give d = 0.5 times (2 - 4) / (2 - 10 + 4),
which is 0.5 times (-2) / (-4) = +0.25, so the true peak sits a quarter of a bin
toward the larger neighbour. For FFT magnitude peaks, interpolating the logarithm of
the three magnitudes is more accurate still, because a windowed tone's spectral peak
is close to Gaussian and taking logs makes it parabolic. This one formula turns
sample-spaced estimates of delay or frequency into estimates ten or more times
finer, which is exactly how sub-sample time-of-flight measurement works.</p>`,
quiz: [
{ q: "The Runge phenomenon refers to:",
o: ["Numerical overflow in polynomial evaluation", "Aliasing during decimation", "Wild oscillation near the ends when fitting high-degree polynomials at equally spaced points", "Loss of precision in FP32"],
a: 2, why: "Equispaced high-degree interpolation diverges at the edges; piecewise splines or Chebyshev nodes are the standard cures." },
{ q: "Sinc interpolation reconstructs a sampled signal exactly when:",
o: ["The signal is band-limited below Nyquist", "The signal is periodic", "At least 100 samples are used", "The samples are noise-free integers"],
a: 0, why: "The sampling theorem guarantees exact reconstruction of band-limited signals; practical resamplers approximate the infinite sinc sum." },
{ q: "Three samples around a peak are 2, 5 and 4. Parabolic refinement places the true peak at:",
o: ["Exactly the middle sample", "A quarter bin toward the side with value 4", "A quarter bin toward the side with value 2", "Half a bin past the sample with value 4"],
a: 1, why: "d = 0.5 (a - c)/(a - 2b + c) = 0.5 (2 - 4)/(2 - 10 + 4) = +0.25, positive meaning toward the right-hand neighbour." },
{ q: "Compared with a global cubic spline, shape-preserving cubic (PCHIP) interpolation:",
o: ["Is smoother in the second derivative", "Requires equally spaced points", "Is exact for band-limited signals", "Never overshoots the data, at the cost of a less smooth curve"],
a: 3, why: "PCHIP clamps segment slopes to preserve monotonicity, so concentrations and magnitudes cannot swing negative between points." }
],
interview: {
q: "Your time-of-flight estimate is limited to one sample period of resolution and a colleague proposes massive upsampling of the waveform. What do you propose instead?",
a: "Upsampling works but is brute force: a 100 times finer estimate costs 100 times the samples plus a long reconstruction filter. I would cross-correlate at the native rate, find the peak bin, then refine with parabolic interpolation through the three points around the peak: the vertex formula gives a sub-sample offset in a handful of operations, and on decent signal-to-noise it delivers a tenth to a hundredth of a sample routinely. If the correlation peak is asymmetric I would interpolate the log magnitudes or use the analytic envelope to sharpen it. I have used exactly this on ultrasound pulse-echo data, where sub-sample time of flight translated directly into micrometre-scale thickness resolution without touching the sample rate."
}
},

{
id: "cm-fourier",
track: "CS & Maths",
title: "Fourier maths beyond the FFT button",
mins: 30,
body: `
<p>Plenty of engineers can press the FFT button. The interview differentiator is the
mental map behind it: which transform you are actually using, what is dual to what,
and what is conserved.</p>
<h3>The four-transform mental map</h3>
<p>One idea, four habitats, set by whether time and frequency are continuous or
discrete:</p>
<ul>
<li><b>Fourier transform</b>: continuous time, continuous frequency. The analytical
tool for textbook signals.</li>
<li><b>Fourier series</b>: periodic continuous time gives discrete frequencies
(harmonics).</li>
<li><b>DTFT</b>: sampled time gives a continuous, periodic spectrum. Periodicity of
the spectrum IS aliasing seen from the maths side.</li>
<li><b>DFT</b>: sampled time, sampled frequency, both finite. The only one a computer
can hold, and the FFT is merely a fast algorithm for it.</li>
</ul>
<p>The rule connecting them: sampling in one domain makes the other domain periodic.
Sample in time, the spectrum repeats every fs. Sample in frequency, as the DFT does,
and the time signal is implicitly periodic, which is exactly where leakage comes
from.</p>
<h3>Duality: the trade you cannot escape</h3>
<p>Squeeze a signal in time and its spectrum spreads, and vice versa: the
time-bandwidth product is bounded below. A 1 microsecond pulse necessarily occupies
about a megahertz of bandwidth; a 10 Hz resolution measurement necessarily takes about
100 ms of data. Other dualities worth having ready: a shift in time is a linear phase
ramp in frequency (the basis of fractional delays and beam steering), convolution in
time is multiplication in frequency (the basis of fast filtering), and multiplication
in time, windowing, is convolution in frequency, which is why windows smear spectra.</p>
<h3>Parseval: energy is conserved across the transform</h3>
<p>The energy computed in time equals the energy computed in frequency, up to the 1/N
bookkeeping in the DFT convention. That justifies band-power metrics: integrating a
band of the spectrum measures real signal energy, not an artefact of the transform.
It is also a free sanity check on any pipeline: compute total energy both sides of
the FFT and the ratio must match your convention exactly.</p>
<h3>Transform pairs worth memorising</h3>
<ul>
<li>Rectangular pulse and sinc: the pair behind leakage and the -13 dB sidelobes.</li>
<li>Gaussian and Gaussian: the unique self-transform shape, and the minimum
time-bandwidth product.</li>
<li>Impulse and constant: perfectly sharp in one domain means flat in the other.</li>
<li>Impulse train and impulse train: the pair that makes sampling theory one-line.</li>
<li>Exponential decay and Lorentzian: the linewidth of every resonance.</li>
</ul>
<h3>The DFT as a matrix, and as projections</h3>
<p>The DFT is multiplication by an N by N matrix whose rows are complex sinusoids;
those rows are mutually orthogonal, so the transform is a rotation in signal space,
scaled. Bin k is the inner product of your signal with the sinusoid at k fs / N: a
projection asking how much of this frequency is present. Seen this way, nothing about
the FFT is mysterious: it is a change of basis, Parseval is just length preservation
under rotation, and the FFT's contribution is purely computational, N log N operations
instead of the N squared a direct matrix multiply costs. For N of 4096 that is roughly
50 thousand versus 17 million multiplies, which is why real-time spectra exist.</p>`,
quiz: [
{ q: "Sampling a signal in time makes its spectrum:",
o: ["Periodic, repeating every fs", "Zero above Nyquist", "Continuous and aperiodic", "Purely real"],
a: 0, why: "Sampling in either domain forces periodicity in the other; overlap of those spectral copies is aliasing." },
{ q: "Convolution in the time domain corresponds in the frequency domain to:",
o: ["Convolution again", "Addition", "Multiplication", "Differentiation"],
a: 2, why: "This duality is why FFT-based filtering works: transform, multiply by the frequency response, transform back." },
{ q: "Which shape is its own Fourier transform?",
o: ["Rectangular pulse", "Sinc", "Exponential decay", "Gaussian"],
a: 3, why: "The Gaussian transforms to a Gaussian and uniquely achieves the minimum time-bandwidth product." },
{ q: "Parseval's theorem lets you check an FFT pipeline by:",
o: ["Confirming the first bin is largest", "Comparing total energy computed in time and in frequency", "Checking the spectrum is symmetric", "Verifying the phase is zero"],
a: 1, why: "Energy is preserved across the transform up to the convention's 1/N factor, so any mismatch flags a scaling bug." }
],
interview: {
q: "A customer asks why your instrument cannot report both microsecond-precise event timing and 10 Hz frequency resolution from the same short window. Explain.",
a: "Those two requests pull in opposite directions because time and frequency are dual: frequency resolution is the reciprocal of observation length, so resolving 10 Hz needs roughly 100 milliseconds of signal, while microsecond timing needs wide bandwidth and a short analysis window. One window cannot be both long and short. What we can do is process the same data twice: a long window for the spectral estimate and a short one for event timing, or use a spectrogram to show the trade explicitly. If the signal is well modelled, parametric estimation can beat the plain FFT limit by assuming structure, but that assumption must be defended. The limitation is physics of observation, not a firmware shortcoming, and I would say so plainly."
}
},

{
id: "cm-opt2",
track: "CS & Maths",
title: "Constrained optimisation and regularisation",
mins: 30,
body: `
<p>Unconstrained least squares is the easy half of real fitting. Production problems
carry constraints, parameters that must stay positive, powers that must not exceed a
budget, and need regularisation to behave. This lesson gives you the working
vocabulary.</p>
<h3>Lagrange multipliers by picture</h3>
<p>Minimise f(x) subject to g(x) = 0. Walk along the constraint surface: at the
constrained optimum you cannot improve f by moving along the surface, which means the
gradient of f has no component along it, which means grad f is parallel to grad g.
Introduce a multiplier lambda so that grad f = lambda grad g, and solve that together
with the constraint. The multiplier is not just bookkeeping: its value is the
sensitivity of the optimum to relaxing the constraint, what economists call a shadow
price. If lambda for a power budget comes out near zero, the budget was not binding;
if it is large, an extra watt buys real performance.</p>
<h3>Penalty methods: constraints by brute force</h3>
<p>Alternatively, add mu times the squared constraint violation to the objective and
solve unconstrained. Small mu lets the solution cheat; cranking mu enforces the
constraint but makes the problem increasingly ill-conditioned, a cliff wall welded to
a gentle valley. Practical schemes increase mu gradually, warm-starting each solve
from the last. The augmented Lagrangian method combines a penalty with a running
multiplier estimate and gets the constraint satisfied without mu going to infinity;
it is what serious solvers use.</p>
<h3>L2 versus L1: two characters of regulariser</h3>
<ul>
<li><b>L2 (ridge, Tikhonov)</b>: penalise the sum of squared parameters. Shrinks
everything smoothly toward zero, never exactly to zero. Stabilises ill-conditioned
fits, spreads energy across correlated parameters, keeps solutions smooth.</li>
<li><b>L1 (lasso)</b>: penalise the sum of absolute values. Drives many parameters
exactly to zero, performing selection, not just shrinkage. The geometric reason:
the L1 ball is a diamond, and optima land on its corners, where coordinates vanish.
The cost: no closed form, and among strongly correlated parameters it arbitrarily
picks one.</li>
</ul>
<p>Rule of thumb: L2 when you believe everything contributes a little (smooth fields,
tomography), L1 when you believe few things contribute (sparse spikes, model
selection). Total variation, an L1 penalty on differences, preserves edges where an
L2 smoother would blur them.</p>
<h3>Bound constraints in practice</h3>
<p>Most physical fits need boxes, not exotic constraints: gains positive, fractions in
[0, 1], temperatures above absolute zero. Do not add penalty hacks for these; use a
bounded solver, L-BFGS-B or scipy least_squares with bounds, which handle boxes
natively by projection and active-set logic. And be suspicious of any fit that
finishes ON a bound: it usually means the model is compensating for something wrong
elsewhere, and the parameter value is not really an estimate any more.</p>
<h3>Convex versus nonconvex: what is at stake</h3>
<p>Convex problems, least squares, ridge, lasso, linear and quadratic programmes, have
one global optimum, and any local method finds it: the answer is reproducible and
initialisation is a convenience. Nonconvex problems, neural network training and most
physical inversions among them, can trap solvers in local minima, so the honest
workflow is multistart from varied initial guesses, checking whether solutions agree,
and treating the best fit as the best found, not the truth. Knowing which side of
that line your problem sits on is worth more than any solver flag.</p>`,
quiz: [
{ q: "At a constrained optimum with a single equality constraint, the gradient of the objective is:",
o: ["Zero", "Perpendicular to the constraint gradient", "Parallel to the constraint gradient", "Undefined"],
a: 2, why: "No improvement is possible along the constraint surface, so grad f has only a component normal to it, i.e. along grad g." },
{ q: "Which regulariser tends to drive parameters exactly to zero?",
o: ["L1", "L2", "Both equally", "Neither"],
a: 0, why: "The L1 ball has corners on the axes and optima land there, zeroing coordinates; L2 shrinks smoothly but keeps everything nonzero." },
{ q: "As the penalty weight mu grows very large in a quadratic penalty method, the subproblem becomes:",
o: ["Convex regardless of the original problem", "Exactly equivalent to the constrained problem with no drawbacks", "Unconstrained and easier", "Increasingly ill-conditioned"],
a: 3, why: "The penalty adds curvature only across the constraint, so the Hessian's eigenvalues spread and solvers struggle; augmented Lagrangians avoid the limit." },
{ q: "Your fitted parameter sits exactly on the bound you gave it. The healthiest interpretation is:",
o: ["The fit is converged and fine", "The bound should simply be removed", "Something in the model is being compensated; the value is not a trustworthy estimate", "The optimiser has a bug"],
a: 2, why: "A parameter pinned at its bound is the solver straining against your prior knowledge, which usually flags a modelling or data problem." }
],
interview: {
q: "Your tomographic reconstruction is unstable: tiny changes in the data produce big changes in the image. Walk me through how you would regularise it, and how you would defend the choice.",
a: "Instability under small data changes is ill-conditioning, so I would add a regulariser matched to prior physics. If the medium varies smoothly, Tikhonov on the gradient of the image; if it has sharp interfaces worth preserving, total variation instead, since L2 smoothing blurs edges. I would choose the weight by sweeping it over a few decades and plotting misfit against solution roughness: the L-curve corner marks where we stop fitting noise. To defend it, I would show reconstructions at weights either side of the corner so reviewers see the trade, and report any regions that stay data-limited at every weight rather than smoothing them into false confidence. I ran exactly this workflow on ring-array ultrasound inversions, and the corner choice was reassuringly insensitive."
}
},

{
id: "cm-bayes",
track: "CS & Maths",
title: "Bayesian thinking for engineers",
mins: 30,
body: `
<p>Bayes' rule is one line: posterior is proportional to likelihood times prior. The
interview skill is wielding it on real numbers without flinching, and recognising the
machinery you already use, Kalman filtering above all, as Bayes in disguise.</p>
<h3>The worked diagnostic example (memorise the shape)</h3>
<p>A fault affects 1% of boards. Your test catches 99% of faulty boards (sensitivity)
but also flags 5% of good boards (false positive rate). A board tests positive: what
is the chance it is actually faulty? Count on 10,000 boards. Faulty: 100, of which 99
test positive. Good: 9,900, of which 5%, that is 495, also test positive. So positives
total 99 + 495 = 594, of which only 99 are truly faulty: 99 / 594 is about 17%. A
positive from a 99%-accurate test leaves a five-in-six chance the board is fine,
because the base rate is so low. Run the numbers this way, as counts, and you will
never fumble it live.</p>
<h3>The vocabulary, precisely</h3>
<ul>
<li><b>Likelihood</b>: probability of the data given a parameter value. It is a
function of the parameter, not a probability distribution over it.</li>
<li><b>Prior</b>: what you believed before the data. Not a fudge: an honest, auditable
statement of existing knowledge, from datasheets, physics or previous runs.</li>
<li><b>Posterior</b>: prior reweighted by likelihood. The complete answer: a
distribution, carrying its own uncertainty, not just a point.</li>
</ul>
<p>Confusing likelihood with posterior is the base-rate fallacy in formal dress: the
probability of the data given the fault is 99%, but the probability of the fault
given the data is 17%. Those are different conditional directions.</p>
<h3>MAP versus ML</h3>
<p>Maximum likelihood picks the parameter making the data most probable: no prior, or
rather a flat one. Maximum a posteriori maximises likelihood times prior. The
connection every instrumentation engineer should own: MAP with a Gaussian prior is
exactly least squares with L2 regularisation, and MAP with a Laplacian prior is L1.
Regularisation is not a hack bolted onto fitting; it is a prior confessed in the open.
With plentiful data the likelihood dominates and ML and MAP converge; with scarce
data the prior earns its keep.</p>
<h3>Where Kalman is Bayes</h3>
<p>The Kalman filter is sequential Bayes for linear systems with Gaussian noise. The
predict step pushes yesterday's posterior through the motion model to make today's
prior; the update step multiplies that prior by the measurement likelihood; because
Gaussians multiply into Gaussians, the posterior stays Gaussian and the algebra
collapses to the familiar gain equations. The Kalman gain is precisely the Bayesian
balance between prior confidence and measurement confidence. Seen this way, Q and R
tuning is prior specification, and an unmodelled bias is a wrong likelihood.</p>
<h3>Base-rate traps in engineering life</h3>
<p>Rare-event alarms are the diagnostic example wearing overalls: an anomaly detector
with a 1% false-positive rate monitoring a fault that occurs once per 10,000 windows
produces roughly 100 false alarms per true one, and operators learn to ignore it.
Cures: raise the prior by gating (only alarm when the machine is under load), demand
independent confirmation (two dissimilar sensors), or accept detection latency by
requiring persistence. Every cascade-of-checks architecture is Bayes: cheap high-recall
stages raise the prior for expensive, specific stages downstream.</p>`,
quiz: [
{ q: "Fault rate 1%, sensitivity 99%, false positive rate 5%. A board tests positive. Roughly what fraction of such boards are truly faulty?",
o: ["99%", "83%", "50%", "17%"],
a: 3, why: "Per 10,000 boards: 99 true positives and 495 false positives, and 99/594 is about 17%; the low base rate dominates the test accuracy." },
{ q: "MAP estimation with a Gaussian prior on the parameters is equivalent to:",
o: ["Least squares with an L2 penalty", "Least squares with an L1 penalty", "Unregularised maximum likelihood", "Grid search"],
a: 0, why: "The log of a Gaussian prior is a negative squared norm, so maximising the posterior adds a ridge penalty to the least-squares objective." },
{ q: "In Bayesian terms, the Kalman predict step computes:",
o: ["The likelihood of the new measurement", "Today's prior, by pushing the previous posterior through the motion model", "The marginal evidence", "A flat prior"],
a: 1, why: "Predict propagates belief forward and inflates uncertainty by Q; the update step then multiplies in the measurement likelihood." },
{ q: "An anomaly detector has a 1% false alarm rate and the fault occurs in 1 of 10,000 windows. Alarms will be:",
o: ["Mostly genuine", "About half genuine", "Overwhelmingly false, roughly 100 false per true alarm", "Impossible to estimate"],
a: 2, why: "Per 10,000 windows expect about 100 false alarms and 1 true one; base rates, not detector accuracy, set the alarm quality." }
],
interview: {
q: "Management wants your rare-fault detector tightened because operators complain most alarms are false. The detector is already 99% accurate. What do you tell them?",
a: "I would show the arithmetic first: at a fault rate of one in ten thousand windows, even a 1% false-positive rate produces about a hundred false alarms per genuine fault, so alarm quality is being set by the base rate, not by detector accuracy. Chasing another decimal of accuracy attacks the wrong term in Bayes' rule. The effective levers raise the prior before the alarm fires: gate detection to conditions where faults actually occur, require confirmation from an independent sensor, or require persistence across several windows, trading a little latency for a large precision gain. I built exactly this structure as a cascade in a pet-monitoring system: a cheap high-recall gate feeding a specific confirmer, and the false alarm rate fell by orders of magnitude."
}
},

{
id: "cm-ml",
track: "CS & Maths",
title: "Classical ML foundations",
mins: 30,
body: `
<p>Interviewers rarely need you to derive backpropagation. They need to trust you will
not fool yourself with data, and that you know when a two-parameter model beats a
two-million-parameter one. That is classical ML, and it is mostly discipline.</p>
<h3>The framing step</h3>
<p>Regression predicts a number (remaining useful life, thickness, temperature);
classification predicts a label (pass or fail, which activity, which defect class).
Choose the framing from the decision the output feeds, not from habit: if the action
threshold is 0.8 millimetres of wall loss, predicting the number and thresholding it
keeps the threshold adjustable; baking the threshold into a classifier freezes it into
the training labels. Also decide early what error costs: a false pass and a false fail
are rarely symmetric, and that asymmetry belongs in the loss or the threshold, not in
wishful thinking.</p>
<h3>Train, validation, test: the discipline that is the job</h3>
<p>Fit parameters on the training set. Choose everything else, features,
regularisation strength, model family, stopping point, on the validation set. Touch
the test set once, at the end, for the number you will quote. Every peek at the test
set while developing leaks information and inflates the quoted performance. Two traps
matter more than the ratios: <b>leakage</b>, where preprocessing sees the whole
dataset (fit your scaler on training data only, inside the cross-validation loop);
and <b>grouped data</b>, where consecutive or same-subject samples are near
duplicates, so random splitting is silently optimistic. Split by session, by subject,
by day, by whatever unit is independent in deployment.</p>
<h3>Bias and variance, in words</h3>
<p>Bias is the error from a model too simple to represent the truth: it underfits, and
more data does not help. Variance is the error from a model flexible enough to fit
noise: it aces training data and stumbles on validation data. The two symptoms have
opposite cures, which is why you diagnose before treating: high training error means
raise capacity or add features; a large train-validation gap means regularise,
simplify, or collect more data. Plotting both errors against training-set size tells
you which regime you are in for the price of one afternoon.</p>
<h3>The two workhorses at concept level</h3>
<ul>
<li><b>Logistic regression</b>: a weighted sum of features squashed through a sigmoid
into a probability; the decision boundary is a straight line (a hyperplane).
Interpretable coefficients, well-calibrated probabilities, trains in milliseconds,
and with L1 or L2 penalties it doubles as a feature-selection tool. Always the
baseline.</li>
<li><b>Trees and random forests</b>: a tree asks a sequence of threshold questions,
carving the feature space into boxes; a forest trains many trees on bootstrapped
samples with random feature subsets and averages them, trading the single tree's
high variance for a robust, low-tuning ensemble. Handles nonlinearity and mixed
feature types, gives usable feature importances, and gradient-boosted variants
remain the tabular-data champions.</li>
</ul>
<h3>Feature scaling</h3>
<p>Anything using distances or gradients, k-nearest neighbours, SVMs, logistic
regression, neural networks, needs features on comparable scales, or the largest
feature silently dominates. Standardise to zero mean and unit variance, with
statistics computed on training data only. Tree-based models are indifferent to
monotone scaling, since thresholds move with the feature.</p>
<h3>When classical beats deep</h3>
<p>Hundreds to thousands of labelled samples, tabular or engineered features, a need
to explain decisions, and tight compute or latency budgets: that regime belongs to
classical models. Deep learning earns its complexity when raw high-dimensional
signals, images, audio, long sequences, carry structure human feature design cannot
capture, and enough data exists to learn it. Physics-informed features plus a small
model routinely beats a starved deep network, and it fits on a microcontroller.</p>`,
quiz: [
{ q: "The test set should be used:",
o: ["To choose the regularisation strength", "For early stopping", "Once, at the end, for the final quoted performance", "Whenever validation results look suspicious"],
a: 2, why: "Every development-time peek at the test set leaks information into your choices and inflates the quoted number." },
{ q: "A model reaches 99% training accuracy but 70% validation accuracy. The diagnosis is:",
o: ["High bias: make the model bigger", "High variance: regularise, simplify, or get more data", "Leakage in the test set", "The validation set is too easy"],
a: 1, why: "A large train-validation gap is the signature of overfitting; raising capacity would widen it further." },
{ q: "Which model is essentially unaffected by leaving features unscaled?",
o: ["k-nearest neighbours", "Logistic regression with L2", "A support vector machine", "A random forest"],
a: 3, why: "Trees split on thresholds, which are equivariant to monotone transforms; distance- and gradient-based methods need comparable scales." },
{ q: "Fitting a standardising scaler on the full dataset before splitting into train and test causes:",
o: ["Slower convergence only", "Data leakage: test-set statistics contaminate training preprocessing", "No problem if the split is random", "Higher bias"],
a: 1, why: "The scaler transmits test-set means and variances into training, so the quoted test performance is optimistic; fit it on training folds only." }
],
interview: {
q: "You have 2,000 labelled ultrasound measurements and a colleague wants to train a deep network to classify defects. What is your approach?",
a: "I would start classical and let the data argue for more. First, an honest split: grouped by specimen or session, never randomly across near-duplicate captures, with scaling fitted inside the cross-validation loop. Then a logistic regression baseline on physics-informed features, band energies, attenuation slopes, arrival statistics, followed by a gradient-boosted tree ensemble, which usually wins on tabular features at this scale. With 2,000 samples a deep network is more likely to memorise the dataset's quirks than learn defect physics, and we could not explain its decisions to a qualification authority. If the classical ceiling proves too low and errors look feature-limited, that is evidence for learned representations, and I would revisit deep models with augmentation and pretraining. Baseline first, complexity on demand."
}
}

);
