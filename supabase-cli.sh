#!/bin/bash
# Supabase CLI Helper Script
# Usage: ./supabase-cli.sh <command> [args]
# Example: ./supabase-cli.sh db push
# Example: ./supabase-cli.sh migration new add_user_preferences

# Load access token from .env.local
export SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env.local | cut -d'=' -f2)

# Run supabase command with all arguments
npx supabase "$@"
