// Dante flow and bandwidth planner: the maths only, no page code.
// Loaded by index.html in the browser and by calc.test.js in Node.
//
// Words used here:
//   flow      one stream of audio packets from one transmitter. A unicast flow goes to
//             one receiver; a multicast flow can be picked up by any number of receivers.
//   route     one line of the plan: "these devices send N channels to those devices".
//   unit      one physical device. A device line with quantity 8 is 8 units.
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.DF = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Vendor figures. Each one is an estimate published by Audinate; the page links
  // every figure to the document it came from (see SOURCES in data.js).
  var RULES = {
    unicastChannelsPerFlow: 4,     // a unicast flow carries up to 4 channels
    multicastChannelsPerFlow: 8,   // the long-standing size of a multicast flow, and the planner's default
    multicastMaxPerFlow: 64,       // newer devices can be set higher, up to 64 depending on the device
    unicastFlowMbps: 6,            // "about 6 Mbps per typical unicast audio flow"
    multicastChannelMbps: 1.5,     // "about 1.5 Mbps per channel"
    baseSampleRate: 48000          // the rate those two figures are quoted at
  };

  function posInt(x) { x = Math.floor(Number(x)); return isFinite(x) && x > 0 ? x : 0; }
  function ceilDiv(a, b) { return a > 0 ? Math.ceil(a / b) : 0; }

  // Flows needed to carry `channels` from one transmitter unit to one receiver unit.
  function unicastFlows(channels) { return ceilDiv(posInt(channels), RULES.unicastChannelsPerFlow); }
  // Multicast flows one transmitter unit needs for `channels`, at `perFlow` channels each.
  function multicastFlows(channels, perFlow) {
    var p = posInt(perFlow);
    if (!p) { p = RULES.multicastChannelsPerFlow; }
    if (p > RULES.multicastMaxPerFlow) { p = RULES.multicastMaxPerFlow; }
    return ceilDiv(posInt(channels), p);
  }
  // Bandwidth scales with the sample rate: twice the samples, twice the data.
  // This scaling is the planner's own assumption; Audinate publishes 48 kHz figures only.
  function rateFactor(sampleRate) {
    var r = Number(sampleRate);
    return isFinite(r) && r > 0 ? r / RULES.baseSampleRate : 1;
  }
  function unicastFlowMbps(sampleRate) { return RULES.unicastFlowMbps * rateFactor(sampleRate); }
  function multicastMbps(channels, sampleRate) {
    return posInt(channels) * RULES.multicastChannelMbps * rateFactor(sampleRate);
  }

  // plan = {
  //   sampleRate: 48000,
  //   igmpSnooping: true,        // false: switches flood multicast to every port
  //   multicastPerFlow: 8,
  //   warnPct: 50, failPct: 70,  // link fill thresholds, percent
  //   uplinkMbps: 1000,
  //   devices: [{ id, name, qty, switchName, linkMbps, txFlowLimit, rxFlowLimit,
  //               txChannels, rxChannels, multicastChannels }],
  //   routes:  [{ from: id, to: id, channels, mode: "unicast" | "multicast" }]
  // }
  // A route means: EVERY unit of `from` sends `channels` channels to EVERY unit of `to`.
  // Limits left blank (NaN, null, 0) are not checked.
  function calculate(plan) {
    var sr = plan.sampleRate || RULES.baseSampleRate;
    var uniMbps = unicastFlowMbps(sr);
    var perFlow = posInt(plan.multicastPerFlow) || RULES.multicastChannelsPerFlow;
    if (perFlow > RULES.multicastMaxPerFlow) { perFlow = RULES.multicastMaxPerFlow; }
    var igmp = plan.igmpSnooping !== false;
    var warnPct = isFinite(plan.warnPct) ? plan.warnPct : 50;
    var failPct = isFinite(plan.failPct) ? plan.failPct : 70;
    var problems = [];
    var byId = {}, devs = [], switches = {}, switchOrder = [];

    (plan.devices || []).forEach(function (d, i) {
      var qty = posInt(d.qty);
      var sw = String(d.switchName || "").trim() || "Switch 1";
      var mcCh = posInt(d.multicastChannels);
      var mcFlows = multicastFlows(mcCh, perFlow);
      var dev = {
        id: d.id, name: String(d.name || "").trim() || "Device " + (i + 1), qty: qty, switchName: sw,
        linkMbps: Number(d.linkMbps) > 0 ? Number(d.linkMbps) : 1000,
        txFlowLimit: posInt(d.txFlowLimit), rxFlowLimit: posInt(d.rxFlowLimit),
        txChannelLimit: posInt(d.txChannels), rxChannelLimit: posInt(d.rxChannels),
        multicastChannels: mcCh, multicastFlows: mcFlows,
        multicastMbps: multicastMbps(mcCh, sr),          // per unit, always on the wire
        txUnicastFlows: 0, rxUnicastFlows: 0, rxMulticastFlows: 0,
        rxMulticastMbps: 0, txChannelsUsed: 0, rxChannelsUsed: 0, issues: []
      };
      dev._mcSubs = {};      // transmitter id -> most channels this device takes from its multicast
      dev._txCh = {};        // unicast channels per receiver line (largest route wins)
      byId[d.id] = dev; devs.push(dev);
      if (!switches[sw]) {
        switches[sw] = { name: sw, outMbps: 0, inMbps: 0, units: 0, mcSubs: {} };
        switchOrder.push(sw);
      }
      switches[sw].units += qty;
    });

    var totals = { units: 0, unicastFlows: 0, multicastFlows: 0, unicastMbps: 0, multicastMbps: 0,
      channelsRouted: 0 };

    (plan.routes || []).forEach(function (r, i) {
      var from = byId[r.from], to = byId[r.to], ch = posInt(r.channels);
      var label = "Route " + (i + 1);
      if (!from || !to) { if (ch) { problems.push({ level: "bad", text: label + ": pick a device on both ends." }); } return; }
      if (!ch || !from.qty || !to.qty) { return; }
      label = from.name + " → " + to.name;
      // A unit never sends to itself over the network.
      var pairs = from === to ? from.qty * (from.qty - 1) : from.qty * to.qty;
      var rxPerTxUnit = from === to ? from.qty - 1 : to.qty;
      var txPerRxUnit = from === to ? from.qty - 1 : from.qty;
      if (pairs <= 0) { problems.push({ level: "warn", text: label + ": a single device cannot send to itself." }); return; }
      totals.channelsRouted += ch * pairs;
      to.rxChannelsUsed += ch * txPerRxUnit;

      if (r.mode === "multicast") {
        if (!from.multicastChannels) {
          problems.push({ level: "bad", text: label + ": set to multicast, but " + from.name +
            " has no multicast channels. Give it some, or set the route to unicast." });
          return;
        }
        var take = ch;
        if (ch > from.multicastChannels) {
          problems.push({ level: "warn", text: label + ": asks for " + ch + " multicast channels but " +
            from.name + " only sends " + from.multicastChannels + ". Counted as " + from.multicastChannels + "." });
          take = from.multicastChannels;
        }
        to._mcSubs[from.id] = Math.max(to._mcSubs[from.id] || 0, take);
        var sw = switches[to.switchName];
        sw.mcSubs[from.id] = Math.max(sw.mcSubs[from.id] || 0, take);
        return;
      }

      // Unicast: 4 channels to a flow, flows are per transmitter-receiver pair.
      var flows = unicastFlows(ch);
      from.txUnicastFlows += flows * rxPerTxUnit;
      to.rxUnicastFlows += flows * txPerRxUnit;
      from._txCh[to.id] = Math.max(from._txCh[to.id] || 0, ch);
      totals.unicastFlows += flows * pairs;
      if (from.switchName !== to.switchName) {
        switches[from.switchName].outMbps += flows * pairs * uniMbps;
        switches[to.switchName].inMbps += flows * pairs * uniMbps;
      }
    });

    // Multicast sent by everyone, used when snooping is off and it all floods.
    var allMcMbps = 0, allMcFlows = 0;
    devs.forEach(function (d) {
      allMcMbps += d.multicastMbps * d.qty; allMcFlows += d.multicastFlows * d.qty;
    });
    totals.multicastFlows = allMcFlows; totals.multicastMbps = allMcMbps;
    totals.unicastMbps = totals.unicastFlows * uniMbps;

    // Mbps of one transmitter unit's multicast needed to deliver `take` channels:
    // whole flows are delivered, so round up to full flows.
    function mcTakeFlows(tx, take) { return Math.min(tx.multicastFlows, ceilDiv(take, perFlow)); }
    function mcFlowMbps(tx, flows) {
      return Math.min(tx.multicastMbps, multicastMbps(flows * perFlow, sr));
    }

    devs.forEach(function (d) {
      totals.units += d.qty;
      // Channels a unit transmits: its multicast channels, or the widest unicast route, whichever is more.
      var widest = 0, k;
      for (k in d._txCh) { widest = Math.max(widest, d._txCh[k]); }
      d.txChannelsUsed = Math.max(widest, d.multicastChannels);

      // Multicast this unit subscribes to.
      for (k in d._mcSubs) {
        var tx = byId[k], n = mcTakeFlows(tx, d._mcSubs[k]);
        var srcUnits = tx === d ? tx.qty - 1 : tx.qty;
        d.rxMulticastFlows += n * srcUnits;
        d.rxMulticastMbps += mcFlowMbps(tx, n) * srcUnits;
      }
      d.txFlows = d.txUnicastFlows + d.multicastFlows;
      d.rxFlows = d.rxUnicastFlows + d.rxMulticastFlows;
      d.outMbps = d.txUnicastFlows * uniMbps + d.multicastMbps;
      // With snooping off the switch sends every multicast flow to every port.
      var mcIn = igmp ? d.rxMulticastMbps : allMcMbps - d.multicastMbps;
      d.floodMbps = igmp ? 0 : Math.max(0, mcIn - d.rxMulticastMbps);
      d.inMbps = d.rxUnicastFlows * uniMbps + mcIn;
      d.peakMbps = Math.max(d.outMbps, d.inMbps);
      d.fillPct = d.peakMbps / d.linkMbps * 100;

      if (d.txFlowLimit && d.txFlows > d.txFlowLimit) {
        d.issues.push({ level: "bad", text: "Needs " + d.txFlows + " transmit flows, limit " + d.txFlowLimit + "." });
      }
      if (d.rxFlowLimit && d.rxFlows > d.rxFlowLimit) {
        d.issues.push({ level: "bad", text: "Needs " + d.rxFlows + " receive flows, limit " + d.rxFlowLimit + "." });
      }
      if (d.txChannelLimit && d.txChannelsUsed > d.txChannelLimit) {
        d.issues.push({ level: "bad", text: "Sends " + d.txChannelsUsed + " channels, has " + d.txChannelLimit + "." });
      }
      if (d.rxChannelLimit && d.rxChannelsUsed > d.rxChannelLimit) {
        d.issues.push({ level: "bad", text: "Receives " + d.rxChannelsUsed + " channels, has " + d.rxChannelLimit + "." });
      }
      if (d.fillPct > failPct) {
        d.issues.push({ level: "bad", text: "Link " + Math.round(d.fillPct) + " % full (over " + failPct + " %)." });
      } else if (d.fillPct > warnPct) {
        d.issues.push({ level: "warn", text: "Link " + Math.round(d.fillPct) + " % full (over " + warnPct + " %)." });
      }
      if (d.floodMbps > 0 && d.linkMbps <= 100) {
        d.issues.push({ level: "warn", text: "100 Mbps device receiving " + round1(d.floodMbps) +
          " Mbps of multicast it did not ask for. Turn on IGMP snooping." });
      }
      d.status = worst(d.issues);
    });

    // Uplinks: every switch is taken to hang off one core, so a flow between two
    // switches crosses the uplink of each. Multicast leaves its own switch when a
    // unit elsewhere subscribes (or always, with snooping off).
    var uplinkMbps = Number(plan.uplinkMbps) > 0 ? Number(plan.uplinkMbps) : 1000;
    var sws = switchOrder.map(function (n) { return switches[n]; });
    var multi = sws.length > 1;
    if (multi) {
      devs.forEach(function (tx) {
        if (!tx.multicastFlows || !tx.qty) { return; }
        var most = 0;
        sws.forEach(function (sw) {
          if (sw.name === tx.switchName) { return; }
          var flows = igmp ? mcTakeFlows(tx, sw.mcSubs[tx.id] || 0) : tx.multicastFlows;
          var mbps = mcFlowMbps(tx, flows) * tx.qty;
          sw.inMbps += mbps;
          most = Math.max(most, flows);
        });
        switches[tx.switchName].outMbps += mcFlowMbps(tx, most) * tx.qty;
      });
    }
    sws.forEach(function (sw) {
      sw.peakMbps = Math.max(sw.outMbps, sw.inMbps);
      sw.fillPct = sw.peakMbps / uplinkMbps * 100;
      sw.issues = [];
      if (multi && sw.fillPct > failPct) {
        sw.issues.push({ level: "bad", text: "Uplink " + Math.round(sw.fillPct) + " % full (over " + failPct + " %)." });
      } else if (multi && sw.fillPct > warnPct) {
        sw.issues.push({ level: "warn", text: "Uplink " + Math.round(sw.fillPct) + " % full (over " + warnPct + " %)." });
      }
      sw.status = worst(sw.issues);
    });

    devs.forEach(function (d) { delete d._mcSubs; delete d._txCh; });
    sws.forEach(function (sw) { delete sw.mcSubs; });

    var all = problems.slice();
    devs.forEach(function (d) { d.issues.forEach(function (x) { all.push({ level: x.level, text: d.name + ": " + x.text }); }); });
    sws.forEach(function (s) { s.issues.forEach(function (x) { all.push({ level: x.level, text: s.name + ": " + x.text }); }); });
    totals.flows = totals.unicastFlows + totals.multicastFlows;
    totals.mbps = totals.unicastMbps + totals.multicastMbps;
    var peakDev = null;
    devs.forEach(function (d) { if (d.qty && (!peakDev || d.fillPct > peakDev.fillPct)) { peakDev = d; } });

    return {
      sampleRate: sr, unicastFlowMbps: uniMbps, multicastPerFlow: perFlow, igmpSnooping: igmp,
      warnPct: warnPct, failPct: failPct, uplinkMbps: uplinkMbps,
      devices: devs, switches: sws, multiSwitch: multi, totals: totals, issues: all,
      status: worst(all), peakDevice: peakDev, usesMulticast: allMcFlows > 0
    };
  }

  function round1(x) { return Math.round(x * 10) / 10; }
  function worst(list) {
    var s = "ok";
    list.forEach(function (x) { if (x.level === "bad") { s = "bad"; } else if (x.level === "warn" && s !== "bad") { s = "warn"; } });
    return s;
  }

  return {
    RULES: RULES, unicastFlows: unicastFlows, multicastFlows: multicastFlows, rateFactor: rateFactor,
    unicastFlowMbps: unicastFlowMbps, multicastMbps: multicastMbps, calculate: calculate
  };
});
