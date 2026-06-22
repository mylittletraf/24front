#!/usr/bin/env bash
#
# provision_storage_server.sh — set up a remote storage VDS (Ubuntu 24.04) for the
# video/image upload pipeline (see storage.md §10–14). Run ON the VDS as root:
#
#   sudo bash provision_storage_server.sh \
#     --domain storage-01.example.com --email you@example.com \
#     --pubkey-file ./uploader_id_ed25519.pub --role combined
#     --media-secret
# It installs nginx + certbot, creates the storage tree, a key-only `media` SSH
# user, an HTTPS nginx vhost, runs a smoke test, and prints the
# `register_storage_server` command(s) to run from the backend folder.
#
# Signed HLS (MEDIA_PROTECTION) is mandatory: --media-secret <SECRET> is REQUIRED
# for roles video/combined. nginx secure_link protects /v/<uuid>/*.{m3u8,m4s,ts}.
# The SAME secret must be set as MEDIA_SIGNING_SECRET in the backend .env AND on
# every other storage server (the signature doesn't include the hostname), or
# segment requests 403. Generate one with: openssl rand -hex 32
# Posters/screens/trailer stay public (not matched by the protected location).
#
set -euo pipefail

# ---- defaults ---------------------------------------------------------------
DOMAIN=""
EMAIL=""
PUBKEY=""
PUBKEY_FILE=""
ROLE="combined"
ROOT=""
IMAGE_DIRS="actor studio tags category"
USER_NAME="media"
HARDEN_SSH=0
MEDIA_SECRET=""

die() { echo "ERROR: $*" >&2; exit 1; }
note() { echo ">> $*"; }

# ---- arg parsing ------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain)        DOMAIN="$2"; shift 2 ;;
        --email)         EMAIL="$2"; shift 2 ;;
        --pubkey)        PUBKEY="$2"; shift 2 ;;
        --pubkey-file)   PUBKEY_FILE="$2"; shift 2 ;;
        --role)          ROLE="$2"; shift 2 ;;
        --root)          ROOT="$2"; shift 2 ;;
        --image-dirs)    IMAGE_DIRS="$2"; shift 2 ;;
        --user)          USER_NAME="$2"; shift 2 ;;
        --media-secret)  MEDIA_SECRET="$2"; shift 2 ;;
        --harden-ssh)    HARDEN_SSH=1; shift ;;
        -h|--help)
            grep '^#' "$0" | sed 's/^# \?//'; exit 0 ;;
        *) die "Unknown argument: $1" ;;
    esac
done

# ---- validation -------------------------------------------------------------
[[ $EUID -eq 0 ]] || die "Must run as root (use sudo)."
[[ -n "$DOMAIN" ]] || die "--domain is required."
[[ -n "$EMAIL" ]] || die "--email is required."
case "$ROLE" in video|image|combined) ;; *) die "--role must be video|image|combined." ;; esac

# Signed HLS is mandatory for any role that serves /v/ streaming files. The same
# value must be set as MEDIA_SIGNING_SECRET in the backend .env.
if [[ "$ROLE" != "image" && -z "$MEDIA_SECRET" ]]; then
    die "--media-secret is required for role '$ROLE'. Generate one shared across ALL storage
servers + the backend, e.g.:  openssl rand -hex 32"
fi

if [[ -n "$PUBKEY_FILE" ]]; then
    [[ -f "$PUBKEY_FILE" ]] || die "--pubkey-file not found: $PUBKEY_FILE"
    PUBKEY="$(cat "$PUBKEY_FILE")"
fi
[[ -n "$PUBKEY" ]] || die "--pubkey or --pubkey-file is required."

# role-dependent root default
if [[ -z "$ROOT" ]]; then
    case "$ROLE" in
        combined) ROOT="/var/www/storage" ;;
        video)    ROOT="/var/www/video-storage" ;;
        image)    ROOT="/var/www/image-storage" ;;
    esac
fi

# DNS sanity check (warn only)
SERVER_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
RESOLVED_IP="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -n1 || true)"
if [[ -n "$RESOLVED_IP" && -n "$SERVER_IP" && "$RESOLVED_IP" != "$SERVER_IP" ]]; then
    note "WARNING: $DOMAIN resolves to $RESOLVED_IP, server IP is $SERVER_IP. certbot may fail."
elif [[ -z "$RESOLVED_IP" ]]; then
    note "WARNING: $DOMAIN does not resolve yet. Point an A record at this server first."
fi

# ---- 2. packages ------------------------------------------------------------
note "Installing packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx rsync ufw

# ---- 3. media user + ssh key ------------------------------------------------
note "Configuring user '$USER_NAME'..."
if ! id "$USER_NAME" >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash "$USER_NAME"
fi
HOME_DIR="$(getent passwd "$USER_NAME" | cut -d: -f6)"
install -d -m 700 -o "$USER_NAME" -g "$USER_NAME" "$HOME_DIR/.ssh"
AUTH_KEYS="$HOME_DIR/.ssh/authorized_keys"
touch "$AUTH_KEYS"
if ! grep -qF "$PUBKEY" "$AUTH_KEYS"; then
    echo "$PUBKEY" >> "$AUTH_KEYS"
fi
chmod 600 "$AUTH_KEYS"
chown "$USER_NAME:$USER_NAME" "$AUTH_KEYS"

# ---- 4. directory tree ------------------------------------------------------
note "Creating storage tree under $ROOT..."
install -d -m 755 "$ROOT"
mkdir -p "$ROOT/_healthcheck"
case "$ROLE" in
    video)    mkdir -p "$ROOT/v" ;;
    image)    for d in $IMAGE_DIRS; do mkdir -p "$ROOT/$d"; done ;;
    combined) mkdir -p "$ROOT/v"; for d in $IMAGE_DIRS; do mkdir -p "$ROOT/$d"; done ;;
esac
chown -R "$USER_NAME:www-data" "$ROOT"
chmod 2755 "$ROOT"               # setgid so new files inherit www-data group
find "$ROOT" -type d -exec chmod 2755 {} +

# ---- 5. nginx vhost ---------------------------------------------------------
note "Writing nginx vhost..."
SITE="/etc/nginx/sites-available/storage"

# Per-role location block + MIME + cache.
if [[ "$ROLE" == "video" ]]; then
    LOCATION="/v/"
    read -r -d '' MIME <<'EOF' || true
        types {
            video/mp4 mp4;
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
            image/webp webp;
        }
EOF
    # Streaming files (m3u8/ts/m4s) are served ONLY by the protected /v/ location, so they must
    # NOT appear here — otherwise this public cache location shadows them and serves them unsigned.
    CACHE_RE='\.(mp4|webp)$'
    CACHE_TTL="30d"
elif [[ "$ROLE" == "image" ]]; then
    LOCATION="/"
    read -r -d '' MIME <<'EOF' || true
        types {
            image/webp webp;
            image/jpeg jpg jpeg;
            image/png png;
        }
EOF
    CACHE_RE='\.(webp|jpg|jpeg|png)$'
    CACHE_TTL="90d"
else  # combined
    LOCATION="/"
    read -r -d '' MIME <<'EOF' || true
        types {
            video/mp4 mp4;
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
            image/webp webp;
            image/jpeg jpg jpeg;
            image/png png;
        }
EOF
    # Streaming files (m3u8/ts/m4s) are served ONLY by the protected /v/ location — keep them out
    # of this public cache regex or it shadows the secure_link location and serves them unsigned.
    CACHE_RE='\.(mp4|webp|jpg|jpeg|png)$'
    CACHE_TTL="30d"
fi

# Signed-HLS protection (MEDIA_PROTECTION). One token signs the /v/<uuid>/ prefix,
# so it's valid for the master, variants and all segments until $arg_expires. All streaming
# files (.m3u8/.m4s/.ts) are protected; the backend reads the source .m3u8 from storage with a
# matching signed URL (same MEDIA_SIGNING_SECRET), so its playlist build still works.
# Posters/trailer fall through to the public location. nginx vars are escaped (\$) so bash
# doesn't expand them; the literal secret IS substituted. As a top-level regex location it is
# matched before the prefix one.
PROTECTED=""
if [[ "$ROLE" != "image" ]]; then
    PROTECTED=$(cat <<EOF
    location ~ ^/v/(?<vid>[0-9a-f-]+)/.+\.(m3u8|m4s|ts)\$ {
        secure_link      \$arg_token,\$arg_expires;
        secure_link_md5  "${MEDIA_SECRET}/v/\$vid/\$arg_expires";
        if (\$secure_link = "")  { return 403; }
        if (\$secure_link = "0") { return 410; }

        add_header Access-Control-Allow-Origin * always;
        add_header Accept-Ranges bytes always;
        add_header Cache-Control "private, max-age=3600";
        add_header X-Robots-Tag "noindex" always;
        types {
            application/vnd.apple.mpegurl m3u8;
            video/iso.segment m4s;
            video/mp2t ts;
        }
    }
EOF
)
fi

cat > "$SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    root $ROOT;

$PROTECTED

    location $LOCATION {
        autoindex off;

        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Range, Origin, Accept, Content-Type" always;
        add_header Accept-Ranges bytes always;

$MIME

        location ~* $CACHE_RE {
            # nginx only inherits add_header when a block defines NONE of its own, so the
            # parent's CORS/Range headers must be repeated here or every cached media file
            # (i.e. all of them) is served without Access-Control-Allow-Origin → HLS.js fails.
            add_header Access-Control-Allow-Origin * always;
            add_header Accept-Ranges bytes always;
            expires $CACHE_TTL;
            add_header Cache-Control "public, immutable" always;
        }
    }
}
EOF

ln -sf "$SITE" /etc/nginx/sites-enabled/storage
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---- 6. firewall (BEFORE certbot: HTTP-01 needs port 80 reachable) ----------
# Must run before certbot — if ufw is already active with "deny incoming"
# (common on servers set up by VPN/fail2ban), Let's Encrypt's HTTP-01 challenge
# on port 80 would time out.
note "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ---- 7. HTTPS via certbot ---------------------------------------------------
note "Requesting Let's Encrypt certificate..."
certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos -n --redirect

# ---- 8. smoke test ----------------------------------------------------------
note "Running smoke test..."
if [[ "$ROLE" == "video" ]]; then
    HC_DIR="$ROOT/v/_healthcheck"
    HC_URL="https://$DOMAIN/v/_healthcheck/ok.txt"
else
    HC_DIR="$ROOT/_healthcheck"
    HC_URL="https://$DOMAIN/_healthcheck/ok.txt"
fi
mkdir -p "$HC_DIR"
echo "ok" > "$HC_DIR/ok.txt"
chown -R "$USER_NAME:www-data" "$ROOT/_healthcheck" "$ROOT/v/_healthcheck" 2>/dev/null || true
if curl -fsS "$HC_URL" >/dev/null; then
    note "Smoke test OK: $HC_URL"
else
    die "Smoke test failed: $HC_URL not reachable."
fi
rm -f "$HC_DIR/ok.txt"

# ---- optional SSH hardening -------------------------------------------------
if [[ "$HARDEN_SSH" -eq 1 ]]; then
    echo
    echo "!!! HARDENING SSH: disabling password login and root login. Make sure your"
    echo "!!! key works BEFORE closing this session, or you may lock yourself out."
    sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
    systemctl reload ssh
fi

# ---- 9. print backend registration commands ---------------------------------
print_register_cmd() {
    local stype="$1"
    cat <<EOF
poetry run python manage.py register_storage_server \\
  --name "Remote $stype 01" --slug remote-$stype-01 --type $stype --backend vds_nginx \\
  --public-base-url https://$DOMAIN \\
  --upload-host $DOMAIN --upload-port 22 \\
  --upload-path $ROOT --upload-username $USER_NAME --capacity-gb 0
EOF
}

cat <<EOF

============================================================================
DONE. VDS is serving https://$DOMAIN  (root: $ROOT, role: $ROLE)

Run the following FROM THE BACKEND PROJECT FOLDER to register the storage:
----------------------------------------------------------------------------
EOF
case "$ROLE" in
    video)    print_register_cmd video ;;
    image)    print_register_cmd image ;;
    combined) print_register_cmd video; echo; print_register_cmd image ;;
esac
cat <<EOF
----------------------------------------------------------------------------
EOF
if [[ -n "$MEDIA_SECRET" && "$ROLE" != "image" ]]; then
    cat <<EOF
Signed HLS is ON. Set this in the backend .env (must match exactly):
    MEDIA_SIGNING_SECRET=${MEDIA_SECRET}
Direct /v/<uuid>/*.{m3u8,m4s,ts} without a valid ?token&expires now return 403/410.
----------------------------------------------------------------------------
EOF
fi
cat <<EOF
Security: restrict SSH access for '$USER_NAME' to the uploader machine's IP
(e.g. ufw rule or sshd Match/AllowUsers) — see storage.md §13.
============================================================================
EOF
