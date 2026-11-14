package account

import (
	"testing"
)

func TestLocalOriginBoundary(t *testing.T) {
	for _, origin := range []string{"http://127.0.0.1:8081", "http://[::1]:8081"} {
		if _, err := NewLocal(Config{origin, "local-fixture-key"}); err != nil {
			t.Fatal(err)
		}
		if _, err := New(Config{origin, "local-fixture-key"}); err == nil {
			t.Fatal("production accepted local origin")
		}
	}
	for _, origin := range []string{"http://mock:8081", "http://192.168.1.1", "https://127.0.0.1", "http://127.0.0.1/a", "http://user@127.0.0.1", "http://127.0.0.1?x=1", "http://127.0.0.1#x", ":bad"} {
		if _, err := NewLocal(Config{origin, "local-fixture-key"}); err == nil {
			t.Fatal(origin)
		}
	}
	if _, err := NewLocal(Config{"http://127.0.0.1:8081", "production-key"}); err == nil {
		t.Fatal("non-fixture key accepted")
	}
}
