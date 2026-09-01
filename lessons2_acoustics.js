// Acoustics track, part 2: radiation, nonlinearity, cavitation, guided waves,
// imaging, inverse problems, airborne ultrasound and safety.
// Same schema as data.js; appended via LESSONS.push.

LESSONS.push(

{
id: "ac-radiation",
track: "Acoustics",
sub: "Transducers and beams",
title: "Radiation, directivity and sources",
mins: 25,
body: `
<p>Every source question comes down to one dimensionless number: ka, the source radius
in units of wavelength (k is the wavenumber, two pi over lambda). Small ka radiates
everywhere; large ka radiates a beam. All the classical source models are ways of
making that statement precise.</p>
<h3>The three canonical sources</h3>
<ul>
<li><b>Monopole</b>: a pulsating sphere, pure volume injection. Radiates equally in all
directions. Any source much smaller than a wavelength looks like one, whatever its
actual shape, because the field cannot resolve geometry it cannot see. This is why a
tweeter is directional but a subwoofer is not, and why a tiny hydrophone is a good
omnidirectional receiver by reciprocity.</li>
<li><b>Dipole</b>: two monopoles in antiphase, or equivalently an oscillating rigid
body pushing fluid back and forth without net volume change. Figure-of-eight
directivity with a null in the plane between the poles. It is a poor radiator at low
ka: the two halves short-circuit each other. An unbaffled loudspeaker cone is the
classic example.</li>
<li><b>Baffled circular piston</b>: the workhorse model for a real transducer face
mounted in a rigid plate. Each surface element is a little monopole (Rayleigh
integral); the far field is their interference sum.</li>
</ul>
<h3>Piston directivity, the result to know cold</h3>
<pre>D(theta) = 2 J1(ka sin theta) / (ka sin theta)
First null:      sin theta = 0.61 lambda / a
Half-power beamwidth: roughly lambda / diameter (in radians)</pre>
<p>J1 is the first-order Bessel function; the pattern is the acoustic twin of the Airy
diffraction pattern in optics, because it is the same Fourier transform of a circular
aperture. Sidelobes sit about 17.6 dB below the main lobe for a uniform piston, and
apodising the surface velocity trades main-lobe width for lower sidelobes, exactly as
window functions do in spectral analysis.</p>
<h3>Near field and far field</h3>
<p>Within the Rayleigh distance, a squared over lambda, the piston field is a
structured interference zone with on-axis nulls and maxima; beyond it the beam settles
into the smooth directivity above and amplitude falls as one over range. Focused probes
place their focus inside this natural near field; you cannot focus beyond it.</p>
<h3>Why small means omnidirectional</h3>
<p>Directivity comes from path-length differences across the source being comparable to
a wavelength. If the source spans a small fraction of lambda, all points radiate
essentially in phase in every direction, so no direction is preferred. The flip side:
to get a narrow beam you must pay in aperture, at least many wavelengths across, which
is why levitation arrays and phased arrays are built from many elements rather than one
big disc: you keep the aperture but gain phase control across it.</p>
<h3>Radiation impedance, the piston's load</h3>
<p>The fluid loads the source with a radiation impedance whose real part (radiation
resistance) is the useful power sink. At low ka the resistance scales as ka squared, so
small sources are inefficient as well as omnidirectional: they move fluid locally
without launching much power. This is the deep reason low-frequency projectors are
large, and why a 40 kHz airborne element is a resonant horn rather than a bare disc.</p>`,
quiz: [
{ q: "A transducer is much smaller than a wavelength. Its radiation pattern is:",
o: ["A narrow beam along its axis", "A figure of eight", "Essentially omnidirectional", "Determined by its exact shape"],
a: 2, why: "At small ka all points on the source radiate in phase in every direction, so geometry is invisible and the source acts as a monopole." },
{ q: "For a baffled circular piston, the first off-axis null sits at sin theta equal to:",
o: ["0.61 lambda over a", "lambda over 2a exactly", "1.22 a over lambda", "ka over 2"],
a: 0, why: "The 2 J1(x)/x pattern has its first zero at x = 3.83, giving sin theta = 0.61 lambda / a, the acoustic Airy pattern." },
{ q: "Why is an unbaffled oscillating cone a poor low-frequency radiator?",
o: ["The cone material absorbs sound", "Front and back radiate in antiphase and cancel, dipole short circuit", "Air is too compressible", "The cone is too heavy"],
a: 1, why: "Without a baffle the rear wave wraps round and cancels the front wave; the dipole's radiated power collapses at low ka." },
{ q: "Radiation resistance of a small source scales with ka how?",
o: ["Independent of ka", "Linearly in ka", "Inversely with ka", "As ka squared"],
a: 3, why: "At low ka the radiation resistance rises as ka squared, so small sources couple little real power into the fluid." }
],
interview: {
q: "You need a tightly collimated beam at a fixed frequency. What are your options, and what do they cost?",
a: "Beamwidth is roughly lambda over aperture, so I have two levers: shorten the wavelength or widen the aperture. Raising frequency buys collimation but costs attenuation and, in scattering media, costs it fast. Widening a single element buys collimation but fixes the beam direction and pushes the Rayleigh distance out. My preferred option is an array: it gives the large aperture and lets me steer and focus by phasing, at the price of channel count and electronics. If sidelobes matter more than width, I apodise and accept a broader main lobe. In my ice-core work the practical choice was a moderate ka focused probe: enough directivity to isolate features, low enough frequency to survive the propagation path."
}
},

{
id: "ac-nonlinear",
track: "Acoustics",
sub: "Waves and propagation",
title: "Nonlinear acoustics and harmonic imaging",
mins: 30,
body: `
<p>Linear acoustics assumes the wave does not alter the medium it travels through. At
the pressures ultrasound actually uses, that assumption quietly fails: the compressed
half-cycle travels faster than the rarefied half-cycle, both because sound speed rises
with local density and because the wave rides on its own particle velocity. The crest
catches up on the trough and the waveform steepens, exactly as a water wave steepens
approaching a beach.</p>
<h3>B over A, the medium's nonlinearity rating</h3>
<p>Expand pressure versus density to second order and the ratio of the quadratic to
linear coefficients is the B/A parameter. Water is about 5, soft tissue 6 to 10, fatty
tissue higher still. The working combination is beta = 1 + B/2A, which multiplies how
fast distortion accumulates. Nothing exotic is needed: any medium with a realistic
equation of state is nonlinear, it is only a question of how far you propagate and how
hard you drive.</p>
<h3>Harmonics grow with distance</h3>
<p>A pure sine leaves the transducer; steepening transfers energy from the fundamental
into second, third and higher harmonics progressively along the path. The second
harmonic amplitude grows roughly linearly with range at first (and with the square of
the source pressure), until absorption, which rises steeply with frequency, eats the
harmonics as fast as they are generated. The waveform reaches a sawtooth-like balance
in strongly driven, weakly absorbing media such as water.</p>
<h3>The shock parameter</h3>
<pre>sigma = beta * epsilon * k * x
epsilon = acoustic Mach number, particle velocity over sound speed
sigma near 1: shock formation distance reached</pre>
<p>This single number tells you whether a given source pressure, frequency and range is
effectively linear (sigma well below one) or shocked (sigma above one). Doubling
frequency or amplitude halves the shock distance, which is why calibration of intense
fields in water must account for nonlinearity even when tissue-level intensities seem
modest.</p>
<h3>Tissue harmonic imaging, nonlinearity used on purpose</h3>
<p>Clinical scanners transmit at f and beamform the received 2f component. The
rationale is elegant: harmonics are generated in the medium, mostly near the beam axis
where pressure is highest, so the effective transmit beam is narrower and has far lower
sidelobes. Better still, the worst image degraders, reverberation from the body wall
and multipath clutter, are generated where the wave is still weak and therefore stay
almost purely linear: they simply do not appear in the harmonic band. Pulse inversion
sharpens the separation: transmit a pulse and its inverted copy, sum the echoes, the
linear parts cancel and the even harmonics add.</p>
<h3>Where else it matters</h3>
<p>Harmonic generation underpins ultrasound contrast agent imaging (bubbles are far
more nonlinear than tissue), acoustic radiation force grows with intensity, and
parametric arrays exploit nonlinearity to synthesise highly directional low-frequency
beams from two high-frequency primaries. For anyone measuring fields: a hydrophone
calibrated only at the fundamental will mislead you the moment sigma approaches one,
because a meaningful fraction of the energy has moved up the spectrum.</p>`,
quiz: [
{ q: "Physically, why does a finite-amplitude wave steepen as it propagates?",
o: ["Absorption removes the low frequencies", "The compressed phase travels faster than the rarefied phase", "The transducer emits harmonics directly", "Diffraction narrows the beam"],
a: 1, why: "Local sound speed rises with compression and the wave convects on its own particle velocity, so crests overtake troughs and the waveform distorts." },
{ q: "In tissue harmonic imaging, the main reason clutter and reverberation are suppressed is:",
o: ["They occur where the field is weak and still linear, so they contain little 2f energy", "The receiver amplifier removes them", "Tissue absorbs the fundamental completely", "Harmonics travel by a different path"],
a: 0, why: "Body-wall artefacts arise near the surface at low local pressure, so almost no harmonic is generated there; imaging at 2f leaves them behind." },
{ q: "The shock parameter sigma is proportional to:",
o: ["beta times Mach number times wavenumber times distance", "B/A alone", "frequency divided by amplitude", "the square root of distance"],
a: 0, why: "sigma = beta epsilon k x; raising amplitude, frequency or range all push the waveform toward shock in direct proportion." },
{ q: "Second harmonic amplitude in the pre-shock region scales with source pressure how?",
o: ["Linearly", "Independent of source pressure", "Inversely", "Quadratically"],
a: 3, why: "Harmonic generation is a second-order effect: the 2f component grows as the square of the fundamental pressure, and roughly linearly with range." }
],
interview: {
q: "Why do clinical scanners image at the second harmonic rather than just transmitting at twice the frequency?",
a: "Transmitting at 2f directly would double the attenuation on both legs of the journey. Harmonic imaging pays the high-frequency attenuation only on the return leg: the outbound wave travels at f, generates 2f progressively in the tissue, and we receive that. Beyond the attenuation bargain, the harmonic beam is self-apodised, since generation goes as pressure squared, it is strongest on axis, giving narrower effective beams and much lower sidelobes than anything I could transmit. And the near-field clutter that plagues fundamental imaging is born where pressures are still low and linear, so it barely exists in the harmonic band. Pulse inversion then removes the residual fundamental without sacrificing bandwidth."
}
},

{
id: "ac-cavitation",
track: "Acoustics",
sub: "Applications",
title: "Cavitation and acoustic streaming",
mins: 30,
body: `
<p>Put enough negative pressure into a liquid and it fails: dissolved gas and
microscopic nuclei grow into bubbles that then respond to the sound field far more
violently than the liquid ever would. Cavitation is where acoustics stops being a small
perturbation and starts doing mechanical work, wanted or not.</p>
<h3>Stable versus inertial cavitation</h3>
<ul>
<li><b>Stable (non-inertial)</b>: a bubble oscillates about its equilibrium radius for
many cycles, pumped near its Minnaert resonance. It reradiates sound (including
harmonics and subharmonics), generates vigorous microstreaming in its neighbourhood,
and imposes oscillating shear on nearby surfaces and cells. Persistent, comparatively
gentle, and steerable.</li>
<li><b>Inertial</b>: the bubble expands to a multiple of its rest radius during
rarefaction, then collapses under the inertia of the inrushing liquid. Collapse
concentrates energy enormously: local temperatures of thousands of kelvin,
shock waves, free radicals, sonoluminescence, and if the collapse is asymmetric near a
boundary, a liquid microjet that impinges on the surface. This is the erosive,
damaging, cleaning regime.</li>
</ul>
<h3>Mechanical index, the screening number</h3>
<pre>MI = peak negative pressure (MPa) / sqrt( frequency (MHz) )</pre>
<p>Inertial cavitation onset depends on rarefactional pressure and eases at low
frequency, where the bubble has more time to grow per cycle. MI packages both into a
single indicated value; diagnostic scanners keep it below 1.9. It is a screening index
built on a threshold model, not a measurement of cavitation, and it says nothing about
whether nuclei are actually present, which is why contrast bubbles change the risk
picture completely.</p>
<h3>Acoustic streaming, the other quiet transporter</h3>
<p>Absorption of a sound beam transfers momentum to the fluid, driving a steady flow
along the beam axis: Eckart streaming, the jet you see in any strongly driven water
tank. Near boundaries, the oscillating viscous layer drives Rayleigh streaming vortices
of scale set by the standing wave. Around an oscillating bubble or a sharp edge,
cavitation microstreaming produces intense local shear in a region of a few bubble
radii. Streaming velocity grows with absorbed intensity, so high frequency and high
amplitude both feed it.</p>
<h3>When each phenomenon helps or hurts</h3>
<ul>
<li><b>Helps</b>: ultrasonic cleaning relies on inertial collapse and microjets to
strip contamination; sonochemistry uses radical production; microfluidic mixing and
sonoporation use microstreaming shear; streaming stirs otherwise diffusion-limited
processes; bubble-enhanced heating assists therapy.</li>
<li><b>Hurts</b>: the same microjets erode transducer faces, pump impellers and
sonotrodes; cavitation at a coupling interface blocks transmission and scrambles
amplitude calibration; in levitation and precision measurement tanks, streaming drags
particles out of traps and adds convective noise; in diagnostic imaging, bubble
activity is a bioeffects hazard and a source of flickering broadband clutter.</li>
</ul>
<p>A practical tell: broadband noise emission signals inertial collapse, while
subharmonics at half the drive frequency flag strongly driven but still stable bubbles.
Monitoring those signatures is how therapeutic systems close the loop on dose.</p>`,
quiz: [
{ q: "The defining feature of inertial cavitation is:",
o: ["Bubble dissolution by rectified diffusion", "Gentle oscillation at the Minnaert resonance", "Growth then violent collapse driven by liquid inertia", "Bubbles drifting up the pressure gradient"],
a: 2, why: "Inertial cavitation is expansion followed by an inertia-dominated collapse that concentrates energy into shocks, heat and microjets." },
{ q: "MI is defined as peak negative pressure divided by:",
o: ["Frequency", "The square root of frequency", "Intensity", "Wavelength"],
a: 1, why: "MI = peak rarefactional pressure in MPa over the square root of frequency in MHz, reflecting the easier bubble growth at lower frequencies." },
{ q: "Eckart streaming is driven by:",
o: ["Momentum deposited by absorption of the beam in the bulk fluid", "Bubble collapse microjets", "Thermal convection from transducer heating", "Radiation force on the tank walls"],
a: 0, why: "Attenuation transfers wave momentum to the liquid, producing a steady jet along the beam; it grows with absorbed intensity." },
{ q: "An acoustic emission signature that indicates inertial collapse is:",
o: ["A pure tone at the drive frequency", "Narrowband emission at the second harmonic only", "Silence", "Broadband noise across the spectrum"],
a: 3, why: "Violent collapses radiate shock-like broadband noise, whereas stable bubble oscillation shows discrete harmonics and subharmonics." }
],
interview: {
q: "Your immersion measurement rig shows unstable amplitude readings at high drive levels. How do you diagnose whether cavitation is the culprit?",
a: "First I listen: I would put a passive receiver in the tank and look at the spectrum. Broadband noise or a half-frequency subharmonic appearing above a drive threshold is a strong cavitation fingerprint. Second, the hysteresis test: cavitation onset is threshold-like and often hysteretic, so I ramp drive up and down and look for a sudden, non-repeatable amplitude drop rather than a smooth curve. Third, I attack the nuclei: degas the water, let it stand, or raise static pressure; if stability returns, bubbles were the problem. In parallel I check the transducer face and couplant for trapped air, since interface bubbles mimic bulk cavitation. The fix is usually degassed water, lower duty cycle, or higher frequency for the same intensity."
}
},

{
id: "ac-guided",
track: "Acoustics",
sub: "Waves and propagation",
title: "Guided waves and plate modes",
mins: 30,
body: `
<p>In a bulk solid, longitudinal and shear waves travel independently. Confine the
solid between two free surfaces, a plate, and endless reflections and mode conversions
between those surfaces organise the field into a discrete family of guided modes: Lamb
waves. The plate stops being an obstacle and becomes a waveguide.</p>
<h3>S0 and A0, the two you meet first</h3>
<ul>
<li><b>S0, fundamental symmetric</b>: both surfaces move outward and inward together;
the motion is dominantly in-plane extension. At low frequency-thickness it travels at
the plate velocity, fast, and is nearly non-dispersive there, so pulses keep their
shape.</li>
<li><b>A0, fundamental antisymmetric</b>: the plate flexes, both surfaces moving the
same way, like a flag ripple. At low frequency-thickness it is slow and strongly
dispersive, with phase velocity rising roughly as the square root of frequency times
thickness. Large out-of-plane displacement makes it easy to excite and detect from the
surface, but also quick to leak energy into any liquid loading.</li>
</ul>
<h3>Dispersion, the defining complication</h3>
<p>Guided wave velocity depends on the product of frequency and thickness, which is why
dispersion curves are always plotted against frequency-thickness (MHz times mm): a
1 MHz wave in 2 mm of steel lives at the same point on the curves as 2 MHz in 1 mm.
Phase velocity and group velocity separate, so a broadband pulse smears out as it
travels: fast components arrive early, slow ones late. Above the cut-off
frequency-thickness values, higher-order modes (S1, A1, and so on) appear, and the mode
count grows with frequency-thickness. Practical inspection lives low on the curves
where only S0 and A0 (and the shear-horizontal SH0) exist.</p>
<h3>Why guided waves inspect long ranges</h3>
<p>A bulk-wave scan interrogates the material directly under the probe, point by point.
A guided wave fills the entire thickness of the plate or pipe wall and spreads in two
dimensions rather than three, so geometric spreading costs far less amplitude. One
transducer position can screen tens of metres of pipeline or storage tank floor,
including regions under insulation, coatings or supports that raster scanning can never
reach. The trade: you get a one-dimensional range profile of reflectors, not an image,
and sensitivity is to cross-section change rather than to fine defect shape.</p>
<h3>Mode selection in practice</h3>
<p>Choosing the working point on the dispersion curves is the core design act. You
want: a mode and frequency-thickness where dispersion is flat, so pulses stay compact;
a mode shape whose stress is concentrated where the expected damage is (surface
corrosion favours modes with surface-concentrated stress, mid-wall lamination favours
modes with energy at mid-plane); and minimal leakage, so for a liquid-loaded plate SH0
or S0 beats A0. Excitation enforces the choice: angle-beam wedges pick phase velocity
through Snell's law, comb and interdigital transducers pick wavelength directly, and
time-frequency filtering plus a known group velocity separates modes on reception.</p>`,
quiz: [
{ q: "At low frequency-thickness, the A0 Lamb mode is:",
o: ["Slow, dispersive, with large out-of-plane motion", "Faster than S0 and non-dispersive", "A pure shear-horizontal mode", "Non-propagating"],
a: 0, why: "A0 is the flexural mode: slow and strongly dispersive at low fd, with out-of-plane displacement that makes it easy to excite but leaky under liquid." },
{ q: "Lamb wave dispersion curves are plotted against frequency times thickness because:",
o: ["It hides material differences", "Thickness is usually unknown", "The guided wave solutions scale with that product", "Regulators require it"],
a: 2, why: "The free-plate boundary problem depends on frequency and thickness only through their product, so one curve serves all plates of the same material." },
{ q: "The main reason guided waves screen long ranges economically is:",
o: ["They travel faster than bulk waves", "They are immune to attenuation", "Higher frequencies are used", "Energy is confined to the plate and spreads in two dimensions, not three"],
a: 3, why: "Confinement to the waveguide means cylindrical rather than spherical spreading, so amplitude survives tens of metres and the whole wall thickness is interrogated." },
{ q: "For inspecting a plate with water on one side, a sensible mode choice is:",
o: ["A0 at low fd for maximum out-of-plane motion", "Any mode above several cut-offs", "SH0 or low-fd S0, dominantly in-plane, to minimise leakage", "The highest-order mode available"],
a: 2, why: "Out-of-plane motion couples energy into the liquid and attenuates the wave; in-plane modes such as SH0 and low-fd S0 leak far less." }
],
interview: {
q: "When would you recommend guided waves over conventional pulse-echo, and what would you warn the client about?",
a: "I recommend guided waves when the problem is coverage: long runs of pipe or plate, limited access, inspection under insulation or at supports, where point-by-point scanning is uneconomic or impossible. One position can screen tens of metres because the energy stays in the wall and spreads cylindrically. My warnings are equally clear. It is a screening tool, not an imaging tool: we detect and locate cross-section change, then follow up locally with conventional UT for sizing. Dispersion and coherent mode conversion make signals harder to interpret than A-scans, so mode selection and operator training matter. And attenuation from coatings, contents or bitumen wrap can shorten range dramatically, so I always quote range after a site trial, not from the brochure."
}
},

{
id: "ac-imaging",
track: "Acoustics",
sub: "Measurement and imaging",
title: "Image formation: delay laws to TFM",
mins: 30,
body: `
<p>Every ultrasound image is the same computation wearing different clothes: for each
point you want to display, work out when energy from that point should arrive at each
receiving element, sum the recorded signals at those times, and let coherence do the
discrimination. Signals from a true scatterer add in phase; everything else averages
toward zero.</p>
<h3>Classical B-mode</h3>
<p>Fire a focused beam along one line, envelope-detect the echo train, paint it as one
image column, step to the next line and repeat. Transmit focusing is fixed per shot
(one depth, or a few via multiple transmits), but on receive the delays can be updated
continuously as echoes return, so every depth is in receive focus: dynamic focusing.
Dynamic aperture grows the active element count with depth to hold the f-number, and
apodisation tames sidelobes. The costs: frame rate is lines times depth-time, and
transmit focus quality away from the chosen depth is a compromise.</p>
<h3>Synthetic aperture</h3>
<p>Instead of forming beams physically, record more and compute more. Fire from one
element (or a defocused subset) so the transmit wave floods the region, record on all
elements, repeat across the aperture, then focus everything in software afterwards.
Transmit focus is now synthesised at every pixel, not just one depth. The trade is
lower transmitted energy per shot, hence signal-to-noise pressure, recovered by coded
excitation or virtual sources.</p>
<h3>Full matrix capture and the total focusing method</h3>
<p>FMC is the complete dataset: transmit on element i, receive on all elements j, for
every i, giving N squared time traces. It is the array's full linear characterisation;
any conventional beamformed image could be computed from it afterwards. TFM is the
natural image former on top: for each pixel, for every transmit-receive pair, look up
the trace at the time given by the path transmitter to pixel to receiver, and sum.</p>
<pre>I(p) = | sum over i,j of  s_ij( t_i(p) + t_j(p) ) |
t_i(p), t_j(p): travel times from element to pixel</pre>
<p>Every pixel is in perfect transmit and receive focus. NDT adopted TFM enthusiastically
because defect characterisation rewards focus quality more than frame rate; multi-mode
TFM variants (using mode-converted and skip paths) image crack faces that direct paths
miss. The costs are data volume, computation, and sensitivity to an assumed sound
speed: get the velocity model wrong and focusing quietly degrades.</p>
<h3>Resolution limits, and what actually sets them</h3>
<ul>
<li><b>Axial</b>: set by pulse length, roughly half the pulse spatial extent; bandwidth
is everything.</li>
<li><b>Lateral</b>: diffraction-limited to about lambda times f-number; aperture is
everything. TFM reaches this limit across the whole image rather than at one depth.</li>
<li><b>Contrast</b>: sidelobes and grating lobes decide whether a weak reflector
survives next to a strong one; element pitch and apodisation govern these.</li>
</ul>
<p>No delay-and-sum method beats diffraction: past that point you need models and
priors, which is the doorway to inverse methods.</p>`,
quiz: [
{ q: "Dynamic receive focusing means:",
o: ["The probe physically moves during reception", "Receive delays are continuously updated so every depth is in receive focus", "Transmit power increases with depth", "The image is interpolated after acquisition"],
a: 1, why: "As echoes return from increasing depth, the beamformer recomputes delays on the fly, keeping the receive focus tracking the echo depth." },
{ q: "Full matrix capture records:",
o: ["One summed trace per transmit beam", "Only the diagonal transmit-receive pairs", "Every transmit element paired with every receive element", "The envelope of each channel"],
a: 2, why: "FMC is the complete N by N set of time traces, from which any delay law image, including TFM, can be computed in post-processing." },
{ q: "Which quantity primarily sets axial resolution?",
o: ["Aperture size", "Element pitch", "Frame rate", "Pulse bandwidth"],
a: 3, why: "Axial resolution is about half the spatial pulse length; shorter, broader-band pulses resolve closer interfaces. Aperture governs lateral resolution instead." },
{ q: "A practical weakness of TFM in the field is:",
o: ["It only works at one depth", "Focusing degrades if the assumed sound speed or geometry is wrong", "It cannot use mode-converted paths", "It requires single-element probes"],
a: 1, why: "TFM computes travel times from a velocity and geometry model; errors defocus every pixel, and multi-mode variants deliberately exploit converted paths." }
],
interview: {
q: "Why has NDT embraced TFM while clinical imaging still leans on conventional beamforming?",
a: "The economics of the two fields differ. NDT inspects a static component: frame rate barely matters, but characterising a crack tip correctly decides whether a part flies or is scrapped, so everywhere-in-focus imaging and multi-mode views earn their computation. Clinical imaging is live: the sonographer needs tens of frames per second, tissue moves, and dynamic receive focusing already delivers acceptable diagnostic quality within the power and real-time budget of a cart. That said, the gap is closing from both sides: plane-wave compounding is effectively fast synthetic aperture and has brought software beamforming into clinics, while NDT is pushing TFM toward real time on GPUs. The underlying mathematics, delay and sum over a recorded matrix, is the same."
}
},

{
id: "ac-inverse",
track: "Acoustics",
sub: "Measurement and imaging",
title: "Inverse problems in ultrasound",
mins: 30,
body: `
<p>The forward problem: given the medium (sound speed, density, attenuation everywhere)
and the sources, predict the measured signals. Physics runs happily in that direction.
The inverse problem is the one we are actually paid for: given the signals, infer the
medium. Every image is an approximate inverse; the question is only how honest the
approximation is.</p>
<h3>Delay-and-sum as a crude inverse</h3>
<p>B-mode and TFM assume a known, usually constant, background velocity and treat every
echo as a single scattering event. That is a linearised inverse with a fixed model. It
draws reflectivity, not material properties, and it breaks exactly where the assumption
does: refraction through velocity contrasts misplaces and defocuses reflectors.</p>
<h3>Time-of-flight tomography</h3>
<p>Surround the object with transducers, measure first-arrival times along many
crossing paths, and note that each travel time is approximately the line integral of
slowness (one over velocity) along its ray. Discretise the medium into pixels and you
get a large sparse linear system: rows are rays, columns are pixels, entries are path
lengths. Solve it, typically with iterative algebraic methods, and you have a velocity
map. It is robust and cheap, but resolution is limited to roughly the width of the
first Fresnel zone, and ray bending in strong contrasts demands iterating rays through
the current model.</p>
<h3>Full waveform inversion, the whole signal at once</h3>
<p>FWI stops picking arrival times and fits the entire recorded waveform. Guess a
model; simulate the full wave equation through it; subtract simulation from data;
update the model to shrink the misfit, using the adjoint method, which computes the
gradient with respect to every pixel for the cost of roughly one extra simulation; and
repeat. Because it uses diffraction, multiple scattering and amplitude as signal rather
than nuisance, it can resolve structure near the wavelength scale, far beyond ray
tomography. The price: enormous computation, and a stubborn failure mode called cycle
skipping. If the starting model is so wrong that predicted waveforms are more than half
a cycle out, the optimiser locks onto the wrong cycle and converges confidently to a
wrong model. Practical FWI therefore starts from a tomographic model and works from low
frequencies upward.</p>
<h3>Why inverse problems are ill-posed</h3>
<p>Hadamard's checklist: a solution should exist, be unique and depend continuously on
the data. Inversion typically fails at least the last two. Different media can produce
indistinguishable data within noise (limited aperture and bandwidth guarantee blind
spots), and tiny data perturbations can map to wild model swings, because the forward
operator smooths, so its inverse amplifies. Noise plus a naive inverse equals garbage,
deterministically.</p>
<h3>Regularisation, the necessary confession</h3>
<p>The cure is to add what you believe about the answer to the data misfit: penalise
roughness (Tikhonov), preserve edges while suppressing oscillation (total variation),
confine it to smooth basis functions, or stop iterating early, which acts as implicit
smoothing. Regularisation is a declared prior, and the honest statement of any inverse
result includes it: the image is data plus assumptions, and knowing which features come
from which is the difference between imaging and decorating.</p>`,
quiz: [
{ q: "In time-of-flight tomography, each measured travel time is modelled as:",
o: ["The line integral of slowness along the ray path", "The product of frequency and distance", "The medium's average density", "The reflection coefficient sum"],
a: 0, why: "Travel time is the integral of one-over-velocity along the path, which linearises the problem into a sparse system over pixels." },
{ q: "Cycle skipping in FWI happens when:",
o: ["The GPU runs out of memory", "Receivers are too close together", "The starting model mispredicts arrivals by more than half a cycle, so the optimiser fits the wrong cycle", "Frequencies are inverted from high to low"],
a: 2, why: "Waveform misfit is oscillatory in time shift; beyond half a cycle of error the nearest local minimum aligns wrong cycles, which is why FWI starts low-frequency with a good initial model." },
{ q: "An inverse problem is called ill-posed when:",
o: ["It has too many measurements", "The forward model is nonlinear", "It requires iteration to solve", "Solutions may be non-unique or unstable under small data perturbations"],
a: 3, why: "Hadamard's conditions are existence, uniqueness and stability; imaging inversions typically violate uniqueness and stability, so noise is amplified without care." },
{ q: "Regularisation is best described as:",
o: ["A filter applied to the final image", "Adding prior assumptions to stabilise the solution, traded against data fit", "Increasing transmit power", "Collecting more data until the problem is solvable"],
a: 1, why: "Regularisation augments the misfit with a penalty encoding beliefs such as smoothness or sparse edges, making the solution stable at the cost of bias." }
],
interview: {
q: "Explain to a project manager why your inversion needs regularisation instead of just fitting the data better.",
a: "Our measurements do not contain enough information to pin down every pixel: some patterns in the material are simply invisible to the aperture and bandwidth we have. If I ask the computer for the model that best fits the data and nothing else, it will happily pour noise into exactly those invisible patterns, and the image becomes unstable: rerun with slightly different noise, get a different answer. Regularisation adds a stated assumption, for example that the material varies smoothly except at genuine boundaries, which suppresses the invisible components and makes the result reproducible. The cost is a controlled bias toward our assumption, so I always report what prior was used and check the result is robust as we vary its strength."
}
},

{
id: "ac-airborne",
track: "Acoustics",
sub: "Applications",
title: "Airborne ultrasound and levitation engineering",
mins: 30,
body: `
<p>Air is the hostile medium of ultrasonics. Its characteristic impedance is around
400 rayl against roughly 1.5 million for water and tens of millions for solids, so a
bare piezoceramic face reflects essentially everything at the air boundary; almost
nothing crosses. Every airborne device is an exercise in fighting, or accepting, that
impedance wall: matching layers of low-density composites, flexural and horn structures
that trade force for displacement, or simply arrays of many resonant elements so the
combined field is strong even though each element couples poorly.</p>
<h3>The 40 kHz array, warts and all</h3>
<p>The standard building block is the 40 kHz resonant transducer, around 10 mm in
diameter, cheap because of parking sensors. Wavelength in air is about 8.6 mm, so the
element pitch of roughly 10 mm exceeds a full wavelength: grating lobes are baked into
every hobby-class levitation array, spraying energy into unwanted directions. The
elements are high-Q resonators, so bandwidth is narrow, amplitude responds sluggishly
over many cycles, and unit-to-unit phase spread of tens of degrees is normal;
calibrating each channel's phase offset noticeably tightens the focus. Drive is usually
a square wave from a shift register or FPGA pin, relying on the resonance to filter to
a sine.</p>
<h3>Phase quantisation</h3>
<p>Cheap boards quantise phase to steps of a half or a quarter period. Coarse
quantisation costs surprisingly little in trap strength, a few-level scheme retains
most of the focal pressure of continuous phasing, but it raises sidelobe and grating
artefacts and limits how smoothly a trap can be translated: particles hop rather than
glide if steps are too coarse.</p>
<h3>Trap types</h3>
<ul>
<li><b>Standing wave</b>: transducer against a reflector or opposed arrays; particles
sit just below pressure nodes spaced half a wavelength apart. Strongest and simplest;
geometry is fixed by the cavity.</li>
<li><b>Twin trap</b>: split the array into two halves in antiphase, creating two lobes
with a pressure null between; the levitation workhorse for single-sided arrays and the
basis of most dynamic manipulation.</li>
<li><b>Vortex trap</b>: impose a spiral phase ramp so the beam carries orbital angular
momentum; a dark core surrounded by a pressure ring holds the particle, and can trap
larger or denser objects, though transferred angular momentum can spin them
unstably.</li>
</ul>
<h3>What can be levitated</h3>
<p>Gor'kov's potential, the standard trap model, assumes particles much smaller than
the wavelength; in practice polystyrene beads up to about half a wavelength, some 4 mm
at 40 kHz, trap well. Larger objects need field shaping around the object, denser
liquids and metals need steeper gradients, and droplets fragment when radiation stress
exceeds surface tension.</p>
<h3>Streaming, the ever-present saboteur</h3>
<p>Intense airborne fields drive acoustic streaming: steady jets and vortices that
buffet levitated particles, cause orbiting and oscillation inside traps, and transport
heat and aerosols through the workspace. Trap design that looks static on paper sits in
a self-generated wind.</p>
<h3>Safety of intense airborne fields</h3>
<p>Levitation arrays run at 150 dB SPL and beyond at the focus, far above workplace
airborne ultrasound guidance, which typically caps around 110 to 115 dB in the tens of
kHz bands. Being inaudible does not mean benign: reported effects include heating of
tissue clefts, subharmonics becoming audible and unpleasant, and headaches or nausea in
sensitised individuals. Fingers in a focus feel warmth; ears should never be near one.
Enclosures, interlocks and measured SPL surveys are proper engineering practice, and
hearing protection is a weak backstop because much of the concern is non-auditory.</p>`,
quiz: [
{ q: "Why do standard 40 kHz levitation arrays inevitably produce grating lobes?",
o: ["Square-wave drive adds harmonics", "The reflector is misaligned", "Element pitch of about 10 mm exceeds the 8.6 mm wavelength, well over half a wavelength", "Phase quantisation rounds the delays"],
a: 2, why: "Grating lobes appear when pitch exceeds half a wavelength; commodity 10 mm elements at 8.6 mm wavelength violate this by more than a factor of two." },
{ q: "In a standing wave levitator, small dense particles collect:",
o: ["At the pressure antinodes", "Just below the pressure nodes, spaced half a wavelength apart", "At the transducer face", "Uniformly through the field"],
a: 1, why: "Gor'kov forces push rigid, dense particles toward pressure nodes; gravity offsets them slightly below, and nodes repeat every half wavelength." },
{ q: "A twin trap is created by:",
o: ["Driving two halves of the array in antiphase to form a central pressure null", "Doubling the drive frequency", "Adding a second reflector", "Amplitude-modulating the whole array"],
a: 0, why: "The pi phase split produces two pressure lobes flanking a null that grips the particle, and works from a single-sided array." },
{ q: "Practical particle size limit for simple trapping at 40 kHz is roughly:",
o: ["One tenth of a millimetre", "Ten wavelengths", "Any size if power suffices", "Half a wavelength, around 4 mm"],
a: 3, why: "The Gor'kov small-particle regime degrades as size approaches the wavelength; beyond about half a wavelength simple traps destabilise and field shaping is needed." }
],
interview: {
q: "What would you improve first in a commodity 40 kHz levitation array, and why?",
a: "Per-channel phase calibration. Commodity transducers ship with phase spreads of tens of degrees, and that incoherence costs focal pressure and trap stiffness before any algorithm runs; measuring each element with a microphone and storing offsets is nearly free and lifts performance immediately. Second, I would improve phase resolution if the board quantises coarsely, mainly to make trap translation smooth rather than hopping. The grating lobe problem I would accept rather than fight, because it is set by element geometry; you mitigate it with array layout and by keeping the workspace near the axis. Longer term the interesting engineering is closed loop: optical tracking of the particle feeding back into the phase solution, which turns an open-loop hover into a robust manipulator."
}
},

{
id: "ac-safety",
track: "Acoustics",
sub: "Applications",
title: "Intensity metrics and safety",
mins: 25,
body: `
<p>Safety conversations collapse without unit fluency. Pressure is what a hydrophone
measures, in pascals; diagnostic pulses reach megapascals, which sounds alarming until
you recall atmospheric pressure is 0.1 MPa and the duty cycle is tiny. Intensity is
power through area: for a plane travelling wave it is pressure squared over twice rho c
(rms pressure squared over rho c), reported in watts or milliwatts per cm2. The square
matters: doubling pressure quadruples intensity.</p>
<h3>The alphabet of intensities</h3>
<ul>
<li><b>Isppa</b>: spatial peak, pulse average. How intense the pulse is at the hottest
point while it is on. Relevant to mechanical effects.</li>
<li><b>Ispta</b>: spatial peak, temporal average. The duty cycle brings this down by
orders of magnitude; a machine can emit MPa pulses yet average under a hundred
mW per cm2. Relevant to heating, and the number regulators watch for diagnostic
ultrasound.</li>
<li>Derated values apply an assumed tissue attenuation (0.3 dB per cm per MHz in the
common convention) to water-tank measurements before comparison with limits.</li>
</ul>
<h3>MI and TI, the on-screen contract</h3>
<p>The output display standard puts two indices on every scanner screen so the operator
manages risk in real time. The mechanical index, peak rarefactional pressure in MPa
over the square root of frequency in MHz, tracks the likelihood of inertial cavitation:
threshold-like, worst at low frequency, transformed as a hazard when gas bodies or
contrast bubbles are present. The thermal index is estimated in-situ power over the
power needed to raise the modelled tissue by one degree Celsius, in variants for soft
tissue, bone at focus and cranial bone. Both are indicative models, not measurements of
harm; their function is to make the operator's trade-offs visible and support the
ALARA mindset: as low as reasonably achievable, consistent with getting the diagnostic
information.</p>
<h3>The standards mindset</h3>
<p>Rather than memorising limit tables, know the structure: a regulatory ceiling on
derated Ispta and on MI for diagnostic equipment; measurement procedures defined by
international standards specifying exactly how pressure fields are scanned and
processed; and separate, stricter thinking for therapeutic and industrial systems where
bioeffects are the purpose or the field is continuous. Occupational exposure to
airborne ultrasound has its own guidance in SPL terms. The common thread: define the
measurand precisely, measure traceably, and leave margin for the model's blind spots,
such as unknown gas bodies or long dwell times on one spot.</p>
<h3>How the numbers are actually obtained</h3>
<ul>
<li><b>Membrane or needle hydrophones</b>: calibrated PVDF sensors scanned through the
field in a water tank give pressure waveforms point by point; from these come peak
pressures, pulse intensity integrals and the beam maps behind Isppa and Ispta. Small
apertures avoid spatial averaging over the focal spot; nonlinear, harmonic-rich pulses
demand wide calibration bandwidth.</li>
<li><b>Radiation force balance</b>: total emitted power measured as the steady force on
an absorbing or reflecting target; grams-force scale readings convert through the
sound speed relation. It is the traceable check that all those integrated hydrophone
scans add up to the right total power.</li>
</ul>
<p>Fluency test: given a 2 MPa peak pressure in water, estimate the plane-wave
instantaneous intensity: pressure squared over twice rho c gives roughly 130 W per cm2
during the pulse; at one part in ten thousand duty cycle the time average is around
13 mW per cm2. That arithmetic, done in your head, is what safety review meetings run
on.</p>`,
quiz: [
{ q: "For a plane travelling wave, intensity relates to peak pressure p as:",
o: ["p over rho c", "rho c times p", "p squared over twice rho c", "p squared times rho c"],
a: 2, why: "I = p^2 / (2 rho c) for peak pressure of a sinusoid; the square is why 6 dB more pressure is four times the intensity." },
{ q: "Which quantity does duty cycle reduce dramatically?",
o: ["Ispta", "Peak rarefactional pressure", "Isppa", "Mechanical index"],
a: 0, why: "Spatial-peak temporal-average intensity scales with the fraction of time the pulse is on; peak-pressure quantities and MI are unaffected by duty cycle." },
{ q: "The thermal index TI represents:",
o: ["Measured temperature rise in the patient", "The transducer face temperature", "Time until tissue damage occurs", "Estimated power relative to that needed for a one degree modelled tissue rise"],
a: 3, why: "TI is a model-based ratio, not a measurement: a TI of 2 suggests conditions consistent with about two degrees of rise in the modelled scenario." },
{ q: "A radiation force balance measures:",
o: ["Peak negative pressure", "Total radiated acoustic power via steady force on a target", "The beam profile", "Frequency response of the transducer"],
a: 1, why: "The time-averaged momentum flux of the beam pushes on an absorbing target; the force converts directly to total power and anchors traceability." }
],
interview: {
q: "Your new probe design must pass acoustic output testing. Walk me through how you would characterise it.",
a: "I would start in a degassed water tank with a calibrated membrane hydrophone, small enough to avoid spatial averaging at my focal spot and calibrated over enough bandwidth to capture the harmonics a nonlinear focal pulse contains. Raster scans through the focal plane and along the axis give me peak rarefactional pressure, pulse intensity integrals and the spatial-peak locations, from which I compute Isppa, Ispta and MI, then apply the standard derating for tissue attenuation. In parallel a radiation force balance gives total power as an independent traceable check against the integrated scans. I would test worst-case operating modes deliberately, Doppler and pushed focal settings, not just defaults, and document margins to the limits so production variation cannot tip a passing design over."
}
}

);
