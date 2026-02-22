export type Unsubscribe = () => void;

export type Subscriber<Subscribers extends object, Key extends keyof Subscribers> = (newVal: Subscribers[Key]) => void;

export type Subscribers<Subscribers extends object> = {
	[K in keyof Subscribers]?: Subscriber<Subscribers, K>[];
};

export abstract class BaseEventEmitter<TEvents extends object> {
	protected _eventHandlers: Subscribers<TEvents> = {};

	public on<K extends keyof TEvents>(event: K, callback: Subscriber<TEvents, K>): Unsubscribe {
		const subs = (this._eventHandlers[event] ??= []);
		subs.push(callback);

		return () => {
			const index = subs.indexOf(callback);
			if (index !== -1) {
				subs.splice(index, 1);
			}
		};
	}

	public once<K extends keyof TEvents>(event: K, callback: Subscriber<TEvents, K>): Unsubscribe {
		const wrappedCallback: Subscriber<TEvents, K> = (payload) => {
			callback(payload);
			unsubscribe();
		};

		const unsubscribe = this.on(event, wrappedCallback);
		return unsubscribe;
	}

	public off<K extends keyof TEvents>(event: K): void {
		delete this._eventHandlers[event];
	}

	protected emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
		this._eventHandlers[event]?.forEach((cb) => cb(payload));
	}
}
