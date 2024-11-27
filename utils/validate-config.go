package utils

import (
	"fmt"
	"os"

	"github.com/Abyrd9/harbor/types"
)

func ValidateConfig(config types.Config) error {
	// Check if domain is set
	if config.Domain == "" {
		return fmt.Errorf("domain is required in harbor.json")
	}

	// Validate each service
	usedPorts := make(map[int]string)         // track ports to check for duplicates
	usedSubdomains := make(map[string]string) // track subdomains to check for duplicates

	for _, service := range config.Services {
		// Check required fields
		if service.Name == "" {
			return fmt.Errorf("service name is required")
		}
		if service.Path == "" {
			return fmt.Errorf("path is required for service: %s", service.Name)
		}
		if service.Command == "" {
			return fmt.Errorf("command is required for service: %s", service.Name)
		}
		if service.Subdomain == "" {
			return fmt.Errorf("subdomain is required for service: %s", service.Name)
		}

		// Check for valid port range only if port is specified
		if service.Port != 0 {
			if service.Port < 1 || service.Port > 65535 {
				return fmt.Errorf("invalid port number for service %s: %d", service.Name, service.Port)
			}

			// Check for duplicate ports
			if existingService, exists := usedPorts[service.Port]; exists {
				return fmt.Errorf("duplicate port %d used by services: %s and %s",
					service.Port, existingService, service.Name)
			}
			usedPorts[service.Port] = service.Name
		}

		// Check for duplicate subdomains
		if existingService, exists := usedSubdomains[service.Subdomain]; exists {
			return fmt.Errorf("duplicate subdomain %s used by services: %s and %s",
				service.Subdomain, existingService, service.Name)
		}
		usedSubdomains[service.Subdomain] = service.Name

		// Verify path exists
		if _, err := os.Stat(service.Path); err != nil {
			return fmt.Errorf("path does not exist for service %s: %s", service.Name, service.Path)
		}
	}

	return nil
}
