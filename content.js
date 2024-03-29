// Make API browser agnostic
const webext = ( typeof browser === 'object' ) ? browser : chrome;
const svgns = 'http://www.w3.org/2000/svg';
// Default values
let key = 'alt';
let maxDelay = 60;
let angle = 120;
let size = 38;
let leftSide = false;
let label = false;
let animation = false;
// Default properties of the svg arc, only d (degrees) is mutable
let arcPr = {
	cx: size / 2,
	cy: size / 2,
	r: (size / 2) - 4,
	d: angle
};

// Coordinates of the knob
let xKnob = 0;
let yKnob = 0;
// Pointer coordinates (when knob is shown)
let xMouse = 0;
let yMouse = 0;

let link = '';
// used to update knob position to adjust for edge cases or context menu knob creation
let firstMouseMove = false;

function updatePrefs(result) {
	if (result) {
		key = result.settings.key;
		maxDelay = result.settings.delay;
		angle = result.settings.angle;
		size = result.settings.size;
		leftSide = result.settings.left;
		label = result.settings.label;
		animation = result.settings.animation;
	}
	arcPr = {
		cx: size / 2,
		cy: size / 2,
		r: (size / 2) - 4,
		d: angle
	};
}

// Handle mousemove events while knob is visible
function handleMouseMove(event) {
	// overwrite knob coordinates on first mouse move to make calculations for edge cases easier
	if (firstMouseMove) {
		xKnob = event.pageX - (leftSide ? size : 0);
		yKnob = event.pageY;
		firstMouseMove = false;
	}
	xMouse = event.pageX;
	yMouse = event.pageY;
	dxMouse = xMouse - xKnob - (leftSide ? size : 0) + angle;
	// update knob
	if (0 < dxMouse && dxMouse < 360) {
		arcPr.d = dxMouse;
		document.getElementById('oixs-svg-arc').setAttribute('d', buildPathData());
		if (label) {
			document.getElementById('oixs-label').textContent = Math.ceil(arcPr.d / (360 / maxDelay));
		}
	}
}

// Handle mouse click events while knob is visible
function handleMouseClick(event) {
	if (link) {
		event.preventDefault();
		let delay = (arcPr.d / (360 / maxDelay)) * 1000;
		webext.runtime.sendMessage({action: 'start_timer', link: link, delay: delay});
		link = '';
		removeControlKnob();
	}
}

function handleMouseAuxClick(event) {
	event.preventDefault();
	removeControlKnob();
}

function handleKeyDown(event) {
	if (event.code === 'Escape') {
		removeControlKnob();
	}
}

function handleContextMenu(event) {
	event.preventDefault();
}

function buildPathData() {
	let rad = arcPr.d * (Math.PI / 180);
	let x1 = arcPr.cx + arcPr.r * Math.cos(rad);
	let y1 = arcPr.cy + arcPr.r * Math.sin(rad);
	let large = arcPr.d > 180 ? 1 : 0;
	return `M ${arcPr.cx} ${arcPr.cy} L ${arcPr.cx + arcPr.r} ${arcPr.cy} A ${arcPr.r} ${arcPr.r} 0 ${large} 1 ${x1} ${y1} Z`;
}

function drawArc() {
	let arc = document.createElementNS(svgns, 'path');
	arc.setAttribute('id', 'oixs-svg-arc');
	arc.setAttribute('d', buildPathData());
	arc.setAttribute('stroke', '#606060');
	arc.setAttribute('stroke-width', 1);
	arc.setAttribute('fill', '#ffffffcc');
	return arc;
}

function createControlKnob() {
	let svgNode = document.createElementNS(svgns, 'svg');
	svgNode.setAttribute('id', 'oixs-svg');
	svgNode.setAttribute('width', `${size}px`);
	svgNode.setAttribute('height', `${size}px`);
	svgNode.style.left = xKnob + 'px';
	svgNode.style.top = yKnob + 'px';
	svgNode.classList.add(animation ? 'animation-zoom-in-rotated' : false) ;
	svgNode.appendChild(drawArc());
	document.body.appendChild(svgNode);

	if (label) {
		let labelSecs = document.createElement('div');
		labelSecs.textContent = Math.ceil(arcPr.d / (360 / maxDelay));
		labelSecs.setAttribute('id', 'oixs-label');
		labelSecs.style.width = `${size}px`;
		labelSecs.style.height = `${size}px`;
		labelSecs.style.fontSize = `${Math.ceil(size / 2.6)}px`;
		labelSecs.style.left = xKnob + 'px';
		labelSecs.style.top = yKnob + 'px';
		labelSecs.classList.add(animation ? 'animation-zoom-in' : false);
		document.body.appendChild(labelSecs);
	}

	// add event listeners
	document.body.addEventListener('mousemove', handleMouseMove);
	document.body.addEventListener('click', handleMouseClick);
	document.body.addEventListener('auxclick', handleMouseAuxClick);
	document.body.addEventListener('keydown', handleKeyDown);
	document.body.addEventListener('contextmenu', handleContextMenu);

	firstMouseMove = true;
}

function removeControlKnob() {
	if (animation) {
		document.getElementById('oixs-svg').classList.add('animation-zoom-out-rotated');
		if (label) {
			document.getElementById('oixs-label').classList.add('animation-zoom-out');
		}
		setTimeout(() => {
			document.body.removeChild(document.getElementById('oixs-svg'));
			if (label) {
				document.body.removeChild(document.getElementById('oixs-label'));
			}
		}, 100);
	}
	else {
		document.body.removeChild(document.getElementById('oixs-svg'));
		if (label) {
			document.body.removeChild(document.getElementById('oixs-label'));
		}
	}
	document.body.removeEventListener('mousemove', handleMouseMove);
	document.body.removeEventListener('click', handleMouseClick);
	document.body.removeEventListener('auxclick', handleMouseAuxClick);
	document.body.removeEventListener('keydown', handleKeyDown);
	document.body.removeEventListener('contextmenu', handleContextMenu);
	// reset starting angle
	arcPr.d = angle;
	// reset flag in case mouse hasn't been moved at all after knob was shown
	firstMouseMove = false;
}

// Make sure the control knob doesn't get out of screen
function setKnobCoords(pageX, pageY, clientX, clientY) {
	if (leftSide) {
		xKnob = (clientX - size < 0) ? pageX : pageX - size;
	}
	else {
		xKnob = (clientX + size > window.innerWidth) ? pageX - size : pageX;
	}
	yKnob = (clientY + size > window.innerHeight) ? pageY - size : pageY;
}

document.body.addEventListener('click', (event) => {
	let keyCondition = (key === 'alt') ? event.altKey : (key === 'alt + ctrl') ? event.altKey && event.ctrlKey : event.ctrlKey && event.shiftKey;
	if (keyCondition && (event.srcElement.nodeName === 'A' || event.srcElement.parentNode.nodeName === 'A')) {
		event.preventDefault();
		setKnobCoords(event.pageX, event.pageY, event.clientX, event.clientY);
		createControlKnob();
		link = event.srcElement.href || event.srcElement.parentNode.href;
	}
});

// Listen for any context menu openings
document.addEventListener('contextmenu', (event) => {
	setKnobCoords(event.pageX, event.pageY, event.clientX, event.clientY);
});

// Load preferences from storage
webext.storage.sync.get('settings').then(updatePrefs).catch((error) => {
	//console.log('Error while reading from storage, will use default values\n', error);
});

// Receive messages from background script or options
webext.runtime.onMessage.addListener((message) => {
	if (message.action === 'create_knob') {
		link = message.data;
		createControlKnob();
	}
	else if (message.action === 'update_settings') {
		updatePrefs(message);
	}
});

