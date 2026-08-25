// Embedded C track, batch 10: process and safety.
// How firmware gets specified, reviewed, released and recovered from, and what
// functional safety standards actually demand.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-req",
track: "Embedded C",
sub: "Process and safety",
title: "Requirements that can actually be tested",
mins: 24,
body: `
<p>Most firmware defects are not coding errors. They are cases where the code does exactly what
someone asked for, and what they asked for was wrong, ambiguous, or never written down.</p>

<h3>The test for a requirement</h3>
<p>Can you write, today, the procedure that decides whether it passes? If not, it is not a
requirement yet.</p>
<pre>"The system shall be responsive."                     not a requirement
"The LED shall be brighter when quality is better."   a direction, not a spec
"LED duty cycle shall be proportional to the quality
 register, updated at 20 Hz, with a step response
 settling within 200 ms."                             testable</pre>
<p>The third one has a quantity, a relationship, a rate and a bound. Two engineers implementing
it independently would produce behaviour you could not distinguish, which is the actual goal.</p>

<h3>The words that hide decisions</h3>
<p>Certain words reliably indicate that a decision has been deferred rather than made:</p>
<ul>
<li><b>Fast, quick, responsive.</b> How fast, measured how?</li>
<li><b>Reliable, robust, stable.</b> Failing how often is acceptable?</li>
<li><b>Approximately, roughly, about.</b> Within what tolerance?</li>
<li><b>User-friendly, intuitive.</b> Judged by whom, against what?</li>
<li><b>Handle, support, manage.</b> Handle how? A device that "handles a lost connection" might
retry, might reboot, might sit silently.</li>
<li><b>Etc, and so on, similar.</b> The unwritten half is where the surprises live.</li>
</ul>
<p>Finding these and asking the question is often the single most valuable thing an engineer
does on a project, and it is cheapest at the start.</p>

<h3>The error cases are the requirements</h3>
<p>The happy path is usually specified. What is almost never specified is everything else, and
that is where firmware spends most of its code:</p>
<pre>What happens when the sensor is disconnected?
             ... when it returns an implausible value?
             ... when the connection drops mid-transfer?
             ... when flash is full?
             ... when the battery is nearly flat?
             ... when two commands arrive at once?
             ... on the first boot, before calibration?</pre>
<p>Every one of those will happen, so the behaviour will exist whether or not anyone chose it.
Asking the question moves it from an accident to a decision.</p>

<h3>Non-functional requirements exist too</h3>
<p>Timing, power, memory and lifetime constrain the design at least as much as behaviour, and
they are the ones discovered late when the part turns out to be too small.</p>
<pre>Worst-case interrupt latency          &lt; 50 us
Average current, idle                 &lt; 40 uA
Flash headroom after v1.0             &gt; 30%
Settings write endurance              &gt; 100,000 saves
Time from power-on to first reading   &lt; 2 s</pre>
<p>Writing these down early is what prevents the conversation where a feature is technically
complete and the product does not work.</p>

<h3>Traceability, and what it is really for</h3>
<p>A matrix linking each requirement to the tests that verify it. In regulated work it is
evidence. Everywhere else, the useful direction is the reverse one: it shows you which
requirements have <b>no</b> test, and that list is always surprising.</p>
<p>It is a coverage report in requirement space rather than code space, and it finds different
gaps. Code coverage tells you which lines ran; this tells you which promises nobody checks.</p>

<h3>Requirements change, and that is normal</h3>
<p>The failure is not change. It is undocumented change: a conversation in which someone agrees
to something, the code is written, and nothing records that the specification moved.</p>
<p>Six months later nobody can tell whether a behaviour is intended or a bug, and the test that
would have caught the regression was never written because nobody knew there was a
requirement.</p>
<p>The fix is small: when the behaviour changes, change the written requirement in the same
commit, and add or update the test that checks it. If those three things move together, the
project stays honest.</p>

<h3>What to do with a requirement you cannot meet</h3>
<p>Say so early, in writing, with the number. "The current draw target is 40 microamps; with
this radio duty cycle the floor is 95, so either the target moves or the duty cycle does."</p>
<p>That is a far better position than delivering something that misses silently, and it is the
behaviour that distinguishes an engineer people trust with a schedule.</p>
`,
quiz: [
{ q: "What is the test for whether something is a requirement?",
o: ["It is written down", "You can write today the procedure that decides whether it passes", "A manager approved it", "It has a number"],
a: 1, why: "If you cannot describe how it would be verified, the decision has been deferred rather than made. Two engineers implementing a good requirement independently would produce indistinguishable behaviour." },
{ q: "Which part of the specification is almost always missing?",
o: ["The happy path", "The error cases", "The user interface", "The hardware list"],
a: 1, why: "Sensor disconnected, implausible value, connection lost mid-transfer, flash full, first boot before calibration. Every one will happen, so the behaviour exists whether or not anyone chose it." },
{ q: "What is the most useful direction to read a traceability matrix?",
o: ["Test to requirement, for auditors", "Requirement to test, to find requirements nothing verifies", "By author", "By date"],
a: 1, why: "It is a coverage report in requirement space rather than code space, so it finds different gaps. Code coverage tells you which lines ran; this tells you which promises nobody checks." },
{ q: "A requirement changes mid-project. What is the actual failure mode?",
o: ["The change itself", "Undocumented change: the code moves but the written requirement and its test do not", "Changing too late", "Telling the customer"],
a: 1, why: "Six months later nobody can tell whether a behaviour is intended or a bug, and no test guards it. Move the requirement, the code and the test in the same commit and the project stays honest." }
],
interview: {
q: "You are handed a one-page brief for a new product. What do you do with it?",
a: "I would read it looking for the words that hide decisions, because those are where the expensive surprises live. Fast, reliable, responsive, approximately, handle, and anything ending in etcetera. Each of those is a decision someone deferred, and asking the question costs nothing at the start and a great deal later. Then I would go looking for what is not there at all, which is almost always the error cases: what happens when the sensor is disconnected, when it returns an implausible value, when the connection drops mid-transfer, when flash is full, on the first boot before calibration. Those will all happen, so the behaviour is going to exist whether or not anyone chose it, and asking turns an accident into a decision. I would also want the non-functional numbers early, meaning worst-case latency, average current, flash headroom, time from power-on to first reading, because those constrain the part selection and discovering them late usually means changing hardware. Then I would write the whole lot back as testable statements, each with a quantity and a bound, and check each one against the question of whether I could write the verification procedure today. Anything I cannot, I would go back and ask about. And if there is a target I do not think we can meet, I would say so in writing with the number attached rather than discovering it at integration."
}
},

{
id: "emb-review",
track: "Embedded C",
sub: "Process and safety",
title: "Code review that finds things",
mins: 24,
body: `
<p>Review is the cheapest defect-finding technique available and the one most often performed
as a formality. The difference is entirely in what you look for and how the conversation
runs.</p>

<h3>What review is good at, and what it is not</h3>
<p>It is excellent at defects a test cannot easily reach: error paths nobody exercises, a
missing bounds check, an assumption that only holds today, a name that will mislead the next
person, a design that will be expensive to change.</p>
<p>It is poor at arithmetic, at concurrency, and at anything requiring you to simulate execution
in your head. Those want tests, sanitizers and static analysis. Trying to catch them by reading
is how reviews become long and still miss things.</p>

<h3>A firmware-specific checklist</h3>
<p>Generic review advice misses most of what goes wrong in embedded. These are the questions
worth asking on almost every change:</p>
<ul>
<li><b>Anything shared with an interrupt?</b> Is it <code>volatile</code>, and is every
read-modify-write on it protected?</li>
<li><b>Every buffer.</b> Does the function know the size, or is it trusting the caller?</li>
<li><b>Every wait.</b> Is there a timeout, and what happens when it expires?</li>
<li><b>Every return value.</b> Is it checked, and does the error keep its meaning as it
propagates?</li>
<li><b>Every allocation.</b> Is it checked, and is it freed on every exit path including the
error ones?</li>
<li><b>Every register access.</b> Read-modify-write on something read-to-clear or
write-1-to-clear?</li>
<li><b>Every fixed delay.</b> Should it be polling a status bit with a timeout?</li>
<li><b>Arithmetic.</b> Signedness, promotion, overflow of an intermediate, a shift into a sign
bit.</li>
<li><b>Anything static.</b> Does it prevent a second instance, or make the function
non-reentrant?</li>
</ul>
<p>Nine questions, and they cover a large fraction of what actually ships broken.</p>

<h3>Say the consequence, not the preference</h3>
<p>The difference between a comment people act on and one they argue with:</p>
<pre>"You should use dependency injection here."
     -> sounds like taste, invites a debate about taste

"Calling the HAL directly means this can only run on this
 silicon with the part attached, so the error paths can
 never be exercised. Three function pointers and a context
 would fix it."
     -> a consequence and a specific action</pre>
<p>Naming the consequence makes it checkable. Proposing the change makes it actionable. Neither
requires you to be senior to the author.</p>

<h3>Separate the levels</h3>
<p>Mark which kind of comment you are making, because they carry different weight:</p>
<ul>
<li><b>Defect.</b> This is wrong and will fail. Must change.</li>
<li><b>Risk.</b> This will probably bite later, here is how. Worth discussing.</li>
<li><b>Suggestion.</b> I would do it differently. Take it or leave it.</li>
<li><b>Question.</b> I do not understand this, which may mean the next person will not
either.</li>
</ul>
<p>Without the labels, a nitpick and a genuine defect look identical in a list of fifteen
comments, and the author has to guess which matter.</p>
<p>That question category is underrated. If a reviewer cannot follow the code, that is data
about the code, not about the reviewer.</p>

<h3>Receiving review</h3>
<p>The professionally useful habits are small and mostly about removing friction:</p>
<ul>
<li>Keep changes small. A 2,000-line change gets approved; a 200-line change gets read.</li>
<li>Say what you want reviewed. "I am unsure about the locking in
<code>rb_get</code>" directs attention where it is worth spending.</li>
<li>Answer the comment, not the tone. Even a blunt comment usually contains a fact.</li>
<li>If you disagree, say why with a reason. "The datasheet requires the write before the read"
ends the discussion; "I prefer it this way" does not.</li>
<li>Push back when you are right. Accepting every comment is not agreeableness, it is a failure
to contribute judgement.</li>
</ul>

<h3>The automation argument</h3>
<p>Anything a machine can check should not be in a review comment. Formatting, warnings,
undefined behaviour, memory errors and coverage all belong in the build.</p>
<p>Every comment about a missing space is a comment not spent on the missing bounds check.
Turning on <code>-Wall -Wextra -Werror</code>, clang-format and a sanitizer build is what buys
back the review's attention for things only a human can see.</p>
`,
quiz: [
{ q: "What is code review good at, relative to testing?",
o: ["Arithmetic and concurrency", "Error paths nobody exercises, missing bounds checks, and assumptions that only hold today", "Performance measurement", "Memory errors"],
a: 1, why: "It is poor at anything requiring you to simulate execution in your head, which is what tests, sanitizers and static analysis are for. Trying to catch those by reading is how reviews get long and still miss things." },
{ q: "Why say the consequence rather than the preference in a review comment?",
o: ["It is politer", "A consequence is checkable and hard to argue with, where a preference invites a debate about taste", "It is shorter", "It avoids conflict"],
a: 1, why: "'You should use dependency injection' sounds like taste. 'This can only run on this silicon with the part attached, so error paths can never be exercised' names a fact and proposes an action." },
{ q: "Why label a review comment as defect, risk, suggestion or question?",
o: ["For metrics", "Without labels a nitpick and a genuine defect look identical, and the author has to guess which matter", "It is required by ISO", "To count them"],
a: 1, why: "The question category is underrated too: if a reviewer cannot follow the code, that is data about the code rather than about the reviewer." },
{ q: "Why should formatting never appear in a review comment?",
o: ["It does not matter", "Every comment about a space is one not spent on the missing bounds check", "Reviewers should not read style", "It is subjective"],
a: 1, why: "Anything a machine can check belongs in the build. Warnings as errors, clang-format and a sanitizer build buy back the review's attention for what only a human can see." }
],
interview: {
q: "How do you review firmware?",
a: "I try to spend the attention where reading is actually better than tooling, so anything a machine can check I would rather have in the build: formatting, warnings as errors, undefined behaviour and memory errors under sanitizers. Every comment about a missing space is a comment not spent on a missing bounds check. What is left is what review is genuinely good at, which is error paths nobody exercises, assumptions that only hold today, and designs that will be expensive to change. I work through a fairly fixed list because embedded goes wrong in repeatable ways: anything shared with an interrupt, is it volatile and is every read-modify-write protected; every buffer, does the function know the size or is it trusting the caller; every wait, is there a timeout and what happens when it expires; every return value and allocation, checked and freed on every exit path including the error ones; every register access, is it a read-modify-write on something read-to-clear; every fixed delay that should be polling a status bit; and arithmetic for signedness, promotion and overflow. On the conversation itself, I try to state the consequence rather than a preference, because a consequence is checkable and a preference invites an argument about taste, and I label whether something is a defect, a risk, a suggestion or a question so the author is not guessing which of fifteen comments matter. And I treat not understanding the code as data about the code rather than about me."
}
},

{
id: "emb-safety",
track: "Embedded C",
sub: "Process and safety",
title: "Hazards, failure modes and safe states",
mins: 26,
body: `
<p>Safety engineering is not about making failures impossible. It is about deciding what the
system does when they happen, before they happen.</p>

<h3>Start from harm, not from components</h3>
<p>A hazard is a state that can lead to harm. Not "the sensor fails", which is a fault, but "the
heater stays on with no temperature feedback", which is a hazard.</p>
<p>The distinction matters because many different faults produce the same hazard, and a
mitigation aimed at the hazard covers all of them. Working from components upward produces a
long list and misses combinations.</p>

<h3>FMEA, and the one question it forces</h3>
<p>Failure Modes and Effects Analysis walks each component or function through: how can this
fail, what happens if it does, how would we know, and what do we do.</p>
<pre>Item        : temperature sensor
Failure mode: open circuit
Effect      : reading goes to full scale
Detection   : reading outside plausible range for 5 consecutive samples
Mitigation  : enter safe state, report fault code, latch until acknowledged</pre>
<p>The column that changes designs is <b>detection</b>. A failure you cannot detect cannot be
mitigated, and writing that row is what surfaces the need for a plausibility check, a second
sensor, or a periodic self-test.</p>
<p>The failure mode people miss is the one that looks like valid data. A disconnected
thermocouple reading 0 degrees is far more dangerous than one reading a diagnosable fault
value, which is why sensor circuits are often biased so that a disconnection reads
out-of-range.</p>

<h3>Define the safe state explicitly</h3>
<p>Every system has one, and it is worth writing down because it is not always obvious:</p>
<ul>
<li>A motor: stopped, brake applied.</li>
<li>A heater: off.</li>
<li>A valve: depends entirely on the process. Sometimes closed, sometimes open, occasionally
held.</li>
<li>A medical infusion pump: stopped is not automatically safe, because the therapy may
matter.</li>
</ul>
<p>Two properties are worth aiming for. The safe state should be what the system reaches with no
power, so it does not depend on software being alive. And reaching it should not depend on the
thing that failed.</p>
<p>A design where the emergency stop is a software function that runs on the processor that just
crashed is not a design.</p>

<h3>Fail-safe against fail-operational</h3>
<p><b>Fail-safe</b> means stop and be safe. It is the right answer for most equipment, and it is
much cheaper.</p>
<p><b>Fail-operational</b> means keep working correctly despite the failure, which is what
aircraft flight controls and steer-by-wire need, and it requires redundancy: two channels, a
comparison, and a way to decide which to believe.</p>
<p>Knowing which one your product needs, and saying so, is a more useful contribution than
either assuming.</p>

<h3>Detecting rather than preventing</h3>
<p>Most practical firmware safety is detection plus a defined response:</p>
<ul>
<li><b>Plausibility.</b> Is this value physically possible? Did it change faster than the
process can?</li>
<li><b>Cross-checks.</b> Two independent measurements that should agree.</li>
<li><b>Liveness.</b> A watchdog fed only when the whole system has demonstrated progress, not
from a timer.</li>
<li><b>Self-test at start-up.</b> RAM, flash CRC, the safety path itself.</li>
<li><b>Periodic self-test.</b> Because a component can fail after start-up, which is when most
of the operating hours are.</li>
</ul>
<p>That last one catches people. Testing the safety mechanism only at power-on means a fault in
the safety mechanism goes undetected for the whole operating period, and a safety mechanism you
cannot confirm is working is not a mitigation.</p>

<h3>Single point of failure</h3>
<p>Ask of any mitigation: what single thing, if it fails, removes it? If the answer is the same
processor that runs the control loop, you have one channel wearing two hats.</p>
<p>This is why safety-relevant designs often use an independent watchdog chip rather than the
internal one, a hardware interlock in series with the drive, or a second small
microcontroller whose only job is to say no.</p>

<h3>Write it down as it is decided</h3>
<p>A hazard log with the hazard, its severity, how likely it is, what detects it, what the
response is, and how that response was verified. It is a table, not a document, and it is
worth keeping even on products with no regulatory requirement.</p>
<p>The reason is the same as the threat model: the value is recording what you deliberately did
not mitigate, and why, so a future engineer knows it was a decision.</p>
`,
quiz: [
{ q: "What is the difference between a fault and a hazard?",
o: ["Nothing", "A fault is a component failing; a hazard is a state that can lead to harm", "A hazard is more likely", "A fault is detectable"],
a: 1, why: "Many different faults produce the same hazard, so a mitigation aimed at the hazard covers all of them. Working upward from components produces a long list and misses combinations." },
{ q: "Which FMEA column most often changes a design?",
o: ["Failure mode", "Detection", "Effect", "Severity"],
a: 1, why: "A failure you cannot detect cannot be mitigated. Writing that row is what surfaces the need for a plausibility check, a second sensor, or a periodic self-test." },
{ q: "Why is a disconnected thermocouple reading 0 degrees particularly dangerous?",
o: ["It is not", "It looks like valid data, so nothing detects it", "It is out of range", "It reads too high"],
a: 1, why: "A failure that produces a plausible value is worse than one producing an obvious fault code. Sensor circuits are often biased deliberately so that a disconnection reads out of range." },
{ q: "What is wrong with an emergency stop implemented purely in software on the main processor?",
o: ["Nothing", "It depends on the thing that may have failed, so it is a single point of failure", "It is too slow", "It uses too much flash"],
a: 1, why: "Reaching the safe state should not depend on the component that failed. Hence independent watchdog chips, hardware interlocks in series with the drive, or a second small MCU whose only job is to say no." }
],
interview: {
q: "How would you approach safety for a product that moves something?",
a: "I would start from harm rather than from components, because a hazard is a state that can lead to harm rather than a part failing, and many different faults produce the same hazard, so a mitigation aimed at the hazard covers all of them. Then I would define the safe state explicitly and write it down, because it is not always obvious: for a motor it is stopped with the brake applied, for a valve it depends entirely on the process. Two properties I would aim for are that the safe state is what the system reaches with no power, so it does not depend on software being alive, and that reaching it does not depend on the thing that failed. An emergency stop implemented as a software function on the processor that just crashed is not a design. Then an FMEA, and the column that actually changes designs is detection, because a failure you cannot detect cannot be mitigated, and writing that row is what surfaces the need for a plausibility check or a second sensor. The failure mode I would look hardest for is the one that produces a plausible value, like a disconnected thermocouple reading zero, which is why those circuits are often biased so a disconnection reads out of range. In firmware most of the work is detection plus a defined response: plausibility checks, cross-checks between independent measurements, a watchdog fed only when the whole system has shown progress rather than from a timer, and periodic self-test rather than only at start-up, because a safety mechanism you cannot confirm is still working is not a mitigation."
}
},

{
id: "emb-standards",
track: "Embedded C",
sub: "Process and safety",
title: "Functional safety standards, and what they demand",
mins: 26,
body: `
<p>You do not need to have worked to IEC 61508 to talk about it usefully. You need to know what
these standards are actually asking for, because the underlying ideas are good engineering
whether or not anyone audits you.</p>

<h3>The family</h3>
<ul>
<li><b>IEC 61508</b> is the generic functional safety standard that the others derive from. Its
levels are <b>SIL 1 to 4</b>.</li>
<li><b>ISO 26262</b> is the automotive adaptation, with <b>ASIL A to D</b>.</li>
<li><b>IEC 62304</b> covers medical device software, with <b>classes A, B and C</b> based on
the harm a failure could cause.</li>
<li><b>DO-178C</b> covers airborne software, with levels A to E, and is where MC/DC coverage
comes from.</li>
<li><b>EN 50128</b> is the railway equivalent.</li>
</ul>
<p>The pattern is identical across all of them: classify how bad a failure would be, and let that
classification decide how much rigour the development requires.</p>

<h3>What the level actually controls</h3>
<p>Not the code. The <b>process and the evidence</b>. A higher level demands more of things like
these:</p>
<ul>
<li>Requirements written, reviewed and traced to tests.</li>
<li>Structural coverage: statement, then branch, then MC/DC at the highest levels.</li>
<li>Independence: the person verifying is not the person who wrote it.</li>
<li>A coding standard, with recorded deviations.</li>
<li>Tool qualification, because if a compiler bug can introduce a fault, the tool itself needs
justifying.</li>
<li>Configuration management strong enough to rebuild any released binary exactly.</li>
</ul>
<p>The recurring theme is that you must be able to <b>demonstrate</b> the software is right, not
merely believe it. That is why the paperwork exists, and why a project that did everything well
but recorded nothing fails an audit.</p>

<h3>The V-model</h3>
<p>Every one of these standards is organised around the same shape: each level of design has a
corresponding level of verification.</p>

<svg class="fig" viewBox="0 0 680 450" role="img" aria-label="The V-model: requirements, architecture and detailed design descend to implementation, and each is verified by a corresponding level of testing ascending the other side">
<rect class="bxa" x="40" y="50" width="210" height="56" rx="4"/>
<text class="th" x="56" y="74">Requirements</text>
<text class="ts" x="56" y="92">what it must do</text>
<rect class="bx" x="40" y="126" width="210" height="56" rx="4"/>
<text class="th" x="56" y="150">Architecture</text>
<text class="ts" x="56" y="168">how it is structured</text>
<rect class="bx" x="40" y="202" width="210" height="56" rx="4"/>
<text class="th" x="56" y="226">Detailed design</text>
<text class="ts" x="56" y="244">how each part works</text>
<line class="arr" x1="145" y1="106" x2="145" y2="122" marker-end="url(#arrow)"/>
<line class="arr" x1="145" y1="182" x2="145" y2="198" marker-end="url(#arrow)"/>
<path class="arr" d="M145 258 L145 275 L290 275 L290 286" fill="none" marker-end="url(#arrow)"/>
<rect class="bx" x="235" y="290" width="210" height="56" rx="4"/>
<text class="th" x="251" y="314">Implementation</text>
<text class="ts" x="251" y="332">the code itself</text>
<path class="arr" d="M390 290 L390 275 L535 275 L535 262" fill="none" marker-end="url(#arrow)"/>
<rect class="bx" x="430" y="202" width="210" height="56" rx="4"/>
<text class="th" x="446" y="226">Unit tests</text>
<text class="ts" x="446" y="244">verify detailed design</text>
<line class="arr" x1="535" y1="202" x2="535" y2="186" marker-end="url(#arrow)"/>
<rect class="bx" x="430" y="126" width="210" height="56" rx="4"/>
<text class="th" x="446" y="150">Integration tests</text>
<text class="ts" x="446" y="168">verify the architecture</text>
<line class="arr" x1="535" y1="126" x2="535" y2="110" marker-end="url(#arrow)"/>
<rect class="bxa" x="430" y="50" width="210" height="56" rx="4"/>
<text class="th" x="446" y="74">System acceptance</text>
<text class="ts" x="446" y="92">verify the requirements</text>
<line class="guide" x1="250" y1="78" x2="430" y2="78"/>
<line class="guide" x1="250" y1="154" x2="430" y2="154"/>
<line class="guide" x1="250" y1="230" x2="430" y2="230"/>
<rect class="bx" x="40" y="376" width="600" height="54" rx="4"/>
<text class="th" x="56" y="400">Each level is verified by the one opposite it</text>
<text class="ts" x="56" y="418">which is why an untestable requirement is a defect in the requirement, not in the test</text>
</svg>
<p class="figcap">The dashed links are the point. A requirement with nothing opposite it is a
promise nobody checks, and that is what a traceability matrix exposes.</p>

<h3>What is genuinely worth borrowing</h3>
<p>Most projects are not regulated, and four of these practices pay for themselves anyway:</p>
<ul>
<li><b>Written, testable requirements</b>, because most defects are specification defects.</li>
<li><b>Traceability</b> in the requirement-to-test direction, because it finds promises nobody
verifies.</li>
<li><b>Independence in review</b>, because the author cannot see their own assumption.</li>
<li><b>Being able to rebuild any release exactly</b>, because you will need to reproduce a
customer's fault.</li>
</ul>

<h3>The honest position on rigour</h3>
<p>These standards are frequently caricatured as bureaucracy, and applied badly they are. What
they are actually demanding is that decisions be recorded and claims be evidenced.</p>
<p>The useful answer, if asked, is that the level of rigour should follow the consequence of
failure, which is exactly what the classification schemes encode. A toy and an infusion pump
should not have the same process, and saying which one you are building is the first step.</p>
`,
quiz: [
{ q: "What does a safety integrity level primarily control?",
o: ["The programming language", "The process and the evidence required, not the code itself", "The clock speed", "The number of engineers"],
a: 1, why: "Requirements traced to tests, structural coverage, independence in verification, a coding standard with recorded deviations, tool qualification, and configuration management. The theme is demonstrating correctness rather than believing it." },
{ q: "Which standard covers medical device software?",
o: ["ISO 26262", "IEC 62304", "DO-178C", "EN 50128"],
a: 1, why: "With classes A, B and C based on the harm a failure could cause. ISO 26262 is automotive with ASIL A to D, DO-178C is airborne, EN 50128 is railway, and IEC 61508 is the generic parent." },
{ q: "In the V-model, what does each level of design have?",
o: ["A deadline", "A corresponding level of verification", "A separate team", "A document number"],
a: 1, why: "Requirements pair with acceptance testing, architecture with integration testing, detailed design with unit testing. A requirement with nothing opposite it is a promise nobody checks." },
{ q: "Which practice from these standards is worth borrowing even on unregulated work?",
o: ["Tool qualification", "Traceability read from requirement to test, to find promises nobody verifies", "MC/DC coverage", "Formal methods"],
a: 1, why: "Along with written testable requirements, independence in review, and being able to rebuild any release exactly. The others are proportionate to consequence, which is exactly what the classification schemes encode." }
],
interview: {
q: "You have not worked to a functional safety standard. How would you talk about one?",
a: "I would be straightforward that I have not been audited against one, and then talk about what they actually ask for, because the underlying ideas are good engineering regardless. They all share a shape: classify how bad a failure would be, and let that classification decide how much rigour the development needs. IEC 61508 is the generic parent with SIL levels, ISO 26262 is the automotive adaptation with ASIL, 62304 is medical with classes A to C, DO-178C is airborne and is where MC/DC coverage comes from. What the level controls is not the code but the process and the evidence: requirements written and traced to tests, structural coverage rising from statement to branch to MC/DC, independence so the person verifying is not the author, a coding standard with recorded deviations, tool qualification, and configuration management strong enough to rebuild any released binary exactly. The recurring theme is that you have to demonstrate the software is right rather than believe it, which is why a project that did everything well but recorded nothing still fails an audit. On an unregulated product I would still borrow four of them, because they pay for themselves: written testable requirements, traceability read in the direction that finds promises nobody verifies, independence in review, and reproducible builds. And I would say that rigour should follow the consequence of failure, which is exactly what the classification schemes encode, so the first question is which kind of product this is."
}
},

{
id: "emb-config",
track: "Embedded C",
sub: "Process and safety",
title: "Configuration management: from a binary back to its source",
mins: 24,
body: `
<p>A customer sends you a device running firmware version 2.3.1 that is misbehaving. Can you
rebuild that exact binary today? If not, everything else about your process is
theoretical.</p>

<h3>Source alone does not determine the binary</h3>
<p>The same commit produces different machine code depending on:</p>
<ul>
<li>Compiler version and vendor.</li>
<li>Optimisation level and every other flag.</li>
<li>C library version.</li>
<li>Linker script and section placement.</li>
<li>Which third-party components, at which versions.</li>
<li>Build-time configuration: Kconfig options, defines, feature switches.</li>
</ul>
<p>So a release needs all of that pinned, not just tagged source. A container image, a lock file
or a documented toolchain version and checksum are all workable; the failure is having none of
them.</p>

<h3>What to archive with every release</h3>
<pre>the source, tagged                  and the tag pushed, not local
the exact toolchain identity        version and, ideally, a checksum
the build configuration             flags, defines, Kconfig
the ELF                             fault addresses decode against this only
the map file                        where the flash and RAM went
the binary or hex actually shipped
the SBOM                            components and versions
the test results for that build</pre>
<p>The ELF is the one people discard, and it is the one you need most. A fault address from the
field is a bare number without the symbols from that exact build, and decoding against a
slightly different binary produces a confident answer pointing at the wrong function.</p>

<h3>Put the identity in the binary</h3>
<p>The device should be able to tell you what it is running, without anyone consulting a
spreadsheet:</p>
<pre>typedef struct {
    char     version[16];      /* "2.3.1"                        */
    char     git_hash[12];     /* the commit, short form         */
    char     build_time[20];   /* ISO 8601                       */
    uint8_t  dirty;            /* was the tree modified?         */
    uint32_t hw_revision;      /* which board it was built for   */
} build_info_t;</pre>
<p>The <b>dirty</b> flag is worth the byte. A build made from a modified working tree cannot be
reproduced from the commit, and knowing that immediately saves a long investigation into why
the source does not match the behaviour.</p>
<p>Expose it over whatever diagnostic interface you have, and log it at every boot alongside the
reset reason.</p>

<h3>Version numbers that carry information</h3>
<p>Semantic versioning works for firmware with one adjustment: the compatibility that matters is
usually with the <b>protocol and the hardware</b> rather than with an API.</p>
<pre>2.3.1
| | +-- fixes only, no behaviour change
| +---- new features, still compatible with existing hosts
+------ breaking: needs a matching app, or a hardware revision</pre>
<p>The hardware compatibility part deserves its own field in the image header, so a build for
revision B refuses to run on revision A rather than half working. Half working is the dangerous
outcome, because it passes casual testing.</p>

<h3>Branching, kept boring</h3>
<p>For a small team, the arrangement that causes the least trouble is: a main branch that always
builds and passes tests, short-lived branches for changes, and a tag for every release.</p>
<p>The one firmware-specific addition is a <b>maintenance branch per released version</b>, because
you will need to ship a fix for 2.3 while 3.0 is in development, and a customer with certified
or validated equipment may not be able to take 3.0 at all.</p>

<h3>Reproducible builds, and why to care</h3>
<p>Ideally the same inputs give a byte-identical output. Timestamps and absolute paths embedded
by the compiler are the usual obstacles, and both have flags to control them.</p>
<p>It is worth the effort for two reasons beyond tidiness. It proves your pinning is complete,
because any drift shows up as a different binary. And in regulated or high-assurance work it
lets someone else verify that a binary corresponds to the source it claims.</p>

<h3>The test that tells you where you stand</h3>
<p>Take a release from a year ago. On a clean machine, with nothing from your laptop, rebuild it
and compare against the archived binary.</p>
<p>Most projects fail this the first time, and the failures are informative: an undeclared tool
dependency, a component pulled from a branch rather than a tag, a local file nobody knew was
required. Finding those now is much cheaper than finding them during an incident.</p>
`,
quiz: [
{ q: "Why is tagged source insufficient to reproduce a release?",
o: ["It is sufficient", "Compiler version, flags, library versions, linker script and component versions all change the binary", "Tags can be deleted", "Source changes over time"],
a: 1, why: "A release needs all of it pinned. A container image, a lock file, or a documented toolchain version and checksum all work; the failure is having none of them." },
{ q: "Which archived artefact do people most often discard and most need?",
o: ["The map file", "The ELF", "The source tag", "The test results"],
a: 1, why: "A fault address from the field is a bare number without the symbols from that exact build. Decoding against a slightly different binary gives a confident answer pointing at the wrong function." },
{ q: "Why include a 'dirty' flag in the build information?",
o: ["For statistics", "A build from a modified tree cannot be reproduced from the commit, and knowing that immediately saves a long investigation", "To detect tampering", "It is required by git"],
a: 1, why: "Otherwise you spend hours trying to work out why the source does not explain the behaviour, when the answer is that the binary was never built from that source." },
{ q: "What is the test that tells you where your configuration management really stands?",
o: ["A code review", "Rebuild a year-old release on a clean machine and compare against the archived binary", "Count the branches", "Check the tags exist"],
a: 1, why: "Most projects fail it the first time, and the failures are informative: an undeclared tool dependency, a component from a branch rather than a tag, a local file nobody knew was needed." }
],
interview: {
q: "A customer reports a fault on firmware from eighteen months ago. What do you need in place?",
a: "The first question is whether I can rebuild that exact binary, because if I cannot then nothing else I do is reliable. Tagged source is not enough on its own, since the compiler version, the flags, the C library, the linker script and every third-party component version all change the machine code, so all of that has to be pinned as part of the release rather than assumed. Then the archive: the ELF above everything, because a fault address from the field is a bare number without the symbols from that exact build and decoding against a slightly different binary gives you a confident answer pointing at the wrong function. Also the map file, the shipped binary, the build configuration, the SBOM and the test results for that build. On the device side I would want the firmware to be able to tell me what it is, so a build info structure with the version, the git hash, the build time and a dirty flag, exposed over a diagnostic command and logged at every boot with the reset reason. The dirty flag earns its byte, because a build from a modified tree cannot be reproduced from the commit and knowing that immediately saves hours. And the way to find out whether any of this actually works is to take a year-old release, rebuild it on a clean machine with nothing from my laptop, and compare. Most projects fail that the first time, and the failures are always things you want to know about before an incident rather than during one."
}
},

{
id: "emb-team",
track: "Embedded C",
sub: "Process and safety",
title: "Working on firmware with other people",
mins: 25,
body: `
<p>Most of what makes an engineer easy to work with is not technical. It is a set of habits about
communication, and they are learnable rather than innate.</p>

<h3>Make your work visible</h3>
<p>The most common complaint about an engineer is not that the work was poor, but that nobody
knew where it stood.</p>
<p>Short, regular, specific updates solve almost all of it:</p>
<pre>Bad : "Still working on the driver."
Good: "Driver reads the chip ID and configures correctly. The
       reset timeout path is not done. Blocked on whether we
       report a missing sensor as a fault or run degraded,
       which I need from product."</pre>
<p>The second one tells a reader what is finished, what is not, and what they can do about it.
Notice that it also asks a question, which is the part people skip.</p>

<h3>Ask early</h3>
<p>There is a widespread instinct that asking a question is an admission of not knowing. On a
team the calculation is the opposite: an hour of someone's time now against two days of your
time going the wrong way.</p>
<p>What makes a question easy to answer is showing what you tried. "The chip ID reads 0xFF. I
have checked the address is unshifted, the pull-ups are 4k7, and the analyser shows a NAK on
the address byte. Is there a reset line I am missing?" gets an answer in minutes.</p>

<h3>Small changes</h3>
<p>A 2,000-line change gets approved. A 200-line change gets read. If you want your work
reviewed properly, make it reviewable.</p>
<p>It also means a mistake is a small revert rather than an untangling, and that your work
integrates continuously rather than in one large collision at the end.</p>

<h3>Agree what "done" means, before starting</h3>
<p>Firmware has more ambiguity here than most software. Does done mean:</p>
<ul>
<li>It works on my bench, once?</li>
<li>It works on three boards, including the marginal one?</li>
<li>It has tests, and they run in CI?</li>
<li>It handles the error paths?</li>
<li>The documentation and the requirement are updated?</li>
<li>It has run overnight?</li>
</ul>
<p>Different people assume different answers, and the gap surfaces at the worst moment. A short
written definition, agreed once, removes an entire category of disagreement.</p>

<h3>Estimating, honestly</h3>
<p>Firmware estimates are hard because a large part of the work is discovery: you do not know
what the hardware does until you try it.</p>
<p>Two habits help more than any technique. Separate what you understand from what you do not,
and estimate them differently: "the driver is about two days; the bring-up on the new board I
genuinely cannot estimate until I have power on it, so give me half a day to find out."</p>
<p>And re-estimate out loud as soon as you learn something. An estimate that silently doubles is
a problem; one that is revised on day two with a reason is just information.</p>

<h3>Handover</h3>
<p>You will hand work over, or inherit it. What actually helps the next person:</p>
<ul>
<li>Where the non-obvious knowledge is: which register needs writing twice, which board has the
modification, which test fails for an unrelated reason.</li>
<li>What you would do next, and why.</li>
<li>What you tried that did not work, which is the part nobody writes down and everybody
repeats.</li>
</ul>
<p>That last one has disproportionate value. A paragraph of dead ends saves the next person a
week.</p>

<h3>Disagreeing well</h3>
<p>Argue about the consequence, not the preference, and be specific about what would change your
mind. "If the tests show the latency is under 50 microseconds either way, I will drop it" turns
a stand-off into an experiment.</p>
<p>And when a decision goes against you, say so plainly and commit to it. Continuing to relitigate
a settled decision is more damaging to a team than the decision usually is.</p>

<h3>The one that is hardest</h3>
<p>Saying you were wrong, early and without drama. "I was wrong about the interrupt priority,
that is the cause, here is the fix" costs a moment and buys a great deal of trust.</p>
<p>The alternative, defending a position after you know it is untenable, is expensive for
everyone and eventually obvious.</p>
`,
quiz: [
{ q: "What is the most common complaint about an engineer's work?",
o: ["It is too slow", "Nobody knew where it stood", "It is over-engineered", "It has bugs"],
a: 1, why: "Short, regular, specific updates solve almost all of it: what is finished, what is not, and what someone else can do about it. The part people skip is asking the question they are blocked on." },
{ q: "Why keep changes small?",
o: ["It is faster to type", "A 2,000-line change gets approved; a 200-line change gets read", "Compilers prefer it", "It uses less disk"],
a: 1, why: "It also means a mistake is a small revert rather than an untangling, and the work integrates continuously rather than colliding at the end." },
{ q: "Why agree a definition of done before starting?",
o: ["For metrics", "Different people assume different answers, and the gap surfaces at the worst moment", "It is required by Scrum", "To estimate better"],
a: 1, why: "Works on my bench once, works on three boards, has tests in CI, handles the error paths, documentation updated, ran overnight. A short written definition removes a whole category of disagreement." },
{ q: "What is the most valuable thing to include in a handover?",
o: ["A full architecture document", "What you tried that did not work", "The commit history", "Your contact details"],
a: 1, why: "It is the part nobody writes down and everybody repeats. A paragraph of dead ends saves the next person a week." }
],
interview: {
q: "You have mostly worked alone. How would you fit into a team?",
a: "I would be honest that it is the part I have had least practice at, and then say what I would actually do, because I think most of it is habits rather than talent. The first is making my work visible, since the most common complaint about an engineer is not that the work was poor but that nobody knew where it stood. So short specific updates: what is finished, what is not, and what someone else can do about it, including the question I am blocked on rather than sitting on it. The second is asking early, because the calculation on a team is an hour of someone's time against two days of mine going the wrong way, and I would make the question easy to answer by showing what I had already tried and ruled out. Third, small changes, because a two thousand line change gets approved and a two hundred line change gets read, and if I want my work reviewed properly I have to make it reviewable. Fourth, agreeing what done means before starting, because firmware is particularly ambiguous there: works on my bench once, works on three boards, has tests in CI, handles the error paths. On estimating I would separate what I understand from what is genuinely discovery, estimate those differently, and re-estimate out loud as soon as I learn something, because an estimate that silently doubles is a problem while one revised on day two with a reason is just information. And the habit I would most want to hold onto is saying I was wrong early and without drama, because defending a position after you know it is untenable is expensive for everyone and eventually obvious anyway."
}
},

{
id: "emb-postmortem",
track: "Embedded C",
sub: "Process and safety",
title: "When it goes wrong in the field",
mins: 24,
body: `
<p>Something will fail in the field. What separates teams is not whether it happens, but what
happens next.</p>

<h3>Stabilise before you understand</h3>
<p>The instinct is to find the root cause first. The right order is usually to stop the harm
first, then investigate:</p>
<ol>
<li><b>Contain.</b> Halt the rollout, disable the feature, revert to the previous version.</li>
<li><b>Assess.</b> How many units, which ones, what is the actual impact?</li>
<li><b>Communicate.</b> Tell whoever needs to know, before they find out another way.</li>
<li><b>Diagnose.</b> Now find out why.</li>
<li><b>Fix and verify.</b></li>
<li><b>Prevent.</b> What allowed this to reach the field?</li>
</ol>
<p>Step 3 is the one engineers skip and the one that does the most damage when it is missed.
A known problem communicated early is a manageable situation; the same problem discovered by a
customer is a different conversation entirely.</p>

<h3>Preserve the evidence</h3>
<p>The first instinct on a returned unit is to power it up and see what it does. That can
destroy exactly what you need.</p>
<p>Before changing anything, capture: the reset reason, any crash record in retained RAM, the
firmware version and build hash, logs, and the calibration and configuration as they currently
are. Photograph the installation if it is on site.</p>
<p>A unit that has been reflashed to "see if that fixes it" is a unit that can no longer tell you
what went wrong, and there is often only one.</p>

<h3>Reproduce before you fix</h3>
<p>Without a reliable reproduction you cannot distinguish a fix from a coincidence, and many
changes alter timing incidentally, so a race can be suppressed without being fixed and returns
when something else changes.</p>
<p>The technique is to raise the rate: faster bus, higher sample rate, shorter timeouts, more
load, longer cable, temperature extremes. If it is a race or a resource limit, that turns a
weekly failure into a per-minute one.</p>
<p>Being able to say "it happened every twenty minutes before the change and has not happened in
forty-eight hours since" is evidence. "We changed something and it seems better" is not.</p>

<h3>Root cause means going past the first answer</h3>
<p>The first cause you find is usually a symptom of something else. The habit is to keep asking
why:</p>
<pre>The device locked up.
  Why? The watchdog fired and the reset loop repeated.
  Why? A task blocked forever on a semaphore.
  Why? An ISR took the semaphore instead of the FromISR variant.
  Why? Nobody knew that mattered; it works most of the time.
  Why? No review checklist for interrupt-context API use, and
       configASSERT was not enabled in the release build.</pre>
<p>The first answer produces "fix the semaphore call". The last two produce "enable configASSERT
in all builds" and "add interrupt-context checks to the review list", which prevent the next
one as well as this one.</p>
<p>Stop when you reach something you can actually change.</p>

<h3>Blameless, and why that is practical rather than kind</h3>
<p>If the outcome of an incident is that someone is blamed, the next incident is reported later
or not at all, and the information you need dries up.</p>
<p>The productive assumption is that a person making a mistake is a given, so the question is what
allowed the mistake to reach the field. That points at the missing test, the missing check, the
missing review item, all of which you can fix. "Be more careful" is not a corrective action.</p>

<h3>Write it down and actually do the actions</h3>
<p>A short record: what happened, the timeline, the impact, the root cause, what was done, and
the corrective actions with an owner and a date.</p>
<p>The corrective actions are the entire point and the part most often abandoned. An incident
report that produces no change is a document, not a process, and the same failure will
recur.</p>

<h3>Build the diagnosability in beforehand</h3>
<p>Everything above is far easier when the device was designed to be diagnosed. In practice
that means, at minimum:</p>
<ul>
<li>Reset reason, firmware version and build hash logged at every boot.</li>
<li>A crash record in RAM that survives a reset, reported on the next start.</li>
<li>Counters for anything the firmware silently recovers from: retries, CRC failures, timeouts,
buffer overruns.</li>
<li>A diagnostic command that dumps all of it in one go.</li>
</ul>
<p>None of it is expensive, and it is the difference between a customer report you can act on
and one you can only speculate about.</p>
`,
quiz: [
{ q: "Which incident step do engineers most often skip?",
o: ["Diagnose", "Communicate", "Contain", "Fix"],
a: 1, why: "A known problem communicated early is a manageable situation. The same problem discovered by a customer is a different conversation entirely, and the technical facts have not changed." },
{ q: "Why not power up a returned unit immediately?",
o: ["It might be damaged", "It can destroy the evidence: the crash record, the reset reason, the configuration as it was", "It voids the warranty", "It takes too long"],
a: 1, why: "A unit reflashed to see if that fixes it can no longer tell you what went wrong, and there is often only one." },
{ q: "Why reproduce a fault before fixing it?",
o: ["To confirm the report", "Without it you cannot distinguish a fix from a coincidence", "For the incident report", "To measure impact"],
a: 1, why: "Many changes alter timing incidentally, so a race can be suppressed without being fixed and returns when something else changes. Raise the rate to make it reproducible first." },
{ q: "Why is a blameless postmortem practical rather than merely kind?",
o: ["It is not, accountability matters", "If people are blamed, the next incident is reported later or not at all", "It is faster", "It satisfies auditors"],
a: 1, why: "The productive question is what allowed the mistake to reach the field, which points at a missing test, check or review item. 'Be more careful' is not a corrective action." }
],
interview: {
q: "A customer reports that units in the field are locking up. Walk me through what you do.",
a: "I would stabilise before trying to understand, because the instinct to go straight for root cause usually makes the situation worse. So contain first: halt any rollout, disable the feature if we can, get people onto a version we know behaves. Then assess how many units and what the actual impact is, and then communicate, which is the step engineers skip and the one that does the most damage when it is missed, because a known problem communicated early is manageable and the same problem discovered by the customer is a completely different conversation. Only then diagnose. On the technical side the first thing is to preserve evidence, because there is often only one returned unit and powering it up or reflashing it destroys exactly what I need: the reset reason, any crash record in retained RAM, the firmware version and build hash, the configuration as it actually is. Then I would try to reproduce it before fixing anything, by raising the rate, shorter timeouts, more load, temperature extremes, because without a reliable reproduction I cannot tell a fix from a coincidence, and a timing change can suppress a race without fixing it. For root cause I would keep asking why past the first answer, because the first answer is usually a symptom: a task blocked forever, because an ISR used the blocking API rather than the FromISR variant, because nobody knew it mattered, because there was no review item for interrupt-context calls and configASSERT was not enabled in release builds. The last two are the ones that prevent the next incident as well as this one. And I would keep it blameless, not out of niceness but because if people get blamed the next problem gets reported later or not at all."
}
}

);
