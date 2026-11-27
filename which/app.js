// Page code for "Which tool for this?": draws the rows from tools-data.js and
// redraws them when the search box or a tick box changes. The rules themselves
// (tags, dates, filtering) live in which.js.
(function () {
  "use strict";
  var data = window.WHICH_DATA, WT = window.WT;
  var list = document.getElementById("list");
  if (!data || !WT || !list) {
    if (list) { list.textContent = "The tool list did not load. Check that tools-data.js sits beside this page."; }
    return;
  }
  var search = document.getElementById("search");
  var hideMaker = document.getElementById("hideMaker");
  var hideAccount = document.getElementById("hideAccount");
  var count = document.getElementById("count");
  var empty = document.getElementById("empty");
  var forms = data.forms || {};
  var today = WT.todayText();
  var open = {}; // which "Also try" panels are open, kept across redraws

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined) { n.textContent = text; }
    return n;
  }
  function space(parent) { parent.appendChild(document.createTextNode(" ")); }

  function toolLink(item) {
    var a = el("a", "tool-link", item.name);
    a.href = item.url;
    if (/^https?:/i.test(item.url)) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }
  function addTags(parent, item) {
    WT.tagLabels(item.tags).forEach(function (word) { space(parent); parent.appendChild(el("span", "tag", word)); });
  }
  // The small "report broken" control. Absent until a form address is set in tools-data.js.
  function addReport(parent, item) {
    var href = WT.formLink(forms.reportBroken, item.url);
    if (!href || !item.url) { return; }
    var a = el("a", "report", "report broken");
    a.href = href; a.target = "_blank"; a.rel = "noopener";
    a.setAttribute("aria-label", "Report a broken link: " + item.name);
    space(parent); parent.appendChild(a);
  }

  function buildRow(entry, opts) {
    var row = el("div", "row");
    row.appendChild(el("div", "task", entry.task));
    var pick = el("div", "pick");
    if (entry.gap) {
      pick.appendChild(el("span", "none", "Nothing good found yet."));
      space(pick);
      pick.appendChild(document.createTextNode(entry.does));
    } else {
      pick.appendChild(toolLink(entry));
      space(pick);
      pick.appendChild(el("span", "pub", "(" + entry.publisher + ")"));
      pick.appendChild(document.createTextNode(": " + entry.does));
      addTags(pick, entry);
    }
    space(pick);
    pick.appendChild(el("span", "date", "checked " + entry.checked));
    if (WT.isStale(entry.checked, today)) { space(pick); pick.appendChild(el("span", "stale", "not rechecked recently")); }
    if (!entry.gap) { addReport(pick, entry); }
    row.appendChild(pick);

    var also = WT.visibleAlso(entry, opts);
    if (also.length || (entry.why && !entry.gap)) {
      var key = entry.group + "|" + entry.task;
      var det = el("details", "also");
      det.open = !!open[key];
      det.addEventListener("toggle", function () { open[key] = det.open; });
      det.appendChild(el("summary", "", also.length ? "Also try (" + also.length + ")" : "Why this pick"));
      var body = el("div", "also-body");
      if (entry.why && !entry.gap) {
        var why = el("p");
        why.appendChild(el("strong", "", "Why my pick: "));
        why.appendChild(document.createTextNode(entry.why));
        body.appendChild(why);
      }
      if (also.length) {
        var ul = el("ul");
        also.forEach(function (a) {
          var li = el("li");
          li.appendChild(toolLink(a));
          li.appendChild(document.createTextNode(": " + a.note));
          addTags(li, a);
          addReport(li, a);
          ul.appendChild(li);
        });
        body.appendChild(ul);
      }
      det.appendChild(body);
      row.appendChild(det);
    }
    return row;
  }

  function draw() {
    var opts = { hideMaker: hideMaker.checked, hideAccount: hideAccount.checked };
    var query = search.value;
    var shown = 0;
    var frag = document.createDocumentFragment();
    data.groups.forEach(function (group) {
      var rows = data.tools.filter(function (e) { return e.group === group && WT.rowVisible(e, query, opts); });
      if (!rows.length) { return; }
      shown += rows.length;
      frag.appendChild(el("h2", "", group));
      var box = el("div", "card rows");
      rows.forEach(function (e) { box.appendChild(buildRow(e, opts)); });
      frag.appendChild(box);
    });
    list.textContent = "";
    list.appendChild(frag);
    empty.hidden = shown > 0;
    count.textContent = shown === data.tools.length
      ? data.tools.length + " tasks in " + data.groups.length + " groups."
      : "Showing " + shown + " of " + data.tools.length + " tasks.";
  }

  var suggest = WT.formLink(forms.suggestTool, "");
  if (suggest) {
    var link = document.getElementById("suggestLink");
    link.href = suggest;
    link.hidden = false;
    document.getElementById("formNote").hidden = !WT.formLink(forms.reportBroken, "https://example.com/");
  }

  search.addEventListener("input", draw);
  hideMaker.addEventListener("change", draw);
  hideAccount.addEventListener("change", draw);
  draw();
})();
