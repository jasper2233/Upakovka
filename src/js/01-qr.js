/* ============================================================
   QR — byte rejimi, ECC M, 1..20-versiya.
   python-qrcode bilan bit-ma-bit tekshirilgan.
   ============================================================ */
/* 3.1 QR KOD ENKODERI — byte rejimi, ECC M, python-qrcode bilan tekshirilgan
   Kompakt QR Code enkoderi — byte rejimi, ECC daraja M, 1..20-versiyalar */
(function (root) {
  var ECB = {
    1:[10,1,16,0,0],2:[16,1,28,0,0],3:[26,1,44,0,0],4:[18,2,32,0,0],5:[24,2,43,0,0],
    6:[16,4,27,0,0],7:[18,4,31,0,0],8:[22,2,38,2,39],9:[22,3,36,2,37],10:[26,4,43,1,44],
    11:[30,1,50,4,51],12:[22,6,36,2,37],13:[22,8,37,1,38],14:[24,4,40,5,41],15:[24,5,41,5,42],
    16:[28,7,45,3,46],17:[28,10,46,1,47],18:[26,9,43,4,44],19:[26,3,44,11,45],20:[26,3,41,13,42]
  };
  var ALIGN = {
    1:[],2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],7:[6,22,38],8:[6,24,42],9:[6,26,46],
    10:[6,28,50],11:[6,30,54],12:[6,32,58],13:[6,34,62],14:[6,26,46,66],15:[6,26,48,70],
    16:[6,26,50,74],17:[6,30,54,78],18:[6,30,56,82],19:[6,30,58,86],20:[6,34,62,90]
  };
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255]; })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }
  function rsPoly(n) { var p = [1]; for (var i = 0; i < n; i++) { var q = p.slice(); q.push(0); for (var j = 0; j < p.length; j++) q[j + 1] ^= gmul(p[j], EXP[i]); p = q; } return p; }
  function rsEncode(data, n) {
    var gen = rsPoly(n), res = new Array(n).fill(0);
    for (var i = 0; i < data.length; i++) {
      var f = data[i] ^ res[0];
      res.shift(); res.push(0);
      if (f !== 0) for (var j = 0; j < n; j++) res[j] ^= gmul(gen[j + 1], f);
    }
    return res;
  }
  function utf8(str) { var out = [], s = unescape(encodeURIComponent(str)); for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i)); return out; }
  function capacity(v) { var e = ECB[v]; return e[1] * e[2] + e[3] * e[4]; }

  function encode(text) {
    var bytes = utf8(text), ver = 0;
    for (var v = 1; v <= 20; v++) {
      var cciBits = v < 10 ? 8 : 16;
      if (4 + cciBits + bytes.length * 8 <= capacity(v) * 8) { ver = v; break; }
    }
    if (!ver) throw new Error("Maʼlumot juda uzun");
    var e = ECB[ver], eccLen = e[0], total = capacity(ver);
    var bits = [];
    function push(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); }
    push(4, 4);
    push(bytes.length, ver < 10 ? 8 : 16);
    for (var i = 0; i < bytes.length; i++) push(bytes[i], 8);
    var cap = total * 8;
    for (var t = 0; t < 4 && bits.length < cap; t++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    var dat = [];
    for (var b = 0; b < bits.length; b += 8) { var n = 0; for (var k = 0; k < 8; k++) n = (n << 1) | bits[b + k]; dat.push(n); }
    var pad = [0xEC, 0x11], pi = 0;
    while (dat.length < total) dat.push(pad[pi++ % 2]);

    var blocks = [], ecs = [], off = 0;
    function addBlock(cnt, len) { for (var i = 0; i < cnt; i++) { var d = dat.slice(off, off + len); off += len; blocks.push(d); ecs.push(rsEncode(d, eccLen)); } }
    addBlock(e[1], e[2]); if (e[3]) addBlock(e[3], e[4]);
    var maxD = Math.max.apply(null, blocks.map(function (x) { return x.length; })), final = [];
    for (var c = 0; c < maxD; c++) for (var bi = 0; bi < blocks.length; bi++) if (c < blocks[bi].length) final.push(blocks[bi][c]);
    for (var c2 = 0; c2 < eccLen; c2++) for (var bj = 0; bj < ecs.length; bj++) final.push(ecs[bj][c2]);
    return { ver: ver, codewords: final };
  }

  function buildMatrix(ver, codewords) {
    var size = ver * 4 + 17;
    var m = [], fn = [];
    for (var i = 0; i < size; i++) { m.push(new Array(size).fill(0)); fn.push(new Array(size).fill(0)); }
    function setF(r, c, v) { if (r >= 0 && r < size && c >= 0 && c < size) { m[r][c] = v; fn[r][c] = 1; } }
    function finder(r, c) {
      for (var dr = -1; dr <= 7; dr++) for (var dc = -1; dc <= 7; dc++) {
        var d = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
        setF(r + dr, c + dc, (d === 2 || d > 3) ? 0 : 1);
      }
    }
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
    for (var k = 8; k < size - 8; k++) { setF(6, k, k % 2 === 0 ? 1 : 0); setF(k, 6, k % 2 === 0 ? 1 : 0); }
    var ap = ALIGN[ver];
    for (var a = 0; a < ap.length; a++) for (var b = 0; b < ap.length; b++) {
      var r = ap[a], c = ap[b];
      if ((r <= 7 && c <= 7) || (r <= 7 && c >= size - 8) || (r >= size - 8 && c <= 7)) continue;
      for (var dr2 = -2; dr2 <= 2; dr2++) for (var dc2 = -2; dc2 <= 2; dc2++)
        setF(r + dr2, c + dc2, Math.max(Math.abs(dr2), Math.abs(dc2)) !== 1 ? 1 : 0);
    }
    setF(size - 8, 8, 1);
    for (var f = 0; f < 15; f++) { // format joyi band qilinadi
      var p = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]][f];
      fn[p[0]][p[1]] = 1;
      var q = f < 7 ? [size - 1 - f, 8] : [8, size - 15 + f];
      fn[q[0]][q[1]] = 1;
    }
    if (ver >= 7) for (var vi = 0; vi < 18; vi++) {
      var rr = Math.floor(vi / 3), cc = vi % 3;
      fn[size - 11 + cc][rr] = 1; fn[rr][size - 11 + cc] = 1;
    }
    // maʼlumotni zigzag boʻyicha joylash
    var bitIdx = 0, up = true;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (var n2 = 0; n2 < size; n2++) {
        var row = up ? size - 1 - n2 : n2;
        for (var s = 0; s < 2; s++) {
          var cx = col - s;
          if (fn[row][cx]) continue;
          var bit = 0;
          if (bitIdx < codewords.length * 8) bit = (codewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
          m[row][cx] = bit; bitIdx++;
        }
      }
      up = !up;
    }
    return { m: m, fn: fn, size: size };
  }

  function maskFn(k, r, c) {
    switch (k) {
      case 0: return (r + c) % 2 === 0; case 1: return r % 2 === 0; case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0; case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return (r * c) % 2 + (r * c) % 3 === 0; case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
      default: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
    }
  }
  function fmtBits(mask) { // ECC M = 00
    var d = (0 << 3) | mask, r = d;
    for (var i = 0; i < 10; i++) r = (r << 1) ^ (((r >> 9) & 1) * 0x537);
    return ((d << 10) | (r & 0x3FF)) ^ 0x5412;
  }
  function verBits(v) { var r = v; for (var i = 0; i < 12; i++) r = (r << 1) ^ (((r >> 11) & 1) * 0x1F25); return (v << 12) | (r & 0xFFF); }

  function penalty(m, size) {
    var p = 0, i, j, run, dark = 0;
    for (i = 0; i < size; i++) {
      run = 1; for (j = 1; j < size; j++) { if (m[i][j] === m[i][j - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
      run = 1; for (j = 1; j < size; j++) { if (m[j][i] === m[j - 1][i]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
    }
    for (i = 0; i < size - 1; i++) for (j = 0; j < size - 1; j++) {
      var v = m[i][j]; if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) p += 3;
    }
    var pat = [1,0,1,1,1,0,1,0,0,0,0], pat2 = [0,0,0,0,1,0,1,1,1,0,1];
    function has(arr, at) { for (var q = 0; q < 11; q++) if (arr[at + q] !== pat[q]) return false; return true; }
    function has2(arr, at) { for (var q = 0; q < 11; q++) if (arr[at + q] !== pat2[q]) return false; return true; }
    for (i = 0; i < size; i++) {
      var rowA = m[i], colA = []; for (j = 0; j < size; j++) colA.push(m[j][i]);
      for (j = 0; j + 11 <= size; j++) { if (has(rowA, j)) p += 40; if (has2(rowA, j)) p += 40; if (has(colA, j)) p += 40; if (has2(colA, j)) p += 40; }
    }
    for (i = 0; i < size; i++) for (j = 0; j < size; j++) if (m[i][j]) dark++;
    p += Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5) * 10;
    return p;
  }

  function make(text, forceMask) {
    var enc = encode(text), built = buildMatrix(enc.ver, enc.codewords);
    var size = built.size, best = null, bestScore = Infinity;
    for (var k = 0; k < 8; k++) {
      if (forceMask !== undefined && k !== forceMask) continue;
      var mm = built.m.map(function (r) { return r.slice(); });
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (!built.fn[r][c] && maskFn(k, r, c)) mm[r][c] ^= 1;
      var fb = fmtBits(k);
      for (var f = 0; f < 15; f++) {
        var bit = (fb >> (14 - f)) & 1;
        var p1 = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]][f];
        mm[p1[0]][p1[1]] = bit;
        if (f < 7) mm[size - 1 - f][8] = bit; else mm[8][size - 15 + f] = bit;
      }
      mm[size - 8][8] = 1;
      if (enc.ver >= 7) { var vb = verBits(enc.ver); for (var vi = 0; vi < 18; vi++) { var bt = (vb >> vi) & 1, rr = Math.floor(vi / 3), cc = vi % 3; mm[size - 11 + cc][rr] = bt; mm[rr][size - 11 + cc] = bt; } }
      var sm = built.m.map(function (r) { return r.slice(); });
      for (var r2 = 0; r2 < size; r2++) for (var c2 = 0; c2 < size; c2++) if (!built.fn[r2][c2] && maskFn(k, r2, c2)) sm[r2][c2] ^= 1;
      for (var f2 = 0; f2 < 15; f2++) {
        var pp = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]][f2];
        sm[pp[0]][pp[1]] = 0;
        if (f2 < 7) sm[size - 1 - f2][8] = 0; else sm[8][size - 15 + f2] = 0;
      }
      sm[size - 8][8] = 0;
      var sc = penalty(sm, size);
      if (sc < bestScore) { bestScore = sc; best = mm; }
    }
    return best;
  }
  root.QR = { make: make };
})(typeof module !== "undefined" ? module.exports : (window.QRLIB = {}));