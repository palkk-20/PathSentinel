# Campus Crisis Navigator

A browser-based campus navigation system that finds the shortest walking route between buildings and
automatically reroutes when a crisis (flood, fire, construction, crowd...) blocks or slows a road.

## How to run
Open `index.html` in Chrome/Edge. The campus map uses Leaflet and OpenStreetMap tiles, so an internet connection is needed for the map (everything else works offline).
Default administrator login: `admin` / `admin123`. Students can register from the login screen.

## Features
- **Routing:** Floyd-Warshall gives the shortest route; a depth-first search (capped for safety) lists alternative routes.
- **Live navigation:** press Start Walking, then Next at each building, or use Auto-walk. Voice guidance can be muted.
- **Crisis Control Center (admin):** 12 ready-made crises. Each can be activated, stopped, fixed, edited or deleted, and new ones can be created.
- **Crisis persistence:** an active crisis stays closed for every account on the same device until the admin stops or fixes it.
- **Walking crisis (optional):** a crisis can appear while a student is walking. It is reported to the admin automatically and stays active. The admin can switch this off with the checkbox on the Crisis Control page.
- **Impact:** every live crisis shows how many routes it affects and how many places become unreachable.
- **Campus Setup:** add or remove buildings and roads, and test routes.
- **Dark mode** and a responsive layout.

## Crisis buttons
- **Resolve · reopen road:** ends the incident and opens the road. The same crisis can be activated again at any time (no locks).
- **Where students see it:** crises are NOT shown on the home screen. A student is warned only when a crisis is on their own route (after Find Routes and while walking), and the route is recalculated automatically.
- **Crisis cards** show whether a crisis closes or slows the road and flag *critical roads* (found with DFS bridge detection). Route cards show ✅ Clear route or 🐢 slow-road tags.

## Files
`index.html` (pages), `style.css` (base styles), `theme.css` (current look), `script.js` (all logic).

## Known limits (good to mention in a viva)
Data is stored in the browser (localStorage), so a crisis is shared between tabs and accounts on one device, not between different computers. A real deployment would need a server and a database. The admin check is also done in the browser.

## Extra features
- **Aurora theme** (theme2.css): indigo/cyan palette, coral used only for crises, light and dark mode.
- **⇄ Swap button** exchanges start and destination.
- **Crisis activity log** (admin): total activations, active now, average time to resolve, most affected road, recent history.
- **Nearest emergency exit** (students): one button finds the closest open way to the Emergency Exit with Floyd-Warshall, avoiding closed roads.
- **Saved routes** (students): save favourite start→destination pairs and open them with one tap.
- **Auto-resolve timer** (admin): crises can end automatically after 1, 5, 15 or 60 minutes (Crisis Control page).
- The activity log always matches the live crisis state, whichever way a crisis was started or ended.
- **Hide crises on the map** (admin switch on the Crisis Control page): crises stay active and roads stay closed, but nothing is drawn on the map and nothing is announced when a student plans a route. The student is planned along the old road, is warned only when walking up to the blocked road, and is then rerouted; that road then appears on the map.

## Campus map (AGC, Amritsar)
The map is a real Leaflet map (Street/OSM and Satellite layers, zoom and drag). The campus data now uses real AGC places taken from Google Maps screenshots: Main Gate, Amritsar Law College, ACET Cafeteria, Pharmacy Department, ACET Main Block, Central Library (ACET), AGC Main Ground, AGC Basketball Court, AGC Block, AGC Parking, AGC Staff Residency and ACET Park. The 12 crisis presets were rewritten for these places/roads.

**Needs verification on site:**
- Positions were read off screenshots assuming about zoom 18, so they are approximate (tens of metres). The Google Maps pin 31.5773702, 74.9903986 is the only exact coordinate used.
- Main Gate and Pharmacy Department are inferred from the route order (Main Gate, Law College, Cafeteria, Pharmacy, Main Block).
- Road weights are straight-line metres between places, not surveyed walking distances, and the road links are drawn between buildings, not traced along the footpaths.
- Fix any position with `📍 Place buildings` (drag onto the Satellite layer); positions are saved in the browser.
- Saved browser data from the old sample campus uses new storage keys, so the old sample data and reports are not loaded.

The map opens on the Satellite layer. When a building is dragged to its real spot with `📍 Place buildings`, the cost of every road touching it is recalculated as the real map distance in metres.

## Screenshots

<img width="1366" height="900" alt="1-login" src="https://github.com/user-attachments/assets/504a4138-4a36-4332-bdfc-f0bfedfff311" />

<img width="1366" height="900" alt="2-create-account" src="https://github.com/user-attachments/assets/6aa12660-2528-46f3-9ffe-0b1c0094c633" />

<img width="1366" height="900" alt="3-home" src="https://github.com/user-attachments/assets/98a15836-6128-427f-9efb-cd5ce61bbc0c" />

<img width="1590" height="956" alt="Screenshot 2026-11-03 190406" src="https://github.com/user-attachments/assets/e13deb84-065a-4d08-8051-6314c5d26198" />

<img width="1600" height="953" src="https://github.com/user-attachments/assets/d109faab-aa6e-4c95-8d48-9a25f84940c8" />

<img width="1601" height="956" src="https://github.com/user-attachments/assets/71e7c92b-7762-4e68-8fed-9c5f00c63313" />

<img width="1621" height="962" src="https://github.com/user-attachments/assets/f7cd79eb-0387-4b4c-bed7-4f073402c94e" />

<img width="1618" height="967" src="https://github.com/user-attachments/assets/da1a6976-86e1-4f2c-877f-da1ce4464a63" />

<img width="1366" height="900" alt="6-campus-setup" src="https://github.com/user-attachments/assets/29a1a76d-1a73-4c31-ae5e-6d4602491580" />

<img width="1366" height="900" alt="7-reports" src="https://github.com/user-attachments/assets/c4a1813a-20b2-4bd6-acfb-4054a8627b28" />
