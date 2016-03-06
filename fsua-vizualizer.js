document.addEventListener('DOMContentLoaded', function(){
	var cy = cytoscape({
		container: document.querySelector('#cy'),
		
		boxSelectionEnabled: false,
		autounselectify: true,
		
		minZoom: 0.5,
		maxZoom: 5,
		
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
	
	/* V A R I A B L E S */
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
	
	//Graph Settings
	var apiTipEdgeSettings = null;
	var edgeSettingsError = $('#errorTransitionSymbols');
	var settingsActive = false;
	var editNode = null;
	var editEdge = null;
	
	//Tutorial
	var currentProgress;
	var tutorialSteps;
	var sidebarMode; //0 = acceptsWord, 1 = toDFA, 2 = minimizeDFA,
	
	var tutorialBar = $('#tutorialBar');
	var progressSlider = $('#inputProgress').slider();
	var textCurrentProgress = $('#textCurrentProgress');
	var textMaxProgress = $('#textMaxProgress');
	var textTutorial = $('#textTutorial');
	var tutorialSidebar = $('#tutorialSidebar');
	var textSidebarTitle = $('#textTitleSidebar');
	var tableSidebar = $('#tableSidebar');
	
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
		cy.batch(function(){
			var oldAutomataElements = cy.elements('[automataId = ' + activeAutomata.id +']');
			oldAutomataElements.addClass('inactive');
			oldAutomataElements.lock();
			oldAutomataElements.ungrabify();
			var newAutomataElements = cy.elements('[automataId = ' + automataId +']');
			newAutomataElements.unlock();
			newAutomataElements.grabify();
			newAutomataElements.removeClass('inactive');
			activeAutomata = selectedAutomata;
		});
		preventEvent = false;
	}
	
	
	function startLinkingMode(event){
		cy.add([
			{ group: "nodes", data: { id: "linker", isGhost: true}, classes: 'ghostNode', grabbable: false, renderedPosition: event.cyRenderedPosition },
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
		return cy.add([
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
			var newEdge = cy.add([
				{ group: "edges", data: { id: 'e' + nextId, automataId: activeAutomata.id, source: sourceId, transitionSymbols: edgeTransitions, symbolsText: edgeText, target: targetId } }
			]);
			if(sourceId == targetId){
				sourceNode.data('hasLoop', true);
				cy.getElementById('e' + nextId).addClass('loop');
			}
			nextId++;
			return newEdge;
		}
		else{
			if(symbol === undefined)
				return;
			addTransitionSymbol(edge[0], symbol);
			return edge;
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
	
	function applyAutomataLayout(rootCenter){
		var automataEles = cy.elements('[automataId = ' + activeAutomata.id +'][!isGhost]');
		var startNodes = automataEles.filter('[?isStartState]');
		var options = {
			name: 'automata',
			eles: automataEles,
			fit: false, // whether to fit the viewport to the graph
			directed: false, // whether the tree is directed downwards (or edges can point in any direction if false)
			topdown: false,
			padding: 30, // padding on fit
			spacingFactor: 3, // positive spacing factor, larger => more space between nodes (N.B. n/a if causes overlap)
			center: rootCenter, // Centerpoint of the roots {x, y}
			avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
			roots: startNodes, // the roots of the trees
			maximalAdjustments: 0, // how many times to try to position the nodes in a maximal way (i.e. no backtracking)
			animate: false, // whether to transition the node positions
			animationDuration: 500, // duration of animation in ms if enabled
			animationEasing: undefined, // easing of animation if enabled
			ready: undefined, // callback on layoutready
			stop: undefined // callback on layoutstop
		};
		cy.layout( options );
		repositionStartGhost(startNodes);
	}
	
	function repositionStartGhost(collection){
		for(var i = 0; i < collection.length; i++){
			var ele = collection[i];
			var anchorPosition = $.extend({}, ele.position());
			//TODO Check element width
			anchorPosition.x -= 75;
			cy.getElementById(ele.data('startGhost')).position(anchorPosition);
		}
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
	
	progressSlider.on('change', function(){
		jumpToStep(progressSlider.slider('getValue'));
	});
	
	/* C Y  E V E N T S */
	
	//Double click and single click distinguish
	var clicks = 0;
	cy.on('tap', 'node', function(event) {
		if(linkingMode){
			linkMode(event);
			return;
		}
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
			repositionStartGhost(event.cyTarget);
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
		tutorialBar.slideDown();
	});
	
	$('#btnCloseTutorial').on('click', function(){
		stopTutorial();
		tutorialBar.slideUp();
	});
	
	$('#btnFirstStep').on('click', function(){
		jumpToStep(0);
	});
	
	$('#btnPreviousStep').on('click', function(){
		jumpToStep(currentProgress-1);
	});
	
	$('#btnPlayPause').on('click', function(){
		//TODO
	});
	
	$('#btnNextStep').on('click', function(){
		jumpToStep(currentProgress+1);
	});
	
	$('#btnFinalStep').on('click', function(){
		jumpToStep(tutorialSteps.length-1);
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
			transitionStates = transitionEdges.targets();
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
	
	/*	Returns a string with the sorted names of states in the colection
		the state names can be seperated by colons if the boolean colonSeparated is set.
	*/
	function getCombinedName(collection, colonSeparated){
		if(colonSeparated === undefined){
			colonSeparated = false;
		}
		collection = collection.sort(function (a, b){
			return a.data('name') > b.data('name');
		});
		var combinedName = "";
		for(var i = 0; i < collection.length; i++){
			combinedName += collection[i].data('name');
			if(colonSeparated && i < collection.length-1)
				combinedName += ',';
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
	
	function acceptsWord(word){
		cy.elements().removeClass('highlighted');
		//Get all start states from the active automata
		var currentStates = cy.nodes('[automataId=' + activeAutomata.id + '][?isStartState]');
		var currentStatesName = getCombinedName(currentStates, true);
		tutorialSteps = [];
		var tutorialStep = Object.create(null);
		tutorialStep['text'] = tutorialText['findStartStates'];
		tutorialSteps.push(tutorialStep);
		tutorialStep = Object.create(null);
		if(currentStates.empty()){
			tutorialStep['text'] = tutorialText['noStartStates'];
		}
		else{
			tutorialStep['text'] = tutorialText['foundStartStates'].format(currentStatesName);
			tutorialStep['highlightElements'] = currentStates;
		}
		tutorialSteps.push(tutorialStep);
		for(var i = 0, len = word.length; i < len; i++){
			if(currentStates.empty())
				break;
			var nextEdges = getTransitions(currentStates, word[i]);
			var nextStates = nextEdges.targets();
			tutorialStep = Object.create(null);
			tutorialStep['readerPos'] = i;
			if(!nextStates.empty()){
			tutorialStep['text'] = tutorialText['readNthSymbol'].format(( i + 1), currentStatesName, word[i]);
				tutorialStep['highlightElements'] = nextEdges.add(currentStates);
				tutorialSteps.push(tutorialStep);
				tutorialStep = Object.create(null);
				tutorialStep['text'] = tutorialText['useTransitions'].format(getCombinedName(nextStates,true));
				tutorialStep['highlightElements'] = nextStates;
				tutorialStep['readerPos'] = i;
				tutorialSteps.push(tutorialStep);
			}
			else{
				tutorialStep['text'] = tutorialText['undefinedTransitions'].format(currentStatesName, word[i]);
				tutorialStep['highlightElements'] = currentStates;
				tutorialStep['terminatePos'] = i;
				tutorialSteps.push(tutorialStep);
				break;
			}
			var currentStates = nextStates;
			currentStatesName = getCombinedName(currentStates, true);
		}
		if(!currentStates.empty() && i == len){
			tutorialStep = Object.create(null);
			tutorialStep['text'] = tutorialText['wordFullyRead'].format(currentStatesName);
			if(containsEndState(currentStates)){
				tutorialStep['text'] +=  tutorialText['wordAccepted'];
				tutorialStep['wordAccepted'] = true;
			}
			else{
				tutorialStep['text'] +=  tutorialText['wordRejected'];
				tutorialStep['wordAccepted'] = false;
			}
			tutorialStep['highlightElements'] = currentStates;
			tutorialSteps.push(tutorialStep);
		}
		setupTutorial(0, word);
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
		var automataStates = cy.nodes('[automataId=' + activeAutomata.id + ']');
		var automataBb = automataStates.boundingBox();
		var startStates = automataStates.filter('[?isStartState]');
		tutorialSteps = [];
		var tutorialStep = Object.create(null);
		tutorialStep['text'] = tutorialText['findStartStates'];
		tutorialSteps.push(tutorialStep);
		tutorialStep = Object.create(null);
		if(startStates.empty()){
			tutorialStep['text'] = tutorialText['noStartStates'];
			tutorialSteps.push(tutorialStep);
			return; //TODO: Error no start states
		}
		else{
			tutorialStep['text'] = tutorialText['foundStartStates'].format(getCombinedName(startStates,true));
			tutorialStep['highlightElements'] = startStates;
		}
		tutorialSteps.push(tutorialStep);
		
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
		
		var workingStatesIds = Object.create(null);
		tutorialStep = Object.create(null);
		tutorialStep['text'] = tutorialText['combineStartStates'];
		tutorialStep['highlightElements'] = startState;
		tutorialStep['workingStateNew'] = startStatesId;
		if(containsEndState(startStates)){
			setEndState(startState, true);
			tutorialStep['text'] += tutorialText['startContainsEndState'];
		}
		workingStatesIds[startStatesId] = startStatesName;
		tutorialStep['workingStates'] = $.extend({}, workingStatesIds);
		tutorialSteps.push(tutorialStep);
		
		for(var i = 0; i < workingStates.length; i++){
			var currentStates = workingStates[i];
			var currentStateId = prefix + getCombinedId(currentStates);
			var currentStateName = getCombinedName(currentStates, true);
			workingStatesIds[currentStateId] = currentStateName;
			for(var symbol in automataAlphabet){
				var transitions = getTransitions(currentStates, symbol);
				var reachedStates = transitions.targets();
				var reachedStateId = prefix + getCombinedId(reachedStates);
				var reachedStateName = getCombinedName(reachedStates, true);
				tutorialStep = Object.create(null);
				if(reachedStateId != prefix)
					tutorialStep['text'] = tutorialText['stateTransitions'].format(currentStateName,symbol,reachedStateName);
				else
			tutorialStep['text'] = tutorialText['stateNoTransitions'].format(currentStateName, symbol);
				tutorialStep['highlightElements'] = currentStates.add(reachedStates).add(transitions);
				tutorialStep['workingStates'] = $.extend({}, workingStatesIds);
				tutorialStep['workingStateActive'] = currentStateId;
				tutorialSteps.push(tutorialStep);
				if(setAdd(allStates, reachedStateId)){
					tutorialStep = Object.create(null);
					tutorialStep['text'] =  tutorialText['newStateFound'].format((reachedStateId == prefix ? tutorialText['catchState'] : ( tutorialText['theState'] + '(' + reachedStateName + ')')));
					if(reachedStateId != prefix){
						var reachedNewState = addState(reachedStateId, reachedStateName);
						if(containsEndState(reachedStates)){
							setEndState(reachedNewState ,true);
							tutorialStep['text'] += tutorialText['containsEndState'];
						}
						tutorialStep['highlightElements'] = reachedNewState;
						tutorialStep['workingStateNew'] = reachedStateId;
						workingStatesIds[reachedStateId] = reachedStateName;
						tutorialStep['workingStates'] = $.extend({}, workingStatesIds);
						workingStates.push(reachedStates);
					}
					else{
						//Create catch state
						var catchState = addState(reachedStateId, '∅');
						var newEdge;
						for(var s in automataAlphabet){
							newEdge = addEdge(reachedStateId, reachedStateId, s);
						}
						tutorialStep['text'] += tutorialText['createCatchState'];
						tutorialStep['highlightElements'] = catchState.add(newEdge);
						tutorialStep['workingStates'] = tutorialSteps[tutorialSteps.length-1]['workingStates'];
					}
					tutorialStep['workingStateActive'] = currentStateId;
					tutorialSteps.push(tutorialStep);
					
				}
				tutorialStep = Object.create(null);
				var newEdge = addEdge(currentStateId, reachedStateId, symbol);
				if(Object.keys(newEdge.data('transitionSymbols')).length > 1){
				tutorialStep['text'] = tutorialText['addSymbolToEdge'].format(currentStateName,(reachedStateId == prefix ? tutorialText['toCatchState'] : (tutorialText['to'] + '(' + reachedStateName + ')')),symbol);
				}
				else{
					tutorialStep['text'] = tutorialText['addNewEdge'].format(currentStateName,(reachedStateId == prefix ? tutorialText['toCatchState'] : (tutorialText['to'] + '(' + reachedStateName + ')')),symbol);
				}
				tutorialStep['highlightElements'] = newEdge;
				tutorialStep['workingStates'] = tutorialSteps[tutorialSteps.length-1]['workingStates'];
				tutorialStep['workingStateActive'] = currentStateId;
				tutorialSteps.push(tutorialStep);
			}
			tutorialStep = Object.create(null);
			tutorialStep['text'] = tutorialText['removeWorkingState'].format(currentStateName);
			tutorialStep['workingStates'] = $.extend({}, workingStatesIds);
			tutorialStep['workingStateRemove'] = currentStateId;
			tutorialSteps.push(tutorialStep);
			delete workingStatesIds[currentStateId];
		}
		tutorialStep = Object.create(null);
		tutorialStep['text'] = tutorialText['toDfaDone'];
		tutorialSteps.push(tutorialStep);
		var automataPos = {x: automataBb.x2 + 50, y: (automataBb.h / 2 + automataBb.y1)}
		applyAutomataLayout(automataPos);
		setupTutorial(1);
	}
	
	function minimizeDFA(){
		var automataStates = cy.nodes('[automataId=' + activeAutomata.id + ']');
		var automataBb = automataStates.boundingBox();
		//Test if DFA
		var startStates = automataStates.filter('[?isStartState]');
		if(startStates.empty())
			return; //Delete all other states
		
		tutorialSteps = [];
		var tutorialStep = Object.create(null);
		tutorialStep['text'] = tutorialText['checkIfDFA'];
		tutorialSteps.push(tutorialStep);
		if(startStates.size() > 1){
			tutorialStep = Object.create(null);
			tutorialStep['text'] = tutorialText['tooManyStartStates'];
			tutorialStep['highlightElements'] = startStates;
			tutorialSteps.push(tutorialStep);
			return false; //Automata is not a dfa
		}
		var startStateId = startStates.id();
		var reachableStates = startStates;
		var newStates = cy.nodes('[?isStartState][automataId=' + activeAutomata.id + ']');
		while(newStates.nonempty()){
			for(var i = 0; i < newStates.length; i++){
				var newState = newStates[i]
				var transitions = getTransitions(newState);
				var alphabetSet = Object.create(null);
				for(var j = 0; j < transitions.length; j++){
					if(!setAdd(alphabetSet, transitions[j].data('transitionSymbols'))){
						tutorialStep = Object.create(null);
						tutorialStep['text'] = tutorialText['tooManyTransitions'].format(getCombinedName(newState,true));
						tutorialStep['highlightElements'] = newState;
						tutorialSteps.push(tutorialStep);
						return false;
					};
				}
				for(var symbol in activeAutomata.inputAlphabet){
					if(!(symbol in alphabetSet)){
						//There is a transition missing at newState
						tutorialStep = Object.create(null);
						tutorialStep['text'] = tutorialText['missingTransition'].format(symbol, getCombinedName(newState,true));
						tutorialStep['highlightElements'] = newState;
						tutorialSteps.push(tutorialStep);
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
		
		//Sort states by name
		reachableStates = reachableStates.sort(function (a, b){
			return a.data('name') > b.data('name');
		});
		
		tutorialStep = Object.create(null);
		tutorialStep['text'] = tutorialText['createMarkTable'];
		tutorialStep['highlightElements'] = reachableStates;
		tutorialSteps.push(tutorialStep);
		
		//Setup mark table
		var markTable = Object.create(null);
		for(var row = 1; row < reachableStates.length; row++){
			markTable[reachableStates[row].id()] = Object.create(null);
			for(var cell = 0; cell < row; cell++){
				markTable[reachableStates[row].id()][reachableStates[cell].id()] = false;
 			}
		}
		
		var newMarks = Object.create(null);
		tutorialStep = Object.create(null);
		tutorialStep['text'] = tutorialText['markTableDescription'];
		tutorialStep['highlightElements'] = reachableStates;
		tutorialSteps.push(tutorialStep);
		
		var endStatesIds = Object.create(null);
		for(var i = 0; i < endStates.length; i++){
			var endStateId = endStates[i].id();
			endStatesIds[endStateId] = true;
			for(var j = 0; j < reachableStates.length; j++){
				var reachableStateId = reachableStates[j].id();
				if(!reachableStates[j].data('isEndState')){
					if(endStateId in markTable && reachableStateId in markTable[endStateId]){
						markTable[endStateId][reachableStateId] = true;
						newMarks[endStateId + reachableStateId] = true;
					}
					else{
						markTable[reachableStateId][endStateId] = true;
						newMarks[reachableStateId + endStateId] = true;
					}
				}
			}
		}
		
		tutorialStep = Object.create(null);
		tutorialStep['text'] = tutorialText['markEndStates'];
		tutorialStep['highlightElements'] = endStates;
		tutorialStep['marks'] = newMarks;
		tutorialStep['newMarks'] = newMarks;
		tutorialSteps.push(tutorialStep);
		
		
		tutorialStep = Object.create(null);
		tutorialStep['marks'] = newMarks;
		tutorialStep['text'] = tutorialText['checkUnmarkedFields'];
		tutorialSteps.push(tutorialStep);
		
		var marked;
		do{
			marked = false;
			for (var row in markTable) {
				for(var column in markTable[row]){
					if(!markTable[row][column]){
						var state1 = cy.getElementById(row);
						var state2 = cy.getElementById(column);
						var startPairName = state1.data('name') + ',' + state2.data('name');
						var startPairId = state1.id() + state2.id();
						for(var symbol in activeAutomata.inputAlphabet){
							tutorialStep = Object.create(null);
							tutorialStep['marks'] = tutorialSteps[tutorialSteps.length-1]['marks'];
							tutorialStep['startPair'] = startPairId;
							
							var transitionState1 = getTransitionStates(state1, symbol);
							var transitionState2 = getTransitionStates(state2, symbol);
							
							tutorialStep['highlightElements'] = state1.add(state2, transitionState1, transitionState2);
							if(transitionState1.id() != transitionState2.id()){
								//If transition nodes are out of index table index swap them
								if(transitionState1.id() == reachableStates[0].id() || transitionState2.id() == reachableStates[reachableStates.length-1].id()){
									var temp = transitionState1;
									transitionState1 = transitionState2;
									transitionState2 = temp;
								}
								var reachedPairName = transitionState1.data('name') + ',' + transitionState2.data('name');
								var reachedPairId = transitionState1.id() + transitionState2.id();
								tutorialStep['reachedPair'] = reachedPairId;
								tutorialStep['text'] = tutorialText['statePairTransitionsTo'].format(startPairName, symbol, reachedPairName);
								
								if(markTable[transitionState1.id()][transitionState2.id()]){
									markTable[state1.id()][state2.id()] = true;
									marked = true;
									
									tutorialStep['text'] += tutorialText['pairIsMarked'].format(reachedPairName, startPairName);
									var marks = $.extend({}, tutorialStep['marks']);
									newMarks = Object.create(null);
									newMarks[startPairId] = true;
									marks[startPairId] = true;
									tutorialStep['newMarks'] = newMarks;
									tutorialStep['marks'] = marks;
									tutorialSteps.push(tutorialStep);
									break;
								}
								else{
									tutorialStep['text'] += tutorialText['pairIsNotMarked'].format(reachedPairName);
								}
							}
							else{
								tutorialStep['text'] = tutorialText['statePairTransitionToState'].format(startPairName, symbol, transitionState1.data('name'));
							}
							tutorialSteps.push(tutorialStep);
						}
					}
				}
			}
		}while( marked );
		
		tutorialStep = Object.create(null);
		tutorialStep['text'] = tutorialText['noMoreMarksFound'];
		tutorialStep['marks'] = tutorialSteps[tutorialSteps.length-1]['marks'];
		tutorialSteps.push(tutorialStep);
		
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
			
			tutorialStep = Object.create(null);
			tutorialStep['marks'] = tutorialSteps[tutorialSteps.length-1]['marks'];
			tutorialStep['equivalentState'] = Object.create(null);
			
			for(var state in equivalentStates[i]){
				if(state == startStateId)
					isStartState = true;
				if(state in endStatesIds)
					isEndState = true;
				id += state;
				names.push(equivalentStates[i][state]);
				
			}
			names.sort();
			var combinedStateName = names.toString();
			tutorialStep['text'] = tutorialText['equivalentStates'].format(combinedStateName);
			equivalentStatesIds.push(id);
			var combinedState = addState(prefix + id, combinedStateName);
			tutorialStep['highlightElements'] = combinedState;
			if(isStartState){
				setStartState(combinedState, true);
				tutorialStep['text'] += tutorialText['containsStartState'];
			}
			if(isEndState){
				setEndState(combinedState, true);
				tutorialStep['text'] += tutorialText['containsEndState'];
			}
			tutorialSteps.push(tutorialStep);
		}
		
		tutorialStep = Object.create(null);
		tutorialStep['marks'] = tutorialSteps[tutorialSteps.length-1]['marks'];
		tutorialStep['text'] = tutorialText['copySingleStates'];
		tutorialStep['highlightElements'] = cy.collection();
		
		for(var state in singleStates){
			tutorialStep['highlightElements'].add(cy.getElementById(state));
			var newState = addState(prefix + state, singleStates[state]);
			if(state == startStateId)
				setStartState(newState, true);
			if(state in endStatesIds)
				setEndState(newState, true);
			tutorialStep['highlightElements'].add(newState);
		}
		tutorialSteps.push(tutorialStep);
		
		tutorialStep = Object.create(null);
		tutorialStep['marks'] = tutorialSteps[tutorialSteps.length-1]['marks'];
		tutorialStep['text'] = tutorialText['adjustTransitions'];
		tutorialSteps.push(tutorialStep);
		//Add edges
		for(var state in singleStates){
			var oldState = cy.getElementById(state);
			var transitions = getTransitions(oldState);
			for(var i = 0; i < transitions.length; i++){
				var transition = transitions[i];
				var targetId = getTargetId(transition.target().id(), singleStates, equivalentStates, equivalentStatesIds);
				for(var symbol in transition.data('transitionSymbols')){
					tutorialStep = Object.create(null);
					tutorialStep['marks'] = tutorialSteps[tutorialSteps.length-1]['marks'];
					tutorialStep['text'] = tutorialText['stateTransitions'].format(oldState.data('name'),symbol, transition.target().data('name'));
					var newTarget = cy.getElementById(prefix + targetId);
					if(!(targetId in singleStates))
						tutorialStep['text'] += tutorialText['equivalentToState'].format(newTarget.data('name'));
					tutorialStep['text'] += tutorialText['addTransition'].format(oldState.data('name'), newTarget.data('name'), symbol);
					var newEdge = addEdge(prefix + state, prefix + targetId, symbol);
					tutorialStep['highlightElements'] = newEdge;
					tutorialSteps.push(tutorialStep);
				}
			}
		}
		
		tutorialStep = Object.create(null);
		tutorialStep['marks'] = tutorialSteps[tutorialSteps.length-1]['marks'];
		tutorialStep['text'] = tutorialText['adjustTransitionsEquivalentStates'];
		tutorialSteps.push(tutorialStep);
		
		for(var i = 0; i < equivalentStates.length; i++){
			for(var state in equivalentStates[i]){
				var oldState = cy.getElementById(state);
				var transitions = getTransitions(oldState);
				for(var j = 0; j < transitions.length; j++){
					var transition = transitions[j];
					var targetId = getTargetId(transition.target().id(), singleStates, equivalentStates, equivalentStatesIds);
					for(var symbol in transition.data('transitionSymbols')){
						tutorialStep = Object.create(null);
						tutorialStep['marks'] = tutorialSteps[tutorialSteps.length-1]['marks'];
						tutorialStep['text'] = tutorialText['stateTransitions'].format(oldState.data('name'),symbol, transition.target().data('name'));
						var newTarget = cy.getElementById(prefix + targetId);
						if(!(targetId in singleStates))
							tutorialStep['text'] += tutorialText['equivalentToState'].format(newTarget.data('name'));
						tutorialStep['text'] += tutorialText['addTransition'].format(oldState.data('name'), newTarget.data('name'), symbol);
						var newEdge = addEdge(prefix + equivalentStatesIds[i], prefix + targetId, symbol);
						tutorialStep['highlightElements'] = newEdge;
						tutorialSteps.push(tutorialStep);
					}
				}
				break;
			}
		}
		
		tutorialStep = Object.create(null);
		tutorialStep['marks'] = tutorialSteps[tutorialSteps.length-1]['marks'];
		tutorialStep['text'] = tutorialText['minimizeDFADone'];
		tutorialSteps.push(tutorialStep);
		
		var automataPos = {x: automataBb.x2 + 50, y: (automataBb.h / 2 + automataBb.y1)}
		applyAutomataLayout(automataPos);
		setupTutorial(2,markTable);
	}
	
	if (!String.prototype.format) {
		String.prototype.format = function() {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) { 
			return typeof args[number] != 'undefined'
				? args[number]
				: match
				;
			});
		};
	}
	
	var tutorialText = {
		findStartStates: 'Wir suchen als erstes alle Startzustände des Automaten.',
		foundStartStates: 'Die Startzustände des Automaten sind: ({0}).',
		noStartStates: 'Es sind keine Startzustände vorhanden, kein Wort kann akzeptiert werden!',
		readNthSymbol: 'Wir lesen das {0}. Zeichen des Wortes und suchen alle Übergänge von ({1}) mit dem Zeichen "{2}".',
		useTransitions: 'Wir gehen mit unseren gefundenen Übergängen in die Zustände: ({0})',
		undefinedTransitions: 'Es sind keine Übergänge von ({0}) für das Zeichen "{1}" verfügbar, das Wort kann nicht komplett eingelesen werden und wird nicht akzeptiert!',
		wordFullyRead: 'Wir haben das Wort komplett eingelesen und schauen wir uns die aktuellen Zustände ({0}) an: <br>',
		wordAccepted: 'Da sich darunter ein Endzustand befindet, wird das Wort von diesem Automaten akzeptiert!',
		wordRejected: 'Da sich darunter kein Endzustand befindet, wird das Wort von diesem Automaten nicht akzeptiert!',
		inputWord: 'Eingabewort',
		combineStartStates: 'Wir fassen alle Startzustände zu einem neuen Startzustand zusammen.',
		startContainsEndState: '<br>Da sich darunter mindestens ein Endzustand befindet, ist auch der neue Startzustand ein Endzustand.',
		checkNewStates: 'Wir müssen nun für alle neuen Zustände alle Übergänge überprüfen',
		stateTransitions: 'Der Zustand ({0}) geht mit dem Zeichen "{1}" über in den Zustand ({2})',
		stateNoTransitions: 'Der Zustand ({0}) hat keine Übergänge für das Zeichen "{1}"',
		newStateFound: '{0} exsistiert noch nicht, darum müssen wir einen neuen Zustand erstellen.',
		theState: 'Der Zustand ',
		catchState: 'Ein Fangzustand',
		createCatchState: '<br>Für den Fangzustand führen alle Übergänge wieder zum Fangzustand, deswegen müssen wir ihn nicht weiter betrachten.',
		containsEndState: '<br>Außerdem befindet sich ein Endzustand im neuen Zustand, dadurch ist der neue Zustand auch ein Endzustand.',
		newStates: 'Neue Zustände',
		addNewEdge: 'Wir fügen eine neuen Übergang von ({0}) {1} mit dem Zeichen "{2}" in unseren Automaten ein.',
		toCatchState: ' zum Fangzustand',
		to: ' zu ',
		addSymbolToEdge: 'Wir fügen zur bereits bestehenden Übergang von ({0}) {1} das Zeichen "{2}" hinzu.',
		removeWorkingState: 'Wir haben für alle Zeichen der Eingabealphabetes die Übergänge definiert, der Zustand ({0}) ist abgearbeitet.',
		toDfaDone: 'Es sind keine neuen Zustände mehr vorgekommen, der DFA ist fertig.', 
		checkIfDFA: 'Wir überprüfen als erstes ob es sich bei dem Automaten um einen DFA handelt',
		tooManyStartStates: 'Es ist mehr als ein Startzustand vorhanden, der Automat ist kein DFA!',
		tooManyTransitions: 'Es ist mehr als ein Übergang für ein Zeichen im Zustand ({0}) definiert, der Automat ist kein DFA!',
		missingTransition: 'Es fehlt ein Übergang für das Zeichen "{0}" im Zustand ({1}), der Automat ist kein DFA!',
		markTable: 'Markierungstabelle',
		createMarkTable: 'Da der Automat ein DFA ist, können wir für alle erreichbaren Zustände die Markierungstabelle erstellen.',
		markTableDescription: 'In der Markierungstabelle sind alle ungleichen Paare von erreichbaren Zuständen aufgeführt',
		markEndStates: 'Wir markieren als erstes alle Paare von Endzustand und nicht Endzustand, aber nicht Paare von Endzuständen!',
		checkUnmarkedFields: 'Wir überprüfen nun für jedes unmarkierte Feld ob ein Übergang in ein markiertes Zustandspaar geht.',
		statePairTransitionsTo: 'Zustandspaar ({0}) geht mit dem Zeichen "{1}" über in das Zustandspaar ({2})',
		pairIsMarked: '<br>Zustandspaar ({0}) ist markiert, darum müssen wir auch ({1}) markieren.',
		pairIsNotMarked: '<br>Zustandspaar ({0}) ist nicht markiert.',
		statePairTransitionToState: 'Zustandspaar ({0}) geht mit dem Zeichen "{1}" über in den Zustand ({2})<br> Da dies nur ein einzelner Zustand ist, können wir nichts markieren.',
		noMoreMarksFound: 'Wir können keine Markierungen mehr setzen, die übrigen freien Felder geben nun an welche Zustände zu einem Zustand verschmolzen werden können.',
		equivalentStates: 'Zustände {0} sind gleich, wir erstellen also einen neuen Zustand ({0}).',
		containsStartState: '<br>Da sich der Startzustand im neuen Zustand befindet, ist der neue Zustand der Startzustand.',
		copySingleStates: 'Wir übernehmen alle sonstigen Zustände die nicht verschmolzen wurden.',
		adjustTransitions: 'Nun müssen wir nurnoch für alle neuen Zustände die Übergänge anpassen.',
		equivalentToState: '<br>Dieser Zustand befindet sich im Zustand ({0}).',
		addTransition: '<br>Wir fügen also den Übergang von ({0}) zu ({1}) mit dem Übergangszeichen "{2}" ein',
		adjustTransitionsEquivalentStates: 'Für die verschmolzenen Zustände müssen wir uns jeweils nur die Übergänge eines Zustands anschauen, da die anderen Zustände gleich sind.',
		minimizeDFADone: 'Wir haben alle Übergänge übernommen, der Minimalautomat ist fertig!',
	}
	
	/* T U T O R I A L  F U N C T I O N S */
	
	//Function for animating each field in the tutorialSteps
	var advanceProgress = function(){
		if(currentProgress < tutorialSteps.length){
			if(currentProgress != 0){
				tutorialSteps[currentProgress-1].removeClass('highlighted');
			}
			tutorialSteps[currentProgress].addClass('highlighted');
			textCurrentProgress.text(currentProgress);
			progressSlider.slider('setValue', currentProgress);
			currentProgress++;
			setTimeout(advanceProgress , 1000);
		}
	}
	
	var jumpToStep = function(progress){
		if(0 <= progress  && progress < tutorialSteps.length){
			var currentStep = tutorialSteps[progress];
			cy.batch(function(){
				cy.elements('.highlighted').removeClass('highlighted');
				if('highlightElements' in currentStep)
					currentStep['highlightElements'].addClass('highlighted');
			});
			if(sidebarMode == 0){
				var row = $('#rowInputWord td');
				var readerPos = -1;
				var wordAccepted;
				var terminatePos = -1;
				if('readerPos' in currentStep)
					readerPos = currentStep['readerPos'];
				if('terminatePos' in currentStep)
					terminatePos = currentStep['terminatePos'];
				if('wordAccepted' in currentStep)
					wordAccepted = currentStep['wordAccepted'];
				
				row.each( function ( i, ele) {
					var ele = $(ele);
					ele.removeClass();
					if( i < readerPos)
						ele.addClass('success');
					else if(i == terminatePos)
						ele.addClass('danger');
					else if( i == readerPos)
						ele.addClass('info');
					else if( wordAccepted === true)
						ele.addClass('success');
					else if( wordAccepted === false)
						ele.addClass('danger');
				});
			}
			if(sidebarMode == 1){
				tableSidebar.empty();
				if('workingStates' in currentStep){
					var row = $('<tr></tr>').appendTo(tableSidebar);
					for(var state in currentStep['workingStates']){
						if(state == currentStep['workingStateActive'])
							row.append('<td class="info">' + currentStep['workingStates'][state] + '</td>');
						else if(state == currentStep['workingStateNew'])
							row.append('<td class="success">' + currentStep['workingStates'][state] + '</td>');
						else if(state == currentStep['workingStateRemove'])
							row.append('<td class="danger">' + currentStep['workingStates'][state] + '</td>');
						else
							row.append('<td>' + currentStep['workingStates'][state] + '</td>');
					}
					openSidebar();
				}
			}
			if(sidebarMode == 2){
				$('.mark-field').removeClass('success info warning').text('');
				if('marks' in currentStep){
					if('newMarks' in currentStep){
						for(var mark in currentStep['marks']){
							var markField = $('#'+mark);
							markField.text('X');
							if(mark in currentStep['newMarks'])
								markField.addClass('success');
							
						}
					}
					else{
						for(var mark in currentStep['marks']){
							$('#'+mark).text('X');
						}
					}
				}
				if('startPair' in currentStep){
					$('#'+currentStep['startPair']).addClass('info');
				}
				if('reachedPair' in currentStep){
					$('#'+currentStep['reachedPair']).addClass('warning');
				}
			}
			currentProgress = progress;
			textCurrentProgress.text(currentProgress);
			textTutorial.html(currentStep['text']);
			progressSlider.slider('setValue', currentProgress);
		}
	}
	
	var stopTutorial = function(){
		cy.batch(function(){
			cy.elements('.highlighted').removeClass('highlighted');
		});
	}
	
	function setupTutorial(mode, modeParam){
		currentProgress = 0;
		progressSlider.slider('setValue', 0);
		progressSlider.slider('setAttribute', 'max', tutorialSteps.length-1);
		textCurrentProgress.text(0);
		textMaxProgress.text(tutorialSteps.length-1);
		setupSidebar(mode, modeParam);
		tutorialBar.slideDown();
		jumpToStep(0);
	}
	
	function setupSidebar(mode, modeParam){
		sidebarMode = mode;
		tableSidebar.empty();
		tutorialSidebar.removeClass('sidebar-small sidebar-large');
		if(sidebarMode == 0){
			tutorialSidebar.addClass('sidebar-small');
			textSidebarTitle.text(tutorialText['inputWord']);
			var row = $('<tr id="rowInputWord"></tr>').appendTo(tableSidebar);
			for(i = 0; i < modeParam.length; i++){
				row.append('<td>' + modeParam[i] + '</td>');
			}
		}
		if(sidebarMode == 1){
			tutorialSidebar.addClass('sidebar-small');
			textSidebarTitle.text(tutorialText['newStates']);
		}
		if(sidebarMode == 2){
			tutorialSidebar.addClass('sidebar-large');
			textSidebarTitle.text(tutorialText['markTable']);
			var row;
			var tableRow;
			for(row in modeParam){
				tableRow = $('<tr></tr>').appendTo(tableSidebar);
				tableRow.append('<td>' + cy.getElementById(row).data('name') + '</td>');
				for(var column in modeParam[row]){
					tableRow.append('<td class="mark-field" id="' + row + column + '"></td>');
				}
			}
			tableRow = $('<tr></tr>').appendTo(tableSidebar);
			tableRow.append('<td></td>');
			for(var column in modeParam[row]){
				tableRow.append('<td>' + cy.getElementById(column).data('name') + '</td>');
			}
		}
	}
	
	function openSidebar(){
		if(!tutorialSidebar.hasClass('open')){
			tutorialSidebar.removeClass('closed');
			tutorialSidebar.addClass('open');
		}
	}
	
	var toggle = $('#tutorialSidebarHandle');

	toggle.on('click', function() {
		var isOpen = tutorialSidebar.hasClass('open');
		if(isOpen){
			tutorialSidebar.removeClass('open');
			tutorialSidebar.addClass('closed');
		}
		else{
			tutorialSidebar.removeClass('closed');
			tutorialSidebar.addClass('open');
		}
	});
});