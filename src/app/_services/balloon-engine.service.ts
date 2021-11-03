import { ElementRef, Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { Clock } from 'three';
import { scaleNumberToRange } from '../_utils/scale-number-to-range';

@Injectable({
  providedIn: 'root'
})
export class BalloonEngineService {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private listener: THREE.AudioListener;
  private sound: THREE.Audio;
  private soundFlag = false;
  
  private frameId: number = null;

  // Particle rotation variables
  private clock = new Clock;
  private particleMesh;
  private particleRotation = 10;

  // Circle variables
  private circleMaxValue = 3;
  private circleMinValue = 0.1;
  private outerCircle;
  private innerCircle;

  constructor(
    private ngZone: NgZone
  ) { }

  stopGame(): void {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
    }
    if (this.scene != null) {
      this.renderer.dispose();
      this.scene.children.forEach(this.killObject); // Remove children, but also their materials.
      this.scene.clear(); // This does remove all the children too, but does not dispose the materials (I think).
      this.scene = null;
    }
  }

  createScene(canvas: ElementRef<HTMLCanvasElement>): void {
    this.canvas = canvas.nativeElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#21282a');

    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.camera.position.z = 5;
    this.scene.add(this.camera);

    // Sound
    this.addSound();

    // Particles
    this.addParticles();

    // Circles
    this.addCircles();
  }

  // Particles
  private addParticles(): void {
    const particleGeometry = new THREE.BufferGeometry;
    const particlesCount = 5000;

    // Set particle position
    const posArray = new Float32Array(particlesCount * 3);
    for(let i = 0; i < particlesCount * 3; i++){
      posArray[i] = (Math.random() - 0.5) * 10;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    // Particle material
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.03,
      map: this.createCircleTexture('#F0E68C', 256),
      blending: THREE.AdditiveBlending,
      opacity: 0.8,
      transparent: true
    })

    // Set particle mesh
    this.particleMesh = new THREE.Points(particleGeometry, particlesMaterial);
    this.scene.add(this.particleMesh);
  }

  private addCircles(): void {
    let geometry = new THREE.CircleGeometry(this.circleMaxValue, 50);
    let material = new THREE.LineBasicMaterial({
      color: '#F0E68C'
    });
    this.outerCircle = new THREE.Line(geometry, material);
    this.scene.add(this.outerCircle);

    geometry = new THREE.CircleGeometry(this.circleMinValue, 256);
    material = new THREE.LineBasicMaterial({ color: '#F0E68C' });
    this.innerCircle = new THREE.Mesh(geometry, material);
    this.scene.add(this.innerCircle);
  }

  setParticleRotation(value: number) {
    const elapsedTime = this.clock.getElapsedTime();
    this.particleRotation = (.005 * value) + (elapsedTime * 0.05);
  }

  setInnerCircle(value: number) {
    const scaledValue = scaleNumberToRange(value, 0, 100, this.circleMinValue, this.circleMaxValue);
    let geometry = new THREE.CircleGeometry(scaledValue, 32);
    let material = new THREE.MeshBasicMaterial({ color: '#F0E68C' });

    if(scaledValue == this.circleMaxValue && !this.soundFlag) {
      this.sound.play();
      this.soundFlag = true;
    }
    else if (scaledValue != this.circleMaxValue) this.soundFlag = false;

    this.scene.remove(this.innerCircle);
    this.innerCircle = new THREE.Mesh(geometry, material);
    this.scene.add(this.innerCircle);
  }

  addSound(){
    // Sound support
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);
    this.sound = new THREE.Audio(this.listener);

    new THREE.AudioLoader().load('assets/sounds/pling.ogg', (buffer) => {
      this.sound.setBuffer(buffer);
      this.sound.setVolume(0.5);
    });
  }

  animate(): void {
    this.ngZone.runOutsideAngular(() => {
      if (document.readyState !== 'loading') {
        this.render();
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          this.render();
        });
      }
      window.addEventListener('resize', () => {
        this.resize();
      });
    });
  }

  private render(): void {
    this.frameId = requestAnimationFrame(() => {
      this.render();
    });

    // Particle render
    this.particleMesh.rotation.x = this.particleRotation;

    this.renderer.render(this.scene, this.camera);
  }

  private killObject(object: (THREE.Object3D | THREE.HemisphereLight | THREE.Mesh) & { isMesh: boolean, material: any, geometry: THREE.BoxGeometry }): void {
    object.clear();
    if (object.isMesh) {
      object.geometry.dispose()
      if (object.material.type == 'MeshBasicMaterial') {
        return;
      }
      if (object.material.isMaterial) {
        this.cleanMaterial(object.material)
      } else {
        for (const material of object.material) this.cleanMaterial(material)
      }
    }
  }

  private cleanMaterial(material: any): void {
    material.dispose()
    // dispose textures
    for (const key of Object.keys(material)) {
      const value = material[key]
      if (value && typeof value === 'object' && 'minFilter' in value) {
        value.dispose()
      }
    }
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  createCircleTexture(color, size) {
    var matCanvas = document.createElement('canvas');
    matCanvas.width = matCanvas.height = size;
    var matContext = matCanvas.getContext('2d');
    // create texture object from canvas.
    var texture = new THREE.Texture(matCanvas);
    // Draw a circle
    var center = size / 2;
    matContext.beginPath();
    matContext.arc(center, center, size/2, 0, 2 * Math.PI, false);
    matContext.closePath();
    matContext.fillStyle = color;
    matContext.fill();
    // need to set needsUpdate
    texture.needsUpdate = true;
    // return a texture made from the canvas
    return texture;
  }

}