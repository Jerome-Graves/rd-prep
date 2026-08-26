// Embedded C track, batch 11: C depth.
// The material from van der Linden's Expert C Programming and Koenig's C Traps
// and Pitfalls that still catches working engineers.
// Code samples use &lt; &gt; &amp; escapes inside <pre> blocks.

LESSONS.push(

{
id: "emb-c-decl",
track: "Embedded C",
sub: "C depth",
title: "Reading and writing any C declaration",
mins: 26,
body: `
<p>C declaration syntax is the one part of the language that is genuinely badly designed. It was
built on the principle that a declaration should look like the expression that uses the
variable, which sounds elegant and produces things nobody can read.</p>

<h3>The rule</h3>
<p>Start at the identifier. Go <b>right</b> when you can, <b>left</b> when you must, and treat
parentheses as grouping that overrides the default.</p>
<p>The reason you must sometimes go left is precedence: <code>[]</code> and <code>()</code> bind
tighter than <code>*</code>, so they get applied first unless brackets say otherwise.</p>

<svg class="fig" viewBox="0 0 680 328" role="img" aria-label="Applying the right-left rule to char star open paren star fp bracket three close paren open paren int close paren, one step per row">
<text class="th" x="30" y="40">char *(*fp[3])(int);</text>
<text class="ts" x="30" y="62">start at the name, go right when you can, left when you must</text>
<rect class="bx" x="30" y="86" width="290" height="38" rx="4"/>
<text class="th" x="46" y="110">fp</text>
<rect class="bxa" x="340" y="86" width="310" height="38" rx="4"/>
<text class="th" x="356" y="110">fp is</text>
<rect class="bx" x="30" y="132" width="290" height="38" rx="4"/>
<text class="th" x="46" y="156">fp[3]</text>
<rect class="bxa" x="340" y="132" width="310" height="38" rx="4"/>
<text class="th" x="356" y="156">an array of 3</text>
<rect class="bx" x="30" y="178" width="290" height="38" rx="4"/>
<text class="th" x="46" y="202">(*fp[3])</text>
<rect class="bxa" x="340" y="178" width="310" height="38" rx="4"/>
<text class="th" x="356" y="202">pointers to</text>
<rect class="bx" x="30" y="224" width="290" height="38" rx="4"/>
<text class="th" x="46" y="248">(*fp[3])(int)</text>
<rect class="bxa" x="340" y="224" width="310" height="38" rx="4"/>
<text class="th" x="356" y="248">functions taking an int</text>
<rect class="bx" x="30" y="270" width="290" height="38" rx="4"/>
<text class="th" x="46" y="294">char *(*fp[3])(int)</text>
<rect class="bxa" x="340" y="270" width="310" height="38" rx="4"/>
<text class="th" x="356" y="294">returning a pointer to char</text>
</svg>
<p class="figcap">The brackets around <code>*fp</code> are what force the third step. Without
them, <code>[3]</code> and <code>(int)</code> would both bind before the star.</p>

<h3>The same declaration without the brackets</h3>
<pre>char *(*fp[3])(int);   array of 3 pointers to functions
                       taking int, returning char *

char *(*fp)[3];        pointer to an array of 3 char *

char **fp[3];          array of 3 pointers to pointer to char

char *fp[3](int);      illegal: you cannot have an array of
                       functions</pre>
<p>Every one of those is a different type, and three of them are things you will actually meet
in firmware.</p>

<h3>The declarations that matter in embedded work</h3>
<pre>void (*isr_table[48])(void);        the vector table

int (*cmp)(const void *, const void *);
                                    a qsort comparator

volatile uint32_t * const REG;      a constant pointer to a
                                    volatile register

uint8_t (*rows)[16];                pointer to a row of 16,
                                    for walking a 2D array</pre>
<p>That last one is worth staring at. <code>uint8_t (*rows)[16]</code> is a pointer to an array
of 16 bytes, so <code>rows++</code> advances 16 bytes. Drop the brackets and you get
<code>uint8_t *rows[16]</code>, an array of 16 pointers, which is a completely different object
with a completely different size.</p>

<h3>typedef makes it readable, and hides one thing</h3>
<pre>typedef void (*isr_fn)(void);
isr_fn vector_table[48];            much clearer

typedef struct sensor_s sensor_t;   opaque, deliberate</pre>
<p>The thing to be careful about is a typedef that hides a pointer:</p>
<pre>typedef struct dev_s *dev_handle_t;   /* hides the star */

void f(const dev_handle_t h);         /* what is const? */</pre>
<p>Here <code>const</code> applies to the pointer, not to what it points at, which is almost
never what the author meant. Hiding a pointer inside a typedef is worth doing only when the
type is genuinely opaque and callers are never meant to dereference it.</p>

<h3>Left of the star, right of the star</h3>
<p>The single most useful mnemonic in C:</p>
<pre>const char *p;     p points at const chars.
                   You may not write *p. You may write p.

char * const p;    p is a const pointer.
                   You may write *p. You may not write p.

const char * const p;   neither.</pre>
<p>Read it as: <b>const applies to whatever is immediately to its left, unless there is nothing
there, in which case it applies to the right.</b> Some people write
<code>char const *p</code> precisely so the rule never has an exception.</p>

<h3>The declarator applies to the name, not the line</h3>
<pre>int* a, b;      a is int*, b is a plain int.</pre>
<p>This surprises people every time because the spacing suggests otherwise. The star is part of
the declarator for <code>a</code>, not part of the type shared by the line.</p>
<p>The habit that removes the problem entirely is one declaration per line, which is also what
every coding standard says for exactly this reason.</p>

<h3>When you are stuck</h3>
<p>Write the type as a typedef and let the compiler tell you. Declaring
<code>typedef char *(*my_t)(int);</code> and then assigning your function to a
<code>my_t</code> gives a precise diagnostic if you got it wrong, which is faster than
arguing with yourself.</p>
`,
quiz: [
{ q: "What is the right-left rule?",
o: ["Read the line left to right", "Start at the identifier, go right when you can and left when you must", "Read the type then the name", "Read declarations backwards"],
a: 1, why: "You must sometimes go left because [] and () bind tighter than *, so they apply first unless parentheses say otherwise. That is exactly what the brackets in (*fp[3]) are for." },
{ q: "What is <code>uint8_t (*rows)[16]</code>?",
o: ["An array of 16 pointers", "A pointer to an array of 16 bytes, so rows++ advances 16 bytes", "A 2D array", "An illegal declaration"],
a: 1, why: "Drop the parentheses and you get uint8_t *rows[16], an array of 16 pointers, which is a different object with a different size. The parentheses are load-bearing." },
{ q: "In <code>char * const p;</code>, what is constant?",
o: ["What p points at", "The pointer itself, so you may write *p but not p", "Both", "Neither"],
a: 1, why: "const applies to whatever is immediately left of it, unless nothing is there, in which case it applies right. Writing char const *p instead of const char *p makes the rule exceptionless." },
{ q: "What does <code>int* a, b;</code> declare?",
o: ["Two pointers", "a as int*, b as a plain int", "Two ints", "It is a syntax error"],
a: 1, why: "The star is part of the declarator for a, not part of a type shared by the line. One declaration per line removes the problem, which is why coding standards require it." }
],
interview: {
q: "How do you read a declaration like char *(*fp[3])(int)?",
a: "I start at the identifier and work outwards, going right when I can and left when I must, with parentheses overriding the default. So fp, then right to the brackets, an array of three, then left to the star, pointers to, then right to the parameter list, functions taking an int, then left to the return type, returning a pointer to char. The reason you sometimes have to go left is precedence: square brackets and parentheses bind tighter than the star, so they apply first unless brackets say otherwise, and that is exactly what the parentheses around star-fp are doing here. The version I care about most in firmware is the same shape with the parentheses moved, because uint8_t open-paren star rows close-paren bracket sixteen is a pointer to a row of sixteen bytes, so incrementing it moves sixteen bytes, whereas without the parentheses it is an array of sixteen pointers, which is a completely different object. In practice I would write a typedef rather than leave that in a header, both because it is readable and because if I have got the type wrong the compiler tells me precisely when I try to assign to it. The one thing I would be careful about is a typedef that hides a pointer, because then const on the parameter applies to the pointer rather than to what it points at, which is almost never what the author intended."
}
},

{
id: "emb-c-arrays",
track: "Embedded C",
sub: "C depth",
title: "Arrays are not pointers",
mins: 26,
body: `
<p>The claim that "an array is just a pointer in C" is repeated constantly and is wrong. They
behave the same in one common situation, which is why the myth survives, and the places they
differ include a linker bug that produces no diagnostic at all.</p>

<h3>What is actually true</h3>
<p>In <b>most expressions</b>, an array name converts to a pointer to its first element. That
conversion is called array decay, and it is a rule about expressions, not about what the object
is.</p>
<p>There are exactly three places it does not happen:</p>
<pre>sizeof arr         gives the size of the whole array
&amp;arr               has type "pointer to array", not
                   "pointer to pointer"
char s[] = "abc"   initialising an array from a literal</pre>
<p>Everywhere else, <code>arr</code> in an expression means <code>&amp;arr[0]</code>.</p>

<h3>The difference in memory</h3>

<svg class="fig" viewBox="0 0 680 366" role="img" aria-label="An array holds the characters at its own address, while a pointer holds an address that points elsewhere, so reading one as the other reads the characters as an address">
<text class="th" x="30" y="34">char arr[] = "abc";</text>
<text class="ts" x="30" y="70">arr</text>
<rect class="bx" x="40" y="80" width="46" height="40" rx="3"/>
<text class="th" x="57" y="105">a</text>
<rect class="bx" x="86" y="80" width="46" height="40" rx="3"/>
<text class="th" x="103" y="105">b</text>
<rect class="bx" x="132" y="80" width="46" height="40" rx="3"/>
<text class="th" x="149" y="105">c</text>
<rect class="bx" x="178" y="80" width="46" height="40" rx="3"/>
<text class="th" x="193" y="105">\\0</text>
<text class="ts" x="40" y="140">at 0x2000, in RAM</text>
<text class="ts" x="30" y="172">the name is the storage: no extra hop</text>
<text class="th" x="350" y="34">char *ptr = "abc";</text>
<text class="ts" x="350" y="70">ptr</text>
<rect class="bx" x="360" y="80" width="110" height="40" rx="3"/>
<text class="th" x="383" y="105">0x8100</text>
<text class="ts" x="360" y="140">at 0x2000, in RAM</text>
<path class="arr" d="M383 146 L383 176" fill="none" marker-end="url(#arrow)"/>
<rect class="bx" x="360" y="180" width="46" height="40" rx="3"/>
<text class="th" x="377" y="205">a</text>
<rect class="bx" x="406" y="180" width="46" height="40" rx="3"/>
<text class="th" x="423" y="205">b</text>
<rect class="bx" x="452" y="180" width="46" height="40" rx="3"/>
<text class="th" x="469" y="205">c</text>
<rect class="bx" x="498" y="180" width="46" height="40" rx="3"/>
<text class="th" x="513" y="205">\\0</text>
<text class="ts" x="360" y="240">at 0x8100, in flash</text>
<rect class="bxa" x="30" y="270" width="620" height="76" rx="4"/>
<text class="th" x="46" y="296">extern char *arr; for something defined as char arr[]</text>
<text class="ts" x="46" y="318">the pointer is loaded from arr, so the letters a b c 0 are read as an address</text>
<text class="ts" x="46" y="336">no warning: the two files never meet until the linker, which matches names only</text>
</svg>
<p class="figcap">On the left the name and the data share an address. On the right there is one
more hop. Declaring one as the other means the machine takes the hop anyway.</p>

<h3>The classic bug</h3>
<pre>/* file1.c */
char message[] = "hello";

/* file2.c */
extern char *message;      /* wrong: should be char message[] */</pre>
<p>The linker matches names and sizes, not types, so this builds cleanly. At runtime the
compiled code in file2 fetches four bytes from <code>message</code> and uses them as an address,
so the ASCII for <code>hell</code>, which is 0x68656C6C, becomes the pointer. On a
microcontroller that is either a hard fault or, worse, a valid-looking address.</p>
<p>The fix is not to remember it. It is to have <b>one header that both files include</b>, so
the definition and the declaration are checked against each other by the compiler.</p>

<h3>sizeof, and the parameter that lies</h3>
<pre>void f(char buf[64])
{
    /* buf is a char *. The 64 is documentation. */
    memset(buf, 0, sizeof buf);   /* zeroes 4 bytes */
}</pre>
<p>Array parameters do not exist in C. Any parameter declared as an array is silently adjusted
to a pointer, which is why <code>sizeof</code> gives the pointer size and why the bound is not
checked.</p>
<p>The consequence for firmware is direct: <b>a function that takes a buffer must also take its
length</b>, because it has no other way to know. That is not defensive style, it is the only
mechanism the language offers.</p>
<pre>void f(char *buf, size_t len);        the honest version

void f(char buf[static 64]);          C99: at least 64,
                                      and the compiler may warn</pre>

<h3>Two-dimensional arrays are not arrays of pointers</h3>
<pre>uint8_t grid[8][16];    128 contiguous bytes, one object

uint8_t *rows[8];       8 pointers, each to somewhere else</pre>
<p>They are indexed with the same syntax and are laid out completely differently, so passing one
where the other is expected is a type error that a cast will happily silence.</p>
<p>To pass the first one you need the row width in the type, because that is what the compiler
uses to compute the offset:</p>
<pre>void f(uint8_t (*g)[16], size_t rows);
void f(uint8_t g[][16], size_t rows);    same thing</pre>
<p>This is also why <code>uint8_t **</code> is the wrong parameter type for a 2D array and the
compiler is right to complain, even though it looks like it ought to work.</p>

<h3>The one place a string literal is not read-only</h3>
<pre>char *p  = "abc";    p points into flash. Writing *p is UB
                     and on a microcontroller usually a fault.

char a[] = "abc";    a is a RAM array initialised from the
                     literal. Writing a[0] is fine.</pre>
<p>The second one costs 4 bytes of RAM and a copy at startup. That is the price of it being
writable, and it is the reason both forms exist.</p>
`,
quiz: [
{ q: "What is array decay?",
o: ["Arrays losing elements", "An array name converting to a pointer to its first element in most expressions", "Static arrays being freed", "Arrays shrinking after realloc"],
a: 1, why: "It is a rule about expressions, not about what the object is. The three exceptions are sizeof, taking the address with &, and initialising a char array from a string literal." },
{ q: "Why does <code>extern char *msg;</code> for something defined as <code>char msg[]</code> build cleanly and then crash?",
o: ["The linker checks types and lets it through", "The linker matches names only, so the code loads the first bytes of the string as an address", "It is a compiler bug", "The array is uninitialised"],
a: 1, why: "The ASCII of the first four characters becomes the pointer value. The fix is one shared header, so the compiler checks the definition against the declaration rather than nobody checking." },
{ q: "In <code>void f(char buf[64])</code>, what is <code>sizeof buf</code>?",
o: ["64", "The size of a pointer", "1", "It does not compile"],
a: 1, why: "Array parameters do not exist. Any parameter declared as an array is adjusted to a pointer, and the bound is documentation. This is why a function taking a buffer must also take its length." },
{ q: "Why is <code>uint8_t **</code> wrong for a parameter receiving <code>uint8_t grid[8][16]</code>?",
o: ["It is not wrong", "The 2D array is 128 contiguous bytes, not 8 pointers, so the indexing arithmetic differs", "It needs a cast", "Only the row count is missing"],
a: 1, why: "The compiler needs the row width in the type to compute offsets, hence uint8_t (*g)[16]. An array of pointers is a completely different layout that happens to share the indexing syntax." }
],
interview: {
q: "Someone tells you an array in C is just a pointer. What do you say?",
a: "That they behave the same in one very common situation, which is why the belief survives, but they are different things. In most expressions an array name converts to a pointer to its first element, and that decay is a rule about expressions rather than about what the object is. There are three places it does not happen: sizeof gives the whole array, taking the address gives a pointer to array rather than a pointer to pointer, and initialising a char array from a string literal. The difference that actually bites is across translation units. If one file defines char message square brackets equals hello and another declares extern char star message, that links cleanly, because the linker matches names rather than types, and at runtime the second file loads the first four characters and uses them as an address. On a microcontroller that is a hard fault if you are lucky. The fix is not remembering the rule, it is having one header both files include so the compiler checks them against each other. The other consequence I care about daily is that array parameters do not exist: a parameter declared as char buf sixty-four is adjusted to a pointer, so sizeof gives the pointer size and the bound is documentation. That is why any function taking a buffer has to take its length as well. It is not defensive style, it is the only mechanism the language gives you."
}
},

{
id: "emb-c-linkage",
track: "Embedded C",
sub: "C depth",
title: "Declaration, definition and linkage",
mins: 25,
body: `
<p>Most build errors that engineers find mysterious are linkage errors, and they are mysterious
only because the model is rarely taught. It is small.</p>

<h3>Declaration against definition</h3>
<p>A <b>declaration</b> introduces a name and its type. A <b>definition</b> also allocates the
storage or provides the body. You may declare a thing many times; you may define it once.</p>
<pre>extern int count;        declaration
int count;               definition (tentative, see below)
int count = 0;           definition

void f(void);            declaration
void f(void) { }         definition</pre>

<h3>static means two different things</h3>
<p>This is the genuinely confusing part of the language, and the two meanings are unrelated:</p>
<pre>static int x;            at file scope: internal linkage.
                         This name is invisible to other
                         translation units.

void f(void) {
    static int x;        inside a function: static storage
                         duration. One instance for the whole
                         program, keeps its value between calls.
}</pre>
<p>The file-scope meaning is the one to use liberally. Anything not in your header should be
<code>static</code>, because it shrinks the surface other code can reach into, lets the compiler
inline and discard aggressively, and stops two files accidentally sharing a name.</p>
<p>The function-local meaning is the one to be careful with, because it makes the function
non-reentrant and prevents a second instance.</p>

<h3>Tentative definitions, and the bug they used to hide</h3>
<pre>/* file1.c */   int count;
/* file2.c */   int count;</pre>
<p>Two definitions of the same object should be an error, and until GCC 10 it was not: both were
treated as tentative and merged into one common symbol. Two modules that each thought they owned
a variable silently shared it.</p>
<p>GCC 10 changed the default to <code>-fno-common</code>, so this is now an error, which is a
straightforward improvement. If you meet a legacy project that only builds with
<code>-fcommon</code>, that flag is marking a real defect rather than a compatibility
quirk.</p>
<p>The habit that avoids the whole area: <b>define in exactly one .c file, declare
<code>extern</code> in the header, and include that header in the defining file too</b> so the
compiler checks them against each other.</p>

<h3>inline in C is not inline in C++</h3>
<p>This trips up almost everyone, because the same keyword has different rules:</p>
<pre>/* header */
inline int clamp(int v) { return v &lt; 0 ? 0 : v; }</pre>
<p>In C99 and later, a plain <code>inline</code> definition is <b>not</b> an external definition.
If the compiler chooses not to inline a call, you get an undefined reference at link time,
which is a maddening error because the function is visibly right there.</p>
<p>The two things that work:</p>
<pre>static inline int clamp(int v) { ... }
        the usual answer for a header. Each translation unit
        gets its own copy, unused ones are discarded.

inline int clamp(int v) { ... }       in the header
extern inline int clamp(int v);       in exactly one .c file
        provides the one external definition.</pre>
<p>In practice <code>static inline</code> in the header is what firmware uses, and it is the
right default.</p>

<h3>What the linker actually does</h3>
<p>It matches <b>names</b>. Not types, not sizes, not signatures. C has no name mangling, so
every one of these links happily and misbehaves at runtime:</p>
<ul>
<li>An array defined in one file and declared as a pointer in another.</li>
<li>A function defined taking an <code>int</code> and declared taking a <code>long</code>.</li>
<li>A <code>uint16_t</code> defined and a <code>uint32_t</code> declared.</li>
</ul>
<p>Everything that protects you here comes from putting the declaration in a header and
including it in both places. That is the entire mechanism, and it is why "the header is just
for the callers" is a mistake.</p>

<h3>Header discipline</h3>
<ul>
<li>An include guard or <code>#pragma once</code> on every header. Guards are portable;
<code>#pragma once</code> is supported by every compiler you will meet and cannot be broken by a
copy-pasted macro name.</li>
<li>A header should compile on its own, meaning it includes what it uses. The test is a .c file
containing nothing but that one include.</li>
<li>Declare, do not define. No objects, no non-inline function bodies.</li>
<li>Prefer a forward declaration to an include where you only need the pointer type. It cuts
rebuild times and breaks dependency cycles.</li>
</ul>

<h3>The diagnostic that means this</h3>
<pre>undefined reference to 'foo'
    declared but never defined, or defined in a file or
    library the link never saw, or defined static in
    another file

multiple definition of 'foo'
    defined in a header, or defined in two .c files

foo.o: warning: relocation truncated to fit
    the linker script placed caller and callee too far
    apart for the branch encoding</pre>
`,
quiz: [
{ q: "What are the two unrelated meanings of <code>static</code>?",
o: ["Constant and immutable", "Internal linkage at file scope, and static storage duration inside a function", "Global and local", "Read-only and cached"],
a: 1, why: "File scope static shrinks the surface other code can reach and lets the compiler discard aggressively, so use it liberally. Function-local static makes the function non-reentrant, so use it carefully." },
{ q: "Why did two .c files each containing <code>int count;</code> once link without error?",
o: ["It was always an error", "Both were tentative definitions merged into one common symbol, until -fno-common became the GCC 10 default", "The linker deduplicated them", "One was optimised away"],
a: 1, why: "Two modules that each thought they owned a variable silently shared it. A legacy project that only builds with -fcommon is marking a real defect rather than a compatibility quirk." },
{ q: "Why can a plain <code>inline</code> function in a C header cause 'undefined reference'?",
o: ["The header was not included", "In C99 a plain inline definition is not an external definition, so a call the compiler chose not to inline has nothing to link to", "inline is not valid C", "It needs -O2"],
a: 1, why: "static inline in the header is the firmware answer: each translation unit gets its own copy and unused ones are discarded. The alternative is an extern inline declaration in exactly one .c file." },
{ q: "What does the C linker match on?",
o: ["Names and types", "Names only, since C has no name mangling", "Mangled signatures", "Sizes"],
a: 1, why: "An array defined and declared as a pointer, or an int defined and a long declared, all link happily and misbehave at runtime. The only protection is a shared header included by both sides." }
],
interview: {
q: "What is your rule for headers and source files?",
a: "Define in exactly one .c file, declare extern in the header, and include that header in the defining file as well. That last part is the one people skip, and it is the whole mechanism, because the C linker matches names only. It has no name mangling, so an array defined in one file and declared as a pointer in another links cleanly and then loads the first four characters of the string as an address. An int defined and a long declared does the same kind of thing. Including the header in the defining file is what makes the compiler check the two against each other, and without it nothing does. Beyond that: static on everything that is not in the header, because it shrinks the surface and lets the compiler discard aggressively; an include guard or pragma once everywhere; a header that includes what it uses, which I test by compiling a .c file that contains nothing but that one include; and forward declarations rather than includes where I only need the pointer type, because it cuts rebuild times and breaks cycles. The two specific traps I watch for are tentative definitions, where two files each saying int count used to merge into one common symbol before -fno-common became the default, and plain inline in a header, which in C99 is not an external definition, so a call the compiler declines to inline gives you an undefined reference to a function that is visibly right there. In firmware I use static inline for that."
}
},

{
id: "emb-c-expr",
track: "Embedded C",
sub: "C depth",
title: "Expression traps: precedence, sequencing and lexing",
mins: 26,
body: `
<p>Koenig's book is largely a catalogue of expressions that compile, do something, and do not do
what they look like. The list is short enough to learn and long enough to keep catching
people.</p>

<h3>The precedence mistakes worth memorising</h3>
<pre>if (x &amp; MASK == 0)          == binds tighter than &amp;
                            means x &amp; (MASK == 0)
                            which is x &amp; 0, always false

a &lt;&lt; 2 + 3                  + binds tighter than &lt;&lt;
                            means a &lt;&lt; 5

*p++                        ++ binds tighter than *
                            means *(p++)

if (a &amp; b || c)             || is lower, so (a &amp; b) || c
                            which is probably right, but
                            nobody reading it is sure</pre>
<p>The bitwise operators being lower than the comparisons is the historically famous one: it was
a deliberate choice in early C that Ritchie later said he regretted, and it is why every modern
compiler warns about it.</p>
<p>The rule that removes the whole category: <b>parenthesise anything mixing bitwise with
comparison, or shift with arithmetic.</b> Nobody has ever complained about too many brackets in
a register expression.</p>

<h3>Sequencing: the same object, twice, in one expression</h3>
<pre>i = i++;                     undefined
a[i] = i++;                  undefined
f(i++, i);                   unspecified order, so undefined
                             if it also modifies i
x = ++i + i++;               undefined</pre>
<p>The rule in C11 is about <b>sequencing</b>: if two accesses to the same object are
unsequenced and at least one is a modification, the behaviour is undefined. It is not that the
order is unspecified; the whole program is.</p>
<p>The operators that do sequence are worth knowing precisely, because they are the exceptions:
<code>&amp;&amp;</code>, <code>||</code>, <code>?:</code> and the comma operator each fully
evaluate the left side, including side effects, before the right.</p>
<pre>if (p != NULL &amp;&amp; p-&gt;ready)      safe: && sequences

if (n &gt; 0 &amp; buf[n-1] == 0)      not safe: & does not,
                                and both sides evaluate</pre>
<p>That second line is a real bug pattern. Someone writes <code>&amp;</code> for
<code>&amp;&amp;</code>, and the guard stops guarding.</p>

<h3>Function arguments have no order</h3>
<pre>f(get(), put());     either may run first
log(seq++, seq++);   unspecified, and here undefined too</pre>
<p>Compilers genuinely differ, and the same compiler differs between optimisation levels. Any
expression whose meaning depends on argument order is a bug waiting for the next toolchain
upgrade.</p>

<h3>The lexer is greedy</h3>
<p>C tokenises by taking the longest thing that could be a token, without regard for whether the
result parses:</p>
<pre>a---b        lexes as (a--) - b, not a - (--b)

x = y/*p;    the /* starts a comment. The rest of the
             file is swallowed until the next */

i+++j        lexes as (i++) + j</pre>
<p>The comment one is the dangerous one, because the error appears somewhere far away and looks
like something else entirely. A space, or brackets, fixes it.</p>

<h3>The dangling else</h3>
<pre>if (a)
    if (b) foo();
else bar();        binds to the INNER if, whatever the
                   indentation says</pre>
<p>An <code>else</code> attaches to the nearest unmatched <code>if</code>. Braces on every
conditional body remove the problem, which is why MISRA requires them, and it is the same reason
Apple's goto fail bug got through: the indentation said one thing and the compiler read
another.</p>

<h3>switch falls through</h3>
<pre>switch (state) {
case IDLE:
    start();       falls into RUNNING
case RUNNING:
    tick();
    break;
}</pre>
<p>Deliberate fallthrough is legitimate and occasionally the clearest way to write something.
Accidental fallthrough is a classic defect, so mark the intentional ones:
<code>__attribute__((fallthrough))</code>, the C23 <code>[[fallthrough]]</code>, or at minimum a
comment that <code>-Wimplicit-fallthrough</code> recognises.</p>

<h3>Two smaller ones that still catch people</h3>
<pre>sizeof(x++)          x is NOT incremented. sizeof does not
                     evaluate its operand, except for a VLA.

c = getchar();       wrong: getchar returns int, and EOF
                     does not fit in a char. Use int.

if (0.1 + 0.2 == 0.3)   false. Compare with a tolerance,
                        or use fixed point.</pre>
`,
quiz: [
{ q: "What does <code>if (x &amp; MASK == 0)</code> actually test?",
o: ["Whether the masked bits are zero", "x &amp; (MASK == 0), which is x &amp; 0 and therefore always false", "A syntax error", "Whether x equals MASK"],
a: 1, why: "== binds tighter than &, a precedence choice Ritchie later said he regretted, which is why compilers warn about it. Parenthesise anything mixing bitwise with comparison." },
{ q: "Why is <code>a[i] = i++;</code> undefined rather than merely unspecified?",
o: ["It is only unspecified", "Two unsequenced accesses to i with at least one modification makes the whole program undefined, not just the order", "i is uninitialised", "Arrays cannot be assigned"],
a: 1, why: "The distinction matters: unspecified would mean one of several outcomes, while undefined means the compiler may do anything, including deleting surrounding code it proves unreachable." },
{ q: "Which operators guarantee left-to-right sequencing?",
o: ["All binary operators", "&amp;&amp;, ||, ?: and the comma operator", "Only assignment", "None of them"],
a: 1, why: "This is why p != NULL && p->ready is safe and n > 0 & buf[n-1] == 0 is not. Writing & for && makes the guard stop guarding, and both sides evaluate." },
{ q: "How does <code>a---b</code> lex?",
o: ["a - (--b)", "(a--) - b, because the lexer takes the longest possible token", "A syntax error", "a - (-(-b))"],
a: 1, why: "The same greed makes x = y/*p; swallow the rest of the file as a comment, which is the dangerous one because the error surfaces far away and looks like something else." }
],
interview: {
q: "What kinds of expression bugs do you actively look for in review?",
a: "Three categories. Precedence first, particularly bitwise mixed with comparison, because if x ampersand MASK equals equals zero parses as x ampersand the result of the comparison, which is x ampersand zero and always false. Shift mixed with arithmetic is the same shape, since a shifted by two plus three is a shifted by five. Both are historical precedence choices that Ritchie said he regretted, so I just parenthesise anything mixing those categories and nobody has ever complained about too many brackets in a register expression. Second, sequencing: any expression that touches the same object twice where one access modifies it, so i equals i plus plus, or a subscript i assigned from i plus plus, or two increments in one argument list. That is undefined rather than merely unspecified, which matters because the compiler may then delete surrounding code it has proved unreachable. I also check for single ampersand where double was meant, because the short-circuit is what makes a null guard a guard, and with the bitwise version both sides evaluate. Third, structure: braces on every conditional body, because else binds to the nearest unmatched if regardless of indentation and that is exactly how the goto fail bug got through, and marked fallthrough in switch statements so the intentional ones are distinguishable from the accidental ones. Most of this is catchable with warnings turned on, so I would rather the build found it than a reviewer."
}
},

{
id: "emb-c-qual",
track: "Embedded C",
sub: "C depth",
title: "const, volatile and restrict, used properly",
mins: 24,
body: `
<p>Type qualifiers are the part of C that lets you tell the compiler something it cannot work out
for itself. Two of them constrain it and one of them frees it, and using them precisely is a
visible marker of someone who knows the language.</p>

<h3>const is about the access path, not the object</h3>
<p>The common misconception is that <code>const</code> means the object is immutable. It means
<b>you may not modify it through this name</b>. The object may be changed by someone else,
through another path, quite legally.</p>
<pre>void f(const int *p)
{
    int a = *p;
    g();               /* g may modify *p */
    int b = *p;        /* a and b may differ */
}</pre>
<p>Which means <code>const</code> is not a licence for the compiler to cache the value across a
call, and it is not a substitute for <code>volatile</code>.</p>

<h3>Where const earns its place in firmware</h3>
<ul>
<li><b>On pointer parameters you do not modify.</b> This is documentation the compiler enforces,
and it is the difference between an API you can trust and one you have to read.</li>
<li><b>On lookup tables at file scope.</b> <code>static const uint8_t table[256]</code> goes in
flash rather than costing RAM plus a startup copy, which on a small part is the whole
point.</li>
<li><b>On a pointer to a register.</b> <code>volatile uint32_t * const REG</code> says the
address never changes and the contents do.</li>
</ul>
<p>That flash placement is the one people miss. Drop the <code>const</code> and a 256-byte table
costs 256 bytes of RAM, 256 bytes of flash for the initialiser, and a copy at every boot.</p>

<h3>Casting const away</h3>
<pre>void f(const char *p) { ((char *)p)[0] = 'x'; }</pre>
<p>Legal to write. Undefined to execute if the object was actually defined <code>const</code>,
because it may be in flash or in a read-only section, and on a microcontroller a write there is
a fault or silently discarded.</p>
<p>It is legitimate in exactly one situation: you know the object is not const, and the
<code>const</code> arrived from an interface you do not control. Anywhere else, a cast that
removes a qualifier is a design problem being papered over, and it deserves a comment saying
why.</p>

<h3>const and volatile together</h3>
<pre>const volatile uint32_t STATUS;</pre>
<p>Not a contradiction: read-only to you, changed by the hardware. That is a status register
exactly. <code>const</code> stops your code writing it; <code>volatile</code> stops the compiler
assuming the value it read last time is still good.</p>

<h3>restrict is a promise you make</h3>
<pre>void copy(uint8_t *restrict dst,
          const uint8_t *restrict src, size_t n);</pre>
<p>It says: for the lifetime of these pointers, the object accessed through <code>dst</code> is
not accessed through <code>src</code> or anything else. Nothing checks this. If you lie, the
behaviour is undefined and the failure is a wrong answer rather than a crash.</p>
<p>What it buys is real. Without it, a loop writing through <code>dst</code> must reload from
<code>src</code> every iteration, because the compiler has to assume the write may have changed
what <code>src</code> sees. With it, values stay in registers and the loop can be vectorised or
unrolled.</p>
<p>This is exactly why <code>memcpy</code> declares both pointers <code>restrict</code> and
<code>memmove</code> does not, and it is the whole difference between them.</p>

<h3>Where restrict is worth using in firmware</h3>
<p>A signal-processing kernel with separate input and output buffers, called in a hot loop, is
the clear case. Measure it: on Cortex-M4 the difference on a filter loop is often twenty to
forty per cent, and occasionally nothing at all.</p>
<p>Where it is not worth it: anywhere the caller might reasonably pass the same buffer twice. An
in-place filter API with <code>restrict</code> on both pointers is a trap you have set for your
own users.</p>

<h3>The qualifier that does not do what its name suggests</h3>
<p><code>register</code> is a hint every modern compiler ignores for allocation purposes. The
one thing it still does is make it illegal to take the address of the variable, which is
occasionally useful and never worth writing.</p>
<p>Similarly, <code>const</code> in C does not create a compile-time constant. <code>const int
n = 8; int a[n];</code> is a variable-length array, not a fixed one. For a real constant use an
enum or a macro, which is why firmware headers still use both.</p>
`,
quiz: [
{ q: "What does <code>const</code> on a pointer parameter actually promise?",
o: ["The object never changes", "You will not modify it through this name; another path still can", "It is stored in flash", "It is thread-safe"],
a: 1, why: "So it is not a licence for the compiler to cache the value across a call, and it is not a substitute for volatile. It constrains the access path, not the object." },
{ q: "Why does <code>static const uint8_t table[256]</code> matter on a small microcontroller?",
o: ["It is faster to index", "It goes in flash, rather than costing 256 bytes of RAM plus an initialiser and a startup copy", "It prevents aliasing", "It allows inlining"],
a: 1, why: "Drop the const and the table is a mutable object, so it needs RAM, the flash still holds the initial values, and startup copies one to the other. On a part with 20 kB of RAM that is the whole point." },
{ q: "Is <code>const volatile uint32_t STATUS;</code> a contradiction?",
o: ["Yes, they conflict", "No: read-only to your code, changed by the hardware, which is exactly a status register", "Yes, unless it is a pointer", "No, but volatile is redundant"],
a: 1, why: "const stops your code writing it. volatile stops the compiler assuming the value it read last time is still good. Both are needed and they constrain different parties." },
{ q: "What does <code>restrict</code> promise, and what enforces it?",
o: ["That the pointer is const; the compiler enforces it", "That the object is not accessed through any other pointer; nothing enforces it", "That the memory is aligned; the linker enforces it", "That the pointer is not null; the runtime enforces it"],
a: 1, why: "It is why memcpy declares both pointers restrict and memmove does not. If you lie the behaviour is undefined and the symptom is a wrong answer rather than a crash." }
],
interview: {
q: "When would you use restrict, and what are you promising?",
a: "I am promising that for the lifetime of those pointers the object reached through one is not reached through the other, and nothing checks it. If I lie the behaviour is undefined, and the symptom is a wrong answer rather than a crash, which is the worse failure mode. What it buys is that the compiler no longer has to reload from the source on every iteration in case the write through the destination changed it, so values stay in registers and the loop can be unrolled or vectorised. That is exactly the difference between memcpy, which declares both restrict, and memmove, which does not and therefore has to handle overlap. In firmware the clear case is a DSP kernel with separate input and output buffers called in a hot loop, and I would measure it rather than assume, because on a Cortex-M4 filter loop I have seen anywhere from nothing to about forty per cent. Where I would not use it is any API where a caller might reasonably pass the same buffer for input and output, because an in-place filter with restrict on both pointers is a trap you have set for your own users. On the other two qualifiers: const constrains the access path rather than the object, so it is not a licence to cache across a call and not a substitute for volatile, and const volatile together is not a contradiction, it is precisely a hardware status register."
}
},

{
id: "emb-c-lib",
track: "Embedded C",
sub: "C depth",
title: "The standard library's sharp edges",
mins: 25,
body: `
<p>The C standard library was designed for a different machine and a different threat model.
Several of its functions are unsafe by design rather than by accident, and a few of them cost
more flash than the rest of your application.</p>

<h3>The string functions</h3>
<pre>strcpy(dst, src);
    no bound at all. There is no safe way to call it
    unless you already know the length.

strncpy(dst, src, n);
    does NOT guarantee a terminator. If src is n or more
    characters, dst is unterminated and every later
    strlen walks off the end.
    It also pads the whole of dst with zeros, so copying
    3 bytes into a 512-byte buffer writes 512.

strcat / strncat
    strncat's n is the number of characters to APPEND,
    not the size of the buffer. Almost everyone reads
    it as the buffer size.</pre>
<p>The pattern that is actually correct, and short:</p>
<pre>size_t n = snprintf(dst, sizeof dst, "%s", src);
if (n &gt;= sizeof dst) { /* it was truncated */ }</pre>
<p><code>snprintf</code> always terminates, and it returns <b>the length it wanted</b>, not the
length it wrote, which is how you detect truncation. Using the return value as the number of
bytes written is a common and dangerous mistake.</p>

<h3>strtok holds state</h3>
<p><code>strtok</code> keeps a static pointer between calls, so it is not reentrant, cannot be
used from two tasks, cannot be nested, and modifies the string you pass it. All four of those
have caused real firmware bugs.</p>
<p><code>strtok_r</code> takes the state explicitly and fixes three of them. The string is still
modified.</p>

<h3>Converting text to numbers</h3>
<pre>atoi("abc")    returns 0. So does atoi("0"). There is no
               way to tell them apart, and no overflow
               report.

strtol(s, &amp;end, 10)
               tells you where it stopped, and sets errno
               to ERANGE on overflow. Use this one.</pre>
<p>Checking <code>end != s</code> is what distinguishes "nothing was parsed" from "a zero was
parsed", and it is the check people leave out.</p>

<h3>memcpy against memmove</h3>
<p><code>memcpy</code> declares both pointers <code>restrict</code>, so overlapping regions are
undefined. <code>memmove</code> handles overlap and is what you want for shifting within a
buffer.</p>
<p>The trap is that <code>memcpy</code> usually appears to work on small sizes, because the
implementation copies forwards and the overlap happens to be benign. Then someone increases the
buffer, the implementation switches to a word-at-a-time or backwards path, and it stops
working.</p>

<h3>What printf costs</h3>
<p>On a microcontroller this is a real budget item:</p>
<pre>printf with integers only     ~3 to 8 kB
printf with %f                +10 to 25 kB, and it may
                              pull in soft-float too
newlib-nano, integer only     ~2 kB
a hand-rolled formatter       a few hundred bytes</pre>
<p>Most vendor projects link the full version by default. If flash is tight, switching to
newlib-nano and passing <code>-u _printf_float</code> only where you actually need floats is
usually the single largest saving available, and it takes a linker flag rather than a code
change.</p>
<p><code>printf</code> is also not reentrant in most implementations, so calling it from an ISR
and from a task will eventually interleave or corrupt.</p>

<h3>malloc on a microcontroller</h3>
<p>The problem is not that it is slow. It is that in a long-running system with mixed
allocation sizes the heap fragments, so a request that fits in the total free space fails
because no single block is big enough. The failure arrives after weeks, not in testing.</p>
<p>The usual firmware positions, in order of preference: allocate nothing at runtime; allocate
everything once at startup and never free; or use fixed-size pools, where fragmentation cannot
occur by construction.</p>
<p>If you must use <code>malloc</code>, check the return value every time. A microcontroller
heap is small enough that failure is a realistic case, not a formality.</p>

<h3>Functions with hidden state</h3>
<p>Anything holding state between calls is a reentrancy hazard, and the list is longer than
people expect: <code>strtok</code>, <code>rand</code>, <code>localtime</code>,
<code>asctime</code>, <code>gmtime</code>, <code>strerror</code>, and <code>errno</code>
itself unless the library is built thread-aware.</p>
<p><code>rand</code> deserves a separate warning: it is a weak PRNG with a shared seed and is
never acceptable for anything cryptographic, including nonces, session identifiers and key
material.</p>

<h3>What to reach for instead</h3>
<pre>strcpy, strncpy    ->  snprintf, or memcpy with an
                       explicit length you computed
strcat             ->  track the offset yourself
strtok             ->  strtok_r, or write the split
atoi               ->  strtol with the end pointer checked
memcpy (overlap)   ->  memmove
printf (flash)     ->  newlib-nano, or your own formatter
malloc             ->  static allocation or a fixed pool
rand (security)    ->  the hardware TRNG</pre>
`,
quiz: [
{ q: "What is wrong with <code>strncpy</code>?",
o: ["It is slow", "It does not guarantee a terminator, and it pads the whole destination with zeros", "It cannot be inlined", "It requires malloc"],
a: 1, why: "If the source is n characters or longer, the destination is unterminated and every later strlen walks off the end. Copying 3 bytes into a 512-byte buffer also writes all 512." },
{ q: "What does <code>snprintf</code> return?",
o: ["The number of bytes written", "The length it wanted to write, which is how you detect truncation", "Zero on success", "The remaining space"],
a: 1, why: "So comparing the return against the buffer size tells you it was truncated. Using it as the number of bytes written, for instance to advance an offset, is a common and dangerous mistake." },
{ q: "Why does <code>atoi</code> have no place in firmware that parses input?",
o: ["It is not standard", "It returns 0 for both \"abc\" and \"0\" with no way to distinguish them and no overflow report", "It is slow", "It allocates"],
a: 1, why: "strtol gives you an end pointer and sets errno to ERANGE on overflow. Checking end != s is what separates 'nothing parsed' from 'a zero parsed', and it is the check people omit." },
{ q: "Why is heap fragmentation the real objection to malloc in long-running firmware?",
o: ["It is too slow for real time", "A request that fits in the total free space fails because no single block is big enough, and it happens after weeks", "It is not thread safe", "It wastes flash"],
a: 1, why: "The failure arrives in the field rather than in testing. Fixed-size pools remove it by construction, which is why they are the usual answer when allocation is genuinely needed." }
],
interview: {
q: "Which standard library functions do you avoid in firmware, and what do you use instead?",
a: "The string functions first. strcpy has no bound at all, and strncpy is worse than people think because it does not guarantee a terminator, so if the source is n characters or longer every later strlen walks off the end, and it also pads the entire destination, so copying three bytes into a 512-byte buffer writes 512. I use snprintf, which always terminates, and I check the return against the buffer size to detect truncation, being careful that the return is the length it wanted rather than the length it wrote. atoi I avoid entirely because it returns zero for both a zero and for garbage with no way to tell them apart and no overflow report, so strtol with the end pointer checked. strtok holds static state, so it is not reentrant, cannot be nested and modifies the string; strtok_r fixes most of that. memcpy on overlapping regions is undefined and usually appears to work on small sizes, which is the dangerous part, because it breaks when someone grows the buffer and the implementation switches path. Then the two big embedded ones: printf, where the full version with float support can be twenty-five kilobytes and is usually linked by default, so newlib-nano is often the single largest flash saving available for a linker flag; and malloc, where the real objection is fragmentation rather than speed, because a request that fits in the total free space fails after weeks in the field. I would rather allocate statically or use fixed-size pools where it cannot happen by construction."
}
},

{
id: "emb-c-optimiser",
track: "Embedded C",
sub: "C depth",
title: "What the optimiser is allowed to do",
mins: 26,
body: `
<p>A great many "the compiler broke my code" reports are the compiler correctly exploiting a
promise the code made and did not keep. Knowing the rules turns those from mysteries into
diagnoses.</p>

<h3>The as-if rule</h3>
<p>The compiler may do anything it likes provided the <b>observable behaviour</b> of a
conforming program is unchanged. Observable behaviour is a short and specific list: accesses to
<code>volatile</code> objects, data written to files, and input and output interactions.</p>
<p>Note what is not on it. Execution time is not observable. Memory contents are not observable.
The order of two non-volatile writes is not observable. Which is why:</p>
<pre>for (int i = 0; i &lt; 1000; i++) { }   may vanish entirely
uint32_t x = *reg; x = *reg;         may become one read
memset(key, 0, sizeof key);          may be removed if key
                                     is not read afterwards</pre>
<p>That third one is a genuine security defect with a name, and the fixes are
<code>explicit_bzero</code>, <code>memset_s</code>, or a volatile pointer.</p>

<h3>Undefined behaviour is a promise, not a bug report</h3>
<p>When the standard says a construct is undefined, the compiler is entitled to assume it never
happens, and to optimise on that assumption. This is the mechanism behind the most surprising
results:</p>
<pre>void f(struct s *p)
{
    int x = p-&gt;field;      /* dereference: so p is not NULL */
    if (p == NULL) return; /* therefore this test is dead */
    use(x);
}</pre>
<p>The compiler deletes the null check. Not maliciously: dereferencing null is undefined, so a
conforming program cannot reach the dereference with a null pointer, so the test can only ever
be false.</p>
<p>The lesson is that a check placed <b>after</b> the thing it was meant to guard is not a
weakened check, it is no check. The same reasoning removes overflow tests written as
<code>if (a + b &lt; a)</code> on signed types, because signed overflow is undefined.</p>

<h3>Strict aliasing, and the fix</h3>
<p>The compiler may assume that objects of different types do not overlap in memory, which lets
it keep values in registers across writes through unrelated pointers.</p>
<pre>float bits_to_float(uint32_t u)
{
    return *(float *)&amp;u;      /* undefined: type punning
                                 through a cast */
}</pre>
<p>At <code>-O0</code> it works. At <code>-O2</code> the compiler may reorder or elide, and you
get an old value or a nonsense one. The correct forms:</p>
<pre>float f;
memcpy(&amp;f, &amp;u, sizeof f);     /* always correct, and
                                 optimises to nothing */

union { uint32_t u; float f; } v = { .u = u };
return v.f;                    /* defined in C, not in C++ */</pre>
<p><code>memcpy</code> for type punning is the answer to know. Every compiler recognises the
idiom and emits a single move, so it is free.</p>
<p><code>char</code>, <code>unsigned char</code> and <code>int8_t</code> are exempt: they may
alias anything, which is why byte-wise serialisation code is safe.</p>

<h3>What volatile does and does not buy</h3>
<p>It forces every access in the source to happen in the machine code, in source order relative
to other volatile accesses. That is all.</p>
<p>It does <b>not</b> make an operation atomic, does not order volatile against non-volatile
accesses, and does not emit a memory barrier, so on a part with a write buffer or a cache you
may still need <code>__DMB()</code>.</p>
<p>The failure that follows from the first point is the classic: <code>volatile uint8_t
count; count++;</code> is still a read, a modify and a write, and an interrupt between them
still loses an update.</p>

<h3>Why a bug appears only at -O2</h3>
<p>Almost always one of four things, and the list is worth having ready:</p>
<ul>
<li>A missing <code>volatile</code> on something an ISR or the hardware changes.</li>
<li>Undefined behaviour the optimiser exploited, most often signed overflow or aliasing.</li>
<li>A timing dependency: a delay loop that got deleted, or code that only worked because it was
slow.</li>
<li>Reliance on uninitialised memory that happened to be zero at <code>-O0</code>.</li>
</ul>
<p>The useful diagnostic order is: build at <code>-O2</code> with <code>-fsanitize=undefined</code>
if you can run it on the host, then try <code>-fno-strict-aliasing</code>, and if that fixes it
you have found a type-punning bug rather than a solution.</p>

<h3>Settle it by reading the output</h3>
<p><code>-S -fverbose-asm</code>, or objdump on the ELF, ends the argument in a minute. Two
things worth checking directly:</p>
<ul>
<li>Whether your register accesses are actually there, and how many. This catches a missing
<code>volatile</code> immediately.</li>
<li>Whether a barrier or a bit-band write survived.</li>
</ul>
<p>Reading a hundred lines of Cortex-M assembly is a much smaller skill than it looks, and it is
the fastest way to answer a question about what the compiler did.</p>
`,
quiz: [
{ q: "What is observable behaviour under the as-if rule?",
o: ["Everything the program does", "Volatile accesses, file writes, and input/output interactions", "Memory contents and timing", "Only the return value"],
a: 1, why: "Execution time and the order of non-volatile writes are not on the list, which is why an empty delay loop may vanish and why memset of a key buffer may be removed if nothing reads it afterwards." },
{ q: "Why does the compiler delete a null check placed after a dereference?",
o: ["It is a compiler bug", "Dereferencing null is undefined, so a conforming program cannot reach that point with null, making the test provably false", "The optimiser is too aggressive", "Only at -O3"],
a: 1, why: "A check placed after the thing it was meant to guard is not a weakened check, it is no check. The same reasoning removes signed overflow tests written as if (a + b &lt; a)." },
{ q: "What is the correct way to reinterpret a uint32_t's bits as a float?",
o: ["*(float *)&amp;u", "memcpy into a float, which every compiler turns into a single move", "A C-style cast", "(float)u"],
a: 1, why: "The pointer cast violates strict aliasing: it works at -O0 and may be reordered or elided at -O2. A union is also defined in C, though not in C++. char types are exempt, which is why byte-wise serialisation is safe." },
{ q: "A bug appears only at -O2. What are the likely causes?",
o: ["A compiler bug", "Missing volatile, exploited undefined behaviour, a deleted timing dependency, or reliance on memory that happened to be zero", "Insufficient stack", "Linker script problems"],
a: 1, why: "The diagnostic order is UBSan on the host if you can, then -fno-strict-aliasing, and if that fixes it you have located a type-punning bug rather than found a solution." }
],
interview: {
q: "A colleague says the optimiser broke their code at -O2. How do you approach it?",
a: "I would start from the assumption that the compiler is correctly exploiting a promise the code made and did not keep, because that is what it usually turns out to be. The framework is the as-if rule: the compiler can do anything as long as observable behaviour is unchanged, and observable is a short list, meaning volatile accesses, file writes and I/O. Execution time is not on it, memory contents are not on it, and the order of two non-volatile writes is not on it, which is why an empty delay loop can vanish and why a memset that clears a key buffer can be removed if nothing reads it afterwards. Then undefined behaviour, which is a promise rather than a bug report: if a construct is undefined the compiler may assume it never happens, so a null check placed after a dereference gets deleted, because a conforming program could not have reached the dereference with null. That is not aggression, it is the rule, and the practical lesson is that a check after the thing it guards is not a weak check, it is no check. In practice I would run it at -O2 under UBSan on the host if the code can be built there, then try -fno-strict-aliasing, and if that fixes it I would treat it as having located a type-punning bug rather than as a solution, and change the cast to a memcpy, which every compiler turns into a single move. And I would read the disassembly, because a hundred lines of Cortex-M assembly settles in a minute what an argument about the optimiser can run all afternoon."
}
}

);
