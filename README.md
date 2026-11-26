# av-tools

Free, open-source, vendor-neutral calculators and documentation generators for
AV designers, techs and project engineers. Every formula is published, every
tool works offline as plain HTML/JS, and fixes are welcome.

Hosted on GitHub Pages as one hub.

| Path | Tool | Status |
|---|---|---|
| `/70v` | 70V/100V line & amplifier load calculator + voltage drop | available |
| `/dante` | Dante/AES67 bandwidth & flow planner + IT port/QoS sheet | next |
| `/labels` | Cable label & schedule generator (aligned with AVIXA F501.01) | planned |
| `/ipvlan` | Device IP schedule & VLAN planner | planned |
| `/rack` | Rack elevation builder with heat/power roll-up | planned |

## Checking the maths

Each tool keeps its calculations in a `calc.js` file with hand-worked test
cases beside it. For the 70V/100V calculator, open `70v/selftest.html` in a
browser, or run `node 70v/calc.test.js` if you have Node.js.

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
