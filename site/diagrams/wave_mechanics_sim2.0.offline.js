(()=>{window.addEventListener("DOMContentLoaded",()=>{katex.render("\\text{Frequency } (\\omega)",document.getElementById("tex-freq")),katex.render("\\text{Wave Speed } (v)",document.getElementById("tex-speed")),katex.render("\\nabla^2 f = \\frac{1}{v^2} \\frac{\\partial^2 f}{\\partial t^2}",document.getElementById("tex-laplacian")),i("plane")});function i(e){let t=document.getElementById("math-formula"),n=document.getElementById("desc-title"),l=document.getElementById("desc-text");e==="plane"?(katex.render("f(\\vec{r},t) = A\\cos(\\vec{k}\\cdot\\vec{r} - \\omega t)",t),n.innerText="Plane Wave:",l.innerText="Wavefronts are parallel planes. Amplitude does not decay."):(katex.render("f(\\vec{r},t) = \\frac{A}{r}\\cos(kr - \\omega t)",t),n.innerText="Spherical Wave:",l.innerText="Energy spreads over 4\u03C0r\xB2. Amplitude decays as 1/r.")}var c=new THREE.Scene,o=new THREE.PerspectiveCamera(40,1,.1,1e3);o.position.set(15,12,15);o.lookAt(0,-2,0);var r=new THREE.WebGLRenderer({antialias:!0});document.body.appendChild(r.domElement);function d(){let e=r.domElement.getBoundingClientRect(),t=Math.max(1,Math.floor(e.width)),n=Math.max(1,Math.floor(e.height));o.aspect=t/n,o.updateProjectionMatrix(),r.setSize(t,n,!1)}var m=new THREE.PlaneGeometry(22,22,128,128);m.rotateX(-Math.PI/2);var a=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uFreq:{value:2},uK:{value:1.33},uMode:{value:0}},vertexShader:`
                uniform float uTime;
                uniform float uFreq;
                uniform float uK;
                uniform float uMode;
                varying float vH;

                void main() {
                    vec3 p = position;
                    float h = 0.0;
                    if (uMode < 0.5) {
                        h = 1.0 * cos(uK * p.x - uFreq * uTime);
                    } else {
                        float r = length(p.xz) + 0.2;
                        h = (2.8 / r) * cos(uK * r - uFreq * uTime);
                        h = clamp(h, -4.0, 4.0);
                    }
                    p.y = h;
                    vH = h;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
                }
            `,fragmentShader:`
                varying float vH;
                void main() {
                    vec3 c = mix(vec3(0.05, 0.08, 0.15), vec3(0.2, 0.5, 1.0), vH * 0.4 + 0.5);
                    gl_FragColor = vec4(c, 1.0);
                }
            `,wireframe:!0}),s=new THREE.Mesh(m,a);c.add(s);var v=document.getElementById("i-freq"),f=document.getElementById("i-speed");document.getElementById("btn-plane").onclick=e=>{a.uniforms.uMode.value=0,e.target.className="active",document.getElementById("btn-sphere").className="",i("plane")};document.getElementById("btn-sphere").onclick=e=>{a.uniforms.uMode.value=1,e.target.className="active",document.getElementById("btn-plane").className="",i("sphere")};var p=new THREE.Clock;function u(){requestAnimationFrame(u);let e=p.getElapsedTime(),t=parseFloat(v.value),n=parseFloat(f.value);document.getElementById("val-freq").innerText=t.toFixed(1),document.getElementById("val-speed").innerText=n.toFixed(1),a.uniforms.uTime.value=e,a.uniforms.uFreq.value=t,a.uniforms.uK.value=t/n,s.rotation.y=Math.sin(e*.1)*.03,r.render(c,o)}u();window.addEventListener("resize",()=>{d()});d();})();
