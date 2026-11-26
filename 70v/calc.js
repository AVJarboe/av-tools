// 70V/100V line and amplifier load calculator: the maths only, no page code.
// Loaded by index.html in the browser and by calc.test.js in Node.
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.CV = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var FT_PER_M = 1 / 0.3048;          // exact by definition of the foot
  var COPPER_TEMP_COEFF = 0.00393;    // per deg C, annealed copper, referred to 20 C

  // Nominal DC resistance of one conductor at 20 C.
  // AWG: solid annealed copper, ohms per 1000 ft (NBS Handbook 100, Copper Wire Tables, Table 5, as printed).
  // mm2: IEC 60228 Class 2 stranded plain copper, maximum ohms per km.
  var WIRES = [
    { id: "awg10", label: "10 AWG", group: "AWG", ohmPer1000ft: 0.9988 },
    { id: "awg12", label: "12 AWG", group: "AWG", ohmPer1000ft: 1.59 },
    { id: "awg14", label: "14 AWG", group: "AWG", ohmPer1000ft: 2.52 },
    { id: "awg16", label: "16 AWG", group: "AWG", ohmPer1000ft: 4.02 },
    { id: "awg18", label: "18 AWG", group: "AWG", ohmPer1000ft: 6.39 },
    { id: "awg20", label: "20 AWG", group: "AWG", ohmPer1000ft: 10.1 },
    { id: "awg22", label: "22 AWG", group: "AWG", ohmPer1000ft: 16.2 },
    { id: "awg24", label: "24 AWG", group: "AWG", ohmPer1000ft: 25.7 },
    { id: "mm6", label: "6 mm²", group: "mm²", ohmPerKm: 3.08 },
    { id: "mm4", label: "4 mm²", group: "mm²", ohmPerKm: 4.61 },
    { id: "mm2.5", label: "2.5 mm²", group: "mm²", ohmPerKm: 7.41 },
    { id: "mm1.5", label: "1.5 mm²", group: "mm²", ohmPerKm: 12.1 },
    { id: "mm1", label: "1.0 mm²", group: "mm²", ohmPerKm: 18.1 },
    { id: "mm0.75", label: "0.75 mm²", group: "mm²", ohmPerKm: 24.5 },
    { id: "mm0.5", label: "0.5 mm²", group: "mm²", ohmPerKm: 36.0 }
  ];

  function ohmPerMetreFrom1000ft(ohmPer1000ft) { return ohmPer1000ft / 304.8; }
  function ohmPerMetreFromKm(ohmPerKm) { return ohmPerKm / 1000; }

  // Ohms per metre of one conductor at 20 C for a table entry.
  function wireOhmPerMetre(id) {
    for (var i = 0; i < WIRES.length; i++) {
      if (WIRES[i].id === id) {
        var w = WIRES[i];
        return w.ohmPer1000ft !== undefined
          ? ohmPerMetreFrom1000ft(w.ohmPer1000ft)
          : ohmPerMetreFromKm(w.ohmPerKm);
      }
    }
    return NaN;
  }

  // Copper resistance at temperature T from its 20 C value.
  function tempCorrect(ohm20, tempC) {
    return ohm20 * (1 + COPPER_TEMP_COEFF * (tempC - 20));
  }

  // groups: [{ qty, watts }]. Returns the summed tap load in watts.
  function totalTapWatts(groups) {
    var sum = 0;
    for (var i = 0; i < groups.length; i++) {
      var q = Number(groups[i].qty), w = Number(groups[i].watts);
      if (isFinite(q) && isFinite(w) && q > 0 && w > 0) { sum += q * w; }
    }
    return sum;
  }

  function totalSpeakers(groups) {
    var n = 0;
    for (var i = 0; i < groups.length; i++) {
      var q = Number(groups[i].qty);
      if (isFinite(q) && q > 0) { n += q; }
    }
    return n;
  }

  /*
    Inputs (all numbers):
      lineVolts          nominal line voltage: 25, 70.7 or 100
      tapWatts           sum of speaker tap settings, W
      insertionLossDb    transformer insertion loss allowance, dB
      headroomPct        amplifier headroom, percent
      ampWatts           rated amplifier power to check against, W (0 or NaN = no check)
      lengthM            one-way cable length, metres
      ohmPerMetre20      resistance of ONE conductor, ohms per metre at 20 C
      tempC              conductor temperature, deg C
      targetLossDb       warn when cable loss is above this, dB
  */
  function calculate(inp) {
    var V = inp.lineVolts;
    var out = {};

    // Amplifier load
    out.lossFactor = Math.pow(10, inp.insertionLossDb / 10);
    out.lineWatts = inp.tapWatts * out.lossFactor;                    // power drawn from the line
    out.minAmpWatts = out.lineWatts * (1 + inp.headroomPct / 100);
    out.ampChecked = isFinite(inp.ampWatts) && inp.ampWatts > 0;
    out.ampPass = out.ampChecked ? inp.ampWatts >= out.minAmpWatts : null;
    out.ampLoadPct = out.ampChecked ? (out.lineWatts / inp.ampWatts) * 100 : NaN;
    out.ampSpareWatts = out.ampChecked ? inp.ampWatts - out.minAmpWatts : NaN;

    // Load impedance, all speakers treated as one load at the far end
    out.loadOhms = out.lineWatts > 0 ? (V * V) / out.lineWatts : Infinity;

    // Cable
    out.ohmPerMetre = tempCorrect(inp.ohmPerMetre20, inp.tempC);
    out.loopOhms = 2 * inp.lengthM * out.ohmPerMetre;                 // out and back
    if (out.lineWatts > 0) {
      out.totalOhms = out.loadOhms + out.loopOhms;
      out.amps = V / out.totalOhms;
      out.dropVolts = out.amps * out.loopOhms;
      out.dropPct = (out.dropVolts / V) * 100;
      out.loadVolts = V - out.dropVolts;
      out.cableWatts = out.amps * out.amps * out.loopOhms;
      out.deliveredWatts = out.amps * out.amps * out.loadOhms;
      out.lossDb = 20 * Math.log10(out.totalOhms / out.loadOhms);
      out.powerLossPct = (1 - out.deliveredWatts / out.lineWatts) * 100;
      // Longest one-way run that stays inside the target loss with this cable
      var maxLoop = out.loadOhms * (Math.pow(10, inp.targetLossDb / 20) - 1);
      out.maxLengthM = out.ohmPerMetre > 0 ? maxLoop / (2 * out.ohmPerMetre) : Infinity;
      out.lossOver = out.lossDb > inp.targetLossDb;
    } else {
      out.totalOhms = Infinity; out.amps = 0; out.dropVolts = 0; out.dropPct = 0;
      out.loadVolts = V; out.cableWatts = 0; out.deliveredWatts = 0; out.lossDb = 0;
      out.powerLossPct = 0; out.maxLengthM = Infinity; out.lossOver = false;
    }
    return out;
  }

  return {
    FT_PER_M: FT_PER_M,
    COPPER_TEMP_COEFF: COPPER_TEMP_COEFF,
    WIRES: WIRES,
    ohmPerMetreFrom1000ft: ohmPerMetreFrom1000ft,
    ohmPerMetreFromKm: ohmPerMetreFromKm,
    wireOhmPerMetre: wireOhmPerMetre,
    tempCorrect: tempCorrect,
    totalTapWatts: totalTapWatts,
    totalSpeakers: totalSpeakers,
    calculate: calculate
  };
});
