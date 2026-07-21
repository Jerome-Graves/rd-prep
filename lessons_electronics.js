// Electronics track lessons. Same schema as data.js; appended to LESSONS.

LESSONS.push(

{
id: "el-adc",
track: "Electronics",
title: "ADC and DAC architectures",
mins: 30,
body: `
<p>Every converter architecture is a different answer to the same question: how do you
compare an unknown voltage against a reference, and how many comparisons per sample can
you afford? Know the four families cold and you can justify any datasheet choice.</p>
<h3>The four families, by intuition</h3>
<ul>
<li><b>SAR</b> (successive approximation): a binary search. Sample-and-hold freezes the
input, then a DAC halves the search interval once per clock: N bits in N compares.
12 to 18 bits, up to a few MS/s, low latency (one conversion), low power. The default
general-purpose converter, and what lives inside most microcontrollers.</li>
<li><b>Sigma-delta</b>: a 1-bit (or few-bit) modulator samples far above Nyquist and
noise-shapes quantisation error out of band; a digital decimation filter then trades
that speed for resolution. 24 bits at Hz to kHz rates. Perfect for load cells,
thermocouples, battery monitoring. Costs: latency through the filter, so it is poor
for multiplexed channels (the filter must settle after every switch).</li>
<li><b>Pipeline</b>: an assembly line of coarse stages, each resolving a few bits and
passing the amplified residue onward. 12 to 16 bits at tens to hundreds of MS/s: the
ultrasound and software-radio workhorse. Costs: several clock cycles of latency and
constant power whether or not you convert.</li>
<li><b>Flash</b>: 2^N - 1 comparators fire simultaneously: one answer per clock, GS/s
rates, but 8 bits needs 255 comparators, so resolution is low and power is high.
Flash stages are the building blocks inside pipelines.</li>
</ul>
<h3>ENOB: the bits you actually get</h3>
<p>An ideal N-bit converter gives SNR = 6.02N + 1.76 dB. Real parts add distortion and
noise, summarised as SINAD, and the effective number of bits is
ENOB = (SINAD - 1.76) / 6.02. A "16-bit" ADC delivering 74 dB SINAD is a 12-bit
converter with a 16-bit price tag. Read the ENOB at your actual input frequency, not
at DC.</p>
<h3>Sample-and-hold and input drive</h3>
<p>A SAR input is a switched capacitor: at the start of acquisition the hold capacitor
(a few pF) slams onto your source and demands a gulp of charge. The source must settle
that kickback to within half an LSB before conversion starts: for 12 bits that is
ln(2^13), about 9 RC time constants, and for 16 bits about 11.8. This is why datasheets
demand a wideband driver op-amp plus a small RC (for example 20 ohm and 1 nF) at the
pin: the capacitor supplies the charge gulp, the resistor keeps the driver stable. A
slow precision op-amp straight into a fast SAR gives distortion that looks like a
broken ADC but is really a broken drive.</p>
<h3>References deserve respect</h3>
<p>The reference IS the ruler: reference noise and drift appear directly in every code.
At 16 bits over 4.096 V an LSB is 62.5 microvolts; a reference wandering 100 ppm over
temperature is 26 LSB of error before the converter contributes anything. Decouple the
reference pin exactly as the datasheet shows, since SAR reference pins also draw
code-dependent current spikes.</p>
<h3>DACs, briefly</h3>
<p>The R-2R ladder gives fast general-purpose DACs; the string DAC guarantees
monotonicity; sigma-delta DACs dominate audio. Watch settling time and glitch energy
when stepping between codes, and remember the output usually needs a buffer and a
reconstruction filter for the same reason ADCs need anti-alias filters.</p>`,
quiz: [
{ q: "A 16-bit ADC datasheet quotes SINAD of 74 dB at your input frequency. Its ENOB is closest to:",
o: ["16 bits", "14 bits", "12 bits", "10 bits"],
a: 2, why: "ENOB = (74 - 1.76) / 6.02 = 12.0 bits. The last four marketing bits are noise and distortion." },
{ q: "Which architecture is fundamentally a binary search against an internal DAC?",
o: ["SAR", "Flash", "Sigma-delta", "Pipeline"],
a: 0, why: "Successive approximation halves the search interval once per clock, so N bits take N comparisons." },
{ q: "Why is a sigma-delta ADC a poor choice for rapidly multiplexed channels?",
o: ["It has too few bits", "Its reference drifts when switched", "It cannot exceed 1 kS/s", "Its digital decimation filter must settle after every channel switch"],
a: 3, why: "The output is a long weighted history of modulator samples; after a mux switch that history is a mix of two channels until the filter flushes." },
{ q: "An 8-bit flash converter needs how many comparators?",
o: ["8", "255", "64", "16"],
a: 1, why: "Flash needs 2^N - 1 comparators, one per decision threshold: 2^8 - 1 = 255. That is why flash stops around 8 bits." }
],
interview: {
q: "You need to digitise 8 multiplexed sensor channels, DC to 1 kHz each, with at least 90 dB of dynamic range. Walk me through your converter choice.",
a: "90 dB needs roughly 15 effective bits, so I would start from a good SAR, not a pipeline. A single 16 or 18-bit SAR behind the multiplexer converts each channel in one shot with no filter memory, which is exactly what muxed channels need; a sigma-delta would give resolution cheaply but its decimation filter must flush after every switch, killing throughput. Per channel I only need a few kS/s, so an 8-channel scan at 100 kS/s aggregate is comfortable. The design effort then moves where it belongs: an anti-alias filter per channel, a driver that settles the SAR kickback to half an LSB, and a clean reference, because at 15 bits the reference and layout set the floor, not the silicon."
}
},

{
id: "el-noise",
track: "Electronics",
title: "Noise, grounding and shielding",
mins: 30,
body: `
<p>Noise questions separate engineers who have shipped instruments from those who have
read about them. The physics is three mechanisms; the practice is mostly about where
currents return.</p>
<h3>The three intrinsic noise sources</h3>
<ul>
<li><b>Thermal (Johnson) noise</b>: every resistor generates sqrt(4kTRB) volts of noise.
The number to carry: a 1 kilohm resistor at room temperature is 4 nV per root hertz.
It scales with the square root of R, so 100 kilohms is 40 nV per root hertz. This is
the floor nothing gets under.</li>
<li><b>Shot noise</b>: current is discrete electrons, so a DC current I carries
sqrt(2qIB) of current noise. Matters in photodiodes and bipolar transistor base
currents; irrelevant in most resistive circuits.</li>
<li><b>Flicker (1/f) noise</b>: rises as frequency falls, characterised by the corner
frequency where it crosses the white noise floor. It is why precision DC work uses
chopper amplifiers and why measuring at 1 kHz beats measuring at 0.1 Hz.</li>
</ul>
<h3>Noise bandwidth, the honest multiplier</h3>
<p>Noise integrates over the equivalent noise bandwidth, not the -3 dB corner. A
first-order RC low-pass at corner fc has noise bandwidth 1.57 fc, because the gentle
skirt keeps admitting noise above the corner. Total noise = density times sqrt(ENBW).
So a 4 nV per root hertz source through a 10 kHz first-order filter gives
4 nV x sqrt(15700), about 0.5 microvolts RMS.</p>
<h3>Ground loops: how they actually form</h3>
<p>Connect two boxes with a signal cable while both are earthed elsewhere, and the
cable screen plus the building earth form a loop. Mains magnetic fields induce current
around it, and that current flowing through the screen resistance adds millivolts of
50 Hz directly in series with your signal. The tell is a hum that changes when you
touch cables or unplug unrelated equipment. Fixes: break the loop (isolate one end,
use a differential input, or an isolation barrier), or make the loop irrelevant by
sending the signal differentially so common-mode voltage cancels.</p>
<h3>Star vs plane</h3>
<p>Star grounding (all returns meet at one point) suits low-frequency precision
analogue, where you control exactly which currents share which copper. At high
frequency star wiring fails because return current wants to flow directly under its
signal trace: there a solid, unbroken ground plane wins. On mixed boards the modern
advice is one solid plane, with analogue and digital circuitry partitioned by
placement so digital return currents never need to cross the analogue region. Do not
slot the plane; a split you route a signal across creates a huge loop antenna.</p>
<h3>Shields and cables</h3>
<ul>
<li>At low frequency, ground a cable shield at one end only, to avoid making the
shield itself a ground-loop conductor.</li>
<li>At RF, ground it at both ends (ideally with a 360 degree bond, not a pigtail),
because an open-ended shield is useless against high-frequency fields.</li>
<li>Twisted pair plus a differential receiver rejects magnetically induced pickup,
since both wires see the same interference.</li>
</ul>`,
quiz: [
{ q: "Thermal noise density of a 1 kilohm resistor at room temperature is roughly:",
o: ["0.4 nV per root hertz", "4 nV per root hertz", "40 nV per root hertz", "4 microvolts per root hertz"],
a: 1, why: "sqrt(4kTR) with T = 300 K and R = 1 kilohm is 4.07 nV per root hertz; it scales with sqrt(R)." },
{ q: "The equivalent noise bandwidth of a first-order low-pass with a 10 kHz corner is:",
o: ["5 kHz", "10 kHz", "20 kHz", "15.7 kHz"],
a: 3, why: "For a single-pole response ENBW = (pi/2) fc = 1.57 x 10 kHz; the slow rolloff keeps admitting noise above the corner." },
{ q: "Two earthed instruments joined by a screened cable show 50 Hz hum on the signal. The most likely cause is:",
o: ["A ground loop driving current through the cable screen", "Thermal noise in the screen", "Shot noise in the input stage", "Aliasing of a fast signal"],
a: 0, why: "Screen plus building earth forms a loop; mains fields drive current around it, and screen resistance converts that to series voltage." },
{ q: "For a low-frequency precision sensor cable, the shield should normally be:",
o: ["Left floating at both ends", "Grounded at both ends", "Grounded at one end only", "Used as the signal return"],
a: 2, why: "Single-ended grounding gives electrostatic shielding without letting the shield carry ground-loop current. At RF the advice reverses." }
],
interview: {
q: "Your prototype shows a clean signal on the bench but picks up 50 Hz hum installed in the lab. How do you attack it?",
a: "First I characterise, not guess: is it 50 Hz (magnetic or ground loop) or 100 Hz (rectifier related), and does its amplitude change when I move cables, lift earths through an isolation transformer on a scope, or disconnect other equipment? If unplugging an unrelated instrument changes it, I have a ground loop, and I break it: differential input, shield grounded at one end, or an isolator. If it is magnetic pickup, I shrink loop area with twisted pair and reroute away from transformers. On the bench everything shared one outlet and one earth, which is exactly why it was quiet there. The permanent fix is a front end that tolerates the environment: differential, bandwidth no wider than needed, and defined return paths."
}
},

{
id: "el-power",
track: "Electronics",
title: "Power supplies and decoupling",
mins: 28,
body: `
<p>Power questions are arithmetic first. If you can do the dissipation sums out loud,
half the interview is already won.</p>
<h3>LDO vs buck: do the numbers</h3>
<p>An LDO is a controlled resistor: dissipation = (Vin - Vout) x Iload. Dropping 5 V to
3.3 V at 500 mA burns 1.7 x 0.5 = 0.85 W in the regulator, with efficiency
3.3/5 = 66 percent. Drop 12 V to 3.3 V at 200 mA and the LDO dissipates
8.7 x 0.2 = 1.74 W: that is a heatsink, not a SOT-23. A buck converter at 90 percent
efficiency delivering the same 0.66 W load loses only about 73 mW total.</p>
<p>So why ever use an LDO? Noise and simplicity. A buck sprays switching ripple at its
switching frequency and harmonics; an LDO is quiet and adds PSRR. The standard
instrument pattern: buck does the heavy voltage drop, then an LDO post-regulates the
sensitive analogue rail, dropping only 0.3 to 1 V so its dissipation stays tiny.</p>
<h3>PSRR, and its fine print</h3>
<p>Power supply rejection ratio says how much supply ripple reaches the output. The
trap: PSRR is quoted at 100 Hz or 1 kHz and collapses at high frequency, often to
20 dB or less by 1 MHz, exactly where buck converters switch. An LDO alone will not
clean up a 2 MHz buck; you also need an LC or ferrite-plus-capacitor filter, and
layout that stops the ripple coupling around the regulator entirely.</p>
<h3>Decoupling strategy</h3>
<ul>
<li><b>Local ceramics</b>: 100 nF X7R at every supply pin, closest component to the
pin, via straight to the plane. It is a local charge reservoir: trace inductance means
the pin would droop during fast transients before the bulk cap could respond.</li>
<li><b>Bulk per rail</b>: 10 to 100 microfarads (ceramic or polymer) per regulator
output and per board entry, covering the slow end.</li>
<li>Placement beats value. A perfect capacitor 20 mm away is a worse decoupler than a
mediocre one at 2 mm, because loop inductance dominates at high frequency.</li>
<li>Mind ceramic DC bias derating: a 10 microfarad 0603 X5R at 3.3 V may deliver half
its marked capacitance.</li>
</ul>
<h3>Inrush, brownout and reset</h3>
<p>All that capacitance must charge at switch-on: inrush current can trip current
limits, brown out upstream rails, or weld relay contacts. Soft-start in the regulator
or a controlled high-side switch fixes it. At the other end of life, a sagging rail
must produce a clean reset: a brownout detector holds the MCU in reset below a
threshold, because a processor at 2.1 V on a 3.3 V design does not stop, it
misbehaves, corrupting flash and RAM on the way down. Check the reset threshold sits
above the minimum operating voltage of every chip on the rail.</p>
<h3>Measuring ripple honestly</h3>
<p>The classic error: scope probe with its 10 cm ground clip flapping in the air. That
loop is an antenna, and it shows you tens of millivolts of "ripple" that is not on the
rail at all. Measure with the probe in tip-and-ring fashion: remove the clip, put the
tip on the rail and the barrel's ground ring directly on ground millimetres away
(a ground spring), AC coupling, 20 MHz bandwidth limit for a fair comparison with
datasheet numbers. If the reading collapses when you shorten the ground, the loop was
lying to you.</p>`,
quiz: [
{ q: "An LDO drops 5 V to 3.3 V at 500 mA. Its dissipation is:",
o: ["0.85 W", "1.65 W", "0.28 W", "2.5 W"],
a: 0, why: "P = (Vin - Vout) x I = 1.7 V x 0.5 A = 0.85 W. Efficiency is only Vout/Vin = 66 percent." },
{ q: "Why place a 100 nF ceramic at every IC supply pin when a large bulk capacitor already sits on the rail?",
o: ["It filters 50 Hz mains", "It protects against reverse polarity", "Trace inductance isolates the pin from the bulk cap during fast transients; the local cap supplies the charge", "The bulk capacitor is only for the regulator"],
a: 2, why: "At high frequency the inductance between pin and bulk capacitor dominates; only a nearby low-inductance capacitor can serve nanosecond current demands." },
{ q: "A 2 MHz buck feeds an LDO for a sensitive analogue rail. The main caution is:",
o: ["LDOs cannot follow a buck", "LDO PSRR falls at high frequency, so 2 MHz ripple may pass nearly unattenuated", "The buck will oscillate", "Efficiency drops to zero"],
a: 1, why: "PSRR is excellent at 100 Hz but often poor by 1 to 2 MHz; add an LC or ferrite filter and mind layout coupling." },
{ q: "The correct way to measure millivolt-level rail ripple with a scope is:",
o: ["Long ground clip, DC coupling, full bandwidth", "Any probe, but average 128 traces", "Use a multimeter on AC volts", "Tip-and-ring with a ground spring, AC coupling, 20 MHz limit"],
a: 3, why: "The long ground clip forms an inductive loop that picks up switching fields and invents ripple; a millimetre-scale ground and bandwidth limit measure what is really there." }
],
interview: {
q: "Your ADC readings are noisy and you suspect the power tree: a 12 V input, a 3.3 V buck, and the ADC's analogue supply taken straight from that buck. What do you change?",
a: "First I measure properly: tip-and-ring probing on the analogue rail, AC coupled, and I look for energy at the buck's switching frequency and its harmonics, then correlate with the ADC noise spectrum. If the ripple is real, I restructure: let the buck drop 12 V to about 3.9 V, then an LDO to a dedicated 3.3 V analogue rail, which costs only 0.6 V of headroom, so tens of milliwatts. Because LDO rejection is weak at megahertz, I add a ferrite bead and local capacitance, keep the buck's hot loop small and far from the analogue section, and give the ADC reference its own decoupling. Then I re-measure and check the ADC's noise floor against its datasheet ENOB before declaring victory."
}
},

{
id: "el-sensors",
track: "Electronics",
title: "Interfacing real sensors",
mins: 30,
body: `
<p>Real sensors output microvolts, picoamps or picocoulombs riding on large offsets.
The craft is choosing the front end that speaks each sensor's native language.</p>
<h3>Bridges and instrumentation amplifiers</h3>
<p>Resistive sensors (strain gauges, pressure elements, RTDs) change resistance by
fractions of a percent. The Wheatstone bridge converts that into a small differential
voltage centred on a large common mode: for one active element,
Vout = Vexc x (dR/R) / 4. A 350 ohm gauge with gauge factor 2 at 1000 microstrain
changes by 0.2 percent, giving just 2.5 mV on a 5 V bridge. That signal wants an
<b>instrumentation amplifier</b>: two buffered inputs (near-infinite input impedance,
so the bridge is not loaded), gain set by one resistor, and high CMRR to reject the
2.5 V common mode and any mains pickup shared by both wires.</p>
<h3>Temperature: the big three</h3>
<ul>
<li><b>Thermocouple</b>: two dissimilar metals, about 41 microvolts per degree C for
type K. Needs cold-junction compensation (you always measure a difference of two
junctions) and low-offset amplification. Wins above 300 C and in harsh environments.</li>
<li><b>RTD</b> (PT100): platinum, 100 ohms at 0 C, moving 0.385 ohms per degree C. The
most accurate and linear of the three, but you must excite it with current, keep that
current small (1 mA gives only 100 microvolts per degree, but 10 mA would self-heat),
and use 3 or 4-wire connections so lead resistance cancels.</li>
<li><b>Thermistor</b>: huge sensitivity (several percent per degree C), cheap, very
nonlinear; linearise in firmware with the Beta or Steinhart-Hart equation. The default
below about 100 C when absolute accuracy is modest.</li>
</ul>
<h3>Current-output and charge-output sensors</h3>
<p>A <b>photodiode</b> is a current source: use a transimpedance amplifier, V = -I x Rf,
holding the diode at a virtual earth (zero bias) for lowest dark current. The feedback
capacitor across Rf is not optional: diode capacitance at the inverting node creates a
phase lag that rings or oscillates without it. A <b>piezo</b> element is a charge
source with small capacitance: a charge amplifier (integrator with Cf) gives
V = Q / Cf, and its great virtue is insensitivity to cable capacitance, which
otherwise forms an uncontrolled divider with the element. Note there is no DC
response: piezo and charge amps measure dynamics, not static force.</p>
<h3>Digital plumbing: open-drain and pull-ups</h3>
<p>Many sensor interrupt and alert pins are open-drain: the chip can only pull low, and
a pull-up resistor provides the high. This lets several devices share one line
(wired-AND) and lets a 1.8 V sensor talk to a 3.3 V host. Size the pull-up between
speed (smaller R charges the line's capacitance faster) and current (larger R saves
power); 4.7 to 10 kilohms suits slow alert lines.</p>
<h3>Ratiometric measurement, the free lunch</h3>
<p>If the bridge excitation and the ADC reference come from the same source, supply
drift cancels: the ADC reports the ratio Vout/Vexc, in which the supply appears in
both numerator and denominator. A 1 percent supply sag then causes zero error instead
of 1 percent. Use ratiometric connections whenever the sensor output is proportional
to its excitation; only spend money on a precision reference when it is not.</p>`,
quiz: [
{ q: "A 5 V Wheatstone bridge has one active 350 ohm gauge, gauge factor 2, at 1000 microstrain (dR/R = 0.002). The bridge output is about:",
o: ["25 mV", "10 mV", "0.4 mV", "2.5 mV"],
a: 3, why: "Single active element: Vout = Vexc x (dR/R)/4 = 5 x 0.002/4 = 2.5 mV. Hence the need for an instrumentation amp." },
{ q: "Why use 3-wire or 4-wire connections to a PT100?",
o: ["To carry more current", "So lead resistance does not add to the 0.385 ohm per degree signal", "To provide cold-junction compensation", "To increase sensitivity"],
a: 1, why: "One ohm of copper lead looks like 2.6 degrees of error on a 2-wire PT100; separate force and sense wires cancel it. Cold junctions belong to thermocouples." },
{ q: "The feedback capacitor across a transimpedance amplifier's resistor exists to:",
o: ["Increase gain", "Block DC offset", "Stabilise the loop against the photodiode's capacitance, preventing ringing", "Filter mains hum"],
a: 2, why: "Diode capacitance at the virtual earth adds phase lag inside the loop; the feedback capacitor restores phase margin." },
{ q: "A ratiometric bridge measurement cancels which error?",
o: ["Drift of the shared excitation and reference supply", "Amplifier offset voltage", "Gauge nonlinearity", "ADC quantisation"],
a: 0, why: "Output and reference scale together, so their ratio is supply-independent. Offsets and nonlinearity need other cures." }
],
interview: {
q: "You must measure a slowly varying force to 0.1 percent with a strain-gauge load cell. Sketch the signal chain and the error budget headlines.",
a: "Full bridge excited at 5 V, four active gauges for maximum output and thermal symmetry, giving a couple of millivolts per volt of excitation. Into an instrumentation amplifier or, better for this bandwidth, a 24-bit sigma-delta ADC with an integrated PGA, connected ratiometrically so the excitation is also the reference and supply drift cancels. The error budget is dominated by offset drift and 1/f noise at these microvolt levels, so I would use the converter's chopper front end, plus gain error from the PGA, bridge self-heating, and lead resistance handled by 6-wire sense connections. Then calibrate: zero and span against known masses, and log temperature so I can verify the residual tempco is within the 0.1 percent budget."
}
},

{
id: "el-buses",
track: "Electronics",
title: "UART, I2C, SPI and CAN in practice",
mins: 30,
body: `
<p>Protocol trivia is cheap; interviews probe the electrical layer, because that is
where boards actually fail. Bus by bus, here is what breaks and why.</p>
<h3>I2C: an RC circuit pretending to be a bus</h3>
<p>I2C lines are open-drain: devices only pull low, and the pull-up resistor makes the
rising edge. The rise is therefore an RC curve set by pull-up R and total bus
capacitance Cb (spec limit 400 pF). Fast mode (400 kHz) allows 300 ns rise time, and
t_rise is about 0.85 x R x Cb, so at Cb = 100 pF the pull-up must be under roughly
3.5 kilohms. The lower bound comes from sink current: the driver must pull to 0.4 V
while sinking at most 3 mA, so on 3.3 V the pull-up must exceed about 1 kilohm.
Sluggish, rounded rising edges on a scope mean the pull-ups are too weak or the bus
too long: this is the single most common I2C fault.</p>
<ul>
<li><b>Clock stretching</b>: a slave may hold SCL low to slow the master. Masters
(and bit-banged implementations) that ignore it corrupt transfers with slow
sensors.</li>
<li><b>Stuck bus</b>: if the master resets mid-read, a slave can be left holding SDA
low, deadlocking the bus. Recovery: toggle SCL up to nine times until the slave
releases SDA, then issue STOP. Bake this into your init code; a power cycle is not
always available.</li>
</ul>
<h3>SPI: fast, dumb and mostly about the chip select</h3>
<p>SPI is push-pull, so it runs to tens of MHz without pull-up games. The traps are
configuration and discipline. Modes 0 to 3 are the four combinations of clock polarity
(CPOL) and phase (CPHA): mode 0 (idle low, sample on rising edge) and mode 3 (idle
high, sample on second edge) are the common pair, and a mode mismatch typically reads
everything shifted by one bit. Chip select discipline: one CS per device, asserted for
the whole transaction, deasserted between transactions (many devices latch on CS
rising), and never let CS float during MCU reset, or the flash chip will hear garbage
during boot. At high clock rates, mind round-trip delay on MISO and keep the SCK trace
short and cleanly referenced.</p>
<h3>UART: agreeing about time without a clock</h3>
<p>Both ends free-run at a configured baud rate; the receiver resynchronises on each
start bit and samples mid-bit. The total clock error budget is about 5 percent over a
10-bit frame, roughly 2 percent per end, which is why an MCU on a sloppy internal RC
oscillator throws <b>framing errors</b> (stop bit not found where expected). Framing
errors mean baud mismatch, wrong stop or parity settings, a glitched line, or you have
connected at the wrong moment and are sampling mid-character. TX to RX crossover and
common ground: the two wiring mistakes that consume the most lab hours.</p>
<h3>CAN: arbitration you can see on a scope</h3>
<p>CAN is a differential two-wire bus where a dominant bit (0) overwrites a recessive
bit (1). During arbitration all nodes transmit their ID and listen: a node seeing a
dominant bit where it sent recessive has lost, and silently backs off. Lower ID
therefore wins, giving lossless priority arbitration with zero collisions. The bus
needs 120 ohm termination at each physical end (and only the ends): a quick health
check is to measure across CANH and CANL with power off and read 60 ohms. Missing or
doubled terminators produce reflections and error frames that get blamed on
software.</p>
<h3>RS-485 in one paragraph</h3>
<p>Differential, multi-drop, to 1200 m: UART framing over a robust physical layer.
Terminate both ends (typically 120 ohms), add fail-safe bias resistors so the bus
idles in a defined state, and manage driver enable timing carefully in half-duplex,
since transmitting while another driver is enabled means contention.</p>`,
quiz: [
{ q: "A 3.3 V I2C bus at 400 kHz has about 100 pF of capacitance. A sensible pull-up value is:",
o: ["330 ohms", "2.2 kilohms", "47 kilohms", "10 kilohms"],
a: 1, why: "Rise time roughly 0.85 x R x Cb must stay under 300 ns, so R under about 3.5 kilohms; sink-current limits set a floor near 1 kilohm. 2.2 k sits comfortably between." },
{ q: "After a mid-transfer master reset, SDA is stuck low. The standard recovery is:",
o: ["Clock SCL up to nine times until the slave releases SDA, then send STOP", "Send a START condition repeatedly", "Swap SDA and SCL", "Raise the pull-up voltage"],
a: 0, why: "The slave is partway through shifting out a byte; clocking it out lets it release SDA. Nine clocks covers the worst case byte plus ACK." },
{ q: "An SPI peripheral returns data shifted by one bit. The most likely cause is:",
o: ["Pull-ups missing on MISO", "The baud rate is too low", "Termination resistors missing", "A clock polarity or phase (mode) mismatch"],
a: 3, why: "Wrong CPOL/CPHA samples on the wrong edge, which classically appears as a one-bit shift. SPI needs no pull-ups or terminators at ordinary speeds." },
{ q: "With power off, you measure 60 ohms between CANH and CANL. This indicates:",
o: ["A shorted transceiver", "A missing terminator", "Both 120 ohm end terminators correctly present", "A stuck dominant node"],
a: 2, why: "Two 120 ohm terminators in parallel read 60 ohms; about 120 means one is missing, and 40 means someone fitted three." }
],
interview: {
q: "An I2C temperature sensor works on the bench but returns corrupted data in the product, which has a longer wiring run to the sensor. Diagnose.",
a: "The longer run added bus capacitance, and I2C rising edges are made by the pull-up charging that capacitance, so my first move is a scope on SDA and SCL looking at edge shape: rounded, slow rises that barely reach threshold confirm it. Fixes in order: stronger pull-ups within the sink-current limit, slow the clock to 100 kHz, or move the pull-ups nearer the far end. I would also check whether the sensor clock-stretches and the master honours it, and verify logic-level thresholds if the run introduced ground offset. If the topology genuinely needs a long cable, I2C is the wrong bus, and I would put a bus extender or move to a differential link like RS-485, with the sensor logic local."
}
},

{
id: "el-debug",
track: "Electronics",
title: "Bring-up and debugging discipline",
mins: 28,
body: `
<p>First-spin boards rarely work whole; they work in layers. Bring-up is the discipline
of testing those layers in an order where each result is meaningful.</p>
<h3>The power-first sequence</h3>
<ol>
<li><b>Inspect before power</b>: check orientation of polarised parts, look for solder
bridges on fine-pitch parts, and meter every rail to ground for shorts. A dead short
found now costs a minute; found at power-on it costs a regulator.</li>
<li><b>Current-limited first power</b>: bench supply set to the input voltage with the
current limit just above the expected idle draw. A board that should idle at 40 mA
drawing 400 says stop, not "let us see".</li>
<li><b>Verify every rail</b>: DC value, then ripple properly probed, before any
firmware. Also feel for hot parts; a finger is a legitimate instrument.</li>
<li><b>Clocks and reset</b>: crystal oscillating, reset released cleanly, brownout
thresholds sensible.</li>
<li><b>Attach the debugger</b>: if SWD connects and reads the device ID, the core is
alive; blink an LED to prove code executes; then bring up peripherals one at a
time.</li>
</ol>
<h3>Scope or logic analyser?</h3>
<p>The oscilloscope answers analogue questions: is the edge clean, is the level right,
is there ringing, ripple or a runt pulse? The logic analyser answers protocol
questions: what bytes crossed the bus, in what order, with what timing, across eight
or sixteen lines at once with protocol decode. The professional pattern is both: when
a decoded I2C transaction shows a NAK, the scope tells you whether the bit was
electrically marginal or genuinely refused. Distrust a logic analyser on a marginal
signal; it happily cleans up an edge that the real receiver rejects.</p>
<h3>Probing technique</h3>
<ul>
<li>A x10 passive probe loads the circuit with about 10 megohms and 10 to 15 pF. That
capacitance is why probing a marginal oscillator can stop it, and why a x1 setting
(hundreds of pF of cable) is only for slow signals.</li>
<li>The long ground clip adds perhaps 100 to 200 nH of loop inductance; with 10 pF of
tip capacitance that resonates well above 100 MHz, so fast edges appear to ring even
when the board is fine. Use a ground spring for any edge faster than tens of
nanoseconds.</li>
<li>Bandwidth budget: the scope-plus-probe chain needs roughly 5 times your signal's
fundamental to preserve shape; a 20 MHz limit hides exactly the switching spikes you
may be hunting.</li>
</ul>
<h3>The usual first-spin faults</h3>
<p>Swapped footprint pinouts (transistor pin order, regulator variants), connectors
mirrored because the drawing showed the mating face, TX-to-TX instead of TX-to-RX,
pull-ups forgotten on I2C or reset lines, thermal-relief spokes missing so a pad never
soldered, crystal load capacitors wrong, and one part fitted 90 degrees rotated. Keep
a checklist; the same faults recur for everyone.</p>
<h3>SWD, JTAG and the binary-search mindset</h3>
<p>SWD gives full debug on two pins (SWDIO, SWCLK); route it on every board, always,
with a ground and reset pin beside it. If SWD will not connect, suspect power, reset
held low, or a sleeping or fuse-locked chip before suspecting the tool.</p>
<p>Above all: debugging is binary search, not intuition. Split the system at an
observable point, establish which half contains the fault, and repeat. Swap the cable,
loop TX back to RX, inject a known signal, substitute a known-good board. Each
experiment should halve the search space, and each should have a predicted outcome
written down before you run it. The engineer who changes one thing at a time and keeps
notes finds the fault in log time; the one who reflows randomly finds it never.</p>`,
quiz: [
{ q: "The very first action with an assembled first-spin PCB should be:",
o: ["Flash the firmware", "Apply full power and watch for smoke", "Visual inspection plus metering rails for shorts, before any power", "Connect the debugger"],
a: 2, why: "Shorts and reversed parts are cheapest to find before power is applied; a current-limited supply is the second line of defence." },
{ q: "Fast digital edges appear to ring badly on the scope, but the circuit works. The likely cause is:",
o: ["A failing scope input", "Insufficient decoupling", "Crosstalk from the mains", "The probe's long ground clip forming a resonant inductive loop"],
a: 3, why: "100 nH of ground lead with about 10 pF of tip capacitance resonates above 100 MHz; a ground spring shrinks the loop and the ringing largely disappears." },
{ q: "A decoded I2C capture shows a NAK on a device that usually responds. The right next step is:",
o: ["Scope the same transaction to see whether the ACK bit was electrically marginal", "Replace the device", "Increase the bus speed", "Reflow the whole board"],
a: 0, why: "The logic analyser squares up marginal levels; only the scope shows whether the bit failed electrically or the device truly refused." },
{ q: "SWD debugging requires how many signal pins besides ground and power?",
o: ["Five", "Two: SWDIO and SWCLK", "Four", "One"],
a: 1, why: "Serial Wire Debug is the two-pin reduction of JTAG; adding reset is wise but strictly optional." }
],
interview: {
q: "Your new board draws triple the expected idle current and the MCU will not enumerate over SWD. Talk me through your first fifteen minutes.",
a: "I stay at the power layer until it is proven. First, which rail is heavy: I read each regulator's output and feel for warm components, or use freezer spray or a thermal camera to find the sink. Triple idle current with a dead debug port most often means one rail is low: a partial short dragging the 3.3 V line under the MCU's operating minimum explains both symptoms at once. I meter rails to ground, compare against a known-good board if one exists, and inspect fine-pitch parts under magnification for bridges. If rails are actually good, I check reset is released, the SWD pins for solder faults, and whether the part ships with SWD disabled. One hypothesis, one measurement, one note at a time, halving the space each step."
}
}

);
