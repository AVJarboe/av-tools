// Self-check for which.js and tools-data.js. The expected answers below were
// worked out by hand from the rules on the page, not produced by the code under test.
//
// Run either way:
//   node which/which.test.js      (from the repo root, needs Node.js)
//   open which/selftest.html      (in any browser, no install needed)
(function (root) {
  "use strict";
  var inNode = typeof module === "object" && module.exports;
  var WT = inNode ? require("./which.js") : root.WT;
  var DATA = root.WHICH_DATA;
  if (inNode) {
    // tools-data.js holds nothing but the list, so it is read the way a browser reads it.
    var box = {};
    require("vm").runInNewContext(
      require("fs").readFileSync(require("path").join(__dirname, "tools-data.js"), "utf8"), box);
    DATA = box.WHICH_DATA;
  }
  var results = [];
  function same(name, got, want) {
    var g = JSON.stringify(got), w = JSON.stringify(want);
    results.push({ name: name, ok: g === w, got: g, want: w });
  }

  // A made-up list used by the filter checks. None of these tools exist.
  var throwCalc = { group: "Display", task: "Projector throw", name: "Throw Finder", publisher: "Lumen Works",
    url: "https://example.com/throw", does: "Throw distance.", tags: [], checked: "2026-11-26",
    alsoTry: [
      { name: "Beam Planner", url: "https://example.com/beam", note: "One brand.", tags: ["maker"] },
      { name: "Lens Desk", url: "https://example.com/lens", note: "Needs a login.", tags: ["account"] },
      { name: "Zoom Chart", url: "https://example.com/zoom", note: "A chart." }
    ] };
  var upsPick = { group: "Power", task: "UPS sizing", name: "Runtime Picker", publisher: "Voltacorp",
    url: "https://example.com/ups", does: "Runtime.", tags: ["maker"], checked: "2026-11-26" };
  var rackPick = { group: "Power", task: "Rack drawing", name: "Rack Sketch", publisher: "Unit Nine",
    url: "https://example.com/rack", does: "Racks.", tags: ["account", "download"], checked: "2026-11-26" };
  var mailPick = { group: "Power", task: "Heat load", name: "Heat Sheet", publisher: "Unit Nine",
    url: "https://example.com/heat", does: "Heat.", tags: ["email"], checked: "2026-11-26" };
  var gapRow = { group: "Power", task: "Power sequencing plan", gap: true, does: "Use a spreadsheet.",
    checked: "2026-11-26" };
  var none = { hideMaker: false, hideAccount: false };

  // 1 Search: every typed word must be found in the task, tool, publisher, group or an "Also try" name.
  same("1 empty search shows the row", WT.matchesSearch(throwCalc, ""), true);
  same("1 spaces only shows the row", WT.matchesSearch(throwCalc, "   "), true);
  same("1 word from the task", WT.matchesSearch(throwCalc, "projector"), true);
  same("1 word from the tool name, capitals ignored", WT.matchesSearch(throwCalc, "FINDER"), true);
  same("1 word from the publisher", WT.matchesSearch(throwCalc, "lumen"), true);
  same("1 part of a word", WT.matchesSearch(throwCalc, "proj"), true);
  same("1 two words, both present", WT.matchesSearch(throwCalc, "throw lumen"), true);
  same("1 two words, one missing", WT.matchesSearch(throwCalc, "throw conduit"), false);
  same("1 name of an Also try tool", WT.matchesSearch(throwCalc, "beam planner"), true);
  same("1 group name", WT.matchesSearch(upsPick, "power"), true);
  same("1 word found nowhere", WT.matchesSearch(throwCalc, "conduit"), false);
  same("1 words in \"does\" are not searched", WT.matchesSearch(upsPick, "runtime."), false);
  same("1 a gap row is searched by its task", WT.matchesSearch(gapRow, "sequencing"), true);

  // 2 Tick boxes.
  same("2 nothing ticked: maker pick shows", WT.rowVisible(upsPick, "", none), true);
  same("2 hide maker: maker pick hidden", WT.rowVisible(upsPick, "", { hideMaker: true }), false);
  same("2 hide maker: untagged pick stays", WT.rowVisible(throwCalc, "", { hideMaker: true }), true);
  same("2 hide account: account pick hidden", WT.rowVisible(rackPick, "", { hideAccount: true }), false);
  same("2 hide account: needs-email pick hidden too", WT.rowVisible(mailPick, "", { hideAccount: true }), false);
  same("2 hide account: maker pick stays", WT.rowVisible(upsPick, "", { hideAccount: true }), true);
  same("2 hide maker: account pick stays", WT.rowVisible(rackPick, "", { hideMaker: true }), true);
  same("2 both ticked: a gap row still shows", WT.rowVisible(gapRow, "", { hideMaker: true, hideAccount: true }), true);
  same("2 search and tick box together", WT.rowVisible(upsPick, "ups", { hideMaker: true }), false);
  same("2 search miss with nothing ticked", WT.rowVisible(upsPick, "conduit", none), false);
  function names(list) { return list.map(function (a) { return a.name; }); }
  same("2 Also try, nothing ticked: all 3", names(WT.visibleAlso(throwCalc, none)), ["Beam Planner", "Lens Desk", "Zoom Chart"]);
  same("2 Also try, hide maker: 2 left", names(WT.visibleAlso(throwCalc, { hideMaker: true })), ["Lens Desk", "Zoom Chart"]);
  same("2 Also try, hide account: 2 left", names(WT.visibleAlso(throwCalc, { hideAccount: true })), ["Beam Planner", "Zoom Chart"]);
  same("2 Also try, both ticked: 1 left", names(WT.visibleAlso(throwCalc, { hideMaker: true, hideAccount: true })), ["Zoom Chart"]);
  same("2 Also try, entry with none", WT.visibleAlso(upsPick, none), []);

  // 3 Tags become words, in a fixed order, whatever order they were typed in.
  same("3 no tags, no words", WT.tagLabels([]), []);
  same("3 maker", WT.tagLabels(["maker"]), ["one maker's products"]);
  same("3 account", WT.tagLabels(["account"]), ["needs account"]);
  same("3 email", WT.tagLabels(["email"]), ["needs email"]);
  same("3 download", WT.tagLabels(["download"]), ["download"]);
  same("3 reference", WT.tagLabels(["reference"]), ["reference, not a calculator"]);
  same("3 own", WT.tagLabels(["own"]), ["my own tool"]);
  same("3 two tags, fixed order", WT.tagLabels(["download", "maker"]), ["one maker's products", "download"]);
  same("3 unknown tag left out", WT.tagLabels(["maker", "shiny"]), ["one maker's products"]);
  same("3 missing tags list", WT.tagLabels(undefined), []);

  // 4 "Not rechecked recently": more than 6 months after the checked date.
  // Checked 2026-11-26 -> six months to the day is 2027-05-26 (still fine); 2027-05-27 is stale.
  same("4 same day", WT.isStale("2026-11-26", "2026-11-26"), false);
  same("4 five months on", WT.isStale("2026-11-26", "2027-04-30"), false);
  same("4 six months to the day", WT.isStale("2026-11-26", "2027-05-26"), false);
  same("4 six months and one day", WT.isStale("2026-11-26", "2027-05-27"), true);
  same("4 a year on", WT.isStale("2026-11-26", "2027-11-26"), true);
  // Checked 2026-03-15 -> limit 2026-09-15, inside one year.
  same("4 same year, day before the limit", WT.isStale("2026-03-15", "2026-09-14"), false);
  same("4 same year, day after the limit", WT.isStale("2026-03-15", "2026-09-16"), true);
  // Checked 2026-08-31 -> February has no 31st, so the row is fine to the end of February.
  same("4 end of month, last day of February", WT.isStale("2026-08-31", "2027-02-28"), false);
  same("4 end of month, 1 March", WT.isStale("2026-08-31", "2027-03-01"), true);
  same("4 today before the checked date", WT.isStale("2026-11-26", "2026-01-01"), false);
  same("4 no date counts as stale", WT.isStale("", "2026-11-26"), true);
  same("4 an impossible date counts as stale", WT.isStale("2026-02-30", "2026-03-01"), true);
  same("4 wrong date layout counts as stale", WT.isStale("26/11/2026", "2026-11-27"), true);
  same("4 today's date as text", WT.todayText(new Date(2027, 0, 5)), "2027-01-05");

  // 5 The "report broken" and "suggest a tool" addresses.
  var form = "https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.1=TOOL_LINK";
  same("5 no form address: control hidden", WT.formLink("", "https://example.com/a"), "");
  same("5 tool link is filled in, made safe for a web address", WT.formLink(form, "https://example.com/a b?x=1&y=2"),
    "https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.1=https%3A%2F%2Fexample.com%2Fa%20b%3Fx%3D1%26y%3D2");
  same("5 form address without TOOL_LINK is used as it is", WT.formLink("https://forms.gle/xyz", "https://example.com/a"), "https://forms.gle/xyz");
  same("5 suggest link needs no tool", WT.formLink("https://forms.gle/xyz", ""), "https://forms.gle/xyz");
  same("5 a tool on this site gets no report control", WT.formLink(form, "../70v/index.html"), "");
  same("5 an address that is not https is ignored", WT.formLink("javascript:alert(1)", "https://example.com/a"), "");

  // 6 The data check itself catches what it should.
  function listOf(entry) {
    return { forms: { reportBroken: "", suggestTool: "" }, groups: ["Power"], tools: [entry] };
  }
  function copy(entry, changes) {
    var out = {}, k;
    for (k in entry) { out[k] = entry[k]; }
    for (k in changes) { out[k] = changes[k]; }
    return out;
  }
  same("6 a good pick has no problems", WT.validate(listOf(upsPick)), []);
  same("6 a good gap row has no problems", WT.validate(listOf(gapRow)), []);
  same("6 missing link is caught", WT.validate(listOf(copy(upsPick, { url: "" }))).length, 1);
  same("6 http link is caught", WT.validate(listOf(copy(upsPick, { url: "http://example.com" }))).length, 1);
  same("6 missing publisher is caught", WT.validate(listOf(copy(upsPick, { publisher: "" }))).length, 1);
  same("6 missing tool name is caught", WT.validate(listOf(copy(upsPick, { name: "" }))).length, 1);
  same("6 missing tags list is caught", WT.validate(listOf(copy(upsPick, { tags: undefined }))).length, 1);
  same("6 unknown tag is caught", WT.validate(listOf(copy(upsPick, { tags: ["shiny"] }))).length, 1);
  same("6 bad date is caught", WT.validate(listOf(copy(upsPick, { checked: "26 Nov" }))).length, 1);
  same("6 unknown group is caught", WT.validate(listOf(copy(upsPick, { group: "Lighting" }))).length, 2); // also: group "Power" left empty
  same("6 15-word description is caught", WT.validate(listOf(copy(upsPick,
    { does: "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen" }))).length, 1);
  same("6 14-word description passes", WT.validate(listOf(copy(upsPick,
    { does: "one two three four five six seven eight nine ten eleven twelve thirteen fourteen" }))).length, 0);
  same("6 a do-not-link address is caught", WT.validate(listOf(copy(upsPick, { url: "https://www.putty.org/" }))).length, 1);
  same("6 Also try without a note is caught", WT.validate(listOf(copy(upsPick,
    { alsoTry: [{ name: "X", url: "https://example.com/x" }] }))).length, 1);
  same("6 a gap row with a link is caught", WT.validate(listOf(copy(gapRow, { url: "https://example.com" }))).length, 1);

  // 7 The real list in tools-data.js.
  var problems = WT.validate(DATA);
  same("7 tools-data.js: every entry has its required fields", problems, []);
  same("7 tools-data.js: eight groups", DATA.groups.length, 8);
  var picks = DATA.tools.filter(function (e) { return !e.gap; });
  var own = picks.filter(function (e) { return WT.hasTag(e, "own"); }).map(function (e) { return e.task; });
  same("7 tools-data.js: my own tools are tagged", own, ["70V/100V line and amplifier load", "Compare two equipment lists"]);
  same("7 tools-data.js: no email address anywhere", /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(JSON.stringify(DATA)), false);
  var plainHttp = [];
  DATA.tools.forEach(function (e) {
    [e].concat(e.alsoTry || []).forEach(function (x) { if (x.url && /^http:/.test(x.url)) { plainHttp.push(x.url); } });
  });
  same("7 tools-data.js: no plain http links", plainHttp, []);

  var failed = results.filter(function (r) { return !r.ok; });
  var summary = (results.length - failed.length) + " of " + results.length + " checks passed";

  if (typeof document !== "undefined" && document.getElementById("selftest")) {
    var box2 = document.getElementById("selftest");
    box2.textContent = "";
    var p = document.createElement("p"), strong = document.createElement("strong");
    strong.textContent = summary; p.appendChild(strong); box2.appendChild(p);
    var table = document.createElement("table");
    table.innerHTML = "<thead><tr><th>Check</th><th>Expected</th><th>Got</th><th></th></tr></thead>";
    var body = document.createElement("tbody");
    results.forEach(function (r) {
      var tr = document.createElement("tr");
      [r.name, r.want, r.got, r.ok ? "pass" : "FAIL"].forEach(function (text, i) {
        var td = document.createElement("td");
        td.textContent = text;
        if (i === 3) { td.className = r.ok ? "ok" : "bad"; }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body); box2.appendChild(table);
  } else if (typeof console !== "undefined") {
    results.forEach(function (r) {
      console.log((r.ok ? "pass  " : "FAIL  ") + r.name + (r.ok ? "" : "  got " + r.got + ", want " + r.want));
    });
    console.log(summary);
    if (failed.length && typeof process !== "undefined") { process.exitCode = 1; }
  }
})(typeof self !== "undefined" ? self : this);
