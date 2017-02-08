'use strict';

const fs = require('fs');

const trelloBoardName = process.env.TRELLO_BOARD_NAME;
const trelloData = require(`./tmp/${trelloBoardName}.trello.json`);

const itemListNameToItemType = {
	Tasks: 'task',
	Features: 'story',
	'User stories': 'story',
	'Use cases': 'story',
	Libraries: 'research',
	Tools: 'research',
	default: 'task',
};

const hierarchy = convertTrelloToHierarchy(trelloData);
const table = convertHierarchyToTable(hierarchy);
const tableCsv = convertTableToCsv(table);
fs.writeFile(`./tmp/${trelloBoardName}.hierarchy.json`,
	JSON.stringify(hierarchy, undefined, 2), 'utf8', (err) => {
	if (err) {
		console.err(err);
	}
});
fs.writeFile(`./tmp/${trelloBoardName}.table.json`,
	JSON.stringify(table, undefined, 2), 'utf8', (err) => {
	if (err) {
		console.err(err);
	}
});
fs.writeFile(`./tmp/${trelloBoardName}.table.csv`,
	tableCsv, 'utf8', (err) => {
	if (err) {
		console.err(err);
	}
});

function convertTableToCsv (table) {
	let out = table.map((entry) => {
		return entry.map((cell) => `"${cell}"`).join(', ');
	}).join('\n');
	return `"Theme", "Epic", "Item", "ItemType", "Points"\n${out}\n`;
}

function convertHierarchyToTable (hierarchy) {
	const table = [];
	let listName;
	let cardName;
	let itemName;
	let itemType;
	let prevTableLine = [,,,,];
	let currTableLine;
	hierarchy.lists.forEach((list) => {
		listName = list.name;
		list.cards.forEach((card) => {
			cardName = card.name;
			card.items.forEach((item) => {
				itemName = item.name;
				itemType = item.type;
				currTableLine = [
					listName,
					cardName,
					itemName,
					itemType,
					0
				];
				table.push([
					prevTableLine[0] === listName ? '' : listName,
					prevTableLine[1] === cardName ? '' : cardName,
					itemName,
					itemType,
					0
				]);
				prevTableLine = currTableLine;
			});
		});
	});

	return table;
}

function convertTrelloToHierarchy (trelloData) {
	const listMap = createIdMap(trelloData.lists);
	const cardMap = createIdMap(trelloData.cards);
	const checklistMap = createIdMap(trelloData.checklists);

	const data = {
		lists: [],
	};
	addLists(data, listMap, cardMap, checklistMap);

	return data;
}

function createIdMap(arr) {
	const idMap = new Map();
	arr.forEach((item) => {
		idMap.set(item.id, item);
	});
	return idMap;
}

function addLists(data, listMap, cardMap, checklistMap) {
	const outListMap = new Map();
	listMap.forEach((list, listId) => {
		const listOut = {
			name: list.name,
			cards: [],
		};
		outListMap.set(listId, listOut);
	});

	addCards(outListMap, cardMap, checklistMap);

	outListMap.forEach((outList) => {
		data.lists.push(outList);
	});

	return;
}

function addCards(outListMap, cardMap, checklistMap) {
	cardMap.forEach((card, cardId) => {
		const listId = card.idList;
		const checklistIds = card.idChecklists;
		const outList = outListMap.get(listId);
		if (!outList) {
			console.error(`Card#${cardId} cannot find parent List#${listId} (${card.name})`);
			return;
		}
		const outCard = {
			name: card.name,
			items: [],
		};
		outList.cards.push(outCard);
		checklistIds.forEach((checklistId) => {
			const checklist = checklistMap.get(checklistId);
			if (!checklist) {
				console.error(`Card#${cardId} cannot find child Checklist#${checklistId} (${card.name})`);
				return;
			}
			const itemType = itemListNameToItemType[checklist.name] || itemListNameToItemType.default;
			checklist.checkItems.forEach((checkItem) => {
				const outItem = {
					name: checkItem.name,
					type: itemType,
				};
				outCard.items.push(outItem);
			});
		});
	});
}
