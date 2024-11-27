package commands

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
)

func SetupEnvironment(cmd *cobra.Command, args []string) {
	caddyFileExists := fileExists("Caddyfile")
	configFileExists := fileExists("harbor.json")

	if caddyFileExists || configFileExists {
		fmt.Println("❌ Error: Harbor project already initialized")
		if caddyFileExists {
			fmt.Println("   - Caddyfile already exists")
		}
		if configFileExists {
			fmt.Println("   - harbor.json already exists")
		}
		fmt.Println("\nTo reinitialize, please remove these files first.")
		os.Exit(1)
	}

	GenerateDevFile(cmd, args)
	GenerateCaddyFile(cmd, args)

	fmt.Println("✨ Environment successfully prepared and anchored!")
}

func fileExists(filename string) bool {
	_, err := os.Stat(filepath.Clean(filename))
	return err == nil
}
