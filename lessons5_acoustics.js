// Acoustics lessons: transducers and materials.
//
// The track had one lesson on transducers. This covers the piezoelectric
// materials themselves, the equivalent-circuit models used to design a stack,
// the bandwidth and pulse-shape trade, how a transducer is actually
// characterised, and the non-contact alternatives.

LESSONS.push(

{
id: "ac-piezo",
track: "Acoustics",
sub: "Transducers and materials",
title: "Piezoelectric materials and the constants that matter",
mins: 22,
body: `
<p>A piezoelectric material converts between electrical and mechanical energy in both
directions, which is why one element can both transmit and receive. Which material you choose
decides the sensitivity, the bandwidth and the impedance you have to match, so the constants are
worth knowing by name.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The main piezoelectric constants and what each governs: d for transmit, g for receive, k for efficiency, and acoustic impedance for matching">
<rect class="bx" x="24" y="30" width="632" height="42" rx="4"/>
<text class="th" x="40" y="52">d, the strain constant</text>
<text class="ts" x="240" y="52">strain per volt: governs TRANSMIT</text>
<rect class="bx" x="24" y="80" width="632" height="42" rx="4"/>
<text class="th" x="40" y="102">g, the voltage constant</text>
<text class="ts" x="240" y="102">volts per unit stress: governs RECEIVE</text>
<rect class="bx" x="24" y="130" width="632" height="42" rx="4"/>
<text class="th" x="40" y="152">k, the coupling factor</text>
<text class="ts" x="240" y="152">fraction of energy converted: governs BANDWIDTH</text>
<rect class="bx" x="24" y="180" width="632" height="42" rx="4"/>
<text class="th" x="40" y="202">Z, acoustic impedance</text>
<text class="ts" x="240" y="202">around 30 MRayl: governs MATCHING</text>
</svg>

<p>The <b>d</b> constant gives strain per unit field, so it governs how much displacement you get
for a drive voltage and therefore transmit sensitivity. The <b>g</b> constant gives field per
unit stress and governs receive sensitivity. They are related through the permittivity, and a
material with a high d often has a high permittivity and therefore a lower g, which is why
transmit-optimised and receive-optimised materials differ.</p>

<p>The <b>coupling factor k</b> is the fraction of energy converted per cycle, and it is the one
that decides achievable bandwidth. A high-k material can be damped heavily to give a short pulse
and still retain useful sensitivity; a low-k material cannot, because damping it enough to
shorten the pulse throws away too much of what little it converts.</p>

<p><b>PZT</b> is the workhorse: cheap, high d, and available in soft grades for sensitivity and
hard grades for high power and low loss. Its acoustic impedance of roughly 30 MRayl against
water's 1.5 is the reason matching layers exist at all.</p>

<p><b>PVDF</b> is a polymer with a low impedance close to water, wide bandwidth and poor transmit
sensitivity. That combination makes it excellent as a receiver, particularly as a hydrophone,
and poor as a transmitter.</p>

<p><b>Single crystal</b> materials such as PMN-PT have coupling factors well above PZT, so they
give both wider bandwidth and higher sensitivity at once. They are more expensive, more fragile,
and have a lower Curie temperature, which limits both the operating temperature and the
processing.</p>

<p>That last point generalises: every piezoelectric depoles above its <b>Curie temperature</b>,
and the practical limit is well below it because depoling is gradual. A transducer that has been
overheated does not fail cleanly; it quietly loses sensitivity, which is exactly the sort of
drift a regular reference measurement is there to catch.</p>
`,
quiz: [
{ q: "Which constant governs transmit sensitivity?",
o: ["g, the voltage constant", "d, the strain constant", "k, the coupling factor", "The acoustic impedance"],
a: 1, why: "d gives strain per unit field, so it decides displacement for a drive voltage. g gives field per unit stress and governs receive." },
{ q: "What does the coupling factor k decide?",
o: ["The acoustic impedance of the material", "The achievable bandwidth after damping", "The Curie temperature", "The dielectric loss"],
a: 1, why: "A high-k material can be damped hard for a short pulse and still retain sensitivity, whereas a low-k one cannot afford the loss." },
{ q: "Why is PVDF used as a hydrophone rather than a transmitter?",
o: ["It has a very high d constant", "Low impedance and wide bandwidth, but poor transmit sensitivity", "It withstands higher drive voltages", "It has a higher Curie temperature"],
a: 1, why: "Its impedance is close to water, which matches well, and its bandwidth is wide, but it converts too little energy to transmit efficiently." },
{ q: "What happens to a transducer heated near its Curie temperature?",
o: ["It fails open circuit", "It gradually depoles and quietly loses sensitivity", "Its centre frequency shifts upward", "Its impedance becomes purely resistive"],
a: 1, why: "The failure is gradual rather than clean, which is exactly the sort of drift a regular reference measurement is there to catch." }
],
interview: {
q: "How would you choose a piezoelectric material for a new probe?",
a: "I would work from the requirement to the constants rather than from a materials list. If the priority is transmit power, the d constant matters most, since it gives strain per unit field and therefore displacement for a given drive, and I would look at hard PZT because it tolerates high drive with low loss. If the priority is receive sensitivity then g is the relevant constant, and a material with a lower permittivity tends to do better there, which is why transmit-optimised and receive-optimised materials are not the same. If bandwidth is the driver, and for pulse-echo imaging it usually is, then the coupling factor k is the number I care about, because k decides how hard I can damp the element and still have useful sensitivity left. A high-k material lets me back it heavily for a short pulse and keep the signal; a low-k one does not, because the damping throws away too much of the little it converts. That is the argument for single crystal materials like PMN-PT, which have coupling factors well above PZT so I get wider bandwidth and higher sensitivity together, and I would weigh that against their cost, their fragility and their lower Curie temperature. PVDF I would consider only for receive, typically a hydrophone, because its impedance is close to water and its bandwidth is wide but it transmits poorly. Whatever I chose, the acoustic impedance drives the rest of the stack design, because around thirty MRayl against water at one and a half is what makes matching layers necessary. And I would keep the Curie temperature in view for the manufacturing process as well as for operation, because depoling is gradual and an overheated element loses sensitivity quietly rather than failing cleanly."
}
},

{
id: "ac-klm",
track: "Acoustics",
sub: "Transducers and materials",
title: "Equivalent circuits: designing the stack before you build it",
mins: 22,
body: `
<p>A transducer stack is a one-dimensional acoustic problem: an electrical port at one end,
layers of material with different impedances and thicknesses, and an acoustic load at the other.
That is exactly the structure of a transmission line problem, which is why equivalent circuit
models work so well and why they are still used in preference to full simulation for a first
design.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="The stack as a chain of transmission line sections from the electrical port through backing, ceramic and matching layers to the load">
<rect class="bx" x="24" y="80" width="110" height="70" rx="4"/>
<text class="ts" x="40" y="112">electrical</text>
<text class="ts" x="40" y="134">port</text>
<rect class="bx" x="146" y="80" width="110" height="70" rx="4"/>
<text class="ts" x="162" y="112">backing</text>
<rect class="bx" x="268" y="80" width="110" height="70" rx="4"/>
<text class="ts" x="284" y="112">ceramic</text>
<rect class="bx" x="390" y="80" width="110" height="70" rx="4"/>
<text class="ts" x="406" y="112">matching</text>
<rect class="bx" x="512" y="80" width="144" height="70" rx="4"/>
<text class="ts" x="528" y="112">load</text>

<text class="ts" x="24" y="190">each layer is a transmission line section: impedance and a delay</text>
<text class="ts" x="24" y="216">the model gives impedance and pulse shape in seconds, so you can iterate</text>
</svg>

<p>The <b>Mason</b> model represents the piezoelectric element as a three-port network: two
acoustic ports, front and back, and one electrical port, with a transformer coupling them. It is
physically transparent, and it contains a negative capacitance that makes it awkward to work
with.</p>

<p>The <b>KLM</b> model rearranges the same physics into a form with the electrical port coupled
at the centre of an acoustic transmission line. It is the one most design tools use, because the
layers on either side simply become further transmission line sections and the whole stack
composes naturally.</p>

<p>What you get out is the <b>electrical impedance</b> against frequency and the <b>impulse
response</b>, which are precisely the two things you need. The impedance tells you what the pulser
has to drive and what tuning network is needed; the impulse response tells you the bandwidth and
the pulse length.</p>

<p>The value of the model is the speed of iteration. Changing a matching layer's impedance or
thickness, or the backing's impedance, and seeing the effect on the pulse takes seconds, so you
can explore the design space properly rather than building and measuring each option. That is
also its limitation: it is one-dimensional, so it says nothing about lateral modes, about the
element's finite width, or about crosstalk to its neighbours.</p>

<p>Those effects are exactly what a finite element model is for, and the sensible workflow uses
both: the equivalent circuit to get the stack approximately right in minutes, and finite element
to check the things the one-dimensional model cannot see before committing to tooling.</p>

<p>The other thing the model needs is <b>material data you trust</b>. Manufacturer constants are
nominal and batch variation is real, so a model matched to a measured sample of the actual
material is far more predictive than one built from a datasheet.</p>
`,
quiz: [
{ q: "Why does a transmission line model suit a transducer stack?",
o: ["The stack is electrically small", "It is a one-dimensional chain of layers with impedances and delays", "The materials are all linear", "The element is much wider than it is thick"],
a: 1, why: "Each layer is a section with an impedance and a propagation delay, so the whole stack composes exactly as a transmission line problem does." },
{ q: "What does the KLM model give you over Mason's?",
o: ["It includes lateral modes", "The electrical port couples at the centre, so layers compose naturally", "It requires fewer material constants", "It models the backing more accurately"],
a: 1, why: "Mason's form is physically transparent but contains an awkward negative capacitance. KLM rearranges the same physics into a more usable form." },
{ q: "What are the two useful outputs of a stack model?",
o: ["Beam width and depth of field", "Electrical impedance and impulse response", "Sensitivity and Curie temperature", "Radiation pattern and sidelobe level"],
a: 1, why: "Impedance tells you what the pulser must drive and what tuning is needed; the impulse response gives bandwidth and pulse length." },
{ q: "What can a one-dimensional stack model not tell you?",
o: ["The bandwidth of the stack", "Lateral modes, finite element width and crosstalk", "The effect of the backing impedance", "The matching layer thickness required"],
a: 1, why: "Those need a finite element model, which is why the sensible workflow uses the fast one-dimensional model first and finite element to check before tooling." }
],
interview: {
q: "How would you design a transducer stack for a given bandwidth?",
a: "I would start with a one-dimensional equivalent circuit model, most likely KLM, because the stack really is a chain of transmission line sections: an electrical port, the backing, the piezoelectric element, one or more matching layers and the acoustic load, each with an impedance and a delay. The model gives me the electrical impedance against frequency and the impulse response, which are exactly the two things I need, and it runs in seconds so I can iterate properly rather than building each option. Working through it, the element thickness sets the resonance, the matching layers transform the element's roughly thirty MRayl down towards the load, with a single quarter-wave layer at the geometric mean as the starting point and two layers if I need more bandwidth, and the backing impedance sets how heavily the element is damped. That backing is the main bandwidth lever and it trades directly against sensitivity, since a heavily damping backing absorbs the rearward radiation instead of reflecting it, which shortens the pulse and throws away half the energy. Where I sit on that trade should follow from whether the application needs resolution or penetration. Two things I would be careful about. The model is one-dimensional, so it tells me nothing about lateral modes, the finite width of the element, or crosstalk to neighbours in an array, and those are what a finite element model is for, so I would use the circuit model to get close quickly and finite element to check before committing to tooling. And the model is only as good as the material constants, which are nominal on a datasheet and vary between batches, so I would want the model matched against a measured sample of the actual material before I trusted its predictions."
}
},

{
id: "ac-bandwidth",
track: "Acoustics",
sub: "Transducers and materials",
title: "Bandwidth, Q and the shape of the pulse",
mins: 20,
body: `
<p>Bandwidth and pulse length are the same property seen from two directions. A short pulse has
a broad spectrum and a long ringing one has a narrow spectrum, and which you want follows
directly from whether you are resolving in time or measuring at a frequency.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A short broadband pulse against a long narrowband one, with their spectra beneath">
<rect class="bxa" x="24" y="24" width="308" height="34" rx="4"/>
<text class="th" x="40" y="47">heavily damped</text>
<rect class="bx" x="24" y="70" width="308" height="150" rx="4"/>
<text class="ts" x="40" y="98">short pulse, one or two cycles</text>
<text class="ts" x="40" y="124">wide spectrum</text>
<text class="th" x="40" y="162">good axial resolution</text>
<text class="ts" x="40" y="192">lower sensitivity</text>

<rect class="bxa" x="348" y="24" width="308" height="34" rx="4"/>
<text class="th" x="364" y="47">lightly damped</text>
<rect class="bx" x="348" y="70" width="308" height="150" rx="4"/>
<text class="ts" x="364" y="98">long ringing pulse</text>
<text class="ts" x="364" y="124">narrow spectrum</text>
<text class="th" x="364" y="162">high sensitivity</text>
<text class="ts" x="364" y="192">poor axial resolution</text>
</svg>

<p><b>Axial resolution</b> is roughly half the spatial pulse length, so two reflectors closer
than that merge. Since the pulse length is the number of cycles times the wavelength, resolution
improves both by raising the frequency and by shortening the pulse, and the second is what
bandwidth buys you.</p>

<p>Bandwidth is usually quoted as the <b>fractional bandwidth</b> at minus six decibels: the
width of the spectrum divided by the centre frequency. Around thirty percent is a lightly damped
narrowband probe, seventy percent or more is a well-damped broadband one, and above a hundred
percent requires single crystal or a very good composite.</p>

<p>The trade is with <b>sensitivity</b>, because damping is exactly what removes energy. A
narrowband transducer rings, and that ringing is energy being usefully radiated over many
cycles, so it is more sensitive at its centre frequency. Choosing between them is choosing
between seeing something small and resolving two things close together.</p>

<p>Which is right depends on the job. A thickness gauge measuring a thin wall needs a short
pulse or the front and back echoes overlap. A flaw detector working through an attenuating
material may need the sensitivity more. A Doppler system deliberately uses long narrowband
bursts, because frequency resolution is what it measures.</p>

<p>Two practical points about the pulse itself. The <b>excitation</b> matters as much as the
stack: a single narrow spike excites the whole band, while a tone burst of several cycles
deliberately narrows it, so the same probe can be operated broadband or narrowband from the
pulser. And because attenuation is frequency dependent, the received pulse is not the transmitted
one: the high frequencies are absorbed preferentially, so the centre frequency <b>downshifts</b>
with depth and the pulse lengthens as it travels.</p>
`,
quiz: [
{ q: "What does axial resolution depend on?",
o: ["The aperture width", "The spatial pulse length, so roughly the bandwidth", "The number of elements", "The focal depth"],
a: 1, why: "Two reflectors closer than about half the pulse length merge, so resolution improves with frequency and with shorter pulses." },
{ q: "What does heavy damping trade?",
o: ["Frequency against depth", "Sensitivity against bandwidth", "Beam width against sidelobes", "Cost against durability"],
a: 1, why: "Damping removes energy, so a narrowband probe rings and is more sensitive at its centre frequency while resolving worse in depth." },
{ q: "Why does a Doppler system use long narrowband bursts?",
o: ["To penetrate deeper", "Because frequency resolution is what it measures", "To reduce the peak drive voltage", "To avoid exciting lateral modes"],
a: 1, why: "It is measuring a frequency shift, so it wants the spectrum narrow, which is the opposite requirement to a thickness gauge resolving two close echoes." },
{ q: "Why does the received pulse differ from the transmitted one?",
o: ["The receiver filters it deliberately", "Attenuation is frequency dependent, so the centre frequency downshifts", "The transducer resonates differently on receive", "The pulse is compressed by the medium"],
a: 1, why: "High frequencies are absorbed preferentially, so the pulse lengthens and shifts down as it propagates, which matters for any amplitude correction." }
],
interview: {
q: "A customer wants both better resolution and better penetration. How do you handle that?",
a: "I would explain that those pull in opposite directions through two separate mechanisms, and then find out which one actually binds. On frequency, raising it improves both axial and lateral resolution and increases attenuation, and in a scattering material it also raises grain noise as the fourth power, so there is an optimum rather than a monotonic improvement, and I would find it by sweeping frequency against signal-to-noise on a known reflector rather than picking from a table. On bandwidth, axial resolution is about half the spatial pulse length, so a short broadband pulse resolves well, but shortening the pulse means damping the element heavily and damping is exactly what removes energy, so sensitivity falls. A narrowband probe rings and radiates over many cycles, which is why it is more sensitive at its centre frequency and why it resolves poorly. So the honest answer is that at a fixed frequency I am choosing between seeing something small and separating two things that are close together. Where I can make progress is by changing the problem rather than the trade. If penetration is limited by noise rather than by attenuation, then coded excitation, a chirp or a Barker sequence compressed on receive, gives me the energy of a long pulse and the resolution of a short one, which genuinely decouples them. If it is limited by grain noise, then compounding decorrelates the speckle without costing frequency. And I would check the couplant and the matching, because a poor interface can cost more sensitivity than any of these choices would recover."
}
},

{
id: "ac-charac",
track: "Acoustics",
sub: "Transducers and materials",
title: "Characterising a transducer you did not make",
mins: 20,
body: `
<p>A datasheet gives you nominal figures. What you actually have is a specific probe that has
been used, dropped, warmed and aged, and any quantitative measurement rests on knowing its real
behaviour rather than its nominal one.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Four characterisation measurements: electrical impedance, pulse-echo response from a flat reflector, beam profile in a tank, and hydrophone measurement of the field">
<rect class="bx" x="24" y="30" width="632" height="44" rx="4"/>
<text class="th" x="40" y="52">electrical impedance sweep</text>
<text class="ts" x="290" y="52">resonance, damping, and whether it has changed</text>
<rect class="bx" x="24" y="82" width="632" height="44" rx="4"/>
<text class="th" x="40" y="104">pulse-echo from a flat plate</text>
<text class="ts" x="290" y="104">centre frequency, bandwidth, pulse length</text>
<rect class="bx" x="24" y="134" width="632" height="44" rx="4"/>
<text class="th" x="40" y="156">beam profile in a tank</text>
<text class="ts" x="290" y="156">focus, beam width, near field length</text>
<rect class="bx" x="24" y="186" width="632" height="44" rx="4"/>
<text class="th" x="40" y="208">hydrophone scan</text>
<text class="ts" x="290" y="208">absolute pressure, for safety or for calibration</text>
</svg>

<p>The <b>electrical impedance sweep</b> is the cheapest and most informative single measurement.
It shows the resonance and antiresonance, from which the coupling factor follows, and it shows
how heavily damped the element is. It is also the best routine health check, because a
delaminated matching layer, a cracked element or a broken connection all change the impedance
curve visibly, long before the probe stops working entirely.</p>

<p>The <b>pulse-echo response</b> from a flat reflector in water gives you the working numbers:
centre frequency, fractional bandwidth and pulse length, measured as the system will actually use
them. That matters because the pulser and the receiver are part of the answer, so a probe
characterised on one instrument is not fully characterised for another.</p>

<p>The <b>beam profile</b>, measured by scanning a small reflector or a hydrophone through the
field, gives the focal depth, the beam width and the near field length. This is where a probe
frequently disagrees with its datasheet, particularly for focal depth, and it matters because
every amplitude comparison assumes you know where the beam is.</p>

<p>A <b>hydrophone</b> gives absolute pressure, which the other methods do not. That is what you
need for an acoustic output measurement against a safety limit, and for any measurement that has
to be traceable, and it requires a calibrated hydrophone with its own certificate.</p>

<p>For an array there is one more essential step: measure <b>element to element</b> consistency.
Sensitivity and phase variation degrade the beam exactly as a geometry error does, and a dead or
weak element is a permanent aperture error. Any array system should have a built-in element check
and should log it, because a probe degrades gradually rather than failing.</p>

<p>The practice that makes all of this useful is to record the characterisation when the probe is
new and repeat it periodically. An absolute number is hard to interpret; the same number drifting
over six months is unambiguous.</p>
`,
quiz: [
{ q: "What does an electrical impedance sweep reveal?",
o: ["The absolute acoustic output", "Resonance, damping, and changes such as delamination", "The beam width at the focus", "The attenuation of the couplant"],
a: 1, why: "It is the cheapest and most informative single measurement, and the best routine health check because faults change the curve before the probe stops working." },
{ q: "Why is a probe's pulse-echo response instrument dependent?",
o: ["The reflector changes the spectrum", "The pulser and receiver are part of the measured response", "Water attenuation varies with the tank", "The probe warms up during the test"],
a: 1, why: "A probe characterised on one instrument is not fully characterised for another, which matters when comparing measurements between systems." },
{ q: "What does a hydrophone give that pulse-echo does not?",
o: ["Better time resolution", "Absolute pressure, traceable to a calibration", "The electrical impedance", "The element-to-element variation"],
a: 1, why: "That is what an acoustic output measurement against a safety limit requires, and it needs a calibrated hydrophone with its own certificate." },
{ q: "Why measure element-to-element consistency on an array?",
o: ["To check the pitch is correct", "Sensitivity and phase variation degrade the beam like a geometry error", "To determine the centre frequency", "To verify the matching layer thickness"],
a: 1, why: "A dead or weak element is a permanent aperture error, and probes degrade gradually, so the check should be built in and logged." }
],
interview: {
q: "You are handed an unfamiliar probe and asked to make quantitative measurements with it. What do you do first?",
a: "I would characterise it rather than trust the datasheet, because what I have is a specific probe that has been used, possibly dropped, and has aged, and the datasheet gives nominal figures for a new one. My first measurement would be an electrical impedance sweep, because it is quick and it tells me a great deal: the resonance and antiresonance, from which the coupling factor follows, and how heavily damped it is. It is also the measurement that reveals damage, since a delaminated matching layer, a cracked element or a bad connection all change the impedance curve visibly well before the probe stops working. Then a pulse-echo response from a flat plate in water to get the working numbers, centre frequency, fractional bandwidth and pulse length, measured through the actual pulser and receiver I will be using, because those are part of the response and a probe characterised on one instrument is not characterised for another. Then a beam profile, scanning a small reflector or a hydrophone through the field, to get the focal depth, beam width and near field length, and that is the measurement where probes most often disagree with their datasheet. That matters because every amplitude comparison I make assumes I know where the beam is. If I need absolute pressure, for an output safety measurement or anything traceable, then I need a calibrated hydrophone, since none of the other methods give me an absolute number. If it is an array I would also measure element-to-element sensitivity and phase, because variation degrades the beam exactly as a geometry error does and a weak element is a permanent aperture error. And I would record all of it as a baseline and repeat it periodically, because an absolute number is hard to judge whereas the same number drifting over months is unambiguous."
}
},

{
id: "ac-composite",
track: "Acoustics",
sub: "Transducers and materials",
title: "Composites: why almost every modern probe uses one",
mins: 20,
body: `
<p>Solid PZT has two properties that make it awkward: an acoustic impedance around 30 MRayl
against water's 1.5, and lateral modes that couple energy sideways. A piezocomposite fixes both
at once, which is why it displaced solid ceramic in almost every imaging probe.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Pillars of ceramic embedded in a polymer matrix, giving a lower effective impedance and suppressing lateral modes">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">1-3 composite: ceramic pillars in a polymer matrix</text>

<rect class="bx" x="120" y="80" width="30" height="110" rx="2"/>
<rect class="bx" x="180" y="80" width="30" height="110" rx="2"/>
<rect class="bx" x="240" y="80" width="30" height="110" rx="2"/>
<rect class="bx" x="300" y="80" width="30" height="110" rx="2"/>
<rect class="bx" x="360" y="80" width="30" height="110" rx="2"/>
<rect class="bx" x="420" y="80" width="30" height="110" rx="2"/>
<rect class="bx" x="480" y="80" width="30" height="110" rx="2"/>
<text class="ts" x="120" y="212">pillars: the ceramic, poled through thickness</text>
<text class="ts" x="120" y="70">polymer fills the gaps</text>
</svg>

<p>A <b>1-3 composite</b> is an array of ceramic pillars, connected in one dimension, embedded in
a polymer matrix connected in three. The pillars do the piezoelectric work and the polymer holds
them together and decouples them laterally.</p>

<p>The <b>effective acoustic impedance</b> becomes a volume-weighted combination of ceramic and
polymer, so a composite with sixty percent ceramic sits around 15 to 20 MRayl. That is far closer
to water, so less of the energy reflects at the face and the matching layers have an easier
job.</p>

<p>The <b>coupling factor improves</b> as well, which is initially surprising given that you have
replaced some of the active material with polymer. The reason is that a slender pillar is free to
expand sideways as it contracts through its thickness, so it operates in a more favourable mode
than a laterally clamped plate of solid ceramic.</p>

<p>The third benefit is <b>lateral mode suppression</b>. In solid ceramic, energy couples
sideways and produces spurious resonances and crosstalk between array elements. The polymer
between pillars breaks that path, which both cleans up the response and reduces crosstalk in an
array.</p>

<p>The design constraint is the <b>pillar pitch</b>, which must be fine enough that the lateral
resonance of the pillar structure sits well above the operating band. Too coarse and the
composite has its own unwanted resonance in band. That pushes manufacturing towards finer dicing
as frequency rises, and it is what makes very high frequency composites difficult and
expensive.</p>

<p>The costs are manufacturing complexity, lower dielectric constant which affects the electrical
impedance and hence the tuning, and reduced power handling because there is less ceramic. For a
high-power industrial transmitter solid ceramic may still be the right answer; for an imaging
probe the composite almost always is.</p>
`,
quiz: [
{ q: "What is a 1-3 composite?",
o: ["A stack of three matching layers", "Ceramic pillars in a polymer matrix", "Three ceramics with different frequencies", "A composite of one ceramic and three polymers"],
a: 1, why: "The pillars are connected in one dimension and the polymer in three, which is where the naming comes from." },
{ q: "Why does a composite have a lower acoustic impedance?",
o: ["The polymer absorbs the reflected energy", "It is a volume-weighted mix of ceramic and polymer", "The pillars are thinner than a solid plate", "The poling direction is different"],
a: 1, why: "Around 15 to 20 MRayl instead of 30 is far closer to water, so less energy reflects at the face and matching is easier." },
{ q: "Why does the coupling factor improve despite less active material?",
o: ["The polymer contributes piezoelectrically", "A slender pillar can expand laterally, giving a better mode", "The electric field is concentrated in the pillars", "The pillars resonate at a higher frequency"],
a: 1, why: "A laterally clamped plate of solid ceramic operates in a less favourable mode than a free-standing pillar." },
{ q: "What constrains the pillar pitch?",
o: ["The dicing blade width", "The lateral resonance must sit well above the operating band", "The polymer's curing shrinkage", "The electrode thickness"],
a: 1, why: "Too coarse a pitch puts the composite's own resonance in band, which is what makes very high frequency composites difficult and expensive." }
],
interview: {
q: "Why do modern imaging probes use piezocomposite rather than solid ceramic?",
a: "Because it fixes three problems at once. The first is impedance: solid PZT is around thirty MRayl against water at one and a half, so most of the energy reflects at the face, and a composite's effective impedance is a volume-weighted mix of the ceramic and the polymer, so something like sixty percent ceramic lands around fifteen to twenty MRayl. That is far closer to the load, so less reflects and the matching layers have a much easier job. The second is that the coupling factor actually improves, which surprises people because you have replaced some of the active material with polymer. The reason is that a slender ceramic pillar is free to expand sideways as it contracts through its thickness, whereas a plate of solid ceramic is laterally clamped, so the pillar operates in a more favourable mode. Better coupling means I can damp harder for bandwidth and still keep sensitivity. The third is lateral mode suppression: in solid ceramic, energy couples sideways and gives spurious resonances and crosstalk between array elements, and the polymer between the pillars breaks that path, which cleans up the response and cuts array crosstalk. The design constraint is the pillar pitch, which has to be fine enough that the lateral resonance of the pillar structure sits well above the operating band, and that is what makes very high frequency composites hard and expensive to make. The costs are manufacturing complexity, a lower dielectric constant which changes the electrical impedance and therefore the tuning network, and reduced power handling because there is simply less ceramic, which is why a high-power industrial transmitter might still use solid ceramic."
}
},

{
id: "ac-noncontact",
track: "Acoustics",
sub: "Transducers and materials",
title: "Non-contact methods: EMAT, air-coupled and laser",
mins: 20,
body: `
<p>Every contact measurement depends on a couplant, and the couplant is the least controlled
part of the chain: it varies with pressure, temperature, surface condition and operator. Removing
it entirely is attractive, and there are three established ways, each paying for it
differently.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="EMAT, air-coupled and laser ultrasound compared on how they generate sound, their sensitivity penalty and their constraints">
<rect class="bx" x="24" y="30" width="200" height="180" rx="4"/>
<text class="th" x="40" y="58">EMAT</text>
<text class="ts" x="40" y="86">Lorentz force in a</text>
<text class="ts" x="40" y="108">conductive surface</text>
<text class="th" x="40" y="146">conductors only</text>
<text class="ts" x="40" y="176">tens of dB down</text>
<text class="ts" x="40" y="198">very small standoff</text>

<rect class="bx" x="240" y="30" width="200" height="180" rx="4"/>
<text class="th" x="256" y="58">air-coupled</text>
<text class="ts" x="256" y="86">ordinary transducer,</text>
<text class="ts" x="256" y="108">air as the couplant</text>
<text class="th" x="256" y="146">any material</text>
<text class="ts" x="256" y="176">enormous mismatch</text>
<text class="ts" x="256" y="198">low frequency only</text>

<rect class="bx" x="456" y="30" width="200" height="180" rx="4"/>
<text class="th" x="472" y="58">laser</text>
<text class="ts" x="472" y="86">thermoelastic or</text>
<text class="ts" x="472" y="108">ablative generation</text>
<text class="th" x="472" y="146">true standoff</text>
<text class="ts" x="472" y="176">broadband</text>
<text class="ts" x="472" y="198">expensive, safety case</text>
</svg>

<p>An <b>EMAT</b> uses a coil and a magnet to induce eddy currents in a conductive surface; the
Lorentz force on those currents generates the wave directly in the material. There is no couplant
and it works on hot, rough or moving surfaces, which is why it appears in steel mills. It only
works on conductors, its efficiency is very low so it is tens of decibels below a contact probe,
and the standoff must be a fraction of a millimetre because the coupling falls off steeply.</p>

<p><b>Air-coupled</b> transduction uses an ordinary transducer with air as the couplant, and the
difficulty is arithmetic: the impedance mismatch between air and any solid gives a transmission
loss of the order of a hundred decibels at each interface. Practical systems use low frequencies,
heavily matched transducers, high transmit voltages and a great deal of averaging, and they work
best in through-transmission on relatively soft materials such as composites and foams.</p>

<p><b>Laser ultrasound</b> generates the wave optically. At low power the absorbed pulse heats
the surface and thermal expansion launches an elastic wave, which is non-destructive; at higher
power a small amount of material ablates and the recoil generates a much stronger wave, which is
not. Detection is usually interferometric. It gives genuine standoff, works on almost any
material, and produces very broadband pulses, at the cost of expense, complexity and a laser
safety case.</p>

<p>The common thread is that each buys freedom from the couplant with sensitivity, cost or
applicability. The right question is therefore not which is best but what the coupling problem is
actually costing: if repeatability is limited by operator-to-operator variation in a hand-applied
gel layer, immersion may solve it far more cheaply than any of these.</p>
`,
quiz: [
{ q: "How does an EMAT generate ultrasound?",
o: ["By heating the surface with a coil", "Lorentz force on eddy currents induced in a conductor", "By magnetostriction in the transducer", "By direct mechanical contact through a wear plate"],
a: 1, why: "It works on hot, rough or moving surfaces with no couplant, which is why it appears in steel mills, and it only works on conductors." },
{ q: "Why is air-coupled ultrasound so difficult?",
o: ["Air attenuates ultrasound completely", "The impedance mismatch gives about a hundred decibels loss per interface", "Air-coupled transducers cannot be focused", "The sound speed in air is too variable"],
a: 1, why: "Practical systems use low frequencies, heavy matching, high drive and averaging, and work best in through-transmission on softer materials." },
{ q: "What is the difference between thermoelastic and ablative laser generation?",
o: ["One uses a pulsed laser and one continuous", "Ablative removes material, so it is not non-destructive", "Thermoelastic requires a reflective surface", "Ablative works only on metals"],
a: 1, why: "Thermoelastic heating expands the surface and launches a wave without damage; ablation gives a much stronger signal by removing a little material." },
{ q: "What do all three non-contact methods trade for removing the couplant?",
o: ["Bandwidth in every case", "Sensitivity, cost or applicability", "Time resolution", "The ability to measure thickness"],
a: 1, why: "The right question is what the coupling problem is actually costing, since immersion may solve a repeatability problem far more cheaply." }
],
interview: {
q: "You need to inspect hot steel on a production line. What approach would you take?",
a: "Hot and moving rules out a contact probe with a gel couplant immediately, so I would look at EMAT first, because it is the method that suits exactly this case. An EMAT uses a coil and a magnet to induce eddy currents in the steel and the Lorentz force on those currents generates the wave directly in the material, so there is no couplant at all and it tolerates a hot, rough, scaled or moving surface. It also generates shear waves easily, which is useful. What I would design around is its weaknesses. Efficiency is very low, so the signal is tens of decibels below what a contact probe would give, which means averaging, careful electronics and a good low-noise front end. The standoff has to be a fraction of a millimetre because the coupling falls off steeply, so the mechanical design of the carriage matters as much as the transducer, and on a moving line that is the hard engineering. And the magnet's field and the Curie temperature of the material both become relevant at high temperature. I would also confirm the material is conductive enough, which for steel it is. If EMAT could not give me the sensitivity, the alternatives get worse rather than better: air-coupled is essentially impossible into steel because the impedance mismatch costs around a hundred decibels at each interface, and laser ultrasound would work and gives true standoff and a broadband pulse, but it brings cost, complexity and a laser safety case on a production line. Before any of that, though, I would check whether the process could tolerate a local cooled and coupled measurement station instead, because solving it mechanically is often cheaper than solving it acoustically."
}
}

);
