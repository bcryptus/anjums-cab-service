// Route-based estimated fares for Anjum's Cab Service.
// Rates include 9% Dutch VAT and are rounded up to the nearest €0.50.
(() => {
  const SCHIPHOL = { lat: 52.3105, lon: 4.7634 };
  const AMSTERDAM_CENTRE = { lat: 52.3676, lon: 4.9041 };
  const money = new Intl.NumberFormat('en-NL', { style: 'currency', currency: 'EUR' });
  const routeCache = new Map();
  const preview = document.getElementById('fare-preview');
  const tripForm = document.getElementById('trip-form');
  const submitButton = tripForm.querySelector('button[type="submit"]');
  let previewTimer;
  let previewVersion = 0;

  const distanceBetween = (a, b) => {
    const radians = value => value * Math.PI / 180;
    const dLat = radians(b.lat - a.lat);
    const dLon = radians(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };

  const tieredDistanceCharge = (km, tiers) => {
    let remaining = km;
    return tiers.reduce((total, [band, rate]) => {
      const portion = Math.min(remaining, band);
      remaining -= portion;
      return total + portion * rate;
    }, 0);
  };

  const roundUpHalf = value => Math.ceil(value * 2) / 2;
  const selectedPoint = input => input.dataset.lat && input.dataset.lon
    ? { lat: Number(input.dataset.lat), lon: Number(input.dataset.lon), label: input.value.trim() }
    : null;

  async function geocode(input) {
    const selected = selectedPoint(input);
    if (selected) return selected;
    const query = input.value.trim();
    if (!query) throw new Error('Address missing');
    const params = new URLSearchParams({ q: query, lat: '52.3676', lon: '4.9041', limit: '1', lang: 'en' });
    const response = await fetch(`https://photon.komoot.io/api/?${params}`);
    if (!response.ok) throw new Error('Address lookup unavailable');
    const feature = (await response.json()).features?.[0];
    if (!feature) throw new Error('Address not found');
    const [lon, lat] = feature.geometry.coordinates;
    input.dataset.lon = lon;
    input.dataset.lat = lat;
    return { lon, lat, label: query };
  }

  async function getRoute(from, to) {
    const key = `${from.lon.toFixed(5)},${from.lat.toFixed(5)};${to.lon.toFixed(5)},${to.lat.toFixed(5)}`;
    if (routeCache.has(key)) return routeCache.get(key);
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${key}?overview=false&alternatives=false&steps=false`);
    if (!response.ok) throw new Error('Route service unavailable');
    const route = (await response.json()).routes?.[0];
    if (!route) throw new Error('No driving route found');
    const result = { km: route.distance / 1000, minutes: route.duration / 60 };
    if (routeCache.size >= 40) routeCache.delete(routeCache.keys().next().value);
    routeCache.set(key, result);
    return result;
  }

  function timeAllowances(when, airport) {
    const additions = [];
    if (!when || Number.isNaN(when.getTime())) return additions;
    const leadHours = (when.getTime() - Date.now()) / 3600000;
    if (leadHours > 0 && leadHours < 24) additions.push({ label: 'Short notice', amount: 7.5 });
    if (!airport && (when.getHours() >= 23 || when.getHours() < 6)) additions.push({ label: 'Night pickup', amount: 5 });
    const weekday = when.getDay() > 0 && when.getDay() < 6;
    const hour = when.getHours() + when.getMinutes() / 60;
    if (!airport && weekday && ((hour >= 7 && hour < 9.5) || (hour >= 16 && hour < 18.5))) {
      additions.push({ label: 'Peak traffic allowance', amount: 3 });
    }
    return additions;
  }

  function calculateLeg(from, to, route, when) {
    const fromSchiphol = distanceBetween(from, SCHIPHOL) < 4.5;
    const toSchiphol = distanceBetween(to, SCHIPHOL) < 4.5;
    const airport = fromSchiphol || toSchiphol;
    let raw;
    if (airport) {
      const distanceCharge = tieredDistanceCharge(route.km, [[20, 1.15], [30, 0.85], [Infinity, 0.60]]);
      raw = 18 + distanceCharge + route.minutes * 0.18;
      const nearby = route.km < 12;
      raw = Math.max(raw, fromSchiphol ? (nearby ? 49 : 55) : (nearby ? 39 : 45));
    } else {
      const distanceCharge = tieredDistanceCharge(route.km, [[10, 2.05], [20, 1.55], [Infinity, 1.15]]);
      raw = Math.max(18, 4.5 + distanceCharge + route.minutes * 0.34);
    }
    const additions = timeAllowances(when, airport);
    const pickupDistanceFromAmsterdam = distanceBetween(from, AMSTERDAM_CENTRE);
    if (pickupDistanceFromAmsterdam > 15) {
      additions.push({ label: 'Outside Amsterdam pickup', amount: roundUpHalf((pickupDistanceFromAmsterdam - 15) * 0.75) });
    }
    const total = roundUpHalf(raw + additions.reduce((sum, item) => sum + item.amount, 0));
    return {
      total,
      additions,
      airport,
      direction: fromSchiphol ? 'From Schiphol' : toSchiphol ? 'To Schiphol' : 'City / regional ride',
      meterMaximum: 4.31 + route.km * 3.17 + route.minutes * 0.52
    };
  }

  async function estimateCurrentTrip() {
    const pickup = document.getElementById('pickup');
    const destination = document.getElementById('destination');
    const [from, to] = await Promise.all([geocode(pickup), geocode(destination)]);
    const route = await getRoute(from, to);
    if (route.km > 180) throw new Error('Long-distance journeys need a personal quote');
    const when = new Date(`${document.getElementById('date').value}T${document.getElementById('time').value}`);
    const outbound = calculateLeg(from, to, route, when);
    const type = document.querySelector('[data-type].active')?.dataset.type || 'One way';
    let fare = outbound.total;
    let returnLeg = null;
    if (type === 'Return') {
      const returnValue = document.getElementById('return-date').value;
      if (!returnValue) throw new Error('Choose the return date and time');
      returnLeg = calculateLeg(to, from, route, new Date(returnValue));
      fare += returnLeg.total;
    }
    return {
      fare,
      outwardFare: outbound.total,
      returnFare: returnLeg?.total,
      km: route.km,
      minutes: route.minutes,
      meterMaximum: outbound.meterMaximum * (returnLeg ? 2 : 1),
      direction: outbound.direction,
      additions: [...outbound.additions, ...(returnLeg?.additions || [])]
    };
  }

  function renderPreview(estimate, state = 'ready') {
    preview.className = `fare-preview ${state === 'loading' ? 'loading' : state === 'error' ? 'error' : ''}`;
    preview.replaceChildren();
    const copy = document.createElement('div');
    copy.className = 'fare-preview-copy';
    const kicker = document.createElement('div');
    kicker.className = 'fare-preview-kicker';
    kicker.textContent = state === 'ready' ? 'ESTIMATED FARE · INCLUDING 9% VAT' : 'UPFRONT PRICE ESTIMATE';
    const title = document.createElement('div');
    title.className = 'fare-preview-title';
    const detail = document.createElement('div');
    detail.className = 'fare-preview-detail';
    const price = document.createElement('div');
    price.className = 'fare-preview-price';
    if (state === 'ready') {
      title.textContent = estimate.returnFare ? `${estimate.direction} · return journey` : estimate.direction;
      detail.textContent = `${estimate.km.toFixed(1)} km · about ${Math.round(estimate.minutes)} min each way · fare confirmed with availability`;
      price.textContent = money.format(estimate.fare);
      if (estimate.additions.length) {
        const chips = document.createElement('div');
        chips.className = 'fare-breakdown';
        [...new Set(estimate.additions.map(item => item.label))].forEach(label => {
          const chip = document.createElement('span');
          chip.className = 'fare-chip';
          chip.textContent = label;
          chips.append(chip);
        });
        copy.append(kicker, title, detail, chips);
      } else copy.append(kicker, title, detail);
    } else {
      title.textContent = state === 'loading' ? 'Calculating the driving route…' : estimate;
      detail.textContent = state === 'loading' ? 'This usually takes a moment.' : 'You can still submit a request for a personal quote.';
      price.textContent = state === 'loading' ? 'ONE MOMENT' : 'QUOTE';
      copy.append(kicker, title, detail);
    }
    preview.append(copy, price);
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    const pickup = selectedPoint(document.getElementById('pickup'));
    const destination = selectedPoint(document.getElementById('destination'));
    if (!pickup || !destination) {
      renderPreview('Select both addresses from the suggestions to see your fare.', 'error');
      return;
    }
    const version = ++previewVersion;
    renderPreview(null, 'loading');
    previewTimer = setTimeout(async () => {
      try {
        const estimate = await estimateCurrentTrip();
        if (version === previewVersion) renderPreview(estimate);
      } catch (error) {
        if (version === previewVersion) renderPreview(error.message, 'error');
      }
    }, 250);
  }

  document.addEventListener('address-selected', schedulePreview);
  for (const id of ['date', 'time', 'return-date']) document.getElementById(id).addEventListener('change', schedulePreview);
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-type], [data-service]');
    if (!trigger) return;
    setTimeout(() => {
      const type = trigger.dataset.type || trigger.dataset.service;
      if (type === 'Airport transfer') {
        const destination = document.getElementById('destination');
        if (/schiphol/i.test(destination.value)) {
          destination.dataset.lon = SCHIPHOL.lon;
          destination.dataset.lat = SCHIPHOL.lat;
        }
      }
      schedulePreview();
    });
  });

  tripForm.onsubmit = async event => {
    event.preventDefault();
    const pickup = document.getElementById('pickup');
    const destination = document.getElementById('destination');
    const date = document.getElementById('date');
    const time = document.getElementById('time');
    const ret = document.getElementById('return-date');
    pickup.setCustomValidity(pickup.value.trim() ? '' : 'Enter a pickup location.');
    destination.setCustomValidity(destination.value.trim() === pickup.value.trim() ? 'Choose a different drop-off location.' : destination.value.trim() ? '' : 'Enter a drop-off location.');
    time.setCustomValidity(new Date(`${date.value}T${time.value}`) <= new Date() ? 'Choose a future pickup time.' : '');
    ret.setCustomValidity(tripType === 'Return' && new Date(ret.value) <= new Date(`${date.value}T${time.value}`) ? 'Return must be after pickup.' : '');
    if (!tripForm.reportValidity()) return;
    const original = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.textContent = 'Calculating fare…';
    let estimate = null;
    try { estimate = await estimateCurrentTrip(); } catch (error) { renderPreview(error.message, 'error'); }
    tripRows = [
      ['Journey', tripType],
      ['From', pickup.value.trim()],
      ['To', destination.value.trim()],
      ['Pickup', `${new Date(`${date.value}T${time.value}`).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} (Amsterdam local time)`]
    ];
    if (tripType === 'Return') tripRows.push(['Return', `${new Date(ret.value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} (Amsterdam local time)`]);
    if (estimate) {
      tripRows.push(['Route estimate', `${estimate.km.toFixed(1)} km · about ${Math.round(estimate.minutes)} min${estimate.returnFare ? ' each way' : ''}`]);
      tripRows.push(['Estimated fare', `${money.format(estimate.fare)} including 9% VAT · subject to confirmation`]);
    } else tripRows.push(['Estimated fare', 'Personal quote required']);
    summary(document.getElementById('trip-summary'), tripRows);
    document.getElementById('details-step').classList.remove('hidden');
    document.getElementById('success-step').classList.add('hidden');
    dialog.showModal();
    submitButton.disabled = false;
    submitButton.innerHTML = original;
  };

  renderPreview('Select both addresses from the suggestions to see your fare.', 'error');
})();
