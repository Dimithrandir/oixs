// Create the context menu item for oixs
browser.contextMenus.create({
	id: 'oixs',
	title: 'Open in X seconds',
	contexts: ['link', 'image', 'video']
});

// Keep all the pending links here
let pendingLinks = new Map();

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
	if (info.menuItemId === 'oixs') {
		url = info.linkUrl || info.srcUrl;
		browser.tabs.sendMessage(tab.id, {action: 'create_knob', data: url});
	}
});

// Receive messages, from content script or popup
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
				browser.tabs.create({active: false, url: message.link});
				pendingLinks.delete(message.link);
				sendResponse();
			}).catch((error) => {});
			break;
		case 'get_links':
			sendResponse({
				pendingLinks: Array.from(pendingLinks)
			});
			// it's recommended to return a Promise instead of using sendResponse for firefox extensions
			//return Promise.resolve({pendingLinks: pendingLinks});
			break;
		case 'cancel_link':
			pendingLinks.delete(message.link);
			break;
		default:
			return;
	}
});
