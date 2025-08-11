const refresh = () => {
	const results = run();
	$(".tbl-content table tbody").empty();
	results.forEach((result) => addRow(result));
	if (window.appGraph) {
		window.appGraph.setData(results);
	}
};

const run = () => {
	const start = parseFloat($("#start").val());
	console.assert(!Number.isNaN(start), "start is not defined");
	const end = parseFloat($("#end").val());
	console.assert(!Number.isNaN(end), "end is not defined");
	const step = parseFloat($("#step").val());
	console.assert(!Number.isNaN(step), "step is not defined");
	console.table({start, end, step});
	const results = calc(start, end, step);
	console.table(results);
	return results;
};

// Build a safe-ish evaluator that supports a set of math functions and constants.
// Supported:
// - Operators: + - * / ^ (power), parentheses
// - Functions: sin, cos, tan, asin, acos, atan, sinh, cosh, tanh,
//              exp, ln (natural log), log10, sqrt, abs, min, max, pow
// - Constants: pi, e
// - Variable: x
// Parsing strategy: shunting-yard to RPN, then evaluate with a whitelist of ops.

const Evaluator = (() => {
	const ops = {
		'+': { prec: 2, assoc: 'L', fn: (a,b)=>a+b },
		'-': { prec: 2, assoc: 'L', fn: (a,b)=>a-b },
		'*': { prec: 3, assoc: 'L', fn: (a,b)=>a*b },
		'/': { prec: 3, assoc: 'L', fn: (a,b)=>a/b },
		'^': { prec: 4, assoc: 'R', fn: (a,b)=>Math.pow(a,b) },
	};
		const funcs = {
		sin: Math.sin, cos: Math.cos, tan: Math.tan,
		asin: Math.asin, acos: Math.acos, atan: Math.atan,
		sinh: Math.sinh ?? ((x)=> (Math.exp(x)-Math.exp(-x))/2),
		cosh: Math.cosh ?? ((x)=> (Math.exp(x)+Math.exp(-x))/2),
		tanh: Math.tanh ?? ((x)=> {
			const ex = Math.exp(x), enx = Math.exp(-x); return (ex-enx)/(ex+enx);
		}),
		exp: Math.exp,
		ln: Math.log,
		log10: Math.log10 ?? ((x)=> Math.log(x)/Math.LN10),
		sqrt: Math.sqrt,
		abs: Math.abs,
		pow: Math.pow,
	};
	const consts = {
		pi: Math.PI,
		e: Math.E,
	};

	function tokenize(s) {
		const tokens = [];
		const re = /\s*([A-Za-z_][A-Za-z0-9_]*|\d*\.\d+|\d+|\^|\+|\-|\*|\/|\(|\)|,)/gy;
		let m; let idx = 0;
		while ((m = re.exec(s)) !== null) {
			tokens.push(m[1]);
			idx = re.lastIndex;
		}
		if (idx !== s.length) throw new Error('Invalid token at position ' + idx);
		return tokens;
	}

	function toRPN(tokens) {
		const out = [];
		const stack = [];
		let prev = null;
		for (let i=0;i<tokens.length;i++) {
			let t = tokens[i];
			if (/^\d/.test(t)) { // number
				out.push(parseFloat(t));
			} else if (/^[A-Za-z_]/.test(t)) { // name: func or variable/const
				// lookahead for '(' => function
				if (tokens[i+1] === '(') {
					stack.push(t); // function name
				} else {
					out.push({ var: t });
				}
			} else if (t === ',') {
				// pop until left paren
				while (stack.length && stack[stack.length-1] !== '(') out.push(stack.pop());
				if (!stack.length) throw new Error('Misplaced comma or parentheses');
			} else if (t in ops) {
				// unary minus handling: convert to (0 - x)
				if (t === '-' && (prev == null || (prev in ops) || prev === '(' || prev === ',')) {
					out.push(0);
				}
				while (stack.length) {
					const top = stack[stack.length-1];
					if (!(top in ops)) break;
					const o1 = ops[t], o2 = ops[top];
					if ((o1.assoc === 'L' && o1.prec <= o2.prec) || (o1.assoc === 'R' && o1.prec < o2.prec)) {
						out.push(stack.pop());
					} else break;
				}
				stack.push(t);
			} else if (t === '(') {
				stack.push(t);
			} else if (t === ')') {
				while (stack.length && stack[stack.length-1] !== '(') out.push(stack.pop());
				if (!stack.length) throw new Error('Mismatched parentheses');
				stack.pop(); // pop '('
				// function call
				if (stack.length && /^[A-Za-z_]/.test(stack[stack.length-1])) out.push(stack.pop());
			} else {
				throw new Error('Unexpected token: ' + t);
			}
			prev = t;
		}
		while (stack.length) {
			const t = stack.pop();
			if (t === '(' || t === ')') throw new Error('Mismatched parentheses');
			out.push(t);
		}
		return out;
	}

	function compile(expr) {
		const tokens = tokenize(expr);
		const rpn = toRPN(tokens);
		return function(scope) {
			const st = [];
			for (const t of rpn) {
					if (typeof t === 'number') {
						st.push(t);
					} else if (t in ops) {
					const b = st.pop(); const a = st.pop();
					if (a == null || b == null) throw new Error('Insufficient values');
					st.push(ops[t].fn(a,b));
					} else if (typeof t === 'string') {
					// function
					const fn = funcs[t];
					if (!fn) throw new Error('Unknown function: ' + t);
						let args;
						if (t === 'pow') {
						const b = st.pop(); const a = st.pop();
						if (a == null || b == null) throw new Error('Insufficient values for pow');
						args = [a,b];
					} else {
						const a = st.pop();
						if (a == null) throw new Error('Insufficient values for ' + t);
						args = [a];
					}
					st.push(fn(...args));
				} else if (typeof t === 'object' && t.var) {
					if (t.var === 'x') {
						st.push(scope.x);
					} else if (t.var in consts) {
						st.push(consts[t.var]);
					} else {
						throw new Error('Unknown symbol: ' + t.var);
					}
				} else {
					throw new Error('Bad RPN token');
				}
			}
			if (st.length !== 1) throw new Error('Too many values after evaluation');
			return st[0];
		};
	}

	return { compile };
})();

const calc = (start, end, step=1) => {
	  console.assert(start, "start is not defined");
	  console.assert(end, "end is not defined");
	  console.assert(step, "step is not defined");
		const results = [];
		if (!isFinite(step) || step === 0) {
			console.warn('Invalid step; returning empty results');
			return results;
		}
		// Ensure step moves toward end
		const dir = end >= start ? 1 : -1;
		step = Math.abs(step) * dir;
		const funcText = $("#function").val();
		const $err = $("#formula-error");
		if ($err.length) $err.text("");
		let compiled = null;
			try {
				const normalized = funcText; // '^' handled by our parser as power
				compiled = Evaluator.compile(normalized);
		} catch (e) {
			console.error('Parse error', e);
			if ($err.length) $err.text(e.message);
			return results;
		}
	  console.table( { start: start, end: end, step: step });
				const cmp = dir > 0 ? ((a,b)=>a<=b+1e-12) : ((a,b)=>a>=b-1e-12);
				for (let x = +start; cmp(x, +end); x+=step) {
					let fx = NaN;
					try {
						fx = compiled({ x });
					} catch (err) {
						console.error('Evaluation error for x=', x, err);
						if ($err.length && !$err.text()) $err.text(err.message);
					}
		console.table({ x, fx });
		const result = {
			x: x,
			fx: fx
		};
		results.push(result);
	  }
	  return results;
};

// unpack no longer needed

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
	if (window.appGraph) {
		window.appGraph.init('graph');
	}
	$("#start").on("keyup", refresh);
	$("#start").on("change", refresh);
	$("#end").on("keyup", refresh);
	$("#end").on("change", refresh);
	$("#example-select").on("change", function() {
		const sel = this;
		const opt = sel && sel.selectedOptions && sel.selectedOptions[0];
		if (!opt || !opt.value) return;
		const formula = opt.value;
		$("#function").val(formula);
		const ds = opt.dataset || {};
		if (ds.start !== undefined) $("#start").val(ds.start);
		if (ds.end !== undefined) $("#end").val(ds.end);
		if (ds.step !== undefined) $("#step").val(ds.step);
		refresh();
	});
	$("#function").on("keyup", refresh);
	$("#function").on("change", refresh);
	$("#btn-run").click(refresh);
	$(".tbl-content table tbody").empty();
	addRow();
	refresh();
	// Resize handling
	window.addEventListener('resize', () => window.appGraph && window.appGraph.resize());
};

$(start);