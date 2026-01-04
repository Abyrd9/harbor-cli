#!/bin/bash

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

# Get session name from config or use default
session_name=$(get_harbor_config | jq -r '.sessionName // "harbor"')

# Check if the session already exists and kill it
if tmux has-session -t "$session_name" 2>/dev/null; then
    echo "Killing existing tmux session '$session_name'"
    tmux kill-session -t "$session_name"
fi
repo_root="$(pwd)"
max_log_lines=1000
log_pids=()

cleanup_logs() {
    for pid in "${log_pids[@]}"; do
        kill "$pid" 2>/dev/null
    done
}

start_log_trim() {
    local log_file="$1"
    local max_lines="$2"
    # Start background log trimmer process
    {
        while true; do
            sleep 5
            if [ -f "$log_file" ]; then
                lines=$(wc -l < "$log_file")
                if [ "$lines" -gt $max_lines ]; then
                    tail -n $max_lines "$log_file" > "${log_file}.tmp" && \
                    cat "${log_file}.tmp" > "$log_file" && \
                    rm "${log_file}.tmp"
                fi
            fi
        done
    } &
}

trap cleanup_logs EXIT

# Start a new tmux session and rename the initial window
tmux new-session -d -s "$session_name"

# Set tmux options
tmux set-option -g prefix C-a
tmux bind-key C-a send-prefix
tmux set-option -g mouse on
tmux set-option -g history-limit 50000
tmux set-window-option -g mode-keys vi

# Enable extended keys so modifier combinations (like Shift+Enter) pass through to applications
tmux set-option -g extended-keys on
tmux set-option -g xterm-keys on

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

# Set easier window navigation shortcuts (Shift+Left/Right to switch windows)
tmux bind-key -n S-Left select-window -t :-
tmux bind-key -n S-Right select-window -t :+

# Configure status bar
tmux set-option -g status-position top
tmux set-option -g status-style bg="#1c1917",fg="#a8a29e"
tmux set-option -g status-left ""
tmux set-option -g status-right "#[fg=#a8a29e]shift+←/→ switch · ctrl+q close · #[fg=white]%H:%M#[default]"
tmux set-window-option -g window-status-current-format "\
#[fg=#6366f1, bg=#1c1917] →\
#[fg=#6366f1, bg=#1c1917, bold] #W\
#[fg=#6366f1, bg=#1c1917]  "
tmux set-window-option -g window-status-format "\
#[fg=#a8a29e, bg=#1c1917]  \
#[fg=#a8a29e, bg=#1c1917] #W \
#[fg=#a8a29e, bg=#1c1917] "

# Add padding below status bar
tmux set-option -g status 2
tmux set-option -Fg 'status-format[1]' '#{status-format[0]}'
tmux set-option -g 'status-format[0]' ''

# Create a new window for the interactive shell
echo "Creating window for interactive shell"
tmux rename-window -t "$session_name":0 'Terminal'

window_index=1  # Start from index 1

if get_harbor_config | jq -e '.services[] | select(.log == true)' >/dev/null 2>&1; then
    mkdir -p "$repo_root/.harbor"
    rm -f "$repo_root/.harbor/${session_name}-"*.log
fi

# Create windows dynamically based on harbor config
while read service; do
    name=$(echo $service | jq -r '.name')
    path=$(echo $service | jq -r '.path')
    command=$(echo $service | jq -r '.command')
    log=$(echo $service | jq -r '.log // false')
    service_max_lines=$(echo $service | jq -r '.maxLogLines // empty')
    
    # Use service-specific maxLogLines or fall back to default
    effective_max_lines="${service_max_lines:-$max_log_lines}"
    
    echo "Creating window for service: $name"
    echo "Path: $path"
    echo "Command: $command"
    
    if [ "$log" = "true" ]; then
        log_file="$repo_root/.harbor/${session_name}-${name}.log"
        : > "$log_file"
        # Use pipe-pane to capture ALL terminal output (works with any program, no buffering issues)
        tmux new-window -t "$session_name":$window_index -n "$name"
        tmux pipe-pane -t "$session_name":$window_index "cat >> \"$log_file\""
        tmux send-keys -t "$session_name":$window_index "cd \"$path\" && $command" C-m
        # Start background process to trim logs if they get too large
        start_log_trim "$log_file" "$effective_max_lines"
    else
        tmux new-window -t "$session_name":$window_index -n "$name"
        tmux send-keys -t "$session_name":$window_index "cd \"$path\" && $command" C-m
    fi
    
    ((window_index++))
done < <(get_harbor_config | jq -c '.services[]')

# Bind 'Home' key to switch to the terminal window
tmux bind-key -n Home select-window -t :0

# Select the terminal window
tmux select-window -t "$session_name":0

# Attach to the tmux session (unless running in detached/headless mode)
if [ "${HARBOR_DETACH:-0}" = "1" ]; then
    echo ""
    echo "🚀 Harbor services started in detached mode"
    echo ""
    echo "   Session: $session_name"
    echo "   Services: $((window_index - 1))"
    echo ""
    echo "   Commands:"
    echo "     harbor anchor  - Anchor to the tmux session"
    echo "     harbor scuttle - Scuttle all services"
    echo ""
    if get_harbor_config | jq -e '.services[] | select(.log == true)' >/dev/null 2>&1; then
        echo "   Logs:"
        echo "     tail -f .harbor/${session_name}-<service>.log"
        echo ""
    fi
else
    tmux attach-session -t "$session_name"
fi
