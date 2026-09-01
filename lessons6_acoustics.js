// Acoustics lessons: modelling and inversion.
//
// The track had one lesson on inverse problems and nothing on how the forward
// model is actually computed. This covers choosing a modelling approach, the
// three numerical families in common use, full waveform inversion, and the
// discipline of validating a model against a measurement.

LESSONS.push(

{
id: "ac-modelling",
track: "Acoustics",
sub: "Modelling and inversion",
title: "Choosing a model: ray, analytic and numerical",
mins: 20,
body: `
<p>The most consequential modelling decision is which family to use, and it is made by comparing
the wavelength with the features of the problem. Getting that wrong wastes far more time than any
inefficiency inside the chosen method.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Three modelling families placed by the ratio of feature size to wavelength: ray methods for large features, full wave for comparable, analytic for idealised geometry">
<rect class="bx" x="24" y="30" width="200" height="180" rx="4"/>
<text class="th" x="40" y="58">ray</text>
<text class="ts" x="40" y="86">features much larger</text>
<text class="ts" x="40" y="108">than the wavelength</text>
<text class="th" x="40" y="146">very fast</text>
<text class="ts" x="40" y="176">no diffraction,</text>
<text class="ts" x="40" y="198">no interference</text>

<rect class="bx" x="240" y="30" width="200" height="180" rx="4"/>
<text class="th" x="256" y="58">full wave, numerical</text>
<text class="ts" x="256" y="86">features comparable</text>
<text class="ts" x="256" y="108">with the wavelength</text>
<text class="th" x="256" y="146">everything included</text>
<text class="ts" x="256" y="176">cost scales steeply</text>
<text class="ts" x="256" y="198">with frequency</text>

<rect class="bx" x="456" y="30" width="200" height="180" rx="4"/>
<text class="th" x="472" y="58">analytic</text>
<text class="ts" x="472" y="86">idealised geometry:</text>
<text class="ts" x="472" y="108">sphere, plate, piston</text>
<text class="th" x="472" y="146">exact and instant</text>
<text class="ts" x="472" y="176">only for shapes with</text>
<text class="ts" x="472" y="198">a closed-form solution</text>
</svg>

<p><b>Ray methods</b> treat the wave as travelling along paths, applying reflection, refraction
and geometric spreading. They are extremely fast, they scale to large domains, and they are the
right choice for something like predicting where a beam goes in a thick anisotropic weld. What
they cannot represent is diffraction, interference or anything happening at the scale of a
wavelength, so a ray model will confidently tell you nothing is behind a shadowing feature when
in reality the wave diffracts around it.</p>

<p><b>Full wave numerical methods</b> solve the wave equation on a grid or a mesh and include
everything by construction: diffraction, mode conversion, resonance, multiple scattering. The
cost is that the discretisation must resolve the wavelength, so halving the wavelength multiplies
the work by eight in three dimensions and again by two for the shorter time step. That scaling is
what decides whether a full wave model is feasible at your frequency.</p>

<p><b>Analytic solutions</b> exist for a small number of idealised cases: scattering from a
sphere or a cylinder, the field of a circular piston, a plane wave at a flat interface. They are
exact and instantaneous, and their real value is as a <b>reference</b>, because they are the only
thing that tells you whether your numerical model is right.</p>

<p>The practical workflow uses more than one. An analytic case first, to verify the numerical
implementation. A ray model to explore the parameter space cheaply and find the configurations
worth examining. A full wave model on those few configurations to get the answer. Reaching
straight for the most detailed method is a common way to spend a week computing something a ray
model would have ruled out in a minute.</p>

<p>The other question to settle early is <b>dimensionality</b>. A two-dimensional model is
enormously cheaper and gets the geometry of arrivals broadly right, and it gets the amplitudes
wrong, because spreading in two dimensions is not the same as in three. Using 2D to understand
behaviour and 3D to get numbers is a defensible split, provided you are explicit about it.</p>
`,
quiz: [
{ q: "What can a ray model not represent?",
o: ["Reflection at an interface", "Diffraction and interference", "Refraction between materials", "Geometric spreading"],
a: 1, why: "It will confidently report nothing behind a shadowing feature when in reality the wave diffracts around it, which is a dangerous failure in inspection." },
{ q: "How does full wave cost scale when the frequency doubles in 3D?",
o: ["It doubles", "By roughly a factor of sixteen", "By a factor of four", "It is unchanged if the domain is fixed"],
a: 1, why: "Eight times the grid points for the halved wavelength in three dimensions, and twice the time steps for stability, so the scaling decides feasibility." },
{ q: "What is the main practical value of an analytic solution?",
o: ["It covers realistic geometry cheaply", "It is the reference that tells you whether the numerical model is right", "It is faster than a ray model", "It handles anisotropy naturally"],
a: 1, why: "Scattering from a sphere or the field of a circular piston are exact, and verifying an implementation against them is what makes its other results credible." },
{ q: "What does a two-dimensional model get wrong?",
o: ["The arrival times", "The amplitudes, because spreading differs from three dimensions", "The reflection coefficients", "The mode conversion angles"],
a: 1, why: "Using 2D to understand behaviour and 3D to get numbers is defensible provided you are explicit that the amplitudes are not comparable." }
],
interview: {
q: "How do you decide what kind of acoustic model to build?",
a: "I compare the wavelength with the features of the problem, because that ratio decides which family of methods is valid. If everything of interest is much larger than the wavelength, a ray model is appropriate and enormously cheaper: it applies reflection, refraction and geometric spreading along paths, scales to large domains, and is the right tool for something like predicting where a beam goes in a thick anisotropic weld. What it cannot do is diffraction or interference, so it will confidently tell me nothing is behind a shadowing feature when in reality the wave diffracts around it, and in an inspection context that is a dangerous failure mode. If the features are comparable with the wavelength then I need a full wave method, which solves the wave equation on a grid or mesh and includes diffraction, mode conversion and multiple scattering by construction. The thing I would work out before committing is the cost scaling, because the discretisation has to resolve the wavelength, so doubling the frequency is eight times the grid in three dimensions and twice the time steps, which is a factor of sixteen and often decides feasibility on its own. And I would look for an analytic case, scattering from a sphere or the field of a circular piston, not because it models my problem but because it is the only thing that tells me my numerical implementation is correct. In practice I would use all three: analytic to verify the code, ray to explore the parameter space cheaply and find the few configurations worth examining, and full wave on those. Going straight to the most detailed method is a good way to spend a week computing something a ray model would have ruled out in a minute."
}
},

{
id: "ac-fdtd",
track: "Acoustics",
sub: "Modelling and inversion",
title: "Finite difference in time: the workhorse",
mins: 22,
body: `
<p>Finite difference time domain methods discretise the domain onto a regular grid and step the
field forward in time. They are simple to implement, they parallelise almost trivially, and they
are the default for a great many wave propagation problems for exactly those reasons.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A staggered grid with pressure at cell centres and velocity components on the faces, and the stability and dispersion constraints">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">staggered grid: pressure at centres, velocity on the faces</text>

<line class="ln" x1="120" y1="90" x2="420" y2="90"/>
<line class="ln" x1="120" y1="150" x2="420" y2="150"/>
<line class="ln" x1="120" y1="210" x2="420" y2="210"/>
<line class="ln" x1="120" y1="90" x2="120" y2="210"/>
<line class="ln" x1="270" y1="90" x2="270" y2="210"/>
<line class="ln" x1="420" y1="90" x2="420" y2="210"/>
<circle class="dot" cx="195" cy="120" r="5"/>
<circle class="dot" cx="345" cy="120" r="5"/>
<circle class="dot" cx="195" cy="180" r="5"/>
<circle class="dot" cx="345" cy="180" r="5"/>
<text class="ts" x="440" y="112">pressure at the dots</text>
<text class="ts" x="440" y="144">velocity on the edges</text>

<text class="th" x="120" y="240">two constraints: points per wavelength, and the CFL time step</text>
</svg>

<p>The <b>staggered grid</b> is the standard arrangement: pressure at cell centres, particle
velocity components on the cell faces. Staggering both in space and in time gives second-order
accuracy from first-order differences and is why the scheme behaves as well as it does.</p>

<p>Two constraints govern everything. The first is <b>spatial sampling</b>: you need enough grid
points per wavelength, typically eight to ten for a second-order scheme, or the numerical
dispersion becomes severe. Numerical dispersion means the model's wave speed depends on
frequency, so a pulse spreads as it propagates for purely numerical reasons and arrival times
drift with distance.</p>

<p>The second is the <b>CFL condition</b>: information must not cross more than one cell per time
step, so the time step is bounded by the cell size divided by the fastest wave speed. That
coupling is why refining the grid costs more than it first appears, since halving the cell size
also halves the time step.</p>

<p><b>Boundaries</b> are the other implementation concern. A domain has to end somewhere, and a
naive truncation reflects everything back into the model. A perfectly matched layer absorbs
outgoing waves over a graded region and is the standard answer, and getting it wrong shows up as
spurious echoes arriving from the edges of your model.</p>

<p>The strengths are that it handles heterogeneous media naturally, since every cell can have its
own properties, and that it scales well across cores and GPUs because the update is local. The
weakness is <b>geometry</b>: a regular grid represents a curved or angled interface as a
staircase, which scatters spuriously. That is the main reason to reach for finite elements
instead.</p>

<p>The practical discipline is convergence testing. Halve the grid spacing and see whether the
answer changes materially. If it does, you have not converged and the result is a property of your
discretisation rather than of the physics.</p>
`,
quiz: [
{ q: "What is the purpose of a staggered grid?",
o: ["It reduces the memory required", "Second-order accuracy from first-order differences", "It allows a larger time step", "It simplifies the boundary conditions"],
a: 1, why: "Pressure at cell centres and velocity on the faces, staggered in time as well, is why the scheme behaves as well as it does." },
{ q: "What does insufficient grid resolution cause?",
o: ["Instability and immediate blow-up", "Numerical dispersion, so the wave speed depends on frequency", "Spurious reflections from the boundaries", "Loss of energy conservation"],
a: 1, why: "A pulse spreads as it propagates for purely numerical reasons and arrival times drift with distance, which is easily mistaken for physical dispersion." },
{ q: "Why does halving the grid spacing cost more than a factor of eight in 3D?",
o: ["The boundary layer must also be refined", "The CFL condition halves the time step as well", "Memory access becomes less efficient", "The source must be resampled"],
a: 1, why: "The time step is bounded by cell size over wave speed, so the grid and the step are coupled and the total cost goes as sixteen." },
{ q: "What is the main weakness of a regular finite difference grid?",
o: ["It cannot handle heterogeneous media", "Curved interfaces become staircases that scatter spuriously", "It does not parallelise well", "It cannot model absorption"],
a: 1, why: "Heterogeneity is easy since each cell has its own properties, and the update is local so it parallelises well. Geometry is what drives people to finite elements." }
],
interview: {
q: "You are setting up a finite difference model of an ultrasonic measurement. What do you check?",
a: "Three things before I trust any output. First the spatial sampling, because I need enough grid points per wavelength at the highest frequency in my source, typically eight to ten for a second-order scheme, and if I have too few then numerical dispersion means the model's wave speed depends on frequency, so pulses spread as they propagate and arrival times drift with distance. That is particularly insidious because it looks like physical dispersion. I would compute the requirement from the shortest wavelength in the problem, which means the slowest material at the top of the source bandwidth, not the nominal centre frequency. Second the time step, from the CFL condition, since information must not cross more than one cell per step, so the step is bounded by cell size over the fastest wave speed in the domain. That coupling is why refining the grid costs more than it looks: halving the cells is eight times the points in three dimensions and twice the steps, so sixteen times the work. Third the boundaries, because the domain has to end somewhere and a naive truncation reflects everything back in. I would use a perfectly matched layer and then explicitly check for spurious arrivals from the edges, because a badly configured absorbing layer produces echoes that look like real reflections from the sample. Beyond setup, the discipline that matters is convergence testing: halve the grid and see whether the answer changes materially, because if it does then what I am looking at is a property of my discretisation rather than of the physics. And I would verify the whole implementation against an analytic case first, something like scattering from a sphere, because that is the only thing that tells me the code is right rather than merely converged."
}
},

{
id: "ac-fe",
track: "Acoustics",
sub: "Modelling and inversion",
title: "Finite element: when geometry and coupling matter",
mins: 20,
body: `
<p>Finite element methods use an unstructured mesh of elements that can be shaped to fit the
geometry. That single difference is why they are chosen over finite differences, and it brings
both the capability and the cost.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="A regular grid staircasing a curved boundary, against an unstructured mesh conforming to it">
<rect class="bxa" x="24" y="24" width="308" height="34" rx="4"/>
<text class="th" x="40" y="47">regular grid</text>
<rect class="bx" x="24" y="70" width="308" height="150" rx="4"/>
<text class="ts" x="40" y="100">a curved boundary becomes</text>
<text class="ts" x="40" y="124">a staircase</text>
<text class="th" x="40" y="164">the steps scatter</text>
<text class="ts" x="40" y="192">spuriously</text>

<rect class="bxa" x="348" y="24" width="308" height="34" rx="4"/>
<text class="th" x="364" y="47">unstructured mesh</text>
<rect class="bx" x="348" y="70" width="308" height="150" rx="4"/>
<text class="ts" x="364" y="100">elements conform to the</text>
<text class="ts" x="364" y="124">actual shape</text>
<text class="th" x="364" y="164">and refine only where</text>
<text class="ts" x="364" y="192">the detail is</text>
</svg>

<p>The <b>conforming mesh</b> is the point. A curved transducer face, a crack at an angle, a
composite ply boundary or a threaded joint can be represented as they actually are, rather than
as a staircase whose steps scatter energy that is not physically there. The mesh can also be
refined locally, so fine elements go where the detail is and coarse ones elsewhere.</p>

<p>The second reason to choose finite elements is <b>multiphysics coupling</b>. Piezoelectric
behaviour is a coupled electrical and mechanical problem, and finite element codes solve it
directly, which is why transducer design beyond a one-dimensional stack model happens there. It
is how you predict lateral modes, crosstalk between array elements, and the effect of the
housing.</p>

<p>The costs are real. Meshing a complicated geometry is genuinely difficult and often the
largest part of the work. Element quality matters: badly shaped elements degrade accuracy and can
prevent convergence entirely. And an implicit time-stepping scheme solves a large system every
step, which is far more expensive per step than an explicit finite difference update, though it
may permit a larger step.</p>

<p>For wave propagation specifically, <b>explicit</b> time stepping with a lumped mass matrix is
common, because it avoids solving a system each step and behaves much like finite difference
while keeping the conforming mesh. That combination is what makes finite element practical for
transient ultrasonic problems.</p>

<p>The sampling requirement is the same in spirit: elements per wavelength rather than grid
points, with the count depending on the element order, since higher-order elements need fewer per
wavelength but cost more each. The convergence check is also the same: refine the mesh and
confirm the answer stops moving.</p>

<p>The honest summary is that finite differences win on cost and simplicity for large,
heterogeneous, geometrically simple domains, and finite elements win where the geometry is
complicated or where the physics is coupled. Most serious modelling work uses both.</p>
`,
quiz: [
{ q: "What is the main advantage of an unstructured mesh?",
o: ["It uses less memory", "Elements conform to the real geometry rather than staircasing it", "It permits a larger time step", "It handles heterogeneity better"],
a: 1, why: "Staircase steps scatter energy that is not physically there, and a conforming mesh also allows refinement only where the detail is." },
{ q: "Why is transducer design done in finite element rather than finite difference?",
o: ["It is faster for small domains", "It solves the coupled electrical and mechanical problem directly", "It does not require a mesh", "It handles absorbing boundaries better"],
a: 1, why: "That coupling is how you predict lateral modes, crosstalk between array elements and the effect of the housing, which a stack model cannot see." },
{ q: "Why is explicit time stepping common for wave propagation in finite element?",
o: ["It permits much larger time steps", "It avoids solving a large system every step", "It is more accurate than implicit stepping", "It removes the need for a mass matrix"],
a: 1, why: "With a lumped mass matrix it behaves much like finite difference while keeping the conforming mesh, which is what makes it practical for transient problems." },
{ q: "What is often the largest part of the work in a finite element model?",
o: ["Choosing the time step", "Meshing the geometry to adequate quality", "Setting the material properties", "Post-processing the results"],
a: 1, why: "Badly shaped elements degrade accuracy and can prevent convergence entirely, so mesh quality is a first-class concern rather than a detail." }
],
interview: {
q: "When would you use finite element rather than finite difference for an acoustic problem?",
a: "Two situations. The first is when geometry matters. A regular grid represents a curved or angled boundary as a staircase, and those steps scatter energy that is not physically there, so if I am modelling a curved transducer face, an angled crack, a ply boundary in a composite or anything with real shape, I want a mesh that conforms to it. A conforming mesh also lets me refine locally, putting small elements where the detail is and coarse ones elsewhere, which finite difference cannot do without more elaborate machinery. The second is when the physics is coupled. Piezoelectric behaviour is an electrical and mechanical problem solved together, and finite element codes do that directly, which is why anything beyond a one-dimensional stack model happens there: lateral modes in an element, crosstalk between array elements, the influence of the housing. Against that, finite difference is simpler, cheaper per degree of freedom, handles heterogeneous media trivially since every cell can carry its own properties, and parallelises almost perfectly because the update is local. So for a large heterogeneous domain with simple geometry, like propagation through a block of material, I would use finite difference. The costs of finite element that I would plan for are meshing, which is often the biggest single piece of work and where element quality directly affects whether the solution converges at all, and the per-step expense if I use implicit time stepping, which is why for transient wave problems explicit stepping with a lumped mass matrix is common. In practice serious modelling uses both, and I would verify either against an analytic case before believing it."
}
},

{
id: "ac-kspace",
track: "Acoustics",
sub: "Modelling and inversion",
title: "k-space and pseudospectral methods",
mins: 20,
body: `
<p>Finite differences approximate a spatial derivative from a handful of neighbouring points.
Pseudospectral methods compute it from <i>every</i> point, by transforming to the spatial
frequency domain, multiplying by the wavenumber, and transforming back. That is exact for a
bandlimited field, and it changes the economics of the whole simulation.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="A finite difference derivative from a local stencil against a spectral derivative computed from the whole field via transforms">
<rect class="bxa" x="24" y="24" width="308" height="34" rx="4"/>
<text class="th" x="40" y="47">finite difference</text>
<rect class="bx" x="24" y="70" width="308" height="150" rx="4"/>
<text class="ts" x="40" y="100">derivative from a few</text>
<text class="ts" x="40" y="124">neighbouring points</text>
<text class="th" x="40" y="164">8 to 10 points</text>
<text class="th" x="40" y="188">per wavelength</text>

<rect class="bxa" x="348" y="24" width="308" height="34" rx="4"/>
<text class="th" x="364" y="47">pseudospectral</text>
<rect class="bx" x="348" y="70" width="308" height="150" rx="4"/>
<text class="ts" x="364" y="100">derivative from every point</text>
<text class="ts" x="364" y="124">via forward and inverse FFT</text>
<text class="th" x="364" y="164">about 2 points</text>
<text class="th" x="364" y="188">per wavelength</text>
</svg>

<p>The consequence is dramatic. Where a finite difference scheme needs eight to ten points per
wavelength to keep numerical dispersion acceptable, a pseudospectral scheme needs about two,
which is the Nyquist limit. In three dimensions that is a memory and compute reduction of
roughly two orders of magnitude for the same accuracy, which frequently decides whether a problem
is tractable at all.</p>

<p>The <b>k-space</b> variant goes further by using a correction factor derived from the exact
solution for a homogeneous medium, which removes most of the remaining time-stepping error and
allows a substantially larger time step than the CFL bound would suggest. That is what makes
these methods so attractive for large three-dimensional ultrasound problems, and it is the basis
of widely used simulation toolboxes.</p>

<p>The costs follow from the global transform. It is <b>global</b>, so the method assumes
periodicity, which means an absorbing layer is essential to stop energy wrapping around from one
side of the domain to the other. It also parallelises less trivially than a local stencil, since
an FFT needs communication across the whole domain rather than between neighbours.</p>

<p>The other limitation is <b>sharp discontinuities</b>. A step change in properties is not
bandlimited, so representing it with a truncated spectrum produces Gibbs ringing around the
interface. Smoothing the material properties over a cell or two is the usual remedy, and it means
these methods are happiest with smoothly varying media and less comfortable with hard-edged
geometry.</p>

<p>That gives a clean division. For large, smoothly varying, three-dimensional domains, which is
exactly what tissue or a water tank looks like, k-space methods are usually the right choice. For
hard-edged geometry and coupled physics, finite element remains better. And for something simple
and enormous, finite difference is still hard to beat on implementation effort.</p>
`,
quiz: [
{ q: "How does a pseudospectral method compute a spatial derivative?",
o: ["From a wider finite difference stencil", "By transforming, multiplying by the wavenumber, and transforming back", "By fitting a polynomial locally", "By integrating along characteristics"],
a: 1, why: "It uses every point in the domain rather than a local stencil, which is exact for a bandlimited field." },
{ q: "How many points per wavelength does a pseudospectral scheme need?",
o: ["Eight to ten, as for finite difference", "About two, the Nyquist limit", "About four", "It depends on the time step"],
a: 1, why: "In three dimensions that is roughly two orders of magnitude less memory and compute for the same accuracy, which often decides feasibility." },
{ q: "Why is an absorbing layer essential in a k-space model?",
o: ["The scheme is unstable without one", "The global transform assumes periodicity, so energy wraps around", "The time step would otherwise be too small", "Reflections from sources would dominate"],
a: 1, why: "Energy leaving one side of the domain reappears on the other, which produces arrivals that look entirely plausible and are artefacts." },
{ q: "What are these methods least comfortable with?",
o: ["Large three-dimensional domains", "Sharp discontinuities in material properties", "Broadband sources", "Absorbing media"],
a: 1, why: "A step change is not bandlimited, so a truncated spectrum gives Gibbs ringing, and smoothing properties over a cell or two is the usual remedy." }
],
interview: {
q: "Why would you choose a k-space method over finite difference for a large 3D ultrasound simulation?",
a: "Almost entirely because of the sampling requirement. A finite difference scheme computes spatial derivatives from a local stencil, and to keep numerical dispersion acceptable it needs something like eight to ten points per wavelength. A pseudospectral method computes the derivative from every point in the domain, by transforming, multiplying by the wavenumber and transforming back, which is exact for a bandlimited field, so it needs about two points per wavelength, which is the Nyquist limit. In three dimensions that ratio cubed is roughly two orders of magnitude less memory and compute for the same accuracy, and for a large domain that is frequently the difference between a simulation that fits on the hardware I have and one that does not. The k-space variant adds a correction derived from the exact homogeneous solution, which removes most of the remaining time-stepping error and permits a much larger step than the CFL bound would allow, so it compounds the saving. What I would design around are the two costs. The transform is global, so the method assumes periodicity and energy leaving one side of the domain reappears on the other, which means a properly configured absorbing layer is not optional and I would explicitly check for wrap-around arrivals, because they look entirely plausible. And it is unhappy with sharp discontinuities, since a step change in properties is not bandlimited and a truncated spectrum gives Gibbs ringing around the interface, so material properties usually get smoothed over a cell or two. That makes it an excellent fit for smoothly varying media like tissue or water, and a poor one for hard-edged geometry, where I would go to finite element instead."
}
},

{
id: "ac-fwi",
track: "Acoustics",
sub: "Modelling and inversion",
title: "Full waveform inversion",
mins: 24,
body: `
<p>Most ultrasonic inversion uses a small part of the recorded data: an arrival time, a peak
amplitude. Full waveform inversion uses all of it. It treats reconstruction as an optimisation:
adjust a model of the medium until the waveforms it predicts match the waveforms you measured.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="The inversion loop: forward model, compare with measured data, compute the gradient by an adjoint simulation, update the model, repeat">
<rect class="bx" x="40" y="40" width="150" height="56" rx="4"/>
<text class="ts" x="56" y="66">model of the</text>
<text class="ts" x="56" y="86">medium</text>
<line class="ln" x1="190" y1="68" x2="250" y2="68"/>
<rect class="bx" x="250" y="40" width="150" height="56" rx="4"/>
<text class="ts" x="266" y="66">forward</text>
<text class="ts" x="266" y="86">simulation</text>
<line class="ln" x1="400" y1="68" x2="460" y2="68"/>
<rect class="bx" x="460" y="40" width="180" height="56" rx="4"/>
<text class="ts" x="476" y="66">compare with</text>
<text class="ts" x="476" y="86">measured data</text>

<line class="ln" x1="550" y1="96" x2="550" y2="140"/>
<rect class="bx" x="380" y="140" width="260" height="56" rx="4"/>
<text class="ts" x="396" y="166">gradient, from ONE adjoint</text>
<text class="ts" x="396" y="186">simulation of the residual</text>

<line class="ln" x1="380" y1="168" x2="115" y2="168"/>
<line class="ln" x1="115" y1="168" x2="115" y2="96"/>
<text class="ts" x="150" y="222">update the model and repeat</text>
</svg>

<p>The reason it is feasible at all is the <b>adjoint method</b>. Computing the gradient of the
misfit with respect to every parameter in the model looks impossibly expensive, since a model may
have millions of parameters. The adjoint state method gets the whole gradient for the cost of
about two forward simulations, independent of the parameter count, by back-propagating the
residual through the medium and correlating it with the forward field.</p>

<p>What FWI buys is <b>quantitative</b> reconstruction. Rather than an image of where echoes came
from, you get a map of the actual physical property, sound speed or attenuation, with a resolution
that can approach half a wavelength rather than the ray-based limit. In medical ultrasound
tomography and in geophysics that is the difference between a picture and a measurement.</p>

<p>The central difficulty is <b>cycle skipping</b>. The misfit function is highly non-convex, and
if the starting model is wrong enough that predicted and observed waveforms differ by more than
half a period, the gradient points towards matching the wrong cycle. The optimisation then
converges confidently to a wrong answer, and it looks converged.</p>

<p>The standard defence is a <b>multiscale</b> strategy: invert the lowest frequencies first,
where a half period is long and cycle skipping is much harder to trigger, then use that result as
the starting model for progressively higher frequencies. That requires low-frequency data to
exist, which is a constraint on the acquisition rather than on the algorithm.</p>

<p>The other requirements are demanding and worth stating plainly. You need an accurate
<b>source signature</b>, because the inversion will otherwise absorb the error into the model.
You need good <b>geometry</b>, since element positions enter every travel time. And you need wide
<b>angular coverage</b>, because the range of angles determines which spatial frequencies of the
model are constrained at all.</p>

<p>Regularisation is therefore not optional. The problem is ill-posed, so smoothness or sparsity
priors keep the solution physical, and the weight given to them is a real choice with a real
effect on what the result looks like. Reporting an FWI result without stating the regularisation
is reporting half the answer.</p>
`,
quiz: [
{ q: "What makes full waveform inversion computationally feasible?",
o: ["It uses only the first arrivals", "The adjoint method gives the whole gradient for about two simulations", "The forward model is linearised", "The parameter count is kept small"],
a: 1, why: "Back-propagating the residual and correlating with the forward field gives the gradient with respect to every parameter, independent of how many there are." },
{ q: "What is cycle skipping?",
o: ["Losing samples during acquisition", "Converging to match the wrong cycle because the start model is too far off", "Skipping frequencies in a multiscale inversion", "The optimiser missing an iteration"],
a: 1, why: "If predicted and observed waveforms differ by more than half a period, the gradient points the wrong way and the result looks converged while being wrong." },
{ q: "Why does a multiscale strategy start at low frequency?",
o: ["Low frequencies penetrate further", "A half period is longer, so cycle skipping is much harder to trigger", "The forward model is cheaper at low frequency", "Attenuation is lower at low frequency"],
a: 1, why: "The low-frequency result then becomes the starting model for higher frequencies, which requires the low-frequency data to have been acquired." },
{ q: "Why is regularisation not optional in FWI?",
o: ["It speeds up the convergence", "The problem is ill-posed, so priors keep the solution physical", "It removes the need for an accurate source signature", "It compensates for limited angular coverage"],
a: 1, why: "The weight given to it materially changes the result, so reporting an inversion without stating the regularisation is reporting half the answer." }
],
interview: {
q: "Explain full waveform inversion and what makes it difficult.",
a: "It treats reconstruction as an optimisation over the whole recorded waveform rather than over a picked feature like an arrival time. I have a model of the medium, I run a forward simulation to predict what I would have recorded, I compare that against the real data, and I update the model to reduce the misfit, iterating. What makes it tractable is the adjoint method, because computing the gradient with respect to millions of model parameters by finite differences would be impossible, whereas the adjoint state method gets the entire gradient for the cost of roughly two forward simulations, independent of the parameter count, by back-propagating the residual through the medium and correlating it with the forward field. What it buys is a quantitative map of a physical property, sound speed or attenuation, at a resolution approaching half a wavelength, rather than an image of where echoes came from, and that is the difference between a picture and a measurement. The central difficulty is cycle skipping. The misfit is strongly non-convex, and if my starting model is wrong enough that the predicted and observed waveforms are more than half a period apart, the gradient pushes towards matching the wrong cycle and the optimisation converges confidently to a wrong answer that looks converged. The standard defence is multiscale inversion, starting at the lowest frequencies where a half period is long, then using that as the starting model for higher frequencies, and that puts a requirement on the acquisition rather than the algorithm, because the low-frequency data has to exist. Beyond that it is demanding about the source signature, since any error there gets absorbed into the model, about the geometry, since element positions enter every travel time, and about angular coverage, which determines which spatial frequencies are constrained at all. And because the problem is ill-posed, regularisation is not optional and its weight materially changes the answer, so it has to be reported alongside the result."
}
},

{
id: "ac-validate",
track: "Acoustics",
sub: "Modelling and inversion",
title: "Validating a model against a measurement",
mins: 20,
body: `
<p>A model that has not been validated is a hypothesis. Validation is what turns it into
evidence, and it is a separate activity from making the model run or making it converge.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Three separate questions: verification that the code solves the equations, convergence that the discretisation is fine enough, and validation that the equations describe reality">
<rect class="bx" x="24" y="30" width="632" height="52" rx="4"/>
<text class="th" x="40" y="54">verification: does the code solve the equations correctly?</text>
<text class="ts" x="40" y="74">check against an analytic solution</text>
<rect class="bx" x="24" y="92" width="632" height="52" rx="4"/>
<text class="th" x="40" y="116">convergence: is the discretisation fine enough?</text>
<text class="ts" x="40" y="136">halve the grid and see whether the answer moves</text>
<rect class="bx" x="24" y="154" width="632" height="52" rx="4"/>
<text class="th" x="40" y="178">validation: do the equations describe the real experiment?</text>
<text class="ts" x="40" y="198">compare against a measurement you trust</text>
<text class="th" x="40" y="234">all three are different questions, and all three are necessary</text>
</svg>

<p>The three are routinely conflated. <b>Verification</b> asks whether the code solves the
equations it claims to, and the only clean way to answer it is against an analytic solution:
scattering from a sphere, the field of a circular piston, reflection at a plane interface.
<b>Convergence</b> asks whether the discretisation is fine enough, and is answered by refining
until the answer stops moving. <b>Validation</b> asks whether those equations describe the
experiment, and only a measurement can answer that.</p>

<p>For the comparison itself, the most common mistake is to compare only what is easy. Arrival
times agreeing tells you the velocity model is roughly right and almost nothing else. A real
comparison looks at the full waveform: the shape of the pulse, the relative amplitudes of
multiple arrivals, the mode-converted signals, and how all of it changes as you move the
transducer.</p>

<p>Amplitude is where models and measurements usually part company, and it is worth knowing why
before you start. The model does not know your transducer's true sensitivity, its exact beam
profile, the electronics' frequency response, or the coupling. The honest approach is to compare
<b>relative</b> amplitudes, or to calibrate the model against one measured configuration and then
predict a different one, which is a far stronger test than fitting the one you calibrated on.</p>

<p>When they disagree, resist the urge to tune. It is always possible to adjust an attenuation or
a velocity until the curves overlay, and a model tuned to match one measurement predicts nothing.
The productive move is to find which single assumption is wrong, and the way to do that is to
simplify the experiment until the model and the measurement agree, then add complexity back one
element at a time.</p>

<p>Finally, record what was compared and how well. A statement that the model agrees is not
useful; a statement that arrival times agree within two percent and peak amplitudes within three
decibels over this range of angles is something another person can rely on, and is what makes the
model reusable rather than personal.</p>
`,
quiz: [
{ q: "What does verification, as distinct from validation, ask?",
o: ["Whether the model matches the experiment", "Whether the code solves the equations correctly", "Whether the mesh is fine enough", "Whether the material properties are right"],
a: 1, why: "It is answered against an analytic solution. Validation asks whether those equations describe reality, and only a measurement answers that." },
{ q: "Why is comparing arrival times alone insufficient?",
o: ["Arrival times cannot be measured accurately", "It only tells you the velocity model is roughly right", "Timing errors cancel over multiple arrivals", "Arrival times are insensitive to geometry"],
a: 1, why: "A real comparison looks at pulse shape, relative amplitudes of multiple arrivals, mode conversions, and how they change as the transducer moves." },
{ q: "Why do model and measurement usually disagree on amplitude?",
o: ["Numerical dispersion attenuates the model", "The model does not know the transducer sensitivity, beam profile or coupling", "Measurements are always noisier", "Absorbing boundaries remove energy"],
a: 1, why: "Comparing relative amplitudes, or calibrating on one configuration and predicting a different one, is the honest approach." },
{ q: "What should you do when a model and a measurement disagree?",
o: ["Tune the attenuation until they overlay", "Simplify the experiment until they agree, then add complexity back", "Refine the mesh until the difference disappears", "Report the discrepancy as measurement uncertainty"],
a: 1, why: "A model tuned to match one measurement predicts nothing. Isolating which single assumption is wrong is what makes the model useful." }
],
interview: {
q: "How would you validate an acoustic model against experimental data?",
a: "I would keep three questions separate, because they get conflated constantly. Verification asks whether my code solves the equations it claims to, and the clean way to answer that is against an analytic solution, something like scattering from a sphere or the field of a circular piston, where I know the right answer independently. Convergence asks whether my discretisation is fine enough, and that is a refinement study: halve the grid and see whether the result moves materially. Only then does validation make sense, which asks whether those equations describe my actual experiment, and only a measurement answers that. For the comparison itself I would avoid the common trap of comparing only what is easy. Arrival times agreeing tells me the velocity model is roughly right and very little else, so I would compare the full waveform: pulse shape, the relative amplitudes of multiple arrivals, any mode-converted signals, and crucially how all of that changes as I move the transducer, because a model that matches at one position and not at others is telling me something specific. On amplitude I would set expectations early, because the model does not know my transducer's true sensitivity, its exact beam profile, the electronics' response or the coupling, so absolute amplitude agreement is not a reasonable target. I would compare relative amplitudes, or calibrate the model on one configuration and then predict a different one, which is a much stronger test than fitting the configuration I calibrated on. When they disagree I would resist tuning, because I can always adjust an attenuation until the curves overlay and a model tuned that way predicts nothing; instead I would simplify the experiment until they do agree and add complexity back one element at a time. And I would write down what was compared and to what tolerance, because agrees is not a result whereas arrival times within two percent and amplitudes within three decibels over this angular range is something someone else can rely on."
}
}

);
