// Control track expansion lessons. Loaded after data.js; appends to LESSONS.

LESSONS.push(

{
id: "ct-stability",
track: "Control",
title: "Stability and margins by intuition",
mins: 25,
body: `
<p>Every feedback loop is a race between a correction and the error it corrects. The
loop measures, computes, actuates, and the plant responds; each stage takes time, and
time is phase lag. If, at some frequency, the total lag around the loop reaches half a
cycle (180 degrees), a correction arrives exactly inverted: the push meant to cancel
the error now reinforces it. If the loop gain at that frequency is above 1, each lap
around the loop grows the disturbance, and the system oscillates. That is instability
in one paragraph, and it is worth being able to say it exactly this plainly.</p>
<h3>Margins, without the Bode ceremony</h3>
<p>Margins measure how far you are from that fatal combination.</p>
<ul>
<li><b>Gain margin</b>: at the frequency where lag hits 180 degrees, how much below 1
is the loop gain? A gain margin of 6 dB means you could double the gain before the
loop rings continuously. It is your safety factor against the plant being stronger
than you modelled: a stiffer spring, a lighter load on the motor, a warmer amplifier.</li>
<li><b>Phase margin</b>: at the frequency where gain crosses 1, how far short of 180
degrees is the lag? Around 60 degrees gives a calm, well-damped response; 30 degrees
gives visible ringing; near zero the system hunts. Phase margin is your safety factor
against extra delay you did not budget for.</li>
</ul>
<p>The two margins answer two different what-ifs: gain margin protects against the
plant getting hotter, phase margin against it getting slower.</p>
<h3>Delay, the great destabiliser</h3>
<p>Pure delay is uniquely nasty because it adds phase lag that grows without limit as
frequency rises, while leaving the gain untouched. A filter that lags also attenuates,
so it partly defuses itself; a transport delay does not. Twenty milliseconds of image
processing latency in a visual servo loop, one sample of communication delay to a
motor drive, a serial link buffering a packet: each eats phase margin directly. The
practical rule is that the loop bandwidth you can achieve is limited to a modest
fraction of one over the total loop delay. If someone asks why the vision-guided robot
cannot be tuned as tight as the encoder loop, the answer is almost always delay.</p>
<h3>Recognising the symptoms</h3>
<ul>
<li>A loop on the edge of stability hunts at one particular frequency, the frequency
where the phase condition is met. That frequency is diagnostic: it tells you which
lags dominate.</li>
<li>Turn the gain down and the oscillation shrinks or stops: a classic linear margin
problem. Turn the gain down and a small steady wobble persists: suspect a limit cycle
from backlash, stiction or quantisation instead.</li>
<li>A loop that is fine in the middle of the stage travel but sings at one end has a
plant whose gain or resonance moves with position; your margins were spent by the
plant changing underneath you.</li>
</ul>
<h3>Saying it in an interview</h3>
<p>Explain instability as corrections arriving late enough to push the wrong way, name
the two margins as insurance against gain changes and against delay, and volunteer
that added latency is the thing that quietly destroys loops in real robots. That
demonstrates working intuition, which is what the question is probing.</p>`,
quiz: [
{ q: "A feedback loop becomes unstable when:",
o: ["Gain is above 1 at any frequency", "Phase lag exists anywhere in the loop", "Loop gain exceeds 1 at the frequency where total lag reaches 180 degrees", "The setpoint changes too quickly"],
a: 2, why: "Both conditions must coincide: inverted corrections (180 degrees of lag) that also grow each lap (gain above 1). Gain above 1 with small lag is just a responsive loop." },
{ q: "Phase margin is best described as:",
o: ["Insurance against unmodelled extra delay, measured where loop gain crosses 1", "The maximum gain the amplifier can deliver", "The difference between setpoint and output", "The width of the resonant peak"],
a: 0, why: "Phase margin is how much additional lag the loop can absorb at the unity-gain frequency before corrections arrive inverted." },
{ q: "Why is pure transport delay worse for stability than a low-pass filter with similar lag?",
o: ["Delay consumes CPU time", "Delay adds ever-growing phase lag without any attenuation to compensate", "Filters have no phase lag", "Delay only affects the integrator"],
a: 1, why: "A filter attenuates as it lags, which limits the damage; a delay keeps full gain while its phase lag grows linearly with frequency." },
{ q: "A servo axis oscillates; reducing the controller gain makes the oscillation shrink and stop. This points to:",
o: ["Backlash in the gearbox", "A broken encoder", "Sensor quantisation limit cycling", "A linear stability margin problem, with gain or phase margin exhausted"],
a: 3, why: "Amplitude scaling with gain is the linear signature; limit cycles from backlash or quantisation persist at a fixed small amplitude regardless of gain." }
],
interview: {
q: "Your robot arm hums at 40 Hz when you raise the position gain. The mechanical engineer says the arm resonates at 40 Hz. Explain what is happening and what you would do.",
a: "The resonance adds a rapid phase drop and a gain peak near 40 Hz, so as I raise the controller gain the loop crosses unity right where phase margin is thinnest, and it rings at that frequency. The hum frequency matching the resonance is the giveaway. My options, in order: add a notch filter at 40 Hz to pull loop gain down through the resonance, accept a lower bandwidth by reducing gain, or roll off the controller earlier so unity crossing happens well below the mode. Longer term, stiffening the structure or moving the sensor closer to the load raises the resonant frequency and buys real bandwidth. I would also check total loop delay, because delay spends the same margin the resonance is already consuming."
}
},

{
id: "ct-discrete",
track: "Control",
title: "Discretisation and sample-rate choices",
mins: 25,
body: `
<p>A digital controller only looks at the world at sample instants and only updates its
output at sample instants. Between updates the output is held constant by the DAC or
PWM stage: a zero-order hold. Both facts cost you phase, and phase is the currency
stability is bought with, so sample rate is a control decision, not an afterthought.</p>
<h3>What sampling does to a loop</h3>
<p>The zero-order hold makes the plant see a staircase instead of a smooth command. On
average the staircase lags the intended signal by half a sample period. That half
sample behaves exactly like transport delay: pure phase lag, no attenuation, growing
with frequency. Add the computation time between reading the ADC and writing the
output, which is often close to another full sample in naive implementations, and a
loop sampled lazily can lose tens of degrees of phase margin before you have tuned
anything.</p>
<h3>Rules of thumb that survive contact with hardware</h3>
<ul>
<li>Sample at an absolute minimum of 5 to 10 times the intended closed-loop bandwidth.
At 10 times, the half-sample hold costs about 18 degrees of phase at the bandwidth
frequency, which is already a real bite out of a 60 degree budget.</li>
<li>For comfortable margins and clean tuning, 20 to 50 times bandwidth is normal. A
1 kHz current loop inside a motor drive commonly runs at 20 to 50 kHz for exactly
this reason.</li>
<li>Write the output as early as possible in the control interrupt: read sensors,
compute, write, then do housekeeping. Moving the write from end to start of a 1 ms
task can recover most of a sample of delay.</li>
</ul>
<h3>Jitter</h3>
<p>The mathematics of a discrete controller assumes a constant sample period. If the
control task runs under an RTOS and its start time wanders because higher-priority
work preempts it, the effective derivative and integral terms fluctuate: a derivative
computed over an interval that is sometimes 0.8 ms and sometimes 1.3 ms is noise
injected straight into the actuator. Symptoms are a gritty, hissing motor and
unexplained torque ripple. The fixes are structural: run the loop from a hardware
timer interrupt, sample the ADC on a hardware trigger rather than in software, and
keep the control path at the highest priority. This is precisely why motion control
belongs in an FPGA or a timer-driven ISR rather than a best-effort thread.</p>
<h3>Aliasing inside a feedback loop</h3>
<p>Aliasing is not only a signal-processing sin; inside a loop it is a stability and
performance sin. A 7 kHz mechanical resonance sampled at 8 kHz appears to the
controller as a 1 kHz oscillation, and the controller will duly fight the phantom,
injecting real energy at a frequency where nothing is wrong. Encoder quantisation
noise and PWM ripple fold down the same way. The remedy is the same as in any
sampling system: anti-alias filtering before the ADC, sized so that whatever survives
above half the sample rate is too small to matter, while keeping the filter corner
high enough that its own phase lag does not eat the margin you were protecting.</p>
<h3>The sentence to own</h3>
<p>Slow sampling is delay, delay is phase lag, and phase lag is lost stability margin;
choose the rate from the bandwidth you need, then defend the timing.</p>`,
quiz: [
{ q: "The zero-order hold in a digital control loop behaves, on average, like:",
o: ["A gain reduction of one half", "A pure delay of half a sample period", "A high-pass filter", "An integrator"],
a: 1, why: "Holding the output constant between updates makes the applied signal lag the intended one by half a period, costing phase like transport delay." },
{ q: "A sensible minimum sample rate for a loop with 50 Hz closed-loop bandwidth is about:",
o: ["50 Hz", "100 Hz", "5 kHz or above only", "250 to 500 Hz, with more preferred for margin"],
a: 3, why: "The 5 to 10 times rule puts the floor at 250 to 500 Hz; 20 times or more makes tuning forgiving. Sampling at the bandwidth itself is hopeless." },
{ q: "Sample-time jitter in an RTOS-hosted control task chiefly corrupts:",
o: ["The setpoint", "The ADC reference voltage", "The derivative and integral terms, which assume a fixed period", "The proportional term only"],
a: 2, why: "P depends only on the current error, but I and D scale with the time step, so a wandering period injects noise through them." },
{ q: "A 7 kHz resonance in a plant sampled at 8 kHz will appear to the controller as:",
o: ["A 1 kHz signal that the controller wrongly reacts to", "Nothing, it is filtered automatically", "A 7 kHz signal, unchanged", "A DC offset"],
a: 0, why: "Content above half the sample rate folds down; 7 kHz aliases to 1 kHz, and the loop responds to the phantom with real actuator energy." }
],
interview: {
q: "You are porting a 10 kHz FPGA motor loop to a 1 kHz task on a Linux SBC. What do you expect to change, and what would you check first?",
a: "I would expect a large loss of phase margin: the sample rate drops tenfold, so the half-sample hold delay grows tenfold, and Linux adds scheduling jitter on top. Achievable bandwidth falls roughly in proportion, so the tight gains from the FPGA loop will ring or go unstable unless retuned. First I would measure actual loop timing with a toggled GPIO: period, jitter, and sensor-to-actuator latency, because those numbers, not the nominal rate, set the margin. Then I would confirm the anti-alias filtering still suits the lower rate, since resonances the FPGA loop sampled cleanly may now fold down into the band. If the application truly needs the old bandwidth, the inner loop stays in hardware or a timer ISR, and Linux supervises."
}
},

{
id: "ct-statespace",
track: "Control",
title: "State space, controllability and observers",
mins: 30,
body: `
<p>The state of a system is the shortest list of numbers that, together with future
inputs, determines all future behaviour. For a motor-driven stage: position and
velocity, perhaps motor current. For a quadruped body: pose, velocity, angular rates.
The power of the idea is that everything the past did to the system is summarised in
that one vector; you never need the history, only the state.</p>
<h3>A, B, C, D in words</h3>
<ul>
<li><b>A</b> describes the internal physics: how the state evolves on its own. Left
alone, velocity decays through friction and position integrates velocity; A encodes
exactly that.</li>
<li><b>B</b> describes actuation: which states your inputs can push on, and how hard.
Motor torque enters the velocity state through B.</li>
<li><b>C</b> describes measurement: which combinations of state your sensors actually
see. An encoder on the motor shaft reads motor angle, not load angle, and C says so
honestly.</li>
<li><b>D</b> is direct feedthrough from input to output, usually zero in mechanical
systems.</li>
</ul>
<p>Writing a plant this way is not mathematical dressing-up. It forces two blunt
questions that transfer functions let you dodge.</p>
<h3>Controllability: can my actuators reach every state?</h3>
<p>Controllability asks whether, with the inputs available, the system can be driven
from any state to any other. A two-mass stage with the motor on one mass and a soft
coupling to the other is still controllable, but weakly so near the resonance: large
inputs for small effect. A genuinely uncontrollable mode, say a vibration mode your
actuator cannot excite or damp, means no controller, however clever, can help; the fix
is mechanical, or a different actuator placement.</p>
<h3>Observability: can my sensors deduce every state?</h3>
<p>Observability is the mirror question: from the outputs you measure, can the full
state be reconstructed? With an encoder on the motor side of a belt, the load position
is observable only through the belt model; if the belt stretches unpredictably, that
state is practically unobservable and no filter can conjure it. These two questions,
what can I push and what can I see, are the first things to settle in any new machine,
and they are answered by the structure of B and C.</p>
<h3>Observers: the software sensor</h3>
<p>An observer runs a copy of the plant model in software, driven by the same commands
you send the real plant, and continuously corrects the copy using the difference
between predicted and measured outputs. The corrected model state becomes your
estimate of the true state, including states no sensor touches. Velocity estimated
from a quantised encoder, load-side position inferred from motor-side sensing, cable
tension inferred from current: all observers. The Kalman filter is exactly this
structure with the correction gain chosen optimally from noise statistics.</p>
<h3>Why state feedback generalises PID</h3>
<p>PID feeds back one measurement and manufactures a derivative and an integral from
it. State feedback feeds back every state with its own gain, which is strictly more
expressive: for a position loop, feeding back position and true velocity is PD control
with a clean, unamplified derivative, and adding an integrator state recovers the I
term. With the full state available you can, within actuator limits, place the
closed-loop dynamics where you want them, rather than nudging three knobs and hoping.
PID is state feedback for the case where the only state you can get is the error and
its crude derivatives; once an observer supplies the rest, the generalisation is
natural rather than exotic.</p>`,
quiz: [
{ q: "The state vector of a system is best described as:",
o: ["The list of sensor readings", "The minimal set of numbers that, with future inputs, determines all future behaviour", "The controller gains", "The history of all past inputs"],
a: 1, why: "State summarises the entire past; sensors may see only part of it, which is precisely why observers exist." },
{ q: "In the state equations, the B matrix tells you:",
o: ["How outputs relate to states", "How the state decays naturally", "Which states the inputs can push on, and how strongly", "The measurement noise level"],
a: 2, why: "B maps actuator inputs into state derivatives; A is the internal dynamics, C the measurements." },
{ q: "A vibration mode that no available actuator can excite or damp is:",
o: ["Unstable", "Unobservable", "Nonlinear", "Uncontrollable, and must be fixed mechanically or with different actuator placement"],
a: 3, why: "Controllability is about what inputs can reach; no control law can influence an uncontrollable mode." },
{ q: "An observer estimates unmeasured states by:",
o: ["Running a plant model on the same inputs and correcting it with the prediction error against real measurements", "Averaging recent sensor samples", "Differentiating the output twice", "Increasing the sensor gain"],
a: 0, why: "The predict-and-correct copy of the plant is the core mechanism; the Kalman filter is this with statistically optimal correction gains." }
],
interview: {
q: "Your stage has an encoder on the motor but the accuracy requirement is at the tool, connected through a belt. How do you think about this in state-space terms?",
a: "This is an observability problem before it is a control problem. The states include motor position and tool position, coupled through belt stiffness; my C matrix only reads the motor side, so tool position is observable purely through the belt model. If the belt behaves like a decent spring, I would build an observer that estimates tool position from motor measurements and commanded torque, and close an outer loop on the estimate, accepting that accuracy is bounded by how well I know the stiffness. If the belt stretches or slips unpredictably, that state is practically unobservable, and the honest fix is a second sensor at the tool, with the observer fusing both. I would say plainly: no filter can recover information the sensing structure does not contain."
}
},

{
id: "ct-fusion",
track: "Control",
title: "Sensor fusion beyond the Kalman filter",
mins: 30,
body: `
<p>The Kalman filter is the famous answer to sensor fusion, but interviews reward
knowing the simpler tools, the practical extensions, and where honest engineering ends
and covariance fiddling begins.</p>
<h3>The complementary filter, and when it beats a Kalman filter</h3>
<p>For attitude, two sensors disagree in a beautifully complementary way. The gyro is
excellent over short times but drifts as its rate errors integrate. The accelerometer
gives an absolute gravity reference that never drifts but is corrupted by every
acceleration of the vehicle. The complementary filter simply crossfades them in
frequency: trust the gyro above a crossover frequency, the accelerometer below it. One
tuning constant, a handful of arithmetic operations, no matrices. On a quadruped or a
drone where the loop budget is microseconds, a well-tuned complementary filter often
matches an EKF in practice, because both end up doing the same crossfade; the EKF just
derives its blend from claimed statistics. Reach for the EKF when you genuinely need
what it adds: state-dependent trust, cross-coupled states, or online bias estimation.
Reach for the complementary filter when the geometry is fixed and the budget is tight,
and say so without embarrassment.</p>
<h3>Bias states: making drift a citizen</h3>
<p>Gyros and accelerometers have slowly wandering offsets. The clean move is to add the
bias to the state vector and let the filter estimate it: gravity updates then correct
not only the attitude but the gyro bias itself, so performance keeps improving while
the vehicle sits still. The same trick handles barometer offset, magnetometer hard
iron, and encoder index offset. If a quantity drifts slowly and corrupts your
measurements, promote it to a state rather than pre-calibrating and praying.</p>
<h3>Outlier gating</h3>
<p>Real sensors produce garbage occasionally: a sonar multipath, a slipping optical
flow patch, a magnetometer near a motor. The standard defence is innovation gating:
before applying an update, compare the innovation with its own predicted covariance,
and reject measurements more than roughly three sigma out. The subtlety is that a
filter grown overconfident (covariance too small) will gate out genuine corrections
and sail off on its own model, so gating must be paired with honest covariance. Log
every rejection; a rising reject rate is your earliest sensor-failure alarm.</p>
<h3>Delayed measurements</h3>
<p>A camera pose arrives 80 ms after the moment it describes, while the IMU has moved
the state on. Applying it as if current smears the correction. Respectable options:
timestamp everything and keep a short state history, apply the update at the timestamp
it belongs to and replay the buffered predictions forward; or, cheaper, correct only
the slow states with the delayed sensor and let fast states ride on the IMU. Ignoring
delay is acceptable exactly when the sensor latency is small compared with how fast
the state changes, and you should know which side of that line you are on.</p>
<h3>Tuning honestly versus fudging Q and R</h3>
<p>R should come from evidence: park the robot, record each sensor, measure the
variance. Q admits what your motion model omits, so derive it from real disturbances:
slip, vibration, gusts. Then check the filter's own claims: innovations should look
like white noise sized by their predicted covariance. If you find yourself inflating R
to hide a resonance, or pumping Q until the filter limps along, the filter is
compensating for a modelling error you have chosen not to fix. That is sometimes a
legitimate engineering trade, but say it out loud and write it down, because a filter
tuned to lie will lie loudest the day the model error grows.</p>`,
quiz: [
{ q: "A complementary filter for attitude works by:",
o: ["Estimating covariances online", "Trusting the gyro at high frequency and the accelerometer at low frequency via a crossfade", "Averaging both sensors equally", "Rejecting whichever sensor disagrees"],
a: 1, why: "The two sensors fail at opposite ends of the spectrum, so a frequency split captures the best of each with one tuning constant." },
{ q: "The recommended way to handle a slowly wandering gyro offset is to:",
o: ["Calibrate once at the factory and trust it", "Add a high-pass filter to the gyro", "Ignore it, since it averages out", "Add the bias to the state vector and let the filter estimate it continuously"],
a: 3, why: "Promoting bias to a state lets absolute references correct it online, which one-off calibration and filtering cannot." },
{ q: "Innovation gating rejects a measurement when:",
o: ["The innovation is large compared with its own predicted covariance", "The sensor is slower than the IMU", "The measurement is negative", "The filter has just started"],
a: 0, why: "An innovation far outside its expected spread is statistically implausible; roughly three sigma is the common threshold." },
{ q: "Your filter runs smoothly but its innovations are consistently biased in one direction. This most likely means:",
o: ["The filter has converged well", "Q is slightly too large", "A model or calibration error exists that tuning Q and R is papering over", "The sensors are too accurate"],
a: 2, why: "Healthy innovations look like zero-mean white noise; persistent bias is the filter confessing a wrong model, whatever the tuning hides." }
],
interview: {
q: "For a walking robot's attitude estimate, would you use a complementary filter or an EKF? Defend your choice.",
a: "I would start with a complementary filter and promote to an EKF only when a concrete need appears. On a legged robot the dominant problem is that foot impacts corrupt the accelerometer exactly when dynamics are interesting, and both filters must handle that; the complementary filter does it with one crossover constant, runs in microseconds, and is trivially debuggable on hardware. I would move to an EKF for specific payoffs: online gyro bias estimation so the estimate improves at rest, principled fusion of extra sensors like leg odometry, and innovation gating to reject impact transients statistically rather than by heuristics. In my own mobile robot work the EKF earned its place when a third, occasional absolute reference joined; until then, the simple filter matched it and cost far less to trust."
}
},

{
id: "ct-motion",
track: "Control",
title: "Motion control and trajectory generation",
mins: 30,
body: `
<p>A motion controller should rarely be handed a step. Ask a stage to jump 10 mm and
the loop slews at its limits, overshoots, and rings the mechanics. The professional
pattern is to generate a trajectory the machine can actually follow, then split the
work between feedforward, which does the physics, and feedback, which corrects what
physics got wrong.</p>
<h3>Trapezoidal versus S-curve profiles</h3>
<p>A trapezoidal velocity profile accelerates at a constant rate, cruises, then
decelerates: simple, time-optimal for given acceleration limits, and the default in
every stepper library. Its flaw is that acceleration changes instantly at the
corners, which means a step in force. Force steps excite structural resonances: the
gantry drums, the liquid sloshes, the print shows ripples after every corner. An
S-curve profile limits jerk, the rate of change of acceleration, rounding those
corners so force ramps rather than steps. The cost is a slightly longer move; the
payoff is dramatically less vibration and settling time. Pick trapezoidal for stiff,
forgiving axes; pick S-curve when the mechanics ring or the payload is delicate.</p>
<h3>Feedforward versus feedback</h3>
<p>Once a trajectory exists, most of the required actuator effort is knowable in
advance: velocity times friction, acceleration times mass, gravity on a vertical
axis. Feedforward computes and applies that effort directly, without waiting for an
error to develop. Feedback then handles only the residue: model error, disturbances,
the unknowable. The division of labour matters because feedback can only act after an
error exists, so a loop doing work feedforward should be doing is a loop that must
carry a standing error. Well-fed-forward axes track with tiny gains; poorly modelled
axes demand hot gains and pay in noise and margin.</p>
<h3>Following error, the diagnostic gold mine</h3>
<p>Following error is the gap between commanded and actual position during the move,
and its shape names the culprit. Error proportional to velocity: missing velocity
feedforward or viscous friction. Error proportional to acceleration: missing
acceleration feedforward, wrong mass estimate. A spike at each reversal: backlash or
stiction. A constant offset on a vertical axis: gravity, uncompensated. Reading a
following-error trace is the motion equivalent of reading an oscilloscope, and saying
so in an interview lands well.</p>
<h3>Backlash and stiction symptoms</h3>
<p>Backlash, the dead zone in gears or couplings, shows as position loss on every
reversal and, with an integrator in the loop, a slow limit cycle as the controller
hunts across the gap. Stiction, static friction exceeding moving friction, produces
stick-slip: the axis holds, torque winds up, the axis breaks free and overshoots, then
sticks again. Both are nonlinear, so no linear gain fixes them; remedies are
mechanical (preload, better couplings), or compensations like backlash tables and dither.</p>
<h3>Encoder resolution and steppers versus servos</h3>
<p>Derived velocity is quantised too: at low speed, few counts per control period make
the velocity estimate steppy, and the derivative gain amplifies the steps into
audible grinding. Fixes: higher-resolution encoders, or estimating velocity through
an observer instead of differencing. Steppers run open loop, position by counting
commanded steps, and are superb until the torque demand exceeds capability, at which
point they lose steps silently and the position is a fiction. Servos close the loop,
know their true position, and deliver torque on demand at higher cost and tuning
effort. The honest selection question is what happens when the load exceeds the
plan: a stepper misses silently, a servo either follows or raises a following-error
fault you can act on.</p>`,
quiz: [
{ q: "The practical reason to prefer an S-curve profile over a trapezoidal one is:",
o: ["It reaches the target sooner", "It needs less peak torque in all cases", "It uses less memory", "Limiting jerk avoids force steps that excite structural resonance"],
a: 3, why: "Trapezoidal corners step the acceleration, and hence the force; jerk limiting rounds them, reducing vibration and settling time at a small cost in move time." },
{ q: "Feedforward improves tracking because:",
o: ["It raises the loop gain", "It applies the predictable effort immediately, so feedback only corrects the residue", "It filters the setpoint", "It removes the need for an encoder"],
a: 1, why: "Feedback must wait for an error to exist; feedforward supplies known friction, inertia and gravity effort with no error required." },
{ q: "During constant-velocity cruise, an axis shows following error proportional to speed. The most likely gap is:",
o: ["Velocity feedforward missing or viscous friction uncompensated", "Encoder failure", "Integrator windup", "Excess derivative gain"],
a: 0, why: "Velocity-proportional error is the signature of unmodelled velocity-dependent effort; the feedback loop carries it as a standing error." },
{ q: "A stepper axis under intermittent overload differs from a servo in that it:",
o: ["Raises a fault immediately", "Slows down gracefully", "Loses steps silently, so its believed position becomes wrong", "Draws more current to compensate"],
a: 2, why: "Open-loop steppers count commanded steps as truth; a missed step is invisible without an external sensor, while a servo sees the following error." }
],
interview: {
q: "A pick-and-place gantry settles too slowly after each rapid move, and the vision system waits on it. How do you attack the problem?",
a: "First I would look at the deceleration corner: if the profile is trapezoidal, the force step at the end of decel is ringing the gantry, and moving to a jerk-limited S-curve often cuts settling time enough to pay for the slightly longer move. Second, feedforward: if the loop is doing the deceleration work itself, there is a following-error bulge that must decay after arrival, so acceleration feedforward with a decent mass estimate shrinks what settling has to absorb. Third, I would check whether the last few counts of settle are a stiction and integrator dance, visible as slow creep or hunting. Instrument it with the following-error trace and an accelerometer on the head; the trace usually names which of the three it is within an afternoon."
}
},

{
id: "ct-robust",
track: "Control",
title: "Saturation, windup and staying out of trouble",
mins: 30,
body: `
<p>Linear control theory quietly assumes the actuator will do whatever the controller
asks. Real amplifiers clip, valves hit their stops, motors have current limits, and
the day your loop meets its limits is the day it misbehaves in ways no Bode plot
predicted. Robust practice is mostly a catalogue of guards for that day.</p>
<h3>What saturation actually does</h3>
<p>While the actuator is pinned at its limit, the loop is effectively open: the
controller keeps computing, but its output changes nothing. Two things then go wrong.
The plant follows its own physics rather than your design. And any integrator in the
controller keeps accumulating error it cannot act on, storing up trouble for the
moment the loop comes back: the wound-up integral drives the output hard past the
setpoint, and the overshoot can be spectacular. That second failure is integrator
windup, and every production controller must handle it.</p>
<h3>Anti-windup schemes, compared honestly</h3>
<ul>
<li><b>Clamping</b>: cap the integral state at fixed bounds. Trivial, and better than
nothing, but the right bound varies with operating point, so it is either too loose
to help or too tight and creates standing error.</li>
<li><b>Conditional integration</b>: stop integrating when the output is saturated and
the error would wind it further. Cheap, effective, and the common choice in embedded
PID. Its weakness is the abrupt on-off character, which can chatter near the limit.</li>
<li><b>Back-calculation</b>: feed the difference between commanded and actual (limited)
output back to discharge the integrator continuously, with a tracking gain setting
how fast. Smoothest behaviour, one extra tuning constant, and the scheme that scales
to cascaded and multivariable controllers because the integrator always tracks
reality.</li>
</ul>
<p>Whichever you choose, test it with the actuator deliberately undersized in
simulation; windup bugs hide until the first big setpoint step on a cold machine.</p>
<h3>Rate limits and bumpless transfer</h3>
<p>Slew-rate limits on commands protect mechanics and keep demands inside what
amplifiers can deliver, but a rate limiter inside a loop adds phase lag at exactly
the large-signal moments when margins are thinnest, so prefer shaping the setpoint
to limiting inside the loop. Bumpless transfer covers every switchover: manual to
automatic, one controller to another, gain set to gain set. The rule is that the
incoming controller must have its states initialised so its output matches the
outgoing output at the instant of transfer; with back-calculation anti-windup this
falls out naturally, because the idle controller can track the active output the
whole time.</p>
<h3>Gain scheduling, at concept level</h3>
<p>When plant behaviour changes with operating point, a robot arm's inertia with
pose, thruster effectiveness with speed, one gain set cannot be right everywhere.
Gain scheduling tunes at several representative points and interpolates between them
on a measured scheduling variable. It is respectable and everywhere, from flight
control to motor drives. The traps: switch gains smoothly or you inject transients
(bumpless transfer again), and remember that stability at every frozen point does not
strictly guarantee stability while the schedule is moving, so test the transitions,
not just the corners.</p>
<h3>Safe-state design</h3>
<p>Finally, decide what the system does when control is lost, before it is lost.
Sensible defaults differ: a spindle coasts, a vertical axis engages a brake, a heater
turns off, a vehicle steers straight and decelerates. The safe state must be
reachable without the controller, through watchdogs, hardware limits and interlocks,
because the failure you are guarding against may be the controller itself. Saying
that sentence in an interview signals you have shipped hardware.</p>`,
quiz: [
{ q: "While an actuator is saturated, the feedback loop is best described as:",
o: ["Faster than normal", "Effectively open, with the plant following its own dynamics", "Unstable by definition", "Operating with doubled gain"],
a: 1, why: "The controller's output changes nothing while pinned, so no correction reaches the plant; integrators meanwhile accumulate unusable error." },
{ q: "The main advantage of back-calculation over simple integral clamping is:",
o: ["It continuously discharges the integrator to track the real limited output, behaving smoothly at any operating point", "It requires no tuning at all", "It removes the need for an integrator", "It works only for temperature loops"],
a: 0, why: "Fixed clamps suit one operating point; back-calculation keeps the integrator consistent with what the actuator actually delivered." },
{ q: "Bumpless transfer requires that, at the moment of switchover:",
o: ["Both controllers share one integrator forever", "The setpoint is zero", "The plant is at steady state", "The incoming controller's states are initialised so its output matches the outgoing output"],
a: 3, why: "Matching outputs at the switch instant prevents a step being injected into the actuator; the idle controller tracking the active one achieves this." },
{ q: "Gain scheduling carries the subtle risk that:",
o: ["Gains cannot be stored in fixed point", "It only works for electrical systems", "Stability at each frozen operating point does not guarantee stability while the scheduling variable moves quickly", "It doubles the sample rate requirement"],
a: 2, why: "The frozen-point analysis ignores transition dynamics, so transitions must be rate-limited, smoothed and tested explicitly." }
],
interview: {
q: "Describe how you would make a motor position controller safe against actuator saturation, mode switches and controller failure.",
a: "Three layers. Inside the controller, anti-windup: I favour back-calculation, with the integrator discharged towards the actual limited command, tested in simulation with a deliberately undersized amplifier and a worst-case cold-start step. Around the controller, bumpless transfer: any idle mode, manual, tuning, or backup gain set, tracks the live output so engagement never steps the actuator, and setpoints are rate-shaped so the loop is not asked for the impossible. Outside the controller, a safe state that needs no software: a hardware current limit, end-of-travel switches wired to the drive enable, and a watchdog that drops the axis to brake or coast if the control task stops feeding it. I have implemented that pattern in FPGA motion control, where the enable chain and limits lived in fabric precisely so a processor fault could not override them."
}
}

);
