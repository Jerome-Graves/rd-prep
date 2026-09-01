// Acoustics lessons, second course: measurement and materials.
//
// These carry a `sub` so the page groups them under a heading, in the same way
// the Embedded C track is organised.

LESSONS.push(

{
id: "ac-scattering",
track: "Acoustics",
sub: "Measurement and materials",
title: "Scattering regimes: Rayleigh, resonance and geometric",
mins: 22,
body: `
<p>What a scatterer does to a wave depends almost entirely on its size relative to the
wavelength. That single ratio divides the behaviour into three regimes with completely
different frequency dependences, and knowing which one you are in tells you what a measurement
can and cannot do.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Three scattering regimes plotted against the ratio of scatterer size to wavelength, with different frequency dependences in each">
<rect class="bx" x="24" y="30" width="200" height="180" rx="4"/>
<text class="th" x="40" y="58">Rayleigh</text>
<text class="ts" x="40" y="86">size much less than</text>
<text class="ts" x="40" y="108">the wavelength</text>
<text class="th" x="40" y="146">scattering rises as</text>
<text class="th" x="40" y="168">frequency to the fourth</text>
<text class="ts" x="40" y="194">grain noise in metal</text>

<rect class="bx" x="240" y="30" width="200" height="180" rx="4"/>
<text class="th" x="256" y="58">resonance</text>
<text class="ts" x="256" y="86">size comparable</text>
<text class="ts" x="256" y="108">with the wavelength</text>
<text class="th" x="256" y="146">strong, oscillatory,</text>
<text class="th" x="256" y="168">shape dependent</text>
<text class="ts" x="256" y="194">bubbles, defects</text>

<rect class="bx" x="456" y="30" width="200" height="180" rx="4"/>
<text class="th" x="472" y="58">geometric</text>
<text class="ts" x="472" y="86">size much greater</text>
<text class="ts" x="472" y="108">than the wavelength</text>
<text class="th" x="472" y="146">reflection, refraction,</text>
<text class="th" x="472" y="168">shadowing</text>
<text class="ts" x="472" y="194">interfaces, large flaws</text>
</svg>

<p>In the <b>Rayleigh</b> regime the scatterer is much smaller than the wavelength and the
scattered power rises as the fourth power of frequency. That steep dependence is why grain
noise in a coarse-grained metal explodes as you raise the inspection frequency, and it is the
practical reason such materials are inspected low and slow. It is also why the same material
looks quiet at one frequency and impenetrable at another.</p>

<p>In the <b>resonance</b> regime the scatterer is comparable with the wavelength, the response
is strong and it oscillates with frequency in a way that depends on the scatterer's shape and
its impedance contrast. This is where most of the diagnostic information lives, because the
structure of that response encodes something about the object, and it is also where modelling
is hardest.</p>

<p>In the <b>geometric</b> regime the scatterer is much larger than the wavelength and ordinary
ray behaviour takes over: reflection at the interface, refraction into the object, and a shadow
behind it. Frequency dependence largely disappears, which is why a large flat defect gives a
similar echo across a band.</p>

<p>Two consequences matter for design. First, <b>frequency selection is a scattering decision</b>
as much as a resolution one: raising the frequency improves resolution and simultaneously raises
the grain noise as the fourth power, so there is an optimum rather than a monotonic
improvement.</p>

<p>Second, the wavelength you should use in that ratio is the one <b>in the material</b>, not in
water. A 5 MHz wave is 0.3 mm in water and about 1.2 mm in steel, so the same inclusion can be
in different regimes on either side of an interface, which is a genuine source of confusion when
comparing an immersion measurement with a contact one.</p>
`,
quiz: [
{ q: "How does Rayleigh scattering depend on frequency?",
o: ["It is independent of frequency", "It rises as the fourth power of frequency", "It falls as the inverse of frequency", "It rises linearly with frequency"],
a: 1, why: "That steep dependence is why grain noise in a coarse-grained metal explodes as the inspection frequency rises, and why such materials are inspected low." },
{ q: "Which regime carries the most diagnostic information about a scatterer?",
o: ["Rayleigh, because the dependence is predictable", "Resonance, where the response encodes shape and contrast", "Geometric, because the echo is strongest", "All three carry the same information"],
a: 1, why: "The oscillatory structure of the response depends on the object's shape and impedance contrast, which is exactly what you want to invert, and also what is hardest to model." },
{ q: "Why is frequency selection a scattering decision, not just a resolution one?",
o: ["Higher frequency reduces the beam width", "Raising frequency improves resolution and raises grain noise as the fourth power", "Lower frequencies cannot penetrate metal", "Resolution is set by the bandwidth, not the frequency"],
a: 1, why: "The two effects pull in opposite directions, so there is an optimum rather than a monotonic improvement with frequency." },
{ q: "Which wavelength should be used to judge the scattering regime?",
o: ["The wavelength in water, as a common reference", "The wavelength in the material containing the scatterer", "The wavelength at the transducer's centre frequency in air", "The shortest wavelength in the pulse's bandwidth"],
a: 1, why: "5 MHz is 0.3 mm in water and about 1.2 mm in steel, so the same inclusion can sit in different regimes on either side of an interface." }
],
interview: {
q: "You are inspecting a coarse-grained casting and the noise is swamping the defects. What do you do?",
a: "That is Rayleigh scattering from the grains, and the key fact is that it rises as the fourth power of frequency while the defect echo, if the defect is large compared with the wavelength, is in the geometric regime and barely changes. So the first move is to drop the frequency, because halving it cuts the grain noise by a factor of sixteen and costs me only a factor of two in resolution. There is an optimum rather than a monotonic improvement, so I would sweep frequency and look at the signal-to-noise on a known reflector rather than pick a number from a table. Beyond frequency there are several things that help, because grain noise is coherent rather than random: it is a deterministic property of the microstructure and the geometry, so simple averaging at one position does nothing at all. What does work is decorrelating it. Spatial compounding, moving the probe slightly and averaging, changes the speckle pattern while the defect echo stays put. Frequency compounding does the same thing by splitting the bandwidth into sub-bands and averaging their envelopes, at the cost of axial resolution. Angle compounding with an array does it by changing the insonification direction. I would also consider whether the wave mode is right, since shear waves are shorter at the same frequency and scatter more, so longitudinal may be the better choice here. And I would be careful to judge the regime using the wavelength in the casting rather than in water, because those differ by a factor of about four and it changes which regime the grains are actually in."
}
},

{
id: "ac-anisotropy",
track: "Acoustics",
sub: "Measurement and materials",
title: "Anisotropy: when velocity depends on direction",
mins: 22,
body: `
<p>In an isotropic material the wave speed is a single number. In an anisotropic one it depends
on the propagation direction, and several things that are normally safe assumptions stop being
true at once.</p>

<p>Anisotropy arises wherever the microstructure has a preferred orientation: a rolled or
welded metal with textured grains, a fibre composite, a single crystal, or polycrystalline ice
where the crystal axes have aligned under deformation. In each case the elastic stiffness is a
tensor rather than a scalar, and the wave equation's solutions depend on direction.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A wavefront in an anisotropic medium where the energy direction departs from the wave normal, showing beam skew">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">in an anisotropic medium the energy does not follow the wave normal</text>

<line class="ln" x1="120" y1="200" x2="120" y2="90"/>
<text class="ts" x="60" y="86">wave normal</text>

<line class="ln" x1="120" y1="200" x2="330" y2="100"/>
<text class="th" x="330" y="96">energy actually goes here</text>

<text class="ts" x="150" y="176">skew angle</text>

<line class="ln" x1="420" y1="90" x2="640" y2="90"/>
<line class="ln" x1="440" y1="130" x2="620" y2="130"/>
<line class="ln" x1="460" y1="170" x2="600" y2="170"/>
<text class="ts" x="420" y="212">velocity varies with direction, so the wavefront is not spherical</text>
</svg>

<p>Three practical consequences follow. First, <b>time of flight no longer converts to distance
with one velocity</b>. A thickness measured with the isotropic value will be wrong, and wrong by
a direction-dependent amount, which looks like a geometry error rather than a material one.</p>

<p>Second, <b>the beam skews</b>. The energy flux direction, given by the group velocity,
departs from the wave normal given by the phase velocity. So a probe aimed at a target does not
insonify it, and the error grows with depth. In welds this is a well-known inspection problem
and it is why anisotropic weld inspection needs modelling rather than intuition.</p>

<p>Third, <b>the shear wave splits</b>. Two shear polarisations travel at different speeds, so a
single shear pulse separates into two arrivals whose spacing grows with path length. That
birefringence is a nuisance if you wanted one arrival, and it is a measurement if you wanted the
anisotropy, because the splitting is a direct probe of the material's preferred orientation.</p>

<p>That last point is the constructive one. Anisotropy is a signal as well as a problem: velocity
against direction, or shear-wave splitting, measures the underlying texture. That is exactly how
crystal orientation fabric is measured in ice cores, and how texture is assessed in rolled
metals.</p>

<p>The practical advice for a measurement in an anisotropic medium is to measure the velocity in
the direction you are actually using, not to look it up; to expect the beam to go somewhere other
than where you aimed it; and to treat a single-velocity model as an approximation whose error you
should estimate rather than ignore.</p>
`,
quiz: [
{ q: "What does anisotropy do to the relationship between time of flight and distance?",
o: ["Nothing, provided the material is homogeneous", "The velocity depends on direction, so one value no longer applies", "It makes the arrival time independent of distance", "It doubles the apparent path length"],
a: 1, why: "A thickness computed with an isotropic velocity is wrong by a direction-dependent amount, which is easily mistaken for a geometry error." },
{ q: "Why does a beam skew in an anisotropic medium?",
o: ["The wavefront is attenuated more in one direction", "The energy flux direction departs from the wave normal", "Refraction at the entry surface is direction dependent", "The transducer's near field is distorted"],
a: 1, why: "Group velocity and phase velocity point in different directions, so the probe does not insonify what it is aimed at, and the error grows with depth." },
{ q: "What is shear wave birefringence?",
o: ["A shear wave converting into a longitudinal wave", "Two shear polarisations travelling at different speeds", "The shear wave reflecting from a grain boundary", "The loss of shear energy into the surrounding fluid"],
a: 1, why: "A single shear pulse separates into two arrivals whose spacing grows with path length, which is a nuisance or a measurement depending on what you wanted." },
{ q: "Why is anisotropy also useful rather than only a problem?",
o: ["It reduces the attenuation along the fast axis", "Velocity against direction measures the material's texture", "It focuses the beam automatically", "It removes the need for a coupling medium"],
a: 1, why: "It is how crystal orientation fabric is measured in ice and how texture is assessed in rolled metals. The anisotropy is the signal." }
],
interview: {
q: "You are making ultrasonic measurements in a strongly anisotropic material. What changes?",
a: "Almost every convenient assumption stops holding at once. The first is that a single velocity converts time of flight into distance, which is no longer true because the wave speed depends on the propagation direction, so a thickness computed with a handbook value is wrong by a direction-dependent amount and it tends to look like a geometry error rather than a material one. So I would measure the velocity in the direction I am actually using rather than look it up, and if I need several directions I would characterise the velocity surface. The second is beam skew: the energy flux direction is given by the group velocity and the wave normal by the phase velocity, and in an anisotropic medium those point in different directions, so the beam does not go where I aimed it and the error grows with depth. That is a well-known problem in austenitic weld inspection and it is why those inspections need ray tracing through an anisotropic model rather than intuition. The third is shear wave splitting, where the two shear polarisations travel at different speeds so one pulse becomes two arrivals whose separation grows along the path. That is a nuisance if I wanted a single clean arrival. But it is also the constructive side of the problem, because velocity against direction and shear-wave splitting are direct measurements of the material's preferred orientation, which is exactly how crystal orientation fabric is measured in ice cores and how texture is assessed in rolled metal. So I would decide early whether the anisotropy is the thing I am fighting or the thing I am measuring, because that changes the whole experiment design."
}
},

{
id: "ac-coupling",
track: "Acoustics",
sub: "Measurement and materials",
title: "Getting energy into the part: coupling and matching",
mins: 20,
body: `
<p>A piezoelectric ceramic has an acoustic impedance around 30 MRayl. Water is 1.5 and steel is
about 45. Connecting a ceramic directly to water reflects the overwhelming majority of the
energy at the face, twice, which is why the matching layer matters as much as the ceramic.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="A transducer stack with backing, ceramic, matching layer and load, showing the impedance step down">
<rect class="bx" x="40" y="70" width="120" height="90" rx="4"/>
<text class="th" x="56" y="100">backing</text>
<text class="ts" x="56" y="126">damps, shortens</text>
<text class="ts" x="56" y="146">the pulse</text>

<rect class="bx" x="176" y="70" width="120" height="90" rx="4"/>
<text class="th" x="192" y="100">ceramic</text>
<text class="ts" x="192" y="126">about 30 MRayl</text>

<rect class="bx" x="312" y="70" width="120" height="90" rx="4"/>
<text class="th" x="328" y="100">matching</text>
<text class="ts" x="328" y="126">quarter wave</text>

<rect class="bx" x="448" y="70" width="180" height="90" rx="4"/>
<text class="th" x="464" y="100">load</text>
<text class="ts" x="464" y="126">water 1.5, steel 45</text>

<text class="ts" x="40" y="196">a quarter-wave layer at the geometric mean transforms one impedance into the other</text>
<text class="ts" x="40" y="220">more layers give more bandwidth, at the cost of complexity and thickness tolerance</text>
</svg>

<p>A <b>quarter-wave matching layer</b> whose impedance is the geometric mean of the two it
joins transforms one into the other at its design frequency. One layer is a large improvement
and is narrowband; two or more layers widen the band at the cost of thickness tolerance, since
each layer must be a quarter wavelength <i>in that layer's own material</i>.</p>

<p>The <b>backing</b> does the opposite job. A heavily attenuating backing whose impedance is
close to the ceramic's absorbs the rearward radiation instead of reflecting it, which shortens
the pulse and widens the bandwidth. It also throws away half the energy, so sensitivity and
bandwidth trade directly against each other, and where a design sits on that trade should follow
from whether resolution or penetration matters more.</p>

<p><b>Couplant</b> is the same problem at the other face. An air gap of even a few micrometres
between probe and part reflects essentially everything, because the impedance mismatch between
any solid and air is enormous. Gel, oil or water fills that gap, and its thickness matters: a
varying couplant layer changes both the amplitude and, slightly, the timing, which is a major
source of irreproducibility in contact measurements.</p>

<p>That is the strongest practical argument for <b>immersion</b> over contact for quantitative
work. A water path is repeatable in a way a hand-held gel layer is not, so amplitude comparisons
between measurements become meaningful. It is also why a fixed standoff, or a measured water
path, matters more than people expect.</p>

<p>Where a fluid couplant is impossible, dry-coupled and electromagnetic acoustic transducers
exist. They avoid the couplant entirely and pay for it in sensitivity, typically by tens of
decibels, which is a large price and sometimes the right one.</p>
`,
quiz: [
{ q: "What impedance should a single quarter-wave matching layer have?",
o: ["The average of the two impedances it joins", "The geometric mean of the two impedances", "The same as the ceramic", "The same as the load"],
a: 1, why: "The geometric mean transforms one impedance into the other at the design frequency. More layers widen the band at the cost of thickness tolerance." },
{ q: "What does a heavily attenuating backing do?",
o: ["Increases sensitivity by reflecting energy forward", "Shortens the pulse and widens the bandwidth, at the cost of sensitivity", "Matches the ceramic to the load", "Reduces the transducer's centre frequency"],
a: 1, why: "It absorbs the rearward radiation rather than reflecting it. Sensitivity and bandwidth trade directly, and where you sit depends on resolution against penetration." },
{ q: "Why does a few micrometres of air stop the measurement entirely?",
o: ["Air attenuates ultrasound very strongly", "The impedance mismatch between any solid and air reflects nearly everything", "The gap acts as a quarter-wave layer", "Air changes the wave's polarisation"],
a: 1, why: "The reflection coefficient at a solid-air interface is essentially unity, which is why a couplant is not optional in contact work." },
{ q: "Why is immersion preferred to contact for quantitative amplitude work?",
o: ["Water has lower attenuation than gel", "A water path is repeatable where a hand-held gel layer is not", "Immersion allows higher frequencies to be used", "It removes the need for a matching layer"],
a: 1, why: "A varying couplant thickness changes amplitude and slightly changes timing, which is a major source of irreproducibility in contact measurements." }
],
interview: {
q: "Your amplitude measurements are not repeatable between operators. What would you look at?",
a: "The couplant would be my first suspicion, because in contact work the coupling layer is the least controlled part of the whole chain. A varying gel thickness changes the transmission at the interface and therefore the amplitude directly, and it changes the timing slightly as well, so two operators with different hand pressure produce genuinely different numbers from the same part. Surface condition compounds it, since roughness, paint and curvature all change how well the probe couples. So the first thing I would do is quantify it: have the same operator repeat a measurement several times on the same spot, then have different operators do the same, and see how much of the spread is coupling and how much is everything else. If coupling is dominant, the honest fix for quantitative work is to remove the variable, which usually means immersion or a fixed standoff with a controlled water path, because a water column is repeatable in a way a hand-applied gel layer is not. Where that is not possible I would look at normalising rather than controlling: referencing every measurement to something in the same A-scan, such as a back-wall echo or an interface echo, so that the coupling term largely cancels in the ratio. That is the same idea as a ratiometric measurement in electronics and it is very effective. I would also check the more mundane contributors, that the gain, the pulser settings and the gate positions are actually identical between operators, because it is common for those to differ and be blamed on coupling. And I would fix the procedure in writing, because a measurement whose result depends on who took it is not yet a measurement."
}
},

{
id: "ac-speckle",
track: "Acoustics",
sub: "Measurement and materials",
title: "Speckle: coherent interference, not noise",
mins: 20,
body: `
<p>The grainy texture in an ultrasound image is not noise. It is the coherent sum of echoes
from scatterers too small and too close together to resolve individually, and for a fixed
geometry it is entirely deterministic: image the same region twice without moving and you get
exactly the same pattern.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Many unresolved scatterers within one resolution cell summing coherently to give a speckle amplitude">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">one resolution cell, many scatterers</text>

<rect class="bx" x="200" y="76" width="280" height="110" rx="4"/>
<text class="ts" x="216" y="100">resolution cell</text>
<circle class="dot" cx="250" cy="130" r="4"/>
<circle class="dot" cx="290" cy="150" r="4"/>
<circle class="dot" cx="330" cy="120" r="4"/>
<circle class="dot" cx="370" cy="155" r="4"/>
<circle class="dot" cx="410" cy="135" r="4"/>
<circle class="dot" cx="440" cy="110" r="4"/>

<text class="ts" x="40" y="212">their echoes add with random relative phase, so the sum can be large or nearly zero</text>
</svg>

<p>That distinction matters because it decides what will and will not reduce it.
<b>Averaging repeated acquisitions at the same position does nothing at all</b>, because the
pattern is identical each time. Only changing something that alters the interference will help.</p>

<p>The techniques that do work are all forms of <b>compounding</b>. Spatial compounding moves
the aperture, so the path lengths change and the speckle decorrelates while a real reflector
stays put. Frequency compounding splits the bandwidth into sub-bands and averages their
envelopes, since the interference pattern depends on frequency. Angular compounding, natural
with an array, insonifies from several directions.</p>

<p>All three trade resolution for speckle reduction: frequency compounding costs axial
resolution because each sub-band is narrower, and spatial or angular compounding costs lateral
resolution and frame rate. The improvement goes roughly as the square root of the number of
independent looks, so the returns diminish quickly.</p>

<p>The other reason to understand speckle is that it carries information. Its statistics, and
how it decorrelates as the aperture moves, say something about the density and distribution of
the scatterers. Speckle tracking uses the fact that the pattern moves with the tissue to measure
displacement and strain, which is only possible because the pattern is deterministic rather than
random.</p>

<p>The trap to avoid is treating a speckle bright spot as a target. A resolution cell that
happens to sum constructively looks exactly like a small strong reflector, and the way to tell
them apart is that the reflector persists as you change the view and the speckle does not.</p>
`,
quiz: [
{ q: "Why does averaging repeated frames not reduce speckle?",
o: ["The frames are too noisy to average", "The pattern is deterministic and identical each time", "Averaging is applied after envelope detection", "The frame rate is too low to decorrelate"],
a: 1, why: "Speckle is coherent interference from unresolved scatterers, not random noise. Only changing the interference decorrelates it." },
{ q: "What does spatial compounding do?",
o: ["Averages several frequencies of the same view", "Moves the aperture so the speckle decorrelates while reflectors stay put", "Increases the transmit power to improve signal to noise", "Applies a spatial filter after envelope detection"],
a: 1, why: "Changing the path lengths changes the interference, and it costs lateral resolution and frame rate in exchange." },
{ q: "What does frequency compounding cost?",
o: ["Lateral resolution", "Axial resolution, because each sub-band is narrower", "Penetration depth", "Frame rate only"],
a: 1, why: "Axial resolution follows from bandwidth, so splitting the band into sub-bands widens the pulse in each one." },
{ q: "How do you distinguish a speckle bright spot from a real reflector?",
o: ["The reflector is always brighter", "The reflector persists as the view changes and the speckle does not", "The speckle has a sharper edge", "The reflector appears only at the focus"],
a: 1, why: "A cell that happens to sum constructively looks exactly like a small strong scatterer in a single view. Changing the insonification separates them." }
],
interview: {
q: "What is speckle, and how would you reduce it?",
a: "Speckle is coherent interference, not noise. Within one resolution cell there are many scatterers too small and too closely spaced to resolve individually, and their echoes add with essentially random relative phase, so the sum can be large or nearly zero depending on the geometry. The critical property is that it is deterministic for a fixed geometry: image the same region twice without moving anything and the pattern is identical. That immediately tells me what will not work, which is averaging repeated acquisitions at the same position, because there is nothing random to average away, and that is a mistake I have seen made more than once. What does work is compounding, and all of it amounts to changing the interference. Spatial compounding moves the aperture so the path lengths change and the speckle decorrelates while a genuine reflector stays where it is. Frequency compounding splits the bandwidth into sub-bands and averages their envelopes, since the pattern depends on frequency. Angular compounding, which is natural with an array, insonifies from several directions. All three buy speckle reduction with resolution: frequency compounding costs axial resolution because each sub-band is narrower, and the spatial and angular versions cost lateral resolution and frame rate. The improvement goes roughly as the square root of the number of independent looks, so there is a point of diminishing returns. The other thing I would keep in mind is that speckle carries information: its statistics say something about the scatterer density, and speckle tracking measures displacement and strain precisely because the pattern is deterministic and moves with the material."
}
},

{
id: "ac-tgc",
track: "Acoustics",
sub: "Measurement and materials",
title: "From amplitude to a number: correction and quantification",
mins: 20,
body: `
<p>An echo amplitude on a screen is not a measurement of anything until you have accounted for
everything between the reflector and the display. Turning it into a defensible number is a
chain of corrections, each of which can be wrong.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The chain from reflector to displayed amplitude, listing beam spreading, attenuation, interface losses and system gain">
<rect class="bx" x="24" y="30" width="632" height="40" rx="4"/>
<text class="ts" x="40" y="55">reflector: size, shape, orientation, impedance contrast</text>
<rect class="bx" x="24" y="78" width="632" height="40" rx="4"/>
<text class="ts" x="40" y="103">propagation: beam spreading, and attenuation growing with depth</text>
<rect class="bx" x="24" y="126" width="632" height="40" rx="4"/>
<text class="ts" x="40" y="151">interfaces: transmission loss at every boundary, twice</text>
<rect class="bx" x="24" y="174" width="632" height="40" rx="4"/>
<text class="ts" x="40" y="199">system: transducer response, gain, and the receiver's own filtering</text>
<text class="th" x="40" y="240">only the first line is what you wanted to measure</text>
</svg>

<p><b>Time gain compensation</b> is the first-order correction: apply a gain that increases with
time to offset attenuation, so that identical reflectors at different depths display equally.
It is essential for a readable image and it is a display correction rather than a measurement,
because the applied curve is chosen for appearance rather than derived from the material.</p>

<p>For quantitative work you need the actual attenuation, in decibels per centimetre per
megahertz, and it must be measured for that material rather than assumed. It is also frequency
dependent, which means a broadband pulse is filtered as it propagates: the higher frequencies
are absorbed preferentially, so the centre frequency of the echo <b>downshifts</b> with depth.
Correcting amplitude without accounting for that downshift is a common systematic error.</p>

<p>Beam spreading is the second correction. In the far field the pressure falls with distance,
so a reflector at twice the range gives a smaller echo for purely geometric reasons. Diffraction
corrections handle this analytically for simple geometries, and for anything else a measured
calibration against a known reflector at a known range is more honest.</p>

<p>Which brings the practical answer: <b>reference everything</b>. Comparing an echo against a
reflector of known size at a known depth in a known material, measured with the same setup,
cancels the transducer response, the gain, the couplant and much of the geometry in one step.
That is what a distance-amplitude correction curve is, and it is why the reference block matters
as much as the instrument.</p>

<p>The check that keeps you honest is repeatability at each stage. If moving the probe and
replacing it changes the number by more than your defect threshold, then no amount of correction
will make the absolute measurement meaningful, and the honest reporting is a ratio to a
reference rather than an absolute figure.</p>
`,
quiz: [
{ q: "What is time gain compensation for?",
o: ["Correcting the transducer's frequency response", "Offsetting attenuation so equal reflectors display equally with depth", "Removing the effect of beam spreading only", "Compensating for a varying couplant thickness"],
a: 1, why: "It is a display correction chosen for appearance rather than derived from the material, which is why it is not itself a quantitative measurement." },
{ q: "Why does the echo's centre frequency fall with depth?",
o: ["The transducer rings at a lower frequency over time", "Attenuation is frequency dependent, so high frequencies are lost first", "The receiver filter narrows with range", "Beam spreading affects high frequencies more"],
a: 1, why: "The broadband pulse is progressively filtered as it propagates, and correcting amplitude without allowing for that downshift is a common systematic error." },
{ q: "Why does referencing to a known reflector help so much?",
o: ["It increases the signal to noise ratio", "It cancels the transducer response, gain and coupling in one step", "It removes the need to know the attenuation", "It eliminates beam spreading entirely"],
a: 1, why: "Measuring a known reflector at a known depth with the same setup is what a distance-amplitude correction curve is, and it is why the reference block matters." },
{ q: "What should you report when repeatability exceeds your defect threshold?",
o: ["The average of many measurements", "A ratio to a reference rather than an absolute figure", "The best measurement obtained", "The measurement with an increased gain"],
a: 1, why: "If replacing the probe moves the number by more than the threshold, no correction makes the absolute value meaningful. The ratio is what survives." }
],
interview: {
q: "How would you turn an echo amplitude into a defensible measurement of defect size?",
a: "I would start by listing everything between the reflector and the number on the screen, because only the first term is what I actually want. The echo depends on the reflector's size, shape, orientation and impedance contrast; then on beam spreading and on attenuation, which grows with depth; then on transmission loss at every interface, twice; and finally on the transducer's own response and the system gain. So the measurement is only as good as my ability to remove the other terms. Time gain compensation handles attenuation to first order, but I would be careful to treat that as a display correction rather than a measurement, because the curve is usually chosen so the image looks right rather than derived from the material. For quantitative work I would measure the attenuation for that material in decibels per centimetre per megahertz, and I would account for the fact that it is frequency dependent, which means the pulse is filtered as it propagates and its centre frequency downshifts with depth; correcting amplitude without allowing for that downshift is a systematic error I have seen made. Rather than try to compute every term, the honest approach is to reference: measure a known reflector, of a known size at a known depth in a representative material, with exactly the same setup, and report the unknown relative to that. That is what a distance-amplitude correction curve is and it cancels the transducer response, the gain and much of the coupling in one step. Then I would quantify repeatability by removing and replacing the probe several times, because if that spread exceeds the defect threshold I care about, the absolute number is not meaningful and I should be reporting a ratio."
}
},

{
id: "ac-repeat",
track: "Acoustics",
sub: "Measurement and materials",
title: "Making an ultrasonic measurement defensible",
mins: 20,
body: `
<p>The difference between a result and a defensible result is that the second one comes with an
uncertainty you can justify and a procedure someone else could repeat. In ultrasonics that is
harder than it sounds, because so many of the error sources are systematic rather than random.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Random errors reducing with repetition against systematic errors which do not, and the separate question of reproducibility between operators">
<rect class="bx" x="24" y="30" width="200" height="180" rx="4"/>
<text class="th" x="40" y="58">random</text>
<text class="ts" x="40" y="86">electronic noise,</text>
<text class="ts" x="40" y="108">digitiser jitter</text>
<text class="th" x="40" y="146">falls as root N</text>
<text class="ts" x="40" y="176">averaging works</text>

<rect class="bx" x="240" y="30" width="200" height="180" rx="4"/>
<text class="th" x="256" y="58">systematic</text>
<text class="ts" x="256" y="86">velocity, cable delay,</text>
<text class="ts" x="256" y="108">gate position, temperature</text>
<text class="th" x="256" y="146">does not fall at all</text>
<text class="ts" x="256" y="176">calibration works</text>

<rect class="bx" x="456" y="30" width="200" height="180" rx="4"/>
<text class="th" x="472" y="58">reproducibility</text>
<text class="ts" x="472" y="86">operator, coupling,</text>
<text class="ts" x="472" y="108">probe placement</text>
<text class="th" x="472" y="146">usually dominates</text>
<text class="ts" x="472" y="176">procedure works</text>
</svg>

<p>The three categories need different treatment. <b>Random</b> error falls as the square root of
the number of averages, so it is the easiest to reduce and usually the smallest contributor.
<b>Systematic</b> error does not fall at all with repetition: an assumed velocity that is one
percent wrong is one percent wrong for ever, and the only remedy is calibration against a known
standard.</p>

<p><b>Reproducibility</b>, the spread when a different person on a different day repeats the
measurement, is usually the largest term and the one most often left out of the stated
uncertainty. Measuring it means actually doing it: several operators, several sessions, the same
part.</p>

<p><b>Temperature</b> deserves its own mention because it moves velocity in almost every material
and is easy to overlook indoors. In water the sound speed changes by several metres per second
per degree, which is a few parts per thousand, and that is large compared with many measurement
targets. Recording the temperature costs nothing and rescues an analysis months later.</p>

<p>The strongest single practice is a <b>reference measurement in every session</b>: measure a
known standard before and after the real work, and log the result. It detects drift, a damaged
probe, a changed setting and a temperature shift, and it converts an argument about whether
today's data is comparable into a check anyone can look at.</p>

<p>Finally, log enough to <b>reproduce the analysis</b>, not just the conclusion: raw waveforms
rather than extracted amplitudes, with the settings, the temperature and the geometry alongside.
Extracted numbers cannot be reprocessed when you later discover the gate was in the wrong place,
and the raw data can.</p>
`,
quiz: [
{ q: "Which error category does averaging actually reduce?",
o: ["Systematic error", "Random error, as the square root of the count", "Reproducibility between operators", "Temperature-driven velocity error"],
a: 1, why: "Averaging attacks the random part and leaves anything constant exactly where it was. Systematic error needs calibration instead." },
{ q: "Which term is usually the largest and most often omitted?",
o: ["Electronic noise", "Reproducibility between operators and sessions", "Digitiser quantisation", "Cable delay"],
a: 1, why: "It has to be measured by actually doing it: several operators, several sessions, the same part. Assuming it is small is how uncertainties get understated." },
{ q: "Why record temperature during an ultrasonic measurement?",
o: ["It affects the electronics' gain", "Velocity changes with temperature in almost every material", "It changes the transducer's centre frequency", "It alters the attenuation coefficient only"],
a: 1, why: "In water the speed changes by several metres per second per degree, a few parts per thousand, which is large compared with many measurement targets." },
{ q: "Why log raw waveforms rather than extracted amplitudes?",
o: ["Raw data compresses better", "Extracted numbers cannot be reprocessed when a setting turns out to be wrong", "Waveforms are needed for regulatory compliance", "Amplitudes are less accurate than waveforms"],
a: 1, why: "Discovering later that a gate was misplaced is recoverable from raw data and not from a table of amplitudes. Log enough to reproduce the analysis." }
],
interview: {
q: "How would you establish the uncertainty of an ultrasonic thickness measurement?",
a: "I would separate the error into three categories, because they behave differently and need different treatment. Random error, from electronic noise and digitiser jitter, falls as the square root of the number of averages, so it is the easiest to reduce and usually the smallest contributor; I would quantify it by repeating the measurement without touching anything. Systematic error does not reduce with repetition at all, and for a thickness measurement the dominant one is almost always the assumed velocity, since a one percent velocity error is a one percent thickness error for ever. So I would either measure the velocity on a sample of the actual material or calibrate against a step wedge of known thickness in the same material, and I would also account for the fixed delays in cable and wedge, which are pure offsets and easy to calibrate out. Then reproducibility, which is the spread when a different operator on a different day repeats the measurement, and in my experience it is usually the largest term and the one most often left out of a stated uncertainty. The only way to get it is to measure it: several operators, several sessions, the same part. I would record temperature throughout, because velocity moves with temperature in almost every material and it is easy to overlook indoors. And I would run a reference measurement at the start and end of every session against a known standard, logged, because that catches drift, a damaged probe, a changed setting or a temperature shift, and it turns a later argument about whether two data sets are comparable into a check anyone can look at. Finally I would log raw waveforms rather than extracted thicknesses, because if I later discover a gate was in the wrong place I can reprocess raw data and I cannot reprocess a table of numbers."
}
}

);
