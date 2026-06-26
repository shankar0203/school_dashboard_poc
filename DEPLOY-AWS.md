# Deploy & test on AWS (EC2 + RDS MySQL)

Goal: stand up the same app in AWS so you validate the cloud environment early.

```
   Browser ──HTTPS──►  EC2  ──►  Nginx (serves the built UI)
                         │
                         └──►  Express API (Node, pm2)  ──►  RDS MySQL
```

Three parts: **RDS** (database), **EC2** (server), and the **Express API** that
connects them. The UI code does **not** change.

---

## PART 1 — RDS MySQL (the database)

1. **RDS → Create database** → Standard create → **MySQL 8.x**.
2. Templates: **Free tier** (or Dev/Test). Instance: **db.t3.micro**. Storage 20 GB.
3. Set **master username** (e.g. `admin`) and a **master password** — note them down.
4. **Connectivity:**
   - Public access: **Yes** (so you can load data from Workbench on your laptop for this test).
   - Create/choose a **VPC security group** for the DB.
5. Create it, wait until **Available**, then copy the **Endpoint** (looks like
   `school-db.xxxxxx.ap-south-1.rds.amazonaws.com`).
6. **Security group → inbound rules** → add:
   - Type **MySQL/Aurora (3306)**, Source **My IP** (your laptop, for Workbench).
   - (Later) Type **MySQL/Aurora (3306)**, Source = the **EC2 security group**.

### Load the data into RDS
1. In **MySQL Workbench → + (new connection)**:
   - Hostname = the RDS **Endpoint**, Port = **3306**
   - Username = your master user, Password = your master password → Test → OK.
2. Open **`db/aws-rds-setup.sql`** (schema + sample data in one file) → run **⚡**.
3. Verify: `USE school_app; SELECT COUNT(*) FROM students;` → should return **6**.

> The SQL is identical to local — nothing AWS-specific in it. If it loaded locally,
> it loads on RDS.

---

## PART 2 — EC2 (the server)

1. **EC2 → Launch instance** → **Ubuntu 22.04**, type **t2.micro / t3.micro**.
2. Create/download a **key pair** (.pem) for SSH.
3. **Security group** inbound rules:
   - **SSH (22)** — Source **My IP**
   - **HTTP (80)** — Source Anywhere
   - **HTTPS (443)** — Source Anywhere
4. Launch, copy the instance **Public IP**.

### SSH in and install the runtime
```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

# Node 20 + nginx + pm2 + git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm install -g pm2
```

### Get the code onto EC2
Either `git clone` your repo, or copy the folder up from your laptop:
```bash
# from your LAPTOP terminal (not the EC2 one):
scp -i your-key.pem -r ~/Documents/school-app-poc ubuntu@<EC2_PUBLIC_IP>:~/
```

### Build the UI
```bash
cd ~/school-app-poc
npm install
npm run build          # produces dist/
```

### Serve the UI with Nginx
```bash
sudo tee /etc/nginx/sites-available/schoolapp >/dev/null <<'NGINX'
server {
    listen 80;
    server_name _;
    root /home/ubuntu/school-app-poc/dist;
    index index.html;

    # SPA fallback
    location / { try_files $uri /index.html; }

    # API proxy (used once the Express backend is running on port 4000)
    location /api/ { proxy_pass http://127.0.0.1:4000/; }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/schoolapp /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

Open `http://<EC2_PUBLIC_IP>` — the UI loads. ✅ (This already proves EC2 + Nginx work.)

---

## PART 3 — the Express API (connects UI ↔ RDS)

This is the **one missing piece** and it must be built before the AWS UI reads
real RDS data. Until it exists, the UI on EC2 shows the same mock data as local.

The API will:
- read DB credentials (RDS endpoint, user, password) from a `.env` on EC2,
- expose routes like `/api/students`, `/api/attendance`, `/api/marks`, `/api/messages`, `/api/fees`,
- be run with `pm2 start server.js` so it stays up,
- be reached by the UI through the Nginx `/api/` proxy above.

Then one small change in `src/config` / `src/services/dataService.js` points the
app at `/api` instead of mock data — rebuild, and the AWS app is fully live on RDS.

> Tell me to build the backend and I'll generate `server.js`, the route files,
> the `.env.example`, and the exact `dataService.js` edit.

---

## HTTPS (before real use)
Once a domain points at the EC2 IP, add free TLS:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```
This fixes the plaintext-login issue flagged earlier.

---

## Quick checklist
- [ ] RDS MySQL created, endpoint noted, SG allows your IP on 3306
- [ ] `aws-rds-setup.sql` run on RDS (students = 6)
- [ ] EC2 up, SG allows 22/80/443
- [ ] Node + Nginx installed, code copied, `npm run build` done
- [ ] UI loads at `http://<EC2_IP>`
- [ ] (next) Express API built + `.env` with RDS creds + `pm2` running
- [ ] (next) `dataService.js` pointed at `/api`, rebuilt
- [ ] HTTPS via certbot once a domain is attached
