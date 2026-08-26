/* Unit tests for the warm-up drills.
 *
 * Every one of these has a case that separates a careful answer from a quick
 * one, so the tests are written to fail on the quick one: reversing the
 * terminator, popcount of zero, the signed-promotion shift, cap == 0, INT32_MIN,
 * an exact power of two, and utoa of zero.
 */

Object.assign(DRILL_TESTS, {

// ------------------------------------------------------------ reverse a string
"d-write-strrev": {
sig: "Define void str_reverse(char *s) reversing the string in place.",
test: `static int rev_is(const char *in, const char *want, const char *name)
{
    char buf[64];
    strcpy(buf, in);
    str_reverse(buf);
    int ok = (strcmp(buf, want) == 0);
    CHECK(ok, name);
    return ok;
}

int main(void)
{
    rev_is("",        "",        "empty string stays empty");
    rev_is("a",       "a",       "single character");
    rev_is("ab",      "ba",      "even length");
    rev_is("abc",     "cba",     "odd length");
    rev_is("abcdef",  "fedcba",  "longer even length");
    rev_is("a b c",   "c b a",   "spaces are just characters");

    /* the classic wrong answer reverses the terminator too, which leaves an
       empty string; strcmp above already catches that, but check the length
       explicitly so the failure is unambiguous */
    char t[16];
    strcpy(t, "hello");
    str_reverse(t);
    CHECK(strlen(t) == 5, "terminator is not moved to the front");

    /* must not write past the terminator */
    char guard[10];
    memset(guard, '#', sizeof guard);
    strcpy(guard, "abc");                  /* guard[4..9] still '#' */
    str_reverse(guard);
    CHECK(guard[4] == '#', "does not write past the terminator");

    str_reverse(NULL);
    CHECK(1, "NULL does not crash");

    T_REPORT();
    return 0;
}`
},

// ---------------------------------------------------------------- popcount
"d-write-popcount": {
sig: "Define int popcount32(uint32_t v) returning the number of set bits.",
test: `int main(void)
{
    CHECK(popcount32(0u)          == 0,  "zero has no bits set");
    CHECK(popcount32(1u)          == 1,  "one");
    CHECK(popcount32(2u)          == 1,  "a single high-ish bit");
    CHECK(popcount32(3u)          == 2,  "two adjacent bits");
    CHECK(popcount32(0xFFFFFFFFu) == 32, "all bits set");
    CHECK(popcount32(0x80000000u) == 1,  "only the top bit, no sign trouble");
    CHECK(popcount32(0x55555555u) == 16, "alternating, even positions");
    CHECK(popcount32(0xAAAAAAAAu) == 16, "alternating, odd positions");
    CHECK(popcount32(0x0F0F0F0Fu) == 16, "nibble pattern");

    /* every single bit position, one at a time */
    int all_one = 1;
    for (int i = 0; i < 32; i++)
        if (popcount32(1u << i) != 1) all_one = 0;
    CHECK(all_one, "every single-bit value counts as 1");

    /* a known-good reference over a spread of values */
    int agrees = 1;
    for (uint32_t v = 0; v < 70000u; v += 7u) {
        int n = 0;
        for (uint32_t t = v; t; t >>= 1) n += (int)(t & 1u);
        if (popcount32(v) != n) { agrees = 0; break; }
    }
    CHECK(agrees, "agrees with a reference over 10000 values");

    T_REPORT();
    return 0;
}`
},

// ------------------------------------------------------------- byte order
"d-write-bswap": {
sig: "Define uint32_t bswap32(uint32_t v) and uint32_t load_be32(const uint8_t *p).",
test: `int main(void)
{
    CHECK(bswap32(0x12345678u) == 0x78563412u, "bswap32 of a known value");
    CHECK(bswap32(0x00000000u) == 0x00000000u, "bswap32 of zero");
    CHECK(bswap32(0xFFFFFFFFu) == 0xFFFFFFFFu, "bswap32 of all ones");
    CHECK(bswap32(0x000000FFu) == 0xFF000000u, "lowest byte moves to the top");
    CHECK(bswap32(0x80000000u) == 0x00000080u, "top bit does not sign-extend");

    int inv = 1;
    for (uint32_t v = 0; v < 100000u; v += 3617u)
        if (bswap32(bswap32(v)) != v) { inv = 0; break; }
    CHECK(inv, "bswap32 is its own inverse");

    /* load_be32 must not depend on the host's byte order */
    uint8_t a[4] = { 0x12, 0x34, 0x56, 0x78 };
    CHECK(load_be32(a) == 0x12345678u, "load_be32 reads big-endian");

    uint8_t b[4] = { 0xFF, 0xFF, 0xFF, 0xFF };
    CHECK(load_be32(b) == 0xFFFFFFFFu, "load_be32 of all ones");

    uint8_t c[4] = { 0x80, 0x00, 0x00, 0x01 };
    CHECK(load_be32(c) == 0x80000001u, "top bit set: no signed promotion bug");

    uint8_t z[4] = { 0x00, 0x00, 0x00, 0x00 };
    CHECK(load_be32(z) == 0u, "load_be32 of zero");

    /* an unaligned source must still work, which rules out a pointer cast */
    uint8_t raw[9] = { 0, 0xDE, 0xAD, 0xBE, 0xEF, 0, 0, 0, 0 };
    CHECK(load_be32(raw + 1) == 0xDEADBEEFu, "works from an unaligned address");

    T_REPORT();
    return 0;
}`
},

// -------------------------------------------------------- strlen and copy
"d-write-mystr": {
sig: "Define size_t my_strlen(const char *s) and size_t safe_copy(char *dst, size_t cap, const char *src) returning the length it wanted to write.",
test: `int main(void)
{
    CHECK(my_strlen("")      == 0u, "my_strlen of empty");
    CHECK(my_strlen("a")     == 1u, "my_strlen of one");
    CHECK(my_strlen("hello") == 5u, "my_strlen of five");

    char buf[8];

    memset(buf, '#', sizeof buf);
    CHECK(safe_copy(buf, sizeof buf, "abc") == 3u, "returns the source length");
    CHECK(strcmp(buf, "abc") == 0,                 "copies a short string");

    /* exactly fits: 7 characters plus a terminator in 8 bytes */
    memset(buf, '#', sizeof buf);
    CHECK(safe_copy(buf, sizeof buf, "abcdefg") == 7u, "exact fit returns 7");
    CHECK(strcmp(buf, "abcdefg") == 0,                 "exact fit copies all of it");

    /* truncation: returns what it wanted, and still terminates */
    memset(buf, '#', sizeof buf);
    size_t want = safe_copy(buf, sizeof buf, "abcdefghij");
    CHECK(want == 10u,                    "truncated: returns the wanted length");
    CHECK(want >= sizeof buf,             "so truncation is detectable");
    CHECK(strlen(buf) == 7u,              "truncated to cap - 1");
    CHECK(buf[7] == '\\0',                 "still terminated");

    /* empty source */
    memset(buf, '#', sizeof buf);
    CHECK(safe_copy(buf, sizeof buf, "") == 0u, "empty source returns 0");
    CHECK(buf[0] == '\\0',                       "empty source terminates");

    /* cap == 0: nothing may be written at all, not even a terminator */
    char guard[4];
    memset(guard, '#', sizeof guard);
    size_t w = safe_copy(guard, 0u, "abc");
    CHECK(w == 3u,          "cap 0 still reports the wanted length");
    CHECK(guard[0] == '#',  "cap 0 writes nothing at all");

    /* cap == 1: only room for the terminator */
    memset(guard, '#', sizeof guard);
    CHECK(safe_copy(guard, 1u, "abc") == 3u, "cap 1 reports the wanted length");
    CHECK(guard[0] == '\\0',                  "cap 1 writes just a terminator");
    CHECK(guard[1] == '#',                   "cap 1 writes nothing more");

    T_REPORT();
    return 0;
}`
},

// ------------------------------------------------------------ parse an int
"d-write-parseint": {
sig: "Define bool parse_i32(const char *s, int32_t *out) returning true only if the whole string is a valid decimal integer that fits.",
test: `static void good(const char *s, int32_t want, const char *name)
{
    int32_t v = 12345;
    int ok = parse_i32(s, &v) && v == want;
    CHECK(ok, name);
}
static void bad(const char *s, const char *name)
{
    int32_t v = 12345;
    int ok = (parse_i32(s, &v) == false);
    CHECK(ok, name);
}

int main(void)
{
    good("0",           0,           "zero");
    good("1",           1,           "one");
    good("-1",         -1,           "negative one");
    good("+7",          7,           "leading plus");
    good("123",       123,           "a few digits");
    good("2147483647",  2147483647,  "INT32_MAX");
    good("-2147483648", (-2147483647 - 1), "INT32_MIN, whose magnitude is larger");
    good("0000012",    12,           "leading zeros");

    bad("",            "empty string");
    bad("-",           "a lone minus");
    bad("+",           "a lone plus");
    bad("abc",         "not a number at all");
    bad("12x",         "trailing junk");
    bad("1 2",         "an embedded space");
    bad(" 12",         "leading whitespace is not accepted");
    bad("2147483648",  "one past INT32_MAX");
    bad("-2147483649", "one past INT32_MIN");
    bad("9999999999",  "far past the range");
    bad("99999999999999999999", "far enough to wrap a naive accumulator");

    /* atoi cannot distinguish these two, which is the whole point */
    int32_t a = 99, b = 99;
    int za = parse_i32("0", &a);
    int zb = parse_i32("abc", &b);
    CHECK(za && a == 0 && !zb, "tells \\"0\\" apart from garbage");

    T_REPORT();
    return 0;
}`
},

// ----------------------------------------------------------- reverse bits
"d-write-revbits": {
sig: "Define uint32_t reverse_bits32(uint32_t v).",
test: `int main(void)
{
    CHECK(reverse_bits32(0u)          == 0u,          "zero");
    CHECK(reverse_bits32(0xFFFFFFFFu) == 0xFFFFFFFFu, "all ones");
    CHECK(reverse_bits32(1u)          == 0x80000000u, "bit 0 becomes bit 31");
    CHECK(reverse_bits32(0x80000000u) == 1u,          "bit 31 becomes bit 0");
    CHECK(reverse_bits32(0x12345678u) == 0x1E6A2C48u, "a known value");
    CHECK(reverse_bits32(0x55555555u) == 0xAAAAAAAAu, "alternating swaps parity");

    /* this is NOT a byte swap: 0x01 must not become 0x01000000 */
    CHECK(reverse_bits32(0x00000001u) != 0x01000000u, "not a byte swap");

    /* every single bit lands in the mirrored position */
    int mirrored = 1;
    for (int i = 0; i < 32; i++)
        if (reverse_bits32(1u << i) != (1u << (31 - i))) mirrored = 0;
    CHECK(mirrored, "every single bit mirrors to 31 - i");

    /* its own inverse */
    int inv = 1;
    for (uint32_t v = 0; v < 200000u; v += 4099u)
        if (reverse_bits32(reverse_bits32(v)) != v) { inv = 0; break; }
    CHECK(inv, "applying it twice returns the original");

    T_REPORT();
    return 0;
}`
},

// -------------------------------------------------------- powers of two
"d-write-pow2": {
sig: "Define bool is_pow2(uint32_t v) and uint32_t round_up_pow2(uint32_t v).",
test: `int main(void)
{
    CHECK(is_pow2(0u) == false, "zero is NOT a power of two");
    CHECK(is_pow2(1u),          "one is");
    CHECK(is_pow2(2u),          "two is");
    CHECK(is_pow2(3u) == false, "three is not");
    CHECK(is_pow2(4u),          "four is");
    CHECK(is_pow2(0x80000000u), "2^31 is");
    CHECK(is_pow2(0xFFFFFFFFu) == false, "all ones is not");
    CHECK(is_pow2(6u) == false, "six is not");

    int agrees = 1;
    for (uint32_t v = 0; v < 5000u; v++) {
        int n = 0;
        for (uint32_t t = v; t; t >>= 1) n += (int)(t & 1u);
        int want = (v != 0u) && (n == 1);
        if ((is_pow2(v) ? 1 : 0) != want) { agrees = 0; break; }
    }
    CHECK(agrees, "is_pow2 agrees with a bit-count reference");

    CHECK(round_up_pow2(0u) == 1u,   "0 rounds up to 1");
    CHECK(round_up_pow2(1u) == 1u,   "1 is already a power of two");
    CHECK(round_up_pow2(2u) == 2u,   "2 stays put");
    CHECK(round_up_pow2(3u) == 4u,   "3 rounds up to 4");
    CHECK(round_up_pow2(4u) == 4u,   "4 stays put, not 8");
    CHECK(round_up_pow2(5u) == 8u,   "5 rounds up to 8");
    CHECK(round_up_pow2(1000u) == 1024u, "1000 rounds up to 1024");
    CHECK(round_up_pow2(1024u) == 1024u, "an exact power stays put");
    CHECK(round_up_pow2(1025u) == 2048u, "one past rounds up");
    CHECK(round_up_pow2(0x80000000u) == 0x80000000u, "2^31 stays put");

    /* the result must always be a power of two, and never smaller than v */
    int sound = 1;
    for (uint32_t v = 1u; v < 100000u; v += 37u) {
        uint32_t r = round_up_pow2(v);
        if (r < v || !is_pow2(r)) { sound = 0; break; }
    }
    CHECK(sound, "result is always a power of two and at least v");

    T_REPORT();
    return 0;
}`
},

// -------------------------------------------------------- integer to string
"d-write-utoa": {
sig: "Define size_t u32_to_str(uint32_t v, char *buf, size_t cap) returning the characters written excluding the terminator, or 0 if it will not fit.",
test: `static void shows(uint32_t v, const char *want, const char *name)
{
    char buf[32];
    memset(buf, '#', sizeof buf);
    size_t n = u32_to_str(v, buf, sizeof buf);
    int ok = (n == strlen(want)) && (strcmp(buf, want) == 0);
    CHECK(ok, name);
}

int main(void)
{
    shows(0u,          "0",          "zero produces \\"0\\", not an empty string");
    shows(1u,          "1",          "one");
    shows(9u,          "9",          "single digit");
    shows(10u,         "10",         "two digits");
    shows(255u,        "255",        "three digits");
    shows(1000u,       "1000",       "four digits");
    shows(4294967295u, "4294967295", "UINT32_MAX, ten digits");

    /* exact fit: ten digits plus a terminator in eleven bytes */
    char tight[11];
    memset(tight, '#', sizeof tight);
    size_t n = u32_to_str(4294967295u, tight, sizeof tight);
    CHECK(n == 10u,                        "exact fit succeeds");
    CHECK(strcmp(tight, "4294967295") == 0, "exact fit is correct");

    /* one byte short: must refuse and write nothing */
    char small[10];
    memset(small, '#', sizeof small);
    CHECK(u32_to_str(4294967295u, small, sizeof small) == 0u,
          "one byte short returns 0");
    CHECK(small[0] == '#', "and writes nothing at all");

    /* cap 0 and cap 1 */
    char one[4];
    memset(one, '#', sizeof one);
    CHECK(u32_to_str(5u, one, 0u) == 0u, "cap 0 returns 0");
    CHECK(one[0] == '#',                 "cap 0 writes nothing");

    memset(one, '#', sizeof one);
    CHECK(u32_to_str(5u, one, 1u) == 0u, "cap 1 has no room for a digit");
    CHECK(one[0] == '#',                 "cap 1 writes nothing");

    memset(one, '#', sizeof one);
    CHECK(u32_to_str(5u, one, 2u) == 1u, "cap 2 fits one digit");
    CHECK(strcmp(one, "5") == 0,         "and terminates it");

    /* agrees with the library over a spread */
    int agrees = 1;
    for (uint32_t v = 0; v < 200000u; v += 997u) {
        char mine[16], theirs[16];
        u32_to_str(v, mine, sizeof mine);
        sprintf(theirs, "%u", (unsigned)v);
        if (strcmp(mine, theirs) != 0) { agrees = 0; break; }
    }
    CHECK(agrees, "agrees with sprintf over a spread of values");

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
