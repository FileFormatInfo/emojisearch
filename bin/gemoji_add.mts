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
	keywords?: string[];
}

type SearchData = {
	success: boolean;
	lastmod: string;
	data: SearchEntry[];
}

type GemojiEntry = {
	emoji: string;
	description: string;
	aliases: string[];
	tags: string[];
};

async function main() {
	console.log(`INFO: starting at ${new Date().toISOString()}`);

	const gemojiPath = path.join( __dirname, '..', 'tmp', 'gemoji.json' );
	const jsonPath = path.join( __dirname, '..', 'public', 'emoji.json' );

	try {
		await fs.access(gemojiPath);
	} catch (err) {
		console.log(`INFO: gemoji file does not exist in ${gemojiPath}`);
		process.exit(1);
	}

	// Read and parse the Gemoji file
	console.log(`INFO: reading file from ${gemojiPath}`);
	const gemojiData = await fs.readFile(gemojiPath, "utf-8");
	console.log(`INFO: parsing gemoji data`);
	const gemoji = JSON.parse(gemojiData) as GemojiEntry[];

	const gemojiMap: Map<string, GemojiEntry> = new Map();
	for (const entry of gemoji) {
		gemojiMap.set(entry.emoji, entry);
	}

	try {
		await fs.access(jsonPath);
	} catch (err) {
		console.log(`INFO: data file does not exist in ${jsonPath}`);
		process.exit(1);
	}

	// read and parse the emoji.json file
	console.log(`INFO: reading file from ${jsonPath}`);
	const rawData = await fs.readFile(jsonPath, "utf-8");
	console.log(`INFO: parsing emoji data`);
	const data = JSON.parse(rawData) as SearchData;

	for (const row of data.data) {
		const gemojiEntry = gemojiMap.get(row.emoji);
		if (!gemojiEntry) {
			console.log(`WARN: no gemoji entry found for emoji ${row.emoji} (${row.description})`);
			continue;
		}

		// merge tags and aliases
		const newTags = new Set<string>([...gemojiEntry.tags, ...gemojiEntry.aliases]);
		if (newTags.size === 0) {
			continue;
		}
		row.keywords = Array.from(newTags);
	}

	// save the updated json data
	console.log(`INFO: writing emoji data to ${jsonPath}`);
	await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
	console.log(`INFO: wrote JSON data to ${jsonPath}`);
}



main().then( () => {
	console.log(`INFO: complete at ${new Date().toISOString()}`);
});
