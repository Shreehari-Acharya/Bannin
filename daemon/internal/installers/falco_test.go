package installers

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

type fakeRunner struct {
	lookups  map[string]error
	commands [][]string
	runErr   error
	scripts  []string
}

func (f *fakeRunner) LookPath(name string) error {
	if err, ok := f.lookups[name]; ok {
		return err
	}
	return errors.New("not found")
}

func (f *fakeRunner) Run(name string, args ...string) error {
	cmd := append([]string{name}, args...)
	f.commands = append(f.commands, cmd)
	return f.runErr
}

func (f *fakeRunner) RunScript(script string) error {
	f.scripts = append(f.scripts, script)
	return f.runErr
}

type testFileSystem struct {
	root string
}

func (t testFileSystem) MkdirAll(path string, perm os.FileMode) error {
	return os.MkdirAll(filepath.Join(t.root, path), perm)
}

func (t testFileSystem) WriteFile(name string, data []byte, perm os.FileMode) error {
	full := filepath.Join(t.root, name)
	if err := os.MkdirAll(filepath.Dir(full), 0755); err != nil {
		return err
	}
	return os.WriteFile(full, data, perm)
}

func (t testFileSystem) Stat(name string) (os.FileInfo, error) {
	return os.Stat(filepath.Join(t.root, name))
}

func TestFalcoInstallSkipsWhenAlreadyInstalled(t *testing.T) {
	runner := &fakeRunner{lookups: map[string]error{"falco": nil}}
	tool := &FalcoTool{runner: runner, fs: testFileSystem{root: t.TempDir()}}

	if err := tool.Install(); err != nil {
		t.Fatalf("Install: %v", err)
	}
	if len(runner.commands) != 0 || len(runner.scripts) != 0 {
		t.Fatal("expected no install commands when falco is already present")
	}
}

func TestFalcoInstallPrefersAPT(t *testing.T) {
	runner := &fakeRunner{lookups: map[string]error{"apt": nil}}
	tool := &FalcoTool{runner: runner, fs: testFileSystem{root: t.TempDir()}}

	if err := tool.Install(); err != nil {
		t.Fatalf("Install: %v", err)
	}
	if len(runner.scripts) != 1 {
		t.Fatalf("expected apt script to run once, got %d", len(runner.scripts))
	}
}

func TestFalcoConfigureWritesBANNINConfig(t *testing.T) {
	root := t.TempDir()
	tool := &FalcoTool{runner: &fakeRunner{}, fs: testFileSystem{root: root}}

	if err := tool.Configure(); err != nil {
		t.Fatalf("Configure: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(root, "/etc/falco/config.d/bannin.yaml"))
	if err != nil {
		t.Fatalf("read config: %v", err)
	}
	if string(data) == "" {
		t.Fatal("expected config file contents")
	}
}

func TestFalcoStartReturnsError(t *testing.T) {
	tool := &FalcoTool{
		runner: &fakeRunner{runErr: errors.New("systemctl failed")},
		fs:     testFileSystem{root: t.TempDir()},
	}

	err := tool.Start()
	if err == nil || err.Error() == "" {
		t.Fatalf("expected start error, got %v", err)
	}
}
