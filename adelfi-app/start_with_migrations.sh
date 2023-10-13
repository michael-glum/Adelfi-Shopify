#!/bin/sh

set -ex

npx prisma migrate deploy

# Check if it's the initial deployment
if [ "$INITIAL_DEPLOYMENT" = "true" ]; then
  # Call JavaScript seeder file using the node command
  node prisma/seedDatabase.js

  # Logging
  echo "Database seeding completed for the initial deployment"
else
  # Logging
  echo "Initial deployment flag not set; skipping seeder script."
fi

npm run start