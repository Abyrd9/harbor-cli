package utils

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/Abyrd9/harbor/types"
)

func ReadConfig() (types.Config, error) {
	data, err := os.ReadFile("harbor.json")
	if err != nil {
		return types.Config{}, fmt.Errorf("error reading config: %v", err)
	}

	var config types.Config
	if err := json.Unmarshal(data, &config); err != nil {
		return types.Config{}, fmt.Errorf("error parsing config: %v", err)
	}

	return config, nil
}
