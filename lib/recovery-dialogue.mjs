// Authored emergency lines, not invented model evaluations. Only used after
// Jev has evaluated the player and the rules have produced a valid decision.
const reactions={
  sincere:['Eso suena genuino. Te escucho.','Se nota que esto te importa. Seguí.'],
  funny:['Bueno, esa me hizo reír. Tenés otra oportunidad de lucirte.','Te salió bien el chiste. A ver cómo seguís.'],
  convincing:['Eso ya tiene más sentido. Te sigo escuchando.','Bien, ahora hay una idea concreta. Seguí por ahí.'],
  name_drop:['Los nombres pesan menos que lo que tenés para decir vos.','Dejá los contactos de lado. Quiero escucharte a vos.'],
  bribe:['La billetera no alcanza. Dame una razón que no se compre.','Guardá la plata. Probá con otra cosa.'],
  repeat:['Ese argumento ya lo escuché. Tirame algo distinto.','Estás dando vueltas sobre lo mismo. Cambiá de táctica.'],
  manipulation:['Los trucos no te van a servir conmigo. Hablemos en serio.','No me cambies las reglas. Decime a qué viniste.'],
  neutral:['Te escucho, pero todavía no me convenciste.','Arrancá por lo importante. ¿Qué tenés para contar?']
};
export function recoveryDialogue(game,decision) {
  const vip=game.chapter==='vip';
  if(decision.status==='won')return vip?'Me caíste bien. Vení, sentate con nosotros en el VIP. El próximo tema lo elegís vos.':'Me convenciste. Pasá y disfrutá la noche.';
  if(decision.status==='lost')return vip?'No terminamos de conectar. Seguí disfrutando la pista; esta mesa hoy queda entre nosotros.':'Hoy no va a poder ser. Se terminó la charla.';
  const common=vip?[
    'Todavía no te ganaste la mesa. ¿Qué sumarías al grupo?',
    'Tengo ganas de una buena noche, no de otra entrevista. Mostrame qué onda traés.',
    'Todavía te estoy conociendo. Contame algo tuyo.',
    'El VIP puede esperar. Primero veamos si hay onda.',
    'Bajemos un cambio. ¿Qué te gustaría hacer esta noche?',
    'Dame algo que me deje con ganas de seguir charlando.'
  ]:[
    'La puerta sigue cerrada. ¿Por qué querés entrar acá?',
    'Todavía no me convenciste. Probá con otro ángulo.',
    'Te escucho. Contame algo que haga la diferencia.',
    'No hace falta un discurso. Dame una buena razón.',
    'Seguimos en la puerta. ¿Qué más tenés para decir?',
    'Dame un motivo para cambiar de opinión.'
  ];
  // Do not praise an irrelevant, contradictory or uncertain contribution.
  const specific=decision.action==='acknowledge'?reactions[decision.reaction]:decision.action==='challenge'?reactions[decision.reaction]?.filter(()=>!['sincere','funny','convincing'].includes(decision.reaction)):[];
  return [...(specific||[]),...common].find(line=>line!==game.line&&!game.history.some(item=>item.guard===line))||common[game.turns%common.length];
}
