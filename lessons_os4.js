// Operating Systems track, batch 4: embedded Linux.
//
// The half you were asked about and had nothing on. Device tree is the
// exception: you already know it cold from Zephyr, so that lesson is written as
// a contrast rather than from scratch.
//
// Code samples use &lt; &gt; &amp; escapes inside <pre> blocks.

LESSONS.push(

{
id: "os-dt",
track: "Operating Systems",
sub: "Embedded Linux",
title: "Device tree in Linux: the same idea, at run time",
mins: 22,
body: `
<p>You already know devicetree. You write overlays for Zephyr and you read
<code>status = "okay"</code> and <code>compatible</code> without thinking. The concept transfers
completely. <b>One thing is different, and everything else follows from it.</b></p>

<table>
<tr><th></th><th>Zephyr</th><th>Linux</th></tr>
<tr><td>When it is consumed</td><td><b>Build time</b></td><td><b>Run time</b></td></tr>
<tr><td>What ships</td><td>Nothing: it became constants</td><td>A <code>.dtb</code> blob</td></tr>
<tr><td>How code reads it</td><td>Generated macros, <code>DT_NODELABEL</code></td><td><code>of_*</code> calls at probe</td></tr>
<tr><td>A mistake shows up as</td><td>A compile error</td><td>A device that never appears</td></tr>
<tr><td>Changing the hardware description</td><td>Rebuild the firmware</td><td>Replace the blob, same kernel</td></tr>
</table>

<p>That last row is the reason Linux does it this way. One kernel binary boots hundreds of
different boards, because the board description arrives separately.</p>

<h3>The path a property takes</h3>

<ol>
<li>You write <code>.dts</code> and <code>.dtsi</code>, exactly as in Zephyr.</li>
<li><code>dtc</code> compiles them to a <code>.dtb</code>, a flattened binary blob.</li>
<li>U-Boot loads the blob into memory and passes the kernel a pointer to it.</li>
<li>The kernel unflattens it into a tree of <code>device_node</code> structures and keeps them.</li>
<li>For each node, the bus code looks for a driver whose <code>compatible</code> matches, and
calls that driver's <code>probe</code>.</li>
<li><code>probe</code> reads the node's properties with the <code>of_*</code> API.</li>
</ol>

<pre>
static const struct of_device_id mysensor_of_match[] = {
    { .compatible = "acme,mysensor" },
    { }                                  /* terminator, and it is required */
};
MODULE_DEVICE_TABLE(of, mysensor_of_match);

static int mysensor_probe(struct i2c_client *client)
{
    struct device_node *np = client-&gt;dev.of_node;
    u32 rate;

    if (of_property_read_u32(np, "sample-rate-hz", &amp;rate))
        rate = 100;                      /* absent is not an error */

    dev_info(&amp;client-&gt;dev, "sample rate %u Hz\\n", rate);
    return 0;
}
</pre>

<p>Compare that with Zephyr, where the same property becomes
<code>DT_PROP(DT_NODELABEL(mysensor), sample_rate_hz)</code> and is a compile-time constant. Same
description, same binding idea, resolved at opposite ends of the build.</p>

<h3>Overlays apply while the machine is running</h3>

<p>A <code>.dtbo</code> can be merged into the live tree, either by U-Boot before boot or through
configfs afterwards. That is how a Raspberry Pi turns on SPI or fits a HAT with a line in
<code>config.txt</code> and no kernel rebuild. Zephyr has no equivalent, because there is nothing
left at run time to modify.</p>

<h3>The failure mode is different, and worse</h3>

<p>In Zephyr a bad node label will not compile. In Linux the blob is fine, the kernel boots, and
your device simply is not there. Nothing fails loudly. The debugging sequence is:</p>

<ul>
<li><code>/proc/device-tree/</code>, or <code>dtc -I fs -O dts /proc/device-tree</code>, to see
the tree the kernel actually got rather than the one you think you wrote.</li>
<li><code>dmesg</code> for the driver's own complaints.</li>
<li><code>/sys/bus/*/devices/</code> to see whether the device was created at all.</li>
<li>If the node exists and no driver bound, the <code>compatible</code> string does not match any
<code>of_match_table</code>, which is nearly always a typo or a missing kernel config symbol.</li>
</ul>

<h3>Where it lives in a Yocto build</h3>

<p>The <code>.dts</code> sits in the kernel tree under <code>arch/arm64/boot/dts/</code>, or in a
BSP layer, and the machine configuration names it with <code>KERNEL_DEVICETREE</code>. That is
the join between the two things you were asked about.</p>
`,
quiz: [
{ q: "What is the essential difference from Zephyr's devicetree?",
o: ["Linux uses a different file syntax for it", "Linux consumes it at run time, from a blob", "Zephyr supports overlays and Linux does not", "Linux requires a binding for every node"],
a: 1, why: "Everything else follows. A runtime blob is why one kernel binary boots hundreds of boards, and why a mistake is a missing device rather than a compile error." },
{ q: "How does a Linux driver claim a device tree node?",
o: ["By its node label, looked up at probe time", "A compatible string in its of_match_table", "By registering against the node's address", "Through an entry in the kernel config"],
a: 1, why: "The bus code matches compatible against every driver's table and calls probe on the winner. A node with no match simply produces no device, silently." },
{ q: "Your device does not appear and nothing errors. Where do you look first?",
o: ["The kernel log for a driver failure", "/proc/device-tree, for the tree it got", "The .dts source you believe you wrote", "The bootloader's environment variables"],
a: 1, why: "The tree the kernel actually received is often not the one you edited. Checking what arrived separates a build or overlay problem from a driver problem straight away." },
{ q: "What does a device tree overlay let you do that Zephyr cannot?",
o: ["Describe the hardware without editing the board file", "Change the hardware description without a rebuild", "Set a property that the driver reads at probe", "Split the description across several files"],
a: 1, why: "A .dtbo merges into the live tree, which is how a Raspberry Pi enables SPI from config.txt. Zephyr has nothing at run time left to modify." }
],
interview: {
q: "You have used devicetree in Zephyr. How does the Linux version differ?",
a: "The concept is identical and one thing differs: when it is consumed. Zephyr compiles the devicetree to constants at build time, so there is no blob, no runtime parser, and DT_NODELABEL resolves during the build. Linux keeps it as a runtime artefact. The dts is compiled by dtc into a dtb, U-Boot loads that and hands the kernel a pointer, the kernel unflattens it into device_node structures, and then for each node the bus code looks for a driver whose of_match_table lists a matching compatible string and calls its probe. The driver reads properties there with the of_ API, so of_property_read_u32 rather than a generated macro. Everything else follows from that timing. It is why one kernel binary boots hundreds of boards, since the description arrives separately. It is why overlays exist, so a Raspberry Pi can enable SPI from config.txt with no kernel rebuild, which Zephyr cannot do because nothing is left to modify. And it changes the failure mode for the worse: in Zephyr a bad node label will not compile, whereas in Linux the blob is valid, the kernel boots, and your device simply is not there with nothing logged. So the first thing I check is /proc/device-tree to see the tree the kernel actually got rather than the one I think I wrote, then dmesg, then whether the device was created but unbound, which almost always means the compatible string does not match."
}
},

{
id: "os-driver",
track: "Operating Systems",
sub: "Embedded Linux",
title: "Character drivers, probe, and managed resources",
mins: 24,
body: `
<p>Userspace cannot touch hardware, so somebody writes a kernel driver. The structure is the same
every time, and once you have seen it once it stops being mysterious.</p>

<h3>The model: bus, driver, device</h3>

<p>The kernel keeps a list of <b>devices</b> (from the device tree, or discovered on a bus like
USB or PCI) and a list of <b>drivers</b>. When a device appears whose <code>compatible</code>
matches a driver's table, the kernel calls that driver's <code>probe</code> with the device. When
the device goes away, or the module is unloaded, it calls <code>remove</code>.</p>

<p><code>probe</code> is where everything happens: get the resources the device tree described,
map the registers, request the interrupt, and register whatever userspace interface you are
offering.</p>

<h3>devm_, which is the idea worth stealing</h3>

<p>Every acquisition in a driver can fail, and a bare-metal engineer's instinct is the goto
cleanup ladder. The kernel has something better: <b>managed resources</b>. Anything allocated with
a <code>devm_</code> prefix is tied to the device's lifetime and released automatically, in
reverse order, both when <code>probe</code> returns an error and when the device is removed.</p>

<pre>
static int mysensor_probe(struct platform_device *pdev)
{
    struct my_priv *priv;
    void __iomem *regs;
    int irq, ret;

    priv = devm_kzalloc(&amp;pdev-&gt;dev, sizeof(*priv), GFP_KERNEL);
    if (!priv)
        return -ENOMEM;                  /* nothing to unwind: nothing acquired */

    regs = devm_platform_ioremap_resource(pdev, 0);
    if (IS_ERR(regs))
        return PTR_ERR(regs);            /* priv is freed for you */

    irq = platform_get_irq(pdev, 0);
    if (irq &lt; 0)
        return irq;

    ret = devm_request_irq(&amp;pdev-&gt;dev, irq, my_isr, 0, "mysensor", priv);
    if (ret)
        return ret;                      /* priv and the mapping are freed */

    platform_set_drvdata(pdev, priv);
    return 0;
}
</pre>

<p>Every error path is a single <code>return</code>. No ladder, no forgotten <code>free</code>,
and no leak on the third failure branch that nobody ever executes. It is the pattern your host
tests exist to check for in ordinary C, handled by the framework instead.</p>

<h3>The character device interface</h3>

<p>The commonest way to expose something to userspace: a node in <code>/dev</code> backed by a
<code>file_operations</code> table.</p>

<pre>
static const struct file_operations my_fops = {
    .owner          = THIS_MODULE,
    .open           = my_open,
    .read           = my_read,
    .write          = my_write,
    .unlocked_ioctl = my_ioctl,
    .release        = my_release,
};
</pre>

<p>Those are the syscalls from the user-mode lesson arriving at your code. Every pointer in them
came from userspace, so every one is copied with <code>copy_to_user</code> and
<code>copy_from_user</code> rather than dereferenced.</p>

<p><code>read</code> and <code>write</code> suit streams of bytes. <code>ioctl</code> is the
escape hatch for everything that is not a stream: set a sample rate, trigger a conversion, read a
status word.</p>

<h3>Interrupts, and the split</h3>

<p>A kernel interrupt handler has the same constraints as your ISRs and one extra idea. The
<b>top half</b> runs with interrupts disabled, does the minimum, and schedules the rest. The
<b>bottom half</b> is a workqueue or threaded handler that runs later, in a context where it is
allowed to sleep. It is exactly the "ISR queues, task processes" pattern you already use, with
kernel names.</p>

<h3>When not to write one at all</h3>

<p>Plenty of hardware needs no driver from you. <code>spidev</code>, <code>i2c-dev</code> and
libgpiod expose generic buses to userspace, so a sensor you talk to with ordinary transfers can be
driven from a normal program. Write a kernel driver when you need <b>interrupt latency</b>,
<b>precise timing</b>, or to plug into a kernel subsystem so that <code>iio</code> or
<code>input</code> presents your part as a standard device.</p>
`,
quiz: [
{ q: "What calls a driver's probe function?",
o: ["The init process, during system startup", "The kernel, on matching a device to it", "The driver's own module_init function", "A userspace program opening its /dev node"],
a: 1, why: "The bus code pairs a device with a driver whose match table lists it, and probe is where the driver claims resources and registers its interface." },
{ q: "What does the devm_ prefix change?",
o: ["The allocation comes from a faster pool", "The resource is released automatically", "It makes the call safe from an interrupt", "It defers the work until after probe"],
a: 1, why: "Tied to the device's lifetime and unwound in reverse on a failed probe or on remove, so every error path becomes a single return with no cleanup ladder." },
{ q: "Why must a driver use copy_from_user on a pointer from userspace?",
o: ["That pointer lives in a different address space", "It could be null, unmapped, or kernel memory", "The data may be paged out to backing store", "The user could change it during the copy"],
a: 1, why: "Same reason as any syscall argument: everything from userspace is hostile until checked, and dereferencing it directly is how a driver becomes a privilege escalation." },
{ q: "When should you use spidev rather than write a kernel driver?",
o: ["Whenever the device sits on an SPI bus", "When ordinary transfers are all you need", "When the device has no device tree node", "When the driver would need to be a module"],
a: 1, why: "Write a kernel driver when you need interrupt latency, precise timing, or to present the part through a subsystem like iio. Plain transfers do not need one." }
],
interview: {
q: "Walk me through writing a simple Linux driver for an I2C sensor.",
a: "The kernel keeps a list of devices and a list of drivers, and when a device tree node's compatible string matches a driver's of_match_table it calls that driver's probe. Probe is where everything happens: allocate private state, map registers or take the i2c client, read configuration properties from the node with the of_ API, request the interrupt, and register the userspace interface. The thing I would highlight is devm_. Anything allocated with that prefix is tied to the device's lifetime and released automatically in reverse order, both when probe returns an error and when the device is removed, so every error path is a single return instead of a goto cleanup ladder. That is the same problem my host tests exist to catch in ordinary C, solved by the framework. For the userspace face, the usual route is a character device backed by a file_operations table, where open, read, write, ioctl and release are the syscalls arriving at my code, and every pointer in them is copied with copy_from_user rather than dereferenced because it came from userspace. Interrupts split into a top half that does the minimum with interrupts off and a bottom half in a workqueue or threaded handler that is allowed to sleep, which is the ISR-queues-and-task-processes pattern I already use. And I would say when not to write one: if all I need is ordinary transfers, spidev, i2c-dev or libgpiod let me do it from userspace, and I would only go into the kernel for interrupt latency, timing, or to present the part through a subsystem like iio."
}
},

{
id: "os-userspace",
track: "Operating Systems",
sub: "Embedded Linux",
title: "Reaching hardware from userspace: /dev, /sys and libgpiod",
mins: 20,
body: `
<p>You cannot write a peripheral register from a normal program. What you can do is ask the
kernel, and there are three doors.</p>

<h3>1. A character device in /dev</h3>

<p>A file you open, then <code>read</code>, <code>write</code> and <code>ioctl</code>. This is how
the generic bus drivers work, and they are the fastest route from "I have a sensor" to "I have a
reading":</p>

<ul>
<li><code>/dev/i2c-1</code> with <code>i2c-dev</code>: set the slave address with an ioctl, then
read and write.</li>
<li><code>/dev/spidev0.0</code>: full duplex transfers through <code>SPI_IOC_MESSAGE</code>.</li>
<li><code>/dev/gpiochip0</code> with <b>libgpiod</b>: request lines, set direction, read, write,
wait for edges.</li>
</ul>

<p>Use libgpiod and not the old <code>/sys/class/gpio</code> interface. That one is deprecated,
has no way to own a line, leaks state when a program crashes, and cannot do edge timestamps.
Plenty of tutorials still show it.</p>

<h3>2. sysfs, one value per file</h3>

<p><code>/sys</code> is the kernel's object model exposed as a filesystem. Each attribute is a
small text file you can <code>cat</code> and <code>echo</code> into.</p>

<pre>
$ cat /sys/class/thermal/thermal_zone0/temp
48312
$ cat /sys/bus/iio/devices/iio:device0/in_accel_x_raw
-1024
$ echo 1000000 &gt; /sys/bus/iio/devices/iio:device0/sampling_frequency
</pre>

<p>Perfect for configuration and slow status, and for shell scripts. Wrong for streaming: a
syscall per value, formatted as text, is not how you take a thousand samples a second.</p>

<h3>3. An existing subsystem</h3>

<p>The one people miss. If your part is a sensor, an <b>iio</b> driver probably exists, and then
it presents as a standard device with buffered reads, triggers and unit conversion already done.
Same for <code>input</code> for buttons, <code>hwmon</code> for temperature, <code>v4l2</code> for
cameras. Checking whether a subsystem already covers your part is worth ten minutes before you
write anything.</p>

<h3>The tempting wrong answer</h3>

<pre>
int fd = open("/dev/mem", O_RDWR | O_SYNC);
void *base = mmap(NULL, 0x1000, PROT_READ | PROT_WRITE,
                  MAP_SHARED, fd, 0x3F200000);
</pre>

<p>This maps physical memory into your process and lets you poke registers exactly as you would
bare metal. It is the first thing every embedded engineer reaches for, and it is almost always
the wrong choice: it needs root, it bypasses every driver that might also own that peripheral, it
is not portable across boards, the kernel has no idea you did it, and <code>/dev/mem</code> is
restricted or absent on a hardened kernel.</p>

<p>It is legitimate in exactly two situations: bringing up a board when no driver exists yet, and
poking at something to understand it. Not in a shipped product.</p>

<h3>Choosing</h3>

<table>
<tr><th>Need</th><th>Use</th></tr>
<tr><td>Occasional config or status</td><td>sysfs</td></tr>
<tr><td>Ordinary bus transfers</td><td>spidev, i2c-dev, libgpiod</td></tr>
<tr><td>A standard class of device</td><td>the subsystem: iio, input, hwmon, v4l2</td></tr>
<tr><td>Interrupt latency or hard timing</td><td>a kernel driver</td></tr>
<tr><td>Bring-up, throwaway</td><td>/dev/mem, then delete it</td></tr>
</table>
`,
quiz: [
{ q: "Why use libgpiod rather than /sys/class/gpio?",
o: ["It is considerably faster at toggling a single pin", "The sysfs interface is deprecated and leaks", "It works without the device tree node", "It is the only one that supports outputs"],
a: 1, why: "No line ownership, state left behind when a program crashes, and no edge timestamps. Plenty of tutorials still show it, which is why it keeps appearing in new code." },
{ q: "What is sysfs poorly suited to?",
o: ["Reading a temperature every now and again", "Streaming a thousand samples a second", "Setting a configuration value once", "Being read from a shell script"],
a: 1, why: "One syscall per value, formatted as text and parsed back. Fine for configuration and slow status, hopeless as a data path." },
{ q: "What is the first thing to check before writing any driver?",
o: ["Whether the part has a device tree binding", "Whether a subsystem already covers it", "Whether the bus driver is enabled", "Whether the kernel version supports it"],
a: 1, why: "If iio, input, hwmon or v4l2 already handles that class of part, you inherit buffered reads, triggers and unit conversion instead of writing them." },
{ q: "When is mmap of /dev/mem an acceptable answer?",
o: ["When you need the lowest possible latency", "During bring-up, and then deleted", "When running as root is acceptable anyway", "When no device tree node exists yet"],
a: 1, why: "It needs root, bypasses any driver that also owns the peripheral, is not portable, and is restricted on a hardened kernel. Useful to understand a part, not to ship." }
],
interview: {
q: "How would you read a sensor on an embedded Linux board?",
a: "First I would check whether a subsystem already covers it, because if it is a sensor there is very often an iio driver, and then it presents as a standard device with buffered reads, triggers and unit conversion already done rather than something I write. If not, and it is ordinary bus traffic, I would use the generic userspace interfaces: i2c-dev or spidev as a character device in /dev, and libgpiod for any lines. I would specifically avoid /sys/class/gpio, which is deprecated, has no concept of owning a line, leaves state behind when a program dies, and cannot timestamp edges, but still shows up in most tutorials. For occasional configuration or slow status, sysfs is ideal, one value per file, easy from a shell script, and completely wrong as a data path because it is a syscall per value formatted as text. I would only write a kernel driver if I needed interrupt latency, precise timing, or to plug into a subsystem so other software sees a standard device. And the thing I would flag is the tempting wrong answer: mmap of /dev/mem lets you poke registers exactly like bare metal, which is why everyone from my background reaches for it first, but it needs root, bypasses any driver that owns that peripheral, is not portable between boards, and is restricted on a hardened kernel. It is a bring-up and understanding tool, not something that ships."
}
},

{
id: "os-yocto",
track: "Operating Systems",
sub: "Embedded Linux",
title: "Yocto: layers, recipes and where your board fits",
mins: 24,
body: `
<p>The sentence to have ready: <b>Yocto is not a Linux distribution. It is a build system that
builds you one</b>, from source, for your specific board, containing only what you asked for.</p>

<p>That is why it exists. A general-purpose distro gives you a package manager and a gigabyte of
things you did not want. Yocto gives you a 30 MB image with your kernel, your device tree, your
application and nothing else, reproducibly, with a manifest of every licence in it.</p>

<h3>The five words</h3>

<table>
<tr><th>Term</th><th>What it is</th></tr>
<tr><td><b>Recipe</b> (<code>.bb</code>)</td><td>How to build one thing: where to fetch it, how to configure, compile and install it</td></tr>
<tr><td><b>Layer</b> (<code>meta-*</code>)</td><td>A directory of related recipes. Layers stack, and later ones can modify earlier ones</td></tr>
<tr><td><b>BSP layer</b></td><td>The board support layer, usually from the silicon vendor: kernel, bootloader, machine definitions</td></tr>
<tr><td><b>Machine</b></td><td>Which board you are building for. Sets the architecture, the kernel and the device tree</td></tr>
<tr><td><b>bitbake</b></td><td>The tool that reads all of it, works out the dependency graph, and builds</td></tr>
</table>

<h3>A recipe, in the shape they all take</h3>

<pre>
SUMMARY = "Sensor logging daemon"
LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://LICENSE;md5=..."      /* enforced, not optional */

SRC_URI = "git://github.com/acme/sensord.git;branch=main;protocol=https"
SRCREV = "a1b2c3d4..."                            /* pinned, not floating */

DEPENDS = "libgpiod"                              /* needed to BUILD */
RDEPENDS:\${PN} = "bash"                           /* needed to RUN */

inherit cmake

do_install:append() {
    install -d \${D}\${systemd_system_unitdir}
    install -m 0644 \${S}/sensord.service \${D}\${systemd_system_unitdir}
}
</pre>

<p>Two details there are the ones that catch people. <b>Licence checksums are enforced</b>: if
upstream changes its LICENSE file the build fails, deliberately, because you have a legal
obligation to know. And <b>DEPENDS and RDEPENDS are different</b>: build-time against run-time,
and confusing them gives you either a failed build or an image missing a library at run time.</p>

<h3>bbappend: changing someone else's recipe without forking it</h3>

<p>This is the mechanism that makes layers work. To add a patch or a config fragment to the
vendor's kernel recipe, you do not edit their layer. You write
<code>linux-yourvendor_%.bbappend</code> in your own layer and it is merged in. Your changes stay
yours, and their layer can be updated underneath you.</p>

<h3>Where the device tree joins</h3>

<p>In your machine configuration:</p>

<pre>
KERNEL_DEVICETREE = "acme/acme-board.dtb acme/acme-board-rev-b.dtb"
</pre>

<p>The <code>.dts</code> lives in the kernel tree or arrives via a <code>bbappend</code> and a
patch. That is the join between Yocto and the other thing you were asked about.</p>

<h3>The honest costs</h3>

<ul>
<li><b>The first build takes hours</b> and wants 50 to 100 GB of disk. It builds a cross compiler
before it builds anything of yours.</li>
<li><b>The learning curve is genuinely steep.</b> The error messages assume you already know the
architecture.</li>
<li><b>Buildroot is the alternative</b>, and often the right one: a Kconfig menu and a Makefile,
comprehensible in an afternoon, builds in twenty minutes. It is weaker at multiple products
sharing layers, package management and licence compliance at scale, which is exactly where Yocto
earns its complexity.</li>
</ul>

<p>If asked to choose: Buildroot for one product and a small team, Yocto when you have several
boards, a vendor BSP to track, and a legal obligation to produce a licence manifest.</p>
`,
quiz: [
{ q: "What is Yocto?",
o: ["A Linux distribution aimed at embedded", "A build system that builds you a distribution", "A package manager for cross-compiled software", "A kernel configuration and patching tool"],
a: 1, why: "It builds a bespoke image from source for your board, containing only what you asked for, with a licence manifest. That distinction is the first thing an interviewer listens for." },
{ q: "How do you add a patch to the vendor's kernel recipe?",
o: ["Edit the recipe inside their BSP layer", "A bbappend in your own layer", "Copy the whole recipe into your layer", "Apply it by hand after the build"],
a: 1, why: "Your changes stay in your layer and theirs can be updated underneath you. Editing their layer works until the first BSP update overwrites it." },
{ q: "What is the difference between DEPENDS and RDEPENDS?",
o: ["One is for libraries, the other for tools", "Build-time against run-time requirements", "One is mandatory and the other advisory", "One applies to the host, one to the target"],
a: 1, why: "Confusing them gives you either a build that cannot find a header or an image that is missing a shared library at run time, which is far harder to diagnose." },
{ q: "Why does Yocto fail the build when a LICENSE file changes upstream?",
o: ["To keep the source checksum reproducible", "Because you must know your licence position", "It prevents a stale download being reused", "It ensures the SRCREV pin is still valid"],
a: 1, why: "LIC_FILES_CHKSUM is a deliberate tripwire. An upstream project relicensing under your feet is a legal problem, so the build stops rather than shipping it quietly." },
{ q: "When is Buildroot the better choice than Yocto?",
o: ["One product, small team, simple image", "Whenever the target has limited storage", "When the vendor supplies no BSP layer", "For any project without licence obligations"],
a: 0, why: "A Kconfig menu and a Makefile, understandable in an afternoon and built in twenty minutes. Yocto earns its complexity across several boards, a vendor BSP to track, and licence compliance at scale." }
],
interview: {
q: "What is Yocto and when would you use it?",
a: "Yocto is not a distribution, it is a build system that builds you one from source for your specific board, containing only what you asked for. That is the distinction I would lead with. A general-purpose distro hands you a package manager and a gigabyte you did not want; Yocto gives you a 30 MB image with your kernel, your device tree and your application, reproducibly, with a manifest of every licence in it. The vocabulary is small. A recipe is a .bb file saying how to build one thing: where to fetch it, how to configure, compile and install. A layer is a directory of related recipes, and layers stack so later ones can modify earlier ones. The BSP layer comes from the silicon vendor with the kernel, bootloader and machine definitions. The machine setting says which board, and bitbake works out the dependency graph and builds it. The mechanism that makes it usable is bbappend: to patch the vendor's kernel recipe I do not edit their layer, I write a bbappend in mine, so my changes stay mine and their layer can update underneath me. Two things catch people out: licence checksums are enforced, so the build deliberately fails if upstream relicenses, and DEPENDS versus RDEPENDS is build-time against run-time, which if confused gives you an image missing a library at run time. On when to use it, I would be honest that the first build takes hours and wants most of a hundred gigabytes, and that Buildroot is often the right answer for one product and a small team. Yocto earns its complexity when you have several boards, a vendor BSP to track, and a legal obligation to produce a licence manifest."
}
},

{
id: "os-linuxdebug",
track: "Operating Systems",
sub: "Embedded Linux",
title: "Debugging a Linux target, when you are used to a debugger",
mins: 22,
body: `
<p>On a Cortex-M you halt the core and read the entire machine: every register, all of RAM, the
call stack, the peripheral state. One tool, complete truth, stopped world.</p>

<p>On Linux you almost never do that. You have hundreds of threads, the kernel will not stop for
you, and halting the CPU stops things that must not stop. So the discipline inverts:
<b>you observe a running system instead of freezing a stopped one</b>. In exchange you get tooling
far beyond anything on a microcontroller.</p>

<h3>strace first, almost always</h3>

<p>Every interesting thing a program does eventually becomes a system call, and
<code>strace</code> prints them with arguments and results.</p>

<pre>
$ strace -f -e trace=openat,read,ioctl ./sensord
openat(AT_FDCWD, "/dev/i2c-1", O_RDWR)  = 3
ioctl(3, I2C_SLAVE, 0x28)               = 0
read(3, "", 4)                          = -1 EIO (Input/output error)
</pre>

<p>Three lines and you know it opened the right bus, addressed the right device, and the transfer
failed on the wire. That is a scope decision made from a terminal, and there is no bare-metal
equivalent at all.</p>

<h3>The rest of the kit</h3>

<table>
<tr><th>Question</th><th>Tool</th></tr>
<tr><td>What is it asking the kernel to do?</td><td><code>strace</code></td></tr>
<tr><td>What did the kernel or a driver say?</td><td><code>dmesg</code>, <code>journalctl</code></td></tr>
<tr><td>Where is the time going?</td><td><code>perf top</code>, <code>perf record</code></td></tr>
<tr><td>What is this process doing right now?</td><td><code>/proc/&lt;pid&gt;/status</code>, <code>stack</code>, <code>fd/</code></td></tr>
<tr><td>Why did it crash?</td><td>a coredump, then <code>gdb</code></td></tr>
<tr><td>Memory errors and leaks</td><td><code>valgrind</code>, or an ASan build</td></tr>
<tr><td>What is the kernel doing?</td><td><code>ftrace</code>, <code>trace-cmd</code></td></tr>
<tr><td>Which library does it want?</td><td><code>ldd</code></td></tr>
</table>

<h3>gdb still exists, just differently</h3>

<p>Run <code>gdbserver :2345 ./prog</code> on the target and connect a cross gdb from your
machine. It works, and it is the right tool for a logic bug in one process. It is the wrong tool
for anything involving timing, other processes, or the kernel, because stopping one process
changes the system around it.</p>

<h3>Reading a kernel oops</h3>

<p>The equivalent of your HardFault dump. It prints the faulting address, the registers, and a
call trace with symbol names and offsets:</p>

<pre>
Unable to handle kernel NULL pointer dereference at virtual address 0000000000000018
Call trace:
 mysensor_read+0x2c/0x120 [mysensor]
 ...
</pre>

<p><code>mysensor_read+0x2c</code> is the same information as a stacked PC on Cortex-M, and it is
resolved the same way: against the build that produced it. <code>scripts/decode_stacktrace.sh</code>
turns it into file and line, given the matching <code>vmlinux</code> and modules. Keep them, for
the same reason you keep the ELF.</p>

<h3>What actually transfers</h3>

<p>The method is unchanged. Reproduce it, make it happen faster, bisect the system, check what
the code actually did rather than what you believe it does. What changes is that
<code>printf</code> is now free, logs persist across reboots, you can attach to a process that is
already misbehaving, and you can ask the kernel to trace itself. Most bare-metal instincts survive
the move. The one to unlearn is reaching for the debugger first.</p>
`,
quiz: [
{ q: "Why can you not usually debug a Linux target by halting the core?",
o: ["The debug port is disabled in production", "It stops things that must not stop", "The MMU makes the addresses meaningless", "gdb cannot attach to a running kernel"],
a: 1, why: "Hundreds of threads, a kernel that will not wait, and peripherals still running. The discipline inverts to observing a live system rather than freezing a stopped one." },
{ q: "What does strace show you?",
o: ["Every single function the program calls into", "The system calls, with arguments and results", "The instructions the CPU actually executed", "Which shared libraries it has loaded"],
a: 1, why: "Library calls are invisible, which is why the output is far shorter than the source suggests. Three lines usually tell you whether it opened the right device and what the transfer returned." },
{ q: "What is a kernel oops the equivalent of?",
o: ["A watchdog reset on a microcontroller", "A HardFault dump on a Cortex-M", "An assertion failure in userspace", "A segmentation fault in a process"],
a: 1, why: "Faulting address, registers and a call trace, resolved against the build that produced it. decode_stacktrace.sh needs the matching vmlinux, for the same reason you keep the ELF." },
{ q: "When is gdb the wrong tool on a Linux target?",
o: ["Whenever more than one process is running", "For anything involving timing or the kernel", "When the binary was built without symbols", "If the target has no network connection"],
a: 1, why: "Stopping one process changes the system around it. It remains the right tool for a logic bug inside a single process, which is most of what it is used for." }
],
interview: {
q: "How does debugging embedded Linux differ from debugging a microcontroller?",
a: "On a Cortex-M I halt the core and read the whole machine: registers, all of RAM, the call stack, peripheral state. One tool, complete truth, stopped world. On Linux I almost never do that, because there are hundreds of threads, the kernel will not stop for me, and halting the CPU stops things that must not stop. So the discipline inverts to observing a running system rather than freezing a stopped one, and in exchange the tooling is far beyond anything on a microcontroller. I would reach for strace first almost every time, because everything interesting eventually becomes a system call and strace prints them with arguments and results. Three lines will tell me it opened the right bus, addressed the right device, and the read came back EIO, which is a scope decision made from a terminal. After that dmesg and journalctl for what the kernel and drivers said, perf for where the time goes, /proc for what a process is doing right now, ftrace when the question is about the kernel itself, and a coredump plus gdb for a crash. gdb still exists, through gdbserver on the target and a cross gdb on my machine, and it is right for a logic bug in one process and wrong for anything involving timing or other processes. A kernel oops is the same artefact as a HardFault dump: faulting address, registers, a call trace with symbol offsets, resolved with decode_stacktrace.sh against the matching vmlinux, which you keep for the same reason you archive the ELF. The method does not really change. What changes is that printf is free, logs survive a reboot, and I should stop reaching for the debugger first."
}
}

);
