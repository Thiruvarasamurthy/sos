# Sahaya CoopAI Frontend Prototype

A browser-ready frontend concept for SIH 2026 PS SIH26088: Multilingual Cooperative Governance & Legal Assistance.

## Prototype scope

- Task-first home dashboard
- Scheme Navigator with scheme details and official-source links
- Cooperative Services cards
- Grievance draft creation with localStorage persistence
- Saved schemes
- Language and state context selection
- Structured prototype assistant

The UI uses local demo data. It does not claim to submit real applications or grievances, and it does not claim that live AI, BHASHINI, or government integrations are already connected.

## Run locally

Open `index.html` in a browser, or run:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Next integration phase

1. Connect Flutter frontend or package this concept as a WebView prototype.
2. Replace mock repositories with FastAPI APIs.
3. Add validated official-source retrieval.
4. Integrate BHASHINI through the backend.
5. Add operator assistance and controlled offline sync.
