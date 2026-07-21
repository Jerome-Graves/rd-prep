// RTL & Verilog track. Same schema as data.js; appended via LESSONS.push.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

// ---------------------------------------------------------------- RTL & Verilog
{
id: "rtl-arith",
track: "RTL & Verilog",
title: "Datapath arithmetic in fabric",
mins: 30,
body: `
<p>Arithmetic is where RTL stops being schematic drawing and starts being resource
planning. Every operator you write maps to a physical structure, and the synthesiser's
choice is predictable once you know the rules. Coming from VHDL, the semantics are the
same; what changes is that Verilog's loose typing makes it easier to get bit growth
wrong silently, so the discipline has to live in your head, not the type system.</p>
<h3>Adders and carry chains</h3>
<p>A plus operator infers a ripple-carry adder built on the FPGA's dedicated carry
chain: fast, hard silicon running vertically through the fabric. A 32-bit add is
cheap. What costs you is the chain length appearing in your critical path: a 64-bit
accumulator at the end of a long combinational cone will fail timing long before a
16-bit one does. The standard fixes are to pipeline before the adder, or split a wide
add across two cycles with a registered partial carry.</p>
<h3>Multiplication belongs in DSP slices</h3>
<p>Write the multiply operator on signed operands and let synthesis target the DSP
slice (DSP48 on Xilinx parts, the DSP block on the Intel parts you know from Quartus).
Do not hand-build multipliers from adders. The DSP slice also contains a pre-adder,
a wide accumulator and pipeline registers; the tool only uses those registers if you
provide flops around the multiply for it to absorb. An unpipelined multiply that
misses the internal registers is the classic self-inflicted timing failure.</p>
<pre>reg signed [17:0] a_r, b_r;
reg signed [35:0] p_r;                  // full product: 18 + 18 bits
always @(posedge clk) begin
    a_r &lt;= a;  b_r &lt;= b;                // input registers
    p_r &lt;= a_r * b_r;                   // absorbed into the DSP slice
end</pre>
<h3>Fixed point is a convention, not a type</h3>
<p>Verilog has no fixed-point type; unlike VHDL's sfixed, the binary point exists only
in your documentation. A Q1.15 sample times a Q1.15 coefficient gives a Q2.30 product;
you then shift right by fifteen and keep the bits you need. Write the format of every
bus in a comment at its declaration and keep a running table for the datapath. Most
fixed-point bugs are two engineers disagreeing about where the point sits.</p>
<h3>Rounding versus truncation</h3>
<p>Truncation (just dropping low bits) is free but adds a bias of half an LSB, and bias
accumulates through long filter chains. Round-half-up costs one adder: add the weight
of the bit below the cut before dropping. Convergent rounding removes the remaining
bias at half-LSB inputs and the DSP slice can do it for free in the accumulator. The
rule of thumb: truncate inside a short pipeline, round at the boundary where data
leaves your block.</p>
<h3>Bit growth discipline</h3>
<ul>
<li>Adding two N-bit numbers needs N plus one bits; adding K of them needs N plus
log2(K) extra bits.</li>
<li>Multiplying N-bit by M-bit needs N plus M bits for the full product.</li>
<li>Grow through the computation, then round and saturate once at the output.
Saturation logic is a comparator and a mux; wrap-around on overflow is how motion
controllers lurch.</li>
<li>In Verilog, declare operands signed explicitly. Mixing one unsigned operand into
an expression silently makes the whole expression unsigned, which is the single most
common arithmetic bug for VHDL converts used to numeric_std keeping them honest.</li>
</ul>
<p>The interview-ready summary: know what each operator infers, register around
multipliers, track the binary point by hand, grow bits internally and round once,
and never let an unsigned literal poison a signed expression.</p>`,
quiz: [
{ q: "You multiply two 18-bit signed values in fabric. How many bits does the full product need?",
o: ["18", "19", "36", "32"],
a: 2, why: "An N-bit by M-bit multiply needs N plus M bits; 18 plus 18 gives 36, which is exactly what the DSP slice provides." },
{ q: "A pipelined multiply keeps failing timing even though it targets a DSP slice. The most likely cause is:",
o: ["No registers adjacent to the multiply for the tool to pull inside the slice", "The clock is too slow", "DSP slices cannot do signed maths", "The product is truncated"],
a: 0, why: "DSP slices have internal pipeline registers, but synthesis can only use them if your RTL provides flops around the multiply to absorb." },
{ q: "Why does truncation cause trouble in long filter chains?",
o: ["It uses more LUTs than rounding", "It introduces a half-LSB bias that accumulates stage after stage", "It overflows the accumulator", "It only works on unsigned data"],
a: 1, why: "Dropping low bits always rounds towards negative infinity for signed data, adding a systematic bias that compounds through a chain." },
{ q: "In Verilog, one unsigned operand in an otherwise signed expression means:",
o: ["A compile error", "The unsigned operand is sign-extended", "The tool inserts a converter", "The whole expression is evaluated as unsigned"],
a: 3, why: "Verilog's self-determined rules make the entire expression unsigned if any operand is unsigned, a silent trap for engineers used to VHDL's strict numeric_std typing." }
],
interview: {
q: "Walk me through how you would implement a multiply-accumulate datapath for a 16-bit signed data stream against 16-bit coefficients.",
a: "I would register the data and coefficient first, multiply into a 32-bit signed product, and accumulate into a register wide enough for the worst case: 32 bits plus log2 of the number of taps. I would place registers before and after the multiply so synthesis absorbs them into the DSP slice pipeline, and keep the accumulate inside the slice where the wide adder is free. Fixed-point wise, Q1.15 times Q1.15 gives Q2.30, so at the output I round, not truncate, back to Q1.15 and saturate rather than wrap, because in a motion-control context wrap-around is a violent actuator transient. I document the Q format of every bus at its declaration, which is the discipline VHDL's sfixed used to enforce for me."
}
},

{
id: "rtl-fifo",
track: "RTL & Verilog",
title: "FIFOs, handshakes and flow control",
mins: 30,
body: `
<p>Almost every dataflow bug I have seen in FPGA systems comes down to a broken
handshake or an undersized buffer. The valid/ready handshake and the FIFO are the two
primitives that make streaming designs composable, and both have sharp edges worth
knowing cold.</p>
<h3>The valid/ready contract</h3>
<p>A source asserts valid when data is good; a sink asserts ready when it can accept;
transfer happens on the clock edge where both are high. The rules that make this
composable:</p>
<ul>
<li>valid must not depend combinationally on ready in the same cycle, and ready must
not depend combinationally on valid, at least not on both sides at once. If each side
waits to see the other first, you build a combinational loop or a deadlock.</li>
<li>Once valid is asserted, it must stay asserted with stable data until the transfer
completes. No withdrawing an offer.</li>
<li>A source must not wait for ready before raising valid. A sink may wait for valid
before raising ready. Asymmetry matters: the source commits first.</li>
</ul>
<h3>Registered ready and the skid buffer</h3>
<p>For timing, you often want to register the ready signal on its way upstream. But a
registered ready arrives one cycle late: the source sends one more word after you
dropped ready, and you must catch it or lose it. The skid buffer is the standard
answer: a one-deep (sometimes two-deep) register stage that accepts that in-flight
word. It fully decouples the timing paths in both directions at the cost of two data
registers and a small state machine. Interviewers love asking why a plain pipeline
register on a valid/ready bus is wrong; the answer is that registering the data path
without handling the late ready either drops or duplicates words.</p>
<h3>FIFO depth from rates and bursts</h3>
<p>Depth sizing is arithmetic, not folklore. The buffer must absorb the worst-case
difference between what arrives and what drains over the worst-case interval:</p>
<pre>depth  &gt;=  burst_length * (1 - drain_rate / arrival_rate)
        +  latency_of_backpressure_in_words</pre>
<p>Two terms matter. First, the rate mismatch during a burst: if a sensor bursts 512
words at line rate but the consumer drains at half that, you need at least 256 words.
Second, the backpressure latency: every register stage between the FIFO's full flag
and the point where the source actually stops adds words that are already in flight
and must be accommodated. Count those stages honestly, including any skid buffers,
and add margin for the stages you forgot.</p>
<h3>Backpressure end to end</h3>
<p>Flow control only works if it is continuous from sink to source. One module in the
chain that ignores ready, even a debug tap, silently drops data under load and works
perfectly on the bench where the sink never stalls. The audit question for every block
is: what does this do on the cycle ready goes low? If the answer involves the word
hopefully, add a FIFO or fix the handshake. Where a true source cannot stop, an ADC
for instance, the FIFO's overflow flag must be latched into a sticky status register,
because a dropped-sample event you cannot observe is a corrupted dataset you will
chase for weeks.</p>
<p>Coming from VHDL, none of this changes: the handshake is language-independent. What
changes in SystemVerilog is that interfaces and modports let you bundle valid, ready
and data into one reusable connection, which removes the port-list copy-paste errors
that plague hand-wired handshakes.</p>`,
quiz: [
{ q: "On a valid/ready interface, a transfer occurs when:",
o: ["valid is high, on the next edge", "ready is high for two cycles", "both valid and ready are high on the same clock edge", "valid rises while ready is low"],
a: 2, why: "The handshake completes only on a clock edge where both signals are asserted simultaneously; either alone means waiting." },
{ q: "You register ready on its way upstream for timing. What extra hardware do you now need?",
o: ["A wider FIFO", "A skid buffer to catch the in-flight word sent after ready dropped", "A second clock domain", "Nothing, registering ready is always safe"],
a: 1, why: "The source sees ready one cycle late, so one more word arrives after you stalled; a skid buffer provides the register to catch it." },
{ q: "A FIFO's full flag reaches the data source through three register stages. The minimum extra depth this demands is:",
o: ["Zero, the flag is enough", "One word", "Three words, one per stage of backpressure latency", "Half the FIFO depth"],
a: 2, why: "Every cycle of delay between full asserting and the source stopping is a word already in flight; three stages means three words must still fit." },
{ q: "Which handshake behaviour violates the valid/ready contract?",
o: ["Sink holds ready high permanently", "Source deasserts valid before the transfer completes", "Sink waits for valid before asserting ready", "Source asserts valid while ready is low"],
a: 1, why: "Once asserted, valid and its data must hold until accepted; withdrawing the offer breaks the contract and corrupts downstream assumptions." }
],
interview: {
q: "A streaming pipeline works on the bench but drops data in the field under full load. How do you approach it?",
a: "I would suspect broken backpressure before anything else, because that is exactly the bug that hides when the sink never stalls. First I audit every block boundary and ask what happens on the cycle ready goes low: any module that ignores ready is the culprit. Second I check FIFO sizing against the real burst profile, including the backpressure latency through every register and skid stage, since bench traffic rarely hits worst case. Practically, I add sticky overflow flags on every FIFO and a transfer counter at each boundary, read them over the control bus after a field run, and diff the counts: the first boundary where the numbers diverge is where data dies. That instrumentation stays in the design afterwards, it costs almost nothing."
}
},

{
id: "rtl-axi",
track: "RTL & Verilog",
title: "Bus interfaces: the AXI-stream mental model",
mins: 25,
body: `
<p>If you have built point-to-point handshakes in VHDL, AXI-Stream is the same idea
standardised, and AXI memory-mapped is the same idea with addresses. The value is not
technical novelty; it is that every vendor IP block, DMA engine and interconnect
speaks it, so your custom logic plugs into an ecosystem instead of needing glue.</p>
<h3>AXI-Stream: the signals and what they mean</h3>
<ul>
<li><b>tvalid / tready</b>: exactly the valid/ready contract from the previous lesson,
same rules, same skid-buffer consequences.</li>
<li><b>tdata</b>: the payload, in byte multiples.</li>
<li><b>tlast</b>: marks the final beat of a packet or frame. Downstream blocks use it
to find boundaries without counting, and DMA engines use it to close a descriptor.
Losing tlast alignment is the classic stream bug: everything still flows, but frames
are framed wrongly forever after.</li>
<li><b>tkeep</b>: per-byte qualifier, mostly relevant on the last beat of a packet
whose length is not a multiple of the bus width. Many signal-processing streams run
with all bytes valid and tie tkeep off conceptually.</li>
</ul>
<p>That is the whole protocol. No addresses, no responses: data moves forward, flow
control moves backward, packets are delimited by tlast. A FIR filter, a decimator or
your motion-control feedback path is naturally a stream block: samples in, samples
out, one interface each side.</p>
<h3>Memory-mapped versus stream</h3>
<p>The decision rule: if the data has an address, it is memory-mapped; if it has an
order, it is a stream. Register access, buffer readout and CPU-visible state are
memory-mapped. Sample pipelines, video, ADC data are streams. Most real blocks have
both: an AXI-Lite slave for control and status, and stream interfaces for the data
plane. Keeping those planes separate is the single best architectural habit: control
traffic never stalls data, and the datapath needs no address decoding.</p>
<h3>Why standard interfaces matter</h3>
<p>A standard interface is a contract someone else has already debugged. Simulation
models, protocol checkers, interconnect generators and vendor IP all assume it. The
alternative, a hand-rolled bus, means you write the glue, the checker and the
documentation yourself, and the next engineer learns a private protocol. In interviews
this is worth saying plainly: standard interfaces are a team-scaling decision, not a
hardware one.</p>
<h3>Interconnect basics</h3>
<p>An AXI interconnect or smartconnect routes memory-mapped transactions by address
range: masters (CPU, DMA) on one side, slaves (your registers, memory controllers) on
the other. It handles width conversion, clock crossing and arbitration. You configure
the address map rather than design the routing. For streams, the equivalents are
simpler: broadcasters, switches and FIFOs that route by tdest or just connect
point to point.</p>
<h3>Register maps for control</h3>
<p>Behind an AXI-Lite slave sits your register map, and its quality decides how
pleasant the driver work is. The rules that pay off:</p>
<ul>
<li>One function per register; no packing unrelated fields into spare bits.</li>
<li>Separate status (read-only) from control (read-write); make event flags
write-one-to-clear so the CPU never races the hardware.</li>
<li>Version and ID registers at offset zero, so software can sanity-check it is
talking to the right block before anything else.</li>
<li>Document reset values and side effects in one source of truth, ideally generated
into both RTL and a C header from the same description.</li>
</ul>
<p>Coming from Quartus-side Avalon, the mapping is direct: Avalon-MM corresponds to
AXI memory-mapped, Avalon-ST to AXI-Stream. The concepts transfer one for one; only
the signal names and the tooling change.</p>`,
quiz: [
{ q: "On AXI-Stream, the purpose of tlast is to:",
o: ["Indicate the bus is idle", "Mark the final beat of a packet so boundaries survive without counting", "Signal an error condition", "Request backpressure from the sink"],
a: 1, why: "tlast delimits packets or frames; DMA engines and downstream logic rely on it rather than on out-of-band length counting." },
{ q: "Your block needs CPU-configurable coefficients and a high-rate sample pipeline. The clean architecture is:",
o: ["Everything on one memory-mapped port", "Everything as one wide stream", "An AXI-Lite slave for control plus AXI-Stream for the data plane", "Two streams, one carrying register writes"],
a: 2, why: "Separating control and data planes keeps register traffic from stalling samples and keeps the datapath free of address decoding." },
{ q: "The strongest engineering argument for using a standard bus rather than a hand-rolled one is:",
o: ["Standard buses are always faster", "Standard buses use fewer LUTs", "Hand-rolled buses cannot cross clock domains", "Ecosystem reuse: vendor IP, checkers, interconnects and other engineers already speak it"],
a: 3, why: "The win is compatibility and debugged infrastructure, not raw performance; a private protocol makes you write and maintain all of that yourself." },
{ q: "In a memory-mapped register block, event flags should be write-one-to-clear because:",
o: ["It avoids a race where the CPU's read-modify-write erases an event that arrived in between", "It saves a register", "AXI requires it", "It makes the flags read faster"],
a: 0, why: "With plain read-write flags, an event landing between the CPU's read and write is silently wiped; write-one-to-clear touches only the bits software explicitly acknowledges." }
],
interview: {
q: "You are wrapping your existing filter logic as reusable IP. How do you choose and design its interfaces?",
a: "I would put the sample path on AXI-Stream, because a filter is order-based dataflow: tvalid, tready, tdata, and tlast if the data is framed. Control, coefficients and status go behind an AXI-Lite slave with a deliberate register map: ID and version at offset zero, read-only status separated from read-write control, write-one-to-clear event flags, and reset values documented. Keeping the planes separate means a slow CPU can never stall samples. I would choose AXI over anything bespoke for ecosystem reasons: it drops straight into the interconnect, DMA and simulation checkers, and the next engineer already knows it. Having used Avalon on Quartus projects, the concepts map one for one, so the conversion cost is naming, not thinking."
}
},

{
id: "rtl-dspfpga",
track: "RTL & Verilog",
title: "DSP on FPGA",
mins: 30,
body: `
<p>FPGAs earn their keep in DSP because the fabric lets you spend silicon to buy
throughput. The craft is choosing structures that map onto what the device gives you
for free: DSP slices, block RAM and abundant registers. This lesson is the mental
toolkit for that mapping.</p>
<h3>The pipelined MAC and the FIR family</h3>
<p>The core operation is multiply-accumulate. A direct-form FIR with N taps needs N
multiplies and N minus one adds per sample. On an FPGA you choose where those live on
a spectrum:</p>
<ul>
<li><b>Fully parallel</b>: one DSP slice per tap, one sample per clock, N slices.
Highest throughput, highest cost.</li>
<li><b>Fully sequential</b>: one slice reused N times per sample, needing a clock N
times the sample rate. Cheapest, and ideal when the clock-to-sample-rate ratio is
large, as it usually is for control loops: a 100 MHz fabric clock against a 100 kHz
servo loop gives you a thousand clocks per sample to reuse one multiplier.</li>
<li><b>Partly parallel</b>: anything between, trading slices for clock cycles.</li>
</ul>
<p>The transposed FIR form deserves a special mention: the adder chain becomes a chain
of registered adds that maps directly onto the DSP slice cascade path, so the critical
path stays short no matter how many taps you add. It is the shape the silicon wants.</p>
<h3>Systolic thinking</h3>
<p>The generalisation is the systolic array: data marches through a regular grid of
small processing elements, each talking only to its neighbours, with registers between
every stage. No long wires, no global fan-in, so timing closure barely depends on
array size. When an interviewer asks how you would scale a computation, systolic
thinking is the answer they hope to hear: keep everything local and let data flow,
rather than building one deep combinational cone with a wide adder tree at the end.</p>
<h3>Block RAM as delay line and sample buffer</h3>
<p>Block RAM is the second pillar. A BRAM with a write pointer and a read pointer
offset by D is a D-sample delay line at the cost of zero flip-flops: that is your FIR
tap history, your echo buffer, your fractional-delay store. Dual-port BRAM gives you
ping-pong buffering, one port filling a frame while the other drains the previous
one, which is the standard bridge between burst-mode acquisition and steady-rate
processing. The habit to build: whenever you write a shift register longer than about
thirty two stages, ask whether it should be a BRAM circular buffer instead; the tools
will sometimes make that swap for you (SRL inference and BRAM mapping), but the
architecture is better chosen than discovered.</p>
<h3>Throughput versus clock: the folding trade</h3>
<p>The universal FPGA trade is parallel hardware at a modest clock against
time-multiplexed hardware at a fast clock. Total work per second is roughly constant;
what changes is resource count, power profile and timing-closure difficulty. Fast
clocks stress the tools and burn power in the clock tree; wide parallel datapaths
burn slices and routing. State the trade explicitly in design reviews with the actual
numbers: sample rate, clock rate, the ratio, and therefore how many operations you
can fold onto each physical unit.</p>
<h3>CORDIC in one paragraph</h3>
<p>CORDIC computes rotations, and therefore sine, cosine, magnitude and phase, using
only shifts and adds: one small iteration per bit of precision, no multipliers at
all. Pipeline one iteration per stage and you get one result per clock at latency
equal to the bit count. It is the standard answer for polar-to-rectangular
conversion, phase detectors and NCOs when DSP slices are scarce or when you need
atan2 in hardware, which multipliers do not give you directly.</p>`,
quiz: [
{ q: "A 100 MHz fabric clock, a 50 kHz control-loop sample rate, and a 64-tap FIR. The natural architecture is:",
o: ["64 parallel DSP slices", "A single time-multiplexed MAC reusing one DSP slice", "A CORDIC pipeline", "A 64-stage systolic array"],
a: 1, why: "Two thousand clocks per sample means one multiplier can serve all 64 taps sequentially with room to spare; parallel hardware would sit idle." },
{ q: "Why is the transposed FIR form friendly to FPGA timing?",
o: ["It needs fewer multipliers", "It removes the need for coefficients", "Its registered adder chain maps onto the DSP slice cascade, keeping the critical path short regardless of tap count", "It avoids block RAM"],
a: 2, why: "The transposed form replaces the wide output adder tree with a chain of registered adds that the DSP cascade path implements natively." },
{ q: "A 1024-sample delay line is best implemented as:",
o: ["A 1024-stage flip-flop shift register", "1024 DSP slices", "A LUT-based multiplexer", "A block RAM circular buffer with offset read and write pointers"],
a: 3, why: "BRAM provides deep storage for free; a thousand flip-flops of shift register wastes fabric and routing for no benefit." },
{ q: "CORDIC's defining property is that it:",
o: ["Computes rotations and trig functions using only shifts and adds", "Is faster than a DSP slice multiply", "Requires floating point", "Only works for angles under 45 degrees"],
a: 0, why: "Each CORDIC iteration is a shift and add giving about one bit of precision, so it delivers sine, cosine and atan2 without any multipliers." }
],
interview: {
q: "How would you decide between a parallel and a time-multiplexed implementation of a filter on an FPGA?",
a: "I start from the ratio of fabric clock to sample rate, because that number is how many clock cycles I can spend per sample on each physical unit. In motion control that ratio is usually in the hundreds or thousands, so a single time-multiplexed MAC with coefficients and history in block RAM is almost always right: minimal DSP usage, easy timing. If the ratio approaches one, as in high-rate signal acquisition, I go parallel, and I use the transposed form so the adder chain rides the DSP cascade and timing stays flat with tap count. In between I fold partially. I present it as arithmetic in review: sample rate, clock rate, operations per sample, therefore this many slices, rather than as a preference."
}
},

{
id: "rtl-soc",
track: "RTL & Verilog",
title: "SoCs and processor integration",
mins: 30,
body: `
<p>Modern FPGA work is rarely fabric alone. Zynq-style devices weld hard ARM cores
(the processing system, PS) to programmable logic (PL), and the architecture question
on every project is where each function lives. Getting that split right matters more
than any individual module's elegance.</p>
<h3>The split heuristic</h3>
<p>Fabric earns its place through three things: determinism, parallelism and raw
rate.</p>
<ul>
<li><b>Goes in the PL</b>: anything with hard microsecond-level deadlines (PWM
generation, encoder decoding, current-loop maths), anything at rates the CPU cannot
touch per-sample (ADC front ends, decimation), and anything wide and parallel.</li>
<li><b>Goes in the PS</b>: everything with branches and state that changes by
project phase: trajectory planning, network protocols, file systems, configuration,
supervisory logic, user interfaces. CPUs are cheap to change; fabric is not.</li>
<li><b>The boundary rule</b>: put the boundary where data rate drops. Decimate,
filter or reduce in fabric, then hand the CPU data at a rate it can love. A motion
controller is the canonical example: current loop in fabric at hundreds of kilohertz,
position loop either place, trajectory generation in software at hundreds of hertz.</li>
</ul>
<h3>Memory-mapped registers and drivers</h3>
<p>The CPU sees your fabric block as addresses. An AXI-Lite slave exposes control and
status registers; the driver on the PS side is ultimately reads and writes to those
addresses, whether through a bare-metal pointer or a Linux UIO or kernel driver. The
discipline from the register-map lesson applies doubly here, because now two codebases
depend on the same map: generate the RTL decode and the C header from one source so
they cannot drift. Drift between the header and the hardware is the most
time-expensive dumb bug in SoC work, because each side passes its own tests.</p>
<h3>DMA: the only way to move bulk data</h3>
<p>Register reads move a handful of bytes per transaction and the CPU pays for every
one. For sample buffers, images or logs, a DMA engine in fabric masters the memory
bus and writes to DRAM directly, then interrupts the CPU once per buffer, not once
per sample. The standard pattern is a stream from your datapath into a DMA IP, with
tlast closing each buffer. Two things bite everyone the first time:</p>
<ul>
<li><b>Cache coherence</b>: the CPU may read stale cache lines instead of the fresh
DRAM the DMA wrote. You either invalidate the cache explicitly, use coherent ports
where the device offers them, or map the buffer non-cached and pay the access cost.</li>
<li><b>Buffer lifecycle</b>: who owns each buffer at each moment must be explicit,
usually via a ring of descriptors, or the DMA scribbles over data the CPU is still
reading.</li>
</ul>
<h3>Interrupt paths</h3>
<p>Fabric raises an interrupt line into the PS interrupt controller; the handler
acknowledges the source in your register block (write-one-to-clear again), does the
minimum, and defers real work. Two rules keep this sane. Interrupt per event batch,
not per event: one interrupt per DMA buffer, never per sample. And make the fabric
side latch the cause, because a pulse the CPU never saw is a lost event; level or
latched interrupts with explicit acknowledgement survive slow handlers, pulses do
not.</p>
<h3>Bring-up order</h3>
<p>Bring the system up in layers you can trust: registers first (read the ID register
from the CPU), then interrupts with a software-triggered test event, then DMA with a
pattern generator before the real datapath. Each layer proves the one below, and when
something breaks you know which new layer broke it. This ordering is a genuinely good
interview answer because it shows systems discipline rather than module thinking.</p>`,
quiz: [
{ q: "In a Zynq-style motion controller, the current loop belongs in fabric because:",
o: ["C compilers cannot express PID controllers", "Fabric is easier to modify later", "It needs deterministic microsecond-scale timing at rates that would saturate a CPU with per-sample work", "The PS has no floating point"],
a: 2, why: "Hard real-time loops at hundreds of kilohertz are exactly what the PL's determinism and parallelism buy; the CPU keeps the flexible, slower layers." },
{ q: "The CPU reads a DMA buffer and finds stale data even though the transfer completed. The classic cause is:",
o: ["The DMA engine is too slow", "The CPU read cached lines instead of the fresh DRAM contents the DMA wrote", "tlast was asserted too early", "The AXI interconnect dropped the write"],
a: 1, why: "DMA writes to memory bypass the CPU cache; without invalidation, coherent ports or non-cached mapping, the CPU sees old cache contents." },
{ q: "The right interrupt granularity for a sampled datapath is:",
o: ["One interrupt per sample for lowest latency", "No interrupts, poll everything", "One interrupt at power-up only", "One interrupt per completed buffer or batch"],
a: 3, why: "Per-sample interrupts drown the CPU in context switches; batching per DMA buffer amortises the overhead while keeping latency bounded." },
{ q: "Generating the register map RTL and the C header from one shared source matters because:",
o: ["It prevents silent drift between what hardware decodes and what software believes", "It makes synthesis faster", "AXI-Lite requires generated code", "It reduces BRAM usage"],
a: 0, why: "Hardware and software each pass their own tests while disagreeing about an offset or bit position; a single source of truth removes that failure mode." }
],
interview: {
q: "You are architecting a control system on a Zynq-class device. How do you decide what goes in fabric versus on the processor?",
a: "My rule is that fabric buys determinism, parallelism and rate, and the CPU buys flexibility, so I put the boundary where the data rate drops. In a motion controller that means encoder decode, PWM and the current loop in the PL, where timing is cycle-exact, and trajectory generation, networking and configuration on the PS, where requirements churn. Data crosses by DMA in buffer-sized batches with an interrupt per buffer, never per sample, and control crosses through a register map generated from a single source shared with the C header. I also plan bring-up in layers: ID register read, then a software-triggered interrupt, then DMA with a test pattern, so each mechanism is proven before the real application leans on it."
}
},

{
id: "rtl-constraints",
track: "RTL & Verilog",
title: "Constraints and timing sign-off",
mins: 30,
body: `
<p>Synthesis and place-and-route are optimisation engines, and constraints are the
objective function. Unconstrained tools optimise nothing in particular, and the
result can pass every simulation and fail on the bench at temperature. Timing
sign-off is the discipline of telling the tool the truth about time, then believing
its report. Coming from Quartus this is familiar ground: SDC there, XDC on the Xilinx
side, and the semantics are nearly identical because both descend from the same SDC
heritage.</p>
<h3>Clock definitions come first</h3>
<p>Every clock entering the design gets a create_clock with its true period. From
that, the tool derives every setup and hold check between every pair of registers on
that clock. Clocks produced inside the device by PLLs and MMCMs are usually derived
automatically, but the audit duty is yours: the clock report must list every clock
you believe exists, at the frequency you believe, and nothing else. A missing clock
does not produce an error; it produces silence, which is worse.</p>
<pre>create_clock -period 10.000 -name sys_clk [get_ports clk_in]
# 100 MHz on the input pin; all internal paths on this domain now checked</pre>
<h3>Input and output delays: modelling the world outside</h3>
<p>set_input_delay and set_output_delay describe the timing of the devices your pins
talk to, referenced to a clock. An input delay of 4 ns means the external device
takes up to 4 ns after the clock edge to present valid data, so your logic has period
minus 4 ns to capture it. Output delay states the setup the external device needs
from you. These numbers come from the neighbouring chip's datasheet plus board trace
delay, and writing them down is what turns pin timing from hope into arithmetic.
Without them, the tool assumes your pins connect to nothing with requirements, and
interface failures appear only on hardware, often only at temperature extremes.</p>
<h3>Exceptions: false paths and multicycle paths</h3>
<p>An exception tells the tool to relax a check, and every one is a small signed
liability. Legitimate uses:</p>
<ul>
<li><b>set_false_path</b>: paths where timing genuinely does not matter, such as a
static configuration register written once at start-up, or the input of a proper
two-flop synchroniser where the first flop is expected to go metastable anyway.</li>
<li><b>set_multicycle_path</b>: a path allowed N cycles because the design
guarantees the destination samples only every Nth cycle, for example a datapath with
a clock-enable that pulses at one quarter rate. Set the setup multiplier and remember
the corresponding hold adjustment, the half of the command most people forget.</li>
</ul>
<p>The failure mode is using exceptions as timing-closure aspirin: a false path on a
real path does not fix the design, it silences the one tool warning you. Every
exception should carry a comment naming the structural reason it is safe.</p>
<h3>Generated clocks</h3>
<p>A clock made by your own logic, a divider flop for instance, must be declared with
create_generated_clock referencing its source, so the tool knows the phase
relationship and checks paths crossing between parent and child correctly. Undeclared
generated clocks are a common source of both optimistic and pessimistic analysis. In
general, prefer clock enables to divided clocks: one domain, no new constraint, no
crossing.</p>
<h3>Unconstrained paths are silent failures</h3>
<p>The most important habit in this lesson: run the unconstrained-paths report
(check_timing, report analysis coverage, or the Quartus equivalent) and drive it to
zero, with every remaining entry explained in writing. A path with no constraint is
not a pass; it is a question the tool was never asked. Sign-off means every path is
either checked and met, or excluded for a documented structural reason. That
sentence, delivered calmly, is a strong interview answer on its own.</p>`,
quiz: [
{ q: "A design has an internal clock divider flop feeding logic, with no create_generated_clock on it. The consequence is:",
o: ["Synthesis fails with an error", "The tool analyses paths from that clock incorrectly or not at all, silently", "The divider is optimised away", "Hold checks are duplicated"],
a: 1, why: "Undeclared generated clocks give the tool no phase relationship to analyse against; the result is silent mis-analysis, not an error message." },
{ q: "set_input_delay 4 on a 10 ns clock means your internal capture logic effectively has:",
o: ["4 ns to capture the data", "14 ns to capture the data", "6 ns to capture the data", "No constraint on that pin"],
a: 2, why: "The external device consumes up to 4 ns of the period presenting data, leaving your device the remaining 6 ns for routing and setup." },
{ q: "A legitimate use of set_false_path is:",
o: ["The crossing into the first flop of a proper two-flop synchroniser", "Any path failing setup by less than 1 ns", "The critical path of the datapath, temporarily, before a demo", "All paths in a block you did not write"],
a: 0, why: "The synchroniser's first flop is designed to tolerate metastability, so the crossing has no meaningful setup requirement; the other options silence real failures." },
{ q: "Why do unconstrained paths deserve a dedicated report at sign-off?",
o: ["They always fail hold", "They increase power", "They slow down place-and-route", "An unconstrained path is never checked at all, so it can fail on hardware while every timing report shows clean"],
a: 3, why: "No constraint means no analysis; the path is absent from the reports rather than passing, which is why sign-off drives the coverage report to zero unexplained entries." }
],
interview: {
q: "What does timing sign-off mean to you, beyond the tool reporting no negative slack?",
a: "Zero negative slack only means the paths the tool was asked about are met, so my sign-off has three parts. First, the clock report must contain exactly the clocks I believe exist, including generated clocks declared with their sources. Second, every pin has input and output delays derived from the neighbouring device's datasheet and board delays, because unconstrained I/O is the failure that appears only at temperature in the field. Third, the unconstrained-path and coverage reports go to zero, and every exception, false path or multicycle, carries a written structural justification, because an exception on a real path just silences the warning. I learned that discipline with SDC in Quartus and it transfers directly to XDC."
}
},

{
id: "rtl-lint-formal",
track: "RTL & Verilog",
title: "Lint, CDC checks and formal basics",
mins: 30,
body: `
<p>Simulation answers the question: does the design behave for the stimulus I thought
to write? A whole family of static tools answers a better question: is the design
structurally sound for stimulus nobody thought of? Lint, CDC analysis and formal
methods sit on a spectrum from cheap-and-shallow to expensive-and-exhaustive, and a
mature flow uses all three at the right depth.</p>
<h3>Lint: the reviewer who never gets tired</h3>
<p>Lint statically checks RTL against structural rules: inferred latches from
incomplete assignments, width mismatches in expressions and connections, unreachable
states, mixed blocking and nonblocking assignment in one process, sensitivity
problems, dead code. For a VHDL engineer moving to Verilog, lint is not optional
hygiene, it is the replacement for the strictness the language no longer gives you:
VHDL's compiler rejects a width mismatch; Verilog silently truncates or pads, and
lint is where that class of bug gets caught. Run it from day one and keep the
baseline clean, because a report with four hundred tolerated warnings hides the one
that matters. Waivers belong in a version-controlled file with a reason per line,
exactly like timing exceptions.</p>
<h3>CDC checking is structural, not dynamic</h3>
<p>Clock-domain-crossing bugs mostly cannot be simulated: metastability is a physical
phenomenon the simulator does not model, and a missing synchroniser simulates
perfectly forever. CDC tools instead check structure: every signal crossing between
declared clock domains must pass through a recognised safe structure, a two-flop
synchroniser for a single bit, a Gray-coded pointer pair for FIFO pointers, a
handshake or asynchronous FIFO for multi-bit buses. The tool also catches the subtler
crimes: reconvergence, where two separately synchronised bits recombine with
unknowable relative delay, and multi-bit buses synchronised bit by bit as if they
were independent. Treat the CDC report like the timing report: zero unexplained
items, waivers documented.</p>
<h3>Formal property checking: proving, not sampling</h3>
<p>Simulation samples the behaviour space; formal exhaustively explores it. You write
properties, SystemVerilog Assertions typically, and the tool either proves each
property holds for all reachable states and all input sequences, or hands you a
concrete counterexample trace. That is the fundamental contrast worth stating in an
interview: a simulation pass says no tested input broke it; a formal proof says no
possible input can break it, within the tool's depth and assumptions.</p>
<pre>// Handshake safety property, conceptually:
// once valid rises, it must hold until ready accepts
assert property (@(posedge clk)
    valid &amp;&amp; !ready |=&gt; valid);</pre>
<p>Formal shines on control logic: arbiters, handshake protocols, FIFO
full-and-empty logic, state machines with corner cases, exactly the places where the
dangerous input sequence is the one nobody imagines. It struggles where the state
space is dominated by wide datapaths; you do not formally prove a 64-tap FIR's
arithmetic, you constrain the datapath away and prove the control around it.</p>
<h3>Equivalence checking</h3>
<p>Logical equivalence checking answers a different question: are two versions of the
design the same function? Its everyday roles are proving that synthesis preserved
your RTL's meaning, and proving that a hand retiming or a bug-fix-free refactor
changed nothing observable. It is what lets you clean up legacy code with
confidence instead of fear.</p>
<h3>Where formal beats simulation, concretely</h3>
<ul>
<li>Deadlock and livelock questions: can this handshake ever wedge? Simulation can
only fail to find it.</li>
<li>Safety properties on arbiters and FIFOs: no double grant, never full and empty
simultaneously.</li>
<li>Unreachable-state and dead-code proofs, which lint suspects but formal settles.</li>
<li>The last five percent of state-machine corners that would need pathological
stimulus to reach in simulation.</li>
</ul>
<p>The honest framing: simulation for datapaths and system behaviour, formal for
control-logic correctness, lint and CDC always, on everything, from the first
commit.</p>`,
quiz: [
{ q: "Why is a missing CDC synchroniser typically invisible in RTL simulation?",
o: ["Simulators refuse to run multi-clock designs", "Metastability is a physical phenomenon the simulator does not model, so the crossing behaves ideally", "CDC bugs only occur at high temperature", "The synthesis tool inserts synchronisers automatically"],
a: 1, why: "The simulator propagates clean values across the crossing every time; the failure mechanism simply does not exist in its model, which is why CDC checking must be structural." },
{ q: "The essential difference between a formal proof and a passing simulation regression is:",
o: ["Formal runs faster", "Formal covers all reachable states and input sequences; simulation covers only the stimulus that was written", "Simulation checks timing while formal does not", "Formal requires no properties to be written"],
a: 1, why: "Simulation samples the behaviour space; a formal proof is exhaustive within its assumptions, so it can rule out the input nobody thought to test." },
{ q: "Lint matters more when moving from VHDL to Verilog because:",
o: ["Verilog simulators are less accurate", "Quartus has no VHDL linter", "Verilog silently tolerates width mismatches and similar issues that VHDL's compiler would reject", "VHDL designs never contain latches"],
a: 2, why: "Verilog pads and truncates without complaint where VHDL errors out; lint restores the strictness the language dropped." },
{ q: "The everyday role of logical equivalence checking is to:",
o: ["Find timing violations", "Generate testbench stimulus", "Measure code coverage", "Prove that synthesis output or a refactored RTL still implements the same function as before"],
a: 3, why: "Equivalence checking compares two design versions function-for-function, which is what makes refactoring and trusting synthesis safe." }
],
interview: {
q: "Where would you deploy formal verification on a real project, and where would you not bother?",
a: "I aim formal at control logic where the dangerous stimulus is the one nobody imagines: handshake protocols, arbiters, FIFO full and empty logic, and state machines with corner cases. There I write SVA safety properties, no double grant, valid held until accepted, never full and empty at once, and get proofs or concrete counterexample traces, which are worth more than a thousand passing simulations. I would not aim it at wide datapaths; proving a filter's arithmetic exhaustively is intractable, so datapaths stay in simulation against golden models. Underneath both, lint and structural CDC checking run on everything from the first commit, because they are nearly free, and coming from VHDL I treat lint as restoring the compiler strictness Verilog gave up."
}
},

{
id: "rtl-flow",
track: "RTL & Verilog",
title: "From spec to bitstream",
mins: 30,
body: `
<p>Individual skills matter less than the flow that strings them together. FPGA
projects fail through skipped stages far more often than through hard problems, so
this final lesson is the disciplined path from a requirement to a bitstream you can
defend, with the checkpoints that keep rework cheap.</p>
<h3>Spec and block diagram before RTL</h3>
<p>The spec states what, not how: rates, latencies, precisions, interfaces, and the
observable behaviour at the boundaries. From it comes a block diagram where every
block has one owner and one job, and every arrow is a named interface with a data
rate written on it. Time spent here is the cheapest engineering on the project: a
block diagram review costs an hour; the same mistake found in timing closure costs a
month. The rates on the arrows also tell you FIFO depths, clock domains and the
fabric-versus-CPU split before any code exists.</p>
<h3>Interface contracts</h3>
<p>Before writing module internals, freeze the boundaries: signal lists, handshake
protocols, packet formats, register maps, reset behaviour, clock domains. A frozen
interface is what lets two engineers, or you in two different weeks, work on both
sides without integration surprises. Standard interfaces from the AXI lesson do most
of this for free. Every integration bug you have ever chased was two modules
disagreeing about a boundary; contracts move that disagreement to a document review,
where it is cheap.</p>
<h3>Module-level testbenches, then integration simulation</h3>
<p>Each module gets its own testbench proving its contract: directed cases for the
specified behaviour, constrained-random where input spaces are large, and
self-checking against a reference model, never eyeballed waveforms. Your
SystemVerilog co-simulation experience is the right instinct here: a Python or
MATLAB golden model checking the RTL beats manual inspection every time. Only after
modules pass alone do you simulate the integration, and now you are testing exactly
one thing: the connections and the contracts, because the internals are already
proven. When integration simulation finds a bug inside a module, that is a hole in a
module testbench; fix the testbench too, or the bug returns.</p>
<h3>Synthesis iterations and the timing-closure loop</h3>
<p>Synthesise early, on skeleton code, to catch inference disasters while they are
cheap: unexpected latches, missed BRAM and DSP mapping, a resource count wildly off
budget. Then timing closure is a loop with a strict order of remedies:</p>
<ul>
<li>Read the worst paths and understand them; never scattergun fixes.</li>
<li>Fix the RTL first: pipeline long cones, retime, reduce fan-out, shorten carry
chains. Architecture beats tool settings.</li>
<li>Constraints second: confirm the failing path is real, add legitimate multicycle
or false-path exceptions with written justification.</li>
<li>Tool effort and floorplanning last, because they trade run time for margin and
mask marginal design.</li>
</ul>
<p>Track worst negative slack per run in a log; a plot of WNS against commits tells
you whether you are converging or thrashing, and it is exactly the kind of evidence
that makes design reviews short.</p>
<h3>Lab bring-up with ILAs</h3>
<p>Hardware debug is planned, not improvised. Decide before the bitstream which
signals earn an integrated logic analyser (ILA) core: handshakes at block
boundaries, state registers, FIFO flags, error counters. Bring up in the same layers
as the SoC lesson: clocks and resets proven first, then register access, then
datapath with a known test pattern, then real data. When the ILA shows a bug,
reproduce it in simulation before fixing it; a fix verified only on the bench is a
fix you do not understand, and it will be back.</p>
<h3>Version everything, especially bitstreams</h3>
<p>A bitstream on a bench with unknown provenance is a liability. Tag the repository
for every released build; embed the git hash in a version register readable over the
control bus (the ID-register habit from the AXI lesson); archive the exact
constraints, tool version and timing report alongside the bitstream. The test that
matters: given any programmed board in the lab, you can get back to the exact source
and reports in five minutes. Teams that cannot do this spend their integration weeks
debugging version skew instead of hardware.</p>`,
quiz: [
{ q: "Integration simulation reveals a bug inside a module that its own testbench passed. Best practice is to:",
o: ["Fix the RTL and also extend the module testbench to catch that class of bug", "Fix the RTL only, since integration caught it anyway", "Delete the module testbench as redundant", "Waive it until timing closure"],
a: 0, why: "The escape proves a hole in the module-level test; unless the testbench is strengthened, the same class of bug can return unseen in a later edit." },
{ q: "In the timing-closure loop, the first remedy to reach for on a failing path is:",
o: ["Maximum tool effort and floorplanning", "A false-path exception", "Understanding the path and fixing the RTL: pipelining, retiming, reducing fan-out", "A slower clock"],
a: 2, why: "Architecture changes address the cause; tool settings and exceptions either mask marginal design or silence real checks, so they come later and with justification." },
{ q: "Why embed the git hash in a readable version register?",
o: ["The synthesis tool requires a unique identifier", "It reduces bitstream size", "It speeds up configuration", "Any programmed board can be traced to its exact source, constraints and reports"],
a: 3, why: "Provenance on demand is what prevents integration weeks lost to version skew; the register plus the repo tag closes the loop from silicon back to source." },
{ q: "The main purpose of freezing interface contracts before writing module internals is:",
o: ["To reduce LUT usage", "To move integration disagreements into a cheap document review instead of expensive lab debug", "To satisfy the linter", "To avoid writing testbenches"],
a: 1, why: "Integration bugs are boundary disagreements; agreeing the boundary on paper first means modules built independently connect without surprises." }
],
interview: {
q: "Describe how you would run a new FPGA project from requirements to a working board.",
a: "I start with a spec of rates, latencies and interfaces, then a block diagram where every arrow carries a named interface and a data rate, because those numbers drive FIFO sizing and the fabric-versus-CPU split before code exists. I freeze interface contracts, prefer standard buses, and give every module a self-checking testbench against a golden model, the discipline I built doing SystemVerilog co-simulation. I synthesise early to catch inference surprises, then run timing closure in strict order: understand the path, fix the RTL, then constraints with written justification, tool heroics last, logging slack per commit. Bring-up is layered, clocks, registers, test pattern, real data, with ILAs planned at block boundaries, and every bitstream carries an embedded git hash so any board traces back to exact source and reports."
}
}

);
