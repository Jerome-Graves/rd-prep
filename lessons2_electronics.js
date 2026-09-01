// Electronics track, second set. Same schema as data.js; appended to LESSONS.

LESSONS.push(

{
id: "el-mosfets",
track: "Electronics",
sub: "Power and drive",
title: "MOSFETs as switches and drivers",
mins: 30,
body: `
<p>A MOSFET switch is a charge-controlled device pretending to be voltage-controlled.
The gate looks like a capacitor (really a nonlinear network of Cgs and Cgd), and the
datasheet rolls it up as total gate charge Qg. To switch the transistor you must move
that charge, and how fast you can move it sets your switching speed, your switching
loss, and often whether the design works at all.</p>
<h3>Gate charge and switching loss</h3>
<p>Transition time is roughly t = Qg / Igate. A 3.3 V logic pin sourcing 20 mA into a
30 nC gate gives t = 30 nC / 20 mA = 1.5 us per edge. During that transition the FET
carries current with volts across it simultaneously, and the loss per edge is roughly
0.5 x V x I x t. Switching 24 V at 5 A with 1.5 us edges at 100 kHz PWM:</p>
<pre>P_sw = 0.5 x 24 x 5 x (1.5u + 1.5u) x 100k = 18 W   (dead FET)
With a 2 A gate driver: t = 15 ns, P_sw = 0.18 W     (fine)</pre>
<p>That factor of 100 is the whole argument for gate drivers. A logic pin can hold a
FET on or off; it cannot move 30 nC quickly, so anything beyond a few kHz of PWM into
a power FET wants a driver. The Miller plateau makes it worse: during the drain
voltage swing, Cgd injects current back into the gate and the gate voltage stalls
until the driver has supplied the Miller charge.</p>
<h3>Rds(on) and thermals</h3>
<p>Conduction loss is I squared times Rds(on). 5 A through 10 mOhm is 0.25 W. Now
check the thermal path, not just the number: a SOT-23 on minimal copper might be
250 C/W junction to ambient; a PowerPAK on a decent copper pour with thermal vias
might be 40 C/W. The same 0.25 W is a 62 C rise in one package and a 10 C rise in the
other. Remember Rds(on) roughly doubles from 25 C to 125 C, so hot FETs dissipate
more, which makes them hotter. Check convergence, not the cold datasheet value.</p>
<h3>High-side versus low-side</h3>
<ul>
<li><b>Low-side N-channel</b>: source at ground, gate driven relative to ground.
Simple, cheap, the default. Downside: the load is never truly disconnected from the
supply, and load-side shorts to chassis bypass your switch.</li>
<li><b>High-side P-channel</b>: pull the gate below the source to turn on. Easy drive,
but P-channel Rds(on) is roughly twice as bad for the same die, and gate protection is
needed above about 20 V rails.</li>
<li><b>High-side N-channel</b>: best conduction, but the gate must go above the supply
rail. That means a bootstrap circuit (needs continuous PWM to refresh) or a charge
pump (works at DC). Half-bridge driver ICs handle this for you.</li>
</ul>
<h3>The body diode</h3>
<p>Every discrete MOSFET has an intrinsic diode from source to drain. It conducts
whenever the channel is off and current wants to flow backwards, which is exactly what
happens during dead time in bridges and in synchronous rectifiers. It is a real diode:
around 0.7 to 1 V drop and, crucially, slow reverse recovery. In hard-switched bridges
the recovery charge of the opposing body diode appears as a current spike through the
FET that just turned on, adding loss and EMI. This is why dead time is minimised, why
some designs parallel a Schottky, and why the body diode is never a substitute for a
designed-in freewheel path at high frequency.</p>
<p>Interview framing: walk from the gate outwards. Charge, driver, losses split into
conduction and switching, thermal path, then topology (which side, how the gate gets
its voltage), then the parasitics (Miller, body diode) that bite when you go fast.</p>`,
quiz: [
{ q: "A 3.3 V GPIO drives a power MOSFET with Qg of 30 nC directly at 100 kHz PWM. The main problem is:",
o: ["The FET can never turn fully on", "Slow edges cause large switching losses", "The GPIO cannot hold the gate low", "Gate oxide damage from overvoltage"],
a: 1, why: "The pin can supply only tens of mA, so edges take microseconds; during each edge the FET sees volts and amps at once, dissipating heavily at PWM rates." },
{ q: "Why does high-side switching with an N-channel MOSFET need a bootstrap or charge pump?",
o: ["The gate must be driven above the supply rail", "N-channel parts have higher Rds(on)", "The body diode points the wrong way", "High-side FETs need negative gate drive"],
a: 0, why: "Turning on an N-FET needs Vgs of several volts; with the source sitting near the rail, the gate must go above the rail, which needs a bootstrap or charge pump." },
{ q: "Rds(on) is quoted as 10 mOhm at 25 C. At a junction temperature of 125 C you should expect roughly:",
o: ["10 mOhm, it is temperature independent", "5 mOhm", "20 mOhm", "100 mOhm"],
a: 2, why: "Rds(on) of silicon MOSFETs roughly doubles between 25 C and 125 C, so thermal design must use the hot value." },
{ q: "During dead time in a synchronous buck, current freewheels through:",
o: ["The gate driver", "The input capacitor", "The high-side channel", "The low-side body diode"],
a: 3, why: "With both channels off, inductor current forward-biases the low-side body diode; its drop and reverse recovery are why dead time is kept short." }
],
interview: {
q: "Your PWM-driven MOSFET is overheating even though the conduction loss calculation says it should be cool. Walk me through your thinking.",
a: "Conduction loss is only half the budget, so I would look at switching loss first. I would scope Vgs and Vds together and measure the actual edge times; if the gate is driven from a logic pin or through a large gate resistor, the transitions could be microseconds, and half V times I times transition time times frequency adds up fast. I would check for a Miller plateau that stalls mid-transition, and look at the body diode of the opposing device if it is a bridge, since reverse recovery dumps extra loss in at each turn-on. I would also verify the thermal path: junction-to-ambient on minimal copper can be five times worse than the datasheet curve assumes. Then either speed up the gate drive or lower the switching frequency."
}
},

{
id: "el-comparators",
track: "Electronics",
sub: "Analogue front ends",
title: "Comparators, hysteresis and thresholds",
mins: 25,
body: `
<p>A comparator answers one question: is A bigger than B? It looks like an op-amp on
the schematic symbol and behaves completely differently, and interviewers like the
distinction because it separates people who have built threshold circuits from people
who have only simulated them.</p>
<h3>Comparator versus op-amp</h3>
<p>An op-amp is designed to live in negative feedback with its inputs at the same
voltage. Used open-loop as a comparator it is slow to leave saturation (recovery can
be microseconds), its output swings are not logic levels, and some precision op-amps
have back-to-back protection diodes across the inputs that conduct when the inputs
separate by more than about 0.7 V. A comparator is designed for exactly that abuse:
fast propagation (nanoseconds to microseconds by grade), no compensation capacitor to
slow it down, inputs happy far apart, and a logic-compatible output. Conversely, never
put a comparator in negative feedback: without compensation it will oscillate.</p>
<h3>Chatter and hysteresis</h3>
<p>A real signal crossing a single threshold carries noise, so the output chatters:
dozens of edges as millivolts of noise recross the trip point. The fix is positive
feedback creating two thresholds, a Schmitt trigger. Rising input must exceed the
upper threshold; falling input must drop below the lower one. Design the hysteresis
band wider than the peak-to-peak noise at the input.</p>
<pre>Non-inverting Schmitt, comparator swinging 0 to 3.3 V:
Rf from output to IN+, Rin from signal to IN+, ref on IN-.
Hysteresis = Vswing x Rin / (Rin + Rf)
Want 100 mV of hysteresis from a 3.3 V swing:
Rin/(Rin+Rf) = 0.03, so Rf = 32 x Rin, e.g. 10k and 320k.</pre>
<p>With open-drain outputs the high level comes from the pull-up, so calculate the
thresholds with the pull-up network included: the feedback divider sees the pull-up
resistance in series on the high state, which skews the band if you ignore it.</p>
<h3>Open-drain outputs and level shifting</h3>
<p>Many comparators (the LM393 family being the classic) have open-drain or
open-collector outputs: the output can pull low and can only float high, needing an
external pull-up. This costs speed on the rising edge (RC of pull-up and load) but
buys two useful tricks. First, wired-OR: tie several open-drain outputs together with
one pull-up and you get a free logical AND of the OK states, any one comparator can
assert the line. Second, level shifting: the pull-up can go to a different rail than
the comparator supply, so a comparator running at 12 V can drive a 3.3 V logic input
directly by pulling up to 3.3 V.</p>
<h3>Window comparators</h3>
<p>Two comparators, one signal: the upper one checks signal below high limit, the
lower one checks signal above low limit. With open-drain outputs tied together, the
shared line is high only while the signal is inside the window. This is the standard
shape for supply supervision, over and under temperature flags, and go/no-go limits in
test equipment. Add hysteresis to both edges or the window boundaries chatter just
like a single threshold does.</p>
<p>Practical habits: put an RC on inputs watching slow noisy signals, respect the
input common-mode range (many cheap comparators exclude the top rail), and check the
output sink current if you hang an LED or optocoupler off an open-drain output.</p>`,
quiz: [
{ q: "Why does an op-amp make a poor comparator?",
o: ["Its input impedance is too low", "It cannot tolerate split supplies", "It recovers slowly from saturation and may have input clamp diodes", "Its offset voltage is too large"],
a: 2, why: "Op-amps are compensated for feedback and saturate hard, taking microseconds to recover; some also have anti-parallel input diodes that conduct when inputs separate." },
{ q: "A comparator output chatters as a slow signal crosses the threshold. The standard fix is:",
o: ["Positive feedback to create hysteresis", "A faster comparator", "Negative feedback to stabilise it", "A larger pull-up resistor"],
a: 0, why: "Positive feedback creates separate rising and falling thresholds; sized wider than the input noise, one clean edge results." },
{ q: "Two open-drain comparator outputs are tied together with a single pull-up. The line is high when:",
o: ["Either output is high", "The pull-up is disconnected", "Exactly one output is low", "Both comparators are releasing the line"],
a: 3, why: "Open-drain outputs can only pull low; the shared line floats high only when every device releases it, giving a wired AND of the release states." },
{ q: "A comparator powered from 12 V must drive a 3.3 V microcontroller input. The cleanest option is:",
o: ["A resistive divider on a push-pull output", "An open-drain output pulled up to 3.3 V", "A series zener diode", "Running the micro input 12 V tolerant"],
a: 1, why: "Open-drain outputs level-shift for free: the high level is set entirely by the pull-up rail, so pull up to 3.3 V." }
],
interview: {
q: "Design me a low-battery warning for a 1S lithium cell that trips at 3.3 V without flickering as the battery sags under load.",
a: "I would use a micropower comparator with an internal reference, or a reference plus an LM393 class part, dividing the cell voltage down to compare against the reference. The flicker question is the heart of it: load transients sag the cell repeatedly through any single threshold, so I would add hysteresis of at least the expected sag, say 100 to 150 mV referred to the cell, using positive feedback around the comparator. I would also add an RC of a few hundred milliseconds on the sense divider so brief motor or radio bursts do not trip it. Open-drain output pulled to the logic rail drives the flag. I would confirm the divider current is small enough not to matter for standby drain."
}
},

{
id: "el-precision",
track: "Electronics",
sub: "Analogue front ends",
title: "Precision analogue design",
mins: 30,
body: `
<p>Precision is a budget, not a component choice. The interview question behind every
precision question is: can you enumerate the error sources, put numbers on them, and
say which one dominates? The parts are rarely the limit any more; the board usually
is.</p>
<h3>The amplifier error terms</h3>
<ul>
<li><b>Offset voltage Vos</b>: the amp adds a small DC error at its input, from
microvolts (choppers) to millivolts (jellybeans). It is multiplied by the noise gain
along with your signal.</li>
<li><b>Offset drift</b>: Vos changes with temperature, quoted in uV/C. A 2 uV/C amp
across a 40 C swing moves 80 uV. Calibration at one temperature does not remove
drift.</li>
<li><b>Input bias current Ib</b>: the inputs draw current, and it turns into voltage
across your source impedance. 1 nA through a 1 MOhm sensor is 1 mV, which may dwarf
the offset spec you paid for. CMOS inputs give pA at room temperature but bias current
roughly doubles every 10 C, so check the 85 C column.</li>
</ul>
<h3>Chopper (auto-zero) amplifiers</h3>
<p>A chopper amp continuously measures its own offset and subtracts it: the input is
modulated to a carrier frequency, amplified, and demodulated, so the DC offset and the
1/f noise of the amplifier never make it to the output. Result: sub-5 uV offsets and
drift in the tens of nV/C, with flat noise down to DC. Costs: chopping artefacts
(ripple and glitches at the chop frequency and its harmonics), higher current noise,
and limited bandwidth. They are the default for thermocouples, strain bridges, and
current shunts at DC; keep them away from signals near the chopping frequency.</p>
<h3>Where precision actually dies: the board</h3>
<ul>
<li><b>Leakage paths</b>: flux residue, fingerprints, and humidity make gigaohm
surface resistances. 5 V across 10 GOhm of dirty soldermask is 500 pA, poisoning a
femtoamp input. Clean the board, then guard: surround the sensitive node with a driven
copper ring at the same potential, so no voltage difference exists to drive leakage.</li>
<li><b>Thermocouple junctions</b>: every junction of dissimilar metals (solder joint,
connector, relay contact) is a thermocouple at tens of uV/C. A temperature gradient of
1 C across an input pair generates tens of microvolts, which is an entire error budget.
Keep input pairs together, symmetric, and away from heat sources; orient them along
isotherms, not across them.</li>
<li><b>Resistor tolerance and tempco</b>: a gain set by two 100 ppm/C resistors can
drift 200 ppm/C worst case; across 40 C that is 0.8 percent, which buries a 16-bit
system. Ratios matter more than absolutes: a matched network drifts together, so the
ratio holds even when the values move. Thin film at 25 ppm/C or a matched divider
network is the standard answer.</li>
<li><b>Self-heating</b>: a 0402 resistor dissipating 50 mW rises tens of degrees, and
its tempco converts that to a signal-dependent gain error. Size power ratings for
tempco, not just survival.</li>
</ul>
<h3>The budget discipline</h3>
<p>Write every term in the same units at the same node, usually microvolts referred to
input: offset, drift over the temperature range, bias current times source impedance,
resistor ratio drift times signal, thermocouple estimates, noise integrated over the
bandwidth. Sum worst case or root-sum-square by policy, then compare against the LSB
you claim. The exercise routinely shows the amplifier is fine and two resistors and a
connector are the real problem, which is exactly the insight interviewers are probing
for.</p>`,
quiz: [
{ q: "An amplifier with 1 nA input bias current measures a sensor with 1 MOhm source impedance. The resulting input error is about:",
o: ["1 uV", "1 mV", "1 nV", "Zero, bias current cancels"],
a: 1, why: "Bias current flows through the source impedance: 1 nA times 1 MOhm equals 1 mV, often far larger than the offset voltage spec." },
{ q: "The main mechanism a chopper amplifier uses to achieve microvolt offsets is:",
o: ["Laser-trimmed input stages", "Higher open-loop gain", "Cooling the input pair", "Continuously measuring and subtracting its own offset via modulation"],
a: 3, why: "Chopping modulates the signal past the amplifier offset and demodulates after, removing DC offset and 1/f noise; trimming alone cannot remove drift." },
{ q: "A guard ring around a high-impedance node works because:",
o: ["It is driven to the same potential, so no voltage exists to drive leakage", "It shields against magnetic fields", "It adds capacitance that filters noise", "It collects leakage and sends it to ground"],
a: 0, why: "Leakage needs a potential difference; a driven guard at the node potential means surrounding leakage paths carry no current into the node." },
{ q: "A gain stage uses two ordinary 100 ppm/C resistors. Over a 40 C rise the worst-case gain drift is roughly:",
o: ["0.0008 percent", "0.008 percent", "0.8 percent", "8 percent"],
a: 2, why: "Tempcos can oppose: 200 ppm/C combined times 40 C is 8000 ppm, or 0.8 percent. Matched networks drift together and hold the ratio." }
],
interview: {
q: "Your precision measurement is stable on the bench but drifts when the enclosure lid goes on. What do you investigate?",
a: "The lid changes the thermal environment, so my first suspects are thermal. I would look for temperature gradients across the input signal pair: solder joints and connectors are thermocouples at tens of microvolts per degree, and closing the lid redirects airflow from warm components across them. I would log the drift against internal temperature to see if it tracks. Next I would consider self-heating settling to a new equilibrium, shifting resistor ratios through tempco. If the drift is erratic rather than smooth, I would suspect humidity and leakage building up in the sealed volume across high-impedance nodes, and check board cleanliness and guarding. The fix is usually layout symmetry and thermal placement, not a better amplifier."
}
},

{
id: "el-emc",
track: "Electronics",
sub: "Board level",
title: "EMC and EMI: pass first time",
mins: 30,
body: `
<p>EMC failures are geometry failures. The circuit theory says nothing is wrong; the
fields disagree. The engineer who passes first time is the one who can see the current
loops and the unintended antennas before the board is made, because fixing them in the
chamber costs a respin and six weeks.</p>
<h3>Two paths out of the box</h3>
<ul>
<li><b>Conducted emissions</b> leave along cables, measured typically from 150 kHz to
30 MHz across a LISN on the power leads. Sources: switching converter ripple, and
common-mode currents pushed onto the leads by dV/dt across parasitic capacitance.</li>
<li><b>Radiated emissions</b> leave through the air, typically 30 MHz to 1 GHz and up.
Below a few hundred MHz the radiator is almost never your PCB trace: it is a cable
being driven as an antenna by common-mode voltage. Above that, board-level loops and
slots start to radiate directly.</li>
</ul>
<h3>Loop area is the villain</h3>
<p>A current loop radiates in proportion to its area, the current, and frequency
squared. That frequency-squared term is why the 100th harmonic of your clock matters
more than the fundamental, and why edge rate matters more than clock rate. The design
consequence: every fast current must have a return path directly alongside it. A
solid ground plane under a trace gives a loop a few hundred microns tall; a trace
crossing a plane split forces the return current on a detour and can multiply the
loop area a hundredfold. The switching loop of a converter (input cap, FET, diode)
deserves the tightest layout on the board, components literally adjacent.</p>
<h3>Slew control: the cheapest filter</h3>
<p>Energy in a trapezoidal edge falls off faster above the knee frequency
f = 1 / (pi x rise time). A 1 ns edge puts significant energy past 300 MHz; slow it to
10 ns and that knee drops to 32 MHz. So: gate resistors on FETs, series termination
resistors on clock and strobe lines, drive-strength settings on MCU pins turned down
to the minimum that meets timing. Never ship an edge faster than the function needs.</p>
<h3>Filter at the boundaries</h3>
<p>Think of the enclosure as a fortress: everything crossing the wall gets searched.
Power entry gets a common-mode choke plus X and Y capacitors. Signal connectors get a
ferrite or a pi filter per line, placed at the connector, not centimetres inboard,
because a filter after the noise has coupled to the chassis does nothing. Y-capacitors
and ferrites work against common mode; differential filters against ripple. Know which
mode you are fighting: clamp a current probe around the whole cable, and if you see
signal, it is common mode.</p>
<h3>Cable strategy</h3>
<p>Cables are the biggest antennas in the product, resonant at practical frequencies
(a 1 m cable is a quarter-wave antenna at 75 MHz). Strategy: bring all cables into one
edge or face of the board so they share a quiet reference; give shields a 360 degree
termination to chassis at entry (a pigtail is an inductor that ruins the shield above
a few MHz); and reduce the common-mode voltage between board ground and chassis with
stitching or capacitors, because that voltage is what drives the cable.</p>
<h3>Pre-compliance mindset</h3>
<p>Do not discover problems in the chamber. A near-field probe set and a spectrum
analyser on the bench will show you which loop, which cable, and which harmonic days
before formal testing, for the cost of an afternoon. Rank the peaks, fix the top one,
re-measure. Design margin target: 6 dB below the limit at pre-compliance, because the
chamber, the cable dressing, and unit-to-unit spread will eat some of it.</p>`,
quiz: [
{ q: "Below a few hundred MHz, the dominant radiator in most products is:",
o: ["The crystal itself", "The PCB power plane", "Cables driven by common-mode voltage", "The tallest component on the board"],
a: 2, why: "Board structures are electrically small at these frequencies; cables are long enough to be efficient antennas, and common-mode voltage between ground and chassis drives them." },
{ q: "Slowing a digital edge from 1 ns to 10 ns helps emissions mainly because:",
o: ["It reduces the fundamental clock amplitude", "It lowers the knee frequency above which harmonic energy rolls off", "It reduces conducted ripple at 150 kHz", "It reduces the loop area"],
a: 1, why: "The spectral knee sits at about 1 over pi times rise time; a 10x slower edge moves the roll-off down a decade, gutting the VHF harmonics." },
{ q: "A shielded cable is terminated to chassis with a 5 cm pigtail. Above a few MHz this:",
o: ["Improves the shield by adding inductance", "Only matters for conducted emissions", "Is equivalent to a 360 degree bond", "Largely defeats the shield because the pigtail is inductive"],
a: 3, why: "A pigtail is a few tens of nH; its impedance rises with frequency, so shield current develops voltage across it and re-radiates. Use a 360 degree gland or clamp." },
{ q: "The single highest-priority layout region for EMC in a switching converter is:",
o: ["The hot switching loop of input cap, switch and rectifier", "The feedback divider", "The output connector", "The enable pin routing"],
a: 0, why: "The switching loop carries discontinuous fast current; its area sets both radiated harmonics and the ringing that pollutes everything else. Make it tiny." }
],
interview: {
q: "Your product fails radiated emissions at 160 MHz. How do you attack it?",
a: "160 MHz is almost certainly a cable resonance driven by common mode, not a trace radiating directly, so I start there. In the chamber or on the bench I would clamp a current probe around each cable to find which one carries the offending current, and confirm by removing or ferriting cables one at a time. Then I trace the source: 160 MHz is likely a harmonic of a clock or a converter edge ringing, so near-field probing on the board finds the loop. Fixes in order of cheapness: slow the edge at the source, shrink or shield the loop, reduce ground-to-chassis common-mode voltage with stitching or capacitors, and finally a common-mode choke or ferrite at the cable entry. Then re-scan the whole band, because fixes move energy around."
}
},

{
id: "el-protection",
track: "Electronics",
sub: "Board level",
title: "Protection circuits",
mins: 25,
body: `
<p>Protection design is thinking like the abuse, not like the schematic. The
connector will be plugged in live, backwards, after the user shuffled across a carpet,
into a supply with 40 V of ringing on it. The interview version: for each threat, name
the component, where it goes, and what it costs you.</p>
<h3>ESD and TVS diodes</h3>
<p>Human-body-model ESD is kilovolts at amps for nanoseconds. The defence is a TVS
diode: a zener built for pulses, placed at the connector so the strike is clamped
before it travels inboard. Selection: working voltage above the signal maximum (so it
is invisible in operation), clamping voltage below what the protected pin survives,
and check the capacitance, because a 300 pF TVS kills a USB data line while a 0.5 pF
part does not. Layout matters as much as the part: the clamp path to ground must be
short and wide, since 10 nH of trace at 10 A per ns adds 100 V to the clamp.</p>
<h3>Reverse polarity: four options, one table</h3>
<ul>
<li><b>Series diode</b>: bulletproof, but drops 0.7 V and burns I x 0.7 W. Fine at
50 mA, ugly at 5 A.</li>
<li><b>Series Schottky</b>: drop around 0.3 V, some reverse leakage when hot.</li>
<li><b>P-FET ideal diode</b>: FET in the positive rail, gate to ground; correct
polarity enhances it and you lose only I x Rds(on), maybe 10 mV. Reverse polarity
keeps it off. Add a gate zener above 12 V rails. The default for battery kit.</li>
<li><b>Fuse plus reverse shunt diode</b>: reverse connection conducts hard and blows
the fuse. Crude, needs a fuse replaced, but costs nothing in the forward path.</li>
</ul>
<h3>Inrush limiting</h3>
<p>A discharged bulk capacitor is a momentary short. Hot-plugging 470 uF onto 24 V
through 50 mOhm of loop resistance draws a 480 A peak in theory; reality is connector
sparking, drooped rails and eventual pitted contacts. Options: an NTC thermistor
(cheap, but stays warm and gives no protection on a quick re-plug while hot), or a
soft-start FET whose gate rises through an RC so the capacitor charges at a controlled
few amps. eFuses integrate this with a programmable current limit.</p>
<h3>Overcurrent: fuse, PTC, eFuse</h3>
<ul>
<li><b>Fuse</b>: cheap, ultimate backstop, slow (a 2x overload can take seconds), and
single-use. Always fit one even when smarter protection sits behind it, because it is
the fire-safety layer.</li>
<li><b>PTC polyfuse</b>: resettable, slow to trip, holds a few hundred mA of leakage
while tripped, and its resistance varies with temperature. Fine for USB port class
faults.</li>
<li><b>eFuse IC</b>: precise programmable limit, microsecond response, adds soft
start, OVP and reverse blocking in some parts. Costs a control pin count and money,
buys observability and fast, accurate limits.</li>
</ul>
<h3>Input clamping and hot-plug thinking</h3>
<p>For signal pins, a series resistor plus clamp diodes to the rails handles most
overvoltage: the resistor turns a fault voltage into a small current the clamps can
swallow, and the resistor value is a trade against bandwidth and noise. Check where
the clamped current goes: diodes into a rail can pump the rail up if the load is
light, so a zener or shunt regulator may be needed on the rail itself. Hot-plug
thinking extends this: assume every connector mates live, ask which pin makes contact
first (staggered pin lengths exist for this), what the voltage transient does to each
pin, and whether ground can ever arrive last. The failures you prevent never appear
in a demo; they appear in year two of field service.</p>`,
quiz: [
{ q: "The best reverse-polarity protection for a 3 A battery-powered instrument that must waste minimal voltage is:",
o: ["A series silicon diode", "A series PTC", "A P-FET ideal-diode circuit in the positive rail", "A shunt zener"],
a: 2, why: "The P-FET drops only I times Rds(on), a few millivolts, and blocks reverse connection completely; a series diode wastes 0.7 V and 2 W at 3 A." },
{ q: "A TVS diode protecting a connector pin clamps poorly in testing despite a good datasheet spec. The most likely cause is:",
o: ["Inductance in the layout path to ground", "The TVS is too physically large", "The working voltage is too low", "TVS diodes only work for negative strikes"],
a: 0, why: "Nanosecond ESD edges across even 10 nH of trace add tens of volts to the clamp; the TVS must sit at the connector with a short, wide ground return." },
{ q: "Compared with a PTC polyfuse, an eFuse mainly buys you:",
o: ["Lower cost", "Higher voltage rating", "No standby current", "A precise, fast, programmable current limit with soft start"],
a: 3, why: "PTCs are slow, imprecise and temperature dependent; eFuses limit within microseconds at a set threshold and often add soft start, OVP and telemetry." },
{ q: "Hot-plugging a large discharged bulk capacitor onto a live 24 V rail primarily causes:",
o: ["Reverse polarity at the capacitor", "A large inrush current spike, sparking and rail droop", "Excess ESD on the data lines", "The capacitor to charge too slowly"],
a: 1, why: "A discharged capacitor is a momentary short; inrush is limited only by loop resistance, so contacts spark and upstream rails droop unless inrush limiting is fitted." }
],
interview: {
q: "You are designing the power input for a 12 V field instrument that users will connect to vehicle batteries. What protection do you include and why?",
a: "Vehicle power is hostile: reverse jumps, load dump transients, and live plugging. I would start with a fuse as the fire backstop, then a P-FET ideal diode for reverse polarity, since a series diode wastes too much at load current. For transients I would fit a TVS sized for load dump, clamping below the downstream converter's absolute maximum, with a wide, short ground path. Inrush needs handling because there will be bulk capacitance: a soft-start FET or an eFuse, which conveniently combines the current limit, soft start and often reverse blocking in one part. I would validate with a proper transient generator against ISO 7637 pulses rather than assuming, and check behaviour on slow brown-outs, which trip naive undervoltage logic into oscillation."
}
},

{
id: "el-clocks",
track: "Electronics",
sub: "Digital and interfacing",
title: "Crystals, oscillators and timing",
mins: 25,
body: `
<p>Timing is the quiet subsystem that fails in the field instead of on the bench. A
crystal that starts 999 times in a thousand at 25 C is a crystal that strands units in
a cold warehouse. Interviewers probe this area to find out whether you have shipped
something with a clock in it.</p>
<h3>Load capacitance: the number everyone gets wrong</h3>
<p>A parallel-mode crystal is specified at a load capacitance CL, and it oscillates at
its marked frequency only when the circuit presents exactly that. The two external
capacitors are in series with each other as seen by the crystal, plus stray:</p>
<pre>CL = (C1 x C2) / (C1 + C2) + Cstray
Crystal wants CL = 12.5 pF, board stray about 3 pF:
need series pair = 9.5 pF, so C1 = C2 = 19 pF (fit 18 pF)</pre>
<p>Fitting 22 pF because the last board used 22 pF pulls the frequency; each pF of
error moves a typical crystal by several ppm. Trim by measurement, but never put a
scope probe on the crystal pin directly: 10 pF of probe detunes it and can stop it.
Probe a buffered clock output, or measure a divided clock from a timer pin.</p>
<h3>Startup failures</h3>
<p>Oscillation grows from noise only if the amplifier supplies more loss than the
circuit has: negative resistance margin. The rule of thumb is the oscillator should
show at least 5x the crystal's maximum ESR as negative resistance; verify by inserting
resistance in series with the crystal and confirming it still starts at temperature
extremes. Failure modes: load caps too large (kills margin), a high-ESR crystal
variant substituted by purchasing, too little amplifier gain at low supply voltage,
and overdrive, since exceeding the crystal drive level rating ages it and shifts
frequency. Cold is the worst case: gain drops, ESR rises.</p>
<h3>Jitter versus stability: different customers</h3>
<ul>
<li><b>Stability</b> is long-term average frequency error, in ppm: initial tolerance,
tempco over the range, and ageing per year. It matters for timekeeping, baud rates
and RF channels.</li>
<li><b>Jitter</b> (phase noise) is cycle-to-cycle wobble. It matters to ADC sampling
(aperture jitter smears SNR at high input frequencies), serial links and PLLs. A
clock can be superb at one and poor at the other; a cheap RC oscillator has terrible
stability and a spread-spectrum clock has deliberately awful spectral purity.</li>
</ul>
<h3>PPM budgets, worked</h3>
<p>1 ppm is 0.0864 seconds per day. A watch crystal at 20 ppm drifts 1.7 s/day, nearly
a minute a month, which is why unsynchronised RTCs annoy users. A UART needs the two
ends within about 2 percent total, so any crystal works; a 32.768 kHz RTC keeping
event logs honest needs the full budget: initial plus tempco plus ageing. The 32 kHz
tuning-fork crystal has a parabolic tempco, roughly -0.034 ppm/C squared from 25 C, so
at 0 C it is already about -21 ppm regardless of initial trim.</p>
<h3>When to spend on a TCXO</h3>
<p>Cross the ppm budget against temperature range. A good crystal achieves maybe
10 to 30 ppm over industrial range; if the budget is under about 5 ppm (GPS-disciplined
holdover, RF channel spacing, long-unsynced logging), a TCXO delivers 0.5 to 2 ppm by
compensating the tempco electronically, for a pound or two and a few mA. Beyond that,
OCXOs oven the crystal for parts-per-billion at watts of heater power. Buy exactly the
stability the system needs and no more.</p>`,
quiz: [
{ q: "A crystal specifies CL of 12.5 pF and the board contributes 3 pF of stray. The two equal load capacitors should each be about:",
o: ["19 pF", "25 pF", "12.5 pF", "9.5 pF"],
a: 0, why: "The pair in series must give 12.5 minus 3, so 9.5 pF; equal capacitors in series halve, so each is 19 pF (18 pF fitted)." },
{ q: "Probing a crystal pin directly with a standard 10 pF scope probe typically:",
o: ["Has no effect if the probe is 10x", "Detunes or stops the oscillator", "Improves startup margin", "Only affects the amplitude"],
a: 1, why: "The probe capacitance is comparable to the load capacitance, so it shifts frequency and can kill the oscillation; observe a buffered output instead." },
{ q: "An RTC crystal rated 20 ppm gains or loses per day up to about:",
o: ["0.17 seconds", "17 seconds", "0.017 seconds", "1.7 seconds"],
a: 3, why: "1 ppm equals 0.0864 s/day, so 20 ppm is about 1.7 s/day, close to a minute per month." },
{ q: "The strongest reason to specify a TCXO over a plain crystal is:",
o: ["Lower phase noise at all offsets", "Faster startup", "Holding a few ppm or better across the full temperature range", "Lower supply current"],
a: 2, why: "A TCXO electronically compensates the crystal tempco, achieving 0.5 to 2 ppm over temperature where a bare crystal manages 10 to 30 ppm." }
],
interview: {
q: "Units in cold storage occasionally fail to boot, and you suspect the crystal. How do you confirm and fix it?",
a: "First I would confirm the hypothesis: put failing units in a thermal chamber, cold-soak, and check whether the oscillator runs, watching a buffered clock or a divided output rather than probing the crystal pin, which detunes it. If it is startup, I would measure negative resistance margin by adding series resistance to the crystal and finding where startup fails across temperature; the target is around five times maximum ESR. Cold is worst because amplifier gain falls and crystal ESR rises. Fixes: reduce load capacitance toward the correct CL if it was over-fitted, specify a lower-ESR crystal, or enable a higher oscillator drive setting if the MCU offers one, checking drive level against the crystal rating. Then I would audit purchasing substitutions, which cause most of these regressions."
}
},

{
id: "el-motor-drive",
track: "Electronics",
sub: "Power and drive",
title: "Motor drive electronics",
mins: 30,
body: `
<p>Motor drive is power electronics with the inductor fighting back. The motor is an
inductive load with a generator inside it, so current keeps flowing when you switch,
energy comes back when you brake, and every mistake is announced with smoke. The
interview themes: bridge operation, where the current goes in every state, and how you
measure it.</p>
<h3>H-bridge basics and shoot-through</h3>
<p>Four switches let you drive a brushed motor in either direction: high-side A with
low-side B for one polarity, the mirror pair for the other. The cardinal sin is
shoot-through: both switches in one leg on together, shorting the bus through two
Rds(on). It happens dynamically, not just from bad logic: turn one FET off and its
partner on too quickly and the first has not finished turning off; or a fast dV/dt on
the switching node couples through Cgd and lifts the off FET's gate (Miller turn-on).
Defences: dead time between complementary switches (tens to hundreds of ns), strong
gate pull-down paths, and sometimes negative gate drive. Too much dead time costs
distortion and pushes current through body diodes, so it is a tuned quantity.</p>
<h3>PWM strategies</h3>
<ul>
<li><b>Sign-magnitude</b>: PWM one leg, hold the other; low switching loss, but the
current decays slowly during off time (slow decay) and control near zero speed is
lumpy.</li>
<li><b>Locked antiphase</b>: both legs switch every cycle; 50 percent duty is zero
mean voltage. Linear control through zero, at the price of ripple current and
switching loss even at standstill.</li>
<li><b>Mixed decay</b>: alternate fast and slow decay within a cycle; this is what
good stepper drivers do to track falling current commands accurately.</li>
</ul>
<h3>Current sensing: where the shunt goes</h3>
<ul>
<li><b>Low-side shunt</b>: cheap, ground-referenced amplifier. Blind whenever the
low-side FET is off, so current must be sampled in the right PWM state, synchronised
to the modulator.</li>
<li><b>High-side shunt</b>: sees load and fault current continuously, including a
short to ground, but needs an amplifier that rejects the full bus as common mode.</li>
<li><b>Inline (in the motor phase)</b>: the truth, always valid regardless of PWM
state; needs an amplifier that survives the switching common mode. Standard for FOC
of brushless machines.</li>
</ul>
<h3>Regeneration and bus pumping</h3>
<p>Brake a spinning motor and it becomes a generator pushing current back into the
bus. A bench supply cannot absorb it, so the bus voltage climbs, sometimes past the
FET and capacitor ratings. Budget it: the kinetic energy half J omega squared lands in
the bus capacitance, and delta V follows from half C V squared. Fixes: enough bulk
capacitance, a brake chopper (resistor switched in above a threshold), or ideally a
battery that happily eats the charge.</p>
<h3>Flyback paths</h3>
<p>Every inductive current needs somewhere to go at switch-off. In a bridge the body
diodes provide it, but check they are rated for it, and remember the recovery hit at
the next turn-on. For relays and solenoids driven by a single low-side switch, the
classic flyback diode across the coil works but slows release; a zener in series with
the diode speeds it up by letting the coil voltage swing further negative.</p>
<h3>Stepper drivers</h3>
<p>A stepper is two phases driven with controlled current, not voltage: the driver
chops each winding against a sense resistor to hold a current target, which is why a
2.8 V motor runs from a 24 V bus, and higher bus voltage buys faster current rise and
more speed. Microstepping interpolates between full steps by setting sinusoidal
current ratios in the two phases: smoother motion and less resonance, but the
incremental torque per microstep shrinks, so 256 microsteps is resolution, not
accuracy. Mind mid-band resonance and the decay-mode settings, which is where most
real-world tuning time goes.</p>`,
quiz: [
{ q: "Shoot-through in an H-bridge leg means:",
o: ["The motor current reverses suddenly", "Both switches in one leg conduct at once, shorting the bus", "The body diode conducts during dead time", "PWM frequency exceeds the gate driver rating"],
a: 1, why: "If high and low switches of the same leg overlap, the bus is shorted through them; dead time and Miller turn-on immunity prevent it." },
{ q: "The main limitation of a low-side shunt for motor current measurement is:",
o: ["It cannot measure current at all during PWM", "It requires an isolated amplifier", "It only sees current in certain PWM states, so sampling must be synchronised", "It dissipates more power than an inline shunt"],
a: 2, why: "When the low-side switch is off, load current bypasses the shunt; the ADC must sample in the window where the current actually flows through it." },
{ q: "Decelerating a high-inertia load with a bridge fed from a bench supply causes the bus voltage to rise because:",
o: ["The supply increases its output during braking", "Dead time lengthens at low speed", "The PWM duty exceeds 100 percent", "The motor regenerates energy the supply cannot absorb"],
a: 3, why: "A braking motor is a generator; a one-quadrant supply cannot sink current, so the energy charges the bus capacitance and the voltage pumps up." },
{ q: "A stepper rated at 2.8 V per winding is normally run from a 24 V supply because:",
o: ["The chopper driver regulates winding current, and high voltage speeds current rise", "The extra voltage increases holding torque proportionally", "Steppers are voltage-mode devices above 1000 rpm", "The rating is only for series wiring"],
a: 0, why: "The driver chops to a current target, so winding voltage rating is irrelevant in operation; the high bus overcomes inductance faster, extending the speed range." }
],
interview: {
q: "Your robot's H-bridge FETs keep failing during aggressive deceleration. What are your prime suspects?",
a: "Two suspects stand out. First, bus pumping: hard braking regenerates the load's kinetic energy into the bus, and a bench supply or an eFuse-protected input cannot sink it, so the bus voltage spikes past the FET rating. I would scope the bus during a braking event, calculate half J omega squared against half C V squared, and add bulk capacitance or a brake chopper if it confirms. Second, shoot-through under the fast dV/dt of high-current switching: Miller coupling can lift the off-state gate. I would scope the low-side gate during the opposite switch's turn-on, and fix with stronger gate pull-down, a small negative bias, or slower edges. I would also sanity-check dead time and that avalanche or overvoltage is not marking the FETs."
}
},

{
id: "el-layout",
track: "Electronics",
sub: "Board level",
title: "PCB layout for mixed signal",
mins: 30,
body: `
<p>Mixed-signal layout has one governing law: current flows in loops, and every loop
you draw on the schematic exists physically on the board whether you planned it or
not. Good layout is choosing where the return half of every loop goes. Everything
else, stackups, splits, islands, is commentary on that law.</p>
<h3>Return currents: the mental model</h3>
<p>At DC, return current spreads across the plane taking the lowest resistance path.
Above roughly 100 kHz, it concentrates in the plane directly under the signal trace,
because that minimises loop inductance. So a trace's return path is its shadow. Route
a trace across a slot or split in the plane and the return current must detour around
the gap: the loop opens up, inductance jumps, the signal rings, and the detour current
shares copper with every other signal doing the same, which is how crosstalk and EMC
failures are manufactured.</p>
<h3>Stackup choice</h3>
<p>Two layers is fine for slow boards if you keep one layer as an honest ground and
discipline the top. The workhorse is four layers: signal, solid ground, power, signal.
The unbroken ground under the primary signal layer is the whole point; give the
critical signals that layer adjacency. Six layers buys a second ground so both outer
signal layers reference solid copper. When asked, justify the stackup by which layer
each class of signal references, not by cost alone.</p>
<h3>Split versus solid ground: the truth</h3>
<p>The old advice to split analogue and digital grounds and join them at one point
creates more failures than it prevents, because any signal crossing the split has a
broken return path. The modern answer: one solid ground plane, and control where
currents flow by placement and routing. The ADC datasheet diagram with AGND and DGND
pins still applies: tie both to the one plane; the pins exist because of package
internals, not as an instruction to split the board. A split is defensible only when
something forces large currents through the ground (isolation barriers, chassis
currents, a shared off-board return), and then nothing signal-like may cross it.</p>
<h3>Placement before routing</h3>
<p>Eighty percent of layout quality is decided before the first trace: partition the
board into analogue, digital and power neighbourhoods; put the noisy switching
converter in its corner with its loop tight; keep the precision front end away from
it and from hot components; place decoupling and crystals against their pins before
anything else claims the space. If the placement is right, the routing is boring,
which is the goal.</p>
<h3>Decoupling geometry</h3>
<p>A decoupling capacitor works through its total loop: pad, trace, via, plane, via,
pin. A 100 nF 0402 with vias snug against its pads might present 2 nH; the same part
at the end of 5 mm of thin trace can be 10 nH, and at 100 MHz that is 6 ohms of
reactance doing nothing for the pin it serves. Rules: shortest possible trace to the
pads, vias beside or inside the pads, capacitor on the same side as the IC where
possible, and the smallest sensible package.</p>
<h3>Analogue islands and the edges</h3>
<p>Give the sensitive front end its own quiet region of the solid plane: an island by
placement, not by cutting copper. No digital or converter return current has business
flowing under the amplifier inputs if the noisy circuits and their loads sit
elsewhere. Finally, connector strategy: bring cables in on one edge so their shields
and returns share a reference, stitch ground to chassis at the connector field, and
never route fast signals along the board edge where the fringing fields leak and the
reference plane ends.</p>`,
quiz: [
{ q: "Above about 100 kHz, the return current for a trace routed over a solid plane flows:",
o: ["Uniformly across the whole plane", "Along the plane edge", "Directly under the trace, minimising loop inductance", "Through the nearest decoupling capacitor only"],
a: 2, why: "The current distribution minimises total loop energy; at high frequency that means inductance, so the return hugs the trace's shadow." },
{ q: "The modern recommendation for the ground under a precision ADC on a mixed-signal board is:",
o: ["One solid plane, with currents steered by placement and routing", "Separate analogue and digital planes joined at the supply", "A split plane joined under the ADC with a ferrite", "No plane, star-ground everything with traces"],
a: 0, why: "Splits break return paths for anything crossing them; a solid plane plus deliberate placement keeps noisy return currents away from the analogue region without those hazards." },
{ q: "Moving a 100 nF decoupling capacitor from vias-in-pad next to the IC to the end of a 5 mm thin trace mainly:",
o: ["Reduces its capacitance", "Improves low frequency filtering", "Changes nothing below 1 GHz", "Raises the loop inductance so it stops working at high frequency"],
a: 3, why: "Decoupling effectiveness is set by loop inductance; a few extra nanohenries makes the capacitor look inductive at exactly the frequencies it is meant to serve." },
{ q: "The best time to prevent a noisy buck converter from polluting a precision front end is:",
o: ["During EMC testing", "During placement, by partitioning and keeping the switching loop tight and distant", "After routing, by adding stitching vias", "During firmware development, by duty cycle limits"],
a: 1, why: "Placement determines where the loops and their fields live; fixes after routing are patches on a decision already made." }
],
interview: {
q: "You inherit a two-layer board where a precision amplifier shares the ground pour with a buck converter, and the readings are noisy. What do you change?",
a: "First I would map the return currents: on two layers the buck's switching return is probably flowing through the pour under the amplifier. Short term, I would reroute so the converter's hot loop is tiny and its return current has a direct path that never passes under the analogue section, moving parts if needed, since placement is the real fix. I would check the amplifier's decoupling loop and its reference divider are local and tight. If the product allows, I would respin to four layers with a solid ground plane, which removes the shared-copper problem almost entirely. I would resist cutting slots in the pour; a split usually breaks more return paths than it protects. Then verify by scoping the amplifier ground region differentially against the converter switching."
}
}

);
