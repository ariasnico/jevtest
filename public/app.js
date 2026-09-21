import { initMotion } from './motion.js';
import { createTypewriter } from './typewriter.js';
import { createEnding } from './ending.js';

const $ = selector => document.querySelector(selector);
const write = createTypewriter($('#guard-line'), $('#guard-announcement'));
let pendingTurn;
let game;
let busy = true;
let audio;
let sound = false;
const ending = createEnding({ scene: $('#scene'), onRestart: start, onContinue: continueChapter });
const isVip=()=>game?.chapter==='vip';
function chapterUI() {
  const chapter=isVip()?'vip':'door';
  ending.setChapter(chapter);
  if($('#scene').dataset.chapter===chapter)return;
  $('#scene').dataset.chapter=chapter;
  const character=isVip()?'Clavicular':'el patova';
  $('#guard-bubble .speaker').textContent=isVip()?'CLAVICULAR':'EL PATOVA';
  $('#chapter-label').textContent=isVip()?'02 / LA MESA VIP':'01 / LA PUERTA';
  $('#chapter-goal').textContent=isVip()?'GANATE UN LUGAR':'CONVENCÉ AL PATOVA';
  $('#chapter-note').hidden=!isVip();
  $('.time').textContent=isVip()?'/ 03:12 AM':'/ 02:47 AM';
  $('#scene').setAttribute('aria-label',isVip()?'El VIP de Caramelo, con Clavicular':'En la puerta de Caramelo');
  $('.game').setAttribute('aria-label',isVip()?'Hacete amigo de Clavicular y ganate un lugar en su mesa VIP':'Convencé al patova para entrar a Caramelo');
  $('h1').textContent=isVip()?'Caramelo. La mesa VIP de Clavicular.':'Caramelo. Convencé al patova.';
  document.title=isVip()?'Caramelo — La mesa VIP':'Caramelo — ¿Estás en la lista?';
  $('label[for="message"]').textContent=`¿Qué le decís a ${character}?`.replace('a el','al');
  $('#send').setAttribute('aria-label',`Enviar mensaje a ${character}`.replace('a el','al'));
  $('label[for="trust"]').textContent=isVip()?'Afinidad con Clavicular':'Buena onda del patova';
  $('#message').placeholder=isVip()?'Mostrá qué onda traés…':'Tirá tu mejor chamuyo…';
  $('#hint').textContent=isVip()?'Seis intentos. Caele bien, no lo adules.':'Seis intentos. Convencelo.';
  const art=$('.scene-art');
  const src=isVip()?'/assets/vip/clavicular-vip.webp':'/assets/caramelo-door.png';
  art.alt=isVip()?'Parodia ficticia en ASCII: Clavicular frente a vos en el VIP, acompañado de cinco invitadas adultas con vestidos de fiesta.':'Arte ASCII: vos frente al patova en la puerta de Caramelo.';
  if(art.getAttribute('src')!==src){$('#art-error').hidden=true;art.src=src;}
}
function clearConversation() {
  pendingTurn=undefined;$('#messages').replaceChildren();$('#player-bubble').hidden=true;
  $('#player-line').textContent='';$('#message').value='';$('#count').textContent='0 / 280';$('#history').open=false;
  $('#error').hidden=true;$('#retry').hidden=true;
}

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
  $('#enter').disabled = busy;
  $('#ending-restart').disabled = busy;
  $('#continue').disabled=busy;
  $('#form').setAttribute('aria-busy', String(busy));
}
function render() {
  chapterUI();
  $('#guard-line').textContent = game.line;
  $('#guard-line').scrollTop = 0;
  $('#guard-bubble').dataset.pending = 'false';
  $('#mood').textContent = `◈ ${game.mood}`;
  $('#trust').value = game.score;
  $('#trust').textContent = `${game.score} de 100`;
  $('#turns').textContent = `INTENTOS ${game.turns} / ${game.maxTurns}`;
  $('#scene').classList.toggle('won', game.status === 'won');
  $('#ending').hidden = game.status === 'playing';
  if (game.status !== 'playing') {
    const won = game.status === 'won';
    $('#enter').hidden = !won;
    $('#again').hidden = won;
    $('#enter').textContent=isVip()?'Sentarme en la mesa':'Entrar';
    if (won) ending.admit();
    $('#ending-kicker').textContent = isVip()?(won?'NO FUE TU PERFIL. FUE TU ONDA.':'FIN DEL CAPÍTULO · EL VIP NO SE DIO'):won ? 'LA SOGA SE CORRIÓ. LA NOCHE ES TUYA.' : 'FIN DE LA NOCHE · SEGUÍS EN LA VEREDA';
    $('#ending-title').textContent = isVip()?(won?'Hay lugar para vos.':'Nos vemos en la pista.'):won ? 'Bienvenido a Caramelo.' : 'Hoy no, maestro.';
    $('#ending-copy').textContent = isVip()?(won?`Te ganaste un lugar en ${game.turns} intentos. La noche sigue con el grupo.`:'Seguís adentro de Caramelo, pero esta mesa no se abrió. Otra noche, otra historia.'):won ? `Lo lograste en ${game.turns} intentos. Sin lista, sin contactos. Puro chamuyo.` : 'El after en la vereda también tiene lo suyo. Respirá, inventá otra historia y volvé a intentarlo.';
    $('#hint').textContent = won ? 'Objetivo cumplido. Ya podés presumir.' : 'Cada noche es una nueva oportunidad.';
    (won ? $('#enter') : $('#again')).focus({ preventScroll: true });
  }
  controls();
}
async function request(path, body) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(23000) });
  const data = await response.json();
  if (!response.ok) {
    if (data.code === 'auth_required') location.replace('/login.html');
    if (response.status === 401 || ['stale', 'limit'].includes(data.code)) $('#retry').hidden = false;
    const error = new Error(data.error || 'No pudimos continuar la charla.');
    error.code = data.code;
    throw error;
  }
  return data;
}
function showError(error) {
  $('#error').textContent = error.name === 'TimeoutError' ? 'La respuesta está tardando. Volvé a intentarlo.' : error.message;
  $('#error').hidden = false;
}
async function start() {
  if (busy && game) return;
  ending.reset();
  busy = true;
  controls();
  $('#error').hidden = true;
  $('#retry').hidden = true;
  try {
    game = await request('/api/start', {});
    clearConversation();
    $('#hint').textContent = 'Seis intentos. Convencelo.';
    busy = false;
    render();
  } catch (error) { showError(error); $('#retry').hidden = false; }
  finally { busy = false; controls(); }
}
async function restore() {
  if(busy&&game)return;
  busy=true;controls();
  try {
    const data=await request('/api/resume',{});
    if(!data.game){busy=false;return await start();}
    ending.reset();game=data.game;clearConversation();busy=false;render();
  }catch(error){showError(error);$('#retry').hidden=false;}
  finally{busy=false;controls();}
}
async function continueChapter(event) {
  if(busy||!game||game.status!=='won'||isVip())return;
  busy=true;controls();$('#continue-error').hidden=true;
  try{
    const next=await request('/api/continue',{expectedVersion:game.version});
    ending.reset();game=next;clearConversation();busy=false;render();
    // Rare chapter transition: state indication, 200ms opacity-only. Keyboard
    // actions and reduced-motion preferences switch instantly.
    if(event?.detail>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches)
      $('#scene').animate([{opacity:.3},{opacity:1}],{duration:200,easing:'cubic-bezier(0.23, 1, 0.32, 1)'});
    $('#guard-line').focus({preventScroll:true});
  }catch(error){$('#continue-error').textContent=error.message;$('#continue-error').hidden=false;}
  finally{busy=false;controls();}
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
  if (pendingTurn && pendingTurn.message !== message) {
    showError(new Error('Primero reenviá el mensaje anterior para recuperar su respuesta, o empezá otra noche.'));
    $('#retry').hidden = false;
    return;
  }
  pendingTurn ??= { message, turnId: crypto.randomUUID(), expectedVersion: game.version };
  busy = true;
  controls();
  $('#error').hidden = true;
  $('#player-line').textContent = message;
  $('#player-line').scrollTop = 0;
  $('#player-bubble').hidden = false;
  $('#guard-bubble').dataset.pending = 'true';
  $('#guard-line').textContent = isVip()?'Te escucha por encima de la música…':'Te mira de arriba abajo. Está pensando…';
  try {
    game = await request('/api/talk', pendingTurn);
    pendingTurn = undefined;
    historyEntry('VOS', message);
    historyEntry(isVip()?'CLAVICULAR':'EL PATOVA', game.line);
    if ($('#message').value.trim() === message) {
      $('#message').value = '';
      $('#count').textContent = '0 / 280';
    }
    blip(game.status === 'won');
    $('#guard-bubble').dataset.pending = 'false';
    await write(game.line);
  } catch (error) {
    if (error.code && error.code !== 'pending') pendingTurn = undefined;
    showError(error);
  }
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
$('#retry').addEventListener('click', restore);
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
$('.scene-art').addEventListener('error',()=>{$('#art-error').hidden=false;});
$('.scene-art').addEventListener('load',()=>{$('#art-error').hidden=true;});
restore();
initMotion();
