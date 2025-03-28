// Context menu item for oixs
const menuItem = {
	id: 'oixs',
	title: 'Open in X seconds',
	contexts: ['link', 'image', 'video']
};
// whether to switch to the new tab upon opening it
let switching = false;
// Keep all the pending links here
let pendingLinks = new Map();

browser.contextMenus.create(menuItem);

// Store default settings on install
browser.runtime.onInstalled.addListener((details) => {
	if (details.reason === 'install') {
		browser.storage.sync.set({settings: {
			key: 'alt',
			delay: 60,
			angle: 120,
			size: 38,
			left: false,
			label: false,
			animation: false,
			switching: false,
			menu: true
		}});
	}
});

function updateBadge() {
	browser.browserAction.setBadgeBackgroundColor({
		color: '#000080'
	});
	let number = [...pendingLinks.keys()].length;
	browser.browserAction.setBadgeText({
		text: '' + (!number ? '' : number)
	});
}

function handleLink(link, delay) {
	return new Promise((resolve, reject) => {
		let timeoutId = setTimeout(() => {
			// resolve if link is still pending (still not deleted from pendingLinks)
			if ([...pendingLinks.keys()].includes(link)) {
				resolve();	
			}
			// reject if it's been canceled in the meantime
			else {
				reject();
			}
		}, delay);
		pendingLinks.set(link,
			{
				scheduledTime: pendingLinks.get(link).scheduledTime,
				timeoutId: timeoutId
			});
	});
}

// Handle context menu item click event
browser.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === menuItem.id) {
		url = info.linkUrl || info.srcUrl;
		browser.tabs.sendMessage(tab.id, {action: 'create_knob', data: url});
	}
});

// Receive messages, from content script, popup or settings
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	switch (message.action) {
		case 'start_timer':
			// clear timeout for message.link if it exists
			if ([...pendingLinks.keys()].includes(message.link)) {
				clearTimeout(pendingLinks.get(message.link).timeoutId);
			}
			pendingLinks.set(message.link,
				{
					scheduledTime: new Date().getTime() + message.delay,
					timeoutId: -1
				});
			handleLink(message.link, message.delay).then((data) => {
				browser.tabs.create({active: switching, url: message.link});
				pendingLinks.delete(message.link);
				updateBadge();
				sendResponse();
			}).catch((error) => {});
			updateBadge();
			break;
		case 'get_links':
			sendResponse({
				pendingLinks: [...pendingLinks]
			});
			break;
		case 'cancel_link':
			pendingLinks.delete(message.link);
			updateBadge();
			break;
		case 'update_settings':
			switching = message.switching;
			browser.contextMenus.update(menuItem.id, {visible: message.context_menus});
			break;
		default:
			return;
	}
});
