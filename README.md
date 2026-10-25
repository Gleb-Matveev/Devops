# Notes

Простое приложение для заметок: frontend (nginx + JS), backend (FastAPI), PostgreSQL.

```
browser ──► frontend :80 (nginx)
              ├── /        → index.html, app.js
              └── /api/*   → backend :8000 (FastAPI) ──► db :5432 (PostgreSQL)
```

## Запуск

```bash
cp .env.example .env
docker compose up --build -d
```

Приложение: http://localhost:8080

Остановка: `docker compose down`, с удалением данных: `docker compose down -v`.

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
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── nginx.conf.template
│   └── Dockerfile
├── db/
│   ├── init.sql
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```
