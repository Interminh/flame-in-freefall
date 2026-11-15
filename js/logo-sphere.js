// Live Ignis_ØG sphere. Draws the same look as img/logo.png (see scripts/make-logo.py) in a fragment shader,
// so it can be turned in real time. Moving the mouse over it spins it the way the mouse moves, and it keeps
// turning a little after you stop. It idles very slowly. Add data-sphere to a box that holds the still <img>:
//   <div class="logo-sphere" data-sphere><img src="img/logo.png" alt=""></div>
// The still stays if WebGL is missing, and with Reduce motion on the sphere is drawn once and does not move.
(() => {
  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}'

  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform mat3 uRot;
uniform float uTime;

float hash(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm3(vec3 p){
  float t=0.0,a=0.5,n=0.0;
  for(int i=0;i<3;i++){ t+=a*noise(p); n+=a; a*=0.5; p*=2.03; }
  return t/n;
}
float height(vec3 p){ return fbm3(p*9.0)*0.75+noise(p*26.0)*0.25; }

void main(){
  vec2 uv=(gl_FragCoord.xy/uRes)*2.0-1.0;
  float R=0.94;
  vec2 xy=uv/R;
  float r2=dot(xy,xy);
  float edge=clamp((1.0-sqrt(r2))*R*uRes.x*0.5/1.2,0.0,1.0);
  if(edge<=0.0){ gl_FragColor=vec4(0.0); return; }
  float z=sqrt(max(1.0-r2,0.0));
  vec3 n=vec3(xy,z);

  vec3 p=uRot*n;
  float t=uTime*0.12;
  vec3 drift=0.22*vec3(cos(t),sin(t),cos(t+1.3));
  vec3 pp=p*1.25+drift;
  vec3 w=vec3(fbm3(pp+3.1),fbm3(pp+7.7),fbm3(pp+11.3))-0.5;
  vec3 q=p*1.4+1.9*w;
  float f=fbm3(q);
  float f2=fbm3(q*1.15+5.2);
  float rib=clamp(exp(-pow((f-0.5)/0.055,2.0))+exp(-pow((f2-0.47)/0.034,2.0))*0.6,0.0,1.0);

  float e=0.015;
  float h0=height(p);
  vec3 g=vec3(height(p+vec3(e,0.0,0.0))-h0,height(p+vec3(0.0,e,0.0))-h0,height(p+vec3(0.0,0.0,e))-h0)/e;
  vec3 gv=g*uRot;
  gv-=dot(gv,n)*n;
  vec3 n2=normalize(n-0.04*gv);
  rib*=0.82+0.36*h0;

  vec3 dark=vec3(5.0,14.0,140.0)/255.0;
  vec3 mid=vec3(22.0,62.0,236.0)/255.0;
  vec3 bright=vec3(62.0,128.0,255.0)/255.0;
  vec3 base=mix(dark,mid,smoothstep(0.30,0.70,f));
  base=mix(base,bright,smoothstep(0.55,0.9,f2)*0.5);
  vec3 violet=vec3(66.0,24.0,170.0)/255.0;
  vec3 ribbonCol=vec3(165.0,208.0,255.0)/255.0;

  vec3 L=normalize(vec3(-0.5,0.58,0.64));
  float wrap=clamp((dot(n2,L)+0.3)/1.3,0.0,1.0);
  float lit=0.16+pow(wrap,1.15);
  vec3 col=base*lit+violet*pow(1.0-wrap,1.6)*0.42;
  col=mix(col,ribbonCol*(0.5+0.62*wrap),rib*0.8);
  col*=0.88+0.24*h0;

  float ndh=clamp(dot(n2,normalize(L+vec3(0.0,0.0,1.0))),0.0,1.0);
  col+=vec3(1.0)*(pow(ndh,60.0)*0.30+pow(ndh,14.0)*0.06);

  float fres=pow(1.0-z,2.6);
  float rim=fres*clamp(dot(n,normalize(vec3(0.62,-0.5,0.25)))*0.9+0.35,0.0,1.0);
  col+=vec3(70.0,175.0,255.0)/255.0*rim*0.7+vec3(40.0,60.0,200.0)/255.0*fres*0.18;

  col=clamp(col,0.0,1.0);
  gl_FragColor=vec4(col*edge,edge);
}`

  const reduced = () =>
    matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce'

  function compile(gl, type, src) {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
  }

  function start(box) {
    const canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false })
    if (!gl) return
    const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
    if (!hp || hp.precision === 0) return
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uRes = gl.getUniformLocation(prog, 'uRes')
    const uRot = gl.getUniformLocation(prog, 'uRot')
    const uTime = gl.getUniformLocation(prog, 'uTime')

    box.append(canvas)

    // Object turn: yaw about its vertical axis, pitch about the screen's horizontal axis.
    let yaw = 0
    let pitch = 0.31
    let vYaw = 0
    let vPitch = 0
    let time = 0
    const IDLE = 0.05                 // rad/s, a full slow turn in about two minutes
    const clamp = (v, m) => Math.max(-m, Math.min(m, v))

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const px = Math.max(64, Math.round(box.clientWidth * dpr))
      if (canvas.width !== px) { canvas.width = px; canvas.height = px }
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    function draw() {
      size()
      // The shader wants the inverse of the object turn: Ry(-yaw) * Rx(-pitch). Column-major.
      const cy = Math.cos(-yaw), sy = Math.sin(-yaw), cx = Math.cos(-pitch), sx = Math.sin(-pitch)
      const ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]
      const rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]
      const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) m[i][j] += ry[i][k] * rx[k][j]
      gl.uniformMatrix3fv(uRot, false, new Float32Array([m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]]))
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, time)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    let running = false
    let visible = true
    let last = 0
    function frame(now) {
      if (!running) return
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (reduced()) { running = false; return }
      time += dt
      yaw += (vYaw + IDLE) * dt
      pitch += vPitch * dt
      const damp = Math.pow(0.03, dt)
      vYaw *= damp
      vPitch *= damp
      pitch = clamp(pitch, 1.2)
      draw()
      requestAnimationFrame(frame)
    }
    function run() {
      if (running || !visible || document.hidden || reduced()) return
      running = true
      last = performance.now()
      requestAnimationFrame(frame)
    }

    // First frame, then swap the still for the live canvas.
    draw()
    box.classList.add('is-live')

    // Spin the way the mouse moves. Moving right turns the front of the sphere to the right.
    let px = null
    let py = null
    canvas.addEventListener('pointermove', (e) => {
      if (reduced()) return
      if (px !== null) {
        vYaw = clamp(vYaw + (e.clientX - px) * 0.22, 5)
        vPitch = clamp(vPitch + (e.clientY - py) * 0.22, 5)
      }
      px = e.clientX
      py = e.clientY
      run()
    })
    canvas.addEventListener('pointerleave', () => { px = null; py = null })

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting
      if (visible) run()
    }).observe(box)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) run() })
    window.addEventListener('resize', () => { if (!running) draw() })
    run()
  }

  document.querySelectorAll('[data-sphere]').forEach(start)
})()
