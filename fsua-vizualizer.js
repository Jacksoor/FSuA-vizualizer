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
			'transition-duration': '0.75s',
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
		.selector(':selected')
		.css({
			'background-color': 'black',
			'line-color': 'black',
			'target-arrow-color': 'black',
			'source-arrow-color': 'black'
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
	var activeAutomata = 1;
	var avaiableAutomatas = [{id: 1, name: 'Automat 1'}];
	var stateCounter = 0;
	var edgeCounter = 0;
	var ghostCounter = 0;
	
	var linkSourceNode = null;
	var linkingMode = false;
	
	//Get Settings
	var apiTipEdgeSettings = null;
	var edgeSettingsError = $('#errorTransitionSymbols');
	var settingsActive = false;
	var editNode = null;
	var editEdge = null;
	
	var inputAlphabet = [];
	
	/* F U N C T I O N S */
	function createNewAutomata(){
		automataCounter++;
		avaiableAutomatas.push({id: automataCounter, name: 'Automat ' + automataCounter});
		$('#listAvaiableAutomatas').append($('<li></li>').append($('<a href="#"></a>').attr('value', automataCounter).text('Automat ' + automataCounter)));
		switchAutomata(automataCounter);
	}
	
	function switchAutomata(automataId){
		if(linkingMode){
			endLinkingMode();
		}
		$.each(avaiableAutomatas, function(i, automata){
			if(automata.id == automataId){
				$('#textActiveAutomata').text(automata.name);
				return;
			}
		});
		var oldAutomata = cy.elements('[automataId = ' + activeAutomata +']');
		oldAutomata.addClass('inactive');
		oldAutomata.lock();
		oldAutomata.ungrabify();
		var newAutomata = cy.elements('[automataId = ' + automataId +']');
		newAutomata.unlock();
		newAutomata.grabify();
		newAutomata.removeClass('inactive');
		activeAutomata = automataId;
	}
	
	
	function startLinkingMode(event){
		linkSourceNode = event.cyTarget;
		linkSourceNode.addClass('link');
		cy.add([
			{ group: "nodes", data: { id: "linker", isGhost: true}, classes: 'ghostNode', renderedPosition: event.cyRenderedPosition },
			{ group: "edges", data: { id: "newLink", source: linkSourceNode.id(), target: 'linker' , isGhost: true} },
		]);
		linkingMode = true;
	}
	
	function endLinkingMode(){
		linkSourceNode.removeClass('link');
		linkSourceNode = null;
		cy.$('#linker').remove();
		cy.nodes().unlock();
		linkingMode = false;
	}
	
	function linkMode(event){
		if(linkSourceNode == null){
			//Ghost nodes cannot be used for links
			if(event.cyTarget.data('isGhost'))
				return;
			startLinkingMode(event);
		}
		//Unselect selected node
		else if(event.cyTarget == linkSourceNode){
			endLinkingMode();
		}
		//Link the selected node to the event node
		else{
			//Cancel linking mode on invalid target
			if(event.cyTarget.data('isGhost')){
				endLinkingMode();
				return;
			}
			if(linkSourceNode.edgesTo('#'+event.cyTarget.id()).length == 0){
				cy.add([
					{ group: "edges", data: { id: "e"+edgeCounter, automataId: activeAutomata, source: linkSourceNode.id(), transitionSymbols: [], symbolsText: '', target: event.cyTarget.id() } },
				]);
				edgeCounter++;
			}
			endLinkingMode();
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
		//Ghost edges have no settings!
		if(event.cyTarget.data('isGhost'))
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
		$.each(event.cyTarget.data('transitionSymbols'), function(i, tag){
			inputSymbols.tagsinput('add' , tag);
		});
		
		editEdge = event.cyTarget;
		apiTipEdgeSettings.show();
		inputSymbols.tagsinput('focus');
	}
	
	/* N O D E  F U N C T I O N S */
	
	function setStateName(node, newName){
		node.data('name', newName);
	}
	
	function setStartState(node, boolParam){
		node.data('isStartState',boolParam);
		if(boolParam){
			//Copy position
			var anchorPosition = jQuery.extend({}, node.position());
			anchorPosition.x -= 75;
			cy.add([
				{ group: "nodes", data: { id: "gn"+ghostCounter, automataId: activeAutomata, isGhost: true, isGhostStartNode: true, toStartNode: node.id() }, grabbable: false, position: anchorPosition },
				{ group: "edges", data: { id: "ge"+ghostCounter, automataId: activeAutomata, source: "gn"+ghostCounter, target: node.id(), isGhost: true  } },
			]);
			cy.$('#gn'+ghostCounter).addClass('ghostNode');
			//Add ghost node as Attribute
			node.data('startGhost', "#gn"+ghostCounter);
			ghostCounter++;
		}
		else{
			cy.$(node.data('startGhost')).remove();
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
			cy.add([
				{ group: "edges", data: { id: "e"+edgeCounter, automataId: activeAutomata, source: node.id(), target: node.id(), transitionSymbols: [], symbolsText: ''}, classes: 'loop' },
			]);
			edgeCounter++;
		}
		//Check if theres a self loop
		else if(node.edgesTo(node).length == 1){
			node.edgesTo(node).remove();
		}
	}
	
	function setTransitionSymbols(edge, newTags){
		edge.data('symbolsText', newTags.val());
		//Save a copy of transition symbols in the node
		edge.data('transitionSymbols', $.extend([],newTags.tagsinput('items')));
	}
	
	//Remove a transition symbol from all edges and update their text
	function removeFromEdges(transitionSymbol){
		allEdges = cy.edges();
		allEdges.each(function(i,ele){
			if($.inArray(transitionSymbol, ele.data('transitionSymbols')) > -1){
				ele.data('transitionSymbols').splice( $.inArray(transitionSymbol, ele.data('transitionSymbols')), 1 );
				ele.data('symbolsText', ele.data('transitionSymbols').toString());
			}
		});
	}
	
	/* A L G O R I T H M  F U N C T I O N S */
	
	//Get all possible transition edges from a node
	function getTransitions(nodes, symbol){
		if(nodes === undefined)
			return
		var transitions;
		if(symbol === undefined){
			//Get all outgoing transitions
			transitions = nodes.outgoers('edge')
			//Add loops
			nodes.each(function(i, node){
				transitions = transitions.add(node.edgesTo(node));
			});
		}
		//Get only outgoing transitions with matching symbol
		else{
			transitions = nodes.outgoers('edge').filter( function(i, transition){
				if($.inArray(symbol, transition.data('transitionSymbols')) > -1){
					return true;
				}
				return false;
			});
			nodes.each(function(i, node){
				var transitionLoops = node.edgesTo(node).filter( function(i, transition){
					if($.inArray(symbol, transition.data('transitionSymbols')) > -1){
						return true;
					}
					return false;
				});
				transitions = transitions.add(transitionLoops);
			});
		}
		return transitions;
	}
	
	function getTransitionNodes(nodes, symbol){
		if(nodes === undefined)
			return
		var transitionNodes = cy.collection();
		if(symbol === undefined){
			//Get all reachable nodes
			transitionNodes = nodes.outgoers('node')
			//Add loops
			nodes.each(function(i, node){
				if(node.edgesTo(node).length > 1){
					transitionNodes = transitionNodes.add(node);
				}
			});
		}
		//Get only outgoing transitions with matching symbol
		else{
			var transitionEdges = getTransitions(nodes, symbol);
			transitionEdges.each(function(i, edge){
				transitionNodes = transitionNodes.add(edge.target());
			});
		}
		return transitionNodes;
	}
	
	//Adds a cy collection to the array if it's not already contained
	function setAdd(array, collectionElement){
		for(var i = 0; i < array.length; i++){
			if(array[i].same(collectionElement)){
				return false;
			}
		}
		array.push(collectionElement);
		return true;
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
	
	$('#inputAlphabet').on('itemRemoved', function(event){
		removeFromEdges(event.item);
	});
	
	$(document).on('itemAdded itemRemoved', '#inputTransitionSymbols', function(){
		if(editEdge != null){
			setTransitionSymbols(editEdge, $(this));
		}
	});
	
	$('#inputTransitionSymbols').on('beforeItemAdd', function(event){
		if($.inArray(event.item, inputAlphabet) == -1){
			edgeSettingsError.stop(true).hide().show().delay(2000).fadeOut();
			event.cancel = true;
		}
	});
	
	/* C Y T O S C A P E  E V E N T S */
	
	//Double click and single click distinguish
	var clicks = 0;
	cy.on('tap', 'node', function(event) {
		var target = event.cyTarget;
		if(target.id() != "linker" && target.data('automataId') != activeAutomata)
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
		if(event.cyTarget.data('automataId') == activeAutomata){
			showEdgeSettings(event);
		}
	});
	
	//Event to move ghost start node with actual node
	cy.on('drag' , 'node', function(event){
		if(event.cyTarget.data('automataId') == activeAutomata && event.cyTarget.data('isStartState')){
			var anchorPosition = jQuery.extend({}, event.cyTarget.position());
			anchorPosition.x -= 75;
			cy.$(event.cyTarget.data('startGhost')).position(anchorPosition);
		}
	});
	
	//Right click or 2 finger tap
	cy.on('cxttap', function(event){
		//Event is on canvas
		if(event.cyTarget === cy){
			//Add a new node
			cy.add([
				{ group: "nodes", data: { id: "z"+stateCounter , automataId: activeAutomata, name: "z"+stateCounter, isStartState: false, isEndState: false, hasLoop: false }, renderedPosition: event.cyRenderedPosition },
			]);
			stateCounter++;
		}
		else if(event.cyTarget.isNode()){
			//Only active automatas are modifiable
			if(event.cyTarget.data('automataId') != activeAutomata)
				return;
			
			if(event.cyTarget.data('isGhostStartNode')){
				setStartState(cy.$(event.cyTarget.data('toStartNode')), false);
				return;
			}
			//TODO: Remove Start State ghost nodes.
			cy.remove(event.cyTarget);
		}
		else if(event.cyTarget.isEdge()){
			if(event.cyTarget.data('automataId') != activeAutomata)
				return;
			//Adjust properties of looped node
			if(event.cyTarget.isLoop()){
				setLoop(event.cyTarget.source(), false);
			}
			//Removed ghost link for starting state
			else if(event.cyTarget.data('isGhost')){
				setStartState(event.cyTarget.target(), false);
				return;
			}
			cy.remove(event.cyTarget);
		}
	});
	
	cy.on('tapdrag', function(event){
		if(linkingMode){
			cy.$('#linker').renderedPosition(event.cyRenderedPosition);
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
	
	$('#inputAlphabet').on('itemAdded itemRemoved', function(event){
		inputAlphabet = $('#inputAlphabet').tagsinput('items');
	});
	
	$('#btnTestWord').on('click', function(){
		acceptsWord($('#inputWord').val())
	});
	
	$('#btnSave').on('click', function(){
		var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cy.elements().json()));
		var anchorElement = $('#saveAnchor');
		anchorElement.attr("href", dataStr);
		anchorElement.attr("download", "graph.json");
		anchorElement.trigger('click');
	});
	
	$('#btnAnalyzeGraph').on('click', function(){
		analyzeGraph();
		$('#modalAnalyzedGraph').modal('show');
	});
	
	//Debug Button for console logs
	$('#btnToDFA').on('click', function(){
		toDFA();
	});
	
	$('#btnTest').on('click', function(){
		console.log(cy.elements('[ automataId = ' + activeAutomata+']'));
		console.log(cy.elements());
	})
	
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
					console.log(symbolTransitionCount);
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
		var currentNodes = cy.elements('node[?isStartState]');
		var path = [];
		inputWord = word;
		path.push(currentNodes);
		for (var i = 0, len = word.length; i < len; i++) {
			var nextNodes = cy.collection();
			var nextEdges = cy.collection();
			var outEdges = currentNodes.outgoers('edge');
			
			//Get loops
			currentNodes.each(function(j, ele){
				outEdges = outEdges.add(ele.edgesTo(ele));
			});
			
			outEdges.each(function(j, ele){
				$.each(ele.data('transitionSymbols'), function(k, symbol){
					if(symbol == word[i]){
						nextEdges = nextEdges.add(ele);
						nextNodes = nextNodes.add(ele.target());
					}
				});
			});
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
	
	var dfaCount = 0;
	
	function toDFA(){
		var startStates = cy.nodes('[?isStartState]');
		if(startStates.empty())
			return;
		var workingStates = [startStates];
		var allStates = [startStates];
		var startStatesId = getCombinedId(startStates);
		cy.add([
			{ group: "nodes", data: { id: 'dfa' + startStatesId, name: startStatesId, isStartState: false, isEndState: false, hasLoop: false } },
		]);
		setStartState(cy.$('#dfa' + startStatesId),true);
		
		if(containsEndState(startStates))
			setEndState(cy.$('#dfa' + startStatesId), true);
		
		while(workingStates.length > 0){
			var newStates = [];
			$.each(workingStates, function(i, currentState){
				var currentStateId = getCombinedId(currentState);
				$.each(inputAlphabet, function(j, symbol){
					var reachedState = getTransitionNodes(currentState, symbol);
					var reachedStateId = getCombinedId(reachedState);
					if(setAdd(allStates, reachedState)){
						if(reachedStateId != ""){
							cy.add([
								{ group: "nodes", data: { id: 'dfa' + reachedStateId, name: reachedStateId, isStartState: false, isEndState: false, hasLoop: false } },
							]);
						}
						else{
							cy.add([
								{ group: "nodes", data: { id: 'dfa' + reachedStateId, name: '∅', isStartState: false, isEndState: false, hasLoop: false } },
							]);
						}
						if(containsEndState(reachedState))
							setEndState(cy.$('#dfa'+reachedStateId),true);
						newStates.push(reachedState);
					}
					cy.add([
						{ group: "edges", data: { id: 'dfaE' + edgeCounter, source: 'dfa' + currentStateId, transitionSymbols: [symbol], symbolsText: symbol, target: 'dfa' + reachedStateId } }
					]);
					edgeCounter++;
				});
			});
			workingStates = $.extend([], newStates);
		}
	}
	
});