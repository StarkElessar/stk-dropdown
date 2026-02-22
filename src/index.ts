import './index.css';
import { DropdownComponent, ComboboxComponent, MultiselectComponent } from './lib';
import type { DropdownItem } from './lib';

// ============================================================================
// Тестовые данные
// ============================================================================

const fruits: DropdownItem[] = [
	{ value: 1, text: 'Яблоко' },
	{ value: 2, text: 'Апельсин' },
	{ value: 3, text: 'Банан' },
	{ value: 4, text: 'Виноград' },
	{ value: 5, text: 'Манго' },
	{ value: 6, text: 'Ананас' },
	{ value: 7, text: 'Клубника' },
	{ value: 8, text: 'Черника' },
	{ value: 9, text: 'Арбуз', disabled: true },
	{ value: 10, text: 'Персик' },
];

const cities: DropdownItem[] = [
	{ value: 'msk', text: 'Москва' },
	{ value: 'spb', text: 'Санкт-Петербург' },
	{ value: 'nsk', text: 'Новосибирск' },
	{ value: 'ekb', text: 'Екатеринбург' },
	{ value: 'kzn', text: 'Казань' },
	{ value: 'nng', text: 'Нижний Новгород' },
	{ value: 'sam', text: 'Самара' },
	{ value: 'omsk', text: 'Омск' },
	{ value: 'chlb', text: 'Челябинск' },
	{ value: 'rnd', text: 'Ростов-на-Дону' },
];

const colors: DropdownItem[] = [
	{ value: 'red', text: 'Красный' },
	{ value: 'blue', text: 'Синий' },
	{ value: 'green', text: 'Зелёный' },
	{ value: 'yellow', text: 'Жёлтый' },
	{ value: 'purple', text: 'Фиолетовый' },
	{ value: 'orange', text: 'Оранжевый' },
	{ value: 'pink', text: 'Розовый' },
	{ value: 'cyan', text: 'Голубой' },
	{ value: 'black', text: 'Чёрный', disabled: true },
	{ value: 'white', text: 'Белый' },
];

// ============================================================================
// Инициализация
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
	const dropdownOutput = document.querySelector('#dropdown-output')!;
	const comboboxOutput = document.querySelector('#combobox-output')!;
	const multiselectOutput = document.querySelector('#multiselect-output')!;

	// ------ Dropdown ------
	const dropdown = new DropdownComponent({
		selector: '#dropdown',
		items: fruits,
		placeholder: 'Выберите фрукт...',
	});

	dropdown.on('change', (item) => {
		dropdownOutput.textContent = item
			? `Выбрано: ${item.text} (value: ${item.value})`
			: 'Ничего не выбрано';
	});

	dropdown.on('open', () => console.log('[Dropdown] opened'));
	dropdown.on('close', () => console.log('[Dropdown] closed'));

	// ------ Combobox ------
	const combobox = new ComboboxComponent({
		selector: '#combobox',
		items: cities,
		placeholder: 'Начните вводить город...',
		filter: 'contains',
	});

	combobox.on('change', (item) => {
		comboboxOutput.textContent = item
			? `Выбрано: ${item.text} (value: ${item.value})`
			: 'Ничего не выбрано';
	});

	combobox.on('filtering', (text) => {
		console.log('[Combobox] filtering:', text);
	});

	// ------ Multiselect ------
	const multiselect = new MultiselectComponent({
		selector: '#multiselect',
		items: colors,
		placeholder: 'Выберите цвета...',
		showSelectAll: true,
		tagMode: 'multiple',
	});

	multiselect.on('change', (items) => {
		multiselectOutput.textContent = items.length > 0
			? `Выбрано (${items.length}): ${items.map((i) => i.text).join(', ')}`
			: 'Ничего не выбрано';
	});

	// Для отладки в консоли
	Object.assign(window, { dropdown, combobox, multiselect });
});
