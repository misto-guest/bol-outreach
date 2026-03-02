# Docker Deployment Guide for BOL Outreach

This guide explains how to build and run the BOL Outreach application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed (for docker-compose commands)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Stop and remove volumes (deletes database!)
docker-compose down -v
```

The application will be available at: http://localhost:3000

### Using Docker Build

```bash
# Build the image
docker build -t bol-outreach .

# Run the container
docker run -d \
  --name bol-outreach-app \
  -p 3000:3000 \
  -v bol-data:/app/data \
  bol-outreach

# View logs
docker logs -f bol-outreach-app

# Stop the container
docker stop bol-outreach-app

# Remove the container
docker rm bol-outreach-app
```

## Container Features

### Multi-Stage Build
- **Stage 1**: Builds TypeScript code and installs dependencies
- **Stage 2**: Production image with only runtime dependencies
- Result: Smaller final image size (~200MB vs ~500MB)

### Included Components
- Node.js 20 Alpine Linux
- Chromium browser (for Puppeteer)
- SQLite database support
- Health check endpoint

### Persistent Data
- Database stored in Docker volume: `bol-data`
- Data persists across container restarts
- Back up volume with: `docker run --rm -v bol-data:/data -v $(pwd):/backup alpine tar czf /backup/bol-backup.tar.gz /data`

## Environment Variables

Configure via `docker-compose.yml` or `docker run -e`:

- `NODE_ENV`: Set to `production` (default)
- `PORT`: Application port (default: 3000)
- `DB_PATH`: SQLite database path (default: /app/data/bol-outreach.db)

## Health Check

The container includes a health check that queries `/api/health` every 30 seconds.

Check health status:
```bash
docker inspect bol-outreach-app --format='{{.State.Health.Status}}'
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs bol-outreach

# Check health status
docker inspect bol-outreach-app --format='{{.State.Health.Status}}'
```

### Database issues
```bash
# Access container shell
docker-compose exec bol-outreach sh

# Check database
ls -la /app/data/

# Backup database
docker run --rm -v bol-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/bol-db-backup-$(date +%Y%m%d).tar.gz /data
```

### Rebuild from scratch
```bash
# Stop and remove containers
docker-compose down -v

# Rebuild image without cache
docker-compose build --no-cache

# Start again
docker-compose up -d
```

## Production Considerations

1. **Security**: Run as non-root user (add to Dockerfile if needed)
2. **SSL**: Use reverse proxy (nginx/traefik) for HTTPS
3. **Monitoring**: Add logging aggregation (ELK, Loki, etc.)
4. **Backups**: Implement automated database backups
5. **Scaling**: Add load balancer for multiple instances

## Docker Compose with Nginx (Optional)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  bol-outreach:
    build: .
    restart: always
    environment:
      - NODE_ENV=production
    volumes:
      - bol-data:/app/data
    networks:
      - internal

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - bol-outreach
    networks:
      - internal

volumes:
  bol-data:

networks:
  internal:
```

Run with: `docker-compose -f docker-compose.prod.yml up -d`

## Additional Resources

- [Dfile documentation](https://docs.docker.com/engine/reference/builder/)
- [Docker Compose reference](https://docs.docker.com/compose/compose-file/)
- [Puppeteer in Docker](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker)