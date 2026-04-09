.PHONY: dev build seed clean logs stop

# ─── Development ─────────────────────────────────────────
dev:
	docker-compose up --build

dev-detached:
	docker-compose up --build -d

# ─── Build ───────────────────────────────────────────────
build:
	docker-compose build --no-cache

# ─── Database Seed ───────────────────────────────────────
seed:
	docker-compose exec backend npx prisma migrate deploy
	docker-compose exec backend npx prisma db seed

# ─── Database Migrate ────────────────────────────────────
migrate:
	docker-compose exec backend npx prisma migrate dev --name init

# ─── Logs ────────────────────────────────────────────────
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-ai:
	docker-compose logs -f ai-service

# ─── Stop ────────────────────────────────────────────────
stop:
	docker-compose down

# ─── Clean (removes volumes) ────────────────────────────
clean:
	docker-compose down -v --remove-orphans

# ─── Prisma Studio ──────────────────────────────────────
studio:
	docker-compose exec backend npx prisma studio
