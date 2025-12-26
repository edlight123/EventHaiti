#!/bin/bash

# Script to generate PWA icons from SVG source
# Requires ImageMagick or rsvg-convert to be installed

SVG_SOURCE="${1:-public/favicon-color.svg}"
OUTPUT_DIR="public"

echo "Generating PWA icons from $SVG_SOURCE..."

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "Using ImageMagick..."
    
    # Generate 192x192 icon
    convert -background none "$SVG_SOURCE" -resize 192x192 "$OUTPUT_DIR/icon-192.png"
    echo "✓ Generated icon-192.png"
    
    # Generate 512x512 icon
    convert -background none "$SVG_SOURCE" -resize 512x512 "$OUTPUT_DIR/icon-512.png"
    echo "✓ Generated icon-512.png"
    
    # Generate Apple touch icon (180x180)
    convert -background none "$SVG_SOURCE" -resize 180x180 "$OUTPUT_DIR/apple-touch-icon.png"
    echo "✓ Generated apple-touch-icon.png"
    
    # Generate favicon
    convert -background none "$SVG_SOURCE" -resize 32x32 "$OUTPUT_DIR/favicon.png"
    echo "✓ Generated favicon.png"

elif command -v rsvg-convert &> /dev/null; then
    echo "Using rsvg-convert..."
    
    # Generate 192x192 icon
    rsvg-convert -w 192 -h 192 "$SVG_SOURCE" -o "$OUTPUT_DIR/icon-192.png"
    echo "✓ Generated icon-192.png"
    
    # Generate 512x512 icon
    rsvg-convert -w 512 -h 512 "$SVG_SOURCE" -o "$OUTPUT_DIR/icon-512.png"
    echo "✓ Generated icon-512.png"
    
    # Generate Apple touch icon (180x180)
    rsvg-convert -w 180 -h 180 "$SVG_SOURCE" -o "$OUTPUT_DIR/apple-touch-icon.png"
    echo "✓ Generated apple-touch-icon.png"
    
    # Generate favicon
    rsvg-convert -w 32 -h 32 "$SVG_SOURCE" -o "$OUTPUT_DIR/favicon.png"
    echo "✓ Generated favicon.png"

else
    echo "❌ Error: Neither ImageMagick nor rsvg-convert found."
    echo "Please install one of these tools:"
    echo "  - ImageMagick: sudo apt-get install imagemagick"
    echo "  - rsvg-convert: sudo apt-get install librsvg2-bin"
    exit 1
fi

echo ""
echo "All icons generated successfully!"
echo "Files created in $OUTPUT_DIR/:"
echo "  - icon-192.png (192x192)"
echo "  - icon-512.png (512x512)"
echo "  - apple-touch-icon.png (180x180)"
echo "  - favicon.png (32x32)"
