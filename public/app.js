import { initMotion } from './motion.js';

const $ = selector => document.querySelector(selector);
let game;
let busy = true;
let audio;
let sound = false;

function blip(won = false) {
  if (!sound || !audio) return;
  const notes = won ? [261.63, 329.63, 392, 523.25] : [130.81, 164.81];
  notes.forEach((frequency, i) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, audio.currentTime + i * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + i * 0.09 + 0.15);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(audio.currentTime + i * 0.09);
    oscillator.stop(audio.currentTime + i * 0.09 + 0.16);
  });
}
function controls() {
  const disabled = busy || !game || game.status !== 'playing';
  // Keep the mobile keyboard open while a turn is in flight.
  $('#message').disabled = !game || game.status !== 'playing';
  $('#send').disabled = disabled;
  $('#again').disabled = busy;
  $('#form').setAttribute('aria-busy', String(busy));
}
function render() {
  $('#guard-line').textContent = game.line;
  $('#mood').textContent = `◈ ${game.mood}`;
  $('#trust').value = game.score;
  $('#trust').textContent = `${game.score} de 100`;
  $('#turns').textContent = `INTENTOS ${game.turns} / ${game.maxTurns}`;
  $('#scene').classList.toggle('won', game.status === 'won');
  $('#ending').hidden = game.status === 'playing';
  if (game.status !== 'playing') {
    const won = game.status === 'won';
    $('#ending-kicker').textContent = won ? 'LA SOGA SE CORRIÓ. LA NOCHE ES TUYA.' : 'FIN DE LA NOCHE · SEGUÍS EN LA VEREDA';
    $('#ending-title').textContent = won ? 'Bienvenido a Caramelo.' : 'Hoy no, maestro.';
    $('#ending-copy').textContent = won ? `Lo lograste en ${game.turns} intentos. Sin lista, sin contactos. Puro chamuyo.` : 'El after en la vereda también tiene lo suyo. Respirá, inventá otra historia y volvé a intentarlo.';
    $('#hint').textContent = won ? 'Objetivo cumplido. Ya podés presumir.' : 'Cada noche es una nueva oportunidad.';
    $('#again').focus();
  }
  controls();
}
async function request(path, body) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) $('#retry').hidden = false;
    throw new Error(data.error || 'No pudimos hablar con el patova.');
  }
  return data;
}
function showError(error) {
  $('#error').textContent = error.name === 'TimeoutError' ? 'La respuesta está tardando. Volvé a intentarlo.' : error.message;
  $('#error').hidden = false;
}
async function start() {
  busy = true;
  controls();
  $('#error').hidden = true;
  $('#retry').hidden = true;
  try {
    game = await request('/api/start', {});
    $('#messages').replaceChildren();
    $('#message').value = '';
    $('#count').textContent = '0 / 280';
    $('#hint').textContent = 'No estás en la lista. Hacelo cambiar de opinión.';
    $('#history').open = false;
    busy = false;
    render();
  } catch (error) { showError(error); $('#retry').hidden = false; }
  finally { busy = false; controls(); }
}
function historyEntry(who, text) {
  const li = document.createElement('li');
  const name = document.createElement('b');
  const paragraph = document.createElement('p');
  name.textContent = who;
  paragraph.textContent = text;
  li.append(name, paragraph);
  $('#messages').append(li);
}
$('#form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = $('#message').value.trim();
  if (busy || !message || game?.status !== 'playing') return;
  busy = true;
  controls();
  $('#error').hidden = true;
  $('#guard-line').textContent = 'Te mira de arriba abajo. Está pensando…';
  try {
    game = await request('/api/talk', { message });
    historyEntry('VOS', message);
    historyEntry('EL PATOVA', game.line);
    if ($('#message').value.trim() === message) {
      $('#message').value = '';
      $('#count').textContent = '0 / 280';
    }
    blip(game.status === 'won');
  } catch (error) { showError(error); }
  finally {
    busy = false;
    render();
    if (game.status === 'playing' && matchMedia('(pointer: fine)').matches) $('#message').focus();
  }
});
$('#message').addEventListener('input', event => { $('#count').textContent = `${event.target.value.length} / 280`; });
$('#message').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!busy) $('#form').requestSubmit();
  }
});
$('#again').addEventListener('click', start);
$('#retry').addEventListener('click', start);
$('#sound').addEventListener('click', async () => {
  try {
    audio ??= new AudioContext();
    await audio.resume();
    sound = !sound;
    $('#sound').setAttribute('aria-pressed', String(sound));
    $('#sound').setAttribute('aria-label', sound ? 'Desactivar sonido' : 'Activar sonido');
    $('#sound').textContent = sound ? '♪ SONIDO ON' : '♪ SONIDO OFF';
    blip();
  } catch { $('#sound').textContent = 'SONIDO NO DISPONIBLE'; }
});
start();
initMotion();
