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
    var herbs=['basil','cilantro','parsley','dill','chives','oregano','thyme','sage','rosemary'];
    var flowers=['zinnias','marigolds','sunflowers','cosmos','nasturtiums','sweet-peas','snapdragons','petunias','calendula','morning-glories'];
    var groups=[['Vegetables',crops.filter(function(c){return herbs.indexOf(c.id)<0&&flowers.indexOf(c.id)<0})],['Herbs',crops.filter(function(c){return herbs.indexOf(c.id)>=0})],['Flowers',crops.filter(function(c){return flowers.indexOf(c.id)>=0})]];
    sel.replaceChildren.apply(sel,groups.map(function(g){return K.h('optgroup',{label:g[0]},g[1].slice().sort(function(a,b){return a.name.localeCompare(b.name)}).map(function(c){return K.h('option',{value:c.id},c.name)}))}));
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
      if (c.kind === 'cilantro' || c.kind === 'dill' || c.kind === 'corn') {
        return [item('plan','Make a little room','Before planting',r.detail),item('grow','Keep an eye on the garden','Through the season','Check the seed packet, your soil and the forecast. Local conditions and the variety you choose can change the timing.')];
      }
      if (c.kind === 'basil') {
        return [item('plan','Make room for basil','Spring','Basil is tender. Choose a sunny, well-drained place and use your seed packet to plan the variety you want.'),item('plant','Wait for settled warmth','After frost danger has passed','MSU says basil can be direct-seeded or transplanted once frost danger is over. Historical dates do not guarantee that a cold night is finished; check the forecast.'),item('enjoy','Pick for the kitchen','During growth','Harvest depends on growth and weather, not a fixed date. Check your plants and follow your variety instructions.')];
      }
      if (c.kind === 'potato') {
        return [item('bed','Prepare a bed','Spring','Give potatoes a sunny, well-drained spot. Wait until the ground is workable and check soil temperature at planting depth.'),item('plant','Plant seed potatoes','Soil at least 45°F','MSU recommends planting certified disease-free seed potatoes in spring once soil reaches 45°F. Soil temperature and weather vary from one garden to another.'),item('harvest','Watch the plants','Variety dependent','Potato varieties mature at different rates. MSU suggests watching for vine dieback and checking whether the tuber skins have set; the calendar is not a harvest forecast.')];
      }
      if (c.kind === 'coolGuide') {
        return [item('spring', 'Give cool weather a try', 'Spring', 'Cool-season crops have a place in the spring garden. Check your seed packet and the condition of your own soil before planting; this guide does not invent a station-specific sowing date.'), item('fall', 'Make room for a second season', 'Late summer into fall', 'MSU includes this crop in its fall garden guide. Look at the days to maturity on your packet, allow for germination and slower growth, then work backward from the typical first frost.'), item('observe', 'Let the garden have a say', 'Throughout the season', 'Variety, soil, weather and the time needed to germinate all matter. Treat a frost date as a planning reference and watch the forecast as the season changes.')];
      }
      if (c.kind === 'garlic') {
        return [item('plan', 'Set aside a sunny bed', 'Before fall planting', 'Choose healthy seed garlic and make room for a crop that will remain in the ground through winter.'), item('plant', 'Tuck cloves in for winter', 'Usually October–November', 'MSU recommends planting three to five weeks before a hard freeze settles in. That is a seasonal guide, not a prediction of when the ground will freeze in your garden.'), item('harvest', 'Watch the leaves next summer', 'Usually mid-June to mid-July', 'MSU says garlic is usually ready when 40–60% of its leaves have yellowed. Check a sample bulb; the calendar alone cannot tell you when yours is ready.')];
      }
      if (c.kind === 'transplant') {
        return [
          item('indoor', 'Begin under lights', K.range(w[0].from, w[0].to), 'Some of our favorite garden crops need a head start before the beds are ready. MSU recommends starting these transplants indoors six to eight weeks before setting them outside. The dates here count back from this station’s cautious spring planting reference.'),
          item('harden', 'Meet the outside air', K.range(w[1].from, w[1].to), 'Give young plants seven to ten days to adjust to the outdoors. Start with brief, sheltered periods, then gradually increase exposure. This stage helps bridge the gap between a warm windowsill and the garden.'),
          item('transplant', 'Set into the garden', 'From ' + K.fmt(w[2].from), 'The chosen reference is ' + st.p25 + ': a 32°F freeze still occurs on or after that date in about one spring out of four. That is not a guarantee. Keep a way to protect young plants, and check the actual forecast and conditions. MSU gives no last transplant date.')
        ];
      }
      if (c.kind === 'warmSow') {
        return [
          item('frost', 'Watch the frost odds', st.p50 + ' to ' + st.p25, 'At ' + st.p50 + ', about half of springs still record a freeze on or after that date. By ' + st.p25 + ', the odds have fallen to one spring in four. This tool uses the latter as its cautious reference, not as a promise of frost-free weather.'),
          item('soil', 'Feel the spring soil', 'Above 60°F', 'Even after the spring frost reference, Warm-season seeds germinate poorly in cool soil. This tool uses above 60°F as a conservative check, not an ideal temperature for every crop; your variety may need warmer soil. An air temperature or a nearby station’s 4-inch reading is not a measurement in your own seed bed.'),
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
      if (r.crop.kind === 'coolGuide' && p.day >= K.parse('Jul 15') && p.day <= K.parse('Sep 30')) return 'fall';
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
      if (['beets','carrots','peas','radishes','spinach','turnips'].indexOf(r.crop.id) >= 0) {
        steps.push(item('fall', 'Make room for a fall crop', 'Late summer', 'MSU includes this crop in its fall garden guide. Check your packet and allow time for germination and slower growth, then work backward from the local frost reference. Your garden and the forecast get the final say.'));
      }
      if (!stage && r.code === 'PLAN_FALL') stage = 'fall';
      if (!stage || !steps.some(function (x) { return x.id === stage; })) stage = suggestedStep(r, p, steps);
      var active = steps.filter(function (x) { return x.id === stage; })[0];
      var label = ['cilantro','dill','corn'].indexOf(r.crop.kind) >= 0 ? 'Make a little room in the garden' : r.crop.kind === 'basil' ? 'A tender herb for warm days' : r.crop.kind === 'potato' ? 'From seed potato to harvest' : r.crop.kind === 'coolGuide' ? 'A place in the cool-season garden' : r.crop.kind === 'garlic' ? 'A fall planting for next summer' : r.crop.kind === 'transplant' ? 'From seed tray to garden bed' :
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
        b.addEventListener('click', function () { stage = x.id; render(last); var current = get('pnSeasonSteps').children[i]; if (current && current.focus) current.focus(); });
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
      var aliases={'Leaf lettuce':'Lettuce','Snap beans':'Green beans','Melons':'Melons'};
      var name=aliases[r.crop.name]||r.crop.name, calendar=root.MIFrost.crop(name), link=get('pnCalendarCrop');
      link.hidden=!calendar;
      if(calendar)link.href='/zone-6a-planting-calendar/?city='+encodeURIComponent(st.s)+'&crop='+encodeURIComponent(name);
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
