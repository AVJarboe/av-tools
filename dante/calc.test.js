// Self-check for calc.js. The expected numbers below were worked by hand from
// the published rules (4 channels to a unicast flow, about 6 Mbps a flow,
// about 1.5 Mbps a multicast channel), not produced by the code under test.
//
// Run either way:
//   node dante/calc.test.js      (from the repo root, needs Node.js)
//   open dante/selftest.html     (in any browser, no install needed)
(function (root) {
  "use strict";
  var node = typeof module === "object" && module.exports;
  var DF = node ? require("./calc.js") : root.DF;
  var DATA = node ? require("./data.js") : root.DFDATA;
  var results = [];

  function near(name, got, want) {
    results.push({ name: name, ok: Math.abs(got - want) <= Math.abs(want) * 1e-9 + 1e-9, got: got, want: want });
  }
  function same(name, got, want) { results.push({ name: name, ok: got === want, got: got, want: want }); }
  function dev(id, qty, over) {
    var d = { id: id, name: id, qty: qty, switchName: "A", linkMbps: 1000, multicastChannels: 0 };
    for (var k in over) { d[k] = over[k]; }
    return d;
  }
  function find(r, id) { return r.devices.filter(function (d) { return d.id === id; })[0]; }
  function sw(r, name) { return r.switches.filter(function (s) { return s.name === name; })[0]; }

  // Case 1: flow counts. 4 channels to a unicast flow, 8 to a multicast flow by default.
  same("1 unicast: 1 channel = 1 flow", DF.unicastFlows(1), 1);
  same("1 unicast: 4 channels = 1 flow", DF.unicastFlows(4), 1);
  same("1 unicast: 5 channels = 2 flows", DF.unicastFlows(5), 2);
  same("1 unicast: 64 channels = 16 flows", DF.unicastFlows(64), 16);
  same("1 unicast: 0 channels = 0 flows", DF.unicastFlows(0), 0);
  same("1 multicast: 8 channels = 1 flow", DF.multicastFlows(8, 8), 1);
  same("1 multicast: 20 channels at 8 a flow = 3 flows", DF.multicastFlows(20, 8), 3);
  same("1 multicast: 20 channels at 16 a flow = 2 flows", DF.multicastFlows(20, 16), 2);
  same("1 multicast: flow size is capped at 64", DF.multicastFlows(100, 500), 2);

  // Case 2: bandwidth. 6 Mbps a unicast flow and 1.5 Mbps a multicast channel at 48 kHz,
  // scaled by sample rate / 48000.
  near("2 unicast flow at 48 kHz, Mbps", DF.unicastFlowMbps(48000), 6);
  near("2 unicast flow at 96 kHz, Mbps", DF.unicastFlowMbps(96000), 12);
  near("2 unicast flow at 44.1 kHz, Mbps", DF.unicastFlowMbps(44100), 5.5125);
  near("2 multicast, 8 channels at 48 kHz, Mbps", DF.multicastMbps(8, 48000), 12);
  near("2 multicast, 2 channels at 192 kHz, Mbps", DF.multicastMbps(2, 192000), 12);

  // Case 3: Audinate's own examples (2022 IT-manager paper).
  // 64 channels from one device to another: 16 flows x 6 = 96 Mbps ("about 100").
  var r3 = DF.calculate({ devices: [dev("a", 1), dev("b", 1)], routes: [{ from: "a", to: "b", channels: 64, mode: "unicast" }] });
  same("3 64 channels one to one: flows", r3.totals.unicastFlows, 16);
  near("3 64 channels one to one: Mbps", r3.totals.mbps, 96);
  // 2 channels from a DSP to 4 speakers. Unicast: 4 flows, 24 Mbps. Multicast: 1 flow, 3 Mbps.
  var r3u = DF.calculate({ devices: [dev("dsp", 1), dev("spk", 4)], routes: [{ from: "dsp", to: "spk", channels: 2, mode: "unicast" }] });
  same("3 DSP to 4 speakers, unicast: flows", r3u.totals.flows, 4);
  near("3 DSP to 4 speakers, unicast: Mbps", r3u.totals.mbps, 24);
  same("3 unicast: DSP transmit flows", find(r3u, "dsp").txFlows, 4);
  same("3 unicast: each speaker receive flows", find(r3u, "spk").rxFlows, 1);
  var r3m = DF.calculate({ devices: [dev("dsp", 1, { multicastChannels: 2 }), dev("spk", 4)], routes: [{ from: "dsp", to: "spk", channels: 2, mode: "multicast" }] });
  same("3 DSP to 4 speakers, multicast: flows", r3m.totals.flows, 1);
  near("3 DSP to 4 speakers, multicast: Mbps", r3m.totals.mbps, 3);
  same("3 multicast: each speaker receive flows", find(r3m, "spk").rxFlows, 1);
  near("3 multicast: each speaker receives, Mbps", find(r3m, "spk").inMbps, 3);

  // Case 4: the example on the page (a made-up training room), worked by hand.
  //   3 mics -> DSP, 8 ch each: 2 flows a pair x 3 = 6 flows
  //   wireless -> DSP, 4 ch: 1 flow.   DSP -> 2 amps, 8 ch each: 2 x 2 = 4 flows
  //   DSP -> PC, 16 ch: 4 flows.       DSP multicast, 2 ch: 1 flow, 3 Mbps
  //   Unicast 15 flows x 6 = 90 Mbps; with multicast 16 flows, 93 Mbps.
  //   DSP: transmits 4 + 4 + 1 multicast = 9 flows, 8 x 6 + 3 = 51 Mbps;
  //        receives 6 + 1 = 7 flows, 42 Mbps, 24 + 4 = 28 channels.
  //   Mics and speakers are on the ceiling switch: 36 Mbps leaves it, 3 Mbps arrives.
  function types(plan) {
    plan.devices.forEach(function (d) {
      var t = DATA.DEVICE_TYPES.filter(function (x) { return x.id === d.type; })[0];
      var lim = d.type === "custom" ? d.custom : t;
      d.linkMbps = lim.linkMbps; d.txFlowLimit = lim.txFlows; d.rxFlowLimit = lim.rxFlows; d.txChannels = lim.tx; d.rxChannels = lim.rx;
    });
    return plan;
  }
  function example(over) {
    var e = JSON.parse(JSON.stringify(DATA.EXAMPLE));
    var plan = types({ sampleRate: 48000, igmpSnooping: true, multicastPerFlow: 8, warnPct: 50, failPct: 70,
      uplinkMbps: 1000, devices: e.devices, routes: e.routes });
    for (var k in over) { plan[k] = over[k]; }
    return plan;
  }
  var r4 = DF.calculate(example());
  same("4 devices", r4.totals.units, 14);
  same("4 unicast flows", r4.totals.unicastFlows, 15);
  same("4 multicast flows", r4.totals.multicastFlows, 1);
  near("4 all audio, Mbps", r4.totals.mbps, 93);
  same("4 DSP transmit flows", find(r4, "dsp").txFlows, 9);
  same("4 DSP receive flows", find(r4, "dsp").rxFlows, 7);
  near("4 DSP sends, Mbps", find(r4, "dsp").outMbps, 51);
  near("4 DSP receives, Mbps", find(r4, "dsp").inMbps, 42);
  near("4 DSP link fill, %", find(r4, "dsp").fillPct, 5.1);
  same("4 DSP receive channels", find(r4, "dsp").rxChannelsUsed, 28);
  same("4 each mic transmit flows", find(r4, "mics").txFlows, 2);
  near("4 each mic sends, Mbps", find(r4, "mics").outMbps, 12);
  same("4 each amplifier receive flows", find(r4, "amps").rxFlows, 2);
  same("4 each speaker receive flows", find(r4, "spk").rxFlows, 1);
  near("4 each speaker link fill (100 Mbps), %", find(r4, "spk").fillPct, 3);
  near("4 wireless receiver link fill (100 Mbps), %", find(r4, "wl").fillPct, 6);
  same("4 PC receive flows", find(r4, "pc").rxFlows, 4);
  near("4 ceiling switch: leaving, Mbps", sw(r4, "Ceiling switch").outMbps, 36);
  near("4 ceiling switch: arriving, Mbps", sw(r4, "Ceiling switch").inMbps, 3);
  near("4 rack switch: leaving, Mbps", sw(r4, "Rack switch").outMbps, 3);
  near("4 rack switch: arriving, Mbps", sw(r4, "Rack switch").inMbps, 36);
  same("4 nothing flagged", r4.status, "ok");

  // Case 5: the same room with IGMP snooping off. The DSP's 3 Mbps of multicast now
  // reaches every port, so each mic and the wireless receiver get 3 Mbps they never asked for.
  var r5 = DF.calculate(example({ igmpSnooping: false }));
  near("5 each mic receives, Mbps", find(r5, "mics").inMbps, 3);
  near("5 wireless receiver: unwanted multicast, Mbps", find(r5, "wl").floodMbps, 3);
  same("5 wireless receiver (100 Mbps) is flagged", find(r5, "wl").status, "warn");
  near("5 DSP does not receive its own multicast, Mbps", find(r5, "dsp").inMbps, 42);
  near("5 ceiling switch: arriving, Mbps", sw(r5, "Ceiling switch").inMbps, 3);

  // Case 6: the same room at 96 kHz: everything doubles. 93 x 2 = 186 Mbps.
  near("6 all audio at 96 kHz, Mbps", DF.calculate(example({ sampleRate: 96000 })).totals.mbps, 186);

  // Case 7: flow limits. A 2-flow receiver fed by 3 senders needs 3 receive flows.
  var r7 = DF.calculate({ devices: [dev("tx", 3), dev("small", 1, { rxFlowLimit: 2, txFlowLimit: 2 })],
    routes: [{ from: "tx", to: "small", channels: 1, mode: "unicast" }] });
  same("7 receive flows needed", find(r7, "small").rxFlows, 3);
  same("7 over the limit is flagged", find(r7, "small").status, "bad");
  // One sender, 8 channels: 2 flows, within a limit of 2.
  var r7b = DF.calculate({ devices: [dev("tx", 1), dev("small", 1, { rxFlowLimit: 2 })],
    routes: [{ from: "tx", to: "small", channels: 8, mode: "unicast" }] });
  same("7 8 channels from one sender = 2 flows, allowed", find(r7b, "small").status, "ok");

  // Case 8: link fill. 12 unicast flows into a 100 Mbps device = 72 Mbps = 72 %, over the 70 % mark.
  // 9 flows = 54 %, over the 50 % early warning only.
  var r8 = DF.calculate({ warnPct: 50, failPct: 70, devices: [dev("tx", 12), dev("rx", 1, { linkMbps: 100 })],
    routes: [{ from: "tx", to: "rx", channels: 4, mode: "unicast" }] });
  near("8 12 flows on 100 Mbps, %", find(r8, "rx").fillPct, 72);
  same("8 72 % is over the limit", find(r8, "rx").status, "bad");
  var r8b = DF.calculate({ warnPct: 50, failPct: 70, devices: [dev("tx", 9), dev("rx", 1, { linkMbps: 100 })],
    routes: [{ from: "tx", to: "rx", channels: 4, mode: "unicast" }] });
  same("8 54 % is a warning", find(r8b, "rx").status, "warn");

  // Case 9: a line of 3 devices that all send to each other: 3 x 2 = 6 pairs, 2 flows out and in per unit.
  var r9 = DF.calculate({ devices: [dev("panel", 3)], routes: [{ from: "panel", to: "panel", channels: 2, mode: "unicast" }] });
  same("9 three devices sending to each other: flows", r9.totals.unicastFlows, 6);
  same("9 each unit transmit flows", find(r9, "panel").txFlows, 2);
  same("9 each unit receive flows", find(r9, "panel").rxFlows, 2);

  // Case 10: multicast details. 20 channels at 8 a flow = 3 flows, 30 Mbps, sent with or without listeners.
  // A listener taking 10 channels gets 2 whole flows = 16 channels = 24 Mbps.
  var r10 = DF.calculate({ multicastPerFlow: 8, devices: [dev("tx", 1, { multicastChannels: 20 }), dev("rx", 1), dev("idle", 1)],
    routes: [{ from: "tx", to: "rx", channels: 10, mode: "multicast" }] });
  same("10 sender multicast flows", find(r10, "tx").txFlows, 3);
  near("10 sender sends, Mbps", find(r10, "tx").outMbps, 30);
  same("10 listener receive flows", find(r10, "rx").rxFlows, 2);
  near("10 listener receives, Mbps", find(r10, "rx").inMbps, 24);
  near("10 a device that did not ask gets nothing (snooping on), Mbps", find(r10, "idle").inMbps, 0);
  var r10b = DF.calculate({ devices: [dev("tx", 1), dev("rx", 1)], routes: [{ from: "tx", to: "rx", channels: 2, mode: "multicast" }] });
  same("10 multicast route with no multicast channels is flagged", r10b.status, "bad");

  // Case 11: the figures the page shows match what the source documents say.
  same("11 channels per unicast flow", DF.RULES.unicastChannelsPerFlow, 4);
  same("11 Mbps per unicast flow", DF.RULES.unicastFlowMbps, 6);
  same("11 Mbps per multicast channel", DF.RULES.multicastChannelMbps, 1.5);
  same("11 link ceiling, %", DATA.LINK.failPct, 70);
  same("11 every device type with limits names a source",
    DATA.DEVICE_TYPES.every(function (t) { return t.id === "custom" || !!DATA.SOURCES[t.src]; }), true);
  same("11 every source has a web address",
    Object.keys(DATA.SOURCES).every(function (k) { return /^https:\/\//.test(DATA.SOURCES[k].url); }), true);
  same("11 nothing in an empty plan", DF.calculate({ devices: [], routes: [] }).totals.flows, 0);

  var failed = results.filter(function (r) { return !r.ok; });
  var summary = (results.length - failed.length) + " of " + results.length + " checks passed";

  if (typeof document !== "undefined" && document.getElementById("selftest")) {
    var html = "<p><strong>" + summary + "</strong></p><table><thead><tr><th>Check</th>" +
      "<th>Hand-worked</th><th>Calculator</th><th></th></tr></thead><tbody>";
    results.forEach(function (r) {
      html += "<tr><td>" + r.name + "</td><td>" + r.want + "</td><td>" +
        (typeof r.got === "number" ? Number(r.got.toPrecision(7)) : r.got) +
        "</td><td class=\"" + (r.ok ? "ok" : "bad") + "\">" + (r.ok ? "pass" : "FAIL") + "</td></tr>";
    });
    document.getElementById("selftest").innerHTML = html + "</tbody></table>";
  } else if (typeof console !== "undefined") {
    results.forEach(function (r) {
      console.log((r.ok ? "pass  " : "FAIL  ") + r.name + (r.ok ? "" : "  got " + r.got + ", want " + r.want));
    });
    console.log(summary);
    if (failed.length && typeof process !== "undefined") { process.exitCode = 1; }
  }
})(typeof self !== "undefined" ? self : this);
