#!/usr/bin/env bash
#
# Update status.json with the current build values
#

set -o nounset
set -o errexit
set -o pipefail

SCRIPT_HOME="$( cd "$( dirname "$0" )" && pwd )"
BASE_DIR=$(realpath "${SCRIPT_HOME}/..")

# check that jq is installed
if ! command -v jq &> /dev/null; then
	echo "ERROR: jq is not installed. Please install jq to continue."
	exit 1
fi

# check that sponge is installed
if ! command -v sponge &> /dev/null; then
	echo "ERROR: sponge is not installed. Please install sponge (from moreutils) to continue."
	exit 1
fi

STATUS_FILE="${BASE_DIR}/public/status.json"

LASTMOD=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TECH="NodeJS $(node --version)"
COMMIT=$(git -C "${BASE_DIR}" rev-parse --short HEAD)

echo "INFO: updating status file ${STATUS_FILE}"

jq \
	--arg lastmod "${LASTMOD}" \
	--arg tech "${TECH}" \
	--arg commit "${COMMIT}" \
	--compact-output \
	'.lastmod = $lastmod | .tech = $tech | .commit = $commit' \
	"${STATUS_FILE}" | sponge "${STATUS_FILE}"

echo "INFO: completed at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
