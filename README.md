# HAW Hof Ludo Game 2.0: Backend

Server für das Ludo-Spiel aus [isep-frontend](https://github.com/trippletrouble/isep-frontend). Er verwaltet Lobbys und Spielsitzungen, prüft jeden Zug gegen die Spielregeln und schickt den neuen Spielstand per Server-Sent Events an alle Spieler.

## Technik

NestJS, TypeScript, Prisma mit PostgreSQL, Redis, Keycloak, OpenAPI/Swagger. Tests mit Jest.

## Mein Beitrag

Von mir stammt die Spiel-Engine mit den Kernregeln von Ludo, abgesichert durch Unit-Tests. Ich habe den SSE-Dienst gebaut, der den Spielstand in Echtzeit verteilt und nach einem Verbindungsabbruch wieder synchronisiert. Dazu kamen die End-to-End-Tests und die Logik der Fliegen-Regel.

## Lokal starten

```bash
cp .env.example .env   # Werte eintragen
docker compose up -d
npm install
npm run start:dev
```

Interdisziplinäres Softwareentwicklungsprojekt, Hochschule Hof, 2026.
