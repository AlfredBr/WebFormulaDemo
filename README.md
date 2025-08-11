# WebFormulaDemo
A toy app to play with y = f(x) with my son...

![image](https://raw.githubusercontent.com/AlfredBr/WebFormulaDemo/main/WebFormulaDemo.png)

---

## Features Vibe Coded with GPT-5

- GPU-accelerated function plotting with Three.js (orthographic 2D)
- Safe expression evaluator: +, -, *, /, ^, parentheses; functions sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, exp, ln, log10, sqrt, abs, pow; constants pi, e
- Live editing: instant updates to graph, hover readout, and results table
- 10 curated example formulas (auto-fills formula and domain/step)
- Clear axes with origin crosshair; grid aligned to sampling step
- Responsive layout and resize-aware rendering
- Light "lab instrument" UI using local Bootstrap

## Technologies Used

- HTML/CSS (Bootstrap 5, local) for layout and styling
- JavaScript (vanilla + jQuery) for interactivity
- Three.js for rendering (2D plotting on WebGL)

## Try it

- Open `test.html` in your browser (Edge/Chrome). Optionally from PowerShell:

```powershell
Start-Process .\test.html
```

- Enter a formula in the `f(x)=` field or pick one from the Examples menu.
- Set Start, End, and Step (supports 0.1 increments), then press Run or just type to update live.
- Hover the graph to see the x, f(x) readout; the grid aligns to your sampling step.

Example formulas you can try:
- `x^2`
- `sin(x)`
- `cos(x) + x^2/8`
- `exp(-x^2)`
- `ln(x + 1)`
- `sqrt(abs(x))`
- `tanh(x)`
- `sin(x)/x`
- `x^3 - 3*x`
- `sin(x) * cos(3*x)`