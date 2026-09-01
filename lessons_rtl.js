// RTL & Verilog track. Written for a VHDL/FPGA engineer converting fluency to
// Verilog/SystemVerilog for interviews. Same schema as data.js lessons.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "rtl-verilog",
track: "RTL & Verilog",
sub: "The language",
title: "Verilog for the VHDL engineer",
mins: 25,
body: `
<p>The structural translation from VHDL to Verilog is mechanical and you will absorb it
in an afternoon. The real conversion work is cultural: Verilog silently accepts a whole
class of code that VHDL would have rejected at analysis time. This lesson gives you the
mapping first, then the traps.</p>
<h3>The structural mapping</h3>
<ul>
<li><b>entity plus architecture</b> becomes a single <b>module</b>: ports, parameters
and body in one construct. Generics become parameters, with the same
elaboration-time role.</li>
<li><b>process (clk)</b> becomes an <b>always</b> block. A clocked process is
always @(posedge clk); a combinational process is always @* (or always @(*)), which
computes the full sensitivity list for you and kills the classic
missing-signal simulation mismatch that VHDL made you manage by hand.</li>
<li><b>signal</b> splits into two kinds. A <b>wire</b> is driven by continuous
assign statements or by instance outputs. A <b>reg</b> is anything assigned inside an
always block. The name is a historical accident: a reg is not necessarily a register.
A reg assigned in a combinational always block synthesises to gates, not flip-flops.
Think of reg as procedurally assigned, wire as continuously driven.</li>
<li><b>component instantiation</b> gets lighter: no component declaration, just the
module name, an instance name, and named port connections with dot notation, which you
should always use over positional.</li>
</ul>
<pre>module pulse_gen #(parameter WIDTH = 8) (
    input  wire             clk,
    input  wire [WIDTH-1:0] period,
    output reg              pulse
);
always @(posedge clk) begin
    // clocked logic here
end
endmodule</pre>
<h3>Weak typing: where VHDL habits save you</h3>
<p>VHDL made every conversion between std_logic_vector, unsigned and integer an
explicit, visible decision. Verilog converts implicitly and says nothing. Three rules
cover most of the danger:</p>
<ul>
<li><b>Width mismatch is legal.</b> Assign a 16-bit value to an 8-bit target and the
top eight bits vanish silently. Assign narrow to wide and it extends: zero extension
for unsigned, sign extension only when every operand in the expression is signed.</li>
<li><b>Signedness is infectious in the wrong direction.</b> If any operand in an
expression is unsigned, the whole expression is evaluated as unsigned. One unsigned
literal can quietly break a signed comparison in a motion-control error term. Declare
signed explicitly and use the signed system function when mixing.</li>
<li><b>Arithmetic width is the width of the widest operand, including the target.</b>
Adding two 8-bit values into an 8-bit target drops the carry; into a 9-bit target it
keeps it. The context decides, not the operands alone.</li>
</ul>
<h3>Literals and sizing</h3>
<p>The literal format is size, base, value: 8'hFF is eight bits of hex, 4'b1010 is four
bits of binary, 12'd100 is decimal. An unsized literal such as plain 100 is at least
32 bits, which matters in concatenations and comparisons. Replication builds wide
constants: {WIDTH{1'b1}} is all-ones at any width. Verilog is four-state like
std_logic: x is unknown, z is high impedance, and an uninitialised reg simulates
as x until first assignment, which is a feature: x propagation exposes missing
resets in simulation.</p>
<p>The honest summary for an interview: nothing in VHDL is missing from Verilog, but
the compiler has stopped checking your work. You bring the discipline; lint tools and
SystemVerilog (a later lesson) bring back much of the checking.</p>`,
quiz: [
{ q: "In Verilog, a variable declared as reg and assigned inside a combinational always block synthesises to:",
o: ["A flip-flop, always", "Combinational gates; reg only means procedurally assigned", "A latch, always", "Nothing; it is illegal"],
a: 1, why: "reg is a historical name for a procedurally assigned variable. Flip-flops come from clocked always blocks, not from the reg keyword." },
{ q: "You assign a 16-bit signal to an 8-bit signal in Verilog. What happens?",
o: ["Compile error, as in VHDL", "Simulation error at runtime", "The top 8 bits are silently truncated", "The tool inserts a saturation stage"],
a: 2, why: "Verilog permits implicit width conversion. Truncation is silent; at best a lint tool or synthesis warning mentions it." },
{ q: "An expression mixes one signed operand and one unsigned operand. Verilog evaluates it as:",
o: ["Unsigned throughout", "Signed throughout", "Whichever operand is wider decides", "Undefined behaviour"],
a: 0, why: "A single unsigned operand makes the whole expression unsigned. This silently breaks signed comparisons, so declare and cast deliberately." },
{ q: "What does the literal 8'hFF mean?",
o: ["A 32-bit value", "Hex FF with unspecified width", "An 8-state logic value", "An 8-bit hexadecimal literal with value 255"],
a: 3, why: "The format is size, base, value: 8 bits, hex base, value FF. Unsized literals default to at least 32 bits, which surprises in concatenations." }
],
interview: {
q: "You have ten years of VHDL. An interviewer asks how quickly you could be productive on our Verilog codebase. What do you say?",
a: "Faster than a new graduate who already writes Verilog, because the hard part of RTL is not syntax. I already think in synchronous processes, registered outputs, clock domain discipline and testbench-first development; the entity-to-module and process-to-always mapping is mechanical and I have already worked through it. The genuine adjustment is Verilog's weak typing: implicit truncation and unsigned-infecting-signed expressions are things VHDL checked for me, so for the first weeks I would lean on lint and on explicit widths and casts everywhere. I would also read the team's coding standard first, since Verilog allows more styles than VHDL and consistency matters more than preference. I would expect to be reviewing others' Verilog usefully within a month."
}
},

{
id: "rtl-nba",
track: "RTL & Verilog",
sub: "The language",
title: "Blocking vs non-blocking, properly",
mins: 30,
body: `
<p>This is the most asked Verilog interview topic, and you already understand it,
because VHDL has the identical split: variable assignment inside a process updates
immediately, signal assignment takes effect at the end of the delta cycle. Verilog's
blocking assignment (the plain equals operator) is the variable; the non-blocking
assignment (the arrow-equals operator, written &lt;= in code) is the signal. What
interviews test is whether you can explain the simulator semantics rather than recite
the rule.</p>
<h3>What the simulator actually does</h3>
<p>Within one simulation time step, a blocking assignment evaluates its right-hand side
and updates the left-hand side immediately, before the next statement runs. A
non-blocking assignment evaluates its right-hand side immediately but schedules the
update for the end of the time step, after all the always blocks triggered by this
event have run their right-hand-side evaluations. So every non-blocking assignment in
the design samples the old values, and all the updates land together. That is exactly a
bank of flip-flops sampling on a clock edge, which is why non-blocking models
registers correctly.</p>
<h3>The two rules and the bug that motivates them</h3>
<ul>
<li>Use non-blocking assignments in clocked always blocks.</li>
<li>Use blocking assignments in combinational always blocks.</li>
<li>Never mix the two in one block, and never assign one variable from two blocks.</li>
</ul>
<p>The canonical failure is the shift register collapse. Written with non-blocking
assignments, three stages behave as three registers, because each right-hand side
samples the pre-edge value:</p>
<pre>always @(posedge clk) begin
    s1 &lt;= din;
    s2 &lt;= s1;
    s3 &lt;= s2;
end</pre>
<p>Rewrite those with blocking assignments and each statement completes before the
next, so din rushes through all three variables in one edge. Synthesis produces a
single register, simulation shows a one-stage delay, and the pipeline you drew on the
whiteboard does not exist. In VHDL terms, you used variables where you meant
signals.</p>
<h3>Ordering races</h3>
<p>The language does not define the order in which always blocks triggered by the same
edge execute. With non-blocking assignments this does not matter, because every block
reads old values. With blocking assignments crossing block boundaries, the result
depends on scheduler ordering: a race. Tools may agree with each other today and
disagree after a version bump. This is why the rule is a correctness rule, not a
style preference.</p>
<h3>Testbench consequences</h3>
<p>Testbenches hit the same scheduler. If your stimulus process drives DUT inputs with
blocking assignments at the posedge, you race the DUT's own sampling: whether the DUT
sees the old or new input depends on execution order. Two clean fixes: drive stimulus
with non-blocking assignments so it lands after sampling, or drive on the opposite
edge so there is no contest. Your ModelSim co-simulation benches almost certainly did
the VHDL equivalent already.</p>
<p>Finally, printing. $display executes where it stands, so at a clock edge it may
print values from before the non-blocking updates have landed. $strobe prints at the
end of the time step, after all non-blocking assignments have settled, which is almost
always what you meant when checking registered values. $monitor is $strobe semantics,
triggered automatically on change. Knowing this one distinction marks you as someone
who has debugged real benches rather than read a tutorial.</p>`,
quiz: [
{ q: "In a clocked always block, three successive non-blocking assignments chain s1 from din, s2 from s1, s3 from s2. What hardware results?",
o: ["A three-stage shift register", "One register feeding three outputs", "Three parallel copies of din", "A combinational chain"],
a: 0, why: "Non-blocking right-hand sides all sample pre-edge values, so each stage takes the previous stage's old value: a true shift register." },
{ q: "The same chain rewritten with blocking assignments synthesises to:",
o: ["The same shift register", "A latch chain", "Nothing; it is a syntax error", "Effectively a single register, since din propagates through all statements in one edge"],
a: 3, why: "Blocking assignments complete immediately, so each statement reads the value just written. The three stages collapse into one." },
{ q: "The closest VHDL analogy to Verilog's blocking versus non-blocking distinction is:",
o: ["Concurrent versus sequential statements", "Variable assignment versus signal assignment in a process", "Wait statements versus sensitivity lists", "Resolved versus unresolved types"],
a: 1, why: "VHDL variables update immediately like blocking assignments; VHDL signals update at the delta boundary like non-blocking assignments." },
{ q: "You want to print register values as they stand after all updates at a clock edge have settled. Best choice:",
o: ["A display call at the posedge", "A monitor call inside the clocked block", "A strobe call, which prints at the end of the time step", "Print one full cycle later"],
a: 2, why: "Strobe defers printing until the end of the time step, after non-blocking updates land. Display prints wherever it executes, possibly mid-update." }
],
interview: {
q: "Explain to a junior engineer why we use non-blocking assignments in clocked blocks, without just quoting the rule.",
a: "I would start from what a flip-flop does physically: on the clock edge, every register in the chip samples its input simultaneously, using values from before the edge, and all outputs change together afterwards. The non-blocking assignment models exactly that: right-hand sides are all evaluated with old values, updates land together at the end of the time step. The blocking assignment instead updates instantly, so later statements see the new value, which is how software behaves but not how registers behave. Then I would show the shift register example both ways in the simulator: with blocking assignments the three stages collapse into one and the waveform proves it in thirty seconds. Rules stick when you have watched the hardware disagree with your intent."
}
},

{
id: "rtl-fsm",
track: "RTL & Verilog",
sub: "Design",
title: "RTL design patterns: FSMs, pipelines and resets",
mins: 30,
body: `
<p>Interviewers use FSMs, pipelines and resets to check that you design hardware
rather than transcribe flowcharts. You have written all three in VHDL for motion
control; this lesson is the Verilog phrasing plus the trade-off vocabulary interviews
expect.</p>
<h3>FSM coding styles</h3>
<p>Three common styles. One block: a single clocked always containing state register,
next-state logic and outputs; compact, everything registered, but transitions and
outputs tangle as the machine grows. Two blocks: a clocked always holding only the
state register, and a combinational always computing next state and Moore outputs from
a case statement; this is the VHDL two-process style you already write, and it keeps
the transition table readable. Three blocks adds a separate output block, useful when
outputs need their own registering. My default recommendation matches most coding
standards: two blocks, with any output that leaves the module registered in a clocked
block so it is glitch-free. State encoding (binary, one-hot) is best left to the
synthesis tool unless you have a measured reason; FPGAs usually favour one-hot because
flip-flops are cheap and next-state logic gets shallower.</p>
<h3>Moore vs Mealy</h3>
<p>Moore outputs depend on state only: they change one cycle after the input that
caused the transition, and they are clean because they come off registers or stable
state decode. Mealy outputs depend on state and current inputs: they respond in the
same cycle, which saves a cycle of latency, but the output is combinational, can
glitch, and creates a direct input-to-output timing path. In industrial control the
safe default is Moore for anything driving the outside world, Mealy only inside the
chip where the one-cycle saving genuinely matters and the path is timed.</p>
<h3>Pipelining: the timing lever</h3>
<p>If a combinational path fails timing, cut it with a register. Each cut shortens the
critical path, raising the achievable clock, at the cost of one extra cycle of
latency. Throughput rises because the clock does: one result per cycle at a faster
clock beats one result per cycle at a slower one. The costs are latency, flip-flops,
and the bookkeeping of keeping parallel paths aligned: every signal that travels
alongside pipelined data must be delayed by the same number of stages, including
valid flags. A pipeline with misaligned side signals is the classic subtle bug.</p>
<pre>always @(posedge clk) begin
    prod_r  &lt;= a * b;        // stage 1
    sum_r   &lt;= prod_r + c;   // stage 2: two-cycle latency, short paths
end</pre>
<h3>Resets: the interview staple</h3>
<p>A synchronous reset is just another data input, sampled on the clock edge: fully
timed, no special paths, but it needs a running clock and consumes a LUT input. An
asynchronous reset takes effect immediately, clock or not, which is what you want at
power-up; the danger is the release. If the reset deasserts near a clock edge,
recovery and removal timing is violated and some flops leave reset a cycle apart, or
go metastable. The standard answer: assert asynchronously, release synchronously. Feed
the raw reset into a two-flop synchroniser whose output resets the domain; assertion
is still immediate, release is now aligned to the clock.</p>
<h3>Clock enables, not gated clocks</h3>
<p>To run logic slower than the clock, do not gate the clock with logic. A gated clock
glitches, creates a new domain, and ruins timing analysis. Instead qualify the
register with an enable: everything stays in one clean domain and the synthesiser
maps the enable onto the flip-flop's dedicated enable pin. On FPGAs this is free.</p>`,
quiz: [
{ q: "Which statement about Moore versus Mealy outputs is correct?",
o: ["Mealy outputs change one cycle later than Moore outputs", "Moore outputs depend on state only, so they are stable and glitch-free; Mealy outputs respond a cycle earlier but are combinational", "Moore machines need more states than Mealy machines in every case", "Mealy outputs are always registered"],
a: 1, why: "Moore outputs are a function of state alone. Mealy outputs also see current inputs, gaining a cycle but adding a combinational, glitch-prone path." },
{ q: "Pipelining a failing combinational path primarily trades:",
o: ["Throughput for area", "Power for latency", "Latency and flip-flops for a shorter critical path and higher clock rate", "Accuracy for speed"],
a: 2, why: "Each pipeline register cuts the path, raising achievable clock frequency and throughput, at the cost of cycles of latency and register area." },
{ q: "The phrase asynchronous assert, synchronous release means:",
o: ["Reset asserts on the clock edge and releases immediately", "Reset is only used in simulation", "Both edges of reset are asynchronous", "Reset takes effect immediately, but its deassertion is passed through a synchroniser so all flops leave reset on the same clock"],
a: 3, why: "Immediate assertion protects power-up with no clock; synchronised release avoids recovery and removal violations and staggered reset exit." },
{ q: "Why prefer clock enables over gating the clock with combinational logic?",
o: ["Gated clocks glitch, create extra clock domains and break timing analysis; enables keep one clean domain", "Enables are faster than clocks", "Gated clocks are illegal in Verilog", "Enables reduce latency"],
a: 0, why: "Logic on a clock net can glitch and produces a derived domain the tools must treat separately. An enable pin achieves the same function safely." }
],
interview: {
q: "Walk me through how you would take a control FSM that fails timing at 200 MHz and close it.",
a: "First I read the timing report to find the actual failing path, because FSMs usually fail in next-state or output decode, not the state register itself. If output decode is the problem, I register the outputs, accepting one cycle of latency, which control loops usually tolerate. If next-state logic is deep, I try one-hot encoding to flatten the decode, and I look for wide comparisons or counters embedded in transition conditions; those I precompute into registered flags a cycle early, for example a terminal-count flag rather than comparing a 32-bit counter inside the case statement. If the machine is genuinely too big, I split it into a fast small FSM and a slow supervisory one. Only after those do I consider floorplanning, because logic restructuring is repeatable and placement luck is not."
}
},

{
id: "rtl-cdc",
track: "RTL & Verilog",
sub: "Design",
title: "Clock domains, metastability and CDC",
mins: 30,
body: `
<p>Clock domain crossing is where FPGA designs fail in the field after passing every
simulation, so interviewers probe it hard. The physics first, then the standard
machinery, then the discipline.</p>
<h3>Setup, hold, and what metastability physically is</h3>
<p>A flip-flop needs its data input stable for a window around the clock edge: setup
time before, hold time after. Respect the window and the output settles within the
specified clock-to-q delay. Violate it, which is unavoidable when the data comes from
an unrelated clock, and the flop's internal feedback pair can be caught balanced
between states, like a ball on a knife edge. The output hovers at an intermediate
voltage or oscillates, then falls to a valid level after an unpredictable extra time.
That is metastability. It cannot be prevented when domains are asynchronous; it can
only be given time to resolve.</p>
<h3>MTBF intuition</h3>
<p>The probability that a metastable flop has not resolved decays exponentially with
the time you allow it. Mean time between failures therefore grows exponentially with
resolution time and shrinks with clock frequency and data toggle rate. The practical
reading: one flop sampling an async input might fail hourly; give the signal one full
extra clock period to settle and the MTBF becomes years; two extra periods, geological
time. Exponentials are why the standard fix is so simple.</p>
<h3>The two-flop synchroniser, and its limits</h3>
<p>Pass the asynchronous signal through two flip-flops in the destination domain. The
first may go metastable; it has a whole clock period to resolve before the second
samples it. Use it only for a single bit that is level-like or slow. Be precise in
interviews about what it does not do:</p>
<ul>
<li>It does not remove uncertainty: the value arrives either this cycle or next.</li>
<li>It does not make multiple bits arrive together. Two synchronised bits can take
different numbers of cycles, so a multi-bit value can be sampled torn.</li>
<li>It does not stretch pulses. A pulse shorter than the destination period can fall
entirely between edges and vanish.</li>
</ul>
<h3>Multi-bit crossings</h3>
<ul>
<li><b>Gray code</b>: if a multi-bit value changes by one step at a time, encode it so
only one bit changes per step; a torn sample is then either the old or new value, both
valid. This is how async FIFO pointers work, and it only works for unit-step
sequences.</li>
<li><b>Handshake</b>: hold the data bus stable, synchronise a single request bit
across, the receiver registers the data and returns an acknowledge. Slow but simple
and universal.</li>
<li><b>Async FIFO</b>: the general solution for streaming data: dual-port RAM,
Gray-coded read and write pointers each synchronised into the other domain for the
full and empty flags. Use the vendor primitive or a proven library; hand-rolling one
in an interview is for the whiteboard, not for production.</li>
</ul>
<h3>CDC discipline</h3>
<p>Treat CDC as a review item, not a coding detail. Keep a list of every crossing in
the design and its structure. Name synchroniser signals consistently so they are
findable. Constrain them properly (false path or max delay on the first flop's input)
rather than leaving the tool to time an untimeable path. Run a CDC lint tool if the
project has one, and remember simulation rarely shows these bugs: the RTL simulator
does not model metastability, so a design can simulate perfectly and fail on the
bench. That last sentence, delivered from experience, is exactly what interviewers
want to hear.</p>`,
quiz: [
{ q: "Metastability in a flip-flop is best described as:",
o: ["A permanent stuck-at fault", "The output caught between logic levels for an unpredictable time after a setup or hold violation", "An X value in simulation", "Crosstalk between clock nets"],
a: 1, why: "A violated sampling window can leave the flop's feedback pair balanced; it resolves to a valid level after an unbounded extra delay." },
{ q: "Why does a two-flop synchroniser work?",
o: ["The second flop filters glitches", "Two flops vote on the value", "The first flop gets a full clock period to resolve before the second samples, and failure probability decays exponentially with that time", "It converts the signal to Gray code"],
a: 2, why: "MTBF grows exponentially with resolution time. One full period of settling makes the failure rate astronomically small; the second flop provides that period." },
{ q: "Which problem does a two-flop synchroniser NOT solve?",
o: ["Metastability on a single slow control bit", "Reducing failure probability on a level signal", "Synchronising a push-button status flag", "Keeping the bits of a multi-bit bus coherent across domains"],
a: 3, why: "Each bit can take one or two cycles independently, so a bus can be sampled torn. Multi-bit data needs Gray code, a handshake or an async FIFO." },
{ q: "Async FIFO pointers are Gray coded because:",
o: ["Gray code compresses the pointer width", "Only one bit changes per increment, so a torn sample in the other domain is still either the old or the new pointer value", "Gray code is faster to compare", "Binary counters cannot be synthesised in FPGAs"],
a: 1, why: "With single-bit steps, any sampling instant yields a valid recent value, making full and empty flags safe (conservative at worst)." }
],
interview: {
q: "A board comes back from the field with a fault that happens roughly once a week and never in simulation. Your design has three clock domains. Where do you start?",
a: "Rare, unsimulatable and multi-domain says CDC to me immediately, so I would start with an audit rather than the lab. I would list every signal crossing between the three domains and classify each: single bit through a proper two-flop synchroniser, multi-bit through a FIFO or handshake, or unprotected. Experience says I will find either a raw crossing someone added late, a multi-bit value passed through per-bit synchronisers and occasionally sampled torn, or a pulse from the fast domain too short for the slow domain to catch. I would also check the reset architecture, since asynchronous reset release is a once-a-week class of bug too. In parallel I would add counters around the suspect crossings on hardware, because the failure rate is high enough to trap in a day."
}
},

{
id: "rtl-synth",
track: "RTL & Verilog",
sub: "Design",
title: "What synthesis actually does",
mins: 25,
body: `
<p>Engineers who treat synthesis as a black box write RTL that fights the tool.
Engineers who can predict the netlist from the source get asked back for the next
interview. You have years of Quartus reports behind you; this lesson organises that
experience into answers.</p>
<h3>From always blocks to LUTs and flip-flops</h3>
<p>Synthesis infers hardware from patterns. A clocked always block produces one
flip-flop per bit assigned in it, with the right-hand-side logic becoming the cloud of
LUTs feeding the D input. A combinational always block or an assign statement produces
LUTs only. Expressions map onto the fabric: any Boolean function of up to six inputs
is one LUT regardless of how complicated it looks in source, so gate-counting by eye
misleads; input count and logic depth are what matter. Then the optimiser flattens,
shares and prunes, so unused outputs and constant-fed logic simply disappear, which is
why a mistyped constant can silently delete half a module and the first symptom is a
suspiciously small resource count.</p>
<h3>Inferred latches: the classic trap</h3>
<p>In a combinational block, every output must be assigned on every path. If some
branch of an if or case leaves a variable unassigned, the semantics say hold the old
value, and holding a value in combinational logic requires storage: the tool infers a
transparent latch. Latches in FPGA fabric are timing-hostile and almost never
intended. Causes: an if with no else, a case with neither all values covered nor a
default, or one forgotten output in one branch of a block that assigns five. Defences:
assign every output a default value at the top of the block, always include a default
case, and read the synthesis report, which will say inferred latch and name the
signal. In SystemVerilog, always_comb makes the tool flag it as an error, which is the
real fix.</p>
<h3>if versus case: priority versus parallel</h3>
<p>A chain of if-else-if implies priority: the first true condition wins, and the
hardware is a cascade of muxes, deeper for later branches. A case on a single selector
implies a parallel mux: one balanced decode, all branches equal delay. Use if chains
when priority is real (interrupt arbitration), case when the branches are exclusive by
construction (FSM state decode). A long if chain where a case belongs is a common
cause of a slow path.</p>
<h3>Getting BRAM and DSP inference</h3>
<p>Block RAM has synchronous reads: the output appears a cycle after the address. To
infer BRAM, your RTL must read the memory array inside a clocked block; an
asynchronous read forces the tool to build the memory from thousands of registers and
LUTs, which you will notice in the utilisation report immediately. Match your
write-mode template (read-first or write-first) to the vendor's documented patterns.
DSP blocks are inferred from multiply and multiply-accumulate patterns; give the tool
registers before and after the multiplier so it can pull them into the DSP slice's
internal pipeline stages, which is the difference between a 100 MHz multiplier and a
400 MHz one.</p>
<h3>Initial values: FPGA versus ASIC</h3>
<p>In an FPGA, every flip-flop and BRAM has a defined power-up value loaded from the
bitstream, so initialising a register at declaration is real and synthesisable, and
ROMs can be initialised the same way. In ASIC flows there is no bitstream: power-up
state is random and initial values are ignored, so anything needing a known state
needs a reset. If you interview for ASIC-adjacent work, say explicitly that you know
FPGA habits like relying on initial values do not travel.</p>`,
quiz: [
{ q: "A combinational always block assigns a signal in the if branch but has no else. Synthesis produces:",
o: ["A flip-flop", "An error, always", "A transparent latch holding the old value on the missing path", "A multiplexer with one input tied off"],
a: 2, why: "An unassigned path means hold the previous value, and combinational logic cannot hold state, so the tool infers a level-sensitive latch." },
{ q: "The most reliable way to be told about an unintended latch is:",
o: ["Waveform inspection in ModelSim", "Counting registers in the floorplan", "Code review only", "The synthesis report's inferred-latch warnings, or using an always_comb block which makes it an error"],
a: 3, why: "Simulation of the RTL matches latch semantics, so waveforms look fine. The synthesis report names latched signals; always_comb turns the mistake into an error." },
{ q: "An if-else-if chain differs from a case statement in the implied hardware because:",
o: ["The if chain implies priority and a mux cascade; a case implies a parallel, balanced mux", "The case is always slower", "The if chain cannot be synthesised", "There is no hardware difference ever"],
a: 0, why: "if-else ordering encodes priority, giving cascaded logic. A case on one selector decodes in parallel with equal delay per branch." },
{ q: "To get a memory array inferred into block RAM you must:",
o: ["Use an initial block", "Read it asynchronously for speed", "Read it inside a clocked block, because BRAM reads are synchronous with one cycle of latency", "Declare it as a two-dimensional wire"],
a: 2, why: "BRAM has registered read ports. Asynchronous reads force implementation in fabric registers and LUTs, exploding utilisation." }
],
interview: {
q: "Your block's LUT count doubled after a colleague's small refactor. How do you investigate?",
a: "I would diff the synthesis reports before and after, not just the totals: per-module utilisation usually points at the culprit immediately. My first suspicion would be a memory that stopped inferring as block RAM, because turning even a small array into fabric registers and read muxes easily doubles LUTs; the report's RAM summary confirms that in seconds. Second suspicion: inferred latches or lost resource sharing from a restructured case statement. Third: an initialisation or constant change that stopped the optimiser pruning logic that was previously dead. Then I would read the actual diff with those hypotheses in mind, which is far more effective than reading it cold. It is usually the RAM. Once found, I would restore the vendor's inference template and add the report check to review."
}
},

{
id: "rtl-verif",
track: "RTL & Verilog",
sub: "Verification and flow",
title: "Verification: testbenches to assertions",
mins: 30,
body: `
<p>Verification is where FPGA interviews separate developers from engineers. The
question behind every question is: how do you know your design works, other than
watching waveforms until you feel confident? You have real co-simulation experience;
this lesson gives it industry vocabulary.</p>
<h3>The self-checking testbench</h3>
<p>A proper bench has structure: a stimulus generator producing transactions, a driver
wiggling pins to apply them, a monitor watching the DUT's outputs and reassembling
transactions, and a checker or scoreboard comparing what came out against what should
have. The bench ends by printing a pass or fail verdict and an error count. The
defining property is that no human looks at waveforms to decide correctness; waveforms
are for debugging a failure the bench has already caught. Eyeballing does not scale
for three reasons: it checks one run of one scenario, it cannot be repeated after
every change, and it silently degrades, because the human checks less carefully on the
fortieth viewing than the first.</p>
<h3>Golden reference models</h3>
<p>The scoreboard needs a source of truth. For algorithmic blocks the strongest answer
is a golden model: an independent implementation, typically in C or Python or even
MATLAB, fed the same stimulus, with outputs compared automatically, ideally
transaction by transaction rather than as a final file diff. You have done exactly
this with SystemVerilog testbench co-simulation against software models, so say so
concretely in interviews: the model catches algorithmic misunderstandings, the RTL
comparison catches implementation bugs, and disagreements are gold because one side is
always wrong in an instructive way. Keep the model genuinely independent: porting the
RTL's structure into C just duplicates its bugs.</p>
<h3>Directed versus constrained-random</h3>
<p>Directed tests encode scenarios you already fear: reset mid-transfer, back-to-back
writes, the FIFO exactly full. Constrained-random generates legal-but-weird stimulus
inside declared constraints, with a different seed per run, and finds the scenarios
you did not think of; it is why the methodology exists, because the bugs that survive
to silicon are by definition the unimagined ones. Mature environments run both:
directed for known corners and regression of past bugs, random for breadth. Random
requires the self-checking machinery above, since no human can predict the expected
output of random stimulus.</p>
<h3>Assertions in plain words</h3>
<p>An immediate assertion is a statement inside procedural code: check this condition
now, when execution reaches this line. A concurrent assertion (SVA) is a small
watcher, clocked like the design, that continuously checks a temporal rule such as:
whenever request rises, grant must arrive within four cycles; or valid and ready
never overlap with the buffer full. Assertions live with the RTL, fire the moment a
protocol is violated rather than a thousand cycles later at the scoreboard, and they
document intent in an executable form. They are also the entry point to formal tools,
which try to prove them rather than merely test them.</p>
<h3>Coverage and regression discipline</h3>
<p>Code coverage asks whether the simulator exercised each line and branch of RTL;
necessary but shallow, since executing a line is not checking it. Functional coverage
asks whether the scenarios you declared interesting actually occurred: every FSM
state, every packet length bucket, full and empty each hit. Random without functional
coverage is unmeasured hope. Finally, regression: every test, every meaningful change,
automated, with recorded seeds so failures reproduce; a bug fixed earns a test that
would have caught it. That habit transfers directly from any serious software
culture, and interviewers light up when hardware candidates have it.</p>`,
quiz: [
{ q: "The defining property of a self-checking testbench is:",
o: ["It uses classes and objects", "The bench itself decides pass or fail against expected behaviour, with no human judging waveforms", "It runs faster than an interactive simulation", "It requires UVM"],
a: 1, why: "Structure and methodology vary; the essential property is automated checking with a machine-readable verdict, making regression possible." },
{ q: "Constrained-random testing is valuable chiefly because:",
o: ["It removes the need for checking", "It runs fewer cycles than directed tests", "It reaches legal corner cases the engineer never imagined, which is where surviving bugs live", "It replaces code review"],
a: 2, why: "Directed tests only probe anticipated scenarios. Randomisation inside legal constraints explores the space of unanticipated ones, given automated checking." },
{ q: "A concurrent SVA assertion is best described as:",
o: ["A print statement inside an always block", "A synthesis pragma", "A file comparison after simulation", "A clocked watcher that continuously checks a temporal rule, such as a request being granted within a bounded number of cycles"],
a: 3, why: "Concurrent assertions sample on a clock and track sequences over time, firing at the moment of violation. Immediate assertions check a condition at one execution point." },
{ q: "Full code coverage with low functional coverage means:",
o: ["Every RTL line was executed, but many declared scenarios of interest never occurred", "The design is fully verified", "The testbench has a syntax problem", "Functional coverage is redundant and can be ignored"],
a: 0, why: "Code coverage measures execution, not scenarios. Lines can all run without ever hitting FIFO-full, minimum-length packets or a specific state sequence." }
],
interview: {
q: "Describe a verification setup you have actually built and what you would improve now.",
a: "For motion-control FPGA blocks I built SystemVerilog testbenches co-simulating against software reference models: the same stimulus drove both the RTL and the model, and the bench compared outputs automatically rather than my eyeballing waveforms in ModelSim, which does not scale past the first week. That caught both algorithmic misunderstandings and RTL bugs, and disagreements were always instructive because one side was provably wrong. Improving it now, I would add three things: concurrent SVA assertions on the internal interfaces so protocol violations fire at the cycle they occur instead of surfacing later at the scoreboard; functional coverage so the interesting scenarios are measured rather than assumed; and constrained-random stimulus on top of my directed tests, with seeds logged in an automated regression, so every change reruns everything reproducibly."
}
},

{
id: "rtl-sv",
track: "RTL & Verilog",
sub: "The language",
title: "SystemVerilog upgrades worth using",
mins: 25,
body: `
<p>SystemVerilog fixes most of the complaints a VHDL engineer has about Verilog, and
much of it is a homecoming: strong-ish typing, enumerations and packages are things
VHDL had all along. This lesson covers the design-side subset (you already know the
verification side from your testbench work) and the order in which to adopt it.</p>
<h3>logic: one type to replace the reg and wire confusion</h3>
<p>The type logic is a four-state type usable in both procedural and continuous
assignments, so the arbitrary reg-versus-wire bookkeeping disappears: declare ports
and internal signals as logic and move on. The one restriction is that logic permits a
single driver; for genuinely multiply-driven nets, tri-states on a bidirectional pin,
you still need a net type like wire. In practice that means pad-level code keeps wire
and everything else becomes logic.</p>
<h3>Intent-checked always blocks</h3>
<p>Plain always leaves the tool guessing what you meant. The specialised forms declare
intent and make the tool enforce it: always_ff for registers, always_comb for
combinational logic, always_latch for the rare intentional latch. The payoff is
concrete: an incomplete assignment inside always_comb, which plain Verilog would
quietly turn into an inferred latch, becomes a compile-time error. always_comb also
computes its own sensitivity and triggers once at time zero, removing two more classic
Verilog foot-guns. There is no reason to write a plain always block in new design
code.</p>
<h3>Enums for FSM states</h3>
<p>VHDL enumerated state types finally return:</p>
<pre>typedef enum logic [1:0] {IDLE, RUN, HALT} state_t;
state_t state, state_next;</pre>
<p>You get named states in waveforms instead of raw bit patterns, a compile error when
assigning a bare integer without a cast, and the synthesiser still free to re-encode.
Anyone who has debugged a Verilog FSM of localparams as anonymous bit patterns adopts
enums the same day.</p>
<h3>Packages</h3>
<p>Packages hold shared parameters, typedefs and functions, imported where needed,
exactly like VHDL packages. They end the include-file culture of Verilog-2001 and give
one authoritative definition for bus widths, opcodes and common types across design
and testbench.</p>
<h3>Interfaces and modports, at concept level</h3>
<p>An interface bundles the signals of a bus (valid, ready, data, response) into one
named object, so a connection that took twenty port hookups becomes one line, and
adding a signal to the bus touches the interface definition instead of every module
boundary in the hierarchy. Modports give each end its view: the master modport sees
outputs where the slave modport sees inputs. Interfaces can also carry assertions and
timing for the protocol in one place. Concept is enough for interviews, plus one
honest caveat: tool support in synthesis has historically lagged simulation, so some
teams keep interfaces for verification only.</p>
<h3>Packed versus unpacked arrays</h3>
<p>A packed dimension, written before the name, is a contiguous bit vector: a 32-bit
word you can slice and treat as one number. An unpacked dimension, written after the
name, is a collection of separate elements: a memory of 256 words, a lookup table.
Rule of thumb: packed means bits of one value, unpacked means many values.</p>
<h3>Adoption order</h3>
<p>Coming from VHDL or Verilog-2001, adopt in this order: logic everywhere with
always_ff and always_comb (mechanical, immediate safety), then enums for every FSM,
then packages for shared types, and interfaces last, once the team and the tools
agree. The first two steps alone eliminate the majority of classic Verilog bugs, and
saying exactly that, with reasons, is a strong interview answer.</p>`,
quiz: [
{ q: "The main practical benefit of declaring signals as logic instead of reg or wire is:",
o: ["Two-state simulation speed", "It infers registers automatically", "One type works in both procedural and continuous assignments, ending the reg-versus-wire bookkeeping, with single-driver checking", "It is required for synthesis"],
a: 2, why: "logic removes the arbitrary distinction Verilog forced on you. Only genuinely multi-driven nets, such as tri-state buses, still need a net type." },
{ q: "An incomplete assignment (a missing branch) inside an always_comb block results in:",
o: ["A compile-time error or firm tool complaint, instead of a silently inferred latch", "A silently inferred latch, as in plain Verilog", "A flip-flop", "Undefined behaviour"],
a: 0, why: "always_comb declares combinational intent, so storage inference violates the declaration and the tool must object. Plain always infers a latch quietly." },
{ q: "Using an enum for FSM states gives you all of the following EXCEPT:",
o: ["State names visible in waveform viewers", "Compile-time protection against assigning arbitrary integers without a cast", "A guarantee that synthesis keeps your exact binary encoding", "Cleaner, self-documenting state machine code"],
a: 2, why: "Enums improve type safety and debug visibility, but the synthesiser may still re-encode states, for example to one-hot, unless you constrain it." },
{ q: "A packed array differs from an unpacked array in that:",
o: ["Packed arrays exist only in testbenches", "A packed dimension forms one contiguous bit vector treatable as a single value; unpacked dimensions are collections of separate elements", "Unpacked arrays cannot be synthesised", "Packed arrays are always faster in hardware"],
a: 1, why: "Packed means bits of one value, sliceable and usable in arithmetic; unpacked means many values, such as a memory of words." }
],
interview: {
q: "Your new team writes plain Verilog-2001 for synthesis. They ask which SystemVerilog features are worth adopting first. What do you recommend?",
a: "Two changes with immediate payoff and near-zero risk: declare signals as logic, and replace every plain always with always_ff or always_comb. Those are mechanical edits, every synthesis tool supports them, and they convert two silent bug classes, accidental latches from incomplete assignments and sensitivity list mistakes, into compile-time errors. Next, enums for FSM states: named states in waveforms pay for themselves the first debug session. Then packages for shared widths and types, replacing include files. I would hold interfaces until last; they are genuinely valuable for big buses but they change module boundaries and tool support needs checking, so I would pilot them on one block. Coming from VHDL, half of this list is just getting back what I had, so I have concrete experience of its value."
}
},

{
id: "rtl-fpga",
track: "RTL & Verilog",
sub: "Interfaces and systems",
title: "FPGA architecture and timing closure",
mins: 30,
body: `
<p>Timing closure questions test whether you understand the silicon under your RTL.
You have closed designs in Quartus; this lesson turns that experience into the
vocabulary interviewers listen for, vendor-neutrally.</p>
<h3>The fabric</h3>
<p>The unit of logic is the LUT, a small lookup memory: a 6-input LUT implements any
Boolean function of six inputs in one cell, at one delay, regardless of the function's
apparent complexity. LUTs are grouped with flip-flops into slices or ALMs (the Intel
term you know from Quartus), so every LUT output has a register beside it, which is
why pipelining is nearly free in area: the flops are already there, unused. Dedicated
carry chains run vertically between cells, making adders and counters fast and
compact; arithmetic infers onto them automatically. Between all of this sits the
programmable routing network, which is the resource that actually runs out.</p>
<h3>Hard blocks</h3>
<p><b>Block RAM</b>: dedicated memory tiles, dual-ported, with synchronous reads: the
data appears one cycle after the address, and enabling the optional output register
adds a second cycle but substantially improves clock speed. Designs that expect
combinational reads from BRAM do not close timing; design the pipeline around the
latency from the start. <b>DSP slices</b>: hard multipliers with a pre-adder and an
accumulator and internal pipeline registers; a fully pipelined DSP runs several times
faster than the same multiplier in fabric, but only if your RTL provides registers
around the multiply for the tool to absorb into the block. <b>Clocking</b>: PLLs and
MMCMs synthesise, multiply and phase-shift clocks, which then travel on dedicated
global clock networks engineered for low skew across the whole die. Clocks belong on
global nets, generated by clock primitives; a clock produced by fabric logic acquires
skew and turns timing analysis into guesswork, which is the architectural reason
behind the use-clock-enables rule.</p>
<h3>Why routing dominates</h3>
<p>In a modern FPGA, routing typically contributes half or more of a path's delay,
often well over that in a congested design. A path's delay is LUT delays plus wire
delays through many programmable switches, and the switches are slow relative to the
logic. Consequences: two logically identical netlists can close differently depending
on placement; utilisation above roughly 80 percent makes congestion the main enemy;
and reducing levels of logic helps twice, removing both the LUT delays and the routing
hops between them.</p>
<h3>Reading a failing timing report</h3>
<p>Start with worst negative slack and the total negative slack, then open the worst
path. Read it as a story: source flop, clock-to-q, then alternating cell and net
delays through the logic levels, then setup at the destination, against the clock
period adjusted for skew and uncertainty. Two diagnostic numbers: levels of logic, and
the ratio of logic delay to routing delay. Many levels means the RTL is too deep
between registers: restructure or pipeline. Few levels but large routing delay means
placement or congestion trouble: the endpoints may be far apart, perhaps forced apart
by pin or BRAM locations. Also check the failing endpoints list for a pattern: one
deep cone, or a high-fanout net touching everything.</p>
<h3>Closure levers, ranked</h3>
<p>In order of preference: first, pipeline, cutting deep paths with the registers the
fabric already gives you, if the latency is tolerable. Second, restructure: precompute
comparisons into registered flags, flatten priority chains into parallel decodes,
duplicate a high-fanout register so each copy drives a region, rebalance logic between
existing stages, and let retiming move registers through logic. Third, help placement
with better constraints. Floorplanning by hand comes last: it is powerful but brittle,
a fixed floorplan fights every subsequent design change, so treat it as the tool you
reach for when the RTL levers are exhausted, and say exactly that when asked.</p>`,
quiz: [
{ q: "A 6-input LUT implements:",
o: ["Only AND and OR functions", "Up to six separate 1-input functions", "Any Boolean function of up to six inputs, in one cell delay", "Functions of at most six product terms"],
a: 2, why: "A LUT is a truth-table memory addressed by its inputs, so any function of its inputs costs the same single cell and delay." },
{ q: "Block RAM reads are:",
o: ["Synchronous, with data arriving a cycle after the address, plus an optional output register for speed", "Combinational, like a fabric lookup", "Only possible on one port", "Asynchronous but slower"],
a: 0, why: "BRAM ports are registered. Pipelines must budget the read latency; expecting same-cycle data forces the memory into fabric and ruins utilisation and timing." },
{ q: "On a failing path, the report shows few levels of logic but routing making up most of the delay. The likely problem is:",
o: ["Too many pipeline stages", "The RTL is too deep between registers", "A missing default in a case statement", "Placement or congestion: the endpoints are physically far apart or the region is crowded"],
a: 3, why: "Little logic with big net delay points at distance and congestion, not logic depth. Deep logic shows up as many levels with delay spread across cells." },
{ q: "Why is hand floorplanning ranked last among timing closure levers?",
o: ["It never improves timing", "The tools ignore floorplan constraints", "It is effective but brittle: a fixed floorplan resists every later design change, so exhaust pipelining and restructuring first", "It only works on ASICs"],
a: 2, why: "RTL-level fixes are robust and travel with the code. A hand floorplan is tied to one snapshot of the design and becomes a maintenance burden." }
],
interview: {
q: "A design meets timing at 100 MHz but the new requirement is 150 MHz. Take me through your approach.",
a: "First I would get the truth from the tools: run at 150 MHz and read the worst paths, because the fix depends entirely on whether I see deep logic, long routes, or a few specific structures. Deep logic cones I pipeline or restructure, precomputing comparisons into registered flags and flattening priority chains; the fabric gives me the flip-flops almost free, and control loops usually tolerate the extra latency. If multipliers or memories are on the paths, I make sure DSP and BRAM pipeline registers are actually enabled, which is often a large gain for one line of RTL. High-fanout control signals get duplicated registers. If failures are routing-dominated, I look at utilisation and placement before logic. Floorplanning is my last lever, and I would also honestly ask whether 150 MHz everywhere is needed, or only in one clock domain."
}
}

);
