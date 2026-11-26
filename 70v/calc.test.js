// Self-check for calc.js. The expected numbers below were worked by hand
// (Ohm's law and P = V^2 / Z), not produced by the code under test.
//
// Run either way:
//   node 70v/calc.test.js        (from the repo root, needs Node.js)
//   open 70v/selftest.html       (in any browser, no install needed)
(function (root) {
  "use strict";
  var CV = (typeof module === "object" && module.exports) ? require("./calc.js") : root.CV;
  var results = [];

  function near(name, got, want, relTol) {
    var tol = relTol === undefined ? 1e-4 : relTol;
    var ok = Math.abs(got - want) <= Math.abs(want) * tol;
    results.push({ name: name, ok: ok, got: got, want: want });
  }
  function same(name, got, want) {
    results.push({ name: name, ok: got === want, got: got, want: want });
  }
  function base(over) {
    var inp = { lineVolts: 70.7, tapWatts: 100, insertionLossDb: 0, headroomPct: 0,
      ampWatts: 0, lengthM: 0, ohmPerMetre20: CV.ohmPerMetreFrom1000ft(4.016),
      tempC: 20, targetLossDb: 0.5 };
    for (var k in over) { inp[k] = over[k]; }
    return inp;
  }

  // Case 1: amplifier sizing.
  // 12 x 5 W + 4 x 10 W = 100 W of taps. 1 dB insertion loss = x 10^0.1 = x 1.258925
  // -> 125.8925 W drawn from the line. 20 % headroom -> 151.071 W minimum amplifier.
  var taps = CV.totalTapWatts([{ qty: 12, watts: 5 }, { qty: 4, watts: 10 }]);
  same("1 tap total, W", taps, 100);
  same("1 speaker count", CV.totalSpeakers([{ qty: 12, watts: 5 }, { qty: 4, watts: 10 }]), 16);
  var r1 = CV.calculate(base({ tapWatts: taps, insertionLossDb: 1, headroomPct: 20, ampWatts: 250 }));
  near("1 line load, W", r1.lineWatts, 125.8925);
  near("1 minimum amplifier, W", r1.minAmpWatts, 151.071);
  same("1 250 W amplifier passes", r1.ampPass, true);
  near("1 amplifier loading, %", r1.ampLoadPct, 50.357);
  var r1b = CV.calculate(base({ tapWatts: taps, insertionLossDb: 1, headroomPct: 20, ampWatts: 150 }));
  same("1 150 W amplifier fails", r1b.ampPass, false);

  // Case 2: 70.7 V, 100 W line load, a cable of 4.016 ohm/1000 ft, 500 ft one way, 20 C.
  // Z = 70.7^2 / 100 = 49.9849 ohm. Loop R = 2 x 500 x 4.016 / 1000 = 4.016 ohm.
  // I = 70.7 / 54.0009 = 1.309237 A. Drop = I x R = 5.25790 V (7.4369 %).
  // Cable loss = I^2 R = 6.88384 W. At speakers = I^2 Z = 85.6792 W.
  // dB = 20 log10(54.0009 / 49.9849) = 0.67124 dB.
  // 0.5 dB limit: R max = 49.9849 x (10^0.025 - 1) = 2.96179 ohm -> 368.75 ft.
  var r2 = CV.calculate(base({ lengthM: 500 * 0.3048 }));
  near("2 load impedance, ohm", r2.loadOhms, 49.9849);
  near("2 loop resistance, ohm", r2.loopOhms, 4.016);
  near("2 line current, A", r2.amps, 1.309237);
  near("2 voltage drop, V", r2.dropVolts, 5.25790);
  near("2 voltage drop, %", r2.dropPct, 7.4369);
  near("2 voltage at speakers, V", r2.loadVolts, 65.44210);
  near("2 power lost in cable, W", r2.cableWatts, 6.88384);
  near("2 power at speakers, W", r2.deliveredWatts, 85.6792);
  near("2 loss, dB", r2.lossDb, 0.67124);
  near("2 power reduction at speakers, %", r2.powerLossPct, 14.3208);
  near("2 max run for 0.5 dB, ft", r2.maxLengthM / 0.3048, 368.75);
  same("2 over the 0.5 dB target", r2.lossOver, true);

  // Case 3: 100 V, 60 W, 1.5 mm2 (12.1 ohm/km), 100 m one way.
  // Z = 10000 / 60 = 166.6667 ohm. Loop R = 2 x 100 x 0.0121 = 2.42 ohm.
  // I = 100 / 169.0867 = 0.591413 A. Drop = 1.431218 V. dB = 0.12521.
  var r3 = CV.calculate(base({ lineVolts: 100, tapWatts: 60, lengthM: 100,
    ohmPerMetre20: CV.wireOhmPerMetre("mm1.5") }));
  near("3 load impedance, ohm", r3.loadOhms, 166.6667);
  near("3 loop resistance, ohm", r3.loopOhms, 2.42);
  near("3 line current, A", r3.amps, 0.591413);
  near("3 voltage drop, V", r3.dropVolts, 1.431218);
  near("3 loss, dB", r3.lossDb, 0.12521);
  same("3 inside the 0.5 dB target", r3.lossOver, false);

  // Case 4: 25 V, 50 W, a cable of 6.385 ohm/1000 ft, 200 ft one way.
  // Z = 625 / 50 = 12.5 ohm. Loop R = 2 x 200 x 6.385 / 1000 = 2.554 ohm.
  // I = 25 / 15.054 = 1.660688 A. Drop = 4.241397 V (16.9656 %). dB = 1.6148.
  var r4 = CV.calculate(base({ lineVolts: 25, tapWatts: 50, lengthM: 200 * 0.3048,
    ohmPerMetre20: CV.ohmPerMetreFrom1000ft(6.385) }));
  near("4 load impedance, ohm", r4.loadOhms, 12.5);
  near("4 loop resistance, ohm", r4.loopOhms, 2.554);
  near("4 line current, A", r4.amps, 1.660688);
  near("4 voltage drop, V", r4.dropVolts, 4.241397);
  near("4 loss, dB", r4.lossDb, 1.6148);

  // Case 5: temperature. 12.1 ohm/km at 50 C = 12.1 x (1 + 0.00393 x 30) = 13.52659.
  near("5 1.5 mm2 at 50 C, ohm/km", CV.tempCorrect(12.1, 50), 13.52659);
  same("5 no change at 20 C", CV.tempCorrect(12.1, 20), 12.1);

  // Case 6: the AWG table against first principles.
  // Diameter (inches) = 0.005 x 92^((36 - n) / 39); annealed copper standard
  // resistivity = 0.017241 ohm mm2 / m at 20 C. The handbook prints 3 figures and
  // rounds the diameters, so the table must agree within 0.6 %.
  [10, 12, 14, 16, 18, 20, 22, 24].forEach(function (n) {
    var dMm = 0.005 * Math.pow(92, (36 - n) / 39) * 25.4;
    var area = Math.PI * dMm * dMm / 4;
    var per1000ft = (0.017241 / area) * 304.8;
    near("6 " + n + " AWG table vs formula, ohm/1000 ft",
      CV.wireOhmPerMetre("awg" + n) * 304.8, per1000ft, 6e-3);
  });

  // Case 8: table lookups return the printed source values.
  near("8 14 AWG lookup, ohm/1000 ft", CV.wireOhmPerMetre("awg14") * 304.8, 2.52, 1e-9);
  near("8 16 AWG lookup, ohm/1000 ft", CV.wireOhmPerMetre("awg16") * 304.8, 4.02, 1e-9);
  near("8 2.5 mm2 lookup, ohm/km", CV.wireOhmPerMetre("mm2.5") * 1000, 7.41, 1e-9);
  same("8 unknown size gives no number", isNaN(CV.wireOhmPerMetre("nope")), true);

  // Case 7: no speakers entered gives zeros, not errors.
  var r7 = CV.calculate(base({ tapWatts: 0, lengthM: 100 }));
  same("7 zero load, zero current", r7.amps, 0);
  same("7 zero load, zero loss", r7.lossDb, 0);

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
