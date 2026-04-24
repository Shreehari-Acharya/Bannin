package app

import (
	"fmt"
	"strings"
	"sync"

	"github.com/Shreehari-Acharya/Bannin/daemon/internal/installers"
	tea "github.com/charmbracelet/bubbletea"
)

type LogFormatter interface {
	Phase(tool, phase, detail string) string
	Success(msg string) string
	Error(msg string) string
	Command(msg string) string
}

type InstallLogMsg struct {
	Line    string
	Advance int
}

type InstallDoneMsg struct {
	Err error
}

func RunInstallPipeline(tools []installers.SecurityTools, formatter LogFormatter, ch chan<- tea.Msg) {
	defer close(ch)

	emitter := &installLogWriter{ch: ch, formatter: formatter}
	installers.SetCommandOutput(emitter)
	defer installers.SetCommandOutput(nil)

	for _, tool := range tools {
		name := tool.Name()

		sendInstallLog(ch, formatter.Phase(name, "install", "installing package and dependencies"), 0)
		if err := tool.Install(); err != nil {
			emitter.Flush()
			ch <- InstallDoneMsg{Err: fmt.Errorf("[%s] install failed: %w", name, err)}
			return
		}
		emitter.Flush()
		sendInstallLog(ch, formatter.Phase(name, "install", "installation complete"), 1)

		sendInstallLog(ch, formatter.Phase(name, "config", "writing configuration"), 0)
		if err := tool.Configure(); err != nil {
			emitter.Flush()
			ch <- InstallDoneMsg{Err: fmt.Errorf("[%s] configure failed: %w", name, err)}
			return
		}
		emitter.Flush()
		sendInstallLog(ch, formatter.Phase(name, "config", "configuration applied"), 1)

		sendInstallLog(ch, formatter.Phase(name, "start", "restarting service"), 0)
		if err := tool.Start(); err != nil {
			emitter.Flush()
			ch <- InstallDoneMsg{Err: fmt.Errorf("[%s] start failed: %w", name, err)}
			return
		}
		emitter.Flush()
		sendInstallLog(ch, formatter.Phase(name, "start", "service active"), 1)
		sendInstallLog(ch, formatter.Success(name+" setup complete"), 0)
	}

	ch <- InstallDoneMsg{}
}

func WaitForInstallMsg(ch <-chan tea.Msg) tea.Cmd {
	return func() tea.Msg {
		msg, ok := <-ch
		if !ok {
			return nil
		}
		return msg
	}
}

func sendInstallLog(ch chan<- tea.Msg, line string, advance int) {
	ch <- InstallLogMsg{Line: line, Advance: advance}
}

type installLogWriter struct {
	ch        chan<- tea.Msg
	formatter LogFormatter
	mu        sync.Mutex
	pending   strings.Builder
}

func (w *installLogWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.pending.WriteString(strings.ReplaceAll(string(p), "\r", "\n"))
	w.flushLocked(false)
	return len(p), nil
}

func (w *installLogWriter) Flush() {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.flushLocked(true)
}

func (w *installLogWriter) flushLocked(force bool) {
	for {
		current := w.pending.String()
		idx := strings.IndexByte(current, '\n')
		if idx == -1 {
			if force && strings.TrimSpace(current) != "" {
				sendInstallLog(w.ch, w.formatter.Command(truncateLine(strings.TrimSpace(current), 140)), 0)
				w.pending.Reset()
			}
			return
		}

		line := strings.TrimSpace(current[:idx])
		rest := current[idx+1:]
		w.pending.Reset()
		w.pending.WriteString(rest)

		if line == "" {
			continue
		}

		sendInstallLog(w.ch, w.formatter.Command(truncateLine(line, 140)), 0)
	}
}

func truncateLine(line string, limit int) string {
	if len(line) <= limit {
		return line
	}
	return line[:limit-3] + "..."
}
