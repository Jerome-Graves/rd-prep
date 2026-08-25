// Embedded C track, batch 8: connectivity from the firmware side.
// Electronics covers the electrical layer and Robotics the system trade-offs;
// this batch is what the firmware has to configure, budget and get wrong.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-usb",
track: "Embedded C",
sub: "Connectivity",
title: "USB device firmware: descriptors, endpoints and enumeration",
mins: 26,
body: `
<p>USB is the one interface where the host is entirely in charge and your device only answers
questions. Almost every bring-up failure is a wrong answer to one of those questions.</p>

<h3>Enumeration, in the order it happens</h3>
<ol>
<li>You connect a pull-up to D+ (full speed) or D- (low speed). That is the device saying it
exists, and it is under firmware control on most parts.</li>
<li>The host resets the bus and addresses the device as 0.</li>
<li>It asks for the first 8 bytes of the device descriptor, to learn the control endpoint's
maximum packet size.</li>
<li>It assigns an address and asks for the full descriptor set.</li>
<li>It reads the configuration descriptor, which arrives as one blob containing the interface
and endpoint descriptors nested inside it.</li>
<li>It picks a driver by class or by VID and PID, then sets the configuration.</li>
</ol>
<p>Every one of those is a control transfer on endpoint 0, and every one has a timeout. A
device that is slow to answer, or answers wrongly, is simply not enumerated, and Windows shows
it as an unknown device with no clue as to why.</p>

<h3>The descriptor that catches everyone</h3>
<p>The configuration descriptor's <code>wTotalLength</code> is the length of the whole
concatenated blob, not of the configuration descriptor alone. Get it wrong and the host either
truncates the set, so your endpoints never appear, or reads past the end.</p>
<pre>/* config + interface + two endpoints */
9 + 9 + 7 + 7 = 32      &lt;-- wTotalLength, not 9</pre>
<p>Along with it: <code>bNumInterfaces</code>, <code>bMaxPower</code> in 2 mA units rather than
milliamps, and every descriptor's own <code>bLength</code>. All of them are silent when
wrong.</p>

<h3>Endpoint types, and choosing one</h3>
<ul>
<li><b>Control.</b> Endpoint 0 only. Setup, data and status stages. Guaranteed delivery,
guaranteed a share of bandwidth.</li>
<li><b>Bulk.</b> Guaranteed delivery with retries, no guaranteed latency. Gets whatever
bandwidth is left over, which on an idle bus is a lot. The right choice for bulk data
transfer.</li>
<li><b>Interrupt.</b> A guaranteed maximum polling interval, so bounded latency, but small
packets. Despite the name, the host polls: nothing is ever asynchronous from the device.</li>
<li><b>Isochronous.</b> Guaranteed bandwidth, no retries, so lost data stays lost. Audio and
video only.</li>
</ul>
<p>At full speed, 12 Mbit/s, an interrupt endpoint polls at most once per millisecond with up
to 64 bytes, so 64 kB/s. That number decides whether HID is viable for your application before
you write anything.</p>

<h3>The zero-length packet</h3>
<p>A transfer ends when the host receives a packet shorter than <code>wMaxPacketSize</code>. So
if your transfer is an exact multiple of the packet size, you must send an explicit
zero-length packet to terminate it.</p>
<p>Miss this and the symptom is precise and baffling: everything works except transfers of
exactly 64, 128 or 192 bytes, which hang until the host times out. It is worth knowing by name
because the reproduction is so specific.</p>

<h3>Choosing a class</h3>
<p><b>CDC-ACM</b> gives a virtual COM port. Familiar, and on older Windows it wanted an INF
file. Two interfaces and an interrupt endpoint you never use, which is fiddly to describe.</p>
<p><b>HID</b> needs no driver anywhere, which is its whole appeal, but it is interrupt-only and
therefore slow, and the report descriptor is its own small language that is easy to get
wrong.</p>
<p><b>Vendor-specific with WinUSB descriptors</b> is usually the right answer for a custom
application. Microsoft OS descriptors let the device tell Windows to bind WinUSB automatically,
so you get bulk endpoints, no INF file, and libusb on the host.</p>

<h3>Faults, in the order you meet them</h3>
<ol>
<li><b>Nothing happens at all.</b> The pull-up is not connected, the USB clock is wrong (it
must be 48 MHz and accurate; a bare internal RC is usually not good enough), or the peripheral
clock is off.</li>
<li><b>Unknown device.</b> A descriptor is malformed. Check every bLength and wTotalLength
first.</li>
<li><b>Enumerates then disappears.</b> Usually a control transfer that is not answered, or an
unhandled standard request.</li>
<li><b>Works then stalls under load.</b> Buffers not double-buffered, or the handler taking too
long and missing the next packet.</li>
<li><b>Only exact multiples of 64 fail.</b> The missing zero-length packet.</li>
</ol>
<p>A protocol analyser, or Wireshark with USBPcap, shows you the actual exchange and turns most
of these from guesswork into reading.</p>
`,
quiz: [
{ q: "Transfers work except those of exactly 64, 128 or 192 bytes, which hang. What is missing?",
o: ["A larger buffer", "A zero-length packet to terminate the transfer", "Double buffering", "A different endpoint type"],
a: 1, why: "A transfer ends when the host receives a packet shorter than wMaxPacketSize. An exact multiple never produces one, so an explicit zero-length packet is required to terminate it." },
{ q: "What does wTotalLength in a configuration descriptor cover?",
o: ["Just the configuration descriptor", "The whole concatenated blob including interface and endpoint descriptors", "The largest endpoint", "The number of interfaces"],
a: 1, why: "Get it wrong and the host truncates the set, so your endpoints never appear, or reads past the end. It is silent when wrong, which is why it is worth checking first when a device enumerates as unknown." },
{ q: "Which endpoint type guarantees bandwidth but never retries?",
o: ["Bulk", "Isochronous", "Interrupt", "Control"],
a: 1, why: "Lost data stays lost, which is correct for audio and video where a late packet is worse than a missing one. Bulk guarantees delivery but not latency; interrupt guarantees a maximum poll interval but small packets." },
{ q: "Why is HID appealing despite being slow?",
o: ["It has the largest packets", "It needs no driver installation on any host", "It guarantees latency", "It supports bulk transfers"],
a: 1, why: "That is its entire selling point. The cost is that it is interrupt-only, so at full speed you get at most 64 bytes per millisecond, and the report descriptor is its own small language." }
],
interview: {
q: "Your USB device enumerates as an unknown device on Windows. How do you debug it?",
a: "I would work from the bottom up because the failure modes are layered. First, is anything happening at all: the D plus pull-up has to be connected, and on many parts that is under firmware control, and the USB clock has to be 48 megahertz and accurate, because a bare internal RC oscillator usually is not good enough and the symptom is silence. If the host is at least trying, then it is a descriptor problem, and I would check every bLength and the configuration descriptor's wTotalLength first, because wTotalLength covers the whole concatenated blob rather than just the configuration descriptor and getting it wrong is completely silent: the host truncates the set and your endpoints never appear. Then bMaxPower, which is in two milliamp units rather than milliamps, and bNumInterfaces. If the descriptors are right I would put a protocol analyser on it, or Wireshark with USBPcap, because that shows the actual control transfers and turns the whole thing from guesswork into reading which request went unanswered. The other class of fault I would keep in mind is timing: every control transfer has a timeout, so a device that is slow to respond because it is doing work in the setup handler simply fails to enumerate with no diagnostic."
}
},

{
id: "emb-ble",
track: "Embedded C",
sub: "Connectivity",
title: "BLE: GATT, and the numbers that decide throughput",
mins: 27,
body: `
<p>BLE is straightforward to get working and hard to get fast, because the throughput is set by
a handful of connection parameters that are easy to leave at their defaults.</p>

<h3>The two layers you actually touch</h3>
<p><b>GAP</b> is discovery and connection: who advertises, who scans, who connects. Your device
is usually the peripheral, advertising and accepting a connection from a central.</p>
<p><b>GATT</b> is the data model once connected. A hierarchy of services containing
characteristics, each with a UUID, a value and properties: read, write, notify, indicate.</p>
<p>Everything you expose is a characteristic. The design question is how to map your data onto
them, and the usual mistake is one characteristic per value, which costs a round trip each.</p>

<h3>Notify against indicate</h3>
<p>Both push data from peripheral to central without a read request. The difference is
acknowledgement:</p>
<ul>
<li><b>Notify</b> is unacknowledged at the ATT layer. You can send several per connection
event.</li>
<li><b>Indicate</b> is acknowledged, and only <b>one can be outstanding at a time</b>, so each
one costs a full round trip.</li>
</ul>
<p>That makes indicate roughly an order of magnitude slower for streaming. Use it when the
application genuinely needs confirmation of each item. Use notify for anything continuous, and
put sequence numbers in the payload if you need to detect loss, which the link layer's own
retransmission makes rare anyway.</p>

<h3>The throughput arithmetic</h3>
<p>Three numbers decide it:</p>
<pre>throughput ~ (packets per event x payload bytes) / connection interval</pre>
<ul>
<li><b>Connection interval.</b> 7.5 ms minimum, up to 4 seconds. This is the big one: at 7.5 ms
you get 133 opportunities per second, at 100 ms you get 10.</li>
<li><b>ATT MTU.</b> Defaults to 23 bytes, of which 3 are ATT overhead, leaving <b>20 bytes of
payload</b>. Negotiating it up to 247 gives 244 bytes, more than twelve times as much per
packet.</li>
<li><b>Packets per connection event.</b> Modern stacks send several, but only if both sides
allow it and there is data queued in time.</li>
</ul>
<p>The single most common reason a BLE link is slow is that <b>nobody exchanged the MTU</b>, so
every notification carries 20 bytes. Requesting a larger MTU on connection is a few lines and
often the largest single improvement available.</p>
<p>Data Length Extension is the link-layer counterpart, raising the radio payload from 27 to
251 bytes. MTU without DLE means your large ATT packet is fragmented across several link-layer
packets, so you want both.</p>

<h3>Latency and power pull the other way</h3>
<p>A 7.5 ms interval means the radio wakes 133 times a second whether or not there is data, and
on a coin cell that dominates the budget. <b>Slave latency</b> is the escape: it lets the
peripheral skip up to N connection events when it has nothing to send, so you get the low
latency of a short interval when active and the power of a long one when idle.</p>
<p><b>Supervision timeout</b> must exceed the interval times slave latency plus one, or the
connection drops the moment the peripheral exercises its latency allowance. Getting that
relationship wrong produces a link that disconnects only when idle, which is a confusing
symptom.</p>

<h3>Who is in charge</h3>
<p>The peripheral <b>requests</b> connection parameters; the central decides. Phones in
particular have their own policies and may ignore you or impose limits, and iOS and Android
differ. So parameters are a negotiation, and firmware has to work acceptably with whatever it
is given rather than assume its request was granted.</p>

<h3>The firmware shape</h3>
<p>The stack owns the radio timing, and your code runs in callbacks between connection events.
Two consequences worth designing around:</p>
<ul>
<li><b>Never block in a callback.</b> Missing a connection event costs you an entire interval
of throughput, and blocking long enough can drop the link.</li>
<li><b>Decouple producing from sending.</b> Put samples in a queue and let a separate context
drain it into notifications as buffers become available, rather than trying to send at the
moment data is produced. Throughput then survives a temporarily busy radio, and the sender
naturally batches.</li>
</ul>
`,
quiz: [
{ q: "A BLE link is much slower than expected. What is the first thing to check?",
o: ["The advertising interval", "Whether the ATT MTU was negotiated up from the default 23", "The transmit power", "The service UUID"],
a: 1, why: "The default leaves 20 bytes of payload per notification. Negotiating to 247 gives 244, more than twelve times as much per packet, and it is a few lines of code. It is the most common single cause of a slow link." },
{ q: "Why is indicate much slower than notify for streaming?",
o: ["It uses smaller packets", "It is acknowledged and only one can be outstanding at a time", "It needs a larger MTU", "It cannot be used with DLE"],
a: 1, why: "Each indication costs a full round trip before the next can be sent. Notify is unacknowledged at the ATT layer, so several can go out in one connection event." },
{ q: "What does slave latency allow?",
o: ["A longer MTU", "The peripheral to skip connection events when it has nothing to send", "Faster advertising", "More characteristics"],
a: 1, why: "It gives the low latency of a short interval when active and the power of a long one when idle. The supervision timeout must exceed interval times latency plus one, or the link drops exactly when it goes idle." },
{ q: "Who decides the final connection parameters?",
o: ["The peripheral", "The central", "They are fixed by the specification", "Whichever asks first"],
a: 1, why: "The peripheral requests and the central decides, and phones have their own policies that differ between iOS and Android. Firmware has to work acceptably with what it is given rather than assume its request was granted." }
],
interview: {
q: "You need to stream sensor data over BLE and it is not fast enough. Talk me through it.",
a: "I would start with the arithmetic rather than with the code, because throughput is roughly packets per connection event times payload divided by the interval, and that tells you which knob is worth turning. The first thing I would check is the ATT MTU, because the default is 23 bytes with 3 of ATT overhead, so 20 bytes of payload, and negotiating up to 247 gives 244. That alone is more than a twelvefold improvement per packet and it is a few lines on connection. I would pair it with data length extension, because raising the ATT MTU without it just means your large packet is fragmented across several link-layer packets. Then the connection interval: 7.5 milliseconds gives 133 opportunities a second against 10 at 100 milliseconds, but I would be clear that the peripheral only requests and the central decides, and phones have their own policies that differ between iOS and Android, so I would design to work acceptably with whatever I am given. On the power side I would use slave latency rather than a long interval, so the link is responsive when there is data and cheap when there is not, and I would check that the supervision timeout exceeds interval times latency plus one, because otherwise the link drops precisely when it goes idle. Structurally I would decouple producing from sending: samples go into a queue and a separate context drains it into notifications as buffers free up, rather than trying to send at the moment of production, and I would use notify rather than indicate because an indication allows only one outstanding at a time and costs a round trip each."
}
},

{
id: "emb-can",
track: "Embedded C",
sub: "Connectivity",
title: "CAN from firmware: filters, mailboxes and bus-off",
mins: 25,
body: `
<p>The Electronics track covers the electrical layer and what arbitration looks like on a
scope. This is what the firmware has to configure and handle.</p>

<h3>Arbitration, because everything follows from it</h3>
<p>CAN is a wired-AND bus: a dominant 0 always overrides a recessive 1. Every transmitter
watches the bus while sending, and a node that sends a 1 and reads back a 0 knows it has lost
and stops immediately.</p>

<svg class="fig" viewBox="0 0 680 410" role="img" aria-label="CAN arbitration: three nodes transmit identifier bits simultaneously and the lowest identifier wins without any retransmission">
<text class="ts" x="205" y="78" text-anchor="middle">bit 1</text>
<text class="ts" x="275" y="78" text-anchor="middle">bit 2</text>
<text class="ts" x="345" y="78" text-anchor="middle">bit 3</text>
<text class="ts" x="415" y="78" text-anchor="middle">bit 4</text>
<text class="ts" x="485" y="78" text-anchor="middle">bit 5</text>
<text class="ts" x="555" y="78" text-anchor="middle">bit 6</text>
<line class="guide" x1="275" y1="84" x2="275" y2="322"/>
<line class="guide" x1="485" y1="84" x2="485" y2="322"/>
<rect class="bx" x="40" y="90" width="130" height="48" rx="4"/>
<text class="th" x="56" y="112">Node A</text>
<text class="ts" x="56" y="130">loses bit 5</text>
<text class="th" x="205" y="118" text-anchor="middle">0</text>
<text class="th" x="275" y="118" text-anchor="middle">0</text>
<text class="th" x="345" y="118" text-anchor="middle">1</text>
<text class="th" x="415" y="118" text-anchor="middle">0</text>
<text class="th" x="485" y="118" text-anchor="middle">1</text>
<text class="ts" x="555" y="118" text-anchor="middle">stops</text>
<rect class="bx" x="40" y="146" width="130" height="48" rx="4"/>
<text class="th" x="56" y="168">Node B</text>
<text class="ts" x="56" y="186">loses bit 2</text>
<text class="th" x="205" y="174" text-anchor="middle">0</text>
<text class="th" x="275" y="174" text-anchor="middle">1</text>
<text class="ts" x="345" y="174" text-anchor="middle">stops</text>
<rect class="bxa" x="40" y="202" width="130" height="48" rx="4"/>
<text class="th" x="56" y="224">Node C</text>
<text class="ts" x="56" y="242">wins</text>
<text class="th" x="205" y="230" text-anchor="middle">0</text>
<text class="th" x="275" y="230" text-anchor="middle">0</text>
<text class="th" x="345" y="230" text-anchor="middle">1</text>
<text class="th" x="415" y="230" text-anchor="middle">0</text>
<text class="th" x="485" y="230" text-anchor="middle">0</text>
<text class="th" x="555" y="230" text-anchor="middle">0</text>
<rect class="bx" x="40" y="266" width="130" height="48" rx="4"/>
<text class="th" x="56" y="288">Bus</text>
<text class="ts" x="56" y="306">wired AND</text>
<text class="th" x="205" y="294" text-anchor="middle">0</text>
<text class="th" x="275" y="294" text-anchor="middle">0</text>
<text class="th" x="345" y="294" text-anchor="middle">1</text>
<text class="th" x="415" y="294" text-anchor="middle">0</text>
<text class="th" x="485" y="294" text-anchor="middle">0</text>
<text class="th" x="555" y="294" text-anchor="middle">0</text>
<rect class="bx" x="40" y="336" width="290" height="54" rx="4"/>
<text class="th" x="56" y="360">0 is dominant</text>
<text class="ts" x="56" y="378">any node sending 0 wins the bit</text>
<rect class="bx" x="350" y="336" width="290" height="54" rx="4"/>
<text class="th" x="366" y="360">Nothing is retransmitted</text>
<text class="ts" x="366" y="378">the winner never even pauses</text>
</svg>
<p class="figcap">Losers drop out silently and retry later. The winner's message is unaffected,
which is why CAN's arbitration is called non-destructive and why the identifier is a
priority.</p>

<p><b>The firmware consequence:</b> the identifier <b>is</b> the priority, so identifier
allocation is a system design decision, not an arbitrary numbering. Give the safety-critical
message a low identifier and it wins every time.</p>

<h3>Filters, and why they matter more than they look</h3>
<p>Every node sees every message. Without hardware filtering, a busy bus interrupts your CPU
for traffic it will immediately discard, and at 500 kbit/s that can be thousands of interrupts
a second.</p>
<p>The controller provides mask-and-match filters: an identifier passes if
<code>(id &amp; mask) == (match &amp; mask)</code>. Group your identifiers so a single filter
accepts everything you care about, which usually means putting related messages in a
contiguous block rather than scattering them.</p>

<h3>The transmit mailbox trap</h3>
<p>Most controllers have three transmit mailboxes. If they transmit in mailbox order rather
than by identifier priority, a low-priority message loaded first goes out before a
high-priority one loaded afterwards. That is a priority inversion in your own hardware, before
the bus arbitration ever happens.</p>
<p>Many parts have a bit to select priority-by-identifier instead of by mailbox order. Set it,
or manage the mailboxes yourself, or accept that your priority scheme stops at the edge of your
own node.</p>

<h3>Error states, and bus-off</h3>
<p>Each node keeps a transmit and a receive error counter, and moves between three states:</p>
<ul>
<li><b>Error active.</b> Normal. Signals errors assertively.</li>
<li><b>Error passive</b> at a counter above 127. Still communicating, but signals errors
quietly so a failing node cannot dominate the bus.</li>
<li><b>Bus off</b> at a transmit counter above 255. The node disconnects itself entirely.</li>
</ul>
<p>Bus-off is a designed behaviour rather than a fault: a node with a broken transceiver would
otherwise destroy the bus for everyone. Firmware must <b>detect and recover</b> from it,
usually after 128 occurrences of 11 recessive bits, and must <b>count</b> it, because a node
that goes bus-off once a day is telling you about a wiring or termination problem long before
it fails completely.</p>

<h3>Bit timing</h3>
<p>The bit is divided into segments and the controller samples at a configured point, typically
75 to 87.5 per cent through it. All nodes must agree on the rate and, near enough, the sample
point.</p>
<p>The classic symptom of a bad sample point is a bus that works on the bench with a short
cable and fails as the harness gets longer, because propagation delay eats the margin. If a
network works at 125 kbit/s and not at 500, suspect timing and termination before anything in
the software.</p>
`,
quiz: [
{ q: "Two nodes transmit simultaneously. What happens to the one that loses arbitration?",
o: ["Both messages are destroyed", "It stops and retries later; the winner's message is unaffected", "It corrupts the winner", "The bus resets"],
a: 1, why: "A node that sends a recessive 1 and reads back a dominant 0 knows it lost and stops immediately. Arbitration is non-destructive, which is why the identifier is effectively a priority." },
{ q: "Why does hardware filter configuration matter on CAN?",
o: ["It saves bus bandwidth", "Every node sees every message, so without filtering the CPU is interrupted for traffic it will discard", "It sets the priority", "It is required by the standard"],
a: 1, why: "At 500 kbit/s that can be thousands of interrupts a second for messages you throw away. Group related identifiers into a contiguous block so one mask-and-match filter accepts them all." },
{ q: "What is bus-off?",
o: ["A wiring fault", "A node disconnecting itself after its transmit error counter exceeds 255", "The bus idle state", "A low-power mode"],
a: 1, why: "It is designed behaviour, not a defect: a node with a broken transceiver would otherwise destroy the bus for everyone. Firmware must detect it, recover, and count it, because occasional bus-off indicates a wiring or termination problem." },
{ q: "A CAN network works at 125 kbit/s and fails at 500 kbit/s. What do you suspect first?",
o: ["Software bugs", "Bit timing and termination", "Filter configuration", "Mailbox priority"],
a: 1, why: "Higher rates leave less margin for propagation delay, so a marginal sample point or missing termination shows up as a rate-dependent failure. Suspect the physical layer before anything in software." }
],
interview: {
q: "You are adding a node to an existing CAN bus. What do you need to establish before writing code?",
a: "The physical and timing agreements first, because getting those wrong produces failures that look like software. The bit rate and, importantly, the sample point, because all nodes have to agree closely enough and a marginal sample point produces a bus that works on a short bench harness and fails as the cable gets longer. Termination, one hundred and twenty ohms at each end and only at the ends. Then the identifier allocation, which is a system design decision rather than arbitrary numbering, because on CAN the identifier is the priority: arbitration is non-destructive and the lowest identifier always wins, so anything safety-critical needs a low identifier. I would also want the message catalogue, meaning which identifiers carry what, at what rate, and in what byte layout, because that is what my filters and my parsing are built on. In the firmware I would set up hardware filters to accept only what I care about, since every node sees every message and on a busy bus that is thousands of pointless interrupts a second. I would check whether the controller transmits by mailbox order or by identifier priority, because mailbox order gives you a priority inversion inside your own node before the bus arbitration even happens. And I would handle bus-off explicitly: detect it, recover, and count it, because a node that goes bus-off occasionally is telling you about a wiring problem well before it fails completely."
}
},

{
id: "emb-net",
track: "Embedded C",
sub: "Connectivity",
title: "IP networking on a microcontroller",
mins: 25,
body: `
<p>A TCP/IP stack on a part with 128 kB of RAM behaves differently from one on a laptop, and
nearly all of the differences come back to memory.</p>

<h3>The three APIs lwIP gives you</h3>
<ul>
<li><b>Raw, or callback, API.</b> Runs in the stack's own context, no threads, no copies, the
lowest memory footprint and the highest throughput. Your code is a set of callbacks and you
must never block in them.</li>
<li><b>Netconn.</b> A sequential API requiring an RTOS. More convenient, one copy, one thread
per connection.</li>
<li><b>Sockets.</b> BSD-compatible, so ported code works unchanged. The most convenient and the
most expensive: a thread with a real stack per connection, plus copies.</li>
</ul>
<p>The socket API is the default choice for people arriving from Linux, and it is usually the
wrong one on a small part. Each blocking accept needs its own thread, and thread stacks are
where your RAM goes.</p>

<h3>Buffers are the real constraint</h3>
<p>Packets live in pbufs, allocated from a fixed pool sized at build time. Under load the pool
empties, and then the stack silently drops packets. TCP recovers by retransmitting, so the
symptom is not an error but a <b>collapse in throughput</b> that looks like a network problem
rather than a configuration one.</p>
<p>The numbers that matter are the pool size, the TCP window, and how promptly your application
frees the pbufs it was handed. An application that holds a received pbuf while doing slow work
is consuming the resource the stack needs to receive the next packet.</p>

<h3>TCP or UDP</h3>
<p>TCP gives you ordering, retransmission and flow control, and costs a connection state block
per connection, buffers for unacknowledged data, and timers.</p>
<p>UDP costs almost nothing and gives you none of that. For periodic telemetry where a lost
sample is irrelevant and the next one is along shortly, UDP is often the better engineering
answer, and it avoids the situation where a stalled TCP connection blocks a device that had
nothing important to say.</p>
<p>The middle path that gets forgotten: UDP with your own sequence numbers and an
application-level acknowledgement only for the messages that matter.</p>

<h3>Two interactions that bite</h3>
<p><b>Nagle and delayed ACK.</b> Nagle holds a small send until the previous data is
acknowledged; delayed ACK holds the acknowledgement for up to 200 ms hoping to piggyback it.
Put them together with a request-response protocol that sends a small request and waits, and
you get a reliable 200 ms stall per exchange. Disabling Nagle with <code>TCP_NODELAY</code> on
a request-response link is usually correct.</p>
<p><b>Checksum offload.</b> If the MAC computes checksums in hardware, the stack must be told
not to, and vice versa. Getting it wrong gives you packets that the other end silently
discards, which looks like a connectivity fault with no errors reported anywhere.</p>

<h3>Bring-up order</h3>
<ol>
<li><b>Link.</b> Does the PHY report link up, at the negotiated speed and duplex? A duplex
mismatch gives you a link that works at low rates and collapses under load.</li>
<li><b>MAC.</b> Can you see any frames at all? A packet counter is worth having before anything
else.</li>
<li><b>ARP.</b> Does the device answer an ARP request? That is the first sign the stack is
alive.</li>
<li><b>Ping.</b> ICMP echo proves IP end to end.</li>
<li><b>Your protocol.</b> Only now.</li>
</ol>
<p>Wireshark on the other end is the single most useful tool here, because it tells you whether
your packet left, whether it was malformed, and whether the reply came back, which separates
three quite different problems.</p>

<h3>The thing to say out loud</h3>
<p>A network stack is a large piece of third-party code with its own memory model, its own
threading assumptions and its own configuration surface. Most problems attributed to "the
network" are configuration: pool sizes, thread priorities, checksum offload, or an application
holding buffers too long.</p>
`,
quiz: [
{ q: "Throughput collapses under load with no errors reported. What is the likely cause on a small part?",
o: ["A cable fault", "The pbuf pool is exhausted, so packets are dropped and TCP retransmits", "The MTU is wrong", "DNS is failing"],
a: 1, why: "The pool is fixed at build time. When it empties the stack drops packets silently, and TCP's recovery turns that into a throughput collapse rather than an error. An application holding received buffers too long makes it worse." },
{ q: "Why is the BSD socket API often the wrong choice on a small microcontroller?",
o: ["It is not portable", "Each blocking connection needs its own thread, and thread stacks are where the RAM goes", "It does not support TCP", "It is slower to compile"],
a: 1, why: "It is the most convenient and the most expensive. lwIP's raw callback API runs in the stack's own context with no threads and no copies, at the cost of never being allowed to block." },
{ q: "A request-response protocol over TCP has a reliable 200 ms stall per exchange. What is happening?",
o: ["Packet loss", "Nagle interacting with delayed ACK", "A DNS timeout", "MTU fragmentation"],
a: 1, why: "Nagle holds the small send until the previous data is acknowledged, and delayed ACK holds that acknowledgement hoping to piggyback it. Disabling Nagle with TCP_NODELAY is usually correct for request-response." },
{ q: "When is UDP the better engineering choice on a constrained device?",
o: ["Never", "Periodic telemetry where a lost sample is irrelevant and the next one is along shortly", "File transfer", "Firmware update"],
a: 1, why: "It costs almost nothing in state or buffers, and it avoids a stalled TCP connection blocking a device that had nothing important to say. Add your own sequence numbers and acknowledge only the messages that matter." }
],
interview: {
q: "Ethernet on your board works, then throughput collapses when the traffic increases. Where do you look?",
a: "I would separate the physical layer from the stack configuration, because both produce load-dependent symptoms. On the physical side the classic is a duplex mismatch: the link works fine at low rates and collapses under load because collisions only start mattering when both directions are busy, so I would check what the PHY negotiated rather than what I expected. If the link is clean, then on a small part the usual answer is buffers. The pbuf pool is sized at build time, and when it empties the stack drops packets silently rather than reporting an error, and TCP's retransmission turns that into a throughput collapse that looks like a network fault. Two things make it worse: a pool that is simply too small for the window, and an application that holds received buffers while doing slow work, because it is consuming the resource the stack needs to receive the next packet. I would also check checksum offload, since if the MAC does checksums in hardware and the stack also does them, or neither does, the other end silently discards the packets and nothing anywhere reports an error. Throughout I would have Wireshark on the far end, because that separates three different problems: whether my packet left at all, whether it was malformed, and whether the reply came back."
}
},

{
id: "emb-protodesign",
track: "Embedded C",
sub: "Connectivity",
title: "Designing a protocol you have to live with",
mins: 24,
body: `
<p>A wire protocol outlives the code on both sides of it. These are the decisions that are
expensive to change later, in roughly the order they bite.</p>

<h3>Version first, and early in the frame</h3>
<p>Put a version or format field near the front, before anything variable, so a receiver can
decide whether it understands the frame without first parsing it.</p>
<p>Then decide, and write down, what a receiver does with a version it does not know: reject
with a clear error, or accept the fields it recognises. Deciding this before you need it is the
difference between a fleet you can upgrade incrementally and one you cannot.</p>

<h3>Choose the interaction shape deliberately</h3>
<ul>
<li><b>Request and response.</b> Simple, easy to test, and the round trip bounds your
throughput. Everything needs a correlation identifier if more than one can be outstanding.</li>
<li><b>Streaming.</b> The device pushes without being asked. Efficient, but now you need flow
control, or a slow consumer silently loses data.</li>
<li><b>Publish and subscribe.</b> The consumer says what it wants once. Good when several
things want the same data, more machinery than a small system needs.</li>
</ul>
<p>Mixing the first two is common and fine: request and response for control, streaming for
telemetry, on separate frame types.</p>

<h3>Retries force you to think about idempotency</h3>
<p>Any real link loses messages, so a sender retries. That means the receiver will sometimes see
the same command twice, and the protocol has to say what that means.</p>
<p><b>Read the temperature</b> is naturally idempotent: doing it twice is harmless.
<b>Increment the counter</b> is not, and a retried request corrupts the state.</p>
<p>The fix is a sequence number the receiver remembers, so a repeat is recognised and
acknowledged without being executed again. Design commands to be idempotent where you can, and
where you cannot, say explicitly in the specification whether delivery is at-most-once or
at-least-once. Systems that never decide this end up being both, unpredictably.</p>

<h3>Fixed layout or tagged fields</h3>
<p><b>A fixed struct layout</b> is compact and trivial to parse. Adding a field is a breaking
change, which the version field then has to manage.</p>
<p><b>Type-length-value</b> costs a few bytes per field and lets a receiver skip fields it does
not recognise, so new fields are additive and old firmware keeps working. On a constrained link
that is often worth the overhead, and it is the difference between an upgrade path and a
flag day.</p>

<h3>The six things to write down</h3>
<p>Half the integration disputes on any project come from these being assumed rather than
stated:</p>
<ul>
<li>Byte order, explicitly, even if both ends are little-endian today.</li>
<li>The framing method, and how a receiver resynchronises after corruption.</li>
<li>The integrity check: which algorithm, and <b>which bytes it covers</b>.</li>
<li>Every timeout, and what happens when it expires.</li>
<li>The maximum frame size, so both ends can size buffers.</li>
<li>What an unknown message type, or an unknown version, does.</li>
</ul>
<p>Then add <b>one worked example frame in hex</b>, with its integrity field, and its
interpretation. That single example settles more arguments than any amount of prose, because it
is checkable.</p>

<h3>Design for the debugger</h3>
<p>Two cheap decisions that pay for themselves during integration:</p>
<ul>
<li><b>A sequence number in every frame</b>, so both ends can count what they missed rather than
guessing.</li>
<li><b>Counters exposed as a diagnostic message</b>: frames sent, received, CRC failures,
resynchronisations, timeouts. A link retrying constantly still works, right up until it does
not, and without counters nobody sees it coming.</li>
</ul>
`,
quiz: [
{ q: "Why does a version field belong near the front of a frame?",
o: ["Alignment", "So a receiver can decide whether it understands the frame before parsing anything variable", "It compresses better", "For the CRC"],
a: 1, why: "Put it after anything variable and a parser needs to understand the frame in order to find out whether it understands the frame. Decide in advance what an unknown version does, too." },
{ q: "A retried command increments a counter twice. What is the protocol missing?",
o: ["A CRC", "A sequence number so the receiver can recognise and discard a repeat", "A larger MTU", "Encryption"],
a: 1, why: "Any real link loses messages, so senders retry, so receivers see duplicates. Make commands idempotent where you can, and where you cannot, say explicitly whether delivery is at-most-once or at-least-once." },
{ q: "What does type-length-value buy you over a fixed struct layout?",
o: ["Smaller frames", "A receiver can skip fields it does not recognise, so new fields are additive", "Faster parsing", "Better error detection"],
a: 1, why: "It costs a few bytes per field and turns adding a field from a breaking change into an upgrade path, which matters when old firmware stays in the field." },
{ q: "Which integrity detail is most often left out of a protocol specification?",
o: ["The polynomial", "Exactly which bytes the check covers", "The field width", "The byte order of the CRC"],
a: 1, why: "Coverage is not part of the algorithm, so naming the CRC does not communicate it. Header included or not? Length field? A worked example frame in hex settles it permanently." }
],
interview: {
q: "You are defining a protocol between a device and a PC application written by someone else. What do you specify?",
a: "I would treat the specification as the deliverable rather than the code, because the protocol outlives both implementations. Six things get written down explicitly. Byte order, even if both ends are little-endian today. The framing method and how a receiver resynchronises after corruption, and I would prefer a delimiter-based scheme over a length prefix for exactly that reason, because a corrupted length leaves the receiver misaligned until a timeout. The integrity check, naming the algorithm and above all which bytes it covers, since coverage is not part of the algorithm and is the thing most often assumed. Every timeout and what happens when it expires. The maximum frame size so both ends can size buffers. And what an unknown message type or unknown version does. Then a version field near the front, before anything variable, so a receiver can decide whether it understands the frame without parsing it first. I would also think about retries up front, because any real link loses messages and the receiver will see duplicates, so commands should be idempotent where possible and carry a sequence number where they cannot be. And I would add one worked example frame in hex with its CRC, which settles more integration arguments than any amount of prose because it is checkable. Finally two things for the debugging phase: a sequence number in every frame, and a diagnostic message exposing counters for frames sent, received, CRC failures and timeouts, because a link that retries constantly looks healthy until it stops working."
}
},

{
id: "emb-ota",
track: "Embedded C",
sub: "Connectivity",
title: "Shipping firmware over a link",
mins: 24,
body: `
<p>The bootloader lesson covers A/B slots, verification and rollback. This is the transport
half: getting several hundred kilobytes across a link that will be interrupted.</p>

<h3>Do the arithmetic first</h3>
<p>It decides the design more than anything else:</p>
<pre>256 kB over BLE at 20-byte notifications, 7.5 ms interval, 1 packet/event
    = 2.6 kB/s  ->  about 100 seconds

same image at 244-byte MTU, several packets per event
    = tens of kB/s  ->  under 20 seconds</pre>
<p>A hundred seconds is a long time to hold a connection with a phone in someone's pocket, and
it is the number that tells you whether resume is optional or essential. Negotiating the MTU is
usually a bigger win than anything clever in the protocol.</p>

<h3>Chunking and flow control</h3>
<p>Send the image as numbered chunks. The receiver has to be able to say <b>slow down</b>,
because writing to flash is far slower than the link and a sender that ignores this simply
overruns the receive buffer.</p>
<p>The simplest scheme that works: a window of N chunks, acknowledged as a group. Stop-and-wait
per chunk is trivially correct and, on a link with any latency, unusably slow, because every
chunk costs a full round trip.</p>
<p>Note that flash erase blocks the receiving path on many parts, since code fetching from
flash stalls. So the receiver's timing is not uniform, and the flow control has to cope with a
periodic pause rather than a steady drain.</p>

<h3>Resume, and what it costs</h3>
<p>Any transfer long enough to matter will be interrupted. Resume means the receiver can report
how much it already has, and the sender continues from there.</p>
<p>Two things make it honest rather than a trap. The receiver must persist its progress
somewhere that survives a reset, not just in RAM. And the sender must verify that what the
receiver already holds is genuinely part of <b>this</b> image, usually by comparing a hash of
the received prefix or by tagging the transfer with the image's own identifier. Without that
check, resuming after the user picked a different firmware version produces a spliced image
that may still pass a whole-image check if you are unlucky with the design.</p>

<h3>Where integrity goes</h3>
<p>Two levels, and both earn their place:</p>
<ul>
<li><b>Per chunk.</b> A CRC on each chunk so a corrupted one is retransmitted immediately
rather than discovered at the end of a hundred-second transfer.</li>
<li><b>Whole image.</b> A hash or, better, a signature checked before the image is ever marked
bootable. This is the one that matters, and it belongs to the bootloader rather than to the
transport.</li>
</ul>
<p>Keep those separate in your head. Per-chunk integrity is about not wasting the transfer.
Whole-image verification is about not running the wrong code, and a CRC does not provide it,
because anyone who can modify the image can recompute a CRC.</p>

<h3>The order of operations</h3>
<ol>
<li>Receive into the inactive slot. The running image is never touched.</li>
<li>Verify the whole image where it now sits, in flash, not as it arrives.</li>
<li>Mark it pending.</li>
<li>Reset into it.</li>
<li>The new image confirms itself once it is satisfied it works.</li>
<li>No confirmation by the next boot means roll back.</li>
</ol>
<p>Step 2 has to be after the write rather than during it, because verifying the bytes as they
arrive proves nothing about what actually landed in flash. Step 5 is what turns a bad update
from a field failure into a self-healing event, and it is the step most often skipped.</p>

<h3>What to expose while it is happening</h3>
<p>Progress, so a user interface can show it; the current state, so a support engineer can tell
downloading from verifying from pending; and a reason code on failure. An update that just
stops, with the device reporting nothing, is the worst possible outcome of an operation the
user initiated deliberately.</p>
`,
quiz: [
{ q: "Why compute the transfer time before designing the update protocol?",
o: ["To pick a compression algorithm", "It decides whether resume is optional or essential", "To size the flash", "For the CRC"],
a: 1, why: "256 kB over BLE at the default 20-byte MTU is around 100 seconds, which is a long time to hold a connection with a phone in a pocket. Negotiating the MTU up is usually a bigger win than anything clever in the protocol." },
{ q: "Why is stop-and-wait per chunk usually unusable?",
o: ["It is not reliable", "Every chunk costs a full round trip, so latency dominates the transfer", "It cannot detect corruption", "It uses too much RAM"],
a: 1, why: "It is trivially correct and far too slow on any link with latency. A window of chunks acknowledged as a group is the simplest scheme that performs acceptably." },
{ q: "What must a sender check before resuming an interrupted transfer?",
o: ["The battery level", "That what the receiver already holds belongs to this same image", "The link speed", "The flash endurance"],
a: 1, why: "Without it, resuming after the user selected a different version produces a spliced image. Tag the transfer with the image's identifier, or compare a hash of the received prefix." },
{ q: "Why verify the whole image after writing rather than as it arrives?",
o: ["It is faster", "Verifying bytes as they arrive proves nothing about what actually landed in flash", "The CRC is not available earlier", "To save RAM"],
a: 1, why: "A write can fail silently on a worn sector, so the check has to read back what is really there. It also belongs to the bootloader rather than the transport, and it wants a signature rather than a CRC if the concern is origin." }
],
interview: {
q: "Design firmware update over BLE for a battery-powered product.",
a: "I would start with the arithmetic because it dictates everything else. A 256 kilobyte image over BLE at the default 23-byte MTU is 20 bytes of payload per notification, which is a couple of kilobytes a second and roughly a hundred seconds, and that is a long time to hold a connection to a phone in someone's pocket. Negotiating the MTU up to 247 with data length extension takes that to tens of kilobytes a second, and that single change matters more than anything clever in the protocol. Because a transfer of that length will be interrupted, resume is essential rather than optional, so the receiver persists its progress somewhere that survives a reset and the sender verifies that what the receiver already holds belongs to this same image, otherwise resuming after the user picks a different version splices two images together. For the transfer itself, numbered chunks with a CRC each so a corrupted chunk is retransmitted immediately rather than discovered at the end, and a window acknowledged as a group rather than stop-and-wait, because per-chunk round trips make latency dominate. Flow control matters more than it looks because flash erase stalls the receiving side, so the drain is not steady. Structurally it writes into the inactive slot so the running image is never touched, verifies the whole image after writing rather than as it arrives, because a write can fail silently and you need to read back what actually landed, marks it pending, resets into it, and the new image confirms itself once it is satisfied. No confirmation by the next boot means roll back, which is what turns a bad update into a self-healing event. And I would expose progress, state and a failure reason throughout, because an update that just stops with the device saying nothing is the worst outcome of something the user chose to do."
}
},

{
id: "emb-linkdebug",
track: "Embedded C",
sub: "Connectivity",
title: "Diagnosing a link that mostly works",
mins: 23,
body: `
<p>A link that never works is easy. A link that works ninety-nine times in a hundred is the
hard one, and the technique is different: you are looking for a rate, not a fault.</p>

<h3>Instrument before you investigate</h3>
<p>The single highest-value change is a set of counters at each layer, exposed as a diagnostic
command:</p>
<pre>frames sent           bytes sent
frames received       bytes received
CRC failures          resynchronisations
timeouts              retries
buffer full drops     malformed frames</pre>
<p>These cost a few bytes each and they turn "it sometimes doesn't work" into a number you can
compare between a healthy unit and a misbehaving one. Without them, everything after this is
guesswork.</p>
<p>The counters also let you see the difference between a link that is fine and one that is
retrying constantly. Both deliver correct data, and only one of them is close to failing.</p>

<h3>Separate the three quantities</h3>
<p>People say "slow" and mean one of three different things, with different causes:</p>
<ul>
<li><b>Latency.</b> Time from request to response. Dominated by round trips, so the fix is
fewer exchanges, not faster ones.</li>
<li><b>Throughput.</b> Bytes per second sustained. Dominated by packet size and window, so the
fix is bigger packets or more in flight.</li>
<li><b>Jitter.</b> Variation in latency. Usually the one that actually breaks things, and it
often comes from your own firmware rather than the link.</li>
</ul>
<p>Measure each separately. A protocol with a small MTU and a lot of round trips can have
perfectly good raw bandwidth and still feel unusable.</p>

<h3>Which end is wrong</h3>
<p>The single most useful diagnostic step is capturing at both ends at once. It splits the
problem three ways immediately:</p>
<ul>
<li>The frame never left: your transmit path.</li>
<li>It left but was malformed: your serialisation.</li>
<li>It left correctly and no reply came: their end, or the medium.</li>
</ul>
<p>This is the same principle as a clean logic analyser trace on I2C. Correct framing on the
wire means the transport did its job and the fault is above it, and knowing what a capture
rules out is what makes it useful.</p>

<h3>Corruption, loss and congestion look different</h3>
<ul>
<li><b>Corruption</b> shows as CRC failures and rises with cable length, interference or rate.
It affects a fraction of frames roughly independent of load.</li>
<li><b>Loss</b> shows as gaps in sequence numbers with no CRC failures, which usually means a
buffer overflowed somewhere rather than a wire problem.</li>
<li><b>Congestion</b> shows as rising latency before any loss at all, and it scales with
offered load.</li>
</ul>
<p>Sequence numbers in every frame are what let you tell the second from the first, which is why
they are worth the two bytes even on a link you trust.</p>

<h3>Make it happen more often</h3>
<p>An intermittent fault is easier to fix once you can reproduce it. Increase the rate: shorten
the interval, lengthen the frames, add background load, run more nodes, lengthen the cable,
shorten the timeouts. If it is a race or a buffer limit, any of those turns a daily event into
a per-minute one.</p>
<p>Reproduction is most of the work, because without it you cannot distinguish a fix from a
coincidence. A change that alters timing can suppress a race without fixing it, and it comes
back when something else changes.</p>

<h3>The questions worth asking first</h3>
<ul>
<li>Always, or sometimes? The adjective in the complaint is evidence.</li>
<li>Does it correlate with load, with temperature, with cable length, with a particular unit?</li>
<li>Does it survive a power cycle, or does it need a specific sequence?</li>
<li>Is it one direction only? That halves the search immediately.</li>
</ul>
<p>Each of these is free and each of them eliminates a class of cause. Asking them before
reaching for an instrument is what separates a short investigation from a long one.</p>
`,
quiz: [
{ q: "What is the highest-value change to make before investigating an intermittent link fault?",
o: ["Increase the buffer size", "Add counters at each layer, exposed as a diagnostic", "Lower the bit rate", "Add retries"],
a: 1, why: "They cost a few bytes and turn 'it sometimes fails' into a number you can compare between a healthy and a misbehaving unit. They also reveal a link that is retrying constantly, which delivers correct data while being close to failure." },
{ q: "Gaps appear in sequence numbers but there are no CRC failures. What does that indicate?",
o: ["Electrical interference", "Loss, most likely a buffer overflowing rather than a wire problem", "Congestion", "A clock mismatch"],
a: 1, why: "Corruption shows as CRC failures; loss without them means frames were dropped somewhere in software. Sequence numbers are what let you tell the two apart, which is why they earn their two bytes." },
{ q: "Why capture at both ends simultaneously?",
o: ["For redundancy", "It splits the problem into frame never left, left malformed, or left correctly with no reply", "To measure throughput", "To synchronise clocks"],
a: 1, why: "Three quite different problems, separated in one step. It is the same principle as a clean logic analyser trace on I2C: knowing what a capture rules out is what makes it useful." },
{ q: "Latency is poor but raw bandwidth is fine. What should you change?",
o: ["The bit rate", "The number of round trips in the protocol", "The buffer sizes", "The CRC"],
a: 1, why: "Latency is dominated by round trips, so the fix is fewer exchanges rather than faster ones. Throughput is dominated by packet size and window, which is a different lever entirely." }
],
interview: {
q: "A customer reports that your device 'sometimes loses connection'. How do you approach it?",
a: "I would spend the first part of it turning that sentence into something measurable, because sometimes is not a symptom I can act on. So the questions first, and they are free: always or sometimes, does it correlate with load or temperature or cable length or a particular unit, does it survive a power cycle or need a specific sequence, and is it one direction only, because that last one halves the search immediately. In parallel I would want counters at every layer exposed as a diagnostic command: frames sent and received, CRC failures, resynchronisations, timeouts, buffer-full drops. Those cost almost nothing and they let me compare a misbehaving unit against a healthy one, which is usually the fastest route to the answer. They also show me something the customer cannot see, which is whether the link is retrying constantly, because that delivers correct data right up until it does not. Then I would separate corruption from loss from congestion, because they look different: CRC failures mean corruption and usually scale with cable length or rate, gaps in sequence numbers without CRC failures mean something dropped frames in software rather than on the wire, and rising latency before any loss means congestion. Sequence numbers in every frame are what make that distinction possible. If I still could not reproduce it I would try to make it happen more often rather than waiting, by shortening intervals, adding load, lengthening the cable or shortening timeouts, because reproduction is most of the work and without it I cannot tell a fix from a coincidence."
}
}

);
