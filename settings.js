// Make API browser agnostic
const webext = ( typeof browser === 'object' ) ? browser : chrome;

function saveSettings(event) {
	event.preventDefault();
	let prefs = {
		key: document.getElementById('key').value,
		delay: document.getElementById('delay').valueAsNumber,
		angle: document.getElementById('angle').valueAsNumber,
		size: document.getElementById('size').valueAsNumber,
		left: document.getElementById('left').checked,
		label: document.getElementById('label').checked,
		animation: document.getElementById('animation').checked,
		switching: document.getElementById('switching').checked,
		menu: document.getElementById('menu').checked
	};

	webext.storage.sync.set({settings: prefs}).then(() => {
		// tell background script to update context menu item
		webext.runtime.sendMessage({action: 'update_settings', context_menus: prefs.menu, switching: prefs.switching});
		// update preferences for every open loaded tab (except those where content scripts aren't allowed)
		webext.tabs.query({status: 'complete'}).then((tabs) => {
			for (const tab of tabs) {
				webext.tabs.sendMessage(tab.id, {action: 'update_settings', settings: prefs}).catch((error) => {});
			}
		}).catch((error) => {
			console.log('Error while writing to storage\n', error);
		});

	});
}

function loadSettings() {
	webext.storage.sync.get('settings').then((result) => {
		document.getElementById('key').value = result.settings.key || 'alt';
		document.getElementById('delay').value = result.settings.delay || 60;
		document.getElementById('angle').value = result.settings.angle || 120;
		document.getElementById('size').value = result.settings.size || 38;
		document.getElementById('left').checked = result.settings.left;
		document.getElementById('label').checked = result.settings.label;
		document.getElementById('animation').checked = result.settings.animation;
		document.getElementById('switching').checked = result.settings.switching;
		document.getElementById('menu').checked = result.settings.menu;
	}).catch((error) => {
		console.log('Error while reading from storage\n', error);
	});
}

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('form').addEventListener('submit', saveSettings);
