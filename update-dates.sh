#!/bin/bash

# Update all Golang posts to use the correct date format
for file in src/content/post/golang/*.md; do
  # Replace any date format with YYYY-MM-DD
  sed -i '' 's/publishDate: ".*"/publishDate: 2024-12-13/g' "$file"
done
