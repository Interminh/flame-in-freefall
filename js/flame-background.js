// A looping visual interpretation of the NASA still, not experimental footage.
(() => {
  const hero = document.querySelector('.masthead');
  const photo = hero?.querySelector('.masthead__img');
  if (!photo) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'masthead__flame';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return;

  const vertex = `
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;
  const fragment = `
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D photo;
    uniform vec2 crop;
    uniform float phase;
    uniform vec3 pointer;
    uniform float imageAspect;
    void main() {
      vec2 p = vec2(uv.x, 1.0 - uv.y) * crop + (1.0 - crop) * vec2(0.7, 0.4);
      vec3 original = texture2D(photo, p).rgb;
      float light = max(original.r, max(original.g, original.b));
      // Keep the rounded photograph recognizable; this motion is decorative, not a gravity model.
      float envelope = smoothstep(0.06, 0.28, light)
        * smoothstep(0.37, 0.46, p.x) * (1.0 - smoothstep(0.79, 0.86, p.x));
      vec2 center = vec2(0.59, 0.36);
      vec2 offset = p - center;
      float breath = 0.026 * sin(phase) + 0.009 * sin(2.0 * phase + 0.7);
      vec2 flow = offset * breath;
      flow.x += 0.006 * sin(p.y * 19.0 + phase) + 0.003 * sin(p.y * 37.0 - 2.0 * phase);
      flow.y += 0.007 * sin(p.x * 17.0 - phase) + 0.003 * sin(p.x * 31.0 + 2.0 * phase);
      vec2 cursor = pointer.xy * crop + (1.0 - crop) * vec2(0.7, 0.4);
      vec2 distanceToCursor = (p - cursor) * vec2(imageAspect, 1.0);
      float hover = (1.0 - smoothstep(0.0, 0.3, length(distanceToCursor))) * pointer.z;
      float upperRight = smoothstep(0.58, 0.70, p.x)
        * (1.0 - smoothstep(0.22, 0.38, p.y));
      flow *= 0.12 + 0.28 * upperRight * (1.0 - hover) + 2.68 * hover;
      flow -= (p - cursor) * 0.08 * hover;
      vec2 samplePoint = p + flow * envelope;
      vec3 flame = texture2D(photo, samplePoint).rgb;
      flame *= 1.0 + envelope * (0.055 * sin(phase + p.y * 8.0) + 0.025 * sin(3.0 * phase + p.x * 14.0));
      // Shift only the blue rim toward cyan, leaving the warm core and dark surroundings intact.
      float blueRim = smoothstep(0.05, 0.24, original.b - original.r) * envelope;
      float hueShimmer = 0.5 + 0.5 * sin(phase + p.y * 6.0 - p.x * 4.0);
      flame.g += blueRim * hueShimmer * 0.075;
      flame.b += blueRim * hueShimmer * 0.025;
      // A restrained warm-to-peach shimmer inside the flame, separate from the blue rim.
      float warmCore = smoothstep(0.02, 0.18, original.r - original.b)
        * smoothstep(0.25, 0.65, light) * envelope;
      float coreShimmer = sin(phase + p.y * 3.0);
      flame += warmCore * coreShimmer * vec3(0.014, -0.021, 0.038);
      gl_FragColor = vec4(flame, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Flame shader unavailable');
    return shader;
  }

  function start() {
    try {
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, photo);
      const phase = gl.getUniformLocation(program, 'phase');
      const crop = gl.getUniformLocation(program, 'crop');
      const pointer = gl.getUniformLocation(program, 'pointer');
      gl.uniform1f(gl.getUniformLocation(program, 'imageAspect'), photo.naturalWidth / photo.naturalHeight);
      hero.append(canvas);
      let frame;
      let visible = true;
      let hoverTarget = 0;
      let hoverStrength = 0;
      let lastTime = 0;
      let elapsed = 0;
      const cursor = { x: 0.5, y: 0.5 };
      const target = { ...cursor };
      hero.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        const bounds = hero.getBoundingClientRect();
        target.x = (event.clientX - bounds.left) / bounds.width;
        target.y = (event.clientY - bounds.top) / bounds.height;
        hoverTarget = 1;
      });
      const releaseHover = () => { hoverTarget = 0; };
      hero.addEventListener('pointerleave', releaseHover);
      hero.addEventListener('pointercancel', releaseHover);
      window.addEventListener('blur', releaseHover);
      function draw(time) {
        // Time-based easing keeps the response gentle on both high- and low-refresh displays.
        const delta = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        elapsed += delta;
        const ease = 1.0 - Math.exp(-delta * 5);
        cursor.x += (target.x - cursor.x) * ease;
        cursor.y += (target.y - cursor.y) * ease;
        hoverStrength += (hoverTarget - hoverStrength) * ease;
        gl.uniform3f(pointer, cursor.x, cursor.y, hoverStrength);
        const width = hero.clientWidth;
        const height = hero.clientHeight;
        const ratio = Math.min(devicePixelRatio || 1, 1.5);
        if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
          canvas.width = Math.round(width * ratio);
          canvas.height = Math.round(height * ratio);
          gl.viewport(0, 0, canvas.width, canvas.height);
        }
        const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight);
        gl.uniform2f(crop, width / (photo.naturalWidth * scale), height / (photo.naturalHeight * scale));
        gl.uniform1f(phase, (elapsed % 8) / 8 * Math.PI * 2);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        hero.classList.add('is-animated');
        frame = requestAnimationFrame(draw);
      }
      function sync() {
        cancelAnimationFrame(frame);
        if (!reducedMotion.matches && !document.hidden && visible) frame = requestAnimationFrame(draw);
      }
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(hero);
      reducedMotion.addEventListener('change', sync);
      document.addEventListener('visibilitychange', sync);
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        cancelAnimationFrame(frame);
        hero.classList.remove('is-animated');
      });
      sync();
    } catch {
      // Retain the original photo if rendering is unsupported.
      hero.classList.remove('is-animated');
    }
  }
  if (photo.complete && photo.naturalWidth) start();
  else photo.addEventListener('load', start, { once: true });
})();
