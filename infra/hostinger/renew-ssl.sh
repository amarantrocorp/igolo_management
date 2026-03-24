#!/bin/bash
# =============================================================================
# Igolo Interior - SSL Certificate Renewal
# Add to crontab: 0 3 * * * /opt/igolo/infra/hostinger/renew-ssl.sh
# =============================================================================

certbot renew --quiet --deploy-hook "docker compose -f /opt/igolo/infra/hostinger/docker-compose.prod.yml exec -T nginx nginx -s reload"
