// Context menu item for oixs
const menuItem = {
	id: 'oixs',
	title: 'Open in X seconds',
	contexts: ['link', 'image', 'video']
};
// chrome.alarms min delay is 30s. Coincidentally, service workers get inactive after 30s.
const delayThreshold = 30000;
// Keep all the pending links here
let pendingLinks = new Map();

// Store default settings on first install and create context menu item
chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason === 'install') {
		chrome.storage.sync.set({settings: {
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
	chrome.contextMenus.create(menuItem);
});

// Clear any alarms from previous session on startup
chrome.runtime.onStartup.addListener(() => {
	chrome.alarms.clearAll();
});

function updateBadge() {
	chrome.alarms.getAll().then((alarms) => {
		chrome.action.setBadgeBackgroundColor({
			color: '#000080'
		});
		let number = alarms.length + [...pendingLinks.keys()].length;
		chrome.action.setBadgeText({
			text: '' + (!number ? '' : number)
		});
	});
}

// Used only when delay < 30s
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

// Read settings from storage before openning the link
function openLink(link) {
	chrome.storage.sync.get('settings').then((result) => {
		chrome.tabs.create({active: result.settings.switching, url: link});
	});
}

// Handle context menu item click event
chrome.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === menuItem.id) {
		url = info.linkUrl || info.srcUrl;
		chrome.tabs.sendMessage(tab.id, {action: 'create_knob', data: url});
	}
});

// Handle alarms firing off
chrome.alarms.onAlarm.addListener((alarmInfo) => {
	openLink(alarmInfo.name);
	updateBadge();
});

// Receive messages, from content script, popup or settings
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	switch (message.action) {
		case 'start_timer':
			// cancel pending links, clear timeout for message.link if it exists, else clear alarm
			if ([...pendingLinks.keys()].includes(message.link)) {
				clearTimeout(pendingLinks.get(message.link).timeoutId);
				pendingLinks.delete(message.link);
			}
			else {
				chrome.alarms.get(message.link).then((alarm) => {
					if (alarm) {
						chrome.alarms.clear(alarm.name);
					}
				});
			}
			// use alarms for delays over 30s, else timeouts
			if (message.delay > delayThreshold) {
				chrome.alarms.create(message.link, {delayInMinutes: message.delay / 1000 / 60});
			}
			else {
				pendingLinks.set(message.link,
					{
						scheduledTime: new Date().getTime() + message.delay,
						timeoutId: -1
					});
				handleLink(message.link, message.delay).then((data) => {
					openLink(message.link);
					pendingLinks.delete(message.link);
					updateBadge();
					sendResponse();
				}).catch((error) => {});
			}
			updateBadge();
			break;
		case 'get_links':
			chrome.alarms.getAll().then((alarms) => {
				let responseLinks = [...pendingLinks];
				for (const alarm of alarms) {
					responseLinks.push([alarm.name, {scheduledTime: alarm.scheduledTime, timeoutId: -1}]);
				}
				sendResponse({
					pendingLinks: responseLinks
				});
			});
			// return true to tell the browser we intend to use sendResponse after this block finishes
			return true;
		case 'cancel_link':
			// if no such alarm exists, delete from the pending timeout links map
			chrome.alarms.clear(message.link).then((cleared) => {
				if (!cleared) {
					pendingLinks.delete(message.link);
				}
				updateBadge();
			});
			break;
		case 'update_settings':
			chrome.contextMenus.update(menuItem.id, {visible: message.context_menus});
			break;
		default:
			return;
	}
});
