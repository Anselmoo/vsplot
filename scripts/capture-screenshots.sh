#!/usr/bin/env bash
# Interactive screenshot helper for VSPlot
# Usage (fish): bash scripts/capture-screenshots.sh

set -e

IMAGES_DIR="$(dirname "$0")/../images"
mkdir -p "$IMAGES_DIR"

echo "This script will open VS Code in Extension Development Host mode and help you capture two screenshots:"
echo "  1) Data Preview view"
echo "  2) Chart View"
echo "Make sure you have VS Code installed and the 'code' CLI available (or use the GUI)."

echo
echo "Opening Visual Studio Code (extensionDevelopmentPath=$(pwd))..."
open -a "Visual Studio Code" --args --extensionDevelopmentPath "$(pwd)"

echo
echo "When the new VS Code window appears, press F5 to launch the Extension Development Host (EDH)."
echo "Switch to the EDH window (it opens in a separate window)."
read -p "Press Enter when the EDH is running and you're ready to capture the Data Preview view..."

DATA_PREVIEW_IMG="$IMAGES_DIR/screenshot-data-preview.png"
echo "Capturing Data Preview to $DATA_PREVIEW_IMG..."
# Capture full screen silently; you can crop later if desired
screencapture -x "$DATA_PREVIEW_IMG"
echo "Saved $DATA_PREVIEW_IMG"

read -p "Now, switch the EDH to show the Chart View (open or run your chart), then press Enter to capture the Chart View..."
CHART_VIEW_IMG="$IMAGES_DIR/screenshot-chart-view.png"
echo "Capturing Chart View to $CHART_VIEW_IMG..."
screencapture -x "$CHART_VIEW_IMG"
echo "Saved $CHART_VIEW_IMG"

echo
echo "Done. Two screenshots saved under images/. You may want to crop them or optimize before committing."
echo "Tip: Run 'open $IMAGES_DIR' to view the images."

exit 0
