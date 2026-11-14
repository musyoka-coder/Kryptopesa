"use strict";
window.KPAdminCharts = (function({h, num}) {
    var NS = "http://www.w3.org/2000/svg";
    function s(name, attrs) {
      var e = document.createElementNS(NS, name);
      Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      for (var i = 2; i < arguments.length; i++) { var k2 = arguments[i]; if (k2) e.append(k2); }
      return e;
    }
    function niceMax(v) {
      if (v <= 5) return 5;
      var p = Math.pow(10, Math.floor(Math.log10(v)));
      var f = v / p;
      return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
    }
    function legend(items) {
      return h("div", { class: "legend" }, items.map(function (i) { return h("span", null, h("i", { style: "background:" + i.color }), i.label); }));
    }
    function allZero(arrs) { return arrs.every(function (a) { return a.every(function (v) { return !Number(v); }); }); }

    function lineChart(labels, series, aria) {
      if (!labels.length || allZero(series.map(function (x) { return x.values; }))) return h("div", { class: "empty" }, "No activity in this period yet.");
      var W = 640, H = 250, L = 46, R = 12, T = 12, B = 28;
      var max = niceMax(Math.max.apply(null, [].concat.apply([], series.map(function (x) { return x.values.map(Number); }))));
      var svg = s("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": aria });
      var iw = W - L - R, ih = H - T - B;
      var X = function (i) { return L + (labels.length === 1 ? iw / 2 : (i * iw) / (labels.length - 1)); };
      var Y = function (v) { return T + ih - (Number(v) / max) * ih; };
      for (var g = 0; g <= 4; g++) {
        var gy = T + (ih * g) / 4;
        svg.append(s("line", { x1: L, x2: W - R, y1: gy, y2: gy, stroke: "#e3e9f2" }));
        var tx = s("text", { x: L - 8, y: gy + 4, "text-anchor": "end", "font-size": 11, fill: "#56657f" });
        tx.textContent = num(Math.round(max - (max * g) / 4));
        svg.append(tx);
      }
      var step = Math.max(1, Math.ceil(labels.length / 6));
      labels.forEach(function (lb, i) {
        if (i % step !== 0 && i !== labels.length - 1) return;
        var t = s("text", { x: X(i), y: H - 8, "text-anchor": "middle", "font-size": 11, fill: "#56657f" });
        t.textContent = lb.slice(5);
        svg.append(t);
      });
      series.forEach(function (sr) {
        var pts = sr.values.map(function (v, i) { return X(i).toFixed(1) + "," + Y(v).toFixed(1); });
        svg.append(s("polyline", { points: pts.join(" "), fill: "none", stroke: sr.color, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }));
        sr.values.forEach(function (v, i) {
          var c = s("circle", { cx: X(i), cy: Y(v), r: labels.length > 45 ? 0 : 3.5, fill: "#fff", stroke: sr.color, "stroke-width": 2 });
          var tt = s("title"); tt.textContent = labels[i] + " — " + sr.name + ": " + num(v);
          c.append(tt); svg.append(c);
        });
      });
      return h("div", null, svg, legend(series.map(function (x) { return { color: x.color, label: x.name }; })));
    }

    function barChart(labels, values, color, name, fmt, aria) {
      if (!labels.length || allZero([values])) return h("div", { class: "empty" }, "Nothing to show yet.");
      var W = 640, H = 230, L = 52, R = 12, T = 12, B = 30;
      var max = niceMax(Math.max.apply(null, values.map(Number)));
      var svg = s("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": aria });
      var iw = W - L - R, ih = H - T - B, bw = iw / labels.length;
      for (var g = 0; g <= 4; g++) {
        var gy = T + (ih * g) / 4;
        svg.append(s("line", { x1: L, x2: W - R, y1: gy, y2: gy, stroke: "#e3e9f2" }));
        var tx = s("text", { x: L - 8, y: gy + 4, "text-anchor": "end", "font-size": 11, fill: "#56657f" });
        tx.textContent = fmt(max - (max * g) / 4);
        svg.append(tx);
      }
      var step = Math.max(1, Math.ceil(labels.length / 7));
      values.forEach(function (v, i) {
        var bh = (Number(v) / max) * ih;
        var r = s("rect", { x: L + i * bw + bw * 0.15, y: T + ih - bh, width: Math.max(1, bw * 0.7), height: Math.max(0, bh), rx: 3, fill: color });
        var tt = s("title"); tt.textContent = labels[i] + " — " + name + ": " + fmt(v);
        r.append(tt); svg.append(r);
        if (i % step === 0) {
          var t = s("text", { x: L + i * bw + bw / 2, y: H - 9, "text-anchor": "middle", "font-size": 11, fill: "#56657f" });
          t.textContent = labels[i].length > 10 ? labels[i].slice(5) : labels[i];
          svg.append(t);
        }
      });
      return h("div", null, svg);
    }

    function donut(items, aria) {
      var total = items.reduce(function (a, b) { return a + Number(b.value || 0); }, 0);
      if (!total) return h("div", { class: "empty" }, "No data yet.");
      var C = 2 * Math.PI * 52, off = 0;
      var svg = s("svg", { viewBox: "0 0 150 150", role: "img", "aria-label": aria });
      svg.append(s("circle", { cx: 75, cy: 75, r: 52, fill: "none", stroke: "#eef1f6", "stroke-width": 20 }));
      items.forEach(function (it) {
        var v = Number(it.value || 0);
        if (!v) return;
        var len = (v / total) * C;
        var c = s("circle", { cx: 75, cy: 75, r: 52, fill: "none", stroke: it.color, "stroke-width": 20,
          "stroke-dasharray": len.toFixed(2) + " " + (C - len).toFixed(2), "stroke-dashoffset": (-off).toFixed(2), transform: "rotate(-90 75 75)" });
        var tt = s("title"); tt.textContent = it.label + ": " + num(v);
        c.append(tt); svg.append(c); off += len;
      });
      var t1 = s("text", { x: 75, y: 78, "text-anchor": "middle", "font-size": 22, "font-weight": 800, fill: "#0b1830" }); t1.textContent = num(total);
      var t2 = s("text", { x: 75, y: 95, "text-anchor": "middle", "font-size": 10, fill: "#56657f" }); t2.textContent = "total";
      svg.append(t1, t2);
      return h("div", { class: "donut-wrap" }, svg,
        h("div", { class: "legend" }, items.map(function (i) {
          return h("span", null, h("i", { style: "background:" + i.color }), i.label + " · " + num(i.value));
        })));
    }

return {lineChart, barChart, donut};
})(window.KPAdminHelpers);
