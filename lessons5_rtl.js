// RTL & Verilog: ASIC implementation.
//
// The track was entirely FPGA-facing. This is the silicon side: the flow, timing
// across corners, clock trees, design for test, physically aware RTL, and what
// tapeout actually demands.

LESSONS.push(

{
id: "rtl-asicflow",
track: "RTL & Verilog",
sub: "ASIC implementation",
title: "From RTL to GDS: the ASIC flow end to end",
mins: 24,
body: `
<p>The FPGA flow forgives a great deal because you can rebuild in an hour. The ASIC flow does not,
and the reason is economic rather than technical: a mask set costs a great deal of money and
several months, so every stage exists to catch something before it becomes silicon.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The ASIC flow from RTL through synthesis, floorplan, placement, clock tree, routing and sign-off to GDS">
<rect class="bx" x="24" y="24" width="632" height="34" rx="4"/>
<text class="th" x="40" y="46">RTL, constraints, and the library for the chosen process</text>
<rect class="bx" x="24" y="66" width="632" height="34" rx="4"/>
<text class="th" x="40" y="88">synthesis: gates, with timing estimated from wire load models</text>
<rect class="bx" x="24" y="108" width="632" height="34" rx="4"/>
<text class="th" x="40" y="130">floorplan and placement: now the wires are real</text>
<rect class="bx" x="24" y="150" width="632" height="34" rx="4"/>
<text class="th" x="40" y="172">clock tree synthesis, then routing</text>
<rect class="bxa" x="24" y="192" width="632" height="40" rx="4"/>
<text class="th" x="40" y="218">sign-off: timing, power, DRC, LVS, then GDS and no more changes</text>
</svg>

<p><b>Synthesis</b> maps RTL onto the standard cells of a specific process, guided by constraints.
The critical difference from FPGA work is that at this point wire delay is only <b>estimated</b>,
and on a modern process wires dominate, so a design that looks comfortable after synthesis
routinely does not close after placement.</p>

<p>The <b>floorplan</b> is the decision that constrains everything afterwards: where the hard
macros sit, where the pins are, how the power grid runs, how much area is given. A poor floorplan
cannot be recovered by good routing, which is why floorplanning starts long before the RTL is
finished.</p>

<p><b>Placement</b> puts the cells down and optimises against real distances, at which point the
timing picture becomes honest. <b>Clock tree synthesis</b> then builds the clock network, which
changes the timing picture again because until it happens the clock is treated as ideal, and hold
violations largely appear here. <b>Routing</b> connects everything and adds the parasitics that
make the final timing.</p>

<p>Then <b>sign-off</b>, which is a set of independent checks rather than one: static timing
across every corner, power and IR drop, physical design rules, and a comparison of the layout back
against the netlist. Formal equivalence between RTL and the final netlist is standard, because the
netlist has been through many transformations by then.</p>

<p>What this means for the RTL engineer is that the design is not finished when it simulates. The
flow will hand back timing that fails, congestion that cannot be routed, and power that exceeds
budget, and the fixes for those are usually architectural: more pipelining, different memory
organisation, a partition that keeps related logic together.</p>

<p>The other consequence is <b>iteration cost</b>. Each pass through the back end takes days, so
the discipline is to front-load: realistic constraints early, synthesis run from the first week,
and trial placements on the critical blocks long before anyone would call the RTL complete.</p>
`,
quiz: [
{ q: "Why does a design that closes timing after synthesis often fail after placement?",
o: ["Synthesis optimises differently", "Wire delay is only estimated at synthesis and dominates on modern processes", "Placement adds extra logic", "The constraints change"],
a: 1, why: "Until cells are placed, the tool works from wire load estimates, and on a modern process interconnect delay is the larger part of the path." },
{ q: "Why does floorplanning start before the RTL is finished?",
o: ["Tools require it as an input to synthesis", "A poor floorplan cannot be recovered by good routing", "It determines the process choice", "It fixes the clock frequency"],
a: 1, why: "Macro positions, pin locations, the power grid and the area given constrain everything that happens afterwards." },
{ q: "Why do hold violations largely appear at clock tree synthesis?",
o: ["Routing adds delay to data paths", "Until then the clock is treated as ideal, with no real skew", "Hold is not checked earlier", "Placement ignores hold"],
a: 1, why: "Building the real clock network introduces skew and insertion delay, which is exactly what hold timing depends on." },
{ q: "What does the ASIC flow imply for RTL work?",
o: ["The RTL is finished when it simulates correctly", "Timing, congestion and power failures come back as architectural problems", "Constraints can be written at the end", "Synthesis results are final"],
a: 1, why: "The fixes are usually more pipelining, different memory organisation or a better partition, and each back end pass costs days, so effort is front-loaded." }
],
interview: {
q: "Walk me through what happens between finished RTL and a chip.",
a: "Synthesis first, which maps the RTL onto the standard cells of a specific process under a set of constraints. The important difference from FPGA work is that wire delay at this point is only estimated from wire load models, and on a modern process interconnect dominates the path, so a design that looks comfortable after synthesis very often does not close later. In parallel with all of this there is the floorplan, which is really the decision that constrains everything: where the hard macros sit, where the pins are, how the power grid runs, how much area the block gets. A bad floorplan cannot be rescued by good routing, so that work starts long before the RTL is finished. Then placement, which puts the cells down and optimises against real distances, and that is the first honest look at timing. Then clock tree synthesis, which builds the actual clock network, and that changes the picture again, because until that point the clock has been treated as ideal, so real skew and insertion delay appear and that is where most hold violations show up. Then routing, which connects everything and produces the parasitics that give the final timing. After that comes sign-off, which is several independent checks rather than one: static timing across all the process, voltage and temperature corners and operating modes, power and IR drop, physical design rules, a comparison of the layout back against the netlist, and formal equivalence between the RTL and the final netlist, because by then the netlist has been through a great many transformations. Then GDS and no more changes. What that means for me as an RTL engineer is that the design is not done when it simulates. The back end will hand me timing failures, congestion I cannot route and power over budget, and the fixes are usually architectural rather than local, so I would want synthesis running from the first week and trial placements on the critical blocks long before anyone would call the RTL complete."
}
},

{
id: "rtl-sta",
track: "RTL & Verilog",
sub: "ASIC implementation",
title: "Timing in silicon: corners, derating and modes",
mins: 24,
body: `
<p>Static timing analysis checks every path in the design against setup and hold without needing
stimulus, which is what makes it exhaustive. The part that separates silicon from FPGA work is
that it has to hold not for one condition but for every combination of process, voltage,
temperature and operating mode.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Setup limited by the slow corner and hold by the fast corner, checked across every mode">
<rect class="bx" x="24" y="26" width="308" height="96" rx="4"/>
<text class="th" x="40" y="52">setup: is data early enough</text>
<text class="ts" x="40" y="78">worst at the slow corner</text>
<text class="ts" x="40" y="102">fixed by pipelining or effort</text>
<rect class="bxa" x="348" y="26" width="308" height="96" rx="4"/>
<text class="th" x="364" y="52">hold: does data stay long enough</text>
<text class="ts" x="364" y="78">worst at the fast corner</text>
<text class="ts" x="364" y="102">fixed by inserting delay</text>

<rect class="bx" x="24" y="138" width="632" height="42" rx="4"/>
<text class="th" x="40" y="164">every corner times every mode, all must pass</text>
<rect class="bx" x="24" y="190" width="632" height="42" rx="4"/>
<text class="ts" x="40" y="216">plus on-chip variation: the same nominal cell is not identical across the die</text>
</svg>

<p>The two checks fail in opposite directions. <b>Setup</b> asks whether data arrives early enough
before the capturing edge, so it is worst when everything is slow, and it can be traded for
frequency. <b>Hold</b> asks whether data stays stable long enough after the edge, so it is worst
when everything is fast, and crucially it is <b>independent of clock period</b>: a hold violation
cannot be fixed by slowing the clock, which is why a hold failure in silicon is fatal and a setup
failure merely limits speed.</p>

<p>Because they fail at opposite corners, the design must pass both simultaneously across all of
them. That is what <b>multi-corner multi-mode</b> analysis means, and the count is large: several
process corners, several voltages, temperature extremes in both directions, and each functional
mode plus test mode. Fixing setup at the slow corner by adding buffers can break hold at the fast
one, which is why the two are closed together rather than in sequence.</p>

<p><b>On-chip variation</b> recognises that two nominally identical cells on the same die are not
identical, so the tool derates launch and capture paths differently to keep the analysis
pessimistic. That pessimism is expensive, and the refinement, path-based analysis that removes
pessimism where the two paths share logic, exists because the blanket version costs real
performance.</p>

<p><b>Timing exceptions</b> are where designs are quietly broken. A false path tells the tool not
to check something; a multicycle path tells it to allow more than one cycle. Both are assertions
by the engineer that the tool cannot verify, so a wrong exception hides a real failure completely.
Exceptions belong in review, and a design with many of them deserves suspicion.</p>

<p>The final timing depends on <b>extracted parasitics</b> from the real routing, so the numbers
before routing are estimates however precise they look. Signal integrity effects, where an
aggressor switching alters a victim's delay, are analysed at sign-off for the same reason.</p>

<p>For the RTL engineer the practical points are: fix setup architecturally rather than by asking
for more effort, never write an exception you cannot justify, and remember that anything crossing
a clock domain is outside this analysis entirely and needs structural protection rather than
timing constraints.</p>
`,
quiz: [
{ q: "Why is a hold violation more serious than a setup violation?",
o: ["It affects more paths", "Hold is independent of clock period, so it cannot be fixed by slowing the clock", "It only appears after tapeout", "It cannot be analysed statically"],
a: 1, why: "A setup failure limits the speed at which the part works. A hold failure means it does not work at any speed." },
{ q: "Why must setup and hold be closed together rather than in sequence?",
o: ["Tools cannot analyse them separately", "They fail at opposite corners, so fixing one can break the other", "Hold analysis needs setup results", "It halves runtime"],
a: 1, why: "Setup is worst when everything is slow and hold when everything is fast, so buffers added for setup can create hold violations at the fast corner." },
{ q: "What does on-chip variation account for?",
o: ["Variation between manufactured wafers", "That two nominally identical cells on the same die differ", "Temperature changes during operation", "Voltage droop from switching"],
a: 1, why: "The tool derates launch and capture paths differently, and path-based analysis exists to remove the pessimism where the paths share logic." },
{ q: "Why are timing exceptions dangerous?",
o: ["They slow the analysis considerably", "They are engineer assertions the tool cannot verify, so a wrong one hides a real failure", "They only apply to one corner", "They conflict with on-chip variation"],
a: 1, why: "A false path or multicycle path declared incorrectly removes a genuine check entirely, which is why a design with many exceptions deserves suspicion." }
],
interview: {
q: "Explain setup and hold, and why hold violations worry you more.",
a: "Setup asks whether data arrives at a flop early enough before the capturing clock edge, accounting for the launching flop's clock-to-output, the combinational delay through the logic, the wire delay, and the setup requirement of the capturing flop, all against the clock period plus whatever skew there is. Hold asks the opposite question: whether data stays stable long enough after the edge that the capturing flop does not see the new value too early. The reason hold worries me more is that it is independent of the clock period. A setup failure means the part does not run at the frequency I wanted, so I can slow the clock down and ship something slower. A hold failure cannot be fixed that way at all, because the arithmetic does not involve the period, so the part is simply broken at any speed, and in an ASIC that is a respin. They also fail at opposite corners, which is what makes closure interesting. Setup is worst when everything is slow, so the slow process corner, low voltage, and the temperature extreme that hurts on that process. Hold is worst when everything is fast. So I have to pass both at all corners simultaneously, and fixing setup at the slow corner by adding buffering can create a hold violation at the fast corner, which is why they get closed together rather than one after the other. On top of that the tool applies on-chip variation derating, because two nominally identical cells on the same die are not identical, and it derates launch and capture paths differently to stay pessimistic. Coming from RTL, the things in my control are fixing setup architecturally with pipelining rather than asking for more synthesis effort, not writing timing exceptions I cannot justify because a wrong false path removes a real check silently, and remembering that clock domain crossings sit outside this analysis entirely and need synchronisers rather than constraints."
}
},

{
id: "rtl-cts",
track: "RTL & Verilog",
sub: "ASIC implementation",
title: "Clocks in silicon: trees, skew and gating",
mins: 22,
body: `
<p>In RTL the clock is a single ideal signal reaching every flop simultaneously. In silicon it is a
large buffered network with real delay, real skew and a substantial share of the total power, and
building it well is one of the harder problems in implementation.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A clock source buffered through a tree to many endpoints, showing insertion delay and skew between leaves">
<rect class="bx" x="24" y="26" width="632" height="36" rx="4"/>
<text class="th" x="40" y="50">source: PLL output or pad</text>
<rect class="bx" x="24" y="72" width="632" height="36" rx="4"/>
<text class="th" x="40" y="96">buffer levels: this depth is the insertion delay</text>
<rect class="bx" x="24" y="118" width="200" height="44" rx="4"/>
<text class="ts" x="40" y="146">leaf: arrives at t</text>
<rect class="bx" x="240" y="118" width="200" height="44" rx="4"/>
<text class="ts" x="256" y="146">leaf: arrives at t + 30 ps</text>
<rect class="bx" x="456" y="118" width="200" height="44" rx="4"/>
<text class="ts" x="472" y="146">leaf: arrives at t + 55 ps</text>
<rect class="bxa" x="24" y="176" width="632" height="54" rx="4"/>
<text class="th" x="40" y="202">skew is the spread between leaves</text>
<text class="ts" x="40" y="222">it helps setup in one direction and hurts hold in the other</text>
</svg>

<p>Two numbers describe the tree. <b>Insertion delay</b> is how long the clock takes to reach the
leaves, which matters mostly for interfaces to the outside world and for how much the tree can
vary. <b>Skew</b> is the spread of arrival times between leaves, and it is what affects internal
timing.</p>

<p>Skew is not simply bad. Between two flops, if the capturing clock arrives <b>later</b> than the
launching one, that difference is added to the setup budget and subtracted from the hold budget.
So skew helps in one direction and hurts in the other, and this is what makes hold violations
appear at clock tree synthesis: before it, the clock was ideal and there was no skew to consume
the hold margin.</p>

<p>Deliberately exploiting this is <b>useful skew</b>: delaying a clock slightly to a stage that is
tight for setup borrows time from the following stage, which is a way of balancing an unbalanced
pipeline without changing the RTL. It is powerful and it makes the design more sensitive to
variation, so it is used carefully.</p>

<p>Clocks are also a major consumer of <b>power</b>, because the tree switches every cycle whether
or not anything downstream is doing useful work. <b>Clock gating</b> is the standard remedy, and
the important practical point is that synthesis will insert it automatically from RTL that has a
clear enable, using proper gating cells that avoid glitches. Writing an explicit gate in RTL is
usually the wrong move; writing the enable clearly is the right one.</p>

<p>Anything with multiple clocks needs the relationships stated. Clocks that are asynchronous must
be declared as such so the tool does not try to time between them, and the crossings need
synchronisers. Generated clocks, from dividers or gating, must be declared so they are analysed
correctly rather than treated as data.</p>

<p>Finally, in the RTL itself, clocks should be treated as special: no logic in a clock path, no
clock used as data, no flop clocked by a signal from combinational logic. Those constructs make
trees hard to build and analyses hard to trust, and each has a structural alternative.</p>
`,
quiz: [
{ q: "Why do hold violations appear at clock tree synthesis?",
o: ["Routing adds data path delay", "Before it the clock was ideal, so there was no skew consuming hold margin", "Hold is not checked earlier", "Buffers slow the data path"],
a: 1, why: "Building a real tree introduces skew and insertion delay, and skew subtracted from the hold budget is what creates the violations." },
{ q: "What is useful skew?",
o: ["Skew that stays below the specified limit", "Deliberately delaying a clock to borrow time for a tight setup path", "Skew between asynchronous domains", "The skew added by routing"],
a: 1, why: "It balances an unbalanced pipeline without changing the RTL, at the cost of greater sensitivity to variation." },
{ q: "What is the right way to get clock gating?",
o: ["Instantiate a gate in the RTL", "Write a clear enable and let synthesis insert proper gating cells", "Use a clock divider", "Disable the PLL when idle"],
a: 1, why: "The tool uses glitch-free integrated gating cells and handles the timing, whereas a hand-written gate usually produces something that is hard to time and may glitch." },
{ q: "Why must asynchronous clocks be declared as such?",
o: ["To reduce runtime", "So the tool does not try to time paths between them", "To enable clock gating", "To allow useful skew"],
a: 1, why: "The crossings then need synchronisers instead, since no timing constraint can make an asynchronous crossing safe." }
],
interview: {
q: "What changes about clocking between RTL and silicon?",
a: "In RTL the clock is one ideal signal that reaches every flop at the same instant. In silicon it is a large buffered tree with real delay, real spread and a big share of the total power. Two numbers describe it: insertion delay, which is how long the clock takes to get from the source to the leaves and matters mostly for external interfaces, and skew, which is the spread of arrival times between leaves and is what affects internal timing. Skew is not simply bad. If the capturing flop's clock arrives later than the launching flop's, that difference adds to the setup budget and subtracts from the hold budget, so it helps in one direction and hurts in the other. That is exactly why hold violations turn up at clock tree synthesis: until the tree is built the clock is ideal, there is no skew, and hold looks fine. Implementation can exploit this deliberately with useful skew, delaying a clock slightly to a stage that is tight on setup to borrow time from the next stage, which balances an uneven pipeline without touching the RTL, though it makes the design more sensitive to variation. The other big difference is power, because the tree toggles every cycle whether or not anything downstream is doing work, so clock gating matters a lot. The practical point there is that I should not instantiate gates in RTL. If I write a clean enable, synthesis inserts proper glitch-free integrated clock gating cells and the timing is handled, whereas a hand-rolled gate is hard to time and can glitch. And I would keep the RTL clock discipline strict: no logic in clock paths, no clock used as data, no flop clocked from combinational logic, and every clock relationship declared, with asynchronous clocks marked as such so the tool does not try to time across them and the crossings get real synchronisers instead."
}
},

{
id: "rtl-dft",
track: "RTL & Verilog",
sub: "ASIC implementation",
title: "Design for test: scan, ATPG and the RTL rules",
mins: 22,
body: `
<p>Every die that comes off a wafer has to be tested, and functional tests cannot do it: they are
far too slow and they exercise almost none of the internal nodes. Design for test adds structure
whose only purpose is to make manufacturing defects observable.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Flops reconfigured into a shift chain in test mode, allowing patterns to be shifted in, captured for one cycle and shifted out">
<rect class="bx" x="24" y="26" width="632" height="40" rx="4"/>
<text class="th" x="40" y="52">functional mode: flops behave normally</text>
<rect class="bxa" x="24" y="76" width="632" height="40" rx="4"/>
<text class="th" x="40" y="102">test mode: every flop becomes a link in a shift register</text>
<rect class="bx" x="24" y="116" width="200" height="52" rx="4"/>
<text class="ts" x="40" y="140">1. shift a pattern</text>
<text class="ts" x="40" y="160">into all flops</text>
<rect class="bx" x="240" y="116" width="200" height="52" rx="4"/>
<text class="ts" x="256" y="140">2. one functional</text>
<text class="ts" x="256" y="160">clock: capture</text>
<rect class="bx" x="456" y="116" width="200" height="52" rx="4"/>
<text class="ts" x="472" y="140">3. shift out and</text>
<text class="ts" x="472" y="160">compare</text>
<rect class="bx" x="24" y="182" width="632" height="48" rx="4"/>
<text class="th" x="40" y="212">every flop becomes both controllable and observable</text>
</svg>

<p><b>Scan</b> is the core idea: in test mode every flop is reconfigured into a shift register, so
a pattern can be shifted into all of them, one functional clock applied to capture the combinational
result, and the result shifted out and compared. Every flop becomes both controllable and
observable, which turns a sequential test problem into a combinational one.</p>

<p><b>ATPG</b> generates those patterns automatically against a fault model. Stuck-at faults catch
a node held permanently high or low; transition faults catch a node that changes too slowly, which
requires patterns applied at speed and catches a different population of defects. Coverage here is
a manufacturing quality number, and the gap between ninety-five and ninety-nine percent is the
difference between a customer return rate you can live with and one you cannot.</p>

<p>Memories cannot be scanned usefully, so they get <b>built-in self test</b>: a small engine
walks patterns through the array and reports pass or fail, often with the ability to repair by
switching in a spare row or column, which is a significant part of yield on a large memory.</p>

<p>The <b>boundary scan</b> interface serves a different purpose again, testing connections
between chips on a board rather than inside one, and is usually the same physical port used for
debug.</p>

<p>What this demands from RTL is a short list, and the cost of breaking it is high because the
problem is usually discovered late. Clocks must be controllable from a pin in test mode, so a
clock that comes only from an internal PLL leaves that logic untestable. Asynchronous resets must
be controllable for the same reason. Latches, gated clocks and internally generated clocks all
need test structures around them.</p>

<p>The economics are worth internalising: scan costs area and some performance, and it buys the
ability to detect defective parts before they reach a customer. On any product shipped in volume
that trade is not close, which is why testability is a requirement in the specification rather
than something added at the end.</p>
`,
quiz: [
{ q: "What does scan achieve?",
o: ["It speeds up functional tests", "Every flop becomes controllable and observable, making testing combinational", "It replaces the need for ATPG", "It detects design bugs before tapeout"],
a: 1, why: "A pattern is shifted in, one functional clock captures the combinational result, and the result is shifted out and compared." },
{ q: "What does a transition fault model catch that stuck-at does not?",
o: ["A node shorted to a neighbour", "A node that changes too slowly, requiring at-speed patterns", "An open circuit", "A memory cell failure"],
a: 1, why: "It catches a different population of defects, which is why both fault models are run rather than just the cheaper one." },
{ q: "Why do memories use built-in self test rather than scan?",
o: ["They have no flops", "An array cannot be scanned usefully; an engine walks patterns and can trigger repair", "Scan is too slow for memories", "Memories are tested at the wafer level only"],
a: 1, why: "Repair by switching in a spare row or column is a significant contributor to yield on a large memory." },
{ q: "What does DFT require of the RTL?",
o: ["No latches anywhere", "Clocks and asynchronous resets must be controllable from a pin in test mode", "All logic must be pipelined", "Memories must be dual port"],
a: 1, why: "A clock available only from an internal PLL leaves that logic untestable, and it is expensive to discover this late." }
],
interview: {
q: "Why does an ASIC need scan, and what does it demand from your RTL?",
a: "Because every die off the wafer has to be tested for manufacturing defects, and functional tests cannot do that job. They are far too slow for production test time and they exercise almost none of the internal nodes, so a die with a defect in a rarely used corner passes and goes to a customer. Scan solves it by reconfiguring every flop into a shift register in test mode, so the tester shifts a pattern into all the flops, applies one functional clock to capture the combinational result, and shifts the result out to compare. That makes every flop both controllable and observable, which turns a sequential problem into a combinational one that ATPG can generate patterns for automatically. The fault models matter: stuck-at catches nodes held permanently high or low, and transition faults catch nodes that switch too slowly, which needs at-speed patterns and catches a different set of real defects. The coverage number is a quality number, and the difference between ninety-five and ninety-nine percent is the difference between a return rate you can live with and one you cannot. Memories cannot be scanned usefully so they get built-in self test, with repair by spare rows and columns, which is a real part of yield on a large array. What it demands from my RTL is a short list that is expensive to get wrong because it is usually found late. Clocks have to be controllable from a pin in test mode, so anything clocked only by an internal PLL is untestable unless there is a bypass. Asynchronous resets have to be controllable for the same reason, otherwise they fire during shifting. Latches, internally generated clocks and hand-written clock gates all need test structures around them, which is another reason to write enables and let the tool insert gating cells. And the whole thing costs area and a little performance, which on any volume product is not a close trade, so testability belongs in the specification rather than being bolted on at the end."
}
},

{
id: "rtl-physaware",
track: "RTL & Verilog",
sub: "ASIC implementation",
title: "Physically aware RTL: floorplan, congestion and partitioning",
mins: 22,
body: `
<p>An RTL engineer who writes as if the design were a schematic will produce something that
simulates perfectly and cannot be implemented. On a modern process, the physical consequences of
architectural choices are large enough that they have to be anticipated in the RTL.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A block whose logic is spread across the floorplan producing long wires, against a partition that keeps communicating logic together">
<rect class="bx" x="24" y="26" width="308" height="120" rx="4"/>
<text class="th" x="40" y="52">poor partition</text>
<text class="ts" x="40" y="80">one module talks to five</text>
<text class="ts" x="40" y="104">placed far apart</text>
<text class="ts" x="40" y="132">long wires, many pins</text>

<rect class="bxa" x="348" y="26" width="308" height="120" rx="4"/>
<text class="th" x="364" y="52">good partition</text>
<text class="ts" x="364" y="80">logic that communicates</text>
<text class="ts" x="364" y="104">stays together</text>
<text class="ts" x="364" y="132">narrow, registered edges</text>

<rect class="bx" x="24" y="162" width="632" height="68" rx="4"/>
<text class="th" x="40" y="190">the module hierarchy becomes the physical hierarchy</text>
<text class="ts" x="40" y="214">so it is a floorplan decision, not just a code organisation decision</text>
</svg>

<p>The first idea is that <b>hierarchy is physical</b>. Module boundaries frequently become
placement boundaries, so a partition that separates logic which communicates heavily forces long
wires between regions. Partition along the lines of the data flow, keep tightly coupled logic in
one module, and register the boundaries so that a crossing costs a cycle rather than an
unpredictable delay.</p>

<p><b>Congestion</b> is a distinct failure from timing and it surprises people. A region can have
comfortable timing and still be unroutable because too many wires need to pass through it. Large
crossbars, wide multiplexers selecting between many sources, and any structure where many signals
converge on one point are the usual causes, and the fix is architectural: pipeline the selection
into stages, distribute the arbitration, or move to a narrower interface at higher frequency.</p>

<p><b>Wire delay does not scale</b> the way gate delay does, so as processes shrink a fixed
physical distance costs relatively more. That is why a signal broadcast to the whole chip, a
global stall, a reset that must reach everywhere in one cycle, an enable driving a thousand flops,
is an architectural problem. Pipeline the broadcast, or restructure so that no signal needs to be
globally correct in a single cycle.</p>

<p><b>Macros</b> shape everything around them. Memories are large fixed rectangles with pins on
specific edges, so their placement determines where the logic that uses them must sit. A design
that reads from six memories in one cycle is asking for those six to be adjacent, which the
floorplan may not permit.</p>

<p>The practical discipline is to get feedback early. Synthesise from the first week, run trial
placement on the blocks you expect to be difficult, and look at congestion maps as well as timing
reports, because by the time the RTL is complete the architectural choices that caused the problem
are expensive to revisit.</p>
`,
quiz: [
{ q: "Why does module hierarchy matter physically?",
o: ["It determines synthesis order", "Module boundaries frequently become placement boundaries", "It affects simulation performance", "Tools require registered outputs"],
a: 1, why: "A partition that separates heavily communicating logic forces long wires between regions, so partitioning is a floorplan decision." },
{ q: "How does congestion differ from a timing failure?",
o: ["It only occurs at the slow corner", "A region can meet timing yet be unroutable because too many wires cross it", "It is fixed by adding buffers", "It appears only after tapeout"],
a: 1, why: "Crossbars, wide multiplexers and convergence points are the usual causes, and the fix is architectural rather than a matter of tool effort." },
{ q: "Why is a signal broadcast across the whole chip an architectural problem?",
o: ["It uses too much power", "Wire delay does not scale with process, so a fixed distance costs relatively more", "It cannot be buffered", "It creates a clock domain crossing"],
a: 1, why: "Global stalls, single-cycle chip-wide resets and enables driving thousands of flops all need pipelining or restructuring rather than tool effort." },
{ q: "Why do memory macros constrain the design?",
o: ["They consume most of the power", "They are large fixed rectangles with pins on specific edges, dictating where their logic sits", "They cannot be scanned", "They require their own clock domain"],
a: 1, why: "A design reading from six memories in one cycle requires those six to be adjacent, which the floorplan may simply not allow." }
],
interview: {
q: "How do physical implementation concerns influence how you write RTL?",
a: "Quite a lot, because on a modern process the physical consequences of architectural choices are too large to discover at the back end. The first thing is that hierarchy is physical: module boundaries very often become placement boundaries, so I partition along the data flow and keep logic that communicates heavily inside one module rather than splitting it for tidiness, and I register the boundaries so a crossing costs a defined cycle rather than an unpredictable wire delay. The second is congestion, which is a different failure from timing and catches people out, because a region can meet timing comfortably and still be unroutable simply because too many wires have to pass through it. The usual causes are large crossbars, wide multiplexers selecting among many sources, and any structure where a lot of signals converge on one point, and the fixes are architectural: pipeline the selection into stages, distribute the arbitration, or use a narrower interface at a higher frequency. The third is that wire delay does not scale the way gate delay does, so as processes shrink, a fixed physical distance costs relatively more. That makes any globally broadcast signal an architectural problem, whether it is a global stall, a reset that has to reach everywhere in one cycle, or an enable driving a thousand flops, and the answer is to pipeline the broadcast or restructure so nothing needs to be globally correct in a single cycle. Fourth, memory macros are big fixed rectangles with pins on particular edges, so their placement dictates where the logic using them has to go, and an architecture that reads six memories in one cycle is quietly demanding that those six sit next to each other. Practically, the discipline that matters most is early feedback: synthesis running from the first week and trial placement on the blocks I expect to be hard, looking at congestion maps as well as timing, because once the RTL is complete those architectural choices are expensive to unwind."
}
},

{
id: "rtl-signoff",
track: "RTL & Verilog",
sub: "ASIC implementation",
title: "Sign-off and tapeout: what has to be true",
mins: 22,
body: `
<p>Tapeout is the point after which nothing can be changed for months and a great deal of money.
Sign-off is the set of independent checks that justify taking that step, and its structure is
worth understanding even for an engineer who never runs any of them.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The sign-off checks: timing, power and IR drop, physical rules, layout against netlist, equivalence, and reliability">
<rect class="bx" x="24" y="24" width="308" height="44" rx="4"/>
<text class="th" x="40" y="42">timing</text>
<text class="ts" x="40" y="60">all corners, all modes</text>
<rect class="bx" x="348" y="24" width="308" height="44" rx="4"/>
<text class="th" x="364" y="42">power and IR drop</text>
<text class="ts" x="364" y="60">the grid must hold up</text>
<rect class="bx" x="24" y="78" width="308" height="44" rx="4"/>
<text class="th" x="40" y="96">DRC</text>
<text class="ts" x="40" y="114">can the fab make it</text>
<rect class="bx" x="348" y="78" width="308" height="44" rx="4"/>
<text class="th" x="364" y="96">LVS</text>
<text class="ts" x="364" y="114">layout equals netlist</text>
<rect class="bx" x="24" y="132" width="308" height="44" rx="4"/>
<text class="th" x="40" y="150">formal equivalence</text>
<text class="ts" x="40" y="168">netlist equals RTL</text>
<rect class="bx" x="348" y="132" width="308" height="44" rx="4"/>
<text class="th" x="364" y="150">reliability</text>
<text class="ts" x="364" y="168">electromigration, antenna, ESD</text>
<rect class="bxa" x="24" y="186" width="632" height="44" rx="4"/>
<text class="th" x="40" y="214">plus: can it be brought up, debugged and tested when it comes back</text>
</svg>

<p><b>Timing</b> sign-off is static analysis on extracted parasitics across every corner and mode,
including signal integrity effects. <b>Power</b> sign-off covers both the average, which sets the
package and thermal design, and the instantaneous behaviour: a large block switching at once
causes a voltage droop, and if the grid cannot supply it the design fails in a way that looks
like a timing problem.</p>

<p><b>Physical verification</b> is two checks with different purposes. Design rule checking asks
whether the fab can manufacture the shapes at all. Layout versus schematic asks whether what was
drawn matches the netlist that was verified, and it is the check that catches a connection made or
lost during a late edit.</p>

<p><b>Formal equivalence</b> closes the remaining gap by proving the final netlist implements the
same function as the RTL that was verified. It matters because the netlist has been through
synthesis, optimisation, scan insertion, clock tree buffering and possibly manual edits, and
simulation of the final netlist is far too slow to re-verify from scratch.</p>

<p><b>Reliability</b> checks are the ones outside a digital engineer's usual thinking:
electromigration, whether a wire will carry its current for years without degrading; antenna
rules, protecting gates during manufacture; and ESD protection on every pad.</p>

<p>Beyond the checks, tapeout readiness includes whether the part can be <b>brought up</b>. Are
the debug interfaces there, are there enough observable signals, is there a way to run at reduced
frequency, can the clocks be bypassed, is the boot path recoverable if the first firmware is
wrong? A chip that is functionally correct and impossible to debug still costs months.</p>

<p>The cultural point is that sign-off is <b>independent</b>. Each check is run by a different
tool, often a different team, against a different model, precisely so that a mistake in one flow
does not propagate silently. Waivers, where a violation is accepted, are the risky part, and each
one needs an argument recorded and reviewed rather than a decision made under deadline
pressure.</p>
`,
quiz: [
{ q: "What does formal equivalence checking establish at sign-off?",
o: ["That the RTL matches the specification", "That the final netlist implements the same function as the verified RTL", "That timing is met at all corners", "That the layout matches the netlist"],
a: 1, why: "The netlist has been through synthesis, optimisation, scan insertion, clock buffering and possibly manual edits, and simulating it fully is far too slow." },
{ q: "What does LVS check that DRC does not?",
o: ["Whether the shapes can be manufactured", "Whether the layout matches the verified netlist", "Whether timing is met", "Whether current density is acceptable"],
a: 1, why: "DRC asks whether the fab can make the shapes; LVS catches a connection made or lost during a late edit." },
{ q: "Why can a power grid problem look like a timing failure?",
o: ["Power analysis uses timing models", "A large block switching causes voltage droop, which slows the logic", "IR drop delays the clock only", "Timing tools include power effects"],
a: 1, why: "Instantaneous behaviour matters as much as average power, which is why droop is analysed separately at sign-off." },
{ q: "Why is sign-off deliberately run by independent tools and teams?",
o: ["To share the workload", "So a mistake in one flow does not propagate silently into the result", "Because no tool covers everything", "To satisfy the foundry"],
a: 1, why: "Each check uses a different model, and waivers accepting a violation need a recorded reviewed argument rather than a deadline decision." }
],
interview: {
q: "What has to be true before you tape out?",
a: "It is a set of deliberately independent checks, because after tapeout nothing changes for months and a great deal of money. Timing sign-off is static analysis on parasitics extracted from the real routing, across every process, voltage and temperature corner and every operating mode including test, with signal integrity effects included. Power sign-off covers both the average, which drives the package and thermal design, and the instantaneous behaviour, because a large block switching at once causes a voltage droop, and if the grid cannot supply it the part fails in a way that presents as a timing problem. Physical verification is two separate things: design rule checking, which asks whether the fab can actually manufacture the shapes, and layout versus schematic, which asks whether what was drawn matches the netlist that was verified, and that is the check that catches a connection made or broken by a late edit. Then formal equivalence between the final netlist and the RTL, which matters because by then the netlist has been through synthesis, optimisation, scan insertion, clock tree buffering and possibly manual ECOs, and simulating the whole netlist to re-verify it is far too slow. Then the reliability checks that are outside a digital engineer's normal thinking: electromigration, whether wires will carry their current for years, antenna rules that protect gates during manufacture, and ESD on every pad. Beyond the checks I would want to be satisfied the part can actually be brought up: debug interfaces present, enough observability, a way to run at reduced frequency, clock bypass, and a recoverable boot path if the first firmware is wrong, because a chip that is functionally correct and impossible to debug still costs months. And I would look very carefully at the waiver list, because every waiver is someone accepting a violation, and those need a written reviewed argument rather than a decision taken under deadline pressure."
}
}

);
