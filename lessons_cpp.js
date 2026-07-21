// Additional C++ lessons for R&D Prep. Same shape as data.js entries; appended
// to the existing LESSONS array. Code samples use &lt; &gt; escapes inside <pre>.

LESSONS.push(

{
id: "cpp-classes",
track: "C++",
title: "Classes, virtual functions and the rule of five",
mins: 28,
body: `
<p>A C++ class is a C struct plus guarantees. The constructor runs exactly once,
before anyone can touch the object, so an object can never exist half-initialised.
The destructor runs exactly once, automatically, when the object dies. Everything
else (access control, member functions) is convenience; those two guarantees are
the substance, and RAII is built directly on them.</p>
<h3>Virtual dispatch, the intuition</h3>
<p>A non-virtual call is resolved at compile time: the compiler knows the exact
function and can inline it. Mark a function <b>virtual</b> and the decision moves to
runtime: the object carries a hidden pointer to a vtable, a per-class array of
function pointers, and the call becomes "load the vtable pointer, index into it,
call through". That is one extra indirection plus a lost inlining opportunity.
Cheap, but not free, and it only happens when you call through a base pointer or
reference. Call a virtual function on a concrete object directly and the compiler
usually devirtualises it.</p>
<h3>When a virtual destructor is mandatory</h3>
<p>If you ever delete a derived object through a base class pointer, the base
destructor must be virtual. Otherwise only the base part is destroyed and the
derived members leak: that is undefined behaviour, not just a leak in theory.</p>
<pre>class Sensor {
public:
    virtual ~Sensor() = default;          // mandatory if deleted via Sensor*
    virtual double read() = 0;
};

class UltrasonicSensor : public Sensor {
    std::vector&lt;double&gt; buffer_;          // would leak without virtual ~Sensor
public:
    double read() override;               // override catches signature typos
};

std::unique_ptr&lt;Sensor&gt; s = std::make_unique&lt;UltrasonicSensor&gt;();
// s.reset() correctly runs ~UltrasonicSensor, then ~Sensor</pre>
<p>The rule of thumb: a base class intended for polymorphic use gets a public
virtual destructor; a class not meant to be inherited from gets none (and can be
marked final).</p>
<h3>Rule of five vs rule of zero</h3>
<p>The five special functions are: destructor, copy constructor, copy assignment,
move constructor, move assignment. The rule of five says that if you hand-write
any one of them, you almost certainly manage a raw resource, so you must consider
all five, because the compiler-generated versions will do a shallow copy and you
get double frees. The rule of zero is the better goal: build your class out of
members that already manage themselves (vector, string, unique_ptr) and write none
of the five. The compiler-generated set is then correct by construction. In modern
code, a hand-written destructor is a signal to reviewers: ask why.</p>
<h3>Slicing</h3>
<p>Assign or pass a derived object <b>by value</b> as its base type and the derived
part is sliced off: only the base subobject is copied, and the vtable pointer now
says "base". Virtual calls on the copy hit the base versions. This is why
polymorphic objects travel by reference, by pointer, or by unique_ptr, never by
value, and why containers of polymorphic types are containers of pointers
(std::vector of unique_ptr to Sensor, not std::vector of Sensor).</p>`,
quiz: [
{ q: "You delete a derived object through a base class pointer whose destructor is not virtual. What happens?",
o: ["The derived destructor runs anyway", "A compile error", "Undefined behaviour: typically only the base part is destroyed", "The object is destroyed twice"],
a: 2, why: "Without a virtual destructor the deletion is resolved statically to the base destructor; the standard makes this undefined behaviour, in practice leaking the derived members." },
{ q: "Roughly what does a virtual call cost compared with a non-virtual call?",
o: ["One extra pointer indirection and usually no inlining", "A heap allocation", "A search through the class hierarchy at runtime", "Nothing at all in any circumstances"],
a: 0, why: "Dispatch is a vtable lookup: load a pointer, index, call. The real cost is often the missed inlining rather than the indirection itself." },
{ q: "Your class contains only a string, a vector and a unique_ptr. Which special functions should you write?",
o: ["All five", "Just the destructor", "Destructor plus copy operations", "None: the rule of zero applies"],
a: 3, why: "Every member already manages its own resource, so the compiler-generated destructor, copies and moves are correct. Writing your own only adds risk." },
{ q: "You pass a derived object by value into a function taking the base class by value. Virtual calls inside the function use:",
o: ["The derived overrides", "The base versions, because the object was sliced", "Whichever was called most recently", "It is undefined behaviour"],
a: 1, why: "Copying by value as the base type copies only the base subobject. The copy is a genuine base object, so dispatch finds the base functions." }
],
interview: {
q: "When would you reach for virtual functions, and when would you avoid them?",
a: "I use virtual dispatch when I genuinely need to choose behaviour at runtime across a stable interface: for example a Sensor base class where the concrete transducer is picked from configuration or discovered on a bus. The interface stays small, the base gets a virtual destructor, and objects travel by pointer or reference so nothing slices. I avoid it when the set of types is known at compile time, where templates or plain overloading give the compiler full visibility and inlining. On hot paths I am wary of virtual calls inside tight loops, not because one indirection is slow, but because it blocks inlining and vectorisation. My default is the rule of zero, value types where possible, and polymorphism only at genuine architectural seams."
}
},

{
id: "cpp-templates",
track: "C++",
title: "Templates and generic code without fear",
mins: 27,
body: `
<p>A template is a recipe for code the compiler writes for you. Nothing exists until
you use it: instantiate max_of with double and the compiler stamps out a double
version, checks it, and compiles it as if you had written it by hand. That is the
key mental model: templates are compile-time code generation, not runtime magic,
which is why the generated code is exactly as fast as the hand-written
equivalent.</p>
<pre>template &lt;typename T&gt;
T max_of(const T&amp; a, const T&amp; b) {
    return (a &lt; b) ? b : a;
}

auto m = max_of(3.2, 4.7);        // T deduced as double, no annotation needed

template &lt;typename T, std::size_t N&gt;
class RingBuffer {                 // class template: N fixed at compile time
    std::array&lt;T, N&gt; data_;
    std::size_t head_ = 0, count_ = 0;
public:
    bool push(const T&amp; v);
};

RingBuffer&lt;int16_t, 256&gt; adc_fifo; // storage sized at compile time, no heap</pre>
<h3>Type deduction and auto</h3>
<p>For function templates the compiler deduces the type parameters from the
arguments, so call sites stay clean. <b>auto</b> is the same machinery applied to
variable declarations: the type is deduced from the initialiser. Use auto where
the type is obvious or unutterable (iterators, lambdas) and spell the type out
where it carries information a reader needs. One caution from C habits: auto drops
references and const, so auto x = get_ref() makes a copy; write const auto&amp; x
when you mean to borrow.</p>
<h3>When templates beat virtual</h3>
<p>Virtual dispatch answers "which implementation?" at runtime; templates answer it
at compile time. If the choice is fixed when you build (which filter, which pin,
which packet format), a template parameter costs nothing at runtime: calls are
resolved statically, inlined, and optimised across the boundary. This is how the
STL gets sort routines faster than qsort: the comparison is a template parameter
and gets inlined, where qsort pays a function pointer call per comparison. Reach
for virtual only when the decision genuinely cannot be made until runtime.</p>
<h3>The honest costs</h3>
<p>Templates cost you at compile time, not runtime. Every distinct instantiation
is more code to compile and potentially more code in flash (four element types
means four copies of the class). Heavy template libraries slow builds noticeably.
The other classic cost is error messages: a mistake deep inside an instantiation
produces pages of diagnostics naming types you never wrote.</p>
<h3>Strategies for readable errors</h3>
<ul>
<li><b>Constrain early.</b> A static_assert at the top of the template
(static_assert(std::is_arithmetic_v&lt;T&gt;, "T must be numeric")) turns a page of
noise into one sentence.</li>
<li><b>Concepts (C++20)</b> do this properly: declare the template with a
requirement such as std::integral and violations are reported at the call site in
plain language.</li>
<li><b>Read errors bottom-up-ish:</b> the first error is usually the real one, and
the "required from here" chain tells you which call triggered it.</li>
<li><b>Keep templates thin:</b> a small generic shell over a non-template core
function keeps both the error surface and the code bloat down.</li>
</ul>`,
quiz: [
{ q: "What is the runtime cost of calling a function template instantiation compared with an equivalent hand-written function?",
o: ["A small dispatch overhead", "None: the instantiated code is ordinary compiled code", "One indirection per call", "It depends on how many other instantiations exist"],
a: 1, why: "Instantiation happens at compile time. The generated function is normal code, fully inlinable; other instantiations affect binary size, not call speed." },
{ q: "auto x = get_reference(); where the function returns a reference to a large object. What is x?",
o: ["A reference to the object", "A pointer to the object", "A compile error", "An independent copy of the object"],
a: 3, why: "Plain auto deduction strips references and const, so x is copy-initialised. Use const auto reference syntax to borrow instead." },
{ q: "The choice of comparison function is known at compile time. Why does std::sort typically beat qsort?",
o: ["The comparator is a template parameter, so it is inlined into the sort loop", "std::sort uses a fundamentally faster algorithm", "qsort is interpreted at runtime", "std::sort runs on multiple threads by default"],
a: 0, why: "qsort calls through a function pointer on every comparison; std::sort instantiates with the comparator visible, so the compiler inlines it." },
{ q: "Which is a genuine cost of heavy template use?",
o: ["Slower execution of the generated code", "Mandatory heap allocation", "Longer compile times and larger binaries from many instantiations", "Loss of type safety"],
a: 2, why: "Each distinct instantiation is compiled and may be emitted separately. Runtime speed is unaffected and type checking is done per instantiation." }
],
interview: {
q: "Your team says templates make code unreadable and wants to ban them. How do you respond?",
a: "I would separate writing templates from using them. Most of us use templates all day happily: vector, array, unique_ptr. The pain comes from over-clever template authorship and from raw error messages, and both are fixable. My guidelines: templates only where genuine genericity or compile-time configuration pays for itself, such as a ring buffer parameterised on element type and size; constrain parameters with concepts or static_assert so misuse fails with one readable sentence; and keep the template layer thin over concrete logic. I would also show the performance case: on our hot paths a templated comparator inlines where a function pointer cannot. A ban throws that away; a style rule keeps the benefit and the readability."
}
},

{
id: "cpp-memory",
track: "C++",
title: "Memory, lifetime and undefined behaviour",
mins: 30,
body: `
<p>Every C++ object has a lifetime: it begins when construction finishes and ends
when the destructor runs (or the storage is reused). Touching an object outside
its lifetime is undefined behaviour, and most memory bugs are exactly that,
dressed up in different costumes.</p>
<h3>Stack vs heap in one paragraph</h3>
<p>Stack objects die at the closing brace: allocation is a pointer bump, lifetime
is tied to scope, and the compiler proves when they die. Heap objects (new,
make_unique) live until explicitly destroyed, which is flexibility paid for with
the obligation to destroy them exactly once. The stack is faster, cache-friendly
and self-cleaning, so the modern default is: values on the stack, heap only for
things that must outlive their scope or whose size is unknown, and then owned by
unique_ptr so destruction is automatic again.</p>
<h3>Dangling references</h3>
<p>A reference or pointer dangles when the object it refers to has died. The
classics: returning a reference to a local; keeping an iterator into a vector
across a push_back that reallocates; a lambda capturing a local by reference and
outliving the scope; string_view pointing at a temporary string that is gone by
the next line.</p>
<pre>const std::string&amp; shortest(const std::string&amp; a, const std::string&amp; b);

std::string s = shortest(name + "_cal", name + "_raw");
// The two temporaries die at the semicolon. If shortest returned a
// reference to one of them, s is copy-constructed from a corpse: UB.</pre>
<h3>The common UB categories</h3>
<ul>
<li><b>Out-of-bounds access:</b> indexing past the end of an array or vector.</li>
<li><b>Use-after-free:</b> any access through a dangling pointer or reference,
including double delete.</li>
<li><b>Signed integer overflow:</b> INT_MAX + 1 is UB, not wraparound. Unsigned
wraps; signed does not.</li>
<li><b>Data races:</b> two threads touching the same object without
synchronisation, at least one writing. UB even if the writes "look atomic".</li>
<li><b>Others you will meet:</b> null dereference, misaligned access, reading
uninitialised values, invalid casts.</li>
</ul>
<h3>Why UB is not "just a crash"</h3>
<p>This is the point interviews probe. The compiler is allowed to assume UB never
happens and optimises accordingly. If a path provably dereferences null, the
compiler may delete the null check as dead code. If a loop bound overflows a
signed counter, the compiler may assume it cannot, and rewrite the loop. So UB is
not a runtime event with defined symptoms; it is a broken contract at compile
time. The failure can appear far from the cause, only at -O2, only on one
compiler version, or not at all until the code is recompiled years later. A crash
is actually the friendly outcome; silent wrong data from an instrument is the
expensive one.</p>
<h3>Sanitizers: cheap superpowers</h3>
<p>AddressSanitizer (ASan) instruments loads and stores to catch out-of-bounds,
use-after-free and leaks at the moment they happen, with a readable stack trace,
for roughly a 2x slowdown. UndefinedBehaviorSanitizer (UBSan) catches signed
overflow, bad shifts, misaligned access and more, almost free. ThreadSanitizer
finds data races. The habit that impresses: run the whole test suite under ASan
and UBSan in CI, always. On hosted platforms there is little excuse not to; for
embedded targets, run the portable core of the codebase under sanitizers on the
host.</p>`,
quiz: [
{ q: "Why can undefined behaviour produce correct-looking results for years and then break after a compiler upgrade?",
o: ["Compilers add new UB checks in each release", "UB is defined per platform, and platforms change", "Old compilers fixed UB automatically", "The compiler may assume UB never happens, and new optimisations exploit that assumption differently"],
a: 3, why: "UB is a licence for the optimiser. Code that happened to behave under one optimisation strategy can be transformed differently by a newer compiler, exposing the latent bug." },
{ q: "A function returns a reference to one of its by-value local variables. Calling it and using the result is:",
o: ["Fine if the caller copies immediately", "Undefined behaviour: the local is destroyed when the function returns", "A compile error in all cases", "Safe because the stack memory is not reused straight away"],
a: 1, why: "The local's lifetime ends at return, so the reference dangles. Compilers often warn, but it is not required to be an error, and the stack being intact is luck, not a guarantee." },
{ q: "Which of these is NOT undefined behaviour in standard C++?",
o: ["Signed integer overflow", "Reading one element past the end of a vector", "Unsigned integer wraparound", "Two threads writing the same int without synchronisation"],
a: 2, why: "Unsigned arithmetic is defined to wrap modulo 2 to the power N. The other three are all genuine UB." },
{ q: "Which tool catches use-after-free and out-of-bounds accesses at the moment they occur, with a stack trace?",
o: ["The linker", "UndefinedBehaviorSanitizer", "AddressSanitizer", "The optimiser at -O2"],
a: 2, why: "ASan shadow-maps memory and instruments every access, reporting the faulting access plus where the memory was allocated and freed. UBSan targets arithmetic and type UB instead." }
],
interview: {
q: "A crash disappears when you add a printf. Walk me through how you would hunt it.",
a: "A heisenbug like that says memory corruption or a race, because the printf changes stack layout and timing rather than logic. First I reproduce it under AddressSanitizer, which usually converts a vanishing crash into a precise report: the bad access, the allocation site and the free site. If ASan is quiet I try UBSan for arithmetic and lifetime issues, then ThreadSanitizer if there is any concurrency. In parallel I look for the classic causes: a buffer written one element long, a reference or iterator kept across a container resize, or a stale pointer into a freed object. What I would not do is keep the printf and ship, because the bug is still there; the printf only moved the victim."
}
},

{
id: "cpp-embedded",
track: "C++",
title: "C++ on microcontrollers",
mins: 28,
body: `
<p>C++ on a Cortex-M is not "C++ minus performance"; it is C plus stronger
compile-time tools, provided you know which features carry hidden machinery. The
compilers are the same (GCC, Clang), the code generation for the core language is
identical to C, and the parts to treat carefully are a short, well-known list.</p>
<h3>What to avoid, and why (not superstition)</h3>
<ul>
<li><b>Exceptions:</b> the throw path needs unwind tables and runtime support,
costing flash (often tens of kilobytes) and giving unbounded, hard-to-analyse
worst-case timing. Most embedded projects build with -fno-exceptions and return
error codes or a Result-style type. The nuance worth knowing: the non-throwing
path is essentially free; it is the machinery and the timing analysis that hurt.</li>
<li><b>RTTI</b> (dynamic_cast, typeid): pays for type information in flash for
every polymorphic class whether used or not. -fno-rtti is standard; if you need a
downcast, your design usually wants a virtual function instead.</li>
<li><b>Heap after initialisation:</b> the danger is not allocation itself but
fragmentation and nondeterminism over months of uptime. The common discipline is:
allocate what you need during startup, then no new, malloc or container growth in
the steady state. Note the sneaky ones: std::function, std::string and vector
growth can all allocate behind your back.</li>
</ul>
<h3>volatile vs std::atomic</h3>
<p>These solve different problems and interviewers love the distinction.
<b>volatile</b> tells the compiler "this read or write has side effects; do not
cache, reorder or elide it". That is exactly right for memory-mapped hardware
registers, and nothing else. It provides no atomicity and no ordering between
threads or against an ISR. <b>std::atomic</b> provides indivisible reads and
writes plus memory ordering, which is what a flag shared between an ISR and the
main loop actually needs. The rule: registers get volatile, shared data gets
atomic, and if you find volatile on a shared flag, that is a latent race.</p>
<pre>volatile uint32_t&amp; STATUS = *reinterpret_cast&lt;uint32_t*&gt;(0x4000'0000);
std::atomic&lt;bool&gt; sample_ready{false};   // ISR sets it, main loop clears it

// In flash, not RAM: constexpr guarantees compile-time construction
constexpr std::array&lt;int16_t, 5&gt; fir_taps = { 3, -25, 150, -25, 3 };</pre>
<h3>Const data in flash</h3>
<p>On microcontrollers, .rodata is placed in flash, so tables marked const or
constexpr cost no RAM. The C++ subtlety: a const object whose constructor runs at
startup lives in RAM. <b>constexpr</b> forces construction at compile time, so the
finished object is baked into the image. For lookup tables, calibration constants
and FIR taps, constexpr (plus static_assert to validate the table) is the modern
replacement for generated C arrays.</p>
<h3>Static allocation patterns</h3>
<p>The heap-free toolkit: std::array instead of vector where the size is fixed; a
template ring buffer with the capacity as a template parameter; etl:: or similar
fixed-capacity containers where you want vector ergonomics; placement of large
buffers as static objects so the linker accounts for every byte and link fails,
rather than a runtime allocation, when memory runs out.</p>
<h3>Zero-cost abstraction is real, but audit it</h3>
<p>A template GPIO class with the port and pin as template parameters compiles to
the same single store instruction as the C macro, while giving you type checking
and testability. Constructors, namespaces, references, enum class: all free.
The honest statement is "zero-cost if you check": look at the map file and the
disassembly for anything on a hot path or a size budget, because the abstractions
that cost (exceptions, RTTI, hidden allocation) are exactly the ones the flag set
above removes.</p>`,
quiz: [
{ q: "A flag is set in an ISR and polled in the main loop. The correct type is:",
o: ["A std::atomic of bool", "A volatile bool", "A plain bool, since bool writes are naturally atomic", "A mutex-protected bool"],
a: 0, why: "volatile prevents caching but gives no atomicity or ordering guarantees; atomic gives both. A mutex cannot generally be taken inside an ISR." },
{ q: "Why do most embedded projects compile with exceptions disabled?",
o: ["Throwing is slower than returning an error code, and that is the whole story", "Exceptions do not work without an operating system", "Unwind tables cost significant flash and the throw path has unbounded worst-case timing", "The C++ standard forbids exceptions on bare metal"],
a: 2, why: "The machinery costs flash and makes worst-case execution time hard to bound. The standard allows exceptions anywhere; the trade-off is practical, not legal." },
{ q: "You want a 512-entry lookup table to live in flash rather than RAM. The reliable modern approach is:",
o: ["Declare it static so it goes into the data segment", "Declare it constexpr so it is constructed at compile time and placed in read-only storage", "Declare it volatile so the compiler does not move it", "Allocate it once at startup before the heap fragments"],
a: 1, why: "constexpr guarantees compile-time construction, so the object lands in .rodata, which the linker places in flash. A const object with a runtime constructor still occupies RAM." },
{ q: "Which of these C++ features typically allocates from the heap behind your back?",
o: ["enum class", "References", "A template ring buffer sized by a template parameter", "std::function capturing a large lambda"],
a: 3, why: "std::function type-erases its callable and heap-allocates when the callable exceeds its small-buffer size. The others involve no hidden allocation at all." }
],
interview: {
q: "Your firmware team writes C and is sceptical about adopting C++. What subset would you propose, and how would you de-risk it?",
a: "I would propose C++ as a better C, adopted incrementally. Build with -fno-exceptions and -fno-rtti, no heap after initialisation, and the same startup code we already trust. What we gain immediately: RAII for locks and chip selects, enum class and references for type safety, constexpr tables in flash replacing generated C arrays, and templates for things like ring buffers that we currently duplicate per type. To de-risk it, I would take one peripheral driver, write it both ways, and diff the map file and disassembly to show identical size and timing. Then a short style guide naming the banned features and the sneaky allocators like std::function. In my experience the map file comparison is what converts sceptics, because the argument stops being aesthetic."
}
}

);
