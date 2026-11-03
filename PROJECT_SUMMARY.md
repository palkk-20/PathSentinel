# Project Summary - Campus Crisis Navigator

## 1. Problem
Students need the fastest way between campus buildings, and that route can become unusable when a road is
flooded, under construction, crowded or on fire. The system must warn users and reroute immediately.

## 2. Campus model
The campus is a weighted undirected graph. Buildings are vertices (11 by default) and roads are edges
(21 by default); the weight is the walking cost.

## 3. Algorithms
- **Floyd-Warshall (all-pairs shortest path):** O(V^3). Used for the shortest route, for rerouting from the
  current building, and for measuring a crisis' impact.
- **Depth-first search with backtracking:** lists alternative simple routes. It is capped at 40,000 calls so a
  large campus cannot freeze the browser (a proper k-shortest-paths method such as Yen's would be the next step).
- **Bridge detection (low-link DFS):** finds critical roads whose closure would split the campus.

## 4. Crisis handling
1. The admin activates a crisis from the Crisis Control Center (or one appears while a student walks, if enabled).
2. The road is marked closed (or slowed x3 for crowd-type crises) and the state is saved.
3. Every account on the device sees it; routes avoid it; a walker on that road is rerouted from the current building.
4. The crisis stays until the admin presses Resolve · reopen road. It can be activated again later.
5. For each live crisis the page shows how many routes it affects and how many places become unreachable.

## 5. Modules
Login/registration with roles (admin, student), route planner, live navigation (manual or auto-walk, voice
with mute), Crisis Control Center, Campus Setup editor, dark mode.

## 6. Files
`index.html`, `style.css`, `theme.css`, `script.js`, `README.md`, `PROJECT_SUMMARY.md`.

## 7. Limitations and future work
Browser-only storage (no server); client-side admin check; add a backend and real-time sync (WebSocket),
GPS positioning, and k-shortest-paths for alternatives.
