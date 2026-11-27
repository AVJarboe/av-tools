// Self-check for compare.js. The expected answers below were worked out by
// hand from the small lists written in each case, not produced by the code
// under test.
//
// Run either way:
//   node compare/compare.test.js     (from the repo root, needs Node.js)
//   open compare/selftest.html       (in any browser, no install needed)
(function (root) {
  "use strict";
  var inNode = typeof module === "object" && module.exports;
  var ELC = inNode ? require("./compare.js") : root.ELC;
  var SAMPLE = inNode ? require("./sample.js") : root.ELC_SAMPLE;
  var results = [];

  function same(name, got, want) {
    var g = JSON.stringify(got), w = JSON.stringify(want);
    results.push({ name: name, ok: g === w, got: g, want: w });
  }
  // Text -> list, using the tool's own column guess.
  function load(text, opts) {
    var t = ELC.parseTable(text);
    var h = ELC.findHeaderRow(t.rows);
    return ELC.readList(t.rows, h, ELC.guessColumns(t.rows[h]), opts);
  }
  function csv(lines) { return lines.join("\n") + "\n"; }
  function statuses(result) {
    var out = [];
    result.groups.forEach(function (g) {
      g.entries.forEach(function (e) { out.push((g.label ? g.label + ": " : "") + ELC.itemLabel(e.item, true) + " " + e.status); });
    });
    return out;
  }

  // Case 1: CSV with a byte-order mark, Windows line ends, a quoted comma, a quoted
  // line break, doubled quotes and a blank line. Four rows; the blank one is kept
  // so row numbers still match the spreadsheet.
  var t1 = ELC.parseTable("﻿a,b\r\n\"x, y\",\"line1\nline2\"\r\n\r\n\"say \"\"hi\"\"\",2\r\n");
  same("1 CSV rows", t1.rows, [["a", "b"], ["x, y", "line1 line2"], [""], ["say \"hi\"", "2"]]);
  same("1 CSV delimiter is a comma", t1.delimiter, ",");

  // Case 2: pasted from Excel (tabs). Inch marks are plain text, also at the start
  // of a cell. A cell with a line break arrives wrapped in quotes.
  var t2 = ELC.parseTable("Model\tDescription\n65U\t65\" display\n\"A\" frame\tstand\nX1\t\"two\nlines\"\nX2\tplain, with comma");
  same("2 pasted rows", t2.rows, [["Model", "Description"], ["65U", "65\" display"], ["\"A\" frame", "stand"],
    ["X1", "two lines"], ["X2", "plain, with comma"]]);
  same("2 pasted delimiter is a tab", t2.delimiter, "\t");

  // Case 3: semicolon CSV (common where the comma is the decimal mark), extra spaces trimmed.
  var t3 = ELC.parseTable("Model;Qty\n  CM-40 ;  2 \n");
  same("3 semicolon rows", t3.rows, [["Model", "Qty"], ["CM-40", "2"]]);

  // Case 4: the heading row is the first row with two or more filled cells, and
  // the columns are guessed from the heading names.
  var rows4 = [["Project list"], [""], ["Mfr", "Model No.", "Mfr Part #", "QTY", "Item Description", "Unit Price"]];
  same("4 heading row is the third row", ELC.findHeaderRow(rows4), 2);
  same("4 column guess", ELC.guessColumns(rows4[2]),
    { manufacturer: 0, model: 1, part: 2, qty: 3, description: 4, location: -1, system: -1 });
  same("4 column guess, other names", ELC.guessColumns(["Room", "System", "Brand", "SKU", "Quantity", "Item"]),
    { manufacturer: 2, model: -1, part: 3, qty: 4, description: 5, location: 0, system: 1 });
  same("4 no rows, no heading row", ELC.findHeaderRow([["only one cell"]]), -1);

  // Case 5: quantities.
  same("5 quantity 2.0", ELC.parseQty("2.0").value, 2);
  same("5 quantity ' 4 '", ELC.parseQty(" 4 ").value, 4);
  same("5 blank quantity counts as 1", ELC.parseQty("").value, 1);
  same("5 quantity 1,200", ELC.parseQty("1,200").value, 1200);
  same("5 quantity 2 ea", ELC.parseQty("2 ea").value, 2);
  same("5 quantity TBD counts as 1 and is flagged", ELC.parseQty("TBD"), { value: 1, ok: false, blank: false });
  same("5 quantity 1,5 is flagged, not read as 1.5 or 15", ELC.parseQty("1,5").ok, false);

  // Case 6: one level of heading rows. Every heading is a location, no system.
  // The title row above the column headings is ignored.
  var l6 = load(csv(["My list", "Model,Qty", "Room A,", "M1,1", "M2,2", "Room B,", "M3,1"]));
  same("6 one level: headings", l6.headings, [{ row: 3, text: "Room A", level: "location" }, { row: 6, text: "Room B", level: "location" }]);
  same("6 one level: groups", l6.groups, [{ location: "Room A", system: "", lines: 2 }, { location: "Room B", system: "", lines: 1 }]);
  same("6 one level: levels", l6.levels, 1);
  same("6 title row above the headings ignored", l6.ignoredAbove, 1);

  // Case 7: two levels. A heading directly followed by another heading is the
  // location, then the system. A single heading after that is another system in
  // the same location. A heading with nothing under it is marked empty.
  var l7 = load(csv(["Model,Qty", "Room A", "Audio", "M1,1", "Video", "M2,1", "Room B", "Audio", "M3,1", "Room C"]));
  same("7 two levels: heading levels", l7.headings.map(function (h) { return h.text + "=" + h.level; }),
    ["Room A=location", "Audio=system", "Video=system", "Room B=location", "Audio=system", "Room C=empty"]);
  same("7 two levels: groups", l7.groups, [{ location: "Room A", system: "Audio", lines: 1 },
    { location: "Room A", system: "Video", lines: 1 }, { location: "Room B", system: "Audio", lines: 1 }]);
  same("7 two levels: levels", l7.levels, 2);

  // Case 8: same text as case 7, but told there is only one level. In each pair
  // of headings the first has nothing under it, so the second one is the location.
  var l8 = load(csv(["Model,Qty", "Room A", "Audio", "M1,1", "Video", "M2,1"]), { oneLevel: true });
  same("8 forced one level", l8.headings.map(function (h) { return h.text + "=" + h.level; }),
    ["Room A=empty", "Audio=location", "Video=location"]);

  // Case 9: items above the first heading have no location. In a two-level list,
  // a single heading before any location is a location. Three headings in a row:
  // the last two are location and system, the first is marked empty.
  var l9 = load(csv(["Model,Qty", "M0,1", "General", "M1,1", "Level 2", "Room A", "Audio", "M2,1"]));
  same("9 mixed headings", l9.headings.map(function (h) { return h.text + "=" + h.level; }),
    ["General=location", "Level 2=empty", "Room A=location", "Audio=system"]);
  same("9 mixed groups", l9.groups, [{ location: "", system: "", lines: 1 }, { location: "General", system: "", lines: 1 },
    { location: "Room A", system: "Audio", lines: 1 }]);

  // Case 10: no headings at all is one flat list. A repeated heading row (page
  // break in an export) is skipped.
  var l10 = load(csv(["Model,Qty", "M1,1", "Model,Qty", "M2,1"]));
  same("10 flat list: levels", l10.levels, 0);
  same("10 flat list: items", l10.items.map(function (i) { return i.model; }), ["M1", "M2"]);
  same("10 repeated heading row skipped", l10.repeatedHeader, [3]);

  // Case 11: Location and System columns are used when the list has them, and
  // then a row with one filled cell is an ordinary line, not a heading.
  var l11 = load(csv(["Location,System,Model,Qty", "Room A,Audio,M1,2", "Room A,Video,M2,1", ",,M3,"]));
  same("11 columns: source", l11.groupSource, "columns");
  same("11 columns: groups", l11.groups, [{ location: "Room A", system: "Audio", lines: 1 },
    { location: "Room A", system: "Video", lines: 1 }, { location: "", system: "", lines: 1 }]);
  same("11 columns: no headings", l11.headings, []);

  // Case 12: what identifies a line. Model number first, then part number, then
  // description. A line with none of them is set aside with its row number.
  // A quantity that is not a number counts as 1 and its row is flagged.
  var l12 = load(csv(["Manufacturer,Model,Part Number,Qty,Description,Notes",
    "Example Audio,CM-40,EA-CM40,2,Microphone,", "Example Audio,,EA-77,1,Bracket,", ",,,TBD,Cable allowance,", ",,,3,,to be confirmed"]));
  same("12 identity keys", l12.items.map(function (i) { return i.key; }), ["model:cm-40", "part:ea-77", "description:cable allowance"]);
  same("12 quantities", l12.items.map(function (i) { return i.qty; }), [2, 1, 1]);
  same("12 flagged quantity row", l12.badQty, [4]);
  same("12 unidentified line", l12.unidentified, [{ row: 5, text: "3 | to be confirmed" }]);

  // Case 13: each kind of change, in a flat list.
  //   M1 same. M2 quantity 1 -> 3. M3 part number P3 -> P3-B. M4 description changed.
  //   M5 only in A (removed). M6 manufacturer blank -> EX. M7 only in B (added).
  // Order follows B, with M5 slotted in after M4 where it sat in A.
  var H13 = "Manufacturer,Model,Part Number,Qty,Description";
  var a13 = load(csv([H13, "EA,M1,P1,2,Mic", "EA,M2,P2,1,Speaker", "EA,M3,P3,1,Amp", "EA,M4,P4,4,Cable", "EA,M5,P5,1,Rack", ",M6,P6,1,Shelf"]));
  var b13 = load(csv([H13, "EA,M1,P1,2,Mic", "EA,M2,P2,3,Speaker", "EA,M3,P3-B,1,Amp", "EA,M4,P4,4,Cable bulk", "EX,M6,P6,1,Shelf", "EA,M7,P7,1,Switch"]));
  var r13 = ELC.compare(a13, b13);
  same("13 change types, in order", statuses(r13), ["EA M1 unchanged", "EA M2 quantity", "EA M3 changed", "EA M4 changed",
    "EA M5 removed", "EX M6 changed", "EA M7 added"]);
  same("13 counts", r13.counts, { added: 1, removed: 1, quantity: 1, changed: 3, unchanged: 1, changes: 6 });
  same("13 log text", ELC.logText(r13), [
    "Revision A to Revision B: 6 changes, 1 item unchanged",
    "(1 added, 1 removed, 1 quantity, 3 changed)",
    "",
    "- Quantity: EA M2 Speaker, 1 to 3 (+2)",
    "- Changed: EA M3 Amp, part number P3 to P3-B",
    "- Changed: EA M4, description \"Cable\" to \"Cable bulk\"",
    "- Removed: 1 x EA M5 Rack",
    "- Changed: EX M6 Shelf, manufacturer (blank) to EX",
    "- Added: 1 x EA M7 Switch"].join("\n"));
  same("13 table heading (flat list has no Location or System column)", ELC.tableRows(r13).head,
    ["Change", "Manufacturer", "Model", "Part number", "Description", "Qty A", "Qty B", "Difference", "Detail"]);
  same("13 table rows leave out unchanged items", ELC.tableRows(r13).rows.length, 6);
  same("13 table rows with unchanged items", ELC.tableRows(r13, null, null, { unchanged: true }).rows.length, 7);
  same("13 table row for M2", ELC.tableRows(r13).rows[0], ["Quantity", "EA", "M2", "P2", "Speaker", "1", "3", "+2", ""]);

  // Case 14: duplicate lines. C6 appears on two lines in A (2 + 2 = 4) and three
  // in B (2 + 2.0 + 2 = 6). Capitals and extra spaces do not matter.
  var a14 = load(csv(["Model,Qty", "C6,2", "c6 ,2", "M1,1"]));
  var b14 = load(csv(["Model,Qty", "C6,2", "C6,2.0", "M1,1", " C6,2"]));
  var r14 = ELC.compare(a14, b14);
  same("14 duplicates: statuses", statuses(r14), ["C6 quantity", "M1 unchanged"]);
  same("14 duplicates: quantities", [r14.groups[0].entries[0].qtyA, r14.groups[0].entries[0].qtyB, r14.groups[0].entries[0].diff], [4, 6, 2]);
  same("14 duplicates: lines combined", r14.combined, { a: { lines: 2, items: 1 }, b: { lines: 3, items: 1 } });
  same("14 duplicates: log line", ELC.entryLine(r14.groups[0].entries[0], "Revision A", "Revision B").text,
    "C6, 4 to 6 (+2) [2 lines added together in Revision A, 3 lines added together in Revision B]");

  // Case 15: the same model in two rooms is kept apart, and headings match even
  // when capitals and spacing differ. M9 moves from Room 1 to Room 2: removed in
  // one, added in the other. Room 3 exists only in B, Room 0 only in A.
  var a15 = load(csv(["Model,Qty", "Room 0", "M0,1", "Room 1", "M1,1", "M9,1", "Room 2", "M1,5"]));
  var b15 = load(csv(["Model,Qty", "ROOM  1", "M1,1", "room 2", "M1,5", "M9,1", "Room 3", "M3,1"]));
  var r15 = ELC.compare(a15, b15);
  same("15 groups in order", r15.groups.map(function (g) { return g.label + "=" + g.status; }),
    ["Room 0=removed", "ROOM 1=both", "room 2=both", "Room 3=added"]);
  same("15 statuses", statuses(r15), ["Room 0: M0 removed", "ROOM 1: M1 unchanged", "ROOM 1: M9 removed",
    "room 2: M1 unchanged", "room 2: M9 added", "Room 3: M3 added"]);
  same("15 group title for a whole new group", ELC.groupTitle(r15.groups[3], "Revision A", "Revision B"), "Room 3 (only in Revision B)");

  // Case 16: a swap is not guessed. DSP-8 out and DSP-12 in show as removed then
  // added, next to each other, in the place the old one sat.
  var a16 = load(csv(["Model,Qty", "X,1", "DSP-8,1", "Y,1"]));
  var b16 = load(csv(["Model,Qty", "X,1", "DSP-12,1", "Y,1"]));
  same("16 swap shows as removed then added", statuses(ELC.compare(a16, b16)), ["X unchanged", "DSP-8 removed", "DSP-12 added", "Y unchanged"]);

  // Case 17: the same model number from two makers stays two items.
  var a17 = load(csv(["Manufacturer,Model,Qty", "Maker X,100,1", "Maker Y,100,2"]));
  var b17 = load(csv(["Manufacturer,Model,Qty", "Maker X,100,1", "Maker Y,100,5"]));
  same("17 same model, two makers", statuses(ELC.compare(a17, b17)), ["Maker X 100 unchanged", "Maker Y 100 quantity"]);

  // Case 18: a column that only one revision has is not compared, so it cannot
  // make every line look changed.
  var a18 = load(csv(["Model,Qty", "M1,1", "M2,1"]));
  var b18 = load(csv(["Manufacturer,Model,Part Number,Qty,Description", "EA,M1,P1,1,Mic", "EA,M2,P2,2,Amp"]));
  var r18 = ELC.compare(a18, b18);
  same("18 extra columns in one revision", statuses(r18), ["EA M1 unchanged", "EA M2 quantity"]);
  same("18 fields compared", r18.fields, []);

  // Case 19: lines identified by part number or by description.
  var a19 = load(csv(["Part Number,Qty,Description", "P1,1,Bracket", ",2,Cable allowance", ",1,Labour"]));
  var b19 = load(csv(["Part Number,Qty,Description", "P1,1,Bracket black", ",3,cable  ALLOWANCE"]));
  var r19 = ELC.compare(a19, b19);
  same("19 part and description identity", statuses(r19), ["P1 changed", "cable ALLOWANCE quantity", "Labour removed"]);
  same("19 log", ELC.logText(r19, "Rev 1", "Rev 2"), [
    "Rev 1 to Rev 2: 3 changes, 0 items unchanged",
    "(0 added, 1 removed, 1 quantity, 1 changed)",
    "",
    "- Changed: P1, description \"Bracket\" to \"Bracket black\"",
    "- Quantity: cable ALLOWANCE, 2 to 3 (+1)",
    "- Removed: 1 x Labour"].join("\n"));

  // Case 20: two identical lists.
  var r20 = ELC.compare(a16, a16);
  same("20 identical lists", ELC.logText(r20), "Revision A to Revision B: 0 changes, 3 items unchanged\nNo differences found.");

  // Case 22: revision A has no Model column. Matching then uses the part number
  // for both lists, so P1 still lines up (quantity 1 -> 2) and P2 is unchanged.
  var a22 = load(csv(["Part Number,Qty", "P1,1", "P2,1"]));
  var b22 = load(csv(["Model,Part Number,Qty", "M1,P1,2", "M2,P2,1"]));
  same("22 only one list has a Model column", statuses(ELC.compare(a22, b22)), ["P1 quantity", "P2 unchanged"]);

  // Case 23: a renamed room. "Board Room 201" in A is "Boardroom 201" in B.
  // Left alone, the texts differ, so one whole group is removed and one added
  // (4 changes). Once the user says they are the same room, the two are compared
  // as one group: M1 1 -> 2, M2 removed, M3 added (3 changes), and the log says so.
  var a23 = load(csv(["Model,Qty", "Board Room 201", "M1,1", "M2,1"]));
  var b23 = load(csv(["Model,Qty", "Boardroom 201", "M1,2", "M3,1"]));
  same("23 headings only one list has", ELC.headingDiff(a23, b23), {
    location: { onlyA: ["Board Room 201"], onlyB: ["Boardroom 201"], allB: ["Boardroom 201"] },
    system: { onlyA: [], onlyB: [], allB: [] } });
  var r23plain = ELC.compare(a23, b23);
  same("23 no rename: two separate groups", r23plain.groups.map(function (g) { return g.label + "=" + g.status; }),
    ["Board Room 201=removed", "Boardroom 201=added"]);
  same("23 no rename: 4 changes", r23plain.counts.changes, 4);
  var r23 = ELC.compare(a23, b23, { renames: [{ level: "location", from: "board room 201", to: "Boardroom 201" },
    { level: "location", from: "No Such Room", to: "Boardroom 201" }] });
  same("23 rename: one group", statuses(r23), ["Boardroom 201: M1 quantity", "Boardroom 201: M2 removed", "Boardroom 201: M3 added"]);
  same("23 rename: only the rename that applied is reported", r23.renames,
    [{ level: "location", from: "board room 201", to: "Boardroom 201" }]);
  same("23 rename: log", ELC.logText(r23), [
    "Revision A to Revision B: 3 changes, 0 items unchanged",
    "(1 added, 1 removed, 1 quantity, 0 changed)",
    "Renamed: location \"board room 201\" in Revision A is \"Boardroom 201\" in Revision B",
    "",
    "Boardroom 201",
    "- Quantity: M1, 1 to 2 (+1)",
    "- Removed: 1 x M2",
    "- Added: 1 x M3"].join("\n"));

  // Case 24: a renamed system. "Sound" in A is "Audio" in B, in every room.
  var a24 = load(csv(["Model,Qty", "Room A", "Sound", "M1,1", "Room B", "Sound", "M2,1"]));
  var b24 = load(csv(["Model,Qty", "Room A", "Audio", "M1,1", "Room B", "Audio", "M2,3"]));
  same("24 system only in A", ELC.headingDiff(a24, b24).system, { onlyA: ["Sound"], onlyB: ["Audio"], allB: ["Audio"] });
  same("24 system rename", statuses(ELC.compare(a24, b24, { renames: [{ level: "system", from: "Sound", to: "Audio" }] })),
    ["Room A / Audio: M1 unchanged", "Room B / Audio: M2 quantity"]);

  // Case 25: reasons. A reason typed against M2 in case 13 shows at the end of
  // its log line and in a Reason column. A blank reason adds nothing. The id a
  // reason is stored under is built from the group and the item, so comparing
  // the same lists again gives the same id.
  var id25 = r13.groups[0].entries[1].id;
  same("25 entry id is built from group and item", id25, "\u0001\u0001model:m2\u0001ea");
  same("25 same lists again, same id", ELC.compare(a13, b13).groups[0].entries[1].id, id25);
  var reasons25 = {};
  reasons25[id25] = "  client asked for more ";
  reasons25[r13.groups[0].entries[2].id] = "   ";
  same("25 reason in the log line", ELC.logText(r13, null, null, { reasons: reasons25 }).split("\n")[3],
    "- Quantity: EA M2 Speaker, 1 to 3 (+2). Reason: client asked for more");
  same("25 blank reason leaves the line alone", ELC.logText(r13, null, null, { reasons: reasons25 }).split("\n")[4],
    "- Changed: EA M3 Amp, part number P3 to P3-B");
  var t25 = ELC.tableRows(r13, null, null, { reasons: reasons25 });
  same("25 table gains a Reason column", t25.head.slice(-2), ["Detail", "Reason"]);
  same("25 table row for M2", t25.rows[0], ["Quantity", "EA", "M2", "P2", "Speaker", "1", "3", "+2", "", "client asked for more"]);
  same("25 table row for M3 has an empty reason", t25.rows[1][9], "");
  same("25 only blank reasons: no Reason column", ELC.tableRows(r13, null, null, { reasons: { x: " " } }).head.length, 9);

  // Case 26: the header block for the log and printout. Every part is optional.
  same("26 header, all parts", ELC.headerLines({ project: "Example HQ", nameA: "Rev 2", dateA: "2026-11-01",
    nameB: "", dateB: "2026-11-20", preparedBy: "M. Example" }),
    ["Project: Example HQ", "Older list: Rev 2, 2026-11-01", "Newer list: Revision B, 2026-11-20", "Prepared by: M. Example"]);
  same("26 header, nothing typed", ELC.headerLines({ project: " ", nameA: "" }), []);
  same("26 header, project only", ELC.headerLines({ project: "Example HQ" }), ["Project: Example HQ"]);
  same("26 header sits above the log", ELC.logText(r20, "Rev 2", "Rev 3", { header: { project: "Example HQ", nameA: "Rev 2", nameB: "Rev 3" } }),
    "Project: Example HQ\nOlder list: Rev 2\nNewer list: Rev 3\n\nRev 2 to Rev 3: 0 changes, 3 items unchanged\nNo differences found.");

  // Case 21: the built-in sample. Counted by hand from sample.js:
  //   added: DSP-12, 75U, 55U, WM-M (4). removed: DSP-8, 65U, SW-8 (3).
  //   quantity: C6-T in Boardroom 201 4 -> 6, cable allowance 1 -> 2, PDU-8 2 -> 3 (3).
  //   changed: TP-7 description, PS-24 part number (2). unchanged: 7.
  var as = load(SAMPLE.a), bs = load(SAMPLE.b);
  var rs = ELC.compare(as, bs);
  same("21 sample: lines read", [as.items.length, bs.items.length], [16, 18]);
  same("21 sample: counts", rs.counts, { added: 4, removed: 3, quantity: 3, changed: 2, unchanged: 7, changes: 12 });
  same("21 sample: groups", rs.groups.map(function (g) { return g.label + "=" + g.status; }),
    ["Boardroom 201 / Audio=both", "Boardroom 201 / Video=both", "Training 105 / Audio=both", "Training 105 / Video=both",
      "Huddle 110 / Video=added", "Rack 1 / Control=both", "Rack 1 / Network=removed"]);
  same("21 sample: unidentified", rs.unidentified, { a: [], b: [{ row: 22, text: "3 | to be confirmed" }] });
  same("21 sample: log", ELC.logText(rs), [
    "Revision A to Revision B: 12 changes, 7 items unchanged",
    "(4 added, 3 removed, 3 quantity, 2 changed)",
    "",
    "Boardroom 201 / Audio",
    "- Quantity: Example Audio C6-T Ceiling speaker, 4 to 6 (+2) [2 lines added together in Revision A, 3 lines added together in Revision B]",
    "- Removed: 1 x Example Audio DSP-8 Audio processor, 8 channel",
    "- Added: 1 x Example Audio DSP-12 Audio processor, 12 channel",
    "",
    "Boardroom 201 / Video",
    "- Removed: 1 x Sample Display Co 65U 65\" display",
    "- Added: 1 x Sample Display Co 75U 75\" display",
    "- Changed: Demo Control TP-7, description \"Touch panel, 7 in\" to \"Touch panel, 7 in, white\"",
    "",
    "Training 105 / Video",
    "- Quantity: Cable and connectors allowance, 1 to 2 (+1)",
    "",
    "Huddle 110 / Video (only in Revision B)",
    "- Added: 1 x Sample Display Co 55U 55\" display",
    "- Added: 1 x Generic Mounts WM-M Wall mount, medium",
    "",
    "Rack 1 / Control",
    "- Changed: Placeholder Power PS-24 Power supply, part number PS24-A to PS24-B",
    "- Quantity: Placeholder Power PDU-8 Power strip, 8 outlet, 2 to 3 (+1)",
    "",
    "Rack 1 / Network (only in Revision A)",
    "- Removed: 1 x Demo Control SW-8 Network switch, 8 port",
    "",
    "Duplicate lines",
    "- Revision A: 2 lines were the same item in the same group and were added together into 1 item.",
    "- Revision B: 3 lines were the same item in the same group and were added together into 1 item.",
    "",
    "Not compared (no model number, part number or description)",
    "- Revision B, row 22: 3 | to be confirmed"].join("\n"));

  var failed = results.filter(function (r) { return !r.ok; });
  var summary = (results.length - failed.length) + " of " + results.length + " checks passed";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  if (typeof document !== "undefined" && document.getElementById("selftest")) {
    var html = "<p><strong>" + summary + "</strong></p><table><thead><tr><th>Check</th><th></th></tr></thead><tbody>";
    results.forEach(function (r) {
      html += "<tr><td>" + esc(r.name) + (r.ok ? "" : "<br><span class=\"small muted\">hand-worked: " + esc(r.want) +
        "<br>tool: " + esc(r.got) + "</span>") + "</td><td class=\"" + (r.ok ? "ok" : "bad") + "\">" +
        (r.ok ? "pass" : "FAIL") + "</td></tr>";
    });
    document.getElementById("selftest").innerHTML = html + "</tbody></table>";
  } else if (typeof console !== "undefined") {
    results.forEach(function (r) {
      console.log((r.ok ? "pass  " : "FAIL  ") + r.name + (r.ok ? "" : "\n      got  " + r.got + "\n      want " + r.want));
    });
    console.log(summary);
    if (failed.length && typeof process !== "undefined") { process.exitCode = 1; }
  }
})(typeof self !== "undefined" ? self : this);
