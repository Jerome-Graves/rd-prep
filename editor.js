// A small code editor for the drill answer box.
//
// No dependency and no build step, so it uses the standard overlay trick: a
// transparent textarea sitting exactly on top of a syntax-highlighted <pre>,
// with a line-number gutter beside them and everything scroll-synced. The
// textarea keeps its id and its value, so every handler that already reads
// document.getElementById("ans").value keeps working untouched.
//
// Because the font is monospace, a single character-width measurement lets us
// place squiggly underlines and the completion popup at exact caret positions.
//
// makeEditor(textarea, opts) -> controller, also stored on textarea._ed
//   opts.words          extra completion words (drill signature, prelude, code)
//   .refresh()          re-highlight and re-number (call after setting .value)
//   .mark(diagnostics)  gutter markers plus red squiggles; [{line, col, severity, msg}]
//   .clearMarks()

(function () {

    const TAB = "    ";          // four spaces, matching the lessons
    const LINE_H = 20;           // px, must match the CSS line-height exactly
    const PAD_T = 12, PAD_L = 14;// px, must match the CSS padding exactly

    const KEYWORDS = ("if else for while do switch case default break continue return goto "
        + "sizeof typedef struct union enum static extern const volatile register inline restrict "
        + "auto signed unsigned _Static_assert static_assert _Atomic _Noreturn _Alignas _Alignof "
        + "_Generic _Thread_local").split(" ");

    const TYPES = ("void char short int long float double _Bool bool size_t ssize_t "
        + "ptrdiff_t intptr_t uintptr_t int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t "
        + "uint64_t FILE va_list wchar_t time_t").split(" ");

    const CONSTS = ("NULL true false EOF __func__ __FILE__ __LINE__ INT_MAX INT_MIN "
        + "UINT32_MAX SIZE_MAX errno").split(" ");

    // the library calls that actually come up in firmware drills
    const LIB = ("memcpy memmove memset memcmp strlen strcmp strncmp strchr strstr snprintf "
        + "sprintf printf fprintf fputs putchar malloc calloc realloc free abort assert offsetof "
        + "strtol strtoul strtod isdigit isalpha toupper tolower abs labs qsort bsearch").split(" ");

    const KW_SET = new Set(KEYWORDS);
    const TY_SET = new Set(TYPES);
    const CN_SET = new Set(CONSTS);
    const BASE_WORDS = KEYWORDS.concat(TYPES, CONSTS, LIB);

    function esc(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // One left-to-right pass. Every alternative tolerates being unfinished,
    // because the user is mid-typing: an unterminated string or block comment
    // runs to the end of the line or of the buffer rather than failing to match.
    const TOKEN = new RegExp([
        "\\/\\*[\\s\\S]*?(?:\\*\\/|$)",          // block comment, possibly unclosed
        "\\/\\/[^\\n]*",                          // line comment
        '"(?:\\\\.|[^"\\\\\\n])*"?',              // string, possibly unclosed
        "'(?:\\\\.|[^'\\\\\\n])*'?",              // char literal, possibly unclosed
        "^[ \\t]*#[^\\n]*",                       // preprocessor line
        "\\b\\d[\\w.]*",                          // number, including 0x and suffixes
        "[A-Za-z_]\\w*"                           // identifier
    ].join("|"), "gm");

    function highlight(src) {
        let out = "", last = 0, m;
        TOKEN.lastIndex = 0;
        while ((m = TOKEN.exec(src)) !== null) {
            if (m[0] === "") { TOKEN.lastIndex++; continue; }   // never loop forever
            out += esc(src.slice(last, m.index));
            const t = m[0];
            let cls = null;
            if (t.charAt(0) === "/" && (t.charAt(1) === "*" || t.charAt(1) === "/")) cls = "c-com";
            else if (t.charAt(0) === '"' || t.charAt(0) === "'") cls = "c-str";
            else if (/^[ \t]*#/.test(t)) cls = "c-pre";
            else if (/^\d/.test(t)) cls = "c-num";
            else if (KW_SET.has(t)) cls = "c-kw";
            else if (TY_SET.has(t) || /^[a-z_]\w*_t$/.test(t)) cls = "c-ty";
            else if (CN_SET.has(t) || /^[A-Z][A-Z0-9_]{1,}$/.test(t)) cls = "c-cn";
            else if (src.charAt(TOKEN.lastIndex) === "(") cls = "c-fn";
            out += cls ? '<span class="' + cls + '">' + esc(t) + "</span>" : esc(t);
            last = TOKEN.lastIndex;
        }
        return out + esc(src.slice(last));
    }

    // execCommand is the only way to edit a textarea while keeping the native
    // undo stack. Assigning to .value wipes it, and losing ctrl-Z in a code
    // editor is worse than the deprecation.
    function insert(ta, text) {
        let ok = false;
        try { ok = document.execCommand("insertText", false, text); } catch (e) { ok = false; }
        if (!ok) {
            const s = ta.selectionStart, e = ta.selectionEnd;
            ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
            ta.selectionStart = ta.selectionEnd = s + text.length;
            ta.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }

    function lineStart(v, pos) { return v.lastIndexOf("\n", pos - 1) + 1; }
    function lineEnd(v, pos) { const i = v.indexOf("\n", pos); return i === -1 ? v.length : i; }
    function indentOf(line) { const m = line.match(/^[ \t]*/); return m ? m[0] : ""; }

    const OPEN = { "(": ")", "[": "]", "{": "}" };
    const QUOTE = { '"': '"', "'": "'" };

    function makeEditor(ta, opts) {
        if (ta._ed) return ta._ed;
        opts = opts || {};

        const wrap = document.createElement("div");
        wrap.className = "ed";
        const gutter = document.createElement("div");
        gutter.className = "ed-gutter";
        const nums = document.createElement("div");
        nums.className = "ed-nums";
        gutter.appendChild(nums);
        const code = document.createElement("div");
        code.className = "ed-code";
        const hl = document.createElement("pre");
        hl.className = "ed-hl";
        hl.setAttribute("aria-hidden", "true");
        const sqLayer = document.createElement("div");
        sqLayer.className = "ed-sq";
        const sqInner = document.createElement("div");
        sqLayer.appendChild(sqInner);
        const pop = document.createElement("div");
        pop.className = "ed-pop";

        ta.parentNode.insertBefore(wrap, ta);
        code.appendChild(hl);
        code.appendChild(sqLayer);
        code.appendChild(ta);
        code.appendChild(pop);
        wrap.appendChild(gutter);
        wrap.appendChild(code);

        const placeholder = ta.getAttribute("placeholder") || "";
        // the textarea's own text is transparent so the highlight shows through,
        // which also hides the native placeholder; draw it in the highlight layer
        ta.setAttribute("placeholder", "");

        let markedLines = {}, diags = [], cw = 0;

        // one measurement is enough: the font is monospace
        function charWidth() {
            const probe = document.createElement("span");
            probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;top:-9999px";
            probe.style.font = getComputedStyle(hl).font;
            probe.textContent = "0000000000000000000000000000000000000000";
            document.body.appendChild(probe);
            const w = probe.getBoundingClientRect().width / 40;
            probe.remove();
            return w || 8;
        }

        function refresh() {
            const v = ta.value;
            if (!v) {
                hl.innerHTML = '<span class="ed-ph">' + esc(placeholder) + "</span>";
            } else {
                // trailing space so the final line still has height in the pre
                hl.innerHTML = highlight(v.charAt(v.length - 1) === "\n" ? v + " " : v);
            }
            const n = v ? v.split("\n").length : 1;
            let g = "";
            for (let i = 1; i <= n; i++) {
                const mk = markedLines[i];
                g += '<div class="ed-n' + (mk ? " " + mk : "") + '">' + i + "</div>";
            }
            nums.innerHTML = g;
            drawSquiggles();
            syncScroll();
            syncActive();
        }

        // ---- red squiggles --------------------------------------------------
        function drawSquiggles() {
            if (!diags.length) { sqInner.innerHTML = ""; return; }
            if (!cw) cw = charWidth();
            const lines = ta.value.split("\n");
            let h = "";
            diags.forEach(function (d) {
                if (!d.line || d.line > lines.length) return;
                const text = lines[d.line - 1] || "";
                let col = Math.max(1, d.col || 1), len;
                if (d.col && d.col > 1) {
                    // underline the token the compiler pointed at
                    const rest = text.slice(col - 1);
                    const tok = rest.match(/^[A-Za-z_]\w*|^./);
                    len = tok ? tok[0].length : 1;
                } else {
                    // no useful column: underline the line's actual content
                    const lead = text.match(/^\s*/)[0].length;
                    col = lead + 1;
                    len = Math.max(1, text.trim().length);
                }
                h += '<i class="ed-wave ' + (d.severity === "error" ? "err" : "warn") + '"'
                   + ' style="top:' + (PAD_T + (d.line - 1) * LINE_H) + 'px;'
                   + 'left:' + (PAD_L + (col - 1) * cw) + 'px;'
                   + 'width:' + Math.max(2 * cw, len * cw) + 'px"'
                   + (d.msg ? ' title="' + esc(d.msg) + '"' : "") + "></i>";
            });
            sqInner.innerHTML = h;
        }

        function syncScroll() {
            hl.scrollTop = ta.scrollTop;
            hl.scrollLeft = ta.scrollLeft;
            nums.style.transform = "translateY(" + (-ta.scrollTop) + "px)";
            sqInner.style.transform = "translate(" + (-ta.scrollLeft) + "px," + (-ta.scrollTop) + "px)";
            if (pop.classList.contains("show")) placePopup();
        }

        function syncActive() {
            const line = ta.value.slice(0, ta.selectionStart).split("\n").length;
            const rows = nums.children;
            for (let i = 0; i < rows.length; i++) rows[i].classList.toggle("on", i === line - 1);
        }

        // ---- completion -----------------------------------------------------
        let items = [], sel = 0, prefixStart = 0;

        function wordBank() {
            // identifiers already written beat any static list, so they come first
            const seen = new Set(), local = [];
            const re = /[A-Za-z_]\w{2,}/g;
            let m;
            while ((m = re.exec(ta.value))) if (!seen.has(m[0])) { seen.add(m[0]); local.push(m[0]); }
            (opts.words || []).forEach(function (w) { if (!seen.has(w)) { seen.add(w); local.push(w); } });
            BASE_WORDS.forEach(function (w) { if (!seen.has(w)) { seen.add(w); local.push(w); } });
            return local;
        }

        function currentPrefix() {
            const s = ta.selectionStart;
            if (s !== ta.selectionEnd) return null;
            const from = lineStart(ta.value, s);
            const before = ta.value.slice(from, s);
            const m = before.match(/[A-Za-z_]\w*$/);
            if (!m) return null;
            return { word: m[0], start: s - m[0].length };
        }

        function placePopup() {
            const v = ta.value;
            const line = v.slice(0, prefixStart).split("\n").length;
            const col = prefixStart - lineStart(v, prefixStart);
            if (!cw) cw = charWidth();
            let left = PAD_L + col * cw - ta.scrollLeft;
            let top = PAD_T + line * LINE_H - ta.scrollTop;
            const box = code.getBoundingClientRect();
            left = Math.max(2, Math.min(left, box.width - 220));
            // flip above the caret if it would fall off the bottom
            if (top + pop.offsetHeight > box.height) top = top - LINE_H - pop.offsetHeight;
            pop.style.left = left + "px";
            pop.style.top = Math.max(2, top) + "px";
        }

        function showCompletions() {
            const p = currentPrefix();
            if (!p || p.word.length < 2) return hidePopup();
            const low = p.word.toLowerCase();
            const bank = wordBank();
            const starts = [], contains = [];
            for (let i = 0; i < bank.length && starts.length + contains.length < 40; i++) {
                const w = bank[i];
                if (w === p.word) continue;
                const wl = w.toLowerCase();
                if (wl.indexOf(low) === 0) starts.push(w);
                else if (wl.indexOf(low) > 0) contains.push(w);
            }
            items = starts.concat(contains).slice(0, 8);
            if (!items.length) return hidePopup();
            prefixStart = p.start;
            sel = 0;
            render();
            pop.classList.add("show");
            placePopup();
        }

        function render() {
            pop.innerHTML = items.map(function (w, i) {
                const kind = KW_SET.has(w) ? "kw" : TY_SET.has(w) ? "ty"
                           : CN_SET.has(w) ? "cn" : LIB.indexOf(w) !== -1 ? "fn" : "id";
                return '<div class="ed-pi' + (i === sel ? " on" : "") + '" data-i="' + i + '">'
                     + '<span class="ed-pk ' + kind + '">' + kind + "</span>" + esc(w) + "</div>";
            }).join("");
        }

        function hidePopup() { pop.classList.remove("show"); items = []; }

        function accept() {
            const w = items[sel];
            if (w === undefined) return false;
            ta.setSelectionRange(prefixStart, ta.selectionStart);
            insert(ta, w);
            hidePopup();
            refresh();
            return true;
        }

        pop.addEventListener("mousedown", function (e) {
            const row = e.target.closest(".ed-pi");
            if (!row) return;
            e.preventDefault();
            sel = +row.dataset.i;
            accept();
        });

        // ---- key handling ---------------------------------------------------
        ta.addEventListener("keydown", function (e) {
            // the popup gets first refusal on the keys it needs
            if (pop.classList.contains("show")) {
                if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % items.length; return render(); }
                if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; return render(); }
                if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); return void accept(); }
                if (e.key === "Escape") { e.preventDefault(); return hidePopup(); }
                if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") hidePopup();
            }

            const v = ta.value, s = ta.selectionStart, t = ta.selectionEnd;

            // ctrl-space asks for completions explicitly
            if ((e.ctrlKey || e.metaKey) && (e.key === " " || e.code === "Space")) {
                e.preventDefault();
                return showCompletions();
            }

            // Tab / Shift-Tab: indent, dedent, or insert to the next stop
            if (e.key === "Tab") {
                e.preventDefault();
                const multi = v.slice(s, t).indexOf("\n") !== -1;
                if (multi || e.shiftKey) {
                    const from = lineStart(v, s), to = lineEnd(v, t);
                    const out = v.slice(from, to).split("\n").map(function (ln) {
                        if (e.shiftKey) return ln.replace(/^( {1,4}|\t)/, "");
                        return ln.length ? TAB + ln : ln;
                    }).join("\n");
                    ta.setSelectionRange(from, to);
                    insert(ta, out);
                    ta.setSelectionRange(from, from + out.length);
                } else {
                    const col = s - lineStart(v, s);
                    insert(ta, " ".repeat(TAB.length - (col % TAB.length)));
                }
                return refresh();
            }

            // Enter: keep the indent, and open a block properly
            if (e.key === "Enter" && !e.shiftKey) {
                const from = lineStart(v, s);
                const ind = indentOf(v.slice(from, lineEnd(v, s)));
                const before = v.slice(0, s).replace(/[ \t]*$/, "");
                const opensBlock = before.charAt(before.length - 1) === "{";
                const nextIsClose = v.charAt(t) === "}";
                e.preventDefault();
                if (opensBlock && nextIsClose) {
                    insert(ta, "\n" + ind + TAB + "\n" + ind);
                    const caret = s + 1 + ind.length + TAB.length;
                    ta.setSelectionRange(caret, caret);
                } else {
                    insert(ta, "\n" + ind + (opensBlock ? TAB : ""));
                }
                return refresh();
            }

            // typing a closing brace on its own line lines it up with the opener
            if (e.key === "}" && s === t) {
                const from = lineStart(v, s);
                const cur = v.slice(from, s);
                if (/^[ \t]+$/.test(cur) && cur.length >= TAB.length) {
                    e.preventDefault();
                    ta.setSelectionRange(from, s);
                    insert(ta, cur.slice(0, cur.length - TAB.length) + "}");
                    return refresh();
                }
            }

            // skip over a closer you were going to type anyway
            if ((e.key === ")" || e.key === "]" || e.key === "}" || e.key === '"' || e.key === "'")
                && s === t && v.charAt(s) === e.key) {
                e.preventDefault();
                ta.setSelectionRange(s + 1, s + 1);
                return refresh();
            }

            // auto-close, but not when it would run into a word
            if (OPEN[e.key] || QUOTE[e.key]) {
                const closer = OPEN[e.key] || QUOTE[e.key];
                if (s !== t) {                       // wrap the selection
                    e.preventDefault();
                    const selText = v.slice(s, t);
                    insert(ta, e.key + selText + closer);
                    ta.setSelectionRange(s + 1, s + 1 + selText.length);
                    return refresh();
                }
                if (!/[A-Za-z0-9_]/.test(v.charAt(t))) {
                    e.preventDefault();
                    insert(ta, e.key + closer);
                    ta.setSelectionRange(s + 1, s + 1);
                    return refresh();
                }
            }

            // backspace through an empty pair removes both halves
            if (e.key === "Backspace" && s === t && s > 0) {
                const before = v.charAt(s - 1), after = v.charAt(s);
                if ((OPEN[before] && OPEN[before] === after) || (QUOTE[before] && before === after)) {
                    e.preventDefault();
                    ta.setSelectionRange(s - 1, s + 1);
                    insert(ta, "");
                    return refresh();
                }
            }

            // ctrl-/ toggles line comments over the selection
            if ((e.ctrlKey || e.metaKey) && (e.key === "/" || e.code === "Slash")) {
                e.preventDefault();
                const from = lineStart(v, s), to = lineEnd(v, t);
                const lines = v.slice(from, to).split("\n");
                const live = lines.filter(function (l) { return l.trim().length; });
                const allCommented = live.length && live.every(function (l) { return /^\s*\/\//.test(l); });
                const out = lines.map(function (l) {
                    if (!l.trim().length) return l;
                    return allCommented ? l.replace(/^(\s*)\/\/ ?/, "$1") : l.replace(/^(\s*)/, "$1// ");
                }).join("\n");
                ta.setSelectionRange(from, to);
                insert(ta, out);
                ta.setSelectionRange(from, from + out.length);
                return refresh();
            }
        });

        ta.addEventListener("input", function () {
            refresh();
            // offer completions while typing a word, but never while deleting
            const p = currentPrefix();
            if (p && p.word.length >= 2) showCompletions(); else hidePopup();
        });
        ta.addEventListener("scroll", syncScroll);
        ta.addEventListener("click", function () { hidePopup(); syncActive(); });
        ta.addEventListener("keyup", syncActive);
        ta.addEventListener("focus", syncActive);
        ta.addEventListener("blur", hidePopup);

        const api = {
            refresh: refresh,
            mark: function (list) {
                diags = (list || []).filter(function (d) { return d && d.line; });
                markedLines = {};
                diags.forEach(function (d) {
                    if (d.severity === "error" || markedLines[d.line] !== "err")
                        markedLines[d.line] = d.severity === "error" ? "err" : "warn";
                });
                refresh();
            },
            clearMarks: function () { diags = []; markedLines = {}; refresh(); }
        };
        ta._ed = api;
        refresh();
        return api;
    }

    window.makeEditor = makeEditor;
    window.highlightC = highlight;
})();
