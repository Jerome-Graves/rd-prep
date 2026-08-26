/* Unit tests for the second set of write drills. */

Object.assign(DRILL_TESTS, {

"d-write-hyst": {
sig: "hyst_t is provided. Define void hyst_init(hyst_t *, int32_t on, int32_t off) and bool hyst_update(hyst_t *, int32_t v).",
prelude: `typedef struct { int32_t on, off; bool state; } hyst_t;
`,
test: `int main(void)
{
    hyst_t h;

    hyst_init(&h, 100, 50);
    CHECK(h.state == false, "starts off");

    /* rising: nothing until the on threshold */
    CHECK(hyst_update(&h, 0)   == false, "0 is off");
    CHECK(hyst_update(&h, 60)  == false, "inside the band, still off");
    CHECK(hyst_update(&h, 99)  == false, "one short of on");
    CHECK(hyst_update(&h, 100) == true,  "exactly on turns it on");

    /* falling: stays on through the band */
    CHECK(hyst_update(&h, 99)  == true,  "back inside the band, holds on");
    CHECK(hyst_update(&h, 60)  == true,  "still on in the band");
    CHECK(hyst_update(&h, 51)  == true,  "one above off");
    CHECK(hyst_update(&h, 50)  == true || h.state == false, "exactly off turns it off");
    CHECK(h.state == false, "state is off after reaching the off threshold");

    /* and it does not come back on inside the band */
    CHECK(hyst_update(&h, 99)  == false, "off, and the band does not turn it back on");
    CHECK(hyst_update(&h, 100) == true,  "needs the full on threshold again");

    /* a noisy signal sitting on the on threshold must not chatter */
    hyst_init(&h, 100, 50);
    hyst_update(&h, 100);
    int flips = 0;
    bool prev = true;
    for (int i = 0; i < 100; i++) {
        bool s = hyst_update(&h, (i % 2) ? 99 : 101);   /* jitter around on */
        if (s != prev) flips++;
        prev = s;
    }
    CHECK(flips == 0, "noise around the on threshold causes no transitions");

    /* below off it does turn off */
    CHECK(hyst_update(&h, 10) == false, "well below off turns it off");

    /* negative thresholds work too */
    hyst_init(&h, -10, -50);
    CHECK(hyst_update(&h, -100) == false, "negative: below off");
    CHECK(hyst_update(&h, -30)  == false, "negative: inside the band, still off");
    CHECK(hyst_update(&h, -10)  == true,  "negative: reaches on");
    CHECK(hyst_update(&h, -30)  == true,  "negative: holds in the band");
    CHECK(hyst_update(&h, -50)  == false, "negative: reaches off");

    T_REPORT();
    return 0;
}`
},

"d-write-hex": {
sig: "Define size_t hex_encode(const uint8_t *in, size_t len, char *out, size_t cap) and int hex_decode(const char *in, uint8_t *out, size_t cap, size_t *out_len).",
test: `int main(void)
{
    char  s[64];
    uint8_t b[32];
    size_t n;

    /* encode */
    uint8_t d1[] = { 0x00, 0x1F, 0xA5, 0xFF };
    CHECK(hex_encode(d1, 4, s, sizeof s) == 8u, "encode returns 2 chars per byte");
    CHECK(strcmp(s, "001fa5ff") == 0,           "encodes lowercase, zero padded");

    CHECK(hex_encode(d1, 0, s, sizeof s) == 0u, "zero-length input writes nothing");
    CHECK(s[0] == '\\0',                         "and still terminates");

    /* exactly enough room: 4 bytes -> 8 chars + NUL = 9 */
    char tight[9];
    CHECK(hex_encode(d1, 4, tight, sizeof tight) == 8u, "exact fit succeeds");
    CHECK(strcmp(tight, "001fa5ff") == 0,               "exact fit is correct");

    /* one byte short: must refuse */
    char small[8];
    memset(small, '#', sizeof small);
    CHECK(hex_encode(d1, 4, small, sizeof small) == 0u,
          "one byte short refuses (the terminator counts)");
    CHECK(small[0] == '#', "and writes nothing");

    /* decode */
    CHECK(hex_decode("001fa5ff", b, sizeof b, &n) == 0, "decodes lowercase");
    CHECK(n == 4u,                                      "four bytes out");
    CHECK(b[0] == 0x00 && b[1] == 0x1F && b[2] == 0xA5 && b[3] == 0xFF, "correct values");

    CHECK(hex_decode("001FA5FF", b, sizeof b, &n) == 0, "accepts uppercase");
    CHECK(b[2] == 0xA5,                                 "uppercase decodes the same");

    CHECK(hex_decode("aAbBcC", b, sizeof b, &n) == 0, "mixed case");
    CHECK(n == 3u && b[0] == 0xAA && b[1] == 0xBB && b[2] == 0xCC, "mixed case values");

    CHECK(hex_decode("", b, sizeof b, &n) == 0, "empty string is valid");
    CHECK(n == 0u,                              "and yields no bytes");

    /* rejections */
    CHECK(hex_decode("abc", b, sizeof b, &n) != 0,    "rejects an odd length");
    CHECK(hex_decode("zz", b, sizeof b, &n) != 0,     "rejects a letter above f");
    CHECK(hex_decode("0g", b, sizeof b, &n) != 0,     "rejects g");
    CHECK(hex_decode("00 11", b, sizeof b, &n) != 0,  "rejects a space");

    /* the characters between '9' and 'a', which a naive decoder accepts */
    CHECK(hex_decode("0:", b, sizeof b, &n) != 0, "rejects ':', which is '9'+1");
    CHECK(hex_decode("0?", b, sizeof b, &n) != 0, "rejects '?'");
    CHECK(hex_decode("0@", b, sizeof b, &n) != 0, "rejects '@', which is 'A'-1");
    CHECK(hex_decode("0\`", b, sizeof b, &n) != 0, "rejects backtick, which is 'a'-1");

    /* capacity */
    uint8_t tiny[2];
    CHECK(hex_decode("00112233", tiny, sizeof tiny, &n) != 0, "rejects more bytes than cap");
    CHECK(hex_decode("0011", tiny, sizeof tiny, &n) == 0,     "an exact fit is allowed");
    CHECK(n == 2u,                                            "and reports the length");

    /* round trip */
    int rt = 1;
    for (unsigned v = 0; v < 256u; v++) {
        uint8_t one = (uint8_t)v, back[1];
        char enc[8];
        size_t got;
        if (hex_encode(&one, 1, enc, sizeof enc) != 2u) { rt = 0; break; }
        if (hex_decode(enc, back, sizeof back, &got) != 0) { rt = 0; break; }
        if (got != 1u || back[0] != one) { rt = 0; break; }
    }
    CHECK(rt, "every byte value round trips");

    T_REPORT();
    return 0;
}`
},

"d-write-lut": {
sig: "point_t is provided. Define int32_t lut_lookup(const point_t *pts, size_t n, int32_t x).",
prelude: `typedef struct { int32_t x, y; } point_t;
`,
test: `int main(void)
{
    /* a rising curve */
    static const point_t up[] = { {0, 0}, {100, 1000}, {200, 1500} };

    CHECK(lut_lookup(up, 3, 0)    == 0,    "exactly the first point");
    CHECK(lut_lookup(up, 3, 100)  == 1000, "exactly a middle point");
    CHECK(lut_lookup(up, 3, 200)  == 1500, "exactly the last point");

    CHECK(lut_lookup(up, 3, -50)  == 0,    "below the range clamps to the first y");
    CHECK(lut_lookup(up, 3, 5000) == 1500, "above the range clamps to the last y");

    CHECK(lut_lookup(up, 3, 50)   == 500,  "midway in the first segment");
    CHECK(lut_lookup(up, 3, 150)  == 1250, "midway in the second segment");
    CHECK(lut_lookup(up, 3, 25)   == 250,  "a quarter of the way");
    CHECK(lut_lookup(up, 3, 199)  == 1495, "just before the last point");

    /* a falling curve, which is what a thermistor gives */
    static const point_t down[] = { {0, 1000}, {100, 0}, {200, -500} };
    CHECK(lut_lookup(down, 3, 0)   == 1000, "falling: first point");
    CHECK(lut_lookup(down, 3, 50)  == 500,  "falling: midway");
    CHECK(lut_lookup(down, 3, 100) == 0,    "falling: middle point");
    CHECK(lut_lookup(down, 3, 150) == -250, "falling: negative segment");
    CHECK(lut_lookup(down, 3, 200) == -500, "falling: last point");
    CHECK(lut_lookup(down, 3, 999) == -500, "falling: clamps high");

    /* a single point: every x gives the same y */
    static const point_t one[] = { {42, 7} };
    CHECK(lut_lookup(one, 1, 0)   == 7, "n == 1, below");
    CHECK(lut_lookup(one, 1, 42)  == 7, "n == 1, exactly");
    CHECK(lut_lookup(one, 1, 100) == 7, "n == 1, above");

    /* monotonic, and always inside the segment's y range */
    int sound = 1;
    int32_t prev = lut_lookup(up, 3, -10);
    for (int32_t x = -10; x <= 210; x++) {
        int32_t y = lut_lookup(up, 3, x);
        if (y < prev || y < 0 || y > 1500) { sound = 0; break; }
        prev = y;
    }
    CHECK(sound, "never decreases and never leaves the table's y range");

    /* large values: the product of the two differences must not overflow */
    static const point_t big[] = { {0, -2000000}, {1000000, 2000000} };
    int32_t mid = lut_lookup(big, 2, 500000);
    CHECK(mid > -1000 && mid < 1000, "no intermediate overflow on a wide table");

    T_REPORT();
    return 0;
}`
},

"d-write-watchdog": {
sig: "WD_MAX_TASKS is provided. Define wd_init, wd_register, wd_checkin and wd_all_checked_in.",
prelude: `#define WD_MAX_TASKS 8
`,
test: `int main(void)
{
    wd_init();

    /* nothing registered: must NOT feed */
    CHECK(wd_all_checked_in() == false, "no tasks registered: does not feed");

    /* one task */
    int a = wd_register();
    CHECK(a >= 0 && a < WD_MAX_TASKS, "register returns a valid id");
    CHECK(wd_all_checked_in() == false, "registered but not checked in");
    wd_checkin(a);
    CHECK(wd_all_checked_in() == true,  "the only task checked in: feeds");

    /* and it must be earned again */
    CHECK(wd_all_checked_in() == false, "flags cleared, so the next round must be earned");
    wd_checkin(a);
    CHECK(wd_all_checked_in() == true,  "checks in again: feeds again");

    /* three tasks, partial check-in */
    wd_init();
    int t1 = wd_register(), t2 = wd_register(), t3 = wd_register();
    CHECK(t1 != t2 && t2 != t3 && t1 != t3, "ids are distinct");

    wd_checkin(t1);
    CHECK(wd_all_checked_in() == false, "one of three: does not feed");
    wd_checkin(t2);
    CHECK(wd_all_checked_in() == false, "two of three: does not feed");
    wd_checkin(t3);
    CHECK(wd_all_checked_in() == true,  "all three: feeds");
    CHECK(wd_all_checked_in() == false, "and clears");

    /* a task that stops reporting must block the feed forever */
    wd_checkin(t1); wd_checkin(t2);
    int blocked = 1;
    for (int i = 0; i < 5; i++) {
        if (wd_all_checked_in()) { blocked = 0; break; }
        wd_checkin(t1); wd_checkin(t2);      /* t3 has died */
    }
    CHECK(blocked, "a silent task keeps the watchdog hungry indefinitely");

    /* repeated check-ins from the same task do not stand in for another */
    wd_init();
    int x = wd_register(), y = wd_register();
    (void)y;
    for (int i = 0; i < 10; i++) wd_checkin(x);
    CHECK(wd_all_checked_in() == false, "ten check-ins from one task is still not both");

    /* the pool runs out */
    wd_init();
    int last = 0;
    for (int i = 0; i < WD_MAX_TASKS; i++) last = wd_register();
    CHECK(last >= 0,               "WD_MAX_TASKS registrations all succeed");
    CHECK(wd_register() == -1,     "one more returns -1 rather than overflowing");

    /* an out-of-range id is ignored rather than corrupting anything */
    wd_init();
    int only = wd_register();
    wd_checkin(-1);
    wd_checkin(WD_MAX_TASKS);
    wd_checkin(999);
    CHECK(wd_all_checked_in() == false, "bogus ids do not satisfy the check");
    wd_checkin(only);
    CHECK(wd_all_checked_in() == true,  "the real id still works");

    T_REPORT();
    return 0;
}`
},

"d-write-pool": {
sig: "POOL_BLOCKS and POOL_BLOCK_SIZE are provided. Define pool_init, pool_alloc, pool_free and pool_free_count. Use static storage.",
prelude: `#define POOL_BLOCKS      8
#define POOL_BLOCK_SIZE  32
`,
test: `int main(void)
{
    pool_init();
    CHECK(pool_free_count() == POOL_BLOCKS, "starts with every block free");

    void *b[POOL_BLOCKS + 2];

    /* exhaust it */
    int got = 0;
    for (int i = 0; i < POOL_BLOCKS; i++) {
        b[i] = pool_alloc();
        if (b[i] != NULL) got++;
    }
    CHECK(got == POOL_BLOCKS,        "hands out exactly POOL_BLOCKS blocks");
    CHECK(pool_free_count() == 0u,   "and the pool is then empty");
    CHECK(pool_alloc() == NULL,      "one more returns NULL rather than overrunning");

    /* every block is distinct */
    int distinct = 1;
    for (int i = 0; i < POOL_BLOCKS; i++)
        for (int j = i + 1; j < POOL_BLOCKS; j++)
            if (b[i] == b[j]) distinct = 0;
    CHECK(distinct, "no block is handed out twice");

    /* and they do not overlap: write a pattern to each, then check them all */
    for (int i = 0; i < POOL_BLOCKS; i++) memset(b[i], i + 1, POOL_BLOCK_SIZE);
    int intact = 1;
    for (int i = 0; i < POOL_BLOCKS; i++) {
        uint8_t *p = b[i];
        for (int k = 0; k < POOL_BLOCK_SIZE; k++)
            if (p[k] != (uint8_t)(i + 1)) { intact = 0; break; }
    }
    CHECK(intact, "blocks do not overlap: each keeps its own POOL_BLOCK_SIZE bytes");

    /* alignment: a block must be able to hold a pointer */
    int aligned = 1;
    for (int i = 0; i < POOL_BLOCKS; i++)
        if (((uintptr_t)b[i] % sizeof(void *)) != 0u) aligned = 0;
    CHECK(aligned, "every block is at least pointer aligned");

    /* free some and take them back */
    pool_free(b[0]);
    pool_free(b[3]);
    CHECK(pool_free_count() == 2u, "freeing two blocks returns them to the count");

    void *r1 = pool_alloc();
    void *r2 = pool_alloc();
    CHECK(r1 != NULL && r2 != NULL, "the freed blocks can be reallocated");
    CHECK(pool_free_count() == 0u,  "and the pool is empty again");
    CHECK((r1 == b[0] || r1 == b[3]) && (r2 == b[0] || r2 == b[3]),
          "reallocation hands back the blocks that were freed");
    CHECK(r1 != r2, "and not the same one twice");

    /* free(NULL) is a no-op */
    size_t before = pool_free_count();
    pool_free(NULL);
    CHECK(pool_free_count() == before, "pool_free(NULL) changes nothing");

    /* full cycle: free everything, and it all comes back */
    pool_init();
    for (int round = 0; round < 3; round++) {
        for (int i = 0; i < POOL_BLOCKS; i++) b[i] = pool_alloc();
        CHECK(pool_free_count() == 0u, "round: exhausted");
        for (int i = 0; i < POOL_BLOCKS; i++) pool_free(b[i]);
        CHECK(pool_free_count() == POOL_BLOCKS, "round: fully restored");
    }

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
