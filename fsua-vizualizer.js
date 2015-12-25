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
			'edge-text-rotation': 'autorotate',
			'z-index' : '1'
		})
		.selector('.loop')
		.css({
			'target-arrow-shape': 'none',
			'source-arrow-shape': 'triangle',
			'source-arrow-color': 'black'
		})
		.selector(':selected')
		.css({
			'background-color': 'black',
			'line-color': 'black',
			'target-arrow-color': 'black',
			'source-arrow-color': 'black'
		})
		.selector('.endState')
		.css({
			'border-width': '5px',
			'border-style': 'double',
			'border-color': 'black',
		})
		.selector('.ghostNode')
		.css({
			'padding-left': '0px',
			'padding-right': '0px',
			'padding-top': '0px',
			'padding-bottom': '0px',
			'width': '0px',
			'height': '0px',
			'z-index' : '0'
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
			'transition-property': 'background-color, line-color, target-arrow-color, source-arrow-color',
			'transition-duration': '0.5s'
		}),
		//sample elements
		/*elements: {
			nodes: [
			{ data: { id: 't1', name: 'z0', isStartState: true, isEndState: false, hasLoop: false } },
			{ data: { id: 't2', name: 'z1', isStartState: false, isEndState: false, hasLoop: false } },
			{ data: { id: 't3', name: 'z2', isStartState: false, isEndState: false, hasLoop: false } },
			],
			edges: [
			{ data: { id: 'te1', source: 't1', transitionSymbols: ['a'], symbolsText: 'a', target: 't2' } },
			{ data: { id: 'te2', source: 't2', transitionSymbols: ['b'], symbolsText: 'b', target: 't3' } },
			]
		},*/
		
		layout: {
			name: 'grid',
			padding: 10
		}
	});
	
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
					{ group: "edges", data: { id: "e"+edgeCounter, source: linkSourceNode.id(), transitionSymbols: [], symbolsText: '', target: event.cyTarget.id() } },
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
				{ group: "nodes", data: { id: "dummy", isGhost: true}, classes:'ghostNode', grabbable: false, renderedPosition: event.cyRenderedPosition },
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
	
	function setStateName(newName){
		editNode.data('name', newName);
	}
	
	function setStartState(node, boolParam){
		node.data('isStartState',boolParam);
		if(boolParam){
			//Copy position
			var anchorPosition = jQuery.extend({}, node.position());
			anchorPosition.x -= 75;
			cy.add([
				{ group: "nodes", data: { id: "gn"+ghostCounter , isGhost: true, isGhostStartNode: true, toStartNode: node }, grabbable: false, position: anchorPosition },
				{ group: "edges", data: { id: "ge"+ghostCounter, source: "gn"+ghostCounter, target: node.id(), isGhost: true  } },
			]);
			cy.$('#gn'+ghostCounter).addClass('ghostNode');
			//Add ghost node as Attribute
			editNode.data('startGhost', cy.$("#gn"+ghostCounter));
			ghostCounter++;
		}
		else{
			node.data('startGhost').remove();
		}
	}
	
	//Set isEndState to new boolParam
	function setEndState(boolParam){
		editNode.data('isEndState',boolParam);
		if(boolParam){
			editNode.addClass('endState');
		}
		else{
			editNode.removeClass('endState');
		}
	}
	
	function setLoop(node, boolParam){
		node.data('hasLoop', boolParam);
		//Create new self loop
		if(boolParam){
			cy.add([
				{ group: "edges", data: { id: "e"+edgeCounter, source: node.id(), target: node.id(), transitionSymbols: [], symbolsText: ''}, classes: 'loop' },
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
		setStateName($(this).val());
	});
	
	$(document).on('change', '#checkStartState', function(){
		setStartState(editNode, $(this).prop('checked'));
	});
	
	$(document).on('change', '#checkEndState', function(){
		setEndState($(this).prop('checked'));
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
	
	//Double click and single click distinguish
	var clicks = 0;
	cy.on('tap', 'node', function(event) {
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
		showEdgeSettings(event);
	});
	
	//Event to move ghost start node with actual node
	cy.on('drag' , 'node', function(event){
		if(event.cyTarget.data('isStartState')){
			var anchorPosition = jQuery.extend({}, event.cyTarget.position());
			anchorPosition.x -= 75;
			event.cyTarget.data('startGhost').position(anchorPosition);
		}
	});
	
	cy.on('tapdrag', function(event){
		if(linkingMode){
			cy.$('#linker').renderedPosition(event.cyRenderedPosition);
		}
	});
	
	//Right click or 2 finger tap
	cy.on('cxttap', function(event){
		//Event is on canvas
		if(event.cyTarget === cy){
			//Add a new node
			cy.add([
				{ group: "nodes", data: { id: "z"+stateCounter , name: "z"+stateCounter, isStartState: false, isEndState: false, hasLoop: false }, renderedPosition: event.cyRenderedPosition },
			]);
			stateCounter++;
		}
		else if(event.cyTarget.isNode()){
			if(event.cyTarget.data('isGhostStartNode')){
				setStartState(event.cyTarget.data('toStartNode'), false);
				return;
			}
			cy.remove(event.cyTarget);
		}
		else if(event.cyTarget.isEdge()){
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
	
	$('#configToggle').on('click', function(){
		$('body').toggleClass('config-closed');
		cy.resize();
	});
	
	$('#inputAlphabet').on('itemAdded itemRemoved', function(event){
		inputAlphabet = $('#inputAlphabet').tagsinput('items');
	});
	
	$('#btnTestWord').on('click', function(){
		acceptsWord($('#inputWord').val())
	});
	
	$('#btnSave').on('click', function(){
		console.log(cy.json());
	});
	
	$('#btnAnalyzeGraph').on('click', function(){
		analyzeGraph();
	});
	
	//Debug Button for console logs
	$('#btnDebug').on('click', function(){
		analyzeGraph();
	});
	
	
	/* A L G O R I T H M S */
	
	//Get all possible transition edges from a node
	function getTransitions(node){
		//Get all outgoing transitions
		var transitions = node.outgoers('edge')
		//Add loops
		transitions = transitions.add(node.edgesTo(node));
		return transitions;
	}
	
	function analyzeGraph(){
		
		var isDFA = true;
		var countStartStates = 0;
		var countEndStates = 0;
		var countTransitions = 0;
		
		//Get all real nodes
		var allNodes = cy.nodes('[!isGhost]');
		var numStates = allNodes.length;
		allNodes.each(function(i, node){
			if(node.data('isStartState'))
				countStartStates++;
			if(node.data('isEndState'))
				countEndStates++;
			var transitions = getTransitions(node);
			$.each(inputAlphabet, function(j, symbol){
				var symbolTransitionCount = 0;
				transitions.each(function(k,transition){
					if($.inArray(symbol,transition.data('transitionSymbols')) > -1){
						symbolTransitionCounter++;
					}
					if(symbolTransitionCounter > 1){
						isDFA = false;
					}
					console.log(symbolTransitionCounter);
				});
				countTransitions += symbolTransitionCounter;
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
		//TODO: use animation!
		if(highlightCount < highlightPath.length){
			highlightPath[highlightCount].each(function(i,ele){
				var highlightAni = ele.animation({
					style: {
						'background-color': '#61bffc',
						'line-color': '#61bffc',
						'target-arrow-color': '#61bffc',
						'source-arrow-color': '#61bffc',
					},
						duration: 750
				});
				highlightAni.play();
				highlightAni.promise('completed').then(function(){
				highlightAni.reverse().play();
				});
			});
			highlightCount++;
			setTimeout(highlightPathNext , 1000);
		}
		else{
			var accepted = false;
			highlightPath[highlightCount-1].each(function(i, ele){
				if(ele.data('isEndState')){
					accepted = true;
				}
			});
			if(accepted){
				alert(inputWord + ' wurde akzeptiert!');
			}
			else{
				alert(inputWord + ' wurde NICHT akzeptiert!');
			}
			//cy.elements().removeClass('highlighted')
			
		}
	}
	
});