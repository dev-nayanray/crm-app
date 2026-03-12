# Deploy to Digital Ocean

## Commands to run on your server:

```
bash
# 1. Connect to your server
ssh root@your_server_ip

# 2. Navigate to your app directory
cd /var/www/leeds-crm

# 3. Pull the latest code
git pull origin main

# 4. Install dependencies
npm install

# 5. Build the frontend
npm run build

# 6. Copy build files to web directory
sudo rm -rf /var/www/leeds-crm/*
sudo cp -r dist/* /var/www/leeds-crm/
sudo chown -R www-data:www-data /var/www/leeds-crm/
sudo chmod -R 755 /var/www/leeds-crm/

# 7. Restart the backend (if using PM2)
pm2 restart all

# Or if using systemd
systemctl restart crm-app
```

## Important Notes:

1. Make sure your Telegram bot token is valid in `backend/server.cjs`
2. The bot must be added to your finance group with permission to send messages
3. Group Chat ID: -4744920512

## Bot will send:
- 💰 New Open Payment: Invoice # + Amount
- ✅ Paid: Hash + Amount
