"use strict";
window.KPAdminUI = function({h, num}, openUser) {
    function table(cols, rows, opts) {
      opts = opts || {};
      if (!rows.length) return h("div", { class: "table-wrap" }, h("div", { class: "empty" }, opts.empty || "Nothing here yet."));
      var thead = h("thead", null, h("tr", null, cols.map(function (c) { return h("th", { class: c.num ? "num" : "", scope: "col" }, c.label); })));
      var tbody = h("tbody");
      rows.forEach(function (r) {
        var tr = h("tr", { class: opts.rowClass ? opts.rowClass(r) : "" });
        cols.forEach(function (c) { tr.append(h("td", { class: c.num ? "num" : "" }, c.render(r, tr))); });
        tbody.append(tr);
      });
      return h("div", { class: "table-wrap" }, h("table", null, h("caption", { class: "sr-only" }, opts.caption || "Data table"), thead, tbody));
    }
    function pager(total, st, reload) {
      var from = total ? st.offset + 1 : 0, to = Math.min(st.offset + st.limit, total);
      return h("div", { class: "pager" },
        h("span", null, "Showing " + num(from) + "–" + num(to) + " of " + num(total)),
        h("div", { class: "btns" },
          h("button", { class: "btn small", type: "button", disabled: st.offset <= 0, onclick: function () { st.offset = Math.max(0, st.offset - st.limit); reload(); } }, "← Previous"),
          h("button", { class: "btn small", type: "button", disabled: st.offset + st.limit >= total, onclick: function () { st.offset += st.limit; reload(); } }, "Next →")));
    }
    function userLink(id, name, email) {
      return h("span", null,
        h("button", { class: "linkbtn", type: "button", onclick: function () { openUser(id); } }, name || email || "user"),
        email && name ? h("span", { class: "sub" }, email) : null);
    }

    function ask(cfg) {
      return new Promise(function (resolve) {
        var dlg = h("dialog", { class: "modal", "aria-labelledby": "mTitle" });
        var err = h("p", { class: "form-error", role: "alert" });
        var refs = {};
        var form = h("form", { class: "modal-form", method: "dialog", novalidate: true },
          h("h2", { id: "mTitle" }, cfg.title),
          cfg.intro ? h("p", { class: "intro" }, cfg.intro) : null,
          (cfg.fields || []).map(function (f, i) {
            var id = "mf" + i, ctl;
            if (f.type === "select") {
              ctl = h("select", { id: id }, f.options.map(function (o) { return h("option", { value: o.value }, o.label); }));
              ctl.value = f.value === undefined ? f.options[0].value : f.value;
            } else if (f.type === "textarea") {
              ctl = h("textarea", { id: id, maxlength: f.max || 500, placeholder: f.placeholder || "" }); ctl.value = f.value || "";
            } else if (f.type === "number") {
              ctl = h("input", { id: id, type: "number", min: f.min, max: f.max, step: 1, placeholder: f.placeholder || "" }); ctl.value = f.value === null || f.value === undefined ? "" : f.value;
            } else if (f.type === "checkbox") {
              ctl = h("input", { id: id, type: "checkbox" }); ctl.checked = !!f.value;
              refs[f.name] = ctl;
              return h("div", { class: "check" }, ctl, h("label", { for: id }, f.label));
            }
            refs[f.name] = ctl;
            return h("div", { class: "field" }, h("label", { for: id }, f.label), ctl);
          }),
          err,
          h("div", { class: "modal-actions" },
            h("button", { class: "btn", type: "button", onclick: function () { dlg.close(); } }, "Cancel"),
            h("button", { class: "btn " + (cfg.danger ? "danger" : "primary"), type: "submit" }, cfg.confirm || "Confirm")));
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var vals = {};
          for (var i = 0; i < (cfg.fields || []).length; i++) {
            var f = cfg.fields[i], c = refs[f.name];
            var v = f.type === "checkbox" ? c.checked : c.value.trim();
            if (f.required && !v) { err.textContent = f.label + " is required."; c.focus(); return; }
            if (f.minLen && v.length < f.minLen) { err.textContent = f.label + " must be at least " + f.minLen + " characters."; c.focus(); return; }
            if (f.type === "number" && v !== "") {
              var n = Number(v);
              if (!Number.isInteger(n) || n < (f.min || 0) || n > (f.max || 10000)) { err.textContent = f.label + " must be a whole number between " + (f.min || 0) + " and " + (f.max || 10000) + "."; c.focus(); return; }
              v = n;
            }
            vals[f.name] = v;
          }
          resolve(vals); dlg.close();
        });
        dlg.addEventListener("close", function () { dlg.remove(); resolve(null); });
        dlg.append(form); document.body.append(dlg); dlg.showModal();
        var first = dlg.querySelector("textarea, input, select"); if (first) first.focus();
      });
    }

return {table, pager, userLink, ask};
};
