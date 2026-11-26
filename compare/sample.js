// Made-up sample lists for the "Try the sample" button. Every maker, model and
// room here is invented. The text is tab-separated, the same as cells copied
// from Excel. It lives in a .js file (not .csv) so the page can load it when
// opened straight from disk.
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.ELC_SAMPLE = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  function sheet(rows) {
    return rows.map(function (r) { return r.join("\t"); }).join("\n") + "\n";
  }
  var HEAD = ["Manufacturer", "Model", "Part Number", "Qty", "Description", "Notes"];

  var a = sheet([
    ["Example project equipment list, revision A"],
    HEAD,
    ["Boardroom 201"],
    ["Audio"],
    ["Example Audio", "CM-40", "EA-CM40", "2", "Ceiling microphone", ""],
    ["Example Audio", "C6-T", "EA-C6T", "2", "Ceiling speaker", "front pair"],
    ["Example Audio", "C6-T", "EA-C6T", "2", "Ceiling speaker", "rear pair"],
    ["Example Audio", "DSP-8", "EA-DSP8", "1", "Audio processor, 8 channel", ""],
    ["Video"],
    ["Sample Display Co", "65U", "SD-65U", "1", "65\" display", ""],
    ["Generic Mounts", "WM-L", "GM-WML", "1", "Wall mount, large", ""],
    ["Demo Control", "TP-7", "DC-TP7", "1", "Touch panel, 7 in", ""],
    ["Training 105"],
    ["Audio"],
    ["Example Audio", "C6-T", "EA-C6T", "6", "Ceiling speaker", ""],
    ["Example Audio", "AMP-120", "EA-AMP120", "1", "Amplifier, 120 W", ""],
    ["Video"],
    ["Sample Display Co", "PJ-5K", "SD-PJ5K", "1", "Projector", ""],
    ["Sample Display Co", "SCR-120", "SD-SCR120", "1", "Projection screen, 120 in", ""],
    ["", "", "", "1", "Cable and connectors allowance", ""],
    ["Rack 1"],
    ["Control"],
    ["Demo Control", "CP-3", "DC-CP3", "1", "Control processor", ""],
    ["Placeholder Power", "PS-24", "PS24-A", "1", "Power supply", ""],
    ["Placeholder Power", "PDU-8", "PP-PDU8", "2", "Power strip, 8 outlet", ""],
    ["Network"],
    ["Demo Control", "SW-8", "DC-SW8", "1", "Network switch, 8 port", ""]
  ]);

  var b = sheet([
    ["Example project equipment list, revision B"],
    HEAD,
    ["Boardroom 201"],
    ["Audio"],
    ["Example Audio", "CM-40", "EA-CM40", "2", "Ceiling microphone", ""],
    ["Example Audio", "C6-T", "EA-C6T", "2", "Ceiling speaker", "front pair"],
    ["Example Audio", "C6-T", "EA-C6T", "2", "Ceiling speaker", "rear pair"],
    ["Example Audio", "C6-T", "EA-C6T", "2", "Ceiling speaker", "side pair"],
    ["Example Audio", "DSP-12", "EA-DSP12", "1", "Audio processor, 12 channel", ""],
    ["Video"],
    ["Sample Display Co", "75U", "SD-75U", "1", "75\" display", ""],
    ["Generic Mounts", "WM-L", "GM-WML", "1", "Wall mount, large", ""],
    ["Demo Control", "TP-7", "DC-TP7", "1", "Touch panel, 7 in, white", ""],
    ["Training 105"],
    ["Audio"],
    ["Example Audio", "C6-T", "EA-C6T", "6", "Ceiling speaker", ""],
    ["Example Audio", "AMP-120", "EA-AMP120", "1", "Amplifier, 120 W", ""],
    ["Video"],
    ["Sample Display Co", "PJ-5K", "SD-PJ5K", "1", "Projector", ""],
    ["Sample Display Co", "SCR-120", "SD-SCR120", "1", "Projection screen, 120 in", ""],
    ["", "", "", "2", "Cable and connectors allowance", ""],
    ["", "", "", "3", "", "to be confirmed"],
    ["Huddle 110"],
    ["Video"],
    ["Sample Display Co", "55U", "SD-55U", "1", "55\" display", ""],
    ["Generic Mounts", "WM-M", "GM-WMM", "1", "Wall mount, medium", ""],
    ["Rack 1"],
    ["Control"],
    ["Demo Control", "CP-3", "DC-CP3", "1", "Control processor", ""],
    ["Placeholder Power", "PS-24", "PS24-B", "1", "Power supply", ""],
    ["Placeholder Power", "PDU-8", "PP-PDU8", "3", "Power strip, 8 outlet", ""]
  ]);

  return { a: a, b: b };
});
