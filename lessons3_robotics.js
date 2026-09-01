// Robotics lessons, second course: robots in the field.
//
// These carry a `sub` so the page groups them under a heading, in the same way
// the Embedded C track is organised.

LESSONS.push(

{
id: "rob-calib",
track: "Robotics",
sub: "Robots in the field",
title: "Calibration: intrinsics, extrinsics and hand-eye",
mins: 22,
body: `
<p>A robot that knows where its camera is can turn a pixel into a point in the world. One that
does not has a system whose accuracy is capped by a number nobody measured. Calibration is
where a great deal of unexplained error actually lives.</p>

<p>There are three distinct things to calibrate, and confusing them is the commonest mistake.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Intrinsics describing the camera itself, extrinsics describing where sensors sit relative to each other, and hand-eye describing the sensor relative to the robot">
<rect class="bx" x="24" y="30" width="200" height="180" rx="4"/>
<text class="th" x="40" y="58">intrinsics</text>
<text class="ts" x="40" y="86">focal length</text>
<text class="ts" x="40" y="108">principal point</text>
<text class="ts" x="40" y="130">distortion</text>
<text class="ts" x="40" y="166">a property of the</text>
<text class="ts" x="40" y="186">camera alone</text>

<rect class="bx" x="240" y="30" width="200" height="180" rx="4"/>
<text class="th" x="256" y="58">extrinsics</text>
<text class="ts" x="256" y="86">rotation and</text>
<text class="ts" x="256" y="108">translation between</text>
<text class="ts" x="256" y="130">two sensors</text>
<text class="ts" x="256" y="166">camera to lidar,</text>
<text class="ts" x="256" y="186">camera to IMU</text>

<rect class="bx" x="456" y="30" width="200" height="180" rx="4"/>
<text class="th" x="472" y="58">hand-eye</text>
<text class="ts" x="472" y="86">sensor relative to</text>
<text class="ts" x="472" y="108">the robot's own</text>
<text class="ts" x="472" y="130">kinematic frame</text>
<text class="ts" x="472" y="166">solved from motion,</text>
<text class="ts" x="472" y="186">not from one view</text>
</svg>

<p><b>Intrinsics</b> describe the camera itself: focal length, principal point and lens
distortion. They are found from many views of a known target, and they are a property of the
camera and lens assembly, so refocusing invalidates them.</p>

<p><b>Extrinsics</b> describe where one sensor sits relative to another. A camera and a lidar
observing the same scene can be aligned by matching features they both see, though the two
modalities make that harder than it sounds.</p>

<p><b>Hand-eye</b> calibration is the one people find surprising: it finds the transform between
a sensor and the robot's own frame, and it cannot be solved from a single view. You move the
robot to several poses, observe a fixed target from each, and solve the resulting equation
relating the robot's motion to the camera's observed motion. Motion is what makes the unknown
observable, and the poses must include rotation about more than one axis or the problem is
degenerate.</p>

<p>Two things make calibration results untrustworthy in practice. Poor <b>pose diversity</b>:
if all your views are from similar positions the parameters are weakly determined and the fit
looks excellent while generalising badly. And treating the <b>reprojection error</b> as the
measure of success, when a low error on the calibration set says nothing about a different part
of the workspace.</p>

<p>The defensible check is the same one you would use for any fit: validate on data the
calibration never saw, ideally at a different part of the workspace, and look at the residuals
for structure rather than just their magnitude.</p>
`,
quiz: [
{ q: "What do camera intrinsics describe?",
o: ["Where the camera sits on the robot", "Focal length, principal point and lens distortion", "The relationship between camera and lidar", "The camera's exposure and gain settings"],
a: 1, why: "They are a property of the camera and lens assembly, which is why refocusing invalidates them. Where the camera sits is extrinsics." },
{ q: "Why can hand-eye calibration not be solved from a single view?",
o: ["One view has too much noise", "Motion is what makes the unknown transform observable", "The target must be seen from both sides", "The robot's kinematics are not known accurately"],
a: 1, why: "You solve an equation relating the robot's motion to the camera's observed motion, and the poses must include rotation about more than one axis." },
{ q: "What does poor pose diversity do to a calibration?",
o: ["It increases the reprojection error visibly", "The parameters are weakly determined but the fit still looks good", "It makes the optimisation fail to converge", "It biases only the distortion coefficients"],
a: 1, why: "The fit is excellent on the calibration set and generalises badly, which is why validating on unseen poses matters more than the reported error." },
{ q: "Why is low reprojection error not proof of a good calibration?",
o: ["It is measured in pixels rather than metres", "It says nothing about a different part of the workspace", "It ignores the distortion parameters", "It is dominated by the target's own accuracy"],
a: 1, why: "It is the residual on the data you fitted, and any model with enough parameters fits its own data. Cross-validation is what shows it generalises." }
],
interview: {
q: "A vision-guided arm is consistently off by a few millimetres. Where would you look?",
a: "A consistent offset rather than random scatter points at calibration rather than noise, so I would work through the three calibrations in order and be careful not to confuse them. Intrinsics first: focal length, principal point and distortion, which are properties of the camera and lens, and which anyone refocusing the lens will have invalidated without realising. A principal point error in particular gives an offset that grows with distance from the image centre, which shows up as a bend in what should be a straight reconstruction. Then extrinsics if there is more than one sensor. Then hand-eye, which is the transform between the camera and the robot's own kinematic frame, and which is the one I would suspect most for a consistent millimetre-level offset, because it cannot be solved from a single view and it is often done badly. It needs the robot moved to a set of poses observing a fixed target, and the poses have to include rotation about more than one axis or the problem is degenerate and the solution is weakly determined. The diagnostic I would run is the same one I would use for any fit: validate against poses the calibration never saw, ideally in a different part of the workspace, and look at the residuals for structure rather than just their size. A low reprojection error on the calibration set proves very little, because any model with enough parameters fits its own data. If the residuals show a systematic pattern across the workspace, that is a geometry error rather than noise, and it tells me which of the three to redo."
}
},

{
id: "rob-costmap",
track: "Robotics",
sub: "Robots in the field",
title: "Costmaps, inflation and recovery behaviours",
mins: 20,
body: `
<p>A planner needs to know where the robot may go, and it needs that in a form it can search
quickly. The costmap is that form: a grid where each cell carries a cost from free through
increasingly undesirable up to lethal.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="An obstacle surrounded by a lethal inscribed region and a decaying inflation gradient, keeping the planned path clear">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">cost around an obstacle</text>

<rect class="bx" x="280" y="110" width="70" height="70" rx="3"/>
<text class="th" x="292" y="152">obstacle</text>

<rect class="bx" x="250" y="86" width="130" height="118" rx="4"/>
<text class="ts" x="256" y="80">inscribed radius: lethal</text>

<rect class="bx" x="210" y="66" width="210" height="158" rx="4"/>
<text class="ts" x="440" y="100">inflation: cost decays</text>
<text class="ts" x="440" y="122">with distance</text>
<text class="ts" x="440" y="156">a path may cross here,</text>
<text class="ts" x="440" y="178">but prefers not to</text>
</svg>

<p><b>Inflation</b> is what turns a shaped robot into a point. Growing every obstacle by the
robot's inscribed radius means the planner can treat the robot as a point and any path it finds
is collision free. Beyond that radius the cost decays with distance, which does not forbid
passing close to a wall but makes the planner prefer not to, so paths naturally run down the
middle of a corridor.</p>

<p>Two costmaps are usual. A <b>global</b> one covers the known map and is what the global
planner searches. A <b>local</b> one is a small window that rolls with the robot and is built
from live sensor data, which is what catches the thing that was not in the map.</p>

<p>Clearing is harder than marking. Marking a cell occupied needs one return; clearing it needs
positive evidence that the ray passed through, and a sensor that cannot see a low obstacle
cannot clear it either. That asymmetry is why costmaps accumulate phantom obstacles, and why a
badly configured one slowly fills up until the robot believes it is trapped.</p>

<p>When the planner fails, <b>recovery behaviours</b> run in escalating order: clear the costmap
beyond a radius, rotate in place to re-observe the surroundings, back up, and finally give up
and ask for help. The sequence matters, and so does the fact that it terminates. A robot that
loops through recoveries indefinitely is worse than one that stops and says so.</p>

<p>The commonest tuning failure is inflation that is too small, which produces paths that clip
corners and scrape walls, or too large, which closes a doorway the robot could physically pass
and makes the planner report no path at all through an opening a person can see is fine.</p>
`,
quiz: [
{ q: "What does inflating obstacles by the robot's inscribed radius achieve?",
o: ["It compensates for map resolution errors", "The planner can treat the robot as a point", "It marks regions the sensor cannot observe", "It simulates the obstacle growing over time"],
a: 1, why: "Growing the obstacle rather than modelling the robot's shape is the cheapest configuration-space construction, and any path found is then collision free." },
{ q: "Why is clearing a costmap cell harder than marking one?",
o: ["Clearing requires positive evidence the ray passed through", "Marking uses a different sensor", "Cleared cells cannot be marked again", "Clearing is computationally more expensive"],
a: 1, why: "A sensor that cannot see a low obstacle cannot clear it either. That asymmetry is why costmaps accumulate phantom obstacles over time." },
{ q: "What is the purpose of a local costmap alongside a global one?",
o: ["It stores the map at higher resolution", "It is built from live data and catches what the map lacks", "It plans the path more quickly", "It holds the obstacles the global planner ignored"],
a: 1, why: "It is a small window rolling with the robot, built from current sensor data, so it sees the thing that appeared after the map was made." },
{ q: "What is wrong with recovery behaviours that never terminate?",
o: ["They consume too much processor time", "A robot looping through recoveries is worse than one that stops", "They clear the global costmap repeatedly", "They prevent the local planner from running"],
a: 1, why: "The escalation should end in giving up and asking for help. Indefinite looping hides the failure instead of reporting it." }
],
interview: {
q: "A mobile robot keeps reporting no path through a doorway it can physically fit through. What would you check?",
a: "My first suspicion is the costmap inflation, because that is the parameter that decides whether a gap is passable at all. Inflation grows every obstacle by the robot's inscribed radius so the planner can treat the robot as a point, and if the inflation radius is set larger than it needs to be, the inflated regions from the two door frames meet in the middle and the doorway simply closes as far as the planner is concerned. So I would check the inflation radius against the actual robot footprint, and check whether the doorway width minus twice the inflation leaves anything at all. The second thing I would look at is whether the costmap has accumulated phantom obstacles near the door, because clearing is much harder than marking: marking a cell occupied needs a single return, whereas clearing it needs positive evidence that a ray passed through, and a sensor that cannot see a low obstacle also cannot clear it. Over time that asymmetry fills a costmap up. I would visualise the costmap rather than reason about it, because the answer is usually obvious the moment you look at the inflated layer. Then I would check the resolution, since a coarse grid can quantise a narrow gap out of existence, and whether the local and global costmaps disagree. And I would look at what the recovery behaviours are doing, because if the robot is clearing and rotating and retrying in a loop rather than escalating to giving up and asking for help, then the failure is being hidden rather than reported."
}
},

{
id: "rob-multi",
track: "Robotics",
sub: "Robots in the field",
title: "More than one robot in the same space",
mins: 20,
body: `
<p>Two robots planning independently in a shared space will eventually meet in a corridor and
both stop, or both move, and neither outcome is acceptable. Coordination has to be designed
rather than emerge.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Three coordination approaches: fully centralised, decentralised with reservations, and fully reactive">
<rect class="bx" x="24" y="30" width="200" height="180" rx="4"/>
<text class="th" x="40" y="58">centralised</text>
<text class="ts" x="40" y="86">one planner sees all</text>
<text class="ts" x="40" y="108">optimal, predictable</text>
<text class="ts" x="40" y="142">single point of failure</text>
<text class="ts" x="40" y="164">scales badly</text>
<text class="ts" x="40" y="186">needs reliable comms</text>

<rect class="bx" x="240" y="30" width="200" height="180" rx="4"/>
<text class="th" x="256" y="58">reservations</text>
<text class="ts" x="256" y="86">robots book space</text>
<text class="ts" x="256" y="108">and time in advance</text>
<text class="ts" x="256" y="142">scales reasonably</text>
<text class="ts" x="256" y="164">deadlock must be</text>
<text class="ts" x="256" y="186">designed out</text>

<rect class="bx" x="456" y="30" width="200" height="180" rx="4"/>
<text class="th" x="472" y="58">reactive</text>
<text class="ts" x="472" y="86">each avoids what it</text>
<text class="ts" x="472" y="108">can see, locally</text>
<text class="ts" x="472" y="142">no comms needed</text>
<text class="ts" x="472" y="164">livelock, and no</text>
<text class="ts" x="472" y="186">throughput guarantee</text>
</svg>

<p>A <b>centralised</b> planner produces the best plans and is the easiest to reason about,
because one thing knows everything. It is also a single point of failure, it needs communication
that is reliable enough to depend on, and the planning problem grows badly with the number of
robots.</p>

<p><b>Reservation</b> schemes are the usual industrial compromise. A robot books a region of
space for a window of time before entering it, and another robot planning through the same
region has to wait or route around. It scales, it degrades gracefully, and it needs deliberate
deadlock avoidance, because two robots each holding a reservation the other needs is exactly
the circular wait condition.</p>

<p><b>Reactive</b> avoidance, where each robot simply avoids what it can see, needs no
communication at all and gives no guarantees. Two robots politely stepping the same way
repeatedly is livelock, and the standard fix is to break the symmetry: a priority rule, or a
randomised offset, so that identical robots behave differently.</p>

<p>Whatever the scheme, three things need explicit design. A <b>priority rule</b> so that ties
break deterministically. A <b>timeout</b> so a robot waiting on a reservation that will never
clear eventually gives up rather than blocking forever. And a <b>fallback</b> when
communication is lost, because the failure mode of a coordination scheme that assumes messages
arrive is a fleet that stops in place.</p>

<p>The pattern that scales best in practice is a small amount of central authority for
allocation and traffic, with each robot fully autonomous for local execution and safety. Safety
in particular should never depend on the network.</p>
`,
quiz: [
{ q: "What is the main drawback of fully centralised multi-robot planning?",
o: ["It produces poorer plans than local avoidance", "A single point of failure and poor scaling", "It cannot handle robots of different types", "It requires every robot to be identical"],
a: 1, why: "One planner knowing everything gives the best plans and the easiest reasoning, at the cost of depending on reliable communication and scaling badly." },
{ q: "What must be designed out of a reservation scheme?",
o: ["Livelock between identical robots", "Deadlock, where each holds what the other needs", "Communication latency", "Sensor disagreement between robots"],
a: 1, why: "Two robots each holding a reservation the other requires is exactly circular wait. It has to be prevented deliberately rather than hoped away." },
{ q: "Why do two reactive robots sometimes livelock?",
o: ["Their sensors interfere with each other", "Identical logic makes them both step the same way", "The costmaps disagree about the obstacle", "One robot's plan is longer than the other's"],
a: 1, why: "Symmetry is the problem, so the fix is to break it with a priority rule or a randomised offset so identical robots behave differently." },
{ q: "What should never depend on the network in a fleet?",
o: ["Task allocation", "Safety", "Map updates", "Battery scheduling"],
a: 1, why: "The failure mode of a coordination scheme that assumes messages arrive is a fleet that stops. Safety has to hold when communication does not." }
],
interview: {
q: "Two of your robots meet in a corridor and both stop. How would you design this properly?",
a: "The fact that both stopped tells me the coordination is reactive and symmetric, so each robot is avoiding what it sees and the two are making the same decision at the same time. That is livelock, and the immediate fix is to break the symmetry: a deterministic priority rule, perhaps by robot identifier or by which one has the more urgent task, or a randomised offset so identical robots behave differently. That is a patch though, and I would want to know whether reactive avoidance is the right architecture at all. For a corridor, which is a shared resource that only one robot can occupy at a time, the natural answer is a reservation scheme: a robot books the corridor for a window of time before entering, and anything else planning through it waits or routes around. That scales reasonably and degrades gracefully, and the thing I would have to design deliberately is deadlock avoidance, because two robots each holding a reservation the other needs is exactly the circular wait condition, and a common way to prevent it is to impose an ordering on the resources so they are always acquired in the same sequence. I would also insist on three things regardless of the scheme: a deterministic tie-break so the behaviour is predictable, a timeout so a robot waiting on a reservation that will never clear eventually gives up and asks for help rather than blocking the fleet, and a defined behaviour when communication is lost. That last one matters most, because a coordination scheme that assumes messages arrive fails by stopping the whole fleet, and safety in particular must never depend on the network."
}
},

{
id: "rob-teleop",
track: "Robotics",
sub: "Robots in the field",
title: "Teleoperation, latency and shared autonomy",
mins: 20,
body: `
<p>Put a human in the control loop over a network and you have added a delay you cannot remove
and a controller whose dynamics you cannot model. Both facts shape the design.</p>

<p>The human adapts to a constant delay surprisingly well, up to a few hundred milliseconds, by
switching from continuous control to a move-and-wait strategy. What people cannot adapt to is
<b>variable</b> delay, because it destroys the internal model they are building. A jittery
hundred milliseconds is far worse to drive than a steady three hundred.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Direct teleoperation degrading with delay, against shared autonomy where the operator sets intent and the robot closes the fast loops locally">
<rect class="bxa" x="24" y="24" width="308" height="36" rx="4"/>
<text class="th" x="40" y="48">direct teleoperation</text>
<rect class="bx" x="24" y="72" width="308" height="140" rx="4"/>
<text class="ts" x="40" y="98">operator closes every loop</text>
<text class="ts" x="40" y="122">delay is inside the loop</text>
<text class="th" x="40" y="158">degrades fast with latency</text>
<text class="ts" x="40" y="186">unusable past a second</text>

<rect class="bxa" x="348" y="24" width="308" height="36" rx="4"/>
<text class="th" x="364" y="48">shared autonomy</text>
<rect class="bx" x="348" y="72" width="308" height="140" rx="4"/>
<text class="ts" x="364" y="98">operator sends intent</text>
<text class="ts" x="364" y="122">robot closes fast loops locally</text>
<text class="th" x="364" y="158">delay is outside the fast loop</text>
<text class="ts" x="364" y="186">works at seconds of latency</text>
</svg>

<p>The structural answer is to move the fast loops onto the robot and send <b>intent</b> rather
than commands. "Go to that point", "grasp that object", "follow this wall" all survive a delay
that direct joystick control does not, because the loops that need to be fast are closed
locally and the delayed link carries only the slow, high-level decisions.</p>

<p>The operator still needs to know what the robot is doing, and here <b>predictive display</b>
helps considerably: show the operator where the robot is predicted to be now, using a model,
rather than where it was when the last frame left. Overlaying the delayed real image on the
predicted state lets the operator see both the estimate and its error.</p>

<p>Force feedback deserves a warning. A bilateral teleoperation loop with delay in it is a
feedback loop with delay, and it goes unstable in exactly the way any such loop does. The
classical fixes, wave variables and passivity-based approaches, work by guaranteeing the
communication channel cannot generate energy, which buys stability at the cost of transparency.</p>

<p>Finally, design the <b>loss of link</b> behaviour first rather than last. A robot that
continues executing its last command when the link drops is a runaway. Coming to a controlled
stop, holding position, or continuing an already-approved autonomous behaviour are all
defensible; carrying on with a stale joystick command is not.</p>
`,
quiz: [
{ q: "What kind of delay do human operators find hardest?",
o: ["A long but constant delay", "A variable delay, even if shorter on average", "A delay that increases slowly over time", "A delay only on the video channel"],
a: 1, why: "People adapt to a steady delay with a move-and-wait strategy. Jitter destroys the internal model they are building, so jittery 100 ms is worse than steady 300 ms." },
{ q: "What is the structural fix for teleoperation over a long delay?",
o: ["Increase the video frame rate", "Send intent and close the fast loops on the robot", "Reduce the resolution to lower latency", "Use a dedicated radio link"],
a: 1, why: "The delayed link then carries only slow, high-level decisions, and the loops that must be fast are local. That is what makes seconds of latency workable." },
{ q: "What does a predictive display show the operator?",
o: ["The path the robot intends to take next", "Where the robot is predicted to be now, not where it was", "A simulation replacing the real video", "The confidence of the robot's localisation"],
a: 1, why: "Overlaying the delayed real image on the predicted state lets the operator see both the estimate and how wrong it is." },
{ q: "What is the danger of force feedback over a delayed link?",
o: ["The forces are scaled incorrectly", "It is a feedback loop with delay, so it can go unstable", "The operator cannot feel small forces", "It requires more bandwidth than video"],
a: 1, why: "Passivity-based approaches and wave variables restore stability by ensuring the channel cannot generate energy, at some cost in transparency." }
],
interview: {
q: "You need to teleoperate a robot over a link with half a second of latency. How would you design it?",
a: "Half a second is well past the point where direct joystick control works, so the first decision is structural: I would move the fast loops onto the robot and send intent over the link rather than commands. Instead of continuous velocity commands, the operator designates a goal, an object to grasp, or a behaviour to run, and the robot closes the position, velocity and obstacle-avoidance loops locally. That takes the delay out of every loop that needs to be fast, and leaves it only in the slow, high-level decisions, which is what makes seconds of latency workable at all. On the interface side I would use a predictive display, showing the operator where the robot is predicted to be now based on a model and the commands already sent, with the delayed real imagery overlaid so they can see both the prediction and its error. That matters because operators adapt well to a constant delay by moving and waiting, but they cope very badly with a variable one, since jitter destroys the internal model they are building; a jittery hundred milliseconds is genuinely harder to drive than a steady three hundred. So I would also work to make the latency predictable rather than merely small, which sometimes means deliberately buffering to a fixed delay. I would be cautious about force feedback, because a bilateral loop with delay in it is a feedback loop with delay and will go unstable unless I use something like a passivity-based or wave-variable formulation, which costs transparency. And I would design the loss-of-link behaviour first rather than last, because a robot that keeps executing its last command when the link drops is a runaway."
}
},

{
id: "rob-power",
track: "Robotics",
sub: "Robots in the field",
title: "Energy budgets, endurance and what actually drains the battery",
mins: 20,
body: `
<p>Endurance is a specification like any other, and it is usually met or missed by a margin
that was never budgeted. The way to get it right is to build the budget before the robot, and
to measure it afterwards rather than trusting the arithmetic.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="Where the energy goes on a typical mobile robot, from drive and payload down to standby losses">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">the energy budget, largest first</text>

<rect class="bx" x="24" y="72" width="632" height="36" rx="4"/>
<text class="ts" x="40" y="96">drive: proportional to mass, terrain and how much you accelerate</text>
<rect class="bx" x="24" y="118" width="632" height="36" rx="4"/>
<text class="ts" x="40" y="142">payload and actuators: often larger than the drive when holding a load</text>
<rect class="bx" x="24" y="164" width="632" height="36" rx="4"/>
<text class="ts" x="40" y="188">compute and sensors: constant, and unforgiving on a long mission</text>
<rect class="bx" x="24" y="210" width="632" height="34" rx="4"/>
<text class="ts" x="40" y="233">standby and quiescent losses: small, and they run all night</text>
</svg>

<p>The first surprise is usually that <b>compute is not negligible</b>. A perception stack on a
small GPU can draw more than the drive motors of a slow indoor robot, and unlike the drive it
draws that continuously rather than only while moving. Duty cycling perception when the robot is
stationary is often the single largest available saving.</p>

<p>The second is that <b>acceleration costs more than speed</b> on a stop-start mission. Energy
per metre for steady motion is set by rolling resistance and drag, but every acceleration puts
kinetic energy in that is then thrown away as heat in the brakes or the drive. A trajectory
planned to be smooth is a trajectory that is cheaper to execute.</p>

<p>The third is that <b>battery capacity is not what the label says</b> at your discharge rate,
your temperature or your state of health. Peukert's effect reduces usable capacity at high
current, cold cuts it substantially, and a cell at eighty percent of its original capacity is
still considered healthy. A budget built on nameplate capacity will be wrong by tens of
percent.</p>

<p>State of charge estimation deserves its own attention. Voltage alone is a poor indicator on
a chemistry with a flat discharge curve, and coulomb counting drifts without a reference. The
usual practical answer is coulomb counting corrected at the ends, where the voltage curve is
steep, and a conservative reserve.</p>

<p>The habit that makes all of this tractable is to <b>instrument the robot</b>: log current on
each rail alongside what the robot was doing. A week of that data turns an argument about where
the energy goes into a measurement, and it usually contradicts at least one confident
assumption.</p>
`,
quiz: [
{ q: "Why is compute often underestimated in an energy budget?",
o: ["It draws continuously, not only while moving", "It draws more current than the motors at peak", "Its consumption rises with temperature", "It cannot be measured separately"],
a: 1, why: "A perception stack can exceed the drive motors of a slow indoor robot, and duty cycling it when stationary is often the largest available saving." },
{ q: "Why does acceleration cost more than speed on a stop-start mission?",
o: ["Motors are less efficient at high torque", "Each acceleration adds kinetic energy that is then thrown away", "The controller draws more current when changing speed", "Rolling resistance rises with acceleration"],
a: 1, why: "Steady motion costs rolling resistance and drag; every stop discards the kinetic energy as heat. Smooth trajectories are cheaper to execute." },
{ q: "Why is nameplate battery capacity misleading?",
o: ["It is measured at a different voltage", "Discharge rate, temperature and age all reduce usable capacity", "It includes the reserve capacity", "It is quoted for a new cell only at high current"],
a: 1, why: "Peukert's effect, cold and state of health each cost you, and a budget built on the label will be out by tens of percent." },
{ q: "Why is voltage alone a poor state-of-charge indicator?",
o: ["It is too noisy to measure accurately", "Many chemistries have a flat discharge curve", "It changes with the ambient temperature", "It cannot be measured under load"],
a: 1, why: "Coulomb counting corrected at the ends, where the curve is steep, plus a conservative reserve, is the usual practical answer." }
],
interview: {
q: "Your robot needs eight hours of endurance and is achieving five. How would you approach it?",
a: "I would measure before I optimise, because energy budgets are usually wrong in a way nobody expects. So the first thing is instrumentation: current sensing on each rail, logged alongside what the robot was actually doing, for long enough to cover a realistic mission. That turns an argument into a measurement and it almost always contradicts one confident assumption. The three places I would expect to find the gap are these. First, compute, which people routinely leave out of the budget: a perception stack on a small GPU can exceed the drive motors of a slow indoor robot, and it draws that continuously rather than only while moving, so duty cycling perception when the robot is stationary or has nothing to look at is often the largest single saving available. Second, acceleration rather than speed, because steady motion costs rolling resistance and drag but every stop throws the kinetic energy away as heat, so a stop-start mission is dominated by the profile rather than the distance and smoothing the trajectories is nearly free. Third, the battery itself, because nameplate capacity is not what you get at your discharge rate, at your temperature, or at eighty percent state of health, and a budget built on the label can be out by tens of percent. I would also look hard at the state-of-charge estimate before trusting the five-hour figure, because voltage alone is a poor indicator on a flat discharge curve and the robot may be stopping with real capacity left. And I would set the target with a reserve rather than to the edge, because the endurance that matters is at end of life on a cold day."
}
},

{
id: "rob-hri",
track: "Robotics",
sub: "Robots in the field",
title: "Working around people: detection, prediction and legibility",
mins: 20,
body: `
<p>A robot that shares space with people has two obligations. It must not hurt anyone, which is
the safety system's job and is governed by standards. And it must be <b>predictable enough that
people can work around it</b>, which is a design problem nobody regulates and which decides
whether the installation is actually usable.</p>

<svg class="fig" viewBox="0 0 680 240" role="img" aria-label="Three layers: a certified safety layer, a perception layer detecting and predicting people, and a behaviour layer making the robot legible">
<rect class="bx" x="24" y="30" width="632" height="56" rx="4"/>
<text class="th" x="40" y="56">safety layer: certified, independent, works when the software has failed</text>
<text class="ts" x="40" y="76">light curtains, scanners, safe torque off, monitored stop</text>

<rect class="bx" x="24" y="98" width="632" height="56" rx="4"/>
<text class="th" x="40" y="124">perception layer: where are people, and where are they going</text>
<text class="ts" x="40" y="144">detection, tracking, short-horizon prediction</text>

<rect class="bx" x="24" y="166" width="632" height="56" rx="4"/>
<text class="th" x="40" y="192">behaviour layer: make the intent readable</text>
<text class="ts" x="40" y="212">speed, path shape, signalling, consistency</text>
</svg>

<p>The layers must be independent. Perception that detects people is not a safety function
unless it is certified as one, and treating a neural network's output as a safety guarantee is a
category error. The certified layer is a scanner or a curtain with a defined response time; the
perception layer makes the robot behave sensibly long before the safety layer ever fires.</p>

<p>Prediction only needs to be short. A second or two of where a person is heading is enough to
slow down, alter a path, or wait, and that is a far easier problem than long-horizon intent.
Constant-velocity extrapolation gets you a surprising distance, and the failure mode that
matters is a person changing direction, which is exactly why the safety layer is separate.</p>

<p><b>Legibility</b> is the part engineers underrate. A robot that takes a slightly longer path
which clearly signals where it is going is more useful than one taking the optimal path that
leaves people guessing. Starting to slow early, turning visibly before moving, and behaving the
same way every time are all worth more than a few percent of cycle time.</p>

<p>Consistency in particular is what allows people to build a mental model. A robot that
sometimes yields and sometimes does not teaches people to stop trusting it, and the result is
that they give it a wide berth and the throughput you designed for never materialises.</p>

<p>The evaluation worth running is not a simulation. Put people who did not build the robot
next to it, give them a job to do, and watch where they hesitate. That finds the problems no
amount of path optimisation will.</p>
`,
quiz: [
{ q: "Why can a person-detecting neural network not be the safety layer?",
o: ["It is too slow to respond in time", "It is not certified, and safety must be independent of it", "It cannot detect people at close range", "It requires too much processing power"],
a: 1, why: "The certified layer is a scanner or curtain with a defined response time. The perception layer makes the robot behave sensibly long before that fires." },
{ q: "How far ahead does human motion prediction usefully need to reach?",
o: ["Ten seconds or more", "A second or two", "The duration of the robot's whole task", "Only the current instant"],
a: 1, why: "That is enough to slow, alter a path or wait, and it is far easier than long-horizon intent. Constant-velocity extrapolation gets you a surprising distance." },
{ q: "What does legibility mean for a robot's motion?",
o: ["Its display is readable from a distance", "Its intent is obvious to a person watching", "Its path is the shortest available", "Its logs can be interpreted afterwards"],
a: 1, why: "A slightly longer path that clearly signals where the robot is going is more useful than an optimal one that leaves people guessing." },
{ q: "Why does inconsistent behaviour reduce throughput?",
o: ["It confuses the robot's own planner", "People stop trusting the robot and give it a wide berth", "It causes the safety layer to fire more often", "It increases the robot's energy consumption"],
a: 1, why: "Consistency is what lets people build a mental model. Without it they work around the robot rather than with it, and the designed throughput never appears." }
],
interview: {
q: "How would you design a mobile robot to work in a warehouse alongside people?",
a: "I would separate it into three layers that do not depend on one another. The bottom one is safety, and that has to be certified and independent: a safety-rated laser scanner or light curtain with a defined response time, feeding something like a safe torque off or a monitored stop, and it has to work when the application software has failed entirely. The thing I would be firm about is that a person-detecting neural network is not a safety function, however good it is, because it is not certified and its failure modes are not characterised; treating its output as a safety guarantee is a category error. Above that sits perception, whose job is to notice people and predict where they are going, and that only needs a short horizon. A second or two is enough to slow down, alter a path or wait, and constant-velocity extrapolation gets you surprisingly far, with the failure case being someone changing direction abruptly, which is exactly why the certified layer exists underneath. The top layer is behaviour, and this is the part engineers underrate. The robot has to be legible: people need to be able to tell what it is about to do. Slowing early, turning visibly before it moves, and above all behaving the same way every time are worth more than a few percent of cycle time, because a robot that sometimes yields and sometimes does not teaches people to distrust it, and then they give it a wide berth and the throughput I designed for never materialises. And I would evaluate it with people who did not build it, doing a real job next to it, watching where they hesitate, because that finds problems no amount of path optimisation will."
}
}

);
