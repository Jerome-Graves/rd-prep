// DSP: efficient implementation.
//
// Getting the algorithm right is half of it. This is the half where it has to run
// inside a budget: vectorisation, memory bandwidth, what is actually inside an
// FFT, filter structures and their numerics, offloading, and proving the
// implementation still computes what the model said.

LESSONS.push(

{
id: "dsp-simd",
track: "DSP",
sub: "Efficient implementation",
title: "Vectorising DSP: SIMD, alignment and data layout",
mins: 22,
body: `
<p>DSP kernels are the ideal case for vector instructions: the same operation applied to long runs
of independent data. Getting the speed-up that promises is mostly a matter of arranging the data so
the hardware can use it, rather than of writing clever code.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Interleaved complex data requiring shuffles, against separate real and imaginary arrays that vectorise directly">
<rect class="bx" x="24" y="26" width="632" height="70" rx="4"/>
<text class="th" x="40" y="52">interleaved: r i r i r i</text>
<text class="ts" x="40" y="78">natural to write, needs shuffling before every vector operation</text>

<rect class="bxa" x="24" y="112" width="632" height="70" rx="4"/>
<text class="th" x="40" y="138">split: all the real parts, then all the imaginary parts</text>
<text class="ts" x="40" y="164">awkward to write, vectorises with no rearrangement at all</text>

<rect class="bx" x="24" y="196" width="632" height="36" rx="4"/>
<text class="ts" x="40" y="220">the layout decision usually matters more than the instruction selection</text>
</svg>

<p><b>Data layout</b> is the first decision and the one with the largest effect. Complex data stored
as interleaved real and imaginary parts is natural to write and requires rearrangement before every
vector operation. Stored as two separate arrays it vectorises directly. The same argument applies to
multi-channel data: channel-major usually beats sample-major for processing, even though
sample-major is how the converter delivers it.</p>

<p><b>Alignment</b> matters less than it once did but still costs something, and more importantly it
determines whether the compiler is willing to vectorise at all. Allocating buffers aligned to the
vector width, and making the compiler aware of it, is cheap insurance.</p>

<p>The obstacles that prevent vectorisation are worth recognising in your own code. A loop-carried
<b>dependency</b>, where each iteration needs the previous result, cannot be vectorised as written,
which is exactly why a recursive IIR filter is hard and an FIR is easy. Possible <b>aliasing</b>
between input and output pointers forces the compiler to assume the worst unless told otherwise.
<b>Branches</b> inside the loop break it unless they can be turned into arithmetic or a select.</p>

<p>Some of these have standard rewrites. An IIR can be vectorised across <b>channels</b> rather
than along time, which is the usual answer when there are several. Conditional logic can often
become a multiply by a mask. A reduction such as an inner product needs multiple accumulators to
avoid a serial dependency chain, and that changes the summation order, which matters for
reproducibility if not for accuracy.</p>

<p>How to get there is a hierarchy worth following in order. Use a <b>library</b> that is already
optimised for the target, because a vendor DSP library will beat hand-written code and is
maintained. Failing that, write code that <b>auto-vectorises</b> and check the compiler's report to
confirm it did. Only reach for intrinsics when the first two have failed, and expect to maintain
that code for every architecture you ship on.</p>

<p>Finally, measure rather than assume. A kernel that is limited by memory bandwidth will not go
faster when its arithmetic is vectorised, and a great deal of intrinsics work has been spent
speeding up the part that was not the bottleneck.</p>
`,
quiz: [
{ q: "Which data layout vectorises better for complex signals?",
o: ["Interleaved real and imaginary", "Separate real and imaginary arrays", "Whichever the converter produces", "It makes no difference on modern hardware"],
a: 1, why: "Interleaved is natural to write but needs rearranging before every vector operation, and layout usually matters more than instruction selection." },
{ q: "Why is an IIR filter harder to vectorise than an FIR?",
o: ["It uses more coefficients", "Each output depends on the previous one, which is a loop-carried dependency", "It requires floating point", "Its coefficients change"],
a: 1, why: "The usual answer when there are several channels is to vectorise across channels rather than along time." },
{ q: "Why does an inner product need multiple accumulators?",
o: ["To improve numerical accuracy", "A single accumulator creates a serial dependency chain", "To align the data", "To avoid aliasing"],
a: 1, why: "It changes the summation order, which matters for bit-exact reproducibility even where it does not harm accuracy." },
{ q: "What should you try before writing intrinsics?",
o: ["Rewriting in assembly", "An optimised vendor library, then code that auto-vectorises with the report checked", "Increasing the buffer size", "Switching to fixed point"],
a: 1, why: "Intrinsics must then be maintained for every architecture shipped, which is a real cost against a library that is already maintained." }
],
interview: {
q: "A DSP kernel needs to run four times faster. How do you approach it?",
a: "First I would measure where the time actually goes, because the most common waste in this kind of work is optimising arithmetic in a kernel that is limited by memory bandwidth, and vectorising that gains nothing. So I would establish whether it is compute bound or memory bound before touching anything. Assuming it is compute bound, the hierarchy I would follow is library, then auto-vectorisation, then intrinsics, in that order. A vendor DSP library for the target will usually beat what I write by hand and somebody else maintains it, so I would look there first for the FFTs, filters and vector operations. If there is nothing suitable, I would write the kernel so the compiler can vectorise it and then actually check the vectorisation report rather than assuming, because the things that silently prevent it are specific and fixable: possible aliasing between input and output pointers, which I resolve by telling the compiler they do not overlap, branches inside the loop, which I turn into arithmetic or a select, and loop-carried dependencies, which is why an FIR vectorises trivially and an IIR does not. For an IIR with several channels the standard move is to vectorise across channels rather than along time. For a reduction like an inner product I would use several accumulators so there is no serial dependency chain, and I would note that this changes the summation order, which matters if anyone expects bit-exact results between builds. Underneath all of that, data layout usually matters more than instruction selection, so I would store complex data as separate real and imaginary arrays rather than interleaved, and lay multi-channel data out channel-major for processing even though the converter delivers it sample-major. Only after all of that would I write intrinsics, because that code then has to be maintained for every architecture we ship on."
}
},

{
id: "dsp-memory",
track: "DSP",
sub: "Efficient implementation",
title: "Memory bandwidth: why the kernel is not compute bound",
mins: 22,
body: `
<p>Modern processors can perform arithmetic far faster than they can be supplied with data, so
most DSP kernels are limited by how much memory traffic they generate rather than by how many
operations they perform. Recognising which regime you are in changes what is worth optimising.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Arithmetic intensity deciding whether a kernel is limited by memory bandwidth or by compute throughput">
<rect class="bx" x="24" y="26" width="632" height="46" rx="4"/>
<text class="th" x="40" y="54">arithmetic intensity: operations performed per byte moved</text>

<rect class="bxa" x="24" y="86" width="308" height="96" rx="4"/>
<text class="th" x="40" y="112">low intensity</text>
<text class="ts" x="40" y="138">scale, add, copy, a short FIR</text>
<text class="ts" x="40" y="164">memory bound: vectorising gains nothing</text>

<rect class="bx" x="348" y="86" width="308" height="96" rx="4"/>
<text class="th" x="364" y="112">high intensity</text>
<text class="ts" x="364" y="138">long FIR, matrix work</text>
<text class="ts" x="364" y="164">compute bound: arithmetic matters</text>

<rect class="bx" x="24" y="196" width="632" height="36" rx="4"/>
<text class="ts" x="40" y="220">so the first question is which of the two you are looking at</text>
</svg>

<p>The useful quantity is <b>arithmetic intensity</b>: operations performed per byte moved from
memory. A kernel that reads a sample, multiplies it by a constant and writes it back does almost no
arithmetic per byte and will run at the speed of memory no matter how well the arithmetic is
optimised. A long convolution reuses each loaded sample many times and can genuinely be compute
bound.</p>

<p>The most effective transformation is therefore to increase reuse. <b>Fusing</b> stages that
would otherwise each stream the whole array through memory turns several passes into one, and on a
memory-bound chain that is close to a linear speed-up. A filter followed by a scale followed by a
detector should be one pass over the data, not three.</p>

<p><b>Blocking</b> is the same idea for larger structures: process a chunk that fits in cache
through all stages before moving on, rather than completing each stage over the whole array. For
two-dimensional work such as an image or a matrix of channels, processing in tiles rather than in
full rows is what keeps the working set resident.</p>

<p>Streaming has a second implication for <b>real-time</b> systems: the data usually arrives once
and is never needed again, so it displaces everything else from the cache as it passes. Non-temporal
stores, which write without polluting the cache, and prefetching a block ahead of use, are the two
mechanisms that address this, and both need measurement rather than assumption.</p>

<p>Choosing a <b>block size</b> is where the trades meet. Larger blocks amortise per-call overhead
and give the FFT its efficiency; smaller blocks reduce latency and keep the working set in cache.
The right answer is found by measurement, and it is usually a plateau rather than a peak, so
picking a size in the middle of the plateau is more robust than picking the maximum.</p>

<p>The diagnostic worth running early is simple: compute the bytes your kernel must move and divide
by the memory bandwidth available. If that time is close to what you measure, no amount of
arithmetic optimisation will help, and the work belongs in reducing traffic instead.</p>
`,
quiz: [
{ q: "What is arithmetic intensity?",
o: ["Operations per second", "Operations performed per byte moved from memory", "The ratio of multiplies to adds", "Cache hits per operation"],
a: 1, why: "It decides the regime: a low-intensity kernel runs at the speed of memory no matter how well its arithmetic is optimised." },
{ q: "Why fuse consecutive processing stages?",
o: ["It reduces the number of function calls", "It turns several streaming passes over the data into one", "It improves numerical accuracy", "It simplifies the code"],
a: 1, why: "On a memory-bound chain that is close to a linear speed-up, whereas optimising each stage separately achieves very little." },
{ q: "What is blocking?",
o: ["Waiting for data to arrive", "Processing a cache-sized chunk through all stages before moving on", "Splitting work across threads", "Buffering to fix a block size"],
a: 1, why: "For two-dimensional data, tiling rather than working in full rows is what keeps the working set resident in cache." },
{ q: "How do you tell quickly whether a kernel is memory bound?",
o: ["Count the instructions", "Divide the bytes it must move by the available bandwidth and compare with the measured time", "Check the vectorisation report", "Increase the block size and remeasure"],
a: 1, why: "If those are close, arithmetic optimisation cannot help and the work belongs in reducing traffic instead." }
],
interview: {
q: "You vectorised a signal processing chain and it barely got faster. Why?",
a: "Almost certainly because it was never compute bound in the first place, so I was optimising the part that was not the bottleneck. The quantity that decides this is arithmetic intensity, the number of operations performed per byte moved from memory. Modern processors do arithmetic far faster than memory can supply data, so a kernel that reads a sample, does a couple of operations and writes it back runs at the speed of memory and vectorising the arithmetic changes nothing at all. A long convolution, where each loaded sample gets reused across many taps, is genuinely compute bound and does respond. So the first thing I would do is compute the bytes the chain has to move and divide by the memory bandwidth I actually have, and compare that with the measured time. If they are close, the answer is to reduce traffic rather than to speed up arithmetic. The most effective change is usually fusing stages. If the chain filters, then scales, then runs a detector, and each stage streams the whole array through memory separately, that is three passes when it could be one, and fusing them is close to a linear speed-up on a memory-bound chain. For larger or two-dimensional work the same idea becomes blocking: take a chunk that fits in cache and push it through every stage before moving to the next chunk, and for images or channel matrices, tile rather than working in full rows so the working set stays resident. In a real-time system there is a further effect worth checking, which is that streaming data passes through once and never gets reused, so it evicts everything else as it goes. Non-temporal stores that write without polluting the cache, and prefetching a block ahead, both help, but I would measure rather than assume because they can go either way. And I would tune the block size by measurement, taking a value in the middle of the plateau rather than at the peak so it stays good when conditions change."
}
},

{
id: "dsp-fftimpl",
track: "DSP",
sub: "Efficient implementation",
title: "Inside the FFT: radix, real input and choosing a size",
mins: 22,
body: `
<p>The FFT is usually a library call, and treating it as a black box is right most of the time. The
exceptions, where a factor of two or four is available for very little work, come from knowing what
is inside it and what it assumes about your data.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A transform recursively split into even and odd halves, giving the log-linear cost, with size and input type deciding the practical speed">
<rect class="bx" x="24" y="26" width="632" height="42" rx="4"/>
<text class="th" x="40" y="52">split into even and odd samples, transform each, combine</text>
<rect class="bx" x="24" y="76" width="632" height="42" rx="4"/>
<text class="th" x="40" y="102">recursively: N squared becomes N log N</text>
<rect class="bxa" x="24" y="126" width="308" height="52" rx="4"/>
<text class="th" x="40" y="152">a power of two splits perfectly</text>
<rect class="bx" x="348" y="126" width="308" height="52" rx="4"/>
<text class="th" x="364" y="152">a large prime does not split at all</text>
<rect class="bx" x="24" y="188" width="632" height="44" rx="4"/>
<text class="ts" x="40" y="216">so a size one larger than a power of two can be far slower than one twice as big</text>
</svg>

<p>The algorithm works by splitting the transform into even and odd samples, transforming each half
and combining, recursively. That is where the reduction from quadratic to log-linear cost comes
from, and it is also why <b>size matters</b>: a power of two splits perfectly all the way down, while
a size with a large prime factor falls back to a much slower method for that factor. A transform of
size one thousand and thirty-one, a prime, can take longer than one of size two thousand and
forty-eight.</p>

<p>Since the input length is usually yours to choose, through zero padding, choosing a friendly size
is free performance. Powers of two are safest; products of small primes are usually nearly as
good.</p>

<p><b>Real input</b> is the most commonly missed saving. Physical signals are real, and the
transform of a real signal is conjugate symmetric, so half the output is redundant. A real-input
transform exploits this for roughly half the time and half the memory, and using a complex transform
on real data by setting the imaginary part to zero wastes both. The same applies in reverse for the
inverse transform when the result is known to be real.</p>

<p><b>Planning</b> is worth understanding because it explains a common measurement error. Good
libraries choose an algorithm for a given size at set-up time, sometimes by measuring alternatives,
and that cost is paid once. Creating a plan inside a loop, or timing the first call, produces
results that have nothing to do with steady-state performance.</p>

<p>Two properties of the output catch people out. The result is <b>scaled</b> by a convention that
varies between libraries, so a round trip may need dividing by the length or may not, and the only
safe approach is to verify with a known signal. And <b>in-place</b> transforms overwrite the input,
which is a genuine memory saving and a genuine bug if the input is needed afterwards.</p>

<p>Finally, the FFT is not always the right tool. Detecting a handful of known frequencies is
cheaper with a Goertzel-style filter. Filtering a long stream is cheaper with an overlap method that
reuses transformed coefficients. And a short filter is often faster applied directly than
transformed, because the transform's overhead exceeds the saving below a threshold worth measuring
on the target.</p>
`,
quiz: [
{ q: "Why can a transform of prime length be slower than a longer one?",
o: ["Primes need more memory", "It cannot be split recursively, so it falls back to a slower method", "Libraries do not support primes", "Rounding errors force extra passes"],
a: 1, why: "A power of two splits perfectly all the way down, which is why choosing a friendly length by zero padding is free performance." },
{ q: "What saving is available for real-valued input?",
o: ["None; the transform is the same", "About half the time and memory, since the output is conjugate symmetric", "A factor of four in memory only", "Higher numerical accuracy"],
a: 1, why: "Using a complex transform on real data by zeroing the imaginary part wastes both, and it is the most commonly missed saving." },
{ q: "Why does timing the first FFT call mislead?",
o: ["The cache is cold", "Planning, where the library selects an algorithm, is paid once at set-up", "The compiler has not optimised yet", "The input is not aligned"],
a: 1, why: "Creating a plan inside a loop is the corresponding bug, and it makes measurements bear no relation to steady-state performance." },
{ q: "When is an FFT the wrong tool?",
o: ["For long records", "For detecting a few known frequencies, or applying a very short filter", "For real-valued data", "For non-stationary signals"],
a: 1, why: "A Goertzel-style filter is cheaper for a handful of bins, and below a threshold worth measuring, direct convolution beats transforming." }
],
interview: {
q: "How would you speed up a chain that computes many FFTs?",
a: "I would start with the things that are nearly free and specific to the transform. First, the size, because the algorithm works by recursively splitting into even and odd halves, so a power of two splits perfectly all the way down while a size with a large prime factor falls back to a much slower method, and a transform of prime length can genuinely take longer than one twice as big. The length is usually mine to choose through zero padding, so picking a power of two or a product of small primes is free performance. Second, whether the input is real, because physical signals usually are and the transform of a real signal is conjugate symmetric, so a real-input transform gives roughly half the time and half the memory, and feeding real data to a complex transform with the imaginary part zeroed throws both away. The same applies on the inverse when I know the result is real. Third, planning: a good library selects an algorithm for a given size at set-up time, sometimes by measuring alternatives, and that cost is meant to be paid once. So I would create the plan once and reuse it, and I would make sure I am not timing the first call, because both of those produce numbers that have nothing to do with steady-state performance. Then I would step back and ask whether I need all these transforms at all. If I am detecting a handful of known frequencies, a Goertzel-style filter is cheaper than a full transform. If I am filtering a long stream, an overlap-add or overlap-save structure reuses the transformed filter coefficients rather than recomputing them. And if the filter is short, direct convolution can beat transforming entirely, with the crossover somewhere worth measuring on the actual target rather than assuming. Finally I would batch, because transforming many blocks in one call lets the library amortise overhead and use the memory hierarchy better than a loop of single calls."
}
},

{
id: "dsp-structures",
track: "DSP",
sub: "Efficient implementation",
title: "Filter structures and how they behave numerically",
mins: 22,
body: `
<p>A transfer function does not determine an implementation. The same filter can be realised in
several structures with identical behaviour in exact arithmetic and very different behaviour in
finite precision, and the choice is not a detail.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A high-order filter as a single direct form section against a cascade of second-order sections">
<rect class="bx" x="24" y="26" width="632" height="76" rx="4"/>
<text class="th" x="40" y="52">one high-order section</text>
<text class="ts" x="40" y="78">coefficients become extremely sensitive: a small error moves the poles a long way</text>

<rect class="bxa" x="24" y="118" width="632" height="76" rx="4"/>
<text class="th" x="40" y="144">cascade of second-order sections</text>
<text class="ts" x="40" y="170">each pole pair depends on two coefficients only, so sensitivity collapses</text>

<rect class="bx" x="24" y="206" width="632" height="34" rx="4"/>
<text class="ts" x="40" y="228">this is why filter design tools output biquads rather than one polynomial</text>
</svg>

<p>The dominant effect is <b>coefficient sensitivity</b>. In a single high-order section, every pole
depends on every coefficient, and the dependence grows sharply with order, so quantising the
coefficients can move poles far enough to change the response completely or make the filter
unstable. Splitting into <b>second-order sections</b> makes each pole pair depend on two
coefficients only, and the sensitivity problem largely disappears. This is why any filter above
second order should be implemented as a cascade of biquads.</p>

<p>Within a section, the <b>direct forms</b> differ in their internal behaviour. One arrangement
uses a single shared delay line, which is economical in memory. The <b>transposed</b> form has
different internal scaling and is usually better behaved numerically, which is why it is the common
default in libraries.</p>

<p><b>Ordering and scaling</b> the cascade is a real design step in fixed point. Sections should be
arranged so that no intermediate signal overflows while none is so small that it loses resolution,
which usually means putting the sections with the highest peak gain where the signal is smallest and
distributing gain through the chain rather than applying it all at one end.</p>

<p>Recursive structures in fixed point have failure modes with no equivalent in floating point.
<b>Limit cycles</b> are small self-sustaining oscillations that persist with zero input, caused by
rounding in the feedback path, and they are audible or visible as a noise floor that does not go
away when the input does. Adding a small dither, or rounding towards zero rather than to nearest,
suppresses them.</p>

<p><b>Overflow</b> in a recursive structure is far worse than in a feedforward one, because a
wrapped value is fed back and can drive a large sustained oscillation from a single transient.
Saturating arithmetic contains it, and is worth its cost precisely because the failure without it is
catastrophic rather than a brief glitch.</p>

<p>For very demanding cases there are structures specifically designed for low coefficient
sensitivity, derived from analogue ladder prototypes, which retain good behaviour with short
coefficient words. They are more complex, and the usual practical answer remains a well-scaled
cascade of transposed biquads with saturating arithmetic.</p>
`,
quiz: [
{ q: "Why implement a high-order filter as a cascade of biquads?",
o: ["It uses fewer multiplies", "Coefficient sensitivity collapses when each pole pair depends on only two coefficients", "It reduces group delay", "It allows real coefficients"],
a: 1, why: "In a single high-order section every pole depends on every coefficient, so quantisation can change the response entirely or destabilise it." },
{ q: "What is a limit cycle?",
o: ["Instability from a pole outside the unit circle", "A small self-sustaining oscillation caused by rounding in the feedback path", "Overflow in the accumulator", "Aliasing in a decimated filter"],
a: 1, why: "It persists with zero input and shows as a noise floor that does not disappear when the input does; dither or rounding towards zero suppresses it." },
{ q: "Why is overflow worse in a recursive filter than a feedforward one?",
o: ["It occurs more often", "A wrapped value is fed back and can drive a large sustained oscillation", "It cannot be detected", "The coefficients grow"],
a: 1, why: "Saturating arithmetic contains it, and is worth its cost because the alternative failure is catastrophic rather than a brief glitch." },
{ q: "What guides the ordering and scaling of a fixed-point cascade?",
o: ["Putting the sharpest section first", "Ensuring no intermediate overflows while none loses resolution", "Minimising total gain", "Matching the group delay of each section"],
a: 1, why: "That usually means distributing gain through the chain rather than applying it all at one end." }
],
interview: {
q: "You have a tenth-order IIR design. How do you implement it?",
a: "As a cascade of five second-order sections, not as a single tenth-order difference equation, and the reason is coefficient sensitivity rather than convenience. In a single high-order section every pole depends on every coefficient and that dependence grows sharply with order, so quantising the coefficients to a finite word length can move the poles far enough to change the response completely or push one outside the unit circle and make the filter unstable. Split into biquads, each pole pair depends on two coefficients only, and the sensitivity problem essentially goes away. That is why every filter design tool outputs biquad sections rather than one polynomial. Within each section I would use the transposed direct form, because its internal scaling behaves better numerically and it is the usual default in libraries for that reason. If this is fixed point, then ordering and scaling the cascade is a real design step rather than an afterthought: I want to arrange the sections and distribute gain so that no intermediate signal overflows and none is so small that it loses resolution, which generally means not applying all the gain at one end and putting the high peak gain sections where the signal is small. I would use saturating arithmetic throughout, because overflow in a recursive structure is far worse than in an FIR, since a wrapped value gets fed back and a single transient can drive a large sustained oscillation rather than a brief glitch. I would also watch for limit cycles, which are small self-sustaining oscillations caused by rounding in the feedback path that persist even with zero input, and show up as a noise floor that does not go away when the signal stops. Adding a small dither or rounding towards zero rather than to nearest suppresses them. And I would verify the implemented filter's response against the design, over the actual coefficient word length, rather than trusting the design tool's ideal plot."
}
},

{
id: "dsp-accel",
track: "DSP",
sub: "Efficient implementation",
title: "Offloading: DSP cores, GPUs and fixed-function blocks",
mins: 22,
body: `
<p>When a processor cannot keep up, the options are a different kind of processor or dedicated
hardware. Each choice has a shape of problem it suits, and the decision usually turns on data
movement and latency rather than on raw throughput figures.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Four targets compared: general CPU, DSP core, GPU and fixed-function hardware, differing in flexibility, throughput and latency">
<rect class="bx" x="24" y="26" width="156" height="120" rx="4"/>
<text class="th" x="40" y="52">CPU</text>
<text class="ts" x="40" y="80">flexible</text>
<text class="ts" x="40" y="104">lowest effort</text>
<text class="ts" x="40" y="130">modest throughput</text>

<rect class="bx" x="192" y="26" width="156" height="120" rx="4"/>
<text class="th" x="208" y="52">DSP core</text>
<text class="ts" x="208" y="80">good per watt</text>
<text class="ts" x="208" y="104">low latency</text>
<text class="ts" x="208" y="130">its own toolchain</text>

<rect class="bx" x="360" y="26" width="156" height="120" rx="4"/>
<text class="th" x="376" y="52">GPU</text>
<text class="ts" x="376" y="80">huge throughput</text>
<text class="ts" x="376" y="104">high latency</text>
<text class="ts" x="376" y="130">needs big batches</text>

<rect class="bxa" x="528" y="26" width="128" height="120" rx="4"/>
<text class="th" x="544" y="52">fixed</text>
<text class="ts" x="544" y="80">best per watt</text>
<text class="ts" x="544" y="104">lowest latency</text>
<text class="ts" x="544" y="130">not changeable</text>

<rect class="bx" x="24" y="162" width="632" height="68" rx="4"/>
<text class="th" x="40" y="190">the deciding question is usually the data movement, not the computation</text>
<text class="ts" x="40" y="214">a transfer that costs more than the work it enables is a common and expensive mistake</text>
</svg>

<p>A <b>DSP core</b> suits sustained streaming work at low power: hardware loops, multiply
accumulate with wide accumulators, and addressing modes that make filters and transforms efficient.
It has predictable timing, which matters for real-time, and it costs a separate toolchain, a
separate debugging story and a communication mechanism with the main processor.</p>

<p>A <b>GPU</b> suits large batches of independent work: many channels, many blocks, or large
images. Its throughput is enormous and its latency is poor, so it is excellent for offline or
high-throughput processing and poor for a single small block that must be finished in
microseconds.</p>

<p><b>Fixed-function</b> hardware, in an FPGA or as an accelerator in an SoC, gives the best
efficiency and the lowest latency, at the cost of flexibility. The right candidates are stable,
well-understood operations that will not change: a filter chain, an FFT, a decimator, a
demodulator.</p>

<p>The decision that actually determines the outcome is <b>data movement</b>. Transferring a block
to an accelerator and back can cost more than computing it in place, so the useful question is
whether enough work happens per byte transferred to justify the trip. Chains of small offloaded
operations, each moving data across, are the classic way to make a system slower with an
accelerator than without one.</p>

<p><b>Latency</b> is the other constraint, and it is separate from throughput. A pipeline of
transfer, compute and transfer back has a latency floor that batching makes worse, so a system that
must respond within a fixed time may be unable to use a high-throughput device at all.</p>

<p>The sensible order of work is to optimise the existing implementation first, since a well-written
vectorised kernel often removes the need entirely; then move the largest, most self-contained piece
with the highest arithmetic intensity; then keep the reference implementation and check both give
the same answer, since accelerators differ in precision and rounding and a mismatch discovered later
is expensive to diagnose.</p>
`,
quiz: [
{ q: "What does a GPU suit?",
o: ["A single small block with a microsecond deadline", "Large batches of independent work such as many channels or images", "Low-power streaming in a battery device", "Operations that change frequently"],
a: 1, why: "Its throughput is enormous and its latency is poor, which makes it excellent offline and poor for tight real-time deadlines." },
{ q: "What usually decides whether offloading helps?",
o: ["The accelerator's peak throughput", "Whether enough work happens per byte transferred to justify the trip", "The programming language available", "The precision supported"],
a: 1, why: "Chains of small offloaded operations, each moving data across, are the classic way to make a system slower with an accelerator than without." },
{ q: "What suits fixed-function hardware?",
o: ["Algorithms still under development", "Stable, well-understood operations such as a filter chain or an FFT", "Anything with large batches", "Work with irregular control flow"],
a: 1, why: "It gives the best efficiency and lowest latency, and the cost is that it cannot be changed once committed." },
{ q: "Why keep the original implementation after offloading?",
o: ["To fall back if the accelerator fails", "Accelerators differ in precision and rounding, so both must be checked to agree", "It is required for certification", "To measure the speed-up"],
a: 1, why: "A numerical mismatch discovered long after the change is expensive to diagnose, whereas a running comparison catches it immediately." }
],
interview: {
q: "Your processing cannot keep up in real time. How do you decide what to offload and where?",
a: "First I would make sure offloading is actually necessary, because a well-vectorised kernel using a good library often removes the need entirely, and that is far cheaper than introducing a second toolchain and a transfer mechanism. Assuming it is necessary, the choice of target follows the shape of the problem. A DSP core suits sustained streaming at low power, with hardware loops, wide accumulators and predictable timing, which is what I want for a battery-powered device with a real-time deadline. A GPU suits large batches of independent work, many channels or many blocks at once, because its throughput is enormous but its latency is poor, so it is excellent for offline or high-throughput processing and unusable for a single small block that has to finish in microseconds. Fixed-function hardware, in an FPGA or an SoC accelerator, gives the best efficiency and the lowest latency but no flexibility, so it suits stable, well-understood operations like a filter chain, an FFT or a demodulator that I am confident will not change. The thing that usually determines whether any of this works is data movement rather than computation. Transferring a block across and back can cost more than doing the work in place, so the right question is how much arithmetic happens per byte transferred, and a chain of small offloaded operations each shuttling data across is the classic way to end up slower with an accelerator than without. So I would offload one large, self-contained stage with high arithmetic intensity rather than several small ones, and I would look at whether the data can stay on the accelerator across stages. I would also check latency separately from throughput, because the transfer-compute-transfer pipeline has a floor that batching makes worse, and a hard deadline can rule out a high-throughput device entirely. And I would keep the original implementation and run both against the same data, because accelerators differ in precision and rounding, and finding that out months later is expensive."
}
},

{
id: "dsp-verify",
track: "DSP",
sub: "Efficient implementation",
title: "Verifying an implementation against a reference",
mins: 22,
body: `
<p>An optimised implementation is a new opportunity to be wrong, and the errors are quiet: an
off-by-one in a filter delay, a window applied twice, a scaling convention misread. The discipline
that catches these is to keep a reference and compare against it continuously rather than to inspect
the output and decide it looks reasonable.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A reference model and an optimised implementation fed the same inputs, their outputs compared against a stated tolerance">
<rect class="bx" x="24" y="26" width="196" height="60" rx="4"/>
<text class="th" x="40" y="52">test signals</text>
<text class="ts" x="40" y="74">impulse, step, tones, noise</text>

<rect class="bx" x="236" y="20" width="196" height="46" rx="4"/>
<text class="ts" x="252" y="48">reference model</text>
<rect class="bx" x="236" y="76" width="196" height="46" rx="4"/>
<text class="ts" x="252" y="104">optimised version</text>

<rect class="bxa" x="448" y="20" width="208" height="102" rx="4"/>
<text class="th" x="464" y="48">compare</text>
<text class="ts" x="464" y="76">against a tolerance</text>
<text class="ts" x="464" y="100">you decided in advance</text>

<rect class="bx" x="24" y="142" width="632" height="88" rx="4"/>
<text class="th" x="40" y="168">the reference is the specification</text>
<text class="ts" x="40" y="196">so it is written for clarity, kept in the repository, and never optimised</text>
<text class="ts" x="40" y="220">a difference is then a fact rather than a matter of opinion</text>
</svg>

<p>The <b>reference</b> is a straightforward implementation written for clarity rather than speed,
in whatever language makes it easiest to read, and it is the definition of correct. It is worth
keeping in the repository and running in the test suite, because the moment it exists, any
disagreement becomes a fact rather than a judgement.</p>

<p>The <b>test signals</b> should be chosen to isolate different failures. An impulse gives the
impulse response and exposes delay and gain errors immediately. A step exposes transient and
initialisation problems. Single tones at several frequencies check the response. Noise exercises
everything at once. And the boundaries, zeros, full scale, the first and last block, are where
implementations actually break.</p>

<p>The <b>tolerance</b> has to be decided rather than discovered. Bit-exactness is achievable in
fixed point and worth demanding there, because a difference then always means a bug. In floating
point it is not, since reassociating a sum changes the result, so the criterion should be a relative
error bound with a stated absolute floor for values near zero, chosen from what the application
needs.</p>

<p>Some failures hide from a simple comparison and deserve their own checks. <b>Block boundary</b>
errors appear only when the same data is processed in a different block size, so running the same
input at several block sizes and requiring identical output is a strong test. <b>State</b> errors
appear on the second call, so processing a long signal in one call and in many should agree.
<b>Numerical</b> problems appear only with awkward inputs: very small values, very large ones, and
long runs that let error accumulate.</p>

<p>For fixed-point conversion specifically, comparing against the floating-point reference gives the
quantisation error directly, and the useful summary is the worst case rather than the average,
because a filter that is accurate on average and clips on a peak is not acceptable.</p>

<p>The habit that pays over a project is to make the comparison automatic and part of the build.
Optimisation then becomes safe, because any change that breaks the numerics is reported immediately
rather than surfacing weeks later as a strange result nobody can attribute.</p>
`,
quiz: [
{ q: "What is the purpose of a reference implementation?",
o: ["To run when the optimised version fails", "To be the definition of correct, written for clarity and never optimised", "To generate test vectors", "To estimate performance"],
a: 1, why: "Once it exists, any disagreement becomes a fact rather than a matter of opinion about whether the output looks reasonable." },
{ q: "Why require identical output at several block sizes?",
o: ["It measures throughput", "Block boundary errors appear only when the same data is split differently", "It tests memory alignment", "It exercises the cache"],
a: 1, why: "State errors are the related case, caught by requiring one long call and many short calls to agree." },
{ q: "What tolerance is appropriate in floating point?",
o: ["Bit-exactness, as in fixed point", "A relative error bound with a stated absolute floor near zero", "Any difference below one least significant bit", "Whatever the current implementation achieves"],
a: 1, why: "Reassociating a sum changes the result, so bit-exactness is not achievable, and the bound should come from what the application needs." },
{ q: "When comparing a fixed-point port against floating point, what matters most?",
o: ["The average error", "The worst-case error", "The mean squared error", "The error at DC"],
a: 1, why: "A filter that is accurate on average and clips on a peak is not acceptable, so the summary has to be the worst case." }
],
interview: {
q: "How do you make sure an optimised DSP implementation still computes the right thing?",
a: "By keeping a reference implementation and comparing against it automatically, rather than by looking at the output and deciding it seems reasonable. The reference is a straightforward version written for clarity rather than speed, in whatever language makes it easiest to read, and it is the definition of correct: it lives in the repository, it runs in the test suite, and it never gets optimised. The moment it exists, a disagreement is a fact instead of a judgement. For test signals I would use a set chosen to isolate different failures rather than just realistic data. An impulse gives me the impulse response directly and exposes delay and gain errors immediately, which catches the off-by-one that is otherwise invisible. A step exposes transient and initialisation problems. Tones at several frequencies check the response. Noise exercises everything at once. And I would deliberately include the boundary cases, zeros, full scale, the first and last block, because that is where implementations actually break. The tolerance has to be decided in advance rather than discovered afterwards. In fixed point I would demand bit-exactness, because it is achievable and it means any difference is a bug. In floating point it is not achievable, since reassociating a sum changes the result and that is exactly what vectorisation does, so I would set a relative error bound with an absolute floor for values near zero, chosen from what the application needs. Some failures hide from a plain comparison so they get their own tests. Processing the same input at several block sizes and requiring identical output catches block boundary errors. Processing a long signal in one call and in many calls and requiring agreement catches state handling. And for a fixed-point port specifically, comparing against the floating-point reference gives me the quantisation error directly, where the number that matters is the worst case, not the average, because a filter that is accurate on average and clips on a peak is not acceptable."
}
}

);
