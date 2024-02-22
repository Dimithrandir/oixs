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

function handleLink(link, delay) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			// resolve if link is still pending (still not deleted from pendingLinks)
			if ([...pendingLinks.keys()].includes(link)) {
				resolve();	
			}
			// reject if it's been canceled in the meantime
			else {
				reject();
			}
		}, delay);
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
			pendingLinks.set(
				message.link,
				{
					start: new Date().getTime(),
					delay: message.delay
				});
			handleLink(message.link, message.delay).then((data) => {
				browser.tabs.create({active: switching, url: message.link});
				pendingLinks.delete(message.link);
				sendResponse();
			}).catch((error) => {});
			break;
		case 'get_links':
			sendResponse({
				pendingLinks: Array.from(pendingLinks)
			});
			break;
		case 'cancel_link':
			pendingLinks.delete(message.link);
			break;
		case 'update_settings':
			switching = message.switching;
			browser.contextMenus.update(menuItem.id, {visible: message.context_menus});
			break;
		default:
			return;
	}
});
