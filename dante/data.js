// Every vendor figure the Dante flow planner uses, with the document it came from.
// All were read at the source on 2026-11-27. They are the vendor's published
// estimates and can change: recheck against the linked document before relying on one.
(function (root) {
  "use strict";
  var CHECKED = "2026-11-27";

  var SOURCES = {
    netadmin: {
      title: "Audinate, Dante Information for Network Administrators", rev: "v7.1, July 2026", checked: CHECKED,
      url: "https://www.getdante.com/wp-content/uploads/2026/07/Information-for-Network-Admins-v7.1.pdf",
      used: "Flow sizes, bandwidth per flow, addresses, ports and DSCP values."
    },
    techPaper: {
      title: "Audinate, Implementing Dante AV-over-IP from an IT Manager's Perspective", rev: "2022", checked: CHECKED,
      url: "https://go.audinate.com/hubfs/implementing-dante-AV-over-IP_technical%20paper-en.pdf",
      used: "Worked examples: 64 unicast channels = 16 flows, about 100 Mbps; a part-filled unicast flow still counts as about 6 Mbps."
    },
    fanout: {
      title: "Audinate, Dante Controller User Guide: Fanout", rev: "Dante Controller 4.18", checked: CHECKED,
      url: "https://dev.audinate.com/GA/dante-controller/userguide/webhelp/content/fanout.htm",
      used: "Channels per unicast and multicast flow."
    },
    mcConfig: {
      title: "Audinate, Dante Controller User Guide: Multicast Transmit Flow Configuration", rev: "Dante Controller 4.18", checked: CHECKED,
      url: "https://dev.audinate.com/GA/dante-controller/userguide/webhelp/content/multicast_transmit_flow_configuration.htm",
      used: "Maximum channels per multicast flow by device and firmware."
    },
    linkFaq: {
      title: "Audinate, How hard can I push a Dante network link?", rev: "updated 2026-04-29", checked: CHECKED,
      url: "https://support.getdante.com/hc/en-gb/articles/5502403383711",
      used: "The 70 % ceiling on any link."
    },
    portsFaq: {
      title: "Audinate, Which network ports does Dante use?", rev: "updated 2026-11-04", checked: CHECKED,
      url: "https://support.getdante.com/hc/en-gb/articles/5508285534239",
      used: "The full port and address table, including AES67."
    },
    dscpFaq: {
      title: "Audinate, How does Dante use DSCP / Diffserv priority values when configuring QoS?", rev: "updated 2026-05-05", checked: CHECKED,
      url: "https://support.getdante.com/hc/en-gb/articles/5508296234399",
      used: "DSCP table; software products do not mark their packets."
    },
    switchFaq: {
      title: "Audinate, What features are important when purchasing a switch?", rev: "updated 2026-11-04", checked: CHECKED,
      url: "https://support.getdante.com/hc/en-gb/articles/5508296230687",
      used: "Switch features: four queues, strict priority, EEE off."
    },
    igmpFaq: {
      title: "Audinate, Recommended IGMP snooping configuration for Dante", rev: "updated 2026-08-18", checked: CHECKED,
      url: "https://support.getdante.com/hc/en-gb/articles/6164509527327",
      used: "IGMP versions, one querier per VLAN, query interval and timeout."
    },
    rtp: {
      title: "Audinate, Dante Controller User Guide: RTP Config Tab", rev: "Dante Controller 4.18", checked: CHECKED,
      url: "https://dev.audinate.com/GA/dante-controller/userguide/webhelp/content/rtp_config_tab.htm",
      used: "AES67 flows: up to 8 channels, 48 or 96 kHz."
    },
    ultimo: {
      title: "Audinate, Dante Ultimo datasheet", rev: "v.0124", checked: CHECKED,
      url: "https://www.getdante.com/wp-content/uploads/2024/02/dante_ultimo_0224-en.pdf",
      used: "Ultimo flow and channel limits."
    },
    brooklyn3: {
      title: "Audinate, Dante Brooklyn 3 datasheet", rev: "v.0124", checked: CHECKED,
      url: "https://www.getdante.com/wp-content/uploads/2024/06/dante_brooklyn3.pdf",
      used: "Brooklyn 3 flow and channel limits."
    },
    ipcore: {
      title: "Audinate, Dante IP Core datasheet", rev: "v.0724", checked: CHECKED,
      url: "https://www.getdante.com/wp-content/uploads/2024/08/dante_ip-core.pdf",
      used: "IP Core flow and channel limits."
    },
    dvs: {
      title: "Audinate, Dante Virtual Soundcard datasheet", rev: "v.01.25", checked: CHECKED,
      url: "https://www.getdante.com/wp-content/uploads/2025/04/dante-virtual-soundcard_datasheet.pdf",
      used: "Dante Virtual Soundcard flow and channel limits."
    },
    via: {
      title: "Audinate, Dante Via User Guide 1.2: Specifications", rev: "2024", checked: CHECKED,
      url: "https://dev.audinate.com/GA/via/userguide-1-2/webhelp/content/specifications.htm",
      used: "Dante Via flow limits."
    }
  };

  // Flow limits by the Dante hardware or software inside a product. A product's own
  // datasheet wins over these: makers can ship fewer channels than the module allows.
  // chByRate: channels each way at up to 48 kHz, up to 96 kHz, up to 192 kHz.
  var DEVICE_TYPES = [
    { id: "custom", label: "Custom", group: "Any device", linkMbps: 1000 },
    { id: "ultimo2", label: "Ultimo 2×2", group: "Hardware module inside", txFlows: 2, rxFlows: 2, chByRate: [2, 2, 0], tx: 2, rx: 2, linkMbps: 100, src: "ultimo" },
    { id: "ultimo4", label: "Ultimo 4×4", group: "Hardware module inside", txFlows: 2, rxFlows: 2, chByRate: [4, 2, 0], tx: 4, rx: 4, linkMbps: 100, src: "ultimo" },
    { id: "brooklyn3", label: "Brooklyn 3", group: "Hardware module inside", txFlows: 32, rxFlows: 32, chByRate: [64, 32, 16], tx: 64, rx: 64, linkMbps: 1000, src: "brooklyn3" },
    { id: "ipcore", label: "IP Core", group: "Hardware module inside", txFlows: 128, rxFlows: 128, chByRate: [512, 256, 128], tx: 512, rx: 512, linkMbps: 1000, src: "ipcore" },
    { id: "dvs", label: "Dante Virtual Soundcard", group: "Software on a computer", txFlows: 16, rxFlows: 16, chByRate: [64, 32, 8], tx: 64, rx: 64, linkMbps: 1000, src: "dvs",
      note: "The datasheet says \"up to 16 flows\" without splitting send and receive; 16 each way is assumed." },
    { id: "dvspro", label: "Dante Virtual Soundcard Pro", group: "Software on a computer", txFlows: 64, rxFlows: 64, chByRate: [128, 128, 16], tx: 128, rx: 128, linkMbps: 1000, src: "dvs",
      note: "The datasheet says \"up to 64 flows\" without splitting send and receive; 64 each way is assumed." },
    { id: "via", label: "Dante Via", group: "Software on a computer", txFlows: 16, rxFlows: 16, chByRate: [48, 0, 0], tx: 48, rx: 48, linkMbps: 1000, src: "via",
      note: "48 kHz only." }
  ];

  var SAMPLE_RATES = [
    { hz: 44100, label: "44.1 kHz" }, { hz: 48000, label: "48 kHz" }, { hz: 88200, label: "88.2 kHz" },
    { hz: 96000, label: "96 kHz" }, { hz: 176400, label: "176.4 kHz" }, { hz: 192000, label: "192 kHz" }
  ];

  // Link fill marks. 70 % is Audinate's published ceiling. 50 % is this planner's own
  // early warning, not a vendor figure.
  var LINK = {
    warnPct: 50, failPct: 70, src: "linkFaq",
    why: "70 % is Audinate's ceiling for all traffic on a link, above which clock sync can suffer. 50 % is this planner's own early warning, because the estimate leaves out everything else on the network."
  };

  var PORTS = [
    { use: "Clock sync (PTP)", ports: "UDP 319, 320", addr: "224.0.1.129 to 224.0.1.132 (multicast)" },
    { use: "Multicast audio", ports: "UDP 4321", addr: "239.255.0.0/16 (multicast)" },
    { use: "Unicast audio", ports: "UDP 14336 to 15359", addr: "Device to device" },
    { use: "Device discovery (mDNS)", ports: "UDP 5353", addr: "224.0.0.251 (multicast)" },
    { use: "Control and monitoring", ports: "UDP 8700 to 8708", addr: "224.0.0.230 to 224.0.0.233 (multicast)" },
    { use: "Control and monitoring", ports: "UDP 8800", addr: "Device to device" },
    { use: "Audio control", ports: "UDP 4440, 4444, 4455", addr: "Device to device" },
    { use: "AES67 audio (RTP)", ports: "UDP 5004", addr: "239.69.0.0/16 (multicast)", when: "aes67" },
    { use: "AES67 discovery (SAP)", ports: "UDP 9875", addr: "239.255.255.255 (multicast)", when: "aes67" }
  ];

  var QOS_INTRO = "Dante hardware marks its own packets with the DSCP values below. Switches should trust those marks " +
    "and use strict priority queueing, clock first. Dante software on a computer (Virtual Soundcard, Via) does not mark its packets.";
  var QOS = [
    { priority: "High", use: "Time-critical clock (PTP) events", label: "CS7", value: "56 (0x38)" },
    { priority: "Medium", use: "Audio, PTP v2", label: "EF", value: "46 (0x2E)" },
    { priority: "Low", use: "Reserved", label: "CS1", value: "8 (0x08)" },
    { priority: "None", use: "Everything else", label: "Best effort", value: "0 (0x00)" }
  ];

  var SWITCH_NOTES = [
    { head: "Energy Efficient Ethernet (EEE, 802.3az, \"green Ethernet\"):", text: "off on every port that carries Dante. It upsets clock sync." },
    { head: "QoS:", text: "four queues, strict priority, trusting DSCP. Required wherever a 100 Mbps device or link is involved." },
    { head: "Links between switches:", text: "1 Gbps or faster." },
    { head: "IGMP snooping:", text: "IGMP v2 or v3, with exactly one querier on the VLAN. Audinate suggests a short query interval (about 30 s) and a long timeout (about 125 s). Never turn snooping on without a querier: multicast audio will drop out.", when: "multicast" },
    { head: "VLAN:", text: "all Dante devices that exchange audio sit in one VLAN and IP subnet, unless Dante Domain Manager is used to route between subnets." },
    { head: "PTP-aware switches", text: "are not needed. Dante carries its own clock." }
  ];

  var NOTES = [
    { head: "These are planning estimates, not measurements.", text: "Audinate publishes \"about 6 Mbps\" per unicast flow and \"about 1.5 Mbps\" per multicast channel, at 48 kHz and 24-bit. Real traffic depends on the latency setting and how full each flow is. Dante Controller shows the real figures once the system is running." },
    { head: "A unicast flow is counted as full.", text: "A flow carrying 1 channel is counted the same as one carrying 4. That follows Audinate's own worked example and leans high.", src: "techPaper" },
    { head: "Other sample rates are scaled, and that scaling is this planner's assumption.", text: "Bandwidth is multiplied by sample rate ÷ 48 kHz. Audinate publishes no figure for 96 or 192 kHz." },
    { head: "Multicast flow size depends on the device.", text: "Eight channels per flow works on everything. Newer devices can be set to 16, 32 or 64; devices on firmware older than 4.2 refuse more than 8, and Dante Virtual Soundcard cannot receive a flow of more than 8.", src: "mcConfig" },
    { head: "Multicast is counted whether or not anyone listens,", text: "because the sender transmits it either way. A listener is counted as receiving whole flows: asking for 2 channels of an 8-channel flow brings all 8." },
    { head: "Flow limits belong to the Dante module inside a product.", text: "The list covers modules whose current datasheet states a flow limit. For anything else (Brooklyn II, Broadway, Dante HC, AVIO adapters, Embedded Platform, PCIe cards) choose Custom and type the limits from the product's datasheet, or read them in Dante Controller under Device View." },
    { head: "Channel counts are a partial check.", text: "Receive channels are added up exactly. Transmit channels are only flagged when a single route asks for more than the device has, because the planner does not know which routes share channels." },
    { head: "Switch layout is simplified.", text: "Every switch is assumed to hang off one central switch. Daisy-chained switches, rings and Dante redundancy (a second, separate network) are not modelled: with redundancy, the secondary network carries a copy of the same load." },
    { head: "Only Dante audio is counted.", text: "Video, control traffic, clock packets and anything else sharing the network are left out. Dante video needs far more bandwidth and is not covered here." },
    { head: "When to use multicast.", text: "Audinate's documents suggest it when the same channels go to more than about two to four receivers (they differ on the number). Below that, unicast is simpler." }
  ];

  // A made-up training room.
  var EXAMPLE = {
    fields: { project: "", sampleRate: "48000", uplink: "1000", perFlow: "8", igmp: true, aes67: false },
    devices: [
      { id: "dsp", name: "DSP", type: "brooklyn3", qty: 1, switchName: "Rack switch", multicastChannels: 2 },
      { id: "mics", name: "Ceiling microphones", type: "custom", qty: 3, switchName: "Ceiling switch", multicastChannels: 0,
        custom: { txFlows: 16, rxFlows: 16, tx: 8, rx: 2, linkMbps: 1000 } },
      { id: "wl", name: "Wireless mic receiver", type: "ultimo4", qty: 1, switchName: "Rack switch", multicastChannels: 0 },
      { id: "amps", name: "Amplifiers", type: "custom", qty: 2, switchName: "Rack switch", multicastChannels: 0,
        custom: { txFlows: 32, rxFlows: 32, tx: 8, rx: 8, linkMbps: 1000 } },
      { id: "spk", name: "Powered ceiling speakers", type: "ultimo2", qty: 6, switchName: "Ceiling switch", multicastChannels: 0 },
      { id: "pc", name: "Recording PC", type: "dvs", qty: 1, switchName: "Rack switch", multicastChannels: 0 }
    ],
    routes: [
      { from: "mics", to: "dsp", channels: 8, mode: "unicast" },
      { from: "wl", to: "dsp", channels: 4, mode: "unicast" },
      { from: "dsp", to: "amps", channels: 8, mode: "unicast" },
      { from: "dsp", to: "spk", channels: 2, mode: "multicast" },
      { from: "dsp", to: "pc", channels: 16, mode: "unicast" }
    ]
  };

  root.DFDATA = {
    SOURCES: SOURCES, DEVICE_TYPES: DEVICE_TYPES, SAMPLE_RATES: SAMPLE_RATES, LINK: LINK, PORTS: PORTS,
    QOS_INTRO: QOS_INTRO, QOS: QOS, SWITCH_NOTES: SWITCH_NOTES, NOTES: NOTES, EXAMPLE: EXAMPLE,
    BRIEF_SRC: "netadmin", BRIEF_SRC2: "portsFaq"
  };
  if (typeof module === "object" && module.exports) { module.exports = root.DFDATA; }
})(typeof self !== "undefined" ? self : this);
