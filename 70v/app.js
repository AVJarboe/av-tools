// Page code for the 70V/100V calculator. All the maths lives in calc.js.
(function () {
  "use strict";
  var CV = window.CV;
  var $ = function (id) { return document.getElementById(id); };
  var STORE_KEY = "avtools.70v.v1";
  var EXAMPLE = [{ name: "Ceiling speakers", qty: 12, watts: 5 }, { name: "Horns", qty: 4, watts: 10 }];
  var DEFAULTS = { project: "", lineVolts: "70.7", insLoss: "1", headroom: "20", ampWatts: "250",
    length: "300", lengthUnit: "ft", wire: "awg14", customOhm: "2.52", customUnit: "kft",
    tempC: "20", targetDb: "0.5" };
  var ready = false;

  function el(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in props || {}) {
      if (k === "text") { e.textContent = props[k]; }
      else if (k === "class") { e.className = props[k]; }
      else { e.setAttribute(k, props[k]); }
    }
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function num(id) { var v = parseFloat($(id).value); return isFinite(v) ? v : NaN; }
  function nonNeg(v, fallback) { return isFinite(v) && v >= 0 ? v : fallback; }
  // Show a number to a sensible number of figures without trailing noise.
  function f(x, dp) {
    if (!isFinite(x)) { return "—"; }
    return x.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp === undefined ? 2 : dp });
  }
  function pct(x) { return Math.max(0, Math.min(100, x)) + "%"; }

  // ----- speaker group rows -----
  var rowSeq = 0;
  function addGroup(g, focus) {
    var n = ++rowSeq;
    var name = el("input", { type: "text", id: "gname" + n, maxlength: "40", placeholder: "e.g. Lobby ceiling" });
    var qty = el("input", { type: "number", id: "gqty" + n, min: "0", step: "1", inputmode: "numeric" });
    var watts = el("input", { type: "number", id: "gw" + n, min: "0", step: "any", inputmode: "decimal", list: "taps" });
    name.value = g.name || ""; qty.value = g.qty; watts.value = g.watts;
    var remove = el("button", { type: "button", class: "ghost", title: "Remove this group", "aria-label": "Remove this group", text: "×" });
    var row = el("div", { class: "group-row" }, [
      el("div", { class: "g-name" }, [el("label", { for: "gname" + n, text: "Speaker group" }), name]),
      el("div", {}, [el("label", { for: "gqty" + n, text: "Quantity" }), qty]),
      el("div", {}, [el("label", { for: "gw" + n, text: "Tap each" }), el("div", { class: "ig" }, [watts, el("span", { text: "W" })])]),
      el("div", { class: "sub" }),
      remove
    ]);
    remove.addEventListener("click", function () { row.remove(); update(); });
    $("groups").appendChild(row);
    if (focus) { name.focus(); }
  }
  function readGroups() {
    return Array.prototype.map.call($("groups").children, function (row) {
      var inputs = row.querySelectorAll("input");
      var g = { name: inputs[0].value.trim(), qty: parseFloat(inputs[1].value), watts: parseFloat(inputs[2].value) };
      var sub = (g.qty > 0 && g.watts > 0) ? g.qty * g.watts : 0;
      row.querySelector(".sub").textContent = f(sub) + " W";
      return g;
    });
  }

  // ----- wire list and table -----
  function fillWires() {
    var sel = $("wire"), groups = {};
    CV.WIRES.forEach(function (w) {
      if (!groups[w.group]) { groups[w.group] = el("optgroup", { label: w.group }); sel.appendChild(groups[w.group]); }
      groups[w.group].appendChild(el("option", { value: w.id, text: w.label }));
      var perM = CV.wireOhmPerMetre(w.id), fromFt = w.ohmPer1000ft !== undefined;
      var a = el("td", {}, [el(fromFt ? "strong" : "span", { text: f(perM * 304.8, fromFt ? 4 : 3) })]);
      var b = el("td", {}, [el(fromFt ? "span" : "strong", { text: f(perM * 1000, 2) })]);
      $("wireTable").tBodies[0].appendChild(el("tr", {}, [el("td", { text: w.label }), a, b]));
    });
    sel.appendChild(el("option", { value: "custom", text: "Custom" }));
  }

  function result(box, label, value, formula) {
    box.appendChild(el("div", { class: "result" }, [
      el("div", { class: "top" }, [el("span", { text: label }), el("span", { class: "val", text: value })]),
      el("div", { class: "formula", text: formula })
    ]));
  }
  function badge(id, cls, text) { var b = $(id); b.className = "badge " + cls; b.textContent = text; b.hidden = !text; }
  function big(id, value, unit) {
    var b = $(id); b.textContent = value + " ";
    b.appendChild(el("small", { text: unit }));
  }
  function state(tileId, glanceId, cls, glanceText) {
    $(tileId).className = "card tile " + cls;
    $(glanceId).className = cls;
    $(glanceId).querySelector("b").textContent = glanceText;
  }

  // ----- remember what was typed (this browser only) -----
  function save(groups) {
    if (!ready) { return; }
    try {
      var s = { groups: groups, fields: {} };
      for (var k in DEFAULTS) { s.fields[k] = $(k).value; }
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch (e) { /* private window or storage blocked: carry on without it */ }
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!s || !Array.isArray(s.groups) || !s.fields) { return false; }
      $("groups").textContent = "";
      s.groups.forEach(function (g) {
        addGroup({ name: String(g.name || ""), qty: isFinite(g.qty) ? g.qty : "", watts: isFinite(g.watts) ? g.watts : "" });
      });
      for (var k in DEFAULTS) { if (typeof s.fields[k] === "string") { $(k).value = s.fields[k]; } }
      if (!$("wire").value) { $("wire").value = DEFAULTS.wire; }
      if (!$("lineVolts").value) { $("lineVolts").value = DEFAULTS.lineVolts; }
      return true;
    } catch (e) { return false; }
  }

  // ----- main update -----
  function update() {
    var groups = readGroups();
    var taps = CV.totalTapWatts(groups), count = CV.totalSpeakers(groups);
    var V = parseFloat($("lineVolts").value);
    var unit = $("lengthUnit").value, isFt = unit === "ft";
    var lenIn = nonNeg(num("length"), 0);
    var custom = $("wire").value === "custom";
    $("customWrap").hidden = !custom;

    var ohmM20, wireLabel;
    if (custom) {
      var c = nonNeg(num("customOhm"), 0), ckft = $("customUnit").value === "kft";
      ohmM20 = ckft ? CV.ohmPerMetreFrom1000ft(c) : CV.ohmPerMetreFromKm(c);
      wireLabel = "Custom, " + f(c, 3) + (ckft ? " Ω per 1000 ft" : " Ω per km");
    } else {
      ohmM20 = CV.wireOhmPerMetre($("wire").value);
      wireLabel = $("wire").selectedOptions[0].textContent + " copper";
    }
    var inp = {
      lineVolts: V, tapWatts: taps,
      insertionLossDb: nonNeg(num("insLoss"), 0), headroomPct: nonNeg(num("headroom"), 0),
      ampWatts: num("ampWatts"), lengthM: isFt ? lenIn * 0.3048 : lenIn,
      ohmPerMetre20: ohmM20, tempC: isFinite(num("tempC")) ? num("tempC") : 20,
      targetLossDb: num("targetDb") > 0 ? num("targetDb") : 0.5
    };
    var r = CV.calculate(inp);
    var hasLoad = taps > 0;
    var maxLen = isFt ? r.maxLengthM / 0.3048 : r.maxLengthM;

    $("tapTotal").textContent = f(count, 0) + (count === 1 ? " speaker" : " speakers") + " · " + f(taps) + " W of taps";

    // ----- Amplifier tile -----
    big("ampBig", hasLoad ? f(r.minAmpWatts, 1) : "—", "W");
    $("ampBarWrap").hidden = !(hasLoad && r.ampChecked);
    if (!hasLoad) {
      badge("ampBadge", "", ""); state("ampTile", "glanceAmp", "", "Add speakers");
      $("ampMsg").textContent = "Add at least one speaker group with a quantity and a tap wattage.";
    } else if (!r.ampChecked) {
      badge("ampBadge", "info", "Not checked"); state("ampTile", "glanceAmp", "", f(r.minAmpWatts, 1) + " W min");
      $("ampMsg").textContent = "Type an amplifier power to get a pass or fail.";
    } else {
      var cls = r.ampPass ? "ok" : "bad";
      badge("ampBadge", cls, r.ampPass ? "✓ Pass" : "✗ Fail");
      state("ampTile", "glanceAmp", cls, (r.ampPass ? "✓ " : "✗ ") + f(r.minAmpWatts, 1) + " W min");
      $("ampFill").className = "fill " + (r.ampPass ? "" : "bad");
      $("ampFill").style.width = pct(r.ampLoadPct);
      $("ampMark").style.left = pct(r.minAmpWatts / inp.ampWatts * 100);
      $("ampMark").hidden = r.minAmpWatts > inp.ampWatts;
      $("ampSw").className = "sw " + (r.ampPass ? "" : "bad");
      $("ampCapL").textContent = "Line load " + f(r.lineWatts, 1) + " W (" + f(r.ampLoadPct, 0) + " %)";
      $("ampCapM").textContent = "Needed with headroom";
      $("ampCapR").textContent = f(inp.ampWatts) + " W amplifier";
      $("ampMsg").textContent = r.ampPass
        ? "Your " + f(inp.ampWatts) + " W amplifier covers it with " + f(r.ampSpareWatts, 1) + " W to spare."
        : "Your " + f(inp.ampWatts) + " W amplifier is " + f(-r.ampSpareWatts, 1) +
          " W short. Use a bigger amplifier, lower some taps, or split the line.";
    }

    // ----- Cable tile -----
    big("lossBig", hasLoad ? f(r.lossDb, 2) : "—", "dB");
    $("lossFill").style.width = pct(r.lossDb / (2 * inp.targetLossDb) * 100);
    $("lossFill").className = "fill " + (r.lossOver ? "warn" : "");
    $("lossCapM").textContent = "target " + f(inp.targetLossDb) + " dB";
    $("lossCapR").textContent = f(2 * inp.targetLossDb) + " dB";
    if (!hasLoad) {
      badge("cableBadge", "", ""); state("cableTile", "glanceCable", "", "—");
      $("cableMsg").textContent = "No load entered yet.";
    } else if (r.lossOver) {
      badge("cableBadge", "warn", "⚠ Over target"); state("cableTile", "glanceCable", "warn", "⚠ " + f(r.lossDb, 2) + " dB");
      $("cableMsg").textContent = f(r.dropVolts, 2) + " V drop (" + f(r.dropPct, 1) + " %). Use a larger conductor, keep the run under " +
        f(maxLen, 0) + " " + unit + ", or split the load across more lines.";
    } else {
      badge("cableBadge", "ok", "✓ Within target"); state("cableTile", "glanceCable", "ok", "✓ " + f(r.lossDb, 2) + " dB");
      $("cableMsg").textContent = f(r.dropVolts, 2) + " V drop (" + f(r.dropPct, 1) + " %), leaving " + f(r.loadVolts, 1) +
        " V at the speakers.";
    }

    // ----- Key facts -----
    var facts = $("facts"); facts.textContent = "";
    function fact(a, b) { facts.appendChild(el("dt", { text: a })); facts.appendChild(el("dd", { text: b })); }
    fact("Total tap load", f(taps) + " W");
    fact("Load on the line", f(r.lineWatts, 1) + " W");
    fact("Load impedance", f(r.loadOhms, 1) + " Ω");
    fact("Line current", f(r.amps, 2) + " A");
    fact("Voltage at the speakers", f(r.loadVolts, 1) + " V");
    fact("Power lost in the cable", f(r.cableWatts, 2) + " W");
    fact("Longest run at " + f(inp.targetLossDb) + " dB", hasLoad ? f(maxLen, 0) + " " + unit : "—");

    // ----- Worked figures: amplifier -----
    var box = $("ampResults"); box.textContent = "";
    result(box, "Total tap load", f(taps) + " W", "sum of (quantity × tap watts) for every group");
    result(box, "Load on the line", f(r.lineWatts, 1) + " W",
      "tap total × 10^(insertion loss ÷ 10) = " + f(taps) + " × 10^(" + f(inp.insertionLossDb) +
      " ÷ 10) = " + f(taps) + " × " + f(r.lossFactor, 4));
    result(box, "Minimum amplifier power", f(r.minAmpWatts, 1) + " W",
      "line load × (1 + headroom ÷ 100) = " + f(r.lineWatts, 1) + " × " + f(1 + inp.headroomPct / 100, 3));
    result(box, "Load impedance the amplifier sees", f(r.loadOhms, 1) + " Ω",
      "V² ÷ line load = " + f(V, 1) + "² ÷ " + f(r.lineWatts, 1));
    if (r.ampChecked) {
      result(box, "Amplifier loading", f(r.ampLoadPct, 0) + " %",
        "line load ÷ amplifier power × 100 = " + f(r.lineWatts, 1) + " ÷ " + f(inp.ampWatts) + " × 100");
    }

    // ----- Worked figures: cable -----
    var perLen = isFt ? r.ohmPerMetre * 304.8 : r.ohmPerMetre * 1000;
    box = $("wireResults"); box.textContent = "";
    result(box, "Conductor resistance at " + f(inp.tempC, 0) + " °C", f(perLen, 3) + (isFt ? " Ω/1000 ft" : " Ω/km"),
      "R at 20 °C × (1 + 0.00393 × (T − 20)) = " +
      f((isFt ? ohmM20 * 304.8 : ohmM20 * 1000), 3) + " × " + f(1 + CV.COPPER_TEMP_COEFF * (inp.tempC - 20), 4));
    result(box, "Loop resistance (out and back)", f(r.loopOhms, 3) + " Ω",
      "2 × one-way length × resistance per length = 2 × " + f(lenIn) + " " + unit + " × " +
      f(perLen, 3) + " ÷ 1000");
    box = $("cableResults"); box.textContent = "";
    result(box, "Line current", f(r.amps, 3) + " A",
      "V ÷ (load impedance + loop resistance) = " + f(V, 1) + " ÷ (" + f(r.loadOhms, 2) + " + " + f(r.loopOhms, 3) + ")");
    result(box, "Voltage drop in the cable", f(r.dropVolts, 2) + " V (" + f(r.dropPct, 1) + " %)",
      "current × loop resistance = " + f(r.amps, 3) + " × " + f(r.loopOhms, 3));
    result(box, "Voltage at the speakers", f(r.loadVolts, 1) + " V",
      "V − voltage drop = " + f(V, 1) + " − " + f(r.dropVolts, 2));
    result(box, "Power lost as heat in the cable", f(r.cableWatts, 2) + " W",
      "current² × loop resistance = " + f(r.amps, 3) + "² × " + f(r.loopOhms, 3));
    result(box, "Power reaching the speakers", f(r.deliveredWatts, 1) + " W (" + f(r.powerLossPct, 1) + " % less)",
      "current² × load impedance = " + f(r.amps, 3) + "² × " + f(r.loadOhms, 2));
    result(box, "Level lost at the speakers", f(r.lossDb, 2) + " dB",
      "20 × log10((load + loop) ÷ load) = 20 × log10(" + f(r.totalOhms, 2) + " ÷ " + f(r.loadOhms, 2) + ")");
    result(box, "Longest run for " + f(inp.targetLossDb) + " dB with this cable", (hasLoad ? f(maxLen, 0) : "—") + " " + unit + " one way",
      "load impedance × (10^(target dB ÷ 20) − 1) ÷ (2 × resistance per length)");

    // ----- Print-only summary of what was typed in -----
    var project = $("project").value.trim();
    $("printTitle").textContent = (project ? project + " · " : "") + "Calculated " + new Date().toISOString().slice(0, 10);
    var tb = $("inputSummary").tBodies[0]; tb.textContent = "";
    function row(a, b) { tb.appendChild(el("tr", {}, [el("td", { text: a }), el("td", { text: b })])); }
    row("Line voltage", f(V, 1) + " V");
    groups.forEach(function (g, i) {
      if (g.qty > 0 && g.watts > 0) {
        row(g.name || "Group " + (i + 1), f(g.qty, 0) + " × " + f(g.watts) + " W = " + f(g.qty * g.watts) + " W");
      }
    });
    row("Insertion loss allowance", f(inp.insertionLossDb) + " dB");
    row("Headroom", f(inp.headroomPct) + " %");
    row("Amplifier rated power", r.ampChecked ? f(inp.ampWatts) + " W" : "not entered");
    row("Cable", wireLabel + ", " + f(lenIn) + " " + unit + " one way, " + f(inp.tempC, 0) + " °C");
    row("Loss target", f(inp.targetLossDb) + " dB");

    save(groups);
  }

  function reset() {
    $("groups").textContent = "";
    EXAMPLE.forEach(function (g) { addGroup(g); });
    for (var k in DEFAULTS) { $(k).value = DEFAULTS[k]; }
    update();
  }

  fillWires();
  if (load()) { ready = true; update(); } else { ready = true; reset(); }
  $("form").addEventListener("input", update);
  $("form").addEventListener("change", update);
  $("addGroup").addEventListener("click", function () { addGroup({ name: "", qty: 1, watts: 5 }, true); update(); });
  $("printBtn").addEventListener("click", function () { window.print(); });
  $("resetBtn").addEventListener("click", reset);

  // Show the bottom strip only while both verdict tiles are off screen.
  if ("IntersectionObserver" in window) {
    var seen = {};
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
      $("glance").classList.toggle("away", !!(seen.ampTile || seen.cableTile));
    }, { threshold: 0.4 });
    watch.observe($("ampTile")); watch.observe($("cableTile"));
  }
})();
