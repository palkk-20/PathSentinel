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

<img width="1366" height="900" alt="7-reports" src="https://github.com/user-attachments/assets/96645fe1-a0bc-46d9-b238-c9d67aa7bf4e" />
<img width="1366" height="900" alt="6-campus-setup" src="https://github.com/user-attachments/assets/b7c5f5a0-5a7f-4959-af9c-aa7a807ac0a6" />
<img width="1366" height="900" alt="5-navigator-dark" src="https://github.com/user-attachments/assets/e3c4863a-5747-4bba-ba0e-04ae2e2f50b6" />
<img width="1366" height="900" alt="4-navigator-routes" src="https://github.com/user-attachments/assets/95349aca-2e18-47bb-a9a1-8e4564c1a8ae" />
<img width="1366" height="900" alt="3-home" src="https://github.com/user-attachments/assets/a62502cd-dbf7-43e1-8b50-71248ae8c995" />
<img width="1366" height="900" alt="2-create-account" src="https://github.com/user-attachments/assets/d4f4d2a6-96ea-4b9d-a6b5-4c91bd99e222" />
<img width="1366" height="900" alt="1-login" src="https://github.com/user-attachments/assets/149aa8a4-9369-4da2-85c9-afcd00fd7f02" />

