# AI Oracle

AI Oracle es una plataforma astrológica full-stack que integra:
- **Abu Engine** (FastAPI, Python): cálculos astronómicos y ciclos de vida
- **Lilly Engine** (FastAPI, Python): interpretación simbólica y narrativa
- **Next.js Frontend** (React, TypeScript): visualización interactiva y navegación

## Levantar el stack completo

```bash
docker compose up --build
```

## Servicios y puertos
- Abu Engine → http://localhost:8000
- Lilly Engine → http://localhost:8001
- Frontend → http://localhost:3000

## Modo intérprete con Assistants API (latencia menor)

Lilly puede interpretar de dos maneras:
- Clásico (Chat Completions)
- Assistants API con tools (recomendado por latencia y manejo de contexto)

Variables de entorno relevantes (ya configuradas en `docker-compose.yml`):
- `OPENAI_API_KEY` (obligatoria)
- `USE_ASSISTANTS=true` para activar el modo Assistants en Lilly
- `ABU_URL` base para que Lilly ejecute tools contra Abu (en Compose: `http://abu_engine:8000`)
- `LILLY_MODEL` (opcional; por defecto `gpt-4o-mini` para menor latencia)

Puedes desactivar Assistants poniendo `USE_ASSISTANTS=false` si quieres volver al modo clásico.

## Reportes de progreso
- [docs/AI_Oracle_Progress_Report_1.md](docs/AI_Oracle_Progress_Report_1.md)
- [docs/AI_Oracle_Progress_Report_2.md](docs/AI_Oracle_Progress_Report_2.md)
- [docs/AI_Oracle_Progress_Report_3.md](docs/AI_Oracle_Progress_Report_3.md)

## Despliegue
- Backends listos para Cloud Run
- Frontend listo para Vercel
