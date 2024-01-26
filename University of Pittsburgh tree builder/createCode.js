/*
 * Choose which type of R code to generate based on root's type
 * i.e., Decision vs Markov
 */
function createRcode() {
	var rcode = "";
	var htmltext = "<textarea id=\"rcodetext\" rows=6 style=\"width:98%; padding:1%;\">";
	var myroot = root.children[0]; // get the real tree root
	if (myroot.type == "decision") {
		rcode = createDecisionTreeRcode(myroot);
		
	} else {
		rcode = createMarkovTreeRcode(myroot);
	}
	rcode.forEach(function (rstr) {
			htmltext += rstr + "\n";
	});
	htmltext += "</textarea>";
	document.getElementById("rcodestring").innerHTML = htmltext;
}


function createDecisionTreeRcode(myroot) {

	var rcode = new Array();
	
	// iterate through the tree to extract all the probabilities
	myroot.children.forEach(function (kid) { 
		var probabilities = ""
		var payoffs = "";
		var curstring = "";
		var probs = appendAllChildProbabilities(kid, curstring);
		
		//alert("probs..." + probs);
		probs.myprobs.forEach(function (pstr) {
			probabilities += ", " + pstr;
		});
		probabilities = "c(" + probabilities.substring(2) + ")";
		
		probs.myutils.forEach(function (ustr) {
			payoffs += ", " + ustr;
		});
		payoffs = "c(" + payoffs.substring(2) + ")";
		
		rcode.push(probabilities + " %*% " + payoffs);
	}); 
	
	return rcode;
	
}



function createMarkovTreeRcode(myroot) {
	
	
	
	var rcode = new Array();
	
	var initialProbs = new Array();
	var initialStates = new Array();
	var allProbs = new Array();
	var stateIndex = {};
	var transProbs = {};
	var curstring = "";
	var rows = 0;
	var cols = 0;
	
	var counter = 0;
	// first set all possible states
	myroot.children.forEach(function (kid) { 
		initialStates.push(kid.name);
		initialProbs.push(kid.probability);
		transProbs[kid.name] = new Array();
		stateIndex[kid.name] = counter;
		counter++;
	});
	
	rows = initialStates.length;
	
	initialStates.forEach(function (state) {
		for (var j = 0; j < rows; j++) {
			transProbs[state][j] = "";
		}
	});
	
	// iterate through the tree to extract all the probabilities
	myroot.children.forEach(function (kid) { 
		
		var probabilities = new Array()
		
		var probs = appendAllChildProbabilities(kid, curstring);
		counter = 0;
		probs.myutils.forEach(function (ustr) {
			transProbs[kid.name][stateIndex[ustr]] += " + " + probs.myprobs[counter];
			counter++;
		});

	}); 
	var initProbs = "";
	initialProbs.forEach (function (prob) {
		initProbs += ", " + prob;
	});
	initProbs = "initialProbs <- \"c(" + initProbs.substring(2) + ")\"\n";
	
	var tp = "";
	for (var i = 0; i < rows; i++) {
		for (var j = 0; j < rows; j++) {
			var thisProb = transProbs[initialStates[j]][i];
			if (thisProb == "") {
				thisProb = "0";
			} else {
				thisProb = thisProb.substring(3);
			}
			tp += ", " + thisProb;
		}
	}
	tp = "transProbs <- \"matrix(c(" + tp.substring(2) + "),nrow=" + rows + ", ncol=" + rows + ")\"\n";
	
	
	var markovTraceFunction = "markovTrace <- function(initialProbs, transProbs) {\n"
			+ "	nStates <- " + rows + "\n"
			+ "	markovTrace <- matrix(0, nCycle+1, nStates)\n"
			+ "	markovTrace[1,] <- eval(parse(text = initialProbs))\n"
			+ "	for (cycle in 2:(nCycle+1)){\n"
			+ "		markovTrace[cycle,] <- markovTrace[cycle-1,] %*% eval(parse(text = transProbs))\n"
			+ "	}\n"
			+ "	return(markovTrace)\n"
		+ "}\n";
		
	rcode.push(markovTraceFunction + initProbs + tp)
	return rcode;
	
}




var appendAllChildProbabilities = function(node, curstring) {

	var myprobs = new Array();
	var myutils = new Array();
	
	if(node.children) {
		node.children.forEach(function (kid) {
			
			var kidstring = curstring + ", " + kid.probability;
			var kidobj = appendAllChildProbabilities(kid,kidstring);
			
			kidobj.myprobs.forEach(function (kstr) {
				myprobs.push(kstr);
			});
			myutils = myutils.concat(kidobj.myutils);
		});
	} else {
		curstring = "prod(c(" + curstring.substring(2) + "))";
		myprobs.push(curstring);
		myutils.push(node.payoff);
	}
	
	return {myprobs:myprobs,myutils:myutils};
}
