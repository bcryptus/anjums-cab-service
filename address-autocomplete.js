// Photon provides search-as-you-type results from OpenStreetMap.
(() => {
  const cache = new Map();
  const popular = [
    { title: 'Amsterdam Schiphol Airport (AMS)', detail: 'Schiphol, Netherlands' },
    { title: 'Amsterdam Centraal Station', detail: 'Stationsplein, Amsterdam' },
    { title: 'Dam Square', detail: 'Dam, Amsterdam' },
    { title: 'RAI Amsterdam', detail: 'Europaplein 24, Amsterdam' }
  ];
  for (const id of ['pickup', 'destination']) {
    const input = document.getElementById(id);
    const wrapper = input.closest('.input-wrap');
    wrapper.classList.add('address-input');
    input.removeAttribute('list');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', `${id}-suggestions`);
    const panel = document.createElement('div');
    panel.className = 'address-panel';
    panel.hidden = true;
    const list = document.createElement('div');
    list.id = `${id}-suggestions`;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Suggested addresses');
    const status = document.createElement('div');
    status.className = 'address-status';
    status.setAttribute('role', 'status');
    const credit = document.createElement('div');
    credit.className = 'address-credit';
    credit.innerHTML = 'Search by Photon · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';
    panel.append(list, status, credit);
    wrapper.append(panel);
    let items = [], active = -1, timer, controller, generation = 0;
    function close() {
      generation++;
      clearTimeout(timer);
      controller?.abort();
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }
    function render(results, message) {
      items = results;
      active = -1;
      input.removeAttribute('aria-activedescendant');
      list.replaceChildren();
      results.forEach((item, index) => {
        const option = document.createElement('div');
        option.className = 'address-option';
        option.id = `${id}-option-${index}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        const title = document.createElement('strong');
        title.textContent = item.title;
        const detail = document.createElement('span');
        detail.textContent = item.detail;
        option.append(title, detail);
        option.addEventListener('mousedown', event => event.preventDefault());
        option.addEventListener('click', () => choose(index));
        list.append(option);
      });
      status.textContent = message;
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    function choose(index) {
      const item = items[index];
      if (!item) return;
      input.value = item.value || `${item.title}, ${item.detail}`;
      input.setCustomValidity('');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      close();
      input.focus();
    }
    function search() {
      clearTimeout(timer);
      controller?.abort();
      const version = ++generation;
      const query = input.value.trim();
      if (query.length < 3) {
        render(query ? [] : popular, query ? 'Type at least 3 characters to search addresses.' : 'Popular destinations · or start typing an address');
        return;
      }
      if (cache.has(query.toLowerCase())) {
        const found = cache.get(query.toLowerCase());
        render(found, found.length ? 'Select an address. Add a house number if needed.' : 'No addresses found. Try adding a city or enter the address manually.');
        return;
      }
      render([], 'Searching addresses…');
      timer = setTimeout(async () => {
        controller = new AbortController();
        const currentController = controller;
        const timeout = setTimeout(() => currentController.abort(), 8000);
        try {
          const params = new URLSearchParams({ q: query, lat: '52.3676', lon: '4.9041', limit: '6', lang: 'en' });
          const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: currentController.signal });
          if (!response.ok) throw new Error('Address service unavailable');
          const data = await response.json();
          const seen = new Set();
          const results = (data.features || []).map(feature => {
            const p = feature.properties || {};
            const street = [p.street, p.housenumber].filter(Boolean).join(' ');
            const title = p.name || street || p.city || p.locality;
            const detail = [...new Set([p.name && street, p.postcode, p.city || p.town || p.village || p.locality, p.country].filter(Boolean))].join(', ');
            return { title, detail, value: [...new Set([title, detail].filter(Boolean))].join(', ') };
          }).filter(item => {
            if (!item.title || seen.has(item.value)) return false;
            seen.add(item.value);
            return true;
          });
          if (generation !== version || document.activeElement !== input) return;
          if (cache.size >= 60) cache.delete(cache.keys().next().value);
          cache.set(query.toLowerCase(), results);
          render(results, results.length ? 'Select an address. Add a house number if needed.' : 'No addresses found. Try adding a city or enter the address manually.');
        } catch (error) {
          if (generation === version && document.activeElement === input) render([], 'Address search is unavailable. You can still enter the full address.');
        } finally {
          clearTimeout(timeout);
        }
      }, 400);
    }
    input.addEventListener('input', search);
    input.addEventListener('focus', search);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (panel.hidden) {
        if (event.key === 'ArrowDown') { event.preventDefault(); search(); }
        return;
      }
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && items.length) {
        event.preventDefault();
        active = (active + (event.key === 'ArrowDown' ? 1 : active === -1 ? 0 : -1) + items.length) % items.length;
        [...list.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === active)));
        input.setAttribute('aria-activedescendant', list.children[active].id);
        list.children[active].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter' && active >= 0) {
        event.preventDefault();
        choose(active);
      } else if (event.key === 'Tab') close();
    });
    wrapper.addEventListener('focusout', () => setTimeout(() => { if (!wrapper.contains(document.activeElement)) close(); }, 150));
    document.addEventListener('pointerdown', event => { if (!wrapper.contains(event.target)) close(); });
  }
})();
