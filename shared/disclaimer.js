// Shared disclaimer banner. Include on every tool page:
// <script src="../shared/disclaimer.js" defer></script>
(function () {
  var text = "For preliminary design and educational use only. Results are estimates " +
    "based on published formulas and user inputs. Verify against manufacturer data, " +
    "applicable codes (e.g., NEC and local amendments) and project requirements. " +
    "Not a substitute for review by a qualified engineer. No warranty; use at your own risk.";
  var el = document.createElement("aside");
  el.className = "disclaimer";
  el.setAttribute("role", "note");
  el.textContent = text;
  document.body.appendChild(el);
})();
