// Embedded C track, batch 9: security.
// The bootloader lesson touches secure boot; this goes properly into threat
// modelling, the chain of trust, key storage, primitives, physical attacks,
// securing a link, and the practice and regulation around it.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-sec-threat",
track: "Embedded C",
sub: "Security",
title: "Threat modelling: deciding what you are defending",
mins: 25,
body: `
<p>Security work goes wrong in two directions. Spending nothing, and spending a fortune on
the wrong thing. Both come from never writing down what you are actually defending against.</p>

<h3>Three questions, in order</h3>
<ol>
<li><b>What is worth taking?</b> Your firmware as intellectual property. User data. A key that
unlocks other devices. The device's function itself. Your brand, if a fleet gets turned into a
botnet.</li>
<li><b>Who would take it, and what does it cost them?</b> This is the question that sizes the
budget.</li>
<li><b>What would it cost you?</b> A recall, a regulatory finding, a customer leaving, or
nothing much.</li>
</ol>
<p>If an honest answer to the first question is "nothing anyone wants", that is a legitimate
finding and you should record it rather than quietly implementing crypto because it feels
responsible.</p>

<h3>Attackers, from cheapest to most expensive</h3>
<ul>
<li><b>Remote, no access.</b> Anything reachable over the internet. The cheapest attack there
is, because it scales: one exploit, every device. This is where almost all real-world harm
happens.</li>
<li><b>Local network or radio range.</b> Someone on the same Wi-Fi, or within BLE range. Cheap
and common, and often forgotten because people assume the local network is friendly.</li>
<li><b>Physical, non-invasive.</b> Has the device, opens the case, finds the debug header. A
few hours and a cheap probe.</li>
<li><b>Physical, invasive.</b> Decapping, microprobing, focused ion beam. Tens of thousands of
pounds and a specialist lab.</li>
</ul>
<p>The step from the third to the fourth is enormous, and it is usually where a sensible line
gets drawn. Deciding <b>where your line is</b>, and writing it down, is the whole exercise.</p>

<h3>Enumerate the attack surface</h3>
<p>Every input is attack surface, and the ones people forget are the interesting ones:</p>
<pre>network / TLS            the one everyone remembers
BLE, Wi-Fi provisioning  often left wide open during setup
USB                      descriptors are parsed before any auth
UART / debug console     frequently left enabled in production
SD card, USB stick       file parsing, and firmware images
the sensors themselves   a spoofed input can drive behaviour
the update mechanism     the most valuable target on the device
JTAG / SWD               full memory access if not locked</pre>
<p>The update mechanism deserves its own note. It is the one interface that deliberately
replaces the code that runs, so an attacker who owns it owns everything, permanently.</p>

<h3>A vocabulary worth having: STRIDE</h3>
<p>Six categories to walk each interface through, so you find the ones you would not have
thought of:</p>
<ul>
<li><b>Spoofing.</b> Pretending to be someone. Can an attacker impersonate your server?</li>
<li><b>Tampering.</b> Changing data or code. Can they modify a firmware image?</li>
<li><b>Repudiation.</b> Denying an action. Is there a log, and can it be edited?</li>
<li><b>Information disclosure.</b> Reading what they should not. Keys, user data, firmware.</li>
<li><b>Denial of service.</b> Stopping it working. Often the easiest and most ignored.</li>
<li><b>Elevation of privilege.</b> Getting more access than granted.</li>
</ul>

<h3>The two asymmetries that decide everything</h3>
<p><b>Scale.</b> A remote attack costs the same whether it is used once or a million times. A
physical attack costs that much again per device. That is why a remote vulnerability is
categorically more serious, and why effort belongs there first.</p>
<p><b>Time.</b> Attacks only ever get better. A technique that costs 50,000 pounds today is a
weekend project in ten years, and your product may still be in service. So the question is not
whether a device can be broken, but whether it can be broken <b>before it stops
mattering</b>.</p>

<h3>What a threat model looks like when written down</h3>
<pre>Asset:      per-device credentials for the cloud service
Attacker:   someone who has bought one unit
Attack:     read flash over SWD, extract the key
Impact:     impersonate ONE device (per-device keys), not the fleet
Decision:   accept for v1; lock the debug port at production
Revisit:    if we ever ship a shared key, this becomes critical</pre>
<p>Five lines. It records the decision, the reasoning and the trigger to revisit, which is
what makes it useful eighteen months later when someone asks why the debug port is locked.</p>
<p>Being able to say "we considered it and accepted the risk, here is why" is a much stronger
position, technically and commercially, than either ignoring it or over-engineering it.</p>
`,
quiz: [
{ q: "Why is a remote vulnerability categorically more serious than a physical one?",
o: ["It is harder to fix", "A remote attack costs the same whether used once or a million times", "Physical attacks are impossible", "Regulators only care about remote"],
a: 1, why: "Scale is the asymmetry. A physical attack costs its full price again for every device, so it does not scale. That is why effort belongs on remote surfaces first." },
{ q: "Which interface is the most valuable single target on a connected device?",
o: ["The UART console", "The update mechanism", "The sensors", "The SD card slot"],
a: 1, why: "It is the one interface that deliberately replaces the code that runs. An attacker who owns it owns the device permanently, and owns every device the same way." },
{ q: "Your honest answer to 'what is worth taking' is 'nothing anyone wants'. What should you do?",
o: ["Implement crypto anyway to be safe", "Record that finding and the reasoning", "Ignore security entirely and say nothing", "Buy a secure element"],
a: 1, why: "That is a legitimate conclusion, and writing it down is what makes it defensible later. Implementing crypto because it feels responsible spends budget without reducing risk." },
{ q: "What does 'attacks only get better' mean for a product decision?",
o: ["Nothing, ship it", "The question is whether it can be broken before it stops mattering", "You must defend against everything", "Only new products need security"],
a: 1, why: "A technique costing tens of thousands today is a weekend project in ten years, and your product may still be in service. The threat model has to include the service life." }
],
interview: {
q: "How would you approach security for a connected consumer device?",
a: "I would start by writing down what is actually worth taking, because that sizes everything else. Usually it is one of four things: firmware as intellectual property, user data, a key that unlocks something beyond this device, or the device's function itself. Then who would want it and what it costs them, and I would separate remote attackers from physical ones sharply, because the asymmetry is enormous: a remote attack costs the same whether it is used once or a million times, whereas a physical attack costs its full price again per device. That is why effort belongs on anything network-facing first. Then I would enumerate the attack surface, and the ones people forget are the interesting ones: BLE provisioning, USB descriptors which get parsed before any authentication, a debug console left enabled, and above all the update mechanism, because it is the one interface that deliberately replaces the running code. I would walk each of those through STRIDE, which is mostly useful for surfacing the categories you would not have thought of, particularly denial of service and repudiation. And I would write the conclusions down as short entries: asset, attacker, attack, impact, decision, and what would make us revisit. Being able to say we considered this and accepted the risk for these reasons is a far stronger position than either ignoring it or over-engineering, and it is what someone asks for eighteen months later."
}
},

{
id: "emb-sec-boot",
track: "Embedded C",
sub: "Security",
title: "Secure boot and the chain of trust",
mins: 26,
body: `
<p>Secure boot answers exactly one question: is the code about to run the code we signed? Every
other property people expect from it is something else.</p>

<h3>The chain</h3>
<p>Each stage verifies the next before handing over. The chain has to start somewhere that
cannot itself be replaced, which is the root of trust.</p>

<svg class="fig" viewBox="0 0 680 436" role="img" aria-label="Chain of trust: immutable ROM verifies the bootloader, which verifies the application, with keys held in fuses">
<rect class="bxa" x="40" y="60" width="180" height="60" rx="4"/>
<text class="th" x="56" y="86">Root of trust</text>
<text class="ts" x="56" y="104">immutable by design</text>
<rect class="bx" x="240" y="60" width="200" height="60" rx="4"/>
<text class="th" x="256" y="86">Immutable ROM</text>
<text class="ts" x="256" y="104">verifies the bootloader</text>
<rect class="bx" x="460" y="60" width="180" height="60" rx="4"/>
<text class="th" x="476" y="86">In silicon</text>
<text class="ts" x="476" y="104">cannot be changed</text>
<line class="arr" x1="340" y1="120" x2="340" y2="151" marker-end="url(#arrow)"/>
<rect class="bx" x="240" y="155" width="200" height="60" rx="4"/>
<text class="th" x="256" y="181">Bootloader</text>
<text class="ts" x="256" y="199">verifies the application</text>
<rect class="bx" x="460" y="155" width="180" height="60" rx="4"/>
<text class="th" x="476" y="181">Key hash in fuses</text>
<text class="ts" x="476" y="199">one-time programmable</text>
<line class="arr" x1="340" y1="215" x2="340" y2="246" marker-end="url(#arrow)"/>
<rect class="bx" x="240" y="250" width="200" height="60" rx="4"/>
<text class="th" x="256" y="276">Application</text>
<text class="ts" x="256" y="294">your firmware</text>
<rect class="bx" x="460" y="250" width="180" height="60" rx="4"/>
<text class="th" x="476" y="276">Key in bootloader</text>
<text class="ts" x="476" y="294">itself verified above</text>
<rect class="bxa" x="40" y="340" width="290" height="76" rx="4"/>
<text class="th" x="56" y="364">What it gives you</text>
<text class="ts" x="56" y="384">Only firmware you signed will run,</text>
<text class="ts" x="56" y="402">and only in the order you intended.</text>
<rect class="bx" x="350" y="340" width="290" height="76" rx="4"/>
<text class="th" x="366" y="364">What it does not</text>
<text class="ts" x="366" y="384">No confidentiality, and no defence</text>
<text class="ts" x="366" y="402">against a bug in your own signed code.</text>
</svg>
<p class="figcap">Break any link and everything below it is untrusted. A bootloader that can be
replaced makes the application's signature check meaningless, because the attacker simply
replaces the thing doing the checking.</p>

<h3>A signature, not a MAC or a CRC</h3>
<p>This is the decision that makes the whole thing work, and it is worth being able to justify
in one sentence: <b>the device only needs to verify, never to sign</b>.</p>
<ul>
<li><b>A CRC</b> is keyless. Anyone who modifies the image recomputes it.</li>
<li><b>A MAC</b> needs the same secret at both ends, so every device holds the key that
produces valid images. Extract it from one device and you can sign firmware for the whole
fleet.</li>
<li><b>A signature</b> is asymmetric. The device holds only the public key, and extracting a
public key gains an attacker nothing at all.</li>
</ul>
<p>Ed25519 or ECDSA over P-256 are the usual choices. RSA works and the signatures and
verification cost are larger.</p>

<h3>Where the public key lives</h3>
<p>It has to be somewhere an attacker cannot substitute their own. Storing it in ordinary flash
is useless: replace the key, sign with yours, done.</p>
<p>The common arrangement is a <b>hash of the public key burned into one-time-programmable
fuses</b>. The full key sits in flash, the bootloader hashes it and compares against the fuse
value before trusting it. That costs 32 bytes of fuses instead of a whole key, and the fuses
cannot be rewritten.</p>

<h3>Enabling it is usually irreversible</h3>
<p>Burning the secure boot fuses is a one-way manufacturing step. Get the key wrong, or lose
the private key, and every unit is scrap.</p>
<p>Which means the process around it matters as much as the code: where the private key lives,
who can use it, whether there is a backup, and whether development units are separated from
production units. Losing a signing key has ended products.</p>

<h3>Secure boot without a locked debug port is theatre</h3>
<p>If SWD or JTAG is open, an attacker does not need to defeat the signature check. They halt
the core after verification and write whatever they like into RAM, or simply read the flash
out.</p>
<p>Secure boot, debug lockout and readout protection are one feature with three parts. Shipping
any of them without the others buys very little.</p>

<h3>Verify the whole image, from where it actually is</h3>
<p>Two mistakes worth naming:</p>
<p><b>Verifying as it arrives</b> rather than after it is written proves something about the
bytes in transit, not about what landed in flash. A write can fail silently on a worn sector.</p>
<p><b>Verifying a header only</b> because hashing the whole image is slow. That leaves the body
unauthenticated, which is the entire payload. If boot time is the problem, the answer is a
faster hash or hardware acceleration, not a smaller check.</p>

<h3>Anti-rollback, and the tension it creates</h3>
<p>A signed old image is still validly signed, so an attacker can install a genuine previous
version with a known vulnerability. A monotonic counter in fuses prevents it: the bootloader
refuses anything below the recorded version.</p>
<p>The tension is that this also blocks reverting a broken update, which the reliability
argument wants. There is no clean answer. The usual compromise is to advance the counter only
once a version has proven itself in the field, not on the first boot.</p>
`,
quiz: [
{ q: "Why use a signature rather than a MAC for secure boot?",
o: ["Signatures are faster", "The device only needs to verify, so it holds only a public key, which is worthless to an attacker", "MACs are not secure", "Signatures are smaller"],
a: 1, why: "A MAC needs the same secret at both ends, so every device would hold the key that produces valid images. Extract it from one and you can sign firmware for the whole fleet." },
{ q: "Where does the verification key usually live?",
o: ["In ordinary flash", "A hash of the public key burned into one-time-programmable fuses", "In RAM", "On the server only"],
a: 1, why: "A key in ordinary flash can simply be replaced with the attacker's own. Hashing it costs 32 bytes of fuses rather than a whole key, and the bootloader checks the flash-held key against that hash." },
{ q: "Why is secure boot without debug lockout close to worthless?",
o: ["It is not, they are independent", "An open SWD port lets an attacker halt after verification and write to RAM, or read the flash out", "Debug ports are always disabled", "It only affects development"],
a: 1, why: "They are one feature with three parts: secure boot, debug lockout and readout protection. Shipping any one without the others buys very little." },
{ q: "An attacker installs a genuine older firmware version with a known vulnerability. What prevents it?",
o: ["The signature check", "A monotonic version counter in fuses", "A CRC", "Debug lockout"],
a: 1, why: "The old image is still validly signed, so the signature check passes. Anti-rollback records a minimum version. The tension is that it also blocks reverting a broken update." }
],
interview: {
q: "Explain how you would implement secure boot on a product.",
a: "The core idea is a chain where each stage verifies the next, and it has to start at something that cannot be replaced, which is normally an immutable ROM bootloader in silicon. That ROM verifies my bootloader, my bootloader verifies the application. Break any link and everything below it is untrusted, which is why a replaceable bootloader makes the application's check meaningless. The verification uses an asymmetric signature rather than a MAC or a CRC, and the reason is that the device only ever verifies, never signs, so it holds a public key and extracting a public key gains an attacker nothing. A MAC would mean every device holds the key that produces valid images, so one extraction compromises the fleet. The public key cannot live in plain flash or an attacker just substitutes their own, so the usual arrangement is a hash of the key burned into one-time-programmable fuses, with the full key in flash checked against that hash. I would be clear about two things that go with it. Burning those fuses is irreversible, so the process around the private key, where it lives, who can use it, whether there is a backup, matters as much as the code, because losing a signing key has ended products. And secure boot without a locked debug port is theatre: if SWD is open an attacker halts the core after verification and writes what they like. Secure boot, debug lockout and readout protection are really one feature with three parts."
}
},

{
id: "emb-sec-keys",
track: "Embedded C",
sub: "Security",
title: "Key storage and provisioning",
mins: 25,
body: `
<p>Cryptography is only as good as where the key lives. A perfect algorithm with a key sitting
in readable flash provides nothing.</p>

<h3>The mistake that defines the category</h3>
<pre>static const uint8_t device_key[16] = {
    0x2B, 0x7E, 0x15, 0x16, 0xA8, 0xAE, 0xD2, 0xA6,
    ...
};</pre>
<p>A hardcoded key, identical in every unit. One attacker with one device and a flash reader
compromises every device you have ever shipped, and there is no recovery short of a
recall.</p>
<p>The single most valuable distinction in this whole area is <b>shared key against per-device
key</b>. With per-device keys, an extraction compromises exactly one device. That one decision
changes an incident from a company-ending event into a support ticket.</p>

<h3>Where a key can live, worst to best</h3>
<ul>
<li><b>Plain flash.</b> Readable over SWD in seconds if the debug port is open, and readable by
any code running on the part.</li>
<li><b>Flash with readout protection.</b> Much better, and defeated by the glitching attacks
that have repeatedly been published against specific parts. Adequate for many threat
models.</li>
<li><b>One-time-programmable fuses.</b> On good parts, readable by the CPU but not through the
debug interface, and not rewritable. A significant step up.</li>
<li><b>Encrypted flash</b> with the key in fuses, so an attacker reading the flash image gets
ciphertext.</li>
<li><b>A secure element</b> such as an ATECC608 or SE050. The key is generated inside the chip
and <b>never leaves it</b>. You send data in and get a signature out. Even full compromise of
your MCU does not yield the key.</li>
<li><b>TrustZone or a secure enclave</b>, where key operations run in a separate security state
the application cannot reach.</li>
</ul>
<p>The secure element is the interesting one because it changes the shape of the problem: you
stop trying to hide a key on a device an attacker holds, and instead make the key
non-extractable by construction.</p>

<h3>Derive, do not reuse</h3>
<p>One key should do one job. A key hierarchy keeps a compromise contained:</p>
<pre>device root key            in fuses or a secure element, never used directly
  |
  +-- KDF("tls")     -->   session material for the cloud link
  +-- KDF("storage") -->   key encrypting stored user data
  +-- KDF("pair")    -->   key for local pairing</pre>
<p>A key derivation function such as HKDF produces independent keys from one root, so
compromising the storage key does not give an attacker the link key. It also means the root is
only ever touched by the derivation, which limits its exposure.</p>

<h3>Provisioning is a manufacturing problem</h3>
<p>Keys have to get onto devices somehow, and that step is often the weakest part of an
otherwise sound design. The questions that matter:</p>
<ul>
<li><b>Who generates the key?</b> Best is the device itself, so the private key never exists
anywhere else. That needs a good random source on the device.</li>
<li><b>Who signs the device certificate,</b> and where does that signing key live? A
certificate authority private key on a laptop in a factory is a bigger risk than anything on
the device.</li>
<li><b>What does the factory see?</b> A contract manufacturer you do not control should not be
able to extract keys or produce extra authorised units.</li>
<li><b>How do you revoke?</b> If a batch is compromised, is there a mechanism to refuse those
identities, and does anything check it?</li>
</ul>

<h3>Things that are not keys but behave like them</h3>
<p>A default password shared across a product line is a shared key with a friendlier name, and
it is now explicitly prohibited for consumer connected products in several jurisdictions.</p>
<p>The same applies to a debug unlock code, a service PIN, or a bootloader password. If it is
the same on every unit and it grants access, treat it exactly as you would a shared
cryptographic key: assume it will be extracted and published.</p>

<h3>The practical minimum</h3>
<p>For a connected product that is not defending against a funded attacker, the defensible
baseline is: per-device keys, generated on-device if the hardware allows, stored in fuses or a
secure element, derived into purpose-specific subkeys, with the debug port locked in
production and a documented way to revoke a compromised identity.</p>
`,
quiz: [
{ q: "What is the most valuable single distinction in key storage?",
o: ["Symmetric against asymmetric", "Shared key against per-device key", "Hardware against software", "Long keys against short"],
a: 1, why: "With a shared key, one extraction compromises every device you have shipped and there is no recovery short of a recall. With per-device keys, it compromises exactly one." },
{ q: "What makes a secure element different from storing a key in fuses?",
o: ["It is faster", "The key is generated inside and never leaves: you send data in and get a signature out", "It has more storage", "It is cheaper"],
a: 1, why: "It changes the shape of the problem. Rather than hiding a key on a device the attacker holds, the key is non-extractable by construction, so even full compromise of your MCU does not yield it." },
{ q: "Why derive purpose-specific keys from a root rather than using one key everywhere?",
o: ["It is faster", "A compromise stays contained: the storage key does not give an attacker the link key", "The standard requires it", "It saves memory"],
a: 1, why: "A KDF such as HKDF produces independent keys from one root, and it means the root itself is only ever touched by the derivation, limiting its exposure." },
{ q: "Where is the weakest part of an otherwise sound key design often found?",
o: ["The algorithm", "Provisioning: how keys get onto devices at manufacture", "The key length", "The MCU"],
a: 1, why: "A certificate authority private key on a laptop in a factory is a bigger risk than anything on the device, and a contract manufacturer you do not control should not be able to produce extra authorised units." }
],
interview: {
q: "Where would you store a cryptographic key on a microcontroller?",
a: "The first question is not where but whether it is per device or shared, because that decides how bad an extraction is. A shared key means one attacker with one unit and a flash reader compromises everything you have shipped, with no recovery short of a recall. Per-device keys turn the same extraction into a single support ticket, and that one decision matters more than the storage mechanism. For storage itself there is a ladder. Plain flash is readable over SWD in seconds. Readout protection is much better and has been defeated by published glitching attacks on specific parts, which is fine for many threat models as long as you know it. One-time-programmable fuses are a real step up, because on good parts they are readable by the CPU but not through the debug interface. And a secure element such as an ATECC608 changes the shape of the problem entirely: the key is generated inside and never leaves, so you send data in and get a signature out, and even full compromise of the MCU does not yield it. Beyond storage I would derive purpose-specific subkeys from a root with something like HKDF, so a compromise of the storage key does not hand over the link key. And I would treat provisioning as part of the design rather than an afterthought, because a CA private key on a laptop in a contract manufacturer's factory is usually a bigger risk than anything on the device."
}
},

{
id: "emb-sec-crypto",
track: "Embedded C",
sub: "Security",
title: "Choosing crypto primitives, and not writing them",
mins: 26,
body: `
<p>You will almost never implement a cipher. You will constantly choose between primitives, and
getting that choice wrong is the common failure, not a weak algorithm.</p>

<h3>Four things, four jobs</h3>
<table class="stats">
<tr><th>Primitive</th><th>Gives you</th><th>Key</th></tr>
<tr><td>Hash (SHA-256)</td><td>Integrity against accident</td><td>none</td></tr>
<tr><td>MAC (HMAC, CMAC)</td><td>Integrity and authenticity</td><td>shared secret</td></tr>
<tr><td>Signature (Ed25519, ECDSA)</td><td>Authenticity, verifiable by anyone</td><td>private to sign, public to verify</td></tr>
<tr><td>Cipher (AES, ChaCha20)</td><td>Confidentiality</td><td>shared secret</td></tr>
</table>
<p>The decision procedure is short. Does the verifier need to hold a secret? If not, you need a
signature. Do you need to hide the contents, or only detect changes? Only detect changes means
you do not need encryption at all, and reaching for it anyway is a common way to add cost and
risk without adding security.</p>

<h3>Never encrypt without authenticating</h3>
<p>Encryption alone stops someone reading your data. It does not stop them <b>changing</b> it.
With a stream cipher or CTR mode, flipping a bit in the ciphertext flips exactly that bit in
the plaintext, so an attacker can make targeted modifications without knowing the key at all.</p>
<p>The answer is an <b>AEAD</b>: authenticated encryption with associated data, which does both
in one construction and fails cleanly if either part is wrong.</p>
<pre>AES-GCM              hardware accelerated on many parts
AES-CCM              common in BLE and 802.15.4
ChaCha20-Poly1305    fast in software, good when there is no AES engine</pre>
<p>Use one of those and the question stops arising. Composing your own encrypt-then-MAC is
possible and is a place people get the order and the coverage wrong.</p>

<h3>Two failure modes worth knowing by name</h3>
<p><b>ECB mode.</b> Encrypts each block independently, so identical plaintext blocks give
identical ciphertext blocks and the structure of the data is visible through the encryption. It
is the mode in every textbook and it is essentially never the right answer.</p>
<p><b>Nonce reuse in GCM.</b> Using the same key and nonce for two messages does not merely
weaken it: it leaks the XOR of the plaintexts and allows an attacker to forge tags. A counter
that resets on reboot is the usual way this happens on an embedded device, which makes it a
firmware problem rather than a cryptographic one.</p>

<h3>Randomness</h3>
<p>Almost everything above depends on unpredictable numbers: keys, nonces, session identifiers,
padding. <code>rand()</code> is not one, and neither is a seed from an uninitialised variable
or from the ADC's noise floor without careful analysis.</p>
<p>Use the hardware TRNG if the part has one. If it does not, that is a significant design
finding and it belongs in the parts selection conversation rather than being worked around in
firmware.</p>
<p>The classic embedded failure is seeding a PRNG from the boot time or a device serial, which
produces keys an attacker can enumerate. Several real products have shipped with a few thousand
possible keys across the whole fleet.</p>

<h3>Constant time</h3>
<p>Comparing a MAC with <code>memcmp</code> returns as soon as it finds a difference, so the
time it takes reveals how many leading bytes matched. That is enough to forge a tag byte by
byte over enough attempts.</p>
<pre>/* wrong: returns early */
if (memcmp(tag, expected, 16) != 0) reject();

/* constant time: always touches every byte */
uint8_t diff = 0;
for (int i = 0; i &lt; 16; i++) diff |= tag[i] ^ expected[i];
if (diff != 0) reject();</pre>
<p>Most libraries provide this. It is worth recognising because the wrong version looks
completely reasonable in review.</p>

<h3>Do not write the primitive</h3>
<p>Not because it is difficult to get the maths right, but because the maths is the easy part.
The hard parts are constant-time behaviour, side-channel resistance, and correct handling of
every edge case, none of which show up in a test that says the output matches the test
vector.</p>
<p>Use mbedTLS, wolfSSL, tinycrypt, libsodium, or your part's hardware accelerator. Then check
you are using it correctly, because that is where the real defects are: an unauthenticated
mode, a reused nonce, an unchecked return value, or a certificate that is never validated.</p>

<h3>The cost, honestly</h3>
<p>Crypto is not free on a small part. AES-GCM in software costs tens of cycles per byte, an
ECDSA verification is milliseconds, and mbedTLS with TLS is tens of kilobytes of flash and a
significant chunk of RAM during the handshake. Those numbers belong in the design conversation
early, because discovering them late usually means a part change.</p>
`,
quiz: [
{ q: "What is wrong with encrypting a message without authenticating it?",
o: ["Nothing", "Encryption stops reading, not changing: with a stream cipher a flipped ciphertext bit flips that plaintext bit", "It is slower", "It uses more memory"],
a: 1, why: "An attacker can make targeted modifications without knowing the key. The answer is an AEAD such as AES-GCM or ChaCha20-Poly1305, which does both in one construction." },
{ q: "Why is reusing a nonce with the same key in AES-GCM serious?",
o: ["It is slightly weaker", "It leaks the XOR of the plaintexts and allows tag forgery", "It only affects performance", "It is fine if the messages differ"],
a: 1, why: "It is catastrophic rather than a degradation. On embedded the usual cause is a counter that resets on reboot, which makes it a firmware problem rather than a cryptographic one." },
{ q: "Why is memcmp the wrong way to compare a MAC?",
o: ["It is slow", "It returns early, so the timing reveals how many leading bytes matched", "It cannot compare binary data", "It needs a null terminator"],
a: 1, why: "That is enough to forge a tag byte by byte over enough attempts. A constant-time comparison ORs the differences across every byte and only tests at the end." },
{ q: "The verifier must not hold a secret. Which primitive do you need?",
o: ["A hash", "A signature", "An HMAC", "A cipher"],
a: 1, why: "Only asymmetric signatures let anyone verify with a public key while only the holder of the private key can produce one. That is exactly why secure boot uses a signature rather than a MAC." }
],
interview: {
q: "How do you decide which cryptographic primitive to use?",
a: "I work from what the property actually needs to be rather than from the algorithm. Two questions settle most of it. Does the verifier need to hold a secret? If not, it has to be an asymmetric signature, which is why secure boot uses one: the device only verifies, so it holds a public key and extracting that gains nothing. If both ends can share a secret then an HMAC is cheaper and simpler. The second question is whether I need to hide the contents or only detect changes, because if it is only detection then I do not need encryption at all, and adding it anyway is a common way to add cost and risk without adding security. If I do need both, I would use an AEAD, AES-GCM or ChaCha20-Poly1305, rather than composing encryption and a MAC myself, because encrypting without authenticating leaves an attacker able to flip bits in the plaintext by flipping them in the ciphertext. Beyond the choice I would be careful about the things that are firmware problems rather than crypto problems: never reusing a nonce, which usually happens because a counter resets on reboot, using the hardware TRNG rather than anything seeded from a serial number or boot time, and comparing MACs in constant time since memcmp returns early and leaks how many bytes matched. And I would not write the primitive. The maths is the easy part; constant-time behaviour and side channels are not, and a test that matches the published vectors tells you nothing about either."
}
},

{
id: "emb-sec-debug",
track: "Embedded C",
sub: "Security",
title: "Debug ports, readout protection and physical attacks",
mins: 24,
body: `
<p>Everything else in this batch assumes an attacker cannot simply read the flash out. That
assumption is the one most often false in shipped products.</p>

<h3>What an open debug port gives away</h3>
<p>SWD or JTAG is not a diagnostic feature from an attacker's point of view. It is full read and
write access to memory and registers, plus halt and single-step. With it, someone can:</p>
<ul>
<li>Dump the entire flash, including keys and your firmware.</li>
<li>Halt after secure boot has verified everything, and write whatever they like into RAM.</li>
<li>Set a breakpoint on the function that checks a password and change the result.</li>
<li>Read RAM while the device is running, which is where decrypted data lives.</li>
</ul>
<p>Note the second one. It is why an open debug port defeats secure boot entirely rather than
merely weakening it.</p>

<h3>Readout protection, and what the levels mean</h3>
<p>The naming differs by vendor but the shape is consistent. Taking ST as the example:</p>
<ul>
<li><b>Level 0.</b> No protection. Development.</li>
<li><b>Level 1.</b> Debug access blocked while the flash is protected, but you can revert to
level 0, which <b>mass-erases the flash</b> as it goes. Your firmware and keys are destroyed
rather than exposed.</li>
<li><b>Level 2.</b> Debug permanently disabled, no way back, no mass erase. Also means you can
never debug a returned unit, and a bad firmware release cannot be recovered on the bench.</li>
</ul>
<p>Level 1 is where most products sensibly sit: it protects the contents, and the escape hatch
costs the attacker exactly the thing they wanted.</p>
<p>Espressif parts use eFuses for flash encryption and secure boot with a similar
irreversibility, and the same trade applies.</p>

<h3>The failure that actually happens</h3>
<p>Not a defeated protection mechanism. An <b>enabled</b> one.</p>
<p>Production programming needs the debug port. So the port is enabled at the end of the line,
and the step that locks it is either forgotten, applied to some units and not others, or
skipped for a rework batch that never gets locked afterwards.</p>
<p>The defence is procedural rather than technical: make locking part of the production test
that also verifies the device works, and make the test <b>read back and confirm</b> the
protection level rather than merely writing it. A unit that fails that check does not ship.</p>

<h3>Glitching, in one paragraph</h3>
<p>Briefly dropping the supply voltage or disturbing the clock at a precisely chosen moment can
make the core skip or misexecute an instruction. Aimed at the branch that decides whether a
signature was valid, a single skipped instruction turns a rejection into an acceptance.</p>
<p>It is cheap. The equipment is a few hundred pounds and the technique is well documented, so
it belongs in the threat model of anything where a physical attacker gains something.</p>
<p>The usual countermeasures are redundancy and unpredictability: check the critical condition
twice with different code, use values where a single bit flip does not turn failure into
success, add random delays so the attacker cannot find the moment reliably, and check that the
code took the path it should have rather than only checking the result.</p>
<pre>/* fragile: one skipped branch and you are in */
if (verify(sig) != OK) reject();

/* less fragile: two checks, a non-trivial success value, and a flow check */
uint32_t r1 = verify(sig);
uint32_t r2 = verify(sig);
if (r1 != VERIFY_MAGIC_OK || r2 != VERIFY_MAGIC_OK) reject();
if (r1 != r2)                                      reject();</pre>
<p>None of this makes glitching impossible. It raises the cost, which is the only thing any of
this ever does.</p>

<h3>Side channels</h3>
<p>Power consumption and timing vary with the data being processed. Measure the supply current
while a device performs many signature operations and, with enough traces, the key can be
recovered without ever touching the flash.</p>
<p>This is real and it is the reason to use a library or hardware engine with side-channel
countermeasures rather than a clean-looking implementation of your own. For most products it
sits below the line in the threat model. For a payment or identity device it does not.</p>

<h3>Leftovers</h3>
<p>The unglamorous list, all of which have shipped in real products:</p>
<ul>
<li>Test points connected to the debug pins on the production board.</li>
<li>A UART console with a shell, left enabled because it was useful during bring-up.</li>
<li>A "factory mode" command that skips authentication.</li>
<li>Firmware images published for download, unencrypted, so nobody needs to attack a device at
all to study it.</li>
</ul>
<p>That last one is worth thinking about deliberately. If your images are public, your firmware
is public, and anything hidden in it is not hidden.</p>
`,
quiz: [
{ q: "Why does an open debug port defeat secure boot entirely?",
o: ["It does not", "An attacker can halt after verification and write whatever they like into RAM", "It disables the bootloader", "It corrupts the signature"],
a: 1, why: "They do not need to defeat the signature check at all. They let it succeed, then take over afterwards, or simply dump the flash including the keys." },
{ q: "What happens when you revert ST readout protection from level 1 to level 0?",
o: ["Nothing", "The flash is mass-erased, so contents are destroyed rather than exposed", "The device is bricked", "Debug stays disabled"],
a: 1, why: "That escape hatch is what makes level 1 a sensible place for most products: it protects the contents while still allowing recovery, and it costs the attacker exactly the thing they wanted." },
{ q: "What is the most common real-world debug port failure?",
o: ["Glitching attacks", "Protection never being enabled at production, or only on some units", "Side channel analysis", "A defeated fuse"],
a: 1, why: "Production programming needs the port, so it is enabled at the end of the line and the locking step gets forgotten or skipped for a rework batch. The fix is procedural: read back and confirm the level as part of the production test." },
{ q: "What does voltage or clock glitching typically aim at?",
o: ["The flash contents", "The branch that decides whether a signature was valid", "The RNG", "The bootloader's checksum"],
a: 1, why: "A single skipped or misexecuted instruction can turn a rejection into an acceptance. Countermeasures are redundancy, non-trivial success values, random delays and control-flow checks, which raise the cost rather than removing the attack." }
],
interview: {
q: "A product is going into production next month. What would you check about its debug and physical security?",
a: "The first thing, and it is the one that actually goes wrong, is whether readout protection is enabled at the end of the production line and whether anyone verifies it. Production programming needs the debug port, so the port is open at the moment the unit is tested, and the locking step gets forgotten, or applied to most units, or skipped for a rework batch that never comes back. So I would want locking to be part of the production test rather than a separate step, and I would want the test to read back and confirm the protection level rather than just writing it, with a unit that fails that check not shipping. On the level itself I would probably argue for something equivalent to ST's level 1 rather than level 2, because level 1 blocks debug access while still allowing a revert that mass-erases the flash, so the contents are destroyed rather than exposed, and you keep the ability to recover a returned unit or a bad release. Level 2 is permanent and you can never debug a field return again. Then the unglamorous list: test points wired to the debug pins, a UART shell left enabled from bring-up, any factory mode that skips authentication, and whether firmware images are published for download, because if they are then the firmware is public and nothing in it is hidden. Glitching and side channels I would raise explicitly and then place against the threat model, because they are real and cheap enough to matter, but for most products they sit below the line and saying so deliberately is better than either ignoring them or over-engineering."
}
},

{
id: "emb-sec-comms",
track: "Embedded C",
sub: "Security",
title: "Securing a link",
mins: 25,
body: `
<p>The connectivity batch covered getting bytes across reliably. This is about the same link
when someone hostile is listening or interfering.</p>

<h3>What you are actually buying</h3>
<p>Four separate properties, and a design that provides some but not others is common:</p>
<ul>
<li><b>Confidentiality.</b> They cannot read it.</li>
<li><b>Integrity.</b> They cannot change it undetected.</li>
<li><b>Authentication.</b> You are talking to who you think.</li>
<li><b>Freshness.</b> They cannot replay an old valid message.</li>
</ul>
<p>Encryption alone gives the first and, without an AEAD, not even the second. Freshness is the
one most often missing entirely, and it is why an attacker can record a valid "unlock" message
and send it again tomorrow.</p>

<h3>TLS on a microcontroller, and what it costs</h3>
<p>TLS gives you all four properly, and it is not free:</p>
<ul>
<li>Tens of kilobytes of flash for the library and its ciphersuites.</li>
<li>A significant RAM peak during the handshake, larger than the steady state, which is what
catches people out.</li>
<li>An asymmetric handshake costing hundreds of milliseconds without hardware acceleration.</li>
<li>A certificate chain to store and, crucially, to <b>validate</b>.</li>
<li>A clock, because certificate expiry is a date. A device with no RTC and no network time
cannot properly check validity, and this is a real and awkward problem.</li>
</ul>
<p><b>The step people skip is validation.</b> A TLS connection that does not verify the server's
certificate against a trusted root, and does not check the hostname, provides encryption against
a passive listener and nothing at all against an active one. It looks identical in testing.</p>

<h3>The lighter option</h3>
<p>Where both ends are yours, a pre-shared key with TLS-PSK removes the certificates, the chain
validation and most of the handshake cost, while keeping the security properties. It trades away
the ability to rotate trust without touching the device.</p>
<p>Below that, a scheme built on an AEAD with keys derived from a per-device root is entirely
defensible, provided you get freshness right, which is where hand-rolled protocols usually
fail.</p>

<h3>Replay, and how to prevent it</h3>
<p>Three mechanisms, in increasing order of robustness:</p>
<ul>
<li><b>A monotonic counter</b> in each message, with the receiver refusing anything not greater
than the last accepted. Simple and effective. The counter must survive a reboot, or an attacker
power-cycles the device and replays from the start.</li>
<li><b>A timestamp</b> with a tolerance window. Needs synchronised clocks, which is often the
harder problem.</li>
<li><b>A challenge and response.</b> The receiver sends a fresh random nonce that must appear in
the reply. Costs a round trip, and it is the only one that needs no persistent state.</li>
</ul>
<p>For anything that causes a physical action, a door, a motor, a payment, challenge and response
is worth the round trip.</p>

<h3>BLE pairing, specifically</h3>
<p>BLE's association models differ enormously and the default is the weak one:</p>
<ul>
<li><b>Just Works.</b> No man-in-the-middle protection at all. An attacker present during
pairing can insert themselves. It is the default because it needs no user interface.</li>
<li><b>Passkey Entry</b> and <b>Numeric Comparison.</b> Provide MITM protection, and need a
display or a keypad.</li>
<li><b>Out of Band.</b> Key material exchanged over another channel such as NFC or USB. The
strongest, and it needs that channel.</li>
</ul>
<p>Also: <b>LE Secure Connections</b> rather than legacy pairing. Legacy pairing has known
weaknesses and is still widely deployed because it is the fallback.</p>
<p>The practical point is that pairing security is decided by what your device can display or
input, so it is a hardware decision made early, not a firmware decision made late.</p>

<h3>Provisioning is the soft moment</h3>
<p>Almost every connected product has a setup phase where it accepts configuration from whoever
is nearby: joining Wi-Fi, accepting credentials, being claimed by an account.</p>
<p>That window is frequently unauthenticated, because authenticating it is awkward before there
is any shared secret. Common answers are a per-device secret printed on the label or in the
packaging, a button press requiring physical presence, or a short time window after power-on.</p>
<p>What is not an answer is a fixed default password, which is now explicitly prohibited for
consumer connected products in the UK and addressed by equivalent European rules.</p>
`,
quiz: [
{ q: "Which security property is most often missing from a hand-rolled link protocol?",
o: ["Confidentiality", "Freshness", "Integrity", "Authentication"],
a: 1, why: "Without it an attacker records a valid message and sends it again later. Encryption and even authentication do nothing about a replay of a genuinely valid message." },
{ q: "A device uses TLS but does not validate the server certificate. What does it have?",
o: ["Full TLS security", "Encryption against a passive listener and nothing against an active one", "Nothing at all", "Integrity but not confidentiality"],
a: 1, why: "An active attacker simply presents their own certificate and the device accepts it. It looks identical in testing, which is why this is such a common defect." },
{ q: "Why is a replay counter required to survive a reboot?",
o: ["For performance", "Otherwise an attacker power-cycles the device and replays from the start", "It does not need to", "To synchronise clocks"],
a: 1, why: "The counter is the only thing distinguishing a fresh message from an old one, so resetting it makes every previously recorded message valid again." },
{ q: "Why is BLE Just Works pairing weak?",
o: ["It uses short keys", "It has no man-in-the-middle protection, so an attacker present during pairing can insert themselves", "It is not encrypted", "It is deprecated"],
a: 1, why: "It is the default because it needs no display or keypad. Passkey Entry and Numeric Comparison give MITM protection but require a user interface, which makes this a hardware decision taken early." }
],
interview: {
q: "How would you secure the link between a battery device and a phone app?",
a: "I would separate the four properties first, because a design usually provides some and not others: confidentiality, integrity, authentication and freshness. Freshness is the one that gets left out and it is why an attacker can record a valid command and replay it tomorrow. On BLE specifically, the association model matters more than anything else and the default is the weak one: Just Works has no man-in-the-middle protection, so an attacker present during pairing can insert themselves. Passkey Entry or Numeric Comparison fix that but need a display or a keypad, which makes pairing security a hardware decision taken early rather than a firmware decision taken late. I would also insist on LE Secure Connections rather than legacy pairing. Above the link I would still authenticate at the application layer with a per-device key, because pairing protects the transport and not the semantics of what is being asked for, and for anything that causes a physical action I would use a challenge and response, since it costs a round trip and needs no persistent state. If I were using a counter for replay protection instead, it has to survive a reboot or the attacker just power-cycles the device and replays from the start. The other thing I would look hard at is provisioning, because almost every product has a setup window where it accepts configuration from whoever is nearby, and the acceptable answers are a per-device secret on the label, a physical button press, or a short window after power-on, but never a fixed default password, which is now prohibited for consumer connected products in the UK."
}
},

{
id: "emb-sec-practice",
track: "Embedded C",
sub: "Security",
title: "Security as ongoing practice, and the rules you now have to meet",
mins: 24,
body: `
<p>Security is not a feature you finish. It is a property that decays, because the code stays
the same while the attacks improve, and because most of what you ship was written by somebody
else.</p>

<h3>You are shipping other people's code</h3>
<p>A typical firmware image is your application, a vendor HAL, an RTOS, a TCP/IP stack, a TLS
library and a handful of drivers. Most of the lines are not yours, and most of the published
vulnerabilities will not be in your part.</p>
<p>Two practices follow:</p>
<ul>
<li><b>Know what is in the image.</b> A software bill of materials listing every component and
its exact version. Without it, the question "are we affected by this advisory?" has no
answer.</li>
<li><b>Watch for advisories</b> against those components. This is a subscription and a routine,
not a project.</li>
</ul>
<p>The Ripple20 and Amnesia:33 disclosures are the reference examples: single flaws in embedded
TCP/IP stacks affecting enormous numbers of devices across many vendors, most of whom did not
know they contained the affected code.</p>

<h3>The update mechanism is the security feature</h3>
<p>Everything else is a point-in-time judgement. The ability to ship a fix is what lets you
respond to something nobody knew about when you designed the product.</p>
<p>So a device that cannot be updated in the field has permanent vulnerabilities by
construction, and the update path deserves the engineering attention accordingly: it must be
authenticated, it must be recoverable, and it must actually be exercised rather than assumed to
work.</p>
<p>An update mechanism that has never been used in anger is a mechanism that does not work. Ship
an update deliberately, early, while the fleet is small.</p>

<h3>Have a way to receive bad news</h3>
<p>Someone will find a flaw. The question is whether they can tell you.</p>
<p>A vulnerability disclosure policy is a published contact point and a stated response process.
It costs a page and an email address, and without it a researcher's options are to give up or
to publish.</p>

<h3>The rules that now apply</h3>
<p>Consumer connected products have moved from voluntary guidance to law, and this affects
anyone selling a connected device in the UK or the EU.</p>
<p><b>UK: the Product Security and Telecommunications Infrastructure Act.</b> Its security
requirements came into force in April 2024 and impose three obligations on consumer connectable
products:</p>
<ul>
<li>No universal default passwords.</li>
<li>A published means for reporting security issues.</li>
<li>A published minimum period for which security updates will be provided.</li>
</ul>
<p>That third one is the awkward one commercially, because it is a public commitment to support
a product for a stated time.</p>
<p><b>EU: the Cyber Resilience Act.</b> A broader regulation covering products with digital
elements, with essential requirements around secure-by-default configuration, vulnerability
handling, and providing security updates, phasing in over the period following its entry into
force. <b>ETSI EN 303 645</b> is the underlying consumer IoT baseline that much of this
reflects, and it is worth reading as engineering guidance regardless of jurisdiction.</p>
<p>Dates and scope move, so confirm the current position for your product rather than relying on
a summary. The direction of travel does not move: baseline security is becoming a condition of
sale.</p>

<h3>What this means for a small company</h3>
<p>The three UK obligations are genuinely achievable by one engineer. Per-device credentials
instead of a default password. A security.txt or a page with an email address. A support-period
statement, which is a commercial decision more than a technical one.</p>
<p>The harder part is the ongoing side: knowing what is in your image, watching for advisories,
and keeping an update path that works. That is a small recurring cost rather than a large
one-off, and it is much cheaper to build in at the start than to retrofit.</p>

<h3>The position worth being able to state</h3>
<p>Security is a budget allocated against a threat model, not a checklist to complete. A good
answer names what you defended, what you deliberately did not, why, and what would make you
revisit. That is a stronger engineering position than either "we use AES" or "it is not
connected so it does not matter".</p>
`,
quiz: [
{ q: "Why does a software bill of materials matter for firmware?",
o: ["It is required for compilation", "Without it, the question 'are we affected by this advisory?' has no answer", "It reduces binary size", "It speeds up builds"],
a: 1, why: "Most of the lines in a typical image are not yours: a HAL, an RTOS, a TCP/IP stack, a TLS library. Ripple20 and Amnesia:33 affected huge numbers of devices whose vendors did not know they contained the code." },
{ q: "Why is the update mechanism described as the security feature?",
o: ["It is not", "Everything else is a point-in-time judgement; updating is what lets you respond to something nobody knew about", "It encrypts the firmware", "It authenticates users"],
a: 1, why: "A device that cannot be updated has permanent vulnerabilities by construction. It follows that the update path must be authenticated, recoverable, and actually exercised rather than assumed to work." },
{ q: "Which three obligations does the UK PSTI Act place on consumer connectable products?",
o: ["Encryption, secure boot and signed updates", "No universal default passwords, a published means to report issues, and a published minimum update period", "A CE mark, a password and a firewall", "Penetration testing, an SBOM and insurance"],
a: 1, why: "All three are achievable by one engineer. The support-period statement is the commercially awkward one, because it is a public commitment to support the product for a stated time." },
{ q: "What is the strongest way to present security decisions in an interview or a review?",
o: ["List the algorithms used", "Name what you defended, what you deliberately did not, why, and what would make you revisit", "Say the device is not connected", "Say everything is encrypted"],
a: 1, why: "Security is a budget allocated against a threat model rather than a checklist. A recorded decision with its reasoning is defensible; a list of primitives says nothing about whether they address the actual risk." }
],
interview: {
q: "What would you put in place so a product stays secure after it ships?",
a: "I would treat it as three ongoing things rather than a feature to finish. First, knowing what is in the image, because most of the lines are not mine: a vendor HAL, an RTOS, a TCP/IP stack, a TLS library. Without a bill of materials listing exact versions, the question of whether we are affected by an advisory has no answer, and Ripple20 and Amnesia:33 are the examples of why that matters, since they affected enormous numbers of devices whose vendors did not know they contained the code. So a subscription to advisories against those components, as a routine rather than a project. Second, the update mechanism, which I would argue is the security feature, because everything else is a point-in-time judgement and updating is the only thing that lets you respond to something nobody knew about at design time. That means it has to be authenticated, recoverable, and actually exercised: an update path that has never been used in anger does not work, so I would ship one deliberately and early while the fleet is small. Third, a way to receive bad news, meaning a published contact and a stated response process, because without one a researcher's options are to give up or to publish. On top of that there are now legal obligations. In the UK the PSTI Act requires no universal default passwords, a published means to report issues, and a published minimum security update period, and the EU Cyber Resilience Act is broader and phasing in. The first two are an afternoon of work. The third is really a commercial decision about how long we commit to supporting the product."
}
}

);
