# TLS Flip — Zero-downtime certificate rotation runbook

> Operations runbook. Follow top-to-bottom. Last reviewed: 2026-09-07.

## 1. When to use this

Rotate the TLS certificate for the public-facing endpoint (Nginx in front
of the FastAPI backend and the Vite-built dashboard) without dropping
in-flight requests.

This runbook assumes:
- Nginx serving HTTPS on 443, proxying `/api` to uvicorn and `/` to the
  static frontend build.
- Certificates live at `/etc/ssl/nussif/` as `fullchain.pem` and
  `privkey.pem`.
- The new cert is already issued (Let's Encrypt, internal CA, or
  manual) and staged at `/etc/ssl/nussif/new/fullchain.pem` +
  `privkey.pem`.

## 2. Pre-flight (≤ 5 minutes, no impact)

1. **Verify the new cert chain is valid:**
   ```bash
   openssl x509 -in /etc/ssl/nussif/new/fullchain.pem -noout -text | head -20
   openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt /etc/ssl/nussif/new/fullchain.pem
   ```
   Both must succeed. If `openssl verify` fails, stop — do not proceed.

2. **Check expiry:**
   ```bash
   openssl x509 -in /etc/ssl/nussif/new/fullchain.pem -noout -enddate
   ```
   Confirm `notAfter` is in the future and matches expectation.

3. **Diff SANs against the old cert:**
   ```bash
   diff <(openssl x509 -in /etc/ssl/nussif/fullchain.pem -noout -text | grep -A1 'Subject Alternative Name') \
        <(openssl x509 -in /etc/ssl/nussif/new/fullchain.pem -noout -text | grep -A1 'Subject Alternative Name')
   ```
   Only hostnames you intended to add/remove should differ.

4. **Back up the current cert:**
   ```bash
   cp -a /etc/ssl/nussif/fullchain.pem /etc/ssl/nussif/fullchain.pem.$(date +%F).bak
   cp -a /etc/ssl/nussif/privkey.pem   /etc/ssl/nussif/privkey.pem.$(date +%F).bak
   ```

5. **Confirm the private key matches the cert:**
   ```bash
   diff <(openssl x509 -in /etc/ssl/nussif/new/fullchain.pem -pubkey -noout) \
        <(openssl pkey -in /etc/ssl/nussif/new/privkey.pem -pubout 2>/dev/null)
   ```
   Empty diff = match. Non-empty = wrong key, stop.

## 3. Stage the new cert (no impact)

1. **Copy new cert into place with a `.new` suffix:**
   ```bash
   install -m 644 /etc/ssl/nussif/new/fullchain.pem /etc/ssl/nussif/fullchain.pem.new
   install -m 600 /etc/ssl/nussif/new/privkey.pem   /etc/ssl/nussif/privkey.pem.new
   chown root:root /etc/ssl/nussif/fullchain.pem.new /etc/ssl/nussif/privkey.pem.new
   ```

2. **Test Nginx config with the new cert (atomic swap via symlink):**
   ```bash
   ln -sf fullchain.pem.new /etc/ssl/nussif/fullchain.pem.live
   ln -sf privkey.pem.new   /etc/ssl/nussif/privkey.pem.live
   nginx -t
   ```
   `nginx -t` must report `syntax is ok` and `test is successful`. If it
   fails, the symlink swap is not yet active — fix the config before reload.

## 4. Reload (the "flip", < 1 second of in-flight tolerance)

Nginx `reload` is graceful: the master process starts new workers with the
new config and lets old workers finish their in-flight requests.

```bash
nginx -s reload
```

Immediately verify:
```bash
# new workers should appear, old workers draining
ps -ef | grep nginx
# the public endpoint should present the new cert
echo | openssl s_client -connect localhost:443 -servername nussif.example 2>/dev/null \
  | openssl x509 -noout -dates
```

## 5. Atomic symlink swap (optional, for full zero-downtime)

If you want the on-disk path to flip atomically without a reload gap:
```bash
ln -Tf fullchain.pem.new /etc/ssl/nussif/fullchain.pem
ln -Tf privkey.pem.new   /etc/ssl/nussif/privkey.pem
nginx -t && nginx -s reload
```

`ln -Tf` is atomic on Linux: the symlink target is replaced in one
syscall, so readers never see a missing file.

## 6. Verify (≤ 2 minutes)

1. **External probe** (from a different host):
   ```bash
   curl -vI https://nussif.example/health 2>&1 | grep -E 'subject|expiry|SSL connection'
   echo | openssl s_client -connect nussif.example:443 -servername nussif.example 2>/dev/null \
     | openssl x509 -noout -dates -issuer
   ```
   The `notBefore` / `notAfter` should reflect the new cert.

2. **Health check through the stack:**
   ```bash
   curl -s https://nussif.example/health/ready
   ```
   Must return 200.

3. **Dashboard smoke test:** open the dashboard, confirm it loads and the
   Overview page shows fresh pipeline runs.

## 7. Rollback

If anything fails verification:

```bash
ln -Tf fullchain.pem.$(date +%F).bak /etc/ssl/nussif/fullchain.pem
ln -Tf privkey.pem.$(date +%F).bak   /etc/ssl/nussif/privkey.pem
nginx -t && nginx -s reload
```

Re-run §6. If rollback also fails, restore from the backup and page the
on-call — a bad rollback means the on-disk cert is corrupt and the
service is down.

## 8. Post-flight

- Remove `.new` files and the old backups after 24 hours of clean operation.
- Update `docs/CURRENT_STATE.md` with the rotation date.
- File an issue if the cert was rotated because of imminent expiry — the
  renewal automation (certbot or internal ACME client) is broken and needs
  fixing before the next rotation.

## 9. Automation target

Manual today. Target: an internal ACME client renews 30 days before
expiry and runs §2–§4 automatically, with a Slack notification on
success and a PagerDuty alert on failure. This runbook then only covers
the rare manual rotation.
