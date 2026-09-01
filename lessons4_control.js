// Control: fundamental limits and robust design.
//
// The track had margins by intuition and nothing on why a loop cannot simply be
// made faster. Sensitivity, the conservation law behind the waterbed, what a
// right-half-plane zero costs, describing uncertainty, loop shaping, and how to
// check robustness when margins lie.

LESSONS.push(

{
id: "ct-sensitivity",
track: "Control",
sub: "Fundamental limits and robustness",
title: "Sensitivity and complementary sensitivity",
mins: 22,
body: `
<p>Two transfer functions describe almost everything a feedback loop does, and once you think in
terms of them, most design arguments become short. They also add to one exactly, which is the
source of every trade-off in the subject.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Sensitivity mapping disturbance and reference error, complementary sensitivity mapping noise to output, and the constraint that they sum to one">
<rect class="bx" x="24" y="26" width="308" height="106" rx="4"/>
<text class="th" x="40" y="52">sensitivity S</text>
<text class="ts" x="40" y="80">reference to error</text>
<text class="ts" x="40" y="104">output disturbance to output</text>
<text class="ts" x="40" y="126">small S: good tracking and rejection</text>

<rect class="bx" x="348" y="26" width="308" height="106" rx="4"/>
<text class="th" x="364" y="52">complementary sensitivity T</text>
<text class="ts" x="364" y="80">reference to output</text>
<text class="ts" x="364" y="104">sensor noise to output</text>
<text class="ts" x="364" y="126">small T: noise and model error rejected</text>

<rect class="bxa" x="24" y="148" width="632" height="82" rx="4"/>
<text class="th" x="40" y="176">S plus T equals one, at every frequency</text>
<text class="ts" x="40" y="204">so they cannot both be small anywhere, and the design is deciding</text>
<text class="ts" x="40" y="224">which one is small in which band</text>
</svg>

<p><b>Sensitivity</b> is the transfer function from reference to error, and equally from an output
disturbance to the output. Where it is small, the loop tracks well and rejects disturbances well.
<b>Complementary sensitivity</b> is the transfer function from reference to output, and equally
from sensor noise to output. Where it is small, noise and model error do not reach the output.</p>

<p>The constraint is that they sum to <b>one</b> at every frequency, which follows directly from
their definitions and is not something a clever design can evade. So at any given frequency you can
have good disturbance rejection or good noise rejection, but not both, and the whole of loop design
is choosing where each applies.</p>

<p>The conventional answer follows from where the problems live. Disturbances and reference changes
are usually <b>low frequency</b>, so sensitivity should be small there, which means high loop gain.
Sensor noise and model error are usually <b>high frequency</b>, so complementary sensitivity should
be small there, which means low loop gain. The crossover between the two is the bandwidth, and it is
the central design decision.</p>

<p>Sensitivity also has a direct physical reading that makes it worth plotting. Its magnitude is
the factor by which feedback multiplies a disturbance at that frequency. Below one, the loop is
helping. Equal to one, the loop is doing nothing. <b>Above one, feedback is making things
worse</b>, amplifying disturbances that the open-loop system would have handled better.</p>

<p>That last case is not a design error; it is unavoidable, and the peak value of sensitivity is
the most useful single robustness number there is. A peak of two means some disturbance is being
doubled, and it also bounds the gain and phase margins: a low peak guarantees both, while good
margins do not guarantee a low peak.</p>

<p>The habit worth building is to plot both functions rather than only the open-loop response.
Margins are two points on a curve, whereas the sensitivity peak summarises the whole of it, which is
why an experienced reviewer asks for it first.</p>
`,
quiz: [
{ q: "What does sensitivity map?",
o: ["Sensor noise to output", "Reference to error, and output disturbance to output", "Control effort to output", "Model error to stability"],
a: 1, why: "Where it is small the loop tracks well and rejects disturbances well, which is why low frequency is where you want it small." },
{ q: "Why can a loop not have both S and T small at one frequency?",
o: ["Actuator limits prevent it", "They sum to one at every frequency by definition", "Noise and disturbance are correlated", "The plant has finite bandwidth"],
a: 1, why: "It follows from the definitions and no design can evade it, so loop design is deciding which is small in which band." },
{ q: "What does a sensitivity magnitude above one mean?",
o: ["The loop is unstable", "Feedback is amplifying disturbances at that frequency", "The bandwidth is too low", "The sensor is saturating"],
a: 1, why: "It is unavoidable rather than an error, and the peak value is the most useful single robustness number available." },
{ q: "Why is the sensitivity peak better than gain and phase margins?",
o: ["It is easier to measure", "Margins are two points on a curve; the peak summarises the whole of it", "It applies to nonlinear systems", "It does not require a model"],
a: 1, why: "A low peak guarantees good margins, whereas good margins do not guarantee a low peak, which is how a loop can look fine and be fragile." }
],
interview: {
q: "How would you assess whether a control loop is well designed?",
a: "I would look at the sensitivity and complementary sensitivity functions rather than only at gain and phase margins, because those two describe almost everything the loop does. Sensitivity is the transfer function from reference to error, and equally from an output disturbance to the output, so where it is small the loop tracks well and rejects disturbances well. Complementary sensitivity is reference to output, and equally sensor noise to output, so where it is small noise and model error do not reach the output. The constraint that makes this a design problem rather than an optimisation is that they sum to one at every frequency, which comes straight from the definitions, so I cannot make both small anywhere and the design is really a decision about which one is small in which band. Conventionally disturbances are low frequency and noise is high frequency, so I want low sensitivity at low frequency and low complementary sensitivity at high frequency, and the crossover is the bandwidth. What I would actually look at first is the sensitivity plot, because its magnitude has a direct physical meaning: it is the factor by which feedback multiplies a disturbance at that frequency, so below one the loop is helping, at one it is doing nothing, and above one the feedback is making the disturbance worse than no control at all. There is always a region where it exceeds one, that is unavoidable, and the peak value is the single most useful robustness number I know. A peak of two says some disturbance is being doubled, and it also bounds both margins, which is the important asymmetry: a low peak guarantees good gain and phase margins, but good margins do not guarantee a low peak. That is exactly how a loop can show textbook margins and still be fragile, so if someone shows me margins alone I would ask for the sensitivity plot."
}
},

{
id: "ct-limits",
track: "Control",
sub: "Fundamental limits and robustness",
title: "The waterbed effect: what feedback cannot do",
mins: 22,
body: `
<p>There is a conservation law in feedback. Improving disturbance rejection in one frequency band
necessarily worsens it in another, and the total is fixed by the plant rather than by the
controller. Knowing this converts a lot of fruitless tuning into an early conversation about the
hardware.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A sensitivity curve pushed down at low frequency rising above one at higher frequency, with the area above and below balancing">
<rect class="bx" x="24" y="26" width="632" height="46" rx="4"/>
<text class="th" x="40" y="54">the integral of log sensitivity over frequency is fixed</text>

<rect class="bxa" x="24" y="86" width="308" height="70" rx="4"/>
<text class="th" x="40" y="112">push it down here</text>
<text class="ts" x="40" y="138">better rejection in the band you care about</text>

<rect class="bx" x="348" y="86" width="308" height="70" rx="4"/>
<text class="th" x="364" y="112">it comes up there</text>
<text class="ts" x="364" y="138">disturbances amplified somewhere else</text>

<rect class="bx" x="24" y="172" width="632" height="58" rx="4"/>
<text class="th" x="40" y="198">the controller chooses where; the plant sets how much</text>
<text class="ts" x="40" y="220">an unstable pole makes the total strictly worse, not merely redistributed</text>
</svg>

<p>The formal statement is that for a stable plant with enough roll-off, the integral of the
logarithm of the sensitivity magnitude over all frequencies is <b>zero</b>. Area pushed below one
must be matched by area above one. The controller decides the distribution; it cannot change the
total.</p>

<p>The practical consequence is the <b>waterbed</b> picture: pressing sensitivity down over the band
where you want good rejection makes it bulge above one somewhere else, and the wider or deeper you
press, the taller the bulge. A loop tuned aggressively for a specification in one band is
necessarily worse than the open-loop system somewhere outside it.</p>

<p>Two questions follow, and both are useful. First, <b>where</b> does the bulge go? If it lands
where there is no significant disturbance and nothing resonant, nobody notices, and that is what a
good design arranges. If it lands on a structural resonance or on a known interference frequency, it
becomes the dominant problem.</p>

<p>Second, <b>how large</b> is it? Since it grows with how hard you push and over how wide a band,
the peak sensitivity is the visible symptom, and a peak growing during tuning is a signal to stop
and question the specification rather than to keep going.</p>

<p>The situation is worse when the plant is <b>unstable</b>. An unstable pole makes the integral
strictly positive rather than zero, so the amplification exceeds the improvement, and the further
into the right half plane the pole is, the larger the penalty. That is a quantitative reason why
stabilising an aggressively unstable plant costs performance elsewhere, and why relocating the pole
by mechanical redesign is worth more than any controller.</p>

<p>The way to use this in practice is as a diagnostic. If tuning improves the band you measure and
the system becomes twitchy elsewhere, that is not a tuning mistake to be fixed by more effort, it is
the conservation law being observed. The productive responses are to narrow the band you demand, to
add feedforward, which is not subject to this constraint because it is not feedback, or to change
the plant.</p>
`,
quiz: [
{ q: "What does Bode's sensitivity integral state for a stable plant?",
o: ["Sensitivity must be below one everywhere", "The integral of log sensitivity over frequency is zero", "The peak sensitivity is bounded by the margins", "Bandwidth is limited by the plant poles"],
a: 1, why: "Area pushed below one must be matched by area above one, so the controller decides the distribution but not the total." },
{ q: "What happens as you press sensitivity down harder or over a wider band?",
o: ["The bandwidth increases proportionally", "The bulge above one gets taller", "Stability margins improve", "The plant poles move"],
a: 1, why: "A peak growing during tuning is a signal to question the specification rather than to keep pushing." },
{ q: "How does an unstable plant pole change the picture?",
o: ["It has no effect on the integral", "The integral becomes strictly positive, so amplification exceeds improvement", "It removes the constraint entirely", "It only affects the phase margin"],
a: 1, why: "The penalty grows with how far into the right half plane the pole is, which is why moving it by mechanical redesign beats any controller." },
{ q: "Which response is not subject to the waterbed constraint?",
o: ["Increasing controller gain", "Feedforward, because it is not feedback", "Adding a notch filter", "Raising the sample rate"],
a: 1, why: "Narrowing the demanded band and changing the plant are the other two productive responses, since more tuning effort cannot beat a conservation law." }
],
interview: {
q: "You improve disturbance rejection in the band you care about and the system becomes twitchy elsewhere. What is happening?",
a: "That is the waterbed effect, and it is a conservation law rather than a tuning mistake, so more effort will not resolve it. For a stable plant with reasonable roll-off, the integral of the logarithm of the sensitivity magnitude over all frequencies is zero, which means any area I push below one has to be matched by area above one somewhere else. Sensitivity below one is feedback helping, above one is feedback actively amplifying disturbances compared with no control at all, so pressing the curve down over the band I care about necessarily lifts it above one somewhere outside that band, and the harder and wider I press the taller that bulge gets. The twitchiness is the loop amplifying something in the region where sensitivity now exceeds one. Once I recognise that, the useful questions are where the bulge sits and how big it is. If it lands somewhere with no meaningful disturbance and nothing resonant, nobody notices and the design is fine. If it lands on a structural resonance or on a known interference frequency, that is the problem and I should move it rather than shrink it. The peak sensitivity is the visible measure, and a peak climbing during tuning is my signal to stop and question the specification. The productive responses are to narrow the band I am demanding, since the total is fixed and asking for less over a smaller range gives a smaller bulge, to add feedforward, which is not subject to this at all because it is not feedback and so does not appear in the sensitivity integral, or to change the plant. That last one matters especially if the plant is unstable, because an unstable pole makes the integral strictly positive rather than zero, so the amplification exceeds the improvement and the penalty grows with how far right the pole is. In that case moving the pole by mechanical or electrical redesign is worth more than any controller I can write."
}
},

{
id: "ct-rhp",
track: "Control",
sub: "Fundamental limits and robustness",
title: "Right-half-plane zeros and poles: hard bandwidth limits",
mins: 22,
body: `
<p>Some plants simply cannot be controlled quickly, and no controller changes that. The limit comes
from the plant's own structure, and recognising it early is the difference between redesigning the
hardware and spending months tuning something that cannot work.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A right-half-plane zero causing initial undershoot and capping bandwidth, and an unstable pole setting a bandwidth floor">
<rect class="bx" x="24" y="26" width="632" height="76" rx="4"/>
<text class="th" x="40" y="52">right-half-plane zero</text>
<text class="ts" x="40" y="78">the output first moves the wrong way; bandwidth is capped below the zero</text>

<rect class="bx" x="24" y="118" width="632" height="76" rx="4"/>
<text class="th" x="40" y="144">right-half-plane pole</text>
<text class="ts" x="40" y="170">the plant runs away; bandwidth must exceed the pole to stabilise it</text>

<rect class="bxa" x="24" y="210" width="632" height="30" rx="4"/>
<text class="th" x="40" y="230">both together: the window may be narrow, or may not exist</text>
</svg>

<p>A <b>right-half-plane zero</b> means the response initially moves the <b>wrong way</b> before
coming back. That is a physical property: a boiler whose level drops when cold feed is added, an
aircraft that dips before climbing, a bicycle you steer left to turn right. Feedback based on the
initial response is therefore pushing in the wrong direction, and pushing harder makes it worse.</p>

<p>The consequence is a hard cap on bandwidth, roughly a fraction of the zero frequency. Try to
close faster and the loop goes unstable, no matter what controller structure you use. A slow
right-half-plane zero is one of the most severe limitations a plant can have, and no amount of
control design removes it.</p>

<p>A <b>right-half-plane pole</b> is the opposite problem: the plant runs away by itself, so the
loop must be fast enough to catch it, which sets a bandwidth <b>floor</b>. The further right the
pole, the faster the loop must be, and that demands actuator authority and sensor bandwidth to
match.</p>

<p>A plant with both has a <b>window</b>: fast enough to stabilise the pole, slow enough to live
with the zero. If the pole is faster than the zero, the window is empty and the plant cannot be
stabilised robustly at all. That is a statement about the hardware and it is worth checking before
any controller is designed.</p>

<p><b>Delay</b> behaves like a right-half-plane zero for this purpose, capping bandwidth at roughly
the inverse of the delay. That is why dead time is so damaging, why a Smith predictor helps only if
the delay is known accurately, and why reducing sample latency in a digital loop often buys more
than any retuning.</p>

<p>The engineering response is almost always to change the plant or the measurement. Move the
sensor closer to the actuator, since non-colocation is a common source of right-half-plane zeros.
Measure the disturbance directly and feed it forward, which bypasses the limit. Or restructure the
process so the wrong-way response is smaller. Recognising the limit is what redirects effort to
where it can succeed.</p>
`,
quiz: [
{ q: "What does a right-half-plane zero do to the response?",
o: ["Slows it uniformly", "Makes the output initially move the wrong way", "Adds a resonant peak", "Causes steady-state error"],
a: 1, why: "A boiler level dropping when cold feed is added, or an aircraft dipping before climbing, are physical examples of the same property." },
{ q: "What limit does a right-half-plane zero impose?",
o: ["A floor on bandwidth", "A cap on bandwidth, roughly a fraction of the zero frequency", "A minimum sample rate", "A maximum controller gain only"],
a: 1, why: "Closing faster makes the loop unstable regardless of controller structure, which is why a slow such zero is so damaging." },
{ q: "What does a right-half-plane pole require?",
o: ["Extra roll-off at high frequency", "Bandwidth above the pole, so the loop can catch the runaway", "A notch filter at the pole frequency", "Feedforward rather than feedback"],
a: 1, why: "The further right the pole, the faster the loop must be, and that demands matching actuator authority and sensor bandwidth." },
{ q: "Why does delay behave like a right-half-plane zero?",
o: ["It adds gain at high frequency", "It caps bandwidth at roughly the inverse of the delay", "It creates an unstable pole", "It reduces the steady-state gain"],
a: 1, why: "That is why reducing sample latency in a digital loop often buys more than any amount of retuning." }
],
interview: {
q: "A loop will not go faster than a certain bandwidth however you tune it. What would you check?",
a: "I would look for a structural limit in the plant rather than assume the tuning is at fault, and there are three usual candidates. The first is a right-half-plane zero, where the output initially moves the wrong way before coming back. That is a physical property of certain processes: a boiler level that drops when cold feed is added, an aircraft that dips before it climbs, a non-colocated sensor on a flexible structure. Feedback reacting to that initial response is pushing the wrong way, so pushing harder makes it worse, and the result is a hard cap on bandwidth at roughly a fraction of the zero frequency that no controller structure removes. The second is delay, which behaves the same way for this purpose and caps bandwidth at roughly the inverse of the delay. That includes everything in a digital loop: the sampling itself, the computation, the actuator update, any communication. It is worth measuring the true loop delay rather than assuming, because it is often much larger than people think, and reducing it usually buys more than retuning ever will. The third, if the plant is open-loop unstable, is a right-half-plane pole, which imposes the opposite constraint, a floor on bandwidth, because the loop has to be fast enough to catch the runaway. If a plant has both a pole and a slower zero, then there is a window between the floor and the cap, and if the pole is faster than the zero that window is empty and the plant cannot be robustly stabilised at all, which is a hardware conclusion rather than a control one. Once I have identified which limit I am against, the productive moves are structural: move the sensor closer to the actuator since non-colocation is a common source of these zeros, cut the loop delay, measure the disturbance and feed it forward since feedforward is not subject to the same limit, or change the process."
}
},

{
id: "ct-uncertainty",
track: "Control",
sub: "Fundamental limits and robustness",
title: "Describing what you do not know about the plant",
mins: 22,
body: `
<p>Every controller is designed against a model, and every model is wrong. Robust design starts by
describing <b>how</b> wrong it might be, in a form that can be reasoned about, rather than by
assuming the nominal model and hoping the margins absorb the difference.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Parametric uncertainty as a range of parameter values, against unstructured uncertainty as a set of possible responses around the nominal">
<rect class="bx" x="24" y="26" width="308" height="120" rx="4"/>
<text class="th" x="40" y="52">parametric</text>
<text class="ts" x="40" y="80">a mass between 2 and 5 kg</text>
<text class="ts" x="40" y="104">a gain within 20 percent</text>
<text class="ts" x="40" y="130">structure known, values are not</text>

<rect class="bxa" x="348" y="26" width="308" height="120" rx="4"/>
<text class="th" x="364" y="52">unstructured</text>
<text class="ts" x="364" y="80">a bound on the response error</text>
<text class="ts" x="364" y="104">frequency by frequency</text>
<text class="ts" x="364" y="130">covers dynamics you left out</text>

<rect class="bx" x="24" y="162" width="632" height="68" rx="4"/>
<text class="th" x="40" y="190">what usually matters: the error is small at low frequency and large at high</text>
<text class="ts" x="40" y="216">which is exactly why loops are rolled off rather than made as fast as possible</text>
</svg>

<p><b>Parametric</b> uncertainty says the structure is right and the numbers are not: a mass
somewhere in a range, a gain within a tolerance, a time constant that varies with temperature. It is
easy to obtain from the physics and easy to explain, and it does not cover anything the model left
out entirely.</p>

<p><b>Unstructured</b> uncertainty covers the rest by bounding the difference between the true
plant and the model as a function of frequency. It is usually expressed multiplicatively: the
relative error is at most some bound at each frequency. That form covers unmodelled resonances,
neglected actuator dynamics, and nonlinearity linearised away, without needing to name them.</p>

<p>The shape of a realistic bound is the important part. Relative error is <b>small at low
frequency</b>, where the steady-state behaviour is well known, and <b>large at high frequency</b>,
where unmodelled dynamics live and where it commonly exceeds one hundred percent. Above the
frequency at which the bound reaches one, the model tells you nothing about the phase at all.</p>

<p>That immediately gives the central robustness result in usable form: to remain stable for every
plant within the bound, the complementary sensitivity must be smaller than the reciprocal of the
bound at each frequency. Since the bound grows with frequency, complementary sensitivity must fall,
which is a quantitative reason for rolling the loop off rather than an aesthetic preference.</p>

<p>Getting a bound in practice is a measurement task rather than a theoretical one. Identify the
plant several times, across units, temperatures, loads and operating points, and take the envelope
of the differences from the nominal model. That envelope is the bound, and it is far more honest
than a percentage chosen by intuition.</p>

<p>The habit this builds is to ask, for any controller, which set of plants it stabilises rather
than whether it stabilises the model. A design that works only for the nominal plant is not a
design, and the difference shows up as the first unit that behaves differently.</p>
`,
quiz: [
{ q: "What does parametric uncertainty not cover?",
o: ["Variation in a gain", "Dynamics the model left out entirely", "Temperature-dependent time constants", "Load-dependent mass"],
a: 1, why: "Unstructured uncertainty bounds the difference between true plant and model as a function of frequency, covering what was never named." },
{ q: "What shape does a realistic multiplicative uncertainty bound have?",
o: ["Constant across frequency", "Small at low frequency and large at high frequency", "Peaked at the crossover", "Large at low frequency only"],
a: 1, why: "Above where the bound reaches one hundred percent, the model tells you nothing about the phase at all." },
{ q: "What must hold for robust stability against a multiplicative bound?",
o: ["Sensitivity below the bound", "Complementary sensitivity below the reciprocal of the bound at each frequency", "Gain margin above the bound", "Bandwidth below the bound's corner"],
a: 1, why: "Since the bound grows with frequency, T must fall, which is a quantitative reason for roll-off rather than an aesthetic preference." },
{ q: "How should an uncertainty bound be obtained?",
o: ["Chosen as a round percentage", "By identifying the plant across units, temperatures and operating points and taking the envelope", "From the actuator datasheet", "From the achieved gain margin"],
a: 1, why: "That envelope is far more honest than a figure chosen by intuition, and it is a measurement task rather than a theoretical one." }
],
interview: {
q: "How do you design a controller that works across a production run rather than on one unit?",
a: "By designing against a set of plants rather than against one model, which means describing the uncertainty explicitly rather than hoping the margins absorb it. There are two ways to express it and I would usually want both. Parametric uncertainty says the structure is right and the values vary: mass between two limits, gain within a tolerance, a time constant that moves with temperature. That comes straight from the physics and the tolerances, it is easy to explain to a mechanical engineer, and it does not cover anything the model omitted. Unstructured uncertainty covers the rest by bounding the relative difference between the true plant and the model at each frequency, which sweeps up unmodelled resonances, neglected actuator dynamics and linearisation error without needing to name them. The shape matters more than the number: relative error is small at low frequency where the steady-state behaviour is well understood, and large at high frequency where the unmodelled dynamics live, often exceeding one hundred percent, and above that point the model says nothing useful about phase. That gives me the design rule directly, because to stay stable for every plant inside the bound the complementary sensitivity has to be below the reciprocal of the bound at each frequency, and since the bound rises with frequency, the loop has to roll off. So roll-off stops being a matter of taste and becomes a quantitative requirement. Practically I would get the bound by measurement rather than by choosing a percentage: identify the plant on several units, at the temperature and load extremes, and at different operating points, then take the envelope of the differences from the nominal. Then the question I ask about any candidate controller is not whether it stabilises the model but which set of plants it stabilises, and I would verify that across the whole set before committing, because otherwise the first unit that behaves differently finds the problem for me."
}
},

{
id: "ct-loopshape",
track: "Control",
sub: "Fundamental limits and robustness",
title: "Loop shaping and designing against a specification",
mins: 24,
body: `
<p>Tuning adjusts a controller until the response looks acceptable. <b>Shaping</b> states what the
closed-loop functions must look like and then finds a controller that achieves it. The second is
harder to start and far easier to defend, and it scales to problems tuning cannot reach.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Weighting functions setting an upper bound on sensitivity at low frequency and on complementary sensitivity at high frequency, with a controller found to satisfy both">
<rect class="bx" x="24" y="26" width="308" height="90" rx="4"/>
<text class="th" x="40" y="52">weight on S</text>
<text class="ts" x="40" y="80">large at low frequency:</text>
<text class="ts" x="40" y="102">demand rejection there</text>

<rect class="bx" x="348" y="26" width="308" height="90" rx="4"/>
<text class="th" x="364" y="52">weight on T</text>
<text class="ts" x="364" y="80">large at high frequency:</text>
<text class="ts" x="364" y="102">demand roll-off there</text>

<rect class="bxa" x="24" y="132" width="632" height="52" rx="4"/>
<text class="th" x="40" y="158">solve for a controller that meets both, if one exists</text>
<text class="ts" x="40" y="178">the answer includes whether the specification was achievable at all</text>

<rect class="bx" x="24" y="196" width="632" height="44" rx="4"/>
<text class="ts" x="40" y="224">the design work moves from the controller to the specification</text>
</svg>

<p>The method expresses the requirements as <b>weighting functions</b>: a frequency-dependent
bound on sensitivity encoding how much disturbance rejection is required and where, a bound on
complementary sensitivity encoding roll-off and robustness, and often a bound on the controller
output encoding actuator limits. Together these say what "good" means, quantitatively, before any
controller exists.</p>

<p>The synthesis then finds a controller minimising the worst case across frequency of the weighted
functions, and returns a number saying whether the specification is met. That number is what makes
the approach valuable: a value above one says the specification is not achievable, which is
information tuning never gives you, since a tuning session that fails leaves you unsure whether the
problem is the specification or your patience.</p>

<p>The practical consequence is that the <b>design work moves to the weights</b>. Choosing them is
where the engineering judgement lives, and they are usually simple: a low-frequency integrator-like
shape on sensitivity for rejection, a high-pass shape on complementary sensitivity whose corner
reflects where the model stops being trustworthy, and a bound reflecting actuator authority.</p>

<p>Two characteristics of the result need managing. The controller comes out with roughly the
<b>order</b> of the plant plus the weights, which can be high, so order reduction is a normal
follow-up step and the reduced controller must be rechecked. And the method optimises the worst case
across frequency, which can produce a controller that is excellent everywhere and unremarkable at
the frequency you cared about most, so the weights carry the priorities.</p>

<p>The same thinking works without any synthesis tool. Sketching the loop gain you want, low gain
slope for tracking, a sensible slope through crossover for margin, roll-off above it for
robustness, and then building a controller to achieve that shape by hand, is classical loop shaping
and it captures most of the benefit.</p>

<p>The habit worth taking from this is the sequence: state the specification in the frequency
domain first, then design. It turns arguments about whether a loop is good enough into a comparison
against something written down, and it reveals impossible requirements before months are spent on
them.</p>
`,
quiz: [
{ q: "What do weighting functions express?",
o: ["The plant's uncertainty", "Frequency-dependent bounds on what the closed loop must achieve", "The controller's order", "The sample rate requirement"],
a: 1, why: "They say what good means quantitatively, before any controller exists, which is what makes the design defensible." },
{ q: "What does the synthesis result tell you that tuning does not?",
o: ["The optimal gain values", "Whether the specification is achievable at all", "The plant's true order", "The measurement noise level"],
a: 1, why: "A failed tuning session leaves you unsure whether the problem is the specification or your patience, whereas the number is unambiguous." },
{ q: "Where does the engineering judgement go in this approach?",
o: ["Into the controller structure", "Into choosing the weights", "Into the numerical solver settings", "Into the identification experiment"],
a: 1, why: "The weights encode the priorities, which is why a controller can be excellent everywhere and unremarkable exactly where you cared most." },
{ q: "What routinely needs doing to the synthesised controller?",
o: ["Converting it to PID form", "Reducing its order and rechecking the result", "Adding integral action", "Discretising at a lower rate"],
a: 1, why: "It comes out with roughly the order of the plant plus the weights, which can be impractically high for implementation." }
],
interview: {
q: "When would you use a loop shaping or H-infinity approach rather than tuning a PID?",
a: "When the specification is more than a step response looking acceptable, when there is more than one loop interacting, or when I need to be able to defend the design rather than just demonstrate it. The difference in approach is that tuning adjusts a controller until the response looks right, whereas shaping states what the closed-loop functions must look like and then finds a controller that achieves it. I express the requirements as weighting functions: a bound on sensitivity that is demanding at low frequency, which is how much disturbance rejection I need and over what band, a bound on complementary sensitivity that is demanding at high frequency, which encodes roll-off and therefore robustness against the model error I know grows there, and often a bound on the control signal that reflects what the actuator can actually do. Then synthesis finds a controller that minimises the worst case across frequency and hands back a number telling me whether the specification was met. That number is the thing I value most, because if it says the specification is not achievable, that is real information, and a failed tuning session never tells me whether the problem was the requirement or my patience. The consequence is that the design work moves into choosing the weights, which is where the judgement is, and the weights are usually simple shapes: something integrator-like on sensitivity, a high-pass on complementary sensitivity whose corner sits where I stop trusting my model. Two things need managing afterwards. The controller comes out with roughly the order of the plant plus the weights, which can be too high to implement, so order reduction and rechecking is a normal step. And because it optimises the worst case, it can be uniformly good rather than excellent where I most cared, so the weights have to carry my priorities. For a single simple loop I would still tune a PID, and I would use the same frequency-domain thinking to sketch the loop shape I want by hand, because that captures most of the benefit without the tooling."
}
},

{
id: "ct-robustcheck",
track: "Control",
sub: "Fundamental limits and robustness",
title: "Checking robustness when margins are not enough",
mins: 22,
body: `
<p>Gain and phase margins are the standard answer to "is this loop robust", and they are two points
on a curve. There are well-known ways for a loop with textbook margins to be fragile, and knowing
them changes what you ask for during a review.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A Nyquist curve passing far from the critical point at two specific places while approaching closely in between">
<rect class="bx" x="24" y="26" width="308" height="94" rx="4"/>
<text class="th" x="40" y="52">gain margin</text>
<text class="ts" x="40" y="80">how much gain change</text>
<text class="ts" x="40" y="104">at one frequency</text>

<rect class="bx" x="348" y="26" width="308" height="94" rx="4"/>
<text class="th" x="364" y="52">phase margin</text>
<text class="ts" x="364" y="80">how much phase change</text>
<text class="ts" x="364" y="104">at one other frequency</text>

<rect class="bxa" x="24" y="136" width="632" height="94" rx="4"/>
<text class="th" x="40" y="164">neither asks about gain and phase changing together</text>
<text class="ts" x="40" y="192">or about what happens between the two frequencies</text>
<text class="ts" x="40" y="216">the peak of sensitivity does: it is the closest approach to instability</text>
</svg>

<p>The failure mode is that gain margin asks how much the gain can change at the frequency where
phase is inverted, and phase margin asks how much the phase can change at the frequency where gain
is one. Real perturbations change <b>both together</b>, at every frequency, and a loop can pass both
tests while passing very close to instability somewhere between them.</p>

<p>The single number that fixes this is the <b>peak sensitivity</b>, which is the reciprocal of the
closest approach of the loop response to the critical point. It accounts for gain and phase varying
together at every frequency, and it bounds both classical margins, so a peak below about two
guarantees respectable margins while good margins guarantee nothing about the peak. Asking for it is
the quickest way to see whether a loop is genuinely robust.</p>

<p>The second gap is that margins describe robustness to a change in the <b>loop</b>, not to a
change in the <b>plant</b> at a particular place. In a multi-loop system, perturbing each loop
individually is not the same as perturbing them together, and a system can be robust to each
separately and fragile to the combination. Structured robustness analysis exists precisely for
this.</p>

<p>The third gap is that all of this is <b>linear</b>. Saturation, rate limits, backlash and
quantisation are not covered by any margin, and a loop with excellent linear robustness can behave
badly the first time the actuator saturates. That is why simulation with the nonlinearities present,
at realistic amplitudes, is a separate and necessary check.</p>

<p>What to do instead is a short list. Plot sensitivity and quote its peak. Sweep the parametric
uncertainty and confirm stability and performance across the whole set rather than at the nominal.
Include the real delay, since delay eats phase margin directly and is usually underestimated. And
simulate at the amplitudes the system will really see, with saturation and quantisation in place.</p>

<p>On hardware, the most informative measurement is the <b>loop response itself</b>: inject a small
signal at the summing junction and measure around the loop to obtain the open-loop response of the
system as built. That includes every delay, nonlinearity at that amplitude, and modelling error, and
comparing it against the design is the fastest way to find out what is actually different.</p>
`,
quiz: [
{ q: "Why can a loop with good margins still be fragile?",
o: ["Margins ignore the plant order", "Real perturbations change gain and phase together at every frequency", "Margins assume a first-order plant", "Margins are measured open loop"],
a: 1, why: "Each margin is one point on a curve, and the loop can pass close to instability at a frequency neither test examines." },
{ q: "What does peak sensitivity measure?",
o: ["The worst disturbance amplification only", "The closest approach of the loop response to the critical point", "The bandwidth of the loop", "The controller gain at crossover"],
a: 1, why: "It bounds both classical margins, so a low peak guarantees good margins while good margins guarantee nothing about the peak." },
{ q: "What do linear robustness measures not cover?",
o: ["Parametric variation", "Saturation, rate limits, backlash and quantisation", "Delay in the loop", "Sensor noise"],
a: 1, why: "A loop with excellent linear robustness can behave badly the first time the actuator saturates, so nonlinear simulation is a separate check." },
{ q: "What is the most informative robustness measurement on hardware?",
o: ["A step response", "Injecting at the summing junction to measure the loop response as built", "Recording the control signal spectrum", "Measuring settling time across units"],
a: 1, why: "It includes every delay, the nonlinearity at that amplitude and all modelling error, so comparing against the design shows what is different." }
],
interview: {
q: "A colleague says the loop has 12 dB gain margin and 60 degrees phase margin. Is it robust?",
a: "Those are good numbers and I would not dismiss them, but they are two points on a curve and I would want more before agreeing. Gain margin asks how much the gain can change at the one frequency where the phase is inverted, and phase margin asks how much the phase can change at the one frequency where the gain is unity. Real perturbations change gain and phase together, at every frequency, so a loop can pass both tests comfortably and still pass very close to instability at some frequency in between. The number that closes that gap is the peak of the sensitivity function, which is the reciprocal of the closest approach of the loop response to the critical point, so it accounts for gain and phase varying together everywhere. It also bounds both classical margins, and that asymmetry is the point: a peak below about two guarantees respectable margins, whereas good margins guarantee nothing about the peak. So the first thing I would ask for is the sensitivity plot and its peak. Then three other things. If this is a multi-loop system, margins computed loop by loop do not tell me about perturbing several loops at once, and a system can be robust to each individually and fragile to the combination, which is what structured robustness analysis is for. All of this is linear, so saturation, rate limits, backlash and quantisation are outside it entirely, and a loop with excellent linear robustness can misbehave the first time the actuator saturates, so I would want simulation at realistic amplitudes with the nonlinearities present. And I would want the parametric variation swept, stability and performance confirmed across the whole set of plants rather than at the nominal one. On hardware, the measurement I would actually value most is injecting a small signal at the summing junction and measuring the loop response of the system as built, because that includes the true delay, the real nonlinearity at that amplitude and every modelling error, and comparing it against the design tells me quickly what is different."
}
}

);
