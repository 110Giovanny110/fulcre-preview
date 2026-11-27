// Fulcre · fundo Cristal (Direção H): tetraedro dourado, esfera de linhas e estrelas
(function () {
  'use strict';
  var host = document.getElementById('crys');
  if (!host) return;
  // 26/11 (pedido do dono): o 3D gira para todo mundo, sem olhar o "reduzir movimento" do sistema.
  if (!window.THREE) { host.classList.add('nogl'); return; }
  var T = window.THREE, r;
  try { r = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch (e) { host.classList.add('nogl'); return; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  host.appendChild(r.domElement);
  var scene = new T.Scene();
  var cam = new T.PerspectiveCamera(35, 1, 0.1, 100); cam.position.set(0, 0, 11);
  var group = new T.Group(); scene.add(group);
  var geo = new T.TetrahedronGeometry(1.5, 0);
  var tet = new T.Mesh(geo, new T.MeshPhongMaterial({ color: 0xb8904f, specular: 0xffe7b8, shininess: 70, emissive: 0x140d04, flatShading: true }));
  group.add(tet);
  tet.add(new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0.7 })));
  var shell = new T.LineSegments(new T.EdgesGeometry(new T.IcosahedronGeometry(6.5, 2)), new T.LineBasicMaterial({ color: 0x5b82ff, transparent: true, opacity: 0.12 }));
  group.add(shell);
  var n = innerWidth < 700 ? 900 : 1600, arr = new Float32Array(n * 3);
  for (var i = 0; i < n; i++) { var rr = 3 + Math.random() * 12, a = Math.random() * 6.28, b = Math.acos(2 * Math.random() - 1); arr.set([rr * Math.sin(b) * Math.cos(a), rr * Math.sin(b) * Math.sin(a), rr * Math.cos(b)], i * 3); }
  var pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(arr, 3));
  var dots = new T.Points(pg, new T.PointsMaterial({ color: 0xbfcaf0, size: 0.03, transparent: true, opacity: 0.7 }));
  group.add(dots);
  scene.add(new T.AmbientLight(0x2a3358, 0.5));
  var l1 = new T.PointLight(0x6f92ff, 1.1, 30); l1.position.set(-5, 3, 4); scene.add(l1);
  var l2 = new T.PointLight(0xffd59a, 1.0, 30); l2.position.set(5, -2, 5); scene.add(l2);
  var l3 = new T.DirectionalLight(0xffffff, 0.45); l3.position.set(0, 5, 5); scene.add(l3);
  var tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener('mousemove', function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  function fit() { var w = host.clientWidth, h = host.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  fit(); addEventListener('resize', fit);
  var t = 0;
  (function loop() {
    t += 0.006;
    group.position.y = Math.min(scrollY / innerHeight, 3) * 1.2;
    var wide = innerWidth > 900;
    tet.position.set(wide ? 7.2 : 0, wide ? 1.6 : 4.2, -6);
    cx += (tx - cx) * 0.05; cy += (ty - cy) * 0.05;
    tet.rotation.x = t * 0.9 + cy * 1.2; tet.rotation.y = t * 1.3 + cx * 1.6;
    shell.rotation.y = -t * 0.4; shell.rotation.x = t * 0.2;
    dots.rotation.y = t * 0.15 + cx * 0.3;
    l1.position.x = -5 + Math.sin(t * 2) * 2;
    r.render(scene, cam);
    requestAnimationFrame(loop);
  })();
})();
