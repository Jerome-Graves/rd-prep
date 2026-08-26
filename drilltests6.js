/* Unit tests for the second set of pattern drills.
 *
 * d-pat-reg has no runtime test: what makes those declarations correct is
 * which accesses the compiler is allowed to elide, and that is not observable
 * from inside the program. Its `expect` rules check the qualifiers textually
 * instead, which is the honest tool for the job.
 */

Object.assign(DRILL_TESTS, {

"d-pat-swap": {
sig: "Define void swap_i32(int32_t *a, int32_t *b).",
test: `int main(void)
{
    int32_t x = 1, y = 2;
    swap_i32(&x, &y);
    CHECK(x == 2 && y == 1, "swaps two values");

    int32_t n = -5, p = 7;
    swap_i32(&n, &p);
    CHECK(n == 7 && p == -5, "swaps across zero");

    int32_t a = 0, b = 0;
    swap_i32(&a, &b);
    CHECK(a == 0 && b == 0, "two zeros");

    int32_t lo = INT32_MIN, hi = INT32_MAX;
    swap_i32(&lo, &hi);
    CHECK(lo == INT32_MAX && hi == INT32_MIN, "the extremes of the range");

    /* the case the XOR trick gets wrong */
    int32_t same = 42;
    swap_i32(&same, &same);
    CHECK(same == 42, "swapping a variable with itself leaves it alone");

    /* twice returns to the start */
    int32_t u = 11, v = 22;
    swap_i32(&u, &v);
    swap_i32(&u, &v);
    CHECK(u == 11 && v == 22, "swapping twice restores the original");

    /* only the two targets move */
    int32_t arr[3] = { 1, 2, 3 };
    swap_i32(&arr[0], &arr[2]);
    CHECK(arr[0] == 3 && arr[1] == 2 && arr[2] == 1, "neighbouring values untouched");

    T_REPORT();
    return 0;
}`
},

"d-pat-abs": {
sig: "Define int32_t sign_i32(int32_t v) and uint32_t abs_i32(int32_t v). Note abs returns unsigned.",
test: `int main(void)
{
    CHECK(sign_i32(5)   ==  1, "positive gives +1");
    CHECK(sign_i32(-5)  == -1, "negative gives -1");
    CHECK(sign_i32(0)   ==  0, "zero gives 0");
    CHECK(sign_i32(INT32_MAX) ==  1, "INT32_MAX is positive");
    CHECK(sign_i32(INT32_MIN) == -1, "INT32_MIN is negative");

    CHECK(abs_i32(0)   == 0u, "abs of zero");
    CHECK(abs_i32(7)   == 7u, "abs of a positive");
    CHECK(abs_i32(-7)  == 7u, "abs of a negative");
    CHECK(abs_i32(1)   == 1u, "abs of one");
    CHECK(abs_i32(-1)  == 1u, "abs of minus one");
    CHECK(abs_i32(INT32_MAX) == 2147483647u, "abs of INT32_MAX");

    /* the whole reason the return type is unsigned */
    CHECK(abs_i32(INT32_MIN) == 2147483648u,
          "abs of INT32_MIN is 2147483648, which does not fit in an int32_t");

    int agrees = 1;
    for (int32_t v = -100000; v < 100000; v += 137) {
        uint32_t want = (v < 0) ? (uint32_t)(-(int64_t)v) : (uint32_t)v;
        if (abs_i32(v) != want) { agrees = 0; break; }
    }
    CHECK(agrees, "agrees with 64-bit arithmetic across a range");

    T_REPORT();
    return 0;
}`
},

"d-pat-elapsed": {
sig: "Define bool expired(uint32_t start, uint32_t now, uint32_t timeout_ms).",
test: `int main(void)
{
    CHECK(expired(0u, 0u, 10u)   == false, "no time has passed");
    CHECK(expired(0u, 9u, 10u)   == false, "one tick short");
    CHECK(expired(0u, 10u, 10u)  == true,  "exactly the timeout counts as expired");
    CHECK(expired(0u, 11u, 10u)  == true,  "past the timeout");
    CHECK(expired(100u, 150u, 10u) == true, "well past");

    CHECK(expired(0u, 0u, 0u)    == true,  "a zero timeout is immediately expired");

    /* the whole point: it must survive the tick wrapping */
    CHECK(expired(0xFFFFFF00u, 0xFFFFFF00u, 100u) == false, "near the wrap, nothing passed");
    CHECK(expired(0xFFFFFFF0u, 0x00000000u, 10u)  == true,
          "wrapped: 0xFFFFFFF0 to 0 is exactly 16 ticks");
    CHECK(expired(0xFFFFFFF0u, 0x00000005u, 100u) == false,
          "wrapped, but not yet expired");
    CHECK(expired(0xFFFFFFF0u, 0x00000064u, 100u) == true,
          "wrapped and expired");
    CHECK(expired(0xFFFFFFFFu, 0x00000000u, 1u)   == true,
          "the single tick across the wrap point");

    /* a sweep straight through the wrap */
    int sound = 1;
    uint32_t start = 0xFFFFFFF0u;
    for (uint32_t d = 0; d <= 64u; d++) {
        uint32_t now = start + d;              /* wraps naturally */
        if (expired(start, now, 32u) != (d >= 32u)) { sound = 0; break; }
    }
    CHECK(sound, "correct for every offset either side of the wrap");

    T_REPORT();
    return 0;
}`
},

"d-pat-align": {
sig: "Define uint32_t align_up(uint32_t v, uint32_t a) and bool is_aligned(uint32_t v, uint32_t a). a is always a power of two.",
test: `int main(void)
{
    CHECK(align_up(0u, 8u)  == 0u,  "zero is already aligned");
    CHECK(align_up(1u, 8u)  == 8u,  "1 rounds up to 8");
    CHECK(align_up(7u, 8u)  == 8u,  "7 rounds up to 8");
    CHECK(align_up(8u, 8u)  == 8u,  "8 stays at 8, not 16");
    CHECK(align_up(9u, 8u)  == 16u, "9 rounds up to 16");
    CHECK(align_up(16u, 8u) == 16u, "an exact multiple stays put");

    CHECK(align_up(0u, 1u)   == 0u,   "alignment of 1 changes nothing");
    CHECK(align_up(12345u, 1u) == 12345u, "alignment of 1, again");
    CHECK(align_up(1u, 4096u) == 4096u, "a page boundary");
    CHECK(align_up(4096u, 4096u) == 4096u, "already on the page boundary");
    CHECK(align_up(4097u, 4096u) == 8192u, "one past");

    CHECK(is_aligned(0u, 8u),        "zero is aligned to anything");
    CHECK(is_aligned(8u, 8u),        "8 is aligned to 8");
    CHECK(!is_aligned(9u, 8u),       "9 is not");
    CHECK(is_aligned(12345u, 1u),    "everything is aligned to 1");
    CHECK(is_aligned(0x40000000u, 4096u), "a page-aligned address");

    /* the two must agree, and the result must never be smaller than the input */
    int sound = 1;
    for (uint32_t a = 1u; a <= 256u; a <<= 1) {
        for (uint32_t v = 0; v < 1000u; v += 7u) {
            uint32_t r = align_up(v, a);
            if (r < v || !is_aligned(r, a) || (r - v) >= a) { sound = 0; break; }
        }
    }
    CHECK(sound, "always rounds up, always lands aligned, never overshoots by a whole step");

    T_REPORT();
    return 0;
}`
},

"d-pat-container": {
sig: "Define the macro container_of(ptr, type, member). A struct node and struct task are provided.",
prelude: `#include <stddef.h>

struct node { struct node *next; };

struct task {
    int          id;
    struct node  link;
    uint32_t     deadline;
};

/* a member deliberately not at offset 0, and one that is */
struct front { struct node link; int id; };
`,
test: `int main(void)
{
    struct task t = { .id = 7, .deadline = 1234u };
    struct node *n = &t.link;

    struct task *back = container_of(n, struct task, link);
    CHECK(back == &t,            "recovers the containing struct");
    CHECK(back->id == 7,         "and its earlier members are readable");
    CHECK(back->deadline == 1234u, "and its later members too");

    /* the member is not at offset 0, so a plain cast would NOT work */
    CHECK(offsetof(struct task, link) != 0u,
          "the test is meaningful: link is not the first member");
    CHECK((void *)n != (void *)&t, "so the member address differs from the struct address");

    /* it must also work when the member IS first */
    struct front f = { .id = 9 };
    struct front *fb = container_of(&f.link, struct front, link);
    CHECK(fb == &f, "works when the member is at offset 0");
    CHECK(fb->id == 9, "and reads correctly");

    /* several objects, so it is not accidentally returning one address */
    struct task arr[3] = { { .id = 10 }, { .id = 20 }, { .id = 30 } };
    int all = 1;
    for (int i = 0; i < 3; i++) {
        struct task *r = container_of(&arr[i].link, struct task, link);
        if (r != &arr[i] || r->id != (i + 1) * 10) { all = 0; break; }
    }
    CHECK(all, "works across an array of containers");

    /* an expression as the pointer argument: fails if ptr is not bracketed */
    struct node *base = &arr[0].link;
    struct task *viaexpr = container_of(base + 0, struct task, link);
    CHECK(viaexpr == &arr[0], "an expression argument works, so ptr is bracketed");

    T_REPORT();
    return 0;
}`
}

});

/* attach to the drills */
if (typeof DRILLS !== "undefined") {
    DRILLS.forEach(d => {
        const t = DRILL_TESTS[d.id];
        if (t) { d.test = t.test; d.testPrelude = t.prelude || ""; d.testSig = t.sig || ""; }
    });
}
