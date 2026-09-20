// Reveal only validated dialogue. Reserve the complete text's layout throughout.
export function createTypewriter(element, announcement) {
  let finish = () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  element.addEventListener('click', () => finish());
  element.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); finish(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });
  reduced.addEventListener('change', () => { if (reduced.matches) finish(); });
  return function write(text, animate = true) {
    finish();
    announcement.textContent = '';
    element.textContent = text;
    if (!animate || reduced.matches || document.hidden) {
      announcement.textContent = text;
      return Promise.resolve();
    }
    const ghost = document.createElement('span');
    ghost.textContent = text;
    ghost.style.visibility = 'hidden';
    const visible = document.createElement('span');
    ghost.setAttribute('aria-hidden', 'true');
    visible.setAttribute('aria-hidden', 'true');
    element.replaceChildren(ghost, visible);
    element.classList.add('typing');
    element.setAttribute('aria-label', 'El patova está respondiendo. Enter o tocar para mostrar todo.');
    const characters = [...text];
    let position = 0;
    return new Promise(resolve => {
      const timer = setInterval(() => {
        position += 2;
        visible.textContent = characters.slice(0, position).join('');
        if (position >= characters.length) finish();
      }, 20);
      finish = () => {
        clearInterval(timer);
        element.textContent = text;
        element.classList.remove('typing');
        element.removeAttribute('aria-label');
        announcement.textContent = text;
        finish = () => {};
        resolve();
      };
    });
  };
}
