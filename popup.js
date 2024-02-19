// Hide the links list, show the "empty list" label
function showEmptyList() {
	document.getElementById('pending-links-list').style.display = 'none';
	document.getElementById('no-pending-links').style.display = 'block';
}

// Get number of (visible) items in the links list (including the label)
function getListItemsNum() {
	let num = 0;
	for (const child of document.getElementById('pending-links-list').children) {
		if (child.style.display != 'none')	{
			num += 1;
		}
	}
	return num;
}

function createRow(i, link, time) {
	let itemNode = document.createElement('div'); 
	itemNode.id = `pending-link-item-${i}`;
	itemNode.classList.add('pending-link-item');

	let linkSpanNode = document.createElement('span');
	let linkSliced = link.endsWith('/') ? link.slice(0, -1) : link;
	linkSpanNode.innerHTML = linkSliced.split('://').pop();
	linkSpanNode.classList.add('pending-link-address');
	itemNode.appendChild(linkSpanNode);

	let delaySpanNode = document.createElement('span');
	delaySpanNode.innerHTML = time;
	delaySpanNode.classList.add('pending-link-timer');
	itemNode.appendChild(delaySpanNode);

	let buttonNode = document.createElement('div');
	buttonNode.classList.add('pending-link-cancel');
	buttonNode.addEventListener('click', () => {
		// Hide current item
		document.getElementById(`pending-link-item-${i}`).style.display = 'none';
		// Cancel pending promise in background
		browser.runtime.sendMessage({action: 'cancel_link', link: link});
		// It's 1 because we count the label (id='pending-links-label') too
		if (getListItemsNum() == 1) {
			showEmptyList();
		}
	});
	itemNode.appendChild(buttonNode);

	return itemNode;
}

function getRemainingTime(start, delay) {
	return Math.ceil((delay - (new Date().getTime() - start)) / 1000);
}

async function init() {
	document.getElementById('settings-label').addEventListener('click', () => {
		//document.getElementById('settings').style.display = (document.getElementById('settings').style.display == 'block') ? 'none' : 'block';
		browser.runtime.openOptionsPage();
	});

	// Response is Array constructed from Map
	let response = await browser.runtime.sendMessage({action: 'get_links'});
	// No pending links
	if (response.pendingLinks.length == 0) {
		showEmptyList();	
		return;
	}

	document.getElementById('no-pending-links').style.display = 'none';
	// Create pending links list
	for (let i = 0; i < response.pendingLinks.length; i++) {
		document.getElementById('pending-links-list').appendChild(createRow(i, response.pendingLinks[i][0], getRemainingTime(response.pendingLinks[i][1].start, response.pendingLinks[i][1].delay)));
	}

	// Update remaining time display every 500 millis, once it's <= 0 hide the element
	setInterval(() => {
		for (let i = 0; i < response.pendingLinks.length; i++) {
			let remainingTime = getRemainingTime(response.pendingLinks[i][1].start, response.pendingLinks[i][1].delay);
			if (remainingTime > 0) {
				document.getElementById(`pending-link-item-${i}`).querySelector('.pending-link-timer').innerHTML = remainingTime;	
			}
			else {
				document.getElementById(`pending-link-item-${i}`).style.display = 'none';
				if (getListItemsNum() == 1) {
					showEmptyList();
				}
			}
		}
	}, 500);

}

init();
