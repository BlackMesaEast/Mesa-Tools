const input = document.getElementById('search');
const cards = document.querySelectorAll('.tool-card');
const noResults = document.querySelector('.no-results');

function fuzzyScore(text, query) {
  let ti = 0, qi = 0, score = 0;
  while (ti < text.length && qi < query.length) {
    if (text[ti] === query[qi]) {
      score++;
      qi++;
    }
    ti++;
  }
  return qi === query.length ? score : -1;
}

input.addEventListener('input', () => {
  const query = input.value.trim().toLowerCase();
  let visible = 0;

  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    const match = !query || fuzzyScore(text, query) >= 0;
    card.hidden = !match;
    if (match) visible++;
  });

  noResults.style.display = visible === 0 ? 'block' : 'none';
});
