import { useEffect, useRef, useState } from "react";
import "./monogram-scene.css";

function MonogramFallback() {
  return (
    <svg className="monogram-fallback" viewBox="0 0 600 600" aria-hidden="true">
      <defs>
        <linearGradient id="monogram-ivory" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f2f0df" />
          <stop offset="1" stopColor="#acb39e" />
        </linearGradient>
        <linearGradient id="monogram-orange" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ff9d5b" />
          <stop offset="1" stopColor="#e34d23" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#b7bd9e" strokeWidth="1" opacity=".35">
        <ellipse
          cx="301"
          cy="300"
          rx="230"
          ry="104"
          transform="rotate(-31 301 300)"
        />
        <path d="M130 432c-73-131-63-251 22-293M443 458c48-41 72-119 51-205" />
        <path d="M84 294h18m-9-9v18m403 36h18m-9-9v18" />
      </g>
      <g transform="rotate(-12 300 300)">
        <path
          d="M271 163 444 214 444 409 396 436 396 246 225 198Z"
          fill="#983c21"
        />
        <path
          d="M225 198 396 246 396 436 340 420 340 286 225 255Z"
          fill="url(#monogram-orange)"
        />
        <path
          d="M170 154 225 135 225 342 341 373 341 431 285 450 170 412Z"
          fill="#818a76"
        />
        <path
          d="M170 154 225 169 225 356 341 387 341 443 170 397Z"
          fill="url(#monogram-ivory)"
        />
        <path d="M170 154 225 135 278 151 225 169Z" fill="#f0f0de" />
        <path d="M225 356 278 338 392 370 341 387Z" fill="#e6e8d4" />
        <circle cx="194" cy="191" r="4" fill="#5b634f" />
        <circle cx="308" cy="408" r="4" fill="#5b634f" />
      </g>
      <circle cx="471" cy="204" r="12" fill="url(#monogram-orange)" />
      <circle cx="113" cy="369" r="5" fill="#d6ddc4" />
    </svg>
  );
}

export default function MonogramScene({
  paused = false,
  active = true,
  finish = "alloy",
  separation = 0,
  impulse = 0,
  onReady,
}) {
  const hostRef = useRef(null);
  const controlsRef = useRef(null);
  const propsRef = useRef({ paused, active, finish, separation, impulse });
  const onReadyRef = useRef(onReady);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    propsRef.current = { paused, active, finish, separation, impulse };
    controlsRef.current?.synchronize();
  }, [paused, active, finish, separation, impulse]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const host = hostRef.current;
    let disposed = false;
    let renderer;
    let environmentTarget;
    let resizeObserver;
    let intersectionObserver;
    let frameId = 0;
    const removeListeners = [];
    const geometries = new Set();
    const materials = new Set();

    function listen(target, name, handler, options) {
      target.addEventListener(name, handler, options);
      removeListeners.push(() =>
        target.removeEventListener(name, handler, options),
      );
    }

    function releaseResources() {
      cancelAnimationFrame(frameId);
      frameId = 0;
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      removeListeners.splice(0).forEach((remove) => remove());
      controlsRef.current = null;
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      geometries.clear();
      materials.clear();
      environmentTarget?.dispose();
      environmentTarget = undefined;
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        renderer = undefined;
      }
      host?.classList.remove("is-dragging");
    }

    async function initialize() {
      const [THREE, { RoomEnvironment }] = await Promise.all([
        import("three"),
        import("three/addons/environments/RoomEnvironment.js"),
      ]);
      if (disposed || !host) return;

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      renderer.setPixelRatio(pixelRatio);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 90);
      const geometry = (value) => {
        geometries.add(value);
        return value;
      };
      const material = (value) => {
        materials.add(value);
        return value;
      };

      function createEnvironment() {
        const room = new RoomEnvironment();
        const pmrem = new THREE.PMREMGenerator(renderer);
        try {
          environmentTarget?.dispose();
          environmentTarget = pmrem.fromScene(room, 0.04);
          scene.environment = environmentTarget.texture;
        } finally {
          room.dispose();
          pmrem.dispose();
        }
      }
      createEnvironment();

      const ambient = new THREE.HemisphereLight(0xf8f3df, 0x333b2b, 2);
      const keyLight = new THREE.DirectionalLight(0xfff4df, 4);
      keyLight.position.set(-3, 5, 5);
      const edgeLight = new THREE.DirectionalLight(0xff8051, 2);
      edgeLight.position.set(4, 0, -3);
      scene.add(ambient, keyLight, edgeLight);

      const surface = (color) =>
        material(
          new THREE.MeshPhysicalMaterial({
            color,
            metalness: 0.62,
            roughness: 0.24,
            clearcoat: 0.7,
            clearcoatRoughness: 0.18,
          }),
        );
      const ivory = surface(0xe5e7d3);
      const ivorySide = surface(0xa8b098);
      const orange = surface(0xff632f);
      const orangeSide = surface(0xc0431f);
      const graphite = surface(0x31362b);
      const accent = material(
        new THREE.MeshStandardMaterial({
          color: 0xb9be9c,
          metalness: 0.7,
          roughness: 0.3,
        }),
      );
      const fineLine = material(
        new THREE.LineBasicMaterial({
          color: 0xc2c9b0,
          transparent: true,
          opacity: 0.35,
        }),
      );
      const blueprintLine = material(
        new THREE.LineBasicMaterial({
          color: 0x9de9ff,
          transparent: true,
          opacity: 0.85,
        }),
      );
      const sculpture = new THREE.Group();
      scene.add(sculpture);
      const parts = [];
      const outlines = [];

      function addPart(mesh, home, travel, twist = 0) {
        mesh.position.set(...home);
        sculpture.add(mesh);
        parts.push({
          mesh,
          home: new THREE.Vector3(...home),
          travel: new THREE.Vector3(...travel),
          twist,
          rotation: mesh.rotation.clone(),
        });
        return mesh;
      }

      // Four machined components assemble into two opposing Ls. Their small
      // seams become genuine separation points when the visitor takes it apart.
      function machinedBlock(width, height, depth) {
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, -height / 2);
        shape.lineTo(width / 2, -height / 2);
        shape.lineTo(width / 2, height / 2);
        shape.lineTo(-width / 2, height / 2);
        shape.closePath();
        const block = geometry(
          new THREE.ExtrudeGeometry(shape, {
            depth,
            bevelEnabled: true,
            bevelThickness: 0.055,
            bevelSize: 0.055,
            bevelSegments: 3,
            steps: 1,
            curveSegments: 1,
          }),
        );
        block.translate(0, 0, -depth / 2);
        return block;
      }
      const stemGeometry = machinedBlock(0.55, 2.66, 0.62);
      const footGeometry = machinedBlock(1.17, 0.54, 0.62);
      const specifications = [
        [
          stemGeometry,
          [ivory, ivorySide],
          [-0.94, -0.1, 0.38],
          [-0.8, 0.32, 0.48],
          -0.1,
        ],
        [
          footGeometry,
          [ivory, ivorySide],
          [0.01, -1.16, 0.38],
          [0.18, -0.66, 0.7],
          0.14,
        ],
        [
          stemGeometry,
          [orange, orangeSide],
          [0.94, 0.1, -0.38],
          [0.8, -0.32, -0.48],
          -0.1,
        ],
        [
          footGeometry,
          [orange, orangeSide],
          [-0.01, 1.16, -0.38],
          [-0.18, 0.66, -0.7],
          0.14,
        ],
      ];
      for (const [shape, surfaces, home, travel, twist] of specifications) {
        const part = addPart(
          new THREE.Mesh(shape, surfaces),
          home,
          travel,
          twist,
        );
        const outline = new THREE.LineSegments(
          geometry(new THREE.EdgesGeometry(shape, 25)),
          blueprintLine,
        );
        outline.visible = false;
        part.add(outline);
        outlines.push(outline);
      }
      const boltGeometry = geometry(
        new THREE.CylinderGeometry(0.043, 0.043, 0.025, 12),
      );
      for (const [x, y, z, direction] of [
        [-0.94, 1.0, 0.76, 1],
        [-0.94, -1.13, 0.76, 1],
        [0.36, -1.16, 0.76, 1],
        [0.94, -1.0, -0.76, -1],
        [0.94, 1.13, -0.76, -1],
        [-0.36, 1.16, -0.76, -1],
      ]) {
        const bolt = new THREE.Mesh(boltGeometry, graphite);
        bolt.rotation.x = Math.PI / 2;
        addPart(
          bolt,
          [x, y, z],
          [Math.sign(x) * 0.85, Math.sign(y) * 0.5, direction * 1.24],
        );
      }

      const orbit = new THREE.Group();
      orbit.rotation.set(1.1, 0.15, -0.38);
      scene.add(orbit);
      const ring = new THREE.Mesh(
        geometry(new THREE.TorusGeometry(2.32, 0.012, 6, 160)),
        accent,
      );
      orbit.add(ring);
      const tickPositions = [];
      for (let i = 0; i < 96; i += 1) {
        const angle = (i / 96) * Math.PI * 2;
        const inner = 2.39;
        const outer = inner + (i % 8 === 0 ? 0.13 : 0.045);
        tickPositions.push(Math.cos(angle) * inner, Math.sin(angle) * inner, 0);
        tickPositions.push(Math.cos(angle) * outer, Math.sin(angle) * outer, 0);
      }
      const tickGeometry = geometry(new THREE.BufferGeometry());
      tickGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(tickPositions, 3),
      );
      orbit.add(new THREE.LineSegments(tickGeometry, fineLine));
      const satellite = new THREE.Mesh(
        geometry(new THREE.SphereGeometry(0.13, 20, 12)),
        orange,
      );
      const secondSatellite = new THREE.Mesh(
        geometry(new THREE.OctahedronGeometry(0.075)),
        ivory,
      );
      orbit.add(satellite, secondSatellite);
      const arc = new THREE.Mesh(
        geometry(new THREE.TorusGeometry(2.58, 0.005, 4, 100, Math.PI * 1.18)),
        accent,
      );
      arc.rotation.set(0.3, 1.0, -0.4);
      scene.add(arc);

      // A deterministic field of softly circular point sprites needs no textures.
      let seed = 47;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
      const starPositions = [];
      const starSizes = [];
      for (let i = 0; i < 180; i += 1) {
        starPositions.push(
          (random() - 0.5) * 28,
          (random() - 0.5) * 17,
          -random() * 24,
        );
        starSizes.push(0.4 + random() * 1.5);
      }
      const starGeometry = geometry(new THREE.BufferGeometry());
      starGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(starPositions, 3),
      );
      starGeometry.setAttribute(
        "size",
        new THREE.Float32BufferAttribute(starSizes, 1),
      );
      const starMaterial = material(
        new THREE.ShaderMaterial({
          uniforms: {
            color: { value: new THREE.Color(0xc9d2af) },
            opacity: { value: 0.4 },
            pixelRatio: { value: pixelRatio },
          },
          vertexShader: `
          attribute float size;
          uniform float pixelRatio;
          void main() {
            vec4 positionInView = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * positionInView;
            gl_PointSize = clamp(size * pixelRatio * 17.0 / max(1.0, -positionInView.z), 1.0, 5.0 * pixelRatio);
          }
        `,
          fragmentShader: `
          uniform vec3 color;
          uniform float opacity;
          void main() {
            float radius = length(gl_PointCoord - vec2(0.5));
            float alpha = 1.0 - smoothstep(0.12, 0.5, radius);
            gl_FragColor = vec4(color, alpha * opacity);
          }
        `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      let reducedMotion = motionQuery.matches;
      let visible = true;
      let contextLost = false;
      let dragging = false;
      let pointerId = null;
      let lastPointerX = 0;
      let lastPointerY = 0;
      let lastPointerTime = 0;
      let userYaw = 0;
      let userPitch = 0;
      let spinVelocity = 0;
      let kickEnergy = 0;
      let elapsed = 0;
      let lastTime = 0;
      let lastImpulse = propsRef.current.impulse;
      let lastActive = propsRef.current.active;
      const canRender = () =>
        !disposed &&
        !contextLost &&
        propsRef.current.active &&
        visible &&
        !document.hidden &&
        renderer;
      const canAnimate = () =>
        propsRef.current.active && !propsRef.current.paused && !reducedMotion;
      const separationAmount = () =>
        Math.max(0, Math.min(100, Number(propsRef.current.separation) || 0)) /
        100;

      function requestRender() {
        if (canRender() && !frameId) frameId = requestAnimationFrame(render);
      }

      function pose() {
        const spread = separationAmount();
        const drift = Math.sin(elapsed * 0.24) * 0.18;
        sculpture.rotation.set(
          0.18 + userPitch,
          -0.55 + userYaw + drift,
          -0.16,
        );
        sculpture.position.y = Math.sin(elapsed * 0.65) * 0.07;
        for (const part of parts) {
          part.mesh.position
            .copy(part.home)
            .addScaledVector(part.travel, spread + kickEnergy * 0.22);
          part.mesh.rotation.z = part.rotation.z + part.twist * spread;
        }
        orbit.rotation.z = -0.38 + elapsed * 0.035 + userYaw * 0.2;
        orbit.rotation.x =
          1.1 + Math.sin(elapsed * 0.13) * 0.14 + userPitch * 0.12;
        orbit.scale.setScalar(1 + spread * 0.09 + kickEnergy * 0.035);
        arc.rotation.z = -0.4 - elapsed * 0.023;
        const satelliteAngle = elapsed * 0.14;
        const satelliteRadius = 2.32 + spread * 0.22;
        satellite.position.set(
          Math.cos(satelliteAngle) * satelliteRadius,
          Math.sin(satelliteAngle) * satelliteRadius,
          spread * 0.18,
        );
        secondSatellite.position.set(
          Math.cos(satelliteAngle + 2.4) * satelliteRadius,
          Math.sin(satelliteAngle + 2.4) * satelliteRadius,
          -spread * 0.3,
        );
        stars.rotation.z = elapsed * 0.0008;
      }

      function render(time) {
        frameId = 0;
        if (!canRender()) return;
        const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
        lastTime = time;
        if (canAnimate()) {
          elapsed += delta;
          if (!dragging) {
            userYaw += spinVelocity * delta;
            spinVelocity *= Math.exp(-delta * 2.6);
          }
          kickEnergy *= Math.exp(-delta * 2.1);
        }
        pose();
        try {
          renderer.render(scene, camera);
        } catch {
          // A lost or rejected GPU frame must reveal the static illustration.
          releaseResources();
          if (!disposed) {
            setReady(false);
            onReadyRef.current?.(false);
          }
          return;
        }
        if (canAnimate()) requestRender();
      }

      function refresh() {
        cancelAnimationFrame(frameId);
        frameId = 0;
        lastTime = 0;
        if (!canAnimate()) {
          spinVelocity = 0;
          kickEnergy = 0;
        }
        requestRender();
      }

      function resize() {
        if (!renderer) return;
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        // Fit the complete orbital ring, including on a narrow phone.
        const distance = 10 / Math.min(1, camera.aspect);
        camera.position.set(0, 0.3, distance);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        requestRender();
      }

      function synchronize() {
        const {
          active: currentActive,
          finish: currentFinish,
          impulse: currentImpulse,
        } = propsRef.current;
        const blueprint = currentFinish === "blueprint";
        const chrome = currentFinish === "chrome";
        const colors = chrome
          ? [0xdbe5f2, 0x94a6ba, 0xedcab3, 0x8b756a]
          : blueprint
            ? [0x123a55, 0x0b2037, 0x174c69, 0x0b2943]
            : [0xe5e7d3, 0xa8b098, 0xff632f, 0xc0431f];
        [ivory, ivorySide, orange, orangeSide].forEach((value, index) => {
          value.color.setHex(colors[index]);
          value.metalness = chrome ? 1 : blueprint ? 0.25 : 0.62;
          value.roughness = chrome ? 0.095 : blueprint ? 0.65 : 0.24;
          value.clearcoat = blueprint ? 0 : 0.7;
          value.emissive.setHex(blueprint ? 0x082033 : 0x000000);
          value.emissiveIntensity = blueprint ? 0.5 : 0;
        });
        outlines.forEach((outline) => {
          outline.visible = blueprint;
        });
        graphite.color.setHex(
          blueprint ? 0x78d5eb : chrome ? 0x687b8e : 0x31362b,
        );
        accent.color.setHex(blueprint ? 0x88b6d1 : 0xb9be9c);
        fineLine.color.setHex(blueprint ? 0x85c6e0 : 0xc2c9b0);
        scene.environmentIntensity = chrome ? 1.4 : 0.9;
        if (currentActive !== lastActive) {
          lastActive = currentActive;
          if (currentActive) resize();
          else if (dragging) {
            if (host.hasPointerCapture(pointerId)) {
              host.releasePointerCapture(pointerId);
            }
            dragging = false;
            pointerId = null;
            host.classList.remove("is-dragging");
          }
        }
        if (currentImpulse !== lastImpulse) {
          lastImpulse = currentImpulse;
          if (canAnimate()) {
            spinVelocity = 5.2;
            kickEnergy = 1;
          } else {
            // Pause and reduced-motion retain a useful, immediate response.
            userYaw += Math.PI / 3;
          }
        }
        refresh();
      }

      function endDrag(event) {
        if (event.pointerId !== pointerId) return;
        if (
          event.type !== "pointerup" ||
          performance.now() - lastPointerTime > 100
        )
          spinVelocity = 0;
        dragging = false;
        pointerId = null;
        host.classList.remove("is-dragging");
        refresh();
      }

      listen(host, "pointerdown", (event) => {
        if (!event.isPrimary || event.button !== 0) return;
        dragging = true;
        pointerId = event.pointerId;
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        lastPointerTime = performance.now();
        spinVelocity = 0;
        host.setPointerCapture(event.pointerId);
        host.classList.add("is-dragging");
        refresh();
      });
      listen(host, "pointermove", (event) => {
        if (!dragging || event.pointerId !== pointerId) return;
        const now = performance.now();
        const delta = Math.max((now - lastPointerTime) / 1000, 0.008);
        const movement = (event.clientX - lastPointerX) * 0.009;
        userYaw += movement;
        userPitch = Math.max(
          -0.65,
          Math.min(0.65, userPitch + (event.clientY - lastPointerY) * 0.005),
        );
        spinVelocity = canAnimate()
          ? Math.max(-6, Math.min(6, movement / delta))
          : 0;
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        lastPointerTime = now;
        requestRender();
      });
      listen(host, "pointerup", endDrag);
      listen(host, "pointercancel", endDrag);
      listen(host, "lostpointercapture", endDrag);
      listen(document, "visibilitychange", refresh);
      listen(motionQuery, "change", (event) => {
        reducedMotion = event.matches;
        refresh();
      });
      listen(renderer.domElement, "webglcontextlost", (event) => {
        event.preventDefault();
        contextLost = true;
        setReady(false);
        onReadyRef.current?.(false);
        refresh();
      });
      listen(renderer.domElement, "webglcontextrestored", () => {
        try {
          createEnvironment();
          contextLost = false;
          pose();
          if (canRender()) renderer.render(scene, camera);
          setReady(true);
          onReadyRef.current?.(true);
          refresh();
        } catch {
          releaseResources();
          setReady(false);
          onReadyRef.current?.(false);
        }
      });

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          refresh();
        },
        { threshold: 0 },
      );
      intersectionObserver.observe(host);
      controlsRef.current = {
        synchronize,
        rotate: (direction) => {
          userYaw += (direction * Math.PI) / 8;
          spinVelocity = 0;
          requestRender();
        },
        reset: () => {
          userYaw = 0;
          userPitch = 0;
          elapsed = 0;
          spinVelocity = 0;
          kickEnergy = 0;
          resize();
          requestRender();
        },
      };

      synchronize();
      resize();
      pose();
      if (canRender()) renderer.render(scene, camera);
      setReady(true);
      onReadyRef.current?.(true);
      requestRender();
    }

    initialize().catch(() => {
      releaseResources();
      if (!disposed) {
        setReady(false);
        onReadyRef.current?.(false);
      }
    });

    return () => {
      disposed = true;
      releaseResources();
    };
  }, []);

  return (
    <div
      className={`monogram-scene${ready ? " is-ready" : ""}`}
      data-finish={finish}
      data-separation={separation}
    >
      <div className="monogram-scene__halo" aria-hidden="true" />
      <MonogramFallback />
      <div
        className="monogram-scene__canvas"
        ref={hostRef}
        role="img"
        aria-label={`Leo's initials, sculpted as two interlocking L shapes inside precision orbital rings.${ready ? " Drag to turn, or use the rotation buttons." : ""}`}
      />
      {ready && (
        <div
          className="monogram-scene__controls"
          aria-label="Sculpture controls"
        >
          <button
            type="button"
            onClick={() => controlsRef.current?.rotate(-1)}
            aria-label="Rotate sculpture left"
            title="Rotate left"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m10 6-6 6 6 6m-5-6h15" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => controlsRef.current?.reset()}
            aria-label="Reset sculpture view"
            title="Reset view"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 9a8 8 0 1 1-.3 5M5 4v5h5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => controlsRef.current?.rotate(1)}
            aria-label="Rotate sculpture right"
            title="Rotate right"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14 6 6 6-6 6M4 12h15" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
