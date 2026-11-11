#!/usr/bin/env node
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
(function () {
  const AGREEMENT = { full: 38.49, prob: 33.99, old: 32.56, since: "2026-06-20" };
  const DEFAULTS = { rate: 33.99, deductPct: null, lunchMin: 30, otAfter: 10, dtAfter: 12, wkOtAfter: 40, wkDtAfter: 48, statDayHours: 10, restHours: 10, premAfternoon: 1, premGraveyard: 2, stat: {} };
  const ANCHOR = new Date(2026, 9, 19); // Oct 19, 2026 — start of a Fuelex biweekly period (Mon)
  const FIRST_DAY = "2026-09-08"; // first day worked at Fuelex
  const pad = (n) => String(n).padStart(2, "0");
  const settings = readAll("settings").main || {};
  let state = { settings: { ...DEFAULTS, ...settings }, shifts: readAll("shifts"), stubs: readAll("stubs") };
  let offset = 0;

  // ---------- dates ----------
  const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const fromYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const atTime = (date, hm) => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); return new Date(y, m - 1, d, h, mi, 0, 0); };
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  function period(off) {
    const days = Math.round((midnight(new Date()) - ANCHOR) / 86400000);
    const idx = Math.floor(days / 14) + off;
    const start = addDays(ANCHOR, idx * 14), end = addDays(start, 13);
    let pay = addDays(end, 5); if (typeof HOL !== "undefined" && HOL[ymd(pay)]) pay = addDays(pay, -1);
    return { start, end, pay, key: ymd(start), from: ymd(start), to: ymd(end) };
  }
  const fmtDay = (d, opts) => d.toLocaleDateString("en-CA", opts);
  const fmtClock = (d) => d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
  const weekKey = (date) => { const d = fromYmd(date); return ymd(addDays(d, -((d.getDay() + 6) % 7))); };

  // ---------- general holidays (Art. 8.01) ----------
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114; return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
  }
  const nthMon = (y, mo, n) => { const d = new Date(y, mo, 1); return new Date(y, mo, 1 + ((8 - d.getDay()) % 7) + 7 * (n - 1)); };
  const HOL = {};
  for (let y = 2026; y <= 2030; y++) {
    const v = new Date(y, 4, 24); const vic = new Date(y, 4, 24 - ((v.getDay() + 6) % 7));
    [[new Date(y, 0, 1), "New Year's Day"], [nthMon(y, 1, 3), "Family Day"], [addDays(easter(y), -2), "Good Friday"], [vic, "Victoria Day"],
     [new Date(y, 6, 1), "Canada Day"], [nthMon(y, 7, 1), "BC Day"], [nthMon(y, 8, 1), "Labour Day"], [new Date(y, 8, 30), "Truth and Reconciliation Day"],
     [nthMon(y, 9, 2), "Thanksgiving"], [new Date(y, 10, 11), "Remembrance Day"], [new Date(y, 11, 25), "Christmas Day"], [new Date(y, 11, 26), "Boxing Day"]]
      .forEach(([d, name]) => { HOL[ymd(d)] = name; });
  }
  // EI and CPP yearly maximums. 2026: canada.ca. 2027: EI from the CEIC (Sep 2026); CPP from the 2027 YMPE ($76,700, CRA Oct 2026)
  // with the employee rate cut to 5.75% under Bill C-30, so max = (76,700 - 3,500) x 5.75%.
  const LIMITS = {
    2026: { ei: 1123.07, eiRate: 0.0163, eiMax: 68900, cpp: 4230.45, cppRate: 0.0595, ympe: 74600 },
    2027: { ei: 1161.12, eiRate: 0.0164, eiMax: 70800, cpp: 4209.00, cppRate: 0.0575, ympe: 76700 },
  };
  const holsIn = (p) => Object.keys(HOL).filter((d) => d >= p.from && d <= p.to).sort();
  const statOverride = (p) => { const v = (state.settings.stat || {})[p.key]; return v === undefined || v === null || v === "" ? null : num(v); };
  // a holiday switched off in the Shifts list (not paid, e.g. not eligible) is left out of pay and of the weekly overtime count
  // Sep 30, 2026 wasn't paid: under BC rules a new employee isn't eligible for stat pay in the first 30 days. It starts switched off.
  const STAT_NOT_PAID = { "2026-09-30": "not paid: first 30 days on the job (BC rules)" };
  const statIsOff = (d) => { const v = (state.settings.statOff || {})[d]; return v === undefined ? !!STAT_NOT_PAID[d] : !!v; };
  const holsPaid = (p) => holsIn(p).filter((d) => !statIsOff(d));
  const statHoursFor = (p) => { const o = statOverride(p); return o !== null ? o : holsPaid(p).length * num(state.settings.statDayHours, 10); };
  // a holiday that is switched on counts in its pay period's total from the start, so its effect on the cheque shows ahead of the day
  const statSoFar = (p) => statHoursFor(p);
  const statCreditOn = (d) => { if (statIsOff(d)) return 0; const p = periodOf(d); const n = holsPaid(p).length || 1; return statHoursFor(p) / n * 60; };
  function periodOf(date) { const days = Math.round((fromYmd(date) - ANCHOR) / 86400000); return period(Math.floor(days / 14) - Math.floor(Math.round((midnight(new Date()) - ANCHOR) / 86400000) / 14)); }

  // ---------- money / time ----------
  function num(v, d = 0) { const n = parseFloat(v); return isFinite(n) ? n : d; }
  const money = (n) => (n < 0 ? "−$" : "$") + Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const lcd = (n) => n.toFixed(2).padStart(7, " ");
  const hm = (min) => { min = Math.max(0, Math.floor(min + 1e-6)); return Math.floor(min / 60) + ":" + pad(min % 60); };
  const hrs = (h) => (Math.round(h * 100) / 100).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");

  // Deductions (CPP + EI + income tax). Auto mode fits a straight line to this year's pay stubs.
  function dedModel() {
    const pct = state.settings.deductPct;
    if (pct !== null && pct !== undefined && pct !== "") return { fn: (g) => g * num(pct) / 100, label: num(pct) + "% (your setting)", auto: false, year: 2026 };
    const all = Object.values(state.stubs).filter((s) => s.wages > 0);
    const yr = String(new Date().getFullYear());
    let list = all.filter((s) => String(s.payDate || "").startsWith(yr));
    if (list.length < 2) list = all;
    if (list.length < 2) return { fn: (g) => g * 0.2572, label: "25.72% (Nov 6 stub)", auto: true, year: 2026 };
    const n = list.length, sx = list.reduce((a, s) => a + s.wages, 0), sy = list.reduce((a, s) => a + s.deductions, 0);
    const sxx = list.reduce((a, s) => a + s.wages * s.wages, 0), sxy = list.reduce((a, s) => a + s.wages * s.deductions, 0);
    const A = (n * sxy - sx * sy) / (n * sxx - sx * sx), B = (sy - A * sx) / n;
    const low = list.reduce((a, s) => (s.wages < a.wages ? s : a)), floor = low.deductions / low.wages;
    const err = Math.max(...list.map((s) => Math.abs(A * s.wages + B - s.deductions)));
    return { fn: (g) => (g <= 0 ? 0 : g < low.wages ? g * floor : A * g + B), label: "auto from " + n + " pay stubs (within " + money(Math.ceil(err)) + ")", auto: true, year: +String(list[list.length - 1].payDate).slice(0, 4) || 2026 };
  }
  let DED = dedModel();
  const dedOf = (g) => DED.fn(g);
  const ratioAt = (G) => (G > 0 ? dedOf(G) / G : DED.fn(1000) / 1000);

  // ---------- overtime engine ----------
  // Daily (Art. 6.01b, 10 h shift): 1.5x after 10 h, 2x after 12 h.
  // Weekly (6.01e spare): 1.5x once 40 straight-time hours are reached; (6.01f) 2x past 48 hours in the week.
  // Work on a general holiday (6.02): at least 1.5x. A holiday counts as a day worked for weekly overtime (8.03).
  // Short rest (5.11a): with under 10 h off since the last shift, 1.5x until the 10 h would have been up.
  function calc(date, s, now) {
    const out = { paid: 0, st: 0, ot: 0, dt: 0, gross: 0, mult: 1, status: "empty", startAt: null };
    if (!s || !s.start) return out;
    const start = atTime(date, s.start); out.startAt = start;
    let end;
    if (s.end) {
      end = atTime(date, s.end); if (end <= start) end = atTime(ymd(addDays(fromYmd(date), 1)), s.end); out.endAt = end;
      if (now < start) { out.status = "upcoming"; return out; }
      // a finish time set ahead (from the watch): still working until then
      if (end > now) { out.status = "live"; end = now; } else out.status = "done";
    }
    else {
      if (now < start) { out.status = "upcoming"; return out; }
      if (now - start > 18 * 3600000) { out.status = "nofinish"; return out; }
      end = now; out.status = "live";
    }
    out.paid = Math.max(0, (end - start) / 60000 - (s.lunch ? num(state.settings.lunchMin, 30) : 0));
    return out;
  }

  // when the shift logged for the day before this date ended (null if there is none or it has no finish time)
  function prevShiftEnd(date) {
    const pd = ymd(addDays(fromYmd(date), -1)), s = state.shifts[pd];
    if (!s || !s.start || !s.end) return null;
    let e = atTime(pd, s.end); if (e <= atTime(pd, s.start)) e = atTime(date, s.end);
    return e;
  }

  // Art. 6.05(a) + 5.14: afternoon shift (starts 11:00-19:59) and graveyard shift (starts 20:00-03:59) pay a flat $/h on every
  // hour of the shift, overtime hours too, added on top of the rate (not multiplied by 1.5x or 2x).
  function shiftPremium(startHM) {
    if (!startHM) return 0;
    const [h, m] = startHM.split(":").map(Number), t = h * 60 + m;
    if (t >= 660 && t < 1200) return num(state.settings.premAfternoon, 1);
    if (t >= 1200 || t < 240) return num(state.settings.premGraveyard, 2);
    return 0;
  }

  let TODAY_SEGS = null;
  function computeAll(now, extra) {
    const S = state.settings, rate = num(S.rate);
    const otA = num(S.otAfter, 10) * 60, dtA = Math.max(num(S.dtAfter, 12) * 60, otA);
    const wOt = num(S.wkOtAfter, 40) * 60, wDt = Math.max(num(S.wkDtAfter, 48) * 60, wOt);
    const restA = num(S.restHours, 10) * 60;
    const weeks = new Set();
    [period(offset), period(0)].forEach((p) => { weeks.add(p.from); weeks.add(ymd(addDays(p.start, 7))); });
    weeks.add(weekKey(ymd(addDays(now, -1))));
    (extra || []).forEach((p) => { weeks.add(p.from); weeks.add(ymd(addDays(p.start, 7))); });
    const dates = new Set(Object.keys(state.shifts).filter((d) => weeks.has(weekKey(d))));
    Object.keys(HOL).forEach((d) => { if (weeks.has(weekKey(d))) dates.add(d); });
    const R = {}, wk = {};
    for (const d of [...dates].sort()) {
      const W = wk[weekKey(d)] || (wk[weekKey(d)] = { st: 0, tot: 0 });
      const hol = HOL[d] || null;
      if (hol) { const cr = statCreditOn(d); W.st += cr; W.tot += cr; }
      if (!state.shifts[d]) continue;
      const b = calc(d, state.shifts[d], now), P = b.paid;
      // Art. 5.11(a): starting with less than 10 h of rest pays the overtime rate until those 10 h would have been up
      let restMin = 0;
      if (restA > 0 && b.startAt) { const pe = prevShiftEnd(d); if (pe && pe <= b.startAt) restMin = Math.max(0, restA - (b.startAt - pe) / 60000); }
      const multAt = (x, st, tot) => Math.max(x < otA ? 1 : x < dtA ? 1.5 : 2, x < restMin ? 1.5 : 1, st >= wOt ? 1.5 : 1, tot >= wDt ? 2 : 1, hol ? 1.5 : 1);
      let st = W.st, tot = W.tot, x = 0, sM = 0, oM = 0, dM = 0;
      // pay multiplier by paid minute for the whole day (for the watch), from this day's starting week totals
      let segs = null;
      if (d >= ymd(addDays(now, -1))) { segs = [[0, multAt(0, st, tot)]]; let s3 = st, t3 = tot; for (let y = 0; y < 1440; y++) { const m = multAt(y, s3, t3); if (m !== segs[segs.length - 1][1]) segs.push([y, m]); if (m === 1) s3 += 1; t3 += 1; } }
      while (x < P - 1e-9) { const len = Math.min(1, P - x), m = multAt(x, st, tot); if (m === 1) { sM += len; st += len; } else if (m === 1.5) oM += len; else dM += len; tot += len; x += len; }
      const mult = multAt(P, st, tot);
      let nextAt = null;
      let nextMult = null;
      if (b.status === "live") { let y = P, s2 = st, t2 = tot, prev = mult; while (y < P + 1440) { const m = multAt(y, s2, t2); if (m > prev) { nextAt = y - P; nextMult = m; break; } prev = m; if (m === 1) s2 += 1; t2 += 1; y += 1; } }
      W.st = st; W.tot = tot;
      const prem = shiftPremium(state.shifts[d].start);
      R[d] = { ...b, st: sM, ot: oM, dt: dM, gross: rate / 60 * (sM + 1.5 * oM + 2 * dM) + prem * P / 60, prem, mult, nextAt, nextMult, hol, weekStraight: st, segs, restMin };
    }
    // today's rate steps even before a shift is entered (the watch can start one): from this week's totals so far
    const td = ymd(now);
    if (R[td] && R[td].segs) TODAY_SEGS = R[td].segs;
    else {
      const W = wk[weekKey(td)] || { st: 0, tot: 0 }, hol = HOL[td] || null;
      const mAt = (x, st, tot) => Math.max(x < otA ? 1 : x < dtA ? 1.5 : 2, st >= wOt ? 1.5 : 1, tot >= wDt ? 2 : 1, hol ? 1.5 : 1);
      const segs = [[0, mAt(0, W.st, W.tot)]]; let s3 = W.st, t3 = W.tot;
      for (let y = 0; y < 1440; y++) { const m = mAt(y, s3, t3); if (m !== segs[segs.length - 1][1]) segs.push([y, m]); if (m === 1) s3 += 1; t3 += 1; }
      TODAY_SEGS = segs;
    }
    return R;
  }

  function focusShift(now, R) {
    R = R || computeAll(now);
    const today = ymd(now), yest = ymd(addDays(now, -1));
    for (const d of [today, yest]) { if (R[d] && R[d].status === "live") return { date: d, c: R[d] }; }
    if (state.shifts[today]) return { date: today, c: R[today] || calc(today, state.shifts[today], now) };
    return null;
  }

  function feedLine(now) {
    const R = computeAll(now), p0 = period(0), rate = num(state.settings.rate);
    const today = ymd(now), f = focusShift(now, R);
    const sd = f ? f.date : today, c = f ? f.c : null, sh = state.shifts[sd] || null;
    let before = statSoFar(p0) * rate;
    // stat pay for a holiday that is today belongs to "before" too, it doesn't change during the day
    Object.keys(R).forEach((d) => { if (d >= p0.from && d <= p0.to && d !== sd && d < today) before += R[d].gross; });
    if (sd < p0.from) before = statSoFar(p0) * rate;
    const startMs = c && c.startAt ? c.startAt.getTime() : 0, endMs = c && c.endAt ? c.endAt.getTime() : 0;
    const lunch = sh && sh.lunch ? num(state.settings.lunchMin, 30) : 0;
    const segs0 = (c && R[sd] && R[sd].segs) || (sd === today && TODAY_SEGS) || [[0, 1], [600, 1.5], [720, 2]];
    // a shift premium ($/h on top) reaches the watch as a slightly higher multiplier, e.g. 1x + $1/h at $32.56 = 1.0307
    const prem = c && c.prem ? c.prem : 0;
    const segs = prem && rate > 0 ? segs0.map(([from, m]) => [from, Math.round((m + prem / rate) * 10000) / 10000]) : segs0;
    // Deductions grow with the size of the cheque, so the watch's take-home % is set for this day's real gross:
    // a finished day (or one with a finish time) uses its full gross; a running day is sized to the next whole hour,
    // at least 10 h, so the number only changes once an hour; a day with no shift adds nothing, like the page.
    const segGross = (mins) => { let t = 0; segs.forEach(([from, m], i) => { const to = i + 1 < segs.length ? segs[i + 1][0] : Infinity; if (mins > from) t += (Math.min(mins, to) - from) * m; }); return rate / 60 * t; };
    let dayMins = 0;
    if (c && c.startAt) {
      if (c.endAt) dayMins = Math.max(0, (c.endAt - c.startAt) / 60000 - lunch);
      else if (c.status === "live" || c.status === "upcoming") dayMins = Math.max(600, Math.ceil(c.paid / 60) * 60);
    }
    const ratio = Math.round(ratioAt(before + segGross(dayMins)) * 10000) / 10000;
    const pay = state.stubs[p0.key] && state.stubs[p0.key].payDate ? state.stubs[p0.key].payDate : ymd(p0.pay);
    const fields = ["v1", sd, p0.from, p0.to, pay, rate.toFixed(2), ratio.toFixed(4), before.toFixed(2), Math.round(startMs / 1000), Math.round(endMs / 1000), lunch, segs.map((x) => x[0] + ":" + x[1]).join(",")];
    const line = fields.join("|");
    return line;
  }
  const line = feedLine(new Date());
  if (!/^v1\|/.test(line) || line.split("|").length !== 12) { console.error("bad feed"); process.exit(2); }
  process.stdout.write(line + "\n");
})();
