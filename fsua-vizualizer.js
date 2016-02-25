document.addEventListener('DOMContentLoaded', function(){
	var cy = cytoscape({
		container: document.querySelector('#cy'),
		
		boxSelectionEnabled: false,
		autounselectify: true,
		
		style: cytoscape.stylesheet()
		.selector('node')
		.css({
			'label': 'data(name)',
			'width': 'label',
			'height': 'label',
			'padding-left': '6px',
			'padding-right': '6px',
			'padding-top': '6px',
			'padding-bottom': '6px',
			'text-valign': 'center',
			'background-color': 'white',
			'transition-property': 'color, border-color, background-color',
			'transition-duration': '0.5s',
			'color': 'black',
			'border-width': '2px',
			'border-style': 'solid',
			'border-color': 'black',
			'z-index' : '2'
		})
		.selector('edge')
		.css({
			'label': 'data(symbolsText)',
			'text-outline-width': '2px',
			'text-outline-color': 'white',
			'target-arrow-shape': 'triangle',
			'target-arrow-color': 'black',
			'line-color': 'black',
			'transition-property': 'color, line-color, target-arrow-color, source-arrow-color',
			'transition-duration': '0.5s',
			'edge-text-rotation': 'autorotate',
			'z-index' : '1'
		})
		.selector('.loop')
		.css({
			'target-arrow-shape': 'none',
			'source-arrow-shape': 'triangle',
			'source-arrow-color': 'black'
		})
		.selector('.endState')
		.css({
			'border-width': '5px',
			'border-style': 'double',
			'border-color': 'black',
		})
		.selector('.inactive')
		.css({
			'transition-duration': '0.5s',
			'color': '#D8D8D8',
			'border-color': '#D8D8D8',
			'line-color': '#D8D8D8',
			'source-arrow-color': '#D8D8D8',
			'target-arrow-color': '#D8D8D8',
			'z-index': '0',
		})
		.selector('.ghostNode')
		.css({
			'padding-left': '0px',
			'padding-right': '0px',
			'padding-top': '0px',
			'padding-bottom': '0px',
			'width': '0px',
			'height': '0px',
			'border-width': '0.001px',
			'z-index' : '0',
		})
		.selector('.hidden')
		.css({
			'display': 'none',
		})
		.selector('.link')
		.css({
			'background-color': 'red'
		})
		.selector('.previewEdge')
		.css({
			'transition-duration': '0s',
			'line-color': 'red',
			'target-arrow-color': 'red',
			'source-arrow-color': 'red'
		})
		.selector('.highlighted')
		.css({
			'background-color': '#61bffc',
			'line-color': '#61bffc',
			'target-arrow-color': '#61bffc',
			'source-arrow-color': '#61bffc',
		}),
		//sample elements
		/*elements: {
			nodes: [
			{ data: { id: 't0', name: 'z0', isStartState: true, isEndState: false, hasLoop: false } },
			{ data: { id: 't1', name: 'z1', isStartState: false, isEndState: false, hasLoop: false } },
			{ data: { id: 't2', name: 'z2', isStartState: false, isEndState: false, hasLoop: false } },
			],
			edges: [
			{ data: { id: 'te0', source: 't0', transitionSymbols: ['a'], symbolsText: 'a', target: 't1' } },
			{ data: { id: 'te1', source: 't1', transitionSymbols: ['b'], symbolsText: 'b', target: 't2' } },
			]
		},*/
		
		layout: {
			name: 'grid',
			padding: 10
		}
	});
	
	var automataCounter = 1;
	var nextId = 0;
	var automatas = [{id: 1, name: 'Automat 1', nextState: 0, inputAlphabet: Object.create(null)}];
	var activeAutomata = automatas[0];
	
	var preventEvent = false;
	var linkSourceNode = null;
	var lastTargetNode = null;
	var linkingMode = false;
	var mouseLeftNode = false;
	var previewEdge = null;
	
	//Get Settings
	var apiTipEdgeSettings = null;
	var edgeSettingsError = $('#errorTransitionSymbols');
	var settingsActive = false;
	var editNode = null;
	var editEdge = null;
	
	/* F U N C T I O N S */
	function createNewAutomata(alphabet){
		automataCounter++;
		var automataAlphabet = Object.create(null);
		if(alphabet !== undefined){
			automataAlphabet = $.extend(Object.create(null),alphabet);
		}
		automatas.push({id: automataCounter, name: 'Automat ' + automataCounter, nextState: 0, inputAlphabet: automataAlphabet});
		$('#listAvaiableAutomatas').append($('<li></li>').append($('<a href="#"></a>').attr('value', automataCounter).text('Automat ' + automataCounter)));
		switchAutomata(automataCounter);
	}
	
	function switchAutomata(automataId){
		if(linkingMode)
			endLinkingMode();
		if(automataId == activeAutomata.id)
			return;
		
		var selectedAutomata;
		$.each(automatas, function(i, automata){
			if(automata.id == automataId){
				$('#textActiveAutomata').text(automata.name);
				selectedAutomata = automata;
				return;
			}
		});
		//Prevent tagsinput add and remove events
		preventEvent = true;
		$('#inputAlphabet').tagsinput('removeAll');
		for(var symbol in selectedAutomata.inputAlphabet){
			$('#inputAlphabet').tagsinput('add' , symbol);
		}
		
		var oldAutomataElements = cy.elements('[automataId = ' + activeAutomata.id +']');
		oldAutomataElements.addClass('inactive');
		oldAutomataElements.lock();
		oldAutomataElements.ungrabify();
		var newAutomataElements = cy.elements('[automataId = ' + automataId +']');
		newAutomataElements.unlock();
		newAutomataElements.grabify();
		newAutomataElements.removeClass('inactive');
		activeAutomata = selectedAutomata;
		preventEvent = false;
	}
	
	
	function startLinkingMode(event){
		cy.add([
			{ group: "nodes", data: { id: "linker", isGhost: true}, classes: 'ghostNode', renderedPosition: event.cyRenderedPosition },
			{ group: "edges", data: { id: "newLink", isGhost: true, source: linkSourceNode.id(), target: 'linker'}, classes: 'previewEdge' },
		]);
	}
	
	function endLinkingMode(){
		if(previewEdge != null){
			if(previewEdge.id() == 'previewEdge')
				previewEdge.remove();
			else
				previewEdge.removeClass('previewEdge');
		}
		previewEdge = null;
		linkSourceNode.removeClass('link');
		linkSourceNode = null;
		cy.getElementById('linker').remove();
		linkingMode = false;
	}
	
	function linkMode(event){
		if(linkSourceNode == null){
			//Ghost nodes cannot be used for links
			if(event.cyTarget.data('isGhost'))
				return;
			linkSourceNode = event.cyTarget;
			linkSourceNode.addClass('link');
			linkingMode = true;
			mouseLeftNode = false;
		}
		//Unselect selected node
		else if(event.cyTarget == linkSourceNode && !mouseLeftNode){
			endLinkingMode();
		}
		//Link the selected node to the event node
		else{
			//Cancel linking mode on invalid target
			if(event.cyTarget.data('isGhost')){
				endLinkingMode();
				return;
			}
			if(previewEdge != null && previewEdge.id() == 'previewEdge'){
				previewEdge.remove();
				addEdge(linkSourceNode.id(), event.cyTarget.id());
			}
			endLinkingMode();
		}
	}
	
	function showNewEdge(sourceNode, targetNode){
		var exsistingEdge = sourceNode.edgesTo(targetNode);
		if(exsistingEdge.size() == 0){
			if(previewEdge != null && previewEdge.id() == 'previewEdge')
				previewEdge.remove();
			cy.add([
				{ group: "edges", data: { id: 'previewEdge', isGhost: true, source: sourceNode.id(), target: targetNode.id() }, classes: 'previewEdge'}
			]);
			previewEdge = cy.getElementById('previewEdge');
			if(sourceNode == targetNode){
				previewEdge.addClass('loop');
			}
		}
		else{
			previewEdge = exsistingEdge;
			previewEdge.addClass('previewEdge');
		}
	}
	
	function showNodeSettings(event){
		//Ghost nodes have no settings!
		if(event.cyTarget.data('isGhost'))
			return;
		
		editNode = event.cyTarget;
		//Get Settings
		var settingsForm = $('#nodeSettings').clone();
		settingsForm.find('#inputStateName').val(editNode.data('name'));
		settingsForm.find('#checkStartState').prop('checked', editNode.data('isStartState'));
		settingsForm.find('#checkEndState').prop('checked', editNode.data('isEndState'));
		settingsForm.find('#checkHasLoop').prop('checked', editNode.data('hasLoop'));
		
		qTipSettingsApi = editNode.qtip({
			content: { text : settingsForm  },
			position: {
				my: 'top center',
				at: 'bottom center',
			},
			show: {
				solo: true,
				event: 'false'
			},
			events: {
				hide: function(event, api) {
					this.qtip('api').destroy();
					settingsActive = false;
				}
			},
			style: {
				classes: 'qtip-bootstrap',
				tip: {
					width: 16,
					height: 8
				}
			}
		})
		.qtip('api');
		qTipSettingsApi.show();
		settingsActive = true;
	}
	
	function showEdgeSettings(event){
		var targetEdge = event.cyTarget;
		//Ghost edges have no settings!
		if(targetEdge.data('isGhost'))
			return;
		
		//First time function call, create a new dummy node with tip
		if(apiTipEdgeSettings == null){
			cy.add([
				{ group: "nodes", data: { id: "dummy", isGhost: true}, classes: 'ghostNode hidden', grabbable: false, renderedPosition: event.cyRenderedPosition },
			]);
			
			//Add qTip to dummy node
			apiTipEdgeSettings = cy.$('#dummy').qtip({
				content: { text : $('#edgeSettings')  },
				position: {
					my: 'top center',
					at: 'bottom center',
					target: cy.$('#dummy')
				},
				show: {
					delay: 0,
					event: 'false'
				},
				hide: {
					effect: false,
				},
				events: {
					show: function(event, api) {
						settingsActive = true;
					},
					hide: function(event, api) {
						editEdge = null;
						settingsActive = false;
						edgeSettingsError.stop(true).hide();
					}
				},
				style: {
					classes: 'qtip-bootstrap',
					tip: {
						width: 16,
						height: 8
					}
				}
			})
			.qtip('api');
			
		}
		else{
			//Move dummy to new position
			cy.$('#dummy').renderedPosition(event.cyRenderedPosition);
			
		}
		var inputSymbols = apiTipEdgeSettings.get('content.text').find('#inputTransitionSymbols');
		inputSymbols.tagsinput('removeAll');
			
		//Implement function to add all tags at once
		for(var symbol in targetEdge.data('transitionSymbols')){
			inputSymbols.tagsinput('add' , symbol);
		};
		
		editEdge = targetEdge;
		apiTipEdgeSettings.show();
		inputSymbols.tagsinput('focus');
	}
	
	function download(strData, strFileName, strMimeType) {
		var D = document,
			a = D.createElement("a");
			strMimeType= strMimeType || "application/octet-stream";


		if (navigator.msSaveBlob) { // IE10
			return navigator.msSaveBlob(new Blob([strData], {type: strMimeType}), strFileName);
		} /* end if(navigator.msSaveBlob) */


		if ('download' in a) { //html5 A[download]
			a.href = "data:" + strMimeType + "," + encodeURIComponent(strData);
			a.setAttribute("download", strFileName);
			a.innerHTML = "downloading...";
			D.body.appendChild(a);
			setTimeout(function() {
				a.click();
				D.body.removeChild(a);
			}, 66);
			return true;
    } /* end if('download' in a) */


		//do iframe dataURL download (old ch+FF):
		var f = D.createElement("iframe");
		D.body.appendChild(f);
		f.src = "data:" +  strMimeType   + "," + encodeURIComponent(strData);

		setTimeout(function() {
			D.body.removeChild(f);
		}, 333);
		return true;
	}
	
	/* G R A P H  F U N C T I O N S */
	
	function addState(id, name){
		cy.add([
			{ group: "nodes", data: { id: id, automataId: activeAutomata.id, name: name, isStartState: false, isEndState: false, hasLoop: false } },
		]);
	}
	
	//Add a new state to active automata created by the user
	function addUserState(position){
		cy.add([
			{ group: "nodes", data: { id: "z"+nextId , automataId: activeAutomata.id, name: "z"+activeAutomata.nextState, isStartState: false, isEndState: false, hasLoop: false }, renderedPosition: position },
		]);
		nextId++;
		activeAutomata.nextState++;
	}
	
	/* 	Creates an edge with given transiton symbol assigned to the active automata
		if edge already exsists, symbol is added to the existing edge
	*/
	function addEdge(sourceId, targetId, symbol){
		var sourceNode = cy.getElementById(sourceId);
		var targetNode = cy.getElementById(targetId);
		var edge = sourceNode.edgesTo(targetNode);
		var edgeTransitions = Object.create(null);
		var edgeText = '';
		if(symbol !== undefined){
			edgeTransitions[symbol] = true;
			edgeText = symbol;
		}
		if(edge.size() == 0){
			cy.add([
				{ group: "edges", data: { id: 'e' + nextId, automataId: activeAutomata.id, source: sourceId, transitionSymbols: edgeTransitions, symbolsText: edgeText, target: targetId } }
			]);
			if(sourceId == targetId){
				sourceNode.data('hasLoop', true);
				cy.getElementById('e' + nextId).addClass('loop');
			}
			nextId++;
		}
		else{
			if(symbol === undefined)
				return;
			addTransitionSymbol(edge[0], symbol);
		}
	}
	
	function removeEdge(edge){
		/*Special cases are handled by their respective functions */
		//Adjust properties of looped node
		if(edge.isLoop()){
			setLoop(edge.source(), false);
			return;
		}
		//Removed ghost edge for starting state
		else if(edge.data('isStartEdge')){
			setStartState(edge.target(), false);
			return;
			
		}
		cy.remove(edge);
	}
	
	function applyBreadthfirstLayout(startNode){
		var automataEles = cy.elements('[automataId = ' + activeAutomata.id +']');
		console.log(automataEles);
		var options = {
			name: 'breadthfirst',
			eles: automataEles,
			fit: true, // whether to fit the viewport to the graph
			directed: false, // whether the tree is directed downwards (or edges can point in any direction if false)
			padding: 30, // padding on fit
			circle: false, // put depths in concentric circles if true, put depths top down if false
			spacingFactor: 1.25, // positive spacing factor, larger => more space between nodes (N.B. n/a if causes overlap)
			boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
			avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
			roots: startNode, // the roots of the trees
			maximalAdjustments: 0, // how many times to try to position the nodes in a maximal way (i.e. no backtracking)
			animate: false, // whether to transition the node positions
			animationDuration: 500, // duration of animation in ms if enabled
			animationEasing: undefined, // easing of animation if enabled
			ready: undefined, // callback on layoutready
			stop: undefined // callback on layoutstop
		};
		cy.layout( options );
	}
	
	function applyCoseLayout(){
		var automataEles = cy.elements('[automataId = ' + activeAutomata.id +']');
		var options = {
			name: 'cose',
			eles: automataEles,
			ready: function() {},  // Called on `layoutready`
			stop: function() {},  // Called on `layoutstop`
			animate: true, // Whether to animate while running the layout
			// The layout animates only after this many milliseconds
			// (prevents flashing on fast runs)
			animationThreshold  : 250,
			// Number of iterations between consecutive screen positions update
			// (0 -> only updated on the end)
			refresh             : 20,
			fit: false, // Whether to fit the network view after when done
			// Padding on fit
			padding             : 30,
			// Constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
			boundingBox         : undefined,
			// Extra spacing between components in non-compound graphs
			componentSpacing    : 100,
			// Node repulsion (non overlapping) multiplier
			nodeRepulsion       : function( node ){ return 400000; },
			// Node repulsion (overlapping) multiplier
			nodeOverlap         : 10,
			// Ideal edge (non nested) length
			idealEdgeLength     : function( edge ){ return 10; },
			// Divisor to compute edge forces
			edgeElasticity      : function( edge ){ return 100; },
			// Nesting factor (multiplier) to compute ideal edge length for nested edges
			nestingFactor       : 5,
			// Gravity force (constant)
			gravity             : 80,
			// Maximum number of iterations to perform
			numIter             : 1000,
			// Initial temperature (maximum node displacement)
			initialTemp         : 200,
			// Cooling factor (how the temperature is reduced between consecutive iterations
			coolingFactor       : 0.95,
			// Lower temperature threshold (below this point the layout will end)
			minTemp             : 1.0,
			// Whether to use threading to speed up the layout
			useMultitasking     : true
		};

		cy.layout( options );
	}
	
	/* N O D E  F U N C T I O N S */
	
	function setStateName(node, newName){
		node.data('name', newName);
	}
	
	function setStartState(node, boolParam){
		node.data('isStartState',boolParam);
		if(boolParam){
			//Copy position
			var anchorPosition = $.extend({}, node.position());
			anchorPosition.x -= 75;
			cy.add([
				{ group: 'nodes', data: { id: 'gn'+nextId, automataId: activeAutomata.id, isGhost: true }, grabbable: false, position: anchorPosition },
				{ group: 'edges', data: { id: 'ge'+nextId, automataId: activeAutomata.id, source: 'gn'+nextId, target: node.id(), isGhost: true, isStartEdge: true  } },
			]);
			cy.getElementById('gn'+nextId).addClass('ghostNode');
			//Add ghost node as Attribute
			node.data('startGhost', 'gn'+nextId);
			nextId++;
		}
		else{
			cy.getElementById(node.data('startGhost')).remove();
		}
	}
	
	//Set isEndState to new boolParam
	function setEndState(node, boolParam){
		node.data('isEndState',boolParam);
		if(boolParam){
			node.addClass('endState');
		}
		else{
			node.removeClass('endState');
		}
	}
	
	function setLoop(node, boolParam){
		node.data('hasLoop', boolParam);
		//Create new self loop
		if(boolParam){
			addEdge(node.id(), node.id());
		}
		//Check if theres a self loop
		else if(node.edgesTo(node).length == 1){
			node.edgesTo(node).remove();
		}
	}
	
	function setTransitionSymbols(edge, symbolSet){
		//Save a copy of transition symbols in the node
		edge.data('transitionSymbols', $.extend(Object.create(null),symbolSet));
		edge.data('symbolsText', Object.keys(symbolSet).toString());
	}
	
	function addTransitionSymbol(edge, symbol){
		edge.data('transitionSymbols')[symbol] = true;
		edge.data('symbolsText', Object.keys(edge.data('transitionSymbols')).toString());
	}
	
	function removeTransitionSymbol(edge, symbol){
		delete edge.data('transitionSymbols')[symbol];
		edge.data('symbolsText', Object.keys(edge.data('transitionSymbols')).toString());
	}
	
	//Remove a transition symbol from all edges and update their text
	function removeFromEdges(transitionSymbol){
		allEdges = cy.edges('[automataId = ' + activeAutomata.id + '][!isGhost]');
		allEdges.each(function(i,edge){
			if(transitionSymbol in edge.data('transitionSymbols')){
				removeTransitionSymbol(edge, transitionSymbol);
			}
		});
	}
	
	/* E V E N T S */
	
	//Prevent submits forms
	$(document).on('submit', '#formNodeSettings', function() {
		qTipSettingsApi.hide();
		return false;
	});
	
	$(document).on('submit', '#formEdgeSettings', function() {
		apiTipEdgeSettings.hide();
		return false;
	});
	
	$(document).on('submit', '#graphSettings', function(){
		return false;
	});
	
	//Get settings changes for each created checkbox
	$(document).on('change', '#inputStateName', function(){
		setStateName(editNode, $(this).val());
	});
	
	$(document).on('change', '#checkStartState', function(){
		setStartState(editNode, $(this).prop('checked'));
	});
	
	$(document).on('change', '#checkEndState', function(){
		setEndState(editNode, $(this).prop('checked'));
	});
	
	$(document).on('change', '#checkHasLoop', function(){
		setLoop(editNode, $(this).prop('checked'));
	});
	
	$('#inputAlphabet').on('itemAdded', function(event){
		if(!preventEvent){
			activeAutomata.inputAlphabet[event.item] = true;
		}
	});
	
	$('#inputAlphabet').on('itemRemoved', function(event){
		if(!preventEvent){
			delete activeAutomata.inputAlphabet[event.item];
			removeFromEdges(event.item);
		}
	});
	
	$('#inputTransitionSymbols').on('itemAdded', function(event){
		if(editEdge != null){
			addTransitionSymbol(editEdge, event.item);
		}
	});
	
	$('#inputTransitionSymbols').on('itemRemoved', function(event){
		if(editEdge != null){
			removeTransitionSymbol(editEdge, event.item);
		}
	});
	
	$('#inputTransitionSymbols').on('beforeItemAdd', function(event){
		if(!(event.item in activeAutomata.inputAlphabet)){
			edgeSettingsError.stop(true).hide().show().delay(2000).fadeOut();
			event.cancel = true;
		}
	});
	
	/* C Y  E V E N T S */
	
	//Double click and single click distinguish
	var clicks = 0;
	cy.on('tap', 'node', function(event) {
		var target = event.cyTarget;
		if(target.id() != 'linker' && target.data('automataId') != activeAutomata.id)
			return;
		clicks++;
		if (clicks == 1) {
			setTimeout(function(){
				if(clicks == 1) {
					linkMode(event);
					} else {
					showNodeSettings(event);
				}
				clicks = 0;
			}, 150);
		}
	});
	
	cy.on('tap', 'edge', function(event){
		if(event.cyTarget.data('automataId') == activeAutomata.id){
			showEdgeSettings(event);
		}
	});
	
	//Event to move ghost start node with actual node
	cy.on('drag' , 'node', function(event){
		if(event.cyTarget.data('automataId') == activeAutomata.id && event.cyTarget.data('isStartState')){
			var anchorPosition = jQuery.extend({}, event.cyTarget.position());
			anchorPosition.x -= 75;
			cy.getElementById(event.cyTarget.data('startGhost')).position(anchorPosition);
		}
	});
	
	//Right click or 2 finger tap
	cy.on('cxttap', function(event){
		var target = event.cyTarget;
		//Event is on canvas
		if(target === cy){
			addUserState(event.cyRenderedPosition);
		}
		else if(target.isNode()){
			
			if(target.data('isGhost') || linkingMode && linkSourceNode == target){
				endLinkingMode();
				return;
			}
			
			//Only active automatas are modifiable
			if(target.data('automataId') != activeAutomata.id)
				return;
			
			cy.remove(event.cyTarget);
		}
		else if(event.cyTarget.isEdge()){
			if(event.cyTarget.data('automataId') != activeAutomata.id)
				return;
			removeEdge(event.cyTarget);
		}
	});
	
	cy.on('tapdrag', function(event){
		var target = event.cyTarget;
		if(linkingMode){
			//Target is a real node
			if(target !== cy && target.isNode() && target.id() != 'linker'){
				if(mouseLeftNode){
					if(lastTargetNode == null){
						lastTargetNode = target
						cy.getElementById('linker').addClass('hidden');
						showNewEdge(linkSourceNode, target);
					}
					else if(lastTargetNode != target){
						if(previewEdge != null){
							if(previewEdge.id() == 'previewEdge')
								previewEdge.remove();
							else
								previewEdge.removeClass('previewEdge');
						}
						lastTargetNode = target;
						cy.getElementById('linker').addClass('hidden');
						showNewEdge(linkSourceNode, target);
					}
				}
				//Start linking mode if mouse was moved to another node in click delay
				if(!mouseLeftNode && target != linkSourceNode){
					mouseLeftNode = true;
					startLinkingMode(event);
				}
			}
			else{
				if(!mouseLeftNode){
					mouseLeftNode = true;
					startLinkingMode(event);
				}
				if(previewEdge != null){
					if(previewEdge.id() == 'previewEdge'){
						previewEdge.remove();
					}
					else{
						previewEdge.removeClass('previewEdge');
					}
					cy.getElementById('linker').removeClass('hidden');
					previewEdge = null;
				}
				lastTargetNode = null;
				cy.$('#linker').renderedPosition(event.cyRenderedPosition);
			}
			
		}
	});
	
	/* B U T T O N S */
	$('#configToggle').on('click', function(){
		$('body').toggleClass('config-closed');
		cy.resize();
	});
	
	$('#btnAddAutomata').on('click' ,function(){
		createNewAutomata();
	});
	
	$("#listAvaiableAutomatas").on('click', 'li a', function(){
		switchAutomata(parseInt($(this).attr('value')));
   });
	
	$('#btnTestWord').on('click', function(){
		acceptsWord($('#inputWord').val())
	});
	
	$('#btnSave').on('click', function(){
		download(JSON.stringify(cy.json()), 'graph.json', 'text/json');
	});
	
	$('#btnAnalyzeGraph').on('click', function(){
		analyzeGraph();
		$('#modalAnalyzedGraph').modal('show');
	});
	
	$('#btnToDFA').on('click', function(){
		toDFA();
	});
	
	$('#btnMinimizeDFA').on('click', function(){
		minimizeDFA();
	});
	
	$('#btnTest').on('click', function(){
		console.log({});
		console.log($.extend({},{a: 'x'}));
		console.log($.extend(Object.create(null),{a: 'x'}));
	});
	
	/* A L G O R I T H M  F U N C T I O N S */
	
	//Get all possible transition edges from a node
	function getTransitions(nodes, symbol){
		if(nodes === undefined)
			return;
		var transitions;
		if(symbol === undefined){
			//Get all outgoing transitions
			transitions = nodes.outgoers('edge');
			//Add loops
			nodes.each(function(i, node){
				transitions = transitions.add(node.edgesTo(node));
			});
		}
		//Get only outgoing transitions with matching symbol
		else{
			transitions = nodes.outgoers('edge').filter( function(i, transition){
				if(symbol in transition.data('transitionSymbols')){
					return true;
				}
				return false;
			});
			nodes.each(function(i, node){
				var transitionLoops = node.edgesTo(node).filter( function(i, transition){
					if(symbol in transition.data('transitionSymbols')){
						return true;
					}
					return false;
				});
				transitions = transitions.add(transitionLoops);
			});
		}
		return transitions;
	}
	
	function getTransitionStates(nodes, symbol){
		if(nodes === undefined)
			return
		var transitionStates = cy.collection();
		if(symbol === undefined){
			//Get all reachable nodes
			transitionStates = nodes.outgoers('node')
			//Add loops
			nodes.each(function(i, node){
				if(node.edgesTo(node).length > 1){
					transitionStates = transitionStates.add(node);
				}
			});
		}
		//Get only outgoing transitions with matching symbol
		else{
			var transitionEdges = getTransitions(nodes, symbol);
			transitionEdges.each(function(i, edge){
				transitionStates = transitionStates.add(edge.target());
			});
		}
		return transitionStates;
	}
	
	//Implementation of a basic object set add
	function setAdd(set, element){
		if(Array.isArray(element)){
			for(var j = 0; j < element.length; j++){
				if(element[j] in set){
					return false;
				}
			}
			for(var j = 0; j < element.length; j++){
				set[element[j]] = true;
			}
			return true;
		}
		else if( element === Object(element) ){
			for(var e in element){
				if(e in set){
					return false;
				}
			}
			for(var e in element){
				set[e] = true;
			}
			return true;
		}
		else{
			if(element in set){
				return false;
			}
			set[element] = true;
			return true;
		}
	}
	
	function containsEndState(collection){
		var containsEndState = false;
		collection.each(function(i, element){
			if(element.data('isEndState')){
				containsEndState = true;
				return;
			}
		});
		return containsEndState;
	}
	
	function getCombinedId(collection){
		//Sort by ascending ID
		collection = collection.sort(function (a, b){
			return a.id() > b.id();
		});
		var combinedId = "";
		for(var i = 0; i < collection.length; i++){
			combinedId += collection[i].id();
		}
		return combinedId;
	}
	
	function getCombinedName(collection){
		collection = collection.sort(function (a, b){
			return a.data('name') > b.data('name');
		});
		var combinedName = "";
		for(var i = 0; i < collection.length; i++){
			combinedName += collection[i].data('name');
		}
		return combinedName;
	}
	
	
	function getTargetId(target, states, combinedStates, combinedStatesIds){
		if(target in states){
			return target;
		}
		for(var i = 0; i < combinedStates.length; i++){
			if(target in combinedStates[i]){
				return combinedStatesIds[i];
			}
		}
	}
	
	/* A L G O R I T H M S */
	
	function analyzeGraph(){
		
		var isDFA = true;
		var startStateCount = 0;
		var endStateCount = 0;
		var transitionCount = 0;
		
		//Get all real nodes
		var allNodes = cy.nodes('[!isGhost]');
		var numStates = allNodes.length;
		allNodes.each(function(i, node){
			if(node.data('isStartState'))
				startStateCount++;
			if(node.data('isEndState'))
				endStateCount++;
			var transitions = getTransitions(node);
			$.each(inputAlphabet, function(j, symbol){
				var symbolTransitionCount = 0;
				transitions.each(function(k,transition){
					if($.inArray(symbol,transition.data('transitionSymbols')) > -1){
						symbolTransitionCount++;
					}
					if(symbolTransitionCount > 1){
						isDFA = false;
					}
				});
				transitionCount += symbolTransitionCount;
			});
		});
	}
	
	var highlighCount;
	var highlightPath;
	var inputWord;
	
	function acceptsWord(word){
		cy.elements().removeClass('highlighted');
		//Get all start states from the active automata
		var currentNodes = cy.nodes('[?isStartState][automataId=' + activeAutomata.id + ']');
		var path = [];
		inputWord = word;
		path.push(currentNodes);
		for (var i = 0, len = word.length; i < len; i++) {
			var nextEdges = getTransitions(currentNodes, word[i]);
			var nextNodes = nextEdges.targets();

			if(!nextNodes.empty()){
				path.push(nextEdges);
				path.push(nextNodes);
			}
			var currentNodes = nextNodes;
		};
		highlightCount = 0;
		highlightPath = path;
		highlightPathNext();
	}
	
	//Function for animating each field in the highlightPath
	var highlightPathNext = function(){
		if(highlightCount < highlightPath.length){
			if(highlightCount != 0){
				highlightPath[highlightCount-1].removeClass('highlighted');
			}
			highlightPath[highlightCount].addClass('highlighted');
			highlightCount++;
			setTimeout(highlightPathNext , 1000);
		}
		else{
			var accepted = false;
			if(containsEndState(highlightPath[highlightCount-1])){
				accepted = true;
			}
			if(accepted){
				alert(inputWord + ' wurde akzeptiert!');
			}
			else{
				alert(inputWord + ' wurde NICHT akzeptiert!');
			}
			cy.elements().removeClass('highlighted')
			
		}
	}
	
	function logStateArray(array){
		$.each(array, function(i, elements){
			var stateNames = "";
			elements.each(function(j, state){
				stateNames += state.data('name');
			});
			console.log('States:' + i + '=' + stateNames);
		});
	}
	
	/*  Tests if the activeAutomata is an DFA and saves a reachable states collection
		in the first parameter if given
	*/
	function isDFA(){
		var startStates = cy.nodes('[?isStartState][automataId=' + activeAutomata.id + ']');
		if(startStates.empty())
			return true; //Warning: No Start States, The automata accepts nothing
		if(startStates.size() > 1)
			return false; //A DFA can only have one starting state
		var reachableStates = startStates;
		var newStates = cy.nodes('[?isStartState][automataId=' + activeAutomata.id + ']');
		while(newStates.nonempty()){
			for(var i = 0; i < newStates.length; i++){
				var transitions = getTransitions(newStates[i]);
				var alphabetSet = Object.create(null);
				for(var j = 0; j < transitions.length; j++){
					if(!setAdd(alphabetSet, transitions[j].data('transitionSymbols'))){
						//There are multiple transitions for one symbol
						return false;
					};
				}
				for(var symbol in activeAutomata.inputAlphabet){
					if(!symbol in alphabetSet){
						//There is a transition missing at newState[i]
						return false;
					}
				}
			}
			var transitionStates = getTransitionStates(newStates);
			//Remove states already reached from transitonStates
			newStates = transitionStates.difference(reachableStates);
			reachableStates = reachableStates.union(newStates);
		}
		return true;
	}
	
	function toDFA(){
		var startStates = cy.nodes('[?isStartState][automataId=' + activeAutomata.id + ']');
		if(startStates.empty())
			return; //TODO: Error no start states
		var automataAlphabet = activeAutomata.inputAlphabet;
		var workingStates = [startStates];
		var allStates = Object.create(null);
		
		createNewAutomata(automataAlphabet);
		var prefix = 'dfa' + activeAutomata.id;
		var startStatesId = prefix + getCombinedId(startStates);
		var startStatesName = getCombinedName(startStates);
		setAdd(allStates, startStatesId);
		addState(startStatesId, startStatesName);
		var startState = cy.getElementById(startStatesId)
		setStartState(startState,true);
		
		if(containsEndState(startStates))
			setEndState(startState, true);
		while(workingStates.length > 0){
			var newStates = [];
			$.each(workingStates, function(i, currentState){
				var currentStateId = prefix + getCombinedId(currentState);
				for(var symbol in automataAlphabet){
					var reachedState = getTransitionStates(currentState, symbol);
					var reachedStateId = prefix + getCombinedId(reachedState);
					var reachedStateName = getCombinedName(reachedState)
					if(setAdd(allStates, reachedStateId)){
						if(reachedStateId != prefix){
							addState(reachedStateId, reachedStateName);
						}
						else{
							//Create catch state
							addState(reachedStateId, '∅');
						}
						if(containsEndState(reachedState))
							setEndState(cy.getElementById(reachedStateId),true);
						newStates.push(reachedState);
					}
					addEdge(currentStateId, reachedStateId, symbol);
				}
			});
			workingStates = $.extend([], newStates);
		}
		applyCoseLayout();
	}
	
	function minimizeDFA(){
		//Test if DFA
		var startStates = cy.nodes('[?isStartState][automataId=' + activeAutomata.id + ']');
		if(startStates.empty())
			return; //Delete all other states
		if(startStates.size() > 1)
			return false; //Automata is not a dfa
		var startStateId = startStates.id();
		var reachableStates = startStates;
		var newStates = cy.nodes('[?isStartState][automataId=' + activeAutomata.id + ']');
		while(newStates.nonempty()){
			for(var i = 0; i < newStates.length; i++){
				var transitions = getTransitions(newStates[i]);
				var alphabetSet = Object.create(null);
				for(var j = 0; j < transitions.length; j++){
					if(!setAdd(alphabetSet, transitions[j].data('transitionSymbols'))){
						//There are multiple transitions for one symbol
						return false;
					};
				}
				for(var symbol in activeAutomata.inputAlphabet){
					if(!symbol in alphabetSet){
						//There is a transition missing at newState[i]
						return false;
					}
				}
			}
			var transitionStates = getTransitionStates(newStates);
			//Remove states already reached from transitonStates
			newStates = transitionStates.difference(reachableStates);
			reachableStates = reachableStates.union(newStates);
		}
		
		var endStates = reachableStates.filter('[?isEndState]');
		if(endStates.size() == 0)
			return;
		
		//Sort states by id
		reachableStates = reachableStates.sort(function (a, b){
			return a.id() > b.id();
		});
		
		//Setup mark table
		var markTable = Object.create(null);
		for(var row = 1; row < reachableStates.length; row++){
			markTable[reachableStates[row].id()] = Object.create(null);
			for(var cell = 0; cell < row; cell++){
				markTable[reachableStates[row].id()][reachableStates[cell].id()] = false;
 			}
		}
		
		var endStatesIds = Object.create(null);
		for(var i = 0; i < endStates.length; i++){
			endStatesIds[endStates[i].id()] = true;
			for(var j = 0; j < reachableStates.length; j++){
				if(!reachableStates[j].data('isEndState')){
					if(endStates[i].id() == reachableStates[0].id())
						markTable[reachableStates[j].id()][endStates[i].id()] = true;
					else
						markTable[endStates[i].id()][reachableStates[j].id()] = true;
				}
			}
		}
		
		var marked;
		do{
			marked = false;
			for (var row in markTable) {
				for(var column in markTable[row]){
					if(!markTable[row][column]){
						var state1 = cy.getElementById(row);
						var state2 = cy.getElementById(column);
						for(var symbol in activeAutomata.inputAlphabet){
							var transitionState1 = getTransitionStates(state1, symbol).id();
							var transitionState2 = getTransitionStates(state2, symbol).id();
							if(transitionState1 != transitionState2){
								//If transition nodes are out of index table index swap them
								if(transitionState1 == reachableStates[0].id() || transitionState2 == reachableStates[reachableStates.length-1].id()){
									var temp = transitionState1;
									transitionState1 = transitionState2;
									transitionState2 = temp;
								}
								if(markTable[transitionState1][transitionState2]){
									markTable[state1.id()][state2.id()] = true;
									marked = true;
									break;
								}
							}
						}
					}
				}
			}
		}while( marked );
		
		var singleStates = Object.create(null);
		var equivalentStates = [];
		
		for(var i = 0; i < reachableStates.length; i++){
			singleStates[reachableStates[i].id()] = reachableStates[i].data('name');
		}
		
		for(var row in markTable){
			for(var column in markTable[row]){
				if(!markTable[row][column]){
					if(row in singleStates && column in singleStates){
						var equivalentState = Object.create(null);
						equivalentState[row] = singleStates[row];
						equivalentState[column] = singleStates[column];
						equivalentStates.push(equivalentState);
						delete singleStates[row];
						delete singleStates[column];
					}
					else{
						for(var i = 0; i < equivalentStates.length; i++){
							if(row in equivalentStates[i] && column in singleStates){
								equivalentStates[i][column] = singleStates[column];
								delete singleStates[column];
								break;
							}
							if(column in equivalentStates[i] && row in singleStates){
								equivalentStates[i][row] = singleStates[row];
								delete singleStates[row];
								break;
							}
						}
					}
				}
			}
		}
		
		createNewAutomata(activeAutomata.inputAlphabet);
		var prefix = 'min' + activeAutomata.id;
		
		var equivalentStatesIds = [];
		for(var i = 0; i < equivalentStates.length; i++){
			var id = '';
			var names = [];
			var isStartState = false;
			var isEndState = false;
			for(var state in equivalentStates[i]){
				if(state == startStateId)
					isStartState = true;
				if(state in endStatesIds)
					isEndState = true;
				id += state;
				names.push(equivalentStates[i][state]);
			}
			names.sort();
			equivalentStatesIds.push(id);
			addState(prefix + id, names.toString());
			if(isStartState)
				setStartState(cy.getElementById(prefix + id), true);
			if(isEndState)
				setEndState(cy.getElementById(prefix + id), true);
			
		}
		
		for(var state in singleStates){
			addState(prefix + state, singleStates[state]);
			if(state == startStateId)
				setStartState(cy.getElementById(prefix + state), true);
			if(state in endStatesIds)
				setEndState(cy.getElementById(prefix + state), true);
		}
		
		//Add edges
		for(var state in singleStates){
			var transitions = getTransitions(cy.getElementById(state));
			for(var i = 0; i < transitions.length; i++){
				var transition = transitions[i];
				var targetId = getTargetId(transition.target().id(), singleStates, equivalentStates, equivalentStatesIds);
				for(var symbol in transition.data('transitionSymbols')){
					addEdge(prefix + state, prefix + targetId, symbol);
				}
			}
		}
		
		for(var i = 0; i < equivalentStates.length; i++){
			for(var state in equivalentStates[i]){
				var transitions = getTransitions(cy.getElementById(state));
				for(var j = 0; j < transitions.length; j++){
					var transition = transitions[j];
					var targetId = getTargetId(transition.target().id(), singleStates, equivalentStates, equivalentStatesIds);
					for(var symbol in transition.data('transitionSymbols')){
						addEdge(prefix + equivalentStatesIds[i], prefix + targetId, symbol);
					}
				}
				break;
			}
		}
	}
});