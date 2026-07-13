/* ============================================================
   UniConvert — Unit Converter Module
   ============================================================
   A fully functional, polished unit converter with real
   conversion formulas. Imported as an ES module.
   ============================================================ */

// ── Conversion Data ─────────────────────────────────────────

const CATEGORIES = {
  Length: {
    icon: '📏',
    units: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'],
    labels: {
      mm: 'Millimeters (mm)',
      cm: 'Centimeters (cm)',
      m: 'Meters (m)',
      km: 'Kilometers (km)',
      in: 'Inches (in)',
      ft: 'Feet (ft)',
      yd: 'Yards (yd)',
      mi: 'Miles (mi)',
    },
    // All values relative to meters
    toBase: {
      mm: 0.001,
      cm: 0.01,
      m: 1,
      km: 1000,
      in: 0.0254,
      ft: 0.3048,
      yd: 0.9144,
      mi: 1609.344,
    },
  },

  Weight: {
    icon: '⚖️',
    units: ['mg', 'g', 'kg', 'lb', 'oz'],
    labels: {
      mg: 'Milligrams (mg)',
      g: 'Grams (g)',
      kg: 'Kilograms (kg)',
      lb: 'Pounds (lb)',
      oz: 'Ounces (oz)',
    },
    // All values relative to grams
    toBase: {
      mg: 0.001,
      g: 1,
      kg: 1000,
      lb: 453.59237,
      oz: 28.349523125,
    },
  },

  Temperature: {
    icon: '🌡️',
    units: ['C', 'F', 'K'],
    labels: {
      C: 'Celsius (°C)',
      F: 'Fahrenheit (°F)',
      K: 'Kelvin (K)',
    },
    // Special handling — not ratio-based
    custom: true,
  },

  Volume: {
    icon: '🧪',
    units: ['ml', 'L', 'gal', 'fl oz', 'cup'],
    labels: {
      ml: 'Milliliters (ml)',
      L: 'Liters (L)',
      gal: 'Gallons (gal)',
      'fl oz': 'Fluid Ounces (fl oz)',
      cup: 'Cups (cup)',
    },
    // All values relative to milliliters
    toBase: {
      ml: 1,
      L: 1000,
      gal: 3785.41178,
      'fl oz': 29.5735296,
      cup: 236.588237,
    },
  },

  Speed: {
    icon: '💨',
    units: ['m/s', 'km/h', 'mph', 'knots'],
    labels: {
      'm/s': 'Meters/sec (m/s)',
      'km/h': 'Kilometers/hr (km/h)',
      mph: 'Miles/hr (mph)',
      knots: 'Knots (kn)',
    },
    // All values relative to m/s
    toBase: {
      'm/s': 1,
      'km/h': 1 / 3.6,
      mph: 0.44704,
      knots: 0.514444,
    },
  },

  Area: {
    icon: '📐',
    units: ['mm²', 'cm²', 'm²', 'km²', 'ft²', 'acre'],
    labels: {
      'mm²': 'Sq Millimeters (mm²)',
      'cm²': 'Sq Centimeters (cm²)',
      'm²': 'Sq Meters (m²)',
      'km²': 'Sq Kilometers (km²)',
      'ft²': 'Sq Feet (ft²)',
      acre: 'Acres (acre)',
    },
    // All values relative to m²
    toBase: {
      'mm²': 1e-6,
      'cm²': 1e-4,
      'm²': 1,
      'km²': 1e6,
      'ft²': 0.09290304,
      acre: 4046.8564224,
    },
  },
};

// ── Temperature Conversion Functions ────────────────────────

function convertTemperature(value, from, to) {
  if (from === to) return value;

  // Convert to Celsius first
  let celsius;
  switch (from) {
    case 'C':
      celsius = value;
      break;
    case 'F':
      celsius = (value - 32) * (5 / 9);
      break;
    case 'K':
      celsius = value - 273.15;
      break;
    default:
      return NaN;
  }

  // Convert from Celsius to target
  switch (to) {
    case 'C':
      return celsius;
    case 'F':
      return celsius * (9 / 5) + 32;
    case 'K':
      return celsius + 273.15;
    default:
      return NaN;
  }
}

// ── Generic Conversion ──────────────────────────────────────

function convert(category, value, fromUnit, toUnit) {
  if (isNaN(value) || value === '') return '';

  const numValue = parseFloat(value);
  const cat = CATEGORIES[category];

  if (cat.custom) {
    // Temperature
    const result = convertTemperature(numValue, fromUnit, toUnit);
    return formatResult(result);
  }

  // Standard ratio conversion: value * (fromFactor / toFactor)
  const fromFactor = cat.toBase[fromUnit];
  const toFactor = cat.toBase[toUnit];
  const result = numValue * (fromFactor / toFactor);
  return formatResult(result);
}

function formatResult(num) {
  if (isNaN(num) || !isFinite(num)) return '';

  // Use toPrecision for very large or very small numbers
  const abs = Math.abs(num);
  if (abs === 0) return '0';
  if (abs >= 1e10 || (abs < 1e-6 && abs > 0)) {
    return num.toExponential(6);
  }

  // Smart decimal formatting — avoid unnecessary trailing zeros
  const decimals = abs < 0.01 ? 8 : abs < 1 ? 6 : abs < 100 ? 4 : 2;
  const formatted = parseFloat(num.toFixed(decimals));
  return formatted.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

// ── SVG Icons ───────────────────────────────────────────────

const SWAP_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`;

const LOGO_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;

// ── DOM Builder Helpers ─────────────────────────────────────

function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else if (key.startsWith('on')) {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child) {
      element.appendChild(child);
    }
  }

  return element;
}

// ── Main Init Function ──────────────────────────────────────

export function initConverter(container) {
  let activeCategory = 'Length';
  let fromUnit = CATEGORIES[activeCategory].units[0];
  let toUnit = CATEGORIES[activeCategory].units[1];

  // References
  let inputEl, resultEl, fromSelectEl, toSelectEl, pillsContainer;

  // ── Build UI ──────────────────────────────────────────────

  const app = el('div', { className: 'converter-app' });

  // Header
  const header = el('div', { className: 'converter-header' });
  const logo = el('div', {
    className: 'converter-logo',
    id: 'converter-logo',
    innerHTML: LOGO_ICON,
    title: 'UniConvert',
  });
  const title = el('h1', {
    innerHTML: 'Uni<span>Convert</span>',
  });
  const subtitle = el('p', {
    textContent: 'Fast, accurate unit conversions',
    style: {
      color: 'var(--text-secondary)',
      fontSize: '0.9rem',
      marginTop: 'var(--space-2xs)',
    },
  });
  header.appendChild(logo);
  header.appendChild(title);
  header.appendChild(subtitle);

  // Category Pills
  pillsContainer = el('div', { className: 'categories-container' });
  buildPills();

  // Conversion Card
  const card = el('div', { className: 'converter-card' });
  const conversionRow = el('div', { className: 'converter-row' });

  // FROM group
  const fromGroup = el('div', { className: 'converter-unit-group' });
  const fromLabel = el('label', { textContent: 'From' });
  inputEl = el('input', {
    className: 'converter-input',
    type: 'text',
    inputmode: 'decimal',
    placeholder: '0',
    value: '',
    onInput: handleConversion,
  });
  fromSelectEl = el('select', {
    className: 'unit-select',
    onChange: handleConversion,
  });
  fromGroup.appendChild(fromLabel);
  fromGroup.appendChild(inputEl);
  fromGroup.appendChild(fromSelectEl);

  // Swap Button
  const swapWrapper = el('div', { className: 'swap-btn-container' });
  const swapBtn = el('button', {
    className: 'swap-btn',
    innerHTML: SWAP_ICON,
    title: 'Swap units',
    onClick: handleSwap,
  });
  swapWrapper.appendChild(swapBtn);

  // TO group
  const toGroup = el('div', { className: 'converter-unit-group' });
  const toLabel = el('label', { textContent: 'To' });
  resultEl = el('input', {
    className: 'converter-input result',
    type: 'text',
    placeholder: '0',
    readOnly: true,
    tabIndex: -1,
  });
  toSelectEl = el('select', {
    className: 'unit-select',
    onChange: handleConversion,
  });
  toGroup.appendChild(toLabel);
  toGroup.appendChild(resultEl);
  toGroup.appendChild(toSelectEl);

  // Assemble conversion row
  conversionRow.appendChild(fromGroup);
  conversionRow.appendChild(swapWrapper);
  conversionRow.appendChild(toGroup);
  card.appendChild(conversionRow);

  // Footer
  const footer = el('div', {
    className: 'converter-footer',
    textContent: '© 2026 UniConvert · All rights reserved',
  });

  // Assemble app
  app.appendChild(header);
  app.appendChild(pillsContainer);
  app.appendChild(card);
  app.appendChild(footer);

  // Populate selects for the initial category
  populateSelects(activeCategory);

  // Attach to DOM
  container.innerHTML = '';
  container.appendChild(app);

  // ── Build Category Pills ──────────────────────────────────

  function buildPills() {
    pillsContainer.innerHTML = '';
    for (const [name, data] of Object.entries(CATEGORIES)) {
      const pill = el('button', {
        className: `category-pill${name === activeCategory ? ' active' : ''}`,
        textContent: `${data.icon} ${name}`,
        onClick: () => selectCategory(name),
      });
      pillsContainer.appendChild(pill);
    }
  }

  // ── Select Category ───────────────────────────────────────

  function selectCategory(name) {
    if (name === activeCategory) return;
    activeCategory = name;

    // Update pills
    pillsContainer.querySelectorAll('.category-pill').forEach((p, i) => {
      const catName = Object.keys(CATEGORIES)[i];
      p.classList.toggle('active', catName === name);
    });

    // Populate selects for the new category
    populateSelects(name);

    // Animate card
    const card = container.querySelector('.converter-card');
    card.classList.remove('scale-in');
    // Trigger reflow
    void card.offsetWidth;
    card.classList.add('scale-in');

    // Re-convert
    handleConversion();
  }

  // ── Populate Select Dropdowns ─────────────────────────────

  function populateSelects(category) {
    const cat = CATEGORIES[category];
    const units = cat.units;

    fromUnit = units[0];
    toUnit = units.length > 1 ? units[1] : units[0];

    fromSelectEl.innerHTML = '';
    toSelectEl.innerHTML = '';

    for (const unit of units) {
      const label = cat.labels[unit];

      const fromOpt = el('option', { value: unit, textContent: label });
      if (unit === fromUnit) fromOpt.selected = true;
      fromSelectEl.appendChild(fromOpt);

      const toOpt = el('option', { value: unit, textContent: label });
      if (unit === toUnit) toOpt.selected = true;
      toSelectEl.appendChild(toOpt);
    }
  }

  // ── Handle Conversion ─────────────────────────────────────

  function handleConversion() {
    const from = fromSelectEl.value;
    const to = toSelectEl.value;
    const rawValue = inputEl.value.trim();

    if (rawValue === '' || rawValue === '-') {
      resultEl.value = '';
      return;
    }

    // Allow only valid numeric input (including negatives and decimals)
    const numericRegex = /^-?\d*\.?\d*$/;
    if (!numericRegex.test(rawValue)) {
      resultEl.value = '';
      return;
    }

    const result = convert(activeCategory, rawValue, from, to);
    resultEl.value = result;

    // Subtle pulse on result
    resultEl.style.transition = 'none';
    resultEl.style.transform = 'scale(1.01)';
    requestAnimationFrame(() => {
      resultEl.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
      resultEl.style.transform = 'scale(1)';
    });
  }

  // ── Handle Swap ───────────────────────────────────────────

  function handleSwap() {
    // Animate swap button
    swapBtn.classList.remove('rotating');
    void swapBtn.offsetWidth;
    swapBtn.classList.add('rotating');

    // Swap the select values
    const tempFrom = fromSelectEl.value;
    fromSelectEl.value = toSelectEl.value;
    toSelectEl.value = tempFrom;

    // Swap input value ↔ result
    const tempValue = inputEl.value;
    inputEl.value = resultEl.value.replace(/,/g, '');

    // Re-convert
    handleConversion();

    // Remove animation class after it completes
    setTimeout(() => {
      swapBtn.classList.remove('rotating');
    }, 350);
  }
}
