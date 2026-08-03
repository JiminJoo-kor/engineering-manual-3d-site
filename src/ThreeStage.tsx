import { useEffect, useRef } from "react";
import * as THREE from "three";
import { phases, steps } from "./data";

interface ThreeStageProps {
  selectedStep: number;
  onSelectStep: (step: number) => void;
}

export default function ThreeStage({ selectedStep, onSelectStep }: ThreeStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef(selectedStep);

  useEffect(() => {
    selectedRef.current = selectedStep;
  }, [selectedStep]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050914, 0.026);

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 1000);
    camera.position.set(0, 8.8, 19);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xeff8ff, 0x101827, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(8, 14, 10);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x66d7ff, 4.2, 48);
    rimLight.position.set(-9, 4, 7);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(60, 30, 0x66d7ff, 0x1b3147);
    grid.position.y = -1.5;
    scene.add(grid);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(62, 34, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x07111d, roughness: 0.5, metalness: 0.55, transparent: true, opacity: 0.78 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.58;
    scene.add(floor);

    const laneGroup = new THREE.Group();
    const pickables: THREE.Mesh[] = [];
    const labels: THREE.Sprite[] = [];

    const createLabel = (text: string, color: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 96;
      const context = canvas.getContext("2d");
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "rgba(5, 10, 18, .68)";
        context.strokeStyle = color;
        context.lineWidth = 3;
        context.roundRect(12, 16, 232, 56, 16);
        context.fill();
        context.stroke();
        context.fillStyle = "#f7fbff";
        context.font = "700 22px Malgun Gothic, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, 128, 44);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2.5, 0.94, 1);
      return sprite;
    };

    steps.forEach((step, index) => {
      const phase = phases.find((item) => item.name === step.phase) ?? phases[0];
      const angle = (index / steps.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 6.7 + Math.sin(index * 0.55) * 0.65;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 0.72 + (index % 5) * 0.22;

      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, height, 0.92),
        new THREE.MeshStandardMaterial({ color: phase.three, roughness: 0.24, metalness: 0.58, emissive: phase.three, emissiveIntensity: 0.08 })
      );
      block.position.set(x, -1.2 + height / 2, z);
      block.rotation.y = -angle;
      block.userData.step = step.id;
      laneGroup.add(block);
      pickables.push(block);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.026, 10, 48),
        new THREE.MeshBasicMaterial({ color: phase.three, transparent: true, opacity: 0.76 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, height + 0.06, z);
      laneGroup.add(ring);

      if (index % 4 === 0) {
        const label = createLabel(`${step.id}. ${step.phase}`, phase.color);
        label.position.set(x, height + 1.2, z);
        labels.push(label);
        laneGroup.add(label);
      }
    });

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.25, 2),
      new THREE.MeshStandardMaterial({ color: 0x0e2335, roughness: 0.18, metalness: 0.78, emissive: 0x143f5e, emissiveIntensity: 0.22 })
    );
    core.position.y = 0.24;
    laneGroup.add(core);

    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.018, 8, 120),
      new THREE.MeshBasicMaterial({ color: 0x66d7ff, transparent: true, opacity: 0.45 })
    );
    coreRing.rotation.x = Math.PI / 2;
    coreRing.position.y = 0.04;
    laneGroup.add(coreRing);
    scene.add(laneGroup);

    const shuttle = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 32, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x66d7ff, emissiveIntensity: 1.2, roughness: 0.18, metalness: 0.3 })
    );
    scene.add(shuttle);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickables)[0];
      if (hit?.object.userData.step) onSelectStep(hit.object.userData.step);
    };
    renderer.domElement.addEventListener("click", onClick);

    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let frame = 0;
    let animationId = 0;
    const targetVector = new THREE.Vector3();
    const animate = () => {
      frame += 0.01;
      const target = pickables[selectedRef.current - 1];
      if (target) {
        targetVector.set(target.position.x, target.position.y + 1.0, target.position.z);
        shuttle.position.lerp(targetVector, 0.07);
      }
      laneGroup.rotation.y += 0.0026;
      core.rotation.x += 0.004;
      core.rotation.y += 0.006;
      coreRing.rotation.z -= 0.004;
      pickables.forEach((obj, index) => {
        const selected = index + 1 === selectedRef.current;
        obj.scale.setScalar(selected ? 1.18 + Math.sin(frame * 4) * 0.03 : 1 + Math.sin(frame * 1.8 + index) * 0.018);
      });
      labels.forEach((label) => label.lookAt(camera.position));
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [onSelectStep]);

  return <div className="three-stage" ref={mountRef} aria-label="3D 프로젝트 단계 모델" />;
}
