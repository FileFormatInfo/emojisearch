import "./styles.css";
import "../node_modules/tabulator-tables/dist/css/tabulator_bootstrap5.min.css";

import {
	CellComponent,
	EditModule,
	Filter,
	FilterModule,
	FormatModule,
	InteractionModule,
	PopupModule,
	ResizeColumnsModule,
	ResizeTableModule,
	ResponsiveLayoutModule,
	Sorter,
	SortModule,
	Tabulator,
	TooltipModule,
} from "tabulator-tables";

type SearchEntry = {
	codepoints: string;
	qualification: string;
	emoji: string;
	description: string;
	version: string;
	group: string;
	subgroup: string;
};

type SearchData = {
	success: boolean;
	data: SearchEntry[];
};

type EmojiData = {
	codepoints: string;
	emoji: string;
	description: string;
	tags: string[];
}

const dataUrl = "/emoji.json";

function filterDescription(
	headerValue: string,
	sortValue: string,
	rowData: any,
	filterParams: any
) {
	if (!headerValue) return true;

	const rowValue = rowData.description as string;

	if (headerValue.length == 1 && headerValue != "^" && headerValue != "/") {
		// single character, do starts with
		const search = headerValue.toLowerCase();
		return rowValue.toLowerCase().startsWith(search);
	}

	if (headerValue.startsWith("^")) {
		// starts with
		if (headerValue.length == 1) {
			return true;
		}
		const search = headerValue.substring(1).toLowerCase();
		return rowValue.toLowerCase().startsWith(search);
	}

	if (headerValue.startsWith("/") && headerValue.endsWith("/")) {
		// regex
		const pattern = headerValue.substring(1, headerValue.length - 1);
		try {
			const re = new RegExp(pattern, "i");
			return re.test(rowValue);
		} catch (e) {
			// bad regex
			return false;
		}
	}

	// contains
	const search = headerValue.toLowerCase();
	return rowValue.toLowerCase().includes(search);
}

function filterTags(
	headerValue: string,
	rowValue: string[],
	rowData: any,
	filterParams: any
) {
	if (!headerValue || headerValue.length == 0) return true;

	const headerVals = headerValue.split(/[ ,]+/);
	const rowVals:string[] = rowValue || [];

	for (const filterVal of headerVals) {
		if (filterVal.startsWith("!")) {
			if (rowVals.indexOf(filterVal.slice(1)) != -1) {
				return false;
			}
		} else {
			if (rowVals.indexOf(filterVal) == -1) {
				return false;
			}
		}
	}
	return true;
}

function fmtCodepoints(cell: CellComponent) {
	const val = cell.getValue() as string;
	if (!val) {
		return "";
	}
	return `U+${val.toUpperCase()}`;
}

function fmtEmoji(cell: CellComponent) {
	const val = cell.getValue() as string;
	if (!val) {
		return "";
	}
	return `<span style="font-size:2em;">${val}</span>`;
}

function fmtTags(cell: CellComponent) {
	const tags = cell.getValue() as string[];
	if (!tags || tags.length === 0) {
		return "";
	}

	const container = document.createElement("div");

	const keys = tags.sort();

	for (const key of keys) {
		var el = document.createElement("span");
		el.className =
			"badge border border-primary text-primary me-1 mb-1 text-decoration-none";
		el.textContent = key;
		el.style.cursor = "pointer";
		el.onclick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			toggleTagFilter(cell, key);
		}
		container.appendChild(el);
	}

	return container;
}


function showError(msg: string) {
	console.log(`ERROR: ${msg}`);
	document.getElementById("loading")!.classList.add("d-none");
	document.getElementById("errdiv")!.classList.remove("d-none");
	document.getElementById("errmsg")!.innerHTML = msg;
}

function toggleTagFilter(cell: CellComponent, tag: string): void {
	const tbl = cell.getTable();
	var headerFilter = "";
	const headerFilters = tbl.getHeaderFilters();
	var existingFilter: Filter | null = null;
	for (const hf of headerFilters) {
		if (hf.field == "tags") {
			headerFilter = hf.value;
			existingFilter = hf;
			break;
		}
	}

	if (existingFilter == null) {
		console.log(`adding to blank`);
		tbl.setHeaderFilterValue(cell.getColumn(), tag);
	} else {
		tbl.setHeaderFilterValue(
			cell.getColumn(),
			(existingFilter.value = toggleTagArray(
				headerFilter.split(/[ ,]+/),
				tag
			).join(" "))
		);
	}
	tbl.refreshFilter();
}

function toggleTagArray(tags: string[], tag: string): string[] {
	var idx = tags.indexOf(tag);
	if (idx != -1) {
		tags.splice(idx);
		return tags;
	}

	tags.push(tag);
	return tags;
}

async function main() {
	let data: EmojiData[] = [];

	var rawData:any;
	try {
		const resp = await fetch(dataUrl, {
			method: "GET",
			redirect: "follow",
		});
		if (!resp.ok) {
			showError(
				`HTTP Error fetching logo data: ${resp.status} ${resp.statusText}`
			);
			return;
		}
		rawData = (await resp.json() as SearchData);
	} catch (error) {
		showError(`Error fetching emoji data: ${error}`);
		return;
	}

	for (const row of rawData.data) {
		const tags = [row.group.replaceAll(' ', '-'), row.subgroup, row.qualification, row.version];
		if (row.description.endsWith("skin tone")) {
			tags.push("skin-tone");
			var colon = row.description.lastIndexOf(":");
			if (colon != -1) {
				const tone = row.description.slice(colon + 2, -10);
				tags.push(tone.replaceAll(' ', '-').toLowerCase());
			}
		}
		data.push( {
			codepoints: row.codepoints,
			emoji: row.emoji,
			description: row.description,
			tags,
		} );
	}

	console.log(data[0]);

	const qs = new URLSearchParams(window.location.search);
	const sort: Sorter[] = [ { column: "codepoints", dir: "asc" } ];
	const filters: Filter[] = [];
	if (qs) {
		;
		for (const [key, value] of qs.entries()) {
			if (key == "sort") {
				sort[0].column = value;
				continue;
			}
			if (key == "dir") {
				sort[0].dir = (value == "desc") ? "desc" : "asc";
			}
			if (key && value) {
				filters.push({ field: key, type: "=", value: value });
			}
		}
	}

	Tabulator.registerModule([
		EditModule,
		FilterModule,
		FormatModule,
		InteractionModule,
		PopupModule,
		ResizeColumnsModule,
		ResizeTableModule,
		ResponsiveLayoutModule,
		SortModule,
		TooltipModule,
	]);

	const table = new Tabulator("#achtable", {
		autoResize: true,
		data,
		columns: [
			{
				cellClick: (e, cell) => {
					const data = cell.getRow().getData();
					e.preventDefault();
					e.stopPropagation();
					table.alert(
						`${data.description} copied to clipboard`
					);
					setTimeout(() => table.clearAlert(), 1000);
					navigator.clipboard.writeText(data.emoji);
				},
				field: "",
				formatter: () =>
					`<img src="/images/icons/clipboard.svg" alt="Copy to clipboard" height="16">`,
				headerSort: false,
				title: "",
			},
			{
				cssClass: "p-0 flex justify-content-center align-items-center",
				field: "emoji",
				formatter: fmtEmoji,
				headerFilter: "input",
				headerFilterFunc: (
					headerValue,
					rowValue,
					rowData,
					filterParams
				) => {
					if (!headerValue) return true;
					return headerValue == rowValue;
				},
				headerHozAlign: "center",
				headerSort: false,
				hozAlign: "center",
				responsive: 0,
				title: "Emoji",
				width: 150,
			},
			{
				field: "codepoints",
				formatter: fmtCodepoints,
				headerFilter: "input",
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 10,
				sorter: function (a, b, aRow, bRow, column, dir, sorterParams) {
					const aInt = parseInt(a, 16);
					const bInt = parseInt(b, 16);
					return aInt - bInt;
				},
				title: "Codepoint(s)",
				width: 150,
			},
			{
				title: "Description",
				field: "description",
				formatter: "link",
				formatterParams: {
					labelField: "description",
					url: (cell) => {
						var codepoints = cell.getData().codepoints;
						return `https://www.fileformat.info/info/emoji/${codepoints}/index.htm`;
					},
					target: "_blank",
				},
				headerFilter: "input",
				headerFilterFunc: filterDescription,
				headerPopup: `Use <code>^</code> to search at the beginning<br/>Use <code>/regex/</code> to search with a regular expression`,
				headerPopupIcon:
					'<span class="badge rounded-pill text-bg-primary">?</span>',
				responsive: 0,
				//sorter: "string",
				width: 375,
			},
			{
				title: "Tags",
				field: "tags",
				formatter: fmtTags,
				headerFilter: "input",
				headerFilterFunc: filterTags,
				headerPopup: `Separate multiple tags with space or comma.<br/>Prefix a tag with <code>!</code> to exclude it.`,
				headerPopupIcon:
					'<span class="badge rounded-pill text-bg-primary">?</span>',
				headerSort: false,
				responsive: 15,
				width: 375,
			},
		],
		height: "100%",
		initialHeaderFilter: filters,
		initialSort: [{ column: "code", dir: "asc" }],
		layout: "fitDataStretch",
		placeholder: "No matches",
		responsiveLayout: "hide",
		footerElement: `<span class="w-100 mx-2 my-1">
				<img src="/favicon.svg" class="pe-2" style="height:1.2em;" alt="EmojiSearch logo"/>EmojiSearch
				<span id="rowcount" class="px-3">Rows: ${data.length.toLocaleString()}</span>
				<a class="d-none d-lg-block float-end" href="https://github.com/FileFormatInfo/emojisearch">Source</a>
			</span>`,
	});

	table.on("dataFiltered", function (filters, rows) {
		var el = document.getElementById("rowcount");
		if (filters && filters.length > 0) {
			el!.innerHTML = `Rows: ${rows.length.toLocaleString()} of ${data.length.toLocaleString()}`;
			var qs = filters
				.map(f => `${encodeURIComponent(f.field)}=${encodeURIComponent(f.value)}`)
				.join("&");
			qs += `&sort=${table.getSorters()[0]?.column.getField()}&dir=${table.getSorters()[0]?.dir}`;
			window.history.replaceState(null, "", "?" + qs);
		} else {
			el!.innerHTML = `Rows: ${data.length.toLocaleString()}`;
		}
	});

	table.on("dataSorted", function (sorters, rows) {
		var qs = `sort=${sorters[0]?.column.getField()}&dir=${sorters[0]?.dir}`;
		const filters = table.getFilters(true);
		if (filters && filters.length > 0) {
			qs = filters
				.map(f => `${encodeURIComponent(f.field)}=${encodeURIComponent(f.value)}`)
				.join("&") + "&" + qs;
		}
		window.history.replaceState(null, "", "?" + qs);
	});

	document.getElementById("loading")!.style.display = "none";
	document.getElementById("achtable")!.style.display = "block";
}

main();
