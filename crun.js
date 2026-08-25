/* Compile and run C from the browser.
 *
 * Uses the Compiler Explorer (godbolt.org) public API, which is CORS-enabled,
 * so this is a direct browser call with no proxy and nothing to install.
 * It is real gcc: real warnings, real errors, and the program actually runs.
 *
 * Needs an internet connection. When it is not available, say so plainly and
 * fall back to the local syntax checker rather than pretending.
 *
 * The compiled unit is:   prelude + your answer + test harness
 * so gcc's line numbers are offset. We map them back to your editor's lines.
 */

const CRUN_ENDPOINT = "https://godbolt.org/api/compiler/";
const CRUN_COMPILER = "cg132";                       // x86-64 gcc 13.2
const CRUN_ARGS     = "-std=c11 -Wall -Wextra -Wshadow -Wconversion -O1";

/* Everything a drill's test can rely on. CHECK reports every case rather than
 * aborting on the first failure, which is what you want when marking. */
const CRUN_PRELUDE = [
    "#include <stdio.h>",
    "#include <stdint.h>",
    "#include <stddef.h>",
    "#include <stdbool.h>",
    "#include <string.h>",
    "#include <stdlib.h>",
    "#include <limits.h>",
    "",
    "static int t_pass = 0, t_fail = 0;",
    "#define CHECK(cond, name) do {                       \\",
    "    if (cond) { t_pass++; printf(\"PASS %s\\n\", (name)); }  \\",
    "    else      { t_fail++; printf(\"FAIL %s\\n\", (name)); }  \\",
    "} while (0)",
    "#define T_REPORT() do {                              \\",
    "    printf(\"TOTAL %d %d\\n\", t_pass, t_fail);           \\",
    "} while (0)",
    ""
].join("\n");

const CRUN_PRELUDE_LINES = CRUN_PRELUDE.split("\n").length - 1;

function crunStrip(s) {
    // the API returns ANSI-coloured text
    return String(s).replace(/\[[0-9;]*[A-Za-z]/g, "").replace(/\[K/g, "");
}

/* Turn gcc's "<source>:LINE:COL: severity: message" into structured findings,
 * with the line number translated back into the user's own numbering. */
function crunParseDiagnostics(lines, answerStart, answerEnd) {
    const out = [];
    let current = null;

    lines.forEach(raw => {
        const text = crunStrip(raw.text !== undefined ? raw.text : raw);
        const m = text.match(/^<source>:(\d+):(\d+):\s*(warning|error|note):\s*(.*)$/);
        if (m) {
            const abs = parseInt(m[1], 10);
            let where, yourLine = null;
            if (abs < answerStart)      { where = "harness"; }
            else if (abs > answerEnd)   { where = "harness"; }
            else { where = "yours"; yourLine = abs - answerStart + 1; }

            current = {
                severity: m[3],
                absLine: abs,
                line: yourLine,
                col: parseInt(m[2], 10),
                where: where,
                msg: m[4],
                context: []
            };
            out.push(current);
        } else if (current && /^\s*\d+\s*\||^\s*\|/.test(text)) {
            current.context.push(text);          // gcc's source excerpt
        } else if (/^<source>: In function/.test(text)) {
            current = null;
        }
    });
    return out;
}

/* Returns a Promise of:
 *   { networkOk, built, exitCode, diagnostics:[], tests:[{name,pass}],
 *     passed, failed, stdout:[], stderr:[], error }
 */
function crunCompileAndRun(answer, test, opts) {
    opts = opts || {};
    const prelude = CRUN_PRELUDE;
    const answerStart = CRUN_PRELUDE_LINES + 1;
    const answerLines = answer.split("\n").length;
    const answerEnd = answerStart + answerLines - 1;

    const source = prelude + "\n" + answer + "\n" + (test || "int main(void){ return 0; }") + "\n";

    const body = {
        source: source,
        lang: "c",
        allowStoreCodeDebug: false,
        options: {
            userArguments: opts.args || CRUN_ARGS,
            executeParameters: { args: [], stdin: "" },
            compilerOptions: { executorRequest: true },
            filters: { execute: true }
        }
    };

    return fetch(CRUN_ENDPOINT + (opts.compiler || CRUN_COMPILER) + "/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body)
    }).then(r => {
        if (!r.ok) throw new Error("compiler service returned HTTP " + r.status);
        return r.json();
    }).then(r => {
        const build = r.buildResult || {};
        const diags = crunParseDiagnostics(build.stderr || [], answerStart, answerEnd);
        const stdout = (r.stdout || []).map(l => crunStrip(l.text));
        const stderr = (r.stderr || []).map(l => crunStrip(l.text));

        const tests = [];
        let passed = 0, failed = 0;
        stdout.forEach(l => {
            const m = l.match(/^(PASS|FAIL)\s+(.*)$/);
            if (m) {
                tests.push({ name: m[2], pass: m[1] === "PASS" });
                if (m[1] === "PASS") passed++; else failed++;
            }
        });

        return {
            networkOk: true,
            built: build.code === 0,
            exitCode: r.code,
            diagnostics: diags,
            tests: tests,
            passed: passed,
            failed: failed,
            stdout: stdout.filter(l => !/^(PASS|FAIL|TOTAL)\b/.test(l)),
            stderr: stderr,
            source: source
        };
    }).catch(e => ({
        networkOk: false,
        built: false,
        diagnostics: [],
        tests: [],
        passed: 0,
        failed: 0,
        stdout: [],
        stderr: [],
        error: e.message
    }));
}
