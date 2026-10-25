# Notes

Простое приложение для заметок: frontend (Vite + nginx), backend (FastAPI), PostgreSQL.

```
browser ──► frontend :80 (nginx)
              ├── /        → статика из dist
              └── /api/*   → backend :8000 (FastAPI) ──► db :5432 (PostgreSQL)
```

## Сети

| Сеть      | Сервисы             |
|-----------|---------------------|
| `app-net` | frontend, backend   |
| `db-net`  | backend, db         |

Frontend и backend находятся в одной сети и обращаются друг к другу по имени сервиса (`http://backend:8000`). БД доступна только бэкенду. Наружу опубликован только порт фронтенда.

## Запуск

```bash
cp .env.example .env
docker compose up --build -d
```

Приложение: http://localhost:8080

Остановка: `docker compose down`, с удалением данных: `docker compose down -v`.

## Запуск без compose

```bash
docker network create notes-net

docker build -t notes-db ./db
docker build -t notes-backend ./backend
docker build -t notes-frontend ./frontend

docker run -d --name db --network notes-net \
  -e POSTGRES_DB=notes -e POSTGRES_USER=notes -e POSTGRES_PASSWORD=notes \
  notes-db

docker run -d --name backend --network notes-net \
  -e DB_HOST=db -e DB_NAME=notes -e DB_USER=notes -e DB_PASSWORD=notes \
  notes-backend

docker run -d --name frontend --network notes-net -p 8080:80 notes-frontend
```

Проверка, что контейнеры в одной сети:

```bash
docker network inspect notes-net
docker exec frontend wget -qO- http://backend:8000/api/health
```

## Frontend

Сборка в Dockerfile в два этапа:

1. `node:22-alpine`: `npm install` и `npm run build`, результат в `dist/`
2. `nginx:1.27-alpine`: в образ попадают только `dist/` и конфиг nginx

Локальный запуск (запросы `/api` проксируются на `localhost:8000`):

```bash
cd frontend
npm install
npm run dev
```

## API

| Метод  | Путь               | Описание                                      |
|--------|--------------------|-----------------------------------------------|
| GET    | `/api/notes`       | список заметок                                |
| POST   | `/api/notes`       | добавить заметку, тело `{"text": "..."}`      |
| DELETE | `/api/notes/{id}`  | удалить заметку                               |
| GET    | `/api/health`      | liveness                                      |
| GET    | `/api/ready`       | readiness, 503 если БД недоступна             |
| GET    | `/api/info`        | версия и hostname                             |
| GET    | `/metrics`         | метрики Prometheus                            |
| GET    | `/healthz`         | health фронтенда                              |

Swagger: `http://<backend>:8000/docs`

## Переменные окружения

backend:

| Переменная    | По умолчанию |
|---------------|--------------|
| `APP_VERSION` | `dev`        |
| `DB_HOST`     | `localhost`  |
| `DB_PORT`     | `5432`       |
| `DB_NAME`     | `notes`      |
| `DB_USER`     | `notes`      |
| `DB_PASSWORD` | `notes`      |

`APP_VERSION` задаётся при сборке: `docker build --build-arg APP_VERSION=1.2.3 ./backend`

frontend:

| Переменная    | По умолчанию          |
|---------------|-----------------------|
| `BACKEND_URL` | `http://backend:8000` |

## Локальная разработка

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

## Тесты

```bash
cd backend
pytest -v
```

`test_ready` и `test_notes_crud` пропускаются, если PostgreSQL недоступен.

## Docker Registry

Запуск регистра на отдельной машине:

```bash
docker run -d \
  --name registry \
  --restart unless-stopped \
  -p 5000:5000 \
  -v registry-data:/var/lib/registry \
  -e REGISTRY_STORAGE_DELETE_ENABLED=true \
  registry:2
```

Сборка и публикация образов (адрес регистра и тег берутся из `.env`):

```bash
docker compose build
docker compose push
```

Проверка содержимого регистра:

```bash
curl http://192.168.56.10:5000/v2/_catalog
curl http://192.168.56.10:5000/v2/notes-backend/tags/list
```

Запуск на другой машине: нужны только файлы из `deploy/`.

```bash
cd deploy
cp .env.example .env
docker compose pull
docker compose up -d
```

Регистр работает по HTTP, поэтому на каждой машине, которая к нему обращается, адрес регистра нужно добавить в `/etc/docker/daemon.json`:

```json
{
  "insecure-registries": ["192.168.56.10:5000"]
}
```

## Структура

```
notes-app/
├── backend/
│   ├── app/main.py
│   ├── tests/test_api.py
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── nginx.conf.template
│   └── Dockerfile
├── db/
│   ├── init.sql
│   └── Dockerfile
├── deploy/
│   ├── docker-compose.yml
│   └── .env.example
├── docker-compose.yml
└── .env.example
```
