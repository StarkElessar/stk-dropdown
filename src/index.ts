import { DropdownComponent } from './lib';

document.addEventListener('DOMContentLoaded', () => {
	const dropdownComponent = new DropdownComponent({
		selector: '#dropdown',
	});

	console.log(dropdownComponent);
});
