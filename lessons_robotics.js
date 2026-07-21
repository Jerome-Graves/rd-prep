// Robotics track lessons. Appended to the LESSONS array defined in data.js.
// Same schema: id, track, title, mins, body (HTML string), quiz, interview.

LESSONS.push(

// ------------------------------------------------------------------ Robotics
{
id: "rob-ros",
track: "Robotics",
title: "ROS and ROS 2: the mental model",
mins: 30,
body: `
<p>ROS is not an operating system and barely a framework; it is a message bus plus a
package ecosystem plus a set of conventions. The mental model is a graph: independent
processes called <b>nodes</b>, each doing one job (drive the lidar, run the planner,
fuse odometry), connected by named, typed data streams.</p>
<h3>The four communication patterns</h3>
<ul>
<li><b>Topics</b>: many-to-many publish/subscribe streams. Fire-and-forget, no reply.
Right for sensor data and continuous state: /scan, /imu, /odom, /cmd_vel.</li>
<li><b>Services</b>: request/reply, blocking, like a remote function call. Right for
quick queries and mode switches, wrong for anything long-running.</li>
<li><b>Actions</b>: services grown up. A goal, periodic feedback, a result, and
crucially cancellation. Navigation goals and arm motions belong here, because you
want to watch progress and be able to abort.</li>
<li><b>Parameters</b>: named configuration values on each node, changeable at
runtime.</li>
</ul>
<h3>The tf tree</h3>
<p>tf is a continuously updated tree of timestamped transforms between coordinate
frames: map to odom to base_link to laser, camera, each wheel. Any node can ask for
the pose of frame A in frame B at time t, and tf interpolates and chains transforms
for you. The classic split is that odom to base_link is smooth but drifts, while map
to odom jumps whenever the localiser corrects; consumers pick the frame with the
properties they need. Most integration bugs on a real robot are tf bugs: a wrong
sign, a stale timestamp, or two nodes both claiming the same transform.</p>
<h3>ROS 1 versus ROS 2</h3>
<p>ROS 1 routed discovery through a single master process; kill it and the graph is
headless. ROS 2 replaced the transport with DDS: no master, peer-to-peer discovery,
and per-connection <b>QoS</b> policies. QoS matters in practice: a lidar topic wants
best-effort delivery with a shallow queue (drop stale scans, never block), while a
map or a set of waypoints wants reliable and transient-local so late joiners still
receive it. Mismatched QoS between publisher and subscriber silently produces zero
messages, which is worth knowing before you lose an afternoon to it.</p>
<h3>Bags</h3>
<p>rosbag records topics with timestamps and replays them later. This is the most
underrated tool in the stack: you can capture one awkward run of your robot, then
develop and regression-test perception and estimation against it at your desk,
deterministically, without touching hardware.</p>
<h3>When ROS helps and when it hinders</h3>
<p>ROS buys you tooling (rviz, bags, tf), a huge driver ecosystem, and clean process
isolation, so a crashed camera node does not take down control. The costs are
serialisation overhead, dependency weight, and non-determinism in message timing.
For a one-off fixed-function device with three sensors and one loop, ROS can be pure
overhead. For anything with a navigation stack, multiple sensors, or a team, it
earns its keep.</p>
<h3>Real-time limits</h3>
<p>Stock ROS on stock Linux is not real-time. Topic latency is typically fine at
tens of hertz but has a long tail, and a garbage-collecting or heavily loaded system
will occasionally stall you for milliseconds. So the rule: fast inner loops do not
live on the bus. Motor current and velocity control belong on a microcontroller or
in a real-time thread talking directly to the driver; ROS supplies setpoints at
50 to 100 Hz and reads state back. On a quadruped this split is stark: the 1 kHz
leg-level loop must be local, while gait selection and pose targets can arrive over
the graph. ROS coordinates; it should not close tight loops.</p>`,
quiz: [
{ q: "A navigation goal that takes 30 seconds and might need aborting should be exposed as:",
o: ["A topic", "A service", "An action", "A parameter"],
a: 2, why: "Actions provide goal, feedback, result and cancellation. A service would block with no progress reporting and no clean abort." },
{ q: "In the standard tf layout, the transform that jumps discontinuously when the localiser corrects is:",
o: ["map to odom", "odom to base_link", "base_link to laser", "base_link to camera"],
a: 0, why: "odom to base_link stays smooth but drifts; the localiser publishes map to odom, absorbing corrections there so consumers can choose smooth or accurate." },
{ q: "The biggest architectural change from ROS 1 to ROS 2 is:",
o: ["Topics were removed", "Python support was dropped", "Messages became untyped", "DDS transport with no central master and per-connection QoS"],
a: 3, why: "ROS 2 replaced the master-based transport with DDS: peer-to-peer discovery, no single point of failure, and QoS policies per connection." },
{ q: "Where should a 1 kHz motor current loop live on a ROS robot?",
o: ["In a Python node subscribed to /cmd_vel", "On a microcontroller or real-time thread, with ROS supplying setpoints", "In the rviz plugin", "In a service callback"],
a: 1, why: "Stock ROS on Linux has millisecond-scale latency tails. Tight loops run locally; ROS coordinates at tens of hertz." }
],
interview: {
q: "You built robots without ROS. When would you actually reach for it, and what would you keep off the bus?",
a: "I reach for ROS when the system has enough moving parts that tooling and isolation pay for themselves: multiple sensors, a navigation stack, or more than one developer. Bags alone justify it, because replaying a recorded run turns hardware debugging into desk work, and tf kills the whole class of hand-rolled frame bugs. On my own holonomic robot the fusion and control ran bare because it was one process on one board and ROS would have added latency and dependency weight for nothing. What I keep off the bus regardless is anything fast: wheel velocity and current loops live on the microcontroller, ROS sends body-velocity setpoints at 50 Hz and reads fused odometry back. ROS coordinates subsystems; it should never be inside a tight control loop."
}
},

{
id: "rob-kinematics",
track: "Robotics",
title: "Kinematics, transforms and rotations",
mins: 30,
body: `
<p>Every pose question in robotics reduces to: what is frame B expressed in frame A?
Get fluent in that one operation and manipulators, mobile bases and camera mounts all
become the same bookkeeping problem.</p>
<h3>Frames and homogeneous transforms</h3>
<p>A rigid transform is a rotation R (3x3) plus a translation t (3x1), packed into a
4x4 homogeneous matrix so that composition and point transformation are both plain
matrix multiplication. Write T_AB for the pose of frame B in frame A. Then a point
known in B maps into A as p_A = T_AB p_B, and chaining is T_AC = T_AB T_BC. The
inverse has a closed form: invert the rotation (transpose it) and rotate-negate the
translation.</p>
<pre>p_A = T_AB * p_B          // point in B, expressed in A
T_AC = T_AB * T_BC        // chain: subscripts must cancel B with B</pre>
<p>The subscript-cancellation habit is the whole trick. If the inner letters do not
match, the multiplication is wrong, whatever the code happens to output. Most frame
bugs are either a multiplication in the wrong order (rotations do not commute) or a
transform used backwards; when a camera appears behind the robot instead of in front,
suspect an un-inverted T before anything else.</p>
<h3>Forward and inverse kinematics</h3>
<p><b>FK</b>: given joint angles, chain the per-joint transforms to get the
end-effector (or foot) pose. Deterministic, unique, cheap. <b>IK</b>: given a desired
pose, find joint angles. Harder in every way: there may be multiple solutions (elbow
up or down), exactly one, or none if the target is out of reach. A quadruped leg is
the friendly case: three joints, closed-form IK per leg, solved thousands of times a
second to place feet on planned touchdown points. Six-axis arms use analytic IK when
the geometry allows and iterative Jacobian-based solvers otherwise.</p>
<h3>The Jacobian and singularities</h3>
<p>The Jacobian J is the local linear map from joint velocities to end-effector
velocity: v = J qdot. It is the derivative of FK, and it does triple duty: velocity
control (invert it to get joint rates), statics (torque = J transposed times force),
and diagnosis. A <b>singularity</b> is a configuration where J loses rank: some
Cartesian direction becomes unreachable at any joint speed, and near it the inverse
blows up, demanding enormous joint velocities for tiny motions. A fully outstretched
leg or arm is the everyday example. Practical handling is damped least squares
(accept small error near singularities instead of infinite rates) and planning that
keeps away from them.</p>
<h3>Rotations: Euler pitfalls and quaternions</h3>
<p>Euler angles (roll, pitch, yaw) are three numbers and read nicely on a plot, but
they have order-dependent conventions, they wrap, and they suffer <b>gimbal lock</b>:
at pitch of 90 degrees the first and third axes align, a degree of freedom vanishes,
and rates through that pose go singular. Interpolating Euler angles component-wise
also produces curved, non-physical paths. <b>Quaternions</b> (four numbers, unit
norm) have none of these problems: no singularities, cheap composition, smooth
interpolation via slerp, and numerically stable renormalisation. The practical rule:
store and compose orientation as quaternions or rotation matrices; convert to Euler
only at the display or logging boundary. Remember q and minus q are the same
rotation, which matters when averaging or comparing.</p>
<h3>Composing correctly</h3>
<p>Multiplying on the right applies a transform in the moving body frame; on the left,
in the fixed world frame. Turn-then-drive and drive-then-turn end somewhere
different. When output looks wrong, draw the frames on paper and check subscript
cancellation before touching code; it is faster and it is usually the answer.</p>`,
quiz: [
{ q: "Given T_AB and T_BC, the pose of C in A is:",
o: ["T_BC * T_AB", "T_AB * T_BC", "T_AB + T_BC", "inverse(T_AB) * T_BC"],
a: 1, why: "Chain so inner subscripts cancel: T_AC = T_AB T_BC. Order matters because rotations do not commute." },
{ q: "Near a kinematic singularity, inverting the Jacobian for velocity control produces:",
o: ["Zero joint velocities", "Smoother motion", "Very large joint velocities for small Cartesian motions", "A second elbow-up solution"],
a: 2, why: "J loses rank, so its inverse blows up; damped least squares trades a little tracking error for bounded joint rates." },
{ q: "Gimbal lock is best described as:",
o: ["Quaternion norm drifting from one", "A mechanical failure of the joint bearing", "Integer overflow in the angle representation", "Two Euler rotation axes aligning so a degree of freedom is lost"],
a: 3, why: "At pitch of 90 degrees the first and third Euler axes coincide, making the representation singular. Quaternions have no such configuration." },
{ q: "The recommended way to store and compose orientation in robot software is:",
o: ["Quaternions or rotation matrices, converting to Euler only for display", "Roll, pitch, yaw everywhere for readability", "Axis-angle only", "Whatever the IMU datasheet uses"],
a: 0, why: "Quaternions and rotation matrices compose and interpolate without singularities; Euler angles are for humans at the boundary." }
],
interview: {
q: "Why do robotics libraries insist on quaternions when Euler angles are so much easier to read?",
a: "Because Euler angles are a chart with a hole in it. They are three numbers covering a three-dimensional rotation space, so somewhere the map must degenerate, and it does at gimbal lock, where two axes align and rates become singular. They also carry a dozen ordering conventions, and interpolating them component-wise gives non-physical paths. Quaternions cost one extra number and a unit-norm constraint, and in exchange composition is cheap, slerp gives the shortest smooth rotation between poses, and there is no singular configuration anywhere. On my quadruped the body orientation lived as a quaternion through the estimator and controller, and I converted to roll, pitch, yaw only for plots and logs. That split, quaternions for maths and Euler for humans, is the standard answer and the right one."
}
},

{
id: "rob-locomotion",
track: "Robotics",
title: "Wheeled locomotion maths",
mins: 25,
body: `
<p>Wheeled kinematics is the cleanest maths on a mobile robot, which is exactly why
it is worth knowing where the clean model ends and reality begins.</p>
<h3>Differential drive in words</h3>
<p>Two independently driven wheels on a common axle. The robot's forward speed is the
average of the two wheel rim speeds; its turn rate is their difference divided by the
track width (the wheel separation). Equal speeds go straight; equal and opposite spin
on the spot; anything else drives an arc whose radius follows from the ratio. Inverting
that gives the mixer: from a commanded forward speed and yaw rate, compute left and
right wheel speeds. Two lines of algebra, and it is the entire drive model for a huge
fraction of the world's mobile robots.</p>
<h3>Holonomic versus non-holonomic</h3>
<p>A differential drive cannot translate sideways: it has three pose degrees of
freedom (x, y, heading) but only two velocity degrees of freedom. That is a
<b>non-holonomic</b> constraint, a restriction on velocities that does not reduce the
reachable poses. The robot can reach any pose, but only via manoeuvres, which is why
parallel parking exists and why planners for car-like and diff-drive robots must
reason about feasible curves, not just collision-free paths. A <b>holonomic</b> base
can command x, y and yaw velocity independently, which simplifies planning and
control enormously: the local planner can just output the velocity it wants.</p>
<h3>Omni and mecanum mixing</h3>
<p>Omni wheels have free-spinning rollers around the rim, so each wheel can drive
along its motor axis while passively sliding along the roller axis. Point three or
four of them in different directions and the base becomes holonomic. The mixing rule
is a small matrix: each wheel's required rim speed is the projection of the desired
body velocity (vx, vy, omega) onto that wheel's drive direction, plus the
contribution of body rotation at that wheel's mounting radius. Mecanum wheels do the
same with rollers at 45 degrees on a conventional layout. On an X-configured omni
base the striking property is that pure sideways translation has every wheel turning,
each contributing a component; no single wheel motion looks like the body motion.</p>
<h3>Slip: where the model breaks</h3>
<p>All of the above assumes rolling without slipping, and omni rollers make that
assumption fragile. Rollers skid during aggressive acceleration, load transfer
unloads one wheel, dust changes friction, and mecanum bases famously drift sideways
across smooth floors under vibration. The kinematic model is exact about geometry
and silent about friction, so treat commanded motion as an intention, not a
measurement. This is a modelling honesty point: the open-loop mixer is fine for
commanding, but never trust it as the sole source of where you actually went.</p>
<h3>Odometry from wheels, and its drift</h3>
<p>Integrate encoder counts through the forward kinematics and you get wheel
odometry: cheap, smooth, high-rate, and steadily wrong. Systematic errors (tyre
diameter, track width miscalibration) grow with distance; random slip grows with
manoeuvring; and heading error is the killer, because a small angular error projects
into position error proportional to distance travelled thereafter. On an omni base,
wheel odometry is degraded further because slip is part of normal operation. The
consequence is architectural: wheel odometry is one sensor among several, feeding a
fusion filter alongside a gyro and an exteroceptive fix (optical flow, fiducials, or
a laser), never the sole authority on pose.</p>`,
quiz: [
{ q: "For a differential drive, the yaw rate is:",
o: ["The sum of the wheel speeds", "The average wheel speed times the wheel radius", "The wheel speed difference divided by the track width", "Independent of the wheel speeds"],
a: 2, why: "Forward speed is the average of the rim speeds; turn rate is their difference over the wheel separation." },
{ q: "A differential drive robot is non-holonomic because:",
o: ["It has fewer velocity degrees of freedom than pose degrees of freedom", "It cannot reach every pose in the plane", "It has no encoders", "Its wheels are different sizes"],
a: 0, why: "It cannot translate sideways instantaneously (two velocity DOF against three pose DOF), yet manoeuvres reach any pose. The constraint is on velocity, not reachability." },
{ q: "During pure sideways translation of an X-configured omni base:",
o: ["Two wheels turn and two are stationary", "Only the front wheels turn", "The base cannot translate sideways", "All wheels turn, each contributing a component of the motion"],
a: 3, why: "Each wheel's speed is the projection of the body velocity onto its drive direction; for sideways motion every wheel has a non-zero component." },
{ q: "The dominant long-run failure of wheel odometry is:",
o: ["Encoder quantisation noise", "Heading error projecting into position error that grows with distance travelled", "CPU cost of the integration", "Battery voltage droop"],
a: 1, why: "A small angular error rotates all subsequent motion, so position error grows with distance; slip and calibration feed that heading error." }
],
interview: {
q: "You built a holonomic omni robot. Was holonomy worth the trouble compared with a differential drive?",
a: "For that robot, yes, but I would not claim it always is. Holonomy collapsed the control problem: I could command vx, vy and yaw independently, so the local behaviour layer just output the velocity it wanted with no manoeuvre planning, and decoupled heading from travel direction, which mattered for keeping sensors pointed at targets. The price was real. Omni rollers slip as part of normal operation, so wheel odometry alone was poor, and the drive was genuinely chaotic under acceleration. I paid for holonomy with a heavier estimation stack, fusing gyro, optical flow and fiducial fixes in an EKF because the wheels could not be trusted. A diff drive inverts that trade: honest odometry and simple mechanics, but constrained motion. I would choose per robot, based on whether sideways motion earns its estimation cost."
}
},

{
id: "rob-perception",
track: "Robotics",
title: "Cameras, lidar and calibration",
mins: 30,
body: `
<p>Perception hardware is a set of trade-offs between geometry you can trust and
geometry you have to estimate. The pinhole model is the foundation for all of it.</p>
<h3>The pinhole model</h3>
<p>A camera maps a 3D point onto the image plane by dividing by depth: a point at
(X, Y, Z) in the camera frame lands at pixel u = fx X / Z + cx, v = fy Y / Z + cy.
That divide-by-Z is why perspective exists, why distant things are small, and why a
single camera cannot recover depth: every point along a ray projects to the same
pixel. Real lenses add radial and tangential distortion on top, modelled by a
handful of polynomial coefficients and removed in software.</p>
<h3>Intrinsics versus extrinsics</h3>
<ul>
<li><b>Intrinsics</b>: properties of the camera itself. Focal lengths fx, fy,
principal point cx, cy, distortion coefficients. They change only if the lens or
focus changes.</li>
<li><b>Extrinsics</b>: where the camera sits, the rigid transform from the camera
frame to the robot body or to another sensor. They change every time the mount flexes
or someone retightens a bracket.</li>
</ul>
<p>Keeping these separate matters because they fail differently: bad intrinsics warp
everything everywhere; bad extrinsics shift the world coherently, which is exactly
the signature to look for when fused estimates disagree.</p>
<h3>What checkerboard calibration actually solves</h3>
<p>A checkerboard gives many precisely known coplanar points per image. Detect the
corners across a few dozen views at varied angles and distances, and calibration
solves a big nonlinear least squares problem: jointly find the intrinsics,
distortion, and the per-view board pose that minimise reprojection error, the pixel
distance between where each corner was detected and where the model says it should
project. Reprojection error is the health metric: a fraction of a pixel RMS is good;
whole pixels mean poor board coverage, motion blur, or a wrong model. Stereo and
camera-to-IMU calibration extend the same machinery to solve extrinsics between
sensors.</p>
<h3>Depth: lidar versus stereo versus ToF</h3>
<ul>
<li><b>Lidar</b> times its own emitted light: accurate, long-range, lighting
independent, texture independent. Costs money, power and moving parts (or limited
resolution when solid-state), and struggles on dark absorbers and glass.</li>
<li><b>Stereo</b> triangulates matched features between two cameras: cheap, dense,
passive. Fails on textureless walls, repeats badly on repetitive patterns, and depth
error grows quadratically with range as disparity shrinks.</li>
<li><b>Time-of-flight cameras and rangers</b> modulate light and measure phase or
pulse return per pixel: compact, fast, indoors-friendly. Limited range, ambient
sunlight hurts, and multipath in corners corrupts depth. The small single-zone ToF
rangers on hobby robots are the same physics at one pixel.</li>
</ul>
<h3>Fiducials: why AprilTags give full pose</h3>
<p>An AprilTag is a planar pattern of known physical size with unambiguous identity
and corner ordering. Four detected corner pixels of a known square are enough to
solve the perspective-n-point problem, yielding the full 6-DOF pose of the tag in
the camera frame, not just a bearing. That is why a single tag sighting can cancel
accumulated drift in a fusion filter: it is an absolute pose measurement from one
cheap camera frame. Accuracy degrades with range and shallow viewing angles, and
orientation flips (pose ambiguity) can occur when the tag is small in the image, so
gate accordingly.</p>
<h3>Rolling shutter gotchas</h3>
<p>Most cheap CMOS sensors expose row by row, not all at once. Anything moving
(the robot or the scene) is captured with each row at a slightly different time,
shearing straight lines and corrupting geometry. Fast yaw on a mobile robot smears
tag corners, silently biasing pose estimates, and vibration produces wobble.
Fixes: global-shutter sensors where geometry matters, short exposures, motion
gating, or modelling per-row timestamps. If perception is worst exactly when the
robot moves fast, suspect rolling shutter early.</p>`,
quiz: [
{ q: "Camera intrinsics include:",
o: ["The camera-to-body mounting transform", "Focal lengths, principal point and distortion coefficients", "The tag size", "The baseline to the second camera"],
a: 1, why: "Intrinsics describe the camera's own projection; mounting transforms and stereo baselines are extrinsics." },
{ q: "Checkerboard calibration works by minimising:",
o: ["The number of images required", "The board's pose uncertainty", "Reprojection error between detected and predicted corner pixels", "Lens temperature drift"],
a: 2, why: "It is nonlinear least squares over intrinsics, distortion and per-view poses, scored by pixel reprojection residuals." },
{ q: "Stereo depth error grows with range because:",
o: ["The lenses defocus at distance", "The baseline shrinks", "Lidar interference increases", "Disparity shrinks, so a fixed pixel matching error maps to ever larger depth error"],
a: 3, why: "Depth is inversely proportional to disparity; at long range disparities are subpixel and the error blows up roughly quadratically." },
{ q: "A single AprilTag detection can provide:",
o: ["Full 6-DOF pose of the tag relative to the camera", "Only a bearing to the tag", "Only the tag identity", "Depth but not orientation"],
a: 0, why: "Four corners of a known-size square solve perspective-n-point, giving full pose. That is what lets one sighting cancel accumulated drift." }
],
interview: {
q: "Your robot's tag-based pose fixes look great when stationary but degrade badly during fast turns. Walk me through your diagnosis.",
a: "First suspect is rolling shutter. A row-by-row exposure during fast yaw shears the tag in the image, so the corner geometry no longer matches a rigid square and the PnP solution is biased exactly when motion is fastest, which matches the symptom. I would confirm by correlating pose residuals against measured yaw rate, and by checking whether short exposures reduce it. Second suspect is timestamping: a tag pose computed from a frame taken 50 ms ago, fused as if current, looks like a motion-dependent error too, so I would verify the capture timestamp reaches the filter. Third is motion blur degrading corner detection, visible directly in the images. Mitigations in order: gate tag updates above a yaw-rate threshold, shorten exposure, fix the timestamps, and if the budget allows, move to a global-shutter camera."
}
},

{
id: "rob-slam",
track: "Robotics",
title: "Localisation, mapping and navigation",
mins: 30,
body: `
<p>Navigation is a stack of problems that are usually confused with each other:
knowing where you are (localisation), knowing what the world looks like (mapping),
and deciding how to move through it (planning). Each layer has its own failure
modes.</p>
<h3>The drift problem</h3>
<p>Dead reckoning (wheel odometry plus a gyro) is smooth and fast but integrates
error without bound; heading error especially, because it rotates all subsequent
motion. Every localisation scheme is at heart a way of anchoring that drifting
estimate to something external: a map, a set of landmarks, or previously seen
terrain.</p>
<h3>Particle filter versus EKF localisation, in plain words</h3>
<p>An <b>EKF</b> localiser keeps one hypothesis: a mean pose and a covariance
ellipse. It predicts through the motion model, corrects on measurements, and is
cheap and smooth. Its weakness is commitment: the belief is a single Gaussian blob,
so it cannot represent the robot might be in either of these two corridors, and if
the estimate walks off, it rarely walks back.</p>
<p>A <b>particle filter</b> (Monte Carlo localisation) keeps hundreds or thousands
of candidate poses. Each particle is moved through the motion model with noise, then
weighted by how well the current sensor scan matches the map from that pose;
resampling concentrates particles where the evidence is. It represents multimodal
beliefs naturally, solves global localisation (start with particles everywhere) and
the kidnapped robot problem, and degrades gracefully. The costs are computation and
sampling noise. The folk theorem holds: particles for finding yourself, something
Gaussian for staying found.</p>
<h3>Occupancy grids and costmaps</h3>
<p>An <b>occupancy grid</b> divides the world into cells, each holding a probability
of being occupied, updated from range sensors with a log-odds trick that makes
fusion a matter of addition. It is the standard 2D map representation. A
<b>costmap</b> is the planning view of the same world: occupied cells become lethal
cost, and obstacles are inflated by the robot's radius plus a safety margin so the
planner can treat the robot as a point. Layered costmaps add live sensor data on top
of the static map, so a person stepping in front of the robot appears as cost
immediately without touching the map itself.</p>
<h3>Global versus local planners</h3>
<p>The <b>global planner</b> works on the whole costmap and answers how do I get to
the goal: a route, replanned occasionally. The <b>local planner</b> runs at control
rate on a small window and answers what velocity do I command right now: it tracks
the global path while dodging fresh obstacles and respecting the platform's
kinematics and acceleration limits. Keeping them separate is what lets a robot
follow a sensible route and still react in a fraction of a second.</p>
<h3>A star versus RRT intuition</h3>
<p><b>A star</b> searches a discretised grid or lattice outward from the start,
guided by cost-so-far plus an admissible estimate of cost-to-go. In low dimensions
(a mobile base on a plane) it is fast and returns the optimal path on that grid.
Discretisation is its limit: grid resolution bounds path quality, and the approach
scales poorly to high-dimensional spaces. <b>RRT</b> and its variants instead grow a
tree by sampling random configurations and extending toward them: no grid, works in
high dimensions (arms, legged bodies, car-like constraints), finds feasible paths
quickly, but raw RRT paths are jagged and non-optimal, needing smoothing or an
optimising variant like RRT star. Rule of thumb: grids and A star for 2D bases,
sampling for high-DOF systems.</p>
<h3>Loop closure, at concept level</h3>
<p>SLAM builds the map and localises in it simultaneously, and its defining event is
<b>loop closure</b>: recognising a previously visited place, which converts I have
been here before into a constraint tying two distant parts of the trajectory
together. Optimising the whole pose graph with that constraint snaps accumulated
drift out of the entire loop at once. False loop closures are correspondingly
catastrophic, folding the map onto itself, so recognition must be conservative.</p>`,
quiz: [
{ q: "The kidnapped robot problem (waking up somewhere unknown) is best handled by:",
o: ["A particle filter, since particles can cover many hypotheses at once", "An EKF, since its Gaussian is efficient", "Pure wheel odometry", "Inflating the costmap"],
a: 0, why: "A multimodal belief is exactly what a particle set represents; an EKF's single Gaussian cannot spread over several distinct candidate poses." },
{ q: "Obstacles in a costmap are inflated by the robot radius so that:",
o: ["The map file compresses better", "Sensors are calibrated automatically", "The planner can treat the robot as a point", "Loop closure triggers less often"],
a: 2, why: "Inflating obstacles by the robot's footprint converts collision checking of a body into collision checking of a point, which is far cheaper." },
{ q: "Compared with A star on a grid, RRT-family planners:",
o: ["Always return shorter paths", "Require a finer grid", "Only work in 2D", "Scale better to high-dimensional configuration spaces but return non-optimal, jagged paths"],
a: 3, why: "Sampling avoids the exponential cost of gridding high-DOF spaces; the price is path quality, recovered by smoothing or optimal variants." },
{ q: "A loop closure in SLAM does what to accumulated drift?",
o: ["Nothing; drift is permanent", "Moves it into the costmap", "Distributes a correction around the whole loop via pose-graph optimisation", "Resets the robot to the origin"],
a: 2, why: "Recognising a revisited place adds a constraint between distant poses; optimising the graph pulls the entire trajectory, and map, back into consistency." }
],
interview: {
q: "Explain why a robot needs both a global and a local planner rather than one clever planner.",
a: "They answer different questions on different timescales. The global planner reasons over the whole map to find a route; that computation is too slow and too far-sighted to run at control rate, and it works from a map that is seconds or minutes stale. The local planner runs tens of times a second over a small window of fresh sensor data, choosing the actual velocity command: track the route, dodge the person who just stepped out, respect acceleration and kinematic limits. Collapsing them into one planner forces one component to be simultaneously far-sighted, fast and reactive, and it ends up bad at all three. The split is the same predict-slow, correct-fast layering that appears throughout robotics; each layer has an honest contract, a route from one, a feasible velocity from the other."
}
},

{
id: "rob-actuators",
track: "Robotics",
title: "Motors, drivers and encoders",
mins: 30,
body: `
<p>Actuation is where clean control maths meets copper, magnets and friction.
Interviewers probe it because it separates people who have built robots from people
who have simulated them.</p>
<h3>The four motor families</h3>
<ul>
<li><b>Brushed DC</b>: cheapest and simplest; speed roughly proportional to voltage,
torque to current. Brushes wear, arc and generate electrical noise. Two wires,
trivially driven. The default for small wheeled robots.</li>
<li><b>Brushless DC (BLDC)</b>: commutation moved from brushes into electronics.
Better power density, efficiency and lifetime, at the cost of a three-phase driver
and rotor position sensing (Hall sensors, encoders, or back-EMF). Quadruped leg
actuators are BLDC with modest gearing precisely because the family delivers high
torque transparently and survives impacts.</li>
<li><b>Steppers</b>: move in discrete steps, open loop. Superb repeatability with no
encoder, holding torque at standstill, but heavy for their output, power-hungry
while holding, and they fail silently (more below).</li>
<li><b>Hobby servos</b>: a brushed motor, gearbox, potentiometer and control board
in one box; command an angle, it goes there. Great for prototypes; limited in
range, feedback access and bandwidth.</li>
</ul>
<h3>H-bridges and PWM</h3>
<p>Four switches in an H around the motor let you apply supply voltage in either
polarity: forward, reverse, brake (both low-side switches on, shorting the winding)
or coast. Speed control is <b>PWM</b>: switch the bridge at kilohertz rates and the
winding inductance averages the voltage, so duty cycle becomes effective voltage.
Two classic gotchas: shoot-through (both switches in one leg on together, a dead
short, prevented by dead-time insertion) and the difference between coasting and
braking during the PWM off phase, which changes the motor's low-speed behaviour
noticeably.</p>
<h3>Gearing: torque, speed, backlash</h3>
<p>A gearbox of ratio N multiplies torque by roughly N and divides speed by N, minus
efficiency. Motors are efficient at high speed and low torque; robots usually want
the opposite, so almost everything is geared. The costs are <b>backlash</b> (play
between teeth, which becomes a dead zone that destabilises tight position loops),
friction, and reflected inertia, which grows with N squared and makes highly geared
joints stiff and fragile under impact. Hence the quadruped trend toward low gear
ratios: less backlash, better torque transparency, and legs that survive landing.</p>
<h3>Encoders: incremental versus absolute</h3>
<p><b>Incremental</b> encoders emit quadrature pulses; count edges to track relative
motion. Cheap and fast, but position is unknown at power-up, requiring a homing move
or index pulse, and missed counts accumulate for ever. <b>Absolute</b> encoders
(magnetic or optical) report true shaft angle immediately at power-up, at higher
cost. Placement matters as much as type: an encoder on the motor side of the gearbox
gives fine resolution but does not see backlash; on the joint side it measures the
truth but with N times less resolution per motor turn.</p>
<h3>Current sensing</h3>
<p>Motor torque is proportional to current, so sensing current (shunt resistor plus
amplifier, typically in the bridge legs) gives you a torque signal, stall and
collision detection, thermal protection, and the innermost loop of a proper
controller: current loop inside velocity loop inside position loop, each roughly ten
times slower than the one inside it.</p>
<h3>When steppers lose steps</h3>
<p>A stepper's torque falls with speed as winding inductance limits current
rise time. Demand more torque than the curve offers, accelerate too hard, or hit a
resonance, and the rotor slips poles: the controller keeps counting steps the motor
never took, and being open loop, nothing notices. Position error is silent and
permanent until re-homed. Fixes: derate well below the torque curve, ramp
acceleration, microstep through resonances, raise the supply voltage for faster
current rise, or add an encoder, at which point a closed-loop BLDC often wins
anyway.</p>`,
quiz: [
{ q: "Dead time is inserted in an H-bridge to prevent:",
o: ["Encoder miscounts", "PWM audio noise", "Shoot-through, where both switches in one leg conduct and short the supply", "Back-EMF measurement errors"],
a: 2, why: "Real switches turn off slower than they turn on; a gap where both are commanded off stops a supply-to-ground short through one bridge leg." },
{ q: "Reflected inertia at the motor grows with gear ratio N as:",
o: ["N squared", "N", "log N", "It does not change"],
a: 0, why: "Load inertia divided by N squared as seen by the motor means motor-side inertia dominates at high N, making joints stiff and impact-fragile; a key reason quadrupeds favour low ratios." },
{ q: "The fundamental difference between incremental and absolute encoders is:",
o: ["Absolute encoders are always optical", "Incremental encoders cannot measure speed", "Incremental encoders need no wiring", "Absolute encoders know the true angle at power-up; incremental ones only track changes"],
a: 3, why: "Incremental encoders count relative motion and need homing or an index pulse to establish reference; absolute encoders report position immediately." },
{ q: "A stepper loses steps most readily when:",
o: ["The supply voltage is slightly high", "Demanded torque exceeds its speed-dependent torque curve during aggressive acceleration", "Microstepping is enabled", "It is left holding position"],
a: 1, why: "Available torque falls with speed as inductance limits current rise; exceed it and the rotor slips poles silently, since there is no feedback." }
],
interview: {
q: "For a new quadruped leg joint, argue for your actuator choice.",
a: "I would choose a BLDC with a low gear ratio, single-stage planetary around 6 or 9 to 1, and an absolute encoder on the output. The reasoning is impacts and transparency. Legs meet the ground hard; reflected inertia grows with the square of the gear ratio, so a highly geared motor strips gears on landing, while a low ratio lets the motor back-drive and absorb energy. Low gearing plus current sensing also makes motor current an honest torque signal, giving proprioceptive contact detection without foot sensors. The absolute encoder means no homing dance on power-up, which matters with legs folded under a body. A stepper fails silently under exactly the overloads legs produce, and hobby servos hide the current loop I need. My 3D-printed quadruped used hobby servos, and their opacity is what I would be paying to remove."
}
},

{
id: "rob-estimation",
track: "Robotics",
title: "State estimation on real robots",
mins: 30,
body: `
<p>Estimation on a real robot is less about the filter equations and more about
being honest about sensors. Every sensor lies in its own way; the architecture
exists to let their lies cancel.</p>
<h3>Why you cannot just integrate the IMU</h3>
<p>An IMU gives angular rate and specific force. Orientation requires one
integration of the gyro; position requires subtracting gravity (using that
orientation) and integrating acceleration twice. Every error compounds: a constant
gyro bias becomes a linearly growing angle error, which misprojects gravity, which
injects a fake horizontal acceleration, which double-integrates into position error
growing with time cubed. Consumer-grade parts drift metres in seconds. The IMU is a
superb short-horizon sensor and an unusable long-horizon one, and everything else in
the stack exists to supply the long horizon.</p>
<h3>Gyro bias</h3>
<p>The dominant IMU error is a slowly wandering rate offset: temperature-sensitive,
different at every power-up. Calibrating it once at startup (average the gyro while
provably stationary) helps but does not finish the job, because it walks. The clean
solution is putting bias in the state vector, so the filter estimates it
continuously using the other sensors as reference; watching your bias estimate
settle after power-up, then wander with temperature, is one of the quiet
satisfactions of the trade.</p>
<h3>Complementary versus Kalman fusion</h3>
<p>A <b>complementary filter</b> is frequency-domain common sense: trust the gyro at
high frequency (smooth, drifts), trust the accelerometer or another absolute
reference at low frequency (noisy, unbiased), and blend with a single crossover
constant. A few lines of code, no covariance, excellent for attitude on small
robots. The <b>EKF</b> earns its complexity when there are many sensors at
different rates, when you need cross-correlations (heading error corrupting position),
when sensors drop in and out, and when you want a live uncertainty output. The
honest engineering answer is: complementary for two-sensor attitude, EKF once the
sensor count or the questions grow.</p>
<h3>A concrete fusion architecture</h3>
<p>A planar robot fusing four sources, each covering another's weakness:</p>
<ul>
<li><b>Wheel odometry</b>: smooth, high-rate; lies under slip, systematically on an
omni drive.</li>
<li><b>Gyro</b>: excellent short-term heading; drifts through bias.</li>
<li><b>Optical flow</b>: ground-relative velocity, immune to wheel slip; fails on
low-texture floors and misreports if height above ground is wrong.</li>
<li><b>Fiducials (AprilTags)</b>: absolute pose, no drift; intermittent, degraded by
range, angle and motion blur.</li>
</ul>
<p>The filter predicts with odometry and gyro, corrects velocity with flow when its
quality metric is good, and snaps accumulated drift whenever a tag fix arrives. No
single sensor survives alone; the union is solid because the failure modes are
disjoint.</p>
<h3>Covariance honesty</h3>
<p>The filter is only as good as its noise models. Claim a tighter R than a sensor
deserves and the filter overweights it; claim a tiny Q and covariance collapses
until new measurements are effectively ignored, the classic smug filter that has
stopped listening. Honest covariances also mean inflating R dynamically: flow on a
bad surface, tags at shallow angles, odometry during aggressive manoeuvres. If a
consumer downstream would not bet on the 3-sigma bound, the covariance is a lie.</p>
<h3>Innovation checks</h3>
<p>The innovation (measurement minus prediction) is the filter's built-in lie
detector. It should be zero-mean white noise sized by its predicted covariance.
Gate on it: a measurement whose normalised innovation is implausibly large (a bad
tag detection, a flow glitch) gets rejected before it corrupts the state.
Trend it: persistently biased innovations from one sensor mean a calibration error,
a mounting transform error, or a timestamping error. Log innovations always; they
are the first thing to plot when the robot swears it is somewhere it is not.</p>`,
quiz: [
{ q: "A constant gyro bias, uncorrected, produces a heading error that:",
o: ["Stays constant", "Grows linearly with time", "Grows with time squared", "Averages to zero"],
a: 1, why: "Integrating a constant rate offset gives a linearly growing angle; through misprojected gravity it becomes position error growing far faster." },
{ q: "The standard remedy for slowly wandering gyro bias is:",
o: ["A stiffer mount", "Calibrating once at the factory", "Estimating bias as part of the filter state, corrected by other sensors", "Filtering the gyro with a low-pass"],
a: 2, why: "Bias-in-state lets the filter track the walk continuously; one-off calibration goes stale with temperature and power cycles." },
{ q: "A complementary filter blends sensors by:",
o: ["Voting between them per sample", "Trusting one at high frequency and the other at low frequency via a crossover", "Averaging them equally", "Switching based on battery voltage"],
a: 1, why: "It is a frequency-domain split: gyro above the crossover, absolute reference below, one tuning constant, no covariance machinery." },
{ q: "Persistently biased innovations from a single sensor most likely indicate:",
o: ["A calibration, mounting-transform or timestamp error for that sensor", "The filter needs more particles", "Q is too large", "Normal healthy operation"],
a: 0, why: "Healthy innovations are zero-mean white noise; a sustained one-sensor bias points at that sensor's model, not at random noise." }
],
interview: {
q: "Tell me about a state estimation problem you actually solved on hardware.",
a: "My holonomic robot ran a 3-DOF EKF, x, y and yaw, fusing four sensors whose failure modes I deliberately chose to be disjoint. The omni drive slips as part of normal operation, so wheel odometry alone was hopeless; I predicted with it under honest, generous process noise. The gyro carried short-term heading with bias in the state. Optical flow gave ground-relative velocity immune to wheel slip, gated by its quality metric because it fails on low-texture floors, with a time-of-flight ranger supplying the height it needs. AprilTag sightings supplied absolute pose fixes that snapped out accumulated drift. The lessons that stuck: covariance honesty beats filter sophistication, innovation gating saved me from bad tag detections more than once, and plotting innovations was my fastest diagnostic, a biased stream pointing straight at a wrong mounting transform."
}
},

{
id: "rob-sim",
track: "Robotics",
title: "Simulation and sim-to-real",
mins: 30,
body: `
<p>Simulation is where robots are allowed to fail cheaply. The craft is not making a
simulator, it is knowing precisely which of its statements to believe.</p>
<h3>Why simulate at all</h3>
<ul>
<li><b>Safety</b>: a quadruped can fall ten thousand times without stripping a gear
or snapping a printed bracket.</li>
<li><b>Speed and scale</b>: physics runs faster than real time and in parallel.
An RL locomotion policy needing millions of environment steps is flatly impossible
on hardware; thousands of simulated robots on one GPU make it an afternoon.</li>
<li><b>Determinism and truth</b>: you can replay the exact same scenario twice, and
the simulator hands you ground-truth state that no real sensor can, which is what
reward functions and estimator benchmarks are made of.</li>
</ul>
<h3>URDF: what it actually means</h3>
<p>A URDF is a tree of links (rigid bodies with mass, inertia tensor, collision and
visual geometry) connected by joints (type, axis, limits, damping). It is the shared
robot description consumed by simulators, visualisers and kinematics libraries
alike. Two honest limitations: it is a tree, so closed kinematic loops (four-bar
linkages, parallel mechanisms) do not fit without workarounds, and it says nothing
about how the robot is actuated or controlled. And one perennial trap: inertia
values. CAD exports or hand-guessed inertia tensors are wrong more often than not,
and a plausible-looking robot with garbage inertias produces confidently wrong
dynamics.</p>
<h3>Physics engines and the contact problem</h3>
<p>Rigid-body engines (PhysX, MuJoCo, Bullet, and the GPU engines inside Isaac)
integrate multibody dynamics well. The weak point is always <b>contact</b>. Real
contact is continuous deformation; engines approximate it with penalty springs or
complementarity solvers at discrete timesteps, and friction cones get linearised.
The result: contact forces that chatter, feet that penetrate or skate, and friction
behaviour that depends on solver iterations and timestep as much as on physics.
For a legged robot or a wheeled robot at the traction limit, contact is the physics
that matters most and it is exactly what the engine does worst. Treat contact-rich
simulation results as directional, not quantitative.</p>
<h3>The reality gap and domain randomisation</h3>
<p>The <b>reality gap</b> is the accumulation of everything the simulator got wrong:
friction, latency, motor dynamics, sensor noise, unmodelled compliance. A policy or
controller tuned in one pristine simulation learns to exploit that simulation's
quirks, and those exploits do not transfer. <b>Domain randomisation</b> attacks this
by refusing to present one world: every episode draws new friction coefficients,
masses, motor strengths, latencies and sensor noise from ranges believed to bracket
reality. The policy that survives cannot rely on any particular value, so the real
world becomes just another sample from the training distribution. The tuning tension
is real: too little randomisation and you overfit the sim; too much and the policy
turns timid, sacrificing performance for robustness it may not need.</p>
<h3>Model the chaos, do not idealise it</h3>
<p>The instinct when a simulated robot misbehaves is to clean the simulation up.
For transfer, the productive direction is usually the opposite: make the sim as
messy as the hardware. If the real drive has backlash, slip and a ragged response
to velocity commands, an idealised perfect-velocity-tracking sim is a lie the
controller will be tuned to. Better to inject an actuation model with delay,
first-order lag, torque limits and noise, and randomise its parameters, so the
controller never meets a crisper world in training than it will on the bench.
Quadruped groups learned this the hard way: fitting an actuator network or lag
model to real motor data is routinely the difference between a policy that walks
and one that falls over at first contact.</p>
<h3>Policy transfer checks</h3>
<p>Before trusting hardware to a sim-trained policy: hold out randomisation ranges
and test beyond the training bracket; replay real command logs through the sim and
compare state trajectories; check the policy's action spectrum (frantic
high-frequency torque switching in sim predicts hardware oscillation); run the real
robot suspended or spotted first; and instrument the first minutes on the ground
against the same metrics used in training, so the gap is measured rather than
vibed.</p>`,
quiz: [
{ q: "The part of rigid-body simulation least trustworthy for a legged robot is:",
o: ["Gravity", "Contact and friction modelling", "Joint kinematics", "Link visualisation"],
a: 1, why: "Engines approximate continuous contact with discrete penalty or complementarity schemes; feet chatter, penetrate and skate, and friction depends on solver settings." },
{ q: "A URDF cannot natively represent:",
o: ["Joint limits", "Link inertia tensors", "Closed kinematic loops such as a four-bar linkage", "Collision geometry"],
a: 2, why: "URDF is strictly a tree of links and joints; parallel mechanisms need workarounds or other formats." },
{ q: "Domain randomisation improves transfer because:",
o: ["It makes the simulator run faster", "It reduces the number of training steps needed", "It gives the policy ground-truth state", "A policy trained across many perturbed worlds cannot overfit one, so reality becomes another sample from the distribution"],
a: 3, why: "Randomising friction, masses, latencies and noise forces robustness; the cost is potentially conservative behaviour if ranges are too wide." },
{ q: "For sim-to-real transfer of a locomotion policy, the actuation model should be:",
o: ["Deliberately realistic and messy: lag, delay, torque limits and noise, with randomised parameters", "Ideal perfect velocity tracking, for stable training", "Omitted entirely", "Replaced by ground-truth forces"],
a: 0, why: "Policies exploit whatever the sim offers; train against idealised actuators and the exploit fails on real motors. Modelling actuation chaos is routinely decisive." }
],
interview: {
q: "Your RL policy is superb in Isaac but falls over on the real quadruped. What is your debugging plan?",
a: "First I look at the actuation gap, because that is where these transfers usually die. I log real motor step responses against the sim's actuator model; if sim motors track commands more crisply than reality, the policy was trained on a lie, so I fit a lag-and-delay model to real data and retrain. Second, contact: check foot friction and restitution against the actual floor and widen randomisation ranges to bracket measurements rather than guesses. Third, observations: verify the real state estimate matches training in units, frames, latency and noise, since a 20 ms estimator delay absent from training is fatal. I would also inspect the policy's action spectrum, because frantic torque switching in sim predicts hardware oscillation, and penalise it in the reward. Then iterate with the robot spotted on a harness, measuring against the training metrics."
}
}

);
