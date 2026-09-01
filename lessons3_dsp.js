// DSP lessons, second course: implementation and algorithms.
//
// These carry a `sub` so the page groups them under a heading, in the same way
// the Embedded C track is organised.

LESSONS.push(

{
id: "dsp-goertzel",
track: "DSP",
sub: "Implementation and algorithms",
title: "Goertzel: detecting one frequency without an FFT",
mins: 18,
body: `
<p>Sometimes you do not want a spectrum. You want to know how much energy sits at one known
frequency, or at eight of them, and an FFT computes hundreds of bins you will throw away.</p>

<p>The Goertzel algorithm evaluates a single DFT bin using a second-order recursive filter. You
run one multiply and two adds per input sample, and at the end of the block you do a small
amount of arithmetic to extract magnitude or magnitude squared. There is no buffer of complex
twiddle factors and no transform.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Cost comparison between an FFT computing every bin and Goertzel computing only the bins of interest">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">FFT of N points</text>
<rect class="bx" x="24" y="72" width="308" height="150" rx="4"/>
<text class="ts" x="40" y="98">computes all N bins</text>
<text class="ts" x="40" y="122">order N log N operations</text>
<text class="ts" x="40" y="146">needs the whole block stored</text>
<text class="th" x="40" y="182">right answer when you</text>
<text class="th" x="40" y="202">want many bins</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">Goertzel, K bins</text>
<rect class="bx" x="348" y="72" width="308" height="150" rx="4"/>
<text class="ts" x="364" y="98">computes only the K you ask for</text>
<text class="ts" x="364" y="122">order K N operations</text>
<text class="ts" x="364" y="146">runs sample by sample, no buffer</text>
<text class="th" x="364" y="182">wins while K is below</text>
<text class="th" x="364" y="202">about log N</text>
</svg>

<p>The crossover is roughly when the number of bins you want falls below the logarithm of the
transform length. For eight tones in a thousand-point block, Goertzel is far cheaper. For
sixty-four bins it is not, and you should transform.</p>

<p>The classic application is DTMF decoding, where you are looking for two tones from a set of
eight. It is equally at home detecting a pilot tone, measuring the amplitude at a stimulus
frequency in an impedance measurement, or watching one line frequency for interference.</p>

<p>Two practical points. The bin frequency should be an integer number of cycles in the block,
because Goertzel is a DFT bin and inherits the same leakage behaviour: a tone between bins
reads low and spreads. And the recursion has a pole on the unit circle, so in fixed point the
intermediate values grow through the block and the scaling has to be planned rather than
discovered.</p>

<p>If you only need magnitude, computing the squared magnitude avoids a square root and avoids
the final complex arithmetic entirely, which on a small processor is most of the remaining
cost.</p>
`,
quiz: [
{ q: "What does the Goertzel algorithm compute?",
o: ["A complete spectrum more cheaply than an FFT", "A single DFT bin using a second-order recursion", "The autocorrelation of the input block", "A sliding average of the input power"],
a: 1, why: "One multiply and two adds per sample, with a small amount of arithmetic at the end of the block. No transform and no twiddle factors." },
{ q: "When does Goertzel stop being cheaper than an FFT?",
o: ["Above about a thousand input samples", "When the number of bins wanted approaches log N", "When the tones are not harmonically related", "When the input is real rather than complex"],
a: 1, why: "The cost is order K times N against N log N, so it wins while K stays small. For eight tones in a thousand points it wins easily; for sixty-four bins it does not." },
{ q: "Why should the target frequency be an integer number of cycles in the block?",
o: ["The recursion becomes unstable otherwise", "It is a DFT bin, so a tone between bins leaks and reads low", "The algorithm cannot represent fractional frequencies", "It would require a longer block to converge"],
a: 1, why: "Goertzel inherits the DFT's leakage behaviour exactly, because it is computing a DFT bin by another route." },
{ q: "What is the fixed-point hazard in a Goertzel recursion?",
o: ["The output saturates at the first sample", "The pole is on the unit circle, so intermediates grow through the block", "The coefficient cannot be represented in Q15", "Rounding causes a limit cycle at the output"],
a: 1, why: "Nothing decays, so the state grows with block length and the scaling has to be planned in advance rather than discovered on hardware." }
],
interview: {
q: "You need to detect eight specific tones on a small microcontroller. How would you do it?",
a: "I would use Goertzel rather than an FFT. Goertzel evaluates a single DFT bin with a second-order recursion, so it is one multiply and two adds per input sample per tone, and at the end of the block a small amount of arithmetic to get the magnitude. For eight tones that is eight cheap recursions rather than a full transform of which I would discard almost every bin. The rough crossover is when the number of bins you want approaches the logarithm of the transform length, so eight tones in a block of a thousand is comfortably on the Goertzel side, and if I wanted sixty-four bins I would transform instead. It also runs sample by sample, so I do not need to buffer the whole block before I start, which matters when RAM is the constraint. Two things I would be careful about. The target frequencies should sit an integer number of cycles in the block, because Goertzel is computing a DFT bin and inherits exactly the same leakage behaviour, so a tone between bins reads low and spreads into its neighbours. And in fixed point the recursion has a pole on the unit circle, so nothing decays and the intermediate state grows through the block; I would work out the worst-case growth from the block length up front rather than discover it as an overflow on hardware. If I only need magnitude I would compute magnitude squared and skip the square root, which removes most of what is left of the cost."
}
},

{
id: "dsp-cordic",
track: "DSP",
sub: "Implementation and algorithms",
title: "CORDIC: trigonometry with shifts and adds",
mins: 20,
body: `
<p>CORDIC computes sines, cosines, magnitudes, phases and several other functions using only
shifts, adds and a small table. No multiplier is needed, which is why it appears inside FPGAs,
in early calculators, and anywhere a multiplier is scarce or the function is awkward.</p>

<p>The idea is to rotate a vector towards a target angle by a fixed sequence of ever-smaller
rotations, choosing at each step whether to rotate clockwise or anticlockwise. The angles are
chosen so that each rotation is a shift rather than a multiply, and the accumulated scale factor
is a known constant you correct for once at the end.</p>

<svg class="fig" viewBox="0 0 680 260" role="img" aria-label="A vector converging on a target angle through a sequence of decreasing rotations, each a shift">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">each step: rotate by arctan of 2 to the minus i, sign chosen by the residual angle</text>

<line class="ln" x1="80" y1="220" x2="620" y2="220"/>
<line class="ln" x1="80" y1="220" x2="80" y2="80"/>

<line class="ln" x1="80" y1="220" x2="560" y2="100"/>
<text class="th" x="500" y="90">target</text>

<line class="ln" x1="80" y1="220" x2="560" y2="220"/>
<text class="ts" x="300" y="240">step 0: 45 degrees</text>
<line class="ln" x1="80" y1="220" x2="500" y2="140"/>
<text class="ts" x="330" y="170">step 1: 26.6 degrees</text>
<line class="ln" x1="80" y1="220" x2="540" y2="112"/>
<text class="ts" x="360" y="132">step 2: 14.0 degrees</text>

<text class="ts" x="80" y="70">one bit of accuracy per iteration</text>
</svg>

<p>Two modes cover most uses. In <b>rotation</b> mode you drive the residual angle to zero, and
the vector's final coordinates are the cosine and sine of the angle you asked for. In
<b>vectoring</b> mode you drive the y component to zero, and what falls out is the magnitude of
the original vector and its phase. That second mode is a rectangular-to-polar conversion, which
is exactly what you want for an envelope and an instantaneous phase.</p>

<p>The cost is one iteration per bit of accuracy. Sixteen bits means sixteen iterations, each a
shift, an add and a table lookup, so it is a genuinely cheap fixed-point operation but not a
free one. In an FPGA the iterations pipeline beautifully, giving one result per clock after the
latency.</p>

<p>The practical details are the ones that catch people. The gain of about 1.647 must be
corrected, usually by pre-scaling the input. The algorithm converges only within roughly plus
or minus 99 degrees, so arguments outside that need a quadrant fold first. And the angle table
is in the algorithm's own units, so a units mistake gives a result that looks plausible and is
wrong by a scale factor.</p>
`,
quiz: [
{ q: "What operations does CORDIC need?",
o: ["A hardware multiplier and a divider", "Shifts, adds and a small table of angles", "A lookup table of sines and cosines", "Floating-point arithmetic"],
a: 1, why: "That is why it appears in FPGAs and in any design where a multiplier is scarce. Each rotation is a shift rather than a multiply by construction." },
{ q: "What does CORDIC's vectoring mode produce?",
o: ["The sine and cosine of a given angle", "The magnitude and phase of an input vector", "The product of two input values", "The logarithm of the input"],
a: 1, why: "Driving the y component to zero performs a rectangular-to-polar conversion, which is exactly what an envelope and instantaneous phase need." },
{ q: "How many iterations does CORDIC need?",
o: ["A fixed eight, regardless of precision", "About one per bit of accuracy", "One per octave of input range", "It converges when the residual is small enough"],
a: 1, why: "Sixteen bits means sixteen shift-and-add iterations. In an FPGA they pipeline, so throughput is one result per clock after the latency." },
{ q: "Why must the CORDIC gain be corrected?",
o: ["The rotations are not exactly the angles claimed", "Each pseudo-rotation also scales the vector", "The angle table is stored at reduced precision", "Fixed-point rounding accumulates over the iterations"],
a: 1, why: "The scale factor of about 1.647 is a known constant, so it is usually removed by pre-scaling the input once rather than at the end." }
],
interview: {
q: "You need magnitude and phase of a complex signal on an FPGA with no spare multipliers. What would you use?",
a: "CORDIC in vectoring mode. It computes magnitude and phase using only shifts, adds and a small table of arctangent constants, so it needs no multiplier at all, which is exactly the constraint. The algorithm rotates the input vector towards the real axis by a fixed sequence of ever-decreasing angles, choosing the direction at each step from the sign of the current y component, and because the angles are chosen as arctangent of powers of two, each rotation is a shift rather than a multiply. When y has been driven to zero the x coordinate is the magnitude and the accumulated angle is the phase. The cost is roughly one iteration per bit of accuracy, so sixteen bits is sixteen stages, and in fabric those pipeline very naturally, giving one result per clock after the pipeline latency, which is usually what a streaming design wants. The details I would get right are the gain, because each pseudo-rotation also scales the vector by a known constant of about 1.647 which I would remove by pre-scaling the input; the convergence range, which is only about plus or minus ninety-nine degrees so I need a quadrant fold in front of it; and the units of the angle table, because a mistake there gives a result that looks entirely plausible and is wrong by a scale factor. If I did have a multiplier to spare and only needed a rough magnitude, the alpha-max-plus-beta-min approximation is a single comparison and two multiplies and gets within a few percent, which is often enough."
}
},

{
id: "dsp-farrow",
track: "DSP",
sub: "Implementation and algorithms",
title: "Arbitrary resampling: fractional delay and the Farrow structure",
mins: 20,
body: `
<p>Rational resampling, 48 kHz to 44.1 kHz, is a fixed ratio you can implement with a polyphase
filter. Arbitrary resampling is different: the ratio is not a nice fraction, or it drifts,
because two systems have independent crystals. Now you need a sample at an instant that moves
continuously between the ones you have.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Input samples at fixed spacing with an output instant falling between them, defined by a fractional delay mu">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">the output instant falls between input samples</text>

<line class="ln" x1="60" y1="170" x2="640" y2="170"/>
<circle class="dot" cx="120" cy="170" r="6"/>
<circle class="dot" cx="240" cy="170" r="6"/>
<circle class="dot" cx="360" cy="170" r="6"/>
<circle class="dot" cx="480" cy="170" r="6"/>
<circle class="dot" cx="600" cy="170" r="6"/>
<text class="ts" x="108" y="196">n-1</text>
<text class="ts" x="232" y="196">n</text>
<text class="ts" x="348" y="196">n+1</text>
<text class="ts" x="468" y="196">n+2</text>

<line class="ln" x1="300" y1="100" x2="300" y2="170"/>
<text class="th" x="270" y="92">wanted here</text>
<text class="ts" x="248" y="222">mu is the fraction between n and n+1</text>
</svg>

<p>The naive answer is linear interpolation, which is a triangular kernel and therefore a sinc
squared in frequency: it attenuates the top of the band noticeably and it does not reject the
images well. Fine for a slow control signal, poor for audio or for a measurement.</p>

<p>The proper answer is a <b>fractional delay filter</b>: a short filter whose coefficients
depend on the fractional part of the delay. Recomputing the coefficients for every output
sample is expensive, which is what the <b>Farrow structure</b> solves. It expresses each
coefficient as a polynomial in the fractional delay, so the filter becomes a small set of fixed
sub-filters whose outputs are combined by a Horner evaluation in the fraction. The fraction can
then change every sample at almost no cost.</p>

<p>This is the machinery behind an asynchronous sample rate converter, and behind the timing
recovery loop in a receiver: a loop measures the timing error, and a Farrow interpolator moves
the sampling instant continuously to track it.</p>

<p>Two design points decide the quality. The <b>polynomial order</b> sets how well the
interpolation holds up towards Nyquist, so cubic is common and higher orders buy bandwidth. And
the signal must be adequately oversampled, because interpolation cannot recover content that is
close to Nyquist. If you need the top of the band, oversample first and interpolate second.</p>
`,
quiz: [
{ q: "What problem does arbitrary resampling solve that polyphase does not?",
o: ["A ratio that is not fixed, because the clocks are independent", "A ratio larger than ten to one", "Resampling of complex rather than real signals", "Resampling without any filtering"],
a: 1, why: "A fixed rational ratio can be built as a polyphase filter. Independent crystals drift, so the required instant moves continuously." },
{ q: "What does the Farrow structure avoid?",
o: ["Storing the input samples at all", "Recomputing filter coefficients for every output sample", "The need for any interpolation filter", "Aliasing when the rate is reduced"],
a: 1, why: "Each coefficient becomes a polynomial in the fractional delay, so the filter is a fixed set of sub-filters combined by a Horner evaluation in the fraction." },
{ q: "Why is linear interpolation a poor resampler for audio?",
o: ["It cannot handle a fractional delay", "Its triangular kernel gives a sinc squared response that droops", "It requires the ratio to be rational", "It introduces a variable group delay"],
a: 1, why: "It attenuates the top of the band noticeably and rejects the images poorly. It is adequate for a slow control signal and not for a measurement." },
{ q: "What must be true of the signal for interpolation to work well?",
o: ["It must be periodic", "It must be adequately oversampled", "It must be real valued", "It must have zero mean"],
a: 1, why: "Interpolation cannot recover content close to Nyquist. If the top of the band matters, oversample first and interpolate afterwards." }
],
interview: {
q: "Two boards sample at nominally the same rate from independent crystals. How do you get their data onto a common time base?",
a: "The rates are nominally equal and actually differ by tens of parts per million, and the offset drifts with temperature, so this is an arbitrary resampling problem rather than a fixed-ratio one. I would measure the relative rate rather than assume it, ideally from timestamps taken against a shared clock or from a known event both boards see, and then run a slow loop that estimates the drift. That loop produces a fractional delay that changes continuously, and the resampler has to be able to take a new fraction every output sample. That is what the Farrow structure is for: it expresses each interpolation coefficient as a polynomial in the fractional delay, so the filter becomes a small bank of fixed sub-filters whose outputs are combined by a Horner evaluation in the fraction, and changing the fraction every sample costs almost nothing. A cubic Farrow interpolator is the usual starting point and holds up well provided the signal is reasonably oversampled. That last part is the constraint I would check first, because interpolation cannot recover content sitting close to Nyquist, so if the signal occupies most of the band I would oversample before interpolating rather than accept the droop. I would avoid plain linear interpolation for anything I intended to measure, because its triangular kernel gives a sinc squared response that visibly attenuates the top of the band and rejects the images poorly."
}
},

{
id: "dsp-blockfft",
track: "DSP",
sub: "Implementation and algorithms",
title: "Fast convolution in a stream: overlap-add and overlap-save",
mins: 20,
body: `
<p>Multiplying spectra is far cheaper than convolving long sequences, but a transform is finite
and a stream is not. Cutting the stream into blocks introduces two problems: the transform's
implied periodicity wraps the tail of each convolution onto its own start, and the blocks have
to be rejoined without a seam.</p>

<svg class="fig" viewBox="0 0 680 270" role="img" aria-label="Overlap-add zero pads each block and sums the overlapping tails, while overlap-save overlaps the input and discards the wrapped region">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">overlap-add</text>
<rect class="bx" x="24" y="72" width="308" height="176" rx="4"/>
<text class="ts" x="40" y="98">input cut into blocks, no overlap</text>
<text class="ts" x="40" y="122">each block zero padded</text>
<text class="ts" x="40" y="146">result is longer than the block</text>
<text class="ts" x="40" y="176">the tails are SUMMED into</text>
<text class="ts" x="40" y="196">the start of the next output</text>
<text class="ts" x="40" y="228">needs an accumulator across blocks</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">overlap-save</text>
<rect class="bx" x="348" y="72" width="308" height="176" rx="4"/>
<text class="ts" x="364" y="98">input blocks OVERLAP</text>
<text class="ts" x="364" y="122">no zero padding</text>
<text class="ts" x="364" y="146">the first samples of each result</text>
<text class="ts" x="364" y="176">are wrapped and are DISCARDED</text>
<text class="ts" x="364" y="206">the rest is output directly</text>
<text class="ts" x="364" y="228">no accumulator needed</text>
</svg>

<p><b>Overlap-add</b> cuts the input into non-overlapping blocks and zero pads each to the
transform length. The convolution of a block with an M-tap filter is longer than the block by
M minus one samples, and those extra samples are added into the beginning of the next block's
output. It needs a small accumulator carried across blocks.</p>

<p><b>Overlap-save</b> takes overlapping input blocks and does not pad. The first M minus one
output samples of each block are corrupted by the circular wrap, so they are simply thrown
away and the rest is emitted. No accumulator is needed, which makes it slightly simpler in
hardware and the usual choice in a streaming implementation.</p>

<p>Choosing the transform length is the real design decision. It must be at least the block
length plus the filter length minus one, and a power of two is preferred. Longer transforms
amortise the per-block cost over more samples, so the cost per sample falls, but the latency is
a whole block. That trade, throughput against latency, is the one you actually negotiate.</p>

<p>The crossover against direct convolution is worth measuring rather than assuming. For
filters below roughly thirty to sixty taps, direct convolution usually wins because the
transform overhead dominates. Above a few hundred taps, fast convolution wins by an enormous
margin.</p>

<p>Where the latency of a whole block is unacceptable, <b>partitioned</b> convolution splits
the filter into segments: the first segment is applied directly for a short latency and the
later ones by transform, which is how a long reverberation impulse response is convolved in
real time.</p>
`,
quiz: [
{ q: "Why does block-based fast convolution need special handling at the boundaries?",
o: ["The transform is finite, so the convolution wraps circularly", "The filter coefficients change between blocks", "Floating point error accumulates across blocks", "The blocks arrive at irregular intervals"],
a: 1, why: "A finite transform implies a periodic sequence, so the tail of the convolution folds onto its own start. Both methods exist to deal with exactly that." },
{ q: "What distinguishes overlap-save from overlap-add?",
o: ["It discards the wrapped samples instead of summing tails", "It uses a shorter transform for the same filter", "It only works with symmetric filters", "It requires the input to be zero padded"],
a: 1, why: "No accumulator is carried between blocks, which makes it slightly simpler in hardware and the usual streaming choice." },
{ q: "What does a longer transform buy, and what does it cost?",
o: ["Lower cost per sample, at the price of a whole block of latency", "Better frequency resolution, at the price of memory", "Lower latency, at the price of more computation", "Better stopband rejection, at the price of throughput"],
a: 1, why: "Fixed per-block costs are amortised over more samples. The latency is a block, which is what usually binds in an interactive or control path." },
{ q: "When does direct convolution still beat the transform approach?",
o: ["When the filter is short, a few tens of taps", "When the input is very long", "When the filter coefficients are symmetric", "When the sample rate is high"],
a: 1, why: "Below roughly thirty to sixty taps the transform overhead dominates. The crossover depends on the platform and is worth measuring rather than assuming." }
],
interview: {
q: "You need to convolve a stream with a two thousand tap filter in real time. How would you implement it?",
a: "Two thousand taps is far past the point where direct convolution makes sense, so I would use fast convolution in the frequency domain, and specifically overlap-save because it needs no accumulator carried between blocks and is a little simpler to get right. The mechanics are that I take overlapping input blocks, transform, multiply by the pre-transformed filter, inverse transform, and discard the first filter-length-minus-one samples of each result because those are corrupted by the circular wrap that a finite transform implies. The main design decision is the transform length. It has to be at least the block length plus the filter length minus one, and I would use a power of two. Making it longer amortises the fixed per-block cost over more samples so the cost per sample falls, but the latency is a whole block, and that trade between throughput and latency is the thing I would actually negotiate with whoever owns the requirement. If the block latency turned out to be unacceptable, which it often is in an audio or a control path, I would use partitioned convolution instead: apply the first part of the impulse response directly for a short latency and the later partitions by transform, which is how long reverberation responses are done in real time. I would also confirm the crossover by measuring rather than assuming, because on a given platform with a good direct implementation the break-even can be higher than the textbook figure."
}
},

{
id: "dsp-tf",
track: "DSP",
sub: "Implementation and algorithms",
title: "Time-frequency: the short-time transform and its limits",
mins: 20,
body: `
<p>A spectrum tells you what frequencies are present. It does not tell you when, and for a
signal whose content changes, that is the question you actually have.</p>

<p>The short-time Fourier transform answers it by cutting the signal into overlapping windows
and transforming each. What you get is a spectrogram: frequency against time. What you cannot
get is arbitrary resolution in both, because the window length sets them in opposition.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A short window giving good time resolution and poor frequency resolution, against a long window giving the reverse">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">short window</text>
<rect class="bx" x="24" y="72" width="308" height="150" rx="4"/>
<text class="ts" x="40" y="98">you know WHEN precisely</text>
<text class="ts" x="40" y="122">you know WHAT vaguely</text>
<text class="th" x="40" y="158">good for a click,</text>
<text class="th" x="40" y="178">a transient, an onset</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">long window</text>
<rect class="bx" x="348" y="72" width="308" height="150" rx="4"/>
<text class="ts" x="364" y="98">you know WHAT precisely</text>
<text class="ts" x="364" y="122">you know WHEN vaguely</text>
<text class="th" x="364" y="158">good for separating two</text>
<text class="th" x="364" y="178">close, steady tones</text>
</svg>

<p>The product of the time and frequency uncertainties is bounded below. A window of duration T
gives a frequency resolution of roughly one over T, so halving the window doubles the frequency
smearing. This is not an implementation weakness; it is a property of the transform, and no
amount of zero padding changes it, because zero padding interpolates between bins rather than
adding information.</p>

<p><b>Wavelets</b> respond to this by varying the window with frequency: short windows at high
frequency where events are brief, long windows at low frequency where you need resolution. That
gives constant relative bandwidth rather than constant absolute bandwidth, which matches a great
many physical signals, and it is why wavelet analysis suits transients and edges.</p>

<p>Two practical notes on reading a spectrogram. The <b>window shape</b> matters as much as its
length, because leakage from a strong component will otherwise bury a weak one nearby, and the
sidelobes of a rectangular window are only thirteen decibels down. And the <b>overlap</b> should
be at least fifty percent with a tapered window, otherwise you are throwing away the data the
taper attenuated at each block's edges.</p>

<p>Where you need both resolutions and the signal is sparse, reassignment or a synchrosqueezing
transform can sharpen the display considerably, at the cost of an interpretation that no longer
corresponds to a simple energy density.</p>
`,
quiz: [
{ q: "What does the STFT window length trade?",
o: ["Time resolution against frequency resolution", "Computation against memory use", "Amplitude accuracy against phase accuracy", "Noise floor against dynamic range"],
a: 1, why: "A window of duration T gives a frequency resolution of roughly one over T. The product is bounded below, which is a property of the transform." },
{ q: "Why does zero padding not improve frequency resolution?",
o: ["It changes the effective sample rate", "It interpolates between bins without adding information", "It introduces leakage at the padding boundary", "It reduces the amplitude of every component"],
a: 1, why: "The underlying resolution is set by the duration of real data. Padding samples the same spectrum more finely, which helps locate a peak and cannot separate two." },
{ q: "How do wavelets differ from a fixed-window STFT?",
o: ["They use a longer window at every frequency", "The window length varies with frequency", "They discard phase information entirely", "They require the signal to be periodic"],
a: 1, why: "Short windows at high frequency and long ones at low frequency gives constant relative bandwidth, which matches many physical signals and suits transients." },
{ q: "Why should spectrogram segments overlap by at least half?",
o: ["It reduces the computation required", "The window taper otherwise discards data at the block edges", "It removes the correlation between segments", "It doubles the frequency resolution"],
a: 1, why: "The taper attenuates the ends of each record, so without overlap that data is thrown away. Fifty percent with a Hann window recovers almost all of it." }
],
interview: {
q: "How would you analyse a signal whose frequency content changes over time?",
a: "The first thing I would establish is what the question actually is, because that decides the analysis. If I want to know when something happened, I need time resolution; if I want to separate two close components, I need frequency resolution; and the short-time Fourier transform makes me choose, because the window length sets the two in opposition and their product is bounded below. That is a property of the transform rather than an implementation limit, and zero padding does not help because it interpolates between bins rather than adding information. So in practice I would compute a spectrogram at more than one window length and look at both, which is quick and usually tells me a great deal. I would use a tapered window, Hann as a default, because a rectangular window's first sidelobe is only thirteen decibels down and a strong component would bury anything weak nearby, and I would overlap by at least fifty percent so I am not throwing away the data the taper attenuated at each block edge. If the signal is genuinely transient, with short events at high frequency and slower structure at low frequency, that is exactly the case wavelets are built for, because varying the window with frequency gives constant relative bandwidth rather than constant absolute bandwidth. And if I needed a sharper picture of a sparse signal I would look at reassignment or synchrosqueezing, while being clear that what comes out is no longer a simple energy density and has to be interpreted accordingly."
}
},

{
id: "dsp-pll",
track: "DSP",
sub: "Implementation and algorithms",
title: "Digital PLLs: locking to a frequency you do not control",
mins: 22,
body: `
<p>A phase-locked loop makes a local oscillator follow an incoming signal in frequency and
phase. Digitally, it is three blocks in a feedback loop, and every design decision comes down
to one number: the loop bandwidth.</p>

<svg class="fig" viewBox="0 0 680 220" role="img" aria-label="A loop of phase detector, loop filter and numerically controlled oscillator, with the oscillator output fed back to the detector">
<rect class="bx" x="40" y="80" width="150" height="70" rx="4"/>
<text class="th" x="56" y="108">phase</text>
<text class="th" x="56" y="130">detector</text>

<line class="ln" x1="190" y1="115" x2="250" y2="115"/>
<rect class="bx" x="250" y="80" width="150" height="70" rx="4"/>
<text class="th" x="266" y="108">loop filter</text>
<text class="ts" x="266" y="132">sets the bandwidth</text>

<line class="ln" x1="400" y1="115" x2="460" y2="115"/>
<rect class="bx" x="460" y="80" width="170" height="70" rx="4"/>
<text class="th" x="476" y="108">oscillator</text>
<text class="ts" x="476" y="132">phase accumulator</text>

<line class="ln" x1="545" y1="150" x2="545" y2="185"/>
<line class="ln" x1="545" y1="185" x2="115" y2="185"/>
<line class="ln" x1="115" y1="185" x2="115" y2="150"/>
<text class="ts" x="290" y="205">feedback</text>

<line class="ln" x1="0" y1="115" x2="40" y2="115"/>
<text class="ts" x="0" y="70">input</text>
</svg>

<p>The <b>phase detector</b> produces a signal proportional to the phase difference between
input and local oscillator. The <b>loop filter</b>, usually proportional plus integral,
determines the dynamics. The <b>numerically controlled oscillator</b> is a phase accumulator
whose increment is the frequency.</p>

<p>The loop filter's integral term is what lets the loop track a frequency offset with zero
steady-state phase error, exactly as an integrator does in any control loop. A loop with only
proportional gain locks with a residual phase error proportional to the frequency offset.</p>

<p><b>Loop bandwidth</b> decides everything. Inside it the output follows the input, including
the input's noise; outside it, the local oscillator's own stability takes over. A wide loop
acquires quickly and tracks a moving input, and it passes jitter. A narrow loop cleans the
signal up beautifully and is slow to acquire and may not track at all. Choosing that crossover
is the design.</p>

<p>Acquisition is the part that catches people. A narrow loop has a small pull-in range, so it
may never lock from a cold start even though it would hold lock perfectly once there. The usual
answers are a frequency-locked loop or a coarse frequency estimate to get close first, or a
bandwidth that starts wide and narrows once locked.</p>

<p>In fixed point, the phase accumulator's width sets the frequency resolution, and truncating
its output before the lookup produces spurious tones at predictable frequencies. Adding a small
dither to the truncated bits turns those spurs into a noise floor, which is usually the better
failure.</p>
`,
quiz: [
{ q: "What does the integral term in a PLL's loop filter provide?",
o: ["Faster acquisition from a cold start", "Zero steady-state phase error with a frequency offset", "Rejection of the input's amplitude noise", "A wider pull-in range"],
a: 1, why: "It is exactly the role an integrator plays in any control loop. Proportional gain alone locks with a residual phase error proportional to the offset." },
{ q: "What does the loop bandwidth decide?",
o: ["The maximum frequency the oscillator can generate", "How much input jitter is passed and how much is filtered", "The resolution of the phase accumulator", "The number of bits in the phase detector"],
a: 1, why: "Inside the bandwidth the output follows the input including its noise; outside it the local oscillator dominates. That crossover is the whole design." },
{ q: "Why can a narrow loop fail to lock even though it would hold lock?",
o: ["Its pull-in range is small, so it never acquires", "The phase detector saturates at large offsets", "The integrator winds up before lock is achieved", "Narrow loops cannot track a static frequency"],
a: 1, why: "Acquisition and tracking are different problems. A coarse frequency estimate, a frequency-locked loop, or starting wide and narrowing all solve it." },
{ q: "What causes spurious tones in a numerically controlled oscillator?",
o: ["The accumulator overflowing", "Truncating the phase before the lookup", "The loop filter's integral term", "Quantisation of the frequency word"],
a: 1, why: "Truncation produces a periodic error and therefore discrete spurs at predictable frequencies. Dithering the truncated bits converts them into a noise floor." }
],
interview: {
q: "How would you design a digital PLL to recover a carrier?",
a: "Structurally it is three blocks: a phase detector producing something proportional to the phase difference, a loop filter that is normally proportional plus integral, and a numerically controlled oscillator which is really just a phase accumulator whose increment is the frequency. The integral term is what gives me zero steady-state phase error against a frequency offset, for exactly the reason an integrator does in any other control loop, and without it the loop locks with a residual error proportional to the offset. The number that decides everything is the loop bandwidth. Inside it the output follows the input including the input's noise; outside it my local oscillator's own stability takes over. So a wide loop acquires quickly and tracks a moving carrier and passes jitter through, and a narrow loop cleans the signal up and is slow and may not track at all. I would set that from the actual requirement: how much frequency offset and drift I have to follow, and how much phase noise I am willing to pass. The part people underestimate is acquisition, because a loop narrow enough to give me the phase noise I want often has a pull-in range too small to lock from cold. I would handle that with a coarse frequency estimate first, from an FFT or a frequency-locked loop, or by starting the loop wide and narrowing it once lock is detected. In fixed point I would size the phase accumulator for the frequency resolution I need and dither the truncated bits before the sine lookup, because plain truncation gives discrete spurs at predictable frequencies and a noise floor is a much better failure mode."
}
}

);
