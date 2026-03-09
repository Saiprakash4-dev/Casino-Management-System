#!/usr/bin/env bash
set -euo pipefail

BROKER="${1:-kafka:9092}"
TOPICS=(
  "casino.roulette.bet.placed"
  "casino.roulette.round.resolved"
)

echo "Creating Kafka topics on ${BROKER}..."

for topic in "${TOPICS[@]}"; do
  kafka-topics --bootstrap-server "${BROKER}" --create --if-not-exists --topic "${topic}" --replication-factor 1 --partitions 1
  echo "created: ${topic}"
done

echo "Done."
