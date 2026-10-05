/* ===== Algebra engine: no DOM. Terms, parsing, expansion, misconception diagnosis, generators ===== */
var rnd = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

function T(c, vars) { return { c: c, vars: vars ? Object.assign({}, vars) : {} }; }
function keyOf(vars) {
  return Object.keys(vars).filter(function (v) { return vars[v]; }).sort()
    .map(function (v) { return vars[v] === 1 ? v : v + '^' + vars[v]; }).join('');
}
function degree(vars) { var d = 0; for (var k in vars) d += vars[k]; return d; }
function mul(a, b) {
  var v = Object.assign({}, a.vars);
  for (var k in b.vars) v[k] = (v[k] || 0) + b.vars[k];
  return T(a.c * b.c, v);
}
/* misconception: x × x = 2x (exponent stays, coefficient doubles) */
function mulXX(a, b) {
  var c = a.c * b.c, v = Object.assign({}, a.vars);
  for (var k in b.vars) { if (v[k]) c *= 2; else v[k] = b.vars[k]; }
  return T(c, v);
}
function combine(terms) {
  var m = new Map();
  terms.forEach(function (t) {
    var k = keyOf(t.vars);
    if (!m.has(k)) m.set(k, T(0, t.vars));
    m.get(k).c += t.c;
  });
  Array.from(m.keys()).forEach(function (k) { if (m.get(k).c === 0) m.delete(k); });
  return m;
}
function polyEq(a, b) {
  if (a.size !== b.size) return false;
  for (var e of a) { var u = b.get(e[0]); if (!u || u.c !== e[1].c) return false; }
  return true;
}
function sortTerms(ts) {
  return ts.slice().sort(function (p, q) {
    return degree(q.vars) - degree(p.vars) || keyOf(p.vars).localeCompare(keyOf(q.vars));
  });
}
function polyTerms(m) { return sortTerms(Array.from(m.values())); }

/* ---------- parsing ---------- */
function clean(str) {
  return String(str).replace(/\s+/g, '').replace(/[−–—]/g, '-')
    .replace(/²/g, '^2').replace(/³/g, '^3').replace(/[·×*]/g, '').toLowerCase();
}
function readTerm(s, i) {
  var num = '';
  while (i < s.length && /\d/.test(s[i])) num += s[i++];
  var vars = {}, any = false;
  while (i < s.length && /[a-z]/.test(s[i])) {
    var v = s[i++], e = 1;
    if (s[i] === '^') {
      i++; var en = '';
      while (i < s.length && /\d/.test(s[i])) en += s[i++];
      if (!en) return { err: 'exp' };
      e = +en;
    }
    vars[v] = (vars[v] || 0) + e; any = true;
  }
  if (!num && !any) return { err: 'syntax' };
  if (s[i] === '^') return { err: 'numexp' };
  return { t: T(num ? +num : 1, vars), i: i };
}
function parseAnswer(str) {
  var s = clean(str);
  if (!s) return { error: 'empty' };
  if (/[()\[\]]/.test(s)) return { error: 'brackets' };
  if (/[^0-9a-z+\-^]/.test(s)) return { error: 'chars' };
  var terms = [], i = 0, first = true;
  while (i < s.length) {
    var sign = 1, saw = false;
    while (s[i] === '+' || s[i] === '-') { if (s[i] === '-') sign = -sign; saw = true; i++; }
    if (!first && !saw) return { error: 'syntax' };
    if (i >= s.length) return { error: 'dangling' };
    var r = readTerm(s, i);
    if (r.err) return { error: r.err };
    r.t.c *= sign; terms.push(r.t); i = r.i; first = false;
  }
  return { terms: terms };
}
/* problem strings like "5 - 3(x - 2)", "(2x + 4y) - (x - y)", "x(x + 3)" */
function parseProblem(str) {
  var s = clean(str), parts = [], i = 0;
  while (i < s.length) {
    var sign = 1;
    while (s[i] === '+' || s[i] === '-') { if (s[i] === '-') sign = -sign; i++; }
    var factor = null;
    if (s[i] !== '(') {
      var r = readTerm(s, i);
      if (r.err) throw new Error('Bad problem: ' + str);
      i = r.i;
      if (s[i] === '(') factor = r.t;
      else { r.t.c *= sign; parts.push({ kind: 'term', t: r.t }); continue; }
    }
    i++;
    var close = s.indexOf(')', i);
    var inner = parseAnswer(s.slice(i, close));
    if (inner.error) throw new Error('Bad group: ' + str);
    i = close + 1;
    parts.push({ kind: 'group', sign: sign, factor: factor, group: inner.terms });
  }
  return parts;
}
function multOf(p) { return p.factor ? T(p.sign * p.factor.c, p.factor.vars) : T(p.sign); }
function hasMult(p) { return p.kind === 'group' && (!!p.factor || p.sign < 0); }

/* ---------- expansion, with optional misconception ---------- */
function applyLeftSub(parts) {
  for (var i = 1; i < parts.length; i++) {
    var p = parts[i], q = parts[i - 1];
    if (p.kind === 'group' && p.sign < 0 && p.factor && degree(p.factor.vars) === 0 &&
        q.kind === 'term' && degree(q.t.vars) === 0) {
      var np = parts.slice();
      np.splice(i - 1, 2, { kind: 'group', sign: 1, factor: T(q.t.c - p.factor.c), group: p.group });
      return np;
    }
  }
  return null;
}
function expandTerms(parts, bug) {
  var P = parts;
  if (bug === 'leftSub') { P = applyLeftSub(parts); if (!P) return null; }
  var out = [];
  P.forEach(function (p) {
    if (p.kind === 'term') {
      var t = T(p.t.c, p.t.vars);
      if (bug === 'absAll') t.c = Math.abs(t.c);
      if (bug === 'invisOne' && Math.abs(t.c) === 1 && degree(t.vars) > 0) t.c = 0;
      out.push(t); return;
    }
    var m = multOf(p);
    p.group.forEach(function (g, j) {
      var t;
      if (bug === 'firstOnly' && j > 0 && hasMult(p)) t = T(g.c, g.vars);
      else if (bug === 'signDrop' && j > 0 && m.c < 0) t = mul(T(-m.c, m.vars), g);
      else if (bug === 'noFlip' && m.c < 0) t = mul(T(-m.c, m.vars), g);
      else if (bug === 'partialVar' && j > 0 && degree(m.vars) > 0) t = T(m.c * g.c, g.vars);
      else if (bug === 'xx') t = mulXX(m, g);
      else t = mul(m, g);
      out.push(t);
    });
  });
  return out;
}
function makeProblem(str) {
  var parts = parseProblem(str);
  var expanded = expandTerms(parts);
  return { str: str, parts: parts, expanded: expanded, answer: combine(expanded) };
}
var BUG_ORDER = ['leftSub', 'signDrop', 'noFlip', 'firstOnly', 'partialVar', 'xx', 'absAll', 'invisOne'];
function bugPolys(p) {
  var out = [];
  BUG_ORDER.forEach(function (id) {
    var ts = expandTerms(p.parts, id);
    if (!ts) return;
    var poly = combine(ts);
    if (!polyEq(poly, p.answer) && !out.some(function (o) { return polyEq(o.poly, poly); })) out.push({ id: id, poly: poly });
  });
  return out;
}
function bumped(sv, av) {
  var a = Object.keys(av).filter(function (v) { return av[v]; });
  var s = Object.keys(sv).filter(function (v) { return sv[v]; });
  if (a.length !== s.length || a.some(function (v) { return !sv[v]; })) return false;
  var more = false;
  for (var i = 0; i < a.length; i++) { var v = a[i]; if (sv[v] < av[v]) return false; if (sv[v] > av[v]) more = true; }
  return more;
}
function addIssue(arr, id, k) {
  var e = arr.find(function (x) { return x.id === id; });
  if (e) e.keys.push(k); else arr.push({ id: id, keys: [k] });
}
function diagnose(p, input) {
  var r = parseAnswer(input);
  if (r.error) return { status: 'parse', error: r.error };
  var terms = r.terms, stu = combine(terms);
  var keys = terms.filter(function (t) { return t.c !== 0; }).map(function (t) { return keyOf(t.vars); });
  var dups = Array.from(new Set(keys.filter(function (k, i) { return keys.indexOf(k) !== i; })));
  if (polyEq(stu, p.answer)) {
    if (dups.length) {
      var orderMix = dups.some(function (k) {
        var forms = new Set(terms.filter(function (t) { return keyOf(t.vars) === k; }).map(function (t) { return Object.keys(t.vars).join(''); }));
        return forms.size > 1;
      });
      return { status: 'unsimplified', keys: dups, orderMix: orderMix, terms: terms };
    }
    return { status: 'correct', terms: terms };
  }
  var issues = [], explained = new Set();
  var bugs = bugPolys(p);
  var whole = bugs.find(function (b) { return polyEq(b.poly, stu); });
  if (whole) return { status: 'wrong', issues: [{ id: whole.id, keys: [] }], terms: terms, stu: stu };
  var ak = Array.from(p.answer.keys());
  /* combined unlike terms */
  stu.forEach(function (st, sk) {
    var a = p.answer.get(sk);
    if (a && a.c === st.c) return;
    var best = null, n = ak.length;
    for (var mask = 1; mask < (1 << n); mask++) {
      var S = ak.filter(function (_, i) { return mask & (1 << i); });
      if (S.length < 2) continue;
      var sum = S.reduce(function (s, k) { return s + p.answer.get(k).c; }, 0);
      if (sum !== st.c) continue;
      if (S.some(function (k) { return k !== sk && stu.has(k); })) continue;
      if (!best || S.length < best.length) best = S;
    }
    if (best) {
      issues.push({ id: 'unlike', keys: best, stuKey: sk });
      best.forEach(function (k) { explained.add(k); }); explained.add(sk);
    }
  });
  /* exponent changed when it shouldn't */
  stu.forEach(function (st, sk) {
    if (explained.has(sk) || p.answer.has(sk)) return;
    var k = ak.find(function (k) { return !stu.has(k) && !explained.has(k) && bumped(st.vars, p.answer.get(k).vars); });
    if (k !== undefined) { issues.push({ id: 'expAdd', keys: [k], stuKey: sk }); explained.add(k); explained.add(sk); }
  });
  /* key by key */
  ak.forEach(function (k) {
    if (explained.has(k)) return;
    var cc = p.answer.get(k).c, sc = stu.has(k) ? stu.get(k).c : 0;
    if (sc === cc) return;
    var b = bugs.find(function (b) { return (b.poly.has(k) ? b.poly.get(k).c : 0) === sc; });
    var id = b ? b.id : sc === 0 ? 'lost' : sc === -cc ? 'signFlip' : 'arith';
    addIssue(issues, id, k); explained.add(k);
  });
  stu.forEach(function (st, sk) {
    if (explained.has(sk) || p.answer.has(sk)) return;
    var b = bugs.find(function (b) { return b.poly.has(sk) && b.poly.get(sk).c === st.c; });
    addIssue(issues, b ? b.id : 'extra', sk);
  });
  var rank = function (id) { return BUG_ORDER.indexOf(id) >= 0 ? 0 : (id === 'unlike' || id === 'expAdd') ? 1 : 2; };
  issues.sort(function (a, b) { return rank(a.id) - rank(b.id); });
  return { status: 'wrong', issues: issues, terms: terms, stu: stu };
}

/* ---------- generators ---------- */
function ex() {
  var items = Array.prototype.slice.call(arguments);
  return items.map(function (t, i) { t = String(t); return i === 0 ? t : (t[0] === '-' ? ' - ' + t.slice(1) : ' + ' + t); }).join('');
}
function cv(c, v) { v = v || 'x'; return c === 1 ? v : c === -1 ? '-' + v : c + v; }
var r2 = function () { return rnd(2, 9); };
var sg = function () { return pick(['', '-']); };

var GEN = {
  like: [
    [ /* mild: positive terms, one variable */
      { id: 'L1', tags: ['unlike'], f: function () { return ex(cv(r2()), cv(r2()), rnd(1, 9)); } },
      { id: 'L2', tags: ['unlike'], f: function () { return ex(cv(r2()), rnd(1, 9), cv(r2()), rnd(1, 9)); } },
      { id: 'L3', tags: ['invisOne'], f: function () { return pick([ex('x', cv(r2()), rnd(1, 9)), ex(cv(r2()), rnd(1, 9), 'x'), ex(rnd(1, 9), 'x', cv(r2()))]); } },
      { id: 'L4', tags: ['unlike'], f: function () { return ex(rnd(1, 9), cv(r2()), rnd(1, 9)); } },
      { id: 'L5', tags: ['invisOne', 'unlike'], f: function () { return ex(cv(r2(), 'y'), rnd(1, 9), 'y', cv(r2(), 'y')); } }
    ],
    [ /* medium: subtraction, negatives, two variables */
      { id: 'M1', tags: ['absAll', 'signFlip'], f: function () { return ex(cv(r2()), '-' + r2(), cv(-r2()), rnd(1, 9)); } },
      { id: 'M2', tags: ['unlike'], f: function () { return ex(cv(r2()), cv(r2(), 'y'), cv(-rnd(1, 9)), cv(r2(), 'y')); } },
      { id: 'M3', tags: ['invisOne'], f: function () { return ex('-x', r2(), cv(r2()), '-' + r2()); } },
      { id: 'M4', tags: ['absAll', 'signFlip'], f: function () { return ex(rnd(2, 12), cv(-r2()), '-' + rnd(1, 9), cv(-r2())); } },
      { id: 'M5', tags: ['invisOne', 'absAll'], f: function () { return ex(cv(r2(), 'y'), '-' + r2(), '-y', cv(-r2(), 'y'), rnd(1, 9)); } }
    ],
    [ /* spicy: exponents, xy = yx, subtracting brackets */
      { id: 'S1', tags: ['expAdd', 'unlike'], f: function () { return ex(cv(rnd(2, 6), 'x^2'), cv(rnd(1, 7)), cv(-rnd(1, 5), 'x^2'), cv(r2())); } },
      { id: 'S2', tags: ['notSimplified'], f: function () { return ex(cv(r2(), 'xy'), '-' + rnd(1, 9), cv(rnd(1, 9), 'yx'), rnd(1, 9)); } },
      { id: 'S3', tags: ['signDrop'], f: function () { return '(' + ex(cv(r2()), cv(r2(), 'y')) + ') - (' + ex(cv(rnd(1, 6)), cv(-rnd(1, 6), 'y')) + ')'; } },
      { id: 'S4', tags: ['expAdd', 'absAll'], f: function () { return ex(cv(r2(), 'x^2'), cv(-r2()), rnd(1, 9), cv(-rnd(1, 8), 'x^2'), cv(r2()), '-' + rnd(1, 9)); } },
      { id: 'S5', tags: ['signDrop', 'notSimplified'], f: function () { return ex(cv(-r2(), 'ab'), '-(' + cv(-r2(), 'ba') + ')', rnd(1, 9)); } },
      { id: 'S6', tags: ['signDrop', 'expAdd'], f: function () { return '(' + ex(cv(r2(), 'x^2'), cv(-rnd(1, 9)), rnd(1, 9)) + ') - (' + ex('x^2', cv(rnd(1, 9)), '-' + rnd(1, 9)) + ')'; } }
    ]
  ],
  dist: [
    [ /* mild: positive number outside */
      { id: 'D1', tags: ['firstOnly'], f: function () { return r2() + '(x + ' + rnd(1, 9) + ')'; } },
      { id: 'D2', tags: ['firstOnly'], f: function () { return r2() + '(x - ' + rnd(1, 9) + ')'; } },
      { id: 'D3', tags: ['firstOnly'], f: function () { return r2() + '(' + cv(rnd(2, 5)) + ' + ' + rnd(1, 9) + ')'; } },
      { id: 'D4', tags: ['firstOnly'], f: function () { return r2() + '(' + cv(rnd(2, 5)) + ' - ' + rnd(1, 9) + ')'; } },
      { id: 'D5', tags: ['firstOnly'], f: function () { return r2() + '(' + rnd(1, 9) + ' + ' + cv(rnd(1, 5), pick(['x', 'y'])) + ')'; } }
    ],
    [ /* medium: negatives outside, variables outside */
      { id: 'E1', tags: ['signDrop'], f: function () { return '-' + r2() + '(x + ' + rnd(1, 9) + ')'; } },
      { id: 'E2', tags: ['signDrop'], f: function () { return '-' + r2() + '(' + cv(rnd(1, 5)) + ' - ' + rnd(1, 9) + ')'; } },
      { id: 'E3', tags: ['signDrop'], f: function () { return '-(' + ex(cv(rnd(1, 5)), sg() + rnd(1, 9)) + ')'; } },
      { id: 'E4', tags: ['xx', 'firstOnly'], f: function () { return 'x(' + ex('x', sg() + rnd(1, 9)) + ')'; } },
      { id: 'E5', tags: ['partialVar', 'xx'], f: function () { return r2() + 'x(' + ex(cv(rnd(1, 4)), sg() + rnd(1, 9)) + ')'; } },
      { id: 'E6', tags: ['firstOnly', 'signDrop'], f: function () { return sg() + r2() + '(' + ex(cv(rnd(1, 4)), cv(pick([1, -1]) * rnd(1, 5), 'y'), sg() + rnd(1, 9)) + ')'; } }
    ],
    [ /* spicy: expand and simplify */
      { id: 'F1', tags: ['firstOnly', 'unlike'], f: function () { return r2() + '(x + ' + rnd(1, 9) + ') + ' + r2() + '(x - ' + rnd(1, 9) + ')'; } },
      { id: 'F2', tags: ['leftSub', 'signDrop'], f: function () { return rnd(5, 15) + ' - ' + r2() + '(x ' + pick(['+', '-']) + ' ' + rnd(1, 9) + ')'; } },
      { id: 'F3', tags: ['signDrop'], f: function () { return cv(r2()) + ' - ' + r2() + '(x ' + pick(['+', '-']) + ' ' + rnd(1, 9) + ')'; } },
      { id: 'F4', tags: ['xx', 'unlike'], f: function () { return 'x(x + ' + rnd(1, 6) + ') + ' + rnd(2, 5) + '(' + ex('x^2', cv(rnd(1, 5)), '-' + rnd(1, 9)) + ')'; } },
      { id: 'F5', tags: ['signDrop'], f: function () { return r2() + '(' + cv(rnd(1, 4)) + ' - ' + rnd(1, 9) + ') - ' + r2() + '(x + ' + rnd(1, 9) + ')'; } },
      { id: 'F6', tags: ['partialVar', 'signDrop'], f: function () { return r2() + 'x(x - ' + rnd(1, 6) + ') - (' + ex('x^2', cv(-rnd(1, 9))) + ')'; } }
    ]
  ]
};
var VERB = { like: ['Simplify', 'Simplify', 'Simplify'], dist: ['Expand', 'Expand', 'Expand and simplify'] };

/* a usable problem: nothing cancels to zero, answer not empty */
function validProblem(p) {
  if (!p.answer.size) return false;
  for (var i = 0; i < p.expanded.length; i++) if (!p.answer.has(keyOf(p.expanded[i].vars))) return false;
  return true;
}
function generate(gen, avoid) {
  for (var k = 0; k < 80; k++) {
    var s = gen.f(), p;
    try { p = makeProblem(s); } catch (e) { continue; }
    if (validProblem(p) && s !== avoid) return p;
  }
  return null;
}
