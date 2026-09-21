const transitions = {
  door: { WIN: 'admitted' }, admitted: { ENTER: 'entering' },
  entering: { ARRIVE: 'inside', SKIP: 'invitation' },
  inside: { INVITE: 'invitation', SKIP: 'invitation' },
  invitation: { FINISH: 'complete' }, complete: {}
};
export function nextEnding(state, event) {
  return event === 'RESTART' ? 'door' : transitions[state]?.[event] ?? state;
}
export const endingFrames = [
  { src: '/assets/ending/01-step-aside.webp', holdFrames: 6, phase: 'entering', caption: 'La soga se corre.' },
  { src: '/assets/ending/02-rope.webp', holdFrames: 6, phase: 'entering', caption: 'Esta vez, sí estás en la lista.' },
  { src: '/assets/ending/03-threshold.webp', holdFrames: 9, phase: 'entering', caption: 'Dejás la vereda atrás.' },
  { src: '/assets/ending/04-inside.webp', holdFrames: 9, phase: 'inside', caption: 'El bajo se siente en el pecho.' },
  { src: '/assets/ending/05-invite.webp', holdFrames: 9, phase: 'inside', caption: 'Parece que la noche recién empieza.' },
  { src: '/assets/ending/06-table.webp', holdFrames: 9, phase: 'inside', caption: 'Y ya tenés con quién compartirla.' }
];
export const vipEndingFrames = [
  {src:'/assets/vip/clavicular-vip.webp',holdFrames:6,phase:'entering',caption:'Se corre y te hace lugar.'},
  {src:'/assets/vip/vip-table.webp',holdFrames:18,phase:'inside',caption:'Esta vez, la mesa también es tuya.'}
];
