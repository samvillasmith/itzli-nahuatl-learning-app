type Subscriber<Result> = {
  priority: number;
  resolve: (result: Result) => void;
  cleanup: () => void;
};
type Task<Result> = {
  key: string;
  subscribers: Set<Subscriber<Result>>;
  controller: AbortController;
  run: (signal: AbortSignal) => Promise<Result>;
};

/** Share one bounded download per URL. Leaving a lesson removes its own
 * requests, while another lesson or an explicit course download can retain a
 * shared asset. Waiting priorities are recalculated when a requester leaves. */
export class MediaPreloadQueue<Result> {
  private tasks = new Map<string, Task<Result>>();
  private waiting: Task<Result>[] = [];
  private active = 0;
  constructor(private concurrency: number, private cancelled: Result, private failed: Result) {
    this.concurrency = Math.max(1, concurrency);
  }

  enqueue(key: string, priority: number, signal: AbortSignal | undefined,
    run: (signal: AbortSignal) => Promise<Result>): Promise<Result> {
    if (signal?.aborted) return Promise.resolve(this.cancelled);
    let task = this.tasks.get(key);
    if (!task) {
      task = { key, subscribers: new Set(), controller: new AbortController(), run };
      this.tasks.set(key, task);
      this.waiting.push(task);
    }
    const shared = task;
    const promise = new Promise<Result>(resolve => {
      const subscriber: Subscriber<Result> = { priority, resolve, cleanup: () => {} };
      const cancel = () => {
        subscriber.cleanup();
        if (!shared.subscribers.delete(subscriber)) return;
        resolve(this.cancelled);
        if (!shared.subscribers.size) {
          shared.controller.abort();
          if (this.tasks.get(key) === shared) this.tasks.delete(key);
          this.waiting = this.waiting.filter(value => value !== shared);
          this.pump();
        }
      };
      subscriber.cleanup = () => signal?.removeEventListener("abort", cancel);
      shared.subscribers.add(subscriber);
      signal?.addEventListener("abort", cancel, { once: true });
    });
    this.pump();
    return promise;
  }

  private pump() {
    const priority = (task: Task<Result>) => Math.min(...[...task.subscribers].map(value => value.priority));
    this.waiting.sort((a, b) => priority(a) - priority(b));
    while (this.active < this.concurrency && this.waiting.length) {
      const task = this.waiting.shift()!;
      if (!task.subscribers.size) continue;
      this.active += 1;
      void Promise.resolve().then(() => task.controller.signal.aborted ? this.cancelled : task.run(task.controller.signal))
        .catch(() => this.failed).then(result => {
          if (this.tasks.get(task.key) === task) this.tasks.delete(task.key);
          for (const subscriber of task.subscribers) {
            subscriber.cleanup();
            subscriber.resolve(result);
          }
          task.subscribers.clear();
        }).finally(() => { this.active -= 1; this.pump(); });
    }
  }
}
