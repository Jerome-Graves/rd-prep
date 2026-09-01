// Electronics lessons: signal integrity and high speed, an area the track had
// no coverage of at all.

LESSONS.push(

{
id: "el-txline",
track: "Electronics",
sub: "Signal integrity and high speed",
title: "When a trace becomes a transmission line",
mins: 22,
body: `
<p>Every trace is a transmission line. The question is only whether it behaves like one over the
timescales you care about, and the answer depends on the <b>edge rate</b> rather than the clock
frequency.</p>

<p>The rule of thumb is that a trace behaves as a lumped connection if the signal's rise time is
long compared with the round-trip propagation delay along it. Once the rise time is comparable
with or shorter than that round trip, the reflection arrives while the edge is still happening
and you have to think in terms of waves.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A short trace where the reflection returns during the edge, against a long one where it returns afterwards as a visible step">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">the edge rate decides, not the clock frequency</text>

<rect class="bx" x="24" y="72" width="308" height="150" rx="4"/>
<text class="th" x="40" y="98">round trip shorter than the edge</text>
<text class="ts" x="40" y="128">the reflection merges into</text>
<text class="ts" x="40" y="150">the rising edge</text>
<text class="ts" x="40" y="184">looks like a slightly</text>
<text class="ts" x="40" y="206">slower edge: harmless</text>

<rect class="bx" x="348" y="72" width="308" height="150" rx="4"/>
<text class="th" x="364" y="98">round trip longer than the edge</text>
<text class="ts" x="364" y="128">the reflection arrives after</text>
<text class="ts" x="364" y="150">the edge has settled</text>
<text class="ts" x="364" y="184">a visible step or ring:</text>
<text class="ts" x="364" y="206">this is what breaks things</text>
</svg>

<p>On ordinary board material a signal travels at roughly 15 centimetres per nanosecond in a
stripline, so a 10 centimetre trace has a round trip of about 1.3 nanoseconds. A modern logic
family with a 1 nanosecond edge is therefore already in transmission line territory on a trace
that short, and it is in that territory whether the data rate is a megahertz or a hundred.</p>

<p>That last point is the one that catches people. A slow bus driven by a fast driver has
signal integrity problems, because the driver's edge rate is a property of the silicon rather
than of your clock. A one megahertz signal with a half nanosecond edge reflects exactly as
badly as a fast one.</p>

<p><b>Characteristic impedance</b> is set by the geometry: the trace width, its thickness, the
height above the reference plane, and the dielectric constant between them. It is not a property
of the length. Changing layers changes the height above the plane, so the width must change too
if the impedance is to stay constant, which is why a controlled-impedance stackup is a
manufacturing specification rather than a layout preference.</p>

<p>The practical consequence for design is that you decide early, not late. Whether a net needs
controlled impedance, what that impedance is, and which layers it may use, all feed into the
stackup, and the stackup is agreed with the fabricator before routing rather than after.</p>
`,
quiz: [
{ q: "What decides whether a trace behaves as a transmission line?",
o: ["The clock frequency", "The edge rate compared with the round-trip delay", "The trace length alone", "The current it carries"],
a: 1, why: "A slow bus driven by a fast driver has the same reflection problems, because the edge rate is a property of the silicon rather than of your clock." },
{ q: "What sets a trace's characteristic impedance?",
o: ["Its length and the operating frequency", "Width, thickness, height above the plane and the dielectric", "The copper weight alone", "The driver's output impedance"],
a: 1, why: "It is geometry, not length. Changing layers changes the height above the plane, so the width must change to keep the impedance constant." },
{ q: "Roughly how fast does a signal travel in a stripline on FR4?",
o: ["About 30 centimetres per nanosecond", "About 15 centimetres per nanosecond", "About 3 centimetres per nanosecond", "It depends only on the trace width"],
a: 1, why: "So a 10 centimetre trace has a round trip near 1.3 nanoseconds, which puts a 1 nanosecond edge into transmission line territory already." },
{ q: "Why is a controlled-impedance stackup a manufacturing specification?",
o: ["The fabricator chooses the dielectric constant", "Impedance depends on the layer geometry, which the fabricator builds", "It affects the number of layers required", "Only the fabricator can measure impedance"],
a: 1, why: "The trace width for a target impedance depends on the height above the plane and the material, so it has to be agreed before routing rather than after." }
],
interview: {
q: "How do you decide whether a trace needs to be treated as a transmission line?",
a: "I compare the signal's rise time against the round-trip propagation delay of the trace, not the clock frequency against anything. If the round trip is short compared with the edge, the reflection comes back while the edge is still rising and simply merges into it, so the trace behaves as a lumped connection. Once the round trip is comparable with or longer than the rise time, the reflection arrives after the edge has settled and appears as a step or a ring, and that is what actually breaks things. On ordinary board material a signal travels at roughly fifteen centimetres per nanosecond in a stripline, so a ten centimetre trace is about one and a third nanoseconds round trip, and a logic family with a one nanosecond edge is already in transmission line territory at that length. The point I would emphasise is that this is about the driver, not the data rate. A one megahertz bus driven by a part with a half nanosecond edge reflects exactly as badly as a fast one, because the edge rate is a property of the silicon. That is why slow buses on modern parts often need series termination that nobody expected. Practically it means the decision has to be made early: which nets need controlled impedance, what that impedance is, and which layers they may use, all feed into the stackup, and the stackup is something I agree with the fabricator before routing rather than discover afterwards, because the trace width for a given impedance depends on the height above the reference plane and the dielectric."
}
},

{
id: "el-si",
track: "Electronics",
sub: "Signal integrity and high speed",
title: "Reflections, termination and topology",
mins: 22,
body: `
<p>A reflection happens wherever the impedance changes. The fraction reflected is the mismatch
divided by the sum of the two impedances, so an open circuit reflects everything in phase and a
short reflects everything inverted.</p>

<p>A typical CMOS driver has an output impedance well below the trace's, and the receiver is
close to an open circuit. So the edge launches, travels, reflects almost entirely off the
receiver, comes back, reflects off the driver with the opposite sign, and the result is the
ringing everyone recognises on a scope.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Series termination at the driver, parallel termination at the receiver, and AC termination, with what each costs">
<rect class="bx" x="24" y="30" width="200" height="180" rx="4"/>
<text class="th" x="40" y="58">series, at the driver</text>
<text class="ts" x="40" y="86">resistor brings the</text>
<text class="ts" x="40" y="108">source up to Z0</text>
<text class="th" x="40" y="148">no DC current</text>
<text class="ts" x="40" y="178">point to point only</text>

<rect class="bx" x="240" y="30" width="200" height="180" rx="4"/>
<text class="th" x="256" y="58">parallel, at the end</text>
<text class="ts" x="256" y="86">resistor to a rail</text>
<text class="ts" x="256" y="108">absorbs the wave</text>
<text class="th" x="256" y="148">works with stubs</text>
<text class="ts" x="256" y="178">burns DC power</text>

<rect class="bx" x="456" y="30" width="200" height="180" rx="4"/>
<text class="th" x="472" y="58">AC termination</text>
<text class="ts" x="472" y="86">resistor plus capacitor</text>
<text class="ts" x="472" y="108">at the far end</text>
<text class="th" x="472" y="148">no DC current</text>
<text class="ts" x="472" y="178">extra part, and a pole</text>
</svg>

<p><b>Series termination</b> is the usual answer for a point-to-point net. A resistor at the
driver, chosen so that the driver's output impedance plus the resistor equals the line
impedance, absorbs the returning reflection. The launched edge is only half amplitude while it
travels, and it doubles at the open-circuit receiver, which is why the receiver sees a full
swing and any stub along the way does not.</p>

<p>That last clause is the limitation: series termination only works properly for a single load
at the far end. A branch part way along sees the half-amplitude wave and may sit in the logic
threshold's forbidden region for a whole round trip.</p>

<p><b>Parallel termination</b> at the receiver absorbs the wave when it arrives, so nothing
reflects and stubs are far less troublesome. It costs steady current through the terminator,
which for a wide bus is real power, and that is why AC termination, a resistor in series with a
capacitor, exists as a compromise.</p>

<p><b>Topology</b> matters as much as the terminator. A star with several branches from one
point has a reflection at the junction because the driver sees the branches in parallel. A daisy
chain with short stubs is generally better, and the length of those stubs is the thing to
control, since a stub is an unterminated transmission line that resonates.</p>

<p>The practical route for anything fast is to simulate before routing. The models exist, the
simulation takes minutes, and the alternative is discovering the problem on a board that is
already made.</p>
`,
quiz: [
{ q: "Why does a CMOS output ring on a long trace?",
o: ["The driver oscillates under capacitive load", "Its output impedance is far below the line's, so reflections bounce repeatedly", "The receiver draws too much current", "The trace acts as an antenna"],
a: 1, why: "The edge reflects almost entirely off the open-circuit receiver and again off the low-impedance driver, with the opposite sign each time." },
{ q: "Why is the launched edge only half amplitude with series termination?",
o: ["The resistor divides against the line impedance", "The driver cannot supply full current", "The receiver loads the line", "Half the energy is radiated"],
a: 1, why: "It doubles at the open-circuit receiver, so the far end sees a full swing. That is exactly why a mid-line stub sees only half and may sit in the forbidden region." },
{ q: "When is parallel termination worth its power cost?",
o: ["On any point-to-point net", "When there are stubs or several loads on the line", "When the driver is weak", "When the trace is very short"],
a: 1, why: "It absorbs the wave on arrival so nothing reflects, which is what makes stubs tolerable. Series termination only works properly for a single far-end load." },
{ q: "What is the problem with a star topology at speed?",
o: ["The branches have different lengths", "The driver sees the branches in parallel, so the junction reflects", "Star topologies cannot be terminated", "It requires more layers to route"],
a: 1, why: "A daisy chain with short controlled stubs is generally better, since a stub is an unterminated line that resonates." }
],
interview: {
q: "You see ringing on a clock line. How do you fix it?",
a: "Ringing means reflections, so I would first confirm that is what I am looking at rather than a measurement artefact, because a long ground lead on a scope probe produces something that looks very similar; I would use a spring ground tip and check whether the frequency of the ring tracks the trace length. Assuming it is real, the cause is an impedance mismatch: a CMOS driver has an output impedance well below the line's and the receiver is close to an open circuit, so the edge reflects almost entirely at the far end, comes back and reflects off the driver with the opposite sign, and it does that repeatedly. For a point-to-point clock the standard fix is series termination at the driver, a resistor chosen so the driver's output impedance plus the resistor equals the line impedance, which absorbs the returning reflection. I would put it physically at the driver, because a resistor part way along does not do the job. The thing I would check before choosing that is the topology, because series termination relies on the launched wave being half amplitude while it travels and doubling at the open-circuit far end, so if there is a load or a branch part way along it sees only half the swing and can sit in the logic threshold's forbidden region for a whole round trip. If the clock does fan out to several places, then either I buffer it so each destination is point to point, or I use parallel or AC termination at the ends and accept the power, or I use a daisy chain with deliberately short stubs. And for anything genuinely fast I would simulate before routing rather than after, because the models exist and it takes minutes, and the alternative is finding out on a board that has already been made."
}
},

{
id: "el-crosstalk",
track: "Electronics",
sub: "Signal integrity and high speed",
title: "Crosstalk and the return path",
mins: 22,
body: `
<p>Crosstalk is energy coupled from one net into another, and it comes in two forms that behave
differently. Understanding both explains most layout rules that otherwise look arbitrary.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="An aggressor trace coupling into a victim, with near-end crosstalk travelling back towards the source and far-end crosstalk travelling with the signal">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">an edge on the aggressor couples into the victim</text>

<line class="ln" x1="60" y1="110" x2="620" y2="110"/>
<text class="ts" x="60" y="100">aggressor</text>
<line class="ln" x1="60" y1="160" x2="620" y2="160"/>
<text class="ts" x="60" y="182">victim</text>

<line class="ln" x1="300" y1="110" x2="300" y2="160"/>
<line class="ln" x1="380" y1="110" x2="380" y2="160"/>

<text class="th" x="80" y="215">near end: back towards</text>
<text class="th" x="80" y="235">the victim's source</text>
<text class="th" x="440" y="215">far end: travels with</text>
<text class="th" x="440" y="235">the signal, and can be worse</text>
</svg>

<p><b>Near-end</b> crosstalk travels back towards the victim's driver and lasts for the round
trip of the coupled length, so it is broad and relatively low. <b>Far-end</b> crosstalk travels
along with the aggressor's edge and accumulates over the coupled length, so it can be a narrow
spike that is larger than the near-end contribution, particularly in a microstrip where the
electric and magnetic coupling do not cancel.</p>

<p>Both scale with the <b>coupled length</b> and fall off quickly with separation. The usual
guidance of keeping traces three times the dielectric height apart comes from that fall-off, and
it is a far more useful number than a fixed distance in millimetres, because it scales with the
stackup.</p>

<p>The larger effect, and the one people underestimate, is the <b>return path</b>. At high
frequency the return current does not spread out to minimise resistance; it flows in the
reference plane directly beneath the signal, because that is the path of least inductance. Two
signals whose return currents share the same region of plane are coupled through that shared
inductance whether their traces are near each other or not.</p>

<p>That is why a <b>slot in the plane</b> is so damaging. The return current cannot cross it, so
it detours around the end, creating a large loop that both radiates and couples into everything
else routed nearby. A plane split intended to isolate analogue from digital very often makes
matters worse for exactly this reason.</p>

<p>It is also why a signal changing layers needs a nearby <b>return via</b>. The return current
has to change reference planes too, and if there is no stitching via close by it finds its way
through the nearest decoupling capacitor or the nearest via, which is a large and uncontrolled
loop.</p>

<p>The practical rules that follow are short: keep a continuous reference plane under every
signal, place a ground via beside every layer change on a fast net, never route across a plane
split, and separate parallel runs rather than shortening them, since it is the coupled length
that matters.</p>
`,
quiz: [
{ q: "How does far-end crosstalk differ from near-end?",
o: ["It is always smaller", "It travels with the signal and accumulates over the coupled length", "It only occurs in stripline", "It lasts for the round trip of the line"],
a: 1, why: "That accumulation can make it a narrow spike larger than the near-end contribution, particularly in microstrip where the two coupling mechanisms do not cancel." },
{ q: "Where does return current flow at high frequency?",
o: ["Spread across the plane to minimise resistance", "In the plane directly beneath the signal trace", "Through the nearest decoupling capacitor", "Back along the adjacent signal trace"],
a: 1, why: "Above a few tens of kilohertz inductance dominates resistance, so it takes the smallest loop, which is directly under the trace." },
{ q: "Why is a slot in the reference plane so damaging?",
o: ["It increases the plane's resistance", "The return current detours around it, creating a large loop", "It reduces the plane's capacitance to the next layer", "It prevents the plane being used for power"],
a: 1, why: "That loop radiates and couples into anything routed nearby, which is why a plane split intended to isolate analogue from digital often makes things worse." },
{ q: "Why does a fast signal changing layers need a nearby ground via?",
o: ["To reduce the via's inductance", "The return current must change reference planes too", "To keep the impedance constant through the via", "To prevent the via stub resonating"],
a: 1, why: "Without a stitching via close by, the return finds its way through the nearest capacitor or via instead, which is a large uncontrolled loop." }
],
interview: {
q: "A fast signal is coupling into a sensitive analogue line. What would you check?",
a: "I would look at the return paths before I looked at the trace spacing, because that is usually where the real coupling is. At high frequency the return current flows in the reference plane directly under the signal, since that is the path of least inductance, so two nets whose return currents share the same region of plane are coupled through that shared inductance regardless of how far apart their traces are. So the first things I would check are whether there is a continuous reference plane under both nets for their whole length, whether either crosses a split or a slot in the plane, and whether the fast net changes layers without a stitching via right beside it. A signal that changes layers has to bring its return with it, and if there is no nearby via the return goes through the nearest decoupling capacitor or the nearest via it can find, which is a large uncontrolled loop that couples into everything around it. A plane split intended to separate analogue from digital is a very common cause here, because a return current forced to detour around the end of a slot creates exactly the loop you were trying to avoid. After that I would look at the direct coupling: how long the two traces run parallel, and how far apart they are relative to the height above the plane, since the fall-off scales with that height rather than with an absolute distance. Increasing the separation buys more than shortening the run, because both near-end and far-end crosstalk scale with the coupled length. And I would think about whether the analogue net can be moved to a different layer with a plane between them, which is the most complete fix available."
}
},

{
id: "el-diffpair",
track: "Electronics",
sub: "Signal integrity and high speed",
title: "Differential pairs: what they buy and how they are spoiled",
mins: 20,
body: `
<p>A differential pair carries a signal as the difference between two conductors, and the
receiver responds only to that difference. That gives three things at once: immunity to
interference picked up equally on both, a return current that flows in the partner rather than
in the plane, and a much smaller radiated field because the two currents are equal and
opposite.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Differential mode with equal and opposite currents, against common mode where both conductors carry current in the same direction and radiate">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">differential mode</text>
<rect class="bx" x="24" y="72" width="308" height="130" rx="4"/>
<text class="ts" x="40" y="100">currents equal and opposite</text>
<text class="ts" x="40" y="126">fields largely cancel</text>
<text class="th" x="40" y="164">the wanted signal</text>
<text class="ts" x="40" y="188">rejected interference</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">common mode</text>
<rect class="bx" x="348" y="72" width="308" height="130" rx="4"/>
<text class="ts" x="364" y="100">currents in the same direction</text>
<text class="ts" x="364" y="126">fields add, and it radiates</text>
<text class="th" x="364" y="164">created by any asymmetry</text>
<text class="ts" x="364" y="188">this is what fails EMC</text>
</svg>

<p>All three benefits depend on <b>symmetry</b>, and the practical work is preserving it. Any
asymmetry converts part of the wanted differential signal into common mode, and common mode is
what radiates and what fails an emissions test.</p>

<p><b>Length matching</b> is the obvious one: a difference in length between the two conductors
means one edge arrives before the other, and during that skew the pair is momentarily common
mode. The tolerance follows from the edge rate, so it is quoted in picoseconds and converted to
millimetres using the propagation velocity rather than being a fixed number.</p>

<p>Less obvious asymmetries matter just as much. A pair that turns a corner has an inner and an
outer conductor, so a serpentine or a bend introduces skew unless it is compensated. A via pair
that is not symmetric, a connector pin-out that separates the two, or a series capacitor on one
side only will each do the same thing.</p>

<p><b>Differential impedance</b> is set by the geometry of both conductors together, including
their separation, so it is not simply twice the single-ended impedance. Tight coupling makes the
pair more immune to its surroundings and more sensitive to its own geometry; loose coupling is
easier to manufacture and relies more on the reference plane. Either is workable provided the
stackup is specified for it.</p>

<p>Finally, keep the pair together. Splitting the two conductors around an obstacle, even
briefly, breaks the coupling for that stretch, so the return current moves into the plane and
the benefits disappear exactly where the obstacle was.</p>
`,
quiz: [
{ q: "What do all of a differential pair's benefits depend on?",
o: ["The absolute impedance of each conductor", "Symmetry between the two conductors", "A continuous reference plane beneath", "The pair being routed on an inner layer"],
a: 1, why: "Any asymmetry converts wanted differential signal into common mode, and common mode is what radiates and fails an emissions test." },
{ q: "Why is length matching tolerance quoted in picoseconds?",
o: ["Because time is easier to measure than length", "The requirement follows from the edge rate, then converts to length", "Because the propagation velocity is constant", "Because the fabricator works in time units"],
a: 1, why: "The skew that matters is a fraction of the rise time, so the tolerance in millimetres depends on the propagation velocity in that stackup." },
{ q: "Why does a bend in a differential pair introduce skew?",
o: ["The impedance changes at the corner", "The inner conductor is shorter than the outer", "The coupling reduces around the corner", "The reference plane is interrupted"],
a: 1, why: "The same applies to serpentine matching, via placement and any connector that separates the two, and each needs compensating." },
{ q: "Why is differential impedance not simply twice the single-ended value?",
o: ["The reference plane carries some of the current", "The two conductors couple to each other as well as to the plane", "The dielectric constant differs between them", "The pair is measured at a different frequency"],
a: 1, why: "The separation between the conductors is part of the geometry, which is why tight and loose coupling give different results for the same trace width." }
],
interview: {
q: "What do you have to get right when routing a differential pair?",
a: "The whole value of a differential pair comes from symmetry, so almost everything I do is about preserving it. The benefits are that the receiver only responds to the difference so interference picked up equally on both is rejected, that the return current flows in the partner rather than in the plane, and that the equal and opposite currents largely cancel so it radiates far less. Every one of those depends on the two conductors being the same, and any asymmetry converts wanted differential signal into common mode, which is what radiates and what fails an emissions test. So length matching first, and I would express the tolerance in picoseconds derived from the edge rate and then convert to millimetres using the propagation velocity in that stackup, rather than using a fixed number of millimetres from a previous project. Then the less obvious asymmetries, which matter just as much: a bend makes the inner conductor shorter than the outer so it needs compensating, serpentine matching has to be done symmetrically, the via pair has to be symmetric, and a series capacitor or a connector that separates the two will each introduce skew. I would keep the pair together throughout, because splitting the conductors around an obstacle breaks the coupling for that stretch and the return current moves into the plane, so the benefits disappear exactly where the obstacle is. And on impedance, I would specify differential impedance to the fabricator as a stackup requirement, remembering it is not simply twice the single-ended value because the separation between the two conductors is part of the geometry."
}
},

{
id: "el-pdn",
track: "Electronics",
sub: "Signal integrity and high speed",
title: "The power distribution network as an impedance problem",
mins: 22,
body: `
<p>Decoupling is usually taught as a rule: a hundred nanofarads per supply pin, close to the
part. That works for slow designs and it explains nothing. The useful framing is that the power
distribution network is an <b>impedance</b> that must stay below a target across a wide band.</p>

<p>The target follows from the requirement. If the part draws a transient of a certain amplitude
and the rail may only move by a certain amount, then the impedance the network presents must be
below the ratio of those two. That single number turns decoupling into a design task with a
criterion rather than a habit.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Impedance against frequency for the regulator, bulk capacitors, ceramics and the die, each covering a band, with anti-resonances between them">
<line class="ln" x1="70" y1="60" x2="70" y2="200"/>
<line class="ln" x1="70" y1="200" x2="630" y2="200"/>
<text class="ts" x="24" y="66">Z</text>
<text class="ts" x="560" y="222">frequency</text>

<line class="ln" x1="70" y1="200" x2="630" y2="200"/>
<line class="ln" x1="70" y1="150" x2="630" y2="150"/>
<text class="ts" x="500" y="142">target impedance</text>

<line class="ln" x1="90" y1="120" x2="200" y2="170"/>
<text class="ts" x="86" y="112">regulator</text>
<line class="ln" x1="180" y1="180" x2="300" y2="160"/>
<text class="ts" x="180" y="200">bulk</text>
<line class="ln" x1="290" y1="168" x2="440" y2="176"/>
<text class="ts" x="330" y="196">ceramics</text>
<line class="ln" x1="430" y1="172" x2="600" y2="164"/>
<text class="ts" x="500" y="192">on-die</text>

<circle class="dot" cx="255" cy="140" r="5"/>
<circle class="dot" cx="420" cy="142" r="5"/>
<text class="th" x="230" y="126">anti-resonances</text>
</svg>

<p>Each element covers a band. The <b>regulator</b> holds the rail at DC and up to its loop
bandwidth, typically tens of kilohertz. <b>Bulk</b> capacitors cover from there into the low
megahertz. <b>Ceramics</b> cover the megahertz to tens of megahertz. Above that, only the
capacitance on the die itself and the plane capacitance can respond, because the inductance of
anything on the board is too large.</p>

<p>That inductance is the key point. A capacitor is only a capacitor below its self-resonant
frequency; above it, the package and mounting inductance dominate and it behaves as an inductor.
So placing a capacitor close to the pin, with short traces and vias, is not about the capacitance
at all, it is about minimising the inductance in series with it.</p>

<p><b>Anti-resonance</b> is the consequence people miss. Where one capacitor has gone inductive
and the next has not yet become effective, the two form a parallel resonance and the impedance
<i>peaks</i>, sometimes above the target. Using many identical capacitors makes that peak worse
by concentrating it; a spread of values, and a spread of package inductances, damps it.</p>

<p>The practical routine is therefore: work out the target impedance from the transient current
and the allowed ripple, choose a set of capacitors whose combined impedance stays below it across
the band, place them to minimise loop inductance, and simulate the result rather than counting
parts. A PDN simulation takes minutes and finds the anti-resonance that a count of capacitors
never will.</p>
`,
quiz: [
{ q: "What sets the target impedance of a power distribution network?",
o: ["The regulator's output impedance", "The transient current divided by the allowed rail movement", "The total capacitance fitted", "The switching frequency of the regulator"],
a: 1, why: "That single number turns decoupling into a design task with a criterion rather than a rule of thumb about parts per pin." },
{ q: "Why must a decoupling capacitor be physically close to the pin?",
o: ["To reduce the capacitor's own resistance", "To minimise the inductance in series with it", "To keep the trace impedance constant", "To reduce the capacitor's temperature"],
a: 1, why: "Above its self-resonant frequency the mounting and package inductance dominates, so the loop from pin to capacitor to plane is what actually matters." },
{ q: "What is anti-resonance in a PDN?",
o: ["The regulator oscillating against the bulk capacitance", "A parallel resonance between two capacitor banks, peaking the impedance", "The plane resonating at its edge frequency", "A capacitor failing to reach its rated value"],
a: 1, why: "Where one capacitor has gone inductive and the next is not yet effective, the impedance peaks. Many identical parts make it worse; a spread of values damps it." },
{ q: "Which part of the network responds above tens of megahertz?",
o: ["The bulk electrolytic capacitors", "On-die capacitance and plane capacitance", "The regulator's feedback loop", "The ceramic capacitors at the pins"],
a: 1, why: "The inductance of anything mounted on the board is too large to respond that fast, which is why package and die design set the very high frequency behaviour." }
],
interview: {
q: "How would you design the decoupling for a fast processor?",
a: "I would treat it as an impedance problem rather than a parts count. The first step is to derive a target impedance from the requirement: if the part draws a transient of a known amplitude and the rail is only allowed to move by a certain number of millivolts, then the network has to present less than the ratio of those two across the band of interest. That turns decoupling into something with a criterion I can check, rather than a habit of one hundred nanofarads per pin. Then I would think of the network as a set of elements each covering a band. The regulator holds the rail from DC up to its loop bandwidth, so tens of kilohertz. Bulk capacitance covers from there into the low megahertz. Ceramics cover megahertz to tens of megahertz. And above that only the on-die capacitance and the plane capacitance can respond, because the inductance of anything mounted on the board is too large, which is worth knowing because it bounds what I can fix at board level. The inductance point is the one I would design around: a capacitor is only a capacitor below its self-resonant frequency, and above that its mounting and package inductance dominates. So placing it close to the pin, with short traces and vias right at the pad, is about minimising the loop inductance rather than about the capacitance. Finally I would watch for anti-resonance, where one bank has gone inductive and the next is not yet effective and the impedance peaks between them, sometimes above the target. Fitting many identical capacitors makes that peak worse, and a spread of values and package sizes damps it. I would simulate the resulting impedance curve rather than count parts, because the simulation finds the peak and a parts count never will."
}
},

{
id: "el-rf",
track: "Electronics",
sub: "Signal integrity and high speed",
title: "RF fundamentals: matching, S-parameters and antennas",
mins: 22,
body: `
<p>At RF the useful abstraction changes. Voltages and currents vary along a conductor, so you
stop thinking about nodes and start thinking about <b>waves</b>: how much is transmitted, how
much reflects, and what impedance each interface presents.</p>

<svg class="fig" viewBox="0 0 680 230" role="img" aria-label="A two-port network with incident and reflected waves at each port, defining the four S-parameters">
<rect class="bx" x="250" y="70" width="180" height="90" rx="4"/>
<text class="th" x="290" y="120">network</text>

<line class="ln" x1="120" y1="95" x2="250" y2="95"/>
<text class="ts" x="130" y="86">incident</text>
<line class="ln" x1="250" y1="135" x2="120" y2="135"/>
<text class="ts" x="130" y="156">reflected: S11</text>

<line class="ln" x1="430" y1="95" x2="570" y2="95"/>
<text class="ts" x="450" y="86">transmitted: S21</text>
<line class="ln" x1="570" y1="135" x2="430" y2="135"/>
<text class="ts" x="450" y="156">incident from port 2</text>

<text class="ts" x="40" y="200">S11 is return loss, how much comes back. S21 is insertion loss or gain, how much gets through.</text>
</svg>

<p><b>S-parameters</b> describe a network in exactly those terms, and they are used because they
can actually be measured at RF, where measuring a voltage or current at a point cannot. S11 is
the reflection at port one, so it is a measure of how well matched the input is. S21 is the
transmission from port one to port two, so it is the gain or the insertion loss.</p>

<p><b>Matching</b> is the practical work. Maximum power is transferred when the load impedance is
the complex conjugate of the source, and a mismatch reflects power back rather than delivering
it. A matching network, usually a couple of reactive components in an L, pi or T arrangement,
transforms one impedance into the other over a band. Since the components are reactive it costs
bandwidth rather than power, which is why a match is always specified across a range.</p>

<p>The <b>Smith chart</b> is the tool for this, and its value is that it makes the effect of
adding a series or shunt component a simple movement along a defined arc, so a match can be
designed by hand and reasoned about visually. It is less used than it was, and it still explains
why a given network behaves as it does.</p>

<p>An <b>antenna</b> is an impedance transformer between a transmission line and free space. Its
input impedance depends on its geometry relative to the wavelength, and on everything nearby,
which is why an antenna tuned on the bench detunes when the enclosure is fitted, or when a hand
approaches it. Ground plane size is part of the antenna, not a separate thing.</p>

<p>The practical guidance for a first RF design is to use the reference design and the reference
layout, keep the ground plane continuous under the whole RF section, keep the matching components
physically adjacent to the part, and expect to tune the match on a real board with a network
analyser. Simulation gets you close, and the enclosure and the assembly move it.</p>
`,
quiz: [
{ q: "Why are S-parameters used at RF rather than impedance parameters?",
o: ["They are simpler to calculate", "They can actually be measured, unlike voltage at a point", "They apply only to matched systems", "They do not require a reference impedance"],
a: 1, why: "At RF, voltages and currents vary along a conductor, so a wave description is what a network analyser can genuinely measure." },
{ q: "What does S11 tell you?",
o: ["The gain from input to output", "How much power reflects at the input, so how well it is matched", "The noise figure of the network", "The phase shift through the network"],
a: 1, why: "S21 is the transmission term, giving gain or insertion loss. S11 is return loss and is the direct measure of match quality." },
{ q: "What does a matching network cost you?",
o: ["Power, dissipated in the components", "Bandwidth, since the components are reactive", "Noise figure at the input", "Linearity at high power"],
a: 1, why: "Reactive components store rather than dissipate, so the match holds over a band and degrades outside it. That is why a match is always specified across a range." },
{ q: "Why does an antenna detune when the enclosure is fitted?",
o: ["The enclosure attenuates the signal", "The antenna's impedance depends on everything nearby", "The cable length changes", "The ground plane is disconnected"],
a: 1, why: "Its input impedance depends on its geometry relative to the wavelength and on its surroundings, and the ground plane is part of the antenna rather than separate from it." }
],
interview: {
q: "You are adding a wireless module to a product. What do you need to get right?",
a: "I would start by using the module vendor's reference design and reference layout as literally as I can, because the RF section is the part where deviation costs the most and where I have the least ability to debug without proper equipment. The specific things that matter are the ground plane and the matching. The ground plane under the RF section has to be continuous, because it is part of the antenna and part of the return path, and any split or slot under there changes the impedance and the radiation pattern. The matching components need to be physically adjacent to the module's RF pin, with a controlled impedance track between them, because at these frequencies a few millimetres of uncontrolled track is a significant reactance. Then the antenna itself: its input impedance depends on its geometry relative to the wavelength and on everything nearby, so the keep-out area matters, and the ground plane size is part of the antenna rather than a separate thing. The practical consequence I would set expectations about early is that the antenna will detune when the enclosure is fitted, and again when a hand is near it, so the match has to be tuned on a real board in the real enclosure with a network analyser, looking at S11 to see how much power is reflecting rather than delivered. Simulation gets me close and the assembly moves it. I would also plan for the certification testing early, because a marginal design passes on the bench and fails in the chamber, and the fix at that point is a board respin."
}
}

);
