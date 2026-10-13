package gateway

import (
	"bytes"
	"encoding/json"
	"strings"
)

type Usage struct {
	InputTokens  int
	OutputTokens int
}

type usageFields struct {
	PromptTokens     *int `json:"prompt_tokens"`
	CompletionTokens *int `json:"completion_tokens"`
	InputTokens      *int `json:"input_tokens"`
	OutputTokens     *int `json:"output_tokens"`
}

func ParseUsage(body []byte) (Usage, bool) {
	var response struct {
		Usage *usageFields `json:"usage"`
	}
	if err := json.Unmarshal(body, &response); err != nil || response.Usage == nil {
		return Usage{}, false
	}

	usage := Usage{}
	if response.Usage.PromptTokens != nil {
		usage.InputTokens = *response.Usage.PromptTokens
	} else if response.Usage.InputTokens != nil {
		usage.InputTokens = *response.Usage.InputTokens
	}
	if response.Usage.CompletionTokens != nil {
		usage.OutputTokens = *response.Usage.CompletionTokens
	} else if response.Usage.OutputTokens != nil {
		usage.OutputTokens = *response.Usage.OutputTokens
	}
	return usage, true
}

type StreamUsageParser struct {
	pending []byte
	usage   Usage
	found   bool
}

func NewStreamUsageParser() *StreamUsageParser {
	return &StreamUsageParser{}
}

func (p *StreamUsageParser) Write(data []byte) (int, error) {
	p.pending = append(p.pending, data...)
	p.processLines(false)
	return len(data), nil
}

func (p *StreamUsageParser) Finalize() {
	p.processLines(true)
}

func (p *StreamUsageParser) Usage() (Usage, bool) {
	return p.usage, p.found
}

func (p *StreamUsageParser) processLines(final bool) {
	for {
		index := bytes.IndexByte(p.pending, '\n')
		if index < 0 {
			if !final || len(p.pending) == 0 {
				return
			}
			index = len(p.pending)
		}

		last := index == len(p.pending)
		line := strings.TrimSpace(string(p.pending[:index]))
		if last {
			p.pending = nil
		} else {
			p.pending = p.pending[index+1:]
		}
		if !strings.HasPrefix(line, "data:") {
			if last {
				return
			}
			continue
		}

		usage, ok := ParseUsage([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
		if ok {
			p.usage = usage
			p.found = true
		}
		if last {
			return
		}
	}
}
