(function () {
  var STORAGE_KEY = "verium-theme-mode";
  var doc = document.documentElement;

  function resolveTheme(mode) {
    if (mode === "system") {
      var prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      return prefersDark ? "dark" : "light";
    }
    return mode === "light" ? "light" : "dark";
  }

  function applyTheme(resolved) {
    if (resolved === "light") {
      doc.classList.add("light");
    } else {
      doc.classList.remove("light");
    }
    doc.classList.remove("dark");
  }

  function readMode() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") return raw;
    } catch (_) {}
    var configured = doc.getAttribute("data-ui-theme");
    if (configured === "light" || configured === "dark" || configured === "system") {
      return configured;
    }
    return "dark";
  }

  function writeMode(mode) {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch (_) {}
  }

  function syncButtons(mode) {
    var buttons = document.querySelectorAll("[data-theme-mode]");
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      var active = button.getAttribute("data-theme-mode") === mode;
      button.classList.toggle("theme-toggle-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function setMode(mode) {
    writeMode(mode);
    applyTheme(resolveTheme(mode));
    syncButtons(mode);
  }

  function afterHydration(fn) {
    requestAnimationFrame(function () {
      requestAnimationFrame(fn);
    });
  }

  function initThemeControls() {
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var button = target.closest("[data-theme-mode]");
      if (!button) return;
      var next = button.getAttribute("data-theme-mode");
      if (next === "light" || next === "dark" || next === "system") {
        setMode(next);
      }
    });

    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq && mq.addEventListener) {
      mq.addEventListener("change", function () {
        if (readMode() === "system") {
          applyTheme(resolveTheme("system"));
        }
      });
    }

    afterHydration(function () {
      var mode = readMode();
      applyTheme(resolveTheme(mode));
      syncButtons(mode);
    });
  }

  function isActiveNav(pathname, href, exact, prefix) {
    if (exact) return pathname === href;
    if (prefix) return pathname === href || pathname.indexOf(href + "/") === 0;
    return pathname === href || pathname.indexOf(href + "/") === 0;
  }

  function markActiveNav() {
    var pathname = window.location.pathname.replace(/\/$/, "") || "/";
    var links = document.querySelectorAll("[data-nav-link]");
    var dropdowns = document.querySelectorAll("[data-nav-dropdown]");

    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var href = link.getAttribute("href") || "/";
      var exact = link.getAttribute("data-nav-exact") === "true";
      var prefix = link.getAttribute("data-nav-prefix") === "true";
      var active = isActiveNav(pathname, href, exact, prefix);

      link.classList.toggle("nav-link-active", active);
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }

    for (var j = 0; j < dropdowns.length; j++) {
      var dropdown = dropdowns[j];
      var menu = dropdown.parentElement && dropdown.parentElement.querySelector("[role='menu']");
      var childLinks = menu ? menu.querySelectorAll("[data-nav-link]") : [];
      var dropdownActive = false;

      for (var k = 0; k < childLinks.length; k++) {
        var childHref = childLinks[k].getAttribute("href") || "/";
        var childPrefix = childLinks[k].getAttribute("data-nav-prefix") === "true";
        if (isActiveNav(pathname, childHref, false, childPrefix)) {
          dropdownActive = true;
          break;
        }
      }

      dropdown.classList.toggle("nav-link-active", dropdownActive);
      if (dropdownActive) {
        dropdown.setAttribute("aria-current", "page");
      } else {
        dropdown.removeAttribute("aria-current");
      }
    }
  }

  function hookHistoryForNav() {
    var pushState = history.pushState;
    history.pushState = function () {
      pushState.apply(history, arguments);
      markActiveNav();
    };

    var replaceState = history.replaceState;
    history.replaceState = function () {
      replaceState.apply(history, arguments);
      markActiveNav();
    };

    window.addEventListener("popstate", markActiveNav);
  }

  function initCopyButtons() {
    function showCopied(button) {
      var label = button.getAttribute("data-copy-label") || "Copy";
      button.setAttribute("data-copy-state", "copied");
      button.textContent = "Copied";
      window.setTimeout(function () {
        button.removeAttribute("data-copy-state");
        button.textContent = label;
      }, 1600);
    }

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var button = target.closest("[data-copy-value]");
      if (!button) return;

      var value = button.getAttribute("data-copy-value");
      if (!value) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () {
          showCopied(button);
        }).catch(function () {});
        return;
      }

      var area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
        showCopied(button);
      } catch (_) {}
      document.body.removeChild(area);
    });
  }

  function init() {
    initCopyButtons();
    initThemeControls();
    hookHistoryForNav();
    markActiveNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
