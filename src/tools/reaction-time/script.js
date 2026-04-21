let state = 'idle';
let startTime = null;
let timeout = null;

function reactionTimeTest() {
  const screen = document.getElementById('Reaction-Screen');
  const message = document.getElementById('message');

  if (state === 'idle') {
    state = 'waiting';
    screen.style.background = '#a83832';
    message.textContent = 'wait for green...';

    const delay = (Math.floor(Math.random() * 8) + 3) * 1000;
    timeout = setTimeout(() => {
      state = 'ready';
      screen.style.backgroundColor = '#2a8a2a';
      message.textContent = 'Click!';
      startTime = Date.now();
    }, delay);
  } else if (state === 'waiting') {
    clearTimeout(timeout);
    state = 'idle';
    screen.style.backgroundColor = '#1a1a1a';
    message.textContent = 'Too soon! Click to try again';
  } else if (state === 'ready') {
    const ms = Date.now() - startTime;
    state = 'idle';
    screen.style.backgroundColor = 'rgb(83, 83, 216)';
    message.textContent = `${ms}ms - Click to try again.`;
  }
}
