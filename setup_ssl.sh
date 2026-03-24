#!/bin/bash
set -e

echo "=== Install e abilita moduli Apache ==="
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-apache

a2enmod rewrite proxy proxy_http

echo "=== Configura VirtualHost ==="
mv /tmp/cfo.findmeyou.app.conf /etc/apache2/sites-available/cfo.findmeyou.app.conf
a2ensite cfo.findmeyou.app.conf

echo "=== Riavvia Apache e ottieni SSL ==="
systemctl reload apache2

certbot --apache -d cfo.findmeyou.app --non-interactive --agree-tos -m admin@findmeyou.app --redirect || echo "Certbot fallito o già configurato, controllare DNS."

systemctl reload apache2
echo "=== Fine SSL Setup ==="
