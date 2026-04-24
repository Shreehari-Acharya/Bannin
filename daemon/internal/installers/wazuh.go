package installers

import (
	"fmt"
	"strings"
)

type WazuhTool struct {
	runner CommandRunner
	fs     FileSystem
}

func NewWazuhTool() *WazuhTool {
	return &WazuhTool{
		runner: OSCommandRunner{},
		fs:     OSFileSystem{},
	}
}

func (w *WazuhTool) Name() string {
	return "Wazuh"
}

func (w *WazuhTool) Description() string {
	return "Unified XDR and SIEM platform with manager, indexer, and dashboard"
}

func (w *WazuhTool) Install() error {
	if w.isInstalled() {
		return nil
	}

	if err := w.commandRunner().LookPath("apt"); err == nil {
		return w.InstallAPT()
	}

	if err := w.commandRunner().LookPath("dnf"); err == nil {
		return w.InstallRPM("dnf")
	}

	if err := w.commandRunner().LookPath("yum"); err == nil {
		return w.InstallRPM("yum")
	}

	return fmt.Errorf("unsupported operating system: no known package manager found")
}

func (w *WazuhTool) InstallAPT() error {
	script := `
set -e
apt-get update -y
apt-get install -y curl coreutils libcap2-bin tar
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
cd "$workdir"
curl -sS -O https://packages.wazuh.com/4.14/wazuh-install.sh
bash ./wazuh-install.sh -a
`

	if err := w.commandRunner().RunScript(script); err != nil {
		return fmt.Errorf("failed to run Wazuh assisted installer on apt-based system: %w", err)
	}

	return nil
}

func (w *WazuhTool) InstallRPM(packageManager string) error {
	script := fmt.Sprintf(`
set -e
%s install -y curl coreutils libcap tar
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
cd "$workdir"
curl -sS -O https://packages.wazuh.com/4.14/wazuh-install.sh
bash ./wazuh-install.sh -a
`, packageManager)

	if err := w.commandRunner().RunScript(script); err != nil {
		return fmt.Errorf("failed to run Wazuh assisted installer on rpm-based system: %w", err)
	}

	return nil
}

func (w *WazuhTool) Configure() error {
	return nil
}

func (w *WazuhTool) Start() error {
	if err := w.commandRunner().Run("systemctl", "daemon-reload"); err != nil {
		return fmt.Errorf("failed to reload systemd: %w", err)
	}

	services := []string{
		"wazuh-indexer",
		"wazuh-manager",
		"filebeat",
		"wazuh-dashboard",
	}

	for _, service := range services {
		if !systemdUnitExists(w.commandRunner(), service) {
			continue
		}
		if err := w.commandRunner().Run("systemctl", "enable", "--now", service); err != nil {
			return fmt.Errorf("failed to enable/start %s: %w", service, err)
		}
	}

	return nil
}

func (w *WazuhTool) isInstalled() bool {
	paths := []string{
		"/var/ossec",
		"/etc/wazuh-indexer",
		"/etc/wazuh-dashboard",
	}

	for _, path := range paths {
		if _, err := w.fileSystem().Stat(path); err != nil {
			return false
		}
	}

	return true
}

func systemdUnitExists(runner CommandRunner, name string) bool {
	buffer := &strings.Builder{}
	SetCommandOutput(buffer)
	defer SetCommandOutput(nil)

	if err := runner.Run("systemctl", "list-unit-files", name+".service", "--no-legend"); err != nil {
		return false
	}

	return strings.Contains(buffer.String(), name+".service")
}

func (w *WazuhTool) commandRunner() CommandRunner {
	if w.runner == nil {
		w.runner = OSCommandRunner{}
	}
	return w.runner
}

func (w *WazuhTool) fileSystem() FileSystem {
	if w.fs == nil {
		w.fs = OSFileSystem{}
	}
	return w.fs
}
