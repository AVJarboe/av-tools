# av-tools

Free, open-source, vendor-neutral calculators and documentation generators for
AV designers, techs and project engineers. Every formula is published, every
tool works offline as plain HTML/JS, and fixes are welcome.

Hosted on GitHub Pages as one hub.

| Path | Tool | Status |
|---|---|---|
| `/70v` | 70V/100V line & amplifier load calculator + voltage drop | available |
| `/compare` | Equipment list compare: what changed between two revisions | available |
| `/which` | Which tool for this? One free tool per AV design task, checked and dated | available |
| `/dante` | Dante® flow & bandwidth planner + IT port/QoS brief | available |
| `/labels` | Cable label & schedule generator (aligned with AVIXA F501.01) | planned |
| `/ipvlan` | Device IP schedule & VLAN planner | planned |
| `/rack` | Rack elevation builder with heat/power roll-up | planned |

## Checking the maths

Each tool keeps its calculations in a `calc.js` file with hand-worked test
cases beside it. For the 70V/100V calculator, open `70v/selftest.html` in a
browser, or run `node 70v/calc.test.js` if you have Node.js. The equipment
list compare keeps its logic in `compare/compare.js`, with
`compare/selftest.html` and `node compare/compare.test.js` the same way. The
Dante flow planner does the same with `dante/selftest.html` and
`node dante/calc.test.js`; its vendor figures and their source links are in
`dante/data.js`.

The "Which tool for this?" index links to other people's tools, which were
opened and dated but not tested for accuracy. Its whole list is in
`which/tools-data.js`. `which/selftest.html` or `node which/which.test.js`
checks the list and the page's rules, and `node which/check-links.js` requests
every link and prints the ones that need a look.

## Disclaimer

For preliminary design and educational use only. Results are estimates based on
published formulas and user inputs. Verify against manufacturer data, applicable
codes (e.g., NEC and local amendments) and project requirements. Not a
substitute for review by a qualified engineer. No warranty; use at your own risk.

## Standards and trademarks

AVIXA standards are cited by number and title only; no standards text or tables
are reproduced. Tools are "aligned with", not "certified to", any standard.
Dante® is a trademark of Audinate. NDI® is a trademark of Vizrt. HDBaseT™ is a
trademark of the HDBaseT Alliance. This project is not affiliated with or
endorsed by any of them.

## License

MIT. See `LICENSE`.
