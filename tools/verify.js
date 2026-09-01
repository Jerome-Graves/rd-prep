#!/usr/bin/env node
//
// Content verifier for R&D Prep.
//
// Checks the CONTENT, not the code. The site has no build step, so nothing else
// would ever notice a lesson id used twice, a bank question whose topic maps to
// no lesson, or a glossary entry pointing at a lesson that was renamed.
//
// Loads every <script> in index.html in document order, inline ones included:
// those carry `const BANKS = {}` and `const DRILLS = []`, so skipping them makes
// every bank file throw. Behaviour-only modules are skipped because they touch
// the DOM.
//
//   node tools/verify.js          from the repository root
//
// Exits non-zero if anything is wrong, so CI fails on a bad commit.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const BEHAVIOUR_ONLY = /^(ccheck|crun|editor)\.js$/;

const parts = [];
const tagRe = /<script(?:\s+src="([^"]+)")?\s*>([\s\S]*?)<\/script>/g;
let m;
while ((m = tagRe.exec(html))) {
    const src = m[1], inline = m[2];
    if (src) {
        if (BEHAVIOUR_ONLY.test(src)) continue;
        parts.push(fs.readFileSync(path.join(root, src), "utf8"));
    } else if (inline.length < 200) {
        parts.push(inline);                       // the small global declarations
    }
}

// Top-level const is script-scoped, so publish what we need before it ends.
const blob = parts.join("\n")
    + "\nglobalThis.__L = LESSONS;"
    + "\nglobalThis.__B = BANKS;"
    + "\nglobalThis.__D = (typeof DRILLS !== 'undefined') ? DRILLS : [];"
    + "\nglobalThis.__G = (typeof GLOSSARY !== 'undefined') ? GLOSSARY : {};\n";

const sandbox = {};
vm.createContext(sandbox);
try {
    vm.runInContext(blob, sandbox);
} catch (e) {
    console.error("FAIL  a data file does not parse: " + e.message);
    process.exit(1);
}

const L = sandbox.__L, B = sandbox.__B, D = sandbox.__D, G = sandbox.__G;
const strip = t => String(t).replace(/<[^>]*>/g, "");

let failures = 0;
const fail = msg => { failures++; console.error("FAIL  " + msg); };
const ok = msg => console.log("ok    " + msg);

// ---------------------------------------------------------------- inventory
let bankTotal = 0;
for (const k in B) bankTotal += B[k].length;
console.log(parts.length + " scripts, " + L.length + " lessons, "
    + bankTotal + " bank questions, " + D.length + " drills, "
    + Object.keys(G).length + " glossary terms\n");

// ------------------------------------------------------------ lesson ids
const byId = {};
const dupIds = [];
for (const l of L) {
    if (byId[l.id]) dupIds.push(l.id);
    byId[l.id] = l;
}
if (dupIds.length) fail("duplicate lesson ids: " + dupIds.join(", "));
else ok("lesson ids are unique");

// --------------------------------------------- every bank topic has a lesson
// TOPIC_LESSON lives in the app's inline script; pull it out and mirror what
// topicLesson() does at runtime: the per-track map first, then a topic tag that
// is itself a lesson id.
{
    const src = html.match(/const TOPIC_LESSON = (\{[\s\S]*?\n        \});/);
    if (!src) {
        fail("TOPIC_LESSON not found in index.html");
    } else {
        const T = vm.runInNewContext("(" + src[1] + ")");
        const unresolved = [], crossTrack = [];
        for (const track in B) {
            for (const t of new Set(B[track].map(q => q.t))) {
                const lid = (T[track] && T[track][t]) || (byId[t] ? t : null);
                if (!lid || !byId[lid]) unresolved.push(track + "/" + t);
                else if (byId[lid].track !== track) crossTrack.push(track + "/" + t + " -> " + lid);
            }
        }
        if (unresolved.length) fail("bank topics resolving to no lesson: " + unresolved.join(", "));
        else ok("every bank topic resolves to a lesson");
        if (crossTrack.length) fail("bank topics pointing outside their track: " + crossTrack.join(", "));
        else ok("no bank topic points outside its track");
    }
}

// --------------------------------------------------------- question shape
let bad = 0;
for (const k in B) for (const q of B[k]) {
    if (!q.q || !Array.isArray(q.o) || q.o.length !== 4) { bad++; console.error("      malformed: " + k + " " + (q.q || "?").slice(0, 60)); }
    else if (typeof q.a !== "number" || q.a < 0 || q.a > 3) { bad++; console.error("      bad answer index: " + q.q.slice(0, 60)); }
    else if (!q.why) { bad++; console.error("      no explanation: " + q.q.slice(0, 60)); }
    else if (new Set(q.o).size !== 4) { bad++; console.error("      duplicate options: " + q.q.slice(0, 60)); }
}
if (bad) fail(bad + " malformed bank questions");
else ok("all " + bankTotal + " bank questions are well formed");

let badQuiz = 0;
for (const l of L) for (const q of (l.quiz || [])) {
    if (!Array.isArray(q.o) || q.o.length !== 4 || typeof q.a !== "number" || !q.why) {
        badQuiz++; console.error("      bad quiz in " + l.id + ": " + (q.q || "?").slice(0, 60));
    }
}
if (badQuiz) fail(badQuiz + " malformed lesson quizzes");
else ok("all lesson quizzes are well formed");

// ------------------------------------------------------ answer-length bias
// If the correct option is reliably the longest, the bank is answerable without
// knowing anything: you just pick the long one. Chance is 25%.
//
// Two numbers per track. "longest" counts a tie for top length, which is not
// actually exploitable (you cannot pick the longest when two share the top
// spot), so "strict" counts only outright-longest and is the honest figure.
//
// This is a gate, not a report. Too high and "pick the longest" beats knowing
// the material; too low and "avoid the longest" does, which is the same tell
// inverted. Both directions fail.
{
    const HIGH = 45, LOW = 8;
    let n = 0, loose = 0, strictAll = 0;
    const rows = [];
    for (const k in B) {
        let tn = 0, tl = 0, ts = 0;
        for (const q of B[k]) {
            const len = q.o.map(strip).map(t => t.length);
            const top = Math.max(...len);
            if (len[q.a] === top) {
                loose++; tl++;
                if (len.filter(v => v === top).length === 1) { strictAll++; ts++; }
            }
            n++; tn++;
        }
        rows.push([k, Math.round(100 * tl / tn), Math.round(100 * ts / tn)]);
    }
    rows.sort((a, b) => b[2] - a[2]);

    console.log("\n      answer-length bias (chance 25%, gate " + LOW + "-" + HIGH + "% strict):");
    console.log("        longest  strict  track");
    for (const [k, l, s] of rows) {
        console.log("        " + String(l + "%").padStart(7) + String(s + "%").padStart(8) + "  " + k);
    }
    console.log("        " + String(Math.round(100 * loose / n) + "%").padStart(7)
        + String(Math.round(100 * strictAll / n) + "%").padStart(8) + "  overall\n");

    const off = rows.filter(([, , s]) => s > HIGH || s < LOW);
    if (off.length) {
        for (const [k, , s] of off) {
            fail(k + " answer-length bias is " + s + "%, outside " + LOW + "-" + HIGH + "% (chance is 25%)");
        }
    } else {
        ok("no track is answerable from option length alone");
    }
}

// -------------------------------------------------------------- glossary
{
    const dupForm = [], badLink = [];
    const seen = new Set();
    for (const term in G) {
        const e = G[term];
        for (const f of [term].concat(e.aka || [])) {
            if (seen.has(f.toLowerCase())) dupForm.push(f);
            seen.add(f.toLowerCase());
        }
        if (e.l && !byId[e.l]) badLink.push(term + " -> " + e.l);
    }
    if (dupForm.length) fail("glossary terms defined twice: " + dupForm.join(", "));
    else ok("glossary terms are unique across all their forms");
    if (badLink.length) fail("glossary entries linking to a missing lesson: " + badLink.join(", "));
    else ok("every glossary lesson link resolves");
}

// -------------------------------------------------- unescaped markup in bodies
// A raw '<' followed by a space, '=' or a digit is almost always an unescaped
// comparison or shift that the browser will silently eat as a tag.
{
    let rawLt = 0;
    for (const l of L) {
        const hits = ((l.body || "").match(/<(?=[\s=0-9])/g) || []).length;
        if (hits) { rawLt += hits; console.error("      raw '<' in " + l.id + " x" + hits); }
    }
    if (rawLt) fail(rawLt + " probably-unescaped '<' in lesson bodies");
    else ok("no unescaped markup in lesson bodies");
}

// ------------------------------------------------------------------ drills
{
    const dupDrill = [], noBrief = [];
    const seen = new Set();
    for (const d of D) {
        if (seen.has(d.id)) dupDrill.push(d.id);
        seen.add(d.id);
        if (!d.brief || !d.title) noBrief.push(d.id);
    }
    if (dupDrill.length) fail("duplicate drill ids: " + dupDrill.join(", "));
    else ok("drill ids are unique");
    if (noBrief.length) fail("drills missing a title or brief: " + noBrief.join(", "));
    else ok("every drill has a title and a brief");
}

console.log("");
if (failures) {
    console.error(failures + " check(s) failed");
    process.exit(1);
}
console.log("all checks passed");
