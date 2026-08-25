// Embedded C track for R&D Prep, part 2 of 3.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-ub",
track: "Embedded C",
sub: "The C language",
title: "Undefined behaviour that bites embedded code",
mins: 26,
body: `
<p>Undefined behaviour is not "the compiler does something odd". It is the standard
declining to say anything at all, which licenses the optimiser to assume the situation
never happens and to delete the code that would have handled it. That is why UB bugs
appear at -O2 and vanish at -O0, and why they get worse as compilers improve.</p>
<h3>Shifts</h3>
<p>A shift is undefined if the count is negative, or greater than or equal to the width
of the <b>promoted</b> left operand, or if you left-shift a signed value into or past the
sign bit.</p>
<pre>uint32_t v = 1;
v &lt;&lt; 31;          // fine, unsigned, count &lt; 32
v &lt;&lt; 32;          // UB, count equals the width

int s = 1;
s &lt;&lt; 31;          // UB in C99/C11, shifts into the sign bit

uint8_t f = 1;
f &lt;&lt; 31;          // UB. f promotes to signed int first</pre>
<p>That last one catches people. The unsignedness is lost at promotion, so a shift of an
unsigned char is really a shift of a signed int. It is the reason for the
<code>1u</code> habit.</p>
<h3>Signed overflow</h3>
<p>Unsigned overflow is <b>defined</b>: it wraps modulo 2^n. Signed overflow is
undefined. That difference matters for timer arithmetic:</p>
<pre>uint32_t start = get_ticks();
while (get_ticks() - start &lt; 1000) { }     // correct across wraparound
while (get_ticks() &lt; start + 1000) { }     // breaks near the top of the range</pre>
<p>The subtraction form works because unsigned arithmetic is modular, so the difference
is right even when the counter has wrapped in between. The addition form overflows the
comparison value and exits immediately. <b>The same trick with a signed counter is
undefined</b>, so timer variables must be unsigned.</p>
<h3>Strict aliasing</h3>
<p>The compiler may assume that objects of different types do not share memory. So
reading a byte array through a wider pointer is undefined:</p>
<pre>uint8_t buf[2];
int16_t v = *(int16_t *)buf;      // UB, and unaligned, and endian-dependent</pre>
<p>At -O2 the compiler can reorder or drop accesses based on the assumption you have
just broken. Assemble explicitly instead, which also fixes the alignment and endianness
problems in the same line:</p>
<pre>int16_t v = (int16_t)((uint16_t)buf[1] &lt;&lt; 8 | buf[0]);</pre>
<p><code>memcpy</code> is the sanctioned escape hatch when you genuinely need to
reinterpret bytes; compilers recognise it and generate the same code.</p>
<h3>Lifetime</h3>
<pre>const char *name(int n) {
    char buf[16];
    snprintf(buf, sizeof buf, "id %d", n);
    return buf;                 // UB: buf is gone
}</pre>
<p>The stack bytes are still physically there, so this often appears to work, which is
what makes it dangerous. On a microcontroller an interrupt uses the same stack and can
land on your string at a moment you cannot predict.</p>
<h3>Others worth knowing</h3>
<ul>
<li>Dereferencing a null or misaligned pointer.</li>
<li>Reading an uninitialised variable.</li>
<li>Modifying an object twice without a sequence point:
<code>i = i++;</code></li>
<li>Division by zero, including <code>INT_MIN / -1</code>.</li>
<li>Falling off the end of a non-void function.</li>
</ul>
<h3>Finding it</h3>
<p>UBSan and ASan work on host builds, which is one more reason to make driver logic
compilable off-target. <code>-fno-strict-aliasing</code> is a blunt instrument that some
projects use; better to fix the aliasing. And keep warnings on, because a good fraction
of UB is diagnosable.</p>`,
quiz: [
{ q: "uint8_t f = 1; f << 31; is:",
o: ["Fine, uint8_t is unsigned", "Undefined behaviour, because f promotes to signed int first", "A compile error", "Defined but implementation-specific"],
a: 1, why: "Integer promotion widens uint8_t to int, which is signed. Shifting into the sign bit of a signed type is undefined, so the original unsignedness does not protect you." },
{ q: "Why is (get_ticks() - start < 1000) safe across a counter wrap but (get_ticks() < start + 1000) is not?",
o: ["Subtraction is faster", "Unsigned arithmetic is modular, so the difference stays correct; the addition overflows the comparison value", "Both are equally safe", "The compiler special-cases tick counters"],
a: 1, why: "Unsigned overflow is defined to wrap, so the difference is right even across the boundary. In the addition form, start + 1000 wraps to a small number and the condition is immediately false." },
{ q: "What is wrong with int16_t v = *(int16_t *)buf; where buf is a uint8_t array?",
o: ["Nothing", "It violates strict aliasing, may be unaligned, and assumes the CPU's byte order", "It is only wrong on big-endian machines", "It is slower than shifting"],
a: 1, why: "Three separate faults. Aliasing is the subtle one: at -O2 the compiler may reorder or elide accesses based on an assumption you have broken, producing a bug that only appears optimised." },
{ q: "Returning a pointer to a local buffer often appears to work. Why is that dangerous rather than reassuring?",
o: ["It only fails on big-endian targets", "The stack bytes survive until something overwrites them, so it fails intermittently and later", "The compiler always warns", "It never actually works"],
a: 1, why: "It is undefined behaviour that happens to produce the right answer until an interrupt or another call reuses the frame. Intermittent, timing-dependent and hard to reproduce." }
],
interview: {
q: "A bug appears at -O2 and disappears at -O0. How do you approach it?",
a: "That pattern almost always means undefined behaviour or a missing volatile, because both are cases where the optimiser is allowed to assume something your code violates. I would start with the obvious volatile candidates: hardware registers, ISR-shared variables and delay loops. Then look for aliasing, particularly byte buffers being read through wider pointers, and for signed overflow in timer or index arithmetic. If nothing obvious surfaces I would build the same logic for the host with UBSan enabled, which catches most of it and gives you a line number, and that is a good argument for keeping driver logic free of platform dependencies so it can be built off-target at all. I would resist the temptation to just build that file at -O0, because that hides the fault rather than fixing it and it will come back."
}
},

{
id: "emb-pointers",
track: "Embedded C",
sub: "The C language",
title: "Pointers, declarations and lifetimes",
mins: 26,
body: `
<p>C's declaration syntax describes how an expression is used rather than what type it
is, which is why declarations read oddly and why the same star means different things
depending on where it sits.</p>
<h3>Reading a declaration</h3>
<p>Start at the identifier and work outward, respecting parentheses.</p>
<pre>const char *p;          // pointer to const char: cannot change the data
char * const p;         // const pointer to char: cannot repoint it
const char * const p;   // both

void (*fp)(void);       // pointer to function taking void, returning void
void (*v[16])(void);    // array of 16 such pointers: a vector table</pre>
<p>The parentheses in the last two are load-bearing. Without them,
<code>void *v[16](void)</code> is an array of functions returning void pointers, which is
not a thing.</p>
<h3>The star binds to the name</h3>
<pre>int* a, b;      // a is int*, b is int
int *a, *b;     // both pointers</pre>
<p>Writing <code>int*</code> as though it were a type is a C++ habit that misleads in C.
Better still: one declaration per line, and the question never arises.</p>
<h3>Arrays are not pointers, until they are</h3>
<p>An array name in an expression decays to a pointer to its first element. And
<code>a[i]</code> is <i>defined</i> as <code>*(a + i)</code>, which is why subscripting
works identically on arrays and pointers.</p>
<p>The consequence that bites:</p>
<pre>void clear(uint8_t buf[64]) {
    memset(buf, 0, sizeof(buf));      // clears 4 bytes, not 64
}</pre>
<p><b>You cannot pass an array to a function in C.</b> You pass a pointer.
<code>uint8_t buf[64]</code> as a parameter is exactly <code>uint8_t *buf</code>, and the
64 is a comment. <code>sizeof</code> only knows an array's size where the array is
declared.</p>
<p>Which gives the rule: <b>any function taking a buffer needs a length parameter.</b>
GCC catches this specific case under -Wall, but the general problem is yours to solve.</p>
<h3>const correctness</h3>
<pre>size_t crc(const uint8_t *data, size_t len);</pre>
<p><code>const</code> on a parameter is a promise to the caller that you will not modify
their data, and it is checked. It also documents intent better than a comment and lets
callers pass const data without casting. Use it on every pointer parameter you do not
write through.</p>
<h3>Function pointers and callbacks</h3>
<pre>typedef void (*sample_cb_t)(int value, void *user);

void register_cb(sample_cb_t cb, void *user);</pre>
<p>The <code>void *user</code> is not optional decoration. Without it the callback has no
way to know which instance it belongs to, so the only route for state is a global, and
you can only ever have one. With it, one callback function serves any number of
instances. This is the C idiom for a closure and you will see it throughout ESP-IDF,
Zephyr and every decent driver API.</p>
<h3>Lifetime</h3>
<p>Three storage durations, and knowing which you have is most of pointer safety:</p>
<ul>
<li><b>Automatic</b>: locals. Gone when the function returns. Never return their address.</li>
<li><b>Static</b>: globals and <code>static</code> locals. Live for the whole program.
Safe to return, but shared, which makes the function non-reentrant.</li>
<li><b>Allocated</b>: <code>malloc</code>. Lives until freed, and somebody must own that
decision.</li>
</ul>
<p>The classic embedded failure is passing the address of a local to a task or a
callback that outlives the function.</p>`,
quiz: [
{ q: "int* a, b; declares:",
o: ["Two pointers to int", "A pointer to int and an int", "Two ints", "A compile error"],
a: 1, why: "The star binds to the declarator, not the type. Only a is a pointer. This is why C convention puts the star next to the name and why one declaration per line is safer." },
{ q: "void clear(uint8_t buf[64]) { memset(buf, 0, sizeof(buf)); } clears how many bytes?",
o: ["64", "The size of a pointer, typically 4", "0", "Undefined"],
a: 1, why: "An array parameter is always a pointer; the 64 is documentation the compiler ignores. sizeof therefore gives the pointer size, and the function needs an explicit length parameter." },
{ q: "Why does a callback API need a void *user parameter?",
o: ["To pass error codes back", "So the callback can know which instance it belongs to without using globals", "For alignment", "It is required by C"],
a: 1, why: "Without it the only route for context is a global, so you can only ever have one consumer. It is the C idiom for a closure and it is why one callback function can serve many instances." },
{ q: "Which declares an array of 16 pointers to functions taking no arguments and returning void?",
o: ["void *v[16](void);", "void (*v[16])(void);", "void *(*v)(void)[16];", "void v[16](*)(void);"],
a: 1, why: "The parentheses around *v[16] bind the star to the array elements. Without them you would be declaring an array of functions returning void pointers, which C does not allow." }
],
interview: {
q: "How do you decide the ownership rules for a buffer passed across an API boundary?",
a: "I decide who allocates, who frees and how long it must live, and then I write it in the header, because that is the part that cannot be inferred from the signature. My default is that the caller provides the buffer and its length, so the callee never allocates and there is nothing to free, which removes a whole class of bug and works on systems that ban dynamic allocation. If the callee must allocate, I pair it with an explicit release function in the same header so ownership transfer is visible. Where a pointer is stored beyond the call, as with a callback context, I document that the caller must keep it alive until deregistration, because passing the address of a local to something that outlives the function is the classic failure. And I mark every pointer parameter I do not write through as const, so the intent is checked rather than commented."
}
},

{
id: "emb-preproc",
track: "Embedded C",
sub: "The C language",
title: "The preprocessor, macros and headers",
mins: 22,
body: `
<p>The preprocessor runs before the compiler and does nothing but text substitution. It
has no idea about types, scope or precedence, which is the source of every macro trap.</p>
<h3>Parenthesise everything</h3>
<pre>#define SQUARE(x)   x * x
SQUARE(2 + 3)       // becomes 2 + 3 * 2 + 3, which is 11

#define SQUARE(x)   ((x) * (x))
SQUARE(2 + 3)       // becomes ((2 + 3) * (2 + 3)), which is 25</pre>
<p>Two rules: wrap every parameter, and wrap the whole body. Do it without thinking
about whether this particular macro needs it.</p>
<h3>Side effects are evaluated more than once</h3>
<pre>#define MAX(a, b)  ((a) &gt; (b) ? (a) : (b))
x = MAX(i++, j);        // i incremented twice</pre>
<p>Any macro that uses a parameter more than once is dangerous with any argument that
has a side effect. The embedded version is worse:</p>
<pre>x = MAX(read_status(), 10);     // reads the register twice</pre>
<p>On a read-to-clear register that destroys a flag.</p>
<p><b>The fix is not a cleverer macro. Use static inline functions.</b> Arguments
evaluate once, you get type checking, and the compiler inlines it anyway so there is no
cost. Function-like macros are a habit from before <code>inline</code> existed.</p>
<h3>Trailing semicolons and assignments</h3>
<pre>#define ERR_BASE = 0x8000;      // WRONG on two counts</pre>
<p>A <code>#define</code> is not a statement. No equals sign, no semicolon. That
definition expands to <code>= 0x8000;</code> wherever it is used.</p>
<h3>#if versus #ifdef</h3>
<pre>#ifdef CONFIG_FEATURE      // true if defined at all, even as 0
#if CONFIG_FEATURE         // true only if it evaluates non-zero</pre>
<p>Kconfig-style systems define booleans as 1 or leave them undefined, so both work.
Systems that define things as 0 make the difference matter. An undefined identifier in
<code>#if</code> evaluates as 0 rather than erroring, which is convenient and hides
typos, so <code>-Wundef</code> is worth enabling.</p>
<h3>Header hygiene</h3>
<ul>
<li><b>Include guard on every header</b>, either <code>#pragma once</code> or the
traditional ifndef pair. Without one, a second include duplicates typedefs and static
asserts, which is a hard error.</li>
<li><b>Include what you use.</b> A header should compile standalone rather than relying
on whoever includes it having pulled something in first.</li>
<li><b>Each .c includes its own header first.</b> That is the test that proves the
header is self-contained, and it is also what lets your editor's index resolve it.</li>
<li><b>Never define a variable in a header.</b> <code>static int x;</code> in a header
included by three files gives you three separate variables, and static suppresses the
duplicate-symbol error that would have told you. Use extern in the header and one
definition in one .c.</li>
<li><b>extern "C" guard</b> on any C header that C++ might include, or the names mangle
and the link fails.</li>
</ul>`,
quiz: [
{ q: "#define SQUARE(x) x * x, then SQUARE(2 + 3) gives:",
o: ["25", "11", "10", "A compile error"],
a: 1, why: "Pure text substitution gives 2 + 3 * 2 + 3. Multiplication binds tighter, so it is 2 + 6 + 3. Parenthesise every parameter and the whole body." },
{ q: "x = MAX(i++, j); with a typical MAX macro. What happens to i?",
o: ["Incremented once", "Incremented twice, because the macro uses the argument more than once", "Not incremented", "Undefined behaviour"],
a: 1, why: "The argument text is substituted at every use site. i++ appears in both the comparison and the result, so it executes twice, and x receives the second value." },
{ q: "static int counter = 0; in a header included by three .c files gives you:",
o: ["One shared counter", "Three separate counters, one per translation unit", "A duplicate symbol link error", "A compile error"],
a: 1, why: "Include is a paste, and static gives each copy internal linkage. Worse, static suppresses the duplicate-symbol error that would otherwise have caught it." },
{ q: "Why should each .c file include its own header first?",
o: ["It compiles faster", "It proves the header is self-contained rather than depending on prior includes", "It is required by the standard", "It avoids include guards"],
a: 1, why: "Nothing else has been included yet, so a missing include in the header is exposed immediately rather than months later when someone includes it somewhere else." }
],
interview: {
q: "What is your policy on function-like macros in a codebase you own?",
a: "Default to static inline functions and treat a function-like macro as needing a justification. Inline functions evaluate their arguments once, are type checked, respect scope, can be stepped in a debugger, and the compiler inlines them anyway, so there is no runtime argument for the macro. The cases I would still accept are ones a function genuinely cannot do: anything needing the token-pasting or stringify operators, compile-time constants used in array sizes or case labels, and wrappers that need __FILE__ and __LINE__ from the call site. Where a macro is used I would insist on parentheses around every parameter and around the whole body, and no argument used more than once, because the read-a-register-twice failure is silent and destructive on read-to-clear registers."
}
},

{
id: "emb-serial",
track: "Embedded C",
sub: "Buses and protocols",
title: "Endianness, serialisation and protocols",
mins: 24,
body: `
<p>The moment data leaves your CPU, whether down a UART, over a radio or into flash, you
are defining a format. If you do not define it explicitly, your compiler and your
architecture define it for you, and the receiver may disagree.</p>
<h3>Endianness</h3>
<p>A 32-bit value 0x12345678 stored at address 0x100:</p>
<pre>little-endian:  0x100 = 78  0x101 = 56  0x102 = 34  0x103 = 12
big-endian:     0x100 = 12  0x101 = 34  0x102 = 56  0x103 = 78</pre>
<p>ARM and x86 are little-endian in practice. Network protocols are traditionally
big-endian. Sensors vary and many let you choose. <b>The byte order is a property of the
protocol, not of your CPU</b>, so state it in code rather than inheriting it.</p>
<h3>Assembling and disassembling</h3>
<pre>/* little-endian, low byte first */
uint16_t v = (uint16_t)buf[1] &lt;&lt; 8 | buf[0];

buf[0] = (uint8_t)(v);
buf[1] = (uint8_t)(v &gt;&gt; 8);</pre>
<p>Explicit shifts work identically on every machine, need no alignment, and do not
violate aliasing. Casting a byte pointer to a wider type does none of those things.</p>
<h3>Signed values</h3>
<p>Build as unsigned, cast once at the end:</p>
<pre>int16_t reading = (int16_t)((uint16_t)buf[1] &lt;&lt; 8 | buf[0]);</pre>
<p>Assembling into a signed type directly and hoping the sign bit lands correctly is
implementation-defined for values above 0x7FFF.</p>
<h3>Never send a struct</h3>
<pre>typedef struct { uint8_t cmd; uint32_t val; } packet_t;
uart_send(&amp;pkt, sizeof(pkt));      // sends 8 bytes, 3 of them padding</pre>
<p>Two faults. The padding bytes have <b>unspecified contents</b>, so you are
transmitting leftover stack and your output is not reproducible. And the layout and byte
order belong to your compiler and target rather than to your protocol.</p>
<p><code>__packed</code> removes the padding and leaves the endianness problem, plus it
introduces unaligned member access. Serialise field by field instead.</p>
<h3>Framing</h3>
<p>A stream has no message boundaries, so the protocol must supply them. The usual
options, with the tradeoff each carries:</p>
<ul>
<li><b>Fixed length.</b> Trivial, inflexible, and resynchronising after a lost byte is
impossible without a timeout.</li>
<li><b>Length prefix.</b> Efficient. A corrupted length field makes you consume the wrong
number of bytes, so sanity-check it before trusting it.</li>
<li><b>Delimiter with escaping.</b> Resynchronises naturally, at the cost of escaping any
occurrence of the delimiter inside the payload. COBS is the tidy version.</li>
</ul>
<h3>Integrity</h3>
<p>A checksum catches accidental corruption, not deliberate tampering. A simple sum
misses transpositions; CRC does not, which is why every serious protocol uses one.
Include the header in the coverage, decide whether the CRC field itself is included, and
write both facts down, because those two choices are where interoperability bugs live.</p>`,
quiz: [
{ q: "Why is int16_t v = *(int16_t *)buf; worse than assembling with shifts?",
o: ["It is slower", "It assumes the CPU's byte order, may be unaligned, and violates strict aliasing", "It only works on 8-bit targets", "It is fine"],
a: 1, why: "Three distinct problems in one line. The shift version states the byte order explicitly, needs no alignment, and only ever accesses uint8_t through uint8_t." },
{ q: "You send a struct with padding down a UART. What is the most serious problem?",
o: ["It wastes bandwidth", "The padding bytes have unspecified contents, so output is not reproducible and may leak stack data", "The receiver cannot parse it", "Nothing"],
a: 1, why: "Bandwidth is the least of it. Unspecified padding means the same call can transmit different bytes, and the layout also depends on the compiler and target rather than on your protocol." },
{ q: "Which framing method resynchronises naturally after a lost byte?",
o: ["Fixed-length messages", "Length prefix", "Delimiter with escaping", "None of them"],
a: 2, why: "A unique delimiter can always be found again in the stream. Fixed length and length prefix both need a timeout or a full reset to recover, because they have lost their place." },
{ q: "Why prefer a CRC over a simple additive checksum?",
o: ["It is faster", "It detects transpositions and burst errors that a sum misses", "It is shorter", "It provides encryption"],
a: 1, why: "A sum is blind to reordering and to some multi-bit patterns. A CRC is designed against a specific error model and gives far better detection for the same field width." }
],
interview: {
q: "You are defining a wire protocol between an MCU and a PC. What do you specify?",
a: "Byte order stated explicitly and serialised field by field, never a struct memcpy, because padding contents are unspecified and layout belongs to the compiler rather than the protocol. Framing chosen deliberately: I would usually take a length prefix with a sanity check on the length, or a delimiter with escaping if resynchronising after corruption matters more than efficiency. A CRC rather than a sum, with the coverage written down, meaning whether the header and the CRC field itself are included, because that is where interoperability bugs live. A version byte early in the frame so the format can change without breaking old devices. And a written specification with a worked example of a real frame in hex, because that is what both ends actually implement against and it makes the first integration far shorter."
}
},

{
id: "emb-errors",
track: "Embedded C",
sub: "Drivers and architecture",
title: "Error handling and defensive programming",
mins: 24,
body: `
<p>The happy path is the easy half of a driver. The failure paths are the half that
never runs on your bench and always runs at the client's site.</p>
<h3>Propagate, do not flatten</h3>
<pre>esp_err_t err = i2c_write(dev, reg, val);
if (err != ESP_OK) {
    return ESP_FAIL;        // WRONG: throws the diagnosis away
}
return err;                 // right</pre>
<p>The callee knew something specific: a timeout, a NAK, a bad argument. Flattening that
to a generic failure means the caller cannot tell a missing device from a broken bus, and
those send an engineer to different benches.</p>
<p><b>Only invent a new error code when you know something the callee did not.</b> A
driver returning "wrong part" after a successful read is legitimate, because only it
knows that the chip ID is invalid. Returning "failed" because a write failed adds
nothing.</p>
<h3>Design the error set from the caller's side</h3>
<p>Write the imaginary caller before you define any codes:</p>
<pre>err = sensor_init(&amp;io, &amp;dev);
if (err == SENSOR_ERR_WRONG_PART) {
    /* address jumper, or the wrong part is fitted */
} else if (err != ESP_OK) {
    /* bus trouble: retry, or report the sensor absent */
}</pre>
<p>Two branches means two distinguishable outcomes. <b>If you cannot write a branch for
a code, it should not be a code</b>, it should be a log line. A driver with fifteen
codes nobody checks is worse than three that everybody does.</p>
<h3>Cleanup with goto</h3>
<pre>int setup(void)
{
    int err = 0;
    uint8_t *buf = malloc(256);
    if (!buf) return -ENOMEM;

    if (init_clock() != 0) { err = -EIO; goto out_free; }
    if (init_bus() != 0)   { err = -EIO; goto out_clock; }
    return 0;

out_clock:
    deinit_clock();
out_free:
    free(buf);
    return err;
}</pre>
<p>This is one of the few correct uses of <code>goto</code> in C and it is ubiquitous in
the Linux kernel and in driver code. The rules that make it safe: <b>forward only, to
labels at the end of the function, and cascade so each failure unwinds exactly what was
acquired.</b> The alternative, repeating cleanup at every early return, is where leaks
come from.</p>
<h3>Assertions</h3>
<ul>
<li><b>_Static_assert</b> runs at compile time, costs nothing, cannot be disabled and
cannot fire in the field. Use it for anything checkable from constants: struct sizes,
register offsets, buffer sizes being powers of two, configuration sanity.</li>
<li><b>assert()</b> runs at run time, costs code and a branch, and is compiled out by
NDEBUG. It aborts, which on a product is a crash.</li>
</ul>
<p><b>Anything you can check at compile time, check at compile time.</b> It is the
cheapest verification available and it cannot be skipped.</p>
<h3>Defensive habits worth adopting</h3>
<ul>
<li>Validate arguments at API boundaries and return an error, do not assert internally.</li>
<li>Give every wait a timeout. An unbounded loop is a hang waiting for a trigger.</li>
<li>Count silent failures rather than ignoring them: dropped bytes, overruns, retries.
A counter you can read turns an invisible problem into a visible one.</li>
<li>Prefer failing loudly at init over degrading silently at run time.</li>
</ul>`,
quiz: [
{ q: "A driver catches a timeout from the bus layer and returns a generic failure code. What is lost?",
o: ["Nothing", "The caller can no longer distinguish a bus fault from a missing device", "Performance", "Type safety"],
a: 1, why: "Different failures need different responses and send an engineer to different places. Propagate the specific error unless you know something the callee did not." },
{ q: "When is it legitimate to define your own error code?",
o: ["Whenever a function can fail", "When you know something the callee did not, such as a read succeeding but returning a wrong chip ID", "Never", "Only for hardware faults"],
a: 1, why: "The test is whether a caller would branch on it. A wrong chip ID is knowledge the transport did not have; a failed write is not." },
{ q: "Why is goto acceptable for error cleanup in C?",
o: ["It is faster than function calls", "It gives a single unwind path so each early exit releases exactly what was acquired", "It is required by MISRA", "It avoids using the stack"],
a: 1, why: "Forward gotos to cascading labels at the end of a function remove duplicated cleanup, which is where leaks come from. The Linux kernel uses this pattern throughout." },
{ q: "Which is true of _Static_assert compared with assert()?",
o: ["Both run at run time", "_Static_assert costs nothing, cannot be disabled, and cannot fire in the field", "assert() is checked at compile time", "_Static_assert can test variable values"],
a: 1, why: "A static assert is evaluated by the compiler and generates no code. A failing one never ships, whereas a runtime assert both costs code and can abort in front of a customer." }
],
interview: {
q: "How do you decide what a driver should do when the hardware misbehaves?",
a: "I start from what the caller can usefully do about it, because that decides both the error set and the behaviour. Anything the caller could act on differently gets its own code, and anything they would treat identically shares one. Transient conditions get a bounded retry inside the driver, with a counter so the fault is visible rather than hidden; permanent ones fail immediately with a specific error rather than retrying forever. Every wait gets a timeout, since an unbounded loop is a hang waiting to happen. And I try to fail loudly at init rather than degrading silently later, because a device that reports absent at startup is a support call and a device that returns plausible wrong readings for a month is a recall. Then I make sure each of those paths is reachable in a test with a fake, because otherwise they are code nobody has ever executed."
}
},

{
id: "emb-buses",
track: "Embedded C",
sub: "Buses and protocols",
title: "I2C, SPI and UART: what actually happens on the wire",
mins: 28,
body: `
<p>You cannot diagnose a bus you cannot picture. These three cover most of what a
peripheral driver talks to.</p>
<h3>I2C</h3>
<p>Two wires, both open-drain and pulled up. A device pulls a line low; nobody ever
drives it high. That is what allows multiple devices and clock stretching.</p>

<svg class="fig" viewBox="0 0 680 384" role="img" aria-label="I2C timing diagram showing START, data bits, ACK and STOP on SDA and SCL">
<rect class="bxa" x="40" y="56" width="160" height="48" rx="4"/>
<text class="th" x="56" y="78">START</text>
<text class="ts" x="56" y="96">SDA falls, SCL high</text>
<rect class="bxa" x="410" y="56" width="160" height="48" rx="4"/>
<text class="th" x="426" y="78">STOP</text>
<text class="ts" x="426" y="96">SDA rises, SCL high</text>
<line class="guide" x1="120" y1="110" x2="120" y2="292"/>
<line class="guide" x1="490" y1="110" x2="490" y2="292"/>
<rect class="bx" x="40" y="142" width="50" height="36" rx="4"/>
<text class="th" x="50" y="165">SCL</text>
<rect class="bx" x="40" y="232" width="50" height="36" rx="4"/>
<text class="th" x="50" y="255">SDA</text>
<path class="wave" d="M90 140 L135 140 L135 180 L163 180 L163 140 L191 140 L191 180 L219 180 L219 140 L247 140 L247 180 L275 180 L275 140 L303 140 L303 180 L331 180 L331 140 L359 140 L359 180 L387 180 L387 140 L415 140 L415 180 L445 180 L445 140 L620 140"/>
<path class="wave" d="M90 230 L120 230 L120 270 L148 270 L148 230 L260 230 L260 270 L316 270 L316 230 L372 230 L372 270 L490 270 L490 230 L620 230"/>
<line class="guide" x1="545" y1="306" x2="400" y2="286"/>
<rect class="bx" x="40" y="310" width="185" height="54" rx="4"/>
<text class="th" x="56" y="332">While SCL is low</text>
<text class="ts" x="56" y="350">SDA may change</text>
<rect class="bx" x="245" y="310" width="185" height="54" rx="4"/>
<text class="th" x="261" y="332">While SCL is high</text>
<text class="ts" x="261" y="350">SDA must be stable</text>
<rect class="bx" x="450" y="310" width="190" height="54" rx="4"/>
<text class="th" x="466" y="332">The 9th clock is ACK</text>
<text class="ts" x="466" y="350">slave pulls SDA low</text>
</svg>
<p class="figcap">Abbreviated: five clocks shown where a real byte takes nine. Every SDA
transition happens while SCL is low, except the two that define START and STOP. Rising
edges are drawn square here; on a scope they are RC curves, because nothing drives a line
high.</p>

<p><b>The whole protocol falls out of one decision.</b> Because data may only change while
SCL is low, an SDA transition while SCL is <b>high</b> can never be data. That frees up
exactly two patterns to mean something else, and I2C spends both: falling is START, rising
is STOP. No escape sequences, no reserved bytes, no framing overhead.</p>
<ul>
<li><b>START</b>: SDA falls while SCL is high. During data, SDA may only change while
SCL is low, so a change while SCL is high is unmistakably a control signal.</li>
<li><b>Address byte</b>: seven address bits in the top, read/write in bit 0. So the byte
on the wire is <code>(addr &lt;&lt; 1) | rw</code>. HALs disagree about whether you give
them the shifted or unshifted value, and getting it wrong is the single most common I2C
bug. The tell: the decoded address is exactly half what you expected.</li>
<li><b>ACK</b>: after eight bits the master releases SDA and clocks once more. A device
that recognises the address pulls it low. Nobody home means the line floats high, which
is a NAK.</li>
<li><b>Repeated START</b>: a second START without an intervening STOP. This is how a
register read works: write the register address, repeated START, read. <b>A STOP in the
middle is a bug</b>, because many devices reset their internal address pointer on a STOP
and because it releases the bus to anyone else.</li>
<li><b>Clock stretching</b>: a slave holds SCL low to say "wait". Some masters handle it
badly, and some devices stretch outside spec.</li>
</ul>
<p><b>Rise time matters.</b> The pull-up and the bus capacitance form an RC. Standard
mode allows 1000 ns, fast mode 300 ns. An MCU's internal pull-up is typically 45k, which
at 100 pF gives 4.5 microseconds, several times outside spec. A stronger pull-up means
<b>lower</b> resistance, bounded below by the sink current the devices can manage.</p>
<h3>SPI</h3>
<p>Four wires, full duplex, one chip select per device. No addressing and no
acknowledgement, so the bus never tells you the device is absent.</p>

<svg class="fig" viewBox="0 0 680 534" role="img" aria-label="SPI mode 0 timing diagram showing chip select, clock, MOSI and MISO through a register read">
<rect class="bxa" x="40" y="40" width="230" height="48" rx="4"/>
<text class="th" x="56" y="62">Chip select asserted</text>
<text class="ts" x="56" y="80">low for the whole transfer</text>
<rect class="bxa" x="490" y="40" width="150" height="48" rx="4"/>
<text class="th" x="506" y="62">CS high again</text>
<text class="ts" x="506" y="80">transfer ends</text>
<line class="guide" x1="140" y1="88" x2="140" y2="445"/>
<line class="guide" x1="590" y1="88" x2="590" y2="445"/>
<rect class="bx" x="40" y="122" width="60" height="36" rx="4"/>
<text class="th" x="50" y="145">CS</text>
<rect class="bx" x="40" y="212" width="60" height="36" rx="4"/>
<text class="th" x="50" y="235">SCLK</text>
<rect class="bx" x="40" y="302" width="60" height="36" rx="4"/>
<text class="th" x="50" y="325">MOSI</text>
<rect class="bx" x="40" y="392" width="60" height="36" rx="4"/>
<text class="th" x="50" y="415">MISO</text>
<path class="wave" d="M110 120 L140 120 L140 160 L590 160 L590 120 L640 120"/>
<path class="wave" d="M110 250 L160 250 L160 210 L186 210 L186 250 L212 250 L212 210 L238 210 L238 250 L264 250 L264 210 L290 210 L290 250 L316 250 L316 210 L342 210 L342 250 L368 250 L368 210 L394 210 L394 250 L420 250 L420 210 L446 210 L446 250 L472 250 L472 210 L498 210 L498 250 L524 250 L524 210 L550 210 L550 250 L640 250"/>
<path class="wave" d="M110 340 L150 340 L150 300 L186 300 L186 340 L238 340 L238 300 L290 300 L290 340 L640 340"/>
<path class="wave" d="M110 390 L342 390 L342 430 L394 430 L394 390 L498 390 L498 430 L550 430 L550 390 L640 390"/>
<rect class="bx" x="40" y="460" width="185" height="54" rx="4"/>
<text class="th" x="56" y="482">Mode 0</text>
<text class="ts" x="56" y="500">sampled on rising edges</text>
<rect class="bx" x="245" y="460" width="185" height="54" rx="4"/>
<text class="th" x="261" y="482">Full duplex</text>
<text class="ts" x="261" y="500">both carry data at once</text>
<rect class="bx" x="450" y="460" width="190" height="54" rx="4"/>
<text class="th" x="466" y="482">MOSI goes quiet</text>
<text class="ts" x="466" y="500">nothing left to send</text>
</svg>
<p class="figcap">Mode 0, showing a register read: four clocks of command on MOSI, then
four clocks where the master only clocks and the slave answers on MISO. Data changes on
falling edges and is sampled on rising ones, which is why every transition sits safely
away from the sampling instant.</p>

<p><b>Compare the two diagrams and the difference is the point.</b> I2C spends bus time on
addressing, acknowledgement and framing, and gets multi-device sharing on two wires in
return. SPI has none of that: chip select does the addressing, so there is no address byte,
no ACK, and no way for the bus to tell you the device is missing. That is why a SPI
bring-up starts by reading an ID register, and why all 0xFF is such a common first
result.</p>
<ul>
<li><b>CPOL</b> is the idle clock level; <b>CPHA</b> selects which edge samples. Together
they make modes 0 to 3. Get it wrong and every bit arrives one position out, which shows
up as a value shifted by one.</li>
<li><b>Chip select</b> must be asserted before the first clock edge and held for the
whole transfer.</li>
<li><b>All 0xFF</b> means nothing is driving MISO: CS not asserted, wrong pin, device
unpowered or held in reset. <b>All 0x00</b> means something is driving it low. Floating
versus driven, and they send you in opposite directions.</li>
<li>During a register read, MOSI going quiet after the address byte is <b>correct</b>,
not a fault.</li>
</ul>
<h3>UART</h3>
<p>No clock. Both ends agree a bit rate and the receiver samples in the middle of each
bit, which is why accuracy matters.</p>

<svg class="fig" viewBox="0 0 680 374" role="img" aria-label="UART frame timing showing the start bit, eight data bits least significant first, and the stop bit, with the receiver sampling points">
<rect class="bxa" x="40" y="56" width="190" height="48" rx="4"/>
<text class="th" x="56" y="78">The falling edge</text>
<text class="ts" x="56" y="96">wakes the receiver</text>
<rect class="bx" x="245" y="56" width="195" height="48" rx="4"/>
<text class="th" x="261" y="78">No clock line</text>
<text class="ts" x="261" y="96">receiver times it itself</text>
<rect class="bxa" x="460" y="56" width="180" height="48" rx="4"/>
<text class="th" x="476" y="78">STOP bit</text>
<text class="ts" x="476" y="96">returns the line high</text>
<line class="guide" x1="150" y1="104" x2="150" y2="166"/>
<line class="guide" x1="587" y1="104" x2="587" y2="166"/>
<rect class="bx" x="40" y="182" width="54" height="36" rx="4"/>
<text class="th" x="50" y="205">TX</text>
<line class="guide" x1="173" y1="166" x2="173" y2="240"/>
<line class="guide" x1="219" y1="166" x2="219" y2="240"/>
<line class="guide" x1="265" y1="166" x2="265" y2="240"/>
<line class="guide" x1="311" y1="166" x2="311" y2="240"/>
<line class="guide" x1="357" y1="166" x2="357" y2="240"/>
<line class="guide" x1="403" y1="166" x2="403" y2="240"/>
<line class="guide" x1="449" y1="166" x2="449" y2="240"/>
<line class="guide" x1="495" y1="166" x2="495" y2="240"/>
<line class="guide" x1="541" y1="166" x2="541" y2="240"/>
<path class="wave" d="M110 180 L150 180 L150 220 L196 220 L196 180 L242 180 L242 220 L472 220 L472 180 L518 180 L518 220 L564 220 L564 180 L640 180"/>
<text class="ts" x="173" y="258" text-anchor="middle">start</text>
<text class="ts" x="219" y="258" text-anchor="middle">D0</text>
<text class="ts" x="265" y="258" text-anchor="middle">D1</text>
<text class="ts" x="311" y="258" text-anchor="middle">D2</text>
<text class="ts" x="357" y="258" text-anchor="middle">D3</text>
<text class="ts" x="403" y="258" text-anchor="middle">D4</text>
<text class="ts" x="449" y="258" text-anchor="middle">D5</text>
<text class="ts" x="495" y="258" text-anchor="middle">D6</text>
<text class="ts" x="541" y="258" text-anchor="middle">D7</text>
<text class="ts" x="587" y="258" text-anchor="middle">stop</text>
<text class="th" x="219" y="278" text-anchor="middle">1</text>
<text class="th" x="265" y="278" text-anchor="middle">0</text>
<text class="th" x="311" y="278" text-anchor="middle">0</text>
<text class="th" x="357" y="278" text-anchor="middle">0</text>
<text class="th" x="403" y="278" text-anchor="middle">0</text>
<text class="th" x="449" y="278" text-anchor="middle">0</text>
<text class="th" x="495" y="278" text-anchor="middle">1</text>
<text class="th" x="541" y="278" text-anchor="middle">0</text>
<rect class="bx" x="40" y="300" width="195" height="54" rx="4"/>
<text class="th" x="56" y="322">LSB first</text>
<text class="ts" x="56" y="340">0x41 sends as 10000010</text>
<rect class="bx" x="250" y="300" width="195" height="54" rx="4"/>
<text class="th" x="266" y="322">Sampled mid-bit</text>
<text class="ts" x="266" y="340">dashed lines mark where</text>
<rect class="bx" x="460" y="300" width="180" height="54" rx="4"/>
<text class="th" x="476" y="322">Timing budget</text>
<text class="ts" x="476" y="340">about 2 to 3 per cent</text>
</svg>
<p class="figcap">One frame carrying 0x41, the letter A. Read the value row left to right
and you get 10000010, which is 0x41 backwards, because the least significant bit goes out
first. The line idles high, so the start bit exists purely to create a falling edge the
receiver can trigger on.</p>

<p><b>Why the tolerance is so tight.</b> The receiver resynchronises once, on that falling
edge, then free-runs. Every dashed line above is timed from that single instant, so any
error in either end's bit rate accumulates across the frame. By D7 the sampling point has
drifted nine and a half bit times' worth, which is why a couple of per cent is the whole
budget and why the last data bits corrupt first.</p>
<ul>
<li>Frame: start bit low, data bits <b>least significant first</b>, optional parity, stop
bit high.</li>
<li>Total tolerance across both ends is roughly 2 to 3 per cent before the sampling point
walks off the bit.</li>
<li>The baud divider is an integer. At low rates it is large and rounding costs a
fraction of a per cent; at high rates it is small and rounding hurts, which is why 9600
works and 115200 does not on a marginal clock.</li>
<li><b>Consistent</b> wrong characters mean a systematic timing or framing error.
<b>Random</b> corruption means noise. That distinction narrows the search enormously.</li>
<li>An overrun flag that is never cleared re-asserts the interrupt forever.</li>
</ul>`,
quiz: [
{ q: "The datasheet says the device is at 7-bit address 0x68 and the analyser decodes address 0x34. What has happened?",
o: ["The device is faulty", "The address was not shifted left before being placed on the wire", "The bus speed is wrong", "The pull-ups are too weak"],
a: 1, why: "I2C carries the seven address bits in the top of the byte with read/write in bit 0. Sending 0x68 raw puts 0x34 on the wire. The decoded address being exactly half is the signature." },
{ q: "Why must a register read use a repeated START rather than a STOP between the two phases?",
o: ["It is faster", "A STOP lets the device reset its address pointer and releases the bus to others", "STOP is not allowed mid-transaction", "It saves power"],
a: 1, why: "The write sets the device's internal pointer. Many devices reset or advance it on a STOP, and the released bus can be taken by another master or task before your read." },
{ q: "SPI returns 0xFF for every byte. What does that indicate?",
o: ["The device is returning all ones", "Nothing is driving MISO: check chip select, wiring, power and reset", "The clock is too fast", "Wrong SPI mode"],
a: 1, why: "0xFF is an idle line held high by a pull-up. All 0x00 would mean something is actively driving it low, which points at a short or a device in reset instead." },
{ q: "A UART is clean at 9600 and garbage at 115200, and the garbage is consistent. Most likely cause?",
o: ["Electrical noise", "A systematic bit-rate error, usually the peripheral clock not being what the divider assumed", "A broken cable", "Wrong parity only"],
a: 1, why: "Consistent corruption means a systematic error; noise would vary. At high baud the divider is small, so rounding and clock inaccuracy consume the whole tolerance budget." }
],
interview: {
q: "A client's board has an I2C sensor that works on your bench and fails on their longer harness. How do you approach it?",
a: "I would put a scope on SDA and SCL and look at the rising edges before touching any code. A longer harness adds capacitance, and with the same pull-up the RC rise time grows, so the line may not reach the input threshold before the clock samples. Healthy looks like a square corner; this fault looks like a lazy exponential. If that is what I see, the fixes are a stronger pull-up, meaning lower resistance and bounded by the devices' sink current, a lower bus speed, or shorter and better routed wiring. I would also check whether the failure correlates with anything else on their board switching, because coupled noise and a shared ground return produce a similar symptom and need a different fix. And I would confirm on the scope rather than by trying values, so I can tell them what was wrong rather than that something I changed helped."
}
},

{
id: "emb-diagnose",
track: "Embedded C",
sub: "Bring-up and diagnosis",
title: "Diagnosing from traces and symptoms",
mins: 26,
body: `
<p>The skill that distinguishes a firmware engineer from a programmer is being able to
look at a bus and say what is wrong. Most of it is a small number of recognisable
signatures.</p>
<h3>Say what you expect before you look</h3>
<p>Predicting the trace and then checking is debugging. Looking at the trace and deciding
what it means afterwards is poking. It also stops you diagnosing a non-fault: a quiet
MOSI line during a register read is correct behaviour, and half of diagnosis is knowing
what correct looks like.</p>
<h3>Signatures worth memorising</h3>
<table class="stats">
<tr><th>Symptom</th><th>Usual cause</th></tr>
<tr><td>Decoded address is exactly half what you expected</td><td>address not shifted</td></tr>
<tr><td>Every SPI byte is 0xFF</td><td>nothing driving MISO: CS, wiring, power, reset</td></tr>
<tr><td>Every SPI byte is 0x00</td><td>line actively driven low, or device in reset</td></tr>
<tr><td>Value arrives shifted by one bit</td><td>SPI clock phase wrong</td></tr>
<tr><td>SDA stuck low after a debugger halt</td><td>slave mid-byte; clock it out</td></tr>
<tr><td>Rising edges look exponential</td><td>pull-up too weak for the bus capacitance</td></tr>
<tr><td>Consistent wrong characters</td><td>systematic: clock or framing</td></tr>
<tr><td>Random corruption</td><td>noise, or marginal timing</td></tr>
<tr><td>Works at -O0, fails at -O2</td><td>missing volatile, or undefined behaviour</td></tr>
<tr><td>Clean trace carrying wrong data</td><td>fault is above the bus, in software</td></tr>
</table>
<h3>The adjective in the complaint is evidence</h3>
<p>"Consistently wrong" rules out noise. "Intermittent" rules out a systematic timing
error. "Only in the release build" points at volatile or UB. "Only on their harness"
points at electrical. Read the words before reaching for the scope.</p>
<h3>Recovering a stuck I2C bus</h3>
<p>A slave interrupted mid-byte holds SDA low waiting for the clocks it was promised, and
the master cannot generate a STOP because that needs SDA to go high. Deadlock. The
diagnostic giveaway is that power-cycling the MCU does not help but power-cycling the
sensor does.</p>
<p>Recovery: bit-bang up to nine clock pulses on SCL, which is eight bits plus the ACK,
until the slave releases, then generate a STOP. Worth keeping permanently, because a
watchdog reset in the field does exactly what your debugger did.</p>
<h3>A board that resets repeatedly</h3>
<p><b>Read the reset reason register first.</b> Every modern MCU records why it reset and
it eliminates most of the shortlist in one step. Then:</p>
<ul>
<li><b>Watchdog</b>, and the clue is the period matching the timeout.</li>
<li><b>Brownout</b>, usually correlated with something switching on. Scope the rail with
the trigger just below nominal.</li>
<li><b>Hard fault</b>, which on a decent toolchain gives you a decodable backtrace.</li>
<li><b>Thermal shutdown</b> on a regulator, cycling as it cools.</li>
</ul>
<h3>Bring-up order for an unknown board</h3>
<ol>
<li>Power first, current limited, every rail measured at its own test point.</li>
<li>Clocks: is the crystal oscillating, at the right frequency, and is the part running
from it.</li>
<li>Debug access: connect, halt, read the device ID.</li>
<li>Your own blinky, not the vendor demo, so you own the toolchain and linker script.</li>
<li>Outward one peripheral at a time, bus before device.</li>
<li>Read the ID register on every device you meet. Cheapest possible proof that wiring,
address, mode and clock are all right at once.</li>
</ol>`,
quiz: [
{ q: "A logic analyser shows a perfectly valid I2C transaction carrying the wrong data. What does that tell you?",
o: ["The bus is faulty", "The fault is above the wire, in software that assembled the wrong bytes", "The pull-ups are wrong", "The device is broken"],
a: 1, why: "Correct framing, addressing and ACKs mean the bus is doing its job. Corruption that happened in RAM before transmission looks exactly like this, which is why the trace is so informative." },
{ q: "The I2C bus is dead after halting the target with a debugger, and power-cycling the MCU does not help. What is happening?",
o: ["The MCU peripheral is latched up", "A slave is holding SDA low mid-byte and needs clocks to finish", "The pull-ups have failed", "The bus speed is wrong"],
a: 1, why: "The slave was interrupted mid-transfer and is still waiting for clocks. Only power-cycling the slave clears it, or bit-banging up to nine clock pulses followed by a STOP." },
{ q: "A board resets every few seconds. What do you check first?",
o: ["The power supply with a scope", "The reset reason register", "The watchdog configuration", "The stack usage"],
a: 1, why: "The chip already recorded why it reset. One register read distinguishes watchdog, brownout, fault and software reset, and rules out most of the list before you set up any instrument." },
{ q: "Why read a device's ID register before configuring it?",
o: ["It is required by most protocols", "It is the cheapest proof that wiring, address, bus mode and clock are all simultaneously correct", "It resets the device", "It selects the register page"],
a: 1, why: "It is one transaction with a known expected answer. Skipping it means a wiring fault later presents as a configuration bug and costs you an afternoon." }
],
interview: {
q: "A client's board arrives on your bench with firmware that half works. Walk me through your first day.",
a: "Power first, current limited, and I measure every rail at the part rather than at the regulator, because a board that browns out under load fails later in ways that look like software. Then clocks: is the crystal actually oscillating and is the part running from the source the code assumes, since every baud rate and timing calculation inherits that error. Then debug access, halt and read the device ID, so I know I can trust what I observe. Then my own blinky rather than the vendor demo, which proves the toolchain, linker script and startup together and means I own the build. After that, outward one peripheral at a time, bringing the bus up before the device on it, and reading the ID register on everything I meet. At every step I say what I expect to see before I look, because predicting and checking is debugging and looking then rationalising is not. And I write the known-good values down, because when that board comes back in a year that record is the first thing anyone wants."
}
},

{
id: "emb-drivers",
track: "Embedded C",
sub: "Drivers and architecture",
title: "Driver architecture and layering",
mins: 28,
body: `
<p>A driver that works is easy. A driver that can be tested, ported and handed to someone
else needs its boundaries decided deliberately, and the decisions are all about what each
piece is allowed to know.</p>
<h3>Four layers, and the test for each</h3>
<table class="stats">
<tr><th>Layer</th><th>Knows about</th><th>Must not know about</th></tr>
<tr><td>Board</td><td>which pins, which bus, what speed</td><td>any device</td></tr>
<tr><td>Bus tools</td><td>the protocol</td><td>which device is attached</td></tr>
<tr><td>Device driver</td><td>the part's registers</td><td>pins, board, platform</td></tr>
<tr><td>Application</td><td>what the product does</td><td>any of the internals</td></tr>
</table>
<p>The check that matters: <b>could the device driver compile with no vendor SDK
installed?</b> If not, a platform dependency has leaked into it.</p>
<h3>Injected transport</h3>
<p>The mechanism that makes the layering real is handing the driver its I/O rather than
letting it reach for a HAL:</p>
<pre>typedef struct {
    int  (*read) (void *ctx, uint8_t reg, uint8_t *buf, size_t len);
    int  (*write)(void *ctx, uint8_t reg, const uint8_t *buf, size_t len);
    void (*delay_ms)(void *ctx, uint32_t ms);
    void *ctx;
} sensor_io_t;</pre>
<p>Three details, each earning its place:</p>
<ul>
<li><b>Register separate from buffer.</b> The driver says "read register 5"; how that is
expressed on I2C or SPI is the adapter's business. That is what lets one driver serve
both buses.</li>
<li><b>ctx, an opaque pointer</b>, passed back untouched. Without it the adapter needs
globals and you can only ever have one sensor.</li>
<li><b>delay_ms belongs here too.</b> Timing is a platform dependency exactly like the
bus. If the driver calls vTaskDelay it needs an RTOS, and a test of a reset timeout has
to wait in real time rather than instantly.</li>
</ul>
<p>The platform code then lives in one adapter file that you replace when porting, and
the driver itself never changes.</p>
<h3>Public interface</h3>
<ul>
<li><b>Opaque handle.</b> Declare the type without defining it, so callers hold a pointer
they cannot reach inside. Internals then change without recompiling users.</li>
<li><b>The register map stays private</b>, next to the .c and not in the include
directory, so nothing outside can drive the hardware behind your back.</li>
<li><b>Errors that distinguish</b> a bus failure from a wrong part, because those send
you to different benches.</li>
<li><b>Return quality with data.</b> Where a reading is only meaningful once calibrated
or once fresh, hand that state back with it rather than making the caller guess.</li>
</ul>
<h3>Init should verify, not assume</h3>
<ol>
<li>Read the identity register, or all of them, and fail with a specific error if it is
wrong.</li>
<li>Reset, and <b>poll the self-clearing bit with a timeout rather than delaying</b>,
because the datasheet gives a maximum, not a duration.</li>
<li>Configure explicitly, never inheriting reset defaults you did not choose.</li>
<li>Leave the part in a documented state.</li>
</ol>
<h3>Vendor code of unknown quality</h3>
<p>Plenty of parts have no published register map, and every driver for them contains
writes nobody outside the manufacturer understands. Working with that is normal. What is
not acceptable is pretending otherwise: mark unexplained writes clearly, name where they
came from, and tell the client. "It works and we do not know why" is a sentence you say
out loud rather than hide.</p>`,
quiz: [
{ q: "What is the strongest test that a device driver's layering is correct?",
o: ["It has no global variables", "It could compile with no vendor SDK installed", "It is under 500 lines", "It uses only fixed-width types"],
a: 1, why: "If the driver still needs the SDK, a platform dependency has leaked in, and with it goes the ability to test off-target or port to different silicon." },
{ q: "Why does an injected transport struct include a delay function?",
o: ["For symmetry", "Timing is a platform dependency, and a test needs to advance time instantly rather than really waiting", "Because I2C requires delays", "To measure latency"],
a: 1, why: "A driver calling vTaskDelay depends on an RTOS, and a timeout test would have to wait in real time. Injecting the delay puts that dependency in the adapter and makes tests fast." },
{ q: "Why keep the register map header out of the component's include directory?",
o: ["It compiles faster", "So application code cannot drive the hardware behind the driver's back", "To reduce binary size", "It is required by C"],
a: 1, why: "Register addresses are an implementation detail. If they are not on anyone else's include path, the encapsulation is enforced by the build rather than by asking people to behave." },
{ q: "A datasheet gives a maximum reset time of 5 ms. What should init do?",
o: ["Delay 5 ms", "Delay 10 ms to be safe", "Poll the self-clearing reset bit with a timeout", "Delay 1 ms and retry"],
a: 2, why: "A maximum is not a duration. Polling is faster in the normal case and correct if the part is ever slower, if the delay is optimised away, or if the clock changes." }
],
interview: {
q: "How would you structure a driver for a new sensor so that it survives being reused?",
a: "I would put the device driver in its own component with a public header containing no platform types at all, and hand it its I/O through a small struct of function pointers plus an opaque context, including a delay function, because timing is as much a platform dependency as the bus. All the vendor SDK code then lives in one adapter file that gets replaced when porting, and the driver itself never changes. The register map stays private next to the implementation so no application can reach around the API. The handle is opaque so internals can change without recompiling users. Errors distinguish a bus failure from a wrong part, because those send an engineer to different places. And init verifies identity and polls the reset bit rather than delaying, so the failure paths exist and are reachable. The last part matters most, because with an injected transport I can test all of those failure paths on a laptop with no hardware, and those are exactly the paths that never run before a client sees them."
}
}

);
