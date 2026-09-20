// The original image stays intact. A small GPU displacement gives it a six-frame
// stop-motion idle cycle; the rest of the interface never moves.
const FPS = 6;
const VERTEX = `
attribute vec2 position;
varying vec2 coord;
void main() {
  coord = vec2(position.x * .5 + .5, .5 - position.y * .5);
  gl_Position = vec4(position, 0., 1.);
}`;
const FRAGMENT = `
precision mediump float;
varying vec2 coord;
uniform sampler2D picture;
uniform float time;
uniform vec2 crop;
uniform vec2 offset;

float region(vec2 point, vec2 center, vec2 radius) {
  vec2 distance = (point - center) / radius;
  return exp(-dot(distance, distance) * 2.);
}

void main() {
  vec2 uv = coord * crop + offset;
  vec2 source = uv;
  // Separate, softly bounded fields keep the building still and avoid cutouts.
  float chest = region(uv, vec2(.74, .49), vec2(.32, .25));
  float head = region(uv, vec2(.72, .235), vec2(.13, .13));
  float visitor = region(uv, vec2(.245, .65), vec2(.22, .31));
  float breath = sin(time * 1.57);
  float weight = sin(time * .71 + 1.2);
  source.y += chest * breath * .0038;
  source.x += chest * weight * .0017;
  source.y += head * breath * .0016;
  // Tiny head tilt, anchored around the neck rather than moving the full frame.
  float tilt = sin(time * .83) * .024 * head;
  source += vec2(-(uv.y - .30), uv.x - .72) * tilt;
  source.x += visitor * sin(time * 1.13 + 2.) * .0032;
  source.y += visitor * sin(time * 1.7 + .5) * .0019;
  vec4 color = texture2D(picture, clamp(source, .001, .999));
  // A dim neon flutter, not flashes: brightness changes by at most 5 percent.
  float sign = region(uv, vec2(.36, .105), vec2(.37, .11));
  float neon = .975 + .025 * sin(time * 2.7 + sin(time * 1.3));
  color.rgb *= mix(1., neon, sign);
  gl_FragColor = color;
}`;

export async function initMotion() {
  const scene = document.querySelector('#scene');
  const image = scene.querySelector('.scene-art');
  const canvas = scene.querySelector('.scene-motion');
  const button = document.querySelector('#motion');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let gl;
  let program;
  let vertex;
  let fragment;
  let buffer;
  let texture;
  let timer;
  let elapsed = 0;
  let frame = 0;
  let inView = true;
  let failed = false;
  let enabled = !reduced.matches;
  let sizeObserver;
  let viewObserver;
  let endObserver;
  let uniforms;

  function cleanup() {
    clearInterval(timer);
    timer = undefined;
    canvas.hidden = true;
    button.hidden = true;
    failed = true;
    sizeObserver?.disconnect();
    viewObserver?.disconnect();
    endObserver?.disconnect();
    if (gl && !gl.isContextLost()) {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    }
  }

  function draw() {
    if (failed) return;
    const width = image.clientWidth;
    const height = image.clientHeight;
    if (!width || !height) return;
    const density = Math.min(devicePixelRatio || 1, 1.5);
    const pixelWidth = Math.round(width * density);
    const pixelHeight = Math.round(height * density);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    }
    // Match the image's object-fit: cover; object-position: center top.
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const cropX = width / (image.naturalWidth * scale);
    const cropY = height / (image.naturalHeight * scale);
    gl.uniform2f(uniforms.crop, cropX, cropY);
    gl.uniform2f(uniforms.offset, (1 - cropX) / 2, 0);
    gl.uniform1f(uniforms.time, elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    canvas.dataset.frame = String(frame++);
  }

  function sync() {
    if (failed) return;
    clearInterval(timer);
    timer = undefined;
    const active = enabled && !reduced.matches;
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', reduced.matches ? 'Animación desactivada por movimiento reducido' : active ? 'Pausar animación' : 'Activar animación');
    button.disabled = reduced.matches;
    button.replaceChildren(document.createTextNode(active ? 'Ⅱ ' : '▷ '));
    const label = document.createElement('span');
    label.className = 'motion-label';
    label.textContent = 'ANIMACIÓN';
    button.append(label);
    // Manual pause freezes the frame. Reduced motion always shows the original.
    if (reduced.matches) canvas.hidden = true;
    const cinematic = !['door', 'admitted', undefined].includes(scene.dataset.endingState);
    button.hidden = cinematic;
    if (cinematic) canvas.hidden = true;
    const running = active && !cinematic && inView && !document.hidden && document.querySelector('#ending').hidden;
    canvas.dataset.running = String(running);
    if (!running) return;
    draw();
    canvas.hidden = false;
    timer = setInterval(() => {
      elapsed += 1 / FPS;
      draw();
    }, 1000 / FPS);
  }

  try {
    await image.decode();
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) return;
    function shader(type, source) {
      const result = gl.createShader(type);
      gl.shaderSource(result, source);
      gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
        gl.deleteShader(result);
        throw new Error('Animation shader unavailable');
      }
      return result;
    }
    vertex = shader(gl.VERTEX_SHADER, VERTEX);
    fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT);
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Animation program unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    uniforms = Object.fromEntries(['crop', 'offset', 'time'].map(key => [key, gl.getUniformLocation(program, key)]));
    gl.uniform1i(gl.getUniformLocation(program, 'picture'), 0);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('Animation setup failed');
    button.hidden = false;
    button.addEventListener('click', () => { enabled = !enabled; sync(); });
    reduced.addEventListener('change', () => { enabled = !reduced.matches; sync(); });
    document.addEventListener('visibilitychange', sync);
    canvas.addEventListener('webglcontextlost', cleanup);
    window.addEventListener('pagehide', () => { clearInterval(timer); timer = undefined; });
    window.addEventListener('pageshow', sync);
    sizeObserver = new ResizeObserver(() => { if (!canvas.hidden) draw(); });
    sizeObserver.observe(image);
    viewObserver = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); });
    viewObserver.observe(scene);
    endObserver = new MutationObserver(sync);
    endObserver.observe(document.querySelector('#ending'), { attributes: true, attributeFilter: ['hidden'] });
    endObserver.observe(scene, { attributes: true, attributeFilter: ['data-ending-state'] });
    sync();
  } catch {
    // WebGL/image decoding is optional: the complete static game remains usable.
    cleanup();
  }
}
