// Embedded C track, batch 7: analogue and signals from the firmware side.
// The Electronics track covers ADC architectures, noise and sensor hardware;
// the DSP track covers the theory. This batch is what the C code has to do.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-adc-fw",
track: "Embedded C",
title: "Driving an ADC from firmware",
mins: 25,
body: `
<p>The Electronics track covers what a SAR or sigma-delta converter is. This is about the code:
what you configure, what goes wrong during bring-up, and which datasheet number the firmware
actually has to respect.</p>

<h3>The number firmware gets wrong: acquisition time</h3>
<p>Before converting, the ADC connects an internal sampling capacitor to your pin and waits for
it to charge through your source. If you have not waited long enough, you convert a partly
charged capacitor and the reading is low.</p>
<p>The capacitor charges through your source resistance, so the time you need depends on your
circuit, not just on the ADC. Settling to within half an LSB of 12 bits takes roughly nine time
constants:</p>
<pre>t_acq  ~  9 x (R_source + R_switch) x C_sample</pre>
<p>With a 10 kΩ sensor and a typical 5 pF sample capacitor that is about half a microsecond.
With a 1 MΩ source it is 45 microseconds, and the default acquisition setting will be nowhere
near enough.</p>
<p>The symptom is distinctive and worth recognising: <b>readings that are consistently low, and
that change when you alter the source impedance or the channel scan order</b>. Nothing looks
wrong in the code. Either lengthen the acquisition time or buffer the source with an op-amp.</p>

<h3>Reference voltage is part of the measurement</h3>
<p>The ADC measures a ratio against its reference, so the reference is as much a part of your
accuracy as the converter is:</p>
<pre>V_in = (count / 4095) x V_ref        /* 12-bit */</pre>
<p>Using VDD as the reference means every millivolt of supply variation appears in your reading.
That is fine, sometimes better than fine, when the sensor is also powered from VDD, which is the
ratiometric case in the units lesson. It is a defect when the sensor has its own reference.</p>

<h3>Configuration checklist</h3>
<ul>
<li><b>Clock.</b> The ADC has its own clock with a maximum. Running it too fast degrades accuracy
in a way that looks like noise.</li>
<li><b>Resolution.</b> Lower resolution converts faster. Use it deliberately, not by accident.</li>
<li><b>Single, continuous or scan.</b> Scan mode with several channels needs an acquisition time
long enough for the <b>worst</b> source impedance among them.</li>
<li><b>Alignment.</b> Results are often left-aligned in a 16-bit register, so a 12-bit result may
need shifting. Reading a value four times too large is this.</li>
<li><b>Calibration.</b> Many ADCs have a self-calibration routine that must be run after reset
and sometimes after a temperature change. Skipping it costs you offset accuracy silently.</li>
</ul>

<h3>Three ways to get the data, in increasing order of sense</h3>
<p><b>Poll the end-of-conversion flag.</b> Fine for a one-off reading at startup. Wasteful and
badly timed for anything periodic.</p>
<p><b>Interrupt per conversion.</b> Works, but at 10 kHz that is 10,000 interrupts a second, each
costing entry and exit, to move two bytes.</p>
<p><b>Timer-triggered conversion into DMA.</b> The timer starts each conversion, the DMA moves
each result into a buffer, and the CPU is interrupted once per half buffer. Sample timing comes
from hardware, the CPU can sleep, and the interrupt rate drops by the buffer size.</p>
<pre>/* the shape, whatever the vendor calls it */
timer -&gt; triggers ADC -&gt; DMA writes buffer -&gt; half/full interrupt -&gt; process
</pre>
<p>That last arrangement is the one to describe in an interview, because it gets both the timing
and the power argument right at once.</p>

<h3>Bring-up faults, in the order you meet them</h3>
<ol>
<li><b>All zeros or all full scale.</b> Clock not enabled, pin not in analogue mode, or the wrong
channel. Check the pin configuration before anything else.</li>
<li><b>Value four or sixteen times too large or small.</b> Result alignment.</li>
<li><b>Readings consistently low.</b> Acquisition time against source impedance.</li>
<li><b>One channel contaminating the next.</b> Also acquisition time: the sample capacitor still
holds charge from the previous channel. Classic in scan mode.</li>
<li><b>Noisy but centred.</b> Now it is a real noise problem, and the averaging lesson
applies.</li>
</ol>
<p>Working through that list in order costs minutes and saves an afternoon, because the first
four are configuration and only the fifth is analogue.</p>
`,
quiz: [
{ q: "Readings are consistently low and change when you increase the sensor's source resistance. What is wrong?",
o: ["The reference is wrong", "Acquisition time is too short for the source impedance", "The clock is too slow", "Wrong alignment"],
a: 1, why: "The internal sampling capacitor charges through your source resistance. Too short an acquisition and you convert a partly charged capacitor. Settling to half an LSB at 12 bits takes about nine time constants of (R_source + R_switch) x C_sample." },
{ q: "In scan mode, one channel's reading is contaminated by the previous channel. What causes it?",
o: ["Crosstalk on the PCB", "Acquisition time: the sample capacitor still holds charge from the previous channel", "The DMA is misconfigured", "Wrong reference"],
a: 1, why: "Same root cause as readings being low. The acquisition time in scan mode must suit the worst source impedance among the channels, not the best." },
{ q: "Why is timer-triggered conversion into DMA better than an interrupt per conversion?",
o: ["It is more accurate", "Sample timing comes from hardware, the CPU can sleep, and the interrupt rate drops by the buffer size", "It uses less flash", "It avoids calibration"],
a: 1, why: "Three wins at once. The timing argument is the one people miss: a loop or an interrupt handler samples when it gets round to it, whereas a timer samples on time." },
{ q: "Your 12-bit reading is sixteen times larger than expected. What is the most likely cause?",
o: ["Wrong reference", "Result alignment: the value is left-aligned in a 16-bit register", "Acquisition time", "The ADC clock"],
a: 1, why: "Many ADCs left-align results, so a 12-bit value sits in the top bits of a 16-bit register and needs shifting by four. It is worth checking early because it looks like a scaling bug in your maths." }
],
interview: {
q: "Talk me through bringing up an ADC channel on a new board.",
a: "I would work through configuration before touching anything analogue, because the first several faults are all configuration and they present in distinctive ways. First the pin: is the clock enabled and is the pin actually in analogue mode, because all zeros or all full scale is nearly always one of those or the wrong channel. Then result alignment, since a value that is four or sixteen times out is usually a left-aligned result rather than a maths error. Then acquisition time against my source impedance, which is the one firmware gets wrong most often: the sampling capacitor charges through my source, and settling to half an LSB at 12 bits takes roughly nine time constants, so a high impedance sensor with the default setting reads consistently low. The same fault shows up in scan mode as one channel contaminating the next. I would also run the ADC's self-calibration after reset, because skipping it loses offset accuracy silently. Only once all of that is right would I treat remaining noise as a real analogue problem. For the steady state I would use a timer to trigger conversions into DMA with a half-buffer interrupt, because that gets the sample timing from hardware rather than from whenever my loop gets round to it, and it lets the core sleep between buffers."
}
},

{
id: "emb-sampling",
track: "Embedded C",
title: "Sampling: timing, triggering and timestamps",
mins: 24,
body: `
<p>Every piece of signal processing downstream assumes the samples arrived at equal intervals.
Firmware is where that assumption is usually broken, and it is broken quietly.</p>

<h3>The mistake</h3>
<pre>while (1) {
    int v = adc_read();
    process(v);
    delay_ms(1);          /* "1 kHz sampling" */
}</pre>
<p>The interval is not 1 ms. It is 1 ms plus however long <code>adc_read</code> and
<code>process</code> took, plus any interrupt that happened to land, plus the rounding in
<code>delay_ms</code>. It varies from sample to sample and it varies with system load.</p>

<svg class="fig" viewBox="0 0 680 369" role="img" aria-label="Timer-triggered sampling lands on the nominal grid; loop-polled sampling drifts around it">
<rect class="bx" x="40" y="50" width="600" height="40" rx="4"/>
<text class="th" x="56" y="76">The dashed lines are where the samples should be</text>
<line class="guide" x1="235" y1="95" x2="235" y2="275"/>
<line class="guide" x1="288" y1="95" x2="288" y2="275"/>
<line class="guide" x1="341" y1="95" x2="341" y2="275"/>
<line class="guide" x1="394" y1="95" x2="394" y2="275"/>
<line class="guide" x1="447" y1="95" x2="447" y2="275"/>
<line class="guide" x1="500" y1="95" x2="500" y2="275"/>
<line class="guide" x1="553" y1="95" x2="553" y2="275"/>
<line class="guide" x1="606" y1="95" x2="606" y2="275"/>
<rect class="bxa" x="40" y="118" width="175" height="54" rx="4"/>
<text class="th" x="56" y="142">Timer triggered</text>
<text class="ts" x="56" y="160">always on time</text>
<path class="wave" d="M235 131 L235 159 M288 131 L288 159 M341 131 L341 159 M394 131 L394 159 M447 131 L447 159 M500 131 L500 159 M553 131 L553 159 M606 131 L606 159"/>
<rect class="bx" x="40" y="208" width="175" height="54" rx="4"/>
<text class="th" x="56" y="232">Loop polled</text>
<text class="ts" x="56" y="250">never quite on time</text>
<path class="wave" d="M237 221 L237 249 M294 221 L294 249 M340 221 L340 249 M402 221 L402 249 M448 221 L448 249 M508 221 L508 249 M552 221 L552 249 M617 221 L617 249"/>
<rect class="bx" x="40" y="295" width="290" height="54" rx="4"/>
<text class="th" x="56" y="319">Same average rate</text>
<text class="ts" x="56" y="337">both take eight samples</text>
<rect class="bx" x="350" y="295" width="290" height="54" rx="4"/>
<text class="th" x="366" y="319">Different spectra</text>
<text class="ts" x="366" y="337">jitter becomes broadband noise</text>
</svg>
<p class="figcap">Both loops sample at the same average rate. Only one of them is sampling at a
constant interval, and it is the interval that everything downstream assumes.</p>

<h3>Why average rate is not enough</h3>
<p>Sample timing error behaves like noise added to the signal, and how much depends on how fast
the signal is changing. For a sine wave the error from a timing wobble is proportional to the
slew rate, so the same jitter costs you far more on a fast signal than a slow one.</p>
<p>The practical consequences: an FFT's bins smear, a filter's cutoff is not where you designed
it, a control loop's derivative term gets noisy, and a time-of-flight measurement acquires an
error you cannot calibrate out because it is different every time.</p>

<h3>Do it in hardware</h3>
<p>Let a timer trigger the conversion. The CPU is not involved in deciding when, so no amount of
system load moves the sample instant.</p>
<pre>/* the timer's update event triggers the ADC directly */
timer_set_period(SAMPLE_RATE_HZ);
adc_set_trigger(TIMER_TRGO);
adc_start_dma(buffer, N);          /* CPU now free, or asleep */</pre>
<p>This is the same argument as the ADC lesson from the other direction. There it was about
interrupt load and power; here it is about signal integrity.</p>

<h3>Timestamp at capture, not at processing</h3>
<p>Where a sample genuinely cannot be periodic, an event-driven measurement for instance, record
<b>when</b> it happened as close to the event as possible:</p>
<pre>void EXTI_Handler(void)
{
    uint32_t t = TIM2-&gt;CNT;        /* first line: read the timer */
    queue_push(t, read_sensor());  /* everything else can wait */
}</pre>
<p>Reading the counter in the first line of the handler bounds the error to the interrupt latency
rather than to the queue depth. Timestamping later, in the task that processes the queue, records
when you got round to it, which is a different and useless quantity.</p>
<p>Better still, where the peripheral supports input capture, the timer latches the count in
hardware at the edge and the error becomes zero regardless of when your handler runs.</p>

<h3>Aliasing, briefly and practically</h3>
<p>The DSP track covers the theory. The firmware-relevant part is that <b>an anti-alias filter
must be in hardware, before the ADC</b>. Nothing you write afterwards can undo it, because once
a 60 Hz component has folded down to 2 Hz it is indistinguishable from a real 2 Hz signal.</p>
<p>Two failure modes worth recognising. Mains hum at 50 or 60 Hz folding to something slow, which
looks like genuine drift. And a switching regulator's ripple aliasing to near DC, which looks
like an offset that changes with load.</p>
<p>If you find either, the fix is a filter on the board or a higher sample rate with decimation
in firmware, not cleverness downstream.</p>
`,
quiz: [
{ q: "A loop reads the ADC then calls delay_ms(1). What is wrong with calling that 1 kHz sampling?",
o: ["Nothing", "The interval is 1 ms plus the work plus any interrupt, so it varies sample to sample", "delay_ms is inaccurate", "The ADC is too slow"],
a: 1, why: "Everything downstream assumes a constant interval. The average rate can be right while every individual interval is wrong, and the variation grows with system load." },
{ q: "How does sample timing jitter show up in the data?",
o: ["A constant offset", "As noise proportional to how fast the signal is changing", "A gain error", "It does not"],
a: 1, why: "The error from a timing wobble scales with slew rate, so the same jitter costs far more on a fast signal. It smears FFT bins, moves filter cutoffs and adds noise to a derivative term." },
{ q: "An event cannot be sampled periodically. Where should you record the timestamp?",
o: ["In the task that processes it", "In the first line of the interrupt handler, or in hardware via input capture", "At the end of the handler", "It does not matter"],
a: 1, why: "Reading the counter first bounds the error to interrupt latency rather than queue depth. Input capture latches the count in hardware at the edge, making the error zero regardless of when your handler runs." },
{ q: "Where must an anti-alias filter be?",
o: ["In firmware, after sampling", "In hardware, before the ADC", "Either", "In the DMA configuration"],
a: 1, why: "Once a component has folded down it is indistinguishable from a real signal at that frequency, so no amount of processing recovers it. Mains hum folding to a slow drift is the classic case." }
],
interview: {
q: "You inherit a data logger whose FFTs look smeared. Where do you look?",
a: "My first suspicion would be the sample timing rather than the FFT itself, because smearing is what jitter does. I would find out how sampling is triggered, and if it is a loop that reads the ADC and then delays, that is the answer: the interval is the delay plus the work plus whatever interrupts landed, so it varies sample to sample and it varies with load. Everything downstream assumes a constant interval. I would confirm it cheaply by toggling a GPIO at each sample and looking at the spread on a scope, which shows both the average rate and the jitter, and the jitter is the number that matters. The fix is to have a timer trigger the conversions and DMA collect them, so the sample instant comes from hardware and no amount of CPU load moves it. If the samples genuinely cannot be periodic then I would timestamp at capture, reading the counter in the first line of the handler or using input capture so the timer latches it in hardware at the edge. The other thing I would rule out is aliasing, because mains hum folding down looks like slow genuine drift and a regulator's ripple aliasing near DC looks like an offset that moves with load. That one has to be fixed with a filter before the ADC or a higher rate and decimation, since nothing downstream can undo it."
}
},

{
id: "emb-units",
track: "Embedded C",
title: "From counts to engineering units",
mins: 23,
body: `
<p>An ADC gives you a number between 0 and 4095. Somewhere between there and the application it
has to become 23.4 degrees, and where that happens, and in what type, is a design decision that
gets made by accident more often than not.</p>

<h3>The chain</h3>
<pre>count  -&gt;  fraction of reference  -&gt;  volts  -&gt;  sensor quantity  -&gt;  application units</pre>
<p>Each arrow is a place a mistake can hide. Writing them out explicitly, even as comments, is
worth more than it sounds, because the composite constant that appears in the final code hides
every one of them.</p>

<h3>Ratiometric, and when the reference cancels</h3>
<p>If a resistive sensor forms a divider with a fixed resistor across VDD, <b>and</b> the ADC's
reference is also VDD, then the reading depends only on the ratio and VDD cancels entirely:</p>
<pre>count / 4095 = R_sensor / (R_sensor + R_fixed)      /* no V anywhere */</pre>
<p>That is a genuinely useful property: supply variation, which you cannot control, stops
mattering. It is also why an engineer switching to a precision internal reference to "improve
accuracy" can make a ratiometric measurement worse.</p>
<p>The converse: a sensor with its own voltage output, such as most ICs, is <b>not</b> ratiometric
and every millivolt of VDD variation lands directly in your reading if VDD is your reference.</p>
<p>Knowing which of the two you have is the first question to ask about any analogue input, and
it decides the reference before anything else does.</p>

<h3>Where to do the conversion</h3>
<p>Return raw counts from the driver and convert at the boundary above it.</p>
<p>The reason is that counts are what the hardware produced, and everything else is
interpretation. Keeping the driver in counts means calibration, filtering and unit conversion are
all testable pure functions that never touch hardware, and the driver stays a thing that reads a
register.</p>
<pre>int16_t adc_read_raw(adc_t *a, uint8_t ch);            /* driver: counts     */
int32_t volts_mv_from_count(int16_t c, uint16_t vref);  /* pure, testable    */
int32_t temp_mc_from_mv(int32_t mv);                    /* pure, testable    */</pre>
<p>Those two pure functions can be exercised across their whole input range on a host in
milliseconds, including the edges where the maths overflows.</p>

<h3>Put the unit in the name</h3>
<p>Every one of these has been a real bug:</p>
<pre>int32_t temp;              /* celsius? millicelsius? counts? */
int32_t temp_mc;           /* millicelsius. no ambiguity     */
uint32_t timeout;          /* ms? us? ticks?                 */
uint32_t timeout_ms;</pre>
<p>Fixed-point scaling is invisible in the type, so it has to live in the name. This is the same
argument as naming a Q16.16 variable <code>angle_q16</code>, and it is the cheapest defect
prevention available.</p>
<p>The Mars Climate Orbiter is the famous version of this failure. The everyday version is a
timeout passed in milliseconds to a function expecting ticks.</p>

<h3>Integers, and where to keep the resolution</h3>
<p>Millicelsius rather than celsius, microvolts rather than volts. Integer maths in the smallest
useful unit avoids floating point entirely and keeps the resolution the sensor actually has.</p>
<p>The trap is intermediate overflow. Multiply before you divide to preserve precision, but widen
first so the multiply itself cannot overflow:</p>
<pre>/* wrong: loses precision */
int32_t mv = (count / 4095) * vref_mv;

/* wrong: 4095 * 3300 overflows int16, and may overflow int32 for larger terms */
int32_t mv = (count * vref_mv) / 4095;

/* right */
int32_t mv = (int32_t)(((int64_t)count * vref_mv) / 4095);</pre>
<p>The middle one is the interesting case, because it is correct for these particular numbers and
becomes wrong the moment someone reuses the pattern with a 24-bit ADC.</p>

<h3>Say what a failed reading is</h3>
<p>A sensor that is absent, saturated or not yet ready needs an answer that is not a plausible
number. Returning 0 degrees for a disconnected thermocouple is the silent-degradation failure:
the data is wrong, nothing distinguishes it from correct, and it is discovered long after it
started.</p>
<p>Return a status separately from the value, in the same way the driver returns an error code
rather than a magic reading.</p>
`,
quiz: [
{ q: "A thermistor divider is powered from VDD and the ADC's reference is VDD. What does that give you?",
o: ["Better resolution", "A ratiometric measurement, where VDD variation cancels out", "Lower noise", "Faster conversion"],
a: 1, why: "The reading depends only on the resistance ratio, so supply variation stops mattering. It is also why switching to a precision internal reference can make a ratiometric measurement worse rather than better." },
{ q: "Where should a driver convert counts into engineering units?",
o: ["Inside the driver", "It should return raw counts and let a pure function above it convert", "In the ISR", "In the application only"],
a: 1, why: "Counts are what the hardware produced; everything else is interpretation. Keeping conversion in pure functions makes calibration, filtering and scaling testable across their whole input range on a host." },
{ q: "Why write temp_mc rather than temp?",
o: ["Style", "Fixed-point scaling is invisible in the type, so the unit has to live in the name", "It compiles faster", "It is required by MISRA"],
a: 1, why: "Nothing in int32_t says millicelsius. The everyday version of this bug is a timeout passed in milliseconds to a function expecting ticks; the famous version lost the Mars Climate Orbiter." },
{ q: "What is wrong with returning 0 degrees for a disconnected sensor?",
o: ["Nothing", "It is silent degradation: wrong data indistinguishable from correct data", "It should return -1", "It wastes a value"],
a: 1, why: "A device reporting absent is a support call; one returning plausible wrong readings is a recall. Return status separately from the value rather than encoding failure as a magic reading." }
],
interview: {
q: "How would you structure the path from an ADC count to a temperature in an application?",
a: "I would keep the driver in counts and do everything else above it in pure functions. The driver's job is to read a register, and counts are the only thing that is actually a fact about the hardware; anything past that is interpretation and belongs somewhere I can test it. So the chain is count, then fraction of reference, then millivolts, then sensor quantity, then application units, and I would write those steps out rather than collapsing them into one composite constant, because that constant hides every assumption in the chain. The conversion functions take an integer and return an integer in the smallest useful unit, millicelsius rather than celsius, which avoids floating point and keeps the resolution the sensor actually has, and the unit goes in the name because the scaling is invisible in the type. Those functions can then be swept across their whole input range on a host in milliseconds, including the edges where the arithmetic overflows, which is the case people get wrong: you multiply before dividing to keep precision but have to widen first so the multiply itself cannot overflow. I would also decide early whether the measurement is ratiometric, because if the sensor is a divider from VDD and the ADC references VDD then supply variation cancels, and that decides the reference choice before anything else does. And a failed reading has to be a status rather than a plausible number, because a sensor quietly reporting zero is far worse than one reporting that it is absent."
}
},

{
id: "emb-calib",
track: "Embedded C",
title: "Calibration in firmware",
mins: 24,
body: `
<p>Every real measurement chain has an offset and a gain error, and both are specific to the
individual unit. Calibration is how you remove them, and most of the work is in firmware rather
than in the maths.</p>

<h3>The model</h3>
<p>Almost everything starts here:</p>
<pre>corrected = (raw - offset) * gain</pre>
<p>Two coefficients per channel, determined per unit at manufacture. Offset removes the constant
error, gain removes the proportional one.</p>
<p><b>One-point</b> calibration measures a single known value and solves for offset only,
assuming the gain is nominal. Cheap, and adequate when the sensor's gain is well controlled and
the offset is not.</p>
<p><b>Two-point</b> measures two known values, ideally near each end of the range, and solves for
both:</p>
<pre>gain   = (ref_hi - ref_lo) / (raw_hi - raw_lo)
offset = raw_lo - ref_lo / gain</pre>
<p>Going beyond two points buys you linearity correction, and that is a different problem: a
polynomial or a lookup table with interpolation rather than a scale and shift.</p>

<h3>Where the coefficients live</h3>
<p>They are per-unit, so they cannot be compiled in. They go in non-volatile storage, and that
brings the flash lesson's concerns with it.</p>
<p>What the stored record needs, beyond the numbers:</p>
<ul>
<li><b>A CRC.</b> Corrupted coefficients produce plausible wrong readings, which is the worst
failure mode available.</li>
<li><b>A version or format field.</b> You will change the structure, and a device in the field
will have the old one.</li>
<li><b>A calibration date and the equipment used.</b> This is what an auditor asks for, and it is
what tells you whether a unit predates a known problem.</li>
</ul>
<pre>typedef struct {
    uint16_t format;          /* so a future firmware knows the layout */
    uint16_t crc;
    uint32_t cal_unix_time;
    int32_t  offset_counts;
    int32_t  gain_q16;        /* Q16.16, so the unit is in the name */
} cal_record_t;</pre>

<h3>What to do when it is missing or corrupt</h3>
<p>This is the decision people skip, and it is a genuine engineering choice rather than a
technicality:</p>
<ul>
<li><b>Refuse to operate.</b> Correct for a measurement instrument where a wrong number is worse
than no number.</li>
<li><b>Fall back to nominal and report degraded.</b> Correct where partial function is better than
none, provided the degradation is visible.</li>
<li><b>Silently use nominal.</b> Never. This is the failure that ships wrong data for a year.</li>
</ul>
<p>Whichever you choose, the device has to be able to <b>tell you</b> which state it is in. A
diagnostic command reporting whether calibration is valid, and when it was performed, costs
almost nothing and answers a support question that is otherwise unanswerable.</p>

<h3>Temperature</h3>
<p>Offset and gain both drift with temperature, and on a precision measurement that drift is
often larger than the error you calibrated out at 25 degrees.</p>
<p>The firmware pattern is a second-order correction using an on-board temperature sensor, with
coefficients from characterising a sample of units over temperature rather than per unit. That is
usually the right trade: per-unit temperature characterisation means an oven per unit at
manufacture, which is expensive.</p>
<p>Worth being clear about the limit: this corrects the <b>systematic</b> part of the drift.
Hysteresis and long-term ageing are not fixed this way, and eventually the answer is a
recalibration interval.</p>

<h3>Factory against field</h3>
<p>Factory calibration happens once, against traceable references, and is recorded. Field
calibration is a user zeroing the instrument with nothing on the scale.</p>
<p>Keep them in separate records. A user zeroing should never overwrite the factory gain, and a
firmware update should never discard factory calibration. Both of those have happened to real
products, and the second is a recall.</p>
`,
quiz: [
{ q: "What does two-point calibration solve for that one-point does not?",
o: ["Nothing", "Gain as well as offset", "Nonlinearity", "Temperature drift"],
a: 1, why: "One point solves for offset assuming nominal gain. Two points near each end of the range solve for both. Correcting nonlinearity needs more points and a different model, a polynomial or an interpolated table." },
{ q: "Why must a stored calibration record carry a CRC?",
o: ["For versioning", "Corrupted coefficients produce plausible wrong readings, which is the worst failure mode", "Flash requires it", "To save space"],
a: 1, why: "A corrupt record that still parses gives you data that is wrong but believable, and nothing distinguishes it from correct. That is the silent degradation failure, discovered long after it started." },
{ q: "Calibration data is missing at boot. Which response is never acceptable?",
o: ["Refuse to operate", "Fall back to nominal and report degraded", "Silently use nominal values", "Refuse and report why"],
a: 2, why: "The first two are legitimate engineering choices depending on whether wrong data is worse than no data. Silently substituting nominal values is how a product ships wrong measurements for a year." },
{ q: "Why are temperature coefficients usually characterised per design rather than per unit?",
o: ["They do not vary", "Per-unit temperature characterisation means an oven per unit at manufacture", "It is more accurate", "Firmware cannot store them"],
a: 1, why: "It is a cost trade. Characterising a sample over temperature and applying the same coefficients to all units captures most of the systematic drift without a per-unit thermal soak." }
],
interview: {
q: "How would you design calibration for a product that has to hold accuracy for years in the field?",
a: "I would separate the parts that change at different rates. Factory calibration is offset and gain per unit against traceable references, stored in non-volatile memory with a CRC, a format version, and the date and equipment used, because that record is what an auditor asks for and what tells me whether a unit predates a known problem. The CRC matters more than it looks: corrupted coefficients give plausible wrong readings, which is worse than a device that refuses to start. Then temperature, which on a precision instrument usually dominates the error you calibrated out at 25 degrees. I would characterise that over a sample of units rather than per unit, since per-unit thermal soak means an oven per unit at manufacture, and apply the correction in firmware from an on-board sensor. I would be clear that this only removes the systematic part, so hysteresis and ageing still need a recalibration interval. Field calibration, a user zeroing the instrument, goes in a separate record so it can never overwrite factory gain, and a firmware update must never discard the factory record, because that is a recall. And I would decide explicitly what happens when calibration is missing or fails its CRC: either refuse to operate or run nominal and report degraded, but never silently substitute nominal values. Whichever it is, a diagnostic command should report calibration validity and date, because otherwise that support question has no answer."
}
},

{
id: "emb-pwm",
track: "Embedded C",
title: "PWM: resolution, safe updates and analogue output",
mins: 24,
body: `
<p>PWM is a timer comparing a counter against a threshold. Almost everything that matters follows
from that one sentence.</p>

<h3>The trade you cannot escape</h3>
<p>The number of distinct duty cycles is the timer clock divided by the PWM frequency:</p>
<pre>levels = f_timer / f_pwm
bits   = log2(levels)</pre>
<p>At 168 MHz and 20 kHz you get 8400 levels, about 13 bits. Raise the PWM frequency to 200 kHz
for a smaller inductor and you have 840 levels, under 10 bits.</p>
<p>That is a real design conversation rather than a firmware detail: switching frequency, magnetic
component size, audible noise and control resolution are all the same knob. Being able to state
the relationship is what lets you have the conversation with whoever is choosing the inductor.</p>

<h3>Updating duty without a glitch</h3>
<p>Write the compare register directly and you can change it after the counter has already passed
the old value but before the period ends, producing one cycle of wrong width. On a motor that is
a current spike; on an LED it is a visible flicker.</p>
<p>Timers solve this with a <b>preload</b> or shadow register: your write is buffered and takes
effect at the next update event, so every cycle is complete and correct.</p>
<pre>TIM1-&gt;CCMR1 |= TIM_CCMR1_OC1PE;    /* enable preload on this channel */
TIM1-&gt;CR1   |= TIM_CR1_ARPE;       /* and on the period register      */

TIM1-&gt;CCR1 = new_duty;             /* applied at the next update      */</pre>
<p>Enable it. The default is often off, and the resulting glitch is intermittent and load
dependent, which makes it unpleasant to chase.</p>

<h3>Edge against centre aligned</h3>
<p>Edge-aligned counts up and resets. Centre-aligned counts up then down, so the pulse is
symmetric about the period's midpoint.</p>
<p>Centre alignment costs half the resolution for the same clock and frequency, and buys two
things. Harmonic content is lower, which matters for EMC and for audible noise in motor drive.
And the update event lands at a predictable point, which makes it a good trigger for an ADC
sampling motor current at the moment the switching noise is quiet.</p>
<p>That last trick, triggering the ADC from the timer so current is sampled mid-pulse, is standard
in motor control and worth knowing by name.</p>

<h3>Dead time</h3>
<p>In a half bridge, turning one transistor on before the other has fully turned off shorts the
supply through both. This is shoot-through and it destroys parts.</p>
<p>Advanced timers insert dead time in hardware, a configurable gap where both outputs are off.
The value comes from the transistor's turn-off time plus the gate driver's propagation delay,
with margin.</p>
<p>Do this in hardware, never in software. A software gap depends on interrupt timing, and the
one time an interrupt lands in the wrong place you lose the bridge.</p>

<h3>PWM as a DAC</h3>
<p>Low-pass filter PWM and you get an analogue voltage proportional to duty. It is cheap and it
has two costs people discover late.</p>
<p><b>Ripple.</b> A single RC gives ripple roughly proportional to the PWM period divided by RC.
Less ripple means a larger RC.</p>
<p><b>Settling time.</b> Which is several times RC. So the two requirements pull in opposite
directions, and you cannot have both a fast response and low ripple from one RC. A second RC
stage, or a higher PWM frequency, is the way out, and the higher frequency costs resolution as
above.</p>
<p>The honest summary: PWM plus RC is excellent for setting a slowly changing bias or reference,
and a poor choice for a signal that has to move quickly. For that, use a real DAC.</p>

<h3>Two firmware faults worth recognising</h3>
<p><b>Duty of 100 per cent not fully on.</b> Writing the compare register equal to the period
usually leaves one clock of off time. Many timers need the compare value set above the period, or
the channel forced on, to get a true 100 per cent.</p>
<p><b>Duty jumps to full when you meant zero.</b> An unsigned duty variable that underflows. A
subtraction taking it below zero wraps to a very large number, which the timer happily accepts.
This is worth a clamp rather than a comment.</p>
`,
quiz: [
{ q: "Your timer clock is 168 MHz and you raise the PWM frequency from 20 kHz to 200 kHz. What happens to resolution?",
o: ["Unchanged", "It falls from about 13 bits to under 10", "It improves", "It doubles"],
a: 1, why: "Levels equal timer clock divided by PWM frequency, so 8400 becomes 840. Switching frequency, magnetic size, audible noise and control resolution are all the same knob." },
{ q: "What does enabling the compare register's preload do?",
o: ["Speeds up the write", "Buffers it so it takes effect at the next update event, preventing a partial cycle", "Doubles the resolution", "Enables dead time"],
a: 1, why: "Writing directly can change the threshold after the counter has passed the old value, producing one cycle of wrong width. The default is often off, and the resulting glitch is intermittent and load dependent." },
{ q: "Why must dead time in a half bridge be generated in hardware?",
o: ["It is faster", "A software gap depends on interrupt timing, and one badly placed interrupt destroys the bridge", "Software cannot measure it", "It saves code"],
a: 1, why: "Shoot-through happens when both transistors conduct at once. The gap has to be guaranteed, and nothing about software timing is guaranteed once interrupts exist." },
{ q: "Why can a single RC filter on PWM not give both low ripple and fast settling?",
o: ["It can", "Ripple falls with larger RC but settling time is several times RC, so they oppose each other", "The PWM frequency is fixed", "Filters are lossy"],
a: 1, why: "One knob, two requirements pulling opposite ways. A second RC stage or a higher PWM frequency is the way out, and the higher frequency costs resolution." }
],
interview: {
q: "You need a 0 to 5 volt analogue output and the part has no DAC. What do you do?",
a: "PWM into a low-pass filter is the obvious answer, and I would want to establish two things before committing to it. First how fast the output has to move, because a single RC gives ripple roughly proportional to the PWM period over RC while settling takes several times RC, so those two requirements pull in opposite directions and you cannot satisfy both from one stage. If the output is a slowly changing bias or reference then it is an excellent fit; if it has to track something quickly then I would push for a real DAC rather than build something that is marginal in both respects. Second the resolution, because the number of duty levels is the timer clock divided by the PWM frequency, so raising the frequency to reduce ripple costs bits directly. At 168 megahertz and 20 kilohertz that is about 13 bits, and at 200 kilohertz it is under 10. Beyond that I would enable preload on the compare register so duty changes take effect at an update event rather than mid-cycle, because writing directly can produce one cycle of the wrong width. I would clamp the duty variable rather than trusting it, since an unsigned duty that underflows wraps to a huge value and the timer accepts it happily, which presents as the output jumping to full when you meant zero. And I would check whether a hundred per cent duty is actually fully on, because on many timers setting compare equal to the period still leaves one clock of off time."
}
},

{
id: "emb-filter-fw",
track: "Embedded C",
title: "Filters you actually write in firmware",
mins: 24,
body: `
<p>The DSP track covers filter design properly. This is the small set that gets written by hand in
firmware, why each one, and the mistakes that come with them.</p>

<h3>The one-pole IIR, in integers</h3>
<p>The workhorse. An exponential moving average, one multiply, one state variable:</p>
<pre>/* y += (x - y) * alpha, with alpha = 1/2^k */
static int32_t y;

int32_t ema(int32_t x)
{
    y += (x - y) &gt;&gt; K;
    return y;
}</pre>
<p>The time constant is roughly 2^K samples, so K is the only tuning knob and each increment
halves the bandwidth. No coefficients, no history buffer, no multiply on parts without one.</p>
<p><b>The bug this hides.</b> The shift truncates towards negative infinity, so when
<code>(x - y)</code> is smaller than 2^K the increment is zero and the filter <b>stops</b>. On a
slowly rising signal the output sticks below the input permanently, and for negative values the
truncation biases it downward.</p>
<p>The fix is to keep the state at higher precision and shift only on output:</p>
<pre>static int32_t acc;                    /* state scaled up by 2^K */

int32_t ema(int32_t x)
{
    acc += x - (acc &gt;&gt; K);
    return acc &gt;&gt; K;
}</pre>
<p>Being able to explain that failure is a good signal in an interview, because almost everyone
has written the first version and most have not noticed why it plateaus.</p>

<h3>The moving average</h3>
<p>N samples summed and divided. Its appeal is that with a running sum it costs one add, one
subtract and one shift per sample regardless of N, if N is a power of two.</p>
<pre>sum += x - buf[i];
buf[i] = x;
i = (i + 1) &amp; (N - 1);
out = sum &gt;&gt; LOG2_N;</pre>
<p>Two properties worth knowing. It has exactly linear phase, so it delays every frequency by the
same (N-1)/2 samples, which matters if you are comparing two filtered signals. And it has
<b>nulls</b> at multiples of the sample rate divided by N, which you can place deliberately: to
kill 50 Hz mains, average exactly one mains period's worth of samples.</p>
<p>That trick is worth remembering. It is often a better answer than a notch filter and it costs
nothing.</p>

<h3>The median filter</h3>
<p>The only one of the three that removes spikes rather than smearing them. A single wild sample
is discarded entirely by a median of three or five, whereas any linear filter spreads it across
its whole impulse response.</p>
<p>Use it where the noise is impulsive: a mechanical contact, an ADC channel disturbed by
switching, a sensor with occasional bad frames. Follow it with an EMA if you also want smoothing.
The cost is a sort, so keep the window small and odd.</p>

<h3>Where in the chain</h3>
<p>Order matters and the sequence is usually:</p>
<pre>raw counts -&gt; median (spikes) -&gt; calibration -&gt; EMA (smoothing) -&gt; units</pre>
<p>Despiking before calibration means a wild value cannot be scaled into something enormous.
Smoothing after calibration means the filter operates on a linear quantity, which matters if the
calibration is nonlinear.</p>

<h3>The cost nobody budgets for</h3>
<p>Every filter adds delay, and in a control loop delay is what turns a stable system into an
oscillating one. Phase margin is spent by group delay, and an EMA with a long time constant
spends a lot of it.</p>
<p>So filtering a control loop's feedback to make the signal "look nicer" is one of the classic
ways to destabilise it. If a loop is noisy, the honest answers are to fix the noise at source, to
sample faster, or to accept the noise, before adding filtering that the loop then has to be
detuned to tolerate.</p>
<p>Which is the general point: a filter in firmware is nearly always the cheapest place to put
one, and nearly never the best place. It is where you end up when the hardware filter was omitted
or the noise was found late.</p>
`,
quiz: [
{ q: "Why does y += (x - y) >> K stop responding on a slowly changing signal?",
o: ["Integer overflow", "When (x - y) is smaller than 2^K the shift truncates to zero, so the state stops moving", "The time constant is too long", "It does not"],
a: 1, why: "The output sticks below the input permanently, and truncation towards negative infinity biases negative values downward too. The fix is to hold the state scaled up by 2^K and shift only on output." },
{ q: "What is the useful property of a moving average whose length equals one mains period?",
o: ["Lower delay", "Its nulls land exactly on 50 Hz and its harmonics", "Better resolution", "It removes spikes"],
a: 1, why: "A moving average of N samples has nulls at multiples of the sample rate divided by N. Placing them on mains frequency is often a better answer than a notch filter and costs nothing." },
{ q: "Which filter removes an occasional wild sample rather than smearing it?",
o: ["EMA", "Median", "Moving average", "One-pole IIR"],
a: 1, why: "Any linear filter spreads a spike across its impulse response. A median of three or five discards it entirely, which is what you want for impulsive noise from contacts or switching disturbance." },
{ q: "Why is filtering a control loop's feedback to make it look nicer dangerous?",
o: ["It is slow", "The added group delay spends phase margin and can destabilise the loop", "It uses RAM", "It changes the gain"],
a: 1, why: "Delay is what turns a stable loop into an oscillating one. Fix the noise at source, sample faster, or accept it, before adding filtering the loop must then be detuned to tolerate." }
],
interview: {
q: "A sensor reading is noisy. Walk me through how you would decide what to do about it.",
a: "I would want to know what kind of noise it is before choosing anything, because the answers are different. If it is occasional wild samples, that is impulsive and a median of three or five removes them outright, whereas any linear filter would smear each spike across its impulse response and make things worse. If it is broadband and centred on the right value, that is a candidate for averaging or an exponential moving average. And if it is periodic, mains being the usual suspect, then a moving average whose length is exactly one mains period puts a null on it for free, which is usually better than a notch. Before any of that I would check whether it is actually noise, because a reading that is consistently low with a high impedance source is an acquisition time problem and no filter fixes that. I would also ask where the signal is going, because if it is a control loop then filtering is not free: the group delay spends phase margin, and smoothing feedback to make it look nicer is a classic way to destabilise a loop. There the honest options are to fix the noise at source, sample faster, or accept it. The general point I would make is that a firmware filter is nearly always the cheapest place to put one and nearly never the best place; it is where you end up when the hardware filter got left off or the noise turned up late."
}
},

{
id: "emb-averaging",
track: "Embedded C",
title: "Averaging, oversampling and when they lie",
mins: 23,
body: `
<p>Averaging is the first thing everyone reaches for and the thing most often applied where it
does not help. The rules are simple and the conditions attached to them are what matter.</p>

<h3>The square root rule</h3>
<p>Averaging N independent samples reduces random noise by the square root of N. Four samples
halve it, a hundred give a factor of ten.</p>
<p>The diminishing return is the practical point. Going from 1 to 16 samples buys a factor of 4;
going from 16 to 256 buys another factor of 4 for sixteen times the work. There is usually a
sensible stopping point well before the one people pick.</p>

<h3>The word doing all the work is independent</h3>
<p>The rule holds only for <b>uncorrelated</b> noise. Three common cases where it does not:</p>
<ul>
<li><b>Periodic interference.</b> Averaging sixteen samples taken at 3.2 kHz against 50 Hz hum
averages over a fraction of one cycle, so you are averaging a nearly constant offset and it
barely reduces at all.</li>
<li><b>A systematic offset.</b> Averaging a bias gives you the bias, more precisely. Calibration
removes it; averaging never will.</li>
<li><b>Drift.</b> If the underlying value moves during the averaging window, you get the mean of
a changing quantity, which is not the value at any particular time.</li>
</ul>
<p>That first case has a neat fix: average over exactly one interference period, or an integer
number of them, and the interference cancels rather than merely reducing. It is the same
observation as placing a moving average's nulls on mains.</p>

<h3>Oversampling for extra bits</h3>
<p>Distinct from averaging for noise, though the arithmetic looks similar. To gain <b>n</b> bits
of resolution, take 4^n samples, sum them, and shift right by n:</p>
<pre>/* 12-bit ADC to 14-bit result: 4^2 = 16 samples, shift by 2 */
uint32_t sum = 0;
for (int i = 0; i &lt; 16; i++) sum += adc_read();
uint16_t result = sum &gt;&gt; 2;      /* 14 bits */</pre>
<p>Note it is 4^n, not 2^n. Two extra bits costs sixteen samples; four extra bits costs 256.</p>
<p><b>The condition everyone omits:</b> there must be at least about one LSB of noise present, and
it must be uncorrelated with the signal. Without it, every sample of a steady input returns the
same count, the sum is exactly sixteen times that count, and you have gained precisely nothing.</p>
<p>That is why the technique is sometimes described as needing dither. A very quiet input is
exactly the case where oversampling fails, which is the opposite of the intuition.</p>
<p>Many ADCs implement this in hardware, summing and shifting for you. Check before writing the
loop.</p>

<h3>Sum in a wide enough type</h3>
<pre>uint16_t sum = 0;                        /* overflows at 16 x 4095 */
for (int i = 0; i &lt; 16; i++) sum += adc_read();</pre>
<p>Sixteen 12-bit readings reach 65,520, which just fits, and seventeen do not. Someone changes 16
to 32 and the readings become nonsense. Use uint32_t and remove the trap.</p>

<h3>Averaging destroys information you may want</h3>
<p>The mean is not the only useful statistic, and reporting only the mean throws away things that
matter:</p>
<ul>
<li><b>Min and max</b> over the window tell you the peak excursion, which is what a mechanical
limit or a safety threshold cares about.</li>
<li><b>The spread</b> is a health indicator. A channel whose noise has doubled is telling you
something about a connection, and the mean will look perfectly normal.</li>
</ul>
<p>Carrying min, max and a sample count alongside the mean costs a few bytes and turns a support
call into a diagnosis. It is the same argument as counting bus retries: anything the firmware
smooths away is information you have chosen to discard.</p>
`,
quiz: [
{ q: "You average 100 independent samples. What happens to the random noise?",
o: ["Reduced by 100", "Reduced by 10", "Unchanged", "Reduced by 50"],
a: 1, why: "Random noise falls as the square root of N. The practical point is diminishing returns: 1 to 16 samples buys a factor of 4, and 16 to 256 buys another factor of 4 for sixteen times the work." },
{ q: "Why does averaging 16 samples do little against 50 Hz mains hum?",
o: ["Mains is too strong", "The noise is not independent: over a fraction of a cycle you are averaging a nearly constant offset", "16 is too few", "Mains is out of band"],
a: 1, why: "The square root rule needs uncorrelated noise. The fix is to average over exactly one interference period, or an integer number of them, so it cancels rather than merely reducing." },
{ q: "How many samples do you need to gain 2 extra bits by oversampling?",
o: ["4", "16", "64", "256"],
a: 1, why: "It is 4^n, not 2^n. Two bits costs sixteen samples, four bits costs 256. Sum them and shift right by n." },
{ q: "Oversampling a very quiet, steady input gains you nothing. Why?",
o: ["The ADC is too slow", "There must be about one LSB of uncorrelated noise present, or every sample returns the same count", "The reference drifts", "The sum overflows"],
a: 1, why: "Without dither the sum is exactly 16 times one identical reading and no information is added. A quiet input is precisely where the technique fails, which is the opposite of the intuition." }
],
interview: {
q: "When is averaging the wrong answer to a noisy measurement?",
a: "Whenever the noise is not independent, which covers more real cases than people expect. If it is periodic interference, mains being the obvious one, then averaging sixteen samples spanning a fraction of a cycle is averaging a nearly constant offset and barely reduces it, though averaging over exactly one period or an integer number of periods makes it cancel outright. If it is a systematic offset then averaging gives you the offset more precisely, and only calibration removes it. And if the underlying quantity is drifting during the window then the mean is not the value at any particular time, which matters if something downstream timestamps it. There is also the control loop case, where averaging adds group delay that spends phase margin, so the smoother signal costs you stability. Beyond the noise question I would push back on averaging as a default because of what it discards. Min and max over the window tell you peak excursion, which is what a safety threshold actually cares about, and the spread is a health indicator: a channel whose noise has doubled is telling you something about a connection while the mean still looks perfectly normal. Carrying those alongside the mean costs a few bytes and turns a support call into a diagnosis."
}
}

);
