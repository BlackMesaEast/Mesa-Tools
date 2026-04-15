const input = document.getElementById('search');
const cards = document.querySelectorAll('.tool-card');
const noResults = document.querySelector('.no-results');

input.addEventListener('input', () => {
  const query = input.value.trim().toLowerCase();
  let visible = 0;

  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    const match = !query || text.includes(query);
    card.hidden = !match;
    if (match) visible++;
  });

  noResults.style.display = visible === 0 ? 'block' : 'none';
});
