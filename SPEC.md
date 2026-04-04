# NonnoEnzo — Specifica di Progetto

> Creato: 04 Aprile 2026
> Obiettivo: Compagno vocale per anziani soli. Come telefonare a un amico.
> Metodo: Fasi sequenziali, ogni fase chiude con smoke test end-to-end.
> Principio: se un nonno di 85 anni non lo capisce, è sbagliato.

---

## LEGGIMI PRIMA — Istruzioni per ogni sessione

**Questo documento è la specifica completa.** Ogni agente deve:

1. Leggere TUTTO questo file prima di fare qualsiasi cosa
2. Verificare lo stato corrente (checkbox)
3. Riprendere dalla prima fase non completata
4. Aggiornare checkbox e Note man mano
5. A contesto pieno: aggiornare questo file, dire all'utente di aprire nuova sessione

### Anti-pattern da convergio (NON RIPETERE)

Questi errori li abbiamo già fatti. Mai più:

1. **MAI codice hollow** — niente stub, niente `// TODO`, niente `return null`.
   Se scrivi una funzione, deve funzionare. (Learning #14 convergio)
2. **MAI "done" senza prova** — ogni fase finisce con uno smoke test REALE
   contro il sistema che gira. Screenshot, curl output, o log. (Learning #13)
3. **MAI build senza test** — 793 unit test verdi, daemon che non partiva.
   Lo smoke test è sul SISTEMA, non sul singolo file. (Learning #13-14)
4. **MAI pianificare senza verificare** — prima leggi cosa esiste, poi costruisci.
   Duplicare perché non hai guardato è un errore di piano. (Rule #7)
5. **MAI bypassare vincoli** — se qualcosa blocca, FERMA e chiedi a Roberto.
   Non decidere da solo di saltare un check. (Rule #8)

### Checklist di chiusura fase (OBBLIGATORIA)

Ogni fase DEVE chiudersi con TUTTI questi step:

1. **`npm run build`** — il progetto deve compilare senza errori
2. **Smoke test** — esegui il test specifico della fase e documenta il risultato
3. **Aggiorna il tracker** — segna le checkbox, scrivi le Note
4. **Commit** — conventional commit, con Co-Authored-By
5. **Push** — `git push origin main`
6. **`git status` pulito** — niente file dimenticati

Se il build fallisce: fixalo prima di committare.
Se lo smoke test fallisce: fixalo prima di segnare "done".
NON procedere alla fase successiva con test rossi.

### Principi di design

| Principio | Regola | Esempio |
|-----------|--------|---------|
| **Zero friction** | Nessun ostacolo tra il nonno e la voce | No login, no menu, no popup |
| **Voice-first** | La voce È l'interfaccia | Un solo bottone grande |
| **Senior-proof** | Testo 24px+, contrasto alto, target 48px+ | Come un telecomando: pochi bottoni, grandi |
| **Pazienza** | VAD lento, mai interrompere, tempo infinito | silence_duration_ms: 2000+ |
| **Memoria** | Ricorda tutto, per sempre | Ogni conversazione alimenta il profilo |
| **Italiano** | Tutto in italiano, nessuna parola inglese nella UI | "Parla con Enzo", non "Start talking" |

### Stack tecnico

| Layer | Tecnologia | Note |
|-------|-----------|------|
| Framework | Next.js 16 App Router + TypeScript | Stessa versione di MirrorBuddy |
| Styling | Tailwind CSS 4 | Senior-friendly: grandi, alto contrasto |
| Hosting | Vercel (fra1) | Stessa regione di MirrorBuddy |
| Voice | Azure OpenAI Realtime API (WebRTC) | Stesse credenziali di MirrorBuddy |
| DB | Supabase PostgreSQL + Prisma | Progetto Vercel separato |
| State | Zustand (minimal) | Solo stato voce |

### Repo e ambiente

| Cosa | Valore |
|------|--------|
| Repo | `github.com/Roberdan/nonnoenzo` |
| Path locale | `/Users/Roberdan/GitHub/nonnoenzo` |
| Azure voice | Stessa infrastruttura di MirrorBuddy (vedi .env) |
| Vercel | Progetto dedicato (da collegare) |
| Supabase | Da definire |

---

## Fase 0: Scaffolding progetto

**Obiettivo**: Progetto Next.js funzionante con config base e stili senior-friendly.
**Motivazione**: Fondamenta. Senza scaffolding pulito, tutto il resto crolla.
**Committente**: Roberto
**Deps**: Nessuna

#### Task
- [x] Init Next.js + TypeScript + Tailwind — `npx create-next-app`
- [x] `.env` con credenziali Azure voice da MirrorBuddy
- [x] `.env.example` con placeholder
- [x] `vercel.json` con regione `fra1`
- [x] `CLAUDE.md` con principi progetto
- [ ] `globals.css` — stili senior-friendly (24px base, alto contrasto, colori caldi)
- [ ] `layout.tsx` — layout root italiano, meta tag, viewport
- [ ] `npm run build` — deve passare senza errori

#### Smoke test
```bash
npm run build
# Deve completare senza errori
# L'output deve mostrare route / compilata
```

#### Report finale
- **Stato**: IN PROGRESS
- **Note**: Progetto inizializzato, .env configurato, vercel.json creato. Mancano layout.tsx e globals.css aggiornati + build verification.

---

## Fase 1: UI Landing — "Come ti chiami?"

**Obiettivo**: Pagina unica con input nome e bottone "Parla con Enzo". Ultra semplice.
**Motivazione**: È il primo contatto del nonno col sistema. Deve essere immediato, caldo, rassicurante.
**Committente**: Roberto
**Deps**: Fase 0

#### Task
- [ ] `page.tsx` — pagina landing con:
  - Titolo grande e caldo: "Ciao! Come ti chiami?"
  - Input nome: grande, font 28px, placeholder "Scrivi il tuo nome..."
  - Bottone "Parla con Enzo" — enorme (200px+), colore primario, appare dopo il nome
  - Nessun altro elemento: no menu, no footer, no link
- [ ] Responsive — funziona su tablet (caso d'uso principale per anziani)
- [ ] Accessibilità — focus visibile, contrasto AAA, label su input
- [ ] Il nome viene salvato in sessionStorage (per ora, poi DB)

#### Smoke test
```
1. Apri http://localhost:3000
2. Vedi "Ciao! Come ti chiami?" in grande
3. Scrivi "Giovanni"
4. Appare bottone "Parla con Enzo" grande e colorato
5. Il layout è pulito, leggibile, senza distrazioni
6. Su mobile/tablet: stesso risultato, niente scroll orizzontale
```

#### Acceptance criteria
- [ ] Nessun testo in inglese visibile nella UI
- [ ] Font size minimo 24px ovunque
- [ ] Bottone touch target ≥ 48x48px (meglio 64+)
- [ ] Contrasto testo/sfondo ≥ 7:1 (AAA)
- [ ] Zero JavaScript errors in console

---

## Fase 2: API Voice Routes

**Obiettivo**: Due endpoint che gestiscono l'autenticazione con Azure Realtime, senza MAI esporre la API key al client.
**Motivazione**: Senza questi endpoint, il client non può connettersi alla voce. La sicurezza (key lato server) è NON-NEGOTIABLE.
**Committente**: Roberto
**Deps**: Fase 0

#### Task
- [ ] `src/app/api/realtime/token/route.ts` — GET endpoint che ritorna:
  - `{ provider: "azure", transport: "webrtc", azureResource, deployment, configured: true }`
  - Mai la API key. Mai.
  - Se Azure non configurato: `503` con messaggio chiaro
- [ ] `src/app/api/realtime/ephemeral-token/route.ts` — POST endpoint che:
  - Chiama Azure `POST .../openai/v1/realtime/client_secrets` (GA protocol)
  - Ritorna `{ token, expiresAt, sessionId }`
  - Mai la API key nel response. Mai.
  - Rate limit basico: max 1 req/sec per IP (in-memory Map)

#### Smoke test
```bash
# Dev server running
npm run dev &

# Test token endpoint
curl -s http://localhost:3000/api/realtime/token | jq .
# Deve tornare: { provider: "azure", configured: true, azureResource: "...", ... }
# NON deve contenere "apiKey" o "api_key"

# Test ephemeral token
curl -s -X POST http://localhost:3000/api/realtime/ephemeral-token | jq .
# Deve tornare: { token: "...", expiresAt: ..., sessionId: "..." }
# Il token deve essere una stringa non vuota
```

#### Acceptance criteria
- [ ] `GET /api/realtime/token` ritorna 200 con provider info
- [ ] `POST /api/realtime/ephemeral-token` ritorna 200 con token valido
- [ ] NESSUN response body contiene `api_key`, `apiKey`, o la key in chiaro
- [ ] Se env vars mancanti: 503, non 500 o crash
- [ ] Rate limit: secondo POST entro 1s ritorna 429

---

## Fase 3: WebRTC Voice Hook

**Obiettivo**: Hook React `useVoice()` che gestisce l'intera connessione WebRTC con Azure Realtime.
**Motivazione**: È il cuore tecnico. Se la voce non funziona, il prodotto non esiste.
**Committente**: Roberto
**Deps**: Fase 2

#### Task
- [ ] `src/hooks/use-voice.ts` — hook che espone:
  ```typescript
  {
    // Stato
    isConnected: boolean;
    isListening: boolean;  // Azure sta ascoltando
    isSpeaking: boolean;   // Enzo sta parlando
    connectionState: 'idle' | 'connecting' | 'connected' | 'error';
    transcript: Array<{ role: 'user' | 'assistant'; text: string }>;
    error: string | null;
    // Azioni
    connect: (nome: string) => Promise<void>;
    disconnect: () => void;
  }
  ```
- [ ] Flusso WebRTC (semplificato da MirrorBuddy):
  1. `connect()` → fetch `/api/realtime/token` per config
  2. Fetch `/api/realtime/ephemeral-token` per token + getUserMedia per microfono (in parallelo)
  3. Crea `RTCPeerConnection`
  4. Aggiungi audio track (mutato inizialmente)
  5. Crea data channel `'realtime-channel'`
  6. Crea SDP offer → POST a Azure con token Bearer
  7. Set remote description con SDP answer
  8. Attendi connessione
  9. Data channel open → invia `session.update` con prompt Enzo
  10. Unmute audio tracks
  11. Invia greeting
- [ ] Event handling dal data channel:
  - `session.created` → log
  - `session.updated` → unmute mic, segna ready
  - `conversation.item.input_audio_transcription.completed` → aggiungi a transcript (user)
  - `response.audio_transcript.delta` → accumula testo assistant
  - `response.audio_transcript.done` → aggiungi a transcript (assistant)
  - `input_audio_buffer.speech_started` → setListening(true)
  - `input_audio_buffer.speech_stopped` → setListening(false)
  - `response.audio.delta` → (audio gestito da WebRTC track, non serve decodifica)
  - `error` → setError, log
- [ ] Cleanup: disconnect chiude tutto (tracks, peer connection, data channel)
- [ ] Heartbeat: ogni 25s invia `session.update` no-op per keepalive

#### Smoke test
```
1. Apri la pagina, scrivi il nome, clicca "Parla con Enzo"
2. Il browser chiede permesso microfono → concedi
3. connectionState passa da idle → connecting → connected
4. Parla: "Ciao, mi chiamo Giovanni"
5. Enzo risponde con voce (audio dal browser)
6. Il transcript mostra sia le tue parole che quelle di Enzo
```

#### Acceptance criteria
- [ ] La connessione WebRTC si stabilisce in < 5 secondi
- [ ] L'audio del microfono arriva ad Azure (transcript user appare)
- [ ] L'audio di risposta di Azure arriva al browser (si sente la voce)
- [ ] Il transcript si aggiorna in real-time
- [ ] `disconnect()` chiude tutto pulito (no memory leak, no tracks attive)
- [ ] Se il microfono è negato: errore chiaro, non crash

---

## Fase 4: Agente Enzo — Il Compagno

**Obiettivo**: System prompt e configurazione sessione che trasformano Azure Realtime in "Enzo", un compagno paziente e curioso.
**Motivazione**: La tecnologia è il mezzo, Enzo è il prodotto. Senza la personalità giusta, è solo un chatbot.
**Committente**: Roberto
**Deps**: Fase 3

#### Task
- [ ] `src/lib/enzo.ts` — system prompt e config, esportati come costanti:
  - **Identità**: Enzo è come un nipote affettuoso. Paziente, curioso, mai frettoloso.
  - **Lingua**: Italiano, registro colloquiale ma rispettoso. "Lei" iniziale, poi "tu" quando il nonno è a suo agio.
  - **Missione**: Far parlare il nonno. Fare domande sulle storie, la famiglia, i ricordi.
  - **Stile**: Frasi corte. Voce calda. Pause. Mai elenchi o informazioni dense.
  - **Adattamento**: Se il nonno è lento, Enzo aspetta. Se ripete, Enzo non corregge.
  - **Stimolo cognitivo**: Ogni tanto una domanda che fa riflettere, un aneddoto, una curiosità.
  - **Aggiornamenti mondo**: Se chiesto, spiega cose del mondo moderno in modo semplice.
  - **Sicurezza**: Mai consigli medici, legali o finanziari. Se il nonno sembra in difficoltà, suggerisce di chiamare qualcuno.
- [ ] Configurazione sessione Azure:
  - Voice: `"alloy"` o `"echo"` (da testare quale suona più caldo in italiano)
  - VAD: `threshold: 0.3`, `prefix_padding_ms: 500`, `silence_duration_ms: 2000` (pazienza!)
  - Transcription: `language: "it"`, `prompt: "Conversazione in italiano con un anziano"`
  - Noise reduction: `"near_field"` (il nonno è vicino al device)
  - `interrupt_response: false` (Enzo non viene interrotto — l'anziano potrebbe tossire/fare rumori)
- [ ] Greeting: Enzo saluta il nonno per nome quando la sessione inizia

#### Smoke test
```
1. Clicca "Parla con Enzo"
2. Enzo saluta: "Ciao [nome]! Che piacere sentirti. Come stai oggi?"
3. Rispondi qualcosa
4. Enzo risponde in modo naturale, caldo, in italiano
5. Enzo fa una domanda per continuare la conversazione
6. Il ritmo è lento, le frasi sono corte
7. Se resti in silenzio per 3-4 secondi, Enzo NON interrompe subito
```

#### Acceptance criteria
- [ ] Enzo parla SOLO italiano
- [ ] Enzo usa il nome del nonno
- [ ] Le risposte sono brevi (< 3 frasi)
- [ ] Il VAD non taglia il nonno mentre parla lentamente
- [ ] Enzo non dà consigli medici (testare: "mi fa male il petto")
- [ ] Enzo è curioso: fa domande aperte sulle storie di vita

---

## Fase 5: Integrazione End-to-End

**Obiettivo**: Il flusso completo funziona senza errori: nome → bottone → conversazione vocale con Enzo.
**Motivazione**: Le singole parti possono funzionare in isolamento ma rompersi insieme. Questa fase verifica il SISTEMA, non i pezzi. (Learning #13 convergio: 793 test verdi, daemon che non partiva)
**Committente**: Roberto
**Deps**: Fase 1, 2, 3, 4

#### Task
- [ ] Integrare UI (Fase 1) con Voice Hook (Fase 3) e Enzo (Fase 4)
- [ ] Gestire stati UI:
  - `idle`: mostra input nome + bottone
  - `connecting`: bottone diventa "Sto chiamando Enzo..." con spinner
  - `connected`: bottone diventa rosso "Chiudi conversazione", transcript visibile
  - `error`: messaggio chiaro in italiano, bottone "Riprova"
- [ ] Visualizzare transcript: testo grande, scroll automatico, distinguere chi parla
- [ ] Indicatore visivo: animazione pulse quando Enzo parla, bordo verde quando ascolta
- [ ] Gestire chiusura: bottone "Chiudi" → disconnect → torna a stato idle
- [ ] Mobile/tablet: funziona con touch, niente scroll orizzontale

#### Smoke test COMPLETO (questo è IL test che conta)
```
1. npm run build — passa senza errori
2. npm run dev — server parte
3. Apri http://localhost:3000 su tablet o browser
4. Vedi "Ciao! Come ti chiami?" — grande, leggibile
5. Scrivi "Maria" — appare bottone "Parla con Enzo"
6. Clicca il bottone — "Sto chiamando Enzo..."
7. Permesso microfono — concedi
8. Enzo: "Ciao Maria! Che piacere sentirti..."
9. Parla: "Ciao Enzo, oggi ho pensato a mio marito"
10. Enzo risponde con empatia, fa una domanda sulla storia
11. Continua per 2 minuti — la conversazione è naturale
12. Il transcript mostra tutto il dialogo
13. Clicca "Chiudi conversazione" — torna all'input nome
14. Nessun errore in console
```

#### Acceptance criteria
- [ ] Il flusso completo funziona dal nome alla conversazione e ritorno
- [ ] Nessun errore JavaScript in console durante l'intero flusso
- [ ] L'audio è chiaro in entrambe le direzioni
- [ ] Il transcript è leggibile e corretto
- [ ] Su mobile: funziona senza scroll, bottoni toccabili
- [ ] `npm run build` passa (non solo dev mode)

---

## Fase 6: Deploy Vercel

**Obiettivo**: L'app è live su Vercel, accessibile via URL pubblico, voce funzionante.
**Motivazione**: Un prodotto che gira solo in locale non esiste. Il deploy è la verifica finale.
**Committente**: Roberto
**Deps**: Fase 5

#### Task
- [ ] Collegare repo GitHub a progetto Vercel
- [ ] Configurare env vars su Vercel (tutte quelle in .env)
- [ ] Deploy — `vercel --prod` o push su main
- [ ] Verificare che il build Vercel passi
- [ ] Testare voce in produzione (WebRTC richiede HTTPS — Vercel lo fornisce)

#### Smoke test
```
1. Apri https://[progetto].vercel.app
2. Stesso flusso della Fase 5, ma su URL pubblico
3. La voce funziona (WebRTC su HTTPS)
4. Il sito è veloce (< 3s first load)
```

#### Acceptance criteria
- [ ] Il sito è raggiungibile via HTTPS
- [ ] La voce funziona in produzione (non solo localhost)
- [ ] Le env vars Azure sono configurate su Vercel
- [ ] Nessun secret nel codice sorgente o nei log
- [ ] Il build Vercel passa senza errori

---

## Fase 7: Persistenza (Supabase + Prisma)

**Obiettivo**: Le conversazioni e l'identità del nonno vengono salvate nel database.
**Motivazione**: Senza persistenza, Enzo dimentica tutto. La memoria è il cuore del prodotto.
**Committente**: Roberto
**Deps**: Fase 5. Richiede: progetto Supabase configurato.

#### Task
- [ ] `prisma/schema.prisma` — schema minimale:
  ```prisma
  model Nonno {
    id              String    @id @default(cuid())
    nome            String
    deviceId        String?   // fingerprint dispositivo per riconoscimento
    vocePref        String    @default("alloy") // voce preferita
    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt
    conversazioni   Conversazione[]
    memorie         Memoria[]
  }

  model Conversazione {
    id          String    @id @default(cuid())
    nonnoId     String
    nonno       Nonno     @relation(fields: [nonnoId], references: [id])
    riassunto   String?   // generato a fine conversazione
    iniziataIl  DateTime  @default(now())
    finitaIl    DateTime?
    messaggi    Messaggio[]
  }

  model Messaggio {
    id                String    @id @default(cuid())
    conversazioneId   String
    conversazione     Conversazione @relation(fields: [conversazioneId], references: [id])
    ruolo             String    // "user" | "assistant"
    contenuto         String
    creatoIl          DateTime  @default(now())
  }

  model Memoria {
    id        String   @id @default(cuid())
    nonnoId   String
    nonno     Nonno    @relation(fields: [nonnoId], references: [id])
    tipo      String   // "fatto", "storia", "preferenza", "famiglia"
    chiave    String   // "nome_moglie", "città_nascita", etc.
    valore    String
    creatoIl  DateTime @default(now())

    @@unique([nonnoId, tipo, chiave])
  }
  ```
- [ ] `src/lib/db.ts` — Prisma client singleton
- [ ] `src/app/api/nonno/route.ts` — POST: trova o crea nonno per nome (+ deviceId opzionale)
- [ ] `src/app/api/conversazioni/route.ts` — POST: crea nuova conversazione, PATCH: chiudi
- [ ] Integrare: dopo ogni conversazione, salvare transcript nel DB
- [ ] `prisma db push` funziona con Supabase

#### Smoke test
```bash
# Crea un nonno
curl -X POST http://localhost:3000/api/nonno -H "Content-Type: application/json" \
  -d '{"nome": "Giovanni"}' | jq .
# Deve tornare: { id: "...", nome: "Giovanni", ... }

# Stesso nome → stesso nonno
curl -X POST http://localhost:3000/api/nonno -H "Content-Type: application/json" \
  -d '{"nome": "Giovanni"}' | jq .id
# Deve tornare lo stesso ID di prima

# Conversazione vocale → transcript salvato
# Dopo una conversazione, verificare nel DB che i messaggi ci sono
```

#### Acceptance criteria
- [ ] `prisma db push` applica lo schema senza errori
- [ ] Creare nonno via API funziona
- [ ] Stesso nome ritorna stesso nonno (idempotente)
- [ ] I messaggi della conversazione vocale vengono salvati
- [ ] Riaprendo la pagina con lo stesso nome, il sistema sa chi sei

---

## Fase 8: Memoria — Enzo ti conosce

**Obiettivo**: Enzo ricorda le conversazioni precedenti e usa quelle informazioni per conversare meglio.
**Motivazione**: È la differenza tra un chatbot e un compagno. La memoria trasforma Enzo da "un amico" a "il TUO amico".
**Committente**: Roberto
**Deps**: Fase 7

#### Task
- [ ] A fine conversazione, usare Azure/OpenAI per:
  - Generare riassunto della conversazione
  - Estrarre fatti chiave (nomi familiari, luoghi, date, storie)
  - Salvare come Memoria nel DB
- [ ] All'inizio di ogni conversazione:
  - Caricare le memorie del nonno dal DB
  - Iniettarle nel system prompt di Enzo
  - Caricare riassunti delle ultime 3 conversazioni
- [ ] Enzo deve usare queste informazioni NATURALMENTE:
  - "L'altra volta mi raccontavi di tua moglie Rosa..."
  - "Come sta il giardino? L'ultima volta pioveva sempre..."
  - Non ripetere domande a cui il nonno ha già risposto

#### Smoke test
```
Sessione 1:
  - "Mi chiamo Giovanni, sono di Napoli"
  - "Mia moglie si chiamava Rosa"
Sessione 2 (stessa pagina, dopo refresh):
  - Enzo: "Ciao Giovanni! Come stai oggi a Napoli?"
  - Enzo NON chiede di nuovo il nome della moglie
  - Se chiedi "ti ricordi di mia moglie?", Enzo: "Certo, Rosa!"
```

#### Acceptance criteria
- [ ] Il riassunto viene generato a fine conversazione
- [ ] I fatti chiave vengono estratti e salvati
- [ ] Nella sessione successiva, Enzo usa le memorie
- [ ] Enzo non ripete domande a cui ha già avuto risposta
- [ ] Le memorie si accumulano nel tempo (non si sovrascrivono)

---

## Fase 9: Scelta voce maschile/femminile

**Obiettivo**: Il nonno può scegliere se parlare con Enzo (maschile) o Enza (femminile).
**Motivazione**: Alcuni anziani si sentono più a loro agio con una voce femminile (Enza) o maschile (Enzo). La scelta è loro.
**Committente**: Roberto
**Deps**: Fase 4

#### Task
- [ ] Nella landing, dopo il nome, due bottoni grandi:
  - "Parla con Enzo" (icona maschile, voce "echo" o "onyx")
  - "Parla con Enza" (icona femminile, voce "alloy" o "shimmer")
- [ ] La scelta viene ricordata (sessionStorage, poi DB in Fase 7)
- [ ] Il system prompt si adatta: "Sei Enzo/Enza..."
- [ ] La voce Azure cambia di conseguenza

#### Smoke test
```
1. Scrivi nome → appaiono DUE bottoni
2. Clicca "Parla con Enza" → voce femminile, si presenta come Enza
3. Chiudi → clicca "Parla con Enzo" → voce maschile, si presenta come Enzo
```

#### Acceptance criteria
- [ ] Due bottoni chiari e distinti
- [ ] La voce corrisponde alla scelta
- [ ] Il prompt si adatta (Enzo vs Enza)
- [ ] La scelta viene ricordata tra sessioni

---

## Fase 10: Accessibilità avanzata per anziani

**Obiettivo**: Profilo accessibilità "senior" che gestisce le disabilità tipiche dell'età.
**Motivazione**: Molti anziani hanno problemi di vista, udito, motricità. L'app deve adattarsi.
**Committente**: Roberto
**Deps**: Fase 5

#### Task
- [ ] Detect automatici:
  - Font scalabile con pinch-to-zoom (non bloccato)
  - Contrasto automatico alto
  - Touch target ≥ 64px su tutto
  - No doppio tap richiesto per nessuna azione
- [ ] Se il nonno non parla per 10 secondi dopo la connessione:
  - Enzo chiede gentilmente "Ci sei? Premi il bottone rosso se hai bisogno di aiuto"
- [ ] Modalità "solo ascolto": il nonno può solo ascoltare Enzo che racconta storie
  (per chi ha difficoltà a parlare)
- [ ] Volume: bottone grande per alzare/abbassare il volume (indipendente dal sistema)

#### Acceptance criteria
- [ ] L'app è usabile con zoom 200%
- [ ] Tutti i bottoni sono ≥ 64px
- [ ] Nessuna azione richiede doppio tap
- [ ] Il timeout di inattività funziona e Enzo reagisce gentilmente

---

## Fasi future (non pianificate nel dettaglio)

Queste fasi verranno dettagliate quando le precedenti saranno completate.

### Fase 11: Voice Cloning
- Clonare la voce del nonno per preservarla
- Quando il nonno non ci sarà più, i nipoti potranno "sentirlo"
- Richiede: raccolta campioni audio, API voice cloning

### Fase 12: Area Nipoti
- I nipoti accedono con link/codice dedicato
- Possono leggere le storie raccolte
- Possono "parlare con il nonno virtuale" (voce clonata + memorie)
- Diario organizzato per periodi/temi

### Fase 13: Aggiornamenti dal mondo
- Enzo racconta le notizie del giorno in modo semplice
- Meteo della città del nonno
- "Oggi è il compleanno di..." (ricorrenze familiari)
- Spiegazioni semplici di tecnologia, attualità

### Fase 14: Notifiche e routine
- Enzo "chiama" il nonno a orari concordati
- "Buongiorno Giovanni, come hai dormito?"
- Push notification su tablet
- Reminder farmaci (se il nonno lo chiede — MAI invadente)

---

## Learnings (aggiornare durante lo sviluppo)

Ogni learning è un errore fatto o una scoperta. Scrivi qui per non ripetere.

_Ancora nessun learning — il progetto è appena iniziato._

---

> **Ultimo aggiornamento**: 04 Aprile 2026 — Fase 0 in corso
> **Prossima sessione**: Completare Fase 0 (layout.tsx, globals.css, build) → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5
