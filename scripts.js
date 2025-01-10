let familyTree = [];

function importFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const hierarchyText = event.target.result;
        document.getElementById('hierarchy').value = hierarchyText;
        document.getElementById('tree-form').dispatchEvent(new Event('submit'));
    };
    reader.readAsText(file);
}

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'text/plain';
fileInput.addEventListener('change', importFromFile);

document.addEventListener('DOMContentLoaded', function() {
    const treeForm = document.getElementById('tree-form');
    const graphContainer = document.getElementById('graph-container');

    treeForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const hierarchyText = document.getElementById('hierarchy').value;
        const lines = hierarchyText.split('\n');
        familyTree = parseHierarchy(lines);
        renderGraph();
    });

    function parseHierarchy(lines) {
        const stack = [];
        const nodes = {};
        let rootNode = null;

        lines.forEach(line => {
            const level = line.match(/[-=]/g)?.length || 0;
            const type = line.includes('=') ? 'spouse' : 'child';
            const name = line.replace(/[-=]/g, '').trim();
            const node = { name, type, parent: null, children: [], spouse: null };

            if (level === 0) {
                rootNode = node;
            } else {
                let parent = stack[level - 1];
                if (type === 'spouse') {
                    parent.spouse = node;
                } else {
                    parent.children.push(node);
                }
                node.parent = parent.name;
            }

            stack[level] = node;
            nodes[name] = node;
        });

        return Object.values(nodes);
    }

    function renderGraph() {
        graphContainer.innerHTML = '';
        const svg = d3.select("#graph-container").append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .call(d3.zoom().on("zoom", zoomed));

        function zoomed() {
            svg.selectAll("g")
                .attr("transform", d3.event.transform);
                currentScale = d3.event.transform.k;
        }
    

        const width = graphContainer.clientWidth;
        const height = graphContainer.clientHeight;

        const simulation = d3.forceSimulation(familyTree)
            .force("charge", d3.forceManyBody().strength(-200))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("link", d3.forceLink().id(d => d.name).distance(100));

        const links = getLinks(familyTree);

        const link = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("pointer-events", "none")
            .attr("stroke-width", 2)
            .attr("stroke", "#000");

        const node = svg.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(familyTree)
            .enter().append("circle")
            .attr("r", 20)
            .attr("fill", d => d.type === 'spouse' ? "#FF69B4" : "#4c68af")
            .call(d3.drag()
                .on("start", dragStarted)
                .on("drag", dragged)
                .on("end", dragEnded));

        const text = svg.append("g")
            .attr("class", "text")
            .selectAll("text")
            .data(familyTree)
            .enter().append("text")
            .attr("pointer-events", "none")
            .attr("dy", 4)
            .attr("text-anchor", "middle")
            .text(d => d.name);

        const heart = svg.append("g")
            .attr("class", "hearts")
            .selectAll("text")
            .data(familyTree.filter(d => d.spouse))
            .enter().append("text")
            .attr("dy", 4)
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .text("❤️");

        simulation
            .nodes(familyTree)
            .on("tick", ticked);

        simulation.force("link")
            .links(links);

        function ticked() {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            text
                .attr("x", d => d.x)
                .attr("y", d => d.y);

            heart
                .attr("x", d => (d.x + d.spouse.x) / 2)
                .attr("y", d => (d.y + d.spouse.y) / 2);
        }

        function dragStarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragEnded(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = d.x;
            d.fy = d.y;
        }

        function getLinks(nodes) {
            let links = [];
            nodes.forEach(member => {
                if (member.parent) {
                    links.push({ source: member.name, target: member.parent });
                }
                if (member.children) {
                    member.children.forEach(child => {
                        links.push({ source: member.name, target: child.name });
                    });
                }
                if (member.spouse) {
                    links.push({ source: member.name, target: member.spouse.name });
                    member.children.forEach(child => {
                        links.push({ source: member.spouse.name, target: child.name });
                    });
                }
            });
            return links;
        }
    }
});