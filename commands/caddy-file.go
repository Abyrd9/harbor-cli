package commands

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/Abyrd9/harbor/utils"

	"github.com/spf13/cobra"
)

func GenerateCaddyFile(cmd *cobra.Command, args []string) {
	// Check if harbor.json exists
	if _, err := os.Stat("harbor.json"); err != nil {
		fmt.Println("❌ No harbor.json configuration found")
		fmt.Println("\nTo initialize a new Harbor project, please use:")
		fmt.Println("  harbor anchor")
		os.Exit(1)
	}

	config, err := utils.ReadConfig()
	if err != nil {
		log.Fatalf("Error reading config: %v", err)
	}

	var caddyfileContent strings.Builder

	for _, svc := range config.Services {
		if svc.Port == 0 || svc.Subdomain == "" {
			continue
		}

		serverName := fmt.Sprintf("%s.%s", svc.Subdomain, config.Domain)
		caddyfileContent.WriteString(fmt.Sprintf("%s {\n", serverName))
		caddyfileContent.WriteString(fmt.Sprintf("  reverse_proxy localhost:%d\n", svc.Port))
		caddyfileContent.WriteString("}\n\n")
	}

	err = os.WriteFile("Caddyfile", []byte(caddyfileContent.String()), 0644)
	if err != nil {
		log.Fatalf("Error writing Caddyfile: %v", err)
	}

	fmt.Println("Caddyfile generated successfully")
}
