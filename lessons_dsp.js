// Extra DSP lessons for R&D Prep. Same shape as data.js entries; appended
// to the global LESSONS array. Code samples use &lt; &gt; escapes inside <pre>.

LESSONS.push(

{
id: "dsp-convolution",
track: "DSP",
sub: "Sampling and transforms",
title: "Convolution, correlation and matched filtering",
mins: 25,
body: `
<p>A linear time-invariant (LTI) system is completely described by one waveform: its
impulse response h. Hit it with a single impulse, record what comes out, and you know
what it does to everything, because any input is a train of scaled, shifted impulses,
and LTI means the responses just add. The output is the convolution:</p>
<pre>y[n] = sum over k of h[k] * x[n-k]     (flip h, slide, multiply, sum)</pre>
<p>This is not an abstraction in ultrasound: the received echo is the drive pulse
convolved with the transmit transducer response, the medium's reflectivity sequence,
and the receive response. Every stage of the chain is another convolution, which in
the frequency domain is another multiplication. That equivalence (convolution in time
equals multiplication in frequency) is why fast convolution via FFT exists and why a
band-limited transducer smears reflectors into overlapping echoes.</p>
<h3>Convolution vs correlation</h3>
<p>Cross-correlation slides one signal along another and sums the product without
flipping. Convolution flips the kernel first. That single flip is the whole
difference: correlate a signal with a template, or convolve it with the time-reversed
template, and you get identical outputs. For a kernel symmetric about its centre the
two operations coincide exactly. Correlation asks how alike two signals are at each
lag; convolution asks what a system does to a signal. Keep the vocabulary straight in
interviews, since sliding-window similarity questions are correlation questions.</p>
<h3>The matched filter</h3>
<p>Suppose a known pulse shape arrives buried in white noise and you want the filter
that maximises output signal-to-noise ratio at the decision instant. The answer, and
it is provably the best of all linear filters, is the matched filter: impulse response
equal to the time-reversed template. Running it is exactly cross-correlating the
received data with the template. Two facts worth saying out loud:</p>
<ul>
<li>The peak output SNR depends only on pulse energy over noise density (2E/N0), not
on pulse shape. Energy is what buys detection.</li>
<li>Since energy is amplitude squared times duration, a longer pulse detects as well
as a taller one. That observation is the door to pulse compression.</li>
</ul>
<h3>Pulse compression</h3>
<p>Peak voltage is limited by the pulser and the transducer, so you cannot always go
taller. Go longer instead: transmit a coded pulse, typically a linear chirp sweeping
across the transducer band, and matched-filter on receive. The correlation collapses
the long pulse into a spike of width roughly 1/B, where B is the swept bandwidth, so
range resolution is set by bandwidth, not by transmitted length. The SNR gain over a
plain pulse of the same amplitude is the time-bandwidth product. Worked example: a 10
microsecond chirp sweeping 2 MHz has TB = 20, which is 10*log10(20), about 13 dB of
extra SNR, while resolving like a 0.5 microsecond pulse. The price is range sidelobes
around each echo, tamed by amplitude weighting at a small SNR cost, and a blind zone
while the long pulse is still transmitting.</p>
<p>One sentence to own: correlation with the expected echo is simultaneously the
optimal detector, the best time-of-flight estimator for a known shape, and the
decoder that makes long coded pulses behave like short ones.</p>`,
quiz: [
{ q: "Matched filtering a received signal against a known template is the same operation as:",
o: ["Convolving with the template exactly as transmitted", "Differentiating the template", "Convolving with the time-reversed template", "Low-pass filtering at the template bandwidth"],
a: 2, why: "Correlation is convolution with a flipped kernel; the matched filter's impulse response is the time-reversed template, so the two are identical." },
{ q: "For detecting a known pulse in white noise, the linear filter with the highest output SNR is:",
o: ["The matched filter, whose peak SNR depends only on pulse energy over noise density", "An ideal brick-wall low-pass", "A differentiator to sharpen edges", "A notch filter at the carrier"],
a: 0, why: "The matched filter is the provable optimum; its peak SNR is 2E/N0 regardless of pulse shape." },
{ q: "A 10 microsecond chirp sweeping 2 MHz gives a pulse compression SNR gain of about:",
o: ["3 dB", "20 dB", "30 dB", "13 dB"],
a: 3, why: "Time-bandwidth product is 10e-6 times 2e6 = 20, and 10*log10(20) is about 13 dB." },
{ q: "Convolution and correlation with a kernel give identical results when:",
o: ["Never, they always differ", "The kernel is symmetric about its centre", "The kernel is causal", "The signal is periodic"],
a: 1, why: "The only difference is the kernel flip, which changes nothing for a symmetric kernel." }
],
interview: {
q: "Why transmit a long chirp and matched-filter, rather than just a short high-voltage pulse?",
a: "Because detection is bought with energy, not amplitude, and amplitude is what the hardware limits. The pulser and transducer cap peak voltage, but energy is amplitude squared times duration, so stretching the pulse raises energy without stressing anything. The matched filter then compresses the chirp back to a spike of width one over the swept bandwidth, so resolution is unchanged, while SNR improves by the time-bandwidth product: a 10 microsecond, 2 MHz sweep buys about 13 dB. In attenuating materials that is the difference between seeing the back wall and not. The costs I manage are range sidelobes, handled with weighting, and the blind zone during transmission, handled with a shorter pulse for the near field."
}
},

{
id: "dsp-multirate",
track: "DSP",
sub: "Multirate and fixed point",
title: "Decimation, interpolation and multirate",
mins: 25,
body: `
<p>Multirate processing is changing sample rate inside the digital domain, and the
whole subject reduces to one rule: every rate change is a fresh sampling operation,
so Nyquist must be respected at the new rate, before the change happens.</p>
<h3>Decimation: filter, then downsample</h3>
<p>Keeping every Mth sample of a stream is sampling at fs/M, and anything above the
new Nyquist fs/(2M) folds in as aliases, permanently. So the order is fixed: low-pass
below fs/(2M) first, then discard. Worked example: ultrasound RF captured at 40 MS/s
whose useful echo band ends at 4 MHz. Decimating by 4 gives 10 MS/s with a new
Nyquist of 5 MHz, so a low-pass with its cutoff between 4 and 5 MHz protects the band
and the data shrinks fourfold. Decimating by 5 would put Nyquist at exactly 4 MHz,
leaving no room for a filter transition band, which is why the greedy option fails.</p>
<h3>Interpolation: upsample, then filter</h3>
<p>To raise the rate by L, insert L-1 zeros between samples, then low-pass. The
zero-stuffed signal has the right rate but its spectrum contains images, copies of
the baseband repeated up to the new Nyquist. The interpolation filter's job is to
remove those images, and it needs a gain of L to restore amplitude. Here the filter
comes after the rate change, and the asymmetry is the point: filtering always
happens on the high-rate side, where the full band is representable. Downsampling
first then filtering is irreversible damage; filtering after zero-stuffing is the
only place image removal can work.</p>
<h3>The polyphase idea, at concept level</h3>
<p>A decimator computed naively runs the full anti-alias filter at the high rate and
then throws away M-1 of every M outputs, which is M times more work than needed. The
polyphase structure splits the filter into M interleaved sub-filters and only ever
computes the outputs that will be kept, all at the low rate. Same mathematics, same
output, factor of M less computation. Interpolators decompose the same way: never
multiply by the stuffed zeros. Whenever a datasheet mentions a polyphase resampler,
this bookkeeping trick is all it means.</p>
<h3>Rational rate conversion</h3>
<p>A ratio L/M is done as upsample by L, one combined low-pass, downsample by M, with
the filter cutoff at the lower of the two Nyquist limits so it serves as image
remover and anti-alias filter simultaneously. The classic: 48 kHz to 44.1 kHz is the
ratio 147/160, so conceptually interpolate by 147, filter once, decimate by 160,
implemented polyphase so the intermediate 7.056 MHz rate never physically exists.</p>
<h3>Practical notes worth volunteering</h3>
<ul>
<li>Large factors go in stages (decimate by 50 as 5 x 5 x 2): each stage's filter is
cheaper, and total compute drops dramatically.</li>
<li>Half-band filters decimate by 2 with almost half their coefficients zero.</li>
<li>Decimation filters add group delay; if time-of-flight is extracted downstream,
that delay must be known and subtracted.</li>
</ul>`,
quiz: [
{ q: "Before decimating a 40 MS per second stream by 4, the anti-alias filter must cut off below:",
o: ["20 MHz", "5 MHz", "10 MHz", "4 MHz"],
a: 1, why: "The new rate is 10 MS per second, so the new Nyquist is 5 MHz; anything above it would fold into the decimated band." },
{ q: "Inserting L-1 zeros between samples to upsample produces:",
o: ["A perfectly interpolated signal with no further work", "Broadband random noise", "A lower Nyquist frequency", "Spectral images that the interpolation filter must remove"],
a: 3, why: "Zero-stuffing repeats the baseband spectrum as images up to the new Nyquist; the low-pass with gain L removes them." },
{ q: "The polyphase structure saves computation by:",
o: ["Computing only the outputs that will be kept, using the filter split into sub-filters running at the low rate", "Using a shorter filter with a worse response", "Skipping the anti-alias filter for small M", "Running the same filter twice as fast"],
a: 0, why: "It is pure bookkeeping: identical output to filter-then-discard, but the discarded outputs and zero multiplies are never computed." },
{ q: "Converting 48 kHz audio to 44.1 kHz is properly done as:",
o: ["Decimate by 4 then interpolate by 3", "Drop every 12th sample", "Interpolate by 147, one combined filter, decimate by 160", "Round each sample time to the nearest new grid point"],
a: 2, why: "44.1/48 reduces to 147/160; upsample first, filter once at the lower Nyquist, then downsample, implemented polyphase." }
],
interview: {
q: "Your capture runs at 40 MS per second but the echo band ends at 4 MHz and storage is tight. What do you do, and what can go wrong?",
a: "I would decimate by 4 to 10 MS per second, cutting storage fourfold while keeping a 5 MHz Nyquist, comfortably above the 4 MHz band edge. The critical step is the low-pass before discarding samples: without it, out-of-band noise and any transducer harmonics fold onto the echoes and can never be removed. I would implement it polyphase so we only compute the samples we keep, and I would characterise the filter's group delay, because we extract time-of-flight downstream and an unaccounted delay is a systematic range error. I would not decimate by 5: that puts Nyquist at exactly 4 MHz with no transition band. Finally I would keep one undecimated capture as a regression reference."
}
},

{
id: "dsp-noise",
track: "DSP",
sub: "Detection and estimation",
title: "dB, SNR and noise budgets",
mins: 25,
body: `
<p>Decibels are the accounting system of measurement chains: gains and losses add
instead of multiply, and a whole receive chain becomes a sum you can do in your head.
Power ratios use 10*log10, amplitude ratios use 20*log10, and the two agree because
power goes as amplitude squared.</p>
<h3>Fluency drills (say these without thinking)</h3>
<ul>
<li>3 dB: double the power. 6 dB: double the amplitude. 10 dB: ten times the power.
20 dB: ten times the amplitude.</li>
<li>Compose them: 26 dB = 20 + 6, so ten times two, twenty times the amplitude.
40 dB is a hundred times the amplitude. 66 dB is about two thousand.</li>
<li>Pulse-echo doubles the dB: a 30 dB one-way attenuation path costs 60 dB
round trip.</li>
</ul>
<h3>SNR, dynamic range and the noise floor</h3>
<p>SNR compares signal power to noise power in the band you actually use. Dynamic
range is the span from the largest undistorted signal to the noise floor. For an
ideal N-bit ADC driven to full scale, SNR is 6.02*N + 1.76 dB: about 74 dB for 12
bits, 86 dB for 14. Headroom eats it directly: an echo arriving 60 dB below full
scale on that 12-bit converter enjoys only 74 - 60 = 14 dB of SNR, which is why
variable gain sits in front of the ADC, spending analogue gain to move small echoes
up towards full scale before quantisation, not after.</p>
<h3>Processing gain from averaging</h3>
<p>Repeat the measurement N times, triggered identically, and sum. The signal is the
same every time, so it adds as N. The noise is independent record to record, so it
adds as sqrt(N). Amplitude SNR therefore improves by sqrt(N), which is 10*log10(N)
in power terms: 100 averages buys 20 dB, 1000 buys 30 dB. This is coherent averaging,
and its two conditions are non-negotiable: the signal must be genuinely repeatable,
and trigger jitter must be a small fraction of a carrier period, otherwise the signal
partially cancels itself and the gain evaporates. At 2.5 MHz a period is 400 ns, so
nanosecond-class jitter is needed for clean coherent gain.</p>
<p>Incoherent averaging (average the envelopes or the powers, phase discarded) still
smooths the display and steadies estimates, but it cannot lower the mean noise level
under a signal; detectability improves far more slowly than 10*log10(N). The rule:
average before detection when you can, after detection only when you must, for
instance when the phase is not stable between records.</p>
<h3>A worked noise budget</h3>
<p>Target: detect a back-wall echo through an attenuating sample. Full-scale echo from
the front face; the back wall returns 60 dB lower after two-way attenuation. On a
12-bit converter that leaves 14 dB SNR, marginal for clean timing. Options, in the
order I would spend them: 100 coherent averages, +20 dB, giving 34 dB; more analogue
gain in a time-gated stage if the front-face echo can be kept out of saturation; a
14-bit converter, +12 dB of floor. The budget makes the choices explicit and shows
when averaging time is being traded against hardware cost.</p>`,
quiz: [
{ q: "A 26 dB amplitude ratio is about:",
o: ["10 times", "20 times", "400 times", "26 times"],
a: 1, why: "26 dB = 20 dB + 6 dB, which is 10 times 2 = 20 in amplitude." },
{ q: "Coherently averaging 100 triggered records improves SNR by:",
o: ["10 dB", "100 dB", "20 dB", "3 dB"],
a: 2, why: "Signal adds as N, noise as sqrt(N), so power SNR improves by 10*log10(100) = 20 dB." },
{ q: "Coherent averaging fundamentally requires:",
o: ["A repeatable signal aligned to the trigger, with jitter far below one carrier period", "Random phase between records", "Envelope detection before summing", "A higher resolution ADC"],
a: 0, why: "If timing wanders by a significant fraction of a period, the signal partially cancels itself and the sqrt(N) gain is lost." },
{ q: "An echo 60 dB below full scale on an ideal 12-bit ADC has an SNR of roughly:",
o: ["74 dB", "60 dB", "34 dB", "14 dB"],
a: 3, why: "The ideal 12-bit floor is about 74 dB below full scale, and 74 - 60 leaves 14 dB." }
],
interview: {
q: "Walk me through how you would budget for detecting an echo 60 dB weaker than your strongest signal.",
a: "I start at the converter: an ideal 12-bit ADC gives about 74 dB from full scale to the noise floor, so an echo 60 dB down has only 14 dB SNR, not enough for reliable sub-sample timing. I then spend gains in order of cheapness. Coherent averaging is usually free apart from time: 100 averages adds 20 dB, taking us to 34 dB, provided the target is static and trigger jitter is well below a carrier period. Next, time-gated analogue gain lifts the late weak echo without saturating on the early strong one. If the budget still fails, that argues for a 14-bit converter or pulse compression. Writing it as a dB ledger makes every trade explicit and defensible."
}
},

{
id: "dsp-spectral",
track: "DSP",
sub: "Sampling and transforms",
title: "Spectral estimation and averaging",
mins: 25,
body: `
<p>Take one FFT of a noisy record, square the magnitude, and you have the periodogram,
the raw estimate of the power spectral density. It looks like grass, and here is the
uncomfortable truth interviewers fish for: it does not get better with more data. Each
bin of the periodogram is a random variable whose standard deviation is about equal
to its mean, roughly 100 percent uncertainty, and lengthening the record does not
reduce it. A longer record gives you finer bins, more of them, each individually just
as noisy. Resolution improves; variance does not. The estimate is called inconsistent,
and it is the single most common trap in spectrum questions.</p>
<h3>Welch's method: buy variance with resolution</h3>
<p>The fix is averaging. Split the record into K segments, window each one (Hann is
the default), take the periodogram of each, and average them. Averaging K roughly
independent estimates cuts the variance by about K, so the grass smooths into a
curve. The payment is resolution: each segment is shorter, and bin width is set by
segment length, not record length. Overlapping segments by 50 percent claws back some
of the loss, because windowed segments waste their tapered ends; with Hann and half
overlap you get nearly twice the segment count at little cost in independence.</p>
<p>Worked example: 1 second of data at 10 kS/s. One FFT of the whole record gives
1 Hz bins with 100 percent variance. Ten non-overlapping segments of 0.1 s give 10 Hz
bins with roughly a tenth of the variance, fluctuations down by about sqrt(10), so
just over 3 times steadier. The knob is yours: fine and noisy, or coarse and stable,
from the same data. There is no free option, only the trade.</p>
<h3>Choosing the operating point</h3>
<ul>
<li>Looking for narrow, closely spaced tones: long segments, accept the noise, or
record longer so you can have both.</li>
<li>Estimating a smooth broadband shape, such as an attenuation-vs-frequency slope
from ultrasound echoes: short segments, heavy averaging, since the shape has no fine
structure to lose.</li>
<li>Never quote a spectral feature narrower than 1/T of the segment; it is the
window, not the signal.</li>
</ul>
<h3>Spectrograms and the time-frequency trade</h3>
<p>A spectrogram is the short-time Fourier transform: slide a window along the signal,
FFT each position, stack the columns. The window length sets an uncertainty trade
you cannot beat: frequency resolution is about 1/T for a window of length T, so a 1 ms
window resolves about 1 kHz but places events to 1 ms, while a 0.1 ms window places
events ten times more sharply and blurs frequency ten times worse. The product of
time and frequency resolution is bounded near 1. Chirps and dispersive echoes make
the choice visible: too long a window smears the sweep, too short turns it into
noise. In practice I compute two spectrograms, one long window and one short, and
let the pair bracket the truth.</p>`,
quiz: [
{ q: "Doubling the record length of a single raw periodogram:",
o: ["Halves the variance of each bin", "Removes spectral leakage", "Doubles the variance of each bin", "Gives finer bins, each with the same relative variance as before"],
a: 3, why: "The periodogram is inconsistent: more data buys resolution, not variance reduction; only averaging reduces variance." },
{ q: "Welch's method reduces variance by:",
o: ["Averaging periodograms of windowed, overlapping segments", "Zero padding to a longer FFT", "Using a rectangular window", "Squaring the spectrum twice"],
a: 0, why: "Averaging K roughly independent segment periodograms cuts variance by about K, at the cost of coarser resolution." },
{ q: "A 1 second record split into 10 non-overlapping segments gives frequency resolution of about:",
o: ["0.1 Hz", "1 Hz", "10 Hz", "100 Hz"],
a: 2, why: "Each segment lasts 0.1 s and resolution is one over the segment length, so about 10 Hz." },
{ q: "In a spectrogram, choosing a shorter analysis window gives:",
o: ["Better frequency resolution and worse time resolution", "Better time resolution and worse frequency resolution", "Improvement in both", "No effect on either"],
a: 1, why: "Frequency resolution is about 1/T for window length T, so sharper timing is paid for with blurrier frequency." }
],
interview: {
q: "A colleague shows you a PSD from one long FFT that looks like grass and asks how to make it smoother. What do you tell them?",
a: "First I explain why it is grassy: a single periodogram has roughly 100 percent variance per bin no matter how long the record, so re-measuring longer will not smooth it. The cure is averaging. I would use Welch's method: split the record into segments, Hann window each, overlap by 50 percent, and average the periodograms; ten segments cuts the fluctuations by about a factor of three. The honest caveat is resolution: bins widen to one over the segment length, so if they are hunting closely spaced tones we need longer segments and therefore a longer total record to have both. I would also ask what feature they actually need, since a broadband shape tolerates heavy averaging happily."
}
},

{
id: "dsp-timing",
track: "DSP",
sub: "Detection and estimation",
title: "Time-delay estimation and envelopes",
mins: 30,
body: `
<p>Time-of-flight is the raw material of ultrasound measurement: thickness, sound
speed, range, all come from asking when an echo arrived. The methods differ in how
they define when, and the differences are systematic errors, not noise.</p>
<h3>Cross-correlation: the reference method</h3>
<p>Cross-correlate the received record with a reference pulse (a captured echo from a
known reflector, or the modelled transmit pulse). The lag of the correlation peak is
the delay estimate. This is the matched filter reappearing as a timing instrument,
and it is provably the best estimator when the pulse shape is known and the noise is
white. Its precision improves with both SNR and bandwidth: wide, clean pulses can be
timed to a small fraction of a carrier period. Its weakness is pulse-shape change:
frequency-dependent attenuation reshapes the echo relative to the reference and
drags the peak, so in strongly attenuating materials the reference must be chosen
with care.</p>
<h3>Sub-sample interpolation</h3>
<p>The true peak of the correlation almost never lands on a sample. Take the peak
sample y0 and its neighbours ym and yp, fit a parabola, and the vertex sits at a
fractional offset from the peak sample:</p>
<pre>delta = 0.5 * (ym - yp) / (ym - 2*y0 + yp)      (in samples, between -0.5 and 0.5)</pre>
<p>Sanity checks: a symmetric peak (ym equal to yp) gives delta of zero, and any
answer outside half a sample means the wrong peak was picked. With decent SNR this
routinely delivers a tenth of a sample or better. The stakes in numbers: at 100 MS/s
a sample is 10 ns, which in water (c of 1500 m/s) is 7.5 micrometres of pulse-echo
range; a tenth of a sample brings that below a micrometre. Parabolic fitting has a
small systematic pull towards the centre sample; cosine fitting or correlating on an
upsampled signal reduces it when the last drop of accuracy matters.</p>
<h3>Envelopes via the Hilbert transform</h3>
<p>An echo is a carrier wiggling under a smooth envelope, and often the envelope is
what you want to time. The Hilbert transform builds the analytic signal (the original
as the real part, its 90 degree shifted twin as the imaginary part), and the
magnitude of that complex signal is the envelope, with the carrier oscillation
removed. The practical win: a reflection off a boundary can flip or shift the carrier
phase, which hops the tallest RF peak by half a period, while the envelope peak stays
put. Envelope timing is phase-insensitive, at the cost of a blunter peak, which is
wider than the RF wiggles and so intrinsically less precise.</p>
<h3>Threshold vs peak picking</h3>
<ul>
<li><b>First threshold crossing</b>: simple and fast, and it works on a
microcontroller in real time. Systematic flaw: a stronger echo crosses the threshold
earlier on its rising edge, so arrival time depends on amplitude. Constant-fraction
schemes, thresholding at a fixed fraction of each echo's own peak, largely remove
this bias.</li>
<li><b>Envelope peak</b>: amplitude-robust and phase-robust, but pulled later by
frequency-dependent attenuation reshaping the envelope.</li>
<li><b>Correlation peak with sub-sample fit</b>: the precision champion when the
shape is stable and a reference exists.</li>
</ul>
<p>The interview move is to name the systematic error of whichever method is proposed,
then say which error your application can afford.</p>`,
quiz: [
{ q: "Parabolic sub-sample interpolation of a correlation peak uses:",
o: ["The peak sample and its two neighbours, fitted with a parabola whose vertex gives the fractional lag", "A least-squares refit of the whole record", "The zero crossings of the carrier only", "The phase of the FFT at DC"],
a: 0, why: "Three points define the parabola; its vertex offset delta = 0.5*(ym - yp)/(ym - 2*y0 + yp) refines the integer lag." },
{ q: "At 100 MS per second in water (c of 1500 m per second), a one-sample timing error corresponds to a pulse-echo range error of about:",
o: ["0.75 micrometres", "75 micrometres", "7.5 micrometres", "1.5 millimetres"],
a: 2, why: "One sample is 10 ns; range is c*t/2, so 1500 * 10e-9 / 2 = 7.5 micrometres." },
{ q: "The envelope of a band-pass echo is obtained by:",
o: ["Squaring the signal and low-pass filtering twice", "Taking the magnitude of the analytic signal built with the Hilbert transform", "High-pass filtering above the carrier", "Averaging adjacent samples"],
a: 1, why: "The analytic signal pairs the record with its 90 degree shifted version; its complex magnitude is the carrier-free envelope." },
{ q: "The main systematic error of first-threshold-crossing arrival picking is:",
o: ["It requires an FFT per echo", "It is too slow for real time", "It cannot work on the envelope", "Stronger echoes cross the fixed threshold earlier, so measured arrival depends on amplitude"],
a: 3, why: "The rising edge reaches a fixed level sooner when the echo is larger; constant-fraction discrimination removes most of this bias." }
],
interview: {
q: "Your sample clock is 100 MS per second but the customer wants sub-nanosecond time-of-flight repeatability. How do you deliver it?",
a: "Sub-nanosecond is a tenth of a sample, which is routine with the right pipeline rather than exotic. I cross-correlate each received echo against a captured reference pulse, because correlation timing uses the whole waveform and is optimal for a known shape. I then refine the integer-lag peak with parabolic interpolation over three points, which reaches a tenth of a sample at moderate SNR, and I raise SNR with coherent averaging if the target is static. The things that actually break the budget are systematic: trigger jitter, clock stability, filter group delay, and pulse-shape change from attenuation dragging the correlation peak. So I verify against a fixed reflector, watch the spread over repeats, and quote repeatability and accuracy separately."
}
}

);
