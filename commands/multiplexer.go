package commands

import (
	"fmt"
	"log"
	"os"
	"os/exec"

	"github.com/Abyrd9/harbor/utils"

	"github.com/spf13/cobra"
)

func RunServices(cmd *cobra.Command, args []string) {
	// Check for required files
	if _, err := os.Stat("harbor.json"); err != nil {
		fmt.Println("❌ No harbor.json configuration found")
		fmt.Println("\nTo initialize a new Harbor project, please use:")
		fmt.Println("  harbor anchor")
		os.Exit(1)
	}

	// Load and validate config
	config, err := utils.ReadConfig()
	if err != nil {
		log.Fatalf("Error reading config: %v", err)
	}

	if err := utils.ValidateConfig(config); err != nil {
		fmt.Printf("❌ Invalid harbor.json configuration: %v\n", err)
		os.Exit(1)
	}

	if _, err := os.Stat("Caddyfile"); err != nil {
		fmt.Println("❌ No Caddyfile found")
		fmt.Println("\nTo initialize a new Harbor project, please use:")
		fmt.Println("  harbor anchor")
		fmt.Println("\nOr to generate just the Caddyfile:")
		fmt.Println("  harbor moor")
		os.Exit(1)
	}

	// Execute the script directly
	command := exec.Command("bash", "dev.sh")
	command.Stdin = os.Stdin
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr

	if err := command.Run(); err != nil {
		fmt.Printf("Error running dev.sh: %v\n", err)
		os.Exit(1)
	}
}
