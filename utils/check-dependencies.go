package utils

import (
	"fmt"
	"os/exec"
)

type Dependency struct {
	Name        string
	Command     string
	InstallMsg  string
	RequiredFor string
}

var RequiredDependencies = []Dependency{
	{
		Name:        "Caddy",
		Command:     "caddy version",
		InstallMsg:  "https://caddyserver.com/docs/install",
		RequiredFor: "reverse proxy functionality",
	},
	{
		Name:        "tmux",
		Command:     "tmux -V",
		InstallMsg:  "https://github.com/tmux/tmux/wiki/Installing",
		RequiredFor: "terminal multiplexing",
	},
	{
		Name:        "jq",
		Command:     "jq --version",
		InstallMsg:  "https://stedolan.github.io/jq/download/",
		RequiredFor: "JSON processing in service management",
	},
}

func CheckDependencies() error {
	var missingDeps []Dependency

	for _, dep := range RequiredDependencies {
		cmd := exec.Command("sh", "-c", dep.Command)
		if err := cmd.Run(); err != nil {
			missingDeps = append(missingDeps, dep)
		}
	}

	if len(missingDeps) > 0 {
		fmt.Println("❌ Missing required dependencies:")
		for _, dep := range missingDeps {
			fmt.Printf("\n%s (required for %s)", dep.Name, dep.RequiredFor)
			fmt.Printf("\nInstall instructions: %s\n", dep.InstallMsg)
		}
		return fmt.Errorf("please install missing dependencies before continuing")
	}

	return nil
}
