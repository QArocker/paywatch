#!/usr/bin/env python3
"""Generates sync/feed.js from the pay clock page so the watch feed uses the page's own pay engine, line for line."""
import re, sys
src = open(sys.argv[1]).read().split("\n")
def find(pred, start=0):
    for i in range(start, len(src)):
        if pred(src[i]): return i
    raise SystemExit("marker not found")
def one(prefix):
    return src[find(lambda l: l.strip().startswith(prefix))]
a = find(lambda l: l.strip() == "// ---------- dates ----------")
b = find(lambda l: l.strip() == "// ---------- persistence ----------")
engine = src[a:b]
f0 = find(lambda l: l.startswith("  function focusShift(now, R) {"))
f1 = find(lambda l: l == "  }", f0)
focus = src[f0:f1 + 1]
u0 = find(lambda l: l.strip().startswith("const today = ymd(now), f = focusShift(now, R);"))
u1 = find(lambda l: l.strip() == 'const line = fields.join("|");', u0)
body = src[u0:u1 + 1]
out = []
out.append("""#!/usr/bin/env node
// GENERATED from the Fuelex Pay Clock page by build_feed_js.py. Do not edit by hand.
// Works out the watch feed line (12 fields) from a dump of the pay clock database:
//   node sync/feed.js <dir>   with <dir>/shifts/*.json, <dir>/stubs/*.json, <dir>/settings/main.json
// Run it with TZ set to Artem's time zone. FEED_NOW=<epoch ms> overrides the clock (tests).
const fs = require("fs"), path = require("path");
if (process.env.FEED_NOW) {
  const FAKE = +process.env.FEED_NOW, Real = Date;
  class FakeDate extends Real { constructor(...a) { if (a.length === 0) super(FAKE); else super(...a); } static now() { return FAKE; } }
  global.Date = FakeDate;
}
const dir = process.argv[2];
const readAll = (sub) => { const m = {}, d = path.join(dir, sub); if (fs.existsSync(d)) fs.readdirSync(d).filter((f) => f.endsWith(".json")).forEach((f) => { m[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(d, f), "utf8")); }); return m; };
(function () {""")
for p in ("const AGREEMENT", "const DEFAULTS", "const ANCHOR", "const FIRST_DAY", "const pad"):
    out.append(one(p))
out.append("""  const settings = readAll("settings").main || {};
  let state = { settings: { ...DEFAULTS, ...settings }, shifts: readAll("shifts"), stubs: readAll("stubs") };
  let offset = 0;
""")
out += engine + focus
out.append("""
  function feedLine(now) {
    const R = computeAll(now), p0 = period(0), rate = num(state.settings.rate);""")
out += body
out.append("""    return line;
  }
  const line = feedLine(new Date());
  if (!/^v1\\|/.test(line) || line.split("|").length !== 12) { console.error("bad feed"); process.exit(2); }
  process.stdout.write(line + "\\n");
})();""")
open(sys.argv[2], "w").write("\n".join(out) + "\n")
