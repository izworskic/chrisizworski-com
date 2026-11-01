/* Michigan Growing Season Explorer: a narrated, crop-first reading of the existing
 * Michigan-only PlantNow engine. No additional planting dates or harvest estimates.
 * All displayed stages originate in engine windows or its documented soil gates.
 */
(function (root) {
  'use strict';
  function mount(options) {
    var E = options.engine, K = options.kit, get = function (id) { return document.getElementById(id); };
    var crops = E.CROPS, selected = crops.some(function (c) { return c.id === options.crop; }) ? options.crop : 'tomatoes';
    var stage = null, last = null;
    var sel = get('pnCrop');
    sel.replaceChildren.apply(sel, crops.map(function (c) { return K.h('option', { value: c.id }, c.name); }));
    sel.value = selected;

    function getChoice() { return selected; }
    function pick(id, scroll) {
      if (!crops.some(function (c) { return c.id === id; })) return;
      selected = id;
      stage = null;
      sel.value = selected;
      options.onChange();
      if (scroll && get('pnSeasonTitle').scrollIntoView) get('pnSeasonTitle').scrollIntoView({ block: 'start' });
    }
    sel.addEventListener('change', function () { pick(sel.value, false); });

    function item(id, title, when, explanation) {
      return { id: id, title: title, when: when, explanation: explanation };
    }
    function stagesFor(r, frost, st) {
      var c = r.crop, w = r.windows;
      if (c.kind === 'transplant') {
        return [
          item('indoor', 'Begin under lights', K.range(w[0].from, w[0].to), 'A tomato or pepper season starts before the garden is ready. MSU recommends starting these transplants indoors six to eight weeks before setting them outside. The dates here count back from this station’s cautious spring planting reference.'),
          item('harden', 'Meet the outside air', K.range(w[1].from, w[1].to), 'Give young plants seven to ten days to adjust to the outdoors. Start with brief, sheltered periods, then gradually increase exposure. This stage helps bridge the gap between a warm windowsill and the garden.'),
          item('transplant', 'Set into the garden', 'From ' + K.fmt(w[2].from), 'The chosen reference is ' + st.p25 + ': a 32°F freeze still occurs on or after that date in about one spring out of four. That is not a guarantee. Keep a way to protect young plants, and check the actual forecast and conditions. MSU gives no last transplant date.')
        ];
      }
      if (c.kind === 'warmSow') {
        return [
          item('frost', 'Watch the frost odds', st.p50 + ' to ' + st.p25, 'At ' + st.p50 + ', about half of springs still record a freeze on or after that date. By ' + st.p25 + ', the odds have fallen to one spring in four. This tool uses the latter as its cautious reference, not as a promise of frost-free weather.'),
          item('soil', 'Feel the spring soil', 'Above 60°F', 'Even after the spring frost reference, MSU advises that warm-season seeds germinate poorly unless the soil at planting depth exceeds 60°F. An air temperature or a nearby station’s 4-inch reading is not a measurement in your own seed bed.'),
          item('sow', 'Sow in the bed', 'From ' + K.fmt(w[0].from) + ', if soil is warm', 'The date is only the frost side of the decision. Sow when that date has arrived AND your bed is warm enough. MSU does not provide a closing sow date in this rule; the chart’s July 31 cutoff is not a planting deadline.')
        ];
      }
      if (c.kind === 'hardy') {
        return [
          item('ground', 'Read the ground first', 'No fixed calendar date', 'These are hardy spring crops. MSU says to plant as soon as the ground can be worked. If soil sticks together or is still frozen, let the bed rest; the frost-date chart cannot tell you when it will crumble in your hand.'),
          item('plant', 'Plant when workable', 'When the bed crumbles', 'When the soil can be worked, the ground itself gives the go-ahead. The location provides context, but the source offers no exact town-by-town sowing date, so no bar is invented.')
        ];
      }
      if (c.kind === 'soil40') {
        return [
          item('soil', 'Check the planting depth', 'At least 40°F', 'MSU reports that these root crops germinate at a minimum soil temperature of 40°F. Use a reading at planting depth. The frost-date table alone cannot establish that the ground is ready.'),
          item('sow', 'Sow when the bed is ready', 'At least 40°F', 'A measured soil temperature at or above 40°F meets the sourced germination threshold. The tool does not invent a start date from a frost probability, or turn a typical date into a current soil observation.')
        ];
      }
      return [item('unknown', 'A timing rule is missing', 'Not reported', c.why || 'No currently verified Michigan planting-start rule is available for this crop. This is a research gap, not proof that it cannot be grown.')];
    }
    function suggestedStep(r, p, stages) {
      if (r.crop.kind !== 'transplant' || p.day > K.parse('Jul 31')) return stages[0].id;
      var w = r.windows;
      return p.day <= w[0].to ? 'indoor' : p.day < w[1].from ? 'harden' : p.day < w[2].from ? 'harden' : 'transplant';
    }
    function node(tag, attrs) {
      var args = Array.prototype.slice.call(arguments, 2);
      return K.h.apply(null, [tag, attrs].concat(args));
    }
    function render(p) {
      if (!p) return;
      last = p;
      var st = p.station, frost = p.frost;
      var r = p.crops.filter(function (x) { return x.crop.id === selected; })[0];
      if (!r) return;
      var steps = stagesFor(r, frost, st);
      if (!stage || !steps.some(function (x) { return x.id === stage; })) stage = suggestedStep(r, p, steps);
      var active = steps.filter(function (x) { return x.id === stage; })[0];
      var label = r.crop.kind === 'transplant' ? 'From seed tray to garden bed' :
        r.crop.kind === 'warmSow' ? 'Two gates before the first seed' :
        r.crop.kind === 'hardy' ? 'Let the ground make the call' :
        r.crop.kind === 'soil40' ? 'A thermometer, not a calendar' : 'What the Michigan sources do not say';
      get('pnSeasonTitle').textContent = r.crop.name + ': ' + label;
      get('pnSeasonIntro').textContent = 'Follow ' + r.crop.name.toLowerCase() + ' through the season near ' + st.n + '. Pick a chapter to see what changes and why.';
      get('pnSeasonLocation').textContent = 'Based on the ' + st.n + ' frost station. Climate history, not a live forecast.';
      get('pnSeasonLandmarks').replaceChildren(
        node('div', { class: 'pn-landmark' }, node('span', null, '50% spring threshold'), node('strong', null, st.p50), node('small', null, 'About half of springs freeze on or after this date')),
        node('div', { class: 'pn-landmark pn-landmark-main' }, node('span', null, '25% spring threshold'), node('strong', null, st.p25), node('small', null, 'Still about a 1-in-4 chance of a later freeze')),
        node('div', { class: 'pn-landmark' }, node('span', null, 'Latest recorded spring freeze'), node('strong', null, st.lx), node('small', null, 'A historical extreme, not a predicted date'))
      );
      get('pnSeasonSteps').replaceChildren.apply(get('pnSeasonSteps'), steps.map(function (x, i) {
        var b = node('button', { type: 'button', class: 'pn-stage' + (x.id === active.id ? ' is-active' : ''), 'aria-pressed': x.id === active.id ? 'true' : 'false' },
          node('span', { class: 'pn-stage-number' }, String(i + 1).padStart(2, '0')),
          node('span', { class: 'pn-stage-copy' }, node('strong', null, x.title), node('small', null, x.when)));
        b.addEventListener('click', function () { stage = x.id; render(last); });
        return b;
      }));
      get('pnSeasonStepTitle').textContent = active.title;
      get('pnSeasonStepDate').textContent = active.when;
      get('pnSeasonStepBody').textContent = active.explanation;
      get('pnSeasonStatus').textContent = 'For your garden today: ' + r.status + '. ' + r.detail;
      get('pnSeasonFall').textContent = frost.fallText ?
        'The typical first fall frost here is ' + frost.fallText + '. That is a seasonal reference, not a harvest forecast; check your variety’s days to maturity.' :
        'A sourced typical first fall frost date is not available for this station. Harvest dates are not estimated.';
      get('pnSeasonMissing').hidden = r.code !== 'NOT_REPORTED';
      var rows = get('pnRows').children;
      rows.forEach(function (tr) {
        var id = tr.getAttribute('data-crop');
        tr.classList.toggle('pn-row-selected', id === selected);
      });
      sel.value = selected;
    }
    return { render: render, selected: getChoice, select: pick };
  }
  root.GardenStory = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
