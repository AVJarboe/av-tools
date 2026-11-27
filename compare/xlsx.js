// Reads an Excel workbook (.xlsx or .xlsm) into rows of cells, with no library.
// No page code in here, so the same file runs in a browser and in Node.js
// (for xlsx.test.js).
//
// An .xlsx file is a zip file holding plain-text (XML) files:
//   xl/workbook.xml              the sheet names, in tab order
//   xl/_rels/workbook.xml.rels   which file holds which sheet
//   xl/sharedStrings.xml         every piece of text, stored once and numbered
//   xl/worksheets/sheet1.xml     the cells; a text cell holds the number of its text
//
// The steps, in order:
//   zipEntries     the bytes of the zip -> the list of files inside it
//   unzip          one of those files -> its bytes (the browser's built-in unzip)
//   open           the bytes of a workbook -> its sheet names, and readSheet(i)
//   toText         rows of cells -> tab-separated text, the same as a paste from Excel
//
// A cell that holds a formula also holds the last answer Excel worked out, and that
// answer is what is read. Number formats are not applied: a date comes out as Excel's
// day number, and a number shown as "007" comes out as 7.
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.ELCX = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function fail(message) { var e = new Error(message); e.plain = true; return e; }

  // What kind of file this is, from its first bytes (the file name can be wrong).
  function sniff(bytes) {
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) { return "zip"; }                                              // PK
    if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) { return "ole"; }   // old .xls, or password-protected
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) { return "pdf"; }   // %PDF
    return "text";
  }

  // ----- zip -----

  function u16(b, i) { return b[i] | (b[i + 1] << 8); }
  function u32(b, i) { return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0; }

  // The list of files is at the end of a zip. Returns { name: { method, size, start } }.
  function zipEntries(bytes) {
    var end = -1, i, out = {};
    for (i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 65535; i--) {
      if (u32(bytes, i) === 0x06054B50) { end = i; break; }
    }
    if (end < 0) { throw fail("This is not a complete zip file, so it cannot be an Excel workbook."); }
    var count = u16(bytes, end + 10), p = u32(bytes, end + 16);
    if (count === 0xFFFF || p === 0xFFFFFFFF) { throw fail("This workbook is too large to read here."); }
    for (i = 0; i < count; i++) {
      if (u32(bytes, p) !== 0x02014B50) { throw fail("The zip file inside this workbook is damaged."); }
      var nameLen = u16(bytes, p + 28), local = u32(bytes, p + 42);
      var name = new TextDecoder("utf-8").decode(bytes.subarray(p + 46, p + 46 + nameLen));
      out[name.replace(/\\/g, "/")] = {
        method: u16(bytes, p + 10), size: u32(bytes, p + 20),
        start: local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28)
      };
      p += 46 + nameLen + u16(bytes, p + 30) + u16(bytes, p + 32);
    }
    return out;
  }

  function canUnzip() { return typeof DecompressionStream === "function" && typeof Response === "function"; }

  // One file out of the zip, as a promise of its bytes. Method 0 is stored as it is,
  // method 8 ("deflate") is what Excel uses.
  function unzip(bytes, entry) {
    var data = bytes.subarray(entry.start, entry.start + entry.size);
    if (entry.method === 0) { return Promise.resolve(data); }
    if (entry.method !== 8) { return Promise.reject(fail("This workbook is packed in a way that cannot be read here.")); }
    if (!canUnzip()) { return Promise.reject(fail("This browser cannot open .xlsx files.")); }
    var stream = new Response(data).body.pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(stream).arrayBuffer().then(function (buf) { return new Uint8Array(buf); },
      function () { throw fail("The zip file inside this workbook is damaged."); });
  }
  function unzipText(bytes, entry) {
    return unzip(bytes, entry).then(function (b) { return new TextDecoder("utf-8").decode(b); });
  }

  // ----- the XML inside -----

  var ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };
  function unescapeXml(s) {
    return s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, function (all, code) {
      if (code[0] !== "#") { return ENTITIES.hasOwnProperty(code) ? ENTITIES[code] : all; }
      var n = code[1] === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return n > 0 && n <= 0x10FFFF ? String.fromCodePoint(n) : "";
    });
  }
  // Excel writes characters that XML does not allow as _x000D_ and the like.
  function unescapeExcel(s) {
    return s.replace(/_x([0-9a-fA-F]{4})_/g, function (all, hex) { return String.fromCharCode(parseInt(hex, 16)); });
  }
  function attr(attrs, name) {
    var m = new RegExp("(?:^|\\s)" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')").exec(attrs);
    return m ? unescapeXml(m[1] !== undefined ? m[1] : m[2]) : null;
  }
  // Walk the tags of an XML text. Calls open(name, attrs), close(name) and text(string).
  // Names lose any prefix, so <x:row> and <row> are the same.
  function walk(xml, on) {
    var re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([^\s>\/]+)([^>]*?)(\/?)>|([^<]+)/g, m, name;
    while ((m = re.exec(xml))) {
      if (m[1] !== undefined) { on.text(m[1]); }
      else if (m[3]) {
        name = m[3].replace(/^.*:/, "");
        if (m[2]) { on.close(name); }
        else { on.open(name, m[4]); if (m[5]) { on.close(name); } }
      }
      else if (m[6]) { on.text(unescapeXml(m[6])); }
    }
  }

  // xl/sharedStrings.xml -> the texts, in order. A text can be in several pieces
  // (when part of it is bold, say); the pieces are joined. Phonetic guides are left out.
  function sharedStrings(xml) {
    var out = [], cur = null, inT = false, skip = 0;
    walk(xml, {
      open: function (n) {
        if (n === "si") { cur = ""; }
        else if (n === "rPh") { skip++; }
        else if (n === "t") { inT = true; }
      },
      close: function (n) {
        if (n === "si") { out.push(unescapeExcel(cur || "")); cur = null; }
        else if (n === "rPh") { skip--; }
        else if (n === "t") { inT = false; }
      },
      text: function (t) { if (inT && !skip && cur !== null) { cur += t; } }
    });
    return out;
  }

  // "C7" -> 2 (column C). Letters only; the row number is not needed.
  function colIndex(ref) {
    var n = 0, i, c;
    for (i = 0; i < ref.length; i++) {
      c = ref.charCodeAt(i) & 0xDF;
      if (c < 65 || c > 90) { break; }
      n = n * 26 + (c - 64);
    }
    return n - 1;
  }
  // Excel stores 0.1 + 0.2 as 0.30000000000000004. Show what Excel shows: 15 digits.
  function tidyNumber(v) {
    var n = Number(v);
    if (v === "" || !isFinite(n)) { return v; }
    return String(parseFloat(n.toPrecision(15)));
  }

  // One sheet's XML -> rows of cells (text). Blank rows and columns are kept so that
  // row numbers and column letters match the spreadsheet. Blank rows at the end are dropped.
  function sheetRows(xml, strings) {
    var rows = [], row = null, rowNo = 0, col = 0, type = "", val = null, inV = false, inT = false, inSheet = false;
    walk(xml, {
      open: function (n, a) {
        if (n === "sheetData") { inSheet = true; }
        if (!inSheet) { return; }
        if (n === "row") {
          var r = parseInt(attr(a, "r"), 10);
          rowNo = r > 0 ? r : rowNo + 1;
          while (rows.length < rowNo) { rows.push([]); }
          row = rows[rowNo - 1];
          col = 0;
        } else if (n === "c" && row) {
          var ref = attr(a, "r");
          if (ref && colIndex(ref) >= 0) { col = colIndex(ref); }
          type = attr(a, "t") || "n";
          val = "";
        } else if (n === "v") { inV = true; }
        else if (n === "t") { inT = true; }
      },
      close: function (n) {
        if (n === "sheetData") { inSheet = false; }
        else if (n === "v") { inV = false; }
        else if (n === "t") { inT = false; }
        else if (n === "row") { row = null; }
        else if (n === "c" && row && val !== null) {
          var text;
          if (type === "s") { text = strings[parseInt(val, 10)] || ""; }
          else if (type === "b") { text = val === "1" ? "TRUE" : val === "0" ? "FALSE" : val; }
          else if (type === "n") { text = tidyNumber(val.trim()); }
          else { text = unescapeExcel(val); }                       // str, inlineStr, e (an error such as #N/A), d
          if (text !== "") {
            while (row.length < col) { row.push(""); }
            row[col] = text;
          }
          col++;
          val = null;
        }
      },
      text: function (t) {
        if (val === null) { return; }
        if (inV || (inT && type === "inlineStr")) { val += t; }
      }
    });
    while (rows.length && !rows[rows.length - 1].some(function (c) { return c !== ""; })) { rows.pop(); }
    return rows;
  }

  // xl/workbook.xml and its .rels file -> [{ name, hidden, path }] in tab order.
  function sheetList(workbookXml, relsXml) {
    var targets = {}, sheets = [];
    walk(relsXml, {
      open: function (n, a) {
        if (n !== "Relationship") { return; }
        var t = attr(a, "Target") || "";
        targets[attr(a, "Id")] = t[0] === "/" ? t.slice(1) : "xl/" + t.replace(/^\.\//, "");
      },
      close: function () {}, text: function () {}
    });
    walk(workbookXml, {
      open: function (n, a) {
        if (n !== "sheet") { return; }
        var id = attr(a, "r:id") || attr(a, "[\\w.-]+:id"), state = attr(a, "state");
        var path = targets[id];
        // Chart sheets and macro sheets have no cells to read.
        if (path && /worksheets\//.test(path)) {
          sheets.push({ name: attr(a, "name") || "Sheet " + (sheets.length + 1), hidden: !!state && state !== "visible", path: path });
        }
      },
      close: function () {}, text: function () {}
    });
    return sheets;
  }

  // The bytes of a workbook -> a promise of { sheets: [{ name, hidden }], readSheet(i) -> promise of rows }.
  function open(bytes) {
    var entries;
    try { entries = zipEntries(bytes); } catch (e) { return Promise.reject(e); }
    var wb = entries["xl/workbook.xml"], rels = entries["xl/_rels/workbook.xml.rels"];
    if (!wb || !rels) {
      if (entries["content.xml"]) { return Promise.reject(fail("This looks like a LibreOffice or OpenOffice file (.ods), which is not read. Save it as .xlsx or .csv.")); }
      if (entries["word/document.xml"]) { return Promise.reject(fail("This is a Word document, which is not read. Copy the table out of it and paste it into the box.")); }
      if (entries["xl/workbook.bin"]) { return Promise.reject(fail("This is an Excel binary workbook (.xlsb), which is not read. Save it as .xlsx.")); }
      return Promise.reject(fail("This zip file is not an Excel workbook."));
    }
    var strings = null;
    function getStrings() {
      if (strings) { return Promise.resolve(strings); }
      var e = entries["xl/sharedStrings.xml"];
      if (!e) { strings = []; return Promise.resolve(strings); }
      return unzipText(bytes, e).then(function (xml) { strings = sharedStrings(xml); return strings; });
    }
    return Promise.all([unzipText(bytes, wb), unzipText(bytes, rels)]).then(function (x) {
      var sheets = sheetList(x[0], x[1]).filter(function (s) { return entries[s.path]; });
      if (!sheets.length) { throw fail("No sheets with cells were found in this workbook."); }
      return {
        sheets: sheets.map(function (s) { return { name: s.name, hidden: s.hidden }; }),
        readSheet: function (i) {
          return Promise.all([unzipText(bytes, entries[sheets[i].path]), getStrings()]).then(function (y) {
            return sheetRows(y[0], y[1]);
          });
        }
      };
    });
  }

  // Rows of cells -> tab-separated text, written the way Excel writes a copied range:
  // a cell holding a tab, a line break, or starting with a quote mark is wrapped in quotes.
  function toText(rows) {
    return rows.map(function (r) {
      return r.map(function (c) {
        c = String(c).replace(/\r\n?/g, "\n");
        return /[\t\n]/.test(c) || c[0] === "\"" ? "\"" + c.replace(/"/g, "\"\"") + "\"" : c;
      }).join("\t");
    }).join("\n");
  }

  return {
    sniff: sniff, canUnzip: canUnzip, zipEntries: zipEntries, unzip: unzip,
    unescapeXml: unescapeXml, sharedStrings: sharedStrings, colIndex: colIndex, tidyNumber: tidyNumber,
    sheetRows: sheetRows, sheetList: sheetList, open: open, toText: toText
  };
});
