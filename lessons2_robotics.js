// Robotics track lessons (batch 2). Same shape as data.js LESSONS entries.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "rob-manip",
track: "Robotics",
title: "Manipulators and grasping basics",
mins: 28,
body: `
<p>A serial manipulator is a chain of rigid links joined by actuated joints, almost
always revolute in practice, running from a fixed base to an end-effector. The standard
anatomy vocabulary is worth owning: the first three joints (shoulder and elbow) mostly
set the wrist position, the last three set orientation, and if those last three axes
intersect at a point you have a spherical wrist, which decouples position from
orientation and makes the inverse kinematics tractable in closed form. Six joints are
the minimum for arbitrary pose in space; a pick-and-place arm over a flat bench often
gets away with four.</p>
<h3>Reachable vs dexterous workspace</h3>
<p>The reachable workspace is every point the tool can touch in at least one
orientation. The dexterous workspace is every point it can touch in all orientations,
and it is dramatically smaller, often a modest kidney-shaped region in the middle of
the reach envelope. This is the practical design lever: mount the task in the dexterous
sweet spot, not at the edge of reach where the arm is stretched, weak and
orientation-poor. On a desktop 5-DOF arm the dexterous workspace for arbitrary tool
pitch can be nearly empty, which is why such arms approach everything from above.</p>
<h3>Inverse kinematics has several answers</h3>
<p>Forward kinematics is a function; inverse kinematics is not. A 6R arm with a
spherical wrist typically has up to eight distinct joint configurations for one tool
pose: elbow up or down, shoulder left or right, wrist flipped or not. A numerical IK
solver just converges to whichever solution is nearest its seed. The engineering
content is in choosing between solutions: keep continuity along a path so the arm does
not suddenly flip its elbow mid-move, respect joint limits, and prefer configurations
that stay away from singularities. Path planning across a solution-branch change is a
classic source of the arm sweeping wildly through space between two nearby poses.</p>
<h3>Singularities, practically</h3>
<p>At a singular configuration the Jacobian loses rank: some Cartesian direction
becomes unreachable instantaneously, and near it, modest tool velocities demand
enormous joint velocities. You feel this as the wrist spinning frantically while the
tool barely moves. The common ones are the wrist singularity (two wrist axes aligned),
the boundary singularity (arm at full stretch) and the shoulder singularity (wrist
directly above the base axis). Practical defences: damped least squares in the IK so
commanded joint rates stay bounded at the cost of small tracking error, workspace
placement that avoids the singular regions, and speed limits that scale down as
manipulability drops.</p>
<h3>End-effectors and compliance</h3>
<p>Grasping succeeds through tolerance of error, not precision. Parallel-jaw grippers
are the default because they self-centre the part; underactuated fingers wrap and
conform without sensing; suction wins on flat sealed surfaces. The deeper idea is
compliance: a stiff position-controlled arm meeting a rigid world generates huge forces
from tiny position errors, so something must give. Options in ascending cost: rubber
pads and sprung fingers (passive compliance), a remote centre compliance wrist for
peg-in-hole, current-limited or series-elastic actuation, and full force control. On a
hobby-servo gripper the plastic flex you did not design is doing this job for you,
which is why the cheap gripper sometimes outperforms the rigid one.</p>`,
quiz: [
{ q: "The dexterous workspace of an arm is the set of points it can reach:",
o: ["In at least one orientation", "Without moving the shoulder", "In all tool orientations", "At maximum speed"],
a: 2, why: "Reachable workspace needs only one attainable orientation per point; dexterous demands all orientations, so it is a much smaller region." },
{ q: "How many distinct IK solutions does a typical 6R arm with a spherical wrist have for one tool pose?",
o: ["Up to eight", "Exactly one", "Always two", "Infinitely many in general"],
a: 0, why: "Elbow up/down, shoulder left/right and wrist flip combine to give up to eight discrete configurations. Redundant 7-DOF arms are the ones with infinite solutions." },
{ q: "Near a singularity, the practical symptom is:",
o: ["The arm loses power", "Small tool velocities demand very large joint velocities", "The encoders drift", "Gravity compensation fails"],
a: 1, why: "The Jacobian is nearly rank-deficient, so its inverse blows up: the wrist whips while the tool barely moves." },
{ q: "The main reason to add compliance at the gripper is:",
o: ["To increase grip force", "To reduce servo current", "To make the fingers lighter", "To tolerate position error during contact without generating large forces"],
a: 3, why: "A stiff arm meeting a rigid world turns millimetres of error into large forces; compliance absorbs the mismatch and lets grasps self-align." }
],
interview: {
q: "Your 6-DOF arm stutters and the wrist overspeeds whenever the tool moves in a straight line through the middle of the workspace. Diagnose and fix.",
a: "That is the signature of passing near a wrist singularity: two wrist axes are close to aligned, the Jacobian is nearly singular, and the IK is demanding huge wrist rates to hold tool orientation while position moves. I would confirm by logging manipulability or the smallest singular value along the path and watching it collapse at the stutter point. Fixes in order of preference: reshape the path or reorient the task so the trajectory avoids the singular region; if I cannot, switch the IK to damped least squares so joint rates stay bounded and accept a small transient orientation error; and cap joint velocities with a scale factor tied to manipulability. I would also check the planner is not hopping between IK solution branches, which produces similar violence."
}
},

{
id: "rob-dynamics",
track: "Robotics",
title: "Dynamics and motor sizing",
mins: 28,
body: `
<p>Motor sizing starts with the most useful equation in robotics: torque equals inertia
times angular acceleration. Before any catalogue browsing, write down the moving
inertia, the acceleration the motion profile actually needs, and the gravity and
friction torques on top. Most sizing errors are not in the multiplication; they are in
forgetting one of the four terms, usually friction, or in using peak numbers where
average ones belong and vice versa.</p>
<h3>Reflected inertia through gearing</h3>
<p>A gearbox with ratio N transforms torque up by N and speed down by N, so load
inertia seen at the motor shaft is divided by N squared. That square is the whole game.
A 100:1 reduction makes a heavy leg look ten thousand times lighter to the motor, which
is why small geared motors can move big loads. But the motor rotor inertia is also
multiplied by N squared when seen from the load side, so at high ratios the motor is
mostly accelerating itself. The classic guideline is inertia matching: reflected load
inertia roughly equal to rotor inertia for best power transfer into acceleration. On a
quadruped this is exactly the quasi-direct-drive argument: ratios around 6:1 to 10:1
keep reflected rotor inertia low enough that foot impacts do not hammer the gears and
the leg remains backdrivable enough to sense contact through current.</p>
<h3>Friction budgets</h3>
<p>Friction is a budget line, not a nuisance term. Stiction sets the minimum torque to
start moving and dominates fine positioning; viscous friction grows with speed and eats
into top-end torque; gearbox efficiency (worm gears can be below 50 percent, planetary
90 plus) scales everything. Measure rather than guess: drive the joint slowly at
constant speed and read the current, do it in both directions to separate gravity from
friction, and repeat warm and cold. A friction figure measured on the bench is worth
three datasheet estimates.</p>
<h3>Duty cycle and thermal sizing</h3>
<p>Windings heat as current squared times resistance, so the thermally honest sizing
number is RMS torque over the whole motion cycle, including the holds. A motor can
deliver several times rated torque for seconds because the thermal time constant of the
winding is long, which is why peak and continuous ratings differ so much. Size
continuous rating from RMS torque of the duty cycle, size peak capability from the
worst single move, and check the two separately. A robot that jogs briskly for ten
seconds a minute needs far less motor than one doing the same move continuously, and
a joint that holds against gravity at standstill can cook a motor that never
technically exceeds its peak rating.</p>
<h3>Why oversizing hurts too</h3>
<p>The reflex answer to uncertainty is a bigger motor, and it costs more than money.
The heavier motor raises the inertia every upstream joint must carry, so oversizing the
wrist forces oversizing the elbow and shoulder in a cascade; it demands bigger drivers,
thicker wiring and more battery; and if the extra margin came from a higher gear ratio,
you have bought worse backdrivability, more reflected inertia at impact, and a joint
that can no longer feel the world. On small robots the mass spiral is vicious because
actuators are most of the mass. The disciplined path is a motion profile, an inertia
model, a measured friction budget, an RMS torque calculation, and then perhaps 50
percent margin, not 300.</p>`,
quiz: [
{ q: "Load inertia seen at the motor through an N:1 gearbox is:",
o: ["Multiplied by N", "Divided by N squared", "Divided by N", "Unchanged"],
a: 1, why: "Torque scales by N and speed by 1/N, so inertia reflects by 1/N squared. This is why gearing tames heavy loads so effectively." },
{ q: "The thermally correct torque figure for sizing a motor's continuous rating is:",
o: ["Peak torque of the fastest move", "Stall torque", "Mean of peak and minimum torque", "RMS torque over the full duty cycle including holds"],
a: 3, why: "Heating goes as current squared, so RMS current (and hence RMS torque) determines steady-state winding temperature." },
{ q: "On a legged robot, a very high gear ratio is problematic mainly because:",
o: ["Reflected rotor inertia and lost backdrivability make impacts harsh and contact sensing poor", "It reduces holding torque", "It increases no-load speed", "It prevents current control"],
a: 0, why: "Rotor inertia reflects to the load multiplied by N squared, so foot impacts slam the gears and the joint cannot feel contact through current." },
{ q: "Oversizing a wrist motor on a small arm typically causes:",
o: ["Lower supply current", "Better precision everywhere", "A cascade of heavier upstream joints, drivers and batteries", "No downstream effect"],
a: 2, why: "Every upstream joint must carry the extra mass, so margin added at the wrist multiplies through the whole arm." }
],
interview: {
q: "Walk me through sizing the hip actuator for a 3 kg quadruped.",
a: "I would start from the gait, not the catalogue: a trot with the worst-case single-leg stance gives ground reaction force around twice body weight on one leg, and the hip moment is that force times the leg's horizontal excursion, so roughly 6 kg-force through maybe 12 cm gives about 7 Nm peak. Swing phase sets acceleration torque from leg inertia and stride frequency. Then friction, measured if I have hardware. I would compute RMS torque over a full gait cycle for the thermal rating and check peak separately. Ratio choice matters as much as the motor: I would stay quasi-direct-drive, under 10:1, so impacts do not destroy the gearbox and I can detect contact from current. Then about 50 percent margin, and a bench thermal test at the real duty cycle before committing."
}
},

{
id: "rob-planning",
track: "Robotics",
title: "Motion planning deeper",
mins: 30,
body: `
<h3>Configuration space</h3>
<p>The organising idea of motion planning is to stop thinking about a robot shape
moving through a workspace and instead think of a single point moving through
configuration space, the space of all joint values or poses. The robot becomes a point;
the obstacles become inflated regions (every configuration in which the robot would
collide). A path is then a curve through the free part of C-space. The price is
dimension: a 6-DOF arm plans in six dimensions, a quadruped's full configuration is
eighteen plus. Everything else in planning is a strategy for coping with that
dimension.</p>
<h3>Grid planners vs sampling planners</h3>
<p>In two or three dimensions, discretise: lay a grid over C-space, mark blocked cells,
and run A* or Dijkstra. This is the right answer for a mobile robot on a floor plan; it
is resolution-complete, optimal on the grid, and easy to debug because you can draw it.
But cell count grows exponentially with dimension, so a 6-DOF grid at useful resolution
is computationally absurd. Sampling planners sidestep this by never representing free
space explicitly: they draw random configurations, keep the collision-free ones, and
connect them. PRM builds a reusable roadmap up front, good when many queries will be
asked in a static world. RRT grows a tree from the start, biased toward unexplored
space, good for single queries; RRT* rewires as it grows and converges toward optimal
with more samples. Sampling planners are probabilistically complete: given infinite
time they find a path if one exists, but narrow passages remain their weakness because
random samples rarely land there.</p>
<h3>Smoothing</h3>
<p>A raw RRT path is jagged, because it is a chain of random samples, not because
anything went wrong. Post-process it: shortcutting repeatedly picks two random points
on the path and replaces the section between them with a straight segment if that
segment is collision-free, and a few hundred iterations produce a respectable path.
Then time-parameterise it against velocity and acceleration limits to get a trajectory
the controller can actually follow.</p>
<h3>Kinodynamic constraints</h3>
<p>Geometric planning assumes the robot can move in any direction in C-space, which is
false for most vehicles: a car cannot translate sideways, a quadrotor cannot hover at
arbitrary attitude, a fast robot cannot stop instantly. Kinodynamic planning respects
these differential constraints during planning, either by planning in state space
(position plus velocity) with dynamically feasible motion primitives, or by using a
steering function that connects states with feasible arcs. A holonomic base, like an
omniwheel platform, is the luxury case: it really can translate any direction from
rest, so geometric planning plus velocity limits is honest, and this is a genuine
argument for omni drives in cluttered spaces.</p>
<h3>The planning vs control boundary</h3>
<p>The planner produces a reference trajectory at low rate with global knowledge; the
controller tracks it at high rate with local knowledge. Keep the boundary clean:
disturbance rejection, slip correction and small obstacle avoidance belong to the
controller or a local layer, not to frantic replanning. A sensible stack replans at a
few hertz when the world model changes meaningfully, runs a local trajectory tracker at
tens of hertz, and closes motor loops at kilohertz. When you see a robot oscillating
because the planner and controller are fighting over the same error, the boundary has
been drawn wrong.</p>`,
quiz: [
{ q: "Grid-based planners become impractical for a 6-DOF arm because:",
o: ["Cell count grows exponentially with C-space dimension", "A* is incomplete", "Grids cannot represent obstacles", "Arms move too fast"],
a: 0, why: "The curse of dimensionality: a modest per-axis resolution raised to the sixth power is already computationally hopeless." },
{ q: "The main structural difference between PRM and RRT is:",
o: ["PRM handles dynamics, RRT does not", "RRT is optimal, PRM is not", "PRM builds a reusable multi-query roadmap; RRT grows a single-query tree", "PRM needs no collision checks"],
a: 2, why: "PRM invests up front in a roadmap that amortises over many queries in a static world; RRT explores from scratch per query." },
{ q: "Raw paths from sampling planners are jagged because:",
o: ["The collision checker is coarse", "Floating point error accumulates", "The robot model is wrong", "They are chains of random samples; shortcutting and smoothing fix this"],
a: 3, why: "Randomness, not error, causes the jaggedness. Shortcutting replaces path sections with straight collision-free segments." },
{ q: "Kinodynamic planning is required when:",
o: ["The workspace is cluttered", "The robot cannot move in arbitrary C-space directions, such as a car that cannot slide sideways", "The map is unknown", "The robot has more than three joints"],
a: 1, why: "Differential constraints (non-holonomy, acceleration limits) mean geometric paths may be unexecutable, so feasibility must enter the planner." }
],
interview: {
q: "On a small mobile robot, where exactly do you draw the line between the planner and the controller?",
a: "By rate and by knowledge. The planner owns anything requiring the global map: route choice, replanning when the world model changes, and it runs at a few hertz at most. The controller owns anything that must react faster than the planner can think: trajectory tracking, slip and disturbance rejection, and it runs at tens to hundreds of hertz against the planner's reference. My rule is that the planner outputs a time-parameterised trajectory with feasibility margins, and the controller never edits geometry, only tracks it; if an obstacle appears inside the reaction horizon, a local layer deforms or stops rather than waiting for a replan. On my holonomic platform this split was clean because the base is omnidirectional; the micro-corrections for the chaotic drive lived entirely in the controller."
}
},

{
id: "rob-vo",
track: "Robotics",
title: "Visual odometry and depth",
mins: 30,
body: `
<h3>The pipeline in words</h3>
<p>Visual odometry estimates camera motion from image sequences. The classical pipeline
is: detect features (corners, blobs, anything locally distinctive), track or match them
into the next frame, then solve for the camera motion that best explains how those
points moved. With 2D-2D correspondences you estimate the essential matrix and
decompose it into rotation and translation; once you have 3D points, you triangulate
new ones and use PnP (perspective-n-point) against them. Keyframes and a local bundle
adjustment refine recent poses and points together. Every stage has a filter: outlier
rejection with RANSAC is doing more work than any other single component, because a
handful of matches on a moving person or a reflection will otherwise hijack the motion
estimate.</p>
<h3>Monocular scale ambiguity</h3>
<p>A single camera gives motion up to an unknown scale factor: the geometry of a small
room filmed close is identical to a large room filmed far. Translation direction is
recoverable, magnitude is not. Scale must be injected from outside: a stereo baseline
of known length, an IMU (visual-inertial odometry, where accelerometer measurements
anchor metric scale), wheel odometry, a known-size object such as a fiducial marker, or
a known camera height above a flat floor. Monocular VO without any of these will drift
in scale as well as pose, and scale drift is insidious because everything remains
self-consistent while being wrong.</p>
<h3>Stereo and RGBD depth</h3>
<p>Stereo recovers depth from disparity between two views a known baseline apart. The
key engineering fact is that depth error grows with the square of distance: doubling
range quadruples depth uncertainty for the same pixel matching error. Baseline sets the
useful envelope: a 6 cm baseline is good to a few metres, beyond which stereo
gracefully degrades into a bearing-only sensor. RGBD cameras (structured light or
time-of-flight) hand you depth per pixel directly, which is wonderful indoors and at
short range, but structured light fails in sunlight, both fail on absorptive and
specular surfaces, and range is limited. A small indoor robot is the RGBD sweet spot;
outdoors, stereo or lidar.</p>
<h3>Drift characteristics</h3>
<p>VO is dead reckoning: each frame-to-frame estimate carries error, and errors
compound. Translation drift of around one percent of distance travelled is respectable;
rotation drift matters more because a heading error converts all subsequent translation
into position error. This is why VO pairs so naturally with an EKF and other sensors:
gyros stabilise short-term rotation, and any absolute reference (a loop closure, a
fiducial, GPS) cancels accumulated drift entirely when it arrives. Without absolute
references, drift is unbounded by construction, and no amount of tuning changes that.</p>
<h3>Failure modes</h3>
<p>Know them by heart, because they define where VO can be trusted. Low texture: blank
walls and uniform floors give no features to track. Motion blur: fast rotation smears
features, and the fix (shorter exposure) fights low light. Lighting: sudden changes
break matching, and auto-exposure transients look like scene changes. Repetitive
texture: tiles and carpets cause aliased matches. Dynamic scenes: if most of the view
is a moving object, RANSAC locks onto the wrong rigid motion. Pure rotation: with no
translation there is no parallax, so no new depth can be triangulated. Rolling shutter
adds skew during fast motion. Every one of these has bitten a real robot in a corridor
demo.</p>`,
quiz: [
{ q: "Stereo depth error, for fixed pixel matching error, grows:",
o: ["Linearly with distance", "With the square of distance", "Logarithmically", "It does not depend on distance"],
a: 1, why: "Disparity is inversely proportional to depth, so a fixed disparity error maps to depth error growing as distance squared." },
{ q: "Monocular VO fundamentally cannot recover:",
o: ["Rotation", "Translation direction", "Frame rate", "Absolute metric scale"],
a: 3, why: "Image geometry is identical under uniform scaling of the scene and the baseline; scale must come from an IMU, stereo baseline, or a known dimension." },
{ q: "Pure rotation is a degenerate case for monocular VO because:",
o: ["The features move too fast", "Rotation is not observable in images", "There is no parallax, so no depth can be triangulated", "RANSAC cannot run on rotations"],
a: 2, why: "Triangulation needs baseline between views; a camera spinning in place provides none, so structure is unobservable." },
{ q: "Accumulated VO drift is best cancelled by:",
o: ["An absolute reference such as a loop closure or fiducial marker", "A better feature detector", "Higher frame rate", "Lower exposure"],
a: 0, why: "Drift is inherent to dead reckoning; only measurements tied to an absolute frame reset the accumulated error." }
],
interview: {
q: "Your robot's visual odometry drifts badly in a plain office corridor but is fine in the lab. Why, and what would you do?",
a: "The corridor is close to the worst case: blank walls give few features, repetitive carpet gives ambiguous matches, and long straight motion with little rotation makes drift hard to observe. First I would log feature counts and inlier ratios along the run to confirm starvation. Then, in order of cost: tilt or add a camera to see the ceiling, which usually has lights and texture; fuse wheel odometry and gyro in the EKF so vision is not carrying translation alone; drop fiducial markers at intervals if we control the site, since one absolute fix cancels all accumulated drift; and check exposure, because corridors often strobe under fluorescent light. I would not tune the tracker first; a sensor that has no information to work with cannot be tuned into having some."
}
},

{
id: "rob-comms",
track: "Robotics",
title: "Robot communications",
mins: 27,
body: `
<h3>Serial links</h3>
<p>UART is the workhorse: point-to-point, cheap, and available on everything. Its
weaknesses are structural: no addressing, no arbitration, no error detection unless you
add it. So add it: frame your bytes (COBS or SLIP so a receiver can resynchronise after
corruption), append a CRC, and include a length and message ID. A raw byte stream with
printf debugging is fine for bring-up; the moment two subsystems depend on the link,
it needs frames, checksums and versioned message definitions. SPI and I2C stay
on-board: they are bus-master protocols with no tolerance for cable-length noise.</p>
<h3>CAN on robots</h3>
<p>CAN earns its place on any robot with several actuators. It is differential (so
tolerant of motor noise), multi-drop (one twisted pair visits every node), and its
arbitration is the clever part: message IDs double as priority, and when two nodes
transmit simultaneously the lower ID wins bitwise without either frame being destroyed.
That gives bounded latency for the highest-priority traffic, which is exactly what
actuator commands and fault messages need. The 8-byte classic frame (64 with CAN FD)
enforces a discipline of small, well-defined messages. Motor drivers with CAN
interfaces mean one clean harness instead of a star of serial cables, and any node can
observe the whole bus, which makes logging almost free.</p>
<h3>WiFi and BLE trade-offs</h3>
<p>WiFi buys throughput (video, map streaming, big logs) at the cost of power and,
critically, latency jitter: median latency may be a few milliseconds, but the tail
under interference reaches hundreds. BLE inverts the trade: low power and predictable
connection intervals, but throughput in the hundreds of kilobits and payload discipline
required. The design rule is that anything with a control deadline never crosses a
wireless link. Wireless is for telemetry, supervision and teleoperation with a human in
the loop, and even then with a loss strategy designed in.</p>
<h3>Latency vs throughput per subsystem</h3>
<p>Budget each link by asking two questions: how stale can this data be, and how much
of it is there? Motor current loops (kilohertz, microsecond staleness) stay inside the
driver. Joint commands at hundreds of hertz belong on CAN or a dedicated serial link.
State estimates at 50 to 200 Hz are modest bandwidth but latency-sensitive if anything
downstream closes a loop on them. Video is the opposite: enormous bandwidth, tolerant
of latency, ideal for WiFi. Logs tolerate anything. Writing this table down for your
robot takes ten minutes and prevents the classic error of routing a control signal over
the convenient link instead of the adequate one.</p>
<h3>Telemetry and comms-loss behaviour</h3>
<p>Telemetry deserves design, not accretion. Use packed binary structs, not text.
Timestamp at the source, not on receipt. Add a sequence number to every packet so drops
are detected rather than suspected. Rate-limit by class: fast channel for state, slow
channel for health, on-demand channel for bulk. And decide comms-loss behaviour per
link before it happens: every consumer of a remote signal carries a deadman timeout,
and expiry triggers a defined behaviour, stop, hold station, or return, chosen per
subsystem and tested deliberately by pulling the plug. A robot whose loss behaviour is
whatever the code happens to do is untested by definition.</p>`,
quiz: [
{ q: "CAN bus arbitration works by:",
o: ["A master polling each node in turn", "Lower-ID messages winning bitwise arbitration without destroying either frame", "Random backoff after collisions", "Time slots assigned at boot"],
a: 1, why: "Dominant bits overwrite recessive ones during the ID field, so the lower ID (higher priority) proceeds untouched and the loser retries." },
{ q: "The strongest reason to keep motor control loops off a WiFi link is:",
o: ["Latency jitter with a long tail under interference", "Insufficient average bandwidth", "WiFi cannot carry binary data", "Encryption overhead"],
a: 0, why: "Control loops fail on the worst-case delay, not the median; WiFi's tail latency under contention reaches hundreds of milliseconds." },
{ q: "Every telemetry packet should carry:",
o: ["The robot's full configuration", "A plain-text description", "The sender's IP address", "A sequence number and a source timestamp"],
a: 3, why: "Sequence numbers make drops detectable; source timestamps keep data ordered and usable for fusion regardless of transport delay." },
{ q: "When the teleoperation link drops, the robot should:",
o: ["Continue the last command", "Reboot the radio", "Execute a predefined safe behaviour when a deadman timeout expires", "Increase transmit power and wait"],
a: 2, why: "Loss behaviour must be designed and tested per link, triggered by a timeout, never left as whatever the code happens to do." }
],
interview: {
q: "Design the communications architecture for a small teleoperated inspection rover with a camera, four wheel motors and an IMU.",
a: "Three tiers by deadline. Motor current and velocity loops live inside the drivers; the MCU sends wheel commands over CAN if the drivers support it, otherwise framed UART with CRC, at 100 Hz or so. The IMU stays on-board over SPI, fused locally, because the estimator must not depend on the radio. To the operator, WiFi carries two streams: video, high bandwidth and latency-tolerant, and a compact binary telemetry channel with sequence numbers and source timestamps at maybe 20 Hz. Operator commands come back with their own sequence numbers, and the rover runs a 300 ms deadman: on expiry it stops and holds, and that path gets tested by pulling the antenna, not assumed. Bulk logs transfer on demand, never competing with the control channel."
}
},

{
id: "rob-safety",
track: "Robotics",
title: "Safety and reliability engineering",
mins: 30,
body: `
<h3>E-stop chains</h3>
<p>A real emergency stop is a hardware chain, not a software feature. The pattern:
normally-closed contacts in series through every e-stop button, feeding a contactor or
relay that carries actuator power. Any button press, wire break or connector fault
opens the loop and drops motor power, while logic power stays up so you keep state and
logs. The critical property is that no firmware sits in the path: a hung processor
cannot un-press a hardware e-stop. A software stop command is still worth having, but
it is a convenience layer, and calling it an e-stop in a design review is a mistake
that gets noticed.</p>
<h3>Watchdogs at every layer</h3>
<p>Each layer of the stack should assume the layer above it will hang, because
eventually it will. The MCU runs its hardware watchdog, kicked only from the main loop
after all health checks pass, never from a timer interrupt that survives a hung main
loop. The motor drivers time out if commands stop arriving and coast or brake. The host
process is watched by a supervisor that restarts it. The radio link has its deadman.
Every one of these is a few lines of code, and each converts a hang from an
uncontrolled failure into a designed event with a known outcome.</p>
<h3>Fail-safe vs fail-operational</h3>
<p>Fail-safe means the de-energised state is acceptable: a wheeled robot that stops, a
gripper that holds spring pressure. Fail-operational means the system must keep working
through the fault, because the de-energised state is itself the hazard: a quadrotor
that cuts its motors does not become safe, it becomes a projectile. Classify every
subsystem: brakes and clamps often want energise-to-release; a robot arm above people
may need brakes that engage on power loss; a walking robot mid-stride wants a
controlled sit, not a collapse. The classification drives real hardware choices, so do
it at design time, not after the first incident.</p>
<h3>Risk assessment mindset</h3>
<p>The lightweight discipline: list hazards (what can hurt someone or destroy
hardware), score each for severity and likelihood, and mitigate in the canonical order:
eliminate the hazard, guard against it, then warn about it, with procedure as the last
resort. An energy audit finds most hazards fast: where are the stored energies (kinetic,
potential, electrical, spring), and what releases them? A 500 g robot is mostly a
pinch-and-LiPo problem; a 20 kg arm is a genuine strike hazard; a LiPo pack is a fire
hazard in every robot regardless of size.</p>
<h3>Brownout and undervoltage</h3>
<p>The classic sequence: motors stall, current spikes, the rail sags, the MCU resets
mid-motion, and the robot reboots into whatever initial state the firmware assumes,
possibly commanding outputs while the world is mid-manoeuvre. Defend in layers:
separate the logic supply from the motor rail with its own regulator and bulk
capacitance; enable brownout detection so resets are clean rather than corrupting;
design boot-up to hold all outputs disabled until state is re-established and a human
or supervisor re-arms; and log the reset cause register so brownouts are visible in
the field record rather than mysterious.</p>
<h3>Safe testing practice</h3>
<p>Test rigs exist to make the dangerous state impossible rather than merely avoided.
Props off for drone firmware work, drivetrain on a stand for legged and wheeled robots,
current-limited bench supply so a fault meets a soft ceiling, tethers where falls are
the hazard, and one change per test so causality stays recoverable. New firmware meets
real actuators only with limits wound down: reduced current, reduced velocity, reduced
range of motion. The habit that matters most is defining, before each test, what you
expect to happen and what the abort condition is; if you cannot state those, the test
is not ready to run.</p>`,
quiz: [
{ q: "A proper e-stop chain acts by:",
o: ["Sending a stop message over CAN", "Raising an interrupt on the MCU", "Opening a hardware contact loop that removes actuator power, with no firmware in the path", "Closing all control loops at zero setpoint"],
a: 2, why: "The defining property is independence from software: a hung processor cannot defeat a hardware chain carrying the motor power." },
{ q: "Which system is inherently fail-operational rather than fail-safe?",
o: ["A conveyor belt", "A bench CNC router", "A wheeled inspection rover", "A quadrotor in flight"],
a: 3, why: "Cutting power to a flying multirotor creates the hazard rather than removing it, so it must keep operating through faults to land." },
{ q: "After a stall-induced brownout reset, the most important design question is:",
o: ["What state the outputs assume during and after reset, and whether the system re-arms itself", "Which compiler flags were used", "Whether the log file rotated", "How long the reset took"],
a: 0, why: "A robot that reboots into active outputs mid-manoeuvre is the real hazard; outputs must stay disabled until state is re-established and re-armed." },
{ q: "The MCU watchdog should be kicked:",
o: ["From a timer interrupt so it never trips falsely", "From the main loop only after health checks pass", "Once at boot", "Whenever any task runs"],
a: 1, why: "A timer ISR keeps running while the main loop hangs, which defeats the watchdog entirely; the kick must prove the real work is happening." }
],
interview: {
q: "You are bringing up new locomotion firmware on a legged robot. What does your safety setup look like?",
a: "Layers, starting with hardware. The robot goes on a stand so the legs move freely without the body going anywhere, powered from a current-limited supply set just above expected draw so a runaway meets a soft ceiling. A hardware e-stop drops motor power but not logic, so I keep logs through an abort. In firmware: the hardware watchdog kicked only from a healthy main loop, driver-level command timeouts so a hung host means coasting legs, and joint limits in software wound well inside mechanical limits, with current and velocity caps at maybe a third of nominal for first runs. Before each test I write down expected behaviour and the abort condition. Only when it is boring on the stand does it touch the floor, on a tether if there is any fall energy worth respecting."
}
},

{
id: "rob-rl",
track: "Robotics",
title: "Reinforcement learning for robots, honestly",
mins: 30,
body: `
<h3>The MDP framing in words</h3>
<p>Reinforcement learning formalises a task as a Markov decision process: at each step
the agent observes a state, chooses an action, receives a reward, and the world moves
to a new state. The policy is the mapping from observation to action, and training
maximises expected discounted return, the sum of future rewards with later ones
weighted down. On a real robot the honest version is a partially observed MDP: you
never see the true state, only sensor readings, so policies get histories or stacked
observations, and half the practical difficulty lives in that gap. The framing is
worth stating precisely in interviews because it exposes the design decisions: what is
in the observation, what is the action space, and what exactly earns reward.</p>
<h3>Reward shaping pitfalls</h3>
<p>The reward function is a specification, and the optimiser is a hostile lawyer that
will honour its letter while gutting its intent. Classics: a velocity reward earned by
vibrating in place because the estimator reads chatter as speed; falling forward at
episode end to harvest a distance term; exploiting a termination condition to avoid a
penalty; and shaped terms fighting each other so the optimum is a degenerate
compromise. Working discipline: keep the task term simple and dominant, add shaping
terms one at a time with logged per-term contributions so you can see what the policy
is actually being paid for, and treat any surprising behaviour as the reward telling
you what you really asked for.</p>
<h3>Sim training and domain randomisation</h3>
<p>Real robots are too slow, too fragile and too expensive to learn on directly, so
training happens in simulation at thousands of times real time, with massively parallel
environments. The sim-to-real gap is attacked with domain randomisation: vary friction,
masses, motor strength, latency, sensor noise and external pushes across environments
so the policy cannot overfit to one physics and reality becomes just another sample
from the training distribution. It works, but it is not free: randomise too widely and
the policy goes conservative, giving up performance to survive worst cases that never
occur. Randomisation ranges should come from measurement, centred on system-identified
values with plausible spread, not from folklore.</p>
<h3>Sim-to-real transfer checks</h3>
<p>Before a trained policy touches hardware, a checklist. System-identify the
actuators and put the measured model in sim; motor response is the gap that kills most
transfers. Verify observations match end to end: units, signs, ordering, filtering and
latency, because a policy fed degrees where it trained on radians fails instantly and
confusingly. Match the control rate exactly. Replay scripted motions on both sim and
hardware and compare trajectories before closing the loop. Then first runs under the
same safety regime as any new controller: stand, tether, current limits, and a finger
on the e-stop.</p>
<h3>When RL wins, and when it embarrasses you</h3>
<p>RL earns its complexity where the dynamics are contact-rich, high-dimensional and
hard to model: legged locomotion over rough terrain, in-hand manipulation, recovery
behaviours. There it produces controllers that classical pipelines struggle to match.
It embarrasses you when the task has a clean model and a known structure: a PID
reaches a setpoint after an afternoon of tuning, with stability margins you can state,
while the RL version needs a reward function, a training farm and a week of debugging
to do the same thing worse. It also has no place, unassisted, where hard guarantees
are required. The honest engineering position is that RL is a powerful tool for a
specific class of problems, not an ideology, and knowing which class you are in is the
skill.</p>`,
quiz: [
{ q: "Reward hacking is when:",
o: ["The policy maximises the written reward through unintended behaviour that defeats the task's intent", "The replay buffer overflows", "A human edits rewards mid-training", "The discount factor is set to 1"],
a: 0, why: "The optimiser honours the letter of the reward, not the intent; vibrating in place to fool a velocity estimate is the canonical robot example." },
{ q: "The purpose of domain randomisation is to:",
o: ["Speed up simulation", "Explore more actions", "Make the policy robust across a distribution of physics so reality is effectively one more sample", "Reduce the observation dimension"],
a: 2, why: "Varying friction, masses, latency and noise in training prevents overfitting to one simulator and is the main workhorse of sim-to-real transfer." },
{ q: "Before closing the loop with a trained policy on hardware, the most critical check is:",
o: ["Retraining with a larger network", "That observations match sim end to end in units, signs, filtering, latency and rate", "Increasing the reward scale", "Switching to a different RL algorithm"],
a: 1, why: "A policy is a function of its inputs; any mismatch between training and deployment observations produces immediate, baffling failure." },
{ q: "A task where classical control clearly beats RL is:",
o: ["Blind locomotion over rubble", "In-hand object reorientation", "Push recovery on a biped", "Temperature regulation of a well-modelled thermal chamber"],
a: 3, why: "Clean low-dimensional dynamics with a good model are PID territory: faster to deploy, analysable, and with stateable stability margins." }
],
interview: {
q: "Your locomotion policy is excellent in simulation and falls over immediately on the real robot. Walk me through your diagnosis.",
a: "I would resist the urge to retrain and instead difference the two worlds. First, observations: log the real observation vector and overlay it on sim distributions, checking units, signs, ordering, filtering and latency; most instant failures live here. Second, actuation: command identical scripted motions to sim and hardware and compare joint trajectories, because unmodelled motor dynamics, torque limits and transport delay are the classic gaps, and that comparison tells me what to system-identify and put back into the simulator. Third, rate: confirm the deployed control frequency matches training exactly. Only once scripted motions agree would I consider the policy itself, and then the fix is usually widening domain randomisation around the measured parameters, especially latency and motor strength, and retraining from the identified model."
}
},

{
id: "rob-integration",
track: "Robotics",
title: "System integration and field debugging",
mins: 30,
body: `
<h3>Integration order is a strategy, not an accident</h3>
<p>Integrate bottom-up, one variable at a time, against stubs. Power first, measured
under load before anything sensitive connects. Then comms links proven with loopback
and synthetic traffic. Then each sensor alone, validated against ground truth you
arranged (a spirit level for the IMU, a tape measure for range). Then actuators
open-loop with limits wound down. Only then close loops, one at a time. The discipline
that pays is the interface contract: for each boundary, write down units, frames,
rates, valid ranges and failure signalling before two subsystems meet. Most integration
misery is two components each working to a slightly different unwritten contract, and
the sign convention argument you have in week one is far cheaper than the one you have
at the demo.</p>
<h3>Logging as a design feature</h3>
<p>Logging designed after the fact records what was easy; logging designed up front
records what you will need. The rules: log at the source, with the data's own
timestamp; log the inputs and outputs of every module boundary, because that is what
lets you isolate the misbehaving stage later; use binary ring buffers so logging is
cheap enough to leave on always; and persist a black-box region that survives resets,
holding the last seconds of state plus the reset cause. Log the software version,
config hash and calibration set with every session, because a log you cannot match to
the code that produced it is an anecdote. The test of a good logging system is whether
you can replay a field failure through your modules offline; if you can, most bugs die
at a desk instead of in a car park.</p>
<h3>Time synchronisation across sensors</h3>
<p>Fusion algorithms assume measurements carry correct relative timing, and violating
that assumption produces subtle, tuning-resistant wrongness. An EKF fed camera poses
that are 80 ms staler than their timestamps claim will systematically lag and overshoot,
and no amount of adjusting Q and R fixes a timing lie. Establish one time base;
timestamp at acquisition, in the sensor's interrupt or driver, never on receipt after a
queue; measure each sensor's latency deliberately (a shared physical event, like a tap
seen by IMU and camera, makes a fine poor-man's calibration); and use hardware triggers
where geometry demands true simultaneity, as with stereo pairs. Clock drift between
separate processors is real: either sync clocks periodically or translate timestamps at
the boundary with an estimated offset.</p>
<h3>Reproducing field failures</h3>
<p>A failure you cannot reproduce is a failure you cannot claim to have fixed. The
field kit mindset: record enough input data that modules can be re-run offline
(capture-and-replay beats fifty return trips); note environment at incident time,
lighting, surface, temperature, battery voltage, because field-only bugs usually hide
in exactly the variables the bench holds constant; keep configs and random seeds under
version control so a run is nameable; and when a bug appears once in an hour, build the
counter or assertion that catches it red-handed and let the robot run. Intermittents
are usually timing, brownout or comms loss wearing a disguise.</p>
<h3>The demo-day checklist</h3>
<p>Demos fail for boring reasons, so kill the boring reasons. Freeze software the day
before; the fix you add on the morning is statistically the thing that fails. Rehearse
the exact sequence end to end, twice, including the power-on-from-cold path. Fresh
batteries plus charged spares; battery state is the leading cause of mysterious demo
behaviour. One-command startup, because a nervous human executing eleven manual steps
will skip one. Assume venue WiFi is hostile and bring your own link or a wired
fallback. Check the venue's lighting and floor against your sensors' assumptions.
Bring the spares kit: props, fuses, cables, the crimp tool. And record a good run as
a fallback video, which transforms a total failure into a conversation.</p>`,
quiz: [
{ q: "Sensor data should be timestamped:",
o: ["When the fusion node receives it", "At acquisition, on the device or in its driver, against a common time base", "At the end of each control cycle", "Only when logging is enabled"],
a: 1, why: "Receipt time includes variable queueing and transport delay; fusion needs true acquisition times, or the filter is being systematically lied to." },
{ q: "The most valuable property of a robot's logs for field debugging is:",
o: ["Human-readable text format", "Small file size", "Cloud upload", "Enough recorded input data to replay modules offline and reproduce the failure"],
a: 3, why: "Capture-and-replay turns a field failure into a desk problem; everything else about a logging system is secondary to that." },
{ q: "Sound integration order is:",
o: ["Bottom-up, one subsystem at a time against stubs, with written interface contracts", "Everything connected at once to find issues fast", "Actuators first since they are riskiest", "Software fully finished before hardware is touched"],
a: 0, why: "Adding one variable at a time keeps causality recoverable, and agreed contracts on units, frames and rates prevent most cross-boundary bugs." },
{ q: "The day before a demo, the highest-value activity is:",
o: ["Adding the one missing feature", "Retuning the controller for extra speed", "Freezing versions and rehearsing the full sequence from cold power-on", "Refactoring the launch scripts"],
a: 2, why: "The morning-of change is statistically the thing that fails; rehearsal from cold finds the startup-path bugs that demos are famous for." }
],
interview: {
q: "Your robot fails roughly once an hour in the field but never on the bench. How do you attack it?",
a: "First I make the failure observable: a black-box log surviving resets, capturing the last seconds of module inputs and outputs, the reset-cause register, battery voltage and comms statistics, then I let the robot run and collect incidents rather than staring at it. Field-only usually means an environmental variable the bench holds constant, so I difference the two setups: battery sag versus bench supply, real WiFi versus lab, temperature, vibration, lighting. Once-an-hour smells like timing, brownout or comms loss, so I check the reset log and packet sequence numbers first. When the trace shows which module boundary misbehaves, I replay its logged inputs offline until it reproduces at my desk. Then the fix gets a regression test that runs for hours, because an intermittent is only fixed when it fails to come back."
}
}

);
