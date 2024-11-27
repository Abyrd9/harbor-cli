package commands

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/Abyrd9/harbor/types"
	"github.com/Abyrd9/harbor/utils"

	"github.com/spf13/cobra"
)

// Common project files to look for
var projectFiles = []string{
	"package.json",     // Node.js projects
	"go.mod",           // Go projects
	"Cargo.toml",       // Rust projects
	"composer.json",    // PHP projects
	"requirements.txt", // Python projects
	"Gemfile",          // Ruby projects
	"pom.xml",          // Java Maven projects
	"build.gradle",     // Java Gradle projects
}

func isProjectDirectory(path string) bool {
	for _, file := range projectFiles {
		if _, err := os.Stat(filepath.Join(path, file)); err == nil {
			return true
		}
	}
	return false
}

func GenerateDevFile(cmd *cobra.Command, args []string) {
	// Load existing config or create new one
	var config types.Config
	existingData, err := os.ReadFile("harbor.json")
	if err != nil {
		if !os.IsNotExist(err) {
			log.Fatalf("Error reading harbor.json: %v", err)
		}
		// Initialize new config with defaults
		config = types.Config{
			Domain:  "localhost",
			UseSudo: false,
		}
		fmt.Println("Creating new harbor.json...")
	} else {
		if err := json.Unmarshal(existingData, &config); err != nil {
			log.Fatalf("Error parsing harbor.json: %v", err)
		}
		fmt.Println("Found existing harbor.json, scanning for new services...")
	}

	path, _ := cmd.Flags().GetString("path")
	if path == "" {
		path = "."
	}

	folders, err := os.ReadDir(path)
	if err != nil {
		log.Fatalf("Error reading directory: %v", err)
	}

	// Create a map of existing services for easy lookup
	existingServices := make(map[string]bool)
	for _, service := range config.Services {
		existingServices[service.Name] = true
	}

	// Track if we added any new services
	newServicesAdded := false

	for _, folder := range folders {
		if folder.IsDir() {
			folderPath := filepath.Join(path, folder.Name())
			// Only add directories that contain project files and aren't already in config
			if isProjectDirectory(folderPath) && !existingServices[folder.Name()] {
				service := types.DevService{
					Name:      folder.Name(),
					Path:      folderPath,
					Subdomain: strings.ReplaceAll(strings.ToLower(folder.Name()), " ", ""),
				}

				// Try to determine default command based on project type
				if _, err := os.Stat(filepath.Join(folderPath, "package.json")); err == nil {
					service.Command = "npm run dev"
				} else if _, err := os.Stat(filepath.Join(folderPath, "go.mod")); err == nil {
					service.Command = "go run ."
				} // TODO: Add more default commands later

				config.Services = append(config.Services, service)
				fmt.Printf("Added new service: %s\n", folder.Name())
				newServicesAdded = true
			} else if existingServices[folder.Name()] {
				fmt.Printf("Skipping existing service: %s\n", folder.Name())
			} else {
				fmt.Printf("Skipping directory %s (no recognized project files)\n", folder.Name())
			}
		}
	}

	if !newServicesAdded {
		fmt.Println("No new services found to add")
		return
	}

	if err := utils.ValidateConfig(config); err != nil {
		fmt.Printf("❌ Invalid harbor.json configuration: %v\n", err)
		os.Exit(1)
	}

	jsonData, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		log.Fatalf("Error marshaling JSON: %v", err)
	}

	err = os.WriteFile("harbor.json", jsonData, 0644)
	if err != nil {
		log.Fatalf("Error writing harbor.json: %v", err)
	}

	fmt.Println("\nharbor.json updated successfully")
	fmt.Println("\nImportant:")
	fmt.Println("  - Update the 'Port' field for each service to match its actual port or leave blank to ignore in the Caddyfile")
	fmt.Println("  - Verify the auto-detected commands are correct for your services")
}

func ModifyDevFile(cmd *cobra.Command, args []string) {
	// Check if harbor.json exists
	if _, err := os.Stat("harbor.json"); err != nil {
		fmt.Println("❌ No harbor.json configuration found")
		fmt.Println("\nTo initialize a new Harbor project, please use:")
		fmt.Println("  harbor anchor")
		os.Exit(1)
	}

	GenerateDevFile(cmd, args)
}
