// RTL & Verilog: verification methodology.
//
// The track had one testbench lesson and one on lint and formal basics. For most
// digital roles verification is more than half the work, so this is the section
// that turns "I wrote a testbench" into "I can own sign-off for a block".

LESSONS.push(

{
id: "rtl-vplan",
track: "RTL & Verilog",
sub: "Verification methodology",
title: "What verified means: the plan and the sign-off",
mins: 22,
body: `
<p>The hardest question in verification is not how to test something, it is how to know when you
have finished. Silicon cannot be patched, so "we ran out of time" has to be replaced by an
argument that the design has been checked against something specific.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A specification decomposed into features, each mapped to a coverage item and a check, feeding a sign-off argument">
<rect class="bx" x="24" y="24" width="632" height="40" rx="4"/>
<text class="th" x="40" y="50">specification: what the block must do, and must not do</text>
<rect class="bx" x="24" y="74" width="632" height="40" rx="4"/>
<text class="th" x="40" y="100">features and scenarios, written down before any testbench exists</text>
<rect class="bx" x="24" y="124" width="308" height="52" rx="4"/>
<text class="th" x="40" y="150">how it is stimulated</text>
<text class="ts" x="40" y="170">directed or random</text>
<rect class="bx" x="348" y="124" width="308" height="52" rx="4"/>
<text class="th" x="364" y="150">how it is checked</text>
<text class="ts" x="364" y="170">scoreboard, assertion, model</text>
<rect class="bxa" x="24" y="186" width="632" height="44" rx="4"/>
<text class="th" x="40" y="214">covered, checked, and reviewed: that is the sign-off argument</text>
</svg>

<p>A <b>verification plan</b> is the answer. It decomposes the specification into features and
scenarios, and for each one records two things: how that behaviour will be <b>stimulated</b>, and
how the result will be <b>checked</b>. Both halves matter, because stimulus without a check
proves only that the design did not crash.</p>

<p>The plan is written from the specification, ideally by someone other than the designer, and
before the testbench exists. Written afterwards it degenerates into a description of what the
testbench happens to do, which is exactly the assumption set you needed an independent view
of.</p>

<p>The plan also has to include what the design must <b>not</b> do. Illegal input sequences,
error responses, overflow, back pressure held indefinitely, reset in the middle of a transaction.
Bugs cluster there, because the specification is usually vaguest about them and the designer
thought about them least.</p>

<p><b>Sign-off</b> then becomes an argument rather than a feeling: every feature in the plan has
coverage showing it was exercised, a check that would have failed if it were wrong, and a review
confirming the mapping is honest. Where something is untested, that is recorded as a known risk
rather than silently omitted.</p>

<p>Two things distort this in practice. Coverage <b>closure pressure</b> encourages people to
write coverage for what is easy to hit rather than for what matters, and a plan derived from the
RTL rather than the specification cannot find a missing feature, only a broken one. Both produce
impressive numbers over an unverified design.</p>

<p>The practical test of a plan is whether it lets someone else answer, for any reported escape,
"which line of the plan should have caught this?" If no line should have, the plan was incomplete;
if one should have, the implementation of that line was weak. Either answer improves the next
block.</p>
`,
quiz: [
{ q: "What two things must a verification plan record for each feature?",
o: ["The test name and the expected runtime", "How it is stimulated and how the result is checked", "The RTL module and its author", "The coverage percentage and the seed"],
a: 1, why: "Stimulus without a check proves only that the design did not crash, which is why both halves have to be planned explicitly." },
{ q: "Why should the plan be written before the testbench?",
o: ["It saves engineering time", "Written afterwards it just describes what the testbench happens to do", "Tools require it as an input", "It fixes the random seeds"],
a: 1, why: "That degenerate version encodes exactly the assumptions you needed an independent view of, so it cannot reveal what was left out." },
{ q: "Why must the plan include what the design must not do?",
o: ["Standards require negative testing", "The specification is vaguest there and the designer thought about it least", "Error paths are simpler to test", "It improves code coverage"],
a: 1, why: "Illegal sequences, error responses, overflow, indefinite back pressure and reset mid-transaction are where bugs cluster." },
{ q: "What is the practical test of a good verification plan?",
o: ["It reaches 100% coverage", "For any escape, you can say which line should have caught it", "It has one test per module", "It is approved by the design lead"],
a: 1, why: "If no line should have, the plan was incomplete; if one should have, that line's implementation was weak. Either answer improves the next block." }
],
interview: {
q: "How do you decide when a block is verified enough to sign off?",
a: "It has to be an argument against something written down rather than a judgement about how much testing feels like enough, because silicon cannot be patched. So I would start with a verification plan derived from the specification, not from the RTL, ideally written by someone other than the designer and before the testbench exists. For every feature and scenario in it I record two things: how that behaviour gets stimulated, and how the result gets checked, because stimulus with no check only proves the design did not fall over. The plan deliberately includes the negative space, the illegal input sequences, the error responses, overflow, back pressure held indefinitely, reset arriving mid-transaction, because that is where bugs cluster: the specification is usually vaguest there and it is what the designer thought about least. Sign-off is then the claim that every line of that plan has coverage showing it was actually exercised, a check that would have failed had the behaviour been wrong, and a review confirming that mapping is honest rather than nominal. Anything that has not been verified is recorded as a known risk instead of quietly omitted, so the decision to accept it is explicit and made by the right people. I would also want the regression to be clean over many random seeds rather than one, bug discovery rate to have flattened, and no unexplained failures parked as intermittent. The distortions I actively watch for are coverage written for what is easy to hit rather than what matters, and a plan reverse engineered from the RTL, because that can only find a broken feature, never a missing one, and both produce very impressive numbers over a design nobody has really verified."
}
},

{
id: "rtl-crv",
track: "RTL & Verilog",
sub: "Verification methodology",
title: "Constrained random: stimulus you did not think of",
mins: 22,
body: `
<p>Directed tests check what you thought of. The bugs that reach silicon are, almost by
definition, in the cases you did not, which is why serious verification generates stimulus
randomly within legal bounds and lets the machine explore.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A constraint solver producing legal random transactions, driven into the design, checked automatically and measured by coverage that feeds back into the constraints">
<rect class="bx" x="24" y="26" width="196" height="76" rx="4"/>
<text class="th" x="40" y="52">constraints</text>
<text class="ts" x="40" y="78">what is legal, and</text>
<text class="ts" x="40" y="96">how often</text>
<rect class="bx" x="240" y="26" width="196" height="76" rx="4"/>
<text class="th" x="256" y="52">random transactions</text>
<text class="ts" x="256" y="78">a new seed gives a</text>
<text class="ts" x="256" y="96">different exploration</text>
<rect class="bx" x="456" y="26" width="200" height="76" rx="4"/>
<text class="th" x="472" y="52">automatic checking</text>
<text class="ts" x="472" y="78">no expected values</text>
<text class="ts" x="472" y="96">written by hand</text>

<rect class="bxa" x="24" y="120" width="632" height="52" rx="4"/>
<text class="th" x="40" y="146">coverage says where it has been</text>
<text class="ts" x="40" y="166">and that steers the next round of constraints</text>

<rect class="bx" x="24" y="186" width="632" height="44" rx="4"/>
<text class="th" x="40" y="214">without a checker, random stimulus verifies nothing at all</text>
</svg>

<p>The method has three parts and all three are required. A <b>constraint</b> set describing what
is legal, a <b>generator</b> that produces legal transactions from it, and an automatic
<b>checker</b>, because nobody can predict the correct result of ten thousand random
transactions by hand. Random stimulus with a manual check is not a method.</p>

<p>Constraints do more than exclude the illegal. They shape the <b>distribution</b>, and the
default distribution is almost always wrong: a uniformly random burst length rarely produces the
back-to-back minimum bursts that break a pipeline, and a uniformly random address almost never
crosses a boundary. Weighting towards corners is where the value is.</p>

<p>The <b>seed</b> is the other half of the idea. Running the same test with many seeds explores
different paths through the same constraint space, so a regression is a matter of many seeds
overnight rather than more tests written by hand. When one seed fails, it reproduces exactly,
which is what makes debugging tractable.</p>

<p>Coverage closes the loop. Random stimulus goes where the constraints let it, so coverage tells
you where it has been, and holes tell you which constraints to tighten or which scenario needs a
directed test after all. The two techniques are complements: random finds the unexpected,
directed guarantees the specific.</p>

<p>The failure mode to know is <b>over-constraining</b>. Constraints written to keep the design
happy, rather than to describe what the environment can legally do, quietly exclude exactly the
stimulus that would have found the bug, and everything passes. Constraints deserve review as
carefully as the RTL, because they encode assumptions about the world.</p>
`,
quiz: [
{ q: "Why does constrained random require an automatic checker?",
o: ["Simulation is too slow otherwise", "Nobody can predict the correct result of thousands of random transactions by hand", "The solver needs the checker's feedback", "Coverage cannot be collected without one"],
a: 1, why: "Random stimulus with a manual check is not a method. Without a checker, random stimulus verifies nothing at all." },
{ q: "Why is the default random distribution usually wrong?",
o: ["It is not truly random", "Uniform choices rarely hit the corners, such as minimum bursts or boundary crossings", "It repeats across seeds", "It violates the protocol"],
a: 1, why: "Weighting the distribution towards the corner cases is where most of the value in constraint writing actually lies." },
{ q: "What does running many seeds give you?",
o: ["Higher simulation performance", "Different explorations of the same constraint space, each exactly reproducible", "Coverage of illegal stimulus", "Independence from the checker"],
a: 1, why: "A regression becomes many seeds overnight rather than more hand-written tests, and a failing seed reproduces exactly, which makes debug tractable." },
{ q: "What is over-constraining?",
o: ["Adding so many constraints the solver fails", "Constraints that keep the design happy rather than describing legal environment behaviour", "Constraining coverage rather than stimulus", "Using too narrow a seed range"],
a: 1, why: "It quietly excludes exactly the stimulus that would have found the bug, and everything passes, which is why constraints need review like RTL." }
],
interview: {
q: "When would you use constrained random rather than directed tests?",
a: "I would use both, because they answer different questions. Directed tests guarantee a specific scenario is exercised, which I want for the things the specification names explicitly and for anything a customer will ask about. Constrained random is what finds the cases nobody thought of, which is where the bugs that reach silicon actually live, so for any block with a meaningful state space, protocols, arbitration, buffering, anything with back pressure, I would make random the backbone and use directed tests to fill named gaps. The method needs three things and it fails if any is missing: constraints describing what the environment can legally do, a generator producing transactions from them, and an automatic checker, because nobody can predict the right answer for ten thousand random transactions by hand. Random stimulus with a manual check is not verification. I would put real effort into the distribution rather than just legality, because the default is nearly always wrong: uniformly random burst lengths hardly ever produce the back-to-back minimum bursts that break a pipeline, and uniform addresses almost never cross a boundary, so weighting towards the corners is where the value is. Then I run many seeds, since each seed explores the constraint space differently and a failure reproduces exactly, which makes a regression a matter of machine time rather than more hand-written tests. Coverage closes the loop and tells me where the stimulus has actually been, and the holes tell me whether to loosen a constraint or write a directed test. The thing I watch hardest for is over-constraining, where constraints get tightened to keep the design passing rather than to describe what the environment can really do, because that excludes precisely the stimulus that would have found the bug."
}
},

{
id: "rtl-uvm",
track: "RTL & Verilog",
sub: "Verification methodology",
title: "UVM: the structure and why it exists",
mins: 24,
body: `
<p>UVM is a large class library, and it is easy to learn its mechanics without understanding what
problem it solves. It exists so that testbench components are <b>reusable</b> across blocks,
projects and companies, and so that a new test is a change of configuration rather than a new
testbench.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A UVM environment containing an agent with sequencer, driver and monitor, plus a scoreboard and coverage collector, driven by a sequence from the test">
<rect class="bxa" x="24" y="20" width="632" height="34" rx="4"/>
<text class="th" x="40" y="42">test: chooses sequences and configuration</text>

<rect class="bx" x="24" y="64" width="632" height="166" rx="4"/>
<text class="th" x="40" y="88">environment</text>

<rect class="bx" x="44" y="100" width="280" height="116" rx="4"/>
<text class="th" x="60" y="124">agent</text>
<text class="ts" x="60" y="150">sequencer: hands items over</text>
<text class="ts" x="60" y="174">driver: item to pin wiggles</text>
<text class="ts" x="60" y="198">monitor: pins back to items</text>

<rect class="bx" x="344" y="100" width="140" height="116" rx="4"/>
<text class="th" x="360" y="124">scoreboard</text>
<text class="ts" x="360" y="150">reference model</text>
<text class="ts" x="360" y="174">compares</text>

<rect class="bx" x="500" y="100" width="140" height="116" rx="4"/>
<text class="th" x="516" y="124">coverage</text>
<text class="ts" x="516" y="150">from monitor</text>
<text class="ts" x="516" y="174">not from driver</text>
</svg>

<p>The <b>agent</b> is the reusable unit for one interface. Its <b>driver</b> converts abstract
transactions into pin activity, its <b>monitor</b> does the reverse by observing the pins, and its
<b>sequencer</b> feeds the driver with items. An agent can be active, driving, or passive,
observing only, which is what lets the same component serve at block level and again inside a
system-level testbench.</p>

<p>The separation of driver from monitor is the point people miss. The monitor observes the
interface independently rather than reporting what the driver intended, so coverage and checking
are based on what actually happened. Collecting coverage in the driver would record your
intentions and pass a design that ignored them.</p>

<p><b>Sequences</b> hold the stimulus, and keeping them separate from the driver is what makes
tests cheap. The driver knows the protocol and never changes; a sequence describes an intent, and
a test selects sequences and configuration. New scenarios therefore cost a sequence, not a
testbench.</p>

<p>The <b>factory</b> and <b>configuration database</b> are the mechanisms that make this
substitutable: a test can replace one component type with a derived one, or change a parameter
deep in the hierarchy, without editing the environment. That is what makes an environment reusable
across projects rather than being copied and diverging.</p>

<p>The <b>phases</b> exist because a distributed hierarchy has to be built, connected and run in a
defined order, and objections exist so that the simulation ends when the last component agrees it
is finished rather than at an arbitrary time.</p>

<p>The honest caveat is that UVM is heavy. For a small block with one simple interface, a direct
SystemVerilog testbench is quicker to write and easier to read, and the discipline that matters,
transactions, an independent monitor, automatic checking and coverage, does not actually require
the library. UVM earns its cost when components are reused.</p>
`,
quiz: [
{ q: "Why must coverage be collected from the monitor rather than the driver?",
o: ["The driver runs in a different phase", "The monitor observes what actually happened, not what was intended", "The driver has no access to the interface", "Monitors run faster"],
a: 1, why: "Collecting in the driver records your intentions, which would pass a design that quietly ignored them." },
{ q: "What does making an agent passive allow?",
o: ["Faster simulation", "Reusing the same component to observe an interface it does not drive", "Coverage without a scoreboard", "Running without a sequencer"],
a: 1, why: "That is what lets one agent serve at block level driving an interface and again in a system testbench merely observing it." },
{ q: "Why are sequences kept separate from the driver?",
o: ["Drivers cannot be randomised", "The driver knows the protocol and never changes; new scenarios then cost only a sequence", "Sequences run in a different phase", "It is required by the factory"],
a: 1, why: "A test selects sequences and configuration, so adding a scenario does not mean touching the testbench structure." },
{ q: "When is UVM not worth it?",
o: ["When the design is large", "For a small block with one simple interface and no reuse", "When constrained random is used", "When coverage is required"],
a: 1, why: "The discipline that matters, transactions, an independent monitor, automatic checking and coverage, does not require the library. UVM earns its cost through reuse." }
],
interview: {
q: "Describe the structure of a UVM testbench and what each part is for.",
a: "The organising idea is that testbench components should be reusable across blocks and projects, and that adding a test should be a change of stimulus and configuration rather than a new testbench. So the reusable unit is the agent, which handles one interface. Inside it the driver turns abstract transactions into pin activity, the monitor does the reverse by watching the pins and reconstructing transactions, and the sequencer feeds the driver with items. The agent can be active, actually driving, or passive, observing only, and that is what lets me use the same component at block level where it drives and again in a system testbench where that interface is driven by real RTL. The separation of monitor from driver is the part people skip and it is the important one, because the monitor observes independently, so coverage and checking reflect what actually happened rather than what I intended to send. If I collected coverage in the driver I would be recording my own intentions and would happily pass a design that ignored them. Above the agents, the environment holds them together with the scoreboard, which usually has a reference model and compares predicted against observed, and the coverage collectors. Stimulus lives in sequences, which are deliberately separate from the driver: the driver knows the protocol and never changes, a sequence expresses an intent, and a test picks sequences and configuration, so a new scenario costs a sequence rather than a testbench. The factory and the configuration database are what make components and parameters substitutable from a test without editing the environment, which is what stops environments being copied and diverging. Phases exist because a distributed hierarchy has to be built, connected and run in order, and objections are how the simulation knows it can end. I would add that UVM is heavy, and for a small block with one simple interface I would write a direct SystemVerilog testbench instead, because the discipline that actually matters does not require the library."
}
},

{
id: "rtl-sva",
track: "RTL & Verilog",
sub: "Verification methodology",
title: "Assertions: properties that catch real bugs",
mins: 22,
body: `
<p>An assertion states something that must always be true, checked continuously, at the place it
matters. Its value is not that it finds bugs a testbench could not, but that it finds them
<b>immediately</b>, at the source, rather than as a mismatch a thousand cycles later at an
output.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A bug at an internal interface propagating to an output failure much later, contrasted with an assertion firing at the moment and place it occurs">
<rect class="bx" x="24" y="26" width="632" height="74" rx="4"/>
<text class="th" x="40" y="52">without assertions</text>
<text class="ts" x="40" y="78">bug at cycle 400, deep inside, becomes a scoreboard mismatch at cycle 9000</text>
<rect class="bxa" x="24" y="112" width="632" height="74" rx="4"/>
<text class="th" x="40" y="138">with assertions</text>
<text class="ts" x="40" y="164">fires at cycle 400, names the interface and the rule that broke</text>
<rect class="bx" x="24" y="198" width="632" height="34" rx="4"/>
<text class="ts" x="40" y="220">same bug, minutes of debug rather than a day</text>
</svg>

<p>The two forms serve different purposes. An <b>immediate</b> assertion is procedural and checks
a condition at that instant, which suits testbench code. A <b>concurrent</b> assertion is
declarative, evaluated against a clock, and can express behaviour over time, which is what makes
it able to describe a protocol.</p>

<p>The expressive core is the <b>implication</b>: when this happens, that must follow. A request
must eventually be granted; a valid signal must stay asserted until ready; a one-hot state vector
must never have two bits set. Sequences let the antecedent and consequent span cycles, and
overlapping and non-overlapping forms differ in whether the consequent starts on the same
cycle.</p>

<p>Two rules matter for correctness of the assertions themselves. Every property needs a
<b>disable</b> condition for reset, or a design will fail its own assertions coming out of reset
for entirely legitimate reasons. And a <b>liveness</b> property, saying something happens
eventually, cannot be checked in simulation without a bound, so in practice it becomes a bounded
property with a timeout, chosen from the specification rather than from what the design happens
to do.</p>

<p>Where they go is a design decision. On <b>internal</b> interfaces, written by the designer,
they encode the assumptions between blocks and fire the moment one is broken. On <b>external</b>
interfaces, they check protocol compliance, which is why vendor protocol checkers are packaged as
assertion sets you bind on.</p>

<p>The distinction between <b>assert</b>, <b>assume</b> and <b>cover</b> is worth being precise
about. Assert is an obligation on the design; assume is an obligation on the environment, which in
simulation constrains nothing but in formal restricts what the tool may generate; cover asks
whether a scenario ever occurred, and a cover that never hits is often more informative than an
assert that never fires.</p>

<p>The practical payoff is at the <b>system</b> level, where assertions written at block level
keep working. A block integrated into a larger design will report its own violated assumptions
rather than producing a mysterious system-level symptom, and that is where most integration time
is lost.</p>
`,
quiz: [
{ q: "What is the main value of an assertion over a scoreboard check?",
o: ["It catches bugs a scoreboard cannot", "It fires at the moment and place the rule breaks, not thousands of cycles later", "It runs faster in simulation", "It works without a clock"],
a: 1, why: "The same bug becomes minutes of debug instead of a day, because the failure names the interface and the rule rather than an output mismatch." },
{ q: "Why does every concurrent assertion need a reset disable condition?",
o: ["Assertions cannot sample during reset", "The design will legitimately violate its own assertions coming out of reset", "The clock is not stable", "It halves simulation cost"],
a: 1, why: "Without it you get a flood of failures that are entirely correct behaviour, and people learn to ignore assertion output." },
{ q: "What is the difference between assert and assume?",
o: ["Assume is for testbenches, assert for RTL", "Assert is an obligation on the design, assume on the environment", "Assume is checked only in simulation", "There is none; they are synonyms"],
a: 1, why: "In formal, an assume restricts what the tool may generate, which is powerful and also how an over-constrained proof becomes meaningless." },
{ q: "Why can a liveness property not be checked directly in simulation?",
o: ["Simulators do not support it", "Eventually has no bound, so it becomes a bounded property with a timeout", "It requires formal abstraction", "It conflicts with the reset disable"],
a: 1, why: "The bound should come from the specification rather than from whatever the current design happens to do, or it just documents the implementation." }
],
interview: {
q: "Where would you put assertions in a design, and what would they check?",
a: "I would put most of them on internal interfaces, written by the designer at the time of writing the RTL, because that is where the assumptions between blocks live and nothing else records them. The value is not that they catch bugs a testbench could not, it is that they catch them at the moment and place the rule breaks rather than as a scoreboard mismatch thousands of cycles later at an output, so the same bug is minutes of debug instead of a day. Typical ones are protocol rules like valid staying asserted until ready, a request always being followed by exactly one grant, a FIFO never being written when full or read when empty, a one-hot vector never having two bits set, and a state machine never reaching its default branch. On external interfaces I would use protocol checkers, which vendors ship as assertion sets you bind on, rather than writing my own for a standard bus. On writing them correctly, every concurrent assertion needs a disable during reset, otherwise the design legitimately violates its own assertions coming out of reset and people learn to ignore the output, which is worse than having none. Anything phrased as eventually needs a bound taken from the specification rather than from what the design currently does, or it just documents the implementation. And I would use cover as much as assert, because a cover that never hits tells me a scenario is not being exercised, which is often more informative than an assert that never fires. The real payoff comes at integration, because block-level assertions keep working when the block is dropped into a system, so it reports its own broken assumptions instead of producing a mysterious system-level symptom, and that is where integration time usually goes."
}
},

{
id: "rtl-coverage",
track: "RTL & Verilog",
sub: "Verification methodology",
title: "Coverage: what it measures and the closure trap",
mins: 22,
body: `
<p>Coverage is the only quantitative answer to "how much have we verified", and it is routinely
misread. It measures where the stimulus has been. It does not measure whether anything was
checked, and the difference between those two is where escapes come from.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Code coverage measuring RTL exercised, functional coverage measuring intent exercised, and neither implying anything was checked">
<rect class="bx" x="24" y="26" width="308" height="106" rx="4"/>
<text class="th" x="40" y="52">code coverage</text>
<text class="ts" x="40" y="78">lines, branches, toggles, FSM</text>
<text class="ts" x="40" y="102">automatic, from the RTL</text>
<text class="ts" x="40" y="124">cannot see a missing feature</text>

<rect class="bx" x="348" y="26" width="308" height="106" rx="4"/>
<text class="th" x="364" y="52">functional coverage</text>
<text class="ts" x="364" y="78">scenarios you named</text>
<text class="ts" x="364" y="102">hand written, from the spec</text>
<text class="ts" x="364" y="124">only as good as the plan</text>

<rect class="bxa" x="24" y="148" width="632" height="82" rx="4"/>
<text class="th" x="40" y="176">neither says anything was checked</text>
<text class="ts" x="40" y="202">a testbench with no checker can reach full coverage</text>
<text class="ts" x="40" y="222">and verify nothing whatsoever</text>
</svg>

<p><b>Code coverage</b> is derived automatically from the RTL: which lines executed, which
branches were taken both ways, which bits toggled, which states and transitions occurred. It is
cheap and objective, and its limitation is structural: it can only measure code that exists, so a
feature that was never implemented is perfectly covered.</p>

<p><b>Functional coverage</b> is written by hand from the specification, and records whether the
scenarios you care about actually happened: this transaction type at this size, arriving while the
buffer was full, followed by a reset. It can catch a missing feature, and it is only ever as good
as the plan it came from.</p>

<p>They are complements and both are needed. Full functional coverage with unexercised RTL means
there is behaviour nobody planned for. Full code coverage with functional holes means the tests
touch everything without ever creating the situations that matter.</p>

<p><b>Crosses</b> are where functional coverage earns its cost, because bugs live in combinations:
not "we saw a write" and "we saw a full buffer" separately, but a write arriving at a full buffer
during a refresh. A cross that produces thousands of bins mostly wastes time, so the art is
choosing the few combinations that are physically meaningful and excluding the rest
deliberately.</p>

<p>The <b>closure trap</b> is the failure mode to name. Under pressure to reach a number, teams
add coverage that is easy to hit, exclude bins that are hard to explain, and write tests aimed at
coverage rather than at risk. The number rises and the verification does not improve. Exclusions
in particular need review, because each one is an argument that something cannot happen, and that
argument is exactly the kind of thing that turns out to be wrong.</p>

<p>Treat coverage as a <b>guide</b> rather than a goal: holes tell you where to look, and the
final number is evidence for the sign-off argument, not the argument itself.</p>
`,
quiz: [
{ q: "What does coverage fundamentally not tell you?",
o: ["Which lines executed", "Whether anything was checked", "Which scenarios occurred", "Which states were reached"],
a: 1, why: "A testbench with no checker at all can reach full coverage and verify nothing, which is why coverage is evidence rather than the argument." },
{ q: "What is the structural limitation of code coverage?",
o: ["It is expensive to collect", "It can only measure code that exists, so a missing feature is fully covered", "It cannot measure state machines", "It requires manual bins"],
a: 1, why: "Functional coverage, written from the specification, is what can reveal that something was never implemented at all." },
{ q: "Why are crosses valuable in functional coverage?",
o: ["They reduce the number of bins", "Bugs live in combinations, not in individual events", "They are collected automatically", "They replace code coverage"],
a: 1, why: "A write and a full buffer separately mean little; a write arriving at a full buffer during a refresh is the case that breaks things." },
{ q: "What is the closure trap?",
o: ["Coverage saturating before the design is complete", "Chasing the number by adding easy bins and excluding awkward ones", "Excluding unreachable states", "Running too few seeds"],
a: 1, why: "The number rises and the verification does not improve, which is why every exclusion needs review as an explicit claim that something cannot happen." }
],
interview: {
q: "You have 100% coverage on a block. What does that actually tell you?",
a: "Less than the number suggests, and I would want to know which coverage and against what plan before I drew any conclusion. Coverage measures where the stimulus has been. It says nothing at all about whether anything was checked, so a testbench with no scoreboard and no assertions can reach full coverage and verify precisely nothing. So the first question is what the checking looks like. Then which kind of coverage. If it is code coverage, then all it says is that every line and branch and toggle in the RTL was exercised, and its limitation is structural: it can only measure code that exists, so a feature that was never implemented is perfectly covered and always will be. That is the case that reaches silicon. Functional coverage is better evidence because it is written from the specification rather than derived from the RTL, so it can reveal a missing feature, but it is only ever as good as the verification plan behind it, which is why I would want to see the plan and the mapping rather than the percentage. I would also look hard at the exclusions, because each exclusion is an argument that something cannot happen, and that is exactly the kind of argument that turns out to be wrong, so they need review by someone other than the person who wrote them. And I would ask whether the crosses are meaningful, because bugs live in combinations, and a block can hit every individual bin without ever seeing a write arrive at a full buffer during a refresh. What would actually reassure me alongside the number is a clean regression over many seeds, a bug discovery curve that has flattened, and assertions on the internal interfaces, because those tell me the design was watched, not just walked over."
}
},

{
id: "rtl-formal",
track: "RTL & Verilog",
sub: "Verification methodology",
title: "Formal: proofs, bounded checks and equivalence",
mins: 24,
body: `
<p>Formal verification proves a property over <b>all</b> legal inputs rather than the ones you
happened to generate. Where it applies it is qualitatively stronger than simulation, and knowing
where it applies is most of the skill.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Three formal outcomes: proved for all inputs, a counterexample trace, and a bounded proof to a given depth">
<rect class="bxa" x="24" y="26" width="632" height="56" rx="4"/>
<text class="th" x="40" y="52">proved: no input sequence can violate it, ever</text>
<text class="ts" x="40" y="72">as strong as verification gets, and only as good as the assumptions</text>
<rect class="bx" x="24" y="94" width="632" height="56" rx="4"/>
<text class="th" x="40" y="120">counterexample: a concrete trace that breaks it</text>
<text class="ts" x="40" y="140">usually minimal, which makes it far easier to debug than a random failure</text>
<rect class="bx" x="24" y="162" width="632" height="68" rx="4"/>
<text class="th" x="40" y="188">bounded: no violation within N cycles of reset</text>
<text class="ts" x="40" y="208">real evidence, not a proof; state the depth when you report it</text>
</svg>

<p>The <b>assumptions</b> are where formal succeeds or fails. A property proved under assumptions
that do not hold in the real system is worthless, and it is easy to over-constrain until
everything proves. Assumptions therefore have to be reviewed as carefully as the properties, and
ideally checked as assertions on the neighbouring block, so that what one side assumes the other
side is obliged to guarantee.</p>

<p>The third outcome, <b>bounded</b>, is the common one on real designs. The tool proves no
violation within a certain depth from reset and cannot go further within the time given. That is
genuine evidence, particularly if the depth comfortably exceeds the design's own latency, but it
is not a proof, and reporting it as one is dishonest.</p>

<p>Formal suits <b>control</b> logic with wide input spaces and deep sequential behaviour:
arbiters, state machines, FIFO control, protocol interfaces, cache coherency, anything with a
fairness or deadlock question. It struggles with wide <b>datapaths</b>, where multipliers and
large memories explode the state space, which is why those are usually abstracted or left to
simulation.</p>

<p>Several applications need almost no property writing. <b>Equivalence checking</b> proves that
synthesis or an ECO did not change the function, and is standard sign-off practice rather than an
optional exercise. Connectivity checking proves that every top-level pin reaches where the
specification says. Register checking proves the entire register map matches its description. Each
replaces a great deal of tedious simulation.</p>

<p>Formal is also excellent at <b>unreachability</b>, which quietly saves time elsewhere: proving
that a coverage bin cannot be hit turns an argument about an exclusion into a fact, and proving a
state is unreachable justifies not testing it.</p>

<p>Used well it does not replace simulation, it takes the parts it is good at. Prove the control
properties and the protocol compliance, then spend simulation effort on the system behaviour and
the datapath, which is where formal cannot help.</p>
`,
quiz: [
{ q: "What makes a formal proof stronger than a simulation result?",
o: ["It runs faster", "It holds over all legal input sequences, not just those generated", "It needs no properties", "It covers the datapath better"],
a: 1, why: "That strength is entirely conditional on the assumptions, which is why an over-constrained proof can be worthless while looking impressive." },
{ q: "What is a bounded proof?",
o: ["A proof limited to one clock domain", "No violation within N cycles of reset, with no guarantee beyond", "A proof with assumptions", "A proof of a liveness property"],
a: 1, why: "It is genuine evidence, particularly when the depth exceeds the design's own latency, but reporting it as a full proof is dishonest." },
{ q: "What kind of logic does formal suit best?",
o: ["Wide datapaths with multipliers", "Control logic: arbiters, FSMs, FIFO control, protocol interfaces", "Large memory arrays", "Analogue interfaces"],
a: 1, why: "Multipliers and large memories explode the state space, which is why datapaths are usually abstracted or left to simulation." },
{ q: "What does equivalence checking prove?",
o: ["That the RTL matches the specification", "That synthesis or an ECO did not change the function", "That assertions hold", "That coverage bins are reachable"],
a: 1, why: "It is standard sign-off practice rather than an optional exercise, and it needs no properties to be written." }
],
interview: {
q: "Where would you use formal verification rather than simulation?",
a: "I would use it where the input space is wide, the behaviour is sequential and the property is crisp, which in practice means control logic: arbiters, state machines, FIFO and buffer control, protocol interfaces, anything with a fairness, deadlock or starvation question. Those are exactly the places where simulation has to get lucky and formal does not, because it proves the property over all legal input sequences rather than the ones I happened to generate. I would not point it at wide datapaths, because multipliers and large memories explode the state space, so those get abstracted or left to simulation. Alongside property checking there are applications that need almost no property writing and are worth doing on every project. Equivalence checking proves that synthesis or a late ECO did not change the function, and that is standard sign-off rather than optional. Connectivity checking proves every top-level pin goes where the specification says. Register checking proves the whole register map matches its description. Each of those replaces a lot of tedious simulation. Formal is also very good at unreachability, which is useful for coverage closure, because proving that a bin cannot be hit turns an argument about an exclusion into a fact. The thing I would be most careful about is the assumptions, because a property proved under assumptions that do not hold in the real system is worthless, and it is very easy to over-constrain until everything proves. So assumptions get reviewed as carefully as properties, and ideally each assumption on one block is an assertion on the block that drives it, so what one side assumes the other is obliged to guarantee. And I would report bounded results honestly, stating the depth reached, because no violation within forty cycles of reset is real evidence but it is not a proof."
}
}

);
