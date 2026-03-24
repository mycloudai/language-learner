#!/bin/sh
# Generate .htpasswd for nginx basic auth
# Usage: ./generate-htpasswd.sh <username> <password>
# Example: ./generate-htpasswd.sh admin mysecurepassword

set -e

USERNAME="${1:-admin}"
PASSWORD="${2:-changeme}"
OUTPUT_FILE="${3:-deploy/nginx/.htpasswd}"

# Use openssl to generate bcrypt-compatible password hash
HASH=$(openssl passwd -apr1 "$PASSWORD")
echo "${USERNAME}:${HASH}" > "$OUTPUT_FILE"

echo "Generated $OUTPUT_FILE for user: $USERNAME"
echo "⚠️  Remember to change the default password before deploying!"
