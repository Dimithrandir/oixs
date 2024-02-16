const svgns = "http://www.w3.org/2000/svg";
const size = 38;
// Default properties of the svg arc, only d (degrees) is mutable
let arcPr = {
	cx: size / 2,
	cy: size / 2,
	r: (size / 2) - 4,
	d: 120
};
// Coordinates of the popup arc (for if we track mouse movement)
let xPop = 0;
let yPop = 0;
// Pointer coordinates (when popup arc is shown)
let xMouse = 0;
let yMouse = 0;

let shown = false; // not used for now...

let link = '';

// Handle mousemove events while the context menu is open
function handleMouseMove(event) {
	xMouse = event.pageX;
	yMouse = event.pageY;
	dxMouse = xMouse - xPop + 120;
	if (0 < dxMouse && dxMouse <= 360) {
		arcPr.d = dxMouse;
		document.getElementById('oixs-popup-arc').setAttribute('d', buildPathData());
	}
}

// Handle mouse click events while popup arc visible
function handleMouseClick(event) {
	if (link) {
		event.preventDefault();
		let delay = (arcPr.d / 6) * 1000;
		browser.runtime.sendMessage({action: 'start_timer', link: link, delay: delay});	
		link = '';
		removePopupArc();
	}
}

function handleMouseAuxClick(event) {
	event.preventDefault();
	removePopupArc();
}

function handleKeyDown(event) {
	if (event.code === 'Escape') {
		removePopupArc();
	}
}

function handleContextMenu(event) {
	event.preventDefault();
}

function buildPathData() { //cx, cy, r, d) {
	let rad = arcPr.d * (Math.PI / 180);
	let x1 = arcPr.cx + arcPr.r * Math.cos(rad);
	let y1 = arcPr.cy + arcPr.r * Math.sin(rad);
	let large = arcPr.d > 180 ? 1 : 0;
	return `M ${arcPr.cx} ${arcPr.cy} L ${arcPr.cx + arcPr.r} ${arcPr.cy} A ${arcPr.r} ${arcPr.r} 0 ${large} 1 ${x1} ${y1} Z`;
}

function drawArc() {
	let arc = document.createElementNS(svgns, 'path');
	arc.setAttribute('id', 'oixs-popup-arc');
	arc.setAttribute('d', buildPathData());
	arc.setAttribute('stroke', '#606060');
	arc.setAttribute('stroke-width', 1);
	arc.setAttribute('fill', '#ffffffcc');
	//let animation = document.createElementNS(svgns, 'animate');
	//animation.setAttribute('attributeName', '')
	return arc;
}

function createPopupArc() {
	let svgNode = document.createElementNS(svgns, 'svg');
	svgNode.setAttribute('id', 'oixs-popup');
	svgNode.setAttribute('width', size);
	svgNode.setAttribute('height', size);
	svgNode.style.left = xPop + 'px';
	svgNode.style.top = yPop + 'px';
	svgNode.appendChild(drawArc());
	document.body.appendChild(svgNode);
	shown = !shown;
	// add event listeners
	document.body.addEventListener('mousemove', handleMouseMove);
	document.body.addEventListener('click', handleMouseClick);
	document.body.addEventListener('auxclick', handleMouseAuxClick);
	document.body.addEventListener('keydown', handleKeyDown);
	document.body.addEventListener('contextmenu', handleContextMenu);
}

function removePopupArc() {
	document.body.removeChild(document.getElementById('oixs-popup'));
	document.body.removeEventListener('mousemove', handleMouseMove);
	document.body.removeEventListener('click', handleMouseClick);
	document.body.removeEventListener('auxclick', handleMouseAuxClick);
	document.body.removeEventListener('keydown', handleKeyDown);
	document.body.removeEventListener('contextmenu', handleContextMenu);
	shown = !shown;
	// reset starting angle
	arcPr.d = 120;
}

// Make sure the popup arc doesn't get out of screen
function setPopupArcCoords(pageX, pageY, clientX, clientY) {
	// this is to be read from storage...
	let rightSide = true;
	if (rightSide) {
		xPop = (clientX + size > window.innerWidth) ? pageX - size : pageX;
	}
	else {
		xPop = (clientX - size < 0) ? pageX : pageX - size;
	}
	yPop = (clientY + size > window.innerHeight) ? pageY - size : pageY;
}

document.body.addEventListener('click', (event) => {
	if (event.altKey && (event.srcElement.nodeName === 'A' || event.srcElement.parentNode.nodeName === 'A')) {
		setPopupArcCoords(event.pageX, event.pageY, event.clientX, event.clientY);
		createPopupArc();
		link = event.srcElement.href || event.srcElement.parentNode.href;
	}
});

// Listen for context menu openings
document.addEventListener('contextmenu', (event) => {
	setPopupArcCoords(event.pageX, event.pageY, event.clientX, event.clientY);
});

// Receive messages from background script
browser.runtime.onMessage.addListener((message) => {
	if (message.action === 'create_arc') {
		link = message.data;
		createPopupArc();
	}
});
