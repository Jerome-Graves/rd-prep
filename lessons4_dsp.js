// DSP: statistical signal processing.
//
// The track could design a filter but had nothing on what a measurement is worth.
// Random signals, how good an estimator can possibly be, maximum likelihood,
// model-based spectra, subspace methods, and putting error bars on a result.

LESSONS.push(

{
id: "dsp-random",
track: "DSP",
sub: "Statistical signal processing",
title: "Random signals: autocorrelation, PSD and stationarity",
mins: 22,
body: `
<p>Most real signals are not deterministic waveforms you can write down. They are realisations of
a random process, and the useful description is statistical: not what the signal is, but what its
averages are. That shift is what makes noise something you can design against.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A random process described by its autocorrelation, related by Fourier transform to its power spectral density">
<rect class="bx" x="24" y="26" width="308" height="96" rx="4"/>
<text class="th" x="40" y="52">autocorrelation</text>
<text class="ts" x="40" y="78">how much the signal at time t</text>
<text class="ts" x="40" y="102">tells you about time t plus tau</text>

<rect class="bxa" x="348" y="26" width="308" height="96" rx="4"/>
<text class="th" x="364" y="52">power spectral density</text>
<text class="ts" x="364" y="78">how the power is distributed</text>
<text class="ts" x="364" y="102">across frequency</text>

<rect class="bx" x="24" y="138" width="632" height="42" rx="4"/>
<text class="th" x="40" y="164">they are a Fourier transform pair: the same information, two views</text>
<rect class="bx" x="24" y="190" width="632" height="42" rx="4"/>
<text class="ts" x="40" y="216">white noise: zero correlation at any lag, therefore flat across frequency</text>
</svg>

<p>The <b>autocorrelation</b> asks how much the signal at one instant tells you about the signal a
lag later. White noise has none beyond zero lag, so each sample is uninformative about the next.
A slowly varying process has correlation over long lags. That single function captures the
second-order structure of the process.</p>

<p>The <b>power spectral density</b> is its Fourier transform, and the two carry the same
information viewed differently. It is worth internalising why white noise is flat: zero
correlation at every non-zero lag transforms to constant power at every frequency. Filtering shapes
that, so "white" and "coloured" describe correlation and spectrum simultaneously.</p>

<p><b>Stationarity</b> is the assumption that makes any of this usable. A process is stationary in
the wide sense if its mean is constant and its autocorrelation depends only on the lag, not on
absolute time. Nearly every standard technique assumes it, and real signals violate it: a drifting
baseline, a warming instrument, a moving target. That is why you either window into segments short
enough to be approximately stationary, or use methods designed for change.</p>

<p><b>Ergodicity</b> is a second assumption, usually left unstated: that a time average over one
long record equals an ensemble average over many records. It is what lets you estimate statistics
from the single measurement you actually have, and it is exactly what fails when the process
drifts.</p>

<p>Filtering has a clean statistical statement: passing a process through a filter multiplies its
power spectral density by the squared magnitude response. So the output noise power is the input
density integrated against that response, which is the basis of every noise budget, and it is why
narrowing a bandwidth reduces noise power proportionally.</p>

<p>The practical payoff is knowing what to check first. Before estimating a spectrum, plot the
signal and ask whether the mean drifts, whether the variance changes through the record, and
whether the character changes. If it does, the stationarity assumption is broken and the spectrum
you are about to compute is an average of things that should not be averaged.</p>
`,
quiz: [
{ q: "What is the relationship between autocorrelation and power spectral density?",
o: ["The PSD is the square of the autocorrelation", "They are a Fourier transform pair carrying the same information", "The autocorrelation is the PSD of the derivative", "They are unrelated descriptions"],
a: 1, why: "That is why white noise, having zero correlation at every non-zero lag, has constant power at every frequency." },
{ q: "What does wide-sense stationarity require?",
o: ["Zero mean and unit variance", "Constant mean and an autocorrelation depending only on lag", "A Gaussian amplitude distribution", "A flat power spectral density"],
a: 1, why: "Nearly every standard technique assumes it, and drifting baselines, warming instruments and moving targets all break it." },
{ q: "What does ergodicity let you do?",
o: ["Assume the noise is Gaussian", "Estimate statistics from one long record rather than many records", "Ignore the mean of the process", "Treat filtering as multiplication"],
a: 1, why: "It is usually left unstated, and it is precisely what fails when the process drifts during the measurement." },
{ q: "What does filtering do to a power spectral density?",
o: ["Shifts it in frequency", "Multiplies it by the squared magnitude response", "Convolves it with the impulse response", "Leaves it unchanged and scales the mean"],
a: 1, why: "That statement is the basis of every noise budget, and it is why halving the bandwidth halves the noise power." }
],
interview: {
q: "How would you characterise the noise in a measurement system?",
a: "I would treat the noise as a random process and describe it statistically rather than trying to describe the waveform, which means the two things I want are the autocorrelation and its Fourier transform, the power spectral density. They carry the same information in two views, and the spectral one is usually more useful because filtering acts on it simply: passing a process through a filter multiplies its density by the squared magnitude response, so the output noise power is that integral, which is exactly what a noise budget is. Practically I would record a long stretch of data with the instrument doing nothing, or with a known quiet input, and estimate the density by averaging periodograms over segments, because a single periodogram is a very noisy estimate no matter how long the record. Before I trusted any of it, though, I would plot the raw record and check the assumptions, because both the standard estimators assume stationarity and ergodicity. Stationarity means the mean is constant and the correlation depends only on lag rather than on absolute time, and real systems break that constantly with a drifting baseline, a warming instrument, or something changing in the environment. Ergodicity is the assumption that a time average over my one record stands in for an average over many records, and it is exactly what fails when there is drift. So I would look at whether the mean wanders, whether the variance changes through the record, and whether the character changes, and if it does I would segment into pieces short enough to be approximately stationary and treat the drift separately rather than letting it contaminate the spectrum. Then the shape of the density tells me what I am dealing with: flat is thermal, a slope rising at low frequency is flicker noise, and discrete lines are interference with a specific source I should go and find."
}
},

{
id: "dsp-estimation",
track: "DSP",
sub: "Statistical signal processing",
title: "How good can an estimate be: bias, variance and the bound",
mins: 22,
body: `
<p>Any measurement derived from noisy data is an estimate, and estimates have properties worth
knowing before you argue about algorithms. Two questions matter: is it centred on the truth, and
how much does it scatter. The surprising part is that there is a limit on the second, computable
in advance from the physics.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Four estimators shown as scatter about a target: unbiased and low variance, unbiased and high variance, biased and low variance, and both">
<rect class="bxa" x="24" y="26" width="308" height="86" rx="4"/>
<text class="th" x="40" y="52">unbiased, low variance</text>
<text class="ts" x="40" y="80">centred, and tight: what you want</text>
<rect class="bx" x="348" y="26" width="308" height="86" rx="4"/>
<text class="th" x="364" y="52">unbiased, high variance</text>
<text class="ts" x="364" y="80">right on average, useless once</text>
<rect class="bx" x="24" y="126" width="308" height="86" rx="4"/>
<text class="th" x="40" y="152">biased, low variance</text>
<text class="ts" x="40" y="180">repeatable, and wrong</text>
<rect class="bx" x="348" y="126" width="308" height="86" rx="4"/>
<text class="th" x="364" y="152">the bound</text>
<text class="ts" x="364" y="180">no unbiased estimator beats it</text>
</svg>

<p><b>Bias</b> is the difference between the average of the estimate and the true value.
<b>Variance</b> is how much it scatters from one measurement to the next. They are different
failures: a biased estimator is repeatably wrong, which calibration can sometimes fix, while a
high-variance one is right on average and useless on any single measurement, which only averaging
can fix.</p>

<p>Combining them, the <b>mean squared error</b> is variance plus bias squared, and that reveals
something important: a biased estimator can beat an unbiased one. Deliberately accepting a little
bias to remove a lot of variance is what regularisation, smoothing and shrinkage all do, and it is
a legitimate engineering choice rather than a compromise.</p>

<p>The <b>Cramer-Rao bound</b> is the reason this topic is practical rather than academic. Given a
model of the signal and the noise, it gives a lower limit on the variance of any unbiased
estimator. It depends on how sharply the likelihood changes as the parameter changes, which is a
statement about how much the measurement actually distinguishes one value from another.</p>

<p>Two uses follow immediately. It tells you whether an algorithm is worth improving: an estimator
already close to the bound cannot be beaten by cleverness, only by changing the measurement. And
it tells you, before building anything, what precision the physics permits, so a specification can
be assessed rather than hoped for.</p>

<p>The bound's structure is informative in itself. For time delay it improves with bandwidth and
with signal to noise ratio, so a wider pulse bandwidth buys precision directly. For frequency
estimation from a record it improves with the cube of the record length, which is why a longer
observation helps far more than a finer FFT. Those scalings are design guidance.</p>

<p>Two cautions. The bound assumes the <b>model is right</b>, so a real system with unmodelled
effects will not reach it and the gap is diagnostic rather than a failure of the algorithm. And it
is a bound on <b>unbiased</b> estimators, so a biased one may have lower error without
contradiction.</p>
`,
quiz: [
{ q: "How do bias and variance fail differently?",
o: ["Bias affects precision, variance affects accuracy", "A biased estimator is repeatably wrong; a high-variance one is right on average but useless once", "Bias only occurs with small samples", "Variance can always be removed by calibration"],
a: 1, why: "Calibration can sometimes remove bias, and only averaging reduces variance, so the two demand different responses." },
{ q: "Why can a biased estimator beat an unbiased one?",
o: ["Bias cancels in the mean", "Mean squared error is variance plus bias squared, so trading a little bias for much less variance wins", "Unbiased estimators are always slower", "It cannot; unbiased is always better"],
a: 1, why: "That trade is exactly what regularisation, smoothing and shrinkage do, and it is a legitimate engineering choice." },
{ q: "What does the Cramer-Rao bound tell you?",
o: ["The best achievable bias", "A lower limit on the variance of any unbiased estimator, given the model", "How many samples are needed", "The optimal filter shape"],
a: 1, why: "An estimator already near the bound cannot be improved by cleverness, only by changing the measurement itself." },
{ q: "Why does a longer record help frequency estimation so much?",
o: ["It gives a finer FFT bin spacing", "The bound improves with the cube of record length", "Noise averages out linearly", "It reduces spectral leakage"],
a: 1, why: "That scaling is design guidance: a longer observation buys far more than interpolating a finer spectrum from a short one." }
],
interview: {
q: "How would you decide whether a time-delay estimator is good enough?",
a: "I would compare it against the Cramer-Rao bound rather than against my intuition, because the bound tells me the lowest variance any unbiased estimator can achieve given the signal and the noise, and that turns a vague question into a number. For time delay the bound improves with the effective bandwidth of the pulse and with signal to noise ratio, so I can compute what precision is physically available before writing any algorithm. Then I would run the estimator over many noise realisations in simulation, with everything else known, and measure two things: the mean of the estimate against the true delay, which gives me the bias, and the scatter, which gives me the variance. If the variance sits close to the bound, the algorithm is essentially done and any further work has to change the measurement, more bandwidth, more averaging, better signal to noise, rather than the processing. If it sits well above the bound, there is real headroom and it is worth looking at whether I am using all the information, for instance whether a matched filter with the true pulse shape and sub-sample interpolation would do better than a threshold crossing. The bias matters separately, because a bias is repeatably wrong and no amount of averaging removes it, whereas variance falls with averaging, so I would want to know which failure I have. Two cautions I would carry. The bound assumes the model is right, so on real data with unmodelled effects, dispersion, multipath, a pulse shape that is not what I assumed, the estimator will not reach it, and the size of that gap is diagnostic about what the model is missing rather than a failure of the algorithm. And the bound applies to unbiased estimators, so a deliberately biased one, a regularised or smoothed estimate, can have lower total error without contradicting it, which is often the right choice at low signal to noise."
}
},

{
id: "dsp-mle",
track: "DSP",
sub: "Statistical signal processing",
title: "Maximum likelihood and least squares",
mins: 22,
body: `
<p>Given data and a model with unknown parameters, there is a principled way to choose the
parameters rather than a collection of tricks. Maximum likelihood asks which parameter values make
the data you actually observed most probable, and a great deal of familiar practice turns out to
be a special case of it.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A likelihood surface over a parameter, peaked at the estimate, with curvature at the peak indicating precision">
<rect class="bx" x="24" y="24" width="632" height="44" rx="4"/>
<text class="th" x="40" y="50">model: what the data would look like for each parameter value</text>
<rect class="bxa" x="24" y="78" width="632" height="44" rx="4"/>
<text class="th" x="40" y="104">likelihood: how probable the observed data is, for each value</text>
<rect class="bx" x="24" y="132" width="308" height="44" rx="4"/>
<text class="th" x="40" y="158">the peak is the estimate</text>
<rect class="bx" x="348" y="132" width="308" height="44" rx="4"/>
<text class="th" x="364" y="158">its sharpness is the precision</text>
<rect class="bx" x="24" y="186" width="632" height="44" rx="4"/>
<text class="ts" x="40" y="212">Gaussian noise makes maximising the likelihood identical to least squares</text>
</svg>

<p>The key result is that with <b>independent Gaussian noise of equal variance</b>, maximising the
likelihood is exactly minimising the sum of squared residuals. So least squares is not an
arbitrary choice of error measure; it is the maximum likelihood estimator under a specific and
often reasonable noise assumption, and knowing that tells you when it is the wrong choice.</p>

<p>It is wrong when the noise is not Gaussian or not equal across samples. If some samples are
noisier, the likelihood weights them less, which gives <b>weighted</b> least squares, and using
unweighted least squares there throws away information. If the noise has outliers, the Gaussian
assumption is badly wrong, because squaring makes one bad point dominate, which is why robust
estimators replace the square with something that grows more slowly.</p>

<p>The <b>linear</b> case, where the model is linear in the parameters, has a closed-form solution
and is the workhorse: fitting a polynomial, calibrating a sensor, solving for coefficients. It is
also numerically delicate, because forming the normal equations squares the condition number, so a
QR or SVD-based solve is the right implementation rather than inverting a matrix.</p>

<p>The <b>nonlinear</b> case, where the parameter enters nonlinearly, needs iteration, and brings
the usual difficulties: local minima, sensitivity to the starting point, and convergence that
depends on scaling. Grid searching the likelihood coarsely and then refining is often more robust
than trusting an optimiser from an arbitrary start.</p>

<p>The likelihood surface gives more than the estimate. Its <b>curvature</b> at the peak is the
Fisher information, so the same computation that produces the estimate produces an uncertainty for
it, and a flat ridge in the surface tells you two parameters are not separately identifiable from
this data, which is a design problem rather than a numerical one.</p>

<p>Adding a <b>prior</b> turns this into maximum a posteriori estimation, which in the Gaussian
case is exactly regularised least squares. So a penalty term on the solution is not an ad hoc
stabiliser; it is a statement about what you believed before seeing the data, and it is worth
being able to say what that statement is.</p>
`,
quiz: [
{ q: "What does least squares correspond to statistically?",
o: ["An arbitrary but convenient error measure", "Maximum likelihood under independent Gaussian noise of equal variance", "The minimum variance estimator for any noise", "A Bayesian estimator with a flat prior"],
a: 1, why: "Knowing the assumption tells you when it is wrong: unequal noise calls for weighting, and outliers break it badly." },
{ q: "Why do outliers break least squares?",
o: ["They violate stationarity", "Squaring lets one bad point dominate the fit", "They bias the mean", "They make the problem nonlinear"],
a: 1, why: "Robust estimators replace the square with a function growing more slowly, which limits how much any single point can pull the solution." },
{ q: "Why solve linear least squares with QR or SVD rather than the normal equations?",
o: ["It is faster", "Forming the normal equations squares the condition number", "It handles nonlinear models", "It gives uncertainty estimates directly"],
a: 1, why: "The accuracy lost is real on any ill-conditioned fit, and inverting a matrix explicitly is worse still." },
{ q: "What does a flat ridge in the likelihood surface indicate?",
o: ["The optimiser has not converged", "Two parameters are not separately identifiable from this data", "The noise is non-Gaussian", "The model is overfitted"],
a: 1, why: "That is a measurement design problem rather than a numerical one, and no algorithm will resolve it without different data." }
],
interview: {
q: "You are fitting a model to noisy measurements. How do you choose the fitting criterion?",
a: "I would start from what I believe about the noise, because that determines the criterion rather than the other way round. Maximum likelihood asks which parameter values make the data I actually observed most probable, and if the noise is independent, Gaussian and the same size on every sample, maximising that likelihood is exactly minimising the sum of squared residuals. So least squares is not an arbitrary choice, it is the right estimator under a specific assumption, and stating the assumption tells me when to depart from it. If some measurements are noisier than others, the likelihood weights them less, so I use weighted least squares, and using the unweighted version there is simply discarding information I have. If the data contains outliers, the Gaussian assumption is badly wrong, because squaring lets one bad point dominate the entire fit, so I would use a robust criterion that grows more slowly than the square, or detect and handle the outliers explicitly if they have a physical explanation. If the noise is multiplicative or the quantity is positive and spans orders of magnitude, fitting in the log domain is often closer to the truth. On implementation, if the model is linear in the parameters there is a closed form, but I would solve it with QR or SVD rather than forming the normal equations, because that squares the condition number and loses real accuracy on any ill-conditioned fit. If it is nonlinear I would grid search coarsely first and then refine, because local minima and start-point sensitivity are the usual failure. And I would use the likelihood surface for more than the answer: its curvature at the peak gives me the uncertainty on the estimate for free, and a flat ridge tells me two parameters are not separately identifiable from this data, which is a measurement design problem no optimiser will fix."
}
},

{
id: "dsp-parametric",
track: "DSP",
sub: "Statistical signal processing",
title: "Parametric spectra: AR models and where they beat the FFT",
mins: 22,
body: `
<p>A periodogram makes no assumption about the signal, which is its strength and its limitation.
Resolution is set by record length, and a short record gives a blurred spectrum no matter what you
do. Parametric methods fit a model instead, and if the model suits the signal, they resolve
detail the transform cannot.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A periodogram limited by record length against an autoregressive fit producing a smooth spectrum with sharper peaks">
<rect class="bx" x="24" y="26" width="308" height="120" rx="4"/>
<text class="th" x="40" y="52">periodogram</text>
<text class="ts" x="40" y="80">assumes nothing</text>
<text class="ts" x="40" y="104">resolution set by record length</text>
<text class="ts" x="40" y="130">noisy, and honest about it</text>

<rect class="bxa" x="348" y="26" width="308" height="120" rx="4"/>
<text class="th" x="364" y="52">autoregressive fit</text>
<text class="ts" x="364" y="80">assumes poles, no zeros</text>
<text class="ts" x="364" y="104">sharp peaks from short records</text>
<text class="ts" x="364" y="130">smooth, and can invent detail</text>

<rect class="bx" x="24" y="162" width="632" height="68" rx="4"/>
<text class="th" x="40" y="190">the model is doing the work</text>
<text class="ts" x="40" y="214">so the answer is only as good as the assumption behind it</text>
</svg>

<p>An <b>autoregressive</b> model says the signal is white noise driven through an all-pole filter,
so each sample is a weighted sum of previous samples plus an innovation. Fitting the coefficients
gives the filter, and the filter's response is the estimated spectrum. Because poles produce sharp
peaks, it is well suited to signals that really are a few resonances in noise, which covers a great
many physical systems.</p>

<p>The fit itself is a linear prediction problem solved by least squares, and the efficient
solution exploits the structure of the correlation matrix, which is why it is cheap enough to
run continuously. Related models add zeros, which suits signals with notches as well as
peaks.</p>

<p>The critical parameter is the <b>model order</b>. Too low and peaks merge or disappear. Too
high and the model starts fitting the noise, producing spurious peaks that look completely
convincing. Order selection criteria trade fit against complexity, and a practical habit is to
plot the spectrum at several orders and only trust features that persist.</p>

<p>The comparison is honest if stated plainly. The periodogram is <b>non-parametric</b>: noisy,
limited in resolution, and it will not lie to you about structure that is not there. The
autoregressive estimate is smooth and high resolution <b>because the model supplies information
the data does not contain</b>. When the model fits, that is a real gain; when it does not, the
peaks are artefacts.</p>

<p>So the decision rule is about the signal and the record. Short records, where resolution is
limited and the physics genuinely is resonant, favour parametric methods. Long records, unknown or
broadband structure, or any situation where you need to defend the result, favour averaged
periodograms.</p>

<p>The safe practice is to compute both. Agreement is reassuring; disagreement tells you which
features depend on the modelling assumption, which is exactly the thing to know before quoting a
result.</p>
`,
quiz: [
{ q: "What does an autoregressive model assume about the signal?",
o: ["It is a sum of sinusoids", "It is white noise driven through an all-pole filter", "It is stationary and Gaussian only", "It has zeros but no poles"],
a: 1, why: "Poles produce sharp peaks, which suits signals that really are a few resonances in noise, and that covers many physical systems." },
{ q: "Why can an AR spectrum resolve detail a periodogram cannot?",
o: ["It uses a longer effective record", "The model supplies information the data does not contain", "It removes noise before transforming", "It uses a better window"],
a: 1, why: "When the model fits the physics that is a real gain, and when it does not the extra detail is an artefact." },
{ q: "What happens if the model order is too high?",
o: ["Peaks merge together", "The model fits the noise and produces convincing spurious peaks", "The fit fails to converge", "Resolution decreases"],
a: 1, why: "A practical habit is to plot the spectrum at several orders and trust only the features that persist across them." },
{ q: "When is a parametric method the better choice?",
o: ["Long records with broadband structure", "Short records where the physics genuinely is resonant", "Any case where the result must be defended", "When the noise is non-Gaussian"],
a: 1, why: "Long records, unknown structure, or a result you must defend all favour an averaged periodogram, which will not invent structure." }
],
interview: {
q: "When would you use a parametric spectral estimate instead of an FFT?",
a: "When the record is short, the resolution I need is finer than the record length allows, and I have a genuine physical reason to believe the signal is a small number of resonances in noise. That combination is where an autoregressive estimate earns its keep, because it fits an all-pole filter driven by white noise and then reports the filter's response as the spectrum, and poles give sharp peaks, so it can separate two resonances that a periodogram of the same record would blur into one. Machine vibration, modal analysis, a resonant sensor, a lightly damped structure: those fit the model. What I would be careful to say is why it works, because it is not magic. The periodogram makes no assumption, so it is noisy and its resolution is limited by record length, and it will not lie to me about structure that is not there. The parametric estimate is smooth and high resolution because the model supplies information the data does not contain. When the model matches the physics, that is a real gain. When it does not, the peaks are artefacts and they look entirely convincing, which is the danger. The parameter that decides this is the model order: too low and peaks merge or vanish, too high and it starts fitting the noise and generating spurious peaks. So I would use an order selection criterion but not trust it blindly, and I would plot the spectrum across a range of orders and only believe features that persist. In practice I would compute both estimates. If they agree, I am reassured. If they disagree, that immediately tells me which features depend on the modelling assumption, and those are the ones I would not quote without more data. If I needed to defend a number to someone else, I would lead with the averaged periodogram."
}
},

{
id: "dsp-subspace",
track: "DSP",
sub: "Statistical signal processing",
title: "Subspace methods and super-resolution",
mins: 22,
body: `
<p>When the signal really is a small number of sinusoids or arrivals in noise, there is a family of
methods that separates them far better than any transform, by exploiting the structure of the
correlation matrix rather than by transforming the data.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Eigenvalues of the correlation matrix splitting into a few large signal values and many small noise values, defining two orthogonal subspaces">
<rect class="bx" x="24" y="26" width="632" height="46" rx="4"/>
<text class="th" x="40" y="52">eigen-decompose the correlation matrix</text>

<rect class="bxa" x="24" y="86" width="308" height="96" rx="4"/>
<text class="th" x="40" y="112">signal subspace</text>
<text class="ts" x="40" y="138">a few large eigenvalues</text>
<text class="ts" x="40" y="164">one per source</text>

<rect class="bx" x="348" y="86" width="308" height="96" rx="4"/>
<text class="th" x="364" y="112">noise subspace</text>
<text class="ts" x="364" y="138">the rest, all similar</text>
<text class="ts" x="364" y="164">orthogonal to the signals</text>

<rect class="bx" x="24" y="196" width="632" height="36" rx="4"/>
<text class="ts" x="40" y="220">scan for the frequencies orthogonal to the noise subspace: sharp peaks</text>
</svg>

<p>The idea is that the correlation matrix of a few sinusoids plus white noise has a specific
structure. Its eigenvalues split into a small number that are large, one per source, and the rest
which are all equal to the noise power. The corresponding eigenvectors divide the space into a
<b>signal subspace</b> and a <b>noise subspace</b>, and those are orthogonal.</p>

<p>That orthogonality is the whole method. A steering vector at a true source frequency lies in the
signal subspace, so it is orthogonal to every noise eigenvector. Scanning frequency and plotting
the reciprocal of the projection onto the noise subspace produces very sharp peaks at the true
frequencies, which is what "super-resolution" means: resolution not limited by record length or
aperture.</p>

<p>A related approach exploits a <b>shift structure</b> in the signal subspace to solve for the
frequencies directly, without scanning, which is faster and avoids the peak-finding step.</p>

<p>The price is a set of strong requirements, and each one is a real failure mode. You must know
the <b>number of sources</b>, and getting it wrong loses a source or invents one. The <b>noise
must be white</b> across the samples or sensors, or the eigenvalue split is not clean, which is why
whitening comes first when it is not. And the correlation matrix must be estimated well, which
needs enough independent snapshots.</p>

<p><b>Coherent</b> sources, which is exactly what multipath and specular reflection give you, break
the method because two fully correlated arrivals produce one eigenvalue rather than two. Spatial
smoothing restores the rank at the cost of effective aperture, and it is essential in any reflective
environment.</p>

<p>The judgement to carry is that these methods are excellent when their assumptions hold and
degrade sharply rather than gracefully when they do not. So the sensible practice is to use them
where the model is defensible, alongside a conventional estimate, and to treat a resolved pair that
appears only in the subspace result as a hypothesis rather than a measurement.</p>
`,
quiz: [
{ q: "What structure do subspace methods exploit?",
o: ["The sparsity of the spectrum", "Eigenvalues splitting into a few large signal values and equal noise values", "The Fourier transform of the autocorrelation", "The linearity of the array response"],
a: 1, why: "The corresponding signal and noise eigenvectors are orthogonal, and that orthogonality is what produces the sharp peaks." },
{ q: "What must you know before applying MUSIC?",
o: ["The signal to noise ratio", "The number of sources", "The noise distribution", "The exact record length"],
a: 1, why: "Getting it wrong either loses a source or invents one, and the estimate degrades sharply rather than gracefully." },
{ q: "Why do coherent sources break subspace methods?",
o: ["They violate stationarity", "Two fully correlated arrivals produce one eigenvalue rather than two", "They colour the noise", "They shift the steering vectors"],
a: 1, why: "Multipath and specular reflection give exactly this, and spatial smoothing restores the rank at the cost of effective aperture." },
{ q: "What does super-resolution mean here?",
o: ["Higher sampling rate than Nyquist", "Resolution not limited by record length or aperture", "Resolution beyond the noise floor", "Sub-sample interpolation of peaks"],
a: 1, why: "It comes from the model, so a pair resolved only by a subspace method should be treated as a hypothesis rather than a measurement." }
],
interview: {
q: "Two arrivals are closer together than your bandwidth can resolve. What options do you have?",
a: "The transform-based answer is limited by the time-bandwidth product, so if the two arrivals are within a pulse length of each other, no window or interpolation will separate them, because that information is genuinely not present in a model-free view of the data. What can separate them is a model, and that is what subspace methods provide. If I can reasonably assert that the signal is a small number of discrete arrivals in white noise, I can form the correlation matrix and eigen-decompose it. The eigenvalues split into a few large ones, one per arrival, and the rest all equal to the noise power, and the corresponding eigenvectors split the space into a signal subspace and a noise subspace which are orthogonal. Then scanning delay and plotting the reciprocal of the projection onto the noise subspace gives very sharp peaks at the true arrivals, and resolution is no longer set by the pulse bandwidth. There are variants that solve for the parameters directly using a shift structure rather than scanning, which avoids peak finding. The reason I would be cautious rather than enthusiastic is that the requirements are strict and the failure is sharp rather than graceful. I have to know the number of arrivals, and getting that wrong either merges two or invents one. The noise has to be white across the snapshots or I have to whiten it first, or the eigenvalue split is not clean. I need enough independent snapshots to estimate the correlation matrix properly. And crucially, coherent arrivals break it completely, because two fully correlated paths produce one eigenvalue rather than two, which is exactly what specular reflection and multipath give me, so I would need spatial or frequency smoothing to restore the rank, at the cost of effective aperture. So in practice I would run it alongside a conventional estimate, and treat any pair that resolves only in the subspace result as a hypothesis to test rather than a measurement to quote."
}
},

{
id: "dsp-montecarlo",
track: "DSP",
sub: "Statistical signal processing",
title: "Error bars: Monte Carlo, the bootstrap and propagation",
mins: 22,
body: `
<p>A measurement without an uncertainty is not a measurement. For anything more complicated than a
mean, the uncertainty is rarely available in closed form, and the practical answer is to compute
it numerically rather than to derive it.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Three routes to an uncertainty: analytic propagation, Monte Carlo simulation from a model, and the bootstrap resampling real data">
<rect class="bx" x="24" y="26" width="632" height="56" rx="4"/>
<text class="th" x="40" y="52">propagation of uncertainty</text>
<text class="ts" x="40" y="72">exact for linear, an approximation otherwise, and cheap</text>
<rect class="bxa" x="24" y="94" width="632" height="56" rx="4"/>
<text class="th" x="40" y="120">Monte Carlo</text>
<text class="ts" x="40" y="140">simulate the whole chain many times; needs a noise model you trust</text>
<rect class="bx" x="24" y="162" width="632" height="68" rx="4"/>
<text class="th" x="40" y="188">bootstrap</text>
<text class="ts" x="40" y="208">resample the real data; needs no noise model at all</text>
<text class="ts" x="40" y="226">but assumes the samples are exchangeable</text>
</svg>

<p><b>Propagation</b> is the analytic route: express the result as a function of the inputs,
differentiate, and combine the input variances weighted by those sensitivities. It is exact when
the function is linear, a first-order approximation otherwise, and it fails when a derivative is
large, when inputs are correlated and treated as independent, or when the function is
non-monotonic near the operating point.</p>

<p><b>Monte Carlo</b> replaces the algebra with repetition: draw inputs from their distributions,
run the whole processing chain, and look at the spread of the outputs. Its great advantage is that
it handles arbitrary nonlinearity, thresholds, and discrete decisions, all of which defeat
propagation. Its requirement is a noise model you actually believe, since the result inherits every
assumption in the generator.</p>

<p>The <b>bootstrap</b> avoids that requirement entirely. Resample the measured data with
replacement, recompute the result on each resample, and use the spread as the uncertainty. It works
because the empirical distribution of the data stands in for the unknown true one, and it needs no
model of the noise at all, which makes it valuable when you do not trust yours.</p>

<p>Its assumption is that the samples are <b>exchangeable</b>, and that is where it goes wrong on
signals: correlated samples resampled independently destroy the correlation, so the uncertainty
comes out far too small. The fix on a time series is to resample in <b>blocks</b> long enough to
preserve the correlation structure.</p>

<p>A practical point that matters more than the choice of method: uncertainty from noise is often
the smallest term. Calibration, temperature, alignment, and the difference between the model and
reality usually dominate, and a repeatability figure that quotes only the statistical part is
misleadingly small. Repeating the whole measurement, including setup, is the honest estimate.</p>

<p>The habit worth building is to produce an uncertainty alongside every result as a matter of
course, because it changes decisions. Two numbers that differ by less than their uncertainties are
the same number, and a great deal of engineering effort has been spent chasing differences that
were never real.</p>
`,
quiz: [
{ q: "When does analytic propagation of uncertainty fail?",
o: ["When the inputs are Gaussian", "When derivatives are large, inputs are correlated, or the function is strongly nonlinear", "When there are many inputs", "When the output is a ratio"],
a: 1, why: "It is exact for a linear function and a first-order approximation otherwise, which is why nonlinearity and thresholds defeat it." },
{ q: "What does Monte Carlo require that the bootstrap does not?",
o: ["Many repetitions", "A noise model you actually believe", "A linear processing chain", "Independent samples"],
a: 1, why: "The Monte Carlo result inherits every assumption in the generator, whereas the bootstrap uses the empirical distribution of real data." },
{ q: "Why does a naive bootstrap fail on a time series?",
o: ["The samples are not Gaussian", "Resampling correlated samples independently destroys the correlation, understating uncertainty", "There are too few samples", "The mean is not stationary"],
a: 1, why: "Resampling in blocks long enough to preserve the correlation structure is the standard fix." },
{ q: "Why is a statistical uncertainty often misleadingly small?",
o: ["Noise is usually overestimated", "Calibration, temperature, alignment and model error usually dominate", "The bootstrap underestimates by construction", "Averaging removes most of it"],
a: 1, why: "Repeating the whole measurement including setup, rather than reprocessing one record, is the honest estimate of repeatability." }
],
interview: {
q: "How would you put an uncertainty on a result that comes out of a long processing chain?",
a: "For anything beyond a simple mean I would compute it numerically rather than try to derive it, because a long chain with nonlinearities, thresholds and discrete decisions in it defeats analytic propagation. Propagation is still worth doing first as a sanity check, differentiating the result with respect to each input and combining variances weighted by those sensitivities, because it is cheap and it tells me which input dominates, which is the most useful thing for deciding where to spend effort. But it is exact only for a linear function, it is a first-order approximation otherwise, and it breaks where a derivative is large or where inputs I treated as independent are actually correlated. The two numerical options differ in what they assume. Monte Carlo simulates the whole chain many times with inputs drawn from their distributions and looks at the spread of the outputs, which handles arbitrary nonlinearity and is the natural choice when I have a noise model I trust, though the answer inherits every assumption in that generator. The bootstrap resamples the measured data itself with replacement, recomputes the result each time, and uses the spread, which needs no noise model at all, so it is what I reach for when I do not trust mine. On a time series the naive bootstrap is wrong, because resampling correlated samples independently destroys the correlation and the uncertainty comes out far too small, so I would resample in blocks long enough to preserve the correlation structure. The point I would make regardless of method is that the statistical uncertainty is often the smallest term. Calibration, temperature, alignment and the gap between my model and reality usually dominate, so a repeatability figure computed by reprocessing one record is misleadingly tight. The honest number comes from repeating the whole measurement including the setup, and I would quote both so it is clear which is which."
}
}

);
