# NonnoEnzo

Compagno vocale per anziani. Un amico digitale paziente, curioso, stimolante.

## Principi

1. **Semplicità radicale** — se un nonno di 85 anni non lo capisce, è sbagliato
2. **Voice-first** — l'interfaccia è la voce, il bottone è secondario
3. **Zero friction** — niente login, niente password, niente menu
4. **Pazienza infinita** — mai fretta, mai giudizio, mai complessità
5. **Memoria fedele** — ricorda tutto, sempre, con affetto

## Stack

Next.js 16 App Router | TypeScript | Tailwind | Azure OpenAI Realtime (WebRTC) | Vercel (fra1)

## Commands

| Command         | Purpose           |
| --------------- | ----------------- |
| `npm run dev`   | Dev server :3000  |
| `npm run build` | Production build  |

## Constraints

- Max 250 lines/file
- Defensive: null/undefined on external input
- Every async = error handling
- NO localStorage for user data
- Italian-first UI
- Accessible: 24px+ text, high contrast, large touch targets
