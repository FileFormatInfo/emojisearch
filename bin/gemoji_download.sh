#!/usr/bin/env bash
#
# Download gemoji data from Github
#

set -o nounset
set -o errexit
set -o pipefail

SCRIPT_HOME="$( cd "$( dirname "$0" )" && pwd )"
BASE_DIR=$(realpath "${SCRIPT_HOME}/..")

echo "INFO: starting extra emoji download at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

TMP_DIR="${BASE_DIR}/tmp"
if [ ! -d "${TMP_DIR}" ]; then
	echo "INFO: creating temp dir ${TMP_DIR}"
	mkdir -p "${TMP_DIR}"
else
	echo "INFO: using existing temp dir ${TMP_DIR}"
fi

curl \
	--location \
	--output "${TMP_DIR}/gemoji.json" \
	--show-error \
	--silent \
	https://raw.githubusercontent.com/github/gemoji/refs/heads/master/db/emoji.json

curl \
	--location \
	--output "${TMP_DIR}/emojilib.json" \
	--show-error \
	--silent \https://github.com/muan/emojilib/raw/refs/heads/main/dist/emoji-en-US.json

echo "INFO: completed extra emoji download at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
