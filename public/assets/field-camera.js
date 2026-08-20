// Renders allowlisted field cameras. Every camera carries its capture time, and one that has
// stopped updating says so rather than showing a stale picture as if it were current.
(function () {
  var pathname = window.location.pathname.replace(/\/+$/, "");

  // Additive fall discovery surface. This intentionally leaves the fall hub's title,
  // description, H1, first answer, canonical and live-map logic untouched while giving
  // the distinct "this weekend" decision intent a direct handoff from the live tool.
  if (pathname === "/fall-color" && !document.querySelector("[data-search-growth-weekend]")) {
    var main = document.querySelector("main");
    if (main) {
      var weekend = document.createElement("aside");
      weekend.dataset.searchGrowthWeekend = "true";
      weekend.setAttribute("aria-label", "Fall color this weekend");
      weekend.style.cssText = "max-width:1040px;margin:18px auto 22px;padding:16px 18px;border:1px solid #d6c8ae;border-radius:14px;background:#fbf6ea";
      weekend.innerHTML = '<div style="font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;opacity:.68;margin-bottom:5px">Weekend decision</div><strong style="display:block;font-size:1.1rem;margin-bottom:5px">Where are Michigan fall colors best this weekend?</strong><span style="display:block;margin-bottom:8px">Rank the eight Michigan regions for the coming weekend, then open the live map before you leave.</span><a href="/fall-color/this-weekend/" style="font-weight:700">See the best fall-color region this weekend →</a>';
      main.insertBefore(weekend, main.firstChild);
    }
  }

  if (pathname === "/michigan-cross-country-skiing" && !document.querySelector('script[data-winter-final-loader]')) {
    var winterFinal = document.createElement("script");
    winterFinal.src = "/assets/winter-final.js";
    winterFinal.defer = true;
    winterFinal.dataset.winterFinalLoader = "xc";
    document.body.appendChild(winterFinal);
  }

  var nodes = document.querySelectorAll("[data-field-camera]");
  if (!nodes.length) return;

  function ago(minutes) {
    if (minutes == null) return "time unknown";
    if (minutes < 2) return "just now";
    if (minutes < 90) return minutes + " minutes ago";
    var h = Math.round(minutes / 60);
    if (h < 36) return h + (h === 1 ? " hour ago" : " hours ago");
    return Math.round(h / 24) + " days ago";
  }

  nodes.forEach(function (node) {
    var id = node.getAttribute("data-field-camera");
    fetch("/api/field-camera?id=" + encodeURIComponent(id) + "&meta=1")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (meta) {
        if (!meta || !meta.available) {
          // An unconfigured upstream is a deployment state, not a camera state. Remove the block
          // rather than telling the reader a working camera has stopped, which is not true.
          if (meta && meta.unconfigured) { node.remove(); return; }
          node.innerHTML = '<p class="camera-out">This camera is not publishing right now.</p>';
          return;
        }
        var stale = meta.fresh === false;
        var img = document.createElement("img");
        img.src = meta.image_url;
        img.alt = "Current camera view at " + meta.label;
        img.loading = "lazy";
        img.decoding = "async";
        img.width = meta.image_width || 720;
        img.height = meta.image_height || 405;
        if (meta.source === "windy") img.style.maxWidth = (meta.image_width || 400) + "px";
        img.className = "camera-shot";
        img.addEventListener("error", function () {
          node.innerHTML = '<p class="camera-out">This camera is not publishing right now.</p>';
        });

        var cap = document.createElement("p");
        cap.className = "camera-caption";
        cap.textContent =
          meta.label + " • " + (stale ? "last image " : "updated ") + ago(meta.age_minutes) +
          (stale ? ", this camera may have stopped" : "");

        var credit = document.createElement("p");
        credit.className = "camera-credit";
        var a = document.createElement("a");
        a.href = meta.credit_url; a.rel = "noopener"; a.textContent = meta.credit;
        if (meta.source !== "windy") credit.appendChild(document.createTextNode("Image: "));
        credit.appendChild(a);
        if (meta.add_url) {
          var add = document.createElement("a");
          add.href = meta.add_url; add.rel = "noopener"; add.textContent = "add a webcam";
          credit.appendChild(document.createTextNode(" — "));
          credit.appendChild(add);
        }

        var imageNode = img;
        if (meta.click_url) {
          var imageLink = document.createElement("a");
          imageLink.href = meta.click_url;
          imageLink.target = "_blank";
          imageLink.rel = "noopener";
          imageLink.className = "camera-shot-link";
          imageLink.setAttribute("aria-label", "Open " + meta.label + " on Windy.com");
          imageLink.appendChild(img);
          imageNode = imageLink;
        }

        var note = null;
        if (meta.note) {
          note = document.createElement("p");
          note.className = "camera-note";
          note.textContent = meta.note;
        }

        node.innerHTML = "";
        node.dataset.state = stale ? "stale" : "live";
        node.appendChild(imageNode);
        node.appendChild(cap);
        node.appendChild(credit);
        if (note) node.appendChild(note);
      })
      .catch(function () {
        node.innerHTML = '<p class="camera-out">This camera is not publishing right now.</p>';
      });
  });
})();
