package main

import (
	"fmt"
	"os"

	"github.com/Abyrd9/harbor/commands"
	"github.com/Abyrd9/harbor/utils"

	"github.com/spf13/cobra"
)

// Version is set during build using -ldflags
var Version = "dev"
var Commit = "none"
var Date = "unknown"
var BuiltBy = "unknown"

var root = &cobra.Command{
	Use:     "harbor",
	Short:   "A CLI tool for managing your project's local development services",
	Version: Version,
}

var anchor = &cobra.Command{
	Use:   "anchor",
	Short: "Set up your development environment with config and proxy files",
	Long: `Prepares your development environment by creating both:
- harbor.json configuration file
- Caddyfile for reverse proxy
	
This is typically the first command you'll run in a new project.`,
	Run: commands.SetupEnvironment,
}

var dock = &cobra.Command{
	Use:   "dock",
	Short: "Add new services to your harbor.json configuration file",
	Run:   commands.ModifyDevFile,
}

var moor = &cobra.Command{
	Use:   "moor",
	Short: "Add new services to your Caddyfile",
	Run:   commands.GenerateCaddyFile,
}

var launch = &cobra.Command{
	Use:   "launch",
	Short: "Launch your services in the harbor terminal multiplexer",
	Run:   commands.RunServices,
}

var rootPathFlag string

func init() {
	root.CompletionOptions.DisableDefaultCmd = true

	anchor.Flags().StringVarP(&rootPathFlag, "path", "p", ".", "Path to search for services (default is current directory)")
	dock.Flags().StringVarP(&rootPathFlag, "path", "p", ".", "Path to search for services (default is current directory)")

	root.AddCommand(anchor)
	root.AddCommand(dock)
	root.AddCommand(moor)
	root.AddCommand(launch)
}

func main() {
	if err := utils.CheckDependencies(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	if err := root.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
