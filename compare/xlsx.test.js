// Self-check for xlsx.js (reading Excel workbooks). The workbooks are built here,
// piece by piece, from the XML written out in each case, and the expected answers
// were worked out by hand from that XML, not produced by the code under test.
//
// Run either way:
//   node compare/xlsx.test.js        (from the repo root, needs Node.js 18 or later)
//   open compare/selftest.html       (in any browser, no install needed)
(function (root) {
  "use strict";
  var inNode = typeof module === "object" && module.exports;
  var X = inNode ? require("./xlsx.js") : root.ELCX;
  var ELC = inNode ? require("./compare.js") : root.ELC;
  var results = [];

  function same(name, got, want) {
    var g = JSON.stringify(got), w = JSON.stringify(want);
    results.push({ name: name, ok: g === w, got: g, want: w });
  }
  function bytesOf(text) { return new TextEncoder().encode(text); }
  function textOf(bytes) { return new TextDecoder("utf-8").decode(bytes); }

  // Squeeze bytes the way a zip does ("deflate"), using the browser's or Node's own packer.
  function deflate(bytes) {
    var stream = new Response(bytes).body.pipeThrough(new CompressionStream("deflate-raw"));
    return new Response(stream).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  // A minimal zip writer for the test: files is [{ name, text, pack }].
  function makeZip(files) {
    return Promise.all(files.map(function (f) {
      var raw = bytesOf(f.text);
      return f.pack ? deflate(raw).then(function (d) { return { name: bytesOf(f.name), data: d, method: 8, rawSize: raw.length }; })
        : { name: bytesOf(f.name), data: raw, method: 0, rawSize: raw.length };
    })).then(function (parts) {
      var chunks = [], central = [], offset = 0;
      function push(list, arr) { list.push(Uint8Array.from(arr)); }
      function le(n, size) { var a = [], i; for (i = 0; i < size; i++) { a.push((n >>> (8 * i)) & 255); } return a; }
      parts.forEach(function (p) {
        var common = [].concat(le(20, 2), le(0, 2), le(p.method, 2), le(0, 4), le(0, 4),
          le(p.data.length, 4), le(p.rawSize, 4), le(p.name.length, 2), le(0, 2));
        push(chunks, [].concat(le(0x04034B50, 4), common));
        chunks.push(p.name, p.data);
        push(central, [].concat(le(0x02014B50, 4), le(20, 2), common, le(0, 2), le(0, 2), le(0, 2), le(0, 4), le(offset, 4)));
        central.push(p.name);
        offset += 30 + p.name.length + p.data.length;
      });
      var cdSize = central.reduce(function (n, c) { return n + c.length; }, 0);
      push(central, [].concat(le(0x06054B50, 4), le(0, 4), le(parts.length, 2), le(parts.length, 2), le(cdSize, 4), le(offset, 4), le(0, 2)));
      var all = chunks.concat(central), total = all.reduce(function (n, c) { return n + c.length; }, 0);
      var out = new Uint8Array(total), at = 0;
      all.forEach(function (c) { out.set(c, at); at += c.length; });
      return out;
    });
  }
  function message(promise) {
    return promise.then(function () { return "no error"; }, function (e) { return e.message; });
  }

  var HEAD = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n";
  var NS = " xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"";

  // ----- the parts that need no unzipping -----

  // Case X1: what kind of file, from its first bytes.
  same("X1 a zip starts with PK", X.sniff(Uint8Array.from([0x50, 0x4B, 3, 4])), "zip");
  same("X1 an old .xls starts with D0 CF 11 E0", X.sniff(Uint8Array.from([0xD0, 0xCF, 0x11, 0xE0])), "ole");
  same("X1 a PDF starts with %PDF", X.sniff(bytesOf("%PDF-1.7")), "pdf");
  same("X1 anything else is text", X.sniff(bytesOf("Model,Qty")), "text");

  // Case X2: the numbered texts. Six entries: plain; with &amp; and a numbered character
  // (&#174; is the registered mark); two pieces joined; a phonetic guide left out;
  // Excel's _x000A_ for a line break; and an empty one.
  var sst = HEAD + "<sst" + NS + " count=\"6\" uniqueCount=\"6\">" +
    "<si><t>Model</t></si>" +
    "<si><t>Cable &amp; plate, Dante&#174;</t></si>" +
    "<si><r><rPr><b/></rPr><t>DSP</t></r><r><t xml:space=\"preserve\"> 12</t></r></si>" +
    "<si><t>Display</t><rPh sb=\"0\" eb=\"1\"><t>skip me</t></rPh><phoneticPr fontId=\"1\"/></si>" +
    "<si><t>line one_x000A_line two</t></si>" +
    "<si><t/></si></sst>";
  same("X2 shared texts", X.sharedStrings(sst),
    ["Model", "Cable & plate, Dante®", "DSP 12", "Display", "line one\nline two", ""]);

  // Case X3: column letters and numbers.
  same("X3 column A is 0, C is 2, Z is 25, AA is 26, AB is 27",
    ["A1", "C7", "Z10", "AA3", "AB12"].map(X.colIndex), [0, 2, 25, 26, 27]);
  same("X3 a stored 0.30000000000000004 reads as 0.3", X.tidyNumber("0.30000000000000004"), "0.3");
  same("X3 2 stays 2, 2.50 becomes 2.5, 1E3 becomes 1000", ["2", "2.50", "1E3"].map(X.tidyNumber), ["2", "2.5", "1000"]);

  // Case X4: one sheet. Texts by number are "Model"(0) "Qty"(1) "Room 1"(2) "DSP 12"(3).
  //   row 1: A1 text 0, B1 text 1                      -> Model, Qty
  //   row 2: A2 text 2, B2 an empty styled cell        -> Room 1 (a heading row: one filled cell)
  //   row 3: A3 text 3, B3 number 2                    -> DSP 12, 2
  //   row 4 is not in the file                         -> blank row kept, so row 5 stays row 5
  //   row 5: A5 typed-in text, C5 formula answer 0.1+0.2, D5 TRUE, E5 an error, F5 formula text
  //          (B5 is not in the file, so it is blank)
  //   row 6: only an empty styled cell                 -> blank and last, so dropped
  var sheet = HEAD + "<worksheet" + NS + "><dimension ref=\"A1:F6\"/><sheetData>" +
    "<row r=\"1\"><c r=\"A1\" t=\"s\"><v>0</v></c><c r=\"B1\" t=\"s\"><v>1</v></c></row>" +
    "<row r=\"2\"><c r=\"A2\" s=\"3\" t=\"s\"><v>2</v></c><c r=\"B2\" s=\"3\"/></row>" +
    "<row r=\"3\"><c r=\"A3\" t=\"s\"><v>3</v></c><c r=\"B3\"><v>2</v></c></row>" +
    "<row r=\"5\"><c r=\"A5\" t=\"inlineStr\"><is><t>55&quot; display</t></is></c>" +
    "<c r=\"C5\"><f>0.1+0.2</f><v>0.30000000000000004</v></c>" +
    "<c r=\"D5\" t=\"b\"><v>1</v></c><c r=\"E5\" t=\"e\"><v>#N/A</v></c>" +
    "<c r=\"F5\" t=\"str\"><f>A3&amp;\"-B\"</f><v>DSP 12-B</v></c></row>" +
    "<row r=\"6\"><c r=\"A6\" s=\"3\"/></row>" +
    "</sheetData><mergeCells count=\"1\"><mergeCell ref=\"A2:B2\"/></mergeCells></worksheet>";
  var strings4 = ["Model", "Qty", "Room 1", "DSP 12"];
  same("X4 sheet rows", X.sheetRows(sheet, strings4), [
    ["Model", "Qty"],
    ["Room 1"],
    ["DSP 12", "2"],
    [],
    ["55\" display", "", "0.3", "TRUE", "#N/A", "DSP 12-B"]]);

  // Case X5: the same cells written by a program that leaves out the cell addresses and
  // puts a prefix on every tag. Cells are then taken left to right, rows top to bottom.
  same("X5 no addresses, prefixed tags", X.sheetRows(
    "<x:worksheet><x:sheetData><x:row><x:c t=\"s\"><x:v>0</x:v></x:c><x:c t=\"s\"><x:v>1</x:v></x:c></x:row>" +
    "<x:row><x:c t=\"s\"><x:v>3</x:v></x:c><x:c><x:v>4</x:v></x:c></x:row></x:sheetData></x:worksheet>", strings4),
    [["Model", "Qty"], ["DSP 12", "4"]]);

  // Case X6: the sheet names. Three tabs: "Rev A" (sheet1.xml), a hidden "Prices" (sheet2.xml)
  // and a chart tab, which has no cells and is left out. Order is the tab order.
  var workbook = HEAD + "<workbook" + NS + " xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets>" +
    "<sheet name=\"Rev A\" sheetId=\"1\" r:id=\"rId1\"/>" +
    "<sheet name=\"Prices\" sheetId=\"2\" state=\"hidden\" r:id=\"rId2\"/>" +
    "<sheet name=\"Chart\" sheetId=\"3\" r:id=\"rId3\"/></sheets></workbook>";
  var rels = HEAD + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
    "<Relationship Id=\"rId1\" Type=\"x/worksheet\" Target=\"worksheets/sheet1.xml\"/>" +
    "<Relationship Id=\"rId2\" Type=\"x/worksheet\" Target=\"/xl/worksheets/sheet2.xml\"/>" +
    "<Relationship Id=\"rId3\" Type=\"x/chartsheet\" Target=\"chartsheets/sheet1.xml\"/>" +
    "<Relationship Id=\"rId4\" Type=\"x/sharedStrings\" Target=\"sharedStrings.xml\"/></Relationships>";
  same("X6 sheet names, hidden flag and file for each", X.sheetList(workbook, rels), [
    { name: "Rev A", hidden: false, path: "xl/worksheets/sheet1.xml" },
    { name: "Prices", hidden: true, path: "xl/worksheets/sheet2.xml" }]);

  // Case X7: rows -> the text that goes in the box. A cell with a line break or one that
  // starts with a quote mark is wrapped in quotes; an inch mark in the middle is left alone.
  // Read back by the compare tool, the cells are the same (a line break becomes a space).
  var rows7 = [["Model", "Description"], ["CM-40", "55\" display"], ["WP-1", "line one\nline two"], ["X-1", "\"Quoted\" name"]];
  same("X7 rows as tab-separated text", X.toText(rows7),
    "Model\tDescription\nCM-40\t55\" display\nWP-1\t\"line one\nline two\"\nX-1\t\"\"\"Quoted\"\" name\"");
  same("X7 read back by the compare tool", ELC.parseTable(X.toText(rows7)).rows,
    [["Model", "Description"], ["CM-40", "55\" display"], ["WP-1", "line one line two"], ["X-1", "\"Quoted\" name"]]);

  // ----- whole workbooks (these need the unzip step, so they finish a moment later) -----

  // Case X8: a workbook with two sheets, packed the way Excel packs it.
  //   texts: 0 Model, 1 Qty, 2 Room 1, 3 DSP-12, 4 CM-40, 5 WP-1
  //   Rev A:  Model Qty / Room 1 / DSP-12 1 / CM-40 4
  //   Rev B:  Model Qty / Room 1 / DSP-12 1 / CM-40 6 / WP-1 2
  // By hand: in Room 1, CM-40 goes from 4 to 6 and WP-1 (qty 2) is added. DSP-12 is unchanged.
  function row(n, cells) {
    return "<row r=\"" + n + "\">" + cells.map(function (c, i) {
      var ref = String.fromCharCode(65 + i) + n;
      return typeof c === "number" ? "<c r=\"" + ref + "\"><v>" + c + "</v></c>" : "<c r=\"" + ref + "\" t=\"s\"><v>" + c.s + "</v></c>";
    }).join("") + "</row>";
  }
  function sheetXml(rows) {
    return HEAD + "<worksheet" + NS + "><sheetData>" + rows.map(function (r, i) { return row(i + 1, r); }).join("") + "</sheetData></worksheet>";
  }
  var book = [
    { name: "[Content_Types].xml", text: HEAD + "<Types/>", pack: true },
    { name: "xl/workbook.xml", pack: true, text: HEAD + "<workbook" + NS + " xmlns:r=\"r\"><sheets>" +
      "<sheet name=\"Rev A\" sheetId=\"1\" r:id=\"rId1\"/><sheet name=\"Rev B\" sheetId=\"2\" r:id=\"rId2\"/></sheets></workbook>" },
    { name: "xl/_rels/workbook.xml.rels", pack: true, text: HEAD + "<Relationships>" +
      "<Relationship Id=\"rId1\" Target=\"worksheets/sheet1.xml\"/><Relationship Id=\"rId2\" Target=\"worksheets/sheet2.xml\"/></Relationships>" },
    { name: "xl/sharedStrings.xml", pack: true, text: HEAD + "<sst" + NS + "><si><t>Model</t></si><si><t>Qty</t></si>" +
      "<si><t>Room 1</t></si><si><t>DSP-12</t></si><si><t>CM-40</t></si><si><t>WP-1</t></si></sst>" },
    { name: "xl/worksheets/sheet1.xml", pack: true, text: sheetXml([[{ s: 0 }, { s: 1 }], [{ s: 2 }], [{ s: 3 }, 1], [{ s: 4 }, 4]]) },
    { name: "xl/worksheets/sheet2.xml", pack: false, text: sheetXml([[{ s: 0 }, { s: 1 }], [{ s: 2 }], [{ s: 3 }, 1], [{ s: 4 }, 6], [{ s: 5 }, 2]]) }
  ];
  function listFrom(rows) {
    var t = ELC.parseTable(X.toText(rows)), h = ELC.findHeaderRow(t.rows);
    return ELC.readList(t.rows, h, ELC.guessColumns(t.rows[h]));
  }

  var pending = makeZip(book).then(function (zip) {
    var names = Object.keys(X.zipEntries(zip));
    same("X8 files found inside the zip", names, ["[Content_Types].xml", "xl/workbook.xml", "xl/_rels/workbook.xml.rels",
      "xl/sharedStrings.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"]);
    same("X8 packed file is method 8, unpacked file is method 0",
      [X.zipEntries(zip)["xl/workbook.xml"].method, X.zipEntries(zip)["xl/worksheets/sheet2.xml"].method], [8, 0]);
    return X.unzip(zip, X.zipEntries(zip)["[Content_Types].xml"]).then(function (b) {
      same("X8 a packed file unpacks to its text", textOf(b), HEAD + "<Types/>");
      return X.open(zip);
    }).then(function (wb) {
      same("X8 sheet names", wb.sheets, [{ name: "Rev A", hidden: false }, { name: "Rev B", hidden: false }]);
      return Promise.all([wb.readSheet(0), wb.readSheet(1)]);
    }).then(function (sheets) {
      same("X8 Rev A rows", sheets[0], [["Model", "Qty"], ["Room 1"], ["DSP-12", "1"], ["CM-40", "4"]]);
      same("X8 Rev B rows", sheets[1], [["Model", "Qty"], ["Room 1"], ["DSP-12", "1"], ["CM-40", "6"], ["WP-1", "2"]]);
      var r = ELC.compare(listFrom(sheets[0]), listFrom(sheets[1]));
      same("X8 compared: 1 quantity change, 1 added, 1 unchanged",
        [r.counts.quantity, r.counts.added, r.counts.removed, r.counts.changed, r.counts.unchanged], [1, 1, 0, 0, 1]);
      same("X8 the log", ELC.logText(r, "Rev A", "Rev B").split("\n").slice(-3),
        ["Room 1", "- Quantity: CM-40, 4 to 6 (+2)", "- Added: 2 x WP-1"]);
    });
  }).then(function () {
    // Case X9: files that are not workbooks get a plain message, not a crash.
    return makeZip([{ name: "word/document.xml", text: "<w:document/>", pack: false }]);
  }).then(function (docx) {
    return message(X.open(docx));
  }).then(function (m) {
    same("X9 a Word file", m, "This is a Word document, which is not read. Copy the table out of it and paste it into the box.");
    return makeZip([{ name: "content.xml", text: "<x/>", pack: false }]);
  }).then(function (ods) {
    return message(X.open(ods));
  }).then(function (m) {
    same("X9 a LibreOffice file", m, "This looks like a LibreOffice or OpenOffice file (.ods), which is not read. Save it as .xlsx or .csv.");
    return message(X.open(bytesOf("PK but nothing else, far too short to be a real zip")));
  }).then(function (m) {
    same("X9 a cut-off file", m, "This is not a complete zip file, so it cannot be an Excel workbook.");
  }).catch(function (e) {
    results.push({ name: "the workbook cases stopped early", ok: false, got: String(e && e.stack || e), want: "no error" });
  });

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  pending.then(function () {
    var failed = results.filter(function (r) { return !r.ok; });
    var summary = (results.length - failed.length) + " of " + results.length + " checks passed";
    if (typeof document !== "undefined" && document.getElementById("selftest-xlsx")) {
      var html = "<p><strong>" + summary + "</strong></p><table><thead><tr><th>Check</th><th></th></tr></thead><tbody>";
      results.forEach(function (r) {
        html += "<tr><td>" + esc(r.name) + (r.ok ? "" : "<br><span class=\"small muted\">hand-worked: " + esc(r.want) +
          "<br>tool: " + esc(r.got) + "</span>") + "</td><td class=\"" + (r.ok ? "ok" : "bad") + "\">" +
          (r.ok ? "pass" : "FAIL") + "</td></tr>";
      });
      document.getElementById("selftest-xlsx").innerHTML = html + "</tbody></table>";
    } else if (typeof console !== "undefined") {
      results.forEach(function (r) {
        console.log((r.ok ? "pass  " : "FAIL  ") + r.name + (r.ok ? "" : "\n      got  " + r.got + "\n      want " + r.want));
      });
      console.log(summary);
      if (failed.length && typeof process !== "undefined") { process.exitCode = 1; }
    }
  });
})(typeof self !== "undefined" ? self : this);
