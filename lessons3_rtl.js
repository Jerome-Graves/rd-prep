// RTL and Verilog lessons, second course: architecture and physical design.
//
// These carry a `sub` so the page groups them under a heading, in the same way
// the Embedded C track is organised.
//
// Operators are spelled out in words rather than written as symbols, so that
// nothing in the prose can be mistaken for markup when the page renders it.

LESSONS.push(

{
id: "rtl-pipelining",
track: "RTL & Verilog",
sub: "Architecture and physical design",
title: "Pipelining: buying frequency with latency",
mins: 22,
body: `
<p>A combinational path between two registers has a delay, and the clock period must exceed it.
Pipelining breaks that path into shorter pieces with registers between them, so each piece is
faster and the clock can go up. What you pay is latency: the answer now emerges several cycles
after the input.</p>

<svg class="fig" viewBox="0 0 680 260" role="img" aria-label="One long combinational path against the same logic split into three shorter stages with registers between">
<rect class="bxa" x="24" y="24" width="632" height="34" rx="4"/>
<text class="th" x="40" y="47">the same logic, before and after</text>

<rect class="bx" x="40" y="76" width="30" height="46" rx="3"/>
<text class="ts" x="46" y="104">R</text>
<rect class="bx" x="86" y="76" width="470" height="46" rx="3"/>
<text class="ts" x="240" y="104">one long combinational path</text>
<rect class="bx" x="572" y="76" width="30" height="46" rx="3"/>
<text class="ts" x="578" y="104">R</text>
<text class="ts" x="40" y="142">slow clock, one cycle of latency</text>

<rect class="bx" x="40" y="176" width="30" height="46" rx="3"/>
<text class="ts" x="46" y="204">R</text>
<rect class="bx" x="86" y="176" width="140" height="46" rx="3"/>
<text class="ts" x="126" y="204">stage 1</text>
<rect class="bx" x="242" y="176" width="30" height="46" rx="3"/>
<text class="ts" x="248" y="204">R</text>
<rect class="bx" x="288" y="176" width="140" height="46" rx="3"/>
<text class="ts" x="328" y="204">stage 2</text>
<rect class="bx" x="444" y="176" width="30" height="46" rx="3"/>
<text class="ts" x="450" y="204">R</text>
<rect class="bx" x="490" y="176" width="112" height="46" rx="3"/>
<text class="ts" x="514" y="204">stage 3</text>
<text class="ts" x="40" y="242">fast clock, three cycles of latency, same throughput per cycle</text>
</svg>

<p>The key distinction is <b>throughput</b> against <b>latency</b>. A pipelined design still
accepts one input per clock and produces one output per clock; it simply produces the answer to
an older input. For a streaming datapath that is exactly what you want, which is why pipelining
is almost free in signal processing and expensive in a control loop where the latency is inside
the feedback.</p>

<p>Balancing the stages is what actually determines the frequency, because the clock is set by
the <i>slowest</i> stage. Splitting a path into three unequal pieces buys you only the
improvement of the longest one, so the useful work is in finding a split that divides the delay
evenly, not simply in adding registers.</p>

<p>Two structural consequences follow. Any <b>control signal</b> that accompanies the data has
to be delayed by the same number of stages, or it will apply to the wrong data. A valid signal,
a tag, or a write address all have to travel down a matched shift register alongside the
datapath, and getting that wrong is the classic pipelining bug.</p>

<p>And any <b>feedback</b> path constrains you absolutely. An accumulator that feeds its own
output back cannot be pipelined without changing the algorithm, because the next result depends
on the current one. The answers are to restructure, for instance by keeping several partial sums
and combining them at the end, or to accept the frequency the loop allows.</p>

<p>Retiming is the tool that automates the balancing: the synthesis tool moves existing
registers across combinational logic without changing the cycle-level behaviour. It cannot
invent latency you did not already have, so putting the registers in and letting the tool
distribute them is a common and effective pattern.</p>
`,
quiz: [
{ q: "What does pipelining a datapath cost you?",
o: ["Throughput, which falls with each stage added", "Latency, since the answer emerges several cycles later", "Area, but only in the routing", "Frequency, which falls as stages are added"],
a: 1, why: "Throughput stays at one result per clock. It is the latency that grows, which is free in a streaming path and expensive inside a feedback loop." },
{ q: "What determines the clock frequency of a pipelined design?",
o: ["The total delay through all the stages", "The delay of the slowest single stage", "The number of stages used", "The delay of the first stage"],
a: 1, why: "That is why balancing matters: splitting into three unequal pieces buys only the improvement of the longest one." },
{ q: "What must happen to a valid signal accompanying pipelined data?",
o: ["It must be registered once at the input", "It must be delayed by the same number of stages", "It must be held high for the whole pipeline", "It must be regenerated at the output"],
a: 1, why: "Otherwise the control applies to the wrong data. A matched shift register alongside the datapath is the standard structure and forgetting it is the classic bug." },
{ q: "Why can an accumulator not simply be pipelined?",
o: ["Accumulators cannot contain registers", "The next result depends on the current one", "The adder is already the fastest path", "Feedback paths cannot be constrained"],
a: 1, why: "The feedback fixes the loop delay, so the frequency is capped. Keeping several partial sums and combining them at the end is the usual restructuring." }
],
interview: {
q: "Your design misses timing by a wide margin on one path. What are your options?",
a: "First I would look at the path itself rather than reach for a fix, because the three common causes have different answers: it might be genuinely unconstrained or wrongly constrained, in which case the report is misleading; it might be a routing or congestion problem rather than logic depth; or it might really be too much combinational logic between registers. Assuming it is the third, pipelining is the main tool. I break the path with registers so each piece is shorter, which lets the clock go up, and what I pay is latency rather than throughput, because a pipelined datapath still takes one input and produces one output per clock, just for an older input. That trade is nearly free in a streaming signal path and expensive in a control loop where the latency sits inside the feedback, so the first question is which of those I am in. When I do pipeline, the work is in balancing the stages, because the clock is set by the slowest one, so splitting a path into three unequal pieces only buys me the improvement of the longest. In practice I often insert the registers and let retiming distribute them, since the tool can move existing registers across logic without changing cycle-level behaviour, though it cannot invent latency I did not already have. The thing I would be careful about is the control signals: any valid, tag or address travelling with the data has to be delayed by exactly the same number of stages, and a mismatched shift register there is the classic pipelining bug. And if the path is inside a feedback loop, like an accumulator, pipelining does not help at all and I would have to restructure the algorithm, for instance by keeping several partial sums and combining them at the end."
}
},

{
id: "rtl-reset",
track: "RTL & Verilog",
sub: "Architecture and physical design",
title: "Reset architecture: what to reset, and how to release it",
mins: 20,
body: `
<p>Reset looks trivial and is one of the easier things to get subtly wrong. The decisions are
whether reset is synchronous or asynchronous, which registers actually need it, and how it is
released across a large design.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Asynchronous assertion with synchronised release, the reset synchroniser structure">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">asynchronous assert, synchronous release</text>

<rect class="bx" x="40" y="88" width="130" height="60" rx="4"/>
<text class="ts" x="56" y="114">external reset</text>
<text class="ts" x="56" y="136">arrives any time</text>

<line class="ln" x1="170" y1="118" x2="230" y2="118"/>
<rect class="bx" x="230" y="88" width="120" height="60" rx="4"/>
<text class="ts" x="246" y="114">flop 1</text>
<line class="ln" x1="350" y1="118" x2="400" y2="118"/>
<rect class="bx" x="400" y="88" width="120" height="60" rx="4"/>
<text class="ts" x="416" y="114">flop 2</text>
<line class="ln" x1="520" y1="118" x2="580" y2="118"/>
<text class="ts" x="580" y="122">to design</text>

<text class="ts" x="40" y="186">assertion passes straight through: the design resets immediately</text>
<text class="ts" x="40" y="212">release is clocked out: every flop leaves reset on the same edge</text>
</svg>

<p>A <b>synchronous</b> reset is just another data input and is analysed by static timing like
any other path. It needs a running clock to take effect, which is a real problem if the clock
itself is not yet stable at power-up.</p>

<p>An <b>asynchronous</b> reset takes effect without a clock, which is what you want at
power-up. Its danger is at <i>release</i>: if the reset deasserts near a clock edge, different
flops may leave reset on different cycles, and a state machine can start in an impossible state.
Timing tools check this as a <b>recovery and removal</b> check, which is the asynchronous
equivalent of setup and hold.</p>

<p>The structure that gets both properties is the <b>reset synchroniser</b>: assert
asynchronously, so the design resets even with no clock, and release through two flops clocked
by the destination clock, so every register leaves reset on the same edge. Each clock domain
needs its own, because a reset released cleanly in one domain says nothing about another.</p>

<p>The next question is what actually needs resetting. <b>Control</b> logic does: a state
machine must start somewhere defined. <b>Datapath</b> registers usually do not, because the
control logic will not act on their contents until valid data has propagated. Leaving the
datapath unreset saves routing and often helps timing, since a global reset with a fanout of
thousands is a difficult net in its own right.</p>

<p>On an SRAM-based FPGA there is a further wrinkle: every flop is initialised from the
configuration bitstream, so the design starts in a known state whether or not you wrote a reset.
That is convenient and it is not portable, so code intended for an ASIC should not rely on it.</p>
`,
quiz: [
{ q: "What is the danger of an asynchronous reset?",
o: ["It cannot take effect without a clock", "Its release near a clock edge can leave flops in different states", "It cannot be analysed by static timing at all", "It requires a dedicated global routing resource"],
a: 1, why: "Different flops may leave reset on different cycles, so a state machine can start in an impossible state. The check for it is called recovery and removal." },
{ q: "What does a reset synchroniser do?",
o: ["Delays the reset by a fixed number of cycles", "Asserts asynchronously and releases synchronously", "Converts a synchronous reset into an asynchronous one", "Distributes the reset across clock domains"],
a: 1, why: "You get the power-up behaviour of an asynchronous assert and a clean, same-edge release. Each clock domain needs its own." },
{ q: "Why are datapath registers often left unreset?",
o: ["They cannot be reset in fabric", "Control logic will not act on them until valid data arrives", "Resetting them would violate hold timing", "They are initialised from the bitstream instead"],
a: 1, why: "It saves routing and often helps timing, because a global reset with a fanout of thousands is a difficult net in its own right." },
{ q: "Why should ASIC-bound code not rely on FPGA power-up initialisation?",
o: ["It is only applied to block RAM contents", "There is no configuration bitstream to load it from", "It takes too long during ASIC power-up", "It conflicts with the reset synchroniser"],
a: 1, why: "An SRAM-based FPGA loads every flop from the bitstream, so the design starts in a known state. In an ASIC that state is genuinely unknown." }
],
interview: {
q: "How would you design the reset scheme for a design with three clock domains?",
a: "I would use an asynchronous assert with a synchronous release, implemented as a reset synchroniser per clock domain. The asynchronous assertion matters because at power-up the clock may not be running or stable yet, and I need the design to go into reset regardless. The synchronous release matters because if the reset deasserts near a clock edge, different flops can leave reset on different cycles, and a state machine that starts partly reset can be in a state that does not exist in its encoding. So the structure is: the raw reset drives the asynchronous reset pin of two flops, and those two flops are clocked by the destination clock, so the release is clocked out and every register in that domain leaves reset on the same edge. Each of the three domains needs its own synchroniser, because a clean release in one domain tells me nothing about another, and I would also think about whether the domains need to come out of reset in a particular order, which is a design question rather than an automatic one. On what to reset, I would reset the control logic, because a state machine has to start somewhere defined, and generally leave the datapath registers unreset, because the control will not act on their contents until valid data has propagated through, and a global reset with a fanout of thousands is a hard net to route and can itself cause timing problems. I would make sure the constraints include the recovery and removal checks on the reset paths, since that is the asynchronous equivalent of setup and hold and is easy to leave unconstrained. And if this were headed for an ASIC I would not rely on FPGA power-up initialisation from the bitstream, because that state does not exist there."
}
},

{
id: "rtl-memory",
track: "RTL & Verilog",
sub: "Architecture and physical design",
title: "Memory in fabric: registers, block RAM and external DRAM",
mins: 22,
body: `
<p>Storage in an FPGA comes in tiers, and choosing the wrong one is a common reason a design
does not fit or does not run. The tiers differ by three orders of magnitude in size and by a
similar factor in access cost.</p>

<svg class="fig" viewBox="0 0 680 260" role="img" aria-label="Four storage tiers from registers through distributed RAM and block RAM to external DRAM, with size and latency growing together">
<rect class="bx" x="24" y="30" width="632" height="46" rx="4"/>
<text class="th" x="40" y="52">registers: bits, single cycle, any access pattern</text>
<text class="ts" x="40" y="70">use for state and small buffers</text>

<rect class="bx" x="24" y="86" width="632" height="46" rx="4"/>
<text class="th" x="40" y="108">distributed RAM from lookup tables: tens of words, asynchronous read</text>
<text class="ts" x="40" y="126">cheap up to a few hundred bits, then expensive</text>

<rect class="bx" x="24" y="142" width="632" height="46" rx="4"/>
<text class="th" x="40" y="164">block RAM: kilobits each, synchronous read, dual port</text>
<text class="ts" x="40" y="182">the workhorse, but a fixed and finite resource</text>

<rect class="bx" x="24" y="198" width="632" height="46" rx="4"/>
<text class="th" x="40" y="220">external DRAM: megabytes, long and variable latency</text>
<text class="ts" x="40" y="238">throughput is good, latency is terrible, access order matters enormously</text>
</svg>

<p><b>Block RAM</b> is the workhorse and the resource people run out of. It is synchronous: the
address is registered and the data appears on the next edge, with an optional output register
adding another cycle. Forgetting that latency is a classic off-by-one in an address generator,
and it is why a read must be issued before the data is needed.</p>

<p>The dual-port nature is what makes it so useful. Two independent ports, each with its own
clock, is precisely the structure an asynchronous FIFO needs, and it is why a FIFO between clock
domains costs one block RAM and a little pointer logic.</p>

<p>The behaviour on a <b>simultaneous read and write to the same address</b> is where the
families differ. Read-first returns the old data, write-first returns the new, and no-change
holds the previous output. These are not interchangeable, and the RTL has to describe whichever
the device actually implements or the inference fails and you get registers instead.</p>

<p><b>External DRAM</b> changes the problem qualitatively rather than quantitatively. Latency
is long and variable, so the design needs buffering and a tolerance for a response that has not
arrived. And the access <i>order</i> matters enormously: sequential bursts within an open row
are fast, and random access that closes and opens rows constantly can cost an order of
magnitude in effective bandwidth. A design that streams is a design that gets the quoted
number.</p>

<p>The practical planning step is to work out the storage budget before writing the RTL. A line
buffer for an image, a coefficient store and a small FIFO are each obvious in isolation, and
together they can exceed the device before anyone notices.</p>
`,
quiz: [
{ q: "What is the latency of a block RAM read?",
o: ["Combinational, available in the same cycle", "One cycle, or two with the output register", "Fixed in nanoseconds regardless of clock", "Variable, depending on the address"],
a: 1, why: "The address is registered and the data appears on the next edge. Forgetting that is a classic off-by-one in an address generator." },
{ q: "Why is block RAM's dual-port structure so useful?",
o: ["It doubles the available bandwidth", "Two ports with independent clocks is exactly what an asynchronous FIFO needs", "It allows the memory to be initialised at power-up", "It halves the power consumption"],
a: 1, why: "That is why a clock-domain-crossing FIFO costs one block RAM and a little Gray-coded pointer logic." },
{ q: "What happens on a simultaneous read and write to the same block RAM address?",
o: ["The write always takes priority", "It depends on the family and the configured mode", "The read returns an undefined value on every device", "The memory asserts a collision flag"],
a: 1, why: "Read-first, write-first and no-change are all offered and are not interchangeable. The RTL must describe whichever the device implements." },
{ q: "Why does access order matter so much for external DRAM?",
o: ["The controller reorders random accesses automatically", "Sequential bursts within an open row are far faster", "Random access exceeds the address bus width", "The refresh cycle blocks random reads"],
a: 1, why: "Constantly closing and opening rows can cost an order of magnitude in effective bandwidth. A design that streams is one that gets the quoted number." }
],
interview: {
q: "You need to buffer several video lines in an FPGA. How would you choose the storage?",
a: "I would start from the arithmetic, because the tier follows from the size. A line buffer is width times bits per pixel, so for something like 1920 pixels at 24 bits that is about 46 kilobits per line, and if I need three lines for a filter kernel that is around 138 kilobits. That is far too big for distributed RAM built from lookup tables, which is cheap up to a few hundred bits and expensive beyond, and it is well suited to block RAM, so I would plan on a handful of block RAMs and check that against the device's total, because the storage budget is the thing that catches people out when several features each look reasonable in isolation. Block RAM is synchronous, so I would design the address generator knowing the data appears one cycle after the address, or two with the output register enabled, and I would enable that output register if I needed the clock rate, because that is what lets the block run at its rated speed. I would also write the inference template to match whatever read-during-write behaviour the family actually implements, because read-first, write-first and no-change are not interchangeable and a mismatch either fails to infer or simulates differently from the hardware. If the frame store were larger, a whole frame rather than a few lines, then block RAM would not be enough and I would go to external DRAM, at which point the design problem changes character: the latency becomes long and variable so I need buffering and back-pressure, and I would have to organise the accesses into sequential bursts within open rows, because random access can cost an order of magnitude of effective bandwidth against the number on the datasheet."
}
},

{
id: "rtl-serdes",
track: "RTL & Verilog",
sub: "Architecture and physical design",
title: "High-speed serial: transceivers, encoding and equalisation",
mins: 22,
body: `
<p>Above a gigabit or so, a parallel bus stops working: skew between the lanes exceeds the bit
period and the routing becomes impossible. The answer is a serial link with the clock embedded
in the data, which is what an FPGA transceiver provides.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A transceiver chain from parallel data through encoding and serialisation, across the channel, to equalisation, clock recovery and decoding">
<rect class="bx" x="24" y="40" width="120" height="54" rx="4"/>
<text class="ts" x="40" y="66">parallel</text>
<text class="ts" x="40" y="86">data</text>
<rect class="bx" x="156" y="40" width="120" height="54" rx="4"/>
<text class="ts" x="172" y="66">encode</text>
<text class="ts" x="172" y="86">8b10b or 64b66b</text>
<rect class="bx" x="288" y="40" width="120" height="54" rx="4"/>
<text class="ts" x="304" y="66">serialise</text>
<text class="ts" x="304" y="86">plus pre-emphasis</text>

<rect class="bxa" x="420" y="40" width="236" height="54" rx="4"/>
<text class="th" x="436" y="66">the channel</text>
<text class="ts" x="436" y="86">loss rises with frequency</text>

<rect class="bx" x="24" y="140" width="150" height="54" rx="4"/>
<text class="ts" x="40" y="166">equalise</text>
<text class="ts" x="40" y="186">undo the channel</text>
<rect class="bx" x="186" y="140" width="150" height="54" rx="4"/>
<text class="ts" x="202" y="166">recover clock</text>
<text class="ts" x="202" y="186">from the edges</text>
<rect class="bx" x="348" y="140" width="150" height="54" rx="4"/>
<text class="ts" x="364" y="166">deserialise</text>
<rect class="bx" x="510" y="140" width="146" height="54" rx="4"/>
<text class="ts" x="526" y="166">align and decode</text>
</svg>

<p><b>Line coding</b> does several jobs at once. It guarantees enough transitions for the
receiver's clock recovery to lock, it keeps the running DC balance near zero so the link can be
AC coupled, and it provides special characters that are not valid data and can therefore mark
alignment boundaries. 8b10b costs twenty-five percent overhead to do this; 64b66b uses a
scrambler and costs about three percent, which is why it dominates at higher rates.</p>

<p><b>Clock and data recovery</b> extracts the sampling clock from the data's own transitions,
which is why a long run of identical bits is dangerous and why the coding must prevent it. This
is a phase-locked loop, with the same acquisition and tracking trade as any other.</p>

<p><b>Equalisation</b> compensates the channel. A metre of FR4 attenuates high frequencies far
more than low ones, so a fast edge arrives smeared into the neighbouring bits, which is
intersymbol interference. Pre-emphasis at the transmitter boosts the high frequencies before
they are lost; decision feedback equalisation at the receiver subtracts the known effect of the
previous bits. Both are usually adaptive and both are configured rather than designed.</p>

<p>The measurement that matters is the <b>eye diagram</b>: every bit period overlaid, showing
the opening in voltage and in time that the receiver has to sample within. Bit error rate
follows from how far the eye is open, and a bathtub curve shows how the error rate varies with
where in the bit you sample.</p>

<p>The practical advice for a first transceiver design is that almost everything is in the
configuration rather than the RTL. Reference clock quality, the equalisation settings, the
comma character and the alignment logic are where the time goes, and the vendor's example
design is a far better starting point than first principles.</p>
`,
quiz: [
{ q: "Why does a serial link need line coding?",
o: ["To compress the data before transmission", "To guarantee transitions, DC balance and alignment characters", "To detect and correct bit errors", "To allow several lanes to share one channel"],
a: 1, why: "Clock recovery needs edges, AC coupling needs DC balance, and alignment needs characters that cannot occur in data. 8b10b provides all three." },
{ q: "Why is 64b66b preferred over 8b10b at higher rates?",
o: ["It provides stronger error detection", "Its overhead is about three percent rather than twenty-five", "It does not require a scrambler", "It tolerates longer runs of identical bits"],
a: 1, why: "At twenty-five gigabits the coding overhead is real bandwidth, so the scrambler-based scheme wins despite being more complex." },
{ q: "What does transmitter pre-emphasis compensate for?",
o: ["Jitter in the reference clock", "The channel attenuating high frequencies more than low", "Reflections from an unterminated stub", "Offset between the two differential lines"],
a: 1, why: "Boosting the high-frequency content before the channel removes it reduces the intersymbol interference at the receiver." },
{ q: "What does an eye diagram show?",
o: ["The spectrum of the transmitted signal", "The voltage and timing margin available to the receiver", "The bit error rate against time", "The impedance of the channel"],
a: 1, why: "Every bit period is overlaid, so the opening is the margin. The bathtub curve then shows how the error rate varies with the sampling instant." }
],
interview: {
q: "You are bringing up a multi-gigabit serial link and seeing errors. How do you debug it?",
a: "I would work from the physical layer upwards, because at these rates most problems are analogue. The first thing I would look at is the reference clock, since the transceiver's jitter performance depends entirely on it and a marginal reference produces errors that look like everything else. Then I would use the transceiver's built-in eye scan if the device has one, because that gives me the actual voltage and timing margin at the receiver rather than a guess, and the shape tells me a great deal: a horizontally closed eye points at jitter and clock recovery, and a vertically closed one points at channel loss and equalisation. If the eye is closed I would work on the equalisation, increasing transmitter pre-emphasis and the receiver's equalisation settings, remembering that these are usually adaptive and that the useful move is to check whether adaptation has converged rather than to guess values. Alongside that I would confirm the link is actually achieving byte alignment, because a link that has locked its clock but is misaligned on the comma character produces errors that look random but are structured. I would use the built-in PRBS generator and checker rather than real traffic, because that gives me a clean bit error rate I can measure against, and I would run it long enough to mean something, since a rate of ten to the minus twelve needs a serious amount of time to observe. On the board side I would be looking at the channel itself: connector transitions, via stubs that resonate and put a notch in the response, and whether AC coupling capacitors are present and of a sensible value. And I would start from the vendor's example design rather than my own configuration, because almost all of the difficulty in a first transceiver bring-up is in the configuration rather than the RTL."
}
},

{
id: "rtl-power",
track: "RTL & Verilog",
sub: "Architecture and physical design",
title: "Power in fabric: where it goes and what actually reduces it",
mins: 20,
body: `
<p>Power divides into <b>static</b>, which flows whenever the device is powered, and
<b>dynamic</b>, which is spent charging and discharging capacitance as nodes switch. They
respond to entirely different remedies, so the first step is knowing which dominates.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Dynamic power proportional to activity capacitance and voltage squared, against static leakage which depends on process and temperature">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">dynamic</text>
<rect class="bx" x="24" y="72" width="308" height="140" rx="4"/>
<text class="ts" x="40" y="98">activity times capacitance</text>
<text class="ts" x="40" y="120">times voltage squared</text>
<text class="ts" x="40" y="142">times frequency</text>
<text class="th" x="40" y="178">reduce switching, or</text>
<text class="th" x="40" y="198">reduce the voltage</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">static</text>
<rect class="bx" x="348" y="72" width="308" height="140" rx="4"/>
<text class="ts" x="364" y="98">leakage through every</text>
<text class="ts" x="364" y="120">transistor, always</text>
<text class="ts" x="364" y="142">rises sharply with temperature</text>
<text class="th" x="364" y="178">choose the device and</text>
<text class="th" x="364" y="198">keep it cool</text>
</svg>

<p>Dynamic power is proportional to how often nodes toggle, to the capacitance they drive, and
to the square of the supply voltage. The voltage term is the reason a small reduction in supply
is worth so much, and it is largely fixed for you by the device family.</p>

<p>What you control in RTL is <b>activity</b>. A clock enable that stops a register updating
when its value would not change removes that register's switching entirely, and doing it at
block level, so a whole datapath idles, is far more effective than doing it per flop. Gating the
data rather than the clock has the same effect on the logic behind it without touching the clock
tree at all.</p>

<p>The <b>clock tree itself</b> is often the single largest consumer, because it toggles every
cycle by definition and drives an enormous capacitance. That is why hardware clock enables on
the flops help but do not eliminate the tree's own consumption, and why an ASIC uses integrated
clock-gating cells to shut branches off entirely. On an FPGA the equivalent is a clock buffer
with an enable, used at region granularity.</p>

<p>Memory choices matter more than people expect. Reading a block RAM every cycle when the
address has not changed burns real power, so gating the enable is worth doing. And a wide
external memory interface running continuously can dominate a design's total.</p>

<p>The habit that makes this tractable is to use the vendor's power estimator with <b>real
activity data</b> from simulation rather than the default assumptions. The default guesses a
toggle rate; a switching activity file from a realistic simulation replaces the guess with a
measurement, and the two frequently disagree by a factor of two or more.</p>
`,
quiz: [
{ q: "What is dynamic power proportional to?",
o: ["Temperature and the process corner", "Activity, capacitance, frequency and voltage squared", "The number of logic elements used", "The static leakage current"],
a: 1, why: "The voltage squared term is why a small supply reduction is worth so much, and activity is the part you actually control from RTL." },
{ q: "Why is the clock tree often the largest single consumer?",
o: ["It uses the widest routing resources", "It toggles every cycle by definition and drives huge capacitance", "It runs at a higher voltage than the fabric", "It cannot be gated at all"],
a: 1, why: "Flop-level enables reduce the logic's switching but not the tree's own. Gating whole branches, at region granularity on an FPGA, is what addresses it." },
{ q: "What is the most effective RTL-level power reduction?",
o: ["Idling whole blocks rather than individual registers", "Reducing the number of pipeline stages", "Using distributed RAM instead of block RAM", "Registering every module output"],
a: 1, why: "Block-level enables stop a whole datapath switching, which is far more effective than per-flop gating and much easier to reason about." },
{ q: "Why use a switching activity file with the vendor's power estimator?",
o: ["It is required before the tool will run", "It replaces a guessed toggle rate with a measured one", "It reduces the estimation time considerably", "It accounts for the static leakage term"],
a: 1, why: "The default assumption and a realistic simulation frequently disagree by a factor of two or more, which is the difference between a design that fits its budget and one that does not." }
],
interview: {
q: "Your FPGA design exceeds its power budget. How would you go about reducing it?",
a: "First I would find out where it actually goes, because static and dynamic power respond to completely different remedies and guessing wastes effort. I would run the vendor's power estimator with a switching activity file from a realistic simulation rather than the tool's default toggle assumptions, because those two frequently disagree by a factor of two, and I would break the result down by clock domain and by block. If static leakage dominates then my options are largely about device choice, speed grade and keeping the junction temperature down, and there is not much RTL can do. Assuming it is dynamic, the levers are activity, capacitance and frequency, since the voltage is fixed by the family. The biggest RTL-level win is usually idling whole blocks rather than individual registers: a clock enable at block level, so a complete datapath stops switching when it has nothing to do, is far more effective than per-flop gating and much easier to reason about. I would look hard at the clock tree, because it toggles every cycle by definition and drives an enormous capacitance, so gating whole regions with an enabled clock buffer addresses something that flop-level enables cannot. Then memories, because reading a block RAM every cycle when the address has not changed is real power for nothing, and a wide external memory interface running continuously can dominate everything else. I would also check whether any of the design can run at a lower clock rate, since a block that only needs a tenth of the throughput does not need the full clock, and whether any high-fanout nets are toggling more than they need to. Finally I would re-measure rather than trust the estimate, because power is one of those numbers where the model and the board often disagree."
}
},

{
id: "rtl-debug",
track: "RTL & Verilog",
sub: "Architecture and physical design",
title: "Debugging in fabric: what you can see and what you cannot",
mins: 20,
body: `
<p>Once a design is in hardware, simulation's total visibility is gone. You can see what you
instrumented and nothing else, and every probe changes the design. That constraint shapes how
you should approach a hardware-only bug.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="An integrated logic analyser capturing a window around a trigger, with limited depth and requiring signals to be chosen in advance">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">an integrated logic analyser capture</text>

<line class="ln" x1="60" y1="150" x2="640" y2="150"/>
<rect class="bx" x="230" y="110" width="200" height="80" rx="4"/>
<text class="th" x="250" y="140">captured window</text>
<text class="ts" x="250" y="164">depth is block RAM</text>

<line class="ln" x1="330" y1="90" x2="330" y2="200"/>
<text class="th" x="300" y="82">trigger</text>

<text class="ts" x="70" y="216">everything before</text>
<text class="ts" x="70" y="236">is already gone</text>
<text class="ts" x="470" y="216">everything after</text>
<text class="ts" x="470" y="236">is never captured</text>
</svg>

<p>An <b>integrated logic analyser</b> is a small capture engine built into your design. It
consumes block RAM for its buffer, consumes fabric for its trigger comparators, and adds routing
that changes placement and therefore timing. A design that only works with the analyser
instrumented, or only without it, is telling you something important about its margins.</p>

<p>Two constraints dominate its use. The <b>signals must be chosen before synthesis</b>, so
debugging becomes a cycle of guess, rebuild, observe, guess again, with each iteration costing a
full build. And the <b>capture depth is small</b>, a few thousand samples, so the trigger has to
be good enough to catch the interesting window rather than a random one.</p>

<p>That makes trigger design the skill. Triggering on a rare condition, on a sequence of
conditions, or on a counter reaching a value is what separates a useful capture from a picture
of the design working normally. Capturing on the error rather than on the stimulus is the
general principle.</p>

<p>There is a cheaper technique that is often better: bring a handful of signals out to
<b>spare pins</b> and watch them on a scope or a logic analyser. It has effectively unlimited
depth, it costs almost no fabric, and it can run for hours to catch something rare. It is
perfect for a state machine's state, a valid signal, or a timing relationship.</p>

<p>Better still is to <b>design for observability</b> from the start: counters for every error
condition, a snapshot register capturing the state at the moment of a fault, and a status
register a processor can read. Those cost very little fabric, they are always present rather
than added in a debug build, and they turn "it failed overnight" into a set of numbers.</p>

<p>The habit worth keeping is that a bug reproduced only in hardware should end up reproduced
in simulation. Use the hardware capture to find the stimulus that triggers it, then build a
directed test around that stimulus, so the fix can be verified where you have full visibility
and the regression protects it afterwards.</p>
`,
quiz: [
{ q: "What does an integrated logic analyser cost you?",
o: ["Only a small amount of routing", "Block RAM, fabric, and a change to placement and timing", "The ability to run the design at full speed", "Access to the external memory interface"],
a: 1, why: "A design that only works with it instrumented, or only without it, is telling you something important about its timing margins." },
{ q: "Why is trigger design the key skill with an ILA?",
o: ["The trigger determines the capture clock rate", "Depth is small, so the trigger must catch the interesting window", "Triggers are the only signals that can be probed", "A poor trigger corrupts the captured data"],
a: 1, why: "A few thousand samples means you capture the error, not the stimulus, and a rare condition or a sequence is usually what you need to trigger on." },
{ q: "What is the advantage of bringing signals out to spare pins?",
o: ["The signals can be driven as well as observed", "Effectively unlimited depth, at almost no fabric cost", "It avoids needing a rebuild to change signals", "It gives better timing resolution than an ILA"],
a: 1, why: "It can run for hours to catch something rare, which the small capture buffer of an ILA cannot. It is ideal for a state, a valid, or a timing relationship." },
{ q: "What should happen after a hardware-only bug is captured?",
o: ["The ILA should be left in the production build", "It should be reproduced in simulation as a directed test", "The trigger condition should become an assertion", "The design should be rebuilt without the instrumentation"],
a: 1, why: "The fix can then be verified where you have full visibility, and the regression protects it afterwards so the same gap cannot reopen." }
],
interview: {
q: "You have a bug that only appears in hardware after several hours. How do you find it?",
a: "The difficulty is the rarity rather than the bug, so my first goal is to make it happen more often or to catch it when it does. I would start by designing for observability rather than reaching straight for an integrated logic analyser, because an ILA has a capture depth of a few thousand samples and I cannot sit watching it for hours. So I would add counters for every error and every unexpected condition I can think of, and a snapshot register that latches the relevant state the first time a fault occurs, readable afterwards over whatever control interface exists. Those cost very little fabric and they turn a report of it failed overnight into a set of numbers I can reason about. Alongside that I would bring a handful of key signals, a state machine's state, a valid, an error flag, out to spare pins and watch them on a scope or a standalone logic analyser, because that has effectively unlimited depth and can run all night. Once the counters tell me roughly what is going wrong, then an ILA becomes useful, and the skill there is the trigger: I want to trigger on the error condition or on a sequence leading to it, not on normal traffic, because with that little depth I only get one window. I would also try to accelerate the failure, raising the rate of whatever I suspect, running at temperature, or increasing traffic, because turning a several-hour bug into a several-minute one is worth more than any tooling. And once I have caught it, I would reproduce it as a directed test in simulation, so I can verify the fix where I have full visibility and leave a regression behind so the same gap cannot reopen."
}
}

);
