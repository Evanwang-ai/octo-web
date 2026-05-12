#!/usr/bin/env sh

set -eu

# Default optional URLs to blank so the corresponding location blocks
# short-circuit to 503 if the backend is not deployed. When running inside
# the OCTO compose stack, set these from .env.
: "${SUMMARY_API_URL:=}"
: "${MATTER_API_URL:=}"
# Resolver for runtime DNS lookups. 127.0.0.11 = docker embedded DNS.
# For Kubernetes set NGINX_RESOLVER=kube-dns.kube-system.svc.cluster.local
: "${NGINX_RESOLVER:=127.0.0.11}"
export SUMMARY_API_URL MATTER_API_URL NGINX_RESOLVER

envsubst '${API_URL} ${SUMMARY_API_URL} ${MATTER_API_URL} ${NGINX_RESOLVER}' \
    < /nginx.conf.template > /etc/nginx/conf.d/default.conf


exec "$@"
