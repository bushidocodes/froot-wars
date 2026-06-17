// Ambient type declarations for the vendored Planck.js ESM build
// (js/planck.esm.js). This is a deliberately thin subset: only the surface that
// js/game.js actually imports and calls is typed, not Planck's full API. It lets
// `tsc` type-check the game without parsing the 230 KB minified physics engine.

/** A 2D vector. Planck exposes `Vec2` as a factory (called without `new`). */
export interface Vec2 {
  x: number;
  y: number;
}
export function Vec2(x: number, y: number): Vec2;

/** Base type for the collision shapes the game builds. */
export interface Shape {}

/** Axis-aligned box shape, sized by half-width and half-height (in meters). */
export class Box implements Shape {
  constructor(halfWidth: number, halfHeight: number);
}

/** Circle shape, sized by radius (in meters). */
export class Circle implements Shape {
  constructor(radius: number);
}

export interface FixtureDef {
  shape: Shape;
  density?: number;
  friction?: number;
  restitution?: number;
}

export interface Fixture {
  getBody(): Body;
}

export interface BodyDef {
  type?: "static" | "dynamic" | "kinematic";
  position?: Vec2;
  angle?: number;
  userData?: unknown;
}

export interface Body {
  setUserData(data: unknown): void;
  /** Returns whatever was stored via setUserData; the game stores its Entity. */
  getUserData(): any;
  createFixture(def: FixtureDef): Fixture;
  getPosition(): Vec2;
  getAngle(): number;
  getNext(): Body | null;
  setPosition(position: Vec2): void;
  setLinearVelocity(velocity: Vec2): void;
  setAngularVelocity(omega: number): void;
  setAwake(flag: boolean): void;
  isAwake(): boolean;
  getWorldCenter(): Vec2;
  applyLinearImpulse(impulse: Vec2, point: Vec2, wake: boolean): void;
}

export interface Contact {
  getFixtureA(): Fixture;
  getFixtureB(): Fixture;
}

export interface ContactImpulse {
  normalImpulses: number[];
  tangentImpulses: number[];
}

export class World {
  constructor(gravity: Vec2);
  on(
    name: "post-solve",
    listener: (contact: Contact, impulse: ContactImpulse) => void,
  ): void;
  on(name: string, listener: (...args: any[]) => void): void;
  createBody(def: BodyDef): Body;
  getBodyList(): Body | null;
  destroyBody(body: Body): void;
  step(
    timeStep: number,
    velocityIterations?: number,
    positionIterations?: number,
  ): void;
}
