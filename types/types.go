package types

// DevService represents a service to run in development
type DevService struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	Command   string `json:"command"`
	Port      int    `json:"port"`
	Subdomain string `json:"subdomain"`
}

// Config represents the root configuration
type Config struct {
	Services []DevService `json:"services"`
	Domain   string       `json:"domain"`   // e.g., "localhost"
	UseSudo  bool         `json:"use_sudo"` // whether to use sudo for hosts file
}
