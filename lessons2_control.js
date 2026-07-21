// Control track expansion lessons, set 2. Loaded after data.js; appends to LESSONS.

LESSONS.push(

{
id: "ct-freq",
track: "Control",
title: "Frequency response thinking",
mins: 30,
body: `
<p>A Bode plot answers one question at every frequency: if I wiggle the input as a sine
wave here, how big does the output wiggle come back, and how late? Gain and phase, that
is all. The power of the plot is that a feedback loop's fate is decided frequency by
frequency, so problems that look tangled in the time domain separate cleanly on the
plot. You do not need the maths of complex analysis to use it; you need the habit of
asking, for every element in the loop, what does this do to gain and phase as frequency
rises?</p>
<h3>Bandwidth and rise time are the same fact</h3>
<p>Closed-loop bandwidth is roughly the highest frequency the loop still follows.
Everything faster gets attenuated and delayed. The time-domain shadow of bandwidth is
rise time: a useful rule of thumb is that rise time is about 0.35 divided by the
bandwidth in hertz. Ask for a 10 ms settling move from a stage and you have implicitly
asked for tens of hertz of closed-loop bandwidth, which in turn demands a sample rate,
an actuator and a sensor that support it. Interviewers like candidates who convert
between the two views without ceremony.</p>
<h3>Resonance peaks</h3>
<p>A mechanical resonance shows up as a sharp peak in gain and a rapid 180 degree fall
in phase as you pass through it. A belt drive, a flexible coupling, a cantilevered
sensor mount: each adds a peak. If the peak sits above the loop's crossover frequency,
the extra gain there can push the loop gain back above 1 exactly where phase is
terrible, and the loop sings at the resonant frequency. The classic fixes are to lower
the loop gain, add a notch filter at the resonance, or stiffen the mechanics so the
peak moves above the frequencies the loop cares about. Stiffening is the fix that also
improves the plant; the notch is the fix you can do by Friday.</p>
<h3>Where the margins live</h3>
<p>On the open-loop plot, find the crossover frequency, where gain passes through 1
(0 dB). The phase distance from 180 degrees at that point is the phase margin. Then
find where phase reaches 180 degrees; how far the gain sits below 0 dB there is the
gain margin. Nearly every practical tuning conversation is about the neighbourhood of
crossover: what is the gain slope there (gentle slopes near crossover mean good phase),
what lag have we added lately (filters, delays), and what did that do to the margin.</p>
<h3>Loop shaping as gain scheduling across frequency</h3>
<p>Think of the controller as distributing gain across frequency on purpose. You want
huge gain at low frequency, so that slow disturbances and steady-state error are
crushed; that is what an integrator provides. You want modest, well-behaved gain near
crossover, so the loop is stable; that is where phase lead (the derivative family)
earns its keep. And you want gain rolling off at high frequency, so sensor noise and
unmodelled resonances are ignored; that is the low-pass filtering. A PID viewed this
way is just a three-band gain schedule: I for the bass, P for the midrange, filtered D
for a controlled amount of treble. Once you see the controller as shaping a curve
rather than as three knobs, questions like why derivative action helps, or why too
much integral gain causes oscillation, stop being mysterious: each knob is pushing gain
into a frequency band, and the only band that can hurt you is the one around
crossover.</p>`,
quiz: [
{ q: "Closed-loop bandwidth of 35 Hz implies a rise time of roughly:",
o: ["1 second", "10 milliseconds", "100 milliseconds", "35 milliseconds"],
a: 1, why: "Rise time is approximately 0.35 divided by bandwidth in hertz: 0.35 / 35 Hz = 10 ms." },
{ q: "A mechanical resonance above crossover threatens stability because:",
o: ["It reduces low-frequency gain", "It removes the integrator", "Its gain peak can push loop gain back above 1 where phase is already poor", "It changes the sample rate"],
a: 2, why: "The peak raises gain at a frequency where phase has typically fallen far; gain above 1 with 180 degrees of lag means oscillation at that frequency." },
{ q: "Phase margin is measured at the frequency where:",
o: ["Open-loop gain crosses 1", "Phase crosses 90 degrees", "Gain is maximum", "The plant resonates"],
a: 0, why: "Phase margin is how far phase sits short of 180 degrees at the gain crossover frequency; gain margin is measured where phase hits 180." },
{ q: "In the loop-shaping view, integral action exists to:",
o: ["Add gain near crossover", "Attenuate sensor noise", "Speed up the derivative", "Provide very high gain at low frequency to crush slow disturbances"],
a: 3, why: "An integrator's gain grows without bound as frequency falls, which is what forces steady-state error and slow disturbances to zero." }
],
interview: {
q: "A colleague tunes only in the time domain, poking gains and watching step responses. What does frequency-domain thinking add?",
a: "Step responses show you the symptom; the frequency view shows you the cause and, more importantly, the budget. When a loop rings, the time trace says it rings; the Bode view tells me it rings at a specific frequency, that the phase margin there is thin, and which element ate the phase, a filter, a delay, or a resonance. It also lets me predict before trying: if vision adds 30 ms of latency, I can compute roughly what bandwidth survives, rather than discovering it by trial. And it turns tuning into design: I decide where I want gain, low frequency for disturbance rejection, roll-off for noise, and pick controller terms to shape that curve. Time-domain poking still validates the result, but the frequency view is where the reasoning happens."
}
},

{
id: "ct-sysid",
track: "Control",
title: "System identification for practitioners",
mins: 30,
body: `
<p>Before you can tune a loop with any confidence, you need a model of the plant, and
the honest ways to get one are measurement, measurement and measurement. System
identification sounds academic; in practice it is a small set of disciplined
experiments that take an afternoon and save a week of blind knob turning.</p>
<h3>The step test</h3>
<p>Open the loop, apply a step of actuator effort, record the response. For a huge
class of plants, thermal systems, flow, many motor speed loops, the response looks
like a delay followed by a smooth exponential rise. Fit three numbers: the gain K
(steady output change per unit input change), the time constant tau (time to reach 63
percent of the final change after it starts moving), and the dead time L (how long
nothing happens). That is the FOPDT model, first order plus dead time, and it feeds
directly into tuning rules and into intuition: the ratio L over tau tells you how hard
the loop will be. Small L over tau is easy; L comparable to tau means delay dominates
and you must tune gently.</p>
<h3>Frequency sweeps</h3>
<p>For servo plants with resonances, a step hides too much. Inject a sine sweep or
band-limited noise at the actuator, measure the response, and compute the frequency
response directly. Now the resonant peaks, the anti-resonances and the phase roll-off
are visible exactly where the tuning battle will be fought, near crossover. Most motion
controller vendors build this in for a reason. Keep amplitudes small enough to stay in
the linear regime but large enough to rise above friction and quantisation.</p>
<h3>Why closed-loop data misleads</h3>
<p>It is tempting to identify the plant from data logged while the controller was
running. Be careful: feedback correlates the input with the noise. The controller
reacts to output disturbances by moving the input, so a naive fit sees input moving
and output not moving (because the controller cancelled it) and concludes the plant
gain is tiny, or even inverted. Closed-loop identification can be done properly, by
injecting a known external excitation and using that as the reference signal, but
fitting input-output data that feedback has already laundered is the classic way to
get a confidently wrong model.</p>
<h3>Model order honesty</h3>
<p>A higher-order model always fits the data better, and that is exactly why you should
distrust it. Extra poles happily fit noise, sensor quirks and the particular day's
temperature. Prefer the lowest-order model that captures the behaviour you intend to
control: FOPDT for sluggish plants, a second-order model plus perhaps one resonance for
a servo axis. If a fitted pole or zero has no physical story you can tell about it, a
mass, a compliance, a filter, a delay, treat it as an artefact of the fit rather than
a fact about the machine.</p>
<h3>Validate before you trust</h3>
<ul>
<li><b>Hold-out data</b>: fit on one data set, test the fit on a different run,
ideally a different amplitude or operating point. A model that only fits its own
training run has learned the noise.</li>
<li><b>Residuals</b>: subtract model prediction from measurement; the leftover should
look like noise. Structure in the residuals (a ramp, a periodic component) is the
model telling you what it is missing.</li>
<li><b>Physical sanity</b>: does the fitted gain match a back-of-envelope calculation
from the motor constant and the load? Does the time constant match the thermal mass?
If the numbers and the physics disagree, believe neither until you know why.</li>
</ul>
<p>The deliverable of identification is not a transfer function, it is justified
confidence: you know what the plant does, over what range, and where the model stops
being valid.</p>`,
quiz: [
{ q: "In an FOPDT fit, the ratio of dead time L to time constant tau tells you:",
o: ["The steady-state gain", "How difficult the loop will be to tune tightly", "The sample rate to use", "The actuator saturation limit"],
a: 1, why: "When dead time is comparable to or larger than the time constant, delay dominates the dynamics and the achievable bandwidth drops sharply." },
{ q: "Naively fitting a model to data logged under feedback tends to:",
o: ["Overestimate the dead time only", "Work fine if the data set is long", "Require a Kalman filter", "Produce a biased model because the controller correlates input with noise"],
a: 3, why: "Feedback moves the input in response to output noise, so the estimator misattributes cause and effect; a deliberate external excitation is needed." },
{ q: "A frequency sweep is preferred over a step test when:",
o: ["The plant has resonances that matter near crossover", "The plant is a slow thermal system", "The actuator is weak", "You have no data logger"],
a: 0, why: "A step's energy is concentrated at low frequency; a sweep excites and reveals the resonant peaks and phase behaviour where stability is decided." },
{ q: "The best argument against fitting a sixth-order model to step-test data:",
o: ["Sixth-order maths is too slow to run", "It cannot fit the data well", "The extra poles mostly fit noise and the model will not generalise", "Controllers cannot use high-order models"],
a: 2, why: "Higher order always fits better on the training data; validation on held-out runs and physical interpretability are what justify model complexity." }
],
interview: {
q: "You inherit a temperature-controlled stage with no documentation. Walk me through getting a model you would trust.",
a: "First I would open the loop and characterise steady behaviour: a few constant heater powers, waiting for settle, gives me the static gain and confirms linearity over my operating range. Then a step test at a representative point: from the response I fit dead time, time constant and gain, an FOPDT model, which is usually enough for thermal control. I would repeat the step at a different amplitude and in both directions to check the model holds and to expose any asymmetry. Validation matters more than fitting: I predict the second run with the model fitted on the first and look at the residuals for structure. Finally a sanity check against physics, does the time constant match the thermal mass, and I would note the model's valid range explicitly before tuning against it."
}
},

{
id: "ct-ff",
track: "Control",
title: "Feedforward and disturbance rejection",
mins: 25,
body: `
<p>Feedback is a wonderful thing with a built-in flaw: it acts only after an error
exists. The loop must see the error, so the error must happen. Feedforward is the
complementary idea: if you know what is coming, act now, and leave feedback to clean
up only what you could not predict. The best-performing motion and process systems are
almost never feedback masterpieces; they are good feedforward with modest feedback
behind it.</p>
<h3>The division of labour</h3>
<ul>
<li><b>Feedforward handles the known</b>: the commanded trajectory, the measured
incoming disturbance, gravity on a robot arm, the friction you have characterised.
It is fast, adds no stability risk (it is outside the loop), and its accuracy is
limited only by your model.</li>
<li><b>Feedback handles the unknown</b>: model error, unmeasured disturbances, drift.
It is robust but late, and pushing it harder costs stability margin.</li>
</ul>
<p>For a servo axis the standard package is velocity and acceleration feedforward:
from the trajectory you already know the velocity and acceleration you are about to
demand, so feed the drive the current that motor physics says those require. The
feedback loop then corrects a residual of a few percent instead of generating the
entire effort from error, and tracking error shrinks by an order of magnitude without
touching the loop gains.</p>
<h3>Disturbance rejection by measurement</h3>
<p>If a disturbance can be measured before it hits the output, feed it forward. The
outside-temperature sensor on a building controller, the upstream flow meter on a
mixing process, the current draw of a tool about to engage: measure, multiply by a
model of its effect, subtract at the actuator. A disturbance observer is the same idea
when you cannot measure the disturbance directly: compare what the plant did with what
your model says the applied input should have done; the difference is an estimate of
the lumped disturbance, which you then cancel. It is feedback in implementation but
feedforward in spirit, and at concept level that is the sentence to say: estimate the
disturbance from the model mismatch, then subtract it.</p>
<h3>Reference shaping</h3>
<p>The cheapest feedforward of all is not demanding the impossible. A step setpoint
asks for infinite acceleration; the loop responds with saturation and overshoot.
Shaping the reference, an S-curve profile, a modest low-pass, or input shaping that
places its notches at a known structural resonance so the move itself does not ring
the mechanism, often improves behaviour more than any gain change. The plant only ever
sees demands it can physically follow.</p>
<h3>When feedforward errors bite</h3>
<p>Feedforward has no self-correction: it is open loop, so its errors pass straight
through. A gravity model with the wrong payload mass pushes the arm consistently
wrong, and feedback must fight it forever, wasting control authority and hiding the
defect. A friction model that overcompensates injects energy at velocity reversals and
causes limit cycling around zero speed. Sign errors are the spectacular case: the
feedforward actively works against the loop with the full confidence of a model. The
disciplines that keep feedforward honest are: let feedback trim it (watch the average
feedback effort, since persistent nonzero effort means the feedforward model is
wrong), prefer slightly undercompensating where the model is uncertain, especially for
friction, and log the feedforward and feedback contributions separately so you can see
which is doing the work.</p>`,
quiz: [
{ q: "The core division of labour is:",
o: ["Feedback for speed, feedforward for accuracy", "Feedforward acts on what is known or measured in advance; feedback corrects the residual unknown", "Feedforward for slow plants only", "Feedback for the trajectory, feedforward for noise"],
a: 1, why: "Feedforward is predictive and stability-free but only as good as its model; feedback is robust but must wait for an error to exist." },
{ q: "Acceleration feedforward on a servo axis works because:",
o: ["It increases the loop gain", "It filters encoder noise", "The trajectory tells you in advance the effort the move requires, so the loop only corrects the residual", "It removes the need for a velocity loop"],
a: 2, why: "The demanded acceleration is known before any error appears; supplying the corresponding current directly means feedback handles only model error." },
{ q: "A disturbance observer estimates the disturbance by:",
o: ["Adding a second sensor on the disturbance path", "Increasing integral gain until offset disappears", "Differentiating the setpoint", "Comparing actual plant behaviour with what the model predicts for the applied input"],
a: 3, why: "The gap between modelled and observed response is attributed to a lumped disturbance, which is then cancelled at the input." },
{ q: "A persistent nonzero average feedback effort in a system with feedforward indicates:",
o: ["The feedforward model is wrong and feedback is permanently compensating for it", "The loop is unstable", "The sample rate is too high", "Normal healthy operation"],
a: 0, why: "With correct feedforward, feedback should average near zero; a steady offset means the model is carrying an error that feedback must continuously fight." }
],
interview: {
q: "Your pick-and-place gantry tracks well at low speed but lags badly during fast moves, and cranking the position gain causes ringing. What do you do?",
a: "Tracking lag that grows with speed and acceleration is the signature of a loop generating all its effort from error, so my first move is feedforward rather than more gain. From the trajectory generator I already know demanded velocity and acceleration, so I add velocity feedforward scaled by the drive constant, then acceleration feedforward scaled by the moving mass, verified against a measured step of current versus acceleration. I would also check the reference itself: if moves are near-step demands, I would switch to S-curve profiles so the axis is never asked for effort it cannot deliver. I would validate by logging feedback contribution during a fast move; it should collapse to a small residual. The position gain then stays modest, keeping the margin that cranking it would have spent."
}
},

{
id: "ct-lqr",
track: "Control",
title: "Optimal control concepts: LQR and MPC",
mins: 30,
body: `
<p>Classical tuning asks: what gains feel right? Optimal control asks a better
question: what do I actually want, stated as a cost, and what controller minimises it?
You may never hand-derive a Riccati equation in industry, but the vocabulary of costs,
weights and horizons is now the shared language of advanced motion control, robotics
and process control, and interviewers use it as a shibboleth.</p>
<h3>Cost function thinking</h3>
<p>Write down a number that measures badness: typically a weighted sum of state error
squared and control effort squared, accumulated over time. The Q weights price state
errors (how much do I mind position error versus velocity error), the R weight prices
actuator effort. Everything interesting lives in the ratio. Heavy Q relative to R buys
aggressive, fast regulation at the cost of large control signals; heavy R buys gentle,
efficient control that tolerates error. This is the honest version of the tuning
conversation: instead of nudging gains, you state your priorities and let the
machinery translate them into gains.</p>
<h3>LQR is tuned state feedback</h3>
<p>For a linear plant and that quadratic cost, the optimal controller turns out to be
astonishingly simple: full state feedback, u = -Kx, with the gain matrix K computed
from the model and the weights. No new structure, just a principled way to choose the
gains you would have guessed. In practice you iterate: pick weights, compute K,
simulate, notice the actuator saturates or a state responds too lazily, adjust weights,
repeat. LQR also hands you good stability margins for free in the ideal full-state
case. Its honest limitations: it needs all states (so you usually pair it with an
estimator such as a Kalman filter), it trusts the linear model, and, critically, it
knows nothing about constraints. It will happily command more torque than the
amplifier has.</p>
<h3>MPC in words</h3>
<p>Model predictive control runs the same cost-minimising idea forward in time,
repeatedly. At each tick: using the model, predict the next few seconds for candidate
input sequences; find the sequence minimising the cost while respecting every
constraint; apply only the first input of that sequence; throw the rest away; measure;
repeat from the new state. The receding horizon is the trick: replanning every tick
from the measured state is what makes an open-loop optimisation into robust feedback.</p>
<h3>Constraints are why MPC exists</h3>
<p>If there were no constraints, MPC would mostly collapse to LQR and not be worth the
computation. The value is that limits are first-class citizens: actuator saturation,
rate limits, a temperature that must never exceed a bound, an obstacle a trajectory
must avoid. LQR plus clamping violates optimality the moment the clamp engages and
needs anti-windup patches; MPC plans within the limits, so it approaches a bound like
a driver who can see it, braking early, rather than one who discovers it on impact.
That is the sentence to say in interviews: MPC is the controller that knows about
limits in advance.</p>
<h3>Computational realities</h3>
<p>The cost is solving an optimisation, typically a quadratic programme, every tick.
That is routine at process-control rates of seconds and entirely feasible at tens to
hundreds of hertz on modern embedded hardware with structured solvers; it gets
demanding at multi-kilohertz servo rates or on small microcontrollers. Mitigations
exist and are worth knowing by name: explicit MPC precomputes the solution as a lookup
over regions (fine for small problems), warm starting reuses last tick's solution, and
short horizons plus move blocking shrink the problem. And a solver can fail or run out
of time mid-flight, so a deployed MPC always carries a fallback answer, such as last
tick's plan shifted one step, and a watchdog on solve time.</p>`,
quiz: [
{ q: "In the LQR cost, increasing R relative to Q produces:",
o: ["Faster response with larger control signals", "Instability", "Gentler control effort with more tolerated state error", "No change; only Q matters"],
a: 2, why: "R prices actuator effort; weighting it heavily tells the optimiser that effort is expensive, so it accepts slower, softer regulation." },
{ q: "The LQR result u = -Kx is notable because:",
o: ["The optimal controller for a quadratic cost is just state feedback with principled gains", "It requires no plant model", "It handles actuator saturation optimally", "It works only for first-order plants"],
a: 0, why: "LQR adds no exotic structure; it is a systematic way to choose state feedback gains from stated priorities. Constraints, however, are outside its theory." },
{ q: "MPC applies only the first input of each optimised sequence because:",
o: ["The rest of the sequence is always infeasible", "Solvers can only return one value", "Actuators cannot store sequences", "Re-solving from each new measurement is what turns the plan into feedback"],
a: 3, why: "The receding horizon means every tick replans from the measured state, so model error and disturbances are corrected continuously." },
{ q: "The strongest single justification for paying MPC's computational cost is:",
o: ["It needs no state estimator", "It treats constraints as part of the plan rather than as after-the-fact clamps", "It runs faster than PID", "It eliminates the need for a model"],
a: 1, why: "Respecting saturation, rate and state limits inside the optimisation is the capability LQR and PID fundamentally lack; without constraints MPC loses most of its advantage." }
],
interview: {
q: "When would you recommend MPC over a well-tuned PID or LQR, and what would make you hesitate?",
a: "I reach for MPC when constraints genuinely shape the problem: an actuator that spends real time saturated, states with hard limits like temperature or position bounds, or multivariable plants where inputs fight each other and coordinated moves matter. There, planning within limits beats clamping a linear controller and patching with anti-windup. I hesitate when the plant is simple and unconstrained, where PID with feedforward gives equal performance for a fraction of the engineering, and I hesitate on compute grounds: a QP every tick is easy at process rates but serious work at kilohertz servo rates on a small micro. I would also want a validated model, since MPC's plans are only as good as its predictions, and a defined fallback behaviour for when the solver fails or overruns its time budget."
}
},

{
id: "ct-nonlinear",
track: "Control",
title: "Nonlinear realities",
mins: 30,
body: `
<p>Every controller you tune on a real machine is a linear idea negotiating with a
nonlinear world. Friction, deadband, backlash and saturation are not exotic corner
cases; they are the standard furniture of motors, gearboxes and valves, and they
produce the characteristic misbehaviours, hunting, limit cycles, sticky settling, that
distinguish real machines from simulations.</p>
<h3>Stiction and Coulomb friction</h3>
<p>Coulomb friction is a constant force opposing motion regardless of speed; stiction
is the extra force needed to start moving at all. Together they make low-speed
behaviour ugly: the axis sticks, error grows, the integrator winds up until the force
breaks stiction, the axis jumps past the target, sticks on the other side, and the
cycle repeats. That stick-slip oscillation around the setpoint is a limit cycle: a
self-sustaining oscillation of fixed amplitude, unlike a linear instability whose
amplitude grows without bound. Seeing a small, constant-amplitude wobble around a
setpoint should make you say friction plus integrator before you blame the gains.</p>
<h3>Deadband and backlash</h3>
<p>Deadband is a region of input around zero that produces no output: an amplifier
that will not pass small commands, a valve that does not move for small signals.
Inside the deadband the loop is effectively open, so error wanders freely and the
integrator quietly winds. Backlash is the mechanical cousin: slack in a gear train or
coupling, so on every reversal the motor traverses the gap before the load moves. The
load-side position lags by the gap width, direction-dependently. Backlash inside a
position loop that senses on the load side is a classic limit-cycle generator: the
controller reverses, momentarily loses the plant, overshoots, reverses again. Fixes
are ranked: remove it mechanically (preloaded nuts, anti-backlash gears, direct
drive), sense on the motor side for the fast loop, or accept a settling window wider
than the gap.</p>
<h3>Saturation interactions</h3>
<p>Saturation on its own just caps performance, but it interacts viciously with
integrators, which is the windup story, and with everything downstream of it: while
the actuator is pinned, the loop is open, and whatever the linear design promised is
suspended. Rate limits are subtler saturations, a slew-limited amplifier or a valve
with finite travel speed adds an amplitude-dependent lag: small signals pass
unharmed, large signals arrive late, so the system can be stable for small commands
and oscillate for large ones. Amplitude-dependent stability is the tell that a rate
limit is in play.</p>
<h3>Describing-function intuition</h3>
<p>The classical tool for predicting limit cycles is the describing function: treat
the nonlinearity as a gain that depends on the amplitude of the sine passing through
it. Saturation looks like a gain that falls as amplitude grows; a relay looks like a
gain that falls as 1 over amplitude. A limit cycle can settle exactly where this
amplitude-dependent gain makes the loop gain equal to 1 at 180 degrees of phase: too
big an oscillation and the effective gain drops, shrinking it; too small and gain
rises, growing it. You rarely compute one in industry, but the intuition explains why
limit cycles have a preferred amplitude and how relay auto-tuners deliberately induce
a small limit cycle to measure the plant.</p>
<h3>Linearisation validity</h3>
<p>Linear models are local. A linearisation is valid in a neighbourhood of its
operating point, and the honest engineering questions are how big that neighbourhood
is and whether operation stays inside it. A pendulum linearised upright is fine for
small angles; a flow process linearised at one valve opening has a gain that may
double at another. When behaviour differs at different setpoints or amplitudes,
suspect the operating point has left the model. The practical responses are gain
scheduling across operating points, or feedback linearisation where a good model of
the nonlinearity lets you cancel it, as gravity compensation does on a robot arm.</p>`,
quiz: [
{ q: "A servo axis exhibits a small constant-amplitude oscillation around its setpoint at rest. The most likely culprit is:",
o: ["Too little proportional gain", "Stiction interacting with integral action, producing a stick-slip limit cycle", "A failing encoder", "Sample rate too high"],
a: 1, why: "The stick, wind-up, break-free, overshoot cycle has a characteristic fixed amplitude; a linear instability would grow rather than hold amplitude." },
{ q: "Backlash causes trouble in a load-side position loop chiefly because:",
o: ["It adds high-frequency noise", "It increases motor temperature", "On each reversal the motor moves through the gap while the load does not, so the controller momentarily loses the plant", "It reduces static friction"],
a: 2, why: "The direction-dependent dead zone at reversals invites overshoot and re-reversal, a classic mechanism for limit cycling." },
{ q: "A system is stable for small setpoint steps but oscillates for large ones. The signature points to:",
o: ["A rate limit or slew-limited element adding amplitude-dependent phase lag", "Integral gain set to zero", "Quantisation in the ADC", "Too much derivative filtering"],
a: 0, why: "Rate limiting leaves small signals untouched but delays large ones; stability that depends on amplitude is the fingerprint of this nonlinearity." },
{ q: "The describing function models a nonlinearity as:",
o: ["A pure time delay", "Additional white noise", "A higher-order linear filter", "An equivalent gain that varies with the amplitude of the signal through it"],
a: 3, why: "Amplitude-dependent equivalent gain predicts where a limit cycle can self-sustain, which is why limit cycles settle at a preferred amplitude." }
],
interview: {
q: "A precision stage settles to within 5 microns quickly, but closing the last micron takes seconds and sometimes it parks 2 microns off. Diagnose and propose fixes.",
a: "That is friction at low speed. Near the target the drive force falls below the stiction threshold, the stage stops early, and only integrator wind-up eventually breaks it free, which explains both the slow crawl and the occasional parking offset when the integral cannot quite build enough force. I would confirm by plotting commanded force against position error near settle and looking for the stick-slip staircase. Fixes in order of preference: reduce the friction itself, bearings, preload, lubrication; add friction feedforward slightly under-compensated so I do not inject energy at reversals; use a dither signal if the mechanism tolerates it; and shape the integrator, a higher gain only inside a small error window, with anti-windup, so force builds quickly at the end of the move without destabilising the main travel."
}
},

{
id: "ct-cascade",
track: "Control",
title: "Cascade and multi-loop control",
mins: 25,
body: `
<p>Almost every serious motion controller is not one loop but a nest of them: a current
loop inside a velocity loop inside a position loop. Cascade control is the idea that a
fast inner loop should manage a fast, locally measurable quantity, so that the outer
loop can command that quantity as if it were an ideal actuator. Understanding why this
structure wins, and how to tune it without chasing your tail, is bread-and-butter
interview material for anyone touching motors, stages or process plants.</p>
<h3>The rationale, using the servo stack</h3>
<ul>
<li><b>Current loop</b> (innermost, kilohertz bandwidth): current maps directly to
torque, and electrical dynamics are fast. This loop makes the motor behave as a
torque source, and it is also where the fastest disturbances, supply variation,
back-EMF, are cancelled before anything else sees them.</li>
<li><b>Velocity loop</b> (middle, hundreds of hertz): commands torque, regulates
speed. It absorbs mechanical disturbances, load torque changes, friction, so the
position loop never needs to know about them.</li>
<li><b>Position loop</b> (outermost, tens of hertz): commands velocity, closes on
the quantity you actually care about. Because its actuator is now a well-behaved
velocity source, it can often be a simple proportional gain.</li>
</ul>
<p>The general principle: each loop linearises and disturbance-proofs its layer, so
the loop above inherits a simpler, better-behaved plant. A disturbance is fought by
the innermost loop that can see it, which is always the fastest, so corrections happen
before the slower loops accumulate error.</p>
<h3>The bandwidth separation rule</h3>
<p>The scheme relies on timescale separation: each outer loop should be substantially
slower than the loop inside it, a factor of 3 to 5 in bandwidth as the usual guidance,
with 10 being comfortable. The outer loop then sees the inner loop as approximately
instantaneous, a gain of one. If the separation shrinks, that assumption fails: the
inner loop's own lag and resonance intrude into the outer loop's crossover region,
the loops start reacting to each other's transients, and the cascade can perform worse
than a single well-tuned loop. When someone cannot get an outer loop stable at a
respectable gain, the first question is what bandwidth the inner loop actually
achieves, measured, not assumed from the vendor datasheet.</p>
<h3>Tuning order: inside out, always</h3>
<ol>
<li>Open or freeze the outer loops. Tune the current loop against the motor's
electrical model; verify its bandwidth with a small excitation.</li>
<li>Close and tune the velocity loop, treating the current loop as a torque source.
Check its step response and bandwidth.</li>
<li>Finally tune the position loop against the now well-characterised velocity
plant.</li>
</ol>
<p>Tuning in any other order means adjusting a loop whose plant is still changing
underneath it, which is how people end up with three half-tuned loops and no idea
which knob caused the latest wobble. Retuning an inner loop invalidates the tuning of
everything outside it; that dependency is worth stating out loud in a review.</p>
<h3>Interaction pitfalls</h3>
<ul>
<li><b>Inner-loop saturation</b>: when the velocity loop's output (current demand)
saturates, the position loop's effective plant changes and its own integrator winds
up. Cascades need anti-windup at every level, and ideally the inner loop reports
saturation upward so outer integrators pause.</li>
<li><b>Sensor quality mismatch</b>: an inner loop closed on a noisy estimate (velocity
derived from a coarse encoder) injects its noise into everything above. The inner
loop's sensor must be good at the inner loop's bandwidth.</li>
<li><b>Setpoint steps between layers</b>: outer loops should hand smooth commands to
inner loops; a stepping outer output excites inner-loop transients. Profile or filter
between layers where needed.</li>
<li><b>Multivariable coupling</b>: with two cascades on physically coupled axes, a
gantry with two motors on one beam, the loops fight through the mechanics. That is
the point where independent cascades stop being the right tool and coordinated or
multivariable control earns its complexity.</li>
</ul>`,
quiz: [
{ q: "The main reason a load-torque disturbance barely shows in position on a cascaded servo is:",
o: ["The position loop integrator removes it", "Torque disturbances do not affect position", "The encoder filters it out", "The velocity loop sees and cancels it before significant position error accumulates"],
a: 3, why: "Disturbances are fought by the innermost loop that can observe them; the fast velocity loop corrects load torque long before the slow position loop would." },
{ q: "The bandwidth separation guideline between adjacent loops is roughly:",
o: ["A factor of 3 to 10, outer slower than inner", "Equal bandwidths for best coordination", "A factor of 100 minimum", "Outer faster than inner"],
a: 0, why: "Separation lets the outer loop treat the inner as instantaneous; equal bandwidths make the loops interact through each other's dynamics." },
{ q: "Correct tuning order for a position-velocity-current cascade:",
o: ["Position first since it is what matters", "All simultaneously with an optimiser", "Current, then velocity, then position", "Velocity first, then the others"],
a: 2, why: "Each loop's plant includes the closed inner loops, so inner loops must be finished first; retuning an inner loop invalidates the outer tuning." },
{ q: "When the inner loop saturates, the outer loop should ideally:",
o: ["Increase its gain to compensate", "Be informed so its integrator pauses, preventing wind-up against an actuator that cannot respond", "Switch to open loop", "Reverse its output sign"],
a: 1, why: "During inner saturation the outer loop is effectively open; integrating through that state stores up overshoot, so cascades need anti-windup at every level." }
],
interview: {
q: "A junior asks why we bother with three nested loops on a servo drive instead of one clever position controller. What is your answer?",
a: "Each loop turns a messy layer of physics into a clean actuator for the layer above. The current loop runs at kilohertz because electrical dynamics are fast, and it makes the motor look like a pure torque source, cancelling supply and back-EMF effects immediately. The velocity loop then rejects load and friction disturbances within milliseconds, so they never grow into position errors. By the time we reach the position loop, its plant is nearly an ideal integrator, and a simple gain closes it. A single loop would need one controller to manage all those timescales at once, and every disturbance would have to propagate into position error before anything reacted. The cascade also helps practically: each loop is tuned and verified independently, inside out, and faults localise to a layer."
}
},

{
id: "ct-adaptive",
track: "Control",
title: "Adaptive, scheduled and learned control",
mins: 30,
body: `
<p>Fixed-gain controllers assume the plant holds still. Many plants do not: a robot arm
whose inertia changes with pose and payload, a process whose gain shifts with
throughput, an aircraft across its flight envelope. There is a spectrum of responses,
from scheduling gains you computed offline, through adapting them online, to learning
a policy from data, and the engineering judgement is knowing how far along that
spectrum a problem actually requires you to go, because each step costs verification
difficulty.</p>
<h3>Gain scheduling done safely</h3>
<p>Gain scheduling is the workhorse: identify or design controllers at several
operating points, then interpolate the gains using a measured scheduling variable,
speed, load, dynamic pressure. It is adaptive control with the adaptation designed and
verified offline, which is exactly why industries that certify software love it. The
safety disciplines are worth reciting: choose a scheduling variable that is measured
reliably and changes slowly relative to the loop; verify stability at the design
points and at points between them, since interpolated gains are not automatically
stable even when the endpoints are; rate-limit and smooth the gain transitions so the
schedule itself does not inject transients; and clamp the schedule at its calibrated
edges rather than extrapolating.</p>
<h3>MRAC in concept</h3>
<p>Model reference adaptive control closes a second loop around the controller
itself. You state a reference model, the closed-loop response you wish you had, and an
adaptation law adjusts controller gains online to drive the error between the real
response and the reference response toward zero. The plant reveals itself through its
behaviour, and the gains chase it. The concept is elegant; the caveats are the
interview material: adaptation needs persistent excitation to identify anything (gains
can drift aimlessly during quiet operation), fast adaptation fights noise and can
itself go unstable, and a wrong gain learned in one transient is applied to the next.
Production MRAC therefore ships wrapped in projection bounds that confine gains to a
safe box, dead zones that stop adaptation when the error is within noise, and slow
adaptation rates.</p>
<h3>When learned control is justified</h3>
<p>Reinforcement learning earns its keep when the plant or task defeats modelling:
contact-rich manipulation, legged locomotion over unstructured terrain, wildly
nonlinear dynamics where classical synthesis has nothing to grip. If a plant is
linear enough to identify, PID, LQR or MPC will match a learned policy with far less
data, far more predictability and a stability argument you can write down; reaching
for RL there is resume-driven engineering. The honest cost list: sample hunger (hence
training in simulation), the sim-to-real gap (hence domain randomisation), and the
central problem that a neural policy resists the verification tools the field trusts,
since you cannot state its margins.</p>
<h3>Safety envelopes around learned policies</h3>
<p>The emerging consensus is that you do not certify the learned policy; you cage it.
The policy proposes, a verified layer disposes. Concretely: hard clamps on the
policy's action magnitude and rate; a runtime monitor watching envelope variables,
joint limits, velocities, currents, tilt, with authority to override; a verified
fallback controller, even a crude damping law, that takes over when the monitor
trips; and shielding or barrier-function filters that project a proposed action back
into a set proven safe before it reaches the actuator. The learned part supplies
performance inside the envelope; the classical part guarantees the envelope holds.
That division lets you make a safety argument that does not depend on explaining the
network's weights.</p>
<p>The spectrum summarised: schedule when you can measure what changes, adapt when you
must track slow unknown drift, learn when the dynamics defeat modelling, and in every
case put the intelligence inside a boundary that something simple and verified is
guarding.</p>`,
quiz: [
{ q: "Gain scheduling is favoured in certified industries because:",
o: ["It needs no scheduling sensor", "It adapts faster than MRAC", "The adaptation is designed and verified offline, so runtime behaviour is predictable", "It works without any plant model"],
a: 2, why: "All the variability is examined before deployment; the controller merely interpolates pre-verified designs rather than changing itself in the field." },
{ q: "Verifying a gain schedule only at its design points is insufficient because:",
o: ["Design points are usually mismeasured", "Stability at interpolated gains between verified points is not guaranteed", "Interpolation is too slow for real time", "Scheduling variables cannot be trusted"],
a: 1, why: "Linear interpolation between two stable gain sets can pass through combinations that are not stable; intermediate points need checking too." },
{ q: "In MRAC, gains drifting during long periods of gentle operation is caused by:",
o: ["Integrator windup in the plant", "Lack of persistent excitation, so the adaptation has no information to work with", "Too small a reference model", "Sensor calibration error"],
a: 1, why: "Without informative excitation the error signal cannot pin down parameters, so adaptation wanders; dead zones and projection bounds are the standard defences." },
{ q: "The most defensible way to deploy an RL policy on real hardware is:",
o: ["Retrain continuously on the hardware", "Keep episodes short", "Prove the network weights are correct", "Constrain its actions inside a monitored envelope with a verified fallback controller"],
a: 3, why: "The safety argument attaches to the cage, clamps, runtime monitors, fallback, not to the unverifiable policy, so performance and safety are separated." }
],
interview: {
q: "Your team proposes RL for a robot arm task currently handled adequately by scheduled PID. How do you evaluate the proposal?",
a: "I would start by asking what specifically the current controller fails at, because RL must be justified by a modelling gap, not by novelty. If the task is contact-rich or the dynamics genuinely defeat identification, RL is a legitimate tool; if the scheduled PID meets spec, the burden of proof is heavy, since we would trade a controller with stability margins we can state for a policy we can only test statistically. If we proceed, I would insist on the safety architecture up front: action and rate clamps, a runtime envelope monitor on joint limits and currents, and a verified fallback that takes over on violation, so the safety case never depends on the network. I would also budget honestly for simulation training and sim-to-real work, which usually dwarfs the algorithm effort."
}
},

{
id: "ct-faults",
track: "Control",
title: "Fault handling and safe states",
mins: 30,
body: `
<p>A control system's quality shows on its worst day: the encoder cable half-broken,
the amplifier overheating, the software task overrunning. Fault handling is not a
bolt-on after the loop works; the safe state is a design input, and interviewers for
robotics and instrumentation roles probe it because it separates people who have
shipped hardware from people who have simulated it.</p>
<h3>Design the safe state first</h3>
<p>Before designing any detection logic, answer: when this system must give up, what
does it do? The answer is physics, not software. A gravity-loaded vertical axis must
brake, since disabling the drive drops the load; a spinning tool may need active
braking versus coasting; a heater's safe state is off, but a cryogenic valve's safe
state may be open. A safe state should be reachable without the components that just
failed, which is why it is usually dumb: a mechanical brake, a relay, a watchdog
hardware line, rather than a software path through the possibly-sick controller. Every
fault response then becomes a route to that state, and detection logic has a
destination to aim at.</p>
<h3>Sensor validity checks</h3>
<p>Never let a raw sensor reading command an actuator without a plausibility gate.
The standard battery: range checks (a thermocouple reading absolute zero is
disconnected, not cold); rate checks (a position that teleports is a glitch, since
physics limits speed); stuck-at detection (a reading frozen bit-identical for many
samples while the actuator moves means a dead sensor, and it defeats range checks
because the frozen value is plausible); and cross checks or model checks, comparing
redundant sensors or comparing a reading against what the model predicts, an
innovation gate in Kalman terms. Vote before you trust, and treat a sensor declared
invalid as absent, not as its last value.</p>
<h3>Actuator fault symptoms</h3>
<p>Actuator faults are visible mostly through the loop's own behaviour. Rising average
control effort for the same task is degradation announcing itself: friction growing,
a supply sagging, a winding failing, which makes logged effort a free health monitor.
Saturation lasting far longer than any commanded move suggests the actuator has lost
authority or the load has changed. Persistent tracking error with the loop active
means the commanded output is not producing the modelled effect: a slipping coupling,
a sheared key, a dead phase. The general trick is that a feedback loop hides faults
by compensating for them, so you must watch the effort it spends, not just the error
it achieves.</p>
<h3>Watchdogs and degraded modes</h3>
<p>A watchdog catches the failure mode software cannot self-report: the hung or
overrunning task. The control task kicks the watchdog each healthy cycle; kicked too
late, hardware forces the safe state with no software cooperation required. Disable
lines and brake relays should be driven by this hardware path. Above the hard stop
sits a ladder of degraded modes, because full stop is not always safest or necessary:
a rover that loses one wheel encoder can continue on the others at reduced speed; a
stage that loses its fine sensor can fall back to the coarse encoder with wider
tolerances; a fusion system that loses one sensor widens its uncertainty and slows
down. Each degraded mode needs its own entry condition, its own limits, and honest
annunciation, since silently degraded systems erode exactly the trust that fault
handling is meant to build.</p>
<h3>Bumpless fallback</h3>
<p>Transitions are where fault handling injects its own faults. Switching controllers
or sensors with mismatched internal states kicks the actuator: the backup controller's
integrator holds a stale value, the coarse encoder disagrees with the fine one by an
offset. Bumpless transfer means the standby path is initialised from the active one at
the moment of switchover, integrator preloaded so the output is continuous, offsets
reconciled, rates limited through the transition. The same discipline applies to
recovery: re-entering normal mode should also be bumpless, and should require the
fault to have been absent for a qualifying period, with hysteresis so a marginal
sensor cannot flap the system between modes.</p>`,
quiz: [
{ q: "The safe state should be designed first because:",
o: ["It is required by every standard", "Every fault response needs a defined destination, and the safe state is dictated by physics, not software", "It makes the code shorter", "Detection logic cannot be written otherwise"],
a: 1, why: "What the system must do when it gives up (brake, coast, vent, hold) comes from the physical hazard, and all detection and fallback logic then routes toward it." },
{ q: "A stuck-at sensor fault defeats simple range checking because:",
o: ["It only happens outside the range limits", "Range checks are too slow", "The frozen value is typically a plausible in-range reading", "Stuck sensors read exactly zero"],
a: 2, why: "A sensor frozen at a legitimate value passes range gates; detecting it requires noticing the value does not change while the physical state should be changing." },
{ q: "The best early indicator of a degrading actuator in a well-tuned loop is often:",
o: ["Rising average control effort for the same task, since feedback masks faults by compensating", "Growing steady-state error", "Louder audible noise", "A change in sample rate"],
a: 0, why: "The loop hides degradation by working harder, so tracking may look perfect while effort climbs; logging effort turns the controller into a health monitor." },
{ q: "Bumpless transfer to a backup controller primarily requires:",
o: ["A faster backup processor", "Identical gains in both controllers", "Switching only at zero velocity", "Initialising the backup's internal state, especially its integrator, from the active path at switchover"],
a: 3, why: "A stale or zeroed integrator in the incoming controller steps the actuator command; preloading state and reconciling offsets keeps the output continuous." }
],
interview: {
q: "You are reviewing a junior's motion controller and the fault handling is one line: on any error, disable the drive. Critique it.",
a: "First question: what does the axis do when the drive disables? On a vertical axis that drops the load, so the safe state itself is wrong: the brake must engage first, driven by a hardware path a hung processor cannot block. Second, one response for all faults is too coarse: a transient encoder glitch, a warm amplifier and a snapped coupling deserve different reactions, from filtered rejection through derated operation to immediate stop. Third, there is no detection design: I would want range, rate and stuck-at gates on sensors, plus monitoring of control effort, which is how actuator degradation shows up while tracking still looks fine. Finally, recovery must be bumpless, with hysteresis so a marginal sensor cannot flap us between modes. I would define the safe state first and rebuild backward from it."
}
}

);
