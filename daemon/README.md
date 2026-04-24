# Bannin Daemon

`daemon/` contains the local agent API, Falco event listener, guided terminal setup, and backend dispatch logic used by Bannin.

## Backend URL Configuration

The daemon uses a hardcoded backend URL in `cmd/daemon/main.go`:

- `const backendURL = "http://localhost:3000"`

Update that constant if your backend is running elsewhere.

## Terminal Flow

`go run ./cmd/daemon init` now provides a guided Falco-only setup experience:

1. Install and configure Falco
2. Optionally collect a project path for backend context
3. Optionally request Falco rule generation from the hardcoded backend URL
4. Optionally restart Falco

The setup no longer prompts users about installing Suricata or Wazuh.

## Tests

Run the full suite with a writable Go cache:

```bash
env GOCACHE=/tmp/go-cache go test ./...
```

The test suite covers both positive and negative paths for:

- install orchestration
- Falco installer behavior
- backend HTTP dispatching
- local receiver HTTP handlers
- Falco event ingestion
