#!/bin/bash

# Check if the session already exists and kill it
if tmux has-session -t local-dev-test 2>/dev/null; then
    echo "Killing existing tmux session 'local-dev-test'"
    tmux kill-session -t local-dev-test
fi

# Function to get harbor config
get_harbor_config() {
    if [ -f "harbor.json" ]; then
        cat harbor.json
    elif [ -f "package.json" ]; then
        jq '.harbor' package.json
    else
        echo "{}"
    fi
}

# Start a new tmux session named 'local-dev-test' and rename the initial window
tmux new-session -d -s local-dev-test

# Set tmux options
tmux set-option -g prefix C-a
tmux bind-key C-a send-prefix
tmux set-option -g mouse on
tmux set-option -g history-limit 50000
tmux set-window-option -g mode-keys vi

# Add binding to kill session with Ctrl+q
tmux bind-key -n C-q kill-session

# Add padding and styling to panes
tmux set-option -g pane-border-style fg="#3f3f3f"
tmux set-option -g pane-active-border-style fg="#6366f1"
tmux set-option -g pane-border-status top
tmux set-option -g pane-border-format ""

# Add padding inside panes
tmux set-option -g status-left-length 100
tmux set-option -g status-right-length 100
tmux set-window-option -g window-style 'fg=colour247,bg=colour236'
tmux set-window-option -g window-active-style 'fg=colour250,bg=black'

# Set inner padding
tmux set-option -g window-style "bg=#1c1917 fg=#a8a29e"
tmux set-option -g window-active-style "bg=#1c1917 fg=#ffffff"

# Improve copy mode and mouse behavior
tmux set-option -g set-clipboard external
tmux bind-key -T copy-mode-vi v send-keys -X begin-selection
tmux bind-key -T copy-mode-vi y send-keys -X copy-selection-and-cancel
tmux bind-key -T copy-mode-vi MouseDragEnd1Pane send-keys -X copy-pipe-and-cancel "pbcopy"

# Set easier window navigation shortcuts
tmux bind-key -n Left select-window -t :-
tmux bind-key -n Right select-window -t :+

# Configure status bar
tmux set-option -g status-position top
tmux set-option -g status-style bg="#1c1917",fg="#a8a29e"
tmux set-option -g status-left ""
tmux set-option -g status-right "#[fg=#a8a29e]Close with ctrl+q · #[fg=white]%H:%M#[default]"
tmux set-window-option -g window-status-current-format "\
#[fg=#6366f1, bg=#1c1917] →
#[fg=#6366f1, bg=#1c1917, bold] #W
#[fg=#6366f1, bg=#1c1917]  "
tmux set-window-option -g window-status-format "\
#[fg=#a8a29e, bg=#1c1917]  
#[fg=#a8a29e, bg=#1c1917] #W \
#[fg=#a8a29e, bg=#1c1917] "

# Add padding below status bar
tmux set-option -g status 2
tmux set-option -Fg 'status-format[1]' '#{status-format[0]}'
tmux set-option -g 'status-format[0]' ''

# Create a new window for the interactive shell
echo "Creating window for interactive shell"
tmux rename-window -t local-dev-test:0 'Terminal'

window_index=1  # Start from index 1

# Create windows dynamically based on harbor config
get_harbor_config | jq -c '.services[]' | while read service; do
    name=$(echo $service | jq -r '.name')
    path=$(echo $service | jq -r '.path')
    command=$(echo $service | jq -r '.command')
    
    echo "Creating window for service: $name"
    echo "Path: $path"
    echo "Command: $command"
    
    tmux new-window -t local-dev-test:$window_index -n "$name"
    tmux send-keys -t local-dev-test:$window_index "cd $path && $command" C-m
    
    ((window_index++))
done

# Bind 'Home' key to switch to the terminal window
tmux bind-key -n Home select-window -t :0

# Select the terminal window
tmux select-window -t local-dev-test:0

# Attach to the tmux session
tmux attach-session -t local-dev-test
