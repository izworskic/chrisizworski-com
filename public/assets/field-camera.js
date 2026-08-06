// Renders allowlisted field cameras. Every camera carries its capture time, and one that has
// stopped updating says so rather than showing a stale picture as if it were current.
(function () {
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
          node.innerHTML = '<p class="camera-out">This camera is not publishing right now.</p>';
          return;
        }
        var stale = meta.fresh === false;
        var img = document.createElement("img");
        img.src = meta.image_url;
        img.alt = "Roadside camera view at " + meta.label;
        img.loading = "lazy";
        img.decoding = "async";
        img.width = 720;
        img.height = 405;
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
        credit.appendChild(document.createTextNode("Image: "));
        credit.appendChild(a);

        node.innerHTML = "";
        node.dataset.state = stale ? "stale" : "live";
        node.appendChild(img);
        node.appendChild(cap);
        node.appendChild(credit);
      })
      .catch(function () {
        node.innerHTML = '<p class="camera-out">This camera is not publishing right now.</p>';
      });
  });
})();
