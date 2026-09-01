// Control: nonlinear and optimal control.
//
// The track had one lesson called "Nonlinear realities" and one mentioning LQR
// alongside MPC. This is the theory underneath: proving stability without
// solving, cancelling what you know, robustness through switching, predicting
// limit cycles, combining an estimator with a regulator, and why optimal control
// has the recursive structure it does.

LESSONS.push(

{
id: "ct-lyapunov",
track: "Control",
sub: "Nonlinear and optimal control",
title: "Lyapunov: proving stability without solving anything",
mins: 22,
body: `
<p>For a linear system, stability is a question about eigenvalues and it is settled by computation.
For a nonlinear one there is no such shortcut, and simulating a few trajectories proves nothing
about the ones you did not try. Lyapunov's method gives a proof without solving the equations.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="An energy-like function positive everywhere except the equilibrium, decreasing along every trajectory, forcing the state to the equilibrium">
<rect class="bx" x="24" y="26" width="632" height="52" rx="4"/>
<text class="th" x="40" y="52">find a scalar function V of the state</text>
<text class="ts" x="40" y="70">positive everywhere except zero at the equilibrium</text>

<rect class="bxa" x="24" y="92" width="632" height="52" rx="4"/>
<text class="th" x="40" y="118">show V decreases along every trajectory</text>
<text class="ts" x="40" y="136">using the system equations, without solving them</text>

<rect class="bx" x="24" y="158" width="632" height="52" rx="4"/>
<text class="th" x="40" y="184">then the state must reach the equilibrium</text>
<text class="ts" x="40" y="202">it cannot do anything else: V has nowhere else to go</text>

<text class="ts" x="40" y="234">failing to find such a V proves nothing either way</text>
</svg>

<p>The idea is to find a scalar function of the state that behaves like <b>energy</b>: positive
everywhere except zero at the equilibrium, and decreasing along every trajectory. If such a
function exists, the state has nowhere to go but the equilibrium, and that is a proof covering all
initial conditions in the region rather than the ones you simulated.</p>

<p>The rate of change is computed using the system equations by the chain rule, which is the key
mechanical step: you never solve for the trajectory, you only need its direction at each point,
and that the model gives you directly.</p>

<p>Physical <b>energy</b> is the natural first candidate, and for mechanical and electrical systems
it often works immediately: kinetic plus potential energy for a mechanism, stored energy for a
circuit. Showing that a controller makes energy decrease is both a proof and an explanation, which
is why energy-based control designs are popular where they apply.</p>

<p>Two refinements matter in practice. Often the derivative is only <b>non-increasing</b> rather
than strictly decreasing, which by itself proves the state stays bounded but not that it converges.
An invariance argument closes that gap by showing the system cannot remain where the derivative is
zero unless it is at the equilibrium, and that covers a great many real cases including damped
mechanisms.</p>

<p>Second, the result is usually <b>local</b>. The region where the argument holds is a region of
attraction, and it is a genuine part of the answer: a controller that is stable near the operating
point and not from a large disturbance is a different thing from one that is globally stable, and
knowing which you have is often more useful than the proof itself.</p>

<p>The honest limitation is that failing to find a suitable function proves nothing. The method is
sufficient and not necessary, so a negative result means you did not find one, not that the system
is unstable. In practice candidates come from physical energy, from a quadratic form found by
solving a linear matrix equation for the linearised system, or from the structure of the problem,
and searching for them is a real part of the work.</p>
`,
quiz: [
{ q: "What does a Lyapunov function have to satisfy?",
o: ["It must be the system's true energy", "Positive except at the equilibrium, and decreasing along trajectories", "It must solve the differential equation", "It must be quadratic"],
a: 1, why: "The rate of change is computed from the system equations by the chain rule, so the trajectory is never solved for." },
{ q: "Why is the method valuable for nonlinear systems?",
o: ["It is computationally cheaper than eigenvalues", "It proves stability for all initial conditions in a region, not just simulated ones", "It gives the settling time", "It works without a model"],
a: 1, why: "Simulating a few trajectories proves nothing about the ones not tried, which is the gap this closes." },
{ q: "What does a merely non-increasing derivative prove?",
o: ["Asymptotic stability", "Boundedness, but not convergence without a further argument", "Instability", "Nothing at all"],
a: 1, why: "An invariance argument shows the system cannot stay where the derivative is zero unless at the equilibrium, which covers damped mechanisms." },
{ q: "What does failing to find a Lyapunov function tell you?",
o: ["The system is unstable", "Nothing; the condition is sufficient, not necessary", "The equilibrium is not unique", "The model is wrong"],
a: 1, why: "Candidates come from physical energy, from a quadratic form for the linearised system, or from problem structure, and finding one is real work." }
],
interview: {
q: "How would you establish that a nonlinear controller is stable?",
a: "Not by simulation alone, because simulating a set of trajectories tells me nothing about the ones I did not try, and for a nonlinear system there is no eigenvalue test to fall back on. The tool is Lyapunov's method, which gives a proof without solving the equations. I look for a scalar function of the state that behaves like energy: strictly positive everywhere except zero at the equilibrium, and decreasing along every trajectory of the system. If I can find one, then the state has nowhere to go except the equilibrium, and that argument covers every initial condition in the region rather than the ones I happened to test. The mechanical step is that I compute the derivative of that function using the system equations by the chain rule, so I only need the direction of motion at each point, which the model gives me directly, and I never need the trajectory itself. For mechanical and electrical systems physical energy is the natural first candidate and it often works straight away, kinetic plus potential for a mechanism or stored energy for a circuit, and showing that the controller makes energy decrease is both a proof and an explanation, which is why energy-based designs are attractive where they apply. Two practical points. Very often the derivative comes out non-increasing rather than strictly decreasing, which on its own proves the state stays bounded but not that it converges, and I close that with an invariance argument showing the system cannot linger where the derivative is zero unless it is at the equilibrium, which handles most damped mechanisms. And the result is usually local, so the region where the argument holds is an estimate of the region of attraction, and knowing whether I have local stability near the operating point or global stability is often more useful than the proof itself. The honest caveat is that the condition is sufficient and not necessary, so failing to find a function proves nothing either way."
}
},

{
id: "ct-fblin",
track: "Control",
sub: "Nonlinear and optimal control",
title: "Cancelling what you know: feedback linearisation",
mins: 22,
body: `
<p>If a nonlinearity is known and invertible, you can cancel it in the control law and present the
outer loop with something that behaves linearly. Done carefully this is powerful; done carelessly it
replaces a manageable nonlinear problem with a fragile one.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="An inner loop cancelling known nonlinear terms so an outer linear controller sees a simple integrator chain">
<rect class="bx" x="24" y="26" width="196" height="66" rx="4"/>
<text class="th" x="40" y="52">outer loop</text>
<text class="ts" x="40" y="76">simple linear design</text>

<rect class="bxa" x="236" y="26" width="196" height="66" rx="4"/>
<text class="th" x="252" y="52">cancellation</text>
<text class="ts" x="252" y="76">uses the model</text>

<rect class="bx" x="448" y="26" width="208" height="66" rx="4"/>
<text class="th" x="464" y="52">nonlinear plant</text>

<rect class="bx" x="24" y="112" width="632" height="52" rx="4"/>
<text class="th" x="40" y="140">what the outer loop sees: a chain of integrators</text>

<rect class="bx" x="24" y="178" width="632" height="52" rx="4"/>
<text class="th" x="40" y="206">what it depends on: the cancellation being exact</text>
</svg>

<p>The everyday version is <b>computed torque</b> in a robot arm: the control law computes the
gravity, Coriolis and inertia terms from the model and the measured state, adds them to the demand,
and the remaining loop sees something close to a set of independent double integrators. The same
idea appears as feedforward compensation of a known valve characteristic or a motor's torque
curve.</p>

<p>Two conditions must hold. The nonlinearity must be <b>known</b> well enough to compute, and the
control must be able to <b>cancel</b> it, which means enough actuator authority at every operating
point. A cancellation that demands more torque than the motor can supply simply does not happen, and
the loop is then operating in a regime nobody designed.</p>

<p>The characteristic failure is that cancellation is only as good as the model. An error in a mass
or a friction coefficient leaves a residual that the outer loop must reject, so in practice this is
always <b>partial</b> cancellation plus a feedback loop robust enough to handle the remainder. A
design that relies on exact cancellation is fragile in a way that shows up on the second unit.</p>

<p>There is a deeper limitation worth knowing. Cancelling the input-output behaviour can leave
<b>internal dynamics</b> that are not visible at the output, and if those are unstable the system
misbehaves while the tracking looks perfect. That is the nonlinear counterpart of a right-half-plane
zero, and it is a reason to check the states that are not being controlled rather than just the
tracking error.</p>

<p>A safer relative is <b>gain scheduling</b>: linearise at several operating points, design a
controller for each, and interpolate. It makes no attempt at exact cancellation, degrades gracefully
when the model is wrong, and is straightforward to verify point by point, which is why it is far
more common in shipped products than exact linearisation.</p>

<p>The judgement is that cancellation is best used for the large, well-characterised, repeatable
terms, such as gravity, where the model is trustworthy and the benefit is large, and that feedback
should be left to handle everything else rather than being asked to trust a model it cannot
check.</p>
`,
quiz: [
{ q: "What does computed torque control do?",
o: ["Applies a fixed feedforward table", "Computes model terms from the measured state and adds them, leaving a near-linear loop", "Schedules gains against velocity", "Linearises the sensor response"],
a: 1, why: "The outer loop then sees something close to independent double integrators, which is a much easier design problem." },
{ q: "What must be true besides knowing the nonlinearity?",
o: ["The plant must be stable", "There must be enough actuator authority to cancel it at every operating point", "The sample rate must exceed the plant bandwidth", "The nonlinearity must be smooth"],
a: 1, why: "A cancellation demanding more torque than the motor can supply simply does not happen, leaving the loop in a regime nobody designed." },
{ q: "Why is exact cancellation fragile?",
o: ["It requires high sample rates", "It is only as good as the model, so parameter error leaves a residual", "It cannot handle saturation", "It increases the loop order"],
a: 1, why: "In practice it is always partial cancellation plus a feedback loop robust enough to reject the remainder." },
{ q: "What are internal dynamics in this context?",
o: ["Sensor dynamics inside the loop", "Behaviour invisible at the output that can be unstable while tracking looks perfect", "The controller's own states", "The unmodelled high-frequency modes"],
a: 1, why: "It is the nonlinear counterpart of a right-half-plane zero, and it is why you check the uncontrolled states rather than just the tracking error." }
],
interview: {
q: "Would you use feedback linearisation on a robot arm?",
a: "Partly, and deliberately not completely. The attraction is real: if I compute the gravity, inertia and Coriolis terms from the model and the measured state and add them to the demand, the outer loop sees something close to a set of independent double integrators, which is a much easier design problem than a coupled nonlinear one, and it removes the need to detune the loop for the worst-case configuration. Gravity compensation in particular is worth doing almost always, because the term is large, well characterised, repeatable, and the model for it is trustworthy. What I would not do is design as though the cancellation were exact. It is only ever as good as the model, and a link mass or a friction coefficient that is a few percent out leaves a residual, so in practice this is partial cancellation plus a feedback loop that has to be robust enough to reject what is left. A design that depends on perfect cancellation is fragile in a way that shows up on the second unit or after a payload change. There are two other things I would check. Authority, because the cancellation only happens if the actuator can actually supply the computed torque at every configuration and velocity, and if it saturates, the loop is suddenly running in a regime nobody designed for. And internal dynamics, because cancelling the input-output behaviour can leave states that are not visible at the output, and if those go unstable the tracking error can look perfect while something else diverges, which is the nonlinear analogue of a right-half-plane zero. So I would monitor the states I am not controlling, not just the error. For the terms I am less confident about, I would prefer gain scheduling, linearising at several operating points and interpolating, because it makes no claim of exactness, degrades gracefully when the model is wrong, and can be verified point by point, which is why it appears in shipped products far more often."
}
},

{
id: "ct-sliding",
track: "Control",
sub: "Nonlinear and optimal control",
title: "Sliding mode: robustness through switching",
mins: 22,
body: `
<p>Sliding mode control achieves something unusual: exact rejection of a large class of
disturbances and parameter errors, without knowing them. The price is a discontinuous control
signal, and understanding that trade is the whole subject.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A switching surface in the state space, with the control driving the state onto it and then along it to the origin">
<rect class="bx" x="24" y="26" width="632" height="52" rx="4"/>
<text class="th" x="40" y="52">choose a surface in the state space on which the behaviour is what you want</text>
<text class="ts" x="40" y="70">for example: error plus a constant times its rate equals zero</text>

<rect class="bxa" x="24" y="92" width="308" height="72" rx="4"/>
<text class="th" x="40" y="118">reaching phase</text>
<text class="ts" x="40" y="146">switch hard to drive the state onto the surface</text>

<rect class="bx" x="348" y="92" width="308" height="72" rx="4"/>
<text class="th" x="364" y="118">sliding phase</text>
<text class="ts" x="364" y="146">stay on it; the dynamics are now the surface's</text>

<rect class="bx" x="24" y="178" width="632" height="52" rx="4"/>
<text class="th" x="40" y="206">on the surface, the plant's parameters no longer matter</text>
</svg>

<p>The design has two independent parts, which is what makes it tractable. First, choose a
<b>surface</b> in the state space on which the system would behave as you want. A common choice is
that the error plus a constant times its derivative is zero, which describes a first-order decay
towards the target at a rate you pick.</p>

<p>Second, choose a control law that drives the state onto that surface and keeps it there,
typically by switching hard in whichever direction reduces the distance to it. Once the state is
confined to the surface, the closed-loop behaviour is determined by the surface's definition rather
than by the plant, which is why parameter variation and matched disturbances stop mattering.</p>

<p>That is the strong result: <b>invariance</b> to any disturbance entering through the same channel
as the control, provided the switching amplitude exceeds the disturbance. The controller does not
need to know the disturbance, only a bound on it, which is a much weaker requirement than a
model.</p>

<p>The price is <b>chattering</b>. The ideal law switches infinitely fast, and a real one switches
at the sample rate into a plant with unmodelled high-frequency dynamics, so the state oscillates
about the surface. That shows up as audible noise, actuator heating and mechanical wear, and it is
the reason the method is less used in production than its theory would suggest.</p>

<p>The standard remedy is a <b>boundary layer</b>: replace the hard switch with a steep but
continuous transition near the surface. That removes the chattering and, honestly stated, gives up
exact invariance, leaving a small error proportional to the layer width. Practically this is a
high-gain controller near the surface, and choosing the width is trading residual error against
chatter.</p>

<p>Where it fits well is systems with large uncertain but bounded disturbances, adequate actuator
authority, and tolerance for aggressive actuation: hydraulics, some power electronics where the
converter is already switching, and vehicles. Where it fits badly is anything with limited actuator
bandwidth, a stiff mechanism that will ring, or a requirement for a smooth control signal.</p>
`,
quiz: [
{ q: "What determines the closed-loop behaviour once the state is on the sliding surface?",
o: ["The plant dynamics", "The surface's own definition", "The switching amplitude", "The sample rate"],
a: 1, why: "That is why parameter variation and matched disturbances stop mattering: the plant has been taken out of the answer." },
{ q: "What does the controller need to know about the disturbance?",
o: ["Its exact value", "Only a bound on it, so the switching amplitude can exceed it", "Its frequency content", "Nothing at all"],
a: 1, why: "A bound is a much weaker requirement than a model, which is what makes the invariance property practically useful." },
{ q: "What is chattering?",
o: ["Instability from too high a gain", "Oscillation about the surface from finite switching rate and unmodelled dynamics", "Noise amplification in the sensor", "Limit cycling from backlash"],
a: 1, why: "It shows as audible noise, actuator heating and wear, and is the main reason the method is less used in production than the theory suggests." },
{ q: "What does a boundary layer cost?",
o: ["Stability near the surface", "Exact invariance, leaving an error proportional to the layer width", "The ability to reach the surface", "Robustness to unmatched disturbances"],
a: 1, why: "It becomes a high-gain continuous controller near the surface, and choosing the width trades residual error against chatter." }
],
interview: {
q: "When would sliding mode control be the right choice?",
a: "When I have large disturbances or parameter variations that I cannot model but can bound, enough actuator authority to overpower them, and a system that tolerates aggressive actuation. The attraction is that it gives exact rejection of any disturbance entering through the same channel as the control, provided my switching amplitude exceeds the disturbance, and it achieves that without knowing the disturbance at all, only a bound on it. That is a much weaker requirement than a model, and it is why the method suits things like hydraulics with varying loads, or vehicles, where the uncertainty is genuinely large. The design splits into two independent parts, which is what makes it tractable. First I choose a surface in the state space on which the system would behave as I want, commonly error plus a constant times error rate equals zero, which is a first-order decay to the target at a rate I pick. Second I choose a control law that drives the state onto that surface and holds it there, switching hard in whichever direction reduces the distance. Once the state is confined to the surface, the closed-loop behaviour is set by the surface definition rather than by the plant, and the plant's parameters drop out of the answer. What stops me using it more often is chattering. The ideal law switches infinitely fast, a real one switches at the sample rate into a plant with unmodelled high-frequency dynamics, and the state oscillates about the surface, which shows up as audible noise, actuator heating and mechanical wear. The standard fix is a boundary layer, replacing the hard switch with a steep continuous transition near the surface, and I would be honest that this gives up the exact invariance and leaves a residual error proportional to the layer width, so it becomes a high-gain controller near the surface and the width is a trade against chatter. So I would avoid it where the actuator has limited bandwidth, where the mechanism is stiff and will ring, or where a smooth control signal is required."
}
},

{
id: "ct-describing",
track: "Control",
sub: "Nonlinear and optimal control",
title: "Predicting limit cycles: describing functions",
mins: 20,
body: `
<p>A loop containing saturation, backlash, hysteresis or a relay can oscillate at a fixed amplitude
that neither grows nor decays. Linear analysis cannot predict it because the phenomenon does not
exist in a linear system. Describing functions give an approximate prediction of both the frequency
and the amplitude, which is usually what you need.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A nonlinearity replaced by an amplitude-dependent gain, so the loop condition becomes an intersection between the linear response and a curve parameterised by amplitude">
<rect class="bx" x="24" y="26" width="632" height="52" rx="4"/>
<text class="th" x="40" y="52">assume the oscillation is nearly sinusoidal at the nonlinearity's input</text>

<rect class="bxa" x="24" y="92" width="632" height="52" rx="4"/>
<text class="th" x="40" y="118">replace the nonlinearity by its gain to the fundamental, which depends on amplitude</text>

<rect class="bx" x="24" y="158" width="632" height="72" rx="4"/>
<text class="th" x="40" y="186">a limit cycle exists where the linear loop response meets that gain</text>
<text class="ts" x="40" y="212">the intersection gives the frequency and the amplitude together</text>
</svg>

<p>The method assumes the signal reaching the nonlinearity is close to <b>sinusoidal</b>, which is
reasonable when the rest of the loop is low pass and attenuates the harmonics the nonlinearity
creates. Under that assumption, the nonlinearity can be replaced by an equivalent gain, computed as
the ratio of the fundamental component of its output to the input amplitude.</p>

<p>The essential difference from a linear gain is that this one <b>depends on amplitude</b>. For
saturation, it equals the linear gain for small signals and falls as the signal grows, which is
exactly why a loop that is stable for small inputs can oscillate when driven hard. For a relay, it
is large for small inputs and falls with amplitude, which is why relay loops nearly always
oscillate.</p>

<p>A limit cycle is then predicted where the linear part of the loop and the describing function
<b>intersect</b>, and the intersection point gives both the frequency and the amplitude. Whether
the cycle is stable, meaning the system settles into it, follows from how the two curves cross,
which distinguishes an oscillation the system will sit in from one it will fall out of.</p>

<p>Two uses are worth knowing. Deliberately provoking a limit cycle with a relay is a standard
<b>auto-tuning</b> method, because the resulting frequency and amplitude identify a point on the
plant's frequency response directly and a PID can be set from it. And in diagnosis, an unexplained
steady oscillation at an amplitude that does not change is a strong signal to go looking for a
nonlinearity rather than to retune.</p>

<p>The limitations should be stated whenever the result is quoted. It is an <b>approximation</b>
that fails when the loop does not attenuate harmonics well, when several nonlinearities interact, or
when the oscillation is far from sinusoidal. It predicts existence and approximate parameters, not a
proof, so simulation with the nonlinearity present remains the confirmation.</p>
`,
quiz: [
{ q: "What assumption does the describing function method make?",
o: ["The nonlinearity is small", "The signal at the nonlinearity is nearly sinusoidal", "The loop is first order", "The nonlinearity is memoryless"],
a: 1, why: "It is reasonable when the rest of the loop is low pass and attenuates the harmonics the nonlinearity generates." },
{ q: "How does the equivalent gain differ from a linear gain?",
o: ["It depends on frequency only", "It depends on the signal amplitude", "It is always less than one", "It is complex for all nonlinearities"],
a: 1, why: "Saturation's gain falls as the signal grows, which is exactly why a loop stable for small inputs can oscillate when driven hard." },
{ q: "What does the intersection of the two curves give?",
o: ["The stability margin", "The frequency and amplitude of the predicted limit cycle", "The optimal controller gain", "The saturation level"],
a: 1, why: "How the curves cross also tells you whether the cycle is one the system settles into or one it falls out of." },
{ q: "What is a practical use of deliberately provoking a limit cycle?",
o: ["Testing actuator wear", "Relay auto-tuning, since the cycle identifies a point on the plant response", "Measuring the noise floor", "Verifying the sample rate"],
a: 1, why: "The frequency and amplitude give a point on the frequency response directly, from which a PID can be set." }
],
interview: {
q: "A loop oscillates at a constant amplitude that does not grow or decay. What is happening?",
a: "That is the signature of a limit cycle, and it points at a nonlinearity rather than at tuning, because a linear system cannot do this. A linear instability grows without bound until something saturates, and a linear stable system decays, so an oscillation that sits at a fixed amplitude means something in the loop has a gain that changes with amplitude and settles at the point where the loop gain is exactly one. The usual culprits are saturation, a relay or on-off element, backlash in a mechanism, stiction, or quantisation in a sensor. Describing function analysis is the tool for predicting this. It assumes the signal arriving at the nonlinearity is close to sinusoidal, which is reasonable if the rest of the loop is low pass and attenuates the harmonics, and then replaces the nonlinearity with an equivalent gain defined as the fundamental component of its output over the input amplitude. The important part is that this gain depends on amplitude, so for saturation it equals the linear gain for small signals and falls as the signal grows, which explains directly why a loop that is well behaved for small inputs oscillates when driven hard. The predicted limit cycle is where the linear loop response and that amplitude-dependent gain intersect, and the intersection gives me both the frequency and the amplitude, which I can compare against what I am seeing to confirm the diagnosis and identify which nonlinearity is responsible. Then the fixes follow from the mechanism rather than from tuning: reduce the gain so the intersection disappears, add rate limiting or anti-windup if it is saturation, address backlash mechanically or with a compensator, or filter quantisation noise. And the same phenomenon has a deliberate use, since relay auto-tuning provokes a limit cycle on purpose and reads a point on the plant's frequency response straight off the resulting frequency and amplitude."
}
},

{
id: "ct-lqg",
track: "Control",
sub: "Nonlinear and optimal control",
title: "LQG and the separation principle, and where it fails",
mins: 22,
body: `
<p>An optimal regulator needs the full state, and the full state is rarely measured. The classical
answer is to estimate it and feed the estimate to the regulator, and there is a theorem saying the
two can be designed independently. The theorem is true and its practical consequences are
frequently misread.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="An optimal estimator and an optimal regulator designed separately and combined, with the caution that the combination's robustness is not guaranteed">
<rect class="bx" x="24" y="26" width="308" height="86" rx="4"/>
<text class="th" x="40" y="52">estimator</text>
<text class="ts" x="40" y="80">designed from the noise</text>
<text class="ts" x="40" y="102">statistics alone</text>

<rect class="bx" x="348" y="26" width="308" height="86" rx="4"/>
<text class="th" x="364" y="52">regulator</text>
<text class="ts" x="364" y="80">designed from the cost</text>
<text class="ts" x="364" y="102">weights alone</text>

<rect class="bxa" x="24" y="128" width="632" height="46" rx="4"/>
<text class="th" x="40" y="156">separation: each is optimal, and the combination is optimal</text>

<rect class="bx" x="24" y="188" width="632" height="46" rx="4"/>
<text class="th" x="40" y="216">but optimal is not the same as robust: the margins can be arbitrarily poor</text>
</svg>

<p>The <b>separation principle</b> says that for a linear system with Gaussian noise and a
quadratic cost, the optimal solution is exactly the optimal state estimator followed by the optimal
state feedback, each designed as if the other were perfect. That is a strong and convenient result:
two well-understood problems instead of one hard one.</p>

<p>The <b>regulator</b> half is designed by choosing weights on state error and control effort, and
the ratio between them sets how aggressive the result is. The <b>estimator</b> half is designed by
choosing the process and measurement noise covariances, and their ratio sets how much the estimator
trusts the model against the measurement.</p>

<p>Both halves have a reassuring property in isolation. State feedback of this kind has guaranteed
margins that are hard to lose, and the estimator is optimal in a clear sense. The trap is that these
guarantees do <b>not survive</b> the combination: the resulting output-feedback controller can have
arbitrarily poor stability margins, and that was one of the more consequential discoveries in the
field.</p>

<p>The mechanism is that the estimator sits inside the loop and adds its own dynamics and lag, so
the loop the plant actually sees is not the one the state-feedback design assumed. A plant that
differs from the model then affects the estimate as well as the response, and the two errors
compound.</p>

<p>The practical consequences are three. Always <b>check</b> the robustness of the combined
controller rather than trusting either half. Deliberately <b>detuning</b> the estimator by inflating
the assumed process noise makes it faster and less model-dependent, and often improves robustness at
the cost of noise rejection. And the covariances are best treated as <b>tuning knobs</b> rather than
as measured statistics, since the true noise is rarely Gaussian or stationary anyway.</p>

<p>The wider lesson generalises well beyond this method: optimality is defined against a cost
function and a model, and neither includes the possibility that the model is wrong. A design that is
optimal for the nominal plant and fragile against a real one is a familiar and avoidable
outcome.</p>
`,
quiz: [
{ q: "What does the separation principle state?",
o: ["The estimator must be faster than the regulator", "The optimal solution is the optimal estimator followed by optimal state feedback, designed independently", "State feedback and estimation cannot be combined", "The plant and controller can be designed separately"],
a: 1, why: "It replaces one hard problem with two well-understood ones, which is why the structure is so widely used." },
{ q: "What guarantee is lost when estimator and regulator are combined?",
o: ["Optimality of the result", "The stability margins, which can become arbitrarily poor", "Observability of the plant", "Convergence of the estimate"],
a: 1, why: "State feedback alone has margins that are hard to lose, and discovering that the combination does not inherit them was consequential." },
{ q: "Why does the combination lose those margins?",
o: ["The cost weights change", "The estimator sits in the loop, adding dynamics and lag the state-feedback design did not assume", "The noise becomes correlated", "The plant order doubles"],
a: 1, why: "A plant differing from the model then corrupts the estimate as well as the response, and the two errors compound." },
{ q: "What does inflating the assumed process noise do?",
o: ["Slows the estimator and improves noise rejection", "Speeds the estimator and makes it less model-dependent, often improving robustness", "Reduces the control effort", "Guarantees the margins return"],
a: 1, why: "The covariances are best treated as tuning knobs rather than measured statistics, since real noise is rarely Gaussian or stationary." }
],
interview: {
q: "You have an LQR design and an optimal observer. Can you just connect them?",
a: "You can, and the separation principle says the result is optimal, but I would not assume it is robust, and that distinction matters more in practice than the theorem does. The principle is genuinely useful: for a linear system with Gaussian noise and a quadratic cost, the optimal output-feedback solution is exactly the optimal state estimator feeding the optimal state feedback, each designed as though the other were perfect, so I get two well-understood problems instead of one hard one. Each half also looks reassuring on its own, because state feedback of that kind has guaranteed stability margins that are quite hard to lose, and the estimator is optimal in a clear sense. The trap is that those guarantees do not survive the combination. The resulting controller can have arbitrarily poor margins, and that was one of the more important results in the field precisely because the intuition says otherwise. The mechanism is that the estimator now sits inside the loop and contributes its own dynamics and lag, so the loop the plant actually sees is not the loop the state-feedback design assumed, and when the real plant differs from the model that error corrupts the estimate as well as the response, so the two compound. So what I would actually do is design both halves, connect them, and then check the robustness of the combined controller directly: plot the sensitivity function and look at its peak, sweep the parametric uncertainty and confirm stability across the whole set, and include the real loop delay. If the margins are poor, the usual lever is to detune the estimator deliberately by inflating the assumed process noise, which makes it faster and less dependent on the model and often recovers robustness at the cost of some noise rejection. I would treat the covariances as tuning knobs rather than as measured statistics anyway, since real noise is seldom Gaussian or stationary. The general lesson is that optimality is defined against a cost and a model, and neither of them contains the possibility that the model is wrong."
}
},

{
id: "ct-dp",
track: "Control",
sub: "Nonlinear and optimal control",
title: "Dynamic programming: the structure behind optimal control",
mins: 22,
body: `
<p>Optimal control looks like a search over an enormous space of possible input sequences. Dynamic
programming shows it is not: the problem has a recursive structure that collapses the search, and
recognising that structure explains where LQR, MPC and reinforcement learning all come from.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The principle of optimality: the tail of an optimal trajectory is itself optimal from the intermediate state, allowing a value function to be built backwards">
<rect class="bx" x="24" y="26" width="632" height="52" rx="4"/>
<text class="th" x="40" y="52">principle of optimality</text>
<text class="ts" x="40" y="70">the remainder of an optimal path is optimal from where it starts</text>

<rect class="bxa" x="24" y="92" width="632" height="60" rx="4"/>
<text class="th" x="40" y="118">so define a value function: the best cost achievable from each state</text>
<text class="ts" x="40" y="142">and build it backwards from the end</text>

<rect class="bx" x="24" y="166" width="632" height="64" rx="4"/>
<text class="th" x="40" y="192">then the optimal action is a one-step choice</text>
<text class="ts" x="40" y="216">immediate cost plus the value of where you land</text>
</svg>

<p>The <b>principle of optimality</b> is the observation that if a path from start to goal is
optimal, then the remainder of that path, from any point on it, is optimal from that point. Any
better tail could be substituted and would improve the whole, contradicting optimality.</p>

<p>That licenses defining a <b>value function</b>: for each state, the best total cost achievable
from there onwards. It can be computed backwards from the end, and once it exists, the optimal
action at any state is a one-step decision: choose the action minimising the immediate cost plus the
value of the state you land in. A global problem has become local.</p>

<p>Nearly everything in optimal control is a special case. <b>LQR</b> is what happens when the
dynamics are linear and the cost quadratic: the value function is then quadratic in the state and
the backwards recursion is the Riccati equation, which is why the optimal controller turns out to be
simple constant state feedback despite the problem looking hard.</p>

<p><b>MPC</b> is what happens when constraints make the value function unavailable in closed form:
instead of solving for all states in advance, it optimises over a finite horizon from the current
state, applies the first action, and repeats. The terminal cost in an MPC formulation is an
approximation of the value function beyond the horizon, which is why choosing it well matters for
stability.</p>

<p><b>Reinforcement learning</b> is the same recursion when the dynamics are unknown, learning the
value function or the policy from experience rather than computing it from a model. The Bellman
equation at the centre of it is the same relation used backwards in dynamic programming.</p>

<p>The reason it is not simply used directly is the <b>curse of dimensionality</b>: computing the
value function over a grid costs exponentially in the number of states, so it is practical only for
low-dimensional problems. Every method above is a way of avoiding that: exploit structure as LQR
does, optimise online over a short horizon as MPC does, or approximate the function as learning
methods do.</p>
`,
quiz: [
{ q: "What does the principle of optimality say?",
o: ["The optimal cost is unique", "The remainder of an optimal path is optimal from where it starts", "The optimal control is always linear", "Any local optimum is global"],
a: 1, why: "A better tail could be substituted and would improve the whole, contradicting optimality of the original path." },
{ q: "What does the value function make possible?",
o: ["Solving the dynamics analytically", "Turning a global optimisation into a one-step decision at each state", "Removing the need for a model", "Guaranteeing robustness"],
a: 1, why: "The optimal action minimises immediate cost plus the value of the resulting state, so the global problem becomes local." },
{ q: "What is LQR in this framework?",
o: ["An approximation to dynamic programming", "The case where the value function is quadratic, giving the Riccati recursion", "A finite-horizon special case", "A learned value function"],
a: 1, why: "That structure is why the optimal controller comes out as simple constant state feedback despite the problem appearing hard." },
{ q: "Why is dynamic programming rarely used directly?",
o: ["It requires a linear model", "Computing the value function over a grid costs exponentially in the number of states", "It cannot handle constraints", "It gives only open-loop solutions"],
a: 1, why: "LQR exploits structure, MPC optimises online over a short horizon, and learning methods approximate the function, each avoiding the grid." }
],
interview: {
q: "What is the relationship between LQR, MPC and reinforcement learning?",
a: "They are all consequences of the same recursive structure, which is dynamic programming, and seeing that makes the differences between them much clearer. The starting point is the principle of optimality: if a trajectory is optimal, then the remainder of it from any point along the way is itself optimal from that point, because otherwise I could substitute a better tail and improve the whole. That licenses defining a value function, the best total cost achievable from each state onwards, which can be built backwards from the end. Once I have it, the optimal action at any state is a one-step decision, minimise the immediate cost plus the value of the state I land in, so a global optimisation over sequences becomes a local choice. LQR is the case where the dynamics are linear and the cost quadratic. The value function is then quadratic in the state, the backwards recursion becomes the Riccati equation, and the optimal policy comes out as constant state feedback, which is why a problem that looks like a search over infinite input sequences has such a simple answer. MPC is what I do when constraints mean I cannot get the value function in closed form. Instead of solving for all states in advance, I optimise over a finite horizon from the state I am actually in, apply only the first action, and repeat. The terminal cost in an MPC formulation is an approximation of the value beyond the horizon, which is exactly why choosing it well matters for closed-loop stability rather than being a detail. Reinforcement learning is the same recursion when I do not have the dynamics, learning the value function or the policy from experience instead of computing it from a model, and the Bellman equation at the centre of it is the same relation. The reason none of them is plain dynamic programming is the curse of dimensionality, because computing the value over a grid costs exponentially in the number of states, so each is a different way of avoiding that grid."
}
}

);
