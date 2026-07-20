(function () {
  "use strict";

  window.va =
    window.va ||
    function () {
      (window.vaq = window.vaq || []).push(arguments);
    };

  function clean(value, fallback) {
    return String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  function toolFromLink(link) {
    if (link.dataset.trackTool) return clean(link.dataset.trackTool, "tool");

    try {
      var url = new URL(link.href, window.location.href);
      if (url.hostname === window.location.hostname) {
        var parts = url.pathname.split("/").filter(Boolean);
        return clean(parts[parts.length - 1], "home");
      }
      return clean(url.hostname.replace(/^www\./, ""), "external-tool");
    } catch (_error) {
      return "tool";
    }
  }

  document.addEventListener("click", function (event) {
    var origin = event.target;
    if (!origin || typeof origin.closest !== "function") return;

    var link = origin.closest("a[href]");
    if (!link) return;

    var page = document.body.dataset.analyticsPage || "site";
    var cluster = link.dataset.trackCluster;
    if (cluster) {
      window.va("event", {
        name: "Tool Cluster Open",
        data: {
          cluster: clean(cluster, "cluster"),
          placement: clean(link.dataset.placement, page + "-jump"),
        },
      });
      return;
    }

    var isToolLink = Boolean(link.dataset.trackTool);
    if (!isToolLink && page === "tools") isToolLink = Boolean(link.closest(".tool-card"));
    if (!isToolLink && page === "great-lakes") isToolLink = Boolean(link.closest(".card"));
    if (!isToolLink) return;

    window.va("event", {
      name: "Tool Open",
      data: {
        tool: toolFromLink(link),
        placement: clean(link.dataset.placement, page + "-list"),
      },
    });
  });
})();
