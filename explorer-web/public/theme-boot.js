(function () {
  var STORAGE_KEY = "verium-theme-mode";
  var doc = document.documentElement;

  var mode;
  try {
    mode = window.localStorage.getItem(STORAGE_KEY);
  } catch (_) {
    mode = null;
  }
  if (mode !== "light" && mode !== "dark" && mode !== "system") {
    var configured = doc.getAttribute("data-ui-theme");
    if (configured === "light" || configured === "dark" || configured === "system") {
      mode = configured;
    } else {
      mode = "dark";
    }
  }

  var resolved = mode;
  if (mode === "system") {
    var prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    resolved = prefersDark ? "dark" : "light";
  }

  if (resolved === "light") {
    doc.classList.add("light");
  } else {
    doc.classList.remove("light");
  }
  doc.classList.remove("dark");
})();
