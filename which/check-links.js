// Link check for "Which tool for this?". Run it by hand, about monthly:
//
//   node which/check-links.js            (from the repo root, needs Node.js 18 or newer)
//   node which/check-links.js --titles   (also prints the title of every page that opened)
//
// It reads tools-data.js, requests every link once and prints the ones that
//   - fail (no answer, or an error code),
//   - land on a different site from the one in the list,
//   - have a page title that no longer contains the entry's "expect" word.
// Entries marked manual: true are not requested (those sites refuse automated
// requests). They are printed at the end as a short list to click through.
// Nothing is installed and tools-data.js is never changed.
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var TIMEOUT_MS = 20000;
var AT_ONCE = 6;
var AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
var showTitles = process.argv.indexOf("--titles") !== -1;

function loadData() {
  var box = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "tools-data.js"), "utf8"), box);
  return box.WHICH_DATA;
}

// One line per different link, remembering every row that uses it.
function collect(data) {
  var byUrl = {}, order = [];
  function add(item, where) {
    if (!item || !item.url) { return; }
    if (!byUrl[item.url]) { byUrl[item.url] = { url: item.url, where: [], manual: false, expect: "" }; order.push(item.url); }
    var rec = byUrl[item.url];
    rec.where.push(where);
    if (item.manual) { rec.manual = true; }
    if (item.expect) { rec.expect = item.expect; }
  }
  data.tools.forEach(function (e) {
    if (!e.gap) { add(e, e.task + " (pick: " + e.name + ")"); }
    (e.alsoTry || []).forEach(function (a) { add(a, e.task + " (also try: " + a.name + ")"); });
  });
  return order.map(function (u) { return byUrl[u]; });
}

function site(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch (e) { return ""; }
}
// "docs.example.com" and "example.com" count as the same site.
function sameSite(a, b) {
  if (a === b) { return true; }
  return a.endsWith("." + b) || b.endsWith("." + a);
}
function titleOf(html) {
  var m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) { return ""; }
  return m[1].replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, "\"")
    .replace(/&ndash;|&mdash;|&#183;|&middot;/g, "-").replace(/\s+/g, " ").trim();
}

function checkOne(rec) {
  // A tool on this site: check the file is there.
  if (!/^https?:/i.test(rec.url)) {
    var file = path.join(__dirname, rec.url);
    return Promise.resolve(fs.existsSync(file) ? { ok: true, title: "(file on this site)" }
      : { ok: false, problem: "FILE MISSING on this site" });
  }
  var stop = new AbortController();
  var timer = setTimeout(function () { stop.abort(); }, TIMEOUT_MS);
  return fetch(rec.url, { redirect: "follow", signal: stop.signal,
    headers: { "User-Agent": AGENT, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" } })
    .then(function (res) {
      return res.text().then(function (body) {
        clearTimeout(timer);
        var title = titleOf(body);
        if (!res.ok) { return { ok: false, problem: "FAILED, error code " + res.status, title: title }; }
        if (!sameSite(site(rec.url), site(res.url))) {
          return { ok: false, problem: "LANDS ON A DIFFERENT SITE: " + res.url, title: title };
        }
        if (rec.expect && title.toLowerCase().indexOf(rec.expect.toLowerCase()) === -1) {
          return { ok: false, problem: "TITLE CHANGED: no \"" + rec.expect + "\" in \"" + title + "\"", title: title };
        }
        return { ok: true, title: title, moved: res.url !== rec.url ? res.url : "" };
      });
    })
    .catch(function (err) {
      clearTimeout(timer);
      var why = err && err.name === "AbortError" ? "no answer in " + (TIMEOUT_MS / 1000) + " seconds"
        : (err && err.cause && err.cause.code) || (err && err.message) || "unknown error";
      return { ok: false, problem: "FAILED, " + why };
    });
}

function runAll(recs) {
  var next = 0, results = new Array(recs.length);
  function worker() {
    if (next >= recs.length) { return Promise.resolve(); }
    var i = next++;
    return checkOne(recs[i]).then(function (r) { results[i] = r; return worker(); });
  }
  var workers = [];
  for (var n = 0; n < AT_ONCE; n++) { workers.push(worker()); }
  return Promise.all(workers).then(function () { return results; });
}

var data = loadData();
var all = collect(data);
var auto = all.filter(function (r) { return !r.manual; });
var manual = all.filter(function (r) { return r.manual; });

console.log("Checking " + auto.length + " links (" + manual.length + " more are checked by hand, listed at the end)...\n");
runAll(auto).then(function (results) {
  var bad = 0;
  results.forEach(function (r, i) {
    if (r.ok) { return; }
    bad++;
    console.log(r.problem);
    console.log("  " + auto[i].url);
    auto[i].where.forEach(function (w) { console.log("  used in: " + w); });
    console.log("");
  });
  if (showTitles) {
    console.log("PAGE TITLES (pick a word from each for \"expect\")");
    results.forEach(function (r, i) {
      if (r.ok) { console.log("  " + auto[i].url + "\n    " + (r.title || "(no title)") + (r.moved ? "\n    now at " + r.moved : "")); }
    });
    console.log("");
  }
  console.log((auto.length - bad) + " of " + auto.length + " links opened without a problem. " + bad + " flagged above.");
  console.log("A flagged link is not always dead: some sites refuse scripts. Open it in a browser before");
  console.log("changing anything. If a site refuses every time, add manual: true to its entry.\n");
  console.log("CHECK THESE BY HAND (" + manual.length + "). These sites refuse automated requests:");
  manual.forEach(function (r) {
    console.log("  " + r.url);
    console.log("    used in: " + r.where.join("; "));
  });
  console.log("\nWhen a link is still good, set its \"checked\" date in tools-data.js to today's date.");
  if (bad) { process.exitCode = 1; }
});
