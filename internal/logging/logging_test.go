package logging

import "testing"

func TestNew(t *testing.T) {
	for _, format := range []string{"console", "json", " JSON "} {
		logger, err := New(format)
		if err != nil {
			t.Fatalf("New(%q) error = %v", format, err)
		}
		_ = logger.Sync()
	}

	if _, err := New("yaml"); err == nil {
		t.Fatal("New(yaml) succeeded")
	}
}
