/****************************************************************************************** 
*                                                                                         *
* Based on example at: https://bl.ocks.org/kerryrodden/766f8f6d31f645c39f488a0befa1e3c8   *
* License: Apache 2 License
*                                                                                         *
*******************************************************************************************/

// Dimensions of sunburst.
var width = 600;
var height = 600;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 390, h: 30, s: 3, t: 10
};

// Mapping of step names to colors.
var colors = {
  "Aboriginal Affairs": "#e54e5b", 
  "Court Services Victoria":"#7b615c", 
  "Economic Development, Jobs, Transport and Resources": "#d156a7",
  "Education and Training": "#fbd052",
  "Environment, Land, Water and Planning": "#6ab975",
  "Family Violence": "#5687d1",
  "Health and Human Services": "#fe8c59", 
  "Homes for Victorians": "#7b615c",
  "Ice Action Plan %E2%80%93 Stage 3": "#ff99cc",
  "Justice and Regulation": "#a173d1",
  "Parliament": "#fc0000",  
  "Premier and Cabinet": "#000000", 
  "Treasury and Finance": "#ff783b",
  "Whole of Government": "#bbbbbb"  
}; 

/* Hold: 2ab6b9 teal
purple: a173d1
reddish: e54e5b
*/



// Total size of all segments; we set this later, after loading the data.
var totalSize = 0; 

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + radius + "," + radius + ")");

var partition = d3.partition()
    .size([2 * Math.PI, radius * radius]);

var arc = d3.arc()
    .startAngle(function(d) { return d.x0; })
    .endAngle(function(d) { return d.x1; })
    .innerRadius(function(d) { return Math.sqrt(d.y0); })
    .outerRadius(function(d) { return Math.sqrt(d.y1); });

// Use d3.text and d3.csvParseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.
d3.text("./data/output.csv", function(text) {
  var csv = d3.csvParseRows(text);
  var json = buildHierarchy(csv);
  createVisualization(json);
});

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

  // Basic setup of page elements.
  initializeBreadcrumbTrail();
  drawLegend();
  d3.select("#togglelegend").on("click", toggleLegend);

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle")
      .attr("r", radius)
      .style("opacity", 0);

  // Turn the data into a d3 hierarchy and calculate the sums.
  var root = d3.hierarchy(json)
      .sum(function(d) { return d.size; })
      .sort(function(a, b) { return b.value - a.value; });
  
  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition(root).descendants()
      .filter(function(d) {
          return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
      });

  var path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter().append("svg:path")
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", function(d) { return chooseColor(d); })
      .style("opacity", 1)
      .on("mouseover", mouseover);

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.datum().value;
 };

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }

  d3.select("#percentage")
      .text(percentageString);
	  
  d3.select("#amount")
      .text("$" + eval(d.value*1000000).toLocaleString()); // convert to millions
	   
  d3.select("#explanation")
      .style("visibility", "");

  var sequenceArray = d.ancestors().reverse();
  sequenceArray.shift(); // remove root node from the array
  updateBreadcrumbs(sequenceArray, percentageString);

  // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

  // Hide the breadcrumb trail
  d3.select("#trail")
      .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .on("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });

  d3.select("#explanation")
      .style("visibility", "hidden");
}

function initializeBreadcrumbTrail() {
  // Add the svg area.
  var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", 800)
      .attr("height", 60)
      .attr("id", "trail");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  if ( i == 2 ) { // at 3rd level, make the breadcrumb polygon twice the width (for more detailed description text)
    points.push(b.w * 2 + b.s + ",0");
    points.push(b.w * 2 + b.t + b.s + "," + (b.h / 2));
    points.push(b.w * 2 + b.s + "," + b.h);
  } else {
    points.push(b.w + ",0");
    points.push(b.w + b.t + "," + (b.h / 2));
    points.push(b.w + "," + b.h);
   }
  points.push("0," + b.h);
  if ( i > 0 ) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

  // Data join; key function combines name and depth (= position in sequence).
  var trail = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) { return d.data.name + d.depth; });

  // Remove exiting nodes.
  trail.exit().remove();

  // Add breadcrumb and label for entering nodes.
  var entering = trail.enter().append("svg:g");

  entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { return chooseColor(d); });

  entering.append("svg:text")
	  .attr("x", function(d, i) { breadcrumbWidth = (i == 2)?b.w + b.t:(b.w + b.t) / 2; return breadcrumbWidth; })
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return decodeURIComponent(d.data.name); });

  // Merge enter and update selections; set position for all nodes.
  entering.merge(trail).attr("transform", function(d, i) {
    return "translate(" + ( i%2) * (b.w + b.s) + "," + ( Math.floor( i / 2 ) * ( b.h + b.s ) )  + ")";
  });
 
  // Make the breadcrumb trail visible, if it's hidden.
  d3.select("#trail")
      .style("visibility", "");
}

function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rectangle
  var li = {
    w: 12, h: 12, s: 6, r: 0
  };

  var legend = d3.select("#legend").append("svg:svg")
      .attr("width", li.w * 30)
      .attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
      .data(d3.entries(colors))
      .enter().append("svg:g")
      .attr("transform", function(d, i) {
              return "translate(0," + i * (li.h + li.s) + ")";
           });

  g.append("svg:rect")
      .attr("rx", li.r)
      .attr("ry", li.r)
      .attr("width", li.w)
      .attr("height", li.h)
      .style("fill", function(d) { return d.value; });

  g.append("svg:text")
      .attr("x", li.w + li.s )
      .attr("y", li.h / 2 )
      .attr("dy", "0.35em")
      .attr("text-anchor", "left")
      .text(function(d) { return decodeURIComponent(d.key); });
}

function toggleLegend() {
  var legend = d3.select("#legend");
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "");
  } else {
    legend.style("visibility", "hidden");
  }
}

// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how 
// often that sequence occurred.
function buildHierarchy(csv) {
  var root = {"name": "root", "children": []};
  for (var i = 0; i < csv.length; i++) {
    var sequence = csv[i][0];
    var size = +csv[i][1];
    if (isNaN(size)) { // e.g. if this is a header row
      continue;
    }
    var parts = sequence.split("-");
    var currentNode = root;
    for (var j = 0; j < parts.length; j++) {
      var children = currentNode["children"];
      var nodeName = parts[j];
      var childNode;
      if (j + 1 < parts.length) {
   // Not yet at the end of the sequence; move down the tree.
 	var foundChild = false;
 	for (var k = 0; k < children.length; k++) {
 	  if (children[k]["name"] == nodeName) {
 	    childNode = children[k];
 	    foundChild = true;
 	    break;
 	  }
 	}
  // If we don't already have a child node for this branch, create it.
 	if (!foundChild) {
 	  childNode = {"name": nodeName, "children": []};
 	  children.push(childNode);
 	}
 	currentNode = childNode;
      } else {
 	// Reached the end of the sequence; create a leaf node.
 	childNode = {"name": nodeName, "size": size};
 	children.push(childNode);
      }
    }
  }
  return root;
};

// Choose a color for the node that is related to the parent node
function chooseColor(d) { 
	if (d.depth > 1) { // for child nodes, take a darker color of the parent node
		if (d.depth > 2) { 
			baseColor = colors[d.parent.parent.data.name];
		} else {	
			baseColor = colors[d.parent.data.name];
		}	
		baseColor = baseColor.substr(1,8);
		adjacentColor = darkenColor(baseColor, d.depth, 20);
		adjacentColor = ("#" + adjacentColor);
		return adjacentColor;
	} else {
		return colors[d.data.name]; // for nodes just hanging off the root node, take one of the colors in the color array, if it's not present it will return 0, effectively black
	}	
}

// Choose a darker color that is appropriate for the current node depth (children are darker than parents)
function darkenColor(color, nodeDepth, amt) {
    var num = parseInt(color,16);
	var darkness = nodeDepth * amt;
    var r = (num >> 16) - darkness;
    var b = ((num >> 8) & 0x00FF) - darkness;
    var g = (num & 0x0000FF) - darkness;
    var newColor = g | (b << 8) | (r << 16);
    return newColor.toString(16);
}
