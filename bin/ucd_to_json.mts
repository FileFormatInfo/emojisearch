#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type SearchEntry = {
	codepoints: string;
	qualification: string;
	version: string;
	emoji: string;
	description: string;
	group: string;
	subgroup: string;
}

type SearchData = {
	success: boolean;
	lastmod: string;
	data: SearchEntry[];
}

async function main() {
	console.log(`INFO: starting at ${new Date().toISOString()}`);

	const txtPath = path.join( __dirname, '..', 'tmp', 'emoji-test.txt' );
	const jsonPath = path.join( __dirname, '..', 'public', 'emoji.json' );

	try {
		await fs.access(txtPath);
	} catch (err) {
		console.log(`INFO: txt file does not exist in ${txtPath}`);
		process.exit(1);
	}

	// Read and parse the XML file
	console.log(`INFO: reading XML file from ${txtPath}`);
	const txtData = await fs.readFile(txtPath, 'utf-8');
	console.log(`INFO: parsing txt data`);

	const data: SearchEntry[] = [];
	let currentGroup = '';
	let currentSubgroup = '';

	const lines = txtData.split(/\r?\n/);
	for (const line of lines) {
		// console.log(`LINE: ${line}`);
		if (line.length == 0) {
			continue;
		}
		if (line.startsWith('#')) {
			// comment line
			if (line.startsWith('# group: ')) {
				currentGroup = line.replace('# group: ', '').trim();
			} else if (line.startsWith('# subgroup: ')) {
				currentSubgroup = line.replace('# subgroup: ', '').trim();
			}
			continue;
		}

		const match = line.match(/^([0-9A-F ]+)\s*;\s*(fully-qualified|minimally-qualified|unqualified|component)\s*# (.+) E([0-9]+[.][0-9]+) (.+)$/);
		if (match) {
			data.push( {
				codepoints: match[1].trim(),
				qualification: match[2].trim(),
				emoji: match[3].trim(),
				description: match[5].trim(),
				version: match[4].trim(),
				group: currentGroup,
				subgroup: currentSubgroup,
				});
		} else {
			console.log(`DEBUG: no match for line: ${line}`);
		}
	}

	const output: SearchData = {
		success: true,
		lastmod: new Date().toISOString(),
		data,
	};

	// Write the JSON data to a file
	console.log(`INFO: writing ${data.length} emoji data to ${jsonPath}`);
	await fs.writeFile(jsonPath, JSON.stringify(output, null, 2), 'utf-8');
	console.log(`INFO: wrote JSON data to ${jsonPath}`);
}



main().then( () => {
	console.log(`INFO: complete at ${new Date().toISOString()}`);
});
