# ESTATE OPS PUBLISH — V SHARK 🦈

Production-ready holographic command center for mass real-estate listing publication (Polish portals and beyond).

One operator fills **Mission Input**. Crew of eight suited agents (HELM, SCRIBE, SENTINEL, RELAY, VAULT, AIRLOCK, PUBLISHER, VERIFY) register, adapt content to portal limits, publish, and verify — with a human **Approval Airlock**.

## Visual system

Dark navy hologram UI, glass panels, floor grid, particles, central **V SHARK** orchestrator, photoreal crew in office suits.

## Mission Input

Seller name, +48 phone, title ≤70, description ≤5000, price + auto zł/m², YouTube, up to **20 photos** with drag-priority (portals that accept 10/15 take the first N), Excel/CSV portal list, full Polish location schema.

Pipeline: `REGISTER → PREPARE → CONTENT → COMPLIANCE → PUBLISH → VERIFY`

## Run

```bash
npx serve .
# or
python3 -m http.server 8080
```

Open `index.html`. Press **✎ INPUT**, then **Start Listing**. Approve at the airlock.

PL/EN toggle is in the top bar. Mission data persists in `localStorage`. Ledger SHA-256 chain: `listing-ledger.js`. Mock portal transport: `portal-adapter.js`.
