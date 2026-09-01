// Acoustics track: deep-dive lessons. Same shape as data.js entries.
// Appended to LESSONS so index.html picks them up after data.js loads.

LESSONS.push(

{
id: "ac-transducers",
track: "Acoustics",
sub: "Transducers and beams",
title: "Piezoelectric transducers inside out",
mins: 28,
body: `
<p>Piezoelectricity runs both ways. Squeeze certain crystals or poled ceramics (quartz,
PZT, PVDF, single-crystal PMN-PT) and charge appears on the electrodes; apply a voltage
and the material strains. One physical element is therefore both loudspeaker and
microphone, which is why a single probe can transmit a pulse and then listen for its
echo microseconds later. The coupling comes from the material's internal dipoles: in
PZT they are aligned once during poling, and driving fields swing the lattice around
that bias.</p>
<h3>Thickness-mode resonance</h3>
<p>A plate driven across its thickness rings loudest when the thickness is half a
wavelength in the ceramic, so the fundamental frequency is c over 2t. PZT has a
longitudinal velocity around 4000 to 4400 m/s, so a 1 mm plate resonates near 2 MHz
and a 0.4 mm plate near 5 MHz. This is why high-frequency elements are fragile: a
50 MHz element is tens of microns thick. Lateral and radial modes also exist and are
parasitic; element shaping and dicing push them away from the working band.</p>
<h3>Q, bandwidth and ring-down</h3>
<p>Q is stored energy over energy lost per cycle, and it equals centre frequency over
bandwidth. A bare, air-backed ceramic has Q in the tens: efficient, narrowband, and it
rings for roughly Q cycles after the drive stops. At 5 MHz, twenty cycles of ring-down
is 4 microseconds; in water that smears the pulse over about 6 mm of path, ruining
axial resolution and burying shallow echoes in the transmitter's own tail. A heavily
damped probe with Q near 2 stops in a couple of cycles and resolves features a fraction
of a millimetre apart.</p>
<h3>Backing and matching, the two design levers</h3>
<ul>
<li><b>Backing:</b> a lossy, high-impedance block (tungsten-loaded epoxy) bonded to the
rear face absorbs the backward wave instead of letting it slosh back into the element.
This deliberately spends efficiency to buy bandwidth and a short pulse. NDT immersion
probes are heavily backed; power transducers for levitation or welding are air-backed
because they want the opposite trade: maximum output at one frequency.</li>
<li><b>Matching layers:</b> the ceramic sits near 30 MRayl, water at 1.5, so without
help most energy never leaves the front face. One or two quarter-wave layers of
intermediate impedance (ideal single layer: square root of Z1 times Z2, about 6.7
MRayl here) transform the load upward, improving both sensitivity and bandwidth.</li>
</ul>
<h3>Why bandwidth matters for pulses</h3>
<p>A pulse's length in time is roughly the inverse of its bandwidth. Axial resolution
is half the spatial pulse length, so resolution is set by bandwidth, not by centre
frequency alone. A 5 MHz probe with 80 percent fractional bandwidth resolves layers a
5 MHz narrowband probe cannot, at the same penetration. Broadband pulses also carry
spectral information: frequency-dependent attenuation and scattering measurements,
the kind used to characterise grain structure in metals or ice, only work if the
pulse contains a usable spread of frequencies in the first place. When you specify a
transducer, you are really choosing a point on the efficiency versus bandwidth curve:
imaging and NDT sit at the damped, broadband end; levitation, cleaning and therapy
sit at the resonant, high-Q end. Being able to say why, with the backing and matching
story attached, is the interview-ready version of this lesson.</p>`,
quiz: [
{ q: "A PZT plate (c about 4000 m/s) is 0.5 mm thick. Its thickness-mode fundamental is near:",
o: ["1 MHz", "2 MHz", "4 MHz", "8 MHz"],
a: 2, why: "f = c/2t = 4000/(2 x 0.0005 m) = 4 MHz. Half a wavelength fits across the thickness at resonance." },
{ q: "Adding a heavy tungsten-epoxy backing to a transducer primarily:",
o: ["Raises efficiency and narrows bandwidth", "Shortens the pulse by absorbing the rear wave, at the cost of sensitivity", "Increases the resonant frequency", "Protects it from moisture"],
a: 1, why: "Backing damps the resonance: lower Q, wider bandwidth, shorter ring-down, less output per volt." },
{ q: "A 5 MHz probe has a -6 dB bandwidth of 2.5 MHz. Its Q is about:",
o: ["0.5", "12.5", "2", "5"],
a: 2, why: "Q = f0/BW = 5/2.5 = 2. A low-Q, broadband probe suited to short pulses." },
{ q: "Axial resolution of a pulse-echo system is fundamentally set by:",
o: ["Element diameter", "Drive voltage", "Focal length", "Pulse bandwidth"],
a: 3, why: "Pulse duration is roughly 1/bandwidth, and axial resolution is half the spatial pulse length. Centre frequency alone does not decide it." }
],
interview: {
q: "Walk me through what happens, physically, between applying a voltage spike to a probe and detecting an echo.",
a: "The spike strains the poled ceramic through the inverse piezoelectric effect, launching pressure waves from both faces. The rear wave dies in the lossy backing; the front wave passes through quarter-wave matching layers that step the impedance down towards the load, so a short, broadband pulse enters the water or couplant. It propagates, loses amplitude to absorption and scattering, and partially reflects wherever acoustic impedance changes. The returning pressure strains the same ceramic, now acting as a receiver, and the direct effect generates charge that the front-end amplifier converts to voltage. Time of flight gives range through distance equals velocity times time over two, and the pulse shape carries the bandwidth I paid for with backing and matching."
}
},

{
id: "ac-beams",
track: "Acoustics",
sub: "Transducers and beams",
title: "Beams, near field and focusing",
mins: 28,
body: `
<p>A circular piston source does not radiate a neat cone. Close in, every point on the
face contributes with a different phase, and the on-axis pressure oscillates through
maxima and nulls as contributions interfere. This structured region is the near field
(Fresnel zone). Beyond it the contributions lock together and the beam becomes a
smoothly diverging far field. The boundary sits at the near field length: N is a
squared over lambda, with a the element radius (equivalently, diameter squared over
4 lambda). The last on-axis maximum sits there, and it is the natural focus of an
unfocused probe.</p>
<h3>A worked number to carry around</h3>
<p>Take a 12.7 mm diameter, 5 MHz immersion probe in water. Lambda is 1480/5,000,000,
about 0.30 mm. N = (6.35 squared)/0.30, roughly 135 mm. Inside that 135 mm the echo
amplitude from a small reflector is a jagged function of range, which is why
calibration and sizing inside the near field is treacherous. Beyond N the beam
diverges with half angle given by sine of gamma equals 0.61 lambda over a: here about
1.7 degrees, a usefully pencil-like beam.</p>
<h3>Focusing</h3>
<p>Three routes to the same physics: a curved element, a lens bonded to a flat element,
or an array with electronic delays that equalise arrival times at the focal point. All
of them impose a converging phase profile. The key constraint: you can only focus
within the near field. N is the effective focal length of the unfocused aperture, and
no lens can push the focus beyond it; focusing works by pulling that natural focus
inward and tightening it.</p>
<h3>f-number and beamwidth</h3>
<p>The f-number is focal length divided by aperture diameter. The -6 dB lateral
beamwidth at focus is approximately lambda times the f-number. Our 5 MHz probe focused
at F2 gives a spot near 0.6 mm; at F4, about 1.2 mm. This little formula is the whole
lateral-resolution story: to see finer detail, raise frequency (smaller lambda) or
open the aperture (smaller f-number). Depth of field grows roughly as lambda times
f-number squared, so tight focusing buys a thin slice of sharpness: F2 is sharp but
shallow, F6 is soft but forgiving. Arrays escape the compromise by refocusing
dynamically on receive as echoes return from successive depths.</p>
<h3>Apodisation</h3>
<p>A uniformly driven aperture has strong sidelobes, about -17 dB for the first one on
a rectangular aperture, and sidelobes place energy off-axis that returns as ghost
echoes and clutter. Apodisation tapers the drive amplitude towards the aperture edges
(Hann, Gaussian and similar weightings), suppressing sidelobes at the price of a
modestly wider main lobe, exactly the window trade-off from FFT practice transplanted
into space. Arrays apodise electronically per element; single elements can only
approximate it with shaded electrodes.</p>
<h3>Why this matters in practice</h3>
<p>Imaging: lateral resolution and clutter are set by aperture, f-number and
apodisation, so image quality is beam design. NDT sizing: a defect echo means nothing
until you know the beamwidth at that range. Levitation: a trap is just a focus you
choose to park a particle in, and the trap stiffness follows the same lambda times
f-number scaling, so aperture geometry decides how hard you can hold something. Same
beam mathematics, three industries.</p>`,
quiz: [
{ q: "A 10 mm diameter probe at 2 MHz in water (lambda 0.74 mm) has a near field length of about:",
o: ["34 mm", "135 mm", "7 mm", "68 mm"],
a: 0, why: "N = D squared/(4 lambda) = 100/(4 x 0.74) which is about 34 mm. Equivalent to a squared over lambda with a = 5 mm." },
{ q: "On-axis echo amplitude from a small target placed inside the near field:",
o: ["Falls smoothly with range", "Is constant", "Oscillates with range due to interference", "Is always zero"],
a: 2, why: "Near-field interference produces maxima and nulls on axis, which is why sizing there is unreliable." },
{ q: "Lateral -6 dB beamwidth at focus is approximately:",
o: ["Aperture diameter over 2", "Lambda times focal length", "Independent of wavelength", "Lambda times f-number"],
a: 3, why: "Beamwidth is about lambda x F. Shorter wavelength or wider aperture (lower F) tightens the spot." },
{ q: "Apodisation of an array mainly trades:",
o: ["Bandwidth for sensitivity", "Lower sidelobes for a wider main lobe", "Depth of field for frame rate", "Steering range for pitch"],
a: 1, why: "Tapering the aperture weighting suppresses sidelobes but broadens the main lobe, the spatial twin of FFT windowing." }
],
interview: {
q: "How would you choose aperture, frequency and focus for a new immersion inspection task?",
a: "I start from the required resolution and depth. Lateral resolution is roughly lambda times f-number, so the target defect size fixes the product of wavelength and F. Penetration and grain scattering in the material cap the frequency, so I pick the highest frequency the material tolerates, then set the aperture to hit the f-number I need at the inspection depth, checking the focus sits comfortably inside the near field, since no optic can focus beyond it. I confirm depth of field covers the zone of interest, or plan multiple focal passes if it cannot. Finally I verify the beam experimentally, with a ball target or hydrophone map, because lens tolerances and matching layers routinely move the real focus from the nominal one."
}
},

{
id: "ac-waves",
track: "Acoustics",
sub: "Waves and propagation",
title: "Wave types, refraction and mode conversion",
mins: 28,
body: `
<p>Fluids carry only longitudinal (compression) waves: particle motion along the travel
direction. Solids also support shear waves, with particle motion transverse to travel,
because solids resist shape change. Shear is always slower: in steel, longitudinal is
about 5900 m/s and shear about 3230 m/s, a ratio near 1.8 that holds loosely across
many metals. Slower means shorter wavelength at the same frequency, which is one
reason shear-wave inspection resolves finer detail for a given frequency.</p>
<h3>Snell's law works for sound too</h3>
<p>At an interface, the trace velocity along the boundary must match, so sine of theta
over c is conserved: sine theta1 over c1 equals sine theta2 over c2. Because a single
incident wave can generate both longitudinal and shear waves in the solid, one angle
in gives up to two refracted beams out, each obeying Snell with its own velocity.
That splitting is mode conversion, and it is the daily business of angle-beam NDT.</p>
<h3>Critical angles, with numbers</h3>
<p>Going from water (1480 m/s) into steel, the faster refracted wave hits 90 degrees
first. First critical angle: arcsine of 1480/5900, about 14.5 degrees; beyond it no
longitudinal wave enters the steel, leaving a pure shear beam, which is exactly what
weld inspectors want because a single clean mode gives unambiguous time of flight.
Second critical angle: arcsine of 1480/3230, about 27 degrees; beyond that shear
vanishes too, and near this angle the energy reorganises into a Rayleigh wave gliding
along the surface. Standard wedges are cut precisely into the window between these
angles.</p>
<h3>Mode conversion is everywhere</h3>
<p>Any oblique reflection inside a solid can convert modes: a longitudinal pulse
striking a backwall at an angle returns partly as shear, so real A-scans grow extra
arrivals that a purely longitudinal mental model cannot explain. Trained eyes treat
these ghost echoes as either clutter to be suppressed or, in techniques like TOFD and
mode-converted sizing, as free extra measurements of the same defect.</p>
<h3>Surface and guided waves, at concept level</h3>
<p>A Rayleigh wave travels along a free surface at about 0.9 times the shear velocity,
with elliptical particle motion decaying within roughly a wavelength of depth: ideal
for finding surface-breaking cracks. Plates a few wavelengths thick carry Lamb waves,
symmetric and antisymmetric families whose velocity depends on the frequency-thickness
product; they are dispersive, so a sharp pulse spreads as it propagates, and they can
sweep metres of structure from one probe, which is the whole appeal of guided-wave
pipeline screening.</p>
<h3>Anisotropy basics</h3>
<p>In crystals, stiffness depends on direction, so velocity does too. Single-crystal
ice is hexagonal: compressional velocity along the c-axis differs by a few percent
from velocity across it, and in strongly textured polycrystals (aligned fabric in ice,
columnar grains in austenitic welds) the aggregate is anisotropic as well. Consequences
worth stating in an interview: velocity measured in one direction does not transfer to
another, refraction angles shift from isotropic predictions, and energy can walk off
at an angle to the wavefront normal (beam skew), which famously misdirects beams in
austenitic weld inspection and, more usefully, lets ultrasound measure fabric
orientation in ice cores.</p>`,
quiz: [
{ q: "Why do fluids not support shear waves?",
o: ["They are too dense", "They lack shear stiffness, so transverse restoring forces are absent", "Their sound speed is too low", "They absorb them instantly"],
a: 1, why: "Shear propagation needs a restoring force against shape change; ideal fluids have none, so only compression propagates." },
{ q: "Water (1480 m/s) to steel: the first critical angle (longitudinal disappears) is about:",
o: ["27 degrees", "45 degrees", "14.5 degrees", "5 degrees"],
a: 2, why: "arcsin(1480/5900) = arcsin(0.251), about 14.5 degrees. Beyond it only shear enters the steel." },
{ q: "Angle-beam weld probes are designed to put only a shear wave into the steel because:",
o: ["Shear waves are faster", "A single mode gives unambiguous arrival times; two modes create confusing duplicate echoes", "Shear waves do not attenuate", "Longitudinal waves cannot reflect from cracks"],
a: 1, why: "Between the critical angles one clean mode propagates, so each echo maps to one path and time of flight is interpretable." },
{ q: "A Rayleigh wave travels:",
o: ["Along a free surface at roughly 0.9 times the shear speed, decaying within about a wavelength of depth", "Through the bulk at the longitudinal speed", "Only in fluids", "Faster than the longitudinal wave"],
a: 0, why: "Rayleigh waves are surface-bound, slightly slower than shear, and sample only a wavelength-deep skin, ideal for surface cracks." }
],
interview: {
q: "Your beam behaves unexpectedly in a textured, anisotropic material. What is going on and how do you handle it?",
a: "In anisotropic media the stiffness, and therefore velocity, depends on propagation direction relative to the texture, so three things break at once: Snell predictions made with a single velocity give the wrong refraction angle, time of flight no longer converts to depth with one calibration constant, and energy skews away from the wavefront normal, so the beam physically walks sideways. I would first characterise the material, measuring velocity versus direction on a reference sample, then either model propagation with the measured stiffness tensor or recalibrate empirically with reflectors at known positions. I have lived this in ice, where crystal fabric makes velocity directional; the same physics misdirects beams in austenitic welds, and the fix is the same: measure the anisotropy, then respect it in the reconstruction."
}
},

{
id: "ac-attenuation",
track: "Acoustics",
sub: "Waves and propagation",
title: "Attenuation and scattering",
mins: 27,
body: `
<p>An ultrasonic pulse loses amplitude as exp(minus alpha x). Splitting alpha into its
mechanisms is what turns attenuation from a nuisance into a design variable, and
sometimes into a measurement in its own right.</p>
<h3>Absorption: energy becomes heat</h3>
<p>Viscous losses, heat conduction and molecular relaxation convert ordered acoustic
motion into heat. In pure water absorption scales almost exactly with frequency
squared, about 0.0022 dB per cm per MHz squared. At 5 MHz that is a trivial 0.055
dB/cm; a 20 cm pulse-echo path (40 cm total) costs about 2 dB. At 50 MHz it is 5.5
dB/cm and the same path costs 220 dB, which is simply impossible. That one comparison
explains why acoustic microscopy works over millimetres and immersion NDT over
decimetres. Soft tissue behaves differently, roughly 0.5 dB per cm per MHz (closer to
linear in f), because relaxation processes dominate. Absorption is also the useful
kind of loss: focused ultrasound therapy is deliberate absorption.</p>
<h3>Scattering: energy goes elsewhere</h3>
<p>Grains, pores, fibres and inclusions redirect energy out of the beam. It is not
absorbed, and that distinction has teeth: scattered energy returns to the receiver as
grain noise, a hissing floor of backscatter that masks small defect echoes. Raising
gain amplifies signal and grain noise together, so scattering sets a signal-to-noise
ceiling that no amplifier can buy back. The only levers are frequency, beam geometry
and averaging.</p>
<h3>The three regimes, keyed to grain size d versus wavelength</h3>
<ul>
<li><b>Rayleigh regime</b> (d much smaller than lambda): scattering scales with d cubed
and frequency to the fourth power. Brutal frequency dependence: double the frequency,
sixteen times the scattering loss.</li>
<li><b>Stochastic regime</b> (d comparable to lambda): scales roughly with d and
frequency squared. Attenuation is high and grain noise is at its worst.</li>
<li><b>Geometric regime</b> (d much larger than lambda): each grain boundary acts as a
reflecting facet; loss becomes roughly frequency independent.</li>
</ul>
<p>Worked sanity check: coarse-grained material with 1 mm grains, longitudinal velocity
4000 m/s. At 5 MHz lambda is 0.8 mm, comparable to d: stochastic regime, expect
severe noise. Drop to 1 MHz and lambda is 4 mm, so d over lambda is 0.25 and you are
sliding into the Rayleigh regime where the f to the fourth law makes the material
dramatically quieter. This is exactly why coarse austenitic welds, coarse ice and
concrete are inspected at low, sometimes sub-MHz, frequencies.</p>
<h3>The engineering trade, stated the way an interviewer wants it</h3>
<p>Resolution scales with frequency; attenuation grows with frequency somewhere between
f and f to the fourth depending on regime. So every application maximises frequency
subject to an attenuation budget: work out the round-trip path, multiply by alpha at
the candidate frequency, add interface losses, and check the total sits inside the
system's dynamic range, typically 80 to 100 dB. If it does not fit, drop frequency,
shorten the path, or average.</p>
<h3>Attenuation as signal</h3>
<p>Because the regimes are keyed to d over lambda, measuring attenuation versus
frequency with a broadband pulse estimates grain size without cutting the sample:
standard practice in metallurgy and directly analogous to characterising crystal
structure in ice cores from backscatter and spectral loss. The nuisance, measured
carefully, becomes the product.</p>`,
quiz: [
{ q: "In the Rayleigh scattering regime, halving the frequency reduces scattering attenuation by a factor of about:",
o: ["2", "4", "8", "16"],
a: 3, why: "Rayleigh scattering scales with f to the fourth: (1/2) to the fourth is 1/16." },
{ q: "Grain noise on an A-scan cannot be fixed by adding receiver gain because:",
o: ["Amplifiers distort at high gain", "Gain amplifies backscatter and defect echoes equally, so SNR is unchanged", "Grain noise is electrical", "The ADC clips"],
a: 1, why: "Grain noise is coherent acoustic backscatter arriving with the signal; amplification scales both together." },
{ q: "Water absorbs about 0.0022 dB per cm per MHz squared. The one-way loss over 10 cm at 10 MHz is about:",
o: ["0.22 dB", "22 dB", "2.2 dB", "0.022 dB"],
a: 2, why: "0.0022 x 10 squared = 0.22 dB/cm; times 10 cm gives 2.2 dB." },
{ q: "Inspecting a very coarse-grained casting, the standard move is to:",
o: ["Raise the frequency for better resolution", "Increase pulser voltage", "Use a smaller transducer", "Lower the frequency so the wavelength is large against the grains"],
a: 3, why: "Pushing d over lambda down into the Rayleigh regime collapses scattering via the f to the fourth law, trading resolution for usable SNR." }
],
interview: {
q: "How do you choose an operating frequency for a new material you have never inspected?",
a: "I treat it as an attenuation budget problem. First I estimate or measure the loss: a quick through-transmission or backwall-echo test on a sample with a broadband probe gives me alpha versus frequency directly. I look at where the material sits in the scattering regimes, comparing likely grain size to wavelength, because that tells me whether loss will grow like f squared or f to the fourth. Then I compute round-trip loss at the inspection depth for candidate frequencies and keep those that fit inside the system's dynamic range with margin for a small defect echo. Among the survivors I take the highest frequency, since resolution scales with it. In my ice work this exact procedure, plus watching grain noise, chose the low-MHz band."
}
},

{
id: "ac-measurement",
track: "Acoustics",
sub: "Measurement and imaging",
title: "Measurement modes: pulse-echo to C-scan",
mins: 28,
body: `
<p>Three basic geometries cover almost all ultrasonic measurement. Pulse-echo: one
transducer transmits and receives; you get range for free from time of flight, need
access to only one side, but you are blind during the transmit ring-down (the dead
zone) and everything relies on echoes coming back. Pitch-catch: separate transmitter
and receiver, either side by side (TOFD-style, eliminating the dead zone and exploiting
diffracted tip signals) or at angles for mode-converted paths. Through-transmission:
transmitter and receiver on opposite faces; you measure what got through rather than
what bounced back. It needs two-sided access and gives no depth information by itself,
but it is robust in highly attenuating or scattering materials where echoes drown, and
a defect announces itself as a shadow, a drop in received amplitude. Composite plates
and my ice measurements both live here when backscatter is hopeless.</p>
<h3>A, B and C scans: adding spatial dimensions</h3>
<ul>
<li><b>A-scan:</b> raw amplitude versus time at one position. Everything else is built
from stacks of these.</li>
<li><b>B-scan:</b> sweep the probe along a line, stack A-scans side by side, map
amplitude to brightness: a cross-sectional slice. This is also what a medical
ultrasound image is, with the array doing the sweeping electronically.</li>
<li><b>C-scan:</b> raster the probe over a surface, and at each (x, y) record one
number extracted from a time gate, peak amplitude or time of flight. The result is a
plan-view map: corrosion thickness maps, composite delamination maps. The gate is the
crucial, easy-to-fluff detail: you are choosing which depth window the image
represents.</li>
</ul>
<h3>The time-of-flight measurement chain</h3>
<p>Thickness equals velocity times time over two. Everything hangs on measuring t
well, and the chain is: pulser fires (spike or square wave), receiver amplifies
(protected from the transmit pulse), ADC digitises at a rate comfortably above
Nyquist for the probe bandwidth, then software finds the arrival. Threshold crossing
is simple but amplitude-dependent: a weaker echo crosses later, biasing the reading.
First zero crossing after threshold is better; cross-correlation against a reference
echo is best, routinely achieving a small fraction of a period. Worked number: steel
at 5920 m/s, 25 mm plate, round trip is 8.45 microseconds. To resolve 0.1 mm of
thickness you must resolve 34 nanoseconds, easy with correlation on a 100 MS/s
digitiser, marginal with a bare threshold on a noisy echo.</p>
<h3>Calibration: no block, no measurement</h3>
<p>Velocity and system delays are unknowns until calibrated. Standard blocks (V1, V2,
step wedges) with certified thicknesses and side-drilled holes let you set the
velocity, zero the probe delay (the wear plate and couplant path add microseconds of
offset), build distance-amplitude correction curves, and verify resolution. The
professional habit: calibrate on material matching the test piece, since velocity
follows alloy and temperature.</p>
<h3>Hydrophones and field mapping</h3>
<p>How do you know what your transducer actually radiates? A hydrophone, a tiny (often
sub-millimetre PVDF needle or membrane) calibrated receiver, is rastered through the
field in a water tank, recording pressure waveforms point by point. That yields beam
profiles, focal position, sidelobe levels and absolute pressures, the basis of both
probe acceptance testing and regulatory safety limits in medical ultrasound. For
levitation arrays the same mapping verifies that the synthesised trap field matches
the model before you trust it with a sample.</p>`,
quiz: [
{ q: "Through-transmission is preferred over pulse-echo when:",
o: ["Only one side of the part is accessible", "Depth information is essential", "The material scatters or attenuates so strongly that return echoes are unusable", "The part is very thin"],
a: 2, why: "One-way transit halves the path loss and a defect shows as a shadow; the cost is two-sided access and no depth from a single measurement." },
{ q: "A C-scan pixel value is:",
o: ["The full RF waveform", "A single number (amplitude or TOF) extracted from a time gate at that (x, y)", "The transducer voltage at t = 0", "A cross-sectional slice"],
a: 1, why: "C-scans compress each A-scan to one gated number, so the gate choice defines what depth range the map shows." },
{ q: "Simple threshold timing biases time-of-flight readings because:",
o: ["Weaker echoes cross the threshold later, shifting the measured arrival", "ADCs are nonlinear", "Thresholds drift with temperature", "Sound speed changes with amplitude"],
a: 0, why: "The crossing time depends on echo amplitude. Zero-crossing or cross-correlation timing removes most of this bias." },
{ q: "Steel, velocity 5920 m/s. A backwall echo arrives 6.76 microseconds after the front-wall echo. The plate is about:",
o: ["40 mm", "10 mm", "80 mm", "20 mm"],
a: 3, why: "Thickness = v x t/2 = 5920 x 6.76e-6/2, which is 20 mm." }
],
interview: {
q: "Design a system to map wall thinning over a square metre of steel plate. Talk me through your choices.",
a: "This is a C-scan problem. I would use pulse-echo with an immersion or wheel-coupled probe, around 5 MHz for steel, scanned in a raster by a two-axis stage with position feedback synchronised to the acquisition. At each point I gate the front-wall and first backwall echoes and measure their separation by cross-correlation, which is amplitude-independent and gives tens-of-nanoseconds precision, well under 0.1 mm in steel. I calibrate velocity and zero offset on a step wedge of the same alloy, and repeat the calibration against temperature drift. Amplitude is logged alongside time of flight, since a dropping backwall with unchanged thickness flags corrosion roughness or coupling problems. The deliverable is a thickness map with uncertainty, not just a picture."
}
},

{
id: "ac-doppler",
track: "Acoustics",
sub: "Measurement and imaging",
title: "Doppler methods",
mins: 27,
body: `
<p>Bounce a wave off something moving and the frequency shifts. The intuition in two
steps: a target moving towards the source at speed v meets wavefronts faster, so it
receives a frequency raised by a factor of about (1 plus v/c). Re-radiating as a
moving source, it compresses the returned wavefronts again: a second factor of the
same size. For v much smaller than c the two effects add, giving the equation to know
cold: f_d equals 2 f0 v cos(theta) over c, where theta is the angle between the beam
and the velocity. The cosine matters operationally: at 90 degrees you measure nothing,
and clinical practice keeps insonation angles below about 60 degrees because the
cosine correction error explodes beyond that.</p>
<h3>The happy accident of the audio band</h3>
<p>Worked numbers, 5 MHz probe, sound speed 1540 m/s in tissue, theta zero. Blood at
0.5 m/s: f_d = 2 x 5e6 x 0.5/1540, about 3.2 kHz. At 1 m/s, 6.5 kHz; at 10 cm/s, 650
Hz. Physiological velocities land squarely in the audio band, so the earliest and
still-standard clinical interface is simply listening: the demodulated Doppler signal
goes to a loudspeaker, and stenotic jets literally sound like high-pitched hisses.
The same numbers set the electronics: after demodulation you are processing kilohertz
signals, trivially digitised, with all the difficulty moved to isolating the tiny
shifted echo next to enormous stationary clutter.</p>
<h3>CW Doppler: unlimited velocity, no range</h3>
<p>Continuous-wave Doppler transmits and receives simultaneously with two elements.
Mixing the received signal with the transmit oscillator yields the difference
frequency directly, and any velocity, however high, is measurable. The price: echoes
from every depth along the beam arrive together, so there is no range information at
all. CW is the tool for the fastest jets in cardiology precisely because it cannot
alias.</p>
<h3>Pulsed Doppler: range resolution, at a price</h3>
<p>Fire pulses at a pulse repetition frequency (PRF), and sample the returns in a time
gate corresponding to the depth of interest. Each pulse contributes one sample of the
slow oscillation at f_d, so the Doppler signal is sampled at the PRF, and Nyquist
applies: shifts above PRF/2 alias, wrapping high forward velocities into apparent
reverse flow on a spectral display. Worked chain: to measure 1 m/s at 5 MHz you need
PRF above 2 x 6.5 kHz, 13 kHz. But the PRF is itself capped by depth, since each
pulse must clear the round trip before the next: maximum PRF is c over 2d. At 6 cm
depth that is 1540/0.12, about 12.8 kHz. So 1 m/s at 6 cm and 5 MHz sits exactly on
the edge of aliasing: the depth-velocity product is fundamentally limited. Escapes:
lower f0 (halving to 2.5 MHz halves f_d), accept range ambiguity with a high PRF
mode, shift the spectral baseline, or fall back to CW.</p>
<h3>Beyond flow metering</h3>
<p>The same physics drives colour-flow imaging (pulsed Doppler estimated at every
pixel), vibrometry and industrial flow meters. In an interview, the crisp summary is:
CW trades range for unlimited velocity, pulsed trades maximum velocity for range, and
the product of depth and unaliased velocity is fixed by c squared over 8 f0, so at
some point you change frequency or change technique.</p>`,
quiz: [
{ q: "A 2 MHz probe insonates flow at 1 m/s, angle zero, c = 1540 m/s. The Doppler shift is about:",
o: ["1.3 kHz", "2.6 kHz", "5.2 kHz", "260 Hz"],
a: 1, why: "f_d = 2 f0 v/c = 2 x 2e6 x 1/1540, about 2.6 kHz." },
{ q: "At an insonation angle of 90 degrees the measured Doppler shift is:",
o: ["Maximum", "Doubled", "Negative", "Zero, because the cosine term vanishes"],
a: 3, why: "Only the velocity component along the beam contributes; cos(90 degrees) = 0." },
{ q: "Aliasing occurs in pulsed Doppler when:",
o: ["The Doppler shift exceeds PRF/2, since the shift is sampled once per pulse", "The gate is too shallow", "Transmit power is too low", "The angle is too small"],
a: 0, why: "Each pulse yields one sample of the Doppler oscillation, so Nyquist at the PRF governs; shifts above PRF/2 wrap." },
{ q: "CW Doppler's fundamental limitation is:",
o: ["It aliases at high velocity", "It cannot measure fast flow", "It has no range resolution: all depths contribute simultaneously", "It needs very high PRF"],
a: 2, why: "Continuous transmission means returns from the whole beam overlap in time; velocity is unlimited but location is unknown." }
],
interview: {
q: "A pulsed Doppler measurement of fast flow at depth keeps aliasing. What are your options and their costs?",
a: "The root cause is the fixed depth-velocity product: PRF is capped at c over 2d by the round trip, and unaliased shift at PRF over 2. First I would lower the transmit frequency, which reduces the Doppler shift proportionally at some cost in sensitivity and resolution. Second, shift the spectral baseline, which reclaims the unused half of the Nyquist band if flow is one-directional. Third, use a high-PRF mode, firing before the previous pulse clears, accepting known range ambiguity. Fourth, reduce the insonation angle so less velocity projects onto the beam, though the cosine correction gets error-prone. Finally, switch to CW, which cannot alias but abandons range resolution. Which trade wins depends on whether velocity accuracy or localisation matters more for the measurement."
}
}

);
