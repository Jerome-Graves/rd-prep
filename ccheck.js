/* A small C syntax and structure checker.
 *
 * This is NOT a compiler. It is a fast, dependency-free check for the faults
 * that actually stop you in a written exercise: unbalanced delimiters, an
 * unterminated literal, an assignment where a comparison was meant, and
 * whether the code contains the things the exercise asked for.
 *
 * It is deliberately high-precision: it would rather say nothing than report a
 * problem that is not there, because a checker you learn to ignore is worse
 * than no checker. Anything it cannot be sure about, it stays quiet on.
 *
 * checkC(src)  -> { ok, errors:[], warnings:[], stats:{} }
 * Each finding is { line, col, msg }.
 */

function checkC(src) {
    const errors = [], warnings = [];
    const stack = [];
    const CLOSE = { ")": "(", "]": "[", "}": "{" };
    const NAME = { "(": "(", "[": "[", "{": "{" };

    // "blank" holds the source with comments and literal contents replaced by
    // spaces, preserving line and column numbers so later regex checks cannot
    // fire on things written inside a string or a comment.
    let blank = "";
    let line = 1, col = 1;
    let i = 0;
    const n = src.length;
    let stringOpen = null;          // {line, col, quote} while inside a literal

    function push(ch) { blank += ch; }

    while (i < n) {
        const c = src[i], c2 = src[i + 1];

        // ---- line comment
        if (c === "/" && c2 === "/") {
            while (i < n && src[i] !== "\n") { push(" "); i++; col++; }
            continue;
        }
        // ---- block comment
        if (c === "/" && c2 === "*") {
            const startLine = line;
            push(" "); push(" "); i += 2; col += 2;
            let closed = false;
            while (i < n) {
                if (src[i] === "*" && src[i + 1] === "/") {
                    push(" "); push(" "); i += 2; col += 2; closed = true; break;
                }
                if (src[i] === "\n") { push("\n"); line++; col = 1; }
                else { push(" "); col++; }
                i++;
            }
            if (!closed) {
                errors.push({ line: startLine, col: 1, msg: "Block comment opened here is never closed." });
            }
            continue;
        }
        // ---- string or char literal
        if (c === '"' || c === "'") {
            const quote = c, startLine = line, startCol = col;
            push(" "); i++; col++;
            let closed = false;
            while (i < n) {
                if (src[i] === "\\") {                 // escape: skip both
                    push(" "); push(" "); i += 2; col += 2; continue;
                }
                if (src[i] === quote) { push(" "); i++; col++; closed = true; break; }
                if (src[i] === "\n") break;            // literals do not span lines
                push(" "); i++; col++;
            }
            if (!closed) {
                errors.push({
                    line: startLine, col: startCol,
                    msg: "Unterminated " + (quote === '"' ? "string" : "character") + " literal."
                });
                stringOpen = { line: startLine };
            }
            continue;
        }
        // ---- delimiters
        if (c === "(" || c === "[" || c === "{") {
            stack.push({ ch: c, line: line, col: col });
        } else if (c === ")" || c === "]" || c === "}") {
            const want = CLOSE[c];
            if (stack.length === 0) {
                errors.push({ line: line, col: col, msg: "Closing '" + c + "' with nothing open to match it." });
            } else {
                const top = stack.pop();
                if (top.ch !== want) {
                    errors.push({
                        line: line, col: col,
                        msg: "Closing '" + c + "' does not match the '" + top.ch +
                             "' opened on line " + top.line + "."
                    });
                }
            }
        }

        if (c === "\n") { push("\n"); line++; col = 1; }
        else { push(c); col++; }
        i++;
    }

    stack.forEach(o => {
        errors.push({
            line: o.line, col: o.col,
            msg: "'" + NAME[o.ch] + "' opened here is never closed."
        });
    });

    // ---- heuristics, run only on comment- and literal-free text -------------
    const lines = blank.split("\n");

    lines.forEach((L, idx) => {
        const ln = idx + 1;

        // assignment inside a condition: if (x = y), while (p = q)
        // require a single = with no comparison operators either side
        const cond = L.match(/\b(if|while)\s*\(([^)]*)\)/);
        if (cond) {
            const inner = cond[2];
            if (/[^=!<>+\-*/%&|^]=[^=]/.test(" " + inner) && !/[=!<>]=/.test(inner)) {
                warnings.push({
                    line: ln, col: 1,
                    msg: "Assignment inside an " + cond[1] + " condition. Did you mean '=='? " +
                         "If it is deliberate, wrap it: if ((x = y) != 0)."
                });
            }
        }

        // empty body: if (...) ;   for (...) ;   while (...) ;
        if (/\b(if|for|while)\s*\([^)]*\)\s*;/.test(L)) {
            warnings.push({
                line: ln, col: 1,
                msg: "Semicolon straight after the condition, so the body is empty. " +
                     "Usually a typo; if deliberate, use { } to say so."
            });
        }

        // = where a shift was probably meant is too noisy to guess at, skipped.

        // signed 1 in a shift that could reach the sign bit
        if (/[^u0-9a-zA-Z_]1\s*<<\s*(3[01]|\w+)/.test(L) && !/1u\s*<</.test(L)) {
            warnings.push({
                line: ln, col: 1,
                msg: "Shifting a signed 1. Use 1u, so shifting into bit 31 is not undefined."
            });
        }
    });

    // ---- stats -------------------------------------------------------------
    const stats = {
        lines: lines.length,
        nonBlank: lines.filter(l => l.trim().length).length,
        functions: (blank.match(/\b\w[\w\s*]*\s+\**\w+\s*\([^;{]*\)\s*\{/g) || []).length
    };

    return { ok: errors.length === 0, errors: errors, warnings: warnings, stats: stats };
}

/* Structure check: does the answer contain what the exercise asked for?
 * rules is [{ re: RegExp, want: "what it is looking for", hint: "why" }]
 * Returns [{ found, want, hint }]. Purely presence-based, and it says so:
 * finding a token is not evidence the code is correct. */
function checkStructure(src, rules) {
    if (!rules || !rules.length) return [];
    // strip comments so a rule cannot be satisfied by a comment mentioning it
    const bare = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
    return rules.map(r => ({ found: r.re.test(bare), want: r.want, hint: r.hint || "" }));
}
