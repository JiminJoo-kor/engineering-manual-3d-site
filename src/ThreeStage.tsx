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
    const camera = new THREE.PerspectiveCamera(46, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 8.5, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x132333, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(8, 10, 8);
    scene.add(keyLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(58, 28, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x142235, roughness: 0.64, metalness: 0.32, transparent: true, opacity: 0.82 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    scene.add(floor);

    const grid = new THREE.GridHelper(54, 28, 0x66d7ff, 0x26394b);
    grid.position.y = -1.15;
    scene.add(grid);

    const group = new THREE.Group();
    const pickables: THREE.Object3D[] = [];
    steps.forEach((step, index) => {
      const phase = phases.find((item) => item.name === step.phase) ?? phases[0];
      const x = (index - 9.5) * 1.82;
      const z = Math.sin(index * 0.72) * 2.2;
      const height = 0.8 + (index % 5) * 0.18;
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.18, height, 1.18),
        new THREE.MeshStandardMaterial({ color: phase.three, roughness: 0.28, metalness: 0.42, emissive: phase.three, emissiveIntensity: 0.06 })
      );
      base.position.set(x, -0.72 + height / 2, z);
      base.userData.step = step.id;
      group.add(base);
      pickables.push(base);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.82, 0.025, 8, 40),
        new THREE.MeshBasicMaterial({ color: phase.three, transparent: true, opacity: 0.7 })
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.set(x, 0.3 + height, z);
      group.add(halo);
    });
    scene.add(group);

    const shuttle = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 32, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x66d7ff, emissiveIntensity: 0.75, roughness: 0.22, metalness: 0.35 })
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
    const animate = () => {
      frame += 0.01;
      const target = pickables[selectedRef.current - 1];
      if (target) {
        shuttle.position.lerp(new THREE.Vector3(target.position.x, target.position.y + 1.18, target.position.z), 0.06);
      }
      group.rotation.y = Math.sin(frame * 0.45) * 0.08;
      pickables.forEach((obj, index) => {
        obj.rotation.y += 0.006;
        obj.scale.y = 1 + Math.sin(frame * 2 + index) * 0.03;
      });
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
