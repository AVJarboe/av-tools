// Logic for the "Which tool for this?" page: tag words, the date rule, the
// search and tick-box filter, the report links and a check of the data file.
// No page code in here, so the same file runs in the browser and in Node.js.
(function (root) {
  "use strict";

  // Short tag in tools-data.js -> the words shown on the page.
  var TAGS = {
    maker: "one maker's products",
    account: "needs account",
    email: "needs email",
    download: "download",
    reference: "reference, not a calculator",
    own: "my own tool"
  };
  var TAG_ORDER = ["own", "maker", "account", "email", "download", "reference"];

  // Addresses that must never be linked (each now shows something unrelated).
  var DO_NOT_LINK = [/av-tools\.co\.uk/i, /loopworks\.com/i, /putty\.org/i, /southwire\.com\/.*pull/i];

  var STALE_MONTHS = 6;
  var MAX_DOES_WORDS = 14; // "under 15 words"

  function hasTag(item, tag) {
    return !!item && Array.isArray(item.tags) && item.tags.indexOf(tag) !== -1;
  }

  // The words to show for an entry's tags, in a fixed order. Unknown tags are left out.
  function tagLabels(tags) {
    var list = Array.isArray(tags) ? tags : [];
    return TAG_ORDER.filter(function (t) { return list.indexOf(t) !== -1; })
      .map(function (t) { return TAGS[t]; });
  }

  // "2026-11-26" -> { y, m, d }, or null when it is not a real date.
  function parseDate(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || ""));
    if (!m) { return null; }
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    var probe = new Date(Date.UTC(y, mo - 1, d));
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) { return null; }
    return { y: y, m: mo, d: d };
  }

  // True when "checked" is more than 6 months before "today" (both YYYY-MM-DD).
  // Exactly 6 months to the day is still fine. A missing or broken date counts as stale.
  function isStale(checked, today) {
    var c = parseDate(checked), t = parseDate(today);
    if (!c || !t) { return true; }
    var months = c.y * 12 + (c.m - 1) + STALE_MONTHS;
    var limitY = Math.floor(months / 12), limitM = (months % 12) + 1;
    if (t.y !== limitY) { return t.y > limitY; }
    if (t.m !== limitM) { return t.m > limitM; }
    return t.d > c.d;
  }

  function todayText(date) {
    var d = date || new Date();
    function two(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
  }

  function lower(text) { return String(text || "").toLowerCase(); }

  // Every word typed must appear somewhere in the task, tool, publisher, group
  // or the names of the "Also try" tools. Upper and lower case are the same.
  function matchesSearch(entry, query) {
    var words = lower(query).split(/\s+/).filter(Boolean);
    if (!words.length) { return true; }
    var hay = lower([entry.task, entry.name, entry.publisher, entry.group].join(" "));
    (entry.alsoTry || []).forEach(function (a) { hay += " " + lower(a.name); });
    return words.every(function (w) { return hay.indexOf(w) !== -1; });
  }

  // Does a tick box hide this tool? opts = { hideMaker, hideAccount }.
  // "Needs email" counts as needing an account.
  function hiddenByBoxes(item, opts) {
    var o = opts || {};
    if (o.hideMaker && hasTag(item, "maker")) { return true; }
    if (o.hideAccount && (hasTag(item, "account") || hasTag(item, "email"))) { return true; }
    return false;
  }

  // Should this row show? Gap rows are not tools, so the tick boxes never hide them.
  function rowVisible(entry, query, opts) {
    if (!matchesSearch(entry, query)) { return false; }
    if (!entry.gap && hiddenByBoxes(entry, opts)) { return false; }
    return true;
  }

  // The "Also try" tools left after the tick boxes are applied.
  function visibleAlso(entry, opts) {
    return (entry.alsoTry || []).filter(function (a) { return !hiddenByBoxes(a, opts); });
  }

  // Builds the address a "report broken" or "suggest a tool" control opens.
  // The form address may contain the word TOOL_LINK; it is swapped for the
  // tool's own link. Returns "" (control stays hidden) when no form address is
  // set, or when the tool link is not a web address (the tools on this site).
  function formLink(address, toolUrl) {
    var a = String(address || "").trim();
    if (!/^https:\/\//i.test(a)) { return ""; }
    if (toolUrl && !/^https?:\/\//i.test(toolUrl)) { return ""; }
    return a.split("TOOL_LINK").join(encodeURIComponent(toolUrl || ""));
  }

  function wordCount(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function isText(v) { return typeof v === "string" && v.trim() !== ""; }
  function linkOk(url) { return /^https:\/\//.test(url) || /^\.\.\/[\w\-\/]+\.html$/.test(url); }

  function checkLinkAndTags(item, label, problems) {
    if (!isText(item.url)) { problems.push(label + ": no link"); }
    else {
      if (!linkOk(item.url)) { problems.push(label + ": link must start with https:// (or ../ for a tool on this site)"); }
      DO_NOT_LINK.forEach(function (re) {
        if (re.test(item.url)) { problems.push(label + ": link is on the do-not-link list"); }
      });
    }
    if (item.tags !== undefined && !Array.isArray(item.tags)) { problems.push(label + ": tags must be a list"); }
    (Array.isArray(item.tags) ? item.tags : []).forEach(function (t) {
      if (!TAGS[t]) { problems.push(label + ": unknown tag \"" + t + "\""); }
    });
  }

  // Checks the whole data file. Returns a list of plain-word problems; empty means fine.
  function validate(data) {
    var problems = [];
    if (!data || !Array.isArray(data.tools) || !Array.isArray(data.groups)) {
      return ["The data file must set WHICH_DATA with a groups list and a tools list"];
    }
    if (!data.forms || typeof data.forms.reportBroken !== "string" || typeof data.forms.suggestTool !== "string") {
      problems.push("forms: needs reportBroken and suggestTool (use \"\" for none)");
    }
    var seen = {};
    data.tools.forEach(function (e, i) {
      var label = "Entry " + (i + 1) + " (" + (e && e.task ? e.task : "no task") + ")";
      if (!e || typeof e !== "object") { problems.push(label + ": not an entry"); return; }
      if (!isText(e.task)) { problems.push(label + ": no task"); }
      if (data.groups.indexOf(e.group) === -1) { problems.push(label + ": group is not in the groups list"); }
      if (!isText(e.does)) { problems.push(label + ": no \"does\" text"); }
      if (!parseDate(e.checked)) { problems.push(label + ": checked must be a real date like 2026-11-26"); }
      if (seen[e.group + "|" + e.task]) { problems.push(label + ": the same task appears twice in this group"); }
      seen[e.group + "|" + e.task] = true;
      if (e.gap) {
        if (e.name || e.url) { problems.push(label + ": a gap row must not have a tool name or link"); }
      } else {
        if (!isText(e.name)) { problems.push(label + ": no tool name"); }
        if (!isText(e.publisher)) { problems.push(label + ": no publisher"); }
        if (!Array.isArray(e.tags)) { problems.push(label + ": no tags list (use [] for none)"); }
        checkLinkAndTags(e, label, problems);
        if (wordCount(e.does) > MAX_DOES_WORDS) {
          problems.push(label + ": \"does\" is " + wordCount(e.does) + " words, the limit is " + MAX_DOES_WORDS);
        }
      }
      if (e.alsoTry !== undefined && !Array.isArray(e.alsoTry)) { problems.push(label + ": alsoTry must be a list"); }
      (Array.isArray(e.alsoTry) ? e.alsoTry : []).forEach(function (a, j) {
        var sub = label + ", also try " + (j + 1);
        if (!a || !isText(a.name)) { problems.push(sub + ": no name"); }
        if (!a || !isText(a.note)) { problems.push(sub + ": no note"); }
        if (a) { checkLinkAndTags(a, sub, problems); }
      });
    });
    data.groups.forEach(function (g) {
      if (!data.tools.some(function (e) { return e && e.group === g; })) {
        problems.push("Group \"" + g + "\" has no entries");
      }
    });
    return problems;
  }

  var api = {
    TAGS: TAGS, STALE_MONTHS: STALE_MONTHS, MAX_DOES_WORDS: MAX_DOES_WORDS,
    hasTag: hasTag, tagLabels: tagLabels, parseDate: parseDate, isStale: isStale, todayText: todayText,
    matchesSearch: matchesSearch, hiddenByBoxes: hiddenByBoxes, rowVisible: rowVisible,
    visibleAlso: visibleAlso, formLink: formLink, wordCount: wordCount, validate: validate
  };
  if (typeof module === "object" && module.exports) { module.exports = api; }
  root.WT = api;
})(typeof self !== "undefined" ? self : this);
