// Page code for the equipment list compare tool. All the reading, matching and
// wording lives in compare.js. Nothing here saves or sends anything.
(function () {
  "use strict";
  var ELC = window.ELC, SAMPLE = window.ELC_SAMPLE;
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in props || {}) {
      if (k === "text") { e.textContent = props[k]; }
      else if (k === "class") { e.className = props[k]; }
      else { e.setAttribute(k, props[k]); }
    }
    (kids || []).forEach(function (c) { e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }

  var sides = {
    A: { rows: [], headerIndex: -1, headerSig: null, map: null, list: null, fileMsg: "" },
    B: { rows: [], headerIndex: -1, headerSig: null, map: null, list: null, fileMsg: "" }
  };
  var last = null;   // the result on screen, if any

  function revName(L) { return ELC.clean($("name" + L).value) || "Revision " + L; }
  function colLetter(i) {
    var s = "";
    for (i = i + 1; i > 0; i = Math.floor((i - 1) / 26)) { s = String.fromCharCode(65 + (i - 1) % 26) + s; }
    return s;
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function hasId(s) { return !!s.list && (s.map.model >= 0 || s.map.part >= 0 || s.map.description >= 0); }

  // ----- step 2: read the text and show what was understood -----

  function readOpts() { return { oneLevel: $("levels").value === "one" }; }

  function analyse(L) {
    var s = sides[L];
    s.rows = ELC.parseTable($("text" + L).value).rows;
    s.headerIndex = ELC.findHeaderRow(s.rows);
    var header = s.headerIndex >= 0 ? s.rows[s.headerIndex] : [];
    var sig = header.join("\u0001");
    if (sig !== s.headerSig) { s.map = ELC.guessColumns(header); s.headerSig = sig; }   // keep the user's corrections otherwise
    reread(L);
  }
  function reread(L) {
    var s = sides[L];
    s.list = s.headerIndex >= 0 ? ELC.readList(s.rows, s.headerIndex, s.map, readOpts()) : null;
    renderRead(L);
    updateCompareState();
  }

  function renderRead(L) {
    var s = sides[L], box = $("read" + L);
    box.textContent = "";
    box.appendChild(el("h3", { text: "Revision " + L }));
    if (s.fileMsg) { box.appendChild(el("p", { class: "bad small", text: s.fileMsg })); }
    if (!s.rows.some(function (r) { return ELC.filledCount(r) > 0; })) {
      box.appendChild(el("p", { class: "muted small", text: "Nothing here yet." }));
      return;
    }
    if (!s.list) {
      box.appendChild(el("p", { class: "bad small", text: "No row of column headings found. The list needs a row " +
        "with at least two filled cells, such as Model and Qty, above the items." }));
      return;
    }
    var list = s.list, header = s.rows[s.headerIndex];
    box.appendChild(el("p", { class: "small", text: "Column headings found on row " + (s.headerIndex + 1) + "." +
      (list.ignoredAbove ? " " + plural(list.ignoredAbove, "row", "rows") + " above it ignored." : "") }));

    var fields = el("div", { class: "fields" });
    ELC.ROLES.forEach(function (role) {
      var id = "col" + L + role;
      var sel = el("select", { id: id }, [el("option", { value: "-1", text: "(not in this list)" })]);
      header.forEach(function (h, i) {
        sel.appendChild(el("option", { value: String(i), text: colLetter(i) + ": " + (h || "(no heading)") }));
      });
      sel.value = String(s.map[role]);
      sel.addEventListener("change", function () {
        s.map[role] = parseInt(sel.value, 10);
        stale();
        reread(L);
        var again = $(id);
        if (again) { again.focus(); }
      });
      fields.appendChild(el("div", {}, [el("label", { for: id, text: ELC.ROLE_NAMES[role] }), sel]));
    });
    box.appendChild(fields);

    if (!hasId(s)) {
      box.appendChild(el("p", { class: "bad small", text: "Pick a column for at least one of Model number, Part number or Description." }));
      return;
    }

    var how;
    if (list.groupSource === "columns") { how = "Grouped by the Location and System columns."; }
    else if (list.levels === 2) { how = "Heading rows read as location, then system."; }
    else if (list.levels === 1) { how = "Heading rows read as locations (one level)."; }
    else { how = "No heading rows found, so this is compared as one flat list."; }
    box.appendChild(el("p", { class: "small" }, [el("strong", { text: plural(list.items.length, "line", "lines") + " read. " }), how]));

    if (list.levels > 0) {
      var ul = el("ul", { class: "group-list small" });
      list.groups.forEach(function (g) {
        var label = [g.location, g.system].filter(Boolean).join(" / ") || "(above the first heading)";
        ul.appendChild(el("li", { text: label + ": " + plural(g.lines, "line", "lines") }));
      });
      box.appendChild(ul);
    }

    var notes = [];
    var empty = list.headings.filter(function (h) { return h.level === "empty"; });
    if (empty.length) {
      notes.push("Heading with nothing under it, ignored: " + empty.map(function (h) {
        return "row " + h.row + " \"" + h.text + "\"";
      }).join(", ") + ".");
    }
    if (list.unidentified.length) {
      notes.push(plural(list.unidentified.length, "line has", "lines have") + " no model number, part number or " +
        "description and cannot be compared: " + rowList(list.unidentified.map(function (u) { return u.row; })) + ".");
    }
    if (list.badQty.length) { notes.push("Quantity is not a number, counted as 1: " + rowList(list.badQty) + "."); }
    if (list.repeatedHeader.length) { notes.push("Repeated row of column headings skipped: " + rowList(list.repeatedHeader) + "."); }
    if (notes.length) {
      box.appendChild(el("ul", { class: "small warn" }, notes.map(function (n) { return el("li", { text: n }); })));
    }
  }
  function rowList(rows) {
    var shown = rows.slice(0, 12).join(", ");
    return (rows.length === 1 ? "row " : "rows ") + shown + (rows.length > 12 ? " and " + (rows.length - 12) + " more" : "");
  }

  function ready() { return hasId(sides.A) && hasId(sides.B); }
  function updateCompareState() {
    var ok = ready();
    $("compareBtn").disabled = !ok;
    $("compareMsg").textContent = ok ? "" : "Both lists need column headings and at least one identifying column.";
  }
  function stale() {
    last = null;
    $("results").hidden = true;
    $("copyMsg").textContent = "";
  }

  // ----- loading a file -----

  // Excel saves plain "CSV" in the Windows character set and "CSV UTF-8" in UTF-8.
  // Try UTF-8 first and fall back, so symbols such as (R) and the degree sign survive either way.
  function decode(buffer) {
    var bytes = new Uint8Array(buffer);
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) { return new TextDecoder("utf-16le").decode(bytes); }
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) { return new TextDecoder("utf-16be").decode(bytes); }
    try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch (e) { return new TextDecoder("windows-1252").decode(bytes); }
  }
  function loadFile(L, file) {
    var s = sides[L];
    if (/\.(xlsx?|xlsm|xlsb|pdf|docx?|numbers)$/i.test(file.name)) {
      s.fileMsg = "That file type is not read. Open it in Excel, select the cells, copy, and paste them into the box above. Or save it as .csv first.";
      renderRead(L);
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      s.fileMsg = "";
      $("text" + L).value = decode(reader.result);
      stale();
      analyse(L);
    };
    reader.onerror = function () { s.fileMsg = "The file could not be read."; renderRead(L); };
    reader.readAsArrayBuffer(file);
  }

  // ----- results -----

  var STATUS_CLASS = { added: "ok", removed: "bad", quantity: "warn", changed: "warn", unchanged: "muted" };

  function renderResults() {
    if (!ready()) { return; }
    var r = ELC.compare(sides.A.list, sides.B.list), nA = revName("A"), nB = revName("B");
    last = { r: r, nA: nA, nB: nB };
    $("summary").textContent = ELC.summaryLine(r, nA, nB);

    var c = r.counts, badges = $("badges");
    badges.textContent = "";
    [[c.added + " added", "ok"], [c.removed + " removed", "bad"], [c.quantity + " quantity", "warn"],
      [c.changed + " changed", "warn"], [c.unchanged + " unchanged", "muted"]].forEach(function (b) {
      badges.appendChild(el("span", { class: "badge " + b[1], text: b[0] }));
    });

    var log = $("log"), showTitles = r.hasLocation || r.hasSystem;
    log.textContent = "";
    if (!c.changes) { log.appendChild(el("p", { text: "No differences found." })); }
    r.groups.forEach(function (g) {
      if (!g.changes) { return; }
      if (showTitles) { log.appendChild(el("h4", { text: ELC.groupTitle(g, nA, nB) })); }
      var ul = el("ul");
      g.entries.forEach(function (e) {
        if (e.status === "unchanged") { return; }
        var line = ELC.entryLine(e, nA, nB);
        ul.appendChild(el("li", {}, [el("strong", { class: STATUS_CLASS[e.status], text: line.label + ":" }), " " + line.text]));
      });
      log.appendChild(ul);
    });

    var notes = $("notes");
    notes.textContent = "";
    notes.className = "log";
    [["Duplicate lines", ELC.combinedLines(r, nA, nB)],
      ["Not compared (no model number, part number or description)", ELC.unidentifiedLines(r, nA, nB)]].forEach(function (n) {
      if (!n[1].length) { return; }
      notes.appendChild(el("h4", { text: n[0] }));
      notes.appendChild(el("ul", {}, n[1].map(function (t) { return el("li", { text: t }); })));
    });

    renderTable();
    var d = new Date();
    var today = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    $("printTitle").textContent = nA + " compared with " + nB + ". Printed " + today + ".";
    $("copyMsg").textContent = "";
    $("results").hidden = false;
  }

  function currentTable() {
    return ELC.tableRows(last.r, last.nA, last.nB, { unchanged: $("showUnchanged").checked });
  }
  function renderTable() {
    var t = currentTable(), thead = $("resultTable").tHead, tbody = $("resultTable").tBodies[0];
    var numFrom = t.head.indexOf("Qty A"), changeCol = t.head.indexOf("Change"), detailCol = t.head.length - 1;
    var modelCol = t.head.indexOf("Model"), partCol = t.head.indexOf("Part number");
    function cls(i) {
      return i >= numFrom && i < detailCol ? "num" : i === detailCol ? "detail" : (i === modelCol || i === partCol) ? "code" : "";
    }
    thead.textContent = "";
    tbody.textContent = "";
    thead.appendChild(el("tr", {}, t.head.map(function (h, i) { return el("th", { class: cls(i), text: h }); })));
    t.rows.forEach(function (row, n) {
      tbody.appendChild(el("tr", { class: t.status[n] }, row.map(function (cell, i) {
        return el("td", { class: i === changeCol ? STATUS_CLASS[t.status[n]] : cls(i), text: cell });
      })));
    });
    if (!t.rows.length) {
      tbody.appendChild(el("tr", {}, [el("td", { colspan: String(t.head.length), class: "muted", text: "No differences to list." })]));
    }
  }

  function copyText(text, what) {
    var msg = $("copyMsg");
    function done(ok) { msg.textContent = ok ? what + " copied." : "Could not copy. Select the text and copy it by hand."; }
    function oldWay() {
      var ta = el("textarea", { readonly: "", style: "position:fixed;top:0;left:0;opacity:0" });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(oldWay()); });
    } else { done(oldWay()); }
  }

  // ----- wiring -----

  ["A", "B"].forEach(function (L) {
    var timer = null;
    $("text" + L).addEventListener("input", function () {
      stale();
      clearTimeout(timer);
      timer = setTimeout(function () { sides[L].fileMsg = ""; analyse(L); }, 150);
    });
    $("file" + L).addEventListener("change", function () {
      if (this.files && this.files[0]) { loadFile(L, this.files[0]); }
      this.value = "";   // so picking the same file again still reloads it
    });
    $("name" + L).addEventListener("input", function () { if (last) { renderResults(); } });
  });
  $("levels").addEventListener("change", function () { stale(); reread("A"); reread("B"); });
  $("compareBtn").addEventListener("click", function () {
    renderResults();
    if (last) { $("results").scrollIntoView({ block: "start" }); }
  });
  $("sampleBtn").addEventListener("click", function () {
    $("textA").value = SAMPLE.a;
    $("textB").value = SAMPLE.b;
    $("levels").value = "auto";
    sides.A.fileMsg = sides.B.fileMsg = "";
    analyse("A");
    analyse("B");
    renderResults();
  });
  $("clearBtn").addEventListener("click", function () {
    ["A", "B"].forEach(function (L) {
      $("text" + L).value = "";
      $("name" + L).value = "";
      sides[L].fileMsg = "";
      analyse(L);
    });
    stale();
  });
  $("showUnchanged").addEventListener("change", function () { if (last) { renderTable(); } });
  $("copyLogBtn").addEventListener("click", function () {
    if (last) { copyText(ELC.logText(last.r, last.nA, last.nB), "Log"); }
  });
  $("copyTableBtn").addEventListener("click", function () {
    if (!last) { return; }
    var t = currentTable();
    copyText([t.head].concat(t.rows).map(function (r) { return r.join("\t"); }).join("\n"), "Table");
  });
  $("printBtn").addEventListener("click", function () { window.print(); });

  analyse("A");
  analyse("B");
  // A link ending in #sample opens the page with the sample already compared.
  if (location.hash === "#sample") { $("sampleBtn").click(); }
})();
