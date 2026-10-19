/* Michigan snowmobile "what you need" checker.
 * Pure logic first (also loaded by tests), then a thin DOM layer.
 * Facts come from lib/snowmobile/rules.mjs via the JSON the page embeds; nothing is stored,
 * sent anywhere or tied to a location. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SnowmobileNeed = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULTS = { home: 'mi', age: 'adult', where: 'public' };

  function clean(a) {
    a = a || {};
    return {
      home: a.home === 'out' ? 'out' : 'mi',
      age: a.age === 'teen' || a.age === 'child' ? a.age : 'adult',
      where: ['free', 'ice', 'private'].indexOf(a.where) >= 0 ? a.where : 'public'
    };
  }

  // Returns [{id, status, title, text}] where status is one of:
  //   need | not-needed | waived | limit | info
  function checklist(answers, F) {
    var a = clean(answers), out = [], p = F.permit, r = F.registration;

    // 1. Trail permit
    if (a.where === 'public') {
      out.push({ id: 'permit', status: 'need', title: 'Trail permit: required',
        text: 'A snowmobile trail permit is required to ride on public land in Michigan. It costs ' + p.fee + ', is valid ' + p.validFrom + ' through ' + p.validTo + ' and goes on sale ' + p.onSale + '. The sticker goes ' + p.sticker + '. ' + p.mailing });
    } else if (a.where === 'free') {
      out.push({ id: 'permit', status: 'waived', title: 'Trail permit: waived on the weekend, DNR trails only',
        text: 'During the DNR’s Free Snowmobiling Weekend the trail permit requirement is waived on DNR trails only. It applies to residents and visitors. Everywhere else, and outside the weekend, the ' + p.fee + ' permit applies.' });
    } else if (a.where === 'ice') {
      out.push({ id: 'permit', status: 'not-needed', title: 'Trail permit: not required for this use',
        text: 'The DNR exempts a snowmobile used solely for transportation on the frozen surface of public waters for ice fishing from the trail permit. Riding onto trails or other land brings the ' + p.fee + ' permit back.' });
    } else {
      out.push({ id: 'permit', status: 'not-needed', title: 'Trail permit: not required for this use',
        text: 'The DNR exempts a snowmobile operated exclusively on lands owned or under the control of the snowmobile’s owner. Riding anywhere else, including a neighbor’s land, is not covered by that wording; if you leave your own land, the ' + p.fee + ' permit applies.' });
    }

    // 2. Registration
    if (a.where === 'free') {
      out.push({ id: 'registration', status: 'waived', title: 'Registration: waived on the weekend, DNR trails only',
        text: 'The registration requirement is waived on DNR trails during Free Snowmobiling Weekend. Registration is separate from the trail permit and applies again once the weekend ends or you leave DNR trails.' });
    } else if (a.where === 'private') {
      out.push({ id: 'registration', status: 'not-needed', title: 'Registration: not required for this use',
        text: 'Michigan residents must register snowmobiles unless the sled is used solely on private property, and the DNR’s exemption list covers a sled operated exclusively on land its owner owns or controls. Registration is separate from the trail permit.' });
    } else if (a.home === 'mi') {
      out.push({ id: 'registration', status: 'need', title: 'Registration: required (Secretary of State)',
        text: 'Michigan residents must register the snowmobile with the ' + r.authority + '. Registration lasts ' + r.years + ' years, and you put ' + r.decals + '. If you sell the sled, the registration is transferred through the Secretary of State. The DNR page does not list the fee.' });
    } else {
      out.push({ id: 'registration', status: 'need', title: 'Registration: show your home registration',
        text: 'A nonresident’s snowmobile must display a valid registration from the operator’s home state or province before it is operated in Michigan, or be registered in Michigan. Registration is separate from the trail permit' + (a.where === 'ice' ? ', and the ice-fishing exemption covers only the permit.' : '.') });
    }

    // 3. Age and safety certificate
    if (a.age === 'adult') {
      out.push({ id: 'age', status: 'info', title: 'Safety certificate: the DNR requirement covers ages ' + F.certificate.fromAge + ' to ' + F.certificate.toAge,
        text: 'The DNR requires a safety certificate for operators ' + F.certificate.fromAge + ' to ' + F.certificate.toAge + ' and recommends a snowmobile safety course for all operators. The DNR’s online course charges its fee only when you pass.' });
    } else if (a.age === 'teen') {
      out.push({ id: 'age', status: 'limit', title: 'Safety certificate: required at ages ' + F.certificate.fromAge + ' to ' + F.certificate.toAge,
        text: 'Riders 12 to 16 must pass a Michigan-approved snowmobile safety course and carry the certificate. With it, they can ride and cross a street or highway. Without it, they may ride only under direct adult supervision (an adult 18 or older in constant visual contact with the unaided eye) and may not cross a street or highway.' });
    } else {
      out.push({ id: 'age', status: 'limit', title: 'Under 12: direct adult supervision only',
        text: 'A child under 12 may operate a snowmobile only under direct adult supervision (an adult 18 or older in constant visual contact with the unaided eye), with or without a certificate. A child under 12 may not cross a street or highway. The DNR page says no certificate is required on land owned or leased by the child’s parent or guardian.' });
    }
    if (a.age === 'teen' && a.where === 'private') {
      out[out.length - 1].text += ' The DNR’s land exception is stated for children under 12; confirm with the DNR before relying on it for a teen.';
    }

    // 4. Helmet
    out.push({ id: 'helmet', status: a.where === 'private' ? 'info' : 'need',
      title: a.where === 'private' ? 'Helmet: exception for your own property' : 'Helmet: required for everyone on the sled',
      text: a.where === 'private'
        ? 'The DNR Snowmobile Handbook requires a Department of Transportation-approved crash helmet for everyone operating or riding on a snowmobile, with an exception for people operating on their own private property. A helmet is still the obvious call.'
        : 'Everyone operating or riding on a snowmobile must wear ' + F.helmet + ' (the DNR Snowmobile Handbook). That includes passengers.' });

    // 5. Lights
    out.push({ id: 'lights', status: 'need', title: 'Lights: headlight and taillight on',
      text: 'A snowmobile must display ' + F.lights + '.' });

    // 6. Always
    out.push({ id: 'always', status: 'need', title: 'Never operate impaired or too fast for conditions',
      text: 'The Handbook prohibits operating a snowmobile while under the influence of drugs or alcohol and at a speed greater than is reasonable for existing conditions.' });

    // 7. Season and passport (public land)
    if (a.where === 'public' || a.where === 'free') {
      out.push({ id: 'season', status: 'info', title: 'Season: state-designated trails open ' + F.season.opens + ' to ' + F.season.closes,
        text: F.season.note + ' A Recreation Passport is required where applicable, for example for vehicle entry to some state parks and trailheads.' });
    }
    if (a.where === 'free') {
      out.push({ id: 'freeRules', status: 'info', title: 'Everything else still applies',
        text: 'All other snowmobile rules and regulations still apply during Free Snowmobiling Weekend, including the age and certificate rules, helmets and lights. The DNR announces the dates each year.' });
    }
    return out;
  }

  // ---- DOM layer -----------------------------------------------------------------------
  function parseHash(h) {
    var o = {}; String(h || '').replace(/^#/, '').split('&').forEach(function (kv) {
      var i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    }); return clean(o);
  }
  function mount() {
    var form = document.getElementById('need-form'); if (!form) return;
    var dataEl = document.getElementById('need-facts'); if (!dataEl) return;
    var F; try { F = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var out = document.getElementById('need-result'), count = document.getElementById('need-count');
    var state = parseHash(location.hash);
    ['home', 'age', 'where'].forEach(function (k) { var el = form.elements[k]; if (el) el.value = state[k]; });
    function render() {
      var items = checklist(state, F);
      out.textContent = '';
      items.forEach(function (it) {
        var li = document.createElement('li'); li.className = 'need-item need-' + it.status;
        var b = document.createElement('span'); b.className = 'need-badge ui';
        b.textContent = { need: 'Required', 'not-needed': 'Not required', waived: 'Waived', limit: 'Age rule', info: 'Good to know' }[it.status] || 'Note';
        var h = document.createElement('strong'); h.textContent = it.title;
        var p = document.createElement('p'); p.textContent = it.text;
        li.appendChild(b); li.appendChild(h); li.appendChild(p); out.appendChild(li);
      });
      if (count) count.textContent = items.filter(function (i) { return i.status === 'need'; }).length + ' requirements apply to this ride.';
    }
    form.addEventListener('change', function (e) {
      if (!e.target || !e.target.name) return;
      state = clean(Object.assign({}, state, (function () { var o = {}; o[e.target.name] = e.target.value; return o; })()));
      try { history.replaceState(null, '', '#home=' + state.home + '&age=' + state.age + '&where=' + state.where); } catch (err) { /* ignore */ }
      render();
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    render();
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  }
  return { checklist: checklist, clean: clean, DEFAULTS: DEFAULTS };
}));
