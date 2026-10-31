#!/usr/bin/env bash
# =============================================================================
# VyaraHR Automated VPS Setup Script
# Target: Ubuntu 22.04 / 24.04 LTS (Hostinger VPS / AWS EC2 / DigitalOcean)
# Fully prepares native PostgreSQL, Node.js 20, Nginx, PM2, and SSL
# =============================================================================

set -e

# ANSI Color Output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${GREEN}   VyaraHR Self-Hosted SaaS Deployment & VPS Provisioning Script     ${NC}"
echo -e "${BLUE}=====================================================================${NC}"

# Check root privilege
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root or using sudo.${NC}"
  exit 1
fi

APP_DIR="/var/www/vyarahr"
DB_NAME="vyarahr_db"
DB_USER="vyarahr_user"
DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)
JWT_SECRET=$(openssl rand -hex 32)

echo -e "\n${YELLOW}[1/7] Updating system packages...${NC}"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git unzip build-essential ufw software-properties-common

echo -e "\n${YELLOW}[2/7] Installing Node.js 20 LTS & PM2...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
pm2 startup systemd -u root --hp /root

echo -e "\n${YELLOW}[3/7] Installing and configuring PostgreSQL 16...${NC}"
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get update -y
apt-get install -y postgresql-16 postgresql-contrib-16

systemctl start postgresql
systemctl enable postgresql

# Create Database and Role
echo -e "${BLUE}Configuring PostgreSQL database '${DB_NAME}' and role '${DB_USER}'...${NC}"
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" || true
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d ${DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

echo -e "\n${YELLOW}[4/7] Installing Nginx & Certbot...${NC}"
apt-get install -y nginx certbot python3-certbot-nginx
systemctl start nginx
systemctl enable nginx

echo -e "\n${YELLOW}[5/7] Preparing Application Directory & Permissions...${NC}"
mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/backend/uploads/membership-proofs
mkdir -p ${APP_DIR}/backend/uploads/membership-invoices
mkdir -p ${APP_DIR}/backend/uploads/avatars
mkdir -p ${APP_DIR}/backend/uploads/documents
mkdir -p ${APP_DIR}/logs

# Populate backend .env
cat <<EOF > ${APP_DIR}/backend/.env
PORT=54321
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
STORAGE_LOCAL_ROOT=${APP_DIR}/backend/uploads
NODE_ENV=production
EOF

echo -e "${GREEN}Created ${APP_DIR}/backend/.env successfully.${NC}"

# Run Master Schema Migration
if [ -f "${APP_DIR}/backend/schema/init_master.sql" ]; then
    echo -e "${BLUE}Applying Master DDL schema migration...${NC}"
    PGPASSWORD=${DB_PASS} psql -h 127.0.0.1 -U ${DB_USER} -d ${DB_NAME} -f ${APP_DIR}/backend/schema/init_master.sql
fi

echo -e "\n${YELLOW}[6/7] Configuring Nginx Reverse Proxy...${NC}"
if [ -f "${APP_DIR}/nginx/app.conf" ]; then
    cp ${APP_DIR}/nginx/app.conf /etc/nginx/sites-available/vyarahr
    ln -sf /etc/nginx/sites-available/vyarahr /etc/nginx/sites-enabled/vyarahr
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
fi

echo -e "\n${YELLOW}[7/7] Configuring Firewall (UFW)...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo -e "\n${GREEN}=====================================================================${NC}"
echo -e "${GREEN}   VyaraHR VPS Infrastructure Provisioned Successfully!             ${NC}"
echo -e "${GREEN}=====================================================================${NC}"
echo -e "Database Name:     ${DB_NAME}"
echo -e "Database User:     ${DB_USER}"
echo -e "Database Password: ${DB_PASS}"
echo -e "JWT Secret:        ${JWT_SECRET}"
echo -e "Backend Port:      54321"
echo -e "Nginx Status:      Active"
echo -e "\n${YELLOW}Next Deployment Steps:${NC}"
echo -e "1. CD to ${APP_DIR} and install dependencies: npm install"
echo -e "2. Build frontend: npm --workspace=frontend run build"
echo -e "3. Start backend service: pm2 start ecosystem.config.cjs --env production"
echo -e "4. Save PM2 state: pm2 save"
echo -e "5. Install SSL Certificate: certbot --nginx -d your-domain.com"
echo -e "====================================================================="
