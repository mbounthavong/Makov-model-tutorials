var errormsg = "";

var width = 700,
	height = 500;

var depth;
var numTerminal; 

var multiplier = 1.5;

var numnodes = 0;

var opac = 0.7; // opacity of tooltips

var ttw = 150;

var root; // store data in a variable accessible by all functions

var tree = d3.layout.tree()
	.size([height, width - 160]);

var cluster = d3.layout.cluster()
	.size([height, width - 160]);

var diagonal = d3.svg.diagonal()
    .projection(function (d) {
    return [d.y, d.x];
});

var nodeToCopy;

var blank = 1; //load the blank tree first

function getShape(type) {
	
	if(type=="chance" || type=="markov") {
		return "circle";
	} else if (type == "decision") {
		return "square";
	} else if (type=="terminal"){
		return "triangle-up";
	} 
}

function getColor(type) {
	if(type == "chance") {
		return "green";
	} else if (type == "decision") {
		return "blue";
	} else if (type=="terminal"){
		return "red";
	} else if (type=="markov") {
		return "#620062";
	} else {
		return "white";
	}
}

function getBlankTree() {
	return {
		"name":"",
		"type":"root",
		"probability":"",
		"variables":"",
		"payoff":"",
		"children":[{
			"id":"node1",
			"name":"root",
			"type":"decision",
			"probability":"",
			"variables":"",
			"payoff":""
		}]
	};
}

function addShortProps(match, proptext, probability, delimit) {
	var shortprop = probability;
	
	if(probability.length > 15) 
		shortprop = probability.substring(0,15) + "...\"";
	
	var fulltext = "\n\"probability_short\": "+shortprop+",\n"+proptext+probability + delimit;
	return fulltext;
}

function getUserJSON() {
	var json = document.getElementById('userJSONtext').value;
	
	var newjson = json.replace(/("probability":)(.+?)([,\n])/g, addShortProps);
	
	var outerjson = "{\"name\":\"\",\n\"type\":\"root\",\n\"probability\":\"\",\n\"variables\":\"\",\n\"payoff\":\"\",\n\"children\":[" + newjson + "]}";
	
	try {
		var jsonobj = JSON.parse(outerjson);
		return jsonobj;
	} catch (e) {
		errormsg = e;
		console.log(e);
		return false;
	}
}

function validateJSON() {
	
	var json = document.getElementById('userJSONtext').value;
	var outerjson = "{\"name\":\"\",\n\"type\":\"root\",\n\"probability\":\"\",\n\"variables\":\"\",\n\"payoff\":\"\",\n\"children\":[" + json + "]}";
	try {
		var jsonobj = JSON.parse(outerjson);
		
		return true;
	} catch (e) {
		errormsg = e;
		return false;
	}
} 
    
function getData(blank) {
	
	if (blank == 1) {
		return getBlankTree();
	} else  {
		return getUserJSON();
	}
}

function copyBranch() {
	var selection = d3.select(".node.selected")[0][0];
	
	if(selection) {
	  nodeToCopy = selection.__data__;
	} else {
		nodeToCopy = null;
	}
	//alert("Chose to copy: " + nodeToCopy.name);
}

var copyChildren = function(d,nodeid) {
	
	var selection = d3.select("#" + nodeid);
	var data = selection[0][0].__data__;
	//alert(data.name);
	var dir = 'right'; 
	var name = d.name;
	var props = d.probability;
	var pay = d.payoff;
	var nodeType = d.type;
	var short_props = d.probability_short;
	var vars = d.variables;
	var oldid = d.id;
	var nodeid = "";// = "node"+numnodes;
	numnodes++;
	
	var previd;
	
	if (data.children || data._children) {
		if (data.children.length > 0) {
		
			previd = data.children[data.children.length-1].id;
			
			var prev = previd.split("_");
			var i = 0;
			for (i; i < prev.length-1; i++) {
				nodeid += prev[i] + "_";
			}
			var newnum = parseInt(prev[i]) + 1;
			nodeid += newnum;
		}
	} else {
		nodeid = data.id + "_1";
	}
	
	if (d.id == d.name) {
		name = nodeid;
	}
	
	var cl = data[dir] || data.children || data._children;
	
	if(!cl) {	
		cl = data.children = [];
	}
	
	cl.push({name: name, probability_short: short_props, probability: props, variables: vars, payoff: pay, position: dir, type: nodeType, id:nodeid});
	
	update(1);
	
	if (d.children || d._children) {
		
		d.children.forEach(function (d) {
			copyChildren(d,nodeid);
		});
	}
}

// check the node that is being copied TO against all the nodes in the copied branch
// if any of them match, don't do the copy.
function isRecursiveCopy(node,selectedId) {
	
	if (node.id == selectedId) {
		return true;
	} else {
		if (node.children) {
			return node.children.some(function (d) { return isRecursiveCopy(d, selectedId); });
		} else {
			return false;
		}
	}
/*	var copyid = node.id;
	alert(copyid);
	alert(selectedId);
	if (selectedId.startsWith(node.id)) {
		return true;
	} else {
		return false;
	}*/
}

function pasteBranch() {
	
	var selection = d3.select(".node.selected")[0][0];
	var selectedid = d3.select(".node.selected")[0][0].__data__.id; // id of node we will paste to
	
	if (selection) {
		
		var data = selection.__data__;
		
		if (nodeToCopy.children) {
			// first check to make sure this isn't recursive
			//var isRecursive = nodeToCopy.children.some(function (d) { return isRecursiveCopy(d, selectedid); });
			
			//if (isRecursive) {
			var pasteid = data.id;
			
			//if (pasteid.startsWith(nodeToCopy.id)) { // works in newer browsers only
			if (pasteid.match("^" + nodeToCopy.id)) {
				alert("Recursive copy is not permitted.");
				return;
			} else {
				nodeToCopy.children.forEach(function (d) {
					
					copyChildren(d,selectedid);
				});
			}
		} 
		update(1);
	}
	nodeToCopy = null;
}

/*
 * Get depth of tree (or branch)
 */ 
var getDepth = function (obj) {
	var tdepth = 0;
	if (obj.children) {
		obj.children.forEach(function (d) {
			var tmpDepth = getDepth(d);
			if (tmpDepth > tdepth) {
				tdepth = tmpDepth;
			}
		})
	}
	return 1 + tdepth;
}

/*
 * Count total nodes in tree
 */
var treeCount = function (branch) {
	if (!branch.children) {
		return 1;
	}
	return branch.children.reduce(function (c, b) {
		return c + treeCount(b);
	}, 0)
}

/*
 * Print out CSV of tree: node names
 */
function printCSV() {
	//var treedepth = getDepth(root);
	
	var csv = "";
	
	if (root.children) {
		
		root.children.forEach(function (d) {
			csv = csv + getCSVstring(d, "-", "", 0);
		})
	}
	
	var htmltext = "<textarea id=\"jsontext\" rows=25 cols=55>"+csv+"</textarea>";
	
	document.getElementById("jsonstring").innerHTML = htmltext;
}

function getCSVstring(data, parent, grandparents, tdepth) {
	
	tdepth += 1;
	var myattr = data.name + "\t" + data.id + "\t" + data.type + "\t" + data.probability + "\t" + data.variables + "\t" + data.payoff;
	
	var csv = "";
	if (data.children) {
		if (parent !== "-") {
			grandparents += parent + "\t";
		}
		
		parent = myattr;
		var kidcounter = 0;
		data.children.forEach(function (d) {
			if (kidcounter == 0) {
				csv += parent + "\t" + getCSVstring(d, parent, grandparents, tdepth);
			} else {
				csv += grandparents + parent + "\t" + getCSVstring(d, parent, grandparents, tdepth);
			}
			kidcounter++;
		})
	} else {
		
		csv += myattr;
		var rootdepth = getDepth(root) - 1;
		while (tdepth < rootdepth) {
			csv += "\t\t\t\t";
			tdepth++;
		}
		csv += "\n";
	}
	
	return csv;
}

var svg = d3.select("body #treeDiv").append("svg")
	.attr({
		'xmlns': 'http://www.w3.org/2000/svg',
		'xmlns:xmlns:xlink': 'http://www.w3.org/1999/xlink',
		version: '1.1'
	}) 
	.attr("id","canvas")
	.attr("width", width)
	.attr("height", height*multiplier)
	.append("g")
	.attr("transform", "translate(40,0)");

var root = getData(blank);
depth = getDepth(root);
numTerminal = treeCount(root);
width = 150 + (120 * depth );
height = 20 + (30 * numTerminal);
tree = d3.layout.tree()
	.size([height, width - 160]);

cluster = d3.layout.cluster()
	.size([height, width - 160]);

nodes = cluster.nodes(root),
links = cluster.links(nodes);

var link = svg.selectAll(".link")
	.data(links)
	.enter()
	.append("path")
	.attr("class", "link")
	.style("stroke", "#8da0cb")
	.attr("d", elbow);

var node = svg.selectAll(".node")
	.data(nodes)
	.enter()
	.append("g")
	.attr("class", function(d){ return d.selected?"node selected":"node"; })
	.attr("transform", function (d) {
		return "translate(" + d.y + "," + d.x*multiplier + ")";
	})
	.attr("id",function(d) { /*d.id = "node"+numnodes; numnodes++; return d.id;*/ numnodes++; return d.id; })
	.on("click", function (d) { select(this); })
	.on("dblclick", function (d) { 
		div.transition()
			.duration(100)
			.style("opacity", 0);
		insertNode();
	 })
	.on("mouseover", function(d) {
		if (d.type != "root") {
			div.transition()
				.duration(100)
				.style("opacity", opac);
			
			div.html(
				"<strong>Probability:</strong> " + d.probability.replace(/\n/gi, "<br/>") + "<br/>" + 
				"<strong>Variables:</strong> " + d.variables.replace(/\n/gi, "<br/>") + "<br/>" +
				(d.children && d.payoff=="" ? "" :"<strong>Payoff:</strong> " + d.payoff.replace(/\n/gi, "<br/>")) 
			)
			.style("left", (d3.event.pageX - ttw-15) + "px")
			.style("width",(ttw) + "px")
			.style("top", (d3.event.pageY + 10) + "px");
			hovershow(d);
		}
	})
	.on("mouseout", function(d) {
		div.transition()
			.duration(100)
			.style("opacity", 0);
		hoverhide();
	});

node.append("path")
	.attr("d", d3.svg.symbol()
		.size(150)
		.type(function(d) {return getShape(d.type);})
	)
	.attr("transform", "rotate(270)")
	.style("stroke", function(d){ return getColor(d.type);})
	.style("stroke-width","2.5"); 

node.append("text")
	.attr("dx", -10)
	.attr("dy", -5)
	.style("text-anchor","end")
	.text(function (d) { return d.name; })
	.on("mouseover", function (d) { return hovershow(d);})
	.on("mouseout", function (d) { return hoverhide();});

node.append("text")
	.attr("dx", -13)
	.attr("dy", 10)
	.style("text-anchor","end")
	.text(function (d) { return d.probability_short; })
	.on("mouseover", function (d) { return hovershow(d);})
	.on("mouseout", function (d) { return hoverhide();});

node.append("text")
	.attr("dx", 15)
	.attr("dy", 2)
	.style("text-anchor","start")
	.text(function (d) { return d.children ? "" : d.payoff; })
	.on("mouseover", function (d) { return hovershow(d);})
	.on("mouseout", function (d) { return hoverhide();});

// add the tool tip
var div = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

var tmprt = d3.select("#node1").classed("selected",true);
txtNodeName.value = tmprt[0][0].__data__.name;// prompt('New text:', data.name) || data.name;
nodeProbability.value = tmprt[0][0].__data__.probability;
nodePayoff.value = tmprt[0][0].__data__.payoff;
nodeVariables.value = tmprt[0][0].__data__.variables;
var nodebuttons = document.getElementsByName('radNodeType');

for (i = 0; i < nodebuttons.length; i++) {
	if (nodebuttons[i].value == tmprt[0][0].__data__.type) {
		nodebuttons[i].checked = true;
	} else {
		nodebuttons[i].checked = false;
	}
}

var select = function(node){
	
	// Find previously selected, unselect
	d3.select(".selected>circle").style("fill", "white");
	d3.select(".selected").classed("selected", false);
	
	// Select current item
	d3.select(node).classed("selected", true);
	
	var selection = d3.select(".node.selected")[0][0];
	
	d3.select(".node.selected>circle").style("fill","orange");
	
	if (selection) {
		var data = selection.__data__;
		//alert("Name: " + data.name + "\nSize: " + data.size);
		txtNodeName.value = data.name;// prompt('New text:', data.name) || data.name;
		nodeProbability.value = data.probability;
		nodePayoff.value = data.payoff;
		nodeVariables.value = data.variables;
		
		var nodebuttons = document.getElementsByName('radNodeType');
		
		for (i = 0; i < nodebuttons.length; i++) {
			
			if (nodebuttons[i].value == data.type) {
				nodebuttons[i].checked = true;
			} else {
				nodebuttons[i].checked = false;
			}
		}
	}
};

/*
 * Insert new node
 */ 
function insertNode (){
	
	var selection = d3.select(".node.selected")[0][0];
	
	if (selection) {
		var data = selection.__data__;
		var dir = 'right'; 
		var name = "";//prompt('Name');
		//var props = prompt('Properties');
		var props = "";
		var pay = "";
		var vars = "";
		var nodeType = "chance";
		var addlevel = 2; // add height
		
		var cl = data[dir] || data.children || data._children;
		var nodeid = "";
		if(!cl){	
			cl = data.children = [];
			addlevel = 1; // add width
			nodeid=data.id + "_1";
		} else {
			var previd = data.children[data.children.length-1].id;
			var prev = previd.split("_");
			
			for (i=0; i<prev.length-1; i++) 
				nodeid += prev[i] + "_";
			var newnum = parseInt(prev[i]) + 1;
			
			nodeid += newnum
		}
		var short_props = props.replace(/\n/gi,";");
		if (props.length > 15) { 
			short_props = props.substring(0,16).replace(/\n/gi,";") + "..." ;
		}
		
		numnodes++;
		name = nodeid;
		cl.push({id: nodeid, name: name, probability_short: short_props, probability: props, variables: vars, payoff: pay, position: dir, type: nodeType, id:nodeid});
		
		update(addlevel);
	}
}

/*
 * Bind insert and ctrl-n keys to Insert new node
 */
Mousetrap.bind(['ins','ctrl+n'], function() { 
	insertNode();
});

/*
 * Delete branch
 */
function deleteBranch() {
	var selection = d3.select(".node.selected")[0][0];
	if(selection){
		var data = selection.__data__;
		var dir = 'right';
		if(data.type === 'root'){
			alert('Can\'t delete root');
			return;
		}
		var cl = data.parent[dir] || data.parent.children;
		if(!cl){
			alert('Could not locate children');
			return;
		}
		var i = 0, l = cl.length;
		var childrentext = "";
		
		if(data.children) {
			numnodes = numnodes - data.children - 1;
			childrentext = " and all of its children";
		}
		for(; i<l; i++){
			if(cl[i].name === data.name){
				if(confirm('Sure you want to delete '+data.name+childrentext+'?') === true) {
					cl.splice(i, 1);
				}
				break;
			}
		}
		update(root);
	}       
}

/*
 * Bind delete key to deleteBranch()
 */
Mousetrap.bind('del', function(){
	deleteBranch();
});

function update(addlevel) {
	
	// remember which node was selected, so we can reselect it after we redraw the updated tree
	var selectedid = d3.select(".node.selected")[0][0].__data__.id;
	
	depth = getDepth(root);
	width = 150 + (120 * depth );
	numTerminal = treeCount(root);
	height = 20 + (30 * numTerminal);
	
	d3.select("svg").remove();
	
	tree = d3.layout.tree()
		.size([height, width - 160]);
	
	cluster = d3.layout.cluster()
		.size([height, width - 160]);
	
	svg = d3.select("body #treeDiv").append("svg")
		.attr("id","canvas")
		.attr("width", width)
		.attr("height", height*multiplier)
		.append("g")
		.attr("transform", "translate(40,0)");
	
	nodes = cluster.nodes(root),
		links = cluster.links(nodes);
	
	link = svg.selectAll(".link")
		.data(links)
		.enter()
		.append("path")
		.attr("class", "link")
		.style("stroke", "#8da0cb")
		.attr("d", elbow);
	
	node = svg.selectAll(".node")
		.data(nodes)
		.enter()
		.append("g")
		.attr("class", function(d){ return d.selected?"node selected":"node"; })
		.attr("transform", function (d) {
			return "translate(" + d.y + "," + d.x*multiplier + ")";
		})
		.attr("id",function (d) { return d.id;} )
		.on("click", function (d) { 
			select(this);
			console.log(this.x) })
		.on("dblclick", function (d) { 
			div.transition()
				.duration(100)
				.style("opacity", 0);
				insertNode();
		})
		.on("mouseover", function(d) {
			if (d.type != "root") {
				div.transition()
					.duration(100)
					.style("opacity", opac);
				
				div.html(
					"<strong>Probability:</strong> " + d.probability.replace(/\n/gi, "<br/>") + "<br/>" + 
					"<strong>Variables:</strong> " + d.variables.replace(/\n/gi, "<br/>") + "<br/>" +
					(d.children && d.payoff=="" ? "" :"<strong>Payoff:</strong> " + d.payoff.replace(/\n/gi, "<br/>")) 
				)
				.style("left", (d3.event.pageX - ttw-15) + "px")
				.style("width",(ttw) + "px")
				.style("top", (d3.event.pageY + 10) + "px");
				hovershow(d);
			}
		})
		.on("mouseout", function(d) {
			div.transition()
				.duration(100)
				.style("opacity", 0);
			hoverhide();
		});
	
	node.append("path")
		.attr("d", d3.svg.symbol()
			.size(150)
			.type(function(d) {return getShape(d.type);})
		)
		.attr("transform", "rotate(270)")
		.style("stroke", function(d){ return getColor(d.type);})
		.style("stroke-width","2.5"); 
	
	node.append("text")
		.attr("dx", -10)
		.attr("dy", -5)
		.style("text-anchor","end")
		.text(function (d) { return d.name; })
		.on("mouseover", function (d) { return hovershow(d);})
		.on("mouseout", function (d) { return hoverhide();});
	
	node.append("text")
		.attr("dx", -13)
		.attr("dy", 10)
		.style("text-anchor","end")
		.text(function (d) { return d.probability_short; })
		.on("mouseover", function (d) { return hovershow(d);})
		.on("mouseout", function (d) { return hoverhide();});
	
	node.append("text")
		.attr("dx", 15)
		.attr("dy", 2)
		.style("text-anchor","start")
		.text(function (d) { return d.children ? "" : d.payoff; })
		.on("mouseover", function (d) { return hovershow(d);})
		.on("mouseout", function (d) { return hoverhide();});
	
	// add the tool tip
	var div = d3.select("body").append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);
	
	// reselect the selected node
	// Select current item
	var selection = d3.select("#" + selectedid);
	selection.classed("selected", true);
	
	d3.select(".node.selected>circle").style("fill","orange");
	
	if(selection[0][0]) {
		var data = selection[0][0].__data__;
		txtNodeName.value = data.name;
		nodeProbability.value = data.probability;
		nodePayoff.value = data.payoff;
		nodeVariables.value = data.variables;
		
		var nodebuttons = document.getElementsByName('radNodeType');
		
		for (i = 0; i < nodebuttons.length; i++) {
		
			if (nodebuttons[i].value == data.type) {
				nodebuttons[i].checked = true;
			} else {
				nodebuttons[i].checked = false;
			}
		}
	}
}

// blank == 0 means not blank, blank == 1 means blank
function load(blank) {
	
	if (blank == 1) {
		// make the "are you sure you want to leave the page?" popup appear if the current tree isn't empty
		if (!areYouSure() ) {
			return;
		}
	}
	
	if(blank == 2) {
		if(validateJSON() == false) {
			document.getElementById('errormessages').innerHTML = errormsg;
			return;
		}
	}
	
	document.getElementById('errormessages').innerHTML = "";
	
	document.getElementById('userJSONdiv').style.display='none';
	
	numnodes = 0;
	
	tmprt = getData(blank);
	depth = getDepth(tmprt);
	width = 150 + (120 * depth);
	numTerminal = treeCount(tmprt);
	height = 20 + (30 * numTerminal);
	
	tree = d3.layout.tree()
	 	.size([height, width - 160]);
	
	cluster = d3.layout.cluster()
		.size([height, width - 160]);
	
	root = getData(blank),
		nodes = cluster.nodes(root),
		links = cluster.links(nodes);
	
	d3.select("svg").remove();
	
	svg = d3.select("body #treeDiv").append("svg")
		.attr("id","canvas")
		.attr("width", width)
		.attr("height", height*multiplier)
		.append("g")
		.attr("transform", "translate(40,0)");
	
	link = svg.selectAll(".link")
		.data(links)
		.enter()
		.append("path")
		.attr("class", "link")
		.style("stroke", "#8da0cb")
		.attr("d", elbow);
	
	node = svg.selectAll(".node")
		.data(nodes)
		.enter()
		.append("g")
		.attr("class", function(d){ return d.selected?"node selected":"node"; })
		.attr("transform", function (d) {
			return "translate(" + d.y + "," + d.x*multiplier + ")";
		})
		.attr("id",function(d) { numnodes++; return d.id; })
		.on("click", function (d) { 
			select(this);
			console.log(this.x) })
		.on("dblclick", function (d) { 
		 	div.transition()
				.duration(100)
				.style("opacity", 0);
			insertNode();
		})
		.on("mouseover", function(d) {
			if(d.type != "root") {
				div.transition()
					.duration(100)
					.style("opacity", opac);
				
				div.html(
					"<strong>Probability:</strong> " + d.probability.replace(/\n/gi, "<br/>") + "<br/>" + 
					"<strong>Variables:</strong> " + d.variables.replace(/\n/gi, "<br/>") + "<br/>" +
					(d.children && d.payoff=="" ? "" :"<strong>Payoff:</strong> " + d.payoff.replace(/\n/gi, "<br/>")) 
				)
				.style("left", (d3.event.pageX - ttw-15) + "px")
				.style("width",(ttw) + "px")
				.style("top", (d3.event.pageY + 10) + "px");
				hovershow(d);
			}
		})
		.on("mouseout", function(d) {
			div.transition()
				.duration(100)
				.style("opacity", 0);
			hoverhide();
		});
	
	node.append("path")
		.attr("d", d3.svg.symbol()
			.size(150)
			.type(function(d) {return getShape(d.type);})
		)
		.attr("transform", "rotate(270)")
		.style("stroke", function(d){ return getColor(d.type);})
		.style("stroke-width","2.5"); 
	
	node.append("text")
		.attr("dx", -10)
		.attr("dy", -5)
		.style("text-anchor","end")
		.text(function (d) { return d.name; })
		.on("mouseover", function (d) { return hovershow(d);})
		.on("mouseout", function (d) { return hoverhide();});
	
	node.append("text")
		.attr("dx", -13)
		.attr("dy", 10)
		.style("text-anchor","end")
		.text(function (d) { return d.probability_short; })
		.on("mouseover", function (d) { return hovershow(d);})
		.on("mouseout", function (d) { return hoverhide();});
	
	node.append("text")
		.attr("dx", 15)
		.attr("dy", 2)
		.style("text-anchor","start")
		.text(function (d) { return d.children ? "" : d.payoff; })
		.on("mouseover", function (d) { return hovershow(d);})
		.on("mouseout", function (d) { return hoverhide();});
	
	// add the tool tip
	var div = d3.select("body").append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);
	
	// select the root node
	var tmprt = d3.select("#node1").classed("selected",true);
	
	txtNodeName.value = tmprt[0][0].__data__.name;// prompt('New text:', data.name) || data.name;
	nodeProbability.value = tmprt[0][0].__data__.probability;
	nodePayoff.value = tmprt[0][0].__data__.payoff;
	nodeVariables.value = tmprt[0][0].__data__.variables;
	var nodebuttons = document.getElementsByName('radNodeType');
	for (i = 0; i < nodebuttons.length; i++) {          	
		if (nodebuttons[i].value == tmprt[0][0].__data__.type) {
			nodebuttons[i].checked = true;
		} else {
			nodebuttons[i].checked = false;
		}
	}
}

var handleClick = function(d, index){
	//alert("clicked!");
	select(this);
	update(d);
	console.log(this.x)
};

var hovershow = function(d) {
	
	txtNodeName.value = d.name;
	nodeProbability.value = d.probability;
	nodePayoff.value = d.payoff;
	nodeVariables.value = d.variables;
	var nodebuttons = document.getElementsByName('radNodeType');
	for (i = 0; i < nodebuttons.length; i++) {	
		if (nodebuttons[i].value == d.type) {
			nodebuttons[i].checked = true;
		} else {
			nodebuttons[i].checked = false;
		}
	}
}

var hoverhide = function() {
	// get selected node
	var snode = d3.select(".node.selected")[0][0].__data__
	txtNodeName.value = snode.name;
	nodeProbability.value = snode.probability;
	nodePayoff.value = snode.payoff;
	nodeVariables.value = snode.variables;
	var nodebuttons = document.getElementsByName('radNodeType');
	for (i = 0; i < nodebuttons.length; i++) {	
		if (nodebuttons[i].value == snode.type) {
			nodebuttons[i].checked = true;
		} else {
			nodebuttons[i].checked = false;
		}
	}
}

function selectall() {
	document.getElementById("jsontext").select();
}

function copyText() {
	document.getElementById("jsontext").select();
	try {
		var successful = document.execCommand('copy');
		var msg = successful ? 'successful' : 'unsuccessful';
		console.log('Copying text command was ' + msg);
	} catch (err) {
		console.log('Oops, unable to copy');
	}
}

function elbow(d, i) {
	return "M" + d.source.y + "," + d.source.x*multiplier
		+ "V" + d.target.x*multiplier + "H" + d.target.y;
}

function increaseOpacity() {
	if ( Math.round(opac*10) < 10 ) {
		opac += 0.1;
		document.getElementById("ttopac").innerHTML = Math.round(opac*100) + "%";
	}
}

function decreaseOpacity() {
	if (Math.round(opac*10) > 0 ) {
		opac -= 0.1;
		document.getElementById("ttopac").innerHTML = Math.round(opac*100) + "%";
	}
}

function increaseTTW() {
	if (ttw < 230) {
		ttw += 5;
		document.getElementById("ttwid").innerHTML = ttw;
	}
}

function decreaseTTW() {
	if (ttw > 130) {
		ttw -= 5;
		document.getElementById("ttwid").innerHTML = ttw;
	}
}

/*
 * Clone the bits of the d3 object we need to display the json string and leave off the stuff that makes it cyclic (i.e., parent)
 * First copy the root, then recursively copy all children
 * There's probably a better way to do this.
 */
function cloneForJSON(r) {
	var copyobj = {id: r["id"], name: r["name"], type: r["type"], probability: r["probability"], variables: r["variables"], payoff: r["payoff"]};
	
	if(r.children || r._children) {
		copyobj.children = [];
		var counter = 0;
		r.children.forEach(function (child) {
			cloneChildrenForJSON(copyobj.children,child, counter++);
		});
	}
	return copyobj;
}

/*
 * recursive function to clone the children, just the stuff we need for json string
 */ 
function cloneChildrenForJSON(copyobj, r, counter) {
	
	copyobj.push({id: r.id, name: r.name, type: r.type, probability: r.probability, variables: r.variables, payoff: r.payoff});
	if(r.children || r._children) {
		copyobj[counter].children = [];
		var childcounter = 0
		r.children.forEach(function (child) {
			cloneChildrenForJSON(copyobj[counter].children,child, childcounter++);
		});
	}
}

function showjson() {
	var modroot = cloneForJSON(root.children[0]); // clone the elements of root & its children that we need for json string
	var jsonstring = JSON.stringify(modroot);
	
	var htmltext = "";
	
	var copySupported = document.queryCommandSupported('copy');
	
	if(copySupported) {
		htmltext = "<button onclick=\"copyText()\">Copy</button><br/>";
	} else {
		htmltext = "<button onclick=\"selectall()\">Select All</button><br/>";
	}
	htmltext = htmltext + "<textarea id=\"jsontext\" rows=25 cols=55>"+jsonstring+"</textarea>";
	
	document.getElementById("jsonstring").innerHTML = htmltext;
}

/*
 * Download the tree as a JSON file with name tree.json (make filename editable?)
 */
function download() {
	
	var modroot = cloneForJSON(root.children[0]); // clone the elements of root & its children that we need for json string
	var jsonstring = JSON.stringify(modroot);
	
	var element = document.createElement('a');
	element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonstring));
	element.setAttribute('download', "tree.json");
	element.style.display = 'none';
	document.body.appendChild(element);
	
	element.click();
	document.body.removeChild(element);
}

function btnUpdateNodeName() {
	var selection = d3.select(".node.selected")[0][0];
	
	if(selection){
		var data = selection.__data__;
		var props = document.getElementById("nodeProbability").value;
		
		data.name = newname = document.getElementById("txtNodeName").value;
		
		if (props.length > 15) {
			data.probability_short = props.substring(0,16).replace(/\n/gi,";") + "...";
		} else {
			data.probability_short = props.replace(/\n/gi,";");
		}
		data.probability = props;
		data.payoff = document.getElementById("nodePayoff").value;
		var form = document.getElementById("rbtnNodeType");
		data.type = form.elements["radNodeType"].value;
		data.variables = document.getElementById("nodeVariables").value;
		update(0); // 0 because we're not adding any new levels, just updating.
	}
}

function nodeNameChange() {
	var selection = d3.select(".node.selected")[0][0];
	if(selection){
		var data = selection.__data__;
		data.name = newname = document.getElementById("txtNodeName").value;
		update(0); // 0 because we're not adding any new levels, just updating.
	}
}

/*
 * Read the user's chosen file - can read either text or json
 */
function readFile(e) {
	
	//document.getElementById('userJSONdiv').style.display='block';
	var fileInput = document.getElementById('fileInput');
	var fileDisplayArea = document.getElementById('userJSONdiv');
	var file = fileInput.files[0];
	var textType = /text.*/;
	var jsonType = 'application/json';
	var fileType = file.type;
	
	//In case of weird Windows problem where Chrome & FF can't tell a JSON file is a JSON file
	if(fileType == "") {
		var items = file.name.split(".");
		if(items[items.length-1] == "json") {
			fileType = "application/json";
		}
	}
	
	if (fileType.match(textType)) {
		
		var reader = new FileReader();
		
		reader.onload = function(e) {
			
			document.getElementById("userJSONtext").innerHTML = reader.result;
			load(2);// now load to tree
			document.getElementById('fileUploadChooser').style.display='none';
		}
		
		reader.readAsText(file);
	} else {
		
		if (fileType.match(jsonType)) {
		
			var reader = new FileReader();
		
			reader.onload = function(e) {
				
				document.getElementById("userJSONtext").innerHTML = reader.result;
				
				load(2);// now load to tree
				document.getElementById('fileUploadChooser').style.display='none';
			}
			
			reader.readAsText(file);
		} else {
			fileDisplayArea.innerText = "File not supported!";
			document.getElementById('jsontext').value = "File not supported!";
		}
	}
}

function makeImage() {
	var svg = document.querySelector( "svg" );
	var svgData = new XMLSerializer().serializeToString( svg );
alert(svgData);
	var canvas = document.createElement( "canvas" );
	
	var svgSize = svg.getBoundingClientRect();
	canvas.width = svgSize.width;
	canvas.height = svgSize.height;
	var ctx = canvas.getContext( "2d" );
	
	var img = document.createElement( "img" );
	img.setAttribute( "src", "data:image/svg+xml;base64," + btoa( svgData ) );
	
	img.onload = function() {
		ctx.drawImage( img, 0, 0 );
		
		var canvasdata = canvas.toDataURL("image/png");
		
		var pngimg = '<img src="'+canvasdata+'">'; 
		d3.select("#pngdataurl").html(pngimg);
		
		var a = document.createElement("a");
		a.download = "export_"+Date.now()+".png";
		a.href = canvasdata; 
		document.body.appendChild(a);
		a.click();
	};
}

/*
 * If tree has more than just a root node, trigger a pop-up to notify the user that if they continue
 * (to open an existing tree from file, or start a new blank tree), all current unsaved work will be lost.
 */
function areYouSure() {
	// see if the tree is blank
	if (numnodes > 2) {
		return confirm("Doing this will cause any unsaved work to be lost. Are you sure you want to continue?");
	} else {
		return true;
	}
}

/*
 * Add event listener to fileInput element
 */
window.onload = function() {
	
	var fileInput = document.getElementById('fileInput');
	fileInput.addEventListener('change', function(e) {
		readFile(e);
	});
}

window.onbeforeunload = function() {
	// see if the tree is blank
	if (numnodes > 2) {
		return confirm("Doing this will cause any unsaved work to be lost. Are you sure you want to continue?");
	}
}
