// Embedded C track for R&D Prep, part 1 of 2. Same shape as data.js entries.
// Code samples use &lt; &gt; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-volatile",
track: "Embedded C",
title: "volatile and hardware registers",
mins: 25,
body: `
<p>Ordinary C assumes that memory only changes when your program changes it. That
assumption is what lets the compiler keep a value in a register across a loop, drop a
read it thinks is redundant, or delete a write nobody reads back. On a microcontroller
the assumption is false: a peripheral updates its status register whenever it likes,
and an interrupt handler runs between any two of your instructions.</p>
<p><b>volatile is how you tell the compiler that assumption does not hold.</b> It means
"re-read this from memory every time, and perform every write, in the order I wrote
them". Nothing more.</p>
<h3>The bug it prevents</h3>
<pre>uint32_t *reg = (uint32_t *)0x40000000;
while ((*reg &amp; 0x01) == 0) { }        // wait for the ready bit</pre>
<p>At -O0 this works. At -O2 the compiler reasons that nothing inside the loop can
change the memory at 0x40000000, so it reads once, sees zero, and emits an
unconditional branch to itself. The firmware hangs on the first poll. The fix is one
keyword, and the symptom "works in debug, hangs in release" is its signature.</p>
<h3>Declaring a register properly</h3>
<pre>volatile const uint32_t * const status =
        (volatile const uint32_t *)0x40021000;</pre>
<p>Four things, each doing a job:</p>
<ul>
<li><b>volatile</b> because the hardware changes it behind you.</li>
<li><b>const</b> on the pointee because this register is read-only and you must not
write it.</li>
<li><b>* const</b> because the pointer itself never points anywhere else.</li>
<li><b>The cast</b> because C will not assign an integer to a pointer.</li>
</ul>
<p>For a register you both read and write, drop the first const:</p>
<pre>volatile uint32_t * const ctrl = (volatile uint32_t *)0x40021004;</pre>
<h3>Reading the declaration</h3>
<p>Start at the name and read outward. Whatever sits <b>left</b> of the star describes
the thing being pointed at; whatever sits <b>right</b> of the star describes the
pointer.</p>
<pre>volatile int *p;      // pointer to volatile int
int * volatile p;     // volatile pointer to plain int</pre>
<h3>What volatile is not</h3>
<p>This is where most people go wrong. <b>volatile means re-read, not atomic, and not
a memory barrier.</b></p>
<ul>
<li>It does not make a read-modify-write indivisible. <code>reg |= 1</code> is still
three operations and an interrupt can land in the middle.</li>
<li>It does not flush a CPU write buffer or invalidate a data cache. A DMA buffer needs
cache maintenance, not volatile.</li>
<li>It does not order accesses to <i>other</i> variables around it.</li>
</ul>
<p>The common belief that "DMA means volatile" is wrong for that reason. Mark the
completion flag volatile; the buffer needs a barrier and possibly a cache invalidate,
and marking 64 bytes volatile mostly just stops the compiler optimising any access to
them.</p>
<h3>Where volatile is genuinely required</h3>
<ul>
<li>Memory-mapped peripheral registers.</li>
<li>A variable written by an ISR and read by main-line code.</li>
<li>A variable modified by a signal handler.</li>
<li>Anything a debugger or a second core writes.</li>
</ul>`,
quiz: [
{ q: "A polling loop on a hardware register works at -O0 and hangs at -O2. What is the most likely cause?",
o: ["The optimiser reordered the peripheral's clock setup", "The register pointer is missing volatile, so the read was hoisted out of the loop", "The loop needs a memory barrier", "The register address is wrong"],
a: 1, why: "Without volatile the compiler proves nothing in the loop can change that memory, reads once, and emits an infinite branch. Debug builds do not optimise, which is why it works there." },
{ q: "Which declares a read-only 32-bit hardware register?",
o: ["const uint32_t *reg;", "volatile uint32_t *reg;", "volatile const uint32_t * const reg;", "uint32_t * const reg;"],
a: 2, why: "volatile because the hardware changes it, const on the pointee because you must not write it, and const on the pointer because it never moves." },
{ q: "A uint32_t counter is incremented in an ISR and read in main. volatile is sufficient when:",
o: ["Always, that is what volatile is for", "Only if the ISR is the only writer and the access is a single instruction", "Never; you always need a critical section", "Only if the counter is also const"],
a: 1, why: "An aligned 32-bit access on a 32-bit core is one instruction, so a single writer plus a reader is safe. If main also modifies it, count++ is read-modify-write and can be interrupted." },
{ q: "What does volatile NOT do?",
o: ["Force a re-read on every access", "Prevent the compiler eliding a write", "Make a read-modify-write atomic", "Preserve the order of accesses to that object"],
a: 2, why: "volatile means re-read, not atomic. It gives you no protection against an interrupt landing in the middle of reg |= 1." }
],
interview: {
q: "A colleague has marked a 4 kB DMA receive buffer as volatile and says that makes it safe to read. What do you say?",
a: "It does not make it safe and it costs performance. volatile stops the compiler caching a value in a register, which is not the problem here. The problems are that the CPU may hold a stale copy in its data cache while DMA wrote actual RAM, and that we need to know when the transfer finished. So the completion flag needs volatile, we need a cache invalidate before reading on a part with a data cache, and we need a barrier so the flag check is not reordered against the buffer read. Meanwhile marking 4 kB volatile means the compiler cannot optimise any access to it, so every byte we process is a separate load. I would move the volatile to the flag, add the invalidate, and measure the processing loop before and after."
}
},

{
id: "emb-types",
track: "Embedded C",
title: "Types, promotion and conversion",
mins: 25,
body: `
<p>C's integer rules were designed for portability across machines with wildly
different word sizes, and the result is a set of implicit conversions that bite hardest
in embedded code, where you are mixing byte-wide register values with pointer-wide
arithmetic all day.</p>
<h3>int is not a fixed size</h3>
<p>The standard guarantees only that <code>int</code> is at least 16 bits. It is 16 on
some targets and 32 on others. Overflow points, bit positions and struct offsets all
move when the code is ported, which for anyone maintaining drivers across silicon is
the normal case rather than the exception.</p>
<pre>#include &lt;stdint.h&gt;

uint8_t   flags;      // exactly 8 bits, unsigned
int16_t   reading;    // exactly 16 bits, signed
uint32_t  timestamp;  // exactly 32 bits
size_t    len;        // big enough for any object size
uintptr_t addr;       // big enough to hold a pointer</pre>
<p>Use the fixed-width types for anything that touches hardware, a protocol or a
struct layout. Plain <code>int</code> is fine for a loop counter that never leaves the
function.</p>
<h3>Integer promotion</h3>
<p>Any type narrower than <code>int</code> is promoted to <code>int</code> before an
operator is applied. That single rule explains a family of bugs.</p>
<pre>uint8_t a = 0xFF;
if (~a == 0x00) { }     // FALSE

uint8_t x = 200, y = 100;
if (x + y &gt; 255) { }    // TRUE, no wraparound</pre>
<p>In the first, <code>a</code> promotes to 0x000000FF and <code>~a</code> is
0xFFFFFF00. In the second, the addition happens in <code>int</code>, so 300 is 300 and
never wraps. Mask back down explicitly when you want byte behaviour:
<code>(~a &amp; 0xFF)</code>.</p>
<h3>Signed to unsigned conversion</h3>
<p>When a signed and an unsigned type of the same rank meet, the signed one converts to
unsigned. This is not promotion; it is the usual arithmetic conversions, and it is
behind a long list of real vulnerabilities.</p>
<pre>int len = -1;
if (len &gt; 64) return;        // -1 &gt; 64 is false, so this passes
memcpy(buf, src, len);       // len becomes 4294967295 here</pre>
<p>The check is done in signed arithmetic where -1 looks small; the use is in unsigned
arithmetic where it is enormous. <b>Signed check, unsigned use</b> is the shape to
recognise. Check for negative explicitly before any comparison against a size.</p>
<h3>char has implementation-defined signedness</h3>
<p>C has three distinct character types: <code>char</code>, <code>signed char</code>
and <code>unsigned char</code>. Plain <code>char</code> behaves like one of the other
two and the standard does not say which.</p>
<pre>char c = 0xFF;
if (c == 0xFF) { }
// ARM GCC:  char is unsigned, c is 255,  TRUE
// x86 GCC:  char is signed,   c is -1,   FALSE</pre>
<p>Same code, same compiler, different target, opposite behaviour. <b>Use plain char
only for text. For byte data always use uint8_t.</b></p>
<h3>Assembling multi-byte values</h3>
<pre>int16_t v = (int16_t)((uint16_t)buf[1] &lt;&lt; 8 | buf[0]);</pre>
<p>Build as unsigned, then cast once at the end. Assembling directly into a signed type
and relying on the sign bit landing correctly is implementation-defined for values
above 0x7FFF.</p>`,
quiz: [
{ q: "uint8_t a = 0xFF; is (~a == 0x00) true?",
o: ["Yes, ~0xFF is 0x00", "No, a promotes to int so ~a is 0xFFFFFF00", "Only on 8-bit targets", "It is undefined behaviour"],
a: 1, why: "Integer promotion widens a to int before the operator is applied. Mask back down with (~a & 0xFF) if you want byte behaviour." },
{ q: "int len = -1; if (len > 64) return; memcpy(buf, src, len); What happens?",
o: ["The check catches it and the function returns", "The check passes and memcpy copies about 4 GB", "The compiler rejects it", "memcpy copies zero bytes"],
a: 1, why: "The comparison is signed, so -1 is less than 64 and passes. memcpy's size parameter is size_t, so -1 converts to a huge unsigned value." },
{ q: "On ARM with GCC, char c = 0xFF; if (c == 0xFF) is:",
o: ["True, because plain char is unsigned on ARM", "False, because plain char is signed", "True on every platform", "Undefined behaviour"],
a: 0, why: "Plain char has implementation-defined signedness. ARM's ABI makes it unsigned; x86 GCC makes it signed, so the same code behaves differently." },
{ q: "Why prefer uint32_t over unsigned int for a register value?",
o: ["It is faster", "It is guaranteed to be exactly 32 bits on every target", "It uses less stack", "unsigned int cannot hold 32 bits"],
a: 1, why: "unsigned int is only guaranteed to be at least 16 bits. Register widths, bit positions and protocol fields need an exact size that survives porting." }
],
interview: {
q: "You are reviewing a driver ported from an 8-bit part to Cortex-M and it produces wrong values. What type-related causes would you look for first?",
a: "First, plain int in anything that touches hardware or a protocol, because it changed from 16 to 32 bits and every overflow point and bit position moved with it. Second, plain char used for byte data, since its signedness is implementation-defined and it may have flipped between targets. Third, any place where a narrow type is used in an expression and the author expected wraparound, because promotion to int means 200 plus 100 is 300 rather than 44. Fourth, signed and unsigned mixed in a comparison, particularly a length or index that could go negative. I would start by grepping for char and int declarations in the driver and converting them to stdint types, then re-running against known-good data, because that usually surfaces the rest."
}
},

{
id: "emb-memory",
track: "Embedded C",
title: "Memory sections, the linker and startup",
mins: 28,
body: `
<p>When the compiler builds your program it does not just emit instructions. It sorts
everything into named groups called <b>sections</b>, based on two questions: does this
need to be writable, and does it need a starting value? The linker then decides where
each section physically lives.</p>
<h3>The four you must know</h3>
<table class="stats">
<tr><th>Section</th><th>Writable</th><th>Initial value</th><th>Lives in</th></tr>
<tr><td>.text</td><td>no</td><td>it is the value</td><td>flash</td></tr>
<tr><td>.rodata</td><td>no</td><td>yes</td><td>flash</td></tr>
<tr><td>.data</td><td>yes</td><td>yes</td><td><b>flash and RAM</b></td></tr>
<tr><td>.bss</td><td>yes</td><td>zero</td><td>RAM only</td></tr>
</table>
<p><b>.data is the awkward one.</b> It must be writable, so it needs RAM. Its starting
value must survive being switched off, so it also needs flash. It exists in both, and
startup code copies it across before main runs.</p>
<p><b>.bss costs RAM only</b>, because zero is zero and there is nothing worth storing
in flash. Startup just wipes the region.</p>
<pre>static uint8_t buf[1000];                 // .bss:    1000 RAM
static uint8_t tbl[1000] = { 1, 2, 3 };   // .data:   1000 RAM + 1000 flash
static const uint8_t tbl[1000] = { 1 };   // .rodata: 1000 flash
uint8_t local[1000];                      // stack, when the function runs</pre>
<p><b>Adding const to a lookup table halves what it costs you.</b> That is the practical
consequence and it is worth internalising.</p>
<h3>What runs before main</h3>
<p>On a Cortex-M, before any of your code executes, the hardware reads the first word of
the vector table into the stack pointer and the second word as the reset vector, and
jumps there. Then Reset_Handler does four things:</p>
<ol>
<li>Copies .data from flash into RAM.</li>
<li>Zeroes .bss.</li>
<li>Runs static constructors.</li>
<li>Calls main().</li>
</ol>
<p>Steps one and two are the answer to why .data costs both. It is not an abstraction,
it is a loop in the startup file that you can read.</p>
<h3>Why the heap shrinks silently</h3>
<p>The linker places .data and .bss, and whatever RAM is left over becomes the heap. So
adding 8 kB of .bss silently takes 8 kB off your heap and nothing warns you. Then
something that used to allocate fails, often a task stack, and the board crashes shortly
after boot with no obvious cause.</p>
<p>If a large array genuinely overflowed the RAM region, the <b>linker</b> would fail
with "region RAM overflowed". If it compiled and links, it fits, and the problem is
downstream.</p>
<h3>The stack is not free either</h3>
<pre>void f(void) {
    uint8_t buffer[8192];   // 8 kB of stack
}</pre>
<p>A FreeRTOS task stack is typically 2 to 4 kB. An 8 kB local overruns it instantly and
corrupts whatever is next in memory, with no error at all. Large buffers go in .bss or
the heap, never on the stack.</p>`,
quiz: [
{ q: "static uint8_t buf[4096]; with no initialiser costs:",
o: ["4096 bytes of flash only", "4096 bytes of RAM only", "4096 bytes of both", "Nothing until it is used"],
a: 1, why: "No initialiser means .bss, which is RAM only. There is nothing worth storing in flash because the startup code just zeroes the region." },
{ q: "Why does a large initialised array cost both flash and RAM?",
o: ["The compiler duplicates it for speed", "Its values must survive power-off (flash) and be writable (RAM), so startup copies one to the other", "Flash is too slow to read directly", "It does not; that is a myth"],
a: 1, why: "It is .data. The initial values live in flash so they survive a power cycle, and a writable copy lives in RAM. Reset_Handler memcpys one into the other before main." },
{ q: "You add a large global and the board now crashes shortly after boot, but it compiled and linked fine. Most likely cause?",
o: ["Flash overflowed", "The heap shrank and an allocation, often a task stack, now fails", "The array was placed in .text", "The linker script is corrupt"],
a: 1, why: "The linker only checks .data and .bss against the RAM region. Whatever is left over becomes the heap, so growing .bss silently shrinks it and something that used to allocate now fails." },
{ q: "Which of these lives on the stack?",
o: ["A global initialised to 5", "A global initialised to 0", "A const lookup table", "An array declared inside a function"],
a: 3, why: "Function locals are allocated on the stack when the function is entered and released when it returns. The others are .data, .bss and .rodata respectively." }
],
interview: {
q: "A board boots on the bench and fails intermittently in the field. You suspect memory. How do you investigate?",
a: "First I would look at the map file and the size output to see how much RAM is committed to .data and .bss and how much is left for the heap, because the linker only errors if the static regions themselves overflow, not if the remainder is too small. Then I would check whether any allocation or task creation return values are unchecked, since a heap that is merely tight fails at the worst moment rather than at boot. Then stack: uxTaskGetStackHighWaterMark on every task under load, because a stack overflow presents as corruption somewhere unrelated and is the classic intermittent. And I would look for large locals, since an oversized array in a rarely taken branch will only overflow when that path runs. Finally I would enable stack canaries or the MPU if the part has one, so the failure becomes a fault at the moment of corruption rather than wrong data later."
}
},

{
id: "emb-structs",
track: "Embedded C",
title: "Struct layout, padding and register maps",
mins: 26,
body: `
<p>A struct's members are not necessarily laid out back to back. The compiler inserts
padding so that each member sits at an address suitable for its type, because unaligned
access is either slower or fatal depending on the core.</p>
<h3>Working out sizeof</h3>
<pre>struct { uint8_t a; uint32_t b; uint16_t c; };</pre>
<ul>
<li><code>a</code> at offset 0, one byte.</li>
<li>Three bytes of padding, because <code>b</code> needs 4-byte alignment.</li>
<li><code>b</code> at offset 4.</li>
<li><code>c</code> at offset 8.</li>
<li>Two bytes of tail padding, so the struct stays 4-byte aligned in an array.</li>
</ul>
<p><b>sizeof is 12</b>, not 7. Order the members largest first and it packs to 8 with no
holes.</p>
<h3>Alignment is about addresses, not order</h3>
<p>A 32-bit value is aligned when its address is a multiple of 4. The memory bus fetches
in 4-byte chunks, so an aligned word is one fetch and a straddling one is two. Cortex-M0
and M0+ fault on any unaligned word access. M3, M4 and M7 handle a plain LDR in
hardware but still fault on LDRD, LDM and STM, which the compiler uses whenever it moves
more than one word at a time.</p>
<h3>Register maps: do NOT reorder</h3>
<p>For a memory-mapped peripheral the layout is not yours to choose. The register at
offset 0x00 is whatever the silicon says, 0x04 is the next, and reordering members
points every field at the wrong register.</p>
<pre>typedef struct {
    volatile uint32_t CR1;         /* 0x00 */
    volatile uint32_t CR2;         /* 0x04 */
    uint32_t          RESERVED0;   /* 0x08 */
    volatile uint32_t SR;          /* 0x0C */
} periph_t;

_Static_assert(sizeof(periph_t) == 0x10, "register map has drifted");
_Static_assert(offsetof(periph_t, SR) == 0x0C, "SR moved");</pre>
<p>Two rules follow. <b>Fill gaps with explicit named reserved members</b>, never with
padding, because padding is the compiler's choice and offsets are the hardware's
requirement. And <b>declare every register at the spacing the datasheet uses</b>: four
bytes apart means 32-bit registers, even if only eight bits are used, because many
peripherals do not support byte access at all.</p>
<h3>Why __packed is the wrong tool</h3>
<ul>
<li>It removes padding, so members land at unaligned addresses and faults follow.</li>
<li>The compiler stops using single word loads and generates byte-wise sequences.</li>
<li>Many registers require exactly one 32-bit access. Read one as four bytes and a
read-to-clear register clears on the first byte, or a FIFO pops four times.</li>
</ul>
<p>Packing a register map is nearly always someone fighting padding they should have
solved with reserved fields.</p>
<h3>Structs over a wire</h3>
<p>Never send a struct down a UART or a radio link. You would be transmitting padding
bytes whose contents are unspecified, in your compiler's byte order, with a layout the
receiver may not share. <b>Serialise field by field</b> so the wire format is defined by
your code rather than by your toolchain.</p>
<h3>Struct assignment</h3>
<p><code>b = a;</code> is legal C and does a memberwise copy, including arrays inside
the struct, which is notable because bare arrays cannot be assigned. It is a shallow
copy: a pointer member is duplicated, not what it points at. And it is not free.
Passing a struct by value copies the whole thing onto the stack on every call.</p>`,
quiz: [
{ q: "On 32-bit ARM, what is sizeof(struct { uint8_t a; uint32_t b; uint16_t c; })?",
o: ["7", "8", "12", "16"],
a: 2, why: "a at 0, three bytes padding, b at 4, c at 8, two bytes tail padding so the struct stays 4-byte aligned in an array. Total 12." },
{ q: "For a memory-mapped register struct, how should you handle a gap in the address map?",
o: ["Reorder the members so the gap disappears", "Add __packed and let the offsets fall where they may", "Declare an explicit named reserved member", "Rely on the compiler's padding to fill it"],
a: 2, why: "Offsets are dictated by the hardware. Explicit reserved members state the layout; padding is the compiler's choice and can change between targets or versions." },
{ q: "What is the most serious risk of __packed on a register map?",
o: ["Slightly larger code", "Some registers require a single 32-bit access, and byte-wise access can clear flags or pop a FIFO", "It makes the struct bigger", "It disables volatile"],
a: 1, why: "Unaligned access and worse code are real, but the correctness killer is that many peripherals only support word access, so splitting a read into bytes changes hardware state." },
{ q: "Why should you never send a struct directly over a serial link?",
o: ["Structs cannot be cast to byte arrays", "You transmit padding whose contents are unspecified, in your compiler's layout and byte order", "It is too slow", "The receiver cannot allocate the struct"],
a: 1, why: "Padding bytes have unspecified values, and layout and endianness are properties of the compiler and target rather than of your protocol. Serialise field by field." }
],
interview: {
q: "You inherit a driver whose register access struct uses __packed. What do you do?",
a: "First I would find out why it was added, because it is usually someone fighting padding they did not understand rather than a considered decision. Then I would rewrite the struct with every register declared at its natural width, four bytes apart if that is the datasheet spacing, and explicit named reserved members for the gaps, which removes the need for packing entirely. Then I would add static asserts on sizeof and on offsetof for a few key registers, so that if anyone changes it the build fails rather than the driver reading the wrong address. I would justify it on correctness rather than style: packing risks unaligned access, which faults on M0, and it lets the compiler split a word access into bytes, which on a read-to-clear or FIFO register actively changes hardware state. Then I would diff the generated code before and after to show nothing else moved."
}
},

{
id: "emb-bits",
track: "Embedded C",
title: "Bit manipulation and register access types",
mins: 24,
body: `
<p>Almost everything a driver does is setting, clearing and testing individual bits in
registers without disturbing their neighbours. The four operations are short enough to
memorise and worth writing out until they are automatic.</p>
<pre>reg |=  (1u &lt;&lt; 3);          // set bit 3
reg &amp;= ~(1u &lt;&lt; 5);          // clear bit 5
reg ^=  (1u &lt;&lt; 7);          // toggle bit 7
if (reg &amp; (1u &lt;&lt; 2)) { }    // test bit 2</pre>
<p><b>Use 1u, not 1.</b> Shifting into bit 31 of a signed int is undefined behaviour.
Make the u a reflex so you never have to notice which bit you are on.</p>
<h3>Writing a multi-bit field</h3>
<p>Clear the field first, then OR the new value in:</p>
<pre>#define MODE_SHIFT  4
#define MODE_MASK   (7u &lt;&lt; MODE_SHIFT)
#define MODE(x)     (((x) &lt;&lt; MODE_SHIFT) &amp; MODE_MASK)

reg = (reg &amp; ~MODE_MASK) | MODE(5);</pre>
<p>The mask inside the setter is the defensive half: pass 9 into a 3-bit field and it
gets truncated rather than spilling into a neighbouring field.</p>
<h3>Precedence will catch you</h3>
<pre>if (status &amp; READY == 0)     // WRONG</pre>
<p><code>==</code> binds tighter than <code>&amp;</code>, so that parses as
<code>status &amp; (READY == 0)</code>, which is <code>status &amp; 0</code>, which is
always false. <b>Parenthesise every bitwise operation.</b> GCC warns about this one
under -Wall.</p>
<h3>Named constants, not raw bit numbers</h3>
<pre>if (reg &amp; (1u &lt;&lt; 2))          // is that the right bit? nobody can tell
if (reg &amp; STATUS_READY)       // now the intent is checkable</pre>
<p>A wrong bit number survives code review, because there is nothing in the code to
check the intent against. A named constant with the datasheet section in a comment gives
a reviewer something to verify.</p>
<h3>Register access types</h3>
<p>Every datasheet register table has an access column. It is not decoration.</p>
<table class="stats">
<tr><th>Code</th><th>Meaning</th><th>Consequence</th></tr>
<tr><td>R / RO</td><td>read only</td><td>writes ignored or undefined</td></tr>
<tr><td>W / WO</td><td>write only</td><td>reading returns rubbish; never read-modify-write</td></tr>
<tr><td>RW</td><td>read and write</td><td>behaves like memory; |= is safe</td></tr>
<tr><td>RC</td><td>read to clear</td><td>reading clears it</td></tr>
<tr><td>W1C</td><td>write 1 to clear</td><td>writing a 1 clears that bit</td></tr>
</table>
<h3>Why read-modify-write is sometimes wrong</h3>
<p>Two separate reasons, and most people only know the first.</p>
<p><b>Concurrency.</b> <code>reg |= x</code> is read, modify, write. An interrupt, task
or DMA that touches the register in between has its change thrown away when you store
your stale value back.</p>
<p><b>The hardware itself.</b> Some registers change state simply because you read them.
On a read-to-clear register your read bins every pending flag. On a write-1-to-clear
register, reading a set error bit and writing the value back puts a 1 there, which
<i>clears an error nobody handled</i>. On a FIFO data register, reading pops a byte.</p>
<p>For those registers you write the value directly rather than OR-ing into it, and you
write only the bits you intend to affect.</p>`,
quiz: [
{ q: "Which clears bit 5 without disturbing the others?",
o: ["reg &= (1u << 5);", "reg |= ~(1u << 5);", "reg &= ~(1u << 5);", "reg ^= (1u << 5);"],
a: 2, why: "Invert the single-bit mask so every other bit is 1, then AND. The XOR version toggles rather than clears, and would set the bit if it was clear." },
{ q: "if (status & READY == 0) actually tests:",
o: ["Whether the READY bit is clear", "status & 0, which is always false", "Whether status equals zero", "It is a syntax error"],
a: 1, why: "== binds tighter than &, so it parses as status & (READY == 0). READY is non-zero so that comparison is 0, and status & 0 is always 0." },
{ q: "Why write 1u rather than 1 in a shift?",
o: ["It is faster", "Shifting into bit 31 of a signed int is undefined behaviour", "It makes the constant smaller", "Only unsigned values can be shifted"],
a: 1, why: "A plain 1 is a signed int. Left-shifting into the sign bit is undefined in C99 and C11. The u makes the value unsigned, where shifting is defined." },
{ q: "On a write-1-to-clear interrupt flag register, what does reg |= (1u << 3) risk?",
o: ["Nothing, it is a normal register", "Clearing every other flag that happened to be set, because writing back a read 1 clears it", "Setting all bits", "A bus fault"],
a: 1, why: "The read picks up whatever flags are currently set. Writing that value back puts 1s in those positions, which on a W1C register clears them. You have silently acknowledged errors nothing handled." }
],
interview: {
q: "How would you review a driver for bit manipulation problems?",
a: "I would look for four things. Raw bit numbers rather than named constants, because a wrong number is invisible to a reviewer and a name gives something to check against the datasheet. Missing parentheses around bitwise operations, since the precedence of & against == is a known trap and the compiler warns about it if warnings are on. Plain 1 rather than 1u in shifts, which is undefined behaviour at bit 31 and a bad habit everywhere else. And most importantly, read-modify-write on registers whose access column is not plain RW: a |= on a write-1-to-clear register silently acknowledges errors, and on a FIFO register it destroys data. That last check means having the datasheet open next to the code, which is the real point."
}
},

{
id: "emb-isr",
track: "Embedded C",
title: "Interrupts and what must not happen in them",
mins: 26,
body: `
<p>An interrupt handler runs at a higher priority than your application, preempting it
at an arbitrary instruction. That single fact generates every rule about what is
allowed inside one.</p>
<h3>The four prohibitions, and why</h3>
<ul>
<li><b>Do not block or wait.</b> Nothing that could unblock you can run while you hold
the CPU, so a wait inside an ISR is a deadlock waiting for a trigger.</li>
<li><b>Do not call malloc.</b> Two separate reasons: its timing is unbounded, and it is
not reentrant, so interrupting an allocation and allocating again corrupts the heap.
Making it thread-safe with a mutex does not help, because an ISR cannot block on one; it
turns corruption into deadlock.</li>
<li><b>Do not call printf.</b> Slow, hungry with stack, usually non-reentrant, and
frequently blocks on the UART.</li>
<li><b>Do not do long work.</b> You are spending someone else's latency budget without
telling them. A control loop that needed servicing every 50 microseconds misses its
deadline because your UART handler decided to parse something.</li>
</ul>
<p>What you do instead: read the data register, push to a queue, set a flag, return. A
task does the work.</p>
<h3>Reentrancy</h3>
<p>A function with only locals is safe even if two tasks call it at once, because each
call gets its own stack frame. The moment it has a <code>static</code> local, all
callers share one variable and the function becomes <b>non-reentrant</b>: it cannot
safely be entered again while a previous call is in progress.</p>
<pre>strtok()   // static state, hence strtok_r
rand()     // static seed
printf()   // shared buffers</pre>
<p>Note that it does not take two tasks. A single task plus an interrupt is enough: the
ISR preempts the function halfway through and calls it again.</p>
<h3>Latency and priority</h3>
<p>On Cortex-M the NVIC supports nesting, and <b>a lower priority number means higher
priority</b>, which catches everyone. A higher-priority interrupt preempts one already
running.</p>
<p>If a 200 microsecond handler is starving a peripheral that needs servicing every 100
microseconds, raising the second interrupt's priority fixes that one peripheral and
leaves everything at or below the long handler's priority still waiting. The ranking of
fixes is: shorten the ISR, restructure so the work moves to a task, use DMA so the
interrupt disappears, and only then reach for priorities.</p>
<h3>Clearing the source</h3>
<p>An interrupt that is not cleared re-asserts immediately. A handler that only tests
the flag it expects, and ignores an error flag that has latched, runs, does nothing,
returns, and is re-entered forever. The CPU never makes progress again. Always handle or
at least clear the error conditions, and count them so the fault is visible rather than
silent.</p>`,
quiz: [
{ q: "Why must an ISR not call malloc?",
o: ["It is too slow only", "Its timing is unbounded and it is not reentrant", "malloc does not exist in embedded C", "It would return null"],
a: 1, why: "Two independent reasons. The allocator may take an unbounded time walking free lists, and interrupting an allocation to allocate again corrupts the heap's internal structures." },
{ q: "A function with a static local is called from both a task and an ISR. The problem is:",
o: ["It uses too much stack", "It is non-reentrant: the ISR corrupts the state the interrupted call was using", "static locals are not allowed in C", "Nothing, static makes it safe"],
a: 1, why: "All callers share one variable rather than each having its own stack copy, so an interrupt landing mid-call corrupts the interrupted call's state." },
{ q: "On Cortex-M, which interrupt preempts which?",
o: ["Higher priority number preempts lower", "Lower priority number preempts higher", "They never preempt each other", "Whichever fired first wins"],
a: 1, why: "ARM numbers priorities so that lower means more urgent. Priority 0 preempts priority 5, which is counterintuitive and a common source of mistakes." },
{ q: "A handler tests only the data-ready flag. An overrun flag latches and is never cleared. What happens?",
o: ["Data is lost but the system continues", "The interrupt re-asserts forever and the CPU makes no further progress", "The peripheral resets itself", "The overrun flag clears on the next read"],
a: 1, why: "The pending condition is still set, so the interrupt fires again immediately. The handler finds its expected flag clear, does nothing, returns, and is re-entered indefinitely." }
],
interview: {
q: "You measure an ISR at 200 microseconds and another peripheral is overrunning. Walk me through your options.",
a: "First I would ask why the handler takes 200 microseconds, because that almost always means processing that belongs in a task. The best fix is to have the ISR read the data register, push to a queue and return, which fixes the latency for every interrupt rather than for one. If the work is genuinely moving bytes, DMA removes the interrupt altogether and the CPU only hears about it at the end of the transfer. Raising the starving peripheral's priority does work, because Cortex-M supports nesting, but it only rescues that one peripheral and leaves everything at or below the long handler still waiting, so I would treat it as a stopgap. And I would check the overrun is being cleared, because an unhandled error flag turns a data loss problem into an interrupt storm that hangs the part."
}
},

{
id: "emb-concurrency",
track: "Embedded C",
title: "Shared state, races and ring buffers",
mins: 28,
body: `
<p>The moment two contexts touch the same data, you need to be able to say exactly what
is shared and what protects it. In embedded that is usually an ISR and a task, or two
tasks, or the CPU and a DMA engine.</p>
<h3>volatile is not enough</h3>
<pre>volatile int rx_len = 0;

void uart_isr(void)   { rx_buf[rx_len++] = UART_DR; }
int  get_message(uint8_t *dst) {
    int n = rx_len;
    memcpy(dst, rx_buf, n);
    rx_len = 0;                  // race
    return n;
}</pre>
<p>Two problems. The ISR can fire during the memcpy, so the message tears. And bytes
received between reading <code>rx_len</code> and zeroing it are silently destroyed.</p>
<p>Marking it volatile does not help, because <b>there are two writers</b>. The ISR
writes it and so does the reader. volatile means re-read, not atomic.</p>
<h3>What is actually shared</h3>
<p>The useful question is not "is this thread safe" but "what is the shared mutable
state, and who owns it". Three different answers, three different fixes:</p>
<ul>
<li><b>A library's internal buffer.</b> Arduino's Wire holds one static transmit buffer,
so two tasks building transactions overwrite each other before anything reaches the bus.
A mutex round the transaction is the correct fix.</li>
<li><b>The peripheral.</b> Usually handled by the driver already.</li>
<li><b>The device's own internal state.</b> An I2C sensor holds an address pointer. If a
register read is two separate transactions, another task can move that pointer in
between, and you read the wrong register even though every transaction was individually
atomic. The fix is a combined transaction with a repeated START.</li>
</ul>
<p>All three look identical from outside: two tasks, wrong data.</p>
<h3>Ring buffers: full versus empty</h3>
<p>With head and tail indices that wrap, <code>head == tail</code> means both empty and
full. Three ways out:</p>
<ul>
<li><b>Keep a count.</b> Simple, uses the whole buffer, but the count is written by both
sides so it needs a critical section and you lose the lock-free property.</li>
<li><b>Sacrifice one slot.</b> Full is <code>(head + 1) % size == tail</code>. You hold
size - 1 items, but head is written only by the producer and tail only by the consumer,
so no lock is needed.</li>
<li><b>Free-running indices.</b> Let them increment forever and derive the array offset
by subtraction. Empty and full are then different numbers, and the price is half the
index range. This is what Zephyr's ring_buffer does.</li>
</ul>
<h3>The design that removes the problem</h3>
<p>Single producer, single consumer, with each side owning its own index and never
writing the other's. No lock, no disabled interrupts, and nothing to forget. Where a
lock is genuinely needed, put it inside the module that owns the invariant rather than
asking every caller to remember it.</p>`,
quiz: [
{ q: "A counter is written by an ISR and also zeroed by main. Marking it volatile:",
o: ["Makes the pair of accesses atomic", "Is sufficient because there is only one ISR", "Does not fix it, because there are two writers", "Is unnecessary"],
a: 2, why: "volatile guarantees the value is re-read from memory, nothing more. With two writers you need a critical section or a design where each side owns its own state." },
{ q: "Two tasks talk to two DIFFERENT I2C devices through Arduino's Wire and get each other's data. Why?",
o: ["The bus cannot address two devices", "Wire holds one static transmit buffer, so the tasks overwrite each other in RAM before anything is sent", "The devices share an address", "Clock stretching"],
a: 1, why: "The corruption happens in library memory before a bit reaches the wire, which is why a logic analyser shows perfectly valid transactions carrying wrong data." },
{ q: "In a ring buffer, head == tail is ambiguous. Which solution keeps it lock-free for one producer and one consumer?",
o: ["Keep a shared count of items", "Sacrifice one slot so full is (head+1)==tail", "Disable interrupts on every access", "Use a mutex"],
a: 1, why: "Sacrificing a slot means head is written only by the producer and tail only by the consumer, so neither writes the other's variable and no lock is required." },
{ q: "A clean logic analyser trace shows valid transactions carrying wrong data. What does that rule out?",
o: ["A software fault", "A fault on the bus itself, electrical or protocol", "A driver bug", "Nothing"],
a: 1, why: "If the framing, addressing and ACKs are all correct, the wire is doing its job. The fault is above it, in software that assembled the wrong bytes." }
],
interview: {
q: "Tell me about a concurrency bug you have debugged.",
a: "On a robotics project two FreeRTOS tasks talked to different I2C devices and kept getting each other's data. The bus was electrically fine and a trace showed valid transactions with correct addressing and ACKs, which told me the fault was above the wire rather than on it. The cause was Arduino's Wire library holding a single static transmit buffer rather than one per device: both tasks were assembling their transactions in the same memory, so whichever called beginTransmission second reset the buffer under the first. A mutex around the whole transaction fixed it, and the important part is what it was serialising, which was the library's buffer rather than the bus. The bus driver had never been the problem. It taught me to ask what the shared mutable state actually is rather than assuming the answer is the peripheral."
}
}

);
