const se = {
  // Brand colors
  grenadier: "#CF3F02",
  // Signature orange
  aquamarine: "#2E86AB",
  // Secondary blue
  aquamarineLight: "#3A9BBF",
  // Lighter aquamarine
  // Semantic colors for visualization
  background: "#f7f7f7",
  contributor: "#3A9BBF",
  // Lighter aquamarine
  repo: "#2E86AB",
  // Aquamarine (secondary blue)
  repoMain: "#CF3F02",
  // Grenadier (central repo)
  owner: "#CF3F02",
  // Grenadier
  link: "#e8e8e8",
  text: "#443F3F",
  // Base dark gray
  accent: "#CF3F02",
  // Grenadier for accent rings
  // Derived colors with opacity
  highlightFill: "#CF3F0230",
  // Grenadier at ~20% opacity
  shadow: "#f7f7f7",
  shadowDark: "#d4d4d4"
}, Nt = {
  family: "Roboto",
  familyCondensed: "Roboto Condensed",
  familyMono: "Fira Code",
  // Font weights
  normal: 400,
  bold: 700,
  // Default sizes (scaled dynamically in visualization)
  baseSizeContributor: 11,
  baseSizeRepo: 10,
  baseSizeOwner: 12
}, Z = {
  // Canvas dimensions
  defaultCanvas: 1500,
  // Node radius ranges [min, max]
  contributorRadius: { min: 8, max: 30 },
  remainingContributorRadius: { min: 1, max: 8 },
  repoRadius: { min: 4, max: 20 },
  // Link dimensions
  linkWidth: { min: 1, mid: 2, max: 60 },
  linkDistance: { min: 10, max: 80 }
}, ut = {
  // Central node positioning
  centralRadius: 100,
  innerRadiusFactor: 1.5,
  // Contributor ring positioning
  contributorPadding: 20,
  // Default, overridden by config
  // Force simulation parameters
  linkDistanceDomain: [1, 50],
  linkWidthExponent: 0.75,
  // Collision detection
  bboxPadding: 2
};
function J(e) {
  return typeof e == "object" && e !== null ? e.id : e;
}
function rt(e, r, a = {}) {
  const { removeUnresolved: l = !0, onUnresolved: c = null } = a, n = new Map(r.map((s) => [s.id, s])), g = [];
  for (const s of e) {
    let i = s.source, u = s.target;
    typeof i == "string" && (i = n.get(i), !i && c && c("source", s.source)), typeof u == "string" && (u = n.get(u), !u && c && c("target", s.target)), i && u && i.id && u.id ? g.push({
      ...s,
      source: i,
      target: u
    }) : l || g.push({
      ...s,
      source: i || null,
      target: u || null
    });
  }
  return g;
}
function $t(e) {
  return e.scaleSqrt().range([Z.repoRadius.min, Z.repoRadius.max]);
}
function Lt(e) {
  return e.scaleSqrt().range([Z.contributorRadius.min, Z.contributorRadius.max]);
}
function xt(e) {
  return e.scaleSqrt().range([Z.remainingContributorRadius.min, Z.remainingContributorRadius.max]);
}
function Ht(e) {
  return e.scaleLinear().domain(ut.linkDistanceDomain).range([Z.linkDistance.min, Z.linkDistance.max]);
}
function zt(e) {
  return e.scalePow().exponent(ut.linkWidthExponent).range([Z.linkWidth.min, Z.linkWidth.mid, Z.linkWidth.max]);
}
const Mt = Math.PI, Pe = Math.min, Wt = Nt.family;
function $(e, r, a, l = "normal", c = Wt) {
  e.font = `${a} ${l} ${r}px ${c}`;
}
function ft(e, r = 1, a = 12) {
  $(e, a * r, 400, "normal");
}
function mt(e, r = 1, a = 15) {
  $(e, a * r, 700, "normal");
}
function gt(e, r = 1, a = 12) {
  $(e, a * r, 700, "normal");
}
function _t(e, r = 1, a = 13) {
  $(e, a * r, 700, "italic");
}
function P(e, r, a, l, c = 0, n = !1) {
  const g = String.prototype.split.call(r, "");
  let s = 0, i, u = a;
  const h = e.textAlign;
  let k = 0;
  for (let I = 0; I < g.length; I++)
    k += e.measureText(g[I]).width + c;
  h === "right" ? u = a - k : h === "center" && (u = a - k / 2), e.textAlign = "left";
  const d = u;
  for (; s < r.length; )
    i = g[s++], n && e.strokeText(i, u, l), e.fillText(i, u, l), u += e.measureText(i).width + c;
  const p = u - e.measureText(i).width / 2;
  return e.textAlign = h, [d, p];
}
function Pt(e, r, a, l = !0) {
  const c = r.split(" ");
  let n = [], g = c[0];
  for (let i = 1; i < c.length; i++) {
    const u = c[i];
    e.measureText(g + " " + u).width < a ? g += " " + u : (n.push(g), g = u);
  }
  n.push(g), l && n.length === 2 && (n = Dt(r));
  let s = 0;
  return n.forEach((i) => {
    const u = e.measureText(i).width;
    u > s && (s = u);
  }), [n, s];
}
function Dt(e) {
  const r = e.length, a = [];
  for (let i = 0; i < e.length; i++)
    e[i] === " " && a.push(i);
  const l = a.map((i) => Math.abs(r / 2 - i)), c = Pe(...l), n = a[l.indexOf(c)], g = e.substr(0, n), s = e.substr(n);
  return [g.trim(), s.trim()];
}
function it(e, r, a, l, c, n = 0) {
  let g = c === "up" ? a : a - Mt, s = r;
  c === "up" && (s = s.split("").reverse().join(""));
  for (let i = 0; i < s.length; i++) {
    const u = e.measureText(s[i]).width;
    g += (u + (i === s.length - 1 ? 0 : n)) / l / 2;
  }
  e.save(), e.rotate(g);
  for (let i = 0; i < s.length; i++) {
    const u = e.measureText(s[i]).width / 2, h = (c === "up" ? -1 : 1) * l;
    e.rotate(-(u + n) / l), P(e, s[i], 0, h, 0), e.rotate(-(u + n) / l);
  }
  e.restore();
}
const me = {
  lineHeight: 1.4,
  sectionSpacing: 20,
  // Balanced spacing (was 24, reduced to 18, now 20 for better readability)
  labelFontSize: 11,
  valueFontSize: 11.5,
  headerFontSize: 12,
  labelOpacity: 0.6,
  valueOpacity: 0.9,
  warningOpacity: 0.7
};
function ze(e, r) {
  return e < 10 ? String(e) : r(e);
}
function ht(e) {
  const r = Math.round(e * 100);
  return r >= 70 ? "Strong" : r >= 40 ? "Moderate" : "Growing";
}
function St(e, r, a, l, c, n) {
  $(e, me.headerFontSize * c, 400, "normal"), e.globalAlpha = 1;
  const s = ze(r.stars, n), i = ze(r.forks, n), u = ze(r.watchers || 0, n);
  return P(
    e,
    `${s} stars | ${i} forks | ${u} watchers`,
    a * c,
    l * c,
    1.25 * c
  ), l;
}
function Bt(e, r, a, l, c) {
  const n = me;
  if (!r.languages || r.languages.length === 0)
    return l;
  l += n.sectionSpacing, e.globalAlpha = n.labelOpacity, $(e, n.labelFontSize * c, 400, "italic"), P(e, "Languages", a * c, l * c, 2 * c), l += n.valueFontSize * n.lineHeight + 4, e.globalAlpha = n.valueOpacity, $(e, n.valueFontSize * c, 400, "normal");
  let g = "";
  const s = Pe(3, r.languages.length);
  for (let i = 0; i < s; i++)
    g += `${r.languages[i]}${i < s - 1 ? ", " : ""}`;
  return P(e, g, a * c, l * c, 1.25 * c), r.languages.length > 3 && (l += n.valueFontSize * n.lineHeight, P(e, `& ${r.languages.length - 3} more`, a * c, l * c, 1.25 * c)), l += n.valueFontSize * n.lineHeight, l;
}
function Ft(e, r, a, l, c) {
  const n = me;
  if (!r.totalContributors || r.totalContributors === 0)
    return l;
  l += n.sectionSpacing, e.globalAlpha = n.labelOpacity, $(e, n.labelFontSize * c, 400, "italic"), P(e, "Community", a * c, l * c, 2 * c), l += n.valueFontSize * n.lineHeight + 4, e.globalAlpha = n.valueOpacity, $(e, n.valueFontSize * c, 400, "normal");
  const g = r.totalContributors, s = r.devseedContributors || 0, i = r.externalContributors || 0;
  P(
    e,
    `${g} contributors (${s} DevSeed, ${i} community)`,
    a * c,
    l * c,
    1.25 * c
  ), l += n.valueFontSize * n.lineHeight;
  const u = r.communityRatio || 0, h = Math.round(u * 100), k = ht(u);
  return P(
    e,
    `Community Health: ${h}% (${k})`,
    a * c,
    l * c,
    1.25 * c
  ), s === 1 && g > 0 && (l += n.valueFontSize * n.lineHeight, e.globalAlpha = n.warningOpacity, $(e, n.valueFontSize * c, 400, "italic"), P(e, "⚠ Single DevSeed maintainer", a * c, l * c, 1.25 * c), e.globalAlpha = n.valueOpacity, $(e, n.valueFontSize * c, 400, "normal")), l += n.valueFontSize * n.lineHeight, l;
}
function Ut(e, r, a, l, c) {
  const n = me;
  return r.license && (l += n.sectionSpacing, e.globalAlpha = n.valueOpacity, $(e, n.valueFontSize * c, 400, "normal"), P(e, `License: ${r.license}`, a * c, l * c, 1.25 * c), l += n.valueFontSize * n.lineHeight), l;
}
function Gt(e, r, a, l, c) {
  const n = me;
  return r.archived && (l += n.sectionSpacing, e.globalAlpha = n.warningOpacity, $(e, n.valueFontSize * c, 400, "italic"), P(e, "📦 Archived", a * c, l * c, 1.25 * c), e.globalAlpha = n.valueOpacity, l += n.valueFontSize * n.lineHeight), l;
}
function ot(e, r, a, l, c, n, g) {
  e.filter((s) => s.type === "owner").forEach((s, i) => {
    s.x = s.fx = 0, s.y = s.fy = 0;
  }), e.filter((s) => s.type === "owner").forEach((s) => {
    let i = e.filter(
      (p) => r.find(
        (I) => l(I.source) === s.id && l(I.target) === p.id && p.degree === 1
      ) || p.id === s.id
    );
    s.connected_node_cloud = i.filter(
      (p) => p.type === "repo"
    );
    let u = r.filter(
      (p) => l(p.source) === s.id && i.find((I) => I.id === l(p.target))
    );
    i.forEach((p) => {
      p.x = s.fx + Math.random() * (Math.random() > 0.5 ? 1 : -1), p.y = s.fy + Math.random() * (Math.random() > 0.5 ? 1 : -1);
    });
    let h = a.forceSimulation().force(
      "link",
      // There are links, but they have no strength
      a.forceLink().id((p) => p.id).strength(0)
    ).force(
      "collide",
      // Use a non-overlap, but let it start out at strength 0
      a.forceCollide().radius((p) => {
        let I;
        return p.id === s.id ? s.data.single_contributor ? I = s.r + 2 : I = s.r + g(14, n(10, s.r)) : I = p.r + n(2, p.r * 0.2), I;
      }).strength(0)
    ).force("x", a.forceX().x(s.fx).strength(0.1)).force("y", a.forceY().y(s.fy).strength(0.1));
    h.nodes(i).stop(), h.force("link").links(u);
    let k = 200;
    for (let p = 0; p < k; ++p)
      h.tick(), h.force("collide").strength(Math.pow(p / k, 2) * 0.8);
    s.max_radius = a.max(
      i,
      (p) => c((p.x - s.x) ** 2 + (p.y - s.y) ** 2)
    );
    let d = i.find(
      (p) => c((p.x - s.x) ** 2 + (p.y - s.y) ** 2) === s.max_radius
    );
    s.max_radius = n(s.max_radius + d.r, s.r), delete s.fx, delete s.fy;
  });
}
function nt(e, r, a, l, c, n) {
  e.filter((g) => g.type === "contributor").forEach((g, s) => {
    g.x = g.fx = 0, g.y = g.fy = 0;
  }), e.filter((g) => g.type === "contributor").forEach((g) => {
    let s = e.filter(
      (d) => r.find(
        (p) => l(p.source) === g.id && l(p.target) === d.id && d.degree === 1
      ) || r.find(
        (p) => l(p.source) === g.id && l(p.target) === d.id && d.type === "owner" && d.data.single_contributor === !0
      ) || d.id === g.id
    );
    if (g.connected_single_repo = s.filter(
      (d) => d.type === "repo" || d.type === "owner"
    ), typeof localStorage < "u" && localStorage.getItem("debug-orca") === "true" && (console.log(`Contributor ${g.id}: connected repos = ${g.connected_single_repo.length}`), g.connected_single_repo.length === 0)) {
      const d = r.filter((p) => l(p.source) === g.id);
      if (console.log(`  - Actual links from contributor: ${d.length}`), d.length > 0) {
        const p = l(d[0].target), I = e.find((C) => C.id === p);
        console.log(`  - First target: ${p}, degree: ${I ? I.degree : "?"}`);
      }
    }
    let i = [];
    g.connected_single_repo.forEach((d) => {
      i.push({ source: g.id, target: d.id });
    }), s.forEach((d) => {
      d.x = g.fx + Math.random() * (Math.random() > 0.5 ? 1 : -1), d.y = g.fy + Math.random() * (Math.random() > 0.5 ? 1 : -1);
    });
    let u = a.forceSimulation().nodes(s).force(
      "link",
      // There are links, but they have no strength (like singleOwnerForceSimulation)
      a.forceLink().id((d) => d.id).strength(0)
    ).force("charge", a.forceManyBody().strength(-10)).force(
      "collide",
      a.forceCollide((d) => d.r + 2).strength(0.1)
    ).force("x", a.forceX().x(g.fx).strength(0.1)).force("y", a.forceY().y(g.fy).strength(0.1));
    u.nodes(s).stop(), u.force("link").links(i);
    let h = 200;
    for (let d = 0; d < h; ++d)
      u.tick(), u.force("collide").strength(Math.pow(d / h, 2) * 0.8);
    g.max_radius = a.max(
      s,
      (d) => c((d.x - g.x) ** 2 + (d.y - g.y) ** 2)
    );
    let k = s.find(
      (d) => c((d.x - g.x) ** 2 + (d.y - g.y) ** 2) === g.max_radius
    );
    g.max_radius = n(g.max_radius + (k ? k.r : 0), g.r), typeof localStorage < "u" && localStorage.getItem("debug-orca") === "true" && console.log(`Contributor ${g.id}: max_radius = ${g.max_radius}`);
  });
}
function at(e, r, a, l, c, n, g, s, i, u, h, k) {
  let d, p = a.forceSimulation().force(
    "link",
    a.forceLink().id((m) => m.id).distance((m) => u(m.target.degree) * 5)
  ).force(
    "collide",
    //Make sure that the words don't overlap
    //https://github.com/emeeks/d3-bboxCollide
    a.bboxCollide((m) => m.bbox).strength(0).iterations(1)
  ).force(
    "charge",
    a.forceManyBody()
    // .strength(d => scale_node_charge(d.id))
    // .distanceMax(WIDTH / 3)
  );
  d = e.filter(
    (m) => m.type === "contributor" || m.type === "owner" && m.data.single_contributor == !1 || m.id === s || m.type === "repo" && m.data.multi_repo_owner === !1 && m.degree > 1
  ), d.forEach((m) => {
    m.node_central = !0;
  }), d.forEach((m) => {
    if (m.type === "contributor") {
      m.bbox = [
        [-m.max_radius, -m.max_radius],
        [m.max_radius, m.max_radius]
      ];
      return;
    }
    m.id === i.id ? mt(g, 1) : m.type === "owner" ? gt(g, 1) : m.type === "repo" && ft(g, 1);
    let v = g.measureText(m.label);
    if (m.type === "repo" && g.measureText(m.data.owner).width > v.width && (v = g.measureText(m.data.owner)), m.id === s) {
      let q = m.r + 14, x = n(q * 2, v.width * 1.25) + 10;
      m.bbox = [
        [-x / 2, -q],
        [x / 2, q]
      ];
      return;
    }
    let z = v.fontBoundingBoxAscent + v.fontBoundingBoxDescent;
    m.type === "repo" && (z *= 2);
    let M = m.type === "owner" ? m.max_radius : m.r, D = n(M, m.r + z), T = n(M * 2, v.width * 1.25) + 10;
    m.bbox = [
      [-T / 2, -D],
      [T / 2, M]
    ];
  });
  let I = r.filter(
    (m) => d.find((v) => v.id === l(m.source)) && d.find((v) => v.id === l(m.target))
  );
  p.nodes(d).stop(), p.force("link").links(I);
  let C = 300;
  for (let m = 0; m < C; ++m)
    p.tick(), N(d, c, n, h, k), p.force("collide").strength(Math.pow(m / C, 2) * 0.7);
  d.forEach((m) => {
    m.fx = m.x, m.fy = m.y;
  }), e.filter((m) => m.type === "owner").forEach((m) => {
    m.connected_node_cloud && m.connected_node_cloud.length > 0 && m.connected_node_cloud.forEach((v) => {
      v.x = m.x + v.x, v.y = m.y + v.y;
    });
  });
  function N(m, v, z, M, D) {
    m.forEach((T) => {
      if (T.type === "repo" || T.type === "owner") {
        const q = v(T.x ** 2 + T.y ** 2);
        q > M * D && (T.x = T.x / q * M * D, T.y = T.y / q * M * D);
      }
    });
  }
  return d;
}
function lt(e, r, a, l, c, n, g, s, i, u, h) {
  let k = (g * 2.3 / 2 - g) * 2, d = s + k * 2;
  e.forEach((C) => {
    let N = Math.random() * a;
    C.x = (d + Math.random() * 50) * l(N), C.y = (d + Math.random() * 50) * c(N), C.r = h(C.commit_count);
  });
  let p = r.forceSimulation().force(
    "collide",
    r.forceCollide().radius((C) => C.r + Math.random() * 20 + 10).strength(1)
  ).force("x", r.forceX().x(0).strength(0.01)).force("y", r.forceY().y(0).strength(0.01));
  e.push({
    x: 0,
    y: 0,
    fx: 0,
    fy: 0,
    r: s + k * 0.75,
    id: "dummy"
  }), p.nodes(e).stop();
  let I = 30;
  for (let C = 0; C < I; ++C)
    p.tick();
  e.pop();
}
function Xt() {
  return {
    organizations: []
    // e.g., ["developmentseed", "stac-utils"]
  };
}
function Jt(e, r) {
  return e.organizations.includes(r) || e.organizations.push(r), e;
}
function Yt(e, r) {
  return e.organizations = e.organizations.filter((a) => a !== r), e;
}
function qt(e, r) {
  return e.organizations.includes(r);
}
function jt(e) {
  return e.organizations.length > 0;
}
function Kt() {
  return {
    hoverActive: !1,
    hoveredNode: null,
    clickActive: !1,
    clickedNode: null,
    delaunay: null,
    nodesDelaunay: null,
    delaunayRemaining: null
  };
}
function Vt(e, r) {
  return e.hoverActive = !!r, e.hoveredNode = r, e;
}
function st(e) {
  return e.hoverActive = !1, e.hoveredNode = null, e;
}
function Zt(e, r) {
  return e.clickActive = !!r, e.clickedNode = r, e;
}
function Qt(e) {
  return e.clickActive = !1, e.clickedNode = null, e;
}
function er(e) {
  return e.hoverActive = !1, e.hoveredNode = null, e.clickActive = !1, e.clickedNode = null, e;
}
function ct(e, r, a, l = null) {
  return e.delaunay = r, e.nodesDelaunay = a, e.delaunayRemaining = l, e;
}
function tr(e) {
  return e.delaunay = null, e.nodesDelaunay = null, e.delaunayRemaining = null, e;
}
function pt(e, r, a, l, c, n, g) {
  const { PIXEL_RATIO: s, WIDTH: i, HEIGHT: u, SF: h, RADIUS_CONTRIBUTOR_NON_ORCA: k, ORCA_RING_WIDTH: d, sqrt: p } = a, { delaunay: I, nodesDelaunay: C, delaunayRemaining: N } = l;
  e = (e * s - i / 2) / h, r = (r * s - u / 2) / h;
  const m = k + d + 200;
  if (p(e * e + r * r) > m)
    return [null, !1];
  let z = I.find(e, r), M = C[z];
  if (!M)
    return [null, !1];
  let D = p((M.x - e) ** 2 + (M.y - r) ** 2), T = D < M.r + (c.clickActive ? 10 : 50);
  return !T && n && N && (z = N.find(e, r), M = g[z], M && (D = p((M.x - e) ** 2 + (M.y - r) ** 2), T = D < M.r + 5)), [M, T];
}
function rr(e, r, a, l, c, n, g, s, i, u, h, k, d) {
  const { WIDTH: p, HEIGHT: I } = a;
  e.select(r).on("mousemove", function(C) {
    try {
      let [N, m] = e.pointer(C, this), [v, z] = pt(N, m, a, l, c, i, u);
      z && v && v.id !== n ? (h(c, v), v.remaining_contributor || (g.style.opacity = v.type === "contributor" ? "0.15" : "0.3"), d(s, v)) : (s.clearRect(0, 0, p, I), k(c), c.clickActive || (g.style.opacity = "1"));
    } catch (N) {
      console.warn("Hover error:", N), s.clearRect(0, 0, p, I), k(c), c.clickActive || (g.style.opacity = "1");
    }
  }), e.select(r).on("mouseleave", function() {
    s.clearRect(0, 0, p, I), k(c), c.clickActive || (g.style.opacity = "1");
  });
}
function ir(e, r, a, l, c, n, g, s, i, u, h, k, d, p, I, C, N) {
  const { WIDTH: m, HEIGHT: v } = a;
  e.select(r).on("click", function(z) {
    let [M, D] = e.pointer(z, this), [T, q] = pt(M, D, a, l, c, h, k);
    s.clearRect(0, 0, m, v), q && T && T.id !== n ? (d(c, T), l.nodesDelaunay = T.neighbors ? [...T.neighbors, T] : u, l.delaunay = e.Delaunay.from(l.nodesDelaunay.map((x) => [x.x, x.y])), C(c, l.delaunay, l.nodesDelaunay, l.delaunayRemaining), N(s, T, !1), i.clearRect(0, 0, m, v)) : (p(c), I(c), l.nodesDelaunay = u, l.delaunay = e.Delaunay.from(l.nodesDelaunay.map((x) => [x.x, x.y])), C(c, l.delaunay, l.nodesDelaunay, l.delaunayRemaining), g.style.opacity = "1");
  });
}
function Oe(e, r, a, l, c = 10, n = !0, g = !1) {
  const s = Math.PI * 2;
  n === !0 && e.beginPath(), e.moveTo((r + c) * l, a * l), e.arc(r * l, a * l, c * l, 0, s), n && g == !1 && e.fill();
}
function or(e, r, a) {
  if (!a.center) {
    e.lineTo(a.target.x * r, a.target.y * r);
    return;
  }
  let l = a.center, c = Math.atan2(
    a.source.y * r - l.y * r,
    a.source.x * r - l.x * r
  ), n = Math.atan2(
    a.target.y * r - l.y * r,
    a.target.x * r - l.x * r
  );
  e.arc(
    l.x * r,
    l.y * r,
    a.r * r,
    c,
    n,
    a.sign
  );
}
function nr(e, r, a) {
  e.beginPath(), e.moveTo(a.source.x * r, a.source.y * r), a.center ? or(e, r, a) : e.lineTo(a.target.x * r, a.target.y * r), e.stroke();
}
function ar(e, r, a, l, c) {
  const { REPO_CENTRAL: n, COLOR_BACKGROUND: g, max: s } = l;
  let i = a.type === "repo" && !a.data.orca_impacted;
  const u = a.id === n;
  u && (i = !1), e.shadowBlur = c.hoverActive ? 0 : s(2, a.r * 0.2) * r, e.shadowColor = "#f7f7f7", e.globalAlpha = u ? 0.5 : i ? 0.4 : 1, e.fillStyle = a.color, Oe(e, a.x, a.y, r, a.r), e.globalAlpha = 1, e.shadowBlur = 0, i && Oe(e, a.x, a.y, r, a.r * 0.3), a.remaining_contributor || (e.strokeStyle = g, e.lineWidth = s(c.hoverActive ? 1.5 : 1, a.r * 0.07) * r, Oe(e, a.x, a.y, r, a.r, !0, !0), e.stroke());
}
function lr(e, r, a, l, c, n, g) {
  if (l.hoverActive && l.hoveredNode && l.hoveredNode.type === "contributor" && a.type === "repo") {
    let s = l.hoveredNode.data.links_original.find((i) => i.repo === a.id);
    s && cr(e, r, a, a, s, c, n, g);
  }
}
function sr(e, r, a, l) {
  const c = Math.PI * 2;
  let n = r.r + (r.type === "contributor" ? 9 : r === l ? 14 : 7);
  e.beginPath(), e.moveTo((r.x + n) * a, r.y * a), e.arc(r.x * a, r.y * a, n * a, 0, c), e.strokeStyle = r.color, e.lineWidth = 3 * a, e.stroke();
}
function cr(e, r, a, l, c, n, g, s) {
  const i = Math.PI * 2;
  e.save(), e.translate(a.x * r, a.y * r), e.fillStyle = n, e.strokeStyle = n;
  const u = g.scaleLinear().domain([l.data.createdAt, l.data.updatedAt]).range([0, i]);
  let h = a.r + (a.type === "contributor" || a === s ? 2.5 : 1), k = h + 3;
  const d = g.arc().innerRadius(h * r).outerRadius(k * r).startAngle(u(c.commit_sec_min)).endAngle(u(c.commit_sec_max)).context(e);
  e.beginPath(), d(), e.fill(), e.restore();
}
function ur(e, r, a, l, c, n, g, s) {
  const { COLOR_LINK: i } = l;
  if (!a.source || !a.target || typeof a.source.x != "number" || typeof a.target.x != "number" || !isFinite(a.source.x) || !isFinite(a.source.y) || !isFinite(a.target.x) || !isFinite(a.target.y))
    return;
  a.source.x !== void 0 && a.target.x !== void 0 ? (n(e, a), g(a, 1), e.strokeStyle = a.gradient || i) : e.strokeStyle = i;
  let u = s(a.commit_count);
  if (c.hoverActive && c.hoveredNode && c.hoveredNode.type === "contributor" && c.hoveredNode.data && c.hoveredNode.data.links_original && a.source.type === "owner" && a.target.type === "repo") {
    let h = c.hoveredNode.data.links_original.find(
      (k) => k.repo === a.target.id
    );
    h && (u = s(h.commit_count));
  }
  e.lineWidth = u * r, nr(e, r, a);
}
function fr(e, r, a, l, c, n, g) {
  var h;
  const s = me, i = 1.2;
  let u = 0;
  return u += 18, u += 12 * i, u += 18, u += 15 * i, u += 15 * i, u += 24, u += 11 * i, u += 11 * i, u += 20, u += s.headerFontSize * i, e.data.languages && e.data.languages.length > 0 && (u += s.sectionSpacing, u += s.labelFontSize * s.lineHeight + 4, u += s.valueFontSize * s.lineHeight, e.data.languages.length > 3 && (u += s.valueFontSize * s.lineHeight)), e.data.totalContributors && e.data.totalContributors > 0 && (u += s.sectionSpacing, u += s.labelFontSize * s.lineHeight + 4, u += s.valueFontSize * s.lineHeight, u += s.valueFontSize * s.lineHeight, e.data.devseedContributors === 1 && e.data.totalContributors > 0 && (u += s.valueFontSize * s.lineHeight)), e.data.license && (u += s.sectionSpacing, u += s.valueFontSize * s.lineHeight), e.data.archived && (u += s.sectionSpacing, u += s.valueFontSize * s.lineHeight), r.clickActive && r.clickedNode && r.clickedNode.type === "contributor" && ((h = r.clickedNode.data.links_original) != null && h.find((d) => d.repo === e.id)) && (u += 28, u += 11 * i, u += 16, u += 11.5 * i, u += 18, u += 11 * i), u += 18, u += 12, Math.ceil(u);
}
function mr(e, r, a, l, c, n, g, s) {
  var I;
  const i = me;
  let u = 0;
  $(e, 14 * c, 700, "normal");
  let h = e.measureText(r.data.owner).width * 1.25;
  h > u && (u = h), h = e.measureText(r.data.name).width * 1.25, h > u && (u = h), $(e, 11 * c, 400, "normal"), h = e.measureText(`Created in ${n(r.data.createdAt)}`).width * 1.25, h > u && (u = h), h = e.measureText(`Last updated in ${n(r.data.updatedAt)}`).width * 1.25, h > u && (u = h), $(e, i.headerFontSize * c, 400, "normal");
  const k = r.data.stars < 10 ? String(r.data.stars) : s(r.data.stars), d = r.data.forks < 10 ? String(r.data.forks) : s(r.data.forks), p = (r.data.watchers || 0) < 10 ? String(r.data.watchers || 0) : s(r.data.watchers || 0);
  if (h = e.measureText(`${k} stars | ${d} forks | ${p} watchers`).width * 1.25, h > u && (u = h), r.data.languages && r.data.languages.length > 0) {
    $(e, i.valueFontSize * c, 400, "normal");
    let C = "";
    const N = Pe(3, r.data.languages.length);
    for (let m = 0; m < N; m++)
      C += `${r.data.languages[m]}${m < N - 1 ? ", " : ""}`;
    h = e.measureText(C).width * 1.25, h > u && (u = h), r.data.languages.length > 3 && (h = e.measureText(`& ${r.data.languages.length - 3} more`).width * 1.25, h > u && (u = h));
  }
  if (r.data.totalContributors && r.data.totalContributors > 0) {
    $(e, i.valueFontSize * c, 400, "normal");
    const C = r.data.totalContributors, N = r.data.devseedContributors || 0, m = r.data.externalContributors || 0;
    h = e.measureText(`${C} contributors (${N} DevSeed, ${m} community)`).width * 1.25, h > u && (u = h);
    const v = r.data.communityRatio || 0, z = Math.round(v * 100), M = ht(v);
    h = e.measureText(`Community Health: ${z}% (${M})`).width * 1.25, h > u && (u = h), N === 1 && C > 0 && (h = e.measureText("⚠ Single DevSeed maintainer").width * 1.25, h > u && (u = h));
  }
  if (r.data.license && ($(e, i.valueFontSize * c, 400, "normal"), h = e.measureText(`License: ${r.data.license}`).width * 1.25, h > u && (u = h)), r.data.archived && ($(e, i.valueFontSize * c, 400, "italic"), h = e.measureText("📦 Archived").width * 1.25, h > u && (u = h)), a.clickActive && a.clickedNode && a.clickedNode.type === "contributor") {
    const C = (I = a.clickedNode.data.links_original) == null ? void 0 : I.find((N) => N.repo === r.id);
    if (C) {
      $(e, 11 * c, 400, "italic");
      const N = C.commit_count === 1 ? "1 commit by" : `${C.commit_count} commits by`;
      h = e.measureText(N).width * 1.25, h > u && (u = h), $(e, 11.5 * c, 700, "normal"), h = e.measureText(a.clickedNode.data.contributor_name).width * 1.25, h > u && (u = h), $(e, 11 * c, 400, "normal");
      let m = "";
      g(C.commit_sec_min) === g(C.commit_sec_max) ? m = `On ${g(C.commit_sec_max)}` : n(C.commit_sec_min) === n(C.commit_sec_max) ? m = `In ${n(C.commit_sec_max)}` : m = `Between ${n(C.commit_sec_min)} / ${n(C.commit_sec_max)}`, h = e.measureText(m).width * 1.25, h > u && (u = h);
    }
  }
  return u = u / c + 80, Math.max(u, 280);
}
function gr(e, r, a, l, c, n, g, s) {
  const { SF: i, REPO_CENTRAL: u, COLOR_BACKGROUND: h, COLOR_TEXT: k, COLOR_CONTRIBUTOR: d, COLOR_REPO: p, COLOR_OWNER: I, min: C } = a;
  let N = 1.2, m, v;
  const z = r.x, M = r.y + (r.y < 0 ? 1 : -1) * (r.max_radius ? r.max_radius : r.r);
  let D, T;
  if (r.type === "contributor" ? (D = r.data && r.data.orca_received ? 134 : 80, T = 280) : r.type === "owner" ? (D = 93, T = 280) : r.type === "repo" ? r.id === c.id ? (D = 80, T = 280) : (D = fr(r, l), T = mr(e, r, l, c, i, n, g, s)) : (D = 93, T = 280), r.type === "owner") {
    m = 11.5, $(e, m * i, 400, "normal"), r.text_lines = [], v = "", r.connected_node_cloud.forEach((re, S) => {
      let Y = `${re.data.name}${S < r.connected_node_cloud.length - 1 ? ", " : ""}`;
      e.measureText(`${v}${Y}`).width * 1.25 > 0.85 * T * i ? (r.text_lines.push(v), v = Y) : v += Y;
    }), v !== "" && r.text_lines.push(v), D += r.text_lines.length * (m * N);
    let W = 0;
    $(e, 15 * i, 700, "normal"), W = e.measureText(r.data.owner).width * 1.25, $(e, 11.5 * i, 400, "normal"), r.text_lines.forEach((re) => {
      let S = e.measureText(re).width * 1.25;
      S > W && (W = S);
    }), W + 40 * i > T * i && (T = W / i + 40);
  } else if (r.type === "contributor") {
    $(e, 15 * i, 700, "normal"), v = r.data ? r.data.contributor_name : r.author_name;
    let W = e.measureText(v).width * 1.25;
    W + 40 * i > T * i && (T = W / i + 40);
  }
  let q = r.y < 0 ? 20 : -D - 20;
  e.save(), e.translate(z * i, (M + q) * i);
  let x = 0, b = 0, Q;
  r.type === "contributor" ? Q = d : r.type === "repo" ? Q = p : r.type === "owner" && (Q = I);
  const E = h || "#f7f7f7", L = (x - T / 2) * i, V = b * i, ee = T * i, te = D * i;
  if (e.shadowBlur = 3 * i, e.shadowColor = "#d4d4d4", e.fillStyle = E, e.fillRect(L, V, ee, te), e.shadowBlur = 0, e.fillStyle = Q, e.fillRect((x - T / 2 - 1) * i, (b - 1) * i, (T + 2) * i, 6 * i), e.textAlign = "center", e.textBaseline = "middle", b = 18, m = 12, $(e, m * i, 400, "italic"), e.fillStyle = Q, v = "", r.id === c.id ? v = u : r.type === "contributor" ? v = "Contributor" : r.type === "repo" ? v = "Repository" : r.type === "owner" && (v = "Owner"), P(e, v, x * i, b * i, 2.5 * i), e.fillStyle = k, b += 18, r.id === c.id)
    m = 15, $(e, m * i, 700, "normal"), P(e, u, x * i, b * i, 1.25 * i);
  else if (r.type === "contributor")
    m = 16, $(e, m * i, 700, "normal"), v = r.data ? r.data.contributor_name : r.author_name, P(e, v, x * i, b * i, 1.25 * i);
  else if (r.type === "owner")
    m = 16, $(e, m * i, 700, "normal"), P(e, r.data.owner, x * i, b * i, 1.25 * i), b += 28, m = 11, e.globalAlpha = 0.6, $(e, m * i, 400, "italic"), P(e, "Included repositories", x * i, b * i, 2 * i), m = 11.5, b += m * N + 4, e.globalAlpha = 0.9, $(e, m * i, 400, "normal"), r.text_lines.forEach((W, re) => {
      P(e, W, x * i, b * i, 1.25 * i), b += m * N;
    });
  else if (r.type === "repo" && (m = 15, $(e, m * i, 700, "normal"), P(e, `${r.data.owner}/`, x * i, b * i, 1.25 * i), P(
    e,
    r.data.name,
    x * i,
    (b + N * m) * i,
    1.25 * i
  ), b += 24, m = 11, e.globalAlpha = 0.7, $(e, m * i, 400, "normal"), P(
    e,
    `Created in ${n(r.data.createdAt)}`,
    x * i,
    b * i,
    1.25 * i
  ), b += m * N, P(
    e,
    `Last updated in ${n(r.data.updatedAt)}`,
    x * i,
    b * i,
    1.25 * i
  ), b += 20, St(e, r.data, x, b, i, s), b = Bt(e, r.data, x, b, i), b = Ft(e, r.data, x, b, i), b = Ut(e, r.data, x, b, i), b = Gt(e, r.data, x, b, i), e.fillStyle = k, e.globalAlpha = 0.9, l.clickActive && l.clickedNode && l.clickedNode.type === "contributor")) {
    let W = l.clickedNode.data.links_original.find(
      (S) => S.repo === r.id
    );
    if (!W)
      return;
    let re = W.commit_count;
    b += 20, m = 11, e.globalAlpha = 0.6, $(e, m * i, 400, "italic"), v = re === 1 ? "1 commit by" : `${re} commits by`, P(e, v, x * i, b * i, 2 * i), b += 12, m = 11.5, e.globalAlpha = 0.9, $(e, m * i, 700, "normal"), P(
      e,
      l.clickedNode.data.contributor_name,
      x * i,
      b * i,
      1.25 * i
    ), b += 14, m = 11, e.globalAlpha = 0.6, $(e, m * i, 400, "normal"), g(W.commit_sec_min) === g(W.commit_sec_max) ? v = `On ${g(W.commit_sec_max)}` : n(W.commit_sec_min) === n(W.commit_sec_max) ? v = `In ${n(W.commit_sec_max)}` : v = `Between ${n(W.commit_sec_min)} / ${n(
      W.commit_sec_max
    )}`, P(e, v, x * i, b * i, 1.25 * i);
  }
  e.restore();
}
function _r(e, r, a, l, c = !1) {
  const { SF: n, REPO_CENTRAL: g, COLOR_TEXT: s, COLOR_BACKGROUND: i, COLOR_REPO_MAIN: u, PI: h } = a;
  if (e.fillStyle = s, e.lineWidth = 2 * n, e.textAlign = "center", r.id === l.id ? mt(e, n) : r.type === "contributor" ? _t(e, n) : r.type === "owner" ? gt(e, n) : ft(e, n), r.type === "contributor") {
    e.textBaseline = "middle", e.save(), e.translate(r.x * n, r.y * n), e.rotate(
      r.contributor_angle + (r.contributor_angle > h / 2 ? h : 0)
    ), e.translate(
      (r.contributor_angle > h / 2 ? -1 : 1) * (r.max_radius + 14) * n,
      0
    ), e.textAlign = r.contributor_angle > h / 2 ? "right" : "left";
    let k = r.data.contributor_lines.length, d = 1.2, p = 13;
    r.data.contributor_lines.forEach((I, C) => {
      let N = 0, m = (0 - (k - 1) * p * d / 2 + C * p * d) * n;
      if (r.data.orca_received) {
        let v = e.measureText(I).width * 1.25 + 8 * n, z = N - 6 * n;
        r.contributor_angle > h / 2 && (z = N + 4 * n - v), e.fillStyle = "#CF3F0230", e.fillRect(z, -10 * n + m, v, 20 * n), e.globalAlpha = 1, e.fillStyle = s;
      }
      P(e, I, N, m, 1.25 * n);
    }), e.restore();
  } else
    r.id === l.id ? (e.textBaseline = "middle", e.fillStyle = c ? u : i, c || (e.save(), e.beginPath(), e.arc(r.x * n, r.y * n, r.r * n, 0, 2 * h), e.clip()), r.data.owner && P(
      e,
      `${r.data.owner}/`,
      r.x * n,
      (r.y - 0.6 * 12) * n,
      1.25 * n
    ), P(e, r.label, r.x * n, (r.y + 0.9 * 12) * n, 1.25 * n), c || e.restore()) : r.type === "repo" ? (e.textBaseline = "bottom", e.strokeStyle = i, e.lineWidth = 4 * n, P(
      e,
      `${r.data.owner}/`,
      r.x * n,
      (r.y - r.r - 3 - 1.1 * 12) * n,
      1.25 * n,
      !0
    ), P(
      e,
      r.label,
      r.x * n,
      (r.y - r.r - 3) * n,
      1.25 * n,
      !0
    )) : (e.textBaseline = "bottom", e.strokeStyle = i, e.lineWidth = 4 * n, P(
      e,
      `${r.label}/`,
      r.x * n,
      (r.y - r.r - 3) * n,
      1.25 * n,
      !0
    ));
}
const fe = 1500, Me = {
  centralRadius: 35,
  // The radius of the central repository node
  innerRadiusFactor: 0.7,
  // The factor of RADIUS_CONTRIBUTOR outside of which inner repos are not allowed to go
  maxContributorWidth: 55,
  // The maximum width (at SF = 1) of the contributor name before it gets wrapped
  defaultSize: 1500
  // Default canvas size
};
function We(e, r, a, l, c, n) {
  e.width = a, e.height = l, e.style.width = `${c}px`, e.style.height = `${l / n}px`, r.lineJoin = "round", r.lineCap = "round";
}
function hr(e, r, a, l, c, n, g, s, i, u) {
  const { width: h, height: k, DEFAULT_SIZE: d, RADIUS_CONTRIBUTOR_NON_ORCA: p, ORCA_RING_WIDTH: I, round: C } = a, { nodes: N, remainingContributors: m } = c;
  l.PIXEL_RATIO = Math.max(2, window.devicePixelRatio), l.WIDTH = C(h * l.PIXEL_RATIO), l.HEIGHT = C(k * l.PIXEL_RATIO), We(e.canvas, r.context, l.WIDTH, l.HEIGHT, h, l.PIXEL_RATIO), We(e.canvas_click, r.context_click, l.WIDTH, l.HEIGHT, h, l.PIXEL_RATIO), We(e.canvas_hover, r.context_hover, l.WIDTH, l.HEIGHT, h, l.PIXEL_RATIO), l.SF = l.WIDTH / d;
  let v = p + I / 2 * 2;
  l.WIDTH / 2 < v * l.SF && (l.SF = l.WIDTH / (2 * v)), l.nodes_delaunay = N, l.delaunay = g.Delaunay.from(l.nodes_delaunay.map((z) => [z.x, z.y])), n && (l.delaunay_remaining = g.Delaunay.from(
    m.map((z) => [z.x, z.y])
  )), s(i, l.delaunay, l.nodes_delaunay, l.delaunay_remaining), u();
}
const pr = (e, r, a, l, c) => {
  const n = Math.PI, g = n * 2;
  let s = Math.round, i = Math.cos, u = Math.sin, h = Math.min, k = Math.max, d = Math.sqrt, p = r, I = Xt(), C, N, m, v, z, M, D, T, q, x, b = [], Q, E, L, V = Kt(), ee, te, W;
  const re = Me.centralRadius;
  let S, Y, ce;
  const De = Me.innerRadiusFactor, dt = Me.maxContributorWidth, Se = a;
  let ae = !1, ue = !1;
  const ye = se.background, yt = se.grenadier, Be = se.repoMain, Fe = se.repo, Ue = se.owner, be = se.contributor, ke = se.link, Ge = se.text, ie = document.createElement("canvas");
  ie.id = "canvas";
  const U = ie.getContext("2d"), le = document.createElement("canvas");
  le.id = "canvas-click";
  const Xe = le.getContext("2d"), oe = document.createElement("canvas");
  oe.id = "canvas-hover";
  const Te = oe.getContext("2d");
  e.appendChild(ie), e.appendChild(le), e.appendChild(oe), e.style.position = "relative", e.style["background-color"] = ye, Ee(ie), Ee(oe), Ee(le), Je(ie), Je(le), le.style.pointerEvents = "auto", le.style.zIndex = "1", oe.style.position = "absolute", oe.style.top = "0", oe.style.left = "0", oe.style.zIndex = "2", oe.style.pointerEvents = "auto";
  function Ee(o) {
    o.style.display = "block", o.style.margin = "0";
  }
  function Je(o) {
    o.style.position = "absolute", o.style.top = "0", o.style.left = "0", o.style.pointerEvents = "none", o.style.zIndex = "0", o.style.transition = "opacity 200ms ease-in";
  }
  let j = fe, K = fe, we = fe, ve = fe, F, ge, _e = d3.timeParse("%Y-%m-%dT%H:%M:%SZ"), he = d3.timeParse("%s"), bt = d3.timeFormat("%b %Y"), wt = d3.timeFormat("%b %d, %Y"), vt = d3.format(",.2s");
  const Ae = $t(d3), Ce = Lt(d3), Ie = xt(d3), Ye = Ht(d3), Ne = zt(d3);
  function G(o) {
    C = JSON.parse(JSON.stringify(o[0])), N = JSON.parse(JSON.stringify(o[1])), m = JSON.parse(JSON.stringify(o[2])), qe(), o[3] && (o[3][0].author_name !== void 0 ? (T = o[3], ae = !0, o[4] && (q = o[4], ue = !0)) : o[3][0].name !== void 0 && (q = o[3], ue = !0)), je(), ot(b, E, d3, J, d, k, h), nt(b, E, d3, J, d, k), L.x = L.fx = 0, L.y = L.fy = 0, Ke(), Q = at(
      b,
      E,
      d3,
      J,
      d,
      k,
      U,
      p,
      L,
      Ye,
      S,
      De
    ), ae && lt(
      T,
      d3,
      g,
      i,
      u,
      k,
      S,
      Y,
      ce,
      fe,
      Ie
    ), E = rt(E, b), G.resize(), Qe(), tt();
  }
  function Rt() {
    if (j === 0 || K === 0) {
      console.warn("draw() called with invalid canvas size:", { WIDTH: j, HEIGHT: K, width: we, height: ve, SF: F });
      return;
    }
    if (b.length === 0) {
      console.warn("draw() called with no nodes");
      return;
    }
    console.log("draw() called", { WIDTH: j, HEIGHT: K, SF: F, nodesCount: b.length, canvasWidth: ie.width, canvasHeight: ie.height }), U.fillStyle = ye, U.fillRect(0, 0, j, K), U.save(), U.translate(j / 2, K / 2), ae && (U.fillStyle = be, U.globalAlpha = 0.4, T.forEach((o) => {
      Oe(U, o.x, o.y, F, o.r);
    }), U.globalAlpha = 1), At(U, F), E.forEach((o) => {
      const _ = o.target.id || o.target, A = o.source.id || o.source;
      _ === p || A === p || o.source && o.target && typeof o.source.x == "number" && typeof o.source.y == "number" && typeof o.target.x == "number" && typeof o.target.y == "number" && isFinite(o.source.x) && isFinite(o.source.y) && isFinite(o.target.x) && isFinite(o.target.y) && Ze(U, F, o);
    }), b.forEach((o) => {
      o.id !== p && Ve(U, F, o);
    }), b.forEach((o) => {
      o.id !== p && $e(U, F, o);
    }), Q.forEach((o) => {
      o.id !== p && Le(U, o);
    }), U.restore();
  }
  G.resize = () => {
    console.log("chart.resize() called", { width: we, height: ve, nodesCount: b.length });
    const o = {
      canvas: ie,
      canvas_click: le,
      canvas_hover: oe
    }, _ = {
      context: U,
      context_click: Xe,
      context_hover: Te
    }, A = {
      width: we,
      height: ve,
      DEFAULT_SIZE: fe,
      RADIUS_CONTRIBUTOR_NON_ORCA: Y,
      ORCA_RING_WIDTH: ce,
      round: s
    }, f = {
      WIDTH: j,
      HEIGHT: K,
      PIXEL_RATIO: ge,
      SF: F,
      nodes_delaunay: te,
      delaunay: ee,
      delaunay_remaining: W
    }, H = {
      nodes: b,
      remainingContributors: T
    };
    j = f.WIDTH, K = f.HEIGHT, ge = f.PIXEL_RATIO, F = f.SF;
    const y = () => {
      j = f.WIDTH, K = f.HEIGHT, ge = f.PIXEL_RATIO, F = f.SF, te = f.nodes_delaunay, ee = f.delaunay, W = f.delaunay_remaining, Rt();
    };
    hr(
      o,
      _,
      A,
      f,
      H,
      ae,
      d3,
      ct,
      V,
      y
    ), j = f.WIDTH, K = f.HEIGHT, ge = f.PIXEL_RATIO, F = f.SF, te = f.nodes_delaunay, ee = f.delaunay, W = f.delaunay_remaining, console.log("chart.resize() completed", { WIDTH: j, HEIGHT: K, SF: F, nodesCount: b.length });
  };
  function qe() {
    if (!N || !m || !C) {
      console.error("applyFilters(): Original data not initialized");
      return;
    }
    v = JSON.parse(JSON.stringify(N)), jt(I) && (v = v.filter((f) => {
      if (f.repo === p)
        return !0;
      const H = f.repo.substring(0, f.repo.indexOf("/"));
      return qt(I, H);
    }));
    const o = new Set(v.map((f) => f.repo));
    z = m.filter((f) => o.has(f.repo)).map((f) => JSON.parse(JSON.stringify(f)));
    const _ = new Set(
      z.map((f) => f.author_name)
    );
    M = C.filter((f) => _.has(f.author_name)).map((f) => JSON.parse(JSON.stringify(f)));
    const A = new Set(
      M.map((f) => f.author_name)
    );
    z = z.filter((f) => A.has(f.author_name)), D = M, x = v, E = z, localStorage.getItem("debug-orca") === "true" && (console.debug("=== APPLY FILTERS ==="), console.debug(`Filters applied: ${I.organizations.join(", ") || "none"}`), console.debug(`Data before: ${C.length} contributors, ${N.length} repos, ${m.length} links`), console.debug(`Data after: ${M.length} contributors, ${v.length} repos, ${z.length} links`), console.debug("Visible repos:", v.map((f) => f.repo)), console.debug("Visible contributors:", M.map((f) => f.author_name)));
  }
  function je() {
    D.forEach((t) => {
      t.contributor_name = t.author_name, ue ? t.orca_received = !!q.find((w) => w.name === t.author_name) : t.orca_received = !1, t.color = be, _t(U), [t.contributor_lines, t.contributor_max_width] = Pt(
        U,
        t.contributor_name,
        dt
      ), delete t.contributor_name_top;
    }), x.forEach((t) => {
      t.forks = +t.repo_forks, t.stars = +t.repo_stars, t.watchers = +t.repo_watchers || 0, t.openIssues = +t.repo_open_issues || 0, t.license = t.repo_license || null, t.topics = t.repo_topics ? t.repo_topics.split(",").filter((w) => w !== "") : [], t.hasDiscussions = t.repo_has_discussions === "true" || t.repo_has_discussions === !0, t.archived = t.repo_archived === "true" || t.repo_archived === !0, t.totalContributors = +t.repo_total_contributors || 0, t.devseedContributors = +t.repo_devseed_contributors || 0, t.externalContributors = +t.repo_external_contributors || 0, t.communityRatio = +t.repo_community_ratio || 0, xe(t.createdAt) ? (t.createdAt = he(t.createdAt), t.updatedAt = he(t.repo_updatedAt)) : (t.createdAt = _e(t.repo_createdAt), t.updatedAt = _e(t.repo_updatedAt)), t.owner = t.repo.substring(0, t.repo.indexOf("/")), t.name = t.repo.substring(t.repo.indexOf("/") + 1), t.languages = t.repo_languages.split(","), t.languages = t.languages.filter((w) => w !== "" && w !== " "), t.color = Fe, delete t.repo_forks, delete t.repo_stars, delete t.repo_watchers, delete t.repo_open_issues, delete t.repo_license, delete t.repo_topics, delete t.repo_has_discussions, delete t.repo_archived, delete t.repo_total_contributors, delete t.repo_devseed_contributors, delete t.repo_external_contributors, delete t.repo_community_ratio, delete t.repo_createdAt, delete t.repo_updatedAt;
    }), E.forEach((t) => {
      t.contributor_name = t.author_name, t.commit_count = +t.commit_count, xe(t.commit_sec_min) ? (t.commit_sec_min = he(t.commit_sec_min), t.commit_sec_max = he(t.commit_sec_max)) : (t.commit_sec_min = _e(t.commit_sec_min), t.commit_sec_max = _e(t.commit_sec_max)), t.owner = t.repo.substring(0, t.repo.indexOf("/")), t.name = t.repo.substring(t.repo.indexOf("/") + 1), t.source = t.contributor_name, t.target = t.repo, delete t.author_name;
    }), ae && T.forEach((t) => {
      t.commit_count = +t.commit_count, xe(t.commit_sec_min) ? (t.commit_sec_min = he(t.commit_sec_min), t.commit_sec_max = he(t.commit_sec_max)) : (t.commit_sec_min = _e(t.commit_sec_min), t.commit_sec_max = _e(t.commit_sec_max)), t.type = "contributor", t.remaining_contributor = !0, t.color = be;
    }), D.forEach((t, w) => {
      b.push({
        id: t.contributor_name,
        type: "contributor",
        label: t.contributor_name,
        data: t
      });
    }), x.forEach((t, w) => {
      b.push({
        id: t.repo,
        type: "repo",
        label: t.name,
        data: t
      });
    }), D.forEach((t) => {
      t.links_original = E.filter((w) => J(w.source) === t.contributor_name), t.repos = t.links_original.map(
        (w) => x.find((O) => O.repo === w.repo)
      );
    }), x.forEach((t) => {
      t.links_original = E.filter((w) => J(w.target) === t.repo), t.contributors = t.links_original.map((w) => D.find((O) => O.contributor_name === w.contributor_name)).filter((w) => w !== void 0);
    }), x.forEach((t) => {
      t.orca_impacted = !1, t.links_original.forEach((w) => {
        D.find(
          (O) => O.contributor_name === w.contributor_name && O.orca_received === !0
        ) && (t.orca_impacted = !0);
      });
    }), L = b.find(
      (t) => t.type === "repo" && t.id === p
    );
    let o = b.filter(
      (t) => t.type === "repo" && b.filter(
        (w) => w.id !== t.id && w.type === "repo" && w.data.owner === t.data.owner
      ).length > 1
    ).map((t) => t.data);
    o = d3.group(o, (t) => t.owner), o = Array.from(o, ([t, w]) => ({
      owner: t,
      repos: w.map((O) => O.name),
      color: Ue,
      stars: d3.sum(w, (O) => O.stars),
      forks: d3.sum(w, (O) => O.forks)
    })), o.sort((t, w) => t.owner.toLowerCase() < w.owner.toLowerCase() ? -1 : t.owner.toLowerCase() > w.owner.toLowerCase() ? 1 : 0);
    const _ = o.length;
    o = o.filter((t) => b.filter((O) => O.type === "repo" && O.data.owner === t.owner).length === 0 ? (debugWarn(`Filtering out owner with no repos: ${t.owner}`), !1) : !0), localStorage.getItem("debug-orca") === "true" && _ !== o.length && console.debug(`Removed ${_ - o.length} owners with no repos`), localStorage.getItem("debug-orca") === "true" && (console.log("Owners:", o), console.log("Contributors:", D)), b.filter((t) => t.type === "repo").forEach((t) => {
      t.data.multi_repo_owner = !!o.find((w) => w.owner === t.data.owner);
    }), o.forEach((t, w) => {
      b.push({
        id: t.owner,
        type: "owner",
        label: t.owner,
        data: t
      });
    });
    let A = [], f = [];
    E.forEach((t) => {
      t.repo !== p && o.find((w) => w.owner === t.owner) && (A.push({
        source: t.owner,
        target: t.repo,
        owner: t.owner,
        // name: d.name,
        // repo: d.repo,
        commit_count: t.commit_count,
        commit_sec_min: t.commit_sec_min,
        commit_sec_max: t.commit_sec_max
      }), f.push({
        source: t.contributor_name,
        target: t.owner,
        owner: t.owner,
        commit_count: t.commit_count,
        commit_sec_min: t.commit_sec_min,
        commit_sec_max: t.commit_sec_max
      }), t.to_remove = !0);
    }), E = E.filter((t) => t.to_remove !== !0), f = d3.group(
      f,
      (t) => t.source + "~" + t.target
    ), f = Array.from(
      f,
      ([t, w]) => {
        let [O, X] = t.split("~");
        return {
          source: O,
          target: X,
          owner: w[0].owner,
          commit_count: d3.sum(w, (B) => B.commit_count),
          commit_sec_min: d3.min(w, (B) => B.commit_sec_min),
          commit_sec_max: d3.max(w, (B) => B.commit_sec_max)
        };
      }
    ), A = d3.group(
      A,
      (t) => t.source + "~" + t.target
    ), A = Array.from(A, ([t, w]) => {
      let [O, X] = t.split("~");
      return {
        source: O,
        target: X,
        owner: w[0].owner,
        commit_count: d3.sum(w, (B) => B.commit_count),
        commit_sec_min: d3.min(w, (B) => B.commit_sec_min),
        commit_sec_max: d3.max(w, (B) => B.commit_sec_max)
      };
    }), E = [...E, ...A, ...f], E = E.filter((t) => !t.source || typeof t.source != "string" || t.source.trim() === "" ? (localStorage.getItem("debug-orca") === "true" && console.warn(`Filtered link with empty source: → "${t.target}"`), !1) : !t.target || typeof t.target != "string" || t.target.trim() === "" ? (localStorage.getItem("debug-orca") === "true" && console.warn(`Filtered link with empty target: "${t.source}" →`), !1) : !0);
    const H = new Set(b.map((t) => t.id));
    E = E.filter((t) => {
      const w = H.has(t.source), O = H.has(t.target);
      return !w || !O ? (localStorage.getItem("debug-orca") === "true" && console.warn(`Filtered invalid link: "${t.source}" → "${t.target}"`, {
        sourceNodeExists: w,
        targetNodeExists: O
      }), !1) : !0;
    }), L.data.owner && L.data.owner.trim() !== "" && E.push({
      source: L.data.owner,
      target: L.id,
      owner: L.data.owner,
      commit_count: d3.sum(
        E.filter((t) => J(t.target) === L.id),
        (t) => t.commit_count
      ),
      commit_sec_min: d3.min(
        E.filter((t) => J(t.target) === L.id),
        (t) => t.commit_sec_min
      ),
      commit_sec_max: d3.max(
        E.filter((t) => J(t.target) === L.id),
        (t) => t.commit_sec_max
      )
    }), localStorage.getItem("debug-orca") === "true" && console.log("Links:", E), o.forEach((t) => {
      let w = E.filter((O) => J(O.target) === t.owner);
      t.single_contributor = w.length === 1, t.repos = b.filter((O) => O.type === "repo" && O.data.owner === t.owner).map((O) => O.data);
    });
    const y = x.map((t) => t.stars);
    y.length > 0 ? Ae.domain(d3.extent(y)) : Ae.domain([0, 10]);
    const R = E.filter((t) => J(t.target) === L.id);
    R.length > 0 ? Ce.domain(
      d3.extent(R, (t) => t.commit_count)
    ) : Ce.domain([1, 10]), E.length > 0 ? Ne.domain([1, 10, d3.max(E, (t) => t.commit_count)]) : Ne.domain([1, 10, 60]), Ie.domain([
      0,
      Ce.domain()[0]
    ]), b.forEach((t, w) => {
      if (t.index = w, t.data.index = w, t.degree = E.filter(
        (O) => J(O.source) === t.id || J(O.target) === t.id
      ).length, t.x = 0, t.y = 0, t.type === "contributor") {
        let O = E.find(
          (X) => J(X.source) === t.id && J(X.target) === L.id
        );
        t.data.link_central = O, t.r = Ce(t.data.link_central.commit_count);
      } else
        t.type, t.r = Ae(t.data.stars);
      t.color = t.data.color;
    }), b.sort((t, w) => t.type === w.type ? t.data.link_central && w.data.link_central ? t.data.link_central.commit_sec_min < w.data.link_central.commit_sec_min ? -1 : t.data.link_central.commit_sec_min > w.data.link_central.commit_sec_min ? 1 : 0 : 0 : t.type < w.type ? -1 : t.type > w.type ? 1 : 0), L.r = re, L.padding = re, L.special_type = "central", L.color = Be;
  }
  function Ke() {
    const o = b.filter((R) => R.type === "contributor");
    o.forEach((R) => {
      (!R.max_radius || !isFinite(R.max_radius) || R.max_radius <= 0) && (R.max_radius = R.r || 20), R.connected_single_repo || (R.connected_single_repo = []);
    });
    let _ = o.reduce((R, t) => R + t.max_radius * 2, 0);
    _ += D.length * Se, S = _ / g;
    const A = Math.max(200, o.length * 15);
    let f = !1;
    (!isFinite(S) || S < A) && (console.warn(`RADIUS_CONTRIBUTOR too small (${S}), using minimum ${A}`), S = A, f = !0), Y = S * (ue ? 1.3 : 1), ce = (S * 2.3 / 2 - S) * 2;
    const H = g / o.length;
    console.log(`positionContributorNodes: ${o.length} contributors, sum_radius=${_}, RADIUS_CONTRIBUTOR=${S}, useEvenSpacing=${f}`);
    let y = 0;
    o.forEach((R, t) => {
      R.connected_single_repo && R.connected_single_repo.length > 0 && R.connected_single_repo.forEach((B) => {
        B.x -= R.x, B.y -= R.y;
      }), t < 3 && console.log(`Contributor ${t} "${R.id}": max_radius=${R.max_radius}, r=${R.r}, central_repo=(${L.fx}, ${L.fy})`);
      let w = R.max_radius * 2 + Se, O;
      f ? O = H / 2 : O = w / S / 2;
      let X = R.data.orca_received ? S : Y;
      R.x = L.fx + X * i(y + O - n / 2), R.y = L.fy + X * u(y + O - n / 2), R.contributor_angle = y + O - n / 2, y += f ? H : O * 2, R.fx = R.x, R.fy = R.y, R.connected_single_repo && R.connected_single_repo.length > 0 && R.connected_single_repo.forEach((B) => {
        B.x += R.x, B.y += R.y, B.fx = B.x, B.fy = B.y;
      });
    });
  }
  function At(o, _) {
    o.fillStyle = o.strokeStyle = yt;
    let A = ce, f = 4;
    o.lineWidth = 1.5 * _, ue && (o.beginPath(), o.moveTo(0 + (S + A / 2 - f) * _, 0), o.arc(0, 0, (S + A / 2 - f) * _, 0, g), o.moveTo(0 + (S - A / 2) * _, 0), o.arc(0, 0, (S - A / 2) * _, 0, g, !0), o.globalAlpha = 0.06, o.fill(), o.globalAlpha = 0.2), o.beginPath(), o.moveTo(0 + (Y + A / 2) * _, 0), o.arc(0, 0, (Y + A / 2) * _, 0, g), o.moveTo(0 + (Y - A / 2 + f) * _, 0), o.arc(
      0,
      0,
      (Y - A / 2 + f) * _,
      0,
      g,
      !0
    ), o.globalAlpha = ue ? 0.03 : 0.05, o.fill(), o.globalAlpha = 0.1, ue && (o.textAlign = "center", $(o, 16 * _, 700, "italic"), o.globalAlpha = 0.5, o.textBaseline = "bottom", it(
      o,
      "contributors supported through ORCA",
      g * 0.9,
      (S - (A / 2 - f - 2)) * _,
      "up",
      1.5 * _
    ), o.textBaseline = "top", it(
      o,
      "other top contributors",
      g * 0.9,
      (Y + (A / 2 - f - 2)) * _,
      "up",
      1.5 * _
    )), o.globalAlpha = 1;
  }
  function $e(o, _, A) {
    ar(o, _, A, { REPO_CENTRAL: p, COLOR_BACKGROUND: ye, max: k }, V);
  }
  function Ve(o, _, A) {
    lr(o, _, A, V, be, d3, L);
  }
  function Ct(o, _) {
    sr(o, _, F, L);
  }
  function Ze(o, _, A) {
    ur(o, _, A, { COLOR_LINK: ke }, V, kt, Ot, Ne);
  }
  function Ot(o, _ = 2, A = !0) {
    o.r = d(ne(o.target.x - o.source.x) + ne(o.target.y - o.source.y)) * _;
    let f = H(
      o.r,
      { x: o.source.x, y: o.source.y },
      { x: o.target.x, y: o.target.y }
    );
    o.sign = A, o.center = o.sign ? f.c2 : f.c1;
    function H(y, R, t) {
      let w = { x: 0.5 * (R.x + t.x), y: 0.5 * (R.y + t.y) }, O = -(t.y - R.y), X = t.x - R.x, B = d(ne(O) + ne(X));
      O /= B, X /= B;
      let pe = d(ne(w.x - R.x) + ne(w.y - R.y)) / y;
      if (pe < -1 || pe > 1)
        return null;
      let Re = d(1 - ne(pe)), de = y * Re, Et = { x: w.x + O * de, y: w.y + X * de }, It = { x: w.x - O * de, y: w.y - X * de };
      return { c1: Et, c2: It };
    }
  }
  function kt(o, _) {
    const A = d3.scaleLinear().domain([300, 800]).range([0.5, 0.2]).clamp(!0);
    let f;
    V.hoverActive ? f = _.target.special_type ? 0.3 : 0.7 : f = _.target.special_type ? 0.15 : A(E.length), H(_, f);
    function H(y, R) {
      var X, B, He, pe;
      let t, w, O;
      if (t = d3.rgb(y.source.color), w = "rgba(" + t.r + "," + t.g + "," + t.b + "," + R + ")", t = d3.rgb(y.target.color), O = "rgba(" + t.r + "," + t.g + "," + t.b + "," + R + ")", y.source && y.target && typeof y.source.x == "number" && typeof y.source.y == "number" && typeof y.target.x == "number" && typeof y.target.y == "number" && isFinite(y.source.x) && isFinite(y.source.y) && isFinite(y.target.x) && isFinite(y.target.y))
        try {
          y.gradient = o.createLinearGradient(
            y.source.x * F,
            y.source.y * F,
            y.target.x * F,
            y.target.y * F
          );
          let Re = d(
            ne(y.target.x - y.source.x) + ne(y.target.y - y.source.y)
          ), de = y.source.r / Re;
          y.gradient.addColorStop(de, w), y.gradient.addColorStop(1, O);
        } catch (Re) {
          localStorage.getItem("debug-orca") === "true" && console.warn("Gradient creation error:", Re, { link: y, sf: F }), y.gradient = ke;
        }
      else
        localStorage.getItem("debug-orca") === "true" && console.warn("Invalid coordinates for gradient", {
          sourceX: (X = y.source) == null ? void 0 : X.x,
          sourceY: (B = y.source) == null ? void 0 : B.y,
          targetX: (He = y.target) == null ? void 0 : He.x,
          targetY: (pe = y.target) == null ? void 0 : pe.y
        }), y.gradient = ke;
    }
  }
  function Qe() {
    const o = {
      PIXEL_RATIO: ge,
      WIDTH: j,
      HEIGHT: K,
      SF: F,
      RADIUS_CONTRIBUTOR_NON_ORCA: Y,
      ORCA_RING_WIDTH: ce,
      sqrt: d
    }, _ = {
      get delaunay() {
        return ee;
      },
      set delaunay(A) {
        ee = A;
      },
      get nodesDelaunay() {
        return te;
      },
      set nodesDelaunay(A) {
        te = A;
      },
      get delaunayRemaining() {
        return W;
      },
      set delaunayRemaining(A) {
        W = A;
      }
    };
    rr(
      d3,
      "#canvas-hover",
      o,
      _,
      V,
      p,
      ie,
      Te,
      ae,
      T,
      Vt,
      st,
      et
    );
  }
  function et(o, _, A = !0) {
    o.save(), o.clearRect(0, 0, j, K), o.translate(j / 2, K / 2), _.neighbor_links === void 0 && (_.neighbor_links = E.filter(
      (f) => {
        const H = f.target.id || f.target, y = f.source.id || f.source;
        return H === p || y === p ? !1 : f.source.id === _.id || f.target.id === _.id;
      }
    )), _.neighbors === void 0 && (_.neighbors = b.filter((f) => f.id === p ? !1 : E.find(
      (H) => {
        const y = H.target.id || H.target, R = H.source.id || H.source;
        return y === p || R === p ? !1 : H.source.id === _.id && H.target.id === f.id || H.target.id === _.id && H.source.id === f.id;
      }
    )), (_.type === "contributor" || _.type === "repo" && _ !== L) && (_.neighbors.forEach((f) => {
      f && f.type === "owner" && _.data && _.data.links_original && _.data.links_original.forEach((H) => {
        if (H.owner === f.id) {
          let y, R;
          if (_.type === "contributor") {
            if (y = b.find((t) => t.id === H.repo), !y)
              return;
            R = E.find(
              (t) => t.source.id === f.id && t.target.id === y.id
            );
          } else if (_.type === "repo") {
            if (y = b.find((t) => t.id === H.contributor_name), !y)
              return;
            R = E.find(
              (t) => t.source.id === y.id && t.target.id === f.id
            );
          }
          y && (_.neighbors.push(y), R && _.neighbor_links.push(R));
        }
      });
    }), _.neighbor_links = _.neighbor_links.filter(
      (f) => !(f.target.id === L.id && f.source.id === L.data.owner)
    ))), _.neighbor_links && _.neighbor_links.forEach((f) => {
      f && f.source && f.target && Ze(o, F, f);
    }), _.neighbors && (_.neighbors.forEach((f) => {
      f && Ve(o, F, f);
    }), _.neighbors.forEach((f) => {
      f && $e(o, F, f);
    }), _.neighbors.forEach((f) => {
      f && f.node_central && Le(o, f);
    })), $e(o, F, _), Ct(o, _), _.node_central && _.type === "contributor" && Le(o, _), A && Tt(o, _), o.restore();
  }
  function tt() {
    const o = {
      PIXEL_RATIO: ge,
      WIDTH: j,
      HEIGHT: K,
      SF: F,
      RADIUS_CONTRIBUTOR_NON_ORCA: Y,
      ORCA_RING_WIDTH: ce,
      sqrt: d
    }, _ = {
      get delaunay() {
        return ee;
      },
      set delaunay(A) {
        ee = A;
      },
      get nodesDelaunay() {
        return te;
      },
      set nodesDelaunay(A) {
        te = A;
      },
      get delaunayRemaining() {
        return W;
      },
      set delaunayRemaining(A) {
        W = A;
      }
    };
    ir(
      d3,
      "#canvas-hover",
      // Use hover canvas for clicks too since it's on top
      o,
      _,
      V,
      p,
      ie,
      Xe,
      Te,
      b,
      ae,
      T,
      Zt,
      Qt,
      st,
      ct,
      et
    );
  }
  function Tt(o, _) {
    gr(o, _, {
      SF: F,
      REPO_CENTRAL: p,
      COLOR_BACKGROUND: ye,
      COLOR_TEXT: Ge,
      COLOR_CONTRIBUTOR: be,
      COLOR_REPO: Fe,
      COLOR_OWNER: Ue,
      min: h
    }, V, L, bt, wt, vt);
  }
  function Le(o, _, A = !1) {
    _r(o, _, {
      SF: F,
      REPO_CENTRAL: p,
      COLOR_TEXT: Ge,
      COLOR_BACKGROUND: ye,
      COLOR_REPO_MAIN: Be,
      PI: n
    }, L, A);
  }
  function ne(o) {
    return o * o;
  }
  function xe(o) {
    return /^\d+$/.test(o);
  }
  return G.width = function(o) {
    return arguments.length ? (we = o, G) : we;
  }, G.height = function(o) {
    return arguments.length ? (ve = o, G) : ve;
  }, G.repository = function(o) {
    return arguments.length ? (p = o, G) : p;
  }, G.rebuild = function() {
    b = [], E = [], Q = [], er(V), tr(V), te = [], ee = null, W = null, qe(), je(), L.x = L.fx = 0, L.y = L.fy = 0, ot(b, E, d3, J, d, k, h), nt(b, E, d3, J, d, k), Ke(), Q = at(
      b,
      E,
      d3,
      J,
      d,
      k,
      U,
      p,
      L,
      Ye,
      S,
      De
    ), ae && lt(
      T,
      d3,
      g,
      i,
      u,
      k,
      S,
      Y,
      ce,
      fe,
      Ie
    ), E = rt(E, b);
    const o = b.filter(
      (_) => _.x === 0 && _.y === 0 && _.id !== p
    );
    if (o.length > 0) {
      const _ = b.filter((y) => y.type === "contributor").length, A = b.filter((y) => y.type === "repo").length;
      let f = 0, H = 0;
      o.forEach((y) => {
        if (y.type === "contributor") {
          const R = f / Math.max(1, _) * Math.PI * 2, t = 250;
          y.x = Math.cos(R) * t, y.y = Math.sin(R) * t, y.r || (y.r = 6), f++;
        } else if (y.type === "repo") {
          const R = H / Math.max(1, A) * Math.PI * 2, t = 150 + Math.random() * 50;
          y.x = Math.cos(R) * t, y.y = Math.sin(R) * t, y.r || (y.r = 8), H++;
        } else if (y.type === "owner") {
          const R = H / 5 * Math.PI * 2, t = 50;
          y.x = Math.cos(R) * t, y.y = Math.sin(R) * t, y.r || (y.r = 15);
        }
      }), localStorage.getItem("debug-orca") === "true" && console.debug(`Positioned ${o.length} unpositioned nodes in rings by type`);
    }
    return E.forEach((_) => {
      _.source && _.target && ((typeof _.source.x != "number" || typeof _.source.y != "number" || !isFinite(_.source.x) || !isFinite(_.source.y)) && (_.source.x = 0, _.source.y = 0), (typeof _.target.x != "number" || typeof _.target.y != "number" || !isFinite(_.target.x) || !isFinite(_.target.y)) && (_.target.x = 0, _.target.y = 0));
    }), Qe(), tt(), G.resize(), G;
  }, G.setFilter = function(o, _) {
    return _ ? Jt(I, o) : Yt(I, o), G.rebuild(), G;
  }, G.getActiveFilters = function() {
    return { ...I };
  }, G.getNodes = function() {
    return b;
  }, G.getLinks = function() {
    return E;
  }, G.getDebugState = function() {
    const o = E.filter(
      (f) => f.source && f.target && typeof f.source == "object" && typeof f.target == "object"
    ), _ = o.filter((f) => {
      const H = f.target.id || f.target, y = f.source.id || f.source;
      return H !== p && y !== p;
    }), A = _.filter(
      (f) => f.source && f.target && typeof f.source.x == "number" && typeof f.source.y == "number" && typeof f.target.x == "number" && typeof f.target.y == "number" && isFinite(f.source.x) && isFinite(f.source.y) && isFinite(f.target.x) && isFinite(f.target.y)
    );
    return {
      nodesCount: b.length,
      linksCount: E.length,
      nodeTypes: b.reduce((f, H) => (f[H.type] = (f[H.type] || 0) + 1, f), {}),
      validLinks: o.length,
      linksToBeDrawn: _.length,
      linksWithValidCoordinates: A.length,
      activeFilters: { ...I }
    };
  }, G;
};
typeof window < "u" && (window.createORCAVisual = pr);
export {
  pr as createORCAVisual
};
