// C++ lessons, second course: object lifetime and value semantics.
//
// The existing C++ lessons were a flat list. These carry a `sub` so the page
// groups them under a heading, in the same way the Embedded C track is
// organised. lessons5_cpp.js gives the original sixteen their own headings.

LESSONS.push(

{
id: "cpp-valuecat",
track: "C++",
sub: "Object lifetime and value semantics",
title: "Value categories, and why std::move is only a cast",
mins: 20,
body: `
<p>Every expression in C++ has a type and a <b>value category</b>. Most people meet the
categories only when an error message mentions them, which is a shame, because they are the
rules that decide whether your object is copied or moved.</p>

<p>There are two properties that matter. Does the expression have an <b>identity</b>, meaning
you could take its address? And can it be <b>moved from</b>, meaning nobody will look at it
again? Those two questions give three categories you actually use.</p>

<svg class="fig" viewBox="0 0 680 300" role="img" aria-label="A table of the three value categories against whether they have identity and whether they can be moved from">
<rect class="bxa" x="24" y="24" width="632" height="38" rx="4"/>
<text class="th" x="40" y="49">has identity?          can be moved from?</text>

<rect class="bx" x="24" y="74" width="632" height="60" rx="4"/>
<text class="th" x="40" y="99">lvalue        yes                    no</text>
<text class="ts" x="40" y="120">a named variable: int x; the expression x</text>

<rect class="bx" x="24" y="146" width="632" height="60" rx="4"/>
<text class="th" x="40" y="171">prvalue       no                     yes</text>
<text class="ts" x="40" y="192">a pure value: 42, or f() returning by value</text>

<rect class="bx" x="24" y="218" width="632" height="60" rx="4"/>
<text class="th" x="40" y="243">xvalue        yes                    yes</text>
<text class="ts" x="40" y="264">an expiring object: std::move(x)</text>
</svg>

<p>An <b>lvalue</b> is anything with a name. A <b>prvalue</b> is a pure value with no storage
of its own yet, such as a literal or the result of a function returning by value. An
<b>xvalue</b> is an object that still has an address but whose contents you have given
permission to steal.</p>

<p>Now the thing that surprises people. <code>std::move</code> does not move anything. It is
a cast: it takes an lvalue and produces an xvalue, so that overload resolution picks the move
constructor rather than the copy constructor. If no move constructor exists, or if the object
is const, the copy is chosen instead and you get a silent copy with no diagnostic.</p>

<p>The second surprise follows from the table. Inside a function taking a parameter declared
as an rvalue reference, that parameter <i>is a named variable</i>, so it is an lvalue. If you
pass it on without another <code>std::move</code>, you pass an lvalue and it is copied. That is
the single commonest accidental copy in modern C++.</p>

<p>The practical rules are short. Use <code>std::move</code> when you are finished with a
named object and want its contents taken. Never write it on a return of a local, because that
turns a guaranteed elision into an actual move. And never move from a const object, because
the compiler will quietly copy instead and tell you nothing.</p>
`,
quiz: [
{ q: "What does std::move actually do?",
o: ["It transfers the object's contents immediately", "It casts its argument to an rvalue reference", "It marks the source object as invalid", "It swaps the source and the destination"],
a: 1, why: "It is a cast and nothing more. Whether anything is moved depends on which overload the cast then selects, which is why moving from a const object silently copies." },
{ q: "Inside a function taking T&& x, what value category is the expression x?",
o: ["An rvalue, because of the && in its type", "An lvalue, because it is a named variable", "A prvalue until it is first used", "It has no category, since it is a reference"],
a: 1, why: "Anything with a name is an lvalue. That is exactly why you must std::move or std::forward it to pass the rvalue-ness on to the next call." },
{ q: "Why should you not write return std::move(local);?",
o: ["It is a compile error in modern C++", "It blocks copy elision and forces a real move", "The local would be destroyed too early", "It converts the move back into a copy"],
a: 1, why: "The return of a local is already treated as an rvalue and is usually elided entirely. Writing the move turns a free operation into an actual one." },
{ q: "Which category describes the result of a function returning by value?",
o: ["An lvalue, because it has storage", "A prvalue, a pure value with no identity yet", "An xvalue, because it is about to expire", "It depends on the return type"],
a: 1, why: "It has no name and no address you can take, and it can be consumed. That is what makes returning by value cheap under guaranteed elision." }
],
interview: {
q: "Can you explain what std::move does?",
a: "It is a cast, not a move. It takes an lvalue and produces an xvalue, which is an expression that still has an address but whose contents you have said may be stolen, and that is what makes overload resolution pick the move constructor instead of the copy constructor. Nothing is moved by std::move itself; the moving happens inside whichever constructor or assignment operator gets selected. Two consequences of that catch people out. The first is that moving from a const object silently gives you a copy, because a const lvalue cannot bind to an rvalue reference, so the copy constructor is selected and there is no diagnostic at all. The second is that inside a function taking an rvalue reference parameter, the parameter itself has a name, so it is an lvalue, and passing it on without another std::move copies it. That is probably the commonest accidental copy I see in modern C++. The rule I work to is that std::move means I am finished with this named object, so take its contents. I do not write it on a return of a local, because the return is already an rvalue and is usually elided outright, and writing the move turns a free operation into a real one."
}
},

{
id: "cpp-special",
track: "C++",
sub: "Object lifetime and value semantics",
title: "The special member functions, and what suppresses them",
mins: 22,
body: `
<p>There are six functions the compiler may write for you: the default constructor, the
destructor, the copy constructor, the copy assignment operator, the move constructor and the
move assignment operator. Knowing which of them you get, and what stops you getting them, is
the difference between a class that is quietly slow and one that is correct.</p>

<p>The generation rules are not symmetric, and that asymmetry is where the bugs live.</p>

<svg class="fig" viewBox="0 0 680 300" role="img" aria-label="A diagram showing that declaring a destructor suppresses the move operations while copy is still generated for compatibility">
<rect class="bxa" x="24" y="24" width="632" height="40" rx="4"/>
<text class="th" x="40" y="50">you declare a destructor</text>

<rect class="bx" x="24" y="80" width="200" height="80" rx="4"/>
<text class="ts" x="40" y="106">move constructor</text>
<text class="ts" x="40" y="126">move assignment</text>
<text class="th" x="40" y="150">NOT generated</text>

<rect class="bx" x="240" y="80" width="200" height="80" rx="4"/>
<text class="ts" x="256" y="106">copy constructor</text>
<text class="ts" x="256" y="126">copy assignment</text>
<text class="th" x="256" y="150">still generated</text>

<rect class="bx" x="456" y="80" width="200" height="80" rx="4"/>
<text class="ts" x="472" y="106">default constructor</text>
<text class="th" x="472" y="130">unaffected</text>

<rect class="bxa" x="24" y="180" width="632" height="90" rx="4"/>
<text class="th" x="40" y="206">the result</text>
<text class="ts" x="40" y="230">every move becomes a copy, silently, with no diagnostic</text>
<text class="ts" x="40" y="252">the class still compiles and still behaves correctly, only slower</text>
</svg>

<p>Declaring a destructor suppresses both move operations. Copy is still generated, for
backward compatibility with code written before moves existed. So a class that gains a
destructor for logging, or a virtual destructor for a base class, quietly loses its moves and
every move in the program becomes a copy. Nothing warns you.</p>

<p>Declaring any copy operation also suppresses the moves. Declaring any move operation
deletes both copy operations, which is the one case where the compiler does tell you, because
the copy becomes ill-formed rather than merely absent.</p>

<p>This is why the guidance is <b>the rule of zero</b>: arrange for every member to manage its
own resource, and then write none of the six. The compiler's versions are correct and they are
all generated. If you find yourself writing one of them, that is a signal that a member wants
to be a different type.</p>

<p>When you genuinely must write one, write all of them, which is the <b>rule of five</b>.
Writing one and leaving the rest to chance is how you end up with a class that copies where it
should move, or one whose move leaves the source in a state its destructor cannot handle.</p>
`,
quiz: [
{ q: "You add a destructor to a class that had none. What happens to its move operations?",
o: ["They are generated exactly as before", "They are no longer generated, so moves become copies", "They are generated but marked deleted", "The class becomes non-copyable"],
a: 1, why: "Copy is still generated for backward compatibility, so the class keeps working and simply gets slower. There is no diagnostic at all." },
{ q: "What does declaring a move constructor do to the copy operations?",
o: ["Nothing; they are still generated", "It deletes them, so copying becomes ill-formed", "It makes them private", "It generates them as shallow copies"],
a: 1, why: "This is the one case the compiler tells you about, because the copy is deleted rather than merely absent and any attempt to copy fails to compile." },
{ q: "What is the rule of zero?",
o: ["Never write a constructor of any kind", "Let members own resources so you write none of the six", "Zero-initialise every member you declare", "Avoid the free store entirely"],
a: 1, why: "If each member manages its own resource, all six compiler-generated functions are correct. Needing to write one usually means a member should be a different type." },
{ q: "Why is writing only a destructor a common source of a performance bug?",
o: ["Destructors are slower than the alternatives", "It silently turns every move into a copy", "It prevents the class being used in a container", "It forces the object onto the free store"],
a: 1, why: "A virtual destructor added to a base class, or one added for logging, suppresses both moves. Every move in the program then copies instead." }
],
interview: {
q: "What is the rule of five, and when would you apply it?",
a: "The rule of five says that if you write any one of the destructor, copy constructor, copy assignment, move constructor or move assignment, you almost certainly need to think about all five, because the compiler's generation rules are asymmetric and writing one suppresses others. The specific trap is that declaring a destructor suppresses both move operations while copy is still generated for backward compatibility, so a class that gains a destructor for logging quietly loses its moves and every move in the program becomes a copy, with no diagnostic whatsoever. Declaring a move operation, by contrast, deletes the copies, and that one you do find out about because the code stops compiling. In practice I try hard not to apply the rule of five at all, and to apply the rule of zero instead: arrange for every member to manage its own resource, typically by holding a unique_ptr or a vector rather than a raw owning pointer, and then all six compiler-generated functions are correct and I write none of them. Finding myself writing one of the five is usually a signal that a member wants to be a different type. Where I genuinely cannot avoid it, for instance wrapping a C handle, I write all of them explicitly and mark the moves noexcept, because vector will not use a throwing move during reallocation."
}
},

{
id: "cpp-elision",
track: "C++",
sub: "Object lifetime and value semantics",
title: "Copy elision, RVO, and why returning by value is free",
mins: 18,
body: `
<p>Returning a large object by value looks expensive and generally is not. The compiler is
permitted, and since C++17 in some cases required, to construct the returned object directly in
the caller's storage rather than building it and then copying or moving.</p>

<svg class="fig" viewBox="0 0 680 260" role="img" aria-label="A diagram contrasting the naive view of a return, which constructs then copies, with elision which constructs once directly in the caller's storage">
<rect class="bxa" x="24" y="24" width="300" height="36" rx="4"/>
<text class="th" x="40" y="48">the naive picture</text>
<rect class="bx" x="24" y="72" width="300" height="150" rx="4"/>
<text class="ts" x="40" y="98">1. build the object inside f()</text>
<text class="ts" x="40" y="122">2. copy or move it out</text>
<text class="ts" x="40" y="146">3. destroy the one inside f()</text>
<text class="th" x="40" y="182">two constructions</text>
<text class="ts" x="40" y="204">one destruction</text>

<rect class="bxa" x="356" y="24" width="300" height="36" rx="4"/>
<text class="th" x="372" y="48">what actually happens</text>
<rect class="bx" x="356" y="72" width="300" height="150" rx="4"/>
<text class="ts" x="372" y="98">1. build the object directly in</text>
<text class="ts" x="372" y="120">the caller's storage</text>
<text class="th" x="372" y="182">one construction</text>
<text class="ts" x="372" y="204">no copy, no move, no destruction</text>
</svg>

<p>There are two distinct mechanisms. <b>Guaranteed elision</b> applies when you return a
prvalue, such as <code>return Widget(a, b);</code>. Since C++17 there is no temporary at all;
the object is initialised in place. This works even for a type whose copy and move
constructors are both deleted.</p>

<p><b>Named return value optimisation</b> applies when you return a named local, such as
<code>return w;</code>. This one is an optimisation, not a guarantee, but every serious
compiler does it. If it cannot be applied, the return is still treated as an rvalue, so you get
a move rather than a copy.</p>

<p>The practical consequence is that you should return by value and stop reaching for an out
parameter. An out parameter forces the caller to declare an uninitialised variable first, hides
the data flow, and is no faster.</p>

<p>The one thing that reliably defeats elision is writing <code>std::move</code> on the return.
That produces an xvalue rather than a prvalue, so the guarantee no longer applies and you get
an actual move. Returning a member of a local, or one of two locals chosen by a branch, can
also defeat NRVO, which is worth knowing but rarely worth restructuring for.</p>
`,
quiz: [
{ q: "What does guaranteed copy elision apply to?",
o: ["Any return statement at all", "A returned prvalue, such as return Widget(a, b);", "Only types with a trivial copy constructor", "Only when the caller ignores the result"],
a: 1, why: "Since C++17 there is no temporary to elide; the object is initialised directly in the caller's storage. It works even for a type whose copy and move are deleted." },
{ q: "Why is return std::move(w); worse than return w;?",
o: ["It is undefined behaviour", "It defeats elision and forces an actual move", "It destroys w before the caller reads it", "It converts the move into a copy"],
a: 1, why: "The cast produces an xvalue rather than a prvalue, so the guarantee no longer applies. You turn a free operation into a real one." },
{ q: "What happens when NRVO cannot be applied to a returned local?",
o: ["The object is copied out", "The return is treated as an rvalue, so it is moved", "The code fails to compile", "The object is returned by reference"],
a: 1, why: "The standard requires the return of a local to be treated as an rvalue first, so the fallback is a move rather than a copy." },
{ q: "Why is an out parameter usually worse than returning by value?",
o: ["Out parameters cannot be const", "It forces an uninitialised variable and hides the data flow", "Return values are always faster", "Out parameters prevent inlining"],
a: 1, why: "Elision means returning by value costs nothing extra, so the out parameter buys no performance and costs clarity at every call site." }
],
interview: {
q: "Is returning a large object by value expensive?",
a: "Usually not, because of copy elision. There are two mechanisms worth separating. Guaranteed elision, since C++17, applies when you return a prvalue, so return Widget(a, b) constructs the object directly in the caller's storage with no temporary at all, and that works even for a type whose copy and move constructors are both deleted. Named return value optimisation applies when you return a named local, and that one is an optimisation rather than a guarantee, though every serious compiler does it; and if it cannot be applied, the standard still requires the return of a local to be treated as an rvalue, so the fallback is a move rather than a copy. The practical upshot is that I return by value and I do not reach for out parameters, because an out parameter forces the caller to declare an uninitialised variable, hides the direction of the data flow, and buys nothing. The one thing I am careful about is not writing std::move on the return, because that produces an xvalue rather than a prvalue and defeats the guarantee, turning a free operation into a real move. It is a very common piece of well-meant pessimisation."
}
},

{
id: "cpp-slicing",
track: "C++",
sub: "Object lifetime and value semantics",
title: "Slicing, and copying polymorphic objects safely",
mins: 18,
body: `
<p>Slicing is what happens when a derived object is copied into a base by value. The base copy
constructor copies only the base subobject, so the derived part is silently discarded and
virtual dispatch is lost. The result compiles cleanly and behaves wrongly.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A derived object with base and derived parts being copied into a base-sized slot, losing the derived part">
<rect class="bxa" x="24" y="24" width="260" height="36" rx="4"/>
<text class="th" x="40" y="48">Derived object</text>
<rect class="bx" x="24" y="72" width="260" height="60" rx="4"/>
<text class="ts" x="40" y="98">base part: vptr, base members</text>
<rect class="bx" x="24" y="140" width="260" height="60" rx="4"/>
<text class="ts" x="40" y="166">derived part: extra members</text>

<text class="th" x="308" y="112">copy by value</text>
<text class="th" x="316" y="136">into a Base</text>

<rect class="bxa" x="420" y="24" width="236" height="36" rx="4"/>
<text class="th" x="436" y="48">Base object</text>
<rect class="bx" x="420" y="72" width="236" height="60" rx="4"/>
<text class="ts" x="436" y="98">base part only</text>
<rect class="bx" x="420" y="140" width="236" height="60" rx="4"/>
<text class="ts" x="436" y="166">derived part discarded</text>
<text class="ts" x="436" y="186">vptr is now Base's</text>
</svg>

<p>The classic way to meet it is a container of base objects, or a function taking a base by
value. Passing by reference or by pointer avoids it entirely, which is why polymorphic
parameters are almost always <code>const Base&amp;</code>.</p>

<p>When you genuinely need to copy a polymorphic object, the base cannot know how. The standard
answer is a virtual <b>clone</b> function: a virtual member returning a smart pointer to a new
copy of the actual dynamic type. Each derived class overrides it to return a copy of itself,
which is the one place that knows what type it really is.</p>

<p>To make slicing impossible rather than merely unlikely, delete the base's copy operations.
Derived classes can still define their own, and any attempt to copy through a base fails to
compile. That converts a silent behavioural bug into a diagnostic, which is a very good trade.</p>

<p>The same reasoning explains why a base class destructor should be virtual whenever you
intend to delete through a base pointer. Without it the derived destructor never runs, which is
undefined behaviour and usually a leak. If you never delete polymorphically, a protected
non-virtual destructor expresses that intent and costs nothing.</p>
`,
quiz: [
{ q: "What is object slicing?",
o: ["Splitting a class across several headers", "Copying a derived object into a base by value", "Removing unused members at link time", "Truncating a value during a narrowing conversion"],
a: 1, why: "The base copy constructor copies only the base subobject, so the derived part is discarded and virtual dispatch is lost. It compiles cleanly and behaves wrongly." },
{ q: "How do you copy a polymorphic object correctly?",
o: ["Use the base's copy constructor", "A virtual clone function returning a smart pointer", "Cast to the derived type and copy that", "Copy the base and then reassign the vptr"],
a: 1, why: "Only the derived class knows its own type, so the copy has to be dispatched virtually. Each override returns a copy of itself." },
{ q: "What does deleting a base class's copy operations achieve?",
o: ["It prevents the class being derived from", "Slicing becomes a compile error rather than a silent bug", "It forces every derived class to be abstract", "It removes the need for a virtual destructor"],
a: 1, why: "Derived classes can still define their own copies, and any attempt to copy through the base fails to compile. A behavioural bug becomes a diagnostic." },
{ q: "When does a base class need a virtual destructor?",
o: ["Whenever it has any virtual function", "Whenever you delete a derived object through a base pointer", "Whenever it has data members", "Only when it manages a resource"],
a: 1, why: "Without it the derived destructor never runs, which is undefined behaviour and usually a leak. If you never delete polymorphically, a protected non-virtual destructor says so." }
],
interview: {
q: "What is slicing and how do you avoid it?",
a: "Slicing is what happens when a derived object is copied into a base by value. The base copy constructor only knows about the base subobject, so the derived part is discarded and the vptr ends up being the base's, which means virtual dispatch is lost as well. The nasty thing about it is that it compiles perfectly cleanly and simply behaves wrongly, so it tends to be found by a failing test rather than by the compiler. The usual ways to meet it are a container of base objects and a function taking a base by value, and both are avoided by using references or pointers instead, which is why polymorphic parameters are nearly always a const reference to the base. Where I actually need to copy a polymorphic object, I use a virtual clone function that returns a smart pointer, because the derived class is the only thing that knows what type it really is. And if I am designing the base myself, I delete its copy operations, which turns slicing from a silent behavioural bug into a compile error while still letting derived classes define their own copying. That same design conversation is where I would also decide whether the destructor needs to be virtual, which it does if anyone will ever delete through a base pointer."
}
},

{
id: "cpp-dangling",
track: "C++",
sub: "Object lifetime and value semantics",
title: "Temporaries, lifetime extension, and dangling references",
mins: 20,
body: `
<p>A temporary lives until the end of the full expression that created it. That single sentence
explains most dangling reference bugs, and the one exception to it explains the rest.</p>

<p>The exception is <b>lifetime extension</b>: binding a temporary to a const reference, or to
an rvalue reference, extends its life to that of the reference. It is genuinely useful and it
is also narrower than people assume.</p>

<svg class="fig" viewBox="0 0 680 280" role="img" aria-label="Two cases contrasted: binding a temporary to a const reference extends its lifetime, while binding to a reference member or returning it does not">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">a temporary bound to a const reference</text>

<rect class="bx" x="24" y="72" width="308" height="90" rx="4"/>
<text class="th" x="40" y="98">local reference</text>
<text class="ts" x="40" y="122">lifetime is extended</text>
<text class="ts" x="40" y="144">safe, and genuinely useful</text>

<rect class="bx" x="348" y="72" width="308" height="90" rx="4"/>
<text class="th" x="364" y="98">reference member of a class</text>
<text class="ts" x="364" y="122">NOT extended</text>
<text class="ts" x="364" y="144">dangles as soon as the ctor returns</text>

<rect class="bx" x="24" y="178" width="308" height="80" rx="4"/>
<text class="th" x="40" y="204">returned from a function</text>
<text class="ts" x="40" y="228">NOT extended</text>
<text class="ts" x="40" y="248">dangles immediately</text>

<rect class="bx" x="348" y="178" width="308" height="80" rx="4"/>
<text class="th" x="364" y="204">passed on through another reference</text>
<text class="ts" x="364" y="228">NOT extended past the first binding</text>
</svg>

<p>Extension happens only at the point a temporary binds <i>directly</i> to a reference. It
does not survive being returned, and it does not apply to a reference member initialised in a
constructor's initialiser list, which is a trap because that code looks entirely reasonable.</p>

<p>The modern versions of this bug involve the non-owning view types. A
<code>std::string_view</code> built from a temporary <code>std::string</code> dangles at the
end of the full expression, and so does a <code>std::span</code> over a temporary vector.
Neither type extends anything, because neither is a reference in the language's sense.</p>

<p>The rule of thumb worth internalising is that view types belong in <b>parameters</b>. As a
return type or a class member they are a lifetime obligation you are handing to somebody who
cannot see it. Where the lifetime is not obvious at a glance, return an owning type and let the
caller decide whether to keep it.</p>

<p>Ranged-for over a temporary was the other classic case: the range expression's temporary was
extended, but a temporary inside it was not. C++23 fixed the common form of it, though on any
older toolchain it remains a live hazard worth knowing.</p>
`,
quiz: [
{ q: "How long does a temporary live by default?",
o: ["Until the end of the enclosing block", "Until the end of the full expression", "Until the next sequence point", "Until the reference to it goes out of scope"],
a: 1, why: "That single rule explains most dangling reference bugs. Lifetime extension is the exception, and it is narrower than people expect." },
{ q: "Does binding a temporary to a reference member in a constructor extend its lifetime?",
o: ["Yes, to the lifetime of the object", "No, it dangles as soon as the constructor returns", "Yes, but only for const references", "Only if the member is initialised in the body"],
a: 1, why: "Extension applies only where a temporary binds directly to a reference in the same scope. The initialiser list case looks reasonable and is a trap." },
{ q: "Why does a string_view built from a temporary string dangle?",
o: ["string_view copies lazily and runs out of memory", "It is not a reference, so nothing is extended", "The string is moved rather than copied", "string_view always requires a null terminator"],
a: 1, why: "It is a non-owning pointer and length, and lifetime extension applies to references. The temporary dies at the end of the full expression." },
{ q: "Where do view types such as span and string_view belong?",
o: ["As return types, to avoid copies", "In parameters, where the caller owns the data", "As class members, to reduce object size", "Anywhere, since they manage their own lifetime"],
a: 1, why: "As a return type or a member they hand somebody a lifetime obligation they cannot see. In a parameter the caller's object plainly outlives the call." }
],
interview: {
q: "When is it safe to return a std::string_view?",
a: "Almost never, and I treat it as a rule that view types belong in parameters rather than in return types or class members. A string_view is a non-owning pointer and length, so it has no say in the lifetime of what it points at, and lifetime extension does not help because extension is a rule about binding temporaries to references and a view is not a reference. So returning a view of a local string, or of a temporary constructed at the call site, dangles the moment the full expression ends. The cases where returning one is defensible are where the underlying storage plainly outlives the call and the caller can see that: a view into a string literal, or into a buffer the caller itself owns and passed in. Even then I would think about whether the saved allocation is worth the obligation I am handing over, because the failure mode is a use-after-free that often reproduces only under load or under a different allocator. The same reasoning applies to std::span over a temporary vector. In a parameter, by contrast, a view is exactly right: the caller's object obviously outlives the call, and it accepts a string, a literal or a buffer without forcing an allocation or a template."
}
},

{
id: "cpp-conversions",
track: "C++",
sub: "Object lifetime and value semantics",
title: "Implicit conversions, explicit, and narrowing",
mins: 18,
body: `
<p>C++ will convert types for you in a great many places, and most of the time that is
convenient. The cases where it is not convenient are the ones that pick a surprising overload
or lose data without a word.</p>

<p>A single-argument constructor defines an implicit conversion from its parameter type to your
class. That means a function taking your type can be called with an int, or a string, and the
compiler will build a temporary to make it work. Marking the constructor <code>explicit</code>
stops that, and it is the right default for anything except a deliberate conversion type.</p>

<svg class="fig" viewBox="0 0 680 250" role="img" aria-label="A diagram showing an integer being implicitly converted through a single-argument constructor, and explicit blocking it">
<rect class="bxa" x="24" y="24" width="632" height="36" rx="4"/>
<text class="th" x="40" y="48">void draw(Widget w);      called as draw(42);</text>

<rect class="bx" x="24" y="76" width="308" height="140" rx="4"/>
<text class="th" x="40" y="102">Widget(int);</text>
<text class="ts" x="40" y="128">compiles</text>
<text class="ts" x="40" y="150">a temporary Widget is built</text>
<text class="ts" x="40" y="172">from 42, silently</text>
<text class="ts" x="40" y="198">rarely what you meant</text>

<rect class="bx" x="348" y="76" width="308" height="140" rx="4"/>
<text class="th" x="364" y="102">explicit Widget(int);</text>
<text class="ts" x="364" y="128">does not compile</text>
<text class="ts" x="364" y="150">caller must write</text>
<text class="ts" x="364" y="172">draw(Widget(42))</text>
<text class="ts" x="364" y="198">the intent is now visible</text>
</svg>

<p>The arithmetic conversions are the other half of the story. Mixing signed and unsigned in one
expression converts the whole expression to unsigned, so a negative value becomes a very large
positive one. Comparing a signed loop counter against an unsigned <code>size()</code> is the
everyday form of this, and it is why compilers have a warning for it that is worth enabling as
an error.</p>

<p>Narrowing is the other loss. Assigning a wider type to a narrower one truncates silently in
an ordinary assignment. Brace initialisation forbids narrowing, which is one of the better
reasons to prefer braces: <code>int x{someDouble};</code> is a compile error where
<code>int x = someDouble;</code> is not.</p>

<p>The defensive habits are short. Make single-argument constructors explicit unless you
genuinely want the conversion. Use braces for initialisation so narrowing is diagnosed. Enable
the sign-compare and conversion warnings and treat them as errors. And where a value carries a
unit, give it a strong type so that metres and milliseconds cannot be swapped without a
diagnostic.</p>
`,
quiz: [
{ q: "What does marking a single-argument constructor explicit prevent?",
o: ["The constructor from being called at all", "Implicit conversion from the argument type", "Copy construction of the same type", "Brace initialisation of the class"],
a: 1, why: "It stops the compiler silently building a temporary of your type from an int or a string at a call site, which is how a surprising overload gets selected." },
{ q: "What happens when a signed and an unsigned operand are mixed in one expression?",
o: ["The unsigned operand is converted to signed", "The whole expression becomes unsigned", "The compiler rejects the expression", "The result is implementation defined"],
a: 1, why: "A negative value becomes a very large positive one. Comparing a signed counter against an unsigned size() is the everyday form of this bug." },
{ q: "What does brace initialisation forbid that ordinary assignment allows?",
o: ["Narrowing conversions", "Calling an explicit constructor", "Initialising from a temporary", "Aggregate initialisation"],
a: 1, why: "int x{someDouble} is a compile error where int x = someDouble is not. That diagnostic is one of the better reasons to prefer braces." },
{ q: "Why give a value carrying a unit its own strong type?",
o: ["It is faster to pass in a register", "Metres and milliseconds cannot then be swapped silently", "It allows arithmetic operators to be overloaded", "It prevents the value being copied"],
a: 1, why: "Both being int is exactly how they get swapped. A distinct type makes the mistake a compile error and costs nothing at run time." }
],
interview: {
q: "Why would you mark a constructor explicit?",
a: "Because a single-argument constructor defines an implicit conversion from its parameter type to my class, and that conversion then applies silently at every call site. So a function taking my type can be called with an int and the compiler will build a temporary to make it work, which is rarely what I meant and is a good way to have a surprising overload selected. Marking it explicit means the caller has to name the conversion, so the intent is visible in the code. I treat explicit as the default and only leave it off where the conversion genuinely is the point of the type, something like a wrapper whose whole purpose is to be constructed from the thing it wraps. It is part of a broader habit around conversions in C++, which is that the language will convert a great deal for you and most of the failures are silent. The other two I actively defend against are mixing signed and unsigned in one expression, where the whole expression becomes unsigned and a negative value turns into a very large positive one, and narrowing on assignment. For narrowing I use brace initialisation, because braces forbid it and give me a diagnostic where a plain assignment would just truncate. And I turn the sign-compare and conversion warnings on as errors, because those are exactly the cases the compiler can see and I cannot."
}
}

);
