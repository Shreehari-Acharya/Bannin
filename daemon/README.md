# Bannin Daemon

`daemon/` contains the local agent API, Falco event listener, guided terminal setup, and backend dispatch logic used by Bannin.

## Terminal Flow

`go run ./cmd/daemon init` now provides a guided Falco-only setup experience:

1. Install and configure Falco
2. Optionally collect a project path for backend context
3. Optionally request Falco rule generation from `BANNIN_BACKEND_URL`
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
