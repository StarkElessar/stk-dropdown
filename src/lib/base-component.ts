import './base-component.css';
import { autoUpdate, computePosition, flip, offset } from '@floating-ui/dom';
import { BaseEventEmitter } from '../bus-event-emmiter.ts';
import { BaseComponentProps } from './types.ts';
import { StkProxyStateManager } from 'stk-proxy-state-manager';

export class BaseComponent extends BaseEventEmitter<Record<string, any>> {
	private readonly _stateManager: StkProxyStateManager<Record<string, any>>;
	protected readonly _rootElement: HTMLInputElement;
	private readonly _wrapperElement = document.createElement('span');
	private readonly _popoverElement = document.createElement('div');

	constructor(props: BaseComponentProps) {
		super();
		const { selector, state } = props;
		const element = typeof selector === 'string' ? document.querySelector<HTMLInputElement>(selector) : selector;

		if (!element) {
			throw new Error('Root element not found');
		}

		this._stateManager = new StkProxyStateManager(state);

		this._rootElement = element;
		this.root.setAttribute('autoComplete', 'off');
		this.root.before(this.wrapper);
		this.wrapper.appendChild(this.root);

		this._stateManager.subscribe(
			'opened',
			(newVal) => {
				this.popoverWrapper.style.display = newVal ? 'block' : 'none';
			},
			{ emitImmediately: true },
		);

		void this._init();
	}

	public get root(): HTMLElement {
		return this._rootElement;
	}

	public get wrapper(): HTMLElement {
		return this._wrapperElement;
	}

	public get popoverWrapper(): HTMLElement {
		return this._popoverElement;
	}

	private async _init() {
		this.popoverWrapper.className = 'dropdown-popover-wrapper';
		const portal = this._createPortal();
		portal.appendChild(this.popoverWrapper);

		this.root.addEventListener('focus', async () => {
			this._stateManager.set('opened', true);
			await this._updatePositionPopover();
		});

		this.root.addEventListener('blur', () => {
			this._stateManager.set('opened', false);
		});

		autoUpdate(this.wrapper, this.popoverWrapper, this._updatePositionPopover);
	}

	private _updatePositionPopover = async () => {
		const result = await computePosition(this.wrapper, this.popoverWrapper, {
			strategy: 'fixed',
			placement: 'top-start',
			middleware: [offset(10), flip()],
		});

		Object.assign(this.popoverWrapper.style, {
			left: `${result.x}px`,
			top: `${result.y}px`,
			position: result.strategy,
		});

		return result;
	};

	private _createPortal() {
		const existingPortal = document.querySelector('#dropdown-portal');
		if (existingPortal) {
			return existingPortal;
		}
		const portal = document.createElement('div');
		portal.id = 'dropdown-portal';
		portal.className = 'dropdown-portal';
		document.body.appendChild(portal);
		return portal;
	}
}
