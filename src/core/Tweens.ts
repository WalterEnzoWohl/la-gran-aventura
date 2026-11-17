/** Animaciones y esperas atadas al reloj del juego (no a setTimeout). */

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

interface Job {
  elapsed: number;
  duration: number;
  fn: (t: number) => void;
  ease: Ease;
  resolve: () => void;
}

export class Tweens {
  private jobs: Job[] = [];
  private alive = true;

  /** Ejecuta fn(t) con t de 0 a 1 durante `duration` segundos. */
  run(duration: number, fn: (t: number) => void, e: Ease = ease.inOut): Promise<void> {
    return new Promise((resolve) => {
      if (!this.alive) return;
      if (duration <= 0) {
        fn(1);
        resolve();
        return;
      }
      this.jobs.push({ elapsed: 0, duration, fn, ease: e, resolve });
    });
  }

  wait(seconds: number): Promise<void> {
    return this.run(seconds, () => {}, ease.linear);
  }

  update(dt: number): void {
    if (!this.alive) return;
    const done: Job[] = [];
    for (const j of this.jobs) {
      j.elapsed += dt;
      const t = Math.min(1, j.elapsed / j.duration);
      j.fn(j.ease(t));
      if (t >= 1) done.push(j);
    }
    if (done.length) {
      this.jobs = this.jobs.filter((j) => !done.includes(j));
      for (const j of done) j.resolve();
    }
  }

  /** Corta todo: las promesas pendientes no se resuelven nunca. */
  dispose(): void {
    this.alive = false;
    this.jobs = [];
  }
}
