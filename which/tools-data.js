// The list behind "Which tool for this?". This is the only file to edit.
//
// HOW TO EDIT
//   One { ... } block per row. Copy a block, change the words, keep the commas.
//   group     must match one of the names in "groups" below, letter for letter.
//   task      what the designer is trying to do.
//   name, publisher, url   the tool. Links start with https://
//   does      what it does, in your own words, 14 words at most.
//   tags      any of: "maker" (one maker's products), "account", "email",
//             "download", "reference" (not a calculator), "own" (my own tool).
//             [] means free, in the browser, no sign-up.
//   checked   the date you last opened the link, as YYYY-MM-DD. After 6 months
//             the page adds "not rechecked recently" by itself.
//   why       one or two short sentences on why it is the pick.
//   alsoTry   the runners-up: { name, url, note } and, if needed, tags.
//   manual: true   the site refuses automated requests, so check-links.js
//             lists it for a click by hand instead of testing it.
//   expect    a word that should be in the page's title. check-links.js warns
//             when it is gone (the link may now show something else).
//
// After editing, run:  node which/which.test.js   and   node which/check-links.js

var WHICH_DATA = {

  // THE TWO GOOGLE FORM ADDRESSES, both on the next line. "" hides the controls. In reportBroken, the word TOOL_LINK is swapped for the tool's link.
  forms: { reportBroken: "", suggestTool: "" },

  groups: [
    "Display and projection",
    "Video signal and cabling",
    "Audio: loudspeakers and amplifiers",
    "Audio: microphones, acoustics, conversions",
    "Network",
    "Rack, power and heat",
    "Pathways and cable",
    "Drawing, documents and lookup"
  ],

  tools: [

    // ---------------------------------------------------------------- Display and projection
    {
      group: "Display and projection",
      task: "Display size and viewing distance",
      name: "DISCAS calculators",
      publisher: "AVIXA",
      url: "https://www.avixa.org/standards/discas-calculators/discas",
      expect: "Decision Making",
      does: "Farthest viewer, minimum image height or resolution, by the basic or analytical method.",
      tags: [],
      checked: "2026-11-26",
      why: "Published by the body that writes the display image size standard. No sign-up form was seen.",
      alsoTry: [
        { name: "Avria display size calculator", url: "https://avria.ai/tools/discas-display-size-calculator", note: "The same sizing job on a newer site." },
        { name: "The Tech Space display size calculator", url: "https://thetech.space/tools/display-size-calculator", note: "Cites the 2016 edition of the standard." },
        { name: "Avitly display size calculator", url: "https://avitly.com/free-tools/display-size-calculator", note: "Uses distance ÷ 6 and distance ÷ 4 rules of thumb, not the standard's method." },
        { name: "Almo ProAV calculators", url: "https://resources.almoproav.com/tools/calculator.aspx", note: "One page of general AV calculators." }
      ]
    },
    {
      group: "Display and projection",
      task: "Projector throw and lens",
      name: "Projection Calculator Pro",
      publisher: "ProjectorCentral",
      url: "https://www.projectorcentral.com/projection-calculator-pro.cfm",
      expect: "Projection Calculator",
      does: "Pick a projector model, get throw distance or image size across its zoom range.",
      tags: [],
      checked: "2026-11-26",
      why: "Covers many brands in one place and needs no account.",
      alsoTry: [
        { name: "Avitly projector throw calculator", url: "https://avitly.com/free-tools/projector-throw-calculator", note: "Another browser throw calculator." },
        { name: "Avria projector throw distance calculator", url: "https://avria.ai/tools/projector-throw-distance-calculator", note: "Works backwards to the throw ratio you need." }
      ]
    },
    {
      group: "Display and projection",
      task: "Projector brightness and screen surface",
      name: "Projection Planner 2.0",
      publisher: "Draper",
      url: "https://www.draperinc.com/projectionscreens/projectionplanneriframe.aspx",
      expect: "Projection Planner",
      does: "Seating, content, room light and projector in; image size and suitable screen surface out.",
      tags: ["maker"],
      checked: "2026-11-26",
      why: "Nothing neutral was found. The screen surfaces it suggests are Draper's."
    },
    {
      group: "Display and projection",
      task: "LED wall size, weight and power",
      name: "LED Wall Calculator",
      publisher: "Patchify",
      url: "https://patchify.app/tools/led-wall-calculator",
      expect: "LED Wall",
      does: "Panel and wall size to panel count, resolution, weight, power and rigging points.",
      tags: [],
      checked: "2026-11-26",
      why: "Not tied to one panel maker. It does not choose a pixel pitch from the viewing distance; no neutral tool found does both.",
      alsoTry: [
        { name: "Avitly video wall calculator", url: "https://avitly.com/free-tools/video-wall-calculator", note: "Another video wall sizing calculator." },
        { name: "Dynamo LED screen configurator", url: "https://dynamo-led-displays.co.uk/led-screen-configurator/", note: "A panel maker's configurator.", tags: ["maker"] },
        { name: "AV500 video wall sizer", url: "https://www.av500.io/tools/video-wall", note: "Video wall sizing from the AV500 tool set." }
      ]
    },
    {
      group: "Display and projection",
      task: "Display mounting height",
      name: "TV Mounting Height Calculator",
      publisher: "Omni Calculator",
      url: "https://www.omnicalculator.com/other/tv-mounting-height",
      expect: "Mounting Height",
      does: "Screen size, eye height and distance to centre and bottom-edge mounting height.",
      tags: [],
      checked: "2026-11-26",
      why: "Shows its formulas. It is written for living rooms, so treat the answer as a starting point."
    },
    {
      group: "Display and projection",
      task: "Wall protrusion limits (ADA) reference",
      name: "Protruding Objects guide",
      publisher: "U.S. Access Board",
      url: "https://www.access-board.gov/ada/guides/chapter-3-protruding-objects",
      expect: "Protruding",
      does: "The source to read for how far a display may project into a walkway.",
      tags: ["reference"],
      checked: "2026-11-26",
      why: "The official United States guide, straight from the agency."
    },
    {
      group: "Display and projection",
      task: "Camera field of view",
      name: "Camera field-of-view calculator",
      publisher: "Avria",
      url: "https://avria.ai/tools/camera-field-of-view-calculator",
      expect: "Field of View",
      does: "Viewing angle and distance to the width and height of the scene covered.",
      tags: [],
      checked: "2026-11-26",
      why: "Plain and not tied to a camera maker. The site says it launches fully in 2027, so it may change.",
      alsoTry: [
        { name: "Datavideo Room Designer", url: "https://roomdesigner.datavideo.com", note: "A camera maker's room layout tool.", tags: ["maker"] }
      ]
    },

    // ---------------------------------------------------------------- Video signal and cabling
    {
      group: "Video signal and cabling",
      task: "Video signal data rate",
      name: "8K Data Rate Calculator",
      publisher: "Extron",
      url: "https://www.extron.com/8Kdatarate",
      does: "Resolution, refresh rate, bit depth and chroma sampling to the video data rate.",
      tags: [],
      checked: "2026-11-26",
      manual: true,
      why: "A long-lived publisher, general maths that is not tied to its products, and no login seen.",
      alsoTry: [
        { name: "Pittwater video bandwidth", url: "https://www.pittwater.co/tools/video-bandwidth", note: "Also shows which HDMI, DisplayPort, SDI and Ethernet links can carry the signal." },
        { name: "Kramer bandwidth calculator", url: "https://www.kramerav.com/bandwidth-calculator/", note: "A bandwidth calculator on a maker's site." },
        { name: "AVPro / Murideo HDMI calculator", url: "https://www.avproglobal.com/pages/murideo-brand-hdmi-calculator", note: "Aimed at HDMI 2.1 questions." }
      ]
    },
    {
      group: "Video signal and cabling",
      task: "AV-over-IP video bandwidth",
      name: "AVoIP Bandwidth Calculator",
      publisher: "AV500",
      url: "https://www.av500.io/tools/bandwidth",
      expect: "Bandwidth",
      does: "List of streams checked against a switch link, with reserve and pass or fail.",
      tags: [],
      checked: "2026-11-26",
      why: "Not tied to one maker. No tool found covers every AV-over-IP format or links its figures to the vendor documents, so check the numbers you type in.",
      alsoTry: [
        { name: "Patchify NDI bandwidth calculator", url: "https://patchify.app/tools/ndi-bandwidth-calculator", note: "NDI® streams only." },
        { name: "Avitly bandwidth calculator", url: "https://avitly.com/free-tools/bandwidth-calculator", note: "Another bandwidth calculator." }
      ]
    },
    {
      group: "Video signal and cabling",
      task: "NDI® bandwidth figures (source)",
      name: "NDI bandwidth tables",
      publisher: "NDI",
      url: "https://docs.ndi.video/all/getting-started/white-paper/bandwidth",
      expect: "Bandwidth",
      does: "The publisher's own tables of Mbps by format, resolution and frame rate.",
      tags: ["reference"],
      checked: "2026-11-26",
      why: "The source document, so the figures come first hand."
    },
    {
      group: "Video signal and cabling",
      task: "HDBaseT™ distance (source)",
      name: "HDBaseT technology page",
      publisher: "HDBaseT Alliance",
      url: "https://hdbaset.org/hdbaset-technology/",
      expect: "HDBaseT",
      does: "Distance and resolution by specification version and cable category.",
      tags: ["reference"],
      checked: "2026-11-26",
      why: "The source document, so the figures come first hand."
    },

    // ---------------------------------------------------------------- Audio: loudspeakers and amplifiers
    {
      group: "Audio: loudspeakers and amplifiers",
      task: "Ceiling speaker spacing",
      name: "Ceiling speaker spacing calculator",
      publisher: "Avitly",
      url: "https://avitly.com/free-tools/spl-coverage-calculator",
      expect: "Ceiling Speaker",
      does: "Spacing, count and watts per speaker from ceiling height, coverage angle and target level.",
      tags: [],
      checked: "2026-11-26",
      why: "Works from any speaker's coverage angle. It does not draw the layout; no neutral tool found does.",
      alsoTry: [
        { name: "Biamp ceiling loudspeaker calculator", url: "https://support.biamp.com/Design_Tools/Ceiling_loudspeaker_calculator", note: "Detailed output, Biamp models only.", tags: ["maker"] },
        { name: "Extron ceiling speaker calculator", url: "https://www.extron.com/article/spkcalte", note: "Needs an Extron speaker model.", tags: ["maker"], manual: true },
        { name: "AtlasIED system tools", url: "https://www.atlasied.com/system-tools", note: "A hub page of that maker's design tools.", tags: ["maker"], manual: true },
        { name: "Almo ProAV calculators", url: "https://resources.almoproav.com/tools/calculator.aspx", note: "One page of general AV calculators." },
        { name: "EASE Address", url: "https://www.afmg.eu/en/ease-address", note: "From AFMG, the publisher of EASE Focus." }
      ]
    },
    {
      group: "Audio: loudspeakers and amplifiers",
      task: "Loudspeaker coverage modelling",
      name: "EASE Focus 3",
      publisher: "AFMG",
      url: "https://www.afmg.eu/en/ease-focus",
      expect: "EASE Focus",
      does: "Coverage prediction using speaker data files from over 100 brands.",
      tags: ["download"],
      checked: "2026-11-26",
      why: "Free and covers many brands. Single-brand modelling programs also exist from Meyer Sound, d&b audiotechnik, L-Acoustics, Bose and Martin Audio."
    },
    {
      group: "Audio: loudspeakers and amplifiers",
      task: "SPL at distance and amplifier power",
      name: "Sound System Calculators",
      publisher: "Crown (Harman)",
      url: "https://www.crownaudio.com/en-US/tools/calculators",
      does: "Amplifier power required, inverse square law and more, each with its equation.",
      tags: [],
      checked: "2026-11-26",
      manual: true,
      why: "General maths with the equation beside each calculator.",
      alsoTry: [
        { name: "JBL Professional sound system calculators", url: "https://jblpro.com/en-US/tools/calculators", note: "The same calculator set on JBL's site.", manual: true },
        { name: "Extron audio calculators", url: "https://www.extron.com/calculators/", note: "A set of audio calculators; several need an Extron model.", manual: true },
        { name: "Biamp amplifier power calculator", url: "https://support.biamp.com/Design_Tools/Amplifier_Power_Calculator", note: "Amplifier power calculator on Biamp's support site." },
        { name: "AtlasIED SPL calculator", url: "https://www.atlasied.com/splcalculator", note: "SPL calculator on a speaker maker's site.", manual: true }
      ]
    },
    {
      group: "Audio: loudspeakers and amplifiers",
      task: "70V/100V line and amplifier load",
      name: "70V/100V line and amplifier load calculator",
      publisher: "Mike Jarboe (this site)",
      url: "../70v/index.html",
      does: "Tap totals, headroom, amplifier check and cable voltage drop, formulas shown.",
      tags: ["own"],
      checked: "2026-11-26",
      why: "My own tool. The others opened each do one part of this; none found totals the taps, sizes the amplifier and checks cable loss in one place.",
      alsoTry: [
        { name: "K-array cable loss calculator", url: "https://software.k-array.com/tools/cable-loss-calculator", note: "Cable loss for 70V/100V or low-impedance lines." }
      ]
    },
    {
      group: "Audio: loudspeakers and amplifiers",
      task: "Speaker cable loss",
      name: "Cable Loss Calculator",
      publisher: "K-array",
      url: "https://software.k-array.com/tools/cable-loss-calculator",
      expect: "Cable Calculator",
      does: "Loss in dB, power lost and damping for low-impedance or 70V/100V lines.",
      tags: [],
      checked: "2026-11-26",
      why: "General maths, in AWG or mm², on a speaker maker's site.",
      alsoTry: [
        { name: "The Audio Stuff speaker cable calculator", url: "https://theaudiostuff.com/tools/speaker-cable-calculator/", note: "Shows its maths; low-impedance lines only." },
        { name: "70V/100V line and amplifier load calculator", url: "../70v/index.html", note: "For 70V/100V lines.", tags: ["own"] }
      ]
    },

    // ---------------------------------------------------------------- Audio: microphones, acoustics, conversions
    {
      group: "Audio: microphones, acoustics, conversions",
      task: "Gain before feedback (PAG/NAG)",
      name: "PAG/NAG Calculator",
      publisher: "Shure",
      url: "https://www.shure.com/en-US/support/tools/pag-nag-calculator",
      expect: "PAG/NAG",
      does: "Potential against needed acoustic gain from the standard distances and open mic count.",
      tags: [],
      checked: "2026-11-26",
      why: "General maths on a long-lived publisher's site.",
      alsoTry: [
        { name: "AV500 feedback calculator", url: "https://www.av500.io/tools/feedback-calc", note: "A feedback calculator from the AV500 tool set." },
        { name: "Almo ProAV calculators", url: "https://resources.almoproav.com/tools/calculator.aspx", note: "One page of general AV calculators." }
      ]
    },
    {
      group: "Audio: microphones, acoustics, conversions",
      task: "Wireless microphone frequency planning",
      name: "Wireless System Builder",
      publisher: "RF Venue",
      url: "https://wirelesssystembuilder.com",
      expect: "Wireless System Builder",
      does: "Frequency set around local TV stations for chosen mic models. US addresses; labelled beta.",
      tags: [],
      checked: "2026-11-26",
      why: "Covers several microphone brands. The accessories it suggests are RF Venue's. Shure's Wireless Workbench is a free download for larger jobs.",
      alsoTry: [
        { name: "Shure Frequency Finder", url: "https://www.shure.com/en-US/support/tools/frequency-finder", note: "United States only, Shure systems only.", tags: ["maker"] }
      ]
    },
    {
      group: "Audio: microphones, acoustics, conversions",
      task: "Reverberation time (RT60)",
      name: "RT60 calculator",
      publisher: "sengpielaudio",
      url: "https://sengpielaudio.com/calculator-RT60.htm",
      expect: "RT60",
      does: "Sabine RT60 from room size and surface materials by octave band, formula shown.",
      tags: [],
      checked: "2026-11-26",
      why: "Shows the formula. It has an old desktop layout, so it is awkward on a phone.",
      alsoTry: [
        { name: "The Tech Space room acoustics calculator", url: "https://thetech.space/tools/room-acoustics-calculator", note: "Quicker, and adds a speech-intelligibility rating; equations not shown." },
        { name: "Omni Calculator reverberation time", url: "https://www.omnicalculator.com/physics/reverberation-time", note: "Another RT60 calculator." }
      ]
    },
    {
      group: "Audio: microphones, acoustics, conversions",
      task: "Room modes",
      name: "Room Mode Calculator",
      publisher: "The Audio Stuff",
      url: "https://theaudiostuff.com/tools/room-mode-calculator/",
      expect: "Room Mode",
      does: "Mode frequencies and a pressure map, including non-rectangular rooms.",
      tags: [],
      checked: "2026-11-26",
      why: "Free for any kind of project, and no sign-up was seen."
    },
    {
      group: "Audio: microphones, acoustics, conversions",
      task: "dBu, dBV, volts, adding dB, delay",
      name: "Audio calculator index",
      publisher: "sengpielaudio",
      url: "https://sengpielaudio.com/Calculations03.htm",
      expect: "Audio calculations",
      does: "Dozens of single-purpose audio converters, each with its formula.",
      tags: [],
      checked: "2026-11-26",
      why: "Shows the formula on every page. It has an old desktop layout, so it is awkward on a phone.",
      alsoTry: [
        { name: "Extron audio calculators", url: "https://www.extron.com/calculators/", note: "Includes dB to volts and ratio calculators.", manual: true },
        { name: "Patchify dB calculator", url: "https://patchify.app/tools/db-calculator", note: "A quick dB converter." },
        { name: "Patchify speaker delay calculator", url: "https://patchify.app/tools/speaker-delay-calculator", note: "Distance to delay time." },
        { name: "RapidTables Ohm's law calculator", url: "https://www.rapidtables.com/calc/electric/ohms-law-calculator.html", note: "Plain Ohm's law." }
      ]
    },
    {
      group: "Audio: microphones, acoustics, conversions",
      task: "dB ratios and Ohm's law",
      name: "Sound System Calculators",
      publisher: "Crown (Harman)",
      url: "https://www.crownaudio.com/en-US/tools/calculators",
      does: "dB ratio and Ohm's law calculators with the equations shown.",
      tags: [],
      checked: "2026-11-26",
      manual: true,
      why: "The same page as the amplifier power pick, so one bookmark covers both."
    },
    {
      group: "Audio: microphones, acoustics, conversions",
      task: "Assistive listening receiver counts",
      name: "Accessibility calculator",
      publisher: "Listen Technologies",
      url: "https://listentech.com/accessibility_calculator/",
      expect: "Accessibility",
      does: "Seat count to minimum receivers and neck loops for ADA, California or Australia.",
      tags: [],
      checked: "2026-11-26",
      why: "General code maths on a maker's site. Check the answer against the code that applies to the project.",
      alsoTry: [
        { name: "Williams AV ADA and IBC calculator", url: "https://williamsav.com/hearing-compliance/", note: "Covers ADA and IBC counts." }
      ]
    },
    {
      group: "Audio: microphones, acoustics, conversions",
      task: "Room and system measurement",
      name: "REW (Room EQ Wizard)",
      publisher: "John Mulcahy",
      url: "https://www.roomeqwizard.com/",
      expect: "Room EQ Wizard",
      does: "Measures frequency response, decay and RT60 with a microphone and a computer.",
      tags: ["download"],
      checked: "2026-11-26",
      why: "Free and not tied to any maker's hardware."
    },

    // ---------------------------------------------------------------- Network
    {
      group: "Network",
      task: "Audio network bandwidth (Dante®)",
      name: "Dante Bandwidth Calculator",
      publisher: "Patchify",
      url: "https://patchify.app/tools/dante-calculator",
      expect: "Dante",
      does: "Channels and sample rate to Mbps and link use. Rough; no formulas shown.",
      tags: [],
      checked: "2026-11-26",
      why: "A quick estimate only. Nothing found covers AES67, Milan/AVB or Q-LAN, counts flows, or cites its sources.",
      alsoTry: [
        { name: "Dante Controller flow rules", url: "https://dev.audinate.com/GA/dante-controller/userguide/webhelp/content/fanout.htm", note: "Audinate's user guide page on flows.", tags: ["reference"] },
        { name: "Q-SYS Q-LAN bandwidth formula", url: "https://help.qsys.com/Content/Networking/Clocking_Audio_Video_Control.htm", note: "The Q-SYS help page that gives its bandwidth formula.", tags: ["reference"] }
      ]
    },
    {
      group: "Network",
      task: "Network link loading rule (source)",
      name: "How hard can I push a Dante network link?",
      publisher: "Audinate",
      url: "https://support.getdante.com/hc/en-gb/articles/5502403383711-How-hard-can-I-push-a-Dante-network-link",
      does: "The publisher's own rule of thumb for how full a link may run.",
      tags: ["reference"],
      checked: "2026-11-26",
      manual: true,
      why: "The source document, so the rule comes first hand."
    },
    {
      group: "Network",
      task: "Subnet planning",
      name: "Visual Subnet Calculator",
      publisher: "Open-source project",
      url: "https://visualsubnetcalc.com/",
      expect: "Subnet",
      does: "Split and join subnets visually, add notes, share by link.",
      tags: [],
      checked: "2026-11-26",
      why: "Open source, nothing to sign up for, and a plan can be passed on as a link.",
      alsoTry: [
        { name: "The Tech Space subnet calculator", url: "https://thetech.space/tools/subnet-calculator", note: "A single-subnet calculator." },
        { name: "calculator.net IP subnet calculator", url: "https://www.calculator.net/ip-subnet-calculator.html", note: "A plain subnet calculator." }
      ]
    },
    {
      group: "Network",
      task: "Device IP address schedule",
      name: "IP Address Generator",
      publisher: "AV500",
      url: "https://www.av500.io/tools/ip-generator",
      expect: "IP Address",
      does: "Define networks, add devices, get an IP address chart.",
      tags: [],
      checked: "2026-11-26",
      why: "The closest thing found to an AV address schedule. Saving a project is a paid feature."
    },
    {
      group: "Network",
      task: "PoE budget",
      name: "PoE Power Budget",
      publisher: "EngineersUniverse",
      url: "https://engineersuniverse.com/studios/physical-security/poe-power-budget",
      expect: "PoE",
      does: "Device groups, watts and cable runs summed against a switch budget, formulas shown.",
      tags: [],
      checked: "2026-11-26",
      why: "Shows its formulas. It handles one switch at a time.",
      alsoTry: [
        { name: "Avitly PoE budget calculator", url: "https://avitly.com/free-tools/poe-budget-calculator", note: "Another PoE budget calculator." },
        { name: "Patchify PoE calculator", url: "https://patchify.app/tools/poe-calculator", note: "Another PoE budget calculator." }
      ]
    },
    {
      group: "Network",
      task: "Switch setup for AV",
      name: "NETGEAR Engage",
      publisher: "NETGEAR",
      url: "https://www.netgear.com/business/solutions/engage-controller/",
      expect: "Engage",
      does: "Design and configure NETGEAR's AV switches.",
      tags: ["maker", "download"],
      checked: "2026-11-26",
      why: "Nothing neutral was found. Each tool sets up its own maker's switches, so use the one that matches the switch.",
      alsoTry: [
        { name: "Luminex Araneo", url: "https://www.luminex.be/products/software/araneo/", note: "The same job for Luminex switches.", tags: ["maker", "download"] }
      ]
    },

    // ---------------------------------------------------------------- Rack, power and heat
    {
      group: "Rack, power and heat",
      task: "Rack elevation",
      name: "Rack Builder",
      publisher: "AV500",
      url: "https://www.av500.io/tools/rack-builder",
      expect: "Rack Builder",
      does: "Type in make, model and rack units; front and rear faces; PDF out.",
      tags: [],
      checked: "2026-11-26",
      why: "Takes any maker's equipment. More than one rack is a paid feature. It does not add up weight, heat or power.",
      alsoTry: [
        { name: "Reference AV rack planner", url: "https://www.ref-av.com/av-rack-planner/", note: "Another browser rack planner." },
        { name: "PATCHBOX rack diagram", url: "https://patchbox.com/rack-diagram/", note: "An IT-style rack planner with generic blocks." },
        { name: "AVSnap", url: "https://avsnap.com/", note: "A free desktop program for AV drawings.", tags: ["download"] },
        { name: "Legrand AV 3D design tool", url: "https://designtool.legrandav.com/login", note: "Middle Atlantic racks only.", tags: ["maker", "account"] }
      ]
    },
    {
      group: "Rack, power and heat",
      task: "Heat load",
      name: "BTU / Power Calculator",
      publisher: "AV500",
      url: "https://www.av500.io/tools/power-btu",
      expect: "BTU",
      does: "Device list to watts, BTU per hour, amps and circuits, method shown.",
      tags: [],
      checked: "2026-11-26",
      why: "Shows its method. Its circuit figures are set up for 230 V supplies.",
      alsoTry: [
        { name: "Avitly rack heat calculator", url: "https://avitly.com/free-tools/rack-heat-calculator", note: "Adds an airflow figure." },
        { name: "RapidTables watts to BTU", url: "https://www.rapidtables.com/convert/power/Watt_to_BTU.html", note: "A plain watts to BTU per hour conversion." }
      ]
    },
    {
      group: "Rack, power and heat",
      task: "Power and circuit load (US voltages)",
      name: "AV Rack Power and Heat",
      publisher: "The Tech Space",
      url: "https://thetech.space/tools/av-rack-calculator",
      expect: "Rack",
      does: "Equipment list to BTU per hour, breaker and UPS guidance, with the 80% rule.",
      tags: [],
      checked: "2026-11-26",
      why: "Has 120 V and 208 V settings (it opens at 230 V, so change that first) and applies the 80 percent continuous-load rule."
    },
    {
      group: "Rack, power and heat",
      task: "UPS sizing",
      name: "UPS Selector",
      publisher: "Schneider Electric (APC)",
      url: "https://www.se.com/us/en/work/products/tools/ups_selector/",
      expect: "UPS Selector",
      does: "Load and runtime to matching APC models.",
      tags: ["maker"],
      checked: "2026-11-26",
      why: "Nothing neutral was found for UPS runtime. The results are APC models only."
    },

    // ---------------------------------------------------------------- Pathways and cable
    {
      group: "Pathways and cable",
      task: "Conduit fill",
      name: "Conduit fill calculator",
      publisher: "Avitly",
      url: "https://avitly.com/free-tools/conduit-fill-calculator",
      expect: "Conduit",
      does: "Cable count and diameter against conduit or trunking, formulas shown; metric.",
      tags: [],
      checked: "2026-11-26",
      why: "Shows its formulas. Like every tool found, its preset cable sizes are typical figures, so type in the diameter from the datasheet.",
      alsoTry: [
        { name: "AV500 conduit fill", url: "https://www.av500.io/tools/conduit-fill", note: "More cable rows, and a jam ratio check." },
        { name: "VIOX conduit fill calculator", url: "https://tools.viox.com/conduit-fill-calculator/", note: "United States trade sizes, two cable groups." },
        { name: "Southwire conduit fill calculator", url: "https://www.southwire.com/calculator-conduit", note: "A power wire list, with a custom diameter option." }
      ]
    },
    {
      group: "Pathways and cable",
      task: "Cable tray fill",
      name: "Cable Tray Fill Calculator",
      publisher: "VIOX Electric",
      url: "https://tools.viox.com/cable-tray-fill-calculator/",
      expect: "Cable Tray",
      does: "Tray fill and cable weight.",
      tags: [],
      checked: "2026-11-26",
      why: "General maths on a maker's site."
    },
    {
      group: "Pathways and cable",
      task: "Cable pulling tension",
      name: "Cable Pulling Tension Calculator",
      publisher: "VIOX Electric",
      url: "https://tools.viox.com/cable-pulling-tension-calculator/",
      expect: "Pulling Tension",
      does: "Pulling tension for one straight section and one bend.",
      tags: [],
      checked: "2026-11-26",
      why: "General maths on a maker's site. A longer route has to be worked a section at a time."
    },
    {
      group: "Pathways and cable",
      task: "Cable length for ordering",
      name: "Cable length calculator",
      publisher: "Avitly",
      url: "https://avitly.com/free-tools/cable-length-calculator",
      expect: "Cable Length",
      does: "Run, drops, slack and service loops to an order length; metric.",
      tags: [],
      checked: "2026-11-26",
      why: "Simple and needs no account."
    },
    {
      group: "Pathways and cable",
      task: "Cable labels",
      name: "Cable Label Generator",
      publisher: "Patchify",
      url: "https://patchify.app/tools/cable-label-generator",
      expect: "Label",
      does: "Source, destination and number to printable labels, with CSV export.",
      tags: [],
      checked: "2026-11-26",
      why: "Prints labels and exports the list without an account."
    },
    {
      group: "Pathways and cable",
      task: "Voltage drop, low-voltage runs",
      name: "Voltage drop calculator",
      publisher: "Avitly",
      url: "https://avitly.com/free-tools/voltage-drop-calculator",
      expect: "Voltage Drop",
      does: "Volts, amps, length and conductor size to voltage drop, formulas shown.",
      tags: [],
      checked: "2026-11-26",
      why: "Shows its formulas."
    },
    {
      group: "Pathways and cable",
      task: "Voltage drop, mains wiring",
      name: "Voltage Drop Calculator",
      publisher: "Southwire",
      url: "https://www.southwire.com/calculator-vdrop",
      expect: "Voltage Drop",
      does: "Conductor size or maximum distance for power circuits.",
      tags: [],
      checked: "2026-11-26",
      why: "General maths from a wire maker. The local electrical code still applies."
    },
    {
      group: "Pathways and cable",
      task: "Fibre loss budget",
      name: "Loss Budget Calculator",
      publisher: "Fiber Optic Association",
      url: "https://www.thefoa.org/tech/ref/Loss_Budget/Loss_Budget.htm",
      expect: "Loss Budget",
      does: "Length, splices and connectors to total link loss.",
      tags: [],
      checked: "2026-11-26",
      why: "From a trade association, not a cable maker."
    },

    // ---------------------------------------------------------------- Drawing, documents and lookup
    {
      group: "Drawing, documents and lookup",
      task: "Schematic and signal-flow drawing",
      name: "draw.io",
      publisher: "draw.io Ltd",
      url: "https://www.drawio.com/",
      expect: "draw.io",
      does: "General diagram editor, online or desktop; your files stay with you.",
      tags: [],
      checked: "2026-11-26",
      why: "Free with no account, and the drawing files stay on your own computer or storage.",
      alsoTry: [
        { name: "AVSnap", url: "https://avsnap.com/", note: "A free desktop program made for AV drawings.", tags: ["download"] }
      ]
    },
    {
      group: "Drawing, documents and lookup",
      task: "Compare two equipment lists",
      name: "Equipment list compare",
      publisher: "Mike Jarboe (this site)",
      url: "../compare/index.html",
      does: "Paste two revisions, get what was added, removed and changed.",
      tags: ["own"],
      checked: "2026-11-26",
      why: "My own tool. Nothing is uploaded; the lists stay in your browser."
    },
    {
      group: "Drawing, documents and lookup",
      task: "Display mount finder",
      name: "MountFinder",
      publisher: "Legrand AV (Chief, Sanus)",
      url: "https://www.legrandav.com/mountfinder_results",
      expect: "MountFinder",
      does: "Match a display to that maker's mounts.",
      tags: ["maker"],
      checked: "2026-11-26",
      why: "Nothing neutral was found. Whether it needs an account was not confirmed."
    },
    {
      group: "Drawing, documents and lookup",
      task: "Product lookup",
      name: "AV-iQ",
      publisher: "Emerald X",
      url: "https://www.av-iq.com/",
      does: "Product directory by category, maker and model.",
      tags: [],
      checked: "2026-11-26",
      manual: true,
      why: "Covers many makers. Whether full details need an account was not confirmed."
    }
  ]
};
