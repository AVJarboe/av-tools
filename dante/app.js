// Page code for the Dante flow planner. The maths lives in calc.js and every
// vendor figure, with its source, lives in data.js.
(function () {
  "use strict";
  var DF = window.DF, DATA = window.DFDATA;
  var $ = function (id) { return document.getElementById(id); };
  var STORE_KEY = "avtools.dante.v1";
  var ready = false, seq = 0;

  function el(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in props || {}) {
      if (k === "text") { e.textContent = props[k]; }
      else if (k === "class") { e.className = props[k]; }
      else { e.setAttribute(k, props[k]); }
    }
    (kids || []).forEach(function (c) { if (c) { e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); } });
    return e;
  }
  function f(x, dp) {
    if (!isFinite(x)) { return "—"; }
    return x.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp === undefined ? 1 : dp });
  }
  function mbps(x) { return x >= 1000 ? f(x / 1000, 2) + " Gbps" : f(x, 1) + " Mbps"; }
  function speed(x) { return x >= 1000 ? f(x / 1000, 0) + " Gbps" : f(x, 0) + " Mbps"; }
  function pct(x) { return Math.max(0, Math.min(100, x)) + "%"; }
  function mark(s) { return s === "bad" ? "✗ " : s === "warn" ? "⚠ " : "✓ "; }
  function typeById(id) {
    for (var i = 0; i < DATA.DEVICE_TYPES.length; i++) { if (DATA.DEVICE_TYPES[i].id === id) { return DATA.DEVICE_TYPES[i]; } }
    return DATA.DEVICE_TYPES[0];
  }
  // A link to a source document, by its key in DATA.SOURCES.
  function src(key, text) {
    var s = DATA.SOURCES[key];
    if (!s) { return document.createTextNode(text || ""); }
    return el("a", { href: s.url, rel: "noopener", target: "_blank", text: text || s.short || s.title });
  }
  function est() { return el("span", { class: "est", title: "A vendor's published figure, not a guarantee", text: "estimate" }); }

  // ----- device rows -----
  function addDevice(d, focus) {
    var n = ++seq, id = d.id || "d" + n + "_" + Date.now().toString(36);
    var name = el("input", { type: "text", id: "dn" + n, maxlength: "40", placeholder: "e.g. DSP" });
    var type = el("select", { id: "dt" + n });
    var groups = {};
    DATA.DEVICE_TYPES.forEach(function (t) {
      var g = t.group || "Other";
      if (!groups[g]) { groups[g] = el("optgroup", { label: g }); type.appendChild(groups[g]); }
      groups[g].appendChild(el("option", { value: t.id, text: t.label }));
    });
    var qty = el("input", { type: "number", id: "dq" + n, min: "1", step: "1", inputmode: "numeric" });
    var sw = el("input", { type: "text", id: "ds" + n, maxlength: "30", list: "switchNames", placeholder: "Switch 1" });
    var mc = el("input", { type: "number", id: "dm" + n, min: "0", step: "1", inputmode: "numeric" });
    name.value = d.name || ""; type.value = d.type || DATA.DEVICE_TYPES[0].id; qty.value = d.qty === undefined ? 1 : d.qty;
    sw.value = d.switchName || ""; mc.value = d.multicastChannels || 0;
    if (!type.value) { type.value = "custom"; }
    function cin(key, label, val, unit) {
      var i = el("input", { type: "number", id: "dc" + key + n, min: "0", step: "1", inputmode: "numeric", "data-k": key });
      i.value = val === undefined || val === null ? "" : val;
      return el("div", {}, [el("label", { for: "dc" + key + n, text: label }), unit ? el("div", { class: "ig" }, [i, el("span", { text: unit })]) : i]);
    }
    var c = d.custom || {};
    var link = el("select", { id: "dcl" + n, "data-k": "linkMbps" }, [
      el("option", { value: "100", text: "100 Mbps" }), el("option", { value: "1000", text: "1 Gbps" }), el("option", { value: "10000", text: "10 Gbps" })]);
    link.value = String(c.linkMbps || 1000);
    var custom = el("div", { class: "custom" }, [
      cin("txFlows", "Transmit flow limit", c.txFlows), cin("rxFlows", "Receive flow limit", c.rxFlows),
      cin("tx", "Transmit channels", c.tx), cin("rx", "Receive channels", c.rx),
      el("div", {}, [el("label", { for: "dcl" + n, text: "Network port" }), link])
    ]);
    var remove = el("button", { type: "button", class: "ghost", title: "Remove this device", "aria-label": "Remove this device", text: "×" });
    var row = el("div", { class: "dev-row dev-cols", "data-id": id }, [
      el("div", { class: "d-name" }, [el("label", { for: "dn" + n, text: "Name" }), name]),
      el("div", { class: "d-type" }, [el("label", { for: "dt" + n, text: "Type" }), type]),
      el("div", {}, [el("label", { for: "dq" + n, text: "Quantity" }), qty]),
      el("div", { class: "d-switch" }, [el("label", { for: "ds" + n, text: "Switch" }), sw]),
      el("div", {}, [el("label", { for: "dm" + n, text: "Multicast ch" }), mc]),
      remove, custom, el("div", { class: "limits" })
    ]);
    remove.addEventListener("click", function () { row.remove(); refreshRouteLists(); update(); });
    name.addEventListener("input", refreshRouteLists);
    $("devices").appendChild(row);
    if (focus) { name.focus(); }
    return id;
  }
  function readDevices() {
    return Array.prototype.map.call($("devices").children, function (row, i) {
      var q = function (s) { return row.querySelector(s); };
      var t = typeById(q("select").value), isCustom = t.id === "custom";
      var custom = {};
      Array.prototype.forEach.call(row.querySelectorAll(".custom [data-k]"), function (inp) {
        var v = parseFloat(inp.value); custom[inp.getAttribute("data-k")] = isFinite(v) && v > 0 ? v : null;
      });
      q(".custom").hidden = !isCustom;
      var lim = isCustom ? custom : t;
      if (!isCustom && t.chByRate) {
        var hz = parseFloat($("sampleRate").value), band = hz <= 48000 ? 0 : hz <= 96000 ? 1 : 2;
        lim = { txFlows: t.txFlows, rxFlows: t.rxFlows, linkMbps: t.linkMbps, tx: t.chByRate[band], rx: t.chByRate[band] };
      }
      var name = q(".d-name input").value.trim();
      return {
        id: row.getAttribute("data-id"), name: name || "Device " + (i + 1), rawName: name, type: t.id, typeLabel: t.label,
        qty: Math.max(0, Math.floor(parseFloat(row.querySelectorAll("input[type=number]")[0].value) || 0)),
        switchName: q(".d-switch input").value.trim(),
        multicastChannels: Math.max(0, Math.floor(parseFloat(q("[id^=dm]").value) || 0)),
        linkMbps: lim.linkMbps || 1000, txFlowLimit: lim.txFlows, rxFlowLimit: lim.rxFlows,
        txChannels: lim.tx, rxChannels: lim.rx, custom: custom, typeInfo: t, row: row
      };
    });
  }

  // ----- route rows -----
  function deviceOptions(sel, devices, keep) {
    sel.textContent = "";
    sel.appendChild(el("option", { value: "", text: "Choose…" }));
    devices.forEach(function (d) {
      sel.appendChild(el("option", { value: d.id, text: d.name + (d.qty > 1 ? " (×" + d.qty + ")" : "") }));
    });
    sel.value = keep || "";
    if (sel.value !== (keep || "")) { sel.value = ""; }
  }
  function addRoute(r, focus) {
    var n = ++seq;
    var from = el("select", { id: "rf" + n }), to = el("select", { id: "rt" + n });
    var ch = el("input", { type: "number", id: "rc" + n, min: "1", step: "1", inputmode: "numeric" });
    var mode = el("select", { id: "rm" + n }, [el("option", { value: "unicast", text: "Unicast" }), el("option", { value: "multicast", text: "Multicast" })]);
    ch.value = r.channels === undefined ? 2 : r.channels; mode.value = r.mode || "unicast";
    var remove = el("button", { type: "button", class: "ghost", title: "Remove this route", "aria-label": "Remove this route", text: "×" });
    var row = el("div", { class: "route-row route-cols" }, [
      el("div", { class: "r-from" }, [el("label", { for: "rf" + n, text: "From" }), from]),
      el("div", { class: "r-to" }, [el("label", { for: "rt" + n, text: "To" }), to]),
      el("div", {}, [el("label", { for: "rc" + n, text: "Channels" }), ch]),
      el("div", {}, [el("label", { for: "rm" + n, text: "Sent as" }), mode]),
      el("div", { class: "sub" }), remove
    ]);
    row._want = { from: r.from || "", to: r.to || "" };
    remove.addEventListener("click", function () { row.remove(); update(); });
    $("routes").appendChild(row);
    if (focus) { from.focus(); }
  }
  function refreshRouteLists() {
    var devices = readDevices();
    Array.prototype.forEach.call($("routes").children, function (row) {
      var sels = row.querySelectorAll("select");
      var keepF = row._want ? row._want.from : sels[0].value, keepT = row._want ? row._want.to : sels[1].value;
      row._want = null;
      deviceOptions(sels[0], devices, keepF); deviceOptions(sels[1], devices, keepT);
    });
    var names = {}, dl = $("switchNames"); dl.textContent = "";
    devices.forEach(function (d) { if (d.switchName && !names[d.switchName]) { names[d.switchName] = 1; dl.appendChild(el("option", { value: d.switchName })); } });
  }
  function readRoutes() {
    return Array.prototype.map.call($("routes").children, function (row) {
      var sels = row.querySelectorAll("select");
      return { from: sels[0].value, to: sels[1].value, channels: Math.max(0, Math.floor(parseFloat(row.querySelector("input").value) || 0)),
        mode: sels[2].value, row: row };
    });
  }

  // ----- remember what was typed (this browser only) -----
  function snapshot(devices, routes) {
    return {
      fields: { project: $("project").value, sampleRate: $("sampleRate").value, uplink: $("uplink").value,
        perFlow: $("perFlow").value, igmp: $("igmp").checked, aes67: $("aes67").checked },
      devices: devices.map(function (d) {
        return { id: d.id, name: d.rawName, type: d.type, qty: d.qty, switchName: d.switchName,
          multicastChannels: d.multicastChannels, custom: d.custom };
      }),
      routes: routes.map(function (r) { return { from: r.from, to: r.to, channels: r.channels, mode: r.mode }; })
    };
  }
  function apply(s) {
    $("devices").textContent = ""; $("routes").textContent = "";
    var fl = s.fields || {};
    $("project").value = typeof fl.project === "string" ? fl.project : "";
    $("sampleRate").value = String(fl.sampleRate || 48000); if (!$("sampleRate").value) { $("sampleRate").value = "48000"; }
    $("uplink").value = String(fl.uplink || 1000); if (!$("uplink").value) { $("uplink").value = "1000"; }
    $("perFlow").value = String(fl.perFlow || 8); if (!$("perFlow").value) { $("perFlow").value = "8"; }
    $("igmp").checked = fl.igmp !== false; $("aes67").checked = !!fl.aes67;
    (s.devices || []).forEach(function (d) { addDevice(d); });
    (s.routes || []).forEach(function (r) { addRoute(r); });
    refreshRouteLists();
  }
  function save(devices, routes) {
    if (!ready) { return; }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(snapshot(devices, routes))); }
    catch (e) { /* private window or storage blocked: carry on without it */ }
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!s || !Array.isArray(s.devices) || !Array.isArray(s.routes)) { return false; }
      apply(s); return true;
    } catch (e) { return false; }
  }

  // ----- drawing helpers -----
  function badge(id, cls, text) { var b = $(id); b.className = "badge " + cls; b.textContent = text; b.hidden = !text; }
  function big(id, value, unit) { var b = $(id); b.textContent = value + " "; b.appendChild(el("small", { text: unit })); }
  function cell(head, text, cls) { return el("td", { "data-h": head, class: cls || "num", text: text }); }
  function useCell(head, used, limit) {
    var td = el("td", { "data-h": head, class: "num" + (limit && used > limit ? " over" : "") });
    td.appendChild(el("span", {}, [document.createTextNode(f(used, 0)), el("span", { class: "of", text: limit ? " of " + f(limit, 0) : "" })]));
    return td;
  }
  function fillCell(head, p, warnPct, failPct) {
    var cls = p > failPct ? "bad" : p > warnPct ? "warn" : "";
    var bar = el("span", { class: "mini", "aria-hidden": "true" }, [el("i", { class: cls, style: "width:" + pct(p) })]);
    return el("td", { "data-h": head, class: "num" }, [el("span", {}, [document.createTextNode(f(p, p < 10 ? 1 : 0) + " %"), bar])]);
  }
  function statusCell(st, issues) {
    var td = el("td", { "data-h": "Status" });
    td.appendChild(el("span", { class: "badge " + st, text: st === "ok" ? "✓ OK" : st === "warn" ? "⚠ Check" : "✗ Over" }));
    if (issues.length) { td.setAttribute("title", issues.map(function (x) { return x.text; }).join(" ")); }
    return td;
  }
  function worked(label, value, formula, srcKey) {
    var kids = [
      el("div", { class: "top" }, [el("span", { text: label }), el("span", { class: "val", text: value })]),
      el("div", { class: "formula", text: formula })
    ];
    if (srcKey) {
      kids.push(el("div", { class: "src" }, [document.createTextNode("Source: "), src(srcKey), est()]));
    }
    $("worked").appendChild(el("div", { class: "result" }, kids));
  }

  // ----- main update -----
  function update() {
    var devices = readDevices(), routes = readRoutes();
    var plan = {
      sampleRate: parseFloat($("sampleRate").value), igmpSnooping: $("igmp").checked,
      multicastPerFlow: parseFloat($("perFlow").value), warnPct: DATA.LINK.warnPct, failPct: DATA.LINK.failPct,
      uplinkMbps: parseFloat($("uplink").value), devices: devices, routes: routes
    };
    var r = DF.calculate(plan);
    var R = DF.RULES, t = r.totals;
    var srLabel = $("sampleRate").selectedOptions[0].textContent;

    // limits line under each device row, and the flow count on each route row
    devices.forEach(function (d, i) {
      var out = r.devices[i], line = d.row.querySelector(".limits"); line.textContent = "";
      var ti = d.typeInfo;
      var bits = [];
      if (d.txFlowLimit || d.rxFlowLimit) { bits.push("Flow limits: " + (d.txFlowLimit || "?") + " transmit, " + (d.rxFlowLimit || "?") + " receive"); }
      else { bits.push("Flow limits not checked"); }
      if (d.txChannels || d.rxChannels) { bits.push("up to " + (d.txChannels || "?") + "×" + (d.rxChannels || "?") + " channels"); }
      bits.push(speed(d.linkMbps) + " port");
      line.appendChild(el("span", { text: bits.join(" · ") }));
      if (ti.src) { line.appendChild(el("span", {}, [src(ti.src, "source"), est()])); }
      if (ti.note) { line.appendChild(el("span", { text: ti.note })); }
      out.issues.forEach(function (x) { line.appendChild(el("span", { class: x.level, text: mark(x.level) + x.text })); });
    });
    routes.forEach(function (rt) {
      var sub = rt.row.querySelector(".sub"), a = null, b = null;
      devices.forEach(function (d) { if (d.id === rt.from) { a = d; } if (d.id === rt.to) { b = d; } });
      if (!a || !b || !rt.channels) { sub.textContent = "—"; return; }
      if (rt.mode === "multicast") { sub.textContent = "shared"; sub.title = "Uses the sender's multicast flows"; return; }
      var pairs = a === b ? a.qty * (a.qty - 1) : a.qty * b.qty;
      sub.textContent = f(DF.unicastFlows(rt.channels) * pairs, 0); sub.title = "";
    });
    $("devTotal").textContent = f(t.units, 0) + (t.units === 1 ? " device" : " devices");
    $("routeTotal").textContent = f(t.flows, 0) + (t.flows === 1 ? " flow" : " flows") + " · " + mbps(t.mbps);

    // ----- Flow tile: the device closest to (or furthest over) a flow limit -----
    var top = null;
    r.devices.forEach(function (d) {
      if (!d.qty) { return; }
      [["transmit", d.txFlows, d.txFlowLimit], ["receive", d.rxFlows, d.rxFlowLimit]].forEach(function (x) {
        if (!x[2]) { return; }
        var p = x[1] / x[2] * 100;
        if (!top || p > top.p) { top = { p: p, d: d, dir: x[0], used: x[1], limit: x[2] }; }
      });
    });
    var over = r.devices.filter(function (d) { return d.qty && ((d.txFlowLimit && d.txFlows > d.txFlowLimit) || (d.rxFlowLimit && d.rxFlows > d.rxFlowLimit)); });
    if (!t.units) {
      big("flowBig", "—", "flows"); badge("flowBadge", "", ""); $("flowTile").className = "card tile";
      $("flowFill").style.width = "0"; $("flowCapL").textContent = ""; $("flowCapR").textContent = "";
      $("flowMsg").textContent = "Add a device to start.";
    } else if (!top) {
      big("flowBig", f(t.flows, 0), "flows"); badge("flowBadge", "info", "Not checked"); $("flowTile").className = "card tile";
      $("flowFill").style.width = "0"; $("flowCapL").textContent = ""; $("flowCapR").textContent = "";
      $("flowMsg").textContent = "No device here has a flow limit entered, so nothing was checked.";
    } else {
      var fs = over.length ? "bad" : "ok";
      big("flowBig", f(top.used, 0), "of " + f(top.limit, 0) + " " + top.dir);
      badge("flowBadge", fs, over.length ? "✗ Over limit" : "✓ Within limits");
      $("flowTile").className = "card tile " + fs;
      $("flowFill").className = "fill " + (over.length ? "bad" : ""); $("flowFill").style.width = pct(top.p);
      $("flowCapL").textContent = top.d.name; $("flowCapR").textContent = f(top.p, 0) + " % of its limit";
      $("flowMsg").textContent = over.length
        ? over.map(function (d) { return d.name; }).join(", ") + (over.length === 1 ? " needs" : " need") +
          " more flows than the hardware has. Move some routes to multicast, or split the load across devices."
        : top.d.name + " is the closest to its limit. " + f(t.flows, 0) + " flows in the whole system.";
    }

    // ----- Link tile: the fullest cable, device link or uplink -----
    var busiest = null;
    r.devices.forEach(function (d) { if (d.qty && (!busiest || d.fillPct > busiest.p)) { busiest = { p: d.fillPct, name: d.name, mb: d.peakMbps, cap: d.linkMbps, what: "link" }; } });
    if (r.multiSwitch) { r.switches.forEach(function (s) { if (!busiest || s.fillPct > busiest.p) { busiest = { p: s.fillPct, name: s.name, mb: s.peakMbps, cap: r.uplinkMbps, what: "uplink" }; } }); }
    if (!busiest) {
      big("linkBig", "—", "%"); badge("linkBadge", "", ""); $("linkTile").className = "card tile";
      $("linkFill").style.width = "0"; $("linkCapL").textContent = ""; $("linkCapR").textContent = ""; $("linkMsg").textContent = "";
    } else {
      var ls = busiest.p > r.failPct ? "bad" : busiest.p > r.warnPct ? "warn" : "ok";
      big("linkBig", f(busiest.p, busiest.p < 10 ? 1 : 0), "% full");
      badge("linkBadge", ls, ls === "ok" ? "✓ Room to spare" : ls === "warn" ? "⚠ Getting full" : "✗ Too full");
      $("linkTile").className = "card tile " + ls;
      $("linkFill").className = "fill " + (ls === "ok" ? "" : ls); $("linkFill").style.width = pct(busiest.p);
      $("linkCapL").textContent = busiest.name + " " + busiest.what; $("linkCapR").textContent = mbps(busiest.mb) + " of " + speed(busiest.cap);
      $("linkMsg").textContent = ls === "ok"
        ? "Audio is an estimated " + mbps(busiest.mb) + " on the fullest cable. Other traffic on the same network is not counted."
        : "Over the " + (ls === "bad" ? r.failPct : r.warnPct) + " % planning mark. Use a faster link, move devices, or cut the channel count.";
    }

    // ----- Key facts -----
    var facts = $("facts"); facts.textContent = "";
    function fact(a, b) { facts.appendChild(el("dt", { text: a })); facts.appendChild(el("dd", { text: b })); }
    fact("Devices", f(t.units, 0));
    fact("Unicast flows", f(t.unicastFlows, 0));
    fact("Multicast flows", f(t.multicastFlows, 0));
    fact("Unicast audio", mbps(t.unicastMbps));
    fact("Multicast audio", mbps(t.multicastMbps));
    fact("All audio, whole system", mbps(t.mbps));

    // ----- Issues -----
    var ul = $("issues"); ul.textContent = "";
    r.issues.forEach(function (x) { ul.appendChild(el("li", { class: x.level, text: mark(x.level) + x.text })); });
    if (!r.igmpSnooping && r.usesMulticast) {
      ul.appendChild(el("li", { class: "warn", text: "⚠ Multicast is in use with IGMP snooping off: every port receives all " +
        mbps(t.multicastMbps) + " of it, wanted or not." }));
    }
    $("issuesWrap").hidden = !ul.children.length;

    // ----- Device table -----
    var tb = $("devTable").tBodies[0]; tb.textContent = "";
    r.devices.forEach(function (d) {
      if (!d.qty) { return; }
      tb.appendChild(el("tr", {}, [
        el("td", { text: d.name + (d.qty > 1 ? " (×" + d.qty + ")" : "") }),
        useCell("Transmit flows", d.txFlows, d.txFlowLimit), useCell("Receive flows", d.rxFlows, d.rxFlowLimit),
        cell("Sends", mbps(d.outMbps)), cell("Receives", mbps(d.inMbps)),
        fillCell("Link fill (" + speed(d.linkMbps) + ")", d.fillPct, r.warnPct, r.failPct), statusCell(d.status, d.issues)
      ]));
    });
    if (!tb.children.length) { tb.appendChild(el("tr", {}, [el("td", { colspan: "7", class: "muted", text: "No devices yet." })])); }

    // ----- Uplink table -----
    $("uplinkWrap").hidden = !r.multiSwitch;
    tb = $("swTable").tBodies[0]; tb.textContent = "";
    r.switches.forEach(function (s) {
      tb.appendChild(el("tr", {}, [
        el("td", { text: s.name }), cell("Devices", f(s.units, 0)), cell("Leaving", mbps(s.outMbps)), cell("Arriving", mbps(s.inMbps)),
        fillCell("Uplink fill (" + speed(r.uplinkMbps) + ")", s.fillPct, r.warnPct, r.failPct), statusCell(s.status, s.issues)
      ]));
    });

    // ----- Worked figures -----
    var rf = DF.rateFactor(plan.sampleRate);
    $("worked").textContent = "";
    worked("Unicast flows for one route", "round up (channels ÷ " + R.unicastChannelsPerFlow + ")",
      "A unicast flow goes from one device to one other device and holds up to " + R.unicastChannelsPerFlow +
      " channels. Each sender-receiver pair needs its own flows. Example: 6 channels to one receiver = round up (6 ÷ 4) = 2 flows.", "fanout");
    worked("Multicast flows for one sender", "round up (multicast channels ÷ " + r.multicastPerFlow + ")",
      "A multicast flow here holds up to " + r.multicastPerFlow + " channels (the setting in step 1) and is sent once, however many devices listen. " +
      "It counts as one transmit flow on the sender and one receive flow on each listener.", "mcConfig");
    worked("Bandwidth of one unicast flow at " + srLabel, f(r.unicastFlowMbps, 2) + " Mbps",
      R.unicastFlowMbps + " Mbps × (sample rate ÷ 48 kHz) = " + R.unicastFlowMbps + " × " + f(rf, 3) +
      ". Counted in full even when the flow carries fewer than " + R.unicastChannelsPerFlow + " channels.", "netadmin");
    worked("Bandwidth of multicast audio at " + srLabel, f(R.multicastChannelMbps * rf, 2) + " Mbps per channel",
      R.multicastChannelMbps + " Mbps × channels × (sample rate ÷ 48 kHz) = " + R.multicastChannelMbps + " × channels × " + f(rf, 3), "netadmin");
    worked("Unicast audio, whole system", mbps(t.unicastMbps), f(t.unicastFlows, 0) + " flows × " + f(r.unicastFlowMbps, 2) + " Mbps");
    worked("Multicast audio, whole system", mbps(t.multicastMbps),
      "sum of every sender's multicast channels × " + f(R.multicastChannelMbps * rf, 2) + " Mbps");
    worked("Load on a device's link", "larger of sending and receiving",
      "Sending = its unicast transmit flows × " + f(r.unicastFlowMbps, 2) + " Mbps + its multicast. Receiving = its unicast receive flows × " +
      f(r.unicastFlowMbps, 2) + " Mbps + the multicast flows it listens to" + (r.igmpSnooping ? "." : " (with IGMP snooping off: all multicast from every other device).") +
      " A network link carries each direction separately, so the two are not added.");
    worked("Link fill", "load ÷ link speed × 100",
      "Marked ⚠ over " + r.warnPct + " % and ✗ over " + r.failPct + " %. " + DATA.LINK.why, DATA.LINK.src);

    drawBrief(r, t, srLabel);

    var project = $("project").value.trim();
    $("printTitle").textContent = (project ? project + " · " : "") + "Dante network plan · " + new Date().toISOString().slice(0, 10);
    save(devices, routes);
  }

  // ----- the one-page brief for IT -----
  function table(heads, rows, plain) {
    var thead = el("thead", {}, [el("tr", {}, heads.map(function (h) { return el("th", { text: h }); }))]);
    var tbody = el("tbody", {}, rows.map(function (cells) {
      return el("tr", {}, cells.map(function (c, i) {
        var td = el("td", { "data-h": heads[i] });
        if (typeof c === "string") { td.textContent = c; } else if (c) { td.appendChild(c); }
        return td;
      }));
    }));
    return el("div", { class: "scroll-x" }, [el("table", { class: plain ? "" : "stack" }, [thead, tbody])]);
  }
  function mono(text) { return el("span", { class: "mono", text: text }); }
  function drawBrief(r, t, srLabel) {
    var b = $("brief"); b.textContent = "";
    var aes = $("aes67").checked, mc = r.usesMulticast;
    var project = $("project").value.trim();
    b.appendChild(el("p", { class: "small" }, [
      "This page lists what the network needs to carry Dante digital audio" + (project ? " for " + project : "") +
      ". Figures are the vendor's published values and estimates from the plan above. ",
      src(DATA.BRIEF_SRC, "Audinate's own sheet for network administrators"), " is the reference."]));

    b.appendChild(el("h3", { text: "What this system puts on the network" }));
    var peak = r.peakDevice;
    var rows = [
      ["Audio devices", f(t.units, 0)],
      ["Audio streams (flows)", f(t.unicastFlows, 0) + " unicast, " + f(t.multicastFlows, 0) + " multicast"],
      ["Estimated audio traffic, whole system", mbps(t.mbps) + " at " + srLabel],
      ["Busiest device port", peak ? peak.name + ": " + mbps(peak.peakMbps) + " on a " + speed(peak.linkMbps) + " port" : "—"]
    ];
    if (r.multiSwitch) {
      r.switches.forEach(function (s) { rows.push(["Uplink of " + s.name, mbps(s.peakMbps) + " (" + f(s.fillPct, s.fillPct < 10 ? 1 : 0) + " % of " + speed(r.uplinkMbps) + ")"]); });
    }
    rows.push(["Multicast audio", mc ? "Yes, " + mbps(t.multicastMbps) + ". IGMP snooping " + (r.igmpSnooping ? "planned on." : "planned OFF: all of it reaches every port.") : "None planned (discovery and clock still use multicast)"]);
    b.appendChild(table(["Item", "Value"], rows, true));

    b.appendChild(el("h3", { text: "Addresses and ports" }));
    var ports = DATA.PORTS.filter(function (p) { return !p.when || (p.when === "aes67" && aes); });
    b.appendChild(table(["Used for", "Protocol and ports", "Addresses"], ports.map(function (p) { return [p.use, mono(p.ports), mono(p.addr)]; })));

    b.appendChild(el("h3", { text: "Quality of service (QoS)" }));
    b.appendChild(el("p", { class: "small", text: DATA.QOS_INTRO }));
    b.appendChild(table(["Priority", "Traffic", "DSCP label", "DSCP value"], DATA.QOS.map(function (q) { return [q.priority, q.use, q.label, mono(q.value)]; })));
    if (aes && DATA.QOS_AES67) { b.appendChild(el("p", { class: "small", style: "margin-top:8px", text: DATA.QOS_AES67 })); }

    b.appendChild(el("h3", { text: "Switch settings to agree" }));
    var ul = el("ul", { class: "notes small" });
    DATA.SWITCH_NOTES.forEach(function (n) {
      if (n.when === "multicast" && !mc && !aes) { return; }
      ul.appendChild(el("li", {}, [el("strong", { text: n.head + " " }), n.text]));
    });
    b.appendChild(ul);
    b.appendChild(el("p", { class: "small muted", style: "margin:12px 0 0" }, [
      "Sources: ", src(DATA.BRIEF_SRC), DATA.BRIEF_SRC2 ? "; " : "", DATA.BRIEF_SRC2 ? src(DATA.BRIEF_SRC2) : null,
      ". Vendor figures are estimates and change between revisions: check the current document."]));
  }

  // ----- fixed lists -----
  function fillStatic() {
    DATA.SAMPLE_RATES.forEach(function (s) { $("sampleRate").appendChild(el("option", { value: String(s.hz), text: s.label })); });
    $("sampleRate").value = "48000";
    DATA.NOTES.forEach(function (n) {
      var li = el("li"); if (n.head) { li.appendChild(el("strong", { text: n.head + " " })); }
      li.appendChild(document.createTextNode(n.text));
      if (n.src) { li.appendChild(document.createTextNode(" ")); li.appendChild(src(n.src, "Source")); li.appendChild(document.createTextNode(".")); }
      $("notes").appendChild(li);
    });
    Object.keys(DATA.SOURCES).forEach(function (k) {
      var s = DATA.SOURCES[k];
      $("sources").appendChild(el("li", {}, [el("a", { href: s.url, rel: "noopener", target: "_blank", text: s.title }),
        document.createTextNode((s.rev ? ", " + s.rev : "") + ". " + (s.used || "") + " Checked " + s.checked + ".")]));
    });
  }

  function reset() { apply(JSON.parse(JSON.stringify(DATA.EXAMPLE))); update(); }
  function printPage(briefOnly) {
    document.body.classList.toggle("brief-only", briefOnly);
    window.print();
  }
  window.addEventListener("afterprint", function () { document.body.classList.remove("brief-only"); });

  fillStatic();
  if (!load()) { apply(JSON.parse(JSON.stringify(DATA.EXAMPLE))); }
  ready = true; update();
  $("form").addEventListener("input", update);
  $("form").addEventListener("change", function () { refreshRouteLists(); update(); });
  $("addDevice").addEventListener("click", function () { addDevice({ name: "", qty: 1 }, true); refreshRouteLists(); update(); });
  $("addRoute").addEventListener("click", function () { addRoute({ channels: 2 }, true); refreshRouteLists(); update(); });
  $("printBrief").addEventListener("click", function () { printPage(true); });
  $("printBrief2").addEventListener("click", function () { printPage(true); });
  $("printAll").addEventListener("click", function () { printPage(false); });
  $("resetBtn").addEventListener("click", reset);
})();
