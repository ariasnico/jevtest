import { nextEnding, endingFrames, vipEndingFrames } from './ending-state.js';

export function createEnding({ scene, onRestart, onContinue }) {
  const $ = selector => scene.querySelector(selector);
  const layer = $('#cinematic');
  const art = $('#ending-art');
  const invitation = $('#invitation');
  const caption = $('#cinematic-caption');
  const pause = $('#ending-pause');
  const skipButton = $('#ending-skip');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  let state = 'door';
  let epoch = 0;
  let timer;
  let tick = 0;
  let paused = false;
  let inView = true;
  let ready = false;
  let loading;
  let available = [];
  let current = -1;
  let chapter='door';
  const frames=()=>chapter==='vip'?vipEndingFrames:endingFrames;

  function move(event) {
    state = nextEnding(state, event);
    scene.dataset.endingState = state;
  }
  function stop() { clearInterval(timer); timer = undefined; }
  function preload() {
    const requestedChapter=chapter;
    loading ??= Promise.allSettled(frames().map(frame => new Promise((resolve, reject) => {
      const image = new Image();
      const timeout = setTimeout(() => reject(new Error('Image timeout')), 6000);
      image.src = frame.src;
      image.decode().then(() => { clearTimeout(timeout); resolve(image); }, error => { clearTimeout(timeout); reject(error); });
    }))).then(results => {
      if(requestedChapter!==chapter)return;
      available = results.map(result => result.status === 'fulfilled');
      ready = true;
    });
    return loading;
  }
  function showFrame(index, progress = 0) {
    if (!available[index]) return;
    if (current !== index) {
      current = index;
      art.src = frames()[index].src;
      art.hidden = false;
      art.alt = chapter==='vip'?'Escena ficticia en ASCII: Clavicular y un grupo de invitadas adultas te reciben en la mesa VIP.':index < 3 ? 'El patova abre la soga y cruzás la puerta de Caramelo, en arte ASCII.'
        : index === 3 ? 'Interior de Caramelo: pista, luces y mesas, en arte ASCII.'
          : 'Dos mujeres adultas rubias con vestidos de fiesta te invitan a su mesa y a bailar, en arte ASCII.';
    }
    // Six-Hz camera push over distinct poses, not simulated character walking.
    art.style.transform = reduced.matches ? 'none' : `scale(${1 + progress * .012})`;
  }
  function finish() {
    if (!['entering', 'inside', 'invitation'].includes(state)) return;
    stop();
    if (state !== 'invitation') move('SKIP');
    const final = frames().map((_,i)=>i).reverse().find(index => available[index]);
    if (final !== undefined) showFrame(final);
    invitation.hidden = false;
    $('#cinematic-outcome').hidden = false;
    pause.hidden = true;
    skipButton.hidden = true;
    const vip=chapter==='vip';
    $('#invitation .speaker').textContent=vip?'CLAVICULAR · FICCIÓN':'LA NOCHE RECIÉN EMPIEZA';
    $('#invitation p').textContent=vip?'Guardá el celu. Las mejores noches no quedan en historias.':'Vení, lindo. Te guardamos lugar… pero portarte bien es opcional.';
    $('#cinematic-outcome h2').textContent=vip?'De la vereda al VIP.':'De la vereda a la pista.';
    $('#cinematic-outcome p').textContent=vip?'Dos puertas. Cero contactos. La noche completa.':'La noche sigue arriba. ¿Te animás al VIP?';
    $('#continue').hidden=vip;
    caption.textContent = ready && available.every(Boolean) ? (vip?'03:17 AM · UNO MÁS DE LA MESA':'02:55 AM · LA NOCHE ES TUYA')
      : 'Estás adentro. Parte del arte no pudo cargar.';
    (vip?$('#ending-restart'):$('#continue')).focus({ preventScroll: true });
  }
  function step() {
    if (paused || document.hidden || !inView) return;
    if (tick >= frames().reduce((sum,frame)=>sum+frame.holdFrames,0)) { move('INVITE'); finish(); return; }
    let start = 0;
    const index = frames().findIndex(frame => {
      if (tick < start + frame.holdFrames) return true;
      start += frame.holdFrames;
      return false;
    });
    const frame = frames()[index];
    if (frame.phase === 'inside' && state === 'entering') move('ARRIVE');
    showFrame(index, (tick - start) / frame.holdFrames);
    caption.textContent = frame.caption;
    layer.dataset.frame = String(tick++);
  }
  async function start() {
    if (state !== 'admitted') return;
    move('ENTER');
    const run = ++epoch;
    layer.hidden = false;
    $('#ending').hidden = true;
    caption.textContent = chapter==='vip'?'Acercándote a la mesa…':'Abriendo la puerta…';
    skipButton.hidden = false;
    pause.hidden = true;
    skipButton.focus({ preventScroll: true });
    await preload();
    if (epoch !== run) return;
    if (state === 'invitation' || reduced.matches || available.some(value => !value)) { finish(); return; }
    pause.hidden = false;
    tick = 0;
    step();
    timer = setInterval(step, 1000 / 6);
  }
  function admit() {
    if (state !== 'door') return;
    move('WIN');
    void preload();
  }
  function reset() {
    epoch++;
    stop();
    move('RESTART');
    layer.hidden = true;
    invitation.hidden = true;
    $('#cinematic-outcome').hidden = true;
    $('#continue').hidden=true;
    $('#continue-error').hidden=true;
    art.hidden = true;
    art.removeAttribute('src');
    art.style.transform = '';
    current = -1;
    paused = false;
    pause.textContent = 'Pausar';
    pause.setAttribute('aria-pressed', 'false');
  }
  function skip() { if (['entering', 'inside'].includes(state)) finish(); }
  const options = { signal: listeners.signal };
  $('#enter').addEventListener('click', start, options);
  skipButton.addEventListener('click', skip, options);
  $('#ending-restart').addEventListener('click', onRestart, options);
  $('#continue').addEventListener('click',onContinue,options);
  pause.addEventListener('click', () => {
    paused = !paused;
    pause.textContent = paused ? 'Continuar' : 'Pausar';
    pause.setAttribute('aria-pressed', String(paused));
  }, options);
  reduced.addEventListener('change', () => { if (reduced.matches) skip(); }, options);
  const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; });
  observer.observe(scene);
  function setChapter(next) {
    if(next===chapter)return;
    reset();chapter=next;loading=undefined;ready=false;available=[];
  }
  return { admit, start, skip, reset, setChapter, destroy() { reset(); listeners.abort(); observer.disconnect(); } };
}
