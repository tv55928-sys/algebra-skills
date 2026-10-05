(function () {
'use strict';
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* ================= rendering helpers ================= */
var FAMS = { '': 'k', 'x': 'x', 'x^2': 'x2', 'x^3': 'x3', 'y': 'y', 'y^2': 'y2', 'xy': 'xy', 'ab': 'xy', 'a': 'x', 'b': 'y', 'a^2': 'x2', 'b^2': 'y2' };
function famOf(k) { return FAMS[k] || 'z'; }
function varsHTML(vars) {
  return Object.keys(vars).filter(function (v) { return vars[v]; })
    .map(function (v) { return '<i>' + v + '</i>' + (vars[v] > 1 ? '<sup>' + vars[v] + '</sup>' : ''); }).join('');
}
function absBody(t) { var a = Math.abs(t.c), v = varsHTML(t.vars); return v ? (a === 1 ? '' : a) + v : String(a); }
/* modes: first (−3x), mid (+ 3x / − 3x), paren ((−3x) or 3x), signed (+3x / −3x) */
function tHTML(t, mode, extra, attrs) {
  var fam = famOf(keyOf(t.vars)), neg = t.c < 0, s;
  if (t.c === 0) s = '0';
  else if (mode === 'mid') s = (neg ? '− ' : '+ ') + absBody(t);
  else if (mode === 'paren') s = neg ? '(−' + absBody(t) + ')' : absBody(t);
  else if (mode === 'signed') s = (neg ? '−' : '+') + absBody(t);
  else s = (neg ? '−' : '') + absBody(t);
  return '<span class="tm f-' + fam + (extra || '') + '"' + (attrs || '') + '>' + s + '</span>';
}
function facHTML(m) { return '<span class="fac">' + (m.c < 0 ? '−' : '') + absBody(m) + '</span>'; }
function polyHTML(terms, chips) {
  if (!terms.length) return '<span class="tm f-k">0</span>';
  return terms.map(function (t, i) { return tHTML(t, i ? 'mid' : 'first', chips ? ' chip' : ''); }).join(' ');
}
function ansHTML(p) { return '<span class="expr sm">' + polyHTML(polyTerms(p.answer)) + '</span>'; }
function partsHTML(parts, o) {
  o = o || {};
  var ch = o.chips ? ' chip' : '';
  return parts.map(function (p, i) {
    if (p.kind === 'term') return '<span class="part">' + tHTML(p.t, i ? 'mid' : 'first', ch) + '</span>';
    var gid = 'g' + i + '_' + Math.random().toString(36).slice(2, 7), h = '';
    var m = hasMult(p);
    if (p.sign > 0) {
      if (i > 0) h += '+ ';
      if (p.factor) h += '<span class="fac" data-g="' + gid + '">' + absBody(p.factor) + '</span>';
    } else {
      h += '<span class="fac" data-g="' + gid + '">' + (i > 0 ? '− ' : '−') + (p.factor ? absBody(p.factor) : '') + '</span>';
    }
    h += '<span class="br">(</span>' + p.group.map(function (g, j) {
      return (j ? ' ' : '') + tHTML(g, j ? 'mid' : 'first', ch, m ? ' data-inn="' + gid + '"' : '');
    }).join('') + '<span class="br">)</span>';
    return '<span class="part">' + (i > 0 ? ' ' : '') + h + '</span>';
  }).join(' ');
}
function E(str, o) {
  o = o || {};
  var parts = parseProblem(str);
  var arrows = o.arrows && !o.inline && parts.some(hasMult);
  return '<span class="expr' + (o.sm ? ' sm' : '') + (o.inline ? ' inline' : '') + (arrows ? ' has-arrows' : '') + '">' +
    partsHTML(parts, o) + (arrows ? '<svg class="arrows" aria-hidden="true"></svg>' : '') + '</span>';
}
function drawArrows() {
  $$('.expr.has-arrows').forEach(function (ex) {
    var svg = ex.querySelector('svg.arrows'); if (!svg) return;
    var box = ex.getBoundingClientRect(); if (!box.width) return;
    svg.setAttribute('width', box.width); svg.setAttribute('height', box.height);
    var paths = '';
    $$('.fac[data-g]', ex).forEach(function (f) {
      var fb = f.getBoundingClientRect();
      var fx = fb.left + fb.width / 2 - box.left, fy = fb.top - box.top;
      $$('[data-inn="' + f.dataset.g + '"]', ex).forEach(function (t, idx) {
        var tb = t.getBoundingClientRect();
        var tx = tb.left + tb.width / 2 - box.left, ty = tb.top - box.top;
        var cy = Math.min(fy, ty) - 30 - idx * 12;
        var hx = tx, hy = ty + 1;
        paths += '<path class="a" d="M' + fx.toFixed(1) + ',' + (fy + 1).toFixed(1) + ' Q' + ((fx + tx) / 2).toFixed(1) + ',' + cy.toFixed(1) + ' ' + hx.toFixed(1) + ',' + hy.toFixed(1) + '"/>' +
          '<path d="M' + (hx - 5).toFixed(1) + ',' + (hy - 8).toFixed(1) + ' L' + hx.toFixed(1) + ',' + hy.toFixed(1) + ' L' + (hx + 5).toFixed(1) + ',' + (hy - 8).toFixed(1) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      });
    });
    svg.innerHTML = paths;
  });
}
function tile(kind, neg, zp) {
  var fam = { '1': 'k', x: 'x', x2: 'x2', y: 'y' }[kind], lab = { '1': '1', x: 'x', x2: 'x²', y: 'y' }[kind];
  return '<span class="tile t-' + kind + ' f-' + fam + (neg ? ' neg' : '') + (zp ? ' zp' : '') + '">' + (neg ? '−' : '') + lab + '</span>';
}
function tileRow(spec) {
  return '<div class="trow">' + spec.map(function (s) {
    var out = ''; for (var i = 0; i < s[1]; i++) out += tile(s[0], s[2], s[3]); return out;
  }).join('<span class="tgap"></span>') + '</div>';
}
function tiles(rows, cap) {
  return '<figure class="tiles" role="img" aria-label="' + (cap || 'algebra tiles').replace(/<[^>]+>/g, '') + '">' + rows.map(tileRow).join('') + (cap ? '<figcaption>' + cap + '</figcaption>' : '') + '</figure>';
}
function area(m, terms) {
  var h = '<div class="tablewrap"><div class="area" style="grid-template-columns:auto repeat(' + terms.length + ',minmax(4.4em,auto))"><span class="ac corner">×</span>';
  terms.forEach(function (t) { h += '<span class="ac top">' + tHTML(t, 'first') + '</span>'; });
  h += '<span class="ac side">' + facHTML(m) + '</span>';
  terms.forEach(function (t) { var pr = mul(m, t); h += '<span class="ac cell f-' + famOf(keyOf(pr.vars)) + '">' + tHTML(pr, 'first') + '</span>'; });
  return h + '</div></div>';
}
function X(c, v) { var vars = {}; if (v) vars[v] = 1; return T(c, vars); }
function pepper(n) {
  var one = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 7.2c3.2.6 4.9 3.4 4.1 6.9-.9 4-4.9 7.2-10.6 8-1.6.2-2-.9-.8-1.7 3.9-2.5 5.6-5.6 5.4-9.4-.1-2 .3-3.4 1.9-3.8z" fill="currentColor"/><path d="M15 7.5c-.2-2 .6-3.6 2.6-4.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var s = ''; for (var i = 0; i < n; i++) s += one; return '<span class="pep">' + s + '</span>';
}
function fbBox(kind, head, body) { return '<div class="fb ' + kind + '"><p class="fbh">' + head + '</p>' + body + '</div>'; }
function famTag(key, vars) {
  return '<span class="hl f-' + famOf(key) + '">' + (key === '' ? 'constant terms' : varsHTML(vars) + '-terms') + '</span>';
}
function varsFor(key, p, stu) {
  var src = (p.answer.get(key)) || (stu && stu.get(key));
  if (src) return src.vars;
  var t = p.expanded.find(function (t) { return keyOf(t.vars) === key; });
  return t ? t.vars : {};
}

/* ================= misconception library ================= */
var MISC = {
  firstOnly: { name: 'Multiply every term inside', tip: 'The number outside the brackets multiplies every term inside, not just the first one.' },
  signDrop: { name: 'Negatives outside brackets', tip: 'A negative outside the brackets is multiplied into every term, so it can flip signs.' },
  noFlip: { name: 'Negatives outside brackets', tip: 'The negative sign outside is part of the multiplier. It changes the sign of the terms inside.' },
  partialVar: { name: 'Variables outside brackets', tip: 'If there is a variable outside, every term inside gets that variable too.' },
  xx: { name: 'x × x = x²', tip: 'x × x is x² (x squared). 2x means x + x.' },
  leftSub: { name: 'Order of operations', tip: 'Multiply into the brackets before subtracting. The minus belongs to the number after it.' },
  absAll: { name: 'Signs belong to terms', tip: 'The sign in front of a term is part of that term.' },
  invisOne: { name: 'The invisible 1', tip: 'x means 1x, and −x means −1x.' },
  unlike: { name: 'Only combine like terms', tip: 'Terms need exactly the same variable part to be combined.' },
  expAdd: { name: 'Adding keeps the exponent', tip: 'x + x = 2x. The exponent only changes when you multiply x by x.' },
  notSimplified: { name: 'Finish simplifying', tip: 'Keep going until there is only one term of each kind.' },
  signFlip: { name: 'Sign slips', tip: 'Check positive and negative carefully, one term at a time.' },
  lost: { name: 'Lost terms', tip: 'Every term in the question has to end up somewhere in the answer.' },
  arith: { name: 'Calculation slips', tip: 'Recheck the arithmetic for each coefficient.' },
  extra: { name: 'Extra terms', tip: 'Make sure every term in your answer came from the question.' }
};
var MISC_GROUP = { noFlip: 'signDrop' };
function miscId(id) { return MISC_GROUP[id] || id; }

function findPart(p, test) { for (var i = 0; i < p.parts.length; i++) if (test(p.parts[i], i)) return { part: p.parts[i], i: i }; return null; }
function contribLine(p, k) {
  var items = [];
  p.parts.forEach(function (part) {
    if (part.kind === 'term') { if (keyOf(part.t.vars) === k) items.push(tHTML(part.t, 'paren')); return; }
    var m = multOf(part);
    part.group.forEach(function (g) {
      if (keyOf(mul(m, g).vars) !== k) return;
      items.push(hasMult(part) ? '(' + facHTML(m) + ' × ' + tHTML(g, 'paren') + ')' : tHTML(g, 'paren'));
    });
  });
  if (items.length === 1 && items[0][0] === '(') items[0] = items[0].slice(1, -1);
  return '<span class="cl">' + items.join(' <span class="op">+</span> ') + ' <span class="op">=</span> <b>?</b></span>';
}
function issueHTML(is, p, d) {
  var k = is.keys && is.keys[0], hit;
  switch (is.id) {
    case 'firstOnly':
      hit = findPart(p, function (q) { return hasMult(q) && q.group.length > 1; });
      if (hit) {
        var m = multOf(hit.part), g = hit.part.group[1];
        return 'You multiplied ' + facHTML(m) + ' by the first term, but not by ' + tHTML(g, 'paren') + '. The ' + facHTML(m) + ' outside the brackets has to multiply <b>every</b> term inside. What is <span class="cl">' + facHTML(m) + ' × ' + tHTML(g, 'paren') + '</span>?';
      }
      return 'The number outside the brackets has to multiply <b>every</b> term inside.';
    case 'signDrop':
      hit = findPart(p, function (q) { return q.kind === 'group' && multOf(q).c < 0 && q.group.length > 1; });
      if (hit) {
        var m2 = multOf(hit.part), g2 = hit.part.group[1];
        var pre = hit.part.factor ? 'The ' + facHTML(m2) + ' outside is negative, so its negative sign is multiplied into <b>every</b> term inside.' :
          'A minus sign in front of brackets means multiply by ' + facHTML(m2) + '. It flips the sign of <b>every</b> term inside, not just the first.';
        return pre + ' You kept the sign of ' + tHTML(g2, 'paren') + ' the same. Work out <span class="cl">' + facHTML(m2) + ' × ' + tHTML(g2, 'paren') + '</span>. Remember: ' + (g2.c < 0 ? 'negative × negative = <b>positive</b>.' : 'negative × positive = <b>negative</b>.');
      }
      return 'The negative outside the brackets has to reach every term inside.';
    case 'noFlip':
      hit = findPart(p, function (q) { return q.kind === 'group' && multOf(q).c < 0; });
      if (hit) {
        var m3 = multOf(hit.part), g3 = hit.part.group[0];
        return 'The sign in front of the brackets belongs to the multiplier, so you are multiplying by ' + facHTML(m3) + ', a negative. That changes the sign of each term inside. Try <span class="cl">' + facHTML(m3) + ' × ' + tHTML(g3, 'paren') + '</span> first.';
      }
      return 'The negative outside the brackets changes the sign of the terms inside.';
    case 'partialVar':
      hit = findPart(p, function (q) { return q.kind === 'group' && degree(multOf(q).vars) > 0 && q.group.length > 1; });
      if (hit) {
        var m4 = multOf(hit.part), g4 = hit.part.group[hit.part.group.length - 1];
        return 'The ' + facHTML(m4) + ' outside includes ' + '<span class="mi">' + varsHTML(m4.vars) + '</span>, so every term inside gets multiplied by it too, not just the number part. ' + '<span class="cl">' + facHTML(m4) + ' × ' + tHTML(g4, 'paren') + '</span> should still have ' + varsHTML(m4.vars) + ' in it.';
      }
      return 'A variable outside the brackets multiplies every term inside.';
    case 'xx':
      return 'Look at where a variable is multiplied by itself. <span class="cl"><i>x</i> × <i>x</i> = <i>x</i><sup>2</sup></span> ("x squared"), not 2x. 2x means x + x. Picture a square with sides of length x: its area is x × x = x².';
    case 'leftSub':
      hit = findPart(p, function (q, i) { return i > 0 && q.kind === 'group' && q.sign < 0 && q.factor; });
      if (hit) {
        var prev = p.parts[hit.i - 1].t, m5 = multOf(hit.part);
        return 'Careful with order of operations. You can\'t do <span class="cl">' + tHTML(prev, 'first') + ' − ' + absBody(hit.part.factor) + '</span> first, because multiplying comes before subtracting. The minus belongs to the number after it, so multiply every term in the brackets by ' + facHTML(m5) + '. Then combine with ' + tHTML(prev, 'first') + '.';
      }
      return 'Multiply into the brackets before you subtract.';
    case 'absAll':
      return 'Check the signs on your ' + famTag(k, varsFor(k, p, d.stu)) + '. A minus sign in front of a term belongs to that term. Add them with their signs: ' + contribLine(p, k);
    case 'invisOne':
      return 'A variable with no number in front has a coefficient of <b>1</b>: x means 1x, and −x means −1x. Recount your ' + famTag(k, varsFor(k, p, d.stu)) + ': ' + contribLine(p, k);
    case 'unlike':
      var tags = is.keys.map(function (kk) { return famTag(kk, varsFor(kk, p, d.stu)); });
      var hasConst = is.keys.indexOf('') >= 0;
      return 'You combined ' + tags.join(' and ') + '. These are <b>unlike terms</b> (their variable parts are different), so they can\'t be added into one term. Combine each colour separately and keep them as separate terms.' +
        (hasConst ? ' For example, 3x + 5 stays 3x + 5. It is not 8x.' : is.keys.some(function (kk) { return kk.indexOf('^') >= 0; }) ? ' For example, x² + x stays x² + x. A big square tile and a long tile can\'t be counted together.' : ' For example, 2x + 3y stays 2x + 3y.');
    case 'expAdd':
      var sv = d.stu.get(is.stuKey).vars, av = p.answer.get(k).vars;
      return 'Your answer has <span class="hl f-' + famOf(is.stuKey) + '">' + varsHTML(sv) + '</span> where it should have <span class="hl f-' + famOf(k) + '">' + varsHTML(av) + '</span>. The exponent only goes up when you multiply a variable by itself (x × x = x²). Adding x\'s together, or multiplying x by a plain number, keeps it as x.';
    case 'lost':
      return 'Your answer is missing the ' + famTag(k, varsFor(k, p, d.stu)) + '. Every term in the question has to end up somewhere in your answer. Work out: ' + contribLine(p, k);
    case 'signFlip':
      return 'Your ' + famTag(k, varsFor(k, p, d.stu)) + ' have the right number but the wrong sign. Check: ' + contribLine(p, k);
    case 'arith':
      return 'Your ' + famTag(k, varsFor(k, p, d.stu)) + ' aren\'t quite right. Work them out again: ' + contribLine(p, k);
    case 'extra':
      return 'Your answer has ' + famTag(k, varsFor(k, p, d.stu)) + ', but the simplified answer doesn\'t have any. Check where that term came from.';
  }
  return 'Something is off. Compare each colour group again.';
}
var PARSE_MSG = {
  empty: 'Type your answer in the box first.',
  brackets: 'Write your answer without brackets. Expanding means multiplying so the brackets disappear.',
  chars: 'Use numbers, letters, + and −. For a power, type ^ (like x^2) or tap the x² button.',
  exp: 'After ^ you need a number, like x^2.',
  numexp: 'Powers go on letters here, like x^2.',
  syntax: 'I couldn\'t read that. Write terms like 3x, −5 or 2x^2 with + or − between them. Put the number before the letter (2x, not x2).',
  dangling: 'Your answer ends with a + or − sign. Finish the last term or delete the sign.'
};
function feedbackHTML(d, p) {
  if (d.status === 'parse') return fbBox('info', 'Check how it\'s written', '<p>' + PARSE_MSG[d.error] + '</p>');
  if (d.status === 'unsimplified') {
    var tags = d.keys.map(function (k) { return famTag(k, varsFor(k, p)); }).join(' and ');
    return fbBox('info', 'Almost there', '<p>Your answer is equal to the right answer, but it isn\'t finished. You still have more than one of the ' + tags + '. Combine them into one term.</p>' +
      (d.orderMix ? '<p>Remember: xy and yx are like terms, because x × y = y × x. The same goes for ab and ba.</p>' : '') +
      '<p class="yours">You wrote: <span class="expr sm">' + polyHTML(d.terms) + '</span></p>');
  }
  var shown = d.issues.slice(0, 2);
  return fbBox('bad', 'Not yet. Here\'s what to look at', shown.map(function (is) { return '<p>' + issueHTML(is, p, d) + '</p>'; }).join('') +
    '<p class="yours">You wrote: <span class="expr sm">' + polyHTML(d.terms) + '</span></p>');
}
function issueIds(d) {
  if (d.status === 'unsimplified') return ['notSimplified'];
  var ids = [];
  d.issues.slice(0, 2).forEach(function (is) { var id = miscId(is.id); if (ids.indexOf(id) < 0) ids.push(id); });
  return ids;
}

/* ================= worked solution + scaffold ================= */
function groupBy(terms) {
  var m = new Map();
  terms.forEach(function (t) { var k = keyOf(t.vars); if (!m.has(k)) m.set(k, []); m.get(k).push(t); });
  return m;
}
function sortedGroups(m) {
  return Array.from(m.entries()).sort(function (a, b) { return degree(b[1][0].vars) - degree(a[1][0].vars) || a[0].localeCompare(b[0]); });
}
function solutionHTML(p) {
  var steps = [];
  var groups = p.parts.filter(function (q) { return q.kind === 'group'; });
  if (!groups.length) {
    steps.push(['Split it into terms. Each term keeps the sign in front of it.', '<div>' + E(p.str, { chips: true, sm: true }) + '</div>']);
  } else {
    var lines = p.parts.map(function (part) {
      if (part.kind === 'term') return '';
      if (!hasMult(part)) return '<div class="sl">' + part.group.map(function (g, j) { return tHTML(g, j ? 'mid' : 'first'); }).join(' ') + '<span class="cap">no number in front, so these come out unchanged</span></div>';
      var m = multOf(part);
      var intro = part.factor ? '' : '<div class="muted">A minus sign in front of brackets means multiply by −1.</div>';
      return intro + part.group.map(function (g) { return '<div class="sl">' + facHTML(m) + ' × ' + tHTML(g, 'paren') + ' = ' + tHTML(mul(m, g), 'first') + '</div>'; }).join('');
    }).join('');
    steps.push(['Distribute: multiply the highlighted number by every term inside its brackets.', lines]);
    steps.push(['Write out all the terms.', '<div class="expr sm">' + polyHTML(p.expanded, true) + '</div>']);
  }
  var need = sortedGroups(groupBy(p.expanded)).filter(function (e) { return e[1].length > 1; });
  if (need.length) {
    steps.push(['Group like terms (same colour) and combine them.', need.map(function (e) {
      return '<div class="sl">' + e[1].map(function (t, i) { return tHTML(t, i ? 'mid' : 'first'); }).join(' ') + ' = ' + tHTML(polyTerms(combine(e[1]))[0] || T(0), 'first') + '</div>';
    }).join('')]);
  }
  steps.push(['Answer', ansHTML(p)]);
  return '<div class="solution"><h3>Worked solution</h3><ol>' + steps.map(function (s) { return '<li><p>' + s[0] + '</p>' + s[1] + '</li>'; }).join('') + '</ol></div>';
}
function scaffoldSteps(p) {
  var steps = [];
  p.parts.forEach(function (part) {
    if (!hasMult(part)) return;
    var m = multOf(part);
    part.group.forEach(function (g) { steps.push({ kind: 'prod', m: m, g: g, ans: mul(m, g) }); });
  });
  sortedGroups(groupBy(p.expanded)).forEach(function (e) {
    if (e[1].length > 1) steps.push({ kind: 'group', key: e[0], ts: e[1], ans: combine(e[1]) });
  });
  return steps;
}
function scaffoldHTML(p) {
  var st = scaffoldSteps(p);
  if (!st.length) return '';
  var rows = st.map(function (s, i) {
    var lab = s.kind === 'prod' ? facHTML(s.m) + ' × ' + tHTML(s.g, 'paren') + ' =' :
      '<span class="cap">Combine the ' + famTag(s.key, s.ts[0].vars) + '</span>' + s.ts.map(function (t, j) { return tHTML(t, j ? 'mid' : 'first'); }).join(' ') + ' =';
    return '<div class="srow" data-si="' + i + '"><span class="lab">' + lab + '</span><input id="sc-' + i + '" aria-label="Step ' + (i + 1) + '" autocomplete="off" autocapitalize="off" spellcheck="false"><span class="tip" hidden></span></div>';
  }).join('');
  var hasProd = st.some(function (s) { return s.kind === 'prod'; }), hasGroup = st.some(function (s) { return s.kind === 'group'; });
  var intro = hasProd && hasGroup ? 'First multiply, then combine like terms. Then type the full answer in the box above.' :
    hasProd ? 'Multiply the highlighted number by each term, one at a time. Then type the full answer in the box above.' :
      'Combine each colour group separately. Then type the full answer in the box above.';
  return '<div class="scaf"><h3>Break it down</h3><p>' + intro + '</p>' + rows + '<div class="btnrow"><button class="btn small" data-act="sccheck">Check these steps</button></div></div>';
}
function checkScaffold(p) {
  var st = scaffoldSteps(p), allGood = true;
  st.forEach(function (s, i) {
    var inp = $('#sc-' + i); if (!inp) return;
    var tip = inp.parentNode.querySelector('.tip');
    var r = parseAnswer(inp.value);
    inp.classList.remove('good', 'badv'); tip.hidden = true;
    if (r.error) { if (inp.value.trim()) { inp.classList.add('badv'); tip.textContent = 'I couldn\'t read this one. Try something like −6x or 12.'; tip.hidden = false; } allGood = false; return; }
    var got = combine(r.terms);
    if (polyEq(got, s.ans)) { inp.classList.add('good'); return; }
    allGood = false; inp.classList.add('badv');
    var want = polyTerms(s.ans)[0] || T(0), have = polyTerms(got)[0];
    var msg;
    if (have && keyOf(have.vars) === keyOf(want.vars) && have.c === -want.c) msg = s.kind === 'prod' ? 'Check the sign. Same signs multiply to a positive; different signs give a negative.' : 'Check the sign. Picture a number line, or cancel positive and negative tiles in pairs.';
    else if (have && keyOf(have.vars) !== keyOf(want.vars)) msg = s.kind === 'prod' ? 'Check the variable part. Multiply the numbers, then put the letters together (x × x = x²).' : 'Adding like terms keeps the variable part exactly the same.';
    else msg = s.kind === 'prod' ? 'Multiply the numbers (with their signs), then attach the variable.' : 'Add the coefficients, keeping each one\'s sign.';
    tip.textContent = msg; tip.hidden = false;
  });
  return allGood;
}

/* ================= tutorials ================= */
var x1 = X(1, 'x');
var TUT = {
  like: [
    { title: 'What is a term?', html: function () {
      return '<p>Algebra expressions are built out of <b>terms</b>. You find the terms by splitting the expression at every <b>+</b> and <b>−</b> sign.</p>' +
        '<div class="demo">' + E('4x + 3 - 2x + 7', { sm: true }) + '</div>' +
        '<p>Split into terms, it looks like this. Each term carries the sign in front of it, like a backpack.</p>' +
        '<div class="demo">' + E('4x + 3 - 2x + 7', { chips: true }) + '</div>' +
        '<div class="callout"><b>Rule to remember:</b> the sign in front of a term belongs to that term. The third term here is <b>−2x</b> ("negative two x"), not 2x.</div>' +
        '<div class="vocab"><div><span class="vword">Coefficient</span><span class="vex"><span class="fac">−2</span><i>x</i></span><span>The number in front of the variable. Its sign comes with it.</span></div>' +
        '<div><span class="vword">Variable</span><span class="vex"><i>x</i></span><span>A letter that stands for a number we don\'t know yet.</span></div>' +
        '<div><span class="vword">Constant</span><span class="vex">7</span><span>A term with no variable. Its value never changes.</span></div></div>';
    }, checks: [
      { type: 'mc', q: function () { return 'How many terms are in ' + E('5x - 8 - 7x + 3', { inline: true }) + '?'; }, opts: [
        { h: '2', fb: 'Count every piece between the + and − signs. 5x is one term, −8 is another. Keep going.' },
        { h: '3', fb: 'Close. Did you count the −8? Every piece between the signs is a term, numbers included.' },
        { h: '4', ok: true, fb: 'Yes. The terms are 5x, −8, −7x and +3.' },
        { h: '1', fb: 'An expression with + or − signs in it has more than one term. Split it at each sign.' }] },
      { type: 'mc', q: function () { return 'In ' + E('5x - 8 - 7x + 3', { inline: true }) + ', what is the coefficient of the second x-term?'; }, opts: [
        { h: '7', fb: 'Almost. Look at the sign in front of the 7x. The sign is part of the coefficient.' },
        { h: '−7', ok: true, fb: 'Right. The term is −7x, so its coefficient is −7.' },
        { h: 'x', fb: 'x is the variable. The coefficient is the number in front of it, with its sign.' },
        { h: '−8', fb: '−8 is a constant (no variable). Look for the number attached to the second x.' }] }
    ] },
    { title: 'Like terms match exactly', html: function () {
      return '<p>Two terms are <b>like terms</b> when their variable parts match exactly: the same letters, with the same exponents. The coefficients can be anything.</p>' +
        '<p>Algebra tiles show why. Each kind of term has its own tile shape, and you can only count tiles of the same shape together.</p>' +
        '<div class="legend"><div>' + tile('1') + '<span>1-tile (a constant)</span></div><div>' + tile('x') + '<span>x-tile</span></div><div>' + tile('x2') + '<span>x²-tile</span></div></div>' +
        '<div class="tablewrap"><table class="liketable"><tbody>' +
        '<tr><td class="yes">Like</td><td>' + E('3x', { sm: true }) + ' and ' + E('-5x', { sm: true }) + '</td><td>both are x-terms</td></tr>' +
        '<tr><td class="yes">Like</td><td>' + E('4', { sm: true }) + ' and ' + E('-9', { sm: true }) + '</td><td>both are constants</td></tr>' +
        '<tr><td class="yes">Like</td><td>' + E('2x^2', { sm: true }) + ' and ' + E('x^2', { sm: true }) + '</td><td>both are x²-terms</td></tr>' +
        '<tr><td class="no">Not like</td><td>' + E('3x', { sm: true }) + ' and ' + E('3', { sm: true }) + '</td><td>one has an x, the other has no variable</td></tr>' +
        '<tr><td class="no">Not like</td><td>' + E('x', { sm: true }) + ' and ' + E('x^2', { sm: true }) + '</td><td>different exponents (different tile shapes)</td></tr>' +
        '<tr><td class="no">Not like</td><td>' + E('2x', { sm: true }) + ' and ' + E('2y', { sm: true }) + '</td><td>different letters</td></tr>' +
        '</tbody></table></div>' +
        '<div class="callout"><b>Colour key:</b> in this app, like terms always share a colour. ' + famTag('x', { x: 1 }) + ' ' + famTag('', {}) + ' ' + famTag('x^2', { x: 2 }) + ' ' + famTag('y', { y: 1 }) + '</div>';
    }, checks: [
      { type: 'multi', q: function () { return 'Tap <b>every</b> term that is a like term with ' + E('3x', { inline: true }) + '. (Colours are hidden for this one.)'; }, opts: [
        { s: '5x', ok: true }, { s: '3', fb: '3 has no x. It is a constant.' }, { s: 'x^2', fb: 'x² has an exponent of 2. 3x has an exponent of 1, so they don\'t match.' },
        { s: '-x', ok: true }, { s: '3y', fb: '3y has a different letter.' }, { s: '10x', ok: true }] }
    ] },
    { title: 'Combine by adding coefficients', html: function () {
      return '<p>To <b>combine</b> like terms, add their coefficients. The variable part stays exactly the same.</p>' +
        tiles([[['x', 3], ['x', 5]]], '3 x-tiles and 5 more x-tiles make 8 x-tiles.') +
        '<div class="eqline">' + E('3x + 5x', { sm: true }) + '<span class="eq">=</span>' + E('8x', { sm: true }) + '</div>' +
        '<div class="callout warn"><b>Common mistake:</b> 3x + 5x is <b>not</b> 8x². You started with x-tiles and you still have x-tiles, just more of them. Adding never changes the exponent.</div>';
    }, checks: [
      { type: 'expr', verb: 'Simplify', prob: '4x + 6x' },
      { type: 'expr', verb: 'Simplify', prob: '6y + 5y' }
    ] },
    { title: 'The invisible 1', html: function () {
      return '<p>When a variable has no number in front of it, its coefficient is <b>1</b>. We just don\'t bother writing it.</p>' +
        '<div class="eqline">' + E('x', { sm: true }) + '<span class="eq">means</span><span class="expr sm"><span class="tm f-x">1<i>x</i></span></span><span class="eq" style="margin-left:1em">and</span>' + E('-x', { sm: true }) + '<span class="eq">means</span><span class="expr sm"><span class="tm f-x">−1<i>x</i></span></span></div>' +
        tiles([[['x', 1], ['x', 4]]], 'One x-tile plus 4 x-tiles is 5 x-tiles.') +
        '<div class="eqline">' + E('x + 4x', { sm: true }) + '<span class="eq">=</span><span class="expr sm"><span class="tm f-x">1<i>x</i></span> <span class="tm f-x">+ 4<i>x</i></span></span><span class="eq">=</span>' + E('5x', { sm: true }) + '</div>';
    }, checks: [
      { type: 'expr', verb: 'Simplify', prob: 'x + 6x' },
      { type: 'expr', verb: 'Simplify', prob: '7y - y' }
    ] },
    { title: 'Unlike terms stay apart', html: function () {
      return '<p>If terms are not alike, you can\'t combine them. ' + E('3x + 5', { inline: true }) + ' is already as simple as it gets. It does <b>not</b> equal 8x.</p>' +
        tiles([[['x', 3], ['1', 5]]], 'Different shapes. There is no single tile that means "8x" here.') +
        '<p>You can prove it by picking a number for x. Try x = 2:</p>' +
        '<div class="tablewrap"><table class="subtable"><thead><tr><th></th><th>3x + 5</th><th>8x</th></tr></thead><tbody><tr><th>x = 2</th><td>3(2) + 5 = 11</td><td>8(2) = 16</td></tr></tbody></table></div>' +
        '<p>11 and 16 are different, so 3x + 5 and 8x are not equal.</p>' +
        '<p>When an expression has more than one kind of term, combine each kind (each colour) separately:</p>' +
        '<div class="demo">' + E('4x + 3 + 2x + 7', { chips: true, sm: true }) + '</div>' +
        '<div class="sl">' + tHTML(X(4, 'x'), 'first') + ' ' + tHTML(X(2, 'x'), 'mid') + ' = ' + tHTML(X(6, 'x'), 'first') + '<span class="cap">x-terms</span></div>' +
        '<div class="sl">' + tHTML(T(3), 'first') + ' ' + tHTML(T(7), 'mid') + ' = ' + tHTML(T(10), 'first') + '<span class="cap">constants</span></div>' +
        '<div class="eqline"><span class="eq">Answer:</span>' + E('6x + 10', { sm: true }) + '</div>';
    }, checks: [
      { type: 'mc', q: function () { return 'Simplify ' + E('6x + 2', { inline: true }) + '.'; }, opts: [
        { h: '8x', fb: '6x and 2 are unlike terms. Test with x = 1: 6(1) + 2 = 8, but then try x = 2: 6(2) + 2 = 14, while 8(2) = 16.' },
        { h: '6x + 2', ok: true, fb: 'Yes. There are no like terms to combine, so it is already simplified.' },
        { h: '8', fb: 'The x can\'t disappear. 6x and 2 are different kinds of terms.' },
        { h: '12x', fb: 'Combining unlike terms by multiplying doesn\'t work either. 6x and 2 stay separate.' }] },
      { type: 'expr', verb: 'Simplify', prob: '5x + 4 + 3x + 1' }
    ] },
    { title: 'Watch the signs', html: function () {
      return '<p>Negative terms work the same way, as long as each term keeps its sign. Let\'s simplify ' + E('5x - 8 - 7x + 3', { inline: true }) + '.</p>' +
        '<p><b>1. Split into terms.</b> The signs stay attached.</p><div class="demo">' + E('5x - 8 - 7x + 3', { chips: true, sm: true }) + '</div>' +
        '<p><b>2. Combine the x-terms:</b> 5x + (−7x). With tiles, a positive x-tile and a negative x-tile cancel out. That is called a <b>zero pair</b>. Five pairs cancel, and 2 negative x-tiles are left over.</p>' +
        tiles([[['x', 5, false, true]], [['x', 5, true, true], ['x', 2, true]]], 'Top: 5 positive x-tiles. Bottom: 7 negative x-tiles (striped). The faded tiles cancel in pairs, leaving 2 negative x-tiles.') +
        '<div class="sl">' + tHTML(X(5, 'x'), 'first') + ' ' + tHTML(X(-7, 'x'), 'mid') + ' = ' + tHTML(X(-2, 'x'), 'first') + '</div>' +
        '<p><b>3. Combine the constants.</b></p><div class="sl">' + tHTML(T(-8), 'first') + ' ' + tHTML(T(3), 'mid') + ' = ' + tHTML(T(-5), 'first') + '</div>' +
        '<div class="eqline"><span class="eq">Answer:</span>' + E('-2x - 5', { sm: true }) + '</div>' +
        '<div class="callout warn"><b>Common mistake:</b> adding 5x and 7x to get 12x. The 7x has a minus sign in front of it, so it is −7x.</div>';
    }, checks: [
      { type: 'expr', verb: 'Simplify', prob: '6x - 4 - 9x + 10' },
      { type: 'expr', verb: 'Simplify', prob: '-x + 5 + 3x - 8' }
    ] },
    { title: 'Exponents make different terms', html: function () {
      return '<p>x² ("x squared") and x are <b>not</b> like terms. Their exponents are different, and so are their tiles: x² is a big square, x is a long rectangle.</p>' +
        '<div class="legend"><div>' + tile('x2') + '<span>x²-tile</span></div><div>' + tile('x') + '<span>x-tile</span></div></div>' +
        '<p>Simplify ' + E('3x^2 + x - 2x^2 + 5x', { inline: true }) + ':</p>' +
        '<div class="demo">' + E('3x^2 + x - 2x^2 + 5x', { chips: true, sm: true }) + '</div>' +
        '<div class="sl">' + tHTML(T(3, { x: 2 }), 'first') + ' ' + tHTML(T(-2, { x: 2 }), 'mid') + ' = ' + tHTML(T(1, { x: 2 }), 'first') + '<span class="cap">x²-terms</span></div>' +
        '<div class="sl">' + tHTML(x1, 'first') + ' ' + tHTML(X(5, 'x'), 'mid') + ' = ' + tHTML(X(6, 'x'), 'first') + '<span class="cap">x-terms (remember x = 1x)</span></div>' +
        '<div class="eqline"><span class="eq">Answer:</span>' + E('x^2 + 6x', { sm: true }) + '</div>' +
        '<div class="callout"><b>Order tip:</b> we usually write the highest exponent first and constants last, like x² + 6x − 4. Any order is still correct.</div>';
    }, checks: [
      { type: 'expr', verb: 'Simplify', prob: '4x^2 + 3x - x^2 + 2x' }
    ] },
    { title: 'Two letters, and subtracting brackets', html: function () {
      return '<p><b>xy</b> means x × y. You can multiply in any order, so <b>xy and yx are the same</b>. That makes them like terms.</p>' +
        '<div class="eqline">' + E('4xy + 2yx', { sm: true }) + '<span class="eq">=</span>' + E('6xy', { sm: true }) + '</div>' +
        '<p>A minus sign in front of brackets flips the sign of <b>every</b> term inside. Think of it as multiplying by −1. Follow the arrows:</p>' +
        '<div class="demo">' + E('(3x + 2y) - (x - 4y)', { arrows: true }) + '</div>' +
        '<div class="eqline"><span class="eq">=</span>' + E('3x + 2y - x + 4y', { sm: true }) + '<span class="eq">=</span>' + E('2x + 6y', { sm: true }) + '</div>' +
        '<p>Subtracting a negative works the same way: −(−2ba) = +2ba. So ' + E('-3ab - (-2ba)', { inline: true }) + ' = −3ab + 2ab = −ab.</p>';
    }, checks: [
      { type: 'expr', verb: 'Simplify', prob: '5ab + 3ba - 2' },
      { type: 'expr', verb: 'Simplify', prob: '(5x + y) - (2x - 3y)' }
    ] }
  ],
  dist: [
    { title: 'Brackets mean groups', html: function () {
      return '<p>A number right in front of brackets means <b>multiply</b>. ' + E('3(x + 4)', { inline: true }) + ' means "3 groups of (x + 4)".</p>' +
        tiles([[['x', 1], ['1', 4]], [['x', 1], ['1', 4]], [['x', 1], ['1', 4]]], 'Three rows, each one x-tile and four 1-tiles.') +
        '<p>Count the tiles: 3 x-tiles and 12 one-tiles. So ' + E('3(x + 4)', { inline: true }) + ' = ' + E('3x + 12', { inline: true }) + '.</p>' +
        '<p>Writing an expression without its brackets like this is called <b>expanding</b>.</p>' +
        '<div class="callout">It works with plain numbers too. 3(10 + 4) = 3 × 14 = 42, and 3 × 10 + 3 × 4 = 30 + 12 = 42. Same answer.</div>';
    }, checks: [
      { type: 'expr', verb: 'Expand', prob: '2(x + 3)', extra: function () { return tiles([[['x', 1], ['1', 3]], [['x', 1], ['1', 3]]], 'Hint: 2 rows of (x + 3). Count each kind of tile.'); } }
    ] },
    { title: 'Multiply every term inside', html: function () {
      return '<p>Drawing tiles every time is slow. Here\'s the shortcut: the number outside the brackets multiplies <b>every</b> term inside. Follow the arrows.</p>' +
        '<div class="demo">' + E('5(x + 2)', { arrows: true }) + '</div>' +
        '<div class="sl">' + facHTML(T(5)) + ' × ' + tHTML(x1, 'paren') + ' = ' + tHTML(X(5, 'x'), 'first') + '</div>' +
        '<div class="sl">' + facHTML(T(5)) + ' × ' + tHTML(T(2), 'paren') + ' = ' + tHTML(T(10), 'first') + '</div>' +
        '<div class="eqline">' + E('5(x + 2)', { sm: true }) + '<span class="eq">=</span>' + E('5x + 10', { sm: true }) + '</div>' +
        '<p>An <b>area model</b> shows the same thing. A rectangle that is 5 tall and (x + 2) wide has area 5 × x plus 5 × 2.</p>' +
        area(T(5), [x1, T(2)]) +
        '<p>This is the <b>distributive property</b>: the outside number is distributed (handed out) to every term inside.</p>';
    }, checks: [
      { type: 'fill', q: function () { return 'Expand ' + E('4(x + 7)', { inline: true }) + ' one step at a time.'; }, blanks: [
        { label: function () { return facHTML(T(4)) + ' × ' + tHTML(x1, 'paren') + ' ='; }, ans: '4x', hint: 'Multiply the number by x: 4 × x is written 4x.' },
        { label: function () { return facHTML(T(4)) + ' × ' + tHTML(T(7), 'paren') + ' ='; }, ans: '28', hint: '4 × 7 = ?' },
        { label: function () { return 'So ' + E('4(x + 7)', { inline: true }) + ' ='; }, ans: '4x+28', hint: 'Put your two products together with a + between them.' }] }
    ] },
    { title: 'The most common mistake', html: function () {
      return '<p>Sam expanded ' + E('6(x + 5)', { inline: true }) + ' and wrote <span class="wrongans">6x + 5</span>.</p>' +
        '<div class="demo">' + E('6(x + 5)', { arrows: true }) + '</div>';
    }, checks: [
      { type: 'mc', q: function () { return 'What went wrong?'; }, opts: [
        { h: 'Sam forgot to multiply the 5 by 6.', ok: true, fb: 'Yes. The 6 has to multiply every term. 6 × 5 = 30, so the answer is 6x + 30. Check with x = 1: 6(1 + 5) = 36 and 6(1) + 30 = 36. They match.' },
        { h: 'Sam should have added 6 + 5.', fb: 'A number right before brackets means multiply, not add.' },
        { h: 'Nothing. It\'s correct.', fb: 'Test it with x = 1: 6(1 + 5) = 6 × 6 = 36, but 6(1) + 5 = 11. They don\'t match, so something is wrong.' },
        { h: 'The answer should be 11x.', fb: 'That combines unlike terms, and the 5 still hasn\'t been multiplied by 6.' }] },
      { type: 'expr', verb: 'Expand', prob: '3(x + 9)' }
    ] },
    { title: 'Coefficients and subtraction inside', html: function () {
      return '<p>Expand ' + E('4(2x - 3)', { inline: true }) + '.</p>' +
        '<p>Think of the subtraction as adding a negative: 2x − 3 is 2x + (−3). That keeps the minus sign attached to the 3.</p>' +
        area(T(4), [X(2, 'x'), T(-3)]) +
        '<div class="sl">' + facHTML(T(4)) + ' × ' + tHTML(X(2, 'x'), 'paren') + ' = ' + tHTML(X(8, 'x'), 'first') + '<span class="cap">multiply the numbers (4 × 2), keep the x</span></div>' +
        '<div class="sl">' + facHTML(T(4)) + ' × ' + tHTML(T(-3), 'paren') + ' = ' + tHTML(T(-12), 'first') + '<span class="cap">positive × negative = negative</span></div>' +
        '<div class="eqline">' + E('4(2x - 3)', { sm: true }) + '<span class="eq">=</span>' + E('8x - 12', { sm: true }) + '</div>';
    }, checks: [
      { type: 'expr', verb: 'Expand', prob: '3(5x - 2)' }
    ] },
    { title: 'Sign rules for multiplying', html: function () {
      return '<p>Next, negatives will show up outside the brackets. Here\'s a quick refresher on multiplying positive and negative numbers.</p>' +
        '<div class="tablewrap"><table class="signtable"><tbody>' +
        '<tr><td>positive × positive = <b class="yes">positive</b></td><td>3 × 4 = 12</td></tr>' +
        '<tr><td>negative × negative = <b class="yes">positive</b></td><td>(−3) × (−4) = 12</td></tr>' +
        '<tr><td>positive × negative = <b class="no">negative</b></td><td>3 × (−4) = −12</td></tr>' +
        '<tr><td>negative × positive = <b class="no">negative</b></td><td>(−3) × 4 = −12</td></tr></tbody></table></div>' +
        '<div class="callout"><b>Short version:</b> same signs give a positive. Different signs give a negative.</div>';
    }, checks: [
      { type: 'mc', q: function () { return 'What is (−4) × (−3)?'; }, opts: [
        { h: '12', ok: true, fb: 'Right. Same signs, so the answer is positive.' }, { h: '−12', fb: 'Both numbers are negative. Same signs give a positive.' },
        { h: '−7', fb: 'That\'s adding. Here we multiply: 4 × 3, then decide the sign.' }, { h: '7', fb: 'That\'s adding. Here we multiply: 4 × 3, then decide the sign.' }] },
      { type: 'mc', q: function () { return 'What is 5 × (−2)?'; }, opts: [
        { h: '10', fb: 'One positive and one negative: different signs give a negative.' }, { h: '−10', ok: true, fb: 'Yes. Different signs, so the answer is negative.' },
        { h: '3', fb: 'That\'s adding. Multiply 5 × 2, then decide the sign.' }, { h: '−7', fb: 'Multiply 5 × 2 = 10, then decide the sign.' }] }
    ] },
    { title: 'A negative outside the brackets', html: function () {
      return '<p>In ' + E('-2(x - 5)', { inline: true }) + ', the number outside is <b>−2</b>. The negative sign is part of it, so −2 multiplies every term inside.</p>' +
        '<div class="demo">' + E('-2(x - 5)', { arrows: true }) + '</div>' +
        '<div class="sl">' + facHTML(T(-2)) + ' × ' + tHTML(x1, 'paren') + ' = ' + tHTML(X(-2, 'x'), 'first') + '</div>' +
        '<div class="sl">' + facHTML(T(-2)) + ' × ' + tHTML(T(-5), 'paren') + ' = ' + tHTML(T(10), 'signed') + '<span class="cap">negative × negative = positive</span></div>' +
        '<div class="eqline">' + E('-2(x - 5)', { sm: true }) + '<span class="eq">=</span>' + E('-2x + 10', { sm: true }) + '</div>' +
        '<div class="callout warn"><b>Common mistake:</b> writing −2x − 10. That happens when the negative only reaches the first term.</div>' +
        '<p>A minus sign on its own in front of brackets means <b>−1</b>. Every sign inside flips:</p>' +
        '<div class="demo">' + E('-(x + 6)', { arrows: true }) + '</div>' +
        '<div class="eqline"><span class="eq">=</span>' + E('-x - 6', { sm: true }) + '</div>';
    }, checks: [
      { type: 'fill', q: function () { return 'Expand ' + E('-3(x - 4)', { inline: true }) + ' one step at a time.'; }, blanks: [
        { label: function () { return facHTML(T(-3)) + ' × ' + tHTML(x1, 'paren') + ' ='; }, ans: '-3x', hint: 'Negative × positive = negative.' },
        { label: function () { return facHTML(T(-3)) + ' × ' + tHTML(T(-4), 'paren') + ' ='; }, ans: '12', hint: 'Negative × negative = positive.' },
        { label: function () { return 'So ' + E('-3(x - 4)', { inline: true }) + ' ='; }, ans: '-3x+12', hint: 'Write both products. The second one is positive, so it gets a + sign.' }] },
      { type: 'expr', verb: 'Expand', prob: '-(x - 8)' }
    ] },
    { title: 'A variable outside the brackets', html: function () {
      return '<p>The multiplier outside the brackets can be a variable. ' + E('x(x + 3)', { inline: true }) + ' means x × (x + 3).</p>' +
        area(x1, [x1, T(3)]) +
        '<div class="sl">' + facHTML(x1) + ' × ' + tHTML(x1, 'paren') + ' = ' + tHTML(T(1, { x: 2 }), 'first') + '</div>' +
        '<div class="sl">' + facHTML(x1) + ' × ' + tHTML(T(3), 'paren') + ' = ' + tHTML(X(3, 'x'), 'first') + '<span class="cap">we write the number first: 3x</span></div>' +
        '<div class="eqline">' + E('x(x + 3)', { sm: true }) + '<span class="eq">=</span>' + E('x^2 + 3x', { sm: true }) + '</div>' +
        '<div class="callout warn"><b>Common mistake:</b> x × x = <b>x²</b>, not 2x. 2x means x + x. Think of a square with side length x: its area is x × x = x².</div>' +
        '<p>With a coefficient: in ' + E('2x(x - 4)', { inline: true }) + ', 2x × x = 2x², and 2x × (−4) = −8x. Both terms get the x.</p>';
    }, checks: [
      { type: 'expr', verb: 'Expand', prob: 'x(x + 5)' },
      { type: 'expr', verb: 'Expand', prob: '3x(x - 2)' }
    ] },
    { title: 'Expand, then simplify', html: function () {
      return '<p>Some questions have more than one bracket. Expand each bracket first, then collect like terms (the skills from Module 1).</p>' +
        '<div class="demo">' + E('2(x + 3) + 4(x - 1)', { arrows: true }) + '</div>' +
        '<div class="eqline"><span class="eq">=</span>' + E('2x + 6 + 4x - 4', { chips: true, sm: true }) + '</div>' +
        '<div class="sl">' + tHTML(X(2, 'x'), 'first') + ' ' + tHTML(X(4, 'x'), 'mid') + ' = ' + tHTML(X(6, 'x'), 'first') + '<span class="cap">x-terms</span></div>' +
        '<div class="sl">' + tHTML(T(6), 'first') + ' ' + tHTML(T(-4), 'mid') + ' = ' + tHTML(T(2), 'first') + '<span class="cap">constants</span></div>' +
        '<div class="eqline"><span class="eq">Answer:</span>' + E('6x + 2', { sm: true }) + '</div>' +
        '<div class="callout warn"><b>Watch the minus before a bracket.</b> In ' + E('5 - 3(x - 2)', { inline: true }) + ', the minus belongs to the 3, so multiply by <b>−3</b>: −3x + 6. Then 5 + 6 = 11, so the answer is −3x + 11. Don\'t do 5 − 3 first. Multiplying comes before subtracting.</div>' +
        '<div class="demo">' + E('5 - 3(x - 2)', { arrows: true }) + '</div>';
    }, checks: [
      { type: 'expr', verb: 'Expand and simplify', prob: '3(x + 2) + 2(x - 5)' },
      { type: 'expr', verb: 'Expand and simplify', prob: '10 - 2(x + 3)' }
    ] }
  ]
};

/* ================= modules + state ================= */
var MODS = {
  like: { num: 1, name: 'Collecting Like Terms', short: 'Like terms', sample: '5x - 8 - 7x + 3',
    desc: 'Spot terms that match, keep each sign with its term, and combine them into a simpler expression.',
    levels: ['Positive terms, one variable', 'Subtraction, negatives, two variables', 'Exponents, xy = yx, subtracting brackets'] },
  dist: { num: 2, name: 'The Distributive Property', short: 'Distributive', sample: '-2(x - 5)',
    desc: 'Multiply the number outside the brackets by every term inside, including negatives and variables.',
    levels: ['A positive number outside', 'Negatives and variables outside', 'Expand, then simplify'] }
};
var LEVELS = ['Mild', 'Medium', 'Spicy'];
var STORE = 'algebra-tuneup-v1';
function freshMod() { return { step: 0, maxStep: 0, tutDone: false, level: 0, unlocked: 0, pips: [0, 0, 0], mastered: [false, false, false], errors: {}, solved: 0, firstTry: 0 }; }
var state = { mods: { like: freshMod(), dist: freshMod() } };
try { var saved = JSON.parse(localStorage.getItem(STORE)); if (saved && saved.mods && saved.mods.like && saved.mods.dist) state = saved; } catch (e) {}
function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }
function freshRT() { return { problem: null, gen: null, attempts: 0, done: false, scaffold: false, guided: false, usedScaffold: false, struggle: 0, missRun: 0, recent: [], color: null, lastStr: null, target: null, fbHTML: '' }; }
var RT = { like: freshRT(), dist: freshRT() };
var tstate = {};
var view = { mod: null, tab: 'learn' };
var resetArmed = false;

/* ================= views ================= */
function headerHTML() {
  return '<header class="top"><button class="brand" data-act="home" aria-label="Algebra Tune-Up home"><span class="logo"><span class="lf">3</span>(<span class="lx">x</span> + <span class="lk">4</span>)</span>Algebra Tune-Up</button>' +
    '<nav class="topnav" aria-label="Modules"><button data-act="home" aria-current="' + (!view.mod) + '">Home</button>' +
    ['like', 'dist'].map(function (id) { return '<button data-act="open" data-mod="' + id + '" aria-current="' + (view.mod === id) + '">' + MODS[id].short + '</button>'; }).join('') + '</nav></header>';
}
function homeHTML() {
  return '<section class="hero"><div><p class="eyebrow">MTH1W · Algebra skills</p><h1>Fix the gaps in your algebra, one step at a time.</h1>' +
    '<p class="lede">Two short modules. Each starts with a guided lesson that explains everything from the beginning. Then you practise, and the questions only get harder when you\'re ready.</p></div>' +
    '<div class="panel hero-demo"><div class="eqline">' + E('3(x + 4)', { arrows: true }) + '<span class="eq">=</span>' + E('3x + 12') + '</div><p class="cap">The 3 multiplies <b>every</b> term inside the brackets. Same colour = same kind of term.</p></div></section>' +
    '<section class="mods">' + ['like', 'dist'].map(modCardHTML).join('') + '</section>' +
    '<section class="how"><div><span class="n">1</span><h3>Learn</h3><p class="muted">A guided lesson with quick checks. Each check tells you right away whether you\'ve got it and why.</p></div>' +
    '<div><span class="n">2</span><h3>Practise</h3><p class="muted">Mild, Medium, then Spicy. Get 5 right on the first try to fill the meter and unlock the next level.</p></div>' +
    '<div><span class="n">3</span><h3>Fix mistakes</h3><p class="muted">When an answer is wrong, the app names the mistake and shows you where to look. You can break any question into steps.</p></div></section>' +
    teacherHTML();
}
function modCardHTML(id) {
  var M = MODS[id], ms = state.mods[id], n = TUT[id].length;
  var lesson = ms.tutDone ? '<span class="yes"><b>Complete</b></span>' : ms.maxStep > 0 ? 'Step ' + (ms.step + 1) + ' of ' + n : 'Not started';
  var lvl = ms.mastered[2] ? '<span class="yes"><b>All levels mastered</b></span>' : LEVELS[ms.level] + ' · ' + ms.pips[ms.level] + ' / 5';
  return '<article class="panel modcard"><div><p class="eyebrow">Module ' + M.num + '</p><h2>' + M.name + '</h2></div>' +
    '<div class="ex">' + E(M.sample, { arrows: id === 'dist', chips: id === 'like' }) + '</div>' +
    '<p class="desc">' + M.desc + '</p>' +
    '<div class="status"><div class="row"><span>Lesson</span><span>' + lesson + '</span></div><div class="row"><span>Practice</span><span>' + lvl + '</span></div></div>' +
    '<div class="btnrow"><button class="btn primary" data-act="open" data-mod="' + id + '" data-tab="learn">' + (ms.tutDone ? 'Review lesson' : ms.maxStep > 0 ? 'Continue lesson' : 'Start lesson') + '</button>' +
    '<button class="btn" data-act="open" data-mod="' + id + '" data-tab="practice">Practise</button></div></article>';
}
function teacherHTML() {
  var rows = ['like', 'dist'].map(function (id) {
    return MODS[id].levels.map(function (d, L) { return '<tr><td>' + (L === 0 ? '<b>' + MODS[id].short + '</b>' : '') + '</td><td>' + LEVELS[L] + '</td><td>' + d + '</td></tr>'; }).join('');
  }).join('');
  var mis = ['firstOnly', 'signDrop', 'partialVar', 'xx', 'leftSub', 'absAll', 'invisOne', 'unlike', 'expAdd', 'notSimplified'].map(function (k) { return '<li><b>' + MISC[k].name + ':</b> ' + MISC[k].tip + '</li>'; }).join('');
  return '<details class="panel teacher"><summary>For teachers</summary><div class="tgrid">' +
    '<div><h3>Curriculum fit</h3><p class="muted" style="margin-top:6px">Built for MTH1W expectation <b>C1.4</b> (simplify algebraic expressions by applying properties of operations), using its examples: 2(x + 4), 3x² + x − 2x² + 5x, −3ab − (−2ba), (2x + 4y) − (x − y) and x(x + 2) + 3(x² + 2x − 5). Lessons use algebra tiles, area models and substitution checks (C1.3).</p>' +
    '<h3 style="margin-top:16px">How levelling works</h3><ul><li>A first-try correct answer fills one pip. Five pips unlocks the next level.</li><li>Viewing the full solution removes one pip. Correcting an answer on a retry leaves the meter alone.</li><li>After two problems in a row that weren\'t first-try correct, the next problem opens in guided (step-by-step) mode.</li><li>After three, students are offered a step back to the previous level.</li><li>Problem types are weighted toward the student\'s most recent mistakes.</li></ul></div>' +
    '<div><h3>Levels</h3><div class="tablewrap"><table><tbody>' + rows + '</tbody></table></div>' +
    '<h3 style="margin-top:16px">Mistakes it recognises</h3><ul>' + mis + '</ul></div></div>' +
    '<p class="muted" style="margin-top:16px">Progress is saved in this browser on this device only. Students should use the same device and browser each time. Their "Patterns to watch" panel on the Practise tab is a quick check-in tool.</p>' +
    '<div class="btnrow" style="margin-top:12px"><button class="btn small" data-act="unlockall">Unlock all levels</button><button class="btn small" data-act="reset">' + (resetArmed ? 'Tap again to erase all progress' : 'Reset all progress') + '</button></div></details>';
}
function moduleHTML(id) {
  var M = MODS[id];
  return '<div class="modhead"><div><p class="eyebrow">Module ' + M.num + '</p><h1>' + M.name + '</h1></div>' +
    '<div class="tabs" role="tablist"><button role="tab" data-act="tab" data-tab="learn" aria-selected="' + (view.tab === 'learn') + '">Learn</button><button role="tab" data-act="tab" data-tab="practice" aria-selected="' + (view.tab === 'practice') + '">Practise</button></div></div>' +
    (view.tab === 'learn' ? learnHTML(id) : practiceHTML(id));
}

/* ---------- lesson ---------- */
function ckey(id, s, c) { return id + ':' + s + ':' + c; }
function stepDone(id, s) {
  var ms = state.mods[id];
  if (ms.maxStep > s || ms.tutDone) return true;
  return TUT[id][s].checks.every(function (_, ci) { return tstate[ckey(id, s, ci)] && tstate[ckey(id, s, ci)].done; });
}
function learnHTML(id) {
  var ms = state.mods[id], steps = TUT[id], i = ms.step, st = steps[i];
  var dots = steps.map(function (s, j) {
    var cls = j === i ? 'cur' : (j < ms.maxStep || ms.tutDone) ? 'done' : '';
    var locked = j > ms.maxStep && !ms.tutDone;
    return '<button class="dot ' + cls + '" data-act="goto" data-step="' + j + '"' + (locked ? ' disabled' : '') + ' aria-label="Step ' + (j + 1) + ': ' + s.title + '">' + (j + 1) + '</button>';
  }).join('');
  return '<div class="dots" aria-label="Lesson steps">' + dots + '</div><article class="panel lesson" id="lesson"><div><p class="eyebrow">Step ' + (i + 1) + ' of ' + steps.length + '</p><h2>' + st.title + '</h2></div>' +
    '<div class="lesson-body">' + st.html() + '</div>' + st.checks.map(function (c, ci) { return checkHTML(id, i, ci, c); }).join('') +
    '<div class="lesson-nav"><button class="btn" data-act="prev"' + (i === 0 ? ' disabled' : '') + '>Back</button>' +
    '<button class="btn primary" id="nextbtn" data-act="next"' + (stepDone(id, i) ? '' : ' disabled') + '>' + (i === steps.length - 1 ? 'Start practising' : 'Next') + '</button></div></article>';
}
function checkHTML(id, s, ci, c) {
  var k = ckey(id, s, ci), ts = tstate[k] || (tstate[k] = { done: false, tries: 0 });
  var label = c.type === 'expr' || c.type === 'fill' ? 'Try it' : 'Check';
  var head = '<div class="check' + (ts.done ? ' done' : '') + '" id="ck-' + k.replace(/:/g, '-') + '">';
  var attrs = ' data-m="' + id + '" data-s="' + s + '" data-c="' + ci + '"';
  if (c.type === 'mc') {
    return head + '<p class="q"><span class="qlabel">' + label + '</span>' + c.q() + '</p><div class="opts">' + c.opts.map(function (o, oi) {
      return '<button class="opt" data-act="mc"' + attrs + ' data-o="' + oi + '">' + o.h + '</button>';
    }).join('') + '</div><div class="cfb" aria-live="polite"></div></div>';
  }
  if (c.type === 'multi') {
    return head + '<p class="q"><span class="qlabel">' + label + '</span>' + c.q() + '</p><div class="opts' + (ts.done ? '' : ' mono') + '">' + c.opts.map(function (o, oi) {
      return '<button class="opt" data-act="mtoggle" aria-pressed="false" data-o="' + oi + '">' + E(o.s) + '</button>';
    }).join('') + '</div><div class="btnrow"><button class="btn small" data-act="mcheck"' + attrs + '>Check</button></div><div class="cfb" aria-live="polite"></div></div>';
  }
  if (c.type === 'expr') {
    return head + '<p class="q"><span class="qlabel">' + label + '</span>' + c.verb + ': ' + E(c.prob, { inline: true }) + '</p>' + (c.extra ? c.extra() : '') +
      answerBox('t-' + k.replace(/:/g, '-'), 'tcheck', attrs) + '<div class="cfb" aria-live="polite"></div></div>';
  }
  if (c.type === 'fill') {
    return head + '<p class="q"><span class="qlabel">' + label + '</span>' + c.q() + '</p>' + c.blanks.map(function (b, bi) {
      return '<div class="srow"><span class="lab">' + b.label() + '</span><input id="fb-' + k.replace(/:/g, '-') + '-' + bi + '" aria-label="Blank ' + (bi + 1) + '" autocomplete="off" autocapitalize="off" spellcheck="false"><span class="tip" hidden></span></div>';
    }).join('') + '<div class="btnrow"><button class="btn small" data-act="fcheck"' + attrs + '>Check</button></div><div class="cfb" aria-live="polite"></div></div>';
  }
  return '';
}
function answerBox(k, act, attrs) {
  var keys = [['x', 'x', ''], ['x²', 'x^2', ''], ['y', 'y', ''], ['+', '+', ' op'], ['−', '-', ' op']];
  return '<div class="ansbox"><div class="ansrow"><label class="sr" for="in-' + k + '">Your answer</label>' +
    '<input class="ans" id="in-' + k + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Type your answer">' +
    '<button class="btn primary" data-act="' + act + '"' + (attrs || '') + '>Check</button></div>' +
    '<div class="keys">' + keys.map(function (kk) { return '<button class="key' + kk[2] + '" data-act="key" data-for="in-' + k + '" data-ins="' + kk[1] + '" aria-label="Insert ' + kk[0] + '">' + kk[0] + '</button>'; }).join('') + '</div>' +
    '<div class="preview" id="pv-' + k + '"></div></div>';
}

/* ---------- practice ---------- */
function pickGen(id, L) {
  var rt = RT[id], gens = GEN[id][L];
  var recent = [].concat.apply([], rt.recent.slice(0, 2));
  var pool = gens.filter(function (g) { return !rt.gen || g.id !== rt.gen.id; });
  var targeted = pool.filter(function (g) { return g.tags.some(function (t) { return recent.indexOf(t) >= 0; }); });
  rt.target = null;
  if (targeted.length && Math.random() < 0.65) {
    var g = targeted[Math.floor(Math.random() * targeted.length)];
    var tag = g.tags.find(function (t) { return recent.indexOf(t) >= 0; }) || g.tags[0];
    rt.target = MISC[miscId(tag)] ? MISC[miscId(tag)].name : null;
    return g;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
function newProblem(id, same) {
  var ms = state.mods[id], rt = RT[id], L = ms.level;
  var gen = same && rt.gen ? rt.gen : pickGen(id, L);
  if (same) rt.target = null;
  var p = generate(gen, rt.lastStr) || generate(GEN[id][L][0]);
  p.verb = VERB[id][L];
  rt.problem = p; rt.gen = gen; rt.lastStr = p.str;
  rt.attempts = 0; rt.done = false; rt.fbHTML = '';
  rt.guided = rt.struggle >= 2; rt.scaffold = rt.guided; rt.usedScaffold = rt.guided;
  if (rt.color === null) rt.color = L < 2;
}
function meterHTML(id) {
  var ms = state.mods[id], L = ms.level, n = ms.pips[L];
  var note = ms.mastered[L] ? (L < 2 ? LEVELS[L] + ' mastered. Keep practising or move up.' : 'Spicy mastered. Module complete!') : n + ' / 5 to ' + (L < 2 ? 'unlock ' + LEVELS[L + 1] : 'master Spicy');
  var pips = ''; for (var i = 0; i < 5; i++) pips += '<span class="pip' + (i < n ? ' on' : '') + '"></span>';
  return '<div class="meter l' + L + '" id="meter"><b>' + pepper(L + 1) + ' ' + LEVELS[L] + '</b><span class="pips" role="img" aria-label="' + n + ' of 5">' + pips + '</span><span class="mnote">' + note + '</span></div>';
}
function levelsHTML(id) {
  var ms = state.mods[id];
  return '<div class="levels" role="group" aria-label="Level">' + LEVELS.map(function (name, L) {
    var locked = L > ms.unlocked;
    var st = ms.mastered[L] ? 'Mastered' : locked ? 'Locked' : MODS[id].levels[L];
    return '<button class="lvl l' + L + '" data-act="level" data-l="' + L + '" aria-current="' + (ms.level === L) + '"' + (locked ? ' disabled title="Fill the ' + LEVELS[L - 1] + ' meter to unlock"' : '') + '><span class="ln">' + pepper(L + 1) + name + '</span><small>' + st + '</small></button>';
  }).join('') + '</div>';
}
function bannerHTML(id) {
  var rt = RT[id], ms = state.mods[id], out = '';
  if (rt.guided && !rt.done) out += '<div class="banner"><span><b>Guided problem.</b> Let\'s slow down and do this one step by step. Fill in the steps below, then write the full answer.</span></div>';
  if (rt.missRun >= 3 && ms.level > 0) out += '<div class="banner"><span>These are tough. A few ' + LEVELS[ms.level - 1] + ' problems can help it click.</span><button class="btn small" data-act="level" data-l="' + (ms.level - 1) + '">Practise ' + LEVELS[ms.level - 1] + '</button></div>';
  return out;
}
function actionsHTML(id) {
  var rt = RT[id];
  if (rt.done) return '<div class="btnrow"><button class="btn primary" data-act="nextp">Next problem</button><button class="btn" data-act="similar">Another one like this</button></div>';
  var b = '';
  if (!rt.scaffold && scaffoldSteps(rt.problem).length) b += '<button class="btn" data-act="scaffold">Break it down</button>';
  if (rt.attempts >= 2) b += '<button class="btn" data-act="solution">Show the solution</button>';
  return b ? '<div class="btnrow">' + b + '</div>' : '';
}
function railHTML(id) {
  var ms = state.mods[id];
  var errs = Object.keys(ms.errors).filter(function (k) { return MISC[k]; }).sort(function (a, b) { return ms.errors[b] - ms.errors[a]; }).slice(0, 5);
  var list = errs.length ? '<ul class="errlist">' + errs.map(function (k) { return '<li><span class="en">' + MISC[k].name + '<span class="cnt">×' + ms.errors[k] + '</span></span><small>' + MISC[k].tip + '</small></li>'; }).join('') + '</ul>' :
    '<p class="muted" style="margin-top:6px;font-size:.95rem">Nothing yet. When a mistake happens, it gets named here so you know what to watch for.</p>';
  return '<section class="panel"><h3>Patterns to watch</h3>' + list + '</section>' +
    '<section class="panel"><h3>So far</h3><div class="stats" style="margin-top:8px"><div><b>' + ms.solved + '</b><span>solved</span></div><div><b>' + ms.firstTry + '</b><span>first try</span></div></div></section>' +
    '<section class="panel"><h3>How levelling works</h3><ul><li>Right on the first try: fills one pip.</li><li>Fill 5 pips to unlock the next level.</li><li>Fixing a mistake on a retry: no change.</li><li>Showing the solution: empties one pip.</li></ul></section>';
}
function practiceHTML(id) {
  var ms = state.mods[id], rt = RT[id];
  if (!rt.problem) newProblem(id);
  var p = rt.problem;
  var tutNote = !ms.tutDone ? '<div class="banner"><span>New to this? The lesson explains everything you\'ll see here.</span><button class="btn small" data-act="tab" data-tab="learn">Go to the lesson</button></div>' : '';
  return '<div class="grid2"><div class="work">' + tutNote + levelsHTML(id) +
    '<section class="panel prob' + (rt.color ? '' : ' mono') + '" id="prob">' +
    '<div class="probtop">' + meterHTML(id) + '<label class="toggle"><input type="checkbox" id="colour"' + (rt.color ? ' checked' : '') + '> Colour hints</label></div>' +
    '<div id="banner">' + bannerHTML(id) + '</div>' +
    '<div><p class="verb">' + p.verb + '</p>' + (rt.target ? '<p class="target">Practice target: <b>' + rt.target + '</b></p>' : '') + '</div>' +
    '<div>' + E(p.str, { arrows: true, chips: id === 'like' && !p.parts.some(function (q) { return q.kind === 'group'; }) }) + '</div>' +
    answerBox('p', 'pcheck') +
    '<div id="actions">' + actionsHTML(id) + '</div>' +
    '<div id="pfb" aria-live="polite">' + rt.fbHTML + '</div>' +
    '<div id="scaf">' + (rt.scaffold && !rt.done ? scaffoldHTML(p) : '') + '</div>' +
    '</section></div><aside class="rail" id="rail">' + railHTML(id) + '</aside></div>';
}
function refreshPractice(id, popPip) {
  var rt = RT[id];
  $('#meter').outerHTML = meterHTML(id);
  $('#actions').innerHTML = actionsHTML(id);
  $('#pfb').innerHTML = rt.fbHTML;
  $('#banner').innerHTML = bannerHTML(id);
  $('#rail').innerHTML = railHTML(id);
  if (rt.done) { $('#in-p').disabled = true; $$('#prob .ansbox button').forEach(function (b) { b.disabled = true; }); $('#scaf').innerHTML = ''; }
  if (popPip) { var on = $$('#meter .pip.on'); if (on.length) on[on.length - 1].classList.add('pop'); }
  requestAnimationFrame(drawArrows);
}

/* ---------- render ---------- */
function render() {
  $('#app').innerHTML = headerHTML() + (view.mod ? moduleHTML(view.mod) : homeHTML());
  requestAnimationFrame(drawArrows);
}
function go(mod, tab) {
  view.mod = mod; if (tab) view.tab = tab;
  resetArmed = false;
  try { history.replaceState(null, '', mod ? '#' + mod + '-' + view.tab : '#home'); } catch (e) {}
  render(); window.scrollTo(0, 0);
}
function showModal(html) {
  closeModal();
  var d = document.createElement('div');
  d.className = 'modal-back'; d.id = 'modal';
  d.innerHTML = '<div class="panel modal" role="dialog" aria-modal="true">' + html + '</div>';
  document.body.appendChild(d);
  var b = d.querySelector('button'); if (b) b.focus();
}
function closeModal() { var m = $('#modal'); if (m) m.remove(); }

/* ================= actions ================= */
function practiceCheck(id) {
  var rt = RT[id], ms = state.mods[id], L = ms.level;
  if (rt.done) return;
  var d = diagnose(rt.problem, $('#in-p').value);
  if (d.status === 'parse') { rt.fbHTML = feedbackHTML(d, rt.problem); refreshPractice(id); return; }
  rt.attempts++;
  var levelUp = false, pop = false;
  if (d.status === 'correct') {
    rt.done = true; ms.solved++;
    var independent = rt.attempts === 1 && !rt.usedScaffold;
    var msg;
    if (independent) {
      ms.firstTry++; ms.pips[L] = Math.min(5, ms.pips[L] + 1); pop = true;
      rt.struggle = 0; rt.missRun = 0;
      msg = ms.mastered[L] ? 'Right on the first try.' : 'Right on the first try. That fills a pip.';
      if (ms.pips[L] >= 5 && !ms.mastered[L]) { ms.mastered[L] = true; ms.unlocked = Math.max(ms.unlocked, Math.min(2, L + 1)); levelUp = true; }
    } else {
      if (rt.guided) rt.struggle = 1; else rt.struggle++;
      rt.missRun++;
      msg = rt.usedScaffold ? 'Nice work using the steps. Try the next one on your own to fill a pip.' : 'You found and fixed your mistake. That\'s exactly how this gets easier. The next first-try answer fills a pip.';
    }
    var stuTerms = d.terms, sorted = sortTerms(stuTerms);
    var orderTip = stuTerms.length > 1 && stuTerms.some(function (t, i) { return t !== sorted[i]; }) ? '<p class="muted">Tip: we usually write the highest power first and constants last: ' + ansHTML(rt.problem) + '. Your order is still correct.</p>' : '';
    rt.fbHTML = fbBox('ok', ['Correct!', 'Yes, that\'s it.', 'Exactly right.', 'Nailed it.'][Math.floor(Math.random() * 4)], '<p>' + ansHTML(rt.problem) + '</p><p>' + msg + '</p>' + orderTip);
  } else {
    var ids = issueIds(d);
    ids.forEach(function (x) { ms.errors[x] = (ms.errors[x] || 0) + 1; });
    rt.recent.unshift(d.status === 'unsimplified' ? ['notSimplified'] : d.issues.map(function (x) { return miscId(x.id); }));
    rt.recent = rt.recent.slice(0, 4);
    var html = feedbackHTML(d, rt.problem);
    if (rt.attempts >= 3) {
      endWithSolution(id, html);
      save(); refreshPractice(id); return;
    }
    html += '<p class="muted" style="margin-top:8px">' + (rt.attempts === 1 ? 'Fix it and check again.' + (rt.scaffold ? ' Use the steps below if you need them.' : ' Stuck? Tap "Break it down".') : 'One more try, or look at the full solution.') + '</p>';
    rt.fbHTML = html;
  }
  save(); refreshPractice(id, pop);
  if (levelUp) setTimeout(function () { levelModal(id, L); }, 450);
}
function endWithSolution(id, prefix) {
  var rt = RT[id], ms = state.mods[id], L = ms.level;
  rt.done = true;
  var lost = ms.pips[L] > 0 && !ms.mastered[L];
  if (lost) ms.pips[L]--;
  if (rt.guided) rt.struggle = 1; else rt.struggle++;
  rt.missRun++;
  rt.fbHTML = (prefix || '') + solutionHTML(rt.problem) + '<p class="muted" style="margin-top:8px">Read through each step, then try another one' + (rt.struggle >= 2 ? '. The next problem will be guided step by step.' : '.') + '</p>';
}
function levelModal(id, L) {
  var other = id === 'like' ? 'dist' : 'like';
  if (L < 2) {
    showModal('<div style="--lc:var(--' + LEVELS[L + 1].toLowerCase() + ')">' + pepper(L + 2) + '</div><p class="big">Level up!</p><p>You got 5 right on the first try at <b>' + LEVELS[L] + '</b>. <b>' + LEVELS[L + 1] + '</b> is unlocked: ' + MODS[id].levels[L + 1].toLowerCase() + '.</p>' +
      '<div class="btnrow" style="justify-content:center"><button class="btn primary" data-act="golevel" data-l="' + (L + 1) + '">Go to ' + LEVELS[L + 1] + '</button><button class="btn" data-act="closemodal">Stay on ' + LEVELS[L] + '</button></div>');
  } else {
    showModal('<p class="big">Module complete!</p><p>You mastered all three levels of <b>' + MODS[id].name + '</b>.</p>' +
      '<div class="btnrow" style="justify-content:center">' + (state.mods[other].mastered[2] ? '' : '<button class="btn primary" data-act="open" data-mod="' + other + '">Try ' + MODS[other].name + '</button>') + '<button class="btn" data-act="closemodal">Keep practising</button></div>');
  }
}
function setLevel(id, L) {
  var ms = state.mods[id], rt = RT[id];
  if (L > ms.unlocked) return;
  ms.level = L; rt.problem = null; rt.gen = null; rt.recent = []; rt.color = null; rt.struggle = 0; rt.missRun = 0;
  save(); render();
}
function markCheckDone(id, s, ci) {
  var k = ckey(id, s, ci);
  tstate[k].done = true;
  var el = document.getElementById('ck-' + k.replace(/:/g, '-'));
  if (el) el.classList.add('done');
  if (stepDone(id, s)) { var nb = $('#nextbtn'); if (nb) nb.disabled = false; }
}
function tcheckCtx(b) { var id = b.dataset.m, s = +b.dataset.s, ci = +b.dataset.c; return { id: id, s: s, ci: ci, c: TUT[id][s].checks[ci], k: ckey(id, s, ci), box: b.closest('.check') }; }

var ACT = {
  home: function () { go(null); },
  open: function (b) { closeModal(); go(b.dataset.mod, b.dataset.tab || (state.mods[b.dataset.mod].tutDone ? 'practice' : 'learn')); },
  tab: function (b) { go(view.mod, b.dataset.tab); },
  goto: function (b) { state.mods[view.mod].step = +b.dataset.step; save(); render(); $('#lesson').scrollIntoView({ block: 'start' }); },
  prev: function () { var ms = state.mods[view.mod]; if (ms.step > 0) { ms.step--; save(); render(); window.scrollTo(0, 0); } },
  next: function () {
    var id = view.mod, ms = state.mods[id], n = TUT[id].length;
    if (!stepDone(id, ms.step)) return;
    if (ms.step >= n - 1) { ms.tutDone = true; ms.maxStep = n - 1; save(); go(id, 'practice'); return; }
    ms.step++; ms.maxStep = Math.max(ms.maxStep, ms.step); save(); render(); window.scrollTo(0, 0);
  },
  mc: function (b) {
    var x = tcheckCtx(b), o = x.c.opts[+b.dataset.o], fbEl = x.box.querySelector('.cfb');
    if (o.ok) {
      b.classList.add('right'); $$('.opt', x.box).forEach(function (q) { q.disabled = true; });
      fbEl.innerHTML = fbBox('ok', 'Correct', '<p>' + o.fb + '</p>'); markCheckDone(x.id, x.s, x.ci);
    } else { b.classList.add('wrong'); b.disabled = true; fbEl.innerHTML = fbBox('bad', 'Not quite', '<p>' + o.fb + '</p>'); }
  },
  mtoggle: function (b) { if (b.disabled) return; var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); b.classList.toggle('sel', on); },
  mcheck: function (b) {
    var x = tcheckCtx(b), fbEl = x.box.querySelector('.cfb');
    var opts = $$('.opt', x.box), wrong = [], missed = 0;
    opts.forEach(function (el, i) { var sel = el.getAttribute('aria-pressed') === 'true', o = x.c.opts[i]; if (sel && !o.ok) wrong.push(o); if (!sel && o.ok) missed++; });
    if (!wrong.length && !missed) {
      opts.forEach(function (el, i) { el.disabled = true; if (x.c.opts[i].ok) el.classList.add('right'); });
      x.box.querySelector('.opts').classList.remove('mono');
      fbEl.innerHTML = fbBox('ok', 'Correct', '<p>5x, −x and 10x all have exactly one x, so they are like terms with 3x. Now that the colours are back on, notice they all share the same blue.</p>');
      markCheckDone(x.id, x.s, x.ci); return;
    }
    var msg = wrong.map(function (o) { return '<p>' + E(o.s, { inline: true }) + ': ' + o.fb + '</p>'; }).join('');
    if (missed) msg += '<p>You missed ' + (missed === 1 ? 'one' : missed) + '. Look for every term with exactly one x (remember −x has a coefficient of −1).</p>';
    fbEl.innerHTML = fbBox('bad', 'Not quite', msg);
  },
  tcheck: function (b) {
    var x = tcheckCtx(b), ts = tstate[x.k], inp = x.box.querySelector('.ans'), fbEl = x.box.querySelector('.cfb');
    if (ts.done) return;
    var p = makeProblem(x.c.prob), d = diagnose(p, inp.value);
    if (d.status === 'parse') { fbEl.innerHTML = feedbackHTML(d, p); return; }
    ts.tries++;
    if (d.status === 'correct') {
      fbEl.innerHTML = fbBox('ok', 'Correct', '<p>' + ansHTML(p) + '</p>');
      inp.disabled = true; markCheckDone(x.id, x.s, x.ci); return;
    }
    var html = feedbackHTML(d, p);
    if (ts.tries >= 2) html += '<div class="btnrow" style="margin-top:8px"><button class="btn small" data-act="tshow" data-m="' + x.id + '" data-s="' + x.s + '" data-c="' + x.ci + '">Show me how</button></div>';
    fbEl.innerHTML = html;
  },
  tshow: function (b) {
    var x = tcheckCtx(b), p = makeProblem(x.c.prob);
    x.box.querySelector('.cfb').innerHTML = solutionHTML(p) + '<p class="muted" style="margin-top:8px">You can move on. This idea will come up again in practice.</p>';
    var inp = x.box.querySelector('.ans'); if (inp) inp.disabled = true;
    markCheckDone(x.id, x.s, x.ci);
  },
  fcheck: function (b) {
    var x = tcheckCtx(b), ts = tstate[x.k], fbEl = x.box.querySelector('.cfb'), all = true;
    if (ts.done) return;
    ts.tries++;
    x.c.blanks.forEach(function (bl, bi) {
      var inp = x.box.querySelector('#fb-' + x.k.replace(/:/g, '-') + '-' + bi), tip = inp.parentNode.querySelector('.tip');
      var r = parseAnswer(inp.value), want = parseAnswer(bl.ans);
      inp.classList.remove('good', 'badv'); tip.hidden = true;
      var ok = !r.error && polyEq(combine(r.terms), combine(want.terms));
      if (ok) { inp.classList.add('good'); return; }
      all = false; inp.classList.add('badv'); tip.textContent = r.error && inp.value.trim() ? PARSE_MSG[r.error] : bl.hint; tip.hidden = false;
    });
    if (all) { fbEl.innerHTML = fbBox('ok', 'Correct', '<p>Every term inside got multiplied. That\'s the distributive property.</p>'); $$('input', x.box).forEach(function (i) { i.disabled = true; }); markCheckDone(x.id, x.s, x.ci); }
    else if (ts.tries >= 3) {
      x.c.blanks.forEach(function (bl, bi) { var inp = x.box.querySelector('#fb-' + x.k.replace(/:/g, '-') + '-' + bi); inp.value = bl.ans.replace(/\+/g, ' + ').replace(/(\w)-/g, '$1 − ').replace(/-/g, '−'); inp.classList.remove('badv'); inp.classList.add('good'); inp.disabled = true; inp.parentNode.querySelector('.tip').hidden = true; });
      fbEl.innerHTML = fbBox('info', 'Here are the answers', '<p>Compare them with what you wrote, then move on.</p>'); markCheckDone(x.id, x.s, x.ci);
    } else fbEl.innerHTML = '';
  },
  key: function (b) {
    var inp = document.getElementById(b.dataset.for); if (!inp || inp.disabled) return;
    var s = inp.selectionStart == null ? inp.value.length : inp.selectionStart, e = inp.selectionEnd == null ? s : inp.selectionEnd;
    inp.setRangeText(b.dataset.ins, s, e, 'end'); inp.focus();
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  },
  pcheck: function () { practiceCheck(view.mod); },
  scaffold: function () { var rt = RT[view.mod]; rt.scaffold = true; rt.usedScaffold = true; $('#scaf').innerHTML = scaffoldHTML(rt.problem); $('#actions').innerHTML = actionsHTML(view.mod); var f = $('#sc-0'); if (f) f.focus(); },
  sccheck: function () {
    var rt = RT[view.mod];
    if (checkScaffold(rt.problem)) { var tip = $('#scaf .scaf'); if (tip && !tip.querySelector('.alldone')) tip.insertAdjacentHTML('beforeend', '<p class="alldone yes"><b>All steps are right.</b> Now put them together and type the full answer in the box above.</p>'); }
  },
  solution: function () { var id = view.mod; endWithSolution(id, ''); save(); refreshPractice(id); },
  nextp: function () { newProblem(view.mod); render(); var i = $('#in-p'); if (i) i.focus({ preventScroll: true }); },
  similar: function () { newProblem(view.mod, true); render(); var i = $('#in-p'); if (i) i.focus({ preventScroll: true }); },
  level: function (b) { if (+b.dataset.l === state.mods[view.mod].level && RT[view.mod].problem) return; setLevel(view.mod, +b.dataset.l); },
  golevel: function (b) { closeModal(); setLevel(view.mod, +b.dataset.l); },
  closemodal: function () { closeModal(); },
  unlockall: function (b) { ['like', 'dist'].forEach(function (id) { state.mods[id].unlocked = 2; }); save(); b.textContent = 'All levels unlocked'; },
  reset: function () {
    if (!resetArmed) { resetArmed = true; render(); var t = $('.teacher'); if (t) t.open = true; return; }
    state = { mods: { like: freshMod(), dist: freshMod() } }; RT = { like: freshRT(), dist: freshRT() }; tstate = {}; resetArmed = false; save(); render();
  }
};

document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  var f = ACT[b.dataset.act]; if (f) f(b, e);
});
document.addEventListener('change', function (e) {
  if (e.target.id === 'colour' && view.mod) {
    RT[view.mod].color = e.target.checked;
    $('#prob').classList.toggle('mono', !e.target.checked);
    requestAnimationFrame(drawArrows);
  }
});
document.addEventListener('input', function (e) {
  var t = e.target;
  if (!t.classList || !t.classList.contains('ans')) return;
  var pv = document.getElementById('pv-' + t.id.slice(3)); if (!pv) return;
  var r = parseAnswer(t.value);
  pv.innerHTML = t.value.trim() && !r.error ? '<span>Reads as:</span><span class="expr">' + polyHTML(r.terms) + '</span>' : '';
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeModal(); return; }
  if (e.key !== 'Enter') return;
  var t = e.target;
  if (t.classList && t.classList.contains('ans')) { e.preventDefault(); var b = t.closest('.ansbox').querySelector('.ansrow .btn'); if (b && !b.disabled) b.click(); }
  else if (t.tagName === 'INPUT' && t.closest('.srow')) {
    e.preventDefault();
    var box = t.closest('.check, .scaf'); var btn = box && box.querySelector('[data-act="fcheck"], [data-act="sccheck"]'); if (btn) btn.click();
  }
});
var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(drawArrows, 80); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawArrows);

/* deep link: #like-learn, #dist-practice */
(function () {
  var h = (location.hash || '').slice(1).split('-');
  if (MODS[h[0]]) { view.mod = h[0]; view.tab = h[1] === 'practice' ? 'practice' : 'learn'; }
})();
render();
})();
