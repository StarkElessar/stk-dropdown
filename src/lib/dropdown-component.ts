import { BaseComponent } from './base-component.ts';
import { BaseComponentProps } from './types.ts';

type DropdownComponentProps = Omit<BaseComponentProps, 'state'> & {};

export class DropdownComponent extends BaseComponent {
	constructor(props: DropdownComponentProps) {
		super({
			selector: props.selector,
			state: {
				opened: false,
			},
		});
	}
}
