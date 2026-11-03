/**
 * Heirloom Kitchen Garden Almanac Interactive Controller
 * Handles superpower filtering, live botanical search, MSU soil temp sequence sorting,
 * and status telemetry.
 */
document.addEventListener('DOMContentLoaded', () => {
  const filterPills = document.querySelectorAll('.ha-pill-btn');
  const searchInput = document.getElementById('ha-crop-search');
  const sortToggle = document.getElementById('ha-sort-temp-toggle');
  const statusCounter = document.getElementById('ha-status-count');
  const grid = document.getElementById('ha-almanac-grid');
  const cards = Array.from(document.querySelectorAll('.wf-story'));

  let activeFilter = 'all';
  let searchTerm = '';
  let sortByTemp = false;

  // Preserve original DOM order
  const originalOrder = [...cards];

  function applyFilters() {
    let visibleCount = 0;

    cards.forEach(card => {
      const superpowers = (card.dataset.superpowers || '').split(' ');
      const title = (card.querySelector('.ha-card-title')?.textContent || '').toLowerCase();
      const latin = (card.querySelector('.ha-botanical-name')?.textContent || '').toLowerCase();
      const text = (card.textContent || '').toLowerCase();

      const matchesFilter = (activeFilter === 'all') || superpowers.includes(activeFilter);
      const matchesSearch = !searchTerm || title.includes(searchTerm) || latin.includes(searchTerm) || text.includes(searchTerm);

      if (matchesFilter && matchesSearch) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (statusCounter) {
      statusCounter.textContent = `Showing ${visibleCount} of ${cards.length} heirloom varieties`;
    }
  }

  // Filter pills click
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter || 'all';
      applyFilters();
    });
  });

  // Search input live
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  // MSU Soil Temperature sorting toggle
  if (sortToggle && grid) {
    sortToggle.addEventListener('click', () => {
      sortByTemp = !sortByTemp;
      if (sortByTemp) {
        sortToggle.innerHTML = '<span>&#8593;&#8595;</span> Sorted by Soil Temp (Coldest First)';
        sortToggle.style.background = 'var(--almanac-gold-soft)';
        sortToggle.style.borderColor = 'var(--almanac-gold)';

        const sorted = [...cards].sort((a, b) => {
          const tempA = parseInt(a.dataset.soilTempMin || '50', 10);
          const tempB = parseInt(b.dataset.soilTempMin || '50', 10);
          return tempA - tempB;
        });

        sorted.forEach(card => grid.appendChild(card));
      } else {
        sortToggle.innerHTML = '<span>&#8593;&#8595;</span> Sort: Default Almanac Order';
        sortToggle.style.background = '#ffffff';
        sortToggle.style.borderColor = 'var(--almanac-border)';

        originalOrder.forEach(card => grid.appendChild(card));
      }
      applyFilters();
    });
  }

  // Initial count
  applyFilters();
});
