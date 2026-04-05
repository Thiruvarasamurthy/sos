# SOS App Backend Setup

## What was added

- `server.js` (Express backend)
- `data/store.json` (local JSON storage)
- `package.json` (dependencies and scripts)
- Frontend (`script.js`) connected to backend APIs

## Backend features

- `GET /api/health` - server health + local IP addresses
- `GET /api/profile` - user profile
- `POST /api/profile` - update profile
- `GET /api/contacts` - emergency contacts
- `POST /api/contacts` - add emergency contact
- `POST /api/sos` - save SOS events
- `GET /api/sos/history` - list SOS history
- `POST /api/location/update` - save searched place/location updates
- `POST /api/health-snapshot` - save smartwatch-like snapshots
- `POST /api/chat` - TravelGuide AI backend reply

## Required software

Install Node.js LTS from:

- https://nodejs.org/

After install, reopen terminal and confirm:

- `node -v`
- `npm -v`

## Run locally

From project folder:

1. `npm install`
2. `npm start`

Open in PC browser:

- `http://localhost:3000`

## Open on mobile browser (same Wi-Fi)

1. Keep server running on your PC.
2. Find your PC local IP (for example `192.168.1.10`).
3. In mobile browser, open:
   - `http://<PC_LOCAL_IP>:3000`
   - Example: `http://192.168.1.10:3000`
4. If it does not open, allow Node.js through Windows Firewall (Private network).

## Notes

- Data is stored in `data/store.json`.
- This backend is for development/demo. For production, add authentication, HTTPS, and a real database.
