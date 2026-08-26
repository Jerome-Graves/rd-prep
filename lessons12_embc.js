// Embedded C track, batch 12: Zephyr.
// The RTOS Bermondsey markets and the one the Meowtion collar runs on.
// Code samples use &lt; &gt; &amp; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-z-model",
track: "Embedded C",
sub: "Zephyr",
title: "Zephyr's mental model, and how it differs",
mins: 24,
body: `
<p>Zephyr is not just an RTOS. The kernel is a small part of it; the thing that actually changes
how you work is that <b>the hardware description and the feature selection both happen at build
time</b>, outside your C code.</p>

<h3>What you get</h3>
<ul>
<li>A preemptive kernel with threads, semaphores, mutexes, message queues and work queues.</li>
<li>A driver model, so <code>i2c_write_read()</code> is the same call on Nordic, ST and
Espressif silicon.</li>
<li>Subsystems: Bluetooth, networking, filesystems, logging, shell, settings, device firmware
update.</li>
<li>A build system that composes all of it from configuration rather than from code you
write.</li>
</ul>

<h3>The two configuration systems, and the split that confuses everyone</h3>

<svg class="fig" viewBox="0 0 680 384" role="img" aria-label="Devicetree describes the hardware and Kconfig selects the software; both are consumed by one CMake configure step that generates headers before the C build begins">
<rect class="bxa" x="30" y="40" width="290" height="52" rx="4"/>
<text class="th" x="46" y="64">Devicetree</text>
<text class="ts" x="46" y="82">what hardware exists, and how it is wired</text>
<rect class="bx" x="30" y="100" width="290" height="100" rx="4"/>
<text class="ts" x="46" y="126">.dts board, .dtsi SoC, .overlay you</text>
<text class="ts" x="46" y="144">which UART, which pins, which sensor</text>
<text class="ts" x="46" y="162">I2C addresses and clock sources</text>
<text class="ts" x="46" y="180">status = okay, or it is not built</text>
<rect class="bxa" x="360" y="40" width="290" height="52" rx="4"/>
<text class="th" x="376" y="64">Kconfig</text>
<text class="ts" x="376" y="82">which software is compiled in</text>
<rect class="bx" x="360" y="100" width="290" height="100" rx="4"/>
<text class="ts" x="376" y="126">prj.conf, and the CONFIG_ symbols</text>
<text class="ts" x="376" y="144">CONFIG_BT, CONFIG_LOG, CONFIG_I2C</text>
<text class="ts" x="376" y="162">stack sizes and buffer counts</text>
<text class="ts" x="376" y="180">features, never wiring</text>
<path class="arr" d="M175 200 L175 228" fill="none" marker-end="url(#arrow)"/>
<path class="arr" d="M505 200 L505 228" fill="none" marker-end="url(#arrow)"/>
<rect class="bx" x="30" y="234" width="620" height="52" rx="4"/>
<text class="th" x="46" y="258">One CMake configure step</text>
<text class="ts" x="46" y="276">generates devicetree_generated.h and autoconf.h, then the C build begins</text>
<path class="arr" d="M340 286 L340 304" fill="none" marker-end="url(#arrow)"/>
<rect class="bxa" x="30" y="310" width="620" height="54" rx="4"/>
<text class="th" x="46" y="334">No CONFIG_ symbol will make a missing or disabled node appear</text>
<text class="ts" x="46" y="354">so the first question on a Zephyr build error is nearly always: is the node enabled?</text>
</svg>
<p class="figcap">Hardware on the left, software on the right. Almost every early Zephyr
frustration is trying to solve a left-hand problem with a right-hand tool.</p>

<h3>Devicetree is build-time, not runtime</h3>
<p>This is the difference from Linux that catches people. Linux parses a device tree blob at
boot. Zephyr <b>compiles it into constants</b>: <code>DT_NODELABEL(uart0)</code> resolves to a
token during the build, and what reaches the binary is a plain address and a config struct.</p>
<p>The consequences are all good. There is no parser in the image, no runtime cost, and a
mistake in the devicetree is a compile error rather than a boot failure. The cost is that
nothing about the hardware can change after the build.</p>

<h3>Against bare metal</h3>
<pre>bare metal              Zephyr
-------------------     -----------------------------
write the register      pick the driver in Kconfig,
init sequence           describe the pins in devicetree

vendor HAL calls        a portable API: i2c, spi, gpio,
in your driver          adc, pwm, sensor

your own main loop      threads, work queues, timers

printf over UART        LOG_INF, with backends and levels</pre>
<p>The trade is real: you give up direct knowledge of what the silicon is doing, and you gain
portability, a large tested subsystem library, and someone else's driver bugs instead of your
own.</p>

<h3>Against FreeRTOS</h3>
<p>FreeRTOS is a kernel you add to a vendor SDK. Zephyr is the whole system, including the
build, the configuration, the drivers and the subsystems.</p>
<p>Practically: with FreeRTOS you still write against the STM32 HAL or the Nordic SDK, so
porting means rewriting the driver layer. With Zephyr the driver layer is the thing that
ports.</p>
<p>The other difference worth stating in an interview is <b>priority direction</b>. FreeRTOS
counts up, so a larger number is more urgent. Zephyr counts the other way: <b>lower number
means higher priority</b>, and negative priorities are cooperative threads that will not be
preempted.</p>

<h3>What the tree looks like</h3>
<pre>my_app/
  CMakeLists.txt       find_package(Zephyr), your sources
  prj.conf             Kconfig choices for this application
  app.overlay          devicetree changes for this application
  boards/
    nrf52840dk_nrf52840.overlay   per-board version of the above
  src/
    main.c
  west.yml             only if this is a manifest repository</pre>
<p>Four files decide almost everything: <code>CMakeLists.txt</code>, <code>prj.conf</code>, the
overlay, and the board you pass to <code>west build -b</code>.</p>

<h3>The honest summary for an interview</h3>
<p>Zephyr moves work from runtime C into build-time configuration. That makes the image smaller
and the failures earlier, and it means a large share of your debugging time is spent on the
build system rather than on the code. Anyone who tells you the learning curve is gentle has not
used it.</p>
`,
quiz: [
{ q: "What is the division of responsibility between devicetree and Kconfig?",
o: ["Devicetree is for drivers, Kconfig for the application", "Devicetree describes the hardware and its wiring; Kconfig selects which software is compiled in", "They are interchangeable", "Kconfig is for the board, devicetree for the SoC"],
a: 1, why: "Almost every early Zephyr frustration is trying to fix a hardware-description problem with a CONFIG_ symbol. No Kconfig setting will make a node that is missing or not status okay appear." },
{ q: "How does Zephyr's devicetree differ from Linux's?",
o: ["It uses a different syntax", "Zephyr compiles it to constants at build time; there is no blob and no runtime parser", "Zephyr parses it at boot", "It is stored in flash separately"],
a: 1, why: "So DT_NODELABEL resolves during the build, a mistake is a compile error rather than a boot failure, and nothing about the hardware can change after the build." },
{ q: "Which way do Zephyr thread priorities run?",
o: ["Higher number is more urgent, as in FreeRTOS", "Lower number is more urgent, and negative values are cooperative", "All threads are equal", "Priority is set by creation order"],
a: 1, why: "The opposite of FreeRTOS, and a reliable source of bugs when porting. Negative priorities are cooperative threads, which run until they yield or block rather than being preempted." },
{ q: "What is the main structural difference from FreeRTOS?",
o: ["Zephyr is faster", "FreeRTOS is a kernel added to a vendor SDK; Zephyr is the whole system including build, config, drivers and subsystems", "FreeRTOS has no threads", "Zephyr has no scheduler"],
a: 1, why: "Which is why porting a FreeRTOS project means rewriting the driver layer against a different vendor HAL, and porting a Zephyr project mostly means changing the board argument." }
],
interview: {
q: "Sell me on Zephyr, and then tell me what is wrong with it.",
a: "The thing that actually changes how you work is that both the hardware description and the feature selection move out of C and into build-time configuration. Devicetree says what hardware exists and how it is wired, Kconfig says which software gets compiled in, and one CMake configure step turns both into generated headers before any C is built. Unlike Linux there is no blob and no runtime parser: it compiles to constants, so there is no runtime cost and a mistake is a compile error rather than a boot failure. What you gain is a portable driver API, so i2c_write_read is the same call on Nordic, ST or Espressif, plus large tested subsystems for Bluetooth, networking, filesystems, logging and DFU that you would otherwise be writing or buying. Against FreeRTOS the difference is structural: FreeRTOS is a kernel you add to a vendor SDK, so you are still writing against the ST HAL and porting means rewriting the driver layer, whereas in Zephyr the driver layer is the part that ports. What is wrong with it is that the learning curve is steep and front-loaded, and a large share of your debugging time goes on the build system rather than on your code. You also inherit someone else's driver bugs instead of your own, which is usually a good trade but not always, and when a peripheral does something unusual you are further from the registers than you would like. I would also say the priority direction catches people porting from FreeRTOS, because Zephyr counts the other way and negative priorities are cooperative."
}
},

{
id: "emb-z-devicetree",
track: "Embedded C",
sub: "Zephyr",
title: "Devicetree: describing the board",
mins: 26,
body: `
<p>Devicetree is where you say what hardware exists and how it is connected. Getting fluent with
it is most of what makes Zephyr feel manageable.</p>

<h3>The file layers</h3>
<pre>.dtsi     SoC and common fragments, shipped by Zephyr
.dts      the board, shipped with the board port
.overlay  yours: changes and additions for this application</pre>
<p>They compose in that order, so an overlay does not replace the board file, it patches it. That
is why an overlay is usually only a few lines.</p>

<h3>A node, and what it means</h3>
<pre>&amp;i2c0 {
    status = "okay";
    clock-frequency = &lt;I2C_BITRATE_FAST&gt;;

    lis2dh: lis2dh@19 {
        compatible = "st,lis2dh";
        reg = &lt;0x19&gt;;
        irq-gpios = &lt;&amp;gpio0 30 GPIO_ACTIVE_HIGH&gt;;
    };
};</pre>
<ul>
<li><code>&amp;i2c0</code> reopens an existing node by label to modify it.</li>
<li><code>compatible</code> is the binding name. It is what selects the driver, and it must
match a binding Zephyr knows about.</li>
<li><code>reg</code> is the address on the parent bus. For I2C that is the slave address; for
memory-mapped peripherals it is the base address and size.</li>
<li><code>lis2dh:</code> is a node label, which is how you refer to it from C.</li>
<li><code>status</code> decides whether it is built at all.</li>
</ul>

<h3>status = "okay" is the one to remember</h3>
<p>A node that is not <code>status = "okay"</code> generates nothing. No device instance, no
driver, and <code>DT_NODELABEL()</code> on it produces a token that does not resolve.</p>
<p>The resulting error names a generated symbol and looks nothing like the cause:</p>
<pre>error: 'DT_N_S_soc_S_i2c_40003000_S_lis2dh_19_ORD'
       undeclared</pre>
<p>When you see a <code>DT_N_...</code> symbol undeclared, the question is always the same: does
that node exist, and is it enabled?</p>

<h3>Getting from devicetree to C</h3>
<pre>DT_NODELABEL(lis2dh)     by the label in the tree
DT_ALIAS(led0)           by an alias, which boards define
                         so portable samples work
DT_CHOSEN(zephyr_console) by role
DT_PATH(soc, i2c_40003000) by full path, rarely used

DEVICE_DT_GET(DT_NODELABEL(i2c0))
    -&gt; const struct device *, resolved at build time</pre>
<p>Aliases are what make a sample work on any board: the board file says which physical LED is
<code>led0</code>, and the sample never mentions a pin.</p>

<h3>The GPIO spec pattern, worth memorising</h3>
<pre>#define LED0 DT_ALIAS(led0)
static const struct gpio_dt_spec led =
    GPIO_DT_SPEC_GET(LED0, gpios);

if (!gpio_is_ready_dt(&amp;led)) { return -ENODEV; }
gpio_pin_configure_dt(&amp;led, GPIO_OUTPUT_ACTIVE);
gpio_pin_toggle_dt(&amp;led);</pre>
<p>The <code>_dt</code> suffix means the function takes the whole spec, so the device, the pin
number and the flags travel together. It removes an entire class of bug where the pin and the
port drift apart.</p>
<p><code>GPIO_ACTIVE_LOW</code> in the devicetree is handled for you: setting the pin
<b>active</b> lights the LED regardless of which way it is wired. That is the point of the
abstraction, and it is why you should not use the raw functions unless you mean to.</p>

<h3>Compile-time questions about the tree</h3>
<pre>#if DT_NODE_HAS_STATUS(DT_NODELABEL(lis2dh), okay)
    /* only compiled when the sensor is present */
#endif

DT_PROP(DT_NODELABEL(i2c0), clock_frequency)
DT_PROP_OR(node, my_prop, 42)          /* default */
DT_NUM_INST_STATUS_OKAY(st_lis2dh)     /* how many? */</pre>
<p>Property names become C identifiers with hyphens turned into underscores, which is why
<code>clock-frequency</code> is read as <code>clock_frequency</code>.</p>

<h3>Overlays in practice</h3>
<p>Three places Zephyr looks, in increasing specificity:</p>
<pre>app.overlay                       any board
boards/nrf52840dk_nrf52840.overlay  that board only
-- DEXTRA_DTC_OVERLAY_FILE=...    explicit, for CI or variants</pre>
<p>When an overlay appears not to apply, check that the build actually picked it up:</p>
<pre>build/zephyr/zephyr.dts        the final merged tree
build/zephyr/include/generated/devicetree_generated.h</pre>
<p>Reading the merged tree settles the argument in seconds, and it is the first thing to do
rather than the last.</p>

<h3>The pinctrl step people forget</h3>
<p>On most modern SoCs, saying a peripheral is <code>okay</code> is not enough: you also have to
say which pins it uses, in a <code>pinctrl</code> node, and reference it from the peripheral.
A UART that is enabled but has no pinctrl entry builds cleanly and outputs nothing.</p>
`,
quiz: [
{ q: "What does <code>status = \"okay\"</code> control?",
o: ["Whether the driver reports errors", "Whether the node is built at all: without it no device instance is generated", "The initialisation order", "Whether the node is documented"],
a: 1, why: "It is why a DT_N_... symbol undeclared error means 'does that node exist and is it enabled', not anything about your C. It is the single most common Zephyr build failure." },
{ q: "What does <code>compatible</code> do in a devicetree node?",
o: ["Records the manufacturer", "Names the binding, which is what selects the driver", "Sets the bus speed", "Declares backwards compatibility"],
a: 1, why: "It must match a binding Zephyr knows about, either in the tree or in your own dts/bindings directory. A typo here gives you a node with no driver behind it." },
{ q: "Why prefer <code>gpio_pin_configure_dt(&amp;spec, ...)</code> over the raw call?",
o: ["It is faster", "The device, pin and flags travel together, and GPIO_ACTIVE_LOW is handled for you", "It works without devicetree", "It allocates less"],
a: 1, why: "Setting the pin active lights the LED whichever way it is wired, so the same code works on boards that differ. It also removes the class of bug where the port and pin number drift apart." },
{ q: "An overlay appears not to apply. What do you check first?",
o: ["The Kconfig symbols", "build/zephyr/zephyr.dts, the final merged tree", "The linker map", "The board's schematic"],
a: 1, why: "It settles in seconds whether the file was picked up and what the merged result actually says. Overlays are found by name, so a misnamed board overlay is silently ignored." }
],
interview: {
q: "Walk me through adding an I2C sensor to a Zephyr project.",
a: "I would start in the devicetree rather than in C. Reopen the bus node by its label, set it to status okay, then add a child node for the sensor with a compatible string that matches an existing binding, a reg property carrying its I2C address, and a node label so I can reach it from code. If it has an interrupt line I would add an irq-gpios property referencing the GPIO controller, pin and active level. Then two things people forget: pinctrl, because on most modern SoCs enabling a peripheral is not enough, you also have to say which pins it uses and a peripheral with no pinctrl entry builds cleanly and does nothing, and Kconfig, because the bus driver and the sensor subsystem have to be enabled as well. In C I would get the device with DEVICE_DT_GET on the node label and check device_is_ready before using it. If there is no existing binding I would write one in the application's dts/bindings directory and a driver using DT_DRV_COMPAT and DEVICE_DT_INST_DEFINE. When it does not work, the first thing I look at is build/zephyr/zephyr.dts, which is the final merged tree, because that tells me immediately whether my overlay was even picked up and what the resulting node actually looks like. If I see a DT_N_something undeclared error I read that as 'the node is missing or not okay' rather than as a C problem."
}
},

{
id: "emb-z-kconfig",
track: "Embedded C",
sub: "Zephyr",
title: "Kconfig: choosing what gets built",
mins: 22,
body: `
<p>Kconfig decides which software is compiled in. It is simple in principle and confusing in one
specific way, which is worth understanding properly because it wastes a lot of time.</p>

<h3>Where settings come from</h3>
<pre>prj.conf                  your application's choices
boards/&lt;board&gt;.conf       per-board additions
Kconfig defaults          from the board and SoC
Kconfig.defconfig         board-specific defaults
sysbuild / snippets       extra layers, if used</pre>
<p>They are merged, and the result is written to <code>build/zephyr/.config</code>. That file,
not <code>prj.conf</code>, is what the build actually used.</p>

<h3>The one that catches everyone</h3>
<p>Kconfig symbols have dependencies. If you set a symbol whose dependencies are not met,
it is <b>silently ignored</b>, and your <code>prj.conf</code> line sits there looking correct
while the feature is absent.</p>
<pre>CONFIG_I2C=y            fine

CONFIG_LIS2DH=y         needs CONFIG_SENSOR=y
                        without it, silently off</pre>
<p>Which is why the habit that saves the most time is: <b>after changing prj.conf, check
<code>build/zephyr/.config</code> for the symbol</b>. If it is not there with the value you
expect, something it depends on is missing.</p>
<pre>grep CONFIG_LIS2DH build/zephyr/.config</pre>

<h3>Finding out what a symbol needs</h3>
<pre>west build -t menuconfig     terminal UI
west build -t guiconfig      graphical</pre>
<p>Search for the symbol and it shows its dependencies and what currently blocks it. That is
much faster than reading Kconfig files, and it is the tool people neglect.</p>
<p>Note that changes made in menuconfig go to <code>build/zephyr/.config</code> and are lost on
a pristine build. Use it to find out what you need, then write it into
<code>prj.conf</code>.</p>

<h3>Symbols worth knowing by heart</h3>
<pre>CONFIG_LOG=y                     logging subsystem
CONFIG_LOG_DEFAULT_LEVEL=4       4 is debug
CONFIG_MAIN_STACK_SIZE=2048
CONFIG_SYSTEM_WORKQUEUE_STACK_SIZE=2048
CONFIG_HEAP_MEM_POOL_SIZE=4096   k_malloc's pool

CONFIG_ASSERT=y                  __ASSERT is a no-op without it
CONFIG_THREAD_NAME=y             names in the shell and in faults
CONFIG_THREAD_ANALYZER=y         stack usage per thread
CONFIG_STACK_SENTINEL=y          catches overflow

CONFIG_BT=y                      Bluetooth
CONFIG_BT_PERIPHERAL=y
CONFIG_NVS=y                     settings storage
CONFIG_SHELL=y</pre>
<p><code>CONFIG_ASSERT</code> deserves the emphasis. Zephyr's internal <code>__ASSERT</code>
calls are compiled out by default, so a great many API misuse errors that Zephyr could tell you
about are silently ignored in a default build. Turn it on for development.</p>

<h3>The division with devicetree, restated</h3>
<pre>devicetree                 Kconfig
------------------------   ---------------------------
that this board has an     that the I2C driver should
I2C controller at this     be compiled in
address, on these pins     (CONFIG_I2C=y)

that a lis2dh sits on it   that the sensor subsystem
at address 0x19            and this driver are built</pre>
<p>You need both. A node marked okay with the driver not selected gives you a device that never
initialises; a driver selected with no node gives you a driver with nothing to bind to.</p>

<h3>Stale build directories</h3>
<p>Changing <code>prj.conf</code> or an overlay does not always trigger a full reconfigure, and
the symptom is a change that appears to have no effect.</p>
<pre>west build -p auto      reconfigure when it looks necessary
west build -p always    always start clean, slower and certain</pre>
<p>When something makes no sense, build pristine before you debug anything else. It is thirty
seconds against an afternoon.</p>
`,
quiz: [
{ q: "You add a CONFIG_ symbol to prj.conf and the feature does not appear. What is the likely cause?",
o: ["A typo in the value", "Its dependencies are not met, so it is silently ignored", "prj.conf is not read", "It needs a reboot"],
a: 1, why: "Kconfig does not warn about this. Check build/zephyr/.config for the symbol: if it is absent or has a different value, something it depends on is missing." },
{ q: "Which file tells you what the build actually used?",
o: ["prj.conf", "build/zephyr/.config", "CMakeLists.txt", "the board's .dts"],
a: 1, why: "It is the merged result of prj.conf, board conf files, Kconfig defaults and any other layers. prj.conf is only one input to it." },
{ q: "Why turn on CONFIG_ASSERT during development?",
o: ["It speeds up the build", "Zephyr's internal __ASSERT calls are compiled out by default, so API misuse it could catch is silently ignored", "It enables logging", "It is required for the shell"],
a: 1, why: "A great many misuse errors that Zephyr already knows how to detect produce no message at all in a default build. It is one line for a large amount of free diagnosis." },
{ q: "What does <code>west build -p always</code> do, and when is it worth it?",
o: ["Builds faster", "Forces a pristine build; worth it whenever a config or overlay change appears to have no effect", "Enables parallel builds", "Rebuilds only changed files"],
a: 1, why: "Changing prj.conf or an overlay does not always trigger a full reconfigure, and the symptom is a change that seems ignored. Thirty seconds of pristine build against an afternoon of confusion." }
],
interview: {
q: "A colleague says their Kconfig setting is being ignored. How do you help?",
a: "First I would look at build/zephyr/.config rather than at prj.conf, because that is the merged result of prj.conf, any board conf files, the Kconfig defaults and anything else in the layering, and it is what the build actually used. If the symbol is absent or has a different value than they set, the usual reason is that its dependencies are not met, and Kconfig silently ignores a symbol whose dependencies fail rather than warning. To find out what it needs I would open menuconfig or guiconfig and search for the symbol, because that shows the dependency chain and what is currently blocking it, which is far quicker than reading Kconfig files by hand. The other common cause is a stale build directory, since changing prj.conf or an overlay does not always trigger a full reconfigure, so I would build pristine before debugging anything else. And I would check they have not confused the two systems: Kconfig chooses which software is compiled in, and no CONFIG_ symbol will make a devicetree node appear if it is missing or not status okay. If the problem is really that a device is not there, the fix is in the overlay, not in prj.conf."
}
},

{
id: "emb-z-drivers",
track: "Embedded C",
sub: "Zephyr",
title: "The driver model and struct device",
mins: 24,
body: `
<p>Zephyr's driver model is what makes the same application code run on different silicon. It is
worth understanding because it is also the pattern you follow when you write your own driver.</p>

<h3>What a device is</h3>
<pre>struct device {
    const char *name;
    const void *config;     /* const, in flash: pins, addresses */
    void *data;             /* mutable, in RAM: runtime state   */
    const void *api;        /* pointer to the API function table */
};</pre>
<p>This is the config and handle pattern with the parts named. The <code>api</code> pointer is
what makes it polymorphic: <code>i2c_write_read()</code> is a thin inline that calls through
it.</p>

<h3>Getting one, and the check you must not skip</h3>
<pre>const struct device *i2c = DEVICE_DT_GET(DT_NODELABEL(i2c0));

if (!device_is_ready(i2c)) {
    LOG_ERR("i2c0 not ready");
    return -ENODEV;
}</pre>
<p><code>DEVICE_DT_GET</code> resolves at build time, so it never returns NULL. What it does not
tell you is whether the device's init function succeeded. A device whose init failed is present
but unusable, and calling into it is undefined.</p>
<p><code>device_is_ready()</code> is that check, it costs one load and a compare, and skipping it
is the most common Zephyr driver bug.</p>

<h3>Initialisation levels and ordering</h3>
<pre>PRE_KERNEL_1   before the kernel: clocks, the tick source
PRE_KERNEL_2   still before the kernel: serial for early log
POST_KERNEL    kernel services available, so it may sleep
APPLICATION    last, for things depending on everything else</pre>
<p>Within a level, the priority number orders them. The rule that follows: <b>you cannot sleep
or take a semaphore in a PRE_KERNEL init function</b>, because there is no scheduler yet. A
sensor needing a 50 ms settle time therefore initialises at POST_KERNEL, or defers the wait to
first use.</p>

<h3>Writing a driver, the shape of it</h3>
<pre>#define DT_DRV_COMPAT mycorp_widget

struct widget_config { struct i2c_dt_spec bus; };
struct widget_data   { uint16_t last; };

static int widget_read(const struct device *dev, uint16_t *out)
{
    const struct widget_config *cfg = dev-&gt;config;
    uint8_t buf[2];
    int rc = i2c_burst_read_dt(&amp;cfg-&gt;bus, 0x00, buf, 2);
    if (rc) return rc;
    *out = (buf[0] &lt;&lt; 8) | buf[1];
    return 0;
}

static const struct widget_api widget_api_impl = {
    .read = widget_read,
};

static int widget_init(const struct device *dev) { ... }

#define WIDGET_DEFINE(i)                                     \\
    static struct widget_data widget_data_##i;               \\
    static const struct widget_config widget_cfg_##i = {     \\
        .bus = I2C_DT_SPEC_INST_GET(i),                      \\
    };                                                       \\
    DEVICE_DT_INST_DEFINE(i, widget_init, NULL,              \\
        &amp;widget_data_##i, &amp;widget_cfg_##i,                   \\
        POST_KERNEL, CONFIG_SENSOR_INIT_PRIORITY,            \\
        &amp;widget_api_impl);

DT_INST_FOREACH_STATUS_OKAY(WIDGET_DEFINE)</pre>
<p>The macro at the end is the key idea: it instantiates the driver once per node in the
devicetree that matches <code>DT_DRV_COMPAT</code> and is <code>status = "okay"</code>. Two
sensors on the bus means two instances, from one piece of code, with no list to maintain.</p>

<h3>Why config is const and data is not</h3>
<p><code>config</code> is <code>const</code> so it lands in flash: pin numbers, addresses and
bus specs never change. <code>data</code> is in RAM because it holds runtime state.</p>
<p>On a part with 256 kB of flash and 64 kB of RAM that division is not stylistic. Putting the
config in RAM would cost the RAM and a startup copy for every instance.</p>

<h3>Return codes</h3>
<p>Zephyr uses negative errno values throughout: <code>-EIO</code>, <code>-EINVAL</code>,
<code>-ENODEV</code>, <code>-EBUSY</code>, <code>-EAGAIN</code>, <code>-ETIMEDOUT</code>,
<code>-ENOTSUP</code>. Zero is success.</p>
<p>Returning your own error scheme from a driver breaks every caller's expectations, so use
these even when they fit imperfectly. <code>-ENOTSUP</code> for an unimplemented API call is the
one people forget.</p>
`,
quiz: [
{ q: "Why must you call <code>device_is_ready()</code> even though DEVICE_DT_GET never returns NULL?",
o: ["To initialise the device", "It resolves at build time and cannot know whether the device's init function succeeded", "To take a reference", "It is only needed in ISRs"],
a: 1, why: "A device whose init failed is present but unusable, and calling into it is undefined. The check is one load and a compare, and skipping it is the most common Zephyr driver bug." },
{ q: "Why can a PRE_KERNEL init function not sleep?",
o: ["It runs too fast", "There is no scheduler yet, so there is nothing to sleep on", "Sleeping is forbidden in drivers", "It runs in an ISR"],
a: 1, why: "So a sensor needing a settle time initialises at POST_KERNEL, or defers the wait to first use. PRE_KERNEL is for clocks, the tick source and early serial." },
{ q: "What does <code>DT_INST_FOREACH_STATUS_OKAY</code> do?",
o: ["Checks every node is enabled", "Instantiates the driver once per matching enabled devicetree node", "Iterates devices at runtime", "Validates the bindings"],
a: 1, why: "Two sensors on the bus means two instances from one piece of code, with no list to maintain. It is the mechanism that makes Zephyr drivers instance-based rather than singleton." },
{ q: "Why is a device's <code>config</code> const and its <code>data</code> not?",
o: ["Style convention", "config holds pins and addresses that never change so it lives in flash; data holds runtime state so it must be in RAM", "config is shared between instances", "data is faster to access"],
a: 1, why: "On a part with far more flash than RAM this is not stylistic: putting the config in RAM would cost the RAM plus a startup copy, for every instance." }
],
interview: {
q: "How would you write a Zephyr driver for a new I2C sensor?",
a: "I would follow the standard instance-based shape. Define DT_DRV_COMPAT to the binding name, then two structs: a const config holding an i2c_dt_spec and anything else fixed, which lands in flash because pins and addresses never change, and a data struct for runtime state, which has to be in RAM. Then the API functions taking a const struct device pointer and reaching config and data through it, an api struct of function pointers, and an init function. The part that does the work is DEVICE_DT_INST_DEFINE inside a macro, invoked by DT_INST_FOREACH_STATUS_OKAY, which instantiates the driver once per matching devicetree node that is status okay, so two sensors on the bus gives two instances from one piece of code with no list to maintain. I would pick the init level carefully: POST_KERNEL if the device needs to sleep during init, because there is no scheduler at PRE_KERNEL so you cannot wait on anything there, and I would rather defer a long settle time to first use than block the boot. I would return negative errno values throughout, since that is what every caller expects, including ENOTSUP for anything in the API I do not implement. And I would write the binding YAML in the application's dts/bindings directory if one does not already exist, because the compatible string has to match a binding or the node has no driver behind it. For testing, the fact that the bus is reached through an i2c_dt_spec means I can point it at a fake controller and exercise the error paths off-target."
}
},

{
id: "emb-z-threads",
track: "Embedded C",
sub: "Zephyr",
title: "Threads, work queues and the kernel objects",
mins: 26,
body: `
<p>The kernel part of Zephyr is conventional, with one direction reversed from FreeRTOS and one
trap that catches nearly everyone.</p>

<h3>Priorities run the other way</h3>
<pre>-CONFIG_NUM_COOP_PRIORITIES .. -1   cooperative
 0 .. CONFIG_NUM_PREEMPT_PRIORITIES preemptive

lower number = higher priority</pre>
<p>A cooperative thread runs until it yields or blocks and cannot be preempted by another
thread, though interrupts still occur. That makes it useful for short critical sequences and
dangerous for anything long.</p>

<h3>Creating a thread</h3>
<pre>K_THREAD_DEFINE(sensor_tid, 1024, sensor_thread,
                NULL, NULL, NULL,
                5, 0, 0);
/*              prio, options, start delay ms      */</pre>
<p><code>K_THREAD_DEFINE</code> allocates the stack statically and starts it at boot, which is
what you want for a fixed set of threads. <code>k_thread_create()</code> is the runtime
equivalent when the set is not known until later.</p>

<h3>The objects, and when each fits</h3>
<pre>k_sem       signalling and counting. The right answer for
            ISR to thread: give from the ISR, take in the
            thread with a timeout.

k_mutex     mutual exclusion, with priority inheritance.
            Never usable from an ISR.

k_msgq      fixed-size messages, copied. Simple and
            bounded, which is why it suits most producer
            and consumer paths.

k_fifo      variable-size items by reference. No copy,
            so ownership has to be clear.

k_event     wait on any of several conditions at once.

k_poll      wait on a mix of object types at once.</pre>
<p>The rule that decides most cases: if the data is small and fixed, use a message queue and copy
it, because the ownership question disappears.</p>

<h3>Work queues, and the trap</h3>
<p>A work item is a function submitted to run later on a queue's thread. It is the standard way
to move work out of an ISR.</p>
<pre>static struct k_work my_work;

static void my_work_fn(struct k_work *w) { /* runs in a thread */ }

k_work_init(&amp;my_work, my_work_fn);

/* from the ISR: */
k_work_submit(&amp;my_work);</pre>
<p><b>The trap:</b> <code>k_work_submit()</code> uses the <b>system work queue</b>, which is
shared with Bluetooth, networking, the logging subsystem and anything else that did not create
its own. A work item that blocks, sleeps, or takes 100 ms stalls all of them.</p>
<p>Symptoms are alarming and look unrelated: BLE connections dropping, log lines vanishing, a
timer callback that never runs. If you need to block, create your own queue:</p>
<pre>K_THREAD_STACK_DEFINE(my_stack, 2048);
static struct k_work_q my_q;

k_work_queue_start(&amp;my_q, my_stack,
                   K_THREAD_STACK_SIZEOF(my_stack), 5, NULL);
k_work_submit_to_queue(&amp;my_q, &amp;my_work);</pre>
<p><code>k_work_delayable</code> is the deferred version, and it is the usual way to implement a
timeout or a retry without a dedicated thread.</p>

<h3>What you may do in an ISR</h3>
<pre>allowed         k_sem_give, k_work_submit, k_msgq_put with
                K_NO_WAIT, k_fifo_put, k_timer_start

forbidden       anything that can block: k_sleep, k_mutex_lock,
                any call with a non-zero timeout, k_malloc

check           k_is_in_isr() when shared code runs in both</pre>
<p>Passing a non-zero timeout from an ISR is the frequent one. With
<code>CONFIG_ASSERT=y</code> Zephyr tells you immediately; without it, the behaviour is
undefined and the failure surfaces somewhere else entirely.</p>

<h3>Timers against delayed work</h3>
<p><code>k_timer</code> callbacks run in <b>interrupt context</b>, so all the ISR restrictions
apply. <code>k_work_delayable</code> runs in a thread, so it may block.</p>
<p>Reach for delayable work by default and use <code>k_timer</code> only when you genuinely need
the lower latency, because the timer's context restriction is easy to forget six months
later.</p>

<h3>Stacks, and how to size them</h3>
<p>Guessing produces either waste or a corruption that looks like something else. Zephyr will
tell you instead:</p>
<pre>CONFIG_THREAD_ANALYZER=y
CONFIG_THREAD_ANALYZER_AUTO=y
CONFIG_THREAD_NAME=y
CONFIG_STACK_SENTINEL=y</pre>
<p>The analyzer prints per-thread peak usage periodically. Run the worst case you can construct,
read the numbers, then add margin. Printf-style logging and floating point are both large
consumers, and the deepest path is rarely the one you expected.</p>
`,
quiz: [
{ q: "In Zephyr, which thread priority is more urgent?",
o: ["The higher number", "The lower number, with negative values being cooperative", "They are equal", "Priority is set by creation order"],
a: 1, why: "The opposite of FreeRTOS, so it is a reliable porting bug. A cooperative thread runs until it yields or blocks and cannot be preempted by another thread, though interrupts still occur." },
{ q: "What is the danger of <code>k_work_submit()</code>?",
o: ["It can fail silently", "It uses the shared system work queue, so blocking in your handler stalls Bluetooth, networking and logging", "It runs in interrupt context", "It allocates memory"],
a: 1, why: "The symptoms look unrelated: dropped BLE connections, missing log lines, a timer callback that never runs. If the work can block, start your own queue and submit to that." },
{ q: "In which context does a <code>k_timer</code> callback run?",
o: ["A dedicated thread", "Interrupt context, so all the ISR restrictions apply", "The system work queue", "The caller's thread"],
a: 1, why: "Which is why k_work_delayable is the better default: it runs in a thread and may block. Use k_timer only when you genuinely need the lower latency." },
{ q: "How should you size a thread stack?",
o: ["Use 1024 and adjust if it crashes", "Measure it with CONFIG_THREAD_ANALYZER under the worst case you can construct, then add margin", "Use the largest that fits", "Match the other threads"],
a: 1, why: "Guessing gives you either waste or a corruption that looks like something else entirely. Logging and floating point are both large consumers and the deepest path is rarely the expected one." }
],
interview: {
q: "You move work out of an ISR into k_work_submit and Bluetooth starts dropping connections. What happened?",
a: "Almost certainly the work handler is blocking on the system work queue. k_work_submit puts the item on the shared system queue, which Bluetooth, networking, logging and anything else that did not create its own queue all use, so a handler that sleeps, waits on a semaphore or simply takes a hundred milliseconds stalls every one of them. The symptoms are the giveaway because they look unrelated to the code you changed: dropped connections, log lines vanishing, timer callbacks that never run. The fix is to start a dedicated work queue with its own stack and priority and submit to that instead, which keeps the blocking contained. More generally I would think about whether the handler should block at all: if it is waiting on a bus transaction, an asynchronous API or splitting it into a submit-and-resubmit pattern with k_work_delayable is often better than occupying a thread. I would also check what else I am doing in the ISR itself, because only non-blocking calls are legal there, and passing a non-zero timeout to a kernel call from interrupt context is a common mistake that is undefined behaviour rather than an error. Turning on CONFIG_ASSERT catches that immediately, and it is off by default, which is why I enable it in every development build."
}
},

{
id: "emb-z-build",
track: "Embedded C",
sub: "Zephyr",
title: "west, CMake and the build",
mins: 22,
body: `
<p>A large share of Zephyr debugging is build system debugging, so knowing what the tools
actually do repays itself quickly.</p>

<h3>What west is</h3>
<p>Two separate things wearing one name:</p>
<ul>
<li><b>A multi-repository manager.</b> <code>west.yml</code> is a manifest listing Zephyr and
its modules at specific revisions, and <code>west update</code> checks them out.</li>
<li><b>A build front end.</b> <code>west build</code>, <code>flash</code> and
<code>debug</code> wrap CMake, ninja and the flashing tool.</li>
</ul>
<p>The manifest is the part that matters for reproducibility: it pins every module by revision,
so a workspace is defined by one file rather than by whatever people happened to clone.</p>

<h3>The commands you actually use</h3>
<pre>west init -m &lt;url&gt; --mr &lt;rev&gt; ws   create a workspace
west update                        fetch every module at its pin

west build -b nrf52840dk_nrf52840  configure and build
west build -p always               pristine: throw the build dir away
west build -t menuconfig           explore Kconfig
west build -t guiconfig

west flash                         program the board
west debug                         flash, then attach gdb
west attach                        attach without reprogramming

west boards                        what board names exist
west build -t rom_report           where the flash went
west build -t ram_report</pre>
<p><code>rom_report</code> and <code>ram_report</code> are the ones people never discover. They
break the image down by module and file, which turns "it does not fit" from a guess into a
list.</p>

<h3>A minimal application</h3>
<pre>cmake_minimum_required(VERSION 3.20.0)
find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(my_app)

target_sources(app PRIVATE src/main.c src/sensor.c)</pre>
<p><code>app</code> is a target Zephyr has already defined. You add sources to it rather than
creating your own executable, because the linking is Zephyr's job.</p>

<h3>Where the build puts things</h3>
<pre>build/zephyr/zephyr.elf     debug with this
build/zephyr/zephyr.hex     flash this
build/zephyr/zephyr.map     where the space went
build/zephyr/.config        the merged Kconfig result
build/zephyr/zephyr.dts     the merged devicetree
build/zephyr/include/generated/
                            devicetree_generated.h, autoconf.h</pre>
<p>Those last three are the answer to most "why is it doing that" questions, and they are the
first place to look rather than the last.</p>

<h3>Out-of-tree, which you will need</h3>
<pre>ZEPHYR_EXTRA_MODULES        your own modules
BOARD_ROOT                  your own board definitions
DTS_ROOT                    your own bindings
                            (or just dts/bindings in the app)</pre>
<p>A custom board is a directory with a <code>.dts</code>, a
<code>Kconfig.board</code>, a <code>_defconfig</code> and a YAML description. Pointing
<code>BOARD_ROOT</code> at its parent makes <code>-b my_board</code> work exactly like a
built-in one.</p>

<h3>Sysbuild, in one paragraph</h3>
<p>Sysbuild builds several images together: an application plus a bootloader such as MCUboot,
or a multi-core split. It exists because signing and partitioning need both images to agree, and
doing that by hand is error-prone. If you are shipping firmware update, you will meet it.</p>

<h3>The failure modes, and what they mean</h3>
<pre>DT_N_... undeclared
    the node is missing or not status okay

undefined reference to a driver function
    the Kconfig symbol for that driver is not set

your change appears to do nothing
    stale build directory; build with -p always

"board not found"
    BOARD_ROOT is not set, or the board directory
    name and the .dts name disagree

link fails: region FLASH overflowed
    rom_report tells you by whom</pre>
`,
quiz: [
{ q: "What are the two distinct jobs of west?",
o: ["Building and flashing", "A multi-repository manager driven by west.yml, and a build front end wrapping CMake", "Configuring and linking", "Testing and deploying"],
a: 1, why: "The manifest is what makes a workspace reproducible: it pins Zephyr and every module by revision, so the workspace is defined by one file rather than by what people happened to clone." },
{ q: "Which build target tells you where the flash went?",
o: ["menuconfig", "rom_report", "guiconfig", "usage"],
a: 1, why: "It breaks the image down by module and file, with ram_report doing the same for RAM. They turn 'it does not fit' from a guess into a list, and most people never find them." },
{ q: "In a Zephyr CMakeLists.txt, why do you add sources to <code>app</code> rather than create an executable?",
o: ["Convention only", "Zephyr already defines that target, because the linking is its job", "It is faster", "CMake requires it"],
a: 1, why: "Zephyr controls the link, the linker script and the image layout. You contribute sources to a target it has set up, which is why a Zephyr CMakeLists file is four lines long." },
{ q: "You see 'undefined reference' to a driver function. What is the usual cause?",
o: ["A missing include", "The Kconfig symbol enabling that driver is not set", "A devicetree node is disabled", "The linker script is wrong"],
a: 1, why: "The driver's source is simply not compiled in. Contrast with a DT_N_... undeclared error, which means the devicetree node is missing or not status okay. The two failure modes point at different files." }
],
interview: {
q: "A Zephyr build fails and the error names a symbol you have never seen. How do you approach it?",
a: "I would read the shape of the error first, because Zephyr's failures fall into a few recognisable families. A DT_N_something undeclared means a devicetree node is missing or is not status okay, so I go to build/zephyr/zephyr.dts, the final merged tree, and check whether my overlay was even picked up. An undefined reference to a driver function usually means the Kconfig symbol for that driver is not set, so I grep build/zephyr/.config rather than trusting prj.conf, since .config is the merged result of prj.conf, board files and defaults. A change that appears to do nothing is very often a stale build directory, so I build with -p always before spending time on anything else. Region FLASH overflowed I answer with west build -t rom_report, which breaks the image down by module and file so it stops being a guess. Board not found means BOARD_ROOT is not set or the directory and dts names disagree. The general habit is that the generated output tells you the truth and the input files only tell you your intention, so zephyr.dts, .config and the map file are the first things I open rather than the last."
}
},

{
id: "emb-z-debug",
track: "Embedded C",
sub: "Zephyr",
title: "Logging, shell and getting diagnosis out",
mins: 24,
body: `
<p>Zephyr gives you far more diagnostic machinery than a bare-metal project, and most of it is
off by default. Knowing what to turn on is most of the value.</p>

<h3>Logging</h3>
<pre>#include &lt;zephyr/logging/log.h&gt;
LOG_MODULE_REGISTER(sensor, CONFIG_SENSOR_LOG_LEVEL);

LOG_ERR("i2c failed: %d", rc);
LOG_WRN("retry %u", n);
LOG_INF("ready");
LOG_DBG("raw=%04x", raw);
LOG_HEXDUMP_DBG(buf, len, "frame");</pre>
<p>Per-module levels are the useful part: you can turn one module to debug and leave everything
else at warning, so the interesting output is not buried.</p>

<h3>Deferred against immediate, and why it matters for crashes</h3>
<pre>CONFIG_LOG_MODE_DEFERRED    default. Formatting happens
                            in the log thread, so the call
                            site is cheap.

CONFIG_LOG_MODE_IMMEDIATE   formats and outputs in the
                            caller's context. Slow, and
                            it changes timing.</pre>
<p>Deferred is right for normal use, and wrong when you are chasing a crash: messages sitting in
the buffer when the fault hits are never printed, so the log stops several lines before the
actual problem.</p>
<p>If the last thing you see is not where it died, switch to immediate. It is the single most
useful logging setting to know, and it costs one line.</p>

<h3>Getting the output off the board</h3>
<pre>UART       CONFIG_LOG_BACKEND_UART, the default
RTT        CONFIG_USE_SEGGER_RTT
           CONFIG_LOG_BACKEND_RTT
           over the debug probe, no extra pins, and
           fast enough not to change timing much</pre>
<p>RTT is worth setting up early on any board where the UART pins are scarce or where the
logging rate is high enough to distort what you are measuring.</p>

<h3>The shell</h3>
<pre>CONFIG_SHELL=y
CONFIG_SHELL_BACKEND_SERIAL=y

kernel threads      every thread, state, and stack usage
kernel stacks       stack high-water marks
device list         every device and whether it is ready
log backend ...     change log levels at runtime
i2c scan I2C_0      probe the bus without writing code</pre>
<p><code>device list</code> is the fastest answer to "is my sensor there", and
<code>i2c scan</code> replaces the small program you were about to write. Adding your own
command is a handful of lines with <code>SHELL_CMD_REGISTER</code>.</p>

<h3>Fault dumps</h3>
<p>When Zephyr hits a CPU fault it prints registers, the fault type and a call trace:</p>
<pre>E: ***** BUS FAULT *****
E:   Precise data bus error
E:   BFAR Address: 0x00000010
E: r0/a1:  0x00000000  r1/a2:  0x20001234
E: ...
E: Current thread: 0x20000a10 (sensor)</pre>
<p>Two Kconfig settings make this far more useful:
<code>CONFIG_THREAD_NAME=y</code> so the thread has a name rather than an address, and
<code>CONFIG_EXCEPTION_STACK_TRACE=y</code> for the call trace.</p>
<p>Then decode the addresses against the ELF:</p>
<pre>arm-none-eabi-addr2line -e build/zephyr/zephyr.elf 0x...</pre>

<h3>The settings worth turning on while developing</h3>
<pre>CONFIG_ASSERT=y                    Zephyr's own checks
CONFIG_THREAD_NAME=y
CONFIG_THREAD_ANALYZER=y           per-thread stack usage
CONFIG_THREAD_ANALYZER_AUTO=y
CONFIG_STACK_SENTINEL=y            catch overflow
CONFIG_EXCEPTION_STACK_TRACE=y
CONFIG_DEBUG_THREAD_INFO=y         RTOS awareness in gdb
CONFIG_RESET_ON_FATAL_ERROR=n      stay stopped so you can look</pre>
<p>That last one is a genuinely good default while developing. Resetting on a fault destroys the
state you needed, and the device comes back looking healthy while quietly rebooting in a
loop.</p>

<h3>Stack overflow, the failure that looks like anything else</h3>
<p>An overflowing stack corrupts whatever is next to it, so the symptom is a variable changing
on its own, or a fault in unrelated code.</p>
<p><code>CONFIG_STACK_SENTINEL</code> puts a known value at the end of each stack and checks it
on context switch, turning that into an immediate named error. On parts with an MPU,
<code>CONFIG_HW_STACK_PROTECTION</code> is better still, because the fault happens at the moment
of the overflow rather than at the next switch.</p>
`,
quiz: [
{ q: "Your log stops several lines before the crash. What is the fix?",
o: ["Increase the log buffer", "Switch to CONFIG_LOG_MODE_IMMEDIATE, because deferred messages still in the buffer are never printed", "Lower the log level", "Use a faster UART"],
a: 1, why: "Deferred logging formats in the log thread, so anything queued when the fault hits is lost. Immediate costs performance and changes timing, which is exactly the trade you want while chasing a fault." },
{ q: "What does the shell's <code>device list</code> command tell you?",
o: ["The devicetree source", "Every device and whether it is ready, which is the fastest answer to 'is my sensor there'", "The Kconfig settings", "Connected USB devices"],
a: 1, why: "Together with 'i2c scan' it replaces the small test program you were about to write. 'kernel threads' and 'kernel stacks' do the same for thread and stack questions." },
{ q: "Why set <code>CONFIG_RESET_ON_FATAL_ERROR=n</code> during development?",
o: ["It speeds up boot", "Resetting destroys the state you needed, and the device comes back looking healthy while rebooting in a loop", "It is required for logging", "It enables the shell"],
a: 1, why: "Staying stopped lets you attach a debugger and look at the actual fault. In production you usually want the opposite, so it is a development setting rather than a permanent one." },
{ q: "How does CONFIG_STACK_SENTINEL help?",
o: ["It grows the stack automatically", "It writes a known value at the end of each stack and checks it on context switch, turning silent corruption into a named error", "It measures peak usage", "It moves stacks to a safe region"],
a: 1, why: "An overflow otherwise corrupts whatever is adjacent, so the symptom is a variable changing on its own or a fault in unrelated code. HW_STACK_PROTECTION with an MPU is better still, faulting at the moment of overflow." }
],
interview: {
q: "A Zephyr device faults intermittently in the field. What do you turn on and what do you look at?",
a: "First the settings that make a fault informative, because most of them are off by default. CONFIG_THREAD_NAME so the dump names the thread rather than an address, CONFIG_EXCEPTION_STACK_TRACE for a call trace, CONFIG_ASSERT so Zephyr's own API misuse checks actually fire, and CONFIG_RESET_ON_FATAL_ERROR=n while developing, because resetting destroys the state I needed and gives me a device that looks healthy while quietly rebooting in a loop. Then the fault dump itself: the fault type, BFAR or MMFAR if it is a bus or memory fault, and the registers, and I decode the addresses against the ELF with addr2line, which is why archiving the ELF for the exact build matters. If the log stops before the crash, that is deferred logging: messages still in the buffer when the fault hits are never printed, so I switch to CONFIG_LOG_MODE_IMMEDIATE and accept the timing change. For an intermittent fault my first suspicion is a stack overflow, because it corrupts whatever is adjacent and the symptom is a variable changing on its own or a fault in unrelated code. CONFIG_STACK_SENTINEL turns that into a named error at the next context switch, and on a part with an MPU, HW_STACK_PROTECTION faults at the moment of the overflow instead. I would also run the thread analyzer under the worst case I can construct to see the actual peak usage per thread rather than guessing the sizes."
}
}

);
