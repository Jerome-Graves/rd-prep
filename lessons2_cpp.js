// R&D Prep lesson data, part 2: modern C++ track continued.
// Same shape as data.js. Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "cpp-errors",
track: "C++",
title: "Error handling: exceptions, codes and expected",
mins: 30,
body: `
<p>C++ gives you three mainstream ways to report failure: exceptions, error codes and
value-or-error types such as std::optional and std::expected. A senior engineer is not
expected to declare one of them the winner; they are expected to know the trade-offs and
apply one policy consistently across a codebase.</p>
<h3>Exceptions and the safety guarantees</h3>
<p>An exception propagates automatically until something catches it, which keeps the
happy path clean but means any call can be an exit point. That is why exception safety
is described as a set of guarantees a function offers:</p>
<ul>
<li><b>Basic guarantee</b>: if an exception escapes, no resources leak and every object
is left in a valid (if unspecified) state.</li>
<li><b>Strong guarantee</b>: the operation either completes or has no effect, like a
transaction. std::vector::push_back offers this.</li>
<li><b>No-throw guarantee</b>: the operation cannot fail. Destructors, swaps and move
constructors should live here.</li>
</ul>
<p>RAII is what makes the basic guarantee cheap: if every resource is owned by a stack
object, stack unwinding releases everything for free. Code that mixes exceptions with
manual cleanup is the worst of both worlds.</p>
<h3>noexcept</h3>
<p>Marking a function noexcept is a promise: if it throws anyway, std::terminate runs.
The promise matters for performance as well as documentation, because std::vector will
only move elements during reallocation if the move constructor is noexcept; otherwise it
copies to preserve the strong guarantee. Mark moves, swaps and destructors noexcept and
measure the difference on reallocation-heavy code.</p>
<h3>Error codes</h3>
<p>Codes are explicit and predictable: the failure is visible in the signature and
nothing unwinds. The cost is discipline, because the compiler does not force the caller
to check, and out-parameters clutter interfaces. [[nodiscard]] on the return type
recovers some safety by making an ignored result a warning.</p>
<h3>optional and expected</h3>
<p>std::optional&lt;T&gt; says "a T, or nothing", which suits lookups where absence is
not an error. std::expected&lt;T, E&gt; (C++23) says "a T, or this specific error E",
which carries the reason as well as the fact of failure:</p>
<pre>std::expected&lt;Frame, AdcError&gt; read_frame();

auto r = read_frame();
if (!r) {
    log(r.error());          // typed error, no unwinding
    return;
}
process(*r);</pre>
<p>This style keeps failure in the type system: the caller cannot pretend the function
always succeeds, because the value has to be unwrapped.</p>
<h3>Embedded no-exception builds</h3>
<p>Most firmware is compiled with -fno-exceptions, for honest reasons: unwinding tables
cost flash, worst-case timing of a throw is hard to bound, and a bare-metal target may
have no unwinder at all. In that world a throw becomes an abort, so the standard library
must be used carefully (at() and bad_alloc paths are off the table) and expected-style
returns become the natural error channel. The good news is that the design discipline is
identical: decide what each layer can recover from, keep the error type meaningful, and
never report failure through a value that a caller can silently drop. My rule of thumb:
exceptions for rare, truly exceptional failures in hosted code; expected or codes for
routine, local failures and for firmware; optional only when absence is a normal
answer, because it cannot say why something failed.</p>`,
quiz: [
{ q: "Which exception safety guarantee means 'the operation either completes or has no effect'?",
o: ["Basic guarantee", "Strong guarantee", "No-throw guarantee", "Weak guarantee"],
a: 1, why: "The strong guarantee is transactional: on failure the program state is unchanged. The basic guarantee only promises validity and no leaks." },
{ q: "What happens if a function marked noexcept throws?",
o: ["The exception propagates normally", "The exception is silently swallowed", "std::terminate is called", "It becomes undefined behaviour"],
a: 2, why: "noexcept is enforced: a throw that escapes a noexcept function calls std::terminate rather than unwinding." },
{ q: "Why should move constructors be noexcept where possible?",
o: ["It makes them run faster per call", "Containers like vector will move instead of copy during reallocation", "The compiler requires it", "It removes the need for a destructor"],
a: 1, why: "vector must keep its strong guarantee during reallocation, so it only uses element moves it knows cannot throw; otherwise it falls back to copying." },
{ q: "Which return type communicates 'a value, or a typed reason for failure'?",
o: ["std::optional of T", "a bool plus an out-parameter", "a raw error code int", "std::expected of T and E"],
a: 3, why: "expected carries either the value or a specific error object, so the caller learns why it failed and must unwrap to get the value." }
],
interview: {
q: "Your team is starting a mixed codebase: Linux tooling plus STM32 firmware. What error handling policy do you set?",
a: "I would set one policy per environment and write it down. The firmware builds with no exceptions, so there the rule is expected-style returns or error codes with [[nodiscard]], enums with meaningful values, and a hard rule that no failure is reported through a value a caller can ignore. On the hosted tooling side I would allow exceptions for genuinely exceptional conditions like failed allocation or broken invariants, keep them rare, and require RAII everywhere so unwinding is safe by construction. The shared libraries between the two must use the firmware-safe subset. What I would resist is a mix of styles inside one layer, because inconsistent error contracts are how failures get dropped on the floor."
}
},

{
id: "cpp-lambdas",
track: "C++",
title: "Lambdas, callables and std::function",
mins: 25,
body: `
<p>A lambda is compiler shorthand for a small class with an operator(). The capture list
defines that class's member variables, which is why the interesting questions about
lambdas are really questions about object lifetime and storage.</p>
<pre>int gain = 4;
auto scale = [gain](int sample) { return sample * gain; };
// roughly equivalent to:
struct Scale {
    int gain;
    int operator()(int sample) const { return sample * gain; }
};</pre>
<h3>Captures: value, reference and the dangling trap</h3>
<ul>
<li><b>[x]</b> captures a copy at the point the lambda is created, not when it runs.
Later changes to the original are not seen.</li>
<li><b>[&amp;x]</b> captures a reference. Cheap, live, and dangerous: if the lambda
outlives x, the call is undefined behaviour.</li>
<li><b>[=] and [&amp;]</b> capture everything used, by value or reference. Fine for
short local lambdas; risky as defaults in stored callbacks.</li>
<li><b>[this]</b> captures the object pointer. A member callback registered with a
driver and invoked after the object is destroyed is the classic firmware crash. Either
guarantee the object outlives the registration or capture shared state explicitly.</li>
</ul>
<p>The rule of thumb: a lambda that is called before the end of the current scope may
capture by reference; a lambda that is stored (a callback, a task, a queued handler)
should capture by value or take ownership with a move capture, for example
[buf = std::move(buf)].</p>
<h3>Generic lambdas</h3>
<p>Using auto in the parameter list, [](auto x) { return x * 2; }, gives operator() a
template parameter. One lambda then works across types, which is handy with algorithms
where the element type is noisy to spell.</p>
<h3>What does a lambda cost?</h3>
<p>By itself, usually nothing. A non-capturing lambda passed to std::sort typically
inlines completely and beats a function pointer, because the comparator type is known at
compile time. Captures add the size of the captured members, on the stack, with no heap
involvement.</p>
<h3>std::function is the expensive one</h3>
<p>std::function&lt;int(int)&gt; is a type-erasing wrapper that can hold any callable
with a matching signature. That flexibility has a price: a possible heap allocation when
the callable is too big for the small-buffer optimisation, an indirect call that resists
inlining, and a larger object to copy around. None of that matters for a UI button
handler; all of it matters in a sample-rate loop or an interrupt path.</p>
<h3>Passing callables to APIs</h3>
<ul>
<li><b>Template parameter</b> (like the standard algorithms): fastest, inlines, but
must live in a header.</li>
<li><b>std::function</b>: use when you must store heterogeneous callbacks or keep the
implementation out of the header, and the call rate is modest.</li>
<li><b>Function pointer plus void* context</b>: the C ABI pattern; still what many
vendor SDKs and RTOS APIs demand. A captureless lambda converts to a plain function
pointer, which is a neat way to satisfy those APIs.</li>
</ul>
<p>Choose per call site: hot paths get templates or raw function pointers, cold
configurable paths can afford std::function.</p>`,
quiz: [
{ q: "A lambda captures a local variable by reference and is stored as a callback fired later. What is the risk?",
o: ["The variable is copied twice", "The callback dangles once the variable goes out of scope", "The lambda cannot be stored at all", "The capture silently becomes by-value"],
a: 1, why: "Reference captures do not extend lifetime. Once the local dies, invoking the stored lambda touches a dead object, which is undefined behaviour." },
{ q: "When does a by-value capture take its copy of the variable?",
o: ["When the lambda is created", "When the lambda is first called", "On every call", "When the lambda is destroyed"],
a: 0, why: "Value captures are copied into the closure object at creation. Later changes to the original are not observed." },
{ q: "Which callable choice is generally cheapest in a per-sample hot loop?",
o: ["std::function stored in a member", "A virtual method call", "A shared_ptr to a functor", "A lambda passed as a template parameter"],
a: 3, why: "A template parameter preserves the concrete type, so the compiler can inline the call. std::function and virtual calls are indirect and resist inlining." },
{ q: "Why can a captureless lambda be passed to a C SDK expecting a function pointer?",
o: ["The compiler heap-allocates a trampoline", "It cannot; a wrapper is always needed", "Captureless lambdas convert implicitly to a plain function pointer", "std::function performs the conversion"],
a: 2, why: "With no captures there is no state, so the standard provides an implicit conversion to an ordinary function pointer." }
],
interview: {
q: "A code review shows a driver storing std::function callbacks invoked from a 100 kHz sampling loop. How do you respond?",
a: "First I would measure, because the review should be driven by numbers, not taste. But my expectation is that std::function hurts here: the call is indirect so it will not inline, and if any callback captures more than the small-buffer size we are paying a heap allocation at registration and cache misses at call time. I would propose making the driver a template on the callable, or, if we need a stable ABI, a function pointer with a context pointer, which captureless lambdas satisfy directly. I would also audit every capture for lifetime: stored callbacks must capture by value or own their state. std::function is fine for cold configuration paths; a sample-rate loop is not one."
}
},

{
id: "cpp-constexpr",
track: "C++",
title: "Compile-time C++",
mins: 25,
body: `
<p>Modern C++ lets you move real computation from runtime to compile time. For firmware
this is not an academic trick: it converts RAM initialisation code into flash-resident
constants, removes start-up cost, and turns whole categories of bug into compile
errors.</p>
<h3>constexpr variables and functions</h3>
<p>A constexpr variable is a true compile-time constant, usable as an array bound or a
template argument, and unlike a #define it has a type and a scope. A constexpr function
is one the compiler may evaluate at compile time when its inputs are constants; called
with runtime values, it behaves as a normal function. One definition, two uses.</p>
<pre>constexpr std::uint32_t baud_divisor(std::uint32_t clk, std::uint32_t baud) {
    return (clk + baud / 2) / baud;
}
constexpr auto div = baud_divisor(48'000'000, 115'200);   // computed by the compiler
static_assert(div &gt; 0, "divisor underflow");</pre>
<p>A useful side effect: evaluation in a constant expression must be free of undefined
behaviour, so signed overflow or an out-of-range index inside a constexpr evaluation is
a compile error, not a latent bug.</p>
<h3>static_assert</h3>
<p>static_assert checks a condition during compilation and fails the build with your
message. It is the right home for protocol invariants: struct sizes matching a wire
format, buffer counts being powers of two, a table having one entry per enum value.
Every static_assert is a test that runs on every build of every configuration and costs
zero bytes.</p>
<h3>if constexpr</h3>
<p>if constexpr chooses a branch at compile time and discards the other entirely, so the
rejected branch does not even have to compile for the current types. In template code it
replaces tag dispatch and specialisation gymnastics: one function can handle 8-bit and
16-bit sample types with genuinely different code in each branch and no runtime test.</p>
<h3>Lookup tables at compile time</h3>
<p>The classic firmware pattern is a table generated by a Python script and pasted into
a source file. constexpr replaces the script:</p>
<pre>constexpr auto make_sine() {
    std::array&lt;std::int16_t, 256&gt; t{};
    for (std::size_t i = 0; i &lt; t.size(); ++i)
        t[i] = static_cast&lt;std::int16_t&gt;(32767.0 * approx_sin(i));
    return t;
}
constexpr auto SINE = make_sine();   // baked into flash, no start-up cost</pre>
<p>The table lands in read-only storage, the generator lives next to the code it feeds,
and changing the table size is a one-line edit with no external toolchain step.</p>
<h3>When does it shrink firmware?</h3>
<p>Compile-time evaluation wins when it deletes runtime machinery: an init routine that
filled a RAM table disappears, along with the RAM copy; a floating point calculation
folded at compile time can remove the only reason a soft-float library was linked;
constant-folded configuration lets the linker drop unreachable branches. It is not
free in every direction: an enormous constexpr table still occupies flash, and heavy
compile-time computation slows builds. The habit to adopt is simple: anything knowable
at build time (CRC tables, gain curves, pin maps, divisors) should be constexpr, checked
by static_assert, and the map file should confirm the win.</p>`,
quiz: [
{ q: "What happens when a constexpr function is called with runtime arguments?",
o: ["It fails to compile", "It runs at runtime like a normal function", "It returns zero", "The compiler caches the result"],
a: 1, why: "constexpr means the function may be evaluated at compile time when inputs allow it; with runtime inputs it is simply an ordinary call." },
{ q: "Which is a key advantage of if constexpr over a regular if in template code?",
o: ["It runs faster at runtime than a predicted branch", "It can test runtime values too", "The discarded branch is not instantiated, so it need not compile for the current type", "It removes the need for headers"],
a: 2, why: "if constexpr discards the untaken branch at compile time, so code invalid for the current template arguments is simply not instantiated." },
{ q: "Signed integer overflow occurring inside a constant expression evaluation results in:",
o: ["A compile error", "Wrap-around behaviour", "Undefined behaviour at runtime", "An exception"],
a: 0, why: "Constant expressions must be free of undefined behaviour, so the compiler rejects the evaluation and the build fails, surfacing the bug early." },
{ q: "A constexpr-generated lookup table in firmware typically lives where?",
o: ["In heap memory allocated at boot", "In RAM, filled by start-up code", "On the stack of main", "In read-only flash with no start-up cost"],
a: 3, why: "The compiler computes the table and emits it as constant data, so it is flashed as-is and needs no runtime initialisation or RAM copy." }
],
interview: {
q: "Your codebase generates lookup tables with Python scripts run by the build system. Would you migrate them to constexpr, and how?",
a: "Mostly yes, incrementally. I would start with the tables whose generators are simple arithmetic, port each script into a constexpr function returning a std::array, and add static_asserts that pin known values so the port is proven equivalent to the old output. The wins are concrete: the generator lives in the same language and file as its consumer, table size changes are one-line edits, and there is one less toolchain dependency and build step to maintain. I would keep Python for tables needing heavy numerics or external data files, since compile-time evaluation of those hurts build times. I would also check the map file after each migration to confirm the data stayed in flash and start-up code shrank."
}
},

{
id: "cpp-strings",
track: "C++",
title: "Strings, string_view and text",
mins: 25,
body: `
<p>Text handling is where C++ code quietly allocates, copies and occasionally dangles.
Knowing what std::string actually does, and when std::string_view is safe, removes most
of the surprises.</p>
<h3>std::string internals and SSO</h3>
<p>A std::string owns a growable character buffer. For short strings, implementations
use the small string optimisation (SSO): the characters are stored inside the string
object itself, typically up to around 15 chars on 64-bit libstdc++ and 22 on libc++,
with no heap allocation at all. Beyond that, the buffer moves to the heap and grows
geometrically like a vector. Consequences worth knowing: short strings are cheap to
copy and create; long strings cost an allocation; and any operation that can reallocate
(append, resize) invalidates pointers and iterators into the string, including the
result of c_str().</p>
<h3>string_view: a borrowed window</h3>
<p>std::string_view is a pointer and a length. It owns nothing, allocates nothing, and
can refer into a std::string, a string literal or a char buffer. Substrings become
free: view.substr() adjusts a pointer and a length instead of allocating a new
string.</p>
<pre>void log_tag(std::string_view tag);      // accepts string, literal, buffer
log_tag("adc");                          // no std::string constructed
log_tag(name);                           // no copy of name</pre>
<p>As a read-only parameter type, string_view is almost always right: it replaces both
const std::string&amp; (which forces a conversion when passed a literal) and the
C-style pair of pointer and length.</p>
<h3>The lifetime danger</h3>
<p>Because a view borrows, it dangles the moment its source dies or reallocates:</p>
<pre>std::string_view v = make_name();        // temporary string destroyed here; v dangles
std::string s = "scan";
std::string_view w = s;
s += "_2026";                            // may reallocate; w now dangles</pre>
<p>Also, a view is not guaranteed null-terminated, so never hand view.data() to an API
expecting a C string. House rules that work: string_view for parameters, std::string
for storage and members, and returning string_view only from functions whose owner
plainly outlives the caller's use, such as a view into a static table.</p>
<h3>Formatting options</h3>
<p>You have four generations of tooling: sprintf (fast, familiar, type-unsafe, buffer
overflow prone), iostreams (type-safe but verbose, stateful and heavy for firmware),
std::to_string (fine for quick integer conversion), and std::format (C++20), which
brings Python-style, type-checked formatting: std::format("gain={} db", g). The format
string is checked at compile time, so a mismatched argument is a build error rather
than stack corruption. On embedded targets where std::format is unavailable or too
large, a bounded snprintf with compiler format-checking enabled remains the pragmatic
choice.</p>
<h3>Parsing safely</h3>
<p>atoi returns zero on failure, indistinguishable from parsing "0", and strtol has an
awkward errno protocol. Prefer std::from_chars: it is locale-independent, non-throwing,
non-allocating, and reports both the error and how far it read, which makes it right
for parsing protocol fields and sensor output. Check every parse result; text from
hardware, files or networks is hostile input, and length-checked, error-checked parsing
is the difference between a rejected packet and a corrupted state machine.</p>`,
quiz: [
{ q: "What does the small string optimisation avoid for short strings?",
o: ["Copying characters at all", "A heap allocation", "Null termination", "Bounds checking"],
a: 1, why: "SSO stores short contents inside the string object itself, so creating or copying a short string touches no heap." },
{ q: "A string_view is created over a std::string, then the string has text appended. The view is now:",
o: ["Automatically resized to match", "Still valid but shorter", "Possibly dangling, because append may reallocate the buffer", "Converted into an owning string"],
a: 2, why: "Appending can reallocate the string's buffer. The view still points at the old memory, so using it is undefined behaviour." },
{ q: "Why is string_view usually a better read-only parameter than const std::string reference?",
o: ["It is null-terminated", "It accepts literals and buffers without constructing a temporary string", "It can modify the caller's string", "It extends the argument's lifetime"],
a: 1, why: "Passing a literal to a const string reference materialises a temporary std::string, often allocating. A view binds to any contiguous characters for free." },
{ q: "Which parsing facility is non-throwing, locale-independent and reports exactly where parsing stopped?",
o: ["atoi", "std::stoi", "sscanf", "std::from_chars"],
a: 3, why: "from_chars was designed for exactly this: no locale, no exceptions, no allocation, and an explicit error code plus end pointer." }
],
interview: {
q: "You are reviewing a parser for an instrument's ASCII protocol built on atoi and sscanf. What would you change and why?",
a: "The core problem is that failures are invisible: atoi returns zero on garbage, which is indistinguishable from a genuine zero, so a corrupted field silently becomes valid-looking data. I would move the field extraction to std::string_view, so slicing the packet into tokens allocates nothing, and parse each numeric field with std::from_chars, checking the error code and the end pointer on every call. Anything unparsed rejects the whole packet. I would keep ownership boundaries clear: views during parsing, owning strings only where a field is stored beyond the packet's lifetime. The result is a parser that treats the wire as hostile input, fails loudly and early, and is faster than the original because it stopped allocating."
}
},

{
id: "cpp-build",
track: "C++",
title: "Builds, linkage and the ODR",
mins: 30,
body: `
<p>Half of the mysterious problems in C++ (undefined references, duplicate symbols,
impossible crashes after a header edit) are build-model problems, not language
problems. The model is old but simple, and knowing it turns linker errors from voodoo
into diagnosis.</p>
<h3>Translation units</h3>
<p>The compiler never sees your project; it sees one translation unit at a time: a
single .cpp file after the preprocessor has pasted in every #include. Each unit is
compiled to an object file in isolation. The linker then stitches the object files
(and libraries) together, matching every symbol a unit uses against exactly one
definition somewhere else.</p>
<h3>Headers versus sources</h3>
<p>A header holds what other units need to see: declarations, type definitions,
templates, inline functions and constants. A source file holds the definitions that
must exist exactly once. Declarations promise that something exists; definitions
actually create it. Forgetting the distinction produces the two classic linker errors:
an undefined reference (you declared it, nothing defined it, or the library providing
it was not linked) and a duplicate symbol (you defined a function in a header without
inline, and two units both included it).</p>
<h3>The One Definition Rule</h3>
<p>The ODR says every entity has exactly one definition per program, and that entities
defined in multiple units (templates, inline functions) must have identical definitions
everywhere. The nasty violations are the silent ones: two .cpp files compiled with a
different value of a #define that changes a struct's members, or two versions of a
header in the include path. The linker is not obliged to notice; you get one layout
chosen arbitrarily and a crash that moves when you rebuild. Defences: never let
compile-time flags change types in shared headers, keep one canonical include path per
dependency, and take odr-violation warnings from sanitizers seriously.</p>
<h3>inline today</h3>
<p>Modern inline does not mean "please inline this call"; the optimiser decides that on
its own. inline means "this definition may legally appear in multiple translation
units; linker, fold the copies into one". That is why header-defined functions and
C++17 inline variables need the keyword, and why a header-only library is possible at
all.</p>
<h3>Static versus dynamic linking</h3>
<p>Static linking copies the needed library code into your binary: self-contained,
fast to load, and the norm for firmware images. Dynamic linking resolves symbols at
load time against a shared library: smaller binaries, one copy of a library shared by
many processes, patchable independently, but you take on versioning and deployment
risk. For instruments in the field, static linking's reproducibility (the .elf you
tested is exactly what runs) is usually worth the size.</p>
<h3>Why CMake</h3>
<p>CMake is not loved, but it is the lingua franca: it describes targets (libraries,
executables), their sources, include directories and dependencies, then generates the
actual build for Make, Ninja or an IDE. Almost every third-party C++ library ships
CMake support, IDEs and CI systems consume it natively, and cross-compiling for an ARM
target is a toolchain file rather than a rewrite. Fighting it costs more than learning
target_link_libraries.</p>
<h3>Include hygiene</h3>
<p>Every file includes what it uses and relies on nothing arriving transitively; use
include guards or #pragma once; prefer forward declarations in headers where a type is
only named, because trimming header dependencies is the single cheapest way to cut
incremental build times on a growing codebase.</p>`,
quiz: [
{ q: "What does the compiler actually compile at one time?",
o: ["The whole project at once", "One translation unit: a source file plus its expanded includes", "One function at a time across files", "Only files that changed since the last link"],
a: 1, why: "Each .cpp is compiled independently after preprocessing into an object file; only the linker sees the program as a whole." },
{ q: "Defining a non-inline function in a header included by two .cpp files causes:",
o: ["An undefined reference at link time", "A compile error in the header", "A duplicate symbol error at link time", "Nothing; the linker folds them silently"],
a: 2, why: "Both translation units emit a definition of the same symbol, and the linker rejects the duplicate. inline is what permits multi-unit definitions." },
{ q: "In modern C++, the inline keyword primarily means:",
o: ["Force the optimiser to inline calls", "The definition may appear in multiple translation units and will be folded", "The function is faster", "The function cannot be exported"],
a: 1, why: "Inlining of calls is the optimiser's decision. The keyword's real meaning is linkage: multiple identical definitions are allowed and merged." },
{ q: "Two source files include the same struct definition, but one is compiled with a define that adds a member. This is:",
o: ["A silent ODR violation that can crash without any build error", "Caught reliably by the linker", "Legal if the struct is unused", "A syntax error"],
a: 0, why: "The ODR requires identical definitions across units. Tools are not required to diagnose this, so you get mismatched layouts and arbitrary corruption." }
],
interview: {
q: "A colleague hits 'undefined reference' errors and starts adding extern and includes at random. How do you debug it properly?",
a: "I would slow it down and read the error, because the linker tells you the exact mangled symbol and which object file wanted it. First question: is the missing symbol something we define, or something from a library? If it is ours, I check that the .cpp defining it is actually in the target's source list and that the signature matches the declaration exactly, since a const or reference mismatch creates a different symbol. If it is third-party, the library is missing from target_link_libraries or the link order is wrong. Includes are irrelevant here; headers only satisfy the compiler. Explaining that declarations promise and definitions deliver usually stops the random editing, because the error becomes a lookup, not a mystery."
}
},

{
id: "cpp-perf",
track: "C++",
title: "Performance engineering and benchmarking",
mins: 30,
body: `
<p>Performance work has a failure mode: strong opinions applied to unmeasured code. The
professional loop is measure, form a hypothesis, change one thing, measure again. C++
gives you unusual control over memory and copies, which is exactly why guessing is
tempting and usually wrong.</p>
<h3>Measure first</h3>
<p>Profile before touching anything. A profiler (perf on Linux, Instruments on macOS, or
a cycle counter and a GPIO toggle on a microcontroller) answers the only question that
matters: where does the time actually go? Programs almost always have a skewed profile,
so effort anywhere but the hot spots is wasted. Keep a recorded baseline so every change
is judged against numbers, not memory.</p>
<h3>Microbenchmark traps</h3>
<p>Small benchmarks lie fluently. The optimiser deletes loops whose results are unused,
so benchmarked work must escape through something like benchmark::DoNotOptimize. Warm
caches make the tenth run faster than the first; decide which one you are measuring.
Turbo states, frequency scaling and background load add noise, so report distributions
across many runs, not a single time. And a benchmark compiled at -O0 measures nothing
real. Google Benchmark exists because getting this right by hand is genuinely hard.</p>
<h3>Cache and branch intuition</h3>
<p>Two facts explain most performance mysteries. First, memory is slow and hierarchical:
an L1 hit costs a few cycles, main memory costs hundreds, and data arrives in 64-byte
cache lines, so contiguous access (std::vector walked in order) is dramatically faster
than pointer-chasing through scattered nodes. This is why vector beats list in almost
every real benchmark even for middle insertion. Second, modern CPUs predict branches;
a predictable branch is nearly free while a random one costs a pipeline flush, which is
why sorting data can make a filtering loop several times faster, and why branchless
tricks only help on genuinely unpredictable data.</p>
<h3>Cheap wins in idiomatic C++</h3>
<ul>
<li><b>reserve()</b>: a vector grown by pushing without reserve reallocates and copies
repeatedly. If the size is known, reserve once.</li>
<li><b>emplace_back</b> constructs in place, avoiding a temporary where push_back would
build one. Modest but free.</li>
<li><b>Move-versus-copy audits</b>: find silent copies. Pass big read-only objects by
const reference, loop with const auto&amp;, return by value (moves or elision make it
cheap), and std::move locals into members when handing off ownership. A vector copied
once per frame is invisible in code review and obvious in a profile.</li>
<li><b>Const-correct spans and views</b> avoid materialising substrings and
subarrays.</li>
</ul>
<h3>The profiler mindset</h3>
<p>Treat performance claims like lab measurements: hypothesis, controlled change,
before-and-after data, and honesty about noise. Check the generated assembly on
Compiler Explorer when a result surprises you; often the compiler already performed the
optimisation you were about to write by hand, or your clever version defeated
autovectorisation. Set a performance budget for the paths that matter (a frame time,
an interrupt deadline) and automate a regression benchmark in CI, because performance
that is not tested rots exactly like correctness that is not tested. And when a change
does not measurably help, revert it: unmeasured cleverness is just risk.</p>`,
quiz: [
{ q: "Why can a naive microbenchmark report near-zero time for real work?",
o: ["The CPU skips small loops", "The optimiser removed the work because its result was unused", "Timers cannot measure below a millisecond", "Caches make the code literally free"],
a: 1, why: "Dead code elimination deletes computation with unobserved results. Benchmarks must force results to escape, for example via DoNotOptimize." },
{ q: "Traversing a std::vector is usually far faster than a std::list mainly because:",
o: ["vector elements are contiguous, so cache lines and prefetching work", "list nodes are larger", "vector uses SIMD automatically", "list traversal takes locks"],
a: 0, why: "Contiguous data exploits 64-byte cache lines and hardware prefetch. List nodes scatter across the heap, so each hop risks a cache miss." },
{ q: "Sorting the input data made a branchy filtering loop 4x faster. The most likely explanation is:",
o: ["Sorted data compresses better in RAM", "The compiler recompiled the loop", "The branch became predictable, avoiding pipeline flushes", "Fewer elements were processed"],
a: 2, why: "After sorting, the comparison outcome forms long runs, so the branch predictor is almost always right and mispredict penalties vanish." },
{ q: "Filling a vector with a known number of elements, the cheap win is:",
o: ["Use a list instead", "Call shrink_to_fit first", "Push then sort", "reserve() the capacity before the loop"],
a: 3, why: "reserve performs one allocation up front, eliminating the repeated reallocate-and-copy cycles of geometric growth during the loop." }
],
interview: {
q: "A teammate wants to rewrite the signal chain with hand-rolled loops and bit tricks because 'C++ abstractions are slow'. How do you handle it?",
a: "I would ask for the profile first, because the claim is testable. We would benchmark the existing chain properly: optimised build, results escaping the optimiser, distributions over many runs, and ideally a look at the assembly on Compiler Explorer. In my experience the abstractions usually compile away, and the real time goes to memory layout, allocation in the loop, or an unpredictable branch, none of which bit tricks fix. If the profile does show a hot spot, we optimise that spot, measure the gain, and keep the change only if the numbers justify the readability cost. I want the team norm to be that performance claims come with data, because unmeasured cleverness adds risk and rarely adds speed."
}
},

{
id: "cpp-api",
track: "C++",
title: "API design that resists misuse",
mins: 25,
body: `
<p>The best interfaces make wrong code fail to compile. Scott Meyers' rule, make
interfaces easy to use correctly and hard to use incorrectly, is a design test you can
apply to every function you write: what is the dumbest plausible call site, and does it
compile?</p>
<h3>Strong types over primitives</h3>
<p>A signature like set_pulse(int width, int delay, int voltage) invites transposed
arguments that compile cleanly and fail on hardware. Wrap each quantity in a distinct
type:</p>
<pre>struct Microseconds { std::int32_t value; };
struct Millivolts  { std::int32_t value; };
void set_pulse(Microseconds width, Millivolts level);

set_pulse(Millivolts{500}, Microseconds{20});   // now a compile error</pre>
<p>The wrappers cost nothing at runtime (they compile to the underlying integer) and
they turn unit confusion, argument transposition and implicit narrowing into build
failures. enum class does the same job for flags and modes: unlike plain enums it
neither converts to int nor pollutes the enclosing scope, so passing a Mode where a
Channel is expected will not compile.</p>
<h3>RAII handles instead of open/close pairs</h3>
<p>An API that returns a handle and requires a later release call will be leaked by
some caller somewhere, usually on an error path. Return an owning object instead: the
destructor releases, moves transfer ownership, and copying is disabled if sharing is
meaningless. The type system now enforces the cleanup contract, and the misuse (forget
to close) is no longer expressible.</p>
<h3>Parameters that borrow: span and string_view</h3>
<p>Functions taking (pointer, length) pairs let callers pass mismatched pairs. Take
std::span&lt;const T&gt; for a read-only buffer view and std::string_view for read-only
text: one parameter instead of two, the length travels with the data, and any
contiguous container binds without copying. The const inside the span is part of the
contract, saying this function reads and never writes your buffer.</p>
<h3>Const correctness as documentation the compiler checks</h3>
<p>Mark member functions const if they do not mutate; take const references for inputs;
return const views where the caller must not modify. Const propagates, which is exactly
the point: one honest const at the bottom forces honesty all the way up, and a caller
can tell at a glance which operations are observations and which are mutations.</p>
<h3>Clear error contracts</h3>
<p>Every function should have one visible answer to "how does this fail?". Pick per
category: exceptions, std::expected, or codes, but never a mix within one layer, and
never a bool the caller can ignore. Mark must-check results [[nodiscard]] so dropping
them is a warning. Distinguish programmer errors (precondition violations, which
deserve an assert) from environmental failures (a timeout, which deserves an error
return). An API whose failure story requires reading the implementation has no failure
story.</p>
<h3>Defaults and overloads</h3>
<p>Prefer a small struct of named settings over a tail of defaulted bool parameters,
because call sites like open(true, false, true) are unreviewable. Aggregate
initialisation with designated initialisers, Config{.retries = 3}, gives you named
arguments in all but name. Fewer overloads with distinct, strong parameter types beat
many overloads with convertible ones, where callers cannot predict which is chosen.</p>`,
quiz: [
{ q: "The main benefit of wrapping quantities in strong types like Microseconds is:",
o: ["Faster arithmetic at runtime", "Smaller binary size", "Automatic unit conversion", "Argument mix-ups become compile errors instead of field failures"],
a: 3, why: "Distinct types make transposed or wrong-unit arguments ill-formed. The wrappers optimise away, so safety is free at runtime." },
{ q: "Why is returning an RAII handle better than a handle plus a required release() call?",
o: ["It avoids a virtual call", "Forgetting cleanup becomes inexpressible; the destructor releases on every path", "It allows the handle to be copied freely", "It makes the API header-only"],
a: 1, why: "Ownership lives in the type: scope exit releases, moves transfer, and the leak-on-error-path misuse simply cannot be written." },
{ q: "A read-only buffer parameter is best expressed as:",
o: ["span of const T", "a non-const pointer plus a separate length", "a vector passed by value", "a shared_ptr to the buffer"],
a: 0, why: "A const span carries data and length together, binds to any contiguous container without copying, and encodes read-only in the signature." },
{ q: "Which is the best defence against a caller silently ignoring an error return?",
o: ["Logging inside the function", "Returning zero on failure", "Marking the result type or function [[nodiscard]]", "Documenting it in a comment"],
a: 2, why: "nodiscard makes discarding the result a compiler warning at every call site, which comments and logs cannot do." }
],
interview: {
q: "You inherit a C-style driver API: init and deinit calls, int parameters for everything, and functions returning negative error codes callers often ignore. How would you harden it?",
a: "I would wrap it in a thin C++ layer rather than rewrite it. First, ownership: an RAII class whose constructor runs init and destructor runs deinit, move-only, so leaks and double-frees become unwritable. Second, the signatures: strong types for units and enum class for modes, so transposed arguments stop compiling, and span or string_view where the C API took pointer and length pairs. Third, the error contract: one visible mechanism, probably std::expected wrapping the legacy codes into a typed error, with [[nodiscard]] so ignored failures warn at every call site. The C API stays underneath for vendors and tests. Each change removes a category of misuse at compile time, which is cheaper than finding the same bugs on hardware."
}
},

{
id: "cpp-testing",
track: "C++",
title: "Testing C++",
mins: 30,
body: `
<p>Testing C++ well means solving two problems: structuring tests so they stay readable
as they multiply, and getting code that touches hardware into a harness at all. The
second is the one firmware teams fail at, and it is a design problem, not a tooling
problem.</p>
<h3>Unit test structure</h3>
<p>The two dominant frameworks are GoogleTest and Catch2, and they shape tests the same
way: independent test cases, expressive assertions, and a runner with filtering. A good
test follows arrange-act-assert and its name states the behaviour, not the function:</p>
<pre>TEST_CASE("crc rejects a single flipped bit") {
    auto frame = valid_frame();
    frame.payload[3] ^= 0x01;            // arrange + corrupt
    REQUIRE(check_crc(frame) == false);  // act + assert
}</pre>
<p>Prefer EXPECT-style assertions (continue after failure) for independent checks and
REQUIRE-style (abort the case) when later lines would crash without the earlier ones
holding. One behaviour per test case: a failing test should tell you what broke from
its name alone. Fixtures hold shared setup, but deep fixture hierarchies are a smell
that the code under test has too many dependencies.</p>
<h3>Test doubles and seams</h3>
<p>A test double stands in for a real dependency: a stub returns canned data, a fake is
a working lightweight implementation (a RAM flash), a mock verifies interactions. To
substitute a double you need a seam, a place where the dependency can be swapped. In
C++ the main seams are an interface with virtual functions injected via constructor, a
template parameter (compile-time polymorphism with zero runtime cost, natural for
firmware), or, at worst, the link seam where the test build links a different
implementation of the same symbols.</p>
<h3>Testing hardware-adjacent code</h3>
<p>The trick is to shrink the untestable core. Split every driver into a thin register
access layer (a handful of read and write calls, verified once on hardware) and a logic
layer holding the state machine, timing decisions and error handling, written against
the seam. The logic layer, which is where the bugs live, then runs on the host: a fake
bus records writes and scripts responses, so you can unit test an I2C recovery path or
a calibration sequence in milliseconds, including fault cases (a stuck-low bus, a
timeout) that are near impossible to trigger on demand with real silicon.</p>
<h3>Sanitizers in CI</h3>
<p>Passing tests prove little in C++ if undefined behaviour lurks. Sanitizers are
compiler modes that catch it at runtime: ASan (buffer overflows, use-after-free), UBSan
(signed overflow, misaligned access, bad casts), TSan (data races). Running the whole
unit suite under ASan+UBSan, and separately TSan, in CI turns your existing tests into
a UB detector; the cost is roughly 2x runtime, and the payoff is catching on the host,
with a stack trace, the exact class of memory bug that produces unreproducible field
crashes on a microcontroller.</p>
<h3>Fuzzing in one paragraph</h3>
<p>A fuzzer (libFuzzer, AFL++) feeds a function randomly mutated inputs, guided by
coverage, hunting for crashes and sanitizer hits. Any code that parses external bytes
(protocol frames, config files, sensor packets) is a candidate: write one entry point
that takes a byte buffer, fuzz it overnight under ASan, and keep the crashing inputs as
regression tests. It is the cheapest adversarial testing available, and parsers that
have never been fuzzed almost always fall over within minutes.</p>`,
quiz: [
{ q: "When is a REQUIRE-style (fatal) assertion preferable to an EXPECT-style one?",
o: ["When later checks would crash if this condition is false", "Always, it is stricter", "When the test is slow", "When testing floating point values"],
a: 0, why: "Fatal assertions stop the case, which is right when subsequent lines depend on the checked condition, such as dereferencing a pointer just checked for null." },
{ q: "Which is the zero-runtime-cost seam for injecting a fake bus into a driver under test?",
o: ["A virtual interface resolved at runtime", "A global function pointer", "A template parameter selecting the bus type at compile time", "An environment variable"],
a: 2, why: "With the bus as a template parameter, production and test builds each instantiate with a concrete type; calls are direct and inlinable, with no vtable." },
{ q: "The main reason to run the unit test suite under ASan and UBSan in CI is:",
o: ["It makes tests run faster", "Tests can pass while hiding undefined behaviour that sanitizers expose", "It replaces the need for code review", "It checks code formatting"],
a: 1, why: "C++ tests can pass despite overflows or use-after-free by luck. Sanitizers turn that hidden UB into an immediate, stack-traced failure." },
{ q: "Which code is the strongest candidate for fuzzing?",
o: ["A pure maths function with fixed inputs", "A GPIO toggle wrapper", "A compile-time constant table", "A parser for protocol frames arriving from external hardware"],
a: 3, why: "Fuzzing shines on code consuming untrusted external bytes, where mutated inputs explore corner cases humans never write by hand." }
],
interview: {
q: "Your firmware team says their code is untestable off-target because it is full of register access. What is your plan?",
a: "I would show them a seam rather than argue. Take one driver with a known bug history and split it: a thin register layer with a handful of read and write calls, and a logic layer holding the state machine and error handling, written against that interface as a template parameter so there is no runtime cost. Then write a fake bus that records writes and scripts responses, and unit test the nasty paths, timeouts, bus recovery, calibration retries, on the host in milliseconds. Put the suite in CI under ASan and UBSan so memory bugs surface with stack traces instead of field crashes. Once the team sees a hardware fault reproduced in a five-line test, the untestable belief usually dies on its own."
}
}

);
