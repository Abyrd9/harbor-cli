package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Abyrd9/harbor/types"
)

// Test setup helper
func setupTestEnvironment(t *testing.T) (string, func()) {
	// Create a temporary directory
	tmpDir, err := os.MkdirTemp("", "harbor-test-*")
	if err != nil {
		t.Fatal(err)
	}

	// Copy test-services to temp directory
	err = filepath.Walk("test-services", func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel("test-services", path)
		if err != nil {
			return err
		}

		destPath := filepath.Join(tmpDir, relPath)

		if info.IsDir() {
			return os.MkdirAll(destPath, 0755)
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		return os.WriteFile(destPath, data, 0644)
	})

	if err != nil {
		t.Fatal(err)
	}

	// Return cleanup function
	cleanup := func() {
		os.RemoveAll(tmpDir)
	}

	return tmpDir, cleanup
}

// Test service detection
func TestServiceDetection(t *testing.T) {
	tmpDir, cleanup := setupTestEnvironment(t)
	defer cleanup()

	// Change to temp directory
	originalDir, _ := os.Getwd()
	os.Chdir(tmpDir)
	defer os.Chdir(originalDir)

	// Execute anchor command
	root.SetArgs([]string{"anchor"})
	err := root.Execute()
	if err != nil {
		t.Fatalf("Failed to execute anchor command: %v", err)
	}

	// Verify harbor.json was created
	if _, err := os.Stat("harbor.json"); os.IsNotExist(err) {
		t.Fatal("harbor.json was not created")
	}

	// Read and verify config
	var config types.Config
	data, err := os.ReadFile("harbor.json")
	if err != nil {
		t.Fatal(err)
	}

	err = json.Unmarshal(data, &config)
	if err != nil {
		t.Fatal(err)
	}

	// Verify services were detected
	expectedServices := map[string]bool{
		"vite-project": false,
		"go-api":       false,
	}

	for _, service := range config.Services {
		if _, exists := expectedServices[service.Name]; !exists {
			t.Errorf("Unexpected service detected: %s", service.Name)
		}
		expectedServices[service.Name] = true
	}

	for name, found := range expectedServices {
		if !found {
			t.Errorf("Expected service not detected: %s", name)
		}
	}
}

// Test command detection
func TestCommandDetection(t *testing.T) {
	tmpDir, cleanup := setupTestEnvironment(t)
	defer cleanup()

	// Change to temp directory
	originalDir, _ := os.Getwd()
	os.Chdir(tmpDir)
	defer os.Chdir(originalDir)

	// Execute anchor command
	root.SetArgs([]string{"anchor"})
	err := root.Execute()
	if err != nil {
		t.Fatalf("Failed to execute anchor command: %v", err)
	}

	// Read config
	var config types.Config
	data, err := os.ReadFile("harbor.json")
	if err != nil {
		t.Fatal(err)
	}

	err = json.Unmarshal(data, &config)
	if err != nil {
		t.Fatal(err)
	}

	// Verify correct commands were detected
	expectedCommands := map[string]string{
		"vite-project": "npm run dev",
		"go-api":       "go run .",
	}

	for _, service := range config.Services {
		expectedCmd, exists := expectedCommands[service.Name]
		if !exists {
			continue
		}
		if service.Command != expectedCmd {
			t.Errorf("Wrong command for %s. Expected: %s, Got: %s",
				service.Name, expectedCmd, service.Command)
		}
	}
}

// Test Caddyfile generation
func TestCaddyfileGeneration(t *testing.T) {
	tmpDir, cleanup := setupTestEnvironment(t)
	defer cleanup()

	// Change to temp directory
	originalDir, _ := os.Getwd()
	os.Chdir(tmpDir)
	defer os.Chdir(originalDir)

	// Execute anchor command
	root.SetArgs([]string{"anchor"})
	err := root.Execute()
	if err != nil {
		t.Fatalf("Failed to execute anchor command: %v", err)
	}

	// Verify Caddyfile was created
	if _, err := os.Stat("Caddyfile"); os.IsNotExist(err) {
		t.Fatal("Caddyfile was not created")
	}

	// Read Caddyfile content
	data, err := os.ReadFile("Caddyfile")
	if err != nil {
		t.Fatal(err)
	}

	content := string(data)

	// Check for expected subdomain configurations
	expectedSubdomains := []string{
		"vite-project.localhost",
		"go-api.localhost",
	}

	for _, subdomain := range expectedSubdomains {
		if !strings.Contains(content, subdomain) {
			t.Errorf("Expected subdomain configuration missing: %s", subdomain)
		}
	}
}
