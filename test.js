const refresh = () => {
	const results = run();
	$(".tbl-content table tbody").empty();

	results.forEach((result) => {
		addRow(result);
	});

	var trace1 = {
		x: unpack(results, 'x'),
		y: unpack(results, 'fx'),
		type: 'scatter',
		name: 'f(x)'
	};

	var layout = {
		//title: 'f(x) = 2x^2 + 1',
		showlegend: false,
		xaxis: {
			title: 'x'
		},
		yaxis: {
			title: 'f (x)'
		},
	};

	const config = {
		displayModeBar: false
	};

	var data = [trace1];
	Plotly.newPlot('graph', data, layout, config);
};

const run = () => {
	  const start = $("#start").val();
	  console.assert(start, "start is not defined");
	  const end = $("#end").val();
	  console.assert(end, "end is not defined");
	  const step = $("#step").val();
	  console.assert(step, "step is not defined");
	  console.table({start, end, step});
	  const results = calc(+start, +end, +step);
	  console.table(results);
	  return results;
};

const calc = (start, end, step=1) => {
	  console.assert(start, "start is not defined");
	  console.assert(end, "end is not defined");
	  console.assert(step, "step is not defined");
	  const results = [];
	  const funcText = $("#function").val();
	  console.log(funcText);
	  const func = `(function (x) { return ${funcText}; })`;
	  console.log(func);
	  console.table( { start: start, end: end, step: step });
	  for (let x = +start; x <= +end; x+=step) {
		const fx = eval(`${func}(${x})`);
		console.table({ x, fx });
		const result = {
			x: x,
			fx: fx
		};
		results.push(result);
	  }
	  return results;
};

const unpack = (rows, key) => {
	return rows.map(function(row) { return row[key]; });
};

const addRow = (data) => {
	if (!data)
	{
		data = {
			x: 0,
			fx: 0
		};
	}
	$(".tbl-content table tbody").append($("<tr>").append($("<td>").text(data.x)).append($("<td>").text(data.fx)));
};

const start = () => {
	console.log('start');
	$("#start").on("keyup", refresh);
	$("#start").on("change", refresh);
	$("#end").on("keyup", refresh);
	$("#end").on("change", refresh);
	$("#btn-run").click(refresh);
	$(".tbl-content table tbody").empty();
	addRow();
	refresh();
};

$(start);