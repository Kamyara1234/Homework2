


const svg = d3.select("svg");

// Get the full width and height of the SVG container
// Ensure SVG takes up available space, might need CSS on html, body, svg { width: 100%; height: 100%; margin: 0; }
const svgWidth = document.documentElement.clientWidth; // More reliable for full viewport width
const svgHeight = document.documentElement.clientHeight; // More reliable for full viewport height

// --- Configuration for Layout ---
const margin = { top: 60, right: 30, bottom: 80, left: 100 }; // Main margins for Bar/Pie areas
const marginPCP = { top: 30, right: 10, bottom: 50, left: 10 }; // Specific margins for PCP axes/legend

// Define proportions for the three charts
const leftWidthRatio = 0.42; // Left column takes 42%
const rightWidthRatio = 0.48; // Right column takes 48% (leaves space for spacing)
const chartSpacingHorizontal = svgWidth * 0.08; // Horizontal space (8%)
const chartSpacingVertical = svgHeight * 0.05; // Vertical space (5%)

// --- Chart Dimensions ---

// Pie Chart (Top Left)
const pieChartWidth = svgWidth * leftWidthRatio - margin.left - margin.right;
const pieChartHeight = svgHeight * 0.45 - margin.top - margin.bottom; 
const pieChartRadius = Math.min(pieChartWidth, pieChartHeight) / 2;

// Parallel Coordinates Plot (Bottom Left)
const pcpWidth = svgWidth * leftWidthRatio - margin.left - margin.right; 

const pcpHeight = svgHeight * 0.40 - margin.top - marginPCP.bottom; 

// Bar Chart (Right Side)

const barChartStartX = margin.left + pieChartWidth + margin.right + chartSpacingHorizontal;
// Calculate available width for the bar chart's drawing area
const barChartWidth = svgWidth - barChartStartX - margin.right; 
const barChartHeight = svgHeight - margin.top - margin.bottom; 

// --- Create Group elements for charts ---
const pieG = svg.append("g")
    .attr("transform", `translate(${margin.left + pieChartWidth / 2}, ${margin.top + pieChartHeight / 2})`);

const pcpG = svg.append("g")
   
    .attr("transform", `translate(${margin.left}, ${margin.top + pieChartHeight + margin.bottom + chartSpacingVertical})`);

const barG = svg.append("g")
    // Use the calculated start X for the bar chart
    .attr("transform", `translate(${barChartStartX}, ${margin.top})`);



d3.csv("ds_salaries.csv").then(function(data) {

    // --- Data Preprocessing ---
    data.forEach(d => {
        d.salary_in_usd = +d.salary_in_usd;
        d.work_year = +d.work_year;
        d.remote_ratio = +d.remote_ratio;
    });

    const expLevelOrder = ['EN', 'MI', 'SE', 'EX'];
    const expLevelNames = { 'EN': 'Entry', 'MI': 'Mid', 'SE': 'Senior', 'EX': 'Executive'};
    const sizeNames = { 'S': 'Small', 'M': 'Medium', 'L': 'Large'};

    // Color scale for experience level (used in PCP and Bar Chart)
    const expColor = d3.scaleOrdinal()
        .domain(expLevelOrder)
        .range(d3.schemeCategory10); 


    const sizeCounts = d3.nest()
        .key(d => d.company_size)
        .rollup(v => v.length)
        .entries(data);

    const pieColor = d3.scaleOrdinal()
        .domain(sizeCounts.map(d => d.key).sort((a,b) => ['S','M','L'].indexOf(a) - ['S','M','L'].indexOf(b))) // Sort domain S,M,L
        .range(['#1f77b4', '#2ca02c', '#ff7f0e']); 

    const pie = d3.pie()
        .value(d => d.value)
        .sort(null); 

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(pieChartRadius);

    const arcs = pieG.selectAll(".arc")
        .data(pie(sizeCounts))
        .enter()
        .append("g")
        .attr("class", "arc");

    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => pieColor(d.data.key))
        .attr("stroke", "white")
        .style("stroke-width", "2px");


    svg.append("text")
        .attr("x", margin.left + pieChartWidth / 2) 
        .attr("y", margin.top / 2 + 10) 
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Company Size Distribution");

    // Pie Chart Legend
    const legendRectSizePie = 15;
    const legendSpacingPie = 4;
    const legendPie = svg.selectAll('.legend-pie')
        .data(pieColor.domain()) 
        .enter()
        .append('g')
        .attr('class', 'legend-pie')
 
        .attr('transform', (d, i) => `translate(${margin.left + pieChartWidth + 20}, ${margin.top + i * (legendRectSizePie + legendSpacingPie)})`);

    legendPie.append('rect')
        .attr('width', legendRectSizePie)
        .attr('height', legendRectSizePie)
        .style('fill', pieColor)
        .style('stroke', pieColor);

    legendPie.append('text')
        .attr('x', legendRectSizePie + legendSpacingPie)
        .attr('y', legendRectSizePie - legendSpacingPie + 2) 
        .style('font-size', '12px')
        .text(d => sizeNames[d] || d);


    // --- 2. Bar Chart: Average Salary by Experience Level (Focus - Right) ---

    const avgSalaryByExp = d3.nest()
        .key(d => d.experience_level)
        .rollup(v => d3.mean(v, d => d.salary_in_usd))
        .entries(data);

    avgSalaryByExp.sort((a, b) => expLevelOrder.indexOf(a.key) - expLevelOrder.indexOf(b.key));

    const xBar = d3.scaleBand()
        .domain(avgSalaryByExp.map(d => d.key))
        .range([0, barChartWidth]) 
        .padding(0.2);

    const yBar = d3.scaleLinear()
        .domain([0, d3.max(avgSalaryByExp, d => d.value)])
        .nice()
        .range([barChartHeight, 0]);

    // X Axis - Bar
    barG.append("g")
        .attr("class", "x-axis bar-axis") 
        .attr("transform", `translate(0, ${barChartHeight})`)
        .call(d3.axisBottom(xBar).tickFormat(d => expLevelNames[d] || d))
        .selectAll("text")
          .attr("transform", "translate(-10,5)rotate(-30)")
          .style("text-anchor", "end");

    // Y Axis - Bar
  
    barG.append("g")
        .attr("class", "y-axis bar-axis")
        .call(d3.axisLeft(yBar).ticks(10, "$,.0f")); 

    // X Axis Label - Bar
    barG.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", barChartWidth / 2)
        .attr("y", barChartHeight + margin.bottom - 25) 
        .text("Experience Level");

    // Y Axis Label - Bar
    barG.append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 60) 
        .attr("x", -barChartHeight / 2)
        .text("Average Salary (USD)");

    // Bars
    barG.selectAll(".bar")
        .data(avgSalaryByExp)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xBar(d.key))
        .attr("y", d => yBar(d.value))
        .attr("width", xBar.bandwidth())
        .attr("height", d => barChartHeight - yBar(d.value))
        .attr("fill", d => expColor(d.key)); 

    // Bar Chart Title
    barG.append("text")
        .attr("class", "chart-title")
        .attr("x", barChartWidth / 2)
        .attr("y", -margin.top / 2 + 10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Average Salary by Experience Level");




    const dimensions = ["work_year", "salary_in_usd", "remote_ratio"];
    const dimensionNames = {
        "work_year": "Year",
        "salary_in_usd": "Salary (USD)",
        "remote_ratio": "Remote Ratio (%)"
    };


    const yPCP = {};
    dimensions.forEach(dim => {
        let domainExtent = d3.extent(data, d => d[dim]);
       
        if (dim === "salary_in_usd") {
            const padding = (domainExtent[1] - domainExtent[0]) * 0.05;
           
             const minVal = domainExtent[0] <= 0 ? domainExtent[0] : domainExtent[0] - padding;
             const maxVal = domainExtent[1] + padding;
             domainExtent = [minVal < 0 ? 0 : minVal, maxVal]; 
        }
        yPCP[dim] = d3.scaleLinear()
            .domain(domainExtent)
            .range([pcpHeight, 0]) 
            .nice(); 
    });


    yPCP["remote_ratio"].domain([0, 100]);


    const yearExtent = d3.extent(data, d => d.work_year);

    yPCP["work_year"].domain(yearExtent[0] === yearExtent[1] ? [yearExtent[0] - 0.5, yearExtent[1] + 0.5] : yearExtent).nice(data.length > 1 ? 4 : 1);


    // Create x scale to position the axes
    const xPCP = d3.scalePoint()
        .range([0, pcpWidth])
        .padding(1) 
        .domain(dimensions);

    // Function to draw the lines
    function path(d) {
        // Filter out points where data might be missing for a dimension
        const points = dimensions.map(p => {
            const val = d[p];
            // Check if value is valid for the scale domain
            if (val !== undefined && val !== null && val >= yPCP[p].domain()[0] && val <= yPCP[p].domain()[1]) {
                 return [xPCP(p), yPCP[p](val)];
            }
            return null; 
        }).filter(p => p !== null);
        return d3.line()(points);
    }

    // Draw the lines
    pcpG.selectAll(".pcp-line")
        .data(data)
        .enter()
        .append("path")
        .attr("class", "pcp-line")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", d => expColor(d.experience_level)) 
        .style("stroke-width", "1.5px")
        .style("opacity", 0.3); 

    // Draw the axes
    const axisG = pcpG.selectAll(".dimension")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "dimension pcp-axis") 
        .attr("transform", d => `translate(${xPCP(d)}, 0)`); 

    // Add axis lines and ticks
    axisG.append("g")
        .each(function(d) {
            // Format ticks nicely
            let axisFormat = null;
            if (d === 'salary_in_usd') axisFormat = "$,.2s"; 
            if (d === 'work_year') axisFormat = "d"; 
            d3.select(this).call(d3.axisLeft(yPCP[d]).ticks(5).tickFormat(d3.format(axisFormat)));
        })
        // Add axis titles
        .append("text")
          .attr("class", "pcp-axis-title")
          .style("text-anchor", "middle")
          .attr("y", -12) 
          .text(d => dimensionNames[d])
          .style("fill", "black")
          .style("font-size", "11px");

    // PCP Title
    pcpG.append("text")
        .attr("class", "chart-title")
        .attr("x", pcpWidth / 2)
        .attr("y", -margin.top / 2 + 5 ) 
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Salary vs Year vs Remote Work (by Experience)");

    // --- Add Explanatory Text for PCP Colors ---

    const pcpLegendYStart = pcpHeight + marginPCP.bottom - 25; 
    const pcpLegendXStart = 0; 

    pcpG.append("text")
       .attr("x", pcpLegendXStart) 
       .attr("y", pcpLegendYStart - 10) 
       .attr("text-anchor", "start") 
       .style("font-size", "11px")
       .style("font-style", "italic")
       .text("Line colors indicate Experience Level:");

    // --- PCP Legend (Positioned Below PCP within pcpG) ---
    const legendRectSizePCP = 15;
    const legendSpacingPCP = 4;
    const legendItemWidth = 85;

    const legendPCP = pcpG.selectAll('.legend-pcp') 
        .data(expColor.domain())
        .enter()
        .append('g')
        .attr('class', 'legend-pcp')
     
        .attr('transform', (d, i) => `translate(${pcpLegendXStart + i * legendItemWidth}, ${pcpLegendYStart})`);

    legendPCP.append('rect')
        .attr('width', legendRectSizePCP)
        .attr('height', legendRectSizePCP)
        .style('fill', expColor)
        .style('stroke', expColor);

    legendPCP.append('text')
        .attr('x', legendRectSizePCP + legendSpacingPCP)
        .attr('y', legendRectSizePCP / 2 + 4) 
        .style('font-size', '12px')
        .text(d => expLevelNames[d] || d); // Display full names


}).catch(function(error) {
    // Handle errors if the CSV file fails to load
    console.error("Error loading or processing data:", error);
});