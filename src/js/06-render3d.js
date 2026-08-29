/* ============================================================
   3.7 3D RENDER — yigʻish, ranglar, qogʻoz oʻrami, tasma, soya
   ============================================================ */
var cam = { az:-0.68, el:0.40, zoom:1 }, C3 = document.getElementById("c3d"), G3 = C3.getContext("2d");

function fitCanvas(cv){
  var d = window.devicePixelRatio||1, r = cv.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  cv.width = Math.round(r.width*d); cv.height = Math.round(r.height*d);
  cv.getContext("2d").setTransform(d,0,0,d,0,0);
  return true;
}
function proj(p){
  var ca=Math.cos(cam.az), sa=Math.sin(cam.az);
  var x = p[0]*ca - p[1]*sa, y = p[0]*sa + p[1]*ca, z = p[2];
  var ce=Math.cos(cam.el), se=Math.sin(cam.el);
  return { x:x, y:-(y*se + z*ce), d:(-y*ce + z*se) };
}
function camDir(){
  var ce=Math.cos(cam.el), se=Math.sin(cam.el), ca=Math.cos(cam.az), sa=Math.sin(cam.az);
  return [ -ce*sa, -ce*ca, se ];
}
function faceUp(n, v){ return n[0]*v[0] + n[1]*v[1] + n[2]*v[2] > 0.02; }
function boxFaces(x,y,z,a,b,h){
  var X=[x,x+a], Y=[y,y+b], Z=[z,z+h];
  var v=[[X[0],Y[0],Z[0]],[X[1],Y[0],Z[0]],[X[1],Y[1],Z[0]],[X[0],Y[1],Z[0]],
         [X[0],Y[0],Z[1]],[X[1],Y[0],Z[1]],[X[1],Y[1],Z[1]],[X[0],Y[1],Z[1]]];
  return [ {i:[4,5,6,7],s:1.00,n:[0,0,1]},  {i:[0,3,2,1],s:0.40,n:[0,0,-1]},
           {i:[0,1,5,4],s:0.62,n:[0,-1,0]}, {i:[2,3,7,6],s:0.62,n:[0,1,0]},
           {i:[1,2,6,5],s:0.80,n:[1,0,0]},  {i:[3,0,4,7],s:0.68,n:[-1,0,0]} ]
         .map(function(f){ return { pts:f.i.map(function(k){ return v[k]; }), s:f.s, n:f.n }; });
}
function shade(hex, k){
  var n=parseInt(hex.slice(1),16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  return "rgb("+Math.round(r*k)+","+Math.round(g*k)+","+Math.round(b*k)+")";
}
var MATC = ["#c9a46c","#b98f7a","#8fa3ac","#c2b48a","#a89bb5"];
function matColor(it){
  if (!P) return MATC[0];
  var i = P.materials.findIndex(function(m){ return m.id===it.matId; });
  return MATC[(i<0?0:i)%MATC.length];
}

function lerp(a,b,t){ return {X:a.X+(b.X-a.X)*t, Y:a.Y+(b.Y-a.Y)*t}; }

function draw3D(){
  if (!fitCanvas(C3)) return;
  var w=C3.clientWidth, h=C3.clientHeight;
  G3.clearRect(0,0,w,h);
  var p = PACKS[CUR];
  if (!p){ G3.fillStyle="#666e7c"; G3.font="13px "+getComputedStyle(document.body).fontFamily;
    G3.textAlign="center"; G3.fillText("Chapdan pochka tanlang", w/2, h/2); return; }

  var zex = S.zex, boxes = [], fin = STEP >= p.seq.length;
  var packL, packW, packH, cxx, cyy;

  if (p.odd){
    var zz=0, mx=0, my=0;
    p.items.forEach(function(it){ mx=Math.max(mx,it.L); my=Math.max(my,it.W); });
    p.items.forEach(function(it,i){
      boxes.push({ x:-it.L/2, y:-it.W/2, z:zz, a:it.L, b:it.W, h:it.T*zex, it:it, step:i });
      zz += it.T*zex + 3;
    });
    packL=mx; packW=my; packH=zz; cxx=0; cyy=0;
  } else {
    cxx = p.base.L/2; cyy = p.base.W/2;
    var z = 0, st = 1;
    boxes.push({ x:-cxx, y:-cyy, z:0, a:p.base.L, b:p.base.W, h:p.base.T*zex, it:p.base, step:0 });
    z = p.base.T*zex;
    p.layers.forEach(function(L){
      L.items.forEach(function(q){
        boxes.push({ x:q.x-cxx, y:q.y-cyy, z:z, a:q.a, b:q.b, h:q.it.T*zex, it:q.it, step:st++ });
      });
      z += L.h*zex;
    });
    packL = p.gabL || p.base.L; packW = p.gabW || p.base.W; packH = z;
  }

  // ---- tayyor pochka: burchak profili yoki qogʻoz + tasma + yorliq ----
  var extras = [], quads = [];
  var wrapped = fin && WRAP && !p.odd;
  var pw = Math.max(6, packL*0.006);
  var wrapL = packL + 2*pw, wrapW = packW + 2*pw, wrapZ = -pw*0.4, wrapH = packH + pw;
  var wrapTop = wrapZ + wrapH;

  if (fin && !p.odd && !wrapped){
    var hx = packL/2, hy = packW/2;
    var cp = Math.max(70, Math.min(150, packL*0.07));
    var cw = Math.max(22, Math.min(46, packW*0.08));
    [[-hx,-hy,1,1],[hx,-hy,-1,1],[-hx,hy,1,-1],[hx,hy,-1,-1]].forEach(function(c){
      var sx=c[2], sy=c[3];
      extras.push({ x:(sx>0?c[0]:c[0]-cw), y:(sy>0?c[1]:c[1]-cp),
                    z:-1.5, a:cw, b:cp, h:packH+3, kind:"corner" });
      extras.push({ x:(sx>0?c[0]+cw:c[0]-cp), y:(sy>0?c[1]:c[1]-cw),
                    z:-1.5, a:cp-cw, b:cw, h:packH+3, kind:"corner" });
    });
  }
  if (wrapped){
    var wx = wrapL/2, wy = wrapW/2;
    var bw = Math.max(26, wrapL*0.022);
    [-0.27, 0.27].forEach(function(fr){                 // 2 ta tasma — 3 tekis yuza
      var x0 = wrapL*fr - bw/2, x1 = x0 + bw;
      quads.push({ kind:"strap", pts:[[x0,-wy,wrapTop+0.6],[x1,-wy,wrapTop+0.6],[x1,wy,wrapTop+0.6],[x0,wy,wrapTop+0.6]] });
      quads.push({ kind:"strap", pts:[[x0,-wy-0.6,wrapZ],[x1,-wy-0.6,wrapZ],[x1,-wy-0.6,wrapTop],[x0,-wy-0.6,wrapTop]] });
      quads.push({ kind:"strap", pts:[[x0,wy+0.6,wrapZ],[x1,wy+0.6,wrapZ],[x1,wy+0.6,wrapTop],[x0,wy+0.6,wrapTop]] });
    });
    var lw = Math.min(wrapL*0.30, 300), lh = Math.min(wrapW*0.44, 190);
    var lx = wx - lw - Math.max(40, wrapL*0.06), ly = -lh/2;
    quads.push({ kind:"label", pts:[[lx,ly,wrapTop+1.2],[lx+lw,ly,wrapTop+1.2],[lx+lw,ly+lh,wrapTop+1.2],[lx,ly+lh,wrapTop+1.2]] });
  }

  // ---- masshtab ----
  var minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9;
  (wrapped ? [{x:-wrapL/2,y:-wrapW/2,z:wrapZ,a:wrapL,b:wrapW,h:wrapH}] : boxes).concat(extras).forEach(function(bx){
    boxFaces(bx.x,bx.y,bx.z,bx.a,bx.b,bx.h).forEach(function(f){
      f.pts.forEach(function(q){ var s=proj(q); if(s.x<minx)minx=s.x; if(s.x>maxx)maxx=s.x; if(s.y<miny)miny=s.y; if(s.y>maxy)maxy=s.y; });
    });
  });
  quads.forEach(function(qq){ qq.pts.forEach(function(q){ var s=proj(q); if(s.x<minx)minx=s.x; if(s.x>maxx)maxx=s.x; if(s.y<miny)miny=s.y; if(s.y>maxy)maxy=s.y; }); });
  var sc = Math.min(w*0.86/Math.max(1,maxx-minx), h*0.80/Math.max(1,maxy-miny)) * cam.zoom;
  var ox = w/2 - (minx+maxx)/2*sc, oy = h/2 - (miny+maxy)/2*sc;
  function S3(q){ var s=proj(q); return { X:ox+s.x*sc, Y:oy+s.y*sc, d:s.d }; }

  // ---- pol va kontakt soyasi ----
  var fx = packL*1.5, fy = packW*2.2;
  var fl = [[-fx,-fy,0],[fx,-fy,0],[fx,fy,0],[-fx,fy,0]].map(S3);
  var fg = G3.createLinearGradient(fl[0].X,fl[0].Y,fl[2].X,fl[2].Y);
  fg.addColorStop(0,"#20242b"); fg.addColorStop(1,"#171a1f");
  G3.beginPath(); fl.forEach(function(q,i){ i?G3.lineTo(q.X,q.Y):G3.moveTo(q.X,q.Y); });
  G3.closePath(); G3.fillStyle=fg; G3.fill();
  G3.save(); G3.clip();
  G3.strokeStyle="rgba(255,255,255,.030)"; G3.lineWidth=1;
  for (var gi=-6; gi<=6; gi++){
    var A=S3([gi*packL/3,-fy,0]), B=S3([gi*packL/3,fy,0]);
    G3.beginPath(); G3.moveTo(A.X,A.Y); G3.lineTo(B.X,B.Y); G3.stroke();
    var C=S3([-fx,gi*packW/2,0]), D=S3([fx,gi*packW/2,0]);
    G3.beginPath(); G3.moveTo(C.X,C.Y); G3.lineTo(D.X,D.Y); G3.stroke();
  }
  G3.restore();
  var sh = [[-packL/2-26,-packW/2-26,0],[packL/2+26,-packW/2-26,0],[packL/2+26,packW/2+26,0],[-packL/2-26,packW/2+26,0]].map(S3);
  G3.save();
  try { G3.filter = "blur(14px)"; } catch(e){}
  G3.beginPath(); sh.forEach(function(q,i){ i?G3.lineTo(q.X,q.Y+9):G3.moveTo(q.X,q.Y+9); }); G3.closePath();
  G3.fillStyle = "rgba(0,0,0,.55)"; G3.fill();
  G3.restore();

  // ---- yuzalarni yigʻish ----
  var cv = camDir(), faces = [], acc = [], flat = [];
  if (!wrapped) boxes.forEach(function(bx){
    var curLayer = (p.seq[STEP]||{}).layer, myLayer = (p.seq[bx.step]||{}).layer;
    var state;
    if (bx.step === STEP) state = "next";
    else if (bx.step < STEP) state = (myLayer===0) ? "base" : (myLayer===curLayer ? "fresh" : "done");
    else state = (myLayer===curLayer) ? "soon" : "wait";
    var solid = (state==="base" || state==="fresh" || state==="done");
    var col = state==="base" ? "#a5714c" : state==="fresh" ? "#4fae8a" : matColor(bx.it);
    boxFaces(bx.x,bx.y,bx.z,bx.a,bx.b,bx.h).forEach(function(f,fi){
      if (solid && !faceUp(f.n, cv)) return;               // ortga qaragan yuza chizilmaydi
      var P2 = f.pts.map(S3);
      faces.push({ d:(P2[0].d+P2[1].d+P2[2].d+P2[3].d)/4, P2:P2, s:f.s, col:col,
                   state:state, solid:solid, top:fi===0 });
    });
  });
  if (wrapped){                                            // rulon qogʻoz qoplami
    boxFaces(-wrapL/2,-wrapW/2,wrapZ,wrapL,wrapW,wrapH).forEach(function(f,fi){
      if (!faceUp(f.n, cv)) return;
      var P2 = f.pts.map(S3);
      faces.push({ d:(P2[0].d+P2[1].d+P2[2].d+P2[3].d)/4, P2:P2, s:f.s,
                   kind:"paper", top:fi===0, endFace:(fi===4||fi===5) });
    });
  }
  extras.forEach(function(bx){
    boxFaces(bx.x,bx.y,bx.z,bx.a,bx.b,bx.h).forEach(function(f,fi){
      if (!faceUp(f.n, cv)) return;
      var P2 = f.pts.map(S3);
      acc.push({ d:(P2[0].d+P2[1].d+P2[2].d+P2[3].d)/4, P2:P2, s:f.s, kind:bx.kind, top:fi===0 });
    });
  });
  quads.forEach(function(q){
    var A=q.pts[0], B=q.pts[1], C=q.pts[2];
    var u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]], w2=[C[0]-B[0],C[1]-B[1],C[2]-B[2]];
    var n=[u[1]*w2[2]-u[2]*w2[1], u[2]*w2[0]-u[0]*w2[2], u[0]*w2[1]-u[1]*w2[0]];
    if (!faceUp(n, cv)) return;
    var P2 = q.pts.map(S3);
    flat.push({ d:(P2[0].d+P2[1].d+P2[2].d+P2[3].d)/4, P2:P2, s:0.92, kind:q.kind, top:true });
  });
  faces.sort(function(a,b){ return a.d-b.d; });
  acc.sort(function(a,b){ return a.d-b.d; });
  flat.sort(function(a,b){ return a.d-b.d; });
  faces = faces.concat(acc, flat);

  // ---- chizish ----
  faces.forEach(function(f){
    var P2=f.P2;
    G3.beginPath();
    P2.forEach(function(q,i){ i?G3.lineTo(q.X,q.Y):G3.moveTo(q.X,q.Y); });
    G3.closePath();

    if (f.kind === "corner"){
      G3.fillStyle = shade("#b8935e", f.s*0.95); G3.fill();
      G3.strokeStyle="rgba(0,0,0,.35)"; G3.lineWidth=0.8; G3.stroke(); return;
    }
    if (f.kind === "strap"){
      G3.fillStyle = shade("#39414d", f.s); G3.fill();
      G3.strokeStyle="rgba(0,0,0,.5)"; G3.lineWidth=0.7; G3.stroke(); return;
    }
    if (f.kind === "label"){
      if (!f.top) return;
      G3.fillStyle="#f6f5f1"; G3.fill();
      G3.strokeStyle="rgba(0,0,0,.28)"; G3.lineWidth=0.8; G3.stroke();
      // QR taqlidi: 3 ta burchak kvadrati + chiziqlar
      [[0.07,0.10],[0.62,0.10],[0.07,0.62]].forEach(function(u){
        var A=lerp(lerp(P2[0],P2[1],u[0]), lerp(P2[3],P2[2],u[0]), u[1]);
        var B=lerp(lerp(P2[0],P2[1],u[0]+0.24), lerp(P2[3],P2[2],u[0]+0.24), u[1]);
        var C=lerp(lerp(P2[0],P2[1],u[0]+0.24), lerp(P2[3],P2[2],u[0]+0.24), u[1]+0.26);
        var D=lerp(lerp(P2[0],P2[1],u[0]), lerp(P2[3],P2[2],u[0]), u[1]+0.26);
        G3.beginPath(); G3.moveTo(A.X,A.Y); G3.lineTo(B.X,B.Y); G3.lineTo(C.X,C.Y); G3.lineTo(D.X,D.Y);
        G3.closePath(); G3.fillStyle="#12141a"; G3.fill();
      });
      return;
    }

    if (f.kind === "paper"){
      var pg = G3.createLinearGradient(P2[0].X,P2[0].Y,P2[2].X,P2[2].Y);
      pg.addColorStop(0, shade("#c29a67", Math.min(1.06, f.s*1.04)));
      pg.addColorStop(1, shade("#c29a67", f.s*0.86));
      G3.fillStyle=pg; G3.fill();
      G3.save(); G3.clip();
      G3.strokeStyle="rgba(120,84,40,.10)"; G3.lineWidth=0.8;   // qogʻoz tolasi
      for (var pt=0.06; pt<0.98; pt+=0.075){
        var PA=lerp(P2[0],P2[3],pt), PB=lerp(P2[1],P2[2],pt);
        G3.beginPath(); G3.moveTo(PA.X,PA.Y); G3.lineTo(PB.X,PB.Y); G3.stroke();
      }
      if (f.endFace){                                          // uchidagi burma
        var M=lerp(P2[0],P2[1],0.5);
        G3.strokeStyle="rgba(120,84,40,.42)"; G3.lineWidth=1.1;
        G3.beginPath(); G3.moveTo(P2[3].X,P2[3].Y); G3.lineTo(M.X,M.Y);
        G3.lineTo(P2[2].X,P2[2].Y); G3.stroke();
      }
      G3.restore();
      G3.strokeStyle="rgba(70,46,18,.5)"; G3.lineWidth=0.9; G3.stroke();
      if (f.top){
        G3.beginPath(); G3.moveTo(P2[0].X,P2[0].Y); G3.lineTo(P2[1].X,P2[1].Y);
        G3.strokeStyle="rgba(255,240,210,.28)"; G3.lineWidth=1.1; G3.stroke();
      }
      return;
    }

    if (f.solid){
      var g = G3.createLinearGradient(P2[0].X,P2[0].Y,P2[2].X,P2[2].Y);
      g.addColorStop(0, shade(f.col, Math.min(1.08, f.s*1.05)));
      g.addColorStop(1, shade(f.col, f.s*0.84));
      G3.fillStyle=g; G3.fill();
      if (f.top){                                   // yogʻoch tolasi
        G3.save(); G3.clip();
        G3.strokeStyle="rgba(90,60,25,.10)"; G3.lineWidth=0.9;
        for (var t=0.10; t<0.95; t+=0.135){
          var A=lerp(P2[0],P2[3],t), B=lerp(P2[1],P2[2],t);
          G3.beginPath(); G3.moveTo(A.X,A.Y); G3.lineTo(B.X,B.Y); G3.stroke();
        }
        G3.restore();
      }
      G3.strokeStyle="rgba(28,18,6,.42)"; G3.lineWidth=0.9; G3.stroke();
      if (f.top){                                   // qirra yorugʻligi
        G3.beginPath(); G3.moveTo(P2[0].X,P2[0].Y); G3.lineTo(P2[1].X,P2[1].Y);
        G3.strokeStyle="rgba(255,240,210,.30)"; G3.lineWidth=1.1; G3.stroke();
      }
    } else if (f.state==="next"){
      G3.fillStyle="rgba(255,198,41,"+(0.20*f.s+0.10)+")"; G3.fill();
      G3.strokeStyle="#ffc629"; G3.lineWidth=1.9; G3.stroke();
    } else if (f.state==="soon"){
      G3.fillStyle="rgba(255,198,41,.05)"; G3.fill();
      G3.strokeStyle="rgba(255,198,41,.40)"; G3.lineWidth=1;
      G3.setLineDash([4,3]); G3.stroke(); G3.setLineDash([]);
    } else {
      G3.strokeStyle="rgba(152,160,173,.15)"; G3.lineWidth=0.7;
      G3.setLineDash([2,4]); G3.stroke(); G3.setLineDash([]);
    }
  });

  var seq = p.seq[STEP];
  document.getElementById("hud").innerHTML =
    "<b>"+STEP+"</b> / "+p.seq.length+" detal qoʻyildi<br>"+
    (p.odd ? "noodatiy pochka"
           : (seq ? "qavat <b>"+seq.layer+"</b> / "+p.layers.length : "<b>tayyor — tasmalangan</b>")+
             (seq && seq.fill!=null ? " · toʻldirish <b>"+Math.round(seq.fill*100)+"%</b>" : ""))+
    "<br>massa <b>"+doneKg(p).toFixed(1)+"</b> / "+p.kg.toFixed(1)+" kg";
}