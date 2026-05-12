#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Verificando Caddy..."
if ! command -v caddy &> /dev/null; then
  echo "  Instalando Caddy via brew..."
  brew install caddy
else
  echo "  Caddy OK: $(caddy version)"
fi

echo "→ Verificando /etc/hosts..."
if grep -q "finanzas.local" /etc/hosts; then
  echo "  finanzas.local ya existe"
else
  echo ""
  echo "  ACCIÓN REQUERIDA — ejecutá esto una vez:"
  echo "  echo '127.0.0.1 finanzas.local' | sudo tee -a /etc/hosts"
  echo ""
fi

echo "→ Iniciando Caddy..."
caddy stop 2>/dev/null || true
caddy start --config "$REPO_ROOT/Caddyfile"

echo ""
echo "✓ Caddy corriendo."
echo "  Una vez que pnpm dev esté andando:"
echo "  → http://finanzas.local:4001"
echo ""
echo "  Flujo de trabajo:"
echo "  pnpm dev:fresh    # arranca limpio siempre"
