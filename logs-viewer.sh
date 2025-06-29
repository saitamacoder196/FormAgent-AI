#!/bin/bash

# FormAgent AI - Centralized Log Viewer
# Usage: ./logs-viewer.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
FOLLOW=false
SERVICE="all"
TAIL_LINES=100
FORMAT="pretty"
SINCE=""
UNTIL=""

# Help function
show_help() {
    cat << EOF
FormAgent AI - Log Viewer

Usage: $0 [OPTIONS]

Options:
    -f, --follow          Follow log output (like tail -f)
    -s, --service NAME    Show logs from specific service (mongodb, backend, frontend, mongo-express, all)
    -n, --tail NUMBER     Number of lines to show from the end of logs (default: 100)
    --format FORMAT       Output format: pretty, json, raw (default: pretty)
    --since TIME          Show logs since timestamp (e.g., 2023-01-01, 10m, 1h)
    --until TIME          Show logs until timestamp
    -h, --help            Show this help message

Examples:
    $0 -f                           # Follow all logs
    $0 -s backend -f               # Follow backend logs
    $0 -s frontend -n 50           # Show last 50 lines from frontend
    $0 --since 10m                 # Show logs from last 10 minutes
    $0 -s backend --format json    # Show backend logs in JSON format

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        -n|--tail)
            TAIL_LINES="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --since)
            SINCE="$2"
            shift 2
            ;;
        --until)
            UNTIL="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Function to format timestamp
format_timestamp() {
    echo "$1" | sed 's/T/ /; s/Z$//'
}

# Function to colorize service names
colorize_service() {
    case $1 in
        mongodb)
            echo -e "${GREEN}[MONGODB]${NC}"
            ;;
        backend)
            echo -e "${BLUE}[BACKEND]${NC}"
            ;;
        frontend)
            echo -e "${PURPLE}[FRONTEND]${NC}"
            ;;
        mongo-express)
            echo -e "${YELLOW}[MONGO-EXPRESS]${NC}"
            ;;
        *)
            echo -e "${CYAN}[$1]${NC}"
            ;;
    esac
}

# Function to format log entry
format_log_pretty() {
    local service=$1
    local timestamp=$2
    local level=$3
    local message=$4
    
    # Format timestamp
    local formatted_time=$(format_timestamp "$timestamp")
    
    # Colorize log level
    case $level in
        ERROR|error)
            level_color="${RED}ERROR${NC}"
            ;;
        WARN|warn|WARNING|warning)
            level_color="${YELLOW}WARN ${NC}"
            ;;
        INFO|info)
            level_color="${GREEN}INFO ${NC}"
            ;;
        DEBUG|debug)
            level_color="${CYAN}DEBUG${NC}"
            ;;
        *)
            level_color="$level"
            ;;
    esac
    
    echo -e "$(colorize_service $service) $formatted_time [$level_color] $message"
}

# Build docker-compose command
build_command() {
    local cmd="docker-compose"
    
    # Add service filter
    if [ "$SERVICE" != "all" ]; then
        cmd="$cmd logs $SERVICE"
    else
        cmd="$cmd logs"
    fi
    
    # Add follow flag
    if [ "$FOLLOW" = true ]; then
        cmd="$cmd -f"
    fi
    
    # Add tail lines
    cmd="$cmd --tail=$TAIL_LINES"
    
    # Add since/until if specified
    if [ -n "$SINCE" ]; then
        cmd="$cmd --since=$SINCE"
    fi
    
    if [ -n "$UNTIL" ]; then
        cmd="$cmd --until=$UNTIL"
    fi
    
    echo "$cmd"
}

# Process logs based on format
process_logs() {
    if [ "$FORMAT" = "raw" ]; then
        # Raw output - no processing
        cat
    elif [ "$FORMAT" = "json" ]; then
        # JSON format - parse and reformat
        while IFS= read -r line; do
            # Extract service name from docker-compose format
            if [[ $line =~ ^([a-zA-Z0-9_-]+)\s*\|\s*(.*)$ ]]; then
                service="${BASH_REMATCH[1]}"
                log_content="${BASH_REMATCH[2]}"
                
                # Try to parse JSON log
                if echo "$log_content" | jq -e . >/dev/null 2>&1; then
                    echo "$log_content" | jq -c ". + {service: \"$service\"}"
                else
                    # Not JSON, create JSON object
                    echo "{\"service\":\"$service\",\"message\":$(echo "$log_content" | jq -R .)}"
                fi
            else
                echo "{\"message\":$(echo "$line" | jq -R .)}"
            fi
        done
    else
        # Pretty format (default)
        while IFS= read -r line; do
            # Extract service name and log content
            if [[ $line =~ ^([a-zA-Z0-9_-]+)\s*\|\s*(.*)$ ]]; then
                service="${BASH_REMATCH[1]}"
                log_content="${BASH_REMATCH[2]}"
                
                # Try to parse structured log
                if echo "$log_content" | grep -q '"timestamp":\|"level":\|"message":\|"event":'; then
                    # Appears to be JSON structured log
                    timestamp=$(echo "$log_content" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4 || echo "")
                    level=$(echo "$log_content" | grep -o '"level":"[^"]*"' | cut -d'"' -f4 || echo "INFO")
                    message=$(echo "$log_content" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "$log_content")
                    event=$(echo "$log_content" | grep -o '"event":"[^"]*"' | cut -d'"' -f4 || echo "")
                    
                    if [ -n "$event" ]; then
                        message="$event - $message"
                    fi
                    
                    format_log_pretty "$service" "${timestamp:-$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)}" "${level:-INFO}" "$message"
                else
                    # Plain text log
                    format_log_pretty "$service" "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" "INFO" "$log_content"
                fi
            else
                # No service prefix
                echo "$line"
            fi
        done
    fi
}

# Main execution
echo -e "${CYAN}=== FormAgent AI Log Viewer ===${NC}"
echo -e "Service: ${YELLOW}$SERVICE${NC}"
echo -e "Format: ${YELLOW}$FORMAT${NC}"
echo -e "Tail lines: ${YELLOW}$TAIL_LINES${NC}"
echo -e "Follow: ${YELLOW}$FOLLOW${NC}"
echo -e "${CYAN}===============================${NC}"
echo

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose not found${NC}"
    exit 1
fi

# Execute command and process output
cmd=$(build_command)
eval "$cmd 2>&1" | process_logs