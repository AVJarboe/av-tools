// Logic for the equipment list compare tool. No page code in here, so the
// same file runs in a browser and in Node.js (for compare.test.js).
//
// The steps, in order:
//   parseTable     pasted text or CSV text -> rows of cells
//   findHeaderRow  which row holds the column headings
//   guessColumns   which column is the model number, quantity and so on
//   readList       rows -> item lines, each tagged with its location and system
//   compare        two lists -> what was added, removed or changed
//   logText        the result as a plain-text revision log
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.ELC = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ROLES = ["manufacturer", "model", "part", "qty", "description", "location", "system"];
  var ROLE_NAMES = { manufacturer: "Manufacturer", model: "Model number", part: "Part number",
    qty: "Quantity", description: "Description", location: "Location", system: "System" };
  var SEP = "\u0001";

  // Tidy a cell: line breaks and runs of spaces become one space, ends trimmed.
  function clean(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[\s ]+/g, " ").trim();
  }
  // The form used for matching: tidy, and capitals ignored.
  function norm(s) { return clean(s).toLowerCase(); }
  function filledCount(cells) {
    var n = 0;
    for (var i = 0; i < cells.length; i++) { if (cells[i] !== "") { n++; } }
    return n;
  }

  // ----- 1. text -> rows -----

  // Cells copied from Excel arrive separated by tabs. CSV files use commas
  // (or semicolons in some regions). Use whichever appears most in the first lines.
  function pickDelimiter(text) {
    var lines = text.split(/\r\n|\r|\n/).filter(function (l) { return l.trim() !== ""; }).slice(0, 10);
    var count = { "\t": 0, ",": 0, ";": 0 };
    lines.forEach(function (l) {
      for (var i = 0; i < l.length; i++) { if (count[l[i]] !== undefined) { count[l[i]]++; } }
    });
    if (count["\t"] > 0 && count["\t"] >= count[","] && count["\t"] >= count[";"]) { return "\t"; }
    return count[";"] > count[","] ? ";" : ",";
  }

  function parseTable(text) {
    text = String(text === null || text === undefined ? "" : text);
    if (text.charCodeAt(0) === 0xFEFF) { text = text.slice(1); }   // byte-order mark
    var d = pickDelimiter(text), n = text.length;
    var rows = [], row = [], i = 0, j, val;

    function endsField(k) { return k >= n || text[k] === d || text[k] === "\n" || text[k] === "\r"; }
    // A cell wrapped in quotes can hold the separator, line breaks and doubled quotes ("").
    // Returns where the closing quote is, or -1 if this is not a properly quoted cell
    // (for example a cell that just starts with an inch mark), which is then read as plain text.
    function closingQuote(start) {
      var k = start + 1;
      while (k < n) {
        if (text[k] === '"') {
          if (text[k + 1] === '"') { k += 2; continue; }
          return endsField(k + 1) ? k : -1;
        }
        k++;
      }
      return -1;
    }

    while (i < n) {
      if (text[i] === '"' && (j = closingQuote(i)) !== -1) {
        val = text.slice(i + 1, j).replace(/""/g, '"');
        i = j + 1;
      } else {
        j = i;
        while (!endsField(j)) { j++; }
        val = text.slice(i, j);
        i = j;
      }
      row.push(clean(val));
      if (i >= n) { break; }
      if (text[i] === d) {
        i++;
        if (i >= n) { row.push(""); }
        continue;
      }
      i += (text[i] === "\r" && text[i + 1] === "\n") ? 2 : 1;
      rows.push(row);
      row = [];
    }
    if (row.length) { rows.push(row); }
    return { rows: rows, delimiter: d };
  }

  // ----- 2. column headings -----

  // The first row with two or more filled cells. Title lines above it have one.
  function findHeaderRow(rows) {
    for (var i = 0; i < rows.length; i++) { if (filledCount(rows[i]) >= 2) { return i; } }
    return -1;
  }

  // Checked in this order; each column is used once. "Mfr Part #" must be claimed
  // as a part number before the manufacturer check sees "mfr".
  var GUESSES = [
    ["description", /\bdesc/],
    ["qty", /\b(qty|qnty|quantity|count)\b/],
    ["model", /\bmodel\b/],
    ["part", /\b(part|sku|p n|pn|catalog|catalogue|item (number|no|num|code|id))\b/],
    ["manufacturer", /\b(manufacturer|manuf|mfr|mfg|brand|make|maker|vendor)\b/],
    ["location", /\b(location|room|area|zone|space)\b/],
    ["system", /\b(system|subsystem)\b/],
    ["description", /\b(item|name|product|equipment)\b/],
    ["qty", /^(units|pcs|ea|each)$/]
  ];

  function guessColumns(headerCells) {
    var map = {}, used = {};
    ROLES.forEach(function (r) { map[r] = -1; });
    var names = (headerCells || []).map(function (h) {
      return norm(h).replace(/[^a-z0-9]+/g, " ").trim();
    });
    GUESSES.forEach(function (g) {
      if (map[g[0]] !== -1) { return; }
      for (var c = 0; c < names.length; c++) {
        if (!used[c] && names[c] !== "" && g[1].test(names[c])) { map[g[0]] = c; used[c] = true; return; }
      }
    });
    return map;
  }

  // ----- 3. rows -> item lines -----

  // "2.0" -> 2, " 4 " -> 4, "1,200" -> 1200, "2 ea" -> 2, blank -> 1.
  // Anything that is not clearly a number ("TBD", "1,5") counts as 1 and is flagged.
  function parseQty(s) {
    s = clean(s);
    if (s === "") { return { value: 1, ok: true, blank: true }; }
    var t = s.replace(/,(?=\d{3}(\D|$))/g, "");
    var m = /^([-+]?(?:\d+\.?\d*|\.\d+))\s*[a-z.]*$/i.exec(t);
    if (!m) { return { value: 1, ok: false, blank: false }; }
    return { value: parseFloat(m[1]), ok: true, blank: false };
  }

  function round6(x) { return Math.round(x * 1e6) / 1e6; }

  // map: { manufacturer: column index or -1, model: ..., ... }
  // opts.oneLevel: treat every heading row as a location (no system level).
  function readList(rows, headerIndex, map, opts) {
    opts = opts || {};
    var has = {};
    ROLES.forEach(function (r) { has[r] = map[r] >= 0; });
    var useColumns = has.location || has.system;
    var header = rows[headerIndex] || [];
    function rowSig(cells) {
      var a = cells.map(norm);
      while (a.length && a[a.length - 1] === "") { a.pop(); }
      return a.join(SEP);
    }
    var headerSig = rowSig(header);
    var out = { items: [], headings: [], groups: [], unidentified: [], badQty: [], repeatedHeader: [],
      ignoredAbove: 0, has: has, groupSource: useColumns ? "columns" : "headings", levels: 0 };
    var r, k;

    for (r = 0; r < headerIndex; r++) { if (filledCount(rows[r]) > 0) { out.ignoredAbove++; } }

    // Pass 1: sort each row into "heading" or "item".
    var recs = [];
    for (r = headerIndex + 1; r < rows.length; r++) {
      var cells = rows[r], n = filledCount(cells);
      if (n === 0) { continue; }
      if (rowSig(cells) === headerSig) { out.repeatedHeader.push(r + 1); continue; }
      if (!useColumns && n === 1) {
        recs.push({ kind: "heading", row: r + 1, text: cells.filter(function (c) { return c !== ""; })[0] });
      } else {
        recs.push({ kind: "item", row: r + 1, cells: cells });
      }
    }

    // Pass 2: decide what level each heading is.
    //   Heading directly followed by another heading = location, then system.
    //   If that never happens in the list, every heading is a location.
    var twoLevel = false;
    if (!opts.oneLevel) {
      for (k = 0; k + 2 < recs.length; k++) {
        if (recs[k].kind === "heading" && recs[k + 1].kind === "heading" && recs[k + 2].kind === "item") {
          twoLevel = true;
          break;
        }
      }
    }
    var loc = "", sys = "", haveLoc = false;
    k = 0;
    while (k < recs.length) {
      if (recs[k].kind !== "heading") { k++; continue; }
      var end = k;
      while (end + 1 < recs.length && recs[end + 1].kind === "heading") { end++; }
      var hasItems = end + 1 < recs.length;
      for (var h = k; h <= end; h++) {
        var level;
        if (!hasItems) { level = "empty"; }
        else if (!twoLevel) { level = h === end ? "location" : "empty"; }
        else if (end > k) { level = h === end ? "system" : (h === end - 1 ? "location" : "empty"); }
        else { level = haveLoc ? "system" : "location"; }
        recs[h].level = level;
        if (level === "location") { loc = recs[h].text; sys = ""; haveLoc = true; }
        if (level === "system") { sys = recs[h].text; }
      }
      // tag the items under this run of headings
      for (h = end + 1; h < recs.length && recs[h].kind === "item"; h++) { recs[h].location = loc; recs[h].system = sys; }
      k = end + 1;
    }

    // Pass 3: build the item lines.
    var groupIndex = Object.create(null);
    recs.forEach(function (rec) {
      if (rec.kind === "heading") {
        out.headings.push({ row: rec.row, text: rec.text, level: rec.level });
        return;
      }
      function get(role) { return has[role] ? clean(rec.cells[map[role]]) : ""; }
      var it = { row: rec.row, manufacturer: get("manufacturer"), model: get("model"), part: get("part"),
        description: get("description"),
        location: useColumns ? get("location") : (rec.location || ""),
        system: useColumns ? get("system") : (rec.system || "") };
      it.idKind = it.model ? "model" : it.part ? "part" : it.description ? "description" : "";
      if (!it.idKind) {
        out.unidentified.push({ row: rec.row, text: rec.cells.filter(function (c) { return c !== ""; }).join(" | ") });
        return;
      }
      it.key = it.idKind + ":" + norm(it[it.idKind]);
      var q = parseQty(has.qty ? rec.cells[map.qty] : "");
      it.qty = q.value;
      if (!q.ok) { out.badQty.push(rec.row); }
      out.items.push(it);
      var gk = norm(it.location) + SEP + norm(it.system);
      if (groupIndex[gk] === undefined) {
        groupIndex[gk] = out.groups.length;
        out.groups.push({ location: it.location, system: it.system, lines: 0 });
      }
      out.groups[groupIndex[gk]].lines++;
    });

    var anyLoc = out.groups.some(function (g) { return g.location !== ""; });
    var anySys = out.groups.some(function (g) { return g.system !== ""; });
    out.levels = anySys ? 2 : anyLoc ? 1 : 0;
    return out;
  }

  // ----- 4. compare -----

  // Keep the order of `base`, and slot in anything only `other` has, right
  // after the entry that came before it in `other`.
  function mergeOrder(base, other) {
    var out = base.slice(), seen = Object.create(null), at = -1;
    base.forEach(function (k) { seen[k] = true; });
    other.forEach(function (k) {
      if (seen[k]) { at = out.indexOf(k); }
      else { at += 1; out.splice(at, 0, k); seen[k] = true; }
    });
    return out;
  }

  // Add together lines that are the same item in the same location and system.
  // idRoles: the identifying columns both lists have, in order of preference.
  // If only one list has a Model column, matching falls to the part number
  // (or description) for both, instead of nothing matching at all.
  function aggregate(list, useMfr, idRoles) {
    var groups = Object.create(null), order = [];
    list.items.forEach(function (it) {
      var kind = idRoles.filter(function (r) { return it[r]; })[0];
      var key = kind ? kind + ":" + norm(it[kind]) : it.key;
      kind = kind || it.idKind;
      var gk = norm(it.location) + SEP + norm(it.system);
      var g = groups[gk];
      if (!g) {
        g = groups[gk] = { location: it.location, system: it.system, order: [], items: Object.create(null) };
        order.push(gk);
      }
      var fk = key + SEP + (useMfr ? norm(it.manufacturer) : "");
      var a = g.items[fk];
      if (!a) {
        a = g.items[fk] = { key: key, idKind: kind, manufacturer: "", model: "", part: "",
          description: "", qty: 0, lines: 0, rows: [] };
        g.order.push(fk);
      }
      a.qty = round6(a.qty + it.qty);
      a.lines++;
      a.rows.push(it.row);
      ["manufacturer", "model", "part", "description"].forEach(function (f) {
        if (!a[f] && it[f]) { a[f] = it[f]; }
      });
    });
    return { groups: groups, order: order };
  }

  var FIELD_NAMES = { manufacturer: "manufacturer", part: "part number", description: "description" };

  function compare(listA, listB) {
    // Manufacturer is part of the identity only when both lists have that column.
    var useMfr = listA.has.manufacturer && listB.has.manufacturer;
    var fields = ["manufacturer", "part", "description"].filter(function (f) {
      return listA.has[f] && listB.has[f];
    });
    var idRoles = ["model", "part", "description"].filter(function (f) { return listA.has[f] && listB.has[f]; });
    var A = aggregate(listA, useMfr, idRoles), B = aggregate(listB, useMfr, idRoles);

    // Group order: revision B's order, with groups only in A slotted in.
    // Then keep all the systems of one location together.
    var gOrder = mergeOrder(B.order, A.order);
    var locFirst = Object.create(null);
    gOrder.forEach(function (gk, i) {
      var l = gk.split(SEP)[0];
      if (locFirst[l] === undefined) { locFirst[l] = i; }
    });
    gOrder = gOrder.map(function (gk, i) { return { gk: gk, l: locFirst[gk.split(SEP)[0]], i: i }; })
      .sort(function (x, y) { return x.l - y.l || x.i - y.i; })
      .map(function (x) { return x.gk; });

    var result = { groups: [], fields: fields, useManufacturer: useMfr,
      counts: { added: 0, removed: 0, quantity: 0, changed: 0, unchanged: 0, changes: 0 },
      combined: { a: { lines: 0, items: 0 }, b: { lines: 0, items: 0 } },
      hasLocation: false, hasSystem: false,
      unidentified: { a: listA.unidentified, b: listB.unidentified } };
    var none = Object.create(null);

    gOrder.forEach(function (gk) {
      var ga = A.groups[gk], gb = B.groups[gk];
      var itemsA = ga ? ga.items : none, itemsB = gb ? gb.items : none;
      var orderA = ga ? ga.order : [], orderB = gb ? gb.order : [];

      // Same model, different manufacturer text (or one side blank): if there is
      // exactly one such leftover on each side, treat it as the same item with a
      // changed manufacturer instead of one removed and one added.
      var pairB = Object.create(null), pairA = Object.create(null);
      if (useMfr && ga && gb) {
        var leftA = Object.create(null), leftB = Object.create(null);
        orderA.forEach(function (fk) {
          if (!itemsB[fk]) { (leftA[itemsA[fk].key] = leftA[itemsA[fk].key] || []).push(fk); }
        });
        orderB.forEach(function (fk) {
          if (!itemsA[fk]) { (leftB[itemsB[fk].key] = leftB[itemsB[fk].key] || []).push(fk); }
        });
        Object.keys(leftA).forEach(function (key) {
          if (leftB[key] && leftA[key].length === 1 && leftB[key].length === 1) {
            pairB[leftB[key][0]] = leftA[key][0];
            pairA[leftA[key][0]] = leftB[key][0];
          }
        });
      }

      var merged = mergeOrder(orderB, orderA.map(function (fk) { return pairA[fk] || fk; }));
      var g = { location: (gb || ga).location, system: (gb || ga).system,
        status: ga && gb ? "both" : gb ? "added" : "removed", entries: [], changes: 0 };
      g.label = [g.location, g.system].filter(Boolean).join(" / ");
      if (g.location) { result.hasLocation = true; }
      if (g.system) { result.hasSystem = true; }

      merged.forEach(function (fk) {
        var b = itemsB[fk] || null, a = itemsA[pairB[fk] || fk] || null;
        var e = { a: a, b: b, item: b || a, qtyA: a ? a.qty : 0, qtyB: b ? b.qty : 0, details: [],
          linesA: a ? a.lines : 0, linesB: b ? b.lines : 0 };
        e.diff = round6(e.qtyB - e.qtyA);
        if (!a) { e.status = "added"; }
        else if (!b) { e.status = "removed"; }
        else {
          fields.forEach(function (f) {
            if (norm(a[f]) !== norm(b[f])) { e.details.push({ field: f, name: FIELD_NAMES[f], from: a[f], to: b[f] }); }
          });
          e.status = e.details.length ? "changed" : e.diff !== 0 ? "quantity" : "unchanged";
        }
        result.counts[e.status]++;
        if (e.status !== "unchanged") { g.changes++; result.counts.changes++; }
        if (e.linesA > 1) { result.combined.a.lines += e.linesA; result.combined.a.items++; }
        if (e.linesB > 1) { result.combined.b.lines += e.linesB; result.combined.b.items++; }
        g.entries.push(e);
      });
      result.groups.push(g);
    });
    return result;
  }

  // ----- 5. wording -----

  function fmtQty(n) { return String(Math.round(n * 1000) / 1000); }
  function fmtDiff(n) { return (n > 0 ? "+" : "") + fmtQty(n); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function shown(v) { return v === "" ? "(blank)" : v; }

  function itemLabel(it, leaveOutDescription) {
    var id = it.idKind === "model" ? it.model : it.idKind === "part" ? it.part : "";
    var desc = (leaveOutDescription && id) ? "" : it.description;
    return [it.manufacturer, id, desc].filter(Boolean).join(" ");
  }
  function detailText(d) {
    if (d.field === "description") { return d.name + ' "' + d.from + '" to "' + d.to + '"'; }
    return d.name + " " + shown(d.from) + " to " + shown(d.to);
  }
  function combinedNote(e, nameA, nameB) {
    var parts = [];
    if (e.linesA > 1) { parts.push(e.linesA + " lines added together in " + nameA); }
    if (e.linesB > 1) { parts.push(e.linesB + " lines added together in " + nameB); }
    return parts.join(", ");
  }
  var STATUS_LABEL = { added: "Added", removed: "Removed", quantity: "Quantity", changed: "Changed", unchanged: "Unchanged" };

  // One log line, split into its label ("Added") and the rest, so the page can bold the label.
  function entryLine(e, nameA, nameB) {
    var text, qtyChange = fmtQty(e.qtyA) + " to " + fmtQty(e.qtyB) + " (" + fmtDiff(e.diff) + ")";
    if (e.status === "added") { text = fmtQty(e.qtyB) + " x " + itemLabel(e.item); }
    else if (e.status === "removed") { text = fmtQty(e.qtyA) + " x " + itemLabel(e.item); }
    else if (e.status === "quantity") { text = itemLabel(e.item) + ", " + qtyChange; }
    else if (e.status === "unchanged") { text = fmtQty(e.qtyB) + " x " + itemLabel(e.item); }
    else {
      var descChanged = e.details.some(function (d) { return d.field === "description"; });
      var bits = e.details.map(detailText);
      if (e.diff !== 0) { bits.unshift("quantity " + qtyChange); }
      text = itemLabel(e.item, descChanged) + ", " + bits.join(", ");
    }
    var note = combinedNote(e, nameA, nameB);
    return { label: STATUS_LABEL[e.status], text: text + (note ? " [" + note + "]" : "") };
  }

  function summaryLine(result, nameA, nameB) {
    var c = result.counts;
    return nameA + " to " + nameB + ": " + plural(c.changes, "change", "changes") + ", " +
      plural(c.unchanged, "item", "items") + " unchanged";
  }
  function countsLine(result) {
    var c = result.counts;
    return c.added + " added, " + c.removed + " removed, " + c.quantity + " quantity, " + c.changed + " changed";
  }
  function groupTitle(g, nameA, nameB) {
    var label = g.label || "(no heading)";
    if (g.status === "added") { return label + " (only in " + nameB + ")"; }
    if (g.status === "removed") { return label + " (only in " + nameA + ")"; }
    return label;
  }
  function combinedLines(result, nameA, nameB) {
    var out = [];
    [["a", nameA], ["b", nameB]].forEach(function (s) {
      var c = result.combined[s[0]];
      if (c.items) {
        out.push(s[1] + ": " + c.lines + " lines were the same item in the same group and were added together into " +
          plural(c.items, "item", "items") + ".");
      }
    });
    return out;
  }
  function unidentifiedLines(result, nameA, nameB) {
    var out = [];
    [["a", nameA], ["b", nameB]].forEach(function (s) {
      result.unidentified[s[0]].forEach(function (u) { out.push(s[1] + ", row " + u.row + ": " + u.text); });
    });
    return out;
  }

  // The whole log as plain text, for copying.
  function logText(result, nameA, nameB) {
    nameA = nameA || "Revision A"; nameB = nameB || "Revision B";
    var lines = [summaryLine(result, nameA, nameB)];
    if (result.counts.changes) { lines.push("(" + countsLine(result) + ")"); }
    else { lines.push("No differences found."); }
    var showTitles = result.hasLocation || result.hasSystem;
    result.groups.forEach(function (g) {
      if (!g.changes) { return; }
      lines.push("");
      if (showTitles) { lines.push(groupTitle(g, nameA, nameB)); }
      g.entries.forEach(function (e) {
        if (e.status === "unchanged") { return; }
        var l = entryLine(e, nameA, nameB);
        lines.push("- " + l.label + ": " + l.text);
      });
    });
    var comb = combinedLines(result, nameA, nameB);
    if (comb.length) { lines.push(""); lines.push("Duplicate lines"); comb.forEach(function (c) { lines.push("- " + c); }); }
    var un = unidentifiedLines(result, nameA, nameB);
    if (un.length) {
      lines.push("");
      lines.push("Not compared (no model number, part number or description)");
      un.forEach(function (u) { lines.push("- " + u); });
    }
    return lines.join("\n");
  }

  // The same result as a table: a heading row and one row per item.
  // opts.unchanged: include items that did not change.
  function tableRows(result, nameA, nameB, opts) {
    opts = opts || {};
    nameA = nameA || "Revision A"; nameB = nameB || "Revision B";
    var head = [];
    if (result.hasLocation) { head.push("Location"); }
    if (result.hasSystem) { head.push("System"); }
    head = head.concat(["Change", "Manufacturer", "Model", "Part number", "Description", "Qty A", "Qty B", "Difference", "Detail"]);
    var rows = [], status = [];
    result.groups.forEach(function (g) {
      g.entries.forEach(function (e) {
        if (e.status === "unchanged" && !opts.unchanged) { return; }
        var row = [];
        if (result.hasLocation) { row.push(g.location); }
        if (result.hasSystem) { row.push(g.system); }
        var detail = e.details.map(detailText);
        var note = combinedNote(e, nameA, nameB);
        if (note) { detail.push(note); }
        row.push(STATUS_LABEL[e.status], e.item.manufacturer, e.item.model, e.item.part, e.item.description,
          fmtQty(e.qtyA), fmtQty(e.qtyB), fmtDiff(e.diff), detail.join("; "));
        rows.push(row);
        status.push(e.status);
      });
    });
    return { head: head, rows: rows, status: status };
  }

  return {
    ROLES: ROLES, ROLE_NAMES: ROLE_NAMES,
    clean: clean, norm: norm, filledCount: filledCount,
    parseTable: parseTable, findHeaderRow: findHeaderRow, guessColumns: guessColumns,
    parseQty: parseQty, readList: readList, mergeOrder: mergeOrder, compare: compare,
    fmtQty: fmtQty, fmtDiff: fmtDiff, itemLabel: itemLabel, entryLine: entryLine,
    summaryLine: summaryLine, countsLine: countsLine, groupTitle: groupTitle,
    combinedLines: combinedLines, unidentifiedLines: unidentifiedLines,
    logText: logText, tableRows: tableRows
  };
});
