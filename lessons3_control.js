// Control lessons, second course: control in the real world.
//
// These carry a `sub` so the page groups them under a heading, in the same way
// the Embedded C track is organised.

LESSONS.push(

{
id: "ct-smith",
track: "Control",
sub: "Control in the real world",
title: "Dead time, and what a Smith predictor really buys",
mins: 20,
body: `
<p>Dead time is the interval between acting and seeing any response at all. A heater warming a
tank, a conveyor carrying material to a sensor, a network hop: the plant does nothing for L
seconds, and then behaves normally.</p>

<p>It is the most limiting thing a plant can have, because it contributes phase lag that grows
without bound with frequency while removing no gain at all. The loop's achievable bandwidth is
capped at roughly the reciprocal of the dead time, and no amount of tuning moves that.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A conventional loop where the delayed measurement is fed back, beside a Smith predictor which feeds back an undelayed model output and corrects with the model mismatch">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">conventional loop</text>
<rect class="bx" x="24" y="72" width="308" height="150" rx="4"/>
<text class="ts" x="40" y="98">controller sees the output</text>
<text class="ts" x="40" y="120">L seconds after it acted</text>
<text class="th" x="40" y="156">it keeps pushing during</text>
<text class="th" x="40" y="176">the dead time, then</text>
<text class="th" x="40" y="196">overshoots</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">Smith predictor</text>
<rect class="bx" x="348" y="72" width="308" height="150" rx="4"/>
<text class="ts" x="364" y="98">feed back the MODEL's</text>
<text class="ts" x="364" y="120">undelayed output</text>
<text class="ts" x="364" y="146">plus the mismatch between</text>
<text class="ts" x="364" y="166">real and delayed model</text>
<text class="th" x="364" y="200">tune as if there were no delay</text>
</svg>

<p>The reason a conventional loop does badly is intuitive: during the dead time the controller
sees no response, concludes it is not doing enough, and pushes harder. By the time the response
arrives the command is far too large, and the result is a long, slow oscillation.</p>

<p>A <b>Smith predictor</b> restructures the loop. It runs a model of the plant without the
delay and feeds that back immediately, so the controller can be tuned as though the delay were
not there. It also runs the model <i>with</i> the delay and feeds back the difference between
that and the real measurement, which is what corrects for model error and disturbances.</p>

<p>The catch is that it depends on the model, including the delay itself. Get the delay wrong
by a significant fraction and the structure can be worse than the simple loop it replaced, and
it becomes unstable more readily than the conventional design. It is also open loop with
respect to any disturbance during the dead time, because nothing can be known about it yet.</p>

<p>So the honest position is that a Smith predictor helps a great deal when the delay is
accurately known and dominant, and it should be treated with suspicion when the delay varies.
Where the delay varies, detuning a conventional loop is often the more robust engineering
answer.</p>
`,
quiz: [
{ q: "Why is dead time so limiting for a control loop?",
o: ["It reduces the plant's DC gain", "It adds phase lag growing with frequency while removing no gain", "It makes the plant nonlinear", "It introduces a right-half-plane zero"],
a: 1, why: "The lag is omega times L, so it grows without bound. Achievable bandwidth is capped at roughly the reciprocal of the delay, whatever you do to the controller." },
{ q: "What does a Smith predictor feed back to the controller?",
o: ["The delayed plant measurement, filtered", "The undelayed model output, plus the model mismatch", "The setpoint minus the disturbance estimate", "The controller's own output, delayed"],
a: 1, why: "The undelayed model lets you tune as though there were no delay, and the mismatch term corrects for model error and disturbances." },
{ q: "What is the main weakness of a Smith predictor?",
o: ["It cannot be implemented in discrete time", "It depends on the model, including the delay itself", "It requires a measurement of the disturbance", "It removes the loop's integral action"],
a: 1, why: "Get the delay wrong by a significant fraction and it can be worse than the loop it replaced, and it destabilises more readily than the conventional design." },
{ q: "Why does a conventional loop overshoot badly with a large dead time?",
o: ["The integrator saturates during the delay", "It sees no response, so it keeps increasing the command", "The derivative term amplifies the delayed measurement", "The plant gain rises after the delay elapses"],
a: 1, why: "By the time the response arrives, the command is far too large. The result is a long, slow oscillation rather than a fast one." }
],
interview: {
q: "Your plant has a dead time comparable with its time constant. How do you approach the control?",
a: "A ratio of dead time to time constant near one is genuinely hard, and the first thing I would do is set expectations, because the achievable closed-loop bandwidth is capped at roughly the reciprocal of the dead time and no amount of tuning moves that. Dead time contributes phase lag growing linearly with frequency and removes no gain, so it eats phase margin without giving anything back. Practically I would start with a conventional PI loop detuned for the delay, using a tuning rule that takes the delay explicitly rather than a generic one, and I would expect a slow, well-damped response rather than a fast one. Before reaching for anything cleverer I would ask whether the delay can be reduced, because moving a sensor closer or removing a filter is worth far more than any controller change. If the delay is genuinely fixed, accurately known and dominant, a Smith predictor is the classical answer: it feeds back an undelayed model output so the controller can be tuned as though the delay were absent, and separately feeds back the mismatch between the delayed model and the real measurement to handle model error and disturbances. The reason I would not reach for it automatically is that it depends on knowing the delay, and if the delay varies with flow rate or load then a mismatch makes it less robust than the simple loop it replaced. Where the delay varies I would stay with a detuned conventional loop and put my effort into feedforward instead, because anything I can measure before it reaches the plant sidesteps the delay entirely."
}
},

{
id: "ct-mpc",
track: "Control",
sub: "Control in the real world",
title: "Model predictive control, and when it earns its cost",
mins: 22,
body: `
<p>Model predictive control does something no classical controller does: it looks ahead. At
each sample it uses a model to predict the plant's behaviour over a horizon, solves an
optimisation for the sequence of inputs that minimises a cost over that horizon, applies only
the first input, and then throws the rest away and repeats.</p>

<svg class="fig" viewBox="0 0 680 260" role="img" aria-label="A prediction horizon with a planned input sequence, of which only the first step is applied before the whole problem is re-solved">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">solve over the horizon, apply one step, re-solve</text>

<line class="ln" x1="60" y1="200" x2="640" y2="200"/>
<line class="ln" x1="150" y1="90" x2="150" y2="215"/>
<text class="ts" x="120" y="234">now</text>

<circle class="dot" cx="200" cy="160" r="5"/>
<circle class="dot" cx="270" cy="140" r="5"/>
<circle class="dot" cx="340" cy="128" r="5"/>
<circle class="dot" cx="410" cy="122" r="5"/>
<circle class="dot" cx="480" cy="120" r="5"/>
<circle class="dot" cx="550" cy="120" r="5"/>
<text class="ts" x="330" y="104">predicted trajectory over the horizon</text>

<rect class="bx" x="180" y="176" width="42" height="24" rx="3"/>
<text class="th" x="230" y="194">only this input is actually applied</text>
</svg>

<p>Re-solving with the latest measurement is what turns an open-loop plan into feedback. That
receding horizon is the whole idea, and it is why the technique is robust to the model being
imperfect.</p>

<p>What MPC gives you that PID cannot is <b>constraints</b>. Actuator limits, rate limits, and
limits on states such as a temperature or a pressure, all enter the optimisation explicitly, so
the controller can drive right up against a limit deliberately rather than saturating into it
and winding up. It also handles multi-input, multi-output plants with interaction naturally,
where tuning several PID loops against each other is genuinely difficult.</p>

<p>The costs are real. It needs a model. It needs an optimisation solved every sample, which is
why it started in chemical plants with minute-long sample times and only reached motor control
as processors improved. And the tuning moves from gains to weights and horizons, which is not
obviously easier, only different.</p>

<p><b>Explicit MPC</b> removes the runtime solver for small problems by solving the optimisation
offline into a piecewise-affine lookup, so the run-time cost becomes a table search. That makes
it feasible on a microcontroller, at the price of a table whose size grows quickly with the
number of states and constraints.</p>

<p>Horizon length is the main trade. Too short and the controller is myopic and can drive
itself into a corner; too long and the computation grows while the far end of the prediction is
dominated by model error you should not trust anyway.</p>
`,
quiz: [
{ q: "What makes MPC feedback rather than an open-loop plan?",
o: ["The optimisation includes a feedback term", "It re-solves every sample with the latest measurement", "The model is updated online from data", "The first input is filtered before it is applied"],
a: 1, why: "The receding horizon is the whole idea: plan over the horizon, apply one step, discard the rest and re-plan. That is what makes it robust to model error." },
{ q: "What does MPC offer that PID fundamentally cannot?",
o: ["Zero steady-state error", "Explicit handling of input and state constraints", "Stability without a model", "A faster response to a setpoint change"],
a: 1, why: "It can optimise right up against a limit deliberately rather than saturating into it. Multi-input plants with interaction are the other natural fit." },
{ q: "What does explicit MPC do?",
o: ["Solves the optimisation offline into a lookup table", "Uses an explicit rather than implicit integrator", "Requires the constraints to be stated explicitly", "Predicts using a longer horizon"],
a: 1, why: "Runtime becomes a table search rather than a solver, which makes it feasible on a microcontroller. The table grows quickly with states and constraints." },
{ q: "What is the drawback of a very long prediction horizon?",
o: ["The controller becomes myopic", "Computation grows and the far end is dominated by model error", "The constraints can no longer be satisfied", "The closed loop becomes unstable"],
a: 1, why: "You pay for predictions you should not trust. Too short a horizon is the opposite failure, where the controller drives itself into a corner." }
],
interview: {
q: "When would you choose MPC over a well-tuned PID loop?",
a: "The two cases where it genuinely earns its cost are constraints and interaction. If the plant has hard limits that I want to operate right up against, whether that is an actuator limit, a rate limit or a state limit like a temperature or a pressure, then MPC puts those in the optimisation explicitly and drives up to them deliberately, whereas a PID saturates into them and I end up bolting anti-windup on to manage the consequences. And if the plant is multi-input multi-output with real interaction between the loops, then tuning several PID loops against one another is genuinely hard and the optimisation does that coordination for me. Outside those two cases a well-tuned PID is usually the better engineering answer, because MPC costs me a model, an optimisation solved every sample, and a tuning problem that has moved from gains to horizons and weights rather than becoming easier. On implementation, the receding horizon is what makes it feedback rather than a plan: I solve over the horizon, apply only the first input, then discard the rest and re-solve with the newest measurement, and that is what makes it forgiving of model error. If I needed it on a microcontroller with a fast sample rate, I would look at explicit MPC, where the optimisation is solved offline into a piecewise-affine lookup so the runtime cost is a table search, accepting that the table grows quickly with the number of states and constraints."
}
},

{
id: "ct-repetitive",
track: "Control",
sub: "Control in the real world",
title: "Rejecting a periodic disturbance you already know about",
mins: 20,
body: `
<p>A great many disturbances are periodic and their frequency is known: mains hum at 50 Hz,
once-per-revolution runout in a spindle, a cogging torque at six times the electrical frequency,
a pump pulsation. A general-purpose loop treats each of these as a fresh surprise every cycle,
which is wasteful when you know it is coming.</p>

<p>The <b>internal model principle</b> is the theory behind the fix: to reject a disturbance
perfectly, the loop must contain a model of it. That is exactly why an integrator rejects a
constant, and it generalises. To reject a sinusoid at a known frequency, put a pair of poles at
that frequency in the controller.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="A resonant controller adding very high gain at one frequency, leaving the rest of the response unchanged">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">controller gain against frequency</text>

<line class="ln" x1="70" y1="90" x2="70" y2="200"/>
<line class="ln" x1="70" y1="200" x2="630" y2="200"/>

<line class="ln" x1="70" y1="150" x2="630" y2="150"/>
<text class="ts" x="500" y="142">the ordinary PI response</text>

<line class="ln" x1="300" y1="150" x2="310" y2="100"/>
<line class="ln" x1="310" y1="100" x2="320" y2="150"/>
<text class="th" x="250" y="92">resonant term</text>
<text class="ts" x="236" y="224">huge gain at exactly the disturbance frequency</text>
</svg>

<p>That is a <b>resonant controller</b>: a lightly damped second-order term added in parallel
with the PI. It puts enormous gain at one frequency and almost none elsewhere, so it annihilates
that component without disturbing the loop's behaviour anywhere else. Adding several in parallel
handles a fundamental and its harmonics.</p>

<p><b>Repetitive control</b> is the generalisation. Instead of poles at one frequency it uses a
delay of exactly one disturbance period inside a positive feedback path, which places high gain
at the fundamental and every harmonic at once. It suits a disturbance that repeats with a
complicated shape, such as runout in a rotating machine.</p>

<p>Both share the same weaknesses, and both are worth naming before you commit. They add phase
around the target frequency, so the margin has to be checked rather than assumed. They depend
on knowing the frequency, so if the mains drifts or the spindle changes speed, a fixed resonant
term walks off the disturbance and does nothing. And repetitive control needs a low-pass filter
in the loop to keep the high-frequency harmonics from destabilising it, which limits how far up
the harmonic series it works.</p>

<p>Where the frequency varies, the practical answer is to make the resonant term track it, from
an encoder in the rotating case or a phase-locked loop in the mains case. That turns a fragile
trick into a robust one.</p>
`,
quiz: [
{ q: "What does the internal model principle say?",
o: ["The controller must contain a model of the plant", "To reject a disturbance perfectly the loop must model it", "The model must be updated online", "A model is needed only for feedforward"],
a: 1, why: "It is why an integrator rejects a constant, and it generalises: to reject a sinusoid you need poles at that frequency in the controller." },
{ q: "What does a resonant controller add?",
o: ["Broadband gain across the passband", "Very high gain at one frequency and little elsewhere", "A notch at the disturbance frequency", "An extra integrator in the forward path"],
a: 1, why: "It annihilates that component without disturbing the loop elsewhere. Several in parallel handle a fundamental and its harmonics." },
{ q: "How does repetitive control differ from a resonant controller?",
o: ["It uses a period delay, so it covers every harmonic at once", "It adapts the frequency automatically", "It works without any model of the disturbance", "It only rejects the fundamental"],
a: 1, why: "A delay of exactly one disturbance period in a positive feedback path places high gain at the fundamental and all its harmonics simultaneously." },
{ q: "What happens if the disturbance frequency drifts away from the resonant term?",
o: ["The loop becomes unstable immediately", "The rejection disappears and the term does nothing useful", "The gain increases at the new frequency", "The controller adapts automatically"],
a: 1, why: "The gain is very narrow by design, so it walks off the disturbance. Tracking the frequency from an encoder or a phase-locked loop is the robust answer." }
],
interview: {
q: "A spindle has a once-per-revolution position error you cannot design out mechanically. What would you do in the controller?",
a: "That is a periodic disturbance at a known frequency, so it is exactly the case the internal model principle addresses: to reject a disturbance perfectly the loop has to contain a model of it, which is why an integrator rejects a constant, and the generalisation is to put poles at the disturbance frequency. Practically I would add a resonant term in parallel with the existing PI, a lightly damped second-order section tuned to the rotation frequency, which puts enormous gain at exactly that frequency and almost none elsewhere, so it annihilates the runout without disturbing how the loop behaves anywhere else. If the error has harmonics, which runout usually does, I would either add a resonant term per harmonic or move to repetitive control, which uses a delay of exactly one revolution inside a positive feedback path and therefore gets the fundamental and every harmonic at once. The thing I would be careful about is that the spindle speed changes. A fixed resonant term is very narrow by design, so if the speed drifts the gain walks off the disturbance and does nothing at all. Since I have an encoder I would make the resonant frequency track the measured speed, which turns it from a fragile trick into something robust. I would also check the phase margin after adding it rather than assume, because the resonant term does add phase around its frequency, and with repetitive control I would need a low-pass in the loop to stop the high harmonics destabilising it, which limits how far up the series it is useful."
}
},

{
id: "ct-disturbance",
track: "Control",
sub: "Control in the real world",
title: "Disturbance observers: making the plant look like the model",
mins: 20,
body: `
<p>A disturbance observer is a small structure that sits around a plant and estimates
everything that is not in your model, then cancels it. The result is that the outer controller
sees something much closer to the nominal plant it was designed for.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The plant output compared against the nominal model's expected output, the difference filtered and subtracted from the command">
<rect class="bx" x="40" y="70" width="140" height="60" rx="4"/>
<text class="th" x="56" y="98">plant</text>
<text class="ts" x="56" y="118">real, with disturbance</text>

<rect class="bx" x="40" y="160" width="140" height="60" rx="4"/>
<text class="th" x="56" y="188">inverse of</text>
<text class="th" x="56" y="208">nominal model</text>

<line class="ln" x1="180" y1="100" x2="260" y2="100"/>
<line class="ln" x1="220" y1="100" x2="220" y2="190"/>
<line class="ln" x1="220" y1="190" x2="180" y2="190"/>

<rect class="bx" x="300" y="115" width="150" height="60" rx="4"/>
<text class="th" x="316" y="142">difference</text>
<text class="ts" x="316" y="162">the disturbance estimate</text>

<line class="ln" x1="450" y1="145" x2="510" y2="145"/>
<rect class="bx" x="510" y="115" width="140" height="60" rx="4"/>
<text class="th" x="526" y="142">Q filter</text>
<text class="ts" x="526" y="162">sets the bandwidth</text>

<text class="ts" x="180" y="240">subtract the estimate from the command, and the disturbance is gone</text>
</svg>

<p>The mechanism is simple in principle. Pass the measured output through the inverse of the
nominal plant model to work out what input <i>would have</i> produced it. Subtract the input you
actually applied. The difference is everything the model does not explain: load torque,
friction, a gain that has changed, an unmodelled mode. Subtract that estimate from the command
and it is cancelled.</p>

<p>Two practical obstacles turn that principle into an engineering problem. The inverse of a
real plant is improper, because a plant has more poles than zeros, so it cannot be implemented
directly. And a plain inverse would amplify high-frequency noise without limit.</p>

<p>Both are solved by the same component, the <b>Q filter</b>: a low-pass placed in the estimate
path. It makes the combination proper and it sets the bandwidth over which disturbances are
rejected. Inside the Q filter's bandwidth the plant looks like the nominal model; outside it,
the observer does nothing.</p>

<p>So the Q filter is the design. Wide gives strong rejection and passes measurement noise into
the command, and is more sensitive to model error at high frequency where the model is least
trustworthy. Narrow is conservative and rejects only slow disturbances.</p>

<p>The reason this structure is attractive is that it is a <b>robustness</b> tool as much as a
performance one. Because it makes the real plant behave like the nominal one, the outer loop can
be tuned aggressively against a model it can now rely on. It is widely used in motion control
for exactly that reason, where it absorbs friction, load changes and motor constant variation
without the outer loop having to know about any of them.</p>
`,
quiz: [
{ q: "What does a disturbance observer estimate?",
o: ["The plant's states from its output", "Everything the nominal model does not explain", "The measurement noise on the sensor", "The setpoint the operator intended"],
a: 1, why: "Load torque, friction, a changed gain and unmodelled modes all appear in the same estimate, which is then subtracted from the command." },
{ q: "Why is a Q filter necessary?",
o: ["To remove the disturbance from the measurement", "The plant inverse is improper and would amplify noise", "To make the observer converge faster", "To decouple the observer from the controller"],
a: 1, why: "A real plant has more poles than zeros, so its inverse cannot be implemented, and a plain inverse would amplify high-frequency noise without limit." },
{ q: "What does the Q filter's bandwidth set?",
o: ["The speed of the outer control loop", "The frequency range over which disturbances are rejected", "The accuracy of the plant model required", "The sample rate of the controller"],
a: 1, why: "Inside it the plant looks like the nominal model; outside it the observer does nothing. Wide rejects more and passes more noise." },
{ q: "Why is a disturbance observer described as a robustness tool?",
o: ["It guarantees stability under any model error", "It makes the real plant behave like the nominal one", "It reduces the sensitivity to measurement noise", "It removes the need for an outer loop"],
a: 1, why: "The outer loop can then be tuned aggressively against a model it can rely on, which is why it is common in motion control." }
],
interview: {
q: "How would you make a servo loop insensitive to a varying load?",
a: "My first move would be a disturbance observer, because a varying load is precisely what it is for. The idea is to run the measured output back through the inverse of the nominal plant model to work out what input would have produced it, subtract the input I actually applied, and the difference is everything the model does not explain: load torque, friction, a motor constant that has drifted. Subtracting that estimate from the command cancels it, so the outer loop sees something much closer to the nominal plant it was designed for. Two things stop the naive version working. A real plant has more poles than zeros so its inverse is improper and cannot be implemented, and a plain inverse would amplify measurement noise without limit. Both are handled by the Q filter, a low-pass in the estimate path, which makes the combination proper and sets the bandwidth over which disturbances are actually rejected. That filter is the real design decision: wide gives strong rejection but passes noise into the command and leans on the model at high frequency where the model is least trustworthy, and narrow only catches slow disturbances. I would set it from the bandwidth of the load variation I care about and then check what it does to the noise on the actuator. The reason I like the structure is that it is as much about robustness as performance, because once the plant behaves like the model I can tune the outer loop aggressively against something I can rely on. If the load variation were predictable rather than random, for instance a known payload or a gravity term that depends on pose, I would feed that forward instead, because feedforward is outside the loop and cannot destabilise anything."
}
},

{
id: "ct-multivariable",
track: "Control",
sub: "Control in the real world",
title: "Interaction: when tuning one loop detunes another",
mins: 20,
body: `
<p>Two single loops on a plant with two inputs and two outputs will fight each other if each
input affects both outputs. You tune the first loop, it works, you tune the second, and the
first starts oscillating. That is interaction, and it needs to be diagnosed rather than tuned
around.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Two inputs each affecting both outputs, with strong diagonal coupling in one pairing and strong cross coupling in the other">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">each input affects both outputs</text>

<rect class="bx" x="60" y="80" width="120" height="50" rx="4"/>
<text class="th" x="86" y="112">input 1</text>
<rect class="bx" x="60" y="160" width="120" height="50" rx="4"/>
<text class="th" x="86" y="192">input 2</text>

<rect class="bx" x="500" y="80" width="120" height="50" rx="4"/>
<text class="th" x="524" y="112">output 1</text>
<rect class="bx" x="500" y="160" width="120" height="50" rx="4"/>
<text class="th" x="524" y="192">output 2</text>

<line class="ln" x1="180" y1="105" x2="500" y2="105"/>
<line class="ln" x1="180" y1="185" x2="500" y2="185"/>
<line class="ln" x1="180" y1="112" x2="500" y2="178"/>
<line class="ln" x1="180" y1="178" x2="500" y2="112"/>
<text class="ts" x="290" y="150">the cross terms are the problem</text>
</svg>

<p>The <b>relative gain array</b> is the standard diagnostic. For each input-output pairing it
compares the gain with all other loops open against the gain with all other loops closed. A
value of one means that pairing is unaffected by the others and can be controlled
independently. A value near zero means you have paired the wrong things. A large value, or a
negative one, means the loops fight, and a negative value in particular warns that closing one
loop can destabilise another.</p>

<p>The first thing the array usually tells you is that the <b>pairing</b> is wrong: input one
should be controlling output two, not output one. Swapping the pairing costs nothing and often
solves the problem outright, which is why it is worth computing before doing anything more
sophisticated.</p>

<p>If no pairing is clean, the next option is a <b>decoupler</b>: a static or dynamic matrix in
front of the plant chosen so that the combination is close to diagonal. Each single loop then
sees an almost independent plant. A static decoupler is often enough and is cheap; a dynamic one
inverts more of the plant and inherits all the usual problems of plant inversion.</p>

<p>Beyond that you are into genuinely multivariable design, LQR or MPC, which handles the
coordination inherently rather than trying to force the problem back into single loops.</p>

<p>There is one more practical option that is easy to overlook: <b>separate the timescales</b>.
If one loop is made ten times faster than the other, the slow loop sees the fast one as already
settled and the interaction largely disappears. That costs nothing but bandwidth on one loop,
and is often the least effort for the most benefit.</p>
`,
quiz: [
{ q: "What does a relative gain array element of one indicate?",
o: ["That pairing is strongly coupled to the others", "That pairing is unaffected by the other loops", "The loop will be unstable when closed", "The input has no effect on that output"],
a: 1, why: "It compares open-loop and closed-loop gain for the pairing, so one means the other loops make no difference and it can be controlled independently." },
{ q: "What does a negative relative gain array element warn of?",
o: ["The plant has a right-half-plane zero", "Closing one loop can destabilise another", "The pairing has no steady-state gain", "The measurement sign is inverted"],
a: 1, why: "It is the strongest signal that the pairing is wrong. Large positive values also indicate fighting, but a negative value is the one to take seriously." },
{ q: "What is the cheapest thing to try when loops interact?",
o: ["Add a dynamic decoupler", "Check whether the input-output pairing is wrong", "Move to a multivariable design", "Reduce the gain on both loops"],
a: 1, why: "Swapping which input controls which output costs nothing and often solves it outright, which is why the array is worth computing first." },
{ q: "How does separating the loop timescales reduce interaction?",
o: ["The fast loop rejects the slow loop's disturbance", "The slow loop sees the fast one as already settled", "The loops no longer share an actuator", "It removes the cross terms from the plant"],
a: 1, why: "A factor of ten in bandwidth makes the fast loop look like a static gain to the slow one, and it costs nothing but bandwidth on one loop." }
],
interview: {
q: "You tune one loop and another starts oscillating. How do you diagnose it?",
a: "That is interaction, and I would diagnose it rather than tune around it, because tuning around it usually just moves the problem. The tool I would reach for is the relative gain array, which for each input-output pairing compares the gain with the other loops open against the gain with them closed. A value near one says that pairing is essentially independent and can be controlled on its own; a value near zero says I have paired the wrong things; and a large or negative value says the loops fight, with a negative value specifically warning that closing one loop can destabilise another. Very often the first thing it tells me is that the pairing is simply wrong, and swapping which input controls which output costs nothing and fixes it outright, so that is always worth checking before anything more elaborate. If no pairing comes out clean, the next step is a decoupler, a matrix in front of the plant chosen to make the combination roughly diagonal so each single loop sees an almost independent plant; a static decoupler is cheap and often sufficient, and a dynamic one inverts more of the plant and inherits the usual problems of inversion. Beyond that I would stop trying to force it into single loops and use a genuinely multivariable design, LQR or MPC, which handles the coordination inherently. The option I would consider first though, because it is nearly free, is separating the timescales: if I can make one loop about ten times faster than the other, the slow loop sees the fast one as already settled and most of the interaction disappears."
}
},

{
id: "ct-commission",
track: "Control",
sub: "Control in the real world",
title: "Commissioning a loop on real hardware without breaking it",
mins: 20,
body: `
<p>Everything up to this point assumed you could try things. On real hardware the first closed
loop can destroy a mechanism, and the sequence you follow is a safety procedure as much as a
tuning one.</p>

<svg class="fig" viewBox="0 0 680 270" role="img" aria-label="A commissioning sequence from limits and stops, through open loop, to inner and then outer loops, with a step response check at each stage">
<rect class="bx" x="24" y="30" width="632" height="38" rx="4"/>
<text class="th" x="40" y="55">1. limits, stops and the emergency path, tested before anything moves</text>
<rect class="bx" x="24" y="78" width="632" height="38" rx="4"/>
<text class="th" x="40" y="103">2. sensors: sign, scaling and range, by moving the axis BY HAND</text>
<rect class="bx" x="24" y="126" width="632" height="38" rx="4"/>
<text class="th" x="40" y="151">3. open loop: small command, confirm direction and rough gain</text>
<rect class="bx" x="24" y="174" width="632" height="38" rx="4"/>
<text class="th" x="40" y="199">4. innermost loop, low gain, raise until it rings, then back off</text>
<rect class="bx" x="24" y="222" width="632" height="38" rx="4"/>
<text class="th" x="40" y="247">5. next loop out, repeat. never two loops at once</text>
</svg>

<p>The step that saves the most hardware is the second: confirm the <b>sign</b> of the feedback
before closing the loop. A sign error turns negative feedback into positive feedback, and the
axis runs to a limit at full effort the instant you enable it. Moving the axis by hand and
watching the sensor is a thirty second check that has saved a great many mechanisms.</p>

<p>The other safeguard is to <b>limit the actuator</b> before the first enable. A current limit,
a duty cycle limit or a software clamp set to a fraction of full scale means that even a fully
unstable loop merely buzzes rather than destroys something. It costs nothing and can be raised
once you have confidence.</p>

<p>Tune from the inside out, one loop at a time. Each outer loop sees the closed inner loop as
its plant, so the inner one has to be settled first. Tuning two at once means you cannot
attribute a change to either.</p>

<p>The classic gain-raising procedure is to increase proportional gain until the response just
begins to ring, then back off by a comfortable factor, then add integral action until the
steady-state error is removed, then derivative only if the response needs damping and the
measurement is quiet enough to survive it.</p>

<p>Finally, test at the extremes. A loop tuned at one operating point, one temperature and one
payload can be unstable at another, because the plant's gain and dynamics vary across its range.
Hot, cold, loaded, unloaded and at both ends of travel is the minimum matrix before you call it
commissioned.</p>
`,
quiz: [
{ q: "What should be confirmed before closing a loop for the first time?",
o: ["The controller's sample rate", "The sign of the feedback, by moving the axis by hand", "The integral gain setting", "The plant's frequency response"],
a: 1, why: "A sign error makes it positive feedback, so the axis runs to a limit at full effort the instant it is enabled. It is a thirty second check." },
{ q: "Why limit the actuator before the first enable?",
o: ["It makes the loop easier to tune", "An unstable loop then buzzes rather than destroys something", "It prevents integral windup", "It improves the signal to noise ratio"],
a: 1, why: "A current or duty limit set to a fraction of full scale costs nothing and can be raised once you have confidence in the loop." },
{ q: "In what order should cascaded loops be commissioned?",
o: ["Outermost first, then inward", "Innermost first, then outward", "All together, then refine", "Whichever is easiest to measure"],
a: 1, why: "Each outer loop sees the closed inner loop as its plant, so the inner must be settled first. Tuning two at once means you cannot attribute a change." },
{ q: "Why test a commissioned loop at the extremes of its range?",
o: ["The sensors are least accurate there", "The plant's gain and dynamics vary across the range", "The actuator saturates only at the extremes", "The sample rate changes with temperature"],
a: 1, why: "A loop tuned at one operating point can be unstable at another. Hot, cold, loaded, unloaded and both ends of travel is the minimum matrix." }
],
interview: {
q: "You have a new motion axis and no model. Talk me through commissioning the control loop.",
a: "I would treat the first half of it as a safety procedure rather than a tuning one. Before anything moves I would confirm the hard limits, the mechanical stops and the emergency stop path actually work, because those are what protect the machine when the loop misbehaves. Then, with the drive disabled, I would move the axis by hand and watch the feedback to confirm its sign, its scaling and its range. Getting the sign wrong turns negative feedback into positive feedback and the axis runs to a limit at full effort the moment it is enabled, and that thirty second check has saved a lot of mechanisms. I would also clamp the actuator, a current or duty limit at a fraction of full scale, so that even a completely unstable loop buzzes instead of breaking something, and raise it later once I have confidence. Then open loop: a small command, confirm the direction of motion and get a rough idea of the gain and the time constant from the response, which gives me a starting point for the gains. After that I close the innermost loop, usually current or velocity, with the gain low, and raise the proportional term until the response just starts to ring, back off by a comfortable factor, then add integral until the steady-state error goes, and derivative only if it needs damping and the measurement is quiet enough to take it. Then the next loop out, one at a time, never two at once, because each outer loop sees the closed inner loop as its plant. Finally I would test at the extremes, hot, cold, loaded, unloaded and at both ends of travel, because a loop tuned at one operating point can be unstable at another and that is exactly where it will be found in service."
}
}

);
