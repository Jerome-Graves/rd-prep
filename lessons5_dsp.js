// DSP: modulation, coherence and measurement.
//
// The instrumentation half of DSP: working at complex baseband, generating and
// translating frequencies, recovering a signal buried in noise, spreading energy
// in time to get it back, measuring a system rather than a signal, and what a
// dirty clock does to all of it.

LESSONS.push(

{
id: "dsp-iq",
track: "DSP",
sub: "Modulation and measurement",
title: "Complex baseband: quadrature demodulation and its imperfections",
mins: 24,
body: `
<p>Almost every system that works with a modulated carrier moves the signal to <b>complex
baseband</b> first: mix down to zero frequency, keep two channels in quadrature, and process a
complex-valued signal at a fraction of the original rate. It is worth understanding why that is
the natural representation rather than a trick.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A real signal multiplied by cosine and sine to produce I and Q channels, low-pass filtered and decimated to complex baseband">
<rect class="bx" x="24" y="26" width="150" height="60" rx="4"/>
<text class="ts" x="40" y="52">real signal</text>
<text class="ts" x="40" y="74">around fc</text>

<rect class="bx" x="192" y="20" width="180" height="46" rx="4"/>
<text class="ts" x="208" y="48">multiply by cos: I</text>
<rect class="bx" x="192" y="76" width="180" height="46" rx="4"/>
<text class="ts" x="208" y="104">multiply by sin: Q</text>

<rect class="bx" x="392" y="20" width="150" height="102" rx="4"/>
<text class="ts" x="408" y="52">low pass</text>
<text class="ts" x="408" y="80">then decimate</text>

<rect class="bxa" x="560" y="20" width="96" height="102" rx="4"/>
<text class="th" x="576" y="52">I + jQ</text>
<text class="ts" x="576" y="80">complex</text>
<text class="ts" x="576" y="100">baseband</text>

<rect class="bx" x="24" y="142" width="632" height="88" rx="4"/>
<text class="th" x="40" y="168">why complex: a real signal cannot tell positive from negative frequency</text>
<text class="ts" x="40" y="196">two quadrature channels can, so the spectrum is no longer forced to be symmetric</text>
<text class="ts" x="40" y="220">and magnitude and phase come out directly as envelope and instantaneous phase</text>
</svg>

<p>The reason is that a real signal's spectrum is forced to be symmetric, so it cannot distinguish
a frequency above the carrier from one below. Two channels in quadrature can, and the complex
signal formed from them carries the full information at half the sample rate that a real
representation would need. Magnitude gives the envelope directly and the argument gives
instantaneous phase, which is exactly what most measurements want.</p>

<p>The processing chain is short: multiply the real signal by a cosine and a sine at the carrier,
low-pass filter each to remove the sum term, and decimate. Everything afterwards is complex
arithmetic at the lower rate, which is a considerable saving as well as a simplification.</p>

<p>The imperfections are where practical work lives. <b>Gain imbalance</b> and <b>phase error</b>
between the two channels mean the two are no longer exactly in quadrature, and the effect is an
<b>image</b>: energy that should be at one frequency appears mirrored at the negative of it. In an
analogue front end this limits image rejection to perhaps thirty or forty decibels unless
corrected, and it is correctable, by estimating and applying a two-by-two correction matrix.</p>

<p><b>DC offset</b> in either channel becomes a spurious component sitting exactly at the carrier
after downconversion, which is the worst possible place for it because that is often where the
signal is. It comes from mixer leakage and amplifier offsets, and the usual remedies are a high-pass
that is gentle enough not to disturb the signal, or estimating and subtracting it during a known
quiet period.</p>

<p>Doing the mix <b>digitally</b> avoids both problems, because a numerically generated sine and
cosine are perfectly matched. That is why sampling at an intermediate frequency and mixing in
digital is preferred wherever the converter can reach, and why direct-conversion front ends need
the correction that a digital one does not.</p>

<p>One more property worth holding: a frequency offset between the assumed carrier and the actual
one appears as a <b>rotation</b> of the complex baseband signal at the difference frequency. That
makes offset estimation and correction easy, and it also means a slow drift shows as a steady
phase ramp, which is often the cleanest way to see it.</p>
`,
quiz: [
{ q: "Why represent a signal as complex baseband?",
o: ["It halves the storage required", "A real signal's spectrum is symmetric and cannot distinguish positive from negative frequency", "Complex arithmetic is faster", "It removes the need for filtering"],
a: 1, why: "Two quadrature channels carry the full information, and magnitude and argument give envelope and instantaneous phase directly." },
{ q: "What does gain or phase imbalance between I and Q produce?",
o: ["A DC offset", "An image: energy mirrored to the negative of its frequency", "Increased noise floor", "Loss of bandwidth"],
a: 1, why: "In an analogue front end this limits image rejection to a few tens of decibels unless a correction matrix is estimated and applied." },
{ q: "Why is DC offset particularly damaging after downconversion?",
o: ["It saturates the amplifier", "It lands exactly at the carrier, which is often where the signal is", "It cannot be filtered", "It causes aliasing"],
a: 1, why: "It comes from mixer leakage and amplifier offsets, and is handled with a gentle high-pass or by estimating it during a quiet period." },
{ q: "What does a carrier frequency offset look like at complex baseband?",
o: ["A gain error", "A rotation of the complex signal at the difference frequency", "An increase in the envelope", "An image component"],
a: 1, why: "That makes it easy to estimate and correct, and a slow drift shows as a steady phase ramp, which is often the clearest way to see it." }
],
interview: {
q: "Why do measurement systems work at complex baseband, and what goes wrong in practice?",
a: "The fundamental reason is that a real signal's spectrum is symmetric, so it cannot distinguish a frequency above the carrier from one below it. Two channels in quadrature can, and the complex signal built from them carries the full information at half the sample rate a real representation would need. On top of that, once I am at complex baseband, the magnitude is the envelope and the argument is the instantaneous phase, which is directly what most measurements want, and a carrier frequency offset shows up simply as a rotation at the difference frequency, which makes it easy to estimate and correct. The chain itself is short: multiply by a cosine and a sine at the carrier, low-pass each to kill the sum term, decimate, and then everything downstream is complex arithmetic at a much lower rate. What goes wrong is mostly in the analogue part. Gain imbalance and phase error between the two channels mean they are not exactly in quadrature, and the consequence is an image, energy appearing mirrored at the negative of its true frequency, which in a direct-conversion front end typically limits image rejection to a few tens of decibels. That is correctable: estimate the imbalance from a known tone and apply a two-by-two correction matrix. The other problem is DC offset from mixer leakage and amplifier offsets, which after downconversion sits exactly at the carrier, which is the worst place because that is often where the signal is, and the remedies are a high-pass gentle enough not to disturb the signal or estimating the offset during a known quiet interval and subtracting it. Both problems largely disappear if I sample at an intermediate frequency and do the mix digitally, because a numerically generated sine and cosine are perfectly matched, so where the converter can reach that far it is the better architecture."
}
},

{
id: "dsp-nco",
track: "DSP",
sub: "Modulation and measurement",
title: "Generating and translating frequency: NCOs and mixers",
mins: 22,
body: `
<p>Producing a precise frequency digitally, and shifting a signal from one frequency to another,
are the two operations underneath every modulator, demodulator, lock-in and sweep generator. Both
are simple in principle and have well-defined ways of going wrong.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A phase accumulator incremented each sample, its top bits addressing a sine table, producing an output whose frequency is set by the increment">
<rect class="bx" x="24" y="26" width="200" height="90" rx="4"/>
<text class="th" x="40" y="52">phase accumulator</text>
<text class="ts" x="40" y="80">add the increment</text>
<text class="ts" x="40" y="104">every sample</text>

<rect class="bx" x="240" y="26" width="200" height="90" rx="4"/>
<text class="th" x="256" y="52">top bits address</text>
<text class="ts" x="256" y="80">a sine table, or</text>
<text class="ts" x="256" y="104">a CORDIC rotation</text>

<rect class="bxa" x="456" y="26" width="200" height="90" rx="4"/>
<text class="th" x="472" y="52">output</text>
<text class="ts" x="472" y="80">frequency set by</text>
<text class="ts" x="472" y="104">the increment alone</text>

<rect class="bx" x="24" y="132" width="632" height="42" rx="4"/>
<text class="th" x="40" y="158">resolution: sample rate divided by two to the accumulator width</text>
<rect class="bx" x="24" y="184" width="632" height="46" rx="4"/>
<text class="ts" x="40" y="212">truncating phase before the table produces spurs, not noise</text>
</svg>

<p>A <b>numerically controlled oscillator</b> is a phase accumulator plus a way of turning phase
into amplitude. Each sample, a constant increment is added to a wide accumulator that wraps
naturally; the top bits index a sine table or drive a rotation algorithm. The output frequency is
the increment times the sample rate divided by the accumulator's full range, so frequency
resolution is set by the accumulator width and can be made arbitrarily fine.</p>

<p>The important property is that <b>phase is continuous</b> across a frequency change, because
changing the increment does not disturb the accumulated phase. That is what allows glitch-free
frequency hopping and clean sweeps, and it is why an NCO is preferred over recomputing a sine from
absolute time.</p>

<p>The characteristic artefact is <b>spurs</b>. Truncating the accumulator before addressing the
table introduces a periodic phase error, and periodic errors produce discrete spectral lines rather
than a raised noise floor. More table address bits reduce them, and adding a small dither to the
truncated bits converts the spurs into noise, which is often preferable because a spur can land on
your signal while noise merely raises the floor.</p>

<p><b>Mixing</b> is multiplication, and multiplication in time is convolution in frequency, so
multiplying by a sinusoid produces sum and difference components. The difference is what you want
and the sum is removed by filtering. Multiplying by a complex exponential instead produces a pure
shift with no image at all, which is the cleaner operation and the reason complex baseband
processing is so tidy.</p>

<p>The failure to watch for is <b>aliasing after the shift</b>. Mixing moves energy, and anything
that lands outside the new Nyquist range folds back on top of your signal, so the low-pass filter
after a mixer is part of the mixer and not an optional refinement. In a decimating chain the filter
must be designed against the final rate, not the current one.</p>

<p>For sweeps, the same structure serves: increment the frequency increment itself, and the
accumulator produces a chirp with continuous phase. Doing it this way, rather than by evaluating a
formula, is what keeps the phase coherent and makes the result usable for anything that measures
phase.</p>
`,
quiz: [
{ q: "What sets an NCO's frequency resolution?",
o: ["The sine table size", "The accumulator width, relative to the sample rate", "The output word length", "The dither amplitude"],
a: 1, why: "The output frequency is the increment times the sample rate over the accumulator's full range, so a wider accumulator gives finer steps." },
{ q: "Why is phase continuity across a frequency change valuable?",
o: ["It reduces spurs", "Changing the increment does not disturb accumulated phase, giving glitch-free hops and clean sweeps", "It halves the table size", "It removes the need for a mixer"],
a: 1, why: "It is why an NCO is preferred over recomputing a sine from absolute time, which restarts the phase relationship each change." },
{ q: "Why does phase truncation produce spurs rather than noise?",
o: ["The table is nonlinear", "The truncation error is periodic, and periodic errors give discrete spectral lines", "Quantisation is always spurious", "The accumulator wraps"],
a: 1, why: "Dithering the truncated bits converts spurs into noise, which is often preferable since a spur can land on the signal." },
{ q: "Why is the filter after a mixer not optional?",
o: ["It removes DC offset", "Mixing moves energy, and anything outside the new Nyquist range folds onto the signal", "It compensates for the sum term's phase", "It sets the mixer gain"],
a: 1, why: "In a decimating chain that filter must be designed against the final rate rather than the current one." }
],
interview: {
q: "How would you generate a precise, agile frequency in a digital system?",
a: "With a numerically controlled oscillator, which is a phase accumulator plus a phase-to-amplitude stage. Each sample I add a constant increment to a wide accumulator that wraps naturally, and the top bits of that accumulator index a sine table or drive a CORDIC rotation. The output frequency is the increment times the sample rate divided by the accumulator's full range, so the resolution is set by the accumulator width and I can make it as fine as I like, which is how you get millihertz steps from a megahertz clock. The property that matters most for agility is that phase is continuous across a frequency change, because changing the increment does not disturb the phase already accumulated, so I can hop or sweep without a glitch and without losing phase coherence. That is why this structure is preferred over evaluating a sine from absolute time, which restarts the relationship every time the frequency changes. For a sweep I increment the increment itself, and I get a chirp with continuous phase, which is essential for anything that then measures phase. The artefact I would design against is spurs. Truncating the accumulator before the table introduces a periodic phase error, and a periodic error produces discrete spectral lines rather than a raised noise floor, so a spur can land directly on the frequency I care about. More address bits reduce them, and dithering the truncated bits trades them for noise, which is usually the better deal because noise just raises the floor. Amplitude quantisation in the table sets a separate floor. And if I am then mixing with this, I would remember that multiplying by a real sinusoid gives sum and difference terms while multiplying by a complex exponential gives a clean shift, and that the filter after any mixer is part of the mixer, because energy moved outside the new Nyquist range folds straight back onto the signal."
}
},

{
id: "dsp-lockin",
track: "DSP",
sub: "Modulation and measurement",
title: "Lock-in detection: recovering a signal below the noise",
mins: 22,
body: `
<p>When a measurement is buried in noise that overlaps it in frequency, filtering cannot help. The
answer is to move the measurement somewhere quiet: modulate it at a frequency you choose, and
detect only at that frequency and phase. It routinely recovers signals far below the broadband
noise floor.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Noise rising at low frequency, with the measurement modulated up to a quiet region, detected coherently and brought back to DC">
<rect class="bx" x="24" y="26" width="632" height="60" rx="4"/>
<text class="th" x="40" y="52">the problem: at DC the noise is worst</text>
<text class="ts" x="40" y="74">drift, flicker noise, thermal wander, mains and its harmonics</text>

<rect class="bxa" x="24" y="98" width="632" height="60" rx="4"/>
<text class="th" x="40" y="124">modulate the measurement at a chosen frequency</text>
<text class="ts" x="40" y="146">chop the excitation, or drive the stimulus with a reference</text>

<rect class="bx" x="24" y="170" width="632" height="60" rx="4"/>
<text class="th" x="40" y="196">multiply by the reference and low-pass hard</text>
<text class="ts" x="40" y="218">only components at the reference frequency and phase survive</text>
</svg>

<p>The structure is: modulate the quantity being measured at a reference frequency, multiply the
received signal by that same reference, and low-pass filter with a very narrow bandwidth. The
product of the signal and reference has a DC term proportional to the signal amplitude and the
cosine of their phase difference; everything at other frequencies becomes an alternating term that
the filter removes.</p>

<p>The effective bandwidth is set by the <b>output filter</b>, and it can be made extremely narrow
because it is a low-pass at DC rather than a bandpass at the reference. A one-hertz output
bandwidth is trivial digitally and gives an enormous noise rejection, at the cost of a
correspondingly slow response.</p>

<p>Using <b>both</b> a cosine and a sine reference gives the in-phase and quadrature components,
which is the same complex baseband idea again. That removes the need to tune the reference phase by
hand, since magnitude and phase come out directly, and it is why a modern implementation is always
two-channel.</p>

<p><b>Choosing the reference frequency</b> is the main design decision, and it is a matter of
finding somewhere quiet. High enough to be above the flicker noise corner and clear of drift, away
from mains and its harmonics, away from switching supply frequencies and any mechanical resonance,
and not at a submultiple of anything else in the system. It should also not be a round number, so
that its harmonics do not coincide with other interferers.</p>

<p>The technique rejects everything except signals at the reference frequency <b>and</b> phase, so
it also rejects interference that happens to be nearby, and quadrature rejection means a
synchronous but out-of-phase pickup can be separated from the real signal. That is often used
deliberately: a capacitive coupling path and the wanted signal frequently differ in phase.</p>

<p>What it cannot fix is anything that modulates at the reference frequency too. Pickup from the
modulation drive itself, coupling through a shared supply, or a thermal effect that follows the
chopping will all appear as signal. That is why measuring with the stimulus disconnected, and
finding the residual, is a mandatory part of using the method rather than an optional check.</p>
`,
quiz: [
{ q: "Why does modulating a measurement help when noise overlaps it?",
o: ["It increases the signal amplitude", "It moves the measurement to a frequency where the noise is lower", "It averages the noise away", "It removes the need for filtering"],
a: 1, why: "At DC the noise is worst: drift, flicker noise, thermal wander, mains and its harmonics all live there." },
{ q: "What sets the effective bandwidth of a lock-in?",
o: ["The reference frequency", "The output low-pass filter, which can be made very narrow", "The modulation depth", "The input amplifier bandwidth"],
a: 1, why: "It is a low-pass at DC rather than a bandpass at the reference, so a one-hertz bandwidth is trivial, at the cost of a slow response." },
{ q: "Why use both cosine and sine references?",
o: ["It doubles the signal to noise ratio", "It gives magnitude and phase directly, without tuning the reference phase", "It rejects harmonics", "It halves the required averaging"],
a: 1, why: "It is the complex baseband idea again, and quadrature rejection lets a synchronous but out-of-phase pickup be separated from the real signal." },
{ q: "What can a lock-in not reject?",
o: ["Broadband thermal noise", "Interference at the reference frequency, such as pickup from the modulation drive", "Mains hum", "Slow thermal drift"],
a: 1, why: "That is why measuring with the stimulus disconnected and finding the residual is mandatory rather than an optional check." }
],
interview: {
q: "You need to measure a signal that is well below the noise floor. What do you do?",
a: "If the noise overlaps the signal in frequency then filtering cannot help, so I would move the measurement somewhere quiet by modulating it, and use lock-in detection. The reason this works is that at DC the noise is worst: thermal drift, flicker noise, mains and its harmonics all live down there, so a slowly varying measurement sits in the noisiest part of the spectrum. If I chop the excitation or drive the stimulus with a reference at some chosen frequency, the quantity I care about now appears as a modulation at that frequency, and I can detect it coherently. The detection is a multiply by the reference followed by a very narrow low-pass, and the point is that the narrow filter is a low-pass at DC rather than a bandpass at the reference, so a one-hertz effective bandwidth is trivial digitally and gives enormous noise rejection, at the cost of a proportionally slow response. I would use both a cosine and a sine reference so I get in-phase and quadrature components, which means magnitude and phase come out directly without tuning the reference phase, and the quadrature channel is genuinely useful because a capacitive pickup path and the real signal usually differ in phase, so I can separate them. Choosing the reference frequency is the main design decision and it is entirely about finding somewhere quiet: above the flicker noise corner, away from mains and its harmonics, away from any switching supply frequency and mechanical resonance, and not a round number so its harmonics do not coincide with other interferers. The thing the method cannot fix is anything that also modulates at the reference, such as pickup from the modulation drive itself or coupling through a shared supply, and that will appear as perfectly good signal. So running the measurement with the stimulus disconnected and looking at the residual is not an optional check, it is part of using the technique."
}
},

{
id: "dsp-chirp",
track: "DSP",
sub: "Modulation and measurement",
title: "Chirps and pulse compression: spreading energy in time",
mins: 24,
body: `
<p>A short pulse gives good resolution and carries little energy. A long pulse carries energy and
resolves nothing. A chirp escapes the trade: transmit a long pulse whose frequency sweeps, then
compress it on reception into something as short as its bandwidth allows.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A long swept pulse compressed by a matched filter into a short peak whose width is set by bandwidth and whose height is raised by the time-bandwidth product">
<rect class="bx" x="24" y="26" width="308" height="96" rx="4"/>
<text class="th" x="40" y="52">transmitted</text>
<text class="ts" x="40" y="80">long, low peak power</text>
<text class="ts" x="40" y="104">frequency sweeps across B</text>

<rect class="bxa" x="348" y="26" width="308" height="96" rx="4"/>
<text class="th" x="364" y="52">after compression</text>
<text class="ts" x="364" y="80">width about 1 over B</text>
<text class="ts" x="364" y="104">gain equal to T times B</text>

<rect class="bx" x="24" y="138" width="632" height="42" rx="4"/>
<text class="th" x="40" y="164">resolution comes from bandwidth; energy comes from duration</text>
<rect class="bx" x="24" y="190" width="632" height="42" rx="4"/>
<text class="ts" x="40" y="216">so they stop competing, and the product is the figure of merit</text>
</svg>

<p>The key idea is that <b>resolution depends on bandwidth</b>, not on pulse length. A matched
filter compresses a swept pulse of duration T and bandwidth B into a peak of width roughly one over
B, with a signal to noise improvement equal to the product T times B. That product is the
compression gain and the single number that characterises the scheme.</p>

<p>Practically this means the transmitter can run at low peak power for a long time rather than
high peak power briefly, which matters when peak power is limited by the amplifier, by safety
limits, or by nonlinearity in the medium. In ultrasound that is exactly the constraint, which is
why coded excitation is used to gain penetration without raising peak pressure.</p>

<p>The cost is <b>range sidelobes</b>. The compressed pulse is not a clean spike: a linear sweep
compresses to something with sidelobes that can mask a weak echo near a strong one. Windowing the
matched filter suppresses them substantially, at the price of a wider main lobe and a small loss of
signal to noise, and that trade is chosen against the dynamic range the application needs.</p>

<p>A linear sweep has a specific vulnerability: <b>range-Doppler coupling</b>. A frequency shift
from motion looks like a time shift, so a moving target appears displaced in range. It is
predictable and correctable if velocity is known, and it is a genuine ambiguity if it is not, which
is why other sweep shapes and coding schemes exist.</p>

<p>The alternative to a sweep is a <b>coded sequence</b>, phase modulating the carrier with a
sequence whose autocorrelation is sharp. Binary codes give good sidelobe behaviour with simpler
hardware, and complementary pairs can cancel sidelobes entirely across two transmissions, at the
cost of needing the medium to be unchanged between them.</p>

<p>Two practical points determine whether it works at all. The compression filter must match the
<b>actual</b> transmitted waveform, so a transducer that distorts the sweep degrades compression
unless the measured response is used in the filter. And the whole scheme relies on <b>phase
coherence</b> between transmit and receive, so clock and reference stability matter far more than
they do for a simple pulse.</p>
`,
quiz: [
{ q: "What determines the resolution of a compressed chirp?",
o: ["Its duration", "Its bandwidth", "Its peak power", "The sampling rate"],
a: 1, why: "The compressed width is roughly one over the bandwidth, which is what breaks the trade between resolution and transmitted energy." },
{ q: "What is the compression gain?",
o: ["The ratio of peak to average power", "The time-bandwidth product", "The square root of the duration", "The number of code chips"],
a: 1, why: "It is the signal to noise improvement from the matched filter and the single number characterising the scheme." },
{ q: "What is the main cost of pulse compression?",
o: ["Higher peak power", "Range sidelobes that can mask a weak echo near a strong one", "Reduced bandwidth", "Loss of phase information"],
a: 1, why: "Windowing the matched filter suppresses them at the price of a wider main lobe and a small signal to noise loss." },
{ q: "What is range-Doppler coupling in a linear chirp?",
o: ["Motion blurs the spectrum", "A frequency shift from motion looks like a time shift, displacing the target in range", "Doppler reduces the compression gain", "The sweep rate changes with velocity"],
a: 1, why: "It is correctable if velocity is known and a genuine ambiguity if it is not, which is why other sweep shapes and codes exist." }
],
interview: {
q: "You need more penetration but cannot raise peak power. What do you do?",
a: "Spread the energy in time instead, with a chirp or a coded excitation, and compress on reception. The reason this works is that resolution is set by bandwidth rather than by pulse duration, so I can transmit a long pulse whose frequency sweeps across the bandwidth I want, and then run it through a matched filter that compresses it to a peak roughly one over the bandwidth wide. The signal to noise improvement is the time-bandwidth product, so a sweep that is a hundred times longer than the equivalent short pulse buys me twenty decibels while keeping the same range resolution and the same peak power. That is exactly the right tool when peak power is limited by the amplifier, by a safety limit on peak pressure, or by nonlinearity in the medium, which is the usual situation in ultrasound. The main cost is range sidelobes, because the compressed pulse is not a clean spike and a weak echo sitting next to a strong one can be masked by the strong one's sidelobes. Windowing the matched filter suppresses them a long way, at the price of a slightly wider main lobe and a small loss of gain, and I would choose that trade against the dynamic range the application actually needs. With a linear sweep I would also watch for range-Doppler coupling, where motion produces a frequency shift that compression turns into an apparent shift in range, which is predictable if I know the velocity and a real ambiguity if I do not. Two things decide whether it works at all in practice. The compression filter has to match the waveform that was actually transmitted, and a transducer with limited bandwidth will distort the sweep, so I would measure the real transmitted waveform and use that in the filter rather than the ideal one. And the whole scheme depends on phase coherence between transmit and receive, so clock stability matters much more than it does for a simple pulse-echo measurement."
}
},

{
id: "dsp-coherence",
track: "DSP",
sub: "Modulation and measurement",
title: "Measuring a system: transfer functions and coherence",
mins: 22,
body: `
<p>Measuring a signal and measuring a <b>system</b> are different problems. For a system you have
an input and an output, you want the relationship between them, and you need a way of knowing which
parts of that answer to believe. Coherence is that second thing, and it is what separates a
measurement from a plot.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Input and output spectra combined into a transfer function estimate, with coherence indicating which frequencies are trustworthy">
<rect class="bx" x="24" y="26" width="196" height="66" rx="4"/>
<text class="th" x="40" y="52">input x</text>
<text class="ts" x="40" y="76">must excite everything</text>
<rect class="bx" x="236" y="26" width="196" height="66" rx="4"/>
<text class="th" x="252" y="52">output y</text>
<text class="ts" x="252" y="76">plus whatever else</text>
<rect class="bxa" x="448" y="26" width="208" height="66" rx="4"/>
<text class="th" x="464" y="52">H estimate</text>
<text class="ts" x="464" y="76">cross over auto spectrum</text>

<rect class="bx" x="24" y="108" width="632" height="56" rx="4"/>
<text class="th" x="40" y="134">coherence: the fraction of output power explained linearly by the input</text>
<text class="ts" x="40" y="156">one means trust it; low means noise, nonlinearity, or something else driving the output</text>

<rect class="bx" x="24" y="176" width="632" height="54" rx="4"/>
<text class="ts" x="40" y="204">it requires averaging: a single block always gives coherence of exactly one</text>
</svg>

<p>The estimate itself is the <b>cross spectrum</b> between input and output divided by the input's
<b>auto spectrum</b>, averaged over blocks. Averaging matters because the cross spectrum of
uncorrelated noise averages towards zero while the correlated part does not, so the estimate cleans
up with more averages in a way a single block never can.</p>

<p><b>Coherence</b> is the fraction of output power at each frequency that is linearly explained by
the input. It runs from zero to one, and it is frequency dependent, which is the useful part: a
measurement can be excellent in one band and worthless in another, and coherence tells you where
the boundary is.</p>

<p>Low coherence has four causes and distinguishing them is most of the diagnostic work. There may
be too little <b>excitation</b> at that frequency, so the output there is mostly noise. There may
be <b>another input</b> driving the output that you are not measuring. The system may be
<b>nonlinear</b>, so output energy appears at frequencies the linear model cannot account for. Or
there may be a <b>delay</b> longer than the block length, so the correlated parts do not line up
within a block.</p>

<p>The trap to know is that coherence computed without averaging is <b>identically one</b> at every
frequency, because a single block can always be explained by a single complex gain. A coherence
plot that is flat at one is not a good result, it is a sign that the averaging was not done.</p>

<p>The choice of <b>excitation</b> follows from all this. It must have energy everywhere you want
an answer, which is why a swept sine or broadband noise beats a single tone. A swept sine gives the
best signal to noise at each frequency and takes longer; noise or a multitone gives everything at
once with less energy per frequency. A multitone with randomised phases keeps the crest factor low,
which matters when the amplifier or the system limits peak amplitude.</p>

<p>The practical habit is to plot coherence beside every transfer function and to quote results
only where it is high. A resonance that appears at a frequency where coherence is low is not a
resonance, and reporting it is one of the commonest ways a measurement misleads.</p>
`,
quiz: [
{ q: "Why does averaging improve a transfer function estimate?",
o: ["It reduces the sample rate needed", "The cross spectrum of uncorrelated noise averages towards zero while the correlated part does not", "It widens the effective bandwidth", "It removes the delay"],
a: 1, why: "That is why a single block can never give a clean estimate however long it is." },
{ q: "What does coherence measure?",
o: ["The signal to noise ratio of the output", "The fraction of output power linearly explained by the input, per frequency", "The phase accuracy of the estimate", "The stationarity of the system"],
a: 1, why: "Because it is frequency dependent, it tells you which parts of a measurement to believe and which to discard." },
{ q: "Why is a coherence plot that is flat at one suspicious?",
o: ["It means the system is nonlinear", "Coherence without averaging is identically one, so it indicates no averaging was done", "It means the input was too small", "It indicates aliasing"],
a: 1, why: "A single block can always be explained by a single complex gain, so the result is a computation artefact rather than a good measurement." },
{ q: "Which is not a cause of low coherence?",
o: ["Insufficient excitation at that frequency", "A very high sample rate", "An unmeasured second input driving the output", "Nonlinearity in the system"],
a: 1, why: "A delay longer than the block length is the fourth cause, since the correlated parts then fail to line up within a block." }
],
interview: {
q: "How would you measure the frequency response of a physical system, and how would you know the result is good?",
a: "I would excite it with something broadband, measure input and output simultaneously, and estimate the transfer function as the averaged cross spectrum between them divided by the averaged auto spectrum of the input. The averaging is essential rather than cosmetic, because the cross spectrum of uncorrelated noise averages towards zero while the correlated part does not, so the estimate genuinely cleans up with more averages in a way that a single long block never does. For the excitation I would use a swept sine if I can afford the time, because it puts the most energy at each frequency in turn and gives the best signal to noise, or broadband noise or a multitone if I need everything at once, and with a multitone I would randomise the phases to keep the crest factor low so I am not limited by peak amplitude. Whatever I use, it has to have energy at every frequency where I want an answer, because the estimator cannot invent a response where there was no excitation. How I know the result is good is coherence, which I would plot beside the response every time. It is the fraction of output power at each frequency that is linearly explained by the input, it runs from zero to one, and it is frequency dependent, so it tells me exactly which parts of the curve to believe. Where coherence is low, one of four things is happening: too little excitation there, another input driving the output that I am not measuring, nonlinearity putting energy where a linear model cannot account for it, or a delay longer than my block length so the correlated parts do not line up. Each has a different fix, so the diagnosis is worth doing. The one trap I would watch for is that coherence computed without averaging is identically one at every frequency, because a single block can always be explained by one complex gain, so a flat coherence plot at one is not a good measurement, it means the averaging was not done. And I would refuse to quote a resonance at a frequency where coherence is poor, because that is one of the commonest ways these measurements mislead."
}
},

{
id: "dsp-jitter",
track: "DSP",
sub: "Modulation and measurement",
title: "Clock jitter and phase noise in a measurement",
mins: 22,
body: `
<p>Every sampled measurement assumes the samples were taken at the instants you think. They were
not, and the error has consequences that scale with signal frequency, which makes it the limiting
factor in high-frequency measurement far more often than the converter's resolution.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A timing error converting into an amplitude error proportional to the slope of the signal, so faster signals suffer more">
<rect class="bx" x="24" y="26" width="632" height="56" rx="4"/>
<text class="th" x="40" y="52">the sample is taken slightly early or late</text>
<text class="ts" x="40" y="72">so the amplitude error is the timing error times the signal slope</text>

<rect class="bxa" x="24" y="98" width="308" height="60" rx="4"/>
<text class="th" x="40" y="124">slow signal</text>
<text class="ts" x="40" y="146">small slope, small error</text>
<rect class="bx" x="348" y="98" width="308" height="60" rx="4"/>
<text class="th" x="364" y="124">fast signal</text>
<text class="ts" x="364" y="146">large slope, large error</text>

<rect class="bx" x="24" y="174" width="632" height="56" rx="4"/>
<text class="th" x="40" y="200">so the achievable resolution falls as signal frequency rises</text>
<text class="ts" x="40" y="220">no amount of converter resolution compensates</text>
</svg>

<p>The mechanism is simple: a sample taken at slightly the wrong time reports the amplitude the
signal had at that wrong time, so the amplitude error is the timing error multiplied by the signal's
<b>slope</b>. Slope is proportional to frequency and amplitude, so the same jitter costs far more on
a fast signal than a slow one.</p>

<p>The consequence is a ceiling on effective resolution that depends on signal frequency, and it
cannot be bought around: a converter with more bits sampled by the same clock produces the same
error. This is why a high-speed acquisition system's clock is often more expensive and more
carefully treated than the converter it drives.</p>

<p><b>Random</b> jitter raises the noise floor, which is comparatively benign because it averages
down. <b>Deterministic</b> jitter, from coupling of a nearby periodic signal into the clock,
produces discrete sidebands around every signal component, and those do not average away and can be
mistaken for real features in the spectrum.</p>

<p><b>Phase noise</b> is the same phenomenon described in the frequency domain, as power close to
the carrier of an oscillator. It is quoted at offsets from the carrier, and integrating it over a
band gives the jitter in time. Two oscillators with the same total jitter can behave very
differently if one has its noise close in and the other far out, which matters because close-in
noise cannot be filtered away.</p>

<p>Where it matters most is <b>coherent</b> measurement: anything that compares phase between
transmit and receive, or between channels, or across repeats. A pulse-echo measurement resolving
small time differences is limited by clock stability, and averaging over repeats only helps if the
clock is stable across them, since drift between repeats moves the very thing being measured.</p>

<p>Multi-channel systems have an additional requirement: the channels must share a clock, or the
relative phase between them is meaningless. Distributing one clock with matched delays is the usual
answer, and skew between channels is calibrated rather than assumed to be zero.</p>

<p>The practical guidance is to treat the clock as part of the signal chain. Give it a clean supply
and its own path, keep switching and digital activity away from it, resample rather than run
converters from different sources, and measure the jitter you have, since a spectrum of a pure tone
shows it directly in the skirts around the peak.</p>
`,
quiz: [
{ q: "Why does jitter hurt high-frequency signals more?",
o: ["High frequencies have more noise", "The amplitude error is timing error times slope, and slope rises with frequency", "Converters are slower at high frequency", "Aliasing amplifies it"],
a: 1, why: "It sets a ceiling on effective resolution that depends on signal frequency, and a converter with more bits on the same clock does not help." },
{ q: "How do random and deterministic jitter differ in effect?",
o: ["Random jitter is worse", "Random raises the noise floor; deterministic produces discrete sidebands", "Deterministic jitter only affects the clock", "They are indistinguishable in a spectrum"],
a: 1, why: "Sidebands do not average away and can be mistaken for real spectral features, which makes deterministic jitter the more dangerous kind." },
{ q: "Why can two oscillators with the same total jitter behave differently?",
o: ["One may have a different frequency", "Noise close to the carrier cannot be filtered away, unlike noise far out", "Jitter is measured differently", "Total jitter is not well defined"],
a: 1, why: "Phase noise is quoted at offsets from the carrier, and integrating it over a band gives the time-domain jitter figure." },
{ q: "What must multi-channel systems share?",
o: ["The same converter type", "A common clock, or relative phase between channels is meaningless", "Identical input filters", "The same sample rate only"],
a: 1, why: "Distributing one clock with matched delays is the usual answer, and channel-to-channel skew is calibrated rather than assumed zero." }
],
interview: {
q: "Your acquisition system is not achieving its expected resolution at high frequency. Where do you look?",
a: "Clock jitter would be my first suspicion, because it is the limitation that scales with signal frequency and it is very often what caps a high-frequency measurement rather than anything about the converter. The mechanism is that a sample taken at slightly the wrong instant reports the amplitude the signal had at that instant, so the amplitude error is the timing error multiplied by the signal's slope. Slope goes up with frequency, so the same jitter that is invisible at low frequency dominates at high frequency, and crucially a converter with more bits driven by the same clock produces exactly the same error. That is why in a fast acquisition system the clock is often the more carefully engineered part. To confirm it I would digitise a clean high-frequency tone from a source I trust and look at the spectrum. Jitter shows itself directly in the skirts around the peak, and the shape tells me which kind I have. Random jitter raises the noise floor and is comparatively benign because it averages down. Deterministic jitter, from a nearby periodic signal coupling into the clock, produces discrete sidebands that do not average away and can easily be mistaken for real spectral features, so if I see symmetric sidebands at a suspicious offset I would go looking for a switching supply or a digital clock at that frequency. Then I would treat the clock as part of the signal chain rather than as a digital utility: its own clean supply, its own routing, physical separation from switching activity, and where possible a low phase noise source rather than a general-purpose oscillator, paying attention to close-in noise because that cannot be filtered out. If it is a coherent or multi-channel measurement I would also check that every channel shares one clock with calibrated skew, because relative phase between channels driven from separate sources is meaningless, and that the clock is stable across repeats, since averaging only helps if the thing being averaged has not moved."
}
}

);
