// Control: getting a controller onto real hardware.
//
// Everything between a validated design and a loop that runs for years: the
// delay nobody budgeted, fixed-point arithmetic, mode changes, mechanical
// resonance, sensors in the loop, and where the loop lives in the software.

LESSONS.push(

{
id: "ct-latency",
track: "Control",
sub: "Digital implementation",
title: "Latency and jitter: the delay you did not budget for",
mins: 22,
body: `
<p>The most common difference between a loop that works in simulation and one that does not on
hardware is delay. It is rarely a single number in one place, it is almost always larger than
people expect, and it costs phase margin directly.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Delay accumulating around a digital loop: sensor conversion, transport, computation, actuator update and the sampling itself">
<rect class="bx" x="24" y="24" width="632" height="34" rx="4"/>
<text class="ts" x="40" y="46">sensor: conversion time, internal filtering, its own sample rate</text>
<rect class="bx" x="24" y="66" width="632" height="34" rx="4"/>
<text class="ts" x="40" y="88">transport: bus latency, buffering, a scheduler that runs the task later</text>
<rect class="bx" x="24" y="108" width="632" height="34" rx="4"/>
<text class="ts" x="40" y="130">computation: from reading the input to writing the output</text>
<rect class="bx" x="24" y="150" width="632" height="34" rx="4"/>
<text class="ts" x="40" y="172">actuator: update rate, PWM period, driver dynamics</text>
<rect class="bxa" x="24" y="192" width="632" height="46" rx="4"/>
<text class="th" x="40" y="220">plus half a sample from the hold: the sampling itself costs phase</text>
</svg>

<p>Start with the part that is intrinsic. Sampling and holding introduces an average delay of half
a sample period, so even a perfect implementation loses phase at the sample rate. That is why a
common guideline is to sample at ten to twenty times the loop bandwidth, and why raising the sample
rate is sometimes a real fix rather than a cosmetic one.</p>

<p>Then everything else accumulates: the sensor's own conversion time and internal filtering, which
on a digital sensor can be many milliseconds and is easily missed; the transport, whether a bus, a
buffer or a scheduler that does not run the task immediately; the computation itself, from reading
the input to writing the output; and the actuator's update rate and its own dynamics.</p>

<p>The effect is a phase lag that grows <b>linearly with frequency</b>, so it is invisible at low
frequency and severe at crossover. As a rule of thumb, a delay costs a phase margin equal to the
delay times the crossover frequency in radians per second, which converts a delay in milliseconds
into degrees lost directly, and makes the trade explicit.</p>

<p><b>Jitter</b> is the variation in that delay and it is worse than a larger constant delay, because
a constant delay can be modelled and compensated while a varying one cannot. Its usual sources are
running the loop from a general-purpose scheduler, variable computation time from data-dependent
branches, and interrupt preemption. Deterministic timing is worth more than average speed.</p>

<p>The structural fix is to make the timing fixed rather than fast. Trigger sampling from a timer
rather than from software, run the loop at the highest priority with nothing able to preempt it,
and write the actuator output at a fixed point in the cycle rather than as soon as it is ready, so
that the total delay is one deterministic period rather than a variable fraction.</p>

<p>Measuring it matters more than estimating it. Toggling a pin at sample and at actuator write,
and looking at both on a scope alongside the physical response, gives the true figure including
everything nobody documented, and it is common for that number to be several times what the design
assumed.</p>
`,
quiz: [
{ q: "What delay does sampling itself introduce?",
o: ["One full sample period", "On average half a sample period from the hold", "None, if synchronised", "Twice the computation time"],
a: 1, why: "It is why sampling at ten to twenty times the loop bandwidth is a common guideline, and why raising the rate can be a real fix." },
{ q: "How does delay affect phase?",
o: ["A constant loss at all frequencies", "A lag growing linearly with frequency, so it is worst at crossover", "It only affects gain", "It adds a fixed 90 degrees"],
a: 1, why: "The phase margin lost is roughly the delay times the crossover frequency, which converts milliseconds into degrees directly." },
{ q: "Why is jitter worse than a larger constant delay?",
o: ["It is larger on average", "A constant delay can be modelled and compensated; a varying one cannot", "It causes aliasing", "It affects only the estimator"],
a: 1, why: "Deterministic timing is therefore worth more than average speed, which is the opposite of the usual software instinct." },
{ q: "What is the structural fix for variable delay?",
o: ["Increasing the sample rate", "Timer-triggered sampling and writing the output at a fixed point in the cycle", "Averaging several samples", "Adding a predictor"],
a: 1, why: "That makes the total delay one deterministic period rather than a variable fraction that no compensation can address." }
],
interview: {
q: "A loop that worked in simulation is marginally stable on hardware. Where do you look first?",
a: "Delay, because it is the usual difference and it is almost always larger than the design assumed. The reason it bites is that a pure delay costs phase that grows linearly with frequency, so it is invisible at low frequency where I might have checked and severe at crossover where it matters, and the phase margin lost is roughly the delay times the crossover frequency, which converts a few milliseconds into a lot of degrees on a fast loop. So I would go and account for the whole chain rather than assume a number. Sampling and holding costs half a sample period on average even in a perfect implementation. The sensor contributes its conversion time and any internal filtering, which on a digital sensor can be several milliseconds and is very easily missed because it is buried in a datasheet. Transport adds bus latency, buffering, and whatever delay the scheduler introduces before my task actually runs. Computation adds the time from reading the input to writing the output. And the actuator adds its update rate, the PWM period, and its own dynamics. Rather than estimate, I would measure it: toggle a pin at the sample instant and again at the actuator write, and look at those alongside the physical response on a scope. That gives me the real figure including everything undocumented, and it is common for it to be several times the assumed value. Then I would look at jitter separately, because variation in the delay is worse than a larger constant delay, since a constant delay can be modelled and even compensated whereas a varying one cannot. Jitter usually comes from running the loop under a general-purpose scheduler, from data-dependent computation time, or from interrupt preemption. The structural fix is to make timing fixed rather than fast: trigger sampling from a timer rather than software, run the loop at the highest priority with nothing able to preempt it, and write the output at a fixed point in the cycle rather than as soon as it is ready."
}
},

{
id: "ct-fixedpt",
track: "Control",
sub: "Digital implementation",
title: "Implementing a controller in fixed point",
mins: 22,
body: `
<p>A controller that behaves perfectly in floating-point simulation can behave differently once
implemented in fixed point, and the differences are systematic rather than random. Understanding
where they come from turns a debugging problem into a design step.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Three fixed-point effects in a controller: coefficient quantisation moving the poles, integrator resolution creating a dead zone, and overflow in the accumulator">
<rect class="bx" x="24" y="26" width="632" height="58" rx="4"/>
<text class="th" x="40" y="52">coefficient quantisation</text>
<text class="ts" x="40" y="72">the implemented controller is not the designed one</text>
<rect class="bx" x="24" y="96" width="632" height="58" rx="4"/>
<text class="th" x="40" y="122">integrator resolution</text>
<text class="ts" x="40" y="142">a small error rounds to zero, and the loop stops correcting</text>
<rect class="bxa" x="24" y="166" width="632" height="64" rx="4"/>
<text class="th" x="40" y="192">accumulator range</text>
<text class="ts" x="40" y="214">a wrapped integrator drives the actuator to the opposite extreme</text>
</svg>

<p><b>Coefficient quantisation</b> means the controller you implemented is not the one you designed.
For a low-order controller with well-separated poles this is usually harmless, but a slow integrator
in a fast loop has a coefficient very close to one, and quantising it can change the time constant
substantially or stop the integration altogether. The check is to compute the implemented
controller's response from the quantised coefficients and compare it against the design.</p>

<p>The <b>integrator</b> is where fixed point most often bites, because its whole purpose is to
accumulate small errors over time. If the increment per sample is smaller than one least significant
bit, it rounds to zero and the integrator stops, leaving a permanent steady-state error that the
loop cannot remove. The fix is to keep the integrator state at much higher resolution than the
output, accumulating in a wide word and scaling only when producing the control signal.</p>

<p><b>Range</b> is the other half of the same decision. Every intermediate value needs enough
headroom for the worst case, which includes a step input, a saturated actuator and the maximum
disturbance. Overflow in an integrator is far worse than in a feedforward path, because a wrapped
value sends the actuator to the opposite extreme, so saturating arithmetic is not optional.</p>

<p>Anti-windup interacts with this directly and should be implemented in a form that <b>bounds the
state</b>, such as clamping the integrator when the output is saturated, rather than one that relies
on the arithmetic behaving well. That way the range analysis and the windup protection are the same
mechanism.</p>

<p><b>Rounding</b> matters more than it appears. Truncation is a small negative bias applied every
sample, and in an integrator a systematic bias accumulates into a real offset, so rounding to
nearest rather than truncating is worth its cost. In a filter with feedback, rounding also produces
limit cycles, which show as a small oscillation that never settles.</p>

<p>The practical approach is to keep the floating-point version as a reference, run both against the
same recorded data, and require the fixed-point output to agree within a stated tolerance. That
catches scaling errors immediately rather than after they have been mistaken for plant
behaviour.</p>
`,
quiz: [
{ q: "Why is a slow integrator in a fast loop sensitive to coefficient quantisation?",
o: ["It has the largest gain", "Its coefficient is very close to one, so quantising it changes the time constant substantially", "It runs at a different rate", "Its output is largest"],
a: 1, why: "The check is to compute the implemented controller's response from the quantised coefficients and compare it against the design." },
{ q: "What happens when the integrator increment is below one least significant bit?",
o: ["It saturates", "It rounds to zero, so the integrator stops and steady-state error remains", "It oscillates", "It overflows"],
a: 1, why: "The fix is to keep the integrator state at much higher resolution than the output and scale only when producing the control signal." },
{ q: "Why is overflow in an integrator especially dangerous?",
o: ["It cannot be detected", "A wrapped value sends the actuator to the opposite extreme", "It corrupts the coefficients", "It resets the loop"],
a: 1, why: "Saturating arithmetic is therefore not optional, and anti-windup should bound the state rather than rely on the arithmetic." },
{ q: "Why prefer rounding to nearest over truncation?",
o: ["It is faster on most hardware", "Truncation is a systematic bias that accumulates in an integrator into a real offset", "It avoids overflow", "It reduces coefficient error"],
a: 1, why: "Rounding in a feedback filter also produces limit cycles, seen as a small oscillation that never quite settles." }
],
interview: {
q: "What changes when you implement a control loop in fixed point?",
a: "Three things systematically, and none of them is random noise. First, coefficient quantisation, which means the controller I implemented is not the one I designed. For a low-order controller with well-separated poles that is usually harmless, but a slow integrator in a fast loop has a coefficient extremely close to one, and quantising it can change the time constant a long way or stop the integration entirely. So I would compute the implemented controller's frequency response from the quantised coefficients and compare it against the design rather than assume it carried across. Second, the integrator, which is where fixed point most often bites, because its entire purpose is to accumulate small errors over time. If the increment per sample is smaller than one least significant bit it rounds to zero, the integrator stops, and I am left with a permanent steady-state error the loop cannot remove and which looks exactly like a plant problem. The fix is to hold the integrator state in a much wider word than the output, accumulate at high resolution, and scale down only when producing the control signal. Third, range. Every intermediate needs headroom for the genuine worst case, which means a full step input with the actuator saturated and the maximum disturbance present, not the typical operating condition. Overflow in an integrator is much worse than in a feedforward path because a wrapped value drives the actuator to the opposite extreme, so saturating arithmetic is not optional, and I would implement anti-windup by clamping the integrator state when the output saturates, so that the range analysis and the windup protection are the same mechanism. I would also round to nearest rather than truncate, because truncation is a small consistent bias every sample and in an integrator that accumulates into a real offset. And I would keep the floating-point version as a reference and run both against the same recorded data with a stated tolerance, so a scaling error is caught immediately rather than mistaken for plant behaviour."
}
},

{
id: "ct-modes",
track: "Control",
sub: "Digital implementation",
title: "Modes, bumpless transfer and initialisation",
mins: 22,
body: `
<p>A control system in a product is never one loop running forever. It starts up, changes between
manual and automatic, switches controllers, hands over between sensors and shuts down, and most
field problems occur at those transitions rather than during steady operation.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Transitions between off, manual, automatic and fault states, with the transitions marked as where problems occur">
<rect class="bx" x="24" y="26" width="150" height="56" rx="4"/>
<text class="th" x="40" y="58">off</text>
<rect class="bx" x="190" y="26" width="150" height="56" rx="4"/>
<text class="th" x="206" y="58">manual</text>
<rect class="bx" x="356" y="26" width="150" height="56" rx="4"/>
<text class="th" x="372" y="58">automatic</text>
<rect class="bx" x="522" y="26" width="134" height="56" rx="4"/>
<text class="th" x="538" y="58">fault</text>

<rect class="bxa" x="24" y="100" width="632" height="60" rx="4"/>
<text class="th" x="40" y="126">the transitions are where the problems live</text>
<text class="ts" x="40" y="150">a controller whose state does not match reality steps the output</text>

<rect class="bx" x="24" y="174" width="632" height="56" rx="4"/>
<text class="th" x="40" y="200">bumpless transfer: initialise the state so the output is continuous</text>
<text class="ts" x="40" y="220">for a PID, back-calculate the integrator from the current output</text>
</svg>

<p>The core problem is that a controller has <b>state</b>, and if that state does not match the
current physical situation when it takes over, the output jumps. A PID switched into automatic with
a zero integrator will immediately drive the actuator away from wherever the operator had left it,
which on a real process is a visible and sometimes damaging step.</p>

<p><b>Bumpless transfer</b> is the standard answer: before a controller takes over, initialise its
state so that its output equals what is currently being applied. For a PID this means
back-calculating the integrator from the present output and error, so that at the instant of
handover nothing changes and the loop begins to act from there.</p>

<p>The same applies to any controller that is running but not in command. In a scheme with a
standby or backup controller, the inactive one should be <b>tracking</b>: run continuously with its
state driven to match the active output, so that it is always ready to take over without a step.</p>

<p><b>Start-up</b> deserves explicit design rather than being a special case of running. Filters
initialised to zero produce a transient that looks like a disturbance, derivative terms see an
enormous rate on the first sample, and integrators start accumulating before the plant is ready.
Initialising filter states from the first measurement, holding the integrator until the loop is
enabled, and ramping the setpoint from the current value rather than jumping to the target remove
all three.</p>

<p>Switching between <b>controllers</b>, as in gain scheduling or a mode change, has an additional
hazard: switching between two individually stable controllers can produce an unstable system if the
switching is fast enough. Interpolating rather than switching, or enforcing a minimum dwell time in
each mode, avoids it.</p>

<p>The design habit is to treat mode logic as a state machine that is specified and tested in its
own right, with every transition enumerated, an explicit entry action for each mode, and tests that
exercise the transitions rather than only the steady states. That is where the failures are, and
steady-state testing does not touch them.</p>
`,
quiz: [
{ q: "Why does switching a PID into automatic cause a step?",
o: ["The gains are wrong at first", "Its integrator state does not match what is currently applied", "The derivative term saturates", "The setpoint changes"],
a: 1, why: "Bumpless transfer initialises the state so the controller's output equals the current output at the instant of handover." },
{ q: "What should an inactive standby controller do?",
o: ["Remain reset until needed", "Track, running with its state driven to match the active output", "Run at a lower rate", "Hold its last computed value"],
a: 1, why: "Then it is always ready to take over without a step, rather than needing initialisation at the worst possible moment." },
{ q: "What causes a start-up transient in a well-designed loop?",
o: ["Actuator backlash", "Filter states initialised to zero and derivative terms seeing a huge first-sample rate", "Sensor noise", "Coefficient quantisation"],
a: 1, why: "Initialising filters from the first measurement, holding the integrator until enabled, and ramping the setpoint remove it." },
{ q: "What hazard does switching between controllers add?",
o: ["Increased computation", "Switching between two individually stable controllers can be unstable if fast enough", "Loss of observability", "Coefficient overflow"],
a: 1, why: "Interpolating rather than switching, or enforcing a minimum dwell time in each mode, avoids it." }
],
interview: {
q: "How do you handle switching a loop from manual to automatic?",
a: "With bumpless transfer, because the underlying problem is that the controller has state and if that state does not match the physical situation when it takes over, the output jumps. A PID switched into automatic with a zero integrator will immediately drive the actuator away from wherever the operator left it, and on a real process that is a visible step and sometimes a damaging one. So before handover I initialise the controller's state so that its output equals what is currently being applied. For a PID that means back-calculating the integrator from the present output and the present error, so at the instant of the switch nothing changes and the loop starts acting from there. The generalisation is that any controller that might take over should be tracking rather than sitting idle: run it continuously with its state driven to match the active output, so it is always ready and there is no initialisation to get right at the worst possible moment. I would treat start-up the same way rather than as a special case, because the same mechanism causes the classic power-on transient: filters initialised to zero settle over their time constant and that looks like a disturbance, a derivative term sees an enormous rate on the first sample, and an integrator starts accumulating before the plant is ready. Initialising filter states from the first measurement, holding the integrator until the loop is properly enabled, and ramping the setpoint from wherever the process actually is rather than jumping to the target removes all three. If the system switches between controllers rather than just in and out of automatic, there is one more hazard worth knowing, which is that switching between two individually stable controllers can produce an unstable system if the switching is fast enough, so I would interpolate rather than switch, or enforce a minimum dwell time. And I would specify the mode logic as a state machine in its own right and test the transitions, because that is where the failures are and steady-state testing never touches them."
}
},

{
id: "ct-mech",
track: "Control",
sub: "Digital implementation",
title: "Mechanical reality: resonance, backlash and colocation",
mins: 22,
body: `
<p>A motion control loop is limited far more often by the mechanism than by the controller. The
mechanical properties that matter are few and they have direct consequences for what bandwidth is
achievable, which is why a control engineer should be involved before the mechanics are
finished.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A motor and load joined by a compliant coupling, with the sensor either on the motor or on the load, giving different loop behaviour">
<rect class="bx" x="24" y="26" width="180" height="66" rx="4"/>
<text class="th" x="40" y="52">motor</text>
<text class="ts" x="40" y="76">and its inertia</text>
<rect class="bxa" x="220" y="26" width="220" height="66" rx="4"/>
<text class="th" x="236" y="52">compliance</text>
<text class="ts" x="236" y="76">belt, shaft, gearbox, structure</text>
<rect class="bx" x="456" y="26" width="200" height="66" rx="4"/>
<text class="th" x="472" y="52">load</text>
<text class="ts" x="472" y="76">and its inertia</text>

<rect class="bx" x="24" y="108" width="308" height="60" rx="4"/>
<text class="th" x="40" y="134">sensor on the motor</text>
<text class="ts" x="40" y="156">colocated: benign, stable, wrong quantity</text>
<rect class="bx" x="348" y="108" width="308" height="60" rx="4"/>
<text class="th" x="364" y="134">sensor on the load</text>
<text class="ts" x="364" y="156">what you want, and harder to stabilise</text>

<rect class="bx" x="24" y="182" width="632" height="48" rx="4"/>
<text class="th" x="40" y="210">the resonance usually caps the achievable bandwidth</text>
</svg>

<p>The dominant feature is the <b>resonance</b> formed by the motor inertia, the load inertia and
the compliance between them, from a belt, a shaft, a gearbox or the structure itself. It appears as
a peak and an anti-peak in the frequency response, and it typically sets the bandwidth ceiling,
because pushing crossover near it excites it.</p>

<p><b>Colocation</b> decides how bad that is. With the sensor on the motor, on the same side of the
compliance as the actuator, the resonance and anti-resonance alternate in a way that keeps phase
bounded, and the loop is comparatively easy to stabilise. With the sensor on the load, the ordering
changes and the phase can drop through instability, so a non-colocated loop is genuinely harder and
is where right-half-plane zeros come from.</p>

<p>The awkward part is that the load position is usually what you actually care about, so the
convenient measurement is the wrong one. Common resolutions are a dual-loop structure, a fast inner
loop on the motor and a slower outer loop on the load, or accepting the motor measurement and
correcting the known mechanical error.</p>

<p>Notch filters are the standard treatment for a resonance, and they carry a warning: a notch that
does not match the resonance frequency does little, and the frequency moves with load, temperature
and wear. A notch tuned on one unit and shipped across a production run is a common source of field
failures, so the safer approach is to reduce bandwidth or to increase mechanical stiffness.</p>

<p><b>Backlash</b> and <b>friction</b> are the other two. Backlash is a dead zone where the motor
moves and the load does not, and it produces limit cycles under integral action because the loop
integrates during the gap and then overshoots when contact is made. Stiction gives the same
symptom by a different mechanism. Neither is solved by tuning: preload, better bearings, or a
direct-drive arrangement is the real answer.</p>

<p>The message worth carrying into a design review is that a stiffer, lighter, better-supported
mechanism with the sensor near the actuator is worth more than any amount of control cleverness, and
that this is far cheaper to arrange before the mechanics are built.</p>
`,
quiz: [
{ q: "What forms the dominant resonance in a motion system?",
o: ["The controller's poles", "Motor inertia, load inertia and the compliance between them", "The sensor's filtering", "The amplifier bandwidth"],
a: 1, why: "It typically sets the bandwidth ceiling, because pushing crossover near it excites it." },
{ q: "Why is a colocated sensor easier to stabilise?",
o: ["It has less noise", "Resonance and anti-resonance alternate, keeping the phase bounded", "It responds faster", "It avoids quantisation"],
a: 1, why: "With the sensor on the load, the ordering changes and the phase can drop through instability, which is where right-half-plane zeros come from." },
{ q: "What is the risk with a notch filter on a resonance?",
o: ["It adds too much delay", "The resonance frequency moves with load, temperature and wear, so a fixed notch stops matching", "It cannot be implemented digitally", "It reduces steady-state accuracy"],
a: 1, why: "A notch tuned on one unit and shipped across a production run is a common source of field failures." },
{ q: "Why does backlash produce a limit cycle under integral action?",
o: ["It adds phase lag", "The loop integrates during the dead zone and then overshoots when contact is made", "It saturates the actuator", "It aliases the measurement"],
a: 1, why: "Stiction gives the same symptom by a different mechanism, and neither is solved by tuning rather than by mechanical change." }
],
interview: {
q: "A motion loop will not go faster without oscillating. What would you investigate?",
a: "I would look at the mechanism before the controller, because a motion loop is usually limited by the mechanics. The first thing is the resonance formed by the motor inertia, the load inertia and whatever compliance sits between them, a belt, a shaft, a gearbox or the structure itself. That shows up as a peak and an anti-peak in the frequency response and it typically caps the achievable bandwidth, because as crossover approaches it the loop starts exciting it. So I would measure the plant frequency response rather than guess, injecting a swept or noise excitation and looking at where the resonance sits and how sharp it is. The second thing is where the sensor is relative to the actuator. If it is colocated, on the motor and therefore the same side of the compliance, the resonance and anti-resonance alternate in a way that keeps the phase bounded and the loop is comparatively forgiving. If it is on the load, the ordering changes, the phase can drop through instability, and that is where right-half-plane zeros come from, which impose a hard bandwidth cap no controller removes. The awkward part is that the load position is usually the quantity I actually care about, so the easy measurement is the wrong one, and the usual resolutions are a dual-loop structure with a fast inner loop on the motor and a slower outer loop on the load, or accepting the motor measurement and correcting the known mechanical error. A notch filter is the standard treatment for the resonance and I would use it cautiously, because the frequency moves with load, temperature and wear, so a notch tuned on one prototype and shipped across a production run fails in the field. If the oscillation persists at low amplitude and does not scale with the input, I would suspect backlash or stiction instead, since integral action across a dead zone produces exactly that, and the fix there is mechanical, preload or better bearings, rather than tuning."
}
},

{
id: "ct-sensorloop",
track: "Control",
sub: "Digital implementation",
title: "Sensors in the loop: quantisation, noise and differentiation",
mins: 22,
body: `
<p>A sensor inside a feedback loop is not the same as a sensor used for measurement. Its noise is
amplified by the controller and injected into the actuator, its quantisation sets a floor on what
the loop can resolve, and any filtering it applies costs phase margin.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Sensor noise passing through the controller to the actuator, and filtering it costing phase margin, forming the central trade">
<rect class="bx" x="24" y="26" width="632" height="52" rx="4"/>
<text class="th" x="40" y="52">sensor noise enters where the measurement does</text>
<text class="ts" x="40" y="70">and reaches the actuator multiplied by the controller gain</text>

<rect class="bxa" x="24" y="92" width="308" height="66" rx="4"/>
<text class="th" x="40" y="118">filter it harder</text>
<text class="ts" x="40" y="144">quieter actuator, less phase margin</text>
<rect class="bx" x="348" y="92" width="308" height="66" rx="4"/>
<text class="th" x="364" y="118">filter it less</text>
<text class="ts" x="364" y="144">more margin, noisier actuator</text>

<rect class="bx" x="24" y="172" width="632" height="58" rx="4"/>
<text class="th" x="40" y="198">so the noise budget and the loop design are the same problem</text>
<text class="ts" x="40" y="220">and a quieter sensor buys bandwidth, not just a cleaner number</text>
</svg>

<p>The first consequence is that <b>noise sets the achievable bandwidth</b>. Sensor noise reaches
the actuator multiplied by the controller gain, so raising bandwidth raises actuator activity, which
shows as heating, audible noise, wear and wasted power long before it shows as instability. In many
systems the practical bandwidth limit is the noise the actuator can tolerate rather than
stability.</p>

<p><b>Filtering</b> the measurement reduces that, and it costs phase margin, so the anti-noise
filter is part of the loop design rather than a separate concern. A filter added late to quieten an
actuator will reduce margin, and the loop must be retuned rather than left as it was.</p>

<p><b>Differentiation</b> is where this becomes acute. A derivative term amplifies noise in
proportion to frequency, so a pure derivative on a noisy signal is unusable and must always be
band-limited. The same applies to computing velocity by differencing position: the result is
dominated by quantisation noise unless filtered, and an observer that estimates velocity from a
model plus position typically does far better than differencing.</p>

<p><b>Quantisation</b> deserves its own thought because it behaves differently from noise. An
encoder with finite counts, or a converter with finite bits, means the loop cannot resolve anything
smaller than one step, and with integral action the result is a limit cycle: the loop hunts across
the boundary between two counts rather than settling. That is often mistaken for a tuning problem
and is not.</p>

<p><b>Sensor dynamics</b> are the third contribution and the most easily overlooked. A digital
sensor with an internal filter or a low internal sample rate adds delay that the loop pays for, and
sensors intended for measurement are often configured for low noise at the cost of exactly the
latency a loop cannot afford. The configuration that suits a datalogger is usually the wrong one for
a control loop.</p>

<p>Two failure modes are worth naming. <b>Aliasing</b> of a mechanical resonance or an electrical
interferer folds it to a low frequency where the loop responds to it, which is why an analogue
anti-alias filter before sampling is not optional. And a sensor <b>dropout</b> that returns the last
value silently is invisible to the loop but stops the feedback, so validity checking on every
measurement belongs in the loop rather than in a diagnostic layer.</p>
`,
quiz: [
{ q: "Why does sensor noise often set the bandwidth limit?",
o: ["It causes instability first", "It reaches the actuator multiplied by controller gain, causing heating, wear and audible noise", "It aliases into the control band", "It biases the integrator"],
a: 1, why: "The practical limit is frequently what the actuator can tolerate rather than the point at which the loop becomes unstable." },
{ q: "Why must a derivative term always be band-limited?",
o: ["It is otherwise non-causal", "It amplifies noise in proportion to frequency", "It adds phase lag", "It cannot be implemented in fixed point"],
a: 1, why: "The same applies to differencing position for velocity, where an observer using a model plus position usually does far better." },
{ q: "What does quantisation with integral action produce?",
o: ["A steady-state offset", "A limit cycle, as the loop hunts across the boundary between two counts", "Increased noise gain", "Loss of observability"],
a: 1, why: "It is frequently mistaken for a tuning problem, and no amount of retuning removes a resolution limit." },
{ q: "Why is an analogue anti-alias filter not optional?",
o: ["It reduces quantisation noise", "Aliasing folds a resonance or interferer to a low frequency where the loop responds to it", "It improves the sensor's resolution", "It removes DC offset"],
a: 1, why: "A silent sensor dropout returning the last value is the companion failure, which is why validity checks belong inside the loop." }
],
interview: {
q: "The actuator is noisy and hot but the loop is stable. What is going on and what do you do?",
a: "That is almost always sensor noise being amplified by the controller and injected straight into the actuator, and it is worth recognising that this is a real bandwidth limit even though nothing is unstable. Noise enters where the measurement does and reaches the actuator multiplied by the controller gain, so as I raise bandwidth I raise actuator activity, and in many systems what stops me is heating, audible noise, wear and wasted power rather than any stability margin. So the first thing I would do is look at where the noise is coming from and at what frequency, because the answer differs. If it is broadband sensor noise, filtering the measurement is the direct fix, and I would be explicit that this costs phase margin, so the anti-noise filter is part of the loop design and I have to retune rather than add it and leave the loop as it was. If the controller has a derivative term, that is the usual amplifier, because differentiation amplifies noise in proportion to frequency, so it must always be band-limited, and if I am computing velocity by differencing position then the result is dominated by quantisation noise and an observer estimating velocity from a model plus position will do far better. If the noise looks like hunting at a small fixed amplitude rather than broadband, I would suspect quantisation instead, because with integral action a loop that cannot resolve below one encoder count will sit hunting across the boundary between two counts, and no amount of retuning fixes a resolution limit. I would also check the sensor's configuration, because sensors are often set up for low noise at the cost of latency, which is exactly the wrong trade inside a loop, and check that there is a proper analogue anti-alias filter, since a folded resonance or interferer appears at a low frequency the loop will happily chase. The framing I would take to the team is that a quieter, higher-resolution sensor buys bandwidth, not just a cleaner number."
}
},

{
id: "ct-arch",
track: "Control",
sub: "Digital implementation",
title: "Where the loop lives: control software architecture",
mins: 22,
body: `
<p>A control algorithm becomes a product when it is embedded in software that guarantees its
timing, keeps it separate from everything else, and behaves sensibly when something fails. That
structure is a design decision, and getting it wrong produces problems that look like control
problems.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A fast deterministic control task separated from slower supervisory and communication tasks, with a defined interface between them">
<rect class="bxa" x="24" y="26" width="632" height="66" rx="4"/>
<text class="th" x="40" y="52">control task: highest priority, timer triggered, bounded execution</text>
<text class="ts" x="40" y="78">no allocation, no blocking, no unbounded loops, no logging to a file</text>

<rect class="bx" x="24" y="106" width="632" height="52" rx="4"/>
<text class="th" x="40" y="134">interface: parameters in, state out, both updated atomically</text>

<rect class="bx" x="24" y="172" width="632" height="58" rx="4"/>
<text class="th" x="40" y="198">supervisory, communications, logging: lower priority</text>
<text class="ts" x="40" y="220">may be slow, may be late, must never delay the loop</text>
</svg>

<p>The control task should be <b>triggered by a timer</b>, not by a scheduler tick or by the arrival
of data, run at the highest priority, and have a bounded worst-case execution time. Everything
inside it should be predictable: no dynamic allocation, no blocking calls, no loops whose length
depends on data, and no logging that could block on a device.</p>

<p>The interface between that task and everything else should be narrow and <b>atomic</b>.
Parameters go in, state comes out, and updates are structured so the loop never sees a half-changed
set of gains. Double buffering or a single atomic pointer swap is enough, and the alternative, a
supervisory task writing gains one at a time while the loop reads them, produces an intermittent
fault that is close to impossible to find later.</p>

<p>Everything slower goes in <b>lower-priority</b> tasks: communications, logging, supervisory
logic, user interface. Those may be late without consequence, and the design has to make that
genuinely true, so the loop must never wait on any of them, and a queue that fills must drop data
rather than block.</p>

<p>The loop needs a defined behaviour on <b>overrun</b>, which means detecting that it did not
finish before the next trigger and doing something deliberate. Skipping a cycle and continuing
usually beats trying to catch up, but the event must be counted and reported, since a loop
overrunning occasionally is a warning that becomes a failure under load.</p>

<p><b>Watchdogs</b> should be fed by the control loop itself rather than by a background task, so
that a stalled loop actually resets the system. A watchdog fed from a low-priority timer proves only
that the scheduler is running, which is exactly the failure it was meant to catch.</p>

<p>Two habits pay for themselves. Make the loop's <b>internal state observable</b>, streaming
setpoint, measurement, error, control output and mode at full rate, because commissioning and field
diagnosis are impossible without it. And keep the control law <b>free of hardware</b> calls behind a
thin interface, so the same code runs against a simulated plant on a workstation. That is what makes
the algorithm testable at all, and it costs nothing if it is done from the start.</p>
`,
quiz: [
{ q: "How should the control task be triggered?",
o: ["By the arrival of sensor data", "By a timer, at the highest priority, with bounded execution time", "By the scheduler tick", "By the communications task"],
a: 1, why: "Everything inside it must be predictable: no dynamic allocation, no blocking calls and no data-dependent loop lengths." },
{ q: "Why must parameter updates be atomic?",
o: ["To reduce latency", "So the loop never sees a half-changed set of gains", "To allow interpolation", "To satisfy the watchdog"],
a: 1, why: "A supervisory task writing gains one at a time while the loop reads them produces an intermittent fault that is nearly impossible to find later." },
{ q: "Why should the watchdog be fed by the control loop itself?",
o: ["It is faster", "A watchdog fed from a background task proves only that the scheduler runs", "It reduces interrupt load", "The loop has the highest priority"],
a: 1, why: "A stalled loop is exactly the failure the watchdog exists to catch, and feeding it elsewhere hides that failure." },
{ q: "What makes a control algorithm testable?",
o: ["Extensive logging", "Keeping it free of hardware calls behind a thin interface, so it runs against a simulated plant", "Running it at a lower rate in test", "Using floating point"],
a: 1, why: "It costs nothing if done from the start, and it is what allows the algorithm to be exercised without the hardware." }
],
interview: {
q: "How would you structure the software around a control loop in an embedded product?",
a: "I would put the loop in its own task, triggered by a hardware timer rather than by a scheduler tick or by data arriving, running at the highest priority with nothing able to preempt it, and with a bounded worst-case execution time. Inside that task everything has to be predictable, so no dynamic allocation, no blocking calls, no loops whose length depends on the data, and no logging that could block on a device. That is what makes the timing deterministic, and deterministic timing is worth more to a loop than average speed, because jitter cannot be modelled or compensated. Everything else goes in lower-priority tasks: communications, logging, supervisory logic, user interface. Those are allowed to be late, and the design has to make that genuinely true, so the loop must never wait on any of them and a full queue drops data rather than blocking. The interface between the loop and the rest needs to be narrow and atomic: parameters in, state out, with gain updates applied as a single swap rather than written one at a time, because a supervisory task updating gains individually while the loop reads them creates an intermittent fault that is essentially unfindable months later. I would define what happens on overrun rather than leave it undefined, which usually means detecting that the loop did not finish before the next trigger, skipping the cycle rather than trying to catch up, and counting and reporting the event, because occasional overruns are a warning that becomes a failure under load. The watchdog gets fed by the control loop itself, not by a background task, since a watchdog fed elsewhere only proves the scheduler is running, which is the exact failure it was supposed to catch. And two things I would insist on from the start because they cost nothing then and a lot later: stream the loop's internal state, setpoint, measurement, error, output and mode, at full rate, because commissioning and field diagnosis are impossible without it, and keep the control law free of direct hardware calls behind a thin interface so the same code can run against a simulated plant on a workstation."
}
}

);
