# Start all services
docker compose up -d --wait

# Stop services while keeping database data
docker compose stop
