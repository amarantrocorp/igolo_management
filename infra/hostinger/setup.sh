#!/bin/bash
# =============================================================================
# Hostinger KVM 8 Setup Script
# Server: 8 vCPU, 16GB RAM, 400GB SSD NVMe, Ubuntu 22.04
# Run as root on fresh Ubuntu 22.04: bash setup.sh
# =============================================================================
set -e

echo "=== Igolo Interior - Server Setup ==="

# 1. Update system
echo "[1/9] Updating system packages..."
apt update && apt upgrade -y

# 2. Install Docker + Docker Compose
echo "[2/9] Installing Docker..."
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# 3. Install Certbot
echo "[3/9] Installing Certbot..."
apt install -y certbot

# 4. Create app user
echo "[4/9] Creating igolo user..."
if ! id "igolo" &>/dev/null; then
    useradd -m -s /bin/bash igolo
    usermod -aG docker igolo
    echo "User 'igolo' created and added to docker group."
else
    echo "User 'igolo' already exists."
fi

# 5. Setup firewall
echo "[5/9] Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 6. Install fail2ban
echo "[6/9] Installing fail2ban..."
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# 7. Create directories
echo "[7/9] Creating application directories..."
mkdir -p /opt/igolo/{nginx,certbot/conf,certbot/www,backups}
chown -R igolo:igolo /opt/igolo

# 8. Setup swap (4GB for 16GB RAM server)
echo "[8/9] Setting up swap..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
    echo "4GB swap created."
else
    echo "Swap already exists."
fi

# 9. Kernel tuning for Docker
echo "[9/9] Applying kernel tuning..."
if ! grep -q "net.core.somaxconn=65535" /etc/sysctl.conf; then
    cat >> /etc/sysctl.conf << 'EOF'
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=65535
vm.overcommit_memory=1
EOF
    sysctl -p
    echo "Kernel parameters updated."
else
    echo "Kernel parameters already configured."
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Clone the repo:  su - igolo && git clone <repo-url> /opt/igolo"
echo "  2. Copy env file:   cp /opt/igolo/infra/hostinger/.env.production /opt/igolo/.env"
echo "  3. Edit env file:   nano /opt/igolo/.env  (fill in all CHANGE_ME values)"
echo "  4. Start services:  cd /opt/igolo && docker compose -f infra/hostinger/docker-compose.prod.yml up -d"
echo "  5. Get SSL cert:    certbot certonly --webroot -w /opt/igolo/certbot/www -d igolo.in -d '*.igolo.in'"
echo "  6. Run migrations:  docker compose -f infra/hostinger/docker-compose.prod.yml exec backend alembic upgrade head"
echo "  7. Setup backups:   crontab -e  # Add: 0 */6 * * * /opt/igolo/infra/hostinger/backup.sh"
echo "  8. Setup SSL renew: crontab -e  # Add: 0 3 * * * /opt/igolo/infra/hostinger/renew-ssl.sh"
