/**
 * Homological tensor shader: gyroid SDF membrane driven by the field state,
 * the LKB intertwiner I (vec3), the NAND gate readout and the resonance store.
 */
import { resonance } from './resonance.js';

export function initShader(canvas, field, getLkb) {
  const gl = canvas?.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return;
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `precision mediump float;
uniform vec2 r;uniform float time;uniform float morph;uniform float bass;uniform float mid;uniform float off;
uniform vec3 iw;uniform float gate;uniform float res;uniform float spin;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float map(vec3 p){
  p.xz*=rot(time*.15+spin+res*.01*sin(time*39.42));p.xy*=rot(time*.07);
  float sc=2.6+morph*2.2;
  vec3 q=p*sc+vec3(0.,0.,time*.3);
  float g=abs(dot(sin(q),cos(q.yzx)+mid*.25*sin(q.zxy*2.+time)))/sc-(.035+.03*bass);
  g+=.012*dot(iw,sin(q.zxy*1.5+time*.5))*(1.5-gate);
  float s=length(p)-1.55;
  return max(s,g*.75);
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;uv.x-=off;
  vec3 ro=vec3(0.,0.,3.6),rd=normalize(vec3(uv,-1.5));
  float d=0.,hit=0.;vec3 p;
  for(int i=0;i<72;i++){p=ro+rd*d;float h=map(p);if(h<.002){hit=1.;break;}d+=h;if(d>7.)break;}
  vec3 col=vec3(.027,.035,.043);
  if(hit>.5){
    vec2 e=vec2(.002,0.);
    vec3 n=normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));
    float dif=clamp(dot(n,normalize(vec3(.6,.8,.5))),0.,1.);
    float rim=pow(1.-abs(dot(n,-rd)),3.);
    vec3 teal=vec3(.486,.941,.769),amber=vec3(.945,.722,.29);
    float band=.5+.5*sin(dot(p,iw)*6.+time);
    vec3 base=mix(teal,amber,smoothstep(.6,1.5,length(p))*(.4+.6*morph));
    base=mix(base,amber,(1.-gate)*.55*band);
    col=base*(.15+.75*dif)+rim*mix(amber,teal,gate)*.8;
    col+=amber*rim*res*1.2+amber*.12*res*band;
    col=mix(col,vec3(.027,.035,.043),smoothstep(2.5,5.,d));
  }
  gl_FragColor=vec4(col,1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = {};
  ['r', 'time', 'morph', 'bass', 'mid', 'off', 'iw', 'gate', 'res', 'spin'].forEach((k) => { u[k] = gl.getUniformLocation(prog, k); });

  const live = { iw: [0.7, -0.7, 1], gate: 1, res: 0, spin: 0 };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);

  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.55;
    const w = Math.max(1, Math.floor(canvas.clientWidth * scale));
    const h = Math.max(1, Math.floor(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  const start = performance.now();
  function frame(now) {
    if (visible || reduce) {
      resize();
      ['morph', 'bass', 'mid'].forEach((k) => { field[k] += (field.target[k] - field[k]) * 0.03; });
      const lkb = getLkb();
      live.iw = live.iw.map((x, i) => x + (lkb.intertwiner[i] - x) * 0.03);
      live.gate += (lkb.gate - live.gate) * 0.03;
      live.res += ((resonance.isResonating ? resonance.intensity : 0) - live.res) * 0.04;
      live.spin += (resonance.spin > 0 ? 0.12 : 0);
      const aspect = canvas.width / canvas.height;
      gl.uniform2f(u.r, canvas.width, canvas.height);
      gl.uniform1f(u.time, reduce ? 4 : (now - start) / 1000);
      gl.uniform1f(u.morph, field.morph);
      gl.uniform1f(u.bass, field.bass);
      gl.uniform1f(u.mid, field.mid);
      gl.uniform3f(u.iw, live.iw[0], live.iw[1], live.iw[2]);
      gl.uniform1f(u.gate, live.gate);
      gl.uniform1f(u.res, live.res);
      gl.uniform1f(u.spin, live.spin);
      gl.uniform1f(u.off, aspect > 1.2 ? Math.min(0.45, (aspect - 1) * 0.35) : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (reduce) window.addEventListener('resize', () => requestAnimationFrame(frame));
}
