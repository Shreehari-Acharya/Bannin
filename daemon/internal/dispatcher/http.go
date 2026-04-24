package dispatcher

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/Shreehari-Acharya/Bannin/daemon/pkg/models"
)

const defaultTimeout = 20 * time.Minute

type BackendEventPayload struct {
	SourceTool  string          `json:"sourceTool"`
	Timestamp   time.Time       `json:"timestamp"`
	Priority    string          `json:"priority"`
	Description string          `json:"description"`
	RawPayload  json.RawMessage `json:"rawPayload"`
}

type RulePayload struct {
	Contents string `json:"contents"`
}

type Client struct {
	baseURL    string
	httpClient *http.Client
	now        func() time.Time
}

func NewClient(baseURL string) (*Client, error) {
	resolved, err := backendEndpointURL(baseURL, "/")
	if err != nil {
		return nil, err
	}

	return &Client{
		baseURL: strings.TrimSuffix(resolved, "/"),
		httpClient: &http.Client{
			Timeout: defaultTimeout,
		},
		now: time.Now,
	}, nil
}

func SendAlerts(alert models.SecEvent, backendURL string) error {
	client, err := NewClient(backendURL)
	if err != nil {
		return err
	}
	return client.SendAlerts(alert)
}

func SendRule(toolname string, markdownContents string, backendURL string) error {
	client, err := NewClient(backendURL)
	if err != nil {
		return err
	}
	return client.SendRule(toolname, markdownContents)
}

func GenerateSummary(projectPath string, backendURL string) (string, error) {
	client, err := NewClient(backendURL)
	if err != nil {
		return "", err
	}
	return client.GenerateSummary(projectPath)
}

func (c *Client) SendAlerts(alert models.SecEvent) error {
	payload := BackendEventPayload{
		SourceTool:  alert.SourceTool,
		Timestamp:   c.now(),
		Priority:    alert.Priority,
		Description: alert.Description,
		RawPayload:  alert.RawPayload,
	}

	return c.postJSON("/events/new", payload, nil)
}

func (c *Client) SendRule(toolname string, markdownContents string) error {
	payload := RulePayload{Contents: markdownContents}
	query := url.Values{}
	query.Set("toolname", toolname)
	return c.postJSON("/generate/rules", payload, query)
}

func (c *Client) GenerateSummary(projectPath string) (string, error) {
	body, err := c.postForBody("/generate/summary", map[string]string{"path": projectPath}, nil)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(body)), nil
}

func (c *Client) postJSON(endpoint string, payload any, query url.Values) error {
	_, err := c.postForBody(endpoint, payload, query)
	return err
}

func (c *Client) postForBody(endpoint string, payload any, query url.Values) ([]byte, error) {
	targetURL, err := backendEndpointURL(c.baseURL, endpoint)
	if err != nil {
		return nil, err
	}

	if len(query) > 0 {
		parsed, parseErr := url.Parse(targetURL)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid target URL %q: %w", targetURL, parseErr)
		}
		parsed.RawQuery = query.Encode()
		targetURL = parsed.String()
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, targetURL, bytes.NewReader(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request to %s: %w", targetURL, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response from %s: %w", targetURL, err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf(
			"backend rejected request POST %s with status %d: %s",
			targetURL,
			resp.StatusCode,
			strings.TrimSpace(string(body)),
		)
	}

	return body, nil
}

func backendEndpointURL(baseURL, endpointPath string) (string, error) {
	trimmed := strings.TrimSpace(baseURL)
	if trimmed == "" {
		return "", fmt.Errorf("BANNIN_BACKEND_URL is not configured")
	}

	parsed, err := url.Parse(trimmed)
	if err != nil {
		return "", fmt.Errorf("invalid BANNIN_BACKEND_URL: %w", err)
	}

	parsed.Path = path.Join(parsed.Path, endpointPath)
	return parsed.String(), nil
}
