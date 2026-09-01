// Electronics lessons, second course: analogue design in practice.
//
// These carry a `sub` so the page groups them under a heading, in the same way
// the Embedded C track is organised.

LESSONS.push(

{
id: "el-opamp-stability",
track: "Electronics",
sub: "Analogue design in practice",
title: "Op-amp stability: phase margin and capacitive loads",
mins: 22,
body: `
<p>An op-amp circuit is a feedback loop, and it obeys the same rules as any other. It goes
unstable when the loop gain reaches one at a frequency where the phase has already fallen
through 180 degrees. Everything about compensating an amplifier is about keeping those two
apart.</p>

<p>The loop gain is the amplifier's own open-loop gain multiplied by the fraction of the output
that comes back, which is the reciprocal of the noise gain. A unity-gain follower feeds all of
the output back, so it has the highest loop gain and the least margin. That is why a part
specified as stable at a gain of ten will ring or oscillate as a follower.</p>

<svg class="fig" viewBox="0 0 680 300" role="img" aria-label="Open-loop gain falling at 20 dB per decade crossing the noise gain, with a capacitive load adding a second pole and reducing phase margin">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">where the two curves meet is the loop crossover</text>

<line class="ln" x1="80" y1="90" x2="80" y2="250"/>
<line class="ln" x1="80" y1="250" x2="630" y2="250"/>
<text class="ts" x="34" y="96">gain</text>
<text class="ts" x="600" y="272">frequency</text>

<line class="ln" x1="80" y1="100" x2="420" y2="230"/>
<text class="ts" x="150" y="128">open-loop gain, minus 20 dB/decade</text>

<line class="ln" x1="80" y1="196" x2="630" y2="196"/>
<text class="ts" x="470" y="188">noise gain</text>

<circle class="dot" cx="337" cy="196" r="5"/>
<text class="th" x="300" y="180">crossover</text>

<line class="ln" x1="420" y1="230" x2="540" y2="250"/>
<text class="ts" x="404" y="284">a capacitive load bends the</text>
<text class="ts" x="404" y="300">response down a second time</text>
</svg>

<p>A capacitive load is the usual way a working circuit becomes an oscillator. The amplifier's
output impedance and the load capacitance form a pole <i>inside</i> the loop. That second pole
adds phase lag near crossover, the margin disappears, and the output rings on every edge or
breaks into a sustained oscillation of a few megahertz.</p>

<p>There are two standard cures. An <b>isolation resistor</b> of a few tens of ohms in series
with the output puts a zero back into the response and separates the amplifier from the load,
at the cost of a small voltage drop and some added output impedance. Or you use
<b>in-the-loop compensation</b>, taking the feedback from beyond the resistor at DC and from
the output at high frequency, which keeps the DC accuracy and still isolates the load.</p>

<p>The same reasoning explains the feedback capacitor on a transimpedance amplifier. The
photodiode capacitance and the feedback resistor form a pole in the loop, so a small capacitor
across the resistor adds a zero to cancel it. Its value trades bandwidth against peaking, and
it is the single most important component in the stage.</p>

<p>To check stability without a network analyser: apply a small square wave and look at the
overshoot. A few percent is comfortable, twenty percent is marginal, and visible ringing that
takes several cycles to decay means you are close to the edge and will fall off it over
temperature.</p>
`,
quiz: [
{ q: "Why does a unity-gain follower have less stability margin than a gain-of-ten stage?",
o: ["Its output swing is larger", "It feeds all the output back, so the loop gain is highest", "Its input impedance is lower", "It has more offset voltage to amplify"],
a: 1, why: "The loop gain is the open-loop gain times the feedback fraction, and a follower feeds back everything. That is why parts are specified as stable down to a minimum gain." },
{ q: "How does a capacitive load destabilise an op-amp?",
o: ["It shorts the output at high frequency", "It forms a pole with the output impedance, inside the loop", "It increases the amplifier's open-loop gain", "It couples the output back to the input"],
a: 1, why: "The extra pole adds phase lag near crossover and eats the margin. The result is ringing on every edge, or a sustained oscillation of a few megahertz." },
{ q: "What does a series isolation resistor at the output achieve?",
o: ["It limits the current into a short circuit", "It separates the load capacitance from the loop", "It reduces the amplifier's noise gain", "It compensates the input offset voltage"],
a: 1, why: "It adds a zero and decouples the amplifier from the capacitance, at the cost of a small drop and some added output impedance." },
{ q: "What does a few percent overshoot on a small square wave tell you?",
o: ["The amplifier is slewing rather than settling", "The phase margin is comfortable", "The load capacitance is too small", "The feedback resistor is too large"],
a: 1, why: "Overshoot is a direct proxy for damping. Twenty percent is marginal, and visible ringing means you will fall over the edge with temperature." }
],
interview: {
q: "An amplifier oscillates when you connect it to a long cable. What is happening and what would you do?",
a: "A long cable is a capacitive load, typically tens to hundreds of picofarads, and that capacitance forms a pole with the amplifier's open-loop output impedance. Crucially that pole is inside the feedback loop, so it adds phase lag near the crossover frequency, the phase margin disappears, and what was a stable circuit on the bench becomes an oscillator at a few megahertz once the cable is fitted. The first thing I would do is confirm it, by putting a scope on the output with a short ground and watching whether the oscillation frequency moves when I change the cable length, because that pins it to the load rather than to a supply or layout problem. The standard fix is a series isolation resistor at the output, a few tens of ohms, which separates the amplifier from the capacitance and puts a zero back into the response. It costs a small drop and some added output impedance, which may or may not matter. If the DC accuracy at the far end does matter, I would use in-the-loop compensation instead, taking the feedback from beyond the resistor at DC through a resistor and from the output at high frequency through a capacitor, so I keep the accuracy and still isolate the load. And I would check the amplifier's datasheet for a minimum stable gain, because if the stage is a follower it has the least margin of any configuration and may simply be the wrong part for the job."
}
},

{
id: "el-filters",
track: "Electronics",
sub: "Analogue design in practice",
title: "Realising an analogue filter, and what the topology costs",
mins: 20,
body: `
<p>Choosing a response, Butterworth or Chebyshev or Bessel, is the easy half. Realising it in
components is where the practical differences appear, because two topologies with identical
transfer functions can behave very differently once real parts are fitted.</p>

<svg class="fig" viewBox="0 0 680 260" role="img" aria-label="Sallen-Key and multiple feedback topologies compared on inversion, sensitivity and high-frequency behaviour">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">Sallen-Key</text>
<rect class="bx" x="24" y="72" width="308" height="164" rx="4"/>
<text class="ts" x="40" y="98">non-inverting</text>
<text class="ts" x="40" y="122">low component spread</text>
<text class="ts" x="40" y="146">easy to design by hand</text>
<text class="ts" x="40" y="176">but: feedthrough at high</text>
<text class="ts" x="40" y="196">frequency limits stopband</text>
<text class="ts" x="40" y="220">and Q is sensitive to the amp</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">Multiple feedback</text>
<rect class="bx" x="348" y="72" width="308" height="164" rx="4"/>
<text class="ts" x="364" y="98">inverting</text>
<text class="ts" x="364" y="122">better stopband rejection</text>
<text class="ts" x="364" y="146">lower Q sensitivity</text>
<text class="ts" x="364" y="176">but: wider component spread</text>
<text class="ts" x="364" y="196">and lower input impedance</text>
<text class="ts" x="364" y="220">needs a driving source</text>
</svg>

<p>The <b>Sallen-Key</b> topology is non-inverting and needs a modest spread of component
values, which makes it the usual first choice. Its weakness is at high frequency: as the
amplifier runs out of gain, signal feeds through the capacitors straight from input to output,
so the stopband stops improving and flattens out. If you need sixty decibels of rejection two
decades up, measure before you promise it.</p>

<p>The <b>multiple feedback</b> topology is inverting, rejects better in the stopband and is
less sensitive to the amplifier's own gain, at the cost of a wider spread of component values
and a low input impedance that needs driving from something stiff.</p>

<p>Whichever you choose, the <b>Q sensitivity</b> is what decides whether the filter you build
matches the filter you designed. A high-Q section amplifies component tolerance: a stage
designed for a Q of ten can easily come out at eight or thirteen with one percent parts, which
moves the passband ripple and the corner. Splitting a high-order filter into cascaded
second-order sections and giving the highest-Q section the tightest components is the practical
answer.</p>

<p>Two more things bite in real builds. Capacitor tolerance is usually far worse than resistor
tolerance, so C0G or film parts are worth the money in the frequency-determining positions,
and X7R is not. And the amplifier's own bandwidth must exceed the filter corner by a
comfortable margin, because a stage built from an amplifier running out of gain has a Q and a
corner that both drift with temperature.</p>
`,
quiz: [
{ q: "What limits a Sallen-Key filter's stopband at high frequency?",
o: ["The amplifier's slew rate", "Feedthrough through the capacitors as the amplifier loses gain", "The input impedance falling with frequency", "Saturation of the output stage"],
a: 1, why: "As the open-loop gain runs out, signal passes straight from input to output through the capacitors, so the stopband flattens rather than continuing to fall." },
{ q: "What is the main practical cost of the multiple feedback topology?",
o: ["It cannot realise a high-pass response", "A wider component spread and a low input impedance", "It inverts, so the phase is wrong", "Its Q is more sensitive to the amplifier"],
a: 1, why: "It needs to be driven from a stiff source, and the values are more spread out. In exchange the stopband and the Q sensitivity are both better." },
{ q: "Why does a high-Q section deserve tighter components?",
o: ["High-Q sections dissipate more power", "Q amplifies component tolerance into corner and ripple error", "Low-Q sections cannot be built accurately", "The amplifier needs more bandwidth at high Q"],
a: 1, why: "A stage designed for a Q of ten can come out at eight or thirteen with one percent parts. Splitting into second-order sections localises the sensitivity." },
{ q: "Why is X7R a poor choice in a frequency-determining position?",
o: ["Its capacitance is too small for filters", "Its tolerance and voltage coefficient move the corner", "It has too much series inductance", "It cannot be used above one kilohertz"],
a: 1, why: "Class II ceramics change value with bias, temperature and age. C0G or film parts hold the corner where you designed it." }
],
interview: {
q: "You need a fourth-order low-pass filter for an anti-alias front end. How would you approach it?",
a: "I would start from the specification rather than the topology: the corner, the required attenuation at the Nyquist frequency, and whether the passband needs to be flat in amplitude or flat in group delay, because that choice between Butterworth, Chebyshev and Bessel drives everything else. For an anti-alias filter ahead of a converter I usually want a sharp knee, so Butterworth or a mild Chebyshev, and I would check the attenuation actually needed at half the sample rate rather than assuming. Then I would realise it as two cascaded second-order sections rather than one fourth-order block, because that localises the component sensitivity and lets me give the higher-Q section the tighter parts. On topology, Sallen-Key is the easier hand design and has a sensible component spread, but I would check its stopband, because as the amplifier runs out of gain the signal feeds straight through the capacitors and the rejection flattens out, which matters a great deal in an anti-alias role. If I needed the deep stopband I would use multiple feedback instead and accept the lower input impedance and the wider component spread. On parts, I would use C0G or film in the frequency-determining positions, because X7R moves with bias and temperature and would walk the corner around, and I would pick an amplifier whose bandwidth comfortably exceeds the corner so the Q does not drift. Finally I would measure the built filter rather than trust the design, because the stopband in particular is where the simulation and the board disagree."
}
},

{
id: "el-references",
track: "Electronics",
sub: "Analogue design in practice",
title: "Voltage references: drift, noise and what actually limits you",
mins: 20,
body: `
<p>Every absolute measurement is a comparison against a reference, so the reference is the
ceiling on your accuracy. It is also the component people specify last and regret first.</p>

<p>There are three families in common use. A <b>bandgap</b> reference sums a voltage with a
negative temperature coefficient against one with a positive coefficient, and is cheap, low
power and available everywhere. A <b>buried zener</b> puts the junction below the surface where
it is quieter and more stable, at the cost of needing a higher supply and more current. A
<b>XFET</b> or similar sits between the two.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The error budget of a reference broken into initial accuracy, temperature drift, long-term drift, noise and thermal hysteresis">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">what a reference actually costs you</text>

<rect class="bx" x="24" y="72" width="200" height="70" rx="4"/>
<text class="th" x="40" y="98">initial accuracy</text>
<text class="ts" x="40" y="122">calibrate it out</text>

<rect class="bx" x="240" y="72" width="200" height="70" rx="4"/>
<text class="th" x="256" y="98">temperature drift</text>
<text class="ts" x="256" y="122">ppm per degree C</text>

<rect class="bx" x="456" y="72" width="200" height="70" rx="4"/>
<text class="th" x="472" y="98">long-term drift</text>
<text class="ts" x="472" y="122">ppm per root hour</text>

<rect class="bx" x="24" y="158" width="308" height="70" rx="4"/>
<text class="th" x="40" y="184">noise, 0.1 to 10 Hz</text>
<text class="ts" x="40" y="208">cannot be calibrated away</text>

<rect class="bx" x="348" y="158" width="308" height="70" rx="4"/>
<text class="th" x="364" y="184">thermal hysteresis</text>
<text class="ts" x="364" y="208">shifts after a temperature cycle</text>
</svg>

<p>Initial accuracy is the least interesting number, because a single calibration removes it.
What you cannot calibrate away is <b>drift</b> and <b>noise</b>. Temperature coefficient is
quoted in parts per million per degree, and over a forty degree swing a 25 ppm per degree part
gives you a thousand parts per million, which is ten bits of a sixteen-bit measurement gone.</p>

<p>Long-term drift is quoted in parts per million per root hour, because the ageing behaves as
a random walk rather than a steady ramp. That is why a thousand hours gives about thirty times
the one-hour figure, and why periodic recalibration beats extrapolation.</p>

<p>Low-frequency noise, usually specified from 0.1 to 10 Hz in microvolts peak to peak, is the
one that limits a slow, high-resolution measurement. Averaging does not remove it because it
lives below the frequencies you are averaging over.</p>

<p>Thermal hysteresis is the specification people miss: after a temperature excursion the
reference does not come back to exactly where it started. If your instrument is calibrated warm
and used cold, that shift is a systematic error no amount of averaging will touch.</p>

<p>Two layout points matter as much as the part. Keep the reference away from anything that
dissipates power, because a thermal gradient across the package is a drift you did not budget
for. And decouple it as the datasheet asks, because many references are only conditionally
stable and will oscillate into the wrong capacitance.</p>
`,
quiz: [
{ q: "Which reference specification can a single calibration remove?",
o: ["Temperature drift", "Initial accuracy", "Low-frequency noise", "Thermal hysteresis"],
a: 1, why: "Initial accuracy is a fixed offset at one temperature and is the least interesting number. Drift, noise and hysteresis all survive calibration." },
{ q: "Why is long-term drift quoted per root hour?",
o: ["The measurement is only valid for one hour", "The ageing behaves as a random walk, not a ramp", "It allows references of different voltages to be compared", "Drift is sampled hourly during the test"],
a: 1, why: "A thousand hours gives about thirty times the one-hour figure rather than a thousand times. That is why periodic recalibration beats extrapolating." },
{ q: "Why does averaging not remove a reference's 0.1 to 10 Hz noise?",
o: ["It is correlated with the signal", "It lies below the frequencies you average over", "It is a systematic rather than random error", "Averaging amplifies low-frequency noise"],
a: 1, why: "Averaging for longer moves you further into the low-frequency region rather than out of it, which is why that specification limits a slow, high-resolution measurement." },
{ q: "What is thermal hysteresis?",
o: ["Drift while the part is warming up", "The reference not returning to its original value after a temperature cycle", "The change in noise with temperature", "The delay between a temperature change and its effect"],
a: 1, why: "If the instrument is calibrated warm and used cold, that shift is a systematic error. It is the specification people most often miss." }
],
interview: {
q: "You need sixteen bits of absolute accuracy over the industrial temperature range. What limits you?",
a: "Almost certainly the reference rather than the converter. Sixteen bits is about fifteen parts per million, and if I am working over minus forty to plus eighty-five that is a hundred and twenty-five degrees of swing, so even a very good five parts per million per degree reference gives me six hundred parts per million of drift, which is forty times my budget. So the first thing I would establish is whether I actually need absolute accuracy over the whole range, or whether I can make the measurement ratiometric, because if the same reference excites the sensor and sets the converter's full scale then the reference cancels in the ratio and its drift almost stops mattering. That is by far the cheapest fix and it is why bridge measurements are done that way. If it genuinely has to be absolute, then I am looking at a buried zener reference, an oven or at least a known temperature measured alongside it so I can correct in software, and a calibration procedure over temperature rather than at one point. I would also budget for the specifications people forget: long-term drift, which is a random walk quoted per root hour so it needs periodic recalibration rather than extrapolation, and thermal hysteresis, which means the part does not return to where it started after a temperature excursion and is a systematic error that no amount of averaging removes. And I would keep the reference physically away from anything dissipating power, because a gradient across the package is drift I did not budget for."
}
},

{
id: "el-levelshift",
track: "Electronics",
sub: "Analogue design in practice",
title: "Level shifting between rails, and why a divider is not enough",
mins: 18,
body: `
<p>Two devices on different supplies have to exchange signals, and the naive answers each fail
in a way that is worth understanding.</p>

<p>Going <b>down</b>, from 5 V to 3.3 V, a resistor divider works for a slow signal and fails
for a fast one, because the divider's impedance and the input capacitance form a low-pass
filter. Two 10 kilohm resistors into 10 picofarads is a rise time of tens of nanoseconds, which
is fine for a button and useless for SPI.</p>

<svg class="fig" viewBox="0 0 680 280" role="img" aria-label="Four level shifting approaches compared by direction, speed and whether they are bidirectional">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">choosing a level shifter</text>

<rect class="bx" x="24" y="72" width="308" height="90" rx="4"/>
<text class="th" x="40" y="98">resistor divider</text>
<text class="ts" x="40" y="122">down only, slow signals only</text>
<text class="ts" x="40" y="144">RC with the input capacitance</text>

<rect class="bx" x="348" y="72" width="308" height="90" rx="4"/>
<text class="th" x="364" y="98">series resistor plus clamp</text>
<text class="ts" x="364" y="122">down only, relies on the clamp diode</text>
<text class="ts" x="364" y="144">limits injected current</text>

<rect class="bx" x="24" y="178" width="308" height="90" rx="4"/>
<text class="th" x="40" y="204">MOSFET plus two pull-ups</text>
<text class="ts" x="40" y="228">bidirectional, open-drain buses</text>
<text class="ts" x="40" y="250">the standard I2C answer</text>

<rect class="bx" x="348" y="178" width="308" height="90" rx="4"/>
<text class="th" x="364" y="204">dedicated translator IC</text>
<text class="ts" x="364" y="228">fast, push-pull, direction pin</text>
<text class="ts" x="364" y="250">or auto-sensing</text>
</svg>

<p>Going <b>up</b>, from 3.3 V to 5 V, you often need nothing at all: many 5 V parts accept
3.3 V as a logic high, and the datasheet's input high threshold tells you whether yours does.
Where it does not, a MOSFET or a translator is required, because a divider cannot raise a
voltage.</p>

<p>For an open-drain bus such as I2C the classic circuit is a single N-channel MOSFET with a
pull-up on each side. Pulling the low side down turns the device on through its body diode and
pulls the high side down too, and it works in both directions without a direction signal. It is
elegant, and it is limited by the pull-ups and the bus capacitance in exactly the way any
open-drain bus is.</p>

<p>The failure mode worth naming is what happens when one rail is off. A 5 V signal driven into
an unpowered 3.3 V part flows through the clamp diode into the 3.3 V rail, which can partly
power the device, hold it out of reset or exceed the diode's rating. If the two rails can ever
be sequenced independently, either use a translator with a specified powered-off behaviour or
put a series resistor in to bound that current.</p>
`,
quiz: [
{ q: "Why does a resistor divider fail as a level shifter for SPI?",
o: ["It cannot handle bidirectional signals", "Its impedance and the input capacitance form a low-pass filter", "It draws too much current from the driver", "It shifts the logic threshold as well as the level"],
a: 1, why: "Two 10 kilohm resistors into 10 picofarads gives tens of nanoseconds of rise time. Fine for a button, useless for a fast clocked bus." },
{ q: "Why can a divider not be used to shift a signal upward?",
o: ["The resistors would dissipate too much power", "A divider can only attenuate, never raise a voltage", "It would invert the logic sense", "The input impedance is too low"],
a: 1, why: "Often nothing is needed, because many 5 V parts accept 3.3 V as a logic high. Where they do not, a MOSFET or a translator is required." },
{ q: "What makes the single-MOSFET circuit suitable for I2C?",
o: ["It is faster than a dedicated translator", "It is bidirectional without needing a direction signal", "It removes the need for pull-up resistors", "It provides isolation between the two rails"],
a: 1, why: "Pulling either side low turns the device on and pulls the other side down. It is limited by the pull-ups and bus capacitance like any open-drain bus." },
{ q: "What happens when 5 V is driven into an unpowered 3.3 V input?",
o: ["The signal is simply clipped at 3.3 V", "Current flows through the clamp diode into the 3.3 V rail", "The input presents a high impedance and nothing happens", "The 3.3 V part is destroyed immediately"],
a: 1, why: "It can partly power the device or hold it out of reset, and may exceed the diode's rating. A series resistor bounds the current if the rails can be sequenced independently." }
],
interview: {
q: "How would you interface a 3.3 V microcontroller to a 5 V sensor?",
a: "I would take the two directions separately, because they are different problems. Going from the 3.3 V microcontroller up to the 5 V part, often nothing is needed at all: I would check the 5 V device's input high threshold in the datasheet, and if 3.3 V clears it then the connection is direct. Coming back down from 5 V into the 3.3 V input is the direction that needs attention. If it is a slow signal I might use a divider, but I would check the rise time against the input capacitance, because a couple of ten kilohm resistors into ten picofarads is tens of nanoseconds and that is fine for a button and useless for anything clocked. For a fast push-pull signal I would use a dedicated translator. If it is an open-drain bus like I2C, the single N-channel MOSFET with a pull-up on each side is the standard answer and works in both directions without a direction pin. The thing I would make sure to think about is what happens when one rail is off, because a 5 V output driven into an unpowered 3.3 V input pushes current through the clamp diode into the 3.3 V rail, which can partly power the device or hold it out of reset, and can exceed the diode's rating. If the two rails can ever be sequenced independently I would either pick a translator with a specified powered-off behaviour or put a series resistor in to bound that current."
}
},

{
id: "el-currentsense",
track: "Electronics",
sub: "Analogue design in practice",
title: "Current sensing: shunt placement, common mode and bandwidth",
mins: 20,
body: `
<p>Measuring current means turning it into a voltage and then measuring that. The choices are
where to put the sensing element, and what technology to use, and they trade against each
other in ways worth having straight before you commit a layout.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Low-side, high-side and in-line current sensing compared on common mode, ground integrity and what each can see">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">where the shunt goes</text>

<rect class="bx" x="24" y="72" width="200" height="140" rx="4"/>
<text class="th" x="40" y="98">low side</text>
<text class="ts" x="40" y="124">near ground potential</text>
<text class="ts" x="40" y="146">easy to amplify</text>
<text class="ts" x="40" y="176">but lifts the load's</text>
<text class="ts" x="40" y="196">ground reference</text>

<rect class="bx" x="240" y="72" width="200" height="140" rx="4"/>
<text class="th" x="256" y="98">high side</text>
<text class="ts" x="256" y="124">ground stays clean</text>
<text class="ts" x="256" y="146">sees a short to ground</text>
<text class="ts" x="256" y="176">but needs a high</text>
<text class="ts" x="256" y="196">common-mode amplifier</text>

<rect class="bx" x="456" y="72" width="200" height="140" rx="4"/>
<text class="th" x="472" y="98">in line with the phase</text>
<text class="ts" x="472" y="124">sees current continuously</text>
<text class="ts" x="472" y="146">in every PWM state</text>
<text class="ts" x="472" y="176">but the common mode</text>
<text class="ts" x="472" y="196">swings the whole rail</text>
</svg>

<p><b>Low-side</b> sensing puts the shunt between the load's return and ground. The amplifier
sees a small voltage near ground, which is easy, but the load's ground now sits a few tens of
millivolts above the system ground and moves with current. That matters if the load also
carries signals.</p>

<p><b>High-side</b> sensing puts the shunt in the supply. Ground stays intact and a short to
ground is visible, which is the safety-relevant case, but the amplifier must reject a common
mode at the supply rail while resolving millivolts on top of it. That is what a dedicated
current sense amplifier is for, and its common-mode rejection is the specification that
matters.</p>

<p><b>In-line</b> sensing, in a motor phase, sees the current continuously in every switching
state, which is what field-oriented control wants. The penalty is a common mode that slews the
whole bus voltage at every switching edge, so the amplifier needs both a high common-mode range
and a good rejection of fast transients.</p>

<p>The shunt itself is a design in miniature. Its value trades signal against dissipation and
against the voltage burden it inserts. It needs a four-wire Kelvin connection, because the
resistance of the tracks into it is comparable with the shunt itself. Its temperature
coefficient becomes a gain error, so a manganin or similar alloy is worth the money. And its
own inductance, a few nanohenries, produces a spike on every fast edge that has to be filtered
out or the reading is nonsense.</p>
`,
quiz: [
{ q: "What is the drawback of low-side current sensing?",
o: ["It cannot detect a short circuit to ground", "It lifts the load's ground reference above system ground", "It needs an amplifier with a high common-mode range", "It only works with direct current"],
a: 1, why: "The return now sits a few tens of millivolts up and moves with current, which matters if the load also carries signals. The amplification itself is the easy part." },
{ q: "What specification matters most for a high-side sense amplifier?",
o: ["Input bias current", "Common-mode rejection at the supply rail", "Slew rate", "Output impedance"],
a: 1, why: "It must resolve millivolts of differential while sitting at the supply rail, so its ability to reject that common mode is what sets the accuracy." },
{ q: "Why does in-line phase sensing suit field-oriented control?",
o: ["It sees current continuously in every switching state", "It needs no amplifier at all", "It has the lowest common-mode requirement", "It measures the supply current directly"],
a: 1, why: "Low-side sensing only sees current when the low device conducts, so it cannot supply a continuous measurement in all PWM states." },
{ q: "Why does a shunt need a four-wire Kelvin connection?",
o: ["To carry the current without overheating", "The track resistance is comparable with the shunt itself", "To reduce the shunt's inductance", "To provide isolation from the load"],
a: 1, why: "Current flows in one pair and voltage is sensed on another carrying essentially none, so the lead resistance drops out. It is what makes a milliohm shunt measurable." }
],
interview: {
q: "How would you measure motor phase current for a field-oriented drive?",
a: "The requirement that drives the choice is that field-oriented control needs the phase current continuously, so it can transform into the rotor frame every control cycle. Low-side shunts only see current when the low-side device is conducting, so in some PWM states there is nothing to measure, and although there are reconstruction schemes that work around that at moderate duty cycles they break down at the extremes. So for a serious drive I would use in-line sensing in the phase, with a current sense amplifier that has both a wide common-mode range and good rejection of fast transients, because the common mode slews the entire bus voltage at every switching edge. On the shunt itself, I would size it as a compromise between signal amplitude and dissipation, use a four-wire Kelvin connection because the track resistance into a milliohm shunt is comparable with the shunt, and choose a low temperature coefficient alloy because the tempco turns directly into a gain error as the board heats. The detail that catches people is the shunt's own inductance, only a few nanohenries but enough to produce a large spike on every fast edge, so the amplifier input needs a small filter and the sampling instant needs to be placed away from the switching edges, usually synchronised to the PWM timer. If the design allowed it I would consider a Hall-effect or fluxgate sensor instead, which gives isolation for free and removes the common-mode problem entirely, at the cost of offset drift and bandwidth."
}
},

{
id: "el-isolation",
track: "Electronics",
sub: "Analogue design in practice",
title: "Isolation: what it is for, and the three ways to get it",
mins: 20,
body: `
<p>Isolation means there is no conductive path between two parts of a circuit. It is used for
three quite different reasons, and knowing which one applies decides what you need.</p>

<p><b>Safety</b> isolation protects a person from a hazardous voltage, and it is governed by
standards that specify creepage and clearance distances and a tested withstand voltage.
<b>Functional</b> isolation breaks a ground loop or lets two circuits sit at different
potentials, with no safety claim. And isolation is used to <b>level shift across a large common
mode</b>, such as measuring a current at several hundred volts.</p>

<svg class="fig" viewBox="0 0 680 260" role="img" aria-label="Optical, magnetic and capacitive isolation compared on speed, ageing, power transfer and common-mode transient immunity">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">three isolation technologies</text>

<rect class="bx" x="24" y="72" width="200" height="160" rx="4"/>
<text class="th" x="40" y="98">optical</text>
<text class="ts" x="40" y="124">simple, well understood</text>
<text class="ts" x="40" y="148">slow, needs drive current</text>
<text class="ts" x="40" y="172">LED ages, so the</text>
<text class="ts" x="40" y="192">transfer ratio drifts</text>
<text class="ts" x="40" y="216">design for end of life</text>

<rect class="bx" x="240" y="72" width="200" height="160" rx="4"/>
<text class="th" x="256" y="98">magnetic</text>
<text class="ts" x="256" y="124">fast, no ageing</text>
<text class="ts" x="256" y="148">can carry power too</text>
<text class="ts" x="256" y="172">sensitive to external</text>
<text class="ts" x="256" y="192">magnetic fields</text>

<rect class="bx" x="456" y="72" width="200" height="160" rx="4"/>
<text class="th" x="472" y="98">capacitive</text>
<text class="ts" x="472" y="124">fast, small, low power</text>
<text class="ts" x="472" y="148">good transient immunity</text>
<text class="ts" x="472" y="172">cannot carry power</text>
<text class="ts" x="472" y="192">on its own</text>
</svg>

<p>An <b>optocoupler</b> is the traditional answer: an LED and a photodetector in one package.
It is simple and well understood, and its weaknesses are speed, the drive current the LED
needs, and ageing. The current transfer ratio falls over the life of the part, sometimes by
half, so the drive has to be designed for the end-of-life value rather than the initial one.</p>

<p><b>Magnetic</b> isolators use tiny on-chip transformers and are fast, do not age in the same
way, and can carry power as well as signal, which is why isolated supplies are often built the
same way. They are sensitive to external magnetic fields, which is a real consideration next to
a motor.</p>

<p><b>Capacitive</b> isolators send the signal across a small on-chip capacitor. They are fast,
small and efficient, and they generally have excellent common-mode transient immunity, which is
the specification that matters most in a switching environment.</p>

<p>That specification deserves naming: <b>CMTI</b>, common-mode transient immunity, in kilovolts
per microsecond. In a motor drive or a switching supply the two sides of the isolator slew
enormously relative to each other at every edge, and an isolator with insufficient CMTI does not
merely add noise, it produces spurious output transitions. It is the number that most often
decides the part.</p>
`,
quiz: [
{ q: "What is the practical weakness of an optocoupler?",
o: ["It cannot pass a DC level", "The LED ages, so the current transfer ratio falls", "It requires a separate isolated supply", "It is sensitive to external magnetic fields"],
a: 1, why: "The transfer ratio can fall by half over the life of the part, so the drive has to be designed for the end-of-life value rather than the initial one." },
{ q: "What can a magnetic isolator do that a capacitive one cannot?",
o: ["Reject external fields", "Carry power as well as signal", "Operate at higher speed", "Provide safety-rated isolation"],
a: 1, why: "On-chip transformers are how isolated supplies are built, so signal and power can share the technology. Capacitive isolators need a separate power path." },
{ q: "What does CMTI specify?",
o: ["The maximum isolation voltage the part withstands", "How fast the two sides may slew relative to each other", "The propagation delay through the isolator", "The creepage distance across the package"],
a: 1, why: "In kilovolts per microsecond. Insufficient CMTI in a switching environment produces spurious output transitions, not merely added noise." },
{ q: "What distinguishes safety isolation from functional isolation?",
o: ["Safety isolation is faster", "Safety isolation is governed by tested creepage, clearance and withstand voltage", "Functional isolation cannot pass DC", "Safety isolation requires an optocoupler"],
a: 1, why: "Functional isolation breaks a ground loop and makes no safety claim. Safety isolation protects a person and has to meet a standard and be tested." }
],
interview: {
q: "You need to send a signal from a high-voltage side to a low-voltage controller. How do you choose an isolator?",
a: "The first question is what the isolation is actually for, because safety isolation, functional isolation and simply crossing a large common mode have quite different requirements. If a person could contact the low-voltage side then it is a safety barrier, and that means a part rated to a standard with specified creepage and clearance and a tested withstand voltage, and it also constrains the board layout because I cannot route anything under the barrier. If it is functional, breaking a ground loop or crossing a few hundred volts of common mode, then I have much more freedom. After that the specification I would look at hardest is common-mode transient immunity, in kilovolts per microsecond, because on a switching high-voltage side the two halves of the isolator slew enormously relative to each other at every edge, and a part with insufficient CMTI produces spurious output transitions rather than merely adding noise. On technology, I would lean towards capacitive or magnetic digital isolators rather than an optocoupler for anything fast, because the optocoupler's LED ages and its current transfer ratio can halve over life, so the drive has to be designed for end of life and the speed is poor. Magnetic has the advantage that it can carry power as well as signal, so if I also need an isolated supply for the high-voltage side I can get both from the same technology. And I would check the propagation delay and its variation, because in a control loop the isolator's delay is inside the loop and eats phase margin."
}
}

);
