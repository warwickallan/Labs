# E-018 — Classifications are a NESTED taxonomy (two levels in Vanilla)

- Captured: 2026-08-18 (session 2). Warwick flagged Classifications as key
  and pointed at the row expanders — each classification row carries two
  hidden hover-expanders (`PblExpand.row(...,'class')` and `...,'resource'`)
  revealing a **"Further classifications"** child grid (and a resources
  grid). Child grids embed hidden "ADD NEW" inline form templates (82 in
  the DOM once expanded — never opened/saved).
- Confidence: VERIFIED — OBSERVED. One child row of Lifts was obscured by a
  transient Cloudflare 502 during capture (noted below); Alarms' children
  were captured in the first expansion pass.

## The Vanilla classification tree (parent → children)

- **Alarms** → Disabled Alarm Call System · Fire Alarm System · Intruder
  Alarm Activation · Intruder Alarms · Panic Alarm System · Smoke Alarms
- **Boilers** → CHP · Expansion Vessels · Gas Condensing Boiler · Heating
  and Hot water · Water Only Boiler
- **Building Fabric** → Automatic Doors · Ceilings · Doors · Drainage
  Gullies · Drainage Rainwater Downpipes and Gutters · Fire Doors · Fixed
  Ladders · Flag Poles · Floor Finishes · Lightning Conductor · Lock ·
  Roller Shutters · Roof Covering · Shed · Walls · Windows
- **Car Park** → Audit · barrier · general · Lighting · line markings ·
  pothole *(lower-case names verbatim)*
- **Electrical** → Control Panels · Distribution Boards · Hand Dryers ·
  PAT testing required · Socket
- **External structures** → General
- **Fire Extinguishers** → CO2 · Powder · Water
- **Fire Systems** → Fire Suppression
- **Lifts** → Disabled Access platform · Lifts - Hydraulic · Lifts -
  Passenger · *(one further child obscured by a transient 502 — re-read
  next session)*
- **Lighting Systems** → Emergency Lighting · External Lighting · Internal
  Lighting
- **Main Supply** → Main Electricity Supply · Main Gas Supply · Main Water
  Supply
- **Meters** → Electric Meters · Gas Meters · Water Meters
- **Plumbing** → Cold Water Storage Tanks and Cisterns · Fountains · Grey
  Water Systems · Pipework general · Showers · Sinks or wash hand basins ·
  Taps · Urinals · Waste and Drains · WCs
- **Pool Plant** → Backwash · Dosing System · Pump
- **Security Systems** → Access Control Systems (PAC) · CCTV Camera
- **Ventilation** → Air Handling Units · Ductwork · Extract Fans · Room
  Air Conditioners

≈85 child classifications under 16 parents. Child rows show the same
columns (Urgency/Mandate/Average/Planned hours/Asset) — all blank/zero at
child level too (the classification→SLA/asset wiring is unset at BOTH
levels; extends VI-006).

## Per-record parent values (8 of 16 read individually before the tree was found)

Alarms, Boilers, Building Fabric, Car Park, Electrical, External
structures, Fire Extinguishers, Fire Systems: each sets ONLY
`Classification is available on external helpdesk page ✓` and
`Helpdesk Job Type* = Reactive` — everything else default/blank.
(Remaining 8 parents' forms and all child forms: not individually read;
list-level shows the same uniform blank pattern. Residual.)

## Structural significance

- The classification hierarchy is the site-user's fault taxonomy (what a
  reporter picks when raising a job) and the intended hook for per-fault
  default urgency (SLA), asset-type linkage, budget coding and process
  (Green/Red asset) — **all of which Vanilla leaves unwired** (VI-006).
- The child form includes "Alternative classification name for mobile app"
  and a per-child scope block (external helpdesk / FixMy / mobile) — the
  same schema as parents (from the embedded inline form template).
- A 'resource' expander also exists per row (classification → resources
  grid) — not yet inventoried (residual).
