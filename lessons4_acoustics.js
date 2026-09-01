// Acoustics lessons: array signal processing.
//
// The track had a single lesson on arrays and nothing on beamforming itself.
// This is the section an ultrasonics interviewer is most likely to go deep on,
// and it is the machinery behind both conventional imaging and the full matrix
// methods that have largely replaced it for inspection.

LESSONS.push(

{
id: "ac-beamforming",
track: "Acoustics",
sub: "Array signal processing",
title: "Delay and sum: the beamformer everything else is built on",
mins: 22,
body: `
<p>An array is a set of small elements, each of which radiates almost omnidirectionally on its
own. A beam is created not by the elements but by the <b>timing</b>: apply a delay to each so
that their contributions arrive in phase at a chosen point, and they add coherently there while
adding incoherently everywhere else.</p>

<svg class="fig" viewBox="0 0 680 260" role="img" aria-label="Elements with different delays so their wavefronts arrive together at a focal point off to one side">
<rect class="bxa" x="24" y="24" width="632" height="34" rx="4"/>
<text class="th" x="40" y="47">the delay law is the whole beamformer</text>

<rect class="bx" x="60" y="80" width="26" height="34" rx="2"/>
<rect class="bx" x="60" y="122" width="26" height="34" rx="2"/>
<rect class="bx" x="60" y="164" width="26" height="34" rx="2"/>
<rect class="bx" x="60" y="206" width="26" height="34" rx="2"/>
<text class="ts" x="24" y="102">e1</text>
<text class="ts" x="24" y="144">e2</text>
<text class="ts" x="24" y="186">e3</text>
<text class="ts" x="24" y="228">e4</text>

<line class="ln" x1="86" y1="97" x2="470" y2="150"/>
<line class="ln" x1="86" y1="139" x2="470" y2="150"/>
<line class="ln" x1="86" y1="181" x2="470" y2="150"/>
<line class="ln" x1="86" y1="223" x2="470" y2="150"/>
<circle class="dot" cx="470" cy="150" r="7"/>
<text class="th" x="490" y="146">focal point</text>
<text class="ts" x="490" y="170">all four arrive together</text>

<text class="ts" x="120" y="256">different path lengths, so different delays: the far element fires first</text>
</svg>

<p>On <b>transmit</b>, the element furthest from the focus must fire first, because its path is
longest. On <b>receive</b>, the same delays are applied to the recorded signals before summing.
The two are symmetric, and the delay law is simply the path length from each element to the
focal point divided by the wave speed.</p>

<p>That immediately tells you what the beamformer depends on. It needs the <b>geometry</b> of the
array and it needs the <b>speed of sound</b>. An error in either puts the delays wrong, the
contributions no longer add in phase, and the focus degrades. A one percent velocity error is a
one percent error in every delay, and at depth that is a substantial fraction of a wavelength.</p>

<p>Steering follows from the same idea. A linear ramp of delays across the aperture tilts the
wavefront, so the beam points off axis; adding a curvature focuses it at a chosen range. Steering
and focusing are the same mechanism with different delay laws, which is why one piece of hardware
does both.</p>

<p>The resolution you get is not free. <b>Lateral</b> resolution improves with a wider aperture
and shorter wavelength, and degrades with range, since it goes roughly as the wavelength times
the range divided by the aperture. <b>Axial</b> resolution comes from the pulse bandwidth and is
essentially independent of the array.</p>

<p>Finally, delay-and-sum is a <b>matched filter for a point at the focus</b>, and it is optimal
only under assumptions that are never quite true: a homogeneous medium, a known speed, and point
elements. Everything more sophisticated in array processing is an attempt to relax one of those.</p>
`,
quiz: [
{ q: "What creates a beam from an array of omnidirectional elements?",
o: ["The directivity of each element", "The relative delays applied across the elements", "The amplitude weighting of each element", "The spacing between the elements alone"],
a: 1, why: "Delays make the contributions arrive in phase at the chosen point, so they add coherently there and incoherently elsewhere." },
{ q: "On transmit, which element fires first for a focus off to one side?",
o: ["The element nearest the focus", "The element furthest from the focus", "All elements fire simultaneously", "The centre element of the aperture"],
a: 1, why: "Its path is longest, so it must start earliest for all the contributions to arrive together. The delay law is path length divided by wave speed." },
{ q: "What does a beamformer fundamentally depend on knowing?",
o: ["The array geometry and the speed of sound", "The attenuation of the medium", "The transducer's centre frequency", "The number of elements only"],
a: 1, why: "An error in either puts every delay wrong. A one percent velocity error is a substantial fraction of a wavelength at depth." },
{ q: "What determines axial resolution?",
o: ["The aperture width", "The pulse bandwidth", "The number of elements", "The steering angle"],
a: 1, why: "Axial resolution comes from the pulse and is essentially independent of the array, while lateral resolution depends on aperture, wavelength and range." }
],
interview: {
q: "Explain how a phased array beamformer works.",
a: "The elements are small enough to be nearly omnidirectional individually, so the beam comes entirely from timing rather than from the elements. For a chosen focal point I compute the path length from each element to that point, divide by the speed of sound, and that gives me a delay law. On transmit I fire the elements so that the one furthest from the focus goes first and all the wavefronts arrive together, and on receive I apply the same delays to the recorded signals before summing, so contributions from the focus add coherently while everything else adds incoherently. Steering and focusing are the same mechanism with different laws: a linear ramp of delays across the aperture tilts the beam off axis, and adding curvature focuses it at a range, which is why one piece of hardware does both. The thing I would draw attention to is what the beamformer depends on, because that is where the errors come from. It needs the array geometry and it needs the speed of sound, and a one percent velocity error puts every delay wrong by one percent, which at depth is a serious fraction of a wavelength and visibly degrades the focus. On resolution, lateral resolution goes roughly as wavelength times range over aperture, so it improves with a wider aperture and gets worse with depth, whereas axial resolution comes from the pulse bandwidth and is essentially independent of the array. And I would be clear that delay-and-sum is only optimal under assumptions that are never quite true, a homogeneous medium with a known speed and point-like elements, which is exactly what the more sophisticated methods set out to relax."
}
},

{
id: "ac-apodisation",
track: "Acoustics",
sub: "Array signal processing",
title: "Sidelobes, grating lobes and apodisation",
mins: 22,
body: `
<p>A beamformer does not put all its sensitivity in the main lobe. Energy also arrives from
other directions through <b>sidelobes</b>, and if the element spacing is too large, through
<b>grating lobes</b>, which are copies of the main lobe at other angles. The two have different
causes and different cures, and confusing them is common.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A beam pattern with a main lobe, decaying sidelobes, and a grating lobe of comparable height at a large angle">
<line class="ln" x1="60" y1="200" x2="640" y2="200"/>
<text class="ts" x="560" y="222">angle</text>

<line class="ln" x1="300" y1="200" x2="310" y2="60"/>
<line class="ln" x1="310" y1="60" x2="320" y2="200"/>
<text class="th" x="270" y="52">main lobe</text>

<line class="ln" x1="340" y1="200" x2="350" y2="150"/>
<line class="ln" x1="350" y1="150" x2="360" y2="200"/>
<line class="ln" x1="380" y1="200" x2="390" y2="170"/>
<line class="ln" x1="390" y1="170" x2="400" y2="200"/>
<text class="ts" x="352" y="142">sidelobes: decay away</text>

<line class="ln" x1="580" y1="200" x2="590" y2="80"/>
<line class="ln" x1="590" y1="80" x2="600" y2="200"/>
<text class="th" x="520" y="72">grating lobe</text>
<text class="ts" x="500" y="240">a full-height copy: an echo appears at the wrong angle</text>
</svg>

<p><b>Grating lobes</b> are spatial aliasing. Sampling the wavefront at intervals larger than
half a wavelength is exactly the spatial equivalent of sampling a signal below Nyquist, and the
result is a copy of the main lobe at another angle. A reflector there produces an echo that
appears in entirely the wrong place, which is far more damaging than a raised background.</p>

<p>The cure is element <b>pitch</b>. Half a wavelength guarantees no grating lobe at any steering
angle; a full wavelength is acceptable if you never steer. That constraint is what makes a
high-frequency array expensive, because the elements and the channel count scale with it.</p>

<p><b>Sidelobes</b> are different: they are the transform of the aperture. A uniformly weighted
aperture is a rectangular window, and its pattern is a sinc whose first sidelobe is only about
thirteen decibels down. That is the same mathematics as spectral leakage, and it has the same
cure.</p>

<p><b>Apodisation</b> is applying a taper across the aperture, weighting the outer elements less.
It suppresses the sidelobes considerably, and it widens the main lobe, because the effective
aperture is smaller. That is the trade: contrast against resolution, chosen by the window in
exactly the way it is chosen in spectral analysis.</p>

<p>The practical consequences are worth stating plainly. High sidelobes fill anechoic regions
with clutter, so a void looks less empty than it is, which limits <b>contrast</b> rather than
resolution. Grating lobes place real energy at wrong angles, which produces artefacts that look
like structure. Apodisation fixes the first at a cost; only geometry fixes the second.</p>
`,
quiz: [
{ q: "What causes a grating lobe?",
o: ["Too few elements in the aperture", "Element spacing greater than half a wavelength", "A uniformly weighted aperture", "Steering beyond 45 degrees"],
a: 1, why: "It is spatial aliasing, exactly analogous to sampling below Nyquist in time, and it produces a full-height copy of the main lobe at another angle." },
{ q: "Why are sidelobes present even with correct element spacing?",
o: ["The elements are not perfectly identical", "The beam pattern is the transform of the aperture", "The medium attenuates off-axis energy less", "The delays cannot be applied exactly"],
a: 1, why: "A uniform aperture is a rectangular window whose transform is a sinc, with a first sidelobe about thirteen decibels down. It is spectral leakage in space." },
{ q: "What does apodisation trade?",
o: ["Penetration against frame rate", "Sidelobe level against main lobe width", "Axial against lateral resolution", "Sensitivity against bandwidth"],
a: 1, why: "Tapering the aperture suppresses sidelobes and widens the main lobe, because the effective aperture is smaller. It is the same choice as picking a window." },
{ q: "Why is a grating lobe more damaging than a high sidelobe?",
o: ["It cannot be suppressed by any means", "It places real energy at a wrong angle, creating false structure", "It reduces the signal to noise ratio more", "It only appears at large depths"],
a: 1, why: "High sidelobes fill anechoic regions with clutter and limit contrast; a grating lobe produces an artefact that looks like a genuine reflector in the wrong place." }
],
interview: {
q: "Your array image has artefacts appearing at the wrong angles. What would you suspect?",
a: "Grating lobes, which is spatial aliasing. If the element pitch is greater than half a wavelength then I am sampling the wavefront below its spatial Nyquist rate, and the beam pattern gets full-height copies of the main lobe at other angles, so a strong reflector sitting in one of those directions shows up in the image somewhere it is not. The reason I would suspect that rather than sidelobes is the character of the artefact: sidelobes raise the background and fill anechoic regions with clutter, which limits contrast, whereas a grating lobe puts a discrete feature at a wrong location that looks like real structure. The check is straightforward, because grating lobe position depends on steering angle and on frequency, so if the artefact moves as I steer or shifts with frequency that confirms it, and I can compute where I would expect it from the pitch in wavelengths. The cure is geometry rather than processing. Half a wavelength pitch guarantees no grating lobe at any steering angle, and a full wavelength is tolerable only if I never steer, so if the array is fixed then my options are to restrict the steering range, to lower the frequency so the pitch becomes a smaller fraction of a wavelength, or to accept and mask the affected region. That last point is why array cost scales the way it does, because halving the pitch doubles the element and channel count. Separately I would look at apodisation for the sidelobe contribution, tapering the aperture to trade sidelobe level against main lobe width, which is exactly the window choice you make in spectral analysis, but I would be clear that apodisation does nothing at all for grating lobes."
}
},

{
id: "ac-focusing",
track: "Acoustics",
sub: "Array signal processing",
title: "Focusing, depth of field and dynamic receive",
mins: 20,
body: `
<p>A focused beam is narrow at one range and wider on either side. How narrow, and over what
range, follows from the aperture and the wavelength, and understanding that relationship is what
makes an imaging system's resolution predictable.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="A beam converging to a waist at the focus and diverging afterwards, with the depth of field marked around it">
<rect class="bx" x="40" y="90" width="26" height="70" rx="2"/>
<text class="ts" x="34" y="180">aperture</text>

<line class="ln" x1="66" y1="95" x2="360" y2="118"/>
<line class="ln" x1="66" y1="155" x2="360" y2="132"/>
<line class="ln" x1="360" y1="118" x2="640" y2="86"/>
<line class="ln" x1="360" y1="132" x2="640" y2="164"/>

<line class="ln" x1="300" y1="60" x2="300" y2="190"/>
<line class="ln" x1="430" y1="60" x2="430" y2="190"/>
<text class="th" x="310" y="52">depth of field</text>
<text class="ts" x="330" y="212">narrow here, wider either side</text>
</svg>

<p>The beam width at the focus goes roughly as the wavelength times the focal range divided by
the aperture, a quantity usually written as the <b>f-number</b> times the wavelength. A lower
f-number, meaning a wider aperture relative to the range, gives a tighter focus.</p>

<p>The <b>depth of field</b>, over which the beam stays approximately that narrow, goes as the
square of the f-number times the wavelength. That square is the important part: tightening the
focus by a factor of two shortens the useful depth by a factor of four. Resolution and depth of
field are not independent choices.</p>

<p>On transmit you are stuck with that, because the pulse has left and its focus is fixed. That
is why a conventional image is sharp near the transmit focus and softer elsewhere, and why
multiple transmit focal zones exist: several transmissions at different focal depths, stitched
together, at a proportional cost in frame rate.</p>

<p>On <b>receive</b> the situation is entirely different, because the data is still there and
can be re-delayed. <b>Dynamic receive focusing</b> updates the delay law continuously as the
echoes arrive from deeper, so every depth is focused on receive. It costs computation and
nothing else, which is why it is universal.</p>

<p>The companion technique is the <b>expanding aperture</b>: use a small aperture for shallow
echoes and open it up with depth, so the f-number stays constant. Without it, the near field is
imaged with an effectively enormous aperture, where the geometry is poor and the elements at the
edges contribute at extreme angles.</p>

<p>That leaves transmit as the remaining limitation, and it is exactly the limitation that
synthetic aperture and plane wave methods set out to remove by making the transmit focus
synthetic rather than physical.</p>
`,
quiz: [
{ q: "What does the beam width at the focus depend on?",
o: ["The number of elements only", "The f-number times the wavelength", "The pulse bandwidth", "The transmit voltage"],
a: 1, why: "The f-number is focal range divided by aperture, so a wider aperture relative to range gives a tighter focus." },
{ q: "How does depth of field scale with f-number?",
o: ["Linearly", "As the square", "As the square root", "It does not depend on f-number"],
a: 1, why: "Tightening the focus by a factor of two shortens the useful depth by four, so resolution and depth of field are not independent choices." },
{ q: "Why can receive focusing be dynamic when transmit focusing cannot?",
o: ["Receive delays are smaller", "The data is still available and can be re-delayed at every depth", "Transmit focusing is limited by the amplifier", "Receive uses a wider aperture"],
a: 1, why: "The transmitted pulse has left with its focus fixed, whereas the recorded echoes can be beamformed with a delay law that updates continuously with depth." },
{ q: "What does an expanding aperture maintain?",
o: ["A constant frame rate", "A roughly constant f-number with depth", "A constant transmit power", "A constant number of active elements"],
a: 1, why: "Without it, shallow echoes are imaged with an effectively enormous aperture, where the edge elements contribute at extreme angles and the geometry is poor." }
],
interview: {
q: "Why is a conventional ultrasound image sharp at one depth and softer elsewhere?",
a: "Because the transmit focus is fixed at the moment the pulse leaves. The beam converges to a waist at the focal range and diverges either side of it, and the depth over which it stays approximately that narrow is the depth of field, which scales as the square of the f-number times the wavelength. The square is the part that matters: if I tighten the focus by a factor of two to get better lateral resolution at the focal depth, I shorten the useful depth by a factor of four, so resolution and depth of field are not independent things I can choose separately. On receive it is a different situation entirely, because the echoes are recorded and I can re-delay them however I like, so dynamic receive focusing updates the delay law continuously as the echoes arrive from deeper and every depth is focused on receive. That costs computation and nothing else, which is why it is universal. I would normally pair it with an expanding aperture, opening the active aperture up with depth so the f-number stays roughly constant, because otherwise shallow echoes are formed with an effectively enormous aperture where the edge elements are contributing at extreme angles. So the residual softness is a transmit limitation. The conventional fix is multiple transmit focal zones, several transmissions focused at different depths stitched together, which costs frame rate in direct proportion. And the more modern answer is to stop physically focusing on transmit at all, which is what plane wave and synthetic aperture methods do, forming the transmit focus retrospectively in software everywhere at once."
}
},

{
id: "ac-fmc",
track: "Acoustics",
sub: "Array signal processing",
title: "Full matrix capture and the total focusing method",
mins: 22,
body: `
<p>Conventional beamforming decides the focus before transmitting, and the data you record is
already committed to that choice. Full matrix capture removes the commitment: it records
everything, and the focusing is done afterwards in software.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Every element transmitting in turn while all elements receive, filling an N by N matrix of A-scans">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">fire element i alone, record on every element j</text>

<rect class="bx" x="150" y="76" width="380" height="150" rx="4"/>
<text class="ts" x="166" y="102">transmit 1: receive on 1, 2, 3 ... N</text>
<text class="ts" x="166" y="130">transmit 2: receive on 1, 2, 3 ... N</text>
<text class="ts" x="166" y="158">...</text>
<text class="ts" x="166" y="186">transmit N: receive on 1, 2, 3 ... N</text>
<text class="th" x="166" y="214">N by N A-scans: the full matrix</text>
</svg>

<p>The acquisition is simple: fire one element on its own, record on all of them, repeat for
every element. That gives an N by N set of A-scans, which contains every transmit-receive path
the array can produce and therefore all the information the array is capable of collecting.</p>

<p>The <b>total focusing method</b> is the reconstruction. For each pixel in the image, compute
the travel time from transmitting element i to that pixel and back to receiving element j, look
up that sample in the corresponding A-scan, and sum over all i and j. Every pixel is focused on
both transmit and receive, which is why it is sometimes called the gold standard.</p>

<p>The costs are the acquisition time and the computation. Firing elements one at a time is slow
compared with a focused transmit, and the reconstruction is N squared samples per pixel, so a
64-element array is 4096 lookups per pixel. Modern implementations run it on a GPU or in fabric,
and sparse variants use a subset of the matrix for a large saving at modest cost.</p>

<p>The other cost is <b>signal to noise ratio</b>. A single small element transmitting alone puts
very little energy into the medium compared with a focused transmit using the whole aperture, so
each A-scan is noisy. Averaging helps, and so do the methods that transmit on several elements at
once with an encoded sequence and decode afterwards, recovering the energy without losing the
flexibility.</p>

<p>What the full matrix genuinely buys is that the focusing decision is deferred. You can
reconstruct with a different velocity, with a different geometry, with mode conversion accounted
for, or with several imaging modes at once, all from one acquisition. In inspection that is
transformative, because the same data can be re-processed when you learn something new about the
part.</p>
`,
quiz: [
{ q: "What does full matrix capture record?",
o: ["The focused image at every depth", "Every transmit-receive element pair as a separate A-scan", "The envelope of each element's response", "One A-scan per steering angle"],
a: 1, why: "Firing each element alone while recording on all of them gives every path the array can produce, and therefore all the information it can collect." },
{ q: "What does the total focusing method compute per pixel?",
o: ["The maximum amplitude across all A-scans", "The sum over all transmit-receive pairs at the correct travel time", "The average of the beamformed lines nearby", "The correlation between adjacent elements"],
a: 1, why: "Every pixel is focused on both transmit and receive, which is why it is treated as the reference quality reconstruction." },
{ q: "Why does full matrix capture have poor signal to noise ratio per A-scan?",
o: ["The receiver bandwidth must be wider", "A single small element transmits very little energy", "The acquisition takes longer, so noise accumulates", "The elements are not focused on receive"],
a: 1, why: "A focused transmit uses the whole aperture, so it puts far more energy in. Encoded multi-element transmits recover the energy without losing the flexibility." },
{ q: "What is the main practical advantage of capturing the full matrix?",
o: ["It is faster than conventional imaging", "The focusing decision is deferred and the data can be reprocessed", "It needs fewer elements for the same resolution", "It removes the need to know the sound speed"],
a: 1, why: "You can reconstruct later with a different velocity, geometry or mode, which is transformative in inspection where you learn about the part as you go." }
],
interview: {
q: "What is the advantage of full matrix capture over conventional phased array imaging?",
a: "The key difference is when the focusing decision is made. In conventional phased array imaging I choose a focal law before transmitting, so the data I record is already committed to that focus, and if I want a different focus I have to fire again. Full matrix capture fires each element on its own and records on every element, giving an N by N set of A-scans that contains every transmit-receive path the array can produce, so it holds all the information the array is capable of collecting. Then the total focusing method reconstructs it: for each pixel I compute the travel time from transmitter i to the pixel and back to receiver j, take that sample, and sum over every pair, so every pixel is focused on both transmit and receive rather than only at one focal depth. What that actually buys me in practice is that the focusing is deferred, so I can reprocess the same acquisition with a different sound speed, with a corrected geometry, with mode conversion accounted for, or in several imaging modes, which matters enormously in inspection where I often learn something about the part after the data is taken. The costs are real though. Acquisition is slower because I fire elements one at a time, reconstruction is N squared samples per pixel so a 64-element array is over four thousand lookups per pixel, and the signal to noise ratio per A-scan is poor because a single small element puts very little energy in compared with a focused transmit using the whole aperture. The computation is handled on a GPU or in fabric, and the signal to noise problem is addressed either by averaging or by transmitting on several elements with an encoded sequence and decoding afterwards."
}
},

{
id: "ac-planewave",
track: "Acoustics",
sub: "Array signal processing",
title: "Plane wave imaging and coherent compounding",
mins: 20,
body: `
<p>Conventional imaging builds a frame line by line: one focused transmission per line, so a
128-line image takes 128 transmissions and the frame rate is bounded by the round-trip time
times the line count. Plane wave imaging removes that bound entirely.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="One unfocused plane wave insonifying the whole field, with the full image beamformed in software from that single transmission">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">one transmission, the whole field, beamformed in software</text>

<rect class="bx" x="60" y="80" width="26" height="130" rx="2"/>
<line class="ln" x1="120" y1="80" x2="120" y2="210"/>
<line class="ln" x1="180" y1="80" x2="180" y2="210"/>
<line class="ln" x1="240" y1="80" x2="240" y2="210"/>
<text class="ts" x="130" y="234">unfocused plane wavefronts</text>

<rect class="bx" x="330" y="80" width="300" height="130" rx="4"/>
<text class="ts" x="346" y="112">every pixel reconstructed</text>
<text class="ts" x="346" y="140">from this one transmission</text>
<text class="th" x="346" y="180">thousands of frames per second</text>
</svg>

<p>The idea is to transmit an <b>unfocused</b> plane wave that insonifies the whole field at
once, then beamform the entire image in software from that single acquisition. Receive focusing
is dynamic as usual, so every pixel is focused on receive; what is missing is any transmit
focusing at all.</p>

<p>The consequence is a frame rate limited only by the round trip, so thousands of frames per
second rather than tens. That is what made shear wave elastography and ultrafast Doppler
possible, because both need to observe something that happens far too quickly for a
line-by-line frame.</p>

<p>The cost is image quality: with no transmit focusing, contrast and lateral resolution are
noticeably worse than a conventional focused image. The fix is <b>coherent compounding</b>:
transmit several plane waves at different angles, beamform each, and sum the results <i>before</i>
envelope detection.</p>

<p>Summing coherently, with the radio-frequency data rather than the envelopes, is what makes it
work. Contributions from a real scatterer add in phase across the angles while clutter and noise
do not, so the effect approximates a synthetic transmit focus. A dozen or so angles typically
recovers image quality comparable to conventional focusing while still leaving a frame rate an
order of magnitude higher.</p>

<p>That gives a clean trade you can dial: more angles means better quality and a lower frame
rate. Because the choice is made in software from the same array, the same probe can do ultrafast
acquisition for elastography and high-quality compounding for anatomy without any hardware
change.</p>
`,
quiz: [
{ q: "What limits the frame rate of conventional line-by-line imaging?",
o: ["The processing time per line", "One focused transmission per line, times the round-trip time", "The transducer's bandwidth", "The number of elements in the array"],
a: 1, why: "A 128-line image needs 128 transmissions, so plane wave imaging removes that bound by insonifying the whole field at once." },
{ q: "What is missing from a single plane wave acquisition?",
o: ["Receive focusing", "Transmit focusing", "Both transmit and receive focusing", "Axial resolution"],
a: 1, why: "Receive focusing is dynamic as usual, so the loss of contrast and lateral resolution comes entirely from the unfocused transmit." },
{ q: "Why must compounding be done coherently?",
o: ["It is faster than compounding envelopes", "Summing radio-frequency data lets real scatterers add in phase", "Envelope detection removes the angle information", "It avoids saturating the accumulator"],
a: 1, why: "Contributions from a genuine scatterer add in phase across angles while clutter does not, which approximates a synthetic transmit focus." },
{ q: "What did ultrafast imaging make possible?",
o: ["Deeper penetration at the same frequency", "Shear wave elastography and ultrafast Doppler", "Higher axial resolution", "Imaging without a coupling medium"],
a: 1, why: "Both need to observe events far too fast for a line-by-line frame rate, which is exactly what thousands of frames per second provides." }
],
interview: {
q: "How does plane wave imaging achieve thousands of frames per second?",
a: "By removing the line-by-line acquisition entirely. Conventional imaging fires one focused transmission per image line, so a 128-line frame needs 128 transmissions and the frame rate is bounded by the round-trip time multiplied by the line count, which puts you in the tens of frames per second. Plane wave imaging transmits a single unfocused wavefront that insonifies the whole field at once and then beamforms every pixel in software from that one acquisition. Receive focusing is dynamic exactly as usual, so every pixel is still focused on receive; what has gone is any transmit focusing, and the frame rate is then limited only by the round trip, which puts you in the thousands. The price is image quality, because with no transmit focus the contrast and lateral resolution are noticeably worse. The standard recovery is coherent compounding: transmit several plane waves at different angles, beamform each one, and sum the results before envelope detection. Doing that coherently on the radio-frequency data is the essential part, because contributions from a real scatterer add in phase across the angles while clutter and noise do not, and the effect approximates a synthetic transmit focus. A dozen or so angles typically brings quality back to something comparable with conventional focusing while still leaving a frame rate an order of magnitude higher. What I like about it as an architecture is that the trade is entirely in software, so the same probe and the same electronics can do ultrafast acquisition for shear wave elastography or Doppler, and heavy compounding for anatomical quality, with no hardware change at all."
}
},

{
id: "ac-adaptive-bf",
track: "Acoustics",
sub: "Array signal processing",
title: "Adaptive beamforming and coherence weighting",
mins: 22,
body: `
<p>Delay-and-sum applies a fixed apodisation regardless of what the data contains. Adaptive
methods choose the weights from the data itself, which can suppress interference from directions
that happen to be occupied rather than from directions you guessed about in advance.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Fixed weights giving a fixed pattern, against adaptive weights placing a null on an interferer">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">fixed weights</text>
<rect class="bx" x="24" y="72" width="308" height="140" rx="4"/>
<text class="ts" x="40" y="100">pattern known in advance</text>
<text class="ts" x="40" y="126">robust, predictable</text>
<text class="th" x="40" y="164">sidelobes wherever</text>
<text class="th" x="40" y="186">the window puts them</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">adaptive weights</text>
<rect class="bx" x="348" y="72" width="308" height="140" rx="4"/>
<text class="ts" x="364" y="100">weights computed from data</text>
<text class="ts" x="364" y="126">a null is steered onto</text>
<text class="ts" x="364" y="148">whatever is interfering</text>
<text class="th" x="364" y="186">fragile if assumptions break</text>
</svg>

<p>The classical method is the <b>minimum variance</b> or Capon beamformer. It minimises the
output power subject to the constraint that a signal from the look direction passes with unit
gain, so it puts nulls wherever the interference actually is. The resolution improvement can be
substantial.</p>

<p>Its weakness is fragility. The constraint assumes the steering vector is exactly right, and
any error in the assumed geometry, in the sound speed, or in the element responses makes the
beamformer treat part of the wanted signal as interference and cancel it. That is <b>signal
cancellation</b>, and it is why naive minimum variance often looks worse than delay-and-sum on
real data.</p>

<p><b>Diagonal loading</b> is the standard mitigation: add a small amount to the diagonal of the
covariance matrix, which is equivalent to assuming a little white noise, and the solution moves
back towards delay-and-sum. The loading factor is a robustness knob, and choosing it well is most
of the practical difficulty.</p>

<p>The other family of methods is far simpler and often more useful. <b>Coherence factor</b>
weighting compares the coherent sum across the aperture with the incoherent sum. A real focus
gives contributions that are in phase, so the ratio is near one; clutter and off-axis energy give
contributions with scattered phase and a ratio near zero. Multiplying the beamformed value by
that ratio suppresses exactly what you want suppressed.</p>

<p>It costs almost nothing, needs no matrix inversion and no covariance estimate, and it is
robust. The cost is that it is a nonlinear weighting, so the resulting image amplitude is no
longer a straightforward measure of reflectivity, which matters if you intend to quantify rather
than to look.</p>

<p>That is the point worth remembering across all of these: adaptive and coherence-based methods
improve the appearance of an image considerably and break the linear relationship between
amplitude and reflectivity. For inspection where amplitude is the measurement, that trade needs
to be made deliberately.</p>
`,
quiz: [
{ q: "What does a minimum variance beamformer optimise?",
o: ["The total energy received", "Output power, subject to unit gain in the look direction", "The correlation between adjacent elements", "The width of the main lobe"],
a: 1, why: "That constraint lets it place nulls wherever the interference actually is, rather than wherever a fixed window happens to put them." },
{ q: "What is signal cancellation in adaptive beamforming?",
o: ["The wanted signal is treated as interference and nulled", "Two interferers cancel each other out", "The output falls to zero when the array is steered", "Adjacent elements cancel due to phase error"],
a: 1, why: "Any error in geometry, sound speed or element response breaks the steering vector assumption, which is why naive minimum variance often looks worse than delay-and-sum." },
{ q: "What does diagonal loading do?",
o: ["Increases the resolution of the beamformer", "Moves the solution back towards delay-and-sum for robustness", "Removes the need to estimate the covariance", "Compensates for element failures"],
a: 1, why: "It is equivalent to assuming a little white noise, and the loading factor is the robustness knob whose choice is most of the practical difficulty." },
{ q: "What does the coherence factor measure?",
o: ["The bandwidth of the received pulse", "The ratio of the coherent sum to the incoherent sum across the aperture", "The correlation between successive frames", "The signal to noise ratio at each element"],
a: 1, why: "A real focus gives in-phase contributions and a ratio near one, while clutter gives scattered phase and a ratio near zero." }
],
interview: {
q: "Would you use adaptive beamforming in an inspection system?",
a: "Cautiously, and I would want to be clear about what I am trading. The attraction of something like a minimum variance beamformer is that it chooses its weights from the data, so it places nulls on whatever is actually interfering rather than on directions I guessed at in advance, and the resolution improvement can be substantial. The problem is fragility: the formulation constrains unit gain in the assumed look direction, and any error in the array geometry, the sound speed or the element responses means part of the wanted signal no longer matches that steering vector, so the beamformer treats it as interference and cancels it. That signal cancellation is why naive minimum variance frequently looks worse than plain delay-and-sum on real data, and diagonal loading is the standard mitigation, which effectively assumes a little white noise and pulls the solution back towards delay-and-sum. Choosing that loading factor is most of the practical difficulty. In an inspection context I would more likely reach for coherence factor weighting instead, because it compares the coherent sum across the aperture against the incoherent sum, so a genuine focus with in-phase contributions scores near one and clutter with scattered phase scores near zero. It costs almost nothing, needs no covariance estimate or matrix inversion, and it is robust. The caveat I would raise for both, and it is the important one for inspection, is that these are nonlinear weightings, so the image amplitude stops being a straightforward measure of reflectivity. If the amplitude is my measurement, for sizing a defect against a reference reflector, then I would either not use them or I would characterise the effect carefully, because a prettier image that I can no longer quantify is not obviously an improvement."
}
},

{
id: "ac-arraydesign",
track: "Acoustics",
sub: "Array signal processing",
title: "Designing an array: pitch, aperture and element count",
mins: 20,
body: `
<p>Array design is a small number of coupled decisions, and each one is forced by something
physical rather than chosen freely. Working through them in order makes the result predictable
rather than a matter of taste.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The chain of array design decisions from frequency through pitch and aperture to element count and channel count">
<rect class="bx" x="24" y="30" width="632" height="38" rx="4"/>
<text class="th" x="40" y="55">frequency: set by penetration against resolution and by grain noise</text>
<rect class="bx" x="24" y="76" width="632" height="38" rx="4"/>
<text class="th" x="40" y="101">pitch: half a wavelength if steering, to avoid grating lobes</text>
<rect class="bx" x="24" y="122" width="632" height="38" rx="4"/>
<text class="th" x="40" y="147">aperture: set by the f-number you need at the working depth</text>
<rect class="bx" x="24" y="168" width="632" height="38" rx="4"/>
<text class="th" x="40" y="193">element count: aperture divided by pitch, which fixes the channels</text>
<rect class="bxa" x="24" y="214" width="632" height="34" rx="4"/>
<text class="th" x="40" y="237">and the channel count is what the system actually costs</text>
</svg>

<p><b>Frequency</b> comes first, because everything else scales with the wavelength. It is set by
the depth you need to reach against the resolution you need, and in a scattering material it is
set at least as much by grain noise, which rises as the fourth power of frequency.</p>

<p><b>Pitch</b> follows from the steering requirement. Half a wavelength avoids grating lobes at
any steering angle; a full wavelength is acceptable for a linear array that never steers. This is
the decision that drives cost, because halving the pitch doubles the elements for the same
aperture.</p>

<p><b>Aperture</b> follows from resolution at the working depth, since lateral resolution is
roughly the f-number times the wavelength and the f-number is depth divided by aperture. Note
that a larger aperture only helps if you can actually use it: elements at the edge see a target
at a steep angle, and element <b>directivity</b> means their contribution falls off, so beyond a
point adding width buys very little.</p>

<p>Those three fix the <b>element count</b>, and the element count fixes the channel count, which
is what the electronics actually cost. That is why a 2D array is such a step: a 32 by 32 array is
1024 channels, which is why sparse arrays, row-column addressing and micro-beamforming in the
probe head all exist.</p>

<p>Two further constraints bite in practice. Each element must be <b>small</b> relative to the
wavelength to radiate broadly enough to be steered, which sets the element width and therefore
its impedance and sensitivity. And elements that are tall and narrow have their own resonances
across the width, so the aspect ratio is chosen to keep those away from the operating band.</p>

<p>Finally, <b>calibration</b> is part of the design rather than an afterthought. Element-to-element
variation in sensitivity and phase degrades the beam exactly as a geometry error does, so the
design should include a way to measure and correct it, and a way to detect a dead element, because
a dead element in a beamformer is a permanent aperture error.</p>
`,
quiz: [
{ q: "What decision drives array cost most directly?",
o: ["The choice of piezoelectric material", "The pitch, since it fixes the element and channel count", "The aperture width alone", "The bandwidth of each element"],
a: 1, why: "Halving the pitch doubles the elements for the same aperture, and the channel count is what the electronics actually cost." },
{ q: "Why does a wider aperture eventually stop helping?",
o: ["The delays become too large to apply", "Element directivity means edge elements contribute little at steep angles", "The medium attenuates the outer paths more", "Grating lobes appear at wide apertures"],
a: 1, why: "Each element radiates over a limited angle, so beyond a point the extra width contributes almost nothing to the focus." },
{ q: "Why must each element be small relative to the wavelength?",
o: ["To reduce the array's total cost", "So it radiates broadly enough to be steered", "To increase its sensitivity", "To avoid heating during transmission"],
a: 1, why: "A large element is directional on its own, so it cannot contribute to a steered beam. That sets the element width and therefore its impedance." },
{ q: "Why does element calibration belong in the design?",
o: ["It is required by inspection standards", "Sensitivity and phase variation degrade the beam like a geometry error", "It reduces the number of channels needed", "It compensates for the coupling medium"],
a: 1, why: "A dead element is a permanent aperture error, so the design needs a way to measure, correct and detect element variation." }
],
interview: {
q: "Walk me through specifying an array for a new inspection application.",
a: "I would work through it in the order the physics forces, because each decision constrains the next. Frequency first, because everything scales with wavelength: it comes from the depth I need to reach against the resolution I need, and in a coarse-grained material it is set at least as much by grain noise, which rises as the fourth power of frequency, so there is an optimum rather than a monotonic improvement. Then pitch, which follows from whether I need to steer. Half a wavelength guarantees no grating lobes at any angle, and a full wavelength is fine for a linear array that never steers. That is the decision that drives cost, because halving the pitch doubles the element count for the same aperture. Then aperture, from the lateral resolution I need at the working depth, since resolution is roughly f-number times wavelength and the f-number is depth over aperture. I would check that the aperture is actually usable, because element directivity means the elements at the edge see the target at a steep angle and contribute very little, so past a point extra width buys almost nothing. Those three fix the element count and therefore the channel count, which is what the electronics actually cost, and that is why a two-dimensional array is such a step change, since thirty-two by thirty-two is over a thousand channels and drives you towards sparse arrays or micro-beamforming in the probe head. Two more constraints I would keep in mind: each element has to be small relative to the wavelength to radiate broadly enough to be steered, which sets its width and therefore its electrical impedance, and the element aspect ratio has to keep its lateral resonances out of the operating band. And I would build in calibration from the start, because element-to-element variation in phase and sensitivity degrades the beam exactly as a geometry error does, and a dead element is a permanent aperture error I need to be able to detect."
}
}

);
