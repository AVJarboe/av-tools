// Page code for the equipment list compare tool. All the reading, matching and
// wording lives in compare.js. Nothing here saves or sends anything.
(function () {
  "use strict";
  var ELC = window.ELC, ELCX = window.ELCX, SAMPLE = window.ELC_SAMPLE;
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
    A: { rows: [], headerIndex: -1, headerSig: null, map: null, list: null, fileMsg: "", book: null, bookName: "", loadId: 0 },
    B: { rows: [], headerIndex: -1, headerSig: null, map: null, list: null, fileMsg: "", book: null, bookName: "", loadId: 0 }
  };
  var last = null;   // the result on screen, if any
  // What the user typed against the results. Kept in memory only (never saved or
  // sent), keyed by content so it is still there after comparing the same lists again.
  var reasons = {};                                   // entry id -> reason text
  var renameSel = { location: {}, system: {} };       // heading in A (lower case) -> { from, to }

  function headerInfo() {
    return { project: $("project").value, nameA: $("nameA").value, dateA: $("dateA").value,
      nameB: $("nameB").value, dateB: $("dateB").value, preparedBy: $("preparedBy").value };
  }
  function renameList() {
    var out = [];
    ["location", "system"].forEach(function (level) {
      Object.keys(renameSel[level]).forEach(function (k) {
        out.push({ level: level, from: renameSel[level][k].from, to: renameSel[level][k].to });
      });
    });
    return out;
  }

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
    renderRenames();
  }

  // Headings that only one list has. For each one in revision A, a drop-down to say
  // which heading in revision B it is the same as. Nothing is chosen for the user.
  function renderRenames() {
    var box = $("renames"), choices = 0;
    box.textContent = "";
    if (!ready()) { box.hidden = true; return; }
    var diff = ELC.headingDiff(sides.A.list, sides.B.list);
    box.appendChild(el("h3", { text: "Headings found in only one list" }));
    box.appendChild(el("p", { class: "small muted", text: "If a room or system was only renamed, say which heading " +
      "it matches and the two are compared as one. Left alone, it shows as a whole group removed and another added." }));
    var fields = el("div", { class: "fields" }), onlyB = [];
    ["location", "system"].forEach(function (level) {
      var d = diff[level], key, valid = {};
      d.onlyA.forEach(function (text, i) {
        key = ELC.norm(text);
        valid[key] = true;
        if (!d.allB.length) { return; }
        var id = "rename" + level + i;
        var sel = el("select", { id: id }, [el("option", { value: "", text: "Not in Revision B (leave as it is)" })]);
        var others = d.allB.filter(function (t) { return d.onlyB.indexOf(t) === -1; });
        d.onlyB.concat(others).forEach(function (t) { sel.appendChild(el("option", { value: t, text: t })); });
        var chosen = renameSel[level][key];
        if (chosen && d.allB.indexOf(chosen.to) !== -1) { sel.value = chosen.to; }
        else { delete renameSel[level][key]; }
        (function (key, text) {
          sel.addEventListener("change", function () {
            if (sel.value) { renameSel[level][key] = { from: text, to: sel.value }; }
            else { delete renameSel[level][key]; }
            stale();
          });
        })(key, text);
        fields.appendChild(el("div", {}, [el("label", { for: id, text: (level === "location" ? "Location" : "System") +
          " \"" + text + "\" in Revision A is the same as" }), sel]));
        choices++;
      });
      // forget choices for headings that are no longer in the list
      Object.keys(renameSel[level]).forEach(function (k) { if (!valid[k]) { delete renameSel[level][k]; } });
      d.onlyB.forEach(function (t) { onlyB.push(level + " \"" + t + "\""); });
    });
    box.appendChild(fields);
    if (onlyB.length) { box.appendChild(el("p", { class: "small muted", text: "Only in Revision B: " + onlyB.join(", ") + "." })); }
    box.hidden = choices === 0;
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
  var PASTE_INSTEAD = " Open it, select the cells, copy, and paste them into the box. Or save it as .xlsx or .csv first.";

  // Under the file button: what was loaded (plain) or why it could not be (red).
  function fileNote(L, text, bad) {
    var note = $("fileNote" + L);
    note.textContent = text || "";
    note.className = "small filenote " + (bad ? "bad" : "muted");
  }
  function forgetBook(L) {
    var s = sides[L];
    s.loadId++;            // anything still loading for this side is dropped when it arrives
    s.book = null;
    s.bookName = "";
    $("sheetBox" + L).hidden = true;
    $("sheet" + L).textContent = "";
  }
  function fileProblem(L, text) {
    forgetBook(L);
    fileNote(L, text, true);
  }
  function putText(L, text) {
    sides[L].fileMsg = "";
    $("text" + L).value = text;
    stale();
    analyse(L);
  }

  function loadFile(L, file) {
    var s = sides[L], reader = new FileReader();
    forgetBook(L);
    var id = s.loadId;
    fileNote(L, "Reading " + file.name + "...");
    reader.onload = function () {
      if (id !== s.loadId) { return; }
      var bytes = new Uint8Array(reader.result), kind = ELCX.sniff(bytes);
      if (kind === "pdf") {
        fileProblem(L, "PDF files are not read. Copy the table out of the PDF and paste it into the box, or ask for the spreadsheet.");
      } else if (kind === "ole") {
        fileProblem(L, "This is an old-style Excel file (.xls) or a password-protected workbook, which is not read." + PASTE_INSTEAD);
      } else if (kind === "zip") {
        if (!ELCX.canUnzip()) { fileProblem(L, "This browser cannot open .xlsx files." + PASTE_INSTEAD); return; }
        ELCX.open(bytes).then(function (book) {
          if (id !== s.loadId) { return; }
          s.book = book;
          s.bookName = file.name;
          var sel = $("sheet" + L), first = -1;
          book.sheets.forEach(function (sh, i) {
            sel.appendChild(el("option", { value: String(i), text: sh.name + (sh.hidden ? " (hidden sheet)" : "") }));
            if (first < 0 && !sh.hidden) { first = i; }
          });
          $("sheetBox" + L).hidden = book.sheets.length < 2;
          return firstListSheet(book, first < 0 ? 0 : first).then(function (i) {
            if (id !== s.loadId) { return; }
            sel.value = String(i);
            showSheet(L);
          });
        }).catch(function (e) { if (id === s.loadId) { fileProblem(L, bookError(e)); } });
      } else if (/\.(xls[xmb]?|pdf|docx?|numbers|ods)$/i.test(file.name)) {
        fileProblem(L, "That file could not be read as " + file.name.replace(/^.*\./, ".").toLowerCase() + "." + PASTE_INSTEAD);
      } else {
        putText(L, decode(reader.result));
        fileNote(L, "Loaded " + file.name + ".");
      }
    };
    reader.onerror = function () { if (id === s.loadId) { fileProblem(L, "The file could not be read."); } };
    reader.readAsArrayBuffer(file);
  }
  // Messages written in xlsx.js are plain words already; anything else is unexpected.
  function bookError(e) {
    if (!e || !e.plain) { return "This workbook could not be read." + PASTE_INSTEAD; }
    return /Save it|paste it/.test(e.message) ? e.message : e.message + PASTE_INSTEAD;
  }
  // Which sheet to show first: the first one that is not hidden and has a row of column
  // headings, so a cover sheet in front of the list is skipped. Failing that, the fallback.
  function firstListSheet(book, fallback) {
    function tryFrom(i) {
      if (i >= book.sheets.length) { return Promise.resolve(fallback); }
      if (book.sheets[i].hidden) { return tryFrom(i + 1); }
      return book.readSheet(i).then(function (rows) {
        return ELC.findHeaderRow(ELC.parseTable(ELCX.toText(rows)).rows) >= 0 ? i : tryFrom(i + 1);
      });
    }
    return tryFrom(0);
  }
  // Put the chosen sheet of the loaded workbook into the box, as if it had been pasted.
  function showSheet(L) {
    var s = sides[L], id = s.loadId, i = parseInt($("sheet" + L).value, 10), book = s.book;
    if (!book) { return; }
    book.readSheet(i).then(function (rows) {
      if (id !== s.loadId) { return; }
      putText(L, ELCX.toText(rows));
      var name = "\"" + book.sheets[i].name + "\"";
      fileNote(L, rows.length ? "Read sheet " + name + " from " + s.bookName + ": " + plural(rows.length, "row", "rows") + "."
        : "Sheet " + name + " in " + s.bookName + " is empty.", !rows.length);
    }).catch(function (e) { if (id === s.loadId) { fileProblem(L, bookError(e)); } });
  }

  // ----- results -----

  var STATUS_CLASS = { added: "ok", removed: "bad", quantity: "warn", changed: "warn", unchanged: "muted" };

  function renderResults() {
    if (!ready()) { return; }
    var r = ELC.compare(sides.A.list, sides.B.list, { renames: renameList() }), nA = revName("A"), nB = revName("B");
    last = { r: r, nA: nA, nB: nB };
    $("summary").textContent = ELC.summaryLine(r, nA, nB);
    var head = $("logHeader");
    head.textContent = "";
    ELC.headerLines(headerInfo()).forEach(function (l) { head.appendChild(el("p", { text: l })); });

    var c = r.counts, badges = $("badges");
    badges.textContent = "";
    [[c.added + " added", "ok"], [c.removed + " removed", "bad"], [c.quantity + " quantity", "warn"],
      [c.changed + " changed", "warn"], [c.unchanged + " unchanged", "muted"]].forEach(function (b) {
      badges.appendChild(el("span", { class: "badge " + b[1], text: b[0] }));
    });

    var log = $("log"), showTitles = r.hasLocation || r.hasSystem;
    log.textContent = "";
    if (!c.changes) { log.appendChild(el("p", { text: "No differences found." })); }
    ELC.renameLines(r, nA, nB).forEach(function (l) {
      log.appendChild(el("p", { class: "small" }, [el("strong", { text: "Renamed: " }), l]));
    });
    r.groups.forEach(function (g) {
      if (!g.changes) { return; }
      if (showTitles) { log.appendChild(el("h4", { text: ELC.groupTitle(g, nA, nB) })); }
      var ul = el("ul");
      g.entries.forEach(function (e) {
        if (e.status === "unchanged") { return; }
        var line = ELC.entryLine(e, nA, nB);
        // On screen the reason is a box to type in; on paper it is a line of text.
        var input = el("input", { type: "text", class: "reason no-print", maxlength: "200", autocomplete: "off",
          placeholder: "Reason (optional)", "aria-label": "Reason for this change: " + line.text });
        var printed = el("span", { class: "reason-print print-only" });
        function show() {
          var t = ELC.clean(reasons[e.id]);
          printed.textContent = t ? "Reason: " + t : "";
        }
        input.value = reasons[e.id] || "";
        input.addEventListener("input", function () {
          if (ELC.clean(input.value)) { reasons[e.id] = input.value; } else { delete reasons[e.id]; }
          show();
          renderTable();
          $("copyMsg").textContent = "";
        });
        show();
        ul.appendChild(el("li", {}, [el("strong", { class: STATUS_CLASS[e.status], text: line.label + ":" }),
          " " + line.text, input, printed]));
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
    return ELC.tableRows(last.r, last.nA, last.nB, { unchanged: $("showUnchanged").checked, reasons: reasons });
  }
  function renderTable() {
    var t = currentTable(), thead = $("resultTable").tHead, tbody = $("resultTable").tBodies[0];
    var numFrom = t.head.indexOf("Qty A"), changeCol = t.head.indexOf("Change"), detailCol = t.head.indexOf("Detail");
    var modelCol = t.head.indexOf("Model"), partCol = t.head.indexOf("Part number");
    function cls(i) {
      return i >= numFrom && i < detailCol ? "num" : i >= detailCol ? "detail" : (i === modelCol || i === partCol) ? "code" : "";
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
    $("sheet" + L).addEventListener("change", function () { showSheet(L); });
    // A file dragged onto the card loads the same way as one picked with the button.
    var card = $("card" + L);
    card.addEventListener("dragover", function (e) {
      if (!hasFile(e)) { return; }
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      card.classList.add("dragging");
    });
    card.addEventListener("dragleave", function (e) {
      if (!card.contains(e.relatedTarget)) { card.classList.remove("dragging"); }
    });
    card.addEventListener("drop", function (e) {
      if (!hasFile(e)) { return; }
      e.preventDefault();
      card.classList.remove("dragging");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) { loadFile(L, e.dataTransfer.files[0]); }
    });
  });
  // A file dropped beside the boxes must not make the browser leave the page to open it.
  function hasFile(e) { return !!e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") !== -1; }
  ["dragover", "drop"].forEach(function (type) {
    window.addEventListener(type, function (e) { if (hasFile(e)) { e.preventDefault(); } });
  });
  // Heading fields update the log on screen as they are typed.
  ["nameA", "dateA", "nameB", "dateB", "project", "preparedBy"].forEach(function (id) {
    $(id).addEventListener("input", function () { if (last) { renderResults(); } });
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
    ["A", "B"].forEach(function (L) { forgetBook(L); fileNote(L, ""); });
    analyse("A");
    analyse("B");
    renderResults();
  });
  $("clearBtn").addEventListener("click", function () {
    ["A", "B"].forEach(function (L) {
      $("text" + L).value = "";
      $("name" + L).value = "";
      $("date" + L).value = "";
      sides[L].fileMsg = "";
      forgetBook(L);
      fileNote(L, "");
    });
    $("project").value = "";
    $("preparedBy").value = "";
    reasons = {};
    renameSel = { location: {}, system: {} };
    analyse("A");
    analyse("B");
    stale();
  });
  $("showUnchanged").addEventListener("change", function () { if (last) { renderTable(); } });
  $("copyLogBtn").addEventListener("click", function () {
    if (last) { copyText(ELC.logText(last.r, last.nA, last.nB, { reasons: reasons, header: headerInfo() }), "Log"); }
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
