// RTL & Verilog: system integration.
//
// Blocks that work alone and fail together. Full AXI rather than streams,
// interconnect and where bandwidth really goes, external DRAM, integrating IP
// you did not write, power domains, and turning a spec into a microarchitecture.

LESSONS.push(

{
id: "rtl-axifull",
track: "RTL & Verilog",
sub: "System integration",
title: "AXI beyond streams: channels, ordering and outstanding transactions",
mins: 24,
body: `
<p>A stream interface is one channel with valid and ready. Full AXI is five independent channels
with their own handshakes, and nearly every integration surprise comes from that independence:
the channels are not synchronised with each other, and the rules about what may be reordered are
easy to read past.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Five AXI channels: write address, write data and write response for writes, read address and read data for reads">
<rect class="bx" x="24" y="26" width="308" height="132" rx="4"/>
<text class="th" x="40" y="52">write</text>
<text class="ts" x="40" y="80">AW: address and control</text>
<text class="ts" x="40" y="106">W: data beats, with strobes</text>
<text class="ts" x="40" y="132">B: one response per burst</text>

<rect class="bx" x="348" y="26" width="308" height="132" rx="4"/>
<text class="th" x="364" y="52">read</text>
<text class="ts" x="364" y="80">AR: address and control</text>
<text class="ts" x="364" y="106">R: data beats, response per beat</text>
<text class="ts" x="364" y="132">last marks the end of a burst</text>

<rect class="bxa" x="24" y="174" width="632" height="56" rx="4"/>
<text class="th" x="40" y="200">each channel handshakes independently</text>
<text class="ts" x="40" y="220">so write data may arrive before, with, or after its address</text>
</svg>

<p>Writes use three channels: <b>address</b>, <b>data</b>, and a <b>response</b> that arrives once
per burst. Reads use two: address, and data that carries a response per beat. Each channel uses
the same valid and ready handshake, and the direction of the rule is what protects against
deadlock: a source must not wait for ready before asserting valid, and once valid is asserted it
must stay until the transfer completes.</p>

<p>Because the channels are independent, write data can arrive <b>before</b> its address. A slave
that assumes otherwise works against one master and fails against another, which is the classic
integration bug: both components are individually correct and the assumption was never
written down.</p>

<p><b>Outstanding transactions</b> are where the performance is. A master may issue many addresses
before any data returns, which is what hides the latency of a memory that takes a long time to
respond. A design that waits for each response before issuing the next request is limited by
latency rather than bandwidth, and on a DRAM system that can be an order of magnitude.</p>

<p>The <b>ID</b> field is what makes that safe. Transactions sharing an ID must complete in order;
transactions with different IDs may complete out of order. So a master that issues everything with
one ID gets simplicity and in-order behaviour, and a master that uses several IDs gets
reordering and must be able to handle responses arriving in any order.</p>

<p>Several things routinely go wrong at integration. Narrow transfers and unaligned bursts use
<b>strobes</b> that a simple slave may ignore, silently corrupting data. Bursts must not cross the
boundary that the specification forbids. And back pressure on the response channel is often
untested, so a slave that cannot accept a delayed response deadlocks only under load.</p>

<p>The lighter variants exist for good reasons. A <b>lite</b> interface has no bursts and no IDs
and is the right choice for a register block, where a full interface adds logic that will never be
exercised. Choosing the simplest variant that meets the requirement is a real design decision
rather than a shortcut.</p>
`,
quiz: [
{ q: "What is the classic AXI integration bug?",
o: ["Bursts crossing a forbidden boundary", "A slave assuming write data cannot arrive before its address", "Using too few IDs", "Ignoring the last signal"],
a: 1, why: "The channels handshake independently, so both components can be individually correct while the assumption between them was never written down." },
{ q: "Why do outstanding transactions matter for performance?",
o: ["They reduce the number of channels used", "They hide latency, so throughput is not limited by response time", "They allow larger bursts", "They avoid the need for IDs"],
a: 1, why: "A master that waits for each response before issuing the next is latency limited, which on a DRAM system can cost an order of magnitude." },
{ q: "What does the ID field control?",
o: ["Which slave is addressed", "Which transactions must complete in order and which may be reordered", "The burst length", "Priority in the interconnect"],
a: 1, why: "Same ID means in-order completion; different IDs may complete out of order, so a master using several IDs must handle any response order." },
{ q: "When is a lite variant the right choice?",
o: ["When bandwidth is critical", "For a register block, where bursts and IDs would never be exercised", "When the slave is slow", "When there are many masters"],
a: 1, why: "Choosing the simplest variant that meets the requirement is a design decision: a full interface there adds logic that is never used and must still be verified." }
],
interview: {
q: "What goes wrong when integrating AXI masters and slaves that were verified separately?",
a: "Almost always an assumption that was never written down, because the five channels handshake independently and that independence is easy to read past. The commonest one is ordering between channels: write data can legitimately arrive before its write address, and a slave built against a master that always sends the address first will work in its own testbench and fail in the system. The same applies in reverse to a master that assumes a response comes back promptly. The second family is outstanding transactions and IDs. A master may issue many addresses before any data returns, which is how you hide memory latency, and the ID field decides what may be reordered: transactions sharing an ID must complete in order, different IDs may not. So a master that issues multiple IDs and a slave or interconnect that returns them out of order is completely legal, and a master that quietly assumed in-order completion breaks. Third is back pressure, which is under-tested almost everywhere. Every channel has a ready, and a component that cannot cope with ready being deasserted for a long time on the response channel deadlocks only under load, which is the worst possible time to find it. The handshake rules matter here too: valid must not wait for ready and must stay asserted until the transfer completes, and a component that violates that can deadlock against a correct partner. Then the detail cases: narrow transfers and unaligned bursts rely on the write strobes, and a simple slave that ignores strobes corrupts data silently, and bursts crossing the boundary the specification forbids. The way I would avoid all of this is to use the vendor protocol checkers as bound assertion sets on every interface from the beginning, rather than discovering the assumptions during integration, and to pick the lite variant wherever bursts and IDs are not actually needed."
}
},

{
id: "rtl-interconnect",
track: "RTL & Verilog",
sub: "System integration",
title: "Interconnect: arbitration, backpressure and where the bottleneck is",
mins: 22,
body: `
<p>Once several masters share a path to memory, the system's behaviour stops being a property of
any one block. Latency and bandwidth become a function of what everything else is doing, and the
component nobody owns, the interconnect, decides who wins.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Several masters arbitrating for a shared path to a memory controller, with the bottleneck at the shared segment">
<rect class="bx" x="24" y="26" width="140" height="46" rx="4"/>
<text class="ts" x="40" y="54">CPU</text>
<rect class="bx" x="24" y="82" width="140" height="46" rx="4"/>
<text class="ts" x="40" y="110">DMA</text>
<rect class="bx" x="24" y="138" width="140" height="46" rx="4"/>
<text class="ts" x="40" y="166">video</text>

<rect class="bxa" x="200" y="26" width="200" height="158" rx="4"/>
<text class="th" x="216" y="56">arbiter</text>
<text class="ts" x="216" y="84">who goes next</text>
<text class="ts" x="216" y="110">and for how long</text>
<text class="ts" x="216" y="146">latency here is</text>
<text class="ts" x="216" y="166">everyone else's traffic</text>

<rect class="bx" x="436" y="82" width="220" height="46" rx="4"/>
<text class="th" x="452" y="110">memory controller</text>

<rect class="bx" x="24" y="198" width="632" height="34" rx="4"/>
<text class="ts" x="40" y="220">the shared segment sets the ceiling, wherever the individual blocks were measured</text>
</svg>

<p><b>Arbitration</b> policy is the first design decision. Round robin is fair and gives no
guarantees to anyone; fixed priority guarantees the top master and can starve the bottom one;
weighted schemes allocate shares. The right answer depends on which masters have a real deadline,
and the mistake is choosing fairness by default when one master, typically a display or an
audio path, actually has a hard requirement while the others merely want throughput.</p>

<p><b>Quality of service</b> mechanisms exist for exactly that: a master can be given a priority
that rises as its buffer empties, so it is polite until it is nearly in trouble and then wins. That
is a better structure than static priority, which either wastes bandwidth or starves.</p>

<p>The property to reason about is that <b>latency is not a constant</b>. A block characterised in
isolation with a fast memory model will have been measured under conditions the system never
provides. Any master with a real-time requirement therefore needs buffering sized for the worst
case it can experience, and that worst case is a system-level number, not a block-level one.</p>

<p><b>Back pressure propagates</b>, which is what makes these systems hard to reason about. A slow
slave stalls the interconnect, which stalls other masters that never touch that slave, and a
performance problem appears somewhere with no apparent connection to the cause. Registering the
boundaries and providing enough buffering decouples the stages, at the cost of latency and
area.</p>

<p><b>Deadlock</b> is the failure that must be designed out rather than tested out. It arises when
two paths hold resources the other needs, and the standard structural protections are to ensure
that a response path can always drain independently of the request path, and that no component
requires a new request to be accepted before it can produce a response.</p>

<p>The practical approach is to build a <b>traffic model</b> early: masters generating realistic
patterns, not one at a time. Most system performance bugs are invisible in block-level simulation
and obvious the first time everything runs together.</p>
`,
quiz: [
{ q: "When is round robin arbitration the wrong default?",
o: ["When all masters are equal", "When one master has a hard deadline and the others only want throughput", "When there are many masters", "When bandwidth is plentiful"],
a: 1, why: "Fairness gives nobody a guarantee, so a display or audio path with a real deadline is served no better than a bulk transfer that could wait." },
{ q: "What does a quality of service scheme with rising priority achieve?",
o: ["Higher total bandwidth", "A master is polite until its buffer is nearly empty, then wins", "Deterministic latency for all masters", "Elimination of arbitration"],
a: 1, why: "It is better than static priority, which either wastes bandwidth on a master that does not need it yet or starves the others." },
{ q: "Why must a real-time master's buffering be sized from a system-level number?",
o: ["Block-level models are inaccurate", "Latency depends on what every other master is doing", "Buffers are shared between masters", "The interconnect adds fixed latency"],
a: 1, why: "A block characterised alone against a fast memory model was measured under conditions the real system never provides." },
{ q: "Why is propagating back pressure hard to debug?",
o: ["It only occurs under reset", "A slow slave stalls masters that never touch it", "It cannot be observed in simulation", "It appears as a timing violation"],
a: 1, why: "The symptom surfaces somewhere with no apparent connection to the cause, which is why registered boundaries and buffering to decouple stages are worth their cost." }
],
interview: {
q: "Several masters share a path to DRAM and one of them misses its deadline. How do you approach it?",
a: "The first thing I would establish is that this is a system property, not a property of the block that missed, because once masters share a path their latency is a function of what everything else is doing. So a block that was characterised alone against a fast memory model was measured under conditions the real system never provides, and its buffering may simply be sized from the wrong number. I would look at three things. First, arbitration: what policy is the interconnect using, and is it appropriate. Round robin is the common default and it is fair, which means it gives nobody a guarantee, so if one master has a genuine deadline like a display or an audio path and the others just want throughput, fairness is exactly the wrong choice. Fixed priority guarantees the top master and can starve the bottom, so what I would usually want is a quality of service scheme where the real-time master's priority rises as its buffer drains, so it is polite until it is nearly in trouble and then wins. Second, the actual worst-case latency it can experience, measured with all masters running realistic traffic rather than one at a time, and then whether its buffer covers that. Often the fix is more buffering rather than more bandwidth. Third, whether something is causing back pressure that propagates, because a slow slave stalls the interconnect and therefore stalls masters that never touch it, and that produces symptoms with no apparent connection to the cause. Registering boundaries and adding buffering to decouple stages costs latency and area and often solves it. Underneath all of that, I would want a traffic model in the system testbench early, with all masters generating realistic patterns, because these problems are invisible in block-level simulation and obvious the first time everything runs together."
}
},

{
id: "rtl-dram",
track: "RTL & Verilog",
sub: "System integration",
title: "External DRAM: banks, refresh and why bandwidth is not what you think",
mins: 24,
body: `
<p>The number on a memory's datasheet is a peak that assumes an access pattern you will not have.
Real efficiency on DRAM depends almost entirely on how the accesses are ordered, and a design that
ignores this can achieve a small fraction of the theoretical figure.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A DRAM bank with an open row, showing a hit needing only a column access while a miss needs precharge and activate first">
<rect class="bxa" x="24" y="26" width="632" height="50" rx="4"/>
<text class="th" x="40" y="52">a bank holds one open row at a time</text>
<text class="ts" x="40" y="70">reading a different row means closing the old one first</text>

<rect class="bx" x="24" y="90" width="308" height="70" rx="4"/>
<text class="th" x="40" y="116">row hit</text>
<text class="ts" x="40" y="142">column access only: fast</text>
<rect class="bx" x="348" y="90" width="308" height="70" rx="4"/>
<text class="th" x="364" y="116">row miss</text>
<text class="ts" x="364" y="142">precharge, activate, then access</text>

<rect class="bx" x="24" y="176" width="632" height="54" rx="4"/>
<text class="th" x="40" y="202">plus: refresh steals time, and switching between read and write costs cycles</text>
<text class="ts" x="40" y="222">random small accesses can leave you at a fraction of the peak figure</text>
</svg>

<p>A DRAM is organised into <b>banks</b>, and each bank has one <b>open row</b> at a time. An
access to the open row is quick, a column access and no more. An access to a different row in the
same bank requires closing the current one and opening the new one, which costs a great deal by
comparison. So <b>locality</b> is what determines performance, and sequential access within a row
is dramatically better than random access across rows.</p>

<p>Multiple banks help because operations in different banks overlap: one bank can be opening a
row while another is transferring data. That is why a controller interleaves and why the mapping
from address to bank, row and column matters. A mapping that puts sequential addresses in one bank
serialises what could have been parallel.</p>

<p><b>Turnaround</b> between reads and writes costs cycles because the bus has to change
direction, so a controller reorders to group reads together and writes together. That reordering
is why the memory controller has queues and why a transaction's latency is variable and not
predictable from its own properties.</p>

<p><b>Refresh</b> is unavoidable: the cells lose charge and must be periodically rewritten,
stealing bandwidth and occasionally blocking an access for a noticeable period. It also gets worse
at high temperature, which is a real effect in a hot enclosure.</p>

<p>What all this means for the designer is that <b>access pattern is an architectural
parameter</b>. Long sequential bursts from each master are worth a great deal; scattered single
accesses are expensive. Where a natural pattern is bad, such as reading a column from a large
image, the fix is to change the data layout, tiling the image so that a tile is contiguous, rather
than expecting the controller to compensate.</p>

<p>The corollary is that <b>latency</b> is not a fixed number and no master should assume it is.
The way to survive that is buffering deep enough to ride out the worst case, and enough
outstanding requests to keep the controller supplied with work it can reorder profitably.</p>
`,
quiz: [
{ q: "Why does access locality dominate DRAM performance?",
o: ["Caches only help sequential access", "A bank holds one open row, and a different row requires closing and opening", "Sequential addresses use fewer banks", "Refresh only affects random access"],
a: 1, why: "An access to the open row is a column access and no more, while a row miss costs a precharge and an activate before any data moves." },
{ q: "Why do multiple banks help?",
o: ["They increase the data bus width", "Operations in different banks overlap, so one can open a row while another transfers", "They reduce refresh overhead", "They allow larger bursts"],
a: 1, why: "That is why the address to bank, row and column mapping matters: a mapping that puts sequential addresses in one bank serialises what could overlap." },
{ q: "Why does a memory controller reorder transactions?",
o: ["To enforce fairness between masters", "To group reads and writes, since turning the bus around costs cycles", "To reduce refresh frequency", "To simplify arbitration"],
a: 1, why: "It is also why a transaction's latency is variable and cannot be predicted from its own properties alone." },
{ q: "What is the right fix when the natural access pattern is bad, such as reading an image column?",
o: ["Increase the burst length", "Change the data layout, for example tiling the image", "Add more outstanding transactions", "Raise the master's arbitration priority"],
a: 1, why: "The controller cannot compensate for a pattern that misses rows on every access, so the layout has to make the natural access contiguous." }
],
interview: {
q: "Your design achieves a fraction of the DRAM's rated bandwidth. Why might that be?",
a: "Because the rated figure is a peak that assumes an access pattern almost nothing produces, and real efficiency depends on how the accesses are ordered. A DRAM is organised in banks and each bank has one open row at a time. Hitting the open row is quick, just a column access, but touching a different row in the same bank means precharging the old row and activating the new one before any data moves, and that is expensive by comparison. So if my access pattern is scattered, I am paying a row miss on nearly every transaction and the data bus sits idle most of the time. The second effect is bank parallelism: operations in different banks overlap, so one bank can be opening a row while another transfers, and that only helps if the address to bank mapping spreads my traffic across banks rather than serialising it. The third is turnaround, because switching the bus between reads and writes costs cycles, which is why the controller queues and reorders to group them, and why a mixed read-write stream from several masters is much worse than the same volume separated. Then refresh, which steals bandwidth unavoidably and gets worse at high temperature. So to diagnose it I would look at row hit rate and bank utilisation from the controller's counters if they exist, and at how my masters actually issue. The fixes are mostly architectural rather than tuning. Long sequential bursts from each master instead of scattered single accesses. Enough outstanding transactions that the controller has a queue it can reorder profitably, because a master that waits for each response leaves the controller nothing to work with. And where the natural pattern is genuinely bad, such as reading a column out of a large image, changing the data layout so that the natural access is contiguous, by tiling, rather than expecting the controller to rescue it."
}
},

{
id: "rtl-ip",
track: "RTL & Verilog",
sub: "System integration",
title: "Integrating IP you did not write",
mins: 20,
body: `
<p>Most of a modern chip is not written by the team that ships it. Integrating a memory
controller, a PHY, a processor core or a standard interface block is normal engineering, and it
fails in characteristic ways that are worth knowing in advance.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Delivered IP consisting of RTL or a netlist, constraints, a testbench, and documentation, with integration risk concentrated in configuration and assumptions">
<rect class="bx" x="24" y="26" width="308" height="106" rx="4"/>
<text class="th" x="40" y="52">what you receive</text>
<text class="ts" x="40" y="78">RTL or an encrypted netlist</text>
<text class="ts" x="40" y="102">constraints, testbench, docs</text>
<text class="ts" x="40" y="124">a configuration space</text>

<rect class="bxa" x="348" y="26" width="308" height="106" rx="4"/>
<text class="th" x="364" y="52">where it goes wrong</text>
<text class="ts" x="364" y="78">untested parameter combination</text>
<text class="ts" x="364" y="102">undocumented assumption</text>
<text class="ts" x="364" y="124">clocks, resets, test, power</text>

<rect class="bx" x="24" y="148" width="632" height="82" rx="4"/>
<text class="th" x="40" y="176">verify the configuration you are using, in your system</text>
<text class="ts" x="40" y="204">the vendor verified the block, not your integration of it</text>
</svg>

<p>The first risk is <b>configuration</b>. Highly parameterised IP has a configuration space far
larger than anything the vendor verified exhaustively, so an unusual combination may be one nobody
has run. Prefer configurations the vendor states are common, and treat an exotic one as a thing
requiring your own verification.</p>

<p>The second is the set of <b>assumptions</b> in the integration layer, which is where the
vendor's responsibility ends and yours begins. Clocks and their relationships, reset sequencing
and how long reset must be held, whether the block expects its clock running before reset
deasserts, endianness, and which signals cross clock domains. These are documented unevenly and
they are the source of most bring-up problems.</p>

<p>Then the things that are easy to forget until late. <b>Test</b>: does the IP support scan, does
it need bypass structures, does it come with its own memory test. <b>Power</b>: does it support
being powered down, does it have retention. <b>Constraints</b>: the vendor's constraints must be
integrated with yours and often assume a context you do not have.</p>

<p>Verification of integrated IP is not a repeat of the vendor's verification. Run their testbench
in <b>your</b> configuration to check the configuration itself, then verify the integration: the
connections, the clock and reset architecture, the register map as software will see it, and the
behaviour under system traffic rather than in isolation. Protocol checkers bound to the interfaces
catch a large share of this automatically.</p>

<p>Encrypted or hardened deliverables add a practical constraint worth planning for: when
something goes wrong you cannot see inside, so debug depends on the observability at the
boundaries and on the vendor's support responsiveness. That is a schedule risk as much as a
technical one, and it is worth negotiating access before it is needed.</p>

<p>The recurring lesson is that the vendor verified the <b>block</b>, and nobody has verified
<b>your system</b>. Integration effort should be budgeted as real work rather than as a
connection exercise, which is a large part of why schedules slip.</p>
`,
quiz: [
{ q: "Why is an unusual IP configuration a risk?",
o: ["It uses more area", "The configuration space is far larger than what was verified exhaustively", "It voids support", "It cannot be simulated"],
a: 1, why: "Preferring configurations the vendor states are common, and treating an exotic one as needing your own verification, is the practical response." },
{ q: "Where does most bring-up trouble with integrated IP come from?",
o: ["Synthesis differences", "Undocumented assumptions about clocks, reset sequencing and domain crossings", "Insufficient area", "The register map"],
a: 1, why: "Whether the clock must run before reset deasserts, and how long reset is held, are documented unevenly and are exactly what bring-up exposes." },
{ q: "What should verification of integrated IP concentrate on?",
o: ["Repeating the vendor's block-level tests", "The integration: connections, clock and reset architecture, register map and system traffic", "Only the register map", "Formal equivalence to the vendor netlist"],
a: 1, why: "Running their testbench in your configuration checks the configuration, but the vendor verified the block and nobody has verified your system." },
{ q: "What practical risk does an encrypted deliverable add?",
o: ["It cannot be synthesised", "You cannot see inside when debugging, so you depend on boundary observability and vendor support", "It cannot be scanned", "It prevents formal verification"],
a: 1, why: "That is a schedule risk as much as a technical one, which is why access is worth negotiating before it is needed." }
],
interview: {
q: "You are integrating a third-party memory controller. What do you check?",
a: "I would start from the assumption that the vendor verified their block and nobody has verified my system, so the integration is real work rather than a wiring exercise. First, configuration. Heavily parameterised IP has a configuration space much larger than anything verified exhaustively, so I want to know whether the combination I need is one the vendor considers common or one nobody has run, and if it is unusual I plan to verify it myself. I would run their testbench in my exact configuration, which checks the configuration rather than the block. Second, the integration layer, which is where their responsibility ends and mine begins and where most bring-up problems live. Clock relationships and which are asynchronous, reset sequencing including how long reset must be held and whether the clock has to be running before it deasserts, which signals cross domains and whether the synchronisers are inside the IP or expected from me, endianness, and the exact register map as software will see it. Those are documented unevenly, so I would confirm rather than assume. Third, the things that get forgotten until late: does it support scan or need bypass structures, does it bring its own memory test, does it support being powered down or retained, and how do the vendor's timing constraints merge with mine, because they often assume a context I do not have. For verification I would bind protocol checkers to every interface from day one, which catches a large share of assumption mismatches automatically, and I would exercise it under realistic system traffic with the other masters running rather than in isolation, since a memory controller's whole behaviour is about contention. And I would find out early whether the deliverable is encrypted, because if I cannot see inside it, debug depends entirely on boundary observability and how responsive their support is, and that is a schedule risk I would rather negotiate before I need it."
}
},

{
id: "rtl-powerintent",
track: "RTL & Verilog",
sub: "System integration",
title: "Power domains: gating, isolation and retention",
mins: 22,
body: `
<p>Reducing dynamic power by gating clocks only goes so far. On anything battery powered the
larger win is turning parts of the chip <b>off</b>, and that introduces a set of structures with
no equivalent in the RTL, described in a separate power intent file rather than in the code.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A powered-down domain with isolation cells on its outputs, retention flops holding state, and level shifters between voltage domains">
<rect class="bx" x="24" y="26" width="300" height="126" rx="4"/>
<text class="th" x="40" y="52">switchable domain</text>
<text class="ts" x="40" y="80">off: no leakage, no state</text>
<text class="ts" x="40" y="106">retention flops keep the</text>
<text class="ts" x="40" y="126">few bits worth keeping</text>

<rect class="bxa" x="340" y="26" width="120" height="126" rx="4"/>
<text class="th" x="356" y="52">isolation</text>
<text class="ts" x="356" y="80">clamps</text>
<text class="ts" x="356" y="104">outputs to</text>
<text class="ts" x="356" y="126">a known value</text>

<rect class="bx" x="476" y="26" width="180" height="126" rx="4"/>
<text class="th" x="492" y="52">always-on domain</text>
<text class="ts" x="492" y="80">controls the sequence</text>
<text class="ts" x="492" y="106">and holds the wake</text>
<text class="ts" x="492" y="126">up path</text>

<rect class="bx" x="24" y="168" width="632" height="62" rx="4"/>
<text class="th" x="40" y="196">the sequence is the design: isolate, retain, power off, restore, release</text>
<text class="ts" x="40" y="218">get the order wrong and the failure is intermittent and voltage dependent</text>
</svg>

<p>The reason power gating exists is <b>leakage</b>, which a gated clock does nothing about. A
block that is idle still leaks, and on a device that spends most of its life asleep, leakage
dominates the energy budget, so the only real answer is removing its supply.</p>

<p>Doing that requires three structures. <b>Isolation</b> cells clamp the outputs of a domain
being powered down, because an unpowered output floats and would otherwise drive indeterminate
values into powered logic, which can cause crowbar current as well as wrong behaviour.
<b>Retention</b> flops keep a small amount of state on a permanent supply so that waking does not
mean starting from scratch. And <b>level shifters</b> sit between domains at different voltages,
since a signal from a low-voltage domain may not register as high in a higher-voltage one.</p>

<p>The <b>sequence</b> is where the design effort goes: isolate the outputs, save the state that
must survive, remove the supply, and on wake restore the supply, allow it to settle, restore
state, release isolation, release reset. Getting the order wrong produces failures that are
intermittent and voltage dependent, which are among the hardest to debug in silicon.</p>

<p>An <b>always-on</b> region has to exist to hold the controller that runs this sequence and the
wake-up path, and identifying what genuinely must stay on is an architectural decision, because
everything placed there leaks permanently.</p>

<p>All of this is described in a <b>power intent</b> file rather than in the RTL, because the
structures are inserted by the tools and the same RTL may be used in a design with different
domains. That file is a source deliverable, and it is verified: tools check that every crossing
has isolation and shifting where required, and simulation can model the domains so that reading a
powered-down block produces indeterminate values rather than silently working.</p>

<p>The design principle worth remembering is that <b>domain boundaries should be few and
narrow</b>. Each crossing costs cells, verification and a way to get the sequence wrong, so a
partition that keeps a domain's interface small is worth much more than one chosen for
convenience.</p>
`,
quiz: [
{ q: "Why is clock gating insufficient on a device that spends most of its life asleep?",
o: ["Gated clocks still toggle occasionally", "It does nothing about leakage, which dominates the sleep energy budget", "It requires an always-on domain", "It cannot be applied to memories"],
a: 1, why: "An idle block still leaks, so the only real answer for long idle periods is removing the supply entirely." },
{ q: "What do isolation cells prevent?",
o: ["Leakage in the powered-down domain", "Floating outputs driving indeterminate values into powered logic", "Level mismatches between voltage domains", "Loss of retained state"],
a: 1, why: "An unpowered output floats, which causes wrong behaviour and can also cause crowbar current in the receiving logic." },
{ q: "Where is power intent described?",
o: ["In the RTL, using synthesis pragmas", "In a separate power intent file, since the tools insert the structures", "In the timing constraints", "In the floorplan"],
a: 1, why: "The same RTL may be used in designs with different domains, and the file is a verified source deliverable rather than documentation." },
{ q: "Why should power domain boundaries be few and narrow?",
o: ["Tools limit the number of domains", "Each crossing costs cells, verification and a way to get the sequence wrong", "Wide boundaries increase leakage", "Retention flops only work on narrow interfaces"],
a: 1, why: "A partition that keeps a domain's interface small is worth much more than one chosen for coding convenience." }
],
interview: {
q: "How would you reduce power on a chip that is idle most of the time?",
a: "If it is idle most of the time then the energy budget is dominated by leakage rather than switching, so clock gating is not the answer, or at least not the main one, because a gated block still leaks. The real lever is power gating: removing the supply from regions that are not in use. That brings in structures that have no equivalent in RTL. Isolation cells clamp the outputs of a domain being powered down, because an unpowered output floats and would otherwise drive indeterminate values into powered logic, which is both functionally wrong and can cause crowbar current. Retention flops keep a small amount of state on a permanent supply so waking up does not mean reinitialising everything, and choosing what is worth retaining is a real trade because retention cells are larger and leak. Level shifters sit between domains running at different voltages. And there has to be an always-on region holding the controller that sequences all this and the wake-up path, and deciding what genuinely must stay on is architectural, because everything in there leaks permanently. Most of the design effort goes into the sequence: isolate, retain, remove supply, then on wake restore supply, let it settle, restore state, release isolation, release reset. Getting that order wrong gives intermittent voltage-dependent failures, which are about the worst thing to debug in silicon. All of it is described in a power intent file rather than in the RTL, because the tools insert the cells and the same RTL might be used with different domains, and that file gets verified: static checks that every crossing has isolation and shifting, and simulation that models the domains so reading a powered-down block gives indeterminate values instead of quietly working. The architectural guidance I would follow is to keep domain boundaries few and narrow, because every crossing costs cells, verification effort and another way to get the sequence wrong. Alongside that I would still use clock gating for the active periods and consider voltage and frequency scaling if the workload varies."
}
},

{
id: "rtl-arch",
track: "RTL & Verilog",
sub: "System integration",
title: "Microarchitecture: from a specification to a block that meets its budget",
mins: 24,
body: `
<p>Between a specification and RTL there is a step that is often skipped and is where most of the
value is added: deciding the structure. Throughput, latency, area, power and frequency are traded
against each other here, and once the RTL exists those choices are expensive to revisit.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A requirement converted into a rate, then into a structure choice between iterative, pipelined and parallel implementations">
<rect class="bx" x="24" y="24" width="632" height="42" rx="4"/>
<text class="th" x="40" y="50">requirement: samples per second, frames per second, packets per second</text>
<rect class="bxa" x="24" y="76" width="632" height="42" rx="4"/>
<text class="th" x="40" y="102">operations per clock: the number that decides the structure</text>

<rect class="bx" x="24" y="118" width="200" height="106" rx="4"/>
<text class="th" x="40" y="144">iterative</text>
<text class="ts" x="40" y="170">one unit, many cycles</text>
<text class="ts" x="40" y="196">smallest, slowest</text>
<rect class="bx" x="240" y="118" width="200" height="106" rx="4"/>
<text class="th" x="256" y="144">pipelined</text>
<text class="ts" x="256" y="170">one result per cycle</text>
<text class="ts" x="256" y="196">latency, not throughput</text>
<rect class="bx" x="456" y="118" width="200" height="106" rx="4"/>
<text class="th" x="472" y="144">parallel</text>
<text class="ts" x="472" y="170">N results per cycle</text>
<text class="ts" x="472" y="196">area scales with N</text>
</svg>

<p>Start by converting the requirement into <b>operations per clock</b>. A rate in the problem
domain, samples per second or frames per second, divided by the clock frequency, gives the number
that determines everything: below one, an iterative structure that reuses one unit over many
cycles is enough; around one, a pipeline; above one, parallel units, and the area scales
accordingly.</p>

<p>Then account for the <b>memory</b>, which is usually the real constraint. How much state must
be held, what bandwidth is needed to feed the computation, and whether that fits on chip. A design
that needs more on-chip memory than is available is not a small problem, and the fix, tiling,
streaming, recomputing rather than storing, is architectural.</p>

<p>The classic trades are worth having at hand. <b>Pipelining</b> buys frequency at the cost of
latency and registers. <b>Parallelism</b> buys throughput at the cost of area and power.
<b>Time multiplexing</b> buys area at the cost of throughput. <b>Precision</b> reduction buys area
and power at the cost of accuracy, and on a DSP block it is often the largest single lever.</p>

<p>Interfaces deserve deciding early because they constrain everything: a streaming interface with
back pressure is simple and composes well; a memory-mapped interface implies latency and
outstanding transactions; and whether the block can stall determines whether the internal control
is simple or has to handle bubbles everywhere.</p>

<p>The best insurance is a <b>model</b> before the RTL. A software model that produces the exact
bit-accurate outputs serves three purposes at once: it validates the algorithm and the precision
choices, it becomes the reference for the testbench, and it lets performance be estimated before
anything is committed. Building it is rarely wasted time.</p>

<p>Finally, write the choices down with their reasons. A design decision recorded as "two stage
pipeline because timing analysis showed the multiplier could not close in one cycle at this
frequency" is worth a great deal a year later, when someone asks whether it can be removed.</p>
`,
quiz: [
{ q: "What number determines the basic structure of a block?",
o: ["The clock frequency", "Operations per clock, from the required rate divided by the frequency", "The available area", "The number of interfaces"],
a: 1, why: "Below one an iterative structure suffices, around one a pipeline, and above one parallel units whose area scales with the count." },
{ q: "Why is memory usually the real constraint?",
o: ["It consumes the most power", "How much state must be held and at what bandwidth often decides feasibility", "Memories are slow to simulate", "It determines the clock frequency"],
a: 1, why: "A design needing more on-chip memory than exists is not a small problem, and the fixes, tiling, streaming or recomputing, are architectural." },
{ q: "What does pipelining buy and cost?",
o: ["Throughput at the cost of area", "Frequency at the cost of latency and registers", "Area at the cost of throughput", "Accuracy at the cost of power"],
a: 1, why: "Parallelism buys throughput for area and power; time multiplexing buys area for throughput; reduced precision buys both for accuracy." },
{ q: "Why build a bit-accurate model before the RTL?",
o: ["It is required for synthesis", "It validates the algorithm, becomes the testbench reference and enables early estimation", "It replaces the specification", "It generates the RTL automatically"],
a: 1, why: "Three purposes from one artefact, which is why building it is rarely wasted time even when the algorithm seems well understood." }
],
interview: {
q: "How do you go from a specification to a microarchitecture?",
a: "The first thing I do is convert the requirement into operations per clock, because that single number decides the structure. A rate in the problem domain, samples per second or frames per second or packets per second, divided by the clock frequency I can realistically achieve on the target technology. If that comes out well below one, an iterative design that reuses one arithmetic unit over many cycles is enough and it will be the smallest. Around one, I want a pipeline producing a result per cycle. Above one, I need parallel units and the area scales with the count, which is often the moment to go back and ask whether the frequency or the algorithm can change instead. Then I look at memory, which is usually the real constraint rather than the arithmetic. How much state has to be held, what bandwidth is needed to feed the computation, and whether that fits on chip, because a design that needs more on-chip memory than exists is not a small problem and the fixes, tiling, streaming, recomputing instead of storing, are all architectural. Then the standard trades, explicitly: pipelining buys frequency and costs latency and registers, parallelism buys throughput and costs area and power, time multiplexing buys area and costs throughput, and reducing precision buys area and power at the cost of accuracy, which on a signal processing block is often the largest single lever. Interfaces I decide early because they constrain everything, particularly whether the block can be stalled, since that determines whether the control logic is simple or has to handle bubbles throughout. And before writing any RTL I would build a bit-accurate software model, because it validates the algorithm and the precision choices, becomes the reference model for the testbench, and lets me estimate performance before committing to anything. Then I write the decisions down with their reasons, because a year later someone will ask why the pipeline has two stages."
}
}

);
