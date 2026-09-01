// Operating Systems: security and lifecycle.
//
// The part of an embedded Linux product that is nobody's job until it is
// somebody's emergency: threat modelling, secure boot, privilege, field
// updates, hardening, and where keys live.

LESSONS.push(

{
id: "os-threat",
track: "Operating Systems",
sub: "Security and lifecycle",
title: "Threat modelling a device that ships to strangers",
mins: 20,
body: `
<p>Security work on a product starts with a question that is easy to skip: what are we actually
defending, and against whom? Without that, effort goes into whatever is fashionable rather than
whatever matters, and a device that is genuinely exposed in one place gets hardened everywhere
else.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Assets, attackers and entry points as three columns feeding a ranked list of mitigations">
<rect class="bx" x="24" y="26" width="196" height="150" rx="4"/>
<text class="th" x="40" y="52">what is worth taking</text>
<text class="ts" x="40" y="82">user data</text>
<text class="ts" x="40" y="106">credentials and keys</text>
<text class="ts" x="40" y="130">your firmware itself</text>
<text class="ts" x="40" y="156">control of the device</text>

<rect class="bx" x="240" y="26" width="196" height="150" rx="4"/>
<text class="th" x="256" y="52">who is attacking</text>
<text class="ts" x="256" y="82">remote, over network</text>
<text class="ts" x="256" y="106">local, on the same LAN</text>
<text class="ts" x="256" y="130">someone holding it</text>
<text class="ts" x="256" y="156">someone who owns it</text>

<rect class="bx" x="456" y="26" width="200" height="150" rx="4"/>
<text class="th" x="472" y="52">how they get in</text>
<text class="ts" x="472" y="82">network services</text>
<text class="ts" x="472" y="106">the update channel</text>
<text class="ts" x="472" y="130">debug and serial ports</text>
<text class="ts" x="472" y="156">removable storage</text>

<rect class="bxa" x="24" y="192" width="632" height="40" rx="4"/>
<text class="th" x="40" y="218">rank by consequence times likelihood, then spend effort in that order</text>
</svg>

<p>List the <b>assets</b> first. On most devices these are user data, any credentials the device
holds, the firmware itself if it embodies commercial value, and control of the device where
misuse causes physical or reputational harm. Different assets justify very different spending.</p>

<p>Then the <b>attackers</b>, and specifically their access. A remote attacker who has never
touched the device is a different problem from someone on the same network, which is different
again from someone holding it with a soldering iron. The last category matters because on an
embedded product the attacker frequently <b>owns the hardware</b>, which invalidates most
assumptions imported from server security.</p>

<p>That last point deserves emphasis. If your threat model includes the device's owner, then
anything stored on it is eventually readable, any debug interface is eventually found, and
security has to rest on hardware features rather than obscurity. If it does not, you can be much
more relaxed, and pretending otherwise wastes money.</p>

<p>Then <b>entry points</b>: every network service that listens, the update channel, debug and
serial interfaces, removable media, and any interface exposed to a companion application. Each
one is a place code parses input from outside, which is where nearly all remote compromise
begins.</p>

<p>Rank by <b>consequence times likelihood</b> and spend in that order. The output should be a
short list of decisions, such as which interfaces are disabled in production, what is encrypted at
rest, where keys live and whether boot is verified, not a document nobody reads.</p>

<p>Two things reliably deserve a place near the top on a connected device: the <b>update
mechanism</b>, because it is both the highest-value target and the only way to fix everything
else, and <b>default credentials</b>, because shared or blank defaults have been behind more mass
compromises of consumer devices than any subtle vulnerability.</p>
`,
quiz: [
{ q: "What makes embedded threat modelling different from server security?",
o: ["Devices run less code", "The attacker frequently owns the hardware", "Networks are usually private", "Updates are less frequent"],
a: 1, why: "That invalidates assumptions imported from server security: anything on the device is eventually readable and any debug interface is eventually found." },
{ q: "How should mitigations be prioritised?",
o: ["By ease of implementation", "By consequence times likelihood", "By what the standard requires", "By which subsystem is newest"],
a: 1, why: "The output should be a short list of concrete decisions about interfaces, encryption, keys and boot, not a document nobody reads." },
{ q: "Why is the update mechanism a priority in almost every model?",
o: ["It is the largest component", "It is the highest-value target and the only way to fix everything else", "It runs with the fewest privileges", "It is hardest to test"],
a: 1, why: "Compromising updates gives an attacker permanent control of every device, and without a working channel no other vulnerability can ever be repaired." },
{ q: "What has caused more mass compromises of consumer devices than subtle vulnerabilities?",
o: ["Buffer overflows in network stacks", "Shared or blank default credentials", "Weak encryption algorithms", "Unpatched kernels"],
a: 1, why: "It requires no skill to exploit and scales to every unit shipped, which is why per-device credentials are worth the manufacturing effort." }
],
interview: {
q: "How would you approach security for a connected device that ships to consumers?",
a: "I would start with a threat model rather than a checklist, because without one the effort goes wherever it is easiest rather than where it matters. That means three lists. What is worth taking: user data, any credentials the device holds, the firmware if it has commercial value, and control of the device itself where misuse causes physical harm or reputational damage. Who might attack: someone remote who has never touched it, someone on the same local network, someone holding a unit with a soldering iron, and, importantly for a consumer device, the owner themselves, because if the owner is in the threat model then anything stored on the device is eventually readable and any debug interface is eventually found, and that changes what is worth doing. And how they get in: every listening network service, the update channel, debug and serial interfaces, removable media, and the interface to any companion app, because those are where code parses input from outside. Then I rank by consequence times likelihood and spend in that order. Two things end up near the top on almost any connected consumer product. The first is the update mechanism, because it is simultaneously the highest-value target, since compromising it gives permanent control of the whole fleet, and the only thing that lets me fix anything else after shipping, so if I get one thing right it is that. The second is credentials, because shared or blank defaults have caused more mass compromises of consumer devices than any clever vulnerability, and per-device credentials provisioned in manufacturing remove that entirely. After those I would look at secure boot, disabling debug interfaces in production images, and reducing what runs as root."
}
},

{
id: "os-secureboot",
track: "Operating Systems",
sub: "Security and lifecycle",
title: "Secure boot and the chain of trust",
mins: 22,
body: `
<p>Secure boot answers one question: is the software about to run the software we intended? Every
other protection on the device is worthless if an attacker can replace the kernel, because
whatever runs first controls everything after it.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="ROM verifying the bootloader, which verifies the kernel, which verifies the root filesystem, each stage anchored in the previous">
<rect class="bxa" x="24" y="26" width="632" height="42" rx="4"/>
<text class="th" x="40" y="52">ROM code: immutable, holds or hashes the root public key</text>
<rect class="bx" x="24" y="78" width="632" height="42" rx="4"/>
<text class="th" x="40" y="104">verifies and runs the bootloader</text>
<rect class="bx" x="24" y="128" width="632" height="42" rx="4"/>
<text class="th" x="40" y="154">bootloader verifies and runs the kernel plus device tree</text>
<rect class="bx" x="24" y="178" width="632" height="42" rx="4"/>
<text class="th" x="40" y="204">kernel verifies the root filesystem</text>
</svg>

<p>The chain has to start somewhere that cannot be modified, and that is <b>ROM</b> code in the
processor holding, or holding a hash of, a root public key. Each stage verifies the signature of
the next before transferring control. Break any link and everything after it is unverified,
which is why an unverified device tree is as dangerous as an unverified kernel: it tells the
kernel where the hardware is and what to do with it.</p>

<p>The root filesystem is the link people forget. Verifying the kernel while mounting an
unsigned, writable root leaves every binary on the device modifiable. The usual answer is a
<b>read-only root</b> whose integrity is verified block by block against a signed hash tree, so
tampering is detected on access rather than only at boot, with writable data confined to a
separate partition that contains no executables.</p>

<p><b>Key management</b> is where this becomes an engineering problem rather than a feature. The
private key signs every image you will ever ship, so it must live in a hardware security module
with controlled access, and the fuses that lock a device to a public key are usually
<b>one-way</b>. Blowing them incorrectly bricks the unit permanently, and the process has to
survive a factory doing it thousands of times.</p>

<p>Two practical requirements follow. You need <b>anti-rollback</b>, usually a monotonic version
counter in fuses, because otherwise an attacker installs a genuinely signed older image with a
known vulnerability. And you need a plan for <b>key rotation</b> or compromise, which usually
means multiple root keys provisioned at manufacture with the ability to revoke one.</p>

<p>Be clear about what this does not do. Secure boot proves <b>authenticity</b>, not
confidentiality: anyone can still read your firmware unless it is separately encrypted. And it
protects only the boot path, so a running system compromised through a network service is
unaffected by it. It is a foundation, not a solution.</p>
`,
quiz: [
{ q: "Why must the chain of trust start in ROM?",
o: ["ROM is faster to read", "It cannot be modified, so it can anchor the rest", "It is the only place large enough for a key", "It runs before power is stable"],
a: 1, why: "Each stage then verifies the next before transferring control, and breaking any link leaves everything after it unverified." },
{ q: "Why is an unverified device tree as dangerous as an unverified kernel?",
o: ["It is loaded into the same memory", "It tells the kernel where the hardware is and what to do with it", "It contains the root filesystem hash", "It is signed with the same key"],
a: 1, why: "Control over the hardware description is control over the system, so leaving it out of the chain undoes the verification of the kernel itself." },
{ q: "What protects the root filesystem in a properly built chain?",
o: ["Filesystem permissions", "A read-only root verified block by block against a signed hash tree", "Encrypting the partition", "Mounting it after the kernel has verified itself"],
a: 1, why: "Tampering is then detected on access rather than only at boot, with writable data confined to a separate partition containing no executables." },
{ q: "What does anti-rollback prevent?",
o: ["Downgrading to a signed older image with a known vulnerability", "Booting an unsigned image", "Modifying the bootloader", "Reading the firmware from flash"],
a: 1, why: "Without a monotonic version counter, every image you have ever signed remains valid forever, so patched vulnerabilities can be reintroduced." }
],
interview: {
q: "Walk me through implementing secure boot on an embedded Linux device.",
a: "The goal is that each stage verifies the next before handing over control, anchored in something that cannot be changed. That anchor is ROM code in the SoC which holds, or holds a hash of, a root public key, usually locked in fuses. The ROM verifies the first-stage bootloader, that verifies the main bootloader, and the bootloader verifies the kernel. Critically it must also verify the device tree, because the device tree tells the kernel where the hardware is and what to do with it, so an attacker who can change it controls the system just as thoroughly as one who can change the kernel, and it is the link people most often leave out. Then the root filesystem, which is the other commonly missed link: verifying the kernel and then mounting an unsigned writable root means every binary on the device is still modifiable. The usual answer is a read-only root verified block by block against a signed hash tree, so tampering is caught on access rather than only at boot, with all writable data on a separate partition that contains no executables. Around that there is the part that is really key management rather than boot. The signing key signs everything I will ever ship, so it lives in an HSM with controlled access and an audit trail, and the fuses that bind a device to a public key are usually one-way, so the factory process has to be right the first time or units are bricked. I would want anti-rollback with a monotonic counter, because otherwise an attacker just installs an older image I genuinely signed that has a known hole, and I would provision more than one root key so a compromise is survivable. And I would be honest about the limits: this gives authenticity, not confidentiality, so the firmware is still readable unless separately encrypted, and it protects the boot path only, so it does nothing about a running system compromised over the network."
}
},

{
id: "os-privilege",
track: "Operating Systems",
sub: "Security and lifecycle",
title: "Privilege, isolation and least authority",
mins: 22,
body: `
<p>Once an attacker has code running on the device, the only thing that limits the damage is how
much authority that code had. Almost every practical hardening measure is a way of reducing the
consequences of a compromise you did not prevent.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Layers of restriction from running as root down to a confined process with dropped capabilities, a filtered syscall set and its own namespaces">
<rect class="bx" x="24" y="26" width="632" height="40" rx="4"/>
<text class="th" x="40" y="52">root: unrestricted; a compromise is total</text>
<rect class="bx" x="24" y="76" width="632" height="40" rx="4"/>
<text class="th" x="40" y="102">unprivileged user: cannot touch what it does not own</text>
<rect class="bx" x="24" y="126" width="632" height="40" rx="4"/>
<text class="th" x="40" y="152">plus capabilities: only the specific powers actually needed</text>
<rect class="bxa" x="24" y="176" width="632" height="52" rx="4"/>
<text class="th" x="40" y="202">plus namespaces and a filtered syscall set</text>
<text class="ts" x="40" y="220">a different filesystem, network and process view; most syscalls simply absent</text>
</svg>

<p>The first move is simply <b>not root</b>. A daemon running as root that is compromised gives an
attacker the device; the same daemon as a dedicated unprivileged user gives them whatever that
user could reach, which should be almost nothing. This one change is worth more than most of the
sophisticated measures that follow it.</p>

<p>Where a process genuinely needs one privileged ability, <b>capabilities</b> split root's powers
into pieces, so a program that must bind a low port or configure an interface can hold that single
power without the rest. The common pattern is to start with what you need, do the privileged
setup, and drop everything else before handling any input.</p>

<p><b>Namespaces</b> change what a process can see: its own filesystem view, its own network
stack, its own process table. A compromised process in a restricted view cannot even name most of
the system. Combined with <b>control groups</b> for resource limits, that is what a container is,
and the same mechanism is available without any container runtime.</p>

<p><b>System call filtering</b> restricts what a process may ask the kernel to do at all. It is
particularly effective around code that parses untrusted input, since a media decoder or protocol
parser needs a small, enumerable set of calls, and everything else can be denied. It also reduces
exposure to kernel vulnerabilities, because a bug in a system call you cannot reach cannot be
used.</p>

<p>Mandatory access control goes further, describing what each program may touch as policy rather
than relying on file ownership. It is powerful and genuinely hard to get right, so it is worth it
where the exposure justifies the effort.</p>

<p>The unifying principle is <b>least authority</b>, and the practical version is to assume each
component will be compromised and ask what the attacker then holds. Applied to the components that
face the network first, it gives the best return of anything on this list.</p>
`,
quiz: [
{ q: "What single change most reduces the impact of a compromised daemon?",
o: ["Enabling system call filtering", "Running it as a dedicated unprivileged user rather than root", "Applying mandatory access control", "Putting it in a namespace"],
a: 1, why: "A root daemon that is compromised gives the attacker the device, whereas an unprivileged one gives them only what that user could reach." },
{ q: "What do capabilities provide?",
o: ["A restricted filesystem view", "Individual pieces of root's authority, granted separately", "Limits on CPU and memory", "A filtered set of system calls"],
a: 1, why: "The usual pattern is to hold what you need, perform the privileged setup, then drop everything else before handling any untrusted input." },
{ q: "Why is system call filtering effective around a parser?",
o: ["Parsers are slow, so the overhead is hidden", "A parser needs a small enumerable set of calls, so everything else can be denied", "It prevents buffer overflows", "It validates the input format"],
a: 1, why: "It also reduces exposure to kernel vulnerabilities, since a bug in a system call the process cannot reach cannot be used against it." },
{ q: "What is the practical form of the least authority principle?",
o: ["Deny by default in every configuration file", "Assume each component is compromised and ask what the attacker then holds", "Run everything in containers", "Remove all setuid binaries"],
a: 1, why: "Applied first to the components that face the network, it gives the best return of any hardening measure." }
],
interview: {
q: "A network-facing daemon on your device needs to open a raw socket. How do you limit the risk?",
a: "The requirement to open a raw socket is exactly why people leave things running as root, and it is exactly the case where capabilities are the right answer, because the daemon needs one specific power out of root's whole set. So I would run it as a dedicated unprivileged user and grant it only the network capability that permits raw sockets, either on the binary or through the service manager, and nothing else. Better still, I would structure it so that the privileged work happens once at start-up: open the socket, then drop the capability entirely before the process ever touches data from the network. That way, by the time any untrusted input is parsed, the process holds no special authority at all, and a compromise in the parser gets the attacker an unprivileged user with an already-open socket rather than the device. On top of that I would reduce what a compromise can reach. A restricted filesystem view through a mount namespace, so it can see its own configuration and nothing else. Its own process and IPC namespaces, so it cannot see or signal anything. Resource limits through control groups so it cannot exhaust memory or CPU and take the rest of the device down with it. And a system call filter, which is particularly valuable here because a daemon that reads a socket and parses a protocol needs a small, enumerable set of calls, so everything else can be denied, and that also removes most of the kernel's attack surface from reach. If the platform already has mandatory access control in place I would write a policy for it too, but I would put the effort into the unprivileged user, the dropped capability and the syscall filter first, because those three get most of the benefit."
}
},

{
id: "os-update",
track: "Operating Systems",
sub: "Security and lifecycle",
title: "Field updates: atomicity, rollback and not bricking the fleet",
mins: 24,
body: `
<p>An update mechanism has one hard requirement: a device must never be left unbootable, whatever
happens during the update. Power fails, storage fails, the network drops halfway, and the image
you signed turns out to be broken on one hardware revision.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Two system partitions with the bootloader selecting the active one, updating the inactive one and switching only after a successful boot">
<rect class="bxa" x="24" y="26" width="308" height="76" rx="4"/>
<text class="th" x="40" y="52">slot A: running</text>
<text class="ts" x="40" y="82">untouched throughout the update</text>
<rect class="bx" x="348" y="26" width="308" height="76" rx="4"/>
<text class="th" x="364" y="52">slot B: being written</text>
<text class="ts" x="364" y="82">verified after writing, before use</text>

<rect class="bx" x="24" y="114" width="632" height="46" rx="4"/>
<text class="th" x="40" y="142">switch the active slot in one atomic write, then reboot</text>
<rect class="bxa" x="24" y="170" width="632" height="58" rx="4"/>
<text class="th" x="40" y="196">boot once as a trial; the new system must confirm it is healthy</text>
<text class="ts" x="40" y="216">no confirmation, and the bootloader reverts to the other slot</text>
</svg>

<p>The standard answer is <b>two system slots</b>. The running system is never modified; the update
is written to the inactive slot, verified after writing, and only then does a single atomic write
change which slot the bootloader selects. A power failure at any point leaves a bootable
system.</p>

<p>The cost is storage, and the alternatives trade safety for space. A recovery partition means
updates happen from a minimal known-good system, which is smaller but leaves a window during which
the device is not running its real software. Updating a live filesystem in place is the cheapest
and the only one that can genuinely brick a device.</p>

<p>Writing the new image is only half of it. The device must <b>boot it once on trial</b>: the
bootloader marks the attempt, the new system starts, and something in userspace confirms it is
actually healthy before the slot is made permanent. Without confirmation the bootloader reverts on
the next reset. That is what saves you from an image that passes signature checks and then fails
on hardware you did not test.</p>

<p>What counts as healthy is a design decision worth making deliberately. Booting to a login
prompt is a weak test; a check that the radio associated, the sensors responded and the service
connected to its server is a real one, because the failures that matter are usually functional
rather than a kernel that will not start.</p>

<p><b>Data</b> is the part that cannot be dual-slotted. User data and configuration live on a
separate partition shared between slots, which means migrations must be forward compatible enough
that a rollback does not leave data the old version cannot read. That constraint is easy to
discover too late.</p>

<p>Fleet-wide, roll out in <b>stages</b> with monitoring between them, so a bad release reaches
one percent rather than everything. And confirm before you ship that the update path works from
every version still in the field, including the one that has been on a shelf since manufacture,
because that is the unit that will find the problem.</p>
`,
quiz: [
{ q: "Why is a dual-slot scheme the standard answer for field updates?",
o: ["It halves the download size", "The running system is never modified, so power loss always leaves it bootable", "It allows updating without a reboot", "It removes the need for signatures"],
a: 1, why: "The new image is written to the inactive slot, verified, and a single atomic write changes which slot boots. The cost is storage." },
{ q: "What does the trial boot protect against?",
o: ["A corrupted download", "An image that verifies correctly but fails on real hardware", "An interrupted write", "A rollback attack"],
a: 1, why: "The new system must actively confirm it is healthy, or the bootloader reverts on the next reset. Signature checks say nothing about whether it works." },
{ q: "What should a health check verify?",
o: ["That the kernel booted", "That the device's actual functions work, such as radio, sensors and connectivity", "That the filesystem mounted read-write", "That the version number incremented"],
a: 1, why: "The failures that matter after an update are usually functional rather than a kernel that will not start, so booting to a prompt is a weak test." },
{ q: "What constrains data migrations in a dual-slot design?",
o: ["Data must be stored in the slot being updated", "A rollback must not leave data the previous version cannot read", "Data cannot be modified during an update", "Migrations must run before the switch"],
a: 1, why: "Data lives on a shared partition that cannot be dual-slotted, so forward compatibility is what makes rollback safe, and it is easy to discover too late." }
],
interview: {
q: "Design an over-the-air update system for a fleet of embedded Linux devices.",
a: "The requirement I would hold above everything is that a device must never end up unbootable, whatever happens during the update, so I would use a dual-slot design. Two system partitions, the running one never modified, the update written to the inactive slot, verified after writing against its signature and hash, and then a single atomic write changes which slot the bootloader selects. Power loss at any point leaves a bootable system, because either the switch happened or it did not. The second essential piece is a trial boot. The bootloader marks the new slot as being tried, the device boots it, and something in userspace has to actively confirm health before the slot becomes permanent, otherwise the next reset reverts to the previous one. And I would make that health check meaningful rather than just reaching a login prompt, so it should confirm the things that actually matter: the radio associated, the sensors responded, the service reached its server. Signature verification tells me the image is authentic, not that it works on a hardware revision I did not test, and that is the failure this catches. The part that cannot be dual-slotted is data, which lives on a shared partition, so schema migrations have to be forward compatible enough that a rollback does not strand the old version with data it cannot read. That constraint is easy to find out about too late. Around all of that: signed images with anti-rollback so an attacker cannot install an old signed release with a known hole, resumable downloads because the network on these devices is unreliable, and a staged rollout with monitoring between stages so a bad release reaches one percent of the fleet rather than all of it. And before shipping I would test the update path from every version still in the field, including a unit that has been on a shelf since manufacture, because that is the one that finds the problem."
}
},

{
id: "os-hardening",
track: "Operating Systems",
sub: "Security and lifecycle",
title: "Hardening a production image",
mins: 20,
body: `
<p>The gap between a development image and a production one is larger than it looks. A development
system is built to be easy to get into, and shipping it unchanged has been the direct cause of a
large number of publicly embarrassing device compromises.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A development image with debug access, extra tools and open services, reduced to a production image with none of them">
<rect class="bx" x="24" y="26" width="308" height="196" rx="4"/>
<text class="th" x="40" y="52">development</text>
<text class="ts" x="40" y="82">serial console, root shell</text>
<text class="ts" x="40" y="106">SSH with a known password</text>
<text class="ts" x="40" y="130">compilers, debuggers, tools</text>
<text class="ts" x="40" y="154">verbose logging</text>
<text class="ts" x="40" y="178">writable root</text>
<text class="ts" x="40" y="202">JTAG enabled</text>

<rect class="bxa" x="348" y="26" width="308" height="196" rx="4"/>
<text class="th" x="364" y="52">production</text>
<text class="ts" x="364" y="82">console disabled or read only</text>
<text class="ts" x="364" y="106">no interactive login at all</text>
<text class="ts" x="364" y="130">nothing not needed at run time</text>
<text class="ts" x="364" y="154">logging without secrets</text>
<text class="ts" x="364" y="178">read-only verified root</text>
<text class="ts" x="364" y="202">debug locked by fuse</text>
</svg>

<p>Start by <b>removing</b> rather than configuring. Every package absent from the image is one
that cannot be vulnerable, cannot be misconfigured and does not need patching. Compilers,
interpreters, network utilities and debug tools are not needed at run time and each one is a
convenience for an attacker who lands on the device.</p>

<p><b>Interactive access</b> is the classic mistake: a serial console offering a root shell, or a
service with a password shared across the whole fleet. Production images should have no
interactive login, or access gated on a per-device credential provisioned at manufacture. Hardware
debug interfaces need locking through fuses, which is a manufacturing step, not a software
one.</p>

<p>Reduce what <b>listens</b>. Enumerate every open port and justify each one; anything present
only for development goes, and anything remaining should bind to the narrowest interface that
works rather than to everything.</p>

<p>Make the root filesystem <b>read-only</b> and verified, with writable data on a separate
partition mounted so that it cannot execute anything. That combination means a compromise cannot
persist by modifying a binary, which turns a permanent compromise into one a reboot clears.</p>

<p>Turn on what the toolchain and kernel already offer. Stack protection, position independence
and relocation hardening cost little; kernel options such as restricting access to kernel
addresses and hardening the allocators cost more but remove entire exploitation techniques.
Whatever is enabled, verify it on the shipped binaries rather than trusting the build flags.</p>

<p>Finally, do not let <b>logs</b> undo the rest. Debug logging that includes keys, tokens or
personal data is a leak the moment the log is uploaded, and verbose logging on flash also wears it
out, so production logging should be deliberately designed rather than inherited from
development.</p>
`,
quiz: [
{ q: "Why is removing packages the best first step?",
o: ["It reduces boot time", "Absent software cannot be vulnerable, misconfigured or need patching", "It reduces memory usage", "It simplifies the licence audit"],
a: 1, why: "Compilers, interpreters, network utilities and debug tools are not needed at run time and each is a convenience for an attacker who lands on the device." },
{ q: "What is the right approach to interactive access in production?",
o: ["A strong shared root password", "No interactive login, or access gated on a per-device credential", "SSH keys shared across the fleet", "Console access enabled but logged"],
a: 1, why: "Anything shared across the fleet is one disclosure away from applying to every unit, and hardware debug interfaces need locking by fuse in manufacturing." },
{ q: "What does a read-only verified root plus a non-executable data partition achieve?",
o: ["Faster filesystem access", "A compromise cannot persist by modifying a binary", "Encryption of user data", "Protection against physical attack"],
a: 1, why: "It turns a permanent compromise into one that a reboot clears, which changes the severity of a whole class of vulnerability." },
{ q: "Why is verbose production logging a problem beyond disk usage?",
o: ["It slows the system measurably", "Logs may contain keys, tokens or personal data and get uploaded", "It prevents log rotation", "It interferes with the watchdog"],
a: 1, why: "It also wears out flash, which is why production logging should be designed deliberately rather than inherited from the development image." }
],
interview: {
q: "What is the difference between your development image and the one you ship?",
a: "A development image is built to be easy to get into and a production one has to be hard, and shipping the first unchanged is behind a great many publicly embarrassing device compromises. The biggest single difference is what is not there. Every package I remove is one that cannot be vulnerable, cannot be misconfigured and never needs patching, so compilers, interpreters, debug tools and general-purpose network utilities all come out, because none are needed at run time and each one is a convenience for an attacker who has landed on the device. Then interactive access. Development has a serial console with a root shell and probably a login with a password everyone on the team knows. Production should have no interactive login at all, or access gated on a per-device credential provisioned in manufacturing, because anything shared across the fleet is one disclosure away from applying to every unit. Hardware debug interfaces like JTAG need locking by fuse, which is a manufacturing step rather than a software one, so it has to be planned for. I would enumerate every listening port and justify each, remove the development ones, and bind the rest to the narrowest interface that works. The root filesystem becomes read-only and integrity verified, with writable data on a separate partition mounted so nothing there can execute, which means a compromise cannot persist by editing a binary and a reboot clears it. I would enable the toolchain and kernel hardening options and then verify them on the actual shipped binaries rather than trusting the build flags. And I would look hard at logging, because verbose debug output that includes tokens or personal data becomes a leak as soon as logs are uploaded, and it wears out the flash as well."
}
},

{
id: "os-secrets",
track: "Operating Systems",
sub: "Security and lifecycle",
title: "Keys and secrets: where they live and how they get there",
mins: 22,
body: `
<p>Every connected device holds secrets: an identity to authenticate with, keys to encrypt data,
credentials for a service. Where they live and how they arrive determines whether extracting one
device's secret compromises that device or the entire fleet.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A ladder of storage options from a secret in the firmware image up to a key generated inside a secure element and never exported">
<rect class="bx" x="24" y="24" width="632" height="40" rx="4"/>
<text class="th" x="40" y="50">in the firmware image: readable by anyone with the image; shared by all units</text>
<rect class="bx" x="24" y="74" width="632" height="40" rx="4"/>
<text class="th" x="40" y="100">in a file on the device: per unit, but readable if the filesystem is read</text>
<rect class="bx" x="24" y="124" width="632" height="40" rx="4"/>
<text class="th" x="40" y="150">encrypted with a device-unique key from fuses: needs hardware access</text>
<rect class="bxa" x="24" y="174" width="632" height="52" rx="4"/>
<text class="th" x="40" y="200">generated inside a secure element and never exported</text>
<text class="ts" x="40" y="220">the private key does not exist anywhere it can be read, including by you</text>
</svg>

<p>The worst option is a secret <b>in the firmware image</b>. It is identical on every unit, and
anyone who obtains the image, from a download, from flash, or from a leak, has the key to the
whole fleet. Obfuscating it changes nothing except how long the extraction takes.</p>

<p>A <b>per-device</b> secret in a file is a large improvement, because extracting it compromises
one device rather than all of them. That property, that a break is contained, is worth more than
most of the sophistication that could be applied to protecting a shared secret.</p>

<p>Above that, a device-unique key held in fuses lets the secret be <b>encrypted at rest</b> in a
way that is bound to that specific chip, so a flash image copied to another unit is useless.</p>

<p>The strongest arrangement is a <b>secure element</b> or equivalent hardware where the private
key is generated on the device and never leaves it. The device proves its identity by asking the
hardware to sign a challenge, and the key does not exist in a readable form anywhere, including in
your factory. That also removes the problem of transporting keys to manufacturing at all.</p>

<p><b>Provisioning</b> is where this usually goes wrong in practice. A key generated on the device
and certified by a signing request removes any need to move private material through a factory, a
test computer, or a supplier's network, all of which are places you do not control and cannot
audit.</p>

<p>Whatever the storage, think about the <b>lifecycle</b>: how a key is rotated, what happens when
one is compromised, and how a device is decommissioned or transferred to a new owner. And apply
the same discipline to the mundane cases, because a token in a configuration file backed up to a
cloud service, or committed to a repository, is the way most real credentials are actually
lost.</p>
`,
quiz: [
{ q: "What is wrong with a secret embedded in the firmware image?",
o: ["It cannot be rotated", "It is identical on every unit, so extracting it compromises the fleet", "It increases image size", "It cannot be encrypted"],
a: 1, why: "Obfuscation changes only how long extraction takes, since anyone with the image, from a download or from flash, has the key to every device." },
{ q: "What is the main benefit of a per-device secret?",
o: ["It is harder to extract", "A break is contained to one device", "It can be longer", "It does not need protecting"],
a: 1, why: "Containment is worth more than most of the sophistication that could otherwise be applied to protecting a single shared secret." },
{ q: "What does a secure element with an on-device generated key give you?",
o: ["Faster cryptographic operations", "A private key that exists nowhere readable, including in your factory", "Automatic key rotation", "Encrypted storage for user data"],
a: 1, why: "The device proves identity by asking the hardware to sign a challenge, and it removes the problem of transporting private material to manufacturing." },
{ q: "Why generate the key on the device and certify it?",
o: ["It is computationally cheaper", "No private material passes through the factory, test rigs or suppliers", "It produces stronger keys", "It avoids needing a certificate authority"],
a: 1, why: "Those are all environments you do not control and cannot audit, and provisioning is where key handling most often goes wrong in practice." }
],
interview: {
q: "Where would you store the private key a device uses to authenticate to your cloud service?",
a: "The answer I would push for is that the key is generated inside a secure element or the SoC's own secure key storage, on the device, and never exported. The device proves its identity by asking that hardware to sign a challenge, so the private key does not exist in readable form anywhere, including in my own factory, and there is nothing to extract from flash even with physical access. It also solves provisioning, because instead of moving private key material through a factory, a test computer and possibly a supplier's network, none of which I control or can audit, the device generates its own key and I certify the corresponding public key with a signing request. If the hardware does not offer that, the ladder goes down from there and each step is a real trade. Next best is a per-device secret encrypted at rest with a device-unique key held in fuses, so a flash image copied to another unit is useless and an attacker needs hardware access to that specific device. Below that, a per-device secret in a file on a verified read-only system with restrictive permissions, which is still far better than the alternative because a break compromises one device instead of the fleet. The one thing I would refuse is a secret embedded in the firmware image, because it is identical on every unit and anyone who gets the image, from a download or by reading flash, holds the key to everything I have shipped, and obfuscating it only changes how long that takes. Whatever the storage, I would want the lifecycle designed too: how keys rotate, what the revocation path is when one is compromised, and what happens when a device changes owner or is decommissioned."
}
}

);
