#!/bin/bash
# iOS Build Script for Notter App
# This script helps automate the process of building and running the app on iOS

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Notter iOS Build & Deployment Tool   ${NC}"
echo -e "${GREEN}=========================================${NC}"

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Error: This script must be run on macOS${NC}"
    exit 1
fi

# Check for Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}Error: Xcode is not installed${NC}"
    echo "Please install Xcode from the App Store"
    exit 1
fi

# Check for Tauri CLI
if ! command -v cargo tauri &> /dev/null; then
    echo -e "${YELLOW}Warning: Tauri CLI not found in path${NC}"
    echo "Using npx to run Tauri commands"
    TAURI_CMD="npx @tauri-apps/cli"
else
    TAURI_CMD="cargo tauri"
fi

# Function to update team ID in tauri.conf.json
update_team_id() {
    echo -e "${YELLOW}Enter your Apple Developer Team ID:${NC}"
    read team_id
    
    if [ -z "$team_id" ]; then
        echo -e "${RED}Error: Team ID cannot be empty${NC}"
        exit 1
    fi
    
    # Update team ID in tauri.conf.json under mobile > ios
    sed -i '' "s/\"developmentTeam\": \"[^\"]*\"/\"developmentTeam\": \"$team_id\"/" src-tauri/tauri.conf.json
    
    echo -e "${GREEN}Team ID updated successfully${NC}"
}

# Function to build the app
build_app() {
    echo -e "${GREEN}Building app for iOS...${NC}"
    
    # Build frontend
    echo -e "${YELLOW}Building frontend...${NC}"
    npm run build
    
    # Build iOS app
    echo -e "${YELLOW}Building iOS app...${NC}"
    $TAURI_CMD ios build
    
    echo -e "${GREEN}Build completed successfully${NC}"
}

# Function to run the app in the simulator
run_simulator() {
    echo -e "${GREEN}Running app in iOS Simulator...${NC}"
    
    # Run in iOS simulator
    $TAURI_CMD ios dev
}

# Main menu
show_menu() {
    echo -e "\n${YELLOW}Select an option:${NC}"
    echo "1) Update Apple Developer Team ID"
    echo "2) Build iOS App"
    echo "3) Run in iOS Simulator"
    echo "4) Build and Run"
    echo "5) Exit"
    
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            update_team_id
            show_menu
            ;;
        2)
            build_app
            show_menu
            ;;
        3)
            run_simulator
            show_menu
            ;;
        4)
            build_app
            run_simulator
            show_menu
            ;;
        5)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            show_menu
            ;;
    esac
}

# Start the script
show_menu
