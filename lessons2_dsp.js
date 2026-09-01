// DSP track, part 2: filter design, fixed point, adaptive, detection, phase,
// real-time architecture. Same shape as data.js lessons; appended via push.

LESSONS.push(

{
id: "dsp-zdomain",
track: "DSP",
sub: "Filters",
title: "Poles, zeros and the z-domain by intuition",
mins: 25,
body: `
<p>The z-transform turns a difference equation into algebra: delay by one sample is
multiplication by 1/z. A filter becomes a ratio of polynomials H(z) = B(z)/A(z), and
the roots of those polynomials, the zeros of B and the poles of A, are the filter's
whole personality. Everything about a filter's behaviour can be read off a pole-zero
plot without evaluating a single equation.</p>
<h3>The unit circle is the frequency axis</h3>
<p>Frequency response is H(z) evaluated on the unit circle, z = exp(j*omega), where
omega runs from 0 (DC) at z = 1, round to the Nyquist frequency at z = -1. The
magnitude at any frequency is a ratio of distances: multiply the distances from that
point on the circle to every zero, divide by the distances to every pole. Walk your
eye around the circle and you can sketch the response.</p>
<ul>
<li>Near a <b>pole</b>, the denominator distance shrinks, so gain rises: poles create
peaks and resonances.</li>
<li>Near a <b>zero</b>, the numerator distance shrinks, so gain falls: zeros carve
notches. A zero exactly on the unit circle is a perfect null at that frequency.</li>
</ul>
<h3>Pole radius is ring time</h3>
<p>A pole pair at radius r and angle theta contributes an impulse response term of the
form r^n * cos(n*theta): a decaying oscillation. The angle sets the ringing frequency;
the radius sets how long it rings. At r = 0.9 the envelope falls to about 10 percent
in 22 samples; at r = 0.99 it takes about 230. This is exactly the intuition you
already own from transducers: a high-Q resonator is a pole crowding the unit circle,
and the long ring-down after a transmit pulse is that pole refusing to decay. Damping
a transducer with a backing layer is pulling its pole inward.</p>
<h3>Stability</h3>
<p>A causal filter is stable if and only if every pole lies strictly inside the unit
circle. A pole on the circle oscillates forever (that is how you make an oscillator or
an ideal integrator); a pole outside grows without bound. Zeros can sit anywhere:
they never threaten stability, they only shape the response and the phase.</p>
<h3>Reading a pole-zero plot in an interview</h3>
<ul>
<li>Poles clustered near z = 1 (DC): a low-pass; near z = -1: a high-pass.</li>
<li>Pole pair at angle theta with radius near 1: a sharp resonance at that frequency;
bandwidth is roughly proportional to the distance 1 - r.</li>
<li>Zeros on the circle between the poles: stopband notches, the signature of an
elliptic design.</li>
<li>A zero and pole close together nearly cancel; watch for this in a fixed-point
filter where quantisation has shifted one but not the other.</li>
</ul>
<h3>The 50 Hz notch, from scratch</h3>
<p>To remove mains hum at fs = 1000 Hz: place a zero pair on the unit circle at plus
and minus 2*pi*50/1000 radians (18 degrees), which nulls 50 Hz exactly, then place a
pole pair at the same angle just inside, say r = 0.98, to pull the response back up
to unity everywhere except a narrow notch. The pole radius sets notch width. That is
pole-zero design by intuition, and it is a genuinely useful filter three lines long.</p>`,
quiz: [
{ q: "A causal IIR filter is stable when:",
o: ["All zeros are inside the unit circle", "All poles are inside the unit circle", "Poles and zeros alternate", "The filter has more zeros than poles"],
a: 1, why: "Poles inside the unit circle give decaying impulse-response terms; zeros can sit anywhere without affecting stability." },
{ q: "A pole pair very close to the unit circle at angle theta produces:",
o: ["A deep notch at theta", "A wideband gain boost", "A narrow, long-ringing resonance at theta", "Instability in all cases"],
a: 2, why: "The radius sets decay: r near 1 means the impulse response rings for many samples and the resonance is narrow, like an undamped transducer." },
{ q: "To create a perfect null at one frequency you place:",
o: ["A pole on the unit circle at that angle", "A zero at the origin", "A pole at the origin", "A zero on the unit circle at that angle"],
a: 3, why: "On-circle zeros make the numerator distance exactly zero at that frequency, so the response is a true null; the 50 Hz notch uses this." },
{ q: "With a pole at radius 0.9, the impulse response envelope falls to roughly 10 percent after about:",
o: ["22 samples", "3 samples", "90 samples", "230 samples"],
a: 0, why: "The envelope decays as 0.9 to the power n; ln(0.1)/ln(0.9) is about 22. At radius 0.99 the same decay takes roughly ten times longer." }
],
interview: {
q: "Without computing anything, how would you explain what a pole-zero plot tells you about a filter?",
a: "I read it as a map of resonances and notches. The unit circle is the frequency axis, DC at one side, Nyquist at the other. Gain at any frequency is the product of distances to the zeros divided by distances to the poles, so poles near the circle are peaks and zeros near it are notches. Pole radius is ring time: it is the same physics as transducer Q, where a lightly damped element is a pole hugging the circle and rings for microseconds after the pulse. Stability is one glance: every pole inside the circle. I also check for near pole-zero cancellations, because those are fragile under coefficient quantisation and tell me the design has redundant order."
}
},

{
id: "dsp-fir-design",
track: "DSP",
sub: "Filters",
title: "Designing FIR filters that meet spec",
mins: 30,
body: `
<p>An FIR filter is just its impulse response: N taps convolved with the input. Design
means choosing those taps to meet a specification, which always has four numbers:
passband edge, stopband edge, passband ripple, stopband attenuation. The gap between
the band edges is the transition width, and it is the quantity you pay for.</p>
<h3>The window method</h3>
<p>Start from the ideal brick-wall response, whose impulse response is an infinite
sinc. Truncate it to N taps and you get ringing (Gibbs ripple); taper the truncation
with a window (Hamming, Blackman, Kaiser) and the ripple drops at the cost of a wider
transition. The Kaiser window has a knob (beta) that trades these continuously, plus a
published formula giving N directly from the attenuation and transition width. The
window method is quick, robust and always stable, but slightly wasteful: ripple is
largest near the band edge and smaller than needed elsewhere.</p>
<h3>Parks-McClellan, the equiripple idea</h3>
<p>Instead of tapering a sinc, pose it as optimisation: find the N taps whose worst-case
deviation from the ideal response is smallest. The Remez exchange algorithm solves
this, and the result is equiripple: the error touches its maximum many times and is
equally spread, which is the signature of the minimax optimum. For the same spec it
needs roughly 20 to 40 percent fewer taps than a windowed design. This is what
firpm or remez in your toolchain computes.</p>
<h3>The tap-count law you should carry in your head</h3>
<p>A useful estimate (due to fred harris): N is roughly the stopband attenuation in dB
divided by 22 times the normalised transition width. So 60 dB of stopband with a
transition of 5 percent of fs costs about 55 taps. The consequences:</p>
<ul>
<li>Halve the transition width and you double the taps, the compute and the delay.</li>
<li>Attenuation is cheap; sharpness is expensive.</li>
<li>A tight filter at a high sample rate is brutal; filtering after decimation, at the
lower rate, is often dramatically cheaper.</li>
</ul>
<h3>Linear phase and its four types</h3>
<p>Make the taps symmetric (or antisymmetric) and the phase is exactly linear: every
frequency is delayed by the same (N-1)/2 samples, so pulse shapes survive, which is why
FIR is the default in time-of-flight work. There are four types: symmetric or
antisymmetric, odd or even length. The details worth knowing: a type I (symmetric, odd
length) filter is unrestricted; symmetric even-length forces a null at Nyquist;
antisymmetric types force a null at DC and suit differentiators and Hilbert
transformers. A 101-tap linear-phase filter delays everything by exactly 50 samples,
which you subtract from any timing measurement.</p>
<h3>Half-band filters, the decimator's friend</h3>
<p>Design a low-pass with its cutoff exactly at fs/4 and symmetric transition bands,
and every second tap comes out exactly zero except the centre one. Nearly half the
multiplies vanish. Cascading halfband-plus-decimate-by-2 stages is the standard way to
come down from a fast ADC, for example stepping a 50 MS/s ultrasound capture down to a
processing rate, each stage cheap and each protecting the next from aliasing.</p>`,
quiz: [
{ q: "For a fixed attenuation, halving an FIR filter's transition width roughly:",
o: ["Halves the number of taps", "Leaves the tap count unchanged", "Doubles the number of taps", "Squares the number of taps"],
a: 2, why: "Tap count scales inversely with normalised transition width (roughly attenuation over 22 times the width), so sharpness is what you pay for." },
{ q: "Compared with the window method, a Parks-McClellan design of the same spec:",
o: ["Uses fewer taps by spreading ripple equally (minimax)", "Is always unstable", "Has nonlinear phase", "Only works for high-pass filters"],
a: 0, why: "Equiripple designs are optimal in the worst-case sense, typically saving 20 to 40 percent of taps over a windowed design." },
{ q: "A 101-tap symmetric (linear phase) FIR delays the signal by:",
o: ["101 samples", "One sample", "An amount that depends on frequency", "50 samples at every frequency"],
a: 3, why: "Linear phase means constant group delay of (N-1)/2 = 50 samples, so pulse shape and relative timing are preserved exactly." },
{ q: "The special property of a half-band filter is:",
o: ["It needs no multiplications at all", "Almost every second tap is exactly zero", "It has zero delay", "It only works below 1 kHz"],
a: 1, why: "Cutoff at fs/4 with symmetric transition bands forces alternate taps to zero, nearly halving the compute; ideal for decimate-by-2 chains." }
],
interview: {
q: "Your anti-alias FIR before a decimator is eating half the DSP budget. How do you cut the cost without breaking the spec?",
a: "First I would question where the sharpness is being bought. If the filter runs at the full input rate with a narrow transition band, that is the expensive combination, so I would restructure into stages: a cheap half-band filter and decimate by two, repeated, with the tight filter running last at the lowest rate, where each tap costs a fraction as much. Half-bands are nearly free because alternate taps are zero. Second, switch a windowed design to Parks-McClellan and recover 20 to 40 percent of the taps. Third, check the spec is honest: 80 dB of stopband is wasted if the ADC noise floor sits at 70. In an ultrasound front end, this staged decimation is exactly how you come down from 50 MS/s sensibly."
}
},

{
id: "dsp-iir-design",
track: "DSP",
sub: "Filters",
title: "Designing IIR filters and biquad cascades",
mins: 30,
body: `
<p>IIR design is mostly translation: a century of analogue filter theory (Butterworth,
Chebyshev, elliptic, Bessel) solved the approximation problem, so the digital designer
picks a prototype and maps it into the z-domain. The craft lies in the mapping and in
implementing the result so it survives finite precision.</p>
<h3>Bilinear transform, and why we prewarp</h3>
<p>The bilinear transform substitutes s = (2/T)(z - 1)/(z + 1). It maps the entire
analogue frequency axis onto the unit circle exactly once, so a stable prototype maps
to a stable digital filter and, unlike impulse invariance, there is no aliasing of the
response. The price is frequency warping: the infinite analogue axis is squeezed into
0 to Nyquist, following omega_analogue = (2/T) tan(omega_digital * T / 2). Near DC the
map is nearly linear; approaching Nyquist it compresses hard. The fix is prewarping:
before designing the prototype, shift each critical frequency by the tan formula so
that after the transform it lands exactly where the spec demands. Design tools do this
silently, but interviewers ask for it by name.</p>
<h3>Second-order sections, not one big polynomial</h3>
<p>Never implement an eighth-order IIR as a single direct-form transfer function. The
roots of high-order polynomials move violently under tiny coefficient changes, so the
quantised filter can be a different filter, or an unstable one. Factor the design into
cascaded biquads (second-order sections, SOS): each section owns one pole pair and one
zero pair, coefficient errors stay local, and each pole pair is perturbed only by its
own two denominator coefficients.</p>
<h3>Ordering and scaling the cascade</h3>
<ul>
<li><b>Pairing</b>: give each pole pair the zeros nearest to it, which minimises the
peak gain inside that section.</li>
<li><b>Ordering</b>: arrange sections so no intermediate signal grows out of range; a
common choice puts the low-Q, well-behaved sections first and the aggressive high-Q
pole pairs later, so noisy intermediate peaks are not amplified down the chain.</li>
<li><b>Scaling</b>: in fixed point, insert a gain per section so each intermediate node
uses the available range without overflowing; scale for the worst-case signal you
must survive, not the average.</li>
</ul>
<p>This is exactly why scipy moved its default from (b, a) polynomial form to sos, and
why CMSIS-DSP on Cortex-M offers biquad cascades as the primitive.</p>
<h3>When IIR wins</h3>
<ul>
<li><b>Compute</b>: a 4th-order elliptic (two biquads, about ten multiplies) can match
the magnitude spec of a 100-tap FIR. On a small MCU that is decisive.</li>
<li><b>Latency</b>: no (N-1)/2 tap delay; the sharp FIR that costs 50 samples of group
delay is an IIR costing a few.</li>
<li><b>Matching analogue behaviour</b>: modelling a real analogue receive chain, for
example the band-pass in an ultrasound front end, is naturally an IIR job, because
the analogue filter is one.</li>
</ul>
<p>FIR wins back when you need exactly linear phase for waveform fidelity, guaranteed
stability under crude quantisation, or easy multirate tricks. Most real systems use
both: IIR where cheap sharpness matters, FIR where the pulse shape is the product.</p>`,
quiz: [
{ q: "Prewarping is needed with the bilinear transform because the transform:",
o: ["Introduces aliasing near Nyquist", "Makes the filter unstable", "Compresses the analogue frequency axis nonlinearly (tan warping)", "Doubles the filter order"],
a: 2, why: "The whole analogue axis maps onto 0 to Nyquist via a tan relationship, so critical frequencies must be pre-shifted to land where the spec requires." },
{ q: "A high-order IIR should be implemented as cascaded biquads because:",
o: ["It runs faster on all CPUs", "Root positions of high-order polynomials are extremely sensitive to coefficient quantisation", "Biquads have linear phase", "Direct form cannot be programmed in C"],
a: 1, why: "Factoring into second-order sections keeps each pole pair controlled by only two coefficients, so quantisation errors stay local and stability survives." },
{ q: "A sensible rule when pairing and ordering SOS sections is:",
o: ["Random order, since the maths is identical in infinite precision", "Pair each pole pair with the most distant zeros", "Put all zeros in the first section", "Pair poles with their nearest zeros to minimise each section's peak gain"],
a: 3, why: "Nearest-zero pairing tames per-section peaks; combined with sensible ordering and per-section scaling it keeps intermediate signals inside the usable range." },
{ q: "Relative to a sharp linear-phase FIR meeting the same magnitude spec, an IIR typically offers:",
o: ["Far fewer multiplies and much lower group delay, at the cost of nonlinear phase", "Better pulse-shape preservation", "Guaranteed stability under any quantisation", "Simpler multirate decimation tricks"],
a: 0, why: "Feedback buys sharpness cheaply and avoids the long symmetric-tap delay; the price is phase distortion and the need to manage stability." }
],
interview: {
q: "You need a sharp band-pass on a small microcontroller with almost no compute budget. Walk me through your design.",
a: "I would design an elliptic or Chebyshev band-pass analytically: pick the prototype from the ripple tolerance, prewarp the band edges through the tan formula, apply the bilinear transform, and keep the order minimal, probably fourth or sixth. Then I would insist on second-order sections: pair each pole pair with its nearest zeros, order the cascade so the high-Q section comes where its peaking does least harm, and scale each node for the worst-case input. On a Cortex-M I would drop it into the CMSIS biquad cascade, which is a handful of multiplies per sample. I would verify the quantised coefficients by re-plotting poles afterwards, because the design is only real once it survives the precision it will run at."
}
},

{
id: "dsp-fixed",
track: "DSP",
sub: "Multirate and fixed point",
title: "Fixed-point DSP and quantisation effects",
mins: 30,
body: `
<p>Fixed-point arithmetic represents numbers as integers with an implied binary point.
The notation Qm.n means m integer bits and n fractional bits; plain Q15 is the DSP
staple, one sign bit and 15 fractional bits, covering -1 to just under +1 in steps of
2 to the power -15, about 3e-5. The machine only ever sees integers; the scaling
lives in your head and your comments, which is precisely where the bugs live too.</p>
<h3>The multiply-and-shift discipline</h3>
<p>Multiplying two Q15 numbers gives a Q30 result in a 32-bit register; shift right by
15 to return to Q15. Additions demand matching formats. The professional habit is to
accumulate in a wide register (32 or 64 bit) and convert only at the end, which is
what MAC instructions and CMSIS-DSP do for you: one rounding at the output rather
than one per tap.</p>
<h3>Scaling strategy comes before code</h3>
<p>Trace the worst-case signal level through every node of the algorithm and assign
each node a format that fits it. Filters have gain; an FIR's worst-case output is the
input times the sum of absolute tap values, and a resonant biquad can peak far above
unity in its passband. Give each stage headroom for that peak or scale the signal down
going in and up coming out. Getting this budget right is the actual work of fixed
point; the arithmetic is trivial afterwards.</p>
<h3>Overflow: wrap or saturate</h3>
<p>Plain integer overflow wraps: one count past full scale flips to the opposite
extreme, and a near-full-scale echo becomes a violent glitch. Saturating arithmetic
clips to the rail instead, which is merely distortion, bounded and local. Every DSP
core and Cortex-M4/M7 offers saturating instructions; use them everywhere a signal
can touch the rails. Wrap is acceptable only in intermediate sums that provably
cannot overflow overall (modular arithmetic guarantees the final sum is right if it
fits).</p>
<h3>Coefficient quantisation and limit cycles</h3>
<p>Rounding coefficients moves poles and zeros. Poles close to the unit circle, which
is exactly what a sharp or low-frequency IIR has, can move onto or outside it: your
filter changes shape or goes unstable purely from coefficient rounding. This is the
second reason for biquad cascades: each pole pair depends on only two coefficients.
Separately, rounding inside the feedback loop makes tiny errors that feed back,
sustaining small persistent oscillations or a stuck DC offset after the input goes
silent: limit cycles. At concept level: quantisation in feedback can self-sustain.
Cures include more internal bits, saturating rather than wrapping arithmetic, error
feedback, or simply using an FIR where there is no feedback to sustain anything.</p>
<h3>When to move to float</h3>
<p>A hardware FPU (single precision on M4F/M7) makes float multiplies about as fast as
integer ones, and it removes the entire scaling budget, most overflow hazards and the
limit-cycle family of bugs. If your part has an FPU and the sample rate allows, float
is usually the engineering win; development time is a cost too. Fixed point still
rules when there is no FPU, when SIMD lanes double throughput in 16-bit, in FPGA
datapaths where every bit of width is silicon, and at the extreme power floor. Keep
FP32's limits in mind: about 7 significant digits, so long accumulations still
deserve care.</p>`,
quiz: [
{ q: "Multiplying two Q15 values produces a result that is:",
o: ["Q15 directly", "Q7 with an offset", "Q30, needing a right shift by 15 to return to Q15", "Always an overflow"],
a: 2, why: "Fractional bits add: 15 plus 15 gives 30. Accumulate wide, shift and round once at the end." },
{ q: "Compared with wraparound, saturating arithmetic on overflow:",
o: ["Clips at the rail, turning a catastrophic sign flip into bounded distortion", "Is mathematically identical", "Halves the dynamic range permanently", "Only exists in floating point"],
a: 0, why: "Wrap sends a value just past full scale to the opposite extreme, a violent glitch; saturation is the graceful failure and is free in DSP hardware." },
{ q: "Coefficient quantisation is most dangerous for:",
o: ["FIR filters with few taps", "Any filter running below 1 kHz sample rate", "Filters with all zeros at the origin", "IIR filters whose poles sit close to the unit circle"],
a: 3, why: "Rounding moves poles; those already near the circle can cross it, changing the response badly or losing stability. Biquad structure limits the damage." },
{ q: "A limit cycle in a fixed-point IIR is:",
o: ["The maximum sample rate the loop sustains", "A small self-sustaining oscillation caused by rounding inside the feedback loop", "The filter's group delay", "An overflow in the input buffer"],
a: 1, why: "Quantisation error injected inside feedback can regenerate itself, leaving low-level tones or stuck offsets after the input stops." }
],
interview: {
q: "Port this floating-point biquad cascade to a fixed-point DSP. What is your plan and where are the traps?",
a: "First a scaling budget: compute each section's worst-case gain, assign formats and per-section scale factors so no node can hit the rails on the worst-case input, and write the budget down next to the code. Coefficients go to Q15 or Q14 depending on their range, and I re-plot the quantised poles before trusting them, because sharp sections sit near the unit circle where rounding hurts most. Implementation uses wide accumulators with a single round at the output, and saturating instructions throughout. Then I test deliberately at the edges: full-scale inputs for overflow, silence after excitation for limit cycles, and a long-run comparison against the float reference with a sensible error bound rather than bit-exactness. The traps are always the scaling budget and the near-circle poles, not the multiplies."
}
},

{
id: "dsp-adaptive",
track: "DSP",
sub: "Detection and estimation",
title: "Adaptive filters: LMS and friends",
mins: 30,
body: `
<p>A fixed filter assumes you know the frequency response you want. An adaptive filter
does not: it carries adjustable weights and a reference for what its output should
have been, and it learns the filter from the error. The astonishing part is how cheap
the standard algorithm is.</p>
<h3>LMS in four lines</h3>
<pre>y = dot(w, x);        // filter the input window as usual
e = d - y;            // error against the desired signal d
w += mu * e * x;      // nudge every weight along the input
// repeat every sample, forever</pre>
<p>That update is gradient descent on the fly: the gradient of the squared error with
respect to the weights is proportional to minus e times x, so each sample nudges the
weights downhill using only the data it just saw. No matrix inversions, no stored
statistics: 2N multiplies per sample and the filter tracks a changing world.</p>
<h3>The step size trade-off</h3>
<p>Everything about LMS behaviour lives in mu. Large mu converges fast and tracks fast
changes, but the weights jitter around the optimum (misadjustment, excess error), and
past a bound set by the input power and filter length the loop goes unstable. Small mu
converges slowly and tracks sluggishly but settles close to the optimum. There is no
free choice: fast tracking and low residual error pull in opposite directions, and
real designs often gear-shift, starting large and shrinking mu once converged.</p>
<h3>NLMS, the version you actually deploy</h3>
<p>The stable range of mu depends on input power, and real signals (speech, echoes)
swing in level constantly. Normalised LMS divides the update by the current input
energy plus a small epsilon, so the effective step adapts to the signal level.
Convergence speed becomes roughly level-independent and choosing the step becomes a
dimensionless choice between 0 and 2. One extra division buys robustness, which is
why practical echo cancellers are NLMS.</p>
<p>One structural weakness remains: convergence speed depends on the input's spectral
character. A white input adapts all directions equally fast; a strongly coloured input
(large eigenvalue spread in its correlation matrix) leaves some weight directions
crawling. RLS fixes this with much more compute; in interviews, naming the issue is
what matters.</p>
<h3>Where the desired signal comes from</h3>
<p>The trick to every application is identifying d:</p>
<ul>
<li><b>Echo cancellation</b>: d is the microphone or line signal; x is the far-end
reference you sent. The filter learns the echo path and subtracts the predicted
echo; what remains is the near-end talker.</li>
<li><b>Noise cancellation</b>: x is a reference sensor hearing mostly noise (an engine
pickup, a second microphone); the filter learns the transfer from reference to
primary and removes the correlated part.</li>
<li><b>Equalisation</b>: d is a known training sequence; the filter learns the inverse
of the channel. This is your ultrasound instinct inverted: instead of characterising
a propagation path, you learn to undo one.</li>
<li><b>System identification</b>: excite an unknown system and the adaptive filter
converges to its impulse response, an on-line way of measuring a transducer or room
response without an FFT in sight.</li>
</ul>
<p>An adaptive canceller only removes what correlates with its reference, which is its
safety property: in echo cancellation the near-end speech is uncorrelated with the
far-end reference, so it passes through untouched while the echo dies.</p>`,
quiz: [
{ q: "The LMS weight update w += mu * e * x is best described as:",
o: ["Exact least-squares solving each sample", "A Kalman filter in disguise", "A stochastic gradient descent step using only the current sample", "Random search"],
a: 2, why: "The instantaneous squared error's gradient is proportional to minus e times x, so each sample takes one cheap step downhill." },
{ q: "Choosing mu too large in LMS causes:",
o: ["Slow convergence but perfect accuracy", "Weight jitter and, beyond a bound set by input power, divergence", "No effect if the input is white", "The weights to freeze"],
a: 1, why: "Step size trades convergence speed against misadjustment, and stability requires mu below a limit tied to input energy and filter length." },
{ q: "NLMS improves on plain LMS by:",
o: ["Using a longer filter", "Whitening the input spectrum", "Removing the need for a desired signal", "Dividing the update by current input energy so the step is level-independent"],
a: 3, why: "Normalisation keeps the effective step safe as signal level swings, which real speech and echoes do constantly." },
{ q: "In an acoustic echo canceller, the adaptive filter converges to:",
o: ["An estimate of the echo path from loudspeaker to microphone", "The near-end talker's voice", "The inverse of the microphone response", "A notch at 50 Hz"],
a: 0, why: "With the far-end signal as x and the microphone as d, minimising the error means predicting and subtracting the echo; uncorrelated near-end speech survives." }
],
interview: {
q: "How would you remove a strong, slowly wandering interference tone from a sensor channel without notching a fixed frequency?",
a: "I would use an adaptive canceller. If I can get a reference for the interference, say a pickup near the source or the mains itself, I feed that as the input, the corrupted channel as the desired signal, and let NLMS learn the transfer path; the output error is the cleaned signal, and the filter tracks the wander automatically. With no reference, I would use the adaptive line enhancer trick: a delayed copy of the channel is the input, so the filter can only predict the narrowband, correlated tone, and subtracting its prediction leaves the wideband signal. I would pick the normalised step for tracking speed versus residual jitter, and verify on recordings that the wanted signal, uncorrelated with the reference, passes unharmed."
}
},

{
id: "dsp-detection",
track: "DSP",
sub: "Detection and estimation",
title: "Detection: thresholds, ROC and CFAR",
mins: 30,
body: `
<p>Detection is a decision, not a measurement: given noisy data, is a target present or
not? Framing it properly is half the interview answer. Two hypotheses: H0, noise only;
H1, signal plus noise. Any detector reduces the data to a statistic and compares it to
a threshold, and the entire design question is where that threshold sits and what
statistic feeds it.</p>
<h3>The two errors, and why you cannot have both</h3>
<ul>
<li><b>False alarm</b>: declaring a target under H0. Probability Pfa.</li>
<li><b>Miss</b>: declaring nothing under H1. Probability 1 - Pd.</li>
</ul>
<p>The noise-only and signal-plus-noise distributions of your statistic overlap. Slide
the threshold up and false alarms fall but so does detection; slide it down and you
catch weaker echoes plus a flood of ghosts. The threshold does not remove the overlap;
only more signal-to-noise ratio does. The standard design recipe (Neyman-Pearson) is:
fix the false alarm rate you can afford, then maximise Pd at that rate.</p>
<h3>ROC: the honest picture of a detector</h3>
<p>Sweep the threshold and plot Pd against Pfa: the receiver operating characteristic.
Each point is one threshold choice; the curve is the detector. A useless detector runs
along the diagonal (Pd equals Pfa, coin-flipping); better detectors bow toward the
top-left corner. More SNR, longer integration or a better statistic lifts the whole
curve; moving the threshold merely slides you along it. When someone quotes a
detection rate without a false alarm rate, they have told you one coordinate of one
point and nothing about the detector.</p>
<h3>The matched filter</h3>
<p>When you know the pulse shape, correlate the received data against a template of
it: the matched filter. Among all linear filters it maximises output SNR at the
decision instant, and it is exactly what pulse-echo practice does when
cross-correlating an A-scan with the transmitted pulse to find an echo: the
correlation peak is the matched-filter output, and thresholding that peak is
textbook detection. Longer or coded pulses (chirps) buy SNR through the same
mechanism, energy against noise, then pulse compression restores resolution.</p>
<h3>CFAR: adapting the threshold to the noise you actually have</h3>
<p>A fixed threshold assumes stationary noise. Real backgrounds are not: gain varies
with depth, attenuation and scattering structure change along the record, clutter
comes and goes. A threshold calibrated in a quiet region false-alarms constantly in a
noisy one and misses everything where the noise is low.</p>
<p>Constant false alarm rate (CFAR) detection estimates the local noise level and sets
the threshold relative to it. Cell-averaging CFAR is the canonical version: for each
cell under test, average the surrounding reference cells, skipping a few guard cells
either side so the target's own energy does not inflate the estimate, and multiply by
a factor chosen for the desired Pfa. As the noise floor rises and falls, the
threshold rides it and the false alarm rate stays constant, which is the property
the operator actually cares about. The costs: reference cells spend some SNR (a CFAR
loss), and a second target inside the reference window raises the estimate and can
mask the first, which fancier variants (ordered-statistic CFAR) mitigate. The same
idea in ultrasound: thresholding echoes relative to a locally estimated noise floor
along the A-scan, rather than one global number for the whole record.</p>`,
quiz: [
{ q: "Raising a detector's threshold:",
o: ["Increases both detection and false alarm probability", "Lowers both false alarm and detection probability", "Increases detection while lowering false alarms", "Changes neither, only the latency"],
a: 1, why: "The two distributions overlap; the threshold trades one error for the other. Only more SNR or better processing improves both together." },
{ q: "Each point on an ROC curve represents:",
o: ["One SNR value", "One target range", "One threshold setting, plotted as detection versus false alarm probability", "One noise sample"],
a: 2, why: "Sweeping the threshold traces the curve; changing SNR or the statistic moves the whole curve, which is why quoting Pd without Pfa is meaningless." },
{ q: "The matched filter is optimal in the sense that it:",
o: ["Minimises group delay", "Preserves pulse shape exactly", "Removes all noise from the record", "Maximises output SNR at the decision instant among linear filters"],
a: 3, why: "Correlating with the known pulse concentrates signal energy against white noise; echo-finding by cross-correlation is exactly this detector." },
{ q: "Cell-averaging CFAR sets its threshold from:",
o: ["Neighbouring reference cells, with guard cells excluded, scaled for the target false alarm rate", "The strongest cell in the whole record", "A factory calibration constant", "The transmit pulse amplitude"],
a: 0, why: "Estimating the local noise floor and riding it keeps Pfa constant as the background varies; guard cells stop the target polluting its own estimate." }
],
interview: {
q: "Your flaw detector works in the calibration block but false-alarms near the surface and misses deep flaws in real parts. Diagnose and fix.",
a: "That is the fingerprint of a fixed threshold in nonstationary noise. Near the surface, ring-down and grain clutter push the background up, so a global threshold fires constantly; at depth, attenuation drops both signal and noise, so echoes duck under it. I would move to a CFAR scheme: estimate the local noise floor along the A-scan from reference windows with guard cells around the sample under test, and threshold at a multiplier chosen for the false alarm rate we can tolerate. Before that, I would make sure the statistic is right: matched filtering against the transmit pulse buys SNR before any threshold sees the data. Then I would validate with an ROC measured on real parts, not the calibration block, because the block's clean noise flattered the old design."
}
},

{
id: "dsp-phase",
track: "DSP",
sub: "Detection and estimation",
title: "Phase, group delay and analytic signals",
mins: 30,
body: `
<p>Magnitude response gets all the attention, but phase is where timing lives, and in
echo work timing is the product. Two definitions to keep apart:</p>
<ul>
<li><b>Phase delay</b>: minus phi(omega)/omega. How much a single steady sinusoid at
omega is delayed.</li>
<li><b>Group delay</b>: minus d phi/d omega, the derivative. How much the envelope of
a narrowband packet centred at omega is delayed. This is the one that matters for
pulses: an echo's envelope arrives at the group delay, not the phase delay.</li>
</ul>
<p>If group delay is constant across the signal band, every component of the pulse is
delayed equally and the shape survives: that is linear phase. If group delay varies
across the band, components arrive at different times and the pulse smears or
develops a chirp: dispersion, whether from a filter or from the medium itself.</p>
<h3>Minimum phase versus linear phase</h3>
<p>Among all causal filters with a given magnitude response, the minimum-phase one
(all zeros inside the unit circle) has the least possible phase lag and group delay,
and concentrates its impulse response energy earliest. It is also invertible: its
inverse is causal and stable, which is why deconvolution and equalisation want
minimum-phase models. Linear phase buys perfect symmetry and shape preservation
instead, at the cost of the fixed (N-1)/2 tap delay and an impulse response that
rings symmetrically before and after its peak. Rule of thumb: linear phase when the
waveform is the measurement (time-of-flight, pulse shape metrics); minimum phase when
latency is precious or an inverse filter is coming.</p>
<h3>The analytic signal and the Hilbert transform</h3>
<p>A real signal's spectrum is symmetric, so its negative frequencies carry no new
information. The Hilbert transform builds a 90-degree-shifted copy; combining them,
x plus j times Hilbert(x), gives the analytic signal, which has no negative
frequencies and unlocks two quantities you use constantly:</p>
<ul>
<li><b>Envelope</b>: the magnitude of the analytic signal. This is exactly how an
A-scan display is produced from RF ultrasound data: rectification-and-smoothing
approximated properly. Envelope detection also makes time-of-flight estimates
insensitive to carrier phase.</li>
<li><b>Instantaneous phase and frequency</b>: the angle of the analytic signal, and
its derivative. Instantaneous frequency tracks a chirp through time, and phase
comparisons between echoes support sub-sample timing far finer than the sample
period.</li>
</ul>
<p>In practice you compute it by FFT, zeroing the negative-frequency bins and doubling
the positive ones, or with an FIR Hilbert filter (an antisymmetric linear-phase
design) for streaming use.</p>
<h3>Unwrapping, and its pitfalls</h3>
<p>Computed phase arrives wrapped into plus or minus pi. Unwrapping adds multiples of
2 pi to make it continuous, and it is fragile in exactly the situations that matter:</p>
<ul>
<li>If the true phase changes by more than pi between samples, the unwrapper aliases
and silently inserts or drops a full cycle: a 2 pi slip that corrupts every later
sample of the phase record.</li>
<li>Where signal amplitude is small, phase is essentially noise, and one noisy point
can trigger a false jump; mask or ignore phase where the envelope is weak.</li>
<li>A cycle slip in phase-based timing shifts the estimate by exactly one carrier
period, a plausible-looking but wrong answer, which is why phase methods are paired
with an envelope-based coarse estimate to select the correct cycle.</li>
</ul>`,
quiz: [
{ q: "Group delay is:",
o: ["The negative derivative of phase with respect to frequency, the delay of a narrowband envelope", "Phase divided by frequency", "The filter length in samples", "The delay of the strongest sinusoid only"],
a: 0, why: "The envelope of a packet travels at the group delay; if it is constant across the band the pulse shape is preserved." },
{ q: "A minimum-phase filter, compared with a linear-phase filter of the same magnitude response:",
o: ["Has identical phase", "Has the least group delay and front-loaded energy, and a causal stable inverse", "Cannot be implemented causally", "Always has symmetric coefficients"],
a: 1, why: "Minimum phase gives the smallest possible delay for that magnitude and is invertible, which equalisation wants; linear phase gives symmetry instead." },
{ q: "The envelope of an RF echo is obtained from the analytic signal as:",
o: ["Its real part", "Its phase derivative", "Its magnitude", "Its FFT"],
a: 2, why: "Analytic signal magnitude is the envelope; this is how A-scan envelopes are computed from RF data, making timing robust to carrier phase." },
{ q: "Phase unwrapping fails when:",
o: ["The signal is real-valued", "The sample rate is above Nyquist", "The FFT length is a power of two", "True phase changes by more than pi between samples, or amplitude is too low for phase to be meaningful"],
a: 3, why: "Both cause spurious 2 pi slips that corrupt the rest of the record; mask low-amplitude regions and keep sampling dense relative to phase rate." }
],
interview: {
q: "How would you measure time-of-flight between two echoes to much better than one sample period?",
a: "Coarse first, fine second. I would envelope-detect via the analytic signal and cross-correlate to get a robust coarse estimate, good to around a sample. Then refine: either interpolate the correlation peak with a parabolic or sinc fit, or use the phase of the analytic cross-correlation at the carrier, which converts to time with sub-nanosecond sensitivity at megahertz frequencies. The danger is cycle ambiguity: phase repeats every carrier period, so the envelope estimate must be accurate enough to pick the correct cycle, and I mask phase wherever the envelope is weak because it is pure noise there. I would also confirm the processing chain has matched group delay on both signals, since any unequal filtering biases the result directly."
}
},

{
id: "dsp-realtime",
track: "DSP",
sub: "Systems",
title: "Real-time DSP architecture",
mins: 30,
body: `
<p>Real time does not mean fast; it means never late. A real-time DSP system has a
hard deadline per buffer, and the design question is architectural: how data flows,
how big the blocks are, and what guarantees the processing finishes before the next
block lands. Average throughput is irrelevant if one worst-case block misses.</p>
<h3>Block processing and the latency budget</h3>
<p>Sample-by-sample processing minimises latency but wastes cycles on per-sample
overhead. Blocks amortise that overhead and unlock vectorised kernels, but every
block adds delay: you cannot process a block until it has finished arriving. A
256-sample block at 48 kHz is 5.3 ms just to fill; end-to-end latency is at least
input block plus processing plus output block, and commonly two to three block
periods through a double-buffered chain. So the block size is a dial between
efficiency and latency, and the latency budget should be written down first: an
audio effects unit may afford 10 ms; a closed-loop controller may afford far less;
an ultrasound acquisition pipeline at tens of MS/s may stream to memory by DMA and
face its deadline at the block-processing stage instead.</p>
<h3>Overlap-add and overlap-save</h3>
<p>FFT convolution is far cheaper than direct convolution for long FIR filters, but
the FFT circularly convolves, and blocks chopped from a stream would glitch at every
boundary. The fix: overlap the processing. Overlap-add zero-pads each input block,
convolves by FFT, and adds the overlapping tails of successive output blocks;
overlap-save overlaps the input blocks instead and discards the corrupted leading
samples of each output. Same cost, same result, bookkeeping differs. Either turns a
long filter into a fraction of the multiplies at the price of block latency, which
is why fast convolution runs the long reverbs and matched filters of the world.</p>
<h3>Double buffering, the heartbeat</h3>
<p>The DMA fills buffer A while the processor works on buffer B, then they swap,
typically via a circular buffer with half-complete and full-complete interrupts. The
contract is brutal and simple: processing of each half must finish before the DMA
wraps back to it, every single time. Miss once and samples are overwritten silently,
which is why an overrun counter on telemetry is not optional. This is the same
producer-consumer shape as an acquisition thread feeding a processing thread; DMA
just makes the producer relentless hardware.</p>
<h3>Headroom, and worst case versus average</h3>
<ul>
<li>Budget by the <b>worst-case</b> execution path, not the average: the block where
every branch goes the slow way, the cache is cold and the log flushes. A system
at 95 percent average load is one interrupt storm from an overrun.</li>
<li>Target meaningful headroom, commonly keeping worst-case load under about 70
percent of the deadline, to absorb jitter, growth and the feature someone adds
next year.</li>
<li>Make deadline misses observable: count overruns, timestamp the slowest block,
never fail silently.</li>
<li>Keep hard-deadline work isolated at high priority, and push logging, UI and
housekeeping to lower priority where lateness is harmless.</li>
</ul>
<p>The recurring interview trap is conflating throughput with real time: a machine
that averages ten times the required throughput but occasionally stalls for two
block periods is broken, while a slower machine that always finishes on time is
correct. Deadlines, buffers and observability are the architecture; the arithmetic
inside the block is almost incidental.</p>`,
quiz: [
{ q: "A 256-sample input block at 48 kHz adds a buffering delay of about:",
o: ["0.5 ms", "5.3 ms", "53 ms", "256 ms"],
a: 1, why: "256 divided by 48000 is about 5.3 ms; total latency stacks input, processing and output stages, often two to three block periods." },
{ q: "Overlap-add and overlap-save exist because:",
o: ["FFTs only work on power-of-two lengths", "DMA cannot move more than one block", "FFT convolution is circular, so streamed blocks need overlap handling to yield correct linear convolution", "They reduce latency to zero"],
a: 2, why: "Both schemes manage block edges so fast FFT-based convolution of a continuous stream matches direct convolution exactly." },
{ q: "In a double-buffered DMA scheme, the hard real-time contract is:",
o: ["Average load stays below 100 percent", "The CPU never sleeps", "Each buffer is cleared to zero after use", "Processing of each half always completes before the DMA wraps back to overwrite it"],
a: 3, why: "The producer is hardware and does not wait; one late block silently corrupts data, so overruns must be counted and surfaced." },
{ q: "Real-time capacity should be budgeted against:",
o: ["Worst-case execution time with deliberate headroom", "Average execution time", "Peak theoretical FLOPS", "The size of the binary"],
a: 0, why: "Deadlines are per block, not amortised: a system fine on average still fails on the one slow block, so worst case plus headroom is the design number." }
],
interview: {
q: "Your streaming DSP system drops buffers roughly once an hour despite profiling at 40 percent CPU load. Where do you look?",
a: "The profile is telling me the average, and deadlines fail on the worst case, so I go hunting for rare slow paths. First instrument properly: timestamp every block, record the maximum, and count overruns, so the once-an-hour event becomes measurable. Usual suspects: a lower-priority task or ISR that occasionally runs long and delays the processing task, logging or heap allocation on the audio path, cache-cold branches after an idle spell, or a periodic housekeeping job that aligns badly once an hour. I would check priorities and remove any blocking calls, allocation and locks from the deadline path. If worst-case time genuinely approaches the block period, I enlarge the buffers or split work across blocks. The fix is architectural discipline, not average-case optimisation."
}
}

);
